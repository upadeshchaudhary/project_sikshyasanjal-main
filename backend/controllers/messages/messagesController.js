// backend/controllers/messages/messagesController.js
const mongoose = require("mongoose");
const { Message, User } = require("../../models");
const { encryptText, decryptText } = require("../../utils/messageCrypto");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

function decryptMessage(message) {
  if (!message?.body) return message;
  const sanitized = { ...message };
  if (message.iv && message.authTag) {
    try { 
      sanitized.body = decryptText(message.body, message.iv, message.authTag); 
    } catch (err) { 
      console.warn(`[decryptMessage] Failed for message ${message._id}:`, err.message);
      // Fallback to original body if decryption fails, so we don't crash
      sanitized.body = message.body; 
    }
  }
  delete sanitized.iv;
  delete sanitized.authTag;
  return sanitized;
}

function getAllowedRecipientRoles(senderRole) {
  switch (senderRole) {
    case "admin":   return ["admin", "teacher", "parent"];
    case "teacher": return ["admin", "parent", "teacher"];
    case "parent":  return ["teacher", "admin"];
    default:        return [];
  }
}

// GET /api/messages/conversations
exports.getConversations = async (req, res) => {
  try {
    const { userId } = req.user;
    const filter = {
      $or: [
        { from: userId, deletedBySender: { $ne: true } },
        { to: userId, deletedByRecipient: { $ne: true } }
      ]
    };
    
    const messages = await Message.find(filter)
      .populate("from", "name role").populate("to", "name role").sort({ createdAt: -1 }).lean();

    const conversationMap = new Map();

    messages.forEach(msg => {
      const fromId = msg.from?._id?.toString();
      const toId   = msg.to?._id?.toString();
      const curId  = userId.toString();
      
      if (!fromId || !toId) return;
      
      const other = fromId === curId ? msg.to : msg.from;
      if (!other?._id) return;
      
      const otherId = other._id.toString();

      if (!conversationMap.has(otherId)) {
        const decrypted = decryptMessage(msg);
        conversationMap.set(otherId, {
          userId:      otherId,
          name:        other.name,
          role:        other.role,
          lastMessage: decrypted.body,
          unread:      (toId === curId && !msg.isReadByRecipient) ? 1 : 0,
          timestamp:   msg.createdAt,
        });
      } else {
        if (toId === curId && !msg.isReadByRecipient) {
          conversationMap.get(otherId).unread += 1;
        }
      }
    });

    const conversations = Array.from(conversationMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    res.json({ success: true, conversations });
  } catch (err) {
    console.error("[getConversations] Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch conversations." });
  }
};

// GET /api/messages/conversation/:userId
exports.getThreadByUserId = async (req, res) => {
  try {
    const { userId } = req.user;
    const targetId   = req.params.userId;

    if (!isValidId(targetId)) return res.status(400).json({ success: false, message: "Invalid user ID." });

    const filter = {
      $or: [
        { from: userId, to: targetId, deletedBySender: { $ne: true } },
        { from: targetId, to: userId, deletedByRecipient: { $ne: true } },
      ],
    };

    const messages = await Message.find(filter).populate("from", "name").populate("to", "name").sort({ createdAt: 1 }).lean();

    const decrypted = messages.map(decryptMessage);

    // Mark as read
    await Message.updateMany(
      { from: targetId, to: userId, isReadByRecipient: false },
      { $set: { isReadByRecipient: true } }
    );

    res.json({ success: true, messages: decrypted });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch conversation." });
  }
};

// GET /api/messages/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ to: req.user.userId, isReadByRecipient: false, deletedByRecipient: { $ne: true } });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch unread count." });
  }
};

// GET /api/messages/contacts
exports.getContacts = async (req, res) => {
  try {
    const { role, userId } = req.user;
    const allowedRoles = getAllowedRecipientRoles(role);
    let contacts;

    if (role === "parent") {
      const parent = await User.findById(userId).select("childClass").lean();
      if (!parent?.childClass) return res.json({ success: true, contacts: [] });

      const [admins, teachers] = await Promise.all([
        User.find({ role: "admin", isDisabled: false, _id: { $ne: userId } }).select("name role email phone").lean(),
        User.find({ role: "teacher", assignedClasses: parent.childClass, isDisabled: false, _id: { $ne: userId } }).select("name role email phone assignedClasses").lean(),
      ]);
      contacts = [...admins, ...teachers].sort((a, b) => {
        if (a.role === b.role) return a.name.localeCompare(b.name);
        return a.role.localeCompare(b.role);
      });
    } else {
      contacts = await User.find({ role: { $in: allowedRoles }, _id: { $ne: userId }, isDisabled: false })
        .select("name role email phone class").sort({ role: 1, name: 1 }).lean();
    }

    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch contacts." });
  }
};

