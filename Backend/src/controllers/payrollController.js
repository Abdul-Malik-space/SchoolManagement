const mongoose = require(
  "mongoose"
);

const Payroll = require(
  "../models/Payroll"
);

const StaffSalaryStructure = require(
  "../models/StaffSalaryStructure"
);

const StaffAttendance = require(
  "../models/StaffAttendance"
);

const Staff = require(
  "../models/Staff"
);

const School = require(
  "../models/School"
);

const {
  createAuditLog
} = require(
  "../utils/auditLogHelper"
);

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const hasOwn = (
  object,
  key
) => {
  return Object.prototype.hasOwnProperty.call(
    object || {},
    key
  );
};

const safeNumber = (
  value
) => {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return number;
};

const nonNegativeNumber = (
  value
) => {
  return Math.max(
    0,
    safeNumber(value)
  );
};

const roundMoney = (
  value
) => {
  return Number(
    safeNumber(value).toFixed(
      2
    )
  );
};

const parsePositiveInteger = (
  value,
  fallback
) => {
  const parsedValue =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(
      parsedValue
    ) ||
    parsedValue <= 0
  ) {
    return fallback;
  }

  return parsedValue;
};

const parseBoolean = (
  value
) => {
  return (
    value === true ||
    String(value).toLowerCase() ===
      "true"
  );
};

const escapeRegex = (
  value
) => {
  return String(value || "")
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
};

const isValidObjectId = (
  value
) => {
  return mongoose.Types.ObjectId
    .isValid(value);
};

const toObjectId = (
  value
) => {
  if (!value) {
    return null;
  }

  if (
    value instanceof
    mongoose.Types.ObjectId
  ) {
    return value;
  }

  if (
    !isValidObjectId(value)
  ) {
    return null;
  }

  return new mongoose.Types.ObjectId(
    value
  );
};

const getCurrentUserId = (
  req
) => {
  return (
    req.user?._id ||
    req.user?.id ||
    null
  );
};

const getUserRole = (
  req
) => {
  return String(
    req.user?.role || ""
  ).toLowerCase();
};

const isSuperAdmin = (
  req
) => {
  return (
    getUserRole(req) ===
    "super_admin"
  );
};

const getAssignedSchoolId = (
  req
) => {
  return (
    req.schoolFilter
      ?.schoolId ||
    req.user?.schoolId?._id ||
    req.user?.schoolId ||
    req.user?.school?._id ||
    req.user?.school ||
    null
  );
};

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

const getPaginationOptions = (
  query = {}
) => {
  const page =
    parsePositiveInteger(
      query.page,
      1
    );

  const requestedLimit =
    parsePositiveInteger(
      query.limit,
      15
    );

  const limit =
    Math.min(
      requestedLimit,
      100
    );

  return {
    page,
    limit,
    skip:
      (page - 1) *
      limit
  };
};

const buildPagination = ({
  total,
  page,
  limit
}) => {
  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total / limit
      )
    );

  return {
    total,
    page,
    currentPage: page,
    limit,
    totalPages,

    hasNextPage:
      page < totalPages,

    hasPreviousPage:
      page > 1
  };
};

/*
|--------------------------------------------------------------------------
| School Scope
|--------------------------------------------------------------------------
*/

const resolveSchoolId = ({
  req,
  requestedSchoolId,
  required = false
}) => {
  if (isSuperAdmin(req)) {
    if (requestedSchoolId) {
      if (
        !isValidObjectId(
          requestedSchoolId
        )
      ) {
        return {
          error:
            "School identifier is invalid."
        };
      }

      return {
        schoolId:
          requestedSchoolId
      };
    }

    if (required) {
      return {
        error:
          "School is required."
      };
    }

    return {
      schoolId: null
    };
  }

  const assignedSchoolId =
    getAssignedSchoolId(req);

  if (!assignedSchoolId) {
    return {
      error:
        "No school is assigned to this user."
    };
  }

  return {
    schoolId:
      assignedSchoolId
  };
};

const buildSchoolFilter = (
  req,
  requestedSchoolId
) => {
  const resolved =
    resolveSchoolId({
      req,
      requestedSchoolId,
      required: false
    });

  if (resolved.error) {
    return {
      error:
        resolved.error
    };
  }

  if (
    resolved.schoolId
  ) {
    return {
      filter: {
        schoolId:
          toObjectId(
            resolved.schoolId
          ) ||
          resolved.schoolId
      }
    };
  }

  return {
    filter: {}
  };
};

/*
|--------------------------------------------------------------------------
| School and Staff Verification
|--------------------------------------------------------------------------
*/

const verifySchool = async (
  schoolId,
  {
    requireActive = false
  } = {}
) => {
  if (
    !schoolId ||
    !isValidObjectId(
      schoolId
    )
  ) {
    return {
      error:
        "A valid school is required."
    };
  }

  const school =
    await School.findById(
      schoolId
    );

  if (!school) {
    return {
      error:
        "School was not found."
    };
  }

  if (
    requireActive &&
    school.isActive === false
  ) {
    return {
      error:
        "Payroll cannot be generated for an inactive school."
    };
  }

  return {
    school
  };
};

const verifyStaff = async ({
  staffId,
  schoolId,
  allowInactive = true
}) => {
  if (
    !staffId ||
    !isValidObjectId(
      staffId
    )
  ) {
    return {
      error:
        "Staff identifier is invalid."
    };
  }

  const staff =
    await Staff.findOne({
      _id: staffId,
      schoolId,
      isDeleted: false
    });

  if (!staff) {
    return {
      error:
        "Staff member was not found in the selected school."
    };
  }

  if (
    !allowInactive &&
    ![
      "active",
      "on_leave"
    ].includes(
      staff.status
    )
  ) {
    return {
      error:
        "Payroll can only be generated for active or on-leave staff."
    };
  }

  return {
    staff
  };
};

/*
|--------------------------------------------------------------------------
| Payroll Period Helpers
|--------------------------------------------------------------------------
*/

const getPayrollPeriod = (
  yearValue,
  monthValue
) => {
  const payrollYear =
    Number.parseInt(
      yearValue,
      10
    );

  const payrollMonth =
    Number.parseInt(
      monthValue,
      10
    );

  if (
    !Number.isInteger(
      payrollYear
    ) ||
    payrollYear < 2000 ||
    payrollYear > 2100
  ) {
    return {
      error:
        "Payroll year must be between 2000 and 2100."
    };
  }

  if (
    !Number.isInteger(
      payrollMonth
    ) ||
    payrollMonth < 1 ||
    payrollMonth > 12
  ) {
    return {
      error:
        "Payroll month must be between 1 and 12."
    };
  }

  const periodStart =
    new Date(
      Date.UTC(
        payrollYear,
        payrollMonth - 1,
        1
      )
    );

  const periodEnd =
    new Date(
      Date.UTC(
        payrollYear,
        payrollMonth,
        0
      )
    );

  return {
    payrollYear,
    payrollMonth,
    periodStart,
    periodEnd
  };
};

const countCalendarWorkingDays = (
  periodStart,
  periodEnd
) => {
  let workingDays = 0;

  const currentDate =
    new Date(periodStart);

  while (
    currentDate <= periodEnd
  ) {
    /*
    |--------------------------------------------------------------------------
    | Sunday is treated as the weekly holiday
    |--------------------------------------------------------------------------
    */

    if (
      currentDate.getUTCDay() !==
      0
    ) {
      workingDays += 1;
    }

    currentDate.setUTCDate(
      currentDate.getUTCDate() +
        1
    );
  }

  return workingDays;
};

/*
|--------------------------------------------------------------------------
| Data Normalizers
|--------------------------------------------------------------------------
*/

const normalizeManualEarnings = (
  items
) => {
  if (
    !Array.isArray(items)
  ) {
    return [];
  }

  const allowedCategories = [
    "bonus",
    "arrears",
    "reimbursement",
    "incentive",
    "adjustment",
    "other"
  ];

  return items
    .map((item) => ({
      name:
        String(
          item?.name || ""
        ).trim(),

      category:
        allowedCategories.includes(
          item?.category
        )
          ? item.category
          : "other",

      amount:
        nonNegativeNumber(
          item?.amount
        ),

      isTaxable:
        Boolean(
          item?.isTaxable
        ),

      notes:
        String(
          item?.notes || ""
        ).trim()
    }))
    .filter(
      (item) =>
        item.name
    );
};

const normalizeManualDeductions = (
  items
) => {
  if (
    !Array.isArray(items)
  ) {
    return [];
  }

  const allowedCategories = [
    "penalty",
    "loan",
    "advance",
    "tax",
    "adjustment",
    "other"
  ];

  return items
    .map((item) => ({
      name:
        String(
          item?.name || ""
        ).trim(),

      category:
        allowedCategories.includes(
          item?.category
        )
          ? item.category
          : "other",

      amount:
        nonNegativeNumber(
          item?.amount
        ),

      notes:
        String(
          item?.notes || ""
        ).trim()
    }))
    .filter(
      (item) =>
        item.name
    );
};

const normalizeSalaryAllowances = (
  allowances = {}
) => {
  const other =
    Array.isArray(
      allowances.other
    )
      ? allowances.other
          .map((item) => ({
            name:
              String(
                item?.name ||
                  ""
              ).trim(),

            category: "other",

            amount:
              nonNegativeNumber(
                item?.amount
              ),

            isTaxable:
              Boolean(
                item?.isTaxable
              ),

            notes: ""
          }))
          .filter(
            (item) =>
              item.name
          )
      : [];

  return {
    houseRent:
      nonNegativeNumber(
        allowances.houseRent
      ),

    medical:
      nonNegativeNumber(
        allowances.medical
      ),

    transport:
      nonNegativeNumber(
        allowances.transport
      ),

    food:
      nonNegativeNumber(
        allowances.food
      ),

    communication:
      nonNegativeNumber(
        allowances.communication
      ),

    special:
      nonNegativeNumber(
        allowances.special
      ),

    other
  };
};

