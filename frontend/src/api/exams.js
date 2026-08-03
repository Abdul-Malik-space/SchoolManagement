import api from "./axios";

/*
|--------------------------------------------------------------------------
| Exam API Base
|--------------------------------------------------------------------------
*/

const BASE_URL =
  "/exams";

/*
|--------------------------------------------------------------------------
| Exam Workflow Constants
|--------------------------------------------------------------------------
|
| Backend setup-options remains the source of truth. These constants are kept
| here only to prevent spelling mistakes in frontend status actions.
|
*/

export const EXAM_STATUS =
  Object.freeze({
    DRAFT:
      "draft",

    SCHEDULED:
      "scheduled",

    IN_PROGRESS:
      "in_progress",

    MARKS_ENTRY:
      "marks_entry",

    UNDER_REVIEW:
      "under_review",

    APPROVED:
      "approved",

    PUBLISHED:
      "published",

    LOCKED:
      "locked",

    ARCHIVED:
      "archived",

    CANCELLED:
      "cancelled"
  });

/*
|--------------------------------------------------------------------------
| Generic Helpers
|--------------------------------------------------------------------------
*/

const normalizeText = (
  value
) => {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return "";
  }

  return String(
    value
  ).trim();
};

const getRecordId = (
  value
) => {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return null;
  }

  if (
    typeof value ===
      "object"
  ) {
    return (
      value._id ||
      value.id ||
      null
    );
  }

  return value;
};

const requireRecordId = (
  value,
  label =
    "Exam"
) => {
  const recordId =
    normalizeText(
      getRecordId(
        value
      )
    );

  if (!recordId) {
    throw new Error(
      `${label} ID is required.`
    );
  }

  return encodeURIComponent(
    recordId
  );
};

const normalizeOptionalId = (
  value
) => {
  if (
    value ===
      undefined
  ) {
    return undefined;
  }

  if (
    value ===
      null ||
    value ===
      ""
  ) {
    return null;
  }

  return (
    getRecordId(
      value
    ) ||
    value
  );
};

const removeUndefined = (
  object = {}
) => {
  return Object.fromEntries(
    Object.entries(
      object
    ).filter(
      ([, value]) =>
        value !==
        undefined
    )
  );
};

const cleanParams = (
  params = {}
) => {
  return Object.fromEntries(
    Object.entries(
      params
    ).filter(
      ([, value]) =>
        value !==
          undefined &&
        value !==
          null &&
        value !==
          ""
    )
  );
};

const buildGetConfig = (
  params = {},
  config = {}
) => {
  return {
    ...config,

    params:
      cleanParams({
        ...(
          config.params ||
          {}
        ),

        ...params
      })
  };
};

const normalizeIdList = (
  values
) => {
  if (
    !Array.isArray(
      values
    )
  ) {
    return values;
  }

  return Array.from(
    new Set(
      values
        .map(
          getRecordId
        )
        .filter(
          Boolean
        )
        .map(
          String
        )
    )
  );
};

/*
|--------------------------------------------------------------------------
| Exam Payload Normalization
|--------------------------------------------------------------------------
|
| Frontend forms may hold selected records as complete objects. These helpers
| convert those objects into IDs before sending them to the backend.
|
| Empty strings, null, false and zero are preserved for mutation requests so
| the frontend can intentionally clear optional fields.
|
*/

const normalizeApplicableClasses = (
  applicableClasses
) => {
  if (
    !Array.isArray(
      applicableClasses
    )
  ) {
    return applicableClasses;
  }

  return applicableClasses.map(
    (
      classItem,
      index
    ) => {
      const item =
        classItem ||
        {};

      return removeUndefined({
        ...item,

        classId:
          normalizeOptionalId(
            item.classId ||
            item.class
          ),

        allSections:
          item.allSections !==
          false,

        sections:
          Array.isArray(
            item.sections
          )
            ? item.sections
                .map(
                  normalizeText
                )
                .filter(
                  Boolean
                )
            : item.sections,

        displayOrder:
          item.displayOrder ??
          index
      });
    }
  );
};

const normalizeSubjectRules = (
  subjectRules
) => {
  if (
    !Array.isArray(
      subjectRules
    )
  ) {
    return subjectRules;
  }

  return subjectRules.map(
    (
      subjectRule,
      index
    ) => {
      const rule =
        subjectRule ||
        {};

      return removeUndefined({
        ...rule,

        classId:
          normalizeOptionalId(
            rule.classId ||
            rule.class
          ),

        subjectId:
          normalizeOptionalId(
            rule.subjectId ||
            rule.subject
          ),

        assignedTeacherIds:
          normalizeIdList(
            rule.assignedTeacherIds ||
            rule.assignedTeachers
          ),

        displayOrder:
          rule.displayOrder ??
          index
      });
    }
  );
};

