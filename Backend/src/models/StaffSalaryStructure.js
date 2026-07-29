const mongoose = require(
  "mongoose"
);

/*
|--------------------------------------------------------------------------
| Reusable Other Allowance Schema
|--------------------------------------------------------------------------
*/

const otherAllowanceSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: [
          true,
          "Allowance name is required"
        ],
        trim: true,
        maxlength: [
          80,
          "Allowance name cannot exceed 80 characters"
        ]
      },

      amount: {
        type: Number,
        required: [
          true,
          "Allowance amount is required"
        ],
        min: [
          0,
          "Allowance amount cannot be negative"
        ],
        default: 0
      },

      isTaxable: {
        type: Boolean,
        default: false
      }
    },
    {
      _id: true
    }
  );

/*
|--------------------------------------------------------------------------
| Reusable Other Deduction Schema
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
          80,
          "Deduction name cannot exceed 80 characters"
        ]
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

      deductionType: {
        type: String,
        enum: [
          "fixed",
          "percentage"
        ],
        default: "fixed"
      },

      percentageOf: {
        type: String,
        enum: [
          "basic_salary",
          "gross_salary"
        ],
        default: "basic_salary"
      }
    },
    {
      _id: true
    }
  );

/*
|--------------------------------------------------------------------------
| Bank Details Schema
|--------------------------------------------------------------------------
*/

