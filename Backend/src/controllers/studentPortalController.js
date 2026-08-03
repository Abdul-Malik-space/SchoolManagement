const mongoose = require("mongoose");

const PortalConversation = require(
  "../models/PortalConversation"
);

const Student = require(
  "../models/Student"
);

const StudentAttendance = require(
  "../models/StudentAttendance"
);

const FeeCollection = require(
  "../models/FeeCollection"
);

const Subject = require(
  "../models/Subject"
);

const User = require(
  "../models/User"
);

const TimetableConfig = require(
  "../models/TimetableConfig"
);

const TimetableEntry = require(
  "../models/TimetableEntry"
);

/*
|--------------------------------------------------------------------------
| Student Portal Constants
|--------------------------------------------------------------------------
*/

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

const DEFAULT_PAGE_SIZE =
  20;

const MAX_PAGE_SIZE =
  100;

const ACTIVE_CONVERSATION_STATUSES = [
  "open",
  "waiting_for_school",
  "waiting_for_family"
];

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const isValidObjectId = (
  value
) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

const toObjectId = (
  value
) => {
  if (
    !isValidObjectId(
      value
    )
  ) {
    return null;
  }

  return new mongoose.Types.ObjectId(
    value
  );
};

const normalizeText = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
};

const roundNumber = (
  value,
  precision = 2
) => {
  const multiplier =
    10 ** precision;

  return (
    Math.round(
      Number(
        value || 0
      ) *
        multiplier
    ) /
    multiplier
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

const normalizeDate = (
  value = new Date()
) => {
  const date =
    new Date(
      value
    );

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
    normalizeDate(
      value
    );

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
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(
      0,
      10
    );
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
    ][
      new Date().getDay()
    ];
  };

const getCurrentTimeValue =
  () => {
    const now =
      new Date();

    return (
      now.getHours() *
        60 +
      now.getMinutes()
    );
  };

const timeToMinutes = (
  value
) => {
  const match =
    String(
      value || ""
    ).match(
      /^([01]\d|2[0-3]):([0-5]\d)$/
    );

  if (!match) {
    return null;
  }

  return (
    Number(
      match[1]
    ) *
      60 +
    Number(
      match[2]
    )
  );
};

const getUserId = (
  request
) => {
  const value =
    request.user?._id ||
    request.user?.id;

  return value
    ? String(
        value
      )
    : null;
};

const getSchoolId = (
  request
) => {
  const value =
    request.user?.schoolId?._id ||
    request.user?.schoolId ||
    request.schoolFilter?.schoolId;

  return value
    ? String(
        value
      )
    : null;
};

/*
|--------------------------------------------------------------------------
| Student Authentication and Ownership
|--------------------------------------------------------------------------
|
| Student Portal کسی client supplied studentId پر اعتماد نہیں کرتا۔
| Authenticated student account کے studentUserId سے صرف اسی student کا
| record resolve کیا جاتا ہے۔
|
*/

const validateStudentRequest = (
  request,
  response
) => {
  if (
    !request.user
  ) {
    response
      .status(
        401
      )
      .json({
        success:
          false,

        message:
          "Authentication is required."
      });

    return null;
  }

  const role =
    String(
      request.user.role ||
      ""
    ).toLowerCase();

  if (
    role !==
    "student"
  ) {
    response
      .status(
        403
      )
      .json({
        success:
          false,

        message:
          "This endpoint is available only to student accounts."
      });

    return null;
  }

  const studentUserId =
    getUserId(
      request
    );

  const schoolId =
    getSchoolId(
      request
    );

  if (
    !studentUserId ||
    !isValidObjectId(
      studentUserId
    )
  ) {
    response
      .status(
        401
      )
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
      .status(
        403
      )
      .json({
        success:
          false,

        message:
          "No active school is assigned to this student account."
      });

    return null;
  }

  return {
    studentUserId,
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
      .status(
        400
      )
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
      .status(
        400
      )
      .json({
        success:
          false,

        message:
          "One of the supplied record IDs is invalid."
      });
  }

  return response
    .status(
      500
    )
    .json({
      success:
        false,

      message:
        defaultMessage,

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
};

/*
|--------------------------------------------------------------------------
| Student Record Resolution
|--------------------------------------------------------------------------
*/

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
      "name email phone photo role isActive mustChangePassword"
    )
    .populate(
      "parentUserIds",
      "name email phone photo role isActive"
    );
};

const findAuthenticatedStudent =
  async ({
    studentUserId,
    schoolId
  }) => {
    return populateStudentQuery(
      Student.findOne({
        schoolId,
        studentUserId,
        isDeleted: {
          $ne: true
        }
      })
    );
  };

const authorizeStudentPortal =
  async (
    request,
    response
  ) => {
    const scope =
      validateStudentRequest(
        request,
        response
      );

    if (!scope) {
      return null;
    }

    const student =
      await findAuthenticatedStudent(
        scope
      );

    if (!student) {
      response
        .status(
          404
        )
        .json({
          success:
            false,

          message:
            "No active student profile is linked with this login account."
        });

      return null;
    }

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
        .status(
          403
        )
        .json({
          success:
            false,

          message:
            "This student profile is not currently eligible for portal access."
        });

      return null;
    }

    return {
      ...scope,
      student
    };
  };

