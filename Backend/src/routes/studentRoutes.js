const express = require("express");

const {
  createStudent,
  getStudents,
  getAvailableStudentUsers,
  getDeletedStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  restoreStudent
} = require(
  "../controllers/studentController"
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
| Student Routes
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
  createStudent
);

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
  getStudents
);

/*
| یہ route /:id سے پہلے ہونا ضروری ہے۔
*/

router.get(
  "/available-users",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  getAvailableStudentUsers
);

router.get(
  "/deleted/list",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  getDeletedStudents
);

router.patch(
  "/:id/restore",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  validateObjectId("id"),
  restoreStudent
);

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
  getStudentById
);

router.put(
  "/:id",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  validateObjectId("id"),
  updateStudent
);

router.delete(
  "/:id",
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope,
  validateObjectId("id"),
  deleteStudent
);

module.exports = router;