const mongoose = require("mongoose");

const {
  Schema
} = mongoose;

/*
|--------------------------------------------------------------------------
| Exam Schedule Constants
|--------------------------------------------------------------------------
*/

const EXAM_SCHEDULE_STATUSES = [
  "draft",
  "published",
  "in_progress",
  "completed",
  "postponed",
  "cancelled",
  "archived"
];

const ASSESSMENT_MODES = [
  "theory",
  "practical",
  "viva",
  "oral",
  "lab",
  "project",
  "presentation",
  "other"
];

const DELIVERY_MODES = [
  "onsite",
  "online",
  "hybrid"
];

const VENUE_TYPES = [
  "classroom",
  "science_lab",
  "computer_lab",
  "language_lab",
  "library",
  "auditorium",
  "assembly_hall",
  "sports_ground",
  "workshop",
  "online",
  "other"
];

const ALLOWED_STATUS_TRANSITIONS = {
  draft: [
    "published",
    "postponed",
    "cancelled",
    "archived"
  ],

  published: [
    "in_progress",
    "postponed",
    "cancelled",
    "archived"
  ],

  in_progress: [
    "completed",
    "cancelled"
  ],

  completed: [
    "archived"
  ],

  postponed: [
    "draft",
    "published",
    "cancelled",
    "archived"
  ],

  cancelled: [
    "archived"
  ],

  archived: []
};

const NON_OPERATIONAL_STATUSES = [
  "postponed",
  "cancelled",
  "archived"
];

/*
|--------------------------------------------------------------------------
| General Helpers
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
  )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
};

const normalizeCode = (
  value
) => {
  return normalizeText(
    value
  )
    .toUpperCase()
    .replace(
      /[^A-Z0-9_-]+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^[-_]+|[-_]+$/g,
      ""
    );
};

const normalizeSectionName = (
  value
) => {
  return normalizeText(
    value
  );
};

const normalizeSectionKey = (
  value
) => {
  return normalizeSectionName(
    value
  ).toLowerCase();
};

const normalizeUniqueSections = (
  values
) => {
  if (
    !Array.isArray(
      values
    )
  ) {
    return [];
  }

  const used =
    new Set();

  return values
    .map(
      normalizeSectionName
    )
    .filter(
      Boolean
    )
    .filter(
      (
        section
      ) => {
        const key =
          normalizeSectionKey(
            section
          );

        if (
          used.has(
            key
          )
        ) {
          return false;
        }

        used.add(
          key
        );

        return true;
      }
    )
    .sort(
      (
        first,
        second
      ) =>
        first.localeCompare(
          second,
          undefined,
          {
            sensitivity:
              "base"
          }
        )
    );
};

const objectIdKey = (
  value
) => {
  if (!value) {
    return "";
  }

  return String(
    value?._id ||
    value
  );
};

const uniqueObjectIds = (
  values
) => {
  if (
    !Array.isArray(
      values
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map(
          objectIdKey
        )
        .filter(
          Boolean
        )
    )
  );
};

const isValidTime = (
  value
) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(
    String(
      value ||
      ""
    )
  );
};

const timeToMinutes = (
  value
) => {
  if (
    !isValidTime(
      value
    )
  ) {
    return null;
  }

  const [
    hours,
    minutes
  ] =
    String(
      value
    )
      .split(
        ":"
      )
      .map(
        Number
      );

  return (
    hours *
      60 +
    minutes
  );
};

const calculateDurationMinutes = (
  startTime,
  endTime
) => {
  const startMinutes =
    timeToMinutes(
      startTime
    );

  const endMinutes =
    timeToMinutes(
      endTime
    );

  if (
    startMinutes ===
      null ||
    endMinutes ===
      null ||
    endMinutes <=
      startMinutes
  ) {
    return 0;
  }

  return (
    endMinutes -
    startMinutes
  );
};

const normalizeDateOnly = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  date.setUTCHours(
    0,
    0,
    0,
    0
  );

  return date;
};

const dateKey = (
  value
) => {
  const date =
    normalizeDateOnly(
      value
    );

  if (
    !(date instanceof Date) ||
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(
      0,
      10
    );
};

const isSafeWebUrl = (
  value
) => {
  if (!value) {
    return false;
  }

  try {
    const url =
      new URL(
        value
      );

    return [
      "http:",
      "https:"
    ].includes(
      url.protocol
    );
  } catch {
    return false;
  }
};

const scopesOverlap = (
  first,
  second
) => {
  if (
    first?.allSections ||
    second?.allSections
  ) {
    return true;
  }

  const firstSections =
    new Set(
      (
        first?.sections ||
        []
      ).map(
        normalizeSectionKey
      )
    );

  return (
    second?.sections ||
    []
  ).some(
    (
      section
    ) =>
      firstSections.has(
        normalizeSectionKey(
          section
        )
      )
  );
};

const hasTimeOverlap = (
  firstStart,
  firstEnd,
  secondStart,
  secondEnd
) => {
  const firstStartMinutes =
    timeToMinutes(
      firstStart
    );

  const firstEndMinutes =
    timeToMinutes(
      firstEnd
    );

  const secondStartMinutes =
    timeToMinutes(
      secondStart
    );

  const secondEndMinutes =
    timeToMinutes(
      secondEnd
    );

  if (
    [
      firstStartMinutes,
      firstEndMinutes,
      secondStartMinutes,
      secondEndMinutes
    ].some(
      (
        value
      ) =>
        value ===
        null
    )
  ) {
    return false;
  }

  return (
    firstStartMinutes <
      secondEndMinutes &&
    firstEndMinutes >
      secondStartMinutes
  );
};

const buildSectionScopeKey = ({
  allSections,
  sections
}) => {
  if (
    allSections
  ) {
    return "ALL";
  }

  return normalizeUniqueSections(
    sections
  )
    .map(
      normalizeSectionKey
    )
    .join(
      "+"
    )
    .toUpperCase();
};

const buildScheduleKey = ({
  examId,
  classId,
  subjectId,
  examDate,
  startTime,
  allSections,
  sections,
  assessmentMode
}) => {
  return [
    objectIdKey(
      examId
    ),
    objectIdKey(
      classId
    ),
    objectIdKey(
      subjectId
    ),
    dateKey(
      examDate
    ),
    startTime,
    buildSectionScopeKey({
      allSections,
      sections
    }),
    normalizeText(
      assessmentMode
    ).toUpperCase()
  ]
    .filter(
      Boolean
    )
    .join(
      ":"
    );
};

/*
|--------------------------------------------------------------------------
| Venue Schema
|--------------------------------------------------------------------------
*/

