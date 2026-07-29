const mongoose = require("mongoose");

const TimetableConfig = require("./TimetableConfig");

const {
  Schema
} = mongoose;

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

const ENTRY_TYPES = [
  "lesson",
  "homeroom",
  "advisory",
  "activity",
  "exam",
  "study_hall",
  "library",
  "sports",
  "practical",
  "other"
];

const DELIVERY_MODES = [
  "in_person",
  "online",
  "hybrid"
];

const ASSIGNMENT_SOURCES = [
  "manual",
  "auto_generated",
  "copied"
];

const ENTRY_PRIORITIES = [
  "normal",
  "preferred",
  "fixed"
];

const ENTRY_STATUSES = [
  "scheduled",
  "cancelled"
];

const RESOURCE_TYPES = [
  "none",
  "classroom",
  "science_lab",
  "computer_lab",
  "language_lab",
  "library",
  "sports_ground",
  "auditorium",
  "assembly_hall",
  "prayer_hall",
  "workshop",
  "other"
];

/*
|--------------------------------------------------------------------------
| Normalization Helpers
|--------------------------------------------------------------------------
*/

const normalizeText = (
  value
) => {
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

const normalizeUpperText = (
  value
) => {
  const normalized =
    normalizeText(value);

  return normalized
    ? normalized.toUpperCase()
    : normalized;
};

const normalizeCode = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  const normalized =
    String(value)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "-")
      .replace(/[^A-Z0-9-_]/g, "");

  return normalized || null;
};

const normalizeRotationCode = (
  value
) => {
  return (
    normalizeCode(value) ||
    "STANDARD"
  );
};

const buildSectionKey = (
  sectionName
) => {
  return (
    normalizeCode(sectionName) ||
    "__ALL__"
  );
};

const buildRoomKey = (
  room
) => {
  if (!room) {
    return null;
  }

  return (
    normalizeCode(room.code) ||
    normalizeCode(room.name) ||
    null
  );
};

const isValidHexColor = (
  value
) => {
  if (!value) {
    return true;
  }

  return /^#(?:[0-9A-F]{3}|[0-9A-F]{6})$/i.test(
    String(value)
  );
};

/*
|--------------------------------------------------------------------------
| Timetable Configuration Snapshot
|--------------------------------------------------------------------------
*/

