import api from "./axios";

/*
|--------------------------------------------------------------------------
| Base Endpoint
|--------------------------------------------------------------------------
*/

const BASE_URL =
  "/timetables";

/*
|--------------------------------------------------------------------------
| Response Helpers
|--------------------------------------------------------------------------
*/

const getResponsePayload = (
  response
) => {
  return response?.data ?? response;
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
  label =
    "Timetable entry"
) => {
  const recordId =
    getRecordId(
      value
    );

  if (!recordId) {
    throw new Error(
      `${label} ID is required.`
    );
  }

  return recordId;
};

/*
|--------------------------------------------------------------------------
| Payload Cleaning
|--------------------------------------------------------------------------
*/

const ID_FIELDS = [
  "schoolId",
  "timetableConfigId",
  "classId",
  "subjectId",
  "teacherId",
  "periodId",
  "roomId",
  "copiedFromEntryId",
  "createdBy",
  "updatedBy"
];

const cleanTimetableEntryPayload =
  (
    payload = {}
  ) => {
    const cleanedPayload = {
      ...payload
    };

    ID_FIELDS.forEach(
      (field) => {
        if (
          cleanedPayload[field] !==
          undefined
        ) {
          const recordId =
            getRecordId(
              cleanedPayload[field]
            );

          cleanedPayload[field] =
            recordId ||
            cleanedPayload[field];
        }
      }
    );

    if (
      cleanedPayload.room &&
      typeof cleanedPayload.room ===
        "object"
    ) {
      cleanedPayload.room = {
        ...cleanedPayload.room
      };

      if (
        cleanedPayload.room._id ||
        cleanedPayload.room.id
      ) {
        cleanedPayload.roomId =
          cleanedPayload.room._id ||
          cleanedPayload.room.id;
      }
    }

    if (
      cleanedPayload.class &&
      typeof cleanedPayload.class ===
        "object" &&
      !cleanedPayload.classId
    ) {
      cleanedPayload.classId =
        getRecordId(
          cleanedPayload.class
        );

      delete cleanedPayload.class;
    }

    if (
      cleanedPayload.subject &&
      typeof cleanedPayload.subject ===
        "object" &&
      !cleanedPayload.subjectId
    ) {
      cleanedPayload.subjectId =
        getRecordId(
          cleanedPayload.subject
        );

      delete cleanedPayload.subject;
    }

    if (
      cleanedPayload.teacher &&
      typeof cleanedPayload.teacher ===
        "object" &&
      !cleanedPayload.teacherId
    ) {
      cleanedPayload.teacherId =
        getRecordId(
          cleanedPayload.teacher
        );

      delete cleanedPayload.teacher;
    }

    if (
      cleanedPayload.timetableConfig &&
      typeof cleanedPayload
        .timetableConfig ===
        "object" &&
      !cleanedPayload
        .timetableConfigId
    ) {
      cleanedPayload
        .timetableConfigId =
        getRecordId(
          cleanedPayload
            .timetableConfig
        );

      delete cleanedPayload
        .timetableConfig;
    }

    return cleanedPayload;
  };

const cleanBulkPayload =
  (
    payload = {}
  ) => {
    const cleanedPayload = {
      ...payload
    };

    if (
      cleanedPayload.timetableConfigId !==
      undefined
    ) {
      cleanedPayload
        .timetableConfigId =
        getRecordId(
          cleanedPayload
            .timetableConfigId
        );
    }

    if (
      cleanedPayload.schoolId !==
      undefined
    ) {
      cleanedPayload.schoolId =
        getRecordId(
          cleanedPayload.schoolId
        );
    }

    if (
      Array.isArray(
        cleanedPayload.entries
      )
    ) {
      cleanedPayload.entries =
        cleanedPayload.entries.map(
          (
            entry
          ) =>
            cleanTimetableEntryPayload({
              ...entry,

              timetableConfigId:
                entry
                  .timetableConfigId ||
                cleanedPayload
                  .timetableConfigId,

              schoolId:
                entry.schoolId ||
                cleanedPayload
                  .schoolId
            })
        );
    }

    return cleanedPayload;
  };