/*
|--------------------------------------------------------------------------
| Student Serialization
|--------------------------------------------------------------------------
*/

const serializeUser = (
  user
) => {
  if (!user) {
    return null;
  }

  return {
    id:
      user._id ||
      user.id ||
      null,

    name:
      user.name ||
      "",

    email:
      user.email ||
      "",

    phone:
      user.phone ||
      "",

    photo:
      user.photo ||
      "",

    role:
      user.role ||
      "",

    isActive:
      user.isActive !==
      false
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

  const section =
    classRecord?.sections?.id
      ? classRecord.sections.id(
          student.sectionId
        )
      : Array.isArray(
          classRecord?.sections
        )
        ? classRecord.sections.find(
            (
              item
            ) =>
              String(
                item._id
              ) ===
              String(
                student.sectionId
              )
          )
        : null;

  return {
    id:
      student._id,

    admissionNumber:
      student.admissionNumber ||
      "",

    name:
      student.name ||
      student.studentUserId?.name ||
      "",

    fatherName:
      student.fatherName ||
      "",

    guardianName:
      student.guardianName ||
      "",

    bForm:
      student.bForm ||
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
      student.contactNumber ||
      student.studentUserId?.phone ||
      "",

    guardianContact:
      student.guardianContact ||
      "",

    admissionDate:
      student.admissionDate ||
      null,

    photo:
      student.studentPhoto ||
      student.studentUserId?.photo ||
      "",

    status:
      student.status ||
      "active",

    sectionId:
      student.sectionId ||
      null,

    sectionName:
      student.sectionName ||
      section?.sectionName ||
      "",

    sectionCapacity:
      section?.capacity ||
      null,

    class:
      classRecord
        ? {
            id:
              classRecord._id,

            className:
              classRecord.className ||
              "",

            numericOrder:
              classRecord.numericOrder ||
              0,

            isActive:
              classRecord.isActive !==
              false
          }
        : {
            id:
              student.classId ||
              null,

            className:
              "",

            numericOrder:
              0,

            isActive:
              true
          },

    school:
      schoolRecord
        ? {
            id:
              schoolRecord._id,

            schoolName:
              schoolRecord.schoolName ||
              "",

            type:
              schoolRecord.type ||
              "",

            address:
              schoolRecord.address ||
              "",

            phone:
              schoolRecord.phone ||
              "",

            email:
              schoolRecord.email ||
              "",

            sessionYear:
              schoolRecord.sessionYear ||
              "",

            isActive:
              schoolRecord.isActive !==
              false
          }
        : {
            id:
              student.schoolId ||
              null,

            schoolName:
              "",

            type:
              "",

            address:
              "",

            phone:
              "",

            email:
              "",

            sessionYear:
              "",

            isActive:
              true
          },

    loginAccount:
      serializeUser(
        student.studentUserId
      ),

    linkedParents:
      Array.isArray(
        student.parentUserIds
      )
        ? student.parentUserIds.map(
            serializeUser
          )
        : []
  };
};

/*
|--------------------------------------------------------------------------
| Date Range
|--------------------------------------------------------------------------
*/

const buildAttendanceDateRange = (
  query = {}
) => {
  if (
    query.month
  ) {
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
        .split(
          "-"
        )
        .map(
          Number
        );

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
        today.getMonth() +
          1,
        0,
        23,
        59,
        59,
        999
      ),

    label:
      `${today.getFullYear()}-${String(
        today.getMonth() +
          1
      ).padStart(
        2,
        "0"
      )}`
  };
};

