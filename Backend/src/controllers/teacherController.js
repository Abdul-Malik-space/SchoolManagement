const mongoose = require("mongoose");

const Teacher = require("../models/Teacher");
const User = require("../models/User");
const School = require("../models/School");

const {
  getPaginationOptions,
  buildPagination
} = require("../utils/pagination");

const {
  createAuditLog
} = require("../utils/auditLogHelper");

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
      message: Object.values(
        error.errors
      )
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
    const duplicateField =
      Object.keys(
        error.keyPattern || {}
      )[0];

    if (duplicateField === "userId") {
      return res.status(400).json({
        success: false,
        message:
          "This user account already has a teacher profile"
      });
    }

    return res.status(400).json({
      success: false,
      message:
        "A teacher record already exists with this information"
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
| Helpers
|--------------------------------------------------------------------------
*/

const escapeRegex = (
  value = ""
) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const normalizeSubjects = (
  subjects
) => {
  if (!subjects) {
    return [];
  }

  const values = Array.isArray(
    subjects
  )
    ? subjects
    : String(subjects).split(",");

  return [
    ...new Set(
      values
        .map((subject) =>
          String(subject).trim()
        )
        .filter(Boolean)
    )
  ];
};

const generateEmployeeId = () => {
  const year =
    new Date().getFullYear();

  const randomNumber =
    Math.floor(
      100000 +
        Math.random() * 900000
    );

  return `TCH-${year}-${randomNumber}`;
};

const generateUniqueEmployeeId =
  async (schoolId) => {
    let employeeId;
    let exists = true;
    let attempts = 0;

    while (
      exists &&
      attempts < 10
    ) {
      employeeId =
        generateEmployeeId();

      exists =
        await Teacher.findOne({
          schoolId,
          employeeId
        }).select("_id");

      attempts += 1;
    }

    if (exists) {
      throw new Error(
        "Failed to generate unique employee ID"
      );
    }

    return employeeId;
  };

const isSuperAdmin = (req) => {
  return (
    req.user &&
    req.user.role ===
      "super_admin"
  );
};

const getDocumentId = (
  value
) => {
  if (!value) {
    return null;
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const getUserSchoolId = (
  req
) => {
  return getDocumentId(
    req.user?.schoolId
  );
};

const getSchoolFilter = (
  req
) => {
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

  const userSchoolId =
    getUserSchoolId(req);

  if (!userSchoolId) {
    return {
      schoolId: null
    };
  }

  return {
    schoolId: userSchoolId
  };
};

const getCreateSchoolId = (
  req
) => {
  if (isSuperAdmin(req)) {
    return req.body.schoolId;
  }

  return getUserSchoolId(req);
};

const getPlainData = (
  document
) => {
  if (!document) {
    return null;
  }

  if (
    typeof document.toObject ===
    "function"
  ) {
    return document.toObject();
  }

  return document;
};

const populateTeacher = (
  query
) => {
  return query
    .populate(
      "userId",
      "name email phone address photo role isActive schoolId mustChangePassword"
    )
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
};

const buildTeacherFilter = (
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

  if (
    isSuperAdmin(req) &&
    req.query.schoolId
  ) {
    filter.schoolId =
      req.query.schoolId;
  }

  if (req.query.status) {
    filter.status =
      req.query.status;
  }

  if (req.query.gender) {
    filter.gender =
      req.query.gender;
  }

  if (
    req.query.subject &&
    req.query.subject.trim()
  ) {
    filter.subjects =
      new RegExp(
        escapeRegex(
          req.query.subject.trim()
        ),
        "i"
      );
  }

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
        cnic: searchRegex
      },
      {
        qualification:
          searchRegex
      },
      {
        employeeId:
          searchRegex
      },
      {
        subjects:
          searchRegex
      }
    ];
  }

  return filter;
};

/*
|--------------------------------------------------------------------------
| Get Available Teacher User Accounts
|--------------------------------------------------------------------------
|
| صرف active teacher-role users آئیں گے جن کے ساتھ ابھی Teacher profile
| link نہیں ہے۔
|
*/

exports.getAvailableTeacherUsers =
  async (req, res) => {
    try {
      const filter = {
        role: "teacher",
        isActive: true
      };

      if (isSuperAdmin(req)) {
        if (req.query.schoolId) {
          if (
            !mongoose.Types.ObjectId.isValid(
              req.query.schoolId
            )
          ) {
            return res
              .status(400)
              .json({
                success: false,
                message:
                  "Invalid school ID format"
              });
          }

          filter.schoolId =
            req.query.schoolId;
        }
      } else {
        const schoolId =
          getUserSchoolId(req);

        if (!schoolId) {
          return res
            .status(403)
            .json({
              success: false,
              message:
                "School is not assigned to this user"
            });
        }

        filter.schoolId =
          schoolId;
      }

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

      /*
      | Deleted Teacher profiles کو بھی linked سمجھا جائے گا،
      | کیونکہ انہیں Restore کیا جا سکتا ہے۔
      */

      const linkedUserIds =
        await Teacher.distinct(
          "userId",
          {
            userId: {
              $ne: null
            }
          }
        );

      if (
        linkedUserIds.length > 0
      ) {
        filter._id = {
          $nin: linkedUserIds
        };
      }

      const users =
        await User.find(filter)
          .select(
            "name email phone address photo role isActive schoolId"
          )
          .populate(
            "schoolId",
            "schoolName type isActive"
          )
          .sort({
            name: 1
          })
          .limit(200);

      return res
        .status(200)
        .json({
          success: true,
          count: users.length,
          users
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch available teacher user accounts"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Create Teacher
|--------------------------------------------------------------------------
*/

exports.createTeacher =
  async (req, res) => {
    try {
      const {
        userId,
        fatherName,
        cnic,
        gender,
        dateOfBirth,
        qualification,
        subjects,
        salary,
        joiningDate,
        status
      } = req.body;

      const schoolId =
        getCreateSchoolId(req);

      if (
        !schoolId ||
        !userId ||
        !gender ||
        !qualification
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "School, teacher user account, gender and qualification are required"
          });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          schoolId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid school ID format"
          });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          userId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid teacher user ID format"
          });
      }

      const [
        school,
        linkedUser
      ] = await Promise.all([
        School.findById(schoolId),

        User.findById(userId)
          .select(
            "name email phone address photo role isActive schoolId"
          )
      ]);

      if (!school) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "School not found"
          });
      }

      if (
        school.isActive === false
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Teacher cannot be created for an inactive school"
          });
      }

      if (!linkedUser) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Teacher user account not found"
          });
      }

      if (
        linkedUser.role !==
        "teacher"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Selected user account does not have the teacher role"
          });
      }

      if (
        linkedUser.isActive !==
        true
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Selected teacher user account is inactive"
          });
      }

      const linkedUserSchoolId =
        getDocumentId(
          linkedUser.schoolId
        );

      if (
        !linkedUserSchoolId ||
        linkedUserSchoolId !==
          schoolId.toString()
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Selected teacher user account belongs to another school"
          });
      }

      if (
        !linkedUser.phone ||
        !linkedUser.phone.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Add a phone number to the user account before creating the teacher profile"
          });
      }

      const existingTeacher =
        await Teacher.findOne({
          userId
        });

      if (existingTeacher) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              existingTeacher.isDeleted
                ? "A deleted teacher profile already exists for this user. Restore that profile instead."
                : "This user account already has a teacher profile"
          });
      }

      const numericSalary =
        salary === "" ||
        salary === undefined ||
        salary === null
          ? 0
          : Number(salary);

      if (
        Number.isNaN(
          numericSalary
        ) ||
        numericSalary < 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Salary must be a valid non-negative number"
          });
      }

      const employeeId =
        await generateUniqueEmployeeId(
          schoolId
        );

      const teacher =
        await Teacher.create({
          userId,
          schoolId,
          employeeId,

          name:
            linkedUser.name,

          email:
            linkedUser.email,

          phone:
            linkedUser.phone,

          address:
            linkedUser.address ||
            "",

          teacherPhoto:
            linkedUser.photo ||
            "",

          fatherName:
            fatherName || "",

          cnic:
            cnic || "",

          gender,

          dateOfBirth:
            dateOfBirth ||
            null,

          qualification,

          subjects:
            normalizeSubjects(
              subjects
            ),

          salary:
            numericSalary,

          joiningDate:
            joiningDate ||
            new Date(),

          status:
            status || "active",

          createdBy:
            req.user._id,

          updatedBy:
            req.user._id,

          isDeleted: false,
          deletedAt: null,
          deletedBy: null
        });

      const populatedTeacher =
        await populateTeacher(
          Teacher.findById(
            teacher._id
          )
        );

      await createAuditLog({
        req,
        schoolId:
          teacher.schoolId,

        action: "CREATE",
        module: "TEACHER",

        recordId:
          teacher._id,

        recordModel:
          "Teacher",

        description:
          `Teacher created successfully: ${teacher.name}`,

        oldData: null,

        newData:
          getPlainData(
            populatedTeacher
          ),

        status: "success",

        metadata: {
          userId,
          employeeId:
            teacher.employeeId,

          phone:
            teacher.phone,

          email:
            teacher.email || "",

          subjects:
            teacher.subjects || []
        }
      });

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Teacher profile created successfully",
          teacher:
            populatedTeacher
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to create teacher"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Teachers
|--------------------------------------------------------------------------
*/

