import { useState, useEffect, useMemo } from "react";
import { Search, X, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import {
  getPic,
  createPic,
  setPicAktif,
  deletePic,
  getStaffIt,
  createStaffIt,
  setStaffItAktif,
  deleteStaffIt,
  getKategori,
  createKategori,
  setKategoriAktif,
  deleteKategori,
  getUnitKerja,
  createUnitKerja,
  setUnitKerjaAktif,
  deleteUnitKerja,
} from "../api";
import MasterDataAddModal from "./MasterDataAddModal";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./Toast";

const TABS = [
  { key: "pic", label: "Nama PIC" },
  { key: "staff", label: "Nama IT" },
  { key: "kategori", label: "Kategori" },
  { key: "unit", label: "Unit Kerja" },
];

const CONFIG = {
  pic: {
    get: getPic,
    create: createPic,
    setAktif: setPicAktif,
    remove: deletePic,
    placeholder: "Contoh: Andi Pratama",
    modalTitle: "Tambah PIC",
    sectionTitle: "Daftar Nama PIC",
    empty: "Belum ada data PIC.",
    searchPlaceholder: "Cari nama PIC...",
    label: "PIC",
  },
  staff: {
    get: getStaffIt,
    create: createStaffIt,
    setAktif: setStaffItAktif,
    remove: deleteStaffIt,
    placeholder: "Contoh: Rian Saputra",
    modalTitle: "Tambah Nama IT",
    sectionTitle: "Daftar Nama IT",
    empty: "Belum ada data staff IT.",
    searchPlaceholder: "Cari nama IT...",
    label: "Nama IT",
  },
  kategori: {
    get: getKategori,
    create: createKategori,
    setAktif: setKategoriAktif,
    remove: deleteKategori,
    placeholder: "Contoh: Hardware",
    modalTitle: "Tambah Kategori",
    sectionTitle: "Daftar Kategori",
    empty: "Belum ada data kategori.",
    searchPlaceholder: "Cari kategori...",
    label: "Kategori",
  },
  unit: {
    get: getUnitKerja,
    create: createUnitKerja,
    setAktif: setUnitKerjaAktif,
    remove: deleteUnitKerja,
    placeholder: "Contoh: Finance",
    modalTitle: "Tambah Unit Kerja",
    sectionTitle: "Daftar Unit Kerja",
    empty: "Belum ada data unit kerja.",
    searchPlaceholder: "Cari unit kerja...",
    label: "Unit Kerja",
  },
};

export default function MasterDataPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("pic");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmState, setConfirmState] = useState(null); // { type: 'toggle' | 'delete', item }
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    loadItems();
    setErrorMsg("");
    setSearch(""); // reset pencarian setiap ganti tab
  }, [activeTab]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await CONFIG[activeTab].get(true);
      setItems(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (nama) => {
    const cfg = CONFIG[activeTab];
    try {
      await CONFIG[activeTab].create({ nama });
      await loadItems();
      toast.success(`${cfg.label} "${nama}" berhasil ditambahkan.`);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || `Gagal menambah ${cfg.label}.`,
      );
      throw err; // biarkan modal tambah menampilkan pesan error inline juga
    }
  };

  const handleToggleAktif = (item) => {
    setConfirmState({ type: "toggle", item });
  };

  const handleHapusPermanen = (item) => {
    setConfirmState({ type: "delete", item });
  };

  const closeConfirm = () => {
    if (confirmLoading) return;
    setConfirmState(null);
  };

  const handleConfirmProceed = async () => {
    if (!confirmState) return;
    const { type, item } = confirmState;
    const cfg = CONFIG[activeTab];
    setConfirmLoading(true);
    try {
      if (type === "toggle") {
        const akanAktif = !item.aktif;
        await cfg.setAktif(item.id, akanAktif);
        await loadItems();
        toast.success(
          akanAktif
            ? `"${item.nama}" berhasil diaktifkan kembali.`
            : `"${item.nama}" berhasil dinonaktifkan.`,
        );
      } else if (type === "delete") {
        await cfg.remove(item.id);
        await loadItems();
        toast.success(`"${item.nama}" berhasil dihapus permanen.`);
      }
      setConfirmState(null);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          (type === "delete"
            ? "Gagal menghapus data. Kemungkinan data ini masih dipakai di logbook."
            : "Gagal memperbarui status data."),
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const cfg = CONFIG[activeTab];
  const aktifCount = items.filter((i) => i.aktif).length;

  // Filter berdasarkan kata kunci pencarian (case-insensitive)
  const searchQuery = search.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter((i) => i.nama.toLowerCase().includes(searchQuery));
  }, [items, searchQuery]);

  // Aktif tampil di atas, nonaktif di bawah. Di dalam masing-masing grup,
  // urutan asli dari API (biasanya alfabetis dari backend) tetap dipertahankan.
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (a.aktif === b.aktif) return 0;
      return a.aktif ? -1 : 1;
    });
  }, [filteredItems]);

  return (
    <div className="page-content">
      <div className="card">
        <div className="master-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`master-tab ${activeTab === t.key ? "active" : ""}`}
              onClick={() => setActiveTab(t.key)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="master-toolbar">
          <div>
            <h3 className="master-section-title">{cfg.sectionTitle}</h3>
            {!loading && (
              <span className="master-section-count">
                {aktifCount} aktif · {items.length} total
              </span>
            )}
          </div>
          <button
            type="button"
            className="master-add-btn"
            onClick={() => setShowAddModal(true)}
          >
            <span className="master-add-icon">
              <Plus size={16} strokeWidth={2.5} />
            </span>
            Tambah
          </button>
        </div>

        {!loading && items.length > 0 && (
          <div className="master-search-wrap">
            <span className="master-search-icon">
              <Search size={16} />
            </span>
            <input
              type="text"
              className="master-search-input"
              placeholder={cfg.searchPlaceholder}
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
                <X size={12} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
        {loading && <p className="muted">Memuat data...</p>}

        {!loading && items.length === 0 && <p className="muted">{cfg.empty}</p>}

        {!loading && items.length > 0 && sortedItems.length === 0 && (
          <p className="muted">Tidak ada hasil untuk "{search}".</p>
        )}

        <ul className="master-list">
          {sortedItems.map((item) => (
            <li
              key={item.id}
              className={`master-list-item ${!item.aktif ? "is-inactive" : ""}`}
            >
              <span>
                {item.nama}{" "}
                {!item.aktif && (
                  <span className="badge-inactive">Nonaktif</span>
                )}
              </span>
              <div className="master-list-actions">
                <button
                  type="button"
                  className={item.aktif ? "btn-danger" : "btn-secondary"}
                  onClick={() => handleToggleAktif(item)}
                >
                  {item.aktif ? <PowerOff size={14} /> : <Power size={14} />}
                  {item.aktif ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={() => handleHapusPermanen(item)}
                >
                  <Trash2 size={14} />
                  Hapus Permanen
                </button>
              </div>
            </li>
          ))}
        </ul>

        {showAddModal && (
          <MasterDataAddModal
            title={cfg.modalTitle}
            placeholder={cfg.placeholder}
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddSubmit}
          />
        )}

        {confirmState && (
          <ConfirmModal
            title={
              confirmState.type === "delete"
                ? "Hapus Permanen"
                : confirmState.item.aktif
                  ? "Nonaktifkan Data"
                  : "Aktifkan Data"
            }
            message={
              confirmState.type === "delete"
                ? `Hapus permanen "${confirmState.item.nama}"? Tindakan ini tidak bisa dibatalkan.`
                : confirmState.item.aktif
                  ? `Nonaktifkan "${confirmState.item.nama}"? Data lama di logbook tidak akan terpengaruh.`
                  : `Aktifkan kembali "${confirmState.item.nama}"?`
            }
            confirmLabel={
              confirmState.type === "delete"
                ? "Ya, Hapus Permanen"
                : confirmState.item.aktif
                  ? "Ya, Nonaktifkan"
                  : "Ya, Aktifkan"
            }
            danger={
              confirmState.type === "delete" ||
              (confirmState.type === "toggle" && confirmState.item.aktif)
            }
            loading={confirmLoading}
            onConfirm={handleConfirmProceed}
            onCancel={closeConfirm}
          />
        )}
      </div>
    </div>
  );
}
