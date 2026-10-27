import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'node:fs/promises';

const orgId = process.env.ORG_ID;
const deviceId = process.env.DEVICE_ID;
const applyChanges = process.env.APPLY === '1';
const pageSize = 500;

if (!orgId || !/^[A-Za-z0-9_-]{1,64}$/.test(orgId)) {
  throw new Error('Define ORG_ID con el ID de la organización antes de ejecutar el script.');
}
if (!deviceId || !/^[A-Za-z0-9_-]{1,64}$/.test(deviceId)) {
  throw new Error('Define DEVICE_ID con el ID del dispositivo antes de ejecutar el script.');
}

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credentialsPath) {
  throw new Error(
    'Falta GOOGLE_APPLICATION_CREDENTIALS con la ruta del archivo JSON.'
  );
}

let serviceAccount;

try {
  const credentialsJson = await readFile(credentialsPath, 'utf8');
  serviceAccount = JSON.parse(credentialsJson);
} catch {
  throw new Error(
    'No se pudo leer el archivo de credenciales. Revisa la ruta y el JSON.'
  );
}

const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const deviceRef = db.doc(`orgs/${orgId}/devices/${deviceId}`);
const readingsRef = deviceRef.collection('readings');
const historyRef = deviceRef.collection('history10m');

let cursor;
let scanned = 0;
let eligible = 0;
let written = 0;

console.log(`Dispositivo: orgs/${orgId}/devices/${deviceId}`);
console.log(`Modo: ${applyChanges ? 'ESCRITURA' : 'SIMULACIÓN (no modifica Firestore)'}`);

while (true) {
  let pageQuery = readingsRef.orderBy(FieldPath.documentId()).limit(pageSize);
  if (cursor) pageQuery = pageQuery.startAfter(cursor);

  const page = await pageQuery.get();
  if (page.empty) break;

  const batch = db.batch();
  let pageEligible = 0;

  for (const sourceDoc of page.docs) {
    scanned++;
    const data = sourceDoc.data();
    const ts = data.ts;

    // El histórico se determina por el instante de captura, no por la llegada del lote.
    if (!ts || typeof ts.toMillis !== 'function') continue;
    const seconds = Math.floor(ts.toMillis() / 1000);
    if (!Number.isInteger(seconds) || seconds % 600 !== 0) continue;

    eligible++;
    pageEligible++;
    if (applyChanges) {
      // El mismo ID hace que la migración sea idempotente: reejecutarla no duplica documentos.
      batch.set(historyRef.doc(sourceDoc.id), data);
    }
  }

  if (applyChanges && pageEligible > 0) {
    await batch.commit();
    written += pageEligible;
  }

  cursor = page.docs[page.docs.length - 1];
  console.log(`Leídas: ${scanned} | Candidatas: ${eligible} | Escritas: ${written}`);
  if (page.size < pageSize) break;
}

console.log('\nResultado final');
console.log(`Documentos revisados en readings: ${scanned}`);
console.log(`Lecturas elegibles para history10m: ${eligible}`);
console.log(`Documentos escritos: ${written}`);
if (!applyChanges) {
  console.log('\nNo se modificó Firestore. Si las cantidades son correctas, vuelve a ejecutar con APPLY=1 para copiar los datos.');
} else {
  console.log('\nMigración terminada. No se eliminó ni modificó ningún documento de readings.');
}

await app.delete();
