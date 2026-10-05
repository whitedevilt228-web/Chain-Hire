const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authenticate } = require("../middleware/auth");

router.get("/conversations", authenticate, chatController.getConversations);
router.get("/messages/:contactId", authenticate, chatController.getMessages);
router.post("/send", authenticate, chatController.sendMessage);
router.get("/notifications", authenticate, chatController.getNotifications);
router.put("/notifications/read", authenticate, chatController.markNotificationsRead);
router.put("/notifications/mark-read", authenticate, chatController.markNotificationsRead);

module.exports = router;
