import { useState, useEffect, useMemo, useId } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Legend,
} from "recharts";

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

// ---------------------------------------------------------------------
// THEME-AWARE CHART TOKENS
// Recharts butuh warna/angka konkret di props-nya (bukan className),
// jadi di sini kita "curi" nilai dari CSS variable yang sudah didefinisikan
// di style.css tiap tema (--chart-*). Dengan begini, chart otomatis ikut
// tampilan neo-brutalism (hard shadow, border tebal, warna solid) atau
// glassmorphism (blur shadow, border tipis, warna translucent) tanpa
// perlu hardcode hex di komponen ini. Kalau variabel belum didefinisikan
// di CSS, dipakai fallback neo-brutalism supaya tetap aman.
// ---------------------------------------------------------------------
function readCssVar(name, fallback) {
  if (typeof window === "undefined") return fallback;
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return val || fallback;
}

function readChartTheme() {
  return {
    grid: readCssVar("--chart-grid", "#d5dae8"),
    tick: readCssVar("--chart-tick", "#6b7180"),
    barFill: readCssVar("--chart-bar-fill", "#3556f0"),
    barRadius: parseFloat(readCssVar("--chart-bar-radius", "6")) || 6,
    pieStroke: readCssVar("--chart-pie-stroke", "#14151f"),
    pieStrokeWidth:
      parseFloat(readCssVar("--chart-pie-stroke-width", "2")) || 0,
    statusColors: {
      Proses: readCssVar("--chart-proses", "#f59e0b"),
      Selesai: readCssVar("--chart-selesai", "#0d9488"),
      Batal: readCssVar("--chart-batal", "#e11d48"),
    },
  };
}

// ThemeSwitcher.jsx mengganti tema dengan dua langkah:
// 1) set atribut data-app-theme di <html> (sinkron, instan)
// 2) ganti href pada <link id="app-theme-stylesheet"> ke file CSS tema lain
//    (ASYNC — browser baru benar-benar menerapkan variabel --chart-* yang
//    baru setelah file CSS itu selesai di-fetch & di-parse)
//
// Kalau kita cuma dengarkan perubahan atribut lalu langsung baca CSS
// variable, nilainya masih nilai tema LAMA karena stylesheet baru belum
// selesai dimuat. Makanya di sini kita dengarkan event "load" dari
// <link> stylesheet itu sendiri, plus fallback observer kalau elemen
// <link>-nya baru dibuat setelah komponen ini mount duluan.
export function useChartTheme() {
  const [theme, setTheme] = useState(readChartTheme);

  useEffect(() => {
    const refresh = () => setTheme(readChartTheme());
    refresh();

    const attrObserver = new MutationObserver(refresh);
    attrObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-app-theme", "class", "data-theme", "style"],
    });

    let linkEl = null;
    const attachLinkListener = () => {
      const el = document.getElementById("app-theme-stylesheet");
      if (el && el !== linkEl) {
        linkEl = el;
        linkEl.addEventListener("load", refresh);
      }
    };
    attachLinkListener();

    const headObserver = new MutationObserver(attachLinkListener);
    headObserver.observe(document.head, { childList: true });

    return () => {
      attrObserver.disconnect();
      headObserver.disconnect();
      if (linkEl) linkEl.removeEventListener("load", refresh);
    };
  }, []);

  return theme;
}

