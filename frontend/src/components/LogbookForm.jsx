import { useState, useEffect } from "react";
import {
  getPic,
  getStaffIt,
  getKategori,
  getUnitKerja,
  createLogbook,
} from "../api";
import SearchableSelect from "./SearchableSelect";
import SearchableMultiSelect from "./SearchableMultiSelect";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./Toast";

const todayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyForm = {
  tanggal: todayStr(),
  jam_mulai: "",
  jam_selesai: "",
  pic_id: "",
  staff_it_ids: [],
  kategori_id: "",
  unit_kerja_id: "",
  isi_helpdesk: "",
  tindakan: "",
  status: "Proses",
  jenis_pelayanan: "",
};

export default function LogbookForm({ onSaved }) {
  const toast = useToast();
  const [picList, setPicList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [unitKerjaList, setUnitKerjaList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

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
      setErrorMsg(
        "Gagal memuat dropdown. Pastikan backend jalan di localhost:5000.",
      );
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
    setSuccessMsg("");

    if (
      !form.pic_id ||
      form.staff_it_ids.length === 0 ||
      !form.kategori_id ||
      !form.isi_helpdesk.trim() ||
      !form.jenis_pelayanan
    ) {
      setErrorMsg(
        "Nama PIC, minimal 1 Nama IT, Kategori, Isi Helpdesk, dan Jenis Pelayanan wajib diisi.",
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
      await createLogbook(form);
      setSuccessMsg("Logbook berhasil disimpan.");
      toast.success("Logbook berhasil disimpan.");
      setForm({ ...emptyForm, tanggal: form.tanggal }); // tanggal tetap, sisanya reset
      setShowConfirm(false);
      if (onSaved) onSaved();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Gagal menyimpan logbook.";
      setErrorMsg(msg);
      toast.error(msg);
      setShowConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="logbook-form" onSubmit={handleSubmit}>
      <h2>Input Helpdesk Harian</h2>

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

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

        {form.jam_mulai &&
          form.jam_selesai &&
          form.jam_selesai > form.jam_mulai && (
            <div className="form-field">
              <label>Estimasi Durasi</label>
              <div className="duration-preview">
                {(() => {
                  const [h1, m1] = form.jam_mulai.split(":").map(Number);
                  const [h2, m2] = form.jam_selesai.split(":").map(Number);
                  const totalMin = h2 * 60 + m2 - (h1 * 60 + m1);
                  return `${totalMin} menit`;
                })()}
              </div>
            </div>
          )}

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
          <label>Jenis Pelayanan</label>
          <select
            name="jenis_pelayanan"
            value={form.jenis_pelayanan}
            onChange={handleChange}
            required
          >
            <option value="">-- Pilih --</option>
            <option value="Pelayanan">Pelayanan</option>
            <option value="Non Pelayanan">Non Pelayanan</option>
          </select>
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
            placeholder="Deskripsi masalah / permintaan"
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
            placeholder="Solusi / tindakan yang dilakukan"
          />
        </div>
      </div>

      <button type="submit" disabled={saving}>
        {saving ? "Menyimpan..." : "Simpan Logbook"}
      </button>

      {showConfirm && (
        <ConfirmModal
          title="Simpan Logbook"
          message="Simpan data helpdesk ini ke logbook?"
          confirmLabel="Ya, Simpan"
          loading={saving}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </form>
  );
}