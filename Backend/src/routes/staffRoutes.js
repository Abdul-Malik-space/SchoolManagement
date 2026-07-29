const express = require("express");

const {
  createStaff,
  getStaff,
  getStaffSummary,
  getDeletedStaff,
  getStaffById,
  updateStaff,
  updateStaffStatus,
  deleteStaff,
  restoreStaff
} = require(
  "../controllers/staffController"
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
| Staff Management Routes
|--------------------------------------------------------------------------
|
| Super Admin:
| - تمام schools کے staff records دیکھ اور manage کر سکتا ہے۔
|
| Principal:
| - صرف اپنے assigned school کے staff records manage کر سکتا ہے۔
|
| Accountant:
| - Staff list اور details دیکھ سکتا ہے۔
| - Staff create، update یا delete نہیں کر سکتا۔
|
| Teacher:
| - Staff module تک access نہیں ہوگا۔
|
*/

/*
|--------------------------------------------------------------------------
| Create Staff Member
|--------------------------------------------------------------------------
|
| Super Admin:
| Request body میں schoolId دے گا۔
|
| Principal:
| Staff خود بخود principal کے school میں create ہوگا۔
|
*/

router.post(
  "/",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  createStaff
);

/*
|--------------------------------------------------------------------------
| Get Active Staff List
|--------------------------------------------------------------------------
|
| Supported filters:
|
| schoolId
| search
| status
| category
| department
| employmentType
| gender
| userId
| hasUserAccount
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
  getStaff
);

/*
|--------------------------------------------------------------------------
| Get Staff Summary
|--------------------------------------------------------------------------
|
| یہ static route /:id سے پہلے ہونا ضروری ہے۔
|
| Response:
|
| totalStaff
| activeStaff
| inactiveStaff
| onLeaveStaff
| resignedStaff
| monthlyPayroll
|
*/

router.get(
  "/summary",
  protect,
  authorize(
    "super_admin",
    "principal",
    "accountant"
  ),
  schoolScope,
  getStaffSummary
);

/*
|--------------------------------------------------------------------------
| Get Deleted Staff List
|--------------------------------------------------------------------------
|
| Deleted staff records صرف Super Admin اور Principal دیکھ سکتے ہیں۔
|
| یہ static route بھی /:id سے پہلے ہونا ضروری ہے۔
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
  getDeletedStaff
);

/*
|--------------------------------------------------------------------------
| Restore Staff Member
|--------------------------------------------------------------------------
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
  restoreStaff
);

/*
|--------------------------------------------------------------------------
| Update Staff Status
|--------------------------------------------------------------------------
|
| Allowed statuses:
|
| active
| inactive
| on_leave
| resigned
| terminated
|
| Resigned یا terminated status کے ساتھ یہ fields بھی بھیجی جا سکتی ہیں:
|
| leavingDate
| leavingReason
|
*/

router.patch(
  "/:id/status",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  validateObjectId("id"),
  updateStaffStatus
);

/*
|--------------------------------------------------------------------------
| Get Single Staff Member
|--------------------------------------------------------------------------
|
| Accountant record دیکھ سکتا ہے، لیکن اسے modify نہیں کر سکتا۔
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
  getStaffById
);

/*
|--------------------------------------------------------------------------
| Update Staff Member
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  validateObjectId("id"),
  updateStaff
);

/*
|--------------------------------------------------------------------------
| Soft Delete Staff Member
|--------------------------------------------------------------------------
|
| Record database سے permanently remove نہیں ہوگا۔
| Deleted staff page سے بعد میں restore کیا جا سکے گا۔
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
  deleteStaff
);

module.exports = router;