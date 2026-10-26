'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, getDoc, getDocs, where, Timestamp } from 'firebase/firestore';

const ORG_ID = "mi-org";
const DEVICE_ID = "Oo2T8PLAS6jet80h8wLo";

export default function DashboardPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  // Estados para el filtro de fechas
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }
        } catch (error) {
          console.error("Error al obtener rol:", error);
        }
        setIsChecking(false);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Carga inicial en tiempo real (últimos 20 registros)
  useEffect(() => {
    if (!userEmail) return;

    const q = query(
      collection(db, `orgs/${ORG_ID}/devices/${DEVICE_ID}/readings`),
      orderBy('ts', 'desc'),
      limit(20)
    );
    const unsubscribeReadings = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setReadings(data);
    });

    const deviceRef = doc(db, `orgs/${ORG_ID}/devices/${DEVICE_ID}`);
    const unsubscribeDevice = onSnapshot(deviceRef, (docSnap) => {
      if (docSnap.exists()) setDeviceInfo(docSnap.data());
    });

    return () => {
      unsubscribeReadings();
      unsubscribeDevice();
    };
  }, [userEmail]);

  // Función para consultar históricos por rango de fechas bajo demanda
  const handleQueryByDateRange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert("Por favor selecciona ambas fechas.");
      return;
    }

    try {
      setLoadingHistory(true);
      const startTimestamp = Timestamp.fromDate(new Date(startDate + 'T00:00:00'));
      const endTimestamp = Timestamp.fromDate(new Date(endDate + 'T23:59:59'));

      const readingsRef = collection(db, `orgs/${ORG_ID}/devices/${DEVICE_ID}/readings`);
      const q = query(
        readingsRef,
        where('ts', '>=', startTimestamp),
        where('ts', '<=', endTimestamp),
        orderBy('ts', 'desc'),
        limit(100) // Límite de seguridad para evitar consumo excesivo
      );

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setReadings(data);
    } catch (error) {
      console.error("Error al consultar histórico:", error);
      alert("Error al filtrar por fechas. Revisa los índices compuestos en Firestore si es necesario.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdateConfig = async () => {
    try {
      const deviceRef = doc(db, `orgs/${ORG_ID}/devices/${DEVICE_ID}`);
      const newInterval = Math.floor(Math.random() * 20) + 10;
      await updateDoc(deviceRef, {
        "config.sampleIntervalSec": newInterval,
        "config.version": Math.floor(Math.random() * 1000)
      });
      alert(`Éxito: Intervalo actualizado a ${newInterval}s.`);
    } catch (error) {
      console.error(error);
      alert("Acceso denegado.");
    }
  };

  if (isChecking) return <div style={{ padding: "5rem", textAlign: "center" }}>Verificando seguridad...</div>;

  const latest = readings.length > 0 ? readings[0] : null;

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "1100px", margin: "0 auto", color: "#1f2937" }}>
      <header style={{ marginBottom: "2rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "1.2rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700 }}>Monitoreo IoT Smart Campus</h1>
          <p style={{ margin: "0.4rem 0 0", color: "#6b7280" }}>Dispositivo: {DEVICE_ID}</p>
          <p style={{ margin: "0.4rem 0 0", color: "#2563eb", fontWeight: 600 }}>Usuario: {userEmail} | Rol: {userRole || 'Sin rol'}</p>
        </div>
        <div>
          <button onClick={() => signOut(auth)} style={{ background: "#ef4444", color: "white", padding: "0.4rem 0.8rem", borderRadius: "6px", border: "none", cursor: "pointer" }}>Cerrar Sesión</button>
        </div>
      </header>

      {/* Tarjetas de Métricas en Tiempo Real */}
      {latest && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem" }}>
            <span style={{ color: "#6b7280", fontWeight: 600 }}>Temperatura Promedio</span>
            <div style={{ fontSize: "2.2rem", fontWeight: 700, color: "#ea580c" }}>{latest.tempAvg} °C</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem" }}>
            <span style={{ color: "#6b7280", fontWeight: 600 }}>Humedad Relativa</span>
            <div style={{ fontSize: "2.2rem", fontWeight: 700, color: "#0284c7" }}>{latest.humAvg} %</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem" }}>
            <span style={{ color: "#6b7280", fontWeight: 600 }}>Ocupación</span>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: latest.occupied ? "#16a34a" : "#6b7280" }}>
              {latest.occupied ? "Ocupada" : "Despejada"}
            </div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem" }}>
            <span style={{ color: "#6b7280", fontWeight: 600 }}>Eventos PIR</span>
            <div style={{ fontSize: "2.2rem", fontWeight: 700, color: "#7c3aed" }}>{latest.motionEvents ?? 0}</div>
          </div>
        </div>
      )}

      {/* Selector de Rango de Fechas para Históricos */}
      <section style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.25rem", marginBottom: "2rem" }}>
        <h3 style={{ margin: "0 0 0.8rem 0", fontSize: "1rem" }}>Consulta de Históricos por Rango de Fechas</h3>
        <form onSubmit={handleQueryByDateRange} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginBottom: "0.2rem" }}>Desde:</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#64748b", marginBottom: "0.2rem" }}>Hasta:</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <button type="submit" disabled={loadingHistory} style={{ background: "#0f172a", color: "white", padding: "0.5rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer" }}>
              {loadingHistory ? "Consultando..." : "Consultar Histórico"}
            </button>
          </div>
        </form>
      </section>

      {/* Tabla de Histórico / Resultados */}
      <section style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem 0" }}>Registros Mostrados ({readings.length})</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#4b5563" }}>
                <th style={{ padding: "0.6rem" }}>Fecha y Hora</th>
                <th style={{ padding: "0.6rem" }}>Temp Media</th>
                <th style={{ padding: "0.6rem" }}>Humedad Media</th>
                <th style={{ padding: "0.6rem" }}>Presencia</th>
                <th style={{ padding: "0.6rem" }}>Eventos PIR</th>
                <th style={{ padding: "0.6rem" }}>Alertas</th>
                <th style={{ padding: "0.6rem" }}>Muestras</th>
              </tr>
            </thead>
            <tbody>
              {readings.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "1rem", textAlign: "center", color: "#6b7280" }}>No hay registros para este período.</td></tr>
              ) : (
                readings.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.6rem", fontWeight: 500 }}>
                      {r.ts?.seconds ? new Date(r.ts.seconds * 1000).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ padding: "0.6rem", fontWeight: 600, color: "#ea580c" }}>{r.tempAvg} °C</td>
                    <td style={{ padding: "0.6rem", fontWeight: 600, color: "#0284c7" }}>{r.humAvg} %</td>
                    <td style={{ padding: "0.6rem" }}>
                      <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, background: r.occupied ? "#dcfce7" : "#f3f4f6", color: r.occupied ? "#15803d" : "#4b5563" }}>
                        {r.occupied ? "Ocupada" : "Despejada"}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem" }}>{r.motionEvents ?? 0}</td>
                    <td style={{ padding: "0.6rem", color: "#dc2626" }}>{r.alerts?.join(', ') || 'Ninguna'}</td>
                    <td style={{ padding: "0.6rem", color: "#6b7280" }}>{r.samples}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Gestión de Dispositivos y Configuración */}
      {deviceInfo && deviceInfo.config && (
        <section style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem" }}>
          <h3 style={{ margin: "0 0 0.8rem 0" }}>Gestión y Configuración del Dispositivo</h3>
          <p>Intervalo de muestreo actual: <strong>{deviceInfo.config.sampleIntervalSec}s</strong> | Versión de config: v{deviceInfo.config.version}</p>
          
          {userRole === 'admin' ? (
            <button 
              onClick={handleUpdateConfig}
              style={{ background: "#2563eb", color: "white", padding: "0.5rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer", marginTop: "1rem" }}
            >
              Modificar Parámetros de Dispositivo (Admin)
            </button>
          ) : (
            <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.5rem" }}>Modo consulta: Los permisos de administración están restringidos para tu usuario.</p>
          )}
        </section>
      )}
    </main>
  );
}