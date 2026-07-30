const mongoose = require("mongoose");

const ParentStudentLink = require("../models/ParentStudentLink");
const PortalConversation = require("../models/PortalConversation");
const Student = require("../models/Student");
const StudentAttendance = require("../models/StudentAttendance");
const FeeCollection = require("../models/FeeCollection");
const Subject = require("../models/Subject");
const User = require("../models/User");
const TimetableConfig = require("../models/TimetableConfig");
const TimetableEntry = require("../models/TimetableEntry");

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const LEGACY_PERMISSIONS = {
  dashboard: true,
  studentProfile: true,
  attendance: true,
  timetable: true,
  academics: true,
  fees: true,
  receipts: true,
  notices: true,
  messages: true,
  documents: false
};

/* -------------------------------------------------------------------------- */
/* General helpers                                                            */
/* -------------------------------------------------------------------------- */

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const toObjectId = (value) => {
  return isValidObjectId(value)
    ? new mongoose.Types.ObjectId(value)
    : null;
};

const normalizeText = (value) => {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
};

const roundNumber = (
  value,
  precision = 2
) => {
  const multiplier =
    10 ** precision;

  return (
    Math.round(
      Number(value || 0) *
        multiplier
    ) / multiplier
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
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return maximum &&
    parsed > maximum
    ? maximum
    : parsed;
};

const normalizeDate = (
  value = new Date()
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
};

const endOfDay = (
  value = new Date()
) => {
  const date =
    normalizeDate(value);

  if (!date) {
    return null;
  }

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date;
};

const formatDateKey = (
  value
) => {
  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? ""
    : date
        .toISOString()
        .slice(0, 10);
};

const getTodayDayName =
  () => {
    return [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday"
    ][new Date().getDay()];
  };

const getUserId = (
  request
) => {
  const value =
    request.user?._id ||
    request.user?.id;

  return value
    ? String(value)
    : null;
};

const getSchoolId = (
  request
) => {
  const value =
    request.user
      ?.schoolId?._id ||
    request.user
      ?.schoolId ||
    request.schoolFilter
      ?.schoolId;

  return value
    ? String(value)
    : null;
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
    String(
      request.user.role || ""
    ).toLowerCase() !==
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
    getUserId(request);

  const schoolId =
    getSchoolId(request);

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
          "Invalid authenticated parent account."
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
            error.errors || {}
          )
            .map(
              (item) =>
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
    .status(500)
    .json({
      success: false,
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

/* -------------------------------------------------------------------------- */
/* Date range                                                                 */
/* -------------------------------------------------------------------------- */

const buildAttendanceDateRange = (
  query = {}
) => {
  if (query.month) {
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(
        query.month
      )
    ) {
      return {
        error:
          "Invalid month format. Use YYYY-MM."
      };
    }

    const [
      year,
      month
    ] =
      query.month
        .split("-")
        .map(Number);

    return {
      startDate:
        new Date(
          year,
          month - 1,
          1
        ),

      endDate:
        new Date(
          year,
          month,
          0,
          23,
          59,
          59,
          999
        ),

      label:
        query.month
    };
  }

  if (
    query.from ||
    query.to
  ) {
    const startDate =
      normalizeDate(
        query.from ||
        query.to
      );

    const endDateValue =
      endOfDay(
        query.to ||
        query.from
      );

    if (
      !startDate ||
      !endDateValue
    ) {
      return {
        error:
          "Invalid attendance date range."
      };
    }

    if (
      startDate >
      endDateValue
    ) {
      return {
        error:
          "Attendance start date cannot be after the end date."
      };
    }

    return {
      startDate,

      endDate:
        endDateValue,

      label:
        `${formatDateKey(
          startDate
        )}:${formatDateKey(
          endDateValue
        )}`
    };
  }

  const today =
    new Date();

  return {
    startDate:
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ),

    endDate:
      new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      ),

    label:
      `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(
        2,
        "0"
      )}`
  };
};

/* -------------------------------------------------------------------------- */
/* Parent–student permissions and serialization                               */
/* -------------------------------------------------------------------------- */

const buildLinkPermissions = (
  link
) => {
  const source =
    link?.accessPermissions;

  if (!source) {
    return {
      ...LEGACY_PERMISSIONS
    };
  }

  return {
    dashboard:
      source.dashboard !==
      false,

    studentProfile:
      source.studentProfile !==
      false,

    attendance:
      source.attendance !==
      false,

    timetable:
      source.timetable !==
      false,

    academics:
      source.academics !==
      false,

    fees:
      source.fees !==
      false,

    receipts:
      source.receipts !==
      false,

    notices:
      source.notices !==
      false,

    messages:
      source.messages !==
      false,

    documents:
      Boolean(
        source.documents
      )
  };
};

const serializeStudent = (
  student
) => {
  if (!student) {
    return null;
  }

  const classRecord =
    student.classId &&
    typeof student.classId ===
      "object"
      ? student.classId
      : null;

  const schoolRecord =
    student.schoolId &&
    typeof student.schoolId ===
      "object"
      ? student.schoolId
      : null;

  return {
    id:
      student._id,

    admissionNumber:
      student
        .admissionNumber ||
      "",

    name:
      student.name ||
      "",

    fatherName:
      student.fatherName ||
      "",

    guardianName:
      student
        .guardianName ||
      "",

    gender:
      student.gender ||
      "",

    dateOfBirth:
      student.dateOfBirth ||
      null,

    address:
      student.address ||
      "",

    contactNumber:
      student
        .contactNumber ||
      "",

    guardianContact:
      student
        .guardianContact ||
      "",

    admissionDate:
      student
        .admissionDate ||
      null,

    photo:
      student
        .studentPhoto ||
      "",

    status:
      student.status ||
      "active",

    sectionId:
      student.sectionId ||
      null,

    sectionName:
      student.sectionName ||
      "",

    class:
      classRecord
        ? {
            id:
              classRecord._id,

            className:
              classRecord
                .className ||
              "",

            numericOrder:
              classRecord
                .numericOrder ||
              0
          }
        : {
            id:
              student.classId ||
              null,

            className: "",
            numericOrder: 0
          },

    school:
      schoolRecord
        ? {
            id:
              schoolRecord._id,

            schoolName:
              schoolRecord
                .schoolName ||
              "",

            type:
              schoolRecord.type ||
              "",

            address:
              schoolRecord
                .address ||
              "",

            phone:
              schoolRecord.phone ||
              "",

            email:
              schoolRecord.email ||
              "",

            sessionYear:
              schoolRecord
                .sessionYear ||
              ""
          }
        : {
            id:
              student.schoolId ||
              null,

            schoolName: "",
            type: "",
            address: "",
            phone: "",
            email: "",
            sessionYear: ""
          }
  };
};

const serializeAccessLink = (
  link,
  legacy = false
) => {
  if (legacy) {
    return {
      id: null,

      source:
        "legacy_student_parent_link",

      relationship:
        "guardian",

      relationshipLabel:
        "Guardian",

      isPrimary: false,

      isEmergencyContact:
        false,

      canCollectStudent:
        false,

      status: "active",

      verificationStatus:
        "verified",

      permissions: {
        ...LEGACY_PERMISSIONS
      },

      notificationPreferences: {
        inApp: true,
        email: true,
        sms: false,
        attendanceAlerts: true,
        feeAlerts: true,
        academicUpdates: true,
        timetableUpdates: true,
        noticeAlerts: true,
        messageAlerts: true
      }
    };
  }

  const relationship =
    link.relationship ||
    "guardian";

  const relationshipLabel =
    relationship ===
      "other"
      ? link
          .customRelationship ||
        "Other"
      : relationship
          .replaceAll(
            "_",
            " "
          )
          .replace(
            /\b\w/g,
            (letter) =>
              letter
                .toUpperCase()
          );

  return {
    id:
      link._id,

    source:
      link.linkSource ||
      "admin_created",

    relationship,
    relationshipLabel,

    isPrimary:
      Boolean(
        link.isPrimary
      ),

    isEmergencyContact:
      Boolean(
        link
          .isEmergencyContact
      ),

    canCollectStudent:
      Boolean(
        link
          .canCollectStudent
      ),

    status:
      link.status,

    verificationStatus:
      link
        .verificationStatus,

    permissions:
      buildLinkPermissions(
        link
      ),

    notificationPreferences:
      link
        .notificationPreferences ||
      {},

    preferredLanguage:
      link.preferredLanguage ||
      "en",

    linkedAt:
      link.linkedAt ||
      link.createdAt ||
      null
  };
};

const populateStudentQuery = (
  query
) => {
  return query
    .populate(
      "schoolId",
      "schoolName type address phone email sessionYear isActive"
    )
    .populate(
      "classId",
      "className numericOrder sections isActive"
    )
    .populate(
      "studentUserId",
      "name email phone photo role isActive"
    )
    .populate(
      "parentUserIds",
      "name email phone photo role isActive"
    );
};

/* -------------------------------------------------------------------------- */
/* Parent–child secure access                                                  */
/* -------------------------------------------------------------------------- */

const findParentChildAccess =
  async ({
    parentUserId,
    schoolId,
    studentId
  }) => {
    if (
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

    const link =
      await ParentStudentLink
        .findOne({
          schoolId,
          parentUserId,
          studentId
        });

    if (link) {
      if (
        link.isDeleted ||
        link.status !==
          "active" ||
        link
          .verificationStatus !==
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

            isDeleted:
              false
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
    | Legacy Parent Linking
    |--------------------------------------------------------------------------
    |
    | پرانے Student records میں parentUserIds استعمال ہو رہا ہے۔ Migration
    | مکمل ہونے تک یہ secure fallback برقرار رہے گا۔
    |
    */

    const legacyStudent =
      await populateStudentQuery(
        Student.findOne({
          _id:
            studentId,

          schoolId,

          isDeleted:
            false,

          parentUserIds:
            parentUserId
        })
      );

    if (!legacyStudent) {
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
        ...LEGACY_PERMISSIONS
      }
    };
  };

const authorizeChildFeature =
  async ({
    request,
    response,
    feature
  }) => {
    const parentScope =
      validateParentRequest(
        request,
        response
      );

    if (!parentScope) {
      return null;
    }

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
            access
              .errorMessage
        });

      return null;
    }

    if (
      feature &&
      !access.permissions
        ?.[feature]
    ) {
      response
        .status(403)
        .json({
          success: false,

          message:
            `Parent access to ${feature} is not enabled for this child.`
        });

      return null;
    }

    return {
      ...parentScope,
      ...access
    };
  };

