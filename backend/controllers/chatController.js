const { getPool } = require("../config/db");

// 1. Get Contact Conversations
exports.getConversations = async (req, res) => {
  try {
    const pool = getPool();
    const currentUserId = req.user.id;

    // Fetch ONLY users with whom the current user has chatted (sent or received at least one message)
    const [users] = await pool.query(
      `SELECT u.id, u.fullName, u.email, u.role, u.avatar, u.headline,
              (SELECT message FROM chat_messages 
               WHERE (senderId = u.id AND receiverId = ?) OR (senderId = ? AND receiverId = u.id)
               ORDER BY id DESC LIMIT 1) as lastMessage,
              (SELECT createdAt FROM chat_messages 
               WHERE (senderId = u.id AND receiverId = ?) OR (senderId = ? AND receiverId = u.id)
               ORDER BY id DESC LIMIT 1) as lastMessageTime,
              (SELECT COUNT(*) FROM chat_messages 
               WHERE senderId = u.id AND receiverId = ? AND isRead = 0) as unreadCount
       FROM users u
       WHERE u.id != ? AND u.isBlocked = 0
         AND EXISTS (
           SELECT 1 FROM chat_messages cm 
           WHERE (cm.senderId = u.id AND cm.receiverId = ?) 
              OR (cm.senderId = ? AND cm.receiverId = u.id)
         )
       ORDER BY lastMessageTime DESC, u.fullName ASC`,
      [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId]
    );

    return res.json({
      success: true,
      contacts: users,
    });
  } catch (error) {
    console.error("GetConversations Error:", error);
    return res.status(500).json({ success: false, message: "Error loading conversations" });
  }
};

// 2. Get Messages with specific contact
exports.getMessages = async (req, res) => {
  try {
    const contactId = parseInt(req.params.contactId, 10);
    const pool = getPool();

    // Mark incoming messages as read
    await pool.query(
      "UPDATE chat_messages SET isRead = 1 WHERE senderId = ? AND receiverId = ?",
      [contactId, req.user.id]
    );

    const [messages] = await pool.query(
      `SELECT cm.*, 
              s.fullName as senderName, s.avatar as senderAvatar,
              r.fullName as receiverName, r.avatar as receiverAvatar
       FROM chat_messages cm
       JOIN users s ON cm.senderId = s.id
       JOIN users r ON cm.receiverId = r.id
       WHERE (cm.senderId = ? AND cm.receiverId = ?)
          OR (cm.senderId = ? AND cm.receiverId = ?)
       ORDER BY cm.id ASC`,
      [req.user.id, contactId, contactId, req.user.id]
    );

    const [contactRows] = await pool.query(
      "SELECT id, fullName, email, role, avatar, headline, walletAddress FROM users WHERE id = ?",
      [contactId]
    );

    return res.json({
      success: true,
      contact: contactRows[0] || null,
      messages,
    });
  } catch (error) {
    console.error("GetMessages Error:", error);
    return res.status(500).json({ success: false, message: "Error loading messages" });
  }
};

// 3. Send Message
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    if (!receiverId || !message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Receiver ID and message content are required" });
    }

    const pool = getPool();
    const [result] = await pool.query(
      "INSERT INTO chat_messages (senderId, receiverId, message) VALUES (?, ?, ?)",
      [req.user.id, parseInt(receiverId, 10), message.trim()]
    );

    const [newMsg] = await pool.query("SELECT * FROM chat_messages WHERE id = ?", [result.insertId]);

    // Insert notification for receiver
    await pool.query(
      `INSERT INTO notifications (userId, title, message, type)
       VALUES (?, ?, ?, 'chat')`,
      [
        parseInt(receiverId, 10),
        `New message from ${req.user.fullName}`,
        message.trim().length > 100 ? message.trim().substring(0, 97) + "..." : message.trim(),
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Message sent",
      data: newMsg[0],
    });
  } catch (error) {
    console.error("SendMessage Error:", error);
    return res.status(500).json({ success: false, message: "Error sending message" });
  }
};

// 4. Get Notifications
exports.getNotifications = async (req, res) => {
  try {
    const pool = getPool();
    const [notifications] = await pool.query(
      "SELECT * FROM notifications WHERE userId = ? ORDER BY id DESC LIMIT 20",
      [req.user.id]
    );

    const [unreadRows] = await pool.query(
      "SELECT COUNT(*) as unreadCount FROM notifications WHERE userId = ? AND isRead = 0",
      [req.user.id]
    );

    return res.json({
      success: true,
      notifications,
      unreadCount: unreadRows[0]?.unreadCount || 0,
    });
  } catch (error) {
    console.error("GetNotifications Error:", error);
    return res.status(500).json({ success: false, message: "Error loading notifications" });
  }
};

// 5. Mark Notifications Read
exports.markNotificationsRead = async (req, res) => {
  try {
    const pool = getPool();
    await pool.query(
      "UPDATE notifications SET isRead = 1 WHERE userId = ?",
      [req.user.id]
    );

    return res.json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (error) {
    console.error("MarkNotificationsRead Error:", error);
    return res.status(500).json({ success: false, message: "Error marking notifications as read" });
  }
};

