const mongoose = require(
  "mongoose"
);

/*
|--------------------------------------------------------------------------
| Other Earning Schema
|--------------------------------------------------------------------------
*/

const otherEarningSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,

        required: [
          true,
          "Earning name is required"
        ],

        trim: true,

        maxlength: [
          100,
          "Earning name cannot exceed 100 characters"
        ]
      },

      category: {
        type: String,

        enum: [
          "bonus",
          "arrears",
          "reimbursement",
          "incentive",
          "adjustment",
          "other"
        ],

        default: "other"
      },

      amount: {
        type: Number,

        required: [
          true,
          "Earning amount is required"
        ],

        min: [
          0,
          "Earning amount cannot be negative"
        ],

        default: 0
      },

      isTaxable: {
        type: Boolean,
        default: false
      },

      notes: {
        type: String,
        trim: true,

        maxlength: [
          300,
          "Earning notes cannot exceed 300 characters"
        ],

        default: ""
      }
    },
    {
      _id: true
    }
  );

/*
|--------------------------------------------------------------------------
| Other Deduction Schema
|--------------------------------------------------------------------------
*/

const otherDeductionSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,

        required: [
          true,
          "Deduction name is required"
        ],

        trim: true,

        maxlength: [
          100,
          "Deduction name cannot exceed 100 characters"
        ]
      },

      category: {
        type: String,

        enum: [
          "penalty",
          "loan",
          "advance",
          "tax",
          "adjustment",
          "other"
        ],

        default: "other"
      },

      amount: {
        type: Number,

        required: [
          true,
          "Deduction amount is required"
        ],

        min: [
          0,
          "Deduction amount cannot be negative"
        ],

        default: 0
      },

      notes: {
        type: String,
        trim: true,

        maxlength: [
          300,
          "Deduction notes cannot exceed 300 characters"
        ],

        default: ""
      }
    },
    {
      _id: true
    }
  );

/*
|--------------------------------------------------------------------------
| Allowance Breakdown Schema
|--------------------------------------------------------------------------
*/

