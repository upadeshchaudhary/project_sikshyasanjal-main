// backend/routes/messages.js
const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");
const { Message, User } = require("../models");
const { protect } = require("../middleware/auth");

router.use(protect);

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Whitelisted fields for message creation
const ALLOWED_CREATE = ["to", "subject", "body", "parentMsg"];

function pickFields(body, allowed) {
  return allowed.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
}

// ── Role-based messaging rules ────────────────────────────────────────────────
// Returns allowed recipient roles for the sender's role
function getAllowedRecipientRoles(senderRole) {
  switch (senderRole) {
    case "admin":
      return ["admin", "teacher", "parent"]; // admin can message anyone
    case "teacher":
      return ["admin", "parent", "teacher"]; // teacher can message admin, parents, other teachers
    case "parent":
      return ["teacher", "admin"]; // parent can only message teachers and admin
    default:
      return [];
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/messages/unread-count
// Returns unread message count for the current user
// Used by Sidebar and Topbar badge
// MUST be defined before /:id routes to avoid param collision
// ════════════════════════════════════════════════════════════════════════════════
router.get("/unread-count", async (req, res) => {
  try {
    const { userId } = req.user;

    const count = await Message.countDocuments({
      school:            req.school._id,
      to:                userId,
      isReadByRecipient: false,
      deletedByRecipient: { $ne: true },
    });

    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch unread count." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/messages/contacts
// Returns list of users this person can message
// Role-scoped: parents can only see teachers+admin, teachers can see parents+admin+teachers
// ════════════════════════════════════════════════════════════════════════════════
router.get("/contacts", async (req, res) => {
  try {
    const { role, userId } = req.user;
    const allowedRoles = getAllowedRecipientRoles(role);

    // Parent: can only message their child's teachers (not all teachers)
    // Admin/Teacher: can message anyone in allowed roles
    let filter = {
      school:     req.school._id,
      role:       { $in: allowedRoles },
      _id:        { $ne: userId },   // exclude self
      isDisabled: false,
    };

    const contacts = await User.find(filter)
      .select("name role email phone class")
      .sort({ role: 1, name: 1 })
      .lean();

    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch contacts." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/messages — Inbox: top-level conversations only (no thread replies)
// Returns messages where current user is sender or recipient
// ════════════════════════════════════════════════════════════════════════════════
router.get("/", async (req, res) => {
  try {
    // FIXED: use req.user.userId not req.user._id
    const { userId } = req.user;

    const filter = {
      school: req.school._id,
      $or:    [{ from: userId }, { to: userId }],
      // FIXED: correct field name is parentMsg not parentMessage
      parentMsg: null,  // top-level messages only
      // Exclude messages soft-deleted by this user
      $and: [
        { $or: [
          { from: { $ne: userId } },
          { deletedBySender: { $ne: true } },
        ]},
        { $or: [
          { to: { $ne: userId } },
          { deletedByRecipient: { $ne: true } },
        ]},
      ],
    };

    // Optional: filter by read/unread
    if (req.query.unread === "true") {
      filter.to               = userId;
      filter.isReadByRecipient = false;
    }

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .populate("from", "name role")
        .populate("to",   "name role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(filter),
    ]);

    // Annotate each message with reply count
    const messageIds = messages.map(m => m._id);
    const replyCounts = await Message.aggregate([
      { $match: { school: req.school._id, parentMsg: { $in: messageIds } } },
      { $group: { _id: "$parentMsg", count: { $sum: 1 } } },
    ]);
    const replyMap = {};
    replyCounts.forEach(r => { replyMap[r._id.toString()] = r.count; });

    const annotated = messages.map(m => ({
      ...m,
      replyCount: replyMap[m._id.toString()] || 0,
    }));

    res.json({
      success:    true,
      messages:   annotated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch messages." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/messages/:id — Single message with full thread
// Only accessible to participants (from or to)
// ════════════════════════════════════════════════════════════════════════════════
router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid message ID." });
    }

    const { userId } = req.user;

    // Fetch the root message
    const root = await Message.findOne({
      _id:    req.params.id,
      school: req.school._id,
    })
      .populate("from", "name role")
      .populate("to",   "name role")
      .lean();

    if (!root) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    // FIXED: enforce participant-only access
    const isParticipant =
      root.from._id.toString() === userId.toString() ||
      root.to._id.toString()   === userId.toString();

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this conversation.",
      });
    }

    // Auto-mark as read if current user is the recipient
    if (root.to._id.toString() === userId.toString() && !root.isReadByRecipient) {
      await Message.findByIdAndUpdate(req.params.id, {
        // FIXED: correct field name isReadByRecipient
        $set: { isReadByRecipient: true },
      });
      root.isReadByRecipient = true;
    }

    // Fetch the full thread (replies)
    const replies = await Message.find({
      school:   req.school._id,
      // FIXED: correct field name parentMsg
      parentMsg: req.params.id,
    })
      .populate("from", "name role")
      .populate("to",   "name role")
      .sort({ createdAt: 1 })
      .lean();

    // Mark all replies as read for this user
    const unreadReplyIds = replies
      .filter(r => r.to?.toString() === userId.toString() && !r.isReadByRecipient)
      .map(r => r._id);

    if (unreadReplyIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadReplyIds } },
        { $set: { isReadByRecipient: true } }
      );
    }

    res.json({
      success:  true,
      message:  root,
      replies,
      thread:   [root, ...replies],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch thread." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/messages — Send a new message or reply
// Validates recipient role, participant membership, and required fields
// ════════════════════════════════════════════════════════════════════════════════
router.post("/", async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { to, body, subject, parentMsg } = req.body;

    // Required field validation
    if (!to || !isValidId(to)) {
      return res.status(400).json({ success: false, message: "Valid recipient ID is required." });
    }
    if (!body?.trim()) {
      return res.status(400).json({ success: false, message: "Message body is required." });
    }

    // Cannot message yourself
    if (to.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot send a message to yourself." });
    }

    // Fetch recipient to validate role and school membership
    const recipient = await User.findOne({
      _id:    to,
      school: req.school._id,
    }).select("name role isDisabled").lean();

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found in this school.",
      });
    }

    if (recipient.isDisabled) {
      return res.status(400).json({
        success: false,
        message: "This user's account is disabled and cannot receive messages.",
      });
    }

    // FIXED: role-based messaging restriction
    const allowedRoles = getAllowedRecipientRoles(role);
    if (!allowedRoles.includes(recipient.role)) {
      return res.status(403).json({
        success: false,
        message: `As a ${role}, you cannot send messages to a ${recipient.role}.`,
      });
    }

    // If this is a reply, validate the parent message
    if (parentMsg) {
      if (!isValidId(parentMsg)) {
        return res.status(400).json({ success: false, message: "Invalid parent message ID." });
      }

      const parent = await Message.findOne({
        _id:    parentMsg,
        school: req.school._id,
      }).lean();

      if (!parent) {
        return res.status(404).json({ success: false, message: "Original message not found." });
      }

      // Validate current user is a participant in the parent thread
      const parentFrom = parent.from?.toString();
      const parentTo   = parent.to?.toString();
      const isParentParticipant =
        parentFrom === userId.toString() ||
        parentTo   === userId.toString();

      if (!isParentParticipant) {
        return res.status(403).json({
          success: false,
          message: "You cannot reply to a conversation you are not part of.",
        });
      }

      // Replies go to the other participant in the thread
      const expectedTo = parentFrom === userId.toString() ? parentTo : parentFrom;
      if (to.toString() !== expectedTo?.toString()) {
        return res.status(400).json({
          success: false,
          message: "Reply must be directed to the other participant in this thread.",
        });
      }
    }

    // FIXED: field whitelisting — no req.body spread
    const message = await Message.create({
      school:            req.school._id,
      from:              userId,       // FIXED: use userId from JWT
      to,
      subject:           subject?.trim()?.slice(0, 200) || "",
      body:              body.trim(),
      parentMsg:         parentMsg || null,  // FIXED: correct field name
      isReadByRecipient: false,
    });

    await message.populate([
      { path: "from", select: "name role" },
      { path: "to",   select: "name role" },
    ]);

    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to send message." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// PATCH /api/messages/:id/read — Mark a message as read
// Only the recipient can mark their own message as read
// ════════════════════════════════════════════════════════════════════════════════
router.patch("/:id/read", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid message ID." });
    }

    const { userId } = req.user;

    const message = await Message.findOneAndUpdate(
      {
        _id:    req.params.id,
        school: req.school._id,
        to:     userId,          // only recipient can mark as read
      },
      // FIXED: correct field name isReadByRecipient
      { $set: { isReadByRecipient: true } },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found or you are not the recipient.",
      });
    }

    res.json({ success: true, message: "Message marked as read." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to mark message as read." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// PATCH /api/messages/:id/read-all — Mark all messages in a thread as read
// ════════════════════════════════════════════════════════════════════════════════
router.patch("/:id/read-all", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid message ID." });
    }

    const { userId } = req.user;

    // Mark root + all replies in this thread as read
    const result = await Message.updateMany(
      {
        school: req.school._id,
        to:     userId,
        $or:    [{ _id: req.params.id }, { parentMsg: req.params.id }],
      },
      { $set: { isReadByRecipient: true } }
    );

    res.json({
      success:  true,
      modified: result.modifiedCount,
      message:  "Thread marked as read.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to mark thread as read." });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// DELETE /api/messages/:id — Soft delete a message
// Sender can delete their sent message, recipient can delete from their inbox
// Does not delete from the other party's view
// ════════════════════════════════════════════════════════════════════════════════
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid message ID." });
    }

    const { userId } = req.user;

    const message = await Message.findOne({
      _id:    req.params.id,
      school: req.school._id,
      $or:    [{ from: userId }, { to: userId }],
    }).lean();

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found or you are not a participant.",
      });
    }

    const isSender    = message.from?.toString() === userId.toString();
    const isRecipient = message.to?.toString()   === userId.toString();

    const updateOp = {};
    if (isSender)    updateOp.deletedBySender    = true;
    if (isRecipient) updateOp.deletedByRecipient = true;

    await Message.findByIdAndUpdate(req.params.id, { $set: updateOp });

    // If both sides deleted, hard delete the document
    const updated = await Message.findById(req.params.id).lean();
    if (updated?.deletedBySender && updated?.deletedByRecipient) {
      await Message.findByIdAndDelete(req.params.id);
    }

    res.json({ success: true, message: "Message deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete message." });
  }
});

module.exports = router;