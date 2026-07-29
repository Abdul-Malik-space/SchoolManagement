const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Leave Attachment Schema
|--------------------------------------------------------------------------
*/

const leaveAttachmentSchema =
  new mongoose.Schema(
    {
      fileName: {
        type: String,
        trim: true,
        maxlength: 200
      },

      fileUrl: {
        type: String,
        trim: true,
        maxlength: 1000
      },

      fileType: {
        type: String,
        trim: true,
        maxlength: 100
      },

      fileSize: {
        type: Number,
        min: 0,
        default: 0
      },

      uploadedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",
        default: null
      },

      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    {
      _id: true
    }
  );

/*
|--------------------------------------------------------------------------
| Leave Balance Snapshot Schema
|--------------------------------------------------------------------------
|
| Leave approve ہوتے وقت balance information محفوظ کی جا سکتی ہے تاکہ
| بعد میں leave policy بدلنے سے پرانی application کا record متاثر نہ ہو۔
|
*/

const leaveBalanceSnapshotSchema =
  new mongoose.Schema(
    {
      openingBalance: {
        type: Number,
        min: 0,
        default: 0
      },

      usedBefore: {
        type: Number,
        min: 0,
        default: 0
      },

      availableBefore: {
        type: Number,
        min: 0,
        default: 0
      },

      currentLeaveDays: {
        type: Number,
        min: 0,
        default: 0
      },

      remainingAfter: {
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
| Attendance Synchronization Schema
|--------------------------------------------------------------------------
|
| Approved leave کو Staff Attendance records سے sync کرنے کی حالت محفوظ
| کرتا ہے۔
|
*/

const attendanceSyncSchema =
  new mongoose.Schema(
    {
      status: {
        type: String,

        enum: [
          "not_required",
          "pending",
          "synced",
          "failed"
        ],

        default: "not_required"
      },

      attendanceRecordIds: [
        {
          type:
            mongoose.Schema.Types
              .ObjectId,

          ref: "StaffAttendance"
        }
      ],

      recordsCreated: {
        type: Number,
        min: 0,
        default: 0
      },

      recordsUpdated: {
        type: Number,
        min: 0,
        default: 0
      },

      syncedAt: {
        type: Date,
        default: null
      },

      syncedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",
        default: null
      },

      errorMessage: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ""
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Payroll Impact Schema
|--------------------------------------------------------------------------
|
| Payroll generation کے وقت leave paid، unpaid یا partially paid ہو سکتی
| ہے۔ اس calculation کا record یہاں محفوظ ہوگا۔
|
*/

const payrollImpactSchema =
  new mongoose.Schema(
    {
      payType: {
        type: String,

        enum: [
          "paid",
          "unpaid",
          "partial_paid"
        ],

        default: "paid"
      },

      payPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
      },

      isProcessed: {
        type: Boolean,
        default: false
      },

      payrollId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Payroll",
        default: null
      },

      processedAt: {
        type: Date,
        default: null
      },

      processedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",
        default: null
      },

      deductionAmount: {
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
| Staff Leave Schema
|--------------------------------------------------------------------------
*/

const staffLeaveSchema =
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
          "School is required."
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
          "Staff member is required."
        ],

        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Application Identification
      |--------------------------------------------------------------------------
      */

      applicationNumber: {
        type: String,

        required: [
          true,
          "Leave application number is required."
        ],

        trim: true,
        uppercase: true,
        maxlength: 50
      },

      leaveYear: {
        type: Number,
        min: 2000,
        max: 2100,
        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Staff Snapshot
      |--------------------------------------------------------------------------
      |
      | Staff record بعد میں update یا delete ہونے کی صورت میں پرانا leave
      | record پھر بھی readable رہے گا۔
      |
      */

      employeeIdSnapshot: {
        type: String,
        trim: true,
        maxlength: 100,
        default: ""
      },

      staffNameSnapshot: {
        type: String,
        trim: true,
        maxlength: 200,
        default: ""
      },

      departmentSnapshot: {
        type: String,
        trim: true,
        maxlength: 150,
        default: ""
      },

      designationSnapshot: {
        type: String,
        trim: true,
        maxlength: 150,
        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Leave Information
      |--------------------------------------------------------------------------
      */

      leaveType: {
        type: String,

        enum: [
          "casual",
          "sick",
          "annual",
          "emergency",
          "maternity",
          "paternity",
          "bereavement",
          "study",
          "unpaid",
          "other"
        ],

        required: [
          true,
          "Leave type is required."
        ],

        index: true
      },

      customLeaveType: {
        type: String,
        trim: true,
        maxlength: 100,
        default: ""
      },

      dayType: {
        type: String,

        enum: [
          "full_day",
          "half_day"
        ],

        default: "full_day"
      },

      halfDaySession: {
        type: String,

        enum: [
          "first_half",
          "second_half",
          null
        ],

        default: null
      },

      startDate: {
        type: Date,

        required: [
          true,
          "Leave start date is required."
        ],

        index: true
      },

      endDate: {
        type: Date,

        required: [
          true,
          "Leave end date is required."
        ],

        index: true
      },

      calendarDays: {
        type: Number,
        min: 0.5,
        default: 1
      },

      totalDays: {
        type: Number,

        required: [
          true,
          "Total leave days are required."
        ],

        min: [
          0.5,
          "Leave duration must be at least half a day."
        ],

        validate: {
          validator(value) {
            return (
              Number(value) * 2
            ) % 1 === 0;
          },

          message:
            "Leave duration must be in full-day or half-day increments."
        }
      },

      reason: {
        type: String,

        required: [
          true,
          "Leave reason is required."
        ],

        trim: true,
        minlength: [
          3,
          "Leave reason must contain at least 3 characters."
        ],

        maxlength: [
          2000,
          "Leave reason cannot exceed 2000 characters."
        ]
      },

      emergencyContact: {
        name: {
          type: String,
          trim: true,
          maxlength: 150,
          default: ""
        },

        phone: {
          type: String,
          trim: true,
          maxlength: 30,
          default: ""
        },

        relationship: {
          type: String,
          trim: true,
          maxlength: 100,
          default: ""
        }
      },

      handoverNotes: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ""
      },

      attachments: {
        type: [
          leaveAttachmentSchema
        ],

        default: []
      },

      /*
      |--------------------------------------------------------------------------
      | Request Source
      |--------------------------------------------------------------------------
      */

      requestSource: {
        type: String,

        enum: [
          "admin",
          "staff_portal"
        ],

        default: "admin"
      },

      requestedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",
        default: null
      },

      requestedAt: {
        type: Date,
        default: Date.now
      },

      /*
      |--------------------------------------------------------------------------
      | Approval Workflow
      |--------------------------------------------------------------------------
      */

      status: {
        type: String,

        enum: [
          "pending",
          "approved",
          "rejected",
          "cancelled"
        ],

        default: "pending",
        index: true
      },

      approvalNotes: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ""
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

      rejectionReason: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ""
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

      cancellationReason: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ""
      },

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

      /*
      |--------------------------------------------------------------------------
      | Leave Balance and Payroll
      |--------------------------------------------------------------------------
      */

      balanceSnapshot: {
        type:
          leaveBalanceSnapshotSchema,

        default: () => ({})
      },

      payrollImpact: {
        type:
          payrollImpactSchema,

        default: () => ({})
      },

      attendanceSync: {
        type:
          attendanceSyncSchema,

        default: () => ({})
      },

      /*
      |--------------------------------------------------------------------------
      | Administrative Notes
      |--------------------------------------------------------------------------
      */

      internalNotes: {
        type: String,
        trim: true,
        maxlength: 3000,
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
          "Created-by user is required."
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
| Schema Validation and Automatic Values
|--------------------------------------------------------------------------
*/

staffLeaveSchema.pre(
  "validate",
  function validateStaffLeave() {
    /*
    |--------------------------------------------------------------------------
    | Normalize Dates
    |--------------------------------------------------------------------------
    */

    if (this.startDate) {
      const startDate = new Date(this.startDate);
      startDate.setHours(0, 0, 0, 0);
      this.startDate = startDate;
    }

    if (this.endDate) {
      const endDate = new Date(this.endDate);
      endDate.setHours(0, 0, 0, 0);
      this.endDate = endDate;
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Date Range
    |--------------------------------------------------------------------------
    */

    if (
      this.startDate &&
      this.endDate &&
      this.endDate < this.startDate
    ) {
      throw new Error(
        "Leave end date cannot be earlier than the start date."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Leave Year
    |--------------------------------------------------------------------------
    */

    if (this.startDate) {
      this.leaveYear = this.startDate.getFullYear();
    }

    /*
    |--------------------------------------------------------------------------
    | Calendar Days
    |--------------------------------------------------------------------------
    */

    if (this.startDate && this.endDate) {
      const millisecondsPerDay = 24 * 60 * 60 * 1000;

      this.calendarDays =
        Math.floor(
          (this.endDate.getTime() - this.startDate.getTime()) /
            millisecondsPerDay
        ) + 1;
    }

    /*
    |--------------------------------------------------------------------------
    | Half-Day Validation
    |--------------------------------------------------------------------------
    */

    if (this.dayType === "half_day") {
      if (
        this.startDate &&
        this.endDate &&
        this.startDate.getTime() !== this.endDate.getTime()
      ) {
        throw new Error(
          "Half-day leave must have the same start and end date."
        );
      }

      if (!this.halfDaySession) {
        throw new Error("Half-day session is required.");
      }

      this.calendarDays = 0.5;
      this.totalDays = 0.5;
    } else {
      this.halfDaySession = null;

      if (!this.totalDays || this.totalDays < 1) {
        this.totalDays = this.calendarDays;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Other Leave Type Validation
    |--------------------------------------------------------------------------
    */

    if (
      this.leaveType === "other" &&
      !String(this.customLeaveType || "").trim()
    ) {
      throw new Error(
        "Custom leave type is required when leave type is Other."
      );
    }

    if (this.leaveType !== "other") {
      this.customLeaveType = "";
    }

    /*
    |--------------------------------------------------------------------------
    | Payroll Pay Rules
    |--------------------------------------------------------------------------
    */

    if (!this.payrollImpact) {
      this.payrollImpact = {};
    }

    if (this.leaveType === "unpaid") {
      this.payrollImpact.payType = "unpaid";
      this.payrollImpact.payPercentage = 0;
    }

    if (this.payrollImpact.payType === "paid") {
      this.payrollImpact.payPercentage = 100;
    }

    if (this.payrollImpact.payType === "unpaid") {
      this.payrollImpact.payPercentage = 0;
    }

    if (
      this.payrollImpact.payType === "partial_paid" &&
      (
        Number(this.payrollImpact.payPercentage) <= 0 ||
        Number(this.payrollImpact.payPercentage) >= 100
      )
    ) {
      throw new Error(
        "Partial paid leave percentage must be greater than 0 and less than 100."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Workflow Validation
    |--------------------------------------------------------------------------
    */

    if (this.status === "approved" && !this.approvedBy) {
      throw new Error(
        "Approved-by user is required for approved leave."
      );
    }

    if (
      this.status === "rejected" &&
      !String(this.rejectionReason || "").trim()
    ) {
      throw new Error(
        "Rejection reason is required for rejected leave."
      );
    }

    if (
      this.status === "cancelled" &&
      !String(this.cancellationReason || "").trim()
    ) {
      throw new Error(
        "Cancellation reason is required for cancelled leave."
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| Virtual Fields
|--------------------------------------------------------------------------
*/

staffLeaveSchema.virtual(
  "durationLabel"
).get(function getDurationLabel() {
  if (
    this.dayType ===
    "half_day"
  ) {
    return this.halfDaySession ===
      "first_half"
      ? "Half Day - First Half"
      : "Half Day - Second Half";
  }

  return `${this.totalDays} ${
    this.totalDays === 1
      ? "Day"
      : "Days"
  }`;
});

staffLeaveSchema.virtual(
  "isPending"
).get(function getIsPending() {
  return (
    this.status ===
    "pending"
  );
});

staffLeaveSchema.virtual(
  "isApproved"
).get(function getIsApproved() {
  return (
    this.status ===
    "approved"
  );
});

staffLeaveSchema.virtual(
  "isPaidLeave"
).get(function getIsPaidLeave() {
  return (
    this.payrollImpact
      ?.payType ===
    "paid"
  );
});

staffLeaveSchema.virtual(
  "displayLeaveType"
).get(function getDisplayLeaveType() {
  if (
    this.leaveType ===
    "other"
  ) {
    return (
      this.customLeaveType ||
      "Other"
    );
  }

  return this.leaveType;
});

/*
|--------------------------------------------------------------------------
| Database Indexes
|--------------------------------------------------------------------------
*/

/*
| ہر school کے اندر application number unique رہے گا۔
*/

staffLeaveSchema.index(
  {
    schoolId: 1,
    applicationNumber: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    }
  }
);

/*
| Staff leave history اور overlapping leave checks کے لیے۔
*/

staffLeaveSchema.index({
  schoolId: 1,
  staffId: 1,
  startDate: 1,
  endDate: 1,
  isDeleted: 1
});

/*
| Status-based listing اور approval queue کے لیے۔
*/

staffLeaveSchema.index({
  schoolId: 1,
  status: 1,
  startDate: -1,
  isDeleted: 1
});

/*
| Leave reports کے لیے۔
*/

staffLeaveSchema.index({
  schoolId: 1,
  leaveYear: 1,
  leaveType: 1,
  status: 1,
  isDeleted: 1
});

/*
| Payroll processing کے لیے۔
*/

staffLeaveSchema.index({
  schoolId: 1,
  staffId: 1,
  status: 1,
  "payrollImpact.isProcessed": 1,
  startDate: 1,
  endDate: 1
});

/*
|--------------------------------------------------------------------------
| Model Export
|--------------------------------------------------------------------------
*/

const StaffLeave =
  mongoose.model(
    "StaffLeave",
    staffLeaveSchema
  );

module.exports =
  StaffLeave;