const allowanceBreakdownSchema =
  new mongoose.Schema(
    {
      houseRent: {
        type: Number,
        min: 0,
        default: 0
      },

      medical: {
        type: Number,
        min: 0,
        default: 0
      },

      transport: {
        type: Number,
        min: 0,
        default: 0
      },

      food: {
        type: Number,
        min: 0,
        default: 0
      },

      communication: {
        type: Number,
        min: 0,
        default: 0
      },

      special: {
        type: Number,
        min: 0,
        default: 0
      },

      other: {
        type: [
          otherEarningSchema
        ],

        default: []
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Attendance Summary Schema
|--------------------------------------------------------------------------
*/

const attendanceSummarySchema =
  new mongoose.Schema(
    {
      workingDaysMethod: {
        type: String,

        enum: [
          "recorded_attendance_days",
          "calendar_working_days",
          "fixed_working_days"
        ],

        default:
          "fixed_working_days"
      },

      standardWorkingDays: {
        type: Number,
        min: 0,
        max: 31,
        default: 0
      },

      recordedAttendanceDays: {
        type: Number,
        min: 0,
        max: 31,
        default: 0
      },

      presentDays: {
        type: Number,
        min: 0,
        max: 31,
        default: 0
      },

      absentDays: {
        type: Number,
        min: 0,
        max: 31,
        default: 0
      },

      lateDays: {
        type: Number,
        min: 0,
        max: 31,
        default: 0
      },

      leaveDays: {
        type: Number,
        min: 0,
        max: 31,
        default: 0
      },

      paidLeaveDays: {
        type: Number,
        min: 0,
        max: 31,
        default: 0
      },

      unpaidLeaveDays: {
        type: Number,
        min: 0,
        max: 31,
        default: 0
      },

      halfDays: {
        type: Number,
        min: 0,
        max: 31,
        default: 0
      },

      payableDays: {
        type: Number,
        min: 0,
        max: 31,
        default: 0
      },

      unmarkedDays: {
        type: Number,
        min: 0,
        max: 31,
        default: 0
      },

      totalLateMinutes: {
        type: Number,
        min: 0,
        default: 0
      },

      totalOvertimeMinutes: {
        type: Number,
        min: 0,
        default: 0
      },

      totalWorkingMinutes: {
        type: Number,
        min: 0,
        default: 0
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Salary Rate Schema
|--------------------------------------------------------------------------
*/

const salaryRateSchema =
  new mongoose.Schema(
    {
      dailyRateBasis: {
        type: String,

        enum: [
          "basic_salary",
          "gross_salary"
        ],

        default:
          "basic_salary"
      },

      dailyRate: {
        type: Number,
        min: 0,
        default: 0
      },

      hourlyRate: {
        type: Number,
        min: 0,
        default: 0
      },

      overtimeHourlyRate: {
        type: Number,
        min: 0,
        default: 0
      },

      latePerMinuteRate: {
        type: Number,
        min: 0,
        default: 0
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Earnings Schema
|--------------------------------------------------------------------------
*/

const earningsSchema =
  new mongoose.Schema(
    {
      basicSalary: {
        type: Number,
        min: 0,
        default: 0
      },

      allowances: {
        type:
          allowanceBreakdownSchema,

        default: () => ({})
      },

      overtimePay: {
        type: Number,
        min: 0,
        default: 0
      },

      bonus: {
        type: Number,
        min: 0,
        default: 0
      },

      arrears: {
        type: Number,
        min: 0,
        default: 0
      },

      reimbursements: {
        type: Number,
        min: 0,
        default: 0
      },

      incentives: {
        type: Number,
        min: 0,
        default: 0
      },

      other: {
        type: [
          otherEarningSchema
        ],

        default: []
      },

      totalAllowances: {
        type: Number,
        min: 0,
        default: 0
      },

      grossEarnings: {
        type: Number,
        min: 0,
        default: 0
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Deduction Breakdown Schema
|--------------------------------------------------------------------------
*/

const deductionBreakdownSchema =
  new mongoose.Schema(
    {
      absenceDeduction: {
        type: Number,
        min: 0,
        default: 0
      },

      unpaidLeaveDeduction: {
        type: Number,
        min: 0,
        default: 0
      },

      halfDayDeduction: {
        type: Number,
        min: 0,
        default: 0
      },

      lateDeduction: {
        type: Number,
        min: 0,
        default: 0
      },

      providentFund: {
        type: Number,
        min: 0,
        default: 0
      },

      tax: {
        type: Number,
        min: 0,
        default: 0
      },

      insurance: {
        type: Number,
        min: 0,
        default: 0
      },

      loanInstallment: {
        type: Number,
        min: 0,
        default: 0
      },

      salaryAdvance: {
        type: Number,
        min: 0,
        default: 0
      },

      other: {
        type: [
          otherDeductionSchema
        ],

        default: []
      },

      attendanceDeductionsTotal: {
        type: Number,
        min: 0,
        default: 0
      },

      fixedDeductionsTotal: {
        type: Number,
        min: 0,
        default: 0
      },

      totalDeductions: {
        type: Number,
        min: 0,
        default: 0
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Salary Structure Snapshot Schema
|--------------------------------------------------------------------------
|
| Payroll generate ہونے کے وقت salary rules کی copy محفوظ ہوگی۔
| بعد میں Salary Structure تبدیل ہونے پر پرانی payroll متاثر نہیں ہوگی۔
|
*/

const salaryStructureSnapshotSchema =
  new mongoose.Schema(
    {
      basicSalary: {
        type: Number,
        min: 0,
        default: 0
      },

      fixedAllowancesTotal: {
        type: Number,
        min: 0,
        default: 0
      },

      fixedDeductionsTotal: {
        type: Number,
        min: 0,
        default: 0
      },

      grossSalary: {
        type: Number,
        min: 0,
        default: 0
      },

      estimatedNetSalary: {
        type: Number,
        min: 0,
        default: 0
      },

      calculationBasis: {
        type: String,

        enum: [
          "fixed_monthly",
          "attendance_based"
        ],

        default:
          "attendance_based"
      },

      workingDaysMethod: {
        type: String,

        enum: [
          "recorded_attendance_days",
          "calendar_working_days",
          "fixed_working_days"
        ],

        default:
          "fixed_working_days"
      },

      fixedWorkingDays: {
        type: Number,
        min: 1,
        max: 31,
        default: 26
      },

      dailyRateBasis: {
        type: String,

        enum: [
          "basic_salary",
          "gross_salary"
        ],

        default:
          "basic_salary"
      },

      attendanceRules: {
        absenceDeductionEnabled: {
          type: Boolean,
          default: true
        },

        unpaidLeaveDeductionEnabled: {
          type: Boolean,
          default: true
        },

        halfDayDeductionEnabled: {
          type: Boolean,
          default: true
        },

        paidLeaveTypes: {
          type: [
            String
          ],

          default: []
        }
      },

      lateRules: {
        enabled: {
          type: Boolean,
          default: false
        },

        graceMinutes: {
          type: Number,
          min: 0,
          default: 0
        },

        deductionMethod: {
          type: String,

          enum: [
            "none",
            "per_minute",
            "per_hour",
            "fixed_amount",
            "half_day"
          ],

          default: "none"
        },

        deductionRate: {
          type: Number,
          min: 0,
          default: 0
        }
      },

      overtimeRules: {
        enabled: {
          type: Boolean,
          default: false
        },

        rateMethod: {
          type: String,

          enum: [
            "hourly_rate",
            "salary_multiplier",
            "fixed_per_hour"
          ],

          default:
            "salary_multiplier"
        },

        multiplier: {
          type: Number,
          min: 0,
          default: 1.5
        },

        fixedHourlyRate: {
          type: Number,
          min: 0,
          default: 0
        },

        minimumMinutes: {
          type: Number,
          min: 0,
          default: 0
        },

        maximumMonthlyMinutes: {
          type: Number,
          min: 0,
          default: 0
        }
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Payment Details Schema
|--------------------------------------------------------------------------
*/

const paymentDetailsSchema =
  new mongoose.Schema(
    {
      paymentMethod: {
        type: String,

        enum: [
          "bank_transfer",
          "cash",
          "cheque",
          "mobile_wallet"
        ],

        default: "cash"
      },

      paymentDate: {
        type: Date,
        default: null
      },

      transactionReference: {
        type: String,
        trim: true,

        maxlength: [
          150,
          "Transaction reference cannot exceed 150 characters"
        ],

        default: ""
      },

      bankName: {
        type: String,
        trim: true,

        maxlength: [
          120,
          "Bank name cannot exceed 120 characters"
        ],

        default: ""
      },

      accountTitle: {
        type: String,
        trim: true,

        maxlength: [
          120,
          "Account title cannot exceed 120 characters"
        ],

        default: ""
      },

      maskedAccountNumber: {
        type: String,
        trim: true,

        maxlength: [
          50,
          "Masked account number cannot exceed 50 characters"
        ],

        default: ""
      },

      chequeNumber: {
        type: String,
        trim: true,

        maxlength: [
          80,
          "Cheque number cannot exceed 80 characters"
        ],

        default: ""
      },

      walletProvider: {
        type: String,
        trim: true,

        maxlength: [
          60,
          "Wallet provider cannot exceed 60 characters"
        ],

        default: ""
      },

      maskedWalletNumber: {
        type: String,
        trim: true,

        maxlength: [
          30,
          "Masked wallet number cannot exceed 30 characters"
        ],

        default: ""
      },

      paymentNotes: {
        type: String,
        trim: true,

        maxlength: [
          500,
          "Payment notes cannot exceed 500 characters"
        ],

        default: ""
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Payroll Schema
|--------------------------------------------------------------------------
*/

const payrollSchema =
  new mongoose.Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | School, Staff and Salary Structure
      |--------------------------------------------------------------------------
      */

      schoolId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "School",

        required: [
          true,
          "School is required"
        ],

        index: true
      },

      staffId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Staff",

        required: [
          true,
          "Staff member is required"
        ],

        index: true
      },

      salaryStructureId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "StaffSalaryStructure",

        required: [
          true,
          "Salary structure is required"
        ],

        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Payroll Identification
      |--------------------------------------------------------------------------
      */

      payrollNumber: {
        type: String,
        trim: true,
        uppercase: true,

        maxlength: [
          80,
          "Payroll number cannot exceed 80 characters"
        ],

        default: "",

        index: true
      },

      payslipNumber: {
        type: String,
        trim: true,
        uppercase: true,

        maxlength: [
          80,
          "Payslip number cannot exceed 80 characters"
        ],

        default: "",

        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Payroll Period
      |--------------------------------------------------------------------------
      */

      payrollMonth: {
        type: Number,

        required: [
          true,
          "Payroll month is required"
        ],

        min: [
          1,
          "Payroll month must be between 1 and 12"
        ],

        max: [
          12,
          "Payroll month must be between 1 and 12"
        ],

        index: true
      },

      payrollYear: {
        type: Number,

        required: [
          true,
          "Payroll year is required"
        ],

        min: [
          2000,
          "Payroll year must be 2000 or later"
        ],

        max: [
          2100,
          "Payroll year cannot exceed 2100"
        ],

        index: true
      },

      periodStart: {
        type: Date,

        required: [
          true,
          "Payroll period start date is required"
        ]
      },

      periodEnd: {
        type: Date,

        required: [
          true,
          "Payroll period end date is required"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Historical Staff Snapshots
      |--------------------------------------------------------------------------
      */

      employeeIdSnapshot: {
        type: String,
        trim: true,

        maxlength: [
          60,
          "Employee ID snapshot cannot exceed 60 characters"
        ],

        default: ""
      },

      staffNameSnapshot: {
        type: String,
        trim: true,

        maxlength: [
          120,
          "Staff name snapshot cannot exceed 120 characters"
        ],

        default: ""
      },

      departmentSnapshot: {
        type: String,
        trim: true,

        maxlength: [
          120,
          "Department snapshot cannot exceed 120 characters"
        ],

        default: ""
      },

      designationSnapshot: {
        type: String,
        trim: true,

        maxlength: [
          120,
          "Designation snapshot cannot exceed 120 characters"
        ],

        default: ""
      },

      categorySnapshot: {
        type: String,
        trim: true,

        maxlength: [
          80,
          "Category snapshot cannot exceed 80 characters"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Currency
      |--------------------------------------------------------------------------
      */

      currency: {
        type: String,
        trim: true,
        uppercase: true,
        default: "PKR",

        validate: {
          validator(value) {
            return /^[A-Z]{3}$/.test(
              value
            );
          },

          message:
            "Currency must be a valid 3-letter currency code"
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Calculation Information
      |--------------------------------------------------------------------------
      */

      salaryStructureSnapshot: {
        type:
          salaryStructureSnapshotSchema,

        default: () => ({})
      },

      attendanceSummary: {
        type:
          attendanceSummarySchema,

        default: () => ({})
      },

      salaryRates: {
        type: salaryRateSchema,
        default: () => ({})
      },

      earnings: {
        type: earningsSchema,
        default: () => ({})
      },

      deductions: {
        type:
          deductionBreakdownSchema,

        default: () => ({})
      },

      /*
      |--------------------------------------------------------------------------
      | Final Salary
      |--------------------------------------------------------------------------
      */

      roundingAdjustment: {
        type: Number,
        default: 0
      },

      netSalary: {
        type: Number,
        min: 0,
        default: 0
      },

      /*
      |--------------------------------------------------------------------------
      | Payroll Status
      |--------------------------------------------------------------------------
      */

      status: {
        type: String,

        enum: [
          "draft",
          "generated",
          "pending_approval",
          "approved",
          "rejected",
          "paid",
          "cancelled"
        ],

        default: "draft",

        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Generation Details
      |--------------------------------------------------------------------------
      */

      generatedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: [
          true,
          "Generated by user is required"
        ]
      },

      generatedAt: {
        type: Date,
        default: Date.now
      },

      /*
      |--------------------------------------------------------------------------
      | Approval Workflow
      |--------------------------------------------------------------------------
      */

      submittedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      submittedAt: {
        type: Date,
        default: null
      },

      approvedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      approvedAt: {
        type: Date,
        default: null
      },

      rejectedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      rejectedAt: {
        type: Date,
        default: null
      },

      rejectionReason: {
        type: String,
        trim: true,

        maxlength: [
          500,
          "Rejection reason cannot exceed 500 characters"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Payment Information
      |--------------------------------------------------------------------------
      */

      paymentDetails: {
        type:
          paymentDetailsSchema,

        default: () => ({})
      },

      paidBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      paidAt: {
        type: Date,
        default: null
      },

      /*
      |--------------------------------------------------------------------------
      | Cancellation
      |--------------------------------------------------------------------------
      */

      cancelledBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      cancelledAt: {
        type: Date,
        default: null
      },

      cancellationReason: {
        type: String,
        trim: true,

        maxlength: [
          500,
          "Cancellation reason cannot exceed 500 characters"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Notes
      |--------------------------------------------------------------------------
      */

      payrollNotes: {
        type: String,
        trim: true,

        maxlength: [
          1000,
          "Payroll notes cannot exceed 1000 characters"
        ],

        default: ""
      },

      adjustmentNotes: {
        type: String,
        trim: true,

        maxlength: [
          1000,
          "Adjustment notes cannot exceed 1000 characters"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Audit Information
      |--------------------------------------------------------------------------
      */

      createdBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: [
          true,
          "Created by user is required"
        ]
      },

      updatedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      /*
      |--------------------------------------------------------------------------
      | Soft Delete
      |--------------------------------------------------------------------------
      */

      isDeleted: {
        type: Boolean,
        default: false,
        index: true
      },

      deletedAt: {
        type: Date,
        default: null
      },

      deletedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      }
    },
    {
      timestamps: true,

      toJSON: {
        virtuals: true
      },

      toObject: {
        virtuals: true
      }
    }
  );

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

/*
| ایک staff member کے لیے ایک ہی مہینے کی صرف ایک active payroll ہوگی۔
*/

payrollSchema.index(
  {
    schoolId: 1,
    staffId: 1,
    payrollYear: 1,
    payrollMonth: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_monthly_staff_payroll"
  }
);

payrollSchema.index({
  schoolId: 1,
  payrollYear: -1,
  payrollMonth: -1,
  status: 1,
  isDeleted: 1
});

payrollSchema.index({
  schoolId: 1,
  departmentSnapshot: 1,
  payrollYear: -1,
  payrollMonth: -1
});

payrollSchema.index({
  payrollNumber: 1,
  isDeleted: 1
});

payrollSchema.index({
  payslipNumber: 1,
  isDeleted: 1
});

payrollSchema.index({
  staffNameSnapshot: "text",
  employeeIdSnapshot: "text",
  departmentSnapshot: "text",
  designationSnapshot: "text",
  payrollNumber: "text",
  payslipNumber: "text"
});

/*
|--------------------------------------------------------------------------
| Helper: Normalize Date
|--------------------------------------------------------------------------
*/

const normalizeDate = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
};

/*
|--------------------------------------------------------------------------
| Helper: Safe Number
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Helper: Sum Other Amounts
|--------------------------------------------------------------------------
*/

const sumOtherAmounts = (
  items
) => {
  if (
    !Array.isArray(items)
  ) {
    return 0;
  }

  return items.reduce(
    (
      total,
      item
    ) =>
      total +
      Math.max(
        0,
        safeNumber(
          item?.amount
        )
      ),
    0
  );
};

/*
|--------------------------------------------------------------------------
| Validation and Automatic Calculation
|--------------------------------------------------------------------------
*/

payrollSchema.pre(
  "validate",
  function () {
    /*
    |--------------------------------------------------------------------------
    | Normalize Payroll Period
    |--------------------------------------------------------------------------
    */

    if (this.periodStart) {
      this.periodStart =
        normalizeDate(
          this.periodStart
        );
    }

    if (this.periodEnd) {
      this.periodEnd =
        normalizeDate(
          this.periodEnd
        );
    }

    if (
      this.paymentDetails
        ?.paymentDate
    ) {
      this.paymentDetails
        .paymentDate =
        normalizeDate(
          this.paymentDetails
            .paymentDate
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Payroll Period
    |--------------------------------------------------------------------------
    */

    if (
      this.periodStart &&
      this.periodEnd &&
      this.periodEnd <
        this.periodStart
    ) {
      this.invalidate(
        "periodEnd",
        "Payroll period end date cannot be earlier than start date"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Calculate Allowances
    |--------------------------------------------------------------------------
    */

    const allowances =
      this.earnings
        ?.allowances || {};

    const otherAllowancesTotal =
      sumOtherAmounts(
        allowances.other
      );

    const totalAllowances =
      Math.max(
        0,
        safeNumber(
          allowances.houseRent
        )
      ) +
      Math.max(
        0,
        safeNumber(
          allowances.medical
        )
      ) +
      Math.max(
        0,
        safeNumber(
          allowances.transport
        )
      ) +
      Math.max(
        0,
        safeNumber(
          allowances.food
        )
      ) +
      Math.max(
        0,
        safeNumber(
          allowances.communication
        )
      ) +
      Math.max(
        0,
        safeNumber(
          allowances.special
        )
      ) +
      otherAllowancesTotal;

    this.earnings
      .totalAllowances =
      Number(
        totalAllowances.toFixed(
          2
        )
      );

    /*
    |--------------------------------------------------------------------------
    | Calculate Gross Earnings
    |--------------------------------------------------------------------------
    */

    const directOtherEarnings =
      sumOtherAmounts(
        this.earnings?.other
      );

    const grossEarnings =
      Math.max(
        0,
        safeNumber(
          this.earnings
            ?.basicSalary
        )
      ) +
      totalAllowances +
      Math.max(
        0,
        safeNumber(
          this.earnings
            ?.overtimePay
        )
      ) +
      Math.max(
        0,
        safeNumber(
          this.earnings?.bonus
        )
      ) +
      Math.max(
        0,
        safeNumber(
          this.earnings?.arrears
        )
      ) +
      Math.max(
        0,
        safeNumber(
          this.earnings
            ?.reimbursements
        )
      ) +
      Math.max(
        0,
        safeNumber(
          this.earnings
            ?.incentives
        )
      ) +
      directOtherEarnings;

    this.earnings
      .grossEarnings =
      Number(
        grossEarnings.toFixed(
          2
        )
      );

    /*
    |--------------------------------------------------------------------------
    | Calculate Attendance Deductions
    |--------------------------------------------------------------------------
    */

    const attendanceDeductionsTotal =
      Math.max(
        0,
        safeNumber(
          this.deductions
            ?.absenceDeduction
        )
      ) +
      Math.max(
        0,
        safeNumber(
          this.deductions
            ?.unpaidLeaveDeduction
        )
      ) +
      Math.max(
        0,
        safeNumber(
          this.deductions
            ?.halfDayDeduction
        )
      ) +
      Math.max(
        0,
        safeNumber(
          this.deductions
            ?.lateDeduction
        )
      );

    this.deductions
      .attendanceDeductionsTotal =
      Number(
        attendanceDeductionsTotal.toFixed(
          2
        )
      );

    /*
    |--------------------------------------------------------------------------
    | Calculate Fixed Deductions
    |--------------------------------------------------------------------------
    */

    const otherDeductionsTotal =
      sumOtherAmounts(
        this.deductions?.other
      );

    const fixedDeductionsTotal =
      Math.max(
        0,
        safeNumber(
          this.deductions
            ?.providentFund
        )
      ) +
      Math.max(
        0,
        safeNumber(
          this.deductions?.tax
        )
      ) +
      Math.max(
        0,
        safeNumber(
          this.deductions
            ?.insurance
        )
      ) +
      Math.max(
        0,
        safeNumber(
          this.deductions
            ?.loanInstallment
        )
      ) +
      Math.max(
        0,
        safeNumber(
          this.deductions
            ?.salaryAdvance
        )
      ) +
      otherDeductionsTotal;

    this.deductions
      .fixedDeductionsTotal =
      Number(
        fixedDeductionsTotal.toFixed(
          2
        )
      );

    /*
    |--------------------------------------------------------------------------
    | Calculate Total Deductions
    |--------------------------------------------------------------------------
    */

    const totalDeductions =
      attendanceDeductionsTotal +
      fixedDeductionsTotal;

    this.deductions
      .totalDeductions =
      Number(
        totalDeductions.toFixed(
          2
        )
      );

    /*
    |--------------------------------------------------------------------------
    | Calculate Net Salary
    |--------------------------------------------------------------------------
    */

    const finalNetSalary =
      grossEarnings -
      totalDeductions +
      safeNumber(
        this.roundingAdjustment
      );

    this.netSalary =
      Number(
        Math.max(
          0,
          finalNetSalary
        ).toFixed(2)
      );

    /*
    |--------------------------------------------------------------------------
    | Attendance Summary Validation
    |--------------------------------------------------------------------------
    */

    const standardWorkingDays =
      safeNumber(
        this.attendanceSummary
          ?.standardWorkingDays
      );

    const payableDays =
      safeNumber(
        this.attendanceSummary
          ?.payableDays
      );

    if (
      standardWorkingDays >
        0 &&
      payableDays >
        standardWorkingDays
    ) {
      this.invalidate(
        "attendanceSummary.payableDays",
        "Payable days cannot exceed standard working days"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Approval Validation
    |--------------------------------------------------------------------------
    */

    if (
      [
        "approved",
        "paid"
      ].includes(
        this.status
      ) &&
      !this.approvedBy
    ) {
      this.invalidate(
        "approvedBy",
        "Approved by user is required for approved or paid payroll"
      );
    }

    if (
      [
        "approved",
        "paid"
      ].includes(
        this.status
      ) &&
      !this.approvedAt
    ) {
      this.invalidate(
        "approvedAt",
        "Approval date is required for approved or paid payroll"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Rejection Validation
    |--------------------------------------------------------------------------
    */

    if (
      this.status ===
        "rejected" &&
      !String(
        this.rejectionReason ||
          ""
      ).trim()
    ) {
      this.invalidate(
        "rejectionReason",
        "Rejection reason is required"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Paid Payroll Validation
    |--------------------------------------------------------------------------
    */

    if (
      this.status === "paid"
    ) {
      if (!this.paidBy) {
        this.invalidate(
          "paidBy",
          "Paid by user is required"
        );
      }

      if (!this.paidAt) {
        this.invalidate(
          "paidAt",
          "Payment date and time are required"
        );
      }

      if (
        !this.paymentDetails
          ?.paymentDate
      ) {
        this.invalidate(
          "paymentDetails.paymentDate",
          "Payment date is required"
        );
      }

      const paymentMethod =
        this.paymentDetails
          ?.paymentMethod;

      if (
        paymentMethod ===
          "bank_transfer" &&
        !String(
          this.paymentDetails
            ?.transactionReference ||
            ""
        ).trim()
      ) {
        this.invalidate(
          "paymentDetails.transactionReference",
          "Transaction reference is required for bank transfer"
        );
      }

      if (
        paymentMethod ===
          "cheque" &&
        !String(
          this.paymentDetails
            ?.chequeNumber ||
            ""
        ).trim()
      ) {
        this.invalidate(
          "paymentDetails.chequeNumber",
          "Cheque number is required for cheque payment"
        );
      }

      if (
        paymentMethod ===
          "mobile_wallet" &&
        !String(
          this.paymentDetails
            ?.transactionReference ||
            ""
        ).trim()
      ) {
        this.invalidate(
          "paymentDetails.transactionReference",
          "Transaction reference is required for mobile wallet payment"
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Cancellation Validation
    |--------------------------------------------------------------------------
    */

    if (
      this.status ===
        "cancelled" &&
      !String(
        this.cancellationReason ||
          ""
      ).trim()
    ) {
      this.invalidate(
        "cancellationReason",
        "Cancellation reason is required"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Soft Delete Normalization
    |--------------------------------------------------------------------------
    */

    if (!this.isDeleted) {
      this.deletedAt = null;
      this.deletedBy = null;
    }
  }
);

/*
|--------------------------------------------------------------------------
| Virtual: Payroll Period Label
|--------------------------------------------------------------------------
*/

payrollSchema.virtual(
  "periodLabel"
).get(function () {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  const monthName =
    monthNames[
      Number(
        this.payrollMonth
      ) - 1
    ];

  if (!monthName) {
    return String(
      this.payrollYear ||
        ""
    );
  }

  return `${monthName} ${this.payrollYear}`;
});

/*
|--------------------------------------------------------------------------
| Virtual: Working Hours
|--------------------------------------------------------------------------
*/

payrollSchema.virtual(
  "workingHours"
).get(function () {
  const totalMinutes =
    Math.max(
      0,
      safeNumber(
        this.attendanceSummary
          ?.totalWorkingMinutes
      )
    );

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    Math.round(
      totalMinutes % 60
    );

  return {
    hours,
    minutes,
    formatted:
      `${hours}h ${minutes}m`
  };
});

/*
|--------------------------------------------------------------------------
| Virtual: Overtime Hours
|--------------------------------------------------------------------------
*/

payrollSchema.virtual(
  "overtimeHours"
).get(function () {
  const totalMinutes =
    Math.max(
      0,
      safeNumber(
        this.attendanceSummary
          ?.totalOvertimeMinutes
      )
    );

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    Math.round(
      totalMinutes % 60
    );

  return {
    hours,
    minutes,
    formatted:
      `${hours}h ${minutes}m`
  };
});

/*
|--------------------------------------------------------------------------
| Virtual: Attendance Percentage
|--------------------------------------------------------------------------
*/

payrollSchema.virtual(
  "attendancePercentage"
).get(function () {
  const standardWorkingDays =
    safeNumber(
      this.attendanceSummary
        ?.standardWorkingDays
    );

  if (
    standardWorkingDays <= 0
  ) {
    return 0;
  }

  const payableDays =
    safeNumber(
      this.attendanceSummary
        ?.payableDays
    );

  return Number(
    Math.min(
      100,
      (
        payableDays /
        standardWorkingDays
      ) * 100
    ).toFixed(2)
  );
});

/*
|--------------------------------------------------------------------------
| Virtual: Outstanding Amount
|--------------------------------------------------------------------------
*/

payrollSchema.virtual(
  "outstandingAmount"
).get(function () {
  if (
    this.status === "paid"
  ) {
    return 0;
  }

  return Math.max(
    0,
    safeNumber(
      this.netSalary
    )
  );
});

/*
|--------------------------------------------------------------------------
| Model Export
|--------------------------------------------------------------------------
*/

const Payroll =
  mongoose.model(
    "Payroll",
    payrollSchema
  );

module.exports = Payroll;