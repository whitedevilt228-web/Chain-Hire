const express = require("express");
const router = express.Router();
const verificationController = require("../controllers/verificationController");
const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");

// Job Seeker requests verification
router.post("/request", authenticate, authorizeRoles("jobSeeker", "admin"), verificationController.requestVerification);

// Recruiter inbox
router.get("/inbox", authenticate, authorizeRoles("recruiter", "admin"), verificationController.getRecruiterInbox);

// Recruiter approve & reject
router.put("/:id/approve", authenticate, authorizeRoles("recruiter", "admin"), verificationController.approveVerification);
router.put("/:id/reject", authenticate, authorizeRoles("recruiter", "admin"), verificationController.rejectVerification);

// Public / Seeker verified credentials ledger (Contracts page)
router.get("/contracts", authenticate, verificationController.getVerifiedContracts);

module.exports = router;
