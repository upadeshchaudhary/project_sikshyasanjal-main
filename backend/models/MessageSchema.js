// backend/models/MessageSchema.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    from:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject:   { type: String, trim: true, maxlength: 200, default: "" },
    body:      { type: String, required: true, trim: true },
    iv:        { type: String, default: null },
    authTag:   { type: String, default: null },
    parentMsg: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null, index: true },
    isReadByRecipient:  { type: Boolean, default: false, index: true },
    deletedBySender:    { type: Boolean, default: false },
    deletedByRecipient: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ to: 1, isReadByRecipient: 1 });
messageSchema.index({ from: 1 });
messageSchema.index({ to: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
