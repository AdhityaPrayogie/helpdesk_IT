import { useState, useEffect, useId } from "react";
import {
  getPic,
  getStaffIt,
  getKategori,
  getUnitKerja,
  createLogbook,
} from "../api";
import Combobox from "./Combobox";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./Toast";

const todayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
  const uid = useId();
  const fid = (name) => `${uid}-${name}`;
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

  const handleSelectWheel = (e) => {
    const select = e.currentTarget;
    if (!select) return;
    if (Math.abs(e.deltaY) < 10) return;
    try {
      e.preventDefault();
    } catch { }
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
    setSuccessMsg("");

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
            placeholder="Deskripsi masalah / permintaan"
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