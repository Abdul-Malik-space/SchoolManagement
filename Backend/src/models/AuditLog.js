const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const AUDIT_ACTIONS = [
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

const AUDIT_STATUSES = [
  "success",
  "failed"
];

/*
|--------------------------------------------------------------------------
| Audit Log Schema
|--------------------------------------------------------------------------
|
| Audit logs system کی اہم activities محفوظ کرتے ہیں، مثلاً:
|
| - Record create/update/delete
| - Login/logout
| - Fee payment
| - Attendance
| - Status changes
|
*/

const auditLogSchema =
  new mongoose.Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | School
      |--------------------------------------------------------------------------
      |
      | Super Admin کی global activity میں schoolId null ہو سکتا ہے۔
      |
      */

      schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        default: null
      },

      /*
      |--------------------------------------------------------------------------
      | User Information
      |--------------------------------------------------------------------------
      |
      | userName، userEmail اور userRole snapshot کے طور پر محفوظ کیے جاتے ہیں۔
      | بعد میں user delete یا update ہونے کے باوجود audit information رہے گی۔
      |
      */

      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [
          true,
          "User ID is required"
        ]
      },

      userName: {
        type: String,
        trim: true,
        maxlength: [
          150,
          "User name cannot exceed 150 characters"
        ],
        default: ""
      },

      userEmail: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [
          200,
          "User email cannot exceed 200 characters"
        ],
        default: ""
      },

      userRole: {
        type: String,
        required: [
          true,
          "User role is required"
        ],
        trim: true,
        lowercase: true,
        maxlength: [
          60,
          "User role cannot exceed 60 characters"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Action
      |--------------------------------------------------------------------------
      */

      action: {
        type: String,
        required: [
          true,
          "Audit action is required"
        ],
        trim: true,
        uppercase: true,
        enum: {
          values: AUDIT_ACTIONS,
          message:
            "Invalid audit action"
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Module
      |--------------------------------------------------------------------------
      |
      | Examples:
      |
      | USER
      | STUDENT
      | TEACHER
      | ATTENDANCE
      | FEE_STRUCTURE
      | FEE_COLLECTION
      |
      */

      module: {
        type: String,
        required: [
          true,
          "Audit module is required"
        ],
        trim: true,
        uppercase: true,
        maxlength: [
          100,
          "Module name cannot exceed 100 characters"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Related Record
      |--------------------------------------------------------------------------
      */

      recordId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
      },

      recordModel: {
        type: String,
        trim: true,
        maxlength: [
          100,
          "Record model cannot exceed 100 characters"
        ],
        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Description
      |--------------------------------------------------------------------------
      */

      description: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "Audit description cannot exceed 1000 characters"
        ],
        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Data Changes
      |--------------------------------------------------------------------------
      |
      | oldData:
      | Record update/delete ہونے سے پہلے کی information۔
      |
      | newData:
      | Record create/update/restore ہونے کے بعد کی information۔
      |
      */

      oldData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      },

      newData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      },

      /*
      |--------------------------------------------------------------------------
      | Request Information
      |--------------------------------------------------------------------------
      */

      ipAddress: {
        type: String,
        trim: true,
        maxlength: [
          100,
          "IP address cannot exceed 100 characters"
        ],
        default: ""
      },

      userAgent: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "User agent cannot exceed 1000 characters"
        ],
        default: ""
      },

      requestMethod: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [
          20,
          "Request method cannot exceed 20 characters"
        ],
        default: ""
      },

      requestPath: {
        type: String,
        trim: true,
        maxlength: [
          500,
          "Request path cannot exceed 500 characters"
        ],
        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Operation Status
      |--------------------------------------------------------------------------
      */

      status: {
        type: String,
        enum: {
          values: AUDIT_STATUSES,
          message:
            "Audit status must be success or failed"
        },
        default: "success"
      },

      /*
      |--------------------------------------------------------------------------
      | Additional Information
      |--------------------------------------------------------------------------
      */

      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      },

      /*
      |--------------------------------------------------------------------------
      | Soft Delete
      |--------------------------------------------------------------------------
      |
      | Audit records permanently delete نہیں ہوں گے۔
      | Super Admin انہیں archive/soft delete اور restore کر سکتا ہے۔
      |
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
      timestamps: true,

      /*
      | Mixed fields empty ہوں تو بھی structure محفوظ رہے۔
      */

      minimize: false
    }
  );

