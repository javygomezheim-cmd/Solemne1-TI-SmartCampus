// web/app/page.tsx

const ORG_ID = "mi-org";
const DEVICE_ID = "Oo2T8PLAS6jet80h8wLo";

// Datos simulados idénticos a los que genera la Raspberry Pi
const MOCK_DEVICE_INFO = {
  name: "Sensor Sala Laboratorio 101",
  revoked: false,
  lastSeen: "25-10-2026, 16:00:15",
  config: {
    sampleIntervalSec: 10,
    tempMax: 26.0,
    humMax: 70.0,
    occupancyWindowMin: 5,
    dhtEnabled: true,
    pirEnabled: true,
    version: 3,
  },
};

const MOCK_READINGS = [
  { id: "1729881600", tsLabel: "15:40:00", tempavg: 21.2, humavg: 48.5, occupied: true, motionevents: 4, comfort: "Confortable", samples: 6, alerts: [] },
  { id: "1729881660", tsLabel: "15:45:00", tempavg: 21.8, humavg: 49.0, occupied: true, motionevents: 7, comfort: "Confortable", samples: 6, alerts: [] },
  { id: "1729881720", tsLabel: "15:50:00", tempavg: 22.4, humavg: 50.2, occupied: true, motionevents: 5, comfort: "Confortable", samples: 6, alerts: [] },
  { id: "1729881780", tsLabel: "15:55:00", tempavg: 24.1, humavg: 53.0, occupied: true, motionevents: 12, comfort: "Aceptable", samples: 6, alerts: [] },
  { id: "1729881840", tsLabel: "16:00:00", tempavg: 26.8, humavg: 55.4, occupied: true, motionevents: 15, comfort: "Caluroso", samples: 6, alerts: ["Umbral de temperatura superado (> 26.0 °C)"] },
];

