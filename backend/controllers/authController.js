const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getPool } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "chainhire_super_secure_secret_jwt_key_2026_x89f";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// 1. Register
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, phone, cnic, role, walletAddress, company } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "Full name, email, and password are required" });
    }

    // Validate Full Name: only alphabets and spaces allowed
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(fullName.trim())) {
      return res.status(400).json({
        success: false,
        message: "Only alphabetic letters (A-Z, a-z)",
      });
    }

    // Validate Password: minimum 8 characters, must have letter, digit, and special character
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const hasAlphabet = /[A-Za-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\\/~`]/.test(password);

    if (!hasAlphabet || !hasDigit || !hasSpecialChar) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one alphabet letter, one number, and one special character",
      });
    }

    // Validate phone format if provided
    if (phone && phone.trim()) {
      const cleanPhone = phone.trim();
      if (!cleanPhone.startsWith("+92")) {
        return res.status(400).json({ success: false, message: "Phone number must start with +92 (e.g. +92 300 1234567)" });
      }
    }

    // Validate CNIC format if provided (exactly 13 digits: 5 - 7 - 1)
    if (cnic && cnic.trim()) {
      const cleanCnic = cnic.trim();
      if (!/^\d{5}-\d{7}-\d{1}$/.test(cleanCnic)) {
        return res.status(400).json({ success: false, message: "CNIC must be exactly 13 digits in format: 12345-1234567-1" });
      }
    }

    const validRoles = ["jobSeeker", "recruiter", "admin"];
    const userRole = validRoles.includes(role) ? role : "jobSeeker";

    const pool = getPool();
    // Check if email already registered
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Email is already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      `INSERT INTO users (fullName, email, password, phone, cnic, role, company, walletAddress)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName.trim(),
        email.toLowerCase().trim(),
        hashedPassword,
        phone || "",
        cnic || "",
        userRole,
        company ? company.trim() : "",
        walletAddress || null,
      ]
    );

    const newUser = {
      id: result.insertId,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      role: userRole,
      company: company ? company.trim() : "",
      walletAddress: walletAddress || null,
    };

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: newUser,
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error during registration" });
  }
};

// 2. Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const pool = getPool();
    const [users] = await pool.query(
      "SELECT id, fullName, email, password, role, walletAddress, headline, bio, location, avatar, isBlocked FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const user = users[0];

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account has been blocked by the administrator." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    delete user.password;
    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error during login" });
  }
};

// 3. Get Current User Info with Metrics
exports.getMe = async (req, res) => {
  try {
    const pool = getPool();
    const [users] = await pool.query(
      "SELECT id, fullName, email, phone, cnic, role, company, walletAddress, headline, bio, location, avatar, isBlocked, createdAt FROM users WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = users[0];

    // Calculate metrics for jobSeeker
    let metrics = {};
    if (user.role === "jobSeeker") {
      const [expCounts] = await pool.query(
        `SELECT 
           COUNT(*) as totalExperiences,
           SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verifiedCount,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
           SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedCount
         FROM experiences WHERE userId = ?`,
        [user.id]
      );
      metrics = expCounts[0] || { totalExperiences: 0, verifiedCount: 0, pendingCount: 0, rejectedCount: 0 };
    }

    return res.json({
      success: true,
      user,
      metrics,
    });
  } catch (error) {
    console.error("GetMe Error:", error);
    return res.status(500).json({ success: false, message: "Error fetching user profile" });
  }
};

// 3b. Get User Profile by ID (Public / Peer View)
exports.getUserById = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const pool = getPool();
    const [users] = await pool.query(
      "SELECT id, fullName, email, phone, role, company, walletAddress, headline, bio, location, avatar, isBlocked, createdAt FROM users WHERE id = ?",
      [targetId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = users[0];

    // Calculate metrics for jobSeeker
    let metrics = {};
    if (user.role === "jobSeeker") {
      const [expCounts] = await pool.query(
        `SELECT 
           COUNT(*) as totalExperiences,
           SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verifiedCount,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
           SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedCount
         FROM experiences WHERE userId = ?`,
        [user.id]
      );
      metrics = expCounts[0] || { totalExperiences: 0, verifiedCount: 0, pendingCount: 0, rejectedCount: 0 };
    }

    return res.json({
      success: true,
      user,
      metrics,
    });
  } catch (error) {
    console.error("GetUserById Error:", error);
    return res.status(500).json({ success: false, message: "Error fetching user profile" });
  }
};

// 4. Update Profile Information
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, location, headline, bio, walletAddress, company } = req.body;
    let avatarUrl = undefined;

    if (req.file) {
      avatarUrl = `/uploads/${req.file.filename}`;
    }

    const pool = getPool();
    const fields = [];
    const values = [];

    if (fullName !== undefined) {
      if (!/^[A-Za-z\s]+$/.test(fullName.trim())) {
        return res.status(400).json({
          success: false,
          message: "Only alphabetic letters (A-Z, a-z)",
        });
      }
      fields.push("fullName = ?");
      values.push(fullName.trim());
    }
    if (phone !== undefined) { fields.push("phone = ?"); values.push(phone); }
    if (location !== undefined) { fields.push("location = ?"); values.push(location); }
    if (headline !== undefined) { fields.push("headline = ?"); values.push(headline); }
    if (bio !== undefined) { fields.push("bio = ?"); values.push(bio); }
    if (company !== undefined) { fields.push("company = ?"); values.push(company); }
    if (walletAddress !== undefined) { fields.push("walletAddress = ?"); values.push(walletAddress); }
    if (avatarUrl !== undefined) { fields.push("avatar = ?"); values.push(avatarUrl); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No fields provided to update" });
    }

    values.push(req.user.id);

    await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

    const [updatedUsers] = await pool.query(
      "SELECT id, fullName, email, phone, cnic, role, walletAddress, headline, bio, location, avatar FROM users WHERE id = ?",
      [req.user.id]
    );

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUsers[0],
    });
  } catch (error) {
    console.error("UpdateProfile Error:", error);
    return res.status(500).json({ success: false, message: "Error updating profile" });
  }
};

// 5. Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "New passwords do not match" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters long" });
    }

    const hasAlphabet = /[A-Za-z]/.test(newPassword);
    const hasDigit = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\\/~`]/.test(newPassword);

    if (!hasAlphabet || !hasDigit || !hasSpecialChar) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least one alphabet letter, one number, and one special character",
      });
    }

    const pool = getPool();
    const [users] = await pool.query("SELECT password FROM users WHERE id = ?", [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, req.user.id]);

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("ChangePassword Error:", error);
    return res.status(500).json({ success: false, message: "Error changing password" });
  }
};

// 6. Connect / Disconnect Wallet
exports.updateWallet = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const pool = getPool();

    await pool.query("UPDATE users SET walletAddress = ? WHERE id = ?", [walletAddress || null, req.user.id]);

    return res.json({
      success: true,
      message: walletAddress ? "Wallet connected successfully" : "Wallet disconnected",
      walletAddress: walletAddress || null,
    });
  } catch (error) {
    console.error("UpdateWallet Error:", error);
    return res.status(500).json({ success: false, message: "Error updating wallet" });
  }
};

// 7. Delete Account (Danger Zone)
exports.deleteAccount = async (req, res) => {
  try {
    const pool = getPool();
    await pool.query("DELETE FROM users WHERE id = ?", [req.user.id]);
    return res.json({ success: true, message: "Account deleted permanently" });
  } catch (error) {
    console.error("DeleteAccount Error:", error);
    return res.status(500).json({ success: false, message: "Error deleting account" });
  }
};
