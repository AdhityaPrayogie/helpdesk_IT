const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { Parser } = require("json2csv");
const { verifyToken } = require("../middleware/auth");

router.use(verifyToken);

const BASE_SELECT = `
    SELECT 
        l.id, l.tanggal, l.jam_mulai, l.jam_selesai, l.total_menit,
        p.nama AS nama_pic, 
        GROUP_CONCAT(DISTINCT s.nama ORDER BY s.nama SEPARATOR ', ') AS nama_it,
        GROUP_CONCAT(DISTINCT s.id ORDER BY s.nama SEPARATOR ',') AS staff_it_ids,
        k.nama AS kategori,
        u.nama AS unit_kerja,
        l.pic_id, l.kategori_id, l.unit_kerja_id,
        l.isi_helpdesk, l.tindakan, l.status,
        l.created_at
    FROM logbook l
    JOIN pic p ON l.pic_id = p.id
    LEFT JOIN logbook_staff_it lsi ON lsi.logbook_id = l.id
    LEFT JOIN staff_it s ON s.id = lsi.staff_it_id
    JOIN kategori_it k ON l.kategori_id = k.id
    LEFT JOIN unit_kerja u ON l.unit_kerja_id = u.id
`;

// Label yang ditampilkan di riwayat untuk tiap field
const FIELD_LABELS = {
  tanggal: "Tanggal",
  jam_mulai: "Jam Mulai",
  jam_selesai: "Jam Selesai",
  nama_pic: "Nama PIC",
  nama_it: "Nama IT",
  kategori: "Kategori",
  unit_kerja: "Unit Kerja",
  isi_helpdesk: "Isi Helpdesk",
  tindakan: "Tindakan",
  status: "Status",
};

// Format tanggal jadi "YYYY-MM-DD" pakai komponen lokal (bukan toISOString)
// supaya konsisten dengan cara tanggal diperlakukan di tempat lain pada app ini.
function formatTanggal(val) {
  if (!val) return null;
  if (typeof val === "string") return val.slice(0, 10);
  const d = new Date(val);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format jam jadi "HH:MM"
function formatJam(val) {
  if (!val) return null;
  return String(val).slice(0, 5);
}

// Ambil satu baris logbook lengkap (dengan nama PIC/IT/Kategori/Unit Kerja
// sudah di-join) dan normalisasi jadi objek datar yang mudah dibandingkan
// serta enak ditampilkan di riwayat.
async function getNormalizedRow(conn, id) {
  const [rows] = await conn.query(
    `${BASE_SELECT} WHERE l.id = ? GROUP BY l.id`,
    [id],
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    tanggal: formatTanggal(row.tanggal),
    jam_mulai: formatJam(row.jam_mulai),
    jam_selesai: formatJam(row.jam_selesai),
    nama_pic: row.nama_pic || null,
    nama_it: row.nama_it || null,
    kategori: row.kategori || null,
    unit_kerja: row.unit_kerja || null,
    isi_helpdesk: row.isi_helpdesk || null,
    tindakan: row.tindakan || null,
    status: row.status || null,
  };
}

// Bandingkan dua objek hasil getNormalizedRow, hasilkan daftar field yang berubah
function diffRows(oldRow, newRow) {
  const changes = [];
  for (const field of Object.keys(FIELD_LABELS)) {
    const before = oldRow ? oldRow[field] : null;
    const after = newRow[field];
    if ((before || null) !== (after || null)) {
      changes.push({
        field_name: field,
        label_field: FIELD_LABELS[field],
        nilai_lama: before,
        nilai_baru: after,
      });
    }
  }
  return changes;
}

// Simpan satu batch riwayat (create/update) beserta detail field yang berubah
async function catatRiwayat(conn, { logbookId, aksi, user, changes }) {
  if (changes.length === 0) return;

  const [historyResult] = await conn.query(
    `INSERT INTO logbook_history (logbook_id, aksi, changed_by, changed_by_nama)
         VALUES (?, ?, ?, ?)`,
    [logbookId, aksi, user?.id || null, user?.nama || null],
  );

  const historyId = historyResult.insertId;
  const detailValues = changes.map((c) => [
    historyId,
    c.field_name,
    c.label_field,
    c.nilai_lama,
    c.nilai_baru,
  ]);

  await conn.query(
    `INSERT INTO logbook_history_detail (history_id, field_name, label_field, nilai_lama, nilai_baru)
         VALUES ?`,
    [detailValues],
  );
}

router.get("/", async (req, res) => {
  try {
    const { start, end } = req.query;
    let sql = BASE_SELECT;
    const params = [];
    if (start && end) {
      sql += " WHERE l.tanggal BETWEEN ? AND ?";
      params.push(start, end);
    }
    sql += " GROUP BY l.id ORDER BY l.tanggal DESC, l.id DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data logbook" });
  }
});

