const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | School
    |--------------------------------------------------------------------------
    |
    | Super Admin کسی school سے وابستہ نہیں ہوگا۔
    | باقی تمام users کے لیے schoolId ضروری ہوگا۔
    |
    */

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null,
      required: function () {
        return this.role !== "super_admin";
      }
    },

    /*
    |--------------------------------------------------------------------------
    | Basic Information
    |--------------------------------------------------------------------------
    */

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"]
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [150, "Email cannot exceed 150 characters"],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address"
      ]
    },

    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: [30, "Phone number cannot exceed 30 characters"]
    },

    address: {
      type: String,
      default: "",
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters"]
    },

    photo: {
      type: String,
      default: "",
      trim: true
    },

    /*
    |--------------------------------------------------------------------------
    | Password and Authentication
    |--------------------------------------------------------------------------
    */

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must contain at least 8 characters"],
      select: false
    },

    refreshToken: {
      type: String,
      default: "",
      select: false
    },

    passwordChangedAt: {
      type: Date,
      default: null
    },

    mustChangePassword: {
      type: Boolean,
      default: false
    },

    lastLoginAt: {
      type: Date,
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | Role and Account Status
    |--------------------------------------------------------------------------
    */

    role: {
      type: String,
      required: [true, "User role is required"],
      enum: {
        values: [
          "super_admin",
          "principal",
          "teacher",
          "student",
          "parent",
          "accountant"
        ],
        message: "{VALUE} is not a valid user role"
      }
    },

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
    }
  },
  {
    timestamps: true
  }
);

/*
|--------------------------------------------------------------------------
| Helpful Database Index
|--------------------------------------------------------------------------
*/

userSchema.index({
  schoolId: 1,
  role: 1,
  isActive: 1
});

/*
|--------------------------------------------------------------------------
| Normalize Data Before Validation
|--------------------------------------------------------------------------
*/

userSchema.pre("validate", function () {
  if (this.email) {
    this.email = this.email.trim().toLowerCase();
  }

  if (this.name) {
    this.name = this.name.trim();
  }

  /*
  |--------------------------------------------------------------------------
  | Super Admin must not belong to a school
  |--------------------------------------------------------------------------
  */

  if (this.role === "super_admin") {
    this.schoolId = null;
  }
});

/*
|--------------------------------------------------------------------------
| Hash Password Before Saving
|--------------------------------------------------------------------------
*/

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );

  this.passwordChangedAt = new Date(
    Date.now() - 1000
  );
});

/*
|--------------------------------------------------------------------------
| Compare Login Password
|--------------------------------------------------------------------------
*/

userSchema.methods.comparePassword = async function (
  enteredPassword
) {
  return bcrypt.compare(
    enteredPassword,
    this.password
  );
};

/*
|--------------------------------------------------------------------------
| Check Whether Password Changed After JWT Was Issued
|--------------------------------------------------------------------------
*/

userSchema.methods.changedPasswordAfter = function (
  tokenIssuedAt
) {
  if (!this.passwordChangedAt) {
    return false;
  }

  const passwordChangedTimestamp = Math.floor(
    this.passwordChangedAt.getTime() / 1000
  );

  return passwordChangedTimestamp > tokenIssuedAt;
};

/*
|--------------------------------------------------------------------------
| Hide Sensitive Fields from JSON Response
|--------------------------------------------------------------------------
*/

userSchema.set("toJSON", {
  transform: function (document, returnedObject) {
    delete returnedObject.password;
    delete returnedObject.refreshToken;

    return returnedObject;
  }
});

module.exports = mongoose.model(
  "User",
  userSchema
);