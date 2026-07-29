const mongoose = require("mongoose");

const TimetableConfig = require("../models/TimetableConfig");
const TimetableEntry = require("../models/TimetableEntry");
const ClassModel = require("../models/Class");
const Subject = require("../models/Subject");
const Teacher = require("../models/Teacher");

/*
|--------------------------------------------------------------------------
| Optional Audit Log Helper
|--------------------------------------------------------------------------
*/

let auditLogHelper = null;

try {
  auditLogHelper = require("../utils/auditLogHelper");
} catch (error) {
  auditLogHelper = null;
}

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

const VIEW_ROLES = [
  "super_admin",
  "principal",
  "teacher"
];

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

const ALLOWED_SORT_FIELDS = [
  "day",
  "rotationWeekCode",
  "periodSnapshot.sequence",
  "classSnapshot.name",
  "subjectSnapshot.name",
  "teacherSnapshot.name",
  "entryStatus",
  "createdAt",
  "updatedAt"
];

const MAX_BULK_ENTRIES = 300;

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const getUserId = (request) => {
  return (
    request.user?._id ||
    request.user?.id ||
    null
  );
};

const getUserRole = (request) => {
  return String(
    request.user?.role || ""
  ).toLowerCase();
};

const getAssignedSchoolId = (request) => {
  const school =
    request.schoolId ||
    request.user?.schoolId ||
    request.user?.school;

  if (!school) {
    return null;
  }

  if (typeof school === "object") {
    return (
      school._id ||
      school.id ||
      null
    );
  }

  return school;
};

const isSuperAdmin = (request) => {
  return (
    getUserRole(request) ===
    "super_admin"
  );
};

const canManageTimetable = (request) => {
  return MANAGEMENT_ROLES.includes(
    getUserRole(request)
  );
};

const canViewTimetable = (request) => {
  return VIEW_ROLES.includes(
    getUserRole(request)
  );
};

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

const parsePositiveInteger = (
  value,
  fallback,
  maximum = 100
) => {
  const parsedValue = Number.parseInt(
    value,
    10
  );

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 1
  ) {
    return fallback;
  }

  return Math.min(
    parsedValue,
    maximum
  );
};

const parseBoolean = (value) => {
  if (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === 0 ||
    value === "0"
  ) {
    return false;
  }

  return undefined;
};

const normalizeText = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ");
};

const normalizeRotationCode = (value) => {
  const normalized = String(
    value || "STANDARD"
  )
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-_]/g, "");

  return normalized || "STANDARD";
};

const normalizeSectionName = (value) => {
  return normalizeText(value || "") || "";
};

const buildSectionKey = (value) => {
  const normalized = normalizeSectionName(
    value
  )
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-_]/g, "");

  return normalized || "__ALL__";
};

const buildRoomKey = (room) => {
  const value =
    room?.code ||
    room?.name ||
    "";

  const normalized = String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-_]/g, "");

  return normalized || null;
};

