// backend/controllers/fees/feesController.js
const mongoose = require("mongoose");
const { FeeRecord, User, Student } = require("../../models");
const { getCurrentAcademicYear } = require("../../utils/calendar");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

function deriveStatus(amount, paidAmount, dueDate) {
  const paid = Number(paidAmount) || 0;
  const full = Number(amount)     || 0;
  if (paid >= full)               return "paid";
  if (paid > 0)                   return "partially_paid";
  if (new Date() > new Date(dueDate)) return "overdue";
  return "pending";
}

const CREATE_FIELDS = ["student", "class", "feeType", "amount", "dueDate", "dueDateBs", "academicYear", "remarks"];
const UPDATE_FIELDS = ["paidAmount", "paidDate", "paidDateBs", "paymentMethod", "status", "remarks", "amount", "dueDate", "dueDateBs"];

function pickFields(body, allowed) {
  return allowed.reduce((acc, key) => { if (body[key] !== undefined) acc[key] = body[key]; return acc; }, {});
}

const VALID_STATUSES    = ["paid", "partially_paid", "pending", "overdue"];
const VALID_FEE_TYPES   = ["tuition", "exam", "sports", "library", "transport", "hostel", "misc"];
const VALID_PAY_METHODS = ["cash", "bank_transfer", "esewa", "khalti", "cheque", "other"];