const getAccessibleChildren =
  async ({
    parentUserId,
    schoolId
  }) => {
    const links =
      await ParentStudentLink
        .find({
          schoolId,
          parentUserId,

          status:
            "active",

          verificationStatus:
            "verified",

          isDeleted:
            false
        })
        .sort({
          isPrimary: -1,
          createdAt: 1
        })
        .lean();

    const linkedStudentIds =
      links.map(
        (link) =>
          String(
            link.studentId
          )
      );

    const linkedStudents =
      linkedStudentIds.length
        ? await populateStudentQuery(
            Student.find({
              _id: {
                $in:
                  linkedStudentIds
              },

              schoolId,

              isDeleted:
                false
            })
          ).lean()
        : [];

    const studentMap =
      new Map(
        linkedStudents.map(
          (student) => [
            String(
              student._id
            ),
            student
          ]
        )
      );

    const linkedChildren =
      links
        .map(
          (link) => {
            const student =
              studentMap.get(
                String(
                  link.studentId
                )
              );

            return student
              ? {
                  student,
                  link,
                  legacy: false,

                  permissions:
                    buildLinkPermissions(
                      link
                    )
                }
              : null;
          }
        )
        .filter(Boolean);

    const legacyStudents =
      await populateStudentQuery(
        Student.find({
          schoolId,

          parentUserIds:
            parentUserId,

          isDeleted:
            false,

          _id: {
            $nin:
              linkedStudentIds
          }
        })
      )
        .sort({
          createdAt: 1
        })
        .lean();

    return [
      ...linkedChildren,

      ...legacyStudents.map(
        (student) => ({
          student,
          link: null,
          legacy: true,

          permissions: {
            ...LEGACY_PERMISSIONS
          }
        })
      )
    ];
  };

