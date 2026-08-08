const mongoose = require("mongoose");

const Exam = require("../models/Exam");
const StudentMark = require("../models/StudentMark");
const ExamResult = require("../models/ExamResult");
const GradeScheme = require("../models/GradeScheme");
const Student = require("../models/Student");

const {
  createAuditLog
} = require("../utils/auditLogHelper");

/*
|--------------------------------------------------------------------------
| Exam Result Controller
|--------------------------------------------------------------------------
|
| Principal / Super Admin workflow:
|
| 1. Generate consolidated student results from approved StudentMark rows.
| 2. Recalculate official totals and overall result status.
| 3. Apply subject and overall grades from the Exam grade scheme.
| 4. Calculate class and section rankings when enabled.
| 5. Approve complete results and move the Exam to approved.
| 6. Publish approved results and expose the Exam as published.
|
| Student / Parent portal result endpoints remain separate and will only
| expose published result snapshots later.
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

const RESULT_GENERATION_EXAM_STATUSES = [
  "under_review",
  "approved"
];

const RESULT_VIEW_EXAM_STATUSES = [
  "under_review",
  "approved",
  "published",
  "locked"
];

const RESULT_RANKING_EXAM_STATUSES = [
  "under_review",
  "approved"
];

const RESULT_APPROVAL_EXAM_STATUSES = [
  "under_review",
  "approved"
];

const RESULT_PUBLICATION_EXAM_STATUSES = [
  "approved",
  "published"
];

const APPROVED_MARK_STATUSES = [
  "approved",
  "published",
  "locked"
];

const EDITABLE_RESULT_STATUSES = [
  "draft",
  "generated",
  "under_review"
];

const APPROVABLE_RESULT_STATUSES = [
  "generated",
  "under_review",
  "approved"
];

const PUBLISHABLE_RESULT_STATUSES = [
  "approved",
  "published",
  "locked"
];

const COMPLETE_OVERALL_RESULT_STATUSES = [
  "pass",
  "fail"
];

/*
|--------------------------------------------------------------------------
| Custom Error
|--------------------------------------------------------------------------
*/

class ExamResultControllerError extends Error {
  constructor(
    message,
    statusCode = 400,
    details = null
  ) {
    super(message);

    this.name =
      "ExamResultControllerError";

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

  return String(value)
    .trim()
    .replace(/\s+/g, " ");
};

const normalizeSection = (
  value
) => {
  return normalizeText(value);
};

const normalizeSectionKey = (
  value
) => {
  return normalizeSection(value)
    .toLowerCase();
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
      ) * multiplier
    ) /
    multiplier
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

