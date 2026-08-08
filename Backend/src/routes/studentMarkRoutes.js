const express =
  require("express");

const {
  getMarkWorkspaces,
  getMarkSheet,
  saveMarkSheet,
  submitMarkSheet,
  approveMarkSheet,
  returnMarkSheet,
  getExamMarksReview
} = require(
  "../controllers/studentMarkController"
);

const {
  protect,
  authorize
} = require(
  "../middlewares/authMiddleware"
);

const schoolScope =
  require(
    "../middlewares/schoolScopeMiddleware"
  );

const validateObjectId =
  require(
    "../middlewares/validateObjectId"
  );

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Exam Marks Route Permissions
|--------------------------------------------------------------------------
|
| super_admin
|   - Can view marks workspaces across schools.
|   - Can save marks when required.
|   - Can review, return and approve submitted mark sheets.
|
| principal
|   - Can access only the assigned school.
|   - Can save marks when required.
|   - Can review, return and approve submitted mark sheets.
|
| teacher
|   - Can see only the subject workspaces assigned to the linked Teacher
|     profile.
|   - Can save draft marks and submit completed mark sheets.
|
| student / parent / accountant
|   - No access through these administrative marks-entry routes.
|   - Student and Parent results will be exposed later through their portal
|     result endpoints after publication.
|
*/

const MARK_ENTRY_ROLES = [
  "super_admin",
  "principal",
  "teacher"
];

const MARK_REVIEW_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Shared Authentication and School Scope
|--------------------------------------------------------------------------
|
| Every route below requires:
|
| 1. A valid authenticated user.
| 2. School scoping.
| 3. Route-specific role authorization.
|
| schoolScope keeps Principal and Teacher requests inside their assigned
| school. Super Admin remains cross-school capable, while controllers still
| validate the requested Exam school before returning or modifying marks.
|
*/

router.use(
  protect,
  schoolScope
);

/*
|--------------------------------------------------------------------------
| Marks Workspaces
|--------------------------------------------------------------------------
|
| GET /api/exam-marks/workspaces
|
| Teacher:
|   Returns only assigned exam / class / section / subject workspaces.
|
| Principal / Super Admin:
|   Returns all permitted marks workspaces in the selected school scope.
|
| Optional query parameters:
|
| examId
| academicYear
|
| Response includes sheet progress such as:
|
| not_started
| draft
| submitted
| returned
| approved
|
*/

router.get(
  "/workspaces",

  authorize(
    ...MARK_ENTRY_ROLES
  ),

  getMarkWorkspaces
);

/*
|--------------------------------------------------------------------------
| Load One Mark Sheet
|--------------------------------------------------------------------------
|
| GET /api/exam-marks/sheet
|
| Required query parameters:
|
| examId
| classId
| sectionName
| subjectId
|
| Response contains:
|
| exam
| subject
| assessmentRule
| gradeScheme
| students
| saved marks
| sheet summary
| editable state
|
| The controller verifies Teacher assignment before returning the sheet.
|
*/

router.get(
  "/sheet",

  authorize(
    ...MARK_ENTRY_ROLES
  ),

  getMarkSheet
);

/*
|--------------------------------------------------------------------------
| Save Draft / Returned Mark Sheet
|--------------------------------------------------------------------------
|
| PUT /api/exam-marks/sheet
|
| Allowed roles:
|
| super_admin
| principal
| teacher
|
| Typical request body:
|
| {
|   "examId": "...",
|   "classId": "...",
|   "sectionName": "A",
|   "subjectId": "...",
|   "rows": [
|     {
|       "studentId": "...",
|       "attendanceStatus": "present",
|       "theoryMarks": 65,
|       "practicalMarks": 18,
|       "internalMarks": 9,
|       "graceMarks": 0,
|       "deductionMarks": 0,
|       "teacherRemarks": ""
|     }
|   ]
| }
|
| Only draft or returned records are editable. Submitted / approved /
| published / locked records are protected by the controller and model.
|
*/

router.put(
  "/sheet",

  authorize(
    ...MARK_ENTRY_ROLES
  ),

  saveMarkSheet
);

/*
|--------------------------------------------------------------------------
| Partial Save Alias
|--------------------------------------------------------------------------
|
| PATCH /api/exam-marks/sheet
|
| Frontend can use PUT as the primary save operation. PATCH is retained as a
| convenient alias because the controller updates only the supplied rows.
|
*/

router.patch(
  "/sheet",

  authorize(
    ...MARK_ENTRY_ROLES
  ),

  saveMarkSheet
);

/*
|--------------------------------------------------------------------------
| Submit Mark Sheet for Principal Review
|--------------------------------------------------------------------------
|
| POST /api/exam-marks/sheet/submit
|
| A mark sheet cannot be submitted until:
|
| - Every active student has a StudentMark record.
| - Required mark components are complete.
| - No student result remains pending.
|
| After submission the sheet becomes read-only for Teacher until Principal
| either approves it or returns it for correction.
|
*/

router.post(
  "/sheet/submit",

  authorize(
    ...MARK_ENTRY_ROLES
  ),

  submitMarkSheet
);

/*
|--------------------------------------------------------------------------
| Approve Mark Sheet
|--------------------------------------------------------------------------
|
| PATCH /api/exam-marks/sheet/approve
|
| Only:
|
| super_admin
| principal
|
| Every row in the sheet must already be submitted (or already approved).
| Approved marks become eligible for result generation.
|
| Optional body:
|
| reviewRemarks
|
*/

router.patch(
  "/sheet/approve",

  authorize(
    ...MARK_REVIEW_ROLES
  ),

  approveMarkSheet
);

/*
|--------------------------------------------------------------------------
| Return Mark Sheet for Correction
|--------------------------------------------------------------------------
|
| PATCH /api/exam-marks/sheet/return
|
| Only:
|
| super_admin
| principal
|
| Required body:
|
| examId
| classId
| sectionName
| subjectId
| returnReason
|
| Returning a sheet stores review metadata and revision history. When the
| Exam is already under_review, the controller moves it safely back to
| marks_entry so the Teacher can correct and resubmit the marks.
|
*/

router.patch(
  "/sheet/return",

  authorize(
    ...MARK_REVIEW_ROLES
  ),

  returnMarkSheet
);

/*
|--------------------------------------------------------------------------
| Principal Exam Marks Review Dashboard
|--------------------------------------------------------------------------
|
| GET /api/exam-marks/review/:examId
|
| Only:
|
| super_admin
| principal
|
| Returns all saved StudentMark rows grouped into class-section-subject sheets
| with progress counts:
|
| draft
| submitted
| returned
| approved
|
| This route feeds the PrincipalMarksReview frontend page that will be built
| later.
|
*/

router.get(
  "/review/:examId",

  authorize(
    ...MARK_REVIEW_ROLES
  ),

  validateObjectId(
    "examId"
  ),

  getExamMarksReview
);

/*
|--------------------------------------------------------------------------
| Route Export
|--------------------------------------------------------------------------
*/

module.exports =
  router;
