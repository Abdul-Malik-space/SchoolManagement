const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Parent–Student Link Constants
|--------------------------------------------------------------------------
*/

const RELATIONSHIP_TYPES = [
  "father",
  "mother",
  "guardian",
  "grandfather",
  "grandmother",
  "brother",
  "sister",
  "uncle",
  "aunt",
  "other"
];

const LINK_STATUSES = [
  "pending",
  "active",
  "suspended",
  "revoked"
];

const VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "rejected"
];

const VERIFICATION_METHODS = [
  "school_record",
  "manual",
  "document",
  "email_otp",
  "phone_otp",
  "invitation",
  "other"
];

const LINK_SOURCES = [
  "admin_created",
  "school_import",
  "parent_request",
  "invitation",
  "other"
];

const ACCESS_FEATURES = [
  "dashboard",
  "studentProfile",
  "attendance",
  "timetable",
  "academics",
  "fees",
  "receipts",
  "notices",
  "messages",
  "documents"
];

/*
|--------------------------------------------------------------------------
| Access Permission Schema
|--------------------------------------------------------------------------
*/

const accessPermissionsSchema =
  new mongoose.Schema(
    {
      dashboard: {
        type: Boolean,
        default: true
      },

      studentProfile: {
        type: Boolean,
        default: true
      },

      attendance: {
        type: Boolean,
        default: true
      },

      timetable: {
        type: Boolean,
        default: true
      },

      academics: {
        type: Boolean,
        default: true
      },

      fees: {
        type: Boolean,
        default: true
      },

      receipts: {
        type: Boolean,
        default: true
      },

      notices: {
        type: Boolean,
        default: true
      },

      messages: {
        type: Boolean,
        default: true
      },

      documents: {
        type: Boolean,
        default: false
      }
    },
    {
      _id: false,
      timestamps: false
    }
  );

/*
|--------------------------------------------------------------------------
| Notification Preference Schema
|--------------------------------------------------------------------------
*/

const notificationPreferencesSchema =
  new mongoose.Schema(
    {
      inApp: {
        type: Boolean,
        default: true
      },

      email: {
        type: Boolean,
        default: true
      },

      sms: {
        type: Boolean,
        default: false
      },

      attendanceAlerts: {
        type: Boolean,
        default: true
      },

      feeAlerts: {
        type: Boolean,
        default: true
      },

      academicUpdates: {
        type: Boolean,
        default: true
      },

      timetableUpdates: {
        type: Boolean,
        default: true
      },

      noticeAlerts: {
        type: Boolean,
        default: true
      },

      messageAlerts: {
        type: Boolean,
        default: true
      }
    },
    {
      _id: false,
      timestamps: false
    }
  );

/*
|--------------------------------------------------------------------------
| Parent–Student Link Schema
|--------------------------------------------------------------------------
*/

