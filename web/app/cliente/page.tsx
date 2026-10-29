'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';

import { auth } from '@/lib/firebase';

import type {
  Reading,
} from '@/types/cliente';

import MetricCard from '@/components/cliente/MetricCard';
import HistoryCharts from '@/components/cliente/HistoryCharts';

import useClienteAuth from '@/hooks/cliente/useClienteAuth';
import useDeviceReadings from '@/hooks/cliente/useDeviceReadings';
import useHistoryReadings from '@/hooks/cliente/useHistoryReadings';


function formatDate(ts?: Reading['ts']) {
  if (!ts?.seconds) return 'Sin datos disponibles';

  return new Date(ts.seconds * 1000).toLocaleString('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

export default function ClientePage() {
  const router = useRouter();
  const { email, orgId, checking } = useClienteAuth();

  const {
    readings,
    config,
    dataError,
  } = useDeviceReadings(
    orgId,
    !checking && !!email && !!orgId
  );

  // Estado independiente para consultar el historial bajo demanda.
  const {
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    historial,
    hayMasHistorial,
    cargandoHistorial,
    errorHistorial,
    buscarHistorial,
  } = useHistoryReadings(orgId);

  const latest = readings[0] ?? null;
  const alerts: { title: string; description: string }[] = [];

  if (latest && config) {
    if (
      typeof latest.tempAvg === 'number' &&
      typeof config.tempMax === 'number' &&
      latest.tempAvg > config.tempMax
    ) {
      alerts.push({
        title: 'Temperatura elevada',
        description: `La temperatura es ${latest.tempAvg} °C y supera el máximo de ${config.tempMax} °C.`,
      });
    }

    if (
      typeof latest.humAvg === 'number' &&
      typeof config.humMax === 'number' &&
      latest.humAvg > config.humMax
    ) {
      alerts.push({
        title: 'Humedad elevada',
        description: `La humedad es ${latest.humAvg}% y supera el máximo de ${config.humMax}%.`,
      });
    }

    latest.alerts?.forEach((alert) => {
      alerts.push({
        title: 'Alerta del dispositivo',
        description: alert,
      });
    });
  }

  if (checking) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f8fafc',
          color: '#475569',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Verificando acceso...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f4f7fb',
        fontFamily: 'system-ui, sans-serif',
        color: '#0f172a',
      }}
    >
      <header
        style={{
          background: '#0f172a',
          color: '#fff',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: 1150,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                margin: '0 0 6px',
                fontSize: 12,
                letterSpacing: 2,
                color: '#93c5fd',
                fontWeight: 700,
              }}
            >
              TI SMART CAMPUS
            </p>
            <h1 style={{ fontSize: 26, margin: 0 }}>Panel de monitoreo</h1>
            <p
              style={{
                color: '#cbd5e1',
                margin: '8px 0 0',
                fontSize: 14,
              }}
            >
              Bienvenido, {email}
            </p>
          </div>

          <button
            onClick={async () => {
              await signOut(auth);
              router.replace('/');
            }}
            style={{
              border: '1px solid #475569',
              background: '#1e293b',
              color: '#fff',
              borderRadius: 10,
              padding: '11px 16px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1150,
          margin: '0 auto',
          padding: '32px 20px 48px',
        }}
      >
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 23, margin: '0 0 8px' }}>Resumen actual</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Estado ambiental de tu espacio en tiempo real.
          </p>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
            gap: 16,
          }}
        >
          <MetricCard
            title="Temperatura"
            value={latest?.tempAvg ?? '--'}
            unit="°C"
            detail={`Máximo: ${config?.tempMax ?? '--'} °C`}
            color="#ea580c"
            icon="🌡️"
          />

          <MetricCard
            title="Humedad relativa"
            value={latest?.humAvg ?? '--'}
            unit="%"
            detail={`Máximo: ${config?.humMax ?? '--'}%`}
            color="#0284c7"
            icon="💧"
          />

          <MetricCard
            title="Ocupación"
            value={latest ? (latest.occupied ? 'Ocupada' : 'Despejada') : '--'}
            detail="Estado detectado por el sensor"
            color={latest?.occupied ? '#16a34a' : '#64748b'}
            icon="👥"
          />

          <MetricCard
            title="Comodidad térmica"
            value={latest?.comfort ?? '--'}
            detail={`Muestras: ${latest?.samples ?? '--'}`}
            color="#7c3aed"
            icon={
              latest?.comfort == null
                ? '🎚️'
                : latest.comfort < 40
                  ? '😟'
                  : latest.comfort < 70
                    ? '😐'
                    : '😊'
            }
          />

        </section>

        <section
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 18,
            padding: 24,
            marginTop: 24,
            boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 20,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>Estado y alertas</h2>
              <p
                style={{
                  color: '#64748b',
                  margin: '7px 0 0',
                  fontSize: 14,
                }}
              >
                Comparación de la última lectura con los límites configurados.
              </p>
            </div>

            <span
              style={{
                borderRadius: 999,
                padding: '7px 12px',
                fontSize: 13,
                fontWeight: 700,
                background: alerts.length ? '#fee2e2' : '#dcfce7',
                color: alerts.length ? '#991b1b' : '#166534',
              }}
            >
              {alerts.length ? `${alerts.length} alerta(s)` : 'Sin alertas detectadas'}
            </span>
          </div>

          {dataError && (
            <p
              style={{
                background: '#fff7ed',
                color: '#9a3412',
                padding: 14,
                borderRadius: 10,
              }}
            >
              {dataError}
            </p>
          )}

          {!latest ? (
            <p style={{ color: '#64748b' }}>Todavía no hay lecturas disponibles.</p>
          ) : alerts.length === 0 ? (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: 18,
                color: '#166534',
              }}
            >
              <strong>✓ Todo dentro de los límites</strong>
              <p style={{ marginBottom: 0, fontSize: 14 }}>
                No se detectan excesos en la última lectura.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {alerts.map((alert, index) => (
                <article
                  key={`${alert.title}-${index}`}
                  style={{
                    background: '#fff7f7',
                    border: '1px solid #fecaca',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <p
                    style={{
                      color: '#991b1b',
                      fontWeight: 700,
                      margin: '0 0 6px',
                    }}
                  >
                    ⚠️ {alert.title}
                  </p>
                  <p
                    style={{
                      color: '#7f1d1d',
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    {alert.description}
                  </p>
                </article>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              color: '#64748b',
              fontSize: 13,
            }}
          >
            <span>Última lectura: {formatDate(latest?.ts)}</span>
            <span>Dispositivo: {config?.name ?? 'Sala 1'}</span>
          </div>
        </section>

        <section
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 18,
            padding: 24,
            marginTop: 24,
            boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Historial de mediciones</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 0 }}>
            Se muestra una lectura representativa cada 10 minutos. Selecciona un rango de fechas.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'end',
              gap: 12,
              marginTop: 18,
            }}
          >
            <label style={{ display: 'grid', gap: 6, flex: '1 1 180px', fontSize: 14 }}>
              Fecha inicial
              <input
                type="date"
                value={fechaInicio}
                max={fechaFin || undefined}
                onChange={(event) => setFechaInicio(event.target.value)}
                style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, flex: '1 1 180px', fontSize: 14 }}>
              Fecha final
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio || undefined}
                onChange={(event) => setFechaFin(event.target.value)}
                style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}
              />
            </label>
            <button
              onClick={() => void buscarHistorial(false)}
              disabled={cargandoHistorial}
              style={{
                padding: '11px 18px',
                background: '#2563eb',
                color: '#fff',
                border: 0,
                borderRadius: 8,
                cursor: cargandoHistorial ? 'wait' : 'pointer',
                fontWeight: 600,
              }}
            >
              Buscar
            </button>
          </div>

          {errorHistorial && (
            <p role="alert" style={{ color: '#b91c1c', marginTop: 16 }}>
              {errorHistorial}
            </p>
          )}

          {cargandoHistorial && (
            <p style={{ color: '#64748b', marginTop: 18 }}>Cargando historial...</p>
          )}

          {!cargandoHistorial && historial.length === 0 && !errorHistorial && (
            <p style={{ color: '#64748b', marginTop: 18 }}>
              Selecciona las fechas y pulsa Buscar. Todavía no se ha consultado el historial.
            </p>
          )}

          {historial.length > 0 && (
            <>
              <HistoryCharts historial={historial} />

              <div style={{ overflowX: 'auto', marginTop: 22 }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 14,
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      {[
                        'Fecha',
                        'Temperatura',
                        'Humedad',
                        'Ocupación',
                        'Eventos de movimiento',
                        'Comodidad térmica',
                      ].map((titulo) => (
                        <th key={titulo} style={{ padding: 12, whiteSpace: 'nowrap' }}>
                          {titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((lectura) => (
                      <tr key={lectura.id}>
                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #e5e7eb',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDate(lectura.ts)}
                        </td>
                        <td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                          {lectura.tempAvg ?? '--'} °C
                        </td>
                        <td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                          {lectura.humAvg ?? '--'} %
                        </td>
                        <td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                          {lectura.occupied == null
                            ? '--'
                            : lectura.occupied
                              ? 'Ocupada'
                              : 'Despejada'}
                        </td>
                        <td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                          {lectura.motionEvents ?? '--'}
                        </td>
                        <td style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
                          {lectura.comfort ?? '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginTop: 18,
                }}
              >
                <span style={{ color: '#64748b', fontSize: 13 }}>
                  {historial.length} mediciones cargadas (máximo 50 por consulta).
                </span>
                {hayMasHistorial && (
                  <button
                    onClick={() => void buscarHistorial(true)}
                    disabled={cargandoHistorial}
                    style={{
                      padding: '10px 16px',
                      background: '#000000',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Cargar 50 más
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <p
          style={{
            marginTop: 20,
            color: '#94a3b8',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          Los datos se actualizan automáticamente cuando Firestore recibe nuevas lecturas.
        </p>
      </div>
    </main>
  );
}
