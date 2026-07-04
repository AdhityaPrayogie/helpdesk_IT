// backend/scripts/seedAdmin.js
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");

async function seed() {
  const email = "superadmin@itlogbook.local";
  const password = "admin123";
  const nama = "Super Administrator";

  const password_hash = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      "INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, 'super_admin')",
      [nama, email, password_hash],
    );
    console.log("Super Admin berhasil dibuat.");
    console.log("Email:", email);
    console.log("Password:", password);
  } catch (err) {
    console.error("Gagal seed:", err.message);
  } finally {
    process.exit();
  }
}

seed();
