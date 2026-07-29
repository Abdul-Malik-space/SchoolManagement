const mongoose = require("mongoose");

const TimetableConfig =
  require("../models/TimetableConfig");

const TimetableEntry =
  require("../models/TimetableEntry");

const School =
  require("../models/School");

/*
|--------------------------------------------------------------------------
| Optional Audit Log Helper
|--------------------------------------------------------------------------
|
| اگر project میں auditLogHelper موجود ہے تو controller اسے استعمال کرے گا۔
| Helper موجود نہ ہونے کی صورت میں timetable operations متاثر نہیں ہوں گے۔
|
*/

let auditLogHelper = null;

try {
  auditLogHelper =
    require("../utils/auditLogHelper");
} catch (error) {
  auditLogHelper = null;
}

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

const VIEW_ROLES = [
  "super_admin",
  "principal",
  "teacher"
];

const ALLOWED_SORT_FIELDS = [
  "title",
  "code",
  "status",
  "isActive",
  "effectiveFrom",
  "effectiveTo",
  "createdAt",
  "updatedAt",
  "academicYear.label"
];

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const getUserId = (
  request
) => {
  return (
    request.user?._id ||
    request.user?.id ||
    null
  );
};

const getUserRole = (
  request
) => {
  return String(
    request.user?.role || ""
  ).toLowerCase();
};

const getAssignedSchoolId = (
  request
) => {
  const school =
    request.schoolId ||
    request.user?.schoolId ||
    request.user?.school;

  if (!school) {
    return null;
  }

  if (
    typeof school ===
    "object"
  ) {
    return (
      school._id ||
      school.id ||
      null
    );
  }

  return school;
};

const isSuperAdmin = (
  request
) => {
  return (
    getUserRole(request) ===
    "super_admin"
  );
};

const canManageTimetable = (
  request
) => {
  return MANAGEMENT_ROLES.includes(
    getUserRole(request)
  );
};

const isValidObjectId = (
  value
) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

const parseBoolean = (
  value
) => {
  if (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === 0 ||
    value === "0"
  ) {
    return false;
  }

  return undefined;
};

const parsePositiveInteger = (
  value,
  fallback,
  maximum = 100
) => {
  const number =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(number) ||
    number < 1
  ) {
    return fallback;
  }

  return Math.min(
    number,
    maximum
  );
};

const normalizeText = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ");
};

const normalizeCode = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-_]/g, "");
};

const escapeRegex = (
  value
) => {
  return String(value || "")
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
};

const cleanObject = (
  object
) => {
  return Object.fromEntries(
    Object.entries(
      object || {}
    ).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );
};

const sendError = (
  response,
  statusCode,
  message,
  details = undefined
) => {
  return response.status(
    statusCode
  ).json({
    success: false,
    message,
    ...(details
      ? {
          details
        }
      : {})
  });
};

const getDuplicateKeyMessage = (
  error
) => {
  const keyPattern =
    error?.keyPattern || {};

  if (
    keyPattern.schoolId &&
    keyPattern.code
  ) {
    return (
      "A timetable with this code already exists for the selected school."
    );
  }

  if (
    keyPattern.schoolId &&
    keyPattern.isActive
  ) {
    return (
      "This school already has an active timetable."
    );
  }

  return (
    "A timetable record with the same unique information already exists."
  );
};

/*
|--------------------------------------------------------------------------
| Audit Helper
|--------------------------------------------------------------------------
*/

