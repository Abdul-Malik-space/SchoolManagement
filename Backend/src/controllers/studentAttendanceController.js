const mongoose = require("mongoose");

const StudentAttendance = require("../models/StudentAttendance");
const School = require("../models/School");
const Class = require("../models/Class");
const Student = require("../models/Student");

const { createAuditLog } = require("../utils/auditLogHelper");

const {
  getPaginationOptions,
  buildPagination
} = require("../utils/pagination");

const isSuperAdmin = (req) => {
  return req.user && req.user.role === "super_admin";
};

const getUserSchoolId = (req) => {
  const schoolId = req.user && req.user.schoolId;

  if (!schoolId) {
    return null;
  }

  if (schoolId._id) {
    return schoolId._id.toString();
  }

  return schoolId.toString();
};

const getSchoolFilter = (req) => {
  if (isSuperAdmin(req)) {
    return {};
  }

  if (req.schoolFilter && Object.keys(req.schoolFilter).length > 0) {
    return { ...req.schoolFilter };
  }

  const userSchoolId = getUserSchoolId(req);

  if (!userSchoolId) {
    return { schoolId: null };
  }

  return { schoolId: userSchoolId };
};

const getCreateSchoolId = (req) => {
  if (isSuperAdmin(req)) {
    return req.body.schoolId;
  }

  return getUserSchoolId(req);
};

const getScopedFilter = (req, extraFilter = {}) => {
  return {
    ...getSchoolFilter(req),
    ...extraFilter
  };
};

const getPlainData = (document) => {
  if (!document) {
    return null;
  }

  if (typeof document.toObject === "function") {
    return document.toObject();
  }

  return document;
};

const isValidObjectId = (id) => {
  return id && mongoose.Types.ObjectId.isValid(id);
};

const normalizeDate = (date) => {
  if (!date) {
    return null;
  }

  const rawDate = String(date);

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [year, month, day] = rawDate.split("-").map(Number);
    const normalized = new Date(Date.UTC(year, month - 1, day));

    if (Number.isNaN(normalized.getTime())) {
      return null;
    }

    return normalized;
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Date(
    Date.UTC(
      parsedDate.getUTCFullYear(),
      parsedDate.getUTCMonth(),
      parsedDate.getUTCDate()
    )
  );
};

const isValidMonth = (month) => {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
};

const handleAttendanceError = (res, error, defaultMessage) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors)
        .map((item) => item.message)
        .join(", ")
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Attendance already marked for this class, section and date"
    });
  }

  return res.status(500).json({
    success: false,
    message: defaultMessage,
    error: error.message
  });
};

const verifySchoolAccess = async (req, schoolId) => {
  if (!schoolId) {
    return {
      status: 400,
      response: {
        success: false,
        message: "School ID is required"
      }
    };
  }

  if (!isValidObjectId(schoolId)) {
    return {
      status: 400,
      response: {
        success: false,
        message: "Invalid school ID format"
      }
    };
  }

  if (!isSuperAdmin(req)) {
    const userSchoolId = getUserSchoolId(req);

    if (!userSchoolId) {
      return {
        status: 403,
        response: {
          success: false,
          message: "School is not assigned to this user"
        }
      };
    }

    if (userSchoolId !== schoolId.toString()) {
      return {
        status: 403,
        response: {
          success: false,
          message: "You are not allowed to access another school's data"
        }
      };
    }
  }

  const school = await School.findById(schoolId);

  if (!school) {
    return {
      status: 404,
      response: {
        success: false,
        message: "School not found"
      }
    };
  }

  if (school.isActive === false) {
    return {
      status: 403,
      response: {
        success: false,
        message: "Attendance cannot be managed for an inactive school"
      }
    };
  }

  return { school };
};

const verifyClassAndSection = async (req, classId, schoolId, sectionName) => {
  if (!classId || !isValidObjectId(classId)) {
    return {
      status: 400,
      response: {
        success: false,
        message: "Invalid class ID format"
      }
    };
  }

  const classData = await Class.findOne(
    getScopedFilter(req, {
      _id: classId,
      schoolId,
      isActive: true,
      isDeleted: { $ne: true }
    })
  );

  if (!classData) {
    return {
      status: 404,
      response: {
        success: false,
        message: "Class not found or not allowed"
      }
    };
  }

  const sectionExists = classData.sections.some((section) => {
    return section.sectionName === sectionName;
  });

  if (!sectionExists) {
    return {
      status: 404,
      response: {
        success: false,
        message: "Section not found in this class"
      }
    };
  }

  return { classData };
};

