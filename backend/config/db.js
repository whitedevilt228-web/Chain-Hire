const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "chainhire_db",
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
};

let pool = null;

async function initDB() {
  try {
    // Connect without database to ensure DB exists
    const rootConn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConn.end();

    // Now establish connection pool with target database
    pool = mysql.createPool(dbConfig);

    // Create tables
    await createTables();
    console.log("✅ MySQL Database connected and tables verified:", dbConfig.database);
    return pool;
  } catch (error) {
    console.error("❌ MySQL initialization error:", error.message);
    throw error;
  }
}

async function createTables() {
  if (!pool) return;

  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fullName VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(30),
      cnic VARCHAR(40),
      role ENUM('jobSeeker', 'recruiter', 'admin') NOT NULL DEFAULT 'jobSeeker',
      company VARCHAR(120) DEFAULT '',
      walletAddress VARCHAR(60) DEFAULT NULL,
      headline VARCHAR(255) DEFAULT '',
      bio TEXT,
      location VARCHAR(120) DEFAULT '',
      avatar VARCHAR(255) DEFAULT '',
      isBlocked TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const experiencesTable = `
    CREATE TABLE IF NOT EXISTS experiences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      company VARCHAR(120) NOT NULL,
      title VARCHAR(120) NOT NULL,
      startDate VARCHAR(30) NOT NULL,
      endDate VARCHAR(30),
      isCurrent TINYINT(1) DEFAULT 0,
      description TEXT,
      status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
      verifiedBy INT DEFAULT NULL,
      verifierName VARCHAR(120) DEFAULT NULL,
      verifierCompany VARCHAR(120) DEFAULT NULL,
      txHash VARCHAR(100) DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const verificationRequestsTable = `
    CREATE TABLE IF NOT EXISTS verification_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      experienceId INT NOT NULL,
      seekerId INT NOT NULL,
      recruiterId INT NOT NULL,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      remarks TEXT,
      txHash VARCHAR(100) DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (experienceId) REFERENCES experiences(id) ON DELETE CASCADE,
      FOREIGN KEY (seekerId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recruiterId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const jobsTable = `
    CREATE TABLE IF NOT EXISTS jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recruiterId INT NOT NULL,
      company VARCHAR(120) NOT NULL,
      title VARCHAR(120) NOT NULL,
      location VARCHAR(120) NOT NULL,
      jobType VARCHAR(40) NOT NULL DEFAULT 'Full-time',
      salaryMin INT DEFAULT 0,
      salaryMax INT DEFAULT 0,
      salaryText VARCHAR(100) DEFAULT '',
      description TEXT,
      requirements TEXT,
      logoBg VARCHAR(30) DEFAULT '#0F172A',
      isActive TINYINT(1) DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recruiterId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const jobApplicationsTable = `
    CREATE TABLE IF NOT EXISTS job_applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      jobId INT NOT NULL,
      seekerId INT NOT NULL,
      resumeUrl VARCHAR(255),
      coverNote TEXT,
      status ENUM('Applied', 'Shortlisted', 'Rejected', 'Hired') DEFAULT 'Applied',
      appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (seekerId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const notificationsTable = `
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      title VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(40) DEFAULT 'system',
      isRead TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const chatMessagesTable = `
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      senderId INT NOT NULL,
      receiverId INT NOT NULL,
      message TEXT NOT NULL,
      isRead TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await pool.query(usersTable);
  await pool.query(experiencesTable);
  await pool.query(verificationRequestsTable);
  await pool.query(jobsTable);
  await pool.query(jobApplicationsTable);
  await pool.query(notificationsTable);
  await pool.query(chatMessagesTable);

  // Safe migrations for newly added columns
  try {
    await pool.query("ALTER TABLE users ADD COLUMN company VARCHAR(120) DEFAULT ''");
  } catch (e) {
    // Column already exists
  }

  // Ensure default admin user exists so admin panel can be accessed anytime
  try {
    const [adminCheck] = await pool.query("SELECT id FROM users WHERE email = 'admin@chainhire.io' OR role = 'admin' LIMIT 1");
    if (adminCheck.length === 0) {
      const bcrypt = require("bcryptjs");
      const hash = await bcrypt.hash("password123", 10);
      await pool.query(
        `INSERT INTO users (fullName, email, password, phone, cnic, role, walletAddress, headline, location, isBlocked)
         VALUES ('ChainHire Admin', 'admin@chainhire.io', ?, '+92 300 1234567', '42101-9988776-1', 'admin', '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7', 'Global Platform Administrator', 'Islamabad, Pakistan', 0)`,
        [hash]
      );
      console.log("👑 Default Admin account created: admin@chainhire.io (password: password123)");
    }
  } catch (err) {
    console.error("Error ensuring admin user:", err);
  }
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

module.exports = {
  initDB,
  getPool,
};
