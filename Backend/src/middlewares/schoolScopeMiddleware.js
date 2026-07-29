const mongoose = require("mongoose");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const schoolScope = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    req.query = req.query || {};
    req.body = req.body || {};

    const requestedSchoolId = req.query.schoolId || req.body.schoolId;

    // Super Admin can access all schools
    if (req.user.role === "super_admin") {
      if (requestedSchoolId && !isValidObjectId(requestedSchoolId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid school ID format"
        });
      }

      req.isSuperAdmin = true;
      req.schoolFilter = requestedSchoolId
        ? { schoolId: requestedSchoolId }
        : {};

      return next();
    }

    // Other users must have schoolId
    if (!req.user.schoolId) {
      return res.status(403).json({
        success: false,
        message: "School is not assigned to this user"
      });
    }

    const userSchoolId = req.user.schoolId.toString();

    if (!isValidObjectId(userSchoolId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user school ID format"
      });
    }

    if (
      requestedSchoolId &&
      requestedSchoolId.toString() !== userSchoolId
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access another school's data"
      });
    }

    req.query.schoolId = userSchoolId;
    req.body.schoolId = userSchoolId;

    req.isSuperAdmin = false;
    req.schoolFilter = { schoolId: userSchoolId };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = schoolScope;