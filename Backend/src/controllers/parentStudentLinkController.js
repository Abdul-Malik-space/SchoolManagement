const mongoose = require("mongoose");

const ParentStudentLink = require("../models/ParentStudentLink");
const Student = require("../models/Student");
const User = require("../models/User");

const { createAuditLog } = require("../utils/auditLogHelper");
const {
  getPaginationOptions,
  buildPagination
} = require("../utils/pagination");

const DEFAULT_PERMISSIONS = {
  dashboard: true,
  studentProfile: true,
  attendance: true,
  timetable: true,
  academics: true,
  fees: true,
  receipts: true,
  notices: true,
  messages: true,
  documents: false
};

const DEFAULT_NOTIFICATIONS = {
  inApp: true,
  email: true,
  sms: false,
  attendanceAlerts: true,
  feeAlerts: true,
  academicUpdates: true,
  timetableUpdates: true,
  noticeAlerts: true,
  messageAlerts: true
};

const RELATIONSHIPS = [
  "father",
  "mother",
  "guardian",
  "grandfather",
  "grandmother",
  "brother",
  "sister",
  "uncle",
  "aunt",
  "other"
];

const isValidId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const normalizeText = (value) =>
  String(value || "").trim().replace(/\s+/g, " ");

const toId = (value) =>
  value ? String(value._id || value) : null;

const getCurrentUserId = (req) =>
  toId(req.user?._id || req.user?.id);

const getCurrentSchoolId = (req) =>
  toId(req.user?.schoolId);

const hasPath = (path) =>
  Boolean(ParentStudentLink.schema.path(path));

const setSupported = (target, path, value) => {
  if (value !== undefined && hasPath(path)) {
    target[path] = value;
  }
};

const getEnumValues = (path, fallback) => {
  const values = ParentStudentLink.schema.path(path)?.enumValues;
  return Array.isArray(values) && values.length ? values : fallback;
};

const sanitizeBooleanMap = (source, defaults, current = {}) => {
  const input =
    source && typeof source === "object" && !Array.isArray(source)
      ? source
      : {};

  return Object.keys(defaults).reduce((result, key) => {
    if (typeof input[key] === "boolean") {
      result[key] = input[key];
    } else if (typeof current[key] === "boolean") {
      result[key] = current[key];
    } else {
      result[key] = defaults[key];
    }

    return result;
  }, {});
};

const resolveSchoolId = (req, requestedSchoolId = null) => {
  if (req.user?.role === "super_admin") {
    return (
      requestedSchoolId ||
      req.body?.schoolId ||
      req.query?.schoolId ||
      null
    );
  }

  return getCurrentSchoolId(req);
};

const ensureSchoolAccess = (req, res, schoolId) => {
  if (!schoolId || !isValidId(schoolId)) {
    res.status(400).json({
      success: false,
      message: "A valid school ID is required."
    });

    return false;
  }

  if (req.user?.role === "super_admin") {
    return true;
  }

  if (String(getCurrentSchoolId(req)) !== String(schoolId)) {
    res.status(403).json({
      success: false,
      message:
        "You are not allowed to manage parent links for another school."
    });

    return false;
  }

  return true;
};

const handleError = (res, error, defaultMessage) => {
  console.error(`${defaultMessage}:`, error);

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors || {})
        .map((item) => item.message)
        .join(" ")
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "One of the supplied record IDs is invalid."
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "This parent is already linked with the selected student."
    });
  }

  return res.status(500).json({
    success: false,
    message: defaultMessage,
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : undefined
  });
};

