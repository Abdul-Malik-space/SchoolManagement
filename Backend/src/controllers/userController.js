const mongoose = require("mongoose");

const User = require("../models/User");
const School = require("../models/School");

const {
  createAuditLog
} = require("../utils/auditLogHelper");

const {
  getPaginationOptions,
  buildPagination
} = require("../utils/pagination");

/*
|--------------------------------------------------------------------------
| User Roles
|--------------------------------------------------------------------------
*/

const manageableRoles = [
  "principal",
  "teacher",
  "student",
  "parent",
  "accountant"
];

const principalManageableRoles = [
  "teacher",
  "student",
  "parent",
  "accountant"
];

/*
|--------------------------------------------------------------------------
| Common Error Handler
|--------------------------------------------------------------------------
*/

const handleControllerError = (
  res,
  error,
  defaultMessage
) => {
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
      message: "A user already exists with this email"
    });
  }

  return res.status(500).json({
    success: false,
    message: defaultMessage,
    error: error.message
  });
};

/*
|--------------------------------------------------------------------------
| Escape Search Text
|--------------------------------------------------------------------------
*/

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/*
|--------------------------------------------------------------------------
| Get School ID
|--------------------------------------------------------------------------
*/

const getSchoolId = (schoolId) => {
  if (!schoolId) {
    return null;
  }

  if (schoolId._id) {
    return schoolId._id.toString();
  }

  return schoolId.toString();
};

/*
|--------------------------------------------------------------------------
| Check User Management Permission
|--------------------------------------------------------------------------
*/

const canManageUser = (req, targetUser) => {
  if (req.user.role === "super_admin") {
    return targetUser.role !== "super_admin";
  }

  if (req.user.role !== "principal") {
    return false;
  }

  if (
    !principalManageableRoles.includes(targetUser.role)
  ) {
    return false;
  }

  const principalSchoolId = getSchoolId(
    req.user.schoolId
  );

  const targetSchoolId = getSchoolId(
    targetUser.schoolId
  );

  if (!principalSchoolId || !targetSchoolId) {
    return false;
  }

  return principalSchoolId === targetSchoolId;
};

/*
|--------------------------------------------------------------------------
| Resolve School for New User
|--------------------------------------------------------------------------
*/

const resolveSchoolId = (req) => {
  if (req.user.role === "super_admin") {
    return req.body.schoolId || null;
  }

  return getSchoolId(req.user.schoolId);
};

/*
|--------------------------------------------------------------------------
| Create User
|--------------------------------------------------------------------------
|
| Super Admin:
| - Principal
| - Teacher
| - Accountant
| - Student
| - Parent
|
| Principal:
| - Teacher
| - Accountant
| - Student
| - Parent
|
| Super Admin account اس endpoint سے create نہیں ہوگا۔
|
*/