const bankDetailsSchema =
  new mongoose.Schema(
    {
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

      accountNumber: {
        type: String,
        trim: true,
        maxlength: [
          80,
          "Account number cannot exceed 80 characters"
        ],
        default: ""
      },

      iban: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [
          40,
          "IBAN cannot exceed 40 characters"
        ],
        default: ""
      },

      branchCode: {
        type: String,
        trim: true,
        maxlength: [
          30,
          "Branch code cannot exceed 30 characters"
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

      walletNumber: {
        type: String,
        trim: true,
        maxlength: [
          30,
          "Wallet number cannot exceed 30 characters"
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
| Staff Salary Structure Schema
|--------------------------------------------------------------------------
*/

const staffSalaryStructureSchema =
  new mongoose.Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | School and Staff
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

      /*
      |--------------------------------------------------------------------------
      | Historical Staff Snapshots
      |--------------------------------------------------------------------------
      |
      | Staff record بعد میں update یا delete ہونے کی صورت میں بھی salary
      | structure میں بنیادی معلومات محفوظ رہیں گی۔
      |
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

      /*
      |--------------------------------------------------------------------------
      | Currency and Pay Frequency
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
            "Currency must be a valid 3-letter code"
        }
      },

      payFrequency: {
        type: String,
        enum: [
          "monthly"
        ],
        default: "monthly"
      },

      /*
      |--------------------------------------------------------------------------
      | Base Salary
      |--------------------------------------------------------------------------
      */

      basicSalary: {
        type: Number,

        required: [
          true,
          "Basic salary is required"
        ],

        min: [
          0,
          "Basic salary cannot be negative"
        ],

        default: 0
      },

      /*
      |--------------------------------------------------------------------------
      | Fixed Allowances
      |--------------------------------------------------------------------------
      */

      allowances: {
        houseRent: {
          type: Number,
          min: [
            0,
            "House rent allowance cannot be negative"
          ],
          default: 0
        },

        medical: {
          type: Number,
          min: [
            0,
            "Medical allowance cannot be negative"
          ],
          default: 0
        },

        transport: {
          type: Number,
          min: [
            0,
            "Transport allowance cannot be negative"
          ],
          default: 0
        },

        food: {
          type: Number,
          min: [
            0,
            "Food allowance cannot be negative"
          ],
          default: 0
        },

        communication: {
          type: Number,
          min: [
            0,
            "Communication allowance cannot be negative"
          ],
          default: 0
        },

        special: {
          type: Number,
          min: [
            0,
            "Special allowance cannot be negative"
          ],
          default: 0
        },

        other: {
          type: [
            otherAllowanceSchema
          ],
          default: []
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Fixed Deductions
      |--------------------------------------------------------------------------
      */

      deductions: {
        providentFund: {
          type: Number,
          min: [
            0,
            "Provident fund deduction cannot be negative"
          ],
          default: 0
        },

        tax: {
          type: Number,
          min: [
            0,
            "Tax deduction cannot be negative"
          ],
          default: 0
        },

        insurance: {
          type: Number,
          min: [
            0,
            "Insurance deduction cannot be negative"
          ],
          default: 0
        },

        loanInstallment: {
          type: Number,
          min: [
            0,
            "Loan installment cannot be negative"
          ],
          default: 0
        },

        other: {
          type: [
            otherDeductionSchema
          ],
          default: []
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Salary Calculation Basis
      |--------------------------------------------------------------------------
      */

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

        min: [
          1,
          "Fixed working days must be at least 1"
        ],

        max: [
          31,
          "Fixed working days cannot exceed 31"
        ],

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

      /*
      |--------------------------------------------------------------------------
      | Attendance Rules
      |--------------------------------------------------------------------------
      */

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

          enum: [
            "casual",
            "sick",
            "annual",
            "emergency",
            "other"
          ],

          default: [
            "casual",
            "sick",
            "annual"
          ]
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Late Arrival Rules
      |--------------------------------------------------------------------------
      */

      lateRules: {
        enabled: {
          type: Boolean,
          default: false
        },

        graceMinutes: {
          type: Number,

          min: [
            0,
            "Late grace minutes cannot be negative"
          ],

          max: [
            240,
            "Late grace minutes cannot exceed 240 minutes"
          ],

          default: 15
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

          min: [
            0,
            "Late deduction rate cannot be negative"
          ],

          default: 0
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Overtime Rules
      |--------------------------------------------------------------------------
      */

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

          min: [
            0,
            "Overtime multiplier cannot be negative"
          ],

          max: [
            10,
            "Overtime multiplier cannot exceed 10"
          ],

          default: 1.5
        },

        fixedHourlyRate: {
          type: Number,

          min: [
            0,
            "Fixed overtime hourly rate cannot be negative"
          ],

          default: 0
        },

        minimumMinutes: {
          type: Number,

          min: [
            0,
            "Minimum overtime minutes cannot be negative"
          ],

          max: [
            1440,
            "Minimum overtime minutes cannot exceed 1440"
          ],

          default: 30
        },

        maximumMonthlyMinutes: {
          type: Number,

          min: [
            0,
            "Maximum monthly overtime minutes cannot be negative"
          ],

          default: 0
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Payment Information
      |--------------------------------------------------------------------------
      */

      paymentMethod: {
        type: String,

        enum: [
          "bank_transfer",
          "cash",
          "cheque",
          "mobile_wallet"
        ],

        default: "bank_transfer"
      },

      bankDetails: {
        type: bankDetailsSchema,
        default: () => ({})
      },

      /*
      |--------------------------------------------------------------------------
      | Effective Period
      |--------------------------------------------------------------------------
      */

      effectiveFrom: {
        type: Date,
        required: [
          true,
          "Effective start date is required"
        ],
        default: Date.now
      },

      effectiveTo: {
        type: Date,
        default: null
      },

      status: {
        type: String,

        enum: [
          "active",
          "inactive"
        ],

        default: "active",

        index: true
      },

      notes: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "Notes cannot exceed 1000 characters"
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
| ایک active staff member کے لیے صرف ایک non-deleted salary structure
| موجود ہوگا۔
*/

staffSalaryStructureSchema.index(
  {
    schoolId: 1,
    staffId: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_staff_salary_structure"
  }
);

staffSalaryStructureSchema.index({
  schoolId: 1,
  status: 1,
  isDeleted: 1
});

staffSalaryStructureSchema.index({
  schoolId: 1,
  effectiveFrom: -1
});

staffSalaryStructureSchema.index({
  staffNameSnapshot: "text",
  employeeIdSnapshot: "text",
  departmentSnapshot: "text",
  designationSnapshot: "text"
});

/*
|--------------------------------------------------------------------------
| Date Normalization Helper
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
| Validation and Normalization Middleware
|--------------------------------------------------------------------------
*/

staffSalaryStructureSchema.pre(
  "validate",
  function () {
    /*
    |--------------------------------------------------------------------------
    | Normalize Effective Dates
    |--------------------------------------------------------------------------
    */

    if (this.effectiveFrom) {
      this.effectiveFrom =
        normalizeDate(
          this.effectiveFrom
        );
    }

    if (this.effectiveTo) {
      this.effectiveTo =
        normalizeDate(
          this.effectiveTo
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Effective Period
    |--------------------------------------------------------------------------
    */

    if (
      this.effectiveFrom &&
      this.effectiveTo &&
      this.effectiveTo <
        this.effectiveFrom
    ) {
      this.invalidate(
        "effectiveTo",
        "Effective end date cannot be earlier than effective start date"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Fixed Working Days Validation
    |--------------------------------------------------------------------------
    */

    if (
      this.workingDaysMethod ===
        "fixed_working_days" &&
      (
        !this.fixedWorkingDays ||
        this.fixedWorkingDays <
          1
      )
    ) {
      this.invalidate(
        "fixedWorkingDays",
        "Fixed working days are required for fixed working day calculation"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Late Rule Validation
    |--------------------------------------------------------------------------
    */

    if (
      this.lateRules?.enabled &&
      this.lateRules
        .deductionMethod ===
        "fixed_amount" &&
      Number(
        this.lateRules
          .deductionRate || 0
      ) <= 0
    ) {
      this.invalidate(
        "lateRules.deductionRate",
        "Late deduction rate must be greater than zero for fixed amount deduction"
      );
    }

    if (
      !this.lateRules?.enabled
    ) {
      this.lateRules.deductionMethod =
        "none";

      this.lateRules.deductionRate =
        0;
    }

    /*
    |--------------------------------------------------------------------------
    | Overtime Rule Validation
    |--------------------------------------------------------------------------
    */

    if (
      this.overtimeRules?.enabled &&
      this.overtimeRules
        .rateMethod ===
        "fixed_per_hour" &&
      Number(
        this.overtimeRules
          .fixedHourlyRate || 0
      ) <= 0
    ) {
      this.invalidate(
        "overtimeRules.fixedHourlyRate",
        "Fixed overtime hourly rate must be greater than zero"
      );
    }

    if (
      this.overtimeRules?.enabled &&
      this.overtimeRules
        .rateMethod ===
        "salary_multiplier" &&
      Number(
        this.overtimeRules
          .multiplier || 0
      ) <= 0
    ) {
      this.invalidate(
        "overtimeRules.multiplier",
        "Overtime multiplier must be greater than zero"
      );
    }

    if (
      !this.overtimeRules?.enabled
    ) {
      this.overtimeRules
        .fixedHourlyRate = 0;
    }

    /*
    |--------------------------------------------------------------------------
    | Bank Payment Validation
    |--------------------------------------------------------------------------
    */

    if (
      this.paymentMethod ===
        "bank_transfer" &&
      !this.bankDetails
        ?.accountNumber &&
      !this.bankDetails?.iban
    ) {
      this.invalidate(
        "bankDetails.accountNumber",
        "Account number or IBAN is required for bank transfer"
      );
    }

    if (
      this.paymentMethod ===
        "mobile_wallet" &&
      !this.bankDetails
        ?.walletNumber
    ) {
      this.invalidate(
        "bankDetails.walletNumber",
        "Wallet number is required for mobile wallet payment"
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
| Virtual: Fixed Allowances Total
|--------------------------------------------------------------------------
*/

staffSalaryStructureSchema.virtual(
  "fixedAllowancesTotal"
).get(function () {
  const allowances =
    this.allowances || {};

  const otherAllowances =
    Array.isArray(
      allowances.other
    )
      ? allowances.other.reduce(
          (
            total,
            allowance
          ) =>
            total +
            Number(
              allowance.amount ||
                0
            ),
          0
        )
      : 0;

  return (
    Number(
      allowances.houseRent ||
        0
    ) +
    Number(
      allowances.medical ||
        0
    ) +
    Number(
      allowances.transport ||
        0
    ) +
    Number(
      allowances.food || 0
    ) +
    Number(
      allowances.communication ||
        0
    ) +
    Number(
      allowances.special ||
        0
    ) +
    otherAllowances
  );
});

/*
|--------------------------------------------------------------------------
| Virtual: Gross Salary
|--------------------------------------------------------------------------
*/

staffSalaryStructureSchema.virtual(
  "grossSalary"
).get(function () {
  return (
    Number(
      this.basicSalary || 0
    ) +
    Number(
      this.fixedAllowancesTotal ||
        0
    )
  );
});

/*
|--------------------------------------------------------------------------
| Virtual: Fixed Deductions Total
|--------------------------------------------------------------------------
*/

staffSalaryStructureSchema.virtual(
  "fixedDeductionsTotal"
).get(function () {
  const deductions =
    this.deductions || {};

  const grossSalary =
    Number(
      this.grossSalary || 0
    );

  const basicSalary =
    Number(
      this.basicSalary || 0
    );

  const otherDeductions =
    Array.isArray(
      deductions.other
    )
      ? deductions.other.reduce(
          (
            total,
            deduction
          ) => {
            if (
              deduction.deductionType ===
              "percentage"
            ) {
              const baseAmount =
                deduction.percentageOf ===
                "gross_salary"
                  ? grossSalary
                  : basicSalary;

              return (
                total +
                (
                  baseAmount *
                  Number(
                    deduction.amount ||
                      0
                  )
                ) /
                  100
              );
            }

            return (
              total +
              Number(
                deduction.amount ||
                  0
              )
            );
          },
          0
        )
      : 0;

  return (
    Number(
      deductions.providentFund ||
        0
    ) +
    Number(
      deductions.tax || 0
    ) +
    Number(
      deductions.insurance ||
        0
    ) +
    Number(
      deductions.loanInstallment ||
        0
    ) +
    otherDeductions
  );
});

/*
|--------------------------------------------------------------------------
| Virtual: Estimated Net Salary
|--------------------------------------------------------------------------
*/

staffSalaryStructureSchema.virtual(
  "estimatedNetSalary"
).get(function () {
  return Math.max(
    0,
    Number(
      this.grossSalary || 0
    ) -
      Number(
        this.fixedDeductionsTotal ||
          0
      )
  );
});

/*
|--------------------------------------------------------------------------
| Virtual: Daily Salary Rate
|--------------------------------------------------------------------------
*/

staffSalaryStructureSchema.virtual(
  "dailySalaryRate"
).get(function () {
  const workingDays =
    Number(
      this.fixedWorkingDays ||
        0
    );

  if (workingDays <= 0) {
    return 0;
  }

  const baseAmount =
    this.dailyRateBasis ===
    "gross_salary"
      ? Number(
          this.grossSalary || 0
        )
      : Number(
          this.basicSalary || 0
        );

  return (
    baseAmount /
    workingDays
  );
});

/*
|--------------------------------------------------------------------------
| Virtual: Hourly Salary Rate
|--------------------------------------------------------------------------
*/

staffSalaryStructureSchema.virtual(
  "hourlySalaryRate"
).get(function () {
  const dailyRate =
    Number(
      this.dailySalaryRate ||
        0
    );

  /*
  | Standard professional payroll calculation کے لیے 8 working hours
  | روزانہ استعمال کیے جا رہے ہیں۔
  */

  return dailyRate / 8;
});

/*
|--------------------------------------------------------------------------
| Model Export
|--------------------------------------------------------------------------
*/

const StaffSalaryStructure =
  mongoose.model(
    "StaffSalaryStructure",
    staffSalaryStructureSchema
  );

module.exports =
  StaffSalaryStructure;