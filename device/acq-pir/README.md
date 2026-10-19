# acq-pir: adquisición del sensor PIR

Publica en `sensores/pir` (`{ts, motion}`) cuando cambia el estado, y cada 30 s como refresco. Aplica `pirEnabled` desde `config/device`.

## Cableado
| PIR HC-SR501 | Raspberry Pi |
|---|---|
| VCC | 5 V (pin 2) |
| OUT | GPIO17 (pin 11) |
| GND | GND (pin 9) |

El módulo necesita cerca de 1 minuto de calentamiento al encender. Sus potenciómetros regulan sensibilidad y tiempo de retardo.

## Variables (en `device/.env`)
| Variable | Por defecto | Descripción |
|---|---|---|
| `SIMULATE` | `true` | `true` = movimiento simulado; `false` = sensor real |
| `PIR_GPIO` | `17` | GPIO (numeración BCM) del pin OUT |

## Ejecutar
En `device/.env`: `COMPOSE_FILE=docker-compose.yml:acq-pir/compose.yml`
```
docker compose up -d --build
docker compose exec mosquitto mosquitto_sub -t 'sensores/pir' -v
```
