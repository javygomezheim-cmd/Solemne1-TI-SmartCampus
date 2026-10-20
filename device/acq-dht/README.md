# acq-dht: adquisición del sensor DHT11

Lee temperatura y humedad y publica en `sensores/dht` (`{ts, temp, hum}`). Aplica `sampleIntervalSec` y `dhtEnabled` desde `config/device` sin reiniciarse.

## Cableado
| DHT11 | Raspberry Pi |
|---|---|
| VCC | 3,3 V (pin 1) |
| DATA / OUT | GPIO4 (pin 7) |
| GND | GND (pin 6) |

Revisa la serigrafía del módulo. Si es de 4 patas, agrega una resistencia de 10 kΩ entre VCC y DATA.

## Variables (en `device/.env`)
| Variable | Por defecto | Descripción |
|---|---|---|
| `SIMULATE` | `true` | `true` = datos simulados; `false` = sensor real |
| `DHT_GPIO` | `4` | GPIO (numeración BCM) del pin DATA |

## Ejecutar
En `device/.env`: `COMPOSE_FILE=docker-compose.yml:acq-dht/compose.yml`
```
docker compose up -d --build
docker compose exec mosquitto mosquitto_sub -t 'sensores/dht' -v
```
