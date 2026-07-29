const express = require("express");

const {
  markStudentAttendance,
  getStudentAttendance,
  getStudentAttendanceById,
  updateStudentAttendance,
  deleteStudentAttendance
} = require("../controllers/studentAttendanceController");

const {
  protect,
  authorize
} = require("../middlewares/authMiddleware");

const schoolScope = require("../middlewares/schoolScopeMiddleware");
const validateObjectId = require("../middlewares/validateObjectId");

const router = express.Router();

/* =========================
   Student Attendance Routes
========================= */

// Mark student attendance
// super_admin: any school through valid scoped data
// principal/teacher: only their own school
router.post(
  "/students",
  protect,
  authorize("super_admin", "principal", "teacher"),
  schoolScope,
  markStudentAttendance
);

// Get student attendance list
// super_admin: all schools or query schoolId
// principal/teacher: only their own school
router.get(
  "/students",
  protect,
  authorize("super_admin", "principal", "teacher"),
  schoolScope,
  getStudentAttendance
);

// Get single attendance record
// school restricted
router.get(
  "/students/:id",
  protect,
  authorize("super_admin", "principal", "teacher"),
  schoolScope,
  validateObjectId("id"),
  getStudentAttendanceById
);

// Update attendance record
// school restricted
router.put(
  "/students/:id",
  protect,
  authorize("super_admin", "principal", "teacher"),
  schoolScope,
  validateObjectId("id"),
  updateStudentAttendance
);

// Delete attendance record
// super_admin/principal only
// school restricted
router.delete(
  "/students/:id",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  validateObjectId("id"),
  deleteStudentAttendance
);

module.exports = router;