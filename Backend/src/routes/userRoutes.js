const express = require("express");

const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  resetUserPassword
} = require("../controllers/userController");

const {
  protect,
  authorize
} = require("../middlewares/authMiddleware");

const schoolScope = require(
  "../middlewares/schoolScopeMiddleware"
);

const validateObjectId = require(
  "../middlewares/validateObjectId"
);

const router = express.Router();

/* =========================
   User Management Routes
========================= */

/*
|--------------------------------------------------------------------------
| Create User
|--------------------------------------------------------------------------
|
| Super Admin:
| principal, teacher, accountant, student اور parent accounts بنا سکتا ہے۔
|
| Principal:
| اپنے school میں teacher, accountant, student اور parent accounts
| بنا سکتا ہے۔
|
*/

router.post(
  "/",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  createUser
);

/*
|--------------------------------------------------------------------------
| Get Users List
|--------------------------------------------------------------------------
|
| Super Admin تمام schools کے users دیکھ سکتا ہے۔
| Principal صرف اپنے school کے manageable users دیکھ سکتا ہے۔
|
*/

router.get(
  "/",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  getUsers
);

/*
|--------------------------------------------------------------------------
| Activate or Deactivate User
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/status",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  validateObjectId("id"),
  updateUserStatus
);

/*
|--------------------------------------------------------------------------
| Reset User Password
|--------------------------------------------------------------------------
|
| Administrator نیا temporary password مقرر کرے گا۔
| User کو اگلی login کے بعد password تبدیل کرنا ہوگا۔
|
*/

router.patch(
  "/:id/reset-password",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  validateObjectId("id"),
  resetUserPassword
);

/*
|--------------------------------------------------------------------------
| Get Single User
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  validateObjectId("id"),
  getUserById
);

/*
|--------------------------------------------------------------------------
| Update User Basic Information
|--------------------------------------------------------------------------
|
| اس route سے صرف name, email, phone, address اور photo update ہوں گے۔
| Password، role، school اور status الگ محفوظ routes سے manage ہوں گے۔
|
*/

router.put(
  "/:id",
  protect,
  authorize("super_admin", "principal"),
  schoolScope,
  validateObjectId("id"),
  updateUser
);

module.exports = router;