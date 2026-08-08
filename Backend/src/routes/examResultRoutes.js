const express =
  require("express");

const {
  getExamResults,
  getExamResultById,
  generateExamResults,
  recalculateExamResults,
  calculateExamResultRankings,
  approveExamResults,
  publishExamResults
} = require(
  "../controllers/examResultController"
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
| Exam Result Route Permissions
|--------------------------------------------------------------------------
|
| super_admin
|   - تمام سکولوں کے نتائج manage کر سکتا ہے۔
|   - نتائج generate، recalculate، rank، approve اور publish کر سکتا ہے۔
|
| principal
|   - صرف اپنے assigned school کے نتائج manage کر سکتا ہے۔
|   - نتائج generate، recalculate، rank، approve اور publish کر سکتا ہے۔
|
| teacher
|   - اس administrative result workflow تک رسائی نہیں۔
|   - Teacher کا کام marks entry تک محدود ہے۔
|
| student / parent / accountant
|   - ان routes تک رسائی نہیں۔
|   - Student اور Parent کیلئے published results کے الگ portal endpoints
|     بعد میں بنائے جائیں گے۔
|
*/

const RESULT_MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Shared Authentication and School Scope
|--------------------------------------------------------------------------
|
| ہر route کیلئے:
|
| 1. User authenticated ہونا ضروری ہے۔
| 2. School scope apply ہوگا۔
| 3. Principal یا Super Admin role ضروری ہوگا۔
|
| Principal صرف اپنے school کے records دیکھ سکے گا۔
| Super Admin cross-school کام کر سکتا ہے، جبکہ controller خود بھی Exam
| کے school scope کو validate کرتا ہے۔
|
*/

router.use(
  protect,
  schoolScope
);

/*
|--------------------------------------------------------------------------
| Get One Student Consolidated Result
|--------------------------------------------------------------------------
|
| GET /api/exam-results/:examId/result/:resultId
|
| ایک مخصوص generated ExamResult record واپس کرتا ہے۔
|
| Response میں شامل ہو سکتا ہے:
|
| student
| exam
| subjectResults
| totals
| percentage
| overallGrade
| overallResultStatus
| classPosition
| sectionPosition
| approval metadata
| publication metadata
|
*/

router.get(
  "/:examId/result/:resultId",

  authorize(
    ...RESULT_MANAGEMENT_ROLES
  ),

  validateObjectId(
    "examId"
  ),

  validateObjectId(
    "resultId"
  ),

  getExamResultById
);

/*
|--------------------------------------------------------------------------
| Generate Consolidated Exam Results
|--------------------------------------------------------------------------
|
| POST /api/exam-results/:examId/generate
|
| صرف approved marks سے student-wise consolidated result generate ہوگا۔
|
| Controller:
|
| - Approved StudentMark records load کرے گا۔
| - ہر active student کی subject coverage verify کرے گا۔
| - Subject result snapshots بنائے گا۔
| - Total marks calculate کرے گا۔
| - Percentage calculate کرے گا۔
| - Subject grades apply کرے گا۔
| - Overall grade apply کرے گا۔
| - Pass / Fail / Incomplete / Withheld status calculate کرے گا۔
| - Class اور Section rankings calculate کرے گا۔
|
| Existing editable generated result دوبارہ generate ہو سکتا ہے اور اس کی
| revision history محفوظ ہوگی۔
|
*/

router.post(
  "/:examId/generate",

  authorize(
    ...RESULT_MANAGEMENT_ROLES
  ),

  validateObjectId(
    "examId"
  ),

  generateExamResults
);

/*
|--------------------------------------------------------------------------
| Recalculate Exam Results
|--------------------------------------------------------------------------
|
| PATCH /api/exam-results/:examId/recalculate
|
| پہلے سے generated results کو دوبارہ approved StudentMark records سے
| calculate کرتا ہے۔
|
| یہ operation:
|
| - Subject snapshots refresh کرتا ہے۔
| - Totals دوبارہ calculate کرتا ہے۔
| - Percentage دوبارہ calculate کرتا ہے۔
| - Grades دوبارہ apply کرتا ہے۔
| - Overall status refresh کرتا ہے۔
| - Rankings دوبارہ calculate کرتا ہے۔
|
| Approved / Published locked result کو controller protect کرتا ہے۔
|
*/

router.patch(
  "/:examId/recalculate",

  authorize(
    ...RESULT_MANAGEMENT_ROLES
  ),

  validateObjectId(
    "examId"
  ),

  recalculateExamResults
);

/*
|--------------------------------------------------------------------------
| Calculate Class and Section Rankings
|--------------------------------------------------------------------------
|
| PATCH /api/exam-results/:examId/rankings
|
| Exam کی result settings کے مطابق:
|
| rankingEnabled
| showClassPosition
| showSectionPosition
|
| rankings calculate ہوتی ہیں۔
|
| Standard competition ranking استعمال ہوتی ہے:
|
| 1, 2, 2, 4
|
| یعنی برابر result والے طلبہ ایک ہی position حاصل کر سکتے ہیں۔
|
*/

router.patch(
  "/:examId/rankings",

  authorize(
    ...RESULT_MANAGEMENT_ROLES
  ),

  validateObjectId(
    "examId"
  ),

  calculateExamResultRankings
);

/*
|--------------------------------------------------------------------------
| Approve Consolidated Exam Results
|--------------------------------------------------------------------------
|
| PATCH /api/exam-results/:examId/approve
|
| صرف:
|
| super_admin
| principal
|
| Result approve ہونے کیلئے:
|
| - Results پہلے generate ہوئے ہوں۔
| - تمام source StudentMark records approved ہوں۔
| - Overall result pending نہ ہو۔
| - Result incomplete نہ ہو۔
| - Result withheld نہ ہو۔
|
| Optional body:
|
| {
|   "reviewRemarks": "Results checked and approved."
| }
|
| Approval کے بعد parent Exam بھی under_review سے approved ہو سکتا ہے۔
|
*/

router.patch(
  "/:examId/approve",

  authorize(
    ...RESULT_MANAGEMENT_ROLES
  ),

  validateObjectId(
    "examId"
  ),

  approveExamResults
);

/*
|--------------------------------------------------------------------------
| Publish Exam Results
|--------------------------------------------------------------------------
|
| PATCH /api/exam-results/:examId/publish
|
| Publication سے پہلے:
|
| - Exam approved ہونا چاہیے۔
| - ہر ExamResult approved ہونا چاہیے۔
| - ہر overall result مکمل ہونا چاہیے۔
| - Pending / Incomplete / Withheld result publish نہیں ہوگا۔
|
| Publish ہونے پر:
|
| - ExamResult status -> published
| - StudentMark status -> published
| - Exam status -> published
| - Exam result visibility -> published
|
| بعد میں Student Portal، Parent Portal اور Report Card انہی published
| snapshots کو استعمال کریں گے۔
|
*/

router.patch(
  "/:examId/publish",

  authorize(
    ...RESULT_MANAGEMENT_ROLES
  ),

  validateObjectId(
    "examId"
  ),

  publishExamResults
);

/*
|--------------------------------------------------------------------------
| Get Exam Results Dashboard
|--------------------------------------------------------------------------
|
| GET /api/exam-results/:examId
|
| Principal / Super Admin کیلئے exam کے تمام consolidated results۔
|
| Optional query parameters:
|
| classId
| sectionName
| status
| overallResultStatus
| search
| page
| limit
|
| مثال:
|
| /api/exam-results/EXAM_ID?classId=CLASS_ID&sectionName=A
|
| /api/exam-results/EXAM_ID?overallResultStatus=pass
|
| /api/exam-results/EXAM_ID?search=Ali
|
| Response میں:
|
| exam
| summary
| results
| pagination
|
*/

router.get(
  "/:examId",

  authorize(
    ...RESULT_MANAGEMENT_ROLES
  ),

  validateObjectId(
    "examId"
  ),

  getExamResults
);

/*
|--------------------------------------------------------------------------
| Route Export
|--------------------------------------------------------------------------
*/

module.exports =
  router;