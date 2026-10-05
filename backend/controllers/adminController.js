const { getPool } = require("../config/db");

// 1. Get Platform Stats (Matching Screenshot 3)
exports.getStats = async (req, res) => {
  try {
    const pool = getPool();

    // Total Users
    const [userCount] = await pool.query("SELECT COUNT(*) as total FROM users");
    // Verified Credentials
    const [verifiedCount] = await pool.query("SELECT COUNT(*) as total FROM experiences WHERE status = 'verified'");
    // Active Jobs
    const [jobCount] = await pool.query("SELECT COUNT(*) as total FROM jobs WHERE isActive = 1");
    // Blocked Accounts
    const [blockedCount] = await pool.query("SELECT COUNT(*) as total FROM users WHERE isBlocked = 1");

    return res.json({
      success: true,
      stats: {
        totalUsers: userCount[0].total,
        totalUsersChange: "+12.4% from last month",
        verifiedCredentials: verifiedCount[0].total,
        verifiedCredentialsChange: "+8.7% from last month",
        activeJobs: jobCount[0].total,
        activeJobsChange: "+5.3% from last month",
        blockedAccounts: blockedCount[0].total,
        blockedAccountsChange: "-11.2% from last month",
      },
    });
  } catch (error) {
    console.error("GetAdminStats Error:", error);
    return res.status(500).json({ success: false, message: "Error loading admin stats" });
  }
};

// 2. Get Users List with Search & Role Filter
exports.getUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    const pool = getPool();

    let query = "SELECT id, fullName, email, role, phone, cnic, walletAddress, isBlocked, createdAt FROM users WHERE 1=1";
    const params = [];

    if (search && search.trim()) {
      query += " AND (fullName LIKE ? OR email LIKE ?)";
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (role && role !== "All Roles" && role !== "all") {
      query += " AND role = ?";
      params.push(role);
    }

    query += " ORDER BY id DESC";

    const [users] = await pool.query(query, params);

    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("GetAdminUsers Error:", error);
    return res.status(500).json({ success: false, message: "Error loading users" });
  }
};

// 3. Block or Unblock User
exports.toggleBlockUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const pool = getPool();

    // Prevent blocking self
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot block your own admin account" });
    }

    const [users] = await pool.query("SELECT id, isBlocked, fullName, email FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const currentStatus = users[0].isBlocked;
    const newStatus = currentStatus ? 0 : 1;

    await pool.query("UPDATE users SET isBlocked = ? WHERE id = ?", [newStatus, userId]);

    return res.json({
      success: true,
      message: newStatus ? "User has been blocked" : "User has been unblocked",
      isBlocked: newStatus,
    });
  } catch (error) {
    console.error("ToggleBlockUser Error:", error);
    return res.status(500).json({ success: false, message: "Error updating user status" });
  }
};
