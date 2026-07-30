const express =
  require("express");

const {
  getParentPortalOverview,
  getParentChildren,
  getParentChildProfile,
  getParentChildAttendance,
  getParentChildFees,
  getParentChildTimetable,
  getParentChildAcademicSummary,
  getParentChildSnapshot
} = require(
  "../controllers/parentPortalController"
);

const {
  protect,
  authorize
} = require(
  "../middlewares/authMiddleware"
);

const validateObjectId =
  require(
    "../middlewares/validateObjectId"
  );

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Parent Portal Security
|--------------------------------------------------------------------------
|
| اس router کے تمام endpoints:
|
| 1. Login authentication require کرتے ہیں۔
| 2. صرف parent role کے لیے available ہیں۔
| 3. Controller authenticated parent کے schoolId اور linked children کے
|    مطابق data scope کرتا ہے۔
|
*/

router.use(
  protect,
  authorize("parent")
);

/*
|--------------------------------------------------------------------------
| Reusable Student ID Validation
|--------------------------------------------------------------------------
*/

const validateStudentId =
  validateObjectId(
    "studentId"
  );

/*
|--------------------------------------------------------------------------
| Parent Portal Overview
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/overview
|
| Parent، school، principal، children، attendance summary، fee balance،
| today's classes اور unread message counters return کرتا ہے۔
|
*/

router.get(
  "/overview",
  getParentPortalOverview
);

/*
|--------------------------------------------------------------------------
| Linked Children
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children
|
| Parent کے تمام active اور verified linked children return کرتا ہے۔
|
*/

router.get(
  "/children",
  getParentChildren
);

/*
|--------------------------------------------------------------------------
| Child Dashboard Snapshot
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/snapshot
|
| Parent جب ایک child سے دوسرے child پر switch کرے تو lightweight dashboard
| summary return ہوتی ہے۔
|
*/

router.get(
  "/children/:studentId/snapshot",
  validateStudentId,
  getParentChildSnapshot
);

/*
|--------------------------------------------------------------------------
| Child Attendance
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/attendance
|
| Supported query parameters:
|
| month=2026-07
| from=2026-07-01
| to=2026-07-31
| page=1
| limit=20
|
*/

router.get(
  "/children/:studentId/attendance",
  validateStudentId,
  getParentChildAttendance
);

/*
|--------------------------------------------------------------------------
| Child Fee Records
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/fees
|
| Supported query parameters:
|
| feeMonth=July
| sessionYear=2026-2027
| paymentStatus=paid|partial|unpaid
| page=1
| limit=20
|
*/

router.get(
  "/children/:studentId/fees",
  validateStudentId,
  getParentChildFees
);

/*
|--------------------------------------------------------------------------
| Child Timetable
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/timetable
|
| Supported query parameters:
|
| rotationWeekCode=STANDARD
| day=monday
|
*/

router.get(
  "/children/:studentId/timetable",
  validateStudentId,
  getParentChildTimetable
);

/*
|--------------------------------------------------------------------------
| Child Academic Summary
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/academics
|
| Current subjects اور assigned teachers return کرتا ہے۔ Examination result
| module شامل ہونے کے بعد grades اور report cards بھی اسی response structure
| میں شامل کیے جا سکیں گے۔
|
*/

router.get(
  "/children/:studentId/academics",
  validateStudentId,
  getParentChildAcademicSummary
);

/*
|--------------------------------------------------------------------------
| Child Profile Alias
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/profile
|
| Existing portal naming pattern کے ساتھ compatibility کے لیے profile alias۔
|
*/

router.get(
  "/children/:studentId/profile",
  validateStudentId,
  getParentChildProfile
);

/*
|--------------------------------------------------------------------------
| Child Profile
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId
|
| Canonical child profile endpoint۔ اسے تمام nested child routes کے بعد رکھا
| گیا ہے تاکہ route structure واضح اور maintainable رہے۔
|
*/

router.get(
  "/children/:studentId",
  validateStudentId,
  getParentChildProfile
);

/*
|--------------------------------------------------------------------------
| Export Router
|--------------------------------------------------------------------------
*/

module.exports =
  router;