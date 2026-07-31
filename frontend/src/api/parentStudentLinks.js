import api from "./axios";

/*
|--------------------------------------------------------------------------
| Parent–Student Links API Base
|--------------------------------------------------------------------------
|
| Super Admin اور Principal اس API کے ذریعے Parent accounts کو Students
| کے ساتھ link، update، verify، deactivate، unlink اور restore کر سکتے ہیں۔
|
*/

const PARENT_STUDENT_LINKS_BASE =
  "/parent-student-links";

/*
|--------------------------------------------------------------------------
| Public Constants
|--------------------------------------------------------------------------
*/

export const PARENT_RELATIONSHIP_OPTIONS = [
  {
    value: "father",
    label: "Father"
  },
  {
    value: "mother",
    label: "Mother"
  },
  {
    value: "guardian",
    label: "Guardian"
  },
  {
    value: "grandfather",
    label: "Grandfather"
  },
  {
    value: "grandmother",
    label: "Grandmother"
  },
  {
    value: "brother",
    label: "Brother"
  },
  {
    value: "sister",
    label: "Sister"
  },
  {
    value: "uncle",
    label: "Uncle"
  },
  {
    value: "aunt",
    label: "Aunt"
  },
  {
    value: "other",
    label: "Other"
  }
];

export const PARENT_LINK_STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active"
  },
  {
    value: "inactive",
    label: "Inactive"
  },
  {
    value: "suspended",
    label: "Suspended"
  },
  {
    value: "revoked",
    label: "Revoked"
  }
];

export const PARENT_LINK_VERIFICATION_OPTIONS = [
  {
    value: "pending",
    label: "Pending"
  },
  {
    value: "verified",
    label: "Verified"
  },
  {
    value: "rejected",
    label: "Rejected"
  }
];

export const DEFAULT_PARENT_PORTAL_PERMISSIONS = {
  dashboard: true,
  studentProfile: true,
  attendance: true,
  timetable: true,
  academics: true,
  fees: true,
  receipts: true,
  notices: true,
  messages: true,
  documents: false
};

export const DEFAULT_PARENT_NOTIFICATION_PREFERENCES = {
  inApp: true,
  email: true,
  sms: false,
  attendanceAlerts: true,
  feeAlerts: true,
  academicUpdates: true,
  timetableUpdates: true,
  noticeAlerts: true,
  messageAlerts: true
};

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

const cleanPayload = (
  payload = {}
) => {
  return Object.fromEntries(
    Object.entries(
      payload
    ).filter(
      ([
        ,
        value
      ]) => {
        return (
          value !== undefined
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
        config.params ||
        {}
      ),

      ...cleanParams(
        params
      )
    }
  };
};

const normalizeBooleanObject = (
  value
) => {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(
      value
    ).filter(
      ([
        ,
        item
      ]) => {
        return (
          typeof item ===
          "boolean"
        );
      }
    )
  );
};

const normalizeText = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  return String(
    value
  ).trim();
};

const normalizeLowercaseText = (
  value
) => {
  const normalizedValue =
    normalizeText(
      value
    );

  return normalizedValue ===
    undefined ||
    normalizedValue ===
      null
    ? normalizedValue
    : normalizedValue
        .toLowerCase();
};

const normalizeLinkPayload = (
  payload = {}
) => {
  return cleanPayload({
    schoolId:
      normalizeText(
        payload.schoolId
      ),

    parentUserId:
      normalizeText(
        payload.parentUserId
      ),

    studentId:
      normalizeText(
        payload.studentId
      ),

    relationship:
      normalizeLowercaseText(
        payload.relationship
      ),

    customRelationship:
      normalizeText(
        payload.customRelationship
      ),

    isPrimary:
      typeof payload.isPrimary ===
      "boolean"
        ? payload.isPrimary
        : undefined,

    isEmergencyContact:
      typeof payload.isEmergencyContact ===
      "boolean"
        ? payload.isEmergencyContact
        : undefined,

    canCollectStudent:
      typeof payload.canCollectStudent ===
      "boolean"
        ? payload.canCollectStudent
        : undefined,

    accessPermissions:
      normalizeBooleanObject(
        payload.accessPermissions ||
        payload.permissions
      ),

    notificationPreferences:
      normalizeBooleanObject(
        payload.notificationPreferences
      ),

    preferredLanguage:
      normalizeLowercaseText(
        payload.preferredLanguage
      ),

    status:
      normalizeLowercaseText(
        payload.status
      ),

    verificationStatus:
      normalizeLowercaseText(
        payload.verificationStatus
      ),

    verificationNotes:
      normalizeText(
        payload.verificationNotes
      ),

    notes:
      normalizeText(
        payload.notes
      ),

    linkSource:
      normalizeLowercaseText(
        payload.linkSource
      )
  });
};

/*
|--------------------------------------------------------------------------
| Get All Parent–Student Links
|--------------------------------------------------------------------------
|
| GET /api/parent-student-links
|
| Supported params:
|
| page
| limit
| schoolId
| parentUserId
| studentId
| status
| verificationStatus
| includeDeleted
|
*/

