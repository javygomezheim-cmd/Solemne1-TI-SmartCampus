import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const MAX_BATCH = 200;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const LASTSEEN_EVERY_MS = 5 * 60 * 1000; // decisión de diseño: no escribir lastSeen en cada sync

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const num = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validReading(r: any, nowSec: number): boolean {
  return (
    !!r &&
    Number.isInteger(r.ts) &&
    r.ts % 60 === 0 &&
    r.ts > nowSec - 30 * 86400 &&
    r.ts < nowSec + 300 &&
    num(r.tempAvg, -40, 85) &&
    num(r.humAvg, 0, 100) &&
    Number.isInteger(r.samples) && r.samples >= 1 && r.samples <= 3600 &&
    Number.isInteger(r.motionEvents) && r.motionEvents >= 0 && r.motionEvents <= 100000 &&
    typeof r.occupied === "boolean" &&
    num(r.comfort, 0, 100) &&
    Array.isArray(r.alerts) && r.alerts.length <= 5 &&
    r.alerts.every((a: unknown) => typeof a === "string" && a.length <= 30)
  );
}

/**
 * POST /api/device/sync
 * Header:  Authorization: Bearer <orgId>.<deviceId>.<secreto>
 * Body:    { "readings": [ { ts, tempAvg, humAvg, samples, motionEvents, occupied, comfort, alerts } ] }
 * Resp:    { ok, accepted, rejected, config }   (config = configuración vigente del dispositivo)
 * Sirve a la vez como ingesta, latido y entrega de configuración (1 sola invocación por minuto).
 */
export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const [orgId, deviceId, secret] = token.split(".");
  if (!ID_RE.test(orgId ?? "") || !ID_RE.test(deviceId ?? "") || !secret) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch (error) {
    console.error("Error al inicializar Firebase Admin:", error);
    return NextResponse.json({ error: "server_configuration_error" }, { status: 500 });
  }

  // 1 lectura de Firestore por sync: trae hash del token, estado de revocación y configuración
  const ref = db.doc(`orgs/${orgId}/devices/${deviceId}`);
  const dev = (await ref.get()).data();
  if (!dev || dev.revoked || !safeEqual(String(dev.tokenHash), sha256(secret))) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!Array.isArray(body?.readings) || body.readings.length > MAX_BATCH) {
    return NextResponse.json({ error: "invalid_batch" }, { status: 400 });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const batch = db.batch();
  let accepted = 0;
  for (const r of body.readings) {
    if (!validReading(r, nowSec)) continue;
    // ID = ts del minuto → reenviar la misma lectura la sobrescribe, nunca la duplica
    const readingData = {
      ts: Timestamp.fromMillis(r.ts * 1000),
      tempAvg: r.tempAvg,
      humAvg: r.humAvg,
      samples: r.samples,
      motionEvents: r.motionEvents,
      occupied: r.occupied,
      comfort: r.comfort,
      alerts: r.alerts,
    };

    // Conserva cada medición original, identificada por el minuto de captura.
    batch.set(ref.collection("readings").doc(String(r.ts)), readingData);

    // Una lectura representativa por cada intervalo de 10 minutos.
    // Se decide con el timestamp de captura, no con la hora de recepción:
    // los lotes que llegan tarde tras una desconexión quedan en su intervalo correcto.
    if (r.ts % 600 === 0) {
      batch.set(ref.collection("history10m").doc(String(r.ts)), readingData);
    }

    accepted++;
  }

  const needsLastSeen = Date.now() - (dev.lastSeen?.toMillis?.() ?? 0) > LASTSEEN_EVERY_MS;
  if (needsLastSeen) batch.update(ref, { lastSeen: Timestamp.now() });
  if (accepted > 0 || needsLastSeen) await batch.commit();

  return NextResponse.json({
    ok: true,
    accepted,
    rejected: body.readings.length - accepted,
    config: dev.config ?? {},
  });
}
