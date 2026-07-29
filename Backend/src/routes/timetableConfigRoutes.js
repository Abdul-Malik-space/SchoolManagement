const express =
  require("express");

const authMiddleware =
  require("../middlewares/authMiddleware");

const {
  createTimetableConfig,
  getTimetableConfigs,
  getTimetableConfigById,
  getActiveTimetableConfig,

  updateTimetableConfig,

  getPeriodSettings,
  updatePeriodSettings,

  publishTimetableConfig,
  archiveTimetableConfig,
  returnTimetableToDraft,
  setTimetableLock,

  cloneTimetableConfig,

  deleteTimetableConfig,
  getDeletedTimetableConfigs,
  restoreTimetableConfig
} = require(
  "../controllers/timetableConfigController"
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
| یہ project کے دونوں ممکنہ authorization exports کو support کرتا ہے:
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
| Protect All Timetable Configuration Routes
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| Static Routes
|--------------------------------------------------------------------------
|
| Static routes کو /:id سے پہلے رکھنا ضروری ہے، ورنہ Express انہیں ID سمجھ
| سکتا ہے۔
|
*/

/*
|--------------------------------------------------------------------------
| Active Published Timetable
|--------------------------------------------------------------------------
|
| GET /api/timetable-configs/active
|
| Super Admin:
| Query کے ذریعے کسی school کا active timetable دیکھ سکتا ہے۔
|
| Principal:
| صرف اپنے school کا active timetable دیکھ سکتا ہے۔
|
| Teacher:
| صرف اپنے school کا published active timetable دیکھ سکتا ہے۔
|
*/

router.get(
  "/active",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getActiveTimetableConfig
);

/*
|--------------------------------------------------------------------------
| Active Period Settings
|--------------------------------------------------------------------------
|
| GET /api/timetable-configs/period-settings
|
| Query:
| ?schoolId=...
|
| Super Admin selected school کے active period settings دیکھ سکتا ہے۔
| Principal اور Teacher اپنے school کے period settings دیکھ سکتے ہیں۔
|
*/

router.get(
  "/period-settings",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getPeriodSettings
);

/*
|--------------------------------------------------------------------------
| Deleted Timetable Configurations
|--------------------------------------------------------------------------
|
| GET /api/timetable-configs/deleted
|
*/

router.get(
  "/deleted",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  getDeletedTimetableConfigs
);

/*
|--------------------------------------------------------------------------
| Collection Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| List Timetable Configurations
|--------------------------------------------------------------------------
|
| GET /api/timetable-configs
|
| Supported filters:
|
| schoolId
| search
| status
| academicYear
| fromDate
| toDate
| isActive
| isLocked
| sortBy
| sortOrder
| page
| limit
|
*/

router.get(
  "/",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getTimetableConfigs
);

/*
|--------------------------------------------------------------------------
| Create Timetable Configuration
|--------------------------------------------------------------------------
|
| POST /api/timetable-configs
|
*/

router.post(
  "/",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  createTimetableConfig
);

/*
|--------------------------------------------------------------------------
| Timetable Workflow Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Publish Timetable
|--------------------------------------------------------------------------
|
| PATCH /api/timetable-configs/:id/publish
|
| Example body:
|
| {
|   "isActive": true,
|   "lockAfterPublish": true,
|   "publicationNotes": "Approved for Term 1"
| }
|
*/

router.patch(
  "/:id/publish",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  publishTimetableConfig
);

/*
|--------------------------------------------------------------------------
| Archive Timetable
|--------------------------------------------------------------------------
|
| PATCH /api/timetable-configs/:id/archive
|
*/

router.patch(
  "/:id/archive",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  archiveTimetableConfig
);

/*
|--------------------------------------------------------------------------
| Return Timetable to Draft
|--------------------------------------------------------------------------
|
| PATCH /api/timetable-configs/:id/return-to-draft
|
*/

router.patch(
  "/:id/return-to-draft",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  returnTimetableToDraft
);

/*
|--------------------------------------------------------------------------
| Lock or Unlock Timetable
|--------------------------------------------------------------------------
|
| PATCH /api/timetable-configs/:id/lock
|
| Body:
|
| {
|   "isLocked": true
| }
|
*/

router.patch(
  "/:id/lock",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  setTimetableLock
);

/*
|--------------------------------------------------------------------------
| Clone Timetable
|--------------------------------------------------------------------------
|
| POST /api/timetable-configs/:id/clone
|
| Example body:
|
| {
|   "title": "Academic Year 2027-2028",
|   "code": "TT-2027-28",
|   "academicYear": {
|     "label": "2027-2028",
|     "startDate": "2027-08-01",
|     "endDate": "2028-06-30"
|   },
|   "effectiveFrom": "2027-08-01",
|   "effectiveTo": "2028-06-30",
|   "copyEntries": true
| }
|
*/

router.post(
  "/:id/clone",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  cloneTimetableConfig
);

/*
|--------------------------------------------------------------------------
| Restore Deleted Timetable
|--------------------------------------------------------------------------
|
| PATCH /api/timetable-configs/:id/restore
|
*/

router.patch(
  "/:id/restore",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  restoreTimetableConfig
);

/*
|--------------------------------------------------------------------------
| Period Settings by Timetable ID
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Get Period Settings
|--------------------------------------------------------------------------
|
| GET /api/timetable-configs/:id/period-settings
|
*/

router.get(
  "/:id/period-settings",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getPeriodSettings
);

/*
|--------------------------------------------------------------------------
| Update Period Settings
|--------------------------------------------------------------------------
|
| PUT /api/timetable-configs/:id/period-settings
|
*/

router.put(
  "/:id/period-settings",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  updatePeriodSettings
);

/*
|--------------------------------------------------------------------------
| Patch Period Settings
|--------------------------------------------------------------------------
|
| PATCH بھی support کیا گیا ہے تاکہ frontend partial update request بھیج سکے۔
|
*/

router.patch(
  "/:id/period-settings",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  updatePeriodSettings
);

/*
|--------------------------------------------------------------------------
| Individual Timetable Configuration Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Get Timetable Configuration Details
|--------------------------------------------------------------------------
|
| GET /api/timetable-configs/:id
|
*/

router.get(
  "/:id",

  allowRoles(
    TIMETABLE_VIEW_ROLES
  ),

  getTimetableConfigById
);

/*
|--------------------------------------------------------------------------
| Update Timetable Configuration
|--------------------------------------------------------------------------
|
| PUT /api/timetable-configs/:id
|
*/

router.put(
  "/:id",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  updateTimetableConfig
);

/*
|--------------------------------------------------------------------------
| Partial Update Timetable Configuration
|--------------------------------------------------------------------------
|
| PATCH /api/timetable-configs/:id
|
*/

router.patch(
  "/:id",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  updateTimetableConfig
);

/*
|--------------------------------------------------------------------------
| Soft Delete Timetable Configuration
|--------------------------------------------------------------------------
|
| DELETE /api/timetable-configs/:id
|
*/

router.delete(
  "/:id",

  allowRoles(
    TIMETABLE_MANAGEMENT_ROLES
  ),

  deleteTimetableConfig
);

/*
|--------------------------------------------------------------------------
| Export Router
|--------------------------------------------------------------------------
*/

module.exports = router;