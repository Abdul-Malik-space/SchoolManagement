const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Portal Conversation Types
|--------------------------------------------------------------------------
|
| Parent Portal پہلے بنایا جا رہا ہے، لیکن یہی conversation model بعد میں
| Student Portal کے لیے بھی استعمال ہوگا۔
|
*/

const CONVERSATION_TYPES = [
  "parent_principal",
  "student_principal"
];

const CONVERSATION_CATEGORIES = [
  "academics",
  "attendance",
  "fees",
  "behavior",
  "health",
  "transport",
  "timetable",
  "general",
  "other"
];

const CONVERSATION_PRIORITIES = [
  "normal",
  "high",
  "urgent"
];

const CONVERSATION_STATUSES = [
  "open",
  "waiting_for_school",
  "waiting_for_family",
  "resolved",
  "closed"
];

const SENDER_ROLES = [
  "parent",
  "student",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Portal Conversation Schema
|--------------------------------------------------------------------------
*/

const portalConversationSchema =
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
      | Conversation Context
      |--------------------------------------------------------------------------
      */

      conversationType: {
        type: String,

        enum: {
          values:
            CONVERSATION_TYPES,

          message:
            "{VALUE} is not a valid portal conversation type"
        },

        required: [
          true,
          "Conversation type is required"
        ],

        default:
          "parent_principal",

        index: true
      },

      category: {
        type: String,

        enum: {
          values:
            CONVERSATION_CATEGORIES,

          message:
            "{VALUE} is not a valid conversation category"
        },

        default: "general",

        index: true
      },

      priority: {
        type: String,

        enum: {
          values:
            CONVERSATION_PRIORITIES,

          message:
            "{VALUE} is not a valid conversation priority"
        },

        default: "normal",

        index: true
      },

      subject: {
        type: String,

        required: [
          true,
          "Conversation subject is required"
        ],

        trim: true,

        minlength: [
          3,
          "Conversation subject must contain at least 3 characters"
        ],

        maxlength: [
          160,
          "Conversation subject cannot exceed 160 characters"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Student Context
      |--------------------------------------------------------------------------
      |
      | Parent کسی مخصوص بچے کے بارے میں Principal سے بات کر سکتا ہے۔
      | General school message کے لیے studentId null رہ سکتا ہے۔
      |
      */

      studentId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Student",

        default: null,

        index: true
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
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Participants
      |--------------------------------------------------------------------------
      */

      parentUserId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,

        index: true
      },

      studentUserId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,

        index: true
      },

      staffUserId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: [
          true,
          "Principal user is required"
        ],

        index: true
      },

      participantUserIds: [
        {
          type:
            mongoose.Schema.Types
              .ObjectId,

          ref: "User"
        }
      ],

      /*
      |--------------------------------------------------------------------------
      | Conversation State
      |--------------------------------------------------------------------------
      */

      status: {
        type: String,

        enum: {
          values:
            CONVERSATION_STATUSES,

          message:
            "{VALUE} is not a valid conversation status"
        },

        default: "open",

        index: true
      },

      lastMessageAt: {
        type: Date,
        default: null,
        index: true
      },

      lastMessagePreview: {
        type: String,
        trim: true,
        maxlength: [
          300,
          "Last message preview cannot exceed 300 characters"
        ],
        default: ""
      },

      lastMessageSenderRole: {
        type: String,

        enum: {
          values:
            SENDER_ROLES,

          message:
            "{VALUE} is not a valid sender role"
        },

        default: null
      },

      messageCount: {
        type: Number,
        min: 0,
        default: 0
      },

      /*
      |--------------------------------------------------------------------------
      | Unread Counters
      |--------------------------------------------------------------------------
      */

      parentUnreadCount: {
        type: Number,
        min: 0,
        default: 0
      },

      studentUnreadCount: {
        type: Number,
        min: 0,
        default: 0
      },

      staffUnreadCount: {
        type: Number,
        min: 0,
        default: 0
      },

      parentLastReadAt: {
        type: Date,
        default: null
      },

      studentLastReadAt: {
        type: Date,
        default: null
      },

      staffLastReadAt: {
        type: Date,
        default: null
      },

      /*
      |--------------------------------------------------------------------------
      | Archive Preferences
      |--------------------------------------------------------------------------
      |
      | ہر participant conversation کو اپنی side سے archive کر سکتا ہے۔
      | دوسرے participant کے inbox سے conversation delete نہیں ہوگی۔
      |
      */

      isArchivedByParent: {
        type: Boolean,
        default: false
      },

      isArchivedByStudent: {
        type: Boolean,
        default: false
      },

      isArchivedByStaff: {
        type: Boolean,
        default: false
      },

      /*
      |--------------------------------------------------------------------------
      | Resolution and Closure
      |--------------------------------------------------------------------------
      */

      resolvedAt: {
        type: Date,
        default: null
      },

      resolvedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      closedAt: {
        type: Date,
        default: null
      },

      closedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      /*
      |--------------------------------------------------------------------------
      | Record Tracking
      |--------------------------------------------------------------------------
      */

      createdBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: [
          true,
          "Conversation creator is required"
        ]
      },

      updatedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

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
      }
    },
    {
      timestamps: true,

      toJSON: {
        virtuals: true
      },

      toObject: {
        virtuals: true
      }
    }
  );

