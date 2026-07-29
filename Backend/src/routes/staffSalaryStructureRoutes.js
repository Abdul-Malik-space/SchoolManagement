const express = require(
  "express"
);

const {
  createSalaryStructure,
  getSalaryStructures,
  getSalaryStructureById,
  getSalaryStructureByStaff,
  previewSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
  getDeletedSalaryStructures,
  restoreSalaryStructure
} = require(
  "../controllers/staffSalaryStructureController"
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

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Authentication and School Scope
|--------------------------------------------------------------------------
*/

router.use(protect);
router.use(schoolScope);

/*
|--------------------------------------------------------------------------
| Role Groups
|--------------------------------------------------------------------------
*/

const viewRoles = [
  "super_admin",
  "principal",
  "accountant"
];

const managementRoles = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Salary Structure Preview
|--------------------------------------------------------------------------
*/

router.post(
  "/preview",
  authorize(...viewRoles),
  previewSalaryStructure
);

/*
|--------------------------------------------------------------------------
| Deleted Salary Structures
|--------------------------------------------------------------------------
|
| Static route کو /:id route سے پہلے رکھنا ضروری ہے۔
|
*/

router.get(
  "/deleted/list",
  authorize(
    ...managementRoles
  ),
  getDeletedSalaryStructures
);

/*
|--------------------------------------------------------------------------
| Salary Structure by Staff
|--------------------------------------------------------------------------
*/

router.get(
  "/staff/:staffId",
  authorize(...viewRoles),
  getSalaryStructureByStaff
);

/*
|--------------------------------------------------------------------------
| Salary Structure List and Creation
|--------------------------------------------------------------------------
*/

router
  .route("/")
  .get(
    authorize(...viewRoles),
    getSalaryStructures
  )
  .post(
    authorize(
      ...managementRoles
    ),
    createSalaryStructure
  );

/*
|--------------------------------------------------------------------------
| Restore Salary Structure
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/restore",
  authorize(
    ...managementRoles
  ),
  restoreSalaryStructure
);

/*
|--------------------------------------------------------------------------
| Salary Structure Details, Update and Delete
|--------------------------------------------------------------------------
*/

router
  .route("/:id")
  .get(
    authorize(...viewRoles),
    getSalaryStructureById
  )
  .put(
    authorize(
      ...managementRoles
    ),
    updateSalaryStructure
  )
  .delete(
    authorize(
      ...managementRoles
    ),
    deleteSalaryStructure
  );

module.exports = router;