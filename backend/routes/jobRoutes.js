const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");
const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");
const upload = require("../middleware/upload");

// Public / Authenticated job browsing
router.get("/", jobController.getJobs);
router.get("/:id", jobController.getJobById);

// Recruiter posts job
router.post("/", authenticate, authorizeRoles("recruiter", "admin"), jobController.postJob);

// Seeker applies for job
router.post("/:id/apply", authenticate, authorizeRoles("jobSeeker", "admin"), upload.single("resume"), jobController.applyJob);

// Applications lists
router.get("/applications/seeker", authenticate, authorizeRoles("jobSeeker", "admin"), jobController.getSeekerApplications);
router.get("/applications/recruiter", authenticate, authorizeRoles("recruiter", "admin"), jobController.getRecruiterApplications);
router.put("/applications/:id/status", authenticate, authorizeRoles("recruiter", "admin"), jobController.updateApplicationStatus);

module.exports = router;
