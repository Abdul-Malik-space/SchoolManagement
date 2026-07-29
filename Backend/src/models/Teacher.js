const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Linked User Account
    |--------------------------------------------------------------------------
    */

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [
        true,
        "Teacher user account is required"
      ]
    },

    /*
    |--------------------------------------------------------------------------
    | School
    |--------------------------------------------------------------------------
    */

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "School ID is required"
      ]
    },

    /*
    |--------------------------------------------------------------------------
    | Employee Information
    |--------------------------------------------------------------------------
    */

    employeeId: {
      type: String,
      required: true,
      trim: true
    },

    /*
    |--------------------------------------------------------------------------
    | Basic Information
    |--------------------------------------------------------------------------
    |
    | یہ fields User account سے copy ہوں گی۔
    | Frontend پر populated userId کو primary source استعمال کیا جائے گا۔
    |
    */

    name: {
      type: String,
      required: [
        true,
        "Teacher name is required"
      ],
      trim: true
    },

    fatherName: {
      type: String,
      trim: true,
      default: ""
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ""
    },

    phone: {
      type: String,
      required: [
        true,
        "Phone number is required"
      ],
      trim: true
    },

    cnic: {
      type: String,
      trim: true,
      default: ""
    },

    gender: {
      type: String,
      enum: [
        "male",
        "female",
        "other"
      ],
      required: [
        true,
        "Gender is required"
      ]
    },

    dateOfBirth: {
      type: Date,
      default: null
    },

    address: {
      type: String,
      trim: true,
      default: ""
    },

    /*
    |--------------------------------------------------------------------------
    | Academic and Employment Information
    |--------------------------------------------------------------------------
    */

    qualification: {
      type: String,
      required: [
        true,
        "Qualification is required"
      ],
      trim: true
    },

    subjects: [
      {
        type: String,
        trim: true
      }
    ],

    salary: {
      type: Number,
      default: 0,
      min: [
        0,
        "Salary cannot be negative"
      ]
    },

    joiningDate: {
      type: Date,
      default: Date.now
    },

    teacherPhoto: {
      type: String,
      trim: true,
      default: ""
    },

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "resigned"
      ],
      default: "active"
    },

    /*
    |--------------------------------------------------------------------------
    | Record Tracking
    |--------------------------------------------------------------------------
    */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    isDeleted: {
      type: Boolean,
      default: false
    },

    deletedAt: {
      type: Date,
      default: null
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
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

teacherSchema.index(
  {
    userId: 1
  },
  {
    unique: true
  }
);

teacherSchema.index(
  {
    schoolId: 1,
    employeeId: 1
  },
  {
    unique: true
  }
);

teacherSchema.index({
  schoolId: 1,
  isDeleted: 1
});

teacherSchema.index({
  schoolId: 1,
  status: 1,
  isDeleted: 1
});

/*
|--------------------------------------------------------------------------
| Normalize Teacher Data
|--------------------------------------------------------------------------
*/

teacherSchema.pre(
  "validate",
  function () {
    if (this.name) {
      this.name = this.name.trim();
    }

    if (this.email) {
      this.email = this.email
        .trim()
        .toLowerCase();
    }

    if (this.phone) {
      this.phone = this.phone.trim();
    }

    if (Array.isArray(this.subjects)) {
      this.subjects = [
        ...new Set(
          this.subjects
            .map((subject) =>
              String(subject).trim()
            )
            .filter(Boolean)
        )
      ];
    }
  }
);

module.exports = mongoose.model(
  "Teacher",
  teacherSchema
);