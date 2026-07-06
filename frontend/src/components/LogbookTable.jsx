import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { getLogbook, deleteLogbook, exportCsvUrl, getKategori } from "../api";
import LogbookEditModal from "./LogbookEditModal";
import LogbookHistoryModal from "./LogbookHistoryModal";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./Toast";

// Hitung tanggal 1 s/d akhir bulan dari bulan+tahun yang dipilih,
// pakai komponen lokal (bukan toISOString) supaya tidak geser hari.
const getMonthRange = (year, monthIndex) => {
  const pad = (n) => String(n).padStart(2, "0");
  const start = `${year}-${pad(monthIndex + 1)}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const end = `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`;
  return { start, end };
};

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

export default function LogbookTable({ refreshTrigger, onDataChanged }) {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filter per bulan (dropdown) — satu-satunya cara filter tanggal sekarang
  const today = new Date();
  const [filterMonth, setFilterMonth] = useState(today.getMonth());
  const [filterYear, setFilterYear] = useState(today.getFullYear());
  const [filterActive, setFilterActive] = useState(false);

  // Export custom range — default otomatis: tanggal 1 s/d akhir bulan berjalan
  const currentMonthRange = getMonthRange(
    today.getFullYear(),
    today.getMonth(),
  );
  const [exportStart, setExportStart] = useState(currentMonthRange.start);
  const [exportEnd, setExportEnd] = useState(currentMonthRange.end);
  const [exportError, setExportError] = useState("");

  // Export filter kategori
  const [kategoriList, setKategoriList] = useState([]);
  const [selectedKategoriIds, setSelectedKategoriIds] = useState([]);
  const [kategoriOpen, setKategoriOpen] = useState(false);
  const kategoriWrapRef = useRef(null); // bungkus label + tombol toggle
  const kategoriToggleRef = useRef(null); // tombol toggle saja (buat hitung posisi)
  const kategoriDropdownRef = useRef(null); // panel dropdown yang di-portal
  const [dropdownPos, setDropdownPos] = useState(null); // {top, left, width}

  const [editingRow, setEditingRow] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [search, setSearch] = useState("");

  const yearOptions = (() => {
    const current = today.getFullYear();
    return [current, current - 1, current - 2, current - 3];
  })();

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  useEffect(() => {
    loadKategoriList();
  }, []);

  // Hitung ulang posisi dropdown berdasarkan posisi tombol toggle di viewport.
  // Dipakai position: fixed, jadi tidak perlu tambah scrollX/scrollY.
  const updateDropdownPos = useCallback(() => {
    const btn = kategoriToggleRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 240),
    });
  }, []);

  const handleToggleKategoriOpen = () => {
    setKategoriOpen((o) => {
      const next = !o;
      if (next) {
        // hitung posisi tepat sebelum ditampilkan
        requestAnimationFrame(updateDropdownPos);
      }
      return next;
    });
  };

  // Tutup dropdown kategori saat klik di luar tombol toggle MAUPUN di luar
  // panel dropdown (yang sekarang di-portal ke document.body, jadi bukan
  // lagi anak DOM dari kategoriWrapRef).
  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedToggle =
        kategoriWrapRef.current && kategoriWrapRef.current.contains(e.target);
      const clickedDropdown =
        kategoriDropdownRef.current &&
        kategoriDropdownRef.current.contains(e.target);
      if (!clickedToggle && !clickedDropdown) {
        setKategoriOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Jaga posisi dropdown tetap menempel ke tombolnya saat halaman di-scroll
  // atau ukuran window berubah (mis. resize, buka devtools, dsb).
  useEffect(() => {
    if (!kategoriOpen) return;
    window.addEventListener("scroll", updateDropdownPos, true);
    window.addEventListener("resize", updateDropdownPos);
    return () => {
      window.removeEventListener("scroll", updateDropdownPos, true);
      window.removeEventListener("resize", updateDropdownPos);
    };
  }, [kategoriOpen, updateDropdownPos]);

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

  const loadKategoriList = async () => {
    try {
      const res = await getKategori(true);
      setKategoriList(res.data);
      // default: semua kategori terpilih (export semua, seperti perilaku sebelumnya)
      setSelectedKategoriIds(res.data.map((k) => k.id));
    } catch (err) {
      console.error(err);
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

  const handleDelete = (row) => {
    setDeleteTarget(row);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLogbook(deleteTarget.id);
      loadData(filterActive ? getMonthRange(filterYear, filterMonth) : {});
      onDataChanged?.();
      toast.success("Data logbook berhasil dihapus.");
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Gagal menghapus data logbook.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const toggleKategori = (id) => {
    setSelectedKategoriIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    );
  };

  const handleSelectAllKategori = () => {
    setSelectedKategoriIds(kategoriList.map((k) => k.id));
  };

  const handleClearAllKategori = () => {
    setSelectedKategoriIds([]);
  };

  const kategoriSummaryLabel = useMemo(() => {
    if (kategoriList.length === 0) return "Memuat kategori...";
    if (selectedKategoriIds.length === 0) return "Tidak ada kategori dipilih";
    if (selectedKategoriIds.length === kategoriList.length)
      return "Semua Kategori";
    if (selectedKategoriIds.length === 1) {
      const k = kategoriList.find((k) => k.id === selectedKategoriIds[0]);
      return k ? k.nama : "1 kategori dipilih";
    }
    return `${selectedKategoriIds.length} kategori dipilih`;
  }, [selectedKategoriIds, kategoriList]);

  // Ringkasan data yang sedang tampil: total helpdesk, total durasi, rata-rata per helpdesk
  const summaryStats = useMemo(() => {
    const totalHelpdesk = data.length;
    const totalMenit = data.reduce(
      (sum, row) => sum + (row.total_menit || 0),
      0,
    );
    const rataRata = totalHelpdesk > 0 ? totalMenit / totalHelpdesk : 0;
    return { totalHelpdesk, totalMenit, rataRata };
  }, [data]);

  // Search tabel berdasarkan tanggal, kategori, atau unit kerja (client-side, tidak mengubah ringkasan di atas)
  const searchQuery = search.trim().toLowerCase();
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter((row) => {
      const tanggal = (row.tanggal || "").slice(0, 10).toLowerCase();
      const kategori = (row.kategori || "").toLowerCase();
      const unitKerja = (row.unit_kerja || "").toLowerCase();
      return (
        tanggal.includes(searchQuery) ||
        kategori.includes(searchQuery) ||
        unitKerja.includes(searchQuery)
      );
    });
  }, [data, searchQuery]);

  const handleExport = () => {
    setExportError("");
    if (!exportStart || !exportEnd) {
      setExportError("Dari Tanggal dan Sampai Tanggal wajib diisi.");
      return;
    }
    if (exportEnd < exportStart) {
      setExportError("Sampai Tanggal harus sama atau setelah Dari Tanggal.");
      return;
    }
    if (selectedKategoriIds.length === 0) {
      setExportError("Pilih minimal satu kategori untuk diexport.");
      return;
    }

    let url = exportCsvUrl(exportStart, exportEnd);

    // Kalau tidak semua kategori dipilih, kirim daftar id kategori yang dipilih.
    // Kalau semua dipilih, tidak perlu kirim param (export semua seperti biasa).
    if (
      kategoriList.length > 0 &&
      selectedKategoriIds.length < kategoriList.length
    ) {
      const idsParam = selectedKategoriIds.join(",");
      url += `${url.includes("?") ? "&" : "?"}kategori_ids=${encodeURIComponent(idsParam)}`;
    }

    window.open(url, "_blank");
  };

  const handleEditSaved = () => {
    loadData(filterActive ? getMonthRange(filterYear, filterMonth) : {});
    onDataChanged?.();
  };

  return (
    <div className="logbook-table-wrap">
      <h2>Data Logbook Helpdesk</h2>

      <form className="filter-bar" onSubmit={handleFilterBulan}>
        <div className="filter-field">
          <label>Filter per Bulan</label>
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
        <div className="filter-field">
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
        <button type="submit">Tampilkan Bulan Ini</button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleTampilkanSemua}
        >
          Tampilkan Semua
        </button>
      </form>

      <div className="export-bar">
        <div className="filter-field">
          <label>Dari Tanggal</label>
          <input
            type="date"
            value={exportStart}
            onChange={(e) => setExportStart(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label>Sampai Tanggal</label>
          <input
            type="date"
            value={exportEnd}
            onChange={(e) => setExportEnd(e.target.value)}
          />
        </div>

        <div
          className="filter-field export-kategori-wrap"
          ref={kategoriWrapRef}
        >
          <label>Kategori</label>
          <button
            type="button"
            ref={kategoriToggleRef}
            className="export-kategori-toggle"
            onClick={handleToggleKategoriOpen}
          >
            <span className="export-kategori-toggle-text">
              {kategoriSummaryLabel}
            </span>
            <span
              className={`export-kategori-chevron ${
                kategoriOpen ? "is-open" : ""
              }`}
            >
              ▾
            </span>
          </button>

          {/* Dropdown di-portal langsung ke document.body supaya tidak
              terjebak di dalam stacking context manapun (mis. elemen yang
              memakai backdrop-filter pada tema Glassmorphism), sehingga
              selalu bisa diklik di kedua tema. Posisinya dihitung manual
              dari posisi tombol toggle di atas. */}
          {kategoriOpen &&
            dropdownPos &&
            createPortal(
              <div
                ref={kategoriDropdownRef}
                className="export-kategori-dropdown"
                style={{
                  position: "fixed",
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: dropdownPos.width,
                }}
              >
                <div className="export-kategori-actions">
                  <button type="button" onClick={handleSelectAllKategori}>
                    Pilih Semua
                  </button>
                  <button type="button" onClick={handleClearAllKategori}>
                    Kosongkan
                  </button>
                </div>
                {kategoriList.length === 0 && (
                  <div className="export-kategori-empty">
                    Belum ada data kategori.
                  </div>
                )}
                {kategoriList.map((k) => (
                  <label key={k.id} className="export-kategori-option">
                    <input
                      type="checkbox"
                      checked={selectedKategoriIds.includes(k.id)}
                      onChange={() => toggleKategori(k.id)}
                    />
                    <span>
                      {k.nama}
                      {!k.aktif && (
                        <span className="badge-inactive">Nonaktif</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>,
              document.body,
            )}
        </div>

        <button type="button" onClick={handleExport}>
          Export CSV
        </button>
      </div>
      {exportError && <div className="alert alert-error">{exportError}</div>}
      <p className="hint">
        Export CSV mengambil data logbook di antara Dari Tanggal dan Sampai
        Tanggal, dibatasi hanya untuk kategori yang dipilih di atas.
      </p>

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
      {loading && <p>Memuat data...</p>}

      {filterActive && !loading && !errorMsg && (
        <div className="logbook-summary">
          <div className="summary-card">
            <div className="summary-value">{summaryStats.totalHelpdesk}</div>
            <div className="summary-label">
              Total Helpdesk · {MONTH_NAMES[filterMonth]} {filterYear}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {formatMenit(summaryStats.totalMenit)}
              <span className="summary-subvalue">
                ({Math.round(summaryStats.totalMenit || 0)} mnt)
              </span>
            </div>
            <div className="summary-label">Total Durasi</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {formatMenit(summaryStats.rataRata)}
            </div>
            <div className="summary-label">Rata-rata / Helpdesk</div>
          </div>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="master-search-wrap">
          <span className="master-search-icon">⌕</span>
          <input
            type="text"
            className="master-search-input"
            placeholder="Cari berdasarkan tanggal, kategori, atau unit kerja..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="master-search-clear"
              onClick={() => setSearch("")}
              aria-label="Bersihkan pencarian"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {!loading && data.length > 0 && filteredData.length === 0 && (
        <p className="muted">Tidak ada hasil untuk "{search}".</p>
      )}

      <div className="table-scroll">
        <table>
          <colgroup>
            <col style={{ width: "7%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "14%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jam Mulai</th>
              <th>Jam Selesai</th>
              <th>Durasi (menit)</th>
              <th>Nama PIC</th>
              <th>Nama IT</th>
              <th>Kategori</th>
              <th>Unit Kerja</th>
              <th>Isi Helpdesk</th>
              <th>Tindakan</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && !loading && (
              <tr>
                <td colSpan={12} className="empty">
                  Belum ada data logbook.
                </td>
              </tr>
            )}
            {filteredData.map((row) => (
              <tr key={row.id}>
                <td data-label="Tanggal" className="cell-nowrap">
                  {row.tanggal?.slice(0, 10)}
                </td>
                <td data-label="Jam Mulai" className="cell-nowrap">
                  {row.jam_mulai ? row.jam_mulai.slice(0, 5) : "-"}
                </td>
                <td data-label="Jam Selesai" className="cell-nowrap">
                  {row.jam_selesai ? row.jam_selesai.slice(0, 5) : "-"}
                </td>
                <td data-label="Durasi" className="cell-nowrap">
                  {row.total_menit != null ? `${row.total_menit} mnt` : "-"}
                </td>
                <td
                  data-label="Nama PIC"
                  className="cell-truncate"
                  title={row.nama_pic}
                >
                  {row.nama_pic}
                </td>
                <td
                  data-label="Nama IT"
                  className="cell-truncate"
                  title={row.nama_it}
                >
                  {row.nama_it}
                </td>
                <td
                  data-label="Kategori"
                  className="cell-truncate"
                  title={row.kategori}
                >
                  {row.kategori}
                </td>
                <td
                  data-label="Unit Kerja"
                  className="cell-truncate"
                  title={row.unit_kerja || "-"}
                >
                  {row.unit_kerja || "-"}
                </td>
                <td
                  data-label="Isi Helpdesk"
                  className="cell-clamp"
                  title={row.isi_helpdesk}
                >
                  {row.isi_helpdesk}
                </td>
                <td
                  data-label="Tindakan"
                  className="cell-clamp"
                  title={row.tindakan || "-"}
                >
                  {row.tindakan || "-"}
                </td>
                <td data-label="Status" className="cell-nowrap">
                  <span className={`badge badge-${row.status.toLowerCase()}`}>
                    {row.status}
                  </span>
                </td>
                <td data-label="Aksi" className="cell-aksi">
                  <div className="action-btns">
                    <button
                      className="btn-secondary"
                      onClick={() => setEditingRow(row)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setHistoryTarget(row.id)}
                    >
                      Riwayat
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDelete(row)}
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingRow && (
        <LogbookEditModal
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSaved={handleEditSaved}
        />
      )}

      {historyTarget && (
        <LogbookHistoryModal
          logbookId={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Hapus Logbook"
          message={`Hapus data logbook tanggal ${deleteTarget.tanggal?.slice(
            0,
            10,
          )} (${deleteTarget.isi_helpdesk?.slice(0, 40)}${
            deleteTarget.isi_helpdesk?.length > 40 ? "..." : ""
          })? Tindakan ini tidak bisa dibatalkan.`}
          confirmLabel="Ya, Hapus"
          danger
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}