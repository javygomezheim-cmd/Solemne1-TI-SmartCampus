
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

const DEVICE_ID = 'Oo2T8PLAS6jet80h8wLo';

export default function useDeviceReadings(
  orgId: string,
  enabled: boolean,
) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    if (!enabled || !orgId) {
      setReadings([]);
      setConfig(null);
      setDataError('');
      return;
    }

    let active = true;

    const handleError = (message: string, error: Error) => {
      if (!active) return;

      console.error(message, error);
      setDataError(message);
    };

    setReadings([]);
    setConfig(null);
    setDataError('');

    const basePath = `orgs/${orgId}/devices/${DEVICE_ID}`;

    const readingsRef = collection(db, `${basePath}/readings`);
    const readingsQuery = query(
      readingsRef,
      orderBy('ts', 'desc'),
      limit(1),
    );

    const unsubscribeReadings = onSnapshot(
      readingsQuery,
      (snapshot) => {
        if (!active) return;

        setReadings(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<Reading, 'id'>),
          })),
        );

        setDataError('');
      },
      (error) => {
        handleError('No se pudieron cargar las mediciones.', error);
      },
    );

    const unsubscribeDevice = onSnapshot(
      doc(db, basePath),
      (snapshot) => {
        if (!active) return;

        if (snapshot.exists()) {
          const data = snapshot.data();

          setConfig({
            ...(data.config as DeviceConfig | undefined),
            name: data.name ?? data.config?.name,
            revoked: data.revoked,
          });
        } else {
          setConfig(null);
        }
      },
      (error) => {
        handleError(
          'No se pudo cargar la configuración del dispositivo.',
          error,
        );
      },
    );

    return () => {
      active = false;
      unsubscribeReadings();
      unsubscribeDevice();
    };
  }, [orgId, enabled]);

  return { readings, config, dataError };
}
