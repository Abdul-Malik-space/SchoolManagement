const express = require("express");

const {
  getStudentMyProfile,
  getStudentMyAttendance,
  getStudentMyFees,
  getParentChildren,
  getParentChildProfile,
  getParentChildAttendance,
  getParentChildFees
} = require("../controllers/portalController");

const {
  protect,
  authorize
} = require("../middlewares/authMiddleware");

const router = express.Router();

/* Student Portal */
router.get(
  "/student/me",
  protect,
  authorize("student"),
  getStudentMyProfile
);

router.get(
  "/student/attendance",
  protect,
  authorize("student"),
  getStudentMyAttendance
);

router.get(
  "/student/fees",
  protect,
  authorize("student"),
  getStudentMyFees
);

/* Parent Portal */
router.get(
  "/parent/children",
  protect,
  authorize("parent"),
  getParentChildren
);

router.get(
  "/parent/children/:studentId/profile",
  protect,
  authorize("parent"),
  getParentChildProfile
);

router.get(
  "/parent/children/:studentId/attendance",
  protect,
  authorize("parent"),
  getParentChildAttendance
);

router.get(
  "/parent/children/:studentId/fees",
  protect,
  authorize("parent"),
  getParentChildFees
);

module.exports = router;