/* -------------------------------------------------------------------------- */
/* Attendance                                                                  */
/* -------------------------------------------------------------------------- */

const getAttendanceData =
  async ({
    schoolId,
    studentId,
    startDate,
    endDate
  }) => {
    const documents =
      await StudentAttendance
        .find({
          schoolId,

          attendanceDate: {
            $gte:
              startDate,

            $lte:
              endDate
          },

          "records.studentId":
            studentId
        })
        .select(
          "schoolId classId sectionName attendanceDate records createdAt updatedAt"
        )
        .populate(
          "classId",
          "className numericOrder"
        )
        .sort({
          attendanceDate:
            -1
        })
        .lean();

    const records =
      documents
        .map(
          (document) => {
            const matchedRecord =
              document.records
                ?.find(
                  (record) => {
                    return (
                      String(
                        record
                          .studentId
                          ?._id ||
                        record
                          .studentId
                      ) ===
                      String(
                        studentId
                      )
                    );
                  }
                );

            if (!matchedRecord) {
              return null;
            }

            return {
              id:
                document._id,

              attendanceDate:
                document
                  .attendanceDate,

              status:
                matchedRecord
                  .status,

              remarks:
                matchedRecord
                  .remarks ||
                "",

              sectionName:
                document
                  .sectionName ||
                "",

              class:
                document.classId
                  ? {
                      id:
                        document
                          .classId
                          ._id,

                      className:
                        document
                          .classId
                          .className ||
                        "",

                      numericOrder:
                        document
                          .classId
                          .numericOrder ||
                        0
                    }
                  : null
            };
          }
        )
        .filter(Boolean);

    const summary =
      records.reduce(
        (
          result,
          record
        ) => {
          result.total += 1;

          result[
            record.status
          ] =
            Number(
              result[
                record.status
              ] ||
              0
            ) + 1;

          return result;
        },
        {
          total: 0,
          present: 0,
          absent: 0,
          leave: 0
        }
      );

    summary.attendancePercentage =
      summary.total > 0
        ? roundNumber(
            (
              summary.present /
              summary.total
            ) * 100,
            1
          )
        : 0;

    return {
      summary,
      records
    };
  };

/* -------------------------------------------------------------------------- */
/* Fees                                                                        */
/* -------------------------------------------------------------------------- */

