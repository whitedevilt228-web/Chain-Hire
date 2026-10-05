const { getPool } = require("../config/db");

// 1. Get Jobs with Search & Filter
exports.getJobs = async (req, res) => {
  try {
    const { keyword, location, jobType, page = 1, limit = 9, recruiterId, excludeRecruiterId } = req.query;
    const pool = getPool();

    let whereClause = "WHERE j.isActive = 1";
    const params = [];

    if (recruiterId) {
      whereClause += " AND j.recruiterId = ?";
      params.push(parseInt(recruiterId, 10));
    }

    if (excludeRecruiterId) {
      whereClause += " AND j.recruiterId != ?";
      params.push(parseInt(excludeRecruiterId, 10));
    }

    if (keyword && keyword.trim()) {
      whereClause += " AND (j.title LIKE ? OR j.company LIKE ? OR j.description LIKE ?)";
      const kw = `%${keyword.trim()}%`;
      params.push(kw, kw, kw);
    }

    if (location && location.trim() && location !== "All Locations") {
      whereClause += " AND j.location LIKE ?";
      params.push(`%${location.trim()}%`);
    }

    if (jobType && jobType.trim() && jobType !== "All Types") {
      whereClause += " AND j.jobType = ?";
      params.push(jobType.trim());
    }

    // Count total
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM jobs j ${whereClause}`,
      params
    );
    const totalJobs = countRows[0].total;

    // Pagination
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const queryParams = [...params, parseInt(limit, 10), offset];

    const [jobs] = await pool.query(
      `SELECT j.*, u.fullName as recruiterName, u.email as recruiterEmail,
              (SELECT COUNT(*) FROM job_applications ja WHERE ja.jobId = j.id) as applicationsCount
       FROM jobs j
       JOIN users u ON j.recruiterId = u.id
       ${whereClause}
       ORDER BY j.id DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    return res.json({
      success: true,
      jobs,
      pagination: {
        total: totalJobs,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(totalJobs / parseInt(limit, 10)) || 1,
      },
    });
  } catch (error) {
    console.error("GetJobs Error:", error);
    return res.status(500).json({ success: false, message: "Error loading jobs" });
  }
};

// 2. Get Job by ID
exports.getJobById = async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const pool = getPool();

    const [jobs] = await pool.query(
      `SELECT j.*, u.fullName as recruiterName, u.email as recruiterEmail,
              (SELECT COUNT(*) FROM job_applications ja WHERE ja.jobId = j.id) as applicationsCount
       FROM jobs j
       JOIN users u ON j.recruiterId = u.id
       WHERE j.id = ?`,
      [jobId]
    );

    if (jobs.length === 0) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    return res.json({ success: true, job: jobs[0] });
  } catch (error) {
    console.error("GetJobById Error:", error);
    return res.status(500).json({ success: false, message: "Error fetching job details" });
  }
};

// 3. Post a new Job (Recruiter only)
exports.postJob = async (req, res) => {
  try {
    const { company, title, location, jobType, salaryMin, salaryMax, salaryText, description, requirements, logoBg } = req.body;

    // Use registered recruiter's company or fullName to ensure no rewriting / tampering
    const userCompany = (req.user && req.user.company && req.user.company.trim()) || (req.user && req.user.fullName);
    const finalCompany = userCompany || (company ? company.trim() : "Verified Organization");

    if (!title || !location) {
      return res.status(400).json({ success: false, message: "Job title and location are required" });
    }

    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO jobs (recruiterId, company, title, location, jobType, salaryMin, salaryMax, salaryText, description, requirements, logoBg, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        req.user.id,
        finalCompany,
        title.trim(),
        location.trim(),
        jobType || "Full-time",
        salaryMin ? parseInt(salaryMin, 10) : 0,
        salaryMax ? parseInt(salaryMax, 10) : 0,
        salaryText || "",
        description ? description.trim() : "",
        requirements ? requirements.trim() : "",
        logoBg || "#0F172A",
      ]
    );

    const [newJob] = await pool.query("SELECT * FROM jobs WHERE id = ?", [result.insertId]);

    return res.status(201).json({
      success: true,
      message: "Job posted successfully",
      job: newJob[0],
    });
  } catch (error) {
    console.error("PostJob Error:", error);
    return res.status(500).json({ success: false, message: "Error posting job" });
  }
};

