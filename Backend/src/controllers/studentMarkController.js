const mongoose = require("mongoose");

const Exam = require("../models/Exam");
const ExamSchedule = require("../models/ExamSchedule");
const StudentMark = require("../models/StudentMark");
const GradeScheme = require("../models/GradeScheme");

const Student = require("../models/Student");
const Subject = require("../models/Subject");
const Teacher = require("../models/Teacher");

const {
  createAuditLog
} = require("../utils/auditLogHelper");

/*
|--------------------------------------------------------------------------
| Student Mark Controller
|--------------------------------------------------------------------------
|
| This controller wires the missing marks-entry workflow:
|
| Teacher / Principal / Super Admin
|   1. Load assigned mark-entry workspaces
|   2. Load a class-section-subject mark sheet
|   3. Save draft/returned marks
|   4. Submit completed marks
|
| Principal / Super Admin
|   5. Review submitted marks
|   6. Return a sheet for correction
|   7. Approve a sheet for result generation
|
| Result generation and report cards are intentionally handled by separate
| controllers so the workflow remains auditable and maintainable.
|
*/

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const MARK_EDIT_EXAM_STATUSES = [
  "marks_entry"
];

const MARK_VIEW_EXAM_STATUSES = [
  "marks_entry",
  "under_review",
  "approved",
  "published",
  "locked"
];

const MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

const MARK_ENTRY_ROLES = [
  "super_admin",
  "principal",
  "teacher"
];

const VALID_ATTENDANCE_STATUSES =
  StudentMark.ATTENDANCE_STATUSES || [
    "present",
    "absent",
    "medical_leave",
    "approved_leave",
    "exempted",
    "withheld"
  ];

const EDITABLE_MARK_STATUSES = [
  "draft",
  "returned"
];

/*
|--------------------------------------------------------------------------
| Custom Error
|--------------------------------------------------------------------------
*/

class StudentMarkControllerError extends Error {
  constructor(
    message,
    statusCode = 400,
    details = null
  ) {
    super(message);

    this.name =
      "StudentMarkControllerError";

    this.statusCode =
      statusCode;

    this.details =
      details;
  }
}

/*
|--------------------------------------------------------------------------
| Helpers
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

  return String(value)
    .trim()
    .replace(/\s+/g, " ");
};

const normalizeSection = (
  value
) => {
  return normalizeText(value);
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
    Boolean(value) &&
    mongoose.Types.ObjectId.isValid(
      value
    )
  );
};

const uniqueIds = (
  values
) => {
  return Array.from(
    new Set(
      (
        Array.isArray(values)
          ? values
          : []
      )
        .map(
          getDocumentId
        )
        .filter(Boolean)
    )
  );
};

const toFiniteNumber = (
  value,
  fallback = 0
) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const number =
    Number(value);

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
    req.schoolFilter?.schoolId ||
    req.user?.schoolId
  );
};

const getPlainData = (
  document
) => {
  if (!document) {
    return null;
  }

  if (
    typeof document.toObject ===
    "function"
  ) {
    return document.toObject({
      virtuals: true
    });
  }

  return document;
};

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
        "Student mark audit log error:",
        auditError
      );
    }
  };

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
    StudentMarkControllerError
  ) {
    return res
      .status(
        error.statusCode ||
        400
      )
      .json({
        success: false,
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
        success: false,
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
            .join(", ")
      });
  }

  if (
    error.name ===
    "CastError"
  ) {
    return res
      .status(400)
      .json({
        success: false,
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
        success: false,
        message:
          "This marks record was changed by another user. Reload and try again."
      });
  }

  if (
    error.code ===
    11000
  ) {
    return res
      .status(409)
      .json({
        success: false,
        message:
          "A student mark record already exists for this exam and subject."
      });
  }

  return res
    .status(500)
    .json({
      success: false,
      message:
        fallbackMessage,
      error:
        process.env.NODE_ENV ===
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

const getExamSchoolFilter = (
  req
) => {
  if (
    isSuperAdmin(req)
  ) {
    return {};
  }

  const schoolId =
    getUserSchoolId(
      req
    );

  if (!schoolId) {
    throw new StudentMarkControllerError(
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
      throw new StudentMarkControllerError(
        "Invalid exam ID format",
        400
      );
    }

    const exam =
      await Exam.findOne({
        _id:
          examId,

        ...getExamSchoolFilter(
          req
        ),

        isDeleted: {
          $ne: true
        }
      });

    if (!exam) {
      throw new StudentMarkControllerError(
        "Exam not found or access denied",
        404
      );
    }

    return exam;
  };

/*
|--------------------------------------------------------------------------
| Teacher Identity Resolution
|--------------------------------------------------------------------------
|
| The current project stores Teacher and User as separate records. Some older
| Teacher records may not have a direct userId link. The resolver therefore:
|
| 1. Uses Teacher.userId when that schema field exists.
| 2. Falls back to the login email.
| 3. Falls back to the login phone number.
|
| This keeps existing data usable while remaining compatible with a future
| explicit Teacher.userId relationship.
|
*/

const resolveTeacherProfile =
  async (
    req
  ) => {
    if (
      req.user?.role !==
      "teacher"
    ) {
      return null;
    }

    const schoolId =
      getUserSchoolId(
        req
      );

    if (!schoolId) {
      throw new StudentMarkControllerError(
        "School is not assigned to this teacher account",
        403
      );
    }

    const orConditions =
      [];

    if (
      Teacher.schema?.path(
        "userId"
      )
    ) {
      orConditions.push({
        userId:
          req.user._id
      });
    }

    const email =
      normalizeText(
        req.user?.email
      ).toLowerCase();

    if (email) {
      orConditions.push({
        email: {
          $regex:
            `^${email.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            )}$`,
          $options:
            "i"
        }
      });
    }

    const phone =
      normalizeText(
        req.user?.phone
      );

    if (phone) {
      orConditions.push({
        phone
      });
    }

    if (
      orConditions.length ===
      0
    ) {
      throw new StudentMarkControllerError(
        "This teacher login is not linked with a teacher profile",
        403
      );
    }

    const teacher =
      await Teacher.findOne({
        schoolId,

        status:
          "active",

        isDeleted: {
          $ne: true
        },

        $or:
          orConditions
      });

    if (!teacher) {
      throw new StudentMarkControllerError(
        "No active teacher profile is linked with this login. Match the teacher profile email/phone with the teacher user account.",
        403
      );
    }

    return teacher;
  };

/*
|--------------------------------------------------------------------------
| Exam Configuration Resolution
|--------------------------------------------------------------------------
*/