const populateLink = (query) => {
  query
    .populate(
      "schoolId",
      "schoolName type address phone email sessionYear isActive"
    )
    .populate(
      "parentUserId",
      "name email phone address photo role isActive mustChangePassword lastLoginAt"
    )
    .populate({
      path: "studentId",
      select:
        "schoolId classId sectionId sectionName studentUserId admissionNumber name fatherName guardianName gender dateOfBirth contactNumber guardianContact admissionDate studentPhoto status isDeleted",
      populate: [
        {
          path: "classId",
          select: "className numericOrder sections isActive"
        },
        {
          path: "studentUserId",
          select:
            "name email phone photo role isActive mustChangePassword lastLoginAt"
        }
      ]
    });

  ["createdBy", "updatedBy", "verifiedBy", "deletedBy", "restoredBy"]
    .filter(hasPath)
    .forEach((path) => {
      query.populate(path, "name email role");
    });

  return query;
};

const buildSummary = (links) => ({
  totalLinks: links.length,
  activeLinks: links.filter(
    (link) => !link.isDeleted && link.status === "active"
  ).length,
  verifiedLinks: links.filter(
    (link) =>
      !link.isDeleted &&
      link.verificationStatus === "verified"
  ).length,
  primaryLinks: links.filter(
    (link) => !link.isDeleted && link.isPrimary
  ).length,
  emergencyContactLinks: links.filter(
    (link) => !link.isDeleted && link.isEmergencyContact
  ).length,
  collectionAuthorizedLinks: links.filter(
    (link) => !link.isDeleted && link.canCollectStudent
  ).length
});

const getParentAndStudent = async ({
  parentUserId,
  studentId,
  schoolId
}) => {
  const [parent, student] = await Promise.all([
    User.findOne({
      _id: parentUserId,
      schoolId,
      role: "parent"
    }),

    Student.findOne({
      _id: studentId,
      schoolId,
      isDeleted: false
    }).populate("classId", "className numericOrder")
  ]);

  if (!parent) {
    const error = new Error(
      "Parent account was not found in the selected school."
    );
    error.statusCode = 404;
    throw error;
  }

  if (!student) {
    const error = new Error(
      "Student record was not found in the selected school."
    );
    error.statusCode = 404;
    throw error;
  }

  if (!parent.isActive) {
    const error = new Error(
      "An inactive parent account cannot be linked with a student."
    );
    error.statusCode = 403;
    throw error;
  }

  return { parent, student };
};

const getManagedLink = async (
  req,
  res,
  includeDeleted = true
) => {
  const linkId = req.params.linkId || req.params.id;

  if (!isValidId(linkId)) {
    res.status(400).json({
      success: false,
      message: "Invalid parent–student link ID."
    });

    return null;
  }

  const filter = { _id: linkId };

  if (!includeDeleted) {
    filter.isDeleted = false;
  }

  const link = await ParentStudentLink.findOne(filter);

  if (!link) {
    res.status(404).json({
      success: false,
      message: "Parent–student link was not found."
    });

    return null;
  }

  if (!ensureSchoolAccess(req, res, toId(link.schoolId))) {
    return null;
  }

  return link;
};

