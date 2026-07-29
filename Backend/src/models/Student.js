const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Linked User Accounts
    |--------------------------------------------------------------------------
    */

    studentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [
        true,
        "Student user account is required"
      ]
    },

    parentUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    /*
    |--------------------------------------------------------------------------
    | School, Class and Section
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

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [
        true,
        "Class ID is required"
      ]
    },

    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [
        true,
        "Section ID is required"
      ]
    },

    sectionName: {
      type: String,
      required: [
        true,
        "Section name is required"
      ],
      trim: true
    },

    /*
    |--------------------------------------------------------------------------
    | Admission Information
    |--------------------------------------------------------------------------
    */

    admissionNumber: {
      type: String,
      required: true,
      trim: true
    },

    admissionDate: {
      type: Date,
      default: Date.now
    },

    /*
    |--------------------------------------------------------------------------
    | Student Information
    |--------------------------------------------------------------------------
    |
    | Name, address, contact and photo linked User account سے sync ہوں گے۔
    |
    */

    name: {
      type: String,
      required: [
        true,
        "Student name is required"
      ],
      trim: true
    },

    fatherName: {
      type: String,
      required: [
        true,
        "Father name is required"
      ],
      trim: true
    },

    bForm: {
      type: String,
      trim: true,
      default: ""
    },

    dateOfBirth: {
      type: Date,
      default: null
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

    address: {
      type: String,
      trim: true,
      default: ""
    },

    contactNumber: {
      type: String,
      trim: true,
      default: ""
    },

    studentPhoto: {
      type: String,
      trim: true,
      default: ""
    },

    /*
    |--------------------------------------------------------------------------
    | Guardian Information
    |--------------------------------------------------------------------------
    */

    guardianName: {
      type: String,
      trim: true,
      default: ""
    },

    guardianContact: {
      type: String,
      trim: true,
      default: ""
    },

    /*
    |--------------------------------------------------------------------------
    | Student Status
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "transferred",
        "passed_out"
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

studentSchema.index(
  {
    schoolId: 1,
    admissionNumber: 1
  },
  {
    unique: true
  }
);

/*
| Partial index پرانے null records کو support کرے گا۔
*/

studentSchema.index(
  {
    studentUserId: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      studentUserId: {
        $type: "objectId"
      }
    }
  }
);

studentSchema.index({
  schoolId: 1,
  isDeleted: 1
});

studentSchema.index({
  schoolId: 1,
  classId: 1,
  sectionId: 1,
  isDeleted: 1
});

studentSchema.index({
  schoolId: 1,
  status: 1,
  isDeleted: 1
});

/*
|--------------------------------------------------------------------------
| Normalize Student Data
|--------------------------------------------------------------------------
*/

studentSchema.pre(
  "validate",
  function () {
    if (this.name) {
      this.name = this.name.trim();
    }

    if (this.fatherName) {
      this.fatherName =
        this.fatherName.trim();
    }

    if (this.sectionName) {
      this.sectionName =
        this.sectionName.trim();
    }

    if (
      Array.isArray(
        this.parentUserIds
      )
    ) {
      const uniqueParentIds =
        new Map();

      this.parentUserIds.forEach(
        (parentId) => {
          if (parentId) {
            uniqueParentIds.set(
              parentId.toString(),
              parentId
            );
          }
        }
      );

      this.parentUserIds = [
        ...uniqueParentIds.values()
      ];
    }
  }
);

module.exports = mongoose.model(
  "Student",
  studentSchema
);