import { useState } from "react";
import { createPortal } from "react-dom";

const emptyForm = { nama: "", email: "", role: "user", password: "" };

export default function UserFormModal({
  mode,
  initialData,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(
    mode === "edit"
      ? {
          nama: initialData.nama,
          email: initialData.email,
          role: initialData.role,
        }
      : emptyForm,
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.nama.trim() || !form.email.trim()) {
      setErrorMsg("Nama dan email wajib diisi.");
      return;
    }
    if (mode === "create" && (!form.password || form.password.length < 6)) {
      setErrorMsg("Password wajib diisi, minimal 6 karakter.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message || "Gagal menyimpan data pengguna.",
      );
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box modal-box-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{mode === "edit" ? "Edit Pengguna" : "Tambah Pengguna"}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

          <div className="modal-form-fields">
            <div className="form-field form-field-full">
              <label>Nama</label>
              <input
                type="text"
                value={form.nama}
                onChange={handleChange("nama")}
                placeholder="Contoh: Budi Santoso"
                autoFocus
              />
            </div>

            <div className="form-field form-field-full">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                placeholder="nama@perusahaan.com"
              />
            </div>

            <div className="form-field form-field-full">
              <label>Role</label>
              <select value={form.role} onChange={handleChange("role")}>
                <option value="user">User</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            {mode === "create" && (
              <div className="form-field form-field-full">
                <label>Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder="Minimal 6 karakter"
                />
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" disabled={saving}>
              {saving
                ? "Menyimpan..."
                : mode === "edit"
                  ? "Simpan Perubahan"
                  : "Tambah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
