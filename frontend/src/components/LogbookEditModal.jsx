import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  getPic,
  getStaffIt,
  getKategori,
  getUnitKerja,
  updateLogbook,
} from "../api";
import SearchableSelect from "./SearchableSelect";
import SearchableMultiSelect from "./SearchableMultiSelect";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./Toast";

export default function LogbookEditModal({ row, onClose, onSaved }) {
  const toast = useToast();
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
    status: row.status || "proses",
  });

  useEffect(() => {
    loadDropdowns();
  }, []);

  const loadDropdowns = async () => {
    try {
      const [picRes, staffRes, katRes, unitRes] = await Promise.all([
        getPic(),
        getStaffIt(),
        getKategori(),
        getUnitKerja(),
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

  const handleSelectChange = (name) => (id) => {
    setForm((prev) => ({ ...prev, [name]: id }));
  };

  const handleStaffChange = (ids) => {
    setForm((prev) => ({ ...prev, staff_it_ids: ids }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (
      !form.pic_id ||
      form.staff_it_ids.length === 0 ||
      !form.kategori_id ||
      !form.isi_helpdesk.trim()
    ) {
      setErrorMsg(
        "Nama PIC, minimal 1 Nama IT, Kategori, dan Isi Helpdesk wajib diisi.",
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
      onSaved();
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
              <label>Tanggal</label>
              <input
                type="date"
                name="tanggal"
                value={form.tanggal}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label>Jam Mulai</label>
              <input
                type="time"
                name="jam_mulai"
                value={form.jam_mulai}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label>Jam Selesai</label>
              <input
                type="time"
                name="jam_selesai"
                value={form.jam_selesai}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label>Nama PIC</label>
              <SearchableSelect
                options={picList}
                value={form.pic_id}
                onChange={handleSelectChange("pic_id")}
                placeholder="Cari Nama PIC..."
                required
              />
            </div>

            <div className="form-field">
              <label>Nama IT (Teknisi)</label>
              <SearchableMultiSelect
                options={staffList}
                value={form.staff_it_ids}
                onChange={handleStaffChange}
                placeholder="Cari & pilih Nama IT..."
              />
            </div>

            <div className="form-field">
              <label>Kategori IT</label>
              <SearchableSelect
                options={kategoriList}
                value={form.kategori_id}
                onChange={handleSelectChange("kategori_id")}
                placeholder="Cari Kategori..."
                required
              />
            </div>

            <div className="form-field">
              <label>Unit Kerja (opsional)</label>
              <SearchableSelect
                options={unitKerjaList}
                value={form.unit_kerja_id}
                onChange={handleSelectChange("unit_kerja_id")}
                placeholder="Cari Unit Kerja..."
              />
            </div>

            <div className="form-field">
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="Proses">Proses</option>
                <option value="Selesai">Selesai</option>
                <option value="Batal">Batal</option>
              </select>
            </div>

            <div className="form-field form-field-full">
              <label>Isi Helpdesk</label>
              <textarea
                name="isi_helpdesk"
                value={form.isi_helpdesk}
                onChange={handleChange}
                rows={3}
                required
              />
            </div>

            <div className="form-field form-field-full">
              <label>Tindakan (opsional)</label>
              <textarea
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
