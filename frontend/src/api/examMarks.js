import api from "./axios";

/*
|--------------------------------------------------------------------------
| Exam Marks API Base
|--------------------------------------------------------------------------
*/

const BASE_URL =
  "/exam-marks";

/*
|--------------------------------------------------------------------------
| Frontend Constants
|--------------------------------------------------------------------------
|
| These constants mirror the mark-sheet states used by the backend. The
| backend remains the source of truth; the constants simply prevent spelling
| mistakes in TeacherMarksEntry and PrincipalMarksReview.
|
*/

export const MARK_SHEET_STATUS =
  Object.freeze({
    NOT_STARTED:
      "not_started",

    DRAFT:
      "draft",

    SUBMITTED:
      "submitted",

    RETURNED:
      "returned",

    APPROVED:
      "approved",

    PUBLISHED:
      "published",

    LOCKED:
      "locked",

    MIXED:
      "mixed"
  });

export const MARK_ATTENDANCE_STATUS =
  Object.freeze({
    PRESENT:
      "present",

    ABSENT:
      "absent",

    MEDICAL_LEAVE:
      "medical_leave",

    APPROVED_LEAVE:
      "approved_leave",

    EXEMPTED:
      "exempted",

    WITHHELD:
      "withheld"
  });

/*
|--------------------------------------------------------------------------
| Generic Helpers
|--------------------------------------------------------------------------
*/

const getResponsePayload = (
  response
) => {
  return response?.data ?? response;
};

const normalizeText = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ");
};

