const mongoose = require("mongoose");

const FeeCollection = require(
  "../models/FeeCollection"
);

const FeeStructure = require(
  "../models/FeeStructure"
);

const Student = require(
  "../models/Student"
);

const {
  getPaginationOptions,
  buildPagination
} = require("../utils/pagination");

const {
  createAuditLog
} = require(
  "../utils/auditLogHelper"
);

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const PAYMENT_METHODS = [
  "cash",
  "bank",
  "online",
  "cheque"
];

const PAYMENT_STATUSES = [
  "unpaid",
  "partial",
  "paid"
];

/*
|--------------------------------------------------------------------------
| User and School Helpers
|--------------------------------------------------------------------------
*/

const isSuperAdmin = (req) => {
  return (
    req.user?.role ===
    "super_admin"
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
| General Helpers
|--------------------------------------------------------------------------
*/

const isValidObjectId = (value) => {
  return (
    Boolean(value) &&
    mongoose.Types.ObjectId.isValid(
      value
    )
  );
};

const isValidFeeMonth = (
  feeMonth
) => {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(
    feeMonth
  );
};

const escapeRegex = (
  value = ""
) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const toNumber = (
  value,
  defaultValue = 0
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  const numberValue =
    Number(value);

  if (
    !Number.isFinite(
      numberValue
    )
  ) {
    return null;
  }

  return numberValue;
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
    return document.toObject({
      virtuals: true
    });
  }

  return document;
};

/*
|--------------------------------------------------------------------------
| Date Helper
|--------------------------------------------------------------------------
*/

const parseOptionalDate = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      value: null
    };
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      error:
        "Invalid date format"
    };
  }

  return {
    value: date
  };
};

/*
|--------------------------------------------------------------------------
| Amount Calculation
|--------------------------------------------------------------------------
*/

const calculateTotalAmount = (
  source
) => {
  return (
    Number(
      source?.monthlyFee || 0
    ) +
    Number(
      source?.admissionFee || 0
    ) +
    Number(
      source?.examFee || 0
    ) +
    Number(
      source?.transportFee || 0
    ) +
    Number(
      source?.otherFee || 0
    )
  );
};

const calculatePaidAmount = (
  payments = []
) => {
  return payments.reduce(
    (total, payment) => {
      return (
        total +
        Number(
          payment.amount || 0
        )
      );
    },
    0
  );
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
    return res
      .status(400)
      .json({
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
    return res
      .status(400)
      .json({
        success: false,
        message:
          "Invalid ID format"
      });
  }

  if (
    error.code === 11000
  ) {
    if (
      error.keyPattern
        ?.invoiceNumber
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invoice number already exists"
        });
    }

    return res
      .status(400)
      .json({
        success: false,

        message:
          "A fee invoice already exists for this student in the selected month and session"
      });
  }

  return res
    .status(500)
    .json({
      success: false,
      message: defaultMessage,
      error: error.message
    });
};

/*
|--------------------------------------------------------------------------
| Invoice Number Generation
|--------------------------------------------------------------------------
*/

const generateInvoiceNumber =
  () => {
    const year =
      new Date().getFullYear();

    const timestamp =
      Date.now()
        .toString()
        .slice(-6);

    const randomNumber =
      Math.floor(
        1000 +
          Math.random() * 9000
      );

    return (
      `INV-${year}-` +
      `${timestamp}${randomNumber}`
    );
  };

const generateUniqueInvoiceNumber =
  async () => {
    let attempts = 0;

    while (attempts < 10) {
      const invoiceNumber =
        generateInvoiceNumber();

      const existingInvoice =
        await FeeCollection.exists({
          invoiceNumber
        });

      if (!existingInvoice) {
        return invoiceNumber;
      }

      attempts += 1;
    }

    throw new Error(
      "Failed to generate a unique invoice number"
    );
  };

/*
|--------------------------------------------------------------------------
| Receipt Number Generation
|--------------------------------------------------------------------------
*/

