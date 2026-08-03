const mongoose = require("mongoose");

const {
  Schema
} = mongoose;

/*
|--------------------------------------------------------------------------
| Exam Result Constants
|--------------------------------------------------------------------------
*/

const EXAM_RESULT_STATUSES = [
  "draft",
  "generated",
  "under_review",
  "approved",
  "published",
  "locked",
  "archived"
];

const OVERALL_RESULT_STATUSES = [
  "pending",
  "pass",
  "fail",
  "incomplete",
  "withheld"
];

const SUBJECT_RESULT_STATUSES = [
  "pending",
  "pass",
  "fail",
  "absent",
  "leave",
  "exempted",
  "withheld"
];

const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "medical_leave",
  "approved_leave",
  "exempted",
  "withheld"
];

const RESULT_GENERATION_SOURCES = [
  "manual",
  "automatic",
  "recalculation",
  "import"
];

const ALLOWED_STATUS_TRANSITIONS = {
  draft: [
    "generated",
    "archived"
  ],

  generated: [
    "draft",
    "under_review",
    "archived"
  ],

  under_review: [
    "generated",
    "approved",
    "archived"
  ],

  approved: [
    "under_review",
    "published",
    "locked",
    "archived"
  ],

  published: [
    "locked",
    "archived"
  ],

  locked: [
    "published",
    "archived"
  ],

  archived: []
};

/*
|--------------------------------------------------------------------------
| Helpers
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

const nearlyEqual = (
  first,
  second,
  tolerance = 0.000001
) => {
  return (
    Math.abs(
      Number(first) -
      Number(second)
    ) <=
    tolerance
  );
};

const normalizeHexColor = (
  value
) => {
  const color =
    normalizeText(
      value
    ).toUpperCase();

  if (!color) {
    return "";
  }

  return color.startsWith(
    "#"
  )
    ? color
    : `#${color}`;
};

const buildResultKey = ({
  schoolId,
  examId,
  studentId
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
    )
  ]
    .filter(
      Boolean
    )
    .join(
      ":"
    );
};

const normalizeSubjectStatus = (
  value
) => {
  const status =
    normalizeText(
      value
    ).toLowerCase();

  return SUBJECT_RESULT_STATUSES.includes(
    status
  )
    ? status
    : "pending";
};

const statusCountsAsFailure = (
  status
) => {
  return [
    "fail",
    "absent"
  ].includes(
    status
  );
};

const statusMakesResultIncomplete = (
  status
) => {
  return [
    "pending",
    "leave"
  ].includes(
    status
  );
};

const statusIsWithheld = (
  status
) => {
  return status ===
    "withheld";
};

const subjectCountsInTotal = (
  subject
) => {
  if (
    subject?.countsInTotal ===
    false
  ) {
    return false;
  }

  if (
    subject?.resultStatus ===
    "exempted"
  ) {
    return false;
  }

  return true;
};

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
| Subject Result Schema
|--------------------------------------------------------------------------
|
| Every row is a snapshot of one StudentMark record. The snapshot protects
| published report cards from later edits to subjects or grading rules.
|
*/

const subjectResultSchema =
  new Schema(
    {
      studentMarkId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "StudentMark",

        required: [
          true,
          "Student mark reference is required"
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
        ]
      },

      subjectCode: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Subject code cannot exceed 80 characters"
        ],

        default: ""
      },

      subjectName: {
        type: String,

        trim: true,

        maxlength: [
          180,
          "Subject name cannot exceed 180 characters"
        ],

        default: ""
      },

      displayOrder: {
        type: Number,

        default: 0,

        min: [
          0,
          "Subject display order cannot be negative"
        ]
      },

      isOptional: {
        type: Boolean,
        default: false
      },

      countsInTotal: {
        type: Boolean,
        default: true
      },

      maxMarks: {
        type: Number,

        required: [
          true,
          "Subject maximum marks are required"
        ],

        min: [
          0,
          "Subject maximum marks cannot be negative"
        ]
      },

      passingMarks: {
        type: Number,

        required: [
          true,
          "Subject passing marks are required"
        ],

        min: [
          0,
          "Subject passing marks cannot be negative"
        ]
      },

      obtainedMarks: {
        type: Number,

        default: 0,

        min: [
          0,
          "Obtained marks cannot be negative"
        ]
      },

      percentage: {
        type: Number,

        default: 0,

        min: [
          0,
          "Subject percentage cannot be negative"
        ],

        max: [
          100,
          "Subject percentage cannot exceed 100"
        ]
      },

      weightagePercentage: {
        type: Number,

        default: 100,

        min: [
          0,
          "Subject weightage cannot be negative"
        ],

        max: [
          100,
          "Subject weightage cannot exceed 100"
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
      },

      attendanceStatus: {
        type: String,

        enum: {
          values:
            ATTENDANCE_STATUSES,

          message:
            "{VALUE} is not a valid subject attendance status"
        },

        default:
          "present"
      },

      resultStatus: {
        type: String,

        enum: {
          values:
            SUBJECT_RESULT_STATUSES,

          message:
            "{VALUE} is not a valid subject result status"
        },

        default:
          "pending"
      },

      grade: {
        type:
          gradeSnapshotSchema,

        default:
          () => ({})
      },

      teacherRemarks: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Subject teacher remarks cannot exceed 1000 characters"
        ],

        default: ""
      },

      principalRemarks: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Subject principal remarks cannot exceed 1000 characters"
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
| Result Rule Snapshot
|--------------------------------------------------------------------------
*/

