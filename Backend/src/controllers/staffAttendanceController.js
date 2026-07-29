const mongoose = require(
  "mongoose"
);

const StaffAttendance = require(
  "../models/StaffAttendance"
);

const Staff = require(
  "../models/Staff"
);

const School = require(
  "../models/School"
);

const {
  createAuditLog
} = require(
  "../utils/auditLogHelper"
);

const {
  getPaginationOptions,
  buildPagination
} = require(
  "../utils/pagination"
);

/*
|--------------------------------------------------------------------------
| Attendance Constants
|--------------------------------------------------------------------------
*/

const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "leave",
  "half_day"
];

const LEAVE_TYPES = [
  "casual",
  "sick",
  "annual",
  "unpaid",
  "emergency",
  "other"
];

const ATTENDANCE_STAFF_STATUSES = [
  "active",
  "on_leave"
];

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const isSuperAdmin = (req) => {
  return (
    req.user?.role ===
    "super_admin"
  );
};

const isValidObjectId = (
  value
) => {
  return (
    Boolean(value) &&
    mongoose.Types.ObjectId.isValid(
      value
    )
  );
};

const getDocumentId = (
  value
) => {
  if (!value) {
    return null;
  }

  if (value._id) {
    return String(value._id);
  }

  return String(value);
};

const getUserSchoolId = (
  req
) => {
  return getDocumentId(
    req.user?.schoolId
  );
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

  return String(value).trim();
};

const escapeRegex = (
  value = ""
) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const safeNumber = (
  value
) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : value;
};

/*
|--------------------------------------------------------------------------
| Normalize Attendance Date
|--------------------------------------------------------------------------
*/

const normalizeAttendanceDate = (
  value
) => {
  if (!value) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | YYYY-MM-DD
  |--------------------------------------------------------------------------
  */

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    const [
      year,
      month,
      day
    ] = value
      .split("-")
      .map(Number);

    const date = new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date;
  }

  /*
  |--------------------------------------------------------------------------
  | Date Object or ISO Date
  |--------------------------------------------------------------------------
  */

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
};

/*
|--------------------------------------------------------------------------
| Format Date Key
|--------------------------------------------------------------------------
*/

const getDateKey = (
  value
) => {
  const date =
    normalizeAttendanceDate(
      value
    );

  if (!date) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
};

/*
|--------------------------------------------------------------------------
| Time Helpers
|--------------------------------------------------------------------------
*/

const timeToMinutes = (
  value
) => {
  if (
    !value ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      value
    )
  ) {
    return null;
  }

  const [
    hours,
    minutes
  ] = value
    .split(":")
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
};

const calculateWorkingMinutes = ({
  checkInTime,
  checkOutTime,
  breakMinutes
}) => {
  const checkIn =
    timeToMinutes(
      checkInTime
    );

  const checkOut =
    timeToMinutes(
      checkOutTime
    );

  if (
    checkIn === null ||
    checkOut === null
  ) {
    return 0;
  }

  return Math.max(
    0,
    checkOut -
      checkIn -
      Number(
        breakMinutes || 0
      )
  );
};

const formatWorkingTime = (
  minutes
) => {
  const totalMinutes =
    Math.max(
      0,
      Number(minutes || 0)
    );

  const hours = Math.floor(
    totalMinutes / 60
  );

  const remainingMinutes =
    totalMinutes % 60;

  return {
    hours,
    minutes:
      remainingMinutes,

    formatted:
      `${hours}h ${remainingMinutes}m`
  };
};

/*
|--------------------------------------------------------------------------
| Controller Error Handler
|--------------------------------------------------------------------------
*/

const handleControllerError = (
  res,
  error,
  defaultMessage
) => {
  console.error(
    `${defaultMessage}:`,
    error
  );

  if (
    error.name ===
    "ValidationError"
  ) {
    return res.status(400).json({
      success: false,

      message: Object.values(
        error.errors
      )
        .map(
          (validationError) =>
            validationError.message
        )
        .join(", ")
    });
  }

  if (
    error.name ===
    "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid ID format"
    });
  }

  if (
    error.code === 11000
  ) {
    return res.status(400).json({
      success: false,

      message:
        "Attendance for this staff member has already been marked for the selected date"
    });
  }

  return res.status(500).json({
    success: false,
    message: defaultMessage,
    error: error.message
  });
};

/*
|--------------------------------------------------------------------------
| Safe Audit Logger
|--------------------------------------------------------------------------
*/

const recordAuditLog = async (
  auditData
) => {
  try {
    await createAuditLog(
      auditData
    );
  } catch (auditError) {
    console.error(
      "Staff attendance audit log error:",
      auditError
    );
  }
};

/*
|--------------------------------------------------------------------------
| School Scope
|--------------------------------------------------------------------------
*/

const getSchoolScope = (
  req
) => {
  if (isSuperAdmin(req)) {
    const requestedSchoolId =
      normalizeText(
        req.query.schoolId
      );

    if (
      requestedSchoolId &&
      !isValidObjectId(
        requestedSchoolId
      )
    ) {
      return {
        error:
          "Invalid school ID format",
        statusCode: 400
      };
    }

    return {
      selectedSchoolId:
        requestedSchoolId ||
        null,

      filter:
        requestedSchoolId
          ? {
              schoolId:
                requestedSchoolId
            }
          : {}
    };
  }

  const schoolId =
    getDocumentId(
      req.schoolFilter
        ?.schoolId
    ) ||
    getUserSchoolId(req);

  if (!schoolId) {
    return {
      error:
        "School is not assigned to this user",
      statusCode: 403
    };
  }

  if (
    !isValidObjectId(
      schoolId
    )
  ) {
    return {
      error:
        "Invalid school ID format",
      statusCode: 400
    };
  }

  return {
    selectedSchoolId:
      schoolId,

    filter: {
      schoolId
    }
  };
};