const validateAttendanceRecords = async ({
  req,
  records,
  schoolId,
  classId,
  sectionName
}) => {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      status: 400,
      response: {
        success: false,
        message: "Records must be a non-empty array"
      }
    };
  }

  const allowedStatuses = ["present", "absent", "late", "leave"];
  const studentIds = [];
  const seenStudentIds = new Set();

  for (const record of records) {
    if (!record.studentId || !record.status) {
      return {
        status: 400,
        response: {
          success: false,
          message: "Each record must include studentId and status"
        }
      };
    }

    if (!isValidObjectId(record.studentId)) {
      return {
        status: 400,
        response: {
          success: false,
          message: `Invalid student ID format: ${record.studentId}`
        }
      };
    }

    if (!allowedStatuses.includes(record.status)) {
      return {
        status: 400,
        response: {
          success: false,
          message: "Status must be present, absent, late or leave"
        }
      };
    }

    const studentId = record.studentId.toString();

    if (seenStudentIds.has(studentId)) {
      return {
        status: 400,
        response: {
          success: false,
          message: `Duplicate student found in attendance records: ${studentId}`
        }
      };
    }

    seenStudentIds.add(studentId);
    studentIds.push(studentId);
  }

  const students = await Student.find({
    ...getSchoolFilter(req),
    _id: { $in: studentIds },
    schoolId,
    classId,
    sectionName,
    isDeleted: { $ne: true }
  }).select("_id status");

  if (students.length !== studentIds.length) {
    return {
      status: 400,
      response: {
        success: false,
        message: "One or more students do not belong to this school, class or section"
      }
    };
  }

  const inactiveStudent = students.find((student) => {
    return student.status && student.status !== "active";
  });

  if (inactiveStudent) {
    return {
      status: 400,
      response: {
        success: false,
        message: `Inactive student cannot be marked in attendance: ${inactiveStudent._id}`
      }
    };
  }

  const cleanRecords = records.map((record) => {
    return {
      studentId: record.studentId,
      status: record.status,
      remarks: record.remarks || ""
    };
  });

  return { cleanRecords };
};

exports.markStudentAttendance = async (req, res) => {
  try {
    const {
      classId,
      sectionName,
      attendanceDate,
      records
    } = req.body;

    const schoolId = getCreateSchoolId(req);
    const normalizedSectionName =
      typeof sectionName === "string" ? sectionName.trim() : sectionName;

    if (!schoolId || !classId || !normalizedSectionName || !attendanceDate || !records) {
      return res.status(400).json({
        success: false,
        message: "School ID, class ID, section name, attendance date and records are required"
      });
    }

    const selectedDate = normalizeDate(attendanceDate);

    if (!selectedDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date format"
      });
    }

    const schoolAccess = await verifySchoolAccess(req, schoolId);

    if (schoolAccess.status) {
      return res.status(schoolAccess.status).json(schoolAccess.response);
    }

    const classCheck = await verifyClassAndSection(
      req,
      classId,
      schoolId,
      normalizedSectionName
    );

    if (classCheck.status) {
      return res.status(classCheck.status).json(classCheck.response);
    }

    const recordsCheck = await validateAttendanceRecords({
      req,
      records,
      schoolId,
      classId,
      sectionName: normalizedSectionName
    });

    if (recordsCheck.status) {
      return res.status(recordsCheck.status).json(recordsCheck.response);
    }

    const attendance = await StudentAttendance.create({
      schoolId,
      classId,
      sectionName: normalizedSectionName,
      attendanceDate: selectedDate,
      records: recordsCheck.cleanRecords,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await createAuditLog({
      req,
      schoolId: attendance.schoolId,
      action: "CREATE",
      module: "STUDENT_ATTENDANCE",
      recordId: attendance._id,
      recordModel: "StudentAttendance",
      description: `Student attendance marked for class ${classCheck.classData.className}, section ${normalizedSectionName} on ${selectedDate.toISOString().split("T")[0]}`,
      oldData: null,
      newData: getPlainData(attendance),
      status: "success",
      metadata: {
        classId,
        className: classCheck.classData.className,
        sectionName: normalizedSectionName,
        attendanceDate: selectedDate,
        totalStudents: recordsCheck.cleanRecords.length,
        presentCount: recordsCheck.cleanRecords.filter((record) => record.status === "present").length,
        absentCount: recordsCheck.cleanRecords.filter((record) => record.status === "absent").length,
        lateCount: recordsCheck.cleanRecords.filter((record) => record.status === "late").length,
        leaveCount: recordsCheck.cleanRecords.filter((record) => record.status === "leave").length
      }
    });

    res.status(201).json({
      success: true,
      message: "Student attendance marked successfully",
      attendance
    });
  } catch (error) {
    return handleAttendanceError(
      res,
      error,
      "Failed to mark student attendance"
    );
  }
};

