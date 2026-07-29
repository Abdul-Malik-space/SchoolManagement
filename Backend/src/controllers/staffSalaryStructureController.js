const mongoose = require(
  "mongoose"
);

const StaffSalaryStructure = require(
  "../models/StaffSalaryStructure"
);

const Staff = require(
  "../models/Staff"
);

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const isValidObjectId = (
  value
) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

const safeNumber = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

const nonNegativeNumber = (
  value
) => {
  return Math.max(
    0,
    safeNumber(value)
  );
};

const roundMoney = (
  value
) => {
  return Number(
    safeNumber(value).toFixed(
      2
    )
  );
};

const escapeRegex = (
  value
) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const getUserId = (
  req
) => {
  return (
    req.user?._id ||
    req.user?.id ||
    null
  );
};

const getUserRole = (
  req
) => {
  return String(
    req.user?.role || ""
  ).toLowerCase();
};

const getObjectIdValue = (
  value
) => {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object"
  ) {
    return (
      value._id ||
      value.id ||
      null
    );
  }

  return value;
};

/*
|--------------------------------------------------------------------------
| School Scope Helpers
|--------------------------------------------------------------------------
*/

const getAssignedSchoolId = (
  req
) => {
  return getObjectIdValue(
    req.user?.schoolId
  ) ||
    getObjectIdValue(
      req.user?.school
    ) ||
    getObjectIdValue(
      req.schoolId
    ) ||
    getObjectIdValue(
      req.schoolFilter
        ?.schoolId
    ) ||
    getObjectIdValue(
      req.schoolFilter
    );
};

const getRequestedSchoolId = (
  req
) => {
  return (
    req.body?.schoolId ||
    req.query?.schoolId ||
    null
  );
};

const resolveSchoolId = (
  req
) => {
  const role =
    getUserRole(req);

  if (
    role === "super_admin"
  ) {
    return (
      getRequestedSchoolId(
        req
      ) || null
    );
  }

  return (
    getAssignedSchoolId(req) ||
    null
  );
};

const buildSchoolFilter = (
  req
) => {
  const role =
    getUserRole(req);

  if (
    role === "super_admin"
  ) {
    const requestedSchoolId =
      getRequestedSchoolId(
        req
      );

    return requestedSchoolId
      ? {
          schoolId:
            requestedSchoolId
        }
      : {};
  }

  const schoolId =
    getAssignedSchoolId(req);

  if (!schoolId) {
    const error =
      new Error(
        "Assigned school could not be determined."
      );

    error.statusCode = 403;

    throw error;
  }

  return {
    schoolId
  };
};

/*
|--------------------------------------------------------------------------
| Component Calculation Helpers
|--------------------------------------------------------------------------
*/

const getComponentAmount = (
  component,
  basicSalary,
  grossSalary
) => {
  if (
    component === null ||
    component === undefined ||
    component === ""
  ) {
    return 0;
  }

  if (
    typeof component ===
      "number" ||
    typeof component ===
      "string"
  ) {
    return nonNegativeNumber(
      component
    );
  }

  const type =
    String(
      component.type ||
      component.deductionType ||
      "fixed"
    ).toLowerCase();

  const value =
    nonNegativeNumber(
      component.value ??
      component.amount ??
      component.rate
    );

  if (
    type === "percentage"
  ) {
    const percentageOf =
      component.percentageOf ===
      "gross_salary"
        ? grossSalary
        : basicSalary;

    return (
      percentageOf *
      value /
      100
    );
  }

  return value;
};

