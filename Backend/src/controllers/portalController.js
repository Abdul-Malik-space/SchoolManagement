const mongoose = require("mongoose");

const Student = require("../models/Student");
const StudentAttendance = require("../models/StudentAttendance");
const FeeCollection = require("../models/FeeCollection");

const normalizeDate = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const buildAttendanceFilter = (studentId, query) => {
  const filter = {
    "records.studentId": studentId
  };

  if (query.date) {
    filter.attendanceDate = normalizeDate(query.date);
  }

  if (query.month) {
    const [year, month] = query.month.split("-");
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 1);

    filter.attendanceDate = {
      $gte: startDate,
      $lt: endDate
    };
  }

  return filter;
};

const formatAttendanceForOneStudent = (attendanceDocs, studentId) => {
  return attendanceDocs
    .map((attendance) => {
      const matchedRecord = attendance.records.find((record) => {
        const recordStudentId = record.studentId?._id || record.studentId;
        return recordStudentId.toString() === studentId.toString();
      });

      return {
        _id: attendance._id,
        schoolId: attendance.schoolId,
        classId: attendance.classId,
        sectionName: attendance.sectionName,
        attendanceDate: attendance.attendanceDate,
        record: matchedRecord || null,
        createdAt: attendance.createdAt,
        updatedAt: attendance.updatedAt
      };
    })
    .filter((item) => item.record !== null);
};

const getStudentByLoggedInUser = async (userId) => {
  return await Student.findOne({ studentUserId: userId })
    .populate("schoolId", "schoolName type address phone email sessionYear")
    .populate("classId", "className numericOrder")
    .populate("studentUserId", "name email phone role")
    .populate("parentUserIds", "name email phone role");
};

const getChildForParent = async (studentId, parentUserId) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return null;
  }

  return await Student.findOne({
    _id: studentId,
    parentUserIds: parentUserId
  })
    .populate("schoolId", "schoolName type address phone email sessionYear")
    .populate("classId", "className numericOrder")
    .populate("studentUserId", "name email phone role")
    .populate("parentUserIds", "name email phone role");
};

/* =========================
   Student Portal
========================= */

exports.getStudentMyProfile = async (req, res) => {
  try {
    const student = await getStudentByLoggedInUser(req.user._id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "No student profile linked with this user account"
      });
    }

    res.status(200).json({
      success: true,
      student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch student profile",
      error: error.message
    });
  }
};

exports.getStudentMyAttendance = async (req, res) => {
  try {
    const student = await getStudentByLoggedInUser(req.user._id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "No student profile linked with this user account"
      });
    }

    const filter = buildAttendanceFilter(student._id, req.query);

    const attendanceDocs = await StudentAttendance.find(filter)
      .populate("schoolId", "schoolName type")
      .populate("classId", "className numericOrder")
      .populate("records.studentId", "name fatherName admissionNumber sectionName")
      .sort({ attendanceDate: -1 });

    const attendance = formatAttendanceForOneStudent(
      attendanceDocs,
      student._id
    );

    res.status(200).json({
      success: true,
      count: attendance.length,
      student: {
        id: student._id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        class: student.classId,
        sectionName: student.sectionName
      },
      attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch student attendance",
      error: error.message
    });
  }
};

exports.getStudentMyFees = async (req, res) => {
  try {
    const student = await getStudentByLoggedInUser(req.user._id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "No student profile linked with this user account"
      });
    }

    const filter = {
      studentId: student._id
    };

    if (req.query.feeMonth) {
      filter.feeMonth = req.query.feeMonth;
    }

    if (req.query.sessionYear) {
      filter.sessionYear = req.query.sessionYear;
    }

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    const feeRecords = await FeeCollection.find(filter)
      .populate("schoolId", "schoolName type")
      .populate("studentId", "name fatherName admissionNumber sectionName")
      .populate("classId", "className numericOrder")
      .populate("feeStructureId", "title sessionYear")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feeRecords.length,
      student: {
        id: student._id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        class: student.classId,
        sectionName: student.sectionName
      },
      feeRecords
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch student fee records",
      error: error.message
    });
  }
};

/* =========================
   Parent Portal
========================= */

exports.getParentChildren = async (req, res) => {
  try {
    const children = await Student.find({
      parentUserIds: req.user._id
    })
      .populate("schoolId", "schoolName type")
      .populate("classId", "className numericOrder")
      .select(
        "name fatherName admissionNumber sectionName gender status studentPhoto schoolId classId"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: children.length,
      children
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch children",
      error: error.message
    });
  }
};

exports.getParentChildProfile = async (req, res) => {
  try {
    const child = await getChildForParent(req.params.studentId, req.user._id);

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child not found or not linked with this parent account"
      });
    }

    res.status(200).json({
      success: true,
      child
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch child profile",
      error: error.message
    });
  }
};

exports.getParentChildAttendance = async (req, res) => {
  try {
    const child = await getChildForParent(req.params.studentId, req.user._id);

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child not found or not linked with this parent account"
      });
    }

    const filter = buildAttendanceFilter(child._id, req.query);

    const attendanceDocs = await StudentAttendance.find(filter)
      .populate("schoolId", "schoolName type")
      .populate("classId", "className numericOrder")
      .populate("records.studentId", "name fatherName admissionNumber sectionName")
      .sort({ attendanceDate: -1 });

    const attendance = formatAttendanceForOneStudent(
      attendanceDocs,
      child._id
    );

    res.status(200).json({
      success: true,
      count: attendance.length,
      child: {
        id: child._id,
        name: child.name,
        admissionNumber: child.admissionNumber,
        class: child.classId,
        sectionName: child.sectionName
      },
      attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch child attendance",
      error: error.message
    });
  }
};

exports.getParentChildFees = async (req, res) => {
  try {
    const child = await getChildForParent(req.params.studentId, req.user._id);

    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Child not found or not linked with this parent account"
      });
    }

    const filter = {
      studentId: child._id
    };

    if (req.query.feeMonth) {
      filter.feeMonth = req.query.feeMonth;
    }

    if (req.query.sessionYear) {
      filter.sessionYear = req.query.sessionYear;
    }

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    const feeRecords = await FeeCollection.find(filter)
      .populate("schoolId", "schoolName type")
      .populate("studentId", "name fatherName admissionNumber sectionName")
      .populate("classId", "className numericOrder")
      .populate("feeStructureId", "title sessionYear")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feeRecords.length,
      child: {
        id: child._id,
        name: child.name,
        admissionNumber: child.admissionNumber,
        class: child.classId,
        sectionName: child.sectionName
      },
      feeRecords
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch child fee records",
      error: error.message
    });
  }
};