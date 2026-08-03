const express = require("express");

const {
  createExam,
  getExams,
  getDeletedExams,
  getExamSummary,
  getExamById,
  updateExam,
  updateExamStatus,
  cloneExam,
  deleteExam,
  restoreExam,
  getExamSetupOptions,
  getExamDependencies
} = require("../controllers/examController");

const {
  protect,
  authorize
} = require("../middlewares/authMiddleware");

const schoolScope =
  require("../middlewares/schoolScopeMiddleware");

const validateObjectId =
  require("../middlewares/validateObjectId");

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Exam Route Permissions
|--------------------------------------------------------------------------
|
| super_admin
|   - Full access across all schools.
|   - A schoolId must be supplied where a school-specific operation requires it.
|
| principal
|   - Full exam-management access inside the assigned school.
|
| teacher
|   - Read-only access to active exam information required for schedules and
|     marks-entry workflows.
|
| student / parent
|   - Not exposed through these administrative routes.
|   - Their published-result endpoints will be provided through portal routes.
|
*/

const EXAM_READ_ROLES = [
  "super_admin",
  "principal",
  "teacher"
];

const EXAM_MANAGE_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Shared Authentication and School Scope
|--------------------------------------------------------------------------
|
| Route-specific authorize middleware still controls each role. Applying
| protect and schoolScope once keeps every exam endpoint school-aware.
|
*/

router.use(
  protect,
  schoolScope
);

/*
|--------------------------------------------------------------------------
| Exam Setup Options
|--------------------------------------------------------------------------
|
| GET /api/exams/setup-options
|
| Loads school, classes, sections, subjects, teachers, grade schemes and exam
| constants for the principal's exam setup form.
|
| Important: this route must remain before "/:id".
|
*/

router.get(
  "/setup-options",
  authorize(
    ...EXAM_MANAGE_ROLES
  ),
  getExamSetupOptions
);

/*
|--------------------------------------------------------------------------
| Exam Dashboard Summary
|--------------------------------------------------------------------------
|
| GET /api/exams/summary
|
| Supported query filters:
| - schoolId       Super Admin only
| - academicYear
|
*/

router.get(
  "/summary",
  authorize(
    ...EXAM_READ_ROLES
  ),
  getExamSummary
);

/*
|--------------------------------------------------------------------------
| Deleted Exams
|--------------------------------------------------------------------------
|
| GET /api/exams/deleted/list
|
| Returns only soft-deleted exams. Management roles can restore eligible
| records through the restore endpoint below.
|
*/

router.get(
  "/deleted/list",
  authorize(
    ...EXAM_MANAGE_ROLES
  ),
  getDeletedExams
);

/*
|--------------------------------------------------------------------------
| Create Exam
|--------------------------------------------------------------------------
|
| POST /api/exams
|
| Principal creates an exam inside the assigned school.
| Super Admin supplies body.schoolId for a school-specific creation request.
|
*/

router.post(
  "/",
  authorize(
    ...EXAM_MANAGE_ROLES
  ),
  createExam
);

/*
|--------------------------------------------------------------------------
| List Exams
|--------------------------------------------------------------------------
|
| GET /api/exams
|
| Supported controller filters include:
| - schoolId
| - academicYear
| - academicTerm
| - examType
| - status
| - classId
| - subjectId
| - isActive
| - search
| - dateFrom
| - dateTo
| - page
| - limit
| - sortBy
| - sortOrder
|
*/

router.get(
  "/",
  authorize(
    ...EXAM_READ_ROLES
  ),
  getExams
);

/*
|--------------------------------------------------------------------------
| Exam Dependencies and Workflow State
|--------------------------------------------------------------------------
|
| GET /api/exams/:id/dependencies
|
| Shows linked schedules, marks, results and report cards. This endpoint also
| tells the frontend whether the exam can be deleted and which status changes
| are currently allowed.
|
*/

router.get(
  "/:id/dependencies",
  authorize(
    ...EXAM_MANAGE_ROLES
  ),
  validateObjectId(
    "id"
  ),
  getExamDependencies
);

/*
|--------------------------------------------------------------------------
| Restore Deleted Exam
|--------------------------------------------------------------------------
|
| PATCH /api/exams/:id/restore
|
*/

router.patch(
  "/:id/restore",
  authorize(
    ...EXAM_MANAGE_ROLES
  ),
  validateObjectId(
    "id"
  ),
  restoreExam
);

/*
|--------------------------------------------------------------------------
| Clone Exam
|--------------------------------------------------------------------------
|
| POST /api/exams/:id/clone
|
| Required body fields:
| - examCode
| - academicYear
| - startDate
| - endDate
|
| The clone is always created as a fresh draft.
|
*/

router.post(
  "/:id/clone",
  authorize(
    ...EXAM_MANAGE_ROLES
  ),
  validateObjectId(
    "id"
  ),
  cloneExam
);

/*
|--------------------------------------------------------------------------
| Update Exam Workflow Status
|--------------------------------------------------------------------------
|
| PATCH /api/exams/:id/status
|
| Example:
| {
|   "status": "scheduled"
| }
|
| Cancellation requires cancellationReason.
| Locking may include lockReason.
|
*/

router.patch(
  "/:id/status",
  authorize(
    ...EXAM_MANAGE_ROLES
  ),
  validateObjectId(
    "id"
  ),
  updateExamStatus
);

/*
|--------------------------------------------------------------------------
| Get One Exam
|--------------------------------------------------------------------------
|
| GET /api/exams/:id
|
| Teachers receive read-only access. The response also includes dependencies,
| workflow state and allowed status transitions.
|
| Important: keep this after all named "/:id/..." routes.
|
*/

router.get(
  "/:id",
  authorize(
    ...EXAM_READ_ROLES
  ),
  validateObjectId(
    "id"
  ),
  getExamById
);

/*
|--------------------------------------------------------------------------
| Update Exam
|--------------------------------------------------------------------------
|
| PUT /api/exams/:id
| PATCH /api/exams/:id
|
| PUT is the primary route. PATCH is retained as a convenient partial-update
| alias because the controller accepts only explicitly allowed exam fields.
|
*/

router.put(
  "/:id",
  authorize(
    ...EXAM_MANAGE_ROLES
  ),
  validateObjectId(
    "id"
  ),
  updateExam
);

router.patch(
  "/:id",
  authorize(
    ...EXAM_MANAGE_ROLES
  ),
  validateObjectId(
    "id"
  ),
  updateExam
);

/*
|--------------------------------------------------------------------------
| Soft Delete Exam
|--------------------------------------------------------------------------
|
| DELETE /api/exams/:id
|
| The controller allows deletion only for eligible statuses and blocks it when
| schedules, marks, results or report cards are linked.
|
*/

router.delete(
  "/:id",
  authorize(
    ...EXAM_MANAGE_ROLES
  ),
  validateObjectId(
    "id"
  ),
  deleteExam
);

/*
|--------------------------------------------------------------------------
| Route Export
|--------------------------------------------------------------------------
*/

module.exports =
  router;
