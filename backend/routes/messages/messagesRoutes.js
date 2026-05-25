const express = require("express");
const { 
  getUnreadCount, 
  getContacts, 
  getConversations,
  getThreadByUserId,
  getInbox, 
  getMessageThread, 
  sendMessage, 
  markAsRead, 
  markThreadAsRead, 
  deleteMessage,
  deleteChat
} = require("../../controllers/messages/messagesController");
const { authMiddleware } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/messages/unread-count",  authMiddleware, getUnreadCount);
router.get("/messages/contacts",      authMiddleware, getContacts);
router.get("/messages/conversations",  authMiddleware, getConversations);
router.get("/messages/conversation/:userId", authMiddleware, getThreadByUserId);
router.get("/messages",               authMiddleware, getInbox);
router.get("/messages/:id",           authMiddleware, getMessageThread);
router.post("/messages",              authMiddleware, sendMessage);
router.patch("/messages/:id/read",    authMiddleware, markAsRead);
router.patch("/messages/:id/read-all", authMiddleware, markThreadAsRead);
router.delete("/messages/chat/:targetId", authMiddleware, deleteChat);
router.delete("/messages/:id",        authMiddleware, deleteMessage);

module.exports = router;