const getApplicableClassEntry = (
  exam,
  classId
) => {
  return (
    exam.applicableClasses ||
    []
  ).find(
    (
      classEntry
    ) =>
      getDocumentId(
        classEntry.classId
      ) ===
      String(classId)
  );
};

const getSubjectRule = (
  exam,
  classId,
  subjectId
) => {
  return (
    exam.subjectRules ||
    []
  ).find(
    (
      rule
    ) =>
      getDocumentId(
        rule.classId
      ) ===
        String(classId) &&
      getDocumentId(
        rule.subjectId
      ) ===
        String(subjectId)
  );
};

const verifySectionAccess = ({
  classEntry,
  sectionName
}) => {
  if (!classEntry) {
    throw new StudentMarkControllerError(
      "Selected class is not assigned to this exam",
      400
    );
  }

  const normalizedSection =
    normalizeSection(
      sectionName
    );

  if (!normalizedSection) {
    throw new StudentMarkControllerError(
      "Section is required",
      400
    );
  }

  if (
    classEntry.allSections
  ) {
    return normalizedSection;
  }

  const allowedSections =
    (
      classEntry.sections ||
      []
    ).map(
      (
        value
      ) =>
        normalizeSection(
          value
        )
    );

  if (
    !allowedSections.includes(
      normalizedSection
    )
  ) {
    throw new StudentMarkControllerError(
      "Selected section is not assigned to this exam",
      400
    );
  }

  return normalizedSection;
};

const verifyTeacherAssignment =
  async ({
    req,
    teacher,
    rule,
    subject
  }) => {
    if (
      req.user?.role !==
      "teacher"
    ) {
      return;
    }

    if (!teacher) {
      throw new StudentMarkControllerError(
        "Teacher profile could not be resolved",
        403
      );
    }

    const teacherId =
      getDocumentId(
        teacher
      );

    const assignedTeacherIds =
      uniqueIds(
        rule.assignedTeacherIds
      );

    const subjectTeacherId =
      getDocumentId(
        subject?.teacherId
      );

    const allowed =
      assignedTeacherIds.includes(
        teacherId
      ) ||
      (
        assignedTeacherIds.length ===
          0 &&
        subjectTeacherId ===
          teacherId
      );

    if (!allowed) {
      throw new StudentMarkControllerError(
        "You are not assigned to enter marks for this subject",
        403
      );
    }
  };

const loadWorkspaceContext =
  async ({
    req,
    examId,
    classId,
    sectionName,
    subjectId,
    requireEditableExam = false
  }) => {
    [
      [
        "Class",
        classId
      ],
      [
        "Subject",
        subjectId
      ]
    ].forEach(
      ([
        label,
        value
      ]) => {
        if (
          !isValidObjectId(
            value
          )
        ) {
          throw new StudentMarkControllerError(
            `Invalid ${label.toLowerCase()} ID format`,
            400
          );
        }
      }
    );

    const exam =
      await loadScopedExam(
        req,
        examId
      );

    const allowedExamStatuses =
      requireEditableExam
        ? MARK_EDIT_EXAM_STATUSES
        : MARK_VIEW_EXAM_STATUSES;

    if (
      !allowedExamStatuses.includes(
        exam.status
      )
    ) {
      throw new StudentMarkControllerError(
        requireEditableExam
          ? "Marks entry is not open for this exam"
          : "Marks are not available in the current exam status",
        409,
        {
          examStatus:
            exam.status,
          allowedExamStatuses
        }
      );
    }

    const classEntry =
      getApplicableClassEntry(
        exam,
        classId
      );

    const normalizedSection =
      verifySectionAccess({
        classEntry,
        sectionName
      });

    const rule =
      getSubjectRule(
        exam,
        classId,
        subjectId
      );

    if (!rule) {
      throw new StudentMarkControllerError(
        "Selected subject is not assigned to this class in the exam",
        400
      );
    }

    const [
      subject,
      teacher,
      gradeScheme
    ] =
      await Promise.all([
        Subject.findOne({
          _id:
            subjectId,
          schoolId:
            exam.schoolId,
          classId,
          isDeleted: {
            $ne: true
          }
        }),

        resolveTeacherProfile(
          req
        ),

        exam.resultSettings
          ?.gradeSchemeId
          ? GradeScheme.findOne({
              _id:
                exam.resultSettings
                  .gradeSchemeId,
              schoolId:
                exam.schoolId,
              isDeleted: {
                $ne: true
              }
            })
          : Promise.resolve(
              null
            )
      ]);

    if (!subject) {
      throw new StudentMarkControllerError(
        "Subject not found in the exam school/class",
        404
      );
    }

    await verifyTeacherAssignment({
      req,
      teacher,
      rule,
      subject
    });

    return {
      exam,
      classEntry,
      sectionName:
        normalizedSection,
      rule,
      subject,
      teacher,
      gradeScheme
    };
  };

/*
|--------------------------------------------------------------------------
| Assessment Rule Snapshot
|--------------------------------------------------------------------------
*/

const buildAssessmentRuleSnapshot = ({
  exam,
  rule
}) => {
  return {
    maxMarks:
      toFiniteNumber(
        rule.maxMarks
      ),

    passingMarks:
      toFiniteNumber(
        rule.passingMarks
      ),

    theoryMaxMarks:
      toFiniteNumber(
        rule.theoryMarks
      ),

    practicalMaxMarks:
      toFiniteNumber(
        rule.practicalMarks
      ),

    internalMaxMarks:
      toFiniteNumber(
        rule.internalMarks
      ),

    weightagePercentage:
      toFiniteNumber(
        rule.weightagePercentage,
        100
      ),

    isOptional:
      Boolean(
        rule.isOptional
      ),

    allowGraceMarks:
      Boolean(
        rule.allowGraceMarks
      ),

    graceMarksLimit:
      toFiniteNumber(
        rule.graceMarksLimit
      ),

    percentagePrecision:
      Number(
        exam.resultSettings
          ?.percentagePrecision ??
        2
      )
  };
};

/*
|--------------------------------------------------------------------------
| Exam Schedule Linkage
|--------------------------------------------------------------------------
*/

const getMatchingScheduleIds =
  async ({
    exam,
    classId,
    sectionName,
    subjectId
  }) => {
    const schedules =
      await ExamSchedule.find({
        schoolId:
          exam.schoolId,
        examId:
          exam._id,
        classId,
        subjectId,
        isDeleted: {
          $ne: true
        }
      })
        .select(
          "_id allSections sections status"
        )
        .lean();

    return schedules
      .filter(
        (
          schedule
        ) =>
          schedule.allSections ||
          (
            schedule.sections ||
            []
          )
            .map(
              normalizeSection
            )
            .includes(
              normalizeSection(
                sectionName
              )
            )
      )
      .map(
        (
          schedule
        ) =>
          schedule._id
      );
  };

