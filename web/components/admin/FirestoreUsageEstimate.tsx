
'use client';

import { useState } from 'react';

const DAILY_READ_LIMIT = 50000;
const DAILY_WRITE_LIMIT = 20000;
const DAILY_DELETE_LIMIT = 20000;

type Props = {
  sampleIntervalSec?: number;
};

function UsageCard({
  title,
  used,
  limit,
  color,
}: {
  title: string;
  used: number;
  limit: number;
  color: string;
}) {
  const remaining = Math.max(0, limit - used);
  const percentage = (used / limit) * 100;
  const width = Math.min(100, percentage);

  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: 20,
      }}
    >
      <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
        {title}
      </p>

      <p
        style={{
          fontSize: 28,
          fontWeight: 750,
          margin: '10px 0 4px',
          color: '#0f172a',
        }}
      >
        {Math.round(used).toLocaleString('es-CL')}
      </p>

      <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: 13 }}>
        de {limit.toLocaleString('es-CL')} operaciones diarias
      </p>

      <div
        style={{
          height: 9,
          borderRadius: 20,
          background: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${width}%`,
            background: percentage >= 80 ? '#dc2626' : color,
            borderRadius: 20,
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 10,
          fontSize: 13,
        }}
      >
        <span style={{ color: percentage >= 80 ? '#b91c1c' : '#475569' }}>
          {percentage.toFixed(1)}% utilizado
        </span>
        <span style={{ color: '#15803d', textAlign: 'right' }}>
          {remaining.toLocaleString('es-CL')} restantes
        </span>
      </div>
    </article>
  );
}

export default function FirestoreUsageEstimate({
  sampleIntervalSec = 60,
}: Props) {
  const [devices, setDevices] = useState(1);
  const [interval, setInterval] = useState(sampleIntervalSec);
  const [activeUsers, setActiveUsers] = useState(2);
  const [historyQueries, setHistoryQueries] = useState(2);
  const [docsPerQuery, setDocsPerQuery] = useState(50);

  const safeInterval = Math.max(1, interval || 1);
  const safeDevices = Math.max(0, devices);
  const safeUsers = Math.max(0, activeUsers);

  const safeHistoryQueries = Math.max(0, historyQueries);
  const safeDocsPerQuery = Math.max(0, docsPerQuery);

  // Supuesto: cada muestra genera una escritura y se guarda
  // un documento histórico adicional cada 10 minutos por dispositivo.
  const samplesPerDevice = Math.ceil(86400 / safeInterval);
  const historyWritesPerDevice = 144;

  const dailyWrites =
    safeDevices * (samplesPerDevice + historyWritesPerDevice);

  // Supuesto: cada usuario abierto recibe una lectura por nueva muestra,
  // más una lectura inicial de la última medición y una de configuración.
  const realtimeReadsPerUser =
    Math.ceil(86400 / safeInterval) + 2;

  const dailyReads =
    safeUsers *
    (realtimeReadsPerUser +
      safeHistoryQueries * safeDocsPerQuery);

  const estimatedMonthlyWrites = dailyWrites * 30;
  const estimatedMonthlyReads = dailyReads * 30;

  const dailyDeletes = 0;

  const formatNumber = (value: number) =>
    Math.round(value).toLocaleString('es-CL');

  return (
    <section
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 18,
        padding: 24,
        marginTop: 24,
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            color: '#2563eb',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: 1.5,
            margin: '0 0 6px',
          }}
        >
          FIREBASE · FIRESTORE
        </p>

        <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>
          Consumo estimado
        </h2>

        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
          Ajusta el escenario para estimar las operaciones diarias y
          compararlas con los límites gratuitos del proyecto.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <UsageCard
          title="Lecturas diarias estimadas"
          used={dailyReads}
          limit={DAILY_READ_LIMIT}
          color="#2563eb"
        />

        <UsageCard
          title="Escrituras diarias estimadas"
          used={dailyWrites}
          limit={DAILY_WRITE_LIMIT}
          color="#7c3aed"
        />

        <UsageCard
          title="Eliminaciones estimadas"
          used={dailyDeletes}
          limit={DAILY_DELETE_LIMIT}
          color="#0891b2"
        />
      </div>


      <h3 style={{ margin: '0 0 14px', fontSize: 17 }}>
        Parámetros de consumo
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 16,
        }}
      >
        <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
          Dispositivos
          <input
            type="number"
            min="0"
            step="1"
            value={devices}
            onChange={(event) =>
              setDevices(Math.max(0, Number(event.target.value) || 0))
            }
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
          Intervalo (segundos)
          <input
            type="number"
            min="1"
            step="1"
            value={interval}
            onChange={(event) =>
              setInterval(Math.max(1, Number(event.target.value) || 1))
            }
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
          Usuarios
          <input
            type="number"
            min="0"
            step="1"
            value={activeUsers}
            onChange={(event) =>
              setActiveUsers(Math.max(0, Number(event.target.value) || 0))
            }
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
          Consultas históricas por usuario al día
          <input
            type="number"
            min="0"
            step="1"
            value={historyQueries}
            onChange={(event) =>
              setHistoryQueries(Math.max(0, Number(event.target.value) || 0))
            }
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
          Documentos por consulta
          <input
            type="number"
            min="0"
            step="1"
            value={docsPerQuery}
            onChange={(event) =>
              setDocsPerQuery(Math.max(0, Number(event.target.value) || 0))
            }
            style={inputStyle}
          />
        </label>
      </div>


      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 16,
          marginTop: 20,
        }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
          Proyección mensual (30 días)
        </h3>

        <p style={{ margin: '6px 0', color: '#475569', fontSize: 14 }}>
          Escrituras: <strong>{formatNumber(estimatedMonthlyWrites)}</strong>
        </p>

        <p style={{ margin: '6px 0', color: '#475569', fontSize: 14 }}>
          Lecturas: <strong>{formatNumber(estimatedMonthlyReads)}</strong>
        </p>
      </div>

      <p
        style={{
          color: '#64748b',
          fontSize: 12,
          lineHeight: 1.6,
          margin: '16px 0 0',
        }}
      >
        Estimación, no medición real. Se supone una escritura por muestra
        y 144 escrituras históricas por dispositivo al día. Las lecturas
        consideran los usuarios con el panel abierto y las consultas
        históricas. El resultado real puede variar por reintentos, consultas
        adicionales, cambios en los documentos, reglas, índices y la
        implementación de sincronización.
      </p>
    </section>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: 10,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#fff',
  color: '#0f172a',
};
