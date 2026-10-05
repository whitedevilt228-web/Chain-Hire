const { getPool } = require("../config/db");

// 1. Get experiences of logged-in seeker or specified user
exports.getExperiences = async (req, res) => {
  try {
    const targetUserId = req.query.userId ? parseInt(req.query.userId, 10) : req.user.id;
    const pool = getPool();

    const [experiences] = await pool.query(
      `SELECT e.*, u.fullName as seekerName, u.walletAddress as seekerWallet
       FROM experiences e
       JOIN users u ON e.userId = u.id
       WHERE e.userId = ?
       ORDER BY e.id DESC`,
      [targetUserId]
    );

    return res.json({
      success: true,
      experiences,
    });
  } catch (error) {
    console.error("GetExperiences Error:", error);
    return res.status(500).json({ success: false, message: "Error fetching experiences" });
  }
};

// 2. Add new experience
exports.addExperience = async (req, res) => {
  try {
    const { company, title, startDate, endDate, isCurrent, description } = req.body;

    if (!company || !title || !startDate) {
      return res.status(400).json({ success: false, message: "Company, title, and start date are required" });
    }

    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO experiences (userId, company, title, startDate, endDate, isCurrent, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        company.trim(),
        title.trim(),
        startDate.trim(),
        isCurrent ? null : (endDate ? endDate.trim() : null),
        isCurrent ? 1 : 0,
        description ? description.trim() : "",
      ]
    );

    const [newExp] = await pool.query("SELECT * FROM experiences WHERE id = ?", [result.insertId]);

    return res.status(201).json({
      success: true,
      message: "Experience added successfully",
      experience: newExp[0],
    });
  } catch (error) {
    console.error("AddExperience Error:", error);
    return res.status(500).json({ success: false, message: "Error creating experience" });
  }
};

// 3. Update an experience
exports.updateExperience = async (req, res) => {
  try {
    const expId = parseInt(req.params.id, 10);
    const { company, title, startDate, endDate, isCurrent, description } = req.body;

    const pool = getPool();
    const [existing] = await pool.query("SELECT * FROM experiences WHERE id = ? AND userId = ?", [expId, req.user.id]);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Experience not found or unauthorized" });
    }

    await pool.query(
      `UPDATE experiences
       SET company = ?, title = ?, startDate = ?, endDate = ?, isCurrent = ?, description = ?
       WHERE id = ?`,
      [
        company || existing[0].company,
        title || existing[0].title,
        startDate || existing[0].startDate,
        isCurrent ? null : (endDate !== undefined ? endDate : existing[0].endDate),
        isCurrent !== undefined ? (isCurrent ? 1 : 0) : existing[0].isCurrent,
        description !== undefined ? description : existing[0].description,
        expId,
      ]
    );

    const [updated] = await pool.query("SELECT * FROM experiences WHERE id = ?", [expId]);

    return res.json({
      success: true,
      message: "Experience updated successfully",
      experience: updated[0],
    });
  } catch (error) {
    console.error("UpdateExperience Error:", error);
    return res.status(500).json({ success: false, message: "Error updating experience" });
  }
};

// 4. Delete an experience
exports.deleteExperience = async (req, res) => {
  try {
    const expId = parseInt(req.params.id, 10);
    const pool = getPool();

    const [existing] = await pool.query("SELECT * FROM experiences WHERE id = ? AND userId = ?", [expId, req.user.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Experience not found or unauthorized" });
    }

    await pool.query("DELETE FROM experiences WHERE id = ?", [expId]);

    return res.json({
      success: true,
      message: "Experience removed successfully",
    });
  } catch (error) {
    console.error("DeleteExperience Error:", error);
    return res.status(500).json({ success: false, message: "Error deleting experience" });
  }
};

// 5. Get list of registered recruiters with company names
exports.getRegisteredRecruiters = async (req, res) => {
  try {
    const pool = getPool();
    const [recruiters] = await pool.query(
      `SELECT u.id, u.fullName, u.email,
              COALESCE(NULLIF(u.company, ''), NULLIF(j.company, ''), NULLIF(u.headline, ''), CONCAT(u.fullName, ' Org')) AS company,
              u.avatar
       FROM users u
       LEFT JOIN (
         SELECT recruiterId, company FROM jobs GROUP BY recruiterId
       ) j ON u.id = j.recruiterId
       WHERE u.role = 'recruiter' AND u.isBlocked = 0
       ORDER BY u.id DESC`
    );

    return res.json({
      success: true,
      recruiters,
    });
  } catch (error) {
    console.error("GetRegisteredRecruiters Error:", error);
    return res.status(500).json({ success: false, message: "Error fetching recruiters" });
  }
};

