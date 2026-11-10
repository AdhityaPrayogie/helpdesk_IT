// frontend/src/pages/TrendHelpdeskPage.jsx
import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getLogbook } from "../api";
import Combobox from "../components/Combobox";
import { useChartTheme, ChartTooltipCard } from "../components/RecentActivity";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const BULAN_OPTIONS = [
  { id: -1, nama: "Semua Bulan" },
  ...BULAN.map((nama, id) => ({ id, nama })),
];

const pad = (n) => String(n).padStart(2, "0");

// month -1 = setahun penuh, selain itu 1 bulan (tanggal lokal, bukan toISOString).
export function getRange(year, month) {
  if (month < 0) return { start: `${year}-01-01`, end: `${year}-12-31` };
  const lastDay = new Date(year, month + 1, 0).getDate();
  return { start: `${year}-${pad(month + 1)}-01`, end: `${year}-${pad(month + 1)}-${pad(lastDay)}` };
}

// Setahun: per bulan. Satu bulan: per hari. Tanggal "YYYY-MM-DD" (pool pakai dateStrings: true).
export function trendSeries(rows, year, month) {
  const perBulan = month < 0;
  const n = perBulan ? 12 : new Date(year, month + 1, 0).getDate();
  const out = Array.from({ length: n }, (_, i) => ({
    label: perBulan ? BULAN[i] : String(i + 1),
    tiket: 0,
    menit: 0,
    selesai: 0,
  }));
  rows.forEach((r) => {
    const m = Number(perBulan ? r.tanggal?.slice(5, 7) : r.tanggal?.slice(8, 10)) - 1;
    if (!out[m]) return;
    out[m].tiket += 1;
    out[m].menit += r.total_menit || 0;
    if ((r.status || "").toLowerCase() === "selesai") out[m].selesai += 1;
  });
  return out;
}

// Hitung frekuensi per field (unit kerja / kategori), urut terbanyak, ambil top N.
export function topBy(rows, field, n = 10) {
  const map = new Map();
  rows.forEach((r) => {
    const key = r[field] || "(Kosong)";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map]
    .map(([nama, tiket]) => ({ nama, tiket }))
    .sort((a, b) => b.tiket - a.tiket)
    .slice(0, n);
}

function TopChart({ title, data, theme }) {
  return (
    <div className="spd-card">
      <div className="spd-card-head">
        <h2>{title}</h2>
      </div>
      {data.length === 0 ? (
        <p className="spd-empty">Belum ada data untuk periode ini.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={theme.grid} strokeDasharray="3 5" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: theme.tick }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="nama" width={140} tick={{ fontSize: 12, fill: theme.tick }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "var(--chart-cursor)" }} content={<ChartTooltipCard valueSuffix=" tiket" />} />
            <Bar dataKey="tiket" name="Tiket" fill={theme.barFill} radius={[0, theme.barRadius, theme.barRadius, 0]} maxBarSize={22} background={{ fill: "var(--surface-1)", radius: theme.barRadius }} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function TrendHelpdeskPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(-1);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const theme = useChartTheme();

  const yearOptions = [0, 1, 2, 3].map((i) => ({ id: thisYear - i, nama: String(thisYear - i) }));

  useEffect(() => {
    setLoading(true);
    setErrorMsg("");
    getLogbook(getRange(year, month))
      .then((res) => setRows(res.data))
      .catch(() => setErrorMsg("Gagal memuat data logbook."))
      .finally(() => setLoading(false));
  }, [year, month]);

  const data = useMemo(() => trendSeries(rows, year, month), [rows, year, month]);
  const periode = month < 0 ? year : `${BULAN[month]} ${year}`;
  const satuan = month < 0 ? "Bulan" : "Tanggal";
  const topUnit = useMemo(() => topBy(rows, "it_unit_kerja"), [rows]);
  const topKategori = useMemo(() => topBy(rows, "kategori"), [rows]);

  return (
    <>
      <header className="topbar">
        <h1>Trend Helpdesk</h1>
      </header>
      <main className="page-content spd">
        <div className="spd-card spd-filter-card">
          <div className="spd-filter-bar">
            <div className="spd-filter-field">
              <label htmlFor="trend-bulan">Bulan</label>
              <Combobox
                id="trend-bulan"
                searchable={false}
                clearable={false}
                options={BULAN_OPTIONS}
                value={month}
                onChange={setMonth}
              />
            </div>
            <div className="spd-filter-field">
              <label htmlFor="trend-tahun">Tahun</label>
              <Combobox
                id="trend-tahun"
                searchable={false}
                clearable={false}
                options={yearOptions}
                value={year}
                onChange={setYear}
              />
            </div>
          </div>
        </div>

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
        {loading && <p className="muted">Memuat data...</p>}

        {!loading && !errorMsg && (
          <div className="trend-grid">
            <div className="spd-card trend-wide">
              <div className="spd-card-head">
                <h2>Jumlah Tiket &amp; Total Menit per {satuan} · {periode}</h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                {/* Dua sumbu Y: menit bisa ribuan, tiket puluhan — kalau satu sumbu garis tiket jadi datar. */}
                <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    {[["tiket", theme.barFill], ["menit", theme.statusColors.Proses]].map(([k, c]) => (
                      <linearGradient key={k} id={`trend-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={c} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 5" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: theme.tick }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="tiket" allowDecimals={false} tick={{ fontSize: 12, fill: theme.barFill }} axisLine={false} tickLine={false} width={40} />
                  <YAxis yAxisId="menit" orientation="right" allowDecimals={false} tick={{ fontSize: 12, fill: theme.statusColors.Proses }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip cursor={{ stroke: theme.tick, strokeDasharray: "4 4" }} content={<ChartTooltipCard />} />
                  <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area yAxisId="tiket" type="monotone" dataKey="tiket" name="Tiket" stroke={theme.barFill} strokeWidth={2} fill="url(#trend-tiket)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card-bg)" }} />
                  <Area yAxisId="menit" type="monotone" dataKey="menit" name="Total Menit" stroke={theme.statusColors.Proses} strokeWidth={2} fill="url(#trend-menit)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card-bg)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <TopChart title={`Unit Kerja Tersering · ${periode}`} data={topUnit} theme={theme} />
            <TopChart title={`Kategori Tersering · ${periode}`} data={topKategori} theme={theme} />

            <div className="spd-card trend-wide">
              <div className="spd-card-head">
                <h2>Data per {satuan}</h2>
              </div>
              <div className="spd-table-wrap">
                <table className="spd-table">
                  <thead>
                    <tr>
                      <th>{satuan}</th>
                      <th>Tiket</th>
                      <th>Selesai</th>
                      <th>Total Menit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((d) => (
                      <tr key={d.label}>
                        <td data-label={satuan}>{d.label}</td>
                        <td data-label="Tiket">{d.tiket}</td>
                        <td data-label="Selesai">{d.selesai}</td>
                        <td data-label="Total Menit">{d.menit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
