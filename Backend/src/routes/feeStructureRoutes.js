const express = require("express");

const {
  createFeeStructure,
  getFeeStructures,
  getDeletedFeeStructures,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure,
  restoreFeeStructure
} = require(
  "../controllers/feeStructureController"
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
| Fee Structure Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Create Fee Structure
|--------------------------------------------------------------------------
|
| Super Admin:
| body میں schoolId دے سکتا ہے۔
|
| Principal / Accountant:
| صرف اپنے school میں fee structure create کر سکتے ہیں۔
|
*/

router.post(
  "/",
  protect,
  authorize(
    "super_admin",
    "principal",
    "accountant"
  ),
  schoolScope,
  createFeeStructure
);

/*
|--------------------------------------------------------------------------
| Get Fee Structures
|--------------------------------------------------------------------------
|
| Supported filters:
|
| search
| schoolId
| classId
| sessionYear
| isActive
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
  getFeeStructures
);

/*
|--------------------------------------------------------------------------
| Get Deleted Fee Structures
|--------------------------------------------------------------------------
|
| یہ route /:id سے پہلے ہونا ضروری ہے، ورنہ Express لفظ
| "deleted" کو id سمجھ سکتا ہے۔
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
  getDeletedFeeStructures
);

/*
|--------------------------------------------------------------------------
| Restore Fee Structure
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
  restoreFeeStructure
);

/*
|--------------------------------------------------------------------------
| Get Single Fee Structure
|--------------------------------------------------------------------------
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
  getFeeStructureById
);

/*
|--------------------------------------------------------------------------
| Update Fee Structure
|--------------------------------------------------------------------------
|
| Super Admin، Principal اور Accountant update کر سکتے ہیں۔
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
  updateFeeStructure
);

/*
|--------------------------------------------------------------------------
| Soft Delete Fee Structure
|--------------------------------------------------------------------------
|
| صرف Super Admin اور Principal delete کر سکتے ہیں۔
| Controller record کو permanently delete نہیں کرے گا۔
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
  deleteFeeStructure
);

module.exports = router;