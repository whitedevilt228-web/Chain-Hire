const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Public
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected
router.get("/me", authenticate, authController.getMe);
router.get("/user/:id", authenticate, authController.getUserById);
router.put("/profile", authenticate, upload.single("avatar"), authController.updateProfile);
router.put("/change-password", authenticate, authController.changePassword);
router.put("/wallet", authenticate, authController.updateWallet);
router.delete("/account", authenticate, authController.deleteAccount);

module.exports = router;
