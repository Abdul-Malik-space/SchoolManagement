const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const School = require("../models/School");
const Student = require("../models/Student");

const {
  createAuditLog
} = require("../utils/auditLogHelper");

/*
|--------------------------------------------------------------------------
| Generate Access Token
|--------------------------------------------------------------------------
*/

const generateAccessToken = (userId) => {
  return jwt.sign(
    {
      id: userId
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN || "15m"
    }
  );
};

/*
|--------------------------------------------------------------------------
| Generate Refresh Token
|--------------------------------------------------------------------------
*/

const generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      id: userId
    },
    process.env.JWT_REFRESH_SECRET ||
      process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_REFRESH_EXPIRES_IN ||
        "7d"
    }
  );
};

/*
|--------------------------------------------------------------------------
| Hash Refresh Token
|--------------------------------------------------------------------------
*/

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

/*
|--------------------------------------------------------------------------
| Refresh Token Cookie Options
|--------------------------------------------------------------------------
*/

const getRefreshCookieOptions = () => {
  const isProduction =
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  };
};

/*
|--------------------------------------------------------------------------
| Set Refresh Token Cookie
|--------------------------------------------------------------------------
*/

const setRefreshTokenCookie = (
  res,
  refreshToken
) => {
  res.cookie(
    "refreshToken",
    refreshToken,
    getRefreshCookieOptions()
  );
};

/*
|--------------------------------------------------------------------------
| Clear Refresh Token Cookie
|--------------------------------------------------------------------------
*/

const clearRefreshTokenCookie = (res) => {
  const cookieOptions =
    getRefreshCookieOptions();

  delete cookieOptions.maxAge;

  res.clearCookie(
    "refreshToken",
    cookieOptions
  );
};

/*
|--------------------------------------------------------------------------
| Safe Audit Log
|--------------------------------------------------------------------------
|
| Audit log failure کی وجہ سے login یا دوسری بنیادی authentication
| request کو fail نہیں ہونا چاہیے۔
|
*/