exports.getStudentAttendance = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const filter = getSchoolFilter(req);

    if (isSuperAdmin(req) && req.query.schoolId) {
      if (!isValidObjectId(req.query.schoolId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid school ID format"
        });
      }

      filter.schoolId = req.query.schoolId;
    }

    if (req.query.classId) {
      if (!isValidObjectId(req.query.classId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID format"
        });
      }

      filter.classId = req.query.classId;
    }

    if (req.query.sectionName) {
      filter.sectionName = req.query.sectionName.trim();
    }

    if (req.query.date) {
      const selectedDate = normalizeDate(req.query.date);

      if (!selectedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format"
        });
      }

      filter.attendanceDate = selectedDate;
    }

    if (req.query.month) {
      if (!isValidMonth(req.query.month)) {
        return res.status(400).json({
          success: false,
          message: "Invalid month format. Use YYYY-MM"
        });
      }

      const [year, month] = req.query.month.split("-").map(Number);
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 1));

      filter.attendanceDate = {
        $gte: startDate,
        $lt: endDate
      };
    }

    if (req.query.studentId) {
      if (!isValidObjectId(req.query.studentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID format"
        });
      }

      filter["records.studentId"] = req.query.studentId;
    }

    const [attendance, total] = await Promise.all([
      StudentAttendance.find(filter)
        .populate("schoolId", "schoolName type")
        .populate("classId", "className numericOrder")
        .populate(
          "records.studentId",
          "name fatherName admissionNumber sectionName studentUserId"
        )
        .populate("createdBy", "name email role")
        .populate("updatedBy", "name email role")
        .sort({ attendanceDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),

      StudentAttendance.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      count: attendance.length,
      pagination: buildPagination({
        total,
        page,
        limit
      }),
      attendance
    });
  } catch (error) {
    return handleAttendanceError(
      res,
      error,
      "Failed to fetch student attendance"
    );
  }
};

exports.getStudentAttendanceById = async (req, res) => {
  try {
    const attendance = await StudentAttendance.findOne(
      getScopedFilter(req, { _id: req.params.id })
    )
      .populate("schoolId", "schoolName type")
      .populate("classId", "className numericOrder")
      .populate("records.studentId", "name fatherName admissionNumber sectionName studentUserId")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found or not allowed"
      });
    }

    res.status(200).json({
      success: true,
      attendance
    });
  } catch (error) {
    return handleAttendanceError(
      res,
      error,
      "Failed to fetch attendance record"
    );
  }
};

