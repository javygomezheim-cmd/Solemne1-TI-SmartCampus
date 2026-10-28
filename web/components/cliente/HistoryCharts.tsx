'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { Reading } from '@/types/cliente';

export default function HistoryCharts({
  historial,
}: {
  historial: Reading[];
}) {
  const datos = [...historial]
    .filter((lectura) => lectura.ts?.seconds != null)
    .sort((a, b) => a.ts!.seconds - b.ts!.seconds)
    .map((lectura) => {
      const fecha = new Date(lectura.ts!.seconds * 1000);

      return {
        id: lectura.id,
        hora: fecha.toLocaleString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        temperatura: lectura.tempAvg ?? null,
        humedad: lectura.humAvg ?? null,
        comfort: lectura.comfort == null
          ? null
          : lectura.comfort,
        movimiento: lectura.motionEvents ?? null,
      };
    });

  const tarjeta = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 20,
    minWidth: 0,
  } as const;

  if (datos.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        display: 'grid',
        gap: 18,
        marginTop: 24,
      }}
    >
      <article style={tarjeta}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>
          Temperatura y humedad
        </h3>

        <p
          style={{
            color: '#64748b',
            fontSize: 13,
            marginTop: 0,
          }}
        >
          Evolución ambiental durante el período seleccionado.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 18,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <span style={{ color: '#dc2626', fontSize: 13 }}>
            ● Temperatura (°C)
          </span>

          <span style={{ color: '#2563eb', fontSize: 13 }}>
            ● Humedad (%)
          </span>
        </div>

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={datos}
              margin={{ top: 8, right: 8, bottom: 25, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
              />

              <XAxis
                dataKey="hora"
                angle={-35}
                textAnchor="end"
                interval="preserveStartEnd"
                height={55}
                tick={{ fontSize: 11 }}
              />

              <YAxis
                yAxisId="temperatura"
                domain={['auto', 'auto']}
                tick={{ fontSize: 11 }}
                label={{
                  value: '°C',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />

              <YAxis
                yAxisId="humedad"
                orientation="right"
                domain={['auto', 'auto']}
                tick={{ fontSize: 11 }}
                label={{
                  value: '%',
                  angle: 90,
                  position: 'insideRight',
                }}
              />

              <Tooltip />

              <Line
                yAxisId="temperatura"
                type="monotone"
                dataKey="temperatura"
                name="Temperatura"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />

              <Line
                yAxisId="humedad"
                type="monotone"
                dataKey="humedad"
                name="Humedad"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article style={tarjeta}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>
          Comodidad térmica
        </h3>

        <p
          style={{
            color: '#64748b',
            fontSize: 13,
            marginTop: 0,
          }}
        >
           Índice de confort de 0 a 100.
        </p>

        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={datos}
              margin={{ top: 8, right: 12, bottom: 25, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
              />

              <XAxis
                dataKey="hora"
                angle={-35}
                textAnchor="end"
                interval="preserveStartEnd"
                height={55}
                tick={{ fontSize: 11 }}
              />

              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 11 }}
                width={65}
              />

              <Tooltip
                formatter={(valor) => [
                  valor,
                  'Comodidad térmica',
                ]}
                labelFormatter={(hora) => `Hora: ${hora}`}
              />

              <Line
                type="monotone"
                dataKey="comfort"
                name="Comodidad térmica"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              /> 
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article style={tarjeta}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>
          Eventos de movimiento
        </h3>

        <p
          style={{
            color: '#64748b',
            fontSize: 13,
            marginTop: 0,
          }}
        >
          Cantidad de eventos detectados por intervalo.
        </p>

        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={datos}
              margin={{ top: 8, right: 12, bottom: 25, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
              />

              <XAxis
                dataKey="hora"
                angle={-35}
                textAnchor="end"
                interval="preserveStartEnd"
                height={55}
                tick={{ fontSize: 11 }}
              />

              <YAxis allowDecimals={false} />

              <Tooltip />

              <Bar
                dataKey="movimiento"
                name="Eventos de movimiento"
                fill="#7c3aed"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}