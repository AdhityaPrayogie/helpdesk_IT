import { useState, useEffect, useMemo } from "react";
import {
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
} from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import UserFormModal from "../components/UserFormModal";
import ResetPasswordModal from "../components/ResetPasswordModal";
import ConfirmModal from "../components/ConfirmModal";

export default function UsersPage() {
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // user yang sedang diedit
  const [resetTarget, setResetTarget] = useState(null); // user yang sedang direset password-nya
  const [confirmState, setConfirmState] = useState(null); // { type: 'toggle' | 'delete', item }
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (form) => {
    try {
      await createUser(form);
      await loadUsers();
      toast.success(`Pengguna "${form.nama}" berhasil ditambahkan.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menambah pengguna.");
      throw err; // biarkan modal tampilkan pesan error inline juga
    }
  };

  const handleEditSubmit = async (form) => {
    try {
      await updateUser(editTarget.id, {
        ...form,
        is_active: editTarget.is_active,
      });
      await loadUsers();
      toast.success(`Pengguna "${form.nama}" berhasil diperbarui.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memperbarui pengguna.");
      throw err;
    }
  };

  const handleResetSubmit = async (password) => {
    try {
      await resetUserPassword(resetTarget.id, password);
      toast.success(`Password untuk "${resetTarget.nama}" berhasil direset.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mereset password.");
      throw err;
    }
  };

  const handleToggleActive = (item) => {
    setConfirmState({ type: "toggle", item });
  };

  const handleDeleteUser = (item) => {
    setConfirmState({ type: "delete", item });
  };

  const closeConfirm = () => {
    if (confirmLoading) return;
    setConfirmState(null);
  };

  const handleConfirmProceed = async () => {
    if (!confirmState) return;
    const { type, item } = confirmState;
    setConfirmLoading(true);
    try {
      if (type === "toggle") {
        const akanAktif = !item.is_active;
        await updateUser(item.id, {
          nama: item.nama,
          email: item.email,
          role: item.role,
          is_active: akanAktif,
        });
        await loadUsers();
        toast.success(
          akanAktif
            ? `"${item.nama}" berhasil diaktifkan kembali.`
            : `"${item.nama}" berhasil dinonaktifkan.`,
        );
      } else if (type === "delete") {
        await deleteUser(item.id);
        await loadUsers();
        toast.success(`"${item.nama}" berhasil dihapus.`);
      }
      setConfirmState(null);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          (type === "delete"
            ? "Gagal menghapus pengguna."
            : "Gagal memperbarui status pengguna."),
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const searchQuery = search.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    return users.filter(
      (u) =>
        u.nama.toLowerCase().includes(searchQuery) ||
        u.email.toLowerCase().includes(searchQuery),
    );
  }, [users, searchQuery]);

  return (
    <>
      <header className="topbar">
        <h1>Kelola Pengguna</h1>
      </header>

      <main className="page-content">
        <div className="card">
          <div className="master-toolbar">
            <div>
              <h3 className="master-section-title">Daftar Pengguna</h3>
              {!loading && (
                <span className="master-section-count">
                  {users.filter((u) => u.is_active).length} aktif ·{" "}
                  {users.length} total
                </span>
              )}
            </div>
            <button
              type="button"
              className="master-add-btn"
              onClick={() => setShowAddModal(true)}
            >
              <span className="master-add-icon">+</span> Tambah Pengguna
            </button>
          </div>

          {!loading && users.length > 0 && (
            <div className="master-search-wrap">
              <span className="master-search-icon">⌕</span>
              <input
                type="text"
                className="master-search-input"
                placeholder="Cari nama atau email..."
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

          {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
          {loading && <p className="muted">Memuat data...</p>}
          {!loading && users.length === 0 && (
            <p className="muted">Belum ada pengguna.</p>
          )}
          {!loading && users.length > 0 && filteredUsers.length === 0 && (
            <p className="muted">Tidak ada hasil untuk "{search}".</p>
          )}

          <ul className="master-list">
            {filteredUsers.map((u) => (
              <li
                key={u.id}
                className={`master-list-item ${!u.is_active ? "is-inactive" : ""}`}
              >
                <span>
                  {u.nama} <span className="muted">({u.email})</span>{" "}
                  <span
                    className={`badge-role ${u.role === "super_admin" ? "badge-super" : ""}`}
                  >
                    {u.role === "super_admin" ? "Super Admin" : "User"}
                  </span>{" "}
                  {!u.is_active && (
                    <span className="badge-inactive">Nonaktif</span>
                  )}
                </span>
                <div className="master-list-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditTarget(u)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setResetTarget(u)}
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    className={u.is_active ? "btn-danger" : "btn-secondary"}
                    onClick={() => handleToggleActive(u)}
                  >
                    {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  {u.id !== currentUser?.id && (
                    <button
                      type="button"
                      className="btn-danger-outline"
                      onClick={() => handleDeleteUser(u)}
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {showAddModal && (
        <UserFormModal
          mode="create"
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddSubmit}
        />
      )}

      {editTarget && (
        <UserFormModal
          mode="edit"
          initialData={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEditSubmit}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSubmit={handleResetSubmit}
        />
      )}

      {confirmState && (
        <ConfirmModal
          title={
            confirmState.type === "delete"
              ? "Hapus Pengguna"
              : confirmState.item.is_active
                ? "Nonaktifkan Pengguna"
                : "Aktifkan Pengguna"
          }
          message={
            confirmState.type === "delete"
              ? `Hapus pengguna "${confirmState.item.nama}"? Tindakan ini tidak bisa dibatalkan.`
              : confirmState.item.is_active
                ? `Nonaktifkan "${confirmState.item.nama}"? Pengguna ini tidak akan bisa login sampai diaktifkan kembali.`
                : `Aktifkan kembali "${confirmState.item.nama}"?`
          }
          confirmLabel={
            confirmState.type === "delete"
              ? "Ya, Hapus"
              : confirmState.item.is_active
                ? "Ya, Nonaktifkan"
                : "Ya, Aktifkan"
          }
          danger={
            confirmState.type === "delete" ||
            (confirmState.type === "toggle" && confirmState.item.is_active)
          }
          loading={confirmLoading}
          onConfirm={handleConfirmProceed}
          onCancel={closeConfirm}
        />
      )}
    </>
  );
}
