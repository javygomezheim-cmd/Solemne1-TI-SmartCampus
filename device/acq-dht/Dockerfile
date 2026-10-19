FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev libgpiod2 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
CMD ["python", "-u", "main.py"]
