const mongoose = require("mongoose");

const StaffLeave = require("../models/StaffLeave");
const Staff = require("../models/Staff");
const StaffAttendance = require("../models/StaffAttendance");

/*
|--------------------------------------------------------------------------
| Optional Audit Log Helper
|--------------------------------------------------------------------------
|
| Audit helper موجود نہ ہونے کی صورت میں controller crash نہیں کرے گا۔
|
*/

let auditLogHelper = null;

try {
  auditLogHelper = require(
    "../utils/auditLogHelper"
  );
} catch (error) {
  auditLogHelper = null;
}

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const createHttpError = (
  statusCode,
  message
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

const sendControllerError = (
  res,
  error,
  fallbackMessage
) => {
  console.error(
    fallbackMessage,
    error
  );

  if (
    error?.code === 11000
  ) {
    return res.status(409).json({
      success: false,
      message:
        "A leave record with the same unique information already exists."
    });
  }

  if (
    error?.name ===
    "ValidationError"
  ) {
    const validationMessages =
      Object.values(
        error.errors || {}
      )
        .map(
          (item) =>
            item.message
        )
        .filter(Boolean);

    return res.status(400).json({
      success: false,

      message:
        validationMessages[0] ||
        "Leave validation failed.",

      errors:
        validationMessages
    });
  }

  if (
    error?.name ===
    "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid record identifier."
    });
  }

  return res
    .status(
      error?.statusCode ||
      500
    )
    .json({
      success: false,

      message:
        error?.message ||
        fallbackMessage
    });
};

const getUserId = (
  req
) => {
  return (
    req.user?._id ||
    req.user?.id ||
    null
  );
};

const getUserRole = (
  req
) => {
  return String(
    req.user?.role || ""
  ).toLowerCase();
};