const getRecordId = (
  value
) => {
  if (
    value === undefined ||
    value === null
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
  label
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

  return recordId;
};

const requirePathRecordId = (
  value,
  label
) => {
  return encodeURIComponent(
    requireRecordId(
      value,
      label
    )
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
        value !== undefined
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
        value !== undefined &&
        value !== null &&
        value !== ""
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

/*
|--------------------------------------------------------------------------
| Workspace Identity Helpers
|--------------------------------------------------------------------------
*/

const normalizeWorkspaceIdentity = (
  source = {}
) => {
  const examId =
    requireRecordId(
      source.examId ||
        source.exam,
      "Exam"
    );

  const classId =
    requireRecordId(
      source.classId ||
        source.class,
      "Class"
    );

  const subjectId =
    requireRecordId(
      source.subjectId ||
        source.subject,
      "Subject"
    );

  const sectionName =
    normalizeText(
      source.sectionName ||
        source.section
    );

  if (!sectionName) {
    throw new Error(
      "Section is required."
    );
  }

  return {
    examId,
    classId,
    sectionName,
    subjectId
  };
};

const normalizeMarkRow = (
  row = {}
) => {
  const studentId =
    requireRecordId(
      row.studentId ||
        row.student,
      "Student"
    );

  return removeUndefined({
    studentId,

    attendanceStatus:
      row.attendanceStatus,

    theoryMarks:
      row.theoryMarks,

    practicalMarks:
      row.practicalMarks,

    internalMarks:
      row.internalMarks,

    graceMarks:
      row.graceMarks,

    deductionMarks:
      row.deductionMarks,

    teacherRemarks:
      row.teacherRemarks
  });
};

const normalizeSheetPayload = (
  payload = {},
  {
    requireRows = false
  } = {}
) => {
  const identity =
    normalizeWorkspaceIdentity(
      payload
    );

  const normalizedPayload = {
    ...identity
  };

  if (
    payload.rows !== undefined
  ) {
    if (
      !Array.isArray(
        payload.rows
      )
    ) {
      throw new Error(
        "Mark sheet rows must be an array."
      );
    }

    normalizedPayload.rows =
      payload.rows.map(
        normalizeMarkRow
      );
  }

  if (
    requireRows &&
    (
      !Array.isArray(
        normalizedPayload.rows
      ) ||
      normalizedPayload.rows.length ===
        0
    )
  ) {
    throw new Error(
      "At least one student mark row is required."
    );
  }

  return normalizedPayload;
};

/*
|--------------------------------------------------------------------------
| Marks Workspaces
|--------------------------------------------------------------------------
|
| Teacher:
|   Backend returns only assigned exam / class / section / subject workspaces.
|
| Principal / Super Admin:
|   Backend returns all workspaces permitted by school scope.
|
| Supported filters currently include:
|   examId
|   academicYear
|
*/

export const getMarkWorkspaces =
  async (
    params = {},
    config = {}
  ) => {
    const normalizedParams = {
      ...params
    };

    if (
      normalizedParams.examId
    ) {
      normalizedParams.examId =
        getRecordId(
          normalizedParams.examId
        );
    }

    const response =
      await api.get(
        `${BASE_URL}/workspaces`,
        buildGetConfig(
          normalizedParams,
          config
        )
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Load One Mark Sheet
|--------------------------------------------------------------------------
|
| Required workspace identity:
|   examId
|   classId
|   sectionName
|   subjectId
|
*/

export const getMarkSheet =
  async (
    workspace,
    config = {}
  ) => {
    const params =
      normalizeWorkspaceIdentity(
        workspace
      );

    const response =
      await api.get(
        `${BASE_URL}/sheet`,
        buildGetConfig(
          params,
          config
        )
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Save Mark Sheet
|--------------------------------------------------------------------------
|
| PUT is the primary save operation. It supports full or partial row sets;
| the backend only updates the rows supplied in the request.
|
*/

export const saveMarkSheet =
  async (
    payload,
    config = {}
  ) => {
    const body =
      normalizeSheetPayload(
        payload,
        {
          requireRows:
            true
        }
      );

    const response =
      await api.put(
        `${BASE_URL}/sheet`,
        body,
        config
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Partial Save Alias
|--------------------------------------------------------------------------
|
| PATCH maps to the backend partial-save alias. TeacherMarksEntry may use this
| for autosave or saving only changed student rows.
|
*/

export const patchMarkSheet =
  async (
    payload,
    config = {}
  ) => {
    const body =
      normalizeSheetPayload(
        payload,
        {
          requireRows:
            true
        }
      );

    const response =
      await api.patch(
        `${BASE_URL}/sheet`,
        body,
        config
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Submit Mark Sheet
|--------------------------------------------------------------------------
|
| The backend verifies that every active student has a completed mark record
| before moving the sheet to submitted state.
|
*/

export const submitMarkSheet =
  async (
    workspace,
    config = {}
  ) => {
    const body =
      normalizeWorkspaceIdentity(
        workspace
      );

    const response =
      await api.post(
        `${BASE_URL}/sheet/submit`,
        body,
        config
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Approve Mark Sheet
|--------------------------------------------------------------------------
|
| Principal / Super Admin only.
| reviewRemarks is optional.
|
*/

export const approveMarkSheet =
  async (
    payload,
    config = {}
  ) => {
    const identity =
      normalizeWorkspaceIdentity(
        payload
      );

    const body =
      removeUndefined({
        ...identity,

        reviewRemarks:
          payload?.reviewRemarks
      });

    const response =
      await api.patch(
        `${BASE_URL}/sheet/approve`,
        body,
        config
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Return Mark Sheet for Correction
|--------------------------------------------------------------------------
|
| Principal / Super Admin only.
| returnReason is required by the backend.
|
*/

export const returnMarkSheet =
  async (
    payload,
    config = {}
  ) => {
    const identity =
      normalizeWorkspaceIdentity(
        payload
      );

    const returnReason =
      normalizeText(
        payload?.returnReason
      );

    if (!returnReason) {
      throw new Error(
        "Return reason is required."
      );
    }

    const body = {
      ...identity,
      returnReason
    };

    const response =
      await api.patch(
        `${BASE_URL}/sheet/return`,
        body,
        config
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Principal Exam Marks Review
|--------------------------------------------------------------------------
|
| Returns all saved StudentMark records for an exam grouped into
| class-section-subject sheets with draft / submitted / returned / approved
| progress information.
|
*/

export const getExamMarksReview =
  async (
    examId,
    config = {}
  ) => {
    const id =
      requirePathRecordId(
        examId,
        "Exam"
      );

    const response =
      await api.get(
        `${BASE_URL}/review/${id}`,
        config
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Utility Exports
|--------------------------------------------------------------------------
*/

export const getExamMarkWorkspaceIdentity =
  (
    workspace
  ) => {
    return normalizeWorkspaceIdentity(
      workspace
    );
  };

/*
|--------------------------------------------------------------------------
| Default API Object
|--------------------------------------------------------------------------
*/

const examMarksApi = {
  getMarkWorkspaces,
  getMarkSheet,

  saveMarkSheet,
  patchMarkSheet,
  submitMarkSheet,

  approveMarkSheet,
  returnMarkSheet,

  getExamMarksReview,

  getExamMarkWorkspaceIdentity
};

export default examMarksApi;