const normalizeResultSettings = (
  resultSettings
) => {
  if (
    resultSettings ===
      undefined ||
    resultSettings ===
      null ||
    typeof resultSettings !==
      "object" ||
    Array.isArray(
      resultSettings
    )
  ) {
    return resultSettings;
  }

  return removeUndefined({
    ...resultSettings,

    gradeSchemeId:
      normalizeOptionalId(
        resultSettings
          .gradeSchemeId ||
        resultSettings
          .gradeScheme
      )
  });
};

export const cleanExamPayload = (
  payload = {}
) => {
  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(
      payload
    )
  ) {
    return payload;
  }

  return removeUndefined({
    ...payload,

    schoolId:
      normalizeOptionalId(
        payload.schoolId ||
        payload.school
      ),

    applicableClasses:
      payload.applicableClasses !==
      undefined
        ? normalizeApplicableClasses(
            payload.applicableClasses
          )
        : undefined,

    subjectRules:
      payload.subjectRules !==
      undefined
        ? normalizeSubjectRules(
            payload.subjectRules
          )
        : undefined,

    resultSettings:
      payload.resultSettings !==
      undefined
        ? normalizeResultSettings(
            payload.resultSettings
          )
        : undefined
  });
};

/*
|--------------------------------------------------------------------------
| Get Exams
|--------------------------------------------------------------------------
|
| Supported query parameters:
|
| schoolId
| academicYear
| academicTerm
| examType
| status
| classId
| subjectId
| isActive
| search
| dateFrom
| dateTo
| page
| limit
| sortBy
| sortOrder
|
*/

