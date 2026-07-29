const mongoose = require("mongoose");

const Staff = require("../models/Staff");
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
| Staff Constants
|--------------------------------------------------------------------------
*/

const STAFF_CATEGORIES = [
  "administration",
  "accounts",
  "library",
  "laboratory",
  "transport",
  "security",
  "maintenance",
  "medical",
  "support",
  "other"
];

const EMPLOYMENT_TYPES = [
  "permanent",
  "contract",
  "temporary",
  "part_time",
  "intern"
];

const STAFF_STATUSES = [
  "active",
  "inactive",
  "on_leave",
  "resigned",
  "terminated"
];

const STAFF_GENDERS = [
  "male",
  "female",
  "other"
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
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const normalizeText = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
};

const normalizeOptionalObjectId = (
  value
) => {
  const normalizedValue =
    normalizeText(value);

  return normalizedValue || null;
};

const normalizeOptionalDate = (
  value
) => {
  if (
    value === "" ||
    value === null
  ) {
    return null;
  }

  return value;
};

const safeNumber = (value) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : value;
};

/*
|--------------------------------------------------------------------------
| Controller Error Handler
|--------------------------------------------------------------------------
*/

const handleControllerError = (
  res,
  error,
  defaultMessage
) => {
  console.error(
    `${defaultMessage}:`,
    error
  );

  if (
    error.name === "ValidationError"
  ) {
    return res.status(400).json({
      success: false,

      message: Object.values(
        error.errors
      )
        .map(
          (validationError) =>
            validationError.message
        )
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
    if (
      error.keyPattern?.employeeId
    ) {
      return res.status(400).json({
        success: false,

        message:
          "A staff member already exists with this employee ID in the selected school"
      });
    }

    if (error.keyPattern?.userId) {
      return res.status(400).json({
        success: false,

        message:
          "This user account is already linked with another staff profile"
      });
    }

    return res.status(400).json({
      success: false,

      message:
        "A staff record already exists with the provided information"
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
| Safe Audit Logger
|--------------------------------------------------------------------------
|
| Staff operation audit log failure کی وجہ سے اصل CRUD operation fail
| نہیں ہوگا۔ Error backend terminal میں نظر آئے گا۔
|
*/

const recordAuditLog = async (
  auditData
) => {
  try {
    await createAuditLog(
      auditData
    );
  } catch (auditError) {
    console.error(
      "Staff audit log error:",
      auditError
    );
  }
};

/*
|--------------------------------------------------------------------------
| School Scope
|--------------------------------------------------------------------------
*/

const getSchoolScope = (req) => {
  if (isSuperAdmin(req)) {
    const requestedSchoolId =
      normalizeText(
        req.query.schoolId
      );

    if (requestedSchoolId) {
      if (
        !isValidObjectId(
          requestedSchoolId
        )
      ) {
        return {
          error:
            "Invalid school ID format",
          statusCode: 400
        };
      }

      return {
        selectedSchoolId:
          requestedSchoolId,

        filter: {
          schoolId:
            requestedSchoolId
        },

        aggregateMatch: {
          schoolId:
            new mongoose.Types.ObjectId(
              requestedSchoolId
            )
        }
      };
    }

    return {
      selectedSchoolId: null,
      filter: {},
      aggregateMatch: {}
    };
  }

  const schoolId =
    getDocumentId(
      req.schoolFilter?.schoolId
    ) ||
    getUserSchoolId(req);

  if (!schoolId) {
    return {
      error:
        "School is not assigned to this user",
      statusCode: 403
    };
  }

  if (!isValidObjectId(schoolId)) {
    return {
      error:
        "Invalid school ID format",
      statusCode: 400
    };
  }

  return {
    selectedSchoolId: schoolId,

    filter: {
      schoolId
    },

    aggregateMatch: {
      schoolId:
        new mongoose.Types.ObjectId(
          schoolId
        )
    }
  };
};

/*
|--------------------------------------------------------------------------
| Resolve School for Create Staff
|--------------------------------------------------------------------------
*/

const resolveCreateSchoolId = (
  req
) => {
  if (isSuperAdmin(req)) {
    return normalizeText(
      req.body.schoolId
    );
  }

  return (
    getDocumentId(
      req.schoolFilter?.schoolId
    ) ||
    getUserSchoolId(req)
  );
};

/*
|--------------------------------------------------------------------------
| Populate Staff
|--------------------------------------------------------------------------
*/

const populateStaff = (query) => {
  return query
    .populate(
      "schoolId",
      "schoolName type isActive"
    )
    .populate(
      "userId",
      "name email phone role isActive"
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
    );
};

/*
|--------------------------------------------------------------------------
| Staff Audit Snapshot
|--------------------------------------------------------------------------
*/

const getStaffAuditSnapshot = (
  staff
) => {
  if (!staff) {
    return null;
  }

  return {
    staffId: staff._id,
    schoolId: staff.schoolId,
    userId: staff.userId,
    employeeId: staff.employeeId,
    name: staff.name,
    fatherName: staff.fatherName,
    email: staff.email,
    phone: staff.phone,
    cnic: staff.cnic,
    gender: staff.gender,
    category: staff.category,
    department: staff.department,
    designation: staff.designation,
    employmentType:
      staff.employmentType,
    joiningDate:
      staff.joiningDate,
    basicSalary:
      staff.basicSalary,
    allowances:
      staff.allowances,
    deductions:
      staff.deductions,
    status: staff.status
  };
};

/*
|--------------------------------------------------------------------------
| Normalize Staff Payload
|--------------------------------------------------------------------------
*/

const buildStaffPayload = (
  body = {}
) => {
  const allowedFields = [
    "userId",
    "employeeId",
    "name",
    "fatherName",
    "email",
    "phone",
    "alternatePhone",
    "cnic",
    "gender",
    "dateOfBirth",
    "maritalStatus",
    "address",
    "city",
    "staffPhoto",
    "category",
    "department",
    "designation",
    "employmentType",
    "joiningDate",
    "contractEndDate",
    "shift",
    "qualification",
    "experienceYears",
    "basicSalary",
    "allowances",
    "deductions",
    "bankName",
    "accountTitle",
    "accountNumber",
    "iban",
    "emergencyContact",
    "documents",
    "status",
    "leavingDate",
    "leavingReason",
    "notes"
  ];

  const payload = {};

  allowedFields.forEach((field) => {
    if (
      body[field] !== undefined
    ) {
      payload[field] =
        body[field];
    }
  });

  if (
    payload.userId !== undefined
  ) {
    payload.userId =
      normalizeOptionalObjectId(
        payload.userId
      );
  }

  const dateFields = [
    "dateOfBirth",
    "joiningDate",
    "contractEndDate",
    "leavingDate"
  ];

  dateFields.forEach((field) => {
    if (
      payload[field] !== undefined
    ) {
      payload[field] =
        normalizeOptionalDate(
          payload[field]
        );
    }
  });

  const numberFields = [
    "experienceYears",
    "basicSalary",
    "allowances",
    "deductions"
  ];

  numberFields.forEach((field) => {
    if (
      payload[field] !== undefined
    ) {
      payload[field] =
        safeNumber(
          payload[field]
        );
    }
  });

  if (
    payload.documents !== undefined &&
    !Array.isArray(
      payload.documents
    )
  ) {
    payload.documents = [];
  }

  if (
    payload.emergencyContact !==
      undefined &&
    (
      !payload.emergencyContact ||
      typeof payload.emergencyContact !==
        "object" ||
      Array.isArray(
        payload.emergencyContact
      )
    )
  ) {
    payload.emergencyContact =
      {};
  }

  return payload;
};

/*
|--------------------------------------------------------------------------
| Verify School
|--------------------------------------------------------------------------
*/

const verifySchool = async (
  schoolId
) => {
  if (!schoolId) {
    return {
      error:
        "School ID is required",
      statusCode: 400
    };
  }

  if (!isValidObjectId(schoolId)) {
    return {
      error:
        "Invalid school ID format",
      statusCode: 400
    };
  }

  const school =
    await School.findOne({
      _id: schoolId,

      isDeleted: {
        $ne: true
      }
    });

  if (!school) {
    return {
      error: "School not found",
      statusCode: 404
    };
  }

  if (!school.isActive) {
    return {
      error:
        "Staff cannot be created for an inactive school",
      statusCode: 403
    };
  }

  return {
    school
  };
};

/*
|--------------------------------------------------------------------------
| Verify Linked User Account
|--------------------------------------------------------------------------
*/

const verifyLinkedUser = async ({
  userId,
  schoolId,
  currentStaffId = null
}) => {
  if (!userId) {
    return {
      user: null
    };
  }

  if (!isValidObjectId(userId)) {
    return {
      error:
        "Invalid linked user ID format",
      statusCode: 400
    };
  }

  const user = await User.findById(
    userId
  );

  if (!user) {
    return {
      error:
        "Linked user account was not found",
      statusCode: 404
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Only Non-Teaching Login Account
  |--------------------------------------------------------------------------
  |
  | موجودہ User roles میں non-teaching login account کے لیے accountant
  | role موجود ہے۔ Driver، guard اور دوسرے staff کے لیے userId خالی رہے گا۔
  |
  */

  if (user.role !== "accountant") {
    return {
      error:
        "Only an accountant user account can currently be linked with a staff profile",
      statusCode: 400
    };
  }

  const userSchoolId =
    getDocumentId(user.schoolId);

  if (
    !userSchoolId ||
    userSchoolId !==
      String(schoolId)
  ) {
    return {
      error:
        "The linked user account must belong to the same school",
      statusCode: 403
    };
  }

  const existingStaffFilter = {
    userId
  };

  if (currentStaffId) {
    existingStaffFilter._id = {
      $ne: currentStaffId
    };
  }

  const linkedStaff =
    await Staff.findOne(
      existingStaffFilter
    );

  if (linkedStaff) {
    return {
      error: linkedStaff.isDeleted
        ? "This user account is linked with a deleted staff profile. Restore that profile first."
        : "This user account is already linked with another staff profile",
      statusCode: 400
    };
  }

  return {
    user
  };
};

/*
|--------------------------------------------------------------------------
| Build Staff Filter
|--------------------------------------------------------------------------
*/

const buildStaffFilter = (
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
  | Status
  |--------------------------------------------------------------------------
  */

  if (req.query.status) {
    const status =
      normalizeText(
        req.query.status
      ).toLowerCase();

    if (
      !STAFF_STATUSES.includes(
        status
      )
    ) {
      return {
        error:
          "Invalid staff status",
        statusCode: 400
      };
    }

    filter.status = status;
  }

  /*
  |--------------------------------------------------------------------------
  | Category
  |--------------------------------------------------------------------------
  */

  if (req.query.category) {
    const category =
      normalizeText(
        req.query.category
      ).toLowerCase();

    if (
      !STAFF_CATEGORIES.includes(
        category
      )
    ) {
      return {
        error:
          "Invalid staff category",
        statusCode: 400
      };
    }

    filter.category = category;
  }

  /*
  |--------------------------------------------------------------------------
  | Employment Type
  |--------------------------------------------------------------------------
  */

  if (
    req.query.employmentType
  ) {
    const employmentType =
      normalizeText(
        req.query.employmentType
      ).toLowerCase();

    if (
      !EMPLOYMENT_TYPES.includes(
        employmentType
      )
    ) {
      return {
        error:
          "Invalid employment type",
        statusCode: 400
      };
    }

    filter.employmentType =
      employmentType;
  }

  /*
  |--------------------------------------------------------------------------
  | Gender
  |--------------------------------------------------------------------------
  */

  if (req.query.gender) {
    const gender =
      normalizeText(
        req.query.gender
      ).toLowerCase();

    if (
      !STAFF_GENDERS.includes(
        gender
      )
    ) {
      return {
        error:
          "Invalid gender filter",
        statusCode: 400
      };
    }

    filter.gender = gender;
  }

  /*
  |--------------------------------------------------------------------------
  | Department
  |--------------------------------------------------------------------------
  */

  if (req.query.department) {
    filter.department =
      new RegExp(
        `^${escapeRegex(
          normalizeText(
            req.query.department
          )
        )}$`,
        "i"
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Linked User
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
  | Has Login Account
  |--------------------------------------------------------------------------
  */

  if (
    req.query.hasUserAccount !==
    undefined
  ) {
    if (
      req.query.hasUserAccount !==
        "true" &&
      req.query.hasUserAccount !==
        "false"
    ) {
      return {
        error:
          "hasUserAccount must be true or false",
        statusCode: 400
      };
    }

    filter.userId =
      req.query.hasUserAccount ===
      "true"
        ? {
            $ne: null
          }
        : null;
  }

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  if (
    req.query.search &&
    normalizeText(
      req.query.search
    )
  ) {
    const searchRegex =
      new RegExp(
        escapeRegex(
          normalizeText(
            req.query.search
          )
        ),
        "i"
      );

    filter.$or = [
      {
        employeeId:
          searchRegex
      },
      {
        name: searchRegex
      },
      {
        fatherName:
          searchRegex
      },
      {
        email: searchRegex
      },
      {
        phone: searchRegex
      },
      {
        alternatePhone:
          searchRegex
      },
      {
        cnic: searchRegex
      },
      {
        department:
          searchRegex
      },
      {
        designation:
          searchRegex
      },
      {
        city: searchRegex
      }
    ];
  }

  return {
    filter,
    schoolScope
  };
};

/*
|--------------------------------------------------------------------------
| Get School-Wide Staff Summary
|--------------------------------------------------------------------------
*/

const fetchStaffSummary = async (
  aggregateMatch
) => {
  const summaryResult =
    await Staff.aggregate([
      {
        $match: {
          ...aggregateMatch,

          isDeleted: {
            $ne: true
          }
        }
      },
      {
        $group: {
          _id: null,

          totalStaff: {
            $sum: 1
          },

          activeStaff: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "active"
                  ]
                },
                1,
                0
              ]
            }
          },

          inactiveStaff: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "inactive"
                  ]
                },
                1,
                0
              ]
            }
          },

          onLeaveStaff: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "on_leave"
                  ]
                },
                1,
                0
              ]
            }
          },

          resignedStaff: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "resigned"
                  ]
                },
                1,
                0
              ]
            }
          },

          monthlyPayroll: {
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    {
                      $add: [
                        {
                          $ifNull: [
                            "$basicSalary",
                            0
                          ]
                        },
                        {
                          $ifNull: [
                            "$allowances",
                            0
                          ]
                        }
                      ]
                    },
                    {
                      $ifNull: [
                        "$deductions",
                        0
                      ]
                    }
                  ]
                }
              ]
            }
          }
        }
      }
    ]);

  return (
    summaryResult[0] || {
      totalStaff: 0,
      activeStaff: 0,
      inactiveStaff: 0,
      onLeaveStaff: 0,
      resignedStaff: 0,
      monthlyPayroll: 0
    }
  );
};

