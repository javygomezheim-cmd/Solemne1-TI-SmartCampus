
'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { Reading, DeviceConfig } from '@/types/cliente';

const ORG_ID = 'mi-org';
const DEVICE_ID = 'Oo2T8PLAS6jet80h8wLo';

export default function useDeviceReadings(enabled: boolean) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    if (!enabled) return;

    const readingsRef = collection(
      db,
      `orgs/${ORG_ID}/devices/${DEVICE_ID}/readings`,
    );

    const readingsQuery = query(
      readingsRef,
      orderBy('ts', 'desc'),
      limit(1),
    );

    const unsubscribeReadings = onSnapshot(
      readingsQuery,
      (snapshot) => {
        setReadings(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<Reading, 'id'>),
          })),
        );

        setDataError('');
      },
      (error) => {
        console.error('Error leyendo mediciones:', error);
        setDataError('No se pudieron cargar las mediciones.');
      },
    );

    const unsubscribeDevice = onSnapshot(
      doc(db, `orgs/${ORG_ID}/devices/${DEVICE_ID}`),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setConfig({
            ...(data.config as DeviceConfig | undefined),
            name: data.name ?? data.config?.name,
            revoked: data.revoked,
          });
        }
      },
      (error) => {
        console.error('Error leyendo configuración:', error);
        setDataError('No se pudo cargar la configuración del dispositivo.');
      },
    );

    return () => {
      unsubscribeReadings();
      unsubscribeDevice();
    };
  }, [enabled]);

  return { readings, config, dataError };
}
