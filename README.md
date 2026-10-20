# Smart Campus IoT: monitoreo ambiental de salas

Proyecto de la Solemne de **Infraestructura TI** (Facultad de Ingeniería, Universidad Andrés Bello).

Sistema IoT que mide temperatura, humedad y presencia en una sala con una Raspberry Pi, procesa los datos con microservicios en contenedores, los guarda en una base de datos en la nube y los muestra en una plataforma web.

## Hardware
- Raspberry Pi 4
- Sensor de temperatura y humedad DHT11
- Sensor de movimiento PIR (HC-SR501)

## Stack previsto
| Componente | Tecnología |
|---|---|
| Dispositivo IoT | Raspberry Pi OS (64 bits) |
| Microservicios | Docker y Docker Compose, mensajería MQTT (Mosquitto) |
| Plataforma web y API | Next.js en Vercel (plan Hobby) |
| Base de datos y autenticación | Firebase (plan Spark): Cloud Firestore y Authentication |
| Código | GitHub |

## Estructura prevista del repositorio
```
device/   Microservicios que corren en la Raspberry Pi
web/      Plataforma web y API (Next.js)
```

## Integrantes

| Tomás Contreras - Marcos Contreras - Javier Gómez - Cristóbal Magnata |