const resultRuleSchema =
  new Schema(
    {
      gradeSchemeId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "GradeScheme",

        default: null
      },

      failIfAnyRequiredSubjectFailed: {
        type: Boolean,
        default: true
      },

      minimumOverallPercentage: {
        type: Number,

        default: 0,

        min: [
          0,
          "Minimum overall percentage cannot be negative"
        ],

        max: [
          100,
          "Minimum overall percentage cannot exceed 100"
        ]
      },

      includeOptionalSubjectsInTotal: {
        type: Boolean,
        default: true
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
      },

      rankingEnabled: {
        type: Boolean,
        default: false
      },

      showClassPosition: {
        type: Boolean,
        default: false
      },

      showSectionPosition: {
        type: Boolean,
        default: false
      },

      showGrade: {
        type: Boolean,
        default: true
      },

      showGPA: {
        type: Boolean,
        default: false
      },

      includeAttendance: {
        type: Boolean,
        default: true
      },

      includeTeacherRemarks: {
        type: Boolean,
        default: true
      },

      includePrincipalRemarks: {
        type: Boolean,
        default: true
      },

      allowStudentDownload: {
        type: Boolean,
        default: true
      },

      allowParentDownload: {
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
| Total Summary Schema
|--------------------------------------------------------------------------
*/

const totalSummarySchema =
  new Schema(
    {
      subjectCount: {
        type: Number,
        default: 0,
        min: 0
      },

      countedSubjectCount: {
        type: Number,
        default: 0,
        min: 0
      },

      passedSubjectCount: {
        type: Number,
        default: 0,
        min: 0
      },

      failedSubjectCount: {
        type: Number,
        default: 0,
        min: 0
      },

      absentSubjectCount: {
        type: Number,
        default: 0,
        min: 0
      },

      leaveSubjectCount: {
        type: Number,
        default: 0,
        min: 0
      },

      exemptedSubjectCount: {
        type: Number,
        default: 0,
        min: 0
      },

      withheldSubjectCount: {
        type: Number,
        default: 0,
        min: 0
      },

      pendingSubjectCount: {
        type: Number,
        default: 0,
        min: 0
      },

      totalMaxMarks: {
        type: Number,
        default: 0,
        min: 0
      },

      totalObtainedMarks: {
        type: Number,
        default: 0,
        min: 0
      },

      totalWeightedScore: {
        type: Number,
        default: 0,
        min: 0
      },

      percentage: {
        type: Number,

        default: 0,

        min: [
          0,
          "Overall percentage cannot be negative"
        ],

        max: [
          100,
          "Overall percentage cannot exceed 100"
        ]
      },

      gradePointAverage: {
        type: Number,

        default: 0,

        min: [
          0,
          "Grade point average cannot be negative"
        ],

        max: [
          10,
          "Grade point average cannot exceed 10"
        ]
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Position Schema
|--------------------------------------------------------------------------
*/

const positionSchema =
  new Schema(
    {
      classPosition: {
        type: Number,
        default: null,
        min: 1
      },

      classCandidateCount: {
        type: Number,
        default: 0,
        min: 0
      },

      sectionPosition: {
        type: Number,
        default: null,
        min: 1
      },

      sectionCandidateCount: {
        type: Number,
        default: 0,
        min: 0
      },

      calculatedAt: {
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
| Attendance Summary Schema
|--------------------------------------------------------------------------
*/

const attendanceSummarySchema =
  new Schema(
    {
      workingDays: {
        type: Number,
        default: 0,
        min: 0
      },

      presentDays: {
        type: Number,
        default: 0,
        min: 0
      },

      absentDays: {
        type: Number,
        default: 0,
        min: 0
      },

      lateDays: {
        type: Number,
        default: 0,
        min: 0
      },

      leaveDays: {
        type: Number,
        default: 0,
        min: 0
      },

      attendancePercentage: {
        type: Number,

        default: 0,

        min: [
          0,
          "Attendance percentage cannot be negative"
        ],

        max: [
          100,
          "Attendance percentage cannot exceed 100"
        ]
      },

      periodStart: {
        type: Date,
        default: null
      },

      periodEnd: {
        type: Date,
        default: null
      },

      calculatedAt: {
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

const generationSchema =
  new Schema(
    {
      source: {
        type: String,

        enum: {
          values:
            RESULT_GENERATION_SOURCES,

          message:
            "{VALUE} is not a valid result generation source"
        },

        default:
          "automatic"
      },

      generatedAt: {
        type: Date,
        default: null
      },

      generatedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      sourceMarkCount: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    {
      _id: false
    }
  );

const approvalSchema =
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
      },

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
| Revision Summary Schema
|--------------------------------------------------------------------------
*/

const revisionSummarySchema =
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
            EXAM_RESULT_STATUSES,

          message:
            "{VALUE} is not a valid previous exam result status"
        },

        required: true
      },

      previousOverallResultStatus: {
        type: String,

        enum: {
          values:
            OVERALL_RESULT_STATUSES,

          message:
            "{VALUE} is not a valid previous overall result status"
        },

        required: true
      },

      totals: {
        type:
          totalSummarySchema,

        required: true
      },

      overallGrade: {
        type:
          gradeSnapshotSchema,

        default:
          () => ({})
      },

      positions: {
        type:
          positionSchema,

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
| Calculation
|--------------------------------------------------------------------------
*/

const calculateResultTotals = ({
  subjectResults,
  resultRules
}) => {
  const precision =
    Number(
      resultRules
        ?.percentagePrecision ??
      2
    );

  const includeOptional =
    resultRules
      ?.includeOptionalSubjectsInTotal !==
    false;

  const subjects =
    Array.isArray(
      subjectResults
    )
      ? subjectResults
      : [];

  const summary = {
    subjectCount:
      subjects.length,

    countedSubjectCount:
      0,

    passedSubjectCount:
      0,

    failedSubjectCount:
      0,

    absentSubjectCount:
      0,

    leaveSubjectCount:
      0,

    exemptedSubjectCount:
      0,

    withheldSubjectCount:
      0,

    pendingSubjectCount:
      0,

    totalMaxMarks:
      0,

    totalObtainedMarks:
      0,

    totalWeightedScore:
      0,

    percentage:
      0,

    gradePointAverage:
      0
  };

  let gradePointTotal =
    0;

  let gradedSubjectCount =
    0;

  let hasRequiredFailure =
    false;

  let hasRequiredIncomplete =
    false;

  let hasRequiredWithheld =
    false;

  subjects.forEach(
    (
      subject
    ) => {
      const status =
        normalizeSubjectStatus(
          subject.resultStatus
        );

      const requiredSubject =
        !subject.isOptional;

      if (
        status ===
        "pass"
      ) {
        summary
          .passedSubjectCount +=
          1;
      }

      if (
        status ===
        "fail"
      ) {
        summary
          .failedSubjectCount +=
          1;
      }

      if (
        status ===
        "absent"
      ) {
        summary
          .absentSubjectCount +=
          1;
      }

      if (
        status ===
        "leave"
      ) {
        summary
          .leaveSubjectCount +=
          1;
      }

      if (
        status ===
        "exempted"
      ) {
        summary
          .exemptedSubjectCount +=
          1;
      }

      if (
        status ===
        "withheld"
      ) {
        summary
          .withheldSubjectCount +=
          1;
      }

      if (
        status ===
        "pending"
      ) {
        summary
          .pendingSubjectCount +=
          1;
      }

      if (
        requiredSubject &&
        statusCountsAsFailure(
          status
        )
      ) {
        hasRequiredFailure =
          true;
      }

      if (
        requiredSubject &&
        statusMakesResultIncomplete(
          status
        )
      ) {
        hasRequiredIncomplete =
          true;
      }

      if (
        requiredSubject &&
        statusIsWithheld(
          status
        )
      ) {
        hasRequiredWithheld =
          true;
      }

      const includeSubject =
        subjectCountsInTotal(
          subject
        ) &&
        (
          includeOptional ||
          !subject.isOptional
        );

      if (
        !includeSubject
      ) {
        return;
      }

      summary
        .countedSubjectCount +=
        1;

      summary.totalMaxMarks =
        roundNumber(
          summary
            .totalMaxMarks +
            toFiniteNumber(
              subject.maxMarks,
              0
            ),
          2
        );

      summary
        .totalObtainedMarks =
        roundNumber(
          summary
            .totalObtainedMarks +
            toFiniteNumber(
              subject.obtainedMarks,
              0
            ),
          2
        );

      summary
        .totalWeightedScore =
        roundNumber(
          summary
            .totalWeightedScore +
            toFiniteNumber(
              subject.weightedScore,
              0
            ),
          precision
        );

      if (
        [
          "pass",
          "fail"
        ].includes(
          status
        ) &&
        subject.grade
          ?.grade
      ) {
        gradePointTotal +=
          toFiniteNumber(
            subject.grade
              .gradePoint,
            0
          );

        gradedSubjectCount +=
          1;
      }
    }
  );

  if (
    summary.totalMaxMarks >
    0
  ) {
    summary.percentage =
      roundNumber(
        (
          summary
            .totalObtainedMarks /
          summary
            .totalMaxMarks
        ) *
          100,
        precision
      );
  }

  if (
    gradedSubjectCount >
    0
  ) {
    summary.gradePointAverage =
      roundNumber(
        gradePointTotal /
          gradedSubjectCount,
        2
      );
  }

  let overallResultStatus =
    "pending";

  if (
    subjects.length ===
      0 ||
    summary.countedSubjectCount ===
      0
  ) {
    overallResultStatus =
      "incomplete";
  } else if (
    hasRequiredWithheld
  ) {
    overallResultStatus =
      "withheld";
  } else if (
    hasRequiredIncomplete
  ) {
    overallResultStatus =
      "incomplete";
  } else {
    const failedBySubjectRule =
      Boolean(
        resultRules
          ?.failIfAnyRequiredSubjectFailed
      ) &&
      hasRequiredFailure;

    const failedByOverallPercentage =
      summary.percentage <
      toFiniteNumber(
        resultRules
          ?.minimumOverallPercentage,
        0
      );

    overallResultStatus =
      failedBySubjectRule ||
      failedByOverallPercentage
        ? "fail"
        : "pass";
  }

  return {
    totals:
      summary,

    overallResultStatus
  };
};

/*
|--------------------------------------------------------------------------
| Student Mark Snapshot Builder
|--------------------------------------------------------------------------
*/

const mapStudentMarkToSubjectResult = (
  studentMark,
  index = 0
) => {
  const mark =
    studentMark?.toObject
      ? studentMark.toObject({
          virtuals: true
        })
      : studentMark ||
        {};

  const subject =
    mark.subjectId &&
    typeof mark.subjectId ===
      "object"
      ? mark.subjectId
      : {};

  return {
    studentMarkId:
      mark._id ||
      mark.id,

    subjectId:
      subject._id ||
      mark.subjectId,

    subjectCode:
      mark.subjectCode ||
      subject.code ||
      subject.subjectCode ||
      "",

    subjectName:
      subject.name ||
      subject.subjectName ||
      "",

    displayOrder:
      Number(
        mark.displayOrder ??
        subject.displayOrder ??
        index
      ),

    isOptional:
      Boolean(
        mark.assessmentRule
          ?.isOptional
      ),

    countsInTotal:
      mark.countsInTotal !==
      false,

    maxMarks:
      toFiniteNumber(
        mark.assessmentRule
          ?.maxMarks,
        0
      ),

    passingMarks:
      toFiniteNumber(
        mark.assessmentRule
          ?.passingMarks,
        0
      ),

    obtainedMarks:
      toFiniteNumber(
        mark.scores
          ?.finalObtainedMarks,
        0
      ),

    percentage:
      toFiniteNumber(
        mark.scores
          ?.percentage,
        0
      ),

    weightagePercentage:
      toFiniteNumber(
        mark.assessmentRule
          ?.weightagePercentage,
        100
      ),

    weightedScore:
      toFiniteNumber(
        mark.scores
          ?.weightedScore,
        0
      ),

    attendanceStatus:
      mark.attendanceStatus ||
      "present",

    resultStatus:
      mark.resultStatus ||
      "pending",

    grade: {
      gradeSchemeId:
        mark.grade
          ?.gradeSchemeId ||
        null,

      grade:
        mark.grade
          ?.grade ||
        "",

      label:
        mark.grade
          ?.label ||
        "",

      gradePoint:
        toFiniteNumber(
          mark.grade
            ?.gradePoint,
          0
        ),

      remarks:
        mark.grade
          ?.remarks ||
        "",

      displayColor:
        mark.grade
          ?.displayColor ||
        "",

      resolvedAt:
        mark.grade
          ?.resolvedAt ||
        null
    },

    teacherRemarks:
      mark.teacherRemarks ||
      "",

    principalRemarks:
      mark.principalRemarks ||
      ""
  };
};

/*
|--------------------------------------------------------------------------
| Exam Result Schema
|--------------------------------------------------------------------------
*/

const examResultSchema =
  new Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | School, Exam and Student Scope
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

      academicTerm: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Academic term cannot exceed 80 characters"
        ],

        default: ""
      },

      resultKey: {
        type: String,

        required: true,

        trim: true,

        maxlength: [
          240,
          "Exam result key cannot exceed 240 characters"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Identity Snapshot
      |--------------------------------------------------------------------------
      */

      examCode: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Exam code snapshot cannot exceed 80 characters"
        ],

        default: ""
      },

      examName: {
        type: String,

        trim: true,

        maxlength: [
          180,
          "Exam name snapshot cannot exceed 180 characters"
        ],

        default: ""
      },

      studentName: {
        type: String,

        trim: true,

        maxlength: [
          180,
          "Student name snapshot cannot exceed 180 characters"
        ],

        default: ""
      },

      fatherName: {
        type: String,

        trim: true,

        maxlength: [
          180,
          "Father name snapshot cannot exceed 180 characters"
        ],

        default: ""
      },

      admissionNumber: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Admission number snapshot cannot exceed 80 characters"
        ],

        default: ""
      },

      rollNumber: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Roll number snapshot cannot exceed 80 characters"
        ],

        default: ""
      },

      className: {
        type: String,

        trim: true,

        maxlength: [
          120,
          "Class name snapshot cannot exceed 120 characters"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Result Data
      |--------------------------------------------------------------------------
      */

      subjectResults: {
        type: [
          subjectResultSchema
        ],

        default: []
      },

      resultRules: {
        type:
          resultRuleSchema,

        default:
          () => ({})
      },

      totals: {
        type:
          totalSummarySchema,

        default:
          () => ({})
      },

      overallResultStatus: {
        type: String,

        enum: {
          values:
            OVERALL_RESULT_STATUSES,

          message:
            "{VALUE} is not a valid overall result status"
        },

        default:
          "pending",

        index: true
      },

      overallGrade: {
        type:
          gradeSnapshotSchema,

        default:
          () => ({})
      },

      positions: {
        type:
          positionSchema,

        default:
          () => ({})
      },

      attendanceSummary: {
        type:
          attendanceSummarySchema,

        default:
          () => ({})
      },

      classTeacherRemarks: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "Class teacher remarks cannot exceed 2000 characters"
        ],

        default: ""
      },

      principalRemarks: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "Principal remarks cannot exceed 2000 characters"
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
            EXAM_RESULT_STATUSES,

          message:
            "{VALUE} is not a valid exam result status"
        },

        default:
          "draft",

        index: true
      },

      generation: {
        type:
          generationSchema,

        default:
          () => ({})
      },

      approval: {
        type:
          approvalSchema,

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
          revisionSummarySchema
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
          "Exam result creator is required"
        ]
      },

      updatedBy: {
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
| Indexes
|--------------------------------------------------------------------------
*/

examResultSchema.index(
  {
    schoolId: 1,
    examId: 1,
    studentId: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_student_result_per_exam"
  }
);

examResultSchema.index(
  {
    schoolId: 1,
    resultKey: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_exam_result_key"
  }
);

examResultSchema.index({
  schoolId: 1,
  examId: 1,
  classId: 1,
  sectionName: 1,
  status: 1,
  isDeleted: 1
});

examResultSchema.index({
  schoolId: 1,
  examId: 1,
  classId: 1,
  "totals.percentage": -1,
  "totals.totalObtainedMarks": -1,
  isDeleted: 1
});

examResultSchema.index({
  schoolId: 1,
  examId: 1,
  studentId: 1,
  status: 1,
  isDeleted: 1
});

examResultSchema.index({
  schoolId: 1,
  academicYear: 1,
  studentId: 1,
  status: 1,
  isDeleted: 1
});

examResultSchema.index({
  schoolId: 1,
  examId: 1,
  overallResultStatus: 1,
  status: 1,
  isDeleted: 1
});

examResultSchema.index({
  schoolId: 1,
  "subjectResults.subjectId": 1,
  status: 1,
  isDeleted: 1
});

examResultSchema.index({
  schoolId: 1,
  "publication.publishedAt": -1,
  status: 1,
  isDeleted: 1
});

/*
|--------------------------------------------------------------------------
| Validation and Normalization
|--------------------------------------------------------------------------
*/

examResultSchema.pre(
  "validate",
  function validateExamResult() {
    this.academicYear =
      normalizeText(
        this.academicYear
      );

    this.academicTerm =
      normalizeText(
        this.academicTerm
      );

    this.sectionName =
      normalizeSectionName(
        this.sectionName
      );

    this.examCode =
      normalizeCode(
        this.examCode
      );

    this.examName =
      normalizeText(
        this.examName
      );

    this.studentName =
      normalizeText(
        this.studentName
      );

    this.fatherName =
      normalizeText(
        this.fatherName
      );

    this.admissionNumber =
      normalizeCode(
        this.admissionNumber
      );

    this.rollNumber =
      normalizeCode(
        this.rollNumber
      );

    this.className =
      normalizeText(
        this.className
      );

    this.classTeacherRemarks =
      normalizeText(
        this.classTeacherRemarks
      );

    this.principalRemarks =
      normalizeText(
        this.principalRemarks
      );

    this.internalNotes =
      normalizeText(
        this.internalNotes
      );

    this.resultRules =
      this.resultRules ||
      {};

    this.totals =
      this.totals ||
      {};

    this.overallGrade =
      this.overallGrade ||
      {};

    this.positions =
      this.positions ||
      {};

    this.attendanceSummary =
      this.attendanceSummary ||
      {};

    this.generation =
      this.generation ||
      {};

    this.approval =
      this.approval ||
      {};

    this.publication =
      this.publication ||
      {};

    this.lock =
      this.lock ||
      {};

    /*
    |--------------------------------------------------------------------------
    | Subject Result Validation
    |--------------------------------------------------------------------------
    */

    const subjectIds =
      new Set();

    const studentMarkIds =
      new Set();

    if (
      Array.isArray(
        this.subjectResults
      )
    ) {
      this.subjectResults.forEach(
        (
          subject,
          index
        ) => {
          const subjectId =
            objectIdKey(
              subject.subjectId
            );

          const studentMarkId =
            objectIdKey(
              subject.studentMarkId
            );

          if (
            subjectId &&
            subjectIds.has(
              subjectId
            )
          ) {
            this.invalidate(
              `subjectResults.${index}.subjectId`,
              "The same subject cannot appear more than once in an exam result"
            );
          }

          if (
            subjectId
          ) {
            subjectIds.add(
              subjectId
            );
          }

          if (
            studentMarkId &&
            studentMarkIds.has(
              studentMarkId
            )
          ) {
            this.invalidate(
              `subjectResults.${index}.studentMarkId`,
              "The same student mark record cannot be used more than once"
            );
          }

          if (
            studentMarkId
          ) {
            studentMarkIds.add(
              studentMarkId
            );
          }

          subject.subjectCode =
            normalizeCode(
              subject.subjectCode
            );

          subject.subjectName =
            normalizeText(
              subject.subjectName
            );

          subject.teacherRemarks =
            normalizeText(
              subject.teacherRemarks
            );

          subject.principalRemarks =
            normalizeText(
              subject.principalRemarks
            );

          subject.maxMarks =
            roundNumber(
              subject.maxMarks,
              2
            );

          subject.passingMarks =
            roundNumber(
              subject.passingMarks,
              2
            );

          subject.obtainedMarks =
            roundNumber(
              subject.obtainedMarks,
              2
            );

          subject.percentage =
            roundNumber(
              subject.percentage,
              this.resultRules
                .percentagePrecision ??
                2
            );

          subject.weightagePercentage =
            roundNumber(
              subject.weightagePercentage,
              2
            );

          subject.weightedScore =
            roundNumber(
              subject.weightedScore,
              this.resultRules
                .percentagePrecision ??
                2
            );

          subject.resultStatus =
            normalizeSubjectStatus(
              subject.resultStatus
            );

          if (
            subject.passingMarks >
            subject.maxMarks
          ) {
            this.invalidate(
              `subjectResults.${index}.passingMarks`,
              "Subject passing marks cannot exceed maximum marks"
            );
          }

          if (
            subject.obtainedMarks >
            subject.maxMarks
          ) {
            this.invalidate(
              `subjectResults.${index}.obtainedMarks`,
              "Subject obtained marks cannot exceed maximum marks"
            );
          }

          const calculatedPercentage =
            subject.maxMarks >
            0
              ? roundNumber(
                  (
                    subject.obtainedMarks /
                    subject.maxMarks
                  ) *
                    100,
                  this.resultRules
                    .percentagePrecision ??
                    2
                )
              : 0;

          if (
            !nearlyEqual(
              subject.percentage,
              calculatedPercentage,
              0.01
            )
          ) {
            subject.percentage =
              calculatedPercentage;
          }

          subject.grade =
            subject.grade ||
            {};

          subject.grade.grade =
            normalizeText(
              subject.grade
                .grade
            ).toUpperCase();

          subject.grade.label =
            normalizeText(
              subject.grade
                .label
            );

          subject.grade.remarks =
            normalizeText(
              subject.grade
                .remarks
            );

          subject.grade.displayColor =
            normalizeHexColor(
              subject.grade
                .displayColor
            );

          subject.grade.gradePoint =
            roundNumber(
              subject.grade
                .gradePoint,
              2
            );

          if (
            subject.grade
              .displayColor &&
            !/^#[0-9A-F]{6}$/.test(
              subject.grade
                .displayColor
            )
          ) {
            this.invalidate(
              `subjectResults.${index}.grade.displayColor`,
              "Subject grade display color must use a six-digit hex value"
            );
          }

          if (
            ![
              "pass",
              "fail"
            ].includes(
              subject.resultStatus
            )
          ) {
            subject.grade = {
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

          if (
            subject.isOptional &&
            this.resultRules
              .includeOptionalSubjectsInTotal ===
              false
          ) {
            subject.countsInTotal =
              false;
          }

          if (
            subject.resultStatus ===
            "exempted"
          ) {
            subject.countsInTotal =
              false;
          }
        }
      );

      this.subjectResults.sort(
        (
          first,
          second
        ) =>
          Number(
            first.displayOrder ||
            0
          ) -
            Number(
              second.displayOrder ||
              0
            ) ||
          String(
            first.subjectName ||
            ""
          ).localeCompare(
            String(
              second.subjectName ||
              ""
            ),
            undefined,
            {
              sensitivity:
                "base"
            }
          )
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Official Totals
    |--------------------------------------------------------------------------
    */

    const calculated =
      calculateResultTotals({
        subjectResults:
          this.subjectResults,

        resultRules:
          this.resultRules
      });

    this.totals =
      calculated.totals;

    this.overallResultStatus =
      calculated
        .overallResultStatus;

    /*
    |--------------------------------------------------------------------------
    | Overall Grade
    |--------------------------------------------------------------------------
    */

    this.overallGrade.grade =
      normalizeText(
        this.overallGrade
          .grade
      ).toUpperCase();

    this.overallGrade.label =
      normalizeText(
        this.overallGrade
          .label
      );

    this.overallGrade.remarks =
      normalizeText(
        this.overallGrade
          .remarks
      );

    this.overallGrade.displayColor =
      normalizeHexColor(
        this.overallGrade
          .displayColor
      );

    this.overallGrade.gradePoint =
      roundNumber(
        this.overallGrade
          .gradePoint,
        2
      );

    if (
      this.overallGrade
        .displayColor &&
      !/^#[0-9A-F]{6}$/.test(
        this.overallGrade
          .displayColor
      )
    ) {
      this.invalidate(
        "overallGrade.displayColor",
        "Overall grade display color must use a six-digit hex value"
      );
    }

    if (
      ![
        "pass",
        "fail"
      ].includes(
        this.overallResultStatus
      )
    ) {
      this.overallGrade = {
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

    if (
      this.resultRules
        .showGrade ===
        false
    ) {
      this.overallGrade = {
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
    | Attendance Summary
    |--------------------------------------------------------------------------
    */

    const attendance =
      this.attendanceSummary;

    [
      "workingDays",
      "presentDays",
      "absentDays",
      "lateDays",
      "leaveDays"
    ].forEach(
      (
        field
      ) => {
        attendance[
          field
        ] =
          Math.max(
            0,
            Math.floor(
              toFiniteNumber(
                attendance[
                  field
                ],
                0
              )
            )
          );
      }
    );

    if (
      attendance.presentDays +
        attendance.absentDays +
        attendance.lateDays +
        attendance.leaveDays >
      attendance.workingDays
    ) {
      this.invalidate(
        "attendanceSummary.workingDays",
        "Attendance status totals cannot exceed working days"
      );
    }

    attendance.attendancePercentage =
      attendance.workingDays >
      0
        ? roundNumber(
            (
              (
                attendance.presentDays +
                attendance.lateDays
              ) /
              attendance.workingDays
            ) *
              100,
            2
          )
        : 0;

    if (
      attendance.periodStart &&
      attendance.periodEnd &&
      attendance.periodEnd <
        attendance.periodStart
    ) {
      this.invalidate(
        "attendanceSummary.periodEnd",
        "Attendance period end cannot be before the start"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Ranking Visibility Rules
    |--------------------------------------------------------------------------
    */

    if (
      !this.resultRules
        .rankingEnabled
    ) {
      this.resultRules
        .showClassPosition =
        false;

      this.resultRules
        .showSectionPosition =
        false;

      this.positions = {
        classPosition:
          null,

        classCandidateCount:
          0,

        sectionPosition:
          null,

        sectionCandidateCount:
          0,

        calculatedAt:
          null
      };
    } else {
      if (
        !this.resultRules
          .showClassPosition
      ) {
        this.positions
          .classPosition =
          null;

        this.positions
          .classCandidateCount =
          0;
      }

      if (
        !this.resultRules
          .showSectionPosition
      ) {
        this.positions
          .sectionPosition =
          null;

        this.positions
          .sectionCandidateCount =
          0;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Workflow
    |--------------------------------------------------------------------------
    */

    if (
      this.status ===
      "generated"
    ) {
      this.generation.generatedAt =
        this.generation
          .generatedAt ||
        new Date();

      this.generation.sourceMarkCount =
        this.subjectResults.length;
    }

    if (
      this.status ===
      "under_review"
    ) {
      this.approval.submittedAt =
        this.approval
          .submittedAt ||
        new Date();

      this.approval.returnedAt =
        null;

      this.approval.returnedBy =
        null;

      this.approval.returnReason =
        "";
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
        [
          "pending",
          "incomplete",
          "withheld"
        ].includes(
          this.overallResultStatus
        )
      ) {
        this.invalidate(
          "status",
          "Pending, incomplete or withheld results cannot be approved or published"
        );
      }

      this.approval.approvedAt =
        this.approval
          .approvedAt ||
        new Date();

      this.approval.reviewedAt =
        this.approval
          .reviewedAt ||
        this.approval
          .approvedAt;
    }

    if (
      this.status ===
      "published"
    ) {
      this.publication.publishedAt =
        this.publication
          .publishedAt ||
        new Date();

      this.publication.unpublishedAt =
        null;

      this.publication.unpublishedBy =
        null;
    }

    if (
      this.status ===
      "locked"
    ) {
      this.lock.isLocked =
        true;

      this.lock.lockedAt =
        this.lock
          .lockedAt ||
        new Date();
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

    if (
      this.status ===
      "archived"
    ) {
      this.archivedAt =
        this.archivedAt ||
        new Date();

      this.lock.isLocked =
        true;

      this.lock.lockedAt =
        this.lock
          .lockedAt ||
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
              "Every result revision must include a reason"
            );
          }
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Stable Result Key and Soft Delete
    |--------------------------------------------------------------------------
    */

    this.resultKey =
      buildResultKey({
        schoolId:
          this.schoolId,

        examId:
          this.examId,

        studentId:
          this.studentId
      });

    if (
      !this.resultKey
    ) {
      this.invalidate(
        "resultKey",
        "A valid exam result key could not be generated"
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

examResultSchema.virtual(
  "isPassed"
).get(
  function getIsPassed() {
    return (
      this.overallResultStatus ===
      "pass"
    );
  }
);

examResultSchema.virtual(
  "isFailed"
).get(
  function getIsFailed() {
    return (
      this.overallResultStatus ===
      "fail"
    );
  }
);

examResultSchema.virtual(
  "isComplete"
).get(
  function getIsComplete() {
    return [
      "pass",
      "fail"
    ].includes(
      this.overallResultStatus
    );
  }
);

examResultSchema.virtual(
  "isEditable"
).get(
  function getIsEditable() {
    return (
      !this.isDeleted &&
      !this.lock?.isLocked &&
      [
        "draft",
        "generated",
        "under_review"
      ].includes(
        this.status
      )
    );
  }
);

examResultSchema.virtual(
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

examResultSchema.virtual(
  "displayResult"
).get(
  function getDisplayResult() {
    const labels = {
      pending:
        "Pending",

      pass:
        "Pass",

      fail:
        "Fail",

      incomplete:
        "Incomplete",

      withheld:
        "Withheld"
    };

    return (
      labels[
        this.overallResultStatus
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

examResultSchema.methods.recalculate =
  function recalculate() {
    const calculated =
      calculateResultTotals({
        subjectResults:
          this.subjectResults,

        resultRules:
          this.resultRules
      });

    this.totals =
      calculated.totals;

    this.overallResultStatus =
      calculated
        .overallResultStatus;

    if (
      ![
        "pass",
        "fail"
      ].includes(
        this.overallResultStatus
      )
    ) {
      this.overallGrade = {
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

    return {
      totals:
        this.totals,

      overallResultStatus:
        this.overallResultStatus
    };
  };

examResultSchema.methods.canTransitionTo =
  function canTransitionTo(
    nextStatus
  ) {
    if (
      !EXAM_RESULT_STATUSES.includes(
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

examResultSchema.methods.applyOverallGrade =
  function applyOverallGrade(
    resolvedGrade,
    gradeSchemeId = null
  ) {
    if (
      !resolvedGrade ||
      ![
        "pass",
        "fail"
      ].includes(
        this.overallResultStatus
      ) ||
      this.resultRules
        ?.showGrade ===
        false
    ) {
      this.overallGrade = {
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

    this.overallGrade = {
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
        normalizeHexColor(
          resolvedGrade
            .displayColor
        ),

      resolvedAt:
        new Date()
    };

    return this;
  };

examResultSchema.methods.replaceSubjectResultsFromMarks =
  function replaceSubjectResultsFromMarks(
    studentMarks
  ) {
    this.subjectResults =
      (
        studentMarks ||
        []
      ).map(
        (
          mark,
          index
        ) =>
          mapStudentMarkToSubjectResult(
            mark,
            index
          )
      );

    this.generation.sourceMarkCount =
      this.subjectResults.length;

    this.generation.generatedAt =
      new Date();

    this.recalculate();

    return this;
  };

examResultSchema.methods.addRevisionSnapshot =
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

      previousOverallResultStatus:
        this.overallResultStatus,

      totals: {
        subjectCount:
          this.totals
            ?.subjectCount ||
          0,

        countedSubjectCount:
          this.totals
            ?.countedSubjectCount ||
          0,

        passedSubjectCount:
          this.totals
            ?.passedSubjectCount ||
          0,

        failedSubjectCount:
          this.totals
            ?.failedSubjectCount ||
          0,

        absentSubjectCount:
          this.totals
            ?.absentSubjectCount ||
          0,

        leaveSubjectCount:
          this.totals
            ?.leaveSubjectCount ||
          0,

        exemptedSubjectCount:
          this.totals
            ?.exemptedSubjectCount ||
          0,

        withheldSubjectCount:
          this.totals
            ?.withheldSubjectCount ||
          0,

        pendingSubjectCount:
          this.totals
            ?.pendingSubjectCount ||
          0,

        totalMaxMarks:
          this.totals
            ?.totalMaxMarks ||
          0,

        totalObtainedMarks:
          this.totals
            ?.totalObtainedMarks ||
          0,

        totalWeightedScore:
          this.totals
            ?.totalWeightedScore ||
          0,

        percentage:
          this.totals
            ?.percentage ||
          0,

        gradePointAverage:
          this.totals
            ?.gradePointAverage ||
          0
      },

      overallGrade: {
        gradeSchemeId:
          this.overallGrade
            ?.gradeSchemeId ||
          null,

        grade:
          this.overallGrade
            ?.grade ||
          "",

        label:
          this.overallGrade
            ?.label ||
          "",

        gradePoint:
          this.overallGrade
            ?.gradePoint ||
          0,

        remarks:
          this.overallGrade
            ?.remarks ||
          "",

        displayColor:
          this.overallGrade
            ?.displayColor ||
          "",

        resolvedAt:
          this.overallGrade
            ?.resolvedAt ||
          null
      },

      positions: {
        classPosition:
          this.positions
            ?.classPosition ||
          null,

        classCandidateCount:
          this.positions
            ?.classCandidateCount ||
          0,

        sectionPosition:
          this.positions
            ?.sectionPosition ||
          null,

        sectionCandidateCount:
          this.positions
            ?.sectionCandidateCount ||
          0,

        calculatedAt:
          this.positions
            ?.calculatedAt ||
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
| Static Ranking Helpers
|--------------------------------------------------------------------------
|
| Standard competition ranking is used:
| 1, 2, 2, 4
|
| Percentage is the primary score. Total obtained marks, failed-subject count
| and admission number provide deterministic ordering when percentages differ
| only after configured rounding.
|
*/

examResultSchema.statics.calculateRankings =
  function calculateRankings(
    resultRows
  ) {
    const rows =
      (
        resultRows ||
        []
      )
        .map(
          (
            row
          ) => {
            const data =
              row?.toObject
                ? row.toObject({
                    virtuals: true
                  })
                : row;

            return {
              id:
                data?._id ||
                data?.id,

              percentage:
                toFiniteNumber(
                  data?.totals
                    ?.percentage,
                  0
                ),

              totalObtainedMarks:
                toFiniteNumber(
                  data?.totals
                    ?.totalObtainedMarks,
                  0
                ),

              failedSubjectCount:
                toFiniteNumber(
                  data?.totals
                    ?.failedSubjectCount,
                  0
                ) +
                toFiniteNumber(
                  data?.totals
                    ?.absentSubjectCount,
                  0
                ),

              admissionNumber:
                normalizeText(
                  data
                    ?.admissionNumber
                )
            };
          }
        )
        .filter(
          (
            row
          ) =>
            row.id
        )
        .sort(
          (
            first,
            second
          ) =>
            second.percentage -
              first.percentage ||
            second
              .totalObtainedMarks -
              first
                .totalObtainedMarks ||
            first
              .failedSubjectCount -
              second
                .failedSubjectCount ||
            first
              .admissionNumber
              .localeCompare(
                second
                  .admissionNumber,
                undefined,
                {
                  numeric:
                    true,

                  sensitivity:
                    "base"
                }
              )
        );

    let previousScore =
      null;

    let previousPosition =
      0;

    return rows.map(
      (
        row,
        index
      ) => {
        const tieScore = [
          roundNumber(
            row.percentage,
            4
          ),

          roundNumber(
            row.totalObtainedMarks,
            4
          ),

          row.failedSubjectCount
        ].join(
          ":"
        );

        const position =
          tieScore ===
          previousScore
            ? previousPosition
            : index +
              1;

        previousScore =
          tieScore;

        previousPosition =
          position;

        return {
          resultId:
            row.id,

          position,

          candidateCount:
            rows.length
        };
      }
    );
  };

/*
|--------------------------------------------------------------------------
| Static Snapshot and Query Helpers
|--------------------------------------------------------------------------
*/

examResultSchema.statics.mapStudentMarkToSubjectResult =
  function staticMapStudentMarkToSubjectResult(
    studentMark,
    index = 0
  ) {
    return mapStudentMarkToSubjectResult(
      studentMark,
      index
    );
  };

examResultSchema.statics.calculateResultTotals =
  function staticCalculateResultTotals(
    values
  ) {
    return calculateResultTotals(
      values
    );
  };

examResultSchema.statics.buildResultKey =
  function staticBuildResultKey(
    values
  ) {
    return buildResultKey(
      values
    );
  };

examResultSchema.statics.getAllowedStatusTransitions =
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

examResultSchema.statics.buildActiveFilter =
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

/*
|--------------------------------------------------------------------------
| Model Export
|--------------------------------------------------------------------------
*/

const ExamResult =
  mongoose.models
    .ExamResult ||
  mongoose.model(
    "ExamResult",
    examResultSchema
  );

module.exports =
  ExamResult;

module.exports.EXAM_RESULT_STATUSES =
  EXAM_RESULT_STATUSES;

module.exports.OVERALL_RESULT_STATUSES =
  OVERALL_RESULT_STATUSES;

module.exports.SUBJECT_RESULT_STATUSES =
  SUBJECT_RESULT_STATUSES;

module.exports.RESULT_GENERATION_SOURCES =
  RESULT_GENERATION_SOURCES;

module.exports.ALLOWED_STATUS_TRANSITIONS =
  ALLOWED_STATUS_TRANSITIONS;
