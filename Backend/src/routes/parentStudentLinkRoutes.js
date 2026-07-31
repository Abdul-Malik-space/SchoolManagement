const express = require("express");

const {
  getParentStudentLinks,
  getParentStudentLinkById,
  getParentStudentLinksByParent,
  getParentStudentLinksByStudent,
  createParentStudentLink,
  updateParentStudentLink,
  updateParentStudentLinkStatus,
  verifyParentStudentLink,
  deleteParentStudentLink,
  restoreParentStudentLink
} = require(
  "../controllers/parentStudentLinkController"
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
| Parent–Student Link Management
|--------------------------------------------------------------------------
|
| صرف Super Admin اور Principal یہ routes استعمال کر سکتے ہیں۔
|
| Super Admin:
| کسی بھی school کے parent links manage کر سکتا ہے۔ schoolId query یا body
| میں فراہم کیا جا سکتا ہے۔
|
| Principal:
| صرف اپنے school کے parent–student links manage کر سکتا ہے۔
|
*/

router.use(
  protect,
  authorize(
    "super_admin",
    "principal"
  ),
  schoolScope
);

/*
|--------------------------------------------------------------------------
| List Parent–Student Links
|--------------------------------------------------------------------------
|
| Supported query parameters:
|
| page
| limit
| schoolId              Super Admin only
| parentUserId
| studentId
| status
| verificationStatus
| includeDeleted
|
*/

router.get(
  "/",
  getParentStudentLinks
);

/*
|--------------------------------------------------------------------------
| Create Parent–Student Link
|--------------------------------------------------------------------------
|
| Required body:
|
| parentUserId
| studentId
|
| Optional body:
|
| relationship
| customRelationship
| isPrimary
| isEmergencyContact
| canCollectStudent
| accessPermissions
| notificationPreferences
| preferredLanguage
| verificationStatus
| notes
|
*/

router.post(
  "/",
  createParentStudentLink
);

/*
|--------------------------------------------------------------------------
| Get All Children Linked with One Parent
|--------------------------------------------------------------------------
|
| User Details page اس route کے ذریعے Parent account کے linked students،
| relationship، permissions اور link status حاصل کرے گا۔
|
*/

router.get(
  "/parent/:parentUserId",
  validateObjectId(
    "parentUserId"
  ),
  getParentStudentLinksByParent
);

/*
|--------------------------------------------------------------------------
| Get All Parents Linked with One Student
|--------------------------------------------------------------------------
|
| Student Details page اس route کے ذریعے linked guardians حاصل کر سکتا ہے۔
|
*/

router.get(
  "/student/:studentId",
  validateObjectId(
    "studentId"
  ),
  getParentStudentLinksByStudent
);

/*
|--------------------------------------------------------------------------
| Restore Deleted Parent–Student Link
|--------------------------------------------------------------------------
|
| یہ route generic /:linkId route سے پہلے رکھا گیا ہے تاکہ restore path
| درست controller تک پہنچے۔
|
*/

router.patch(
  "/:linkId/restore",
  validateObjectId(
    "linkId"
  ),
  restoreParentStudentLink
);

/*
|--------------------------------------------------------------------------
| Update Link Status
|--------------------------------------------------------------------------
|
| Allowed values model کے مطابق validate ہوں گی، مثلاً:
|
| active
| inactive
| suspended
| revoked
|
*/

router.patch(
  "/:linkId/status",
  validateObjectId(
    "linkId"
  ),
  updateParentStudentLinkStatus
);

/*
|--------------------------------------------------------------------------
| Verify, Reject or Return Link to Pending
|--------------------------------------------------------------------------
|
| Body:
|
| {
|   "verificationStatus": "verified"
| }
|
| Supported values model کے مطابق:
|
| pending
| verified
| rejected
|
*/

router.patch(
  "/:linkId/verify",
  validateObjectId(
    "linkId"
  ),
  verifyParentStudentLink
);

/*
|--------------------------------------------------------------------------
| Get Single Parent–Student Link
|--------------------------------------------------------------------------
*/

router.get(
  "/:linkId",
  validateObjectId(
    "linkId"
  ),
  getParentStudentLinkById
);

/*
|--------------------------------------------------------------------------
| Update Link Details and Permissions
|--------------------------------------------------------------------------
|
| Relationship، primary guardian flags، portal permissions، notifications
| اور notes اس route کے ذریعے update ہوں گے۔
|
*/

router.put(
  "/:linkId",
  validateObjectId(
    "linkId"
  ),
  updateParentStudentLink
);

/*
|--------------------------------------------------------------------------
| Partial Update Alias
|--------------------------------------------------------------------------
|
| Frontend modal مکمل object کے بجائے صرف تبدیل شدہ fields بھیج سکے گا۔
|
*/

router.patch(
  "/:linkId",
  validateObjectId(
    "linkId"
  ),
  updateParentStudentLink
);

/*
|--------------------------------------------------------------------------
| Soft Delete / Unlink Parent
|--------------------------------------------------------------------------
|
| Record database سے permanently delete نہیں ہوگا۔ Link soft-delete ہوگا
| اور ضرورت پڑنے پر restore route سے واپس فعال کیا جا سکے گا۔
|
*/

router.delete(
  "/:linkId",
  validateObjectId(
    "linkId"
  ),
  deleteParentStudentLink
);

module.exports = router;
