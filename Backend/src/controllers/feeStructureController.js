const mongoose = require("mongoose");

const FeeStructure = require("../models/FeeStructure");
const School = require("../models/School");
const Class = require("../models/Class");

const {
  getPaginationOptions,
  buildPagination
} = require("../utils/pagination");

const {
  createAuditLog
} = require("../utils/auditLogHelper");

/*
|--------------------------------------------------------------------------
| Fee Fields
|--------------------------------------------------------------------------
*/

const FEE_FIELDS = [
  "monthlyFee",
  "admissionFee",
  "examFee",
  "transportFee",
  "otherFee"
];

/*
|--------------------------------------------------------------------------
| Basic Helpers
|--------------------------------------------------------------------------
*/

const isSuperAdmin = (req) => {
  return req.user?.role === "super_admin";
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

const isValidObjectId = (value) => {
  return (
    Boolean(value) &&
    mongoose.Types.ObjectId.isValid(
      value
    )
  );
};

const escapeRegex = (value = "") => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const getPlainData = (document) => {
  if (!document) {
    return null;
  }

  if (
    typeof document.toObject ===
    "function"
  ) {
    return document.toObject({
      virtuals: true
    });
  }

  return document;
};

/*
|--------------------------------------------------------------------------
| Boolean Parser
|--------------------------------------------------------------------------
*/

const parseBoolean = (
  value,
  defaultValue = false
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

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

  return defaultValue;
};

/*
|--------------------------------------------------------------------------
| School Scope Helpers
|--------------------------------------------------------------------------
*/

const getSchoolFilter = (req) => {
  if (isSuperAdmin(req)) {
    return {};
  }

  if (
    req.schoolFilter &&
    Object.keys(
      req.schoolFilter
    ).length > 0
  ) {
    return {
      ...req.schoolFilter
    };
  }

  const schoolId =
    getUserSchoolId(req);

  if (!schoolId) {
    return {
      schoolId: null
    };
  }

  return {
    schoolId
  };
};

const getCreateSchoolId = (req) => {
  if (isSuperAdmin(req)) {
    return req.body.schoolId;
  }

  return getUserSchoolId(req);
};

const getScopedFilter = (
  req,
  extraFilter = {}
) => {
  return {
    ...getSchoolFilter(req),
    ...extraFilter
  };
};

/*
|--------------------------------------------------------------------------
| Fee Calculation
|--------------------------------------------------------------------------
*/

const calculateTotalFee = (
  feeStructure
) => {
  return FEE_FIELDS.reduce(
    (total, field) => {
      return (
        total +
        Number(
          feeStructure?.[field] ||
            0
        )
      );
    },
    0
  );
};

/*
|--------------------------------------------------------------------------
| Normalize Fee Values
|--------------------------------------------------------------------------
*/

const normalizeFeeValues = (
  source,
  partial = false
) => {
  const values = {};

  for (const field of FEE_FIELDS) {
    if (
      partial &&
      source[field] === undefined
    ) {
      continue;
    }

    const rawValue =
      source[field];

    const numericValue =
      rawValue === "" ||
      rawValue === undefined ||
      rawValue === null
        ? 0
        : Number(rawValue);

    if (
      Number.isNaN(
        numericValue
      ) ||
      numericValue < 0
    ) {
      return {
        error:
          `${field} must be a valid non-negative number`
      };
    }

    values[field] =
      numericValue;
  }

  return {
    values
  };
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
  if (
    error.name ===
    "ValidationError"
  ) {
    return res.status(400).json({
      success: false,

      message: Object.values(
        error.errors
      )
        .map(
          (item) =>
            item.message
        )
        .join(", ")
    });
  }

  if (
    error.name ===
    "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid ID format"
    });
  }

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,

      message:
        "A fee structure already exists for this class and session year"
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
| Verify School Access
|--------------------------------------------------------------------------
*/