export default function DashboardPreviewPage() {
  const latest = MOCK_READINGS[MOCK_READINGS.length - 1];

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: "1100px", margin: "0 auto", color: "#1f2937" }}>
      {/* Encabezado */}
      <header style={{ marginBottom: "2rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "1.2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "9999px", marginBottom: "0.5rem" }}>
              MODO VISTA PREVIA (DATOS DE PRUEBA)
            </div>
            <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700 }}>Monitoreo IoT Smart Campus</h1>
            <p style={{ margin: "0.4rem 0 0", color: "#6b7280", fontSize: "0.95rem" }}>
              Organización: <strong>{ORG_ID}</strong> | Dispositivo: <strong>{MOCK_DEVICE_INFO.name}</strong> ({DEVICE_ID})
            </p>
          </div>

          <div style={{ fontSize: "0.9rem", textAlign: "right" }}>
            <div>
              Estado: <span style={{ fontWeight: 600, color: "#16a34a" }}>● En Línea</span>
            </div>
            <div style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "0.2rem" }}>
              Última sincronización: {MOCK_DEVICE_INFO.lastSeen}
            </div>
          </div>
        </div>
      </header>

      {/* Banner de Alerta si se supera el umbral */}
      {latest.alerts && latest.alerts.length > 0 && (
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "1rem", marginBottom: "1.5rem" }}>
          <strong style={{ color: "#991b1b" }}>⚠️ Alertas detectadas en la sala:</strong>
          <ul style={{ margin: "0.4rem 0 0 1.2rem", color: "#b91c1c" }}>
            {latest.alerts.map((alert, idx) => (
              <li key={idx}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tarjetas de Métricas en Vivo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <span style={{ color: "#6b7280", fontSize: "0.85rem", fontWeight: 600 }}>Temperatura Promedio</span>
          <div style={{ fontSize: "2.2rem", fontWeight: 700, color: "#ea580c", margin: "0.4rem 0" }}>
            {latest.tempavg} °C
          </div>
          <small style={{ color: "#9ca3af" }}>Sensor DHT22 (Muestras: {latest.samples})</small>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <span style={{ color: "#6b7280", fontSize: "0.85rem", fontWeight: 600 }}>Humedad Relativa</span>
          <div style={{ fontSize: "2.2rem", fontWeight: 700, color: "#0284c7", margin: "0.4rem 0" }}>
            {latest.humavg} %
          </div>
          <small style={{ color: "#9ca3af" }}>Sensor DHT22</small>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <span style={{ color: "#6b7280", fontSize: "0.85rem", fontWeight: 600 }}>Ocupación de Sala</span>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: latest.occupied ? "#16a34a" : "#6b7280", margin: "0.4rem 0" }}>
            {latest.occupied ? "Ocupada" : "Desocupada"}
          </div>
          <small style={{ color: "#9ca3af" }}>{latest.motionevents} movimientos (Sensor PIR)</small>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <span style={{ color: "#6b7280", fontSize: "0.85rem", fontWeight: 600 }}>Índice de Confort</span>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#7c3aed", margin: "0.4rem 0" }}>
            {latest.comfort}
          </div>
          <small style={{ color: "#9ca3af" }}>Cálculo en microservicio</small>
        </div>
      </div>

      {/* Gráfico representativo con barras CSS (sin dependencias externas) */}
      <section style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1.2rem 0" }}>
          Tendencia de Temperatura Reciente (°C)
        </h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1.5rem", height: "180px", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem" }}>
          {MOCK_READINGS.map((r) => {
            const heightPercent = Math.min(100, Math.max(10, (r.tempavg / 35) * 100));
            return (
              <div key={r.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#ea580c", marginBottom: "0.25rem" }}>
                  {r.tempavg}°
                </span>
                <div
                  style={{
                    width: "100%",
                    maxWidth: "48px",
                    height: `${heightPercent}%`,
                    backgroundColor: r.tempavg > 26 ? "#ef4444" : "#f97316",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.3s ease",
                  }}
                />
                <span style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.5rem" }}>
                  {r.tsLabel}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tabla con el Histórico de Lecturas */}
      <section style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem 0" }}>Histórico de Lotes Procesados</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#4b5563" }}>
                <th style={{ padding: "0.6rem" }}>Hora</th>
                <th style={{ padding: "0.6rem" }}>Temp Media</th>
                <th style={{ padding: "0.6rem" }}>Humedad Media</th>
                <th style={{ padding: "0.6rem" }}>Presencia</th>
                <th style={{ padding: "0.6rem" }}>Eventos PIR</th>
                <th style={{ padding: "0.6rem" }}>Confort</th>
                <th style={{ padding: "0.6rem" }}>Muestras</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_READINGS.slice().reverse().map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.6rem", fontWeight: 500 }}>{r.tsLabel}</td>
                  <td style={{ padding: "0.6rem", fontWeight: 600, color: "#ea580c" }}>{r.tempavg} °C</td>
                  <td style={{ padding: "0.6rem", fontWeight: 600, color: "#0284c7" }}>{r.humavg} %</td>
                  <td style={{ padding: "0.6rem" }}>
                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, background: r.occupied ? "#dcfce7" : "#f3f4f6", color: r.occupied ? "#15803d" : "#4b5563" }}>
                      {r.occupied ? "Ocupada" : "Despejada"}
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem" }}>{r.motionevents}</td>
                  <td style={{ padding: "0.6rem" }}>{r.comfort}</td>
                  <td style={{ padding: "0.6rem", color: "#6b7280" }}>{r.samples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Configuración del dispositivo */}
      <section style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem" }}>
        <h3 style={{ margin: "0 0 0.8rem 0", fontSize: "0.95rem", color: "#374151" }}>Parámetros configurados en la Raspberry Pi</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.8rem", fontSize: "0.85rem", color: "#4b5563" }}>
          <div><strong>Intervalo muestreo:</strong> {MOCK_DEVICE_INFO.config.sampleIntervalSec}s</div>
          <div><strong>Umbral Temp Máx:</strong> {MOCK_DEVICE_INFO.config.tempMax} °C</div>
          <div><strong>Umbral Hum Máx:</strong> {MOCK_DEVICE_INFO.config.humMax} %</div>
          <div><strong>Ventana ocupación:</strong> {MOCK_DEVICE_INFO.config.occupancyWindowMin} min</div>
          <div><strong>Sensor DHT:</strong> {MOCK_DEVICE_INFO.config.dhtEnabled ? "Activo" : "Inactivo"}</div>
          <div><strong>Sensor PIR:</strong> {MOCK_DEVICE_INFO.config.pirEnabled ? "Activo" : "Inactivo"}</div>
          <div><strong>Versión config:</strong> v{MOCK_DEVICE_INFO.config.version}</div>
        </div>
      </section>
    </main>
  );
}