const mongoose = require("mongoose");

const ParentStudentLink = require("../models/ParentStudentLink");
const Student = require("../models/Student");
const ExamResult = require("../models/ExamResult");
const ReportCard = require("../models/ReportCard");

/*
|--------------------------------------------------------------------------
| Parent Portal Result Controller
|--------------------------------------------------------------------------
|
| Security:
| - Only authenticated parent accounts can use these handlers.
| - studentId is only a selector; parent-child ownership is always verified.
| - ParentStudentLink must be active + verified.
| - Legacy Student.parentUserIds linking is supported.
| - Existing "academics" permission controls results/report-card access.
| - Only published/locked completed results are returned.
| - Only published parent-visible report cards are returned.
|
*/

const PUBLISHED_RESULT_STATUSES = [
  "published",
  "locked"
];

const PARENT_VISIBLE_RESULT_STATUSES = [
  "pass",
  "fail"
];

const PARENT_VISIBLE_REPORT_CARD_STATUSES = [
  "published"
];

const PARENT_VISIBLE_REPORT_CARD_VISIBILITY = [
  "student_parent",
  "public_verification"
];

const DEFAULT_PAGE_SIZE = 20;

const MAX_PAGE_SIZE = 100;

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const normalizeText = (
  value
) =>
  value === undefined ||
  value === null
    ? ""
    : String(value)
        .trim()
        .replace(
          /\s+/g,
          " "
        );

const normalizeRole = (
  value
) =>
  normalizeText(
    value
  ).toLowerCase();

const isValidObjectId = (
  value
) =>
  mongoose.Types.ObjectId.isValid(
    value
  );

const getDocumentId = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "object"
  ) {
    return String(
      value._id ||
        value.id ||
        ""
    );
  }

  return String(
    value
  );
};

const getPositiveInteger = (
  value,
  fallback,
  maximum = null
) => {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(
      parsed
    ) ||
    parsed <= 0
  ) {
    return fallback;
  }

  if (
    maximum &&
    parsed > maximum
  ) {
    return maximum;
  }

  return parsed;
};