// 4. Apply to a Job (Seeker only)
exports.applyJob = async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const { coverNote } = req.body;
    let resumeUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const pool = getPool();

    // Check if user is recruiter
    if (req.user.role === "recruiter") {
      return res.status(403).json({ success: false, message: "Recruiters cannot apply to jobs" });
    }

    // Check if job exists and is active
    const [jobs] = await pool.query("SELECT * FROM jobs WHERE id = ? AND isActive = 1", [jobId]);
    if (jobs.length === 0) {
      return res.status(404).json({ success: false, message: "Job not found or already closed" });
    }

    // Prevent applying to own job
    if (jobs[0].recruiterId === req.user.id) {
      return res.status(403).json({ success: false, message: "You cannot apply to your own job posting" });
    }

    // Check if already applied
    const [existing] = await pool.query(
      "SELECT id FROM job_applications WHERE jobId = ? AND seekerId = ?",
      [jobId, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "You have already applied to this job" });
    }

    // Insert application
    const [result] = await pool.query(
      `INSERT INTO job_applications (jobId, seekerId, resumeUrl, coverNote, status)
       VALUES (?, ?, ?, ?, 'Applied')`,
      [jobId, req.user.id, resumeUrl, coverNote || ""]
    );

    // Notify recruiter
    await pool.query(
      `INSERT INTO notifications (userId, title, message, type)
       VALUES (?, ?, ?, 'application')`,
      [
        jobs[0].recruiterId,
        "New Job Application Received",
        `${req.user.fullName} applied for ${jobs[0].title} at ${jobs[0].company}.`,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      applicationId: result.insertId,
    });
  } catch (error) {
    console.error("ApplyJob Error:", error);
    return res.status(500).json({ success: false, message: "Error applying to job" });
  }
};

// 5. Get Seeker's Applications (Matches Screenshot 5)
exports.getSeekerApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const pool = getPool();

    let query = `
      SELECT ja.id as applicationId, ja.status, ja.appliedAt, ja.coverNote, ja.resumeUrl,
             j.id as jobId, j.title as jobTitle, j.company, j.location, j.jobType, j.salaryText, j.logoBg,
             u.fullName as recruiterName, u.email as recruiterEmail
      FROM job_applications ja
      JOIN jobs j ON ja.jobId = j.id
      JOIN users u ON j.recruiterId = u.id
      WHERE ja.seekerId = ?
    `;

    const params = [req.user.id];

    if (status && status !== "All Status" && status !== "all") {
      query += " AND ja.status = ?";
      params.push(status);
    }

    query += " ORDER BY ja.id DESC";

    const [applications] = await pool.query(query, params);

    return res.json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error("GetSeekerApplications Error:", error);
    return res.status(500).json({ success: false, message: "Error fetching applications" });
  }
};

// 6. Get Recruiter's Job Applications
exports.getRecruiterApplications = async (req, res) => {
  try {
    const pool = getPool();

    const [applications] = await pool.query(
      `SELECT ja.id as applicationId, ja.status, ja.appliedAt, ja.coverNote, ja.resumeUrl,
              j.id as jobId, j.title as jobTitle, j.company,
              u.id as seekerId, u.fullName as seekerName, u.email as seekerEmail,
              u.phone as seekerPhone, u.walletAddress as seekerWallet, u.avatar as seekerAvatar,
              (SELECT COUNT(*) FROM experiences e WHERE e.userId = u.id AND e.status = 'verified') as verifiedExpCount
       FROM job_applications ja
       JOIN jobs j ON ja.jobId = j.id
       JOIN users u ON ja.seekerId = u.id
       WHERE j.recruiterId = ?
       ORDER BY ja.id DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error("GetRecruiterApplications Error:", error);
    return res.status(500).json({ success: false, message: "Error fetching recruiter applications" });
  }
};

// 7. Update Application Status (Recruiter)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const validStatuses = ["Applied", "Shortlisted", "Rejected", "Hired", "Pending"];
    const matchedStatus = validStatuses.find(s => s.toLowerCase() === (status || "").toLowerCase());
    if (!matchedStatus) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const pool = getPool();
    const [appRows] = await pool.query(
      `SELECT ja.*, j.title, j.company, j.recruiterId, j.id as jobId 
       FROM job_applications ja 
       JOIN jobs j ON ja.jobId = j.id 
       WHERE ja.id = ?`,
      [applicationId]
    );

    if (appRows.length === 0) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (appRows[0].recruiterId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized to update this application" });
    }

    await pool.query("UPDATE job_applications SET status = ? WHERE id = ?", [matchedStatus, applicationId]);

    // If candidate is Hired, automatically deactivate the job posting (remove from active jobs)
    if (matchedStatus.toLowerCase() === "hired") {
      await pool.query("UPDATE jobs SET isActive = 0 WHERE id = ?", [appRows[0].jobId]);
    }

    // Notify seeker
    await pool.query(
      `INSERT INTO notifications (userId, title, message, type)
       VALUES (?, ?, ?, 'application_status')`,
      [
        appRows[0].seekerId,
        `Application Status: ${matchedStatus}`,
        `Your application for ${appRows[0].title} at ${appRows[0].company} has been updated to "${matchedStatus}".`,
      ]
    );

    return res.json({
      success: true,
      message: `Application status updated to ${matchedStatus}${matchedStatus.toLowerCase() === 'hired' ? ' (Job position closed)' : ''}`,
      status: matchedStatus,
    });
  } catch (error) {
    console.error("UpdateApplicationStatus Error:", error);
    return res.status(500).json({ success: false, message: "Error updating application status" });
  }
};