router.post("/", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      tanggal,
      jam_mulai,
      jam_selesai,
      pic_id,
      staff_it_ids,
      kategori_id,
      unit_kerja_id,
      isi_helpdesk,
      tindakan,
      status,
    } = req.body;

    const staffIds = Array.isArray(staff_it_ids)
      ? staff_it_ids.filter((id) => id !== "" && id != null)
      : [];

    if (
      !tanggal ||
      !pic_id ||
      staffIds.length === 0 ||
      !kategori_id ||
      !isi_helpdesk
    ) {
      return res.status(400).json({
        message:
          "Tanggal, PIC, minimal 1 Nama IT, Kategori, dan Isi Helpdesk wajib diisi",
      });
    }

    const finalStatus = status || "Proses";

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO logbook (tanggal, jam_mulai, jam_selesai, pic_id, staff_it_id, kategori_id, unit_kerja_id, isi_helpdesk, tindakan, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tanggal,
        jam_mulai || null,
        jam_selesai || null,
        pic_id,
        staffIds[0],
        kategori_id,
        unit_kerja_id || null,
        isi_helpdesk,
        tindakan || null,
        finalStatus,
      ],
    );

    const logbookId = result.insertId;
    const relasiValues = staffIds.map((sid) => [logbookId, sid]);
    await conn.query(
      "INSERT INTO logbook_staff_it (logbook_id, staff_it_id) VALUES ?",
      [relasiValues],
    );

    // Catat riwayat awal: semua field yang terisi dicatat sebagai "create"
    const newRow = await getNormalizedRow(conn, logbookId);
    const initialChanges = diffRows(null, newRow);
    await catatRiwayat(conn, {
      logbookId,
      aksi: "create",
      user: req.user,
      changes: initialChanges,
    });

    await conn.commit();
    res
      .status(201)
      .json({ id: logbookId, message: "Logbook berhasil disimpan" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Gagal menyimpan logbook" });
  } finally {
    conn.release();
  }
});

router.put("/:id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      tanggal,
      jam_mulai,
      jam_selesai,
      pic_id,
      staff_it_ids,
      kategori_id,
      unit_kerja_id,
      isi_helpdesk,
      tindakan,
      status,
    } = req.body;

    const staffIds = Array.isArray(staff_it_ids)
      ? staff_it_ids.filter((id) => id !== "" && id != null)
      : [];

    if (
      !tanggal ||
      !pic_id ||
      staffIds.length === 0 ||
      !kategori_id ||
      !isi_helpdesk
    ) {
      return res.status(400).json({
        message:
          "Tanggal, PIC, minimal 1 Nama IT, Kategori, dan Isi Helpdesk wajib diisi",
      });
    }

    await conn.beginTransaction();

    // Kunci baris & ambil kondisi sebelum diubah (lengkap dengan nama-nama join)
    await conn.query("SELECT id FROM logbook WHERE id = ? FOR UPDATE", [
      req.params.id,
    ]);
    const oldRow = await getNormalizedRow(conn, req.params.id);
    if (!oldRow) {
      await conn.rollback();
      return res.status(404).json({ message: "Logbook tidak ditemukan" });
    }

    await conn.query(
      `UPDATE logbook SET tanggal=?, jam_mulai=?, jam_selesai=?, pic_id=?, staff_it_id=?, kategori_id=?, unit_kerja_id=?, isi_helpdesk=?, tindakan=?, status=?
             WHERE id=?`,
      [
        tanggal,
        jam_mulai || null,
        jam_selesai || null,
        pic_id,
        staffIds[0],
        kategori_id,
        unit_kerja_id || null,
        isi_helpdesk,
        tindakan || null,
        status,
        req.params.id,
      ],
    );

    await conn.query("DELETE FROM logbook_staff_it WHERE logbook_id = ?", [
      req.params.id,
    ]);
    const relasiValues = staffIds.map((sid) => [req.params.id, sid]);
    await conn.query(
      "INSERT INTO logbook_staff_it (logbook_id, staff_it_id) VALUES ?",
      [relasiValues],
    );

    // Bandingkan kondisi sebelum & sesudah, catat semua field yang berubah
    const newRow = await getNormalizedRow(conn, req.params.id);
    const changes = diffRows(oldRow, newRow);
    await catatRiwayat(conn, {
      logbookId: req.params.id,
      aksi: "update",
      user: req.user,
      changes,
    });

    await conn.commit();
    res.json({ message: "Logbook berhasil diperbarui" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Gagal memperbarui logbook" });
  } finally {
    conn.release();
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM logbook WHERE id = ?", [req.params.id]);
    res.json({ message: "Logbook berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menghapus logbook" });
  }
});