/*
|--------------------------------------------------------------------------
| Mark Sheet Query
|--------------------------------------------------------------------------
*/

const buildSheetFilter = ({
  exam,
  classId,
  sectionName,
  subjectId
}) => {
  return {
    schoolId:
      exam.schoolId,
    examId:
      exam._id,
    classId,
    sectionName:
      normalizeSection(
        sectionName
      ),
    subjectId,
    isDeleted: {
      $ne: true
    }
  };
};

const populateStudentMark = (
  query
) => {
  return query
    .populate(
      "studentId",
      "name fatherName admissionNumber rollNumber studentPhoto classId sectionName status studentUserId"
    )
    .populate(
      "classId",
      "className numericOrder"
    )
    .populate(
      "subjectId",
      "subjectCode subjectName classId"
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
      "submission.submittedBy",
      "name email role"
    )
    .populate(
      "review.reviewedBy",
      "name email role"
    )
    .populate(
      "review.approvedBy",
      "name email role"
    )
    .populate(
      "review.returnedBy",
      "name email role"
    );
};

const getActiveStudents =
  async ({
    exam,
    classId,
    sectionName
  }) => {
    return Student.find({
      schoolId:
        exam.schoolId,
      classId,
      sectionName:
        normalizeSection(
          sectionName
        ),
      status:
        "active",
      isDeleted: {
        $ne: true
      }
    })
      .select(
        "name fatherName admissionNumber rollNumber studentPhoto classId sectionName status studentUserId"
      )
      .sort({
        rollNumber:
          1,
        admissionNumber:
          1,
        name:
          1
      })
      .lean();
  };

/*
|--------------------------------------------------------------------------
| Grade Application
|--------------------------------------------------------------------------
*/

const applyMarkGrade = (
  mark,
  gradeScheme
) => {
  if (
    !gradeScheme ||
    ![
      "pass",
      "fail"
    ].includes(
      mark.resultStatus
    )
  ) {
    mark.applyGradeResolution(
      null
    );

    return;
  }

  const resolvedGrade =
    gradeScheme.resolveGrade(
      mark.scores
        ?.percentage
    );

  mark.applyGradeResolution(
    resolvedGrade,
    gradeScheme._id
  );
};

/*
|--------------------------------------------------------------------------
| Row Validation / Normalization
|--------------------------------------------------------------------------
*/

const validateScore = ({
  label,
  value,
  maximum
}) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    throw new StudentMarkControllerError(
      `${label} must be a valid number`,
      400
    );
  }

  if (
    number < 0
  ) {
    throw new StudentMarkControllerError(
      `${label} cannot be negative`,
      400
    );
  }

  if (
    maximum !== null &&
    maximum !== undefined &&
    number >
      Number(maximum)
  ) {
    throw new StudentMarkControllerError(
      `${label} cannot exceed ${maximum}`,
      400
    );
  }
};

const normalizeMarkInput = ({
  row,
  assessmentRule
}) => {
  const attendanceStatus =
    normalizeText(
      row.attendanceStatus ||
      "present"
    );

  if (
    !VALID_ATTENDANCE_STATUSES.includes(
      attendanceStatus
    )
  ) {
    throw new StudentMarkControllerError(
      `Invalid exam attendance status for student ${row.studentId}`,
      400
    );
  }

  const present =
    attendanceStatus ===
    "present";

  const theoryProvided =
    row.theoryMarks !==
      undefined &&
    row.theoryMarks !==
      null &&
    row.theoryMarks !==
      "";

  const practicalProvided =
    row.practicalMarks !==
      undefined &&
    row.practicalMarks !==
      null &&
    row.practicalMarks !==
      "";

  const internalProvided =
    row.internalMarks !==
      undefined &&
    row.internalMarks !==
      null &&
    row.internalMarks !==
      "";

  if (present) {
    validateScore({
      label:
        "Theory marks",
      value:
        row.theoryMarks,
      maximum:
        assessmentRule
          .theoryMaxMarks
    });

    validateScore({
      label:
        "Practical marks",
      value:
        row.practicalMarks,
      maximum:
        assessmentRule
          .practicalMaxMarks
    });

    validateScore({
      label:
        "Internal marks",
      value:
        row.internalMarks,
      maximum:
        assessmentRule
          .internalMaxMarks
    });

    validateScore({
      label:
        "Grace marks",
      value:
        row.graceMarks,
      maximum:
        assessmentRule
          .allowGraceMarks
          ? assessmentRule
              .graceMarksLimit
          : 0
    });

    validateScore({
      label:
        "Deduction marks",
      value:
        row.deductionMarks,
      maximum:
        assessmentRule
          .maxMarks
    });
  }

  return {
    attendanceStatus,

    entryFlags: {
      theoryEntered:
        present &&
        theoryProvided,

      practicalEntered:
        present &&
        practicalProvided,

      internalEntered:
        present &&
        internalProvided,

      overallEntered:
        present &&
        (
          theoryProvided ||
          practicalProvided ||
          internalProvided
        )
    },

    scores: {
      theoryMarks:
        present
          ? toFiniteNumber(
              row.theoryMarks
            )
          : 0,

      practicalMarks:
        present
          ? toFiniteNumber(
              row.practicalMarks
            )
          : 0,

      internalMarks:
        present
          ? toFiniteNumber(
              row.internalMarks
            )
          : 0,

      graceMarks:
        present
          ? toFiniteNumber(
              row.graceMarks
            )
          : 0,

      deductionMarks:
        present
          ? toFiniteNumber(
              row.deductionMarks
            )
          : 0
    },

    teacherRemarks:
      normalizeText(
        row.teacherRemarks
      )
  };
};

/*
|--------------------------------------------------------------------------
| Mark Sheet Summary
|--------------------------------------------------------------------------
*/

