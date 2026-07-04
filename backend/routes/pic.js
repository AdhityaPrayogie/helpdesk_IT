const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { verifyToken, requireRole } = require("../middleware/auth");

router.use(verifyToken);

router.get("/", async (req, res) => {
  try {
    const showAll = req.query.all === "1" || req.query.all === "true";
    const sql = showAll
      ? "SELECT id, nama, aktif FROM pic ORDER BY nama ASC"
      : "SELECT id, nama, aktif FROM pic WHERE aktif = 1 ORDER BY nama ASC";
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data PIC" });
  }
});

router.put("/:id", requireRole("super_admin"), async (req, res) => {
  try {
    const { aktif } = req.body;
    await pool.query("UPDATE pic SET aktif = ? WHERE id = ?", [
      aktif ? 1 : 0,
      req.params.id,
    ]);
    res.json({ message: "Berhasil diperbarui" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memperbarui PIC" });
  }
});

router.post("/", requireRole("super_admin"), async (req, res) => {
  try {
    const { nama } = req.body;
    if (!nama || !nama.trim()) {
      return res.status(400).json({ message: "Nama PIC wajib diisi" });
    }
    const [result] = await pool.query("INSERT INTO pic (nama) VALUES (?)", [
      nama.trim(),
    ]);
    res.status(201).json({ id: result.insertId, nama });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menambah PIC" });
  }
});

router.delete("/:id", requireRole("super_admin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM pic WHERE id = ?", [req.params.id]);
    res.json({ message: "PIC berhasil dihapus permanen" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2" || err.errno === 1451) {
      return res.status(409).json({
        message:
          "Tidak bisa dihapus permanen karena masih dipakai di data logbook. Nonaktifkan saja.",
      });
    }
    console.error(err);
    res.status(500).json({ message: "Gagal menghapus PIC" });
  }
});

module.exports = router;