exports.createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      photo,
      password,
      role,
      isActive
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password and role are required"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent Super Admin Creation
    |--------------------------------------------------------------------------
    */

    if (role === "super_admin") {
      return res.status(403).json({
        success: false,
        message:
          "Super Admin cannot be created through this endpoint"
      });
    }

    if (!manageableRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Principal Role Restrictions
    |--------------------------------------------------------------------------
    */

    if (
      req.user.role === "principal" &&
      !principalManageableRoles.includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Principal is not allowed to create this user role"
      });
    }

    const schoolId = resolveSchoolId(req);

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid school ID format"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify School
    |--------------------------------------------------------------------------
    */

    const school = await School.findById(schoolId);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found"
      });
    }

    if (!school.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "User cannot be created for an inactive school"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Existing Email
    |--------------------------------------------------------------------------
    */

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          "A user already exists with this email"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create Account
    |--------------------------------------------------------------------------
    */

    const user = await User.create({
      schoolId,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone || "",
      address: address || "",
      photo: photo || "",
      password,
      role,
      isActive:
        typeof isActive === "boolean"
          ? isActive
          : true,
      mustChangePassword: true,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    const populatedUser = await User.findById(
      user._id
    ).populate(
      "schoolId",
      "schoolName type isActive"
    );

    await createAuditLog({
      req,
      schoolId,
      action: "CREATE",
      module: "USER",
      recordId: user._id,
      recordModel: "User",
      description: `${req.user.role} created ${role} account: ${user.name}`,
      newData: {
        userId: user._id,
        schoolId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword:
          user.mustChangePassword
      },
      status: "success"
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: populatedUser
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to create user"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Users
|--------------------------------------------------------------------------
*/

exports.getUsers = async (req, res) => {
  try {
    const {
      schoolId,
      role,
      isActive,
      search
    } = req.query;

    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | School Scope
    |--------------------------------------------------------------------------
    */

    if (req.user.role === "super_admin") {
      if (schoolId) {
        if (
          !mongoose.Types.ObjectId.isValid(schoolId)
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid school ID format"
          });
        }

        filter.schoolId = schoolId;
      }
    } else {
      const principalSchoolId = getSchoolId(
        req.user.schoolId
      );

      if (!principalSchoolId) {
        return res.status(403).json({
          success: false,
          message:
            "School is not assigned to this user"
        });
      }

      filter.schoolId = principalSchoolId;

      /*
      | Principal cannot view Super Admin
      | or another Principal account.
      */

      filter.role = {
        $in: principalManageableRoles
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Role Filter
    |--------------------------------------------------------------------------
    */

    if (role) {
      const allRoles = [
        "super_admin",
        ...manageableRoles
      ];

      if (!allRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role filter"
        });
      }

      if (
        req.user.role === "principal" &&
        !principalManageableRoles.includes(role)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Principal is not allowed to view this role"
        });
      }

      filter.role = role;
    }

    /*
    |--------------------------------------------------------------------------
    | Active Status Filter
    |--------------------------------------------------------------------------
    */

    if (isActive !== undefined) {
      if (
        isActive !== "true" &&
        isActive !== "false"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isActive must be true or false"
        });
      }

      filter.isActive = isActive === "true";
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    if (search && search.trim()) {
      const searchRegex = new RegExp(
        escapeRegex(search.trim()),
        "i"
      );

      filter.$or = [
        {
          name: searchRegex
        },
        {
          email: searchRegex
        },
        {
          phone: searchRegex
        }
      ];
    }

    const {
      page,
      limit,
      skip
    } = getPaginationOptions(req.query);

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate(
          "schoolId",
          "schoolName type isActive"
        )
        .populate(
          "createdBy",
          "name email role"
        )
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit),

      User.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users,
      pagination: buildPagination({
        total,
        page,
        limit
      })
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch users"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get User by ID
|--------------------------------------------------------------------------
*/

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    const user = await User.findById(id)
      .populate(
        "schoolId",
        "schoolName type isActive"
      )
      .populate(
        "createdBy",
        "name email role"
      )
      .populate(
        "updatedBy",
        "name email role"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Access Control
    |--------------------------------------------------------------------------
    */

    if (
      req.user.role !== "super_admin" &&
      !canManageUser(req, user)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this user"
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch user"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Update User Basic Information
|--------------------------------------------------------------------------
|
| Role، School، Password اور Account Status یہاں update نہیں ہوں گے۔
| ان کے لیے الگ محفوظ functions استعمال ہوں گے۔
|
*/

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!canManageUser(req, user)) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to update this user"
      });
    }

    const oldData = user.toObject();

    const allowedFields = [
      "name",
      "email",
      "phone",
      "address",
      "photo"
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    /*
    |--------------------------------------------------------------------------
    | Check Updated Email
    |--------------------------------------------------------------------------
    */

    if (req.body.email !== undefined) {
      const normalizedEmail = req.body.email
        .trim()
        .toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: {
          $ne: user._id
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message:
            "A user already exists with this email"
        });
      }

      user.email = normalizedEmail;
    }

    user.updatedBy = req.user._id;

    await user.save();

    const updatedUser = await User.findById(
      user._id
    ).populate(
      "schoolId",
      "schoolName type isActive"
    );

    await createAuditLog({
      req,
      schoolId: user.schoolId,
      action: "UPDATE",
      module: "USER",
      recordId: user._id,
      recordModel: "User",
      description: `${req.user.role} updated user: ${user.name}`,
      oldData: {
        name: oldData.name,
        email: oldData.email,
        phone: oldData.phone,
        address: oldData.address,
        photo: oldData.photo
      },
      newData: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        photo: user.photo
      },
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to update user"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Activate or Deactivate User
|--------------------------------------------------------------------------
*/

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "isActive must be a boolean value"
      });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot change your own account status"
      });
    }

    const user = await User.findById(id).select(
      "+refreshToken"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!canManageUser(req, user)) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to change this user's status"
      });
    }

    const oldStatus = user.isActive;

    user.isActive = isActive;
    user.updatedBy = req.user._id;

    /*
    | Deactivation پر active login session ختم ہوگا۔
    */

    if (!isActive) {
      user.refreshToken = "";
    }

    await user.save();

    await createAuditLog({
      req,
      schoolId: user.schoolId,
      action: "STATUS_CHANGE",
      module: "USER",
      recordId: user._id,
      recordModel: "User",
      description: isActive
        ? `${req.user.role} activated user: ${user.name}`
        : `${req.user.role} deactivated user: ${user.name}`,
      oldData: {
        isActive: oldStatus
      },
      newData: {
        isActive: user.isActive
      },
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message: isActive
        ? "User activated successfully"
        : "User deactivated successfully",
      user
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to update user status"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Reset User Password
|--------------------------------------------------------------------------
*/

exports.resetUserPassword = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    if (
      !newPassword ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password must contain at least 8 characters"
      });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message:
          "Use the change password option to change your own password"
      });
    }

    const user = await User.findById(id).select(
      "+refreshToken"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!canManageUser(req, user)) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to reset this user's password"
      });
    }

    user.password = newPassword;
    user.mustChangePassword = true;
    user.refreshToken = "";
    user.updatedBy = req.user._id;

    await user.save();

    await createAuditLog({
      req,
      schoolId: user.schoolId,
      action: "PASSWORD_CHANGE",
      module: "USER",
      recordId: user._id,
      recordModel: "User",
      description: `${req.user.role} reset password for user: ${user.name}`,
      oldData: null,
      newData: {
        mustChangePassword: true,
        activeSessionsRevoked: true
      },
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. User must change it after login."
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to reset user password"
    );
  }
};