const generateReceiptNumber =
  () => {
    const year =
      new Date().getFullYear();

    const timestamp =
      Date.now()
        .toString()
        .slice(-6);

    const randomNumber =
      Math.floor(
        1000 +
          Math.random() * 9000
      );

    return (
      `RCT-${year}-` +
      `${timestamp}${randomNumber}`
    );
  };

const generateUniqueReceiptNumber =
  async () => {
    let attempts = 0;

    while (attempts < 10) {
      const receiptNumber =
        generateReceiptNumber();

      const existingReceipt =
        await FeeCollection.exists({
          "payments.receiptNumber":
            receiptNumber
        });

      if (!existingReceipt) {
        return receiptNumber;
      }

      attempts += 1;
    }

    throw new Error(
      "Failed to generate a unique receipt number"
    );
  };

/*
|--------------------------------------------------------------------------
| Populate Fee Collection
|--------------------------------------------------------------------------
*/

const populateFeeCollection = (
  query
) => {
  return query
    .populate(
      "schoolId",
      "schoolName type isActive"
    )
    .populate(
      "studentId",
      [
        "name",
        "fatherName",
        "admissionNumber",
        "sectionName",
        "contactNumber",
        "status",
        "studentUserId"
      ].join(" ")
    )
    .populate(
      "classId",
      "className numericOrder"
    )
    .populate(
      "feeStructureId",
      [
        "title",
        "sessionYear",
        "monthlyFee",
        "admissionFee",
        "examFee",
        "transportFee",
        "otherFee",
        "isActive",
        "isDeleted"
      ].join(" ")
    )
    .populate(
      "payments.receivedBy",
      "name email role"
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
| Validate Payment Method
|--------------------------------------------------------------------------
*/

const validatePaymentMethod = (
  paymentMethod
) => {
  const finalMethod =
    paymentMethod || "cash";

  if (
    !PAYMENT_METHODS.includes(
      finalMethod
    )
  ) {
    return {
      error:
        "Payment method must be cash, bank, online or cheque"
    };
  }

  return {
    value: finalMethod
  };
};

/*
|--------------------------------------------------------------------------
| Build List Filter
|--------------------------------------------------------------------------
*/

const buildFeeCollectionFilter = async (
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
  | School Filter
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
  | Student Filter
  */

  if (req.query.studentId) {
    if (
      !isValidObjectId(
        req.query.studentId
      )
    ) {
      return {
        invalid: true,
        message:
          "Invalid student ID format"
      };
    }

    filter.studentId =
      req.query.studentId;
  }

  /*
  | Fee Structure Filter
  */

  if (
    req.query.feeStructureId
  ) {
    if (
      !isValidObjectId(
        req.query.feeStructureId
      )
    ) {
      return {
        invalid: true,
        message:
          "Invalid fee structure ID format"
      };
    }

    filter.feeStructureId =
      req.query.feeStructureId;
  }

  /*
  | Fee Month Filter
  */

  if (req.query.feeMonth) {
    if (
      !isValidFeeMonth(
        req.query.feeMonth
      )
    ) {
      return {
        invalid: true,

        message:
          "Invalid fee month format. Use YYYY-MM"
      };
    }

    filter.feeMonth =
      req.query.feeMonth;
  }

  /*
  | Session Year Filter
  */

  if (
    req.query.sessionYear &&
    req.query.sessionYear.trim()
  ) {
    filter.sessionYear =
      req.query.sessionYear.trim();
  }

  /*
  | Payment Status Filter
  */

  if (
    req.query.paymentStatus
  ) {
    if (
      !PAYMENT_STATUSES.includes(
        req.query.paymentStatus
      )
    ) {
      return {
        invalid: true,
        message:
          "Invalid payment status"
      };
    }

    filter.paymentStatus =
      req.query.paymentStatus;
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

    const studentFilter = {
      ...getSchoolFilter(req),
      isDeleted: {
        $ne: true
      }
    };

    if (
      isSuperAdmin(req) &&
      req.query.schoolId
    ) {
      studentFilter.schoolId =
        req.query.schoolId;
    }

    if (
      req.query.classId
    ) {
      studentFilter.classId =
        req.query.classId;
    }

    const matchingStudents =
      await Student.find({
        ...studentFilter,

        $or: [
          {
            name:
              searchRegex
          },
          {
            fatherName:
              searchRegex
          },
          {
            admissionNumber:
              searchRegex
          }
        ]
      }).select("_id");

    const studentIds =
      matchingStudents.map(
        (student) =>
          student._id
      );

    filter.$or = [
      {
        invoiceNumber:
          searchRegex
      },
      {
        studentId: {
          $in: studentIds
        }
      }
    ];
  }

  return filter;
};

/*
|--------------------------------------------------------------------------
| Create Fee Invoice and Collect Initial Payment
|--------------------------------------------------------------------------
*/

exports.collectFee = async (
  req,
  res
) => {
  try {
    const {
      studentId,
      feeStructureId,
      feeMonth,
      sessionYear,
      dueDate,
      discount,
      fine,
      paidAmount,
      paymentMethod,
      paymentDate,
      referenceNumber,
      remarks,
      notes
    } = req.body;

    /*
    | Required Fields
    */

    if (
      !studentId ||
      !feeStructureId ||
      !feeMonth ||
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
            "Student, fee structure, fee month and session year are required"
        });
    }

    /*
    | ID Validation
    */

    if (
      !isValidObjectId(
        studentId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid student ID format"
        });
    }

    if (
      !isValidObjectId(
        feeStructureId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid fee structure ID format"
        });
    }

    /*
    | Fee Month Validation
    */

    if (
      !isValidFeeMonth(
        feeMonth
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid fee month format. Use YYYY-MM"
        });
    }

    /*
    | Number Validation
    */

    const finalDiscount =
      toNumber(discount, 0);

    const finalFine =
      toNumber(fine, 0);

    const finalPaidAmount =
      toNumber(paidAmount, 0);

    if (
      finalDiscount === null ||
      finalDiscount < 0
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Discount must be a valid non-negative number"
        });
    }

    if (
      finalFine === null ||
      finalFine < 0
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Fine must be a valid non-negative number"
        });
    }

    if (
      finalPaidAmount ===
        null ||
      finalPaidAmount < 0
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Paid amount must be a valid non-negative number"
        });
    }

    /*
    | Due Date Validation
    */

    const dueDateResult =
      parseOptionalDate(
        dueDate
      );

    if (
      dueDateResult.error
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid due date format"
        });
    }

    /*
    | Payment Date Validation
    */

    const paymentDateResult =
      parseOptionalDate(
        paymentDate
      );

    if (
      paymentDateResult.error
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid payment date format"
        });
    }

    /*
    | Student Verification
    */

    const student =
      await Student.findOne(
        getScopedFilter(
          req,
          {
            _id: studentId,

            isDeleted: {
              $ne: true
            }
          }
        )
      );

    if (!student) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Student not found or access is not allowed"
        });
    }

    if (
      student.status &&
      student.status !== "active"
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Fee invoice can only be created for an active student"
        });
    }

    /*
    | Fee Structure Verification
    */

    const feeStructure =
      await FeeStructure.findOne(
        getScopedFilter(
          req,
          {
            _id:
              feeStructureId,

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

    if (
      feeStructure.isActive ===
      false
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Fee structure is inactive"
        });
    }

    /*
    | School Verification
    */

    if (
      student.schoolId.toString() !==
      feeStructure.schoolId.toString()
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Student and fee structure do not belong to the same school"
        });
    }

    /*
    | Class Verification
    */

    if (
      student.classId.toString() !==
      feeStructure.classId.toString()
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Student and fee structure do not belong to the same class"
        });
    }

    /*
    | Session Verification
    */

    const finalSessionYear =
      String(
        sessionYear
      ).trim();

    if (
      feeStructure.sessionYear !==
      finalSessionYear
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Fee structure session year does not match the selected session"
        });
    }

    /*
    | Existing Invoice Check
    */

    const existingFee =
      await FeeCollection.findOne(
        getScopedFilter(
          req,
          {
            studentId,
            feeMonth,
            sessionYear:
              finalSessionYear
          }
        )
      );

    if (existingFee) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            existingFee.isDeleted
              ? "A deleted fee invoice already exists for this student and month. Restore that invoice instead."
              : "A fee invoice already exists for this student in the selected month"
        });
    }

    /*
    | Calculate Payable Amount
    */

    const totalAmount =
      calculateTotalAmount(
        feeStructure
      );

    const payableAmount =
      totalAmount +
      finalFine -
      finalDiscount;

    if (
      payableAmount < 0
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Discount cannot exceed the total fee and fine"
        });
    }

    if (
      finalPaidAmount >
      payableAmount
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Paid amount cannot be greater than the payable amount"
        });
    }

    /*
    | Prepare Initial Payment
    */

    const payments = [];

    if (
      finalPaidAmount > 0
    ) {
      const methodResult =
        validatePaymentMethod(
          paymentMethod
        );

      if (
        methodResult.error
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              methodResult.error
          });
      }

      const receiptNumber =
        await generateUniqueReceiptNumber();

      payments.push({
        amount:
          finalPaidAmount,

        paymentMethod:
          methodResult.value,

        paymentDate:
          paymentDateResult.value ||
          new Date(),

        receiptNumber,

        referenceNumber:
          String(
            referenceNumber || ""
          ).trim(),

        remarks:
          String(
            remarks || ""
          ).trim(),

        receivedBy:
          req.user._id
      });
    }

    /*
    | Generate Invoice Number
    */

    const invoiceNumber =
      await generateUniqueInvoiceNumber();

    /*
    | Create Fee Collection
    */

    const feeCollection =
      await FeeCollection.create({
        schoolId:
          student.schoolId,

        studentId,

        classId:
          student.classId,

        feeStructureId,

        feeMonth,

        sessionYear:
          finalSessionYear,

        dueDate:
          dueDateResult.value,

        invoiceNumber,

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

        discount:
          finalDiscount,

        fine:
          finalFine,

        payments,

        notes:
          String(
            notes || ""
          ).trim(),

        createdBy:
          req.user._id,

        updatedBy:
          req.user._id,

        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      });

    /*
    | Audit Log
    */

    await createAuditLog({
      req,

      schoolId:
        feeCollection.schoolId,

      action: "CREATE",

      module:
        "FEE_COLLECTION",

      recordId:
        feeCollection._id,

      recordModel:
        "FeeCollection",

      description:
        `Fee invoice ${invoiceNumber} created for student ${student.name}`,

      oldData: null,

      newData:
        getPlainData(
          feeCollection
        ),

      status: "success",

      metadata: {
        invoiceNumber,
        studentId,

        classId:
          student.classId,

        feeStructureId,
        feeMonth,

        sessionYear:
          finalSessionYear,

        totalAmount,

        payableAmount,

        paidAmount:
          finalPaidAmount,

        paymentStatus:
          feeCollection.paymentStatus
      }
    });

    /*
    | Populate Response
    */

    const populatedFeeCollection =
      await populateFeeCollection(
        FeeCollection.findById(
          feeCollection._id
        )
      );

    return res
      .status(201)
      .json({
        success: true,

        message:
          finalPaidAmount > 0
            ? "Fee invoice created and payment collected successfully"
            : "Fee invoice created successfully",

        feeCollection:
          populatedFeeCollection
      });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to create fee invoice"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Add Payment