/*
|--------------------------------------------------------------------------
| Timetable Builder
|--------------------------------------------------------------------------
*/

/**
 * Load everything needed by the Timetable Builder.
 *
 * Supported query parameters may include:
 * timetableConfigId, schoolId, rotationWeekCode and classId.
 */
export const getTimetableBuilderData =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        `${BASE_URL}/builder-data`,
        {
          params:
            cleanParams(
              params
            )
        }
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Validate a timetable slot before saving it.
 *
 * The backend checks class, teacher, room, period and workload conflicts.
 */
export const validateTimetableSlot =
  async (
    payload
  ) => {
    const response =
      await api.post(
        `${BASE_URL}/validate-slot`,
        cleanTimetableEntryPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Create multiple timetable entries in one request.
 */
export const createTimetableEntriesBulk =
  async (
    payload
  ) => {
    const response =
      await api.post(
        `${BASE_URL}/bulk`,
        cleanBulkPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Timetable Entry Collection
|--------------------------------------------------------------------------
*/

/**
 * Load timetable entries.
 *
 * Supported filters may include:
 * schoolId, timetableConfigId, classId, subjectId, teacherId,
 * day, rotationWeekCode, sectionName, entryStatus, entryType,
 * deliveryMode, room, search, isActive, page, limit, sortBy and sortOrder.
 */
export const getTimetableEntries =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        BASE_URL,
        {
          params:
            cleanParams(
              params
            )
        }
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Create a single timetable entry.
 */
export const createTimetableEntry =
  async (
    payload
  ) => {
    const response =
      await api.post(
        BASE_URL,
        cleanTimetableEntryPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Individual Timetable Entry
|--------------------------------------------------------------------------
*/

/**
 * Load one timetable entry.
 */
export const getTimetableEntryById =
  async (
    timetableEntryId
  ) => {
    const id =
      requireRecordId(
        timetableEntryId
      );

    const response =
      await api.get(
        `${BASE_URL}/${id}`
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Replace or fully update a timetable entry.
 */
export const updateTimetableEntry =
  async (
    timetableEntryId,
    payload
  ) => {
    const id =
      requireRecordId(
        timetableEntryId
      );

    const response =
      await api.put(
        `${BASE_URL}/${id}`,
        cleanTimetableEntryPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Partially update a timetable entry.
 */
export const patchTimetableEntry =
  async (
    timetableEntryId,
    payload
  ) => {
    const id =
      requireRecordId(
        timetableEntryId
      );

    const response =
      await api.patch(
        `${BASE_URL}/${id}`,
        cleanTimetableEntryPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Timetable Entry Workflow
|--------------------------------------------------------------------------
*/

/**
 * Cancel a timetable entry.
 *
 * The second argument may be a reason string or a complete payload object.
 */
export const cancelTimetableEntry =
  async (
    timetableEntryId,
    reasonOrPayload = {}
  ) => {
    const id =
      requireRecordId(
        timetableEntryId
      );

    const payload =
      typeof reasonOrPayload ===
      "string"
        ? {
            reason:
              reasonOrPayload
          }
        : {
            ...reasonOrPayload
          };

    const response =
      await api.patch(
        `${BASE_URL}/${id}/cancel`,
        payload
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Reactivate a cancelled timetable entry.
 */
export const reactivateTimetableEntry =
  async (
    timetableEntryId,
    payload = {}
  ) => {
    const id =
      requireRecordId(
        timetableEntryId
      );

    const response =
      await api.patch(
        `${BASE_URL}/${id}/reactivate`,
        cleanTimetableEntryPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Soft Delete and Restore
|--------------------------------------------------------------------------
*/

/**
 * Soft delete a timetable entry.
 */
export const deleteTimetableEntry =
  async (
    timetableEntryId
  ) => {
    const id =
      requireRecordId(
        timetableEntryId
      );

    const response =
      await api.delete(
        `${BASE_URL}/${id}`
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Load deleted timetable entries.
 */
export const getDeletedTimetableEntries =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        `${BASE_URL}/deleted`,
        {
          params:
            cleanParams(
              params
            )
        }
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Restore a deleted timetable entry.
 */
export const restoreTimetableEntry =
  async (
    timetableEntryId
  ) => {
    const id =
      requireRecordId(
        timetableEntryId
      );

    const response =
      await api.patch(
        `${BASE_URL}/${id}/restore`
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Class Timetable
|--------------------------------------------------------------------------
*/

/**
 * Load a class timetable.
 *
 * classId may be passed as the first argument or inside params.classId.
 */
export const getClassTimetable =
  async (
    classId,
    params = {}
  ) => {
    const resolvedClassId =
      getRecordId(
        classId
      ) ||
      getRecordId(
        params.classId
      );

    const cleanedParams = {
      ...params
    };

    delete cleanedParams.classId;

    const endpoint =
      resolvedClassId
        ? `${BASE_URL}/class/${resolvedClassId}`
        : `${BASE_URL}/class`;

    const response =
      await api.get(
        endpoint,
        {
          params:
            cleanParams(
              resolvedClassId
                ? cleanedParams
                : params
            )
        }
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Teacher Timetable
|--------------------------------------------------------------------------
*/

/**
 * Load a teacher timetable.
 *
 * teacherId may be passed as the first argument or inside params.teacherId.
 */
export const getTeacherTimetable =
  async (
    teacherId,
    params = {}
  ) => {
    const resolvedTeacherId =
      getRecordId(
        teacherId
      ) ||
      getRecordId(
        params.teacherId
      );

    const cleanedParams = {
      ...params
    };

    delete cleanedParams.teacherId;

    const endpoint =
      resolvedTeacherId
        ? `${BASE_URL}/teacher/${resolvedTeacherId}`
        : `${BASE_URL}/teacher`;

    const response =
      await api.get(
        endpoint,
        {
          params:
            cleanParams(
              resolvedTeacherId
                ? cleanedParams
                : params
            )
        }
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Complete School Timetable
|--------------------------------------------------------------------------
*/

/**
 * Load the full school timetable.
 *
 * Supported query parameters may include:
 * timetableConfigId, schoolId, rotationWeekCode and day.
 */
export const getSchoolTimetable =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        `${BASE_URL}/school`,
        {
          params:
            cleanParams(
              params
            )
        }
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Timetable Reporting
|--------------------------------------------------------------------------
*/

/**
 * Load timetable reporting and workload information.
 *
 * Supported query parameters may include:
 * timetableConfigId, schoolId, rotationWeekCode and entryStatus.
 */
export const getTimetableReport =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        `${BASE_URL}/report`,
        {
          params:
            cleanParams(
              params
            )
        }
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

export const getTimetableEntryId =
  (
    timetableEntry
  ) => {
    return requireRecordId(
      timetableEntry
    );
  };

/*
|--------------------------------------------------------------------------
| Default API Object
|--------------------------------------------------------------------------
*/

const timetablesApi = {
  getTimetableBuilderData,
  validateTimetableSlot,
  createTimetableEntriesBulk,

  getTimetableEntries,
  createTimetableEntry,

  getTimetableEntryById,
  updateTimetableEntry,
  patchTimetableEntry,

  cancelTimetableEntry,
  reactivateTimetableEntry,

  deleteTimetableEntry,
  getDeletedTimetableEntries,
  restoreTimetableEntry,

  getClassTimetable,
  getTeacherTimetable,
  getSchoolTimetable,
  getTimetableReport,

  getTimetableEntryId
};

export default timetablesApi;
