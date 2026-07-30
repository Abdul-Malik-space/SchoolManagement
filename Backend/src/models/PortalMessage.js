const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Portal Message Constants
|--------------------------------------------------------------------------
*/

const SENDER_ROLES = [
  "parent",
  "student",
  "principal"
];

const MESSAGE_TYPES = [
  "text",
  "image",
  "document",
  "audio",
  "mixed"
];

const ATTACHMENT_TYPES = [
  "image",
  "document",
  "audio",
  "other"
];

const STORAGE_PROVIDERS = [
  "local",
  "cloudinary",
  "s3",
  "other"
];

/*
|--------------------------------------------------------------------------
| Attachment Schema
|--------------------------------------------------------------------------
*/

const attachmentSchema =
  new mongoose.Schema(
    {
      attachmentType: {
        type: String,

        enum: {
          values:
            ATTACHMENT_TYPES,

          message:
            "{VALUE} is not a valid attachment type"
        },

        required: [
          true,
          "Attachment type is required"
        ]
      },

      originalName: {
        type: String,

        required: [
          true,
          "Original file name is required"
        ],

        trim: true,

        maxlength: [
          255,
          "File name cannot exceed 255 characters"
        ]
      },

      storedName: {
        type: String,
        trim: true,

        maxlength: [
          255,
          "Stored file name cannot exceed 255 characters"
        ],

        default: ""
      },

      url: {
        type: String,

        required: [
          true,
          "Attachment URL is required"
        ],

        trim: true,

        maxlength: [
          2000,
          "Attachment URL cannot exceed 2000 characters"
        ]
      },

      mimeType: {
        type: String,
        trim: true,

        maxlength: [
          120,
          "MIME type cannot exceed 120 characters"
        ],

        default:
          "application/octet-stream"
      },

      size: {
        type: Number,

        min: [
          0,
          "Attachment size cannot be negative"
        ],

        max: [
          10 * 1024 * 1024,
          "Each attachment cannot exceed 10 MB"
        ],

        default: 0
      },

      storageProvider: {
        type: String,

        enum: {
          values:
            STORAGE_PROVIDERS,

          message:
            "{VALUE} is not a valid storage provider"
        },

        default: "local"
      },

      storageKey: {
        type: String,
        trim: true,

        maxlength: [
          500,
          "Storage key cannot exceed 500 characters"
        ],

        default: ""
      },

      publicId: {
        type: String,
        trim: true,

        maxlength: [
          500,
          "Public ID cannot exceed 500 characters"
        ],

        default: ""
      },

      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    {
      _id: true,
      timestamps: false
    }
  );

/*
|--------------------------------------------------------------------------
| Read Receipt Schema
|--------------------------------------------------------------------------
*/

const readReceiptSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: [
          true,
          "Read receipt user is required"
        ]
      },

      role: {
        type: String,

        enum: {
          values:
            SENDER_ROLES,

          message:
            "{VALUE} is not a valid reader role"
        },

        required: [
          true,
          "Reader role is required"
        ]
      },

      readAt: {
        type: Date,
        default: Date.now
      }
    },
    {
      _id: false,
      timestamps: false
    }
  );

/*
|--------------------------------------------------------------------------
| Portal Message Schema
|--------------------------------------------------------------------------
*/

