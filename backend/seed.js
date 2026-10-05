const bcrypt = require("bcryptjs");
const { initDB, getPool } = require("./config/db");

async function seed() {
  console.log("🌱 Starting ChainHire 2.0 Database Seeder...");
  await initDB();
  const pool = getPool();

  // Clear existing records to ensure idempotent clean seed
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  await pool.query("TRUNCATE TABLE chat_messages");
  await pool.query("TRUNCATE TABLE notifications");
  await pool.query("TRUNCATE TABLE job_applications");
  await pool.query("TRUNCATE TABLE verification_requests");
  await pool.query("TRUNCATE TABLE experiences");
  await pool.query("TRUNCATE TABLE jobs");
  await pool.query("TRUNCATE TABLE users");
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");

  const salt = await bcrypt.genSalt(10);
  const commonPassword = await bcrypt.hash("password123", salt);

  console.log("Creating demo users...");
  // 1. Admin
  const [adminResult] = await pool.query(
    `INSERT INTO users (fullName, email, password, phone, cnic, role, walletAddress, headline, location, isBlocked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "ChainHire Admin",
      "admin@chainhire.io",
      commonPassword,
      "+1 (800) 555-0199",
      "42101-9988776-1",
      "admin",
      "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      "Global Platform Administrator",
      "San Francisco, CA",
      0,
    ]
  );
  const adminId = adminResult.insertId;

  // 2. Job Seeker (Alex Morgan - from UI mockups)
  const [seekerResult] = await pool.query(
    `INSERT INTO users (fullName, email, password, phone, cnic, role, walletAddress, headline, bio, location, isBlocked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Alex Morgan",
      "alex.morgan@example.com",
      commonPassword,
      "+1 (555) 123-4567",
      "35202-1234567-3",
      "jobSeeker",
      "0x7A3fBb9e5cD4A1F2e9cB2D7aF8e6d4C9bA1F3cB2",
      "Full Stack Developer | Blockchain & Web3 Enthusiast",
      "Passionate full stack developer with 4+ years of experience building decentralized applications and scalable web solutions. Always learning, always building.",
      "San Francisco, CA, USA",
      0,
    ]
  );
  const alexId = seekerResult.insertId;

  // 3. Recruiter 1 (Sophia Lee - Employer from UI mockups)
  const [recruiter1Result] = await pool.query(
    `INSERT INTO users (fullName, email, password, phone, cnic, role, walletAddress, headline, bio, location, isBlocked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Sophia Lee",
      "sophia.lee@chainhire.io",
      commonPassword,
      "+1 (555) 345-6789",
      "35201-9876543-1",
      "recruiter",
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      "Head of Talent Acquisition at BlockVentures",
      "Scaling elite Web3 engineering and cryptography teams.",
      "New York, NY",
      0,
    ]
  );
  const sophiaId = recruiter1Result.insertId;

  // 4. Recruiter 2 (James Patel - Verifier from UI mockups)
  const [recruiter2Result] = await pool.query(
    `INSERT INTO users (fullName, email, password, phone, cnic, role, walletAddress, headline, bio, location, isBlocked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "James Patel",
      "james.patel@chainhire.io",
      commonPassword,
      "+1 (555) 765-4321",
      "35201-4455667-5",
      "recruiter",
      "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      "Lead Technical Verifier & Partner at DeFi Labs",
      "Verifying verified on-chain talent credentials for decentralized protocols.",
      "London, UK",
      0,
    ]
  );
  const jamesId = recruiter2Result.insertId;

  // 5. Blocked Seeker (Maria Garcia from UI mockup)
  await pool.query(
    `INSERT INTO users (fullName, email, password, phone, cnic, role, walletAddress, headline, location, isBlocked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Maria Garcia",
      "maria.garcia@chainhire.io",
      commonPassword,
      "+1 (555) 234-5678",
      "35202-7788990-9",
      "jobSeeker",
      "0x9965507D1a55bcC2695C58ba16FB37d819B0A4df",
      "Smart Contract Auditor",
      "Madrid, Spain",
      1, // Blocked
    ]
  );

  // 6. Blocked Employer (Daniel Kim from UI mockup)
  await pool.query(
    `INSERT INTO users (fullName, email, password, phone, cnic, role, walletAddress, headline, location, isBlocked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Daniel Kim",
      "daniel.kim@chainhire.io",
      commonPassword,
      "+1 (555) 876-5432",
      "35201-1122334-4",
      "recruiter",
      "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
      "Managing Director at VentureBlock",
      "Seoul, South Korea",
      1, // Blocked
    ]
  );

  console.log("Creating experiences for Alex Morgan...");
  // Experience 1 (Verified)
  const [exp1] = await pool.query(
    `INSERT INTO experiences (userId, company, title, startDate, endDate, isCurrent, description, status, verifiedBy, verifierName, verifierCompany, txHash)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?, ?, ?)`,
    [
      alexId,
      "BlockVentures",
      "Senior Full Stack Developer",
      "Jan 2023",
      "Present",
      1,
      "Built and maintained decentralized web applications using React, Node.js, and Solidity. Improved gas efficiency by 28%.",
      sophiaId,
      "Sophia Lee",
      "BlockVentures",
      "0x3f7a1b8c2d9e4a5f6b7c8d9e0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
    ]
  );

  // Experience 2 (Pending verification - for recruiter inbox)
  const [exp2] = await pool.query(
    `INSERT INTO experiences (userId, company, title, startDate, endDate, isCurrent, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      alexId,
      "DeFi Labs",
      "Blockchain Developer",
      "Jun 2021",
      "Dec 2022",
      0,
      "Developed smart contracts and integrated front-end with Web3 providers. Worked with Hardhat and Ethers.js.",
    ]
  );

  // Experience 3 (Verified)
  await pool.query(
    `INSERT INTO experiences (userId, company, title, startDate, endDate, isCurrent, description, status, verifiedBy, verifierName, verifierCompany, txHash)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?, ?, ?)`,
    [
      alexId,
      "TechSolutions Inc.",
      "Software Engineer",
      "May 2019",
      "May 2021",
      0,
      "Developed and maintained web applications using JavaScript, TypeScript, and AWS services.",
      jamesId,
      "James Patel",
      "TechSolutions Inc.",
      "0x8e2b4c6d8a0f1e3c5a7b9d1f3b5d7f9a1c3e5a7b9d1f3b5d7f9a1c3e5a7b9d1f",
    ]
  );

  console.log("Creating verification request for DeFi Labs...");
  await pool.query(
    `INSERT INTO verification_requests (experienceId, seekerId, recruiterId, status, remarks)
     VALUES (?, ?, ?, 'pending', 'Awaiting cryptographic signature on blockchain')`,
    [exp2.insertId, alexId, jamesId]
  );

  console.log("Creating jobs...");
  const sampleJobs = [
    {
      recruiterId: jamesId,
      company: "DeFi Labs",
      title: "Smart Contract Engineer",
      location: "Remote (Worldwide)",
      jobType: "Full-time",
      salaryMin: 120000,
      salaryMax: 160000,
      salaryText: "$120,000 – $160,000",
      logoBg: "#0F172A",
      description: "Architect and audit EVM smart contracts for next-generation automated market maker and lending protocols.",
      requirements: "Solid understanding of Solidity 0.8+, gas optimization techniques, Hardhat/Foundry, and DeFi math models.",
    },
    {
      recruiterId: sophiaId,
      company: "LayerZero Labs",
      title: "Protocol Engineer",
      location: "Singapore (Hybrid)",
      jobType: "Full-time",
      salaryMin: 110000,
      salaryMax: 150000,
      salaryText: "$110,000 – $150,000",
      logoBg: "#1E293B",
      description: "Build ultra-secure cross-chain messaging primitives and endpoint relayers connecting 50+ blockchains.",
      requirements: "Experience with distributed consensus, cross-chain messaging, Go/Rust/Solidity, and cryptographic primitives.",
    },
    {
      recruiterId: sophiaId,
      company: "Aave",
      title: "Frontend Developer",
      location: "Remote (Europe)",
      jobType: "Full-time",
      salaryMin: 90000,
      salaryMax: 130000,
      salaryText: "$90,000 – $130,000",
      logoBg: "#059669",
      description: "Develop high-performance Web3 frontends, interacting with smart contracts through Ethers.js and modern JavaScript.",
      requirements: "Proficient with HTML5, modern CSS, Vanilla JS, Ethers.js v6, and decentralized wallet connect protocols.",
    },
    {
      recruiterId: jamesId,
      company: "Chainlink",
      title: "Backend Engineer",
      location: "New York, USA (Hybrid)",
      jobType: "Full-time",
      salaryMin: 130000,
      salaryMax: 170000,
      salaryText: "$130,000 – $170,000",
      logoBg: "#2563EB",
      description: "Engineer decentralized oracle nodes, off-chain data computation pipelines, and verifiable random functions.",
      requirements: "Node.js/Go backend experience, PostgreSQL/MySQL, message queues, Docker, and microservice architectures.",
    },
    {
      recruiterId: sophiaId,
      company: "Scroll",
      title: "Product Manager",
      location: "Remote (Worldwide)",
      jobType: "Contract",
      salaryMin: 100000,
      salaryMax: 140000,
      salaryText: "$100,000 – $140,000",
      logoBg: "#7C3AED",
      description: "Spearhead developer ecosystem growth and tooling for zero-knowledge Ethereum scaling solutions.",
      requirements: "Proven track record as a Web3 technical PM, deep grasp of L2 rollups, developer tooling, and roadmap execution.",
    },
    {
      recruiterId: jamesId,
      company: "Immutable",
      title: "DevOps Engineer",
      location: "London, UK (Hybrid)",
      jobType: "Full-time",
      salaryMin: 95000,
      salaryMax: 135000,
      salaryText: "$95,000 – $135,000",
      logoBg: "#0284C7",
      description: "Manage global cloud infrastructure, CI/CD pipelines, and high-throughput transaction RPC relays for Web3 gaming.",
      requirements: "Kubernetes, AWS/GCP, Terraform, automated testing pipelines, and 24/7 high-availability infrastructure.",
    },
  ];

  const jobIds = [];
  for (const j of sampleJobs) {
    const [res] = await pool.query(
      `INSERT INTO jobs (recruiterId, company, title, location, jobType, salaryMin, salaryMax, salaryText, logoBg, description, requirements, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        j.recruiterId,
        j.company,
        j.title,
        j.location,
        j.jobType,
        j.salaryMin,
        j.salaryMax,
        j.salaryText,
        j.logoBg,
        j.description,
        j.requirements,
      ]
    );
    jobIds.push(res.insertId);
  }

  console.log("Creating job applications for Alex Morgan...");
  const sampleApps = [
    { jobId: jobIds[0], status: "Applied", appliedAt: "2025-05-24 10:30:00" },
    { jobId: jobIds[1], status: "Shortlisted", appliedAt: "2025-05-20 14:15:00" },
    { jobId: jobIds[2], status: "Rejected", appliedAt: "2025-05-15 09:00:00" },
    { jobId: jobIds[3], status: "Hired", appliedAt: "2025-05-10 16:45:00" },
    { jobId: jobIds[4], status: "Applied", appliedAt: "2025-05-05 11:20:00" },
  ];

  for (const app of sampleApps) {
    await pool.query(
      `INSERT INTO job_applications (jobId, seekerId, status, appliedAt, coverNote)
       VALUES (?, ?, ?, ?, ?)`,
      [
        app.jobId,
        alexId,
        app.status,
        app.appliedAt,
        "Excited to bring my full-stack Web3 and smart contract experience to your exceptional team!",
      ]
    );
  }

  console.log("Creating notifications...");
  await pool.query(
    `INSERT INTO notifications (userId, title, message, type)
     VALUES 
     (?, 'Credential Verified On-Chain!', 'Your experience as Senior Full Stack Developer at BlockVentures has been verified by Sophia Lee.', 'verified'),
     (?, 'Application Shortlisted', 'Your application for Protocol Engineer at LayerZero Labs was shortlisted!', 'application'),
     (?, 'New Message Received', 'James Patel sent you a direct message regarding your application.', 'chat')`,
    [alexId, alexId, alexId]
  );

  console.log("Creating demo chat messages...");
  await pool.query(
    `INSERT INTO chat_messages (senderId, receiverId, message, isRead)
     VALUES 
     (?, ?, 'Hello Alex! We reviewed your verified blockchain credentials and are very impressed.', 1),
     (?, ?, 'Thank you James! I would love to discuss how I can contribute to the protocol engineering initiatives.', 1),
     (?, ?, 'Let us arrange a technical walkthrough for next Tuesday. Does 2 PM UTC work for you?', 0)`,
    [jamesId, alexId, alexId, jamesId, jamesId, alexId]
  );

  console.log("✅ ChainHire 2.0 Database seeded successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