const venueSchema =
  new Schema(
    {
      roomId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "Room",

        default: null
      },

      venueType: {
        type: String,

        enum: {
          values:
            VENUE_TYPES,

          message:
            "{VALUE} is not a valid exam venue type"
        },

        default:
          "classroom"
      },

      name: {
        type: String,

        trim: true,

        maxlength: [
          160,
          "Venue name cannot exceed 160 characters"
        ],

        default: ""
      },

      code: {
        type: String,

        trim: true,

        maxlength: [
          50,
          "Venue code cannot exceed 50 characters"
        ],

        default: ""
      },

      building: {
        type: String,

        trim: true,

        maxlength: [
          120,
          "Building name cannot exceed 120 characters"
        ],

        default: ""
      },

      floor: {
        type: String,

        trim: true,

        maxlength: [
          50,
          "Floor cannot exceed 50 characters"
        ],

        default: ""
      },

      seatCapacity: {
        type: Number,

        default: 0,

        min: [
          0,
          "Seat capacity cannot be negative"
        ]
      },

      notes: {
        type: String,

        trim: true,

        maxlength: [
          500,
          "Venue notes cannot exceed 500 characters"
        ],

        default: ""
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Online Session Schema
|--------------------------------------------------------------------------
*/

const onlineSessionSchema =
  new Schema(
    {
      meetingUrl: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "Online meeting URL cannot exceed 2000 characters"
        ],

        default: ""
      },

      platform: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Online platform name cannot exceed 80 characters"
        ],

        default: ""
      },

      meetingId: {
        type: String,

        trim: true,

        maxlength: [
          160,
          "Online meeting ID cannot exceed 160 characters"
        ],

        default: ""
      },

      accessCode: {
        type: String,

        trim: true,

        maxlength: [
          160,
          "Online access code cannot exceed 160 characters"
        ],

        default: ""
      },

      joinInstructions: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Online join instructions cannot exceed 1000 characters"
        ],

        default: ""
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
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      unpublishedAt: {
        type: Date,
        default: null
      },

      unpublishedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Reschedule History Schema
|--------------------------------------------------------------------------
*/

