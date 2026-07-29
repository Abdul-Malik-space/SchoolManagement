const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Staff Categories
|--------------------------------------------------------------------------
*/

const STAFF_CATEGORIES = [
  "administration",
  "accounts",
  "library",
  "laboratory",
  "transport",
  "security",
  "maintenance",
  "medical",
  "support",
  "other"
];

const EMPLOYMENT_TYPES = [
  "permanent",
  "contract",
  "temporary",
  "part_time",
  "intern"
];

const STAFF_STATUSES = [
  "active",
  "inactive",
  "on_leave",
  "resigned",
  "terminated"
];

/*
|--------------------------------------------------------------------------
| Emergency Contact Schema
|--------------------------------------------------------------------------
*/

const emergencyContactSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        trim: true,
        maxlength: [
          120,
          "Emergency contact name cannot exceed 120 characters"
        ],
        default: ""
      },

      relationship: {
        type: String,
        trim: true,
        maxlength: [
          80,
          "Relationship cannot exceed 80 characters"
        ],
        default: ""
      },

      phone: {
        type: String,
        trim: true,
        maxlength: [
          30,
          "Emergency contact phone cannot exceed 30 characters"
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
| Staff Document Schema
|--------------------------------------------------------------------------
*/

const staffDocumentSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        required: [
          true,
          "Document title is required"
        ],
        trim: true,
        maxlength: [
          120,
          "Document title cannot exceed 120 characters"
        ]
      },

      documentType: {
        type: String,
        trim: true,
        maxlength: [
          80,
          "Document type cannot exceed 80 characters"
        ],
        default: ""
      },

      fileUrl: {
        type: String,
        required: [
          true,
          "Document file URL is required"
        ],
        trim: true
      },

      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    {
      timestamps: false
    }
  );

/*
|--------------------------------------------------------------------------
| Staff Schema
|--------------------------------------------------------------------------
*/

