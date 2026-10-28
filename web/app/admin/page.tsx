'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import type { Reading } from '@/types/cliente';
import MetricCard from '@/components/cliente/MetricCard';
import useDeviceReadings from '@/hooks/cliente/useDeviceReadings';
import useHistoryReadings from '@/hooks/cliente/useHistoryReadings';

import FirestoreUsageEstimate from '@/components/admin/FirestoreUsageEstimate';

const ORG_ID = 'mi-org';
const DEVICE_ID = 'Oo2T8PLAS6jet80h8wLo';

function formatDate(ts?: Reading['ts']) {
  if (!ts?.seconds) return 'Sin datos disponibles';

  return new Date(ts.seconds * 1000).toLocaleString('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

export default function DashboardPage() {
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [sampleIntervalInput, setSampleIntervalInput] = useState('60');
  const [humidityMaxInput, setHumidityMaxInput] = useState('');
  const [temperatureMaxInput, setTemperatureMaxInput] = useState('');

  const [configInputEdited, setConfigInputEdited] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState('');
  const [configError, setConfigError] = useState('');

  // Verificar que el usuario tenga rol de administrador.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!userDoc.exists()) {
          await signOut(auth);
          router.replace('/');
          return;
        }

        const role = userDoc.data().role;

        if (role !== 'admin') {
          if (role === 'cliente') {
            router.replace('/cliente');
          } else {
            await signOut(auth);
            router.replace('/');
          }
          return;
        }

        setUserEmail(user.email);
        setUserRole(role);
        setIsChecking(false);
      } catch (error) {
        console.error('Error al verificar el rol:', error);
        router.replace('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Última lectura y configuración en tiempo real.
  const {
    readings,
    config,
    dataError,
  } = useDeviceReadings(!isChecking && !!userEmail);

  useEffect(() => {
    if (config) {
      setHumidityMaxInput(String(config.humMax ?? 70));
      setTemperatureMaxInput(String(config.tempMax ?? 28));
    }
  }, [config?.version]);

  // Historial compartido con la página del cliente.
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
  } = useHistoryReadings();

  const latest = readings[0] ?? null;

  const handleUpdateConfig = async () => {
    setConfigMessage('');
    setConfigError('');

    const intervalValue = sampleIntervalInput.trim();
    const humidityValue = humidityMaxInput.trim();
    const temperatureValue = temperatureMaxInput.trim();

    // Validar intervalo
    if (!/^[1-9]\d*$/.test(intervalValue)) {
      setConfigError('Ingresa un intervalo entero positivo.');
      return;
    }

    const newInterval = Number(intervalValue);

    if (
      !Number.isSafeInteger(newInterval) ||
      newInterval < 10 ||
      newInterval > 600
    ) {
      setConfigError('El intervalo debe estar entre 10 y 600 segundos.');
      return;
    }

    // Validar humedad
    if (humidityValue === '') {
      setConfigError('Ingresa la humedad máxima.');
      return;
    }

    const newHumidity = Number(humidityValue);

    if (
      !Number.isFinite(newHumidity) ||
      newHumidity < 0 ||
      newHumidity > 100
    ) {
      setConfigError('La humedad máxima debe estar entre 0 y 100 %.');
      return;
    }

    // Validar temperatura
    if (temperatureValue === '') {
      setConfigError('Ingresa la temperatura máxima.');
      return;
    }

    const newTemperature = Number(temperatureValue);

    if (!Number.isFinite(newTemperature)) {
      setConfigError('Ingresa una temperatura válida.');
      return;
    }

    const currentVersion = config?.version;
    const versionNumber =
      currentVersion == null ? 0 : Number(currentVersion);

    if (
      !Number.isSafeInteger(versionNumber) ||
      versionNumber < 0 ||
      versionNumber >= Number.MAX_SAFE_INTEGER
    ) {
      setConfigError('La versión actual de configuración no es válida.');
      return;
    }

    try {
      setSavingConfig(true);

      await updateDoc(
        doc(db, `orgs/${ORG_ID}/devices/${DEVICE_ID}`),
        {
          'config.sampleIntervalSec': newInterval,
          'config.humMax': newHumidity,
          'config.tempMax': newTemperature,
          'config.version': versionNumber + 1,
        },
      );

      setConfigInputEdited(false);

      setConfigMessage(
        `Configuración guardada correctamente. Intervalo: ${newInterval} s, humedad máxima: ${newHumidity} %, temperatura máxima: ${newTemperature} °C. Versión ${versionNumber + 1}.`,
      );
    } catch (error) {
      console.error('Error al actualizar la configuración:', error);

      setConfigError(
        'No se pudo guardar la configuración. Comprueba tus permisos y la conexión con Firestore.',
      );
    } finally {
      setSavingConfig(false);
    }
  };

  if (isChecking) {
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
          padding: 24,
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
              TI SMART CAMPUS · ADMINISTRACIÓN
            </p>

            <h1 style={{ fontSize: 26, margin: 0 }}>
              Panel de monitoreo
            </h1>

            <p
              style={{
                color: '#cbd5e1',
                margin: '8px 0 0',
                fontSize: 14,
              }}
            >
              {userEmail} · Rol: {userRole}
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
        {/* Métricas actuales: mismo componente que el cliente. */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 23, margin: '0 0 8px' }}>
            Resumen actual
          </h2>

          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Estado ambiental del dispositivo en tiempo real.
          </p>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
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
            value={
              latest
                ? latest.occupied
                  ? 'Ocupada'
                  : 'Despejada'
                : '--'
            }
            detail="Estado detectado por el sensor"
            color={latest?.occupied ? '#16a34a' : '#64748b'}
            icon="👥"
          />

          <MetricCard
            title="Eventos de movimiento"
            value={latest?.motionEvents ?? '--'}
            detail={`Muestras: ${latest?.samples ?? '--'}`}
            color="#7c3aed"
            icon="📡"
          />
        </section>

        {dataError && (
          <p
            role="alert"
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 10,
              background: '#fff7ed',
              color: '#9a3412',
            }}
          >
            {dataError}
          </p>
        )}

        {/* Historial: mismo filtro y paginación que el cliente. */}
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
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>
            Historial de mediciones
          </h2>

          <p
            style={{
              color: '#64748b',
              fontSize: 14,
              marginTop: 0,
            }}
          >
            Lecturas representativas cada 10 minutos. Selecciona un rango de
            fechas.
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
            <label
              style={{
                display: 'grid',
                gap: 6,
                flex: '1 1 180px',
                fontSize: 14,
              }}
            >
              Fecha inicial
              <input
                type="date"
                value={fechaInicio}
                max={fechaFin || undefined}
                onChange={(event) => setFechaInicio(event.target.value)}
                style={{
                  padding: 10,
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                }}
              />
            </label>

            <label
              style={{
                display: 'grid',
                gap: 6,
                flex: '1 1 180px',
                fontSize: 14,
              }}
            >
              Fecha final
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio || undefined}
                onChange={(event) => setFechaFin(event.target.value)}
                style={{
                  padding: 10,
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                }}
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
            <p style={{ color: '#64748b', marginTop: 18 }}>
              Cargando historial...
            </p>
          )}

          {!cargandoHistorial &&
            historial.length === 0 &&
            !errorHistorial && (
              <p style={{ color: '#64748b', marginTop: 18 }}>
                Selecciona las fechas y pulsa Buscar. Todavía no se ha
                consultado el historial.
              </p>
            )}

          {historial.length > 0 && (
            <>
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
                      ].map((titulo) => (
                        <th
                          key={titulo}
                          style={{
                            padding: 12,
                            whiteSpace: 'nowrap',
                          }}
                        >
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

                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          {lectura.tempAvg ?? '--'} °C
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          {lectura.humAvg ?? '--'} %
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          {lectura.occupied == null
                            ? '--'
                            : lectura.occupied
                              ? 'Ocupada'
                              : 'Despejada'}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          {lectura.motionEvents ?? '--'}
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
                  {historial.length} mediciones cargadas (50 por página).
                </span>

                {hayMasHistorial && (
                  <button
                    onClick={() => void buscarHistorial(true)}
                    disabled={cargandoHistorial}
                    style={{
                      padding: '10px 16px',
                      background: '#000',
                      color: '#fff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      cursor: cargandoHistorial ? 'wait' : 'pointer',
                    }}
                  >
                    Cargar 50 más
                  </button>
                )}
              </div>
            </>
          )}
        </section>



        {/* Configuración del dispositivo */}
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
          <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>
            Configuración del dispositivo
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: 32,
              alignItems: 'start',
            }}
          >
            {/* COLUMNA IZQUIERDA: Información actual */}
            <div>
              <h3
                style={{
                  margin: '0 0 20px',
                  fontSize: 16,
                  color: '#475569',
                }}
              >
                Información actual
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ margin: 0, overflowWrap: 'anywhere' }}>
                  ID del dispositivo:{' '}
                  <strong>{DEVICE_ID}</strong>
                </p>

                <p style={{ margin: 0 }}>
                  Intervalo actual:{' '}
                  <strong>
                    {config?.sampleIntervalSec ?? 'No configurado'} s
                  </strong>
                </p>

                <p style={{ margin: 0 }}>
                  Humedad máxima actual:{' '}
                  <strong>
                    {config?.humMax ?? 'No configurada'} %
                  </strong>
                </p>

                <p style={{ margin: 0 }}>
                  Temperatura máxima actual:{' '}
                  <strong>
                    {config?.tempMax ?? 'No configurada'} °C
                  </strong>
                </p>

                <p style={{ margin: 0 }}>
                  Versión de configuración:{' '}
                  <strong>
                    {config?.version ?? 'No configurada'}
                  </strong>
                </p>
              </div>
            </div>

            {/* COLUMNA DERECHA: Formulario de edición */}
            <div
              style={{
                borderLeft: '1px solid #e5e7eb',
                paddingLeft: 24,
              }}
            >
              <h3
                style={{
                  margin: '0 0 20px',
                  fontSize: 16,
                  color: '#475569',
                }}
              >
                Editar configuración
              </h3>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleUpdateConfig();
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {/* Intervalo */}
                <div>
                  <label
                    htmlFor="sampleInterval"
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      fontSize: 14,
                      marginBottom: 7,
                    }}
                  >
                    Intervalo de muestreo (segundos)
                  </label>

                  <input
                    id="sampleInterval"
                    type="number"
                    min="10"
                    max="600"
                    step="1"
                    required
                    value={
                      configInputEdited
                        ? sampleIntervalInput
                        : String(config?.sampleIntervalSec ?? 60)
                    }
                    onChange={(event) => {
                      setSampleIntervalInput(event.target.value);
                      setConfigInputEdited(true);
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: 11,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#1f2937',
                    }}
                  />
                </div>

                {/* Humedad máxima */}
                <div>
                  <label
                    htmlFor="humidityMax"
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      fontSize: 14,
                      marginBottom: 7,
                    }}
                  >
                    Humedad máxima (%)
                  </label>

                  <input
                    id="humidityMax"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
                    value={humidityMaxInput}
                    onFocus={() => {
                      if (humidityMaxInput === '' && config?.humMax != null) {
                        setHumidityMaxInput(String(config.humMax));
                      }
                    }}
                    onChange={(event) => {
                      setHumidityMaxInput(event.target.value);
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: 11,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#1f2937',
                    }}
                  />
                </div>

                {/* Temperatura máxima */}
                <div>
                  <label
                    htmlFor="temperatureMax"
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      fontSize: 14,
                      marginBottom: 7,
                    }}
                  >
                    Temperatura máxima (°C)
                  </label>

                  <input
                    id="temperatureMax"
                    type="number"
                    step="0.1"
                    required
                    value={temperatureMaxInput}
                    onFocus={() => {
                      if (
                        temperatureMaxInput === '' &&
                        config?.tempMax != null
                      ) {
                        setTemperatureMaxInput(String(config.tempMax));
                      }
                    }}
                    onChange={(event) => {
                      setTemperatureMaxInput(event.target.value);
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: 11,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#1f2937',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingConfig}
                  style={{
                    background: savingConfig ? '#94a3b8' : '#2563eb',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: 0,
                    cursor: savingConfig ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
                  {savingConfig
                    ? 'Guardando...'
                    : 'Guardar configuración'}
                </button>

                {configMessage && (
                  <p
                    role="status"
                    style={{ color: '#15803d', fontSize: 14, margin: 0 }}
                  >
                    {configMessage}
                  </p>
                )}

                {configError && (
                  <p
                    role="alert"
                    style={{ color: '#dc2626', fontSize: 14, margin: 0 }}
                  >
                    {configError}
                  </p>
                )}
              </form>
            </div>
          </div>
        </section>



        <FirestoreUsageEstimate
          key={config?.sampleIntervalSec ?? 60}
          sampleIntervalSec={config?.sampleIntervalSec ?? 60}
        />

        <p
          style={{
            marginTop: 20,
            color: '#94a3b8',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          Las métricas se actualizan con las nuevas lecturas de Firestore.
        </p>
      </div>
    </main>
  );
}