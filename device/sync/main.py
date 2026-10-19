"""Sincronización: guarda procesado/minuto en una cola SQLite (outbox) y la envía por lotes
a la API en Vercel. Si no hay internet, acumula y reenvía después. No hay duplicados porque
cada lectura se identifica por su ts (la API la escribe con ese ID).
La respuesta de la API trae la configuración vigente, que se publica en config/device."""
import json
import os
import pathlib
import sqlite3
import threading
import time

import paho.mqtt.client as mqtt
import requests

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
API_URL = os.environ["API_URL"]
TOKEN = os.environ["DEVICE_TOKEN"]
SYNC_INTERVAL = int(os.getenv("SYNC_INTERVAL_SEC", "60"))
DB_PATH = os.getenv("DB_PATH", "/data/outbox.db")
BATCH = 200

db = sqlite3.connect(DB_PATH, check_same_thread=False)
db_lock = threading.Lock()
db.execute(
    "CREATE TABLE IF NOT EXISTS outbox ("
    "id INTEGER PRIMARY KEY, payload TEXT NOT NULL, created INTEGER NOT NULL, sent INTEGER NOT NULL DEFAULT 0)"
)
db.commit()
last_cfg_version = None


def on_connect(client, userdata, flags, reason_code, properties):
    client.subscribe("procesado/minuto", qos=1)


def on_message(client, userdata, msg):
    try:
        reading = json.loads(msg.payload)
        ts = int(reading["ts"])
    except (ValueError, KeyError, TypeError):
        return
    with db_lock:
        db.execute(
            "INSERT OR IGNORE INTO outbox (id, payload, created) VALUES (?, ?, ?)",
            (ts, json.dumps(reading), int(time.time())),
        )
        db.commit()


def sync_once(client):
    global last_cfg_version
    with db_lock:
        rows = db.execute("SELECT id, payload FROM outbox WHERE sent = 0 ORDER BY id LIMIT ?", (BATCH,)).fetchall()
    readings = [json.loads(p) for _, p in rows]
    resp = requests.post(
        API_URL,
        json={"readings": readings},
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=15,
    )
    if resp.status_code in (401, 403):
        print("API rechazó el token (inválido o revocado)", flush=True)
        return
    resp.raise_for_status()
    data = resp.json()
    if data.get("rejected"):
        print(f"API rechazó {data['rejected']} lecturas por validación", flush=True)
    with db_lock:
        db.executemany("UPDATE outbox SET sent = 1 WHERE id = ?", [(i,) for i, _ in rows])
        db.execute("DELETE FROM outbox WHERE sent = 1 AND created < ?", (int(time.time()) - 86400,))
        db.commit()
    cfg = data.get("config")
    if cfg and cfg.get("version") != last_cfg_version:
        client.publish("config/device", json.dumps(cfg), qos=1, retain=True)
        last_cfg_version = cfg.get("version")


# sesión persistente: si este servicio se reinicia, el broker conserva los mensajes pendientes
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="sync", clean_session=False)
client.on_connect = on_connect
client.on_message = on_message
client.connect_async(MQTT_HOST, 1883)
client.loop_start()

next_sync = 0.0
while True:
    if time.time() >= next_sync:
        try:
            sync_once(client)
        except (requests.RequestException, ValueError) as e:
            print("sin conexión o error de API, se reintenta:", e, flush=True)
        next_sync = time.time() + SYNC_INTERVAL
    pathlib.Path("/tmp/healthy").touch()
    time.sleep(1)
