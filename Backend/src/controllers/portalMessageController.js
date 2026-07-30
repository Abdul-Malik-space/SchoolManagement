const mongoose = require("mongoose");

const ParentStudentLink = require("../models/ParentStudentLink");
const PortalConversation = require("../models/PortalConversation");
const PortalMessage = require("../models/PortalMessage");
const Student = require("../models/Student");
const User = require("../models/User");

const ALLOWED_ROLES = ["parent", "student", "principal"];

const CATEGORIES = [
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

const PRIORITIES = [
  "normal",
  "high",
  "urgent"
];

const STATUSES = [
  "open",
  "waiting_for_school",
  "waiting_for_family",
  "resolved",
  "closed"
];

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const isObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const objectId = (value) => {
  return new mongoose.Types.ObjectId(value);
};

const cleanText = (value) => {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
};

const positiveInt = (
  value,
  fallback,
  max = 100
) => {
  const parsed = Number.parseInt(
    value,
    10
  );

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return Math.min(
    parsed,
    max
  );
};

const senderRoleFor = (role) => {
  if (role === "principal") {
    return "principal";
  }

  if (role === "student") {
    return "student";
  }

  return "parent";
};

const unreadFieldFor = (role) => {
  if (role === "principal") {
    return "staffUnreadCount";
  }

  if (role === "student") {
    return "studentUnreadCount";
  }

  return "parentUnreadCount";
};

const archiveFieldFor = (role) => {
  if (role === "principal") {
    return "isArchivedByStaff";
  }

  if (role === "student") {
    return "isArchivedByStudent";
  }

  return "isArchivedByParent";
};

const previewFor = (
  text,
  attachments = []
) => {
  const message = cleanText(text);

  if (message) {
    return message.slice(
      0,
      300
    );
  }

  const count = Array.isArray(
    attachments
  )
    ? attachments.length
    : 0;

  if (count) {
    return `${count} attachment${
      count === 1
        ? ""
        : "s"
    }`;
  }

  return "Message";
};

/*
|--------------------------------------------------------------------------
| Authenticated Messaging Actor
|--------------------------------------------------------------------------
*/

const getActor = (
  request,
  response
) => {
  if (!request.user) {
    response.status(401).json({
      success: false,
      message:
        "Authentication is required."
    });

    return null;
  }

  const role = String(
    request.user.role || ""
  ).toLowerCase();

  const userId = String(
    request.user._id ||
    request.user.id ||
    ""
  );

  const schoolId = String(
    request.user.schoolId?._id ||
    request.user.schoolId ||
    request.schoolFilter?.schoolId ||
    ""
  );

  if (
    !ALLOWED_ROLES.includes(
      role
    )
  ) {
    response.status(403).json({
      success: false,
      message:
        "Messaging is available only to parent, student and principal accounts."
    });

    return null;
  }

  if (
    !isObjectId(userId) ||
    !isObjectId(schoolId)
  ) {
    response.status(403).json({
      success: false,
      message:
        "A valid user and school assignment are required."
    });

    return null;
  }

  return {
    role,
    userId,
    schoolId,
    senderRole:
      senderRoleFor(role)
  };
};

/*
|--------------------------------------------------------------------------
| Error Handler
|--------------------------------------------------------------------------
*/

const fail = (
  response,
  error,
  fallback
) => {
  console.error(
    `${fallback}:`,
    error
  );

  if (
    error.name ===
    "ValidationError"
  ) {
    return response
      .status(400)
      .json({
        success: false,

        message:
          Object.values(
            error.errors || {}
          )
            .map(
              (item) =>
                item.message
            )
            .join(" ")
      });
  }

  if (
    error.name ===
    "CastError"
  ) {
    return response
      .status(400)
      .json({
        success: false,
        message:
          "A supplied record ID is invalid."
      });
  }

  return response
    .status(500)
    .json({
      success: false,
      message:
        fallback,

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined
    });
};

/*
|--------------------------------------------------------------------------
| Conversation Scope
|--------------------------------------------------------------------------
*/

const conversationScope = (
  actor,
  aggregate = false
) => {
  const schoolId =
    aggregate
      ? objectId(
          actor.schoolId
        )
      : actor.schoolId;

  const userId =
    aggregate
      ? objectId(
          actor.userId
        )
      : actor.userId;

  const filter = {
    schoolId,
    isDeleted: false
  };

  if (
    actor.role ===
    "parent"
  ) {
    filter.parentUserId =
      userId;
  }

  if (
    actor.role ===
    "student"
  ) {
    filter.studentUserId =
      userId;
  }

  return filter;
};

/*
|--------------------------------------------------------------------------
| Conversation Population
|--------------------------------------------------------------------------
*/

const populateConversation = (
  query
) => {
  return query
    .populate(
      "studentId",
      "name admissionNumber sectionName classId studentPhoto"
    )
    .populate(
      "parentUserId",
      "name email phone photo role"
    )
    .populate(
      "studentUserId",
      "name email phone photo role"
    )
    .populate(
      "staffUserId",
      "name email phone photo role"
    );
};

/*
|--------------------------------------------------------------------------
| Find Authorized Conversation
|--------------------------------------------------------------------------
*/

const findConversation = async (
  actor,
  conversationId
) => {
  if (
    !isObjectId(
      conversationId
    )
  ) {
    return {
      error: {
        status: 400,
        message:
          "Invalid conversation ID."
      }
    };
  }

  const filter = {
    ...conversationScope(
      actor
    ),

    _id:
      conversationId
  };

  const conversation =
    await populateConversation(
      PortalConversation.findOne(
        filter
      )
    );

  if (!conversation) {
    return {
      error: {
        status: 404,
        message:
          "Conversation not found or access denied."
      }
    };
  }

  return {
    conversation
  };
};

/*
|--------------------------------------------------------------------------
| Student Snapshot
|--------------------------------------------------------------------------
*/

const studentSnapshot = (
  student
) => {
  return {
    name:
      student?.name ||
      "",

    admissionNumber:
      student?.admissionNumber ||
      "",

    className:
      student?.classId
        ?.className ||
      "",

    sectionName:
      student?.sectionName ||
      ""
  };
};

/*
|--------------------------------------------------------------------------
| Verify Parent Child Access
|--------------------------------------------------------------------------
*/

const verifyParentChild = async (
  actor,
  studentId
) => {
  if (!studentId) {
    return {
      student: null
    };
  }

  if (
    !isObjectId(
      studentId
    )
  ) {
    return {
      error: {
        status: 400,
        message:
          "Invalid student ID."
      }
    };
  }

  const link =
    await ParentStudentLink
      .findOne({
        schoolId:
          actor.schoolId,

        parentUserId:
          actor.userId,

        studentId
      })
      .lean();

  if (link) {
    const allowed =
      !link.isDeleted &&
      link.status ===
        "active" &&
      link.verificationStatus ===
        "verified" &&
      link.accessPermissions
        ?.messages !==
        false;

    if (!allowed) {
      return {
        error: {
          status: 403,
          message:
            "Messaging access is not enabled for this child."
        }
      };
    }
  }

  const studentFilter = {
    _id:
      studentId,

    schoolId:
      actor.schoolId,

    isDeleted:
      false
  };

  /*
  |--------------------------------------------------------------------------
  | Legacy Student Parent Linking
  |--------------------------------------------------------------------------
  */

  if (!link) {
    studentFilter
      .parentUserIds =
      actor.userId;
  }

  const student =
    await Student
      .findOne(
        studentFilter
      )
      .populate(
        "classId",
        "className numericOrder"
      )
      .lean();

  if (!student) {
    return {
      error: {
        status: 404,
        message:
          "Child not found or not linked with this parent account."
      }
    };
  }

  return {
    student
  };
};

/*
|--------------------------------------------------------------------------
| Verify Student Account
|--------------------------------------------------------------------------
*/

const verifyStudentProfile = async (
  actor,
  requestedId
) => {
  const filter = {
    schoolId:
      actor.schoolId,

    studentUserId:
      actor.userId,

    isDeleted:
      false
  };

  if (requestedId) {
    if (
      !isObjectId(
        requestedId
      )
    ) {
      return {
        error: {
          status: 400,
          message:
            "Invalid student ID."
        }
      };
    }

    filter._id =
      requestedId;
  }

  const student =
    await Student
      .findOne(filter)
      .populate(
        "classId",
        "className numericOrder"
      )
      .lean();

  if (!student) {
    return {
      error: {
        status: 404,
        message:
          "No student profile is linked with this account."
      }
    };
  }

  return {
    student
  };
};

/*
|--------------------------------------------------------------------------
| Serialize Conversation
|--------------------------------------------------------------------------
*/

const serializeConversation = (
  conversation,
  role
) => {
  const unreadField =
    unreadFieldFor(role);

  const archiveField =
    archiveFieldFor(role);

  return {
    id:
      conversation._id,

    conversationType:
      conversation
        .conversationType,

    category:
      conversation.category,

    priority:
      conversation.priority,

    subject:
      conversation.subject,

    status:
      conversation.status,

    student:
      conversation.studentId
        ? {
            id:
              conversation
                .studentId
                ._id ||
              conversation
                .studentId,

            name:
              conversation
                .studentId
                .name ||
              conversation
                .studentSnapshot
                ?.name ||
              "",

            admissionNumber:
              conversation
                .studentId
                .admissionNumber ||
              conversation
                .studentSnapshot
                ?.admissionNumber ||
              "",

            sectionName:
              conversation
                .studentId
                .sectionName ||
              conversation
                .studentSnapshot
                ?.sectionName ||
              ""
          }
        : null,

    parent:
      conversation
        .parentUserId
        ?._id
        ? {
            id:
              conversation
                .parentUserId
                ._id,

            name:
              conversation
                .parentUserId
                .name ||
              "",

            email:
              conversation
                .parentUserId
                .email ||
              "",

            phone:
              conversation
                .parentUserId
                .phone ||
              ""
          }
        : null,

    studentAccount:
      conversation
        .studentUserId
        ?._id
        ? {
            id:
              conversation
                .studentUserId
                ._id,

            name:
              conversation
                .studentUserId
                .name ||
              "",

            email:
              conversation
                .studentUserId
                .email ||
              ""
          }
        : null,

    principal:
      conversation
        .staffUserId
        ?._id
        ? {
            id:
              conversation
                .staffUserId
                ._id,

            name:
              conversation
                .staffUserId
                .name ||
              "",

            email:
              conversation
                .staffUserId
                .email ||
              "",

            phone:
              conversation
                .staffUserId
                .phone ||
              ""
          }
        : null,

    lastMessageAt:
      conversation
        .lastMessageAt,

    lastMessagePreview:
      conversation
        .lastMessagePreview ||
      "",

    lastMessageSenderRole:
      conversation
        .lastMessageSenderRole,

    messageCount:
      conversation
        .messageCount ||
      0,

    unreadCount:
      conversation[
        unreadField
      ] || 0,

    isArchived:
      Boolean(
        conversation[
          archiveField
        ]
      ),

    resolvedAt:
      conversation
        .resolvedAt ||
      null,

    closedAt:
      conversation
        .closedAt ||
      null,

    createdAt:
      conversation
        .createdAt,

    updatedAt:
      conversation
        .updatedAt
  };
};

/*
|--------------------------------------------------------------------------
| Serialize Message
|--------------------------------------------------------------------------
*/

const serializeMessage = (
  message,
  currentUserId
) => {
  const senderId =
    message
      .senderUserId
      ?._id ||
    message
      .senderUserId;

  return {
    id:
      message._id,

    conversationId:
      message
        .conversationId,

    sender: {
      id:
        senderId,

      role:
        message
          .senderRole,

      name:
        message
          .senderUserId
          ?.name ||
        message
          .senderSnapshot
          ?.name ||
        "",

      email:
        message
          .senderUserId
          ?.email ||
        message
          .senderSnapshot
          ?.email ||
        ""
    },

    isOwnMessage:
      String(senderId) ===
      String(
        currentUserId
      ),

    messageType:
      message
        .messageType,

    text:
      message.isDeleted
        ? ""
        : message.text ||
          "",

    displayText:
      message.isDeleted
        ? "This message was removed."
        : message.text ||
          previewFor(
            message.text,
            message.attachments
          ),

    attachments:
      message.isDeleted
        ? []
        : message.attachments ||
          [],

    replyToMessageId:
      message
        .replyToMessageId ||
      null,

    replySnapshot:
      message
        .replySnapshot ||
      null,

    sentAt:
      message.sentAt,

    deliveredAt:
      message.deliveredAt,

    readBy:
      message.readBy ||
      [],

    isEdited:
      Boolean(
        message.isEdited
      ),

    editedAt:
      message.editedAt ||
      null,

    isDeleted:
      Boolean(
        message.isDeleted
      ),

    deletedAt:
      message.deletedAt ||
      null
  };
};

/*
|--------------------------------------------------------------------------
| Mark Messages Read
|--------------------------------------------------------------------------
*/

const markReadInternal = async (
  conversation,
  actor
) => {
  conversation.markRead(
    actor.senderRole
  );

  conversation.updatedBy =
    actor.userId;

  await conversation.save();

  await PortalMessage.updateMany(
    {
      schoolId:
        actor.schoolId,

      conversationId:
        conversation._id,

      senderUserId: {
        $ne:
          actor.userId
      },

      "readBy.userId": {
        $ne:
          actor.userId
      }
    },
    {
      $push: {
        readBy: {
          userId:
            actor.userId,

          role:
            actor.senderRole,

          readAt:
            new Date()
        }
      }
    }
  );
};

/*
|--------------------------------------------------------------------------
| Create Conversation
|--------------------------------------------------------------------------
|
| POST /api/portal-messages/conversations
|
*/

const createConversation = async (
  request,
  response
) => {
  let conversation;

  try {
    const actor =
      getActor(
        request,
        response
      );

    if (!actor) {
      return;
    }

    if (
      actor.role ===
      "principal"
    ) {
      return response
        .status(403)
        .json({
          success: false,
          message:
            "The principal replies to existing conversations."
        });
    }

    const subject =
      cleanText(
        request.body
          ?.subject
      );

    const category =
      String(
        request.body
          ?.category ||
        "general"
      ).toLowerCase();

    const priority =
      String(
        request.body
          ?.priority ||
        "normal"
      ).toLowerCase();

    const text =
      String(
        request.body
          ?.text ||
        ""
      ).trim();

    const attachments =
      Array.isArray(
        request.body
          ?.attachments
      )
        ? request.body
            .attachments
        : [];

    if (
      subject.length <
      3
    ) {
      return response
        .status(400)
        .json({
          success: false,
          message:
            "Subject must contain at least 3 characters."
        });
    }

    if (
      !CATEGORIES.includes(
        category
      )
    ) {
      return response
        .status(400)
        .json({
          success: false,
          message:
            "Invalid conversation category."
        });
    }

    if (
      !PRIORITIES.includes(
        priority
      )
    ) {
      return response
        .status(400)
        .json({
          success: false,
          message:
            "Invalid conversation priority."
        });
    }

    if (
      !text &&
      attachments.length ===
        0
    ) {
      return response
        .status(400)
        .json({
          success: false,
          message:
            "The first message cannot be empty."
        });
    }

    const access =
      actor.role ===
      "parent"
        ? await verifyParentChild(
            actor,
            request.body
              ?.studentId
          )
        : await verifyStudentProfile(
            actor,
            request.body
              ?.studentId
          );

    if (access.error) {
      return response
        .status(
          access.error
            .status
        )
        .json({
          success: false,
          message:
            access.error
              .message
        });
    }

    const principal =
      await User
        .findOne({
          schoolId:
            actor.schoolId,

          role:
            "principal",

          isActive:
            true
        })
        .select(
          "name email phone photo role"
        )
        .sort({
          updatedAt: -1
        });

    if (!principal) {
      return response
        .status(409)
        .json({
          success: false,
          message:
            "No active principal account is available for this school."
        });
    }

    conversation =
      await PortalConversation
        .create({
          schoolId:
            actor.schoolId,

          conversationType:
            actor.role ===
            "parent"
              ? "parent_principal"
              : "student_principal",

          category,
          priority,
          subject,

          studentId:
            access.student
              ?._id ||
            null,

          studentSnapshot:
            studentSnapshot(
              access.student
            ),

          parentUserId:
            actor.role ===
            "parent"
              ? actor.userId
              : null,

          studentUserId:
            actor.role ===
            "student"
              ? actor.userId
              : null,

          staffUserId:
            principal._id,

          participantUserIds: [
            actor.userId,
            principal._id
          ],

          createdBy:
            actor.userId,

          updatedBy:
            actor.userId
        });

    const message =
      await PortalMessage
        .create({
          schoolId:
            actor.schoolId,

          conversationId:
            conversation._id,

          senderUserId:
            actor.userId,

          senderRole:
            actor.senderRole,

          senderSnapshot: {
            name:
              request.user
                .name ||
              "",

            email:
              request.user
                .email ||
              "",

            roleLabel:
              actor.senderRole
          },

          text,
          attachments,

          createdBy:
            actor.userId,

          updatedBy:
            actor.userId
        });

    conversation.registerMessage({
      senderRole:
        actor.senderRole,

      preview:
        previewFor(
          text,
          attachments
        ),

      sentAt:
        message.sentAt
    });

    await conversation.save();

    const populated =
      await populateConversation(
        PortalConversation
          .findById(
            conversation._id
          )
      );

    return response
      .status(201)
      .json({
        success: true,
        message:
          "Conversation created successfully.",

        data: {
          conversation:
            serializeConversation(
              populated,
              actor.role
            ),

          firstMessage:
            serializeMessage(
              message,
              actor.userId
            )
        }
      });
  } catch (error) {
    if (
      conversation?._id
    ) {
      await PortalMessage
        .deleteMany({
          conversationId:
            conversation._id
        })
        .catch(
          () => null
        );

      await PortalConversation
        .deleteOne({
          _id:
            conversation._id
        })
        .catch(
          () => null
        );
    }

    return fail(
      response,
      error,
      "Failed to create the conversation."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Messaging Summary
|--------------------------------------------------------------------------
|
| GET /api/portal-messages/summary
|
*/

const getMessagingSummary = async (
  request,
  response
) => {
  try {
    const actor =
      getActor(
        request,
        response
      );

    if (!actor) {
      return;
    }

    const filter =
      conversationScope(
        actor
      );

    const match =
      conversationScope(
        actor,
        true
      );

    const archiveField =
      archiveFieldFor(
        actor.role
      );

    const unreadField =
      unreadFieldFor(
        actor.role
      );

    filter[
      archiveField
    ] = false;

    match[
      archiveField
    ] = false;

    const [
      total,
      open,
      unread
    ] =
      await Promise.all([
        PortalConversation
          .countDocuments(
            filter
          ),

        PortalConversation
          .countDocuments({
            ...filter,

            status: {
              $in: [
                "open",
                "waiting_for_school",
                "waiting_for_family"
              ]
            }
          }),

        PortalConversation
          .aggregate([
            {
              $match:
                match
            },
            {
              $group: {
                _id: null,

                unreadMessages: {
                  $sum:
                    `$${unreadField}`
                },

                urgentConversations: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$priority",
                          "urgent"
                        ]
                      },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ])
      ]);

    return response
      .status(200)
      .json({
        success: true,

        data: {
          totalConversations:
            total,

          openConversations:
            open,

          unreadMessages:
            unread[0]
              ?.unreadMessages ||
            0,

          urgentConversations:
            unread[0]
              ?.urgentConversations ||
            0
        }
      });
  } catch (error) {
    return fail(
      response,
      error,
      "Failed to load messaging summary."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Conversations
|--------------------------------------------------------------------------
|
| GET /api/portal-messages/conversations
|
*/

const getConversations = async (
  request,
  response
) => {
  try {
    const actor =
      getActor(
        request,
        response
      );

    if (!actor) {
      return;
    }

    const filter =
      conversationScope(
        actor
      );

    filter[
      archiveFieldFor(
        actor.role
      )
    ] =
      request.query
        .archived ===
      "true";

    if (
      request.query
        .status
    ) {
      const status =
        String(
          request.query
            .status
        ).toLowerCase();

      if (
        !STATUSES.includes(
          status
        )
      ) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              "Invalid conversation status."
          });
      }

      filter.status =
        status;
    }

    if (
      request.query
        .category
    ) {
      const category =
        String(
          request.query
            .category
        ).toLowerCase();

      if (
        !CATEGORIES.includes(
          category
        )
      ) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              "Invalid conversation category."
          });
      }

      filter.category =
        category;
    }

    if (
      request.query
        .priority
    ) {
      const priority =
        String(
          request.query
            .priority
        ).toLowerCase();

      if (
        !PRIORITIES.includes(
          priority
        )
      ) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              "Invalid conversation priority."
          });
      }

      filter.priority =
        priority;
    }

    const search =
      cleanText(
        request.query
          .search
      );

    if (search) {
      filter.$or = [
        {
          subject: {
            $regex:
              search,

            $options:
              "i"
          }
        },

        {
          lastMessagePreview: {
            $regex:
              search,

            $options:
              "i"
          }
        },

        {
          "studentSnapshot.name": {
            $regex:
              search,

            $options:
              "i"
          }
        }
      ];
    }

    const page =
      positiveInt(
        request.query.page,
        1
      );

    const limit =
      positiveInt(
        request.query.limit,
        20
      );

    const skip =
      (
        page - 1
      ) * limit;

    const [
      records,
      totalRecords
    ] =
      await Promise.all([
        populateConversation(
          PortalConversation
            .find(filter)
        )
          .sort({
            lastMessageAt:
              -1,

            updatedAt:
              -1
          })
          .skip(skip)
          .limit(limit),

        PortalConversation
          .countDocuments(
            filter
          )
      ]);

    return response
      .status(200)
      .json({
        success: true,

        data: {
          pagination: {
            page,
            limit,
            totalRecords,

            totalPages:
              Math.max(
                1,
                Math.ceil(
                  totalRecords /
                  limit
                )
              )
          },

          conversations:
            records.map(
              (record) =>
                serializeConversation(
                  record,
                  actor.role
                )
            )
        }
      });
  } catch (error) {
    return fail(
      response,
      error,
      "Failed to load conversations."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Conversation Details
|--------------------------------------------------------------------------
|
| GET /api/portal-messages/conversations/:conversationId
|
*/

const getConversationById = async (
  request,
  response
) => {
  try {
    const actor =
      getActor(
        request,
        response
      );

    if (!actor) {
      return;
    }

    const result =
      await findConversation(
        actor,
        request.params
          .conversationId
      );

    if (result.error) {
      return response
        .status(
          result.error
            .status
        )
        .json({
          success: false,
          message:
            result.error
              .message
        });
    }

    return response
      .status(200)
      .json({
        success: true,

        data: {
          conversation:
            serializeConversation(
              result
                .conversation,
              actor.role
            )
        }
      });
  } catch (error) {
    return fail(
      response,
      error,
      "Failed to load the conversation."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Conversation Messages
|--------------------------------------------------------------------------
|
| GET /api/portal-messages/conversations/:conversationId/messages
|
*/

const getMessages = async (
  request,
  response
) => {
  try {
    const actor =
      getActor(
        request,
        response
      );

    if (!actor) {
      return;
    }

    const result =
      await findConversation(
        actor,
        request.params
          .conversationId
      );

    if (result.error) {
      return response
        .status(
          result.error
            .status
        )
        .json({
          success: false,
          message:
            result.error
              .message
        });
    }

    const page =
      positiveInt(
        request.query.page,
        1
      );

    const limit =
      positiveInt(
        request.query.limit,
        30
      );

    const skip =
      (
        page - 1
      ) * limit;

    const filter = {
      schoolId:
        actor.schoolId,

      conversationId:
        result
          .conversation
          ._id,

      hiddenForUserIds: {
        $ne:
          actor.userId
      }
    };

    const [
      messages,
      totalRecords
    ] =
      await Promise.all([
        PortalMessage
          .find(filter)
          .populate(
            "senderUserId",
            "name email phone photo role"
          )
          .sort({
            sentAt: -1,
            _id: -1
          })
          .skip(skip)
          .limit(limit),

        PortalMessage
          .countDocuments(
            filter
          )
      ]);

    if (
      request.query
        .markRead !==
      "false"
    ) {
      await markReadInternal(
        result
          .conversation,
        actor
      );
    }

    return response
      .status(200)
      .json({
        success: true,

        data: {
          conversation:
            serializeConversation(
              result
                .conversation,
              actor.role
            ),

          pagination: {
            page,
            limit,
            totalRecords,

            totalPages:
              Math.max(
                1,
                Math.ceil(
                  totalRecords /
                  limit
                )
              ),

            hasMore:
              page * limit <
              totalRecords
          },

          messages:
            messages
              .reverse()
              .map(
                (message) =>
                  serializeMessage(
                    message,
                    actor.userId
                  )
              )
        }
      });
  } catch (error) {
    return fail(
      response,
      error,
      "Failed to load messages."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Send Message
|--------------------------------------------------------------------------
|
| POST /api/portal-messages/conversations/:conversationId/messages
|
*/

const sendMessage = async (
  request,
  response
) => {
  let message;

  try {
    const actor =
      getActor(
        request,
        response
      );

    if (!actor) {
      return;
    }

    const result =
      await findConversation(
        actor,
        request.params
          .conversationId
      );

    if (result.error) {
      return response
        .status(
          result.error
            .status
        )
        .json({
          success: false,
          message:
            result.error
              .message
        });
    }

    const conversation =
      result.conversation;

    if (
      conversation.status ===
      "closed"
    ) {
      return response
        .status(409)
        .json({
          success: false,
          message:
            "The principal must reopen this conversation before another message can be sent."
        });
    }

    const text =
      String(
        request.body
          ?.text ||
        ""
      ).trim();

    const attachments =
      Array.isArray(
        request.body
          ?.attachments
      )
        ? request.body
            .attachments
        : [];

    if (
      !text &&
      attachments.length ===
        0
    ) {
      return response
        .status(400)
        .json({
          success: false,
          message:
            "Message text or an attachment is required."
        });
    }

    let replyToMessageId =
      null;

    let replySnapshot =
      undefined;

    if (
      request.body
        ?.replyToMessageId
    ) {
      if (
        !isObjectId(
          request.body
            .replyToMessageId
        )
      ) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              "Invalid reply message ID."
          });
      }

      const reply =
        await PortalMessage
          .findOne({
            _id:
              request.body
                .replyToMessageId,

            schoolId:
              actor.schoolId,

            conversationId:
              conversation._id
          })
          .populate(
            "senderUserId",
            "name email role"
          );

      if (!reply) {
        return response
          .status(404)
          .json({
            success: false,
            message:
              "The message being replied to was not found."
          });
      }

      replyToMessageId =
        reply._id;

      replySnapshot = {
        senderName:
          reply
            .senderUserId
            ?.name ||
          reply
            .senderSnapshot
            ?.name ||
          "",

        senderRole:
          reply.senderRole,

        textPreview:
          reply.isDeleted
            ? "This message was removed."
            : previewFor(
                reply.text,
                reply.attachments
              ).slice(
                0,
                250
              ),

        attachmentCount:
          reply.attachments
            ?.length ||
          0
      };
    }

    message =
      await PortalMessage
        .create({
          schoolId:
            actor.schoolId,

          conversationId:
            conversation._id,

          senderUserId:
            actor.userId,

          senderRole:
            actor.senderRole,

          senderSnapshot: {
            name:
              request.user
                .name ||
              "",

            email:
              request.user
                .email ||
              "",

            roleLabel:
              actor.senderRole
          },

          text,
          attachments,
          replyToMessageId,
          replySnapshot,

          createdBy:
            actor.userId,

          updatedBy:
            actor.userId
        });

    conversation.registerMessage({
      senderRole:
        actor.senderRole,

      preview:
        previewFor(
          text,
          attachments
        ),

      sentAt:
        message.sentAt
    });

    if (
      actor.role ===
      "principal"
    ) {
      conversation
        .staffUserId =
        actor.userId;
    }

    conversation.updatedBy =
      actor.userId;

    await conversation.save();

    await message.populate(
      "senderUserId",
      "name email phone photo role"
    );

    return response
      .status(201)
      .json({
        success: true,
        message:
          "Message sent successfully.",

        data: {
          message:
            serializeMessage(
              message,
              actor.userId
            ),

          conversation:
            serializeConversation(
              conversation,
              actor.role
            )
        }
      });
  } catch (error) {
    if (message?._id) {
      await PortalMessage
        .deleteOne({
          _id:
            message._id
        })
        .catch(
          () => null
        );
    }

    return fail(
      response,
      error,
      "Failed to send the message."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Mark Conversation Read
|--------------------------------------------------------------------------
|
| PATCH /api/portal-messages/conversations/:conversationId/read
|
*/

const markConversationRead = async (
  request,
  response
) => {
  try {
    const actor =
      getActor(
        request,
        response
      );

    if (!actor) {
      return;
    }

    const result =
      await findConversation(
        actor,
        request.params
          .conversationId
      );

    if (result.error) {
      return response
        .status(
          result.error
            .status
        )
        .json({
          success: false,
          message:
            result.error
              .message
        });
    }

    await markReadInternal(
      result
        .conversation,
      actor
    );

    return response
      .status(200)
      .json({
        success: true,
        message:
          "Conversation marked as read.",

        data: {
          unreadCount: 0
        }
      });
  } catch (error) {
    return fail(
      response,
      error,
      "Failed to mark the conversation as read."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Archive Conversation
|--------------------------------------------------------------------------
|
| PATCH /api/portal-messages/conversations/:conversationId/archive
|
*/

const setConversationArchive = async (
  request,
  response
) => {
  try {
    const actor =
      getActor(
        request,
        response
      );

    if (!actor) {
      return;
    }

    const result =
      await findConversation(
        actor,
        request.params
          .conversationId
      );

    if (result.error) {
      return response
        .status(
          result.error
            .status
        )
        .json({
          success: false,
          message:
            result.error
              .message
        });
    }

    const archived =
      request.body
        ?.archived !==
      false;

    result
      .conversation
      .setArchivedForRole(
        actor.senderRole,
        archived
      );

    result
      .conversation
      .updatedBy =
      actor.userId;

    await result
      .conversation
      .save();

    return response
      .status(200)
      .json({
        success: true,

        message:
          archived
            ? "Conversation archived successfully."
            : "Conversation restored to the inbox.",

        data: {
          archived
        }
      });
  } catch (error) {
    return fail(
      response,
      error,
      "Failed to update the archive state."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Update Conversation Status
|--------------------------------------------------------------------------
|
| PATCH /api/portal-messages/conversations/:conversationId/status
|
*/

const updateConversationStatus = async (
  request,
  response
) => {
  try {
    const actor =
      getActor(
        request,
        response
      );

    if (!actor) {
      return;
    }

    if (
      actor.role !==
      "principal"
    ) {
      return response
        .status(403)
        .json({
          success: false,
          message:
            "Only the principal can resolve, reopen or close a conversation."
        });
    }

    const status =
      String(
        request.body
          ?.status ||
        ""
      ).toLowerCase();

    if (
      ![
        "open",
        "resolved",
        "closed"
      ].includes(status)
    ) {
      return response
        .status(400)
        .json({
          success: false,
          message:
            "Status must be open, resolved or closed."
        });
    }

    const result =
      await findConversation(
        actor,
        request.params
          .conversationId
      );

    if (result.error) {
      return response
        .status(
          result.error
            .status
        )
        .json({
          success: false,
          message:
            result.error
              .message
        });
    }

    if (
      status ===
      "resolved"
    ) {
      result
        .conversation
        .resolveConversation(
          actor.userId
        );
    } else if (
      status ===
      "closed"
    ) {
      result
        .conversation
        .closeConversation(
          actor.userId
        );
    } else {
      result
        .conversation
        .reopenConversation();
    }

    result
      .conversation
      .staffUserId =
      actor.userId;

    result
      .conversation
      .updatedBy =
      actor.userId;

    await result
      .conversation
      .save();

    return response
      .status(200)
      .json({
        success: true,

        message:
          `Conversation status changed to ${status}.`,

        data: {
          conversation:
            serializeConversation(
              result
                .conversation,
              actor.role
            )
        }
      });
  } catch (error) {
    return fail(
      response,
      error,
      "Failed to update the conversation status."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  createConversation,
  getMessagingSummary,
  getConversations,
  getConversationById,
  getMessages,
  sendMessage,
  markConversationRead,
  setConversationArchive,
  updateConversationStatus
};