const buildPayload = ({
  req,
  body,
  parent,
  student,
  schoolId,
  currentLink = null,
  creating = false
}) => {
  const payload = {};

  const relationship =
    body.relationship !== undefined
      ? normalizeText(body.relationship).toLowerCase()
      : currentLink?.relationship || "guardian";

  const allowedRelationships = getEnumValues(
    "relationship",
    RELATIONSHIPS
  );

  if (!allowedRelationships.includes(relationship)) {
    const error = new Error(
      `Relationship must be one of: ${allowedRelationships.join(", ")}.`
    );
    error.statusCode = 400;
    throw error;
  }

  const customRelationship =
    body.customRelationship !== undefined
      ? normalizeText(body.customRelationship)
      : currentLink?.customRelationship || "";

  if (relationship === "other" && !customRelationship) {
    const error = new Error(
      "Custom relationship is required when relationship is other."
    );
    error.statusCode = 400;
    throw error;
  }

  setSupported(payload, "schoolId", schoolId);
  setSupported(payload, "parentUserId", parent._id);
  setSupported(payload, "studentId", student._id);
  setSupported(payload, "relationship", relationship);
  setSupported(
    payload,
    "customRelationship",
    relationship === "other" ? customRelationship : ""
  );

  ["isPrimary", "isEmergencyContact", "canCollectStudent"].forEach(
    (field) => {
      if (typeof body[field] === "boolean") {
        setSupported(payload, field, body[field]);
      } else if (creating) {
        setSupported(payload, field, false);
      }
    }
  );

  setSupported(
    payload,
    "accessPermissions",
    sanitizeBooleanMap(
      body.accessPermissions || body.permissions,
      DEFAULT_PERMISSIONS,
      currentLink?.accessPermissions || {}
    )
  );

  setSupported(
    payload,
    "notificationPreferences",
    sanitizeBooleanMap(
      body.notificationPreferences,
      DEFAULT_NOTIFICATIONS,
      currentLink?.notificationPreferences || {}
    )
  );

  if (body.preferredLanguage !== undefined || creating) {
    setSupported(
      payload,
      "preferredLanguage",
      normalizeText(
        body.preferredLanguage ||
          currentLink?.preferredLanguage ||
          "en"
      ).toLowerCase()
    );
  }

  if (body.notes !== undefined) {
    setSupported(payload, "notes", normalizeText(body.notes));
  }

  const allowedStatuses = getEnumValues("status", [
    "active",
    "inactive",
    "suspended",
    "revoked"
  ]);

  const status =
    body.status !== undefined
      ? normalizeText(body.status).toLowerCase()
      : creating
        ? "active"
        : currentLink?.status;

  if (status && !allowedStatuses.includes(status)) {
    const error = new Error(
      `Status must be one of: ${allowedStatuses.join(", ")}.`
    );
    error.statusCode = 400;
    throw error;
  }

  setSupported(payload, "status", status);

  const allowedVerificationStatuses = getEnumValues(
    "verificationStatus",
    ["pending", "verified", "rejected"]
  );

  const verificationStatus =
    body.verificationStatus !== undefined
      ? normalizeText(body.verificationStatus).toLowerCase()
      : creating
        ? "verified"
        : currentLink?.verificationStatus;

  if (
    verificationStatus &&
    !allowedVerificationStatuses.includes(verificationStatus)
  ) {
    const error = new Error(
      `Verification status must be one of: ${allowedVerificationStatuses.join(
        ", "
      )}.`
    );
    error.statusCode = 400;
    throw error;
  }

  setSupported(
    payload,
    "verificationStatus",
    verificationStatus
  );

  if (body.verificationNotes !== undefined) {
    setSupported(
      payload,
      "verificationNotes",
      normalizeText(body.verificationNotes)
    );
  }

  if (creating) {
    setSupported(
      payload,
      "linkSource",
      normalizeText(body.linkSource || "admin_created").toLowerCase()
    );
    setSupported(payload, "linkedAt", new Date());
    setSupported(payload, "createdBy", getCurrentUserId(req));
  }

  setSupported(payload, "updatedBy", getCurrentUserId(req));

  if (verificationStatus === "verified") {
    setSupported(
      payload,
      "verifiedAt",
      currentLink?.verifiedAt || new Date()
    );
    setSupported(payload, "verifiedBy", getCurrentUserId(req));
  } else if (verificationStatus) {
    setSupported(payload, "verifiedAt", null);
    setSupported(payload, "verifiedBy", null);
  }

  setSupported(payload, "parentSnapshot", {
    name: parent.name || "",
    email: parent.email || "",
    phone: parent.phone || ""
  });

  setSupported(payload, "studentSnapshot", {
    name: student.name || "",
    admissionNumber: student.admissionNumber || "",
    classId: student.classId?._id || student.classId || null,
    className: student.classId?.className || "",
    sectionId: student.sectionId || null,
    sectionName: student.sectionName || ""
  });

  setSupported(payload, "isDeleted", false);
  setSupported(payload, "deletedAt", null);
  setSupported(payload, "deletedBy", null);

  return payload;
};

