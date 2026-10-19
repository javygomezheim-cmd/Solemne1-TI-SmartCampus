// Crea un dispositivo y muestra su token (se ve UNA sola vez; en Firestore queda solo el hash).
// Uso:  FIREBASE_SERVICE_ACCOUNT='{...json en una línea...}' node scripts/create-device.mjs <orgId> "<nombre>"
// Es temporal: luego esta lógica pasa a la plataforma web (alta de dispositivo + token revocable).
import { randomBytes, createHash } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const [orgId, name = "Pi sala 1"] = process.argv.slice(2);
if (!orgId) {
  console.error('Uso: node scripts/create-device.mjs <orgId> "<nombre>"');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

const ref = db.collection(`orgs/${orgId}/devices`).doc();
const secret = randomBytes(24).toString("hex");
await ref.set({
  name,
  tokenHash: createHash("sha256").update(secret).digest("hex"),
  revoked: false,
  config: {
    version: 1,
    sampleIntervalSec: 10,
    tempMax: 28,
    humMax: 70,
    occupancyWindowMin: 10,
    dhtEnabled: true,
    pirEnabled: true,
  },
  createdAt: Timestamp.now(),
});

console.log(`DEVICE_TOKEN=${orgId}.${ref.id}.${secret}`);