export const getParentStudentLinks = (
  params = {},
  config = {}
) => {
  return api.get(
    PARENT_STUDENT_LINKS_BASE,
    buildRequestConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Get One Parent–Student Link
|--------------------------------------------------------------------------
|
| GET /api/parent-student-links/:linkId
|
*/

export const getParentStudentLinkById = (
  linkId,
  config = {}
) => {
  const safeLinkId =
    requireId(
      linkId,
      "Parent–student link ID"
    );

  return api.get(
    `${PARENT_STUDENT_LINKS_BASE}/${safeLinkId}`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Get Children Linked with One Parent
|--------------------------------------------------------------------------
|
| GET /api/parent-student-links/parent/:parentUserId
|
| User Details page اس request سے linked students حاصل کرے گا۔
|
*/

export const getParentStudentLinksByParent = (
  parentUserId,
  params = {},
  config = {}
) => {
  const safeParentUserId =
    requireId(
      parentUserId,
      "Parent user ID"
    );

  return api.get(
    `${PARENT_STUDENT_LINKS_BASE}/parent/${safeParentUserId}`,
    buildRequestConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Get Parents Linked with One Student
|--------------------------------------------------------------------------
|
| GET /api/parent-student-links/student/:studentId
|
*/

export const getParentStudentLinksByStudent = (
  studentId,
  params = {},
  config = {}
) => {
  const safeStudentId =
    requireId(
      studentId,
      "Student ID"
    );

  return api.get(
    `${PARENT_STUDENT_LINKS_BASE}/student/${safeStudentId}`,
    buildRequestConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Create Parent–Student Link
|--------------------------------------------------------------------------
|
| POST /api/parent-student-links
|
*/

export const createParentStudentLink = (
  payload,
  config = {}
) => {
  return api.post(
    PARENT_STUDENT_LINKS_BASE,
    normalizeLinkPayload(
      payload
    ),
    config
  );
};

/*
|--------------------------------------------------------------------------
| Replace Parent–Student Link Details
|--------------------------------------------------------------------------
|
| PUT /api/parent-student-links/:linkId
|
*/

export const updateParentStudentLink = (
  linkId,
  payload,
  config = {}
) => {
  const safeLinkId =
    requireId(
      linkId,
      "Parent–student link ID"
    );

  return api.put(
    `${PARENT_STUDENT_LINKS_BASE}/${safeLinkId}`,
    normalizeLinkPayload(
      payload
    ),
    config
  );
};

/*
|--------------------------------------------------------------------------
| Partially Update Parent–Student Link
|--------------------------------------------------------------------------
|
| PATCH /api/parent-student-links/:linkId
|
*/

export const patchParentStudentLink = (
  linkId,
  payload,
  config = {}
) => {
  const safeLinkId =
    requireId(
      linkId,
      "Parent–student link ID"
    );

  return api.patch(
    `${PARENT_STUDENT_LINKS_BASE}/${safeLinkId}`,
    normalizeLinkPayload(
      payload
    ),
    config
  );
};

/*
|--------------------------------------------------------------------------
| Update Link Status
|--------------------------------------------------------------------------
|
| PATCH /api/parent-student-links/:linkId/status
|
*/

export const updateParentStudentLinkStatus = (
  linkId,
  status,
  reason = "",
  config = {}
) => {
  const safeLinkId =
    requireId(
      linkId,
      "Parent–student link ID"
    );

  return api.patch(
    `${PARENT_STUDENT_LINKS_BASE}/${safeLinkId}/status`,
    cleanPayload({
      status:
        normalizeLowercaseText(
          status
        ),

      reason:
        normalizeText(
          reason
        )
    }),
    config
  );
};

/*
|--------------------------------------------------------------------------
| Verify, Reject or Return Link to Pending
|--------------------------------------------------------------------------
|
| PATCH /api/parent-student-links/:linkId/verify
|
*/

export const verifyParentStudentLink = (
  linkId,
  verificationStatus = "verified",
  verificationNotes = "",
  config = {}
) => {
  const safeLinkId =
    requireId(
      linkId,
      "Parent–student link ID"
    );

  return api.patch(
    `${PARENT_STUDENT_LINKS_BASE}/${safeLinkId}/verify`,
    cleanPayload({
      verificationStatus:
        normalizeLowercaseText(
          verificationStatus
        ),

      verificationNotes:
        normalizeText(
          verificationNotes
        )
    }),
    config
  );
};

/*
|--------------------------------------------------------------------------
| Unlink Parent from Student
|--------------------------------------------------------------------------
|
| DELETE /api/parent-student-links/:linkId
|
| Axios DELETE request میں request body config.data کے اندر جاتی ہے۔
|
*/

export const deleteParentStudentLink = (
  linkId,
  reason = "",
  config = {}
) => {
  const safeLinkId =
    requireId(
      linkId,
      "Parent–student link ID"
    );

  return api.delete(
    `${PARENT_STUDENT_LINKS_BASE}/${safeLinkId}`,
    {
      ...config,

      data: {
        ...cleanPayload(
          config.data ||
          {}
        ),

        reason:
          normalizeText(
            reason
          )
      }
    }
  );
};

/*
|--------------------------------------------------------------------------
| Restore Deleted Parent–Student Link
|--------------------------------------------------------------------------
|
| PATCH /api/parent-student-links/:linkId/restore
|
*/

export const restoreParentStudentLink = (
  linkId,
  payload = {},
  config = {}
) => {
  const safeLinkId =
    requireId(
      linkId,
      "Parent–student link ID"
    );

  return api.patch(
    `${PARENT_STUDENT_LINKS_BASE}/${safeLinkId}/restore`,
    cleanPayload({
      verificationStatus:
        normalizeLowercaseText(
          payload.verificationStatus
        )
    }),
    config
  );
};

/*
|--------------------------------------------------------------------------
| Readable Aliases
|--------------------------------------------------------------------------
*/

export const linkParentToStudent =
  createParentStudentLink;

export const unlinkParentFromStudent =
  deleteParentStudentLink;

export const getLinkedChildrenForParent =
  getParentStudentLinksByParent;

export const getLinkedParentsForStudent =
  getParentStudentLinksByStudent;