const staffSchema =
  new mongoose.Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | Optional Linked User Account
      |--------------------------------------------------------------------------
      |
      | Accountant، administrator یا receptionist کو login account دیا جا
      | سکتا ہے، جبکہ driver یا cleaner کے لیے account لازمی نہیں ہوگا۔
      |
      */

      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
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
      | Employee Identification
      |--------------------------------------------------------------------------
      */

      employeeId: {
        type: String,
        required: [
          true,
          "Employee ID is required"
        ],
        trim: true,
        uppercase: true,
        maxlength: [
          50,
          "Employee ID cannot exceed 50 characters"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Personal Information
      |--------------------------------------------------------------------------
      */

      name: {
        type: String,
        required: [
          true,
          "Staff name is required"
        ],
        trim: true,
        maxlength: [
          150,
          "Staff name cannot exceed 150 characters"
        ]
      },

      fatherName: {
        type: String,
        trim: true,
        maxlength: [
          150,
          "Father name cannot exceed 150 characters"
        ],
        default: ""
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [
          200,
          "Email cannot exceed 200 characters"
        ],
        default: ""
      },

      phone: {
        type: String,
        required: [
          true,
          "Phone number is required"
        ],
        trim: true,
        maxlength: [
          30,
          "Phone number cannot exceed 30 characters"
        ]
      },

      alternatePhone: {
        type: String,
        trim: true,
        maxlength: [
          30,
          "Alternate phone cannot exceed 30 characters"
        ],
        default: ""
      },

      cnic: {
        type: String,
        trim: true,
        maxlength: [
          25,
          "CNIC cannot exceed 25 characters"
        ],
        default: ""
      },

      gender: {
        type: String,
        enum: {
          values: [
            "male",
            "female",
            "other"
          ],
          message:
            "Gender must be male, female or other"
        },
        required: [
          true,
          "Gender is required"
        ]
      },

      dateOfBirth: {
        type: Date,
        default: null
      },

      maritalStatus: {
        type: String,
        enum: {
          values: [
            "single",
            "married",
            "divorced",
            "widowed"
          ],
          message:
            "Invalid marital status"
        },
        default: "single"
      },

      address: {
        type: String,
        trim: true,
        maxlength: [
          500,
          "Address cannot exceed 500 characters"
        ],
        default: ""
      },

      city: {
        type: String,
        trim: true,
        maxlength: [
          100,
          "City cannot exceed 100 characters"
        ],
        default: ""
      },

      staffPhoto: {
        type: String,
        trim: true,
        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Employment Information
      |--------------------------------------------------------------------------
      */

      category: {
        type: String,
        enum: {
          values: STAFF_CATEGORIES,
          message:
            "Invalid staff category"
        },
        required: [
          true,
          "Staff category is required"
        ]
      },

      department: {
        type: String,
        required: [
          true,
          "Department is required"
        ],
        trim: true,
        maxlength: [
          120,
          "Department cannot exceed 120 characters"
        ]
      },

      designation: {
        type: String,
        required: [
          true,
          "Designation is required"
        ],
        trim: true,
        maxlength: [
          120,
          "Designation cannot exceed 120 characters"
        ]
      },

      employmentType: {
        type: String,
        enum: {
          values: EMPLOYMENT_TYPES,
          message:
            "Invalid employment type"
        },
        default: "permanent"
      },

      joiningDate: {
        type: Date,
        default: Date.now
      },

      contractEndDate: {
        type: Date,
        default: null
      },

      shift: {
        type: String,
        trim: true,
        maxlength: [
          80,
          "Shift cannot exceed 80 characters"
        ],
        default: ""
      },

      qualification: {
        type: String,
        trim: true,
        maxlength: [
          250,
          "Qualification cannot exceed 250 characters"
        ],
        default: ""
      },

      experienceYears: {
        type: Number,
        min: [
          0,
          "Experience cannot be negative"
        ],
        default: 0
      },

      /*
      |--------------------------------------------------------------------------
      | Salary Information
      |--------------------------------------------------------------------------
      */

      basicSalary: {
        type: Number,
        min: [
          0,
          "Basic salary cannot be negative"
        ],
        default: 0
      },

      allowances: {
        type: Number,
        min: [
          0,
          "Allowances cannot be negative"
        ],
        default: 0
      },

      deductions: {
        type: Number,
        min: [
          0,
          "Deductions cannot be negative"
        ],
        default: 0
      },

      /*
      |--------------------------------------------------------------------------
      | Bank Information
      |--------------------------------------------------------------------------
      */

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
          150,
          "Account title cannot exceed 150 characters"
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
          50,
          "IBAN cannot exceed 50 characters"
        ],
        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Emergency Contact
      |--------------------------------------------------------------------------
      */

      emergencyContact: {
        type: emergencyContactSchema,
        default: () => ({})
      },

      /*
      |--------------------------------------------------------------------------
      | Documents
      |--------------------------------------------------------------------------
      */

      documents: {
        type: [staffDocumentSchema],
        default: []
      },

      /*
      |--------------------------------------------------------------------------
      | Status
      |--------------------------------------------------------------------------
      */

      status: {
        type: String,
        enum: {
          values: STAFF_STATUSES,
          message:
            "Invalid staff status"
        },
        default: "active"
      },

      leavingDate: {
        type: Date,
        default: null
      },

      leavingReason: {
        type: String,
        trim: true,
        maxlength: [
          500,
          "Leaving reason cannot exceed 500 characters"
        ],
        default: ""
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

/*
| ایک user account صرف ایک staff profile سے linked ہوگا۔
| null userId رکھنے والے متعدد staff records allowed ہوں گے۔
*/

staffSchema.index(
  {
    userId: 1
  },
  {
    unique: true,
    sparse: true,
    name: "unique_staff_user_account"
  }
);

/*
| ہر school میں employee ID منفرد ہوگا۔
*/

staffSchema.index(
  {
    schoolId: 1,
    employeeId: 1
  },
  {
    unique: true,
    name: "unique_school_staff_employee_id"
  }
);

staffSchema.index(
  {
    schoolId: 1,
    isDeleted: 1,
    createdAt: -1
  },
  {
    name: "staff_school_listing"
  }
);

staffSchema.index(
  {
    schoolId: 1,
    status: 1,
    isDeleted: 1
  },
  {
    name: "staff_status_filter"
  }
);

staffSchema.index(
  {
    schoolId: 1,
    category: 1,
    isDeleted: 1
  },
  {
    name: "staff_category_filter"
  }
);

staffSchema.index(
  {
    userId: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      userId: {
        $type: "objectId"
      }
    },

    name:
      "unique_staff_user_account"
  }
);

staffSchema.index(
  {
    schoolId: 1,
    cnic: 1
  },
  {
    name: "staff_cnic_search"
  }
);

/*
|--------------------------------------------------------------------------
| Normalize Staff Data
|--------------------------------------------------------------------------
*/

staffSchema.pre(
  "validate",
  function () {
    if (this.employeeId) {
      this.employeeId = String(
        this.employeeId
      )
        .trim()
        .toUpperCase();
    }

    if (this.name) {
      this.name = String(
        this.name
      ).trim();
    }

    if (this.fatherName) {
      this.fatherName = String(
        this.fatherName
      ).trim();
    }

    if (this.email) {
      this.email = String(
        this.email
      )
        .trim()
        .toLowerCase();
    }

    if (this.phone) {
      this.phone = String(
        this.phone
      ).trim();
    }

    if (this.alternatePhone) {
      this.alternatePhone = String(
        this.alternatePhone
      ).trim();
    }

    if (this.cnic) {
      this.cnic = String(
        this.cnic
      ).trim();
    }

    if (this.department) {
      this.department = String(
        this.department
      ).trim();
    }

    if (this.designation) {
      this.designation = String(
        this.designation
      ).trim();
    }

    if (this.iban) {
      this.iban = String(
        this.iban
      )
        .replace(/\s+/g, "")
        .toUpperCase();
    }

    if (
      this.employmentType !==
        "contract" &&
      this.employmentType !==
        "temporary"
    ) {
      this.contractEndDate = null;
    }

    if (
      this.status === "active" ||
      this.status === "inactive" ||
      this.status === "on_leave"
    ) {
      this.leavingDate = null;
      this.leavingReason = "";
    }
  }
);

/*
|--------------------------------------------------------------------------
| Validate Employment Dates
|--------------------------------------------------------------------------
*/

staffSchema.pre(
  "validate",
  function () {
    if (
      this.contractEndDate &&
      this.joiningDate &&
      this.contractEndDate <
        this.joiningDate
    ) {
      this.invalidate(
        "contractEndDate",
        "Contract end date cannot be earlier than joining date"
      );
    }

    if (
      this.leavingDate &&
      this.joiningDate &&
      this.leavingDate <
        this.joiningDate
    ) {
      this.invalidate(
        "leavingDate",
        "Leaving date cannot be earlier than joining date"
      );
    }

    if (
      this.dateOfBirth &&
      this.joiningDate &&
      this.dateOfBirth >=
        this.joiningDate
    ) {
      this.invalidate(
        "dateOfBirth",
        "Date of birth must be earlier than joining date"
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| Salary Virtual
|--------------------------------------------------------------------------
*/

staffSchema
  .virtual("netSalary")
  .get(function () {
    const basicSalary = Number(
      this.basicSalary || 0
    );

    const allowances = Number(
      this.allowances || 0
    );

    const deductions = Number(
      this.deductions || 0
    );

    return Math.max(
      0,
      basicSalary +
        allowances -
        deductions
    );
  });

/*
|--------------------------------------------------------------------------
| Include Virtual Fields
|--------------------------------------------------------------------------
*/

staffSchema.set(
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

staffSchema.set(
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
  mongoose.models.Staff ||
  mongoose.model(
    "Staff",
    staffSchema
  );