exports.updateStudentAttendance = async (req, res) => {
  try {
    const existingAttendance = await StudentAttendance.findOne(
      getScopedFilter(req, { _id: req.params.id })
    );

    if (!existingAttendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found or not allowed"
      });
    }

    const oldData = getPlainData(existingAttendance);

    if (
      req.body.schoolId &&
      req.body.schoolId.toString() !== existingAttendance.schoolId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "School ID cannot be changed for attendance record"
      });
    }

    const allowedUpdates = {};
    const finalSchoolId = existingAttendance.schoolId;
    const finalClassId = req.body.classId || existingAttendance.classId;
    const finalSectionName = req.body.sectionName || existingAttendance.sectionName;
    let finalAttendanceDate = existingAttendance.attendanceDate;

    if (req.body.attendanceDate !== undefined) {
      finalAttendanceDate = normalizeDate(req.body.attendanceDate);

      if (!finalAttendanceDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance date format"
        });
      }

      allowedUpdates.attendanceDate = finalAttendanceDate;
    }

    if (req.body.classId !== undefined) {
      allowedUpdates.classId = req.body.classId;
    }

    if (req.body.sectionName !== undefined) {
      allowedUpdates.sectionName = req.body.sectionName;
    }

    const classCheck = await verifyClassAndSection(
      req,
      finalClassId,
      finalSchoolId,
      finalSectionName
    );

    if (classCheck.status) {
      return res.status(classCheck.status).json(classCheck.response);
    }

    if (req.body.records !== undefined) {
      const recordsCheck = await validateAttendanceRecords({
        req,
        records: req.body.records,
        schoolId: finalSchoolId,
        classId: finalClassId,
        sectionName: finalSectionName
      });

      if (recordsCheck.status) {
        return res.status(recordsCheck.status).json(recordsCheck.response);
      }

      allowedUpdates.records = recordsCheck.cleanRecords;
    }

    const duplicateAttendance = await StudentAttendance.findOne({
      ...getSchoolFilter(req),
      _id: { $ne: existingAttendance._id },
      schoolId: finalSchoolId,
      classId: finalClassId,
      sectionName: finalSectionName,
      attendanceDate: finalAttendanceDate
    });

    if (duplicateAttendance) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for this class, section and date"
      });
    }

    allowedUpdates.updatedBy = req.user._id;

    const updatedAttendance = await StudentAttendance.findOneAndUpdate(
      getScopedFilter(req, { _id: req.params.id }),
      allowedUpdates,
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    await createAuditLog({
      req,
      schoolId: updatedAttendance.schoolId,
      action: "UPDATE",
      module: "STUDENT_ATTENDANCE",
      recordId: updatedAttendance._id,
      recordModel: "StudentAttendance",
      description: `Student attendance updated for section ${updatedAttendance.sectionName} on ${updatedAttendance.attendanceDate.toISOString().split("T")[0]}`,
      oldData,
      newData: getPlainData(updatedAttendance),
      status: "success",
      metadata: {
        classId: updatedAttendance.classId,
        sectionName: updatedAttendance.sectionName,
        attendanceDate: updatedAttendance.attendanceDate,
        totalStudents: updatedAttendance.records.length,
        presentCount: updatedAttendance.records.filter((record) => record.status === "present").length,
        absentCount: updatedAttendance.records.filter((record) => record.status === "absent").length,
        lateCount: updatedAttendance.records.filter((record) => record.status === "late").length,
        leaveCount: updatedAttendance.records.filter((record) => record.status === "leave").length
      }
    });

    await updatedAttendance.populate([
      { path: "schoolId", select: "schoolName type" },
      { path: "classId", select: "className numericOrder" },
      { path: "records.studentId", select: "name fatherName admissionNumber sectionName studentUserId" },
      { path: "createdBy", select: "name email role" },
      { path: "updatedBy", select: "name email role" }
    ]);

    res.status(200).json({
      success: true,
      message: "Student attendance updated successfully",
      attendance: updatedAttendance
    });
  } catch (error) {
    return handleAttendanceError(
      res,
      error,
      "Failed to update student attendance"
    );
  }
};

exports.deleteStudentAttendance = async (req, res) => {
  try {
    const attendance = await StudentAttendance.findOne(
      getScopedFilter(req, { _id: req.params.id })
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found or not allowed"
      });
    }

    const oldData = getPlainData(attendance);

    await attendance.deleteOne();

    await createAuditLog({
      req,
      schoolId: attendance.schoolId,
      action: "DELETE",
      module: "STUDENT_ATTENDANCE",
      recordId: attendance._id,
      recordModel: "StudentAttendance",
      description: `Student attendance deleted for section ${attendance.sectionName} on ${attendance.attendanceDate.toISOString().split("T")[0]}`,
      oldData,
      newData: null,
      status: "success",
      metadata: {
        classId: attendance.classId,
        sectionName: attendance.sectionName,
        attendanceDate: attendance.attendanceDate,
        totalStudents: attendance.records.length,
        presentCount: attendance.records.filter((record) => record.status === "present").length,
        absentCount: attendance.records.filter((record) => record.status === "absent").length,
        lateCount: attendance.records.filter((record) => record.status === "late").length,
        leaveCount: attendance.records.filter((record) => record.status === "leave").length
      }
    });

    res.status(200).json({
      success: true,
      message: "Student attendance deleted successfully"
    });
  } catch (error) {
    return handleAttendanceError(
      res,
      error,
      "Failed to delete student attendance"
    );
  }
};