const jwt = require("jsonwebtoken");

const User = require("../models/User");
const School = require("../models/School");
const Student = require("../models/Student");

/*
|--------------------------------------------------------------------------
| Get Object ID
|--------------------------------------------------------------------------
|
| schoolId عام ObjectId یا populated document دونوں صورتوں میں آسکتا ہے۔
|
*/

const getObjectId = (value) => {
  if (!value) {
    return null;
  }

  if (value._id) {
    return value._id;
  }

  return value;
};

/*
|--------------------------------------------------------------------------
| Get User School
|--------------------------------------------------------------------------
*/

const getUserSchool = async (user) => {
  /*
  |--------------------------------------------------------------------------
  | Super Admin
  |--------------------------------------------------------------------------
  |
  | Super Admin کسی ایک School کے ساتھ محدود نہیں ہوتا۔
  |
  */

  if (user.role === "super_admin") {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | Direct School Assignment
  |--------------------------------------------------------------------------
  |
  | Principal، Teacher، Accountant، Student اور Parent کے User account
  | میں schoolId موجود ہو تو اسی کو استعمال کیا جائے گا۔
  |
  */

  if (user.schoolId) {
    const schoolId = getObjectId(
      user.schoolId
    );

    return School.findById(schoolId);
  }

  /*
  |--------------------------------------------------------------------------
  | Student Profile Fallback
  |--------------------------------------------------------------------------
  |
  | پرانے Student accounts میں schoolId براہِ راست User میں نہ ہو تو
  | Student profile کے ذریعے School تلاش کیا جائے گا۔
  |
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
  |
  | Parent account کے ساتھ linked کسی بچے کے profile سے School تلاش
  | کیا جائے گا۔
  |
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
| Allowed Routes During Forced Password Change
|--------------------------------------------------------------------------
|
| Temporary password والے User کو صرف اپنا profile دیکھنے اور password
| تبدیل کرنے کی اجازت ہوگی۔
|
*/

const passwordChangeAllowedRoutes = new Set([
  "/api/auth/me",
  "/api/auth/change-password"
]);

/*
|--------------------------------------------------------------------------
| Normalize Request URL
|--------------------------------------------------------------------------
*/

const getRequestPath = (req) => {
  const originalUrl =
    req.originalUrl || req.url || "";

  const pathWithoutQuery =
    originalUrl.split("?")[0];

  if (
    pathWithoutQuery.length > 1 &&
    pathWithoutQuery.endsWith("/")
  ) {
    return pathWithoutQuery.slice(0, -1);
  }

  return pathWithoutQuery;
};

/*
|--------------------------------------------------------------------------
| Protect Routes
|--------------------------------------------------------------------------
*/

const protect = async (req, res, next) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | Read Authorization Header
    |--------------------------------------------------------------------------
    */

    const authorizationHeader =
      req.headers.authorization;

    let token = null;

    if (
      typeof authorizationHeader ===
        "string" &&
      authorizationHeader.startsWith(
        "Bearer "
      )
    ) {
      token = authorizationHeader
        .slice(7)
        .trim();
    }

    /*
    |--------------------------------------------------------------------------
    | Missing Token
    |--------------------------------------------------------------------------
    */

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Not authorized, token missing"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Access Token
    |--------------------------------------------------------------------------
    */

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message:
          "Not authorized, invalid token payload"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get Current User from Database
    |--------------------------------------------------------------------------
    |
    | Role، status اور School ہر request پر database سے لیے جائیں گے۔
    | اس طرح پرانے token میں موجود stale permissions استعمال نہیں ہوں گی۔
    |
    */

    const user = await User.findById(
      decoded.id
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "User account no longer exists"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Password Changed After Token Creation
    |--------------------------------------------------------------------------
    |
    | Password reset یا change ہونے کے بعد پہلے بنے Access Tokens قبول
    | نہیں کیے جائیں گے۔
    |
    */

    if (
      typeof user.changedPasswordAfter ===
        "function" &&
      user.passwordChangedAt &&
      (
        !decoded.iat ||
        user.changedPasswordAfter(
          decoded.iat
        )
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Password was changed recently. Please login again.",
        code: "PASSWORD_CHANGED"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Inactive User
    |--------------------------------------------------------------------------
    */

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "User account is inactive",
        code: "USER_INACTIVE"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check School
    |--------------------------------------------------------------------------
    */

    if (user.role !== "super_admin") {
      const school =
        await getUserSchool(user);

      if (!school) {
        return res.status(403).json({
          success: false,
          message:
            "School is not assigned or not found for this user",
          code: "SCHOOL_NOT_ASSIGNED"
        });
      }

      if (!school.isActive) {
        return res.status(403).json({
          success: false,
          message:
            "School account is inactive. Please contact super admin.",
          code: "SCHOOL_INACTIVE"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Attach School to Request
      |--------------------------------------------------------------------------
      */

      req.school = school;
    } else {
      req.school = null;
    }

    /*
    |--------------------------------------------------------------------------
    | Attach User and Token Information
    |--------------------------------------------------------------------------
    */

    req.user = user;
    req.auth = {
      userId: user._id,
      tokenIssuedAt: decoded.iat,
      tokenExpiresAt: decoded.exp
    };

    /*
    |--------------------------------------------------------------------------
    | Force Temporary Password Change
    |--------------------------------------------------------------------------
    |
    | Admin کے بنائے ہوئے account میں mustChangePassword true ہوگا۔
    | ایسا User dashboard یا دوسرے modules تک رسائی حاصل نہیں کرسکے گا
    | جب تک وہ اپنا temporary password تبدیل نہ کرے۔
    |
    */

    if (user.mustChangePassword) {
      const requestPath =
        getRequestPath(req);

      const isAllowedRoute =
        passwordChangeAllowedRoutes.has(
          requestPath
        );

      if (!isAllowedRoute) {
        return res.status(403).json({
          success: false,
          message:
            "You must change your temporary password before continuing.",
          code:
            "PASSWORD_CHANGE_REQUIRED",
          mustChangePassword: true
        });
      }
    }

    return next();
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Expired Access Token
    |--------------------------------------------------------------------------
    */

    if (
      error.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Access token has expired",
        code: "TOKEN_EXPIRED"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Invalid Access Token
    |--------------------------------------------------------------------------
    */

    if (
      error.name ===
        "JsonWebTokenError" ||
      error.name ===
        "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Not authorized, token invalid",
        code: "TOKEN_INVALID"
      });
    }

    console.error(
      "Authentication middleware error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Authentication check failed"
    });
  }
};

/*
|--------------------------------------------------------------------------
| Authorize User Roles
|--------------------------------------------------------------------------
*/

const authorize = (...roles) => {
  return (req, res, next) => {
    /*
    |--------------------------------------------------------------------------
    | Route Configuration Check
    |--------------------------------------------------------------------------
    */

    if (!roles.length) {
      return res.status(500).json({
        success: false,
        message:
          "No authorized roles configured for this route"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Authentication Check
    |--------------------------------------------------------------------------
    */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Role Permission Check
    |--------------------------------------------------------------------------
    */

    if (
      !roles.includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          `Role '${req.user.role}' is not allowed to access this route`,
        code: "ROLE_NOT_ALLOWED",
        requiredRoles: roles
      });
    }

    return next();
  };
};

module.exports = {
  protect,
  authorize
};