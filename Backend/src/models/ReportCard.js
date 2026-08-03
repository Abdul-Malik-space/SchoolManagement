const crypto = require("crypto");
const mongoose = require("mongoose");

const {
  Schema
} = mongoose;

/*
|--------------------------------------------------------------------------
| Report Card Constants
|--------------------------------------------------------------------------
*/

const REPORT_CARD_STATUSES = [
  "draft",
  "generated",
  "issued",
  "published",
  "revoked",
  "archived"
];

const REPORT_CARD_VISIBILITY = [
  "private",
  "student_parent",
  "public_verification"
];

const REPORT_CARD_PAPER_SIZES = [
  "A4",
  "LETTER",
  "LEGAL"
];

const REPORT_CARD_ORIENTATIONS = [
  "portrait",
  "landscape"
];

const REPORT_CARD_STORAGE_PROVIDERS = [
  "local",
  "cloudinary",
  "s3",
  "other"
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

const SOURCE_RESULT_STATUSES = [
  "draft",
  "generated",
  "under_review",
  "approved",
  "published",
  "locked",
  "archived"
];

const ALLOWED_STATUS_TRANSITIONS = {
  draft: [
    "generated",
    "archived"
  ],

  generated: [
    "draft",
    "issued",
    "archived"
  ],

  issued: [
    "published",
    "revoked",
    "archived"
  ],

  published: [
    "issued",
    "revoked",
    "archived"
  ],

  revoked: [
    "archived"
  ],

  archived: []
};

const IMMUTABLE_STATUSES = [
  "issued",
  "published",
  "revoked",
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

const nearlyEqual = (
  first,
  second,
  tolerance = 0.01
) => {
  return (
    Math.abs(
      Number(first) -
      Number(second)
    ) <=
    tolerance
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

const normalizeOptionalUrl = (
  value
) => {
  const url =
    normalizeText(
      value
    );

  return isSafeWebUrl(
    url
  )
    ? url
    : "";
};

const generateVerificationCode = (
  length = 16
) => {
  const normalizedLength =
    Math.max(
      10,
      Math.min(
        32,
        Number(
          length ||
          16
        )
      )
    );

  return crypto
    .randomBytes(
      Math.ceil(
        normalizedLength *
        0.75
      )
    )
    .toString(
      "base64url"
    )
    .replace(
      /[^A-Za-z0-9]/g,
      ""
    )
    .slice(
      0,
      normalizedLength
    )
    .toUpperCase();
};

const stableNormalize = (
  value
) => {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return value;
  }

  if (
    value instanceof
    Date
  ) {
    return value.toISOString();
  }

  if (
    typeof value ===
      "object" &&
    value._bsontype ===
      "ObjectId"
  ) {
    return String(
      value
    );
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value.map(
      stableNormalize
    );
  }

  if (
    typeof value ===
    "object"
  ) {
    return Object.keys(
      value
    )
      .sort()
      .reduce(
        (
          accumulator,
          key
        ) => {
          if (
            key ===
              "__v" ||
            key ===
              "_id"
          ) {
            return accumulator;
          }

          accumulator[
            key
          ] =
            stableNormalize(
              value[
                key
              ]
            );

          return accumulator;
        },
        {}
      );
  }

  return value;
};

const computeSha256 = (
  value
) => {
  return crypto
    .createHash(
      "sha256"
    )
    .update(
      typeof value ===
        "string"
        ? value
        : JSON.stringify(
            stableNormalize(
              value
            )
          )
    )
    .digest(
      "hex"
    );
};

const buildReportCardKey = ({
  schoolId,
  examResultId,
  versionNumber
}) => {
  return [
    objectIdKey(
      schoolId
    ),
    objectIdKey(
      examResultId
    ),
    Number(
      versionNumber ||
      1
    )
  ]
    .filter(
      Boolean
    )
    .join(
      ":"
    );
};

const buildReportCardNumber = ({
  schoolCode,
  academicYear,
  examCode,
  admissionNumber,
  versionNumber,
  studentId
}) => {
  const parts = [
    normalizeCode(
      schoolCode ||
      "SCHOOL"
    ),

    normalizeCode(
      academicYear ||
      "YEAR"
    ),

    normalizeCode(
      examCode ||
      "EXAM"
    ),

    normalizeCode(
      admissionNumber ||
      objectIdKey(
        studentId
      ).slice(
        -8
      ) ||
      "STUDENT"
    ),

    `V${Math.max(
      1,
      Number(
        versionNumber ||
        1
      )
    )}`
  ];

  return normalizeCode(
    `RC-${parts.join(
      "-"
    )}`
  );
};

const buildVerificationPayload = ({
  verificationBaseUrl,
  verificationCode
}) => {
  const baseUrl =
    normalizeText(
      verificationBaseUrl
    ).replace(
      /\/+$/g,
      ""
    );

  if (
    baseUrl &&
    isSafeWebUrl(
      baseUrl
    )
  ) {
    return `${baseUrl}/${encodeURIComponent(
      verificationCode
    )}`;
  }

  return verificationCode;
};

const getPlainObject = (
  value
) => {
  if (
    value?.toObject
  ) {
    return value.toObject({
      virtuals: true
    });
  }

  return value ||
    {};
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
| School Snapshot
|--------------------------------------------------------------------------
*/

const schoolSnapshotSchema =
  new Schema(
    {
      schoolName: {
        type: String,

        required: [
          true,
          "School name snapshot is required"
        ],

        trim: true,

        maxlength: [
          200,
          "School name cannot exceed 200 characters"
        ]
      },

      schoolCode: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "School code cannot exceed 80 characters"
        ],

        default: ""
      },

      registrationNumber: {
        type: String,

        trim: true,

        maxlength: [
          120,
          "Registration number cannot exceed 120 characters"
        ],

        default: ""
      },

      logoUrl: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "School logo URL cannot exceed 2000 characters"
        ],

        default: ""
      },

      address: {
        type: String,

        trim: true,

        maxlength: [
          500,
          "School address cannot exceed 500 characters"
        ],

        default: ""
      },

      phone: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "School phone cannot exceed 80 characters"
        ],

        default: ""
      },

      email: {
        type: String,

        trim: true,

        lowercase: true,

        maxlength: [
          180,
          "School email cannot exceed 180 characters"
        ],

        default: ""
      },

      website: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "School website cannot exceed 2000 characters"
        ],

        default: ""
      },

      principalName: {
        type: String,

        trim: true,

        maxlength: [
          180,
          "Principal name cannot exceed 180 characters"
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
| Student Snapshot
|--------------------------------------------------------------------------
*/

const studentSnapshotSchema =
  new Schema(
    {
      studentName: {
        type: String,

        required: [
          true,
          "Student name snapshot is required"
        ],

        trim: true,

        maxlength: [
          180,
          "Student name cannot exceed 180 characters"
        ]
      },

      fatherName: {
        type: String,

        trim: true,

        maxlength: [
          180,
          "Father name cannot exceed 180 characters"
        ],

        default: ""
      },

      guardianName: {
        type: String,

        trim: true,

        maxlength: [
          180,
          "Guardian name cannot exceed 180 characters"
        ],

        default: ""
      },

      admissionNumber: {
        type: String,

        required: [
          true,
          "Admission number snapshot is required"
        ],

        trim: true,

        maxlength: [
          80,
          "Admission number cannot exceed 80 characters"
        ]
      },

      rollNumber: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Roll number cannot exceed 80 characters"
        ],

        default: ""
      },

      className: {
        type: String,

        required: [
          true,
          "Class name snapshot is required"
        ],

        trim: true,

        maxlength: [
          120,
          "Class name cannot exceed 120 characters"
        ]
      },

      sectionName: {
        type: String,

        required: [
          true,
          "Section name snapshot is required"
        ],

        trim: true,

        maxlength: [
          100,
          "Section name cannot exceed 100 characters"
        ]
      },

      photoUrl: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "Student photo URL cannot exceed 2000 characters"
        ],

        default: ""
      },

      dateOfBirth: {
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
| Exam Snapshot
|--------------------------------------------------------------------------
*/

const examSnapshotSchema =
  new Schema(
    {
      examCode: {
        type: String,

        required: [
          true,
          "Exam code snapshot is required"
        ],

        trim: true,

        maxlength: [
          80,
          "Exam code cannot exceed 80 characters"
        ]
      },

      examName: {
        type: String,

        required: [
          true,
          "Exam name snapshot is required"
        ],

        trim: true,

        maxlength: [
          180,
          "Exam name cannot exceed 180 characters"
        ]
      },

      examType: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Exam type cannot exceed 80 characters"
        ],

        default: ""
      },

      academicYear: {
        type: String,

        required: [
          true,
          "Academic year snapshot is required"
        ],

        trim: true,

        maxlength: [
          30,
          "Academic year cannot exceed 30 characters"
        ]
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

      startDate: {
        type: Date,
        default: null
      },

      endDate: {
        type: Date,
        default: null
      },

      resultPublicationDate: {
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
| Subject Result Snapshot
|--------------------------------------------------------------------------
*/

const subjectResultSnapshotSchema =
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
          "Subject reference is required"
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

        required: [
          true,
          "Subject name snapshot is required"
        ],

        trim: true,

        maxlength: [
          180,
          "Subject name cannot exceed 180 characters"
        ]
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
          "Maximum marks are required"
        ],

        min: [
          0,
          "Maximum marks cannot be negative"
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
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Totals Snapshot
|--------------------------------------------------------------------------
*/

const totalsSnapshotSchema =
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
| Position Snapshot
|--------------------------------------------------------------------------
*/

const positionSnapshotSchema =
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
| Attendance Snapshot
|--------------------------------------------------------------------------
*/

const attendanceSnapshotSchema =
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
| Signature Snapshot
|--------------------------------------------------------------------------
*/

const signatureSnapshotSchema =
  new Schema(
    {
      role: {
        type: String,

        required: [
          true,
          "Signature role is required"
        ],

        trim: true,

        maxlength: [
          80,
          "Signature role cannot exceed 80 characters"
        ]
      },

      name: {
        type: String,

        required: [
          true,
          "Signatory name is required"
        ],

        trim: true,

        maxlength: [
          180,
          "Signatory name cannot exceed 180 characters"
        ]
      },

      designation: {
        type: String,

        trim: true,

        maxlength: [
          120,
          "Signatory designation cannot exceed 120 characters"
        ],

        default: ""
      },

      staffId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "Staff",

        default: null
      },

      userId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      signatureUrl: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "Signature URL cannot exceed 2000 characters"
        ],

        default: ""
      },

      signedAt: {
        type: Date,
        default: null
      },

      displayOrder: {
        type: Number,

        default: 0,

        min: [
          0,
          "Signature display order cannot be negative"
        ]
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Layout Snapshot
|--------------------------------------------------------------------------
*/

const layoutSnapshotSchema =
  new Schema(
    {
      templateCode: {
        type: String,

        trim: true,

        maxlength: [
          80,
          "Template code cannot exceed 80 characters"
        ],

        default:
          "STANDARD_REPORT_CARD"
      },

      templateVersion: {
        type: Number,

        default: 1,

        min: [
          1,
          "Template version must be at least 1"
        ]
      },

      paperSize: {
        type: String,

        enum: {
          values:
            REPORT_CARD_PAPER_SIZES,

          message:
            "{VALUE} is not a valid report card paper size"
        },

        default:
          "A4"
      },

      orientation: {
        type: String,

        enum: {
          values:
            REPORT_CARD_ORIENTATIONS,

          message:
            "{VALUE} is not a valid report card orientation"
        },

        default:
          "portrait"
      },

      themeColor: {
        type: String,

        trim: true,

        maxlength: [
          7,
          "Theme color must be a valid hex color"
        ],

        default:
          "#0F172A"
      },

      accentColor: {
        type: String,

        trim: true,

        maxlength: [
          7,
          "Accent color must be a valid hex color"
        ],

        default:
          "#2563EB"
      },

      watermarkText: {
        type: String,

        trim: true,

        maxlength: [
          120,
          "Watermark text cannot exceed 120 characters"
        ],

        default: ""
      },

      showSchoolLogo: {
        type: Boolean,
        default: true
      },

      showStudentPhoto: {
        type: Boolean,
        default: true
      },

      showQRCode: {
        type: Boolean,
        default: true
      },

      showAttendance: {
        type: Boolean,
        default: true
      },

      showPositions: {
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

      showTeacherRemarks: {
        type: Boolean,
        default: true
      },

      showPrincipalRemarks: {
        type: Boolean,
        default: true
      },

      showSignatures: {
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
| Access Policy
|--------------------------------------------------------------------------
*/

const accessPolicySchema =
  new Schema(
    {
      visibility: {
        type: String,

        enum: {
          values:
            REPORT_CARD_VISIBILITY,

          message:
            "{VALUE} is not a valid report card visibility"
        },

        default:
          "private"
      },

      allowStudentView: {
        type: Boolean,
        default: true
      },

      allowParentView: {
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
      },

      allowPublicVerification: {
        type: Boolean,
        default: false
      },

      showDetailedMarksOnPublicVerification: {
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
| Generated Document Metadata
|--------------------------------------------------------------------------
*/

const documentMetadataSchema =
  new Schema(
    {
      fileName: {
        type: String,

        trim: true,

        maxlength: [
          260,
          "Report card file name cannot exceed 260 characters"
        ],

        default: ""
      },

      mimeType: {
        type: String,

        trim: true,

        maxlength: [
          120,
          "Report card MIME type cannot exceed 120 characters"
        ],

        default:
          "application/pdf"
      },

      storageProvider: {
        type: String,

        enum: {
          values:
            REPORT_CARD_STORAGE_PROVIDERS,

          message:
            "{VALUE} is not a valid report card storage provider"
        },

        default:
          "other"
      },

      publicId: {
        type: String,

        trim: true,

        maxlength: [
          500,
          "Report card public ID cannot exceed 500 characters"
        ],

        default: ""
      },

      url: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "Report card URL cannot exceed 2000 characters"
        ],

        default: ""
      },

      sizeBytes: {
        type: Number,

        default: 0,

        min: [
          0,
          "Report card file size cannot be negative"
        ]
      },

      sha256: {
        type: String,

        trim: true,

        lowercase: true,

        maxlength: [
          64,
          "Document SHA-256 checksum cannot exceed 64 characters"
        ],

        default: ""
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
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Verification Metadata
|--------------------------------------------------------------------------
*/

const verificationSchema =
  new Schema(
    {
      verificationCode: {
        type: String,

        required: true,

        trim: true,

        uppercase: true,

        minlength: [
          10,
          "Verification code must contain at least 10 characters"
        ],

        maxlength: [
          64,
          "Verification code cannot exceed 64 characters"
        ]
      },

      verificationPayload: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "Verification payload cannot exceed 2000 characters"
        ],

        default: ""
      },

      contentHash: {
        type: String,

        required: true,

        trim: true,

        lowercase: true,

        minlength: [
          64,
          "Content hash must contain 64 characters"
        ],

        maxlength: [
          64,
          "Content hash must contain 64 characters"
        ]
      },

      verificationCount: {
        type: Number,

        default: 0,

        min: [
          0,
          "Verification count cannot be negative"
        ]
      },

      lastVerifiedAt: {
        type: Date,
        default: null
      },

      expiresAt: {
        type: Date,
        default: null
      },

      revokedAt: {
        type: Date,
        default: null
      },

      revokedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      revocationReason: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Revocation reason cannot exceed 1000 characters"
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
| Publication and Issue Metadata
|--------------------------------------------------------------------------
*/

const issueSchema =
  new Schema(
    {
      issuedAt: {
        type: Date,
        default: null
      },

      issuedBy: {
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
| Revision History
|--------------------------------------------------------------------------
*/

const revisionHistorySchema =
  new Schema(
    {
      versionNumber: {
        type: Number,

        required: true,

        min: [
          1,
          "Previous version number must be at least 1"
        ]
      },

      reportCardNumber: {
        type: String,

        required: true,

        trim: true,

        maxlength: [
          240,
          "Previous report card number cannot exceed 240 characters"
        ]
      },

      previousStatus: {
        type: String,

        enum: {
          values:
            REPORT_CARD_STATUSES,

          message:
            "{VALUE} is not a valid previous report card status"
        },

        required: true
      },

      contentHash: {
        type: String,

        required: true,

        trim: true,

        lowercase: true,

        minlength: 64,

        maxlength: 64
      },

      reason: {
        type: String,

        required: [
          true,
          "Revision reason is required"
        ],

        trim: true,

        maxlength: [
          1000,
          "Revision reason cannot exceed 1000 characters"
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
| Snapshot Container
|--------------------------------------------------------------------------
*/

const reportCardSnapshotSchema =
  new Schema(
    {
      school: {
        type:
          schoolSnapshotSchema,

        required: [
          true,
          "School snapshot is required"
        ]
      },

      student: {
        type:
          studentSnapshotSchema,

        required: [
          true,
          "Student snapshot is required"
        ]
      },

      exam: {
        type:
          examSnapshotSchema,

        required: [
          true,
          "Exam snapshot is required"
        ]
      },

      subjectResults: {
        type: [
          subjectResultSnapshotSchema
        ],

        default: []
      },

      totals: {
        type:
          totalsSnapshotSchema,

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
          "pending"
      },

      overallGrade: {
        type:
          gradeSnapshotSchema,

        default:
          () => ({})
      },

      positions: {
        type:
          positionSnapshotSchema,

        default:
          () => ({})
      },

      attendance: {
        type:
          attendanceSnapshotSchema,

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

      signatures: {
        type: [
          signatureSnapshotSchema
        ],

        default: []
      },

      sourceResultStatus: {
        type: String,

        enum: {
          values:
            SOURCE_RESULT_STATUSES,

          message:
            "{VALUE} is not a valid source result status"
        },

        default:
          "draft"
      },

      sourceResultRevisionNumber: {
        type: Number,

        default: 1,

        min: [
          1,
          "Source result revision number must be at least 1"
        ]
      },

      sourceResultUpdatedAt: {
        type: Date,
        default: null
      },

      capturedAt: {
        type: Date,
        default:
          Date.now
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Snapshot Calculation
|--------------------------------------------------------------------------
*/

const calculateSnapshotTotals = (
  subjectResults,
  precision = 2
) => {
  const subjects =
    Array.isArray(
      subjectResults
    )
      ? subjectResults
      : [];

  const totals = {
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

  subjects.forEach(
    (
      subject
    ) => {
      const status =
        normalizeText(
          subject.resultStatus
        ).toLowerCase();

      if (
        status ===
        "pass"
      ) {
        totals
          .passedSubjectCount +=
          1;
      }

      if (
        status ===
        "fail"
      ) {
        totals
          .failedSubjectCount +=
          1;
      }

      if (
        status ===
        "absent"
      ) {
        totals
          .absentSubjectCount +=
          1;
      }

      if (
        status ===
        "leave"
      ) {
        totals
          .leaveSubjectCount +=
          1;
      }

      if (
        status ===
        "exempted"
      ) {
        totals
          .exemptedSubjectCount +=
          1;
      }

      if (
        status ===
        "withheld"
      ) {
        totals
          .withheldSubjectCount +=
          1;
      }

      if (
        status ===
        "pending"
      ) {
        totals
          .pendingSubjectCount +=
          1;
      }

      if (
        subject.countsInTotal ===
          false ||
        status ===
          "exempted"
      ) {
        return;
      }

      totals
        .countedSubjectCount +=
        1;

      totals.totalMaxMarks =
        roundNumber(
          totals
            .totalMaxMarks +
            toFiniteNumber(
              subject.maxMarks,
              0
            ),
          2
        );

      totals
        .totalObtainedMarks =
        roundNumber(
          totals
            .totalObtainedMarks +
            toFiniteNumber(
              subject.obtainedMarks,
              0
            ),
          2
        );

      totals
        .totalWeightedScore =
        roundNumber(
          totals
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
    totals.totalMaxMarks >
    0
  ) {
    totals.percentage =
      roundNumber(
        (
          totals
            .totalObtainedMarks /
          totals
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
    totals.gradePointAverage =
      roundNumber(
        gradePointTotal /
          gradedSubjectCount,
        2
      );
  }

  return totals;
};

/*
|--------------------------------------------------------------------------
| Snapshot Mapping
|--------------------------------------------------------------------------
*/

const mapExamResultToSnapshot = (
  examResult,
  context = {}
) => {
  const result =
    getPlainObject(
      examResult
    );

  const school =
    getPlainObject(
      context.school ||
      result.schoolId
    );

  const student =
    getPlainObject(
      context.student ||
      result.studentId
    );

  const exam =
    getPlainObject(
      context.exam ||
      result.examId
    );

  const classRecord =
    getPlainObject(
      context.classRecord ||
      result.classId
    );

  const signatures =
    Array.isArray(
      context.signatures
    )
      ? context.signatures
      : [];

  return {
    school: {
      schoolName:
        normalizeText(
          school.schoolName ||
          school.name ||
          context.schoolName
        ),

      schoolCode:
        normalizeCode(
          school.schoolCode ||
          school.code ||
          context.schoolCode
        ),

      registrationNumber:
        normalizeText(
          school.registrationNumber ||
          school.registrationNo ||
          context.registrationNumber
        ),

      logoUrl:
        normalizeOptionalUrl(
          school.logoUrl ||
          school.logo ||
          context.logoUrl
        ),

      address:
        normalizeText(
          school.address ||
          context.address
        ),

      phone:
        normalizeText(
          school.phone ||
          school.contactNumber ||
          context.phone
        ),

      email:
        normalizeText(
          school.email ||
          context.email
        ).toLowerCase(),

      website:
        normalizeOptionalUrl(
          school.website ||
          context.website
        ),

      principalName:
        normalizeText(
          context.principalName ||
          school.principalName
        )
    },

    student: {
      studentName:
        normalizeText(
          result.studentName ||
          student.name ||
          context.studentName
        ),

      fatherName:
        normalizeText(
          result.fatherName ||
          student.fatherName ||
          context.fatherName
        ),

      guardianName:
        normalizeText(
          student.guardianName ||
          context.guardianName
        ),

      admissionNumber:
        normalizeCode(
          result.admissionNumber ||
          student.admissionNumber ||
          context.admissionNumber
        ),

      rollNumber:
        normalizeCode(
          result.rollNumber ||
          student.rollNumber ||
          context.rollNumber
        ),

      className:
        normalizeText(
          result.className ||
          classRecord.className ||
          classRecord.name ||
          context.className
        ),

      sectionName:
        normalizeSectionName(
          result.sectionName ||
          student.sectionName ||
          context.sectionName
        ),

      photoUrl:
        normalizeOptionalUrl(
          student.photo ||
          student.photoUrl ||
          context.photoUrl
        ),

      dateOfBirth:
        student.dateOfBirth ||
        context.dateOfBirth ||
        null
    },

    exam: {
      examCode:
        normalizeCode(
          result.examCode ||
          exam.examCode ||
          exam.code ||
          context.examCode
        ),

      examName:
        normalizeText(
          result.examName ||
          exam.examName ||
          exam.name ||
          context.examName
        ),

      examType:
        normalizeText(
          exam.examType ||
          context.examType
        ),

      academicYear:
        normalizeText(
          result.academicYear ||
          exam.academicYear ||
          context.academicYear
        ),

      academicTerm:
        normalizeText(
          result.academicTerm ||
          exam.academicTerm ||
          context.academicTerm
        ),

      startDate:
        exam.startDate ||
        context.startDate ||
        null,

      endDate:
        exam.endDate ||
        context.endDate ||
        null,

      resultPublicationDate:
        exam.resultPublicationDate ||
        context.resultPublicationDate ||
        null
    },

    subjectResults:
      (
        result.subjectResults ||
        []
      ).map(
        (
          subject,
          index
        ) => ({
          studentMarkId:
            subject.studentMarkId,

          subjectId:
            subject.subjectId,

          subjectCode:
            normalizeCode(
              subject.subjectCode
            ),

          subjectName:
            normalizeText(
              subject.subjectName
            ),

          displayOrder:
            Number(
              subject.displayOrder ??
              index
            ),

          isOptional:
            Boolean(
              subject.isOptional
            ),

          countsInTotal:
            subject.countsInTotal !==
            false,

          maxMarks:
            toFiniteNumber(
              subject.maxMarks,
              0
            ),

          passingMarks:
            toFiniteNumber(
              subject.passingMarks,
              0
            ),

          obtainedMarks:
            toFiniteNumber(
              subject.obtainedMarks,
              0
            ),

          percentage:
            toFiniteNumber(
              subject.percentage,
              0
            ),

          weightagePercentage:
            toFiniteNumber(
              subject.weightagePercentage,
              100
            ),

          weightedScore:
            toFiniteNumber(
              subject.weightedScore,
              0
            ),

          attendanceStatus:
            subject.attendanceStatus ||
            "present",

          resultStatus:
            subject.resultStatus ||
            "pending",

          grade: {
            gradeSchemeId:
              subject.grade
                ?.gradeSchemeId ||
              null,

            grade:
              normalizeText(
                subject.grade
                  ?.grade
              ).toUpperCase(),

            label:
              normalizeText(
                subject.grade
                  ?.label
              ),

            gradePoint:
              toFiniteNumber(
                subject.grade
                  ?.gradePoint,
                0
              ),

            remarks:
              normalizeText(
                subject.grade
                  ?.remarks
              ),

            displayColor:
              normalizeHexColor(
                subject.grade
                  ?.displayColor
              ),

            resolvedAt:
              subject.grade
                ?.resolvedAt ||
              null
          },

          teacherRemarks:
            normalizeText(
              subject.teacherRemarks
            ),

          principalRemarks:
            normalizeText(
              subject.principalRemarks
            )
        })
      ),

    totals: {
      ...(
        result.totals ||
        {}
      )
    },

    overallResultStatus:
      result.overallResultStatus ||
      "pending",

    overallGrade: {
      gradeSchemeId:
        result.overallGrade
          ?.gradeSchemeId ||
        null,

      grade:
        normalizeText(
          result.overallGrade
            ?.grade
        ).toUpperCase(),

      label:
        normalizeText(
          result.overallGrade
            ?.label
        ),

      gradePoint:
        toFiniteNumber(
          result.overallGrade
            ?.gradePoint,
          0
        ),

      remarks:
        normalizeText(
          result.overallGrade
            ?.remarks
        ),

      displayColor:
        normalizeHexColor(
          result.overallGrade
            ?.displayColor
        ),

      resolvedAt:
        result.overallGrade
          ?.resolvedAt ||
        null
    },

    positions: {
      ...(
        result.positions ||
        {}
      )
    },

    attendance: {
      ...(
        result.attendanceSummary ||
        {}
      )
    },

    classTeacherRemarks:
      normalizeText(
        result.classTeacherRemarks
      ),

    principalRemarks:
      normalizeText(
        result.principalRemarks
      ),

    signatures,

    sourceResultStatus:
      result.status ||
      "draft",

    sourceResultRevisionNumber:
      Number(
        result.revisionNumber ||
        1
      ),

    sourceResultUpdatedAt:
      result.updatedAt ||
      null,

    capturedAt:
      new Date()
  };
};

/*
|--------------------------------------------------------------------------
| Report Card Schema
|--------------------------------------------------------------------------
*/

const reportCardSchema =
  new Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | School, Result and Student Scope
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

      examResultId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "ExamResult",

        required: [
          true,
          "Exam result ID is required"
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

      /*
      |--------------------------------------------------------------------------
      | Report Card Identity
      |--------------------------------------------------------------------------
      */

      reportCardNumber: {
        type: String,

        required: [
          true,
          "Report card number is required"
        ],

        trim: true,

        maxlength: [
          240,
          "Report card number cannot exceed 240 characters"
        ]
      },

      reportCardKey: {
        type: String,

        required: true,

        trim: true,

        maxlength: [
          260,
          "Report card key cannot exceed 260 characters"
        ]
      },

      versionNumber: {
        type: Number,

        default: 1,

        min: [
          1,
          "Report card version number must be at least 1"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Immutable Snapshot
      |--------------------------------------------------------------------------
      */

      snapshot: {
        type:
          reportCardSnapshotSchema,

        required: [
          true,
          "Report card snapshot is required"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Presentation and Access
      |--------------------------------------------------------------------------
      */

      layout: {
        type:
          layoutSnapshotSchema,

        default:
          () => ({})
      },

      accessPolicy: {
        type:
          accessPolicySchema,

        default:
          () => ({})
      },

      document: {
        type:
          documentMetadataSchema,

        default:
          () => ({})
      },

      verification: {
        type:
          verificationSchema,

        required: true
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
            REPORT_CARD_STATUSES,

          message:
            "{VALUE} is not a valid report card status"
        },

        default:
          "draft",

        index: true
      },

      issue: {
        type:
          issueSchema,

        default:
          () => ({})
      },

      publication: {
        type:
          publicationSchema,

        default:
          () => ({})
      },

      revisions: {
        type: [
          revisionHistorySchema
        ],

        default: []
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
          "Report card creator is required"
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

reportCardSchema.index(
  {
    schoolId: 1,
    examResultId: 1,
    versionNumber: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_report_card_version"
  }
);

reportCardSchema.index(
  {
    schoolId: 1,
    reportCardNumber: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_report_card_number_per_school"
  }
);

reportCardSchema.index(
  {
    "verification.verificationCode": 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_report_card_verification_code"
  }
);

reportCardSchema.index({
  schoolId: 1,
  examId: 1,
  classId: 1,
  sectionName: 1,
  status: 1,
  isDeleted: 1
});

reportCardSchema.index({
  schoolId: 1,
  studentId: 1,
  academicYear: 1,
  status: 1,
  isDeleted: 1
});

reportCardSchema.index({
  schoolId: 1,
  examResultId: 1,
  status: 1,
  isDeleted: 1
});

reportCardSchema.index({
  schoolId: 1,
  "snapshot.overallResultStatus": 1,
  status: 1,
  isDeleted: 1
});

reportCardSchema.index({
  schoolId: 1,
  "publication.publishedAt": -1,
  status: 1,
  isDeleted: 1
});

reportCardSchema.index({
  schoolId: 1,
  "verification.contentHash": 1,
  isDeleted: 1
});

/*
|--------------------------------------------------------------------------
| Snapshot Validation and Normalization
|--------------------------------------------------------------------------
*/

const normalizeGradeSnapshot = (
  grade
) => {
  const normalized =
    grade ||
    {};

  normalized.grade =
    normalizeText(
      normalized.grade
    ).toUpperCase();

  normalized.label =
    normalizeText(
      normalized.label
    );

  normalized.remarks =
    normalizeText(
      normalized.remarks
    );

  normalized.displayColor =
    normalizeHexColor(
      normalized.displayColor
    );

  normalized.gradePoint =
    roundNumber(
      normalized.gradePoint,
      2
    );

  return normalized;
};

const validateGradeColor = (
  document,
  path,
  grade
) => {
  if (
    grade?.displayColor &&
    !/^#[0-9A-F]{6}$/.test(
      grade.displayColor
    )
  ) {
    document.invalidate(
      path,
      "Grade display color must use a six-digit hex value"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Validation and Normalization Middleware
|--------------------------------------------------------------------------
*/

reportCardSchema.pre(
  "validate",
  function validateReportCard() {
    this.academicYear =
      normalizeText(
        this.academicYear
      );

    this.sectionName =
      normalizeSectionName(
        this.sectionName
      );

    this.snapshot =
      this.snapshot ||
      {};

    this.layout =
      this.layout ||
      {};

    this.accessPolicy =
      this.accessPolicy ||
      {};

    this.document =
      this.document ||
      {};

    this.verification =
      this.verification ||
      {};

    this.issue =
      this.issue ||
      {};

    this.publication =
      this.publication ||
      {};

    /*
    |--------------------------------------------------------------------------
    | Snapshot Identity
    |--------------------------------------------------------------------------
    */

    const school =
      this.snapshot.school ||
      {};

    school.schoolName =
      normalizeText(
        school.schoolName
      );

    school.schoolCode =
      normalizeCode(
        school.schoolCode
      );

    school.registrationNumber =
      normalizeText(
        school.registrationNumber
      );

    school.logoUrl =
      normalizeOptionalUrl(
        school.logoUrl
      );

    school.address =
      normalizeText(
        school.address
      );

    school.phone =
      normalizeText(
        school.phone
      );

    school.email =
      normalizeText(
        school.email
      ).toLowerCase();

    school.website =
      normalizeOptionalUrl(
        school.website
      );

    school.principalName =
      normalizeText(
        school.principalName
      );

    const student =
      this.snapshot.student ||
      {};

    student.studentName =
      normalizeText(
        student.studentName
      );

    student.fatherName =
      normalizeText(
        student.fatherName
      );

    student.guardianName =
      normalizeText(
        student.guardianName
      );

    student.admissionNumber =
      normalizeCode(
        student.admissionNumber
      );

    student.rollNumber =
      normalizeCode(
        student.rollNumber
      );

    student.className =
      normalizeText(
        student.className
      );

    student.sectionName =
      normalizeSectionName(
        student.sectionName
      );

    student.photoUrl =
      normalizeOptionalUrl(
        student.photoUrl
      );

    const exam =
      this.snapshot.exam ||
      {};

    exam.examCode =
      normalizeCode(
        exam.examCode
      );

    exam.examName =
      normalizeText(
        exam.examName
      );

    exam.examType =
      normalizeText(
        exam.examType
      );

    exam.academicYear =
      normalizeText(
        exam.academicYear
      );

    exam.academicTerm =
      normalizeText(
        exam.academicTerm
      );

    if (
      exam.startDate &&
      exam.endDate &&
      exam.endDate <
        exam.startDate
    ) {
      this.invalidate(
        "snapshot.exam.endDate",
        "Exam snapshot end date cannot be before the start date"
      );
    }

    this.snapshot
      .classTeacherRemarks =
      normalizeText(
        this.snapshot
          .classTeacherRemarks
      );

    this.snapshot
      .principalRemarks =
      normalizeText(
        this.snapshot
          .principalRemarks
      );

    /*
    |--------------------------------------------------------------------------
    | Subject Result Snapshot
    |--------------------------------------------------------------------------
    */

    const subjectIds =
      new Set();

    const studentMarkIds =
      new Set();

    if (
      Array.isArray(
        this.snapshot
          .subjectResults
      )
    ) {
      this.snapshot.subjectResults.forEach(
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
              `snapshot.subjectResults.${index}.subjectId`,
              "The same subject cannot appear more than once on a report card"
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
              `snapshot.subjectResults.${index}.studentMarkId`,
              "The same student mark record cannot appear more than once"
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

          subject.weightagePercentage =
            roundNumber(
              subject.weightagePercentage,
              2
            );

          subject.weightedScore =
            roundNumber(
              subject.weightedScore,
              2
            );

          if (
            subject.passingMarks >
            subject.maxMarks
          ) {
            this.invalidate(
              `snapshot.subjectResults.${index}.passingMarks`,
              "Passing marks cannot exceed maximum marks"
            );
          }

          if (
            subject.obtainedMarks >
            subject.maxMarks
          ) {
            this.invalidate(
              `snapshot.subjectResults.${index}.obtainedMarks`,
              "Obtained marks cannot exceed maximum marks"
            );
          }

          subject.percentage =
            subject.maxMarks >
            0
              ? roundNumber(
                  (
                    subject.obtainedMarks /
                    subject.maxMarks
                  ) *
                    100,
                  2
                )
              : 0;

          subject.grade =
            normalizeGradeSnapshot(
              subject.grade
            );

          validateGradeColor(
            this,
            `snapshot.subjectResults.${index}.grade.displayColor`,
            subject.grade
          );

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
            subject.resultStatus ===
            "exempted"
          ) {
            subject.countsInTotal =
              false;
          }
        }
      );

      this.snapshot.subjectResults.sort(
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
    | Recalculate Snapshot Totals
    |--------------------------------------------------------------------------
    */

    this.snapshot.totals =
      calculateSnapshotTotals(
        this.snapshot
          .subjectResults,
        2
      );

    this.snapshot.overallGrade =
      normalizeGradeSnapshot(
        this.snapshot
          .overallGrade
      );

    validateGradeColor(
      this,
      "snapshot.overallGrade.displayColor",
      this.snapshot
        .overallGrade
    );

    if (
      ![
        "pass",
        "fail"
      ].includes(
        this.snapshot
          .overallResultStatus
      )
    ) {
      this.snapshot.overallGrade = {
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
    | Attendance Snapshot
    |--------------------------------------------------------------------------
    */

    const attendance =
      this.snapshot
        .attendance ||
      {};

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
        "snapshot.attendance.workingDays",
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
        "snapshot.attendance.periodEnd",
        "Attendance period end cannot be before the start"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Signatures
    |--------------------------------------------------------------------------
    */

    const signatureRoles =
      new Set();

    if (
      Array.isArray(
        this.snapshot
          .signatures
      )
    ) {
      this.snapshot.signatures.forEach(
        (
          signature,
          index
        ) => {
          signature.role =
            normalizeText(
              signature.role
            ).toLowerCase();

          signature.name =
            normalizeText(
              signature.name
            );

          signature.designation =
            normalizeText(
              signature.designation
            );

          signature.signatureUrl =
            normalizeOptionalUrl(
              signature.signatureUrl
            );

          if (
            signatureRoles.has(
              signature.role
            )
          ) {
            this.invalidate(
              `snapshot.signatures.${index}.role`,
              `Signature role ${signature.role} is duplicated`
            );
          }

          signatureRoles.add(
            signature.role
          );
        }
      );

      this.snapshot.signatures.sort(
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
          )
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Layout and Access
    |--------------------------------------------------------------------------
    */

    this.layout.templateCode =
      normalizeCode(
        this.layout
          .templateCode ||
        "STANDARD_REPORT_CARD"
      );

    this.layout.themeColor =
      normalizeHexColor(
        this.layout
          .themeColor ||
        "#0F172A"
      );

    this.layout.accentColor =
      normalizeHexColor(
        this.layout
          .accentColor ||
        "#2563EB"
      );

    this.layout.watermarkText =
      normalizeText(
        this.layout
          .watermarkText
      );

    if (
      !/^#[0-9A-F]{6}$/.test(
        this.layout
          .themeColor
      )
    ) {
      this.invalidate(
        "layout.themeColor",
        "Theme color must use a six-digit hex value"
      );
    }

    if (
      !/^#[0-9A-F]{6}$/.test(
        this.layout
          .accentColor
      )
    ) {
      this.invalidate(
        "layout.accentColor",
        "Accent color must use a six-digit hex value"
      );
    }

    if (
      !this.accessPolicy
        .allowPublicVerification
    ) {
      this.accessPolicy
        .showDetailedMarksOnPublicVerification =
        false;

      if (
        this.accessPolicy
          .visibility ===
        "public_verification"
      ) {
        this.accessPolicy
          .visibility =
          "student_parent";
      }
    }

    if (
      this.accessPolicy
        .visibility ===
      "private"
    ) {
      this.accessPolicy
        .allowPublicVerification =
        false;

      this.accessPolicy
        .showDetailedMarksOnPublicVerification =
        false;
    }

    /*
    |--------------------------------------------------------------------------
    | Document Metadata
    |--------------------------------------------------------------------------
    */

    this.document.fileName =
      normalizeText(
        this.document
          .fileName
      );

    this.document.mimeType =
      normalizeText(
        this.document
          .mimeType ||
        "application/pdf"
      ).toLowerCase();

    this.document.publicId =
      normalizeText(
        this.document
          .publicId
      );

    this.document.url =
      normalizeOptionalUrl(
        this.document
          .url
      );

    this.document.sha256 =
      normalizeText(
        this.document
          .sha256
      ).toLowerCase();

    if (
      this.document.sha256 &&
      !/^[a-f0-9]{64}$/.test(
        this.document.sha256
      )
    ) {
      this.invalidate(
        "document.sha256",
        "Document checksum must be a 64-character SHA-256 value"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Identity and Verification
    |--------------------------------------------------------------------------
    */

    this.versionNumber =
      Math.max(
        1,
        Number(
          this.versionNumber ||
          1
        )
      );

    this.reportCardKey =
      buildReportCardKey({
        schoolId:
          this.schoolId,

        examResultId:
          this.examResultId,

        versionNumber:
          this.versionNumber
      });

    if (
      !this.reportCardNumber
    ) {
      this.reportCardNumber =
        buildReportCardNumber({
          schoolCode:
            school.schoolCode,

          academicYear:
            this.academicYear ||
            exam.academicYear,

          examCode:
            exam.examCode,

          admissionNumber:
            student
              .admissionNumber,

          studentId:
            this.studentId,

          versionNumber:
            this.versionNumber
        });
    } else {
      this.reportCardNumber =
        normalizeCode(
          this.reportCardNumber
        );
    }

    if (
      !this.verification
        .verificationCode
    ) {
      this.verification
        .verificationCode =
        generateVerificationCode(
          16
        );
    } else {
      this.verification
        .verificationCode =
        normalizeCode(
          this.verification
            .verificationCode
        ).replaceAll(
          "-",
          ""
        );
    }

    const verificationBaseUrl =
      this.$locals
        ?.verificationBaseUrl ||
      "";

    if (
      verificationBaseUrl ||
      !this.verification
        .verificationPayload
    ) {
      this.verification
        .verificationPayload =
        buildVerificationPayload({
          verificationBaseUrl,

          verificationCode:
            this.verification
              .verificationCode
        });
    }

    const immutableContent = {
      schoolId:
        objectIdKey(
          this.schoolId
        ),

      examId:
        objectIdKey(
          this.examId
        ),

      examResultId:
        objectIdKey(
          this.examResultId
        ),

      studentId:
        objectIdKey(
          this.studentId
        ),

      classId:
        objectIdKey(
          this.classId
        ),

      academicYear:
        this.academicYear,

      sectionName:
        this.sectionName,

      reportCardNumber:
        this.reportCardNumber,

      versionNumber:
        this.versionNumber,

      snapshot:
        this.snapshot,

      layout:
        this.layout,

      accessPolicy:
        this.accessPolicy
    };

    this.verification
      .contentHash =
      computeSha256(
        immutableContent
      );

    /*
    |--------------------------------------------------------------------------
    | Workflow Rules
    |--------------------------------------------------------------------------
    */

    if (
      this.status ===
      "generated"
    ) {
      if (
        this.snapshot
          .subjectResults
          .length ===
        0
      ) {
        this.invalidate(
          "snapshot.subjectResults",
          "A generated report card must contain at least one subject result"
        );
      }

      if (
        ![
          "approved",
          "published",
          "locked"
        ].includes(
          this.snapshot
            .sourceResultStatus
        )
      ) {
        this.invalidate(
          "snapshot.sourceResultStatus",
          "A report card can only be generated from an approved or published exam result"
        );
      }
    }

    if (
      [
        "issued",
        "published"
      ].includes(
        this.status
      )
    ) {
      if (
        ![
          "pass",
          "fail"
        ].includes(
          this.snapshot
            .overallResultStatus
        )
      ) {
        this.invalidate(
          "snapshot.overallResultStatus",
          "Only complete pass or fail results can be issued"
        );
      }

      if (
        ![
          "published",
          "locked"
        ].includes(
          this.snapshot
            .sourceResultStatus
        )
      ) {
        this.invalidate(
          "snapshot.sourceResultStatus",
          "The source exam result must be published before issuing a report card"
        );
      }

      this.issue.issuedAt =
        this.issue
          .issuedAt ||
        new Date();
    }

    if (
      this.status ===
      "published"
    ) {
      this.publication
        .publishedAt =
        this.publication
          .publishedAt ||
        new Date();

      this.publication
        .unpublishedAt =
        null;

      this.publication
        .unpublishedBy =
        null;

      if (
        this.accessPolicy
          .visibility ===
        "private"
      ) {
        this.accessPolicy
          .visibility =
          "student_parent";
      }
    }

    if (
      this.status ===
      "revoked"
    ) {
      this.verification
        .revocationReason =
        normalizeText(
          this.verification
            .revocationReason
        );

      if (
        !this.verification
          .revocationReason
      ) {
        this.invalidate(
          "verification.revocationReason",
          "Revocation reason is required for a revoked report card"
        );
      }

      this.verification
        .revokedAt =
        this.verification
          .revokedAt ||
        new Date();

      this.accessPolicy
        .visibility =
        "private";

      this.accessPolicy
        .allowPublicVerification =
        false;

      this.accessPolicy
        .showDetailedMarksOnPublicVerification =
        false;
    }

    if (
      this.status ===
      "archived"
    ) {
      this.archivedAt =
        this.archivedAt ||
        new Date();

      this.accessPolicy
        .visibility =
        "private";

      this.accessPolicy
        .allowPublicVerification =
        false;

      this.accessPolicy
        .showDetailedMarksOnPublicVerification =
        false;
    }

    if (
      this.verification
        .expiresAt &&
      this.issue
        .issuedAt &&
      this.verification
        .expiresAt <
        this.issue
          .issuedAt
    ) {
      this.invalidate(
        "verification.expiresAt",
        "Verification expiry cannot be before the issue date"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Revision History
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

          revision.reportCardNumber =
            normalizeCode(
              revision.reportCardNumber
            );

          revision.contentHash =
            normalizeText(
              revision.contentHash
            ).toLowerCase();

          if (
            !revision.reason
          ) {
            this.invalidate(
              `revisions.${index}.reason`,
              "Every report card revision must include a reason"
            );
          }

          if (
            !/^[a-f0-9]{64}$/.test(
              revision.contentHash
            )
          ) {
            this.invalidate(
              `revisions.${index}.contentHash`,
              "Revision content hash must be a valid SHA-256 value"
            );
          }
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Final Immutable Content Hash
    |--------------------------------------------------------------------------
    |
    | Workflow rules above may adjust visibility, issue dates or publication
    | state. Recalculate the official hash after those changes so the checksum
    | always represents the final validated report card content.
    |
    */

    this.verification
      .contentHash =
      computeSha256({
        schoolId:
          objectIdKey(
            this.schoolId
          ),

        examId:
          objectIdKey(
            this.examId
          ),

        examResultId:
          objectIdKey(
            this.examResultId
          ),

        studentId:
          objectIdKey(
            this.studentId
          ),

        classId:
          objectIdKey(
            this.classId
          ),

        academicYear:
          this.academicYear,

        sectionName:
          this.sectionName,

        reportCardNumber:
          this.reportCardNumber,

        versionNumber:
          this.versionNumber,

        snapshot:
          this.snapshot,

        layout:
          this.layout,

        accessPolicy:
          this.accessPolicy
      });

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

      this.accessPolicy
        .visibility =
        "private";

      this.accessPolicy
        .allowPublicVerification =
        false;
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
| Immutable Snapshot Protection
|--------------------------------------------------------------------------
|
| Once issued, published, revoked or archived, the official snapshot, layout,
| identity and verification code cannot be silently modified. A new version
| must be created instead.
|
*/

reportCardSchema.pre(
  "save",
  async function protectIssuedReportCard() {
    if (
      this.isNew
    ) {
      return;
    }

    const protectedPaths = [
      "schoolId",
      "examId",
      "examResultId",
      "studentId",
      "classId",
      "academicYear",
      "sectionName",
      "reportCardNumber",
      "versionNumber",
      "snapshot",
      "layout",
      "verification.verificationCode"
    ];

    const protectedPathChanged =
      protectedPaths.some(
        (
          path
        ) =>
          this.isModified(
            path
          )
      );

    if (
      !protectedPathChanged ||
      !IMMUTABLE_STATUSES.includes(
        this.status
      )
    ) {
      return;
    }

    const original =
      await this.constructor
        .findById(
          this._id
        )
        .select(
          [
            "status",
            ...protectedPaths
          ].join(
            " "
          )
        )
        .lean();

    if (
      !original
    ) {
      return;
    }

    const currentPayload = {
      schoolId:
        objectIdKey(
          this.schoolId
        ),

      examId:
        objectIdKey(
          this.examId
        ),

      examResultId:
        objectIdKey(
          this.examResultId
        ),

      studentId:
        objectIdKey(
          this.studentId
        ),

      classId:
        objectIdKey(
          this.classId
        ),

      academicYear:
        this.academicYear,

      sectionName:
        this.sectionName,

      reportCardNumber:
        this.reportCardNumber,

      versionNumber:
        this.versionNumber,

      snapshot:
        this.snapshot,

      layout:
        this.layout,

      verificationCode:
        this.verification
          ?.verificationCode
    };

    const originalPayload = {
      schoolId:
        objectIdKey(
          original.schoolId
        ),

      examId:
        objectIdKey(
          original.examId
        ),

      examResultId:
        objectIdKey(
          original.examResultId
        ),

      studentId:
        objectIdKey(
          original.studentId
        ),

      classId:
        objectIdKey(
          original.classId
        ),

      academicYear:
        original.academicYear,

      sectionName:
        original.sectionName,

      reportCardNumber:
        original.reportCardNumber,

      versionNumber:
        original.versionNumber,

      snapshot:
        original.snapshot,

      layout:
        original.layout,

      verificationCode:
        original.verification
          ?.verificationCode
    };

    if (
      computeSha256(
        currentPayload
      ) !==
      computeSha256(
        originalPayload
      )
    ) {
      throw new Error(
        "Issued report card content is immutable. Create a new report card version instead."
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| Virtual Fields
|--------------------------------------------------------------------------
*/

reportCardSchema.virtual(
  "isOfficial"
).get(
  function getIsOfficial() {
    return (
      [
        "issued",
        "published"
      ].includes(
        this.status
      ) &&
      !this.isDeleted
    );
  }
);

reportCardSchema.virtual(
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

reportCardSchema.virtual(
  "isRevoked"
).get(
  function getIsRevoked() {
    return (
      this.status ===
      "revoked"
    );
  }
);

reportCardSchema.virtual(
  "isEditable"
).get(
  function getIsEditable() {
    return (
      !this.isDeleted &&
      [
        "draft",
        "generated"
      ].includes(
        this.status
      )
    );
  }
);

reportCardSchema.virtual(
  "hasDocument"
).get(
  function getHasDocument() {
    return Boolean(
      this.document
        ?.url ||
      this.document
        ?.publicId
    );
  }
);

reportCardSchema.virtual(
  "canStudentDownload"
).get(
  function getCanStudentDownload() {
    return (
      [
        "issued",
        "published"
      ].includes(
        this.status
      ) &&
      this.accessPolicy
        ?.allowStudentDownload ===
        true &&
      !this.isDeleted
    );
  }
);

reportCardSchema.virtual(
  "canParentDownload"
).get(
  function getCanParentDownload() {
    return (
      [
        "issued",
        "published"
      ].includes(
        this.status
      ) &&
      this.accessPolicy
        ?.allowParentDownload ===
        true &&
      !this.isDeleted
    );
  }
);

reportCardSchema.virtual(
  "verificationValid"
).get(
  function getVerificationValid() {
    if (
      this.isDeleted ||
      this.status ===
        "revoked" ||
      this.status ===
        "archived"
    ) {
      return false;
    }

    if (
      this.verification
        ?.expiresAt &&
      this.verification
        .expiresAt <
        new Date()
    ) {
      return false;
    }

    return [
      "issued",
      "published"
    ].includes(
      this.status
    );
  }
);

/*
|--------------------------------------------------------------------------
| Instance Methods
|--------------------------------------------------------------------------
*/

reportCardSchema.methods.canTransitionTo =
  function canTransitionTo(
    nextStatus
  ) {
    if (
      !REPORT_CARD_STATUSES.includes(
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

reportCardSchema.methods.refreshSnapshotFromExamResult =
  function refreshSnapshotFromExamResult(
    examResult,
    context = {}
  ) {
    if (
      ![
        "draft",
        "generated"
      ].includes(
        this.status
      )
    ) {
      throw new Error(
        "Only draft or generated report cards can refresh their snapshot"
      );
    }

    this.snapshot =
      mapExamResultToSnapshot(
        examResult,
        context
      );

    this.academicYear =
      this.snapshot.exam
        .academicYear;

    this.sectionName =
      this.snapshot.student
        .sectionName;

    return this;
  };

reportCardSchema.methods.attachGeneratedDocument =
  function attachGeneratedDocument({
    fileName,
    mimeType =
      "application/pdf",
    storageProvider =
      "other",
    publicId =
      "",
    url =
      "",
    sizeBytes =
      0,
    sha256 =
      "",
    generatedBy =
      null
  }) {
    if (
      ![
        "draft",
        "generated"
      ].includes(
        this.status
      )
    ) {
      throw new Error(
        "A generated document cannot replace an issued report card. Create a new version."
      );
    }

    const normalizedUrl =
      normalizeOptionalUrl(
        url
      );

    const normalizedChecksum =
      normalizeText(
        sha256
      ).toLowerCase();

    if (
      normalizedChecksum &&
      !/^[a-f0-9]{64}$/.test(
        normalizedChecksum
      )
    ) {
      throw new Error(
        "Document checksum must be a valid SHA-256 value"
      );
    }

    this.document = {
      fileName:
        normalizeText(
          fileName
        ),

      mimeType:
        normalizeText(
          mimeType
        ).toLowerCase(),

      storageProvider,

      publicId:
        normalizeText(
          publicId
        ),

      url:
        normalizedUrl,

      sizeBytes:
        Math.max(
          0,
          Number(
            sizeBytes ||
            0
          )
        ),

      sha256:
        normalizedChecksum,

      generatedAt:
        new Date(),

      generatedBy
    };

    return this;
  };

reportCardSchema.methods.revoke =
  function revoke({
    reason,
    revokedBy
  }) {
    const normalizedReason =
      normalizeText(
        reason
      );

    if (
      !normalizedReason
    ) {
      throw new Error(
        "Revocation reason is required"
      );
    }

    if (
      ![
        "issued",
        "published"
      ].includes(
        this.status
      )
    ) {
      throw new Error(
        "Only issued or published report cards can be revoked"
      );
    }

    this.status =
      "revoked";

    this.verification
      .revocationReason =
      normalizedReason;

    this.verification
      .revokedAt =
      new Date();

    this.verification
      .revokedBy =
      revokedBy ||
      null;

    this.accessPolicy
      .visibility =
      "private";

    this.accessPolicy
      .allowPublicVerification =
      false;

    this.accessPolicy
      .showDetailedMarksOnPublicVerification =
      false;

    return this;
  };

reportCardSchema.methods.recordVerification =
  function recordVerification() {
    this.verification
      .verificationCount =
      Number(
        this.verification
          .verificationCount ||
        0
      ) +
      1;

    this.verification
      .lastVerifiedAt =
      new Date();

    return this;
  };

reportCardSchema.methods.addRevisionReference =
  function addRevisionReference({
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

    this.revisions.push({
      versionNumber:
        this.versionNumber,

      reportCardNumber:
        this.reportCardNumber,

      previousStatus:
        this.status,

      contentHash:
        this.verification
          .contentHash,

      reason:
        normalizedReason,

      changedAt:
        new Date(),

      changedBy
    });

    return this;
  };

reportCardSchema.methods.getVerificationSummary =
  function getVerificationSummary({
    includeDetailedMarks =
      false
  } = {}) {
    const publicMarksAllowed =
      Boolean(
        includeDetailedMarks &&
        this.accessPolicy
          ?.allowPublicVerification &&
        this.accessPolicy
          ?.showDetailedMarksOnPublicVerification
      );

    return {
      valid:
        this.verificationValid,

      status:
        this.status,

      reportCardNumber:
        this.reportCardNumber,

      verificationCode:
        this.verification
          ?.verificationCode,

      issuedAt:
        this.issue
          ?.issuedAt,

      publishedAt:
        this.publication
          ?.publishedAt,

      expiresAt:
        this.verification
          ?.expiresAt,

      revocationReason:
        this.status ===
          "revoked"
          ? this.verification
              ?.revocationReason ||
            ""
          : "",

      school: {
        schoolName:
          this.snapshot
            ?.school
            ?.schoolName,

        schoolCode:
          this.snapshot
            ?.school
            ?.schoolCode
      },

      student: {
        studentName:
          this.snapshot
            ?.student
            ?.studentName,

        admissionNumber:
          this.snapshot
            ?.student
            ?.admissionNumber,

        className:
          this.snapshot
            ?.student
            ?.className,

        sectionName:
          this.snapshot
            ?.student
            ?.sectionName
      },

      exam: {
        examName:
          this.snapshot
            ?.exam
            ?.examName,

        examCode:
          this.snapshot
            ?.exam
            ?.examCode,

        academicYear:
          this.snapshot
            ?.exam
            ?.academicYear,

        academicTerm:
          this.snapshot
            ?.exam
            ?.academicTerm
      },

      result: {
        overallResultStatus:
          this.snapshot
            ?.overallResultStatus,

        percentage:
          this.snapshot
            ?.totals
            ?.percentage,

        grade:
          this.snapshot
            ?.overallGrade
            ?.grade
      },

      subjectResults:
        publicMarksAllowed
          ? this.snapshot
              ?.subjectResults ||
            []
          : undefined
    };
  };

/*
|--------------------------------------------------------------------------
| Static Helpers
|--------------------------------------------------------------------------
*/

reportCardSchema.statics.createSnapshotFromExamResult =
  function createSnapshotFromExamResult(
    examResult,
    context = {}
  ) {
    return mapExamResultToSnapshot(
      examResult,
      context
    );
  };

reportCardSchema.statics.generateVerificationCode =
  function staticGenerateVerificationCode(
    length = 16
  ) {
    return generateVerificationCode(
      length
    );
  };

reportCardSchema.statics.computeContentHash =
  function staticComputeContentHash(
    value
  ) {
    return computeSha256(
      value
    );
  };

reportCardSchema.statics.buildReportCardNumber =
  function staticBuildReportCardNumber(
    values
  ) {
    return buildReportCardNumber(
      values
    );
  };

reportCardSchema.statics.buildReportCardKey =
  function staticBuildReportCardKey(
    values
  ) {
    return buildReportCardKey(
      values
    );
  };

reportCardSchema.statics.getAllowedStatusTransitions =
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

reportCardSchema.statics.buildActiveFilter =
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

reportCardSchema.statics.buildPublishedFilter =
  function buildPublishedFilter(
    schoolId,
    extraFilter = {}
  ) {
    return {
      schoolId,

      status: {
        $in: [
          "issued",
          "published"
        ]
      },

      isDeleted: {
        $ne: true
      },

      ...extraFilter
    };
  };

reportCardSchema.statics.buildVerificationFilter =
  function buildVerificationFilter(
    verificationCode
  ) {
    return {
      "verification.verificationCode":
        normalizeCode(
          verificationCode
        ).replaceAll(
          "-",
          ""
        ),

      status: {
        $in: [
          "issued",
          "published"
        ]
      },

      isDeleted: {
        $ne: true
      }
    };
  };

/*
|--------------------------------------------------------------------------
| Model Export
|--------------------------------------------------------------------------
*/

const ReportCard =
  mongoose.models
    .ReportCard ||
  mongoose.model(
    "ReportCard",
    reportCardSchema
  );

module.exports =
  ReportCard;

module.exports.REPORT_CARD_STATUSES =
  REPORT_CARD_STATUSES;

module.exports.REPORT_CARD_VISIBILITY =
  REPORT_CARD_VISIBILITY;

module.exports.REPORT_CARD_PAPER_SIZES =
  REPORT_CARD_PAPER_SIZES;

module.exports.REPORT_CARD_ORIENTATIONS =
  REPORT_CARD_ORIENTATIONS;

module.exports.REPORT_CARD_STORAGE_PROVIDERS =
  REPORT_CARD_STORAGE_PROVIDERS;

module.exports.ALLOWED_STATUS_TRANSITIONS =
  ALLOWED_STATUS_TRANSITIONS;

module.exports.IMMUTABLE_STATUSES =
  IMMUTABLE_STATUSES;
