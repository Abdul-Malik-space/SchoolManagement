const mongoose = require(
  "mongoose"
);

const Student = require(
  "../models/Student"
);

const ExamResult = require(
  "../models/ExamResult"
);

const ReportCard = require(
  "../models/ReportCard"
);

/*
|--------------------------------------------------------------------------
| Student Portal Result Controller
|--------------------------------------------------------------------------
|
| Security Rules
|--------------------------------------------------------------------------
|
| 1. صرف authenticated student account استعمال ہوگا۔
| 2. studentId request body/query/params سے قبول نہیں ہوگا۔
| 3. Student authenticated User ID + School ID سے resolve ہوگا۔
| 4. Student صرف اپنے published / locked results دیکھ سکتا ہے۔
| 5. Report Card صرف اسی student کا published card دکھایا جائے گا۔
| 6. Report Card accessPolicy بھی enforce ہوگی۔
|
*/

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const PUBLISHED_RESULT_STATUSES = [
  "published",
  "locked"
];

const STUDENT_VISIBLE_RESULT_STATUSES = [
  "pass",
  "fail"
];

const STUDENT_VISIBLE_REPORT_CARD_STATUSES = [
  "published"
];

const STUDENT_VISIBLE_REPORT_CARD_VISIBILITY = [
  "student_parent",
  "public_verification"
];

const DEFAULT_PAGE_SIZE =
  20;

const MAX_PAGE_SIZE =
  100;

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

const normalizeRole = (
  value
) => {
  return normalizeText(
    value
  ).toLowerCase();
};

const isValidObjectId = (
  value
) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

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
    parsed >
      maximum
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
    10 **
    precision;

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