router.get("/:id/history", async (req, res) => {
  try {
    const [historyRows] = await pool.query(
      `SELECT id, aksi, changed_by_nama, created_at
             FROM logbook_history
             WHERE logbook_id = ?
             ORDER BY created_at ASC, id ASC`,
      [req.params.id],
    );

    if (historyRows.length === 0) {
      return res.json([]);
    }

    const historyIds = historyRows.map((h) => h.id);
    const [detailRows] = await pool.query(
      `SELECT history_id, field_name, label_field, nilai_lama, nilai_baru
             FROM logbook_history_detail
             WHERE history_id IN (?)
             ORDER BY id ASC`,
      [historyIds],
    );

    const detailsByHistory = {};
    detailRows.forEach((d) => {
      if (!detailsByHistory[d.history_id]) detailsByHistory[d.history_id] = [];
      detailsByHistory[d.history_id].push(d);
    });

    const result = historyRows.map((h) => ({
      id: h.id,
      aksi: h.aksi,
      changed_by_nama: h.changed_by_nama,
      created_at: h.created_at,
      details: detailsByHistory[h.id] || [],
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil riwayat logbook" });
  }
});

router.get("/export/csv", async (req, res) => {
  try {
    const { start, end, kategori_ids } = req.query;
    if (!start || !end) {
      return res
        .status(400)
        .json({ message: "Parameter start dan end wajib diisi" });
    }

    let sql = `${BASE_SELECT} WHERE l.tanggal BETWEEN ? AND ?`;
    const params = [start, end];

    if (kategori_ids) {
      const ids = String(kategori_ids)
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id !== "" && !Number.isNaN(Number(id)));

      if (ids.length > 0) {
        sql += ` AND l.kategori_id IN (${ids.map(() => "?").join(",")})`;
        params.push(...ids);
      }
    }

    sql += " GROUP BY l.id ORDER BY l.tanggal ASC";

    const [rows] = await pool.query(sql, params);

    const fields = [
      { label: "Tanggal", value: "tanggal" },
      { label: "Jam Mulai", value: "jam_mulai" },
      { label: "Jam Selesai", value: "jam_selesai" },
      { label: "Total Menit", value: "total_menit" },
      { label: "Nama PIC", value: "nama_pic" },
      { label: "Nama IT", value: "nama_it" },
      { label: "Kategori", value: "kategori" },
      { label: "Unit Kerja", value: "unit_kerja" },
      { label: "Isi Helpdesk", value: "isi_helpdesk" },
      { label: "Tindakan", value: "tindakan" },
      { label: "Status", value: "status" },
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    const filename = `laporan_logbook_${start}_sd_${end}.csv`;
    res.header("Content-Type", "text/csv");
    res.attachment(filename);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal membuat file CSV" });
  }
});

module.exports = router;
