const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      required: [true, "School name is required"],
      trim: true
    },

    type: {
      type: String,
      enum: ["school", "madrasa", "both"],
      default: "school"
    },

    logo: {
      type: String,
      default: ""
    },

    address: {
      type: String,
      required: [true, "Address is required"]
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"]
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ""
    },

    sessionYear: {
      type: String,
      required: [true, "Session year is required"]
    },

    isActive: {
      type: Boolean,
      default: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("School", schoolSchema);