const buildFeeFilter = ({
  schoolId,
  studentId,
  query = {},
  sessionYear = ""
}) => {
  const filter = {
    schoolId,
    studentId
  };

  if (query.feeMonth) {
    filter.feeMonth =
      normalizeText(
        query.feeMonth
      );
  }

  if (
    query.sessionYear
  ) {
    filter.sessionYear =
      normalizeText(
        query.sessionYear
      );
  } else if (
    query.useCurrentSession ===
      "true" &&
    sessionYear
  ) {
    filter.sessionYear =
      sessionYear;
  }

  if (
    query.paymentStatus
  ) {
    const status =
      String(
        query.paymentStatus
      ).toLowerCase();

    if (
      ![
        "unpaid",
        "partial",
        "paid"
      ].includes(status)
    ) {
      return {
        error:
          "Invalid fee payment status."
      };
    }

    filter.paymentStatus =
      status;
  }

  return {
    filter
  };
};

const summarizeFeeRecords = (
  records
) => {
  return records.reduce(
    (
      summary,
      record
    ) => {
      summary.invoiceCount +=
        1;

      summary.totalPayable +=
        Number(
          record
            .payableAmount ||
          0
        );

      summary.totalPaid +=
        Number(
          record.paidAmount ||
          0
        );

      summary.totalBalance +=
        Number(
          record
            .balanceAmount ||
          0
        );

      summary.paymentCount +=
        Array.isArray(
          record.payments
        )
          ? record.payments
              .length
          : 0;

      if (
        record
          .paymentStatus ===
        "paid"
      ) {
        summary.paidInvoices +=
          1;
      } else if (
        record
          .paymentStatus ===
        "partial"
      ) {
        summary.partialInvoices +=
          1;
      } else {
        summary.unpaidInvoices +=
          1;
      }

      return summary;
    },
    {
      invoiceCount: 0,
      paidInvoices: 0,
      partialInvoices: 0,
      unpaidInvoices: 0,
      paymentCount: 0,
      totalPayable: 0,
      totalPaid: 0,
      totalBalance: 0
    }
  );
};

/* -------------------------------------------------------------------------- */
/* Timetable                                                                   */
/* -------------------------------------------------------------------------- */

const getPublishedTimetableConfig =
  async (
    schoolId
  ) => {
    return TimetableConfig
      .findOne({
        schoolId,

        isDeleted:
          false,

        $or: [
          {
            status:
              "published"
          },
          {
            isActive:
              true
          }
        ]
      })
      .select(
        "title code academicYear academicTerm status isActive effectiveStartDate effectiveEndDate publication rotation timezone updatedAt"
      )
      .sort({
        "publication.publishedAt":
          -1,

        updatedAt: -1
      })
      .lean();
  };

const getRotationCode =
  async ({
    schoolId,
    timetableConfigId,
    classId,
    sectionName,
    requestedCode
  }) => {
    if (requestedCode) {
      return String(
        requestedCode
      )
        .trim()
        .toUpperCase();
    }

    const codes =
      await TimetableEntry
        .distinct(
          "rotationWeekCode",
          {
            schoolId,
            timetableConfigId,
            classId,

            entryStatus:
              "scheduled",

            isDeleted:
              false,

            $or: [
              {
                sectionName
              },
              {
                sectionName: ""
              },
              {
                sectionName:
                  null
              }
            ]
          }
        );

    return codes.includes(
      "STANDARD"
    )
      ? "STANDARD"
      : codes[0] ||
          "STANDARD";
  };

const serializeTimetableEntry = (
  entry
) => ({
  id:
    entry._id,

  day:
    entry.day,

  rotationWeekCode:
    entry
      .rotationWeekCode,

  rotationWeekLabel:
    entry
      .rotationWeekLabel ||
    "",

  period: {
    id:
      entry.periodId,

    sequence:
      entry
        .periodSnapshot
        ?.sequence ||
      null,

    code:
      entry
        .periodSnapshot
        ?.code ||
      "",

    name:
      entry
        .periodSnapshot
        ?.name ||
      "",

    shortName:
      entry
        .periodSnapshot
        ?.shortName ||
      "",

    type:
      entry
        .periodSnapshot
        ?.type ||
      "",

    startTime:
      entry
        .periodSnapshot
        ?.startTime ||
      "",

    endTime:
      entry
        .periodSnapshot
        ?.endTime ||
      "",

    durationMinutes:
      entry
        .periodSnapshot
        ?.durationMinutes ||
      null
  },

  subject: {
    id:
      entry.subjectId
        ?._id ||
      entry.subjectId ||
      null,

    name:
      entry.subjectId
        ?.subjectName ||
      entry
        .subjectSnapshot
        ?.name ||
      "",

    code:
      entry.subjectId
        ?.subjectCode ||
      entry
        .subjectSnapshot
        ?.code ||
      ""
  },

  teacher: {
    id:
      entry.teacherId
        ?._id ||
      entry.teacherId ||
      null,

    name:
      entry.teacherId
        ?.name ||
      entry
        .teacherSnapshot
        ?.name ||
      "",

    employeeId:
      entry.teacherId
        ?.employeeId ||
      entry
        .teacherSnapshot
        ?.employeeId ||
      ""
  },

  room: {
    code:
      entry.room?.code ||
      "",

    name:
      entry.room?.name ||
      "",

    building:
      entry.room
        ?.building ||
      "",

    floor:
      entry.room?.floor ||
      "",

    resourceType:
      entry.room
        ?.resourceType ||
      ""
  },

  entryType:
    entry.entryType,

  deliveryMode:
    entry.deliveryMode,

  onlineMeetingUrl:
    entry
      .onlineMeetingUrl ||
    "",

  displayColor:
    entry.displayColor ||
    "",

  notes:
    entry.notes ||
    ""
});

