const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"]
    },

    className: {
      type: String,
      required: [true, "Class name is required"],
      trim: true
    },

    numericOrder: {
      type: Number,
      default: 0
    },

    sections: [
      {
        sectionName: {
          type: String,
          required: true,
          trim: true
        },
        capacity: {
          type: Number,
          default: 40
        }
      }
    ],

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

classSchema.index({ schoolId: 1, className: 1 }, { unique: true });
classSchema.index({ schoolId: 1, isDeleted: 1 });
classSchema.index({ schoolId: 1, isActive: 1, isDeleted: 1 });

module.exports = mongoose.model("Class", classSchema);