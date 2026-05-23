#!/usr/bin/env python3
"""
Serial bridge: lee JSON del Arduino vía USB y lo envía al webhook de n8n.

Flujo:
  Arduino Nano 33 BLE Sense → /dev/ttyACM0 (9600 baud, USB Serial)
  → este script → POST /webhook/sensor-data (n8n WF1)

Configuración vía variables de entorno (ver .env.example):
  SERIAL_PORT        - Puerto serial del Arduino (default: /dev/ttyACM0)
  SERIAL_BAUD        - Velocidad de comunicación (default: 9600)
  N8N_WEBHOOK_URL    - URL completa del webhook de n8n (requerida)
  SENSOR_API_KEY     - Clave de autenticación para el webhook (requerida)
  RECONNECT_DELAY    - Segundos de espera inicial antes de reconectar (default: 5)
  LOG_LEVEL          - Nivel de logging: DEBUG, INFO, WARNING, ERROR (default: INFO)

Comportamiento ante errores:
  - Línea no-JSON: se ignora con log WARNING, continúa leyendo
  - JSON sin campos requeridos: se ignora con log WARNING, continúa leyendo
  - Error HTTP del webhook: log ERROR, continúa leyendo (no pierde buffer serial)
  - Puerto serial desconectado: backoff exponencial (5s → 10s → 20s → ... → 60s máx)
"""

import json
import logging
import os
import sys
import time

import requests
import serial
from serial import SerialException

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------

SERIAL_PORT = os.environ.get("SERIAL_PORT", "/dev/ttyACM0")
SERIAL_BAUD = int(os.environ.get("SERIAL_BAUD", "9600"))
N8N_WEBHOOK_URL = os.environ.get("N8N_WEBHOOK_URL", "")
SENSOR_API_KEY = os.environ.get("SENSOR_API_KEY", "")
RECONNECT_DELAY = int(os.environ.get("RECONNECT_DELAY", "5"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

# Campos requeridos en el JSON emitido por el firmware
CAMPOS_REQUERIDOS = {"h20", "h40", "temp_amb", "hum_amb"}

# Timeout de lectura serial en segundos
SERIAL_TIMEOUT = 2

# Delay máximo de reconexión en segundos
MAX_RECONNECT_DELAY = 60

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)-5s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Validación de configuración
# ---------------------------------------------------------------------------

def validar_config() -> None:
    """Detiene el proceso si faltan variables de entorno requeridas."""
    errores = []
    if not N8N_WEBHOOK_URL:
        errores.append("N8N_WEBHOOK_URL no está definida")
    if not SENSOR_API_KEY:
        errores.append("SENSOR_API_KEY no está definida")
    if errores:
        for e in errores:
            log.error("Configuración faltante: %s", e)
        sys.exit(1)

# ---------------------------------------------------------------------------
# Conexión serial con backoff exponencial
# ---------------------------------------------------------------------------

def abrir_puerto_serial() -> serial.Serial:
    """
    Intenta abrir el puerto serial con reintentos y backoff exponencial.
    Retorna la instancia de serial.Serial cuando logra conectar.
    """
    delay = RECONNECT_DELAY
    while True:
        try:
            puerto = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=SERIAL_TIMEOUT)
            log.info("Conectado a %s @ %d baud", SERIAL_PORT, SERIAL_BAUD)
            return puerto
        except SerialException as exc:
            log.warning("Puerto no disponible (%s), reintentando en %ds...", exc, delay)
            time.sleep(delay)
            # Backoff exponencial: duplicar el delay hasta el máximo
            delay = min(delay * 2, MAX_RECONNECT_DELAY)

# ---------------------------------------------------------------------------
# Envío al webhook de n8n
# ---------------------------------------------------------------------------

def enviar_a_n8n(payload: dict) -> None:
    """
    Envía el payload JSON al webhook de n8n vía POST.
    Loguea el resultado sin lanzar excepción (para no interrumpir el loop serial).
    """
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": SENSOR_API_KEY,
    }
    try:
        response = requests.post(
            N8N_WEBHOOK_URL,
            json=payload,
            headers=headers,
            timeout=10,
        )
        if response.ok:
            log.info("→ n8n: %s → HTTP %d", json.dumps(payload, separators=(",", ":")), response.status_code)
        else:
            log.error("POST falló: HTTP %d - %s", response.status_code, response.text[:200])
    except requests.exceptions.Timeout:
        log.error("Timeout al conectar con %s — se descarta la lectura", N8N_WEBHOOK_URL)
    except requests.exceptions.ConnectionError as exc:
        log.error("Error de conexión con n8n: %s — se descarta la lectura", exc)

# ---------------------------------------------------------------------------
# Loop de lectura serial
# ---------------------------------------------------------------------------

def procesar_linea(linea: str) -> None:
    """
    Parsea una línea del serial y la envía a n8n si es JSON válido con los campos requeridos.
    Ignora silenciosamente líneas no-JSON o JSON con campos faltantes.
    """
    linea = linea.strip()
    if not linea:
        return

    # Intentar parsear como JSON
    try:
        datos = json.loads(linea)
    except json.JSONDecodeError:
        log.warning("Línea ignorada (no JSON): %r", linea[:80])
        return

    # Validar que el JSON contiene todos los campos del contrato
    campos_presentes = set(datos.keys())
    if not CAMPOS_REQUERIDOS.issubset(campos_presentes):
        faltantes = CAMPOS_REQUERIDOS - campos_presentes
        log.warning("JSON inválido — campos incompletos: %s", faltantes)
        return

    # Validar tipos numéricos básicos
    for campo in CAMPOS_REQUERIDOS:
        if not isinstance(datos[campo], (int, float)):
            log.warning("JSON inválido — campo %r no es numérico: %r", campo, datos[campo])
            return

    # Todo correcto: enviar a n8n
    enviar_a_n8n(datos)

def loop_lectura(puerto: serial.Serial) -> None:
    """
    Lee líneas del puerto serial indefinidamente.
    Lanza SerialException si el puerto se desconecta.
    """
    while True:
        try:
            linea_bytes = puerto.readline()
        except SerialException as exc:
            raise exc  # Propagar para reconexión en el loop principal

        # readline() devuelve b"" si hay timeout — ignorar
        if not linea_bytes:
            continue

        try:
            linea = linea_bytes.decode("utf-8", errors="replace")
        except Exception as exc:
            log.warning("Error decodificando línea: %s", exc)
            continue

        procesar_linea(linea)

# ---------------------------------------------------------------------------
# Punto de entrada
# ---------------------------------------------------------------------------

def main() -> None:
    validar_config()
    log.info("Serial bridge iniciado — puerto: %s, webhook: %s", SERIAL_PORT, N8N_WEBHOOK_URL)

    while True:
        puerto = abrir_puerto_serial()
        try:
            loop_lectura(puerto)
        except SerialException as exc:
            log.error("Puerto desconectado: %s", exc)
        finally:
            try:
                puerto.close()
            except Exception:
                pass
        # Después de desconexión, el outer loop vuelve a llamar abrir_puerto_serial()
        # que maneja el backoff exponencial
        log.info("Reconectando...")


if __name__ == "__main__":
    main()