const calculateSalaryData = (
  payload = {}
) => {
  const basicSalary =
    nonNegativeNumber(
      payload.basicSalary
    );

  const allowances =
    payload.allowances || {};

  const allowanceKeys = [
    "houseRent",
    "medical",
    "transport",
    "food",
    "communication",
    "special"
  ];

  const allowanceBreakdown =
    {};

  allowanceKeys.forEach(
    (key) => {
      allowanceBreakdown[key] =
        getComponentAmount(
          allowances[key],
          basicSalary,
          basicSalary
        );
    }
  );

  const otherAllowances =
    Array.isArray(
      allowances.other
    )
      ? allowances.other.map(
          (item) => ({
            ...item,

            amount:
              getComponentAmount(
                item,
                basicSalary,
                basicSalary
              )
          })
        )
      : [];

  const otherAllowancesTotal =
    otherAllowances.reduce(
      (
        total,
        item
      ) =>
        total +
        nonNegativeNumber(
          item.amount
        ),
      0
    );

  const allowancesTotal =
    Object.values(
      allowanceBreakdown
    ).reduce(
      (
        total,
        amount
      ) =>
        total +
        nonNegativeNumber(
          amount
        ),
      0
    ) +
    otherAllowancesTotal;

  const grossSalary =
    basicSalary +
    allowancesTotal;

  const deductions =
    payload.deductions || {};

  const deductionKeys = [
    "providentFund",
    "tax",
    "insurance",
    "loanInstallment"
  ];

  const deductionBreakdown =
    {};

  deductionKeys.forEach(
    (key) => {
      deductionBreakdown[key] =
        getComponentAmount(
          deductions[key],
          basicSalary,
          grossSalary
        );
    }
  );

  const otherDeductions =
    Array.isArray(
      deductions.other
    )
      ? deductions.other.map(
          (item) => ({
            ...item,

            calculatedAmount:
              getComponentAmount(
                item,
                basicSalary,
                grossSalary
              )
          })
        )
      : [];

  const otherDeductionsTotal =
    otherDeductions.reduce(
      (
        total,
        item
      ) =>
        total +
        nonNegativeNumber(
          item.calculatedAmount
        ),
      0
    );

  const deductionsTotal =
    Object.values(
      deductionBreakdown
    ).reduce(
      (
        total,
        amount
      ) =>
        total +
        nonNegativeNumber(
          amount
        ),
      0
    ) +
    otherDeductionsTotal;

  const estimatedNetSalary =
    Math.max(
      0,
      grossSalary -
      deductionsTotal
    );

  const fixedWorkingDays =
    Math.min(
      31,
      Math.max(
        1,
        safeNumber(
          payload.fixedWorkingDays ||
          26
        )
      )
    );

  const dailyRateBasis =
    payload.dailyRateBasis ===
    "gross_salary"
      ? grossSalary
      : basicSalary;

  const dailySalaryRate =
    dailyRateBasis /
    fixedWorkingDays;

  const workingHoursPerDay =
    Math.max(
      1,
      safeNumber(
        payload.workingHoursPerDay ||
        8
      )
    );

  const hourlySalaryRate =
    dailySalaryRate /
    workingHoursPerDay;

  const overtimeRules =
    payload.overtimeRules ||
    {};

  let overtimeHourlyRate =
    0;

  if (
    overtimeRules.enabled
  ) {
    const rateMethod =
      overtimeRules.rateMethod ||
      overtimeRules.calculationMethod ||
      "salary_multiplier";

    if (
      rateMethod ===
      "fixed_per_hour"
    ) {
      overtimeHourlyRate =
        nonNegativeNumber(
          overtimeRules.fixedHourlyRate
        );
    } else if (
      rateMethod ===
      "hourly_rate"
    ) {
      overtimeHourlyRate =
        hourlySalaryRate;
    } else {
      overtimeHourlyRate =
        hourlySalaryRate *
        nonNegativeNumber(
          overtimeRules.multiplier ||
          overtimeRules.rateMultiplier ||
          1.5
        );
    }
  }

  return {
    currency:
      payload.currency ||
      "PKR",

    basicSalary:
      roundMoney(
        basicSalary
      ),

    allowances: {
      ...allowanceBreakdown,

      other:
        otherAllowances,

      total:
        roundMoney(
          allowancesTotal
        )
    },

    grossSalary:
      roundMoney(
        grossSalary
      ),

    deductions: {
      ...deductionBreakdown,

      other:
        otherDeductions,

      total:
        roundMoney(
          deductionsTotal
        )
    },

    estimatedNetSalary:
      roundMoney(
        estimatedNetSalary
      ),

    rates: {
      fixedWorkingDays,

      dailySalaryRate:
        roundMoney(
          dailySalaryRate
        ),

      hourlySalaryRate:
        roundMoney(
          hourlySalaryRate
        ),

      overtimeHourlyRate:
        roundMoney(
          overtimeHourlyRate
        )
    }
  };
};

