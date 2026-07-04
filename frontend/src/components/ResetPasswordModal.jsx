import { useState } from "react";
import { createPortal } from "react-dom";

export default function ResetPasswordModal({ user, onClose, onSubmit }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!password || password.length < 6) {
      setErrorMsg("Password minimal 6 karakter.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(password);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Gagal mereset password.");
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
          <h2>Reset Password</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <p className="confirm-message">
            Atur ulang password untuk <strong>{user.nama}</strong> ({user.email}
            ).
          </p>

          {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

          <div className="form-field form-field-full">
            <label>Password Baru</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              autoFocus
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
