const express =
  require("express");

const {
  generateReportCards,
  getExamReportCards,
  getReportCardById,
  issueReportCards,
  publishReportCards,
  verifyReportCard
} = require(
  "../controllers/reportCardController"
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
| Report Card Route Permissions
|--------------------------------------------------------------------------
|
| Public
|   - Can verify an issued / published report card using verification code.
|   - No authenticated school session is required for verification.
|
| super_admin
|   - Can generate, list, view, issue and publish report cards across schools.
|   - Controller still validates the selected Exam and ReportCard school scope.
|
| principal
|   - Can generate, list, view, issue and publish report cards only inside the
|     assigned school.
|
| teacher / accountant
|   - No access through these report-card management routes.
|
| student / parent
|   - Their own published results/report cards will be exposed later through
|     dedicated portal endpoints.
|
*/

const REPORT_CARD_MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Public Verification Route
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This route MUST remain before router.use(protect, schoolScope).
|
| GET /api/report-cards/verify/:verificationCode
|
| The controller only returns a verification summary when:
|
| - The report card is issued or published.
| - The verification code is valid.
| - Public verification is enabled in the report-card access policy.
|
| Detailed subject marks are exposed only when the report-card access policy
| explicitly allows detailed marks on public verification.
|
*/

router.get(
  "/verify/:verificationCode",

  verifyReportCard
);

/*
|--------------------------------------------------------------------------
| Shared Authentication and School Scope
|--------------------------------------------------------------------------
|
| Every route below requires:
|
| 1. A valid authenticated user.
| 2. School scoping.
| 3. Principal / Super Admin authorization.
|
| schoolScope keeps Principal requests inside the assigned school. Super Admin
| remains cross-school capable, while reportCardController validates the actual
| Exam / ReportCard school before reading or changing records.
|
*/

router.use(
  protect,
  schoolScope
);

/*
|--------------------------------------------------------------------------
| Generate Report Cards
|--------------------------------------------------------------------------
|
| POST /api/report-cards/exam/:examId/generate
|
| Allowed roles:
|
| - super_admin
| - principal
|
| Source ExamResult records must already be approved, published or locked.
|
| Optional request body:
|
| {
|   "examResultIds": ["..."],
|   "signatures": [
|     {
|       "role": "class_teacher",
|       "name": "Teacher Name",
|       "designation": "Class Teacher",
|       "signatureUrl": "",
|       "displayOrder": 1
|     },
|     {
|       "role": "principal",
|       "name": "Principal Name",
|       "designation": "Principal",
|       "signatureUrl": "",
|       "displayOrder": 2
|     }
|   ],
|   "principalName": "Principal Name",
|   "layout": {},
|   "accessPolicy": {},
|   "attendancePeriodStart": "2026-01-01",
|   "attendancePeriodEnd": "2026-06-30",
|   "verificationExpiresAt": null,
|   "forceNewVersion": false,
|   "revisionReason": ""
| }
|
| Existing generated cards are refreshed. Issued / published official cards
| are not overwritten; the controller creates a new version when required.
|
*/

router.post(
  "/exam/:examId/generate",

  authorize(
    ...REPORT_CARD_MANAGEMENT_ROLES
  ),

  validateObjectId(
    "examId"
  ),

  generateReportCards
);

/*
|--------------------------------------------------------------------------
| Issue Report Cards
|--------------------------------------------------------------------------
|
| PATCH /api/report-cards/exam/:examId/issue
|
| The source ExamResult must already be published or locked.
|
| Optional body:
|
| {
|   "reportCardIds": ["..."]
| }
|
| When reportCardIds is omitted, all eligible report cards of the selected
| exam are processed.
|
*/

router.patch(
  "/exam/:examId/issue",

  authorize(
    ...REPORT_CARD_MANAGEMENT_ROLES
  ),

  validateObjectId(
    "examId"
  ),

  issueReportCards
);

/*
|--------------------------------------------------------------------------
| Publish Report Cards
|--------------------------------------------------------------------------
|
| PATCH /api/report-cards/exam/:examId/publish
|
| The controller preserves the model workflow:
|
| generated -> issued -> published
|
| A generated report card can therefore be published through this endpoint
| without requiring the frontend to manually call the issue endpoint first.
|
| Optional body:
|
| {
|   "reportCardIds": ["..."],
|   "allowPublicVerification": false,
|   "showDetailedMarksOnPublicVerification": false
| }
|
| Published report cards become available to Student / Parent portal flows
| according to their access policy.
|
*/

router.patch(
  "/exam/:examId/publish",

  authorize(
    ...REPORT_CARD_MANAGEMENT_ROLES
  ),

  validateObjectId(
    "examId"
  ),

  publishReportCards
);

/*
|--------------------------------------------------------------------------
| List Report Cards for One Exam
|--------------------------------------------------------------------------
|
| GET /api/report-cards/exam/:examId
|
| Supported query parameters:
|
| classId
| sectionName
| status
| overallResultStatus
| search
| page
| limit
|
| Search checks:
|
| - report-card number
| - student name
| - admission number
| - roll number
| - verification code
|
*/

router.get(
  "/exam/:examId",

  authorize(
    ...REPORT_CARD_MANAGEMENT_ROLES
  ),

  validateObjectId(
    "examId"
  ),

  getExamReportCards
);

/*
|--------------------------------------------------------------------------
| Get One Report Card
|--------------------------------------------------------------------------
|
| GET /api/report-cards/:reportCardId
|
| This dynamic route MUST remain after all static /exam/... and /verify/...
| routes so it cannot accidentally capture those route names as an ID.
|
*/

router.get(
  "/:reportCardId",

  authorize(
    ...REPORT_CARD_MANAGEMENT_ROLES
  ),

  validateObjectId(
    "reportCardId"
  ),

  getReportCardById
);

/*
|--------------------------------------------------------------------------
| Export Router
|--------------------------------------------------------------------------
*/

module.exports =
  router;