const express =
  require("express");

const authMiddleware =
  require("../middlewares/authMiddleware");

const {
  createTimetableEntry,
  createTimetableEntriesBulk,
  validateTimetableSlot,

  getTimetableEntries,
  getTimetableEntryById,
  updateTimetableEntry,

  cancelTimetableEntry,
  reactivateTimetableEntry,

  deleteTimetableEntry,
  getDeletedTimetableEntries,
  restoreTimetableEntry,

  getTimetableBuilderData,
  getClassTimetable,
  getTeacherTimetable,
  getSchoolTimetable,
  getTimetableReport
} = require(
  "../controllers/timetableController"
);

/*
|--------------------------------------------------------------------------
| Router
|--------------------------------------------------------------------------
*/

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Authentication Middleware Compatibility
|--------------------------------------------------------------------------
|
| Project میں authorization middleware ان دونوں ناموں میں سے کسی ایک سے
| export ہو سکتا ہے:
|
| authorize(...)
| authorizeRoles(...)
|
*/

const protect =
  authMiddleware.protect;

const authorize =
  authMiddleware.authorize ||
  authMiddleware.authorizeRoles;

if (
  typeof protect !==
  "function"
) {
  throw new Error(
    "authMiddleware.protect is not available."
  );
}

if (
  typeof authorize !==
  "function"
) {
  throw new Error(
    "authMiddleware must export authorize or authorizeRoles."
  );
}

/*
|--------------------------------------------------------------------------
| Role Groups
|--------------------------------------------------------------------------
*/

const TIMETABLE_VIEW_ROLES = [
  "super_admin",
  "principal",
  "teacher"
];

const TIMETABLE_MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Authorization Helper
|--------------------------------------------------------------------------
*/

const allowRoles = (
  roles
) => {
  return authorize(
    ...roles
  );
};

/*
|--------------------------------------------------------------------------
| Protect All Timetable Routes
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| Static Read Routes
|--------------------------------------------------------------------------
|
| تمام static routes کو /:id route سے پہلے رکھنا ضروری ہے۔
|
*/

/*
|--------------------------------------------------------------------------
| Timetable Builder Data
|--------------------------------------------------------------------------
|
| GET /api/timetables/builder-data
|
| Query parameters:
|
| timetableConfigId
| schoolId
| rotationWeekCode
| classId
|
| صرف Super Admin اور Principal timetable builder کھول سکتے ہیں۔
|
*/

router.get(
  "/builder-data",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  getTimetableBuilderData
);

/*
|--------------------------------------------------------------------------
| Validate Timetable Slot
|--------------------------------------------------------------------------
|
| POST /api/timetables/validate-slot
|
| کسی entry کو save کرنے سے پہلے class، teacher، room، workload اور period
| conflicts check کیے جاتے ہیں۔
|
*/

router.post(
  "/validate-slot",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  validateTimetableSlot
);

/*
|--------------------------------------------------------------------------
| Complete School Timetable
|--------------------------------------------------------------------------
|
| GET /api/timetables/school
|
| Query parameters:
|
| timetableConfigId
| schoolId
| rotationWeekCode
| day
|
*/

router.get(
  "/school",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getSchoolTimetable
);

/*
|--------------------------------------------------------------------------
| Timetable Report
|--------------------------------------------------------------------------
|
| GET /api/timetables/report
|
| Query parameters:
|
| timetableConfigId
| schoolId
| rotationWeekCode
| entryStatus
|
*/

router.get(
  "/report",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getTimetableReport
);

/*
|--------------------------------------------------------------------------
| Deleted Timetable Entries
|--------------------------------------------------------------------------
|
| GET /api/timetables/deleted
|
| Query parameters may include:
|
| schoolId
| timetableConfigId
| search
| classId
| subjectId
| teacherId
| day
| page
| limit
|
*/

router.get(
  "/deleted",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  getDeletedTimetableEntries
);

/*
|--------------------------------------------------------------------------
| Class Timetable
|--------------------------------------------------------------------------
|
| GET /api/timetables/class/:classId
|
| Query parameters:
|
| timetableConfigId
| schoolId
| rotationWeekCode
| sectionName
|
*/

router.get(
  "/class/:classId",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getClassTimetable
);

