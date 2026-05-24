---
type: clarifications
change_name: "multi-tenant-sensor-isolation"
---

# Clarificaciones

## Iteración 1 — Respuestas (2026-05-23)

**Feedback del usuario**: Se debe crear una tabla específica para la temperatura y humedad que se detecta desde el sensor onboard del dispositivo IoT (Arduino/Raspberry Pi). Estas lecturas NO deben ensuciar las tablas de los sensores de humedad que van enterrados en el suelo. Actualmente las columnas `temperatura_onboard` y `humedad_onboard` son campos nullable en las tablas `sensor_riego_*`. El usuario quiere que se separen a su propia tabla dedicada.

**Implicaciones**:
- Crear nueva tabla `sensor_onboard` (o similar) con `user_id`, `temperatura`, `humedad`, `timestamp`
- Eliminar las columnas `temperatura_onboard` y `humedad_onboard` de las tablas `sensor_riego_*`
- Actualizar la migración y el endpoint de ingesta para escribir en la tabla separada
- Actualizar el frontend si hay componentes que muestren datos onboard