/*
|--------------------------------------------------------------------------
| Create Staff
|--------------------------------------------------------------------------
*/

exports.createStaff = async (
  req,
  res
) => {
  try {
    const schoolId =
      resolveCreateSchoolId(req);

    const schoolResult =
      await verifySchool(
        schoolId
      );

    if (schoolResult.error) {
      return res
        .status(
          schoolResult.statusCode
        )
        .json({
          success: false,
          message:
            schoolResult.error
        });
    }

    const payload =
      buildStaffPayload(
        req.body
      );

    /*
    |--------------------------------------------------------------------------
    | Basic Required Fields
    |--------------------------------------------------------------------------
    */

    const requiredFields = [
      {
        field: "employeeId",
        label: "Employee ID"
      },
      {
        field: "name",
        label: "Staff name"
      },
      {
        field: "phone",
        label: "Phone number"
      },
      {
        field: "gender",
        label: "Gender"
      },
      {
        field: "category",
        label: "Staff category"
      },
      {
        field: "department",
        label: "Department"
      },
      {
        field: "designation",
        label: "Designation"
      }
    ];

    const missingField =
      requiredFields.find(
        (item) =>
          !normalizeText(
            payload[item.field]
          )
      );

    if (missingField) {
      return res.status(400).json({
        success: false,

        message: `${missingField.label} is required`
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Linked User Validation
    |--------------------------------------------------------------------------
    */

    const linkedUserResult =
      await verifyLinkedUser({
        userId:
          payload.userId,
        schoolId
      });

    if (
      linkedUserResult.error
    ) {
      return res
        .status(
          linkedUserResult.statusCode
        )
        .json({
          success: false,

          message:
            linkedUserResult.error
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Create Staff Profile
    |--------------------------------------------------------------------------
    */

    const staff =
      await Staff.create({
        ...payload,
        schoolId,
        createdBy:
          req.user._id,
        updatedBy:
          req.user._id
      });

    const populatedStaff =
      await populateStaff(
        Staff.findById(
          staff._id
        )
      );

    await recordAuditLog({
      req,
      schoolId,
      action: "CREATE",
      module: "STAFF",
      recordId: staff._id,
      recordModel: "Staff",

      description: `${req.user.role} created staff profile: ${staff.name}`,

      newData:
        getStaffAuditSnapshot(
          staff
        ),

      status: "success"
    });

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Staff member created successfully",

        staff:
          populatedStaff
      });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to create staff member"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Active Staff List
|--------------------------------------------------------------------------
*/

exports.getStaff = async (
  req,
  res
) => {
  try {
    const filterResult =
      buildStaffFilter(req, {
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
      filter,
      schoolScope
    } = filterResult;

    const {
      page,
      limit,
      skip
    } = getPaginationOptions(
      req.query
    );

    const [
      staff,
      total,
      summary
    ] = await Promise.all([
      populateStaff(
        Staff.find(filter)
      )
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit),

      Staff.countDocuments(
        filter
      ),

      fetchStaffSummary(
        schoolScope.aggregateMatch
      )
    ]);

    return res.status(200).json({
      success: true,
      count: staff.length,
      staff,
      summary,

      pagination:
        buildPagination({
          total,
          page,
          limit
        })
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to fetch staff members"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Staff Summary
|--------------------------------------------------------------------------
*/

exports.getStaffSummary =
  async (req, res) => {
    try {
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

      const summary =
        await fetchStaffSummary(
          schoolScope.aggregateMatch
        );

      return res.status(200).json({
        success: true,
        summary
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch staff summary"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Staff
|--------------------------------------------------------------------------
*/

exports.getDeletedStaff =
  async (req, res) => {
    try {
      const filterResult =
        buildStaffFilter(req, {
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

      const {
        page,
        limit,
        skip
      } = getPaginationOptions(
        req.query
      );

      const [
        staff,
        total
      ] = await Promise.all([
        populateStaff(
          Staff.find(filter)
        )
          .sort({
            deletedAt: -1,
            createdAt: -1
          })
          .skip(skip)
          .limit(limit),

        Staff.countDocuments(
          filter
        )
      ]);

      return res.status(200).json({
        success: true,
        count: staff.length,
        staff,

        pagination:
          buildPagination({
            total,
            page,
            limit
          })
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch deleted staff members"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Staff Member by ID
|--------------------------------------------------------------------------
*/

exports.getStaffById =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid staff ID format"
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

      const staff =
        await populateStaff(
          Staff.findOne({
            _id: req.params.id,
            ...schoolScope.filter,

            isDeleted: {
              $ne: true
            }
          })
        );

      if (!staff) {
        return res.status(404).json({
          success: false,

          message:
            "Staff member not found or access is not allowed"
        });
      }

      return res.status(200).json({
        success: true,
        staff
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch staff member"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Update Staff Member
|--------------------------------------------------------------------------
*/

exports.updateStaff = async (
  req,
  res
) => {
  try {
    if (
      !isValidObjectId(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid staff ID format"
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

    const staff =
      await Staff.findOne({
        _id: req.params.id,
        ...schoolScope.filter,

        isDeleted: {
          $ne: true
        }
      });

    if (!staff) {
      return res.status(404).json({
        success: false,

        message:
          "Staff member not found or access is not allowed"
      });
    }

    const oldData =
      getStaffAuditSnapshot(
        staff
      );

    const payload =
      buildStaffPayload(
        req.body
      );

    /*
    |--------------------------------------------------------------------------
    | Prevent School Change
    |--------------------------------------------------------------------------
    */

    delete payload.schoolId;
    delete payload.createdBy;
    delete payload.updatedBy;
    delete payload.isDeleted;
    delete payload.deletedAt;
    delete payload.deletedBy;

    /*
    |--------------------------------------------------------------------------
    | Validate Updated Linked User
    |--------------------------------------------------------------------------
    */

    if (
      payload.userId !==
      undefined
    ) {
      const linkedUserResult =
        await verifyLinkedUser({
          userId:
            payload.userId,

          schoolId:
            getDocumentId(
              staff.schoolId
            ),

          currentStaffId:
            staff._id
        });

      if (
        linkedUserResult.error
      ) {
        return res
          .status(
            linkedUserResult.statusCode
          )
          .json({
            success: false,

            message:
              linkedUserResult.error
          });
      }
    }

    Object.entries(
      payload
    ).forEach(
      ([field, value]) => {
        staff[field] = value;
      }
    );

    staff.updatedBy =
      req.user._id;

    await staff.save();

    const populatedStaff =
      await populateStaff(
        Staff.findById(
          staff._id
        )
      );

    await recordAuditLog({
      req,
      schoolId:
        staff.schoolId,
      action: "UPDATE",
      module: "STAFF",
      recordId: staff._id,
      recordModel: "Staff",

      description: `${req.user.role} updated staff profile: ${staff.name}`,

      oldData,

      newData:
        getStaffAuditSnapshot(
          staff
        ),

      status: "success"
    });

    return res.status(200).json({
      success: true,

      message:
        "Staff member updated successfully",

      staff:
        populatedStaff
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to update staff member"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Update Staff Status
|--------------------------------------------------------------------------
*/

exports.updateStaffStatus =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid staff ID format"
        });
      }

      const status =
        normalizeText(
          req.body.status
        ).toLowerCase();

      if (
        !STAFF_STATUSES.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid staff status"
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

      const staff =
        await Staff.findOne({
          _id: req.params.id,
          ...schoolScope.filter,

          isDeleted: {
            $ne: true
          }
        });

      if (!staff) {
        return res.status(404).json({
          success: false,

          message:
            "Staff member not found or access is not allowed"
        });
      }

      const oldStatus =
        staff.status;

      staff.status = status;

      if (
        status === "resigned" ||
        status === "terminated"
      ) {
        staff.leavingDate =
          req.body.leavingDate ||
          new Date();

        staff.leavingReason =
          normalizeText(
            req.body.leavingReason
          );
      } else {
        staff.leavingDate =
          null;

        staff.leavingReason =
          "";
      }

      staff.updatedBy =
        req.user._id;

      await staff.save();

      const populatedStaff =
        await populateStaff(
          Staff.findById(
            staff._id
          )
        );

      await recordAuditLog({
        req,
        schoolId:
          staff.schoolId,
        action:
          "STATUS_CHANGE",
        module: "STAFF",
        recordId: staff._id,
        recordModel: "Staff",

        description: `${req.user.role} changed staff status from ${oldStatus} to ${status}: ${staff.name}`,

        oldData: {
          status: oldStatus
        },

        newData: {
          status:
            staff.status,
          leavingDate:
            staff.leavingDate,
          leavingReason:
            staff.leavingReason
        },

        status: "success"
      });

      return res.status(200).json({
        success: true,

        message:
          "Staff status updated successfully",

        staff:
          populatedStaff
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to update staff status"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Staff Member
|--------------------------------------------------------------------------
*/

exports.deleteStaff = async (
  req,
  res
) => {
  try {
    if (
      !isValidObjectId(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid staff ID format"
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

    const staff =
      await Staff.findOne({
        _id: req.params.id,
        ...schoolScope.filter,

        isDeleted: {
          $ne: true
        }
      });

    if (!staff) {
      return res.status(404).json({
        success: false,

        message:
          "Staff member not found or access is not allowed"
      });
    }

    const oldData =
      getStaffAuditSnapshot(
        staff
      );

    staff.isDeleted = true;
    staff.deletedAt =
      new Date();
    staff.deletedBy =
      req.user._id;
    staff.updatedBy =
      req.user._id;

    await staff.save();

    await recordAuditLog({
      req,
      schoolId:
        staff.schoolId,
      action: "DELETE",
      module: "STAFF",
      recordId: staff._id,
      recordModel: "Staff",

      description: `${req.user.role} deleted staff profile: ${staff.name}`,

      oldData,

      newData: {
        isDeleted: true,
        deletedAt:
          staff.deletedAt
      },

      status: "success"
    });

    return res.status(200).json({
      success: true,

      message:
        "Staff member deleted successfully"
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to delete staff member"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Restore Staff Member
|--------------------------------------------------------------------------
*/

exports.restoreStaff = async (
  req,
  res
) => {
  try {
    if (
      !isValidObjectId(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid staff ID format"
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

    const staff =
      await Staff.findOne({
        _id: req.params.id,
        ...schoolScope.filter,
        isDeleted: true
      });

    if (!staff) {
      return res.status(404).json({
        success: false,

        message:
          "Deleted staff member not found or access is not allowed"
      });
    }

    staff.isDeleted = false;
    staff.deletedAt = null;
    staff.deletedBy = null;
    staff.updatedBy =
      req.user._id;

    await staff.save();

    const populatedStaff =
      await populateStaff(
        Staff.findById(
          staff._id
        )
      );

    await recordAuditLog({
      req,
      schoolId:
        staff.schoolId,
      action: "RESTORE",
      module: "STAFF",
      recordId: staff._id,
      recordModel: "Staff",

      description: `${req.user.role} restored staff profile: ${staff.name}`,

      oldData: {
        isDeleted: true
      },

      newData: {
        isDeleted: false
      },

      status: "success"
    });

    return res.status(200).json({
      success: true,

      message:
        "Staff member restored successfully",

      staff:
        populatedStaff
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to restore staff member"
    );
  }
};