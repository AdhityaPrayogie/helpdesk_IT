import { useMemo } from "react";

const todayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function StatsCards({ rows, loading, month, year }) {
  const stats = useMemo(() => {
    const today = todayStr();
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthRows = rows.filter((r) => r.tanggal?.slice(0, 7) === prefix);
    const count = (status) =>
      monthRows.filter((r) => r.status === status).length;
    return {
      total: monthRows.length,
      proses: count("Proses"),
      selesai: count("Selesai"),
      batal: count("Batal"),
      hariIni: rows.filter((r) => r.tanggal?.slice(0, 10) === today).length,
    };
  }, [rows, month, year]);

  const cards = [
    { label: "Total Helpdesk", value: stats.total, tone: "default" },
    { label: "Hari Ini", value: stats.hariIni, tone: "info" },
    { label: "Proses", value: stats.proses, tone: "proses" },
    { label: "Selesai", value: stats.selesai, tone: "success" },
    { label: "Batal", value: stats.batal, tone: "danger" },
  ];

  return (
    <div className="stats-grid">
      {cards.map((c) => (
        <div key={c.label} className={`stat-card tone-${c.tone}`}>
          {loading ? (
            <div className="stat-value is-loading" aria-label="Memuat..." />
          ) : (
            <div className="stat-value">{c.value}</div>
          )}
          <div className="stat-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