const portalMessageSchema =
  new mongoose.Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | School and Conversation Scope
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

      conversationId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "PortalConversation",

        required: [
          true,
          "Conversation ID is required"
        ],

        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Sender
      |--------------------------------------------------------------------------
      */

      senderUserId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: [
          true,
          "Message sender is required"
        ],

        index: true
      },

      senderRole: {
        type: String,

        enum: {
          values:
            SENDER_ROLES,

          message:
            "{VALUE} is not a valid sender role"
        },

        required: [
          true,
          "Sender role is required"
        ],

        index: true
      },

      senderSnapshot: {
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

        roleLabel: {
          type: String,
          trim: true,
          default: ""
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Message Content
      |--------------------------------------------------------------------------
      */

      messageType: {
        type: String,

        enum: {
          values:
            MESSAGE_TYPES,

          message:
            "{VALUE} is not a valid message type"
        },

        default: "text",

        index: true
      },

      text: {
        type: String,
        trim: true,

        maxlength: [
          5000,
          "Message cannot exceed 5000 characters"
        ],

        default: ""
      },

      attachments: {
        type: [
          attachmentSchema
        ],

        default: []
      },

      /*
      |--------------------------------------------------------------------------
      | Reply Reference
      |--------------------------------------------------------------------------
      */

      replyToMessageId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "PortalMessage",

        default: null,

        index: true
      },

      replySnapshot: {
        senderName: {
          type: String,
          trim: true,
          default: ""
        },

        senderRole: {
          type: String,
          trim: true,
          default: ""
        },

        textPreview: {
          type: String,
          trim: true,

          maxlength: [
            250,
            "Reply preview cannot exceed 250 characters"
          ],

          default: ""
        },

        attachmentCount: {
          type: Number,
          min: 0,
          default: 0
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Delivery and Read State
      |--------------------------------------------------------------------------
      */

      sentAt: {
        type: Date,
        default: Date.now,
        index: true
      },

      deliveredAt: {
        type: Date,
        default: Date.now
      },

      readBy: {
        type: [
          readReceiptSchema
        ],

        default: []
      },

      /*
      |--------------------------------------------------------------------------
      | Message Editing
      |--------------------------------------------------------------------------
      */

      isEdited: {
        type: Boolean,
        default: false
      },

      editedAt: {
        type: Date,
        default: null
      },

      editHistory: {
        type: [
          {
            previousText: {
              type: String,
              maxlength: 5000,
              default: ""
            },

            editedAt: {
              type: Date,
              default: Date.now
            },

            editedBy: {
              type:
                mongoose.Schema.Types
                  .ObjectId,

              ref: "User",

              required: true
            }
          }
        ],

        default: []
      },

      /*
      |--------------------------------------------------------------------------
      | Hide Message for Individual User
      |--------------------------------------------------------------------------
      |
      | Parent یا Principal message کو صرف اپنے inbox سے hide کر سکتا ہے۔
      |
      */

      hiddenForUserIds: {
        type: [
          {
            type:
              mongoose.Schema.Types
                .ObjectId,

            ref: "User"
          }
        ],

        default: []
      },

      /*
      |--------------------------------------------------------------------------
      | Secure Soft Delete for Everyone
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
      },

      deletedTextSnapshot: {
        type: String,
        select: false,
        maxlength: 5000,
        default: ""
      },

      deletedAttachmentSnapshot: {
        type: [
          attachmentSchema
        ],

        select: false,
        default: []
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
          "Message creator is required"
        ]
      },

      updatedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null
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
            .deletedTextSnapshot;

          delete returnedObject
            .deletedAttachmentSnapshot;

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

portalMessageSchema.index({
  schoolId: 1,
  conversationId: 1,
  isDeleted: 1,
  sentAt: 1,
  _id: 1
});

portalMessageSchema.index({
  conversationId: 1,
  senderUserId: 1,
  sentAt: -1
});

portalMessageSchema.index({
  conversationId: 1,
  "readBy.userId": 1,
  sentAt: -1
});

portalMessageSchema.index({
  hiddenForUserIds: 1,
  conversationId: 1,
  sentAt: -1
});

/*
|--------------------------------------------------------------------------
| Normalize and Validate Message
|--------------------------------------------------------------------------
*/

portalMessageSchema.pre(
  "validate",
  function () {
    /*
    |--------------------------------------------------------------------------
    | Normalize Text
    |--------------------------------------------------------------------------
    */

    if (this.text) {
      this.text =
        this.text
          .trim()
          .replace(
            /\r\n/g,
            "\n"
          )
          .replace(
            /\n{4,}/g,
            "\n\n\n"
          );
    }

    /*
    |--------------------------------------------------------------------------
    | Remove Invalid Attachments
    |--------------------------------------------------------------------------
    */

    const validAttachments =
      Array.isArray(
        this.attachments
      )
        ? this.attachments
            .filter(
              (attachment) =>
                attachment &&
                attachment.url &&
                attachment.originalName
            )
        : [];

    this.attachments =
      validAttachments;

    /*
    |--------------------------------------------------------------------------
    | Maximum Attachments
    |--------------------------------------------------------------------------
    */

    if (
      this.attachments.length >
      5
    ) {
      this.invalidate(
        "attachments",
        "A message cannot contain more than 5 attachments"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Message Cannot Be Empty
    |--------------------------------------------------------------------------
    */

    if (
      !this.text &&
      this.attachments.length ===
        0 &&
      !this.isDeleted
    ) {
      this.invalidate(
        "text",
        "Message text or at least one attachment is required"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Determine Message Type Automatically
    |--------------------------------------------------------------------------
    */

    if (
      this.text &&
      this.attachments.length >
        0
    ) {
      this.messageType =
        "mixed";
    } else if (
      this.attachments.length >
      0
    ) {
      const attachmentTypes = [
        ...new Set(
          this.attachments.map(
            (attachment) =>
              attachment.attachmentType
          )
        )
      ];

      if (
        attachmentTypes.length ===
        1 &&
        [
          "image",
          "document",
          "audio"
        ].includes(
          attachmentTypes[0]
        )
      ) {
        this.messageType =
          attachmentTypes[0];
      } else {
        this.messageType =
          "mixed";
      }
    } else {
      this.messageType =
        "text";
    }

    /*
    |--------------------------------------------------------------------------
    | Remove Duplicate Read Receipts
    |--------------------------------------------------------------------------
    */

    if (
      Array.isArray(
        this.readBy
      )
    ) {
      const uniqueReceipts =
        new Map();

      this.readBy.forEach(
        (receipt) => {
          if (!receipt?.userId) {
            return;
          }

          uniqueReceipts.set(
            String(
              receipt.userId
            ),
            receipt
          );
        }
      );

      this.readBy = [
        ...uniqueReceipts.values()
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | Remove Duplicate Hidden Users
    |--------------------------------------------------------------------------
    */

    if (
      Array.isArray(
        this.hiddenForUserIds
      )
    ) {
      this.hiddenForUserIds = [
        ...new Set(
          this.hiddenForUserIds
            .filter(Boolean)
            .map(
              (userId) =>
                String(userId)
            )
        )
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | Deleted Record Cleanup
    |--------------------------------------------------------------------------
    */

    if (this.isDeleted) {
      if (!this.deletedAt) {
        this.deletedAt =
          new Date();
      }
    } else {
      this.deletedAt = null;
      this.deletedBy = null;
      this.deletionReason = "";
    }
  }
);

/*
|--------------------------------------------------------------------------
| Virtual Properties
|--------------------------------------------------------------------------
*/

portalMessageSchema.virtual(
  "hasAttachments"
).get(function () {
  return (
    Array.isArray(
      this.attachments
    ) &&
    this.attachments.length >
      0
  );
});

portalMessageSchema.virtual(
  "attachmentCount"
).get(function () {
  return Array.isArray(
    this.attachments
  )
    ? this.attachments.length
    : 0;
});

portalMessageSchema.virtual(
  "isReply"
).get(function () {
  return Boolean(
    this.replyToMessageId
  );
});

portalMessageSchema.virtual(
  "displayText"
).get(function () {
  if (this.isDeleted) {
    return (
      "This message was removed."
    );
  }

  if (this.text) {
    return this.text;
  }

  if (
    this.attachments?.length >
    0
  ) {
    return (
      `${this.attachments.length} attachment${
        this.attachments.length ===
        1
          ? ""
          : "s"
      }`
    );
  }

  return "Message";
});

/*
|--------------------------------------------------------------------------
| Mark Message as Read
|--------------------------------------------------------------------------
*/

portalMessageSchema.methods.markRead =
  function ({
    userId,
    role,
    readAt = new Date()
  }) {
    if (!userId) {
      throw new Error(
        "Reader user ID is required"
      );
    }

    if (
      !SENDER_ROLES.includes(
        role
      )
    ) {
      throw new Error(
        "Invalid message reader role"
      );
    }

    const userIdString =
      String(userId);

    const existingReceipt =
      this.readBy.find(
        (receipt) =>
          String(
            receipt.userId
          ) ===
          userIdString
      );

    if (existingReceipt) {
      existingReceipt.readAt =
        readAt;

      existingReceipt.role =
        role;
    } else {
      this.readBy.push({
        userId,
        role,
        readAt
      });
    }

    return this;
  };

/*
|--------------------------------------------------------------------------
| Check Read Receipt
|--------------------------------------------------------------------------
*/

portalMessageSchema.methods.isReadBy =
  function (userId) {
    if (!userId) {
      return false;
    }

    return this.readBy.some(
      (receipt) =>
        String(
          receipt.userId
        ) ===
        String(userId)
    );
  };

/*
|--------------------------------------------------------------------------
| Hide Message for One User
|--------------------------------------------------------------------------
*/

portalMessageSchema.methods.hideForUser =
  function (userId) {
    if (!userId) {
      throw new Error(
        "User ID is required"
      );
    }

    const currentValues =
      this.hiddenForUserIds.map(
        (value) =>
          String(value)
      );

    const userIdString =
      String(userId);

    if (
      !currentValues.includes(
        userIdString
      )
    ) {
      this.hiddenForUserIds.push(
        userId
      );
    }

    return this;
  };

/*
|--------------------------------------------------------------------------
| Restore Hidden Message for One User
|--------------------------------------------------------------------------
*/

portalMessageSchema.methods.restoreForUser =
  function (userId) {
    this.hiddenForUserIds =
      this.hiddenForUserIds.filter(
        (value) =>
          String(value) !==
          String(userId)
      );

    return this;
  };

/*
|--------------------------------------------------------------------------
| Check Message Visibility
|--------------------------------------------------------------------------
*/

portalMessageSchema.methods.isVisibleTo =
  function (userId) {
    if (!userId) {
      return false;
    }

    return !this.hiddenForUserIds.some(
      (value) =>
        String(value) ===
        String(userId)
    );
  };

/*
|--------------------------------------------------------------------------
| Edit Message Text
|--------------------------------------------------------------------------
*/

portalMessageSchema.methods.editMessageText =
  function ({
    newText,
    editedBy,
    editedAt = new Date()
  }) {
    const normalizedText =
      String(
        newText || ""
      ).trim();

    if (!editedBy) {
      throw new Error(
        "Editor user ID is required"
      );
    }

    if (
      !normalizedText &&
      this.attachments.length ===
        0
    ) {
      throw new Error(
        "Edited message cannot be empty"
      );
    }

    if (
      normalizedText.length >
      5000
    ) {
      throw new Error(
        "Message cannot exceed 5000 characters"
      );
    }

    this.editHistory.push({
      previousText:
        this.text || "",

      editedAt,
      editedBy
    });

    this.text =
      normalizedText;

    this.isEdited = true;

    this.editedAt =
      editedAt;

    this.updatedBy =
      editedBy;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Message for Everyone
|--------------------------------------------------------------------------
*/

portalMessageSchema.methods.removeForEveryone =
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

    /*
    |--------------------------------------------------------------------------
    | Keep Secure Snapshot Before Removal
    |--------------------------------------------------------------------------
    */

    if (!this.isDeleted) {
      this.deletedTextSnapshot =
        this.text || "";

      this.deletedAttachmentSnapshot =
        this.attachments.map(
          (attachment) =>
            attachment.toObject
              ? attachment.toObject()
              : attachment
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

    this.text = "";
    this.attachments = [];

    this.updatedBy =
      deletedBy;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Restore Globally Deleted Message
|--------------------------------------------------------------------------
*/

portalMessageSchema.methods.restoreDeletedMessage =
  function ({
    restoredBy
  }) {
    if (!restoredBy) {
      throw new Error(
        "Restoring user ID is required"
      );
    }

    if (!this.isDeleted) {
      return this;
    }

    this.text =
      this.deletedTextSnapshot ||
      "";

    this.attachments =
      this.deletedAttachmentSnapshot ||
      [];

    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    this.deletionReason = "";

    this.deletedTextSnapshot =
      "";

    this.deletedAttachmentSnapshot =
      [];

    this.updatedBy =
      restoredBy;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Static Constants
|--------------------------------------------------------------------------
*/

portalMessageSchema.statics.SENDER_ROLES =
  SENDER_ROLES;

portalMessageSchema.statics.MESSAGE_TYPES =
  MESSAGE_TYPES;

portalMessageSchema.statics.ATTACHMENT_TYPES =
  ATTACHMENT_TYPES;

portalMessageSchema.statics.STORAGE_PROVIDERS =
  STORAGE_PROVIDERS;

/*
|--------------------------------------------------------------------------
| Model
|--------------------------------------------------------------------------
*/

module.exports =
  mongoose.model(
    "PortalMessage",
    portalMessageSchema
  );