const calculateSalaryStructureDeductions = (
  structure
) => {
  const deductions =
    structure?.deductions || {};

  const basicSalary =
    nonNegativeNumber(
      structure?.basicSalary
    );

  const allowances =
    normalizeSalaryAllowances(
      structure?.allowances
    );

  const totalAllowances =
    allowances.houseRent +
    allowances.medical +
    allowances.transport +
    allowances.food +
    allowances.communication +
    allowances.special +
    allowances.other.reduce(
      (
        total,
        item
      ) =>
        total +
        item.amount,
      0
    );

  const grossSalary =
    basicSalary +
    totalAllowances;

  const other =
    Array.isArray(
      deductions.other
    )
      ? deductions.other
          .map((item) => {
            const deductionType =
              item?.deductionType ===
              "percentage"
                ? "percentage"
                : "fixed";

            const percentageOf =
              item?.percentageOf ===
              "gross_salary"
                ? "gross_salary"
                : "basic_salary";

            let amount =
              nonNegativeNumber(
                item?.amount
              );

            if (
              deductionType ===
              "percentage"
            ) {
              const baseAmount =
                percentageOf ===
                "gross_salary"
                  ? grossSalary
                  : basicSalary;

              amount =
                (
                  baseAmount *
                  amount
                ) /
                100;
            }

            return {
              name:
                String(
                  item?.name ||
                    ""
                ).trim(),

              category:
                item?.name
                  ?.toLowerCase()
                  ?.includes("tax")
                  ? "tax"
                  : "other",

              amount:
                roundMoney(
                  amount
                ),

              notes:
                deductionType ===
                "percentage"
                  ? `${item.amount}% of ${percentageOf.replaceAll(
                      "_",
                      " "
                    )}`
                  : ""
            };
          })
          .filter(
            (item) =>
              item.name
          )
      : [];

  return {
    providentFund:
      nonNegativeNumber(
        deductions.providentFund
      ),

    tax:
      nonNegativeNumber(
        deductions.tax
      ),

    insurance:
      nonNegativeNumber(
        deductions.insurance
      ),

    loanInstallment:
      nonNegativeNumber(
        deductions.loanInstallment
      ),

    other
  };
};

/*
|--------------------------------------------------------------------------
| Masking Helpers
|--------------------------------------------------------------------------
*/

const maskSensitiveValue = (
  value,
  visibleCharacters = 4
) => {
  const stringValue =
    String(value || "").trim();

  if (!stringValue) {
    return "";
  }

  if (
    stringValue.length <=
    visibleCharacters
  ) {
    return "*".repeat(
      stringValue.length
    );
  }

  return (
    "*".repeat(
      stringValue.length -
        visibleCharacters
    ) +
    stringValue.slice(
      -visibleCharacters
    )
  );
};

const buildInitialPaymentDetails = (
  salaryStructure
) => {
  const bankDetails =
    salaryStructure
      ?.bankDetails || {};

  return {
    paymentMethod:
      salaryStructure
        ?.paymentMethod ||
      "cash",

    paymentDate: null,

    transactionReference:
      "",

    bankName:
      String(
        bankDetails.bankName ||
          ""
      ).trim(),

    accountTitle:
      String(
        bankDetails
          .accountTitle || ""
      ).trim(),

    maskedAccountNumber:
      maskSensitiveValue(
        bankDetails
          .accountNumber ||
        bankDetails.iban
      ),

    chequeNumber: "",

    walletProvider:
      String(
        bankDetails
          .walletProvider ||
          ""
      ).trim(),

    maskedWalletNumber:
      maskSensitiveValue(
        bankDetails
          .walletNumber
      ),

    paymentNotes: ""
  };
};

/*
|--------------------------------------------------------------------------
| Payroll Number Helpers
|--------------------------------------------------------------------------
*/

const sanitizeCode = (
  value,
  fallback
) => {
  const sanitized =
    String(value || "")
      .toUpperCase()
      .replace(
        /[^A-Z0-9]/g,
        ""
      )
      .slice(0, 14);

  return (
    sanitized ||
    fallback
  );
};

const buildPayrollNumbers = ({
  staff,
  payrollYear,
  payrollMonth
}) => {
  const periodCode =
    `${payrollYear}${String(
      payrollMonth
    ).padStart(2, "0")}`;

  const shortStaffId =
    String(
      staff?._id || ""
    )
      .slice(-6)
      .toUpperCase();

  const employeeCode =
    sanitizeCode(
      staff?.employeeId,
      shortStaffId ||
        "STAFF"
    );

  return {
    payrollNumber:
      `PAY-${periodCode}-${employeeCode}-${shortStaffId}`,

    payslipNumber:
      `PSL-${periodCode}-${employeeCode}-${shortStaffId}`
  };
};

/*
|--------------------------------------------------------------------------
| Attendance Calculation
|--------------------------------------------------------------------------
*/

const calculateAttendanceSummary = ({
  salaryStructure,
  attendanceRecords,
  periodStart,
  periodEnd
}) => {
  const records =
    Array.isArray(
      attendanceRecords
    )
      ? attendanceRecords
      : [];

  const paidLeaveTypes =
    new Set(
      salaryStructure
        ?.attendanceRules
        ?.paidLeaveTypes || []
    );

  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  let leaveDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let halfDays = 0;

  let totalLateMinutes = 0;
  let totalOvertimeMinutes = 0;
  let totalWorkingMinutes = 0;

  let chargeableLateMinutes = 0;
  let chargeableLateOccurrences =
    0;

  const graceMinutes =
    nonNegativeNumber(
      salaryStructure
        ?.lateRules
        ?.graceMinutes
    );

  const minimumOvertimeMinutes =
    nonNegativeNumber(
      salaryStructure
        ?.overtimeRules
        ?.minimumMinutes
    );

  records.forEach(
    (record) => {
      const status =
        record.status;

      if (
        status === "present"
      ) {
        presentDays += 1;
      }

      if (
        status === "absent"
      ) {
        absentDays += 1;
      }

      if (
        status === "late"
      ) {
        lateDays += 1;

        const lateMinutes =
          nonNegativeNumber(
            record.lateMinutes
          );

        totalLateMinutes +=
          lateMinutes;

        const adjustedMinutes =
          Math.max(
            0,
            lateMinutes -
              graceMinutes
          );

        if (
          adjustedMinutes > 0
        ) {
          chargeableLateMinutes +=
            adjustedMinutes;

          chargeableLateOccurrences +=
            1;
        }
      }

      if (
        status === "leave"
      ) {
        leaveDays += 1;

        if (
          record.leaveType !==
            "unpaid" &&
          paidLeaveTypes.has(
            record.leaveType
          )
        ) {
          paidLeaveDays += 1;
        } else {
          unpaidLeaveDays +=
            1;
        }
      }

      if (
        status === "half_day"
      ) {
        halfDays += 1;
      }

      const overtimeMinutes =
        nonNegativeNumber(
          record.overtimeMinutes
        );

      if (
        overtimeMinutes >=
        minimumOvertimeMinutes
      ) {
        totalOvertimeMinutes +=
          overtimeMinutes;
      }

      totalWorkingMinutes +=
        nonNegativeNumber(
          record.workingMinutes
        );
    }
  );

  const recordedAttendanceDays =
    records.length;

  let standardWorkingDays = 0;

  const workingDaysMethod =
    salaryStructure
      ?.workingDaysMethod ||
    "fixed_working_days";

  if (
    workingDaysMethod ===
    "recorded_attendance_days"
  ) {
    standardWorkingDays =
      recordedAttendanceDays;
  } else if (
    workingDaysMethod ===
    "calendar_working_days"
  ) {
    standardWorkingDays =
      countCalendarWorkingDays(
        periodStart,
        periodEnd
      );
  } else {
    standardWorkingDays =
      Math.max(
        1,
        nonNegativeNumber(
          salaryStructure
            ?.fixedWorkingDays ||
            26
        )
      );
  }

  const maximumMonthlyMinutes =
    nonNegativeNumber(
      salaryStructure
        ?.overtimeRules
        ?.maximumMonthlyMinutes
    );

  if (
    maximumMonthlyMinutes >
      0
  ) {
    totalOvertimeMinutes =
      Math.min(
        totalOvertimeMinutes,
        maximumMonthlyMinutes
      );
  }

  const payableDays =
    presentDays +
    lateDays +
    paidLeaveDays +
    halfDays * 0.5;

  const unmarkedDays =
    Math.max(
      0,
      standardWorkingDays -
        recordedAttendanceDays
    );

  return {
    summary: {
      workingDaysMethod,
      standardWorkingDays:
        roundMoney(
          standardWorkingDays
        ),

      recordedAttendanceDays:
        roundMoney(
          recordedAttendanceDays
        ),

      presentDays,
      absentDays,
      lateDays,
      leaveDays,
      paidLeaveDays,
      unpaidLeaveDays,
      halfDays,

      payableDays:
        roundMoney(
          payableDays
        ),

      unmarkedDays:
        roundMoney(
          unmarkedDays
        ),

      totalLateMinutes:
        roundMoney(
          totalLateMinutes
        ),

      totalOvertimeMinutes:
        roundMoney(
          totalOvertimeMinutes
        ),

      totalWorkingMinutes:
        roundMoney(
          totalWorkingMinutes
        )
    },

    chargeableLateMinutes:
      roundMoney(
        chargeableLateMinutes
      ),

    chargeableLateOccurrences
  };
};