const createAuditEntry =
  async ({
    request,
    action,
    entityId,
    description,
    oldData = null,
    newData = null,
    schoolId = null
  }) => {
    if (!auditLogHelper) {
      return;
    }

    try {
      const payload = {
        action,
        module:
          "timetable_management",
        entityType:
          "TimetableConfig",
        entityId,
        description,
        oldData,
        newData,
        schoolId,
        performedBy:
          getUserId(request),
        userId:
          getUserId(request),
        ipAddress:
          request.ip,
        userAgent:
          request.get?.(
            "user-agent"
          )
      };

      if (
        typeof auditLogHelper ===
        "function"
      ) {
        await auditLogHelper(
          payload
        );

        return;
      }

      if (
        typeof auditLogHelper.createAuditLog ===
        "function"
      ) {
        await auditLogHelper.createAuditLog(
          payload
        );

        return;
      }

      if (
        typeof auditLogHelper.logAction ===
        "function"
      ) {
        await auditLogHelper.logAction(
          payload
        );
      }
    } catch (error) {
      console.error(
        "Timetable audit log error:",
        error.message
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Population Helper
|--------------------------------------------------------------------------
*/

const populateTimetableConfig =
  (query) => {
    return query
      .populate(
        "schoolId",
        "schoolName name schoolCode code email phone status"
      )
      .populate(
        "createdBy",
        "name email role"
      )
      .populate(
        "updatedBy",
        "name email role"
      )
      .populate(
        "deletedBy",
        "name email role"
      )
      .populate(
        "publication.publishedBy",
        "name email role"
      )
      .populate(
        "publication.archivedBy",
        "name email role"
      )
      .populate(
        "copiedFromConfigId",
        "title code status academicYear"
      );
  };

/*
|--------------------------------------------------------------------------
| School Scope Helpers
|--------------------------------------------------------------------------
*/

const resolveRequestedSchoolId =
  (
    request,
    requestedSchoolId
  ) => {
    if (
      isSuperAdmin(request)
    ) {
      return (
        requestedSchoolId ||
        null
      );
    }

    return (
      getAssignedSchoolId(
        request
      ) || null
    );
  };

const buildSchoolScopeFilter =
  (
    request,
    requestedSchoolId
  ) => {
    if (
      isSuperAdmin(request)
    ) {
      if (
        requestedSchoolId
      ) {
        return {
          schoolId:
            requestedSchoolId
        };
      }

      return {};
    }

    const assignedSchoolId =
      getAssignedSchoolId(
        request
      );

    if (
      !assignedSchoolId
    ) {
      return {
        schoolId: null
      };
    }

    return {
      schoolId:
        assignedSchoolId
    };
  };

const verifySchoolAccess =
  async (
    request,
    schoolId
  ) => {
    if (
      !schoolId ||
      !isValidObjectId(
        schoolId
      )
    ) {
      return {
        allowed: false,
        message:
          "A valid school is required."
      };
    }

    if (
      !isSuperAdmin(request)
    ) {
      const assignedSchoolId =
        getAssignedSchoolId(
          request
        );

      if (
        !assignedSchoolId ||
        String(
          assignedSchoolId
        ) !==
          String(
            schoolId
          )
      ) {
        return {
          allowed: false,
          message:
            "You cannot manage another school's timetable."
        };
      }
    }

    const school =
      await School.findOne({
        _id: schoolId,
        isDeleted: {
          $ne: true
        }
      }).select(
        "_id schoolName name schoolCode code status"
      );

    if (!school) {
      return {
        allowed: false,
        message:
          "The selected school was not found."
      };
    }

    return {
      allowed: true,
      school
    };
  };

/*
|--------------------------------------------------------------------------
| Payload Builder
|--------------------------------------------------------------------------
*/

const buildTimetableConfigPayload =
  (
    body,
    options = {}
  ) => {
    const {
      includeStatus = false,
      includeActive = false,
      includePublication = false
    } = options;

    const payload = {};

    const allowedFields = [
      "title",
      "code",
      "description",
      "academicYear",
      "academicTerm",
      "effectiveFrom",
      "effectiveTo",
      "timezone",
      "locale",
      "weekStartsOn",
      "rotationCycle",
      "daySchedules",
      "rules",
      "isLocked",
      "versionNumber"
    ];

    allowedFields.forEach(
      (field) => {
        if (
          body[field] !==
          undefined
        ) {
          payload[field] =
            body[field];
        }
      }
    );

    if (
      payload.title !==
      undefined
    ) {
      payload.title =
        normalizeText(
          payload.title
        );
    }

    if (
      payload.code !==
      undefined
    ) {
      payload.code =
        normalizeCode(
          payload.code
        );
    }

    if (
      payload.description !==
      undefined
    ) {
      payload.description =
        normalizeText(
          payload.description
        );
    }

    if (
      includeStatus &&
      body.status !==
        undefined
    ) {
      payload.status =
        body.status;
    }

    if (
      includeActive &&
      body.isActive !==
        undefined
    ) {
      payload.isActive =
        Boolean(
          body.isActive
        );
    }

    if (
      includePublication &&
      body.publication !==
        undefined
    ) {
      payload.publication =
        body.publication;
    }

    return payload;
  };

/*
|--------------------------------------------------------------------------
| Clone Data Helper
|--------------------------------------------------------------------------
*/

const createClonePayload =
  (
    sourceConfig,
    body,
    userId
  ) => {
    const sourceObject =
      sourceConfig.toObject({
        virtuals: false
      });

    delete sourceObject._id;
    delete sourceObject.id;
    delete sourceObject.__v;
    delete sourceObject.createdAt;
    delete sourceObject.updatedAt;
    delete sourceObject.deletedAt;
    delete sourceObject.deletedBy;

    return {
      ...sourceObject,

      title:
        normalizeText(
          body.title ||
          `${sourceConfig.title} Copy`
        ),

      code:
        normalizeCode(
          body.code
        ),

      description:
        body.description !==
        undefined
          ? normalizeText(
              body.description
            )
          : sourceConfig.description,

      academicYear:
        body.academicYear ||
        sourceConfig.academicYear,

      academicTerm:
        body.academicTerm ||
        sourceConfig.academicTerm,

      effectiveFrom:
        body.effectiveFrom ||
        sourceConfig.effectiveFrom,

      effectiveTo:
        body.effectiveTo ||
        sourceConfig.effectiveTo,

      status: "draft",
      isActive: false,
      isLocked: false,

      versionNumber:
        Number(
          sourceConfig.versionNumber ||
          1
        ) + 1,

      copiedFromConfigId:
        sourceConfig._id,

      publication: {
        publishedAt: null,
        publishedBy: null,
        archivedAt: null,
        archivedBy: null,
        publicationNotes: ""
      },

      createdBy:
        userId,

      updatedBy: null,

      isDeleted: false,
      deletedAt: null,
      deletedBy: null
    };
  };

/*
|--------------------------------------------------------------------------
| Find Timetable Within User Scope
|--------------------------------------------------------------------------
*/

const findScopedTimetable =
  async (
    request,
    timetableId,
    options = {}
  ) => {
    const {
      includeDeleted = false,
      populate = true
    } = options;

    if (
      !isValidObjectId(
        timetableId
      )
    ) {
      return null;
    }

    const filter = {
      _id: timetableId,

      ...buildSchoolScopeFilter(
        request
      ),

      isDeleted:
        includeDeleted
          ? true
          : {
              $ne: true
            }
    };

    const query =
      TimetableConfig.findOne(
        filter
      );

    return populate
      ? populateTimetableConfig(
          query
        )
      : query;
  };

/*
|--------------------------------------------------------------------------
| Generate Unique Clone Code
|--------------------------------------------------------------------------
*/

const generateUniqueCloneCode =
  async (
    schoolId,
    sourceCode,
    requestedCode
  ) => {
    if (
      requestedCode
    ) {
      return normalizeCode(
        requestedCode
      );
    }

    const baseCode =
      normalizeCode(
        `${sourceCode}-COPY`
      );

    let candidate =
      baseCode;

    let sequence = 1;

    while (
      await TimetableConfig.exists({
        schoolId,
        code: candidate,
        isDeleted: {
          $ne: true
        }
      })
    ) {
      sequence += 1;

      candidate =
        `${baseCode}-${sequence}`;
    }

    return candidate;
  };

/*
|--------------------------------------------------------------------------
| Create Timetable Configuration
|--------------------------------------------------------------------------
*/

const createTimetableConfig =
  async (
    request,
    response
  ) => {
    try {
      if (
        !canManageTimetable(
          request
        )
      ) {
        return sendError(
          response,
          403,
          "You do not have permission to create timetable settings."
        );
      }

      const schoolId =
        resolveRequestedSchoolId(
          request,
          request.body.schoolId
        );

      const schoolAccess =
        await verifySchoolAccess(
          request,
          schoolId
        );

      if (
        !schoolAccess.allowed
      ) {
        return sendError(
          response,
          403,
          schoolAccess.message
        );
      }

      const userId =
        getUserId(request);

      if (!userId) {
        return sendError(
          response,
          401,
          "Authenticated user information is missing."
        );
      }

      const payload =
        buildTimetableConfigPayload(
          request.body
        );

      const timetableConfig =
        await TimetableConfig.create({
          ...payload,
          schoolId,
          status: "draft",
          isActive: false,
          publication: {
            publishedAt: null,
            publishedBy: null,
            archivedAt: null,
            archivedBy: null,
            publicationNotes: ""
          },
          createdBy:
            userId
        });

      const populatedConfig =
        await populateTimetableConfig(
          TimetableConfig.findById(
            timetableConfig._id
          )
        );

      await createAuditEntry({
        request,
        action:
          "CREATE_TIMETABLE_CONFIG",
        entityId:
          timetableConfig._id,
        schoolId,
        description:
          `Created timetable configuration ${timetableConfig.title}.`,
        newData:
          timetableConfig.toObject()
      });

      return response.status(
        201
      ).json({
        success: true,
        message:
          "Timetable configuration created successfully.",
        timetableConfig:
          populatedConfig,
        data:
          populatedConfig
      });
    } catch (error) {
      console.error(
        "Create timetable config error:",
        error
      );

      if (
        error?.code ===
        11000
      ) {
        return sendError(
          response,
          409,
          getDuplicateKeyMessage(
            error
          )
        );
      }

      if (
        error?.name ===
        "ValidationError"
      ) {
        return sendError(
          response,
          400,
          "Timetable configuration validation failed.",
          Object.values(
            error.errors
          ).map(
            (item) =>
              item.message
          )
        );
      }

      return sendError(
        response,
        500,
        "Timetable configuration could not be created."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Timetable Configurations
|--------------------------------------------------------------------------
*/

const getTimetableConfigs =
  async (
    request,
    response
  ) => {
    try {
      const {
        schoolId,
        search,
        status,
        academicYear,
        fromDate,
        toDate,
        isActive,
        isLocked,
        sortBy = "createdAt",
        sortOrder = "desc"
      } = request.query;

      const page =
        parsePositiveInteger(
          request.query.page,
          1,
          100000
        );

      const limit =
        parsePositiveInteger(
          request.query.limit,
          10,
          100
        );

      const skip =
        (page - 1) *
        limit;

      const filter = {
        ...buildSchoolScopeFilter(
          request,
          schoolId
        ),

        isDeleted: {
          $ne: true
        }
      };

      if (search) {
        const regex =
          new RegExp(
            escapeRegex(
              search
            ),
            "i"
          );

        filter.$or = [
          {
            title: regex
          },
          {
            code: regex
          },
          {
            description:
              regex
          },
          {
            "academicYear.label":
              regex
          },
          {
            "academicTerm.name":
              regex
          }
        ];
      }

      if (status) {
        filter.status =
          status;
      }

      if (academicYear) {
        filter[
          "academicYear.label"
        ] =
          new RegExp(
            `^${escapeRegex(
              academicYear
            )}$`,
            "i"
          );
      }

      const activeFilter =
        parseBoolean(
          isActive
        );

      if (
        activeFilter !==
        undefined
      ) {
        filter.isActive =
          activeFilter;
      }

      const lockedFilter =
        parseBoolean(
          isLocked
        );

      if (
        lockedFilter !==
        undefined
      ) {
        filter.isLocked =
          lockedFilter;
      }

      if (
        fromDate ||
        toDate
      ) {
        filter.effectiveFrom =
          {};

        if (fromDate) {
          filter.effectiveFrom
            .$gte =
            new Date(
              fromDate
            );
        }

        if (toDate) {
          const endDate =
            new Date(
              toDate
            );

          endDate.setHours(
            23,
            59,
            59,
            999
          );

          filter.effectiveFrom
            .$lte =
            endDate;
        }
      }

      const safeSortBy =
        ALLOWED_SORT_FIELDS.includes(
          sortBy
        )
          ? sortBy
          : "createdAt";

      const sortDirection =
        String(
          sortOrder
        ).toLowerCase() ===
        "asc"
          ? 1
          : -1;

      const sort = {
        [safeSortBy]:
          sortDirection
      };

      const [
        timetableConfigs,
        total,
        summaryAggregation
      ] = await Promise.all([
        populateTimetableConfig(
          TimetableConfig.find(
            filter
          )
            .sort(sort)
            .skip(skip)
            .limit(limit)
        ),

        TimetableConfig.countDocuments(
          filter
        ),

        TimetableConfig.aggregate([
          {
            $match:
              filter
          },
          {
            $group: {
              _id: null,

              totalConfigurations: {
                $sum: 1
              },

              draft: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "draft"
                      ]
                    },
                    1,
                    0
                  ]
                }
              },

              published: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "published"
                      ]
                    },
                    1,
                    0
                  ]
                }
              },

              archived: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "archived"
                      ]
                    },
                    1,
                    0
                  ]
                }
              },

              active: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$isActive",
                        true
                      ]
                    },
                    1,
                    0
                  ]
                }
              },

              locked: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$isLocked",
                        true
                      ]
                    },
                    1,
                    0
                  ]
                }
              },

              totalWorkingDays: {
                $sum: {
                  $size: {
                    $filter: {
                      input:
                        "$daySchedules",
                      as: "day",
                      cond: {
                        $eq: [
                          "$$day.isWorkingDay",
                          true
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        ])
      ]);

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            total /
              Math.max(
                limit,
                1
              )
          )
        );

      const summary =
        summaryAggregation[0] || {
          totalConfigurations: 0,
          draft: 0,
          published: 0,
          archived: 0,
          active: 0,
          locked: 0,
          totalWorkingDays: 0
        };

      return response.status(
        200
      ).json({
        success: true,
        message:
          "Timetable configurations retrieved successfully.",
        timetableConfigs,
        data:
          timetableConfigs,
        summary,
        pagination: {
          total,
          currentPage:
            page,
          page,
          limit,
          totalPages,
          hasNextPage:
            page <
            totalPages,
          hasPreviousPage:
            page > 1
        }
      });
    } catch (error) {
      console.error(
        "Get timetable configs error:",
        error
      );

      return sendError(
        response,
        500,
        "Timetable configurations could not be loaded."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Single Timetable Configuration
|--------------------------------------------------------------------------
*/

const getTimetableConfigById =
  async (
    request,
    response
  ) => {
    try {
      const timetableConfig =
        await findScopedTimetable(
          request,
          request.params.id
        );

      if (
        !timetableConfig
      ) {
        return sendError(
          response,
          404,
          "Timetable configuration was not found."
        );
      }

      const entrySummary =
        await TimetableEntry.aggregate([
          {
            $match: {
              timetableConfigId:
                timetableConfig._id,
              isDeleted: {
                $ne: true
              }
            }
          },
          {
            $group: {
              _id: null,

              totalEntries: {
                $sum: 1
              },

              activeEntries: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$isActive",
                        true
                      ]
                    },
                    1,
                    0
                  ]
                }
              },

              cancelledEntries: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "cancelled"
                      ]
                    },
                    1,
                    0
                  ]
                }
              },

              uniqueTeachers: {
                $addToSet:
                  "$teacherId"
              },

              uniqueClasses: {
                $addToSet:
                  "$classId"
              },

              uniqueSubjects: {
                $addToSet:
                  "$subjectId"
              }
            }
          },
          {
            $project: {
              _id: 0,
              totalEntries: 1,
              activeEntries: 1,
              cancelledEntries: 1,

              teacherCount: {
                $size: {
                  $filter: {
                    input:
                      "$uniqueTeachers",
                    as: "teacher",
                    cond: {
                      $ne: [
                        "$$teacher",
                        null
                      ]
                    }
                  }
                }
              },

              classCount: {
                $size: {
                  $filter: {
                    input:
                      "$uniqueClasses",
                    as: "class",
                    cond: {
                      $ne: [
                        "$$class",
                        null
                      ]
                    }
                  }
                }
              },

              subjectCount: {
                $size: {
                  $filter: {
                    input:
                      "$uniqueSubjects",
                    as: "subject",
                    cond: {
                      $ne: [
                        "$$subject",
                        null
                      ]
                    }
                  }
                }
              }
            }
          }
        ]);

      return response.status(
        200
      ).json({
        success: true,
        timetableConfig,
        data:
          timetableConfig,
        entrySummary:
          entrySummary[0] || {
            totalEntries: 0,
            activeEntries: 0,
            cancelledEntries: 0,
            teacherCount: 0,
            classCount: 0,
            subjectCount: 0
          }
      });
    } catch (error) {
      console.error(
        "Get timetable config error:",
        error
      );

      return sendError(
        response,
        500,
        "Timetable configuration could not be loaded."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Active Timetable Configuration
|--------------------------------------------------------------------------
*/

const getActiveTimetableConfig =
  async (
    request,
    response
  ) => {
    try {
      const schoolId =
        resolveRequestedSchoolId(
          request,
          request.query.schoolId
        );

      if (
        !schoolId ||
        !isValidObjectId(
          schoolId
        )
      ) {
        return sendError(
          response,
          400,
          "A valid school is required."
        );
      }

      const filter = {
        ...buildSchoolScopeFilter(
          request,
          schoolId
        ),

        status:
          "published",

        isActive: true,

        isDeleted: {
          $ne: true
        }
      };

      const timetableConfig =
        await populateTimetableConfig(
          TimetableConfig.findOne(
            filter
          )
        );

      if (
        !timetableConfig
      ) {
        return sendError(
          response,
          404,
          "No active timetable is available for this school."
        );
      }

      return response.status(
        200
      ).json({
        success: true,
        timetableConfig,
        data:
          timetableConfig
      });
    } catch (error) {
      console.error(
        "Get active timetable error:",
        error
      );

      return sendError(
        response,
        500,
        "Active timetable could not be loaded."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Update Timetable Configuration
|--------------------------------------------------------------------------
*/

const updateTimetableConfig =
  async (
    request,
    response
  ) => {
    try {
      if (
        !canManageTimetable(
          request
        )
      ) {
        return sendError(
          response,
          403,
          "You do not have permission to update timetable settings."
        );
      }

      const timetableConfig =
        await findScopedTimetable(
          request,
          request.params.id,
          {
            populate: false
          }
        );

      if (
        !timetableConfig
      ) {
        return sendError(
          response,
          404,
          "Timetable configuration was not found."
        );
      }

      if (
        timetableConfig.isLocked
      ) {
        return sendError(
          response,
          409,
          "This timetable is locked. Unlock it before making changes."
        );
      }

      const oldData =
        timetableConfig.toObject();

      const payload =
        buildTimetableConfigPayload(
          request.body
        );

      Object.assign(
        timetableConfig,
        payload,
        {
          updatedBy:
            getUserId(
              request
            )
        }
      );

      await timetableConfig.save();

      const populatedConfig =
        await populateTimetableConfig(
          TimetableConfig.findById(
            timetableConfig._id
          )
        );

      await createAuditEntry({
        request,
        action:
          "UPDATE_TIMETABLE_CONFIG",
        entityId:
          timetableConfig._id,
        schoolId:
          timetableConfig.schoolId,
        description:
          `Updated timetable configuration ${timetableConfig.title}.`,
        oldData,
        newData:
          timetableConfig.toObject()
      });

      return response.status(
        200
      ).json({
        success: true,
        message:
          "Timetable configuration updated successfully.",
        timetableConfig:
          populatedConfig,
        data:
          populatedConfig
      });
    } catch (error) {
      console.error(
        "Update timetable config error:",
        error
      );

      if (
        error?.code ===
        11000
      ) {
        return sendError(
          response,
          409,
          getDuplicateKeyMessage(
            error
          )
        );
      }

      if (
        error?.name ===
        "ValidationError"
      ) {
        return sendError(
          response,
          400,
          "Timetable configuration validation failed.",
          Object.values(
            error.errors
          ).map(
            (item) =>
              item.message
          )
        );
      }

      return sendError(
        response,
        500,
        "Timetable configuration could not be updated."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Period Settings
|--------------------------------------------------------------------------
*/

const getPeriodSettings =
  async (
    request,
    response
  ) => {
    try {
      let timetableConfig =
        null;

      if (
        request.params.id
      ) {
        timetableConfig =
          await findScopedTimetable(
            request,
            request.params.id
          );
      } else {
        const schoolId =
          resolveRequestedSchoolId(
            request,
            request.query.schoolId
          );

        timetableConfig =
          await populateTimetableConfig(
            TimetableConfig.findOne({
              ...buildSchoolScopeFilter(
                request,
                schoolId
              ),

              isActive: true,
              status:
                "published",

              isDeleted: {
                $ne: true
              }
            })
          );
      }

      if (
        !timetableConfig
      ) {
        return sendError(
          response,
          404,
          "Timetable period settings were not found."
        );
      }

      return response.status(
        200
      ).json({
        success: true,

        periodSettings: {
          timetableConfigId:
            timetableConfig._id,

          title:
            timetableConfig.title,

          code:
            timetableConfig.code,

          academicYear:
            timetableConfig.academicYear,

          academicTerm:
            timetableConfig.academicTerm,

          timezone:
            timetableConfig.timezone,

          weekStartsOn:
            timetableConfig.weekStartsOn,

          rotationCycle:
            timetableConfig.rotationCycle,

          daySchedules:
            timetableConfig.daySchedules,

          rules:
            timetableConfig.rules,

          status:
            timetableConfig.status,

          isActive:
            timetableConfig.isActive,

          isLocked:
            timetableConfig.isLocked,

          workingDays:
            timetableConfig.workingDays,

          workingDayCount:
            timetableConfig.workingDayCount,

          totalPeriodSlots:
            timetableConfig.totalPeriodSlots,

          totalInstructionalSlots:
            timetableConfig.totalInstructionalSlots,

          weeklyInstructionMinutes:
            timetableConfig.weeklyInstructionMinutes
        },

        timetableConfig
      });
    } catch (error) {
      console.error(
        "Get period settings error:",
        error
      );

      return sendError(
        response,
        500,
        "Period settings could not be loaded."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Update Period Settings
|--------------------------------------------------------------------------
*/

const updatePeriodSettings =
  async (
    request,
    response
  ) => {
    try {
      if (
        !canManageTimetable(
          request
        )
      ) {
        return sendError(
          response,
          403,
          "You do not have permission to update period settings."
        );
      }

      const timetableConfig =
        await findScopedTimetable(
          request,
          request.params.id,
          {
            populate: false
          }
        );

      if (
        !timetableConfig
      ) {
        return sendError(
          response,
          404,
          "Timetable configuration was not found."
        );
      }

      if (
        timetableConfig.isLocked
      ) {
        return sendError(
          response,
          409,
          "This timetable is locked. Period settings cannot be changed."
        );
      }

      if (
        !Array.isArray(
          request.body.daySchedules
        )
      ) {
        return sendError(
          response,
          400,
          "Day schedules are required."
        );
      }

      const oldData = {
        daySchedules:
          timetableConfig.daySchedules,

        rules:
          timetableConfig.rules,

        rotationCycle:
          timetableConfig.rotationCycle,

        weekStartsOn:
          timetableConfig.weekStartsOn
      };

      timetableConfig.daySchedules =
        request.body.daySchedules;

      if (
        request.body.rules !==
        undefined
      ) {
        timetableConfig.rules =
          request.body.rules;
      }

      if (
        request.body.rotationCycle !==
        undefined
      ) {
        timetableConfig.rotationCycle =
          request.body.rotationCycle;
      }

      if (
        request.body.weekStartsOn !==
        undefined
      ) {
        timetableConfig.weekStartsOn =
          request.body.weekStartsOn;
      }

      timetableConfig.updatedBy =
        getUserId(request);

      await timetableConfig.save();

      const populatedConfig =
        await populateTimetableConfig(
          TimetableConfig.findById(
            timetableConfig._id
          )
        );

      await createAuditEntry({
        request,
        action:
          "UPDATE_TIMETABLE_PERIOD_SETTINGS",
        entityId:
          timetableConfig._id,
        schoolId:
          timetableConfig.schoolId,
        description:
          `Updated period settings for ${timetableConfig.title}.`,
        oldData,
        newData: {
          daySchedules:
            timetableConfig.daySchedules,

          rules:
            timetableConfig.rules,

          rotationCycle:
            timetableConfig.rotationCycle,

          weekStartsOn:
            timetableConfig.weekStartsOn
        }
      });

      return response.status(
        200
      ).json({
        success: true,
        message:
          "Period settings updated successfully.",
        timetableConfig:
          populatedConfig,
        periodSettings: {
          daySchedules:
            populatedConfig.daySchedules,
          rules:
            populatedConfig.rules,
          rotationCycle:
            populatedConfig.rotationCycle,
          weekStartsOn:
            populatedConfig.weekStartsOn
        }
      });
    } catch (error) {
      console.error(
        "Update period settings error:",
        error
      );

      if (
        error?.name ===
        "ValidationError"
      ) {
        return sendError(
          response,
          400,
          "Period settings validation failed.",
          Object.values(
            error.errors
          ).map(
            (item) =>
              item.message
          )
        );
      }

      return sendError(
        response,
        500,
        "Period settings could not be updated."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Publish Timetable Configuration
|--------------------------------------------------------------------------
*/

const publishTimetableConfig =
  async (
    request,
    response
  ) => {
    try {
      if (
        !canManageTimetable(
          request
        )
      ) {
        return sendError(
          response,
          403,
          "You do not have permission to publish timetables."
        );
      }

      const timetableConfig =
        await findScopedTimetable(
          request,
          request.params.id,
          {
            populate: false
          }
        );

      if (
        !timetableConfig
      ) {
        return sendError(
          response,
          404,
          "Timetable configuration was not found."
        );
      }

      if (
        timetableConfig.status ===
          "archived"
      ) {
        return sendError(
          response,
          409,
          "An archived timetable must first be restored to draft status."
        );
      }

      const totalEntries =
        await TimetableEntry.countDocuments({
          timetableConfigId:
            timetableConfig._id,
          isDeleted: {
            $ne: true
          },
          isActive: {
            $ne: false
          },
          status: {
            $ne:
              "cancelled"
          }
        });

      if (
        totalEntries === 0
      ) {
        return sendError(
          response,
          409,
          "Add timetable entries before publishing this timetable."
        );
      }

      const userId =
        getUserId(request);

      const previousActiveConfigs =
        await TimetableConfig.find({
          schoolId:
            timetableConfig.schoolId,

          _id: {
            $ne:
              timetableConfig._id
          },

          isActive: true,

          isDeleted: {
            $ne: true
          }
        });

      const previousSnapshots =
        previousActiveConfigs.map(
          (config) => ({
            _id:
              config._id,
            status:
              config.status,
            isActive:
              config.isActive,
            publication:
              config.publication
          })
        );

      try {
        if (
          previousActiveConfigs.length >
          0
        ) {
          await TimetableConfig.updateMany(
            {
              _id: {
                $in:
                  previousActiveConfigs.map(
                    (config) =>
                      config._id
                  )
              }
            },
            {
              $set: {
                status:
                  "archived",

                isActive:
                  false,

                "publication.archivedAt":
                  new Date(),

                "publication.archivedBy":
                  userId,

                updatedBy:
                  userId
              }
            }
          );
        }

        timetableConfig.status =
          "published";

        timetableConfig.isActive =
          request.body.isActive ===
          false
            ? false
            : true;

        timetableConfig.isLocked =
          request.body.lockAfterPublish ===
          false
            ? false
            : true;

        timetableConfig.publication =
          timetableConfig.publication ||
          {};

        timetableConfig.publication.publishedAt =
          new Date();

        timetableConfig.publication.publishedBy =
          userId;

        timetableConfig.publication.archivedAt =
          null;

        timetableConfig.publication.archivedBy =
          null;

        timetableConfig.publication.publicationNotes =
          normalizeText(
            request.body.publicationNotes ||
            ""
          );

        timetableConfig.updatedBy =
          userId;

        await timetableConfig.save();
      } catch (publishError) {
        for (
          const snapshot of
          previousSnapshots
        ) {
          await TimetableConfig.updateOne(
            {
              _id:
                snapshot._id
            },
            {
              $set: {
                status:
                  snapshot.status,

                isActive:
                  snapshot.isActive,

                publication:
                  snapshot.publication
              }
            }
          );
        }

        throw publishError;
      }

      const populatedConfig =
        await populateTimetableConfig(
          TimetableConfig.findById(
            timetableConfig._id
          )
        );

      await createAuditEntry({
        request,
        action:
          "PUBLISH_TIMETABLE",
        entityId:
          timetableConfig._id,
        schoolId:
          timetableConfig.schoolId,
        description:
          `Published timetable ${timetableConfig.title}.`,
        newData:
          timetableConfig.toObject()
      });

      return response.status(
        200
      ).json({
        success: true,
        message:
          "Timetable published successfully.",
        timetableConfig:
          populatedConfig,
        data:
          populatedConfig
      });
    } catch (error) {
      console.error(
        "Publish timetable error:",
        error
      );

      if (
        error?.code ===
        11000
      ) {
        return sendError(
          response,
          409,
          getDuplicateKeyMessage(
            error
          )
        );
      }

      if (
        error?.name ===
        "ValidationError"
      ) {
        return sendError(
          response,
          400,
          "Timetable publication validation failed.",
          Object.values(
            error.errors
          ).map(
            (item) =>
              item.message
          )
        );
      }

      return sendError(
        response,
        500,
        "Timetable could not be published."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Archive Timetable Configuration
|--------------------------------------------------------------------------
*/

const archiveTimetableConfig =
  async (
    request,
    response
  ) => {
    try {
      if (
        !canManageTimetable(
          request
        )
      ) {
        return sendError(
          response,
          403,
          "You do not have permission to archive timetables."
        );
      }

      const timetableConfig =
        await findScopedTimetable(
          request,
          request.params.id,
          {
            populate: false
          }
        );

      if (
        !timetableConfig
      ) {
        return sendError(
          response,
          404,
          "Timetable configuration was not found."
        );
      }

      if (
        timetableConfig.status ===
          "archived"
      ) {
        return sendError(
          response,
          409,
          "This timetable is already archived."
        );
      }

      const oldData =
        timetableConfig.toObject();

      timetableConfig.status =
        "archived";

      timetableConfig.isActive =
        false;

      timetableConfig.isLocked =
        true;

      timetableConfig.publication =
        timetableConfig.publication ||
        {};

      timetableConfig.publication.archivedAt =
        new Date();

      timetableConfig.publication.archivedBy =
        getUserId(request);

      timetableConfig.updatedBy =
        getUserId(request);

      await timetableConfig.save();

      const populatedConfig =
        await populateTimetableConfig(
          TimetableConfig.findById(
            timetableConfig._id
          )
        );

      await createAuditEntry({
        request,
        action:
          "ARCHIVE_TIMETABLE",
        entityId:
          timetableConfig._id,
        schoolId:
          timetableConfig.schoolId,
        description:
          `Archived timetable ${timetableConfig.title}.`,
        oldData,
        newData:
          timetableConfig.toObject()
      });

      return response.status(
        200
      ).json({
        success: true,
        message:
          "Timetable archived successfully.",
        timetableConfig:
          populatedConfig,
        data:
          populatedConfig
      });
    } catch (error) {
      console.error(
        "Archive timetable error:",
        error
      );

      return sendError(
        response,
        500,
        "Timetable could not be archived."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Return Archived/Published Timetable to Draft
|--------------------------------------------------------------------------
*/

const returnTimetableToDraft =
  async (
    request,
    response
  ) => {
    try {
      if (
        !canManageTimetable(
          request
        )
      ) {
        return sendError(
          response,
          403,
          "You do not have permission to reopen timetables."
        );
      }

      const timetableConfig =
        await findScopedTimetable(
          request,
          request.params.id,
          {
            populate: false
          }
        );

      if (
        !timetableConfig
      ) {
        return sendError(
          response,
          404,
          "Timetable configuration was not found."
        );
      }

      const oldData =
        timetableConfig.toObject();

      timetableConfig.status =
        "draft";

      timetableConfig.isActive =
        false;

      timetableConfig.isLocked =
        false;

      timetableConfig.publication =
        timetableConfig.publication ||
        {};

      timetableConfig.publication.archivedAt =
        null;

      timetableConfig.publication.archivedBy =
        null;

      timetableConfig.updatedBy =
        getUserId(request);

      await timetableConfig.save();

      const populatedConfig =
        await populateTimetableConfig(
          TimetableConfig.findById(
            timetableConfig._id
          )
        );

      await createAuditEntry({
        request,
        action:
          "RETURN_TIMETABLE_TO_DRAFT",
        entityId:
          timetableConfig._id,
        schoolId:
          timetableConfig.schoolId,
        description:
          `Returned timetable ${timetableConfig.title} to draft.`,
        oldData,
        newData:
          timetableConfig.toObject()
      });

      return response.status(
        200
      ).json({
        success: true,
        message:
          "Timetable returned to draft successfully.",
        timetableConfig:
          populatedConfig,
        data:
          populatedConfig
      });
    } catch (error) {
      console.error(
        "Return timetable to draft error:",
        error
      );

      return sendError(
        response,
        500,
        "Timetable could not be returned to draft."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Lock or Unlock Timetable
|--------------------------------------------------------------------------
*/

const setTimetableLock =
  async (
    request,
    response
  ) => {
    try {
      if (
        !canManageTimetable(
          request
        )
      ) {
        return sendError(
          response,
          403,
          "You do not have permission to lock or unlock timetables."
        );
      }

      const timetableConfig =
        await findScopedTimetable(
          request,
          request.params.id,
          {
            populate: false
          }
        );

      if (
        !timetableConfig
      ) {
        return sendError(
          response,
          404,
          "Timetable configuration was not found."
        );
      }

      const lockValue =
        parseBoolean(
          request.body.isLocked
        );

      if (
        lockValue ===
        undefined
      ) {
        return sendError(
          response,
          400,
          "A valid isLocked value is required."
        );
      }

      timetableConfig.isLocked =
        lockValue;

      timetableConfig.updatedBy =
        getUserId(request);

      await timetableConfig.save();

      const populatedConfig =
        await populateTimetableConfig(
          TimetableConfig.findById(
            timetableConfig._id
          )
        );

      await createAuditEntry({
        request,
        action:
          lockValue
            ? "LOCK_TIMETABLE"
            : "UNLOCK_TIMETABLE",
        entityId:
          timetableConfig._id,
        schoolId:
          timetableConfig.schoolId,
        description:
          `${lockValue ? "Locked" : "Unlocked"} timetable ${timetableConfig.title}.`,
        newData: {
          isLocked:
            lockValue
        }
      });

      return response.status(
        200
      ).json({
        success: true,
        message:
          lockValue
            ? "Timetable locked successfully."
            : "Timetable unlocked successfully.",
        timetableConfig:
          populatedConfig,
        data:
          populatedConfig
      });
    } catch (error) {
      console.error(
        "Set timetable lock error:",
        error
      );

      return sendError(
        response,
        500,
        "Timetable lock status could not be updated."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Clone Timetable Configuration
|--------------------------------------------------------------------------
*/

const cloneTimetableConfig =
  async (
    request,
    response
  ) => {
    try {
      if (
        !canManageTimetable(
          request
        )
      ) {
        return sendError(
          response,
          403,
          "You do not have permission to copy timetables."
        );
      }

      const sourceConfig =
        await findScopedTimetable(
          request,
          request.params.id,
          {
            populate: false
          }
        );

      if (
        !sourceConfig
      ) {
        return sendError(
          response,
          404,
          "Source timetable configuration was not found."
        );
      }

      const cloneCode =
        await generateUniqueCloneCode(
          sourceConfig.schoolId,
          sourceConfig.code,
          request.body.code
        );

      const clonePayload =
        createClonePayload(
          sourceConfig,
          {
            ...request.body,
            code:
              cloneCode
          },
          getUserId(request)
        );

      const clonedConfig =
        await TimetableConfig.create(
          clonePayload
        );

      const shouldCopyEntries =
        request.body.copyEntries !==
        false;

      let copiedEntryCount = 0;

      if (shouldCopyEntries) {
        const sourceEntries =
          await TimetableEntry.find({
            timetableConfigId:
              sourceConfig._id,

            isDeleted: {
              $ne: true
            }
          }).lean();

        if (
          sourceEntries.length >
          0
        ) {
          const copiedEntries =
            sourceEntries.map(
              (entry) => {
                const copiedEntry = {
                  ...entry,

                  _id:
                    new mongoose.Types.ObjectId(),

                  timetableConfigId:
                    clonedConfig._id,

                  timetableConfigSnapshot: {
                    title:
                      clonedConfig.title,

                    code:
                      clonedConfig.code,

                    academicYear:
                      clonedConfig
                        .academicYear
                        ?.label ||
                      ""
                  },

                  source:
                    "copied",

                  copiedFromEntryId:
                    entry._id,

                  status:
                    "scheduled",

                  createdBy:
                    getUserId(
                      request
                    ),

                  updatedBy: null,

                  isDeleted:
                    false,

                  deletedAt:
                    null,

                  deletedBy:
                    null,

                  createdAt:
                    new Date(),

                  updatedAt:
                    new Date()
                };

                delete copiedEntry.__v;

                return copiedEntry;
              }
            );

          await TimetableEntry.insertMany(
            copiedEntries,
            {
              ordered: false
            }
          );

          copiedEntryCount =
            copiedEntries.length;
        }
      }

      const populatedConfig =
        await populateTimetableConfig(
          TimetableConfig.findById(
            clonedConfig._id
          )
        );

      await createAuditEntry({
        request,
        action:
          "CLONE_TIMETABLE",
        entityId:
          clonedConfig._id,
        schoolId:
          clonedConfig.schoolId,
        description:
          `Copied timetable ${sourceConfig.title} to ${clonedConfig.title}.`,
        newData: {
          sourceConfigId:
            sourceConfig._id,
          copiedEntryCount
        }
      });

      return response.status(
        201
      ).json({
        success: true,
        message:
          "Timetable copied successfully.",
        timetableConfig:
          populatedConfig,
        copiedEntryCount,
        data:
          populatedConfig
      });
    } catch (error) {
      console.error(
        "Clone timetable error:",
        error
      );

      if (
        error?.code ===
        11000
      ) {
        return sendError(
          response,
          409,
          getDuplicateKeyMessage(
            error
          )
        );
      }

      if (
        error?.name ===
        "ValidationError"
      ) {
        return sendError(
          response,
          400,
          "Copied timetable validation failed.",
          Object.values(
            error.errors
          ).map(
            (item) =>
              item.message
          )
        );
      }

      return sendError(
        response,
        500,
        "Timetable could not be copied."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Timetable Configuration
|--------------------------------------------------------------------------
*/

const deleteTimetableConfig =
  async (
    request,
    response
  ) => {
    try {
      if (
        !canManageTimetable(
          request
        )
      ) {
        return sendError(
          response,
          403,
          "You do not have permission to delete timetables."
        );
      }

      const timetableConfig =
        await findScopedTimetable(
          request,
          request.params.id,
          {
            populate: false
          }
        );

      if (
        !timetableConfig
      ) {
        return sendError(
          response,
          404,
          "Timetable configuration was not found."
        );
      }

      if (
        timetableConfig.isActive
      ) {
        return sendError(
          response,
          409,
          "The active timetable cannot be deleted. Archive or deactivate it first."
        );
      }

      const userId =
        getUserId(request);

      timetableConfig.isDeleted =
        true;

      timetableConfig.deletedAt =
        new Date();

      timetableConfig.deletedBy =
        userId;

      timetableConfig.isActive =
        false;

      timetableConfig.updatedBy =
        userId;

      await timetableConfig.save();

      const entryUpdateResult =
        await TimetableEntry.updateMany(
          {
            timetableConfigId:
              timetableConfig._id,

            isDeleted: {
              $ne: true
            }
          },
          {
            $set: {
              isDeleted: true,
              deletedAt:
                new Date(),
              deletedBy:
                userId,
              updatedBy:
                userId
            }
          }
        );

      await createAuditEntry({
        request,
        action:
          "DELETE_TIMETABLE_CONFIG",
        entityId:
          timetableConfig._id,
        schoolId:
          timetableConfig.schoolId,
        description:
          `Deleted timetable configuration ${timetableConfig.title}.`,
        newData: {
          deletedEntries:
            entryUpdateResult.modifiedCount ||
            0
        }
      });

      return response.status(
        200
      ).json({
        success: true,
        message:
          "Timetable configuration deleted successfully.",
        deletedEntries:
          entryUpdateResult.modifiedCount ||
          0
      });
    } catch (error) {
      console.error(
        "Delete timetable config error:",
        error
      );

      return sendError(
        response,
        500,
        "Timetable configuration could not be deleted."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Timetable Configurations
|--------------------------------------------------------------------------
*/

const getDeletedTimetableConfigs =
  async (
    request,
    response
  ) => {
    try {
      if (
        !canManageTimetable(
          request
        )
      ) {
        return sendError(
          response,
          403,
          "You do not have permission to view deleted timetables."
        );
      }

      const page =
        parsePositiveInteger(
          request.query.page,
          1,
          100000
        );

      const limit =
        parsePositiveInteger(
          request.query.limit,
          10,
          100
        );

      const skip =
        (page - 1) *
        limit;

      const filter = {
        ...buildSchoolScopeFilter(
          request,
          request.query.schoolId
        ),

        isDeleted: true
      };

      if (
        request.query.search
      ) {
        const regex =
          new RegExp(
            escapeRegex(
              request.query.search
            ),
            "i"
          );

        filter.$or = [
          {
            title: regex
          },
          {
            code: regex
          },
          {
            "academicYear.label":
              regex
          }
        ];
      }

      if (
        request.query.status
      ) {
        filter.status =
          request.query.status;
      }

      const [
        timetableConfigs,
        total
      ] = await Promise.all([
        populateTimetableConfig(
          TimetableConfig.find(
            filter
          )
            .sort({
              deletedAt: -1
            })
            .skip(skip)
            .limit(limit)
        ),

        TimetableConfig.countDocuments(
          filter
        )
      ]);

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            total /
              Math.max(
                limit,
                1
              )
          )
        );

      return response.status(
        200
      ).json({
        success: true,
        timetableConfigs,
        data:
          timetableConfigs,
        pagination: {
          total,
          currentPage:
            page,
          page,
          limit,
          totalPages,
          hasNextPage:
            page <
            totalPages,
          hasPreviousPage:
            page > 1
        }
      });
    } catch (error) {
      console.error(
        "Get deleted timetables error:",
        error
      );

      return sendError(
        response,
        500,
        "Deleted timetable configurations could not be loaded."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Restore Timetable Configuration
|--------------------------------------------------------------------------
*/

const restoreTimetableConfig =
  async (
    request,
    response
  ) => {
    try {
      if (
        !canManageTimetable(
          request
        )
      ) {
        return sendError(
          response,
          403,
          "You do not have permission to restore timetables."
        );
      }

      const timetableConfig =
        await findScopedTimetable(
          request,
          request.params.id,
          {
            includeDeleted:
              true,
            populate:
              false
          }
        );

      if (
        !timetableConfig
      ) {
        return sendError(
          response,
          404,
          "Deleted timetable configuration was not found."
        );
      }

      const duplicateCode =
        await TimetableConfig.exists({
          _id: {
            $ne:
              timetableConfig._id
          },

          schoolId:
            timetableConfig.schoolId,

          code:
            timetableConfig.code,

          isDeleted: {
            $ne: true
          }
        });

      if (
        duplicateCode
      ) {
        return sendError(
          response,
          409,
          "Another active timetable already uses this code. Change its code before restoring."
        );
      }

      const userId =
        getUserId(request);

      timetableConfig.isDeleted =
        false;

      timetableConfig.deletedAt =
        null;

      timetableConfig.deletedBy =
        null;

      timetableConfig.isActive =
        false;

      timetableConfig.updatedBy =
        userId;

      await timetableConfig.save();

      const entryUpdateResult =
        await TimetableEntry.updateMany(
          {
            timetableConfigId:
              timetableConfig._id,

            isDeleted: true
          },
          {
            $set: {
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              updatedBy:
                userId
            }
          }
        );

      const populatedConfig =
        await populateTimetableConfig(
          TimetableConfig.findById(
            timetableConfig._id
          )
        );

      await createAuditEntry({
        request,
        action:
          "RESTORE_TIMETABLE_CONFIG",
        entityId:
          timetableConfig._id,
        schoolId:
          timetableConfig.schoolId,
        description:
          `Restored timetable configuration ${timetableConfig.title}.`,
        newData: {
          restoredEntries:
            entryUpdateResult.modifiedCount ||
            0
        }
      });

      return response.status(
        200
      ).json({
        success: true,
        message:
          "Timetable configuration restored successfully.",
        timetableConfig:
          populatedConfig,
        restoredEntries:
          entryUpdateResult.modifiedCount ||
          0,
        data:
          populatedConfig
      });
    } catch (error) {
      console.error(
        "Restore timetable config error:",
        error
      );

      if (
        error?.code ===
        11000
      ) {
        return sendError(
          response,
          409,
          getDuplicateKeyMessage(
            error
          )
        );
      }

      return sendError(
        response,
        500,
        "Timetable configuration could not be restored."
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Controller Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  createTimetableConfig,
  getTimetableConfigs,
  getTimetableConfigById,
  getActiveTimetableConfig,

  updateTimetableConfig,

  getPeriodSettings,
  updatePeriodSettings,

  publishTimetableConfig,
  archiveTimetableConfig,
  returnTimetableToDraft,
  setTimetableLock,

  cloneTimetableConfig,

  deleteTimetableConfig,
  getDeletedTimetableConfigs,
  restoreTimetableConfig
};