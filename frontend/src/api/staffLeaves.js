import api from "./axios";

/*
|--------------------------------------------------------------------------
| API Base Path
|--------------------------------------------------------------------------
*/

const STAFF_LEAVES_BASE_URL =
  "/staff-leaves";

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Axios Response Unwrapper
|--------------------------------------------------------------------------
|
| Axios عام طور پر response کو:
|
| {
|   data,
|   status,
|   headers
| }
|
| کی شکل میں واپس کرتا ہے۔ یہ helper صرف اصل backend response واپس کرے گا۔
|
*/

const unwrapResponse = (
  response
) => {
  return (
    response?.data ??
    response
  );
};

/*
|--------------------------------------------------------------------------
| Record Identifier Helper
|--------------------------------------------------------------------------
|
| Function کو string ID یا مکمل MongoDB object دونوں دیے جا سکتے ہیں۔
|
*/

const getRecordId = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "object"
  ) {
    return (
      value._id ||
      value.id ||
      ""
    );
  }

  return String(value);
};

/*
|--------------------------------------------------------------------------
| Required ID Validation
|--------------------------------------------------------------------------
*/

const requireRecordId = (
  value,
  label = "record"
) => {
  const id =
    getRecordId(value);

  if (!id) {
    throw new Error(
      `${label} identifier is required.`
    );
  }

  return id;
};

/*
|--------------------------------------------------------------------------
| Query Parameter Cleaner
|--------------------------------------------------------------------------
|
| Empty strings، null اور undefined values API request میں نہیں جائیں گی۔
| false اور 0 جیسی valid values محفوظ رہیں گی۔
|
*/

const cleanParams = (
  params = {}
) => {
  return Object.entries(
    params || {}
  ).reduce(
    (
      result,
      [
        key,
        value
      ]
    ) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return result;
      }

      if (
        Array.isArray(value)
      ) {
        const cleanedArray =
          value.filter(
            (item) =>
              item !==
                undefined &&
              item !== null &&
              item !== ""
          );

        if (
          cleanedArray.length >
          0
        ) {
          result[key] =
            cleanedArray.join(
              ","
            );
        }

        return result;
      }

      result[key] =
        value;

      return result;
    },
    {}
  );
};

/*
|--------------------------------------------------------------------------
| Leave Payload Cleaner
|--------------------------------------------------------------------------
*/

