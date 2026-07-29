const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
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

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null
    },

    subjectCode: {
      type: String,
      required: [true, "Subject code is required"],
      trim: true,
      uppercase: true
    },

    subjectName: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
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

subjectSchema.index(
  { schoolId: 1, classId: 1, subjectCode: 1 },
  { unique: true }
);

subjectSchema.index({ schoolId: 1, isDeleted: 1 });
subjectSchema.index({ schoolId: 1, classId: 1, isDeleted: 1 });
subjectSchema.index({ schoolId: 1, teacherId: 1, isDeleted: 1 });
subjectSchema.index({ schoolId: 1, isActive: 1, isDeleted: 1 });

module.exports = mongoose.model("Subject", subjectSchema);