/*
|--------------------------------------------------------------------------
| Class Timetable by Query
|--------------------------------------------------------------------------
|
| GET /api/timetables/class
|
| Query میں classId بھیجنے کی صورت میں یہ alternate endpoint استعمال ہوگا۔
|
*/

router.get(
  "/class",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getClassTimetable
);

/*
|--------------------------------------------------------------------------
| Teacher Timetable
|--------------------------------------------------------------------------
|
| GET /api/timetables/teacher/:teacherId
|
| Query parameters:
|
| timetableConfigId
| schoolId
| rotationWeekCode
|
*/

router.get(
  "/teacher/:teacherId",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getTeacherTimetable
);

/*
|--------------------------------------------------------------------------
| Teacher Timetable by Query
|--------------------------------------------------------------------------
|
| GET /api/timetables/teacher
|
| Query میں teacherId بھیجنے کی صورت میں یہ alternate endpoint استعمال ہوگا۔
|
*/

router.get(
  "/teacher",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getTeacherTimetable
);

/*
|--------------------------------------------------------------------------
| Bulk Timetable Entries
|--------------------------------------------------------------------------
|
| POST /api/timetables/bulk
|
| Example body:
|
| {
|   "timetableConfigId": "...",
|   "entries": [
|     {
|       "day": "monday",
|       "periodId": "...",
|       "classId": "...",
|       "sectionName": "A",
|       "subjectId": "...",
|       "teacherId": "...",
|       "room": {
|         "name": "Room 10",
|         "code": "R-10"
|       }
|     }
|   ]
| }
|
*/

router.post(
  "/bulk",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  createTimetableEntriesBulk
);

/*
|--------------------------------------------------------------------------
| Collection Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| List Timetable Entries
|--------------------------------------------------------------------------
|
| GET /api/timetables
|
| Common query parameters:
|
| schoolId
| timetableConfigId
| classId
| subjectId
| teacherId
| day
| rotationWeekCode
| sectionName
| entryStatus
| entryType
| deliveryMode
| room
| search
| isActive
| page
| limit
| sortBy
| sortOrder
|
*/

router.get(
  "/",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getTimetableEntries
);

/*
|--------------------------------------------------------------------------
| Create Single Timetable Entry
|--------------------------------------------------------------------------
|
| POST /api/timetables
|
*/

router.post(
  "/",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  createTimetableEntry
);

/*
|--------------------------------------------------------------------------
| Entry Workflow Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Cancel Timetable Entry
|--------------------------------------------------------------------------
|
| PATCH /api/timetables/:id/cancel
|
| Example body:
|
| {
|   "reason": "Teacher unavailable"
| }
|
*/

router.patch(
  "/:id/cancel",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  cancelTimetableEntry
);

/*
|--------------------------------------------------------------------------
| Reactivate Cancelled Timetable Entry
|--------------------------------------------------------------------------
|
| PATCH /api/timetables/:id/reactivate
|
*/

router.patch(
  "/:id/reactivate",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  reactivateTimetableEntry
);

/*
|--------------------------------------------------------------------------
| Restore Deleted Timetable Entry
|--------------------------------------------------------------------------
|
| PATCH /api/timetables/:id/restore
|
*/

router.patch(
  "/:id/restore",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  restoreTimetableEntry
);

/*
|--------------------------------------------------------------------------
| Individual Timetable Entry Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Get Timetable Entry Details
|--------------------------------------------------------------------------
|
| GET /api/timetables/:id
|
*/

router.get(
  "/:id",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getTimetableEntryById
);

/*
|--------------------------------------------------------------------------
| Update Timetable Entry
|--------------------------------------------------------------------------
|
| PUT /api/timetables/:id
|
*/

router.put(
  "/:id",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  updateTimetableEntry
);

/*
|--------------------------------------------------------------------------
| Partial Update Timetable Entry
|--------------------------------------------------------------------------
|
| PATCH /api/timetables/:id
|
*/

router.patch(
  "/:id",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  updateTimetableEntry
);

/*
|--------------------------------------------------------------------------
| Soft Delete Timetable Entry
|--------------------------------------------------------------------------
|
| DELETE /api/timetables/:id
|
*/

router.delete(
  "/:id",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  deleteTimetableEntry
);

/*
|--------------------------------------------------------------------------
| Export Router
|--------------------------------------------------------------------------
*/

module.exports = router;
