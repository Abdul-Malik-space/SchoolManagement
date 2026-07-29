const express = require("express");

const {
  protect,
  authorize
} = require("../middlewares/authMiddleware");

const schoolScope = require(
  "../middlewares/schoolScopeMiddleware"
);

const {
  createStaffLeave,
  getStaffLeaves,
  getStaffLeaveById,
  updateStaffLeave,

  approveStaffLeave,
  rejectStaffLeave,
  cancelStaffLeave,

  deleteStaffLeave,
  getDeletedStaffLeaves,
  restoreStaffLeave,

  getStaffLeaveReport
} = require(
  "../controllers/staffLeaveController"
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
| Authentication and School Scope
|--------------------------------------------------------------------------
|
| تمام Staff Leave routes authenticated ہوں گے۔
|
| Super Admin:
| schoolId query یا body کے ذریعے school select کر سکتا ہے۔
|
| Principal اور Accountant:
| صرف اپنے assigned school کے records access کر سکیں گے۔
|
*/

router.use(protect);
router.use(schoolScope);

/*
|--------------------------------------------------------------------------
| Role Groups
|--------------------------------------------------------------------------
*/

const LEAVE_VIEW_ROLES = [
  "super_admin",
  "principal",
  "accountant"
];

const LEAVE_MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

const LEAVE_APPROVAL_ROLES = [
  "super_admin",
  "principal"
];

const LEAVE_RECOVERY_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Staff Leave Report
|--------------------------------------------------------------------------
|
| GET /api/staff-leaves/report
|
| Super Admin:
| تمام schools یا selected school کی report دیکھ سکتا ہے۔
|
| Principal:
| اپنے school کی report دیکھ سکتا ہے۔
|
| Accountant:
| اپنے school کی leave report read-only mode میں دیکھ سکتا ہے۔
|
| یہ static route dynamic /:id route سے پہلے ہونا ضروری ہے۔
|
*/

router.get(
  "/report",
  authorize(
    ...LEAVE_VIEW_ROLES
  ),
  getStaffLeaveReport
);

/*
|--------------------------------------------------------------------------
| Deleted Staff Leave Records
|--------------------------------------------------------------------------
|
| GET /api/staff-leaves/deleted
|
| صرف Super Admin اور Principal deleted leave requests دیکھ سکتے ہیں۔
|
| یہ route بھی /:id سے پہلے رکھا گیا ہے۔
|
*/

router.get(
  "/deleted",
  authorize(
    ...LEAVE_RECOVERY_ROLES
  ),
  getDeletedStaffLeaves
);

/*
|--------------------------------------------------------------------------
| Staff Leave Collection Routes
|--------------------------------------------------------------------------
|
| GET /api/staff-leaves
| Staff leave requests کی list، filters، summary اور pagination۔
|
| POST /api/staff-leaves
| نیا staff leave request create کرنا۔
|
*/

router
  .route("/")
  .get(
    authorize(
      ...LEAVE_VIEW_ROLES
    ),
    getStaffLeaves
  )
  .post(
    authorize(
      ...LEAVE_MANAGEMENT_ROLES
    ),
    createStaffLeave
  );

/*
|--------------------------------------------------------------------------
| Approve Staff Leave
|--------------------------------------------------------------------------
|
| PATCH /api/staff-leaves/:id/approve
|
| Approval کے وقت:
| - Leave status approved ہوگا
| - Paid، unpaid یا partial-paid rule محفوظ ہوگا
| - Staff Attendance synchronization کی کوشش ہوگی
| - Payroll impact pending رہے گا
|
*/

router.patch(
  "/:id/approve",
  authorize(
    ...LEAVE_APPROVAL_ROLES
  ),
  approveStaffLeave
);

/*
|--------------------------------------------------------------------------
| Reject Staff Leave
|--------------------------------------------------------------------------
|
| PATCH /api/staff-leaves/:id/reject
|
| Body example:
|
| {
|   "rejectionReason": "Insufficient leave balance."
| }
|
*/

router.patch(
  "/:id/reject",
  authorize(
    ...LEAVE_APPROVAL_ROLES
  ),
  rejectStaffLeave
);

/*
|--------------------------------------------------------------------------
| Cancel Staff Leave
|--------------------------------------------------------------------------
|
| PATCH /api/staff-leaves/:id/cancel
|
| Body example:
|
| {
|   "cancellationReason": "Staff member returned earlier."
| }
|
| Payroll-processed leave cancel نہیں ہوگی۔
|
*/

router.patch(
  "/:id/cancel",
  authorize(
    ...LEAVE_MANAGEMENT_ROLES
  ),
  cancelStaffLeave
);

/*
|--------------------------------------------------------------------------
| Restore Deleted Staff Leave
|--------------------------------------------------------------------------
|
| PATCH /api/staff-leaves/:id/restore
|
| Restore سے پہلے controller duplicate application number اور overlapping
| active leave check کرے گا۔
|
*/

router.patch(
  "/:id/restore",
  authorize(
    ...LEAVE_RECOVERY_ROLES
  ),
  restoreStaffLeave
);

/*
|--------------------------------------------------------------------------
| Individual Staff Leave Routes
|--------------------------------------------------------------------------
|
| GET /api/staff-leaves/:id
| Leave request details۔
|
| PUT /api/staff-leaves/:id
| Pending یا rejected leave request update کرنا۔
|
| DELETE /api/staff-leaves/:id
| Soft delete کرنا۔
|
| Dynamic route کو تمام static/action routes کے بعد رکھا گیا ہے۔
|
*/

router
  .route("/:id")
  .get(
    authorize(
      ...LEAVE_VIEW_ROLES
    ),
    getStaffLeaveById
  )
  .put(
    authorize(
      ...LEAVE_MANAGEMENT_ROLES
    ),
    updateStaffLeave
  )
  .delete(
    authorize(
      ...LEAVE_MANAGEMENT_ROLES
    ),
    deleteStaffLeave
  );

/*
|--------------------------------------------------------------------------
| Export Router
|--------------------------------------------------------------------------
*/

module.exports = router;