const summarizeMarkRecords = (
  marks
) => {
  const summary = {
    total:
      marks.length,

    byStatus: {},

    byResultStatus: {},

    completed:
      0,

    pending:
      0
  };

  marks.forEach(
    (
      mark
    ) => {
      const status =
        mark.status ||
        "draft";

      const resultStatus =
        mark.resultStatus ||
        "pending";

      summary.byStatus[
        status
      ] =
        Number(
          summary.byStatus[
            status
          ] ||
          0
        ) +
        1;

      summary.byResultStatus[
        resultStatus
      ] =
        Number(
          summary.byResultStatus[
            resultStatus
          ] ||
          0
        ) +
        1;

      if (
        resultStatus ===
        "pending"
      ) {
        summary.pending +=
          1;
      } else {
        summary.completed +=
          1;
      }
    }
  );

  const statuses =
    Object.keys(
      summary.byStatus
    );

  if (
    statuses.length ===
    0
  ) {
    summary.sheetStatus =
      "not_started";
  } else if (
    statuses.length ===
      1
  ) {
    summary.sheetStatus =
      statuses[0];
  } else if (
    statuses.includes(
      "returned"
    )
  ) {
    summary.sheetStatus =
      "returned";
  } else if (
    statuses.every(
      (
        status
      ) =>
        [
          "approved",
          "published",
          "locked"
        ].includes(
          status
        )
    )
  ) {
    summary.sheetStatus =
      "approved";
  } else if (
    statuses.every(
      (
        status
      ) =>
        [
          "submitted",
          "approved",
          "published",
          "locked"
        ].includes(
          status
        )
    )
  ) {
    summary.sheetStatus =
      "submitted";
  } else {
    summary.sheetStatus =
      "mixed";
  }

  return summary;
};

/*
|--------------------------------------------------------------------------
| Get Marks Workspaces
|--------------------------------------------------------------------------
|
| GET /api/exam-marks/workspaces
|
| Teacher:
| - Only assigned subject rules are returned.
|
| Principal / Super Admin:
| - All subject rules in the selected school/exam scope are returned.
|
*/