const getChildTimetableData =
  async ({
    student,
    requestedRotationCode,
    requestedDay = null
  }) => {
    const schoolId =
      student.schoolId?._id ||
      student.schoolId;

    const classId =
      student.classId?._id ||
      student.classId;

    const sectionName =
      student.sectionName ||
      "";

    const config =
      await getPublishedTimetableConfig(
        schoolId
      );

    if (!config) {
      return {
        available: false,

        message:
          "No published timetable is currently available.",

        timetableConfig:
          null,

        rotationWeekCode:
          null,

        entries: [],
        byDay: {}
      };
    }

    const rotationWeekCode =
      await getRotationCode({
        schoolId,

        timetableConfigId:
          config._id,

        classId,
        sectionName,

        requestedCode:
          requestedRotationCode
      });

    const filter = {
      schoolId,

      timetableConfigId:
        config._id,

      classId,
      rotationWeekCode,

      entryStatus:
        "scheduled",

      isDeleted:
        false,

      $or: [
        {
          sectionName
        },
        {
          sectionName: ""
        },
        {
          sectionName:
            null
        }
      ]
    };

    if (requestedDay) {
      const day =
        String(
          requestedDay
        ).toLowerCase();

      if (
        !DAY_ORDER.includes(
          day
        )
      ) {
        return {
          error:
            "Invalid timetable day."
        };
      }

      filter.day =
        day;
    }

    const documents =
      await TimetableEntry
        .find(filter)
        .populate(
          "subjectId",
          "subjectName subjectCode"
        )
        .populate(
          "teacherId",
          "name employeeId qualification status"
        )
        .sort({
          day: 1,

          "periodSnapshot.sequence":
            1,

          "periodSnapshot.startTime":
            1
        })
        .lean();

    const entries =
      documents
        .map(
          serializeTimetableEntry
        )
        .sort(
          (
            first,
            second
          ) => {
            const dayDifference =
              DAY_ORDER.indexOf(
                first.day
              ) -
              DAY_ORDER.indexOf(
                second.day
              );

            if (
              dayDifference !==
              0
            ) {
              return dayDifference;
            }

            return (
              Number(
                first.period
                  .sequence ||
                999
              ) -
              Number(
                second.period
                  .sequence ||
                999
              )
            );
          }
        );

    const byDay =
      entries.reduce(
        (
          result,
          entry
        ) => {
          result[
            entry.day
          ] =
            result[
              entry.day
            ] ||
            [];

          result[
            entry.day
          ].push(entry);

          return result;
        },
        {}
      );

    return {
      available: true,

      timetableConfig: {
        id:
          config._id,

        title:
          config.title ||
          "",

        code:
          config.code ||
          "",

        status:
          config.status ||
          (
            config.isActive
              ? "published"
              : "draft"
          ),

        academicYear:
          config
            .academicYear ||
          null,

        academicTerm:
          config
            .academicTerm ||
          null,

        effectiveStartDate:
          config
            .effectiveStartDate ||
          null,

        effectiveEndDate:
          config
            .effectiveEndDate ||
          null
      },

      rotationWeekCode,
      entries,
      byDay
    };
  };

/* -------------------------------------------------------------------------- */
/* Child dashboard card                                                        */
/* -------------------------------------------------------------------------- */

