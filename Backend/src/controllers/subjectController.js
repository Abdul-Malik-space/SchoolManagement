const mongoose = require("mongoose");

const Subject = require("../models/Subject");
const School = require("../models/School");
const Class = require("../models/Class");
const Teacher = require("../models/Teacher");

const {
  createAuditLog
} = require("../utils/auditLogHelper");

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

const handleControllerError = (res, error, defaultMessage) => {
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
      message: "Subject already exists for this class or school"
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

  return { school };
};

const verifySubjectSchoolAccess = (req, subject, actionText = "access") => {
  if (isSuperAdmin(req)) {
    return null;
  }

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

  if (subject.schoolId.toString() !== userSchoolId.toString()) {
    return {
      status: 403,
      response: {
        success: false,
        message: `You are not allowed to ${actionText} another school's subject`
      }
    };
  }

  return null;
};

const verifyClassBelongsToSchool = async (classId, schoolId) => {
  if (!classId || !isValidObjectId(classId)) {
    return null;
  }

  const classData = await Class.findOne({
    _id: classId,
    schoolId,
    isDeleted: { $ne: true }
  });

  return classData;
};

const verifyTeacherBelongsToSchool = async (teacherId, schoolId) => {
  if (!teacherId) {
    return null;
  }

  if (!isValidObjectId(teacherId)) {
    return null;
  }

  const teacher = await Teacher.findOne({
    _id: teacherId,
    schoolId,
    isDeleted: { $ne: true }
  });

  return teacher;
};

const buildSubjectFilter = (req, deletedStatus = false) => {
  const filter = {
    ...getSchoolFilter(req)
  };

  if (deletedStatus === true) {
    filter.isDeleted = true;
  } else {
    filter.isDeleted = { $ne: true };
  }

  if (isSuperAdmin(req) && req.query.schoolId) {
    if (!isValidObjectId(req.query.schoolId)) {
      return {
        invalid: true,
        message: "Invalid school ID format"
      };
    }

    filter.schoolId = req.query.schoolId;
  }

  if (req.query.classId) {
    if (!isValidObjectId(req.query.classId)) {
      return {
        invalid: true,
        message: "Invalid class ID format"
      };
    }

    filter.classId = req.query.classId;
  }

  if (req.query.teacherId) {
    if (!isValidObjectId(req.query.teacherId)) {
      return {
        invalid: true,
        message: "Invalid teacher ID format"
      };
    }

    filter.teacherId = req.query.teacherId;
  }

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === "true";
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, "i");

    filter.$or = [
      { subjectCode: searchRegex },
      { subjectName: searchRegex },
      { description: searchRegex }
    ];
  }

  return filter;
};

exports.createSubject = async (req, res) => {
  try {
    const {
      classId,
      teacherId,
      subjectCode,
      subjectName,
      description
    } = req.body;

    const schoolId = getCreateSchoolId(req);
    const finalTeacherId = teacherId || null;

    if (!schoolId || !classId || !subjectCode || !subjectName) {
      return res.status(400).json({
        success: false,
        message: "School ID, class ID, subject code and subject name are required"
      });
    }

    const schoolAccess = await verifySchoolAccess(req, schoolId);

    if (schoolAccess.status) {
      return res.status(schoolAccess.status).json(schoolAccess.response);
    }

    const classData = await verifyClassBelongsToSchool(classId, schoolId);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found, deleted or does not belong to this school"
      });
    }

    if (finalTeacherId) {
      const teacher = await verifyTeacherBelongsToSchool(finalTeacherId, schoolId);

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found, deleted or does not belong to this school"
        });
      }
    }

    const subject = await Subject.create({
      schoolId,
      classId,
      teacherId: finalTeacherId,
      subjectCode,
      subjectName,
      description,
      createdBy: req.user._id,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null
    });

    await createAuditLog({
      req,
      schoolId: subject.schoolId,
      action: "CREATE",
      module: "SUBJECT",
      recordId: subject._id,
      recordModel: "Subject",
      description: `Subject created successfully: ${subject.subjectName}`,
      oldData: null,
      newData: getPlainData(subject),
      status: "success",
      metadata: {
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        classId: subject.classId,
        teacherId: subject.teacherId || null
      }
    });

    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      subject
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to create subject"
    );
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const filter = buildSubjectFilter(req, false);

    if (filter.invalid) {
      return res.status(400).json({
        success: false,
        message: filter.message
      });
    }

    const subjects = await Subject.find(filter)
      .populate("schoolId", "schoolName type")
      .populate("classId", "className numericOrder")
      .populate("teacherId", "name phone qualification")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subjects.length,
      subjects
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch subjects"
    );
  }
};

