// backend/routes/messages/messagesRoutes.js
const router = require("express").Router();

const { authMiddleware, requireTeacherOrAdmin, requireAdmin } = require("../../middleware/authMiddleware");

const { getUnreadCount, getContacts, sendMessage, getInbox, getMessageThread, deleteMessage, markAsRead, markThreadAsRead } = require("../../controllers/messages/messagesController");

// messages routes

router.route("/messages/unread-count").get(authMiddleware, getUnreadCount);
router.route("/messages/contacts").get(authMiddleware, getContacts);
router.route("/messages").get(authMiddleware, getInbox).post(authMiddleware, sendMessage);
router.route("/messages/:id")
  .get(authMiddleware, getMessageThread)
  .delete(authMiddleware, deleteMessage);
router.route("/messages/:id/read").patch(authMiddleware, markAsRead);
router.route("/messages/:id/read-all").patch(authMiddleware, markThreadAsRead);

module.exports = router;