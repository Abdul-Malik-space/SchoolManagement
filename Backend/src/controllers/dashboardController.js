const mongoose = require("mongoose");

const School = require("../models/School");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const StudentAttendance = require("../models/StudentAttendance");
const FeeCollection = require("../models/FeeCollection");
const AuditLog = require("../models/AuditLog");

/*
|--------------------------------------------------------------------------
| Dashboard Configuration
|--------------------------------------------------------------------------
*/

const TIME_ZONE = "Asia/Karachi";
const ATTENDANCE_TREND_DAYS = 7;
const FEE_TREND_MONTHS = 6;

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const isSuperAdmin = (req) => {
  return req.user?.role === "super_admin";
};

const isValidObjectId = (value) => {
  return Boolean(value) && mongoose.Types.ObjectId.isValid(value);
};

const getDocumentId = (value) => {
  if (!value) {
    return null;
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const getUserSchoolId = (req) => {
  return getDocumentId(req.user?.schoolId);
};

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const roundPercentage = (value) => {
  return Math.round(safeNumber(value) * 10) / 10;
};

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

const normalizeDate = (value) => {
  let date;

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    const [year, month, day] = value.split("-").map(Number);

    date = new Date(year, month - 1, day);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
};

const getEndOfDay = (value) => {
  const date = new Date(value);

  date.setHours(23, 59, 59, 999);

  return date;
};

const formatDateKey = (value) => {
  const date = new Date(value);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
};

const formatDateLabel = (dateKey) => {
  const date = new Date(`${dateKey}T12:00:00.000Z`);

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(date);
};

const formatMonthLabel = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, 1));

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    year: "numeric"
  }).format(date);
};

const buildAttendanceDateRange = (
  selectedDate,
  days = ATTENDANCE_TREND_DAYS
) => {
  const startDate = new Date(selectedDate);

  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  const endDate = getEndOfDay(selectedDate);

  const dateKeys = [];

  for (let index = 0; index < days; index += 1) {
    const currentDate = new Date(startDate);

    currentDate.setDate(startDate.getDate() + index);

    dateKeys.push(formatDateKey(currentDate));
  }

  return {
    startDate,
    endDate,
    dateKeys
  };
};

const buildFeeMonthKeys = (
  selectedMonth,
  months = FEE_TREND_MONTHS
) => {
  const [year, month] = selectedMonth.split("-").map(Number);

  const monthKeys = [];

  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(
      Date.UTC(year, month - 1 - index, 1)
    );

    const monthKey = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0")
    ].join("-");

    monthKeys.push(monthKey);
  }

  return monthKeys;
};

/*
|--------------------------------------------------------------------------
| School Scope
|--------------------------------------------------------------------------
|
| Super Admin:
| - تمام schools کا dashboard دیکھ سکتا ہے۔
| - schoolId query کے ذریعے ایک school منتخب کر سکتا ہے۔
|
| Principal, Accountant, Teacher:
| - صرف assigned school کی information دیکھ سکتے ہیں۔
|
*/

const buildSchoolFilters = (req) => {
  let schoolId = null;

  if (isSuperAdmin(req)) {
    const requestedSchoolId = String(
      req.query.schoolId || ""
    ).trim();

    if (
      requestedSchoolId &&
      requestedSchoolId !== "all"
    ) {
      schoolId = requestedSchoolId;
    }
  } else if (req.schoolFilter?.schoolId) {
    schoolId = getDocumentId(req.schoolFilter.schoolId);
  } else {
    schoolId = getUserSchoolId(req);
  }

  if (!schoolId) {
    if (isSuperAdmin(req)) {
      return {
        selectedSchoolId: null,
        filter: {},
        aggregateMatch: {}
      };
    }

    return {
      error: "School is not assigned to this user",
      statusCode: 403
    };
  }

  if (!isValidObjectId(schoolId)) {
    return {
      error: "Invalid school ID format",
      statusCode: 400
    };
  }

  return {
    selectedSchoolId: schoolId,

    filter: {
      schoolId
    },

    aggregateMatch: {
      schoolId: new mongoose.Types.ObjectId(schoolId)
    }
  };
};

