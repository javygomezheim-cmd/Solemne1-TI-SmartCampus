type MetricCardProps = {
  title: string;
  value: string | number;
  unit?: string;
  detail: string;
  color: string;
  icon: string;
};

export default function MetricCard({
  title,
  value,
  unit,
  detail,
  color,
  icon,
}: MetricCardProps) {
  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 18,
        padding: 22,
        boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>
          {title}
        </span>

        <span
          style={{
            background: `${color}18`,
            color,
            borderRadius: 12,
            padding: 10,
            fontSize: 20,
          }}
        >
          {icon}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 5,
          marginTop: 18,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 34,
            fontWeight: 750,
            letterSpacing: '-1.5px',
            color: '#0f172a',
          }}
        >
          {value}
        </span>

        {unit && <span style={{ color: '#64748b' }}>{unit}</span>}
      </div>

      <p style={{ color: '#64748b', fontSize: 13, margin: '10px 0 0' }}>
        {detail}
      </p>
    </article>
  );
}