// GET /api/messages
exports.getInbox = async (req, res) => {
  try {
    const { userId } = req.user;
    const filter = {
      $or:      [{ from: userId }, { to: userId }],
      parentMsg: null,
      $and: [
        { $or: [{ from: { $ne: userId } }, { deletedBySender:    { $ne: true } }] },
        { $or: [{ to:   { $ne: userId } }, { deletedByRecipient: { $ne: true } }] },
      ],
    };

    if (req.query.unread === "true") { filter.to = userId; filter.isReadByRecipient = false; }

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find(filter).populate("from", "name role").populate("to", "name role").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Message.countDocuments(filter),
    ]);

    const decrypted  = messages.map(decryptMessage);
    const messageIds = decrypted.map(m => m._id);
    const replyCounts = await Message.aggregate([
      { $match: { parentMsg: { $in: messageIds } } },
      { $group: { _id: "$parentMsg", count: { $sum: 1 } } },
    ]);
    const replyMap = {};
    replyCounts.forEach(r => { replyMap[r._id.toString()] = r.count; });

    const annotated = decrypted.map(m => ({ ...m, replyCount: replyMap[m._id.toString()] || 0 }));

    res.json({ success: true, messages: annotated, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch messages." });
  }
};

// GET /api/messages/:id
exports.getMessageThread = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid message ID." });

    const { userId } = req.user;
    const root = await Message.findById(req.params.id).populate("from", "name role").populate("to", "name role").lean();
    if (!root) return res.status(404).json({ success: false, message: "Message not found." });

    const decryptedRoot  = decryptMessage(root);
    const isParticipant  = decryptedRoot.from._id.toString() === userId.toString() || decryptedRoot.to._id.toString() === userId.toString();
    if (!isParticipant) return res.status(403).json({ success: false, message: "You do not have access to this conversation." });

    if (root.to._id.toString() === userId.toString() && !root.isReadByRecipient) {
      await Message.findByIdAndUpdate(req.params.id, { $set: { isReadByRecipient: true } });
    }

    const replies          = await Message.find({ parentMsg: req.params.id }).populate("from", "name role").populate("to", "name role").sort({ createdAt: 1 }).lean();
    const decryptedReplies = replies.map(decryptMessage);

    const unreadReplyIds = decryptedReplies
      .filter(r => r.to?.toString() === userId.toString() && !r.isReadByRecipient)
      .map(r => r._id);
    if (unreadReplyIds.length > 0) {
      await Message.updateMany({ _id: { $in: unreadReplyIds } }, { $set: { isReadByRecipient: true } });
    }

    res.json({ success: true, message: decryptedRoot, replies: decryptedReplies, thread: [decryptedRoot, ...decryptedReplies] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch thread." });
  }
};

