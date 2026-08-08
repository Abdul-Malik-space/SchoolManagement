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

/*
|--------------------------------------------------------------------------
| Student Result and Report Card Controller
|--------------------------------------------------------------------------
*/

const {
  getStudentPortalResults,
  getStudentPortalResultById,
  getStudentPortalReportCardById
} = require(
  "../controllers/studentPortalResultController"
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
| 3. Controllers authenticated user کے studentUserId اور schoolId سے
|    Student profile خود resolve کرتے ہیں۔
| 4. Client request سے کوئی studentId قبول نہیں کیا جاتا۔
| 5. Student کسی دوسرے student کا result یا report card access نہیں کر سکتا۔
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
| Student Examination Results
|--------------------------------------------------------------------------
|
| GET /api/student-portal/results
|
| Student کو صرف اپنے:
|
| - Published results
| - Locked results
| - Complete Pass / Fail results
|
| دکھائے جائیں گے۔
|
| Client سے studentId نہیں لیا جاتا۔
|
| Supported query options:
|
| academicYear=2026-2027
| academicTerm=Term 1
| overallResultStatus=pass|fail
| page=1
| limit=20
|
| Returns:
|
| - Student information
| - Published examination results
| - Total marks
| - Obtained marks
| - Percentage
| - Grade
| - GPA when enabled
| - Class position when enabled
| - Section position when enabled
| - Report-card availability
| - Result summary
| - Pagination
|
*/

router.get(
  "/results",
  getStudentPortalResults
);

/*
|--------------------------------------------------------------------------
| Student Examination Result Detail
|--------------------------------------------------------------------------
|
| GET /api/student-portal/results/:resultId
|
| Important Security:
|
| resultId صرف record selector ہے۔
|
| Controller query میں لازماً:
|
| - authenticated student's schoolId
| - authenticated Student record ID
|
| شامل ہوتے ہیں۔
|
| اس لیے اگر student کسی دوسرے student کا valid resultId بھی دے، تب بھی
| اسے وہ result نہیں ملے گا۔
|
| Returns:
|
| - Exam information
| - Student information
| - Subject-wise marks
| - Subject result status
| - Grades
| - Total marks
| - Percentage
| - GPA when enabled
| - Class / Section position when enabled
| - Attendance summary when enabled
| - Teacher remarks when enabled
| - Principal remarks when enabled
| - Published report-card information
|
*/

router.get(
  "/results/:resultId",
  getStudentPortalResultById
);

/*
|--------------------------------------------------------------------------
| Student Published Report Card
|--------------------------------------------------------------------------
|
| GET /api/student-portal/report-cards/:reportCardId
|
| Student صرف اپنا published report card دیکھ سکتا ہے۔
|
| Report Card access rules:
|
| - status = published
| - allowStudentView !== false
| - visibility = student_parent OR public_verification
| - schoolId must match authenticated student
| - studentId must match authenticated student
| - source ExamResult must still be published / locked
|
| Download URL صرف تب return ہوگا جب:
|
| allowStudentDownload = true
|
| Otherwise student report card دیکھ اور print کر سکتا ہے، لیکن backend
| document download URL expose نہیں کرے گا۔
|
*/

router.get(
  "/report-cards/:reportCardId",
  getStudentPortalReportCardById
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
| - Availability status for academic modules
|
| Dedicated published-result endpoints اب:
|
| GET /api/student-portal/results
| GET /api/student-portal/results/:resultId
|
| پر available ہیں۔
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
| Frontend menu "Subjects" استعمال کر سکتا ہے جبکہ consolidated academic
| summary endpoint بھی اسی controller کو استعمال کرتا ہے۔
|
*/

router.get(
  "/subjects",
  getStudentPortalAcademicSummary
);

/*
|--------------------------------------------------------------------------
| Export Router
|--------------------------------------------------------------------------
*/

module.exports =
  router;