/*
|--------------------------------------------------------------------------
| Salary Rates
|--------------------------------------------------------------------------
*/

const calculateSalaryRates = ({
  salaryStructure,
  grossSalary
}) => {
  const basicSalary =
    nonNegativeNumber(
      salaryStructure
        ?.basicSalary
  );

  const fixedWorkingDays =
    Math.max(
      1,
      nonNegativeNumber(
        salaryStructure
          ?.fixedWorkingDays ||
          26
      )
    );

  const dailyRateBasis =
    salaryStructure
      ?.dailyRateBasis ===
    "gross_salary"
      ? "gross_salary"
      : "basic_salary";

  const rateBase =
    dailyRateBasis ===
    "gross_salary"
      ? grossSalary
      : basicSalary;

  const dailyRate =
    rateBase /
    fixedWorkingDays;

  const hourlyRate =
    dailyRate / 8;

  let overtimeHourlyRate = 0;

  const overtimeRules =
    salaryStructure
      ?.overtimeRules || {};

  if (overtimeRules.enabled) {
    if (
      overtimeRules
        .rateMethod ===
      "fixed_per_hour"
    ) {
      overtimeHourlyRate =
        nonNegativeNumber(
          overtimeRules
            .fixedHourlyRate
        );
    } else if (
      overtimeRules
        .rateMethod ===
      "hourly_rate"
    ) {
      overtimeHourlyRate =
        hourlyRate;
    } else {
      overtimeHourlyRate =
        hourlyRate *
        nonNegativeNumber(
          overtimeRules
            .multiplier ||
            1.5
        );
    }
  }

  let latePerMinuteRate = 0;

  const lateRules =
    salaryStructure
      ?.lateRules || {};

  if (
    lateRules.enabled &&
    lateRules.deductionMethod ===
      "per_minute"
  ) {
    latePerMinuteRate =
      nonNegativeNumber(
        lateRules
          .deductionRate
      );
  }

  return {
    dailyRateBasis,

    dailyRate:
      roundMoney(
        dailyRate
      ),

    hourlyRate:
      roundMoney(
        hourlyRate
      ),

    overtimeHourlyRate:
      roundMoney(
        overtimeHourlyRate
      ),

    latePerMinuteRate:
      roundMoney(
        latePerMinuteRate
      )
  };
};

/*
|--------------------------------------------------------------------------
| Attendance Deductions
|--------------------------------------------------------------------------
*/

const calculateAttendanceDeductions = ({
  salaryStructure,
  attendanceCalculation,
  salaryRates
}) => {
  const summary =
    attendanceCalculation.summary;

  const attendanceRules =
    salaryStructure
      ?.attendanceRules || {};

  const calculationBasis =
    salaryStructure
      ?.calculationBasis ||
    "attendance_based";

  if (
    calculationBasis ===
    "fixed_monthly"
  ) {
    return {
      absenceDeduction: 0,
      unpaidLeaveDeduction: 0,
      halfDayDeduction: 0,
      lateDeduction: 0
    };
  }

  const dailyRate =
    salaryRates.dailyRate;

  const absenceDeduction =
    attendanceRules
      .absenceDeductionEnabled
      ? summary.absentDays *
        dailyRate
      : 0;

  const unpaidLeaveDeduction =
    attendanceRules
      .unpaidLeaveDeductionEnabled
      ? summary.unpaidLeaveDays *
        dailyRate
      : 0;

  const halfDayDeduction =
    attendanceRules
      .halfDayDeductionEnabled
      ? summary.halfDays *
        dailyRate *
        0.5
      : 0;

  let lateDeduction = 0;

  const lateRules =
    salaryStructure
      ?.lateRules || {};

  if (lateRules.enabled) {
    const deductionMethod =
      lateRules.deductionMethod;

    const deductionRate =
      nonNegativeNumber(
        lateRules
          .deductionRate
      );

    if (
      deductionMethod ===
      "per_minute"
    ) {
      lateDeduction =
        attendanceCalculation
          .chargeableLateMinutes *
        deductionRate;
    } else if (
      deductionMethod ===
      "per_hour"
    ) {
      lateDeduction =
        (
          attendanceCalculation
            .chargeableLateMinutes /
          60
        ) *
        deductionRate;
    } else if (
      deductionMethod ===
      "fixed_amount"
    ) {
      lateDeduction =
        attendanceCalculation
          .chargeableLateOccurrences *
        deductionRate;
    } else if (
      deductionMethod ===
      "half_day"
    ) {
      lateDeduction =
        attendanceCalculation
          .chargeableLateOccurrences *
        dailyRate *
        0.5;
    }
  }

  return {
    absenceDeduction:
      roundMoney(
        absenceDeduction
      ),

    unpaidLeaveDeduction:
      roundMoney(
        unpaidLeaveDeduction
      ),

    halfDayDeduction:
      roundMoney(
        halfDayDeduction
      ),

    lateDeduction:
      roundMoney(
        lateDeduction
      )
  };
};

/*
|--------------------------------------------------------------------------
| Overtime Pay
|--------------------------------------------------------------------------
*/

const calculateOvertimePay = ({
  salaryStructure,
  attendanceSummary,
  salaryRates
}) => {
  if (
    !salaryStructure
      ?.overtimeRules
      ?.enabled
  ) {
    return 0;
  }

  return roundMoney(
    (
      nonNegativeNumber(
        attendanceSummary
          .totalOvertimeMinutes
      ) /
      60
    ) *
    nonNegativeNumber(
      salaryRates
        .overtimeHourlyRate
    )
  );
};

/*
|--------------------------------------------------------------------------
| Salary Structure Snapshot
|--------------------------------------------------------------------------
*/

const buildSalaryStructureSnapshot = (
  salaryStructure
) => {
  const allowances =
    normalizeSalaryAllowances(
      salaryStructure
        ?.allowances
    );

  const totalAllowances =
    allowances.houseRent +
    allowances.medical +
    allowances.transport +
    allowances.food +
    allowances.communication +
    allowances.special +
    allowances.other.reduce(
      (
        total,
        item
      ) =>
        total +
        item.amount,
      0
    );

  const basicSalary =
    nonNegativeNumber(
      salaryStructure
        ?.basicSalary
    );

  const grossSalary =
    basicSalary +
    totalAllowances;

  const deductions =
    calculateSalaryStructureDeductions(
      salaryStructure
    );

  const fixedDeductionsTotal =
    deductions.providentFund +
    deductions.tax +
    deductions.insurance +
    deductions.loanInstallment +
    deductions.other.reduce(
      (
        total,
        item
      ) =>
        total +
        item.amount,
      0
    );

  return {
    basicSalary:
      roundMoney(
        basicSalary
      ),

    fixedAllowancesTotal:
      roundMoney(
        totalAllowances
      ),

    fixedDeductionsTotal:
      roundMoney(
        fixedDeductionsTotal
      ),

    grossSalary:
      roundMoney(
        grossSalary
      ),

    estimatedNetSalary:
      roundMoney(
        Math.max(
          0,
          grossSalary -
            fixedDeductionsTotal
        )
      ),

    calculationBasis:
      salaryStructure
        ?.calculationBasis ||
      "attendance_based",

    workingDaysMethod:
      salaryStructure
        ?.workingDaysMethod ||
      "fixed_working_days",

    fixedWorkingDays:
      Math.max(
        1,
        nonNegativeNumber(
          salaryStructure
            ?.fixedWorkingDays ||
            26
        )
      ),

    dailyRateBasis:
      salaryStructure
        ?.dailyRateBasis ||
      "basic_salary",

    attendanceRules: {
      absenceDeductionEnabled:
        salaryStructure
          ?.attendanceRules
          ?.absenceDeductionEnabled !==
        false,

      unpaidLeaveDeductionEnabled:
        salaryStructure
          ?.attendanceRules
          ?.unpaidLeaveDeductionEnabled !==
        false,

      halfDayDeductionEnabled:
        salaryStructure
          ?.attendanceRules
          ?.halfDayDeductionEnabled !==
        false,

      paidLeaveTypes: [
        ...(
          salaryStructure
            ?.attendanceRules
            ?.paidLeaveTypes ||
          []
        )
      ]
    },

    lateRules: {
      enabled:
        Boolean(
          salaryStructure
            ?.lateRules
            ?.enabled
        ),

      graceMinutes:
        nonNegativeNumber(
          salaryStructure
            ?.lateRules
            ?.graceMinutes
        ),

      deductionMethod:
        salaryStructure
          ?.lateRules
          ?.deductionMethod ||
        "none",

      deductionRate:
        nonNegativeNumber(
          salaryStructure
            ?.lateRules
            ?.deductionRate
        )
    },

    overtimeRules: {
      enabled:
        Boolean(
          salaryStructure
            ?.overtimeRules
            ?.enabled
        ),

      rateMethod:
        salaryStructure
          ?.overtimeRules
          ?.rateMethod ||
        "salary_multiplier",

      multiplier:
        nonNegativeNumber(
          salaryStructure
            ?.overtimeRules
            ?.multiplier ||
            1.5
        ),

      fixedHourlyRate:
        nonNegativeNumber(
          salaryStructure
            ?.overtimeRules
            ?.fixedHourlyRate
        ),

      minimumMinutes:
        nonNegativeNumber(
          salaryStructure
            ?.overtimeRules
            ?.minimumMinutes
        ),

      maximumMonthlyMinutes:
        nonNegativeNumber(
          salaryStructure
            ?.overtimeRules
            ?.maximumMonthlyMinutes
        )
    }
  };
};

/*
|--------------------------------------------------------------------------
| Build Complete Payroll Calculation
|--------------------------------------------------------------------------
*/