/*
|--------------------------------------------------------------------------
| Attendance Summary Formatter
|--------------------------------------------------------------------------
*/

const createAttendanceSummary = (records = []) => {
  const attendance = {
    present: 0,
    absent: 0,
    leave: 0
  };

  records.forEach((item) => {
    const status = item?._id;

    if (
      status &&
      Object.prototype.hasOwnProperty.call(attendance, status)
    ) {
      attendance[status] = safeNumber(item.count);
    }
  });

  const total =
    attendance.present +
    attendance.absent +
    attendance.leave;

  const attendanceRate =
    total > 0
      ? roundPercentage(
          (attendance.present / total) * 100
        )
      : 0;

  return {
    ...attendance,
    total,
    attendanceRate
  };
};

/*
|--------------------------------------------------------------------------
| Attendance Trend Formatter
|--------------------------------------------------------------------------
*/

const createAttendanceTrend = (
  rawTrend,
  dateKeys
) => {
  const trendMap = new Map();

  dateKeys.forEach((dateKey) => {
    trendMap.set(dateKey, {
      date: dateKey,
      label: formatDateLabel(dateKey),
      present: 0,
      absent: 0,
      leave: 0,
      total: 0,
      attendanceRate: 0
    });
  });

  rawTrend.forEach((item) => {
    const dateKey = item?._id?.date;
    const status = item?._id?.status;

    const trendItem = trendMap.get(dateKey);

    if (
      trendItem &&
      ["present", "absent", "leave"].includes(status)
    ) {
      trendItem[status] = safeNumber(item.count);
    }
  });

  return Array.from(trendMap.values()).map((item) => {
    const total =
      item.present +
      item.absent +
      item.leave;

    const attendanceRate =
      total > 0
        ? roundPercentage(
            (item.present / total) * 100
          )
        : 0;

    return {
      ...item,
      total,
      attendanceRate
    };
  });
};

/*
|--------------------------------------------------------------------------
| Fee Status Formatter
|--------------------------------------------------------------------------
*/

const createFeeStatusSummary = (records = []) => {
  const feeStatus = {
    paid: 0,
    partial: 0,
    unpaid: 0
  };

  records.forEach((item) => {
    const status = item?._id;

    if (
      status &&
      Object.prototype.hasOwnProperty.call(feeStatus, status)
    ) {
      feeStatus[status] = safeNumber(item.count);
    }
  });

  return feeStatus;
};

/*
|--------------------------------------------------------------------------
| Fee Collection Trend Formatter
|--------------------------------------------------------------------------
*/

const createFeeTrend = (
  rawTrend,
  monthKeys
) => {
  const trendMap = new Map();

  monthKeys.forEach((monthKey) => {
    trendMap.set(monthKey, {
      month: monthKey,
      label: formatMonthLabel(monthKey),
      collected: 0,
      payable: 0,
      pending: 0,
      invoices: 0,
      collectionRate: 0
    });
  });

  rawTrend.forEach((item) => {
    const monthKey = item?._id;
    const trendItem = trendMap.get(monthKey);

    if (!trendItem) {
      return;
    }

    trendItem.collected = safeNumber(item.collected);
    trendItem.payable = safeNumber(item.payable);
    trendItem.pending = safeNumber(item.pending);
    trendItem.invoices = safeNumber(item.invoices);
  });

  return Array.from(trendMap.values()).map((item) => {
    const collectionRate =
      item.payable > 0
        ? roundPercentage(
            (item.collected / item.payable) * 100
          )
        : 0;

    return {
      ...item,
      collectionRate
    };
  });
};

/*
|--------------------------------------------------------------------------
| Dashboard Summary
|--------------------------------------------------------------------------
*/