const buildChildDashboardCard =
  async ({
    parentUserId,
    schoolId,
    access
  }) => {
    const student =
      access.student;

    const studentId =
      student._id;

    const currentMonth =
      buildAttendanceDateRange(
        {}
      );

    const attendancePromise =
      access.permissions
        .attendance
        ? getAttendanceData({
            schoolId,
            studentId,

            startDate:
              currentMonth
                .startDate,

            endDate:
              currentMonth
                .endDate
          })
        : Promise.resolve({
            summary: null,
            records: []
          });

    const feePromise =
      access.permissions.fees
        ? FeeCollection
            .find({
              schoolId,
              studentId
            })
            .select(
              "payableAmount paidAmount balanceAmount paymentStatus payments"
            )
            .lean()
        : Promise.resolve([]);

    const timetablePromise =
      access.permissions
        .timetable
        ? getChildTimetableData({
            student,

            requestedDay:
              getTodayDayName()
          })
        : Promise.resolve({
            available: false,
            entries: []
          });

    const unreadPromise =
      access.permissions
        .messages
        ? PortalConversation
            .aggregate([
              {
                $match: {
                  schoolId:
                    toObjectId(
                      schoolId
                    ),

                  parentUserId:
                    toObjectId(
                      parentUserId
                    ),

                  studentId:
                    toObjectId(
                      studentId
                    ),

                  isDeleted:
                    false,

                  isArchivedByParent:
                    false
                }
              },
              {
                $group: {
                  _id: null,

                  unreadCount: {
                    $sum:
                      "$parentUnreadCount"
                  },

                  openConversations: {
                    $sum: {
                      $cond: [
                        {
                          $in: [
                            "$status",
                            [
                              "open",
                              "waiting_for_school",
                              "waiting_for_family"
                            ]
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  }
                }
              }
            ])
        : Promise.resolve([]);

    const [
      attendance,
      feeRecords,
      timetable,
      unread
    ] =
      await Promise.all([
        attendancePromise,
        feePromise,
        timetablePromise,
        unreadPromise
      ]);

    return {
      student:
        serializeStudent(
          student
        ),

      link:
        serializeAccessLink(
          access.link,
          access.legacy
        ),

      summary: {
        attendance:
          attendance.summary,

        fees:
          summarizeFeeRecords(
            feeRecords
          ),

        todayClasses:
          timetable.entries
            ?.length ||
          0,

        unreadMessages:
          unread[0]
            ?.unreadCount ||
          0,

        openConversations:
          unread[0]
            ?.openConversations ||
          0
      }
    };
  };

/* -------------------------------------------------------------------------- */
/* GET /api/parent-portal/overview                                             */
/* -------------------------------------------------------------------------- */

const getParentPortalOverview =
  async (
    request,
    response
  ) => {
    try {
      const parentScope =
        validateParentRequest(
          request,
          response
        );

      if (!parentScope) {
        return;
      }

      const {
        parentUserId,
        schoolId
      } = parentScope;

      const [
        accessibleChildren,
        principal,
        conversationSummary
      ] =
        await Promise.all([
          getAccessibleChildren({
            parentUserId,
            schoolId
          }),

          User.findOne({
            schoolId,
            role: "principal",
            isActive: true
          })
            .select(
              "name email phone photo"
            )
            .sort({
              updatedAt: -1
            })
            .lean(),

          PortalConversation
            .aggregate([
              {
                $match: {
                  schoolId:
                    toObjectId(
                      schoolId
                    ),

                  parentUserId:
                    toObjectId(
                      parentUserId
                    ),

                  isDeleted:
                    false,

                  isArchivedByParent:
                    false
                }
              },
              {
                $group: {
                  _id: null,

                  totalConversations: {
                    $sum: 1
                  },

                  unreadMessages: {
                    $sum:
                      "$parentUnreadCount"
                  },

                  openConversations: {
                    $sum: {
                      $cond: [
                        {
                          $in: [
                            "$status",
                            [
                              "open",
                              "waiting_for_school",
                              "waiting_for_family"
                            ]
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  }
                }
              }
            ])
        ]);

      const children =
        await Promise.all(
          accessibleChildren.map(
            (access) =>
              buildChildDashboardCard({
                parentUserId,
                schoolId,
                access
              })
          )
        );

      const totals =
        children.reduce(
          (
            result,
            child
          ) => {
            result
              .totalOutstandingBalance +=
              Number(
                child.summary
                  .fees
                  .totalBalance ||
                0
              );

            result.todayClasses +=
              Number(
                child.summary
                  .todayClasses ||
                0
              );

            if (
              child.summary
                .attendance
                ?.total >
              0
            ) {
              result.attendancePresent +=
                child.summary
                  .attendance
                  .present;

              result.attendanceTotal +=
                child.summary
                  .attendance
                  .total;
            }

            return result;
          },
          {
            totalOutstandingBalance:
              0,

            todayClasses:
              0,

            attendancePresent:
              0,

            attendanceTotal:
              0
          }
        );

      return response
        .status(200)
        .json({
          success: true,

          data: {
            parent: {
              id:
                request.user
                  ._id ||
                request.user.id,

              name:
                request.user
                  .name ||
                "",

              email:
                request.user
                  .email ||
                "",

              phone:
                request.user
                  .phone ||
                "",

              photo:
                request.user
                  .photo ||
                ""
            },

            school:
              children[0]
                ?.student
                ?.school ||
              null,

            principal:
              principal
                ? {
                    id:
                      principal._id,

                    name:
                      principal.name ||
                      "",

                    email:
                      principal.email ||
                      "",

                    phone:
                      principal.phone ||
                      "",

                    photo:
                      principal.photo ||
                      ""
                  }
                : null,

            summary: {
              totalChildren:
                children.length,

              totalOutstandingBalance:
                roundNumber(
                  totals
                    .totalOutstandingBalance
                ),

              todayClasses:
                totals
                  .todayClasses,

              currentMonthAttendancePercentage:
                totals
                  .attendanceTotal >
                0
                  ? roundNumber(
                      (
                        totals
                          .attendancePresent /
                        totals
                          .attendanceTotal
                      ) * 100,
                      1
                    )
                  : 0,

              totalConversations:
                conversationSummary[0]
                  ?.totalConversations ||
                0,

              openConversations:
                conversationSummary[0]
                  ?.openConversations ||
                0,

              unreadMessages:
                conversationSummary[0]
                  ?.unreadMessages ||
                0
            },

            children,

            generatedAt:
              new Date()
          }
        });
    } catch (error) {
      return handleControllerError(
        response,
        error,
        "Failed to load the parent portal overview."
      );
    }
  };

/* -------------------------------------------------------------------------- */
/* GET /api/parent-portal/children                                             */
/* -------------------------------------------------------------------------- */

const getParentChildren =
  async (
    request,
    response
  ) => {
    try {
      const parentScope =
        validateParentRequest(
          request,
          response
        );

      if (!parentScope) {
        return;
      }

      const children =
        await getAccessibleChildren(
          parentScope
        );

      return response
        .status(200)
        .json({
          success: true,

          data: {
            count:
              children.length,

            children:
              children.map(
                (access) => ({
                  student:
                    serializeStudent(
                      access.student
                    ),

                  link:
                    serializeAccessLink(
                      access.link,
                      access.legacy
                    )
                })
              )
          }
        });
    } catch (error) {
      return handleControllerError(
        response,
        error,
        "Failed to load linked children."
      );
    }
  };

/* -------------------------------------------------------------------------- */
/* GET /api/parent-portal/children/:studentId                                  */
/* -------------------------------------------------------------------------- */

const getParentChildProfile =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeChildFeature({
          request,
          response,

          feature:
            "studentProfile"
        });

      if (!access) {
        return;
      }

      return response
        .status(200)
        .json({
          success: true,

          data: {
            child:
              serializeStudent(
                access.student
              ),

            link:
              serializeAccessLink(
                access.link,
                access.legacy
              )
          }
        });
    } catch (error) {
      return handleControllerError(
        response,
        error,
        "Failed to load the child profile."
      );
    }
  };

/* -------------------------------------------------------------------------- */
/* GET /api/parent-portal/children/:studentId/attendance                       */
/* -------------------------------------------------------------------------- */

const getParentChildAttendance =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeChildFeature({
          request,
          response,
          feature:
            "attendance"
        });

      if (!access) {
        return;
      }

      const dateRange =
        buildAttendanceDateRange(
          request.query
        );

      if (dateRange.error) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              dateRange.error
          });
      }

      const attendance =
        await getAttendanceData({
          schoolId:
            access.schoolId,

          studentId:
            access.student._id,

          startDate:
            dateRange
              .startDate,

          endDate:
            dateRange
              .endDate
        });

      const requestedPage =
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

      const totalRecords =
        attendance.records
          .length;

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            totalRecords /
              limit
          )
        );

      const page =
        Math.min(
          requestedPage,
          totalPages
        );

      const startIndex =
        (
          page - 1
        ) * limit;

      return response
        .status(200)
        .json({
          success: true,

          data: {
            child:
              serializeStudent(
                access.student
              ),

            period: {
              label:
                dateRange.label,

              startDate:
                dateRange
                  .startDate,

              endDate:
                dateRange
                  .endDate
            },

            summary:
              attendance.summary,

            pagination: {
              page,
              limit,
              totalRecords,
              totalPages
            },

            records:
              attendance.records
                .slice(
                  startIndex,
                  startIndex +
                    limit
                )
          }
        });
    } catch (error) {
      return handleControllerError(
        response,
        error,
        "Failed to load the child attendance."
      );
    }
  };

