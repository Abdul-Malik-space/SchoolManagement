const mongoose = require("mongoose");

const { Schema } = mongoose;

/*
|--------------------------------------------------------------------------
| Exam Constants
|--------------------------------------------------------------------------
*/

const EXAM_TYPES = [
  "monthly_test",
  "class_test",
  "mid_term",
  "final_term",
  "annual_exam",
  "practical_exam",
  "quiz",
  "assignment",
  "other"
];

const EXAM_STATUSES = [
  "draft",
  "scheduled",
  "in_progress",
  "marks_entry",
  "under_review",
  "approved",
  "published",
  "locked",
  "archived",
  "cancelled"
];

const RESULT_VISIBILITY = [
  "private",
  "staff_only",
  "published"
];

const ALLOWED_STATUS_TRANSITIONS = {
  draft: ["scheduled", "cancelled", "archived"],
  scheduled: ["draft", "in_progress", "cancelled", "archived"],
  in_progress: ["marks_entry", "cancelled"],
  marks_entry: ["under_review", "cancelled"],
  under_review: ["marks_entry", "approved", "cancelled"],
  approved: ["under_review", "published", "locked", "archived"],
  published: ["locked", "archived"],
  locked: ["published", "archived"],
  archived: [],
  cancelled: ["draft", "archived"]
};

/*
|--------------------------------------------------------------------------
| Normalization Helpers
|--------------------------------------------------------------------------
*/

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ");
};

const normalizeCode = (value) => {
  return normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
};

const normalizeSectionName = (value) => {
  return normalizeText(value);
};

const buildSectionKey = (value) => {
  return normalizeSectionName(value).toLowerCase();
};

const normalizeUniqueSections = (sections) => {
  if (!Array.isArray(sections)) {
    return [];
  }

  const used = new Set();

  return sections
    .map(normalizeSectionName)
    .filter(Boolean)
    .filter((section) => {
      const key = buildSectionKey(section);

      if (used.has(key)) {
        return false;
      }

      used.add(key);
      return true;
    });
};

const roundNumber = (value, precision = 2) => {
  const number = Number(value || 0);
  const multiplier = 10 ** precision;

  return (
    Math.round((number + Number.EPSILON) * multiplier) /
    multiplier
  );
};

const objectIdKey = (value) => {
  if (!value) {
    return "";
  }

  return String(value?._id || value);
};

/*
|--------------------------------------------------------------------------
| Applied Class Schema
|--------------------------------------------------------------------------
*/