/*
|--------------------------------------------------------------------------
| Attendance
|--------------------------------------------------------------------------
*/

const getAttendanceRisk = (
  attendancePercentage,
  totalRecords
) => {
  if (
    totalRecords ===
    0
  ) {
    return {
      level:
        "unknown",

      label:
        "No attendance data",

      message:
        "Attendance will be analysed after records are marked."
    };
  }

  if (
    attendancePercentage <
    75
  ) {
    return {
      level:
        "critical",

      label:
        "Critical attendance risk",

      message:
        "Attendance is below the recommended minimum and requires immediate attention."
    };
  }

  if (
    attendancePercentage <
    85
  ) {
    return {
      level:
        "warning",

      label:
        "Attendance needs improvement",

      message:
        "A small number of additional absences may significantly affect attendance."
    };
  }

  return {
    level:
      "good",

    label:
      "Attendance on track",

    message:
      "Current attendance is within a healthy range."
  };
};

const getAttendanceData =
  async ({
    schoolId,
    studentId,
    startDate,
    endDate
  }) => {
    const documents =
      await StudentAttendance.find({
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
          (
            document
          ) => {
            const matchedRecord =
              document.records?.find(
                (
                  record
                ) => {
                  return (
                    String(
                      record.studentId?._id ||
                      record.studentId
                    ) ===
                    String(
                      studentId
                    )
                  );
                }
              );

            if (
              !matchedRecord
            ) {
              return null;
            }

            return {
              id:
                document._id,

              attendanceDate:
                document.attendanceDate,

              status:
                matchedRecord.status,

              remarks:
                matchedRecord.remarks ||
                "",

              sectionName:
                document.sectionName ||
                "",

              class:
                document.classId
                  ? {
                      id:
                        document.classId._id,

                      className:
                        document.classId.className ||
                        "",

                      numericOrder:
                        document.classId.numericOrder ||
                        0
                    }
                  : null
            };
          }
        )
        .filter(
          Boolean
        );

    const summary =
      records.reduce(
        (
          result,
          record
        ) => {
          result.total +=
            1;

          result[
            record.status
          ] =
            Number(
              result[
                record.status
              ] ||
              0
            ) +
            1;

          return result;
        },
        {
          total:
            0,

          present:
            0,

          absent:
            0,

          late:
            0,

          leave:
            0
        }
      );

    const attendedCount =
      summary.present +
      summary.late;

    summary.presentPercentage =
      summary.total >
      0
        ? roundNumber(
            (
              summary.present /
              summary.total
            ) *
              100,
            1
          )
        : 0;

    summary.attendancePercentage =
      summary.total >
      0
        ? roundNumber(
            (
              attendedCount /
              summary.total
            ) *
              100,
            1
          )
        : 0;

    summary.risk =
      getAttendanceRisk(
        summary.attendancePercentage,
        summary.total
      );

    return {
      summary,
      records
    };
  };

/*
|--------------------------------------------------------------------------
| Fees
|--------------------------------------------------------------------------
*/

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

  if (
    query.feeMonth
  ) {
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
      ].includes(
        status
      )
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
          record.payableAmount ||
          0
        );

      summary.totalPaid +=
        Number(
          record.paidAmount ||
          0
        );

      summary.totalBalance +=
        Number(
          record.balanceAmount ||
          0
        );

      summary.paymentCount +=
        Array.isArray(
          record.payments
        )
          ? record.payments.length
          : 0;

      if (
        record.paymentStatus ===
        "paid"
      ) {
        summary.paidInvoices +=
          1;
      } else if (
        record.paymentStatus ===
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
      invoiceCount:
        0,

      paidInvoices:
        0,

      partialInvoices:
        0,

      unpaidInvoices:
        0,

      paymentCount:
        0,

      totalPayable:
        0,

      totalPaid:
        0,

      totalBalance:
        0
    }
  );
};

/*
|--------------------------------------------------------------------------
| Timetable
|--------------------------------------------------------------------------
*/

