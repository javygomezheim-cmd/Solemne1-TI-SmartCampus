
'use client';

import { useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { Reading } from '@/types/cliente';

const ORG_ID = 'mi-org';
const DEVICE_ID = 'Oo2T8PLAS6jet80h8wLo';
const PAGE_SIZE = 50;

export default function useHistoryReadings() {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [historial, setHistorial] = useState<Reading[]>([]);
  const [cursorHistorial, setCursorHistorial] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hayMasHistorial, setHayMasHistorial] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState('');

  async function buscarHistorial(siguiente = false) {
    if (!fechaInicio || !fechaFin) {
      setErrorHistorial('Selecciona la fecha inicial y la fecha final.');
      return;
    }

    if (fechaInicio > fechaFin) {
      setErrorHistorial(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
      return;
    }

    if (siguiente && !cursorHistorial) return;

    setCargandoHistorial(true);
    setErrorHistorial('');

    if (!siguiente) {
      setHistorial([]);
      setCursorHistorial(null);
      setHayMasHistorial(false);
    }

    try {
      const inicio = new Date(`${fechaInicio}T00:00:00`);
      const finExclusivo = new Date(`${fechaFin}T00:00:00`);
      finExclusivo.setDate(finExclusivo.getDate() + 1);

      const historialRef = collection(
        db,
        `orgs/${ORG_ID}/devices/${DEVICE_ID}/history10m`,
      );

      const condiciones = [
        where('ts', '>=', Timestamp.fromDate(inicio)),
        where('ts', '<', Timestamp.fromDate(finExclusivo)),
        orderBy('ts', 'desc'),
      ];

      const consulta = query(
        historialRef,
        ...condiciones,
        ...(siguiente ? [startAfter(cursorHistorial!)] : []),
        limit(PAGE_SIZE),
      );

      const resultado = await getDocs(consulta);

      const nuevasLecturas: Reading[] = resultado.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Reading, 'id'>),
      }));

      setHistorial((actual) =>
        siguiente ? [...actual, ...nuevasLecturas] : nuevasLecturas,
      );

      setCursorHistorial(
        resultado.docs.length > 0
          ? resultado.docs[resultado.docs.length - 1]
          : null,
      );

      setHayMasHistorial(resultado.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error consultando historial:', error);
      setErrorHistorial(
        'No se pudo cargar el historial. Intenta nuevamente.',
      );
    } finally {
      setCargandoHistorial(false);
    }
  }

  return {
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    historial,
    hayMasHistorial,
    cargandoHistorial,
    errorHistorial,
    buscarHistorial,
  };
}