/* -------------------------------------------------------------------------- */
/* GET /api/parent-portal/children/:studentId/fees                             */
/* -------------------------------------------------------------------------- */

const getParentChildFees =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeChildFeature({
          request,
          response,
          feature:
            "fees"
        });

      if (!access) {
        return;
      }

      const child =
        serializeStudent(
          access.student
        );

      const feeFilterResult =
        buildFeeFilter({
          schoolId:
            access.schoolId,

          studentId:
            access.student._id,

          query:
            request.query,

          sessionYear:
            child.school
              ?.sessionYear ||
            ""
        });

      if (
        feeFilterResult.error
      ) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              feeFilterResult
                .error
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
          page - 1
        ) * limit;

      const [
        summaryRecords,
        feeRecords,
        totalRecords
      ] =
        await Promise.all([
          FeeCollection
            .find(
              feeFilterResult
                .filter
            )
            .select(
              "payableAmount paidAmount balanceAmount paymentStatus payments"
            )
            .lean(),

          FeeCollection
            .find(
              feeFilterResult
                .filter
            )
            .populate(
              "classId",
              "className numericOrder"
            )
            .populate(
              "feeStructureId",
              "title sessionYear monthlyFee admissionFee examFee transportFee otherFee"
            )
            .populate(
              "payments.receivedBy",
              "name email role"
            )
            .sort({
              createdAt: -1
            })
            .skip(skip)
            .limit(limit)
            .lean(),

          FeeCollection
            .countDocuments(
              feeFilterResult
                .filter
            )
        ]);

      const summary =
        summarizeFeeRecords(
          summaryRecords
        );

      return response
        .status(200)
        .json({
          success: true,

          data: {
            child,

            summary: {
              ...summary,

              totalPayable:
                roundNumber(
                  summary
                    .totalPayable
                ),

              totalPaid:
                roundNumber(
                  summary
                    .totalPaid
                ),

              totalBalance:
                roundNumber(
                  summary
                    .totalBalance
                )
            },

            pagination: {
              page,
              limit,
              totalRecords,

              totalPages:
                Math.max(
                  1,
                  Math.ceil(
                    totalRecords /
                      limit
                  )
                )
            },

            feeRecords
          }
        });
    } catch (error) {
      return handleControllerError(
        response,
        error,
        "Failed to load the child fee records."
      );
    }
  };

