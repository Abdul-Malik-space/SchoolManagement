const express = require("express");

const {
  createSchool,
  getSchools,
  getSchoolById,
  updateSchool
} = require("../controllers/schoolController");

const {
  protect,
  authorize
} = require("../middlewares/authMiddleware");

const validateObjectId = require("../middlewares/validateObjectId");

const router = express.Router();

/* =========================
   School Routes
========================= */

// Create new school - only super admin
router.post(
  "/",
  protect,
  authorize("super_admin"),
  createSchool
);

// Get all schools - only super admin
router.get(
  "/",
  protect,
  authorize("super_admin"),
  getSchools
);

// Get single school
// super_admin can view any school
// principal can view only own school - controller will check this
router.get(
  "/:id",
  protect,
  authorize("super_admin", "principal"),
  validateObjectId("id"),
  getSchoolById
);

// Update school
// super_admin can update any school
// principal can update only own school settings - controller will check this
router.put(
  "/:id",
  protect,
  authorize("super_admin", "principal"),
  validateObjectId("id"),
  updateSchool
);

module.exports = router;