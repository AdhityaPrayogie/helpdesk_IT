import { useState, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import {
  getPic,
  getStaffIt,
  getKategori,
  getUnitKerja,
  updateLogbook,
} from "../api";
import Combobox from "./Combobox";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./Toast";

const JENIS_PELAYANAN = [
  { id: "Pelayanan", nama: "Pelayanan" },
  { id: "Non Pelayanan", nama: "Non Pelayanan" },
];

// "—" kalau jam belum lengkap / tidak valid, supaya grid tidak bergeser
const durasiMenit = (mulai, selesai) => {
  if (!mulai || !selesai || selesai <= mulai) return "—";
  const [h1, m1] = mulai.split(":").map(Number);
  const [h2, m2] = selesai.split(":").map(Number);
  return `${h2 * 60 + m2 - (h1 * 60 + m1)} menit`;
};

export default function LogbookEditModal({ row, onClose, onSaved }) {
  const toast = useToast();
  const uid = useId();
  const fid = (name) => `${uid}-${name}`;
  const [picList, setPicList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [unitKerjaList, setUnitKerjaList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    tanggal: row.tanggal?.slice(0, 10) || "",
    jam_mulai: row.jam_mulai ? row.jam_mulai.slice(0, 5) : "",
    jam_selesai: row.jam_selesai ? row.jam_selesai.slice(0, 5) : "",
    pic_id: row.pic_id || "",
    // backend mengirim staff_it_ids sebagai string "1,4,7" (hasil GROUP_CONCAT)
    staff_it_ids: row.staff_it_ids
      ? String(row.staff_it_ids).split(",").filter(Boolean)
      : [],
    kategori_id: row.kategori_id || "",
    unit_kerja_id: row.unit_kerja_id || "",
    isi_helpdesk: row.isi_helpdesk || "",
    tindakan: row.tindakan || "",
    status: row.status || "Proses",
    jenis_pelayanan: row.jenis_pelayanan || "",
  });

  useEffect(() => {
    loadDropdowns();
  }, []);

  const loadDropdowns = async () => {
    try {
      const [picRes, staffRes, katRes, unitRes] = await Promise.all([
        getPic(true),
        getStaffIt(true),
        getKategori(true),
        getUnitKerja(true),
      ]);
      setPicList(picRes.data);
      setStaffList(staffRes.data);
      setKategoriList(katRes.data);
      setUnitKerjaList(unitRes.data);
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memuat dropdown.");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectWheel = (e) => {
    const select = e.currentTarget;
    if (!select) return;
    if (Math.abs(e.deltaY) < 10) return;
    try {
      e.preventDefault();
    } catch {}
    const nextIdx =
      e.deltaY > 0 ? select.selectedIndex + 1 : select.selectedIndex - 1;
    if (nextIdx >= 0 && nextIdx < select.options.length) {
      select.selectedIndex = nextIdx;
      setForm((prev) => ({
        ...prev,
        [select.name]: select.options[nextIdx].value,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (
      !form.pic_id ||
      form.staff_it_ids.length === 0 ||
      !form.kategori_id ||
      !form.isi_helpdesk.trim() ||
      !form.jenis_pelayanan
    ) {
      setErrorMsg(
        "Nama Costumer, minimal 1 Nama IT, Kategori, Isi Helpdesk, dan Jenis Pelayanan wajib diisi.",
      );
      return;
    }

    if (
      form.jam_mulai &&
      form.jam_selesai &&
      form.jam_selesai <= form.jam_mulai
    ) {
      setErrorMsg("Jam Selesai harus lebih besar dari Jam Mulai.");
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      await updateLogbook(row.id, form);
      toast.success("Perubahan logbook berhasil disimpan.");
      setShowConfirm(false);
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Gagal memperbarui logbook.";
      setErrorMsg(msg);
      toast.error(msg);
      setShowConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Logbook</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

          <div className="form-grid">

            <div className="form-field">
              <label htmlFor={fid("tanggal")}>Tanggal</label>
              <input
                id={fid("tanggal")}
                type="date"
                name="tanggal"
                value={form.tanggal}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor={fid("jam_mulai")}>Jam Mulai</label>
              <input
                id={fid("jam_mulai")}
                type="time"
                name="jam_mulai"
                value={form.jam_mulai}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor={fid("jam_selesai")}>Jam Selesai</label>
              <input
                id={fid("jam_selesai")}
                type="time"
                name="jam_selesai"
                value={form.jam_selesai}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label>Estimasi Durasi</label>
              <div className="duration-preview">
                {durasiMenit(form.jam_mulai, form.jam_selesai)}
              </div>
            </div>


            <div className="form-field">
              <label htmlFor={fid("pic_id")}>Nama Costumer</label>
              <Combobox
                id={fid("pic_id")}
                options={picList}
                value={form.pic_id}
                onChange={(id) => setForm((prev) => ({ ...prev, pic_id: id }))}
                placeholder="Pilih Nama Costumer..."
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor={fid("staff_it_ids")}>Nama IT (Teknisi)</label>
              <Combobox
            id={fid("staff_it_ids")}
            multiple
                options={staffList}
                value={form.staff_it_ids}
                onChange={(ids) =>
                  setForm((prev) => ({ ...prev, staff_it_ids: ids }))
                }
                placeholder="Pilih & tambah Nama IT..."
              />
            </div>

            <div className="form-field">
              <label htmlFor={fid("kategori_id")}>Kategori IT</label>
              <Combobox
                id={fid("kategori_id")}
                options={kategoriList}
                value={form.kategori_id}
                onChange={(id) => setForm((prev) => ({ ...prev, kategori_id: id }))}
                placeholder="Pilih Kategori IT..."
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor={fid("unit_kerja_id")}>Unit Kerja (opsional)</label>
              <Combobox
                id={fid("unit_kerja_id")}
                options={unitKerjaList}
                value={form.unit_kerja_id}
                onChange={(id) => setForm((prev) => ({ ...prev, unit_kerja_id: id }))}
                placeholder="Pilih Unit Kerja (opsional)..."
              />
            </div>

            <div className="form-field">
              <label htmlFor={fid("jenis_pelayanan")}>Jenis Pelayanan</label>
              <Combobox
                id={fid("jenis_pelayanan")}
                options={JENIS_PELAYANAN}
                value={form.jenis_pelayanan}
                onChange={(id) => setForm((prev) => ({ ...prev, jenis_pelayanan: id }))}
                placeholder="Pilih Jenis Pelayanan..."
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor={fid("status")}>Status</label>
              <select
                id={fid("status")}
                name="status"
                value={form.status}
                onChange={handleChange}
                onWheel={handleSelectWheel}
              >
                <option value="Proses">Proses</option>
                <option value="Selesai">Selesai</option>
                <option value="Batal">Batal</option>
              </select>
            </div>


            <div className="form-field form-field-full">
              <label htmlFor={fid("isi_helpdesk")}>Isi Helpdesk</label>
              <textarea
                id={fid("isi_helpdesk")}
                name="isi_helpdesk"
                value={form.isi_helpdesk}
                onChange={handleChange}
                rows={3}
                required
              />
            </div>

            <div className="form-field form-field-full">
              <label htmlFor={fid("tindakan")}>Tindakan (opsional)</label>
              <textarea
                id={fid("tindakan")}
                name="tindakan"
                value={form.tindakan}
                onChange={handleChange}
                rows={2}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      {showConfirm && (
        <ConfirmModal
          title="Simpan Perubahan"
          message="Simpan perubahan pada data logbook ini?"
          confirmLabel="Ya, Simpan"
          loading={saving}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}