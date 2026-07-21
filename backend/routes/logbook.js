const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const ExcelJS = require("exceljs");
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
        l.isi_helpdesk, l.tindakan, l.status, l.jenis_pelayanan,
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
  jenis_pelayanan: "Jenis Pelayanan",
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

// Format tanggal jadi "DD/MM/YYYY" untuk ditampilkan di file export Excel
function formatTanggalExport(val) {
  const iso = formatTanggal(val);
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Format jam jadi "HH:MM"
function formatJam(val) {
  if (!val) return null;
  return String(val).slice(0, 5);
}

// Format jam jadi "HH:MM:SS" untuk export (meniru format file contoh)
function formatJamExport(val) {
  if (!val) return "";
  const s = String(val).slice(0, 8);
  return s.length === 5 ? `${s}:00` : s;
}

// Nama bulan singkat berbahasa Indonesia, dipakai buat nama sheet Excel (mis. "Jul 26")
const MONTH_SHORT_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Ags",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function sheetNameFromRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameMonth =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth();
  if (sameMonth) {
    const yy = String(startDate.getFullYear()).slice(-2);
    return `${MONTH_SHORT_ID[startDate.getMonth()]} ${yy}`;
  }
  // Rentang lintas bulan: pakai gabungan bulan awal-akhir, dibatasi 31 char (limit Excel)
  const yy1 = String(startDate.getFullYear()).slice(-2);
  const yy2 = String(endDate.getFullYear()).slice(-2);
  return `${MONTH_SHORT_ID[startDate.getMonth()]} ${yy1}-${MONTH_SHORT_ID[endDate.getMonth()]} ${yy2}`;
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
    jenis_pelayanan: row.jenis_pelayanan || null,
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
      jenis_pelayanan,
    } = req.body;

    const staffIds = Array.isArray(staff_it_ids)
      ? staff_it_ids.filter((id) => id !== "" && id != null)
      : [];

    if (
      !tanggal ||
      !pic_id ||
      staffIds.length === 0 ||
      !kategori_id ||
      !isi_helpdesk ||
      !jenis_pelayanan
    ) {
      return res.status(400).json({
        message:
          "Tanggal, PIC, minimal 1 Nama IT, Kategori, Isi Helpdesk, dan Jenis Pelayanan wajib diisi",
      });
    }

    if (!["Pelayanan", "Non Pelayanan"].includes(jenis_pelayanan)) {
      return res.status(400).json({ message: "Jenis Pelayanan tidak valid" });
    }

    const finalStatus = status || "Proses";

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO logbook (tanggal, jam_mulai, jam_selesai, pic_id, staff_it_id, kategori_id, unit_kerja_id, isi_helpdesk, tindakan, status, jenis_pelayanan)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        jenis_pelayanan,
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
      jenis_pelayanan,
    } = req.body;

    const staffIds = Array.isArray(staff_it_ids)
      ? staff_it_ids.filter((id) => id !== "" && id != null)
      : [];

    if (
      !tanggal ||
      !pic_id ||
      staffIds.length === 0 ||
      !kategori_id ||
      !isi_helpdesk ||
      !jenis_pelayanan
    ) {
      return res.status(400).json({
        message:
          "Tanggal, PIC, minimal 1 Nama IT, Kategori, Isi Helpdesk, dan Jenis Pelayanan wajib diisi",
      });
    }

    if (!["Pelayanan", "Non Pelayanan"].includes(jenis_pelayanan)) {
      return res.status(400).json({ message: "Jenis Pelayanan tidak valid" });
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
      `UPDATE logbook SET tanggal=?, jam_mulai=?, jam_selesai=?, pic_id=?, staff_it_id=?, kategori_id=?, unit_kerja_id=?, isi_helpdesk=?, tindakan=?, status=?, jenis_pelayanan=?
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
        jenis_pelayanan,
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

// Export Excel — meniru format "Laporan_Logbook_<Bulan>_<Tahun>.xlsx":
// header biru tua, freeze pane baris pertama, baris TOTAL MENIT di akhir.
router.get("/export/xlsx", async (req, res) => {
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

    sql += " GROUP BY l.id ORDER BY l.tanggal ASC, l.id ASC";

    const [rows] = await pool.query(sql, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetNameFromRange(start, end));

    const columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Tgl", key: "tgl", width: 12 },
      { header: "Nama Kegiatan", key: "nama_kegiatan", width: 53 },
      { header: "Jenis", key: "jenis", width: 12 },
      { header: "waktu mulai pengerjaan", key: "waktu_mulai", width: 21 },
      { header: "waktu selesai pengerjaan", key: "waktu_selesai", width: 22 },
      { header: "waktu selesai (Menit)", key: "menit", width: 19 },
      { header: "PIC", key: "pic", width: 26 },
      { header: "Customer", key: "customer", width: 40 },
      { header: "Kategori", key: "kategori_pelayanan", width: 15 },
    ];
    sheet.columns = columns;

    // Header row: biru tua, teks putih bold, rata tengah
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        size: 11,
        name: "Calibri",
        color: { argb: "FFFFFFFF" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F4E78" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    let totalMenit = 0;
    rows.forEach((row, idx) => {
      const menit = row.total_menit || 0;
      totalMenit += menit;
      const dataRow = sheet.addRow({
        no: idx + 1,
        tgl: formatTanggalExport(row.tanggal),
        nama_kegiatan: row.isi_helpdesk,
        jenis: row.kategori,
        waktu_mulai: formatJamExport(row.jam_mulai),
        waktu_selesai: formatJamExport(row.jam_selesai),
        menit,
        pic: row.nama_it,
        customer: row.nama_pic,
        kategori_pelayanan: row.jenis_pelayanan,
      });

      dataRow.eachCell((cell, colNumber) => {
        cell.font = { size: 11, name: "Calibri" };
        // Kolom "Nama Kegiatan"(3), "PIC"(8), "Customer"(9) rata kiri, sisanya rata tengah
        cell.alignment = {
          horizontal: [3, 8, 9].includes(colNumber) ? "left" : "center",
          vertical: "middle",
        };
      });
      // Kolom Kategori (Pelayanan/Non Pelayanan): bold biru, meniru file contoh
      const kategoriCell = dataRow.getCell(10);
      kategoriCell.font = {
        bold: true,
        size: 10,
        name: "Arial",
        color: { argb: "FF0A53A8" },
      };
    });

    // Baris footer: TOTAL MENIT (merge A:F) + total di kolom G
    const footerRowNumber = sheet.lastRow ? sheet.lastRow.number + 1 : 2;
    sheet.mergeCells(`A${footerRowNumber}:F${footerRowNumber}`);
    const footerLabelCell = sheet.getCell(`A${footerRowNumber}`);
    footerLabelCell.value = "TOTAL MENIT";
    footerLabelCell.font = { bold: true, size: 11, name: "Calibri" };
    footerLabelCell.alignment = { horizontal: "center", vertical: "middle" };

    const footerTotalCell = sheet.getCell(`G${footerRowNumber}`);
    footerTotalCell.value = totalMenit;
    footerTotalCell.font = { bold: true, size: 11, name: "Calibri" };
    footerTotalCell.alignment = { horizontal: "center", vertical: "middle" };

    const filename = `Laporan_Logbook_${start}_sd_${end}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal membuat file Excel" });
  }
});

module.exports = router;