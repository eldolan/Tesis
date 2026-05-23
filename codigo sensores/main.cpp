#include <Arduino.h>
#include <Arduino_HTS221.h>

// Calibración sensores capacitivos (ADC 12 bits: 0-4095)
// Alimentados a 3.3V en Nano 33 BLE Sense
// RECALIBRAR: leer Serial con sensor al aire → VALOR_EN_AIRE
//             leer Serial con sensor en agua → VALOR_EN_AGUA
const int VALOR_EN_AIRE = 3360;  // Calibrado: seco/aire (12-bit, 3.3V)
const int VALOR_EN_AGUA = 1200;  // Calibrado: sumergido en agua

// Parámetros de muestreo ADC
const int MUESTRAS = 10;
const int ESPERA_ENTRE_LECTURAS_MS = 50;

// Intervalo de emisión: 5 minutos (300 000 ms)
const unsigned long INTERVALO_MS = 300000;

// Lee el ADC de un pin y devuelve el promedio de MUESTRAS lecturas
int leerSensorPromediado(int pin) {
  long suma = 0;
  for (int i = 0; i < MUESTRAS; i++) {
    suma += analogRead(pin);
    delay(ESPERA_ENTRE_LECTURAS_MS);
  }
  return (int)(suma / MUESTRAS);
}

// Convierte valor ADC crudo a porcentaje de humedad usando calibración lineal
int valorAPorcentajeHumedad(int valorCrudo) {
  int porcentaje = map(valorCrudo, VALOR_EN_AGUA, VALOR_EN_AIRE, 100, 0);
  return constrain(porcentaje, 0, 100);
}

void setup() {
  Serial.begin(9600);
  while (!Serial);

  analogReadResolution(12);

  // Inicializar sensor HTS221 (temperatura y humedad ambiente onboard)
  // Si falla, detener el firmware — sin HTS221 los datos son incompletos
  if (!HTS.begin()) {
    Serial.println(F("Error: no se pudo inicializar HTS221 (temp/hum onboard)"));
    while (1);
  }

  // Mensaje de arranque único — el serial bridge lo ignorará (no es JSON)
  Serial.println(F("READY:tesis-sensor-v1"));
}

void loop() {
  // Leer sensores capacitivos de suelo (A0 = 20cm, A1 = 40cm)
  int crudo20 = leerSensorPromediado(A0);
  int crudo40 = leerSensorPromediado(A1);
  int h20 = valorAPorcentajeHumedad(crudo20);
  int h40 = valorAPorcentajeHumedad(crudo40);

  // Leer temperatura y humedad ambiente desde HTS221 onboard
  float temp_amb = HTS.readTemperature();
  float hum_amb  = HTS.readHumidity();

  // Emitir JSON compacto de una sola línea — sin espacios (minimiza bytes en buffer serial)
  // Formato: {"h20":N,"h40":N,"temp_amb":N.N,"hum_amb":N.N}
  Serial.print(F("{\"h20\":"));
  Serial.print(h20);
  Serial.print(F(",\"h40\":"));
  Serial.print(h40);
  Serial.print(F(",\"temp_amb\":"));
  Serial.print(temp_amb, 1);
  Serial.print(F(",\"hum_amb\":"));
  Serial.print(hum_amb, 1);
  Serial.println(F("}"));

  // Esperar 5 minutos antes del próximo ciclo de muestreo
  delay(INTERVALO_MS);
}