const verifySchoolAccess = async (
  req,
  schoolId
) => {
  if (!schoolId) {
    return {
      status: 400,

      response: {
        success: false,
        message:
          "School ID is required"
      }
    };
  }

  if (
    !isValidObjectId(
      schoolId
    )
  ) {
    return {
      status: 400,

      response: {
        success: false,
        message:
          "Invalid school ID format"
      }
    };
  }

  if (!isSuperAdmin(req)) {
    const userSchoolId =
      getUserSchoolId(req);

    if (!userSchoolId) {
      return {
        status: 403,

        response: {
          success: false,

          message:
            "School is not assigned to this user"
        }
      };
    }

    if (
      userSchoolId !==
      schoolId.toString()
    ) {
      return {
        status: 403,

        response: {
          success: false,

          message:
            "You are not allowed to access another school's data"
        }
      };
    }
  }

  const school =
    await School.findById(
      schoolId
    );

  if (!school) {
    return {
      status: 404,

      response: {
        success: false,
        message:
          "School not found"
      }
    };
  }

  return {
    school
  };
};

/*
|--------------------------------------------------------------------------
| Verify Class
|--------------------------------------------------------------------------
*/

const verifyClassBelongsToSchool =
  async (
    classId,
    schoolId,
    requireActive = true
  ) => {
    if (
      !isValidObjectId(
        classId
      ) ||
      !isValidObjectId(
        schoolId
      )
    ) {
      return null;
    }

    const filter = {
      _id: classId,
      schoolId,

      isDeleted: {
        $ne: true
      }
    };

    if (requireActive) {
      filter.isActive = true;
    }

    return Class.findOne(
      filter
    );
  };

/*
|--------------------------------------------------------------------------
| Populate Fee Structure
|--------------------------------------------------------------------------
*/

const populateFeeStructure = (
  query
) => {
  return query
    .populate(
      "schoolId",
      "schoolName type isActive"
    )
    .populate(
      "classId",
      "className numericOrder sections isActive"
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
| Build List Filter
|--------------------------------------------------------------------------
*/

const buildFeeStructureFilter = (
  req,
  deletedStatus = false
) => {
  const filter = {
    ...getSchoolFilter(req)
  };

  if (deletedStatus) {
    filter.isDeleted = true;
  } else {
    filter.isDeleted = {
      $ne: true
    };
  }

  /*
  | Super Admin School Filter
  */

  if (
    isSuperAdmin(req) &&
    req.query.schoolId
  ) {
    if (
      !isValidObjectId(
        req.query.schoolId
      )
    ) {
      return {
        invalid: true,
        message:
          "Invalid school ID format"
      };
    }

    filter.schoolId =
      req.query.schoolId;
  }

  /*
  | Class Filter
  */

  if (req.query.classId) {
    if (
      !isValidObjectId(
        req.query.classId
      )
    ) {
      return {
        invalid: true,
        message:
          "Invalid class ID format"
      };
    }

    filter.classId =
      req.query.classId;
  }

  /*
  | Session Filter
  */

  if (
    req.query.sessionYear &&
    req.query.sessionYear.trim()
  ) {
    filter.sessionYear =
      req.query.sessionYear.trim();
  }

  /*
  | Active Status Filter
  */

  if (
    req.query.isActive !==
    undefined
  ) {
    filter.isActive =
      parseBoolean(
        req.query.isActive
      );
  }

  /*
  | Search
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
        title: searchRegex
      },
      {
        sessionYear:
          searchRegex
      }
    ];
  }

  return filter;
};

/*
|--------------------------------------------------------------------------
| Create Fee Structure
|--------------------------------------------------------------------------
*/

exports.createFeeStructure =
  async (req, res) => {
    try {
      const {
        classId,
        title,
        sessionYear,
        isActive
      } = req.body;

      const schoolId =
        getCreateSchoolId(req);

      if (
        !schoolId ||
        !classId ||
        !title ||
        !String(title).trim() ||
        !sessionYear ||
        !String(
          sessionYear
        ).trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "School, class, title and session year are required"
          });
      }

      if (
        !isValidObjectId(
          classId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid class ID format"
          });
      }

      const schoolAccess =
        await verifySchoolAccess(
          req,
          schoolId
        );

      if (
        schoolAccess.status
      ) {
        return res
          .status(
            schoolAccess.status
          )
          .json(
            schoolAccess.response
          );
      }

      if (
        schoolAccess.school
          .isActive === false
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Fee structure cannot be created for an inactive school"
          });
      }

      const classData =
        await verifyClassBelongsToSchool(
          classId,
          schoolId,
          true
        );

      if (!classData) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Active class not found or does not belong to this school"
          });
      }

      const feeValidation =
        normalizeFeeValues(
          req.body
        );

      if (
        feeValidation.error
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              feeValidation.error
          });
      }

      const existingFeeStructure =
        await FeeStructure.findOne({
          schoolId,
          classId,

          sessionYear:
            String(
              sessionYear
            ).trim()
        });

      if (
        existingFeeStructure
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              existingFeeStructure.isDeleted
                ? "A deleted fee structure already exists for this class and session. Restore that structure instead."
                : "A fee structure already exists for this class and session year"
          });
      }

      const feeStructure =
        await FeeStructure.create({
          schoolId,
          classId,

          title:
            String(
              title
            ).trim(),

          sessionYear:
            String(
              sessionYear
            ).trim(),

          ...feeValidation.values,

          isActive:
            parseBoolean(
              isActive,
              true
            ),

          createdBy:
            req.user._id,

          updatedBy:
            req.user._id,

          isDeleted: false,
          deletedAt: null,
          deletedBy: null
        });

      const populatedFeeStructure =
        await populateFeeStructure(
          FeeStructure.findById(
            feeStructure._id
          )
        );

      await createAuditLog({
        req,

        schoolId:
          feeStructure.schoolId,

        action: "CREATE",

        module:
          "FEE_STRUCTURE",

        recordId:
          feeStructure._id,

        recordModel:
          "FeeStructure",

        description:
          `Fee structure created successfully: ${feeStructure.title}`,

        oldData: null,

        newData:
          getPlainData(
            populatedFeeStructure
          ),

        status: "success",

        metadata: {
          title:
            feeStructure.title,

          sessionYear:
            feeStructure.sessionYear,

          classId:
            feeStructure.classId,

          monthlyFee:
            feeStructure.monthlyFee,

          admissionFee:
            feeStructure.admissionFee,

          examFee:
            feeStructure.examFee,

          transportFee:
            feeStructure.transportFee,

          otherFee:
            feeStructure.otherFee,

          totalFee:
            calculateTotalFee(
              feeStructure
            )
        }
      });

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Fee structure created successfully",

          feeStructure:
            populatedFeeStructure
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to create fee structure"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Fee Structures
|--------------------------------------------------------------------------
*/

