import api from "./axios";

/*
|--------------------------------------------------------------------------
| Base Endpoint
|--------------------------------------------------------------------------
*/

const BASE_URL =
  "/timetable-configs";

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

const requireRecordId = (
  value,
  label =
    "Timetable configuration"
) => {
  const recordId =
    typeof value ===
    "object"
      ? value?._id ||
        value?.id
      : value;

  if (!recordId) {
    throw new Error(
      `${label} ID is required.`
    );
  }

  return recordId;
};

const cleanPayload = (
  payload = {}
) => {
  const cleanedPayload = {
    ...payload
  };

  if (
    cleanedPayload.schoolId &&
    typeof cleanedPayload.schoolId ===
      "object"
  ) {
    cleanedPayload.schoolId =
      cleanedPayload.schoolId._id ||
      cleanedPayload.schoolId.id;
  }

  if (
    cleanedPayload.copiedFromConfigId &&
    typeof cleanedPayload.copiedFromConfigId ===
      "object"
  ) {
    cleanedPayload.copiedFromConfigId =
      cleanedPayload
        .copiedFromConfigId
        ._id ||
      cleanedPayload
        .copiedFromConfigId
        .id;
  }

  return cleanedPayload;
};

/*
|--------------------------------------------------------------------------
| Timetable Configuration Collection
|--------------------------------------------------------------------------
*/

/**
 * Load timetable configurations.
 *
 * Supported filters:
 * schoolId, search, status, academicYear, fromDate, toDate,
 * isActive, isLocked, sortBy, sortOrder, page and limit.
 */
export const getTimetableConfigs =
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
 * Create a new timetable configuration.
 */
export const createTimetableConfig =
  async (
    payload
  ) => {
    const response =
      await api.post(
        BASE_URL,
        cleanPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Active Timetable Configuration
|--------------------------------------------------------------------------
*/

/**
 * Load the active published timetable configuration.
 *
 * Super Admin may provide schoolId.
 * Principal and Teacher are automatically scoped by the backend.
 */
export const getActiveTimetableConfig =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        `${BASE_URL}/active`,
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
| Deleted Timetable Configurations
|--------------------------------------------------------------------------
*/

/**
 * Load deleted timetable configurations.
 */
export const getDeletedTimetableConfigs =
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

/*
|--------------------------------------------------------------------------
| Single Timetable Configuration
|--------------------------------------------------------------------------
*/

/**
 * Load timetable configuration details.
 */
export const getTimetableConfigById =
  async (
    timetableConfigId
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
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
 * Update a timetable configuration.
 */
export const updateTimetableConfig =
  async (
    timetableConfigId,
    payload
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
      );

    const response =
      await api.put(
        `${BASE_URL}/${id}`,
        cleanPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Partially update a timetable configuration.
 */
export const patchTimetableConfig =
  async (
    timetableConfigId,
    payload
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
      );

    const response =
      await api.patch(
        `${BASE_URL}/${id}`,
        cleanPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Period Settings
|--------------------------------------------------------------------------
*/

/**
 * Load period settings from the active timetable configuration.
 *
 * Super Admin may provide schoolId.
 */
export const getActivePeriodSettings =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        `${BASE_URL}/period-settings`,
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
 * Load period settings for a specific timetable configuration.
 */
export const getPeriodSettings =
  async (
    timetableConfigId
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
      );

    const response =
      await api.get(
        `${BASE_URL}/${id}/period-settings`
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Replace period settings for a timetable configuration.
 */
export const updatePeriodSettings =
  async (
    timetableConfigId,
    payload
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
      );

    const response =
      await api.put(
        `${BASE_URL}/${id}/period-settings`,
        cleanPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Partially update period settings.
 */
export const patchPeriodSettings =
  async (
    timetableConfigId,
    payload
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
      );

    const response =
      await api.patch(
        `${BASE_URL}/${id}/period-settings`,
        cleanPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Timetable Workflow
|--------------------------------------------------------------------------
*/

/**
 * Publish a timetable configuration.
 *
 * Example payload:
 * {
 *   isActive: true,
 *   lockAfterPublish: true,
 *   publicationNotes: "Approved for Term 1"
 * }
 */
export const publishTimetableConfig =
  async (
    timetableConfigId,
    payload = {}
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
      );

    const response =
      await api.patch(
        `${BASE_URL}/${id}/publish`,
        cleanPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Archive a timetable configuration.
 */
export const archiveTimetableConfig =
  async (
    timetableConfigId,
    payload = {}
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
      );

    const response =
      await api.patch(
        `${BASE_URL}/${id}/archive`,
        cleanPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Return a published or archived timetable to draft.
 */
export const returnTimetableToDraft =
  async (
    timetableConfigId,
    payload = {}
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
      );

    const response =
      await api.patch(
        `${BASE_URL}/${id}/return-to-draft`,
        cleanPayload(
          payload
        )
      );

    return getResponsePayload(
      response
    );
  };

/**
 * Lock or unlock a timetable configuration.
 */
export const setTimetableLock =
  async (
    timetableConfigId,
    isLocked
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
      );

    const response =
      await api.patch(
        `${BASE_URL}/${id}/lock`,
        {
          isLocked:
            Boolean(
              isLocked
            )
        }
      );

    return getResponsePayload(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Clone Timetable
|--------------------------------------------------------------------------
*/

/**
 * Copy a timetable configuration and optionally its timetable entries.
 */
export const cloneTimetableConfig =
  async (
    timetableConfigId,
    payload = {}
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
      );

    const response =
      await api.post(
        `${BASE_URL}/${id}/clone`,
        cleanPayload(
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
 * Soft delete a timetable configuration.
 */
export const deleteTimetableConfig =
  async (
    timetableConfigId
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
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
 * Restore a deleted timetable configuration.
 */
export const restoreTimetableConfig =
  async (
    timetableConfigId
  ) => {
    const id =
      requireRecordId(
        timetableConfigId
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
| Utility Exports
|--------------------------------------------------------------------------
*/

export const getTimetableConfigId =
  (
    timetableConfig
  ) => {
    return requireRecordId(
      timetableConfig
    );
  };

/*
|--------------------------------------------------------------------------
| Default API Object
|--------------------------------------------------------------------------
*/

const timetableConfigsApi = {
  getTimetableConfigs,
  createTimetableConfig,

  getActiveTimetableConfig,

  getDeletedTimetableConfigs,

  getTimetableConfigById,
  updateTimetableConfig,
  patchTimetableConfig,

  getActivePeriodSettings,
  getPeriodSettings,
  updatePeriodSettings,
  patchPeriodSettings,

  publishTimetableConfig,
  archiveTimetableConfig,
  returnTimetableToDraft,
  setTimetableLock,

  cloneTimetableConfig,

  deleteTimetableConfig,
  restoreTimetableConfig,

  getTimetableConfigId
};

export default timetableConfigsApi;
