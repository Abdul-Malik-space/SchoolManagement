const mongoose = require("mongoose");

const feeStructureSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | School and Class
    |--------------------------------------------------------------------------
    */

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"]
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class ID is required"]
    },

    /*
    |--------------------------------------------------------------------------
    | Fee Structure Information
    |--------------------------------------------------------------------------
    */

    title: {
      type: String,
      required: [true, "Fee title is required"],
      trim: true,
      minlength: [
        2,
        "Fee title must contain at least 2 characters"
      ],
      maxlength: [
        120,
        "Fee title cannot exceed 120 characters"
      ]
    },

    sessionYear: {
      type: String,
      required: [true, "Session year is required"],
      trim: true,
      maxlength: [
        30,
        "Session year cannot exceed 30 characters"
      ]
    },

    /*
    |--------------------------------------------------------------------------
    | Fee Amounts
    |--------------------------------------------------------------------------
    */

    monthlyFee: {
      type: Number,
      default: 0,
      min: [
        0,
        "Monthly fee cannot be negative"
      ]
    },

    admissionFee: {
      type: Number,
      default: 0,
      min: [
        0,
        "Admission fee cannot be negative"
      ]
    },

    examFee: {
      type: Number,
      default: 0,
      min: [
        0,
        "Exam fee cannot be negative"
      ]
    },

    transportFee: {
      type: Number,
      default: 0,
      min: [
        0,
        "Transport fee cannot be negative"
      ]
    },

    otherFee: {
      type: Number,
      default: 0,
      min: [
        0,
        "Other fee cannot be negative"
      ]
    },

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    isActive: {
      type: Boolean,
      default: true
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
|
| ایک school میں ایک class اور session year کے لیے صرف ایک fee structure
| موجود ہوگا۔
|
*/

feeStructureSchema.index(
  {
    schoolId: 1,
    classId: 1,
    sessionYear: 1
  },
  {
    unique: true
  }
);

feeStructureSchema.index({
  schoolId: 1,
  isDeleted: 1
});

feeStructureSchema.index({
  schoolId: 1,
  isActive: 1,
  isDeleted: 1
});

feeStructureSchema.index({
  schoolId: 1,
  classId: 1,
  isActive: 1,
  isDeleted: 1
});

/*
|--------------------------------------------------------------------------
| Normalize Data Before Validation
|--------------------------------------------------------------------------
*/

feeStructureSchema.pre(
  "validate",
  function () {
    if (this.title) {
      this.title = this.title.trim();
    }

    if (this.sessionYear) {
      this.sessionYear =
        this.sessionYear.trim();
    }
  }
);

/*
|--------------------------------------------------------------------------
| Virtual Total Fee
|--------------------------------------------------------------------------
|
| یہ database میں الگ field کے طور پر save نہیں ہوگا۔
| Response میں totalFee کے نام سے دستیاب ہوگا۔
|
*/

feeStructureSchema.virtual(
  "totalFee"
).get(function () {
  return (
    Number(this.monthlyFee || 0) +
    Number(this.admissionFee || 0) +
    Number(this.examFee || 0) +
    Number(this.transportFee || 0) +
    Number(this.otherFee || 0)
  );
});

/*
|--------------------------------------------------------------------------
| Include Virtual Fields in JSON
|--------------------------------------------------------------------------
*/

feeStructureSchema.set(
  "toJSON",
  {
    virtuals: true
  }
);

feeStructureSchema.set(
  "toObject",
  {
    virtuals: true
  }
);

module.exports = mongoose.model(
  "FeeStructure",
  feeStructureSchema
);