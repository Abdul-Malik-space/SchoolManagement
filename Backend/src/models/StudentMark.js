const mongoose = require("mongoose");

const {
  Schema
} = mongoose;

/*
|--------------------------------------------------------------------------
| Student Mark Constants
|--------------------------------------------------------------------------
*/

const MARK_ENTRY_STATUSES = [
  "draft",
  "submitted",
  "returned",
  "approved",
  "published",
  "locked"
];

const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "medical_leave",
  "approved_leave",
  "exempted",
  "withheld"
];

const RESULT_STATUSES = [
  "pending",
  "pass",
  "fail",
  "absent",
  "leave",
  "exempted",
  "withheld"
];

const MARK_ENTRY_SOURCES = [
  "manual",
  "bulk_entry",
  "csv_import",
  "api"
];

const ALLOWED_STATUS_TRANSITIONS = {
  draft: [
    "submitted"
  ],

  submitted: [
    "returned",
    "approved"
  ],

  returned: [
    "draft",
    "submitted"
  ],

  approved: [
    "returned",
    "published",
    "locked"
  ],

  published: [
    "locked"
  ],

  locked: []
};

const SCORE_COMPONENTS = [
  "theory",
  "practical",
  "internal"
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

const normalizeSectionName = (
  value
) => {
  return normalizeText(
    value
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

const toFiniteNumber = (
  value,
  fallback = 0
) => {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ""
  ) {
    return fallback;
  }

  const number =
    Number(
      value
    );

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
};

const roundNumber = (
  value,
  precision = 2
) => {
  const number =
    toFiniteNumber(
      value,
      0
    );

  const multiplier =
    10 ** precision;

  return (
    Math.round(
      (
        number +
        Number.EPSILON
      ) *
        multiplier
    ) /
    multiplier
  );
};

const clampNumber = (
  value,
  minimum,
  maximum
) => {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
};

const buildMarkKey = ({
  schoolId,
  examId,
  studentId,
  subjectId
}) => {
  return [
    objectIdKey(
      schoolId
    ),
    objectIdKey(
      examId
    ),
    objectIdKey(
      studentId
    ),
    objectIdKey(
      subjectId
    )
  ]
    .filter(
      Boolean
    )
    .join(
      ":"
    );
};

const getAttendanceResultStatus = (
  attendanceStatus
) => {
  const mapping = {
    absent:
      "absent",

    medical_leave:
      "leave",

    approved_leave:
      "leave",

    exempted:
      "exempted",

    withheld:
      "withheld"
  };

  return (
    mapping[
      attendanceStatus
    ] ||
    null
  );
};

const getRequiredComponentNames = (
  assessmentRule
) => {
  const required =
    [];

  if (
    Number(
      assessmentRule
        ?.theoryMaxMarks ||
      0
    ) >
    0
  ) {
    required.push(
      "theory"
    );
  }

  if (
    Number(
      assessmentRule
        ?.practicalMaxMarks ||
      0
    ) >
    0
  ) {
    required.push(
      "practical"
    );
  }

  if (
    Number(
      assessmentRule
        ?.internalMaxMarks ||
      0
    ) >
    0
  ) {
    required.push(
      "internal"
    );
  }

  return required;
};

const isEntryComplete = ({
  assessmentRule,
  entryFlags,
  attendanceStatus
}) => {
  if (
    attendanceStatus !==
    "present"
  ) {
    return true;
  }

  const requiredComponents =
    getRequiredComponentNames(
      assessmentRule
    );

  if (
    requiredComponents.length ===
    0
  ) {
    return Boolean(
      entryFlags
        ?.overallEntered
    );
  }

  return requiredComponents.every(
    (
      component
    ) =>
      Boolean(
        entryFlags?.[
          `${component}Entered`
        ]
      )
  );
};

/*
|--------------------------------------------------------------------------
| Assessment Rule Snapshot
|--------------------------------------------------------------------------
|
| The rule is copied from Exam.subjectRules when marks are generated.
| This preserves the original maximum, passing and weightage settings even if
| the exam setup is edited later.
|
*/

const assessmentRuleSchema =
  new Schema(
    {
      maxMarks: {
        type: Number,

        required: [
          true,
          "Maximum marks are required"
        ],

        min: [
          1,
          "Maximum marks must be at least 1"
        ],

        max: [
          10000,
          "Maximum marks cannot exceed 10000"
        ]
      },

      passingMarks: {
        type: Number,

        required: [
          true,
          "Passing marks are required"
        ],

        min: [
          0,
          "Passing marks cannot be negative"
        ]
      },

      theoryMaxMarks: {
        type: Number,

        default: 0,

        min: [
          0,
          "Theory maximum marks cannot be negative"
        ]
      },

      practicalMaxMarks: {
        type: Number,

        default: 0,

        min: [
          0,
          "Practical maximum marks cannot be negative"
        ]
      },

      internalMaxMarks: {
        type: Number,

        default: 0,

        min: [
          0,
          "Internal maximum marks cannot be negative"
        ]
      },

      weightagePercentage: {
        type: Number,

        default: 100,

        min: [
          0,
          "Weightage cannot be negative"
        ],

        max: [
          100,
          "Weightage cannot exceed 100 percent"
        ]
      },

      isOptional: {
        type: Boolean,
        default: false
      },

      allowGraceMarks: {
        type: Boolean,
        default: false
      },

      graceMarksLimit: {
        type: Number,

        default: 0,

        min: [
          0,
          "Grace marks limit cannot be negative"
        ]
      },

      percentagePrecision: {
        type: Number,

        enum: {
          values: [
            0,
            1,
            2
          ],

          message:
            "Percentage precision must be 0, 1 or 2"
        },

        default: 2
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Entered Scores
|--------------------------------------------------------------------------
*/

const scoreSchema =
  new Schema(
    {
      theoryMarks: {
        type: Number,

        default: 0,

        min: [
          0,
          "Theory marks cannot be negative"
        ]
      },

      practicalMarks: {
        type: Number,

        default: 0,

        min: [
          0,
          "Practical marks cannot be negative"
        ]
      },

      internalMarks: {
        type: Number,

        default: 0,

        min: [
          0,
          "Internal marks cannot be negative"
        ]
      },

      graceMarks: {
        type: Number,

        default: 0,

        min: [
          0,
          "Grace marks cannot be negative"
        ]
      },

      deductionMarks: {
        type: Number,

        default: 0,

        min: [
          0,
          "Deduction marks cannot be negative"
        ]
      },

      rawObtainedMarks: {
        type: Number,

        default: 0,

        min: [
          0,
          "Raw obtained marks cannot be negative"
        ]
      },

      finalObtainedMarks: {
        type: Number,

        default: 0,

        min: [
          0,
          "Final obtained marks cannot be negative"
        ]
      },

      percentage: {
        type: Number,

        default: 0,

        min: [
          0,
          "Percentage cannot be negative"
        ],

        max: [
          100,
          "Percentage cannot exceed 100"
        ]
      },

      weightedScore: {
        type: Number,

        default: 0,

        min: [
          0,
          "Weighted score cannot be negative"
        ],

        max: [
          100,
          "Weighted score cannot exceed 100"
        ]
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Component Entry Flags
|--------------------------------------------------------------------------
|
| A zero score is a valid score. Separate flags distinguish "entered as zero"
| from "not entered yet".
|
*/

const entryFlagSchema =
  new Schema(
    {
      theoryEntered: {
        type: Boolean,
        default: false
      },

      practicalEntered: {
        type: Boolean,
        default: false
      },

      internalEntered: {
        type: Boolean,
        default: false
      },

      overallEntered: {
        type: Boolean,
        default: false
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Grade Snapshot
|--------------------------------------------------------------------------
*/

const gradeSnapshotSchema =
  new Schema(
    {
      gradeSchemeId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "GradeScheme",

        default: null
      },

      grade: {
        type: String,

        trim: true,

        maxlength: [
          20,
          "Grade symbol cannot exceed 20 characters"
        ],

        default: ""
      },

      label: {
        type: String,

        trim: true,

        maxlength: [
          100,
          "Grade label cannot exceed 100 characters"
        ],

        default: ""
      },

      gradePoint: {
        type: Number,

        default: 0,

        min: [
          0,
          "Grade point cannot be negative"
        ],

        max: [
          10,
          "Grade point cannot exceed 10"
        ]
      },

      remarks: {
        type: String,

        trim: true,

        maxlength: [
          300,
          "Grade remarks cannot exceed 300 characters"
        ],

        default: ""
      },

      displayColor: {
        type: String,

        trim: true,

        maxlength: [
          7,
          "Grade display color must be a valid hex color"
        ],

        default: ""
      },

      resolvedAt: {
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
| Workflow Schemas
|--------------------------------------------------------------------------
*/

const submissionSchema =
  new Schema(
    {
      submittedAt: {
        type: Date,
        default: null
      },

      submittedBy: {
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

const reviewSchema =
  new Schema(
    {
      reviewedAt: {
        type: Date,
        default: null
      },

      reviewedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      approvedAt: {
        type: Date,
        default: null
      },

      approvedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      returnedAt: {
        type: Date,
        default: null
      },

      returnedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      returnReason: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Return reason cannot exceed 1000 characters"
        ],

        default: ""
      },

      reviewRemarks: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Review remarks cannot exceed 1000 characters"
        ],

        default: ""
      }
    },
    {
      _id: false
    }
  );

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
      }
    },
    {
      _id: false
    }
  );

const lockSchema =
  new Schema(
    {
      isLocked: {
        type: Boolean,
        default: false
      },

      lockedAt: {
        type: Date,
        default: null
      },

      lockedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      lockReason: {
        type: String,

        trim: true,

        maxlength: [
          500,
          "Lock reason cannot exceed 500 characters"
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
| Revision Snapshot
|--------------------------------------------------------------------------
*/

const revisionSchema =
  new Schema(
    {
      revisionNumber: {
        type: Number,

        required: true,

        min: [
          1,
          "Revision number must be at least 1"
        ]
      },

      previousStatus: {
        type: String,

        enum: {
          values:
            MARK_ENTRY_STATUSES,

          message:
            "{VALUE} is not a valid previous mark status"
        },

        required: true
      },

      attendanceStatus: {
        type: String,

        enum: {
          values:
            ATTENDANCE_STATUSES,

          message:
            "{VALUE} is not a valid attendance status"
        },

        required: true
      },

      scores: {
        type:
          scoreSchema,

        required: true
      },

      resultStatus: {
        type: String,

        enum: {
          values:
            RESULT_STATUSES,

          message:
            "{VALUE} is not a valid result status"
        },

        required: true
      },

      grade: {
        type:
          gradeSnapshotSchema,

        default:
          () => ({})
      },

      reason: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Revision reason cannot exceed 1000 characters"
        ],

        required: [
          true,
          "Revision reason is required"
        ]
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

        required: [
          true,
          "Revision user is required"
        ]
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Student Mark Schema
|--------------------------------------------------------------------------
*/

const studentMarkSchema =
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

      examScheduleIds: {
        type: [
          {
            type:
              Schema.Types
                .ObjectId,

            ref: "ExamSchedule"
          }
        ],

        default: []
      },

      academicYear: {
        type: String,

        required: [
          true,
          "Academic year is required"
        ],

        trim: true,

        maxlength: [
          30,
          "Academic year cannot exceed 30 characters"
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

      sectionName: {
        type: String,

        required: [
          true,
          "Section name is required"
        ],

        trim: true,

        maxlength: [
          100,
          "Section name cannot exceed 100 characters"
        ],

        index: true
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

      studentId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "Student",

        required: [
          true,
          "Student ID is required"
        ],

        index: true
      },

      markKey: {
        type: String,

        required: true,

        trim: true,

        maxlength: [
          300,
          "Student mark key cannot exceed 300 characters"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Snapshot Identity
      |--------------------------------------------------------------------------
      */

      studentAdmissionNumber: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Admission number snapshot cannot exceed 80 characters"
        ],

        default: ""
      },

      studentRollNumber: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Roll number snapshot cannot exceed 80 characters"
        ],

        default: ""
      },

      subjectCode: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Subject code snapshot cannot exceed 80 characters"
        ],

        default: ""
      },

      assessmentRule: {
        type:
          assessmentRuleSchema,

        required: [
          true,
          "Assessment rule snapshot is required"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Entry and Calculation
      |--------------------------------------------------------------------------
      */

      attendanceStatus: {
        type: String,

        enum: {
          values:
            ATTENDANCE_STATUSES,

          message:
            "{VALUE} is not a valid exam attendance status"
        },

        default:
          "present",

        index: true
      },

      entryFlags: {
        type:
          entryFlagSchema,

        default:
          () => ({})
      },

      scores: {
        type:
          scoreSchema,

        default:
          () => ({})
      },

      resultStatus: {
        type: String,

        enum: {
          values:
            RESULT_STATUSES,

          message:
            "{VALUE} is not a valid result status"
        },

        default:
          "pending",

        index: true
      },

      grade: {
        type:
          gradeSnapshotSchema,

        default:
          () => ({})
      },

      /*
      |--------------------------------------------------------------------------
      | Remarks
      |--------------------------------------------------------------------------
      */

      teacherRemarks: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Teacher remarks cannot exceed 1000 characters"
        ],

        default: ""
      },

      principalRemarks: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Principal remarks cannot exceed 1000 characters"
        ],

        default: ""
      },

      internalNotes: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "Internal notes cannot exceed 2000 characters"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Entry Ownership and Source
      |--------------------------------------------------------------------------
      */

      enteredByStaffId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "Staff",

        default: null,

        index: true
      },

      source: {
        type: String,

        enum: {
          values:
            MARK_ENTRY_SOURCES,

          message:
            "{VALUE} is not a valid mark entry source"
        },

        default:
          "manual"
      },

      importBatchId: {
        type: String,

        trim: true,

        maxlength: [
          160,
          "Import batch ID cannot exceed 160 characters"
        ],

        default: ""
      },

      externalReference: {
        type: String,

        trim: true,

        maxlength: [
          300,
          "External reference cannot exceed 300 characters"
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
            MARK_ENTRY_STATUSES,

          message:
            "{VALUE} is not a valid mark entry status"
        },

        default:
          "draft",

        index: true
      },

      submission: {
        type:
          submissionSchema,

        default:
          () => ({})
      },

      review: {
        type:
          reviewSchema,

        default:
          () => ({})
      },

      publication: {
        type:
          publicationSchema,

        default:
          () => ({})
      },

      lock: {
        type:
          lockSchema,

        default:
          () => ({})
      },

      revisions: {
        type: [
          revisionSchema
        ],

        default: []
      },

      revisionNumber: {
        type: Number,

        default: 1,

        min: [
          1,
          "Revision number must be at least 1"
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
          "Mark record creator is required"
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

studentMarkSchema.index(
  {
    schoolId: 1,
    examId: 1,
    studentId: 1,
    subjectId: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_student_subject_mark_per_exam"
  }
);

studentMarkSchema.index(
  {
    schoolId: 1,
    markKey: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_student_mark_key"
  }
);

studentMarkSchema.index({
  schoolId: 1,
  examId: 1,
  classId: 1,
  sectionName: 1,
  subjectId: 1,
  status: 1,
  isDeleted: 1
});

studentMarkSchema.index({
  schoolId: 1,
  examId: 1,
  classId: 1,
  sectionName: 1,
  studentId: 1,
  isDeleted: 1
});

studentMarkSchema.index({
  schoolId: 1,
  examId: 1,
  resultStatus: 1,
  status: 1,
  isDeleted: 1
});

studentMarkSchema.index({
  schoolId: 1,
  enteredByStaffId: 1,
  status: 1,
  updatedAt: -1,
  isDeleted: 1
});

studentMarkSchema.index({
  schoolId: 1,
  examScheduleIds: 1,
  status: 1,
  isDeleted: 1
});

studentMarkSchema.index({
  schoolId: 1,
  academicYear: 1,
  studentId: 1,
  status: 1,
  isDeleted: 1
});

/*
|--------------------------------------------------------------------------
| Score Calculation
|--------------------------------------------------------------------------
*/

const calculateMarkValues = ({
  assessmentRule,
  scores,
  entryFlags,
  attendanceStatus
}) => {
  const rule = {
    maxMarks:
      roundNumber(
        assessmentRule
          ?.maxMarks,
        2
      ),

    passingMarks:
      roundNumber(
        assessmentRule
          ?.passingMarks,
        2
      ),

    theoryMaxMarks:
      roundNumber(
        assessmentRule
          ?.theoryMaxMarks,
        2
      ),

    practicalMaxMarks:
      roundNumber(
        assessmentRule
          ?.practicalMaxMarks,
        2
      ),

    internalMaxMarks:
      roundNumber(
        assessmentRule
          ?.internalMaxMarks,
        2
      ),

    weightagePercentage:
      roundNumber(
        assessmentRule
          ?.weightagePercentage ??
          100,
        2
      ),

    allowGraceMarks:
      Boolean(
        assessmentRule
          ?.allowGraceMarks
      ),

    graceMarksLimit:
      roundNumber(
        assessmentRule
          ?.graceMarksLimit,
        2
      ),

    percentagePrecision:
      Number(
        assessmentRule
          ?.percentagePrecision ??
          2
      )
  };

  const normalizedScores = {
    theoryMarks:
      roundNumber(
        scores?.theoryMarks,
        2
      ),

    practicalMarks:
      roundNumber(
        scores?.practicalMarks,
        2
      ),

    internalMarks:
      roundNumber(
        scores?.internalMarks,
        2
      ),

    graceMarks:
      roundNumber(
        scores?.graceMarks,
        2
      ),

    deductionMarks:
      roundNumber(
        scores?.deductionMarks,
        2
      )
  };

  const attendanceResultStatus =
    getAttendanceResultStatus(
      attendanceStatus
    );

  if (
    attendanceResultStatus &&
    attendanceStatus !==
      "withheld"
  ) {
    return {
      scores: {
        theoryMarks:
          0,

        practicalMarks:
          0,

        internalMarks:
          0,

        graceMarks:
          0,

        deductionMarks:
          0,

        rawObtainedMarks:
          0,

        finalObtainedMarks:
          0,

        percentage:
          0,

        weightedScore:
          0
      },

      resultStatus:
        attendanceResultStatus,

      entryComplete:
        true
    };
  }

  const rawObtainedMarks =
    roundNumber(
      normalizedScores
        .theoryMarks +
        normalizedScores
          .practicalMarks +
        normalizedScores
          .internalMarks,
      2
    );

  const allowedGrace =
    rule.allowGraceMarks
      ? Math.min(
          normalizedScores
            .graceMarks,
          rule.graceMarksLimit
        )
      : 0;

  const finalObtainedMarks =
    roundNumber(
      clampNumber(
        rawObtainedMarks +
          allowedGrace -
          normalizedScores
            .deductionMarks,
        0,
        rule.maxMarks
      ),
      2
    );

  const percentage =
    rule.maxMarks >
    0
      ? roundNumber(
          (
            finalObtainedMarks /
            rule.maxMarks
          ) *
            100,
          rule
            .percentagePrecision
        )
      : 0;

  const weightedScore =
    roundNumber(
      (
        percentage *
        rule.weightagePercentage
      ) /
        100,
      rule
        .percentagePrecision
    );

  const entryComplete =
    isEntryComplete({
      assessmentRule:
        rule,

      entryFlags,

      attendanceStatus
    });

  let resultStatus =
    "pending";

  if (
    attendanceStatus ===
    "withheld"
  ) {
    resultStatus =
      "withheld";
  } else if (
    entryComplete
  ) {
    resultStatus =
      finalObtainedMarks >=
      rule.passingMarks
        ? "pass"
        : "fail";
  }

  return {
    scores: {
      ...normalizedScores,

      graceMarks:
        allowedGrace,

      rawObtainedMarks,

      finalObtainedMarks,

      percentage,

      weightedScore
    },

    resultStatus,

    entryComplete
  };
};

/*
|--------------------------------------------------------------------------
| Validation and Normalization
|--------------------------------------------------------------------------
*/

studentMarkSchema.pre(
  "validate",
  function validateStudentMark() {
    this.academicYear =
      normalizeText(
        this.academicYear
      );

    this.sectionName =
      normalizeSectionName(
        this.sectionName
      );

    this.studentAdmissionNumber =
      normalizeCode(
        this.studentAdmissionNumber
      );

    this.studentRollNumber =
      normalizeCode(
        this.studentRollNumber
      );

    this.subjectCode =
      normalizeCode(
        this.subjectCode
      );

    this.teacherRemarks =
      normalizeText(
        this.teacherRemarks
      );

    this.principalRemarks =
      normalizeText(
        this.principalRemarks
      );

    this.internalNotes =
      normalizeText(
        this.internalNotes
      );

    this.importBatchId =
      normalizeText(
        this.importBatchId
      );

    this.externalReference =
      normalizeText(
        this.externalReference
      );

    this.examScheduleIds =
      uniqueObjectIds(
        this.examScheduleIds
      );

    this.assessmentRule =
      this.assessmentRule ||
      {};

    this.entryFlags =
      this.entryFlags ||
      {};

    this.scores =
      this.scores ||
      {};

    this.grade =
      this.grade ||
      {};

    this.submission =
      this.submission ||
      {};

    this.review =
      this.review ||
      {};

    this.publication =
      this.publication ||
      {};

    this.lock =
      this.lock ||
      {};

    /*
    |--------------------------------------------------------------------------
    | Assessment Rule Validation
    |--------------------------------------------------------------------------
    */

    const ruleFields = [
      "maxMarks",
      "passingMarks",
      "theoryMaxMarks",
      "practicalMaxMarks",
      "internalMaxMarks",
      "weightagePercentage",
      "graceMarksLimit"
    ];

    ruleFields.forEach(
      (
        field
      ) => {
        this.assessmentRule[
          field
        ] =
          roundNumber(
            this.assessmentRule[
              field
            ],
            2
          );
      }
    );

    if (
      this.assessmentRule
        .passingMarks >
      this.assessmentRule
        .maxMarks
    ) {
      this.invalidate(
        "assessmentRule.passingMarks",
        "Passing marks cannot exceed maximum marks"
      );
    }

    const componentMaximum =
      roundNumber(
        this.assessmentRule
          .theoryMaxMarks +
          this.assessmentRule
            .practicalMaxMarks +
          this.assessmentRule
            .internalMaxMarks,
        2
      );

    if (
      componentMaximum >
        0 &&
      componentMaximum !==
        this.assessmentRule
          .maxMarks
    ) {
      this.invalidate(
        "assessmentRule.maxMarks",
        "Theory, practical and internal maximum marks must total the subject maximum marks"
      );
    }

    if (
      !this.assessmentRule
        .allowGraceMarks
    ) {
      this.assessmentRule
        .graceMarksLimit =
        0;
    }

    if (
      this.assessmentRule
        .graceMarksLimit >
      this.assessmentRule
        .passingMarks
    ) {
      this.invalidate(
        "assessmentRule.graceMarksLimit",
        "Grace marks limit cannot exceed passing marks"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Entered Component Validation
    |--------------------------------------------------------------------------
    */

    SCORE_COMPONENTS.forEach(
      (
        component
      ) => {
        const markField =
          `${component}Marks`;

        const maximumField =
          `${component}MaxMarks`;

        this.scores[
          markField
        ] =
          roundNumber(
            this.scores[
              markField
            ],
            2
          );

        const enteredMarks =
          Number(
            this.scores[
              markField
            ]
          );

        const componentMaximumMarks =
          Number(
            this.assessmentRule[
              maximumField
            ] ||
            0
          );

        if (
          enteredMarks >
          componentMaximumMarks
        ) {
          this.invalidate(
            `scores.${markField}`,
            `${component[0].toUpperCase()}${component.slice(
              1
            )} marks cannot exceed ${componentMaximumMarks}`
          );
        }

        if (
          componentMaximumMarks ===
            0 &&
          enteredMarks >
            0
        ) {
          this.invalidate(
            `scores.${markField}`,
            `${component[0].toUpperCase()}${component.slice(
              1
            )} marks are not enabled for this subject`
          );
        }
      }
    );

    this.scores.graceMarks =
      roundNumber(
        this.scores
          .graceMarks,
        2
      );

    this.scores.deductionMarks =
      roundNumber(
        this.scores
          .deductionMarks,
        2
      );

    if (
      !this.assessmentRule
        .allowGraceMarks &&
      this.scores
        .graceMarks >
        0
    ) {
      this.invalidate(
        "scores.graceMarks",
        "Grace marks are not enabled for this assessment"
      );
    }

    if (
      this.scores
        .graceMarks >
      this.assessmentRule
        .graceMarksLimit
    ) {
      this.invalidate(
        "scores.graceMarks",
        "Grace marks cannot exceed the configured grace limit"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Calculate Official Values
    |--------------------------------------------------------------------------
    */

    const calculated =
      calculateMarkValues({
        assessmentRule:
          this.assessmentRule,

        scores:
          this.scores,

        entryFlags:
          this.entryFlags,

        attendanceStatus:
          this.attendanceStatus
      });

    this.scores =
      calculated.scores;

    this.resultStatus =
      calculated.resultStatus;

    /*
    |--------------------------------------------------------------------------
    | Non-Present Attendance Rules
    |--------------------------------------------------------------------------
    */

    if (
      this.attendanceStatus !==
      "present"
    ) {
      this.entryFlags
        .overallEntered =
        true;

      this.entryFlags
        .theoryEntered =
        false;

      this.entryFlags
        .practicalEntered =
        false;

      this.entryFlags
        .internalEntered =
        false;
    }

    /*
    |--------------------------------------------------------------------------
    | Grade Snapshot Normalization
    |--------------------------------------------------------------------------
    */

    this.grade.grade =
      normalizeText(
        this.grade.grade
      ).toUpperCase();

    this.grade.label =
      normalizeText(
        this.grade.label
      );

    this.grade.remarks =
      normalizeText(
        this.grade.remarks
      );

    this.grade.displayColor =
      normalizeText(
        this.grade
          .displayColor
      ).toUpperCase();

    this.grade.gradePoint =
      roundNumber(
        this.grade
          .gradePoint,
        2
      );

    if (
      this.grade
        .displayColor &&
      !/^#[0-9A-F]{6}$/.test(
        this.grade
          .displayColor
      )
    ) {
      this.invalidate(
        "grade.displayColor",
        "Grade display color must use a six-digit hex value such as #16A34A"
      );
    }

    if (
      [
        "pending",
        "absent",
        "leave",
        "exempted",
        "withheld"
      ].includes(
        this.resultStatus
      )
    ) {
      this.grade = {
        gradeSchemeId:
          null,

        grade:
          "",

        label:
          "",

        gradePoint:
          0,

        remarks:
          "",

        displayColor:
          "",

        resolvedAt:
          null
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Workflow Validation
    |--------------------------------------------------------------------------
    */

    const requiresCompleteEntry =
      [
        "submitted",
        "approved",
        "published",
        "locked"
      ].includes(
        this.status
      );

    if (
      requiresCompleteEntry &&
      !calculated.entryComplete
    ) {
      this.invalidate(
        "status",
        "All required mark components must be entered before submission"
      );
    }

    if (
      this.status ===
      "submitted"
    ) {
      if (
        !this.submission
          .submittedAt
      ) {
        this.submission
          .submittedAt =
          new Date();
      }

      this.review.returnedAt =
        null;

      this.review.returnedBy =
        null;

      this.review.returnReason =
        "";
    }

    if (
      this.status ===
      "returned"
    ) {
      this.review.returnReason =
        normalizeText(
          this.review
            .returnReason
        );

      if (
        !this.review
          .returnReason
      ) {
        this.invalidate(
          "review.returnReason",
          "A return reason is required when marks are returned for correction"
        );
      }

      if (
        !this.review
          .returnedAt
      ) {
        this.review
          .returnedAt =
          new Date();
      }

      this.review.approvedAt =
        null;

      this.review.approvedBy =
        null;
    }

    if (
      [
        "approved",
        "published",
        "locked"
      ].includes(
        this.status
      )
    ) {
      if (
        !this.review
          .approvedAt
      ) {
        this.review
          .approvedAt =
          new Date();
      }

      this.review.reviewedAt =
        this.review
          .reviewedAt ||
        this.review
          .approvedAt;
    }

    if (
      this.status ===
      "published"
    ) {
      if (
        !this.review
          .approvedAt
      ) {
        this.invalidate(
          "status",
          "Marks must be approved before publication"
        );
      }

      if (
        !this.publication
          .publishedAt
      ) {
        this.publication
          .publishedAt =
          new Date();
      }
    }

    if (
      this.status ===
      "locked"
    ) {
      this.lock.isLocked =
        true;

      if (
        !this.lock
          .lockedAt
      ) {
        this.lock.lockedAt =
          new Date();
      }
    }

    if (
      this.lock
        .isLocked &&
      !this.lock
        .lockedAt
    ) {
      this.lock.lockedAt =
        new Date();
    }

    /*
    |--------------------------------------------------------------------------
    | Revision Validation
    |--------------------------------------------------------------------------
    */

    if (
      Array.isArray(
        this.revisions
      )
    ) {
      this.revisions.forEach(
        (
          revision,
          index
        ) => {
          revision.reason =
            normalizeText(
              revision.reason
            );

          if (
            !revision.reason
          ) {
            this.invalidate(
              `revisions.${index}.reason`,
              "Every mark revision must include a reason"
            );
          }
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Stable Mark Key and Soft Delete
    |--------------------------------------------------------------------------
    */

    this.markKey =
      buildMarkKey({
        schoolId:
          this.schoolId,

        examId:
          this.examId,

        studentId:
          this.studentId,

        subjectId:
          this.subjectId
      });

    if (
      !this.markKey
    ) {
      this.invalidate(
        "markKey",
        "A valid student mark key could not be generated"
      );
    }

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

studentMarkSchema.virtual(
  "entryComplete"
).get(
  function getEntryComplete() {
    return isEntryComplete({
      assessmentRule:
        this.assessmentRule,

      entryFlags:
        this.entryFlags,

      attendanceStatus:
        this.attendanceStatus
    });
  }
);

studentMarkSchema.virtual(
  "isPassed"
).get(
  function getIsPassed() {
    return (
      this.resultStatus ===
      "pass"
    );
  }
);

studentMarkSchema.virtual(
  "isFailed"
).get(
  function getIsFailed() {
    return (
      this.resultStatus ===
      "fail"
    );
  }
);

studentMarkSchema.virtual(
  "isEditable"
).get(
  function getIsEditable() {
    return (
      !this.isDeleted &&
      !this.lock?.isLocked &&
      [
        "draft",
        "returned"
      ].includes(
        this.status
      )
    );
  }
);

studentMarkSchema.virtual(
  "hasPublishedResult"
).get(
  function getHasPublishedResult() {
    return (
      [
        "published",
        "locked"
      ].includes(
        this.status
      ) &&
      !this.isDeleted
    );
  }
);

studentMarkSchema.virtual(
  "displayResult"
).get(
  function getDisplayResult() {
    const statusLabels = {
      pending:
        "Pending",

      pass:
        "Pass",

      fail:
        "Fail",

      absent:
        "Absent",

      leave:
        "Leave",

      exempted:
        "Exempted",

      withheld:
        "Withheld"
    };

    return (
      statusLabels[
        this.resultStatus
      ] ||
      "Pending"
    );
  }
);

/*
|--------------------------------------------------------------------------
| Instance Methods
|--------------------------------------------------------------------------
*/

studentMarkSchema.methods.recalculate =
  function recalculate() {
    const calculated =
      calculateMarkValues({
        assessmentRule:
          this.assessmentRule,

        scores:
          this.scores,

        entryFlags:
          this.entryFlags,

        attendanceStatus:
          this.attendanceStatus
      });

    this.scores =
      calculated.scores;

    this.resultStatus =
      calculated.resultStatus;

    return {
      scores:
        this.scores,

      resultStatus:
        this.resultStatus,

      entryComplete:
        calculated.entryComplete
    };
  };

studentMarkSchema.methods.canTransitionTo =
  function canTransitionTo(
    nextStatus
  ) {
    if (
      !MARK_ENTRY_STATUSES.includes(
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

studentMarkSchema.methods.applyGradeResolution =
  function applyGradeResolution(
    resolvedGrade,
    gradeSchemeId = null
  ) {
    if (
      !resolvedGrade ||
      ![
        "pass",
        "fail"
      ].includes(
        this.resultStatus
      )
    ) {
      this.grade = {
        gradeSchemeId:
          null,

        grade:
          "",

        label:
          "",

        gradePoint:
          0,

        remarks:
          "",

        displayColor:
          "",

        resolvedAt:
          null
      };

      return this;
    }

    this.grade = {
      gradeSchemeId:
        gradeSchemeId ||
        resolvedGrade
          .gradeSchemeId ||
        null,

      grade:
        normalizeText(
          resolvedGrade.grade
        ).toUpperCase(),

      label:
        normalizeText(
          resolvedGrade.label
        ),

      gradePoint:
        roundNumber(
          resolvedGrade
            .gradePoint,
          2
        ),

      remarks:
        normalizeText(
          resolvedGrade.remarks
        ),

      displayColor:
        normalizeText(
          resolvedGrade
            .displayColor
        ).toUpperCase(),

      resolvedAt:
        new Date()
    };

    return this;
  };

studentMarkSchema.methods.addRevisionSnapshot =
  function addRevisionSnapshot({
    reason,
    changedBy
  }) {
    const normalizedReason =
      normalizeText(
        reason
      );

    if (
      !normalizedReason
    ) {
      throw new Error(
        "Revision reason is required"
      );
    }

    if (
      !changedBy
    ) {
      throw new Error(
        "Revision user is required"
      );
    }

    const nextRevisionNumber =
      Number(
        this.revisionNumber ||
        1
      ) +
      1;

    this.revisions.push({
      revisionNumber:
        nextRevisionNumber,

      previousStatus:
        this.status,

      attendanceStatus:
        this.attendanceStatus,

      scores: {
        theoryMarks:
          this.scores
            ?.theoryMarks ||
          0,

        practicalMarks:
          this.scores
            ?.practicalMarks ||
          0,

        internalMarks:
          this.scores
            ?.internalMarks ||
          0,

        graceMarks:
          this.scores
            ?.graceMarks ||
          0,

        deductionMarks:
          this.scores
            ?.deductionMarks ||
          0,

        rawObtainedMarks:
          this.scores
            ?.rawObtainedMarks ||
          0,

        finalObtainedMarks:
          this.scores
            ?.finalObtainedMarks ||
          0,

        percentage:
          this.scores
            ?.percentage ||
          0,

        weightedScore:
          this.scores
            ?.weightedScore ||
          0
      },

      resultStatus:
        this.resultStatus,

      grade: {
        gradeSchemeId:
          this.grade
            ?.gradeSchemeId ||
          null,

        grade:
          this.grade
            ?.grade ||
          "",

        label:
          this.grade
            ?.label ||
          "",

        gradePoint:
          this.grade
            ?.gradePoint ||
          0,

        remarks:
          this.grade
            ?.remarks ||
          "",

        displayColor:
          this.grade
            ?.displayColor ||
          "",

        resolvedAt:
          this.grade
            ?.resolvedAt ||
          null
      },

      reason:
        normalizedReason,

      changedAt:
        new Date(),

      changedBy
    });

    this.revisionNumber =
      nextRevisionNumber;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Static Helpers
|--------------------------------------------------------------------------
*/

studentMarkSchema.statics.calculateMarkValues =
  function staticCalculateMarkValues(
    values
  ) {
    return calculateMarkValues(
      values
    );
  };

studentMarkSchema.statics.getAllowedStatusTransitions =
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

studentMarkSchema.statics.buildActiveFilter =
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

studentMarkSchema.statics.buildMarkKey =
  function staticBuildMarkKey(
    values
  ) {
    return buildMarkKey(
      values
    );
  };

/*
|--------------------------------------------------------------------------
| Model Export
|--------------------------------------------------------------------------
*/

const StudentMark =
  mongoose.models
    .StudentMark ||
  mongoose.model(
    "StudentMark",
    studentMarkSchema
  );

module.exports =
  StudentMark;

module.exports.MARK_ENTRY_STATUSES =
  MARK_ENTRY_STATUSES;

module.exports.ATTENDANCE_STATUSES =
  ATTENDANCE_STATUSES;

module.exports.RESULT_STATUSES =
  RESULT_STATUSES;

module.exports.MARK_ENTRY_SOURCES =
  MARK_ENTRY_SOURCES;

module.exports.ALLOWED_STATUS_TRANSITIONS =
  ALLOWED_STATUS_TRANSITIONS;
