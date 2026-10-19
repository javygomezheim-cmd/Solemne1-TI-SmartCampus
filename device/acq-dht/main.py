"""Adquisición DHT11: lee temperatura/humedad y publica en sensores/dht.
Aplica sampleIntervalSec y dhtEnabled desde config/device sin reiniciarse."""
import json
import os
import pathlib
import random
import time

import paho.mqtt.client as mqtt

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
SIMULATE = os.getenv("SIMULATE", "false").lower() == "true"
GPIO_PIN = int(os.getenv("DHT_GPIO", "4"))
cfg = {"sampleIntervalSec": 10, "dhtEnabled": True}


def on_connect(client, userdata, flags, reason_code, properties):
    client.subscribe("config/device", qos=1)


def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload)
        cfg["sampleIntervalSec"] = max(2, int(data.get("sampleIntervalSec", cfg["sampleIntervalSec"])))
        cfg["dhtEnabled"] = bool(data.get("dhtEnabled", cfg["dhtEnabled"]))
    except (ValueError, TypeError, AttributeError):
        pass


def make_reader():
    if SIMULATE:
        return lambda: (round(random.uniform(19, 26)), round(random.uniform(40, 65)))
    import adafruit_dht
    import board

    dht = adafruit_dht.DHT11(getattr(board, f"D{GPIO_PIN}"))
    return lambda: (dht.temperature, dht.humidity)


client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="acq-dht")
client.on_connect = on_connect
client.on_message = on_message
client.connect_async(MQTT_HOST, 1883)
client.loop_start()

read = make_reader()
next_read = 0.0
while True:
    now = time.time()
    if cfg["dhtEnabled"] and now >= next_read:
        next_read = now + cfg["sampleIntervalSec"]
        try:
            temp, hum = read()
            if temp is not None and hum is not None:
                client.publish("sensores/dht", json.dumps({"ts": int(now), "temp": temp, "hum": hum}), qos=1)
        except (RuntimeError, OSError) as e:
            print("lectura fallida (es normal de vez en cuando en el DHT11):", e, flush=True)
    pathlib.Path("/tmp/healthy").touch()
    time.sleep(1)