/* -------------------------------------------------------------------------- */
/* GET /api/parent-portal/children/:studentId/timetable                        */
/* -------------------------------------------------------------------------- */

const getParentChildTimetable =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeChildFeature({
          request,
          response,
          feature:
            "timetable"
        });

      if (!access) {
        return;
      }

      const timetable =
        await getChildTimetableData({
          student:
            access.student,

          requestedRotationCode:
            request.query
              .rotationWeekCode,

          requestedDay:
            request.query.day
        });

      if (timetable.error) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              timetable.error
          });
      }

      return response
        .status(200)
        .json({
          success: true,

          data: {
            child:
              serializeStudent(
                access.student
              ),

            ...timetable
          }
        });
    } catch (error) {
      return handleControllerError(
        response,
        error,
        "Failed to load the child timetable."
      );
    }
  };

/* -------------------------------------------------------------------------- */
/* GET /api/parent-portal/children/:studentId/academics                        */
/* -------------------------------------------------------------------------- */

const getParentChildAcademicSummary =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeChildFeature({
          request,
          response,
          feature:
            "academics"
        });

      if (!access) {
        return;
      }

      const classId =
        access.student
          .classId?._id ||
        access.student
          .classId;

      const subjects =
        await Subject
          .find({
            schoolId:
              access.schoolId,

            classId,

            isActive:
              true,

            isDeleted:
              false
          })
          .populate(
            "teacherId",
            "employeeId name qualification subjects status"
          )
          .sort({
            subjectName: 1
          })
          .lean();

      const subjectCards =
        subjects.map(
          (subject) => ({
            id:
              subject._id,

            subjectCode:
              subject
                .subjectCode ||
              "",

            subjectName:
              subject
                .subjectName ||
              "",

            description:
              subject
                .description ||
              "",

            teacher:
              subject.teacherId
                ? {
                    id:
                      subject
                        .teacherId
                        ._id,

                    employeeId:
                      subject
                        .teacherId
                        .employeeId ||
                      "",

                    name:
                      subject
                        .teacherId
                        .name ||
                      "",

                    qualification:
                      subject
                        .teacherId
                        .qualification ||
                      "",

                    status:
                      subject
                        .teacherId
                        .status ||
                      ""
                  }
                : null
          })
        );

      return response
        .status(200)
        .json({
          success: true,

          data: {
            child:
              serializeStudent(
                access.student
              ),

            summary: {
              subjectCount:
                subjectCards
                  .length,

              assignedTeacherCount:
                subjectCards
                  .filter(
                    (subject) =>
                      subject.teacher
                        ?.id
                  )
                  .length
            },

            subjects:
              subjectCards,

            results: [],

            availability: {
              subjects: true,
              teachers: true,
              examinations: false,
              grades: false,
              reportCards: false
            },

            note:
              "Academic subjects and assigned teachers are available. Examination results will appear after the assessment module is added."
          }
        });
    } catch (error) {
      return handleControllerError(
        response,
        error,
        "Failed to load the child academic summary."
      );
    }
  };

/* -------------------------------------------------------------------------- */
/* GET /api/parent-portal/children/:studentId/snapshot                         */
/* -------------------------------------------------------------------------- */

const getParentChildSnapshot =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeChildFeature({
          request,
          response,
          feature:
            "dashboard"
        });

      if (!access) {
        return;
      }

      const snapshot =
        await buildChildDashboardCard({
          parentUserId:
            access.parentUserId,

          schoolId:
            access.schoolId,

          access
        });

      return response
        .status(200)
        .json({
          success: true,
          data: snapshot
        });
    } catch (error) {
      return handleControllerError(
        response,
        error,
        "Failed to load the child portal snapshot."
      );
    }
  };

module.exports = {
  getParentPortalOverview,
  getParentChildren,
  getParentChildProfile,
  getParentChildAttendance,
  getParentChildFees,
  getParentChildTimetable,
  getParentChildAcademicSummary,
  getParentChildSnapshot
};