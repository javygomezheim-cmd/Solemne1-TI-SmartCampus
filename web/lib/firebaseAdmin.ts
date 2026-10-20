import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// FIREBASE_SERVICE_ACCOUNT = contenido completo del JSON de la cuenta de servicio.
// Solo existe como variable de entorno (en web/.env.local y en Vercel). Nunca va en el repositorio
// ni en la Raspberry Pi.
// La conexión se crea al usarla (no al importar el archivo), así un error de configuración
// devuelve un mensaje claro en vez de romper el build.
export function getDb() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error("Falta configurar FIREBASE_SERVICE_ACCOUNT");
  }

  let credentials: unknown;
  try {
    credentials = JSON.parse(serviceAccount);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT no contiene JSON válido");
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert(credentials as Parameters<typeof cert>[0]),
    });

  return getFirestore(app);
}