/*
|--------------------------------------------------------------------------
| Resolve Required School
|--------------------------------------------------------------------------
|
| Daily attendance marking اور daily register کے لیے ایک مخصوص school
| ضروری ہے۔
|
*/

const resolveRequiredSchoolId = (
  req,
  source = "query"
) => {
  if (isSuperAdmin(req)) {
    const schoolId =
      normalizeText(
        source === "body"
          ? req.body.schoolId
          : req.query.schoolId
      );

    if (!schoolId) {
      return {
        error:
          "School ID is required",
        statusCode: 400
      };
    }

    if (
      !isValidObjectId(
        schoolId
      )
    ) {
      return {
        error:
          "Invalid school ID format",
        statusCode: 400
      };
    }

    return {
      schoolId
    };
  }

  const schoolId =
    getDocumentId(
      req.schoolFilter
        ?.schoolId
    ) ||
    getUserSchoolId(req);

  if (!schoolId) {
    return {
      error:
        "School is not assigned to this user",
      statusCode: 403
    };
  }

  if (
    !isValidObjectId(
      schoolId
    )
  ) {
    return {
      error:
        "Invalid school ID format",
      statusCode: 400
    };
  }

  return {
    schoolId
  };
};

/*
|--------------------------------------------------------------------------
| Verify School
|--------------------------------------------------------------------------
*/

const verifySchool = async (
  schoolId,
  {
    requireActive = false
  } = {}
) => {
  const school =
    await School.findOne({
      _id: schoolId,

      isDeleted: {
        $ne: true
      }
    });

  if (!school) {
    return {
      error:
        "School not found",
      statusCode: 404
    };
  }

  if (
    requireActive &&
    !school.isActive
  ) {
    return {
      error:
        "Attendance cannot be marked for an inactive school",
      statusCode: 403
    };
  }

  return {
    school
  };
};

/*
|--------------------------------------------------------------------------
| Populate Attendance
|--------------------------------------------------------------------------
*/

const populateAttendance = (
  query
) => {
  return query
    .populate(
      "schoolId",
      "schoolName type isActive"
    )
    .populate(
      "staffId",
      "employeeId name phone staffPhoto category department designation employmentType shift status"
    )
    .populate(
      "markedBy",
      "name email role"
    )
    .populate(
      "updatedBy",
      "name email role"
    )
    .populate(
      "deletedBy",
      "name email role"
    );
};

/*
|--------------------------------------------------------------------------
| Attendance Snapshot for Audit
|--------------------------------------------------------------------------
*/

const getAttendanceAuditSnapshot = (
  attendance
) => {
  if (!attendance) {
    return null;
  }

  return {
    attendanceId:
      attendance._id,

    schoolId:
      attendance.schoolId,

    staffId:
      attendance.staffId,

    attendanceDate:
      attendance.attendanceDate,

    status:
      attendance.status,

    checkInTime:
      attendance.checkInTime,

    checkOutTime:
      attendance.checkOutTime,

    breakMinutes:
      attendance.breakMinutes,

    overtimeMinutes:
      attendance.overtimeMinutes,

    lateMinutes:
      attendance.lateMinutes,

    leaveType:
      attendance.leaveType,

    leaveReason:
      attendance.leaveReason,

    remarks:
      attendance.remarks
  };
};

/*
|--------------------------------------------------------------------------
| Build Attendance Payload
|--------------------------------------------------------------------------
*/

const buildAttendancePayload = (
  body = {}
) => {
  const allowedFields = [
    "status",
    "checkInTime",
    "checkOutTime",
    "breakMinutes",
    "overtimeMinutes",
    "lateMinutes",
    "leaveType",
    "leaveReason",
    "remarks"
  ];

  const payload = {};

  allowedFields.forEach(
    (field) => {
      if (
        body[field] !==
        undefined
      ) {
        payload[field] =
          body[field];
      }
    }
  );

  if (
    payload.status !==
    undefined
  ) {
    payload.status =
      normalizeText(
        payload.status
      ).toLowerCase();
  }

  const textFields = [
    "checkInTime",
    "checkOutTime",
    "leaveType",
    "leaveReason",
    "remarks"
  ];

  textFields.forEach(
    (field) => {
      if (
        payload[field] !==
        undefined
      ) {
        payload[field] =
          normalizeText(
            payload[field]
          );
      }
    }
  );

  const numberFields = [
    "breakMinutes",
    "overtimeMinutes",
    "lateMinutes"
  ];

  numberFields.forEach(
    (field) => {
      if (
        payload[field] !==
        undefined
      ) {
        payload[field] =
          safeNumber(
            payload[field]
          );
      }
    }
  );

  return payload;
};

/*
|--------------------------------------------------------------------------
| Validate Attendance Payload
|--------------------------------------------------------------------------
*/