const parentStudentLinkSchema =
  new mongoose.Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | School Scope
      |--------------------------------------------------------------------------
      */

      schoolId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "School",

        required: [
          true,
          "School ID is required"
        ],

        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Parent and Student References
      |--------------------------------------------------------------------------
      */

      parentUserId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: [
          true,
          "Parent user is required"
        ],

        index: true
      },

      studentId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Student",

        required: [
          true,
          "Student is required"
        ],

        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Relationship Information
      |--------------------------------------------------------------------------
      */

      relationship: {
        type: String,

        enum: {
          values:
            RELATIONSHIP_TYPES,

          message:
            "{VALUE} is not a valid parent relationship"
        },

        required: [
          true,
          "Parent relationship is required"
        ],

        default: "guardian",

        index: true
      },

      customRelationship: {
        type: String,
        trim: true,

        maxlength: [
          80,
          "Custom relationship cannot exceed 80 characters"
        ],

        default: ""
      },

      isPrimary: {
        type: Boolean,
        default: false,
        index: true
      },

      isEmergencyContact: {
        type: Boolean,
        default: false
      },

      canCollectStudent: {
        type: Boolean,
        default: false
      },

      /*
      |--------------------------------------------------------------------------
      | Portal Access
      |--------------------------------------------------------------------------
      */

      accessPermissions: {
        type:
          accessPermissionsSchema,

        default: () => ({})
      },

      notificationPreferences: {
        type:
          notificationPreferencesSchema,

        default: () => ({})
      },

      preferredLanguage: {
        type: String,
        trim: true,
        lowercase: true,
        default: "en",

        maxlength: [
          20,
          "Preferred language cannot exceed 20 characters"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Link State
      |--------------------------------------------------------------------------
      */

      status: {
        type: String,

        enum: {
          values:
            LINK_STATUSES,

          message:
            "{VALUE} is not a valid link status"
        },

        default: "pending",

        index: true
      },

      linkSource: {
        type: String,

        enum: {
          values:
            LINK_SOURCES,

          message:
            "{VALUE} is not a valid link source"
        },

        default:
          "admin_created"
      },

      linkedAt: {
        type: Date,
        default: Date.now
      },

      activatedAt: {
        type: Date,
        default: null
      },

      suspendedAt: {
        type: Date,
        default: null
      },

      suspendedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",
        default: null
      },

      suspensionReason: {
        type: String,
        trim: true,

        maxlength: [
          500,
          "Suspension reason cannot exceed 500 characters"
        ],

        default: ""
      },

      revokedAt: {
        type: Date,
        default: null
      },

      revokedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",
        default: null
      },

      revocationReason: {
        type: String,
        trim: true,

        maxlength: [
          500,
          "Revocation reason cannot exceed 500 characters"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Verification
      |--------------------------------------------------------------------------
      */

      verificationStatus: {
        type: String,

        enum: {
          values:
            VERIFICATION_STATUSES,

          message:
            "{VALUE} is not a valid verification status"
        },

        default: "unverified",
        index: true
      },

      verificationMethod: {
        type: String,

        enum: {
          values:
            VERIFICATION_METHODS,

          message:
            "{VALUE} is not a valid verification method"
        },

        default:
          "school_record"
      },

      verifiedAt: {
        type: Date,
        default: null
      },

      verifiedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",
        default: null
      },

      verificationNotes: {
        type: String,
        trim: true,

        maxlength: [
          1000,
          "Verification notes cannot exceed 1000 characters"
        ],

        default: "",
        select: false
      },

      /*
      |--------------------------------------------------------------------------
      | Invitation Workflow
      |--------------------------------------------------------------------------
      |
      | Raw invitation token database میں محفوظ نہیں ہوگا۔
      | Controller صرف hashed token save کرے گا۔
      |
      */

      invitation: {
        email: {
          type: String,
          trim: true,
          lowercase: true,
          default: ""
        },

        tokenHash: {
          type: String,
          default: "",
          select: false
        },

        sentAt: {
          type: Date,
          default: null
        },

        expiresAt: {
          type: Date,
          default: null
        },

        acceptedAt: {
          type: Date,
          default: null
        },

        cancelledAt: {
          type: Date,
          default: null
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Safe Snapshots
      |--------------------------------------------------------------------------
      */

      parentSnapshot: {
        name: {
          type: String,
          trim: true,
          default: ""
        },

        email: {
          type: String,
          trim: true,
          lowercase: true,
          default: ""
        },

        phone: {
          type: String,
          trim: true,
          default: ""
        }
      },

      studentSnapshot: {
        name: {
          type: String,
          trim: true,
          default: ""
        },

        admissionNumber: {
          type: String,
          trim: true,
          default: ""
        },

        className: {
          type: String,
          trim: true,
          default: ""
        },

        sectionName: {
          type: String,
          trim: true,
          default: ""
        },

        photo: {
          type: String,
          trim: true,
          default: ""
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Private School Notes
      |--------------------------------------------------------------------------
      */

      internalNotes: {
        type: String,
        trim: true,

        maxlength: [
          2000,
          "Internal notes cannot exceed 2000 characters"
        ],

        default: "",
        select: false
      },

      /*
      |--------------------------------------------------------------------------
      | Audit Fields
      |--------------------------------------------------------------------------
      */

      createdBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: [
          true,
          "Link creator is required"
        ]
      },

      updatedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

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
        default: false,
        index: true
      },

      deletedAt: {
        type: Date,
        default: null
      },

      deletedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",
        default: null
      },

      deletionReason: {
        type: String,
        trim: true,

        maxlength: [
          500,
          "Deletion reason cannot exceed 500 characters"
        ],

        default: ""
      }
    },
    {
      timestamps: true,

      toJSON: {
        virtuals: true,

        transform: (
          document,
          returnedObject
        ) => {
          delete returnedObject
            .verificationNotes;

          delete returnedObject
            .internalNotes;

          if (
            returnedObject
              .invitation
          ) {
            delete returnedObject
              .invitation
              .tokenHash;
          }

          return returnedObject;
        }
      },

      toObject: {
        virtuals: true
      }
    }
  );

