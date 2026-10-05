const { getPool } = require("../config/db");

// 1. Job Seeker requests verification
exports.requestVerification = async (req, res) => {
  try {
    const { experienceId, recruiterId, recruiterEmail } = req.body;
    const pool = getPool();

    // Verify experience ownership
    const [experiences] = await pool.query(
      "SELECT * FROM experiences WHERE id = ? AND userId = ?",
      [experienceId, req.user.id]
    );

    if (experiences.length === 0) {
      return res.status(404).json({ success: false, message: "Experience not found or unauthorized" });
    }

    const exp = experiences[0];
    if (exp.status === "verified") {
      return res.status(400).json({ success: false, message: "This experience is already verified" });
    }

    // Identify target recruiter
    let targetRecruiterId = recruiterId;
    if (!targetRecruiterId && recruiterEmail) {
      const [recs] = await pool.query("SELECT id FROM users WHERE email = ? AND role = 'recruiter'", [
        recruiterEmail.toLowerCase().trim(),
      ]);
      if (recs.length > 0) {
        targetRecruiterId = recs[0].id;
      }
    }

    // Fallback to finding recruiter matching company name or first available recruiter
    if (!targetRecruiterId) {
      const [companyRecs] = await pool.query(
        "SELECT id FROM users WHERE role = 'recruiter' AND (headline LIKE ? OR bio LIKE ?) LIMIT 1",
        [`%${exp.company}%`, `%${exp.company}%`]
      );
      if (companyRecs.length > 0) {
        targetRecruiterId = companyRecs[0].id;
      } else {
        const [anyRec] = await pool.query("SELECT id FROM users WHERE role = 'recruiter' LIMIT 1");
        if (anyRec.length > 0) {
          targetRecruiterId = anyRec[0].id;
        } else {
          return res.status(400).json({ success: false, message: "No recruiter available to verify at this time" });
        }
      }
    }

    // Check if an open request already exists
    const [existingReq] = await pool.query(
      "SELECT id FROM verification_requests WHERE experienceId = ? AND status = 'pending'",
      [experienceId]
    );

    if (existingReq.length > 0) {
      return res.status(400).json({ success: false, message: "A pending verification request already exists for this experience" });
    }

    // Insert verification request
    const [insertResult] = await pool.query(
      `INSERT INTO verification_requests (experienceId, seekerId, recruiterId, status)
       VALUES (?, ?, ?, 'pending')`,
      [experienceId, req.user.id, targetRecruiterId]
    );

    // Update experience status to pending
    await pool.query("UPDATE experiences SET status = 'pending' WHERE id = ?", [experienceId]);

    // Create notification for the recruiter
    await pool.query(
      `INSERT INTO notifications (userId, title, message, type)
       VALUES (?, ?, ?, 'verification')`,
      [
        targetRecruiterId,
        "New Verification Request",
        `${req.user.fullName} requested employment verification for role "${exp.title}" at "${exp.company}".`,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Verification request submitted successfully to recruiter",
      requestId: insertResult.insertId,
    });
  } catch (error) {
    console.error("RequestVerification Error:", error);
    return res.status(500).json({ success: false, message: "Error submitting verification request" });
  }
};

