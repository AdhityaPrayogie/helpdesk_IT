const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();

// ===== KONFIGURASI CORS =====
// Opsi A: Izinkan origin tertentu (localhost + IP)
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.1.49:5173", // sesuaikan dengan IP kamu
];

app.use(
  cors({
    origin: function (origin, callback) {
      // izinkan request tanpa origin (misal dari postman/curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Opsi B (lebih simpel, izinkan semua origin – hanya untuk development)
// app.use(cors({ origin: true, credentials: true }));

// ===== MIDDLEWARE LAINNYA =====
app.use(express.json());
app.use(cookieParser());

// ===== LOGGING (untuk debugging) =====
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url} - dari ${req.ip}`);
  next();
});

// ===== ROUTE UTAMA =====
app.get("/", (req, res) => {
  res.send("IT Logbook API is running");
});

// ===== ROUTE API =====
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/pic", require("./routes/pic"));
app.use("/api/staff-it", require("./routes/staffIt"));
app.use("/api/kategori", require("./routes/kategori"));
app.use("/api/unit-kerja", require("./routes/unitKerja"));
app.use("/api/logbook", require("./routes/logbook"));

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server berjalan di http://192.168.1.49:${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
});
