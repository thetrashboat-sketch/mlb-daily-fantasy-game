function StatBox({ stats }) {
  return (
    <div className="stat-box">
      {stats.map((s) => (
        <div className="stat-cell" key={s.label}>
          <div className="stat-value">{s.value}</div>
          <div className="stat-key">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

export default StatBox