exports.getDeletedSubjects = async (req, res) => {
  try {
    const filter = buildSubjectFilter(req, true);

    if (filter.invalid) {
      return res.status(400).json({
        success: false,
        message: filter.message
      });
    }

    const subjects = await Subject.find(filter)
      .populate("schoolId", "schoolName type")
      .populate("classId", "className numericOrder")
      .populate("teacherId", "name phone qualification")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("deletedBy", "name email role")
      .sort({ deletedAt: -1, updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: subjects.length,
      subjects
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch deleted subjects"
    );
  }
};

exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findOne(
      getScopedFilter(req, {
        _id: req.params.id,
        isDeleted: { $ne: true }
      })
    )
      .populate("schoolId", "schoolName type")
      .populate("classId", "className numericOrder")
      .populate("teacherId", "name phone qualification")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or not allowed"
      });
    }

    res.status(200).json({
      success: true,
      subject
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch subject"
    );
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const existingSubject = await Subject.findOne(
      getScopedFilter(req, {
        _id: req.params.id,
        isDeleted: { $ne: true }
      })
    );

    if (!existingSubject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or not allowed"
      });
    }

    const oldSubjectData = getPlainData(existingSubject);

    if (
      req.body.schoolId &&
      req.body.schoolId.toString() !== existingSubject.schoolId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "School ID cannot be changed for subject"
      });
    }

    const schoolId = existingSubject.schoolId;

    if (req.body.classId !== undefined) {
      const classData = await verifyClassBelongsToSchool(
        req.body.classId,
        schoolId
      );

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: "Class not found, deleted or does not belong to this school"
        });
      }
    }

    if (
      req.body.teacherId !== undefined &&
      req.body.teacherId !== "" &&
      req.body.teacherId !== null
    ) {
      const teacher = await verifyTeacherBelongsToSchool(
        req.body.teacherId,
        schoolId
      );

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found, deleted or does not belong to this school"
        });
      }
    }

    const allowedUpdates = {};

    const allowedFields = [
      "classId",
      "teacherId",
      "subjectCode",
      "subjectName",
      "description",
      "isActive"
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        allowedUpdates[field] = req.body[field];
      }
    });

    if (allowedUpdates.teacherId === "") {
      allowedUpdates.teacherId = null;
    }

    if (allowedUpdates.teacherId === undefined) {
      delete allowedUpdates.teacherId;
    }

    allowedUpdates.updatedBy = req.user._id;

    const subject = await Subject.findOneAndUpdate(
      getScopedFilter(req, {
        _id: req.params.id,
        isDeleted: { $ne: true }
      }),
      allowedUpdates,
      {
        returnDocument: "after",
        runValidators: true
      }
    )
      .populate("schoolId", "schoolName type")
      .populate("classId", "className numericOrder")
      .populate("teacherId", "name phone qualification")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    await createAuditLog({
      req,
      schoolId: existingSubject.schoolId,
      action: "UPDATE",
      module: "SUBJECT",
      recordId: subject._id,
      recordModel: "Subject",
      description: `Subject updated successfully: ${subject.subjectName}`,
      oldData: oldSubjectData,
      newData: getPlainData(subject),
      status: "success",
      metadata: {
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        updatedFields: Object.keys(allowedUpdates).filter((field) => field !== "updatedBy"),
        classId: subject.classId,
        teacherId: subject.teacherId || null
      }
    });

    res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      subject
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to update subject"
    );
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    if (subject.isDeleted === true) {
      return res.status(400).json({
        success: false,
        message: "Subject is already deleted"
      });
    }

    const accessError = verifySubjectSchoolAccess(req, subject, "delete");

    if (accessError) {
      return res.status(accessError.status).json(accessError.response);
    }

    const oldSubjectData = getPlainData(subject);

    subject.isDeleted = true;
    subject.deletedAt = new Date();
    subject.deletedBy = req.user._id;
    subject.updatedBy = req.user._id;

    await subject.save();

    await createAuditLog({
      req,
      schoolId: subject.schoolId,
      action: "DELETE",
      module: "SUBJECT",
      recordId: subject._id,
      recordModel: "Subject",
      description: `Subject soft deleted successfully: ${subject.subjectName}`,
      oldData: oldSubjectData,
      newData: getPlainData(subject),
      status: "success",
      metadata: {
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        classId: subject.classId,
        teacherId: subject.teacherId || null,
        deletedAt: subject.deletedAt,
        softDelete: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
      subject
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to delete subject"
    );
  }
};

exports.restoreSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    if (subject.isDeleted !== true) {
      return res.status(400).json({
        success: false,
        message: "Subject is not deleted"
      });
    }

    const accessError = verifySubjectSchoolAccess(req, subject, "restore");

    if (accessError) {
      return res.status(accessError.status).json(accessError.response);
    }

    const oldSubjectData = getPlainData(subject);

    subject.isDeleted = false;
    subject.deletedAt = null;
    subject.deletedBy = null;
    subject.updatedBy = req.user._id;

    await subject.save();

    await subject.populate([
      { path: "schoolId", select: "schoolName type" },
      { path: "classId", select: "className numericOrder" },
      { path: "teacherId", select: "name phone qualification" },
      { path: "createdBy", select: "name email role" },
      { path: "updatedBy", select: "name email role" }
    ]);

    await createAuditLog({
      req,
      schoolId: subject.schoolId,
      action: "UPDATE",
      module: "SUBJECT",
      recordId: subject._id,
      recordModel: "Subject",
      description: `Subject restored successfully: ${subject.subjectName}`,
      oldData: oldSubjectData,
      newData: getPlainData(subject),
      status: "success",
      metadata: {
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        classId: subject.classId,
        teacherId: subject.teacherId || null,
        restored: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Subject restored successfully",
      subject
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to restore subject"
    );
  }
};