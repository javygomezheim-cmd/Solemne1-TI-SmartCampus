# Dispositivo (Raspberry Pi)

Microservicios en contenedores, orquestados con Docker Compose. Se comunican solo por MQTT (nunca leen datos de otro servicio directamente).

## Estructura
- `docker-compose.yml`: base del proyecto. Define solo el broker **Mosquitto**.
- `<servicio>/compose.yml`: cada microservicio agrega aquí su propio servicio. Así las ramas de cada servicio no se pisan.
- `.env`: archivo local (no se sube a Git). Define `COMPOSE_FILE` con los compose activos.

## Contrato entre servicios (tópicos MQTT)
| Tópico | Publica | Lee | Contenido |
|---|---|---|---|
| `sensores/dht` | acq-dht | processing | `{ts, temp, hum}` |
| `sensores/pir` | acq-pir | processing | `{ts, motion}` |
| `procesado/minuto` | processing | sync | `{ts, tempAvg, humAvg, samples, motionEvents, occupied, comfort, alerts}` |
| `config/device` | sync (retenido) | acq-dht, acq-pir, processing | `{version, sampleIntervalSec, tempMax, humMax, occupancyWindowMin, dhtEnabled, pirEnabled}` |

## Probar el broker
```
cd device
cp .env.example .env
docker compose up -d
docker compose ps        # mosquitto debe quedar "healthy"
docker compose exec mosquitto mosquitto_sub -t '#' -v
```

## Arranque automático al encender la Pi
`sudo systemctl enable docker` (los contenedores usan `restart: unless-stopped`).
