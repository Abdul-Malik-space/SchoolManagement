const mongoose = require("mongoose");

const Exam = require("../models/Exam");
const GradeScheme = require("../models/GradeScheme");
const ExamSchedule = require("../models/ExamSchedule");
const StudentMark = require("../models/StudentMark");
const ExamResult = require("../models/ExamResult");
const ReportCard = require("../models/ReportCard");

const School = require("../models/School");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const Teacher = require("../models/Teacher");

const {
  createAuditLog
} = require("../utils/auditLogHelper");

const {
  getPaginationOptions,
  buildPagination
} = require("../utils/pagination");

const {
  EXAM_TYPES = [],
  EXAM_STATUSES = [],
  RESULT_VISIBILITY = [],
  ALLOWED_STATUS_TRANSITIONS = {}
} = Exam;

/*
|--------------------------------------------------------------------------
| Controller Constants
|--------------------------------------------------------------------------
*/

const STRUCTURAL_EXAM_FIELDS = [
  "examCode",
  "examType",
  "academicYear",
  "academicTerm",
  "startDate",
  "endDate",
  "applicableClasses",
  "subjectRules"
];

const SCHEDULED_EDITABLE_FIELDS = [
  "examName",
  "description",
  "instructions",
  "marksEntryOpensAt",
  "marksEntryClosesAt",
  "resultPublicationDate",
  "resultSettings"
];

const EXAM_CREATE_UPDATE_FIELDS = [
  "examCode",
  "examName",
  "examType",
  "academicYear",
  "academicTerm",
  "description",
  "instructions",
  "startDate",
  "endDate",
  "marksEntryOpensAt",
  "marksEntryClosesAt",
  "resultPublicationDate",
  "applicableClasses",
  "subjectRules",
  "resultSettings",
  "isActive"
];

const ACTIVE_SCHEDULE_STATUSES = [
  "published",
  "in_progress",
  "completed"
];

const REVIEWABLE_MARK_STATUSES = [
  "submitted",
  "approved",
  "published",
  "locked"
];

const APPROVED_MARK_STATUSES = [
  "approved",
  "published",
  "locked"
];

const APPROVED_RESULT_STATUSES = [
  "approved",
  "published",
  "locked"
];

const COMPLETE_OVERALL_RESULT_STATUSES = [
  "pass",
  "fail"
];

const DELETE_ALLOWED_STATUSES = [
  "draft",
  "cancelled",
  "archived"
];

/*
|--------------------------------------------------------------------------
| Custom Controller Error
|--------------------------------------------------------------------------
*/

