const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { initDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const experienceRoutes = require("./routes/experienceRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const jobRoutes = require("./routes/jobRoutes");
const adminRoutes = require("./routes/adminRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { getContractMetadata } = require("./config/blockchain");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsers
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "ChainHire 2.0 API Server",
    time: new Date().toISOString(),
  });
});

// Blockchain contract metadata endpoint (enables dynamic contract discovery for frontend)
app.get("/api/contract", (req, res) => {
  const metadata = getContractMetadata();
  res.json({ success: true, ...metadata });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);

// Root redirect to login or seeker dashboard
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/index.html"));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// Start Server after Database Initialization
async function startServer() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`🚀 ChainHire 2.0 Server running on http://localhost:${PORT}`);
      console.log(`📂 Frontend accessible at http://localhost:${PORT}/pages/login.html`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
