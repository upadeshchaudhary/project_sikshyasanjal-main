const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, trim: true, lowercase: true },
    type:      { type: String, required: true, trim: true },
    message:   { type: String, required: true, trim: true },
    status:    { type: String, default: "pending", enum: ["pending", "contacted", "resolved"] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Enquiry", enquirySchema);