const cleanLeavePayload = (
  payload = {}
) => {
  const cleanedPayload = {
    ...payload
  };

  /*
  |--------------------------------------------------------------------------
  | Normalize Relationship IDs
  |--------------------------------------------------------------------------
  */

  if (
    cleanedPayload.schoolId
  ) {
    cleanedPayload.schoolId =
      getRecordId(
        cleanedPayload.schoolId
      );
  }

  if (
    cleanedPayload.staffId
  ) {
    cleanedPayload.staffId =
      getRecordId(
        cleanedPayload.staffId
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Normalize Text Fields
  |--------------------------------------------------------------------------
  */

  const textFields = [
    "leaveType",
    "customLeaveType",
    "dayType",
    "halfDaySession",
    "reason",
    "handoverNotes",
    "internalNotes",
    "requestSource",
    "payType"
  ];

  textFields.forEach(
    (fieldName) => {
      if (
        typeof cleanedPayload[
          fieldName
        ] === "string"
      ) {
        cleanedPayload[
          fieldName
        ] =
          cleanedPayload[
            fieldName
          ].trim();
      }
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Normalize Numeric Fields
  |--------------------------------------------------------------------------
  */

  if (
    cleanedPayload.totalDays !==
      undefined &&
    cleanedPayload.totalDays !==
      ""
  ) {
    cleanedPayload.totalDays =
      Number(
        cleanedPayload.totalDays
      );
  }

  if (
    cleanedPayload.payPercentage !==
      undefined &&
    cleanedPayload.payPercentage !==
      ""
  ) {
    cleanedPayload.payPercentage =
      Number(
        cleanedPayload
          .payPercentage
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Normalize Payroll Impact
  |--------------------------------------------------------------------------
  */

  if (
    cleanedPayload
      .payrollImpact &&
    typeof cleanedPayload
      .payrollImpact ===
      "object"
  ) {
    cleanedPayload.payrollImpact = {
      ...cleanedPayload
        .payrollImpact
    };

    if (
      typeof cleanedPayload
        .payrollImpact
        .payType ===
      "string"
    ) {
      cleanedPayload
        .payrollImpact
        .payType =
        cleanedPayload
          .payrollImpact
          .payType.trim();
    }

    if (
      cleanedPayload
        .payrollImpact
        .payPercentage !==
        undefined &&
      cleanedPayload
        .payrollImpact
        .payPercentage !==
        ""
    ) {
      cleanedPayload
        .payrollImpact
        .payPercentage =
        Number(
          cleanedPayload
            .payrollImpact
            .payPercentage
        );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Normalize Leave Balance Snapshot
  |--------------------------------------------------------------------------
  */

  if (
    cleanedPayload
      .balanceSnapshot &&
    typeof cleanedPayload
      .balanceSnapshot ===
      "object"
  ) {
    const balanceSnapshot = {
      ...cleanedPayload
        .balanceSnapshot
    };

    [
      "openingBalance",
      "usedBefore",
      "availableBefore",
      "currentLeaveDays",
      "remainingAfter"
    ].forEach(
      (fieldName) => {
        if (
          balanceSnapshot[
            fieldName
          ] !== undefined &&
          balanceSnapshot[
            fieldName
          ] !== ""
        ) {
          balanceSnapshot[
            fieldName
          ] =
            Number(
              balanceSnapshot[
                fieldName
              ]
            );
        }
      }
    );

    cleanedPayload.balanceSnapshot =
      balanceSnapshot;
  }

  /*
  |--------------------------------------------------------------------------
  | Normalize Emergency Contact
  |--------------------------------------------------------------------------
  */

  if (
    cleanedPayload
      .emergencyContact &&
    typeof cleanedPayload
      .emergencyContact ===
      "object"
  ) {
    cleanedPayload.emergencyContact = {
      name:
        String(
          cleanedPayload
            .emergencyContact
            .name || ""
        ).trim(),

      phone:
        String(
          cleanedPayload
            .emergencyContact
            .phone || ""
        ).trim(),

      relationship:
        String(
          cleanedPayload
            .emergencyContact
            .relationship || ""
        ).trim()
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Normalize Attachments
  |--------------------------------------------------------------------------
  */

  if (
    Array.isArray(
      cleanedPayload.attachments
    )
  ) {
    cleanedPayload.attachments =
      cleanedPayload.attachments
        .map(
          (attachment) => ({
            ...attachment,

            fileName:
              String(
                attachment
                  ?.fileName ||
                ""
              ).trim(),

            fileUrl:
              String(
                attachment
                  ?.fileUrl ||
                ""
              ).trim(),

            fileType:
              String(
                attachment
                  ?.fileType ||
                ""
              ).trim(),

            fileSize:
              Number(
                attachment
                  ?.fileSize ||
                0
              )
          })
        )
        .filter(
          (attachment) =>
            attachment.fileName ||
            attachment.fileUrl
        );
  }

  /*
  |--------------------------------------------------------------------------
  | Half-Day Cleanup
  |--------------------------------------------------------------------------
  */

  if (
    cleanedPayload.dayType ===
    "full_day"
  ) {
    cleanedPayload.halfDaySession =
      null;
  }

  /*
  |--------------------------------------------------------------------------
  | Other Leave Type Cleanup
  |--------------------------------------------------------------------------
  */

  if (
    cleanedPayload.leaveType &&
    cleanedPayload.leaveType !==
      "other"
  ) {
    cleanedPayload.customLeaveType =
      "";
  }

  return cleanedPayload;
};

/*
|--------------------------------------------------------------------------
| Reason Payload Normalizer
|--------------------------------------------------------------------------
|
| Rejection یا cancellation function میں string یا object دونوں قبول ہوں گے۔
|
| Example:
|
| rejectStaffLeave(id, "Insufficient balance")
|
| یا:
|
| rejectStaffLeave(id, {
|   rejectionReason: "Insufficient balance"
| })
|
*/

const normalizeReasonPayload = (
  value,
  fieldName
) => {
  if (
    typeof value ===
    "string"
  ) {
    return {
      [fieldName]:
        value.trim()
    };
  }

  if (
    value &&
    typeof value ===
    "object"
  ) {
    const payload = {
      ...value
    };

    if (
      typeof payload[
        fieldName
      ] === "string"
    ) {
      payload[fieldName] =
        payload[
          fieldName
        ].trim();
    }

    return payload;
  }

  return {
    [fieldName]: ""
  };
};

/*
|--------------------------------------------------------------------------
| Get Active Staff Leave Requests
|--------------------------------------------------------------------------
|
| Supported filters:
|
| schoolId
| search
| staffId
| leaveType
| status
| dayType
| department
| leaveYear
| payType
| fromDate
| toDate
| page
| limit
| sortBy
| sortOrder
|
*/

export const getStaffLeaves =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        STAFF_LEAVES_BASE_URL,
        {
          params:
            cleanParams(
              params
            )
        }
      );

    return unwrapResponse(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Get Staff Leave by ID
|--------------------------------------------------------------------------
*/

export const getStaffLeaveById =
  async (
    leaveId
  ) => {
    const id =
      requireRecordId(
        leaveId,
        "Leave"
      );

    const response =
      await api.get(
        `${STAFF_LEAVES_BASE_URL}/${id}`
      );

    return unwrapResponse(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Create Staff Leave Request
|--------------------------------------------------------------------------
*/

export const createStaffLeave =
  async (
    payload
  ) => {
    if (
      !payload ||
      typeof payload !==
        "object"
    ) {
      throw new Error(
        "Staff leave payload is required."
      );
    }

    const response =
      await api.post(
        STAFF_LEAVES_BASE_URL,
        cleanLeavePayload(
          payload
        )
      );

    return unwrapResponse(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Update Staff Leave Request
|--------------------------------------------------------------------------
|
| صرف pending یا rejected leave request backend پر update ہوگی۔
|
*/

export const updateStaffLeave =
  async (
    leaveId,
    payload
  ) => {
    const id =
      requireRecordId(
        leaveId,
        "Leave"
      );

    if (
      !payload ||
      typeof payload !==
        "object"
    ) {
      throw new Error(
        "Staff leave update payload is required."
      );
    }

    const response =
      await api.put(
        `${STAFF_LEAVES_BASE_URL}/${id}`,
        cleanLeavePayload(
          payload
        )
      );

    return unwrapResponse(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Approve Staff Leave
|--------------------------------------------------------------------------
|
| Example payload:
|
| {
|   approvalNotes: "Approved by principal.",
|   payType: "paid",
|   payPercentage: 100,
|   balanceSnapshot: {
|     openingBalance: 12,
|     usedBefore: 3,
|     availableBefore: 9,
|     currentLeaveDays: 2,
|     remainingAfter: 7
|   }
| }
|
*/

export const approveStaffLeave =
  async (
    leaveId,
    payload = {}
  ) => {
    const id =
      requireRecordId(
        leaveId,
        "Leave"
      );

    const approvalPayload =
      cleanLeavePayload(
        payload || {}
      );

    const response =
      await api.patch(
        `${STAFF_LEAVES_BASE_URL}/${id}/approve`,
        approvalPayload
      );

    return unwrapResponse(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Reject Staff Leave
|--------------------------------------------------------------------------
*/

export const rejectStaffLeave =
  async (
    leaveId,
    reasonOrPayload
  ) => {
    const id =
      requireRecordId(
        leaveId,
        "Leave"
      );

    const payload =
      normalizeReasonPayload(
        reasonOrPayload,
        "rejectionReason"
      );

    const response =
      await api.patch(
        `${STAFF_LEAVES_BASE_URL}/${id}/reject`,
        payload
      );

    return unwrapResponse(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Cancel Staff Leave
|--------------------------------------------------------------------------
*/

export const cancelStaffLeave =
  async (
    leaveId,
    reasonOrPayload
  ) => {
    const id =
      requireRecordId(
        leaveId,
        "Leave"
      );

    const payload =
      normalizeReasonPayload(
        reasonOrPayload,
        "cancellationReason"
      );

    const response =
      await api.patch(
        `${STAFF_LEAVES_BASE_URL}/${id}/cancel`,
        payload
      );

    return unwrapResponse(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Delete Staff Leave
|--------------------------------------------------------------------------
|
| Backend record کو permanently remove نہیں کرے گا بلکہ soft delete کرے گا۔
|
*/

export const deleteStaffLeave =
  async (
    leaveId
  ) => {
    const id =
      requireRecordId(
        leaveId,
        "Leave"
      );

    const response =
      await api.delete(
        `${STAFF_LEAVES_BASE_URL}/${id}`
      );

    return unwrapResponse(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Staff Leave Requests
|--------------------------------------------------------------------------
*/

export const getDeletedStaffLeaves =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        `${STAFF_LEAVES_BASE_URL}/deleted`,
        {
          params:
            cleanParams(
              params
            )
        }
      );

    return unwrapResponse(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Restore Deleted Staff Leave
|--------------------------------------------------------------------------
*/

export const restoreStaffLeave =
  async (
    leaveId
  ) => {
    const id =
      requireRecordId(
        leaveId,
        "Leave"
      );

    const response =
      await api.patch(
        `${STAFF_LEAVES_BASE_URL}/${id}/restore`
      );

    return unwrapResponse(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Get Staff Leave Report
|--------------------------------------------------------------------------
|
| Supported report filters:
|
| schoolId
| staffId
| leaveYear
| fromDate
| toDate
| leaveType
| status
| department
| payType
|
*/

export const getStaffLeaveReport =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        `${STAFF_LEAVES_BASE_URL}/report`,
        {
          params:
            cleanParams(
              params
            )
        }
      );

    return unwrapResponse(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| Default API Export
|--------------------------------------------------------------------------
*/

const staffLeavesApi = {
  getStaffLeaves,
  getStaffLeaveById,

  createStaffLeave,
  updateStaffLeave,

  approveStaffLeave,
  rejectStaffLeave,
  cancelStaffLeave,

  deleteStaffLeave,
  getDeletedStaffLeaves,
  restoreStaffLeave,

  getStaffLeaveReport
};

export default staffLeavesApi;