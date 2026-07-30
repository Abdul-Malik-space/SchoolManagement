const express =
  require("express");

const {
  createConversation,
  getMessagingSummary,
  getConversations,
  getConversationById,
  getMessages,
  sendMessage,
  markConversationRead,
  setConversationArchive,
  updateConversationStatus
} = require(
  "../controllers/portalMessageController"
);

const {
  protect,
  authorize
} = require(
  "../middlewares/authMiddleware"
);

const validateObjectId =
  require(
    "../middlewares/validateObjectId"
  );

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Portal Messaging Security
|--------------------------------------------------------------------------
|
| Parent، Student اور Principal messaging module استعمال کر سکتے ہیں۔
| Controller ہر request کو authenticated school اور participant ownership
| کے مطابق scope کرتا ہے۔
|
*/

router.use(
  protect,
  authorize(
    "parent",
    "student",
    "principal"
  )
);

/*
|--------------------------------------------------------------------------
| Reusable ID Validation
|--------------------------------------------------------------------------
*/

const validateConversationId =
  validateObjectId(
    "conversationId"
  );

/*
|--------------------------------------------------------------------------
| Messaging Summary
|--------------------------------------------------------------------------
|
| GET /api/portal-messages/summary
|
| Total conversations، open conversations، unread messages اور urgent
| conversation count return کرتا ہے۔
|
*/

router.get(
  "/summary",
  getMessagingSummary
);

/*
|--------------------------------------------------------------------------
| Conversation Inbox
|--------------------------------------------------------------------------
|
| GET /api/portal-messages/conversations
|
| Supported query parameters:
|
| archived=true|false
| status=open|waiting_for_school|waiting_for_family|resolved|closed
| category=academics|attendance|fees|behavior|health|transport|timetable|general|other
| priority=normal|high|urgent
| search=attendance
| page=1
| limit=20
|
*/

router.get(
  "/conversations",
  getConversations
);

/*
|--------------------------------------------------------------------------
| Create Conversation
|--------------------------------------------------------------------------
|
| POST /api/portal-messages/conversations
|
| صرف Parent یا Student نئی conversation شروع کر سکتے ہیں۔ Principal موجودہ
| conversation کے اندر reply کرے گا۔
|
| Example body:
|
| {
|   "studentId": "...",
|   "subject": "Attendance concern",
|   "category": "attendance",
|   "priority": "normal",
|   "text": "I would like to discuss my child's attendance.",
|   "attachments": []
| }
|
*/

router.post(
  "/conversations",
  authorize(
    "parent",
    "student"
  ),
  createConversation
);

/*
|--------------------------------------------------------------------------
| Conversation Messages
|--------------------------------------------------------------------------
|
| GET /api/portal-messages/conversations/:conversationId/messages
|
| Supported query parameters:
|
| page=1
| limit=30
| markRead=true|false
|
*/

router.get(
  "/conversations/:conversationId/messages",
  validateConversationId,
  getMessages
);

/*
|--------------------------------------------------------------------------
| Send Message
|--------------------------------------------------------------------------
|
| POST /api/portal-messages/conversations/:conversationId/messages
|
| Example body:
|
| {
|   "text": "Thank you for the update.",
|   "replyToMessageId": "...",
|   "attachments": []
| }
|
*/

router.post(
  "/conversations/:conversationId/messages",
  validateConversationId,
  sendMessage
);

/*
|--------------------------------------------------------------------------
| Mark Conversation as Read
|--------------------------------------------------------------------------
|
| PATCH /api/portal-messages/conversations/:conversationId/read
|
*/

router.patch(
  "/conversations/:conversationId/read",
  validateConversationId,
  markConversationRead
);

/*
|--------------------------------------------------------------------------
| Archive or Restore Conversation
|--------------------------------------------------------------------------
|
| PATCH /api/portal-messages/conversations/:conversationId/archive
|
| Archive:
| {
|   "archived": true
| }
|
| Restore:
| {
|   "archived": false
| }
|
*/

router.patch(
  "/conversations/:conversationId/archive",
  validateConversationId,
  setConversationArchive
);

/*
|--------------------------------------------------------------------------
| Resolve, Close or Reopen Conversation
|--------------------------------------------------------------------------
|
| PATCH /api/portal-messages/conversations/:conversationId/status
|
| صرف Principal یہ action perform کر سکتا ہے۔
|
| Example body:
|
| {
|   "status": "resolved"
| }
|
| Allowed values:
| open | resolved | closed
|
*/

router.patch(
  "/conversations/:conversationId/status",
  validateConversationId,
  authorize("principal"),
  updateConversationStatus
);

/*
|--------------------------------------------------------------------------
| Conversation Details
|--------------------------------------------------------------------------
|
| GET /api/portal-messages/conversations/:conversationId
|
| Dynamic detail route nested conversation routes کے بعد رکھی گئی ہے۔
|
*/

router.get(
  "/conversations/:conversationId",
  validateConversationId,
  getConversationById
);

/*
|--------------------------------------------------------------------------
| Export Router
|--------------------------------------------------------------------------
*/

module.exports =
  router;
