const mongoose = require("mongoose");

const Class = require("../models/Class");
const School = require("../models/School");
const Student = require("../models/Student");

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
      message: "Class already exists for this school"
    });
  }

  return res.status(500).json({
    success: false,
    message: defaultMessage,
    error: error.message
  });
};

const normalizeSection = (section) => {
  if (typeof section === "string") {
    return {
      sectionName: section
    };
  }

  return { ...section };
};

const findExistingSection = (existingSections, section) => {
  if (!Array.isArray(existingSections)) {
    return null;
  }

  return existingSections.find((existingSection) => {
    if (
      section._id &&
      existingSection._id &&
      section._id.toString() === existingSection._id.toString()
    ) {
      return true;
    }

    if (
      section.sectionName &&
      existingSection.sectionName &&
      section.sectionName.trim().toLowerCase() ===
        existingSection.sectionName.trim().toLowerCase()
    ) {
      return true;
    }

    return false;
  });
};

const formatSections = (sections, existingSections = []) => {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections.map((section) => {
    const normalizedSection = normalizeSection(section);
    const existingSection = findExistingSection(existingSections, normalizedSection);

    if (existingSection && !normalizedSection._id) {
      normalizedSection._id = existingSection._id;
    }

    return normalizedSection;
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

  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
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

  return {
    school
  };
};

const verifyClassSchoolAccess = (req, classData, actionText = "access") => {
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

  if (classData.schoolId.toString() !== userSchoolId.toString()) {
    return {
      status: 403,
      response: {
        success: false,
        message: `You are not allowed to ${actionText} another school's class`
      }
    };
  }

  return null;
};

const buildClassFilter = (req, deletedStatus = false) => {
  const filter = {
    ...getSchoolFilter(req)
  };

  if (deletedStatus === true) {
    filter.isDeleted = true;
  } else {
    filter.isDeleted = { $ne: true };
  }

  if (isSuperAdmin(req) && req.query.schoolId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.schoolId)) {
      return {
        invalid: true,
        message: "Invalid school ID format"
      };
    }

    filter.schoolId = req.query.schoolId;
  }

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === "true";
  }

  if (req.query.search) {
    filter.className = new RegExp(req.query.search, "i");
  }

  return filter;
};

exports.createClass = async (req, res) => {
  try {
    const {
      className,
      numericOrder,
      sections
    } = req.body;

    const schoolId = getCreateSchoolId(req);

    if (!schoolId || !className) {
      return res.status(400).json({
        success: false,
        message: "School ID and class name are required"
      });
    }

    const schoolAccess = await verifySchoolAccess(req, schoolId);

    if (schoolAccess.status) {
      return res.status(schoolAccess.status).json(schoolAccess.response);
    }

    const formattedSections = formatSections(sections);

    const newClass = await Class.create({
      schoolId,
      className,
      numericOrder,
      sections: formattedSections,
      createdBy: req.user._id,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null
    });

    await createAuditLog({
      req,
      schoolId: newClass.schoolId,
      action: "CREATE",
      module: "CLASS",
      recordId: newClass._id,
      recordModel: "Class",
      description: `Class created successfully: ${newClass.className}`,
      oldData: null,
      newData: getPlainData(newClass),
      status: "success",
      metadata: {
        className: newClass.className,
        numericOrder: newClass.numericOrder,
        sectionsCount: newClass.sections.length,
        sectionNames: newClass.sections.map((section) => section.sectionName)
      }
    });

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      class: newClass
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to create class"
    );
  }
};