/*
|--------------------------------------------------------------------------
| Nested Payload Merger
|--------------------------------------------------------------------------
*/

const mergeNestedPayload = (
  existing,
  updates
) => {
  const nestedFields = [
    "allowances",
    "deductions",
    "attendanceRules",
    "lateRules",
    "overtimeRules",
    "bankDetails"
  ];

  const result = {
    ...updates
  };

  nestedFields.forEach(
    (field) => {
      if (
        updates[field] !==
        undefined
      ) {
        result[field] = {
          ...(
            existing[field]
              ?.toObject?.() ||
            existing[field] ||
            {}
          ),

          ...updates[field]
        };
      }
    }
  );

  return result;
};

/*
|--------------------------------------------------------------------------
| Document Formatter
|--------------------------------------------------------------------------
*/

const formatStructureDocument = (
  document
) => {
  if (!document) {
    return null;
  }

  const structure =
    typeof document.toObject ===
    "function"
      ? document.toObject({
          virtuals: true
        })
      : document;

  return {
    ...structure,

    calculation:
      calculateSalaryData(
        structure
      )
  };
};

/*
|--------------------------------------------------------------------------
| Staff Validator
|--------------------------------------------------------------------------
*/

const findScopedStaff = async (
  req,
  staffId
) => {
  if (
    !staffId ||
    !isValidObjectId(
      staffId
    )
  ) {
    const error =
      new Error(
        "A valid staff member is required."
      );

    error.statusCode = 400;

    throw error;
  }

  const schoolFilter =
    buildSchoolFilter(req);

  const filter = {
    _id: staffId,
    isDeleted: {
      $ne: true
    },
    ...schoolFilter
  };

  const staff =
    await Staff.findOne(
      filter
    );

  if (!staff) {
    const error =
      new Error(
        "Staff member was not found in the selected school."
      );

    error.statusCode = 404;

    throw error;
  }

  return staff;
};

/*
|--------------------------------------------------------------------------
| Preview Salary Structure
|--------------------------------------------------------------------------
*/

