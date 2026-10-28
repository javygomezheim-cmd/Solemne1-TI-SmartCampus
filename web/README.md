# Smart Campus IoT

Sistema IoT que mide temperatura, humedad y presencia en una sala y los convierte en tres indicadores: ocupación, confort y alertas.

Proyecto grupal de la asignatura Infraestructura TI (Solemne 1), Universidad Andrés Bello. Docente: Luis Delgado Ayala.

**Integrantes:** Javier Gómez Heim, Cristóbal Magnata Veragua, Tomás Contreras Hammad y Marcos Contreras Cortés.

**Plataforma en línea:** https://solemne1-ti-smart-campus.vercel.app/

## Cuentas de prueba

| Rol | Correo | Contraseña | Permisos |
| --- | --- | --- | --- |
| Administrador | smartcampus@gmail.com | 123456 | Consulta y edición de la configuración del dispositivo |
| Cliente | smartcampuscliente@gmail.com | 123456 | Solo consulta |

## Cómo funciona

Una Raspberry Pi lee los sensores y procesa los datos con microservicios en contenedores Docker que se comunican por MQTT. Luego los envía por HTTPS a una API en Vercel, que los guarda en Cloud Firestore. La plataforma web, también en Vercel, muestra los datos a los usuarios autenticados con Firebase Authentication.

```
DHT11 ──> acq-dht ──┐
                    ├──> mosquitto ──> processing ──> mosquitto ──> sync ──HTTPS──> API (Vercel) ──> Firestore <── Plataforma web (Vercel)
PIR   ──> acq-pir ──┘                                                 ▲                                                  │
                                                                      └───────────── config/device ◄── configuración ◄───┘
```

### Indicadores

| Indicador | Cómo se calcula |
| --- | --- |
| Temperatura y humedad promedio | Promedio por minuto de las lecturas del DHT11, descartando valores fuera de 0 a 50 °C y 20 a 90 % HR |
| Ocupación (`occupied`) | Verdadera si el PIR está activo o hubo movimiento en los últimos 10 minutos (`occupancyWindowMin`) |
| Eventos de movimiento (`motionEvents`) | Veces que el PIR pasó de inactivo a activo dentro del minuto |
| Confort (`comfort`, de 0 a 100) | Parte de 100 y penaliza alejarse de 22 °C y salir del rango de 40 a 60 % de humedad |
| Alertas (`alerts`) | `temp_alta` si supera `tempMax` (28 °C por defecto) y `hum_alta` si supera `humMax` (70 % por defecto) |

El intervalo de muestreo (10 a 600 s) y los umbrales se editan desde el panel de administrador. La Raspberry Pi los recibe en cada sincronización y los aplica sin reiniciarse.

## Estructura del repositorio

| Carpeta | Contenido |
| --- | --- |
| `device/` | Servicios de la Raspberry Pi: `acq-dht`, `acq-pir`, `processing`, `sync` y `mosquitto`, orquestados con Docker Compose |
| `web/` | Plataforma web y API en Next.js: páginas `/` (login), `/admin` y `/cliente`, y la ruta `app/api/device/sync` |
| `web/scripts/` | `create-device.mjs` crea un dispositivo y entrega su token |

## Hardware y conexión

Raspberry Pi con Raspberry Pi OS de 64 bits, un sensor DHT11 y un sensor PIR HC-SR501, conectados directamente a los pines GPIO sin conversor de voltaje.

| Componente | Pin del sensor | Pin de la Raspberry Pi |
| --- | --- | --- |
| DHT11 | VCC | 3,3 V (pin físico 1) |
| DHT11 | DATA / OUT | GPIO4 (pin físico 7) |
| DHT11 | GND | GND (pin físico 6) |
| PIR HC-SR501 | VCC | 5 V (pin físico 2) |
| PIR HC-SR501 | OUT | GPIO17 (pin físico 11) |
| PIR HC-SR501 | GND | GND (pin físico 9) |

El HC-SR501 se alimenta a 5 V, pero su salida OUT entrega 3,3 V, por lo que es compatible con el GPIO.

## Microservicios

| Contenedor | Responsabilidad |
| --- | --- |
| `acq-dht` | Lee temperatura y humedad del DHT11 según el intervalo configurado y publica en `sensores/dht` |
| `acq-pir` | Lee el PIR y publica en `sensores/pir` cuando cambia el estado y cada 30 s como refresco |
| `mosquitto` | Broker MQTT que desacopla productores y consumidores. No publica puertos fuera de Docker |
| `processing` | Valida, combina presencia con temperatura, agrega por minuto y detecta umbrales superados |
| `sync` | Guarda cada minuto en una cola SQLite, la envía por lotes a la API, reenvía tras una caída y publica la configuración recibida en `config/device` |

Todos usan `restart: unless-stopped` y un healthcheck. Acceden al GPIO mapeando `/dev/gpiomem`, sin modo privilegiado.

### Tópicos MQTT

| Tópico | Publica | Lee |
| --- | --- | --- |
| `sensores/dht` | acq-dht | processing |
| `sensores/pir` | acq-pir | processing |
| `procesado/minuto` | processing | sync |
| `config/device` | sync (retenido) | acq-dht, acq-pir, processing |

## Modelo de datos (Firestore)