const escapeRegex = (value) => {
  return String(value || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const getDayOrder = (day) => {
  const index = DAYS_OF_WEEK.indexOf(
    String(day || "").toLowerCase()
  );

  return index === -1
    ? 999
    : index;
};

const sendError = (
  response,
  statusCode,
  message,
  details = undefined
) => {
  return response.status(statusCode).json({
    success: false,
    message,
    ...(details !== undefined
      ? {
          details
        }
      : {})
  });
};

const getValidationMessages = (error) => {
  return Object.values(
    error?.errors || {}
  ).map((item) => item.message);
};

const getDuplicateKeyMessage = (error) => {
  const indexName =
    error?.message ||
    error?.errmsg ||
    "";

  if (
    indexName.includes(
      "unique_class_timetable_slot"
    )
  ) {
    return (
      "This class or section already has another assignment in the selected period."
    );
  }

  if (
    indexName.includes(
      "unique_teacher_timetable_slot"
    )
  ) {
    return (
      "The selected teacher is already assigned to another class in this period."
    );
  }

  if (
    indexName.includes(
      "unique_room_timetable_slot"
    )
  ) {
    return (
      "The selected room or resource is already assigned in this period."
    );
  }

  return (
    "This timetable slot conflicts with an existing assignment."
  );
};

/*
|--------------------------------------------------------------------------
| Audit Helper
|--------------------------------------------------------------------------
*/

const createAuditEntry = async ({
  request,
  action,
  entityId,
  description,
  schoolId,
  oldData = null,
  newData = null
}) => {
  if (!auditLogHelper) {
    return;
  }

  try {
    const payload = {
      action,
      module:
        "timetable_management",
      entityType:
        "TimetableEntry",
      entityId,
      description,
      schoolId,
      oldData,
      newData,
      performedBy:
        getUserId(request),
      userId:
        getUserId(request),
      ipAddress:
        request.ip,
      userAgent:
        request.get?.("user-agent")
    };

    if (
      typeof auditLogHelper ===
      "function"
    ) {
      await auditLogHelper(payload);
      return;
    }

    if (
      typeof auditLogHelper.createAuditLog ===
      "function"
    ) {
      await auditLogHelper.createAuditLog(
        payload
      );
      return;
    }

    if (
      typeof auditLogHelper.logAction ===
      "function"
    ) {
      await auditLogHelper.logAction(
        payload
      );
    }
  } catch (error) {
    console.error(
      "Timetable entry audit error:",
      error.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| School Scope Helpers
|--------------------------------------------------------------------------
*/

const resolveRequestedSchoolId = (
  request,
  requestedSchoolId
) => {
  if (isSuperAdmin(request)) {
    return requestedSchoolId || null;
  }

  return (
    getAssignedSchoolId(request) ||
    null
  );
};

const buildSchoolScopeFilter = (
  request,
  requestedSchoolId
) => {
  if (isSuperAdmin(request)) {
    return requestedSchoolId
      ? {
          schoolId: requestedSchoolId
        }
      : {};
  }

  const schoolId =
    getAssignedSchoolId(request);

  return {
    schoolId: schoolId || null
  };
};

const verifySchoolScope = (
  request,
  schoolId
) => {
  if (
    !schoolId ||
    !isValidObjectId(schoolId)
  ) {
    return {
      allowed: false,
      message:
        "A valid school is required."
    };
  }

  if (isSuperAdmin(request)) {
    return {
      allowed: true
    };
  }

  const assignedSchoolId =
    getAssignedSchoolId(request);

  if (
    !assignedSchoolId ||
    String(assignedSchoolId) !==
      String(schoolId)
  ) {
    return {
      allowed: false,
      message:
        "You cannot access another school's timetable."
    };
  }

  return {
    allowed: true
  };
};

/*
|--------------------------------------------------------------------------
| Population Helpers
|--------------------------------------------------------------------------
*/

const populateTimetableEntry = (query) => {
  return query
    .populate(
      "schoolId",
      "schoolName type logo sessionYear isActive"
    )
    .populate(
      "timetableConfigId",
      "title code academicYear academicTerm status isActive isLocked rotationCycle daySchedules rules versionNumber"
    )
    .populate(
      "classId",
      "className numericOrder sections isActive"
    )
    .populate(
      "subjectId",
      "subjectName subjectCode classId teacherId isActive"
    )
    .populate(
      "teacherId",
      "name employeeId qualification subjects status"
    )
    .populate(
      "createdBy",
      "name email role"
    )
    .populate(
      "updatedBy",
      "name email role"
    )
    .populate(
      "cancelledBy",
      "name email role"
    )
    .populate(
      "deletedBy",
      "name email role"
    );
};

const serializeEntry = (entry) => {
  if (!entry) {
    return null;
  }

  if (
    typeof entry.toJSON ===
    "function"
  ) {
    return entry.toJSON();
  }

  return entry;
};

/*
|--------------------------------------------------------------------------
| Timetable Configuration Helpers
|--------------------------------------------------------------------------
*/

const findScopedTimetableConfig = async (
  request,
  timetableConfigId,
  options = {}
) => {
  const {
    requireEditable = false,
    allowActiveFallback = false,
    requestedSchoolId = null
  } = options;

  let filter = {
    ...buildSchoolScopeFilter(
      request,
      requestedSchoolId
    ),
    isDeleted: {
      $ne: true
    }
  };

  if (timetableConfigId) {
    if (
      !isValidObjectId(
        timetableConfigId
      )
    ) {
      return null;
    }

    filter._id = timetableConfigId;
  } else if (allowActiveFallback) {
    filter.status = "published";
    filter.isActive = true;
  } else {
    return null;
  }

  if (
    getUserRole(request) ===
    "teacher"
  ) {
    filter.status = "published";
  }

  const timetableConfig =
    await TimetableConfig.findOne(
      filter
    );

  if (!timetableConfig) {
    return null;
  }

  if (
    requireEditable &&
    timetableConfig.isLocked
  ) {
    return {
      locked: true,
      timetableConfig
    };
  }

  return {
    locked: false,
    timetableConfig
  };
};

const getPeriodFromConfig = (
  timetableConfig,
  day,
  periodId
) => {
  const normalizedDay = String(
    day || ""
  ).toLowerCase();

  const daySchedule =
    timetableConfig.daySchedules?.find(
      (schedule) =>
        schedule.day === normalizedDay
    );

  if (!daySchedule) {
    return {
      daySchedule: null,
      period: null
    };
  }

  const period =
    daySchedule.periods?.id
      ? daySchedule.periods.id(
          periodId
        )
      : daySchedule.periods?.find(
          (item) =>
            String(item._id) ===
            String(periodId)
        );

  return {
    daySchedule,
    period: period || null
  };
};

/*
|--------------------------------------------------------------------------
| Entry Payload and Reference Validation
|--------------------------------------------------------------------------
*/

const buildEntryPayload = (
  body,
  options = {}
) => {
  const {
    includeStatus = false
  } = options;

  const allowedFields = [
    "timetableConfigId",
    "rotationWeekCode",
    "rotationWeekLabel",
    "day",
    "periodId",
    "classId",
    "sectionName",
    "subjectId",
    "teacherId",
    "room",
    "entryType",
    "deliveryMode",
    "onlineMeetingUrl",
    "lessonGroupId",
    "assignmentSource",
    "priority",
    "isFixed",
    "displayColor",
    "tags",
    "notes"
  ];

  const payload = {};

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
  });

  if (payload.day !== undefined) {
    payload.day = String(
      payload.day
    )
      .trim()
      .toLowerCase();
  }

  if (
    payload.sectionName !==
    undefined
  ) {
    payload.sectionName =
      normalizeSectionName(
        payload.sectionName
      );
  }

  if (
    payload.rotationWeekCode !==
    undefined
  ) {
    payload.rotationWeekCode =
      normalizeRotationCode(
        payload.rotationWeekCode
      );
  }

  if (
    payload.notes !== undefined
  ) {
    payload.notes =
      normalizeText(payload.notes);
  }

  if (
    payload.onlineMeetingUrl !==
    undefined
  ) {
    payload.onlineMeetingUrl =
      normalizeText(
        payload.onlineMeetingUrl
      );
  }

  if (
    includeStatus &&
    body.entryStatus !== undefined
  ) {
    payload.entryStatus =
      body.entryStatus;
  }

  return payload;
};

const resolveEntryReferences = async ({
  request,
  timetableConfig,
  rawPayload,
  existingEntry = null
}) => {
  const payload = {
    ...(existingEntry
      ? existingEntry.toObject({
          virtuals: false
        })
      : {}),
    ...rawPayload
  };

  delete payload._id;
  delete payload.id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;

  const schoolId =
    timetableConfig.schoolId;

  const classId =
    payload.classId;

  if (
    !classId ||
    !isValidObjectId(classId)
  ) {
    return {
      error:
        "A valid class is required."
    };
  }

  const classRecord =
    await ClassModel.findOne({
      _id: classId,
      schoolId,
      isDeleted: {
        $ne: true
      },
      isActive: {
        $ne: false
      }
    });

  if (!classRecord) {
    return {
      error:
        "The selected active class was not found in this school."
    };
  }

  const sectionName =
    normalizeSectionName(
      payload.sectionName
    );

  if (
    sectionName &&
    Array.isArray(
      classRecord.sections
    ) &&
    classRecord.sections.length > 0
  ) {
    const sectionExists =
      classRecord.sections.some(
        (section) =>
          String(
            section.sectionName || ""
          )
            .trim()
            .toLowerCase() ===
          sectionName.toLowerCase()
      );

    if (!sectionExists) {
      return {
        error:
          `Section ${sectionName} is not configured for ${classRecord.className}.`
      };
    }
  }

  let subjectRecord = null;

  if (payload.subjectId) {
    if (
      !isValidObjectId(
        payload.subjectId
      )
    ) {
      return {
        error:
          "The selected subject ID is invalid."
      };
    }

    subjectRecord =
      await Subject.findOne({
        _id: payload.subjectId,
        schoolId,
        classId:
          classRecord._id,
        isDeleted: {
          $ne: true
        },
        isActive: {
          $ne: false
        }
      });

    if (!subjectRecord) {
      return {
        error:
          "The selected subject is inactive, deleted, or does not belong to this class."
      };
    }
  }

  let teacherId =
    payload.teacherId ||
    subjectRecord?.teacherId ||
    null;

  let teacherRecord = null;

  if (teacherId) {
    if (
      !isValidObjectId(teacherId)
    ) {
      return {
        error:
          "The selected teacher ID is invalid."
      };
    }

    teacherRecord =
      await Teacher.findOne({
        _id: teacherId,
        schoolId,
        isDeleted: {
          $ne: true
        },
        status: "active"
      });

    if (!teacherRecord) {
      return {
        error:
          "The selected teacher is inactive, deleted, or belongs to another school."
      };
    }

    teacherId = teacherRecord._id;
  }

  const day = String(
    payload.day || ""
  )
    .trim()
    .toLowerCase();

  if (!DAYS_OF_WEEK.includes(day)) {
    return {
      error:
        "A valid timetable day is required."
    };
  }

  if (
    !payload.periodId ||
    !isValidObjectId(
      payload.periodId
    )
  ) {
    return {
      error:
        "A valid timetable period is required."
    };
  }

  const {
    daySchedule,
    period
  } = getPeriodFromConfig(
    timetableConfig,
    day,
    payload.periodId
  );

  if (!daySchedule) {
    return {
      error:
        "The selected day is not configured in this timetable."
    };
  }

  if (!daySchedule.isWorkingDay) {
    return {
      error:
        "Assignments cannot be created on a non-working day."
    };
  }

  if (!period) {
    return {
      error:
        "The selected period does not exist on this day."
    };
  }

  if (!period.isActive) {
    return {
      error:
        "The selected period is inactive."
    };
  }

  if (
    !period.isSchedulable &&
    !timetableConfig.rules
      ?.allowSchedulingOnNonInstructionalPeriods
  ) {
    return {
      error:
        `${period.name} is not available for lesson scheduling.`
    };
  }

  const room = {
    ...(payload.room || {})
  };

  if (room.code !== undefined) {
    room.code = normalizeText(
      room.code
    );
  }

  if (room.name !== undefined) {
    room.name = normalizeText(
      room.name
    );
  }

  const preparedPayload = {
    ...payload,
    schoolId,
    timetableConfigId:
      timetableConfig._id,
    rotationWeekCode:
      normalizeRotationCode(
        payload.rotationWeekCode
      ),
    day,
    periodId:
      period._id,
    classId:
      classRecord._id,
    sectionName,
    subjectId:
      subjectRecord?._id || null,
    teacherId:
      teacherRecord?._id || null,
    room,
    classSnapshot: {
      name:
        classRecord.className,
      code: null,
      gradeLevel:
        String(
          classRecord.numericOrder ?? ""
        ),
      sectionName
    },
    subjectSnapshot:
      subjectRecord
        ? {
            name:
              subjectRecord.subjectName,
            code:
              subjectRecord.subjectCode,
            category: ""
          }
        : {},
    teacherSnapshot:
      teacherRecord
        ? {
            name:
              teacherRecord.name,
            employeeId:
              teacherRecord.employeeId,
            designation:
              teacherRecord.qualification ||
              "Teacher"
          }
        : {}
  };

  delete preparedPayload.sectionKey;
  delete preparedPayload.roomKey;
  delete preparedPayload.timetableConfigSnapshot;
  delete preparedPayload.periodSnapshot;
  delete preparedPayload.createdBy;
  delete preparedPayload.updatedBy;
  delete preparedPayload.cancelledBy;
  delete preparedPayload.deletedBy;
  delete preparedPayload.deletedAt;
  delete preparedPayload.isDeleted;

  return {
    preparedPayload,
    classRecord,
    subjectRecord,
    teacherRecord,
    daySchedule,
    period
  };
};

/*
|--------------------------------------------------------------------------
| Conflict and Workload Validation
|--------------------------------------------------------------------------
*/

const formatConflictResults = (
  conflicts
) => {
  return (conflicts || []).map(
    (conflict) => {
      const entry = conflict.entry || {};
      const conflictTypes =
        conflict.conflictTypes || [];

      const messages = [];

      if (
        conflictTypes.includes(
          "class"
        )
      ) {
        messages.push(
          `${entry.classSnapshot?.name || "Class"}${entry.sectionName ? ` - ${entry.sectionName}` : ""} already has ${entry.subjectSnapshot?.name || "another assignment"}.`
        );
      }

      if (
        conflictTypes.includes(
          "teacher"
        )
      ) {
        messages.push(
          `${entry.teacherSnapshot?.name || "Teacher"} is already assigned to ${entry.classSnapshot?.name || "another class"}.`
        );
      }

      if (
        conflictTypes.includes(
          "room"
        )
      ) {
        messages.push(
          `${entry.room?.name || entry.room?.code || "The room"} is already occupied.`
        );
      }

      return {
        conflictTypes,
        message:
          messages.join(" ") ||
          "A timetable conflict was found.",
        existingEntry: entry
      };
    }
  );
};

const findDatabaseConflicts = async (
  preparedPayload,
  excludeEntryId = null
) => {
  const conflicts =
    await TimetableEntry.findScheduleConflicts(
      preparedPayload,
      excludeEntryId
    );

  return formatConflictResults(
    conflicts
  );
};

const getLongestConsecutiveRun = (
  sequenceNumbers
) => {
  const values = Array.from(
    new Set(
      sequenceNumbers
        .map(Number)
        .filter(Number.isFinite)
    )
  ).sort((first, second) =>
    first - second
  );

  let longestRun = 0;
  let currentRun = 0;
  let previous = null;

  values.forEach((value) => {
    if (
      previous !== null &&
      value === previous + 1
    ) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }

    longestRun = Math.max(
      longestRun,
      currentRun
    );

    previous = value;
  });

  return longestRun;
};

const validateWorkloadRules = async ({
  timetableConfig,
  preparedPayload,
  period,
  excludeEntryId = null
}) => {
  const rules =
    timetableConfig.rules || {};

  const warnings = [];
  const errors = [];

  const baseFilter = {
    schoolId:
      preparedPayload.schoolId,
    timetableConfigId:
      timetableConfig._id,
    rotationWeekCode:
      preparedPayload.rotationWeekCode,
    entryStatus: "scheduled",
    isDeleted: false
  };

  if (
    excludeEntryId &&
    isValidObjectId(excludeEntryId)
  ) {
    baseFilter._id = {
      $ne: excludeEntryId
    };
  }

  const periodSequence = Number(
    period.sequence
  );

  if (preparedPayload.teacherId) {
    const teacherEntries =
      await TimetableEntry.find({
        ...baseFilter,
        teacherId:
          preparedPayload.teacherId
      })
        .select(
          "day periodSnapshot.sequence periodSnapshot.durationMinutes"
        )
        .lean();

    const teacherDayEntries =
      teacherEntries.filter(
        (entry) =>
          entry.day ===
          preparedPayload.day
      );

    const projectedDailyPeriods =
      teacherDayEntries.length + 1;

    const projectedWeeklyPeriods =
      teacherEntries.length + 1;

    if (
      rules.enforceTeacherWorkload !==
        false &&
      Number(
        rules.maximumTeacherPeriodsPerDay
      ) > 0 &&
      projectedDailyPeriods >
        Number(
          rules.maximumTeacherPeriodsPerDay
        )
    ) {
      errors.push(
        `Teacher daily workload would become ${projectedDailyPeriods} periods, above the allowed maximum of ${rules.maximumTeacherPeriodsPerDay}.`
      );
    }

    if (
      rules.enforceTeacherWorkload !==
        false &&
      Number(
        rules.maximumTeacherPeriodsPerWeek
      ) > 0 &&
      projectedWeeklyPeriods >
        Number(
          rules.maximumTeacherPeriodsPerWeek
        )
    ) {
      errors.push(
        `Teacher weekly workload would become ${projectedWeeklyPeriods} periods, above the allowed maximum of ${rules.maximumTeacherPeriodsPerWeek}.`
      );
    }

    const teacherSequences = [
      ...teacherDayEntries.map(
        (entry) =>
          entry.periodSnapshot
            ?.sequence
      ),
      periodSequence
    ];

    const teacherConsecutiveRun =
      getLongestConsecutiveRun(
        teacherSequences
      );

    if (
      rules.enforceTeacherWorkload !==
        false &&
      Number(
        rules.maximumConsecutiveTeacherPeriods
      ) > 0 &&
      teacherConsecutiveRun >
        Number(
          rules.maximumConsecutiveTeacherPeriods
        )
    ) {
      errors.push(
        `Teacher would have ${teacherConsecutiveRun} consecutive periods, above the allowed maximum of ${rules.maximumConsecutiveTeacherPeriods}.`
      );
    }
  }

  const classFilter = {
    ...baseFilter,
    classId:
      preparedPayload.classId,
    sectionKey:
      buildSectionKey(
        preparedPayload.sectionName
      ),
    day:
      preparedPayload.day
  };

  const classEntries =
    await TimetableEntry.find(
      classFilter
    )
      .select(
        "+sectionKey periodSnapshot.sequence"
      )
      .lean();

  const projectedClassPeriods =
    classEntries.length + 1;

  if (
    Number(
      rules.maximumClassPeriodsPerDay
    ) > 0 &&
    projectedClassPeriods >
      Number(
        rules.maximumClassPeriodsPerDay
      )
  ) {
    errors.push(
      `The class would have ${projectedClassPeriods} periods on ${preparedPayload.day}, above the allowed maximum of ${rules.maximumClassPeriodsPerDay}.`
    );
  }

  const classSequences = [
    ...classEntries.map(
      (entry) =>
        entry.periodSnapshot?.sequence
    ),
    periodSequence
  ];

  const classConsecutiveRun =
    getLongestConsecutiveRun(
      classSequences
    );

  if (
    Number(
      rules.maximumConsecutiveClassPeriods
    ) > 0 &&
    classConsecutiveRun >
      Number(
        rules.maximumConsecutiveClassPeriods
      )
  ) {
    warnings.push(
      `The class will have ${classConsecutiveRun} consecutive periods. The configured guideline is ${rules.maximumConsecutiveClassPeriods}.`
    );
  }

  return {
    errors,
    warnings
  };
};

const validatePreparedEntry = async ({
  timetableConfig,
  preparedPayload,
  period,
  excludeEntryId = null
}) => {
  const conflicts =
    await findDatabaseConflicts(
      preparedPayload,
      excludeEntryId
    );

  const workload =
    await validateWorkloadRules({
      timetableConfig,
      preparedPayload,
      period,
      excludeEntryId
    });

  return {
    conflicts,
    workloadErrors:
      workload.errors,
    warnings:
      workload.warnings,
    isValid:
      conflicts.length === 0 &&
      workload.errors.length === 0
  };
};

/*
|--------------------------------------------------------------------------
| Find Timetable Entry Within User Scope
|--------------------------------------------------------------------------
*/

const findScopedTimetableEntry = async (
  request,
  entryId,
  options = {}
) => {
  const {
    includeDeleted = false,
    populate = true
  } = options;

  if (!isValidObjectId(entryId)) {
    return null;
  }

  const filter = {
    _id: entryId,
    ...buildSchoolScopeFilter(request),
    isDeleted:
      includeDeleted
        ? true
        : {
            $ne: true
          }
  };

  const query =
    TimetableEntry.findOne(filter);

  const entry = populate
    ? await populateTimetableEntry(
        query
      )
    : await query;

  if (!entry) {
    return null;
  }

  if (
    getUserRole(request) ===
    "teacher"
  ) {
    const config =
      await TimetableConfig.findOne({
        _id:
          entry.timetableConfigId?._id ||
          entry.timetableConfigId,
        status: "published",
        isDeleted: {
          $ne: true
        }
      }).select("_id");

    if (!config) {
      return null;
    }
  }

  return entry;
};

/*
|--------------------------------------------------------------------------
| Grid Builders
|--------------------------------------------------------------------------
*/

const buildTimetableGrid = ({
  timetableConfig,
  entries,
  rotationWeekCode
}) => {
  const normalizedRotation =
    normalizeRotationCode(
      rotationWeekCode
    );

  const entryMap = new Map();

  entries.forEach((entry) => {
    const plainEntry =
      serializeEntry(entry);

    const key = [
      plainEntry.day,
      String(plainEntry.periodId?._id || plainEntry.periodId),
      plainEntry.rotationWeekCode
    ].join("|");

    if (!entryMap.has(key)) {
      entryMap.set(key, []);
    }

    entryMap.get(key).push(
      plainEntry
    );
  });

  const days = (
    timetableConfig.daySchedules || []
  )
    .filter(
      (schedule) =>
        schedule.isWorkingDay
    )
    .sort(
      (first, second) =>
        getDayOrder(first.day) -
        getDayOrder(second.day)
    )
    .map((schedule) => {
      const periods = (
        schedule.periods || []
      )
        .filter(
          (period) =>
            period.isActive
        )
        .sort(
          (first, second) =>
            Number(first.sequence) -
            Number(second.sequence)
        )
        .map((period) => {
          const key = [
            schedule.day,
            String(period._id),
            normalizedRotation
          ].join("|");

          return {
            periodId:
              period._id,
            sequence:
              period.sequence,
            code:
              period.code,
            name:
              period.name,
            shortName:
              period.shortName,
            type:
              period.type,
            startTime:
              period.startTime,
            endTime:
              period.endTime,
            durationMinutes:
              period.durationMinutes,
            isInstructional:
              period.isInstructional,
            isSchedulable:
              period.isSchedulable,
            entries:
              entryMap.get(key) || []
          };
        });

      return {
        day:
          schedule.day,
        label:
          schedule.label,
        isHalfDay:
          schedule.isHalfDay,
        periods
      };
    });

  return {
    rotationWeekCode:
      normalizedRotation,
    days
  };
};

const getRotationDetails = (
  timetableConfig,
  requestedCode
) => {
  const rotationCycle =
    timetableConfig.rotationCycle || {};

  if (!rotationCycle.enabled) {
    return {
      code: "STANDARD",
      label: "Standard Week",
      availableWeeks: [
        {
          code: "STANDARD",
          label: "Standard Week"
        }
      ]
    };
  }

  const availableWeeks = (
    rotationCycle.weekLabels || []
  ).map((label) => ({
    code:
      normalizeRotationCode(label),
    label
  }));

  const requested =
    normalizeRotationCode(
      requestedCode ||
      availableWeeks[0]?.code
    );

  const matched =
    availableWeeks.find(
      (week) =>
        week.code === requested
    ) || availableWeeks[0];

  return {
    code:
      matched?.code ||
      "STANDARD",
    label:
      matched?.label ||
      "Standard Week",
    availableWeeks
  };
};

/*
|--------------------------------------------------------------------------
| Create Timetable Entry
|--------------------------------------------------------------------------
*/

const createTimetableEntry = async (
  request,
  response
) => {
  try {
    if (
      !canManageTimetable(request)
    ) {
      return sendError(
        response,
        403,
        "You do not have permission to create timetable entries."
      );
    }

    const timetableConfigResult =
      await findScopedTimetableConfig(
        request,
        request.body.timetableConfigId,
        {
          requireEditable: true
        }
      );

    if (!timetableConfigResult) {
      return sendError(
        response,
        404,
        "Timetable configuration was not found."
      );
    }

    if (timetableConfigResult.locked) {
      return sendError(
        response,
        409,
        "This timetable is locked. Unlock it before adding lessons."
      );
    }

    const timetableConfig =
      timetableConfigResult.timetableConfig;

    const referenceResult =
      await resolveEntryReferences({
        request,
        timetableConfig,
        rawPayload:
          buildEntryPayload(
            request.body
          )
      });

    if (referenceResult.error) {
      return sendError(
        response,
        400,
        referenceResult.error
      );
    }

    const validation =
      await validatePreparedEntry({
        timetableConfig,
        preparedPayload:
          referenceResult.preparedPayload,
        period:
          referenceResult.period
      });

    if (!validation.isValid) {
      return sendError(
        response,
        409,
        "The timetable entry could not be created because validation failed.",
        {
          conflicts:
            validation.conflicts,
          workloadErrors:
            validation.workloadErrors,
          warnings:
            validation.warnings
        }
      );
    }

    const timetableEntry =
      await TimetableEntry.create({
        ...referenceResult.preparedPayload,
        entryStatus: "scheduled",
        createdBy:
          getUserId(request)
      });

    const populatedEntry =
      await populateTimetableEntry(
        TimetableEntry.findById(
          timetableEntry._id
        )
      );

    await createAuditEntry({
      request,
      action:
        "CREATE_TIMETABLE_ENTRY",
      entityId:
        timetableEntry._id,
      schoolId:
        timetableEntry.schoolId,
      description:
        `Scheduled ${timetableEntry.subjectSnapshot?.name || timetableEntry.entryType} for ${timetableEntry.classSnapshot?.name || "class"}.`,
      newData:
        timetableEntry.toObject()
    });

    return response.status(201).json({
      success: true,
      message:
        "Timetable entry created successfully.",
      timetableEntry:
        populatedEntry,
      data:
        populatedEntry,
      warnings:
        validation.warnings
    });
  } catch (error) {
    console.error(
      "Create timetable entry error:",
      error
    );

    if (error?.code === 11000) {
      return sendError(
        response,
        409,
        getDuplicateKeyMessage(error)
      );
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      return sendError(
        response,
        400,
        "Timetable entry validation failed.",
        getValidationMessages(error)
      );
    }

    return sendError(
      response,
      500,
      "Timetable entry could not be created."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Bulk Create Timetable Entries
|--------------------------------------------------------------------------
*/

const createTimetableEntriesBulk = async (
  request,
  response
) => {
  const createdEntryIds = [];

  try {
    if (
      !canManageTimetable(request)
    ) {
      return sendError(
        response,
        403,
        "You do not have permission to create timetable entries."
      );
    }

    const entries =
      request.body.entries;

    if (
      !Array.isArray(entries) ||
      entries.length === 0
    ) {
      return sendError(
        response,
        400,
        "At least one timetable entry is required."
      );
    }

    if (
      entries.length >
      MAX_BULK_ENTRIES
    ) {
      return sendError(
        response,
        400,
        `A maximum of ${MAX_BULK_ENTRIES} timetable entries can be saved in one request.`
      );
    }

    const timetableConfigId =
      request.body.timetableConfigId ||
      entries[0]?.timetableConfigId;

    const timetableConfigResult =
      await findScopedTimetableConfig(
        request,
        timetableConfigId,
        {
          requireEditable: true
        }
      );

    if (!timetableConfigResult) {
      return sendError(
        response,
        404,
        "Timetable configuration was not found."
      );
    }

    if (timetableConfigResult.locked) {
      return sendError(
        response,
        409,
        "This timetable is locked. Unlock it before adding lessons."
      );
    }

    const timetableConfig =
      timetableConfigResult.timetableConfig;

    const internalClassSlots =
      new Set();
    const internalTeacherSlots =
      new Set();
    const internalRoomSlots =
      new Set();

    const preparedEntries = [];
    const validationErrors = [];
    const warnings = [];

    for (
      let index = 0;
      index < entries.length;
      index += 1
    ) {
      const rawEntry = {
        ...entries[index],
        timetableConfigId:
          timetableConfig._id
      };

      const referenceResult =
        await resolveEntryReferences({
          request,
          timetableConfig,
          rawPayload:
            buildEntryPayload(
              rawEntry
            )
        });

      if (referenceResult.error) {
        validationErrors.push({
          index,
          message:
            referenceResult.error
        });
        continue;
      }

      const preparedPayload =
        referenceResult.preparedPayload;

      const slotPrefix = [
        preparedPayload.rotationWeekCode,
        preparedPayload.day,
        String(preparedPayload.periodId)
      ].join("|");

      const classSlot = [
        slotPrefix,
        String(preparedPayload.classId),
        buildSectionKey(
          preparedPayload.sectionName
        )
      ].join("|");

      if (
        internalClassSlots.has(
          classSlot
        )
      ) {
        validationErrors.push({
          index,
          message:
            "The bulk request contains two assignments for the same class or section in one period."
        });
      }

      internalClassSlots.add(
        classSlot
      );

      if (preparedPayload.teacherId) {
        const teacherSlot = [
          slotPrefix,
          String(
            preparedPayload.teacherId
          )
        ].join("|");

        if (
          internalTeacherSlots.has(
            teacherSlot
          )
        ) {
          validationErrors.push({
            index,
            message:
              "The bulk request assigns one teacher to two classes in the same period."
          });
        }

        internalTeacherSlots.add(
          teacherSlot
        );
      }

      const roomKey =
        buildRoomKey(
          preparedPayload.room
        );

      if (roomKey) {
        const roomSlot = [
          slotPrefix,
          roomKey
        ].join("|");

        if (
          internalRoomSlots.has(
            roomSlot
          )
        ) {
          validationErrors.push({
            index,
            message:
              "The bulk request assigns one room to two classes in the same period."
          });
        }

        internalRoomSlots.add(
          roomSlot
        );
      }

      const validation =
        await validatePreparedEntry({
          timetableConfig,
          preparedPayload,
          period:
            referenceResult.period
        });

      if (!validation.isValid) {
        validationErrors.push({
          index,
          conflicts:
            validation.conflicts,
          workloadErrors:
            validation.workloadErrors,
          message:
            "Conflict or workload validation failed."
        });
      }

      warnings.push(
        ...validation.warnings.map(
          (warning) => ({
            index,
            message: warning
          })
        )
      );

      preparedEntries.push({
        index,
        preparedPayload
      });
    }

    if (validationErrors.length > 0) {
      return sendError(
        response,
        409,
        "Bulk timetable validation failed. No entries were saved.",
        {
          errors:
            validationErrors,
          warnings
        }
      );
    }

    for (
      const preparedEntry of
      preparedEntries
    ) {
      const timetableEntry =
        new TimetableEntry({
          ...preparedEntry.preparedPayload,
          entryStatus: "scheduled",
          createdBy:
            getUserId(request)
        });

      await timetableEntry.save();

      createdEntryIds.push(
        timetableEntry._id
      );
    }

    const populatedEntries =
      await populateTimetableEntry(
        TimetableEntry.find({
          _id: {
            $in:
              createdEntryIds
          }
        }).sort({
          day: 1,
          "periodSnapshot.sequence": 1
        })
      );

    await createAuditEntry({
      request,
      action:
        "BULK_CREATE_TIMETABLE_ENTRIES",
      entityId:
        timetableConfig._id,
      schoolId:
        timetableConfig.schoolId,
      description:
        `Created ${createdEntryIds.length} timetable entries in bulk.`,
      newData: {
        timetableConfigId:
          timetableConfig._id,
        entryIds:
          createdEntryIds
      }
    });

    return response.status(201).json({
      success: true,
      message:
        `${createdEntryIds.length} timetable entries created successfully.`,
      timetableEntries:
        populatedEntries,
      data:
        populatedEntries,
      warnings
    });
  } catch (error) {
    console.error(
      "Bulk create timetable entries error:",
      error
    );

    if (
      createdEntryIds.length > 0
    ) {
      await TimetableEntry.deleteMany({
        _id: {
          $in: createdEntryIds
        }
      }).catch((rollbackError) => {
        console.error(
          "Timetable bulk rollback error:",
          rollbackError
        );
      });
    }

    if (error?.code === 11000) {
      return sendError(
        response,
        409,
        getDuplicateKeyMessage(error)
      );
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      return sendError(
        response,
        400,
        "Bulk timetable validation failed.",
        getValidationMessages(error)
      );
    }

    return sendError(
      response,
      500,
      "Timetable entries could not be created."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Validate Timetable Slot Without Saving
|--------------------------------------------------------------------------
*/

const validateTimetableSlot = async (
  request,
  response
) => {
  try {
    if (!canViewTimetable(request)) {
      return sendError(
        response,
        403,
        "You do not have permission to validate timetable slots."
      );
    }

    const timetableConfigResult =
      await findScopedTimetableConfig(
        request,
        request.body.timetableConfigId,
        {
          requireEditable: false
        }
      );

    if (!timetableConfigResult) {
      return sendError(
        response,
        404,
        "Timetable configuration was not found."
      );
    }

    const timetableConfig =
      timetableConfigResult.timetableConfig;

    const existingEntry =
      request.body.entryId
        ? await findScopedTimetableEntry(
            request,
            request.body.entryId,
            {
              populate: false
            }
          )
        : null;

    const referenceResult =
      await resolveEntryReferences({
        request,
        timetableConfig,
        rawPayload:
          buildEntryPayload(
            request.body
          ),
        existingEntry
      });

    if (referenceResult.error) {
      return sendError(
        response,
        400,
        referenceResult.error
      );
    }

    const validation =
      await validatePreparedEntry({
        timetableConfig,
        preparedPayload:
          referenceResult.preparedPayload,
        period:
          referenceResult.period,
        excludeEntryId:
          existingEntry?._id || null
      });

    return response.status(200).json({
      success: true,
      isValid:
        validation.isValid,
      conflicts:
        validation.conflicts,
      workloadErrors:
        validation.workloadErrors,
      warnings:
        validation.warnings,
      resolved: {
        schoolId:
          timetableConfig.schoolId,
        timetableConfigId:
          timetableConfig._id,
        class:
          referenceResult.classRecord,
        subject:
          referenceResult.subjectRecord,
        teacher:
          referenceResult.teacherRecord,
        period:
          referenceResult.period
      }
    });
  } catch (error) {
    console.error(
      "Validate timetable slot error:",
      error
    );

    return sendError(
      response,
      500,
      "Timetable slot could not be validated."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Timetable Entries
|--------------------------------------------------------------------------
*/

const getTimetableEntries = async (
  request,
  response
) => {
  try {
    if (!canViewTimetable(request)) {
      return sendError(
        response,
        403,
        "You do not have permission to view timetable entries."
      );
    }

    const page =
      parsePositiveInteger(
        request.query.page,
        1,
        100000
      );

    const limit =
      parsePositiveInteger(
        request.query.limit,
        25,
        200
      );

    const skip =
      (page - 1) * limit;

    const filter = {
      ...buildSchoolScopeFilter(
        request,
        request.query.schoolId
      ),
      isDeleted: {
        $ne: true
      }
    };

    const directIdFilters = [
      "timetableConfigId",
      "classId",
      "subjectId",
      "teacherId"
    ];

    for (
      const field of
      directIdFilters
    ) {
      if (request.query[field]) {
        if (
          !isValidObjectId(
            request.query[field]
          )
        ) {
          return sendError(
            response,
            400,
            `Invalid ${field}.`
          );
        }

        filter[field] =
          request.query[field];
      }
    }

    if (request.query.day) {
      filter.day = String(
        request.query.day
      ).toLowerCase();
    }

    if (
      request.query.rotationWeekCode
    ) {
      filter.rotationWeekCode =
        normalizeRotationCode(
          request.query.rotationWeekCode
        );
    }

    if (request.query.sectionName) {
      filter.sectionKey =
        buildSectionKey(
          request.query.sectionName
        );
    }

    if (request.query.entryStatus) {
      filter.entryStatus =
        request.query.entryStatus;
    }

    if (request.query.entryType) {
      filter.entryType =
        request.query.entryType;
    }

    if (request.query.deliveryMode) {
      filter.deliveryMode =
        request.query.deliveryMode;
    }

    const isFixed = parseBoolean(
      request.query.isFixed
    );

    if (isFixed !== undefined) {
      filter.isFixed = isFixed;
    }

    if (request.query.search) {
      const regex = new RegExp(
        escapeRegex(
          request.query.search
        ),
        "i"
      );

      filter.$or = [
        {
          "classSnapshot.name": regex
        },
        {
          sectionName: regex
        },
        {
          "subjectSnapshot.name": regex
        },
        {
          "subjectSnapshot.code": regex
        },
        {
          "teacherSnapshot.name": regex
        },
        {
          "teacherSnapshot.employeeId": regex
        },
        {
          "room.name": regex
        },
        {
          "room.code": regex
        },
        {
          notes: regex
        }
      ];
    }

    if (
      getUserRole(request) ===
      "teacher"
    ) {
      const publishedConfigs =
        await TimetableConfig.find({
          ...buildSchoolScopeFilter(
            request
          ),
          status: "published",
          isDeleted: {
            $ne: true
          }
        }).distinct("_id");

      filter.timetableConfigId =
        filter.timetableConfigId
          ? {
              $in:
                publishedConfigs.filter(
                  (configId) =>
                    String(configId) ===
                    String(
                      request.query
                        .timetableConfigId
                    )
                )
            }
          : {
              $in:
                publishedConfigs
            };
    }

    const sortBy =
      ALLOWED_SORT_FIELDS.includes(
        request.query.sortBy
      )
        ? request.query.sortBy
        : "createdAt";

    const sortOrder =
      String(
        request.query.sortOrder ||
        "desc"
      ).toLowerCase() === "asc"
        ? 1
        : -1;

    const sort = {
      [sortBy]: sortOrder
    };

    if (
      sortBy ===
      "periodSnapshot.sequence"
    ) {
      sort.day = 1;
    }

    const [
      timetableEntries,
      total,
      summaryResult
    ] = await Promise.all([
      populateTimetableEntry(
        TimetableEntry.find(filter)
          .select("+sectionKey +roomKey")
          .sort(sort)
          .skip(skip)
          .limit(limit)
      ),
      TimetableEntry.countDocuments(
        filter
      ),
      TimetableEntry.aggregate([
        {
          $match: filter
        },
        {
          $group: {
            _id: null,
            totalEntries: {
              $sum: 1
            },
            scheduledEntries: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$entryStatus",
                      "scheduled"
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            cancelledEntries: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$entryStatus",
                      "cancelled"
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            uniqueClasses: {
              $addToSet:
                "$classId"
            },
            uniqueTeachers: {
              $addToSet:
                "$teacherId"
            },
            uniqueSubjects: {
              $addToSet:
                "$subjectId"
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalEntries: 1,
            scheduledEntries: 1,
            cancelledEntries: 1,
            classCount: {
              $size:
                "$uniqueClasses"
            },
            teacherCount: {
              $size: {
                $filter: {
                  input:
                    "$uniqueTeachers",
                  as: "teacher",
                  cond: {
                    $ne: [
                      "$$teacher",
                      null
                    ]
                  }
                }
              }
            },
            subjectCount: {
              $size: {
                $filter: {
                  input:
                    "$uniqueSubjects",
                  as: "subject",
                  cond: {
                    $ne: [
                      "$$subject",
                      null
                    ]
                  }
                }
              }
            }
          }
        }
      ])
    ]);

    const totalPages = Math.max(
      1,
      Math.ceil(total / limit)
    );

    return response.status(200).json({
      success: true,
      message:
        "Timetable entries retrieved successfully.",
      timetableEntries,
      data:
        timetableEntries,
      summary:
        summaryResult[0] || {
          totalEntries: 0,
          scheduledEntries: 0,
          cancelledEntries: 0,
          classCount: 0,
          teacherCount: 0,
          subjectCount: 0
        },
      pagination: {
        total,
        page,
        currentPage: page,
        limit,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1
      }
    });
  } catch (error) {
    console.error(
      "Get timetable entries error:",
      error
    );

    return sendError(
      response,
      500,
      "Timetable entries could not be loaded."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Timetable Entry Details
|--------------------------------------------------------------------------
*/

const getTimetableEntryById = async (
  request,
  response
) => {
  try {
    const timetableEntry =
      await findScopedTimetableEntry(
        request,
        request.params.id
      );

    if (!timetableEntry) {
      return sendError(
        response,
        404,
        "Timetable entry was not found."
      );
    }

    return response.status(200).json({
      success: true,
      timetableEntry,
      data:
        timetableEntry
    });
  } catch (error) {
    console.error(
      "Get timetable entry error:",
      error
    );

    return sendError(
      response,
      500,
      "Timetable entry could not be loaded."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Update Timetable Entry
|--------------------------------------------------------------------------
*/

const updateTimetableEntry = async (
  request,
  response
) => {
  try {
    if (
      !canManageTimetable(request)
    ) {
      return sendError(
        response,
        403,
        "You do not have permission to update timetable entries."
      );
    }

    const timetableEntry =
      await findScopedTimetableEntry(
        request,
        request.params.id,
        {
          populate: false
        }
      );

    if (!timetableEntry) {
      return sendError(
        response,
        404,
        "Timetable entry was not found."
      );
    }

    const timetableConfigResult =
      await findScopedTimetableConfig(
        request,
        request.body.timetableConfigId ||
          timetableEntry.timetableConfigId,
        {
          requireEditable: true
        }
      );

    if (!timetableConfigResult) {
      return sendError(
        response,
        404,
        "Timetable configuration was not found."
      );
    }

    if (timetableConfigResult.locked) {
      return sendError(
        response,
        409,
        "This timetable is locked. Unlock it before editing lessons."
      );
    }

    const timetableConfig =
      timetableConfigResult.timetableConfig;

    const oldData =
      timetableEntry.toObject();

    const referenceResult =
      await resolveEntryReferences({
        request,
        timetableConfig,
        rawPayload:
          buildEntryPayload(
            request.body
          ),
        existingEntry:
          timetableEntry
      });

    if (referenceResult.error) {
      return sendError(
        response,
        400,
        referenceResult.error
      );
    }

    const validation =
      await validatePreparedEntry({
        timetableConfig,
        preparedPayload:
          referenceResult.preparedPayload,
        period:
          referenceResult.period,
        excludeEntryId:
          timetableEntry._id
      });

    if (!validation.isValid) {
      return sendError(
        response,
        409,
        "The timetable entry could not be updated because validation failed.",
        {
          conflicts:
            validation.conflicts,
          workloadErrors:
            validation.workloadErrors,
          warnings:
            validation.warnings
        }
      );
    }

    Object.assign(
      timetableEntry,
      referenceResult.preparedPayload,
      {
        updatedBy:
          getUserId(request)
      }
    );

    await timetableEntry.save();

    const populatedEntry =
      await populateTimetableEntry(
        TimetableEntry.findById(
          timetableEntry._id
        )
      );

    await createAuditEntry({
      request,
      action:
        "UPDATE_TIMETABLE_ENTRY",
      entityId:
        timetableEntry._id,
      schoolId:
        timetableEntry.schoolId,
      description:
        `Updated timetable entry for ${timetableEntry.classSnapshot?.name || "class"}.`,
      oldData,
      newData:
        timetableEntry.toObject()
    });

    return response.status(200).json({
      success: true,
      message:
        "Timetable entry updated successfully.",
      timetableEntry:
        populatedEntry,
      data:
        populatedEntry,
      warnings:
        validation.warnings
    });
  } catch (error) {
    console.error(
      "Update timetable entry error:",
      error
    );

    if (error?.code === 11000) {
      return sendError(
        response,
        409,
        getDuplicateKeyMessage(error)
      );
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      return sendError(
        response,
        400,
        "Timetable entry validation failed.",
        getValidationMessages(error)
      );
    }

    return sendError(
      response,
      500,
      "Timetable entry could not be updated."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Cancel Timetable Entry
|--------------------------------------------------------------------------
*/

const cancelTimetableEntry = async (
  request,
  response
) => {
  try {
    if (
      !canManageTimetable(request)
    ) {
      return sendError(
        response,
        403,
        "You do not have permission to cancel timetable entries."
      );
    }

    const timetableEntry =
      await findScopedTimetableEntry(
        request,
        request.params.id,
        {
          populate: false
        }
      );

    if (!timetableEntry) {
      return sendError(
        response,
        404,
        "Timetable entry was not found."
      );
    }

    const timetableConfig =
      await TimetableConfig.findById(
        timetableEntry.timetableConfigId
      ).select("isLocked title");

    if (timetableConfig?.isLocked) {
      return sendError(
        response,
        409,
        "This timetable is locked. Unlock it before cancelling lessons."
      );
    }

    if (
      timetableEntry.entryStatus ===
      "cancelled"
    ) {
      return sendError(
        response,
        409,
        "This timetable entry is already cancelled."
      );
    }

    const cancellationReason =
      normalizeText(
        request.body.cancellationReason ||
        request.body.reason
      );

    if (!cancellationReason) {
      return sendError(
        response,
        400,
        "Cancellation reason is required."
      );
    }

    timetableEntry.entryStatus =
      "cancelled";
    timetableEntry.cancellationReason =
      cancellationReason;
    timetableEntry.cancelledAt =
      new Date();
    timetableEntry.cancelledBy =
      getUserId(request);
    timetableEntry.updatedBy =
      getUserId(request);

    await timetableEntry.save();

    const populatedEntry =
      await populateTimetableEntry(
        TimetableEntry.findById(
          timetableEntry._id
        )
      );

    await createAuditEntry({
      request,
      action:
        "CANCEL_TIMETABLE_ENTRY",
      entityId:
        timetableEntry._id,
      schoolId:
        timetableEntry.schoolId,
      description:
        `Cancelled timetable entry for ${timetableEntry.classSnapshot?.name || "class"}.`,
      newData: {
        cancellationReason,
        cancelledAt:
          timetableEntry.cancelledAt
      }
    });

    return response.status(200).json({
      success: true,
      message:
        "Timetable entry cancelled successfully.",
      timetableEntry:
        populatedEntry,
      data:
        populatedEntry
    });
  } catch (error) {
    console.error(
      "Cancel timetable entry error:",
      error
    );

    if (
      error?.name ===
      "ValidationError"
    ) {
      return sendError(
        response,
        400,
        "Timetable cancellation validation failed.",
        getValidationMessages(error)
      );
    }

    return sendError(
      response,
      500,
      "Timetable entry could not be cancelled."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Reactivate Cancelled Timetable Entry
|--------------------------------------------------------------------------
*/

const reactivateTimetableEntry = async (
  request,
  response
) => {
  try {
    if (
      !canManageTimetable(request)
    ) {
      return sendError(
        response,
        403,
        "You do not have permission to reactivate timetable entries."
      );
    }

    const timetableEntry =
      await findScopedTimetableEntry(
        request,
        request.params.id,
        {
          populate: false
        }
      );

    if (!timetableEntry) {
      return sendError(
        response,
        404,
        "Timetable entry was not found."
      );
    }

    if (
      timetableEntry.entryStatus !==
      "cancelled"
    ) {
      return sendError(
        response,
        409,
        "Only cancelled timetable entries can be reactivated."
      );
    }

    const timetableConfigResult =
      await findScopedTimetableConfig(
        request,
        timetableEntry.timetableConfigId,
        {
          requireEditable: true
        }
      );

    if (!timetableConfigResult) {
      return sendError(
        response,
        404,
        "Timetable configuration was not found."
      );
    }

    if (timetableConfigResult.locked) {
      return sendError(
        response,
        409,
        "This timetable is locked. Unlock it before reactivating lessons."
      );
    }

    const timetableConfig =
      timetableConfigResult.timetableConfig;

    const referenceResult =
      await resolveEntryReferences({
        request,
        timetableConfig,
        rawPayload: {},
        existingEntry:
          timetableEntry
      });

    if (referenceResult.error) {
      return sendError(
        response,
        400,
        referenceResult.error
      );
    }

    const validation =
      await validatePreparedEntry({
        timetableConfig,
        preparedPayload:
          referenceResult.preparedPayload,
        period:
          referenceResult.period,
        excludeEntryId:
          timetableEntry._id
      });

    if (!validation.isValid) {
      return sendError(
        response,
        409,
        "The timetable entry cannot be reactivated because its slot is no longer available.",
        {
          conflicts:
            validation.conflicts,
          workloadErrors:
            validation.workloadErrors,
          warnings:
            validation.warnings
        }
      );
    }

    timetableEntry.entryStatus =
      "scheduled";
    timetableEntry.cancellationReason =
      null;
    timetableEntry.cancelledAt =
      null;
    timetableEntry.cancelledBy =
      null;
    timetableEntry.updatedBy =
      getUserId(request);

    await timetableEntry.save();

    const populatedEntry =
      await populateTimetableEntry(
        TimetableEntry.findById(
          timetableEntry._id
        )
      );

    await createAuditEntry({
      request,
      action:
        "REACTIVATE_TIMETABLE_ENTRY",
      entityId:
        timetableEntry._id,
      schoolId:
        timetableEntry.schoolId,
      description:
        `Reactivated timetable entry for ${timetableEntry.classSnapshot?.name || "class"}.`,
      newData:
        timetableEntry.toObject()
    });

    return response.status(200).json({
      success: true,
      message:
        "Timetable entry reactivated successfully.",
      timetableEntry:
        populatedEntry,
      data:
        populatedEntry,
      warnings:
        validation.warnings
    });
  } catch (error) {
    console.error(
      "Reactivate timetable entry error:",
      error
    );

    if (error?.code === 11000) {
      return sendError(
        response,
        409,
        getDuplicateKeyMessage(error)
      );
    }

    return sendError(
      response,
      500,
      "Timetable entry could not be reactivated."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Soft Delete Timetable Entry
|--------------------------------------------------------------------------
*/

const deleteTimetableEntry = async (
  request,
  response
) => {
  try {
    if (
      !canManageTimetable(request)
    ) {
      return sendError(
        response,
        403,
        "You do not have permission to delete timetable entries."
      );
    }

    const timetableEntry =
      await findScopedTimetableEntry(
        request,
        request.params.id,
        {
          populate: false
        }
      );

    if (!timetableEntry) {
      return sendError(
        response,
        404,
        "Timetable entry was not found."
      );
    }

    const timetableConfig =
      await TimetableConfig.findById(
        timetableEntry.timetableConfigId
      ).select("isLocked");

    if (timetableConfig?.isLocked) {
      return sendError(
        response,
        409,
        "This timetable is locked. Unlock it before deleting lessons."
      );
    }

    timetableEntry.isDeleted = true;
    timetableEntry.deletedAt =
      new Date();
    timetableEntry.deletedBy =
      getUserId(request);
    timetableEntry.updatedBy =
      getUserId(request);

    await timetableEntry.save();

    await createAuditEntry({
      request,
      action:
        "DELETE_TIMETABLE_ENTRY",
      entityId:
        timetableEntry._id,
      schoolId:
        timetableEntry.schoolId,
      description:
        `Deleted timetable entry for ${timetableEntry.classSnapshot?.name || "class"}.`,
      newData:
        timetableEntry.toObject()
    });

    return response.status(200).json({
      success: true,
      message:
        "Timetable entry deleted successfully."
    });
  } catch (error) {
    console.error(
      "Delete timetable entry error:",
      error
    );

    return sendError(
      response,
      500,
      "Timetable entry could not be deleted."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Deleted Timetable Entries
|--------------------------------------------------------------------------
*/

const getDeletedTimetableEntries = async (
  request,
  response
) => {
  try {
    if (
      !canManageTimetable(request)
    ) {
      return sendError(
        response,
        403,
        "You do not have permission to view deleted timetable entries."
      );
    }

    const page =
      parsePositiveInteger(
        request.query.page,
        1,
        100000
      );

    const limit =
      parsePositiveInteger(
        request.query.limit,
        25,
        200
      );

    const filter = {
      ...buildSchoolScopeFilter(
        request,
        request.query.schoolId
      ),
      isDeleted: true
    };

    [
      "timetableConfigId",
      "classId",
      "teacherId",
      "subjectId"
    ].forEach((field) => {
      if (
        request.query[field] &&
        isValidObjectId(
          request.query[field]
        )
      ) {
        filter[field] =
          request.query[field];
      }
    });

    if (request.query.search) {
      const regex = new RegExp(
        escapeRegex(
          request.query.search
        ),
        "i"
      );

      filter.$or = [
        {
          "classSnapshot.name": regex
        },
        {
          "subjectSnapshot.name": regex
        },
        {
          "teacherSnapshot.name": regex
        },
        {
          "room.name": regex
        }
      ];
    }

    const skip =
      (page - 1) * limit;

    const [entries, total] =
      await Promise.all([
        populateTimetableEntry(
          TimetableEntry.find(filter)
            .sort({
              deletedAt: -1
            })
            .skip(skip)
            .limit(limit)
        ),
        TimetableEntry.countDocuments(
          filter
        )
      ]);

    const totalPages = Math.max(
      1,
      Math.ceil(total / limit)
    );

    return response.status(200).json({
      success: true,
      timetableEntries: entries,
      data: entries,
      pagination: {
        total,
        page,
        currentPage: page,
        limit,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1
      }
    });
  } catch (error) {
    console.error(
      "Get deleted timetable entries error:",
      error
    );

    return sendError(
      response,
      500,
      "Deleted timetable entries could not be loaded."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Restore Deleted Timetable Entry
|--------------------------------------------------------------------------
*/

const restoreTimetableEntry = async (
  request,
  response
) => {
  try {
    if (
      !canManageTimetable(request)
    ) {
      return sendError(
        response,
        403,
        "You do not have permission to restore timetable entries."
      );
    }

    const timetableEntry =
      await findScopedTimetableEntry(
        request,
        request.params.id,
        {
          includeDeleted: true,
          populate: false
        }
      );

    if (!timetableEntry) {
      return sendError(
        response,
        404,
        "Deleted timetable entry was not found."
      );
    }

    const timetableConfigResult =
      await findScopedTimetableConfig(
        request,
        timetableEntry.timetableConfigId,
        {
          requireEditable: true
        }
      );

    if (!timetableConfigResult) {
      return sendError(
        response,
        404,
        "The timetable configuration for this entry was not found."
      );
    }

    if (timetableConfigResult.locked) {
      return sendError(
        response,
        409,
        "This timetable is locked. Unlock it before restoring lessons."
      );
    }

    const timetableConfig =
      timetableConfigResult.timetableConfig;

    if (
      timetableEntry.entryStatus ===
      "scheduled"
    ) {
      const referenceResult =
        await resolveEntryReferences({
          request,
          timetableConfig,
          rawPayload: {},
          existingEntry:
            timetableEntry
        });

      if (referenceResult.error) {
        return sendError(
          response,
          400,
          referenceResult.error
        );
      }

      const validation =
        await validatePreparedEntry({
          timetableConfig,
          preparedPayload:
            referenceResult.preparedPayload,
          period:
            referenceResult.period,
          excludeEntryId:
            timetableEntry._id
        });

      if (!validation.isValid) {
        return sendError(
          response,
          409,
          "The entry cannot be restored because its timetable slot is no longer available.",
          {
            conflicts:
              validation.conflicts,
            workloadErrors:
              validation.workloadErrors,
            warnings:
              validation.warnings
          }
        );
      }
    }

    timetableEntry.isDeleted = false;
    timetableEntry.deletedAt = null;
    timetableEntry.deletedBy = null;
    timetableEntry.updatedBy =
      getUserId(request);

    await timetableEntry.save();

    const populatedEntry =
      await populateTimetableEntry(
        TimetableEntry.findById(
          timetableEntry._id
        )
      );

    await createAuditEntry({
      request,
      action:
        "RESTORE_TIMETABLE_ENTRY",
      entityId:
        timetableEntry._id,
      schoolId:
        timetableEntry.schoolId,
      description:
        `Restored timetable entry for ${timetableEntry.classSnapshot?.name || "class"}.`,
      newData:
        timetableEntry.toObject()
    });

    return response.status(200).json({
      success: true,
      message:
        "Timetable entry restored successfully.",
      timetableEntry:
        populatedEntry,
      data:
        populatedEntry
    });
  } catch (error) {
    console.error(
      "Restore timetable entry error:",
      error
    );

    if (error?.code === 11000) {
      return sendError(
        response,
        409,
        getDuplicateKeyMessage(error)
      );
    }

    return sendError(
      response,
      500,
      "Timetable entry could not be restored."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Timetable Builder Data
|--------------------------------------------------------------------------
*/

const getTimetableBuilderData = async (
  request,
  response
) => {
  try {
    if (!canViewTimetable(request)) {
      return sendError(
        response,
        403,
        "You do not have permission to access timetable builder data."
      );
    }

    const timetableConfigResult =
      await findScopedTimetableConfig(
        request,
        request.query.timetableConfigId,
        {
          allowActiveFallback: true,
          requestedSchoolId:
            request.query.schoolId
        }
      );

    if (!timetableConfigResult) {
      return sendError(
        response,
        404,
        "Timetable configuration was not found."
      );
    }

    const timetableConfig =
      timetableConfigResult.timetableConfig;

    const schoolScope = {
      schoolId:
        timetableConfig.schoolId,
      isDeleted: {
        $ne: true
      }
    };

    const rotation =
      getRotationDetails(
        timetableConfig,
        request.query.rotationWeekCode
      );

    const entryFilter = {
      timetableConfigId:
        timetableConfig._id,
      schoolId:
        timetableConfig.schoolId,
      rotationWeekCode:
        rotation.code,
      entryStatus: "scheduled",
      isDeleted: false
    };

    if (
      request.query.classId &&
      isValidObjectId(
        request.query.classId
      )
    ) {
      entryFilter.classId =
        request.query.classId;
    }

    const [
      classes,
      subjects,
      teachers,
      entries
    ] = await Promise.all([
      ClassModel.find({
        ...schoolScope,
        isActive: {
          $ne: false
        }
      })
        .select(
          "className numericOrder sections"
        )
        .sort({
          numericOrder: 1,
          className: 1
        })
        .lean(),

      Subject.find({
        ...schoolScope,
        isActive: {
          $ne: false
        }
      })
        .select(
          "subjectName subjectCode classId teacherId description"
        )
        .sort({
          subjectName: 1
        })
        .lean(),

      Teacher.find({
        ...schoolScope,
        status: "active"
      })
        .select(
          "name employeeId qualification subjects status"
        )
        .sort({
          name: 1
        })
        .lean(),

      populateTimetableEntry(
        TimetableEntry.find(
          entryFilter
        ).sort({
          day: 1,
          "periodSnapshot.sequence": 1,
          "classSnapshot.name": 1
        })
      )
    ]);

    const grid = buildTimetableGrid({
      timetableConfig,
      entries,
      rotationWeekCode:
        rotation.code
    });

    return response.status(200).json({
      success: true,
      timetableConfig,
      rotation,
      classes,
      subjects,
      teachers,
      timetableEntries:
        entries,
      grid,
      data: {
        timetableConfig,
        rotation,
        classes,
        subjects,
        teachers,
        timetableEntries:
          entries,
        grid
      }
    });
  } catch (error) {
    console.error(
      "Get timetable builder data error:",
      error
    );

    return sendError(
      response,
      500,
      "Timetable builder data could not be loaded."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Class Timetable
|--------------------------------------------------------------------------
*/

const getClassTimetable = async (
  request,
  response
) => {
  try {
    const classId =
      request.params.classId ||
      request.query.classId;

    if (
      !classId ||
      !isValidObjectId(classId)
    ) {
      return sendError(
        response,
        400,
        "A valid class is required."
      );
    }

    const timetableConfigResult =
      await findScopedTimetableConfig(
        request,
        request.query.timetableConfigId,
        {
          allowActiveFallback: true,
          requestedSchoolId:
            request.query.schoolId
        }
      );

    if (!timetableConfigResult) {
      return sendError(
        response,
        404,
        "Timetable configuration was not found."
      );
    }

    const timetableConfig =
      timetableConfigResult.timetableConfig;

    const classRecord =
      await ClassModel.findOne({
        _id: classId,
        schoolId:
          timetableConfig.schoolId,
        isDeleted: {
          $ne: true
        }
      }).lean();

    if (!classRecord) {
      return sendError(
        response,
        404,
        "Class was not found in this school."
      );
    }

    const rotation =
      getRotationDetails(
        timetableConfig,
        request.query.rotationWeekCode
      );

    const filter = {
      schoolId:
        timetableConfig.schoolId,
      timetableConfigId:
        timetableConfig._id,
      classId:
        classRecord._id,
      rotationWeekCode:
        rotation.code,
      entryStatus: "scheduled",
      isDeleted: false
    };

    if (
      request.query.sectionName !==
      undefined
    ) {
      filter.sectionKey =
        buildSectionKey(
          request.query.sectionName
        );
    }

    const entries =
      await populateTimetableEntry(
        TimetableEntry.find(filter)
          .select("+sectionKey")
          .sort({
            day: 1,
            "periodSnapshot.sequence": 1
          })
      );

    const grid = buildTimetableGrid({
      timetableConfig,
      entries,
      rotationWeekCode:
        rotation.code
    });

    const assignedPeriods =
      entries.length;

    const totalSchedulablePeriods =
      grid.days.reduce(
        (total, day) =>
          total +
          day.periods.filter(
            (period) =>
              period.isSchedulable
          ).length,
        0
      );

    return response.status(200).json({
      success: true,
      timetableConfig,
      class:
        classRecord,
      sectionName:
        request.query.sectionName ||
        "",
      rotation,
      timetableEntries:
        entries,
      grid,
      summary: {
        assignedPeriods,
        totalSchedulablePeriods,
        freePeriods:
          Math.max(
            totalSchedulablePeriods -
              assignedPeriods,
            0
          ),
        completionPercentage:
          totalSchedulablePeriods > 0
            ? Number(
                (
                  (assignedPeriods /
                    totalSchedulablePeriods) *
                  100
                ).toFixed(2)
              )
            : 0
      },
      data: {
        timetableConfig,
        class:
          classRecord,
        rotation,
        timetableEntries:
          entries,
        grid
      }
    });
  } catch (error) {
    console.error(
      "Get class timetable error:",
      error
    );

    return sendError(
      response,
      500,
      "Class timetable could not be loaded."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Teacher Timetable
|--------------------------------------------------------------------------
*/

const getTeacherTimetable = async (
  request,
  response
) => {
  try {
    const teacherId =
      request.params.teacherId ||
      request.query.teacherId;

    if (
      !teacherId ||
      !isValidObjectId(teacherId)
    ) {
      return sendError(
        response,
        400,
        "A valid teacher is required."
      );
    }

    const timetableConfigResult =
      await findScopedTimetableConfig(
        request,
        request.query.timetableConfigId,
        {
          allowActiveFallback: true,
          requestedSchoolId:
            request.query.schoolId
        }
      );

    if (!timetableConfigResult) {
      return sendError(
        response,
        404,
        "Timetable configuration was not found."
      );
    }

    const timetableConfig =
      timetableConfigResult.timetableConfig;

    const teacherRecord =
      await Teacher.findOne({
        _id: teacherId,
        schoolId:
          timetableConfig.schoolId,
        isDeleted: {
          $ne: true
        }
      }).lean();

    if (!teacherRecord) {
      return sendError(
        response,
        404,
        "Teacher was not found in this school."
      );
    }

    const rotation =
      getRotationDetails(
        timetableConfig,
        request.query.rotationWeekCode
      );

    const entries =
      await populateTimetableEntry(
        TimetableEntry.find({
          schoolId:
            timetableConfig.schoolId,
          timetableConfigId:
            timetableConfig._id,
          teacherId:
            teacherRecord._id,
          rotationWeekCode:
            rotation.code,
          entryStatus: "scheduled",
          isDeleted: false
        }).sort({
          day: 1,
          "periodSnapshot.sequence": 1
        })
      );

    const grid = buildTimetableGrid({
      timetableConfig,
      entries,
      rotationWeekCode:
        rotation.code
    });

    const dailyWorkload =
      DAYS_OF_WEEK.map((day) => {
        const dayEntries =
          entries.filter(
            (entry) =>
              entry.day === day
          );

        return {
          day,
          periods:
            dayEntries.length,
          teachingMinutes:
            dayEntries.reduce(
              (total, entry) =>
                total +
                Number(
                  entry.periodSnapshot
                    ?.durationMinutes ||
                    0
                ),
              0
            )
        };
      }).filter(
        (item) =>
          item.periods > 0 ||
          grid.days.some(
            (day) =>
              day.day === item.day
          )
      );

    const weeklyPeriods =
      entries.length;

    const maximumWeeklyPeriods =
      Number(
        timetableConfig.rules
          ?.maximumTeacherPeriodsPerWeek ||
          0
      );

    return response.status(200).json({
      success: true,
      timetableConfig,
      teacher:
        teacherRecord,
      rotation,
      timetableEntries:
        entries,
      grid,
      workload: {
        daily:
          dailyWorkload,
        weeklyPeriods,
        weeklyTeachingMinutes:
          entries.reduce(
            (total, entry) =>
              total +
              Number(
                entry.periodSnapshot
                  ?.durationMinutes ||
                  0
              ),
            0
          ),
        maximumWeeklyPeriods,
        remainingCapacity:
          maximumWeeklyPeriods > 0
            ? Math.max(
                maximumWeeklyPeriods -
                  weeklyPeriods,
                0
              )
            : null,
        isOverloaded:
          maximumWeeklyPeriods > 0 &&
          weeklyPeriods >
            maximumWeeklyPeriods
      },
      data: {
        timetableConfig,
        teacher:
          teacherRecord,
        rotation,
        timetableEntries:
          entries,
        grid
      }
    });
  } catch (error) {
    console.error(
      "Get teacher timetable error:",
      error
    );

    return sendError(
      response,
      500,
      "Teacher timetable could not be loaded."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Complete School Timetable
|--------------------------------------------------------------------------
*/

const getSchoolTimetable = async (
  request,
  response
) => {
  try {
    const timetableConfigResult =
      await findScopedTimetableConfig(
        request,
        request.query.timetableConfigId,
        {
          allowActiveFallback: true,
          requestedSchoolId:
            request.query.schoolId
        }
      );

    if (!timetableConfigResult) {
      return sendError(
        response,
        404,
        "Timetable configuration was not found."
      );
    }

    const timetableConfig =
      timetableConfigResult.timetableConfig;

    const rotation =
      getRotationDetails(
        timetableConfig,
        request.query.rotationWeekCode
      );

    const filter = {
      schoolId:
        timetableConfig.schoolId,
      timetableConfigId:
        timetableConfig._id,
      rotationWeekCode:
        rotation.code,
      entryStatus: "scheduled",
      isDeleted: false
    };

    if (request.query.day) {
      filter.day = String(
        request.query.day
      ).toLowerCase();
    }

    const entries =
      await populateTimetableEntry(
        TimetableEntry.find(filter)
          .sort({
            day: 1,
            "periodSnapshot.sequence": 1,
            "classSnapshot.name": 1,
            sectionName: 1
          })
      );

    const grid = buildTimetableGrid({
      timetableConfig,
      entries,
      rotationWeekCode:
        rotation.code
    });

    return response.status(200).json({
      success: true,
      timetableConfig,
      rotation,
      timetableEntries:
        entries,
      grid,
      summary: {
        totalAssignments:
          entries.length,
        uniqueClasses:
          new Set(
            entries.map((entry) =>
              String(
                entry.classId?._id ||
                entry.classId
              )
            )
          ).size,
        uniqueTeachers:
          new Set(
            entries
              .filter(
                (entry) =>
                  entry.teacherId
              )
              .map((entry) =>
                String(
                  entry.teacherId?._id ||
                  entry.teacherId
                )
              )
          ).size,
        uniqueSubjects:
          new Set(
            entries
              .filter(
                (entry) =>
                  entry.subjectId
              )
              .map((entry) =>
                String(
                  entry.subjectId?._id ||
                  entry.subjectId
                )
              )
          ).size
      },
      data: {
        timetableConfig,
        rotation,
        timetableEntries:
          entries,
        grid
      }
    });
  } catch (error) {
    console.error(
      "Get school timetable error:",
      error
    );

    return sendError(
      response,
      500,
      "School timetable could not be loaded."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Timetable Report
|--------------------------------------------------------------------------
*/

const getTimetableReport = async (
  request,
  response
) => {
  try {
    const timetableConfigResult =
      await findScopedTimetableConfig(
        request,
        request.query.timetableConfigId,
        {
          allowActiveFallback: true,
          requestedSchoolId:
            request.query.schoolId
        }
      );

    if (!timetableConfigResult) {
      return sendError(
        response,
        404,
        "Timetable configuration was not found."
      );
    }

    const timetableConfig =
      timetableConfigResult.timetableConfig;

    const rotation =
      getRotationDetails(
        timetableConfig,
        request.query.rotationWeekCode
      );

    const filter = {
      schoolId:
        timetableConfig.schoolId,
      timetableConfigId:
        timetableConfig._id,
      rotationWeekCode:
        rotation.code,
      isDeleted: false
    };

    if (request.query.entryStatus) {
      filter.entryStatus =
        request.query.entryStatus;
    }

    const [
      entries,
      classCount,
      activeTeacherCount,
      activeSubjectCount
    ] = await Promise.all([
      TimetableEntry.find(filter)
        .select(
          "+sectionKey +roomKey day periodId periodSnapshot classId classSnapshot sectionName subjectId subjectSnapshot teacherId teacherSnapshot room entryType deliveryMode entryStatus"
        )
        .lean(),
      ClassModel.countDocuments({
        schoolId:
          timetableConfig.schoolId,
        isDeleted: {
          $ne: true
        },
        isActive: {
          $ne: false
        }
      }),
      Teacher.countDocuments({
        schoolId:
          timetableConfig.schoolId,
        isDeleted: {
          $ne: true
        },
        status: "active"
      }),
      Subject.countDocuments({
        schoolId:
          timetableConfig.schoolId,
        isDeleted: {
          $ne: true
        },
        isActive: {
          $ne: false
        }
      })
    ]);

    const scheduledEntries =
      entries.filter(
        (entry) =>
          entry.entryStatus ===
          "scheduled"
      );

    const cancelledEntries =
      entries.filter(
        (entry) =>
          entry.entryStatus ===
          "cancelled"
      );

    const groupBy = (
      items,
      keyBuilder
    ) => {
      const map = new Map();

      items.forEach((item) => {
        const key = keyBuilder(item);

        if (!map.has(key.id)) {
          map.set(key.id, {
            ...key,
            count: 0,
            teachingMinutes: 0,
            entries: []
          });
        }

        const group = map.get(key.id);
        group.count += 1;
        group.teachingMinutes +=
          Number(
            item.periodSnapshot
              ?.durationMinutes ||
              0
          );
        group.entries.push(item);
      });

      return Array.from(
        map.values()
      );
    };

    const byDay = groupBy(
      scheduledEntries,
      (entry) => ({
        id: entry.day,
        label:
          entry.day
            .charAt(0)
            .toUpperCase() +
          entry.day.slice(1),
        dayOrder:
          getDayOrder(entry.day)
      })
    ).sort(
      (first, second) =>
        first.dayOrder -
        second.dayOrder
    );

    const byTeacher = groupBy(
      scheduledEntries.filter(
        (entry) =>
          entry.teacherId
      ),
      (entry) => ({
        id:
          String(entry.teacherId),
        label:
          entry.teacherSnapshot?.name ||
          "Teacher",
        employeeId:
          entry.teacherSnapshot
            ?.employeeId || ""
      })
    ).sort(
      (first, second) =>
        second.count - first.count
    );

    const byClass = groupBy(
      scheduledEntries,
      (entry) => ({
        id: [
          String(entry.classId),
          entry.sectionKey
        ].join("|"),
        classId:
          entry.classId,
        label:
          `${entry.classSnapshot?.name || "Class"}${entry.sectionName ? ` - ${entry.sectionName}` : ""}`
      })
    ).sort((first, second) =>
      first.label.localeCompare(
        second.label
      )
    );

    const bySubject = groupBy(
      scheduledEntries.filter(
        (entry) =>
          entry.subjectId
      ),
      (entry) => ({
        id:
          String(entry.subjectId),
        label:
          entry.subjectSnapshot?.name ||
          "Subject",
        code:
          entry.subjectSnapshot?.code ||
          ""
      })
    ).sort(
      (first, second) =>
        second.count - first.count
    );

    const unassignedTeacherEntries =
      scheduledEntries.filter(
        (entry) =>
          !entry.teacherId &&
          entry.periodSnapshot
            ?.requiresTeacher !== false
      );

    const unassignedSubjectEntries =
      scheduledEntries.filter(
        (entry) =>
          !entry.subjectId &&
          entry.periodSnapshot
            ?.requiresSubject !== false
      );

    const missingRoomEntries =
      scheduledEntries.filter(
        (entry) =>
          (
            entry.periodSnapshot
              ?.roomRequired ||
            timetableConfig.rules
              ?.requireRoomAssignment
          ) &&
          !entry.roomKey
      );

    const maximumTeacherPeriodsPerDay =
      Number(
        timetableConfig.rules
          ?.maximumTeacherPeriodsPerDay ||
          0
      );

    const maximumTeacherPeriodsPerWeek =
      Number(
        timetableConfig.rules
          ?.maximumTeacherPeriodsPerWeek ||
          0
      );

    const teacherWorkload =
      byTeacher.map((teacher) => {
        const daily = DAYS_OF_WEEK.map(
          (day) => ({
            day,
            periods:
              teacher.entries.filter(
                (entry) =>
                  entry.day === day
              ).length
          })
        );

        const dailyOverloads =
          daily.filter(
            (item) =>
              maximumTeacherPeriodsPerDay >
                0 &&
              item.periods >
                maximumTeacherPeriodsPerDay
          );

        return {
          teacherId:
            teacher.id,
          teacherName:
            teacher.label,
          employeeId:
            teacher.employeeId,
          weeklyPeriods:
            teacher.count,
          weeklyTeachingMinutes:
            teacher.teachingMinutes,
          daily,
          isWeeklyOverloaded:
            maximumTeacherPeriodsPerWeek >
              0 &&
            teacher.count >
              maximumTeacherPeriodsPerWeek,
          dailyOverloads
        };
      });

    const totalSchedulableSlots =
      (timetableConfig.daySchedules || [])
        .filter(
          (day) =>
            day.isWorkingDay
        )
        .reduce(
          (total, day) =>
            total +
            (day.periods || []).filter(
              (period) =>
                period.isActive &&
                period.isSchedulable
            ).length,
          0
        );

    const estimatedCapacity =
      totalSchedulableSlots *
      Math.max(classCount, 1);

    const scheduledTeachingMinutes =
      scheduledEntries.reduce(
        (total, entry) =>
          total +
          Number(
            entry.periodSnapshot
              ?.durationMinutes ||
              0
          ),
        0
      );

    return response.status(200).json({
      success: true,
      timetableConfig,
      rotation,
      summary: {
        totalEntries:
          entries.length,
        scheduledEntries:
          scheduledEntries.length,
        cancelledEntries:
          cancelledEntries.length,
        classCount,
        activeTeacherCount,
        activeSubjectCount,
        assignedTeacherCount:
          byTeacher.length,
        assignedSubjectCount:
          bySubject.length,
        scheduledTeachingMinutes,
        totalSchedulableSlots,
        estimatedCapacity,
        completionPercentage:
          estimatedCapacity > 0
            ? Number(
                (
                  (scheduledEntries.length /
                    estimatedCapacity) *
                  100
                ).toFixed(2)
              )
            : 0,
        unassignedTeacherCount:
          unassignedTeacherEntries.length,
        unassignedSubjectCount:
          unassignedSubjectEntries.length,
        missingRoomCount:
          missingRoomEntries.length,
        overloadedTeacherCount:
          teacherWorkload.filter(
            (teacher) =>
              teacher.isWeeklyOverloaded ||
              teacher.dailyOverloads.length >
                0
          ).length
      },
      breakdowns: {
        byDay:
          byDay.map(
            ({ entries: groupEntries, ...group }) =>
              group
          ),
        byTeacher:
          byTeacher.map(
            ({ entries: groupEntries, ...group }) =>
              group
          ),
        byClass:
          byClass.map(
            ({ entries: groupEntries, ...group }) =>
              group
          ),
        bySubject:
          bySubject.map(
            ({ entries: groupEntries, ...group }) =>
              group
          )
      },
      teacherWorkload,
      issues: {
        unassignedTeacherEntries,
        unassignedSubjectEntries,
        missingRoomEntries,
        overloadedTeachers:
          teacherWorkload.filter(
            (teacher) =>
              teacher.isWeeklyOverloaded ||
              teacher.dailyOverloads.length >
                0
          )
      },
      data: {
        summary: {
          totalEntries:
            entries.length,
          scheduledEntries:
            scheduledEntries.length,
          cancelledEntries:
            cancelledEntries.length
        },
        breakdowns: {
          byDay,
          byTeacher,
          byClass,
          bySubject
        },
        teacherWorkload
      }
    });
  } catch (error) {
    console.error(
      "Get timetable report error:",
      error
    );

    return sendError(
      response,
      500,
      "Timetable report could not be generated."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Controller Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  createTimetableEntry,
  createTimetableEntriesBulk,
  validateTimetableSlot,

  getTimetableEntries,
  getTimetableEntryById,
  updateTimetableEntry,

  cancelTimetableEntry,
  reactivateTimetableEntry,

  deleteTimetableEntry,
  getDeletedTimetableEntries,
  restoreTimetableEntry,

  getTimetableBuilderData,
  getClassTimetable,
  getTeacherTimetable,
  getSchoolTimetable,
  getTimetableReport
};