export const getExams = (
  params = {},
  config = {}
) => {
  return api.get(
    BASE_URL,
    buildGetConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Get Exam Dashboard Summary
|--------------------------------------------------------------------------
|
| Supported query parameters:
|
| schoolId
| academicYear
|
*/

export const getExamSummary = (
  params = {},
  config = {}
) => {
  return api.get(
    `${BASE_URL}/summary`,
    buildGetConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Get Exam Setup Options
|--------------------------------------------------------------------------
|
| Returns:
|
| school
| academicYear
| classes
| subjects
| subjectsByClass
| teachers
| gradeSchemes
| constants
|
| Super Admin must supply schoolId.
|
*/

export const getExamSetupOptions = (
  params = {},
  config = {}
) => {
  return api.get(
    `${BASE_URL}/setup-options`,
    buildGetConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Get Deleted Exams
|--------------------------------------------------------------------------
*/

export const getDeletedExams = (
  params = {},
  config = {}
) => {
  return api.get(
    `${BASE_URL}/deleted/list`,
    buildGetConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Get One Exam
|--------------------------------------------------------------------------
|
| Response includes:
|
| exam
| dependencies
| workflowState
| allowedStatusTransitions
|
*/

export const getExamById = (
  examId,
  config = {}
) => {
  const id =
    requireRecordId(
      examId,
      "Exam"
    );

  return api.get(
    `${BASE_URL}/${id}`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Get Exam Dependencies
|--------------------------------------------------------------------------
|
| Returns linked schedule, mark, result and report-card counts together with
| workflow state and delete eligibility.
|
*/

export const getExamDependencies = (
  examId,
  config = {}
) => {
  const id =
    requireRecordId(
      examId,
      "Exam"
    );

  return api.get(
    `${BASE_URL}/${id}/dependencies`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Create Exam
|--------------------------------------------------------------------------
*/

export const createExam = (
  payload,
  config = {}
) => {
  return api.post(
    BASE_URL,
    cleanExamPayload(
      payload
    ),
    config
  );
};

/*
|--------------------------------------------------------------------------
| Replace / Update Exam
|--------------------------------------------------------------------------
|
| The backend only accepts explicitly supported exam fields. Structural fields
| are editable only while the exam remains in draft status.
|
*/

export const updateExam = (
  examId,
  payload,
  config = {}
) => {
  const id =
    requireRecordId(
      examId,
      "Exam"
    );

  return api.put(
    `${BASE_URL}/${id}`,
    cleanExamPayload(
      payload
    ),
    config
  );
};

/*
|--------------------------------------------------------------------------
| Partial Exam Update
|--------------------------------------------------------------------------
*/

export const patchExam = (
  examId,
  payload,
  config = {}
) => {
  const id =
    requireRecordId(
      examId,
      "Exam"
    );

  return api.patch(
    `${BASE_URL}/${id}`,
    cleanExamPayload(
      payload
    ),
    config
  );
};

/*
|--------------------------------------------------------------------------
| Update Exam Workflow Status
|--------------------------------------------------------------------------
|
| Example:
|
| updateExamStatus(
|   examId,
|   {
|     status: "scheduled"
|   }
| );
|
*/

export const updateExamStatus = (
  examId,
  payload,
  config = {}
) => {
  const id =
    requireRecordId(
      examId,
      "Exam"
    );

  const normalizedPayload =
    typeof payload ===
      "string"
      ? {
          status:
            normalizeText(
              payload
            ).toLowerCase()
        }
      : removeUndefined({
          ...(
            payload ||
            {}
          ),

          status:
            normalizeText(
              payload?.status
            ).toLowerCase()
        });

  if (
    !normalizedPayload.status
  ) {
    throw new Error(
      "Exam status is required."
    );
  }

  return api.patch(
    `${BASE_URL}/${id}/status`,
    normalizedPayload,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Generic Status Transition Helper
|--------------------------------------------------------------------------
*/

export const transitionExamStatus = (
  examId,
  status,
  metadata = {},
  config = {}
) => {
  return updateExamStatus(
    examId,
    {
      ...metadata,

      status
    },
    config
  );
};

/*
|--------------------------------------------------------------------------
| Named Workflow Actions
|--------------------------------------------------------------------------
*/

export const scheduleExam = (
  examId,
  metadata = {},
  config = {}
) => {
  return transitionExamStatus(
    examId,
    EXAM_STATUS.SCHEDULED,
    metadata,
    config
  );
};

export const startExam = (
  examId,
  metadata = {},
  config = {}
) => {
  return transitionExamStatus(
    examId,
    EXAM_STATUS.IN_PROGRESS,
    metadata,
    config
  );
};

export const openExamMarksEntry = (
  examId,
  metadata = {},
  config = {}
) => {
  return transitionExamStatus(
    examId,
    EXAM_STATUS.MARKS_ENTRY,
    metadata,
    config
  );
};

export const submitExamForReview = (
  examId,
  metadata = {},
  config = {}
) => {
  return transitionExamStatus(
    examId,
    EXAM_STATUS.UNDER_REVIEW,
    metadata,
    config
  );
};

export const approveExam = (
  examId,
  metadata = {},
  config = {}
) => {
  return transitionExamStatus(
    examId,
    EXAM_STATUS.APPROVED,
    metadata,
    config
  );
};

export const publishExam = (
  examId,
  metadata = {},
  config = {}
) => {
  return transitionExamStatus(
    examId,
    EXAM_STATUS.PUBLISHED,
    metadata,
    config
  );
};

export const lockExam = (
  examId,
  lockReason = "",
  config = {}
) => {
  return transitionExamStatus(
    examId,
    EXAM_STATUS.LOCKED,
    {
      lockReason:
        normalizeText(
          lockReason
        )
    },
    config
  );
};

export const archiveExam = (
  examId,
  metadata = {},
  config = {}
) => {
  return transitionExamStatus(
    examId,
    EXAM_STATUS.ARCHIVED,
    metadata,
    config
  );
};

export const cancelExam = (
  examId,
  cancellationReason,
  config = {}
) => {
  const reason =
    normalizeText(
      cancellationReason
    );

  if (!reason) {
    throw new Error(
      "Cancellation reason is required."
    );
  }

  return transitionExamStatus(
    examId,
    EXAM_STATUS.CANCELLED,
    {
      cancellationReason:
        reason
    },
    config
  );
};

/*
|--------------------------------------------------------------------------
| Clone Exam
|--------------------------------------------------------------------------
|
| Required payload fields:
|
| examCode
| academicYear
| startDate
| endDate
|
*/

export const cloneExam = (
  examId,
  payload,
  config = {}
) => {
  const id =
    requireRecordId(
      examId,
      "Source exam"
    );

  return api.post(
    `${BASE_URL}/${id}/clone`,
    cleanExamPayload(
      payload
    ),
    config
  );
};

/*
|--------------------------------------------------------------------------
| Soft Delete Exam
|--------------------------------------------------------------------------
*/

export const deleteExam = (
  examId,
  config = {}
) => {
  const id =
    requireRecordId(
      examId,
      "Exam"
    );

  return api.delete(
    `${BASE_URL}/${id}`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Restore Deleted Exam
|--------------------------------------------------------------------------
*/

export const restoreExam = (
  examId,
  config = {}
) => {
  const id =
    requireRecordId(
      examId,
      "Exam"
    );

  return api.patch(
    `${BASE_URL}/${id}/restore`,
    {},
    config
  );
};