const getPublishedTimetableConfig =
  async (
    schoolId
  ) => {
    return TimetableConfig.findOne({
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

        updatedAt:
          -1
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
    if (
      requestedCode
    ) {
      return String(
        requestedCode
      )
        .trim()
        .toUpperCase();
    }

    const codes =
      await TimetableEntry.distinct(
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
              sectionName:
                ""
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
) => {
  return {
    id:
      entry._id,

    day:
      entry.day,

    rotationWeekCode:
      entry.rotationWeekCode,

    rotationWeekLabel:
      entry.rotationWeekLabel ||
      "",

    period: {
      id:
        entry.periodId,

      sequence:
        entry.periodSnapshot?.sequence ||
        null,

      code:
        entry.periodSnapshot?.code ||
        "",

      name:
        entry.periodSnapshot?.name ||
        "",

      shortName:
        entry.periodSnapshot?.shortName ||
        "",

      type:
        entry.periodSnapshot?.type ||
        "",

      startTime:
        entry.periodSnapshot?.startTime ||
        "",

      endTime:
        entry.periodSnapshot?.endTime ||
        "",

      durationMinutes:
        entry.periodSnapshot?.durationMinutes ||
        null
    },

    subject: {
      id:
        entry.subjectId?._id ||
        entry.subjectId ||
        null,

      name:
        entry.subjectId?.subjectName ||
        entry.subjectSnapshot?.name ||
        "",

      code:
        entry.subjectId?.subjectCode ||
        entry.subjectSnapshot?.code ||
        ""
    },

    teacher: {
      id:
        entry.teacherId?._id ||
        entry.teacherId ||
        null,

      name:
        entry.teacherId?.name ||
        entry.teacherSnapshot?.name ||
        "",

      employeeId:
        entry.teacherId?.employeeId ||
        entry.teacherSnapshot?.employeeId ||
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
        entry.room?.building ||
        "",

      floor:
        entry.room?.floor ||
        "",

      resourceType:
        entry.room?.resourceType ||
        ""
    },

    entryType:
      entry.entryType,

    deliveryMode:
      entry.deliveryMode,

    onlineMeetingUrl:
      entry.onlineMeetingUrl ||
      "",

    displayColor:
      entry.displayColor ||
      "",

    notes:
      entry.notes ||
      ""
  };
};

const getStudentTimetableData =
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
        available:
          false,

        message:
          "No published timetable is currently available.",

        timetableConfig:
          null,

        rotationWeekCode:
          null,

        entries:
          [],

        byDay:
          {}
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
          sectionName:
            ""
        },
        {
          sectionName:
            null
        }
      ]
    };

    if (
      requestedDay
    ) {
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
      await TimetableEntry.find(
        filter
      )
        .populate(
          "subjectId",
          "subjectName subjectCode"
        )
        .populate(
          "teacherId",
          "name employeeId qualification status"
        )
        .sort({
          day:
            1,

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
                first.period.sequence ||
                999
              ) -
              Number(
                second.period.sequence ||
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
          ].push(
            entry
          );

          return result;
        },
        {}
      );

    return {
      available:
        true,

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
          config.academicYear ||
          null,

        academicTerm:
          config.academicTerm ||
          null,

        effectiveStartDate:
          config.effectiveStartDate ||
          null,

        effectiveEndDate:
          config.effectiveEndDate ||
          null,

        timezone:
          config.timezone ||
          "Asia/Karachi"
      },

      rotationWeekCode,
      entries,
      byDay
    };
  };

const getNextClass = (
  entries
) => {
  if (
    !Array.isArray(
      entries
    ) ||
    entries.length ===
      0
  ) {
    return null;
  }

  const currentMinutes =
    getCurrentTimeValue();

  const upcoming =
    entries.find(
      (
        entry
      ) => {
        const startMinutes =
          timeToMinutes(
            entry.period.startTime
          );

        return (
          startMinutes !==
            null &&
          startMinutes >=
            currentMinutes
        );
      }
    );

  return (
    upcoming ||
    entries[0]
  );
};

/*
|--------------------------------------------------------------------------
| Profile Completion
|--------------------------------------------------------------------------
*/

