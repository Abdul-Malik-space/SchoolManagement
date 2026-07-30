import api from "./axios";

/*
|--------------------------------------------------------------------------
| Portal Messaging API Base
|--------------------------------------------------------------------------
|
| یہ API Parent، Student اور Principal تینوں portals کے لیے reusable ہے۔
|
*/

const PORTAL_MESSAGES_BASE =
  "/portal-messages";

/*
|--------------------------------------------------------------------------
| Public Constants
|--------------------------------------------------------------------------
*/

export const PORTAL_MESSAGE_CATEGORIES = [
  "academics",
  "attendance",
  "fees",
  "behavior",
  "health",
  "transport",
  "timetable",
  "general",
  "other"
];

export const PORTAL_MESSAGE_PRIORITIES = [
  "normal",
  "high",
  "urgent"
];

export const PORTAL_CONVERSATION_STATUSES = [
  "open",
  "waiting_for_school",
  "waiting_for_family",
  "resolved",
  "closed"
];

export const PORTAL_CONVERSATION_ACTION_STATUSES = [
  "open",
  "resolved",
  "closed"
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const requireId = (
  value,
  label
) => {
  const normalizedValue =
    String(
      value || ""
    ).trim();

  if (!normalizedValue) {
    throw new Error(
      `${label} is required.`
    );
  }

  return encodeURIComponent(
    normalizedValue
  );
};

const cleanParams = (
  params = {}
) => {
  return Object.fromEntries(
    Object.entries(
      params
    ).filter(
      ([
        ,
        value
      ]) => {
        return (
          value !== undefined &&
          value !== null &&
          value !== ""
        );
      }
    )
  );
};

const buildRequestConfig = (
  params = {},
  config = {}
) => {
  return {
    ...config,

    params: {
      ...cleanParams(
        config.params || {}
      ),

      ...cleanParams(
        params
      )
    }
  };
};

const normalizeAttachments = (
  attachments
) => {
  return Array.isArray(
    attachments
  )
    ? attachments.filter(
        Boolean
      )
    : [];
};

const normalizeConversationPayload = (
  payload = {}
) => {
  return {
    studentId:
      payload.studentId ||
      undefined,

    subject:
      String(
        payload.subject || ""
      ).trim(),

    category:
      String(
        payload.category ||
        "general"
      )
        .trim()
        .toLowerCase(),

    priority:
      String(
        payload.priority ||
        "normal"
      )
        .trim()
        .toLowerCase(),

    text:
      String(
        payload.text || ""
      ).trim(),

    attachments:
      normalizeAttachments(
        payload.attachments
      )
  };
};

const normalizeMessagePayload = (
  payload = {}
) => {
  return {
    text:
      String(
        payload.text || ""
      ).trim(),

    replyToMessageId:
      payload.replyToMessageId ||
      undefined,

    attachments:
      normalizeAttachments(
        payload.attachments
      )
  };
};

/*
|--------------------------------------------------------------------------
| Messaging Summary
|--------------------------------------------------------------------------
|
| GET /api/portal-messages/summary
|
*/

export const getPortalMessagingSummary = (
  config = {}
) => {
  return api.get(
    `${PORTAL_MESSAGES_BASE}/summary`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Conversation Inbox
|--------------------------------------------------------------------------
|
| Supported params:
|
| archived=true|false
| status=open|waiting_for_school|waiting_for_family|resolved|closed
| category=academics|attendance|fees|behavior|health|transport|timetable|general|other
| priority=normal|high|urgent
| studentId=...
| search=...
| page=1
| limit=20
|
*/

export const getPortalConversations = (
  params = {},
  config = {}
) => {
  return api.get(
    `${PORTAL_MESSAGES_BASE}/conversations`,
    buildRequestConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Create Conversation
|--------------------------------------------------------------------------
|
| POST /api/portal-messages/conversations
|
| Parent یا Student نئی conversation شروع کر سکتے ہیں۔
|
*/

export const createPortalConversation = (
  payload,
  config = {}
) => {
  return api.post(
    `${PORTAL_MESSAGES_BASE}/conversations`,
    normalizeConversationPayload(
      payload
    ),
    config
  );
};

/*
|--------------------------------------------------------------------------
| Conversation Details
|--------------------------------------------------------------------------
|
| GET /api/portal-messages/conversations/:conversationId
|
*/

export const getPortalConversationById = (
  conversationId,
  config = {}
) => {
  const safeConversationId =
    requireId(
      conversationId,
      "Conversation ID"
    );

  return api.get(
    `${PORTAL_MESSAGES_BASE}/conversations/${safeConversationId}`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Conversation Messages
|--------------------------------------------------------------------------
|
| Supported params:
|
| page=1
| limit=30
| markRead=true|false
|
*/

export const getPortalConversationMessages = (
  conversationId,
  params = {},
  config = {}
) => {
  const safeConversationId =
    requireId(
      conversationId,
      "Conversation ID"
    );

  return api.get(
    `${PORTAL_MESSAGES_BASE}/conversations/${safeConversationId}/messages`,
    buildRequestConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Send Message
|--------------------------------------------------------------------------
|
| POST /api/portal-messages/conversations/:conversationId/messages
|
*/

export const sendPortalMessage = (
  conversationId,
  payload,
  config = {}
) => {
  const safeConversationId =
    requireId(
      conversationId,
      "Conversation ID"
    );

  return api.post(
    `${PORTAL_MESSAGES_BASE}/conversations/${safeConversationId}/messages`,
    normalizeMessagePayload(
      payload
    ),
    config
  );
};

/*
|--------------------------------------------------------------------------
| Mark Conversation as Read
|--------------------------------------------------------------------------
|
| PATCH /api/portal-messages/conversations/:conversationId/read
|
*/

export const markPortalConversationRead = (
  conversationId,
  config = {}
) => {
  const safeConversationId =
    requireId(
      conversationId,
      "Conversation ID"
    );

  return api.patch(
    `${PORTAL_MESSAGES_BASE}/conversations/${safeConversationId}/read`,
    {},
    config
  );
};

/*
|--------------------------------------------------------------------------
| Archive or Restore Conversation
|--------------------------------------------------------------------------
|
| PATCH /api/portal-messages/conversations/:conversationId/archive
|
*/

export const setPortalConversationArchived = (
  conversationId,
  archived = true,
  config = {}
) => {
  const safeConversationId =
    requireId(
      conversationId,
      "Conversation ID"
    );

  return api.patch(
    `${PORTAL_MESSAGES_BASE}/conversations/${safeConversationId}/archive`,
    {
      archived:
        Boolean(archived)
    },
    config
  );
};

export const archivePortalConversation = (
  conversationId,
  config = {}
) => {
  return setPortalConversationArchived(
    conversationId,
    true,
    config
  );
};

export const restorePortalConversation = (
  conversationId,
  config = {}
) => {
  return setPortalConversationArchived(
    conversationId,
    false,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Resolve, Close or Reopen Conversation
|--------------------------------------------------------------------------
|
| PATCH /api/portal-messages/conversations/:conversationId/status
|
| Principal-only action۔
|
*/

export const updatePortalConversationStatus = (
  conversationId,
  status,
  config = {}
) => {
  const safeConversationId =
    requireId(
      conversationId,
      "Conversation ID"
    );

  const normalizedStatus =
    String(
      status || ""
    )
      .trim()
      .toLowerCase();

  if (
    !PORTAL_CONVERSATION_ACTION_STATUSES.includes(
      normalizedStatus
    )
  ) {
    throw new Error(
      "Conversation status must be open, resolved or closed."
    );
  }

  return api.patch(
    `${PORTAL_MESSAGES_BASE}/conversations/${safeConversationId}/status`,
    {
      status:
        normalizedStatus
    },
    config
  );
};

export const resolvePortalConversation = (
  conversationId,
  config = {}
) => {
  return updatePortalConversationStatus(
    conversationId,
    "resolved",
    config
  );
};

export const closePortalConversation = (
  conversationId,
  config = {}
) => {
  return updatePortalConversationStatus(
    conversationId,
    "closed",
    config
  );
};

export const reopenPortalConversation = (
  conversationId,
  config = {}
) => {
  return updatePortalConversationStatus(
    conversationId,
    "open",
    config
  );
};