exports.getMarkWorkspaces =
  async (
    req,
    res
  ) => {
    try {
      if (
        !MARK_ENTRY_ROLES.includes(
          req.user?.role
        )
      ) {
        throw new StudentMarkControllerError(
          "You are not allowed to access exam marks",
          403
        );
      }

      const schoolFilter =
        getExamSchoolFilter(
          req
        );

      const requestedExamId =
        normalizeText(
          req.query.examId
        );

      const filter = {
        ...schoolFilter,

        isDeleted: {
          $ne: true
        },

        status: {
          $in:
            MARK_VIEW_EXAM_STATUSES
        }
      };

      if (
        requestedExamId
      ) {
        if (
          !isValidObjectId(
            requestedExamId
          )
        ) {
          throw new StudentMarkControllerError(
            "Invalid exam ID format",
            400
          );
        }

        filter._id =
          requestedExamId;
      }

      if (
        req.query.academicYear
      ) {
        filter.academicYear =
          normalizeText(
            req.query
              .academicYear
          );
      }

      const teacher =
        await resolveTeacherProfile(
          req
        );

      const exams =
        await Exam.find(
          filter
        )
          .populate(
            "schoolId",
            "schoolName sessionYear"
          )
          .populate(
            "applicableClasses.classId",
            "className numericOrder sections"
          )
          .populate(
            "subjectRules.subjectId",
            "subjectCode subjectName classId teacherId"
          )
          .sort({
            startDate:
              -1,
            examName:
              1
          });

      const teacherId =
        getDocumentId(
          teacher
        );

      const workspaceDescriptors =
        [];

      exams.forEach(
        (
          exam
        ) => {
          const examData =
            getPlainData(
              exam
            );

          (
            examData.subjectRules ||
            []
          ).forEach(
            (
              rule
            ) => {
              const subject =
                rule.subjectId;

              if (
                req.user?.role ===
                "teacher"
              ) {
                const assignedIds =
                  uniqueIds(
                    rule.assignedTeacherIds
                  );

                const fallbackTeacherId =
                  getDocumentId(
                    subject?.teacherId
                  );

                const assigned =
                  assignedIds.includes(
                    teacherId
                  ) ||
                  (
                    assignedIds.length ===
                      0 &&
                    fallbackTeacherId ===
                      teacherId
                  );

                if (!assigned) {
                  return;
                }
              }

              const classEntry =
                (
                  examData.applicableClasses ||
                  []
                ).find(
                  (
                    item
                  ) =>
                    getDocumentId(
                      item.classId
                    ) ===
                    getDocumentId(
                      rule.classId
                    )
                );

              if (!classEntry) {
                return;
              }

              const classDocument =
                classEntry.classId;

              let sections =
                [];

              if (
                classEntry.allSections
              ) {
                sections =
                  (
                    classDocument
                      ?.sections ||
                    []
                  )
                    .map(
                      (
                        section
                      ) =>
                        normalizeSection(
                          section.sectionName ||
                          section
                        )
                    )
                    .filter(Boolean);
              } else {
                sections =
                  (
                    classEntry.sections ||
                    []
                  )
                    .map(
                      normalizeSection
                    )
                    .filter(Boolean);
              }

              sections.forEach(
                (
                  sectionName
                ) => {
                  workspaceDescriptors.push({
                    examId:
                      examData._id,
                    examCode:
                      examData.examCode,
                    examName:
                      examData.examName,
                    examStatus:
                      examData.status,
                    academicYear:
                      examData.academicYear,
                    academicTerm:
                      examData.academicTerm,
                    schoolId:
                      examData.schoolId,
                    classId:
                      getDocumentId(
                        rule.classId
                      ),
                    className:
                      classDocument
                        ?.className ||
                      "",
                    sectionName,
                    subjectId:
                      getDocumentId(
                        subject
                      ),
                    subjectCode:
                      subject
                        ?.subjectCode ||
                      "",
                    subjectName:
                      subject
                        ?.subjectName ||
                      "",
                    assessmentRule:
                      buildAssessmentRuleSnapshot({
                        exam,
                        rule
                      })
                  });
                }
              );
            }
          );
        }
      );

      const markGroups =
        workspaceDescriptors.length >
          0
          ? await StudentMark.aggregate([
              {
                $match: {
                  ...(
                    schoolFilter.schoolId
                      ? {
                          schoolId:
                            new mongoose.Types.ObjectId(
                              schoolFilter.schoolId
                            )
                        }
                      : {}
                  ),

                  examId: {
                    $in:
                      uniqueIds(
                        workspaceDescriptors.map(
                          (
                            workspace
                          ) =>
                            workspace.examId
                        )
                      ).map(
                        (
                          id
                        ) =>
                          new mongoose.Types.ObjectId(
                            id
                          )
                      )
                  },

                  isDeleted: {
                    $ne: true
                  }
                }
              },
              {
                $group: {
                  _id: {
                    examId:
                      "$examId",
                    classId:
                      "$classId",
                    sectionName:
                      "$sectionName",
                    subjectId:
                      "$subjectId",
                    status:
                      "$status",
                    resultStatus:
                      "$resultStatus"
                  },
                  count: {
                    $sum:
                      1
                  }
                }
              }
            ])
          : [];

      const markGroupMap =
        new Map();

      markGroups.forEach(
        (
          group
        ) => {
          const baseKey = [
            getDocumentId(
              group._id.examId
            ),
            getDocumentId(
              group._id.classId
            ),
            normalizeSection(
              group._id.sectionName
            ),
            getDocumentId(
              group._id.subjectId
            )
          ].join(":");

          if (
            !markGroupMap.has(
              baseKey
            )
          ) {
            markGroupMap.set(
              baseKey,
              []
            );
          }

          const rows =
            markGroupMap.get(
              baseKey
            );

          for (
            let index =
              0;
            index <
              Number(
                group.count ||
                0
              );
            index +=
              1
          ) {
            rows.push({
              status:
                group._id.status,
              resultStatus:
                group._id
                  .resultStatus
            });
          }
        }
      );

      const workspaces =
        workspaceDescriptors.map(
          (
            workspace
          ) => {
            const key = [
              getDocumentId(
                workspace.examId
              ),
              getDocumentId(
                workspace.classId
              ),
              normalizeSection(
                workspace.sectionName
              ),
              getDocumentId(
                workspace.subjectId
              )
            ].join(":");

            return {
              ...workspace,
              summary:
                summarizeMarkRecords(
                  markGroupMap.get(
                    key
                  ) ||
                  []
                )
            };
          }
        );

      return res
        .status(200)
        .json({
          success: true,
          count:
            workspaces.length,
          teacher:
            teacher
              ? {
                  _id:
                    teacher._id,
                  employeeId:
                    teacher.employeeId,
                  name:
                    teacher.name
                }
              : null,
          workspaces
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to load marks workspaces"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Mark Sheet
|--------------------------------------------------------------------------
|
| GET /api/exam-marks/sheet
| ?examId=
| &classId=
| &sectionName=
| &subjectId=
|
*/

exports.getMarkSheet =
  async (
    req,
    res
  ) => {
    try {
      const {
        examId,
        classId,
        sectionName,
        subjectId
      } =
        req.query;

      const context =
        await loadWorkspaceContext({
          req,
          examId,
          classId,
          sectionName,
          subjectId,
          requireEditableExam:
            false
        });

      const [
        students,
        marks,
        scheduleIds
      ] =
        await Promise.all([
          getActiveStudents({
            exam:
              context.exam,
            classId,
            sectionName:
              context.sectionName
          }),

          populateStudentMark(
            StudentMark.find(
              buildSheetFilter({
                exam:
                  context.exam,
                classId,
                sectionName:
                  context.sectionName,
                subjectId
              })
            )
          ).sort({
            studentAdmissionNumber:
              1
          }),

          getMatchingScheduleIds({
            exam:
              context.exam,
            classId,
            sectionName:
              context.sectionName,
            subjectId
          })
        ]);

      const markMap =
        new Map(
          marks.map(
            (
              mark
            ) => [
              getDocumentId(
                mark.studentId
              ),
              mark
            ]
          )
        );

      const assessmentRule =
        buildAssessmentRuleSnapshot({
          exam:
            context.exam,
          rule:
            context.rule
        });

      const rows =
        students.map(
          (
            student
          ) => {
            const mark =
              markMap.get(
                getDocumentId(
                  student
                )
              );

            if (mark) {
              return {
                student,
                mark
              };
            }

            return {
              student,
              mark: {
                _id:
                  null,
                studentId:
                  student._id,
                attendanceStatus:
                  "present",
                entryFlags: {
                  theoryEntered:
                    false,
                  practicalEntered:
                    false,
                  internalEntered:
                    false,
                  overallEntered:
                    false
                },
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
                  "pending",
                grade: {},
                teacherRemarks:
                  "",
                principalRemarks:
                  "",
                status:
                  "draft",
                isNew:
                  true
              }
            };
          }
        );

      const summary =
        summarizeMarkRecords(
          marks
        );

      return res
        .status(200)
        .json({
          success: true,

          exam: {
            _id:
              context.exam._id,
            examCode:
              context.exam.examCode,
            examName:
              context.exam.examName,
            examType:
              context.exam.examType,
            academicYear:
              context.exam.academicYear,
            academicTerm:
              context.exam.academicTerm,
            status:
              context.exam.status,
            marksEntryOpensAt:
              context.exam
                .marksEntryOpensAt,
            marksEntryClosesAt:
              context.exam
                .marksEntryClosesAt
          },

          classId,
          sectionName:
            context.sectionName,

          subject: {
            _id:
              context.subject._id,
            subjectCode:
              context.subject
                .subjectCode,
            subjectName:
              context.subject
                .subjectName
          },

          assessmentRule,

          gradeScheme:
            context.gradeScheme
              ? {
                  _id:
                    context.gradeScheme
                      ._id,
                  schemeCode:
                    context.gradeScheme
                      .schemeCode,
                  schemeName:
                    context.gradeScheme
                      .schemeName,
                  status:
                    context.gradeScheme
                      .status
                }
              : null,

          examScheduleIds:
            scheduleIds,

          summary: {
            ...summary,
            activeStudentCount:
              students.length,
            savedMarkCount:
              marks.length,
            missingMarkCount:
              Math.max(
                0,
                students.length -
                marks.length
              )
          },

          editable:
            MARK_EDIT_EXAM_STATUSES.includes(
              context.exam.status
            ) &&
            (
              marks.length ===
                0 ||
              marks.every(
                (
                  mark
                ) =>
                  EDITABLE_MARK_STATUSES.includes(
                    mark.status
                  )
              )
            ),

          rows
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to load student mark sheet"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Save Mark Sheet
|--------------------------------------------------------------------------
|
| PUT /api/exam-marks/sheet
|
| Body:
| {
|   examId,
|   classId,
|   sectionName,
|   subjectId,
|   rows: [
|     {
|       studentId,
|       attendanceStatus,
|       theoryMarks,
|       practicalMarks,
|       internalMarks,
|       graceMarks,
|       deductionMarks,
|       teacherRemarks
|     }
|   ]
| }
|
*/

exports.saveMarkSheet =
  async (
    req,
    res
  ) => {
    try {
      const {
        examId,
        classId,
        sectionName,
        subjectId
      } =
        req.body;

      const rows =
        Array.isArray(
          req.body.rows
        )
          ? req.body.rows
          : [];

      if (
        rows.length ===
        0
      ) {
        throw new StudentMarkControllerError(
          "At least one student mark row is required",
          400
        );
      }

      const context =
        await loadWorkspaceContext({
          req,
          examId,
          classId,
          sectionName,
          subjectId,
          requireEditableExam:
            true
        });

      const [
        students,
        scheduleIds
      ] =
        await Promise.all([
          getActiveStudents({
            exam:
              context.exam,
            classId,
            sectionName:
              context.sectionName
          }),

          getMatchingScheduleIds({
            exam:
              context.exam,
            classId,
            sectionName:
              context.sectionName,
            subjectId
          })
        ]);

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

      const requestedStudentIds =
        uniqueIds(
          rows.map(
            (
              row
            ) =>
              row.studentId
          )
        );

      if (
        requestedStudentIds.length !==
        rows.length
      ) {
        throw new StudentMarkControllerError(
          "Duplicate or missing student IDs were found in the mark sheet",
          400
        );
      }

      requestedStudentIds.forEach(
        (
          studentId
        ) => {
          if (
            !isValidObjectId(
              studentId
            ) ||
            !studentMap.has(
              studentId
            )
          ) {
            throw new StudentMarkControllerError(
              "One or more students do not belong to the selected class and section",
              400
            );
          }
        }
      );

      const assessmentRule =
        buildAssessmentRuleSnapshot({
          exam:
            context.exam,
          rule:
            context.rule
        });

      const existingMarks =
        await StudentMark.find(
          buildSheetFilter({
            exam:
              context.exam,
            classId,
            sectionName:
              context.sectionName,
            subjectId
          })
        );

      const existingMarkMap =
        new Map(
          existingMarks.map(
            (
              mark
            ) => [
              getDocumentId(
                mark.studentId
              ),
              mark
            ]
          )
        );

      const savedMarks =
        [];

      for (
        const row
        of rows
      ) {
        const studentId =
          getDocumentId(
            row.studentId
          );

        const student =
          studentMap.get(
            studentId
          );

        const normalized =
          normalizeMarkInput({
            row,
            assessmentRule
          });

        let mark =
          existingMarkMap.get(
            studentId
          );

        if (
          mark &&
          !EDITABLE_MARK_STATUSES.includes(
            mark.status
          )
        ) {
          throw new StudentMarkControllerError(
            `${student.name}'s mark is ${mark.status} and cannot be edited`,
            409,
            {
              studentId,
              status:
                mark.status
            }
          );
        }

        if (!mark) {
          mark =
            new StudentMark({
              schoolId:
                context.exam
                  .schoolId,

              examId:
                context.exam
                  ._id,

              examScheduleIds:
                scheduleIds,

              academicYear:
                context.exam
                  .academicYear,

              classId,

              sectionName:
                context.sectionName,

              subjectId,

              studentId:
                student._id,

              markKey:
                StudentMark
                  .buildMarkKey({
                    schoolId:
                      context.exam
                        .schoolId,
                    examId:
                      context.exam
                        ._id,
                    studentId:
                      student._id,
                    subjectId
                  }),

              studentAdmissionNumber:
                student.admissionNumber ||
                "",

              studentRollNumber:
                student.rollNumber ||
                "",

              subjectCode:
                context.subject
                  .subjectCode ||
                "",

              assessmentRule,

              status:
                "draft",

              source:
                "manual",

              createdBy:
                req.user._id,

              updatedBy:
                req.user._id
            });
        } else {
          if (
            mark.status ===
            "returned"
          ) {
            mark.addRevisionSnapshot({
              reason:
                "Marks corrected after review return",
              changedBy:
                req.user._id
            });
          }

          mark.examScheduleIds =
            scheduleIds;

          mark.assessmentRule =
            assessmentRule;

          mark.studentAdmissionNumber =
            student.admissionNumber ||
            mark.studentAdmissionNumber ||
            "";

          mark.studentRollNumber =
            student.rollNumber ||
            mark.studentRollNumber ||
            "";

          mark.subjectCode =
            context.subject
              .subjectCode ||
            mark.subjectCode ||
            "";

          mark.updatedBy =
            req.user._id;
        }

        mark.attendanceStatus =
          normalized.attendanceStatus;

        mark.entryFlags =
          normalized.entryFlags;

        mark.scores =
          normalized.scores;

        mark.teacherRemarks =
          normalized.teacherRemarks;

        mark.recalculate();

        applyMarkGrade(
          mark,
          context.gradeScheme
        );

        await mark.save();

        savedMarks.push(
          mark
        );
      }

      const allMarks =
        await StudentMark.find(
          buildSheetFilter({
            exam:
              context.exam,
            classId,
            sectionName:
              context.sectionName,
            subjectId
          })
        );

      await recordAuditLog({
        req,
        schoolId:
          context.exam.schoolId,
        action:
          "UPDATE",
        module:
          "EXAM_MARKS",
        recordId:
          context.exam._id,
        recordModel:
          "Exam",
        description:
          `${req.user.role} saved ${savedMarks.length} mark rows for ${context.subject.subjectName}`,
        newData: {
          examId:
            context.exam._id,
          classId,
          sectionName:
            context.sectionName,
          subjectId,
          savedCount:
            savedMarks.length,
          summary:
            summarizeMarkRecords(
              allMarks
            )
        },
        status:
          "success"
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            `${savedMarks.length} student mark rows saved successfully`,
          savedCount:
            savedMarks.length,
          summary:
            summarizeMarkRecords(
              allMarks
            )
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to save student marks"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Submit Mark Sheet
|--------------------------------------------------------------------------
|
| Teacher submits the complete class-section-subject sheet for Principal
| review. Every active student must have a non-pending result state.
|
*/

exports.submitMarkSheet =
  async (
    req,
    res
  ) => {
    try {
      const {
        examId,
        classId,
        sectionName,
        subjectId
      } =
        req.body;

      const context =
        await loadWorkspaceContext({
          req,
          examId,
          classId,
          sectionName,
          subjectId,
          requireEditableExam:
            true
        });

      const students =
        await getActiveStudents({
          exam:
            context.exam,
          classId,
          sectionName:
            context.sectionName
        });

      const marks =
        await StudentMark.find(
          buildSheetFilter({
            exam:
              context.exam,
            classId,
            sectionName:
              context.sectionName,
            subjectId
          })
        );

      if (
        students.length ===
        0
      ) {
        throw new StudentMarkControllerError(
          "No active students are available in this class and section",
          409
        );
      }

      if (
        marks.length !==
        students.length
      ) {
        throw new StudentMarkControllerError(
          "Marks must be saved for every active student before submission",
          409,
          {
            activeStudentCount:
              students.length,
            markRecordCount:
              marks.length
          }
        );
      }

      const pendingMarks =
        marks.filter(
          (
            mark
          ) =>
            mark.resultStatus ===
            "pending"
        );

      if (
        pendingMarks.length >
        0
      ) {
        throw new StudentMarkControllerError(
          "Complete all required mark components before submission",
          409,
          {
            pendingStudentIds:
              pendingMarks.map(
                (
                  mark
                ) =>
                  mark.studentId
              )
          }
        );
      }

      const invalidStatuses =
        marks.filter(
          (
            mark
          ) =>
            ![
              "draft",
              "returned",
              "submitted"
            ].includes(
              mark.status
            )
        );

      if (
        invalidStatuses.length >
        0
      ) {
        throw new StudentMarkControllerError(
          "One or more mark records cannot be submitted in their current status",
          409
        );
      }

      const now =
        new Date();

      for (
        const mark
        of marks
      ) {
        if (
          mark.status ===
          "submitted"
        ) {
          continue;
        }

        if (
          !mark.canTransitionTo(
            "submitted"
          )
        ) {
          throw new StudentMarkControllerError(
            `Mark record cannot move from ${mark.status} to submitted`,
            409
          );
        }

        mark.status =
          "submitted";

        mark.submission =
          mark.submission ||
          {};

        mark.submission.submittedAt =
          now;

        mark.submission.submittedBy =
          req.user._id;

        mark.review =
          mark.review ||
          {};

        mark.review.returnReason =
          "";

        mark.updatedBy =
          req.user._id;

        await mark.save();
      }

      await recordAuditLog({
        req,
        schoolId:
          context.exam.schoolId,
        action:
          "STATUS_CHANGE",
        module:
          "EXAM_MARKS",
        recordId:
          context.exam._id,
        recordModel:
          "Exam",
        description:
          `${req.user.role} submitted marks for ${context.subject.subjectName} (${context.sectionName})`,
        newData: {
          examId:
            context.exam._id,
          classId,
          sectionName:
            context.sectionName,
          subjectId,
          markCount:
            marks.length,
          status:
            "submitted"
        },
        status:
          "success"
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Mark sheet submitted for Principal review",
          summary:
            summarizeMarkRecords(
              marks.map(
                (
                  mark
                ) => ({
                  ...getPlainData(
                    mark
                  ),
                  status:
                    "submitted"
                })
              )
            )
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to submit mark sheet"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Approve Mark Sheet
|--------------------------------------------------------------------------
|
| Principal / Super Admin only.
|
*/

exports.approveMarkSheet =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isManagementRole(
          req
        )
      ) {
        throw new StudentMarkControllerError(
          "Only Principal or Super Admin can approve marks",
          403
        );
      }

      const {
        examId,
        classId,
        sectionName,
        subjectId
      } =
        req.body;

      const context =
        await loadWorkspaceContext({
          req,
          examId,
          classId,
          sectionName,
          subjectId,
          requireEditableExam:
            false
        });

      if (
        ![
          "marks_entry",
          "under_review"
        ].includes(
          context.exam.status
        )
      ) {
        throw new StudentMarkControllerError(
          "Marks can only be approved during marks entry or exam review",
          409
        );
      }

      const marks =
        await StudentMark.find(
          buildSheetFilter({
            exam:
              context.exam,
            classId,
            sectionName:
              context.sectionName,
            subjectId
          })
        );

      if (
        marks.length ===
        0
      ) {
        throw new StudentMarkControllerError(
          "No submitted mark records were found",
          404
        );
      }

      const invalidMarks =
        marks.filter(
          (
            mark
          ) =>
            ![
              "submitted",
              "approved"
            ].includes(
              mark.status
            )
        );

      if (
        invalidMarks.length >
        0
      ) {
        throw new StudentMarkControllerError(
          "Every student mark must be submitted before sheet approval",
          409,
          {
            invalidStatuses:
              Array.from(
                new Set(
                  invalidMarks.map(
                    (
                      mark
                    ) =>
                      mark.status
                  )
                )
              )
          }
        );
      }

      const pendingMarks =
        marks.filter(
          (
            mark
          ) =>
            mark.resultStatus ===
            "pending"
        );

      if (
        pendingMarks.length >
        0
      ) {
        throw new StudentMarkControllerError(
          "Pending student marks cannot be approved",
          409
        );
      }

      const now =
        new Date();

      const reviewRemarks =
        normalizeText(
          req.body.reviewRemarks
        );

      for (
        const mark
        of marks
      ) {
        if (
          mark.status ===
          "approved"
        ) {
          continue;
        }

        if (
          !mark.canTransitionTo(
            "approved"
          )
        ) {
          throw new StudentMarkControllerError(
            `Mark record cannot move from ${mark.status} to approved`,
            409
          );
        }

        mark.status =
          "approved";

        mark.review =
          mark.review ||
          {};

        mark.review.reviewedAt =
          now;

        mark.review.reviewedBy =
          req.user._id;

        mark.review.approvedAt =
          now;

        mark.review.approvedBy =
          req.user._id;

        mark.review.returnedAt =
          null;

        mark.review.returnedBy =
          null;

        mark.review.returnReason =
          "";

        mark.review.reviewRemarks =
          reviewRemarks;

        mark.updatedBy =
          req.user._id;

        await mark.save();
      }

      await recordAuditLog({
        req,
        schoolId:
          context.exam.schoolId,
        action:
          "APPROVE",
        module:
          "EXAM_MARKS",
        recordId:
          context.exam._id,
        recordModel:
          "Exam",
        description:
          `${req.user.role} approved marks for ${context.subject.subjectName} (${context.sectionName})`,
        newData: {
          examId:
            context.exam._id,
          classId,
          sectionName:
            context.sectionName,
          subjectId,
          markCount:
            marks.length,
          status:
            "approved",
          reviewRemarks
        },
        status:
          "success"
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Mark sheet approved successfully",
          summary:
            {
              ...summarizeMarkRecords(
                marks
              ),
              sheetStatus:
                "approved",
              byStatus: {
                approved:
                  marks.length
              }
            }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to approve mark sheet"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Return Mark Sheet
|--------------------------------------------------------------------------
|
| Principal / Super Admin returns the sheet to the teacher for correction.
| If the exam is already under review, it is safely moved back to marks_entry.
|
*/

exports.returnMarkSheet =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isManagementRole(
          req
        )
      ) {
        throw new StudentMarkControllerError(
          "Only Principal or Super Admin can return marks",
          403
        );
      }

      const {
        examId,
        classId,
        sectionName,
        subjectId
      } =
        req.body;

      const returnReason =
        normalizeText(
          req.body.returnReason
        );

      if (!returnReason) {
        throw new StudentMarkControllerError(
          "Return reason is required",
          400
        );
      }

      const context =
        await loadWorkspaceContext({
          req,
          examId,
          classId,
          sectionName,
          subjectId,
          requireEditableExam:
            false
        });

      if (
        ![
          "marks_entry",
          "under_review"
        ].includes(
          context.exam.status
        )
      ) {
        throw new StudentMarkControllerError(
          "Marks can only be returned during marks entry or exam review",
          409
        );
      }

      const marks =
        await StudentMark.find(
          buildSheetFilter({
            exam:
              context.exam,
            classId,
            sectionName:
              context.sectionName,
            subjectId
          })
        );

      if (
        marks.length ===
        0
      ) {
        throw new StudentMarkControllerError(
          "No mark records were found for this sheet",
          404
        );
      }

      const invalidMarks =
        marks.filter(
          (
            mark
          ) =>
            ![
              "submitted",
              "approved",
              "returned"
            ].includes(
              mark.status
            )
        );

      if (
        invalidMarks.length >
        0
      ) {
        throw new StudentMarkControllerError(
          "Only submitted or approved mark sheets can be returned",
          409
        );
      }

      const now =
        new Date();

      for (
        const mark
        of marks
      ) {
        if (
          mark.status !==
          "returned"
        ) {
          mark.addRevisionSnapshot({
            reason:
              returnReason,
            changedBy:
              req.user._id
          });
        }

        mark.status =
          "returned";

        mark.review =
          mark.review ||
          {};

        mark.review.reviewedAt =
          now;

        mark.review.reviewedBy =
          req.user._id;

        mark.review.returnedAt =
          now;

        mark.review.returnedBy =
          req.user._id;

        mark.review.returnReason =
          returnReason;

        mark.review.approvedAt =
          null;

        mark.review.approvedBy =
          null;

        mark.updatedBy =
          req.user._id;

        await mark.save();
      }

      if (
        context.exam.status ===
        "under_review"
      ) {
        context.exam.status =
          "marks_entry";

        context.exam.approval =
          context.exam.approval ||
          {};

        context.exam.approval.rejectionReason =
          returnReason;

        context.exam.approval.approvedAt =
          null;

        context.exam.approval.approvedBy =
          null;

        context.exam.updatedBy =
          req.user._id;

        await context.exam.save();
      }

      await recordAuditLog({
        req,
        schoolId:
          context.exam.schoolId,
        action:
          "STATUS_CHANGE",
        module:
          "EXAM_MARKS",
        recordId:
          context.exam._id,
        recordModel:
          "Exam",
        description:
          `${req.user.role} returned marks for ${context.subject.subjectName} (${context.sectionName})`,
        oldData: {
          sheetStatus:
            "submitted_or_approved"
        },
        newData: {
          examId:
            context.exam._id,
          classId,
          sectionName:
            context.sectionName,
          subjectId,
          markCount:
            marks.length,
          sheetStatus:
            "returned",
          returnReason,
          examStatus:
            context.exam.status
        },
        status:
          "success"
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Mark sheet returned to the teacher for correction",
          examStatus:
            context.exam.status,
          returnReason,
          summary: {
            ...summarizeMarkRecords(
              marks
            ),
            sheetStatus:
              "returned",
            byStatus: {
              returned:
                marks.length
            }
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to return mark sheet"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Exam Marks Review Summary
|--------------------------------------------------------------------------
|
| GET /api/exam-marks/review/:examId
|
| Principal / Super Admin review dashboard. Groups all StudentMark records into
| class-section-subject sheets and reports submission / approval progress.
|
*/

exports.getExamMarksReview =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isManagementRole(
          req
        )
      ) {
        throw new StudentMarkControllerError(
          "Only Principal or Super Admin can review exam marks",
          403
        );
      }

      const exam =
        await loadScopedExam(
          req,
          req.params.examId
        );

      if (
        !MARK_VIEW_EXAM_STATUSES.includes(
          exam.status
        )
      ) {
        throw new StudentMarkControllerError(
          "Exam marks are not available in the current exam status",
          409
        );
      }

      const marks =
        await populateStudentMark(
          StudentMark.find({
            schoolId:
              exam.schoolId,
            examId:
              exam._id,
            isDeleted: {
              $ne: true
            }
          })
        ).sort({
          classId:
            1,
          sectionName:
            1,
          subjectId:
            1,
          studentAdmissionNumber:
            1
        });

      const sheetMap =
        new Map();

      marks.forEach(
        (
          mark
        ) => {
          const key = [
            getDocumentId(
              mark.classId
            ),
            normalizeSection(
              mark.sectionName
            ),
            getDocumentId(
              mark.subjectId
            )
          ].join(":");

          if (
            !sheetMap.has(
              key
            )
          ) {
            sheetMap.set(
              key,
              {
                classId:
                  mark.classId,
                sectionName:
                  mark.sectionName,
                subjectId:
                  mark.subjectId,
                marks: []
              }
            );
          }

          sheetMap.get(
            key
          ).marks.push(
            mark
          );
        }
      );

      const sheets =
        Array.from(
          sheetMap.values()
        ).map(
          (
            sheet
          ) => ({
            classId:
              sheet.classId,
            sectionName:
              sheet.sectionName,
            subjectId:
              sheet.subjectId,
            summary:
              summarizeMarkRecords(
                sheet.marks
              ),
            submittedAt:
              sheet.marks
                .map(
                  (
                    mark
                  ) =>
                    mark.submission
                      ?.submittedAt
                )
                .filter(Boolean)
                .sort(
                  (
                    first,
                    second
                  ) =>
                    new Date(
                      second
                    ) -
                    new Date(
                      first
                    )
                )[0] ||
              null,
            approvedAt:
              sheet.marks
                .map(
                  (
                    mark
                  ) =>
                    mark.review
                      ?.approvedAt
                )
                .filter(Boolean)
                .sort(
                  (
                    first,
                    second
                  ) =>
                    new Date(
                      second
                    ) -
                    new Date(
                      first
                    )
                )[0] ||
              null,
            returnReason:
              sheet.marks.find(
                (
                  mark
                ) =>
                  mark.review
                    ?.returnReason
              )?.review
                ?.returnReason ||
              ""
          })
        );

      const overall = {
        sheetCount:
          sheets.length,
        notStarted:
          sheets.filter(
            (
              sheet
            ) =>
              sheet.summary
                .sheetStatus ===
              "not_started"
          ).length,
        draft:
          sheets.filter(
            (
              sheet
            ) =>
              [
                "draft",
                "mixed"
              ].includes(
                sheet.summary
                  .sheetStatus
              )
          ).length,
        submitted:
          sheets.filter(
            (
              sheet
            ) =>
              sheet.summary
                .sheetStatus ===
              "submitted"
          ).length,
        returned:
          sheets.filter(
            (
              sheet
            ) =>
              sheet.summary
                .sheetStatus ===
              "returned"
          ).length,
        approved:
          sheets.filter(
            (
              sheet
            ) =>
              sheet.summary
                .sheetStatus ===
              "approved"
          ).length
      };

      return res
        .status(200)
        .json({
          success: true,
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
              exam.status
          },
          overall,
          sheets
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to load exam marks review"
      );
    }
  };