// POST /api/messages
exports.sendMessage = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { to, body, subject, parentMsg } = req.body;

    if (!to || !isValidId(to))  return res.status(400).json({ success: false, message: "Valid recipient ID is required." });
    if (!body?.trim())           return res.status(400).json({ success: false, message: "Message body is required." });
    if (to.toString() === userId.toString()) return res.status(400).json({ success: false, message: "You cannot send a message to yourself." });

    const recipient = await User.findById(to).select("name role isDisabled").lean();
    if (!recipient)           return res.status(404).json({ success: false, message: "Recipient not found." });
    if (recipient.isDisabled) return res.status(400).json({ success: false, message: "This user's account is disabled and cannot receive messages." });

    const allowedRoles = getAllowedRecipientRoles(role);
    if (!allowedRoles.includes(recipient.role)) {
      return res.status(403).json({ success: false, message: `As a ${role}, you cannot send messages to a ${recipient.role}.` });
    }

    if (role === "parent" && recipient.role === "teacher") {
      const parent = await User.findById(userId).select("childClass").lean();
      if (!parent?.childClass) return res.status(403).json({ success: false, message: "Parent accounts can only message teachers assigned to their child's class." });
      const allowed = await User.exists({ _id: recipient._id, role: "teacher", assignedClasses: parent.childClass });
      if (!allowed) return res.status(403).json({ success: false, message: "You can only message your child's assigned teacher(s)." });
    }

    if (parentMsg) {
      if (!isValidId(parentMsg)) return res.status(400).json({ success: false, message: "Invalid parent message ID." });
      const parent = await Message.findById(parentMsg).lean();
      if (!parent) return res.status(404).json({ success: false, message: "Original message not found." });

      const parentFrom = parent.from?.toString();
      const parentTo   = parent.to?.toString();
      if (parentFrom !== userId.toString() && parentTo !== userId.toString()) {
        return res.status(403).json({ success: false, message: "You cannot reply to a conversation you are not part of." });
      }
      const expectedTo = parentFrom === userId.toString() ? parentTo : parentFrom;
      if (to.toString() !== expectedTo?.toString()) {
        return res.status(400).json({ success: false, message: "Reply must be directed to the other participant in this thread." });
      }
    }

    const encrypted = encryptText(body.trim());
    const message   = await Message.create({
      from:              userId,
      to,
      subject:           subject?.trim()?.slice(0, 200) || "",
      body:              encrypted.data,
      iv:                encrypted.iv,
      authTag:           encrypted.authTag,
      parentMsg:         parentMsg || null,
      isReadByRecipient: false,
    });

    await message.populate([{ path: "from", select: "name role" }, { path: "to", select: "name role" }]);

    res.status(201).json({ success: true, message: decryptMessage(message.toObject ? message.toObject() : message) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to send message." });
  }
};

// PATCH /api/messages/:id/read
exports.markAsRead = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid message ID." });
    const message = await Message.findOneAndUpdate({ _id: req.params.id, to: req.user.userId }, { $set: { isReadByRecipient: true } }, { new: true });
    if (!message) return res.status(404).json({ success: false, message: "Message not found or you are not the recipient." });
    res.json({ success: true, message: "Message marked as read." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to mark message as read." });
  }
};

// PATCH /api/messages/:id/read-all
exports.markThreadAsRead = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid message ID." });
    const result = await Message.updateMany(
      { to: req.user.userId, $or: [{ _id: req.params.id }, { parentMsg: req.params.id }] },
      { $set: { isReadByRecipient: true } }
    );
    res.json({ success: true, modified: result.modifiedCount, message: "Thread marked as read." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to mark thread as read." });
  }
};

// DELETE /api/messages/:id
exports.deleteMessage = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid message ID." });

    const { userId } = req.user;
    const message    = await Message.findOne({ _id: req.params.id, $or: [{ from: userId }, { to: userId }] }).lean();
    if (!message) return res.status(404).json({ success: false, message: "Message not found or you are not a participant." });

    const isSender    = message.from?.toString() === userId.toString();
    const isRecipient = message.to?.toString()   === userId.toString();
    const updateOp    = {};
    if (isSender)    updateOp.deletedBySender    = true;
    if (isRecipient) updateOp.deletedByRecipient = true;

    await Message.findByIdAndUpdate(req.params.id, { $set: updateOp });

    const updated = await Message.findById(req.params.id).lean();
    if (updated?.deletedBySender && updated?.deletedByRecipient) {
      await Message.findByIdAndDelete(req.params.id);
    }

    res.json({ success: true, message: "Message deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete message." });
  }
};

// DELETE /api/messages/chat/:targetId
exports.deleteChat = async (req, res) => {
  try {
    const { userId }   = req.user;
    const { targetId } = req.params;

    if (!isValidId(targetId)) return res.status(400).json({ success: false, message: 'Invalid user ID.' });

    await Message.updateMany(
      { from: userId, to: targetId },
      { $set: { deletedBySender: true } }
    );

    await Message.updateMany(
      { from: targetId, to: userId },
      { $set: { deletedByRecipient: true } }
    );

    await Message.deleteMany({
      $or: [
        { from: userId, to: targetId },
        { from: targetId, to: userId }
      ],
      deletedBySender: true,
      deletedByRecipient: true
    });

    res.json({ success: true, message: 'Conversation deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete conversation.' });
  }
};
