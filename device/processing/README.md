# processing: validación, combinación y agregación

Lee `sensores/dht`, `sensores/pir` y `config/device`. Cada minuto publica en `procesado/minuto` un solo mensaje que combina temperatura/humedad con presencia:

`{ts, tempAvg, humAvg, samples, motionEvents, occupied, comfort, alerts}`

- **Validación:** descarta lecturas del DHT11 fuera de 0-50 °C o 20-90 % HR.
- **Ocupación:** hay presencia si el PIR está activo o hubo movimiento dentro de `occupancyWindowMin` minutos.
- **Confort (0-100):** penaliza alejarse de 22 °C y salir de 40-60 % HR (fórmula de ejemplo).
- **Alertas:** `temp_alta` si supera `tempMax`, `hum_alta` si supera `humMax`.
- **Ahorro:** un documento por minuto en vez de uno por lectura (reduce las escrituras en Firestore).

## Probar sin sensores ni nube
Publica lecturas a mano y mira la salida (con el broker y este servicio activos):
```
docker compose exec mosquitto mosquitto_pub -t sensores/dht -m '{"ts":1,"temp":23,"hum":50}'
docker compose exec mosquitto mosquitto_sub -t 'procesado/minuto' -v
```
(El mensaje procesado aparece al cambiar el minuto.)

## Ejecutar
En `device/.env`: `COMPOSE_FILE=docker-compose.yml:processing/compose.yml`
```
docker compose up -d --build
```
