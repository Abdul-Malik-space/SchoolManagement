const mongoose = require("mongoose");

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

const PERIOD_TYPES = [
  "instructional",
  "assembly",
  "homeroom",
  "advisory",
  "break",
  "lunch",
  "prayer",
  "activity",
  "exam",
  "transition",
  "other"
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

const TIMETABLE_STATUSES = [
  "draft",
  "published",
  "archived"
];

const ROTATION_TYPES = [
  "weekly",
  "biweekly",
  "custom"
];

/*
|--------------------------------------------------------------------------
| Helper Functions
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

const normalizeCode = (
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
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-_]/g, "");
};

const isValidTime = (
  value
) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(
    String(value || "")
  );
};

const timeToMinutes = (
  value
) => {
  if (!isValidTime(value)) {
    return null;
  }

  const [
    hours,
    minutes
  ] = String(value)
    .split(":")
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
};

const calculateDurationMinutes = (
  startTime,
  endTime
) => {
  const startMinutes =
    timeToMinutes(startTime);

  const endMinutes =
    timeToMinutes(endTime);

  if (
    startMinutes === null ||
    endMinutes === null ||
    endMinutes <= startMinutes
  ) {
    return 0;
  }

  return (
    endMinutes -
    startMinutes
  );
};

const isInstructionalType = (
  periodType
) => {
  return [
    "instructional",
    "homeroom",
    "advisory",
    "activity",
    "exam"
  ].includes(periodType);
};

const isSchedulableType = (
  periodType
) => {
  return [
    "instructional",
    "homeroom",
    "advisory",
    "activity",
    "exam"
  ].includes(periodType);
};

/*
|--------------------------------------------------------------------------
| Academic Year Schema
|--------------------------------------------------------------------------
*/

const academicYearSchema =
  new Schema(
    {
      label: {
        type: String,
        required: [
          true,
          "Academic year label is required."
        ],
        trim: true,
        maxlength: [
          50,
          "Academic year label cannot exceed 50 characters."
        ],
        set: normalizeText
      },

      startDate: {
        type: Date,
        required: [
          true,
          "Academic year start date is required."
        ]
      },

      endDate: {
        type: Date,
        required: [
          true,
          "Academic year end date is required."
        ]
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Academic Term Schema
|--------------------------------------------------------------------------
*/

const academicTermSchema =
  new Schema(
    {
      enabled: {
        type: Boolean,
        default: false
      },

      name: {
        type: String,
        trim: true,
        maxlength: [
          100,
          "Term name cannot exceed 100 characters."
        ],
        set: normalizeText
      },

      code: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [
          30,
          "Term code cannot exceed 30 characters."
        ],
        set: normalizeCode
      },

      startDate: {
        type: Date,
        default: null
      },

      endDate: {
        type: Date,
        default: null
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Rotation Cycle Schema
|--------------------------------------------------------------------------
|
| International schools commonly use Week A / Week B or custom timetable
| rotation systems.
|
*/

const rotationCycleSchema =
  new Schema(
    {
      enabled: {
        type: Boolean,
        default: false
      },

      type: {
        type: String,
        enum: {
          values:
            ROTATION_TYPES,

          message:
            "Invalid timetable rotation type."
        },
        default: "weekly"
      },

      cycleLengthWeeks: {
        type: Number,
        min: [
          1,
          "Rotation cycle must contain at least one week."
        ],
        max: [
          12,
          "Rotation cycle cannot exceed 12 weeks."
        ],
        default: 1
      },

      weekLabels: {
        type: [
          String
        ],
        default: []
      },

      cycleStartDate: {
        type: Date,
        default: null
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Period Schema
|--------------------------------------------------------------------------
|
| Each period is stored inside a working day schedule.
| A period may be instructional, break, lunch, assembly, prayer, etc.
|
*/

const periodSchema =
  new Schema(
    {
      sequence: {
        type: Number,
        required: [
          true,
          "Period sequence is required."
        ],
        min: [
          1,
          "Period sequence must be at least 1."
        ]
      },

      code: {
        type: String,
        required: [
          true,
          "Period code is required."
        ],
        trim: true,
        uppercase: true,
        maxlength: [
          30,
          "Period code cannot exceed 30 characters."
        ],
        set: normalizeCode
      },

      name: {
        type: String,
        required: [
          true,
          "Period name is required."
        ],
        trim: true,
        maxlength: [
          100,
          "Period name cannot exceed 100 characters."
        ],
        set: normalizeText
      },

      shortName: {
        type: String,
        trim: true,
        maxlength: [
          30,
          "Period short name cannot exceed 30 characters."
        ],
        set: normalizeText
      },

      type: {
        type: String,
        enum: {
          values:
            PERIOD_TYPES,

          message:
            "Invalid period type."
        },
        default:
          "instructional"
      },

      startTime: {
        type: String,
        required: [
          true,
          "Period start time is required."
        ],
        trim: true,

        validate: {
          validator:
            isValidTime,

          message:
            "Start time must use HH:mm 24-hour format."
        }
      },

      endTime: {
        type: String,
        required: [
          true,
          "Period end time is required."
        ],
        trim: true,

        validate: {
          validator:
            isValidTime,

          message:
            "End time must use HH:mm 24-hour format."
        }
      },

      durationMinutes: {
        type: Number,
        min: [
          1,
          "Period duration must be at least one minute."
        ],
        default: 1
      },

      isInstructional: {
        type: Boolean,
        default: true
      },

      isSchedulable: {
        type: Boolean,
        default: true
      },

      allowDoublePeriod: {
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

      resourceType: {
        type: String,
        enum: {
          values:
            RESOURCE_TYPES,

          message:
            "Invalid timetable resource type."
        },
        default: "classroom"
      },

      roomRequired: {
        type: Boolean,
        default: false
      },

      notes: {
        type: String,
        trim: true,
        maxlength: [
          500,
          "Period notes cannot exceed 500 characters."
        ],
        set: normalizeText
      },

      isActive: {
        type: Boolean,
        default: true
      }
    },
    {
      _id: true
    }
  );

/*
|--------------------------------------------------------------------------
| Day Schedule Schema
|--------------------------------------------------------------------------
*/

const dayScheduleSchema =
  new Schema(
    {
      day: {
        type: String,
        required: [
          true,
          "Schedule day is required."
        ],

        enum: {
          values:
            DAYS_OF_WEEK,

          message:
            "Invalid working day."
        }
      },

      label: {
        type: String,
        trim: true,
        maxlength: [
          50,
          "Day label cannot exceed 50 characters."
        ],
        set: normalizeText
      },

      isWorkingDay: {
        type: Boolean,
        default: true
      },

      isHalfDay: {
        type: Boolean,
        default: false
      },

      periods: {
        type: [
          periodSchema
        ],
        default: []
      },

      totalDayMinutes: {
        type: Number,
        min: 0,
        default: 0
      },

      totalInstructionMinutes: {
        type: Number,
        min: 0,
        default: 0
      },

      totalNonInstructionMinutes: {
        type: Number,
        min: 0,
        default: 0
      },

      notes: {
        type: String,
        trim: true,
        maxlength: [
          500,
          "Day notes cannot exceed 500 characters."
        ],
        set: normalizeText
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Timetable Rules Schema
|--------------------------------------------------------------------------
*/

const timetableRulesSchema =
  new Schema(
    {
      maximumTeacherPeriodsPerDay: {
        type: Number,
        min: 1,
        max: 20,
        default: 8
      },

      maximumTeacherPeriodsPerWeek: {
        type: Number,
        min: 1,
        max: 100,
        default: 40
      },

      maximumClassPeriodsPerDay: {
        type: Number,
        min: 1,
        max: 20,
        default: 10
      },

      maximumConsecutiveTeacherPeriods: {
        type: Number,
        min: 1,
        max: 10,
        default: 3
      },

      maximumConsecutiveClassPeriods: {
        type: Number,
        min: 1,
        max: 10,
        default: 4
      },

      minimumTeacherFreePeriodsPerDay: {
        type: Number,
        min: 0,
        max: 10,
        default: 1
      },

      minimumTeacherBreakMinutes: {
        type: Number,
        min: 0,
        max: 240,
        default: 20
      },

      allowDoublePeriods: {
        type: Boolean,
        default: true
      },

      preventTeacherConflicts: {
        type: Boolean,
        default: true
      },

      preventClassConflicts: {
        type: Boolean,
        default: true
      },

      preventRoomConflicts: {
        type: Boolean,
        default: true
      },

      requireRoomAssignment: {
        type: Boolean,
        default: false
      },

      allowUnassignedTeacher: {
        type: Boolean,
        default: false
      },

      allowUnassignedSubject: {
        type: Boolean,
        default: false
      },

      allowSchedulingOnNonInstructionalPeriods: {
        type: Boolean,
        default: false
      },

      enforceTeacherAvailability: {
        type: Boolean,
        default: true
      },

      enforceTeacherWorkload: {
        type: Boolean,
        default: true
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Publication Schema
|--------------------------------------------------------------------------
*/

const publicationSchema =
  new Schema(
    {
      publishedAt: {
        type: Date,
        default: null
      },

      publishedBy: {
        type:
          Schema.Types.ObjectId,

        ref: "User",
        default: null
      },

      archivedAt: {
        type: Date,
        default: null
      },

      archivedBy: {
        type:
          Schema.Types.ObjectId,

        ref: "User",
        default: null
      },

      publicationNotes: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "Publication notes cannot exceed 1000 characters."
        ],
        set: normalizeText
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Timetable Configuration Schema
|--------------------------------------------------------------------------
*/

const timetableConfigSchema =
  new Schema(
    {
      schoolId: {
        type:
          Schema.Types.ObjectId,

        ref: "School",

        required: [
          true,
          "School is required."
        ],

        index: true
      },

      title: {
        type: String,

        required: [
          true,
          "Timetable title is required."
        ],

        trim: true,

        maxlength: [
          150,
          "Timetable title cannot exceed 150 characters."
        ],

        set: normalizeText
      },

      code: {
        type: String,

        required: [
          true,
          "Timetable code is required."
        ],

        trim: true,
        uppercase: true,

        maxlength: [
          50,
          "Timetable code cannot exceed 50 characters."
        ],

        set: normalizeCode
      },

      description: {
        type: String,
        trim: true,

        maxlength: [
          1500,
          "Timetable description cannot exceed 1500 characters."
        ],

        set: normalizeText
      },

      academicYear: {
        type:
          academicYearSchema,

        required: true
      },

      academicTerm: {
        type:
          academicTermSchema,

        default: () => ({})
      },

      effectiveFrom: {
        type: Date,
        required: [
          true,
          "Timetable effective start date is required."
        ]
      },

      effectiveTo: {
        type: Date,
        required: [
          true,
          "Timetable effective end date is required."
        ]
      },

      timezone: {
        type: String,
        required: [
          true,
          "School timezone is required."
        ],
        trim: true,
        default:
          "Asia/Karachi",
        maxlength: 100
      },

      locale: {
        type: String,
        trim: true,
        default: "en-US",
        maxlength: 20
      },

      weekStartsOn: {
        type: String,

        enum: {
          values:
            DAYS_OF_WEEK,

          message:
            "Invalid week start day."
        },

        default: "monday"
      },

      rotationCycle: {
        type:
          rotationCycleSchema,

        default: () => ({})
      },

      daySchedules: {
        type: [
          dayScheduleSchema
        ],

        required: [
          true,
          "At least one day schedule is required."
        ],

        default: []
      },

      rules: {
        type:
          timetableRulesSchema,

        default: () => ({})
      },

      status: {
        type: String,

        enum: {
          values:
            TIMETABLE_STATUSES,

          message:
            "Invalid timetable status."
        },

        default: "draft",

        index: true
      },

      isActive: {
        type: Boolean,
        default: false,
        index: true
      },

      isLocked: {
        type: Boolean,
        default: false
      },

      versionNumber: {
        type: Number,
        min: 1,
        default: 1
      },

      copiedFromConfigId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "TimetableConfig",

        default: null
      },

      publication: {
        type:
          publicationSchema,

        default: () => ({})
      },

      createdBy: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        required: [
          true,
          "Created-by user is required."
        ]
      },

      updatedBy: {
        type:
          Schema.Types.ObjectId,

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
        type:
          Schema.Types.ObjectId,

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
| Validation and Automatic Calculations
|--------------------------------------------------------------------------
*/

timetableConfigSchema.pre(
  "validate",
  function timetableValidation() {
      /*
      |--------------------------------------------------------------------------
      | Academic Year Validation
      |--------------------------------------------------------------------------
      */

      if (
        this.academicYear
          ?.startDate &&
        this.academicYear
          ?.endDate &&
        this.academicYear
          .endDate <=
          this.academicYear
            .startDate
      ) {
        this.invalidate(
          "academicYear.endDate",
          "Academic year end date must be later than its start date."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Effective Date Validation
      |--------------------------------------------------------------------------
      */

      if (
        this.effectiveFrom &&
        this.effectiveTo &&
        this.effectiveTo <
          this.effectiveFrom
      ) {
        this.invalidate(
          "effectiveTo",
          "Timetable effective end date cannot be earlier than its start date."
        );
      }

      if (
        this.academicYear
          ?.startDate &&
        this.effectiveFrom &&
        this.effectiveFrom <
          this.academicYear
            .startDate
      ) {
        this.invalidate(
          "effectiveFrom",
          "Timetable effective date cannot begin before the academic year."
        );
      }

      if (
        this.academicYear
          ?.endDate &&
        this.effectiveTo &&
        this.effectiveTo >
          this.academicYear
            .endDate
      ) {
        this.invalidate(
          "effectiveTo",
          "Timetable effective date cannot end after the academic year."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Academic Term Validation
      |--------------------------------------------------------------------------
      */

      if (
        this.academicTerm
          ?.enabled
      ) {
        if (
          !this.academicTerm
            .name
        ) {
          this.invalidate(
            "academicTerm.name",
            "Academic term name is required when term scheduling is enabled."
          );
        }

        if (
          !this.academicTerm
            .startDate
        ) {
          this.invalidate(
            "academicTerm.startDate",
            "Academic term start date is required."
          );
        }

        if (
          !this.academicTerm
            .endDate
        ) {
          this.invalidate(
            "academicTerm.endDate",
            "Academic term end date is required."
          );
        }

        if (
          this.academicTerm
            .startDate &&
          this.academicTerm
            .endDate &&
          this.academicTerm
            .endDate <
            this.academicTerm
              .startDate
        ) {
          this.invalidate(
            "academicTerm.endDate",
            "Academic term end date cannot be earlier than its start date."
          );
        }

        if (
          this.academicTerm
            .startDate &&
          this.academicYear
            ?.startDate &&
          this.academicTerm
            .startDate <
            this.academicYear
              .startDate
        ) {
          this.invalidate(
            "academicTerm.startDate",
            "Academic term cannot start before the academic year."
          );
        }

        if (
          this.academicTerm
            .endDate &&
          this.academicYear
            ?.endDate &&
          this.academicTerm
            .endDate >
            this.academicYear
              .endDate
        ) {
          this.invalidate(
            "academicTerm.endDate",
            "Academic term cannot end after the academic year."
          );
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Rotation Cycle Validation
      |--------------------------------------------------------------------------
      */

      if (
        this.rotationCycle
          ?.enabled
      ) {
        if (
          this.rotationCycle
            .type ===
            "biweekly"
        ) {
          this.rotationCycle
            .cycleLengthWeeks = 2;
        }

        if (
          this.rotationCycle
            .type ===
            "weekly"
        ) {
          this.rotationCycle
            .cycleLengthWeeks = 1;
        }

        const cycleLength =
          Number(
            this.rotationCycle
              .cycleLengthWeeks ||
              1
          );

        const labels =
          Array.isArray(
            this.rotationCycle
              .weekLabels
          )
            ? this.rotationCycle.weekLabels
                .map(
                  normalizeText
                )
                .filter(Boolean)
            : [];

        if (
          labels.length === 0
        ) {
          this.rotationCycle
            .weekLabels =
            Array.from(
              {
                length:
                  cycleLength
              },
              (_, index) =>
                cycleLength === 1
                  ? "Standard Week"
                  : `Week ${String.fromCharCode(
                      65 + index
                    )}`
            );
        } else if (
          labels.length !==
          cycleLength
        ) {
          this.invalidate(
            "rotationCycle.weekLabels",
            `Rotation cycle requires exactly ${cycleLength} week label(s).`
          );
        } else {
          this.rotationCycle
            .weekLabels =
            labels;
        }
      } else if (
        this.rotationCycle
      ) {
        this.rotationCycle
          .cycleLengthWeeks = 1;

        this.rotationCycle
          .weekLabels = [
          "Standard Week"
        ];
      }

      /*
      |--------------------------------------------------------------------------
      | Active Timetable Validation
      |--------------------------------------------------------------------------
      */

      if (
        this.isActive &&
        this.status !==
          "published"
      ) {
        this.invalidate(
          "isActive",
          "Only a published timetable can be marked as active."
        );
      }

      if (
        this.status ===
          "published" &&
        !this.publication
          ?.publishedAt
      ) {
        this.publication =
          this.publication ||
          {};

        this.publication
          .publishedAt =
          new Date();
      }

      if (
        this.status ===
          "archived"
      ) {
        this.isActive =
          false;

        this.publication =
          this.publication ||
          {};

        if (
          !this.publication
            .archivedAt
        ) {
          this.publication
            .archivedAt =
            new Date();
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Day Schedule Validation
      |--------------------------------------------------------------------------
      */

      if (
        !Array.isArray(
          this.daySchedules
        ) ||
        this.daySchedules
          .length === 0
      ) {
        this.invalidate(
          "daySchedules",
          "At least one day schedule is required."
        );

        return;
      }

      const usedDays =
        new Set();

      let workingDayCount = 0;

      this.daySchedules.forEach(
        (
          daySchedule,
          dayIndex
        ) => {
          if (
            usedDays.has(
              daySchedule.day
            )
          ) {
            this.invalidate(
              `daySchedules.${dayIndex}.day`,
              `A schedule for ${daySchedule.day} already exists.`
            );
          }

          usedDays.add(
            daySchedule.day
          );

          daySchedule.label =
            daySchedule.label ||
            normalizeText(
              daySchedule.day
            )
              ?.toLowerCase()
              ?.replace(
                /\b\w/g,
                (letter) =>
                  letter.toUpperCase()
              );

          if (
            !daySchedule
              .isWorkingDay
          ) {
            daySchedule
              .totalDayMinutes = 0;

            daySchedule
              .totalInstructionMinutes = 0;

            daySchedule
              .totalNonInstructionMinutes = 0;

            return;
          }

          workingDayCount += 1;

          if (
            !Array.isArray(
              daySchedule.periods
            ) ||
            daySchedule.periods
              .length === 0
          ) {
            this.invalidate(
              `daySchedules.${dayIndex}.periods`,
              `${daySchedule.label} must contain at least one period.`
            );

            return;
          }

          const usedPeriodCodes =
            new Set();

          const usedSequences =
            new Set();

          let totalDayMinutes = 0;
          let totalInstructionMinutes = 0;
          let totalNonInstructionMinutes = 0;

          daySchedule.periods.sort(
            (
              firstPeriod,
              secondPeriod
            ) => {
              const firstStart =
                timeToMinutes(
                  firstPeriod.startTime
                ) ?? 0;

              const secondStart =
                timeToMinutes(
                  secondPeriod.startTime
                ) ?? 0;

              return (
                firstStart -
                  secondStart ||
                firstPeriod.sequence -
                  secondPeriod.sequence
              );
            }
          );

          daySchedule.periods.forEach(
            (
              period,
              periodIndex
            ) => {
              period.code =
                normalizeCode(
                  period.code
                );

              period.name =
                normalizeText(
                  period.name
                );

              period.shortName =
                normalizeText(
                  period.shortName ||
                    period.name
                );

              if (
                usedPeriodCodes.has(
                  period.code
                )
              ) {
                this.invalidate(
                  `daySchedules.${dayIndex}.periods.${periodIndex}.code`,
                  `Period code ${period.code} is duplicated on ${daySchedule.label}.`
                );
              }

              usedPeriodCodes.add(
                period.code
              );

              if (
                usedSequences.has(
                  Number(
                    period.sequence
                  )
                )
              ) {
                this.invalidate(
                  `daySchedules.${dayIndex}.periods.${periodIndex}.sequence`,
                  `Period sequence ${period.sequence} is duplicated on ${daySchedule.label}.`
                );
              }

              usedSequences.add(
                Number(
                  period.sequence
                )
              );

              const startMinutes =
                timeToMinutes(
                  period.startTime
                );

              const endMinutes =
                timeToMinutes(
                  period.endTime
                );

              if (
                startMinutes ===
                  null ||
                endMinutes ===
                  null
              ) {
                return;
              }

              if (
                endMinutes <=
                startMinutes
              ) {
                this.invalidate(
                  `daySchedules.${dayIndex}.periods.${periodIndex}.endTime`,
                  `${period.name} must end after its start time.`
                );

                return;
              }

              period.durationMinutes =
                calculateDurationMinutes(
                  period.startTime,
                  period.endTime
                );

              period.isInstructional =
                isInstructionalType(
                  period.type
                );

              period.isSchedulable =
                isSchedulableType(
                  period.type
                );

              if (
                !period
                  .isSchedulable
              ) {
                period.requiresTeacher =
                  false;

                period.requiresSubject =
                  false;

                period.allowDoublePeriod =
                  false;

                if (
                  period.resourceType ===
                  "classroom"
                ) {
                  period.resourceType =
                    "none";
                }
              }

              totalDayMinutes +=
                period.durationMinutes;

              if (
                period.isInstructional
              ) {
                totalInstructionMinutes +=
                  period.durationMinutes;
              } else {
                totalNonInstructionMinutes +=
                  period.durationMinutes;
              }

              /*
              |--------------------------------------------------------------------------
              | Overlapping Period Validation
              |--------------------------------------------------------------------------
              */

              if (
                periodIndex > 0
              ) {
                const previousPeriod =
                  daySchedule
                    .periods[
                    periodIndex - 1
                  ];

                const previousEnd =
                  timeToMinutes(
                    previousPeriod
                      .endTime
                  );

                if (
                  previousEnd !==
                    null &&
                  startMinutes <
                    previousEnd
                ) {
                  this.invalidate(
                    `daySchedules.${dayIndex}.periods.${periodIndex}.startTime`,
                    `${period.name} overlaps with ${previousPeriod.name} on ${daySchedule.label}.`
                  );
                }
              }
            }
          );

          daySchedule
            .totalDayMinutes =
            totalDayMinutes;

          daySchedule
            .totalInstructionMinutes =
            totalInstructionMinutes;

          daySchedule
            .totalNonInstructionMinutes =
            totalNonInstructionMinutes;
        }
      );

      if (
        workingDayCount === 0
      ) {
        this.invalidate(
          "daySchedules",
          "At least one working day must be enabled."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Final Day Ordering
      |--------------------------------------------------------------------------
      */

      this.daySchedules.sort(
        (
          firstDay,
          secondDay
        ) => {
          return (
            DAYS_OF_WEEK.indexOf(
              firstDay.day
            ) -
            DAYS_OF_WEEK.indexOf(
              secondDay.day
            )
          );
        }
      );

  }
);

/*
|--------------------------------------------------------------------------
| Virtual Fields
|--------------------------------------------------------------------------
*/

timetableConfigSchema.virtual(
  "workingDays"
).get(function getWorkingDays() {
  return (
    this.daySchedules
      ?.filter(
        (daySchedule) =>
          daySchedule
            .isWorkingDay
      )
      .map(
        (daySchedule) =>
          daySchedule.day
      ) || []
  );
});

timetableConfigSchema.virtual(
  "workingDayCount"
).get(function getWorkingDayCount() {
  return (
    this.daySchedules
      ?.filter(
        (daySchedule) =>
          daySchedule
            .isWorkingDay
      ).length || 0
  );
});

timetableConfigSchema.virtual(
  "totalPeriodSlots"
).get(function getTotalPeriodSlots() {
  return (
    this.daySchedules
      ?.filter(
        (daySchedule) =>
          daySchedule
            .isWorkingDay
      )
      .reduce(
        (
          total,
          daySchedule
        ) =>
          total +
          daySchedule.periods
            .filter(
              (period) =>
                period.isActive
            ).length,
        0
      ) || 0
  );
});

timetableConfigSchema.virtual(
  "totalInstructionalSlots"
).get(
  function getTotalInstructionalSlots() {
    return (
      this.daySchedules
        ?.filter(
          (daySchedule) =>
            daySchedule
              .isWorkingDay
        )
        .reduce(
          (
            total,
            daySchedule
          ) =>
            total +
            daySchedule.periods
              .filter(
                (period) =>
                  period.isActive &&
                  period
                    .isInstructional
              ).length,
          0
        ) || 0
    );
  }
);

timetableConfigSchema.virtual(
  "weeklyInstructionMinutes"
).get(
  function getWeeklyInstructionMinutes() {
    return (
      this.daySchedules
        ?.filter(
          (daySchedule) =>
            daySchedule
              .isWorkingDay
        )
        .reduce(
          (
            total,
            daySchedule
          ) =>
            total +
            Number(
              daySchedule
                .totalInstructionMinutes ||
                0
            ),
          0
        ) || 0
    );
  }
);

timetableConfigSchema.virtual(
  "displayName"
).get(function getDisplayName() {
  const academicYearLabel =
    this.academicYear
      ?.label
      ? ` · ${this.academicYear.label}`
      : "";

  return `${this.title}${academicYearLabel}`;
});

/*
|--------------------------------------------------------------------------
| Instance Methods
|--------------------------------------------------------------------------
*/

timetableConfigSchema.methods.getDaySchedule =
  function getDaySchedule(
    day
  ) {
    return (
      this.daySchedules.find(
        (daySchedule) =>
          daySchedule.day ===
          String(day || "")
            .toLowerCase()
      ) || null
    );
  };

timetableConfigSchema.methods.getPeriod =
  function getPeriod(
    day,
    periodId
  ) {
    const daySchedule =
      this.getDaySchedule(day);

    if (
      !daySchedule ||
      !periodId
    ) {
      return null;
    }

    return (
      daySchedule.periods.id(
        periodId
      ) || null
    );
  };

timetableConfigSchema.methods.canSchedulePeriod =
  function canSchedulePeriod(
    day,
    periodId
  ) {
    const period =
      this.getPeriod(
        day,
        periodId
      );

    return Boolean(
      period &&
      period.isActive &&
      period.isSchedulable
    );
  };

/*
|--------------------------------------------------------------------------
| Database Indexes
|--------------------------------------------------------------------------
*/

timetableConfigSchema.index(
  {
    schoolId: 1,
    code: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_timetable_code_per_school"
  }
);

timetableConfigSchema.index(
  {
    schoolId: 1,
    isActive: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isActive: true,
      isDeleted: false
    },

    name:
      "one_active_timetable_per_school"
  }
);

timetableConfigSchema.index(
  {
    schoolId: 1,
    "academicYear.label": 1,
    status: 1,
    isDeleted: 1
  },
  {
    name:
      "school_academic_year_timetable_index"
  }
);

timetableConfigSchema.index(
  {
    schoolId: 1,
    effectiveFrom: 1,
    effectiveTo: 1,
    isDeleted: 1
  },
  {
    name:
      "timetable_effective_period_index"
  }
);

timetableConfigSchema.index(
  {
    status: 1,
    isActive: 1,
    isDeleted: 1
  },
  {
    name:
      "timetable_status_index"
  }
);

timetableConfigSchema.index(
  {
    schoolId: 1,
    createdAt: -1
  },
  {
    name:
      "school_timetable_created_index"
  }
);

/*
|--------------------------------------------------------------------------
| Model Export
|--------------------------------------------------------------------------
*/

const TimetableConfig =
  mongoose.models
    .TimetableConfig ||
  mongoose.model(
    "TimetableConfig",
    timetableConfigSchema
  );

module.exports =
  TimetableConfig;