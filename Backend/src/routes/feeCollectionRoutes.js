const express = require("express");

const {
  collectFee,
  addPayment,
  getFeeCollections,
  getDeletedFeeCollections,
  getFeeCollectionById,
  updateFeeCollection,
  deleteFeeCollection,
  restoreFeeCollection
} = require(
  "../controllers/feeCollectionController"
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
| Fee Collection Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Create Fee Invoice
|--------------------------------------------------------------------------
|
| Super Admin:
| Valid student اور fee structure کے ذریعے کسی بھی school کے لیے۔
|
| Principal / Accountant:
| صرف اپنے school کے لیے۔
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
  collectFee
);

/*
|--------------------------------------------------------------------------
| Get Fee Collections
|--------------------------------------------------------------------------
|
| Supported filters:
|
| search
| schoolId
| classId
| studentId
| feeStructureId
| feeMonth
| sessionYear
| paymentStatus
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
  getFeeCollections
);

/*
|--------------------------------------------------------------------------
| Get Deleted Fee Collections
|--------------------------------------------------------------------------
|
| یہ route /:id سے پہلے ہونا ضروری ہے۔
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
  getDeletedFeeCollections
);

/*
|--------------------------------------------------------------------------
| Add Payment
|--------------------------------------------------------------------------
|
| Recommended route:
| PATCH /api/fee-collections/:id/payment
|
*/

router.patch(
  "/:id/payment",
  protect,
  authorize(
    "super_admin",
    "principal",
    "accountant"
  ),
  schoolScope,
  validateObjectId("id"),
  addPayment
);

/*
|--------------------------------------------------------------------------
| Add Payment — Backward-Compatible Route
|--------------------------------------------------------------------------
|
| پرانا frontend یا API consumer اس route کو استعمال کر سکتا ہے:
| PUT /api/fee-collections/:id/pay
|
*/

router.put(
  "/:id/pay",
  protect,
  authorize(
    "super_admin",
    "principal",
    "accountant"
  ),
  schoolScope,
  validateObjectId("id"),
  addPayment
);

/*
|--------------------------------------------------------------------------
| Restore Deleted Fee Collection
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
  restoreFeeCollection
);

/*
|--------------------------------------------------------------------------
| Get Single Fee Collection
|--------------------------------------------------------------------------
|
| یہ route payment، pay اور restore routes کے بعد ہونا چاہیے۔
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
  getFeeCollectionById
);

/*
|--------------------------------------------------------------------------
| Update Fee Collection
|--------------------------------------------------------------------------
|
| Editable fields:
|
| dueDate
| discount
| fine
| notes
|
| Student، class، fee month اور fee structure تبدیل نہیں ہوں گے۔
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
  updateFeeCollection
);

/*
|--------------------------------------------------------------------------
| Soft Delete Fee Collection
|--------------------------------------------------------------------------
|
| صرف Super Admin اور Principal delete کر سکتے ہیں۔
| Financial record database سے permanently remove نہیں ہوگا۔
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
  deleteFeeCollection
);

module.exports = router;