const syncStudentParentUserIds = async (link) => {
  const activeAndVerified =
    !link.isDeleted &&
    link.status === "active" &&
    link.verificationStatus === "verified";

  await Student.updateOne(
    {
      _id: link.studentId,
      schoolId: link.schoolId,
      isDeleted: false
    },
    activeAndVerified
      ? {
          $addToSet: {
            parentUserIds: link.parentUserId
          }
        }
      : {
          $pull: {
            parentUserIds: link.parentUserId
          }
        }
  );
};

const enforceSinglePrimaryGuardian = async (link) => {
  if (!link.isPrimary || link.isDeleted) return;

  const update = {
    $set: {
      isPrimary: false
    }
  };

  if (hasPath("updatedBy")) {
    update.$set.updatedBy = link.updatedBy || null;
  }

  await ParentStudentLink.updateMany(
    {
      _id: { $ne: link._id },
      schoolId: link.schoolId,
      studentId: link.studentId,
      isDeleted: false,
      isPrimary: true
    },
    update
  );
};

const fetchPopulatedLink = (linkId) =>
  populateLink(
    ParentStudentLink.findById(linkId)
  );

/*
|--------------------------------------------------------------------------
| Get All Parent–Student Links
|--------------------------------------------------------------------------
*/

const getParentStudentLinks = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const filter = {};

    const schoolId = resolveSchoolId(req, req.query.schoolId);

    if (schoolId) {
      if (!ensureSchoolAccess(req, res, schoolId)) return;
      filter.schoolId = schoolId;
    } else if (req.user?.role !== "super_admin") {
      return res.status(400).json({
        success: false,
        message: "School ID is required."
      });
    }

    if (req.query.parentUserId) {
      if (!isValidId(req.query.parentUserId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent user ID."
        });
      }

      filter.parentUserId = req.query.parentUserId;
    }

    if (req.query.studentId) {
      if (!isValidId(req.query.studentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID."
        });
      }

      filter.studentId = req.query.studentId;
    }

    if (req.query.status && req.query.status !== "all") {
      filter.status = normalizeText(req.query.status).toLowerCase();
    }

    if (
      req.query.verificationStatus &&
      req.query.verificationStatus !== "all"
    ) {
      filter.verificationStatus = normalizeText(
        req.query.verificationStatus
      ).toLowerCase();
    }

    if (
      String(req.query.includeDeleted || "false").toLowerCase() !==
      "true"
    ) {
      filter.isDeleted = false;
    }

    const [links, total] = await Promise.all([
      populateLink(
        ParentStudentLink.find(filter)
      )
        .sort({ isPrimary: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),

      ParentStudentLink.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        links,
        summary: buildSummary(links),
        pagination: buildPagination({
          total,
          page,
          limit
        })
      }
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to fetch parent–student links."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get One Link
|--------------------------------------------------------------------------
*/

const getParentStudentLinkById = async (req, res) => {
  try {
    const link = await getManagedLink(req, res);

    if (!link) return;

    return res.status(200).json({
      success: true,
      data: {
        link: await fetchPopulatedLink(link._id)
      }
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to fetch parent–student link."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get All Children Linked with One Parent
|--------------------------------------------------------------------------
*/

const getParentStudentLinksByParent = async (req, res) => {
  try {
    const { parentUserId } = req.params;

    if (!isValidId(parentUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parent user ID."
      });
    }

    const parent = await User.findOne({
      _id: parentUserId,
      role: "parent"
    }).populate(
      "schoolId",
      "schoolName type address phone email sessionYear isActive"
    );

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent account was not found."
      });
    }

    const schoolId = toId(parent.schoolId);

    if (!ensureSchoolAccess(req, res, schoolId)) return;

    const filter = {
      schoolId,
      parentUserId
    };

    if (
      String(req.query.includeDeleted || "false").toLowerCase() !==
      "true"
    ) {
      filter.isDeleted = false;
    }

    const links = await populateLink(
      ParentStudentLink.find(filter)
    ).sort({ isPrimary: -1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: {
        parent,
        school: parent.schoolId,
        summary: buildSummary(links),
        links
      }
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to fetch links for the parent account."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get All Parents Linked with One Student
|--------------------------------------------------------------------------
*/

const getParentStudentLinksByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!isValidId(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID."
      });
    }

    const student = await Student.findOne({
      _id: studentId,
      isDeleted: false
    }).populate("classId", "className numericOrder");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record was not found."
      });
    }

    const schoolId = toId(student.schoolId);

    if (!ensureSchoolAccess(req, res, schoolId)) return;

    const links = await populateLink(
      ParentStudentLink.find({
        schoolId,
        studentId,
        isDeleted: false
      })
    ).sort({ isPrimary: -1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: {
        student,
        summary: buildSummary(links),
        links
      }
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to fetch parent links for the student."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Create Link
|--------------------------------------------------------------------------
*/

const createParentStudentLink = async (req, res) => {
  try {
    const { parentUserId, studentId } = req.body;

    if (!isValidId(parentUserId)) {
      return res.status(400).json({
        success: false,
        message: "A valid parent user ID is required."
      });
    }

    if (!isValidId(studentId)) {
      return res.status(400).json({
        success: false,
        message: "A valid student ID is required."
      });
    }

    const schoolId = resolveSchoolId(req, req.body.schoolId);

    if (!ensureSchoolAccess(req, res, schoolId)) return;

    const { parent, student } = await getParentAndStudent({
      parentUserId,
      studentId,
      schoolId
    });

    const existingLink = await ParentStudentLink.findOne({
      schoolId,
      parentUserId,
      studentId
    });

    if (existingLink && !existingLink.isDeleted) {
      return res.status(409).json({
        success: false,
        message:
          "This parent is already linked with the selected student.",
        data: {
          linkId: existingLink._id
        }
      });
    }

    const payload = buildPayload({
      req,
      body: req.body,
      parent,
      student,
      schoolId,
      currentLink: existingLink,
      creating: true
    });

    let link;
    let restored = false;

    if (existingLink?.isDeleted) {
      Object.assign(existingLink, payload);
      setSupported(existingLink, "restoredAt", new Date());
      setSupported(
        existingLink,
        "restoredBy",
        getCurrentUserId(req)
      );

      link = await existingLink.save();
      restored = true;
    } else {
      link = await ParentStudentLink.create(payload);
    }

    await enforceSinglePrimaryGuardian(link);
    await syncStudentParentUserIds(link);

    const populatedLink = await fetchPopulatedLink(link._id);

    await createAuditLog({
      req,
      schoolId,
      action: restored ? "UPDATE" : "CREATE",
      module: "PARENT_STUDENT_LINK",
      recordId: link._id,
      recordModel: "ParentStudentLink",
      description: restored
        ? `${req.user.role} restored the link between ${parent.name} and ${student.name}.`
        : `${req.user.role} linked parent ${parent.name} with student ${student.name}.`,
      newData: populatedLink,
      status: "success"
    });

    return res.status(restored ? 200 : 201).json({
      success: true,
      message: restored
        ? "Parent–student link restored successfully."
        : "Parent linked with student successfully.",
      data: {
        link: populatedLink
      }
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to create parent–student link."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Update Relationship, Permissions and Preferences
|--------------------------------------------------------------------------
*/

const updateParentStudentLink = async (req, res) => {
  try {
    const link = await getManagedLink(req, res, false);

    if (!link) return;

    const { parent, student } = await getParentAndStudent({
      parentUserId: link.parentUserId,
      studentId: link.studentId,
      schoolId: link.schoolId
    });

    const oldData = link.toObject();

    Object.assign(
      link,
      buildPayload({
        req,
        body: req.body,
        parent,
        student,
        schoolId: link.schoolId,
        currentLink: link
      })
    );

    await link.save();
    await enforceSinglePrimaryGuardian(link);
    await syncStudentParentUserIds(link);

    const populatedLink = await fetchPopulatedLink(link._id);

    await createAuditLog({
      req,
      schoolId: link.schoolId,
      action: "UPDATE",
      module: "PARENT_STUDENT_LINK",
      recordId: link._id,
      recordModel: "ParentStudentLink",
      description:
        `${req.user.role} updated the parent link for ${parent.name} and ${student.name}.`,
      oldData,
      newData: populatedLink,
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message: "Parent–student link updated successfully.",
      data: {
        link: populatedLink
      }
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to update parent–student link."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Activate, Deactivate, Suspend or Revoke Link
|--------------------------------------------------------------------------
*/

const updateParentStudentLinkStatus = async (req, res) => {
  try {
    const link = await getManagedLink(req, res, false);

    if (!link) return;

    const status = normalizeText(req.body.status).toLowerCase();
    const allowedStatuses = getEnumValues("status", [
      "active",
      "inactive",
      "suspended",
      "revoked"
    ]);

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          `Status must be one of: ${allowedStatuses.join(", ")}.`
      });
    }

    const oldStatus = link.status;

    link.status = status;
    setSupported(link, "updatedBy", getCurrentUserId(req));

    if (req.body.reason !== undefined) {
      setSupported(
        link,
        "statusReason",
        normalizeText(req.body.reason)
      );
    }

    await link.save();
    await syncStudentParentUserIds(link);

    const populatedLink = await fetchPopulatedLink(link._id);

    await createAuditLog({
      req,
      schoolId: link.schoolId,
      action: "STATUS_CHANGE",
      module: "PARENT_STUDENT_LINK",
      recordId: link._id,
      recordModel: "ParentStudentLink",
      description:
        `${req.user.role} changed link status from ${oldStatus} to ${status}.`,
      oldData: { status: oldStatus },
      newData: { status },
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message: "Parent–student link status updated successfully.",
      data: {
        link: populatedLink
      }
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to update parent–student link status."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Verify, Reject or Return Link to Pending
|--------------------------------------------------------------------------
*/

const verifyParentStudentLink = async (req, res) => {
  try {
    const link = await getManagedLink(req, res, false);

    if (!link) return;

    const verificationStatus = normalizeText(
      req.body.verificationStatus || "verified"
    ).toLowerCase();

    const allowedStatuses = getEnumValues(
      "verificationStatus",
      ["pending", "verified", "rejected"]
    );

    if (!allowedStatuses.includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        message:
          `Verification status must be one of: ${allowedStatuses.join(
            ", "
          )}.`
      });
    }

    const oldStatus = link.verificationStatus;

    link.verificationStatus = verificationStatus;
    setSupported(link, "updatedBy", getCurrentUserId(req));
    setSupported(
      link,
      "verificationNotes",
      normalizeText(
        req.body.verificationNotes ||
          req.body.notes
      )
    );

    if (verificationStatus === "verified") {
      setSupported(link, "verifiedAt", new Date());
      setSupported(link, "verifiedBy", getCurrentUserId(req));
    } else {
      setSupported(link, "verifiedAt", null);
      setSupported(link, "verifiedBy", null);
    }

    await link.save();
    await syncStudentParentUserIds(link);

    const populatedLink = await fetchPopulatedLink(link._id);

    await createAuditLog({
      req,
      schoolId: link.schoolId,
      action: "STATUS_CHANGE",
      module: "PARENT_STUDENT_LINK",
      recordId: link._id,
      recordModel: "ParentStudentLink",
      description:
        `${req.user.role} changed verification from ${oldStatus} to ${verificationStatus}.`,
      oldData: {
        verificationStatus: oldStatus
      },
      newData: {
        verificationStatus
      },
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message:
        verificationStatus === "verified"
          ? "Parent–student link verified successfully."
          : verificationStatus === "rejected"
            ? "Parent–student link rejected."
            : "Parent–student link moved to pending verification.",
      data: {
        link: populatedLink
      }
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to update link verification."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Soft Delete / Unlink Parent
|--------------------------------------------------------------------------
*/

const deleteParentStudentLink = async (req, res) => {
  try {
    const link = await getManagedLink(req, res);

    if (!link) return;

    if (link.isDeleted) {
      return res.status(409).json({
        success: false,
        message: "This parent–student link is already deleted."
      });
    }

    const oldData = link.toObject();

    setSupported(link, "isDeleted", true);
    setSupported(link, "deletedAt", new Date());
    setSupported(link, "deletedBy", getCurrentUserId(req));
    setSupported(link, "updatedBy", getCurrentUserId(req));

    if (req.body?.reason !== undefined) {
      setSupported(
        link,
        "deletionReason",
        normalizeText(req.body.reason)
      );
    }

    const allowedStatuses = getEnumValues("status", []);

    if (allowedStatuses.includes("inactive")) {
      link.status = "inactive";
    } else if (allowedStatuses.includes("revoked")) {
      link.status = "revoked";
    }

    await link.save();
    await syncStudentParentUserIds(link);

    await createAuditLog({
      req,
      schoolId: link.schoolId,
      action: "DELETE",
      module: "PARENT_STUDENT_LINK",
      recordId: link._id,
      recordModel: "ParentStudentLink",
      description:
        `${req.user.role} removed a parent–student link.`,
      oldData,
      newData: {
        isDeleted: true,
        deletedAt: link.deletedAt || null
      },
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message: "Parent unlinked from student successfully."
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to delete parent–student link."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Restore Deleted Link
|--------------------------------------------------------------------------
*/

const restoreParentStudentLink = async (req, res) => {
  try {
    const link = await getManagedLink(req, res);

    if (!link) return;

    if (!link.isDeleted) {
      return res.status(409).json({
        success: false,
        message:
          "This parent–student link is already available."
      });
    }

    await getParentAndStudent({
      parentUserId: link.parentUserId,
      studentId: link.studentId,
      schoolId: link.schoolId
    });

    setSupported(link, "isDeleted", false);
    setSupported(link, "deletedAt", null);
    setSupported(link, "deletedBy", null);
    setSupported(link, "deletionReason", "");
    setSupported(link, "restoredAt", new Date());
    setSupported(link, "restoredBy", getCurrentUserId(req));
    setSupported(link, "updatedBy", getCurrentUserId(req));

    const allowedStatuses = getEnumValues("status", []);

    if (allowedStatuses.includes("active")) {
      link.status = "active";
    }

    if (req.body?.verificationStatus) {
      const verificationStatus = normalizeText(
        req.body.verificationStatus
      ).toLowerCase();

      const allowedVerificationStatuses = getEnumValues(
        "verificationStatus",
        ["pending", "verified", "rejected"]
      );

      if (!allowedVerificationStatuses.includes(verificationStatus)) {
        return res.status(400).json({
          success: false,
          message:
            `Verification status must be one of: ${allowedVerificationStatuses.join(
              ", "
            )}.`
        });
      }

      link.verificationStatus = verificationStatus;
    }

    await link.save();
    await enforceSinglePrimaryGuardian(link);
    await syncStudentParentUserIds(link);

    const populatedLink = await fetchPopulatedLink(link._id);

    await createAuditLog({
      req,
      schoolId: link.schoolId,
      action: "UPDATE",
      module: "PARENT_STUDENT_LINK",
      recordId: link._id,
      recordModel: "ParentStudentLink",
      description:
        `${req.user.role} restored a deleted parent–student link.`,
      newData: populatedLink,
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message: "Parent–student link restored successfully.",
      data: {
        link: populatedLink
      }
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to restore parent–student link."
    );
  }
};

module.exports = {
  getParentStudentLinks,
  getParentStudentLinkById,
  getParentStudentLinksByParent,
  getParentStudentLinksByStudent,
  createParentStudentLink,
  updateParentStudentLink,
  updateParentStudentLinkStatus,
  verifyParentStudentLink,
  deleteParentStudentLink,
  restoreParentStudentLink
};
