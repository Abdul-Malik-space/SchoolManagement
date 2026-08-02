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

const {
  uploadStaffImage,
  handleStaffImageUploadError,
  validateStaffImageSignature
} = require(
  "../middlewares/staffImageUploadMiddleware"
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
| Request Content-Type:
|
| multipart/form-data
|
| Image field:
|
| photo
|
| Super Admin:
| FormData میں schoolId بھیجے گا۔
|
| Principal:
| Staff خود بخود Principal کے assigned school میں create ہوگا۔
|
| Multer schoolScope سے پہلے چلایا گیا ہے تاکہ multipart FormData کی body
| پہلے parse ہو جائے اور Super Admin کا schoolId req.body میں دستیاب ہو۔
|
*/

router.post(
  "/",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  uploadStaffImage,
  handleStaffImageUploadError,
  validateStaffImageSignature,
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
|
| Request Content-Type:
|
| multipart/form-data
|
| New image field:
|
| photo
|
| Existing photo remove کرنے کے لیے:
|
| removeStaffPhoto=true
|
| ID اور school access پہلے validate کیے جاتے ہیں، اس کے بعد image memory
| میں لی جاتی ہے اور controller اسے Cloudinary پر upload کرتا ہے۔
|
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
  uploadStaffImage,
  handleStaffImageUploadError,
  validateStaffImageSignature,
  updateStaff
);

/*
|--------------------------------------------------------------------------
| Partial Update Alias
|--------------------------------------------------------------------------
|
| Frontend PUT یا PATCH دونوں استعمال کر سکتا ہے۔ دونوں routes image upload
| اور removeStaffPhoto کو support کرتے ہیں۔
|
*/

router.patch(
  "/:id",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  validateObjectId("id"),
  uploadStaffImage,
  handleStaffImageUploadError,
  validateStaffImageSignature,
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
