const express = require("express");

const {
  createClass,
  getClasses,
  getDeletedClasses,
  getClassById,
  updateClass,
  deleteClass,
  restoreClass
} = require("../controllers/classController");

const {
  protect,
  authorize
} = require("../middlewares/authMiddleware");

const schoolScope = require("../middlewares/schoolScopeMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");

const router = express.Router();

/* =========================
   Class Routes
========================= */

// Create class
router.post(
  "/",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  createClass
);

// Get all active/non-deleted classes
router.get(
  "/",
  protect,
  authorize("super_admin", "principal", "teacher", "accountant"),
  schoolScope,
  getClasses
);

// Get soft deleted classes
router.get(
  "/deleted/list",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  getDeletedClasses
);

// Restore soft deleted class
router.patch(
  "/:id/restore",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  validateObjectId("id"),
  restoreClass
);

// Get single class by ID
router.get(
  "/:id",
  protect,
  authorize("super_admin", "principal", "teacher", "accountant"),
  schoolScope,
  validateObjectId("id"),
  getClassById
);

// Update class
router.put(
  "/:id",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  validateObjectId("id"),
  updateClass
);

// Soft delete class
router.delete(
  "/:id",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  validateObjectId("id"),
  deleteClass
);

module.exports = router;