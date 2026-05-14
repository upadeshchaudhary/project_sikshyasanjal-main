// backend/routes/fees.js
const mongoose  = require("mongoose");
const { FeeRecord, User, Student } = require("../../models");

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Auto-derive status from amounts and due date
function deriveStatus(amount, paidAmount, dueDate) {
  const paid = Number(paidAmount) || 0;
  const full = Number(amount)     || 0;
  if (paid >= full)   return "paid";
  if (paid > 0)       return "partially_paid";
  if (new Date() > new Date(dueDate)) return "overdue";
  return "pending";
}

// Whitelisted fields for create
const CREATE_FIELDS = [
  "student", "class", "feeType", "amount", "dueDate",
  "dueDateBs", "academicYear", "remarks",
];

// Whitelisted fields for update
const UPDATE_FIELDS = [
  "paidAmount", "paidDate", "paidDateBs", "paymentMethod",
  "status", "remarks", "amount", "dueDate", "dueDateBs",
];

function pickFields(body, allowed) {
  return allowed.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
}

const VALID_STATUSES      = ["paid", "partially_paid", "pending", "overdue"];
const VALID_FEE_TYPES     = ["tuition","exam","sports","library","transport","hostel","misc"];
const VALID_PAY_METHODS   = ["cash","bank_transfer","esewa","khalti","cheque","other"];

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/fees
// Admin:   all fee records with filters
// Parent:  ONLY their child's fee records
// Teacher: no access (fee data is admin + parent only)
// ════════════════════════════════════════════════════════════════════════════════
exports.getFees = async (req, res) => {
  try {
    const { role, userId } = req.user;

    // ── Teacher: no access to fee records ────────────────────────────────────
    if (role === "teacher") {
      return res.status(403).json({
        success: false,
        message: "Teachers do not have access to fee records.",
      });
    }

    // ── PARENT: child-only fee records ────────────────────────────────────────
    if (role === "parent") {
      const parent = await User.findById(userId)
        .select("childId childName childClass")
        .lean();

      if (!parent?.childId) {
        return res.json({ success: true, records: [], total: 0 });
      }

      // Hard-locked to child — no query params honoured
      const records = await FeeRecord.find({
        school:  req.school._id,
        student: parent.childId,
      })
        .populate("student", "name class rollNo")
        .sort({ dueDate: -1 })
        .lean();

      // Parent summary — outstanding dues
      const outstanding = records
        .filter(r => r.status !== "paid")
        .reduce((sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0);

      return res.json({
        success:     true,
        records,
        total:       records.length,
        outstanding,
        childName:   parent.childName,
      });
    }

    // ── ADMIN: full access with filters ───────────────────────────────────────
    const filter = { school: req.school._id };

    // Student filter
    if (req.query.student && isValidId(req.query.student)) {
      filter.student = req.query.student;
    }

    // Status filter
    if (req.query.status) {
      if (!VALID_STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_STATUSES.join(", ")}.`,
        });
      }
      filter.status = req.query.status;
    }

    // Class filter
    if (req.query.class?.trim())        filter.class        = req.query.class.trim();

    // Academic year filter
    if (req.query.academicYear?.trim()) filter.academicYear = req.query.academicYear.trim();

    // Fee type filter
    if (req.query.feeType?.trim()) {
      if (!VALID_FEE_TYPES.includes(req.query.feeType)) {
        return res.status(400).json({
          success: false,
          message: `feeType must be one of: ${VALID_FEE_TYPES.join(", ")}.`,
        });
      }
      filter.feeType = req.query.feeType.trim();
    }

    // Overdue filter — past dueDate and not fully paid
    if (req.query.overdue === "true") {
      filter.dueDate = { $lt: new Date() };
      filter.status  = { $in: ["pending", "partially_paid", "overdue"] };
    }

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip  = (page - 1) * limit;

    const [records, total] = await Promise.all([
      FeeRecord.find(filter)
        .populate("student", "name class rollNo")
        .populate("recordedBy", "name")
        .sort({ dueDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FeeRecord.countDocuments(filter),
    ]);

    res.json({
      success:    true,
      records,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch fee records." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/fees/summary — Admin dashboard fee summary
// Uses aggregation pipeline — no full collection load into memory
// Optionally scoped by academicYear
// ════════════════════════════════════════════════════════════════════════════════
exports.getFeeSummary = async (req, res) => {
  try {
    const matchFilter = { school: req.school._id };
    if (req.query.academicYear?.trim()) {
      matchFilter.academicYear = req.query.academicYear.trim();
    }

    // FIXED: aggregation pipeline — O(n) in DB, O(1) in Node memory
    const [agg, statusCounts] = await Promise.all([
      FeeRecord.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id:          null,
            totalAmount:  { $sum: "$amount" },
            totalPaid:    { $sum: "$paidAmount" },
            totalRecords: { $sum: 1 },
          },
        },
      ]),
      FeeRecord.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id:   "$status",
            count: { $sum: 1 },
            total: { $sum: "$amount" },
            paid:  { $sum: "$paidAmount" },
          },
        },
      ]),
    ]);

    const totals = agg[0] || { totalAmount: 0, totalPaid: 0, totalRecords: 0 };

    // Build status breakdown
    const breakdown = {
      paid:            { count: 0, amount: 0 },
      partially_paid:  { count: 0, amount: 0 },
      pending:         { count: 0, amount: 0 },
      overdue:         { count: 0, amount: 0 },
    };
    statusCounts.forEach(s => {
      if (breakdown[s._id]) {
        breakdown[s._id] = { count: s.count, amount: s.total, paid: s.paid };
      }
    });

    // FIXED: guard division by zero
    const collectionRate = totals.totalAmount > 0
      ? Math.round((totals.totalPaid / totals.totalAmount) * 100)
      : 0;

    const outstanding = totals.totalAmount - totals.totalPaid;

    res.json({
      success:        true,
      totalAmount:    totals.totalAmount,
      totalCollected: totals.totalPaid,
      outstanding:    Math.max(0, outstanding),
      collectionRate,
      totalRecords:   totals.totalRecords,
      breakdown,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch fee summary." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/fees/overdue — Admin: list of overdue fee records
// ════════════════════════════════════════════════════════════════════════════════
exports.getOverdueFees = async (req, res) => {
  try {
    // Also auto-update stale "pending" records that have passed due date
    // (runs in background — don't await to avoid slowing the response)
    FeeRecord.updateMany(
      {
        school:  req.school._id,
        status:  "pending",
        dueDate: { $lt: new Date() },
      },
      { $set: { status: "overdue" } }
    ).catch(() => {}); // fire-and-forget, no await

    const records = await FeeRecord.find({
      school:  req.school._id,
      status:  { $in: ["overdue", "pending"] },
      dueDate: { $lt: new Date() },
    })
      .populate("student", "name class rollNo parentPhone")
      .sort({ dueDate: 1 }) // oldest overdue first
      .limit(100)
      .lean();

    const totalOverdue = records.reduce(
      (sum, r) => sum + (r.amount - (r.paidAmount || 0)), 0
    );

    res.json({
      success:      true,
      records,
      count:        records.length,
      totalOverdue,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch overdue fees." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/fees/:id — Single fee record
// ════════════════════════════════════════════════════════════════════════════════
exports.getFeeRecord = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid fee record ID." });
    }

    const { role, userId } = req.user;

    if (role === "teacher") {
      return res.status(403).json({
        success: false,
        message: "Teachers do not have access to fee records.",
      });
    }

    const record = await FeeRecord.findOne({
      _id:    req.params.id,
      school: req.school._id,
    })
      .populate("student", "name class rollNo")
      .lean();

    if (!record) {
      return res.status(404).json({ success: false, message: "Fee record not found." });
    }

    // Parent: can only view their child's record
    if (role === "parent") {
      const parent = await User.findById(userId).select("childId").lean();
      if (!parent?.childId || record.student._id.toString() !== parent.childId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only view your child's fee records.",
        });
      }
    }

    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch fee record." });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// POST /api/fees — Create fee record
// Admin only
// ════════════════════════════════════════════════════════════════════════════════
exports.createFeeRecord = async (req, res) => {
  try {
    const { userId } = req.user;
    const { student, amount, dueDate, academicYear, feeType } = req.body;

    // Required field validation
    const missing = [];
    if (!student || !isValidId(student)) missing.push("student (valid ID)");
    if (!amount || Number(amount) <= 0)  missing.push("amount (positive number)");
    if (!dueDate)                        missing.push("dueDate");
    if (!academicYear?.trim())           missing.push("academicYear");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing or invalid fields: ${missing.join(", ")}.`,
      });
    }

    // Validate feeType if provided
    if (feeType && !VALID_FEE_TYPES.includes(feeType)) {
      return res.status(400).json({
        success: false,
        message: `feeType must be one of: ${VALID_FEE_TYPES.join(", ")}.`,
      });
    }

    // Verify student belongs to this school
    const studentDoc = await Student.findOne({
      _id:    student,
      school: req.school._id,
    }).select("_id class name").lean();

    if (!studentDoc) {
      return res.status(404).json({
        success: false,
        message: "Student not found in this school.",
      });
    }

    const fields = pickFields(req.body, CREATE_FIELDS);

    // Auto-set class from student if not provided
    if (!fields.class) fields.class = studentDoc.class;

    const record = await FeeRecord.create({
      ...fields,
      school:     req.school._id,
      amount:     Number(amount),
      paidAmount: 0,
      status:     "pending",
      recordedBy: userId,
    });

    await record.populate("student", "name class rollNo");

    res.status(201).json({ success: true, record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// PUT /api/fees/:id — Record payment / update fee record
// Admin only
// ════════════════════════════════════════════════════════════════════════════════
exports.updateFeeRecord = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid fee record ID." });
    }

    const existing = await FeeRecord.findOne({
      _id:    req.params.id,
      school: req.school._id,
    }).lean();

    if (!existing) {
      return res.status(404).json({ success: false, message: "Fee record not found." });
    }

    // Whitelist update fields
    const updates = pickFields(req.body, UPDATE_FIELDS);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    // Validate payment method if being set
    if (updates.paymentMethod && !VALID_PAY_METHODS.includes(updates.paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `paymentMethod must be one of: ${VALID_PAY_METHODS.join(", ")}.`,
      });
    }

    // Validate paidAmount doesn't exceed total amount
    const newPaidAmount = updates.paidAmount !== undefined
      ? Number(updates.paidAmount)
      : existing.paidAmount;

    const totalAmount = updates.amount !== undefined
      ? Number(updates.amount)
      : existing.amount;

    if (newPaidAmount > totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Paid amount (${newPaidAmount}) cannot exceed total fee amount (${totalAmount}).`,
      });
    }

    if (newPaidAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Paid amount cannot be negative.",
      });
    }

    // FIXED: auto-derive status from amounts + due date
    // Only auto-derive if status not explicitly set in the request
    const dueDate = updates.dueDate || existing.dueDate;
    const autoStatus = deriveStatus(totalAmount, newPaidAmount, dueDate);

    // If admin explicitly sets status, use that; otherwise auto-derive
    const finalStatus = updates.status && VALID_STATUSES.includes(updates.status)
      ? updates.status
      : autoStatus;

    // If marking as paid, auto-set paidDate if not provided
    if (finalStatus === "paid" && !updates.paidDate && !existing.paidDate) {
      updates.paidDate   = new Date();
      updates.paidDateBs = updates.paidDateBs || "";
    }

    const record = await FeeRecord.findOneAndUpdate(
      { _id: req.params.id, school: req.school._id },
      {
        $set: {
          ...updates,
          paidAmount: newPaidAmount,
          status:     finalStatus,
        },
      },
      { new: true, runValidators: true }
    )
      .populate("student", "name class rollNo")
      .populate("recordedBy", "name")
      .lean();

    res.json({ success: true, record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// DELETE /api/fees/:id — Delete fee record
// Admin only
// ════════════════════════════════════════════════════════════════════════════════
exports.deleteFeeRecord = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid fee record ID." });
    }

    const record = await FeeRecord.findOneAndDelete({
      _id:    req.params.id,
      school: req.school._id,
    }).lean();

    if (!record) {
      return res.status(404).json({ success: false, message: "Fee record not found." });
    }

    res.json({
      success: true,
      message: "Fee record deleted successfully.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete fee record." });
  }
};
