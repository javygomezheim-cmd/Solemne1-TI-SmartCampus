"""Adquisición PIR: publica en sensores/pir cuando cambia el estado (y cada 30 s como refresco)."""
import json
import os
import pathlib
import random
import time

import paho.mqtt.client as mqtt

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
SIMULATE = os.getenv("SIMULATE", "false").lower() == "true"
GPIO_PIN = int(os.getenv("PIR_GPIO", "17"))
cfg = {"pirEnabled": True}


def on_connect(client, userdata, flags, reason_code, properties):
    client.subscribe("config/device", qos=1)


def on_message(client, userdata, msg):
    try:
        cfg["pirEnabled"] = bool(json.loads(msg.payload).get("pirEnabled", True))
    except (ValueError, AttributeError):
        pass


if SIMULATE:
    _sim = {"on": False}

    def read_pir():
        p = 0.8 if _sim["on"] else 0.03
        _sim["on"] = random.random() < p
        return _sim["on"]
else:
    import RPi.GPIO as GPIO

    GPIO.setmode(GPIO.BCM)
    GPIO.setup(GPIO_PIN, GPIO.IN)

    def read_pir():
        return GPIO.input(GPIO_PIN) == 1


client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="acq-pir")
client.on_connect = on_connect
client.on_message = on_message
client.connect_async(MQTT_HOST, 1883)
client.loop_start()

last_state, last_pub = None, 0.0
while True:
    if cfg["pirEnabled"]:
        motion = read_pir()
        now = time.time()
        if motion != last_state or now - last_pub >= 30:
            client.publish("sensores/pir", json.dumps({"ts": int(now), "motion": motion}), qos=1)
            last_state, last_pub = motion, now
    pathlib.Path("/tmp/healthy").touch()
    time.sleep(0.5)
