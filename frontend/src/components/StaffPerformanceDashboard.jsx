import { useState, useEffect, useMemo } from "react";
import { getLogbook, getStaffIt } from "../api";

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

// Hitung tanggal 1 s/d akhir bulan dari bulan+tahun yang dipilih,
// pakai komponen lokal (bukan toISOString) supaya tidak geser hari.
const getMonthRange = (year, monthIndex) => {
  const pad = (n) => String(n).padStart(2, "0");
  const start = `${year}-${pad(monthIndex + 1)}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const end = `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`;
  return { start, end };
};

// Format total menit jadi "X jam Y mnt" biar gampang dibaca, misal 125 -> "2 jam 5 mnt"
const formatMenit = (menit) => {
  const total = Math.round(menit || 0);
  if (total <= 0) return "0 mnt";
  const jam = Math.floor(total / 60);
  const sisaMenit = total % 60;
  if (jam === 0) return `${sisaMenit} mnt`;
  if (sisaMenit === 0) return `${jam} jam`;
  return `${jam} jam ${sisaMenit} mnt`;
};

// Satu tiket bisa dikerjakan lebih dari 1 staff (nama_it dipisah koma di form multiselect),
// jadi setiap nama dipecah lalu dihitung masing-masing.
const splitNamaIt = (namaIt) => {
  const names = (namaIt || "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  return names.length > 0 ? names : ["(Tanpa Nama)"];
};

export default function StaffPerformanceDashboard() {
  const [data, setData] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const today = new Date();
  const [filterMonth, setFilterMonth] = useState(today.getMonth());
  const [filterYear, setFilterYear] = useState(today.getFullYear());
  const [filterActive, setFilterActive] = useState(false);
  const [chartMetric, setChartMetric] = useState("jumlah"); // "jumlah" | "rata"

  const yearOptions = (() => {
    const current = today.getFullYear();
    return [current, current - 1, current - 2, current - 3];
  })();

  useEffect(() => {
    loadData();
    loadStaffList();
  }, []);

  const loadStaffList = async () => {
    try {
      // ambil termasuk yang nonaktif, supaya bisa ditandai di tabel
      const res = await getStaffIt(true);
      setStaffList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async (params = {}) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await getLogbook(params);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memuat data logbook.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterBulan = (e) => {
    e.preventDefault();
    const { start, end } = getMonthRange(filterYear, filterMonth);
    setFilterActive(true);
    loadData({ start, end });
  };

  const handleTampilkanSemua = () => {
    setFilterActive(false);
    loadData({});
  };

  // Agregasi data logbook per nama staff IT, digabung dengan master data staff
  // supaya staff yang belum pernah dapat tiket tetap muncul (jumlah 0).
  const staffStats = useMemo(() => {
    const map = new Map();

    staffList.forEach((st) => {
      const key = (st.nama || "").trim().toLowerCase();
      if (!key) return;
      map.set(key, {
        nama: st.nama,
        aktif: !!st.aktif,
        jumlah: 0,
        totalMenit: 0,
        selesai: 0,
        proses: 0,
        batal: 0,
      });
    });

    data.forEach((row) => {
      const names = splitNamaIt(row.nama_it);
      const status = (row.status || "").toLowerCase();

      names.forEach((namaRaw) => {
        const key = namaRaw.trim().toLowerCase();
        if (!map.has(key)) {
          // nama muncul di logbook tapi tidak ada di master staff_it
          // (data lama / staff sudah dihapus permanen)
          map.set(key, {
            nama: namaRaw,
            aktif: null,
            jumlah: 0,
            totalMenit: 0,
            selesai: 0,
            proses: 0,
            batal: 0,
          });
        }
        const s = map.get(key);
        s.jumlah += 1;
        s.totalMenit += row.total_menit || 0;
        if (status === "selesai") s.selesai += 1;
        else if (status === "proses") s.proses += 1;
        else if (status === "batal") s.batal += 1;
      });
    });

    const arr = Array.from(map.values()).map((s) => ({
      ...s,
      rataRata: s.jumlah > 0 ? s.totalMenit / s.jumlah : 0,
    }));

    // Ranking: paling banyak menangani helpdesk di posisi teratas
    arr.sort((a, b) => b.jumlah - a.jumlah);
    return arr;
  }, [data, staffList]);

  const maxJumlah = Math.max(1, ...staffStats.map((s) => s.jumlah));
  const maxRata = Math.max(1, ...staffStats.map((s) => s.rataRata));

  const totalHelpdesk = data.length;
  const totalStaffAktif = staffStats.filter((s) => s.aktif !== false).length;
  const totalMenitAll = staffStats.reduce((sum, s) => sum + s.totalMenit, 0);
  const rataRataAll = totalHelpdesk > 0 ? totalMenitAll / totalHelpdesk : 0;
  const topStaff = staffStats.find((s) => s.jumlah > 0);

  const periodeLabel = filterActive
    ? `${MONTH_NAMES[filterMonth]} ${filterYear}`
    : "Semua Periode";

  return (
    <div className="page-content spd">
      {/* ============ FILTER ============ */}
      <div className="spd-card spd-filter-card">
        <form className="spd-filter-bar" onSubmit={handleFilterBulan}>
          <div className="spd-filter-field">
            <label>Bulan</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="spd-filter-field">
            <label>Tahun</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="spd-filter-actions">
            <button type="submit">Terapkan</button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTampilkanSemua}
            >
              Semua Periode
            </button>
          </div>
        </form>
      </div>

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
      {loading && <p className="muted">Memuat data...</p>}

      {!loading && !errorMsg && (
        <>
          {/* ============ RINGKASAN ============ */}
          <div className="spd-summary-row">
            <div className="spd-summary-item">
              <span className="spd-summary-value">{totalHelpdesk}</span>
              <span className="spd-summary-label">Total Tiket</span>
            </div>
            <div className="spd-summary-divider" />
            <div className="spd-summary-item">
              <span className="spd-summary-value">{totalStaffAktif}</span>
              <span className="spd-summary-label">Staff Aktif</span>
            </div>
            <div className="spd-summary-divider" />
            <div className="spd-summary-item">
              <span className="spd-summary-value">
                {formatMenit(rataRataAll)}
              </span>
              <span className="spd-summary-label">Rata-rata Durasi</span>
            </div>
            <div className="spd-summary-divider" />
            <div className="spd-summary-item">
              <span className="spd-summary-value spd-summary-value-name">
                {topStaff ? topStaff.nama : "-"}
              </span>
              <span className="spd-summary-label">
                Teratas &middot; {periodeLabel}
              </span>
            </div>
          </div>

          {/* ============ GRAFIK ============ */}
          <div className="spd-card">
            <div className="spd-card-head">
              <h2>Performa Staff IT</h2>
              <div className="spd-toggle">
                <button
                  type="button"
                  className={chartMetric === "jumlah" ? "active" : ""}
                  onClick={() => setChartMetric("jumlah")}
                >
                  Jumlah
                </button>
                <button
                  type="button"
                  className={chartMetric === "rata" ? "active" : ""}
                  onClick={() => setChartMetric("rata")}
                >
                  Rata-rata
                </button>
              </div>
            </div>

            {staffStats.length === 0 ? (
              <p className="spd-empty">Belum ada data untuk periode ini.</p>
            ) : (
              <div className="spd-chart-list">
                {staffStats.map((s, idx) => {
                  const value =
                    chartMetric === "jumlah" ? s.jumlah : s.rataRata;
                  const max = chartMetric === "jumlah" ? maxJumlah : maxRata;
                  const pct = Math.max(2, Math.round((value / max) * 100));
                  return (
                    <div className="spd-chart-row" key={s.nama}>
                      <div className="spd-chart-label" title={s.nama}>
                        <span
                          className={`spd-chart-dot ${
                            idx < 3 ? `is-top-${idx + 1}` : ""
                          }`}
                        />
                        {s.nama}
                        {s.aktif === false && (
                          <span className="spd-tag-inactive">nonaktif</span>
                        )}
                      </div>
                      <div className="spd-chart-track">
                        <div
                          className="spd-chart-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="spd-chart-value">
                        {chartMetric === "jumlah"
                          ? `${s.jumlah} tiket`
                          : formatMenit(s.rataRata)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ============ TABEL RANKING ============ */}
          <div className="spd-card">
            <div className="spd-card-head">
              <h2>Ranking Staff IT</h2>
            </div>

            {staffStats.length === 0 ? (
              <p className="spd-empty">Belum ada data untuk periode ini.</p>
            ) : (
              <div className="spd-table-wrap">
                <table className="spd-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nama IT</th>
                      <th>Tiket</th>
                      <th>Total Durasi</th>
                      <th>Rata-rata</th>
                      <th>Selesai</th>
                      <th>Proses</th>
                      <th>Batal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffStats.map((s, idx) => (
                      <tr key={s.nama}>
                        <td data-label="Peringkat">
                          <span
                            className={`spd-rank ${
                              idx === 0
                                ? "rank-1"
                                : idx === 1
                                  ? "rank-2"
                                  : idx === 2
                                    ? "rank-3"
                                    : ""
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td data-label="Nama IT" className="spd-name-cell">
                          {s.nama}
                          {s.aktif === false && (
                            <span className="spd-tag-inactive">Nonaktif</span>
                          )}
                        </td>
                        <td data-label="Tiket">{s.jumlah}</td>
                        <td data-label="Total Durasi">
                          {formatMenit(s.totalMenit)}
                        </td>
                        <td data-label="Rata-rata">
                          {formatMenit(s.rataRata)}
                        </td>
                        <td data-label="Selesai">
                          <span className="spd-badge spd-badge-selesai">
                            {s.selesai}
                          </span>
                        </td>
                        <td data-label="Proses">
                          <span className="spd-badge spd-badge-proses">
                            {s.proses}
                          </span>
                        </td>
                        <td data-label="Batal">
                          <span className="spd-badge spd-badge-batal">
                            {s.batal}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