const validateAttendancePayload = (
  payload
) => {
  if (
    !payload.status ||
    !ATTENDANCE_STATUSES.includes(
      payload.status
    )
  ) {
    return (
      "Attendance status must be present, absent, late, leave or half day"
    );
  }

  if (
    payload.status ===
      "leave" &&
    (
      !payload.leaveType ||
      !LEAVE_TYPES.includes(
        payload.leaveType
      )
    )
  ) {
    return (
      "A valid leave type is required for leave attendance"
    );
  }

  if (
    payload.status ===
      "late" &&
    Number(
      payload.lateMinutes ||
        0
    ) <= 0
  ) {
    return (
      "Late minutes must be greater than zero for late attendance"
    );
  }

  const checkIn =
    timeToMinutes(
      payload.checkInTime
    );

  const checkOut =
    timeToMinutes(
      payload.checkOutTime
    );

  if (
    payload.checkInTime &&
    checkIn === null
  ) {
    return (
      "Check-in time must use HH:mm format"
    );
  }

  if (
    payload.checkOutTime &&
    checkOut === null
  ) {
    return (
      "Check-out time must use HH:mm format"
    );
  }

  if (
    checkIn !== null &&
    checkOut !== null &&
    checkOut < checkIn
  ) {
    return (
      "Check-out time cannot be earlier than check-in time"
    );
  }

  const nonNegativeFields = [
    {
      field:
        "breakMinutes",
      label:
        "Break minutes"
    },
    {
      field:
        "overtimeMinutes",
      label:
        "Overtime minutes"
    },
    {
      field:
        "lateMinutes",
      label:
        "Late minutes"
    }
  ];

  const invalidNumber =
    nonNegativeFields.find(
      (item) =>
        Number(
          payload[item.field] ||
            0
        ) < 0
    );

  if (invalidNumber) {
    return `${invalidNumber.label} cannot be negative`;
  }

  return "";
};

/*
|--------------------------------------------------------------------------
| Build Attendance Listing Filter
|--------------------------------------------------------------------------
*/

