// backend/models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    school:    { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    from:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject:   { type: String, trim: true, maxlength: 200, default: "" },
    body:      { type: String, required: true, trim: true },
    iv:        { type: String, default: null },
    authTag:   { type: String, default: null },
    parentMsg: {
      // For threaded replies — null means this is a top-level message
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Message",
      default: null,
      index:   true,
    },
    isReadByRecipient: { type: Boolean, default: false, index: true },
    deletedBySender:   { type: Boolean, default: false },
    deletedByRecipient:{ type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ school: 1, to: 1, isReadByRecipient: 1 }); // unread count
messageSchema.index({ school: 1, from: 1 });
messageSchema.index({ school: 1, to: 1, createdAt: -1 });        // inbox

module.exports = mongoose.model("Message", messageSchema);