exports.getClasses = async (req, res) => {
  try {
    const filter = buildClassFilter(req, false);

    if (filter.invalid) {
      return res.status(400).json({
        success: false,
        message: filter.message
      });
    }

    const classes = await Class.find(filter)
      .populate("schoolId", "schoolName type")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .sort({ numericOrder: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: classes.length,
      classes
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch classes"
    );
  }
};

exports.getDeletedClasses = async (req, res) => {
  try {
    const filter = buildClassFilter(req, true);

    if (filter.invalid) {
      return res.status(400).json({
        success: false,
        message: filter.message
      });
    }

    const classes = await Class.find(filter)
      .populate("schoolId", "schoolName type")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .populate("deletedBy", "name email role")
      .sort({ deletedAt: -1, updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: classes.length,
      classes
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch deleted classes"
    );
  }
};

exports.getClassById = async (req, res) => {
  try {
    const singleClass = await Class.findOne(
      getScopedFilter(req, {
        _id: req.params.id,
        isDeleted: { $ne: true }
      })
    )
      .populate("schoolId", "schoolName type")
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    if (!singleClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found or not allowed"
      });
    }

    res.status(200).json({
      success: true,
      class: singleClass
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch class"
    );
  }
};

exports.updateClass = async (req, res) => {
  try {
    const existingClass = await Class.findOne(
      getScopedFilter(req, {
        _id: req.params.id,
        isDeleted: { $ne: true }
      })
    );

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found or not allowed"
      });
    }

    const oldClassData = getPlainData(existingClass);

    if (
      req.body.schoolId &&
      req.body.schoolId.toString() !== existingClass.schoolId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "School ID cannot be changed for class"
      });
    }

    const allowedUpdates = {};

    const allowedFields = [
      "className",
      "numericOrder",
      "sections",
      "isActive"
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        allowedUpdates[field] = req.body[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(allowedUpdates, "sections")) {
      allowedUpdates.sections = formatSections(
        allowedUpdates.sections,
        existingClass.sections
      );
    }

    allowedUpdates.updatedBy = req.user._id;

    const updatedClass = await Class.findOneAndUpdate(
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
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role");

    await createAuditLog({
      req,
      schoolId: existingClass.schoolId,
      action: "UPDATE",
      module: "CLASS",
      recordId: updatedClass._id,
      recordModel: "Class",
      description: `Class updated successfully: ${updatedClass.className}`,
      oldData: oldClassData,
      newData: getPlainData(updatedClass),
      status: "success",
      metadata: {
        className: updatedClass.className,
        numericOrder: updatedClass.numericOrder,
        updatedFields: Object.keys(allowedUpdates).filter((field) => field !== "updatedBy"),
        sectionsCount: updatedClass.sections.length,
        sectionNames: updatedClass.sections.map((section) => section.sectionName)
      }
    });

    res.status(200).json({
      success: true,
      message: "Class updated successfully",
      class: updatedClass
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to update class"
    );
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    if (classData.isDeleted === true) {
      return res.status(400).json({
        success: false,
        message: "Class is already deleted"
      });
    }

    const accessError = verifyClassSchoolAccess(req, classData, "delete");

    if (accessError) {
      return res.status(accessError.status).json(accessError.response);
    }

    const activeStudentsCount = await Student.countDocuments({
      schoolId: classData.schoolId,
      classId: classData._id,
      isDeleted: { $ne: true }
    });

    if (activeStudentsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this class because ${activeStudentsCount} active student(s) are linked with it`
      });
    }

    const oldClassData = getPlainData(classData);

    classData.isDeleted = true;
    classData.deletedAt = new Date();
    classData.deletedBy = req.user._id;
    classData.updatedBy = req.user._id;

    await classData.save();

    await createAuditLog({
      req,
      schoolId: classData.schoolId,
      action: "DELETE",
      module: "CLASS",
      recordId: classData._id,
      recordModel: "Class",
      description: `Class soft deleted successfully: ${classData.className}`,
      oldData: oldClassData,
      newData: getPlainData(classData),
      status: "success",
      metadata: {
        className: classData.className,
        numericOrder: classData.numericOrder,
        sectionsCount: classData.sections.length,
        sectionNames: classData.sections.map((section) => section.sectionName),
        deletedAt: classData.deletedAt,
        softDelete: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Class deleted successfully",
      class: classData
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to delete class"
    );
  }
};

exports.restoreClass = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    if (classData.isDeleted !== true) {
      return res.status(400).json({
        success: false,
        message: "Class is not deleted"
      });
    }

    const accessError = verifyClassSchoolAccess(req, classData, "restore");

    if (accessError) {
      return res.status(accessError.status).json(accessError.response);
    }

    const oldClassData = getPlainData(classData);

    classData.isDeleted = false;
    classData.deletedAt = null;
    classData.deletedBy = null;
    classData.updatedBy = req.user._id;

    await classData.save();

    await classData.populate([
      { path: "schoolId", select: "schoolName type" },
      { path: "createdBy", select: "name email role" },
      { path: "updatedBy", select: "name email role" }
    ]);

    await createAuditLog({
      req,
      schoolId: classData.schoolId,
      action: "UPDATE",
      module: "CLASS",
      recordId: classData._id,
      recordModel: "Class",
      description: `Class restored successfully: ${classData.className}`,
      oldData: oldClassData,
      newData: getPlainData(classData),
      status: "success",
      metadata: {
        className: classData.className,
        numericOrder: classData.numericOrder,
        sectionsCount: classData.sections.length,
        sectionNames: classData.sections.map((section) => section.sectionName),
        restored: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Class restored successfully",
      class: classData
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to restore class"
    );
  }
};