/*
|--------------------------------------------------------------------------
| Database Indexes
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.index(
  {
    schoolId: 1,
    parentUserId: 1,
    studentId: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_parent_student_link"
  }
);

parentStudentLinkSchema.index({
  schoolId: 1,
  parentUserId: 1,
  status: 1,
  isDeleted: 1,
  updatedAt: -1
});

parentStudentLinkSchema.index({
  schoolId: 1,
  studentId: 1,
  status: 1,
  isDeleted: 1,
  isPrimary: -1,
  updatedAt: -1
});

/*
|--------------------------------------------------------------------------
| Only One Primary Parent per Student
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.index(
  {
    schoolId: 1,
    studentId: 1,
    isPrimary: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,
      isPrimary: true,
      status: "active"
    },

    name:
      "one_primary_parent_per_student"
  }
);

parentStudentLinkSchema.index({
  schoolId: 1,
  verificationStatus: 1,
  status: 1,
  isDeleted: 1,
  createdAt: -1
});

parentStudentLinkSchema.index({
  "invitation.email": 1,
  "invitation.expiresAt": 1,
  status: 1,
  isDeleted: 1
});

/*
|--------------------------------------------------------------------------
| Normalize and Validate Link
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.pre(
  "validate",
  function () {
    if (
      this.customRelationship
    ) {
      this.customRelationship =
        this.customRelationship
          .trim()
          .replace(
            /\s+/g,
            " "
          );
    }

    if (
      this.relationship ===
        "other" &&
      !this.customRelationship
    ) {
      this.invalidate(
        "customRelationship",
        "Custom relationship is required when relationship is other"
      );
    }

    if (
      this.relationship !==
      "other"
    ) {
      this.customRelationship =
        "";
    }

    if (
      this.status ===
      "active"
    ) {
      if (!this.activatedAt) {
        this.activatedAt =
          new Date();
      }

      this.suspendedAt = null;
      this.suspendedBy = null;
      this.suspensionReason = "";
      this.revokedAt = null;
      this.revokedBy = null;
      this.revocationReason = "";
    }

    if (
      this.status ===
      "suspended"
    ) {
      if (!this.suspendedAt) {
        this.suspendedAt =
          new Date();
      }

      this.isPrimary = false;
    }

    if (
      this.status ===
      "revoked"
    ) {
      if (!this.revokedAt) {
        this.revokedAt =
          new Date();
      }

      this.isPrimary = false;
    }

    if (
      this.status ===
      "pending"
    ) {
      this.activatedAt = null;
      this.suspendedAt = null;
      this.suspendedBy = null;
      this.suspensionReason = "";
      this.revokedAt = null;
      this.revokedBy = null;
      this.revocationReason = "";
      this.isPrimary = false;
    }

    if (
      this.verificationStatus ===
      "verified"
    ) {
      if (!this.verifiedAt) {
        this.verifiedAt =
          new Date();
      }
    } else {
      this.verifiedAt = null;
      this.verifiedBy = null;
    }

    if (this.isDeleted) {
      if (!this.deletedAt) {
        this.deletedAt =
          new Date();
      }

      this.isPrimary = false;
    } else {
      this.deletedAt = null;
      this.deletedBy = null;
      this.deletionReason = "";
    }

    if (
      this.invitation
        ?.email
    ) {
      this.invitation.email =
        this.invitation.email
          .trim()
          .toLowerCase();
    }
  }
);

/*
|--------------------------------------------------------------------------
| Virtual Properties
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.virtual(
  "isActiveLink"
).get(function () {
  return (
    !this.isDeleted &&
    this.status ===
      "active"
  );
});

parentStudentLinkSchema.virtual(
  "isVerifiedLink"
).get(function () {
  return (
    this.verificationStatus ===
    "verified"
  );
});

parentStudentLinkSchema.virtual(
  "relationshipLabel"
).get(function () {
  if (
    this.relationship ===
      "other" &&
    this.customRelationship
  ) {
    return this.customRelationship;
  }

  return String(
    this.relationship ||
      "guardian"
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
});

parentStudentLinkSchema.virtual(
  "displayStudent"
).get(function () {
  const studentName =
    this.studentSnapshot
      ?.name ||
    "Student";

  const classDetails = [
    this.studentSnapshot
      ?.className,

    this.studentSnapshot
      ?.sectionName
  ]
    .filter(Boolean)
    .join(" - ");

  return classDetails
    ? `${studentName} (${classDetails})`
    : studentName;
});

parentStudentLinkSchema.virtual(
  "displayParent"
).get(function () {
  return (
    this.parentSnapshot
      ?.name ||
    "Parent"
  );
});

/*
|--------------------------------------------------------------------------
| Permission Check
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.methods.hasPermission =
  function (feature) {
    if (
      !ACCESS_FEATURES.includes(
        feature
      )
    ) {
      return false;
    }

    if (
      !this.isActiveLink ||
      !this.isVerifiedLink
    ) {
      return false;
    }

    return Boolean(
      this.accessPermissions
        ?.[feature]
    );
  };

/*
|--------------------------------------------------------------------------
| Activate Link
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.methods.activateLink =
  function ({
    activatedBy = null,
    activatedAt = new Date()
  } = {}) {
    if (
      this.verificationStatus !==
      "verified"
    ) {
      throw new Error(
        "Parent–student link must be verified before activation"
      );
    }

    this.status = "active";
    this.activatedAt =
      activatedAt;

    this.suspendedAt = null;
    this.suspendedBy = null;
    this.suspensionReason = "";
    this.revokedAt = null;
    this.revokedBy = null;
    this.revocationReason = "";

    if (activatedBy) {
      this.updatedBy =
        activatedBy;
    }

    return this;
  };

/*
|--------------------------------------------------------------------------
| Verify Link
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.methods.verifyLink =
  function ({
    verifiedBy,
    method = "manual",
    notes = "",
    verifiedAt = new Date()
  }) {
    if (!verifiedBy) {
      throw new Error(
        "Verifier user ID is required"
      );
    }

    if (
      !VERIFICATION_METHODS.includes(
        method
      )
    ) {
      throw new Error(
        "Invalid verification method"
      );
    }

    this.verificationStatus =
      "verified";

    this.verificationMethod =
      method;

    this.verifiedAt =
      verifiedAt;

    this.verifiedBy =
      verifiedBy;

    this.verificationNotes =
      String(notes || "")
        .trim()
        .slice(
          0,
          1000
        );

    this.updatedBy =
      verifiedBy;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Reject Verification
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.methods.rejectVerification =
  function ({
    rejectedBy,
    notes = ""
  }) {
    if (!rejectedBy) {
      throw new Error(
        "Rejecting user ID is required"
      );
    }

    this.verificationStatus =
      "rejected";

    this.verifiedAt = null;
    this.verifiedBy = null;

    this.verificationNotes =
      String(notes || "")
        .trim()
        .slice(
          0,
          1000
        );

    this.status = "pending";
    this.isPrimary = false;
    this.updatedBy =
      rejectedBy;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Suspend Link
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.methods.suspendLink =
  function ({
    suspendedBy,
    reason = "",
    suspendedAt = new Date()
  }) {
    if (!suspendedBy) {
      throw new Error(
        "Suspending user ID is required"
      );
    }

    this.status =
      "suspended";

    this.suspendedAt =
      suspendedAt;

    this.suspendedBy =
      suspendedBy;

    this.suspensionReason =
      String(reason || "")
        .trim()
        .slice(
          0,
          500
        );

    this.isPrimary = false;
    this.updatedBy =
      suspendedBy;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Revoke Link
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.methods.revokeLink =
  function ({
    revokedBy,
    reason = "",
    revokedAt = new Date()
  }) {
    if (!revokedBy) {
      throw new Error(
        "Revoking user ID is required"
      );
    }

    this.status = "revoked";
    this.revokedAt =
      revokedAt;

    this.revokedBy =
      revokedBy;

    this.revocationReason =
      String(reason || "")
        .trim()
        .slice(
          0,
          500
        );

    this.isPrimary = false;
    this.updatedBy =
      revokedBy;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Set or Remove Primary Contact
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.methods.setPrimary =
  function (
    value = true
  ) {
    if (
      value &&
      !this.isActiveLink
    ) {
      throw new Error(
        "Only an active parent–student link can be primary"
      );
    }

    this.isPrimary =
      Boolean(value);

    return this;
  };

/*
|--------------------------------------------------------------------------
| Update Access Permission
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.methods.setPermission =
  function (
    feature,
    allowed
  ) {
    if (
      !ACCESS_FEATURES.includes(
        feature
      )
    ) {
      throw new Error(
        "Invalid portal access feature"
      );
    }

    this.accessPermissions[
      feature
    ] = Boolean(allowed);

    return this;
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Link
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.methods.softDelete =
  function ({
    deletedBy,
    reason = "",
    deletedAt = new Date()
  }) {
    if (!deletedBy) {
      throw new Error(
        "Deleting user ID is required"
      );
    }

    this.isDeleted = true;
    this.deletedAt =
      deletedAt;

    this.deletedBy =
      deletedBy;

    this.deletionReason =
      String(reason || "")
        .trim()
        .slice(
          0,
          500
        );

    this.isPrimary = false;
    this.updatedBy =
      deletedBy;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Restore Soft-Deleted Link
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.methods.restoreLink =
  function ({
    restoredBy
  }) {
    if (!restoredBy) {
      throw new Error(
        "Restoring user ID is required"
      );
    }

    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    this.deletionReason = "";

    this.status = "pending";
    this.isPrimary = false;
    this.updatedBy =
      restoredBy;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Static Constants
|--------------------------------------------------------------------------
*/

parentStudentLinkSchema.statics.RELATIONSHIP_TYPES =
  RELATIONSHIP_TYPES;

parentStudentLinkSchema.statics.LINK_STATUSES =
  LINK_STATUSES;

parentStudentLinkSchema.statics.VERIFICATION_STATUSES =
  VERIFICATION_STATUSES;

parentStudentLinkSchema.statics.VERIFICATION_METHODS =
  VERIFICATION_METHODS;

parentStudentLinkSchema.statics.LINK_SOURCES =
  LINK_SOURCES;

parentStudentLinkSchema.statics.ACCESS_FEATURES =
  ACCESS_FEATURES;

/*
|--------------------------------------------------------------------------
| Model
|--------------------------------------------------------------------------
*/

module.exports =
  mongoose.model(
    "ParentStudentLink",
    parentStudentLinkSchema
  );