const buildAttendanceFilter = (
  req,
  {
    deleted = false
  } = {}
) => {
  const schoolScope =
    getSchoolScope(req);

  if (schoolScope.error) {
    return schoolScope;
  }

  const filter = {
    ...schoolScope.filter,

    isDeleted: deleted
      ? true
      : {
          $ne: true
        }
  };

  /*
  |--------------------------------------------------------------------------
  | Staff ID
  |--------------------------------------------------------------------------
  */

  if (req.query.staffId) {
    if (
      !isValidObjectId(
        req.query.staffId
      )
    ) {
      return {
        error:
          "Invalid staff ID format",
        statusCode: 400
      };
    }

    filter.staffId =
      req.query.staffId;
  }

  /*
  |--------------------------------------------------------------------------
  | Status
  |--------------------------------------------------------------------------
  */

  if (req.query.status) {
    const status =
      normalizeText(
        req.query.status
      ).toLowerCase();

    if (
      !ATTENDANCE_STATUSES.includes(
        status
      )
    ) {
      return {
        error:
          "Invalid attendance status",
        statusCode: 400
      };
    }

    filter.status =
      status;
  }

  /*
  |--------------------------------------------------------------------------
  | Exact Attendance Date
  |--------------------------------------------------------------------------
  */

  if (
    req.query.attendanceDate
  ) {
    const attendanceDate =
      normalizeAttendanceDate(
        req.query
          .attendanceDate
      );

    if (!attendanceDate) {
      return {
        error:
          "Invalid attendance date",
        statusCode: 400
      };
    }

    filter.attendanceDate =
      attendanceDate;
  }

  /*
  |--------------------------------------------------------------------------
  | Date Range
  |--------------------------------------------------------------------------
  */

  const fromDate =
    req.query.fromDate
      ? normalizeAttendanceDate(
          req.query.fromDate
        )
      : null;

  const toDate =
    req.query.toDate
      ? normalizeAttendanceDate(
          req.query.toDate
        )
      : null;

  if (
    req.query.fromDate &&
    !fromDate
  ) {
    return {
      error:
        "Invalid from date",
      statusCode: 400
    };
  }

  if (
    req.query.toDate &&
    !toDate
  ) {
    return {
      error:
        "Invalid to date",
      statusCode: 400
    };
  }

  if (
    fromDate &&
    toDate &&
    fromDate > toDate
  ) {
    return {
      error:
        "From date cannot be later than to date",
      statusCode: 400
    };
  }

  if (
    fromDate ||
    toDate
  ) {
    filter.attendanceDate =
      {};

    if (fromDate) {
      filter.attendanceDate.$gte =
        fromDate;
    }

    if (toDate) {
      filter.attendanceDate.$lte =
        toDate;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Search Historical Snapshots
  |--------------------------------------------------------------------------
  */

  if (
    req.query.search &&
    normalizeText(
      req.query.search
    )
  ) {
    const searchRegex =
      new RegExp(
        escapeRegex(
          normalizeText(
            req.query.search
          )
        ),
        "i"
      );

    filter.$or = [
      {
        employeeIdSnapshot:
          searchRegex
      },
      {
        staffNameSnapshot:
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
        remarks:
          searchRegex
      }
    ];
  }

  /*
  |--------------------------------------------------------------------------
  | Department
  |--------------------------------------------------------------------------
  */

  if (
    req.query.department
  ) {
    filter.departmentSnapshot =
      new RegExp(
        `^${escapeRegex(
          normalizeText(
            req.query.department
          )
        )}$`,
        "i"
      );
  }

  return {
    filter,
    schoolScope
  };
};

/*
|--------------------------------------------------------------------------
| Daily Attendance Summary
|--------------------------------------------------------------------------
*/

const createDailySummary = (
  attendanceRows
) => {
  const summary = {
    totalStaff:
      attendanceRows.length,

    marked: 0,
    unmarked: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    halfDay: 0
  };

  attendanceRows.forEach(
    (row) => {
      if (!row.attendance) {
        summary.unmarked += 1;
        return;
      }

      summary.marked += 1;

      if (
        row.attendance.status ===
        "present"
      ) {
        summary.present += 1;
      }

      if (
        row.attendance.status ===
        "absent"
      ) {
        summary.absent += 1;
      }

      if (
        row.attendance.status ===
        "late"
      ) {
        summary.late += 1;
      }

      if (
        row.attendance.status ===
        "leave"
      ) {
        summary.leave += 1;
      }

      if (
        row.attendance.status ===
        "half_day"
      ) {
        summary.halfDay += 1;
      }
    }
  );

  return summary;
};

/*
|--------------------------------------------------------------------------
| Mark Daily Staff Attendance
|--------------------------------------------------------------------------
|
| Payload example:
|
| {
|   schoolId: "...",
|   attendanceDate: "2026-07-27",
|   records: [
|     {
|       staffId: "...",
|       status: "present",
|       checkInTime: "08:00",
|       checkOutTime: "16:00"
|     }
|   ]
| }
|
*/

exports.markDailyAttendance =
  async (req, res) => {
    try {
      const schoolResult =
        resolveRequiredSchoolId(
          req,
          "body"
        );

      if (schoolResult.error) {
        return res
          .status(
            schoolResult.statusCode
          )
          .json({
            success: false,
            message:
              schoolResult.error
          });
      }

      const {
        schoolId
      } = schoolResult;

      const schoolVerification =
        await verifySchool(
          schoolId,
          {
            requireActive: true
          }
        );

      if (
        schoolVerification.error
      ) {
        return res
          .status(
            schoolVerification
              .statusCode
          )
          .json({
            success: false,

            message:
              schoolVerification.error
          });
      }

      const attendanceDate =
        normalizeAttendanceDate(
          req.body
            .attendanceDate
        );

      if (!attendanceDate) {
        return res.status(400).json({
          success: false,

          message:
            "A valid attendance date is required"
        });
      }

      if (
        !Array.isArray(
          req.body.records
        ) ||
        req.body.records.length ===
          0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "At least one attendance record is required"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Duplicate Staff IDs
      |--------------------------------------------------------------------------
      */

      const staffIds =
        req.body.records.map(
          (record) =>
            normalizeText(
              record.staffId
            )
        );

      const invalidStaffId =
        staffIds.find(
          (staffId) =>
            !isValidObjectId(
              staffId
            )
        );

      if (invalidStaffId) {
        return res.status(400).json({
          success: false,

          message:
            "One or more staff IDs are invalid"
        });
      }

      const uniqueStaffIds = [
        ...new Set(
          staffIds
        )
      ];

      if (
        uniqueStaffIds.length !==
        staffIds.length
      ) {
        return res.status(400).json({
          success: false,

          message:
            "A staff member cannot appear more than once in the same attendance request"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Verify Staff Members
      |--------------------------------------------------------------------------
      */

      const staffMembers =
        await Staff.find({
          _id: {
            $in:
              uniqueStaffIds
          },

          schoolId,

          isDeleted: {
            $ne: true
          },

          status: {
            $in:
              ATTENDANCE_STAFF_STATUSES
          }
        });

      if (
        staffMembers.length !==
        uniqueStaffIds.length
      ) {
        return res.status(400).json({
          success: false,

          message:
            "One or more staff members do not belong to this school, are deleted, inactive, resigned or terminated"
        });
      }

      const staffMap =
        new Map(
          staffMembers.map(
            (staffMember) => [
              String(
                staffMember._id
              ),

              staffMember
            ]
          )
        );

      /*
      |--------------------------------------------------------------------------
      | Existing Records Including Deleted
      |--------------------------------------------------------------------------
      */

      const existingRecords =
        await StaffAttendance.find({
          schoolId,

          staffId: {
            $in:
              uniqueStaffIds
          },

          attendanceDate
        });

      const existingMap =
        new Map(
          existingRecords.map(
            (record) => [
              String(
                record.staffId
              ),

              record
            ]
          )
        );

      /*
      |--------------------------------------------------------------------------
      | Build and Validate Documents
      |--------------------------------------------------------------------------
      */

      const attendanceDocuments =
        [];

      const previousSnapshots =
        [];

      for (
        const record of
        req.body.records
      ) {
        const staffId =
          normalizeText(
            record.staffId
          );

        const staffMember =
          staffMap.get(
            staffId
          );

        const payload =
          buildAttendancePayload(
            record
          );

        const validationError =
          validateAttendancePayload(
            payload
          );

        if (validationError) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                `${staffMember.name}: ${validationError}`
            });
        }

        let attendance =
          existingMap.get(
            staffId
          );

        previousSnapshots.push(
          attendance
            ? getAttendanceAuditSnapshot(
                attendance
              )
            : null
        );

        if (!attendance) {
          attendance =
            new StaffAttendance({
              schoolId,
              staffId,
              attendanceDate,
              markedBy:
                req.user._id
            });
        }

        Object.entries(
          payload
        ).forEach(
          ([
            field,
            value
          ]) => {
            attendance[field] =
              value;
          }
        );

        attendance.schoolId =
          schoolId;

        attendance.staffId =
          staffId;

        attendance.attendanceDate =
          attendanceDate;

        attendance.employeeIdSnapshot =
          staffMember.employeeId ||
          "";

        attendance.staffNameSnapshot =
          staffMember.name ||
          "";

        attendance.departmentSnapshot =
          staffMember.department ||
          "";

        attendance.designationSnapshot =
          staffMember.designation ||
          "";

        attendance.updatedBy =
          req.user._id;

        /*
        | Re-marking restores an earlier deleted record.
        */

        attendance.isDeleted =
          false;

        attendance.deletedAt =
          null;

        attendance.deletedBy =
          null;

        await attendance.validate();

        attendanceDocuments.push(
          attendance
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Save Attendance Documents
      |--------------------------------------------------------------------------
      */

      const savedRecords = [];

      for (
        const attendance of
        attendanceDocuments
      ) {
        await attendance.save();

        savedRecords.push(
          attendance
        );
      }

      const populatedRecords =
        await populateAttendance(
          StaffAttendance.find({
            _id: {
              $in:
                savedRecords.map(
                  (record) =>
                    record._id
                )
            }
          })
        ).sort({
          staffNameSnapshot: 1
        });

      await recordAuditLog({
        req,
        schoolId,
        action:
          "CREATE_OR_UPDATE",
        module:
          "STAFF_ATTENDANCE",

        recordId:
          savedRecords[0]?._id ||
          null,

        recordModel:
          "StaffAttendance",

        description:
          `${req.user.role} marked attendance for ${savedRecords.length} staff member(s) on ${getDateKey(
            attendanceDate
          )}`,

        oldData:
          previousSnapshots,

        newData:
          savedRecords.map(
            getAttendanceAuditSnapshot
          ),

        status: "success"
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            `Attendance saved successfully for ${savedRecords.length} staff member(s)`,

          attendanceDate,

          count:
            populatedRecords.length,

          records:
            populatedRecords
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to mark staff attendance"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Daily Attendance Register
|--------------------------------------------------------------------------
|
| تمام active/on-leave staff members دکھائے جائیں گے۔
| جن کی attendance mark نہیں ہوئی ان کا attendance field null ہوگا۔
|
*/

exports.getDailyAttendance =
  async (req, res) => {
    try {
      const schoolResult =
        resolveRequiredSchoolId(
          req,
          "query"
        );

      if (schoolResult.error) {
        return res
          .status(
            schoolResult.statusCode
          )
          .json({
            success: false,
            message:
              schoolResult.error
          });
      }

      const {
        schoolId
      } = schoolResult;

      const attendanceDate =
        normalizeAttendanceDate(
          req.query
            .attendanceDate
        );

      if (!attendanceDate) {
        return res.status(400).json({
          success: false,

          message:
            "A valid attendance date is required"
        });
      }

      const staffFilter = {
        schoolId,

        isDeleted: {
          $ne: true
        },

        status: {
          $in:
            ATTENDANCE_STAFF_STATUSES
        }
      };

      /*
      |--------------------------------------------------------------------------
      | Optional Staff Filters
      |--------------------------------------------------------------------------
      */

      if (
        req.query.category
      ) {
        staffFilter.category =
          normalizeText(
            req.query.category
          ).toLowerCase();
      }

      if (
        req.query.department
      ) {
        staffFilter.department =
          new RegExp(
            `^${escapeRegex(
              normalizeText(
                req.query
                  .department
              )
            )}$`,
            "i"
          );
      }

      if (
        req.query.search &&
        normalizeText(
          req.query.search
        )
      ) {
        const searchRegex =
          new RegExp(
            escapeRegex(
              normalizeText(
                req.query.search
              )
            ),
            "i"
          );

        staffFilter.$or = [
          {
            employeeId:
              searchRegex
          },
          {
            name:
              searchRegex
          },
          {
            phone:
              searchRegex
          },
          {
            department:
              searchRegex
          },
          {
            designation:
              searchRegex
          }
        ];
      }

      const [
        staffMembers,
        attendanceRecords
      ] = await Promise.all([
        Staff.find(
          staffFilter
        )
          .select(
            "employeeId name fatherName phone staffPhoto gender category department designation employmentType shift status"
          )
          .sort({
            name: 1
          })
          .lean(),

        StaffAttendance.find({
          schoolId,
          attendanceDate,

          isDeleted: {
            $ne: true
          }
        })
          .populate(
            "markedBy",
            "name email role"
          )
          .populate(
            "updatedBy",
            "name email role"
          )
          .lean()
      ]);

      const attendanceMap =
        new Map(
          attendanceRecords.map(
            (attendance) => [
              String(
                attendance.staffId
              ),

              attendance
            ]
          )
        );

      const attendanceRows =
        staffMembers.map(
          (staffMember) => {
            const attendance =
              attendanceMap.get(
                String(
                  staffMember._id
                )
              ) ||
              null;

            if (!attendance) {
              return {
                staff:
                  staffMember,

                attendance: null
              };
            }

            const workingMinutes =
              calculateWorkingMinutes(
                attendance
              );

            return {
              staff:
                staffMember,

              attendance: {
                ...attendance,

                workingMinutes,

                workingHours:
                  formatWorkingTime(
                    workingMinutes
                  )
              }
            };
          }
        );

      const summary =
        createDailySummary(
          attendanceRows
        );

      return res.status(200).json({
        success: true,
        attendanceDate,
        schoolId,
        summary,
        staff:
          attendanceRows
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch daily staff attendance"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Attendance Records
|--------------------------------------------------------------------------
*/

exports.getAttendanceRecords =
  async (req, res) => {
    try {
      const filterResult =
        buildAttendanceFilter(
          req,
          {
            deleted: false
          }
        );

      if (filterResult.error) {
        return res
          .status(
            filterResult.statusCode ||
              400
          )
          .json({
            success: false,
            message:
              filterResult.error
          });
      }

      const {
        filter
      } = filterResult;

      const {
        page,
        limit,
        skip
      } = getPaginationOptions(
        req.query
      );

      const [
        attendance,
        total
      ] = await Promise.all([
        populateAttendance(
          StaffAttendance.find(
            filter
          )
        )
          .sort({
            attendanceDate: -1,
            staffNameSnapshot: 1
          })
          .skip(skip)
          .limit(limit),

        StaffAttendance.countDocuments(
          filter
        )
      ]);

      const records =
        attendance.map(
          (record) => {
            const object =
              record.toJSON();

            const workingMinutes =
              calculateWorkingMinutes(
                object
              );

            return {
              ...object,

              workingMinutes,

              workingHours:
                formatWorkingTime(
                  workingMinutes
                )
            };
          }
        );

      return res.status(200).json({
        success: true,
        count:
          records.length,
        attendance:
          records,

        pagination:
          buildPagination({
            total,
            page,
            limit
          })
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch staff attendance records"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Monthly Attendance Report
|--------------------------------------------------------------------------
|
| Query:
| schoolId
| year
| month
| staffId
| department
|
*/

exports.getMonthlyAttendanceReport =
  async (req, res) => {
    try {
      const schoolResult =
        resolveRequiredSchoolId(
          req,
          "query"
        );

      if (schoolResult.error) {
        return res
          .status(
            schoolResult.statusCode
          )
          .json({
            success: false,
            message:
              schoolResult.error
          });
      }

      const {
        schoolId
      } = schoolResult;

      const now = new Date();

      const year =
        Number(
          req.query.year ||
            now.getUTCFullYear()
        );

      const month =
        Number(
          req.query.month ||
            now.getUTCMonth() +
              1
        );

      if (
        !Number.isInteger(year) ||
        year < 2000 ||
        year > 2100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid report year"
        });
      }

      if (
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Report month must be between 1 and 12"
        });
      }

      const startDate =
        new Date(
          Date.UTC(
            year,
            month - 1,
            1
          )
        );

      const endDate =
        new Date(
          Date.UTC(
            year,
            month,
            0
          )
        );

      const staffFilter = {
        schoolId,

        isDeleted: {
          $ne: true
        }
      };

      if (
        req.query.staffId
      ) {
        if (
          !isValidObjectId(
            req.query.staffId
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid staff ID format"
            });
        }

        staffFilter._id =
          req.query.staffId;
      }

      if (
        req.query.department
      ) {
        staffFilter.department =
          new RegExp(
            `^${escapeRegex(
              normalizeText(
                req.query
                  .department
              )
            )}$`,
            "i"
          );
      }

      const staffMembers =
        await Staff.find(
          staffFilter
        )
          .select(
            "employeeId name phone staffPhoto category department designation employmentType shift status"
          )
          .sort({
            name: 1
          })
          .lean();

      const staffIds =
        staffMembers.map(
          (staffMember) =>
            staffMember._id
        );

      const attendanceRecords =
        staffIds.length > 0
          ? await StaffAttendance.find({
              schoolId,

              staffId: {
                $in:
                  staffIds
              },

              attendanceDate: {
                $gte:
                  startDate,
                $lte:
                  endDate
              },

              isDeleted: {
                $ne: true
              }
            })
              .sort({
                attendanceDate: 1
              })
              .lean()
          : [];

      const recordsByStaff =
        new Map();

      const recordedDateKeys =
        new Set();

      const overallSummary = {
        totalRecords: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        halfDay: 0,
        totalLateMinutes: 0,
        totalOvertimeMinutes: 0,
        totalWorkingMinutes: 0
      };

      attendanceRecords.forEach(
        (record) => {
          const staffId =
            String(
              record.staffId
            );

          if (
            !recordsByStaff.has(
              staffId
            )
          ) {
            recordsByStaff.set(
              staffId,
              []
            );
          }

          recordsByStaff
            .get(staffId)
            .push(record);

          recordedDateKeys.add(
            getDateKey(
              record.attendanceDate
            )
          );

          overallSummary.totalRecords +=
            1;

          if (
            record.status ===
            "present"
          ) {
            overallSummary.present +=
              1;
          }

          if (
            record.status ===
            "absent"
          ) {
            overallSummary.absent +=
              1;
          }

          if (
            record.status ===
            "late"
          ) {
            overallSummary.late +=
              1;
          }

          if (
            record.status ===
            "leave"
          ) {
            overallSummary.leave +=
              1;
          }

          if (
            record.status ===
            "half_day"
          ) {
            overallSummary.halfDay +=
              1;
          }

          overallSummary
            .totalLateMinutes +=
            Number(
              record.lateMinutes ||
                0
            );

          overallSummary
            .totalOvertimeMinutes +=
            Number(
              record
                .overtimeMinutes ||
                0
            );

          overallSummary
            .totalWorkingMinutes +=
            calculateWorkingMinutes(
              record
            );
        }
      );

      const report =
        staffMembers.map(
          (staffMember) => {
            const records =
              recordsByStaff.get(
                String(
                  staffMember._id
                )
              ) || [];

            const totals = {
              totalMarked:
                records.length,

              present: 0,
              absent: 0,
              late: 0,
              leave: 0,
              halfDay: 0,
              totalLateMinutes: 0,
              totalOvertimeMinutes: 0,
              totalWorkingMinutes: 0
            };

            records.forEach(
              (record) => {
                if (
                  record.status ===
                  "present"
                ) {
                  totals.present +=
                    1;
                }

                if (
                  record.status ===
                  "absent"
                ) {
                  totals.absent +=
                    1;
                }

                if (
                  record.status ===
                  "late"
                ) {
                  totals.late +=
                    1;
                }

                if (
                  record.status ===
                  "leave"
                ) {
                  totals.leave +=
                    1;
                }

                if (
                  record.status ===
                  "half_day"
                ) {
                  totals.halfDay +=
                    1;
                }

                totals.totalLateMinutes +=
                  Number(
                    record
                      .lateMinutes ||
                      0
                  );

                totals
                  .totalOvertimeMinutes +=
                  Number(
                    record
                      .overtimeMinutes ||
                      0
                  );

                totals
                  .totalWorkingMinutes +=
                  calculateWorkingMinutes(
                    record
                  );
              }
            );

            const attendancePoints =
              totals.present +
              totals.late +
              totals.halfDay *
                0.5;

            const attendancePercentage =
              totals.totalMarked > 0
                ? Number(
                    (
                      attendancePoints /
                      totals.totalMarked *
                      100
                    ).toFixed(2)
                  )
                : 0;

            return {
              staff:
                staffMember,

              summary: {
                ...totals,

                attendancePercentage,

                workingHours:
                  formatWorkingTime(
                    totals
                      .totalWorkingMinutes
                  ),

                overtimeHours:
                  formatWorkingTime(
                    totals
                      .totalOvertimeMinutes
                  )
              },

              records:
                records.map(
                  (record) => {
                    const workingMinutes =
                      calculateWorkingMinutes(
                        record
                      );

                    return {
                      ...record,

                      workingMinutes,

                      workingHours:
                        formatWorkingTime(
                          workingMinutes
                        )
                    };
                  }
                )
            };
          }
        );

      return res.status(200).json({
        success: true,

        period: {
          year,
          month,
          startDate,
          endDate
        },

        recordedDays:
          recordedDateKeys.size,

        totalStaff:
          staffMembers.length,

        overallSummary: {
          ...overallSummary,

          workingHours:
            formatWorkingTime(
              overallSummary
                .totalWorkingMinutes
            ),

          overtimeHours:
            formatWorkingTime(
              overallSummary
                .totalOvertimeMinutes
            )
        },

        report
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to generate monthly staff attendance report"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Single Attendance Record
|--------------------------------------------------------------------------
*/

exports.getAttendanceById =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid attendance ID format"
        });
      }

      const schoolScope =
        getSchoolScope(req);

      if (schoolScope.error) {
        return res
          .status(
            schoolScope.statusCode
          )
          .json({
            success: false,
            message:
              schoolScope.error
          });
      }

      const attendance =
        await populateAttendance(
          StaffAttendance.findOne({
            _id: req.params.id,
            ...schoolScope.filter,

            isDeleted: {
              $ne: true
            }
          })
        );

      if (!attendance) {
        return res.status(404).json({
          success: false,

          message:
            "Attendance record not found or access is not allowed"
        });
      }

      const attendanceObject =
        attendance.toJSON();

      const workingMinutes =
        calculateWorkingMinutes(
          attendanceObject
        );

      return res.status(200).json({
        success: true,

        attendance: {
          ...attendanceObject,

          workingMinutes,

          workingHours:
            formatWorkingTime(
              workingMinutes
            )
        }
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch staff attendance record"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Update Attendance Record
|--------------------------------------------------------------------------
*/

exports.updateAttendance =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid attendance ID format"
        });
      }

      const schoolScope =
        getSchoolScope(req);

      if (schoolScope.error) {
        return res
          .status(
            schoolScope.statusCode
          )
          .json({
            success: false,
            message:
              schoolScope.error
          });
      }

      const attendance =
        await StaffAttendance.findOne({
          _id: req.params.id,
          ...schoolScope.filter,

          isDeleted: {
            $ne: true
          }
        });

      if (!attendance) {
        return res.status(404).json({
          success: false,

          message:
            "Attendance record not found or access is not allowed"
        });
      }

      const oldData =
        getAttendanceAuditSnapshot(
          attendance
        );

      const payload =
        buildAttendancePayload(
          req.body
        );

      const completePayload = {
        status:
          payload.status ??
          attendance.status,

        checkInTime:
          payload.checkInTime ??
          attendance.checkInTime,

        checkOutTime:
          payload.checkOutTime ??
          attendance.checkOutTime,

        breakMinutes:
          payload.breakMinutes ??
          attendance.breakMinutes,

        overtimeMinutes:
          payload.overtimeMinutes ??
          attendance.overtimeMinutes,

        lateMinutes:
          payload.lateMinutes ??
          attendance.lateMinutes,

        leaveType:
          payload.leaveType ??
          attendance.leaveType,

        leaveReason:
          payload.leaveReason ??
          attendance.leaveReason,

        remarks:
          payload.remarks ??
          attendance.remarks
      };

      const validationError =
        validateAttendancePayload(
          completePayload
        );

      if (validationError) {
        return res.status(400).json({
          success: false,
          message:
            validationError
        });
      }

      Object.entries(
        payload
      ).forEach(
        ([
          field,
          value
        ]) => {
          attendance[field] =
            value;
        }
      );

      attendance.updatedBy =
        req.user._id;

      await attendance.save();

      const populatedAttendance =
        await populateAttendance(
          StaffAttendance.findById(
            attendance._id
          )
        );

      await recordAuditLog({
        req,
        schoolId:
          attendance.schoolId,
        action: "UPDATE",
        module:
          "STAFF_ATTENDANCE",

        recordId:
          attendance._id,

        recordModel:
          "StaffAttendance",

        description:
          `${req.user.role} updated staff attendance for ${attendance.staffNameSnapshot} on ${getDateKey(
            attendance
              .attendanceDate
          )}`,

        oldData,

        newData:
          getAttendanceAuditSnapshot(
            attendance
          ),

        status: "success"
      });

      return res.status(200).json({
        success: true,

        message:
          "Staff attendance updated successfully",

        attendance:
          populatedAttendance
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to update staff attendance"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Attendance
|--------------------------------------------------------------------------
*/

exports.deleteAttendance =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid attendance ID format"
        });
      }

      const schoolScope =
        getSchoolScope(req);

      if (schoolScope.error) {
        return res
          .status(
            schoolScope.statusCode
          )
          .json({
            success: false,
            message:
              schoolScope.error
          });
      }

      const attendance =
        await StaffAttendance.findOne({
          _id: req.params.id,
          ...schoolScope.filter,

          isDeleted: {
            $ne: true
          }
        });

      if (!attendance) {
        return res.status(404).json({
          success: false,

          message:
            "Attendance record not found or access is not allowed"
        });
      }

      const oldData =
        getAttendanceAuditSnapshot(
          attendance
        );

      attendance.isDeleted =
        true;

      attendance.deletedAt =
        new Date();

      attendance.deletedBy =
        req.user._id;

      attendance.updatedBy =
        req.user._id;

      await attendance.save();

      await recordAuditLog({
        req,
        schoolId:
          attendance.schoolId,
        action: "DELETE",
        module:
          "STAFF_ATTENDANCE",

        recordId:
          attendance._id,

        recordModel:
          "StaffAttendance",

        description:
          `${req.user.role} deleted staff attendance for ${attendance.staffNameSnapshot} on ${getDateKey(
            attendance
              .attendanceDate
          )}`,

        oldData,

        newData: {
          isDeleted: true,
          deletedAt:
            attendance.deletedAt
        },

        status: "success"
      });

      return res.status(200).json({
        success: true,

        message:
          "Staff attendance deleted successfully"
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to delete staff attendance"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Attendance Records
|--------------------------------------------------------------------------
*/

exports.getDeletedAttendance =
  async (req, res) => {
    try {
      const filterResult =
        buildAttendanceFilter(
          req,
          {
            deleted: true
          }
        );

      if (filterResult.error) {
        return res
          .status(
            filterResult.statusCode ||
              400
          )
          .json({
            success: false,
            message:
              filterResult.error
          });
      }

      const {
        filter
      } = filterResult;

      const {
        page,
        limit,
        skip
      } = getPaginationOptions(
        req.query
      );

      const [
        attendance,
        total
      ] = await Promise.all([
        populateAttendance(
          StaffAttendance.find(
            filter
          )
        )
          .sort({
            deletedAt: -1,
            attendanceDate: -1
          })
          .skip(skip)
          .limit(limit),

        StaffAttendance.countDocuments(
          filter
        )
      ]);

      return res.status(200).json({
        success: true,
        count:
          attendance.length,
        attendance,

        pagination:
          buildPagination({
            total,
            page,
            limit
          })
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch deleted staff attendance records"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Restore Attendance Record
|--------------------------------------------------------------------------
*/

exports.restoreAttendance =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid attendance ID format"
        });
      }

      const schoolScope =
        getSchoolScope(req);

      if (schoolScope.error) {
        return res
          .status(
            schoolScope.statusCode
          )
          .json({
            success: false,
            message:
              schoolScope.error
          });
      }

      const attendance =
        await StaffAttendance.findOne({
          _id: req.params.id,
          ...schoolScope.filter,
          isDeleted: true
        });

      if (!attendance) {
        return res.status(404).json({
          success: false,

          message:
            "Deleted attendance record not found or access is not allowed"
        });
      }

      attendance.isDeleted =
        false;

      attendance.deletedAt =
        null;

      attendance.deletedBy =
        null;

      attendance.updatedBy =
        req.user._id;

      await attendance.save();

      const populatedAttendance =
        await populateAttendance(
          StaffAttendance.findById(
            attendance._id
          )
        );

      await recordAuditLog({
        req,
        schoolId:
          attendance.schoolId,
        action: "RESTORE",
        module:
          "STAFF_ATTENDANCE",

        recordId:
          attendance._id,

        recordModel:
          "StaffAttendance",

        description:
          `${req.user.role} restored staff attendance for ${attendance.staffNameSnapshot} on ${getDateKey(
            attendance
              .attendanceDate
          )}`,

        oldData: {
          isDeleted: true
        },

        newData: {
          isDeleted: false
        },

        status: "success"
      });

      return res.status(200).json({
        success: true,

        message:
          "Staff attendance restored successfully",

        attendance:
          populatedAttendance
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to restore staff attendance"
      );
    }
  };