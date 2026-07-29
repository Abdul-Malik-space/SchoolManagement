const express = require("express");

const {
  createSubject,
  getSubjects,
  getDeletedSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  restoreSubject
} = require("../controllers/subjectController");

const {
  protect,
  authorize
} = require("../middlewares/authMiddleware");

const schoolScope = require("../middlewares/schoolScopeMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");

const router = express.Router();

/* =========================
   Subject Routes
========================= */

// Create subject
// super_admin: body سے schoolId دے سکتا ہے
// principal: اپنے school میں subject create کرے گا
router.post(
  "/",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  createSubject
);

// Get all active/non-deleted subjects
router.get(
  "/",
  protect,
  authorize("super_admin", "principal", "teacher", "accountant"),
  schoolScope,
  getSubjects
);

// Get soft deleted subjects
router.get(
  "/deleted/list",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  getDeletedSubjects
);

// Restore soft deleted subject
router.patch(
  "/:id/restore",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  validateObjectId("id"),
  restoreSubject
);

// Get single subject by ID
router.get(
  "/:id",
  protect,
  authorize("super_admin", "principal", "teacher", "accountant"),
  schoolScope,
  validateObjectId("id"),
  getSubjectById
);

// Update subject
router.put(
  "/:id",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  validateObjectId("id"),
  updateSubject
);

// Soft delete subject
router.delete(
  "/:id",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  validateObjectId("id"),
  deleteSubject
);

module.exports = router;