const rescheduleHistorySchema =
  new Schema(
    {
      previousExamDate: {
        type: Date,
        required: true
      },

      previousStartTime: {
        type: String,
        required: true
      },

      previousEndTime: {
        type: String,
        required: true
      },

      newExamDate: {
        type: Date,
        required: true
      },

      newStartTime: {
        type: String,
        required: true
      },

      newEndTime: {
        type: String,
        required: true
      },

      reason: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Reschedule reason cannot exceed 1000 characters"
        ],

        default: ""
      },

      changedAt: {
        type: Date,
        default:
          Date.now
      },

      changedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        required: true
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Exam Schedule Schema
|--------------------------------------------------------------------------
|
| Each document represents one scheduled assessment for one class and subject.
| A schedule may apply to every section or to selected sections only.
|
*/

const examScheduleSchema =
  new Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | School and Exam Scope
      |--------------------------------------------------------------------------
      */

      schoolId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "School",

        required: [
          true,
          "School ID is required"
        ],

        index: true
      },

      examId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "Exam",

        required: [
          true,
          "Exam ID is required"
        ],

        index: true
      },

      classId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "Class",

        required: [
          true,
          "Class ID is required"
        ],

        index: true
      },

      allSections: {
        type: Boolean,
        default: true
      },

      sections: {
        type: [
          String
        ],

        default: []
      },

      sectionScopeKey: {
        type: String,

        required: true,

        trim: true,

        maxlength: [
          500,
          "Section scope key cannot exceed 500 characters"
        ]
      },

      subjectId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "Subject",

        required: [
          true,
          "Subject ID is required"
        ],

        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Paper Identity
      |--------------------------------------------------------------------------
      */

      paperCode: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Paper code cannot exceed 80 characters"
        ],

        default: ""
      },

      paperTitle: {
        type: String,

        trim: true,

        maxlength: [
          200,
          "Paper title cannot exceed 200 characters"
        ],

        default: ""
      },

      paperVersion: {
        type: String,

        trim: true,

        maxlength: [
          40,
          "Paper version cannot exceed 40 characters"
        ],

        default: ""
      },

      assessmentMode: {
        type: String,

        enum: {
          values:
            ASSESSMENT_MODES,

          message:
            "{VALUE} is not a valid assessment mode"
        },

        default:
          "theory",

        index: true
      },

      language: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Paper language cannot exceed 80 characters"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Date and Time
      |--------------------------------------------------------------------------
      */

      examDate: {
        type: Date,

        required: [
          true,
          "Exam date is required"
        ],

        index: true
      },

      startTime: {
        type: String,

        required: [
          true,
          "Exam start time is required"
        ],

        trim: true
      },

      endTime: {
        type: String,

        required: [
          true,
          "Exam end time is required"
        ],

        trim: true
      },

      durationMinutes: {
        type: Number,

        required: true,

        min: [
          1,
          "Exam duration must be at least one minute"
        ]
      },

      reportingTime: {
        type: String,

        trim: true,

        default: ""
      },

      lateEntryCutoffTime: {
        type: String,

        trim: true,

        default: ""
      },

      timezone: {
        type: String,

        trim: true,

        maxlength: [
          100,
          "Timezone cannot exceed 100 characters"
        ],

        default:
          "Asia/Karachi"
      },

      /*
      |--------------------------------------------------------------------------
      | Delivery, Venue and Invigilation
      |--------------------------------------------------------------------------
      */

      deliveryMode: {
        type: String,

        enum: {
          values:
            DELIVERY_MODES,

          message:
            "{VALUE} is not a valid exam delivery mode"
        },

        default:
          "onsite",

        index: true
      },

      venue: {
        type:
          venueSchema,

        default:
          () => ({})
      },

      onlineSession: {
        type:
          onlineSessionSchema,

        default:
          () => ({})
      },

      chiefInvigilatorId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "Staff",

        default: null
      },

      invigilatorIds: {
        type: [
          {
            type:
              Schema.Types
                .ObjectId,

            ref: "Staff"
          }
        ],

        default: []
      },

      expectedCandidateCount: {
        type: Number,

        default: 0,

        min: [
          0,
          "Expected candidate count cannot be negative"
        ]
      },

      seatPlanRequired: {
        type: Boolean,
        default: true
      },

      attendanceSheetRequired: {
        type: Boolean,
        default: true
      },

      admitCardRequired: {
        type: Boolean,
        default: true
      },

      /*
      |--------------------------------------------------------------------------
      | Instructions
      |--------------------------------------------------------------------------
      */

      candidateInstructions: {
        type: String,

        trim: true,

        maxlength: [
          3000,
          "Candidate instructions cannot exceed 3000 characters"
        ],

        default: ""
      },

      invigilatorInstructions: {
        type: String,

        trim: true,

        maxlength: [
          3000,
          "Invigilator instructions cannot exceed 3000 characters"
        ],

        default: ""
      },

      internalNotes: {
        type: String,

        trim: true,

        maxlength: [
          3000,
          "Internal notes cannot exceed 3000 characters"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Workflow
      |--------------------------------------------------------------------------
      */

      status: {
        type: String,

        enum: {
          values:
            EXAM_SCHEDULE_STATUSES,

          message:
            "{VALUE} is not a valid exam schedule status"
        },

        default:
          "draft",

        index: true
      },

      publication: {
        type:
          publicationSchema,

        default:
          () => ({})
      },

      postponementReason: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Postponement reason cannot exceed 1000 characters"
        ],

        default: ""
      },

      postponedAt: {
        type: Date,
        default: null
      },

      postponedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      cancellationReason: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Cancellation reason cannot exceed 1000 characters"
        ],

        default: ""
      },

      cancelledAt: {
        type: Date,
        default: null
      },

      cancelledBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      completedAt: {
        type: Date,
        default: null
      },

      completedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      archivedAt: {
        type: Date,
        default: null
      },

      archivedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      rescheduleHistory: {
        type: [
          rescheduleHistorySchema
        ],

        default: []
      },

      scheduleKey: {
        type: String,

        required: true,

        trim: true,

        maxlength: [
          700,
          "Schedule key cannot exceed 700 characters"
        ]
      },

      versionNumber: {
        type: Number,

        default: 1,

        min: [
          1,
          "Schedule version number must be at least 1"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Record Tracking
      |--------------------------------------------------------------------------
      */

      createdBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        required: [
          true,
          "Schedule creator is required"
        ]
      },

      updatedBy: {
        type:
          Schema.Types
            .ObjectId,

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
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      }
    },
    {
      timestamps: true,

      optimisticConcurrency:
        true,

      toJSON: {
        virtuals: true,

        transform(
          document,
          returnedObject
        ) {
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
| Database Indexes
|--------------------------------------------------------------------------
*/

examScheduleSchema.index(
  {
    schoolId: 1,
    scheduleKey: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_exam_schedule_key"
  }
);

examScheduleSchema.index({
  schoolId: 1,
  examId: 1,
  examDate: 1,
  startTime: 1,
  status: 1,
  isDeleted: 1
});

examScheduleSchema.index({
  schoolId: 1,
  classId: 1,
  examDate: 1,
  startTime: 1,
  isDeleted: 1
});

examScheduleSchema.index({
  schoolId: 1,
  subjectId: 1,
  examDate: 1,
  status: 1,
  isDeleted: 1
});

examScheduleSchema.index({
  schoolId: 1,
  "venue.roomId": 1,
  examDate: 1,
  startTime: 1,
  endTime: 1,
  status: 1,
  isDeleted: 1
});

examScheduleSchema.index({
  schoolId: 1,
  invigilatorIds: 1,
  examDate: 1,
  startTime: 1,
  endTime: 1,
  status: 1,
  isDeleted: 1
});

examScheduleSchema.index({
  schoolId: 1,
  chiefInvigilatorId: 1,
  examDate: 1,
  startTime: 1,
  endTime: 1,
  status: 1,
  isDeleted: 1
});

examScheduleSchema.index({
  schoolId: 1,
  status: 1,
  examDate: 1,
  isDeleted: 1
});

/*
|--------------------------------------------------------------------------
| Validation and Normalization
|--------------------------------------------------------------------------
*/

examScheduleSchema.pre(
  "validate",
  function validateExamSchedule() {
    this.examDate =
      normalizeDateOnly(
        this.examDate
      );

    this.startTime =
      normalizeText(
        this.startTime
      );

    this.endTime =
      normalizeText(
        this.endTime
      );

    this.reportingTime =
      normalizeText(
        this.reportingTime
      );

    this.lateEntryCutoffTime =
      normalizeText(
        this.lateEntryCutoffTime
      );

    this.timezone =
      normalizeText(
        this.timezone
      ) ||
      "Asia/Karachi";

    this.paperCode =
      normalizeCode(
        this.paperCode
      );

    this.paperTitle =
      normalizeText(
        this.paperTitle
      );

    this.paperVersion =
      normalizeText(
        this.paperVersion
      );

    this.language =
      normalizeText(
        this.language
      );

    this.sections =
      normalizeUniqueSections(
        this.sections
      );

    if (
      this.allSections
    ) {
      this.sections =
        [];
    } else if (
      this.sections.length ===
      0
    ) {
      this.invalidate(
        "sections",
        "At least one section is required when all sections are not selected"
      );
    }

    this.sectionScopeKey =
      buildSectionScopeKey({
        allSections:
          this.allSections,

        sections:
          this.sections
      });

    /*
    |--------------------------------------------------------------------------
    | Time Validation
    |--------------------------------------------------------------------------
    */

    if (
      !isValidTime(
        this.startTime
      )
    ) {
      this.invalidate(
        "startTime",
        "Exam start time must use HH:mm format"
      );
    }

    if (
      !isValidTime(
        this.endTime
      )
    ) {
      this.invalidate(
        "endTime",
        "Exam end time must use HH:mm format"
      );
    }

    const duration =
      calculateDurationMinutes(
        this.startTime,
        this.endTime
      );

    if (
      duration <=
      0
    ) {
      this.invalidate(
        "endTime",
        "Exam end time must be later than the start time"
      );
    } else {
      this.durationMinutes =
        duration;
    }

    if (
      this.reportingTime &&
      !isValidTime(
        this.reportingTime
      )
    ) {
      this.invalidate(
        "reportingTime",
        "Reporting time must use HH:mm format"
      );
    }

    if (
      this.reportingTime &&
      isValidTime(
        this.reportingTime
      ) &&
      isValidTime(
        this.startTime
      ) &&
      timeToMinutes(
        this.reportingTime
      ) >
        timeToMinutes(
          this.startTime
        )
    ) {
      this.invalidate(
        "reportingTime",
        "Reporting time cannot be later than the exam start time"
      );
    }

    if (
      this.lateEntryCutoffTime &&
      !isValidTime(
        this.lateEntryCutoffTime
      )
    ) {
      this.invalidate(
        "lateEntryCutoffTime",
        "Late entry cutoff time must use HH:mm format"
      );
    }

    if (
      this.lateEntryCutoffTime &&
      isValidTime(
        this.lateEntryCutoffTime
      ) &&
      isValidTime(
        this.startTime
      ) &&
      isValidTime(
        this.endTime
      )
    ) {
      const cutoff =
        timeToMinutes(
          this.lateEntryCutoffTime
        );

      const start =
        timeToMinutes(
          this.startTime
        );

      const end =
        timeToMinutes(
          this.endTime
        );

      if (
        cutoff <
          start ||
        cutoff >
          end
      ) {
        this.invalidate(
          "lateEntryCutoffTime",
          "Late entry cutoff must fall between exam start and end time"
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Venue and Online Session Validation
    |--------------------------------------------------------------------------
    */

    this.venue =
      this.venue ||
      {};

    this.venue.name =
      normalizeText(
        this.venue.name
      );

    this.venue.code =
      normalizeCode(
        this.venue.code
      );

    this.venue.building =
      normalizeText(
        this.venue.building
      );

    this.venue.floor =
      normalizeText(
        this.venue.floor
      );

    this.venue.notes =
      normalizeText(
        this.venue.notes
      );

    this.onlineSession =
      this.onlineSession ||
      {};

    this.onlineSession.meetingUrl =
      normalizeText(
        this.onlineSession
          .meetingUrl
      );

    this.onlineSession.platform =
      normalizeText(
        this.onlineSession
          .platform
      );

    this.onlineSession.meetingId =
      normalizeText(
        this.onlineSession
          .meetingId
      );

    this.onlineSession.accessCode =
      normalizeText(
        this.onlineSession
          .accessCode
      );

    this.onlineSession.joinInstructions =
      normalizeText(
        this.onlineSession
          .joinInstructions
      );

    const requiresPhysicalVenue =
      [
        "onsite",
        "hybrid"
      ].includes(
        this.deliveryMode
      );

    const requiresOnlineSession =
      [
        "online",
        "hybrid"
      ].includes(
        this.deliveryMode
      );

    if (
      requiresPhysicalVenue &&
      !this.venue.roomId &&
      !this.venue.name
    ) {
      this.invalidate(
        "venue.name",
        "A room or venue name is required for onsite and hybrid exams"
      );
    }

    if (
      requiresOnlineSession &&
      !isSafeWebUrl(
        this.onlineSession
          .meetingUrl
      )
    ) {
      this.invalidate(
        "onlineSession.meetingUrl",
        "A valid HTTP or HTTPS meeting URL is required for online and hybrid exams"
      );
    }

    if (
      this.deliveryMode ===
      "online"
    ) {
      this.venue.venueType =
        "online";
    }

    if (
      Number(
        this.venue
          .seatCapacity ||
        0
      ) >
        0 &&
      Number(
        this.expectedCandidateCount ||
        0
      ) >
        Number(
          this.venue
            .seatCapacity
        )
    ) {
      this.invalidate(
        "expectedCandidateCount",
        "Expected candidates cannot exceed the configured venue seat capacity"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Invigilator Validation
    |--------------------------------------------------------------------------
    */

    this.invigilatorIds =
      uniqueObjectIds(
        this.invigilatorIds
      );

    const chiefKey =
      objectIdKey(
        this.chiefInvigilatorId
      );

    if (
      chiefKey &&
      !this.invigilatorIds.includes(
        chiefKey
      )
    ) {
      this.invigilatorIds.unshift(
        chiefKey
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Instruction Normalization
    |--------------------------------------------------------------------------
    */

    this.candidateInstructions =
      normalizeText(
        this.candidateInstructions
      );

    this.invigilatorInstructions =
      normalizeText(
        this.invigilatorInstructions
      );

    this.internalNotes =
      normalizeText(
        this.internalNotes
      );

    this.postponementReason =
      normalizeText(
        this.postponementReason
      );

    this.cancellationReason =
      normalizeText(
        this.cancellationReason
      );

    /*
    |--------------------------------------------------------------------------
    | Workflow Rules
    |--------------------------------------------------------------------------
    */

    this.publication =
      this.publication ||
      {};

    if (
      this.status ===
      "published"
    ) {
      if (
        !this.publication
          .publishedAt
      ) {
        this.publication.publishedAt =
          new Date();
      }

      this.publication.unpublishedAt =
        null;

      this.publication.unpublishedBy =
        null;
    }

    if (
      this.status ===
      "postponed"
    ) {
      if (
        !this.postponementReason
      ) {
        this.invalidate(
          "postponementReason",
          "Postponement reason is required for a postponed schedule"
        );
      }

      if (
        !this.postponedAt
      ) {
        this.postponedAt =
          new Date();
      }
    }

    if (
      this.status ===
      "cancelled"
    ) {
      if (
        !this.cancellationReason
      ) {
        this.invalidate(
          "cancellationReason",
          "Cancellation reason is required for a cancelled schedule"
        );
      }

      if (
        !this.cancelledAt
      ) {
        this.cancelledAt =
          new Date();
      }
    }

    if (
      this.status ===
        "completed" &&
      !this.completedAt
    ) {
      this.completedAt =
        new Date();
    }

    if (
      this.status ===
        "archived" &&
      !this.archivedAt
    ) {
      this.archivedAt =
        new Date();
    }

    /*
    |--------------------------------------------------------------------------
    | Reschedule History Normalization
    |--------------------------------------------------------------------------
    */

    if (
      Array.isArray(
        this.rescheduleHistory
      )
    ) {
      this.rescheduleHistory.forEach(
        (
          history,
          index
        ) => {
          history.previousExamDate =
            normalizeDateOnly(
              history.previousExamDate
            );

          history.newExamDate =
            normalizeDateOnly(
              history.newExamDate
            );

          history.previousStartTime =
            normalizeText(
              history.previousStartTime
            );

          history.previousEndTime =
            normalizeText(
              history.previousEndTime
            );

          history.newStartTime =
            normalizeText(
              history.newStartTime
            );

          history.newEndTime =
            normalizeText(
              history.newEndTime
            );

          history.reason =
            normalizeText(
              history.reason
            );

          if (
            !isValidTime(
              history.previousStartTime
            ) ||
            !isValidTime(
              history.previousEndTime
            ) ||
            calculateDurationMinutes(
              history.previousStartTime,
              history.previousEndTime
            ) <=
              0
          ) {
            this.invalidate(
              `rescheduleHistory.${index}.previousStartTime`,
              "Previous reschedule time range is invalid"
            );
          }

          if (
            !isValidTime(
              history.newStartTime
            ) ||
            !isValidTime(
              history.newEndTime
            ) ||
            calculateDurationMinutes(
              history.newStartTime,
              history.newEndTime
            ) <=
              0
          ) {
            this.invalidate(
              `rescheduleHistory.${index}.newStartTime`,
              "New reschedule time range is invalid"
            );
          }
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Stable Schedule Key
    |--------------------------------------------------------------------------
    */

    this.scheduleKey =
      buildScheduleKey({
        examId:
          this.examId,

        classId:
          this.classId,

        subjectId:
          this.subjectId,

        examDate:
          this.examDate,

        startTime:
          this.startTime,

        allSections:
          this.allSections,

        sections:
          this.sections,

        assessmentMode:
          this.assessmentMode
      });

    if (
      !this.scheduleKey
    ) {
      this.invalidate(
        "scheduleKey",
        "A valid exam schedule key could not be created"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Soft Delete
    |--------------------------------------------------------------------------
    */

    if (
      this.isDeleted
    ) {
      if (
        !this.deletedAt
      ) {
        this.deletedAt =
          new Date();
      }
    } else {
      this.deletedAt =
        null;

      this.deletedBy =
        null;
    }
  }
);

/*
|--------------------------------------------------------------------------
| Virtual Fields
|--------------------------------------------------------------------------
*/

examScheduleSchema.virtual(
  "sectionScopeLabel"
).get(
  function getSectionScopeLabel() {
    if (
      this.allSections
    ) {
      return "All Sections";
    }

    return (
      this.sections ||
      []
    ).join(
      ", "
    );
  }
);

examScheduleSchema.virtual(
  "isOperational"
).get(
  function getIsOperational() {
    return (
      !this.isDeleted &&
      !NON_OPERATIONAL_STATUSES.includes(
        this.status
      )
    );
  }
);

examScheduleSchema.virtual(
  "isPublished"
).get(
  function getIsPublished() {
    return (
      this.status ===
        "published" &&
      !this.isDeleted
    );
  }
);

examScheduleSchema.virtual(
  "isEditable"
).get(
  function getIsEditable() {
    return (
      !this.isDeleted &&
      ![
        "in_progress",
        "completed",
        "archived"
      ].includes(
        this.status
      )
    );
  }
);

examScheduleSchema.virtual(
  "venueLabel"
).get(
  function getVenueLabel() {
    if (
      this.deliveryMode ===
      "online"
    ) {
      return (
        this.onlineSession
          ?.platform ||
        "Online"
      );
    }

    return [
      this.venue?.name,
      this.venue?.code
        ? `(${this.venue.code})`
        : "",
      this.venue?.building,
      this.venue?.floor
    ]
      .filter(
        Boolean
      )
      .join(
        " · "
      );
  }
);

/*
|--------------------------------------------------------------------------
| Instance Methods
|--------------------------------------------------------------------------
*/

examScheduleSchema.methods.canTransitionTo =
  function canTransitionTo(
    nextStatus
  ) {
    if (
      !EXAM_SCHEDULE_STATUSES.includes(
        nextStatus
      )
    ) {
      return false;
    }

    if (
      nextStatus ===
      this.status
    ) {
      return true;
    }

    return (
      ALLOWED_STATUS_TRANSITIONS[
        this.status
      ] ||
      []
    ).includes(
      nextStatus
    );
  };

examScheduleSchema.methods.appliesToSection =
  function appliesToSection(
    sectionName
  ) {
    if (
      this.allSections
    ) {
      return true;
    }

    const sectionKey =
      normalizeSectionKey(
        sectionName
      );

    return (
      this.sections ||
      []
    ).some(
      (
        section
      ) =>
        normalizeSectionKey(
          section
        ) ===
        sectionKey
    );
  };

examScheduleSchema.methods.overlapsWith =
  function overlapsWith(
    otherSchedule
  ) {
    if (
      !otherSchedule
    ) {
      return false;
    }

    if (
      dateKey(
        this.examDate
      ) !==
      dateKey(
        otherSchedule.examDate
      )
    ) {
      return false;
    }

    return hasTimeOverlap(
      this.startTime,
      this.endTime,
      otherSchedule.startTime,
      otherSchedule.endTime
    );
  };

/*
|--------------------------------------------------------------------------
| Static Conflict Detection
|--------------------------------------------------------------------------
|
| The controller should call this before create or reschedule operations.
| It checks class/section, venue and invigilator overlaps.
|
*/

examScheduleSchema.statics.findOperationalConflicts =
  async function findOperationalConflicts({
    schoolId,
    examDate,
    startTime,
    endTime,
    classId,
    allSections = true,
    sections = [],
    venueRoomId = null,
    invigilatorIds = [],
    chiefInvigilatorId = null,
    excludeScheduleId = null
  }) {
    const normalizedDate =
      normalizeDateOnly(
        examDate
      );

    if (
      !schoolId ||
      !normalizedDate ||
      !isValidTime(
        startTime
      ) ||
      !isValidTime(
        endTime
      ) ||
      calculateDurationMinutes(
        startTime,
        endTime
      ) <=
        0
    ) {
      throw new Error(
        "Valid school, date and time range are required for conflict detection"
      );
    }

    const query = {
      schoolId,

      examDate:
        normalizedDate,

      startTime: {
        $lt:
          endTime
      },

      endTime: {
        $gt:
          startTime
      },

      status: {
        $nin:
          NON_OPERATIONAL_STATUSES
      },

      isDeleted: {
        $ne: true
      }
    };

    if (
      excludeScheduleId
    ) {
      query._id = {
        $ne:
          excludeScheduleId
      };
    }

    const candidates =
      await this.find(
        query
      )
        .select(
          [
            "examId",
            "classId",
            "subjectId",
            "allSections",
            "sections",
            "examDate",
            "startTime",
            "endTime",
            "venue.roomId",
            "venue.name",
            "chiefInvigilatorId",
            "invigilatorIds",
            "status"
          ].join(
            " "
          )
        )
        .lean();

    const requestedInvigilators =
      new Set(
        uniqueObjectIds([
          ...invigilatorIds,
          chiefInvigilatorId
        ])
      );

    const requestedScope = {
      allSections:
        Boolean(
          allSections
        ),

      sections:
        normalizeUniqueSections(
          sections
        )
    };

    const conflicts =
      candidates
        .map(
          (
            candidate
          ) => {
            const types =
              [];

            if (
              objectIdKey(
                candidate.classId
              ) ===
                objectIdKey(
                  classId
                ) &&
              scopesOverlap(
                requestedScope,
                {
                  allSections:
                    candidate.allSections,

                  sections:
                    candidate.sections
                }
              )
            ) {
              types.push(
                "class_section"
              );
            }

            if (
              venueRoomId &&
              candidate.venue
                ?.roomId &&
              objectIdKey(
                candidate.venue
                  .roomId
              ) ===
                objectIdKey(
                  venueRoomId
                )
            ) {
              types.push(
                "venue"
              );
            }

            const candidateInvigilators =
              uniqueObjectIds([
                ...(
                  candidate
                    .invigilatorIds ||
                  []
                ),

                candidate
                  .chiefInvigilatorId
              ]);

            const sharedInvigilators =
              candidateInvigilators.filter(
                (
                  staffId
                ) =>
                  requestedInvigilators.has(
                    staffId
                  )
              );

            if (
              sharedInvigilators.length >
              0
            ) {
              types.push(
                "invigilator"
              );
            }

            if (
              types.length ===
              0
            ) {
              return null;
            }

            return {
              scheduleId:
                candidate._id,

              examId:
                candidate.examId,

              classId:
                candidate.classId,

              subjectId:
                candidate.subjectId,

              examDate:
                candidate.examDate,

              startTime:
                candidate.startTime,

              endTime:
                candidate.endTime,

              status:
                candidate.status,

              conflictTypes:
                types,

              sharedInvigilatorIds:
                sharedInvigilators
            };
          }
        )
        .filter(
          Boolean
        );

    return {
      hasConflict:
        conflicts.length >
        0,

      conflicts
    };
  };

/*
|--------------------------------------------------------------------------
| Static Query Helpers
|--------------------------------------------------------------------------
*/

examScheduleSchema.statics.getAllowedStatusTransitions =
  function getAllowedStatusTransitions(
    currentStatus
  ) {
    return [
      ...(
        ALLOWED_STATUS_TRANSITIONS[
          currentStatus
        ] ||
        []
      )
    ];
  };

examScheduleSchema.statics.buildActiveFilter =
  function buildActiveFilter(
    schoolId,
    extraFilter = {}
  ) {
    return {
      schoolId,

      isDeleted: {
        $ne: true
      },

      ...extraFilter
    };
  };

examScheduleSchema.statics.buildScheduleKey =
  function staticBuildScheduleKey(
    values
  ) {
    return buildScheduleKey(
      values
    );
  };

/*
|--------------------------------------------------------------------------
| Model Export
|--------------------------------------------------------------------------
*/

const ExamSchedule =
  mongoose.models
    .ExamSchedule ||
  mongoose.model(
    "ExamSchedule",
    examScheduleSchema
  );

module.exports =
  ExamSchedule;

module.exports.EXAM_SCHEDULE_STATUSES =
  EXAM_SCHEDULE_STATUSES;

module.exports.ASSESSMENT_MODES =
  ASSESSMENT_MODES;

module.exports.DELIVERY_MODES =
  DELIVERY_MODES;

module.exports.VENUE_TYPES =
  VENUE_TYPES;

module.exports.ALLOWED_STATUS_TRANSITIONS =
  ALLOWED_STATUS_TRANSITIONS;

module.exports.NON_OPERATIONAL_STATUSES =
  NON_OPERATIONAL_STATUSES;
