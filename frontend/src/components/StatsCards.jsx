import { useState, useEffect } from "react";
import { getLogbook } from "../api";

const todayStr = () => new Date().toISOString().split("T")[0];

export default function StatsCards({ refreshTrigger }) {
  const [stats, setStats] = useState({
    total: 0,
    proses: 0,
    selesai: 0,
    batal: 0,
    hariIni: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await getLogbook();
      const rows = res.data;
      const today = todayStr();
      setStats({
        total: rows.length,
        proses: rows.filter((r) => r.status === "Proses").length,
        selesai: rows.filter((r) => r.status === "Selesai").length,
        batal: rows.filter((r) => r.status === "Batal").length,
        hariIni: rows.filter((r) => r.tanggal?.slice(0, 10) === today).length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
