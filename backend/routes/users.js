const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { verifyToken, requireRole } = require("../middleware/auth");

// Semua route di bawah ini WAJIB login sebagai super_admin
router.use(verifyToken, requireRole("super_admin"));

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nama, email, role, is_active, created_at FROM users ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data pengguna" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;
    if (!nama || !email || !password || !role) {
      return res.status(400).json({ message: "Semua field wajib diisi" });
    }
    if (!["super_admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Role tidak valid" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [nama, email, password_hash, role],
    );
    res
      .status(201)
      .json({ id: result.insertId, message: "Pengguna berhasil dibuat" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email sudah terdaftar" });
    }
    console.error(err);
    res.status(500).json({ message: "Gagal membuat pengguna" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { nama, email, role, is_active } = req.body;
    await pool.query(
      "UPDATE users SET nama=?, email=?, role=?, is_active=? WHERE id=?",
      [nama, email, role, is_active ? 1 : 0, req.params.id],
    );
    res.json({ message: "Pengguna berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memperbarui pengguna" });
  }
});

// Reset password terpisah dari update biasa (lebih aman & eksplisit)
router.put("/:id/password", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter" });
    }
    const password_hash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password_hash=? WHERE id=?", [
      password_hash,
      req.params.id,
    ]);
    res.json({ message: "Password berhasil direset" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mereset password" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    // Cegah super_admin menghapus akunnya sendiri
    if (Number(req.params.id) === req.user.id) {
      return res
        .status(400)
        .json({ message: "Tidak bisa menghapus akun sendiri" });
    }
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "Pengguna berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menghapus pengguna" });
  }
});

module.exports = router;
