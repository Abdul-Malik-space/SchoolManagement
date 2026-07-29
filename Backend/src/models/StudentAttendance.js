const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },

    status: {
      type: String,
      enum: ["present", "absent", "late", "leave"],
      required: true
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: [300, "Remarks cannot exceed 300 characters"],
      default: ""
    }
  },
  {
    _id: false
  }
);

const studentAttendanceSchema = new mongoose.Schema(
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

    sectionName: {
      type: String,
      required: [true, "Section name is required"],
      trim: true
    },

    attendanceDate: {
      type: Date,
      required: [true, "Attendance date is required"]
    },

    records: {
      type: [attendanceRecordSchema],
      required: true,
      validate: {
        validator(records) {
          return Array.isArray(records) && records.length > 0;
        },
        message: "At least one attendance record is required"
      }
    },

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

studentAttendanceSchema.index(
  {
    schoolId: 1,
    classId: 1,
    sectionName: 1,
    attendanceDate: 1
  },
  {
    unique: true
  }
);

studentAttendanceSchema.index({
  schoolId: 1,
  attendanceDate: -1
});

studentAttendanceSchema.pre("validate", function () {
  if (this.sectionName) {
    this.sectionName = this.sectionName.trim();
  }

  if (Array.isArray(this.records)) {
    this.records = this.records.map((record) => ({
      studentId: record.studentId,
      status: record.status,
      remarks: String(record.remarks || "").trim()
    }));
  }
});

module.exports = mongoose.model(
  "StudentAttendance",
  studentAttendanceSchema
);
