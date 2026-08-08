const express =
  require("express");

/*
|--------------------------------------------------------------------------
| Parent Portal Main Controller
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Parent Results and Report Cards Controller
|--------------------------------------------------------------------------
*/

const {
  getParentChildResults,
  getParentChildResultById,
  getParentChildReportCardById
} = require(
  "../controllers/parentPortalResultController"
);

/*
|--------------------------------------------------------------------------
| Authentication Middleware
|--------------------------------------------------------------------------
*/

const {
  protect,
  authorize
} = require(
  "../middlewares/authMiddleware"
);

/*
|--------------------------------------------------------------------------
| Object ID Validation
|--------------------------------------------------------------------------
*/

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
| اس router کے تمام endpoints کیلئے:
|
| 1. Valid authenticated login ضروری ہے۔
|
| 2. صرف "parent" role access کر سکتا ہے۔
|
| 3. ParentPortal controllers authenticated parent کے:
|
|    - parent user ID
|    - school ID
|    - linked children
|
|    کے مطابق data scope کرتے ہیں۔
|
| 4. Child routes میں studentId URL میں record selector کے طور پر آتا ہے،
|    لیکن controller ہمیشہ verify کرتا ہے کہ وہ child واقعی اسی parent کے
|    ساتھ active + verified link رکھتا ہے۔
|
| 5. Result ID یا Report Card ID اکیلے access نہیں دیتے۔
|
*/

router.use(
  protect,
  authorize(
    "parent"
  )
);

/*
|--------------------------------------------------------------------------
| Reusable Object ID Validators
|--------------------------------------------------------------------------
*/

const validateStudentId =
  validateObjectId(
    "studentId"
  );

const validateResultId =
  validateObjectId(
    "resultId"
  );

const validateReportCardId =
  validateObjectId(
    "reportCardId"
  );

/*
|--------------------------------------------------------------------------
| Parent Portal Overview
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/overview
|
| Returns:
|
| - Parent account information
| - School information
| - Principal information
| - Linked children
| - Attendance summaries
| - Fee balances
| - Today's classes
| - Message counters
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
|
| OR:
|
| from=2026-07-01
| to=2026-07-31
|
| Pagination:
|
| page=1
| limit=20
|
| Returns:
|
| - Present days
| - Absent days
| - Late days
| - Leave days
| - Attendance percentage
| - Date-wise records
| - Remarks
| - Pagination
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
| Returns:
|
| - Total payable
| - Total paid
| - Outstanding amount
| - Fee records
| - Payment history
| - Receipts
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
| Returns:
|
| - Published timetable
| - Today's classes
| - Weekly timetable
| - Subject
| - Teacher
| - Room
| - Online meeting information
|
*/

router.get(
  "/children/:studentId/timetable",
  validateStudentId,
  getParentChildTimetable
);

/*
|--------------------------------------------------------------------------
| Child Examination Results
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/results
|
| Parent کو صرف اسی linked child کے:
|
| - published results
| - locked results
| - completed pass / fail results
|
| دکھائے جائیں گے۔
|
| Parent–Student Link requirements:
|
| - link must be active
| - verificationStatus must be verified
| - academics permission must be enabled
|
| Supported query parameters:
|
| academicYear=2026-2027
| academicTerm=Term 1
| overallResultStatus=pass|fail
| page=1
| limit=20
|
| Returns:
|
| - Child information
| - Published examination results
| - Total marks
| - Obtained marks
| - Percentage
| - Grade
| - GPA when enabled
| - Class position when enabled
| - Section position when enabled
| - Published report-card availability
| - Result summary
| - Pagination
|
*/

router.get(
  "/children/:studentId/results",
  validateStudentId,
  getParentChildResults
);

/*
|--------------------------------------------------------------------------
| Child Examination Result Detail
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/results/:resultId
|
| Security:
|
| resultId صرف result record selector ہے۔
|
| Controller لازماً verify کرتا ہے:
|
| - authenticated parent
| - parent school
| - linked child
| - active parent-student link
| - verified parent-student link
| - academics permission
| - ExamResult.studentId === linked child
| - ExamResult.schoolId === parent school
| - result published / locked ہو
|
| اگر Parent کسی دوسرے student کا valid resultId بھی URL میں دے تو
| controller اسے access نہیں دے گا۔
|
| Returns:
|
| - Exam information
| - Child information
| - Subject-wise marks
| - Passing marks
| - Obtained marks
| - Subject percentages
| - Subject grades
| - Overall percentage
| - Overall grade
| - GPA when enabled
| - Class position
| - Section position
| - Attendance summary
| - Teacher remarks
| - Principal remarks
| - Published report card
|
*/

router.get(
  "/children/:studentId/results/:resultId",
  validateStudentId,
  validateResultId,
  getParentChildResultById
);

/*
|--------------------------------------------------------------------------
| Child Published Report Card
|--------------------------------------------------------------------------
|
| GET
| /api/parent-portal/children/:studentId/report-cards/:reportCardId
|
| Parent صرف linked child کا official published report card دیکھ سکتا ہے۔
|
| Report Card requirements:
|
| - student must belong to authenticated parent
| - ParentStudentLink active ہو
| - ParentStudentLink verified ہو
| - academics permission enabled ہو
| - reportCard.status = published
| - reportCard.studentId = linked child
| - reportCard.schoolId = parent school
| - accessPolicy.allowParentView !== false
| - visibility:
|
|     student_parent
|     OR
|     public_verification
|
| Source ExamResult بھی:
|
| - اسی linked child کا ہونا چاہیے
| - published / locked ہونا چاہیے
|
| Download:
|
| Direct document URL صرف تب return ہوگا جب:
|
| accessPolicy.allowParentDownload === true
|
| ورنہ Parent report card preview اور print استعمال کر سکے گا، لیکن direct
| stored document URL expose نہیں ہوگا۔
|
*/

router.get(
  "/children/:studentId/report-cards/:reportCardId",
  validateStudentId,
  validateReportCardId,
  getParentChildReportCardById
);

/*
|--------------------------------------------------------------------------
| Child Academic Summary
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/academics
|
| Returns:
|
| - Current subjects
| - Assigned teachers
| - Academic summary
|
| Examination Results اور Report Cards اب dedicated endpoints پر available
| ہیں:
|
| GET /children/:studentId/results
|
| GET /children/:studentId/results/:resultId
|
| GET /children/:studentId/report-cards/:reportCardId
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
| Existing portal naming pattern کے ساتھ compatibility کیلئے profile alias۔
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
| Canonical child profile endpoint۔
|
| IMPORTANT:
|
| یہ dynamic route تمام specific nested child routes کے بعد رکھا گیا ہے۔
|
| مثال:
|
| /children/:studentId/results
| /children/:studentId/attendance
| /children/:studentId/fees
|
| پہلے match ہوں گے اور generic profile route آخر میں رہے گا۔
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