const AuditLog = require("../models/AuditLog");

const getClientIp = (req) => {
  if (!req) return "";

  const forwardedFor = req.headers["x-forwarded-for"];

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return (
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    ""
  );
};

const getUserAgent = (req) => {
  if (!req) return "";
  return req.headers["user-agent"] || "";
};

const safeString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const safeObject = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value.toObject === "function") {
    return value.toObject();
  }

  return value;
};

const getUserSchoolId = (user) => {
  if (!user || !user.schoolId) {
    return null;
  }

  if (user.schoolId._id) {
    return user.schoolId._id;
  }

  return user.schoolId;
};

const createAuditLog = async ({
  req,
  user,
  schoolId = null,
  action = "OTHER",
  module,
  recordId = null,
  recordModel = "",
  description = "",
  oldData = null,
  newData = null,
  status = "success",
  metadata = {}
}) => {
  try {
    const currentUser = user || req?.user;

    if (!currentUser) {
      return null;
    }

    if (!module) {
      return null;
    }

    const finalSchoolId = schoolId || getUserSchoolId(currentUser);

    const log = await AuditLog.create({
      schoolId: finalSchoolId,
      userId: currentUser._id,
      userName: safeString(currentUser.name),
      userEmail: safeString(currentUser.email),
      userRole: safeString(currentUser.role),
      action,
      module,
      recordId,
      recordModel: safeString(recordModel),
      description: safeString(description),
      oldData: safeObject(oldData),
      newData: safeObject(newData),
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      status,
      metadata: metadata || {}
    });

    return log;
  } catch (error) {
    console.error("Audit log creation failed:", error.message);
    return null;
  }
};

module.exports = {
  createAuditLog
};