// ---------------------------------------------------------------------
// CHART TOOLTIP & LEGEND — gaya "shadcn chart": kartu kecil rounded,
// dot warna per item, label tebal, nilai rata kanan. Warna kartu/border
// diambil dari class CSS (.chart-tooltip dkk), bukan inline style, jadi
// otomatis ikut tema lewat --chart-tooltip-* di style.css.
// ---------------------------------------------------------------------
export function ChartTooltipCard({ active, payload, label, valueSuffix = "" }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      {label && <div className="chart-tooltip-label">{label}</div>}
      <div className="chart-tooltip-body">
        {payload.map((item, idx) => (
          <div
            key={item.dataKey || item.name || idx}
            className="chart-tooltip-row"
          >
            <span
              className="chart-tooltip-dot"
              style={{
                background: item.color || item.fill || item.payload?.fill,
              }}
            />
            <span className="chart-tooltip-name">{item.name}</span>
            <span className="chart-tooltip-value">
              {item.value}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartLegendList({ data, colors }) {
  return (
    <div className="chart-legend">
      {data.map((item) => (
        <div key={item.name} className="chart-legend-item">
          <span
            className="chart-legend-dot"
            style={{ background: colors[item.name] }}
          />
          <span className="chart-legend-label">{item.name}</span>
          <span className="chart-legend-count">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function RecentActivity({
  rows,
  loading,
  onSeeAll,
  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear,
}) {
  const [range, setRange] = useState("mingguan");
  const [selectedDate, setSelectedDate] = useState(null);
  const [hoverBarIndex, setHoverBarIndex] = useState(null);
  const [pieHover, setPieHover] = useState(false);

  const viewportWidth = useViewportWidth();
  const isMobile = viewportWidth <= 640;
  const isTablet = viewportWidth > 640 && viewportWidth <= 1024;

  const chartTheme = useChartTheme();
  const gradientId = useId().replace(/:/g, "");

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
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2];
  }, []);

  const recentRows = useMemo(
    () => [...rowsInRange].sort(sortByTerbaru).slice(0, 6),
    [rowsInRange],
  );

  const selectedDateRows = useMemo(() => {
    if (!selectedDate) return [];
    return rows
      .filter((r) => r.tanggal?.slice(0, 10) === selectedDate)
      .sort(sortByTerbaru);
  }, [rows, selectedDate]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "";
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate]);

  // Di layar sempit, jarak antar tick sumbu-X untuk mode "bulanan" diperlebar
  // supaya label tanggal tidak saling tumpuk.
  const monthlyTickInterval = isMobile ? 5 : isTablet ? 3 : 1;
  const barChartHeight = isMobile ? 170 : 200;
  const donutChartHeight = isMobile ? 200 : 220;
  const donutOuterRadius = isMobile ? 60 : 76;
  const donutInnerRadius = isMobile ? 42 : 54;

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
                onMouseLeave={() => setHoverBarIndex(null)}
              >
                <defs>
                  <linearGradient
                    id={`barGradient-${gradientId}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={chartTheme.barFill}
                      stopOpacity={1}
                    />
                    <stop
                      offset="100%"
                      stopColor={chartTheme.barFill}
                      stopOpacity={0.55}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke={chartTheme.grid}
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 12,
                    fontWeight: 600,
                    fill: chartTheme.tick,
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval={range === "bulanan" ? monthlyTickInterval : 0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: chartTheme.tick }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: "var(--chart-cursor)" }}
                  content={<ChartTooltipCard valueSuffix=" tiket" />}
                />
                <Bar
                  dataKey="count"
                  name="Tiket"
                  radius={[chartTheme.barRadius, chartTheme.barRadius, 0, 0]}
                  maxBarSize={36}
                  cursor="pointer"
                  onMouseEnter={(_, idx) => setHoverBarIndex(idx)}
                  onClick={(data) => {
                    if (data?.count > 0) setSelectedDate(data.dateStr);
                  }}
                >
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={entry.dateStr}
                      fill={`url(#barGradient-${gradientId})`}
                      fillOpacity={
                        hoverBarIndex === null || hoverBarIndex === idx
                          ? 1
                          : 0.45
                      }
                    />
                  ))}
                </Bar>
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
              <>
                <ResponsiveContainer width="100%" height={donutChartHeight}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={donutInnerRadius}
                      outerRadius={donutOuterRadius}
                      paddingAngle={2}
                      stroke={chartTheme.pieStroke}
                      strokeWidth={chartTheme.pieStrokeWidth}
                      cornerRadius={4}
                      onMouseEnter={() => setPieHover(true)}
                      onMouseLeave={() => setPieHover(false)}
                    >
                      {statusData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={chartTheme.statusColors[entry.name]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltipCard valueSuffix=" tiket" />}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      content={
                        <ChartLegendList
                          data={statusData}
                          colors={chartTheme.statusColors}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  className="chart-donut-center"
                  style={{
                    opacity: pieHover ? 0 : 1,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  <div className="chart-donut-total">{totalDalamRange}</div>
                  <div className="chart-donut-total-label">Total Tiket</div>
                </div>
              </>
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
      {selectedDate && (
        <div className="modal-backdrop" onClick={() => setSelectedDate(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedDateLabel}</h2>
              <button
                className="modal-close"
                onClick={() => setSelectedDate(null)}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <p className="muted" style={{ marginTop: -4, marginBottom: 14 }}>
              {selectedDateRows.length} tiket helpdesk
            </p>

            {selectedDateRows.length === 0 ? (
              <p className="muted">Tidak ada data logbook pada tanggal ini.</p>
            ) : (
              <ul className="activity-list">
                {selectedDateRows.map((r) => {
                  // Hitung estimasi durasi kalau jam_mulai & jam_selesai lengkap dan valid
                  let durasiText = null;
                  if (r.jam_mulai && r.jam_selesai) {
                    const [h1, m1] = r.jam_mulai
                      .slice(0, 5)
                      .split(":")
                      .map(Number);
                    const [h2, m2] = r.jam_selesai
                      .slice(0, 5)
                      .split(":")
                      .map(Number);
                    const totalMin = h2 * 60 + m2 - (h1 * 60 + m1);
                    if (totalMin > 0) durasiText = `${totalMin} menit`;
                  }

                  return (
                    <li key={r.id} className="activity-item">
                      <span className={`badge badge-${r.status.toLowerCase()}`}>
                        {r.status}
                      </span>
                      <div className="activity-body">
                        <div className="activity-title">{r.isi_helpdesk}</div>
                        <div className="activity-meta">
                          {r.jam_mulai || "-"}
                          {r.jam_selesai ? ` – ${r.jam_selesai}` : ""}
                          {durasiText ? ` (${durasiText})` : ""} · {r.nama_pic}{" "}
                          · {r.nama_it} · {r.kategori}
                        </div>
                        {r.tindakan && (
                          <div
                            className="activity-meta"
                            style={{ marginTop: 4 }}
                          >
                            Tindakan: {r.tindakan}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
