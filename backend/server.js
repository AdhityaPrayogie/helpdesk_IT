const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const app = express();
app.set("trust proxy", 1);

// ===== KONFIGURASI CORS =====
const allowedOrigins = (
  process.env.FRONTEND_URL ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000"
)
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use((req, res, next) => {
  if (req.headers.origin) {
    console.log("Origin masuk:", req.headers.origin);
  }
  next();
});

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, "");
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith(".ngrok-free.app") ||
        cleanOrigin.endsWith(".ngrok.io") ||
        cleanOrigin.startsWith("http://localhost:") ||
        cleanOrigin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
  }),
);

// ===== MIDDLEWARE LAINNYA =====
app.use(express.json());
app.use(cookieParser());

// ===== LOGGING (untuk debugging) =====
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url} - dari ${req.ip}`);
  next();
});

// ===== HEALTH CHECK (opsional, untuk cek API hidup tanpa ganggu root path) =====
app.get("/api/health", (req, res) => {
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

// ===== SERVE FRONTEND (hasil `npm run build`, di-copy ke folder /public) =====
app.use(express.static(path.join(__dirname, "public")));

// Semua request selain /api diarahkan ke index.html (routing SPA React)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server backend berjalan di:`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- LAN:   http://192.168.1.202:${PORT}`);
});