|--------------------------------------------------------------------------
*/

exports.addPayment = async (
  req,
  res
) => {
  try {
    const {
      amount,
      paymentMethod,
      paymentDate,
      referenceNumber,
      remarks
    } = req.body;

    const paymentAmount =
      toNumber(
        amount,
        null
      );

    if (
      paymentAmount === null ||
      paymentAmount <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Payment amount must be greater than zero"
        });
    }

    /*
    | Payment Method
    */

    const methodResult =
      validatePaymentMethod(
        paymentMethod
      );

    if (
      methodResult.error
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            methodResult.error
        });
    }

    /*
    | Payment Date
    */

    const paymentDateResult =
      parseOptionalDate(
        paymentDate
      );

    if (
      paymentDateResult.error
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid payment date format"
        });
    }

    /*
    | Find Invoice
    */

    const feeCollection =
      await FeeCollection.findOne(
        getScopedFilter(
          req,
          {
            _id: req.params.id,

            isDeleted: {
              $ne: true
            }
          }
        )
      );

    if (!feeCollection) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Fee collection record not found or access is not allowed"
        });
    }

    const oldData =
      getPlainData(
        feeCollection
      );

    const currentPaidAmount =
      calculatePaidAmount(
        feeCollection.payments
      );

    const currentBalanceAmount =
      Math.max(
        0,

        Number(
          feeCollection.payableAmount ||
            0
        ) -
          currentPaidAmount
      );

    if (
      currentBalanceAmount <= 0 ||
      feeCollection.paymentStatus ===
        "paid"
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "This fee invoice is already fully paid"
        });
    }

    if (
      paymentAmount >
      currentBalanceAmount
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Payment amount cannot be greater than the remaining balance"
        });
    }

    /*
    | Generate Receipt
    */

    const receiptNumber =
      await generateUniqueReceiptNumber();

    /*
    | Add Payment
    */

    feeCollection.payments.push({
      amount:
        paymentAmount,

      paymentMethod:
        methodResult.value,

      paymentDate:
        paymentDateResult.value ||
        new Date(),

      receiptNumber,

      referenceNumber:
        String(
          referenceNumber || ""
        ).trim(),

      remarks:
        String(
          remarks || ""
        ).trim(),

      receivedBy:
        req.user._id
    });

    feeCollection.updatedBy =
      req.user._id;

    await feeCollection.save();

    /*
    | Audit Log
    */

    await createAuditLog({
      req,

      schoolId:
        feeCollection.schoolId,

      action: "PAYMENT",

      module:
        "FEE_COLLECTION",

      recordId:
        feeCollection._id,

      recordModel:
        "FeeCollection",

      description:
        `Payment ${receiptNumber} added against invoice ${feeCollection.invoiceNumber}`,

      oldData,

      newData:
        getPlainData(
          feeCollection
        ),

      status: "success",

      metadata: {
        invoiceNumber:
          feeCollection.invoiceNumber,

        receiptNumber,

        paymentAmount,

        paymentMethod:
          methodResult.value,

        previousPaidAmount:
          currentPaidAmount,

        newPaidAmount:
          feeCollection.paidAmount,

        previousBalanceAmount:
          currentBalanceAmount,

        newBalanceAmount:
          feeCollection.balanceAmount,

        previousPaymentStatus:
          oldData.paymentStatus,

        newPaymentStatus:
          feeCollection.paymentStatus
      }
    });

    /*
    | Populate Response
    */

    const populatedFeeCollection =
      await populateFeeCollection(
        FeeCollection.findById(
          feeCollection._id
        )
      );

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Payment added successfully",

        receiptNumber,

        feeCollection:
          populatedFeeCollection
      });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Failed to add payment"
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Fee Collections
|--------------------------------------------------------------------------
*/

