import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getLogbook } from "../api";

const RANGES = [
  { key: "harian", label: "Hari Ini" },
  { key: "mingguan", label: "Minggu Ini" },
  { key: "bulanan", label: "Bulanan" },
];

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const STATUS_ORDER = ["Proses", "Selesai", "Batal"];

const STATUS_COLORS = {
  Proses: "#7093f3",
  Selesai: "#85f7ab",
  Batal: "#fc7878",
};

const STATUS_TEXT_COLORS = {
  Proses: "#2a3fb0",
  Selesai: "#157347",
  Batal: "#5b5f70",
};

function toDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRangeDates(range, monthRef) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (range === "harian") {
    return [today];
  }

  if (range === "mingguan") {
    const day = today.getDay() === 0 ? 7 : today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }

  const { year, month } = monthRef;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Urutkan berdasarkan input terbaru: created_at (kalau ada) dulu,
// fallback ke tanggal kejadian + id sebagai penentu terakhir.
function sortByTerbaru(a, b) {
  if (a.created_at && b.created_at) {
    const diff = new Date(b.created_at) - new Date(a.created_at);
    if (diff !== 0) return diff;
  }
  const tanggalDiff =
    new Date(b.tanggal?.slice(0, 10)) - new Date(a.tanggal?.slice(0, 10));
  if (tanggalDiff !== 0) return tanggalDiff;
  return (b.id || 0) - (a.id || 0);
}

