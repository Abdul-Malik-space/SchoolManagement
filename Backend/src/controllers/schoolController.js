const School = require("../models/School");
const { createAuditLog } = require("../utils/auditLogHelper");

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
      message: "School with this information already exists"
    });
  }

  return res.status(500).json({
    success: false,
    message: defaultMessage,
    error: error.message
  });
};

const checkSchoolAccess = (req, schoolId) => {
  if (req.user.role === "super_admin") {
    return true;
  }

  if (!req.user.schoolId) {
    return false;
  }

  return req.user.schoolId.toString() === schoolId.toString();
};

exports.createSchool = async (req, res) => {
  try {
    const {
      schoolName,
      type,
      logo,
      address,
      phone,
      email,
      sessionYear,
      isActive
    } = req.body;

    if (!schoolName || !address || !phone || !sessionYear) {
      return res.status(400).json({
        success: false,
        message: "School name, address, phone and session year are required"
      });
    }

    const school = await School.create({
      schoolName,
      type,
      logo,
      address,
      phone,
      email,
      sessionYear,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });

    await createAuditLog({
      req,
      schoolId: school._id,
      action: "CREATE",
      module: "SCHOOL",
      recordId: school._id,
      recordModel: "School",
      description: `${req.user.role} created school: ${school.schoolName}`,
      newData: school.toObject(),
      status: "success"
    });

    res.status(201).json({
      success: true,
      message: "School created successfully",
      school
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to create school"
    );
  }
};

exports.getSchools = async (req, res) => {
  try {
    const schools = await School.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: schools.length,
      schools
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch schools"
    );
  }
};

exports.getSchoolById = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found"
      });
    }

    if (!checkSchoolAccess(req, school._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this school"
      });
    }

    res.status(200).json({
      success: true,
      school
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch school"
    );
  }
};

exports.updateSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found"
      });
    }

    if (!checkSchoolAccess(req, school._id)) {
      await createAuditLog({
        req,
        schoolId: school._id,
        action: "UPDATE",
        module: "SCHOOL",
        recordId: school._id,
        recordModel: "School",
        description: `${req.user.role} tried to update school without permission`,
        oldData: school.toObject(),
        newData: req.body,
        status: "failed"
      });

      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this school"
      });
    }

    const oldData = school.toObject();

    const allowedUpdates = {};

    const commonAllowedFields = [
      "schoolName",
      "type",
      "logo",
      "address",
      "phone",
      "email",
      "sessionYear"
    ];

    commonAllowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        allowedUpdates[field] = req.body[field];
      }
    });

    if (req.user.role === "super_admin") {
      const superAdminOnlyFields = [
        "isActive",
        "subscriptionPlan",
        "subscriptionStatus",
        "subscriptionStartDate",
        "subscriptionEndDate"
      ];

      superAdminOnlyFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          allowedUpdates[field] = req.body[field];
        }
      });
    }

    if (
      req.user.role !== "super_admin" &&
      (
        req.body.isActive !== undefined ||
        req.body.subscriptionPlan !== undefined ||
        req.body.subscriptionStatus !== undefined ||
        req.body.subscriptionStartDate !== undefined ||
        req.body.subscriptionEndDate !== undefined
      )
    ) {
      await createAuditLog({
        req,
        schoolId: school._id,
        action: "UPDATE",
        module: "SCHOOL",
        recordId: school._id,
        recordModel: "School",
        description: `${req.user.role} tried to update restricted school fields`,
        oldData,
        newData: req.body,
        status: "failed"
      });

      return res.status(403).json({
        success: false,
        message: "Only super admin can update activation or subscription details"
      });
    }

    const updatedSchool = await School.findByIdAndUpdate(
      req.params.id,
      allowedUpdates,
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    const isStatusChange =
      req.body.isActive !== undefined &&
      oldData.isActive !== updatedSchool.isActive;

    let action = "UPDATE";
    let description = `${req.user.role} updated school: ${updatedSchool.schoolName}`;

    if (isStatusChange) {
      action = "STATUS_CHANGE";

      description = updatedSchool.isActive
        ? `${req.user.role} activated school: ${updatedSchool.schoolName}`
        : `${req.user.role} deactivated school: ${updatedSchool.schoolName}`;
    }

    await createAuditLog({
      req,
      schoolId: updatedSchool._id,
      action,
      module: "SCHOOL",
      recordId: updatedSchool._id,
      recordModel: "School",
      description,
      oldData,
      newData: updatedSchool.toObject(),
      status: "success"
    });

    res.status(200).json({
      success: true,
      message: "School updated successfully",
      school: updatedSchool
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to update school"
    );
  }
};