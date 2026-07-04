import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function MasterDataAddModal({
  title,
  placeholder,
  onClose,
  onSubmit,
}) {
  const [nama, setNama] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!nama.trim()) {
      setErrorMsg("Nama wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(nama.trim());
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Gagal menambah data.");
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
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

          <div className="form-field form-field-full">
            <label>Nama</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "Menambah..." : "Tambah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