const previewSalaryStructure =
  async (req, res) => {
    try {
      const calculation =
        calculateSalaryData(
          req.body || {}
        );

      return res.status(
        200
      ).json({
        success: true,

        message:
          "Salary calculation preview generated successfully.",

        calculation
      });
    } catch (error) {
      return res.status(
        error.statusCode ||
        500
      ).json({
        success: false,

        message:
          error.message ||
          "Salary calculation preview could not be generated."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Create Salary Structure
|--------------------------------------------------------------------------
*/

const createSalaryStructure =
  async (req, res) => {
    try {
      const staff =
        await findScopedStaff(
          req,
          req.body.staffId
        );

      const staffSchoolId =
        getObjectIdValue(
          staff.schoolId
        );

      const existingStructure =
        await StaffSalaryStructure.findOne(
          {
            schoolId:
              staffSchoolId,

            staffId:
              staff._id,

            isDeleted: {
              $ne: true
            },

            status:
              "active"
          }
        );

      if (
        existingStructure
      ) {
        return res.status(
          409
        ).json({
          success: false,

          message:
            "This staff member already has an active salary structure."
        });
      }

      const payload = {
        ...req.body,

        schoolId:
          staffSchoolId,

        staffId:
          staff._id,

        employeeIdSnapshot:
          staff.employeeId ||
          "",

        staffNameSnapshot:
          staff.name ||
          "",

        departmentSnapshot:
          staff.department ||
          "",

        designationSnapshot:
          staff.designation ||
          "",

        currency:
          String(
            req.body.currency ||
            "PKR"
          ).toUpperCase(),

        basicSalary:
          nonNegativeNumber(
            req.body.basicSalary
          ),

        createdBy:
          getUserId(req),

        updatedBy:
          getUserId(req),

        isDeleted: false,

        deletedAt: null,
        deletedBy: null
      };

      const salaryStructure =
        await StaffSalaryStructure.create(
          payload
        );

      const populatedStructure =
        await StaffSalaryStructure.findById(
          salaryStructure._id
        )
          .populate(
            "staffId",
            "name employeeId department designation phone email photo status"
          )
          .populate(
            "schoolId",
            "schoolName schoolCode name type isActive"
          )
          .populate(
            "createdBy",
            "name email role"
          )
          .populate(
            "updatedBy",
            "name email role"
          );

      return res.status(
        201
      ).json({
        success: true,

        message:
          "Salary structure created successfully.",

        salaryStructure:
          formatStructureDocument(
            populatedStructure
          ),

        calculation:
          calculateSalaryData(
            salaryStructure.toObject()
          )
      });
    } catch (error) {
      if (
        error?.code ===
        11000
      ) {
        return res.status(
          409
        ).json({
          success: false,

          message:
            "This staff member already has an active salary structure."
        });
      }

      return res.status(
        error.statusCode ||
        500
      ).json({
        success: false,

        message:
          error.message ||
          "Salary structure could not be created."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Salary Structures
|--------------------------------------------------------------------------
*/

const getSalaryStructures =
  async (req, res) => {
    try {
      const schoolFilter =
        buildSchoolFilter(req);

      const page =
        Math.max(
          1,
          safeNumber(
            req.query.page ||
            1
          )
        );

      const limit =
        Math.min(
          100,
          Math.max(
            1,
            safeNumber(
              req.query.limit ||
              10
            )
          )
        );

      const skip =
        (page - 1) *
        limit;

      const filter = {
        ...schoolFilter,

        isDeleted: {
          $ne: true
        }
      };

      if (
        req.query.staffId &&
        isValidObjectId(
          req.query.staffId
        )
      ) {
        filter.staffId =
          req.query.staffId;
      }

      if (
        req.query.status
      ) {
        filter.status =
          req.query.status;
      }

      if (
        req.query.department
      ) {
        filter.departmentSnapshot = {
          $regex:
            escapeRegex(
              req.query.department
            ),

          $options: "i"
        };
      }

      if (
        req.query.calculationBasis
      ) {
        filter.calculationBasis =
          req.query.calculationBasis;
      }

      if (
        req.query.paymentMethod
      ) {
        filter.paymentMethod =
          req.query.paymentMethod;
      }

      if (
        req.query.currency
      ) {
        filter.currency =
          String(
            req.query.currency
          ).toUpperCase();
      }

      if (
        req.query.search
      ) {
        const searchRegex =
          new RegExp(
            escapeRegex(
              req.query.search
            ),
            "i"
          );

        filter.$or = [
          {
            staffNameSnapshot:
              searchRegex
          },
          {
            employeeIdSnapshot:
              searchRegex
          },
          {
            departmentSnapshot:
              searchRegex
          },
          {
            designationSnapshot:
              searchRegex
          }
        ];
      }

      const allowedSortFields = [
        "createdAt",
        "updatedAt",
        "basicSalary",
        "effectiveFrom",
        "status",
        "staffNameSnapshot",
        "departmentSnapshot"
      ];

      const sortBy =
        allowedSortFields.includes(
          req.query.sortBy
        )
          ? req.query.sortBy
          : "createdAt";

      const sortOrder =
        req.query.sortOrder ===
        "asc"
          ? 1
          : -1;

      const [
        structures,
        total,
        allMatchingStructures
      ] = await Promise.all([
        StaffSalaryStructure.find(
          filter
        )
          .populate(
            "staffId",
            "name employeeId department designation phone email photo status"
          )
          .populate(
            "schoolId",
            "schoolName schoolCode name type isActive"
          )
          .sort({
            [sortBy]:
              sortOrder
          })
          .skip(skip)
          .limit(limit),

        StaffSalaryStructure.countDocuments(
          filter
        ),

        StaffSalaryStructure.find(
          filter
        ).select(
          "basicSalary allowances deductions fixedWorkingDays dailyRateBasis overtimeRules currency status"
        )
      ]);

      const formattedStructures =
        structures.map(
          (structure) =>
            formatStructureDocument(
              structure
            )
        );

      const summary =
        allMatchingStructures.reduce(
          (
            result,
            structure
          ) => {
            const calculation =
              calculateSalaryData(
                structure.toObject()
              );

            result.totalStructures +=
              1;

            if (
              structure.status ===
              "active"
            ) {
              result.active += 1;
            } else {
              result.inactive +=
                1;
            }

            result.totalBasicSalary +=
              calculation.basicSalary;

            result.totalGrossSalary +=
              calculation.grossSalary;

            result.totalEstimatedNetSalary +=
              calculation.estimatedNetSalary;

            return result;
          },
          {
            totalStructures: 0,
            active: 0,
            inactive: 0,
            totalBasicSalary: 0,
            totalGrossSalary: 0,
            totalEstimatedNetSalary:
              0
          }
        );

      Object.keys(
        summary
      ).forEach((key) => {
        if (
          key.startsWith(
            "total"
          ) &&
          key !==
            "totalStructures"
        ) {
          summary[key] =
            roundMoney(
              summary[key]
            );
        }
      });

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            total / limit
          )
        );

      return res.status(
        200
      ).json({
        success: true,

        salaryStructures:
          formattedStructures,

        summary,

        pagination: {
          total,
          page,
          currentPage: page,
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
      return res.status(
        error.statusCode ||
        500
      ).json({
        success: false,

        message:
          error.message ||
          "Salary structures could not be loaded."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Salary Structure by ID
|--------------------------------------------------------------------------
*/

const getSalaryStructureById =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(
          400
        ).json({
          success: false,

          message:
            "Invalid salary structure ID."
        });
      }

      const schoolFilter =
        buildSchoolFilter(req);

      const structure =
        await StaffSalaryStructure.findOne(
          {
            _id:
              req.params.id,

            isDeleted: {
              $ne: true
            },

            ...schoolFilter
          }
        )
          .populate(
            "staffId",
            "name employeeId department designation phone email photo status joiningDate category"
          )
          .populate(
            "schoolId",
            "schoolName schoolCode name type isActive logo address phone email"
          )
          .populate(
            "createdBy",
            "name email role"
          )
          .populate(
            "updatedBy",
            "name email role"
          );

      if (!structure) {
        return res.status(
          404
        ).json({
          success: false,

          message:
            "Salary structure was not found."
        });
      }

      const calculation =
        calculateSalaryData(
          structure.toObject()
        );

      return res.status(
        200
      ).json({
        success: true,

        salaryStructure:
          formatStructureDocument(
            structure
          ),

        calculation
      });
    } catch (error) {
      return res.status(
        error.statusCode ||
        500
      ).json({
        success: false,

        message:
          error.message ||
          "Salary structure could not be loaded."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Salary Structure by Staff ID
|--------------------------------------------------------------------------
*/

const getSalaryStructureByStaff =
  async (req, res) => {
    try {
      const {
        staffId
      } = req.params;

      if (
        !isValidObjectId(
          staffId
        )
      ) {
        return res.status(
          400
        ).json({
          success: false,

          message:
            "Invalid staff ID."
        });
      }

      const schoolFilter =
        buildSchoolFilter(req);

      const filter = {
        staffId,

        isDeleted: {
          $ne: true
        },

        ...schoolFilter
      };

      if (
        req.query.status
      ) {
        filter.status =
          req.query.status;
      } else {
        filter.status =
          "active";
      }

      const structure =
        await StaffSalaryStructure.findOne(
          filter
        )
          .populate(
            "staffId",
            "name employeeId department designation phone email photo status"
          )
          .populate(
            "schoolId",
            "schoolName schoolCode name type isActive"
          )
          .sort({
            effectiveFrom: -1,
            createdAt: -1
          });

      if (!structure) {
        return res.status(
          404
        ).json({
          success: false,

          message:
            "No active salary structure was found for this staff member."
        });
      }

      return res.status(
        200
      ).json({
        success: true,

        salaryStructure:
          formatStructureDocument(
            structure
          ),

        calculation:
          calculateSalaryData(
            structure.toObject()
          )
      });
    } catch (error) {
      return res.status(
        error.statusCode ||
        500
      ).json({
        success: false,

        message:
          error.message ||
          "Staff salary structure could not be loaded."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Update Salary Structure
|--------------------------------------------------------------------------
*/

const updateSalaryStructure =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(
          400
        ).json({
          success: false,

          message:
            "Invalid salary structure ID."
        });
      }

      const schoolFilter =
        buildSchoolFilter(req);

      const structure =
        await StaffSalaryStructure.findOne(
          {
            _id:
              req.params.id,

            isDeleted: {
              $ne: true
            },

            ...schoolFilter
          }
        );

      if (!structure) {
        return res.status(
          404
        ).json({
          success: false,

          message:
            "Salary structure was not found."
        });
      }

      const protectedFields = [
        "_id",
        "schoolId",
        "staffId",
        "createdBy",
        "createdAt",
        "isDeleted",
        "deletedAt",
        "deletedBy"
      ];

      const cleanUpdates = {
        ...req.body
      };

      protectedFields.forEach(
        (field) => {
          delete cleanUpdates[
            field
          ];
        }
      );

      if (
        cleanUpdates.currency
      ) {
        cleanUpdates.currency =
          String(
            cleanUpdates.currency
          ).toUpperCase();
      }

      if (
        cleanUpdates.basicSalary !==
        undefined
      ) {
        cleanUpdates.basicSalary =
          nonNegativeNumber(
            cleanUpdates.basicSalary
          );
      }

      const mergedUpdates =
        mergeNestedPayload(
          structure,
          cleanUpdates
        );

      Object.assign(
        structure,
        mergedUpdates,
        {
          updatedBy:
            getUserId(req)
        }
      );

      await structure.save();

      const populatedStructure =
        await StaffSalaryStructure.findById(
          structure._id
        )
          .populate(
            "staffId",
            "name employeeId department designation phone email photo status joiningDate category"
          )
          .populate(
            "schoolId",
            "schoolName schoolCode name type isActive logo address phone email"
          )
          .populate(
            "createdBy",
            "name email role"
          )
          .populate(
            "updatedBy",
            "name email role"
          );

      return res.status(
        200
      ).json({
        success: true,

        message:
          "Salary structure updated successfully.",

        salaryStructure:
          formatStructureDocument(
            populatedStructure
          ),

        calculation:
          calculateSalaryData(
            populatedStructure.toObject()
          )
      });
    } catch (error) {
      if (
        error?.code ===
        11000
      ) {
        return res.status(
          409
        ).json({
          success: false,

          message:
            "This staff member already has another active salary structure."
        });
      }

      return res.status(
        error.statusCode ||
        500
      ).json({
        success: false,

        message:
          error.message ||
          "Salary structure could not be updated."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Salary Structure
|--------------------------------------------------------------------------
*/

const deleteSalaryStructure =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(
          400
        ).json({
          success: false,

          message:
            "Invalid salary structure ID."
        });
      }

      const schoolFilter =
        buildSchoolFilter(req);

      const structure =
        await StaffSalaryStructure.findOne(
          {
            _id:
              req.params.id,

            isDeleted: {
              $ne: true
            },

            ...schoolFilter
          }
        );

      if (!structure) {
        return res.status(
          404
        ).json({
          success: false,

          message:
            "Salary structure was not found."
        });
      }

      structure.isDeleted =
        true;

      structure.deletedAt =
        new Date();

      structure.deletedBy =
        getUserId(req);

      structure.updatedBy =
        getUserId(req);

      await structure.save();

      return res.status(
        200
      ).json({
        success: true,

        message:
          "Salary structure deleted successfully."
      });
    } catch (error) {
      return res.status(
        error.statusCode ||
        500
      ).json({
        success: false,

        message:
          error.message ||
          "Salary structure could not be deleted."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Salary Structures
|--------------------------------------------------------------------------
*/

const getDeletedSalaryStructures =
  async (req, res) => {
    try {
      const schoolFilter =
        buildSchoolFilter(req);

      const page =
        Math.max(
          1,
          safeNumber(
            req.query.page ||
            1
          )
        );

      const limit =
        Math.min(
          100,
          Math.max(
            1,
            safeNumber(
              req.query.limit ||
              10
            )
          )
        );

      const skip =
        (page - 1) *
        limit;

      const filter = {
        ...schoolFilter,
        isDeleted: true
      };

      if (
        req.query.status
      ) {
        filter.status =
          req.query.status;
      }

      if (
        req.query.department
      ) {
        filter.departmentSnapshot = {
          $regex:
            escapeRegex(
              req.query.department
            ),

          $options: "i"
        };
      }

      if (
        req.query.calculationBasis
      ) {
        filter.calculationBasis =
          req.query.calculationBasis;
      }

      if (
        req.query.paymentMethod
      ) {
        filter.paymentMethod =
          req.query.paymentMethod;
      }

      if (
        req.query.search
      ) {
        const searchRegex =
          new RegExp(
            escapeRegex(
              req.query.search
            ),
            "i"
          );

        filter.$or = [
          {
            staffNameSnapshot:
              searchRegex
          },
          {
            employeeIdSnapshot:
              searchRegex
          },
          {
            departmentSnapshot:
              searchRegex
          },
          {
            designationSnapshot:
              searchRegex
          }
        ];
      }

      const [
        structures,
        total
      ] = await Promise.all([
        StaffSalaryStructure.find(
          filter
        )
          .populate(
            "staffId",
            "name employeeId department designation phone email photo status"
          )
          .populate(
            "schoolId",
            "schoolName schoolCode name type isActive"
          )
          .populate(
            "deletedBy",
            "name email role"
          )
          .sort({
            deletedAt: -1
          })
          .skip(skip)
          .limit(limit),

        StaffSalaryStructure.countDocuments(
          filter
        )
      ]);

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            total / limit
          )
        );

      return res.status(
        200
      ).json({
        success: true,

        salaryStructures:
          structures.map(
            (structure) =>
              formatStructureDocument(
                structure
              )
          ),

        pagination: {
          total,
          page,
          currentPage: page,
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
      return res.status(
        error.statusCode ||
        500
      ).json({
        success: false,

        message:
          error.message ||
          "Deleted salary structures could not be loaded."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Restore Salary Structure
|--------------------------------------------------------------------------
*/

const restoreSalaryStructure =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(
          400
        ).json({
          success: false,

          message:
            "Invalid salary structure ID."
        });
      }

      const schoolFilter =
        buildSchoolFilter(req);

      const structure =
        await StaffSalaryStructure.findOne(
          {
            _id:
              req.params.id,

            isDeleted: true,

            ...schoolFilter
          }
        );

      if (!structure) {
        return res.status(
          404
        ).json({
          success: false,

          message:
            "Deleted salary structure was not found."
        });
      }

      const duplicateStructure =
        await StaffSalaryStructure.findOne(
          {
            _id: {
              $ne:
                structure._id
            },

            schoolId:
              structure.schoolId,

            staffId:
              structure.staffId,

            status:
              "active",

            isDeleted: {
              $ne: true
            }
          }
        );

      if (
        duplicateStructure
      ) {
        return res.status(
          409
        ).json({
          success: false,

          message:
            "This staff member already has an active salary structure. Delete or deactivate it before restoring this record."
        });
      }

      structure.isDeleted =
        false;

      structure.deletedAt =
        null;

      structure.deletedBy =
        null;

      structure.updatedBy =
        getUserId(req);

      await structure.save();

      const populatedStructure =
        await StaffSalaryStructure.findById(
          structure._id
        )
          .populate(
            "staffId",
            "name employeeId department designation phone email photo status"
          )
          .populate(
            "schoolId",
            "schoolName schoolCode name type isActive"
          );

      return res.status(
        200
      ).json({
        success: true,

        message:
          "Salary structure restored successfully.",

        salaryStructure:
          formatStructureDocument(
            populatedStructure
          )
      });
    } catch (error) {
      if (
        error?.code ===
        11000
      ) {
        return res.status(
          409
        ).json({
          success: false,

          message:
            "This staff member already has an active salary structure."
        });
      }

      return res.status(
        error.statusCode ||
        500
      ).json({
        success: false,

        message:
          error.message ||
          "Salary structure could not be restored."
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  createSalaryStructure,
  getSalaryStructures,
  getSalaryStructureById,
  getSalaryStructureByStaff,
  previewSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
  getDeletedSalaryStructures,
  restoreSalaryStructure
};