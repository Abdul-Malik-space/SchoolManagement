const mongoose = require(
  "mongoose"
);

const Exam = require(
  "../models/Exam"
);

const ExamResult = require(
  "../models/ExamResult"
);

const ReportCard = require(
  "../models/ReportCard"
);

const StudentAttendance = require(
  "../models/StudentAttendance"
);

const School = require(
  "../models/School"
);

const Class = require(
  "../models/Class"
);

const Student = require(
  "../models/Student"
);

const {
  createAuditLog
} = require(
  "../utils/auditLogHelper"
);

/*
|--------------------------------------------------------------------------
| Report Card Controller
|--------------------------------------------------------------------------
|
| Management workflow:
|
| Approved / Published ExamResult
|            ↓
|      Report Card Snapshot
|            ↓
|        Generated
|            ↓
|          Issued
|            ↓
|        Published
|
| The ReportCard model remains the source of truth for:
|
| - snapshot validation
| - report-card identity
| - verification code
| - content hash
| - immutable issued snapshots
| - workflow transitions
|
*/

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

const GENERATION_EXAM_STATUSES = [
  "approved",
  "published",
  "locked"
];

const ISSUE_EXAM_STATUSES = [
  "published",
  "locked"
];

const REPORT_CARD_VIEW_EXAM_STATUSES = [
  "approved",
  "published",
  "locked"
];

const GENERATABLE_RESULT_STATUSES = [
  "approved",
  "published",
  "locked"
];

const OFFICIAL_RESULT_STATUSES = [
  "published",
  "locked"
];

const COMPLETE_RESULT_STATUSES = [
  "pass",
  "fail"
];

const EDITABLE_REPORT_CARD_STATUSES = [
  "draft",
  "generated"
];

const IMMUTABLE_REPORT_CARD_STATUSES = [
  "issued",
  "published",
  "revoked",
  "archived"
];

const ISSUEABLE_REPORT_CARD_STATUSES = [
  "generated",
  "issued",
  "published"
];

const PUBLISHABLE_REPORT_CARD_STATUSES = [
  "generated",
  "issued",
  "published"
];

/*
|--------------------------------------------------------------------------
| Controller Error
|--------------------------------------------------------------------------
*/