| Ruta | Contenido |
| --- | --- |
| `orgs/{orgId}/devices/{deviceId}` | name, tokenHash, revoked, config, createdAt, lastSeen |
| `orgs/{orgId}/devices/{deviceId}/readings/{ts}` | Una lectura agregada por minuto |
| `orgs/{orgId}/devices/{deviceId}/history10m/{ts}` | Una lectura representativa cada 10 minutos, que usa el historial |
| `users/{uid}` | `role`: `admin` o `cliente` |

El ID de cada lectura es su `ts`, por lo que un reenvío sobrescribe el documento y no lo duplica. `lastSeen` se escribe como máximo cada 5 minutos.

## API

La Raspberry Pi se comunica con la nube con un único endpoint:

`POST /api/device/sync`

- **Autenticación:** encabezado `Authorization: Bearer <orgId>.<deviceId>.<secreto>`
- **Cuerpo:** `{ "readings": [ ... ] }`, con un máximo de 200 lecturas por envío
- **Respuesta:** `200` con `{ ok, accepted, rejected, config }`
- **Errores:** `401 invalid_token`, `400 invalid_json`, `400 invalid_batch`, `500 server_configuration_error`

```bash
curl -X POST https://solemne1-ti-smart-campus.vercel.app/api/device/sync \
  -H "Authorization: Bearer mi-org.ID_DISPOSITIVO.SECRETO" \
  -H "Content-Type: application/json" \
  -d '{"readings":[{"ts":1761500040,"tempAvg":23.4,"humAvg":52.1,"samples":6,"motionEvents":2,"occupied":true,"comfort":88,"alerts":[]}]}'
```

## Seguridad

- Cada dispositivo tiene su propio token revocable. En Firestore solo se guarda el hash SHA-256 del secreto, y la API lo compara con `timingSafeEqual`.
- La cuenta de servicio de Firebase existe solo como variable de entorno `FIREBASE_SERVICE_ACCOUNT` en Vercel. No está en el repositorio ni en la Raspberry Pi.
- Las Security Rules de Firestore niegan todo por defecto. Los usuarios autenticados solo leen, solo un `admin` escribe el documento del dispositivo y ningún cliente puede escribir lecturas: eso lo hace únicamente la API.
- La Raspberry Pi solo hace conexiones HTTPS salientes. Mosquitto no publica puertos.
- La API valida el formato de `orgId` y `deviceId`, limita el lote a 200 lecturas y comprueba el rango de cada campo.
- `.gitignore` excluye `.env`, `*.pem` y los archivos de claves de Firebase.

## Despliegue desde cero

### 1. Firebase (plan Spark)

1. Crear el proyecto en la consola de Firebase.
2. Activar Cloud Firestore en modo producción, en la ubicación `southamerica-west1`.
3. Activar Authentication con correo y contraseña.
4. Generar una clave privada de la cuenta de servicio (archivo JSON). No se sube a Git.
5. Publicar las Security Rules de Firestore.
6. Crear los usuarios en Authentication y, en `users/{uid}`, un documento con el campo `role` (`admin` o `cliente`).

### 2. Plataforma web y API en Vercel (plan Hobby)

1. Importar el repositorio en Vercel.
2. En Root Directory indicar `web`.
3. Agregar la variable de entorno `FIREBASE_SERVICE_ACCOUNT` con el contenido completo del JSON.
4. Desplegar. Cada `push` a la rama configurada se despliega automáticamente.

### 3. Crear el dispositivo y obtener su token

Desde la carpeta `web/`:

```bash
FIREBASE_SERVICE_ACCOUNT="$(cat RUTA/clave.json)" node scripts/create-device.mjs mi-org "Sala 1"
```

El comando imprime `DEVICE_TOKEN=orgId.deviceId.secreto`. Se muestra una sola vez.

### 4. Raspberry Pi

1. Instalar Raspberry Pi OS de 64 bits, conectar la placa a Internet y armar el cableado.
2. Instalar Docker y Docker Compose, y habilitar Docker al arrancar: `sudo systemctl enable docker`.
3. Clonar el repositorio y entrar a `device/`.
4. Copiar `.env.example` como `.env` y completarlo:

```bash
COMPOSE_FILE=docker-compose.yml:acq-dht/compose.yml:acq-pir/compose.yml:processing/compose.yml:sync/compose.yml
SIMULATE=false
DHT_GPIO=4
PIR_GPIO=17
API_URL=https://solemne1-ti-smart-campus.vercel.app/api/device/sync
DEVICE_TOKEN=orgId.deviceId.secreto
SYNC_INTERVAL_SEC=60
```

`SIMULATE=false` es obligatorio para leer los sensores reales; con `true` el sistema genera datos falsos.

5. Levantar los servicios:

```bash
docker compose up -d --build
```

### 5. Verificación

- `docker compose ps` debe mostrar todos los servicios en estado `healthy`.
- `docker compose logs -f sync` no debe mostrar errores de token ni de conexión.
- En Firestore debe aparecer un documento nuevo en `orgs/<orgId>/devices/<deviceId>/readings` cada minuto.

## Desarrollo local de la plataforma web

```bash
cd web
npm install
npm run dev
```

La aplicación queda en `http://localhost:3000`. Para que la API funcione se necesita la variable `FIREBASE_SERVICE_ACCOUNT` en `web/.env.local`.
