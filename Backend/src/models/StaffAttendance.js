const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Attendance Options
|--------------------------------------------------------------------------
*/

const STAFF_ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "leave",
  "half_day"
];

const LEAVE_TYPES = [
  "casual",
  "sick",
  "annual",
  "unpaid",
  "emergency",
  "other"
];

/*
|--------------------------------------------------------------------------
| Helper: Normalize Attendance Date
|--------------------------------------------------------------------------
|
| Attendance date کو UTC midnight پر محفوظ کیا جائے گا تاکہ timezone کی
| وجہ سے ایک ہی دن کی مختلف dates create نہ ہوں۔
|
*/

const normalizeAttendanceDate = (
  value
) => {
  if (!value) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | YYYY-MM-DD Input
  |--------------------------------------------------------------------------
  */

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    const [
      year,
      month,
      day
    ] = value
      .split("-")
      .map(Number);

    return new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Date Object or Full Date-Time
  |--------------------------------------------------------------------------
  */

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
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
| Helper: Convert Time into Minutes
|--------------------------------------------------------------------------
*/

const timeToMinutes = (
  value
) => {
  if (
    !value ||
    !/^\d{2}:\d{2}$/.test(value)
  ) {
    return null;
  }

  const [
    hours,
    minutes
  ] = value
    .split(":")
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
};

/*
|--------------------------------------------------------------------------
| Staff Attendance Schema
|--------------------------------------------------------------------------
*/

const staffAttendanceSchema =
  new mongoose.Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | School
      |--------------------------------------------------------------------------
      */

      schoolId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "School",

        required: [
          true,
          "School ID is required"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Staff Member
      |--------------------------------------------------------------------------
      |
      | یہ صرف Staff model کے non-teaching employee سے link ہوگا۔
      |
      */

      staffId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Staff",

        required: [
          true,
          "Staff member is required"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Attendance Date
      |--------------------------------------------------------------------------
      */

      attendanceDate: {
        type: Date,

        required: [
          true,
          "Attendance date is required"
        ],

        default: () =>
          normalizeAttendanceDate(
            new Date()
          )
      },

      /*
      |--------------------------------------------------------------------------
      | Attendance Status
      |--------------------------------------------------------------------------
      */

      status: {
        type: String,

        enum: {
          values:
            STAFF_ATTENDANCE_STATUSES,

          message:
            "Attendance status must be present, absent, late, leave or half day"
        },

        required: [
          true,
          "Attendance status is required"
        ],

        default: "present"
      },

      /*
      |--------------------------------------------------------------------------
      | Check-In and Check-Out
      |--------------------------------------------------------------------------
      |
      | Time format: HH:mm
      | Example: 08:30 or 16:45
      |
      */

      checkInTime: {
        type: String,

        trim: true,

        match: [
          /^([01]\d|2[0-3]):[0-5]\d$/,
          "Check-in time must use HH:mm format"
        ],

        default: ""
      },

      checkOutTime: {
        type: String,

        trim: true,

        match: [
          /^([01]\d|2[0-3]):[0-5]\d$/,
          "Check-out time must use HH:mm format"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Break and Overtime
      |--------------------------------------------------------------------------
      */

      breakMinutes: {
        type: Number,

        min: [
          0,
          "Break minutes cannot be negative"
        ],

        default: 0
      },

      overtimeMinutes: {
        type: Number,

        min: [
          0,
          "Overtime minutes cannot be negative"
        ],

        default: 0
      },

      lateMinutes: {
        type: Number,

        min: [
          0,
          "Late minutes cannot be negative"
        ],

        default: 0
      },

      /*
      |--------------------------------------------------------------------------
      | Leave Information
      |--------------------------------------------------------------------------
      */

      leaveType: {
        type: String,

        enum: {
          values: [
            "",
            ...LEAVE_TYPES
          ],

          message:
            "Invalid leave type"
        },

        default: ""
      },

      leaveReason: {
        type: String,

        trim: true,

        maxlength: [
          500,
          "Leave reason cannot exceed 500 characters"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Staff Information Snapshot
      |--------------------------------------------------------------------------
      |
      | Department یا designation بعد میں تبدیل ہونے کے باوجود پرانے attendance
      | report میں historical information محفوظ رہے گی۔
      |
      */

      employeeIdSnapshot: {
        type: String,
        trim: true,
        default: ""
      },

      staffNameSnapshot: {
        type: String,
        trim: true,
        default: ""
      },

      departmentSnapshot: {
        type: String,
        trim: true,
        default: ""
      },

      designationSnapshot: {
        type: String,
        trim: true,
        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Remarks
      |--------------------------------------------------------------------------
      */

      remarks: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Attendance remarks cannot exceed 1000 characters"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Record Tracking
      |--------------------------------------------------------------------------
      */

      markedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: [
          true,
          "Attendance marker is required"
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
        default: false
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
      timestamps: true
    }
  );

/*
|--------------------------------------------------------------------------
| Database Indexes
|--------------------------------------------------------------------------
*/

/*
| ایک staff member کی ایک date پر صرف ایک attendance record ہوگا۔
*/

staffAttendanceSchema.index(
  {
    schoolId: 1,
    staffId: 1,
    attendanceDate: 1
  },
  {
    unique: true,

    name:
      "unique_staff_daily_attendance"
  }
);

/*
| Daily school attendance listing.
*/

staffAttendanceSchema.index(
  {
    schoolId: 1,
    attendanceDate: -1,
    isDeleted: 1
  },
  {
    name:
      "staff_attendance_daily_listing"
  }
);

/*
| Staff monthly attendance report.
*/

staffAttendanceSchema.index(
  {
    schoolId: 1,
    staffId: 1,
    attendanceDate: -1,
    isDeleted: 1
  },
  {
    name:
      "staff_monthly_attendance_report"
  }
);

/*
| Status-based reporting.
*/

staffAttendanceSchema.index(
  {
    schoolId: 1,
    status: 1,
    attendanceDate: -1,
    isDeleted: 1
  },
  {
    name:
      "staff_attendance_status_report"
  }
);

/*
|--------------------------------------------------------------------------
| Normalize Attendance Data
|--------------------------------------------------------------------------
*/

staffAttendanceSchema.pre(
  "validate",
  function () {
    /*
    |--------------------------------------------------------------------------
    | Normalize Date
    |--------------------------------------------------------------------------
    */

    if (this.attendanceDate) {
      this.attendanceDate =
        normalizeAttendanceDate(
          this.attendanceDate
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Status
    |--------------------------------------------------------------------------
    */

    if (this.status) {
      this.status = String(
        this.status
      )
        .trim()
        .toLowerCase();
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Time
    |--------------------------------------------------------------------------
    */

    if (this.checkInTime) {
      this.checkInTime =
        String(
          this.checkInTime
        ).trim();
    }

    if (this.checkOutTime) {
      this.checkOutTime =
        String(
          this.checkOutTime
        ).trim();
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Text
    |--------------------------------------------------------------------------
    */

    const textFields = [
      "leaveType",
      "leaveReason",
      "employeeIdSnapshot",
      "staffNameSnapshot",
      "departmentSnapshot",
      "designationSnapshot",
      "remarks"
    ];

    textFields.forEach(
      (field) => {
        if (this[field]) {
          this[field] =
            String(
              this[field]
            ).trim();
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Clear Leave Fields for Non-Leave Status
    |--------------------------------------------------------------------------
    */

    if (
      this.status !== "leave"
    ) {
      this.leaveType = "";
      this.leaveReason = "";
    }

    /*
    |--------------------------------------------------------------------------
    | Clear Times for Absent and Leave
    |--------------------------------------------------------------------------
    */

    if (
      this.status === "absent" ||
      this.status === "leave"
    ) {
      this.checkInTime = "";
      this.checkOutTime = "";
      this.breakMinutes = 0;
      this.overtimeMinutes = 0;
      this.lateMinutes = 0;
    }

    /*
    |--------------------------------------------------------------------------
    | Clear Late Minutes for Non-Late Status
    |--------------------------------------------------------------------------
    */

    if (
      this.status !== "late"
    ) {
      this.lateMinutes = 0;
    }
  }
);

/*
|--------------------------------------------------------------------------
| Validate Check-In and Check-Out Time
|--------------------------------------------------------------------------
*/

staffAttendanceSchema.pre(
  "validate",
  function () {
    const checkInMinutes =
      timeToMinutes(
        this.checkInTime
      );

    const checkOutMinutes =
      timeToMinutes(
        this.checkOutTime
      );

    if (
      checkInMinutes !== null &&
      checkOutMinutes !== null &&
      checkOutMinutes <
        checkInMinutes
    ) {
      this.invalidate(
        "checkOutTime",
        "Check-out time cannot be earlier than check-in time"
      );
    }

    if (
      this.status === "late" &&
      Number(
        this.lateMinutes || 0
      ) <= 0
    ) {
      this.invalidate(
        "lateMinutes",
        "Late minutes must be greater than zero when attendance status is late"
      );
    }

    if (
      this.status === "leave" &&
      !this.leaveType
    ) {
      this.invalidate(
        "leaveType",
        "Leave type is required when attendance status is leave"
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| Working Minutes Virtual
|--------------------------------------------------------------------------
*/

staffAttendanceSchema
  .virtual("workingMinutes")
  .get(function () {
    const checkInMinutes =
      timeToMinutes(
        this.checkInTime
      );

    const checkOutMinutes =
      timeToMinutes(
        this.checkOutTime
      );

    if (
      checkInMinutes === null ||
      checkOutMinutes === null
    ) {
      return 0;
    }

    const breakMinutes =
      Number(
        this.breakMinutes || 0
      );

    return Math.max(
      0,
      checkOutMinutes -
        checkInMinutes -
        breakMinutes
    );
  });

/*
|--------------------------------------------------------------------------
| Working Hours Virtual
|--------------------------------------------------------------------------
*/

staffAttendanceSchema
  .virtual("workingHours")
  .get(function () {
    const totalMinutes =
      Number(
        this.workingMinutes || 0
      );

    const hours = Math.floor(
      totalMinutes / 60
    );

    const minutes =
      totalMinutes % 60;

    return {
      hours,
      minutes,

      formatted: `${hours}h ${minutes}m`
    };
  });

/*
|--------------------------------------------------------------------------
| Include Virtual Fields
|--------------------------------------------------------------------------
*/

staffAttendanceSchema.set(
  "toJSON",
  {
    virtuals: true,

    transform: (
      document,
      returnedObject
    ) => {
      delete returnedObject.__v;

      return returnedObject;
    }
  }
);

staffAttendanceSchema.set(
  "toObject",
  {
    virtuals: true
  }
);

/*
|--------------------------------------------------------------------------
| Export Model
|--------------------------------------------------------------------------
*/

module.exports =
  mongoose.models
    .StaffAttendance ||
  mongoose.model(
    "StaffAttendance",
    staffAttendanceSchema
  );