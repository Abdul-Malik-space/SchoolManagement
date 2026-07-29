const express = require("express");

const {
  getAuditLogs,
  getDeletedAuditLogs,
  getAuditLogById,
  getAuditLogSummary,
  deleteAuditLog,
  restoreAuditLog
} = require(
  "../controllers/auditLogController"
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
| Audit Log Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Get Active Audit Logs
|--------------------------------------------------------------------------
|
| Super Admin:
| تمام schools اور global system logs دیکھ سکتا ہے۔
|
| Principal:
| صرف اپنے school کے logs دیکھ سکتا ہے۔
|
| Supported filters:
|
| search
| schoolId
| userId
| userRole
| action
| module
| status
| recordId
| recordModel
| requestMethod
| fromDate
| toDate
| page
| limit
|
*/

router.get(
  "/",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  getAuditLogs
);

/*
|--------------------------------------------------------------------------
| Get Audit Log Summary
|--------------------------------------------------------------------------
|
| یہ route /:id سے پہلے ہونا ضروری ہے۔
|
*/

router.get(
  "/summary",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  getAuditLogSummary
);

/*
|--------------------------------------------------------------------------
| Get Deleted Audit Logs
|--------------------------------------------------------------------------
|
| صرف Super Admin deleted audit logs دیکھ سکتا ہے۔
| یہ route بھی /:id سے پہلے ہونا ضروری ہے۔
|
*/

router.get(
  "/deleted/list",
  protect,
  authorize("super_admin"),
  schoolScope,
  getDeletedAuditLogs
);

/*
|--------------------------------------------------------------------------
| Restore Audit Log
|--------------------------------------------------------------------------
|
| صرف Super Admin audit log restore کر سکتا ہے۔
|
*/

router.patch(
  "/:id/restore",
  protect,
  authorize("super_admin"),
  schoolScope,
  validateObjectId("id"),
  restoreAuditLog
);

/*
|--------------------------------------------------------------------------
| Get Single Audit Log
|--------------------------------------------------------------------------
|
| Dynamic /:id route کو static routes کے بعد رکھا گیا ہے۔
|
*/

router.get(
  "/:id",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  validateObjectId("id"),
  getAuditLogById
);

/*
|--------------------------------------------------------------------------
| Soft Delete Audit Log
|--------------------------------------------------------------------------
|
| Audit log database سے permanently remove نہیں ہوگا۔
| صرف Super Admin اسے soft delete کر سکتا ہے۔
|
*/

router.delete(
  "/:id",
  protect,
  authorize("super_admin"),
  schoolScope,
  validateObjectId("id"),
  deleteAuditLog
);

module.exports = router;