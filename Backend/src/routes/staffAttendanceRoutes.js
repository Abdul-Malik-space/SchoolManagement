const express = require(
  "express"
);

const {
  markDailyAttendance,
  getDailyAttendance,
  getAttendanceRecords,
  getMonthlyAttendanceReport,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getDeletedAttendance,
  restoreAttendance
} = require(
  "../controllers/staffAttendanceController"
);

const {
  protect,
  authorize
} = require(
  "../middlewares/authMiddleware"
);

const schoolScope = require(
  "../middlewares/schoolScopeMiddleware"
);

const validateObjectId = require(
  "../middlewares/validateObjectId"
);

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Staff Attendance Permissions
|--------------------------------------------------------------------------
|
| Super Admin:
| - تمام schools کی staff attendance دیکھ اور manage کر سکتا ہے۔
|
| Principal:
| - صرف اپنے school کی staff attendance دیکھ اور manage کر سکتا ہے۔
|
| Accountant:
| - اپنے school کی attendance mark، update اور reports دیکھ سکتا ہے۔
| - Deleted attendance restore یا delete management نہیں کر سکتا۔
|
| Teacher:
| - Staff Attendance module تک access نہیں ہوگا۔
|
*/

/*
|--------------------------------------------------------------------------
| Mark or Update Daily Attendance
|--------------------------------------------------------------------------
|
| POST /api/staff-attendance/daily
|
| Payload:
|
| {
|   schoolId: "...",              // صرف Super Admin کے لیے
|   attendanceDate: "2026-07-27",
|   records: [
|     {
|       staffId: "...",
|       status: "present",
|       checkInTime: "08:00",
|       checkOutTime: "16:00",
|       breakMinutes: 30,
|       overtimeMinutes: 0,
|       lateMinutes: 0,
|       leaveType: "",
|       leaveReason: "",
|       remarks: ""
|     }
|   ]
| }
|
| اگر اسی date پر attendance پہلے سے موجود ہو تو record update ہوگا۔
|
*/

router.post(
  "/daily",
  protect,
  authorize(
    "super_admin",
    "principal",
    "accountant"
  ),
  schoolScope,
  markDailyAttendance
);

/*
|--------------------------------------------------------------------------
| Get Daily Attendance Register
|--------------------------------------------------------------------------
|
| GET /api/staff-attendance/daily
|
| Required query:
|
| attendanceDate=2026-07-27
|
| Super Admin کے لیے:
|
| schoolId=...
|
| Optional filters:
|
| search
| category
| department
|
| Response میں تمام active اور on-leave staff members آئیں گے۔
| Unmarked staff member کا attendance field null ہوگا۔
|
*/

router.get(
  "/daily",
  protect,
  authorize(
    "super_admin",
    "principal",
    "accountant"
  ),
  schoolScope,
  getDailyAttendance
);

/*
|--------------------------------------------------------------------------
| Monthly Attendance Report
|--------------------------------------------------------------------------
|
| GET /api/staff-attendance/monthly-report
|
| Query:
|
| schoolId
| year
| month
| staffId
| department
|
| Example:
|
| /api/staff-attendance/monthly-report?schoolId=...&year=2026&month=7
|
*/

router.get(
  "/monthly-report",
  protect,
  authorize(
    "super_admin",
    "principal",
    "accountant"
  ),
  schoolScope,
  getMonthlyAttendanceReport
);

/*
|--------------------------------------------------------------------------
| Deleted Attendance Records
|--------------------------------------------------------------------------
|
| GET /api/staff-attendance/deleted/list
|
| صرف Super Admin اور Principal access کر سکتے ہیں۔
|
| Static route کو /:id سے پہلے رکھنا ضروری ہے۔
|
*/

router.get(
  "/deleted/list",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  getDeletedAttendance
);

/*
|--------------------------------------------------------------------------
| Restore Deleted Attendance
|--------------------------------------------------------------------------
|
| PATCH /api/staff-attendance/:id/restore
|
*/

router.patch(
  "/:id/restore",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  validateObjectId("id"),
  restoreAttendance
);

/*
|--------------------------------------------------------------------------
| Get Attendance Records
|--------------------------------------------------------------------------
|
| GET /api/staff-attendance
|
| Optional filters:
|
| schoolId
| staffId
| status
| attendanceDate
| fromDate
| toDate
| search
| department
| page
| limit
|
*/

router.get(
  "/",
  protect,
  authorize(
    "super_admin",
    "principal",
    "accountant"
  ),
  schoolScope,
  getAttendanceRecords
);

/*
|--------------------------------------------------------------------------
| Get Single Attendance Record
|--------------------------------------------------------------------------
|
| GET /api/staff-attendance/:id
|
*/

router.get(
  "/:id",
  protect,
  authorize(
    "super_admin",
    "principal",
    "accountant"
  ),
  schoolScope,
  validateObjectId("id"),
  getAttendanceById
);

/*
|--------------------------------------------------------------------------
| Update Attendance Record
|--------------------------------------------------------------------------
|
| PUT /api/staff-attendance/:id
|
| Editable fields:
|
| status
| checkInTime
| checkOutTime
| breakMinutes
| overtimeMinutes
| lateMinutes
| leaveType
| leaveReason
| remarks
|
*/

router.put(
  "/:id",
  protect,
  authorize(
    "super_admin",
    "principal",
    "accountant"
  ),
  schoolScope,
  validateObjectId("id"),
  updateAttendance
);

/*
|--------------------------------------------------------------------------
| Soft Delete Attendance Record
|--------------------------------------------------------------------------
|
| DELETE /api/staff-attendance/:id
|
| Delete اور restore permissions صرف Super Admin اور Principal کے پاس ہیں۔
|
*/

router.delete(
  "/:id",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  validateObjectId("id"),
  deleteAttendance
);

module.exports = router;