const isManagementRole = (
  req
) => {
  return MANAGEMENT_ROLES.includes(
    req.user?.role
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

const getUserSchoolId = (
  req
) => {
  return getDocumentId(
    req.schoolFilter?.schoolId ||
    req.user?.schoolId
  );
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
        "Exam result audit log error:",
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
    ExamResultControllerError
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
          "This result was changed by another user. Reload the page and try again."
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
          "An active exam result already exists for this student."
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
    throw new ExamResultControllerError(
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
      throw new ExamResultControllerError(
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
      throw new ExamResultControllerError(
        "Exam not found or access denied",
        404
      );
    }

    return exam;
  };

const requireManagementRole = (
  req
) => {
  if (
    !isManagementRole(
      req
    )
  ) {
    throw new ExamResultControllerError(
      "Only Principal or Super Admin can manage exam results",
      403
    );
  }
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
    throw new ExamResultControllerError(
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
| Population Helpers
|--------------------------------------------------------------------------
*/

const populateStudentMarks = (
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
      "review.approvedBy",
      "name email role"
    );
};

const populateExamResult = (
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
      "subjectResults.subjectId",
      "subjectCode subjectName classId"
    )
    .populate(
      "generation.generatedBy",
      "name email role"
    )
    .populate(
      "approval.submittedBy",
      "name email role"
    )
    .populate(
      "approval.reviewedBy",
      "name email role"
    )
    .populate(
      "approval.approvedBy",
      "name email role"
    )
    .populate(
      "approval.returnedBy",
      "name email role"
    )
    .populate(
      "publication.publishedBy",
      "name email role"
    )
    .populate(
      "createdBy",
      "name email role"
    )
    .populate(
      "updatedBy",
      "name email role"
    );
};

/*
|--------------------------------------------------------------------------
| Grade Scheme
|--------------------------------------------------------------------------
*/

const loadGradeScheme =
  async (
    exam
  ) => {
    const gradeSchemeId =
      getDocumentId(
        exam.resultSettings
          ?.gradeSchemeId
      );

    if (!gradeSchemeId) {
      throw new ExamResultControllerError(
        "An active grade scheme must be assigned before generating results",
        409
      );
    }

    const gradeScheme =
      await GradeScheme.findOne({
        _id:
          gradeSchemeId,
        schoolId:
          exam.schoolId,
        status:
          "active",
        isActive:
          true,
        isDeleted: {
          $ne: true
        }
      });

    if (!gradeScheme) {
      throw new ExamResultControllerError(
        "The grade scheme assigned to this exam is not active or could not be found",
        409
      );
    }

    return gradeScheme;
  };

/*
|--------------------------------------------------------------------------
| Result Rule Snapshot
|--------------------------------------------------------------------------
*/

const buildResultRules = (
  exam
) => {
  const settings =
    exam.resultSettings ||
    {};

  return {
    gradeSchemeId:
      settings.gradeSchemeId ||
      null,

    failIfAnyRequiredSubjectFailed:
      settings
        .failIfAnyRequiredSubjectFailed !==
      false,

    minimumOverallPercentage:
      toFiniteNumber(
        settings
          .minimumOverallPercentage,
        0
      ),

    includeOptionalSubjectsInTotal:
      settings
        .includeOptionalSubjectsInTotal !==
      false,

    percentagePrecision:
      Number(
        settings
          .percentagePrecision ??
        2
      ),

    rankingEnabled:
      Boolean(
        settings.rankingEnabled
      ),

    showClassPosition:
      Boolean(
        settings.rankingEnabled &&
        settings.showClassPosition
      ),

    showSectionPosition:
      Boolean(
        settings.rankingEnabled &&
        settings.showSectionPosition
      ),

    showGrade:
      settings.showGrade !==
      false,

    showGPA:
      Boolean(
        settings.showGPA
      ),

    includeAttendance:
      settings.includeAttendance !==
      false,

    includeTeacherRemarks:
      settings
        .includeTeacherRemarks !==
      false,

    includePrincipalRemarks:
      settings
        .includePrincipalRemarks !==
      false,

    allowStudentDownload:
      settings
        .allowStudentDownload !==
      false,

    allowParentDownload:
      settings
        .allowParentDownload !==
      false
  };
};

/*
|--------------------------------------------------------------------------
| Exam Configuration Maps
|--------------------------------------------------------------------------
*/

const buildExamConfiguration = (
  exam
) => {
  const classMap =
    new Map();

  const rulesByClass =
    new Map();

  const ruleMap =
    new Map();

  (
    exam.applicableClasses ||
    []
  ).forEach(
    (
      classEntry
    ) => {
      const classId =
        getDocumentId(
          classEntry.classId
        );

      if (!classId) {
        return;
      }

      classMap.set(
        classId,
        classEntry
      );
    }
  );

  (
    exam.subjectRules ||
    []
  ).forEach(
    (
      rule,
      index
    ) => {
      const classId =
        getDocumentId(
          rule.classId
        );

      const subjectId =
        getDocumentId(
          rule.subjectId
        );

      if (
        !classId ||
        !subjectId
      ) {
        return;
      }

      if (
        !rulesByClass.has(
          classId
        )
      ) {
        rulesByClass.set(
          classId,
          []
        );
      }

      const normalizedRule = {
        ...getPlainData(
          rule
        ),
        classId,
        subjectId,
        displayOrder:
          Number(
            rule.displayOrder ??
            index
          )
      };

      rulesByClass
        .get(classId)
        .push(
          normalizedRule
        );

      ruleMap.set(
        `${classId}:${subjectId}`,
        normalizedRule
      );
    }
  );

  rulesByClass.forEach(
    (
      rules
    ) => {
      rules.sort(
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
  );

  return {
    classMap,
    rulesByClass,
    ruleMap
  };
};

const isSectionAllowed = (
  classEntry,
  sectionName
) => {
  if (!classEntry) {
    return false;
  }

  if (
    classEntry.allSections
  ) {
    return Boolean(
      normalizeSection(
        sectionName
      )
    );
  }

  const sectionKey =
    normalizeSectionKey(
      sectionName
    );

  return (
    classEntry.sections ||
    []
  )
    .map(
      normalizeSectionKey
    )
    .includes(
      sectionKey
    );
};

/*
|--------------------------------------------------------------------------
| Source Mark Validation
|--------------------------------------------------------------------------
*/

const loadApprovedSourceMarks =
  async (
    exam
  ) => {
    const marks =
      await populateStudentMarks(
        StudentMark.find({
          schoolId:
            exam.schoolId,
          examId:
            exam._id,
          isDeleted: {
            $ne: true
          }
        })
          .sort({
            classId: 1,
            sectionName: 1,
            studentAdmissionNumber: 1,
            subjectId: 1
          })
      );

    if (
      marks.length ===
      0
    ) {
      throw new ExamResultControllerError(
        "No student marks are available for result generation",
        409
      );
    }

    const invalidStatuses =
      {};

    let pendingCount =
      0;

    marks.forEach(
      (
        mark
      ) => {
        if (
          !APPROVED_MARK_STATUSES.includes(
            mark.status
          )
        ) {
          invalidStatuses[
            mark.status ||
            "draft"
          ] =
            Number(
              invalidStatuses[
                mark.status ||
                "draft"
              ] ||
              0
            ) +
            1;
        }

        if (
          mark.resultStatus ===
          "pending"
        ) {
          pendingCount +=
            1;
        }
      }
    );

    if (
      Object.keys(
        invalidStatuses
      ).length >
      0
    ) {
      throw new ExamResultControllerError(
        "Every student mark must be approved before result generation",
        409,
        {
          invalidMarkStatuses:
            invalidStatuses
        }
      );
    }

    if (
      pendingCount >
      0
    ) {
      throw new ExamResultControllerError(
        "Pending subject marks must be completed before result generation",
        409,
        {
          pendingMarkCount:
            pendingCount
        }
      );
    }

    return marks;
  };

/*
|--------------------------------------------------------------------------
| Mark Coverage Validation
|--------------------------------------------------------------------------
|
| A result is generated only when each student represented in the exam has
| one approved mark record for every subject configured for that class.
|
| The active-student coverage check also catches students or sections for which
| no approved mark rows have been created yet.
|
*/

const validateMarkCoverage =
  async ({
    exam,
    marks,
    configuration
  }) => {
    const {
      classMap,
      rulesByClass,
      ruleMap
    } =
      configuration;

    const groups =
      new Map();

    const issues =
      [];

    marks.forEach(
      (
        mark
      ) => {
        const studentId =
          getDocumentId(
            mark.studentId
          );

        const classId =
          getDocumentId(
            mark.classId
          );

        const subjectId =
          getDocumentId(
            mark.subjectId
          );

        const sectionName =
          normalizeSection(
            mark.sectionName
          );

        if (!studentId) {
          issues.push({
            type:
              "missing_student",
            markId:
              getDocumentId(
                mark
              )
          });

          return;
        }

        const classEntry =
          classMap.get(
            classId
          );

        if (!classEntry) {
          issues.push({
            type:
              "class_not_in_exam",
            studentId,
            classId,
            subjectId
          });

          return;
        }

        if (
          !isSectionAllowed(
            classEntry,
            sectionName
          )
        ) {
          issues.push({
            type:
              "section_not_in_exam",
            studentId,
            classId,
            sectionName
          });

          return;
        }

        if (
          !ruleMap.has(
            `${classId}:${subjectId}`
          )
        ) {
          issues.push({
            type:
              "subject_not_in_exam",
            studentId,
            classId,
            subjectId
          });

          return;
        }

        if (
          !groups.has(
            studentId
          )
        ) {
          groups.set(
            studentId,
            {
              studentId,
              student:
                mark.studentId,
              classId,
              class:
                mark.classId,
              sectionName,
              marks: [],
              subjectIds:
                new Set()
            }
          );
        }

        const group =
          groups.get(
            studentId
          );

        if (
          group.classId !==
          classId ||
          normalizeSectionKey(
            group.sectionName
          ) !==
            normalizeSectionKey(
              sectionName
            )
        ) {
          issues.push({
            type:
              "student_scope_mismatch",
            studentId,
            existingClassId:
              group.classId,
            markClassId:
              classId,
            existingSection:
              group.sectionName,
            markSection:
              sectionName
          });

          return;
        }

        if (
          group.subjectIds.has(
            subjectId
          )
        ) {
          issues.push({
            type:
              "duplicate_subject_mark",
            studentId,
            subjectId
          });

          return;
        }

        group.subjectIds.add(
          subjectId
        );

        group.marks.push(
          mark
        );
      }
    );

    groups.forEach(
      (
        group
      ) => {
        const expectedRules =
          rulesByClass.get(
            group.classId
          ) ||
          [];

        const missingSubjectIds =
          expectedRules
            .map(
              (
                rule
              ) =>
                rule.subjectId
            )
            .filter(
              (
                subjectId
              ) =>
                !group.subjectIds.has(
                  subjectId
                )
            );

        if (
          missingSubjectIds.length >
          0
        ) {
          issues.push({
            type:
              "missing_subject_marks",
            studentId:
              group.studentId,
            admissionNumber:
              group.student
                ?.admissionNumber ||
              "",
            classId:
              group.classId,
            sectionName:
              group.sectionName,
            missingSubjectIds
          });
        }
      }
    );

    for (
      const [
        classId,
        expectedRules
      ] of rulesByClass.entries()
    ) {
      if (
        expectedRules.length ===
        0
      ) {
        continue;
      }

      const classEntry =
        classMap.get(
          classId
        );

      const studentFilter = {
        schoolId:
          exam.schoolId,
        classId,
        status:
          "active",
        isDeleted: {
          $ne: true
        }
      };

      if (
        classEntry &&
        !classEntry.allSections
      ) {
        studentFilter.sectionName = {
          $in:
            (
              classEntry.sections ||
              []
            )
              .map(
                normalizeSection
              )
              .filter(Boolean)
        };
      }

      const activeStudents =
        await Student.find(
          studentFilter
        )
          .select(
            "_id name admissionNumber rollNumber sectionName"
          )
          .lean();

      activeStudents.forEach(
        (
          student
        ) => {
          const studentId =
            getDocumentId(
              student
            );

          if (
            groups.has(
              studentId
            )
          ) {
            return;
          }

          issues.push({
            type:
              "student_marks_not_started",
            studentId,
            studentName:
              student.name ||
              "",
            admissionNumber:
              student.admissionNumber ||
              "",
            rollNumber:
              student.rollNumber ||
              "",
            classId,
            sectionName:
              normalizeSection(
                student.sectionName
              ),
            expectedSubjectCount:
              expectedRules.length
          });
        }
      );
    }

    if (
      issues.length >
      0
    ) {
      throw new ExamResultControllerError(
        "Approved marks do not completely cover the configured exam subjects",
        409,
        {
          issueCount:
            issues.length,
          issues:
            issues.slice(
              0,
              50
            )
        }
      );
    }

    return groups;
  };

/*
|--------------------------------------------------------------------------
| Grade Snapshot Helpers
|--------------------------------------------------------------------------
*/

const emptyGradeSnapshot =
  () => ({
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
  });

const buildGradeSnapshot = ({
  resolvedGrade,
  gradeSchemeId
}) => {
  if (!resolvedGrade) {
    return emptyGradeSnapshot();
  }

  return {
    gradeSchemeId:
      gradeSchemeId ||
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
};

/*
|--------------------------------------------------------------------------
| Apply Grades
|--------------------------------------------------------------------------
|
| Subject grades are recalculated from the active grade scheme rather than
| trusting a stale frontend value. The overall grade is then resolved from
| the official consolidated percentage.
|
*/

const applyGradesToResult = ({
  result,
  gradeScheme
}) => {
  const gradeSchemeId =
    gradeScheme._id;

  result.subjectResults.forEach(
    (
      subject
    ) => {
      if (
        ![
          "pass",
          "fail"
        ].includes(
          subject.resultStatus
        )
      ) {
        subject.grade =
          emptyGradeSnapshot();

        return;
      }

      const resolvedGrade =
        gradeScheme.resolveGrade(
          subject.percentage
        );

      if (!resolvedGrade) {
        throw new ExamResultControllerError(
          `No grade band matches ${subject.subjectName || "a subject"} at ${subject.percentage}%`,
          409
        );
      }

      subject.grade =
        buildGradeSnapshot({
          resolvedGrade,
          gradeSchemeId
        });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Calculate Totals
  |--------------------------------------------------------------------------
  |
  | ExamResult.recalculate() is the single source of truth for total marks,
  | percentage, GPA and overall pass/fail/incomplete/withheld status.
  |
  */

  result.recalculate();

  if (
    ![
      "pass",
      "fail"
    ].includes(
      result.overallResultStatus
    ) ||
    result.resultRules
      ?.showGrade ===
      false
  ) {
    result.applyOverallGrade(
      null
    );

    return result;
  }

  const overallGrade =
    gradeScheme.resolveGrade(
      result.totals
        ?.percentage
    );

  if (!overallGrade) {
    throw new ExamResultControllerError(
      `No grade band matches the overall percentage ${result.totals?.percentage || 0}%`,
      409
    );
  }

  result.applyOverallGrade(
    overallGrade,
    gradeSchemeId
  );

  return result;
};

/*
|--------------------------------------------------------------------------
| Prepare Student Marks for Result Snapshot
|--------------------------------------------------------------------------
*/

const prepareStudentMarks = ({
  group,
  configuration,
  resultRules
}) => {
  const {
    ruleMap
  } =
    configuration;

  return group.marks
    .map(
      (
        mark
      ) => {
        const plainMark =
          getPlainData(
            mark
          );

        const subjectId =
          getDocumentId(
            mark.subjectId
          );

        const rule =
          ruleMap.get(
            `${group.classId}:${subjectId}`
          );

        return {
          ...plainMark,

          displayOrder:
            Number(
              rule?.displayOrder ||
              0
            ),

          countsInTotal:
            !(
              Boolean(
                rule?.isOptional
              ) &&
              resultRules
                .includeOptionalSubjectsInTotal ===
                false
            ),

          assessmentRule: {
            ...(
              plainMark
                .assessmentRule ||
              {}
            ),

            isOptional:
              Boolean(
                rule?.isOptional
              )
          }
        };
      }
    )
    .sort(
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
};

/*
|--------------------------------------------------------------------------
| Upsert One Student Result
|--------------------------------------------------------------------------
*/

const upsertStudentResult =
  async ({
    exam,
    group,
    configuration,
    gradeScheme,
    userId,
    generationSource,
    requireExisting = false
  }) => {
    let result =
      await ExamResult.findOne({
        schoolId:
          exam.schoolId,
        examId:
          exam._id,
        studentId:
          group.studentId,
        isDeleted: {
          $ne: true
        }
      });

    const existed =
      Boolean(result);

    if (
      requireExisting &&
      !result
    ) {
      throw new ExamResultControllerError(
        `No generated result exists for student ${group.student?.admissionNumber || group.studentId}`,
        409
      );
    }

    if (
      result &&
      !EDITABLE_RESULT_STATUSES.includes(
        result.status
      )
    ) {
      throw new ExamResultControllerError(
        `Result for ${result.studentName || group.student?.name || group.studentId} cannot be regenerated while status is ${result.status}`,
        409
      );
    }

    if (!result) {
      result =
        new ExamResult({
          schoolId:
            exam.schoolId,
          examId:
            exam._id,
          studentId:
            group.studentId,
          createdBy:
            userId
        });
    } else {
      result.addRevisionSnapshot({
        reason:
          generationSource ===
          "recalculation"
            ? "Exam result recalculated from approved marks"
            : "Exam result regenerated from approved marks",
        changedBy:
          userId
      });
    }

    const student =
      group.student ||
      {};

    const classDocument =
      group.class ||
      {};

    const resultRules =
      buildResultRules(
        exam
      );

    result.schoolId =
      exam.schoolId;

    result.examId =
      exam._id;

    result.studentId =
      group.studentId;

    result.classId =
      group.classId;

    result.sectionName =
      group.sectionName;

    result.academicYear =
      exam.academicYear;

    result.academicTerm =
      exam.academicTerm ||
      "";

    result.examCode =
      exam.examCode ||
      "";

    result.examName =
      exam.examName ||
      "";

    result.studentName =
      student.name ||
      result.studentName ||
      "";

    result.fatherName =
      student.fatherName ||
      result.fatherName ||
      "";

    result.admissionNumber =
      student.admissionNumber ||
      result.admissionNumber ||
      "";

    result.rollNumber =
      student.rollNumber ||
      result.rollNumber ||
      "";

    result.className =
      classDocument.className ||
      result.className ||
      "";

    result.resultRules =
      resultRules;

    result.status =
      "generated";

    result.generation = {
      source:
        generationSource,
      generatedAt:
        new Date(),
      generatedBy:
        userId,
      sourceMarkCount:
        group.marks.length
    };

    result.approval = {
      submittedAt:
        null,
      submittedBy:
        null,
      reviewedAt:
        null,
      reviewedBy:
        null,
      approvedAt:
        null,
      approvedBy:
        null,
      returnedAt:
        null,
      returnedBy:
        null,
      returnReason:
        "",
      reviewRemarks:
        ""
    };

    result.publication = {
      publishedAt:
        null,
      publishedBy:
        null,
      unpublishedAt:
        null,
      unpublishedBy:
        null
    };

    result.positions = {
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

    result.updatedBy =
      userId;

    const preparedMarks =
      prepareStudentMarks({
        group,
        configuration,
        resultRules
      });

    result.replaceSubjectResultsFromMarks(
      preparedMarks
    );

    applyGradesToResult({
      result,
      gradeScheme
    });

    await result.save();

    return {
      result,
      existed
    };
  };

/*
|--------------------------------------------------------------------------
| Class Ranking
|--------------------------------------------------------------------------
*/

const calculateClassRankingMap = (
  results
) => {
  const groups =
    new Map();

  results.forEach(
    (
      result
    ) => {
      const classId =
        getDocumentId(
          result.classId
        );

      if (
        !groups.has(
          classId
        )
      ) {
        groups.set(
          classId,
          []
        );
      }

      groups.get(
        classId
      ).push(
        result
      );
    }
  );

  const rankingMap =
    new Map();

  groups.forEach(
    (
      classResults
    ) => {
      ExamResult
        .calculateRankings(
          classResults
        )
        .forEach(
          (
            ranking
          ) => {
            rankingMap.set(
              getDocumentId(
                ranking.resultId
              ),
              ranking
            );
          }
        );
    }
  );

  return rankingMap;
};

/*
|--------------------------------------------------------------------------
| Section Ranking
|--------------------------------------------------------------------------
*/

const calculateSectionRankingMap = (
  results
) => {
  const groups =
    new Map();

  results.forEach(
    (
      result
    ) => {
      const key = [
        getDocumentId(
          result.classId
        ),
        normalizeSectionKey(
          result.sectionName
        )
      ].join(":");

      if (
        !groups.has(
          key
        )
      ) {
        groups.set(
          key,
          []
        );
      }

      groups.get(
        key
      ).push(
        result
      );
    }
  );

  const rankingMap =
    new Map();

  groups.forEach(
    (
      sectionResults
    ) => {
      ExamResult
        .calculateRankings(
          sectionResults
        )
        .forEach(
          (
            ranking
          ) => {
            rankingMap.set(
              getDocumentId(
                ranking.resultId
              ),
              ranking
            );
          }
        );
    }
  );

  return rankingMap;
};

/*
|--------------------------------------------------------------------------
| Apply Class + Section Rankings
|--------------------------------------------------------------------------
*/

const applyRankingsForExam =
  async ({
    exam,
    userId
  }) => {
    const results =
      await ExamResult.find({
        schoolId:
          exam.schoolId,
        examId:
          exam._id,
        isDeleted: {
          $ne: true
        }
      });

    if (
      results.length ===
      0
    ) {
      return {
        rankedCandidateCount:
          0,
        classRankingApplied:
          false,
        sectionRankingApplied:
          false
      };
    }

    const settings =
      exam.resultSettings ||
      {};

    const rankingEnabled =
      Boolean(
        settings.rankingEnabled
      );

    const showClassPosition =
      rankingEnabled &&
      Boolean(
        settings.showClassPosition
      );

    const showSectionPosition =
      rankingEnabled &&
      Boolean(
        settings.showSectionPosition
      );

    const eligibleResults =
      results.filter(
        (
          result
        ) =>
          COMPLETE_OVERALL_RESULT_STATUSES.includes(
            result.overallResultStatus
          )
      );

    const classRankings =
      showClassPosition
        ? calculateClassRankingMap(
            eligibleResults
          )
        : new Map();

    const sectionRankings =
      showSectionPosition
        ? calculateSectionRankingMap(
            eligibleResults
          )
        : new Map();

    const calculatedAt =
      rankingEnabled
        ? new Date()
        : null;

    const operations =
      results.map(
        (
          result
        ) => {
          const resultId =
            getDocumentId(
              result
            );

          const classRanking =
            classRankings.get(
              resultId
            );

          const sectionRanking =
            sectionRankings.get(
              resultId
            );

          return {
            updateOne: {
              filter: {
                _id:
                  result._id,
                schoolId:
                  exam.schoolId,
                isDeleted: {
                  $ne: true
                }
              },

              update: {
                $set: {
                  "positions.classPosition":
                    showClassPosition &&
                    classRanking
                      ? classRanking.position
                      : null,

                  "positions.classCandidateCount":
                    showClassPosition &&
                    classRanking
                      ? classRanking.candidateCount
                      : 0,

                  "positions.sectionPosition":
                    showSectionPosition &&
                    sectionRanking
                      ? sectionRanking.position
                      : null,

                  "positions.sectionCandidateCount":
                    showSectionPosition &&
                    sectionRanking
                      ? sectionRanking.candidateCount
                      : 0,

                  "positions.calculatedAt":
                    calculatedAt,

                  updatedBy:
                    userId
                }
              }
            }
          };
        }
      );

    if (
      operations.length >
      0
    ) {
      await ExamResult.bulkWrite(
        operations
      );
    }

    return {
      rankedCandidateCount:
        eligibleResults.length,
      classRankingApplied:
        showClassPosition,
      sectionRankingApplied:
        showSectionPosition,
      calculatedAt
    };
  };

/*
|--------------------------------------------------------------------------
| Result Summary
|--------------------------------------------------------------------------
*/

const summarizeExamResults = (
  results
) => {
  const summary = {
    total:
      results.length,
    byStatus: {},
    byOverallStatus: {},
    passCount:
      0,
    failCount:
      0,
    incompleteCount:
      0,
    withheldCount:
      0,
    averagePercentage:
      0
  };

  let percentageTotal =
    0;

  let percentageCount =
    0;

  results.forEach(
    (
      result
    ) => {
      const status =
        result.status ||
        "draft";

      const overallStatus =
        result.overallResultStatus ||
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

      summary.byOverallStatus[
        overallStatus
      ] =
        Number(
          summary.byOverallStatus[
            overallStatus
          ] ||
          0
        ) +
        1;

      if (
        overallStatus ===
        "pass"
      ) {
        summary.passCount +=
          1;
      }

      if (
        overallStatus ===
        "fail"
      ) {
        summary.failCount +=
          1;
      }

      if (
        [
          "pending",
          "incomplete"
        ].includes(
          overallStatus
        )
      ) {
        summary.incompleteCount +=
          1;
      }

      if (
        overallStatus ===
        "withheld"
      ) {
        summary.withheldCount +=
          1;
      }

      if (
        [
          "pass",
          "fail"
        ].includes(
          overallStatus
        )
      ) {
        percentageTotal +=
          toFiniteNumber(
            result.totals
              ?.percentage,
            0
          );

        percentageCount +=
          1;
      }
    }
  );

  summary.averagePercentage =
    percentageCount >
    0
      ? roundNumber(
          percentageTotal /
            percentageCount,
          2
        )
      : 0;

  return summary;
};

/*
|--------------------------------------------------------------------------
| Generate / Recalculate Core
|--------------------------------------------------------------------------
*/

const generateOrRecalculateResults =
  async ({
    req,
    exam,
    generationSource,
    requireExisting = false
  }) => {
    requireExamStatus({
      exam,
      allowedStatuses:
        RESULT_GENERATION_EXAM_STATUSES,
      message:
        "Results can only be generated while the exam is under review or approved"
    });

    const [
      gradeScheme,
      marks
    ] =
      await Promise.all([
        loadGradeScheme(
          exam
        ),
        loadApprovedSourceMarks(
          exam
        )
      ]);

    const configuration =
      buildExamConfiguration(
        exam
      );

    const groups =
      await validateMarkCoverage({
        exam,
        marks,
        configuration
      });

    if (
      groups.size ===
      0
    ) {
      throw new ExamResultControllerError(
        "No students are available for consolidated result generation",
        409
      );
    }

    if (
      requireExisting
    ) {
      const existingCount =
        await ExamResult.countDocuments({
          schoolId:
            exam.schoolId,
          examId:
            exam._id,
          isDeleted: {
            $ne: true
          }
        });

      if (
        existingCount !==
        groups.size
      ) {
        throw new ExamResultControllerError(
          "Generated result records do not match the approved mark candidates. Run result generation before recalculation.",
          409,
          {
            generatedResultCount:
              existingCount,
            candidateCount:
              groups.size
          }
        );
      }
    }

    let createdCount =
      0;

    let updatedCount =
      0;

    for (
      const group
      of groups.values()
    ) {
      const {
        existed
      } =
        await upsertStudentResult({
          exam,
          group,
          configuration,
          gradeScheme,
          userId:
            req.user._id,
          generationSource,
          requireExisting
        });

      if (existed) {
        updatedCount +=
          1;
      } else {
        createdCount +=
          1;
      }
    }

    const ranking =
      await applyRankingsForExam({
        exam,
        userId:
          req.user._id
      });

    const results =
      await ExamResult.find({
        schoolId:
          exam.schoolId,
        examId:
          exam._id,
        isDeleted: {
          $ne: true
        }
      });

    return {
      createdCount,
      updatedCount,
      candidateCount:
        groups.size,
      sourceMarkCount:
        marks.length,
      ranking,
      summary:
        summarizeExamResults(
          results
        )
    };
  };

/*
|--------------------------------------------------------------------------
| Get Exam Results
|--------------------------------------------------------------------------
|
| GET /api/exam-results/:examId
|
| Optional query filters:
| classId
| sectionName
| status
| overallResultStatus
| search
| page
| limit
|
*/

exports.getExamResults =
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
          RESULT_VIEW_EXAM_STATUSES,
        message:
          "Exam results are not available in the current exam status"
      });

      const filter = {
        schoolId:
          exam.schoolId,
        examId:
          exam._id,
        isDeleted: {
          $ne: true
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
          throw new ExamResultControllerError(
            "Invalid class ID format",
            400
          );
        }

        filter.classId =
          req.query.classId;
      }

      if (
        normalizeText(
          req.query.sectionName
        )
      ) {
        filter.sectionName =
          normalizeSection(
            req.query.sectionName
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
        filter.overallResultStatus =
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
        const escapedSearch =
          search.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        filter.$or = [
          {
            studentName: {
              $regex:
                escapedSearch,
              $options:
                "i"
            }
          },
          {
            admissionNumber: {
              $regex:
                escapedSearch,
              $options:
                "i"
            }
          },
          {
            rollNumber: {
              $regex:
                escapedSearch,
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
        results,
        allResults
      ] =
        await Promise.all([
          ExamResult.countDocuments(
            filter
          ),

          populateExamResult(
            ExamResult.find(
              filter
            )
              .sort({
                classId: 1,
                sectionName: 1,
                "positions.sectionPosition": 1,
                rollNumber: 1,
                admissionNumber: 1
              })
              .skip(skip)
              .limit(limit)
          ),

          ExamResult.find({
            schoolId:
              exam.schoolId,
            examId:
              exam._id,
            isDeleted: {
              $ne: true
            }
          })
            .select(
              "status overallResultStatus totals classId sectionName"
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
              exam.status,
            resultSettings:
              exam.resultSettings
          },

          summary:
            summarizeExamResults(
              allResults
            ),

          results,

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
        "Failed to load exam results"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get One Exam Result
|--------------------------------------------------------------------------
|
| GET /api/exam-results/:examId/result/:resultId
|
*/

exports.getExamResultById =
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
          RESULT_VIEW_EXAM_STATUSES,
        message:
          "Exam results are not available in the current exam status"
      });

      if (
        !isValidObjectId(
          req.params.resultId
        )
      ) {
        throw new ExamResultControllerError(
          "Invalid result ID format",
          400
        );
      }

      const result =
        await populateExamResult(
          ExamResult.findOne({
            _id:
              req.params.resultId,
            schoolId:
              exam.schoolId,
            examId:
              exam._id,
            isDeleted: {
              $ne: true
            }
          })
        );

      if (!result) {
        throw new ExamResultControllerError(
          "Exam result not found",
          404
        );
      }

      return res
        .status(200)
        .json({
          success: true,
          result
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to load exam result"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Generate Results
|--------------------------------------------------------------------------
|
| POST /api/exam-results/:examId/generate
|
| Generation uses only approved / published / locked StudentMark records.
| Existing draft/generated/under_review results are safely regenerated and
| receive a revision snapshot. Approved or published results are protected.
|
*/

exports.generateExamResults =
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

      const generation =
        await generateOrRecalculateResults({
          req,
          exam,
          generationSource:
            "automatic",
          requireExisting:
            false
        });

      await recordAuditLog({
        req,
        schoolId:
          exam.schoolId,
        action:
          "CREATE",
        module:
          "EXAM_RESULTS",
        recordId:
          exam._id,
        recordModel:
          "Exam",
        description:
          `${req.user.role} generated consolidated results for ${exam.examName}`,
        newData: {
          examId:
            exam._id,
          ...generation
        },
        status:
          "success"
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Exam results generated successfully",
          ...generation
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to generate exam results"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Recalculate Totals + Reapply Grades
|--------------------------------------------------------------------------
|
| PATCH /api/exam-results/:examId/recalculate
|
| This operation is intentionally limited to editable generated results.
| It refreshes subject snapshots from approved marks, recalculates totals,
| reapplies grades and refreshes rankings.
|
*/

exports.recalculateExamResults =
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

      const recalculation =
        await generateOrRecalculateResults({
          req,
          exam,
          generationSource:
            "recalculation",
          requireExisting:
            true
        });

      await recordAuditLog({
        req,
        schoolId:
          exam.schoolId,
        action:
          "UPDATE",
        module:
          "EXAM_RESULTS",
        recordId:
          exam._id,
        recordModel:
          "Exam",
        description:
          `${req.user.role} recalculated consolidated results for ${exam.examName}`,
        newData: {
          examId:
            exam._id,
          ...recalculation
        },
        status:
          "success"
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Exam result totals and grades recalculated successfully",
          ...recalculation
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to recalculate exam results"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Recalculate Class + Section Rankings
|--------------------------------------------------------------------------
|
| PATCH /api/exam-results/:examId/rankings
|
*/

exports.calculateExamResultRankings =
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
          RESULT_RANKING_EXAM_STATUSES,
        message:
          "Rankings can only be recalculated before result publication"
      });

      const resultCount =
        await ExamResult.countDocuments({
          schoolId:
            exam.schoolId,
          examId:
            exam._id,
          isDeleted: {
            $ne: true
          }
        });

      if (
        resultCount ===
        0
      ) {
        throw new ExamResultControllerError(
          "Generate exam results before calculating rankings",
          409
        );
      }

      const ranking =
        await applyRankingsForExam({
          exam,
          userId:
            req.user._id
        });

      await recordAuditLog({
        req,
        schoolId:
          exam.schoolId,
        action:
          "UPDATE",
        module:
          "EXAM_RESULTS",
        recordId:
          exam._id,
        recordModel:
          "Exam",
        description:
          `${req.user.role} recalculated result rankings for ${exam.examName}`,
        newData: {
          examId:
            exam._id,
          ranking
        },
        status:
          "success"
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Class and section rankings recalculated successfully",
          ranking
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to calculate exam result rankings"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Approve Exam Results
|--------------------------------------------------------------------------
|
| PATCH /api/exam-results/:examId/approve
|
| Generated results are logically moved through generated -> under_review ->
| approved in one management action. Revision snapshots preserve both workflow
| transitions. When all results are approved, the parent Exam is also moved
| from under_review to approved.
|
| Optional body:
| reviewRemarks
|
*/

exports.approveExamResults =
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
          RESULT_APPROVAL_EXAM_STATUSES,
        message:
          "Exam results can only be approved while the exam is under review or approved"
      });

      await loadApprovedSourceMarks(
        exam
      );

      const results =
        await ExamResult.find({
          schoolId:
            exam.schoolId,
          examId:
            exam._id,
          isDeleted: {
            $ne: true
          }
        }).sort({
          classId: 1,
          sectionName: 1,
          admissionNumber: 1
        });

      if (
        results.length ===
        0
      ) {
        throw new ExamResultControllerError(
          "Generate consolidated exam results before approval",
          409
        );
      }

      const invalidStatusResults =
        results.filter(
          (
            result
          ) =>
            !APPROVABLE_RESULT_STATUSES.includes(
              result.status
            )
        );

      if (
        invalidStatusResults.length >
        0
      ) {
        throw new ExamResultControllerError(
          "Some exam results are not in an approvable workflow status",
          409,
          {
            resultIds:
              invalidStatusResults
                .slice(0, 50)
                .map(
                  (
                    result
                  ) =>
                    result._id
                )
          }
        );
      }

      const incompleteResults =
        results.filter(
          (
            result
          ) =>
            !COMPLETE_OVERALL_RESULT_STATUSES.includes(
              result.overallResultStatus
            )
        );

      if (
        incompleteResults.length >
        0
      ) {
        throw new ExamResultControllerError(
          "Pending, incomplete or withheld student results cannot be approved",
          409,
          {
            incompleteCount:
              incompleteResults.length,
            resultIds:
              incompleteResults
                .slice(0, 50)
                .map(
                  (
                    result
                  ) =>
                    result._id
                )
          }
        );
      }

      await applyRankingsForExam({
        exam,
        userId:
          req.user._id
      });

      const reviewRemarks =
        normalizeText(
          req.body.reviewRemarks
        );

      const now =
        new Date();

      let approvedCount =
        0;

      for (
        const result
        of results
      ) {
        if (
          result.status ===
          "approved"
        ) {
          continue;
        }

        if (
          result.status ===
          "generated"
        ) {
          if (
            !result.canTransitionTo(
              "under_review"
            )
          ) {
            throw new ExamResultControllerError(
              `Result ${result._id} cannot move to review`,
              409
            );
          }

          result.addRevisionSnapshot({
            reason:
              "Consolidated result submitted for management approval",
            changedBy:
              req.user._id
          });

          result.status =
            "under_review";

          result.approval =
            result.approval ||
            {};

          result.approval.submittedAt =
            result.approval
              .submittedAt ||
            now;

          result.approval.submittedBy =
            result.approval
              .submittedBy ||
            req.user._id;
        }

        if (
          result.status ===
          "under_review"
        ) {
          if (
            !result.canTransitionTo(
              "approved"
            )
          ) {
            throw new ExamResultControllerError(
              `Result ${result._id} cannot be approved from its current status`,
              409
            );
          }

          result.addRevisionSnapshot({
            reason:
              "Consolidated result approved by management",
            changedBy:
              req.user._id
          });

          result.status =
            "approved";

          result.approval =
            result.approval ||
            {};

          result.approval.reviewedAt =
            now;

          result.approval.reviewedBy =
            req.user._id;

          result.approval.approvedAt =
            now;

          result.approval.approvedBy =
            req.user._id;

          result.approval.reviewRemarks =
            reviewRemarks;

          result.approval.returnedAt =
            null;

          result.approval.returnedBy =
            null;

          result.approval.returnReason =
            "";

          result.updatedBy =
            req.user._id;

          await result.save();

          approvedCount +=
            1;
        }
      }

      if (
        exam.status ===
        "under_review"
      ) {
        if (
          !exam.canTransitionTo(
            "approved"
          )
        ) {
          throw new ExamResultControllerError(
            "The exam cannot move to approved from its current status",
            409
          );
        }

        exam.approval =
          exam.approval ||
          {};

        exam.approval.approvedAt =
          now;

        exam.approval.approvedBy =
          req.user._id;

        exam.approval.rejectionReason =
          "";

        exam.status =
          "approved";

        exam.isActive =
          true;

        exam.updatedBy =
          req.user._id;

        exam.versionNumber =
          Number(
            exam.versionNumber ||
            1
          ) +
          1;

        await exam.save();
      }

      const finalResults =
        await ExamResult.find({
          schoolId:
            exam.schoolId,
          examId:
            exam._id,
          isDeleted: {
            $ne: true
          }
        });

      const summary =
        summarizeExamResults(
          finalResults
        );

      await recordAuditLog({
        req,
        schoolId:
          exam.schoolId,
        action:
          "APPROVE",
        module:
          "EXAM_RESULTS",
        recordId:
          exam._id,
        recordModel:
          "Exam",
        description:
          `${req.user.role} approved consolidated results for ${exam.examName}`,
        newData: {
          examId:
            exam._id,
          examStatus:
            exam.status,
          approvedCount,
          reviewRemarks,
          summary
        },
        status:
          "success"
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Exam results approved successfully",
          examStatus:
            exam.status,
          approvedCount,
          summary
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to approve exam results"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Publish Exam Results
|--------------------------------------------------------------------------
|
| PATCH /api/exam-results/:examId/publish
|
| All consolidated results must already be approved and complete. Result
| publication also advances approved StudentMark rows to published and moves
| the parent Exam to published, making it eligible for the later Student and
| Parent portal result endpoints and report-card snapshot generation.
|
*/

exports.publishExamResults =
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
          RESULT_PUBLICATION_EXAM_STATUSES,
        message:
          "Exam results can only be published after exam approval"
      });

      const results =
        await ExamResult.find({
          schoolId:
            exam.schoolId,
          examId:
            exam._id,
          isDeleted: {
            $ne: true
          }
        }).sort({
          classId: 1,
          sectionName: 1,
          admissionNumber: 1
        });

      if (
        results.length ===
        0
      ) {
        throw new ExamResultControllerError(
          "No consolidated exam results are available for publication",
          409
        );
      }

      const invalidStatuses =
        results.filter(
          (
            result
          ) =>
            !PUBLISHABLE_RESULT_STATUSES.includes(
              result.status
            )
        );

      if (
        invalidStatuses.length >
        0
      ) {
        throw new ExamResultControllerError(
          "Every exam result must be approved before publication",
          409,
          {
            resultIds:
              invalidStatuses
                .slice(0, 50)
                .map(
                  (
                    result
                  ) =>
                    result._id
                )
          }
        );
      }

      const incompleteResults =
        results.filter(
          (
            result
          ) =>
            !COMPLETE_OVERALL_RESULT_STATUSES.includes(
              result.overallResultStatus
            )
        );

      if (
        incompleteResults.length >
        0
      ) {
        throw new ExamResultControllerError(
          "Pending, incomplete or withheld student results cannot be published",
          409,
          {
            incompleteCount:
              incompleteResults.length
          }
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Source Marks Before Any Publication Writes
      |--------------------------------------------------------------------------
      */

      const marks =
        await loadApprovedSourceMarks(
          exam
        );

      const invalidMarkTransitions =
        marks.filter(
          (
            mark
          ) =>
            mark.status ===
              "approved" &&
            !mark.canTransitionTo(
              "published"
            )
        );

      if (
        invalidMarkTransitions.length >
        0
      ) {
        throw new ExamResultControllerError(
          "One or more approved student marks cannot move to published",
          409,
          {
            invalidMarkCount:
              invalidMarkTransitions.length
          }
        );
      }

      const now =
        new Date();

      let publishedCount =
        0;

      for (
        const result
        of results
      ) {
        if (
          result.status !==
          "approved"
        ) {
          continue;
        }

        if (
          !result.canTransitionTo(
            "published"
          )
        ) {
          throw new ExamResultControllerError(
            `Result ${result._id} cannot be published from its current status`,
            409
          );
        }

        result.addRevisionSnapshot({
          reason:
            "Consolidated result published",
          changedBy:
            req.user._id
        });

        result.status =
          "published";

        result.publication =
          result.publication ||
          {};

        result.publication.publishedAt =
          now;

        result.publication.publishedBy =
          req.user._id;

        result.publication.unpublishedAt =
          null;

        result.publication.unpublishedBy =
          null;

        result.updatedBy =
          req.user._id;

        await result.save();

        publishedCount +=
          1;
      }

      /*
      |--------------------------------------------------------------------------
      | Publish Approved Student Marks
      |--------------------------------------------------------------------------
      */

      let publishedMarkCount =
        0;

      for (
        const mark
        of marks
      ) {
        if (
          mark.status !==
          "approved"
        ) {
          continue;
        }

        if (
          !mark.canTransitionTo(
            "published"
          )
        ) {
          throw new ExamResultControllerError(
            `Student mark ${mark._id} cannot be published from its current status`,
            409
          );
        }

        mark.addRevisionSnapshot({
          reason:
            "Exam result published",
          changedBy:
            req.user._id
        });

        mark.status =
          "published";

        mark.updatedBy =
          req.user._id;

        await mark.save();

        publishedMarkCount +=
          1;
      }

      /*
      |--------------------------------------------------------------------------
      | Publish Parent Exam
      |--------------------------------------------------------------------------
      */

      if (
        exam.status ===
        "approved"
      ) {
        if (
          !exam.canTransitionTo(
            "published"
          )
        ) {
          throw new ExamResultControllerError(
            "The exam cannot move to published from its current status",
            409
          );
        }

        exam.publication =
          exam.publication ||
          {};

        exam.publication.publishedAt =
          now;

        exam.publication.publishedBy =
          req.user._id;

        exam.publication.unpublishedAt =
          null;

        exam.publication.unpublishedBy =
          null;

        exam.resultSettings =
          exam.resultSettings ||
          {};

        exam.resultSettings.visibility =
          "published";

        exam.status =
          "published";

        exam.isActive =
          true;

        exam.updatedBy =
          req.user._id;

        exam.versionNumber =
          Number(
            exam.versionNumber ||
            1
          ) +
          1;

        await exam.save();
      }

      const finalResults =
        await ExamResult.find({
          schoolId:
            exam.schoolId,
          examId:
            exam._id,
          isDeleted: {
            $ne: true
          }
        });

      const summary =
        summarizeExamResults(
          finalResults
        );

      await recordAuditLog({
        req,
        schoolId:
          exam.schoolId,
        action:
          "PUBLISH",
        module:
          "EXAM_RESULTS",
        recordId:
          exam._id,
        recordModel:
          "Exam",
        description:
          `${req.user.role} published consolidated results for ${exam.examName}`,
        newData: {
          examId:
            exam._id,
          examStatus:
            exam.status,
          publishedCount,
          publishedMarkCount,
          publishedAt:
            now,
          summary
        },
        status:
          "success"
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Exam results published successfully",
          examStatus:
            exam.status,
          publishedCount,
          publishedMarkCount,
          publishedAt:
            now,
          summary
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to publish exam results"
      );
    }
  };