const buildPayrollCalculation = ({
  salaryStructure,
  staff,
  attendanceRecords,
  periodStart,
  periodEnd,
  existingPayroll = null
}) => {
  const allowances =
    normalizeSalaryAllowances(
      salaryStructure
        ?.allowances
    );

  const basicSalary =
    nonNegativeNumber(
      salaryStructure
        ?.basicSalary
    );

  const totalAllowances =
    allowances.houseRent +
    allowances.medical +
    allowances.transport +
    allowances.food +
    allowances.communication +
    allowances.special +
    allowances.other.reduce(
      (
        total,
        item
      ) =>
        total +
        item.amount,
      0
    );

  const fixedGrossSalary =
    basicSalary +
    totalAllowances;

  const salaryRates =
    calculateSalaryRates({
      salaryStructure,
      grossSalary:
        fixedGrossSalary
    });

  const attendanceCalculation =
    calculateAttendanceSummary({
      salaryStructure,
      attendanceRecords,
      periodStart,
      periodEnd
    });

  const attendanceDeductions =
    calculateAttendanceDeductions({
      salaryStructure,
      attendanceCalculation,
      salaryRates
    });

  const overtimePay =
    calculateOvertimePay({
      salaryStructure,

      attendanceSummary:
        attendanceCalculation
          .summary,

      salaryRates
    });

  const fixedDeductions =
    calculateSalaryStructureDeductions(
      salaryStructure
    );

  const existingEarnings =
    existingPayroll?.earnings ||
    {};

  const existingDeductions =
    existingPayroll?.deductions ||
    {};

  const earnings = {
    basicSalary:
      roundMoney(
        basicSalary
      ),

    allowances,

    overtimePay,

    bonus:
      nonNegativeNumber(
        existingEarnings.bonus
      ),

    arrears:
      nonNegativeNumber(
        existingEarnings.arrears
      ),

    reimbursements:
      nonNegativeNumber(
        existingEarnings
          .reimbursements
      ),

    incentives:
      nonNegativeNumber(
        existingEarnings
          .incentives
      ),

    other:
      normalizeManualEarnings(
        existingEarnings.other
      )
  };

  const deductions = {
    ...attendanceDeductions,

    providentFund:
      roundMoney(
        fixedDeductions
          .providentFund
      ),

    tax:
      roundMoney(
        fixedDeductions.tax
      ),

    insurance:
      roundMoney(
        fixedDeductions
          .insurance
      ),

    loanInstallment:
      roundMoney(
        fixedDeductions
          .loanInstallment
      ),

    salaryAdvance:
      nonNegativeNumber(
        existingDeductions
          .salaryAdvance
      ),

    other: [
      ...fixedDeductions.other,
      ...normalizeManualDeductions(
        existingDeductions.other
      ).filter(
        (item) =>
          !fixedDeductions.other.some(
            (fixedItem) =>
              fixedItem.name ===
                item.name &&
              fixedItem.amount ===
                item.amount
          )
      )
    ]
  };

  const warnings = [];

  if (
    attendanceCalculation
      .summary
      .recordedAttendanceDays ===
    0
  ) {
    warnings.push(
      "No attendance records were found for this payroll period."
    );
  }

  if (
    attendanceCalculation
      .summary
      .unmarkedDays >
    0
  ) {
    warnings.push(
      `${attendanceCalculation.summary.unmarkedDays} working day(s) have no attendance record.`
    );
  }

  if (
    salaryStructure
      ?.calculationBasis ===
      "attendance_based" &&
    attendanceCalculation
      .summary
      .standardWorkingDays ===
      0
  ) {
    warnings.push(
      "Standard working days are zero, so attendance deductions may be incomplete."
    );
  }

  return {
    salaryStructureSnapshot:
      buildSalaryStructureSnapshot(
        salaryStructure
      ),

    attendanceSummary:
      attendanceCalculation
        .summary,

    salaryRates,
    earnings,
    deductions,

    currency:
      salaryStructure
        ?.currency ||
      "PKR",

    paymentDetails:
      buildInitialPaymentDetails(
        salaryStructure
      ),

    staffSnapshots: {
      employeeIdSnapshot:
        staff?.employeeId ||
        "",

      staffNameSnapshot:
        staff?.name || "",

      departmentSnapshot:
        staff?.department ||
        "",

      designationSnapshot:
        staff?.designation ||
        "",

      categorySnapshot:
        staff?.category ||
        ""
    },

    warnings
  };
};

/*
|--------------------------------------------------------------------------
| Populate Payroll
|--------------------------------------------------------------------------
*/

const populatePayroll = (
  query
) => {
  return query
    .populate(
      "schoolId",
      "schoolName schoolCode type isActive address phone email"
    )
    .populate(
      "staffId",
      [
        "employeeId",
        "name",
        "phone",
        "email",
        "photo",
        "category",
        "department",
        "designation",
        "status",
        "shift",
        "joiningDate"
      ].join(" ")
    )
    .populate(
      "salaryStructureId",
      [
        "basicSalary",
        "currency",
        "calculationBasis",
        "workingDaysMethod",
        "fixedWorkingDays",
        "dailyRateBasis",
        "status"
      ].join(" ")
    )
    .populate(
      "generatedBy",
      "name email role"
    )
    .populate(
      "submittedBy",
      "name email role"
    )
    .populate(
      "approvedBy",
      "name email role"
    )
    .populate(
      "rejectedBy",
      "name email role"
    )
    .populate(
      "paidBy",
      "name email role"
    )
    .populate(
      "cancelledBy",
      "name email role"
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
    );
};

/*
|--------------------------------------------------------------------------
| Audit Helpers
|--------------------------------------------------------------------------
*/

const sanitizeForAudit = (
  payroll
) => {
  if (!payroll) {
    return null;
  }

  const plainPayroll =
    typeof payroll.toObject ===
    "function"
      ? payroll.toObject({
          virtuals: false
        })
      : JSON.parse(
          JSON.stringify(
            payroll
          )
        );

  if (
    plainPayroll
      .paymentDetails
  ) {
    plainPayroll.paymentDetails = {
      ...plainPayroll
        .paymentDetails,

      transactionReference:
        maskSensitiveValue(
          plainPayroll
            .paymentDetails
            .transactionReference
        ),

      chequeNumber:
        maskSensitiveValue(
          plainPayroll
            .paymentDetails
            .chequeNumber
        )
    };
  }

  return plainPayroll;
};

