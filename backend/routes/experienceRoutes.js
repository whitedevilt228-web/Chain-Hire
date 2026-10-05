const express = require("express");
const router = express.Router();
const experienceController = require("../controllers/experienceController");
const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");

router.get("/", authenticate, experienceController.getExperiences);
router.get("/recruiters", authenticate, experienceController.getRegisteredRecruiters);
router.post("/", authenticate, authorizeRoles("jobSeeker", "admin"), experienceController.addExperience);
router.put("/:id", authenticate, authorizeRoles("jobSeeker", "admin"), experienceController.updateExperience);
router.delete("/:id", authenticate, authorizeRoles("jobSeeker", "admin"), experienceController.deleteExperience);

module.exports = router;