const getProfileCompletion = (
  student
) => {
  const checks = [
    student.name,
    student.admissionNumber,
    student.fatherName,
    student.gender,
    student.dateOfBirth,
    student.contactNumber,
    student.guardianName,
    student.guardianContact,
    student.address,
    student.studentPhoto,
    student.classId,
    student.sectionName
  ];

  const completed =
    checks.filter(
      Boolean
    ).length;

  const percentage =
    roundNumber(
      (
        completed /
        checks.length
      ) *
        100,
      0
    );

  const missingFields = [];

  if (
    !student.dateOfBirth
  ) {
    missingFields.push(
      "dateOfBirth"
    );
  }

  if (
    !student.contactNumber
  ) {
    missingFields.push(
      "contactNumber"
    );
  }

  if (
    !student.guardianContact
  ) {
    missingFields.push(
      "guardianContact"
    );
  }

  if (
    !student.address
  ) {
    missingFields.push(
      "address"
    );
  }

  if (
    !student.studentPhoto
  ) {
    missingFields.push(
      "photo"
    );
  }

  return {
    percentage,
    completedFields:
      completed,
    totalFields:
      checks.length,
    missingFields,
    status:
      percentage >= 90
        ? "complete"
        : percentage >= 70
          ? "good"
          : "incomplete"
  };
};

/*
|--------------------------------------------------------------------------
| Dashboard Alerts
|--------------------------------------------------------------------------
*/

const buildDashboardAlerts = ({
  attendance,
  fees,
  timetable,
  profileCompletion
}) => {
  const alerts = [];

  if (
    attendance.summary.total >
      0 &&
    attendance.summary.attendancePercentage <
      85
  ) {
    alerts.push({
      id:
        "attendance-risk",

      type:
        attendance.summary.attendancePercentage <
        75
          ? "critical"
          : "warning",

      title:
        attendance.summary.risk.label,

      message:
        attendance.summary.risk.message,

      actionPath:
        "/student-portal/attendance"
    });
  }

  if (
    fees.totalBalance >
    0
  ) {
    alerts.push({
      id:
        "fee-balance",

      type:
        "warning",

      title:
        "Outstanding fee balance",

      message:
        `A fee balance of Rs ${roundNumber(
          fees.totalBalance
        ).toLocaleString(
          "en-US"
        )} is currently outstanding.`,

      actionPath:
        "/student-portal/fees"
    });
  }

  if (
    !timetable.available
  ) {
    alerts.push({
      id:
        "timetable-unavailable",

      type:
        "info",

      title:
        "Timetable not published",

      message:
        "Your school has not published an active timetable yet.",

      actionPath:
        "/student-portal/timetable"
    });
  }

  if (
    profileCompletion.percentage <
    80
  ) {
    alerts.push({
      id:
        "profile-incomplete",

      type:
        "info",

      title:
        "Profile information needs review",

      message:
        "Some student profile details are missing. Contact the school to request a correction.",

      actionPath:
        "/student-portal/profile"
    });
  }

  return alerts;
};

/*
|--------------------------------------------------------------------------
| Student Portal Capability Map
|--------------------------------------------------------------------------
|
| false features کے لیے UI "Coming Soon" یا unavailable state دکھا سکتا ہے۔
| نئے models بننے کے بعد انہی keys کو true کیا جا سکے گا۔
|
*/

const buildCapabilityMap =
  () => {
    return {
      dashboard:
        true,

      profile:
        true,

      digitalId:
        true,

      attendance:
        true,

      timetable:
        true,

      subjects:
        true,

      fees:
        true,

      receipts:
        true,

      messages:
        true,

      assignments:
        false,

      examinations:
        false,

      grades:
        false,

      reportCards:
        false,

      documents:
        false,

      certificates:
        false,

      notices:
        false,

      events:
        false,

      goals:
        false,

      studyPlanner:
        false,

      behavior:
        false,

      health:
        false,

      transport:
        false,

      library:
        false
    };
  };

/*
|--------------------------------------------------------------------------
| GET /api/student-portal/overview
|--------------------------------------------------------------------------
*/