const roundNumber = (
  value,
  precision = 2
) => {
  const number =
    Number(
      value || 0
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

const handleControllerError = (
  response,
  error,
  defaultMessage
) => {
  console.error(
    `${defaultMessage}:`,
    error
  );

  if (
    error.name ===
    "ValidationError"
  ) {
    return response
      .status(400)
      .json({
        success: false,

        message:
          Object.values(
            error.errors ||
              {}
          )
            .map(
              (
                item
              ) =>
                item.message
            )
            .join(" ")
      });
  }

  if (
    error.name ===
    "CastError"
  ) {
    return response
      .status(400)
      .json({
        success: false,

        message:
          "One of the supplied record IDs is invalid."
      });
  }

  return response
    .status(
      error.statusCode ||
        500
    )
    .json({
      success: false,

      message:
        error.statusCode
          ? error.message
          : defaultMessage,

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
| Parent Authentication Helpers
|--------------------------------------------------------------------------
*/

const getAuthenticatedUserId = (
  request
) => {
  const value =
    request.user?._id ||
    request.user?.id;

  return value
    ? String(
        value
      )
    : "";
};

const getAuthenticatedSchoolId = (
  request
) => {
  const value =
    request.user
      ?.schoolId
      ?._id ||
    request.user
      ?.schoolId ||
    request.schoolFilter
      ?.schoolId;

  return value
    ? String(
        value
      )
    : "";
};

const validateParentRequest = (
  request,
  response
) => {
  if (!request.user) {
    response
      .status(401)
      .json({
        success: false,

        message:
          "Authentication is required."
      });

    return null;
  }

  if (
    normalizeRole(
      request.user.role
    ) !==
    "parent"
  ) {
    response
      .status(403)
      .json({
        success: false,

        message:
          "This endpoint is available only to parent accounts."
      });

    return null;
  }

  const parentUserId =
    getAuthenticatedUserId(
      request
    );

  const schoolId =
    getAuthenticatedSchoolId(
      request
    );

  if (
    !parentUserId ||
    !isValidObjectId(
      parentUserId
    )
  ) {
    response
      .status(401)
      .json({
        success: false,

        message:
          "The authenticated parent account is invalid."
      });

    return null;
  }

  if (
    !schoolId ||
    !isValidObjectId(
      schoolId
    )
  ) {
    response
      .status(403)
      .json({
        success: false,

        message:
          "No active school is assigned to this parent account."
      });

    return null;
  }

  return {
    parentUserId,
    schoolId
  };
};

/*
|--------------------------------------------------------------------------
| Parent-Student Link Security
|--------------------------------------------------------------------------
|
| ParentStudentLink میں ابھی الگ results permission نہیں ہے۔
| اس لیے results/report cards existing "academics" permission استعمال کرتے ہیں۔
|
*/

const buildLinkPermissions = (
  link
) => {
  const source =
    link
      ?.accessPermissions;

  if (!source) {
    return {
      academics: true
    };
  }

  return {
    academics:
      source.academics !==
      false
  };
};

const populateStudentQuery = (
  query
) =>
  query
    .populate(
      "schoolId",
      "schoolName schoolCode type address phone email sessionYear isActive"
    )
    .populate(
      "classId",
      "className numericOrder sections isActive"
    )
    .populate(
      "studentUserId",
      "name email phone photo role isActive"
    );

const findParentChildAccess =
  async ({
    parentUserId,
    schoolId,
    studentId
  }) => {
    if (
      !studentId ||
      !isValidObjectId(
        studentId
      )
    ) {
      return {
        errorStatus: 400,

        errorMessage:
          "Invalid student ID."
      };
    }

    /*
    |--------------------------------------------------------------------------
    | New ParentStudentLink System
    |--------------------------------------------------------------------------
    */

    const link =
      await ParentStudentLink.findOne({
        schoolId,
        parentUserId,
        studentId
      });

    if (link) {
      if (
        link.isDeleted ||
        link.status !==
          "active" ||
        link.verificationStatus !==
          "verified"
      ) {
        return {
          errorStatus: 403,

          errorMessage:
            "This parent–student link is not active and verified."
        };
      }

      const student =
        await populateStudentQuery(
          Student.findOne({
            _id:
              studentId,

            schoolId,

            isDeleted: {
              $ne: true
            }
          })
        );

      if (!student) {
        return {
          errorStatus: 404,

          errorMessage:
            "The linked student record was not found."
        };
      }

      return {
        student,
        link,

        legacy: false,

        permissions:
          buildLinkPermissions(
            link
          )
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Legacy Student.parentUserIds Support
    |--------------------------------------------------------------------------
    |
    | پرانے records میں اگر ParentStudentLink model استعمال نہیں ہوا تو
    | Student.parentUserIds سے ownership verify کی جائے گی۔
    |
    */

    const legacyStudent =
      await populateStudentQuery(
        Student.findOne({
          _id:
            studentId,

          schoolId,

          isDeleted: {
            $ne: true
          },

          parentUserIds:
            parentUserId
        })
      );

    if (
      !legacyStudent
    ) {
      return {
        errorStatus: 404,

        errorMessage:
          "Child not found or not linked with this parent account."
      };
    }

    return {
      student:
        legacyStudent,

      link: null,

      legacy: true,

      permissions: {
        academics: true
      }
    };
  };

const authorizeParentChildResults =
  async (
    request,
    response
  ) => {
    /*
    |--------------------------------------------------------------------------
    | Step 1: Parent Login + School
    |--------------------------------------------------------------------------
    */

    const parentScope =
      validateParentRequest(
        request,
        response
      );

    if (
      !parentScope
    ) {
      return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Step 2: Verify Child Ownership
    |--------------------------------------------------------------------------
    */

    const access =
      await findParentChildAccess({
        ...parentScope,

        studentId:
          request.params
            .studentId
      });

    if (
      access.errorStatus
    ) {
      response
        .status(
          access.errorStatus
        )
        .json({
          success: false,

          message:
            access.errorMessage
        });

      return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Step 3: Academic Permission
    |--------------------------------------------------------------------------
    */

    if (
      !access.permissions
        ?.academics
    ) {
      response
        .status(403)
        .json({
          success: false,

          message:
            "Parent access to academic results is not enabled for this child."
        });

      return null;
    }

    return {
      ...parentScope,
      ...access
    };
  };

/*
|--------------------------------------------------------------------------
| Student Serialization
|--------------------------------------------------------------------------
*/

const serializeStudent = (
  student
) => {
  if (!student) {
    return null;
  }

  const school =
    student.schoolId &&
    typeof student.schoolId ===
      "object"
      ? student.schoolId
      : null;

  const classRecord =
    student.classId &&
    typeof student.classId ===
      "object"
      ? student.classId
      : null;

  let sectionName =
    student.sectionName ||
    "";

  /*
  |--------------------------------------------------------------------------
  | Resolve Section Name from Class Sections
  |--------------------------------------------------------------------------
  */

  if (
    !sectionName &&
    classRecord &&
    Array.isArray(
      classRecord.sections
    )
  ) {
    const section =
      classRecord.sections.find(
        (
          item
        ) =>
          String(
            item._id
          ) ===
          String(
            student.sectionId
          )
      );

    sectionName =
      section?.sectionName ||
      "";
  }

  return {
    id:
      student._id,

    admissionNumber:
      student.admissionNumber ||
      "",

    rollNumber:
      student.rollNumber ||
      "",

    name:
      student.name ||
      student
        .studentUserId
        ?.name ||
      "",

    fatherName:
      student.fatherName ||
      "",

    guardianName:
      student.guardianName ||
      "",

    photo:
      student.studentPhoto ||
      student
        .studentUserId
        ?.photo ||
      "",

    status:
      student.status ||
      "",

    class: {
      id:
        classRecord?._id ||
        student.classId ||
        null,

      className:
        classRecord
          ?.className ||
        "",

      numericOrder:
        classRecord
          ?.numericOrder ||
        0
    },

    sectionName,

    school: {
      id:
        school?._id ||
        student.schoolId ||
        null,

      schoolName:
        school
          ?.schoolName ||
        "",

      schoolCode:
        school
          ?.schoolCode ||
        "",

      sessionYear:
        school
          ?.sessionYear ||
        ""
    }
  };
};

/*
|--------------------------------------------------------------------------
| Parent Link Serialization
|--------------------------------------------------------------------------
*/

const serializeLink = (
  link,
  legacy = false
) => {
  if (legacy) {
    return {
      id: null,

      relationship:
        "guardian",

      relationshipLabel:
        "Guardian",

      status:
        "active",

      verificationStatus:
        "verified",

      permissions: {
        academics: true
      },

      legacy: true
    };
  }

  const relationship =
    link?.relationship ||
    "guardian";

  const relationshipLabel =
    relationship ===
    "other"
      ? link
          ?.customRelationship ||
        "Other"
      : relationship
          .replaceAll(
            "_",
            " "
          )
          .replace(
            /\b\w/g,
            (
              letter
            ) =>
              letter.toUpperCase()
          );

  return {
    id:
      link?._id ||
      null,

    relationship,

    relationshipLabel,

    isPrimary:
      Boolean(
        link?.isPrimary
      ),

    status:
      link?.status ||
      "",

    verificationStatus:
      link
        ?.verificationStatus ||
      "",

    permissions:
      buildLinkPermissions(
        link
      ),

    legacy: false
  };
};

/*
|--------------------------------------------------------------------------
| Report Card Summary
|--------------------------------------------------------------------------
*/

const serializeReportCardSummary = (
  reportCard
) => {
  if (!reportCard) {
    return null;
  }

  const canDownload =
    reportCard.status ===
      "published" &&
    reportCard
      .accessPolicy
      ?.allowParentDownload ===
      true;

  return {
    id:
      reportCard._id,

    reportCardNumber:
      reportCard
        .reportCardNumber ||
      "",

    versionNumber:
      reportCard
        .versionNumber ||
      1,

    status:
      reportCard.status,

    visibility:
      reportCard
        .accessPolicy
        ?.visibility ||
      "private",

    issuedAt:
      reportCard.issue
        ?.issuedAt ||
      null,

    publishedAt:
      reportCard
        .publication
        ?.publishedAt ||
      null,

    verificationCode:
      reportCard
        .verification
        ?.verificationCode ||
      "",

    canView:
      reportCard
        .accessPolicy
        ?.allowParentView !==
      false,

    canDownload,

    hasDocument:
      Boolean(
        reportCard.document
          ?.url
      ),

    documentUrl:
      canDownload
        ? reportCard.document
            ?.url ||
          ""
        : "",

    canPrint: true
  };
};

/*
|--------------------------------------------------------------------------
| Subject Result Serialization
|--------------------------------------------------------------------------
*/

const serializeSubjectResult = (
  subject,
  resultRules
) => {
  const grade =
    subject.grade ||
    {};

  return {
    studentMarkId:
      subject.studentMarkId ||
      null,

    subjectId:
      subject.subjectId
        ?._id ||
      subject.subjectId ||
      null,

    subjectCode:
      subject.subjectCode ||
      subject.subjectId
        ?.subjectCode ||
      "",

    subjectName:
      subject.subjectName ||
      subject.subjectId
        ?.subjectName ||
      "",

    displayOrder:
      subject.displayOrder ||
      0,

    isOptional:
      Boolean(
        subject.isOptional
      ),

    countsInTotal:
      subject.countsInTotal !==
      false,

    maxMarks:
      roundNumber(
        subject.maxMarks
      ),

    passingMarks:
      roundNumber(
        subject.passingMarks
      ),

    obtainedMarks:
      roundNumber(
        subject.obtainedMarks
      ),

    percentage:
      roundNumber(
        subject.percentage
      ),

    weightagePercentage:
      roundNumber(
        subject
          .weightagePercentage
      ),

    weightedScore:
      roundNumber(
        subject.weightedScore
      ),

    attendanceStatus:
      subject.attendanceStatus ||
      "present",

    resultStatus:
      subject.resultStatus ||
      "pending",

    grade:
      resultRules.showGrade !==
      false
        ? {
            grade:
              grade.grade ||
              "",

            label:
              grade.label ||
              "",

            gradePoint:
              grade.gradePoint ??
              null,

            remarks:
              grade.remarks ||
              ""
          }
        : null,

    teacherRemarks:
      resultRules
        .includeTeacherRemarks !==
      false
        ? subject.teacherRemarks ||
          ""
        : "",

    principalRemarks:
      resultRules
        .includePrincipalRemarks !==
      false
        ? subject
            .principalRemarks ||
          ""
        : ""
  };
};

/*
|--------------------------------------------------------------------------
| Result List Serialization
|--------------------------------------------------------------------------
*/

const serializeResultListItem = (
  result,
  reportCard = null
) => {
  const exam =
    result.examId &&
    typeof result.examId ===
      "object"
      ? result.examId
      : null;

  const classRecord =
    result.classId &&
    typeof result.classId ===
      "object"
      ? result.classId
      : null;

  const resultRules =
    result.resultRules ||
    {};

  const totals =
    result.totals ||
    {};

  const positions =
    result.positions ||
    {};

  const overallGrade =
    result.overallGrade ||
    {};

  return {
    id:
      result._id,

    exam: {
      id:
        exam?._id ||
        result.examId ||
        null,

      examCode:
        result.examCode ||
        exam?.examCode ||
        "",

      examName:
        result.examName ||
        exam?.examName ||
        "",

      examType:
        exam?.examType ||
        "",

      academicYear:
        result.academicYear ||
        exam?.academicYear ||
        "",

      academicTerm:
        result.academicTerm ||
        exam?.academicTerm ||
        "",

      examStatus:
        exam?.status ||
        "",

      publishedAt:
        result.publication
          ?.publishedAt ||
        exam?.publication
          ?.publishedAt ||
        null
    },

    class: {
      id:
        classRecord?._id ||
        result.classId ||
        null,

      className:
        result.className ||
        classRecord
          ?.className ||
        ""
    },

    sectionName:
      result.sectionName ||
      "",

    totals: {
      subjectCount:
        totals.subjectCount ||
        0,

      countedSubjectCount:
        totals
          .countedSubjectCount ||
        0,

      passedSubjectCount:
        totals
          .passedSubjectCount ||
        0,

      failedSubjectCount:
        totals
          .failedSubjectCount ||
        0,

      absentSubjectCount:
        totals
          .absentSubjectCount ||
        0,

      totalMaxMarks:
        roundNumber(
          totals.totalMaxMarks
        ),

      totalObtainedMarks:
        roundNumber(
          totals
            .totalObtainedMarks
        ),

      percentage:
        roundNumber(
          totals.percentage
        ),

      gradePointAverage:
        resultRules.showGPA
          ? roundNumber(
              totals
                .gradePointAverage
            )
          : null
    },

    overallResultStatus:
      result
        .overallResultStatus,

    overallGrade:
      resultRules.showGrade !==
      false
        ? {
            grade:
              overallGrade.grade ||
              "",

            label:
              overallGrade.label ||
              "",

            gradePoint:
              overallGrade
                .gradePoint ??
              null,

            remarks:
              overallGrade
                .remarks ||
              ""
          }
        : null,

    positions: {
      classPosition:
        resultRules
          .rankingEnabled &&
        resultRules
          .showClassPosition
          ? positions
              .classPosition ||
            null
          : null,

      classCandidateCount:
        resultRules
          .rankingEnabled &&
        resultRules
          .showClassPosition
          ? positions
              .classCandidateCount ||
            0
          : 0,

      sectionPosition:
        resultRules
          .rankingEnabled &&
        resultRules
          .showSectionPosition
          ? positions
              .sectionPosition ||
            null
          : null,

      sectionCandidateCount:
        resultRules
          .rankingEnabled &&
        resultRules
          .showSectionPosition
          ? positions
              .sectionCandidateCount ||
            0
          : 0
    },

    status:
      result.status,

    reportCard:
      serializeReportCardSummary(
        reportCard
      )
  };
};

/*
|--------------------------------------------------------------------------
| Result Detail Serialization
|--------------------------------------------------------------------------
*/

const serializeResultDetail = (
  result
) => {
  const resultRules =
    result.resultRules ||
    {};

  const totals =
    result.totals ||
    {};

  const positions =
    result.positions ||
    {};

  const overallGrade =
    result.overallGrade ||
    {};

  const exam =
    result.examId &&
    typeof result.examId ===
      "object"
      ? result.examId
      : null;

  const classRecord =
    result.classId &&
    typeof result.classId ===
      "object"
      ? result.classId
      : null;

  return {
    id:
      result._id,

    /*
    |--------------------------------------------------------------------------
    | Exam
    |--------------------------------------------------------------------------
    */

    exam: {
      id:
        exam?._id ||
        result.examId ||
        null,

      examCode:
        result.examCode ||
        exam?.examCode ||
        "",

      examName:
        result.examName ||
        exam?.examName ||
        "",

      examType:
        exam?.examType ||
        "",

      academicYear:
        result.academicYear ||
        exam?.academicYear ||
        "",

      academicTerm:
        result.academicTerm ||
        exam?.academicTerm ||
        "",

      startDate:
        exam?.startDate ||
        null,

      endDate:
        exam?.endDate ||
        null,

      resultPublicationDate:
        exam
          ?.resultPublicationDate ||
        null,

      publishedAt:
        result.publication
          ?.publishedAt ||
        null
    },

    /*
    |--------------------------------------------------------------------------
    | Student Snapshot
    |--------------------------------------------------------------------------
    */

    student: {
      id:
        result.studentId
          ?._id ||
        result.studentId ||
        null,

      studentName:
        result.studentName ||
        "",

      fatherName:
        result.fatherName ||
        "",

      admissionNumber:
        result.admissionNumber ||
        "",

      rollNumber:
        result.rollNumber ||
        ""
    },

    /*
    |--------------------------------------------------------------------------
    | Class
    |--------------------------------------------------------------------------
    */

    class: {
      id:
        classRecord?._id ||
        result.classId ||
        null,

      className:
        result.className ||
        classRecord
          ?.className ||
        ""
    },

    sectionName:
      result.sectionName ||
      "",

    /*
    |--------------------------------------------------------------------------
    | Subjects
    |--------------------------------------------------------------------------
    */

    subjectResults:
      (
        result.subjectResults ||
        []
      )
        .map(
          (
            subject
          ) =>
            serializeSubjectResult(
              subject,
              resultRules
            )
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
        ),

    /*
    |--------------------------------------------------------------------------
    | Totals
    |--------------------------------------------------------------------------
    */

    totals: {
      subjectCount:
        totals.subjectCount ||
        0,

      countedSubjectCount:
        totals
          .countedSubjectCount ||
        0,

      passedSubjectCount:
        totals
          .passedSubjectCount ||
        0,

      failedSubjectCount:
        totals
          .failedSubjectCount ||
        0,

      absentSubjectCount:
        totals
          .absentSubjectCount ||
        0,

      leaveSubjectCount:
        totals
          .leaveSubjectCount ||
        0,

      exemptedSubjectCount:
        totals
          .exemptedSubjectCount ||
        0,

      withheldSubjectCount:
        totals
          .withheldSubjectCount ||
        0,

      totalMaxMarks:
        roundNumber(
          totals.totalMaxMarks
        ),

      totalObtainedMarks:
        roundNumber(
          totals
            .totalObtainedMarks
        ),

      totalWeightedScore:
        roundNumber(
          totals
            .totalWeightedScore
        ),

      percentage:
        roundNumber(
          totals.percentage
        ),

      gradePointAverage:
        resultRules.showGPA
          ? roundNumber(
              totals
                .gradePointAverage
            )
          : null
    },

    /*
    |--------------------------------------------------------------------------
    | Overall Result
    |--------------------------------------------------------------------------
    */

    overallResultStatus:
      result
        .overallResultStatus,

    overallGrade:
      resultRules.showGrade !==
      false
        ? {
            grade:
              overallGrade.grade ||
              "",

            label:
              overallGrade.label ||
              "",

            gradePoint:
              overallGrade
                .gradePoint ??
              null,

            remarks:
              overallGrade
                .remarks ||
              ""
          }
        : null,

    /*
    |--------------------------------------------------------------------------
    | Positions
    |--------------------------------------------------------------------------
    */

    positions: {
      classPosition:
        resultRules
          .rankingEnabled &&
        resultRules
          .showClassPosition
          ? positions
              .classPosition ||
            null
          : null,

      classCandidateCount:
        resultRules
          .rankingEnabled &&
        resultRules
          .showClassPosition
          ? positions
              .classCandidateCount ||
            0
          : 0,

      sectionPosition:
        resultRules
          .rankingEnabled &&
        resultRules
          .showSectionPosition
          ? positions
              .sectionPosition ||
            null
          : null,

      sectionCandidateCount:
        resultRules
          .rankingEnabled &&
        resultRules
          .showSectionPosition
          ? positions
              .sectionCandidateCount ||
            0
          : 0,

      calculatedAt:
        positions.calculatedAt ||
        null
    },

    /*
    |--------------------------------------------------------------------------
    | Attendance
    |--------------------------------------------------------------------------
    */

    attendanceSummary:
      resultRules
        .includeAttendance !==
      false
        ? result
            .attendanceSummary ||
          null
        : null,

    /*
    |--------------------------------------------------------------------------
    | Remarks
    |--------------------------------------------------------------------------
    */

    classTeacherRemarks:
      resultRules
        .includeTeacherRemarks !==
      false
        ? result
            .classTeacherRemarks ||
          ""
        : "",

    principalRemarks:
      resultRules
        .includePrincipalRemarks !==
      false
        ? result
            .principalRemarks ||
          ""
        : "",

    /*
    |--------------------------------------------------------------------------
    | Frontend Display Settings
    |--------------------------------------------------------------------------
    */

    resultSettings: {
      showGrade:
        resultRules.showGrade !==
        false,

      showGPA:
        Boolean(
          resultRules.showGPA
        ),

      showClassPosition:
        Boolean(
          resultRules
            .rankingEnabled &&
            resultRules
              .showClassPosition
        ),

      showSectionPosition:
        Boolean(
          resultRules
            .rankingEnabled &&
            resultRules
              .showSectionPosition
        ),

      includeAttendance:
        resultRules
          .includeAttendance !==
        false,

      includeTeacherRemarks:
        resultRules
          .includeTeacherRemarks !==
        false,

      includePrincipalRemarks:
        resultRules
          .includePrincipalRemarks !==
        false
    },

    status:
      result.status,

    publishedAt:
      result.publication
        ?.publishedAt ||
      null
  };
};

/*
|--------------------------------------------------------------------------
| Complete Parent Report Card Serialization
|--------------------------------------------------------------------------
*/

const serializeParentReportCard = (
  reportCard
) => {
  if (!reportCard) {
    return null;
  }

  const allowDownload =
    reportCard
      .accessPolicy
      ?.allowParentDownload ===
      true;

  return {
    id:
      reportCard._id,

    reportCardNumber:
      reportCard
        .reportCardNumber ||
      "",

    reportCardKey:
      reportCard
        .reportCardKey ||
      "",

    versionNumber:
      reportCard
        .versionNumber ||
      1,

    status:
      reportCard.status,

    /*
    |--------------------------------------------------------------------------
    | Official Immutable Snapshot
    |--------------------------------------------------------------------------
    */

    snapshot:
      reportCard.snapshot,

    /*
    |--------------------------------------------------------------------------
    | Layout
    |--------------------------------------------------------------------------
    */

    layout:
      reportCard.layout,

    /*
    |--------------------------------------------------------------------------
    | Parent Access
    |--------------------------------------------------------------------------
    */

    accessPolicy: {
      visibility:
        reportCard
          .accessPolicy
          ?.visibility ||
        "private",

      allowParentView:
        reportCard
          .accessPolicy
          ?.allowParentView !==
        false,

      allowParentDownload:
        allowDownload
    },

    /*
    |--------------------------------------------------------------------------
    | Generated Document
    |--------------------------------------------------------------------------
    |
    | URL صرف اس صورت return ہوگا جب parent download allowed ہو۔
    |
    */

    document: {
      available:
        Boolean(
          allowDownload &&
            reportCard
              .document
              ?.url
        ),

      url:
        allowDownload
          ? reportCard
              .document
              ?.url ||
            ""
          : "",

      fileName:
        allowDownload
          ? reportCard
              .document
              ?.fileName ||
            ""
          : "",

      mimeType:
        allowDownload
          ? reportCard
              .document
              ?.mimeType ||
            ""
          : ""
    },

    /*
    |--------------------------------------------------------------------------
    | Verification
    |--------------------------------------------------------------------------
    */

    verification: {
      verificationCode:
        reportCard
          .verification
          ?.verificationCode ||
        "",

      expiresAt:
        reportCard
          .verification
          ?.expiresAt ||
        null
    },

    /*
    |--------------------------------------------------------------------------
    | Issue
    |--------------------------------------------------------------------------
    */

    issue: {
      issuedAt:
        reportCard.issue
          ?.issuedAt ||
        null
    },

    /*
    |--------------------------------------------------------------------------
    | Publication
    |--------------------------------------------------------------------------
    */

    publication: {
      publishedAt:
        reportCard
          .publication
          ?.publishedAt ||
        null
    },

    canPrint: true,

    canDownload:
      allowDownload
  };
};

/*
|--------------------------------------------------------------------------
| Parent Report Card Filter
|--------------------------------------------------------------------------
*/

const buildParentReportCardFilter =
  ({
    schoolId,
    studentId,
    extra = {}
  }) => ({
    schoolId,

    studentId,

    /*
    |--------------------------------------------------------------------------
    | Published Only
    |--------------------------------------------------------------------------
    */

    status: {
      $in:
        PARENT_VISIBLE_REPORT_CARD_STATUSES
    },

    /*
    |--------------------------------------------------------------------------
    | Parent View Must Be Enabled
    |--------------------------------------------------------------------------
    */

    "accessPolicy.allowParentView": {
      $ne: false
    },

    /*
    |--------------------------------------------------------------------------
    | Parent-Safe Visibility
    |--------------------------------------------------------------------------
    */

    "accessPolicy.visibility": {
      $in:
        PARENT_VISIBLE_REPORT_CARD_VISIBILITY
    },

    /*
    |--------------------------------------------------------------------------
    | Ignore Deleted Cards
    |--------------------------------------------------------------------------
    */

    isDeleted: {
      $ne: true
    },

    ...extra
  });

/*
|--------------------------------------------------------------------------
| Published Result Filter
|--------------------------------------------------------------------------
*/

const buildPublishedResultFilter =
  ({
    schoolId,
    studentId,
    query = {}
  }) => {
    const filter = {
      schoolId,

      studentId,

      status: {
        $in:
          PUBLISHED_RESULT_STATUSES
      },

      overallResultStatus: {
        $in:
          PARENT_VISIBLE_RESULT_STATUSES
      },

      isDeleted: {
        $ne: true
      }
    };

    /*
    |--------------------------------------------------------------------------
    | Academic Year
    |--------------------------------------------------------------------------
    */

    const academicYear =
      normalizeText(
        query.academicYear
      );

    if (
      academicYear
    ) {
      filter.academicYear =
        academicYear;
    }

    /*
    |--------------------------------------------------------------------------
    | Academic Term
    |--------------------------------------------------------------------------
    */

    const academicTerm =
      normalizeText(
        query.academicTerm
      );

    if (
      academicTerm
    ) {
      filter.academicTerm =
        academicTerm;
    }

    /*
    |--------------------------------------------------------------------------
    | Pass / Fail Filter
    |--------------------------------------------------------------------------
    */

    const overallResultStatus =
      normalizeText(
        query
          .overallResultStatus
      ).toLowerCase();

    if (
      overallResultStatus
    ) {
      if (
        ![
          "pass",
          "fail"
        ].includes(
          overallResultStatus
        )
      ) {
        return {
          error:
            "overallResultStatus must be pass or fail."
        };
      }

      filter.overallResultStatus =
        overallResultStatus;
    }

    return {
      filter
    };
  };

/*
|--------------------------------------------------------------------------
| Load Latest Published Report Card for Each Result
|--------------------------------------------------------------------------
*/

const loadLatestReportCards =
  async ({
    schoolId,
    studentId,
    examResultIds
  }) => {
    if (
      !Array.isArray(
        examResultIds
      ) ||
      examResultIds.length ===
        0
    ) {
      return new Map();
    }

    const reportCards =
      await ReportCard.find(
        buildParentReportCardFilter({
          schoolId,

          studentId,

          extra: {
            examResultId: {
              $in:
                examResultIds
            }
          }
        })
      )
        .select(
          [
            "examResultId",
            "reportCardNumber",
            "versionNumber",
            "status",
            "accessPolicy",
            "document",
            "verification.verificationCode",
            "issue.issuedAt",
            "publication.publishedAt"
          ].join(" ")
        )
        .sort({
          examResultId: 1,

          versionNumber:
            -1,

          "publication.publishedAt":
            -1
        })
        .lean();

    const resultMap =
      new Map();

    reportCards.forEach(
      (
        reportCard
      ) => {
        const key =
          getDocumentId(
            reportCard
              .examResultId
          );

        /*
        |--------------------------------------------------------------------------
        | Sorted List Means First Card is Latest Version
        |--------------------------------------------------------------------------
        */

        if (
          !resultMap.has(
            key
          )
        ) {
          resultMap.set(
            key,
            reportCard
          );
        }
      }
    );

    return resultMap;
  };

/*
|--------------------------------------------------------------------------
| GET /api/parent-portal/children/:studentId/results
|--------------------------------------------------------------------------
|
| Returns linked child's published results.
|
| Query:
|
| academicYear
| academicTerm
| overallResultStatus=pass|fail
| page
| limit
|
*/

const getParentChildResults =
  async (
    request,
    response
  ) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Secure Parent -> Child Authorization
      |--------------------------------------------------------------------------
      */

      const access =
        await authorizeParentChildResults(
          request,
          response
        );

      if (!access) {
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Result Filter
      |--------------------------------------------------------------------------
      */

      const filterResult =
        buildPublishedResultFilter({
          schoolId:
            access.schoolId,

          studentId:
            access.student._id,

          query:
            request.query
        });

      if (
        filterResult.error
      ) {
        return response
          .status(400)
          .json({
            success: false,

            message:
              filterResult.error
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Pagination
      |--------------------------------------------------------------------------
      */

      const page =
        getPositiveInteger(
          request.query.page,
          1
        );

      const limit =
        getPositiveInteger(
          request.query.limit,
          DEFAULT_PAGE_SIZE,
          MAX_PAGE_SIZE
        );

      const skip =
        (
          page -
          1
        ) *
        limit;

      /*
      |--------------------------------------------------------------------------
      | Load Results + Summary
      |--------------------------------------------------------------------------
      */

      const [
        resultDocuments,
        summaryAggregation
      ] =
        await Promise.all([
          ExamResult.find(
            filterResult.filter
          )
            .populate(
              "examId",
              "examCode examName examType academicYear academicTerm status startDate endDate resultPublicationDate publication"
            )
            .populate(
              "classId",
              "className numericOrder"
            )
            .sort({
              "publication.publishedAt":
                -1,

              createdAt:
                -1
            })
            .skip(
              skip
            )
            .limit(
              limit
            )
            .lean(),

          /*
          |--------------------------------------------------------------------------
          | Summary Aggregation
          |--------------------------------------------------------------------------
          */

          ExamResult.aggregate([
            {
              $match:
                filterResult.filter
            },

            {
              $group: {
                _id: null,

                totalResults: {
                  $sum: 1
                },

                passCount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$overallResultStatus",
                          "pass"
                        ]
                      },

                      1,

                      0
                    ]
                  }
                },

                failCount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$overallResultStatus",
                          "fail"
                        ]
                      },

                      1,

                      0
                    ]
                  }
                },

                averagePercentage: {
                  $avg:
                    "$totals.percentage"
                },

                highestPercentage: {
                  $max:
                    "$totals.percentage"
                },

                lowestPercentage: {
                  $min:
                    "$totals.percentage"
                }
              }
            }
          ])
        ]);

      /*
      |--------------------------------------------------------------------------
      | Find Published Report Cards
      |--------------------------------------------------------------------------
      */

      const examResultIds =
        resultDocuments.map(
          (
            result
          ) =>
            result._id
        );

      const reportCardMap =
        await loadLatestReportCards({
          schoolId:
            access.schoolId,

          studentId:
            access.student._id,

          examResultIds
        });

      /*
      |--------------------------------------------------------------------------
      | Serialize Results
      |--------------------------------------------------------------------------
      */

      const results =
        resultDocuments.map(
          (
            result
          ) => {
            const reportCard =
              reportCardMap.get(
                getDocumentId(
                  result
                )
              );

            return (
              serializeResultListItem(
                result,
                reportCard
              )
            );
          }
        );

      /*
      |--------------------------------------------------------------------------
      | Summary Defaults
      |--------------------------------------------------------------------------
      */

      const summary =
        summaryAggregation[0] ||
        {
          totalResults: 0,

          passCount: 0,

          failCount: 0,

          averagePercentage: 0,

          highestPercentage: 0,

          lowestPercentage: 0
        };

      const totalResults =
        Number(
          summary.totalResults ||
            0
        );

      const totalPages =
        Math.max(
          1,

          Math.ceil(
            totalResults /
              limit
          )
        );

      /*
      |--------------------------------------------------------------------------
      | Response
      |--------------------------------------------------------------------------
      */

      return response
        .status(200)
        .json({
          success: true,

          data: {
            student:
              serializeStudent(
                access.student
              ),

            /*
            |--------------------------------------------------------------------------
            | Parent Link Information
            |--------------------------------------------------------------------------
            */

            link:
              serializeLink(
                access.link,
                access.legacy
              ),

            /*
            |--------------------------------------------------------------------------
            | Summary
            |--------------------------------------------------------------------------
            */

            summary: {
              totalResults,

              passCount:
                Number(
                  summary.passCount ||
                    0
                ),

              failCount:
                Number(
                  summary.failCount ||
                    0
                ),

              averagePercentage:
                roundNumber(
                  summary
                    .averagePercentage
                ),

              highestPercentage:
                roundNumber(
                  summary
                    .highestPercentage
                ),

              lowestPercentage:
                roundNumber(
                  summary
                    .lowestPercentage
                ),

              /*
              |--------------------------------------------------------------------------
              | Cards on Current Result Page
              |--------------------------------------------------------------------------
              */

              publishedReportCardCount:
                results.filter(
                  (
                    result
                  ) =>
                    Boolean(
                      result.reportCard
                    )
                ).length
            },

            /*
            |--------------------------------------------------------------------------
            | Pagination
            |--------------------------------------------------------------------------
            */

            pagination: {
              page,

              limit,

              totalRecords:
                totalResults,

              totalPages,

              hasNextPage:
                page <
                totalPages,

              hasPrevPage:
                page >
                1
            },

            results
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        response,
        error,

        "Failed to load the child's examination results."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/parent-portal/children/:studentId/results/:resultId
|--------------------------------------------------------------------------
|
| Returns one complete published ExamResult.
|
| Security:
|
| resultId alone never grants access.
|
| Query must match:
|
| authenticated parent
|     ↓
| linked child
|     ↓
| same school
|     ↓
| same result.studentId
|
*/

const getParentChildResultById =
  async (
    request,
    response
  ) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Parent -> Child Authorization
      |--------------------------------------------------------------------------
      */

      const access =
        await authorizeParentChildResults(
          request,
          response
        );

      if (!access) {
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Result ID
      |--------------------------------------------------------------------------
      */

      const resultId =
        normalizeText(
          request.params
            .resultId
        );

      if (
        !resultId ||
        !isValidObjectId(
          resultId
        )
      ) {
        return response
          .status(400)
          .json({
            success: false,

            message:
              "Invalid result ID."
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Secure Result Query
      |--------------------------------------------------------------------------
      |
      | Even if parent manually supplies another student's valid resultId,
      | studentId + schoolId ownership check prevents access.
      |
      */

      const result =
        await ExamResult.findOne({
          _id:
            resultId,

          schoolId:
            access.schoolId,

          studentId:
            access.student._id,

          status: {
            $in:
              PUBLISHED_RESULT_STATUSES
          },

          overallResultStatus: {
            $in:
              PARENT_VISIBLE_RESULT_STATUSES
          },

          isDeleted: {
            $ne: true
          }
        })
          .populate(
            "examId",
            "examCode examName examType academicYear academicTerm status startDate endDate resultPublicationDate publication"
          )
          .populate(
            "classId",
            "className numericOrder"
          )
          .populate(
            "subjectResults.subjectId",
            "subjectCode subjectName"
          )
          .lean();

      if (!result) {
        return response
          .status(404)
          .json({
            success: false,

            message:
              "Published result was not found for this linked child."
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Find Latest Published Report Card
      |--------------------------------------------------------------------------
      */

      const reportCard =
        await ReportCard.findOne(
          buildParentReportCardFilter({
            schoolId:
              access.schoolId,

            studentId:
              access.student._id,

            extra: {
              examResultId:
                result._id
            }
          })
        )
          .sort({
            versionNumber:
              -1,

            "publication.publishedAt":
              -1
          })
          .lean();

      /*
      |--------------------------------------------------------------------------
      | Response
      |--------------------------------------------------------------------------
      */

      return response
        .status(200)
        .json({
          success: true,

          data: {
            student:
              serializeStudent(
                access.student
              ),

            link:
              serializeLink(
                access.link,
                access.legacy
              ),

            result:
              serializeResultDetail(
                result
              ),

            reportCard:
              serializeParentReportCard(
                reportCard
              )
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        response,
        error,

        "Failed to load the child's result details."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/parent-portal/children/:studentId/report-cards/:reportCardId
|--------------------------------------------------------------------------
|
| Returns one official published report card for linked child.
|
*/

const getParentChildReportCardById =
  async (
    request,
    response
  ) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Parent -> Child Authorization
      |--------------------------------------------------------------------------
      */

      const access =
        await authorizeParentChildResults(
          request,
          response
        );

      if (!access) {
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Report Card ID
      |--------------------------------------------------------------------------
      */

      const reportCardId =
        normalizeText(
          request.params
            .reportCardId
        );

      if (
        !reportCardId ||
        !isValidObjectId(
          reportCardId
        )
      ) {
        return response
          .status(400)
          .json({
            success: false,

            message:
              "Invalid report card ID."
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Secure Report Card Query
      |--------------------------------------------------------------------------
      */

      const reportCard =
        await ReportCard.findOne(
          buildParentReportCardFilter({
            schoolId:
              access.schoolId,

            studentId:
              access.student._id,

            extra: {
              _id:
                reportCardId
            }
          })
        ).lean();

      if (
        !reportCard
      ) {
        return response
          .status(404)
          .json({
            success: false,

            message:
              "Published report card was not found for this linked child."
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Confirm Source Result Still Belongs to Linked Child
      |--------------------------------------------------------------------------
      |
      | ReportCard ownership alone کافی نہیں۔
      | اس کا source ExamResult بھی اسی linked child کا published result ہونا چاہیے۔
      |
      */

      const sourceResult =
        await ExamResult.findOne({
          _id:
            reportCard
              .examResultId,

          schoolId:
            access.schoolId,

          studentId:
            access.student._id,

          status: {
            $in:
              PUBLISHED_RESULT_STATUSES
          },

          overallResultStatus: {
            $in:
              PARENT_VISIBLE_RESULT_STATUSES
          },

          isDeleted: {
            $ne: true
          }
        })
          .select(
            "_id status overallResultStatus"
          )
          .lean();

      if (
        !sourceResult
      ) {
        return response
          .status(404)
          .json({
            success: false,

            message:
              "The source result for this report card is no longer available."
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Response
      |--------------------------------------------------------------------------
      */

      return response
        .status(200)
        .json({
          success: true,

          data: {
            student:
              serializeStudent(
                access.student
              ),

            link:
              serializeLink(
                access.link,
                access.legacy
              ),

            reportCard:
              serializeParentReportCard(
                reportCard
              )
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        response,
        error,

        "Failed to load the child's report card."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  getParentChildResults,
  getParentChildResultById,
  getParentChildReportCardById
};