// Deteksi lebar layar saat ini supaya ukuran grafik (tinggi ResponsiveContainer,
// interval label sumbu-X, dsb) bisa ikut menyesuaikan tanpa perlu reload.
function useViewportWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );

  useEffect(() => {
    let raf = null;
    const onResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setWidth(window.innerWidth);
        raf = null;
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return width;
}

export default function RecentActivity({ refreshTrigger, onSeeAll }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("mingguan");

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const viewportWidth = useViewportWidth();
  const isMobile = viewportWidth <= 640;
  const isTablet = viewportWidth > 640 && viewportWidth <= 1024;

  useEffect(() => {
    load();
  }, [refreshTrigger]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getLogbook();
      setRows(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const rangeDates = useMemo(
    () => getRangeDates(range, { year: selectedYear, month: selectedMonth }),
    [range, selectedYear, selectedMonth],
  );
  const rangeDateStrs = useMemo(
    () => new Set(rangeDates.map(toDateStr)),
    [rangeDates],
  );

  const rowsInRange = useMemo(
    () => rows.filter((r) => rangeDateStrs.has(r.tanggal?.slice(0, 10))),
    [rows, rangeDateStrs],
  );

  const chartData = useMemo(() => {
    return rangeDates.map((d) => {
      const dateStr = toDateStr(d);
      const count = rows.filter(
        (r) => r.tanggal?.slice(0, 10) === dateStr,
      ).length;

      let label;
      if (range === "harian") {
        label = "Hari Ini";
      } else if (range === "mingguan") {
        label = DAY_LABELS[d.getDay()];
      } else {
        label = String(d.getDate());
      }

      return { label, count, dateStr };
    });
  }, [rows, rangeDates, range]);

  const statusData = useMemo(() => {
    const counts = { Proses: 0, Selesai: 0, Batal: 0 };
    rowsInRange.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return STATUS_ORDER.map((name) => ({ name, value: counts[name] }));
  }, [rowsInRange]);

  const totalDalamRange = rowsInRange.length;

  const rangeLabel =
    range === "harian"
      ? "hari ini"
      : range === "mingguan"
        ? "minggu ini"
        : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  const yearOptions = useMemo(() => {
    const current = today.getFullYear();
    return [current, current - 1, current - 2];
  }, []);

  // Aktivitas Terbaru sekarang ikut rentang yang sama dengan grafik,
  // diurutkan dari input paling baru, maksimal 6 ditampilkan.
  const recentRows = useMemo(
    () => [...rowsInRange].sort(sortByTerbaru).slice(0, 6),
    [rowsInRange],
  );

  // Di layar sempit, jarak antar tick sumbu-X untuk mode "bulanan" diperlebar
  // supaya label tanggal tidak saling tumpuk.
  const monthlyTickInterval = isMobile ? 5 : isTablet ? 3 : 1;
  const barChartHeight = isMobile ? 170 : 200;
  const donutChartHeight = isMobile ? 200 : 220;
  const donutOuterRadius = isMobile ? 60 : 72;
  const donutInnerRadius = isMobile ? 40 : 48;

  return (
    <div className="card">
      <div className="card-header">
        <h2>Grafik Aktivitas</h2>
        <div className="range-toggle">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`range-btn ${range === r.key ? "active" : ""}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {range === "bulanan" && (
        <div className="month-picker">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-block">
          <div className="chart-summary">
            <span className="chart-total">{totalDalamRange}</span>
            <span className="muted">Helpdesk {rangeLabel}</span>
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={barChartHeight}>
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#d5dae8" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontWeight: 600, fill: "#6b7180" }}
                  axisLine={{ stroke: "#14151f", strokeWidth: 2 }}
                  tickLine={false}
                  interval={range === "bulanan" ? monthlyTickInterval : 0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#6b7180" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: "#eaefff" }}
                  contentStyle={{
                    border: "2px solid #14151f",
                    borderRadius: 6,
                    boxShadow: "3px 3px 0 #14151f",
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value} tiket`, ""]}
                />
                <Bar
                  dataKey="count"
                  fill="#3556f0"
                  stroke="#14151f"
                  strokeWidth={2}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-block">
          <div className="chart-summary">
            <span className="chart-total">{totalDalamRange}</span>
            <span className="muted">distribusi status {rangeLabel}</span>
          </div>

          <div className="chart-wrap donut-wrap">
            {totalDalamRange === 0 ? (
              <p
                className="muted"
                style={{ padding: "60px 0", textAlign: "center" }}
              >
                Belum ada data untuk periode ini.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={donutChartHeight}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={donutInnerRadius}
                    outerRadius={donutOuterRadius}
                    paddingAngle={3}
                    stroke="#14151f"
                    strokeWidth={2}
                    label={({ value }) => {
                      const percent =
                        totalDalamRange > 0
                          ? Math.round((value / totalDalamRange) * 100)
                          : 0;
                      return `${percent}%`;
                    }}
                    labelLine={false}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      border: "2px solid #14151f",
                      borderRadius: 6,
                      boxShadow: "3px 3px 0 #14151f",
                      fontSize: 12,
                    }}
                    formatter={(value, name) => [`${value} tiket`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => {
                      const item = statusData.find((s) => s.name === value);
                      return (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: STATUS_TEXT_COLORS[value],
                          }}
                        >
                          {value} ({item ? item.value : 0})
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="card-header" style={{ marginTop: 22 }}>
        <h2>Aktivitas Terbaru</h2>
        <button className="btn-link" onClick={onSeeAll}>
          Lihat semua →
        </button>
      </div>
      <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>
        Menampilkan input terbaru {rangeLabel}
      </p>

      {loading && <p className="muted">Memuat...</p>}
      {!loading && recentRows.length === 0 && (
        <p className="muted">Belum ada data logbook untuk periode ini.</p>
      )}

      <ul className="activity-list">
        {recentRows.map((r) => (
          <li key={r.id} className="activity-item">
            <span className={`badge badge-${r.status.toLowerCase()}`}>
              {r.status}
            </span>
            <div className="activity-body">
              <div className="activity-title">{r.isi_helpdesk}</div>
              <div className="activity-meta">
                {r.tanggal?.slice(0, 10)} · {r.nama_pic} · {r.nama_it} ·{" "}
                {r.kategori}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
