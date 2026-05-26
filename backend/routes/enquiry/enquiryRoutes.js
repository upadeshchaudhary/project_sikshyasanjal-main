const express = require("express");
const router  = express.Router();
const enquiryController = require("../../controllers/enquiry/enquiryController");
const { authMiddleware, requireAdmin } = require("../../middleware/authMiddleware");

// Public route to submit enquiry
router.post("/enquiry", enquiryController.createEnquiry);

// Admin only route to view enquiries
router.get("/enquiry", authMiddleware, requireAdmin, enquiryController.getEnquiries);

module.exports = router;
