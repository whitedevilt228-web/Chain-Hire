const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticate } = require("../middleware/auth");
const { authorizeRoles } = require("../middleware/role");

// Admin only endpoints
router.get("/stats", authenticate, authorizeRoles("admin"), adminController.getStats);
router.get("/users", authenticate, authorizeRoles("admin"), adminController.getUsers);
router.put("/users/:id/toggle-block", authenticate, authorizeRoles("admin"), adminController.toggleBlockUser);

module.exports = router;