exports.getTeachers =
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
        buildTeacherFilter(
          req,
          false
        );

      const [
        teachers,
        total
      ] = await Promise.all([
        populateTeacher(
          Teacher.find(filter)
        )
          .sort({
            createdAt: -1
          })
          .skip(skip)
          .limit(limit),

        Teacher.countDocuments(
          filter
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,
          count:
            teachers.length,

          pagination:
            buildPagination({
              total,
              page,
              limit
            }),

          teachers
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch teachers"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Teachers
|--------------------------------------------------------------------------
*/

exports.getDeletedTeachers =
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
        buildTeacherFilter(
          req,
          true
        );

      const [
        teachers,
        total
      ] = await Promise.all([
        populateTeacher(
          Teacher.find(filter)
        )
          .populate(
            "deletedBy",
            "name email role"
          )
          .sort({
            deletedAt: -1,
            updatedAt: -1
          })
          .skip(skip)
          .limit(limit),

        Teacher.countDocuments(
          filter
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,
          count:
            teachers.length,

          pagination:
            buildPagination({
              total,
              page,
              limit
            }),

          teachers
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch deleted teachers"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Teacher by ID
|--------------------------------------------------------------------------
*/

exports.getTeacherById =
  async (req, res) => {
    try {
      const filter = {
        _id: req.params.id,
        ...getSchoolFilter(req),

        isDeleted: {
          $ne: true
        }
      };

      const teacher =
        await populateTeacher(
          Teacher.findOne(
            filter
          )
        );

      if (!teacher) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Teacher not found"
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          teacher
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch teacher"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Update Teacher
|--------------------------------------------------------------------------
*/

exports.updateTeacher =
  async (req, res) => {
    try {
      const filter = {
        _id: req.params.id,
        ...getSchoolFilter(req),

        isDeleted: {
          $ne: true
        }
      };

      const existingTeacher =
        await Teacher.findOne(
          filter
        );

      if (!existingTeacher) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Teacher not found"
          });
      }

      const oldTeacherData =
        getPlainData(
          existingTeacher
        );

      const updateData = {
        ...req.body
      };

      /*
      | Protected fields
      */

      [
        "userId",
        "schoolId",
        "employeeId",
        "createdBy",
        "updatedBy",
        "isDeleted",
        "deletedAt",
        "deletedBy",

        /*
        | Identity User account سے آئے گی۔
        */

        "name",
        "email",
        "phone",
        "address",
        "teacherPhoto"
      ].forEach((field) => {
        delete updateData[field];
      });

      if (
        updateData.subjects !==
        undefined
      ) {
        updateData.subjects =
          normalizeSubjects(
            updateData.subjects
          );
      }

      if (
        updateData.salary !==
        undefined
      ) {
        const numericSalary =
          Number(
            updateData.salary
          );

        if (
          Number.isNaN(
            numericSalary
          ) ||
          numericSalary < 0
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "Salary must be a valid non-negative number"
            });
        }

        updateData.salary =
          numericSalary;
      }

      /*
      | Linked User سے basic identity sync کریں۔
      */

      const linkedUser =
        await User.findById(
          existingTeacher.userId
        ).select(
          "name email phone address photo"
        );

      if (linkedUser) {
        updateData.name =
          linkedUser.name;

        updateData.email =
          linkedUser.email;

        updateData.phone =
          linkedUser.phone;

        updateData.address =
          linkedUser.address ||
          "";

        updateData.teacherPhoto =
          linkedUser.photo ||
          "";
      }

      updateData.updatedBy =
        req.user._id;

      const teacher =
        await populateTeacher(
          Teacher.findOneAndUpdate(
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
          existingTeacher.schoolId,

        action: "UPDATE",
        module: "TEACHER",

        recordId:
          teacher._id,

        recordModel:
          "Teacher",

        description:
          `Teacher updated successfully: ${teacher.name}`,

        oldData:
          oldTeacherData,

        newData:
          getPlainData(
            teacher
          ),

        status: "success",

        metadata: {
          employeeId:
            teacher.employeeId,

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
            "Teacher updated successfully",
          teacher
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to update teacher"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Teacher
|--------------------------------------------------------------------------
*/

exports.deleteTeacher =
  async (req, res) => {
    try {
      const teacher =
        await Teacher.findById(
          req.params.id
        );

      if (!teacher) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Teacher not found"
          });
      }

      if (
        teacher.isDeleted ===
        true
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Teacher is already deleted"
          });
      }

      if (!isSuperAdmin(req)) {
        const userSchoolId =
          getUserSchoolId(req);

        if (!userSchoolId) {
          return res
            .status(403)
            .json({
              success: false,
              message:
                "School is not assigned to this user"
            });
        }

        if (
          teacher.schoolId.toString() !==
          userSchoolId.toString()
        ) {
          return res
            .status(403)
            .json({
              success: false,
              message:
                "You are not allowed to delete another school's teacher"
            });
        }
      }

      const oldTeacherData =
        getPlainData(teacher);

      teacher.isDeleted = true;
      teacher.deletedAt =
        new Date();

      teacher.deletedBy =
        req.user._id;

      teacher.updatedBy =
        req.user._id;

      await teacher.save();

      await createAuditLog({
        req,

        schoolId:
          teacher.schoolId,

        action: "DELETE",
        module: "TEACHER",

        recordId:
          teacher._id,

        recordModel:
          "Teacher",

        description:
          `Teacher soft deleted successfully: ${teacher.name}`,

        oldData:
          oldTeacherData,

        newData:
          getPlainData(
            teacher
          ),

        status: "success",

        metadata: {
          employeeId:
            teacher.employeeId,

          phone:
            teacher.phone,

          email:
            teacher.email || "",

          deletedAt:
            teacher.deletedAt,

          softDelete: true
        }
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Teacher deleted successfully",
          teacher
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to delete teacher"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Restore Teacher
|--------------------------------------------------------------------------
*/

exports.restoreTeacher =
  async (req, res) => {
    try {
      const teacher =
        await Teacher.findById(
          req.params.id
        );

      if (!teacher) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Teacher not found"
          });
      }

      if (
        teacher.isDeleted !==
        true
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Teacher is not deleted"
          });
      }

      if (!isSuperAdmin(req)) {
        const userSchoolId =
          getUserSchoolId(req);

        if (!userSchoolId) {
          return res
            .status(403)
            .json({
              success: false,
              message:
                "School is not assigned to this user"
            });
        }

        if (
          teacher.schoolId.toString() !==
          userSchoolId.toString()
        ) {
          return res
            .status(403)
            .json({
              success: false,
              message:
                "You are not allowed to restore another school's teacher"
            });
        }
      }

      const linkedUser =
        await User.findById(
          teacher.userId
        ).select(
          "name email phone address photo role isActive schoolId"
        );

      if (!linkedUser) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Linked teacher user account no longer exists"
          });
      }

      if (
        linkedUser.role !==
        "teacher"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Linked user account no longer has the teacher role"
          });
      }

      const oldTeacherData =
        getPlainData(teacher);

      teacher.name =
        linkedUser.name;

      teacher.email =
        linkedUser.email;

      teacher.phone =
        linkedUser.phone;

      teacher.address =
        linkedUser.address ||
        "";

      teacher.teacherPhoto =
        linkedUser.photo ||
        "";

      teacher.isDeleted = false;
      teacher.deletedAt = null;
      teacher.deletedBy = null;

      teacher.updatedBy =
        req.user._id;

      await teacher.save();

      const populatedTeacher =
        await populateTeacher(
          Teacher.findById(
            teacher._id
          )
        );

      await createAuditLog({
        req,

        schoolId:
          teacher.schoolId,

        action: "UPDATE",
        module: "TEACHER",

        recordId:
          teacher._id,

        recordModel:
          "Teacher",

        description:
          `Teacher restored successfully: ${teacher.name}`,

        oldData:
          oldTeacherData,

        newData:
          getPlainData(
            populatedTeacher
          ),

        status: "success",

        metadata: {
          employeeId:
            teacher.employeeId,

          phone:
            teacher.phone,

          email:
            teacher.email || "",

          restored: true
        }
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Teacher restored successfully",
          teacher:
            populatedTeacher
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to restore teacher"
      );
    }
  };