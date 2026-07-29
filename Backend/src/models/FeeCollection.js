const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Payment Schema
|--------------------------------------------------------------------------
|
| ایک invoice کے خلاف multiple یا partial payments محفوظ کی جا سکتی ہیں۔
|
*/

const paymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [
        true,
        "Payment amount is required"
      ],
      min: [
        1,
        "Payment amount must be greater than zero"
      ]
    },

    paymentMethod: {
      type: String,
      enum: {
        values: [
          "cash",
          "bank",
          "online",
          "cheque"
        ],
        message:
          "Payment method must be cash, bank, online or cheque"
      },
      default: "cash"
    },

    paymentDate: {
      type: Date,
      default: Date.now
    },

    receiptNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: ""
    },

    referenceNumber: {
      type: String,
      trim: true,
      maxlength: [
        120,
        "Reference number cannot exceed 120 characters"
      ],
      default: ""
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: [
        500,
        "Payment remarks cannot exceed 500 characters"
      ],
      default: ""
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

/*
|--------------------------------------------------------------------------
| Fee Collection Schema
|--------------------------------------------------------------------------
*/

const feeCollectionSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | School and Student
    |--------------------------------------------------------------------------
    */

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [
        true,
        "School ID is required"
      ]
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [
        true,
        "Student ID is required"
      ]
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [
        true,
        "Class ID is required"
      ]
    },

    feeStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeStructure",
      required: [
        true,
        "Fee structure ID is required"
      ]
    },

    /*
    |--------------------------------------------------------------------------
    | Fee Period
    |--------------------------------------------------------------------------
    */

    feeMonth: {
      type: String,
      required: [
        true,
        "Fee month is required"
      ],
      trim: true,
      match: [
        /^\d{4}-(0[1-9]|1[0-2])$/,
        "Fee month must use YYYY-MM format"
      ]
    },

    sessionYear: {
      type: String,
      required: [
        true,
        "Session year is required"
      ],
      trim: true,
      maxlength: [
        30,
        "Session year cannot exceed 30 characters"
      ]
    },

    dueDate: {
      type: Date,
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | Invoice
    |--------------------------------------------------------------------------
    */

    invoiceNumber: {
      type: String,
      required: [
        true,
        "Invoice number is required"
      ],
      unique: true,
      trim: true,
      uppercase: true
    },

    /*
    |--------------------------------------------------------------------------
    | Fee Breakdown
    |--------------------------------------------------------------------------
    */

    monthlyFee: {
      type: Number,
      default: 0,
      min: [
        0,
        "Monthly fee cannot be negative"
      ]
    },

    admissionFee: {
      type: Number,
      default: 0,
      min: [
        0,
        "Admission fee cannot be negative"
      ]
    },

    examFee: {
      type: Number,
      default: 0,
      min: [
        0,
        "Exam fee cannot be negative"
      ]
    },

    transportFee: {
      type: Number,
      default: 0,
      min: [
        0,
        "Transport fee cannot be negative"
      ]
    },

    otherFee: {
      type: Number,
      default: 0,
      min: [
        0,
        "Other fee cannot be negative"
      ]
    },

    /*
    |--------------------------------------------------------------------------
    | Discount and Fine
    |--------------------------------------------------------------------------
    */

    discount: {
      type: Number,
      default: 0,
      min: [
        0,
        "Discount cannot be negative"
      ]
    },

    fine: {
      type: Number,
      default: 0,
      min: [
        0,
        "Fine cannot be negative"
      ]
    },

    /*
    |--------------------------------------------------------------------------
    | Calculated Amounts
    |--------------------------------------------------------------------------
    */

    totalAmount: {
      type: Number,
      default: 0,
      min: [
        0,
        "Total amount cannot be negative"
      ]
    },

    payableAmount: {
      type: Number,
      default: 0,
      min: [
        0,
        "Payable amount cannot be negative"
      ]
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: [
        0,
        "Paid amount cannot be negative"
      ]
    },

    balanceAmount: {
      type: Number,
      default: 0,
      min: [
        0,
        "Balance amount cannot be negative"
      ]
    },

    /*
    |--------------------------------------------------------------------------
    | Payment Status
    |--------------------------------------------------------------------------
    */

    paymentStatus: {
      type: String,
      enum: {
        values: [
          "unpaid",
          "partial",
          "paid"
        ],
        message:
          "Payment status must be unpaid, partial or paid"
      },
      default: "unpaid"
    },

    /*
    |--------------------------------------------------------------------------
    | Payment History
    |--------------------------------------------------------------------------
    */

    payments: {
      type: [paymentSchema],
      default: []
    },

    /*
    |--------------------------------------------------------------------------
    | Notes
    |--------------------------------------------------------------------------
    */

    notes: {
      type: String,
      trim: true,
      maxlength: [
        1000,
        "Invoice notes cannot exceed 1000 characters"
      ],
      default: ""
    },

    /*
    |--------------------------------------------------------------------------
    | Audit Tracking
    |--------------------------------------------------------------------------
    */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | Soft Delete
    |--------------------------------------------------------------------------
    */

    isDeleted: {
      type: Boolean,
      default: false
    },

    deletedAt: {
      type: Date,
      default: null
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

/*
|--------------------------------------------------------------------------
| Unique Student Monthly Invoice
|--------------------------------------------------------------------------
|
| ایک student کا ایک session اور ایک month میں صرف ایک invoice ہوگا۔
|
*/

feeCollectionSchema.index(
  {
    schoolId: 1,
    studentId: 1,
    feeMonth: 1,
    sessionYear: 1
  },
  {
    unique: true,
    name: "unique_student_monthly_fee_invoice"
  }
);

/*
|--------------------------------------------------------------------------
| Listing and Filtering Indexes
|--------------------------------------------------------------------------
*/

feeCollectionSchema.index(
  {
    schoolId: 1,
    isDeleted: 1,
    createdAt: -1
  },
  {
    name: "fee_collection_school_list"
  }
);

feeCollectionSchema.index(
  {
    schoolId: 1,
    classId: 1,
    feeMonth: 1,
    isDeleted: 1
  },
  {
    name: "fee_collection_class_month_filter"
  }
);

feeCollectionSchema.index(
  {
    schoolId: 1,
    paymentStatus: 1,
    isDeleted: 1
  },
  {
    name: "fee_collection_status_filter"
  }
);

feeCollectionSchema.index(
  {
    studentId: 1,
    createdAt: -1
  },
  {
    name: "fee_collection_student_history"
  }
);

/*
|--------------------------------------------------------------------------
| Calculate Invoice Amounts
|--------------------------------------------------------------------------
|
| یہ middleware invoice save ہونے سے پہلے تمام amounts اور status
| خود calculate کرے گا۔
|
*/

feeCollectionSchema.pre(
  "validate",
  function () {
    /*
    |--------------------------------------------------------------------------
    | Normalize Text
    |--------------------------------------------------------------------------
    */

    if (this.feeMonth) {
      this.feeMonth = String(
        this.feeMonth
      ).trim();
    }

    if (this.sessionYear) {
      this.sessionYear = String(
        this.sessionYear
      ).trim();
    }

    if (this.invoiceNumber) {
      this.invoiceNumber = String(
        this.invoiceNumber
      )
        .trim()
        .toUpperCase();
    }

    /*
    |--------------------------------------------------------------------------
    | Convert Fee Values to Numbers
    |--------------------------------------------------------------------------
    */

    const monthlyFee = Number(
      this.monthlyFee || 0
    );

    const admissionFee = Number(
      this.admissionFee || 0
    );

    const examFee = Number(
      this.examFee || 0
    );

    const transportFee = Number(
      this.transportFee || 0
    );

    const otherFee = Number(
      this.otherFee || 0
    );

    const discount = Number(
      this.discount || 0
    );

    const fine = Number(
      this.fine || 0
    );

    /*
    |--------------------------------------------------------------------------
    | Calculate Original Total
    |--------------------------------------------------------------------------
    */

    this.totalAmount =
      monthlyFee +
      admissionFee +
      examFee +
      transportFee +
      otherFee;

    /*
    |--------------------------------------------------------------------------
    | Validate Discount
    |--------------------------------------------------------------------------
    */

    const amountBeforeDiscount =
      this.totalAmount + fine;

    if (
      discount >
      amountBeforeDiscount
    ) {
      this.invalidate(
        "discount",
        "Discount cannot exceed the total fee and fine"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Calculate Payable Amount
    |--------------------------------------------------------------------------
    */

    this.payableAmount =
      Math.max(
        0,
        amountBeforeDiscount -
          discount
      );

    /*
    |--------------------------------------------------------------------------
    | Calculate Paid Amount
    |--------------------------------------------------------------------------
    */

    const payments =
      Array.isArray(
        this.payments
      )
        ? this.payments
        : [];

    this.paidAmount =
      payments.reduce(
        (total, payment) => {
          const amount = Number(
            payment?.amount || 0
          );

          return total + amount;
        },
        0
      );

    /*
    |--------------------------------------------------------------------------
    | Prevent Overpayment
    |--------------------------------------------------------------------------
    */

    if (
      this.paidAmount >
      this.payableAmount
    ) {
      this.invalidate(
        "payments",
        "Total paid amount cannot exceed the payable amount"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Calculate Balance
    |--------------------------------------------------------------------------
    */

    this.balanceAmount =
      Math.max(
        0,
        this.payableAmount -
          this.paidAmount
      );

    /*
    |--------------------------------------------------------------------------
    | Determine Payment Status
    |--------------------------------------------------------------------------
    */

    if (
      this.payableAmount === 0
    ) {
      this.paymentStatus =
        "paid";

      this.balanceAmount = 0;

      return;
    }

    if (
      this.paidAmount <= 0
    ) {
      this.paymentStatus =
        "unpaid";

      return;
    }

    if (
      this.paidAmount <
      this.payableAmount
    ) {
      this.paymentStatus =
        "partial";

      return;
    }

    this.paymentStatus =
      "paid";

    this.balanceAmount = 0;
  }
);

/*
|--------------------------------------------------------------------------
| Payment Count Virtual
|--------------------------------------------------------------------------
*/

feeCollectionSchema
  .virtual("paymentCount")
  .get(function () {
    if (
      !Array.isArray(
        this.payments
      )
    ) {
      return 0;
    }

    return this.payments.length;
  });

/*
|--------------------------------------------------------------------------
| Last Payment Virtual
|--------------------------------------------------------------------------
*/

feeCollectionSchema
  .virtual("lastPayment")
  .get(function () {
    if (
      !Array.isArray(
        this.payments
      ) ||
      this.payments.length === 0
    ) {
      return null;
    }

    return this.payments[
      this.payments.length - 1
    ];
  });

/*
|--------------------------------------------------------------------------
| Include Virtual Fields
|--------------------------------------------------------------------------
*/

feeCollectionSchema.set(
  "toJSON",
  {
    virtuals: true
  }
);

feeCollectionSchema.set(
  "toObject",
  {
    virtuals: true
  }
);

/*
|--------------------------------------------------------------------------
| Export Model
|--------------------------------------------------------------------------
*/

module.exports = mongoose.model(
  "FeeCollection",
  feeCollectionSchema
);