exports.getFeeCollections =
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
        await buildFeeCollectionFilter(
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
        feeCollections,
        total
      ] = await Promise.all([
        populateFeeCollection(
          FeeCollection.find(
            filter
          )
        )
          .sort({
            createdAt: -1
          })
          .skip(skip)
          .limit(limit),

        FeeCollection.countDocuments(
          filter
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,

          count:
            feeCollections.length,

          pagination:
            buildPagination({
              total,
              page,
              limit
            }),

          feeCollections
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "Failed to fetch fee collections"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Fee Collections
|--------------------------------------------------------------------------
*/

exports.getDeletedFeeCollections =
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
        await buildFeeCollectionFilter(
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
        feeCollections,
        total
      ] = await Promise.all([
        populateFeeCollection(
          FeeCollection.find(
            filter
          )
        )
          .sort({
            deletedAt: -1,
            updatedAt: -1
          })
          .skip(skip)
          .limit(limit),

        FeeCollection.countDocuments(
          filter
        )
      ]);

      return res
        .status(200)
        .json({
          success: true,

          count:
            feeCollections.length,

          pagination:
            buildPagination({
              total,
              page,
              limit
            }),

          feeCollections
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,

        "Failed to fetch deleted fee collections"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Get Fee Collection by ID
|--------------------------------------------------------------------------
*/

exports.getFeeCollectionById =
  async (req, res) => {
    try {
      const feeCollection =
        await populateFeeCollection(
          FeeCollection.findOne(
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

      if (!feeCollection) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Fee collection record not found or access is not allowed"
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          feeCollection
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,

        "Failed to fetch fee collection"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Update Fee Collection
|--------------------------------------------------------------------------
|
| Financial identity fields are not editable:
| schoolId, studentId, classId, feeStructureId, feeMonth and sessionYear.
|
*/

exports.updateFeeCollection =
  async (req, res) => {
    try {
      const feeCollection =
        await FeeCollection.findOne(
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

      if (!feeCollection) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Fee collection record not found or access is not allowed"
          });
      }

      const oldData =
        getPlainData(
          feeCollection
        );

      /*
      | Due Date
      */

      if (
        req.body.dueDate !==
        undefined
      ) {
        const dueDateResult =
          parseOptionalDate(
            req.body.dueDate
          );

        if (
          dueDateResult.error
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid due date format"
            });
        }

        feeCollection.dueDate =
          dueDateResult.value;
      }

      /*
      | Discount
      */

      if (
        req.body.discount !==
        undefined
      ) {
        const discount =
          toNumber(
            req.body.discount,
            null
          );

        if (
          discount === null ||
          discount < 0
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Discount must be a valid non-negative number"
            });
        }

        feeCollection.discount =
          discount;
      }

      /*
      | Fine
      */

      if (
        req.body.fine !==
        undefined
      ) {
        const fine =
          toNumber(
            req.body.fine,
            null
          );

        if (
          fine === null ||
          fine < 0
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Fine must be a valid non-negative number"
            });
        }

        feeCollection.fine =
          fine;
      }

      /*
      | Notes
      */

      if (
        req.body.notes !==
        undefined
      ) {
        feeCollection.notes =
          String(
            req.body.notes || ""
          ).trim();
      }

      /*
      | Validate Updated Payable Amount
      */

      const totalAmount =
        calculateTotalAmount(
          feeCollection
        );

      const updatedPayableAmount =
        totalAmount +
        Number(
          feeCollection.fine || 0
        ) -
        Number(
          feeCollection.discount || 0
        );

      const currentPaidAmount =
        calculatePaidAmount(
          feeCollection.payments
        );

      if (
        updatedPayableAmount < 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Discount cannot exceed the total fee and fine"
          });
      }

      if (
        updatedPayableAmount <
        currentPaidAmount
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Updated payable amount cannot be less than the amount already paid"
          });
      }

      feeCollection.updatedBy =
        req.user._id;

      await feeCollection.save();

      /*
      | Audit Log
      */

      await createAuditLog({
        req,

        schoolId:
          feeCollection.schoolId,

        action: "UPDATE",

        module:
          "FEE_COLLECTION",

        recordId:
          feeCollection._id,

        recordModel:
          "FeeCollection",

        description:
          `Fee invoice ${feeCollection.invoiceNumber} updated successfully`,

        oldData,

        newData:
          getPlainData(
            feeCollection
          ),

        status: "success",

        metadata: {
          invoiceNumber:
            feeCollection.invoiceNumber,

          discount:
            feeCollection.discount,

          fine:
            feeCollection.fine,

          payableAmount:
            feeCollection.payableAmount,

          paidAmount:
            feeCollection.paidAmount,

          balanceAmount:
            feeCollection.balanceAmount,

          paymentStatus:
            feeCollection.paymentStatus
        }
      });

      /*
      | Populate Response
      */

      const populatedFeeCollection =
        await populateFeeCollection(
          FeeCollection.findById(
            feeCollection._id
          )
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Fee collection updated successfully",

          feeCollection:
            populatedFeeCollection
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,

        "Failed to update fee collection"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Fee Collection
|--------------------------------------------------------------------------
*/

exports.deleteFeeCollection =
  async (req, res) => {
    try {
      const feeCollection =
        await FeeCollection.findOne(
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

      if (!feeCollection) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Fee collection record not found or access is not allowed"
          });
      }

      const oldData =
        getPlainData(
          feeCollection
        );

      feeCollection.isDeleted =
        true;

      feeCollection.deletedAt =
        new Date();

      feeCollection.deletedBy =
        req.user._id;

      feeCollection.updatedBy =
        req.user._id;

      await feeCollection.save();

      /*
      | Audit Log
      */

      await createAuditLog({
        req,

        schoolId:
          feeCollection.schoolId,

        action: "DELETE",

        module:
          "FEE_COLLECTION",

        recordId:
          feeCollection._id,

        recordModel:
          "FeeCollection",

        description:
          `Fee invoice ${feeCollection.invoiceNumber} soft deleted successfully`,

        oldData,

        newData:
          getPlainData(
            feeCollection
          ),

        status: "success",

        metadata: {
          invoiceNumber:
            feeCollection.invoiceNumber,

          studentId:
            feeCollection.studentId,

          classId:
            feeCollection.classId,

          feeMonth:
            feeCollection.feeMonth,

          sessionYear:
            feeCollection.sessionYear,

          payableAmount:
            feeCollection.payableAmount,

          paidAmount:
            feeCollection.paidAmount,

          paymentStatus:
            feeCollection.paymentStatus,

          softDelete: true
        }
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Fee collection deleted successfully",

          feeCollection
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,

        "Failed to delete fee collection"
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Restore Fee Collection
|--------------------------------------------------------------------------
*/

exports.restoreFeeCollection =
  async (req, res) => {
    try {
      const feeCollection =
        await FeeCollection.findOne(
          getScopedFilter(
            req,
            {
              _id:
                req.params.id,

              isDeleted: true
            }
          )
        );

      if (!feeCollection) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Deleted fee collection record not found or access is not allowed"
          });
      }

      /*
      | Duplicate Active Invoice Check
      */

      const duplicateInvoice =
        await FeeCollection.findOne({
          _id: {
            $ne:
              feeCollection._id
          },

          schoolId:
            feeCollection.schoolId,

          studentId:
            feeCollection.studentId,

          feeMonth:
            feeCollection.feeMonth,

          sessionYear:
            feeCollection.sessionYear,

          isDeleted: {
            $ne: true
          }
        });

      if (
        duplicateInvoice
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "An active fee invoice already exists for this student and month"
          });
      }

      const oldData =
        getPlainData(
          feeCollection
        );

      feeCollection.isDeleted =
        false;

      feeCollection.deletedAt =
        null;

      feeCollection.deletedBy =
        null;

      feeCollection.updatedBy =
        req.user._id;

      await feeCollection.save();

      /*
      | Audit Log
      */

      await createAuditLog({
        req,

        schoolId:
          feeCollection.schoolId,

        action: "UPDATE",

        module:
          "FEE_COLLECTION",

        recordId:
          feeCollection._id,

        recordModel:
          "FeeCollection",

        description:
          `Fee invoice ${feeCollection.invoiceNumber} restored successfully`,

        oldData,

        newData:
          getPlainData(
            feeCollection
          ),

        status: "success",

        metadata: {
          invoiceNumber:
            feeCollection.invoiceNumber,

          studentId:
            feeCollection.studentId,

          feeMonth:
            feeCollection.feeMonth,

          sessionYear:
            feeCollection.sessionYear,

          restored: true
        }
      });

      /*
      | Populate Response
      */

      const populatedFeeCollection =
        await populateFeeCollection(
          FeeCollection.findById(
            feeCollection._id
          )
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Fee collection restored successfully",

          feeCollection:
            populatedFeeCollection
        });
    } catch (error) {
      return handleControllerError(
        res,
        error,

        "Failed to restore fee collection"
      );
    }
  };