const examClassSchema = new Schema(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Exam class is required"]
    },

    allSections: {
      type: Boolean,
      default: true
    },

    sections: {
      type: [String],
      default: []
    },

    displayOrder: {
      type: Number,
      default: 0,
      min: [0, "Class display order cannot be negative"]
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Subject Assessment Rule Schema
|--------------------------------------------------------------------------
*/

const examSubjectRuleSchema = new Schema(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Subject rule class is required"]
    },

    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Exam subject is required"]
    },

    assignedTeacherIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Teacher"
        }
      ],
      default: []
    },

    maxMarks: {
      type: Number,
      required: [true, "Maximum marks are required"],
      min: [1, "Maximum marks must be at least 1"],
      max: [10000, "Maximum marks cannot exceed 10000"]
    },

    passingMarks: {
      type: Number,
      required: [true, "Passing marks are required"],
      min: [0, "Passing marks cannot be negative"]
    },

    theoryMarks: {
      type: Number,
      default: 0,
      min: [0, "Theory marks cannot be negative"]
    },

    practicalMarks: {
      type: Number,
      default: 0,
      min: [0, "Practical marks cannot be negative"]
    },

    internalMarks: {
      type: Number,
      default: 0,
      min: [0, "Internal marks cannot be negative"]
    },

    weightagePercentage: {
      type: Number,
      default: 100,
      min: [0, "Subject weightage cannot be negative"],
      max: [100, "Subject weightage cannot exceed 100 percent"]
    },

    isOptional: {
      type: Boolean,
      default: false
    },

    requiresPractical: {
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
      min: [0, "Grace marks limit cannot be negative"]
    },

    displayOrder: {
      type: Number,
      default: 0,
      min: [0, "Subject display order cannot be negative"]
    },

    instructions: {
      type: String,
      trim: true,
      maxlength: [
        1000,
        "Subject instructions cannot exceed 1000 characters"
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
| Result Settings Schema
|--------------------------------------------------------------------------
*/

const resultSettingsSchema = new Schema(
  {
    gradeSchemeId: {
      type: Schema.Types.ObjectId,
      ref: "GradeScheme",
      default: null
    },

    visibility: {
      type: String,
      enum: {
        values: RESULT_VISIBILITY,
        message: "{VALUE} is not a valid result visibility option"
      },
      default: "private"
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

    showSubjectPosition: {
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

    failIfAnyRequiredSubjectFailed: {
      type: Boolean,
      default: true
    },

    minimumOverallPercentage: {
      type: Number,
      default: 0,
      min: [0, "Minimum overall percentage cannot be negative"],
      max: [100, "Minimum overall percentage cannot exceed 100"]
    },

    percentagePrecision: {
      type: Number,
      enum: {
        values: [0, 1, 2],
        message: "Percentage precision must be 0, 1 or 2"
      },
      default: 2
    },

    publishReportCards: {
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
| Workflow Metadata Schemas
|--------------------------------------------------------------------------
*/

const approvalSchema = new Schema(
  {
    submittedAt: {
      type: Date,
      default: null
    },

    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    approvedAt: {
      type: Date,
      default: null
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [
        1000,
        "Rejection reason cannot exceed 1000 characters"
      ],
      default: ""
    }
  },
  {
    _id: false
  }
);

const publicationSchema = new Schema(
  {
    scheduledFor: {
      type: Date,
      default: null
    },

    publishedAt: {
      type: Date,
      default: null
    },

    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    unpublishedAt: {
      type: Date,
      default: null
    },

    unpublishedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    _id: false
  }
);

const lockSchema = new Schema(
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
      type: Schema.Types.ObjectId,
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
| Exam Schema
|--------------------------------------------------------------------------
*/

const examSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true
    },

    examCode: {
      type: String,
      required: [true, "Exam code is required"],
      trim: true,
      minlength: [
        2,
        "Exam code must contain at least 2 characters"
      ],
      maxlength: [
        50,
        "Exam code cannot exceed 50 characters"
      ]
    },

    examName: {
      type: String,
      required: [true, "Exam name is required"],
      trim: true,
      minlength: [
        3,
        "Exam name must contain at least 3 characters"
      ],
      maxlength: [
        160,
        "Exam name cannot exceed 160 characters"
      ]
    },

    examType: {
      type: String,
      enum: {
        values: EXAM_TYPES,
        message: "{VALUE} is not a valid exam type"
      },
      required: [true, "Exam type is required"],
      default: "monthly_test",
      index: true
    },

    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
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

    description: {
      type: String,
      trim: true,
      maxlength: [
        3000,
        "Exam description cannot exceed 3000 characters"
      ],
      default: ""
    },

    instructions: {
      type: String,
      trim: true,
      maxlength: [
        5000,
        "Exam instructions cannot exceed 5000 characters"
      ],
      default: ""
    },

    startDate: {
      type: Date,
      required: [true, "Exam start date is required"],
      index: true
    },

    endDate: {
      type: Date,
      required: [true, "Exam end date is required"],
      index: true
    },

    marksEntryOpensAt: {
      type: Date,
      default: null
    },

    marksEntryClosesAt: {
      type: Date,
      default: null
    },

    resultPublicationDate: {
      type: Date,
      default: null
    },

    applicableClasses: {
      type: [examClassSchema],
      required: [true, "At least one class is required"],
      validate: {
        validator(classes) {
          return (
            Array.isArray(classes) &&
            classes.length > 0
          );
        },
        message:
          "At least one class must be assigned to the exam"
      }
    },

    subjectRules: {
      type: [examSubjectRuleSchema],
      default: []
    },

    resultSettings: {
      type: resultSettingsSchema,
      default: () => ({})
    },

    status: {
      type: String,
      enum: {
        values: EXAM_STATUSES,
        message: "{VALUE} is not a valid exam status"
      },
      default: "draft",
      index: true
    },

    approval: {
      type: approvalSchema,
      default: () => ({})
    },

    publication: {
      type: publicationSchema,
      default: () => ({})
    },

    lock: {
      type: lockSchema,
      default: () => ({})
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
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    archivedAt: {
      type: Date,
      default: null
    },

    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    versionNumber: {
      type: Number,
      default: 1,
      min: [
        1,
        "Exam version number must be at least 1"
      ]
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Exam creator is required"]
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
    optimisticConcurrency: true,

    toJSON: {
      virtuals: true,
      transform(document, returnedObject) {
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

examSchema.index(
  {
    schoolId: 1,
    examCode: 1,
    academicYear: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false
    },
    name:
      "unique_active_exam_code_per_school_year"
  }
);

examSchema.index({
  schoolId: 1,
  academicYear: 1,
  status: 1,
  isDeleted: 1,
  startDate: -1
});

examSchema.index({
  schoolId: 1,
  "applicableClasses.classId": 1,
  academicYear: 1,
  status: 1,
  isDeleted: 1
});

examSchema.index({
  schoolId: 1,
  "subjectRules.subjectId": 1,
  status: 1,
  isDeleted: 1
});

examSchema.index({
  schoolId: 1,
  resultPublicationDate: 1,
  status: 1,
  isDeleted: 1
});

examSchema.index({
  schoolId: 1,
  createdAt: -1,
  isDeleted: 1
});

/*
|--------------------------------------------------------------------------
| Validation and Normalization
|--------------------------------------------------------------------------
*/

examSchema.pre(
  "validate",
  function validateExam() {
    this.examCode =
      normalizeCode(this.examCode);

    this.examName =
      normalizeText(this.examName);

    this.academicYear =
      normalizeText(this.academicYear);

    this.academicTerm =
      normalizeText(this.academicTerm);

    this.description =
      normalizeText(this.description);

    this.instructions =
      normalizeText(this.instructions);

    this.cancellationReason =
      normalizeText(this.cancellationReason);

    if (!this.examCode) {
      this.invalidate(
        "examCode",
        "Exam code must contain letters or numbers"
      );
    }

    if (
      this.startDate &&
      this.endDate &&
      this.endDate < this.startDate
    ) {
      this.invalidate(
        "endDate",
        "Exam end date cannot be before the start date"
      );
    }

    if (
      this.marksEntryOpensAt &&
      this.marksEntryClosesAt &&
      this.marksEntryClosesAt <
        this.marksEntryOpensAt
    ) {
      this.invalidate(
        "marksEntryClosesAt",
        "Marks entry closing time cannot be before the opening time"
      );
    }

    if (
      this.resultPublicationDate &&
      this.endDate &&
      this.resultPublicationDate <
        this.endDate
    ) {
      this.invalidate(
        "resultPublicationDate",
        "Result publication date cannot be before the exam end date"
      );
    }

    const classIds = new Set();

    if (
      Array.isArray(
        this.applicableClasses
      )
    ) {
      this.applicableClasses.forEach(
        (
          classItem,
          classIndex
        ) => {
          const classKey =
            objectIdKey(
              classItem.classId
            );

          if (
            classKey &&
            classIds.has(classKey)
          ) {
            this.invalidate(
              `applicableClasses.${classIndex}.classId`,
              "The same class cannot be assigned to an exam more than once"
            );
          }

          if (classKey) {
            classIds.add(classKey);
          }

          classItem.sections =
            normalizeUniqueSections(
              classItem.sections
            );

          if (classItem.allSections) {
            classItem.sections = [];
          } else if (
            classItem.sections.length ===
            0
          ) {
            this.invalidate(
              `applicableClasses.${classIndex}.sections`,
              "At least one section is required when all sections are not selected"
            );
          }
        }
      );

      this.applicableClasses.sort(
        (first, second) =>
          Number(
            first.displayOrder || 0
          ) -
          Number(
            second.displayOrder || 0
          )
      );
    }

    const subjectRuleKeys =
      new Set();

    if (
      Array.isArray(
        this.subjectRules
      )
    ) {
      this.subjectRules.forEach(
        (
          rule,
          ruleIndex
        ) => {
          const classKey =
            objectIdKey(
              rule.classId
            );

          const subjectKey =
            objectIdKey(
              rule.subjectId
            );

          const combinedKey =
            `${classKey}:${subjectKey}`;

          if (
            classKey &&
            !classIds.has(classKey)
          ) {
            this.invalidate(
              `subjectRules.${ruleIndex}.classId`,
              "Subject rule class must exist in the exam's applicable classes"
            );
          }

          if (
            classKey &&
            subjectKey &&
            subjectRuleKeys.has(
              combinedKey
            )
          ) {
            this.invalidate(
              `subjectRules.${ruleIndex}.subjectId`,
              "The same subject cannot be assigned twice for the same class"
            );
          }

          if (
            classKey &&
            subjectKey
          ) {
            subjectRuleKeys.add(
              combinedKey
            );
          }

          rule.instructions =
            normalizeText(
              rule.instructions
            );

          rule.maxMarks =
            roundNumber(
              rule.maxMarks,
              2
            );

          rule.passingMarks =
            roundNumber(
              rule.passingMarks,
              2
            );

          rule.theoryMarks =
            roundNumber(
              rule.theoryMarks,
              2
            );

          rule.practicalMarks =
            roundNumber(
              rule.practicalMarks,
              2
            );

          rule.internalMarks =
            roundNumber(
              rule.internalMarks,
              2
            );

          rule.weightagePercentage =
            roundNumber(
              rule.weightagePercentage,
              2
            );

          rule.graceMarksLimit =
            roundNumber(
              rule.graceMarksLimit,
              2
            );

          if (
            Number(
              rule.passingMarks
            ) >
            Number(
              rule.maxMarks
            )
          ) {
            this.invalidate(
              `subjectRules.${ruleIndex}.passingMarks`,
              "Passing marks cannot exceed maximum marks"
            );
          }

          const componentTotal =
            roundNumber(
              Number(
                rule.theoryMarks || 0
              ) +
                Number(
                  rule.practicalMarks ||
                    0
                ) +
                Number(
                  rule.internalMarks ||
                    0
                ),
              2
            );

          if (
            componentTotal > 0 &&
            componentTotal !==
              Number(
                rule.maxMarks
              )
          ) {
            this.invalidate(
              `subjectRules.${ruleIndex}.maxMarks`,
              "Theory, practical and internal marks must total the maximum marks"
            );
          }

          if (
            rule.requiresPractical &&
            Number(
              rule.practicalMarks ||
                0
            ) <= 0
          ) {
            this.invalidate(
              `subjectRules.${ruleIndex}.practicalMarks`,
              "Practical marks are required when practical assessment is enabled"
            );
          }

          if (!rule.allowGraceMarks) {
            rule.graceMarksLimit = 0;
          }

          if (
            Number(
              rule.graceMarksLimit
            ) >
            Number(
              rule.passingMarks
            )
          ) {
            this.invalidate(
              `subjectRules.${ruleIndex}.graceMarksLimit`,
              "Grace marks limit cannot exceed passing marks"
            );
          }

          rule.assignedTeacherIds =
            Array.from(
              new Set(
                (
                  rule
                    .assignedTeacherIds ||
                  []
                )
                  .map(objectIdKey)
                  .filter(Boolean)
              )
            );
        }
      );

      this.subjectRules.sort(
        (first, second) =>
          Number(
            first.displayOrder || 0
          ) -
          Number(
            second.displayOrder || 0
          )
      );
    }

    if (!this.resultSettings) {
      this.resultSettings = {};
    }

    if (
      !this.resultSettings
        .rankingEnabled
    ) {
      this.resultSettings
        .showClassPosition =
        false;

      this.resultSettings
        .showSectionPosition =
        false;

      this.resultSettings
        .showSubjectPosition =
        false;
    }

    if (
      this.status ===
      "published"
    ) {
      this.resultSettings.visibility =
        "published";

      this.publication =
        this.publication ||
        {};

      if (
        !this.publication
          .publishedAt
      ) {
        this.publication.publishedAt =
          new Date();
      }
    }

    if (
      this.status ===
        "approved" &&
      !this.approval?.approvedAt
    ) {
      this.approval =
        this.approval ||
        {};

      this.approval.approvedAt =
        new Date();
    }

    if (
      this.status ===
        "under_review" &&
      !this.approval?.submittedAt
    ) {
      this.approval =
        this.approval ||
        {};

      this.approval.submittedAt =
        new Date();
    }

    if (
      this.status ===
        "locked" ||
      this.status ===
        "archived"
    ) {
      this.lock =
        this.lock ||
        {};

      this.lock.isLocked = true;

      if (!this.lock.lockedAt) {
        this.lock.lockedAt =
          new Date();
      }
    }

    if (
      this.lock?.isLocked &&
      !this.lock.lockedAt
    ) {
      this.lock.lockedAt =
        new Date();
    }

    if (
      this.status ===
      "archived"
    ) {
      this.isActive = false;

      if (!this.archivedAt) {
        this.archivedAt =
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
          "Cancellation reason is required for a cancelled exam"
        );
      }

      if (!this.cancelledAt) {
        this.cancelledAt =
          new Date();
      }

      this.isActive = false;
    }

    if (this.isDeleted) {
      this.isActive = false;

      if (!this.deletedAt) {
        this.deletedAt =
          new Date();
      }
    } else {
      this.deletedAt = null;
      this.deletedBy = null;
    }
  }
);

/*
|--------------------------------------------------------------------------
| Virtual Fields
|--------------------------------------------------------------------------
*/

examSchema.virtual(
  "durationDays"
).get(
  function getDurationDays() {
    if (
      !this.startDate ||
      !this.endDate
    ) {
      return 0;
    }

    const end =
      new Date(this.endDate);

    const start =
      new Date(this.startDate);

    end.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);

    return (
      Math.floor(
        (end - start) /
          86400000
      ) + 1
    );
  }
);

examSchema.virtual(
  "classCount"
).get(
  function getClassCount() {
    return Array.isArray(
      this.applicableClasses
    )
      ? this.applicableClasses
          .length
      : 0;
  }
);

examSchema.virtual(
  "subjectRuleCount"
).get(
  function getSubjectRuleCount() {
    return Array.isArray(
      this.subjectRules
    )
      ? this.subjectRules
          .length
      : 0;
  }
);

examSchema.virtual(
  "isPublished"
).get(
  function getIsPublished() {
    return (
      this.status ===
        "published" &&
      this.resultSettings
        ?.visibility ===
        "published" &&
      !this.isDeleted
    );
  }
);

examSchema.virtual(
  "isEditable"
).get(
  function getIsEditable() {
    return (
      !this.isDeleted &&
      !this.lock?.isLocked &&
      ![
        "locked",
        "archived"
      ].includes(
        this.status
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| Instance Methods
|--------------------------------------------------------------------------
*/

examSchema.methods.canTransitionTo =
  function canTransitionTo(
    nextStatus
  ) {
    if (
      !EXAM_STATUSES.includes(
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

examSchema.methods.getApplicableSections =
  function getApplicableSections(
    classId
  ) {
    const targetClass =
      (
        this.applicableClasses ||
        []
      ).find(
        (item) =>
          objectIdKey(
            item.classId
          ) ===
          objectIdKey(classId)
      );

    if (!targetClass) {
      return null;
    }

    return {
      allSections:
        Boolean(
          targetClass.allSections
        ),

      sections:
        targetClass.allSections
          ? []
          : [
              ...(
                targetClass.sections ||
                []
              )
            ]
    };
  };

/*
|--------------------------------------------------------------------------
| Static Helpers
|--------------------------------------------------------------------------
*/

examSchema.statics.getAllowedStatusTransitions =
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

examSchema.statics.buildActiveFilter =
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

const Exam = mongoose.model(
  "Exam",
  examSchema
);

module.exports = Exam;

module.exports.EXAM_TYPES =
  EXAM_TYPES;

module.exports.EXAM_STATUSES =
  EXAM_STATUSES;

module.exports.RESULT_VISIBILITY =
  RESULT_VISIBILITY;

module.exports.ALLOWED_STATUS_TRANSITIONS =
  ALLOWED_STATUS_TRANSITIONS;