/*
|--------------------------------------------------------------------------
| Normalize Fields Before Validation
|--------------------------------------------------------------------------
*/

auditLogSchema.pre(
  "validate",
  function () {
    if (this.action) {
      this.action = String(
        this.action
      )
        .trim()
        .toUpperCase();
    }

    if (this.module) {
      this.module = String(
        this.module
      )
        .trim()
        .toUpperCase();
    }

    if (this.userRole) {
      this.userRole = String(
        this.userRole
      )
        .trim()
        .toLowerCase();
    }

    if (this.userEmail) {
      this.userEmail = String(
        this.userEmail
      )
        .trim()
        .toLowerCase();
    }

    if (this.status) {
      this.status = String(
        this.status
      )
        .trim()
        .toLowerCase();
    }

    if (this.requestMethod) {
      this.requestMethod = String(
        this.requestMethod
      )
        .trim()
        .toUpperCase();
    }
  }
);

/*
|--------------------------------------------------------------------------
| School Audit Log Listing
|--------------------------------------------------------------------------
*/

auditLogSchema.index(
  {
    schoolId: 1,
    isDeleted: 1,
    createdAt: -1
  },
  {
    name:
      "audit_log_school_listing"
  }
);

/*
|--------------------------------------------------------------------------
| User Activity History
|--------------------------------------------------------------------------
*/

auditLogSchema.index(
  {
    userId: 1,
    isDeleted: 1,
    createdAt: -1
  },
  {
    name:
      "audit_log_user_history"
  }
);

/*
|--------------------------------------------------------------------------
| Module and Action Filters
|--------------------------------------------------------------------------
*/

auditLogSchema.index(
  {
    module: 1,
    action: 1,
    isDeleted: 1,
    createdAt: -1
  },
  {
    name:
      "audit_log_module_action_filter"
  }
);

/*
|--------------------------------------------------------------------------
| Status Filter
|--------------------------------------------------------------------------
*/

auditLogSchema.index(
  {
    status: 1,
    isDeleted: 1,
    createdAt: -1
  },
  {
    name:
      "audit_log_status_filter"
  }
);

/*
|--------------------------------------------------------------------------
| Role Filter
|--------------------------------------------------------------------------
*/

auditLogSchema.index(
  {
    userRole: 1,
    isDeleted: 1,
    createdAt: -1
  },
  {
    name:
      "audit_log_role_filter"
  }
);

/*
|--------------------------------------------------------------------------
| Related Record History
|--------------------------------------------------------------------------
*/

auditLogSchema.index(
  {
    recordModel: 1,
    recordId: 1,
    createdAt: -1
  },
  {
    name:
      "audit_log_record_history"
  }
);

/*
|--------------------------------------------------------------------------
| Global Date Sorting
|--------------------------------------------------------------------------
*/

auditLogSchema.index(
  {
    isDeleted: 1,
    createdAt: -1
  },
  {
    name:
      "audit_log_global_listing"
  }
);

/*
|--------------------------------------------------------------------------
| JSON Output
|--------------------------------------------------------------------------
*/

auditLogSchema.set(
  "toJSON",
  {
    virtuals: true,

    transform: (
      document,
      returnedObject
    ) => {
      delete returnedObject.__v;

      return returnedObject;
    }
  }
);

auditLogSchema.set(
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

module.exports =
  mongoose.models.AuditLog ||
  mongoose.model(
    "AuditLog",
    auditLogSchema
  );