exports.getFeeStructures =
  async (req, res) => {
    try {
      const {
        page,
        limit,
        skip
      } = getPaginationOptions(
        req.query
      );

      const filter =
        buildFeeStructureFilter(
          req,
          false
        );

      if (filter.invalid) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              filter.message
          });
      }

      const [
        feeStructures,
        total
      ] = await Promise.all([
        populateFeeStructure(
          FeeStructure.find(
            filter
          )
        )
          .sort({
            createdAt: -1
          })
          .skip(skip)
          .limit(limit),

        FeeStructure.countDocuments(
          filter
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,

          count:
            feeStructures.length,

          pagination:
            buildPagination({
              total,
              page,
              limit
            }),

          feeStructures
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch fee structures"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Fee Structures
|--------------------------------------------------------------------------
*/

exports.getDeletedFeeStructures =
  async (req, res) => {
    try {
      const {
        page,
        limit,
        skip
      } = getPaginationOptions(
        req.query
      );

      const filter =
        buildFeeStructureFilter(
          req,
          true
        );

      if (filter.invalid) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              filter.message
          });
      }

      const [
        feeStructures,
        total
      ] = await Promise.all([
        populateFeeStructure(
          FeeStructure.find(
            filter
          )
        )
          .sort({
            deletedAt: -1,
            updatedAt: -1
          })
          .skip(skip)
          .limit(limit),

        FeeStructure.countDocuments(
          filter
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,

          count:
            feeStructures.length,

          pagination:
            buildPagination({
              total,
              page,
              limit
            }),

          feeStructures
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch deleted fee structures"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Fee Structure by ID
|--------------------------------------------------------------------------
*/

exports.getFeeStructureById =
  async (req, res) => {
    try {
      const feeStructure =
        await populateFeeStructure(
          FeeStructure.findOne(
            getScopedFilter(
              req,
              {
                _id:
                  req.params.id,

                isDeleted: {
                  $ne: true
                }
              }
            )
          )
        );

      if (!feeStructure) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Fee structure not found or access is not allowed"
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          feeStructure
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch fee structure"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Update Fee Structure
|--------------------------------------------------------------------------
*/

exports.updateFeeStructure =
  async (req, res) => {
    try {
      const filter =
        getScopedFilter(
          req,
          {
            _id:
              req.params.id,

            isDeleted: {
              $ne: true
            }
          }
        );

      const existingFeeStructure =
        await FeeStructure.findOne(
          filter
        );

      if (
        !existingFeeStructure
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Fee structure not found or access is not allowed"
          });
      }

      if (
        req.body.schoolId &&
        req.body.schoolId.toString() !==
          existingFeeStructure.schoolId.toString()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "School cannot be changed for a fee structure"
          });
      }

      const updateData = {};

      /*
      | Class Update
      */

      if (
        req.body.classId !==
        undefined
      ) {
        if (
          !isValidObjectId(
            req.body.classId
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid class ID format"
            });
        }

        const classData =
          await verifyClassBelongsToSchool(
            req.body.classId,

            existingFeeStructure.schoolId,

            true
          );

        if (!classData) {
          return res
            .status(404)
            .json({
              success: false,

              message:
                "Active class not found or does not belong to this school"
            });
        }

        updateData.classId =
          req.body.classId;
      }

      /*
      | Title Update
      */

      if (
        req.body.title !==
        undefined
      ) {
        const title =
          String(
            req.body.title
          ).trim();

        if (
          title.length < 2
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Fee title must contain at least 2 characters"
            });
        }

        updateData.title =
          title;
      }

      /*
      | Session Year Update
      */

      if (
        req.body.sessionYear !==
        undefined
      ) {
        const sessionYear =
          String(
            req.body.sessionYear
          ).trim();

        if (!sessionYear) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Session year is required"
            });
        }

        updateData.sessionYear =
          sessionYear;
      }

      /*
      | Fee Values Update
      */

      const feeValidation =
        normalizeFeeValues(
          req.body,
          true
        );

      if (
        feeValidation.error
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              feeValidation.error
          });
      }

      Object.assign(
        updateData,
        feeValidation.values
      );

      /*
      | Active Status Update
      */

      if (
        req.body.isActive !==
        undefined
      ) {
        updateData.isActive =
          parseBoolean(
            req.body.isActive,
            existingFeeStructure.isActive
          );
      }

      /*
      | Duplicate Check
      */

      const finalClassId =
        updateData.classId ||
        existingFeeStructure.classId;

      const finalSessionYear =
        updateData.sessionYear ||
        existingFeeStructure.sessionYear;

      const duplicateFeeStructure =
        await FeeStructure.findOne({
          _id: {
            $ne:
              existingFeeStructure._id
          },

          schoolId:
            existingFeeStructure.schoolId,

          classId:
            finalClassId,

          sessionYear:
            finalSessionYear
        });

      if (
        duplicateFeeStructure
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              duplicateFeeStructure.isDeleted
                ? "A deleted fee structure already exists for this class and session. Restore that structure instead."
                : "A fee structure already exists for this class and session year"
          });
      }

      updateData.updatedBy =
        req.user._id;

      const oldData =
        getPlainData(
          existingFeeStructure
        );

      const feeStructure =
        await populateFeeStructure(
          FeeStructure.findOneAndUpdate(
            filter,
            updateData,
            {
              returnDocument:
                "after",

              runValidators: true
            }
          )
        );

      await createAuditLog({
        req,

        schoolId:
          existingFeeStructure.schoolId,

        action: "UPDATE",

        module:
          "FEE_STRUCTURE",

        recordId:
          feeStructure._id,

        recordModel:
          "FeeStructure",

        description:
          `Fee structure updated successfully: ${feeStructure.title}`,

        oldData,

        newData:
          getPlainData(
            feeStructure
          ),

        status: "success",

        metadata: {
          title:
            feeStructure.title,

          sessionYear:
            feeStructure.sessionYear,

          classId:
            getDocumentId(
              feeStructure.classId
            ),

          monthlyFee:
            feeStructure.monthlyFee,

          admissionFee:
            feeStructure.admissionFee,

          examFee:
            feeStructure.examFee,

          transportFee:
            feeStructure.transportFee,

          otherFee:
            feeStructure.otherFee,

          totalFee:
            calculateTotalFee(
              feeStructure
            ),

          updatedFields:
            Object.keys(
              updateData
            ).filter(
              (field) =>
                field !==
                "updatedBy"
            )
        }
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Fee structure updated successfully",

          feeStructure
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to update fee structure"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Fee Structure
|--------------------------------------------------------------------------
*/

exports.deleteFeeStructure =
  async (req, res) => {
    try {
      const feeStructure =
        await FeeStructure.findOne(
          getScopedFilter(
            req,
            {
              _id:
                req.params.id,

              isDeleted: {
                $ne: true
              }
            }
          )
        );

      if (!feeStructure) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Fee structure not found or access is not allowed"
          });
      }

      const oldData =
        getPlainData(
          feeStructure
        );

      feeStructure.isDeleted =
        true;

      feeStructure.deletedAt =
        new Date();

      feeStructure.deletedBy =
        req.user._id;

      feeStructure.updatedBy =
        req.user._id;

      await feeStructure.save();

      await createAuditLog({
        req,

        schoolId:
          feeStructure.schoolId,

        action: "DELETE",

        module:
          "FEE_STRUCTURE",

        recordId:
          feeStructure._id,

        recordModel:
          "FeeStructure",

        description:
          `Fee structure soft deleted successfully: ${feeStructure.title}`,

        oldData,

        newData:
          getPlainData(
            feeStructure
          ),

        status: "success",

        metadata: {
          title:
            feeStructure.title,

          sessionYear:
            feeStructure.sessionYear,

          classId:
            feeStructure.classId,

          totalFee:
            calculateTotalFee(
              feeStructure
            ),

          deletedAt:
            feeStructure.deletedAt,

          softDelete: true
        }
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Fee structure deleted successfully",

          feeStructure
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to delete fee structure"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Restore Fee Structure
|--------------------------------------------------------------------------
*/

exports.restoreFeeStructure =
  async (req, res) => {
    try {
      const feeStructure =
        await FeeStructure.findOne(
          getScopedFilter(
            req,
            {
              _id:
                req.params.id,

              isDeleted: true
            }
          )
        );

      if (!feeStructure) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Deleted fee structure not found or access is not allowed"
          });
      }

      const classData =
        await verifyClassBelongsToSchool(
          feeStructure.classId,

          feeStructure.schoolId,

          false
        );

      if (!classData) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Linked class no longer exists. Restore the class first."
          });
      }

      const duplicateFeeStructure =
        await FeeStructure.findOne({
          _id: {
            $ne:
              feeStructure._id
          },

          schoolId:
            feeStructure.schoolId,

          classId:
            feeStructure.classId,

          sessionYear:
            feeStructure.sessionYear,

          isDeleted: {
            $ne: true
          }
        });

      if (
        duplicateFeeStructure
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "An active fee structure already exists for this class and session year"
          });
      }

      const oldData =
        getPlainData(
          feeStructure
        );

      feeStructure.isDeleted =
        false;

      feeStructure.deletedAt =
        null;

      feeStructure.deletedBy =
        null;

      feeStructure.updatedBy =
        req.user._id;

      await feeStructure.save();

      const populatedFeeStructure =
        await populateFeeStructure(
          FeeStructure.findById(
            feeStructure._id
          )
        );

      await createAuditLog({
        req,

        schoolId:
          feeStructure.schoolId,

        action: "UPDATE",

        module:
          "FEE_STRUCTURE",

        recordId:
          feeStructure._id,

        recordModel:
          "FeeStructure",

        description:
          `Fee structure restored successfully: ${feeStructure.title}`,

        oldData,

        newData:
          getPlainData(
            populatedFeeStructure
          ),

        status: "success",

        metadata: {
          title:
            feeStructure.title,

          sessionYear:
            feeStructure.sessionYear,

          classId:
            feeStructure.classId,

          totalFee:
            calculateTotalFee(
              feeStructure
            ),

          restored: true
        }
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Fee structure restored successfully",

          feeStructure:
            populatedFeeStructure
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to restore fee structure"
      );
    }
  };