// 2. Recruiter Verification Inbox (Pending requests)
exports.getRecruiterInbox = async (req, res) => {
  try {
    const pool = getPool();
    const [requests] = await pool.query(
      `SELECT vr.id as requestId, vr.status as requestStatus, vr.remarks, vr.txHash, vr.createdAt as requestedAt,
              e.id as experienceId, e.company, e.title, e.startDate, e.endDate, e.isCurrent, e.description,
              u.id as seekerId, u.fullName as seekerName, u.email as seekerEmail, u.phone as seekerPhone,
              u.walletAddress as seekerWallet, u.avatar as seekerAvatar
       FROM verification_requests vr
       JOIN experiences e ON vr.experienceId = e.id
       JOIN users u ON vr.seekerId = u.id
       WHERE vr.recruiterId = ? OR vr.recruiterId IS NULL
       ORDER BY vr.id DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("GetRecruiterInbox Error:", error);
    return res.status(500).json({ success: false, message: "Error loading verification requests" });
  }
};

// 3. Recruiter Approves Verification (With MetaMask txHash)
exports.approveVerification = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { txHash, remarks } = req.body;

    if (!txHash) {
      return res.status(400).json({ success: false, message: "Transaction hash (txHash) from blockchain is required" });
    }

    const pool = getPool();
    const [reqRows] = await pool.query(
      "SELECT vr.*, e.company, e.title, e.userId as seekerId FROM verification_requests vr JOIN experiences e ON vr.experienceId = e.id WHERE vr.id = ?",
      [requestId]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, message: "Verification request not found" });
    }

    const verificationReq = reqRows[0];

    // Update request status
    await pool.query(
      "UPDATE verification_requests SET status = 'approved', txHash = ?, remarks = ? WHERE id = ?",
      [txHash, remarks || "Verified on blockchain", requestId]
    );

    // Update experience record
    await pool.query(
      `UPDATE experiences 
       SET status = 'verified', 
           verifiedBy = ?, 
           verifierName = ?, 
           verifierCompany = ?, 
           txHash = ?
       WHERE id = ?`,
      [
        req.user.id,
        req.user.fullName,
        req.user.headline || "ChainHire Partner",
        txHash,
        verificationReq.experienceId,
      ]
    );

    // Notify seeker
    await pool.query(
      `INSERT INTO notifications (userId, title, message, type)
       VALUES (?, ?, ?, 'verified')`,
      [
        verificationReq.seekerId,
        "Credential Verified On-Chain! 🎉",
        `Your experience "${verificationReq.title}" at "${verificationReq.company}" was cryptographically verified by ${req.user.fullName}. TxHash: ${txHash.slice(0, 10)}...`,
      ]
    );

    return res.json({
      success: true,
      message: "Experience verified successfully on blockchain and recorded!",
      txHash,
    });
  } catch (error) {
    console.error("ApproveVerification Error:", error);
    return res.status(500).json({ success: false, message: "Error approving verification" });
  }
};

// 4. Recruiter Rejects Verification
exports.rejectVerification = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({ success: false, message: "Rejection remarks are required" });
    }

    const pool = getPool();
    const [reqRows] = await pool.query(
      "SELECT vr.*, e.company, e.title, e.userId as seekerId FROM verification_requests vr JOIN experiences e ON vr.experienceId = e.id WHERE vr.id = ?",
      [requestId]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, message: "Verification request not found" });
    }

    const verificationReq = reqRows[0];

    // Update request status
    await pool.query(
      "UPDATE verification_requests SET status = 'rejected', remarks = ? WHERE id = ?",
      [remarks, requestId]
    );

    // Update experience status
    await pool.query("UPDATE experiences SET status = 'rejected' WHERE id = ?", [verificationReq.experienceId]);

    // Notify seeker
    await pool.query(
      `INSERT INTO notifications (userId, title, message, type)
       VALUES (?, ?, ?, 'rejected')`,
      [
        verificationReq.seekerId,
        "Verification Request Update",
        `Your verification request for "${verificationReq.title}" at "${verificationReq.company}" was not approved. Remarks: ${remarks}`,
      ]
    );

    return res.json({
      success: true,
      message: "Verification request rejected with remarks",
    });
  } catch (error) {
    console.error("RejectVerification Error:", error);
    return res.status(500).json({ success: false, message: "Error rejecting verification" });
  }
};

// 5. Get Verified Credentials (Contracts / Ledger Page)
exports.getVerifiedContracts = async (req, res) => {
  try {
    const pool = getPool();
    let query = `
      SELECT e.id as experienceId, e.company, e.title, e.startDate, e.endDate, e.txHash, e.createdAt as recordDate,
             u.id as candidateId, u.fullName as candidateName, u.email as candidateEmail, u.walletAddress as candidateWallet,
             v.id as verifierId, v.fullName as verifierName, v.walletAddress as verifierWallet
      FROM experiences e
      JOIN users u ON e.userId = u.id
      LEFT JOIN users v ON e.verifiedBy = v.id
      WHERE e.status = 'verified' AND e.txHash IS NOT NULL
    `;

    const params = [];
    if (req.user.role === "jobSeeker") {
      query += " AND e.userId = ?";
      params.push(req.user.id);
    }

    query += " ORDER BY e.id DESC";

    const [contracts] = await pool.query(query, params);

    return res.json({
      success: true,
      contracts,
    });
  } catch (error) {
    console.error("GetVerifiedContracts Error:", error);
    return res.status(500).json({ success: false, message: "Error fetching verified contracts" });
  }
};
