# sync: sincronización con la nube

Guarda cada mensaje de `procesado/minuto` en una cola SQLite (`/data/outbox.db`) y la envía por lotes (HTTPS, solo conexiones salientes) a `API_URL`.

- **Sin duplicados:** cada lectura se identifica por su `ts`; la API la guarda con ese ID.
- **Sin conexión:** acumula en la cola y reenvía al reconectar.
- **Configuración:** la respuesta de la API trae la config vigente y se publica (retenida) en `config/device`.
- **Seguridad:** el token del dispositivo viene de una variable de entorno, nunca del código. La Pi no tiene credenciales de administrador de Firebase.

## Variables (en `device/.env`, no se sube a Git)
| Variable | Descripción |
|---|---|
| `API_URL` | `https://TU-DOMINIO.vercel.app/api/device/sync` |
| `DEVICE_TOKEN` | Token del dispositivo (`orgId.deviceId.secreto`) |
| `SYNC_INTERVAL_SEC` | Segundos entre envíos (por defecto 60) |

## Ejecutar
En `device/.env`: `COMPOSE_FILE=docker-compose.yml:sync/compose.yml`, más las variables de arriba.
```
docker compose up -d --build
docker compose logs -f sync
```
Requiere la API desplegada (rama `feature/api-sincronizacion`) y el broker.