/*
|--------------------------------------------------------------------------
| Helpful Indexes
|--------------------------------------------------------------------------
*/

portalConversationSchema.index({
  schoolId: 1,
  parentUserId: 1,
  isDeleted: 1,
  isArchivedByParent: 1,
  lastMessageAt: -1,
  updatedAt: -1
});

portalConversationSchema.index({
  schoolId: 1,
  studentUserId: 1,
  isDeleted: 1,
  isArchivedByStudent: 1,
  lastMessageAt: -1,
  updatedAt: -1
});

portalConversationSchema.index({
  schoolId: 1,
  staffUserId: 1,
  status: 1,
  isDeleted: 1,
  isArchivedByStaff: 1,
  lastMessageAt: -1,
  updatedAt: -1
});

portalConversationSchema.index({
  schoolId: 1,
  studentId: 1,
  isDeleted: 1,
  updatedAt: -1
});

portalConversationSchema.index({
  participantUserIds: 1,
  isDeleted: 1,
  updatedAt: -1
});

/*
|--------------------------------------------------------------------------
| Normalize and Validate Conversation
|--------------------------------------------------------------------------
*/

portalConversationSchema.pre(
  "validate",
  function () {
    if (this.subject) {
      this.subject =
        this.subject
          .trim()
          .replace(
            /\s+/g,
            " "
          );
    }

    if (
      this.lastMessagePreview
    ) {
      this.lastMessagePreview =
        this.lastMessagePreview
          .trim()
          .replace(
            /\s+/g,
            " "
          )
          .slice(
            0,
            300
          );
    }

    /*
    |--------------------------------------------------------------------------
    | Required Participant by Conversation Type
    |--------------------------------------------------------------------------
    */

    if (
      this.conversationType ===
        "parent_principal" &&
      !this.parentUserId
    ) {
      this.invalidate(
        "parentUserId",
        "Parent user is required for a parent conversation"
      );
    }

    if (
      this.conversationType ===
        "student_principal" &&
      !this.studentUserId
    ) {
      this.invalidate(
        "studentUserId",
        "Student user is required for a student conversation"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Build Participant List Automatically
    |--------------------------------------------------------------------------
    */

    const participants = [
      this.parentUserId,
      this.studentUserId,
      this.staffUserId
    ]
      .filter(Boolean)
      .map(
        (value) =>
          String(value)
      );

    this.participantUserIds = [
      ...new Set(
        participants
      )
    ];

    /*
    |--------------------------------------------------------------------------
    | Resolution State Cleanup
    |--------------------------------------------------------------------------
    */

    if (
      this.status !==
      "resolved"
    ) {
      this.resolvedAt = null;
      this.resolvedBy = null;
    }

    if (
      this.status !==
      "closed"
    ) {
      this.closedAt = null;
      this.closedBy = null;
    }
  }
);

/*
|--------------------------------------------------------------------------
| Virtual Properties
|--------------------------------------------------------------------------
*/

portalConversationSchema.virtual(
  "isOpen"
).get(function () {
  return ![
    "resolved",
    "closed"
  ].includes(
    this.status
  );
});

portalConversationSchema.virtual(
  "hasParentUnread"
).get(function () {
  return (
    this.parentUnreadCount >
    0
  );
});

portalConversationSchema.virtual(
  "hasStudentUnread"
).get(function () {
  return (
    this.studentUnreadCount >
    0
  );
});

portalConversationSchema.virtual(
  "hasStaffUnread"
).get(function () {
  return (
    this.staffUnreadCount >
    0
  );
});

portalConversationSchema.virtual(
  "displayStudent"
).get(function () {
  const studentName =
    this.studentSnapshot
      ?.name;

  if (!studentName) {
    return "General School Query";
  }

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

/*
|--------------------------------------------------------------------------
| Register a New Message
|--------------------------------------------------------------------------
|
| Message controller successful message create کے بعد یہ method call کرے گا۔
|
*/

portalConversationSchema.methods.registerMessage =
  function ({
    senderRole,
    preview,
    sentAt = new Date()
  }) {
    if (
      !SENDER_ROLES.includes(
        senderRole
      )
    ) {
      throw new Error(
        "Invalid portal message sender role"
      );
    }

    this.lastMessageAt =
      sentAt;

    this.lastMessagePreview =
      String(
        preview || ""
      )
        .trim()
        .replace(
          /\s+/g,
          " "
        )
        .slice(
          0,
          300
        );

    this.lastMessageSenderRole =
      senderRole;

    this.messageCount =
      Number(
        this.messageCount ||
        0
      ) + 1;

    /*
    |--------------------------------------------------------------------------
    | Increase Receiver Unread Count
    |--------------------------------------------------------------------------
    */

    if (
      senderRole ===
      "principal"
    ) {
      if (
        this.conversationType ===
        "parent_principal"
      ) {
        this.parentUnreadCount =
          Number(
            this.parentUnreadCount ||
            0
          ) + 1;
      }

      if (
        this.conversationType ===
        "student_principal"
      ) {
        this.studentUnreadCount =
          Number(
            this.studentUnreadCount ||
            0
          ) + 1;
      }

      this.status =
        "waiting_for_family";
    } else {
      this.staffUnreadCount =
        Number(
          this.staffUnreadCount ||
          0
        ) + 1;

      this.status =
        "waiting_for_school";
    }

    /*
    |--------------------------------------------------------------------------
    | New activity automatically restores archived conversation
    |--------------------------------------------------------------------------
    */

    if (
      senderRole ===
      "parent"
    ) {
      this.isArchivedByParent =
        false;

      this.isArchivedByStaff =
        false;
    }

    if (
      senderRole ===
      "student"
    ) {
      this.isArchivedByStudent =
        false;

      this.isArchivedByStaff =
        false;
    }

    if (
      senderRole ===
      "principal"
    ) {
      this.isArchivedByStaff =
        false;

      if (
        this.conversationType ===
        "parent_principal"
      ) {
        this.isArchivedByParent =
          false;
      }

      if (
        this.conversationType ===
        "student_principal"
      ) {
        this.isArchivedByStudent =
          false;
      }
    }

    this.resolvedAt = null;
    this.resolvedBy = null;
    this.closedAt = null;
    this.closedBy = null;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Mark Conversation as Read
|--------------------------------------------------------------------------
*/

portalConversationSchema.methods.markRead =
  function (
    readerRole,
    readAt = new Date()
  ) {
    if (
      readerRole ===
      "parent"
    ) {
      this.parentUnreadCount =
        0;

      this.parentLastReadAt =
        readAt;
    } else if (
      readerRole ===
      "student"
    ) {
      this.studentUnreadCount =
        0;

      this.studentLastReadAt =
        readAt;
    } else if (
      readerRole ===
      "principal"
    ) {
      this.staffUnreadCount =
        0;

      this.staffLastReadAt =
        readAt;
    } else {
      throw new Error(
        "Invalid conversation reader role"
      );
    }

    return this;
  };

/*
|--------------------------------------------------------------------------
| Archive Conversation for Current Role
|--------------------------------------------------------------------------
*/

portalConversationSchema.methods.setArchivedForRole =
  function (
    role,
    archived = true
  ) {
    if (
      role ===
      "parent"
    ) {
      this.isArchivedByParent =
        Boolean(archived);
    } else if (
      role ===
      "student"
    ) {
      this.isArchivedByStudent =
        Boolean(archived);
    } else if (
      role ===
      "principal"
    ) {
      this.isArchivedByStaff =
        Boolean(archived);
    } else {
      throw new Error(
        "Invalid archive role"
      );
    }

    return this;
  };

/*
|--------------------------------------------------------------------------
| Resolve Conversation
|--------------------------------------------------------------------------
*/

portalConversationSchema.methods.resolveConversation =
  function (
    userId,
    resolvedAt = new Date()
  ) {
    this.status =
      "resolved";

    this.resolvedAt =
      resolvedAt;

    this.resolvedBy =
      userId;

    this.closedAt = null;
    this.closedBy = null;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Reopen Conversation
|--------------------------------------------------------------------------
*/

portalConversationSchema.methods.reopenConversation =
  function () {
    this.status = "open";

    this.resolvedAt = null;
    this.resolvedBy = null;
    this.closedAt = null;
    this.closedBy = null;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Close Conversation
|--------------------------------------------------------------------------
*/

portalConversationSchema.methods.closeConversation =
  function (
    userId,
    closedAt = new Date()
  ) {
    this.status = "closed";

    this.closedAt =
      closedAt;

    this.closedBy =
      userId;

    this.resolvedAt = null;
    this.resolvedBy = null;

    return this;
  };

/*
|--------------------------------------------------------------------------
| Static Constants
|--------------------------------------------------------------------------
*/

portalConversationSchema.statics.CONVERSATION_TYPES =
  CONVERSATION_TYPES;

portalConversationSchema.statics.CONVERSATION_CATEGORIES =
  CONVERSATION_CATEGORIES;

portalConversationSchema.statics.CONVERSATION_PRIORITIES =
  CONVERSATION_PRIORITIES;

portalConversationSchema.statics.CONVERSATION_STATUSES =
  CONVERSATION_STATUSES;

portalConversationSchema.statics.SENDER_ROLES =
  SENDER_ROLES;

/*
|--------------------------------------------------------------------------
| Model
|--------------------------------------------------------------------------
*/

module.exports =
  mongoose.model(
    "PortalConversation",
    portalConversationSchema
  );
