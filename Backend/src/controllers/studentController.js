const mongoose = require("mongoose");

const Student = require("../models/Student");
const School = require("../models/School");
const Class = require("../models/Class");
const User = require("../models/User");

const {
  getPaginationOptions,
  buildPagination
} = require("../utils/pagination");

const {
  createAuditLog
} = require("../utils/auditLogHelper");

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
        .map((item) => {
          return item.message;
        })
        .join(", ")
    });
  }

  if (
    error.name ===
    "CastError"
  ) {
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

    if (
      duplicateField ===
      "studentUserId"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This user account already has a student profile"
      });
    }

    return res.status(400).json({
      success: false,
      message:
        "A student record already exists with this information"
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

const isSuperAdmin = (
  req
) => {
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

const generateAdmissionNumber =
  () => {
    const year =
      new Date().getFullYear();

    const randomNumber =
      Math.floor(
        100000 +
          Math.random() *
            900000
      );

    return `ADM-${year}-${randomNumber}`;
  };

const generateUniqueAdmissionNumber =
  async (schoolId) => {
    let admissionNumber;
    let exists = true;
    let attempts = 0;

    while (
      exists &&
      attempts < 10
    ) {
      admissionNumber =
        generateAdmissionNumber();

      exists =
        await Student.findOne({
          schoolId,
          admissionNumber
        }).select("_id");

      attempts += 1;
    }

    if (exists) {
      throw new Error(
        "Failed to generate unique admission number"
      );
    }

    return admissionNumber;
  };

const normalizeObjectIds = (
  values
) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .filter(Boolean)
        .map((value) =>
          value.toString()
        )
    )
  ];
};

const populateStudent = (
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
      "studentUserId",
      "name email phone address photo role isActive schoolId mustChangePassword"
    )
    .populate(
      "parentUserIds",
      "name email phone address photo role isActive schoolId"
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

const buildStudentFilter = (
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

  if (req.query.classId) {
    filter.classId =
      req.query.classId;
  }

  if (req.query.sectionId) {
    filter.sectionId =
      req.query.sectionId;
  }

  if (req.query.sectionName) {
    filter.sectionName =
      req.query.sectionName;
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
        fatherName: searchRegex
      },
      {
        admissionNumber:
          searchRegex
      },
      {
        bForm: searchRegex
      },
      {
        contactNumber:
          searchRegex
      },
      {
        guardianName:
          searchRegex
      },
      {
        guardianContact:
          searchRegex
      }
    ];
  }

  return filter;
};

/*
|--------------------------------------------------------------------------
| Validate Parent Accounts
|--------------------------------------------------------------------------
*/

const validateParentAccounts =
  async ({
    parentUserIds,
    schoolId
  }) => {
    const normalizedParentIds =
      normalizeObjectIds(
        parentUserIds
      );

    for (
      const parentId of
      normalizedParentIds
    ) {
      if (
        !mongoose.Types.ObjectId.isValid(
          parentId
        )
      ) {
        return {
          error:
            "Invalid parent user ID format"
        };
      }
    }

    if (
      normalizedParentIds.length ===
      0
    ) {
      return {
        parents: [],
        parentUserIds: []
      };
    }

    const parents =
      await User.find({
        _id: {
          $in:
            normalizedParentIds
        },

        role: "parent",
        schoolId
      }).select(
        "name email phone address photo role isActive schoolId"
      );

    if (
      parents.length !==
      normalizedParentIds.length
    ) {
      return {
        error:
          "One or more selected parent accounts are invalid or belong to another school"
      };
    }

    const inactiveParent =
      parents.find(
        (parent) =>
          parent.isActive !== true
      );

    if (inactiveParent) {
      return {
        error:
          `Parent account ${inactiveParent.name} is inactive`
      };
    }

    return {
      parents,
      parentUserIds:
        normalizedParentIds
    };
  };

/*
|--------------------------------------------------------------------------
| Get Available Student or Parent User Accounts
|--------------------------------------------------------------------------
|
| role query:
| student
| parent
|
*/