// GET /api/fees
exports.getFees = async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role === "teacher") return res.status(403).json({ success: false, message: "Teachers do not have access to fee records." });

    if (role === "parent") {
      const parent = await User.findById(userId).select("childId childName childClass").lean();
      if (!parent?.childId) return res.json({ success: true, records: [], total: 0 });

      const records = await FeeRecord.find({ student: parent.childId, academicYear: getCurrentAcademicYear() })
        .populate("student", "name class rollNo").sort({ dueDate: -1 }).lean();
      const outstanding = records.filter(r => r.status !== "paid").reduce((sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0);

      return res.json({ success: true, records, total: records.length, outstanding, childName: parent.childName });
    }

    // Admin
    const filter = { academicYear: getCurrentAcademicYear() };
    if (req.query.student && isValidId(req.query.student)) filter.student = req.query.student;
    if (req.query.status) {
      if (!VALID_STATUSES.includes(req.query.status)) return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(", ")}.` });
      filter.status = req.query.status;
    }
    if (req.query.class?.trim())        filter.class        = req.query.class.trim();
    if (req.query.feeType?.trim()) {
      if (!VALID_FEE_TYPES.includes(req.query.feeType)) return res.status(400).json({ success: false, message: `feeType must be one of: ${VALID_FEE_TYPES.join(", ")}.` });
      filter.feeType = req.query.feeType.trim();
    }
    if (req.query.overdue === "true") { filter.dueDate = { $lt: new Date() }; filter.status = { $in: ["pending", "partially_paid", "overdue"] }; }

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const [records, total] = await Promise.all([
      FeeRecord.find(filter).populate("student", "name class rollNo").populate("recordedBy", "name").sort({ dueDate: -1 }).skip(skip).limit(limit).lean(),
      FeeRecord.countDocuments(filter),
    ]);

    res.json({ success: true, records, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch fee records." });
  }
};

// GET /api/fees/summary
exports.getFeeSummary = async (req, res) => {
  try {
    const matchFilter = { academicYear: getCurrentAcademicYear() };

    const [agg, statusCounts] = await Promise.all([
      FeeRecord.aggregate([{ $match: matchFilter }, { $group: { _id: null, totalAmount: { $sum: "$amount" }, totalPaid: { $sum: "$paidAmount" }, totalRecords: { $sum: 1 } } }]),
      FeeRecord.aggregate([{ $match: matchFilter }, { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" }, paid: { $sum: "$paidAmount" } } }]),
    ]);

    const totals    = agg[0] || { totalAmount: 0, totalPaid: 0, totalRecords: 0 };
    const breakdown = { paid: { count: 0, amount: 0 }, partially_paid: { count: 0, amount: 0 }, pending: { count: 0, amount: 0 }, overdue: { count: 0, amount: 0 } };
    statusCounts.forEach(s => { if (breakdown[s._id]) breakdown[s._id] = { count: s.count, amount: s.total, paid: s.paid }; });

    const collectionRate = totals.totalAmount > 0 ? Math.round((totals.totalPaid / totals.totalAmount) * 100) : 0;

    res.json({ success: true, totalAmount: totals.totalAmount, totalCollected: totals.totalPaid, outstanding: Math.max(0, totals.totalAmount - totals.totalPaid), collectionRate, totalRecords: totals.totalRecords, breakdown });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch fee summary." });
  }
};

// GET /api/fees/overdue
exports.getOverdueFees = async (req, res) => {
  try {
    FeeRecord.updateMany({ status: "pending", dueDate: { $lt: new Date() } }, { $set: { status: "overdue" } }).catch(() => {});

    const records = await FeeRecord.find({ status: { $in: ["overdue", "pending"] }, dueDate: { $lt: new Date() } })
      .populate("student", "name class rollNo parentPhone").sort({ dueDate: 1 }).limit(100).lean();

    const totalOverdue = records.reduce((sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0);
    res.json({ success: true, records, count: records.length, totalOverdue });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch overdue fees." });
  }
};

// GET /api/fees/:id
exports.getFeeRecord = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid fee record ID." });

    const { role, userId } = req.user;
    if (role === "teacher") return res.status(403).json({ success: false, message: "Teachers do not have access to fee records." });

    const record = await FeeRecord.findById(req.params.id).populate("student", "name class rollNo").lean();
    if (!record) return res.status(404).json({ success: false, message: "Fee record not found." });

    if (role === "parent") {
      const parent = await User.findById(userId).select("childId").lean();
      if (!parent?.childId || record.student._id.toString() !== parent.childId.toString()) {
        return res.status(403).json({ success: false, message: "You can only view your child's fee records." });
      }
    }

    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch fee record." });
  }
};

// POST /api/fees
exports.createFeeRecord = async (req, res) => {
  try {
    const { userId } = req.user;
    const { student, amount, dueDate, feeType } = req.body;
    const academicYear = getCurrentAcademicYear();

    const missing = [];
    if (!student || !isValidId(student)) missing.push("student (valid ID)");
    if (!amount || Number(amount) <= 0)  missing.push("amount (positive number)");
    if (!dueDate)                        missing.push("dueDate");
    if (missing.length > 0) return res.status(400).json({ success: false, message: `Missing or invalid fields: ${missing.join(", ")}.` });

    if (feeType && !VALID_FEE_TYPES.includes(feeType)) return res.status(400).json({ success: false, message: `feeType must be one of: ${VALID_FEE_TYPES.join(", ")}.` });

    const studentDoc = await Student.findById(student).select("_id class name").lean();
    if (!studentDoc) return res.status(404).json({ success: false, message: "Student not found." });

    const fields = pickFields(req.body, CREATE_FIELDS);
    if (!fields.class) fields.class = studentDoc.class;
    fields.academicYear = academicYear;

    const record = await FeeRecord.create({ ...fields, amount: Number(amount), paidAmount: 0, status: "pending", recordedBy: userId });
    await record.populate("student", "name class rollNo");

    res.status(201).json({ success: true, record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/fees/:id
exports.updateFeeRecord = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid fee record ID." });

    const existing = await FeeRecord.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, message: "Fee record not found." });

    const updates = pickFields(req.body, UPDATE_FIELDS);
    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: "No valid fields to update." });

    if (updates.paymentMethod && !VALID_PAY_METHODS.includes(updates.paymentMethod)) {
      return res.status(400).json({ success: false, message: `paymentMethod must be one of: ${VALID_PAY_METHODS.join(", ")}.` });
    }

    const newPaidAmount = updates.paidAmount !== undefined ? Number(updates.paidAmount) : existing.paidAmount;
    const totalAmount   = updates.amount     !== undefined ? Number(updates.amount)     : existing.amount;

    if (newPaidAmount > totalAmount) return res.status(400).json({ success: false, message: `Paid amount (${newPaidAmount}) cannot exceed total fee amount (${totalAmount}).` });
    if (newPaidAmount < 0)           return res.status(400).json({ success: false, message: "Paid amount cannot be negative." });

    const dueDate    = updates.dueDate || existing.dueDate;
    const autoStatus = deriveStatus(totalAmount, newPaidAmount, dueDate);
    const finalStatus = updates.status && VALID_STATUSES.includes(updates.status) ? updates.status : autoStatus;

    if (finalStatus === "paid" && !updates.paidDate && !existing.paidDate) {
      updates.paidDate   = new Date();
      updates.paidDateBs = updates.paidDateBs || "";
    }

    const record = await FeeRecord.findByIdAndUpdate(req.params.id, { $set: { ...updates, paidAmount: newPaidAmount, status: finalStatus } }, { new: true, runValidators: true })
      .populate("student", "name class rollNo").populate("recordedBy", "name").lean();

    res.json({ success: true, record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/fees/:id
exports.deleteFeeRecord = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid fee record ID." });
    const record = await FeeRecord.findByIdAndDelete(req.params.id).lean();
    if (!record) return res.status(404).json({ success: false, message: "Fee record not found." });
    res.json({ success: true, message: "Fee record deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete fee record." });
  }
};
