const jwt = require("jsonwebtoken");
const { getPool } = require("../config/db");

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authorization token required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "chainhire_super_secure_secret_jwt_key_2026_x89f");

    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id, fullName, email, role, walletAddress, isBlocked, avatar FROM users WHERE id = ?",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }

    const user = rows[0];
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Account is blocked. Please contact support." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

module.exports = { authenticate };