exports.getAvailableStudentUsers =
  async (req, res) => {
    try {
      const role =
        req.query.role;

      if (
        ![
          "student",
          "parent"
        ].includes(role)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Role must be student or parent"
          });
      }

      const filter = {
        role,
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
      | Student account صرف ایک Student profile سے link ہوگا۔
      | Deleted profile بھی linked رہے گی کیونکہ وہ Restore ہو سکتی ہے۔
      */

      if (role === "student") {
        const linkedStudentUserIds =
          await Student.distinct(
            "studentUserId",
            {
              studentUserId: {
                $ne: null
              }
            }
          );

        if (
          linkedStudentUserIds.length >
          0
        ) {
          filter._id = {
            $nin:
              linkedStudentUserIds
          };
        }
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
          .limit(300);

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
        "Failed to fetch available user accounts"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Create Student
|--------------------------------------------------------------------------
*/

exports.createStudent =
  async (req, res) => {
    try {
      const {
        classId,
        sectionId,
        studentUserId,
        parentUserIds,
        fatherName,
        bForm,
        dateOfBirth,
        gender,
        guardianName,
        guardianContact,
        admissionDate,
        status
      } = req.body;

      const schoolId =
        getCreateSchoolId(req);

      if (
        !schoolId ||
        !classId ||
        !sectionId ||
        !studentUserId ||
        !fatherName ||
        !gender
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "School, class, section, student user account, father name and gender are required"
          });
      }

      const idsToValidate = [
        schoolId,
        classId,
        sectionId,
        studentUserId
      ];

      if (
        idsToValidate.some(
          (id) =>
            !mongoose.Types.ObjectId.isValid(
              id
            )
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "One or more IDs have an invalid format"
          });
      }

      const [
        school,
        classData,
        studentUser
      ] = await Promise.all([
        School.findById(
          schoolId
        ),

        Class.findOne({
          _id: classId,
          schoolId,

          isDeleted: {
            $ne: true
          },

          isActive: true
        }),

        User.findById(
          studentUserId
        ).select(
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
              "Student cannot be created for an inactive school"
          });
      }

      if (!classData) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Active class not found in this school"
          });
      }

      const section =
        classData.sections.id(
          sectionId
        );

      if (!section) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Section not found in this class"
          });
      }

      if (!studentUser) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Student user account not found"
          });
      }

      if (
        studentUser.role !==
        "student"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Selected user account does not have the student role"
          });
      }

      if (
        studentUser.isActive !==
        true
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Selected student user account is inactive"
          });
      }

      if (
        getDocumentId(
          studentUser.schoolId
        ) !== schoolId.toString()
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Selected student user account belongs to another school"
          });
      }

      const existingStudent =
        await Student.findOne({
          studentUserId
        });

      if (existingStudent) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              existingStudent.isDeleted
                ? "A deleted student profile already exists for this account. Restore that profile instead."
                : "This user account already has a student profile"
          });
      }

      const parentValidation =
        await validateParentAccounts({
          parentUserIds,
          schoolId
        });

      if (
        parentValidation.error
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              parentValidation.error
          });
      }

      const primaryParent =
        parentValidation.parents[0];

      const finalGuardianName =
        guardianName?.trim() ||
        primaryParent?.name ||
        "";

      const finalGuardianContact =
        guardianContact?.trim() ||
        primaryParent?.phone ||
        "";

      const admissionNumber =
        await generateUniqueAdmissionNumber(
          schoolId
        );

      const student =
        await Student.create({
          schoolId,
          classId,
          sectionId,

          sectionName:
            section.sectionName,

          studentUserId,

          parentUserIds:
            parentValidation.parentUserIds,

          admissionNumber,

          name:
            studentUser.name,

          fatherName:
            fatherName.trim(),

          bForm:
            bForm?.trim() ||
            "",

          dateOfBirth:
            dateOfBirth ||
            null,

          gender,

          address:
            studentUser.address ||
            "",

          contactNumber:
            studentUser.phone ||
            "",

          guardianName:
            finalGuardianName,

          guardianContact:
            finalGuardianContact,

          admissionDate:
            admissionDate ||
            new Date(),

          studentPhoto:
            studentUser.photo ||
            "",

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

      const populatedStudent =
        await populateStudent(
          Student.findById(
            student._id
          )
        );

      await createAuditLog({
        req,

        schoolId:
          student.schoolId,

        action: "CREATE",
        module: "STUDENT",

        recordId:
          student._id,

        recordModel:
          "Student",

        description:
          `Student created successfully: ${student.name}`,

        oldData: null,

        newData:
          getPlainData(
            populatedStudent
          ),

        status: "success",

        metadata: {
          studentUserId,

          parentUserIds:
            parentValidation.parentUserIds,

          admissionNumber:
            student.admissionNumber,

          classId:
            student.classId,

          sectionId:
            student.sectionId,

          sectionName:
            student.sectionName
        }
      });

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Student profile created successfully",

          student:
            populatedStudent
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to create student"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Students
|--------------------------------------------------------------------------
*/

exports.getStudents =
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
        buildStudentFilter(
          req,
          false
        );

      const [
        students,
        total
      ] = await Promise.all([
        populateStudent(
          Student.find(filter)
        )
          .sort({
            createdAt: -1
          })
          .skip(skip)
          .limit(limit),

        Student.countDocuments(
          filter
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,
          count:
            students.length,

          pagination:
            buildPagination({
              total,
              page,
              limit
            }),

          students
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch students"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Students
|--------------------------------------------------------------------------
*/

exports.getDeletedStudents =
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
        buildStudentFilter(
          req,
          true
        );

      const [
        students,
        total
      ] = await Promise.all([
        populateStudent(
          Student.find(filter)
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

        Student.countDocuments(
          filter
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,
          count:
            students.length,

          pagination:
            buildPagination({
              total,
              page,
              limit
            }),

          students
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch deleted students"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Student by ID
|--------------------------------------------------------------------------
*/

exports.getStudentById =
  async (req, res) => {
    try {
      const student =
        await populateStudent(
          Student.findOne({
            _id: req.params.id,

            ...getSchoolFilter(
              req
            ),

            isDeleted: {
              $ne: true
            }
          })
        );

      if (!student) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Student not found"
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          student
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch student"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Update Student
|--------------------------------------------------------------------------
*/

exports.updateStudent =
  async (req, res) => {
    try {
      const filter = {
        _id: req.params.id,

        ...getSchoolFilter(req),

        isDeleted: {
          $ne: true
        }
      };

      const existingStudent =
        await Student.findOne(
          filter
        );

      if (!existingStudent) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Student not found"
          });
      }

      const oldStudentData =
        getPlainData(
          existingStudent
        );

      const updateData = {
        ...req.body
      };

      [
        "schoolId",
        "studentUserId",
        "admissionNumber",
        "sectionName",
        "createdBy",
        "updatedBy",
        "isDeleted",
        "deletedAt",
        "deletedBy",

        "name",
        "address",
        "contactNumber",
        "studentPhoto"
      ].forEach((field) => {
        delete updateData[field];
      });

      if (
        updateData.parentUserIds !==
        undefined
      ) {
        const parentValidation =
          await validateParentAccounts({
            parentUserIds:
              updateData.parentUserIds,

            schoolId:
              existingStudent.schoolId
          });

        if (
          parentValidation.error
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                parentValidation.error
            });
        }

        updateData.parentUserIds =
          parentValidation.parentUserIds;
      }

      if (
        updateData.classId ||
        updateData.sectionId
      ) {
        const finalClassId =
          updateData.classId ||
          existingStudent.classId;

        const finalSectionId =
          updateData.sectionId ||
          existingStudent.sectionId;

        const classData =
          await Class.findOne({
            _id: finalClassId,

            schoolId:
              existingStudent.schoolId,

            isDeleted: {
              $ne: true
            },

            isActive: true
          });

        if (!classData) {
          return res
            .status(404)
            .json({
              success: false,
              message:
                "Active class not found in this school"
            });
        }

        const section =
          classData.sections.id(
            finalSectionId
          );

        if (!section) {
          return res
            .status(404)
            .json({
              success: false,
              message:
                "Section not found in this class"
            });
        }

        updateData.classId =
          finalClassId;

        updateData.sectionId =
          finalSectionId;

        updateData.sectionName =
          section.sectionName;
      }

      const linkedStudentUser =
        await User.findById(
          existingStudent.studentUserId
        ).select(
          "name email phone address photo role isActive schoolId"
        );

      if (!linkedStudentUser) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Linked student user account no longer exists"
          });
      }

      updateData.name =
        linkedStudentUser.name;

      updateData.address =
        linkedStudentUser.address ||
        "";

      updateData.contactNumber =
        linkedStudentUser.phone ||
        "";

      updateData.studentPhoto =
        linkedStudentUser.photo ||
        "";

      updateData.updatedBy =
        req.user._id;

      const student =
        await populateStudent(
          Student.findOneAndUpdate(
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
          existingStudent.schoolId,

        action: "UPDATE",
        module: "STUDENT",

        recordId:
          student._id,

        recordModel:
          "Student",

        description:
          `Student updated successfully: ${student.name}`,

        oldData:
          oldStudentData,

        newData:
          getPlainData(
            student
          ),

        status: "success",

        metadata: {
          admissionNumber:
            student.admissionNumber,

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
            "Student updated successfully",
          student
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to update student"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Student
|--------------------------------------------------------------------------
*/

exports.deleteStudent =
  async (req, res) => {
    try {
      const student =
        await Student.findById(
          req.params.id
        );

      if (!student) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Student not found"
          });
      }

      if (
        student.isDeleted === true
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Student is already deleted"
          });
      }

      if (!isSuperAdmin(req)) {
        const schoolId =
          getUserSchoolId(req);

        if (
          !schoolId ||
          student.schoolId.toString() !==
            schoolId.toString()
        ) {
          return res
            .status(403)
            .json({
              success: false,
              message:
                "You are not allowed to delete another school's student"
            });
        }
      }

      const oldStudentData =
        getPlainData(student);

      student.isDeleted = true;
      student.deletedAt =
        new Date();

      student.deletedBy =
        req.user._id;

      student.updatedBy =
        req.user._id;

      await student.save();

      await createAuditLog({
        req,

        schoolId:
          student.schoolId,

        action: "DELETE",
        module: "STUDENT",

        recordId:
          student._id,

        recordModel:
          "Student",

        description:
          `Student soft deleted successfully: ${student.name}`,

        oldData:
          oldStudentData,

        newData:
          getPlainData(
            student
          ),

        status: "success",

        metadata: {
          admissionNumber:
            student.admissionNumber,

          classId:
            student.classId,

          sectionId:
            student.sectionId,

          sectionName:
            student.sectionName,

          deletedAt:
            student.deletedAt,

          softDelete: true
        }
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Student deleted successfully",
          student
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to delete student"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Restore Student
|--------------------------------------------------------------------------
*/

exports.restoreStudent =
  async (req, res) => {
    try {
      const filter = {
        _id: req.params.id,

        ...getSchoolFilter(req),

        isDeleted: true
      };

      const student =
        await Student.findOne(
          filter
        );

      if (!student) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Deleted student not found"
          });
      }

      const linkedStudentUser =
        await User.findById(
          student.studentUserId
        ).select(
          "name email phone address photo role isActive schoolId"
        );

      if (!linkedStudentUser) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Linked student user account no longer exists"
          });
      }

      if (
        linkedStudentUser.role !==
        "student"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Linked user account no longer has the student role"
          });
      }

      const oldStudentData =
        getPlainData(student);

      student.name =
        linkedStudentUser.name;

      student.address =
        linkedStudentUser.address ||
        "";

      student.contactNumber =
        linkedStudentUser.phone ||
        "";

      student.studentPhoto =
        linkedStudentUser.photo ||
        "";

      student.isDeleted = false;
      student.deletedAt = null;
      student.deletedBy = null;

      student.updatedBy =
        req.user._id;

      await student.save();

      const populatedStudent =
        await populateStudent(
          Student.findById(
            student._id
          )
        );

      await createAuditLog({
        req,

        schoolId:
          student.schoolId,

        action: "UPDATE",
        module: "STUDENT",

        recordId:
          student._id,

        recordModel:
          "Student",

        description:
          `Student restored successfully: ${student.name}`,

        oldData:
          oldStudentData,

        newData:
          getPlainData(
            populatedStudent
          ),

        status: "success",

        metadata: {
          admissionNumber:
            student.admissionNumber,

          classId:
            student.classId,

          sectionId:
            student.sectionId,

          sectionName:
            student.sectionName,

          restored: true
        }
      });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Student restored successfully",

          student:
            populatedStudent
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to restore student"
      );
    }
  };