const getObjectIdValue = (
  value
) => {
  if (!value) {
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

const isValidObjectId = (
  value
) => {
  return mongoose.Types.ObjectId.isValid(
    String(value || "")
  );
};

const validateObjectId = (
  value,
  fieldName
) => {
  if (
    !isValidObjectId(value)
  ) {
    throw createHttpError(
      400,
      `Invalid ${fieldName}.`
    );
  }
};

const cleanString = (
  value,
  fallback = ""
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  return String(value).trim();
};

const safeNumber = (
  value,
  fallback = 0
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
};

const nonNegativeNumber = (
  value,
  fallback = 0
) => {
  return Math.max(
    0,
    safeNumber(
      value,
      fallback
    )
  );
};

const escapeRegex = (
  value
) => {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
};

const normalizeDate = (
  value,
  fieldName = "date"
) => {
  if (!value) {
    throw createHttpError(
      400,
      `${fieldName} is required.`
    );
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw createHttpError(
      400,
      `Invalid ${fieldName}.`
    );
  }

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
};

const endOfDay = (
  value
) => {
  const date =
    new Date(value);

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date;
};

const parseCommaSeparated = (
  value
) => {
  if (!value) {
    return [];
  }

  if (
    Array.isArray(value)
  ) {
    return value
      .map(cleanString)
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map(cleanString)
    .filter(Boolean);
};

/*
|--------------------------------------------------------------------------
| School Scope Helpers
|--------------------------------------------------------------------------
*/

const getUserAssignedSchoolId = (
  req
) => {
  return (
    getObjectIdValue(
      req.user?.schoolId
    ) ||
    getObjectIdValue(
      req.user?.school
    ) ||
    getObjectIdValue(
      req.schoolId
    ) ||
    getObjectIdValue(
      req.schoolFilter
        ?.schoolId
    ) ||
    null
  );
};

const getRequestedSchoolId = (
  req
) => {
  return (
    getObjectIdValue(
      req.body?.schoolId
    ) ||
    getObjectIdValue(
      req.query?.schoolId
    ) ||
    getObjectIdValue(
      req.params?.schoolId
    ) ||
    null
  );
};

const resolveSchoolId = (
  req,
  {
    required = true
  } = {}
) => {
  const role =
    getUserRole(req);

  let schoolId = null;

  if (
    role === "super_admin"
  ) {
    schoolId =
      getRequestedSchoolId(
        req
      );
  } else {
    schoolId =
      getUserAssignedSchoolId(
        req
      );
  }

  if (
    required &&
    !schoolId
  ) {
    throw createHttpError(
      403,
      role === "super_admin"
        ? "Please select a school."
        : "No school is assigned to this user."
    );
  }

  if (
    schoolId &&
    !isValidObjectId(
      schoolId
    )
  ) {
    throw createHttpError(
      400,
      "Invalid school identifier."
    );
  }

  return schoolId;
};

const ensureRecordSchoolAccess = (
  req,
  recordSchoolId
) => {
  const role =
    getUserRole(req);

  if (
    role === "super_admin"
  ) {
    return;
  }

  const assignedSchoolId =
    getUserAssignedSchoolId(
      req
    );

  if (
    !assignedSchoolId ||
    String(
      assignedSchoolId
    ) !==
      String(
        getObjectIdValue(
          recordSchoolId
        )
      )
  ) {
    throw createHttpError(
      403,
      "You do not have access to this leave record."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Audit Logging
|--------------------------------------------------------------------------
*/

const writeAuditLog =
  async ({
    req,
    action,
    recordId,
    description,
    oldData = null,
    newData = null
  }) => {
    if (!auditLogHelper) {
      return;
    }

    const auditFunction =
      typeof auditLogHelper ===
      "function"
        ? auditLogHelper
        : (
            auditLogHelper
              .createAuditLog ||
            auditLogHelper
              .logAudit ||
            auditLogHelper
              .logAuditAction ||
            auditLogHelper
              .createLog
          );

    if (
      typeof auditFunction !==
      "function"
    ) {
      return;
    }

    try {
      await auditFunction({
        req,

        userId:
          getUserId(req),

        schoolId:
          resolveSchoolId(
            req,
            {
              required: false
            }
          ),

        module:
          "STAFF_LEAVE",

        action,

        recordId,

        description,

        oldData,
        newData
      });
    } catch (auditError) {
      console.error(
        "Staff leave audit log error:",
        auditError.message
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Population Helper
|--------------------------------------------------------------------------
*/

const populateStaffLeaveQuery = (
  query
) => {
  return query
    .populate({
      path: "schoolId",

      select:
        "schoolName schoolCode name code logo phone email address isActive status"
    })
    .populate({
      path: "staffId",

      select:
        "name employeeId department designation category phone email photo status isDeleted schoolId"
    })
    .populate({
      path: "requestedBy",

      select:
        "name email role"
    })
    .populate({
      path: "approvedBy",

      select:
        "name email role"
    })
    .populate({
      path: "rejectedBy",

      select:
        "name email role"
    })
    .populate({
      path: "cancelledBy",

      select:
        "name email role"
    })
    .populate({
      path: "createdBy",

      select:
        "name email role"
    })
    .populate({
      path: "updatedBy",

      select:
        "name email role"
    })
    .populate({
      path: "deletedBy",

      select:
        "name email role"
    })
    .populate({
      path:
        "attendanceSync.syncedBy",

      select:
        "name email role"
    })
    .populate({
      path:
        "payrollImpact.processedBy",

      select:
        "name email role"
    })
    .populate({
      path:
        "payrollImpact.payrollId",

      select:
        "payrollNumber payslipNumber payrollMonth payrollYear status netSalary"
    });
};

/*
|--------------------------------------------------------------------------
| Staff Verification
|--------------------------------------------------------------------------
*/

const getVerifiedStaff =
  async ({
    staffId,
    schoolId
  }) => {
    validateObjectId(
      staffId,
      "staff identifier"
    );

    const staff =
      await Staff.findOne({
        _id: staffId,
        isDeleted: {
          $ne: true
        }
      });

    if (!staff) {
      throw createHttpError(
        404,
        "Staff member was not found."
      );
    }

    const staffSchoolId =
      getObjectIdValue(
        staff.schoolId ||
        staff.school
      );

    if (
      staffSchoolId &&
      String(
        staffSchoolId
      ) !== String(schoolId)
    ) {
      throw createHttpError(
        400,
        "The selected staff member does not belong to the selected school."
      );
    }

    const staffStatus =
      String(
        staff.status ||
        "active"
      ).toLowerCase();

    if (
      ![
        "active",
        "on_leave"
      ].includes(
        staffStatus
      )
    ) {
      throw createHttpError(
        400,
        "Leave can only be created for active or on-leave staff members."
      );
    }

    return staff;
  };

/*
|--------------------------------------------------------------------------
| Staff Snapshot
|--------------------------------------------------------------------------
*/

const createStaffSnapshot = (
  staff
) => {
  return {
    employeeIdSnapshot:
      cleanString(
        staff.employeeId
      ),

    staffNameSnapshot:
      cleanString(
        staff.name
      ),

    departmentSnapshot:
      cleanString(
        staff.department
      ),

    designationSnapshot:
      cleanString(
        staff.designation
      )
  };
};

/*
|--------------------------------------------------------------------------
| Leave Application Number
|--------------------------------------------------------------------------
*/

const generateApplicationNumber =
  async (
    schoolId,
    leaveYear
  ) => {
    const year =
      Number(leaveYear) ||
      new Date().getFullYear();

    const existingCount =
      await StaffLeave.countDocuments({
        schoolId,
        leaveYear: year
      });

    let sequence =
      existingCount + 1;

    let applicationNumber =
      "";

    let alreadyExists =
      true;

    while (alreadyExists) {
      applicationNumber =
        `LV-${year}-${String(
          sequence
        ).padStart(4, "0")}`;

      alreadyExists =
        await StaffLeave.exists({
          schoolId,
          applicationNumber
        });

      sequence += 1;
    }

    return applicationNumber;
  };

/*
|--------------------------------------------------------------------------
| Leave Duration
|--------------------------------------------------------------------------
*/

const calculateCalendarDays = (
  startDate,
  endDate,
  dayType
) => {
  if (
    dayType ===
    "half_day"
  ) {
    return 0.5;
  }

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return (
    Math.floor(
      (
        endDate.getTime() -
        startDate.getTime()
      ) /
        millisecondsPerDay
    ) + 1
  );
};

/*
|--------------------------------------------------------------------------
| Leave Payload Builder
|--------------------------------------------------------------------------
*/

const buildLeavePayload = (
  body,
  {
    existingLeave = null
  } = {}
) => {
  const payload = {};

  const hasField = (
    fieldName
  ) => {
    return Object.prototype
      .hasOwnProperty.call(
        body,
        fieldName
      );
  };

  if (
    hasField("leaveType")
  ) {
    payload.leaveType =
      cleanString(
        body.leaveType
      ).toLowerCase();
  }

  if (
    hasField(
      "customLeaveType"
    )
  ) {
    payload.customLeaveType =
      cleanString(
        body.customLeaveType
      );
  }

  if (
    hasField("dayType")
  ) {
    payload.dayType =
      cleanString(
        body.dayType
      ).toLowerCase();
  }

  if (
    hasField(
      "halfDaySession"
    )
  ) {
    payload.halfDaySession =
      body.halfDaySession
        ? cleanString(
            body.halfDaySession
          ).toLowerCase()
        : null;
  }

  if (
    hasField("startDate")
  ) {
    payload.startDate =
      normalizeDate(
        body.startDate,
        "leave start date"
      );
  }

  if (
    hasField("endDate")
  ) {
    payload.endDate =
      normalizeDate(
        body.endDate,
        "leave end date"
      );
  }

  const resolvedStartDate =
    payload.startDate ||
    existingLeave?.startDate;

  const resolvedEndDate =
    payload.endDate ||
    existingLeave?.endDate;

  const resolvedDayType =
    payload.dayType ||
    existingLeave?.dayType ||
    "full_day";

  if (
    resolvedStartDate &&
    resolvedEndDate
  ) {
    if (
      resolvedEndDate <
      resolvedStartDate
    ) {
      throw createHttpError(
        400,
        "Leave end date cannot be earlier than the start date."
      );
    }

    const calculatedDays =
      calculateCalendarDays(
        new Date(
          resolvedStartDate
        ),
        new Date(
          resolvedEndDate
        ),
        resolvedDayType
      );

    payload.calendarDays =
      calculatedDays;

    if (
      hasField("totalDays")
    ) {
      const totalDays =
        safeNumber(
          body.totalDays
        );

      if (
        totalDays < 0.5 ||
        (
          totalDays * 2
        ) % 1 !== 0
      ) {
        throw createHttpError(
          400,
          "Total leave days must be in full-day or half-day increments."
        );
      }

      payload.totalDays =
        totalDays;
    } else {
      payload.totalDays =
        calculatedDays;
    }
  }

  if (
    hasField("reason")
  ) {
    payload.reason =
      cleanString(
        body.reason
      );
  }

  if (
    hasField(
      "handoverNotes"
    )
  ) {
    payload.handoverNotes =
      cleanString(
        body.handoverNotes
      );
  }

  if (
    hasField(
      "internalNotes"
    )
  ) {
    payload.internalNotes =
      cleanString(
        body.internalNotes
      );
  }

  if (
    hasField(
      "requestSource"
    )
  ) {
    payload.requestSource =
      cleanString(
        body.requestSource
      ).toLowerCase();
  }

  if (
    hasField(
      "emergencyContact"
    )
  ) {
    payload.emergencyContact = {
      name:
        cleanString(
          body.emergencyContact
            ?.name
        ),

      phone:
        cleanString(
          body.emergencyContact
            ?.phone
        ),

      relationship:
        cleanString(
          body.emergencyContact
            ?.relationship
        )
    };
  }

  if (
    hasField("attachments")
  ) {
    payload.attachments =
      Array.isArray(
        body.attachments
      )
        ? body.attachments
            .map(
              (attachment) => ({
                fileName:
                  cleanString(
                    attachment
                      ?.fileName
                  ),

                fileUrl:
                  cleanString(
                    attachment
                      ?.fileUrl
                  ),

                fileType:
                  cleanString(
                    attachment
                      ?.fileType
                  ),

                fileSize:
                  nonNegativeNumber(
                    attachment
                      ?.fileSize
                  ),

                uploadedBy:
                  attachment
                    ?.uploadedBy ||
                  null,

                uploadedAt:
                  attachment
                    ?.uploadedAt ||
                  new Date()
              })
            )
            .filter(
              (attachment) =>
                attachment.fileUrl ||
                attachment.fileName
            )
        : [];
  }

  if (
    hasField(
      "balanceSnapshot"
    )
  ) {
    payload.balanceSnapshot = {
      openingBalance:
        nonNegativeNumber(
          body.balanceSnapshot
            ?.openingBalance
        ),

      usedBefore:
        nonNegativeNumber(
          body.balanceSnapshot
            ?.usedBefore
        ),

      availableBefore:
        nonNegativeNumber(
          body.balanceSnapshot
            ?.availableBefore
        ),

      currentLeaveDays:
        nonNegativeNumber(
          body.balanceSnapshot
            ?.currentLeaveDays
        ),

      remainingAfter:
        nonNegativeNumber(
          body.balanceSnapshot
            ?.remainingAfter
        )
    };
  }

  const payrollImpactSource =
    body.payrollImpact ||
    {};

  const payrollImpactProvided =
    hasField(
      "payrollImpact"
    ) ||
    hasField("payType") ||
    hasField(
      "payPercentage"
    );

  if (
    payrollImpactProvided
  ) {
    const payType =
      cleanString(
        body.payType ||
        payrollImpactSource
          .payType ||
        existingLeave
          ?.payrollImpact
          ?.payType ||
        "paid"
      ).toLowerCase();

    let payPercentage =
      safeNumber(
        body.payPercentage ??
        payrollImpactSource
          .payPercentage ??
        existingLeave
          ?.payrollImpact
          ?.payPercentage ??
        100
      );

    if (
      payType === "paid"
    ) {
      payPercentage = 100;
    }

    if (
      payType === "unpaid"
    ) {
      payPercentage = 0;
    }

    if (
      payType ===
        "partial_paid" &&
      (
        payPercentage <= 0 ||
        payPercentage >= 100
      )
    ) {
      throw createHttpError(
        400,
        "Partially paid leave percentage must be greater than 0 and less than 100."
      );
    }

    payload.payrollImpact = {
      ...(existingLeave
        ?.payrollImpact
        ?.toObject
        ? existingLeave
            .payrollImpact
            .toObject()
        : existingLeave
            ?.payrollImpact ||
          {}),

      payType,
      payPercentage
    };
  }

  const finalLeaveType =
    payload.leaveType ||
    existingLeave?.leaveType;

  if (
    finalLeaveType ===
    "unpaid"
  ) {
    payload.payrollImpact = {
      ...(existingLeave
        ?.payrollImpact
        ?.toObject
        ? existingLeave
            .payrollImpact
            .toObject()
        : existingLeave
            ?.payrollImpact ||
          {}),

      ...(payload.payrollImpact ||
        {}),

      payType: "unpaid",
      payPercentage: 0
    };
  }

  return payload;
};

/*
|--------------------------------------------------------------------------
| Overlapping Leave Check
|--------------------------------------------------------------------------
*/

const findOverlappingLeave =
  async ({
    schoolId,
    staffId,
    startDate,
    endDate,
    dayType,
    halfDaySession,
    excludeLeaveId = null
  }) => {
    const filter = {
      schoolId,
      staffId,

      isDeleted: false,

      status: {
        $in: [
          "pending",
          "approved"
        ]
      },

      startDate: {
        $lte: endDate
      },

      endDate: {
        $gte: startDate
      }
    };

    if (excludeLeaveId) {
      filter._id = {
        $ne: excludeLeaveId
      };
    }

    const possibleOverlaps =
      await StaffLeave.find(
        filter
      )
        .select(
          "_id applicationNumber startDate endDate dayType halfDaySession status"
        )
        .lean();

    if (
      possibleOverlaps.length ===
      0
    ) {
      return null;
    }

    for (
      const existingLeave of
      possibleOverlaps
    ) {
      if (
        dayType ===
        "full_day"
      ) {
        return existingLeave;
      }

      if (
        existingLeave.dayType ===
        "full_day"
      ) {
        return existingLeave;
      }

      const sameDate =
        new Date(
          existingLeave.startDate
        ).getTime() ===
        new Date(
          startDate
        ).getTime();

      const sameSession =
        existingLeave
          .halfDaySession ===
        halfDaySession;

      if (
        sameDate &&
        sameSession
      ) {
        return existingLeave;
      }
    }

    return null;
  };

/*
|--------------------------------------------------------------------------
| Attendance Schema Helpers
|--------------------------------------------------------------------------
*/

const attendanceHasPath = (
  pathName
) => {
  return Boolean(
    StaffAttendance.schema.path(
      pathName
    )
  );
};

const getAttendanceEnumValues = (
  pathName
) => {
  return (
    StaffAttendance.schema.path(
      pathName
    )?.enumValues ||
    []
  );
};

const chooseAttendanceStatus = (
  leave
) => {
  const statusValues =
    getAttendanceEnumValues(
      "status"
    );

  const preferredStatuses =
    leave.dayType ===
    "half_day"
      ? [
          "half_day",
          "leave",
          "on_leave"
        ]
      : [
          "leave",
          "on_leave",
          "approved_leave"
        ];

  const matchingStatus =
    preferredStatuses.find(
      (status) =>
        statusValues.includes(
          status
        )
    );

  if (matchingStatus) {
    return matchingStatus;
  }

  if (
    statusValues.length ===
    0
  ) {
    return leave.dayType ===
      "half_day"
      ? "half_day"
      : "leave";
  }

  return null;
};

const chooseAttendanceLeaveType = (
  leave
) => {
  const enumValues =
    getAttendanceEnumValues(
      "leaveType"
    );

  const preferredValues = [
    leave.leaveType,

    leave.payrollImpact
      ?.payType ===
    "unpaid"
      ? "unpaid"
      : "paid",

    "other"
  ].filter(Boolean);

  const matchingValue =
    preferredValues.find(
      (value) =>
        enumValues.includes(
          value
        )
    );

  if (matchingValue) {
    return matchingValue;
  }

  if (
    enumValues.length ===
    0
  ) {
    return leave.leaveType;
  }

  return undefined;
};

const getDatesBetween = (
  startDate,
  endDate
) => {
  const dates = [];

  const currentDate =
    new Date(startDate);

  const finalDate =
    new Date(endDate);

  currentDate.setHours(
    0,
    0,
    0,
    0
  );

  finalDate.setHours(
    0,
    0,
    0,
    0
  );

  while (
    currentDate <= finalDate
  ) {
    dates.push(
      new Date(currentDate)
    );

    currentDate.setDate(
      currentDate.getDate() +
        1
    );
  }

  return dates;
};

/*
|--------------------------------------------------------------------------
| Attendance Synchronization
|--------------------------------------------------------------------------
*/

const syncApprovedLeaveToAttendance =
  async (
    leave,
    userId
  ) => {
    const attendanceStatus =
      chooseAttendanceStatus(
        leave
      );

    if (!attendanceStatus) {
      throw new Error(
        "Staff attendance status enum does not contain a leave-compatible status."
      );
    }

    const attendanceLeaveType =
      chooseAttendanceLeaveType(
        leave
      );

    const attendanceDates =
      getDatesBetween(
        leave.startDate,
        leave.endDate
      );

    const attendanceRecordIds =
      [];

    let recordsCreated = 0;
    let recordsUpdated = 0;

    for (
      const attendanceDate of
      attendanceDates
    ) {
      const attendanceFilter = {
        schoolId:
          leave.schoolId,

        staffId:
          leave.staffId,

        attendanceDate,

        isDeleted: {
          $ne: true
        }
      };

      const existingAttendance =
        await StaffAttendance.findOne(
          attendanceFilter
        );

      const updateFields = {
        status:
          attendanceStatus
      };

      if (
        attendanceHasPath(
          "leaveType"
        ) &&
        attendanceLeaveType !==
          undefined
      ) {
        updateFields.leaveType =
          attendanceLeaveType;
      }

      if (
        attendanceHasPath(
          "staffLeaveId"
        )
      ) {
        updateFields.staffLeaveId =
          leave._id;
      }

      if (
        attendanceHasPath(
          "leaveId"
        )
      ) {
        updateFields.leaveId =
          leave._id;
      }

      if (
        attendanceHasPath(
          "leaveRequestId"
        )
      ) {
        updateFields.leaveRequestId =
          leave._id;
      }

      if (
        attendanceHasPath(
          "remarks"
        )
      ) {
        updateFields.remarks =
          `Approved ${leave.leaveType} leave — ${leave.applicationNumber}`;
      }

      if (
        attendanceHasPath(
          "notes"
        )
      ) {
        updateFields.notes =
          `Approved ${leave.leaveType} leave — ${leave.applicationNumber}`;
      }

      if (
        attendanceHasPath(
          "lateMinutes"
        )
      ) {
        updateFields.lateMinutes =
          0;
      }

      if (
        attendanceHasPath(
          "overtimeMinutes"
        )
      ) {
        updateFields.overtimeMinutes =
          0;
      }

      if (
        attendanceHasPath(
          "updatedBy"
        )
      ) {
        updateFields.updatedBy =
          userId;
      }

      const insertFields = {
        schoolId:
          leave.schoolId,

        staffId:
          leave.staffId,

        attendanceDate
      };

      if (
        attendanceHasPath(
          "createdBy"
        )
      ) {
        insertFields.createdBy =
          userId;
      }

      if (
        attendanceHasPath(
          "markedBy"
        )
      ) {
        insertFields.markedBy =
          userId;
      }

      const attendanceRecord =
        await StaffAttendance.findOneAndUpdate(
          attendanceFilter,
          {
            $set:
              updateFields,

            $setOnInsert:
              insertFields
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert:
              true
          }
        );

      attendanceRecordIds.push(
        attendanceRecord._id
      );

      if (
        existingAttendance
      ) {
        recordsUpdated += 1;
      } else {
        recordsCreated += 1;
      }
    }

    return {
      status: "synced",

      attendanceRecordIds,

      recordsCreated,
      recordsUpdated,

      syncedAt:
        new Date(),

      syncedBy:
        userId,

      errorMessage: ""
    };
  };

/*
|--------------------------------------------------------------------------
| List Filter Builder
|--------------------------------------------------------------------------
*/

const buildLeaveFilter = (
  req,
  {
    deleted = false
  } = {}
) => {
  const filter = {
    isDeleted: deleted
  };

  const schoolId =
    resolveSchoolId(
      req,
      {
        required:
          getUserRole(req) !==
          "super_admin"
      }
    );

  if (schoolId) {
    filter.schoolId =
      schoolId;
  }

  const search =
    cleanString(
      req.query.search
    );

  if (search) {
    const searchRegex =
      new RegExp(
        escapeRegex(search),
        "i"
      );

    filter.$or = [
      {
        applicationNumber:
          searchRegex
      },

      {
        staffNameSnapshot:
          searchRegex
      },

      {
        employeeIdSnapshot:
          searchRegex
      },

      {
        departmentSnapshot:
          searchRegex
      },

      {
        designationSnapshot:
          searchRegex
      },

      {
        reason:
          searchRegex
      }
    ];
  }

  if (
    req.query.staffId
  ) {
    validateObjectId(
      req.query.staffId,
      "staff identifier"
    );

    filter.staffId =
      req.query.staffId;
  }

  if (
    req.query.leaveType
  ) {
    const leaveTypes =
      parseCommaSeparated(
        req.query.leaveType
      );

    filter.leaveType =
      leaveTypes.length > 1
        ? {
            $in:
              leaveTypes
          }
        : leaveTypes[0];
  }

  if (
    req.query.status
  ) {
    const statuses =
      parseCommaSeparated(
        req.query.status
      );

    filter.status =
      statuses.length > 1
        ? {
            $in:
              statuses
          }
        : statuses[0];
  }

  if (
    req.query.dayType
  ) {
    filter.dayType =
      cleanString(
        req.query.dayType
      );
  }

  if (
    req.query.department
  ) {
    filter.departmentSnapshot =
      new RegExp(
        escapeRegex(
          cleanString(
            req.query.department
          )
        ),
        "i"
      );
  }

  if (
    req.query.leaveYear
  ) {
    const leaveYear =
      Number(
        req.query.leaveYear
      );

    if (
      leaveYear < 2000 ||
      leaveYear > 2100
    ) {
      throw createHttpError(
        400,
        "Invalid leave year."
      );
    }

    filter.leaveYear =
      leaveYear;
  }

  if (
    req.query.payType
  ) {
    filter[
      "payrollImpact.payType"
    ] = cleanString(
      req.query.payType
    );
  }

  const fromDate =
    req.query.fromDate
      ? normalizeDate(
          req.query.fromDate,
          "from date"
        )
      : null;

  const toDate =
    req.query.toDate
      ? endOfDay(
          normalizeDate(
            req.query.toDate,
            "to date"
          )
        )
      : null;

  if (
    fromDate &&
    toDate
  ) {
    filter.startDate = {
      $lte: toDate
    };

    filter.endDate = {
      $gte: fromDate
    };
  } else if (fromDate) {
    filter.endDate = {
      $gte: fromDate
    };
  } else if (toDate) {
    filter.startDate = {
      $lte: toDate
    };
  }

  return filter;
};

/*
|--------------------------------------------------------------------------
| Summary Builder
|--------------------------------------------------------------------------
*/

const getLeaveSummary =
  async (
    filter
  ) => {
    const records =
      await StaffLeave.find(
        filter
      )
        .select(
          "status totalDays payrollImpact.payType"
        )
        .lean();

    return records.reduce(
      (
        summary,
        record
      ) => {
        const days =
          safeNumber(
            record.totalDays
          );

        summary.totalRequests +=
          1;

        summary.totalDays +=
          days;

        const status =
          record.status;

        if (
          Object.prototype
            .hasOwnProperty.call(
              summary,
              status
            )
        ) {
          summary[status] +=
            1;
        }

        if (
          status ===
          "approved"
        ) {
          summary.approvedDays +=
            days;

          const payType =
            record
              .payrollImpact
              ?.payType;

          if (
            payType ===
            "unpaid"
          ) {
            summary.unpaidDays +=
              days;
          } else if (
            payType ===
            "partial_paid"
          ) {
            summary.partialPaidDays +=
              days;
          } else {
            summary.paidDays +=
              days;
          }
        }

        return summary;
      },
      {
        totalRequests: 0,
        totalDays: 0,

        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,

        approvedDays: 0,
        paidDays: 0,
        unpaidDays: 0,
        partialPaidDays: 0
      }
    );
  };

/*
|--------------------------------------------------------------------------
| Create Staff Leave
|--------------------------------------------------------------------------
*/

const createStaffLeave =
  async (req, res) => {
    try {
      const schoolId =
        resolveSchoolId(req);

      const userId =
        getUserId(req);

      if (!userId) {
        throw createHttpError(
          401,
          "Authenticated user was not found."
        );
      }

      const staffId =
        getObjectIdValue(
          req.body.staffId
        );

      if (!staffId) {
        throw createHttpError(
          400,
          "Staff member is required."
        );
      }

      const staff =
        await getVerifiedStaff({
          staffId,
          schoolId
        });

      const startDate =
        normalizeDate(
          req.body.startDate,
          "leave start date"
        );

      const endDate =
        normalizeDate(
          req.body.endDate,
          "leave end date"
        );

      const dayType =
        cleanString(
          req.body.dayType ||
          "full_day"
        ).toLowerCase();

      const halfDaySession =
        dayType ===
        "half_day"
          ? cleanString(
              req.body
                .halfDaySession
            ).toLowerCase()
          : null;

      if (
        dayType ===
          "half_day" &&
        !halfDaySession
      ) {
        throw createHttpError(
          400,
          "Half-day session is required."
        );
      }

      const overlap =
        await findOverlappingLeave({
          schoolId,
          staffId,
          startDate,
          endDate,
          dayType,
          halfDaySession
        });

      if (overlap) {
        throw createHttpError(
          409,
          `This staff member already has an overlapping ${overlap.status} leave request (${overlap.applicationNumber}).`
        );
      }

      const leaveYear =
        startDate.getFullYear();

      const applicationNumber =
        await generateApplicationNumber(
          schoolId,
          leaveYear
        );

      const leavePayload =
        buildLeavePayload(
          {
            ...req.body,
            startDate,
            endDate,
            dayType,
            halfDaySession
          }
        );

      const staffLeave =
        await StaffLeave.create({
          ...leavePayload,

          schoolId,
          staffId,

          applicationNumber,
          leaveYear,

          ...createStaffSnapshot(
            staff
          ),

          status: "pending",

          requestedBy:
            userId,

          requestedAt:
            new Date(),

          createdBy:
            userId,

          updatedBy:
            userId,

          requestSource:
            leavePayload
              .requestSource ||
            "admin"
        });

      await writeAuditLog({
        req,
        action: "CREATE",

        recordId:
          staffLeave._id,

        description:
          `Created staff leave request ${applicationNumber}.`,

        newData:
          staffLeave.toObject()
      });

      const populatedLeave =
        await populateStaffLeaveQuery(
          StaffLeave.findById(
            staffLeave._id
          )
        );

      return res.status(201).json({
        success: true,

        message:
          "Staff leave request created successfully.",

        staffLeave:
          populatedLeave
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Staff leave request could not be created."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Staff Leave List
|--------------------------------------------------------------------------
*/

const getStaffLeaves =
  async (req, res) => {
    try {
      const filter =
        buildLeaveFilter(req);

      const page =
        Math.max(
          1,
          safeNumber(
            req.query.page,
            1
          )
        );

      const limit =
        Math.min(
          100,
          Math.max(
            1,
            safeNumber(
              req.query.limit,
              10
            )
          )
        );

      const allowedSortFields =
        [
          "createdAt",
          "updatedAt",
          "requestedAt",
          "startDate",
          "endDate",
          "totalDays",
          "applicationNumber",
          "staffNameSnapshot",
          "departmentSnapshot",
          "leaveType",
          "status"
        ];

      const requestedSortField =
        cleanString(
          req.query.sortBy ||
          "createdAt"
        );

      const sortBy =
        allowedSortFields.includes(
          requestedSortField
        )
          ? requestedSortField
          : "createdAt";

      const sortOrder =
        cleanString(
          req.query.sortOrder
        ).toLowerCase() ===
        "asc"
          ? 1
          : -1;

      const skip =
        (page - 1) *
        limit;

      const [
        staffLeaves,
        total,
        summary
      ] = await Promise.all([
        populateStaffLeaveQuery(
          StaffLeave.find(
            filter
          )
            .sort({
              [sortBy]:
                sortOrder
            })
            .skip(skip)
            .limit(limit)
        ),

        StaffLeave.countDocuments(
          filter
        ),

        getLeaveSummary(
          filter
        )
      ]);

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            total / limit
          )
        );

      return res.status(200).json({
        success: true,

        staffLeaves,
        summary,

        pagination: {
          total,
          page,
          currentPage:
            page,
          limit,
          totalPages,

          hasNextPage:
            page <
            totalPages,

          hasPreviousPage:
            page > 1
        }
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Staff leave requests could not be loaded."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Staff Leave by ID
|--------------------------------------------------------------------------
*/

const getStaffLeaveById =
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      validateObjectId(
        id,
        "leave identifier"
      );

      const staffLeave =
        await populateStaffLeaveQuery(
          StaffLeave.findOne({
            _id: id,
            isDeleted: false
          })
        );

      if (!staffLeave) {
        throw createHttpError(
          404,
          "Staff leave request was not found."
        );
      }

      ensureRecordSchoolAccess(
        req,
        staffLeave.schoolId
      );

      return res.status(200).json({
        success: true,
        staffLeave
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Staff leave request could not be loaded."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Update Staff Leave
|--------------------------------------------------------------------------
*/

const updateStaffLeave =
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      validateObjectId(
        id,
        "leave identifier"
      );

      const staffLeave =
        await StaffLeave.findOne({
          _id: id,
          isDeleted: false
        });

      if (!staffLeave) {
        throw createHttpError(
          404,
          "Staff leave request was not found."
        );
      }

      ensureRecordSchoolAccess(
        req,
        staffLeave.schoolId
      );

      if (
        ![
          "pending",
          "rejected"
        ].includes(
          staffLeave.status
        )
      ) {
        throw createHttpError(
          400,
          "Only pending or rejected leave requests can be edited."
        );
      }

      const oldData =
        staffLeave.toObject();

      let staff = null;

      if (
        req.body.staffId &&
        String(
          req.body.staffId
        ) !==
          String(
            staffLeave.staffId
          )
      ) {
        staff =
          await getVerifiedStaff({
            staffId:
              req.body.staffId,

            schoolId:
              staffLeave.schoolId
          });

        staffLeave.staffId =
          req.body.staffId;

        Object.assign(
          staffLeave,
          createStaffSnapshot(
            staff
          )
        );
      }

      const updatePayload =
        buildLeavePayload(
          req.body,
          {
            existingLeave:
              staffLeave
          }
        );

      const updatedStartDate =
        updatePayload.startDate ||
        staffLeave.startDate;

      const updatedEndDate =
        updatePayload.endDate ||
        staffLeave.endDate;

      const updatedDayType =
        updatePayload.dayType ||
        staffLeave.dayType;

      const updatedHalfDaySession =
        updatedDayType ===
        "half_day"
          ? (
              updatePayload
                .halfDaySession ||
              staffLeave
                .halfDaySession
            )
          : null;

      const overlap =
        await findOverlappingLeave({
          schoolId:
            staffLeave.schoolId,

          staffId:
            staffLeave.staffId,

          startDate:
            updatedStartDate,

          endDate:
            updatedEndDate,

          dayType:
            updatedDayType,

          halfDaySession:
            updatedHalfDaySession,

          excludeLeaveId:
            staffLeave._id
        });

      if (overlap) {
        throw createHttpError(
          409,
          `This staff member already has an overlapping ${overlap.status} leave request (${overlap.applicationNumber}).`
        );
      }

      Object.assign(
        staffLeave,
        updatePayload
      );

      if (
        staffLeave.status ===
        "rejected"
      ) {
        staffLeave.status =
          "pending";

        staffLeave.rejectionReason =
          "";

        staffLeave.rejectedBy =
          null;

        staffLeave.rejectedAt =
          null;
      }

      staffLeave.updatedBy =
        getUserId(req);

      await staffLeave.save();

      await writeAuditLog({
        req,
        action: "UPDATE",

        recordId:
          staffLeave._id,

        description:
          `Updated staff leave request ${staffLeave.applicationNumber}.`,

        oldData,

        newData:
          staffLeave.toObject()
      });

      const populatedLeave =
        await populateStaffLeaveQuery(
          StaffLeave.findById(
            staffLeave._id
          )
        );

      return res.status(200).json({
        success: true,

        message:
          "Staff leave request updated successfully.",

        staffLeave:
          populatedLeave
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Staff leave request could not be updated."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Approve Staff Leave
|--------------------------------------------------------------------------
*/

const approveStaffLeave =
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      validateObjectId(
        id,
        "leave identifier"
      );

      const staffLeave =
        await StaffLeave.findOne({
          _id: id,
          isDeleted: false
        });

      if (!staffLeave) {
        throw createHttpError(
          404,
          "Staff leave request was not found."
        );
      }

      ensureRecordSchoolAccess(
        req,
        staffLeave.schoolId
      );

      if (
        staffLeave.status !==
        "pending"
      ) {
        throw createHttpError(
          400,
          "Only pending leave requests can be approved."
        );
      }

      const overlap =
        await findOverlappingLeave({
          schoolId:
            staffLeave.schoolId,

          staffId:
            staffLeave.staffId,

          startDate:
            staffLeave.startDate,

          endDate:
            staffLeave.endDate,

          dayType:
            staffLeave.dayType,

          halfDaySession:
            staffLeave
              .halfDaySession,

          excludeLeaveId:
            staffLeave._id
        });

      if (overlap) {
        throw createHttpError(
          409,
          `Leave cannot be approved because it overlaps with ${overlap.applicationNumber}.`
        );
      }

      const oldData =
        staffLeave.toObject();

      const userId =
        getUserId(req);

      const requestedPayType =
        cleanString(
          req.body.payType ||
          req.body
            .payrollImpact
            ?.payType ||
          staffLeave
            .payrollImpact
            ?.payType ||
          "paid"
        ).toLowerCase();

      let payPercentage =
        safeNumber(
          req.body
            .payPercentage ??
          req.body
            .payrollImpact
            ?.payPercentage ??
          staffLeave
            .payrollImpact
            ?.payPercentage ??
          100
        );

      let payType =
        requestedPayType;

      if (
        staffLeave.leaveType ===
        "unpaid"
      ) {
        payType = "unpaid";
        payPercentage = 0;
      } else if (
        payType === "paid"
      ) {
        payPercentage = 100;
      } else if (
        payType === "unpaid"
      ) {
        payPercentage = 0;
      } else if (
        payType ===
          "partial_paid" &&
        (
          payPercentage <= 0 ||
          payPercentage >= 100
        )
      ) {
        throw createHttpError(
          400,
          "Partially paid leave percentage must be greater than 0 and less than 100."
        );
      }

      staffLeave.status =
        "approved";

      staffLeave.approvalNotes =
        cleanString(
          req.body.approvalNotes
        );

      staffLeave.approvedBy =
        userId;

      staffLeave.approvedAt =
        new Date();

      staffLeave.rejectionReason =
        "";

      staffLeave.rejectedBy =
        null;

      staffLeave.rejectedAt =
        null;

      staffLeave.payrollImpact = {
        ...(staffLeave
          .payrollImpact
          ?.toObject
          ? staffLeave
              .payrollImpact
              .toObject()
          : staffLeave
              .payrollImpact ||
            {}),

        payType,
        payPercentage,

        isProcessed:
          false,

        payrollId:
          null,

        processedAt:
          null,

        processedBy:
          null,

        deductionAmount:
          0
      };

      if (
        req.body.balanceSnapshot
      ) {
        staffLeave.balanceSnapshot = {
          openingBalance:
            nonNegativeNumber(
              req.body
                .balanceSnapshot
                .openingBalance
            ),

          usedBefore:
            nonNegativeNumber(
              req.body
                .balanceSnapshot
                .usedBefore
            ),

          availableBefore:
            nonNegativeNumber(
              req.body
                .balanceSnapshot
                .availableBefore
            ),

          currentLeaveDays:
            nonNegativeNumber(
              req.body
                .balanceSnapshot
                .currentLeaveDays ??
              staffLeave.totalDays
            ),

          remainingAfter:
            nonNegativeNumber(
              req.body
                .balanceSnapshot
                .remainingAfter
            )
        };
      }

      staffLeave.attendanceSync = {
        status: "pending",

        attendanceRecordIds:
          [],

        recordsCreated:
          0,

        recordsUpdated:
          0,

        syncedAt:
          null,

        syncedBy:
          null,

        errorMessage:
          ""
      };

      staffLeave.updatedBy =
        userId;

      await staffLeave.save();

      let attendanceWarning =
        "";

      try {
        const attendanceSync =
          await syncApprovedLeaveToAttendance(
            staffLeave,
            userId
          );

        staffLeave.attendanceSync =
          attendanceSync;

        await staffLeave.save();
      } catch (
        attendanceError
      ) {
        attendanceWarning =
          attendanceError.message;

        staffLeave.attendanceSync = {
          status: "failed",

          attendanceRecordIds:
            [],

          recordsCreated:
            0,

          recordsUpdated:
            0,

          syncedAt:
            null,

          syncedBy:
            userId,

          errorMessage:
            attendanceError
              .message
        };

        await staffLeave.save();
      }

      await writeAuditLog({
        req,
        action: "APPROVE",

        recordId:
          staffLeave._id,

        description:
          `Approved staff leave request ${staffLeave.applicationNumber}.`,

        oldData,

        newData:
          staffLeave.toObject()
      });

      const populatedLeave =
        await populateStaffLeaveQuery(
          StaffLeave.findById(
            staffLeave._id
          )
        );

      return res.status(200).json({
        success: true,

        message:
          attendanceWarning
            ? "Leave approved successfully, but attendance synchronization requires review."
            : "Staff leave approved and attendance synchronized successfully.",

        warning:
          attendanceWarning ||
          null,

        staffLeave:
          populatedLeave
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Staff leave request could not be approved."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Reject Staff Leave
|--------------------------------------------------------------------------
*/

const rejectStaffLeave =
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      validateObjectId(
        id,
        "leave identifier"
      );

      const staffLeave =
        await StaffLeave.findOne({
          _id: id,
          isDeleted: false
        });

      if (!staffLeave) {
        throw createHttpError(
          404,
          "Staff leave request was not found."
        );
      }

      ensureRecordSchoolAccess(
        req,
        staffLeave.schoolId
      );

      if (
        staffLeave.status !==
        "pending"
      ) {
        throw createHttpError(
          400,
          "Only pending leave requests can be rejected."
        );
      }

      const rejectionReason =
        cleanString(
          req.body.rejectionReason ||
          req.body.reason
        );

      if (!rejectionReason) {
        throw createHttpError(
          400,
          "Rejection reason is required."
        );
      }

      const oldData =
        staffLeave.toObject();

      staffLeave.status =
        "rejected";

      staffLeave.rejectionReason =
        rejectionReason;

      staffLeave.rejectedBy =
        getUserId(req);

      staffLeave.rejectedAt =
        new Date();

      staffLeave.approvalNotes =
        "";

      staffLeave.approvedBy =
        null;

      staffLeave.approvedAt =
        null;

      staffLeave.attendanceSync = {
        status:
          "not_required",

        attendanceRecordIds:
          [],

        recordsCreated:
          0,

        recordsUpdated:
          0,

        syncedAt:
          null,

        syncedBy:
          null,

        errorMessage:
          ""
      };

      staffLeave.updatedBy =
        getUserId(req);

      await staffLeave.save();

      await writeAuditLog({
        req,
        action: "REJECT",

        recordId:
          staffLeave._id,

        description:
          `Rejected staff leave request ${staffLeave.applicationNumber}.`,

        oldData,

        newData:
          staffLeave.toObject()
      });

      const populatedLeave =
        await populateStaffLeaveQuery(
          StaffLeave.findById(
            staffLeave._id
          )
        );

      return res.status(200).json({
        success: true,

        message:
          "Staff leave request rejected successfully.",

        staffLeave:
          populatedLeave
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Staff leave request could not be rejected."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Cancel Staff Leave
|--------------------------------------------------------------------------
*/

const cancelStaffLeave =
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      validateObjectId(
        id,
        "leave identifier"
      );

      const staffLeave =
        await StaffLeave.findOne({
          _id: id,
          isDeleted: false
        });

      if (!staffLeave) {
        throw createHttpError(
          404,
          "Staff leave request was not found."
        );
      }

      ensureRecordSchoolAccess(
        req,
        staffLeave.schoolId
      );

      if (
        [
          "cancelled",
          "rejected"
        ].includes(
          staffLeave.status
        )
      ) {
        throw createHttpError(
          400,
          `A ${staffLeave.status} leave request cannot be cancelled.`
        );
      }

      if (
        staffLeave
          .payrollImpact
          ?.isProcessed
      ) {
        throw createHttpError(
          400,
          "This leave has already been processed in payroll and cannot be cancelled."
        );
      }

      const cancellationReason =
        cleanString(
          req.body
            .cancellationReason ||
          req.body.reason
        );

      if (
        !cancellationReason
      ) {
        throw createHttpError(
          400,
          "Cancellation reason is required."
        );
      }

      const oldData =
        staffLeave.toObject();

      const wasAttendanceSynced =
        staffLeave
          .attendanceSync
          ?.status ===
        "synced";

      staffLeave.status =
        "cancelled";

      staffLeave.cancellationReason =
        cancellationReason;

      staffLeave.cancelledBy =
        getUserId(req);

      staffLeave.cancelledAt =
        new Date();

      staffLeave.updatedBy =
        getUserId(req);

      if (
        wasAttendanceSynced
      ) {
        staffLeave.attendanceSync = {
          ...(staffLeave
            .attendanceSync
            ?.toObject
            ? staffLeave
                .attendanceSync
                .toObject()
            : staffLeave
                .attendanceSync ||
              {}),

          status: "failed",

          errorMessage:
            "Leave was cancelled after attendance synchronization. Linked attendance records require administrative review."
        };
      }

      await staffLeave.save();

      await writeAuditLog({
        req,
        action: "CANCEL",

        recordId:
          staffLeave._id,

        description:
          `Cancelled staff leave request ${staffLeave.applicationNumber}.`,

        oldData,

        newData:
          staffLeave.toObject()
      });

      const populatedLeave =
        await populateStaffLeaveQuery(
          StaffLeave.findById(
            staffLeave._id
          )
        );

      return res.status(200).json({
        success: true,

        message:
          wasAttendanceSynced
            ? "Leave cancelled successfully. Linked attendance records require review."
            : "Staff leave request cancelled successfully.",

        warning:
          wasAttendanceSynced
            ? "Attendance had already been synchronized for this leave."
            : null,

        staffLeave:
          populatedLeave
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Staff leave request could not be cancelled."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Delete Staff Leave
|--------------------------------------------------------------------------
*/

const deleteStaffLeave =
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      validateObjectId(
        id,
        "leave identifier"
      );

      const staffLeave =
        await StaffLeave.findOne({
          _id: id,
          isDeleted: false
        });

      if (!staffLeave) {
        throw createHttpError(
          404,
          "Staff leave request was not found."
        );
      }

      ensureRecordSchoolAccess(
        req,
        staffLeave.schoolId
      );

      if (
        staffLeave.status ===
        "approved"
      ) {
        throw createHttpError(
          400,
          "Approved leave cannot be deleted directly. Cancel it first."
        );
      }

      if (
        staffLeave
          .payrollImpact
          ?.isProcessed
      ) {
        throw createHttpError(
          400,
          "Payroll-processed leave cannot be deleted."
        );
      }

      const oldData =
        staffLeave.toObject();

      staffLeave.isDeleted =
        true;

      staffLeave.deletedAt =
        new Date();

      staffLeave.deletedBy =
        getUserId(req);

      staffLeave.updatedBy =
        getUserId(req);

      await staffLeave.save();

      await writeAuditLog({
        req,
        action: "DELETE",

        recordId:
          staffLeave._id,

        description:
          `Deleted staff leave request ${staffLeave.applicationNumber}.`,

        oldData,

        newData:
          staffLeave.toObject()
      });

      return res.status(200).json({
        success: true,

        message:
          "Staff leave request deleted successfully."
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Staff leave request could not be deleted."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Staff Leaves
|--------------------------------------------------------------------------
*/

const getDeletedStaffLeaves =
  async (req, res) => {
    try {
      const filter =
        buildLeaveFilter(
          req,
          {
            deleted: true
          }
        );

      const page =
        Math.max(
          1,
          safeNumber(
            req.query.page,
            1
          )
        );

      const limit =
        Math.min(
          100,
          Math.max(
            1,
            safeNumber(
              req.query.limit,
              10
            )
          )
        );

      const allowedSortFields =
        [
          "deletedAt",
          "createdAt",
          "startDate",
          "endDate",
          "applicationNumber",
          "staffNameSnapshot",
          "leaveType",
          "status"
        ];

      const requestedSortField =
        cleanString(
          req.query.sortBy ||
          "deletedAt"
        );

      const sortBy =
        allowedSortFields.includes(
          requestedSortField
        )
          ? requestedSortField
          : "deletedAt";

      const sortOrder =
        cleanString(
          req.query.sortOrder
        ).toLowerCase() ===
        "asc"
          ? 1
          : -1;

      const skip =
        (page - 1) *
        limit;

      const [
        staffLeaves,
        total,
        summary
      ] = await Promise.all([
        populateStaffLeaveQuery(
          StaffLeave.find(
            filter
          )
            .sort({
              [sortBy]:
                sortOrder
            })
            .skip(skip)
            .limit(limit)
        ),

        StaffLeave.countDocuments(
          filter
        ),

        getLeaveSummary(
          filter
        )
      ]);

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            total / limit
          )
        );

      return res.status(200).json({
        success: true,

        staffLeaves,
        summary,

        pagination: {
          total,
          page,
          currentPage:
            page,
          limit,
          totalPages,

          hasNextPage:
            page <
            totalPages,

          hasPreviousPage:
            page > 1
        }
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Deleted staff leave requests could not be loaded."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Restore Staff Leave
|--------------------------------------------------------------------------
*/

const restoreStaffLeave =
  async (req, res) => {
    try {
      const {
        id
      } = req.params;

      validateObjectId(
        id,
        "leave identifier"
      );

      const staffLeave =
        await StaffLeave.findOne({
          _id: id,
          isDeleted: true
        });

      if (!staffLeave) {
        throw createHttpError(
          404,
          "Deleted staff leave request was not found."
        );
      }

      ensureRecordSchoolAccess(
        req,
        staffLeave.schoolId
      );

      const duplicateApplication =
        await StaffLeave.exists({
          _id: {
            $ne:
              staffLeave._id
          },

          schoolId:
            staffLeave.schoolId,

          applicationNumber:
            staffLeave
              .applicationNumber,

          isDeleted: false
        });

      if (
        duplicateApplication
      ) {
        throw createHttpError(
          409,
          "Another active leave request already uses this application number."
        );
      }

      if (
        [
          "pending",
          "approved"
        ].includes(
          staffLeave.status
        )
      ) {
        const overlap =
          await findOverlappingLeave({
            schoolId:
              staffLeave.schoolId,

            staffId:
              staffLeave.staffId,

            startDate:
              staffLeave.startDate,

            endDate:
              staffLeave.endDate,

            dayType:
              staffLeave.dayType,

            halfDaySession:
              staffLeave
                .halfDaySession,

            excludeLeaveId:
              staffLeave._id
          });

        if (overlap) {
          throw createHttpError(
            409,
            `This leave cannot be restored because it overlaps with ${overlap.applicationNumber}.`
          );
        }
      }

      const oldData =
        staffLeave.toObject();

      staffLeave.isDeleted =
        false;

      staffLeave.deletedAt =
        null;

      staffLeave.deletedBy =
        null;

      staffLeave.updatedBy =
        getUserId(req);

      await staffLeave.save();

      await writeAuditLog({
        req,
        action: "RESTORE",

        recordId:
          staffLeave._id,

        description:
          `Restored staff leave request ${staffLeave.applicationNumber}.`,

        oldData,

        newData:
          staffLeave.toObject()
      });

      const populatedLeave =
        await populateStaffLeaveQuery(
          StaffLeave.findById(
            staffLeave._id
          )
        );

      return res.status(200).json({
        success: true,

        message:
          "Staff leave request restored successfully.",

        staffLeave:
          populatedLeave
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Staff leave request could not be restored."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Staff Leave Report
|--------------------------------------------------------------------------
*/

const getStaffLeaveReport =
  async (req, res) => {
    try {
      const reportQuery = {
        ...req.query
      };

      if (
        !reportQuery.leaveYear &&
        !reportQuery.fromDate &&
        !reportQuery.toDate
      ) {
        reportQuery.leaveYear =
          new Date().getFullYear();
      }

      const reportRequest = {
        ...req,
        query:
          reportQuery
      };

      const filter =
        buildLeaveFilter(
          reportRequest
        );

      const staffLeaves =
        await StaffLeave.find(
          filter
        )
          .select(
            "leaveType customLeaveType status totalDays startDate endDate departmentSnapshot payrollImpact.payType payrollImpact.payPercentage"
          )
          .sort({
            startDate: 1
          })
          .lean();

      const report = {
        totalRequests: 0,
        totalDays: 0,

        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        cancelledRequests: 0,

        approvedDays: 0,
        paidDays: 0,
        unpaidDays: 0,
        partialPaidDays: 0,

        byStatus: {},
        byLeaveType: {},
        byDepartment: {},
        byPayType: {},
        monthlyTrend: {}
      };

      staffLeaves.forEach(
        (leave) => {
          const totalDays =
            safeNumber(
              leave.totalDays
            );

          report.totalRequests +=
            1;

          report.totalDays +=
            totalDays;

          const status =
            leave.status ||
            "unknown";

          report.byStatus[
            status
          ] =
            (
              report.byStatus[
                status
              ] || 0
            ) + 1;

          if (
            status ===
            "pending"
          ) {
            report.pendingRequests +=
              1;
          }

          if (
            status ===
            "approved"
          ) {
            report.approvedRequests +=
              1;

            report.approvedDays +=
              totalDays;
          }

          if (
            status ===
            "rejected"
          ) {
            report.rejectedRequests +=
              1;
          }

          if (
            status ===
            "cancelled"
          ) {
            report.cancelledRequests +=
              1;
          }

          const leaveType =
            leave.leaveType ===
            "other"
              ? (
                  leave.customLeaveType ||
                  "other"
                )
              : (
                  leave.leaveType ||
                  "unknown"
                );

          if (
            !report.byLeaveType[
              leaveType
            ]
          ) {
            report.byLeaveType[
              leaveType
            ] = {
              requests: 0,
              days: 0
            };
          }

          report.byLeaveType[
            leaveType
          ].requests += 1;

          report.byLeaveType[
            leaveType
          ].days +=
            totalDays;

          const department =
            leave
              .departmentSnapshot ||
            "Unassigned";

          if (
            !report.byDepartment[
              department
            ]
          ) {
            report.byDepartment[
              department
            ] = {
              requests: 0,
              days: 0
            };
          }

          report.byDepartment[
            department
          ].requests += 1;

          report.byDepartment[
            department
          ].days +=
            totalDays;

          const payType =
            leave
              .payrollImpact
              ?.payType ||
            "paid";

          if (
            !report.byPayType[
              payType
            ]
          ) {
            report.byPayType[
              payType
            ] = {
              requests: 0,
              days: 0
            };
          }

          report.byPayType[
            payType
          ].requests += 1;

          report.byPayType[
            payType
          ].days +=
            totalDays;

          if (
            status ===
            "approved"
          ) {
            if (
              payType ===
              "unpaid"
            ) {
              report.unpaidDays +=
                totalDays;
            } else if (
              payType ===
              "partial_paid"
            ) {
              report.partialPaidDays +=
                totalDays;
            } else {
              report.paidDays +=
                totalDays;
            }
          }

          const startDate =
            new Date(
              leave.startDate
            );

          const monthKey =
            `${startDate.getFullYear()}-${String(
              startDate.getMonth() +
                1
            ).padStart(2, "0")}`;

          if (
            !report.monthlyTrend[
              monthKey
            ]
          ) {
            report.monthlyTrend[
              monthKey
            ] = {
              requests: 0,
              days: 0,
              approved: 0,
              pending: 0,
              rejected: 0,
              cancelled: 0
            };
          }

          report.monthlyTrend[
            monthKey
          ].requests += 1;

          report.monthlyTrend[
            monthKey
          ].days +=
            totalDays;

          if (
            Object.prototype
              .hasOwnProperty.call(
                report.monthlyTrend[
                  monthKey
                ],
                status
              )
          ) {
            report.monthlyTrend[
              monthKey
            ][status] += 1;
          }
        }
      );

      const monthlyTrend =
        Object.entries(
          report.monthlyTrend
        )
          .sort(
            (
              [monthA],
              [monthB]
            ) =>
              monthA.localeCompare(
                monthB
              )
          )
          .map(
            ([
              month,
              values
            ]) => ({
              month,
              ...values
            })
          );

      return res.status(200).json({
        success: true,

        report: {
          ...report,
          monthlyTrend
        },

        filters: {
          schoolId:
            filter.schoolId ||
            null,

          staffId:
            filter.staffId ||
            null,

          leaveYear:
            filter.leaveYear ||
            null,

          fromDate:
            req.query.fromDate ||
            null,

          toDate:
            req.query.toDate ||
            null,

          leaveType:
            req.query.leaveType ||
            null,

          status:
            req.query.status ||
            null,

          department:
            req.query.department ||
            null,

          payType:
            req.query.payType ||
            null
        }
      });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Staff leave report could not be generated."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Controller Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  createStaffLeave,
  getStaffLeaves,
  getStaffLeaveById,
  updateStaffLeave,

  approveStaffLeave,
  rejectStaffLeave,
  cancelStaffLeave,

  deleteStaffLeave,
  getDeletedStaffLeaves,
  restoreStaffLeave,

  getStaffLeaveReport
};