const mongoose = require("mongoose");

const AuditLog = require(
  "../models/AuditLog"
);

const {
  getPaginationOptions,
  buildPagination
} = require("../utils/pagination");

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const ALLOWED_ACTIONS = [
  "CREATE",
  "READ",
  "UPDATE",
  "DELETE",
  "RESTORE",
  "LOGIN",
  "LOGOUT",
  "PASSWORD_CHANGE",
  "STATUS_CHANGE",
  "PAYMENT",
  "ATTENDANCE",
  "EXPORT",
  "OTHER"
];

const ALLOWED_STATUSES = [
  "success",
  "failed"
];

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const isSuperAdmin = (req) => {
  return req.user?.role === "super_admin";
};

const isValidObjectId = (value) => {
  return (
    Boolean(value) &&
    mongoose.Types.ObjectId.isValid(value)
  );
};

const getDocumentId = (value) => {
  if (!value) {
    return null;
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const getUserSchoolId = (req) => {
  return getDocumentId(
    req.user?.schoolId
  );
};

const escapeRegex = (value = "") => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/*
|--------------------------------------------------------------------------
| Error Handler
|--------------------------------------------------------------------------
*/

const handleControllerError = (
  res,
  error,
  defaultMessage
) => {
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,

      message: Object.values(error.errors)
        .map((item) => item.message)
        .join(", ")
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
| School Scope
|--------------------------------------------------------------------------
|
| Super Admin:
| تمام schools کے logs دیکھ سکتا ہے۔
| schoolId query کے ذریعے کسی ایک school کے logs filter کر سکتا ہے۔
|
| Principal:
| صرف اپنے assigned school کے logs دیکھ سکتا ہے۔
|
*/

const getSchoolScope = (req) => {
  if (isSuperAdmin(req)) {
    /*
    | Global system logs where schoolId is null
    */

    if (
      req.query.schoolId === "global"
    ) {
      return {
        filter: {
          schoolId: null
        }
      };
    }

    /*
    | Specific school
    */

    if (req.query.schoolId) {
      if (
        !isValidObjectId(
          req.query.schoolId
        )
      ) {
        return {
          error:
            "Invalid school ID format",
          statusCode: 400
        };
      }

      return {
        filter: {
          schoolId:
            req.query.schoolId
        }
      };
    }

    /*
    | All schools and global logs
    */

    return {
      filter: {}
    };
  }

  const schoolId =
    getUserSchoolId(req);

  if (!schoolId) {
    return {
      error:
        "School is not assigned to this user",
      statusCode: 403
    };
  }

  return {
    filter: {
      schoolId
    }
  };
};

/*
|--------------------------------------------------------------------------
| Populate Audit Log
|--------------------------------------------------------------------------
*/

const populateAuditLog = (query) => {
  return query
    .populate(
      "schoolId",
      "schoolName type isActive"
    )
    .populate(
      "userId",
      "name email role status"
    )
    .populate(
      "deletedBy",
      "name email role"
    );
};

/*
|--------------------------------------------------------------------------
| Build Audit Log Filter
|--------------------------------------------------------------------------
*/

const buildAuditLogFilter = (
  req,
  {
    deleted = false
  } = {}
) => {
  const schoolScope =
    getSchoolScope(req);

  if (schoolScope.error) {
    return schoolScope;
  }

  const filter = {
    ...schoolScope.filter,

    isDeleted: deleted
      ? true
      : {
          $ne: true
        }
  };

  /*
  |--------------------------------------------------------------------------
  | User Filter
  |--------------------------------------------------------------------------
  */

  if (req.query.userId) {
    if (
      !isValidObjectId(
        req.query.userId
      )
    ) {
      return {
        error:
          "Invalid user ID format",
        statusCode: 400
      };
    }

    filter.userId =
      req.query.userId;
  }

  /*
  |--------------------------------------------------------------------------
  | User Role Filter
  |--------------------------------------------------------------------------
  */

  if (
    req.query.userRole &&
    req.query.userRole.trim()
  ) {
    filter.userRole =
      req.query.userRole
        .trim()
        .toLowerCase();
  }

  /*
  |--------------------------------------------------------------------------
  | Action Filter
  |--------------------------------------------------------------------------
  */

  if (
    req.query.action &&
    req.query.action.trim()
  ) {
    const action =
      req.query.action
        .trim()
        .toUpperCase();

    if (
      !ALLOWED_ACTIONS.includes(
        action
      )
    ) {
      return {
        error:
          "Invalid audit action",
        statusCode: 400
      };
    }

    filter.action = action;
  }

  /*
  |--------------------------------------------------------------------------
  | Module Filter
  |--------------------------------------------------------------------------
  */

  if (
    req.query.module &&
    req.query.module.trim()
  ) {
    filter.module =
      req.query.module
        .trim()
        .toUpperCase();
  }

  /*
  |--------------------------------------------------------------------------
  | Status Filter
  |--------------------------------------------------------------------------
  */

  if (
    req.query.status &&
    req.query.status.trim()
  ) {
    const status =
      req.query.status
        .trim()
        .toLowerCase();

    if (
      !ALLOWED_STATUSES.includes(
        status
      )
    ) {
      return {
        error:
          "Audit status must be success or failed",
        statusCode: 400
      };
    }

    filter.status = status;
  }

  /*
  |--------------------------------------------------------------------------
  | Related Record Filter
  |--------------------------------------------------------------------------
  */

  if (req.query.recordId) {
    if (
      !isValidObjectId(
        req.query.recordId
      )
    ) {
      return {
        error:
          "Invalid record ID format",
        statusCode: 400
      };
    }

    filter.recordId =
      req.query.recordId;
  }

  if (
    req.query.recordModel &&
    req.query.recordModel.trim()
  ) {
    filter.recordModel =
      req.query.recordModel.trim();
  }

  /*
  |--------------------------------------------------------------------------
  | Request Method Filter
  |--------------------------------------------------------------------------
  */

  if (
    req.query.requestMethod &&
    req.query.requestMethod.trim()
  ) {
    filter.requestMethod =
      req.query.requestMethod
        .trim()
        .toUpperCase();
  }

  /*
  |--------------------------------------------------------------------------
  | Date Range Filter
  |--------------------------------------------------------------------------
  */

  const fromDateValue =
    req.query.fromDate;

  const toDateValue =
    req.query.toDate;

  let fromDate = null;
  let toDate = null;

  if (fromDateValue) {
    fromDate = parseDate(
      fromDateValue
    );

    if (!fromDate) {
      return {
        error:
          "Invalid fromDate format",
        statusCode: 400
      };
    }

    fromDate.setHours(
      0,
      0,
      0,
      0
    );
  }

  if (toDateValue) {
    toDate = parseDate(
      toDateValue
    );

    if (!toDate) {
      return {
        error:
          "Invalid toDate format",
        statusCode: 400
      };
    }

    toDate.setHours(
      23,
      59,
      59,
      999
    );
  }

  if (
    fromDate &&
    toDate &&
    fromDate.getTime() >
      toDate.getTime()
  ) {
    return {
      error:
        "From date cannot be later than to date",
      statusCode: 400
    };
  }

  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      filter.createdAt.$gte =
        fromDate;
    }

    if (toDate) {
      filter.createdAt.$lte =
        toDate;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  if (
    req.query.search &&
    req.query.search.trim()
  ) {
    const searchRegex =
      new RegExp(
        escapeRegex(
          req.query.search.trim()
        ),
        "i"
      );

    filter.$or = [
      {
        userName:
          searchRegex
      },
      {
        userEmail:
          searchRegex
      },
      {
        userRole:
          searchRegex
      },
      {
        action:
          searchRegex
      },
      {
        module:
          searchRegex
      },
      {
        recordModel:
          searchRegex
      },
      {
        description:
          searchRegex
      },
      {
        ipAddress:
          searchRegex
      },
      {
        requestMethod:
          searchRegex
      },
      {
        requestPath:
          searchRegex
      }
    ];
  }

  return {
    filter
  };
};

/*
|--------------------------------------------------------------------------
| Get Audit Logs
|--------------------------------------------------------------------------
*/

exports.getAuditLogs = async (
  req,
  res
) => {
  try {
    const {
      page,
      limit,
      skip
    } = getPaginationOptions(
      req.query
    );

    const filterResult =
      buildAuditLogFilter(req, {
        deleted: false
      });

    if (filterResult.error) {
      return res
        .status(
          filterResult.statusCode ||
            400
        )
        .json({
          success: false,
          message:
            filterResult.error
        });
    }

    const {
      filter
    } = filterResult;

    const [
      auditLogs,
      total
    ] = await Promise.all([
      populateAuditLog(
        AuditLog.find(filter)
      )
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit),

      AuditLog.countDocuments(
        filter
      )
    ]);

    return res.status(200).json({
      success: true,
      count: auditLogs.length,

      pagination:
        buildPagination({
          total,
          page,
          limit
        }),

      auditLogs
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch audit logs"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Deleted Audit Logs
|--------------------------------------------------------------------------
*/

exports.getDeletedAuditLogs =
  async (req, res) => {
    try {
      if (!isSuperAdmin(req)) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Only super admin can view deleted audit logs"
          });
      }

      const {
        page,
        limit,
        skip
      } = getPaginationOptions(
        req.query
      );

      const filterResult =
        buildAuditLogFilter(req, {
          deleted: true
        });

      if (filterResult.error) {
        return res
          .status(
            filterResult.statusCode ||
              400
          )
          .json({
            success: false,
            message:
              filterResult.error
          });
      }

      const {
        filter
      } = filterResult;

      const [
        auditLogs,
        total
      ] = await Promise.all([
        populateAuditLog(
          AuditLog.find(filter)
        )
          .sort({
            deletedAt: -1,
            createdAt: -1
          })
          .skip(skip)
          .limit(limit),

        AuditLog.countDocuments(
          filter
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,
          count:
            auditLogs.length,

          pagination:
            buildPagination({
              total,
              page,
              limit
            }),

          auditLogs
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,

        "Failed to fetch deleted audit logs"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Audit Log by ID
|--------------------------------------------------------------------------
*/

exports.getAuditLogById =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid audit log ID format"
          });
      }

      const schoolScope =
        getSchoolScope(req);

      if (schoolScope.error) {
        return res
          .status(
            schoolScope.statusCode ||
              400
          )
          .json({
            success: false,
            message:
              schoolScope.error
          });
      }

      const filter = {
        _id: req.params.id,
        ...schoolScope.filter,

        isDeleted: {
          $ne: true
        }
      };

      const auditLog =
        await populateAuditLog(
          AuditLog.findOne(
            filter
          )
        );

      if (!auditLog) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Audit log not found or access is not allowed"
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          auditLog
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,

        "Failed to fetch audit log"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Audit Log Summary
|--------------------------------------------------------------------------
|
| Current filters کے مطابق total، success، failed اور action counts دیتا ہے۔
|
*/

exports.getAuditLogSummary =
  async (req, res) => {
    try {
      const filterResult =
        buildAuditLogFilter(req, {
          deleted: false
        });

      if (filterResult.error) {
        return res
          .status(
            filterResult.statusCode ||
              400
          )
          .json({
            success: false,
            message:
              filterResult.error
          });
      }

      const {
        filter
      } = filterResult;

      const [
        total,
        successCount,
        failedCount,
        actionSummary,
        moduleSummary
      ] = await Promise.all([
        AuditLog.countDocuments(
          filter
        ),

        AuditLog.countDocuments({
          ...filter,
          status: "success"
        }),

        AuditLog.countDocuments({
          ...filter,
          status: "failed"
        }),

        AuditLog.aggregate([
          {
            $match: filter
          },
          {
            $group: {
              _id: "$action",
              count: {
                $sum: 1
              }
            }
          },
          {
            $sort: {
              count: -1
            }
          }
        ]),

        AuditLog.aggregate([
          {
            $match: filter
          },
          {
            $group: {
              _id: "$module",
              count: {
                $sum: 1
              }
            }
          },
          {
            $sort: {
              count: -1
            }
          },
          {
            $limit: 10
          }
        ])
      ]);

      const byAction = {};

      actionSummary.forEach(
        (item) => {
          byAction[
            item._id || "OTHER"
          ] = item.count;
        }
      );

      const byModule =
        moduleSummary.map(
          (item) => ({
            module:
              item._id ||
              "UNKNOWN",

            count:
              item.count
          })
        );

      return res
        .status(200)
        .json({
          success: true,

          summary: {
            total,
            success:
              successCount,
            failed:
              failedCount,
            byAction,
            byModule
          }
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,

        "Failed to fetch audit log summary"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Audit Log
|--------------------------------------------------------------------------
*/

exports.deleteAuditLog =
  async (req, res) => {
    try {
      if (!isSuperAdmin(req)) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Only super admin can delete audit logs"
          });
      }

      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid audit log ID format"
          });
      }

      const auditLog =
        await AuditLog.findOne({
          _id: req.params.id,

          isDeleted: {
            $ne: true
          }
        });

      if (!auditLog) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Audit log not found"
          });
      }

      auditLog.isDeleted = true;
      auditLog.deletedAt =
        new Date();
      auditLog.deletedBy =
        req.user._id;

      await auditLog.save();

      const populatedAuditLog =
        await populateAuditLog(
          AuditLog.findById(
            auditLog._id
          )
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Audit log deleted successfully",

          auditLog:
            populatedAuditLog
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,

        "Failed to delete audit log"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Restore Audit Log
|--------------------------------------------------------------------------
*/

exports.restoreAuditLog =
  async (req, res) => {
    try {
      if (!isSuperAdmin(req)) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Only super admin can restore audit logs"
          });
      }

      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid audit log ID format"
          });
      }

      const auditLog =
        await AuditLog.findOne({
          _id: req.params.id,
          isDeleted: true
        });

      if (!auditLog) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Deleted audit log not found"
          });
      }

      auditLog.isDeleted = false;
      auditLog.deletedAt = null;
      auditLog.deletedBy = null;

      await auditLog.save();

      const populatedAuditLog =
        await populateAuditLog(
          AuditLog.findById(
            auditLog._id
          )
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Audit log restored successfully",

          auditLog:
            populatedAuditLog
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,

        "Failed to restore audit log"
      );
    }
  };