class ExamControllerError extends Error {
  constructor(
    message,
    statusCode = 400,
    details = null
  ) {
    super(message);

    this.name =
      "ExamControllerError";

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

const normalizeCode = (
  value
) => {
  return normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
};

const normalizeSectionKey = (
  value
) => {
  return normalizeText(value)
    .toLowerCase();
};

const isSuperAdmin = (
  req
) => {
  return (
    req.user?.role ===
    "super_admin"
  );
};

const isValidObjectId = (
  value
) => {
  return (
    Boolean(value) &&
    mongoose.Types.ObjectId.isValid(value)
  );
};

const getDocumentId = (
  value
) => {
  if (!value) {
    return null;
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const getUserSchoolId = (
  req
) => {
  return getDocumentId(
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

const escapeRegex = (
  value = ""
) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const parseBoolean = (
  value
) => {
  if (
    value === true ||
    value === "true"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false"
  ) {
    return false;
  }

  return null;
};

const uniqueIds = (
  values
) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map(getDocumentId)
        .filter(Boolean)
    )
  );
};

const buildDateRangeFilter = ({
  dateFrom,
  dateTo
}) => {
  const filter = {};

  if (dateFrom) {
    const start =
      new Date(dateFrom);

    if (
      Number.isNaN(
        start.getTime()
      )
    ) {
      throw new ExamControllerError(
        "Invalid dateFrom value",
        400
      );
    }

    start.setHours(
      0,
      0,
      0,
      0
    );

    filter.$gte =
      start;
  }

  if (dateTo) {
    const end =
      new Date(dateTo);

    if (
      Number.isNaN(
        end.getTime()
      )
    ) {
      throw new ExamControllerError(
        "Invalid dateTo value",
        400
      );
    }

    end.setHours(
      23,
      59,
      59,
      999
    );

    filter.$lte =
      end;
  }

  return filter;
};

/*
|--------------------------------------------------------------------------
| Safe Audit Logger
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
        "Exam audit log error:",
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
  defaultMessage
) => {
  console.error(
    `${defaultMessage}:`,
    error
  );

  if (
    error instanceof
    ExamControllerError
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
                item
              ) =>
                item.message
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
          "Invalid ID format"
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
          "This exam was changed by another user. Refresh the page and try again."
      });
  }

  if (
    error.code ===
    11000
  ) {
    if (
      error.keyPattern
        ?.examCode ||
      error.keyPattern
        ?.academicYear
    ) {
      return res
        .status(409)
        .json({
          success: false,

          message:
            "An active exam already uses this code in the selected academic year"
        });
    }

    return res
      .status(409)
      .json({
        success: false,

        message:
          "An exam record already exists with the provided information"
      });
  }

  return res
    .status(500)
    .json({
      success: false,
      message:
        defaultMessage,
      error:
        error.message
    });
};

/*
|--------------------------------------------------------------------------
| School Scope
|--------------------------------------------------------------------------
*/

const getSchoolScope = (
  req
) => {
  if (
    isSuperAdmin(req)
  ) {
    const requestedSchoolId =
      normalizeText(
        req.query.schoolId
      );

    if (
      requestedSchoolId
    ) {
      if (
        !isValidObjectId(
          requestedSchoolId
        )
      ) {
        return {
          error:
            "Invalid school ID format",

          statusCode:
            400
        };
      }

      return {
        selectedSchoolId:
          requestedSchoolId,

        filter: {
          schoolId:
            requestedSchoolId
        },

        aggregateMatch: {
          schoolId:
            new mongoose.Types.ObjectId(
              requestedSchoolId
            )
        }
      };
    }

    return {
      selectedSchoolId:
        null,

      filter: {},

      aggregateMatch:
        {}
    };
  }

  const schoolId =
    getDocumentId(
      req.schoolFilter
        ?.schoolId
    ) ||
    getUserSchoolId(
      req
    );

  if (!schoolId) {
    return {
      error:
        "School is not assigned to this user",

      statusCode:
        403
    };
  }

  if (
    !isValidObjectId(
      schoolId
    )
  ) {
    return {
      error:
        "Invalid school ID format",

      statusCode:
        400
    };
  }

  return {
    selectedSchoolId:
      schoolId,

    filter: {
      schoolId
    },

    aggregateMatch: {
      schoolId:
        new mongoose.Types.ObjectId(
          schoolId
        )
    }
  };
};

const requireSchoolScope = (
  req
) => {
  const schoolScope =
    getSchoolScope(req);

  if (
    schoolScope.error
  ) {
    throw new ExamControllerError(
      schoolScope.error,
      schoolScope.statusCode ||
      400
    );
  }

  return schoolScope;
};

const resolveCreateSchoolId = (
  req
) => {
  if (
    isSuperAdmin(req)
  ) {
    return normalizeText(
      req.body.schoolId
    );
  }

  return (
    getDocumentId(
      req.schoolFilter
        ?.schoolId
    ) ||
    getUserSchoolId(
      req
    )
  );
};

/*
|--------------------------------------------------------------------------
| Populate Exam
|--------------------------------------------------------------------------
*/

const populateExam = (
  query
) => {
  return query
    .populate(
      "schoolId",
      "schoolName type sessionYear isActive logo"
    )
    .populate(
      "applicableClasses.classId",
      "className numericOrder sections isActive"
    )
    .populate(
      "subjectRules.subjectId",
      "subjectCode subjectName classId teacherId isActive"
    )
    .populate(
      "resultSettings.gradeSchemeId",
      "schemeCode schemeName academicYear status isDefault minimumPassingPercentage"
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
      "deletedBy",
      "name email role"
    )
    .populate(
      "approval.submittedBy",
      "name email role"
    )
    .populate(
      "approval.approvedBy",
      "name email role"
    )
    .populate(
      "publication.publishedBy",
      "name email role"
    )
    .populate(
      "lock.lockedBy",
      "name email role"
    )
    .populate(
      "cancelledBy",
      "name email role"
    )
    .populate(
      "archivedBy",
      "name email role"
    );
};

/*
|--------------------------------------------------------------------------
| Teacher Enrichment
|--------------------------------------------------------------------------
|
| Exam.subjectRules currently stores ObjectIds in assignedTeacherIds. The
| project's teaching staff source is Teacher, so this controller validates and
| enriches those IDs directly instead of relying on automatic populate.
|
*/

const enrichAssignedTeachers =
  async (
    examDocument
  ) => {
    if (!examDocument) {
      return null;
    }

    const exam =
      getPlainData(
        examDocument
      );

    const teacherIds =
      uniqueIds(
        (
          exam.subjectRules ||
          []
        ).flatMap(
          (
            rule
          ) =>
            rule.assignedTeacherIds ||
            []
        )
      );

    if (
      teacherIds.length ===
      0
    ) {
      exam.subjectRules =
        (
          exam.subjectRules ||
          []
        ).map(
          (
            rule
          ) => ({
            ...rule,
            assignedTeachers:
              []
          })
        );

      return exam;
    }

    const teachers =
      await Teacher.find({
        _id: {
          $in:
            teacherIds
        }
      })
        .select(
          "employeeId name qualification status teacherPhoto schoolId isDeleted"
        )
        .lean();

    const teacherMap =
      new Map(
        teachers.map(
          (
            teacher
          ) => [
            String(
              teacher._id
            ),
            teacher
          ]
        )
      );

    exam.subjectRules =
      (
        exam.subjectRules ||
        []
      ).map(
        (
          rule
        ) => ({
          ...rule,

          assignedTeachers:
            (
              rule.assignedTeacherIds ||
              []
            )
              .map(
                (
                  teacherId
                ) =>
                  teacherMap.get(
                    String(
                      teacherId
                    )
                  )
              )
              .filter(
                Boolean
              )
        })
      );

    return exam;
  };

/*
|--------------------------------------------------------------------------
| Audit Snapshot
|--------------------------------------------------------------------------
*/

const getExamAuditSnapshot = (
  exam
) => {
  if (!exam) {
    return null;
  }

  const data =
    getPlainData(
      exam
    );

  return {
    examId:
      data._id ||
      data.id,

    schoolId:
      data.schoolId,

    examCode:
      data.examCode,

    examName:
      data.examName,

    examType:
      data.examType,

    academicYear:
      data.academicYear,

    academicTerm:
      data.academicTerm,

    startDate:
      data.startDate,

    endDate:
      data.endDate,

    resultPublicationDate:
      data.resultPublicationDate,

    status:
      data.status,

    isActive:
      data.isActive,

    versionNumber:
      data.versionNumber,

    classIds:
      (
        data.applicableClasses ||
        []
      ).map(
        (
          item
        ) =>
          getDocumentId(
            item.classId
          )
      ),

    subjectRuleCount:
      (
        data.subjectRules ||
        []
      ).length,

    gradeSchemeId:
      getDocumentId(
        data.resultSettings
          ?.gradeSchemeId
      ),

    isDeleted:
      data.isDeleted
  };
};

/*
|--------------------------------------------------------------------------
| Verify School
|--------------------------------------------------------------------------
*/

const verifySchool =
  async (
    schoolId
  ) => {
    if (!schoolId) {
      throw new ExamControllerError(
        "School ID is required",
        400
      );
    }

    if (
      !isValidObjectId(
        schoolId
      )
    ) {
      throw new ExamControllerError(
        "Invalid school ID format",
        400
      );
    }

    const school =
      await School.findById(
        schoolId
      );

    if (!school) {
      throw new ExamControllerError(
        "School not found",
        404
      );
    }

    if (
      school.isActive ===
      false
    ) {
      throw new ExamControllerError(
        "Exam cannot be created for an inactive school",
        403
      );
    }

    return school;
  };

/*
|--------------------------------------------------------------------------
| Normalize Request Payload
|--------------------------------------------------------------------------
*/

const buildExamPayload = (
  body = {}
) => {
  const payload = {};

  EXAM_CREATE_UPDATE_FIELDS.forEach(
    (
      field
    ) => {
      if (
        body[field] !==
        undefined
      ) {
        payload[field] =
          body[field];
      }
    }
  );

  if (
    payload.examCode !==
    undefined
  ) {
    payload.examCode =
      normalizeCode(
        payload.examCode
      );
  }

  [
    "examName",
    "academicYear",
    "academicTerm",
    "description",
    "instructions"
  ].forEach(
    (
      field
    ) => {
      if (
        payload[field] !==
        undefined
      ) {
        payload[field] =
          normalizeText(
            payload[field]
          );
      }
    }
  );

  if (
    payload.examType !==
    undefined
  ) {
    payload.examType =
      normalizeText(
        payload.examType
      ).toLowerCase();
  }

  const dateFields = [
    "startDate",
    "endDate",
    "marksEntryOpensAt",
    "marksEntryClosesAt",
    "resultPublicationDate"
  ];

  dateFields.forEach(
    (
      field
    ) => {
      if (
        payload[field] ===
          "" ||
        payload[field] ===
          null
      ) {
        payload[field] =
          null;
      }
    }
  );

  if (
    payload.isActive !==
    undefined
  ) {
    const parsed =
      parseBoolean(
        payload.isActive
      );

    if (
      parsed ===
      null
    ) {
      throw new ExamControllerError(
        "isActive must be true or false",
        400
      );
    }

    payload.isActive =
      parsed;
  }

  if (
    payload.applicableClasses !==
      undefined &&
    !Array.isArray(
      payload.applicableClasses
    )
  ) {
    throw new ExamControllerError(
      "Applicable classes must be an array",
      400
    );
  }

  if (
    payload.subjectRules !==
      undefined &&
    !Array.isArray(
      payload.subjectRules
    )
  ) {
    throw new ExamControllerError(
      "Subject rules must be an array",
      400
    );
  }

  if (
    payload.resultSettings !==
      undefined &&
    (
      !payload.resultSettings ||
      typeof payload.resultSettings !==
        "object" ||
      Array.isArray(
        payload.resultSettings
      )
    )
  ) {
    throw new ExamControllerError(
      "Result settings must be an object",
      400
    );
  }

  return payload;
};

/*
|--------------------------------------------------------------------------
| Required Create Fields
|--------------------------------------------------------------------------
*/

const validateCreateFields = (
  payload
) => {
  const requiredFields = [
    {
      field:
        "examCode",

      label:
        "Exam code"
    },
    {
      field:
        "examName",

      label:
        "Exam name"
    },
    {
      field:
        "examType",

      label:
        "Exam type"
    },
    {
      field:
        "academicYear",

      label:
        "Academic year"
    },
    {
      field:
        "startDate",

      label:
        "Exam start date"
    },
    {
      field:
        "endDate",

      label:
        "Exam end date"
    }
  ];

  const missing =
    requiredFields.find(
      (
        item
      ) =>
        !payload[
          item.field
        ]
    );

  if (missing) {
    throw new ExamControllerError(
      `${missing.label} is required`,
      400
    );
  }

  if (
    !Array.isArray(
      payload.applicableClasses
    ) ||
    payload.applicableClasses
      .length ===
      0
  ) {
    throw new ExamControllerError(
      "At least one applicable class is required",
      400
    );
  }
};

/*
|--------------------------------------------------------------------------
| Validate Classes and Sections
|--------------------------------------------------------------------------
*/

const validateApplicableClasses =
  async ({
    schoolId,
    applicableClasses
  }) => {
    if (
      !Array.isArray(
        applicableClasses
      ) ||
      applicableClasses.length ===
        0
    ) {
      throw new ExamControllerError(
        "At least one applicable class is required",
        400
      );
    }

    const requestedClassIds =
      applicableClasses.map(
        (
          item,
          index
        ) => {
          const classId =
            getDocumentId(
              item?.classId
            );

          if (
            !isValidObjectId(
              classId
            )
          ) {
            throw new ExamControllerError(
              `Invalid class ID at position ${index + 1}`,
              400
            );
          }

          return classId;
        }
      );

    if (
      new Set(
        requestedClassIds
      ).size !==
      requestedClassIds.length
    ) {
      throw new ExamControllerError(
        "The same class cannot be assigned more than once",
        400
      );
    }

    const classes =
      await Class.find({
        _id: {
          $in:
            requestedClassIds
        },

        schoolId,

        isActive:
          true,

        isDeleted: {
          $ne: true
        }
      }).lean();

    if (
      classes.length !==
      requestedClassIds.length
    ) {
      throw new ExamControllerError(
        "One or more classes are inactive, deleted or do not belong to the selected school",
        400
      );
    }

    const classMap =
      new Map(
        classes.map(
          (
            classRecord
          ) => [
            String(
              classRecord._id
            ),
            classRecord
          ]
        )
      );

    const normalizedClasses =
      applicableClasses.map(
        (
          item,
          index
        ) => {
          const classId =
            getDocumentId(
              item.classId
            );

          const classRecord =
            classMap.get(
              classId
            );

          const allSections =
            item.allSections !==
            false;

          const requestedSections =
            Array.isArray(
              item.sections
            )
              ? item.sections
                  .map(
                    normalizeText
                  )
                  .filter(
                    Boolean
                  )
              : [];

          if (
            allSections
          ) {
            return {
              classId:
                classRecord._id,

              allSections:
                true,

              sections:
                [],

              displayOrder:
                Number.isFinite(
                  Number(
                    item.displayOrder
                  )
                )
                  ? Math.max(
                      0,
                      Number(
                        item.displayOrder
                      )
                    )
                  : index
            };
          }

          if (
            requestedSections.length ===
            0
          ) {
            throw new ExamControllerError(
              `At least one section is required for ${classRecord.className}`,
              400
            );
          }

          const sectionMap =
            new Map(
              (
                classRecord.sections ||
                []
              ).map(
                (
                  section
                ) => [
                  normalizeSectionKey(
                    section.sectionName
                  ),
                  section.sectionName
                ]
              )
            );

          const canonicalSections =
            Array.from(
              new Set(
                requestedSections.map(
                  (
                    sectionName
                  ) => {
                    const canonical =
                      sectionMap.get(
                        normalizeSectionKey(
                          sectionName
                        )
                      );

                    if (!canonical) {
                      throw new ExamControllerError(
                        `Section "${sectionName}" does not exist in ${classRecord.className}`,
                        400
                      );
                    }

                    return canonical;
                  }
                )
              )
            );

          return {
            classId:
              classRecord._id,

            allSections:
              false,

            sections:
              canonicalSections,

            displayOrder:
              Number.isFinite(
                Number(
                  item.displayOrder
                )
              )
                ? Math.max(
                    0,
                    Number(
                      item.displayOrder
                    )
                  )
                : index
          };
        }
      );

    return {
      applicableClasses:
        normalizedClasses,

      classMap
    };
  };

/*
|--------------------------------------------------------------------------
| Validate Subject Rules and Teacher Assignments
|--------------------------------------------------------------------------
*/

const validateSubjectRules =
  async ({
    schoolId,
    applicableClasses,
    subjectRules
  }) => {
    const rules =
      Array.isArray(
        subjectRules
      )
        ? subjectRules
        : [];

    if (
      rules.length ===
      0
    ) {
      return {
        subjectRules:
          [],

        subjectMap:
          new Map(),

        teacherMap:
          new Map()
      };
    }

    const applicableClassIds =
      new Set(
        applicableClasses.map(
          (
            item
          ) =>
            getDocumentId(
              item.classId
            )
        )
      );

    const requestedSubjectIds =
      [];

    const requestedTeacherIds =
      [];

    rules.forEach(
      (
        rule,
        index
      ) => {
        const classId =
          getDocumentId(
            rule?.classId
          );

        const subjectId =
          getDocumentId(
            rule?.subjectId
          );

        if (
          !isValidObjectId(
            classId
          )
        ) {
          throw new ExamControllerError(
            `Invalid subject-rule class ID at position ${index + 1}`,
            400
          );
        }

        if (
          !applicableClassIds.has(
            classId
          )
        ) {
          throw new ExamControllerError(
            `Subject rule ${index + 1} references a class that is not assigned to this exam`,
            400
          );
        }

        if (
          !isValidObjectId(
            subjectId
          )
        ) {
          throw new ExamControllerError(
            `Invalid subject ID at position ${index + 1}`,
            400
          );
        }

        requestedSubjectIds.push(
          subjectId
        );

        const teacherIds =
          uniqueIds(
            rule.assignedTeacherIds
          );

        teacherIds.forEach(
          (
            teacherId
          ) => {
            if (
              !isValidObjectId(
                teacherId
              )
            ) {
              throw new ExamControllerError(
                `Invalid assigned teacher ID in subject rule ${index + 1}`,
                400
              );
            }

            requestedTeacherIds.push(
              teacherId
            );
          }
        );
      }
    );

    const subjects =
      await Subject.find({
        _id: {
          $in:
            Array.from(
              new Set(
                requestedSubjectIds
              )
            )
        },

        schoolId,

        isActive:
          true,

        isDeleted: {
          $ne: true
        }
      }).lean();

    const subjectMap =
      new Map(
        subjects.map(
          (
            subject
          ) => [
            String(
              subject._id
            ),
            subject
          ]
        )
      );

    if (
      subjectMap.size !==
      new Set(
        requestedSubjectIds
      ).size
    ) {
      throw new ExamControllerError(
        "One or more subjects are inactive, deleted or do not belong to the selected school",
        400
      );
    }

    subjects.forEach(
      (
        subject
      ) => {
        const teacherId =
          getDocumentId(
            subject.teacherId
          );

        if (teacherId) {
          requestedTeacherIds.push(
            teacherId
          );
        }
      }
    );

    const uniqueTeacherIds =
      Array.from(
        new Set(
          requestedTeacherIds
        )
      );

    const teachers =
      uniqueTeacherIds.length >
        0
        ? await Teacher.find({
            _id: {
              $in:
                uniqueTeacherIds
            },

            schoolId,

            status:
              "active",

            isDeleted: {
              $ne: true
            }
          }).lean()
        : [];

    const teacherMap =
      new Map(
        teachers.map(
          (
            teacher
          ) => [
            String(
              teacher._id
            ),
            teacher
          ]
        )
      );

    const ruleKeys =
      new Set();

    const normalizedRules =
      rules.map(
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

          const subject =
            subjectMap.get(
              subjectId
            );

          if (
            getDocumentId(
              subject.classId
            ) !==
            classId
          ) {
            throw new ExamControllerError(
              `${subject.subjectName} is not assigned to the selected class`,
              400
            );
          }

          const ruleKey =
            `${classId}:${subjectId}`;

          if (
            ruleKeys.has(
              ruleKey
            )
          ) {
            throw new ExamControllerError(
              `${subject.subjectName} is assigned more than once for the same class`,
              400
            );
          }

          ruleKeys.add(
            ruleKey
          );

          let assignedTeacherIds =
            uniqueIds(
              rule.assignedTeacherIds
            );

          if (
            assignedTeacherIds.length ===
              0 &&
            subject.teacherId
          ) {
            assignedTeacherIds = [
              getDocumentId(
                subject.teacherId
              )
            ];
          }

          assignedTeacherIds.forEach(
            (
              teacherId
            ) => {
              if (
                !teacherMap.has(
                  teacherId
                )
              ) {
                throw new ExamControllerError(
                  `An assigned teacher for ${subject.subjectName} is inactive, deleted or belongs to another school`,
                  400
                );
              }
            }
          );

          return {
            classId:
              new mongoose.Types.ObjectId(
                classId
              ),

            subjectId:
              subject._id,

            assignedTeacherIds,

            maxMarks:
              rule.maxMarks,

            passingMarks:
              rule.passingMarks,

            theoryMarks:
              rule.theoryMarks ??
              0,

            practicalMarks:
              rule.practicalMarks ??
              0,

            internalMarks:
              rule.internalMarks ??
              0,

            weightagePercentage:
              rule.weightagePercentage ??
              100,

            isOptional:
              Boolean(
                rule.isOptional
              ),

            requiresPractical:
              Boolean(
                rule.requiresPractical
              ),

            allowGraceMarks:
              Boolean(
                rule.allowGraceMarks
              ),

            graceMarksLimit:
              rule.graceMarksLimit ??
              0,

            displayOrder:
              Number.isFinite(
                Number(
                  rule.displayOrder
                )
              )
                ? Math.max(
                    0,
                    Number(
                      rule.displayOrder
                    )
                  )
                : index,

            instructions:
              normalizeText(
                rule.instructions
              )
          };
        }
      );

    return {
      subjectRules:
        normalizedRules,

      subjectMap,

      teacherMap
    };
  };

/*
|--------------------------------------------------------------------------
| Validate Grade Scheme
|--------------------------------------------------------------------------
*/

const validateGradeScheme =
  async ({
    schoolId,
    academicYear,
    examType,
    applicableClasses,
    gradeSchemeId,
    requireActive = false
  }) => {
    if (!gradeSchemeId) {
      return null;
    }

    const normalizedId =
      getDocumentId(
        gradeSchemeId
      );

    if (
      !isValidObjectId(
        normalizedId
      )
    ) {
      throw new ExamControllerError(
        "Invalid grade scheme ID format",
        400
      );
    }

    const gradeScheme =
      await GradeScheme.findOne({
        _id:
          normalizedId,

        schoolId,

        isDeleted: {
          $ne: true
        }
      });

    if (!gradeScheme) {
      throw new ExamControllerError(
        "Grade scheme was not found in the selected school",
        404
      );
    }

    if (
      gradeScheme.status ===
      "archived"
    ) {
      throw new ExamControllerError(
        "An archived grade scheme cannot be assigned to an exam",
        400
      );
    }

    if (
      requireActive &&
      gradeScheme.status !==
      "active"
    ) {
      throw new ExamControllerError(
        "The assigned grade scheme must be active before this exam can proceed",
        409
      );
    }

    if (
      normalizeText(
        gradeScheme.academicYear
      ) !==
      normalizeText(
        academicYear
      )
    ) {
      throw new ExamControllerError(
        "Grade scheme academic year does not match the exam academic year",
        400
      );
    }

    const scopedClassIds =
      uniqueIds(
        gradeScheme
          .applicableClassIds
      );

    if (
      scopedClassIds.length >
      0
    ) {
      const missingClass =
        applicableClasses.find(
          (
            classItem
          ) =>
            !scopedClassIds.includes(
              getDocumentId(
                classItem.classId
              )
            )
        );

      if (missingClass) {
        throw new ExamControllerError(
          "The selected grade scheme does not cover every class assigned to this exam",
          400
        );
      }
    }

    const scopedExamTypes =
      Array.isArray(
        gradeScheme
          .applicableExamTypes
      )
        ? gradeScheme
            .applicableExamTypes
        : [];

    if (
      scopedExamTypes.length >
        0 &&
      !scopedExamTypes.includes(
        examType
      )
    ) {
      throw new ExamControllerError(
        "The selected grade scheme does not apply to this exam type",
        400
      );
    }

    return gradeScheme;
  };

/*
|--------------------------------------------------------------------------
| Validate Complete Exam Configuration
|--------------------------------------------------------------------------
*/

const validateExamConfiguration =
  async ({
    schoolId,
    values,
    requireActiveGradeScheme = false
  }) => {
    const classValidation =
      await validateApplicableClasses({
        schoolId,

        applicableClasses:
          values.applicableClasses
      });

    const subjectValidation =
      await validateSubjectRules({
        schoolId,

        applicableClasses:
          classValidation
            .applicableClasses,

        subjectRules:
          values.subjectRules ||
          []
      });

    const resultSettings = {
      ...(
        values.resultSettings ||
        {}
      )
    };

    const gradeScheme =
      await validateGradeScheme({
        schoolId,

        academicYear:
          values.academicYear,

        examType:
          values.examType,

        applicableClasses:
          classValidation
            .applicableClasses,

        gradeSchemeId:
          resultSettings
            .gradeSchemeId,

        requireActive:
          requireActiveGradeScheme
      });

    if (gradeScheme) {
      resultSettings.gradeSchemeId =
        gradeScheme._id;
    } else {
      resultSettings.gradeSchemeId =
        null;
    }

    return {
      applicableClasses:
        classValidation
          .applicableClasses,

      subjectRules:
        subjectValidation
          .subjectRules,

      resultSettings,

      classMap:
        classValidation
          .classMap,

      subjectMap:
        subjectValidation
          .subjectMap,

      teacherMap:
        subjectValidation
          .teacherMap,

      gradeScheme
    };
  };

/*
|--------------------------------------------------------------------------
| Ensure Every Class Has a Subject Rule
|--------------------------------------------------------------------------
*/

const ensureClassSubjectCoverage = (
  exam
) => {
  const classIds =
    new Set(
      (
        exam.applicableClasses ||
        []
      ).map(
        (
          item
        ) =>
          getDocumentId(
            item.classId
          )
      )
    );

  const coveredClassIds =
    new Set(
      (
        exam.subjectRules ||
        []
      ).map(
        (
          rule
        ) =>
          getDocumentId(
            rule.classId
          )
      )
    );

  const uncoveredClassIds =
    Array.from(
      classIds
    ).filter(
      (
        classId
      ) =>
        !coveredClassIds.has(
          classId
        )
    );

  if (
    uncoveredClassIds.length >
    0
  ) {
    throw new ExamControllerError(
      "Every applicable class must have at least one subject rule before the exam can proceed",
      409,

      {
        uncoveredClassIds
      }
    );
  }
};

/*
|--------------------------------------------------------------------------
| Build List Filter
|--------------------------------------------------------------------------
*/

const buildExamFilter = (
  req,
  {
    deleted = false
  } = {}
) => {
  const schoolScope =
    requireSchoolScope(
      req
    );

  const filter = {
    ...schoolScope.filter,

    isDeleted:
      deleted
        ? true
        : {
            $ne:
              true
          }
  };

  const {
    academicYear,
    academicTerm,
    examType,
    status,
    classId,
    subjectId,
    isActive,
    search,
    dateFrom,
    dateTo
  } = req.query;

  if (
    academicYear
  ) {
    filter.academicYear =
      normalizeText(
        academicYear
      );
  }

  if (
    academicTerm
  ) {
    filter.academicTerm =
      normalizeText(
        academicTerm
      );
  }

  if (
    examType
  ) {
    const normalizedType =
      normalizeText(
        examType
      ).toLowerCase();

    if (
      !EXAM_TYPES.includes(
        normalizedType
      )
    ) {
      throw new ExamControllerError(
        "Invalid exam type filter",
        400
      );
    }

    filter.examType =
      normalizedType;
  }

  if (status) {
    const normalizedStatus =
      normalizeText(
        status
      ).toLowerCase();

    if (
      !EXAM_STATUSES.includes(
        normalizedStatus
      )
    ) {
      throw new ExamControllerError(
        "Invalid exam status filter",
        400
      );
    }

    filter.status =
      normalizedStatus;
  }

  if (classId) {
    if (
      !isValidObjectId(
        classId
      )
    ) {
      throw new ExamControllerError(
        "Invalid class ID filter",
        400
      );
    }

    filter[
      "applicableClasses.classId"
    ] =
      classId;
  }

  if (subjectId) {
    if (
      !isValidObjectId(
        subjectId
      )
    ) {
      throw new ExamControllerError(
        "Invalid subject ID filter",
        400
      );
    }

    filter[
      "subjectRules.subjectId"
    ] =
      subjectId;
  }

  if (
    isActive !==
    undefined
  ) {
    const parsed =
      parseBoolean(
        isActive
      );

    if (
      parsed ===
      null
    ) {
      throw new ExamControllerError(
        "isActive filter must be true or false",
        400
      );
    }

    filter.isActive =
      parsed;
  }

  if (
    search &&
    normalizeText(
      search
    )
  ) {
    const searchRegex =
      new RegExp(
        escapeRegex(
          normalizeText(
            search
          )
        ),
        "i"
      );

    filter.$or = [
      {
        examCode:
          searchRegex
      },
      {
        examName:
          searchRegex
      },
      {
        academicYear:
          searchRegex
      },
      {
        academicTerm:
          searchRegex
      }
    ];
  }

  if (
    dateFrom ||
    dateTo
  ) {
    filter.startDate =
      buildDateRangeFilter({
        dateFrom,
        dateTo
      });
  }

  return {
    filter,
    schoolScope
  };
};

/*
|--------------------------------------------------------------------------
| Dependency Counts
|--------------------------------------------------------------------------
*/

const getExamDependencyCounts =
  async (
    examId,
    schoolId
  ) => {
    const scope = {
      examId,
      schoolId,

      isDeleted: {
        $ne: true
      }
    };

    const [
      scheduleCount,
      markCount,
      resultCount,
      reportCardCount
    ] = await Promise.all([
      ExamSchedule.countDocuments(
        scope
      ),

      StudentMark.countDocuments(
        scope
      ),

      ExamResult.countDocuments(
        scope
      ),

      ReportCard.countDocuments(
        scope
      )
    ]);

    return {
      schedules:
        scheduleCount,

      marks:
        markCount,

      results:
        resultCount,

      reportCards:
        reportCardCount,

      total:
        scheduleCount +
        markCount +
        resultCount +
        reportCardCount
    };
  };

/*
|--------------------------------------------------------------------------
| Workflow Dependency Status
|--------------------------------------------------------------------------
*/

const getExamWorkflowState =
  async (
    exam
  ) => {
    const schoolId =
      getDocumentId(
        exam.schoolId
      );

    const examId =
      exam._id;

    const [
      scheduleSummary,
      markSummary,
      resultSummary,
      reportCardSummary
    ] = await Promise.all([
      ExamSchedule.aggregate([
        {
          $match: {
            schoolId:
              new mongoose.Types.ObjectId(
                schoolId
              ),

            examId:
              new mongoose.Types.ObjectId(
                examId
              ),

            isDeleted: {
              $ne: true
            }
          }
        },
        {
          $group: {
            _id:
              "$status",

            count: {
              $sum: 1
            }
          }
        }
      ]),

      StudentMark.aggregate([
        {
          $match: {
            schoolId:
              new mongoose.Types.ObjectId(
                schoolId
              ),

            examId:
              new mongoose.Types.ObjectId(
                examId
              ),

            isDeleted: {
              $ne: true
            }
          }
        },
        {
          $group: {
            _id: {
              status:
                "$status",

              resultStatus:
                "$resultStatus"
            },

            count: {
              $sum: 1
            }
          }
        }
      ]),

      ExamResult.aggregate([
        {
          $match: {
            schoolId:
              new mongoose.Types.ObjectId(
                schoolId
              ),

            examId:
              new mongoose.Types.ObjectId(
                examId
              ),

            isDeleted: {
              $ne: true
            }
          }
        },
        {
          $group: {
            _id: {
              status:
                "$status",

              overallResultStatus:
                "$overallResultStatus"
            },

            count: {
              $sum: 1
            }
          }
        }
      ]),

      ReportCard.aggregate([
        {
          $match: {
            schoolId:
              new mongoose.Types.ObjectId(
                schoolId
              ),

            examId:
              new mongoose.Types.ObjectId(
                examId
              ),

            isDeleted: {
              $ne: true
            }
          }
        },
        {
          $group: {
            _id:
              "$status",

            count: {
              $sum: 1
            }
          }
        }
      ])
    ]);

    const scheduleCounts =
      Object.fromEntries(
        scheduleSummary.map(
          (
            row
          ) => [
            row._id,
            row.count
          ]
        )
      );

    const markCounts = {};

    const markResultCounts =
      {};

    markSummary.forEach(
      (
        row
      ) => {
        const status =
          row._id.status;

        const resultStatus =
          row._id.resultStatus;

        markCounts[
          status
        ] =
          (
            markCounts[
              status
            ] ||
            0
          ) +
          row.count;

        markResultCounts[
          resultStatus
        ] =
          (
            markResultCounts[
              resultStatus
            ] ||
            0
          ) +
          row.count;
      }
    );

    const resultCounts = {};

    const overallResultCounts =
      {};

    resultSummary.forEach(
      (
        row
      ) => {
        const status =
          row._id.status;

        const overallStatus =
          row._id
            .overallResultStatus;

        resultCounts[
          status
        ] =
          (
            resultCounts[
              status
            ] ||
            0
          ) +
          row.count;

        overallResultCounts[
          overallStatus
        ] =
          (
            overallResultCounts[
              overallStatus
            ] ||
            0
          ) +
          row.count;
      }
    );

    const reportCardCounts =
      Object.fromEntries(
        reportCardSummary.map(
          (
            row
          ) => [
            row._id,
            row.count
          ]
        )
      );

    return {
      schedules: {
        total:
          Object.values(
            scheduleCounts
          ).reduce(
            (
              total,
              count
            ) =>
              total +
              count,
            0
          ),

        byStatus:
          scheduleCounts
      },

      marks: {
        total:
          Object.values(
            markCounts
          ).reduce(
            (
              total,
              count
            ) =>
              total +
              count,
            0
          ),

        byStatus:
          markCounts,

        byResultStatus:
          markResultCounts
      },

      results: {
        total:
          Object.values(
            resultCounts
          ).reduce(
            (
              total,
              count
            ) =>
              total +
              count,
            0
          ),

        byStatus:
          resultCounts,

        byOverallStatus:
          overallResultCounts
      },

      reportCards: {
        total:
          Object.values(
            reportCardCounts
          ).reduce(
            (
              total,
              count
            ) =>
              total +
              count,
            0
          ),

        byStatus:
          reportCardCounts
      }
    };
  };

/*
|--------------------------------------------------------------------------
| Status Transition Guards
|--------------------------------------------------------------------------
*/

const validateStatusTransition =
  async ({
    exam,
    nextStatus,
    body
  }) => {
    if (
      !EXAM_STATUSES.includes(
        nextStatus
      )
    ) {
      throw new ExamControllerError(
        "Invalid exam status",
        400
      );
    }

    if (
      !exam.canTransitionTo(
        nextStatus
      )
    ) {
      throw new ExamControllerError(
        `Exam cannot move from ${exam.status} to ${nextStatus}`,
        409,

        {
          currentStatus:
            exam.status,

          allowedTransitions:
            Exam.getAllowedStatusTransitions(
              exam.status
            )
        }
      );
    }

    if (
      nextStatus ===
      exam.status
    ) {
      return {
        workflowState:
          null
      };
    }

    if (
      [
        "scheduled",
        "in_progress",
        "marks_entry",
        "under_review",
        "approved",
        "published",
        "locked"
      ].includes(
        nextStatus
      )
    ) {
      if (
        !Array.isArray(
          exam.subjectRules
        ) ||
        exam.subjectRules.length ===
          0
      ) {
        throw new ExamControllerError(
          "At least one subject rule is required before this status change",
          409
        );
      }

      ensureClassSubjectCoverage(
        exam
      );

      await validateGradeScheme({
        schoolId:
          getDocumentId(
            exam.schoolId
          ),

        academicYear:
          exam.academicYear,

        examType:
          exam.examType,

        applicableClasses:
          exam.applicableClasses,

        gradeSchemeId:
          exam.resultSettings
            ?.gradeSchemeId,

        requireActive:
          true
      });
    }

    if (
      nextStatus ===
      "cancelled"
    ) {
      const cancellationReason =
        normalizeText(
          body.cancellationReason
        );

      if (
        !cancellationReason
      ) {
        throw new ExamControllerError(
          "Cancellation reason is required",
          400
        );
      }
    }

    const requiresWorkflowState =
      [
        "in_progress",
        "marks_entry",
        "under_review",
        "approved",
        "published",
        "locked"
      ].includes(
        nextStatus
      );

    const workflowState =
      requiresWorkflowState
        ? await getExamWorkflowState(
            exam
          )
        : null;

    if (
      nextStatus ===
      "in_progress"
    ) {
      const availableSchedules =
        ACTIVE_SCHEDULE_STATUSES.reduce(
          (
            total,
            status
          ) =>
            total +
            Number(
              workflowState
                .schedules
                .byStatus[
                  status
                ] ||
              0
            ),
          0
        );

      if (
        availableSchedules ===
        0
      ) {
        throw new ExamControllerError(
          "At least one published exam schedule is required before starting the exam",
          409
        );
      }
    }

    if (
      nextStatus ===
      "marks_entry"
    ) {
      if (
        workflowState
          .schedules
          .total ===
        0
      ) {
        throw new ExamControllerError(
          "Exam schedule is required before opening marks entry",
          409
        );
      }

      const activeInProgress =
        Number(
          workflowState
            .schedules
            .byStatus
            .in_progress ||
          0
        );

      if (
        activeInProgress >
        0
      ) {
        throw new ExamControllerError(
          "All in-progress exam papers must be completed before marks entry opens",
          409
        );
      }
    }

    if (
      nextStatus ===
      "under_review"
    ) {
      if (
        workflowState
          .marks
          .total ===
        0
      ) {
        throw new ExamControllerError(
          "Student marks must be entered before review",
          409
        );
      }

      const invalidMarkStatuses =
        Object.entries(
          workflowState
            .marks
            .byStatus
        )
          .filter(
            ([
              status,
              count
            ]) =>
              Number(count) >
                0 &&
              !REVIEWABLE_MARK_STATUSES.includes(
                status
              )
          )
          .map(
            ([
              status
            ]) =>
              status
          );

      if (
        invalidMarkStatuses.length >
        0
      ) {
        throw new ExamControllerError(
          "All mark records must be submitted before exam review",
          409,

          {
            invalidMarkStatuses
          }
        );
      }

      if (
        Number(
          workflowState
            .marks
            .byResultStatus
            .pending ||
          0
        ) >
        0
      ) {
        throw new ExamControllerError(
          "Pending subject marks must be completed before exam review",
          409
        );
      }
    }

    if (
      nextStatus ===
      "approved"
    ) {
      if (
        workflowState
          .marks
          .total ===
        0
      ) {
        throw new ExamControllerError(
          "No student marks are available for approval",
          409
        );
      }

      const unapprovedMarkStatuses =
        Object.entries(
          workflowState
            .marks
            .byStatus
        )
          .filter(
            ([
              status,
              count
            ]) =>
              Number(count) >
                0 &&
              !APPROVED_MARK_STATUSES.includes(
                status
              )
          )
          .map(
            ([
              status
            ]) =>
              status
          );

      if (
        unapprovedMarkStatuses.length >
        0
      ) {
        throw new ExamControllerError(
          "Every student mark record must be approved before approving the exam",
          409,

          {
            unapprovedMarkStatuses
          }
        );
      }

      if (
        workflowState
          .results
          .total ===
        0
      ) {
        throw new ExamControllerError(
          "Consolidated exam results must be generated before exam approval",
          409
        );
      }
    }

    if (
      nextStatus ===
      "published"
    ) {
      if (
        workflowState
          .results
          .total ===
        0
      ) {
        throw new ExamControllerError(
          "No consolidated results are available for publication",
          409
        );
      }

      const unapprovedResultStatuses =
        Object.entries(
          workflowState
            .results
            .byStatus
        )
          .filter(
            ([
              status,
              count
            ]) =>
              Number(count) >
                0 &&
              !APPROVED_RESULT_STATUSES.includes(
                status
              )
          )
          .map(
            ([
              status
            ]) =>
              status
          );

      if (
        unapprovedResultStatuses.length >
        0
      ) {
        throw new ExamControllerError(
          "Every exam result must be approved before publication",
          409,

          {
            unapprovedResultStatuses
          }
        );
      }

      const incompleteOverallStatuses =
        Object.entries(
          workflowState
            .results
            .byOverallStatus
        )
          .filter(
            ([
              status,
              count
            ]) =>
              Number(count) >
                0 &&
              !COMPLETE_OVERALL_RESULT_STATUSES.includes(
                status
              )
          )
          .map(
            ([
              status
            ]) =>
              status
          );

      if (
        incompleteOverallStatuses.length >
        0
      ) {
        throw new ExamControllerError(
          "Pending, incomplete or withheld student results cannot be published",
          409,

          {
            incompleteOverallStatuses
          }
        );
      }
    }

    if (
      nextStatus ===
      "locked"
    ) {
      if (
        exam.status !==
          "published" &&
        exam.status !==
          "approved"
      ) {
        throw new ExamControllerError(
          "Only an approved or published exam can be locked",
          409
        );
      }
    }

    return {
      workflowState
    };
  };

/*
|--------------------------------------------------------------------------
| Apply Status Metadata
|--------------------------------------------------------------------------
*/

const applyStatusMetadata = ({
  exam,
  nextStatus,
  body,
  userId
}) => {
  const now =
    new Date();

  switch (
    nextStatus
  ) {
    case "draft":
      exam.isActive =
        true;
      break;

    case "scheduled":
      exam.isActive =
        true;
      break;

    case "in_progress":
      exam.isActive =
        true;
      break;

    case "marks_entry":
      exam.isActive =
        true;
      break;

    case "under_review":
      exam.approval =
        exam.approval ||
        {};

      exam.approval.submittedAt =
        now;

      exam.approval.submittedBy =
        userId;

      exam.approval.rejectionReason =
        "";

      exam.isActive =
        true;
      break;

    case "approved":
      exam.approval =
        exam.approval ||
        {};

      exam.approval.approvedAt =
        now;

      exam.approval.approvedBy =
        userId;

      exam.approval.rejectionReason =
        "";

      exam.isActive =
        true;
      break;

    case "published":
      exam.publication =
        exam.publication ||
        {};

      exam.publication.publishedAt =
        now;

      exam.publication.publishedBy =
        userId;

      exam.publication.unpublishedAt =
        null;

      exam.publication.unpublishedBy =
        null;

      exam.resultSettings =
        exam.resultSettings ||
        {};

      exam.resultSettings.visibility =
        "published";

      exam.isActive =
        true;
      break;

    case "locked":
      exam.lock =
        exam.lock ||
        {};

      exam.lock.isLocked =
        true;

      exam.lock.lockedAt =
        now;

      exam.lock.lockedBy =
        userId;

      exam.lock.lockReason =
        normalizeText(
          body.lockReason
        );

      exam.isActive =
        true;
      break;

    case "cancelled":
      exam.cancellationReason =
        normalizeText(
          body.cancellationReason
        );

      exam.cancelledAt =
        now;

      exam.cancelledBy =
        userId;

      exam.isActive =
        false;
      break;

    case "archived":
      exam.archivedAt =
        now;

      exam.archivedBy =
        userId;

      exam.isActive =
        false;
      break;

    default:
      break;
  }

  exam.status =
    nextStatus;

  exam.updatedBy =
    userId;
};

/*
|--------------------------------------------------------------------------
| Create Exam
|--------------------------------------------------------------------------
*/

exports.createExam =
  async (
    req,
    res
  ) => {
    try {
      const schoolId =
        resolveCreateSchoolId(
          req
        );

      await verifySchool(
        schoolId
      );

      const payload =
        buildExamPayload(
          req.body
        );

      validateCreateFields(
        payload
      );

      const configuration =
        await validateExamConfiguration({
          schoolId,

          values:
            payload,

          requireActiveGradeScheme:
            false
        });

      const exam =
        await Exam.create({
          ...payload,

          schoolId,

          applicableClasses:
            configuration
              .applicableClasses,

          subjectRules:
            configuration
              .subjectRules,

          resultSettings:
            configuration
              .resultSettings,

          status:
            "draft",

          createdBy:
            req.user._id,

          updatedBy:
            req.user._id,

          isDeleted:
            false,

          deletedAt:
            null,

          deletedBy:
            null
        });

      const populatedExam =
        await populateExam(
          Exam.findById(
            exam._id
          )
        );

      const responseExam =
        await enrichAssignedTeachers(
          populatedExam
        );

      await recordAuditLog({
        req,

        schoolId:
          exam.schoolId,

        action:
          "CREATE",

        module:
          "EXAM",

        recordId:
          exam._id,

        recordModel:
          "Exam",

        description:
          `${req.user.role} created exam: ${exam.examName}`,

        oldData:
          null,

        newData:
          getExamAuditSnapshot(
            exam
          ),

        status:
          "success",

        metadata: {
          examCode:
            exam.examCode,

          academicYear:
            exam.academicYear,

          examType:
            exam.examType,

          classCount:
            exam.applicableClasses
              .length,

          subjectRuleCount:
            exam.subjectRules
              .length
        }
      });

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Exam created successfully",

          exam:
            responseExam
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to create exam"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Exams
|--------------------------------------------------------------------------
*/

exports.getExams =
  async (
    req,
    res
  ) => {
    try {
      const {
        filter
      } = buildExamFilter(
        req
      );

      const {
        page,
        limit,
        skip
      } = getPaginationOptions(
        req.query
      );

      const sortField =
        [
          "startDate",
          "endDate",
          "createdAt",
          "examName",
          "academicYear",
          "status"
        ].includes(
          req.query.sortBy
        )
          ? req.query.sortBy
          : "startDate";

      const sortDirection =
        req.query.sortOrder ===
        "asc"
          ? 1
          : -1;

      const [
        exams,
        total
      ] = await Promise.all([
        populateExam(
          Exam.find(
            filter
          )
            .sort({
              [sortField]:
                sortDirection,

              createdAt:
                -1
            })
            .skip(
              skip
            )
            .limit(
              limit
            )
        ),

        Exam.countDocuments(
          filter
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,

          count:
            exams.length,

          exams,

          pagination:
            buildPagination({
              total,
              page,
              limit
            })
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch exams"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Exams
|--------------------------------------------------------------------------
*/

exports.getDeletedExams =
  async (
    req,
    res
  ) => {
    try {
      const {
        filter
      } = buildExamFilter(
        req,
        {
          deleted:
            true
        }
      );

      const {
        page,
        limit,
        skip
      } = getPaginationOptions(
        req.query
      );

      const [
        exams,
        total
      ] = await Promise.all([
        populateExam(
          Exam.find(
            filter
          )
            .sort({
              deletedAt:
                -1,

              updatedAt:
                -1
            })
            .skip(
              skip
            )
            .limit(
              limit
            )
        ),

        Exam.countDocuments(
          filter
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,

          count:
            exams.length,

          exams,

          pagination:
            buildPagination({
              total,
              page,
              limit
            })
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch deleted exams"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Exam Summary
|--------------------------------------------------------------------------
*/

exports.getExamSummary =
  async (
    req,
    res
  ) => {
    try {
      const schoolScope =
        requireSchoolScope(
          req
        );

      const match = {
        ...schoolScope
          .aggregateMatch,

        isDeleted: {
          $ne: true
        }
      };

      if (
        req.query.academicYear
      ) {
        match.academicYear =
          normalizeText(
            req.query
              .academicYear
          );
      }

      const now =
        new Date();

      const [
        grouped,
        upcomingCount,
        ongoingCount,
        publishedCount
      ] = await Promise.all([
        Exam.aggregate([
          {
            $match:
              match
          },
          {
            $group: {
              _id:
                "$status",

              count: {
                $sum: 1
              }
            }
          }
        ]),

        Exam.countDocuments({
          ...schoolScope.filter,

          isDeleted: {
            $ne: true
          },

          startDate: {
            $gt:
              now
          },

          status: {
            $nin: [
              "cancelled",
              "archived"
            ]
          },

          ...(
            req.query
              .academicYear
              ? {
                  academicYear:
                    normalizeText(
                      req.query
                        .academicYear
                    )
                }
              : {}
          )
        }),

        Exam.countDocuments({
          ...schoolScope.filter,

          isDeleted: {
            $ne: true
          },

          startDate: {
            $lte:
              now
          },

          endDate: {
            $gte:
              now
          },

          status: {
            $nin: [
              "cancelled",
              "archived"
            ]
          },

          ...(
            req.query
              .academicYear
              ? {
                  academicYear:
                    normalizeText(
                      req.query
                        .academicYear
                    )
                }
              : {}
          )
        }),

        Exam.countDocuments({
          ...schoolScope.filter,

          isDeleted: {
            $ne: true
          },

          status: {
            $in: [
              "published",
              "locked"
            ]
          },

          ...(
            req.query
              .academicYear
              ? {
                  academicYear:
                    normalizeText(
                      req.query
                        .academicYear
                    )
                }
              : {}
          )
        })
      ]);

      const byStatus =
        Object.fromEntries(
          EXAM_STATUSES.map(
            (
              status
            ) => [
              status,
              0
            ]
          )
        );

      grouped.forEach(
        (
          row
        ) => {
          byStatus[
            row._id
          ] =
            row.count;
        }
      );

      const total =
        Object.values(
          byStatus
        ).reduce(
          (
            sum,
            count
          ) =>
            sum +
            count,
          0
        );

      return res
        .status(200)
        .json({
          success: true,

          summary: {
            total,

            upcoming:
              upcomingCount,

            ongoing:
              ongoingCount,

            published:
              publishedCount,

            byStatus
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch exam summary"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Exam by ID
|--------------------------------------------------------------------------
*/

exports.getExamById =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        throw new ExamControllerError(
          "Invalid exam ID format",
          400
        );
      }

      const schoolScope =
        requireSchoolScope(
          req
        );

      const exam =
        await populateExam(
          Exam.findOne({
            _id:
              req.params.id,

            ...schoolScope
              .filter,

            isDeleted: {
              $ne: true
            }
          })
        );

      if (!exam) {
        throw new ExamControllerError(
          "Exam not found or access is not allowed",
          404
        );
      }

      const [
        responseExam,
        dependencies,
        workflowState
      ] = await Promise.all([
        enrichAssignedTeachers(
          exam
        ),

        getExamDependencyCounts(
          exam._id,
          getDocumentId(
            exam.schoolId
          )
        ),

        getExamWorkflowState(
          exam
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,

          exam:
            responseExam,

          dependencies,

          workflowState,

          allowedStatusTransitions:
            Exam.getAllowedStatusTransitions(
              exam.status
            )
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch exam"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Update Exam
|--------------------------------------------------------------------------
*/

exports.updateExam =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        throw new ExamControllerError(
          "Invalid exam ID format",
          400
        );
      }

      const schoolScope =
        requireSchoolScope(
          req
        );

      const exam =
        await Exam.findOne({
          _id:
            req.params.id,

          ...schoolScope.filter,

          isDeleted: {
            $ne: true
          }
        });

      if (!exam) {
        throw new ExamControllerError(
          "Exam not found or access is not allowed",
          404
        );
      }

      if (
        exam.lock?.isLocked ||
        [
          "locked",
          "archived",
          "cancelled"
        ].includes(
          exam.status
        )
      ) {
        throw new ExamControllerError(
          "This exam cannot be edited in its current status",
          409
        );
      }

      const payload =
        buildExamPayload(
          req.body
        );

      delete payload.status;
      delete payload.schoolId;

      if (
        Object.keys(
          payload
        ).length ===
        0
      ) {
        throw new ExamControllerError(
          "No valid exam fields were provided for update",
          400
        );
      }

      const submittedFields =
        Object.keys(
          payload
        );

      const structuralFields =
        submittedFields.filter(
          (
            field
          ) =>
            STRUCTURAL_EXAM_FIELDS.includes(
              field
            )
        );

      if (
        exam.status !==
          "draft" &&
        structuralFields.length >
          0
      ) {
        throw new ExamControllerError(
          "Exam structure can only be changed while the exam is in draft status",
          409,

          {
            blockedFields:
              structuralFields
          }
        );
      }

      if (
        exam.status ===
          "scheduled"
      ) {
        const invalidFields =
          submittedFields.filter(
            (
              field
            ) =>
              !SCHEDULED_EDITABLE_FIELDS.includes(
                field
              )
          );

        if (
          invalidFields.length >
          0
        ) {
          throw new ExamControllerError(
            "Only descriptive, marks-window, publication and result-setting fields can be updated after scheduling",
            409,

            {
              blockedFields:
                invalidFields
            }
          );
        }
      }

      if (
        ![
          "draft",
          "scheduled"
        ].includes(
          exam.status
        )
      ) {
        throw new ExamControllerError(
          "Standard exam editing is unavailable after the exam starts",
          409
        );
      }

      const oldData =
        getExamAuditSnapshot(
          exam
        );

      const currentData =
        exam.toObject({
          virtuals: false
        });

      const mergedValues = {
        ...currentData,
        ...payload,

        resultSettings: {
          ...(
            currentData
              .resultSettings ||
            {}
          ),
          ...(
            payload
              .resultSettings ||
            {}
          )
        }
      };

      const configuration =
        await validateExamConfiguration({
          schoolId:
            getDocumentId(
              exam.schoolId
            ),

          values:
            mergedValues,

          requireActiveGradeScheme:
            exam.status !==
            "draft"
        });

      Object.entries(
        payload
      ).forEach(
        ([
          field,
          value
        ]) => {
          exam[
            field
          ] =
            value;
        }
      );

      exam.applicableClasses =
        configuration
          .applicableClasses;

      exam.subjectRules =
        configuration
          .subjectRules;

      exam.resultSettings =
        configuration
          .resultSettings;

      exam.updatedBy =
        req.user._id;

      exam.versionNumber =
        Number(
          exam.versionNumber ||
          1
        ) +
        1;

      await exam.save();

      const populatedExam =
        await populateExam(
          Exam.findById(
            exam._id
          )
        );

      const responseExam =
        await enrichAssignedTeachers(
          populatedExam
        );

      await recordAuditLog({
        req,

        schoolId:
          exam.schoolId,

        action:
          "UPDATE",

        module:
          "EXAM",

        recordId:
          exam._id,

        recordModel:
          "Exam",

        description:
          `${req.user.role} updated exam: ${exam.examName}`,

        oldData,

        newData:
          getExamAuditSnapshot(
            exam
          ),

        status:
          "success",

        metadata: {
          updatedFields:
            submittedFields,

          versionNumber:
            exam.versionNumber
        }
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Exam updated successfully",

          exam:
            responseExam
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to update exam"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Update Exam Status
|--------------------------------------------------------------------------
*/

exports.updateExamStatus =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        throw new ExamControllerError(
          "Invalid exam ID format",
          400
        );
      }

      const schoolScope =
        requireSchoolScope(
          req
        );

      const exam =
        await Exam.findOne({
          _id:
            req.params.id,

          ...schoolScope.filter,

          isDeleted: {
            $ne: true
          }
        });

      if (!exam) {
        throw new ExamControllerError(
          "Exam not found or access is not allowed",
          404
        );
      }

      const nextStatus =
        normalizeText(
          req.body.status
        ).toLowerCase();

      if (!nextStatus) {
        throw new ExamControllerError(
          "New exam status is required",
          400
        );
      }

      const oldData = {
        status:
          exam.status,

        isActive:
          exam.isActive,

        approval:
          getPlainData(
            exam.approval
          ),

        publication:
          getPlainData(
            exam.publication
          ),

        lock:
          getPlainData(
            exam.lock
          )
      };

      const {
        workflowState
      } = await validateStatusTransition({
        exam,
        nextStatus,
        body:
          req.body
      });

      if (
        nextStatus ===
        exam.status
      ) {
        const populatedExam =
          await populateExam(
            Exam.findById(
              exam._id
            )
          );

        return res
          .status(200)
          .json({
            success: true,

            message:
              "Exam status is already up to date",

            exam:
              await enrichAssignedTeachers(
                populatedExam
              ),

            workflowState
          });
      }

      applyStatusMetadata({
        exam,
        nextStatus,
        body:
          req.body,

        userId:
          req.user._id
      });

      exam.versionNumber =
        Number(
          exam.versionNumber ||
          1
        ) +
        1;

      await exam.save();

      const populatedExam =
        await populateExam(
          Exam.findById(
            exam._id
          )
        );

      const responseExam =
        await enrichAssignedTeachers(
          populatedExam
        );

      await recordAuditLog({
        req,

        schoolId:
          exam.schoolId,

        action:
          "STATUS_CHANGE",

        module:
          "EXAM",

        recordId:
          exam._id,

        recordModel:
          "Exam",

        description:
          `${req.user.role} changed exam status from ${oldData.status} to ${nextStatus}: ${exam.examName}`,

        oldData,

        newData: {
          status:
            exam.status,

          isActive:
            exam.isActive,

          approval:
            getPlainData(
              exam.approval
            ),

          publication:
            getPlainData(
              exam.publication
            ),

          lock:
            getPlainData(
              exam.lock
            )
        },

        status:
          "success",

        metadata: {
          cancellationReason:
            exam.cancellationReason,

          lockReason:
            exam.lock
              ?.lockReason ||
            "",

          versionNumber:
            exam.versionNumber
        }
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            `Exam status changed to ${nextStatus} successfully`,

          exam:
            responseExam,

          workflowState
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to update exam status"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Clone Exam
|--------------------------------------------------------------------------
*/

exports.cloneExam =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        throw new ExamControllerError(
          "Invalid source exam ID format",
          400
        );
      }

      const schoolScope =
        requireSchoolScope(
          req
        );

      const sourceExam =
        await Exam.findOne({
          _id:
            req.params.id,

          ...schoolScope.filter,

          isDeleted: {
            $ne: true
          }
        });

      if (!sourceExam) {
        throw new ExamControllerError(
          "Source exam not found or access is not allowed",
          404
        );
      }

      const newExamCode =
        normalizeCode(
          req.body.examCode
        );

      const newAcademicYear =
        normalizeText(
          req.body
            .academicYear
        );

      const newStartDate =
        req.body.startDate;

      const newEndDate =
        req.body.endDate;

      if (
        !newExamCode ||
        !newAcademicYear ||
        !newStartDate ||
        !newEndDate
      ) {
        throw new ExamControllerError(
          "New exam code, academic year, start date and end date are required",
          400
        );
      }

      const sourceData =
        sourceExam.toObject({
          virtuals: false
        });

      const requestedResultSettings =
        req.body
          .resultSettings &&
        typeof req.body
          .resultSettings ===
          "object" &&
        !Array.isArray(
          req.body
            .resultSettings
        )
          ? req.body
              .resultSettings
          : {};

      const clonePayload = {
        examCode:
          newExamCode,

        examName:
          normalizeText(
            req.body.examName
          ) ||
          `${sourceExam.examName} Copy`,

        examType:
          normalizeText(
            req.body.examType ||
            sourceExam.examType
          ).toLowerCase(),

        academicYear:
          newAcademicYear,

        academicTerm:
          normalizeText(
            req.body.academicTerm ??
            sourceExam.academicTerm
          ),

        description:
          normalizeText(
            req.body.description ??
            sourceExam.description
          ),

        instructions:
          normalizeText(
            req.body.instructions ??
            sourceExam.instructions
          ),

        startDate:
          newStartDate,

        endDate:
          newEndDate,

        marksEntryOpensAt:
          req.body
            .marksEntryOpensAt ||
          null,

        marksEntryClosesAt:
          req.body
            .marksEntryClosesAt ||
          null,

        resultPublicationDate:
          req.body
            .resultPublicationDate ||
          null,

        applicableClasses:
          sourceData
            .applicableClasses,

        subjectRules:
          sourceData
            .subjectRules,

        resultSettings: {
          ...(
            sourceData
              .resultSettings ||
            {}
          ),

          gradeSchemeId:
            null,

          ...requestedResultSettings
        },

        isActive:
          true
      };

      const configuration =
        await validateExamConfiguration({
          schoolId:
            getDocumentId(
              sourceExam.schoolId
            ),

          values:
            clonePayload,

          requireActiveGradeScheme:
            false
        });

      const clonedExam =
        await Exam.create({
          ...clonePayload,

          schoolId:
            sourceExam.schoolId,

          applicableClasses:
            configuration
              .applicableClasses,

          subjectRules:
            configuration
              .subjectRules,

          resultSettings:
            configuration
              .resultSettings,

          status:
            "draft",

          approval: {},

          publication: {},

          lock: {},

          cancellationReason:
            "",

          cancelledAt:
            null,

          cancelledBy:
            null,

          archivedAt:
            null,

          archivedBy:
            null,

          versionNumber:
            1,

          createdBy:
            req.user._id,

          updatedBy:
            req.user._id,

          isDeleted:
            false,

          deletedAt:
            null,

          deletedBy:
            null
        });

      const populatedExam =
        await populateExam(
          Exam.findById(
            clonedExam._id
          )
        );

      const responseExam =
        await enrichAssignedTeachers(
          populatedExam
        );

      await recordAuditLog({
        req,

        schoolId:
          clonedExam.schoolId,

        action:
          "CREATE",

        module:
          "EXAM",

        recordId:
          clonedExam._id,

        recordModel:
          "Exam",

        description:
          `${req.user.role} cloned exam ${sourceExam.examName} as ${clonedExam.examName}`,

        oldData:
          null,

        newData:
          getExamAuditSnapshot(
            clonedExam
          ),

        status:
          "success",

        metadata: {
          clonedFromExamId:
            sourceExam._id,

          sourceExamCode:
            sourceExam.examCode,

          newExamCode:
            clonedExam.examCode
        }
      });

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Exam cloned successfully",

          exam:
            responseExam
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to clone exam"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Exam
|--------------------------------------------------------------------------
*/

exports.deleteExam =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        throw new ExamControllerError(
          "Invalid exam ID format",
          400
        );
      }

      const schoolScope =
        requireSchoolScope(
          req
        );

      const exam =
        await Exam.findOne({
          _id:
            req.params.id,

          ...schoolScope.filter,

          isDeleted: {
            $ne: true
          }
        });

      if (!exam) {
        throw new ExamControllerError(
          "Exam not found or access is not allowed",
          404
        );
      }

      if (
        !DELETE_ALLOWED_STATUSES.includes(
          exam.status
        )
      ) {
        throw new ExamControllerError(
          "Only draft, cancelled or archived exams can be deleted",
          409
        );
      }

      const dependencies =
        await getExamDependencyCounts(
          exam._id,
          getDocumentId(
            exam.schoolId
          )
        );

      if (
        dependencies.total >
        0
      ) {
        throw new ExamControllerError(
          "This exam cannot be deleted because schedules, marks, results or report cards are linked to it",
          409,
          dependencies
        );
      }

      const oldData =
        getExamAuditSnapshot(
          exam
        );

      exam.isDeleted =
        true;

      exam.deletedAt =
        new Date();

      exam.deletedBy =
        req.user._id;

      exam.updatedBy =
        req.user._id;

      exam.isActive =
        false;

      exam.versionNumber =
        Number(
          exam.versionNumber ||
          1
        ) +
        1;

      await exam.save();

      await recordAuditLog({
        req,

        schoolId:
          exam.schoolId,

        action:
          "DELETE",

        module:
          "EXAM",

        recordId:
          exam._id,

        recordModel:
          "Exam",

        description:
          `${req.user.role} soft deleted exam: ${exam.examName}`,

        oldData,

        newData:
          getExamAuditSnapshot(
            exam
          ),

        status:
          "success",

        metadata: {
          softDelete:
            true,

          deletedAt:
            exam.deletedAt
        }
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Exam deleted successfully"
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to delete exam"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Restore Exam
|--------------------------------------------------------------------------
*/

exports.restoreExam =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        throw new ExamControllerError(
          "Invalid exam ID format",
          400
        );
      }

      const schoolScope =
        requireSchoolScope(
          req
        );

      const exam =
        await Exam.findOne({
          _id:
            req.params.id,

          ...schoolScope.filter,

          isDeleted:
            true
        });

      if (!exam) {
        throw new ExamControllerError(
          "Deleted exam not found or access is not allowed",
          404
        );
      }

      const duplicate =
        await Exam.findOne({
          schoolId:
            exam.schoolId,

          examCode:
            exam.examCode,

          academicYear:
            exam.academicYear,

          _id: {
            $ne:
              exam._id
          },

          isDeleted: {
            $ne: true
          }
        }).select(
          "_id examCode examName"
        );

      if (duplicate) {
        throw new ExamControllerError(
          "This exam cannot be restored because another active exam uses the same code and academic year",
          409,

          {
            conflictingExamId:
              duplicate._id,

            conflictingExamName:
              duplicate.examName
          }
        );
      }

      const oldData =
        getExamAuditSnapshot(
          exam
        );

      exam.isDeleted =
        false;

      exam.deletedAt =
        null;

      exam.deletedBy =
        null;

      exam.updatedBy =
        req.user._id;

      exam.isActive =
        ![
          "cancelled",
          "archived"
        ].includes(
          exam.status
        );

      exam.versionNumber =
        Number(
          exam.versionNumber ||
          1
        ) +
        1;

      await exam.save();

      const populatedExam =
        await populateExam(
          Exam.findById(
            exam._id
          )
        );

      const responseExam =
        await enrichAssignedTeachers(
          populatedExam
        );

      await recordAuditLog({
        req,

        schoolId:
          exam.schoolId,

        action:
          "RESTORE",

        module:
          "EXAM",

        recordId:
          exam._id,

        recordModel:
          "Exam",

        description:
          `${req.user.role} restored exam: ${exam.examName}`,

        oldData,

        newData:
          getExamAuditSnapshot(
            exam
          ),

        status:
          "success",

        metadata: {
          restored:
            true,

          versionNumber:
            exam.versionNumber
        }
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Exam restored successfully",

          exam:
            responseExam
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to restore exam"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Exam Setup Options
|--------------------------------------------------------------------------
*/

exports.getExamSetupOptions =
  async (
    req,
    res
  ) => {
    try {
      const schoolScope =
        requireSchoolScope(
          req
        );

      let schoolId =
        schoolScope
          .selectedSchoolId;

      if (
        !schoolId &&
        isSuperAdmin(req)
      ) {
        schoolId =
          normalizeText(
            req.query.schoolId
          );

        if (!schoolId) {
          throw new ExamControllerError(
            "Super Admin must select a school to load exam setup options",
            400
          );
        }
      }

      const school =
        await verifySchool(
          schoolId
        );

      const academicYear =
        normalizeText(
          req.query
            .academicYear ||
          school.sessionYear
        );

      const [
        classes,
        subjects,
        teachers,
        gradeSchemes
      ] = await Promise.all([
        Class.find({
          schoolId,

          isActive:
            true,

          isDeleted: {
            $ne: true
          }
        })
          .select(
            "className numericOrder sections isActive"
          )
          .sort({
            numericOrder:
              1,

            className:
              1
          })
          .lean(),

        Subject.find({
          schoolId,

          isActive:
            true,

          isDeleted: {
            $ne: true
          }
        })
          .select(
            "classId teacherId subjectCode subjectName description isActive"
          )
          .sort({
            subjectName:
              1
          })
          .lean(),

        Teacher.find({
          schoolId,

          status:
            "active",

          isDeleted: {
            $ne: true
          }
        })
          .select(
            "employeeId name qualification subjects teacherPhoto status"
          )
          .sort({
            name:
              1
          })
          .lean(),

        GradeScheme.find({
          schoolId,

          ...(
            academicYear
              ? {
                  academicYear
                }
              : {}
          ),

          status: {
            $ne:
              "archived"
          },

          isDeleted: {
            $ne: true
          }
        })
          .select(
            "schemeCode schemeName academicYear description applicableClassIds applicableExamTypes minimumPassingPercentage status isDefault isActive coverageComplete"
          )
          .sort({
            isDefault:
              -1,

            status:
              1,

            schemeName:
              1
          })
          .lean()
      ]);

      const subjectsByClass =
        classes.map(
          (
            classRecord
          ) => ({
            classId:
              classRecord._id,

            className:
              classRecord.className,

            subjects:
              subjects.filter(
                (
                  subject
                ) =>
                  String(
                    subject.classId
                  ) ===
                  String(
                    classRecord._id
                  )
              )
          })
        );

      return res
        .status(200)
        .json({
          success: true,

          school,

          academicYear,

          classes,

          subjects,

          subjectsByClass,

          teachers,

          gradeSchemes,

          constants: {
            examTypes:
              EXAM_TYPES,

            examStatuses:
              EXAM_STATUSES,

            resultVisibility:
              RESULT_VISIBILITY,

            allowedStatusTransitions:
              ALLOWED_STATUS_TRANSITIONS,

            structuralFields:
              STRUCTURAL_EXAM_FIELDS,

            scheduledEditableFields:
              SCHEDULED_EDITABLE_FIELDS
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to load exam setup options"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Exam Dependencies
|--------------------------------------------------------------------------
*/

exports.getExamDependencies =
  async (
    req,
    res
  ) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        throw new ExamControllerError(
          "Invalid exam ID format",
          400
        );
      }

      const schoolScope =
        requireSchoolScope(
          req
        );

      const exam =
        await Exam.findOne({
          _id:
            req.params.id,

          ...schoolScope.filter,

          isDeleted: {
            $ne: true
          }
        }).select(
          "_id schoolId examCode examName status"
        );

      if (!exam) {
        throw new ExamControllerError(
          "Exam not found or access is not allowed",
          404
        );
      }

      const [
        dependencies,
        workflowState
      ] = await Promise.all([
        getExamDependencyCounts(
          exam._id,
          getDocumentId(
            exam.schoolId
          )
        ),

        getExamWorkflowState(
          exam
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,

          exam: {
            id:
              exam._id,

            examCode:
              exam.examCode,

            examName:
              exam.examName,

            status:
              exam.status
          },

          dependencies,

          workflowState,

          canDelete:
            dependencies.total ===
              0 &&
            DELETE_ALLOWED_STATUSES.includes(
              exam.status
            ),

          allowedStatusTransitions:
            Exam.getAllowedStatusTransitions(
              exam.status
            )
        });
    } catch (
      error
    ) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch exam dependencies"
      );
    }
  };