const timetableConfigSnapshotSchema =
  new Schema(
    {
      title: {
        type: String,
        trim: true,
        maxlength: 150,
        set: normalizeText
      },

      code: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 50,
        set: normalizeCode
      },

      academicYearLabel: {
        type: String,
        trim: true,
        maxlength: 50,
        set: normalizeText
      },

      academicTermName: {
        type: String,
        trim: true,
        maxlength: 100,
        set: normalizeText
      },

      versionNumber: {
        type: Number,
        min: 1,
        default: 1
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Period Snapshot
|--------------------------------------------------------------------------
|
| Period data is copied from TimetableConfig so historical timetable views
| remain stable even when period settings are later revised.
|
*/

const periodSnapshotSchema =
  new Schema(
    {
      sequence: {
        type: Number,
        min: 1,
        default: null
      },

      code: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 30,
        set: normalizeCode
      },

      name: {
        type: String,
        trim: true,
        maxlength: 100,
        set: normalizeText
      },

      shortName: {
        type: String,
        trim: true,
        maxlength: 30,
        set: normalizeText
      },

      type: {
        type: String,
        trim: true,
        maxlength: 50,
        set: normalizeText
      },

      startTime: {
        type: String,
        trim: true
      },

      endTime: {
        type: String,
        trim: true
      },

      durationMinutes: {
        type: Number,
        min: 1,
        default: null
      },

      isInstructional: {
        type: Boolean,
        default: true
      },

      isSchedulable: {
        type: Boolean,
        default: true
      },

      requiresTeacher: {
        type: Boolean,
        default: true
      },

      requiresSubject: {
        type: Boolean,
        default: true
      },

      roomRequired: {
        type: Boolean,
        default: false
      },

      resourceType: {
        type: String,
        enum: RESOURCE_TYPES,
        default: "classroom"
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Class Snapshot
|--------------------------------------------------------------------------
*/

const classSnapshotSchema =
  new Schema(
    {
      name: {
        type: String,
        trim: true,
        maxlength: 150,
        set: normalizeText
      },

      code: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 50,
        set: normalizeCode
      },

      gradeLevel: {
        type: String,
        trim: true,
        maxlength: 50,
        set: normalizeText
      },

      sectionName: {
        type: String,
        trim: true,
        maxlength: 100,
        set: normalizeText
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Subject Snapshot
|--------------------------------------------------------------------------
*/

const subjectSnapshotSchema =
  new Schema(
    {
      name: {
        type: String,
        trim: true,
        maxlength: 150,
        set: normalizeText
      },

      code: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 50,
        set: normalizeCode
      },

      category: {
        type: String,
        trim: true,
        maxlength: 100,
        set: normalizeText
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Teacher Snapshot
|--------------------------------------------------------------------------
*/

const teacherSnapshotSchema =
  new Schema(
    {
      name: {
        type: String,
        trim: true,
        maxlength: 150,
        set: normalizeText
      },

      employeeId: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 50,
        set: normalizeUpperText
      },

      designation: {
        type: String,
        trim: true,
        maxlength: 100,
        set: normalizeText
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Room Assignment
|--------------------------------------------------------------------------
|
| roomId supports a future Room Management module. Code/name fields allow
| timetable use before a dedicated room collection exists.
|
*/

const roomAssignmentSchema =
  new Schema(
    {
      roomId: {
        type: Schema.Types.ObjectId,
        ref: "Room",
        default: null
      },

      code: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 50,
        set: normalizeCode
      },

      name: {
        type: String,
        trim: true,
        maxlength: 150,
        set: normalizeText
      },

      building: {
        type: String,
        trim: true,
        maxlength: 150,
        set: normalizeText
      },

      floor: {
        type: String,
        trim: true,
        maxlength: 50,
        set: normalizeText
      },

      resourceType: {
        type: String,
        enum: {
          values:
            RESOURCE_TYPES,

          message:
            "Invalid room resource type."
        },
        default: "classroom"
      },

      capacity: {
        type: Number,
        min: 0,
        max: 10000,
        default: null
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Timetable Entry Schema
|--------------------------------------------------------------------------
*/

const timetableEntrySchema =
  new Schema(
    {
      schoolId: {
        type: Schema.Types.ObjectId,
        ref: "School",
        required: [
          true,
          "School is required."
        ],
        index: true
      },

      timetableConfigId: {
        type: Schema.Types.ObjectId,
        ref: "TimetableConfig",
        required: [
          true,
          "Timetable configuration is required."
        ],
        index: true
      },

      timetableConfigSnapshot: {
        type:
          timetableConfigSnapshotSchema,
        default: () => ({})
      },

      rotationWeekCode: {
        type: String,
        required: [
          true,
          "Rotation week is required."
        ],
        trim: true,
        uppercase: true,
        maxlength: 50,
        default: "STANDARD",
        set: normalizeRotationCode,
        index: true
      },

      rotationWeekLabel: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "Standard Week",
        set: normalizeText
      },

      day: {
        type: String,
        required: [
          true,
          "Timetable day is required."
        ],
        lowercase: true,
        trim: true,
        enum: {
          values:
            DAYS_OF_WEEK,

          message:
            "Invalid timetable day."
        },
        index: true
      },

      periodId: {
        type: Schema.Types.ObjectId,
        required: [
          true,
          "Period is required."
        ],
        index: true
      },

      periodSnapshot: {
        type:
          periodSnapshotSchema,
        default: () => ({})
      },

      classId: {
        type: Schema.Types.ObjectId,
        ref: "Class",
        required: [
          true,
          "Class is required."
        ],
        index: true
      },

      sectionName: {
        type: String,
        trim: true,
        maxlength: [
          100,
          "Section name cannot exceed 100 characters."
        ],
        default: "",
        set: normalizeText
      },

      sectionKey: {
        type: String,
        trim: true,
        uppercase: true,
        required: true,
        default: "__ALL__",
        select: false,
        index: true
      },

      classSnapshot: {
        type:
          classSnapshotSchema,
        default: () => ({})
      },

      subjectId: {
        type: Schema.Types.ObjectId,
        ref: "Subject",
        default: null,
        index: true
      },

      subjectSnapshot: {
        type:
          subjectSnapshotSchema,
        default: () => ({})
      },

      teacherId: {
        type: Schema.Types.ObjectId,
        ref: "Teacher",
        default: null,
        index: true
      },

      teacherSnapshot: {
        type:
          teacherSnapshotSchema,
        default: () => ({})
      },

      room: {
        type:
          roomAssignmentSchema,
        default: () => ({})
      },

      roomKey: {
        type: String,
        trim: true,
        uppercase: true,
        default: null,
        select: false,
        index: true
      },

      entryType: {
        type: String,
        enum: {
          values:
            ENTRY_TYPES,

          message:
            "Invalid timetable entry type."
        },
        default: "lesson"
      },

      deliveryMode: {
        type: String,
        enum: {
          values:
            DELIVERY_MODES,

          message:
            "Invalid lesson delivery mode."
        },
        default: "in_person"
      },

      onlineMeetingUrl: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "Online meeting URL cannot exceed 1000 characters."
        ],
        default: null
      },

      lessonGroupId: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [
          80,
          "Lesson group identifier cannot exceed 80 characters."
        ],
        default: null,
        set: normalizeCode,
        index: true
      },

      assignmentSource: {
        type: String,
        enum: {
          values:
            ASSIGNMENT_SOURCES,

          message:
            "Invalid timetable assignment source."
        },
        default: "manual"
      },

      priority: {
        type: String,
        enum: {
          values:
            ENTRY_PRIORITIES,

          message:
            "Invalid timetable entry priority."
        },
        default: "normal"
      },

      isFixed: {
        type: Boolean,
        default: false
      },

      displayColor: {
        type: String,
        trim: true,
        uppercase: true,
        default: null,

        validate: {
          validator:
            isValidHexColor,

          message:
            "Display color must be a valid hexadecimal color."
        }
      },

      tags: {
        type: [
          String
        ],
        default: []
      },

      notes: {
        type: String,
        trim: true,
        maxlength: [
          2000,
          "Timetable notes cannot exceed 2000 characters."
        ],
        set: normalizeText
      },

      entryStatus: {
        type: String,
        enum: {
          values:
            ENTRY_STATUSES,

          message:
            "Invalid timetable entry status."
        },
        default: "scheduled",
        index: true
      },

      cancellationReason: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "Cancellation reason cannot exceed 1000 characters."
        ],
        default: null,
        set: normalizeText
      },

      cancelledAt: {
        type: Date,
        default: null
      },

      cancelledBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [
          true,
          "Created-by user is required."
        ]
      },

      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      isDeleted: {
        type: Boolean,
        default: false,
        index: true
      },

      deletedAt: {
        type: Date,
        default: null
      },

      deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null
      }
    },
    {
      timestamps: true,

      toJSON: {
        virtuals: true,

        transform: (
          document,
          returnedObject
        ) => {
          delete returnedObject.__v;
          delete returnedObject.sectionKey;
          delete returnedObject.roomKey;

          return returnedObject;
        }
      },

      toObject: {
        virtuals: true
      }
    }
  );

/*
|--------------------------------------------------------------------------
| Timetable Configuration and Period Validation
|--------------------------------------------------------------------------
*/

timetableEntrySchema.pre(
  "validate",
  async function validateTimetableEntry() {
    this.day =
      String(this.day || "")
        .trim()
        .toLowerCase();

    this.sectionName =
      normalizeText(
        this.sectionName || ""
      ) || "";

    this.sectionKey =
      buildSectionKey(
        this.sectionName
      );

    this.roomKey =
      buildRoomKey(
        this.room
      );

    this.rotationWeekCode =
      normalizeRotationCode(
        this.rotationWeekCode
      );

    this.tags =
      Array.from(
        new Set(
          (this.tags || [])
            .map(
              normalizeText
            )
            .filter(Boolean)
        )
      ).slice(0, 25);

    if (
      this.entryStatus ===
      "cancelled"
    ) {
      if (
        !this.cancellationReason
      ) {
        this.invalidate(
          "cancellationReason",
          "Cancellation reason is required for a cancelled timetable entry."
        );
      }

      if (!this.cancelledAt) {
        this.cancelledAt =
          new Date();
      }
    } else {
      this.cancellationReason =
        null;

      this.cancelledAt =
        null;

      this.cancelledBy =
        null;
    }

    if (
      this.deliveryMode ===
        "online" ||
      this.deliveryMode ===
        "hybrid"
    ) {
      if (
        !this.onlineMeetingUrl
      ) {
        this.invalidate(
          "onlineMeetingUrl",
          "Online or hybrid lessons require a meeting URL."
        );
      }
    } else {
      this.onlineMeetingUrl =
        null;
    }

    if (
      !this.timetableConfigId ||
      !mongoose.isValidObjectId(
        this.timetableConfigId
      )
    ) {
      return;
    }

    const timetableConfig =
      await TimetableConfig.findOne({
        _id:
          this.timetableConfigId,
        isDeleted: false
      }).select(
        "schoolId title code academicYear academicTerm rotationCycle daySchedules rules status isLocked versionNumber"
      );

    if (!timetableConfig) {
      this.invalidate(
        "timetableConfigId",
        "Timetable configuration was not found."
      );

      return;
    }

    if (
      String(
        timetableConfig.schoolId
      ) !==
      String(this.schoolId)
    ) {
      this.invalidate(
        "schoolId",
        "Timetable configuration does not belong to the selected school."
      );
    }

    const scheduleFields = [
      "schoolId",
      "timetableConfigId",
      "rotationWeekCode",
      "day",
      "periodId",
      "classId",
      "sectionName",
      "subjectId",
      "teacherId",
      "room",
      "entryType",
      "deliveryMode",
      "lessonGroupId"
    ];

    const scheduleWasChanged =
      this.isNew ||
      scheduleFields.some(
        (fieldName) =>
          this.isModified(
            fieldName
          )
      );

    if (
      timetableConfig.isLocked &&
      scheduleWasChanged
    ) {
      this.invalidate(
        "timetableConfigId",
        "This timetable is locked and its schedule entries cannot be changed."
      );
    }

    this.timetableConfigSnapshot = {
      title:
        timetableConfig.title,

      code:
        timetableConfig.code,

      academicYearLabel:
        timetableConfig
          .academicYear
          ?.label || "",

      academicTermName:
        timetableConfig
          .academicTerm
          ?.enabled
          ? timetableConfig
              .academicTerm
              .name || ""
          : "",

      versionNumber:
        timetableConfig
          .versionNumber || 1
    };

    const rotationCycle =
      timetableConfig
        .rotationCycle || {};

    if (
      rotationCycle.enabled
    ) {
      const weekLabels =
        Array.isArray(
          rotationCycle.weekLabels
        )
          ? rotationCycle.weekLabels
          : [];

      const matchedWeekLabel =
        weekLabels.find(
          (label) =>
            normalizeRotationCode(
              label
            ) ===
            this.rotationWeekCode
        );

      if (!matchedWeekLabel) {
        this.invalidate(
          "rotationWeekCode",
          "Selected rotation week is not available in this timetable configuration."
        );
      } else {
        this.rotationWeekLabel =
          matchedWeekLabel;
      }
    } else {
      this.rotationWeekCode =
        "STANDARD";

      this.rotationWeekLabel =
        "Standard Week";
    }

    const daySchedule =
      timetableConfig
        .daySchedules
        ?.find(
          (schedule) =>
            schedule.day ===
            this.day
        );

    if (!daySchedule) {
      this.invalidate(
        "day",
        "The selected day is not configured in this timetable."
      );

      return;
    }

    if (
      !daySchedule.isWorkingDay
    ) {
      this.invalidate(
        "day",
        "Timetable entries cannot be created on a non-working day."
      );

      return;
    }

    const period =
      daySchedule.periods.id(
        this.periodId
      );

    if (!period) {
      this.invalidate(
        "periodId",
        "The selected period does not exist on this working day."
      );

      return;
    }

    if (!period.isActive) {
      this.invalidate(
        "periodId",
        "The selected period is inactive."
      );
    }

    if (
      !period.isSchedulable &&
      !timetableConfig.rules
        ?.allowSchedulingOnNonInstructionalPeriods
    ) {
      this.invalidate(
        "periodId",
        `${period.name} is not available for class scheduling.`
      );
    }

    this.periodSnapshot = {
      sequence:
        period.sequence,

      code:
        period.code,

      name:
        period.name,

      shortName:
        period.shortName ||
        period.name,

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

      requiresTeacher:
        period.requiresTeacher,

      requiresSubject:
        period.requiresSubject,

      roomRequired:
        period.roomRequired,

      resourceType:
        period.resourceType
    };

    const allowUnassignedTeacher =
      Boolean(
        timetableConfig.rules
          ?.allowUnassignedTeacher
      );

    const allowUnassignedSubject =
      Boolean(
        timetableConfig.rules
          ?.allowUnassignedSubject
      );

    const requireRoomAssignment =
      Boolean(
        timetableConfig.rules
          ?.requireRoomAssignment
      );

    if (
      period.requiresTeacher &&
      !allowUnassignedTeacher &&
      !this.teacherId
    ) {
      this.invalidate(
        "teacherId",
        `${period.name} requires a teacher assignment.`
      );
    }

    if (
      period.requiresSubject &&
      !allowUnassignedSubject &&
      !this.subjectId
    ) {
      this.invalidate(
        "subjectId",
        `${period.name} requires a subject assignment.`
      );
    }

    if (
      (
        period.roomRequired ||
        requireRoomAssignment
      ) &&
      !this.roomKey
    ) {
      this.invalidate(
        "room",
        `${period.name} requires a room assignment.`
      );
    }

    if (
      period.resourceType &&
      period.resourceType !==
        "none" &&
      this.roomKey &&
      this.room?.resourceType &&
      this.room.resourceType !==
        "other" &&
      this.room.resourceType !==
        period.resourceType
    ) {
      this.invalidate(
        "room.resourceType",
        `${period.name} requires a ${period.resourceType.replaceAll(
          "_",
          " "
        )} resource.`
      );
    }

    if (
      this.classSnapshot
    ) {
      this.classSnapshot.sectionName =
        this.sectionName;
    }
  }
);

/*
|--------------------------------------------------------------------------
| Virtual Fields
|--------------------------------------------------------------------------
*/

timetableEntrySchema.virtual(
  "displayTime"
).get(function getDisplayTime() {
  const startTime =
    this.periodSnapshot
      ?.startTime;

  const endTime =
    this.periodSnapshot
      ?.endTime;

  if (!startTime || !endTime) {
    return "";
  }

  return `${startTime} - ${endTime}`;
});

timetableEntrySchema.virtual(
  "displayClass"
).get(function getDisplayClass() {
  const className =
    this.classSnapshot
      ?.name || "Class";

  return this.sectionName
    ? `${className} - ${this.sectionName}`
    : className;
});

timetableEntrySchema.virtual(
  "displaySubject"
).get(function getDisplaySubject() {
  return (
    this.subjectSnapshot
      ?.name ||
    this.entryType
      ?.replaceAll("_", " ") ||
    "Scheduled Activity"
  );
});

timetableEntrySchema.virtual(
  "displayTeacher"
).get(function getDisplayTeacher() {
  return (
    this.teacherSnapshot
      ?.name ||
    "Unassigned Teacher"
  );
});

timetableEntrySchema.virtual(
  "isLinkedPeriod"
).get(function getIsLinkedPeriod() {
  return Boolean(
    this.lessonGroupId
  );
});

timetableEntrySchema.virtual(
  "isCancelled"
).get(function getIsCancelled() {
  return (
    this.entryStatus ===
    "cancelled"
  );
});

/*
|--------------------------------------------------------------------------
| Instance Methods
|--------------------------------------------------------------------------
*/

timetableEntrySchema.methods.getConflictScope =
  function getConflictScope() {
    return {
      schoolId:
        this.schoolId,

      timetableConfigId:
        this.timetableConfigId,

      rotationWeekCode:
        this.rotationWeekCode,

      day:
        this.day,

      periodId:
        this.periodId,

      entryStatus:
        "scheduled",

      isDeleted:
        false
    };
  };

timetableEntrySchema.methods.findConflicts =
  async function findConflicts() {
    return this.constructor.findScheduleConflicts(
      {
        schoolId:
          this.schoolId,

        timetableConfigId:
          this.timetableConfigId,

        rotationWeekCode:
          this.rotationWeekCode,

        day:
          this.day,

        periodId:
          this.periodId,

        classId:
          this.classId,

        sectionName:
          this.sectionName,

        teacherId:
          this.teacherId,

        room:
          this.room
      },
      this._id
    );
  };

/*
|--------------------------------------------------------------------------
| Static Conflict Detection
|--------------------------------------------------------------------------
|
| Controllers can call this before create/update to return readable conflict
| messages. Unique indexes below remain the final race-condition protection.
|
*/

timetableEntrySchema.statics.findScheduleConflicts =
  async function findScheduleConflicts(
    payload,
    excludeEntryId = null
  ) {
    const baseQuery = {
      schoolId:
        payload.schoolId,

      timetableConfigId:
        payload.timetableConfigId,

      rotationWeekCode:
        normalizeRotationCode(
          payload.rotationWeekCode
        ),

      day:
        String(
          payload.day || ""
        ).toLowerCase(),

      periodId:
        payload.periodId,

      entryStatus:
        "scheduled",

      isDeleted:
        false
    };

    if (
      excludeEntryId &&
      mongoose.isValidObjectId(
        excludeEntryId
      )
    ) {
      baseQuery._id = {
        $ne:
          excludeEntryId
      };
    }

    const sectionKey =
      buildSectionKey(
        payload.sectionName
      );

    const roomKey =
      buildRoomKey(
        payload.room
      );

    const conflictConditions = [];

    if (payload.classId) {
      conflictConditions.push({
        classId:
          payload.classId,
        sectionKey
      });
    }

    if (payload.teacherId) {
      conflictConditions.push({
        teacherId:
          payload.teacherId
      });
    }

    if (roomKey) {
      conflictConditions.push({
        roomKey
      });
    }

    if (
      conflictConditions.length ===
      0
    ) {
      return [];
    }

    const existingEntries =
      await this.find({
        ...baseQuery,
        $or:
          conflictConditions
      })
        .select(
          "+sectionKey +roomKey classId sectionName teacherId room periodSnapshot classSnapshot subjectSnapshot teacherSnapshot"
        )
        .lean();

    return existingEntries.map(
      (entry) => {
        const conflictTypes = [];

        if (
          payload.classId &&
          String(entry.classId) ===
            String(payload.classId) &&
          entry.sectionKey ===
            sectionKey
        ) {
          conflictTypes.push(
            "class"
          );
        }

        if (
          payload.teacherId &&
          entry.teacherId &&
          String(entry.teacherId) ===
            String(payload.teacherId)
        ) {
          conflictTypes.push(
            "teacher"
          );
        }

        if (
          roomKey &&
          entry.roomKey ===
            roomKey
        ) {
          conflictTypes.push(
            "room"
          );
        }

        return {
          conflictTypes,
          entry
        };
      }
    );
  };

/*
|--------------------------------------------------------------------------
| Database Conflict Indexes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| One class/section cannot receive two assignments in the same slot.
|--------------------------------------------------------------------------
*/

timetableEntrySchema.index(
  {
    schoolId: 1,
    timetableConfigId: 1,
    rotationWeekCode: 1,
    day: 1,
    periodId: 1,
    classId: 1,
    sectionKey: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,
      entryStatus:
        "scheduled"
    },

    name:
      "unique_class_timetable_slot"
  }
);

/*
|--------------------------------------------------------------------------
| One teacher cannot teach two classes in the same slot.
|--------------------------------------------------------------------------
*/

timetableEntrySchema.index(
  {
    schoolId: 1,
    timetableConfigId: 1,
    rotationWeekCode: 1,
    day: 1,
    periodId: 1,
    teacherId: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,
      entryStatus:
        "scheduled",
      teacherId: {
        $type:
          "objectId"
      }
    },

    name:
      "unique_teacher_timetable_slot"
  }
);

/*
|--------------------------------------------------------------------------
| One room/resource cannot be assigned to two classes in the same slot.
|--------------------------------------------------------------------------
*/

timetableEntrySchema.index(
  {
    schoolId: 1,
    timetableConfigId: 1,
    rotationWeekCode: 1,
    day: 1,
    periodId: 1,
    roomKey: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,
      entryStatus:
        "scheduled",
      roomKey: {
        $type:
          "string"
      }
    },

    name:
      "unique_room_timetable_slot"
  }
);

/*
|--------------------------------------------------------------------------
| Class Timetable Queries
|--------------------------------------------------------------------------
*/

timetableEntrySchema.index(
  {
    schoolId: 1,
    timetableConfigId: 1,
    classId: 1,
    sectionKey: 1,
    rotationWeekCode: 1,
    day: 1,
    "periodSnapshot.sequence": 1,
    isDeleted: 1
  },
  {
    name:
      "class_timetable_view_index"
  }
);

/*
|--------------------------------------------------------------------------
| Teacher Timetable and Workload Queries
|--------------------------------------------------------------------------
*/

timetableEntrySchema.index(
  {
    schoolId: 1,
    timetableConfigId: 1,
    teacherId: 1,
    rotationWeekCode: 1,
    day: 1,
    "periodSnapshot.sequence": 1,
    isDeleted: 1
  },
  {
    name:
      "teacher_timetable_view_index"
  }
);

/*
|--------------------------------------------------------------------------
| Subject and Reporting Queries
|--------------------------------------------------------------------------
*/

timetableEntrySchema.index(
  {
    schoolId: 1,
    timetableConfigId: 1,
    subjectId: 1,
    classId: 1,
    entryStatus: 1,
    isDeleted: 1
  },
  {
    name:
      "subject_timetable_report_index"
  }
);

timetableEntrySchema.index(
  {
    schoolId: 1,
    timetableConfigId: 1,
    day: 1,
    rotationWeekCode: 1,
    entryStatus: 1,
    isDeleted: 1
  },
  {
    name:
      "daily_school_timetable_index"
  }
);

timetableEntrySchema.index(
  {
    schoolId: 1,
    timetableConfigId: 1,
    lessonGroupId: 1,
    isDeleted: 1
  },
  {
    name:
      "linked_lesson_group_index"
  }
);

timetableEntrySchema.index(
  {
    schoolId: 1,
    createdAt: -1,
    isDeleted: 1
  },
  {
    name:
      "school_timetable_entry_created_index"
  }
);

/*
|--------------------------------------------------------------------------
| Model Export
|--------------------------------------------------------------------------
*/

const TimetableEntry =
  mongoose.models
    .TimetableEntry ||
  mongoose.model(
    "TimetableEntry",
    timetableEntrySchema
  );

module.exports =
  TimetableEntry;
