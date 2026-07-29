const express = require(
  "express"
);

const {
  createTeacher,
  getTeachers,
  getAvailableTeacherUsers,
  getDeletedTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  restoreTeacher
} = require(
  "../controllers/teacherController"
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

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Teacher Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Create Teacher Profile
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  createTeacher
);

/*
|--------------------------------------------------------------------------
| Get Teachers List
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  protect,
  authorize(
    "super_admin",
    "principal",
    "teacher",
    "accountant"
  ),
  schoolScope,
  getTeachers
);

/*
|--------------------------------------------------------------------------
| Available Teacher User Accounts
|--------------------------------------------------------------------------
|
| یہ route /:id سے پہلے ہونا ضروری ہے۔
|
*/

router.get(
  "/available-users",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  getAvailableTeacherUsers
);

/*
|--------------------------------------------------------------------------
| Deleted Teachers
|--------------------------------------------------------------------------
*/

router.get(
  "/deleted/list",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  getDeletedTeachers
);

/*
|--------------------------------------------------------------------------
| Restore Teacher
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
  restoreTeacher
);

/*
|--------------------------------------------------------------------------
| Get Single Teacher
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  protect,
  authorize(
    "super_admin",
    "principal",
    "teacher",
    "accountant"
  ),
  schoolScope,
  validateObjectId("id"),
  getTeacherById
);

/*
|--------------------------------------------------------------------------
| Update Teacher
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
  updateTeacher
);

/*
|--------------------------------------------------------------------------
| Soft Delete Teacher
|--------------------------------------------------------------------------
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
  deleteTeacher
);

module.exports = router;