const safeCreateAuditLog = async (data) => {
  try {
    await createAuditLog(data);
  } catch (error) {
    console.error(
      "Authentication audit log error:",
      error.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| User Response
|--------------------------------------------------------------------------
*/

const userResponse = (user) => {
  return {
    id: user._id,
    schoolId: user.schoolId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    photo: user.photo,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword:
      user.mustChangePassword || false,
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

/*
|--------------------------------------------------------------------------
| Common Controller Error Handler
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

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message:
        "A user already exists with this email"
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
| Get User School
|--------------------------------------------------------------------------
*/

const getUserSchool = async (user) => {
  if (!user || user.role === "super_admin") {
    return null;
  }

  if (user.schoolId) {
    const schoolId =
      user.schoolId._id || user.schoolId;

    return School.findById(schoolId);
  }

  /*
  |--------------------------------------------------------------------------
  | Student Profile Fallback
  |--------------------------------------------------------------------------
  */

  if (user.role === "student") {
    const studentProfile =
      await Student.findOne({
        studentUserId: user._id
      }).select("schoolId");

    if (
      studentProfile &&
      studentProfile.schoolId
    ) {
      return School.findById(
        studentProfile.schoolId
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Parent Profile Fallback
  |--------------------------------------------------------------------------
  */

  if (user.role === "parent") {
    const childProfile =
      await Student.findOne({
        parentUserIds: user._id
      }).select("schoolId");

    if (
      childProfile &&
      childProfile.schoolId
    ) {
      return School.findById(
        childProfile.schoolId
      );
    }
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| Get Audit School ID
|--------------------------------------------------------------------------
*/

const getAuditSchoolId = async (user) => {
  if (
    !user ||
    user.role === "super_admin"
  ) {
    return null;
  }

  if (user.schoolId) {
    return user.schoolId._id || user.schoolId;
  }

  const school = await getUserSchool(user);

  return school ? school._id : null;
};

/*
|--------------------------------------------------------------------------
| Check User School Status
|--------------------------------------------------------------------------
*/

const checkUserSchoolStatus = async (
  user
) => {
  if (user.role === "super_admin") {
    return {
      allowed: true,
      school: null
    };
  }

  const school = await getUserSchool(user);

  if (!school) {
    return {
      allowed: false,
      status: 403,
      message:
        "School is not assigned or not found for this user"
    };
  }

  if (!school.isActive) {
    return {
      allowed: false,
      status: 403,
      message:
        "School account is inactive. Please contact super admin."
    };
  }

  return {
    allowed: true,
    school
  };
};

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

exports.login = async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required"
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    }).select(
      "+password +refreshToken"
    );

    /*
    |--------------------------------------------------------------------------
    | Invalid Email
    |--------------------------------------------------------------------------
    */

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Invalid Password
    |--------------------------------------------------------------------------
    */

    const isPasswordMatched =
      await user.comparePassword(password);

    if (!isPasswordMatched) {
      await safeCreateAuditLog({
        req,
        user,
        schoolId:
          await getAuditSchoolId(user),
        action: "LOGIN",
        module: "AUTH",
        recordId: user._id,
        recordModel: "User",
        description:
          `${user.role} login failed because password was incorrect`,
        newData: {
          userId: user._id,
          email: user.email,
          role: user.role
        },
        status: "failed"
      });

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Inactive User
    |--------------------------------------------------------------------------
    */

    if (!user.isActive) {
      await safeCreateAuditLog({
        req,
        user,
        schoolId:
          await getAuditSchoolId(user),
        action: "LOGIN",
        module: "AUTH",
        recordId: user._id,
        recordModel: "User",
        description:
          `${user.role} login failed because account is inactive`,
        newData: {
          userId: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        status: "failed"
      });

      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | School Status
    |--------------------------------------------------------------------------
    */

    const schoolStatus =
      await checkUserSchoolStatus(user);

    if (!schoolStatus.allowed) {
      await safeCreateAuditLog({
        req,
        user,
        schoolId:
          await getAuditSchoolId(user),
        action: "LOGIN",
        module: "AUTH",
        recordId: user._id,
        recordModel: "User",
        description:
          `${user.role} login failed because school is inactive or not assigned`,
        newData: {
          userId: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          reason: schoolStatus.message
        },
        status: "failed"
      });

      return res
        .status(schoolStatus.status)
        .json({
          success: false,
          message: schoolStatus.message
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Generate Tokens
    |--------------------------------------------------------------------------
    */

    const accessToken =
      generateAccessToken(user._id);

    const refreshToken =
      generateRefreshToken(user._id);

    user.refreshToken =
      hashToken(refreshToken);

    user.lastLoginAt = new Date();

    await user.save({
      validateBeforeSave: false
    });

    setRefreshTokenCookie(
      res,
      refreshToken
    );

    await safeCreateAuditLog({
      req,
      user,
      schoolId:
        schoolStatus.school?._id ||
        (await getAuditSchoolId(user)),
      action: "LOGIN",
      module: "AUTH",
      recordId: user._id,
      recordModel: "User",
      description:
        `${user.role} logged in successfully`,
      newData: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword:
          user.mustChangePassword,
        lastLoginAt: user.lastLoginAt
      },
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",

      /*
      | token پرانے frontend code کی compatibility کے لیے رکھا گیا ہے۔
      */

      token: accessToken,
      accessToken,

      user: userResponse(user)
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Login failed"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Refresh Access Token
|--------------------------------------------------------------------------
*/

exports.refreshAccessToken = async (
  req,
  res
) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken ||
      req.body.refreshToken ||
      req.headers["x-refresh-token"];

    if (!incomingRefreshToken) {
      return res.status(401).json({
        success: false,
        message:
          "Refresh token is required"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Refresh Token
    |--------------------------------------------------------------------------
    */

    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET ||
        process.env.JWT_SECRET
    );

    const hashedRefreshToken =
      hashToken(incomingRefreshToken);

    const user = await User.findById(
      decoded.id
    ).select("+refreshToken");

    if (!user) {
      clearRefreshTokenCookie(res);

      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.isActive) {
      clearRefreshTokenCookie(res);

      return res.status(403).json({
        success: false,
        message:
          "User account is inactive"
      });
    }

    const schoolStatus =
      await checkUserSchoolStatus(user);

    if (!schoolStatus.allowed) {
      clearRefreshTokenCookie(res);

      return res
        .status(schoolStatus.status)
        .json({
          success: false,
          message: schoolStatus.message
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Compare Stored Refresh Token
    |--------------------------------------------------------------------------
    */

    if (
      !user.refreshToken ||
      user.refreshToken !==
        hashedRefreshToken
    ) {
      clearRefreshTokenCookie(res);

      return res.status(401).json({
        success: false,
        message:
          "Invalid refresh token"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Rotate Refresh Token
    |--------------------------------------------------------------------------
    */

    const newAccessToken =
      generateAccessToken(user._id);

    const newRefreshToken =
      generateRefreshToken(user._id);

    user.refreshToken =
      hashToken(newRefreshToken);

    await user.save({
      validateBeforeSave: false
    });

    setRefreshTokenCookie(
      res,
      newRefreshToken
    );

    await safeCreateAuditLog({
      req,
      user,
      schoolId:
        schoolStatus.school?._id ||
        (await getAuditSchoolId(user)),
      action: "OTHER",
      module: "AUTH",
      recordId: user._id,
      recordModel: "User",
      description:
        `${user.role} refreshed access token`,
      newData: {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message:
        "Token refreshed successfully",
      token: newAccessToken,
      accessToken: newAccessToken,
      user: userResponse(user)
    });
  } catch (error) {
    clearRefreshTokenCookie(res);

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired refresh token"
    });
  }
};

/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

exports.logout = async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken ||
      req.body.refreshToken ||
      req.headers["x-refresh-token"];

    if (incomingRefreshToken) {
      const hashedRefreshToken =
        hashToken(incomingRefreshToken);

      const user = await User.findOne({
        refreshToken: hashedRefreshToken
      }).select("+refreshToken");

      if (user) {
        user.refreshToken = "";

        await user.save({
          validateBeforeSave: false
        });

        await safeCreateAuditLog({
          req,
          user,
          schoolId:
            await getAuditSchoolId(user),
          action: "LOGOUT",
          module: "AUTH",
          recordId: user._id,
          recordModel: "User",
          description:
            `${user.role} logged out successfully`,
          newData: {
            userId: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          status: "success"
        });
      }
    }

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message:
        "Logged out successfully"
    });
  } catch (error) {
    clearRefreshTokenCookie(res);

    return handleControllerError(
      res,
      error,
      "Logout failed"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Logged-in User
|--------------------------------------------------------------------------
*/

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(
      req.user._id
    ).populate(
      "schoolId",
      "schoolName type logo isActive"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      user: userResponse(user)
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to get user profile"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Update Own Profile
|--------------------------------------------------------------------------
*/

exports.updateProfile = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      photo
    } = req.body;

    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const oldData = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      photo: user.photo
    };

    /*
    |--------------------------------------------------------------------------
    | Update Email
    |--------------------------------------------------------------------------
    */

    if (email !== undefined) {
      const normalizedEmail = email
        .trim()
        .toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message:
            "Email cannot be empty"
        });
      }

      if (
        normalizedEmail !== user.email
      ) {
        const existingUser =
          await User.findOne({
            email: normalizedEmail,
            _id: {
              $ne: user._id
            }
          });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message:
              "Email already exists"
          });
        }
      }

      user.email = normalizedEmail;
    }

    /*
    |--------------------------------------------------------------------------
    | Update Other Fields
    |--------------------------------------------------------------------------
    */

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Name cannot be empty"
        });
      }

      user.name = name.trim();
    }

    if (phone !== undefined) {
      user.phone = phone;
    }

    if (address !== undefined) {
      user.address = address;
    }

    if (photo !== undefined) {
      user.photo = photo;
    }

    user.updatedBy = user._id;

    await user.save();

    await safeCreateAuditLog({
      req,
      user,
      schoolId:
        await getAuditSchoolId(user),
      action: "UPDATE",
      module: "AUTH",
      recordId: user._id,
      recordModel: "User",
      description:
        `${user.role} updated profile`,
      oldData,
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
      message:
        "Profile updated successfully",
      user: userResponse(user)
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to update profile"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Change Own Password
|--------------------------------------------------------------------------
*/

exports.changePassword = async (
  req,
  res
) => {
  try {
    const {
      oldPassword,
      newPassword
    } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Old password and new password are required"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "New password must contain at least 8 characters"
      });
    }

    const user = await User.findById(
      req.user._id
    ).select("+password +refreshToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Old Password
    |--------------------------------------------------------------------------
    */

    const isPasswordMatched =
      await user.comparePassword(
        oldPassword
      );

    if (!isPasswordMatched) {
      return res.status(400).json({
        success: false,
        message:
          "Old password is incorrect"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent Same Password
    |--------------------------------------------------------------------------
    */

    const isSamePassword =
      await user.comparePassword(
        newPassword
      );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from the old password"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Update Password and Rotate Session
    |--------------------------------------------------------------------------
    */

    const refreshToken =
      generateRefreshToken(user._id);

    user.password = newPassword;
    user.mustChangePassword = false;
    user.refreshToken =
      hashToken(refreshToken);
    user.updatedBy = user._id;

    await user.save();

    const accessToken =
      generateAccessToken(user._id);

    setRefreshTokenCookie(
      res,
      refreshToken
    );

    await safeCreateAuditLog({
      req,
      user,
      schoolId:
        await getAuditSchoolId(user),
      action: "PASSWORD_CHANGE",
      module: "AUTH",
      recordId: user._id,
      recordModel: "User",
      description:
        `${user.role} changed password`,
      newData: {
        userId: user._id,
        email: user.email,
        role: user.role,
        mustChangePassword: false,
        activeSessionRotated: true
      },
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully",
      token: accessToken,
      accessToken,
      mustChangePassword: false
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to change password"
    );
  }
};