class ReportCardControllerError extends Error {
  constructor(
    message,
    statusCode = 400,
    details = null
  ) {
    super(
      message
    );

    this.name =
      "ReportCardControllerError";

    this.statusCode =
      statusCode;

    this.details =
      details;
  }
}

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const normalizeText = (
  value
) => {
  if (
    value === undefined ||
    value === null
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

const normalizeSection = (
  value
) => {
  return normalizeText(
    value
  );
};

const getDocumentId = (
  value
) => {
  if (!value) {
    return "";
  }

  return String(
    value?._id ||
    value?.id ||
    value
  );
};

const isValidObjectId = (
  value
) => {
  return (
    Boolean(
      value
    ) &&
    mongoose.Types.ObjectId.isValid(
      value
    )
  );
};

const toFiniteNumber = (
  value,
  fallback = 0
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
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
  const multiplier =
    10 ** precision;

  return (
    Math.round(
      (
        toFiniteNumber(
          value,
          0
        ) +
        Number.EPSILON
      ) *
        multiplier
    ) /
    multiplier
  );
};

const getPlainData = (
  value
) => {
  if (!value) {
    return value;
  }

  if (
    typeof value.toObject ===
    "function"
  ) {
    return value.toObject({
      virtuals:
        true
    });
  }

  return value;
};

const getPlainArray = (
  values
) => {
  if (
    !Array.isArray(
      values
    )
  ) {
    return [];
  }

  return values.map(
    getPlainData
  );
};

const isSuperAdmin = (
  req
) => {
  return (
    req.user?.role ===
    "super_admin"
  );
};

const isManagementRole = (
  req
) => {
  return MANAGEMENT_ROLES.includes(
    req.user?.role
  );
};

const getUserSchoolId = (
  req
) => {
  return getDocumentId(
    req.schoolFilter
      ?.schoolId ||
    req.user?.schoolId
  );
};

const requireManagementRole = (
  req
) => {
  if (
    !isManagementRole(
      req
    )
  ) {
    throw new ReportCardControllerError(
      "Only Principal or Super Admin can manage report cards",
      403
    );
  }
};

/*
|--------------------------------------------------------------------------
| Audit Helper
|--------------------------------------------------------------------------
*/

const recordAuditLog =
  async (
    auditData
  ) => {
    try {
      await createAuditLog(
        auditData
      );
    } catch (
      auditError
    ) {
      console.error(
        "Report card audit log error:",
        auditError
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Error Handler
|--------------------------------------------------------------------------
*/

const handleControllerError = (
  res,
  error,
  fallbackMessage
) => {
  console.error(
    `${fallbackMessage}:`,
    error
  );

  if (
    error instanceof
    ReportCardControllerError
  ) {
    return res
      .status(
        error.statusCode ||
        400
      )
      .json({
        success:
          false,

        message:
          error.message,

        details:
          error.details ||
          undefined
      });
  }

  if (
    error.name ===
    "ValidationError"
  ) {
    return res
      .status(400)
      .json({
        success:
          false,

        message:
          Object.values(
            error.errors
          )
            .map(
              (
                validationError
              ) =>
                validationError.message
            )
            .join(
              ", "
            )
      });
  }

  if (
    error.name ===
    "CastError"
  ) {
    return res
      .status(400)
      .json({
        success:
          false,

        message:
          "Invalid record ID format"
      });
  }

  if (
    error.name ===
      "VersionError" ||
    error.name ===
      "DocumentNotFoundError"
  ) {
    return res
      .status(409)
      .json({
        success:
          false,

        message:
          "This report card was changed by another user. Reload and try again."
      });
  }

  if (
    error.code ===
    11000
  ) {
    return res
      .status(409)
      .json({
        success:
          false,

        message:
          "A report card with the same version, number or verification code already exists."
      });
  }

  return res
    .status(500)
    .json({
      success:
        false,

      message:
        fallbackMessage,

      error:
        process.env
          .NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
};

/*
|--------------------------------------------------------------------------
| School / Exam Scope
|--------------------------------------------------------------------------
*/

const getSchoolFilter = (
  req
) => {
  if (
    isSuperAdmin(
      req
    )
  ) {
    return {};
  }

  const schoolId =
    getUserSchoolId(
      req
    );

  if (!schoolId) {
    throw new ReportCardControllerError(
      "School is not assigned to this user",
      403
    );
  }

  return {
    schoolId
  };
};

const loadScopedExam =
  async (
    req,
    examId
  ) => {
    if (
      !isValidObjectId(
        examId
      )
    ) {
      throw new ReportCardControllerError(
        "Invalid exam ID format",
        400
      );
    }

    const exam =
      await Exam.findOne({
        _id:
          examId,

        ...getSchoolFilter(
          req
        ),

        isDeleted: {
          $ne:
            true
        }
      });

    if (!exam) {
      throw new ReportCardControllerError(
        "Exam not found or access denied",
        404
      );
    }

    return exam;
  };

const requireExamStatus = ({
  exam,
  allowedStatuses,
  message
}) => {
  if (
    !allowedStatuses.includes(
      exam.status
    )
  ) {
    throw new ReportCardControllerError(
      message,
      409,
      {
        examStatus:
          exam.status,

        allowedExamStatuses:
          allowedStatuses
      }
    );
  }
};

/*
|--------------------------------------------------------------------------
| Verification Base URL
|--------------------------------------------------------------------------
*/

const getVerificationBaseUrl =
  () => {
    const explicitUrl =
      normalizeText(
        process.env
          .REPORT_CARD_VERIFICATION_URL
      ).replace(
        /\/+$/,
        ""
      );

    if (
      explicitUrl
    ) {
      return explicitUrl;
    }

    const frontendUrl =
      normalizeText(
        process.env
          .FRONTEND_URL ||
        process.env
          .CLIENT_URL
      ).replace(
        /\/+$/,
        ""
      );

    if (
      !frontendUrl
    ) {
      return "";
    }

    return `${frontendUrl}/verify/report-card`;
  };

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

const parseDate = (
  value,
  label
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
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
    throw new ReportCardControllerError(
      `${label} is not a valid date`,
      400
    );
  }

  return date;
};

const startOfDay = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      value
    );

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
  if (!value) {
    return null;
  }

  const date =
    new Date(
      value
    );

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date;
};

const resolveAttendancePeriod = (
  exam,
  body = {}
) => {
  const start =
    parseDate(
      body
        .attendancePeriodStart ??
        exam.startDate,
      "Attendance period start"
    );

  const end =
    parseDate(
      body
        .attendancePeriodEnd ??
        exam.endDate,
      "Attendance period end"
    );

  if (
    start &&
    end &&
    end <
      start
  ) {
    throw new ReportCardControllerError(
      "Attendance period end cannot be before the start",
      400
    );
  }

  return {
    start:
      startOfDay(
        start
      ),

    end:
      endOfDay(
        end
      )
  };
};

/*
|--------------------------------------------------------------------------
| Signature Normalization
|--------------------------------------------------------------------------
*/

const normalizeSignatures = (
  signatures
) => {
  if (
    signatures ===
    undefined
  ) {
    return undefined;
  }

  if (
    !Array.isArray(
      signatures
    )
  ) {
    throw new ReportCardControllerError(
      "Signatures must be an array",
      400
    );
  }

  const seenRoles =
    new Set();

  return signatures.map(
    (
      signature,
      index
    ) => {
      const role =
        normalizeText(
          signature?.role
        ).toLowerCase();

      const name =
        normalizeText(
          signature?.name
        );

      if (!role) {
        throw new ReportCardControllerError(
          `Signature role is required at position ${index + 1}`,
          400
        );
      }

      if (!name) {
        throw new ReportCardControllerError(
          `Signatory name is required at position ${index + 1}`,
          400
        );
      }

      if (
        seenRoles.has(
          role
        )
      ) {
        throw new ReportCardControllerError(
          `Duplicate signature role is not allowed: ${role}`,
          400
        );
      }

      seenRoles.add(
        role
      );

      const staffId =
        signature
          ?.staffId
          ? getDocumentId(
              signature.staffId
            )
          : null;

      const userId =
        signature
          ?.userId
          ? getDocumentId(
              signature.userId
            )
          : null;

      if (
        staffId &&
        !isValidObjectId(
          staffId
        )
      ) {
        throw new ReportCardControllerError(
          `Invalid staff ID in signature ${index + 1}`,
          400
        );
      }

      if (
        userId &&
        !isValidObjectId(
          userId
        )
      ) {
        throw new ReportCardControllerError(
          `Invalid user ID in signature ${index + 1}`,
          400
        );
      }

      return {
        role,

        name,

        designation:
          normalizeText(
            signature
              ?.designation
          ),

        staffId,

        userId,

        signatureUrl:
          normalizeText(
            signature
              ?.signatureUrl
          ),

        signedAt:
          signature
            ?.signedAt
            ? parseDate(
                signature
                  .signedAt,
                `Signature date ${index + 1}`
              )
            : null,

        displayOrder:
          Math.max(
            0,
            Math.floor(
              toFiniteNumber(
                signature
                  ?.displayOrder,
                index
              )
            )
          )
      };
    }
  );
};

/*
|--------------------------------------------------------------------------
| Layout Snapshot
|--------------------------------------------------------------------------
*/

const buildLayout = (
  exam,
  overrides = {},
  existing = null
) => {
  const settings =
    exam.resultSettings ||
    {};

  const source =
    getPlainData(
      existing
    ) ||
    {};

  const layout = {
    ...source,

    templateCode:
      source.templateCode ||
      "STANDARD_REPORT_CARD",

    templateVersion:
      Number(
        source.templateVersion ||
        1
      ),

    paperSize:
      source.paperSize ||
      "A4",

    orientation:
      source.orientation ||
      "portrait",

    themeColor:
      source.themeColor ||
      "#0F172A",

    accentColor:
      source.accentColor ||
      "#2563EB",

    watermarkText:
      source.watermarkText ||
      "",

    showSchoolLogo:
      source.showSchoolLogo !==
      false,

    showStudentPhoto:
      source.showStudentPhoto !==
      false,

    showQRCode:
      source.showQRCode !==
      false,

    showAttendance:
      settings
        .includeAttendance !==
      false,

    showPositions:
      Boolean(
        settings
          .rankingEnabled &&
        (
          settings
            .showClassPosition ||
          settings
            .showSectionPosition
        )
      ),

    showGrade:
      settings.showGrade !==
      false,

    showGPA:
      Boolean(
        settings.showGPA
      ),

    showTeacherRemarks:
      settings
        .includeTeacherRemarks !==
      false,

    showPrincipalRemarks:
      settings
        .includePrincipalRemarks !==
      false,

    showSignatures:
      source.showSignatures !==
      false
  };

  const allowedFields = [
    "templateCode",
    "templateVersion",
    "paperSize",
    "orientation",
    "themeColor",
    "accentColor",
    "watermarkText",
    "showSchoolLogo",
    "showStudentPhoto",
    "showQRCode",
    "showAttendance",
    "showPositions",
    "showGrade",
    "showGPA",
    "showTeacherRemarks",
    "showPrincipalRemarks",
    "showSignatures"
  ];

  allowedFields.forEach(
    (
      field
    ) => {
      if (
        overrides?.[
          field
        ] !==
        undefined
      ) {
        layout[
          field
        ] =
          overrides[
            field
          ];
      }
    }
  );

  return layout;
};

/*
|--------------------------------------------------------------------------
| Access Policy
|--------------------------------------------------------------------------
*/

const buildAccessPolicy = (
  exam,
  overrides = {},
  existing = null
) => {
  const settings =
    exam.resultSettings ||
    {};

  const source =
    getPlainData(
      existing
    ) ||
    {};

  const policy = {
    visibility:
      source.visibility ||
      "private",

    allowStudentView:
      source.allowStudentView !==
      false,

    allowParentView:
      source.allowParentView !==
      false,

    allowStudentDownload:
      settings
        .allowStudentDownload !==
      false,

    allowParentDownload:
      settings
        .allowParentDownload !==
      false,

    allowPublicVerification:
      Boolean(
        source
          .allowPublicVerification
      ),

    showDetailedMarksOnPublicVerification:
      Boolean(
        source
          .showDetailedMarksOnPublicVerification
      )
  };

  const allowedFields = [
    "visibility",
    "allowStudentView",
    "allowParentView",
    "allowStudentDownload",
    "allowParentDownload",
    "allowPublicVerification",
    "showDetailedMarksOnPublicVerification"
  ];

  allowedFields.forEach(
    (
      field
    ) => {
      if (
        overrides?.[
          field
        ] !==
        undefined
      ) {
        policy[
          field
        ] =
          overrides[
            field
          ];
      }
    }
  );

  if (
    !policy
      .allowPublicVerification
  ) {
    policy
      .showDetailedMarksOnPublicVerification =
      false;
  }

  return policy;
};

/*
|--------------------------------------------------------------------------
| Attendance Aggregation
|--------------------------------------------------------------------------
|
| StudentAttendance stores one class-section attendance document per date.
| Only days where the selected student has an attendance record count as
| working days for that student's report-card snapshot.
|
*/

const getAttendanceScopeKey = (
  classId,
  sectionName
) => {
  return [
    getDocumentId(
      classId
    ),
    normalizeSection(
      sectionName
    ).toLowerCase()
  ].join(
    ":"
  );
};

const buildAttendanceSummary = ({
  attendanceDocuments,
  studentId,
  period
}) => {
  const summary = {
    workingDays:
      0,

    presentDays:
      0,

    absentDays:
      0,

    lateDays:
      0,

    leaveDays:
      0,

    attendancePercentage:
      0,

    periodStart:
      period.start ||
      null,

    periodEnd:
      period.end ||
      null,

    calculatedAt:
      new Date()
  };

  const normalizedStudentId =
    getDocumentId(
      studentId
    );

  (
    attendanceDocuments ||
    []
  ).forEach(
    (
      attendance
    ) => {
      const record =
        (
          attendance.records ||
          []
        ).find(
          (
            item
          ) =>
            getDocumentId(
              item.studentId
            ) ===
            normalizedStudentId
        );

      if (!record) {
        return;
      }

      summary.workingDays +=
        1;

      if (
        record.status ===
        "present"
      ) {
        summary.presentDays +=
          1;
      }

      if (
        record.status ===
        "absent"
      ) {
        summary.absentDays +=
          1;
      }

      if (
        record.status ===
        "late"
      ) {
        summary.lateDays +=
          1;
      }

      if (
        record.status ===
        "leave"
      ) {
        summary.leaveDays +=
          1;
      }
    }
  );

  if (
    summary.workingDays >
    0
  ) {
    summary.attendancePercentage =
      roundNumber(
        (
          (
            summary.presentDays +
            summary.lateDays
          ) /
          summary.workingDays
        ) *
          100,
        2
      );
  }

  return summary;
};

/*
|--------------------------------------------------------------------------
| Batch Snapshot Resources
|--------------------------------------------------------------------------
*/

const loadSnapshotResources =
  async ({
    exam,
    results,
    body = {}
  }) => {
    const studentIds =
      Array.from(
        new Set(
          results
            .map(
              (
                result
              ) =>
                getDocumentId(
                  result.studentId
                )
            )
            .filter(
              Boolean
            )
        )
      );

    const classIds =
      Array.from(
        new Set(
          results
            .map(
              (
                result
              ) =>
                getDocumentId(
                  result.classId
                )
            )
            .filter(
              Boolean
            )
        )
      );

    const [
      school,
      students,
      classes
    ] =
      await Promise.all([
        School.findById(
          exam.schoolId
        ),

        Student.find({
          _id: {
            $in:
              studentIds
          },

          schoolId:
            exam.schoolId,

          isDeleted: {
            $ne:
              true
          }
        }).lean(),

        Class.find({
          _id: {
            $in:
              classIds
          },

          schoolId:
            exam.schoolId,

          isDeleted: {
            $ne:
              true
          }
        }).lean()
      ]);

    if (!school) {
      throw new ReportCardControllerError(
        "School record could not be found for report-card snapshot",
        404
      );
    }

    const studentMap =
      new Map(
        students.map(
          (
            student
          ) => [
            getDocumentId(
              student
            ),
            student
          ]
        )
      );

    const classMap =
      new Map(
        classes.map(
          (
            classRecord
          ) => [
            getDocumentId(
              classRecord
            ),
            classRecord
          ]
        )
      );

    const missingStudents =
      studentIds.filter(
        (
          studentId
        ) =>
          !studentMap.has(
            studentId
          )
      );

    if (
      missingStudents.length >
      0
    ) {
      throw new ReportCardControllerError(
        "One or more student records required for report cards could not be found",
        409,
        {
          missingStudentIds:
            missingStudents
        }
      );
    }

    const missingClasses =
      classIds.filter(
        (
          classId
        ) =>
          !classMap.has(
            classId
          )
      );

    if (
      missingClasses.length >
      0
    ) {
      throw new ReportCardControllerError(
        "One or more class records required for report cards could not be found",
        409,
        {
          missingClassIds:
            missingClasses
        }
      );
    }

    const attendancePeriod =
      resolveAttendancePeriod(
        exam,
        body
      );

    const attendanceByScope =
      new Map();

    const includeAttendance =
      exam.resultSettings
        ?.includeAttendance !==
      false;

    if (
      includeAttendance &&
      attendancePeriod.start &&
      attendancePeriod.end
    ) {
      const scopes =
        Array.from(
          new Map(
            results.map(
              (
                result
              ) => {
                const key =
                  getAttendanceScopeKey(
                    result.classId,
                    result.sectionName
                  );

                return [
                  key,
                  {
                    classId:
                      result.classId,

                    sectionName:
                      normalizeSection(
                        result.sectionName
                      )
                  }
                ];
              }
            )
          ).values()
        );

      if (
        scopes.length >
        0
      ) {
        const attendanceDocuments =
          await StudentAttendance.find({
            schoolId:
              exam.schoolId,

            attendanceDate: {
              $gte:
                attendancePeriod.start,

              $lte:
                attendancePeriod.end
            },

            $or:
              scopes.map(
                (
                  scope
                ) => ({
                  classId:
                    scope.classId,

                  sectionName:
                    scope.sectionName
                })
              )
          })
            .select(
              "classId sectionName attendanceDate records"
            )
            .sort({
              attendanceDate:
                1
            })
            .lean();

        attendanceDocuments.forEach(
          (
            attendance
          ) => {
            const key =
              getAttendanceScopeKey(
                attendance.classId,
                attendance.sectionName
              );

            if (
              !attendanceByScope.has(
                key
              )
            ) {
              attendanceByScope.set(
                key,
                []
              );
            }

            attendanceByScope
              .get(
                key
              )
              .push(
                attendance
              );
          }
        );
      }
    }

    return {
      school,

      studentMap,

      classMap,

      attendanceByScope,

      attendancePeriod,

      includeAttendance
    };
  };

/*
|--------------------------------------------------------------------------
| Build Current Report-Card Snapshot
|--------------------------------------------------------------------------
*/

const buildSnapshotForResult = ({
  exam,
  result,
  resources,
  signatures = [],
  principalName = ""
}) => {
  const studentId =
    getDocumentId(
      result.studentId
    );

  const classId =
    getDocumentId(
      result.classId
    );

  const student =
    resources.studentMap.get(
      studentId
    );

  const classRecord =
    resources.classMap.get(
      classId
    );

  if (
    !student ||
    !classRecord
  ) {
    throw new ReportCardControllerError(
      "Student or class snapshot data could not be resolved",
      409
    );
  }

  const scopeKey =
    getAttendanceScopeKey(
      result.classId,
      result.sectionName
    );

  const attendanceSummary =
    resources.includeAttendance
      ? buildAttendanceSummary({
          attendanceDocuments:
            resources
              .attendanceByScope
              .get(
                scopeKey
              ) ||
            [],

          studentId:
            result.studentId,

          period:
            resources
              .attendancePeriod
        })
      : {
          workingDays:
            0,

          presentDays:
            0,

          absentDays:
            0,

          lateDays:
            0,

          leaveDays:
            0,

          attendancePercentage:
            0,

          periodStart:
            resources
              .attendancePeriod
              .start ||
            null,

          periodEnd:
            resources
              .attendancePeriod
              .end ||
            null,

          calculatedAt:
            new Date()
        };

  const sourceResult = {
    ...getPlainData(
      result
    ),

    attendanceSummary
  };

  const context = {
    school:
      resources.school,

    student,

    exam,

    classRecord,

    signatures,

    photoUrl:
      student.studentPhoto ||
      student.photoUrl ||
      "",

    principalName:
      normalizeText(
        principalName ||
        resources.school
          ?.principalName
      )
  };

  const snapshot =
    ReportCard
      .createSnapshotFromExamResult(
        sourceResult,
        context
      );

  return {
    sourceResult,
    context,
    snapshot
  };
};

/*
|--------------------------------------------------------------------------
| Verification Code
|--------------------------------------------------------------------------
*/

const generateUniqueVerificationCode =
  async () => {
    for (
      let attempt = 0;
      attempt < 10;
      attempt += 1
    ) {
      const code =
        ReportCard
          .generateVerificationCode(
            16
          );

      const exists =
        await ReportCard.exists({
          "verification.verificationCode":
            code,

          isDeleted: {
            $ne:
              true
          }
        });

      if (!exists) {
        return code;
      }
    }

    throw new ReportCardControllerError(
      "Unable to generate a unique report-card verification code",
      500
    );
  };

/*
|--------------------------------------------------------------------------
| Verification Expiry
|--------------------------------------------------------------------------
*/

const resolveVerificationExpiry = (
  body = {}
) => {
  if (
    body
      .verificationExpiresAt ===
    undefined
  ) {
    return undefined;
  }

  if (
    body
      .verificationExpiresAt ===
      null ||
    body
      .verificationExpiresAt ===
      ""
  ) {
    return null;
  }

  return parseDate(
    body
      .verificationExpiresAt,
    "Verification expiry"
  );
};

/*
|--------------------------------------------------------------------------
| Populate Report Card
|--------------------------------------------------------------------------
*/

const populateReportCard = (
  query
) => {
  return query
    .populate(
      "schoolId",
      "schoolName schoolCode sessionYear"
    )
    .populate(
      "examId",
      "examCode examName examType academicYear academicTerm status startDate endDate resultPublicationDate"
    )
    .populate(
      "examResultId",
      "status overallResultStatus totals overallGrade positions revisionNumber"
    )
    .populate(
      "studentId",
      "name fatherName guardianName admissionNumber rollNumber studentPhoto dateOfBirth classId sectionName status studentUserId"
    )
    .populate(
      "classId",
      "className numericOrder"
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
      "issue.issuedBy",
      "name email role"
    )
    .populate(
      "publication.publishedBy",
      "name email role"
    )
    .populate(
      "verification.revokedBy",
      "name email role"
    );
};

/*
|--------------------------------------------------------------------------
| Result Selection
|--------------------------------------------------------------------------
*/

const normalizeIdArray = (
  values,
  label
) => {
  if (
    values ===
    undefined ||
    values ===
    null
  ) {
    return null;
  }

  if (
    !Array.isArray(
      values
    )
  ) {
    throw new ReportCardControllerError(
      `${label} must be an array`,
      400
    );
  }

  const ids =
    Array.from(
      new Set(
        values
          .map(
            getDocumentId
          )
          .filter(
            Boolean
          )
      )
    );

  const invalidIds =
    ids.filter(
      (
        id
      ) =>
        !isValidObjectId(
          id
        )
    );

  if (
    invalidIds.length >
    0
  ) {
    throw new ReportCardControllerError(
      `One or more ${label.toLowerCase()} are invalid`,
      400,
      {
        invalidIds
      }
    );
  }

  return ids;
};

const loadExamResultsForCards =
  async ({
    exam,
    examResultIds = null
  }) => {
    const filter = {
      schoolId:
        exam.schoolId,

      examId:
        exam._id,

      isDeleted: {
        $ne:
          true
      }
    };

    if (
      examResultIds &&
      examResultIds.length >
      0
    ) {
      filter._id = {
        $in:
          examResultIds
      };
    }

    const results =
      await ExamResult.find(
        filter
      )
        .sort({
          classId:
            1,

          sectionName:
            1,

          rollNumber:
            1,

          admissionNumber:
            1
        });

    if (
      results.length ===
      0
    ) {
      throw new ReportCardControllerError(
        "No exam results were found for report-card generation",
        404
      );
    }

    if (
      examResultIds &&
      results.length !==
        examResultIds.length
    ) {
      throw new ReportCardControllerError(
        "One or more selected exam results were not found in this exam",
        404
      );
    }

    const invalidWorkflowResults =
      results.filter(
        (
          result
        ) =>
          !GENERATABLE_RESULT_STATUSES.includes(
            result.status
          )
      );

    if (
      invalidWorkflowResults.length >
      0
    ) {
      throw new ReportCardControllerError(
        "Report cards can only be generated from approved, published or locked exam results",
        409,
        {
          invalidResults:
            invalidWorkflowResults
              .slice(
                0,
                50
              )
              .map(
                (
                  result
                ) => ({
                  resultId:
                    result._id,

                  status:
                    result.status
                })
              )
        }
      );
    }

    const incompleteResults =
      results.filter(
        (
          result
        ) =>
          !COMPLETE_RESULT_STATUSES.includes(
            result
              .overallResultStatus
          )
      );

    if (
      incompleteResults.length >
      0
    ) {
      throw new ReportCardControllerError(
        "Only complete pass or fail results can be converted into official report cards",
        409,
        {
          incompleteCount:
            incompleteResults.length
        }
      );
    }

    return results;
  };

/*
|--------------------------------------------------------------------------
| Latest Report Cards
|--------------------------------------------------------------------------
*/

const loadLatestCardsMap =
  async ({
    exam,
    resultIds
  }) => {
    const cards =
      await ReportCard.find({
        schoolId:
          exam.schoolId,

        examId:
          exam._id,

        examResultId: {
          $in:
            resultIds
        },

        isDeleted: {
          $ne:
            true
        }
      }).sort({
        examResultId:
          1,

        versionNumber:
          -1
      });

    const latestMap =
      new Map();

    cards.forEach(
      (
        card
      ) => {
        const key =
          getDocumentId(
            card.examResultId
          );

        if (
          !latestMap.has(
            key
          )
        ) {
          latestMap.set(
            key,
            card
          );
        }
      }
    );

    return latestMap;
  };

/*
|--------------------------------------------------------------------------
| Snapshot Comparison
|--------------------------------------------------------------------------
*/

const contentEquals = (
  first,
  second
) => {
  return (
    ReportCard
      .computeContentHash(
        getPlainData(
          first
        )
      ) ===
    ReportCard
      .computeContentHash(
        getPlainData(
          second
        )
      )
  );
};

/*
|--------------------------------------------------------------------------
| Build Revision Chain
|--------------------------------------------------------------------------
*/

const buildRevisionChain = ({
  latestCard,
  reason,
  changedBy
}) => {
  if (!latestCard) {
    return [];
  }

  const revisions =
    getPlainArray(
      latestCard.revisions
    );

  revisions.push({
    versionNumber:
      latestCard
        .versionNumber,

    reportCardNumber:
      latestCard
        .reportCardNumber,

    previousStatus:
      latestCard.status,

    contentHash:
      latestCard
        .verification
        ?.contentHash ||
      ReportCard
        .computeContentHash(
          latestCard.snapshot
        ),

    reason:
      normalizeText(
        reason
      ) ||
      "New report card version generated",

    changedAt:
      new Date(),

    changedBy
  });

  return revisions;
};

/*
|--------------------------------------------------------------------------
| Create New Report Card Version
|--------------------------------------------------------------------------
*/

const createReportCardVersion =
  async ({
    req,
    exam,
    result,
    snapshot,
    layout,
    accessPolicy,
    latestCard = null,
    reason =
      "Report card generated from exam result",
    verificationExpiresAt
  }) => {
    const versionNumber =
      latestCard
        ? Number(
            latestCard
              .versionNumber ||
            1
          ) +
          1
        : 1;

    const verificationCode =
      await generateUniqueVerificationCode();

    const reportCardKey =
      ReportCard
        .buildReportCardKey({
          schoolId:
            exam.schoolId,

          examResultId:
            result._id,

          versionNumber
        });

    const reportCardNumber =
      ReportCard
        .buildReportCardNumber({
          schoolCode:
            snapshot
              ?.school
              ?.schoolCode,

          academicYear:
            result.academicYear ||
            exam.academicYear,

          examCode:
            result.examCode ||
            exam.examCode,

          admissionNumber:
            result.admissionNumber,

          studentId:
            result.studentId,

          versionNumber
        });

    const card =
      new ReportCard({
        schoolId:
          exam.schoolId,

        examId:
          exam._id,

        examResultId:
          result._id,

        studentId:
          result.studentId,

        classId:
          result.classId,

        academicYear:
          result.academicYear ||
          exam.academicYear,

        sectionName:
          normalizeSection(
            result.sectionName
          ),

        reportCardNumber,

        reportCardKey,

        versionNumber,

        snapshot,

        layout,

        accessPolicy,

        verification: {
          verificationCode,

          verificationPayload:
            "",

          contentHash:
            ReportCard
              .computeContentHash({
                snapshot,
                layout,
                accessPolicy,
                versionNumber
              }),

          verificationCount:
            0,

          lastVerifiedAt:
            null,

          expiresAt:
            verificationExpiresAt ===
            undefined
              ? null
              : verificationExpiresAt,

          revokedAt:
            null,

          revokedBy:
            null,

          revocationReason:
            ""
        },

        status:
          "generated",

        revisions:
          buildRevisionChain({
            latestCard,

            reason,

            changedBy:
              req.user._id
          }),

        createdBy:
          req.user._id,

        updatedBy:
          req.user._id
      });

    card.$locals
      .verificationBaseUrl =
      getVerificationBaseUrl();

    await card.save();

    return card;
  };

/*
|--------------------------------------------------------------------------
| Summarize Report Cards
|--------------------------------------------------------------------------
*/

const summarizeReportCards = (
  cards
) => {
  const summary = {
    total:
      cards.length,

    generated:
      0,

    issued:
      0,

    published:
      0,

    revoked:
      0,

    archived:
      0,

    draft:
      0,

    pass:
      0,

    fail:
      0
  };

  cards.forEach(
    (
      card
    ) => {
      if (
        Object.prototype
          .hasOwnProperty
          .call(
            summary,
            card.status
          )
      ) {
        summary[
          card.status
        ] +=
          1;
      }

      const overallStatus =
        card.snapshot
          ?.overallResultStatus;

      if (
        overallStatus ===
        "pass"
      ) {
        summary.pass +=
          1;
      }

      if (
        overallStatus ===
        "fail"
      ) {
        summary.fail +=
          1;
      }
    }
  );

  return summary;
};

/*
|--------------------------------------------------------------------------
| Generate Report Cards
|--------------------------------------------------------------------------
|
| POST /api/report-cards/exam/:examId/generate
|
| Optional body:
|
| {
|   examResultIds: [],
|   signatures: [],
|   principalName: "",
|   layout: {},
|   accessPolicy: {},
|   attendancePeriodStart: "",
|   attendancePeriodEnd: "",
|   verificationExpiresAt: null,
|   forceNewVersion: false
| }
|
*/

exports.generateReportCards =
  async (
    req,
    res
  ) => {
    try {
      requireManagementRole(
        req
      );

      const exam =
        await loadScopedExam(
          req,
          req.params.examId
        );

      requireExamStatus({
        exam,

        allowedStatuses:
          GENERATION_EXAM_STATUSES,

        message:
          "Report cards can only be generated after exam results are approved"
      });

      if (
        exam.resultSettings
          ?.publishReportCards ===
        false
      ) {
        throw new ReportCardControllerError(
          "Report-card generation is disabled in this exam's result settings",
          409
        );
      }

      const examResultIds =
        normalizeIdArray(
          req.body
            ?.examResultIds,
          "Exam result IDs"
        );

      const suppliedSignatures =
        normalizeSignatures(
          req.body
            ?.signatures
        );

      const verificationExpiresAt =
        resolveVerificationExpiry(
          req.body ||
          {}
        );

      const results =
        await loadExamResultsForCards({
          exam,
          examResultIds
        });

      const resources =
        await loadSnapshotResources({
          exam,
          results,
          body:
            req.body ||
            {}
        });

      const resultIds =
        results.map(
          (
            result
          ) =>
            result._id
        );

      const latestCards =
        await loadLatestCardsMap({
          exam,
          resultIds
        });

      let createdCount =
        0;

      let refreshedCount =
        0;

      let versionedCount =
        0;

      let skippedCount =
        0;

      const generatedCards =
        [];

      for (
        const result
        of results
      ) {
        const resultId =
          getDocumentId(
            result
          );

        const latestCard =
          latestCards.get(
            resultId
          ) ||
          null;

        const signatures =
          suppliedSignatures !==
          undefined
            ? suppliedSignatures
            : getPlainArray(
                latestCard
                  ?.snapshot
                  ?.signatures
              );

        const {
          sourceResult,
          context,
          snapshot
        } =
          buildSnapshotForResult({
            exam,
            result,
            resources,
            signatures,
            principalName:
              req.body
                ?.principalName
          });

        const layout =
          buildLayout(
            exam,
            req.body
              ?.layout ||
              {},
            latestCard
              ?.layout ||
              null
          );

        const accessPolicy =
          buildAccessPolicy(
            exam,
            req.body
              ?.accessPolicy ||
              {},
            latestCard
              ?.accessPolicy ||
              null
          );

        if (!latestCard) {
          const card =
            await createReportCardVersion({
              req,
              exam,
              result,
              snapshot,
              layout,
              accessPolicy,
              verificationExpiresAt,
              reason:
                "Initial report card generated from approved exam result"
            });

          createdCount +=
            1;

          generatedCards.push(
            card
          );

          continue;
        }

        if (
          EDITABLE_REPORT_CARD_STATUSES.includes(
            latestCard.status
          )
        ) {
          latestCard
            .refreshSnapshotFromExamResult(
              sourceResult,
              context
            );

          latestCard.layout =
            layout;

          latestCard.accessPolicy =
            accessPolicy;

          latestCard.status =
            "generated";

          latestCard.updatedBy =
            req.user._id;

          if (
            verificationExpiresAt !==
            undefined
          ) {
            latestCard
              .verification
              .expiresAt =
              verificationExpiresAt;
          }

          latestCard.$locals
            .verificationBaseUrl =
            getVerificationBaseUrl();

          await latestCard.save();

          refreshedCount +=
            1;

          generatedCards.push(
            latestCard
          );

          continue;
        }

        if (
          IMMUTABLE_REPORT_CARD_STATUSES.includes(
            latestCard.status
          )
        ) {
          const snapshotChanged =
            !contentEquals(
              latestCard.snapshot,
              snapshot
            );

          const layoutChanged =
            !contentEquals(
              latestCard.layout,
              layout
            );

          const forceNewVersion =
            req.body
              ?.forceNewVersion ===
            true;

          if (
            !snapshotChanged &&
            !layoutChanged &&
            !forceNewVersion
          ) {
            skippedCount +=
              1;

            generatedCards.push(
              latestCard
            );

            continue;
          }

          const card =
            await createReportCardVersion({
              req,
              exam,
              result,
              snapshot,
              layout,
              accessPolicy,
              latestCard,
              verificationExpiresAt,

              reason:
                normalizeText(
                  req.body
                    ?.revisionReason
                ) ||
                "New report card version generated from updated result snapshot"
            });

          versionedCount +=
            1;

          generatedCards.push(
            card
          );

          continue;
        }

        throw new ReportCardControllerError(
          `Report card ${latestCard.reportCardNumber} cannot be regenerated from status ${latestCard.status}`,
          409
        );
      }

      await recordAuditLog({
        req,

        schoolId:
          exam.schoolId,

        action:
          "CREATE",

        module:
          "REPORT_CARD",

        recordId:
          exam._id,

        recordModel:
          "Exam",

        description:
          `${req.user.role} generated report cards for ${exam.examName}`,

        newData: {
          examId:
            exam._id,

          resultCount:
            results.length,

          createdCount,

          refreshedCount,

          versionedCount,

          skippedCount
        },

        status:
          "success"
      });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Report cards generated successfully",

          createdCount,

          refreshedCount,

          versionedCount,

          skippedCount,

          totalProcessed:
            results.length,

          reportCards:
            generatedCards.map(
              (
                card
              ) => ({
                _id:
                  card._id,

                examResultId:
                  card.examResultId,

                studentId:
                  card.studentId,

                reportCardNumber:
                  card.reportCardNumber,

                versionNumber:
                  card.versionNumber,

                status:
                  card.status,

                verificationCode:
                  card.verification
                    ?.verificationCode
              })
            )
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to generate report cards"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Exam Report Cards
|--------------------------------------------------------------------------
|
| GET /api/report-cards/exam/:examId
|
| Query:
| classId
| sectionName
| status
| overallResultStatus
| search
| page
| limit
|
*/

exports.getExamReportCards =
  async (
    req,
    res
  ) => {
    try {
      requireManagementRole(
        req
      );

      const exam =
        await loadScopedExam(
          req,
          req.params.examId
        );

      requireExamStatus({
        exam,

        allowedStatuses:
          REPORT_CARD_VIEW_EXAM_STATUSES,

        message:
          "Report cards are not available in the current exam status"
      });

      const filter = {
        schoolId:
          exam.schoolId,

        examId:
          exam._id,

        isDeleted: {
          $ne:
            true
        }
      };

      if (
        req.query.classId
      ) {
        if (
          !isValidObjectId(
            req.query.classId
          )
        ) {
          throw new ReportCardControllerError(
            "Invalid class ID format",
            400
          );
        }

        filter.classId =
          req.query.classId;
      }

      if (
        normalizeText(
          req.query
            .sectionName
        )
      ) {
        filter.sectionName =
          normalizeSection(
            req.query
              .sectionName
          );
      }

      if (
        normalizeText(
          req.query.status
        )
      ) {
        filter.status =
          normalizeText(
            req.query.status
          ).toLowerCase();
      }

      if (
        normalizeText(
          req.query
            .overallResultStatus
        )
      ) {
        filter[
          "snapshot.overallResultStatus"
        ] =
          normalizeText(
            req.query
              .overallResultStatus
          ).toLowerCase();
      }

      const search =
        normalizeText(
          req.query.search
        );

      if (search) {
        const escaped =
          search.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        filter.$or = [
          {
            reportCardNumber: {
              $regex:
                escaped,
              $options:
                "i"
            }
          },

          {
            "snapshot.student.studentName": {
              $regex:
                escaped,
              $options:
                "i"
            }
          },

          {
            "snapshot.student.admissionNumber": {
              $regex:
                escaped,
              $options:
                "i"
            }
          },

          {
            "snapshot.student.rollNumber": {
              $regex:
                escaped,
              $options:
                "i"
            }
          },

          {
            "verification.verificationCode": {
              $regex:
                escaped,
              $options:
                "i"
            }
          }
        ];
      }

      const page =
        Math.max(
          1,
          Math.floor(
            toFiniteNumber(
              req.query.page,
              1
            )
          )
        );

      const limit =
        Math.min(
          100,
          Math.max(
            1,
            Math.floor(
              toFiniteNumber(
                req.query.limit,
                25
              )
            )
          )
        );

      const skip =
        (
          page -
          1
        ) *
        limit;

      const [
        total,
        reportCards,
        allCards
      ] =
        await Promise.all([
          ReportCard
            .countDocuments(
              filter
            ),

          populateReportCard(
            ReportCard.find(
              filter
            )
              .sort({
                classId:
                  1,

                sectionName:
                  1,

                "snapshot.student.rollNumber":
                  1,

                versionNumber:
                  -1
              })
              .skip(
                skip
              )
              .limit(
                limit
              )
          ),

          ReportCard.find({
            schoolId:
              exam.schoolId,

            examId:
              exam._id,

            isDeleted: {
              $ne:
                true
            }
          })
            .select(
              "status snapshot.overallResultStatus versionNumber"
            )
            .lean()
        ]);

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            total /
            limit
          )
        );

      return res
        .status(200)
        .json({
          success:
            true,

          exam: {
            _id:
              exam._id,

            examCode:
              exam.examCode,

            examName:
              exam.examName,

            academicYear:
              exam.academicYear,

            academicTerm:
              exam.academicTerm,

            status:
              exam.status,

            resultSettings:
              exam.resultSettings
          },

          summary:
            summarizeReportCards(
              allCards
            ),

          reportCards,

          pagination: {
            total,

            page,

            limit,

            totalPages,

            hasNextPage:
              page <
              totalPages,

            hasPrevPage:
              page >
              1
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to load report cards"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get One Report Card
|--------------------------------------------------------------------------
|
| GET /api/report-cards/:reportCardId
|
*/

exports.getReportCardById =
  async (
    req,
    res
  ) => {
    try {
      requireManagementRole(
        req
      );

      const reportCardId =
        req.params
          .reportCardId;

      if (
        !isValidObjectId(
          reportCardId
        )
      ) {
        throw new ReportCardControllerError(
          "Invalid report card ID format",
          400
        );
      }

      const filter = {
        _id:
          reportCardId,

        isDeleted: {
          $ne:
            true
        },

        ...getSchoolFilter(
          req
        )
      };

      const reportCard =
        await populateReportCard(
          ReportCard.findOne(
            filter
          )
        );

      if (!reportCard) {
        throw new ReportCardControllerError(
          "Report card not found or access denied",
          404
        );
      }

      return res
        .status(200)
        .json({
          success:
            true,

          reportCard
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to load report card"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Workflow Card Loader
|--------------------------------------------------------------------------
*/

const loadCardsForWorkflow =
  async ({
    exam,
    reportCardIds = null
  }) => {
    const filter = {
      schoolId:
        exam.schoolId,

      examId:
        exam._id,

      isDeleted: {
        $ne:
          true
      }
    };

    if (
      reportCardIds &&
      reportCardIds.length >
      0
    ) {
      filter._id = {
        $in:
          reportCardIds
      };
    }

    const cards =
      await ReportCard.find(
        filter
      ).sort({
        classId:
          1,

        sectionName:
          1,

        versionNumber:
          -1
      });

    if (
      cards.length ===
      0
    ) {
      throw new ReportCardControllerError(
        "No report cards are available for this action",
        404
      );
    }

    if (
      reportCardIds &&
      cards.length !==
        reportCardIds.length
    ) {
      throw new ReportCardControllerError(
        "One or more selected report cards were not found",
        404
      );
    }

    return cards;
  };

const loadWorkflowResults =
  async ({
    exam,
    cards
  }) => {
    const resultIds =
      Array.from(
        new Set(
          cards.map(
            (
              card
            ) =>
              getDocumentId(
                card
                  .examResultId
              )
          )
        )
      );

    const results =
      await ExamResult.find({
        _id: {
          $in:
            resultIds
        },

        schoolId:
          exam.schoolId,

        examId:
          exam._id,

        isDeleted: {
          $ne:
            true
        }
      });

    if (
      results.length !==
      resultIds.length
    ) {
      throw new ReportCardControllerError(
        "One or more source exam results could not be found",
        409
      );
    }

    const resultMap =
      new Map(
        results.map(
          (
            result
          ) => [
            getDocumentId(
              result
            ),
            result
          ]
        )
      );

    return {
      results,
      resultMap
    };
  };

/*
|--------------------------------------------------------------------------
| Refresh Generated Card Before Issue
|--------------------------------------------------------------------------
*/

const refreshGeneratedCard = async ({
  req,
  exam,
  card,
  result,
  resources
}) => {
  if (
    card.status !==
    "generated"
  ) {
    return card;
  }

  const signatures =
    getPlainArray(
      card.snapshot
        ?.signatures
    );

  const {
    sourceResult,
    context
  } =
    buildSnapshotForResult({
      exam,
      result,
      resources,
      signatures,
      principalName:
        card.snapshot
          ?.school
          ?.principalName
    });

  card
    .refreshSnapshotFromExamResult(
      sourceResult,
      context
    );

  card.updatedBy =
    req.user._id;

  card.$locals
    .verificationBaseUrl =
    getVerificationBaseUrl();

  await card.save();

  return card;
};

/*
|--------------------------------------------------------------------------
| Issue Report Cards
|--------------------------------------------------------------------------
|
| PATCH /api/report-cards/exam/:examId/issue
|
| A source ExamResult must already be published or locked.
|
*/

exports.issueReportCards =
  async (
    req,
    res
  ) => {
    try {
      requireManagementRole(
        req
      );

      const exam =
        await loadScopedExam(
          req,
          req.params.examId
        );

      requireExamStatus({
        exam,

        allowedStatuses:
          ISSUE_EXAM_STATUSES,

        message:
          "Report cards can only be issued after exam results are published"
      });

      const reportCardIds =
        normalizeIdArray(
          req.body
            ?.reportCardIds,
          "Report card IDs"
        );

      const cards =
        await loadCardsForWorkflow({
          exam,
          reportCardIds
        });

      const {
        results,
        resultMap
      } =
        await loadWorkflowResults({
          exam,
          cards
        });

      /*
      |--------------------------------------------------------------------------
      | Validate Everything Before Writes
      |--------------------------------------------------------------------------
      */

      cards.forEach(
        (
          card
        ) => {
          if (
            !ISSUEABLE_REPORT_CARD_STATUSES.includes(
              card.status
            )
          ) {
            throw new ReportCardControllerError(
              `Report card ${card.reportCardNumber} cannot be issued from status ${card.status}`,
              409
            );
          }

          const result =
            resultMap.get(
              getDocumentId(
                card
                  .examResultId
              )
            );

          if (
            !result ||
            !OFFICIAL_RESULT_STATUSES.includes(
              result.status
            )
          ) {
            throw new ReportCardControllerError(
              `Source result for ${card.reportCardNumber} must be published before issue`,
              409
            );
          }

          if (
            !COMPLETE_RESULT_STATUSES.includes(
              result
                .overallResultStatus
            )
          ) {
            throw new ReportCardControllerError(
              `Incomplete result cannot be issued for ${card.reportCardNumber}`,
              409
            );
          }
        }
      );

      const resources =
        await loadSnapshotResources({
          exam,
          results,
          body:
            req.body ||
            {}
        });

      let issuedCount =
        0;

      let skippedCount =
        0;

      const now =
        new Date();

      for (
        const card
        of cards
      ) {
        if (
          [
            "issued",
            "published"
          ].includes(
            card.status
          )
        ) {
          skippedCount +=
            1;

          continue;
        }

        const result =
          resultMap.get(
            getDocumentId(
              card
                .examResultId
            )
          );

        await refreshGeneratedCard({
          req,
          exam,
          card,
          result,
          resources
        });

        if (
          !card.canTransitionTo(
            "issued"
          )
        ) {
          throw new ReportCardControllerError(
            `Report card ${card.reportCardNumber} cannot move to issued`,
            409
          );
        }

        card.status =
          "issued";

        card.issue =
          card.issue ||
          {};

        card.issue.issuedAt =
          now;

        card.issue.issuedBy =
          req.user._id;

        card.updatedBy =
          req.user._id;

        card.$locals
          .verificationBaseUrl =
          getVerificationBaseUrl();

        await card.save();

        issuedCount +=
          1;
      }

      await recordAuditLog({
        req,

        schoolId:
          exam.schoolId,

        action:
          "STATUS_CHANGE",

        module:
          "REPORT_CARD",

        recordId:
          exam._id,

        recordModel:
          "Exam",

        description:
          `${req.user.role} issued report cards for ${exam.examName}`,

        newData: {
          examId:
            exam._id,

          issuedCount,

          skippedCount
        },

        status:
          "success"
      });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Report cards issued successfully",

          issuedCount,

          skippedCount
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to issue report cards"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Publish Report Cards
|--------------------------------------------------------------------------
|
| PATCH /api/report-cards/exam/:examId/publish
|
| Generated cards are automatically moved:
|
| generated -> issued -> published
|
| This preserves the ReportCard model's official workflow while keeping the
| frontend publication action simple.
|
*/

exports.publishReportCards =
  async (
    req,
    res
  ) => {
    try {
      requireManagementRole(
        req
      );

      const exam =
        await loadScopedExam(
          req,
          req.params.examId
        );

      requireExamStatus({
        exam,

        allowedStatuses:
          ISSUE_EXAM_STATUSES,

        message:
          "Report cards can only be published after exam results are published"
      });

      const reportCardIds =
        normalizeIdArray(
          req.body
            ?.reportCardIds,
          "Report card IDs"
        );

      const cards =
        await loadCardsForWorkflow({
          exam,
          reportCardIds
        });

      const {
        results,
        resultMap
      } =
        await loadWorkflowResults({
          exam,
          cards
        });

      /*
      |--------------------------------------------------------------------------
      | Validate Sources Before Writes
      |--------------------------------------------------------------------------
      */

      cards.forEach(
        (
          card
        ) => {
          if (
            !PUBLISHABLE_REPORT_CARD_STATUSES.includes(
              card.status
            )
          ) {
            throw new ReportCardControllerError(
              `Report card ${card.reportCardNumber} cannot be published from status ${card.status}`,
              409
            );
          }

          const result =
            resultMap.get(
              getDocumentId(
                card
                  .examResultId
              )
            );

          if (
            !result ||
            !OFFICIAL_RESULT_STATUSES.includes(
              result.status
            )
          ) {
            throw new ReportCardControllerError(
              `Source result for ${card.reportCardNumber} must be published before report-card publication`,
              409
            );
          }

          if (
            !COMPLETE_RESULT_STATUSES.includes(
              result
                .overallResultStatus
            )
          ) {
            throw new ReportCardControllerError(
              `Incomplete result cannot be published for ${card.reportCardNumber}`,
              409
            );
          }
        }
      );

      const resources =
        await loadSnapshotResources({
          exam,
          results,
          body:
            req.body ||
            {}
        });

      const now =
        new Date();

      let issuedCount =
        0;

      let publishedCount =
        0;

      let skippedCount =
        0;

      for (
        const card
        of cards
      ) {
        if (
          card.status ===
          "published"
        ) {
          /*
          |--------------------------------------------------------------------------
          | Optional Access-Policy Refresh
          |--------------------------------------------------------------------------
          */

          let policyChanged =
            false;

          if (
            req.body
              ?.allowPublicVerification !==
            undefined
          ) {
            card.accessPolicy
              .allowPublicVerification =
              Boolean(
                req.body
                  .allowPublicVerification
              );

            policyChanged =
              true;
          }

          if (
            req.body
              ?.showDetailedMarksOnPublicVerification !==
            undefined
          ) {
            card.accessPolicy
              .showDetailedMarksOnPublicVerification =
              Boolean(
                req.body
                  .showDetailedMarksOnPublicVerification
              );

            policyChanged =
              true;
          }

          if (
            !card.accessPolicy
              .allowPublicVerification
          ) {
            card.accessPolicy
              .showDetailedMarksOnPublicVerification =
              false;
          }

          if (
            policyChanged
          ) {
            card.accessPolicy
              .visibility =
              card.accessPolicy
                .allowPublicVerification
                ? "public_verification"
                : "student_parent";

            card.updatedBy =
              req.user._id;

            await card.save();
          }

          skippedCount +=
            1;

          continue;
        }

        const result =
          resultMap.get(
            getDocumentId(
              card
                .examResultId
            )
          );

        /*
        |--------------------------------------------------------------------------
        | Generated -> Issued
        |--------------------------------------------------------------------------
        */

        if (
          card.status ===
          "generated"
        ) {
          await refreshGeneratedCard({
            req,
            exam,
            card,
            result,
            resources
          });

          if (
            !card.canTransitionTo(
              "issued"
            )
          ) {
            throw new ReportCardControllerError(
              `Report card ${card.reportCardNumber} cannot move to issued`,
              409
            );
          }

          card.status =
            "issued";

          card.issue =
            card.issue ||
            {};

          card.issue.issuedAt =
            now;

          card.issue.issuedBy =
            req.user._id;

          card.updatedBy =
            req.user._id;

          await card.save();

          issuedCount +=
            1;
        }

        /*
        |--------------------------------------------------------------------------
        | Issued -> Published
        |--------------------------------------------------------------------------
        */

        if (
          card.status ===
          "issued"
        ) {
          if (
            !card.canTransitionTo(
              "published"
            )
          ) {
            throw new ReportCardControllerError(
              `Report card ${card.reportCardNumber} cannot move to published`,
              409
            );
          }

          card.accessPolicy =
            card.accessPolicy ||
            {};

          card.accessPolicy
            .allowStudentView =
            true;

          card.accessPolicy
            .allowParentView =
            true;

          card.accessPolicy
            .allowStudentDownload =
            exam.resultSettings
              ?.allowStudentDownload !==
            false;

          card.accessPolicy
            .allowParentDownload =
            exam.resultSettings
              ?.allowParentDownload !==
            false;

          if (
            req.body
              ?.allowPublicVerification !==
            undefined
          ) {
            card.accessPolicy
              .allowPublicVerification =
              Boolean(
                req.body
                  .allowPublicVerification
              );
          }

          if (
            req.body
              ?.showDetailedMarksOnPublicVerification !==
            undefined
          ) {
            card.accessPolicy
              .showDetailedMarksOnPublicVerification =
              Boolean(
                req.body
                  .showDetailedMarksOnPublicVerification
              );
          }

          if (
            card.accessPolicy
              .allowPublicVerification
          ) {
            card.accessPolicy
              .visibility =
              "public_verification";
          } else {
            card.accessPolicy
              .visibility =
              "student_parent";

            card.accessPolicy
              .showDetailedMarksOnPublicVerification =
              false;
          }

          card.status =
            "published";

          card.publication =
            card.publication ||
            {};

          card.publication
            .publishedAt =
            now;

          card.publication
            .publishedBy =
            req.user._id;

          card.publication
            .unpublishedAt =
            null;

          card.publication
            .unpublishedBy =
            null;

          card.updatedBy =
            req.user._id;

          card.$locals
            .verificationBaseUrl =
            getVerificationBaseUrl();

          await card.save();

          publishedCount +=
            1;
        }
      }

      await recordAuditLog({
        req,

        schoolId:
          exam.schoolId,

        action:
          "PUBLISH",

        module:
          "REPORT_CARD",

        recordId:
          exam._id,

        recordModel:
          "Exam",

        description:
          `${req.user.role} published report cards for ${exam.examName}`,

        newData: {
          examId:
            exam._id,

          issuedCount,

          publishedCount,

          skippedCount,

          publishedAt:
            now
        },

        status:
          "success"
      });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Report cards published successfully",

          issuedCount,

          publishedCount,

          skippedCount,

          publishedAt:
            now
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to publish report cards"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Public Report-Card Verification
|--------------------------------------------------------------------------
|
| GET /api/report-cards/verify/:verificationCode
|
| This endpoint intentionally does not require management role.
| Route-level authentication should therefore NOT be placed before this route.
|
| Detailed subject marks are only returned when the ReportCard access policy
| explicitly allows public verification and detailed mark display.
|
*/

exports.verifyReportCard =
  async (
    req,
    res
  ) => {
    try {
      const verificationCode =
        normalizeText(
          req.params
            .verificationCode
        );

      if (
        !verificationCode
      ) {
        throw new ReportCardControllerError(
          "Verification code is required",
          400
        );
      }

      const reportCard =
        await ReportCard.findOne(
          ReportCard
            .buildVerificationFilter(
              verificationCode
            )
        );

      if (!reportCard) {
        throw new ReportCardControllerError(
          "No valid report card was found for this verification code",
          404
        );
      }

      if (
        reportCard
          .accessPolicy
          ?.allowPublicVerification !==
        true
      ) {
        /*
        |--------------------------------------------------------------------------
        | Do not reveal existence of a private card
        |--------------------------------------------------------------------------
        */

        throw new ReportCardControllerError(
          "No publicly verifiable report card was found for this code",
          404
        );
      }

      if (
        !reportCard
          .verificationValid
      ) {
        throw new ReportCardControllerError(
          "This report-card verification code is no longer valid",
          410
        );
      }

      reportCard
        .recordVerification();

      await reportCard.save();

      const verification =
        reportCard
          .getVerificationSummary({
            includeDetailedMarks:
              true
          });

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Report card verified successfully",

          verification
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to verify report card"
      );
    }
  };