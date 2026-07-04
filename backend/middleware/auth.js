const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Belum login" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, nama, email, role }
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Sesi tidak valid, silakan login ulang" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Anda tidak punya akses ke resource ini" });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
