const express = require(
  "express"
);

const {
  getStudentPortalOverview,
  getStudentPortalProfile,
  getStudentPortalAttendance,
  getStudentPortalFees,
  getStudentPortalTimetable,
  getStudentPortalAcademicSummary,
  getStudentPortalSnapshot
} = require(
  "../controllers/studentPortalController"
);

const {
  protect,
  authorize
} = require(
  "../middlewares/authMiddleware"
);

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Student Portal Security
|--------------------------------------------------------------------------
|
| تمام routes کے لیے:
|
| 1. Valid login token ضروری ہے۔
| 2. صرف "student" role اجازت رکھتا ہے۔
| 3. Controller authenticated user کے studentUserId اور schoolId سے Student
|    profile خود resolve کرتا ہے۔
| 4. Client request سے کوئی studentId قبول نہیں کیا جاتا، اس لیے طالب علم
|    دوسرے طالب علم کا record access نہیں کر سکتا۔
|
*/

router.use(
  protect,
  authorize(
    "student"
  )
);

/*
|--------------------------------------------------------------------------
| Student Portal Overview
|--------------------------------------------------------------------------
|
| GET /api/student-portal/overview
|
| Returns:
|
| - Student identity and school information
| - Today's timetable and next class
| - Monthly attendance summary and risk
| - Fee summary and outstanding balance
| - Subject count
| - Message summary
| - Profile completion
| - Smart alerts
| - Available portal capabilities
| - Quick actions
|
| Optional query:
|
| rotationWeekCode=STANDARD
|
*/

router.get(
  "/overview",
  getStudentPortalOverview
);

/*
|--------------------------------------------------------------------------
| Student Portal Snapshot
|--------------------------------------------------------------------------
|
| GET /api/student-portal/snapshot
|
| Lightweight endpoint for:
|
| - Mobile dashboard refresh
| - Topbar counters
| - Unread message badge
| - Attendance widget
| - Outstanding fee badge
| - Today's next class
| - Smart alerts
|
| Optional query:
|
| rotationWeekCode=STANDARD
|
*/

router.get(
  "/snapshot",
  getStudentPortalSnapshot
);

/*
|--------------------------------------------------------------------------
| Student Profile and Digital ID
|--------------------------------------------------------------------------
|
| GET /api/student-portal/profile
|
| Returns:
|
| - Official student profile
| - School, class and section
| - Login account
| - Linked parents
| - Profile completion
| - Digital Student ID payload
| - Profile correction policy
|
| Official data is read-only in the Student Portal.
|
*/

router.get(
  "/profile",
  getStudentPortalProfile
);

/*
|--------------------------------------------------------------------------
| Student Attendance
|--------------------------------------------------------------------------
|
| GET /api/student-portal/attendance
|
| Supported query options:
|
| month=2026-08
|
| OR:
|
| from=2026-08-01
| to=2026-08-31
|
| Pagination:
|
| page=1
| limit=20
|
| Returns:
|
| - Present, absent, late and leave totals
| - Attendance percentage
| - Attendance risk level
| - Date-wise attendance records
| - Remarks
| - Pagination
|
*/

router.get(
  "/attendance",
  getStudentPortalAttendance
);

/*
|--------------------------------------------------------------------------
| Student Fees and Receipts
|--------------------------------------------------------------------------
|
| GET /api/student-portal/fees
|
| Supported query options:
|
| feeMonth=2026-08
| sessionYear=2026-2027
| useCurrentSession=true
| paymentStatus=unpaid|partial|paid
| page=1
| limit=20
|
| Returns:
|
| - Total payable
| - Total paid
| - Outstanding balance
| - Account status
| - Invoice records
| - Payment history
| - Receipt-related payment details
|
*/

router.get(
  "/fees",
  getStudentPortalFees
);

/*
|--------------------------------------------------------------------------
| Student Timetable
|--------------------------------------------------------------------------
|
| GET /api/student-portal/timetable
|
| Supported query options:
|
| rotationWeekCode=STANDARD
| day=monday
|
| Allowed days:
|
| monday
| tuesday
| wednesday
| thursday
| friday
| saturday
| sunday
|
| Returns:
|
| - Published timetable configuration
| - Rotation week
| - Complete weekly timetable
| - Day-wise entries
| - Today's classes
| - Next class
| - Subject, teacher, room and online meeting details
|
*/

router.get(
  "/timetable",
  getStudentPortalTimetable
);

/*
|--------------------------------------------------------------------------
| Subjects and Academic Summary
|--------------------------------------------------------------------------
|
| GET /api/student-portal/academics
|
| Returns:
|
| - Class subjects
| - Assigned teachers
| - Subject and teacher counts
| - Availability status for future academic modules
|
| Results, assignments, examinations and report cards will become available
| here when their dedicated models are added.
|
*/

router.get(
  "/academics",
  getStudentPortalAcademicSummary
);

/*
|--------------------------------------------------------------------------
| Subjects Alias
|--------------------------------------------------------------------------
|
| GET /api/student-portal/subjects
|
| Frontend menu may use "Subjects" while the consolidated API remains
| academic-summary based. Both paths return the same secure response.
|
*/

router.get(
  "/subjects",
  getStudentPortalAcademicSummary
);

module.exports =
  router;