const recordAuditLog =
  async ({
    req,
    action,
    description,
    targetId,
    schoolId,
    oldData = null,
    newData = null
  }) => {
    try {
      await createAuditLog({
        req,
        action,
        module: "PAYROLL",

        description,

        targetId,
        documentId:
          targetId,

        targetModel:
          "Payroll",

        schoolId,

        oldData:
          sanitizeForAudit(
            oldData
          ),

        newData:
          sanitizeForAudit(
            newData
          )
      });
    } catch (
      auditError
    ) {
      console.error(
        "Payroll audit log error:",
        auditError.message
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Controller Error Handler
|--------------------------------------------------------------------------
*/

const sendControllerError = ({
  res,
  error,
  fallbackMessage
}) => {
  console.error(
    fallbackMessage,
    error
  );

  if (
    error?.name ===
    "ValidationError"
  ) {
    const validationMessage =
      Object.values(
        error.errors || {}
      )
        .map(
          (item) =>
            item.message
        )
        .filter(Boolean)
        .join(" ");

    return res.status(400).json({
      success: false,

      message:
        validationMessage ||
        "Payroll validation failed."
    });
  }

  if (
    error?.name ===
    "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "A supplied identifier is invalid."
    });
  }

  if (
    error?.code === 11000
  ) {
    return res.status(409).json({
      success: false,

      message:
        "An active payroll already exists for this staff member and payroll period."
    });
  }

  return res.status(500).json({
    success: false,
    message:
      fallbackMessage
  });
};

/*
|--------------------------------------------------------------------------
| List Filter
|--------------------------------------------------------------------------
*/

const buildPayrollListFilter = (
  req,
  {
    deleted = false
  } = {}
) => {
  const schoolScope =
    buildSchoolFilter(
      req,
      req.query?.schoolId
    );

  if (schoolScope.error) {
    return {
      error:
        schoolScope.error
    };
  }

  const filter = {
    ...schoolScope.filter,
    isDeleted: deleted
  };

  if (
    req.query?.staffId
  ) {
    const staffObjectId =
      toObjectId(
        req.query.staffId
      );

    if (!staffObjectId) {
      return {
        error:
          "Staff identifier is invalid."
      };
    }

    filter.staffId =
      staffObjectId;
  }

  if (
    req.query?.status
  ) {
    filter.status =
      req.query.status;
  }

  if (
    req.query?.payrollMonth
  ) {
    const month =
      Number.parseInt(
        req.query
          .payrollMonth,
        10
      );

    if (
      month < 1 ||
      month > 12
    ) {
      return {
        error:
          "Payroll month must be between 1 and 12."
      };
    }

    filter.payrollMonth =
      month;
  }

  if (
    req.query?.payrollYear
  ) {
    const year =
      Number.parseInt(
        req.query
          .payrollYear,
        10
      );

    if (
      year < 2000 ||
      year > 2100
    ) {
      return {
        error:
          "Payroll year is invalid."
      };
    }

    filter.payrollYear =
      year;
  }

  if (
    req.query?.department
  ) {
    filter.departmentSnapshot = {
      $regex:
        escapeRegex(
          req.query
            .department
        ),

      $options: "i"
    };
  }

  if (
    req.query?.paymentMethod
  ) {
    filter[
      "paymentDetails.paymentMethod"
    ] =
      req.query
        .paymentMethod;
  }

  const search =
    String(
      req.query?.search || ""
    ).trim();

  if (search) {
    const searchRegex =
      new RegExp(
        escapeRegex(search),
        "i"
      );

    filter.$or = [
      {
        payrollNumber:
          searchRegex
      },
      {
        payslipNumber:
          searchRegex
      },
      {
        employeeIdSnapshot:
          searchRegex
      },
      {
        staffNameSnapshot:
          searchRegex
      },
      {
        departmentSnapshot:
          searchRegex
      },
      {
        designationSnapshot:
          searchRegex
      }
    ];
  }

  return {
    filter
  };
};

/*
|--------------------------------------------------------------------------
| Payroll Summary
|--------------------------------------------------------------------------
*/

const calculatePayrollListSummary =
  async (filter) => {
    const groupedSummary =
      await Payroll.aggregate([
        {
          $match: filter
        },
        {
          $group: {
            _id: "$status",

            count: {
              $sum: 1
            },

            grossPayroll: {
              $sum:
                "$earnings.grossEarnings"
            },

            totalDeductions: {
              $sum:
                "$deductions.totalDeductions"
            },

            netPayroll: {
              $sum:
                "$netSalary"
            }
          }
        }
      ]);

    const summary = {
      totalPayrolls: 0,

      draft: 0,
      generated: 0,
      pendingApproval: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
      cancelled: 0,

      grossPayroll: 0,
      totalDeductions: 0,
      netPayroll: 0,
      paidAmount: 0,
      outstandingAmount: 0
    };

    groupedSummary.forEach(
      (item) => {
        const count =
          nonNegativeNumber(
            item.count
          );

        const netPayroll =
          nonNegativeNumber(
            item.netPayroll
          );

        summary.totalPayrolls +=
          count;

        summary.grossPayroll +=
          nonNegativeNumber(
            item.grossPayroll
          );

        summary.totalDeductions +=
          nonNegativeNumber(
            item.totalDeductions
          );

        summary.netPayroll +=
          netPayroll;

        if (
          item._id === "draft"
        ) {
          summary.draft +=
            count;
        }

        if (
          item._id ===
          "generated"
        ) {
          summary.generated +=
            count;
        }

        if (
          item._id ===
          "pending_approval"
        ) {
          summary.pendingApproval +=
            count;
        }

        if (
          item._id ===
          "approved"
        ) {
          summary.approved +=
            count;
        }

        if (
          item._id ===
          "rejected"
        ) {
          summary.rejected +=
            count;
        }

        if (
          item._id === "paid"
        ) {
          summary.paid +=
            count;

          summary.paidAmount +=
            netPayroll;
        } else if (
          item._id !==
          "cancelled"
        ) {
          summary.outstandingAmount +=
            netPayroll;
        }

        if (
          item._id ===
          "cancelled"
        ) {
          summary.cancelled +=
            count;
        }
      }
    );

    Object.keys(
      summary
    ).forEach((key) => {
      if (
        [
          "grossPayroll",
          "totalDeductions",
          "netPayroll",
          "paidAmount",
          "outstandingAmount"
        ].includes(key)
      ) {
        summary[key] =
          roundMoney(
            summary[key]
          );
      }
    });

    return summary;
  };

/*
|--------------------------------------------------------------------------
| Apply Payroll Calculation
|--------------------------------------------------------------------------
*/

const applyCalculationToPayroll = ({
  payroll,
  calculation,
  salaryStructure,
  staff
}) => {
  payroll.salaryStructureId =
    salaryStructure._id;

  payroll.currency =
    calculation.currency;

  payroll.employeeIdSnapshot =
    calculation
      .staffSnapshots
      .employeeIdSnapshot;

  payroll.staffNameSnapshot =
    calculation
      .staffSnapshots
      .staffNameSnapshot;

  payroll.departmentSnapshot =
    calculation
      .staffSnapshots
      .departmentSnapshot;

  payroll.designationSnapshot =
    calculation
      .staffSnapshots
      .designationSnapshot;

  payroll.categorySnapshot =
    calculation
      .staffSnapshots
      .categorySnapshot;

  payroll.salaryStructureSnapshot =
    calculation
      .salaryStructureSnapshot;

  payroll.attendanceSummary =
    calculation
      .attendanceSummary;

  payroll.salaryRates =
    calculation.salaryRates;

  payroll.earnings =
    calculation.earnings;

  payroll.deductions =
    calculation.deductions;

  payroll.paymentDetails =
    calculation
      .paymentDetails;

  if (!payroll.payrollNumber) {
    const numbers =
      buildPayrollNumbers({
        staff,

        payrollYear:
          payroll.payrollYear,

        payrollMonth:
          payroll.payrollMonth
      });

    payroll.payrollNumber =
      numbers.payrollNumber;

    payroll.payslipNumber =
      numbers.payslipNumber;
  }
};

/*
|--------------------------------------------------------------------------
| Generate Monthly Payroll
|--------------------------------------------------------------------------
|
| POST /api/payroll/generate
|
| Optional:
| staffId
| regenerateExisting
|
*/

const generatePayroll =
  async (req, res) => {
    try {
      const resolvedSchool =
        resolveSchoolId({
          req,

          requestedSchoolId:
            req.body?.schoolId,

          required: true
        });

      if (
        resolvedSchool.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            resolvedSchool.error
        });
      }

      const schoolId =
        resolvedSchool.schoolId;

      const schoolResult =
        await verifySchool(
          schoolId,
          {
            requireActive: true
          }
        );

      if (
        schoolResult.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            schoolResult.error
        });
      }

      const periodResult =
        getPayrollPeriod(
          req.body
            ?.payrollYear,

          req.body
            ?.payrollMonth
        );

      if (
        periodResult.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            periodResult.error
        });
      }

      const {
        payrollYear,
        payrollMonth,
        periodStart,
        periodEnd
      } = periodResult;

      const requestedStaffId =
        req.body?.staffId;

      if (
        requestedStaffId &&
        !isValidObjectId(
          requestedStaffId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Staff identifier is invalid."
        });
      }

      const salaryStructureFilter = {
        schoolId,
        status: "active",
        isDeleted: false,

        effectiveFrom: {
          $lte: periodEnd
        },

        $or: [
          {
            effectiveTo: null
          },
          {
            effectiveTo: {
              $gte:
                periodStart
            }
          }
        ]
      };

      if (
        requestedStaffId
      ) {
        salaryStructureFilter.staffId =
          requestedStaffId;
      }

      const salaryStructures =
        await StaffSalaryStructure.find(
          salaryStructureFilter
        )
          .populate(
            "staffId",
            [
              "employeeId",
              "name",
              "phone",
              "email",
              "photo",
              "category",
              "department",
              "designation",
              "status",
              "shift"
            ].join(" ")
          );

      if (
        salaryStructures.length ===
        0
      ) {
        return res.status(404).json({
          success: false,

          message:
            requestedStaffId
              ? "No active salary structure was found for the selected staff member and payroll period."
              : "No active staff salary structures were found for this payroll period."
        });
      }

      const validStructures =
        salaryStructures.filter(
          (structure) =>
            structure.staffId &&
            !structure.staffId
              .isDeleted &&
            [
              "active",
              "on_leave"
            ].includes(
              structure.staffId
                .status
            )
        );

      if (
        validStructures.length ===
        0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "No eligible active or on-leave staff members were found."
        });
      }

      const staffIds =
        validStructures.map(
          (structure) =>
            structure.staffId._id
        );

      const [
        attendanceRecords,
        existingPayrolls
      ] = await Promise.all([
        StaffAttendance.find({
          schoolId,

          staffId: {
            $in: staffIds
          },

          attendanceDate: {
            $gte: periodStart,
            $lte: periodEnd
          },

          isDeleted: false
        }).lean({
          virtuals: true
        }),

        Payroll.find({
          schoolId,

          staffId: {
            $in: staffIds
          },

          payrollYear,
          payrollMonth,

          isDeleted: false
        })
      ]);

      const attendanceByStaff =
        new Map();

      attendanceRecords.forEach(
        (record) => {
          const staffKey =
            String(
              record.staffId
            );

          const currentRecords =
            attendanceByStaff.get(
              staffKey
            ) || [];

          currentRecords.push(
            record
          );

          attendanceByStaff.set(
            staffKey,
            currentRecords
          );
        }
      );

      const existingPayrollByStaff =
        new Map(
          existingPayrolls.map(
            (payroll) => [
              String(
                payroll.staffId
              ),
              payroll
            ]
          )
        );

      const regenerateExisting =
        parseBoolean(
          req.body
            ?.regenerateExisting
        );

      const generated = [];
      const regenerated = [];
      const skipped = [];
      const failed = [];

      for (
        const salaryStructure of
        validStructures
      ) {
        const staff =
          salaryStructure.staffId;

        const staffKey =
          String(staff._id);

        const existingPayroll =
          existingPayrollByStaff.get(
            staffKey
          );

        try {
          if (
            existingPayroll &&
            !regenerateExisting
          ) {
            skipped.push({
              staffId:
                staff._id,

              employeeId:
                staff.employeeId,

              staffName:
                staff.name,

              payrollId:
                existingPayroll._id,

              reason:
                "Payroll already exists for this period."
            });

            continue;
          }

          if (
            existingPayroll &&
            ![
              "draft",
              "generated",
              "rejected"
            ].includes(
              existingPayroll.status
            )
          ) {
            skipped.push({
              staffId:
                staff._id,

              employeeId:
                staff.employeeId,

              staffName:
                staff.name,

              payrollId:
                existingPayroll._id,

              reason:
                `Payroll is locked because its status is ${existingPayroll.status}.`
            });

            continue;
          }

          const staffAttendance =
            attendanceByStaff.get(
              staffKey
            ) || [];

          const calculation =
            buildPayrollCalculation({
              salaryStructure,
              staff,

              attendanceRecords:
                staffAttendance,

              periodStart,
              periodEnd,

              existingPayroll
            });

          let payroll =
            existingPayroll;

          if (!payroll) {
            payroll =
              new Payroll({
                schoolId,

                staffId:
                  staff._id,

                salaryStructureId:
                  salaryStructure._id,

                payrollMonth,
                payrollYear,

                periodStart,
                periodEnd,

                generatedBy:
                  getCurrentUserId(
                    req
                  ),

                generatedAt:
                  new Date(),

                createdBy:
                  getCurrentUserId(
                    req
                  ),

                status:
                  "generated"
              });
          }

          const oldData =
            existingPayroll
              ? existingPayroll.toObject({
                  virtuals: false
                })
              : null;

          payroll.schoolId =
            schoolId;

          payroll.staffId =
            staff._id;

          payroll.payrollMonth =
            payrollMonth;

          payroll.payrollYear =
            payrollYear;

          payroll.periodStart =
            periodStart;

          payroll.periodEnd =
            periodEnd;

          payroll.generatedBy =
            getCurrentUserId(
              req
            );

          payroll.generatedAt =
            new Date();

          payroll.updatedBy =
            existingPayroll
              ? getCurrentUserId(
                  req
                )
              : null;

          payroll.status =
            "generated";

          payroll.submittedBy =
            null;

          payroll.submittedAt =
            null;

          payroll.approvedBy =
            null;

          payroll.approvedAt =
            null;

          payroll.rejectedBy =
            null;

          payroll.rejectedAt =
            null;

          payroll.rejectionReason =
            "";

          payroll.cancelledBy =
            null;

          payroll.cancelledAt =
            null;

          payroll.cancellationReason =
            "";

          applyCalculationToPayroll({
            payroll,
            calculation,
            salaryStructure,
            staff
          });

          await payroll.save();

          if (existingPayroll) {
            regenerated.push({
              payrollId:
                payroll._id,

              staffId:
                staff._id,

              employeeId:
                staff.employeeId,

              staffName:
                staff.name,

              netSalary:
                payroll.netSalary,

              warnings:
                calculation.warnings
            });

            await recordAuditLog({
              req,
              action:
                "UPDATE",

              description:
                `Payroll regenerated for ${staff.name} for ${payroll.periodLabel}.`,

              targetId:
                payroll._id,

              schoolId,

              oldData,

              newData:
                payroll
            });
          } else {
            generated.push({
              payrollId:
                payroll._id,

              staffId:
                staff._id,

              employeeId:
                staff.employeeId,

              staffName:
                staff.name,

              netSalary:
                payroll.netSalary,

              warnings:
                calculation.warnings
            });

            await recordAuditLog({
              req,
              action:
                "CREATE",

              description:
                `Payroll generated for ${staff.name} for ${payroll.periodLabel}.`,

              targetId:
                payroll._id,

              schoolId,

              newData:
                payroll
            });
          }
        } catch (
          payrollError
        ) {
          failed.push({
            staffId:
              staff._id,

            employeeId:
              staff.employeeId,

            staffName:
              staff.name,

            reason:
              payrollError.message ||
              "Payroll generation failed."
          });
        }
      }

      return res.status(200).json({
        success:
          failed.length === 0,

        message:
          `${generated.length} payroll(s) generated, ` +
          `${regenerated.length} regenerated, ` +
          `${skipped.length} skipped and ` +
          `${failed.length} failed.`,

        period: {
          payrollMonth,
          payrollYear,
          periodStart,
          periodEnd
        },

        generated,
        regenerated,
        skipped,
        failed
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Monthly payroll could not be generated."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Payroll Records
|--------------------------------------------------------------------------
|
| GET /api/payroll
|
*/

const getPayrolls =
  async (req, res) => {
    try {
      const filterResult =
        buildPayrollListFilter(
          req,
          {
            deleted: false
          }
        );

      if (
        filterResult.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            filterResult.error
        });
      }

      const filter =
        filterResult.filter;

      const {
        page,
        limit,
        skip
      } =
        getPaginationOptions(
          req.query
        );

      const allowedSortFields = [
        "createdAt",
        "updatedAt",
        "payrollYear",
        "payrollMonth",
        "staffNameSnapshot",
        "netSalary",
        "status"
      ];

      const sortBy =
        allowedSortFields.includes(
          req.query?.sortBy
        )
          ? req.query.sortBy
          : "createdAt";

      const sortOrder =
        String(
          req.query?.sortOrder ||
            "desc"
        ).toLowerCase() ===
        "asc"
          ? 1
          : -1;

      const [
        payrolls,
        total,
        summary
      ] = await Promise.all([
        populatePayroll(
          Payroll.find(filter)
            .sort({
              [sortBy]:
                sortOrder
            })
            .skip(skip)
            .limit(limit)
        ),

        Payroll.countDocuments(
          filter
        ),

        calculatePayrollListSummary(
          filter
        )
      ]);

      return res.status(200).json({
        success: true,
        payrolls,
        summary,

        pagination:
          buildPagination({
            total,
            page,
            limit
          })
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Payroll records could not be loaded."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Payroll by ID
|--------------------------------------------------------------------------
|
| GET /api/payroll/:id
|
*/

const getPayrollById =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payroll identifier is invalid."
        });
      }

      const schoolScope =
        buildSchoolFilter(
          req,
          null
        );

      if (
        schoolScope.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            schoolScope.error
        });
      }

      const payroll =
        await populatePayroll(
          Payroll.findOne({
            _id: req.params.id,
            ...schoolScope.filter,
            isDeleted: false
          })
        );

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message:
            "Payroll record was not found."
        });
      }

      return res.status(200).json({
        success: true,
        payroll
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Payroll record could not be loaded."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Payslip
|--------------------------------------------------------------------------
|
| GET /api/payroll/:id/payslip
|
*/

const getPayslip =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payroll identifier is invalid."
        });
      }

      const schoolScope =
        buildSchoolFilter(
          req,
          null
        );

      if (
        schoolScope.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            schoolScope.error
        });
      }

      const payroll =
        await populatePayroll(
          Payroll.findOne({
            _id: req.params.id,
            ...schoolScope.filter,
            isDeleted: false
          })
        );

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message:
            "Payroll record was not found."
        });
      }

      return res.status(200).json({
        success: true,

        isOfficial: [
          "approved",
          "paid"
        ].includes(
          payroll.status
        ),

        payslip: payroll
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Payslip could not be loaded."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Recalculate Payroll
|--------------------------------------------------------------------------
|
| POST /api/payroll/:id/recalculate
|
*/

const recalculatePayroll =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payroll identifier is invalid."
        });
      }

      const schoolScope =
        buildSchoolFilter(
          req,
          null
        );

      if (
        schoolScope.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            schoolScope.error
        });
      }

      const payroll =
        await Payroll.findOne({
          _id: req.params.id,
          ...schoolScope.filter,
          isDeleted: false
        });

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message:
            "Payroll record was not found."
        });
      }

      if (
        ![
          "draft",
          "generated",
          "rejected"
        ].includes(
          payroll.status
        )
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Only draft, generated or rejected payroll can be recalculated."
        });
      }

      const [
        salaryStructure,
        staff,
        attendanceRecords
      ] = await Promise.all([
        StaffSalaryStructure.findOne({
          _id:
            payroll
              .salaryStructureId,

          schoolId:
            payroll.schoolId,

          isDeleted: false
        }),

        Staff.findOne({
          _id:
            payroll.staffId,

          schoolId:
            payroll.schoolId,

          isDeleted: false
        }),

        StaffAttendance.find({
          schoolId:
            payroll.schoolId,

          staffId:
            payroll.staffId,

          attendanceDate: {
            $gte:
              payroll.periodStart,

            $lte:
              payroll.periodEnd
          },

          isDeleted: false
        }).lean({
          virtuals: true
        })
      ]);

      if (!salaryStructure) {
        return res.status(404).json({
          success: false,

          message:
            "The salary structure linked to this payroll was not found."
        });
      }

      if (!staff) {
        return res.status(404).json({
          success: false,

          message:
            "The staff member linked to this payroll was not found."
        });
      }

      const oldData =
        payroll.toObject({
          virtuals: false
        });

      const calculation =
        buildPayrollCalculation({
          salaryStructure,
          staff,
          attendanceRecords,

          periodStart:
            payroll.periodStart,

          periodEnd:
            payroll.periodEnd,

          existingPayroll:
            payroll
        });

      applyCalculationToPayroll({
        payroll,
        calculation,
        salaryStructure,
        staff
      });

      payroll.status =
        "generated";

      payroll.generatedBy =
        getCurrentUserId(req);

      payroll.generatedAt =
        new Date();

      payroll.updatedBy =
        getCurrentUserId(req);

      payroll.submittedBy =
        null;

      payroll.submittedAt =
        null;

      payroll.approvedBy =
        null;

      payroll.approvedAt =
        null;

      payroll.rejectedBy =
        null;

      payroll.rejectedAt =
        null;

      payroll.rejectionReason =
        "";

      await payroll.save();

      const populatedPayroll =
        await populatePayroll(
          Payroll.findById(
            payroll._id
          )
        );

      await recordAuditLog({
        req,
        action: "UPDATE",

        description:
          `Payroll recalculated for ${staff.name} for ${payroll.periodLabel}.`,

        targetId:
          payroll._id,

        schoolId:
          payroll.schoolId,

        oldData,
        newData:
          payroll
      });

      return res.status(200).json({
        success: true,

        message:
          "Payroll recalculated successfully.",

        warnings:
          calculation.warnings,

        payroll:
          populatedPayroll
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Payroll could not be recalculated."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Update Payroll Adjustments
|--------------------------------------------------------------------------
|
| PUT /api/payroll/:id/adjustments
|
*/

const updatePayrollAdjustments =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payroll identifier is invalid."
        });
      }

      const schoolScope =
        buildSchoolFilter(
          req,
          null
        );

      if (
        schoolScope.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            schoolScope.error
        });
      }

      const payroll =
        await Payroll.findOne({
          _id: req.params.id,
          ...schoolScope.filter,
          isDeleted: false
        });

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message:
            "Payroll record was not found."
        });
      }

      if (
        ![
          "draft",
          "generated",
          "rejected"
        ].includes(
          payroll.status
        )
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Adjustments can only be edited before payroll approval."
        });
      }

      const oldData =
        payroll.toObject({
          virtuals: false
        });

      if (
        hasOwn(
          req.body,
          "bonus"
        )
      ) {
        payroll.earnings.bonus =
          nonNegativeNumber(
            req.body.bonus
          );
      }

      if (
        hasOwn(
          req.body,
          "arrears"
        )
      ) {
        payroll.earnings.arrears =
          nonNegativeNumber(
            req.body.arrears
          );
      }

      if (
        hasOwn(
          req.body,
          "reimbursements"
        )
      ) {
        payroll.earnings.reimbursements =
          nonNegativeNumber(
            req.body
              .reimbursements
          );
      }

      if (
        hasOwn(
          req.body,
          "incentives"
        )
      ) {
        payroll.earnings.incentives =
          nonNegativeNumber(
            req.body.incentives
          );
      }

      if (
        hasOwn(
          req.body,
          "otherEarnings"
        )
      ) {
        payroll.earnings.other =
          normalizeManualEarnings(
            req.body
              .otherEarnings
          );
      }

      if (
        hasOwn(
          req.body,
          "salaryAdvance"
        )
      ) {
        payroll.deductions.salaryAdvance =
          nonNegativeNumber(
            req.body
              .salaryAdvance
          );
      }

      if (
        hasOwn(
          req.body,
          "otherDeductions"
        )
      ) {
        payroll.deductions.other =
          normalizeManualDeductions(
            req.body
              .otherDeductions
          );
      }

      if (
        hasOwn(
          req.body,
          "roundingAdjustment"
        )
      ) {
        payroll.roundingAdjustment =
          safeNumber(
            req.body
              .roundingAdjustment
          );
      }

      if (
        hasOwn(
          req.body,
          "payrollNotes"
        )
      ) {
        payroll.payrollNotes =
          String(
            req.body
              .payrollNotes ||
              ""
          ).trim();
      }

      if (
        hasOwn(
          req.body,
          "adjustmentNotes"
        )
      ) {
        payroll.adjustmentNotes =
          String(
            req.body
              .adjustmentNotes ||
              ""
          ).trim();
      }

      payroll.updatedBy =
        getCurrentUserId(req);

      if (
        payroll.status ===
        "rejected"
      ) {
        payroll.status =
          "generated";

        payroll.rejectedBy =
          null;

        payroll.rejectedAt =
          null;

        payroll.rejectionReason =
          "";
      }

      await payroll.save();

      const populatedPayroll =
        await populatePayroll(
          Payroll.findById(
            payroll._id
          )
        );

      await recordAuditLog({
        req,
        action: "UPDATE",

        description:
          `Payroll adjustments updated for ${payroll.staffNameSnapshot}.`,

        targetId:
          payroll._id,

        schoolId:
          payroll.schoolId,

        oldData,
        newData:
          payroll
      });

      return res.status(200).json({
        success: true,

        message:
          "Payroll adjustments updated successfully.",

        payroll:
          populatedPayroll
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Payroll adjustments could not be updated."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Submit Payroll for Approval
|--------------------------------------------------------------------------
|
| PATCH /api/payroll/:id/submit
|
*/

const submitPayroll =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payroll identifier is invalid."
        });
      }

      const schoolScope =
        buildSchoolFilter(
          req,
          null
        );

      if (
        schoolScope.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            schoolScope.error
        });
      }

      const payroll =
        await Payroll.findOne({
          _id: req.params.id,
          ...schoolScope.filter,
          isDeleted: false
        });

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message:
            "Payroll record was not found."
        });
      }

      if (
        ![
          "draft",
          "generated",
          "rejected"
        ].includes(
          payroll.status
        )
      ) {
        return res.status(409).json({
          success: false,

          message:
            "This payroll cannot be submitted in its current status."
        });
      }

      const hasIncompleteAttendance =
        payroll
          .salaryStructureSnapshot
          ?.calculationBasis ===
          "attendance_based" &&
        nonNegativeNumber(
          payroll
            .attendanceSummary
            ?.unmarkedDays
        ) > 0;

      const confirmIncompleteAttendance =
        parseBoolean(
          req.body
            ?.confirmIncompleteAttendance
        );

      if (
        hasIncompleteAttendance &&
        !confirmIncompleteAttendance
      ) {
        return res.status(409).json({
          success: false,

          requiresConfirmation:
            true,

          message:
            `${payroll.attendanceSummary.unmarkedDays} working day(s) have no attendance record. Confirm incomplete attendance before submitting payroll.`
        });
      }

      const oldData =
        payroll.toObject({
          virtuals: false
        });

      payroll.status =
        "pending_approval";

      payroll.submittedBy =
        getCurrentUserId(req);

      payroll.submittedAt =
        new Date();

      payroll.rejectedBy =
        null;

      payroll.rejectedAt =
        null;

      payroll.rejectionReason =
        "";

      payroll.updatedBy =
        getCurrentUserId(req);

      await payroll.save();

      const populatedPayroll =
        await populatePayroll(
          Payroll.findById(
            payroll._id
          )
        );

      await recordAuditLog({
        req,
        action: "SUBMIT",

        description:
          `Payroll submitted for approval for ${payroll.staffNameSnapshot}.`,

        targetId:
          payroll._id,

        schoolId:
          payroll.schoolId,

        oldData,
        newData:
          payroll
      });

      return res.status(200).json({
        success: true,

        message:
          "Payroll submitted for approval successfully.",

        payroll:
          populatedPayroll
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Payroll could not be submitted for approval."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Approve Payroll
|--------------------------------------------------------------------------
|
| PATCH /api/payroll/:id/approve
|
*/

const approvePayroll =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payroll identifier is invalid."
        });
      }

      const schoolScope =
        buildSchoolFilter(
          req,
          null
        );

      if (
        schoolScope.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            schoolScope.error
        });
      }

      const payroll =
        await Payroll.findOne({
          _id: req.params.id,
          ...schoolScope.filter,
          isDeleted: false
        });

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message:
            "Payroll record was not found."
        });
      }

      if (
        payroll.status !==
        "pending_approval"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Only payroll pending approval can be approved."
        });
      }

      const oldData =
        payroll.toObject({
          virtuals: false
        });

      payroll.status =
        "approved";

      payroll.approvedBy =
        getCurrentUserId(req);

      payroll.approvedAt =
        new Date();

      payroll.rejectedBy =
        null;

      payroll.rejectedAt =
        null;

      payroll.rejectionReason =
        "";

      payroll.updatedBy =
        getCurrentUserId(req);

      await payroll.save();

      const populatedPayroll =
        await populatePayroll(
          Payroll.findById(
            payroll._id
          )
        );

      await recordAuditLog({
        req,
        action: "APPROVE",

        description:
          `Payroll approved for ${payroll.staffNameSnapshot}.`,

        targetId:
          payroll._id,

        schoolId:
          payroll.schoolId,

        oldData,
        newData:
          payroll
      });

      return res.status(200).json({
        success: true,

        message:
          "Payroll approved successfully.",

        payroll:
          populatedPayroll
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Payroll could not be approved."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Reject Payroll
|--------------------------------------------------------------------------
|
| PATCH /api/payroll/:id/reject
|
*/

const rejectPayroll =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payroll identifier is invalid."
        });
      }

      const rejectionReason =
        String(
          req.body
            ?.rejectionReason ||
            ""
        ).trim();

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message:
            "Rejection reason is required."
        });
      }

      const schoolScope =
        buildSchoolFilter(
          req,
          null
        );

      if (
        schoolScope.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            schoolScope.error
        });
      }

      const payroll =
        await Payroll.findOne({
          _id: req.params.id,
          ...schoolScope.filter,
          isDeleted: false
        });

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message:
            "Payroll record was not found."
        });
      }

      if (
        payroll.status !==
        "pending_approval"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Only payroll pending approval can be rejected."
        });
      }

      const oldData =
        payroll.toObject({
          virtuals: false
        });

      payroll.status =
        "rejected";

      payroll.rejectedBy =
        getCurrentUserId(req);

      payroll.rejectedAt =
        new Date();

      payroll.rejectionReason =
        rejectionReason;

      payroll.approvedBy =
        null;

      payroll.approvedAt =
        null;

      payroll.updatedBy =
        getCurrentUserId(req);

      await payroll.save();

      const populatedPayroll =
        await populatePayroll(
          Payroll.findById(
            payroll._id
          )
        );

      await recordAuditLog({
        req,
        action: "REJECT",

        description:
          `Payroll rejected for ${payroll.staffNameSnapshot}.`,

        targetId:
          payroll._id,

        schoolId:
          payroll.schoolId,

        oldData,
        newData:
          payroll
      });

      return res.status(200).json({
        success: true,

        message:
          "Payroll rejected successfully.",

        payroll:
          populatedPayroll
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Payroll could not be rejected."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Mark Payroll as Paid
|--------------------------------------------------------------------------
|
| PATCH /api/payroll/:id/pay
|
*/

const markPayrollPaid =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payroll identifier is invalid."
        });
      }

      const schoolScope =
        buildSchoolFilter(
          req,
          null
        );

      if (
        schoolScope.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            schoolScope.error
        });
      }

      const payroll =
        await Payroll.findOne({
          _id: req.params.id,
          ...schoolScope.filter,
          isDeleted: false
        });

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message:
            "Payroll record was not found."
        });
      }

      if (
        payroll.status !==
        "approved"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Only approved payroll can be marked as paid."
        });
      }

      const oldData =
        payroll.toObject({
          virtuals: false
        });

      const existingPayment =
        payroll.paymentDetails ||
        {};

      payroll.paymentDetails = {
        paymentMethod:
          req.body
            ?.paymentMethod ||
          existingPayment
            .paymentMethod ||
          "cash",

        paymentDate:
          req.body
            ?.paymentDate ||
          new Date(),

        transactionReference:
          String(
            req.body
              ?.transactionReference ||
            ""
          ).trim(),

        bankName:
          String(
            req.body
              ?.bankName ||
            existingPayment
              .bankName ||
            ""
          ).trim(),

        accountTitle:
          String(
            req.body
              ?.accountTitle ||
            existingPayment
              .accountTitle ||
            ""
          ).trim(),

        maskedAccountNumber:
          String(
            req.body
              ?.maskedAccountNumber ||
            existingPayment
              .maskedAccountNumber ||
            ""
          ).trim(),

        chequeNumber:
          String(
            req.body
              ?.chequeNumber ||
            ""
          ).trim(),

        walletProvider:
          String(
            req.body
              ?.walletProvider ||
            existingPayment
              .walletProvider ||
            ""
          ).trim(),

        maskedWalletNumber:
          String(
            req.body
              ?.maskedWalletNumber ||
            existingPayment
              .maskedWalletNumber ||
            ""
          ).trim(),

        paymentNotes:
          String(
            req.body
              ?.paymentNotes ||
            ""
          ).trim()
      };

      payroll.status =
        "paid";

      payroll.paidBy =
        getCurrentUserId(req);

      payroll.paidAt =
        new Date();

      payroll.updatedBy =
        getCurrentUserId(req);

      await payroll.save();

      const populatedPayroll =
        await populatePayroll(
          Payroll.findById(
            payroll._id
          )
        );

      await recordAuditLog({
        req,
        action: "PAYMENT",

        description:
          `Payroll payment recorded for ${payroll.staffNameSnapshot}.`,

        targetId:
          payroll._id,

        schoolId:
          payroll.schoolId,

        oldData,
        newData:
          payroll
      });

      return res.status(200).json({
        success: true,

        message:
          "Payroll marked as paid successfully.",

        payroll:
          populatedPayroll
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Payroll payment could not be recorded."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Cancel Payroll
|--------------------------------------------------------------------------
|
| PATCH /api/payroll/:id/cancel
|
*/

const cancelPayroll =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payroll identifier is invalid."
        });
      }

      const cancellationReason =
        String(
          req.body
            ?.cancellationReason ||
            ""
        ).trim();

      if (!cancellationReason) {
        return res.status(400).json({
          success: false,
          message:
            "Cancellation reason is required."
        });
      }

      const schoolScope =
        buildSchoolFilter(
          req,
          null
        );

      if (
        schoolScope.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            schoolScope.error
        });
      }

      const payroll =
        await Payroll.findOne({
          _id: req.params.id,
          ...schoolScope.filter,
          isDeleted: false
        });

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message:
            "Payroll record was not found."
        });
      }

      if (
        payroll.status ===
        "paid"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Paid payroll cannot be cancelled. A payment reversal workflow is required."
        });
      }

      if (
        payroll.status ===
        "cancelled"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Payroll is already cancelled."
        });
      }

      const oldData =
        payroll.toObject({
          virtuals: false
        });

      payroll.status =
        "cancelled";

      payroll.cancelledBy =
        getCurrentUserId(req);

      payroll.cancelledAt =
        new Date();

      payroll.cancellationReason =
        cancellationReason;

      payroll.updatedBy =
        getCurrentUserId(req);

      await payroll.save();

      const populatedPayroll =
        await populatePayroll(
          Payroll.findById(
            payroll._id
          )
        );

      await recordAuditLog({
        req,
        action: "CANCEL",

        description:
          `Payroll cancelled for ${payroll.staffNameSnapshot}.`,

        targetId:
          payroll._id,

        schoolId:
          payroll.schoolId,

        oldData,
        newData:
          payroll
      });

      return res.status(200).json({
        success: true,

        message:
          "Payroll cancelled successfully.",

        payroll:
          populatedPayroll
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Payroll could not be cancelled."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Payroll
|--------------------------------------------------------------------------
|
| DELETE /api/payroll/:id
|
*/

const deletePayroll =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payroll identifier is invalid."
        });
      }

      const schoolScope =
        buildSchoolFilter(
          req,
          null
        );

      if (
        schoolScope.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            schoolScope.error
        });
      }

      const payroll =
        await Payroll.findOne({
          _id: req.params.id,
          ...schoolScope.filter,
          isDeleted: false
        });

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message:
            "Payroll record was not found."
        });
      }

      if (
        [
          "pending_approval",
          "approved",
          "paid"
        ].includes(
          payroll.status
        )
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Pending, approved or paid payroll cannot be deleted."
        });
      }

      const oldData =
        payroll.toObject({
          virtuals: false
        });

      payroll.isDeleted =
        true;

      payroll.deletedAt =
        new Date();

      payroll.deletedBy =
        getCurrentUserId(req);

      payroll.updatedBy =
        getCurrentUserId(req);

      await payroll.save();

      await recordAuditLog({
        req,
        action: "DELETE",

        description:
          `Payroll deleted for ${payroll.staffNameSnapshot}.`,

        targetId:
          payroll._id,

        schoolId:
          payroll.schoolId,

        oldData,
        newData:
          payroll
      });

      return res.status(200).json({
        success: true,

        message:
          "Payroll deleted successfully."
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Payroll could not be deleted."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Payrolls
|--------------------------------------------------------------------------
|
| GET /api/payroll/deleted/list
|
*/

const getDeletedPayrolls =
  async (req, res) => {
    try {
      const filterResult =
        buildPayrollListFilter(
          req,
          {
            deleted: true
          }
        );

      if (
        filterResult.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            filterResult.error
        });
      }

      const filter =
        filterResult.filter;

      const {
        page,
        limit,
        skip
      } =
        getPaginationOptions(
          req.query
        );

      const [
        payrolls,
        total
      ] = await Promise.all([
        populatePayroll(
          Payroll.find(filter)
            .sort({
              deletedAt: -1
            })
            .skip(skip)
            .limit(limit)
        ),

        Payroll.countDocuments(
          filter
        )
      ]);

      return res.status(200).json({
        success: true,
        payrolls,

        pagination:
          buildPagination({
            total,
            page,
            limit
          })
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Deleted payroll records could not be loaded."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Restore Payroll
|--------------------------------------------------------------------------
|
| PATCH /api/payroll/:id/restore
|
*/

const restorePayroll =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payroll identifier is invalid."
        });
      }

      const schoolScope =
        buildSchoolFilter(
          req,
          null
        );

      if (
        schoolScope.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            schoolScope.error
        });
      }

      const payroll =
        await Payroll.findOne({
          _id: req.params.id,
          ...schoolScope.filter,
          isDeleted: true
        });

      if (!payroll) {
        return res.status(404).json({
          success: false,
          message:
            "Deleted payroll record was not found."
        });
      }

      const activePayroll =
        await Payroll.findOne({
          schoolId:
            payroll.schoolId,

          staffId:
            payroll.staffId,

          payrollYear:
            payroll.payrollYear,

          payrollMonth:
            payroll.payrollMonth,

          isDeleted: false
        });

      if (activePayroll) {
        return res.status(409).json({
          success: false,

          message:
            "An active payroll already exists for this staff member and payroll period.",

          activePayrollId:
            activePayroll._id
        });
      }

      const staffResult =
        await verifyStaff({
          staffId:
            payroll.staffId,

          schoolId:
            payroll.schoolId,

          allowInactive: true
        });

      if (
        staffResult.error
      ) {
        return res.status(400).json({
          success: false,
          message:
            staffResult.error
        });
      }

      const oldData =
        payroll.toObject({
          virtuals: false
        });

      payroll.isDeleted =
        false;

      payroll.deletedAt =
        null;

      payroll.deletedBy =
        null;

      payroll.updatedBy =
        getCurrentUserId(req);

      await payroll.save();

      const populatedPayroll =
        await populatePayroll(
          Payroll.findById(
            payroll._id
          )
        );

      await recordAuditLog({
        req,
        action: "RESTORE",

        description:
          `Payroll restored for ${payroll.staffNameSnapshot}.`,

        targetId:
          payroll._id,

        schoolId:
          payroll.schoolId,

        oldData,
        newData:
          payroll
      });

      return res.status(200).json({
        success: true,

        message:
          "Payroll restored successfully.",

        payroll:
          populatedPayroll
      });
    } catch (error) {
      return sendControllerError({
        res,
        error,

        fallbackMessage:
          "Payroll could not be restored."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  generatePayroll,
  getPayrolls,
  getPayrollById,
  getPayslip,
  recalculatePayroll,
  updatePayrollAdjustments,
  submitPayroll,
  approvePayroll,
  rejectPayroll,
  markPayrollPaid,
  cancelPayroll,
  deletePayroll,
  getDeletedPayrolls,
  restorePayroll
};