exports.getDashboardSummary = async (req, res) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | School Scope
    |--------------------------------------------------------------------------
    */

    const schoolFilters = buildSchoolFilters(req);

    if (schoolFilters.error) {
      return res
        .status(schoolFilters.statusCode || 400)
        .json({
          success: false,
          message: schoolFilters.error
        });
    }

    const {
      selectedSchoolId,
      filter,
      aggregateMatch
    } = schoolFilters;

    /*
    |--------------------------------------------------------------------------
    | Selected Fee Month
    |--------------------------------------------------------------------------
    */

    const selectedMonth =
      req.query.month ||
      new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)) {
      return res.status(400).json({
        success: false,
        message: "Invalid month format. Use YYYY-MM"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Selected Attendance Date
    |--------------------------------------------------------------------------
    */

    const selectedDate = normalizeDate(
      req.query.date || new Date()
    );

    if (!selectedDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }

    const selectedDateEnd = getEndOfDay(selectedDate);

    /*
    |--------------------------------------------------------------------------
    | Chart Ranges
    |--------------------------------------------------------------------------
    */

    const attendanceDateRange =
      buildAttendanceDateRange(selectedDate);

    const feeMonthKeys =
      buildFeeMonthKeys(selectedMonth);

    /*
    |--------------------------------------------------------------------------
    | Main Dashboard Queries
    |--------------------------------------------------------------------------
    */

    const [
      totalSchools,
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      attendanceSummaryRaw,
      attendanceTrendRaw,
      feeTotalsRaw,
      feeStatusRaw,
      feeTrendRaw,
      classDistributionRaw,
      recentAdmissions,
      recentFeeCollections,
      recentActivities
    ] = await Promise.all([
      /*
      |--------------------------------------------------------------------------
      | Total Schools
      |--------------------------------------------------------------------------
      */

      selectedSchoolId
        ? School.countDocuments({
            _id: selectedSchoolId,
            isDeleted: {
              $ne: true
            }
          })
        : School.countDocuments({
            isActive: true,
            isDeleted: {
              $ne: true
            }
          }),

      /*
      |--------------------------------------------------------------------------
      | Total Students
      |--------------------------------------------------------------------------
      */

      Student.countDocuments({
        ...filter,
        status: "active",
        isDeleted: {
          $ne: true
        }
      }),

      /*
      |--------------------------------------------------------------------------
      | Total Teachers
      |--------------------------------------------------------------------------
      */

      Teacher.countDocuments({
        ...filter,
        status: "active",
        isDeleted: {
          $ne: true
        }
      }),

      /*
      |--------------------------------------------------------------------------
      | Total Classes
      |--------------------------------------------------------------------------
      */

      Class.countDocuments({
        ...filter,
        isActive: true,
        isDeleted: {
          $ne: true
        }
      }),

      /*
      |--------------------------------------------------------------------------
      | Total Subjects
      |--------------------------------------------------------------------------
      */

      Subject.countDocuments({
        ...filter,
        isActive: true,
        isDeleted: {
          $ne: true
        }
      }),

      /*
      |--------------------------------------------------------------------------
      | Selected Date Attendance
      |--------------------------------------------------------------------------
      */

      StudentAttendance.aggregate([
        {
          $match: {
            ...aggregateMatch,

            isDeleted: {
              $ne: true
            },

            attendanceDate: {
              $gte: selectedDate,
              $lte: selectedDateEnd
            }
          }
        },
        {
          $unwind: "$records"
        },
        {
          $group: {
            _id: "$records.status",

            count: {
              $sum: 1
            }
          }
        }
      ]),

      /*
      |--------------------------------------------------------------------------
      | Last Seven Days Attendance
      |--------------------------------------------------------------------------
      */

      StudentAttendance.aggregate([
        {
          $match: {
            ...aggregateMatch,

            isDeleted: {
              $ne: true
            },

            attendanceDate: {
              $gte: attendanceDateRange.startDate,
              $lte: attendanceDateRange.endDate
            }
          }
        },
        {
          $unwind: "$records"
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$attendanceDate",
                  timezone: TIME_ZONE
                }
              },

              status: "$records.status"
            },

            count: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            "_id.date": 1
          }
        }
      ]),

      /*
      |--------------------------------------------------------------------------
      | Selected Month Fee Totals
      |--------------------------------------------------------------------------
      */

      FeeCollection.aggregate([
        {
          $match: {
            ...aggregateMatch,

            feeMonth: selectedMonth,

            isDeleted: {
              $ne: true
            }
          }
        },
        {
          $group: {
            _id: null,

            totalCollected: {
              $sum: "$paidAmount"
            },

            totalPayable: {
              $sum: "$payableAmount"
            },

            totalPending: {
              $sum: "$balanceAmount"
            },

            totalInvoices: {
              $sum: 1
            }
          }
        }
      ]),

      /*
      |--------------------------------------------------------------------------
      | Selected Month Fee Status
      |--------------------------------------------------------------------------
      */

      FeeCollection.aggregate([
        {
          $match: {
            ...aggregateMatch,

            feeMonth: selectedMonth,

            isDeleted: {
              $ne: true
            }
          }
        },
        {
          $group: {
            _id: "$paymentStatus",

            count: {
              $sum: 1
            }
          }
        }
      ]),

      /*
      |--------------------------------------------------------------------------
      | Last Six Months Fee Trend
      |--------------------------------------------------------------------------
      */

      FeeCollection.aggregate([
        {
          $match: {
            ...aggregateMatch,

            feeMonth: {
              $in: feeMonthKeys
            },

            isDeleted: {
              $ne: true
            }
          }
        },
        {
          $group: {
            _id: "$feeMonth",

            collected: {
              $sum: "$paidAmount"
            },

            payable: {
              $sum: "$payableAmount"
            },

            pending: {
              $sum: "$balanceAmount"
            },

            invoices: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            _id: 1
          }
        }
      ]),

      /*
      |--------------------------------------------------------------------------
      | Student Distribution by Class
      |--------------------------------------------------------------------------
      */

      Student.aggregate([
        {
          $match: {
            ...aggregateMatch,

            status: "active",

            isDeleted: {
              $ne: true
            }
          }
        },
        {
          $group: {
            _id: "$classId",

            students: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            students: -1
          }
        },
        {
          $limit: 10
        }
      ]),

      /*
      |--------------------------------------------------------------------------
      | Recent Admissions
      |--------------------------------------------------------------------------
      */

      Student.find({
        ...filter,

        isDeleted: {
          $ne: true
        }
      })
        .populate("classId", "className")
        .sort({
          createdAt: -1
        })
        .limit(5)
        .select(
          [
            "name",
            "fatherName",
            "admissionNumber",
            "sectionName",
            "createdAt",
            "classId",
            "status"
          ].join(" ")
        )
        .lean(),

      /*
      |--------------------------------------------------------------------------
      | Recent Fee Collections
      |--------------------------------------------------------------------------
      */

      FeeCollection.find({
        ...filter,

        isDeleted: {
          $ne: true
        }
      })
        .populate(
          "studentId",
          "name admissionNumber"
        )
        .populate(
          "classId",
          "className"
        )
        .sort({
          updatedAt: -1
        })
        .limit(5)
        .select(
          [
            "invoiceNumber",
            "studentId",
            "classId",
            "feeMonth",
            "payableAmount",
            "paidAmount",
            "balanceAmount",
            "paymentStatus",
            "updatedAt"
          ].join(" ")
        )
        .lean(),

      /*
      |--------------------------------------------------------------------------
      | Recent System Activities
      |--------------------------------------------------------------------------
      */

      AuditLog.find({
        ...filter,

        isDeleted: {
          $ne: true
        }
      })
        .populate(
          "userId",
          "name email role"
        )
        .populate(
          "schoolId",
          "schoolName"
        )
        .sort({
          createdAt: -1
        })
        .limit(6)
        .select(
          [
            "userId",
            "userName",
            "userRole",
            "action",
            "module",
            "description",
            "status",
            "schoolId",
            "createdAt"
          ].join(" ")
        )
        .lean()
    ]);

    /*
    |--------------------------------------------------------------------------
    | Attendance Data
    |--------------------------------------------------------------------------
    */

    const todayAttendance =
      createAttendanceSummary(attendanceSummaryRaw);

    const attendanceTrend =
      createAttendanceTrend(
        attendanceTrendRaw,
        attendanceDateRange.dateKeys
      );

    /*
    |--------------------------------------------------------------------------
    | Fee Data
    |--------------------------------------------------------------------------
    */

    const feeTotals = feeTotalsRaw[0] || {
      totalCollected: 0,
      totalPayable: 0,
      totalPending: 0,
      totalInvoices: 0
    };

    const monthlyRevenue = safeNumber(
      feeTotals.totalCollected
    );

    const monthlyPayable = safeNumber(
      feeTotals.totalPayable
    );

    const pendingFees = safeNumber(
      feeTotals.totalPending
    );

    const totalFeeInvoices = safeNumber(
      feeTotals.totalInvoices
    );

    const collectionRate =
      monthlyPayable > 0
        ? roundPercentage(
            (monthlyRevenue / monthlyPayable) * 100
          )
        : 0;

    const feeStatus =
      createFeeStatusSummary(feeStatusRaw);

    const feeCollectionTrend =
      createFeeTrend(
        feeTrendRaw,
        feeMonthKeys
      );

    /*
    |--------------------------------------------------------------------------
    | Class Distribution
    |--------------------------------------------------------------------------
    */

    const classIds = classDistributionRaw
      .map((item) => item._id)
      .filter(Boolean);

    const classDocuments =
      classIds.length > 0
        ? await Class.find({
            _id: {
              $in: classIds
            }
          })
            .select("className")
            .lean()
        : [];

    const classNameMap = new Map(
      classDocuments.map((classDocument) => [
        classDocument._id.toString(),
        classDocument.className
      ])
    );

    const studentDistributionByClass =
      classDistributionRaw.map((item) => {
        const classId = item._id
          ? item._id.toString()
          : null;

        return {
          classId,
          className: classId
            ? classNameMap.get(classId) ||
              "Unknown Class"
            : "Unassigned",

          students: safeNumber(item.students)
        };
      });

    /*
    |--------------------------------------------------------------------------
    | Dashboard Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message: "Dashboard summary fetched successfully",

      summary: {
        /*
        |--------------------------------------------------------------------------
        | Main Cards
        |--------------------------------------------------------------------------
        */

        totalSchools,
        totalStudents,
        totalTeachers,
        totalClasses,
        totalSubjects,

        /*
        |--------------------------------------------------------------------------
        | Attendance Cards
        |--------------------------------------------------------------------------
        */

        attendanceDate: selectedDate,
        todayAttendance,

        /*
        |--------------------------------------------------------------------------
        | Fee Cards
        |--------------------------------------------------------------------------
        */

        feeMonth: selectedMonth,
        monthlyRevenue,
        monthlyPayable,
        pendingFees,
        totalFeeInvoices,
        collectionRate,
        feeStatus,

        /*
        |--------------------------------------------------------------------------
        | Recent Records
        |--------------------------------------------------------------------------
        */

        recentAdmissions,
        recentFeeCollections,
        recentActivities,

        /*
        |--------------------------------------------------------------------------
        | Professional Charts
        |--------------------------------------------------------------------------
        */

        charts: {
          attendanceTrend,
          feeCollectionTrend,
          studentDistributionByClass
        }
      }
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary",
      error: error.message
    });
  }
};