const getStudentPortalOverview =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeStudentPortal(
          request,
          response
        );

      if (!access) {
        return;
      }

      const student =
        access.student;

      const studentId =
        student._id;

      const currentMonth =
        buildAttendanceDateRange(
          {}
        );

      const [
        attendance,
        feeRecords,
        timetable,
        messageSummary,
        principal,
        subjectCount
      ] =
        await Promise.all([
          getAttendanceData({
            schoolId:
              access.schoolId,

            studentId,

            startDate:
              currentMonth.startDate,

            endDate:
              currentMonth.endDate
          }),

          FeeCollection.find({
            schoolId:
              access.schoolId,

            studentId
          })
            .select(
              "payableAmount paidAmount balanceAmount paymentStatus payments"
            )
            .lean(),

          getStudentTimetableData({
            student,

            requestedDay:
              getTodayDayName(),

            requestedRotationCode:
              request.query.rotationWeekCode
          }),

          PortalConversation.aggregate([
            {
              $match: {
                schoolId:
                  toObjectId(
                    access.schoolId
                  ),

                studentUserId:
                  toObjectId(
                    access.studentUserId
                  ),

                isDeleted:
                  false,

                isArchivedByStudent: {
                  $ne:
                    true
                }
              }
            },

            {
              $group: {
                _id:
                  null,

                totalConversations: {
                  $sum:
                    1
                },

                unreadMessages: {
                  $sum:
                    "$studentUnreadCount"
                },

                openConversations: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          "$status",
                          ACTIVE_CONVERSATION_STATUSES
                        ]
                      },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]),

          User.findOne({
            schoolId:
              access.schoolId,

            role:
              "principal",

            isActive:
              true
          })
            .select(
              "name email phone photo"
            )
            .sort({
              updatedAt:
                -1
            })
            .lean(),

          Subject.countDocuments({
            schoolId:
              access.schoolId,

            classId:
              student.classId?._id ||
              student.classId,

            isActive:
              true,

            isDeleted:
              false
          })
        ]);

      const feeSummary =
        summarizeFeeRecords(
          feeRecords
        );

      const profileCompletion =
        getProfileCompletion(
          student
        );

      const todayEntries =
        timetable.entries ||
        [];

      const dashboardAlerts =
        buildDashboardAlerts({
          attendance,
          fees:
            feeSummary,
          timetable,
          profileCompletion
        });

      return response
        .status(
          200
        )
        .json({
          success:
            true,

          data: {
            student:
              serializeStudent(
                student
              ),

            principal:
              serializeUser(
                principal
              ),

            currentDate:
              new Date(),

            today: {
              day:
                getTodayDayName(),

              classCount:
                todayEntries.length,

              classes:
                todayEntries,

              nextClass:
                getNextClass(
                  todayEntries
                )
            },

            summary: {
              attendance:
                attendance.summary,

              fees: {
                ...feeSummary,

                totalPayable:
                  roundNumber(
                    feeSummary.totalPayable
                  ),

                totalPaid:
                  roundNumber(
                    feeSummary.totalPaid
                  ),

                totalBalance:
                  roundNumber(
                    feeSummary.totalBalance
                  )
              },

              subjects:
                subjectCount,

              messages: {
                totalConversations:
                  messageSummary[0]?.totalConversations ||
                  0,

                openConversations:
                  messageSummary[0]?.openConversations ||
                  0,

                unreadMessages:
                  messageSummary[0]?.unreadMessages ||
                  0
              },

              profileCompletion
            },

            alerts:
              dashboardAlerts,

            capabilities:
              buildCapabilityMap(),

            quickActions: [
              {
                id:
                  "view-timetable",

                label:
                  "View Timetable",

                path:
                  "/student-portal/timetable"
              },
              {
                id:
                  "check-attendance",

                label:
                  "Check Attendance",

                path:
                  "/student-portal/attendance"
              },
              {
                id:
                  "view-fees",

                label:
                  "View Fees",

                path:
                  "/student-portal/fees"
              },
              {
                id:
                  "message-principal",

                label:
                  "Message Principal",

                path:
                  "/student-portal/messages"
              }
            ]
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        response,
        error,
        "Failed to load the student portal overview."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/student-portal/profile
|--------------------------------------------------------------------------
*/

const getStudentPortalProfile =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeStudentPortal(
          request,
          response
        );

      if (!access) {
        return;
      }

      const studentData =
        serializeStudent(
          access.student
        );

      return response
        .status(
          200
        )
        .json({
          success:
            true,

          data: {
            student:
              studentData,

            profileCompletion:
              getProfileCompletion(
                access.student
              ),

            digitalId: {
              admissionNumber:
                studentData.admissionNumber,

              studentName:
                studentData.name,

              schoolName:
                studentData.school.schoolName,

              className:
                studentData.class.className,

              sectionName:
                studentData.sectionName,

              photo:
                studentData.photo,

              status:
                studentData.status,

              sessionYear:
                studentData.school.sessionYear
            },

            correctionPolicy: {
              directEditingAllowed:
                false,

              message:
                "Official student information cannot be edited directly from the portal. Contact the school to request a correction."
            }
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        response,
        error,
        "Failed to load the student profile."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/student-portal/attendance
|--------------------------------------------------------------------------
*/

const getStudentPortalAttendance =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeStudentPortal(
          request,
          response
        );

      if (!access) {
        return;
      }

      const range =
        buildAttendanceDateRange(
          request.query
        );

      if (
        range.error
      ) {
        return response
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              range.error
          });
      }

      const attendance =
        await getAttendanceData({
          schoolId:
            access.schoolId,

          studentId:
            access.student._id,

          startDate:
            range.startDate,

          endDate:
            range.endDate
        });

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

      const totalRecords =
        attendance.records.length;

      const skip =
        (
          page -
          1
        ) *
        limit;

      return response
        .status(
          200
        )
        .json({
          success:
            true,

          data: {
            student:
              serializeStudent(
                access.student
              ),

            range: {
              label:
                range.label,

              startDate:
                range.startDate,

              endDate:
                range.endDate
            },

            summary:
              attendance.summary,

            trend: {
              risk:
                attendance.summary.risk,

              attendedCount:
                attendance.summary.present +
                attendance.summary.late,

              missedCount:
                attendance.summary.absent +
                attendance.summary.leave
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

            records:
              attendance.records.slice(
                skip,
                skip +
                  limit
              )
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        response,
        error,
        "Failed to load student attendance."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/student-portal/fees
|--------------------------------------------------------------------------
*/

const getStudentPortalFees =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeStudentPortal(
          request,
          response
        );

      if (!access) {
        return;
      }

      const studentData =
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
            studentData.school
              ?.sessionYear ||
            ""
        });

      if (
        feeFilterResult.error
      ) {
        return response
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              feeFilterResult.error
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
        summaryRecords,
        feeRecords,
        totalRecords
      ] =
        await Promise.all([
          FeeCollection.find(
            feeFilterResult.filter
          )
            .select(
              "payableAmount paidAmount balanceAmount paymentStatus payments"
            )
            .lean(),

          FeeCollection.find(
            feeFilterResult.filter
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

          FeeCollection.countDocuments(
            feeFilterResult.filter
          )
        ]);

      const summary =
        summarizeFeeRecords(
          summaryRecords
        );

      return response
        .status(
          200
        )
        .json({
          success:
            true,

          data: {
            student:
              studentData,

            summary: {
              ...summary,

              totalPayable:
                roundNumber(
                  summary.totalPayable
                ),

              totalPaid:
                roundNumber(
                  summary.totalPaid
                ),

              totalBalance:
                roundNumber(
                  summary.totalBalance
                ),

              accountStatus:
                summary.totalBalance >
                0
                  ? "balance_due"
                  : "clear"
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
    } catch (
      error
    ) {
      return handleControllerError(
        response,
        error,
        "Failed to load student fee records."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/student-portal/timetable
|--------------------------------------------------------------------------
*/

const getStudentPortalTimetable =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeStudentPortal(
          request,
          response
        );

      if (!access) {
        return;
      }

      const timetable =
        await getStudentTimetableData({
          student:
            access.student,

          requestedRotationCode:
            request.query.rotationWeekCode,

          requestedDay:
            request.query.day ||
            null
        });

      if (
        timetable.error
      ) {
        return response
          .status(
            400
          )
          .json({
            success:
              false,

            message:
              timetable.error
          });
      }

      return response
        .status(
          200
        )
        .json({
          success:
            true,

          data: {
            student:
              serializeStudent(
                access.student
              ),

            ...timetable,

            today: {
              day:
                getTodayDayName(),

              entries:
                timetable.byDay?.[
                  getTodayDayName()
                ] ||
                [],

              nextClass:
                getNextClass(
                  timetable.byDay?.[
                    getTodayDayName()
                  ] ||
                  []
                )
            }
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        response,
        error,
        "Failed to load the student timetable."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/student-portal/academics
|--------------------------------------------------------------------------
*/

const getStudentPortalAcademicSummary =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeStudentPortal(
          request,
          response
        );

      if (!access) {
        return;
      }

      const classId =
        access.student.classId?._id ||
        access.student.classId;

      const subjects =
        await Subject.find({
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
            subjectName:
              1
          })
          .lean();

      const subjectCards =
        subjects.map(
          (
            subject
          ) => {
            return {
              id:
                subject._id,

              subjectCode:
                subject.subjectCode ||
                "",

              subjectName:
                subject.subjectName ||
                "",

              description:
                subject.description ||
                "",

              teacher:
                subject.teacherId
                  ? {
                      id:
                        subject.teacherId._id,

                      employeeId:
                        subject.teacherId.employeeId ||
                        "",

                      name:
                        subject.teacherId.name ||
                        "",

                      qualification:
                        subject.teacherId.qualification ||
                        "",

                      status:
                        subject.teacherId.status ||
                        ""
                    }
                  : null
            };
          }
        );

      return response
        .status(
          200
        )
        .json({
          success:
            true,

          data: {
            student:
              serializeStudent(
                access.student
              ),

            summary: {
              subjectCount:
                subjectCards.length,

              assignedTeacherCount:
                subjectCards.filter(
                  (
                    subject
                  ) =>
                    subject.teacher?.id
                ).length
            },

            subjects:
              subjectCards,

            results:
              [],

            insights: {
              available:
                false,

              strengths:
                [],

              improvementAreas:
                [],

              projectedPerformance:
                null
            },

            availability: {
              subjects:
                true,

              teachers:
                true,

              assignments:
                false,

              examinations:
                false,

              grades:
                false,

              reportCards:
                false,

              whatIfCalculator:
                false
            },

            note:
              "Subjects and assigned teachers are available. Results, assignments and performance analytics will appear after their modules are added."
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        response,
        error,
        "Failed to load student academic information."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/student-portal/snapshot
|--------------------------------------------------------------------------
|
| Lightweight response for mobile refresh, topbar badges and dashboard cards.
|
*/

const getStudentPortalSnapshot =
  async (
    request,
    response
  ) => {
    try {
      const access =
        await authorizeStudentPortal(
          request,
          response
        );

      if (!access) {
        return;
      }

      const currentMonth =
        buildAttendanceDateRange(
          {}
        );

      const [
        attendance,
        feeRecords,
        timetable,
        unread
      ] =
        await Promise.all([
          getAttendanceData({
            schoolId:
              access.schoolId,

            studentId:
              access.student._id,

            startDate:
              currentMonth.startDate,

            endDate:
              currentMonth.endDate
          }),

          FeeCollection.find({
            schoolId:
              access.schoolId,

            studentId:
              access.student._id
          })
            .select(
              "payableAmount paidAmount balanceAmount paymentStatus payments"
            )
            .lean(),

          getStudentTimetableData({
            student:
              access.student,

            requestedDay:
              getTodayDayName(),

            requestedRotationCode:
              request.query.rotationWeekCode
          }),

          PortalConversation.aggregate([
            {
              $match: {
                schoolId:
                  toObjectId(
                    access.schoolId
                  ),

                studentUserId:
                  toObjectId(
                    access.studentUserId
                  ),

                isDeleted:
                  false,

                isArchivedByStudent: {
                  $ne:
                    true
                }
              }
            },

            {
              $group: {
                _id:
                  null,

                unreadMessages: {
                  $sum:
                    "$studentUnreadCount"
                },

                openConversations: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          "$status",
                          ACTIVE_CONVERSATION_STATUSES
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

      const feeSummary =
        summarizeFeeRecords(
          feeRecords
        );

      const profileCompletion =
        getProfileCompletion(
          access.student
        );

      return response
        .status(
          200
        )
        .json({
          success:
            true,

          data: {
            student:
              serializeStudent(
                access.student
              ),

            attendance:
              attendance.summary,

            fees: {
              totalBalance:
                roundNumber(
                  feeSummary.totalBalance
                ),

              paymentStatus:
                feeSummary.totalBalance >
                0
                  ? "balance_due"
                  : "clear"
            },

            todayClasses:
              timetable.entries?.length ||
              0,

            nextClass:
              getNextClass(
                timetable.entries ||
                []
              ),

            unreadMessages:
              unread[0]?.unreadMessages ||
              0,

            openConversations:
              unread[0]?.openConversations ||
              0,

            profileCompletion,

            alerts:
              buildDashboardAlerts({
                attendance,

                fees:
                  feeSummary,

                timetable,

                profileCompletion
              })
          }
        });
    } catch (
      error
    ) {
      return handleControllerError(
        response,
        error,
        "Failed to load the student portal snapshot."
      );
    }
  };

module.exports = {
  getStudentPortalOverview,
  getStudentPortalProfile,
  getStudentPortalAttendance,
  getStudentPortalFees,
  getStudentPortalTimetable,
  getStudentPortalAcademicSummary,
  getStudentPortalSnapshot
};