/*
|--------------------------------------------------------------------------
| Error Response
|--------------------------------------------------------------------------
*/

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
        success:
          false,

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
            .join(
              " "
            )
      });
  }

  if (
    error.name ===
    "CastError"
  ) {
    return response
      .status(400)
      .json({
        success:
          false,

        message:
          "One of the supplied record IDs is invalid."
      });
  }

  return response
    .status(500)
    .json({
      success:
        false,

      message:
        defaultMessage,

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
| Authenticated User Helpers
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

/*
|--------------------------------------------------------------------------
| Student Portal Authorization
|--------------------------------------------------------------------------
|
| We do NOT trust:
|
| request.params.studentId
| request.query.studentId
| request.body.studentId
|
| Student is always resolved from authenticated account.
|
*/

const authorizeStudentResultPortal =
  async (
    request,
    response
  ) => {
    if (
      !request.user
    ) {
      response
        .status(401)
        .json({
          success:
            false,

          message:
            "Authentication is required."
        });

      return null;
    }

    if (
      normalizeRole(
        request.user.role
      ) !==
      "student"
    ) {
      response
        .status(403)
        .json({
          success:
            false,

          message:
            "This endpoint is available only to student accounts."
        });

      return null;
    }

    const studentUserId =
      getAuthenticatedUserId(
        request
      );

    const schoolId =
      getAuthenticatedSchoolId(
        request
      );

    if (
      !studentUserId ||
      !isValidObjectId(
        studentUserId
      )
    ) {
      response
        .status(401)
        .json({
          success:
            false,

          message:
            "The authenticated student account is invalid."
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
          success:
            false,

          message:
            "No active school is assigned to this student account."
        });

      return null;
    }

    const student =
      await Student.findOne({
        schoolId,

        studentUserId,

        isDeleted: {
          $ne:
            true
        }
      })
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

    if (!student) {
      response
        .status(404)
        .json({
          success:
            false,

          message:
            "No active student profile is linked with this login account."
        });

      return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Match Existing Student Portal Eligibility
    |--------------------------------------------------------------------------
    */

    if (
      student.status &&
      ![
        "active",
        "inactive"
      ].includes(
        student.status
      )
    ) {
      response
        .status(403)
        .json({
          success:
            false,

          message:
            "This student profile is not currently eligible for portal access."
        });

      return null;
    }

    return {
      studentUserId,

      schoolId,

      student
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
| Report Card Access Filter
|--------------------------------------------------------------------------
*/

const buildStudentReportCardFilter =
  ({
    schoolId,
    studentId,
    extra = {}
  }) => {
    return {
      schoolId,

      studentId,

      status: {
        $in:
          STUDENT_VISIBLE_REPORT_CARD_STATUSES
      },

      "accessPolicy.allowStudentView": {
        $ne:
          false
      },

      "accessPolicy.visibility": {
        $in:
          STUDENT_VISIBLE_REPORT_CARD_VISIBILITY
      },

      isDeleted: {
        $ne:
          true
      },

      ...extra
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
      ?.allowStudentDownload ===
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
        ?.allowStudentView !==
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

    canPrint:
      true
  };
};

/*
|--------------------------------------------------------------------------
| Load Latest Student Report Cards
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
        buildStudentReportCardFilter({
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
          examResultId:
            1,

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

  const positions =
    result.positions ||
    {};

  const totals =
    result.totals ||
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
        totals.countedSubjectCount ||
        0,

      passedSubjectCount:
        totals.passedSubjectCount ||
        0,

      failedSubjectCount:
        totals.failedSubjectCount ||
        0,

      absentSubjectCount:
        totals.absentSubjectCount ||
        0,

      totalMaxMarks:
        roundNumber(
          totals.totalMaxMarks
        ),

      totalObtainedMarks:
        roundNumber(
          totals.totalObtainedMarks
        ),

      percentage:
        roundNumber(
          totals.percentage
        ),

      gradePointAverage:
        resultRules.showGPA
          ? roundNumber(
              totals.gradePointAverage
            )
          : null
    },

    overallResultStatus:
      result.overallResultStatus,

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
              overallGrade.gradePoint ??
              null,

            remarks:
              overallGrade.remarks ||
              ""
          }
        : null,

    positions: {
      classPosition:
        resultRules
          .rankingEnabled &&
        resultRules
          .showClassPosition
          ? positions.classPosition ||
            null
          : null,

      classCandidateCount:
        resultRules
          .rankingEnabled &&
        resultRules
          .showClassPosition
          ? positions.classCandidateCount ||
            0
          : 0,

      sectionPosition:
        resultRules
          .rankingEnabled &&
        resultRules
          .showSectionPosition
          ? positions.sectionPosition ||
            null
          : null,

      sectionCandidateCount:
        resultRules
          .rankingEnabled &&
        resultRules
          .showSectionPosition
          ? positions.sectionCandidateCount ||
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
        subject.weightagePercentage
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
        ? subject.principalRemarks ||
          ""
        : ""
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

    totals: {
      subjectCount:
        totals.subjectCount ||
        0,

      countedSubjectCount:
        totals.countedSubjectCount ||
        0,

      passedSubjectCount:
        totals.passedSubjectCount ||
        0,

      failedSubjectCount:
        totals.failedSubjectCount ||
        0,

      absentSubjectCount:
        totals.absentSubjectCount ||
        0,

      leaveSubjectCount:
        totals.leaveSubjectCount ||
        0,

      exemptedSubjectCount:
        totals.exemptedSubjectCount ||
        0,

      withheldSubjectCount:
        totals.withheldSubjectCount ||
        0,

      totalMaxMarks:
        roundNumber(
          totals.totalMaxMarks
        ),

      totalObtainedMarks:
        roundNumber(
          totals.totalObtainedMarks
        ),

      totalWeightedScore:
        roundNumber(
          totals.totalWeightedScore
        ),

      percentage:
        roundNumber(
          totals.percentage
        ),

      gradePointAverage:
        resultRules.showGPA
          ? roundNumber(
              totals.gradePointAverage
            )
          : null
    },

    overallResultStatus:
      result.overallResultStatus,

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
              overallGrade.gradePoint ??
              null,

            remarks:
              overallGrade.remarks ||
              ""
          }
        : null,

    positions: {
      classPosition:
        resultRules
          .rankingEnabled &&
        resultRules
          .showClassPosition
          ? positions.classPosition ||
            null
          : null,

      classCandidateCount:
        resultRules
          .rankingEnabled &&
        resultRules
          .showClassPosition
          ? positions.classCandidateCount ||
            0
          : 0,

      sectionPosition:
        resultRules
          .rankingEnabled &&
        resultRules
          .showSectionPosition
          ? positions.sectionPosition ||
            null
          : null,

      sectionCandidateCount:
        resultRules
          .rankingEnabled &&
        resultRules
          .showSectionPosition
          ? positions.sectionCandidateCount ||
            0
          : 0,

      calculatedAt:
        positions.calculatedAt ||
        null
    },

    attendanceSummary:
      resultRules
        .includeAttendance !==
      false
        ? result.attendanceSummary ||
          null
        : null,

    classTeacherRemarks:
      resultRules
        .includeTeacherRemarks !==
      false
        ? result.classTeacherRemarks ||
          ""
        : "",

    principalRemarks:
      resultRules
        .includePrincipalRemarks !==
      false
        ? result.principalRemarks ||
          ""
        : "",

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
| Student Report Card Detail Serialization
|--------------------------------------------------------------------------
*/

const serializeStudentReportCard = (
  reportCard
) => {
  if (!reportCard) {
    return null;
  }

  const allowDownload =
    reportCard
      .accessPolicy
      ?.allowStudentDownload ===
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

    snapshot:
      reportCard.snapshot,

    layout:
      reportCard.layout,

    accessPolicy: {
      visibility:
        reportCard
          .accessPolicy
          ?.visibility ||
        "private",

      allowStudentView:
        reportCard
          .accessPolicy
          ?.allowStudentView !==
        false,

      allowStudentDownload:
        allowDownload
    },

    document: {
      available:
        Boolean(
          allowDownload &&
          reportCard.document
            ?.url
        ),

      url:
        allowDownload
          ? reportCard.document
              ?.url ||
            ""
          : "",

      fileName:
        allowDownload
          ? reportCard.document
              ?.fileName ||
            ""
          : "",

      mimeType:
        allowDownload
          ? reportCard.document
              ?.mimeType ||
            ""
          : ""
    },

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

    issue: {
      issuedAt:
        reportCard.issue
          ?.issuedAt ||
        null
    },

    publication: {
      publishedAt:
        reportCard
          .publication
          ?.publishedAt ||
        null
    },

    canPrint:
      true,

    canDownload:
      allowDownload
  };
};

/*
|--------------------------------------------------------------------------
| Build Published Result Filter
|--------------------------------------------------------------------------
*/

const buildPublishedResultFilter = ({
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
        STUDENT_VISIBLE_RESULT_STATUSES
    },

    isDeleted: {
      $ne:
        true
    }
  };

  const academicYear =
    normalizeText(
      query.academicYear
    );

  const academicTerm =
    normalizeText(
      query.academicTerm
    );

  const overallResultStatus =
    normalizeText(
      query.overallResultStatus
    ).toLowerCase();

  if (academicYear) {
    filter.academicYear =
      academicYear;
  }

  if (academicTerm) {
    filter.academicTerm =
      academicTerm;
  }

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
| GET /api/student-portal/results
|--------------------------------------------------------------------------
|
| Student can see only:
|
| - own results
| - published / locked results
| - pass / fail completed results
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

const getStudentPortalResults =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeStudentResultPortal(
          request,
          response
        );

      if (!access) {
        return;
      }

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
            success:
              false,

            message:
              filterResult.error
          });
      }

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

          ExamResult.aggregate([
            {
              $match:
                filterResult.filter
            },

            {
              $group: {
                _id:
                  null,

                totalResults: {
                  $sum:
                    1
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

            return serializeResultListItem(
              result,
              reportCard
            );
          }
        );

      const summary =
        summaryAggregation[0] ||
        {
          totalResults:
            0,

          passCount:
            0,

          failCount:
            0,

          averagePercentage:
            0,

          highestPercentage:
            0,

          lowestPercentage:
            0
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

      return response
        .status(200)
        .json({
          success:
            true,

          data: {
            student:
              serializeStudent(
                access.student
              ),

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
                  summary.averagePercentage
                ),

              highestPercentage:
                roundNumber(
                  summary.highestPercentage
                ),

              lowestPercentage:
                roundNumber(
                  summary.lowestPercentage
                ),

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
        "Failed to load student examination results."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/student-portal/results/:resultId
|--------------------------------------------------------------------------
|
| resultId is allowed only as a record selector.
|
| Ownership is still enforced through:
|
| schoolId = authenticated student's school
| studentId = authenticated student's Student record
|
| Therefore another student's resultId will return 404.
|
*/

const getStudentPortalResultById =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeStudentResultPortal(
          request,
          response
        );

      if (!access) {
        return;
      }

      const resultId =
        normalizeText(
          request.params.resultId
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
            success:
              false,

            message:
              "Invalid result ID."
          });
      }

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
              STUDENT_VISIBLE_RESULT_STATUSES
          },

          isDeleted: {
            $ne:
              true
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
            success:
              false,

            message:
              "Published result was not found."
          });
      }

      const reportCard =
        await ReportCard.findOne(
          buildStudentReportCardFilter({
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

      return response
        .status(200)
        .json({
          success:
            true,

          data: {
            student:
              serializeStudent(
                access.student
              ),

            result:
              serializeResultDetail(
                result
              ),

            reportCard:
              serializeStudentReportCard(
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
        "Failed to load student result details."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/student-portal/report-cards/:reportCardId
|--------------------------------------------------------------------------
|
| Secure direct report-card endpoint.
|
| Student can open only:
|
| - own card
| - published card
| - allowStudentView !== false
| - student_parent / public_verification visibility
|
*/

const getStudentPortalReportCardById =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeStudentResultPortal(
          request,
          response
        );

      if (!access) {
        return;
      }

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
            success:
              false,

            message:
              "Invalid report card ID."
          });
      }

      const reportCard =
        await ReportCard.findOne(
          buildStudentReportCardFilter({
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

      if (!reportCard) {
        return response
          .status(404)
          .json({
            success:
              false,

            message:
              "Published report card was not found."
          });
      }

      /*
      |--------------------------------------------------------------------------
      | Confirm Source Result Still Belongs to Student
      |--------------------------------------------------------------------------
      */

      const sourceResult =
        await ExamResult.findOne({
          _id:
            reportCard.examResultId,

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
              STUDENT_VISIBLE_RESULT_STATUSES
          },

          isDeleted: {
            $ne:
              true
          }
        })
          .select(
            "_id status overallResultStatus"
          )
          .lean();

      if (!sourceResult) {
        return response
          .status(404)
          .json({
            success:
              false,

            message:
              "The source result for this report card is no longer available."
          });
      }

      return response
        .status(200)
        .json({
          success:
            true,

          data: {
            student:
              serializeStudent(
                access.student
              ),

            reportCard:
              serializeStudentReportCard(
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
        "Failed to load student report card."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  getStudentPortalResults,
  getStudentPortalResultById,
  getStudentPortalReportCardById
};