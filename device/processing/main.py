"""Procesamiento: valida, combina y agrega por minuto.
Entrada: sensores/dht, sensores/pir, config/device
Salida:  procesado/minuto (1 mensaje por minuto con temperatura + presencia combinadas)"""
import json
import os
import pathlib
import statistics
import threading
import time

import paho.mqtt.client as mqtt

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
cfg = {"tempMax": 28.0, "humMax": 70.0, "occupancyWindowMin": 10}
lock = threading.Lock()
temps, hums = [], []
motion_events = 0
pir_on = False
last_motion = 0.0


def on_connect(client, userdata, flags, reason_code, properties):
    client.subscribe([("sensores/dht", 1), ("sensores/pir", 1), ("config/device", 1)])


def on_message(client, userdata, msg):
    global motion_events, pir_on, last_motion
    try:
        data = json.loads(msg.payload)
    except ValueError:
        return
    if not isinstance(data, dict):
        return
    with lock:
        if msg.topic == "config/device":
            for k in cfg:
                if isinstance(data.get(k), (int, float)):
                    cfg[k] = data[k]
        elif msg.topic == "sensores/dht":
            t, h = data.get("temp"), data.get("hum")
            # rango de operación del DHT11: 0-50 °C y 20-90 % HR; fuera de eso se descarta
            if isinstance(t, (int, float)) and isinstance(h, (int, float)) and 0 <= t <= 50 and 20 <= h <= 90:
                temps.append(t)
                hums.append(h)
        elif msg.topic == "sensores/pir":
            motion = bool(data.get("motion"))
            if motion and not pir_on:
                motion_events += 1
            if motion:
                last_motion = time.time()
            pir_on = motion


def flush(bucket_ts):
    global motion_events
    with lock:
        t_list, h_list, events = temps[:], hums[:], motion_events
        temps.clear()
        hums.clear()
        motion_events = 0
        occupied = pir_on or (time.time() - last_motion) < cfg["occupancyWindowMin"] * 60
        limits = dict(cfg)
    if not t_list:
        return  # sin lecturas válidas en este minuto: no se envía nada
    t, h = statistics.fmean(t_list), statistics.fmean(h_list)
    alerts = []
    if t > limits["tempMax"]:
        alerts.append("temp_alta")
    if h > limits["humMax"]:
        alerts.append("hum_alta")
    # índice de confort de ejemplo (0-100): penaliza alejarse de 22 °C y salir de 40-60 % HR
    comfort = max(0, round(100 - 8 * abs(t - 22) - 1.5 * max(0, abs(h - 50) - 10)))
    doc = {
        "ts": bucket_ts,  # inicio del minuto (epoch, segundos): sirve de ID y evita duplicados
        "tempAvg": round(t, 1),
        "humAvg": round(h, 1),
        "samples": len(t_list),
        "motionEvents": events,
        "occupied": occupied,
        "comfort": comfort,
        "alerts": alerts,
    }
    client.publish("procesado/minuto", json.dumps(doc), qos=1)


client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="processing")
client.on_connect = on_connect
client.on_message = on_message
client.connect_async(MQTT_HOST, 1883)
client.loop_start()

bucket = int(time.time() // 60)
while True:
    time.sleep(1)
    now_bucket = int(time.time() // 60)
    if now_bucket != bucket:
        flush(bucket * 60)
        bucket = now_bucket
    pathlib.Path("/tmp/healthy").touch()
