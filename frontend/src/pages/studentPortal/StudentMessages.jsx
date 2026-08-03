import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  useLocation,
  useNavigate,
  useOutletContext,
  useSearchParams
} from "react-router-dom";

import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowLeft,
  BellRing,
  BookOpen,
  Bus,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  File,
  FileText,
  Flag,
  HeartPulse,
  Inbox,
  Info,
  Keyboard,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  WifiOff,
  X
} from "lucide-react";

import {
  PORTAL_MESSAGE_CATEGORIES,
  PORTAL_MESSAGE_PRIORITIES,
  createPortalConversation,
  getPortalConversationMessages,
  getPortalConversations,
  getPortalMessagingSummary,
  markPortalConversationRead,
  sendPortalMessage,
  setPortalConversationArchived
} from "../../api/portalMessages";

/*
|--------------------------------------------------------------------------
| Messaging Constants
|--------------------------------------------------------------------------
*/

const CATEGORY_DETAILS = {
  academics: {
    label:
      "Academics",

    icon:
      BookOpen,

    badge:
      "bg-brand-50 text-brand-700 ring-brand-200",

    iconBox:
      "bg-brand-50 text-brand-700"
  },

  attendance: {
    label:
      "Attendance",

    icon:
      CheckCheck,

    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",

    iconBox:
      "bg-emerald-50 text-emerald-700"
  },

  fees: {
    label:
      "Fees",

    icon:
      FileText,

    badge:
      "bg-amber-50 text-amber-700 ring-amber-200",

    iconBox:
      "bg-amber-50 text-amber-700"
  },

  behavior: {
    label:
      "Behaviour",

    icon:
      ShieldCheck,

    badge:
      "bg-violet-50 text-violet-700 ring-violet-200",

    iconBox:
      "bg-violet-50 text-violet-700"
  },

  health: {
    label:
      "Health",

    icon:
      HeartPulse,

    badge:
      "bg-rose-50 text-rose-700 ring-rose-200",

    iconBox:
      "bg-rose-50 text-rose-700"
  },

  transport: {
    label:
      "Transport",

    icon:
      Bus,

    badge:
      "bg-cyan-50 text-cyan-700 ring-cyan-200",

    iconBox:
      "bg-cyan-50 text-cyan-700"
  },

  timetable: {
    label:
      "Timetable",

    icon:
      Clock3,

    badge:
      "bg-indigo-50 text-indigo-700 ring-indigo-200",

    iconBox:
      "bg-indigo-50 text-indigo-700"
  },

  general: {
    label:
      "General",

    icon:
      MessageCircle,

    badge:
      "bg-slate-100 text-slate-700 ring-slate-200",

    iconBox:
      "bg-slate-100 text-slate-700"
  },

  other: {
    label:
      "Other",

    icon:
      MoreHorizontal,

    badge:
      "bg-slate-100 text-slate-700 ring-slate-200",

    iconBox:
      "bg-slate-100 text-slate-700"
  }
};

const STATUS_DETAILS = {
  open: {
    label:
      "Open",

    description:
      "Conversation is active.",

    classes:
      "bg-emerald-50 text-emerald-700 ring-emerald-200"
  },

  waiting_for_school: {
    label:
      "Awaiting School",

    description:
      "Your message is waiting for a school response.",

    classes:
      "bg-amber-50 text-amber-700 ring-amber-200"
  },

  waiting_for_family: {
    label:
      "Your Reply Needed",

    description:
      "The principal has replied and may be waiting for you.",

    classes:
      "bg-cyan-50 text-cyan-700 ring-cyan-200"
  },

  resolved: {
    label:
      "Resolved",

    description:
      "The school marked this matter as resolved.",

    classes:
      "bg-brand-50 text-brand-700 ring-brand-200"
  },

  closed: {
    label:
      "Closed",

    description:
      "Only the principal can reopen this conversation.",

    classes:
      "bg-slate-100 text-slate-600 ring-slate-200"
  }
};

const STATUS_FILTERS = [
  {
    value:
      "all",

    label:
      "All Statuses"
  },

  {
    value:
      "open",

    label:
      "Open"
  },

  {
    value:
      "waiting_for_school",

    label:
      "Awaiting School"
  },

  {
    value:
      "waiting_for_family",

    label:
      "Your Reply Needed"
  },

  {
    value:
      "resolved",

    label:
      "Resolved"
  },

  {
    value:
      "closed",

    label:
      "Closed"
  }
];

const PRIORITY_DETAILS = {
  normal: {
    label:
      "Normal",

    classes:
      "bg-slate-100 text-slate-600 ring-slate-200"
  },

  high: {
    label:
      "High",

    classes:
      "bg-orange-50 text-orange-700 ring-orange-200"
  },

  urgent: {
    label:
      "Urgent",

    classes:
      "bg-rose-600 text-white ring-rose-600"
  }
};

const QUICK_TEMPLATES = [
  {
    label:
      "Attendance Review",

    category:
      "attendance",

    subject:
      "Attendance record review",

    text:
      "I would like the school to review and clarify my attendance record."
  },

  {
    label:
      "Fee Clarification",

    category:
      "fees",

    subject:
      "Fee record clarification",

    text:
      "I would like clarification about an invoice, payment or outstanding fee balance."
  },

  {
    label:
      "Timetable Question",

    category:
      "timetable",

    subject:
      "Timetable information request",

    text:
      "I would like clarification about a class time, teacher, room or online class link."
  },

  {
    label:
      "Academic Question",

    category:
      "academics",

    subject:
      "Academic information request",

    text:
      "I would like clarification about my subjects, teacher assignment or academic record."
  }
];

const DEFAULT_SUMMARY = {
  totalConversations:
    0,

  openConversations:
    0,

  unreadMessages:
    0,

  urgentConversations:
    0
};

const DEFAULT_PAGINATION = {
  page:
    1,

  limit:
    20,

  totalRecords:
    0,

  totalPages:
    1
};

const DEFAULT_MESSAGE_PAGINATION = {
  page:
    1,

  limit:
    50,

  totalRecords:
    0,

  totalPages:
    1,

  hasMore:
    false
};

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const getErrorMessage = (
  error
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.response?.data
      ?.error ||
    error?.message ||
    "Unable to complete the messaging request."
  );
};

const titleCase = (
  value
) => {
  return String(
    value || ""
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character.toUpperCase()
    );
};

const getInitials = (
  value
) => {
  return String(
    value ||
    "User"
  )
    .split(
      " "
    )
    .filter(
      Boolean
    )
    .map(
      (
        part
      ) =>
        part[0]
    )
    .slice(
      0,
      2
    )
    .join(
      ""
    )
    .toUpperCase();
};

const formatClassName = (
  student
) => {
  const className =
    student?.class
      ?.className ||
    "";

  const sectionName =
    student?.sectionName ||
    "";

  if (
    className &&
    sectionName
  ) {
    return `${className} · ${sectionName}`;
  }

  return (
    className ||
    sectionName ||
    "Class not assigned"
  );
};

const formatMessageTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const today =
    new Date();

  const sameDate =
    date.getFullYear() ===
      today.getFullYear() &&
    date.getMonth() ===
      today.getMonth() &&
    date.getDate() ===
      today.getDate();

  if (
    sameDate
  ) {
    return new Intl.DateTimeFormat(
      "en-PK",
      {
        hour:
          "2-digit",

        minute:
          "2-digit"
      }
    ).format(
      date
    );
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day:
        "2-digit",

      month:
        "short",

      hour:
        "2-digit",

      minute:
        "2-digit"
    }
  ).format(
    date
  );
};

const formatFullDateTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit"
    }
  ).format(
    date
  );
};

const relativeTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const difference =
    Date.now() -
    date.getTime();

  const minutes =
    Math.max(
      0,
      Math.floor(
        difference /
        60000
      )
    );

  if (
    minutes <
    1
  ) {
    return "Just now";
  }

  if (
    minutes <
    60
  ) {
    return `${minutes}m`;
  }

  const hours =
    Math.floor(
      minutes /
      60
    );

  if (
    hours <
    24
  ) {
    return `${hours}h`;
  }

  const days =
    Math.floor(
      hours /
      24
    );

  if (
    days <
    7
  ) {
    return `${days}d`;
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day:
        "2-digit",

      month:
        "short"
    }
  ).format(
    date
  );
};

const categoryDetails = (
  category
) => {
  return (
    CATEGORY_DETAILS[
      category
    ] ||
    CATEGORY_DETAILS.general
  );
};

const statusDetails = (
  status
) => {
  return (
    STATUS_DETAILS[
      status
    ] ||
    {
      label:
        titleCase(
          status ||
          "Open"
        ),

      description:
        "Conversation status.",

      classes:
        "bg-slate-100 text-slate-600 ring-slate-200"
    }
  );
};

const priorityDetails = (
  priority
) => {
  return (
    PRIORITY_DETAILS[
      priority
    ] ||
    PRIORITY_DETAILS.normal
  );
};

const getAttachmentName = (
  attachment,
  index
) => {
  return (
    attachment?.fileName ||
    attachment?.originalName ||
    attachment?.name ||
    attachment?.title ||
    `Attachment ${index + 1}`
  );
};

const getAttachmentUrl = (
  attachment
) => {
  return (
    attachment?.url ||
    attachment?.fileUrl ||
    attachment?.secureUrl ||
    attachment?.path ||
    ""
  );
};

const isSafeUrl = (
  value
) => {
  try {
    const url =
      new URL(
        value
      );

    return [
      "http:",
      "https:"
    ].includes(
      url.protocol
    );
  } catch {
    return false;
  }
};

const formatFileSize = (
  value
) => {
  const bytes =
    Number(
      value ||
      0
    );

  if (
    !Number.isFinite(
      bytes
    ) ||
    bytes <=
      0
  ) {
    return "";
  }

  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 *
      1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(
      1
    )} KB`;
  }

  return `${(
    bytes /
    (
      1024 *
      1024
    )
  ).toFixed(
    1
  )} MB`;
};

const uniqueMessages = (
  messages
) => {
  const map =
    new Map();

  messages.forEach(
    (
      message
    ) => {
      if (
        message?.id
      ) {
        map.set(
          String(
            message.id
          ),
          message
        );
      }
    }
  );

  return Array.from(
    map.values()
  );
};

const getDraftStorageKey = (
  student
) => {
  return `student-message-drafts:${
    student?.id ||
    student?.admissionNumber ||
    "student"
  }`;
};

const readDrafts = (
  key
) => {
  try {
    const raw =
      window.localStorage.getItem(
        key
      );

    if (!raw) {
      return {};
    }

    const parsed =
      JSON.parse(
        raw
      );

    return (
      parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(
        parsed
      )
        ? parsed
        : {}
    );
  } catch {
    return {};
  }
};

const saveDrafts = (
  key,
  drafts
) => {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(
        drafts
      )
    );
  } catch {
    // Draft saving is best-effort only.
  }
};

const downloadTextFile = (
  fileName,
  content
) => {
  const blob =
    new Blob(
      [
        content
      ],
      {
        type:
          "text/plain;charset=utf-8"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href =
    url;

  anchor.download =
    fileName;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  document.body.removeChild(
    anchor
  );

  URL.revokeObjectURL(
    url
  );
};

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

const SummaryCard = ({
  title,
  value,
  helper,
  icon: Icon,
  tone =
    "brand"
}) => {
  const tones = {
    brand:
      "bg-brand-50 text-brand-700",

    emerald:
      "bg-emerald-50 text-emerald-700",

    amber:
      "bg-amber-50 text-amber-700",

    rose:
      "bg-rose-50 text-rose-700"
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>

          <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {helper}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            tones[
              tone
            ] ||
            tones.brand
          }`}
        >
          <Icon
            size={20}
          />
        </div>
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Conversation List Item
|--------------------------------------------------------------------------
*/

const ConversationListItem = ({
  conversation,
  active,
  draft,
  onSelect
}) => {
  const category =
    categoryDetails(
      conversation.category
    );

  const status =
    statusDetails(
      conversation.status
    );

  const priority =
    priorityDetails(
      conversation.priority
    );

  const CategoryIcon =
    category.icon;

  const unreadCount =
    Number(
      conversation.unreadCount ||
      0
    );

  return (
    <button
      type="button"
      className={`w-full border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 ${
        active
          ? "bg-brand-50"
          : "bg-white hover:bg-slate-50"
      }`}
      onClick={() =>
        onSelect(
          conversation
        )
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            active
              ? "bg-brand-600 text-white"
              : category.iconBox
          }`}
        >
          <CategoryIcon
            size={18}
          />

          {unreadCount >
            0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white ring-2 ring-white">
              {Math.min(
                99,
                unreadCount
              )}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`truncate text-sm ${
                unreadCount >
                0
                  ? "font-black text-slate-900"
                  : "font-bold text-slate-800"
              }`}
            >
              {conversation.subject ||
                "Conversation"}
            </p>

            <span className="shrink-0 text-[10px] font-semibold text-slate-400">
              {relativeTime(
                conversation.lastMessageAt ||
                conversation.updatedAt
              )}
            </span>
          </div>

          <p
            className={`mt-1 line-clamp-2 text-xs leading-5 ${
              unreadCount >
              0
                ? "font-semibold text-slate-600"
                : "text-slate-400"
            }`}
          >
            {conversation.lastMessagePreview ||
              "No message preview available."}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span
              className={`rounded-full px-2 py-1 text-[9px] font-bold ring-1 ${status.classes}`}
            >
              {status.label}
            </span>

            {conversation.priority !==
              "normal" && (
              <span
                className={`rounded-full px-2 py-1 text-[9px] font-bold ring-1 ${priority.classes}`}
              >
                {priority.label}
              </span>
            )}

            <span
              className={`rounded-full px-2 py-1 text-[9px] font-bold ring-1 ${category.badge}`}
            >
              {category.label}
            </span>

            {draft && (
              <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700 ring-1 ring-violet-200">
                Draft
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

/*
|--------------------------------------------------------------------------
| Attachment List
|--------------------------------------------------------------------------
*/

const AttachmentList = ({
  attachments = [],
  own =
    false
}) => {
  if (
    !Array.isArray(
      attachments
    ) ||
    attachments.length ===
      0
  ) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {attachments.map(
        (
          attachment,
          index
        ) => {
          const url =
            getAttachmentUrl(
              attachment
            );

          const safeUrl =
            isSafeUrl(
              url
            )
              ? url
              : "";

          const name =
            getAttachmentName(
              attachment,
              index
            );

          const size =
            formatFileSize(
              attachment?.size ||
              attachment?.fileSize
            );

          const content = (
            <div
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                own
                  ? "border-white/20 bg-white/10"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  own
                    ? "bg-white/15 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <File
                  size={15}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">
                  {name}
                </p>

                {(size ||
                  attachment?.mimeType) && (
                  <p
                    className={`mt-0.5 truncate text-[10px] ${
                      own
                        ? "text-brand-100"
                        : "text-slate-400"
                    }`}
                  >
                    {[
                      size,
                      attachment
                        ?.mimeType
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " · "
                      )}
                  </p>
                )}
              </div>
            </div>
          );

          const key =
            attachment?.id ||
            attachment?._id ||
            `${name}-${index}`;

          return safeUrl ? (
            <a
              key={
                key
              }
              href={
                safeUrl
              }
              target="_blank"
              rel="noreferrer"
              className="block transition hover:opacity-90"
            >
              {content}
            </a>
          ) : (
            <div
              key={
                key
              }
            >
              {content}
            </div>
          );
        }
      )}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Message Bubble
|--------------------------------------------------------------------------
*/

const MessageBubble = ({
  message,
  onReply
}) => {
  const own =
    Boolean(
      message.isOwnMessage
    );

  const senderName =
    own
      ? "You"
      : message.sender
          ?.name ||
        titleCase(
          message.sender
            ?.role ||
          "Principal"
        );

  return (
    <div
      className={`flex ${
        own
          ? "justify-end"
          : "justify-start"
      }`}
    >
      <div
        className={`group flex max-w-[90%] items-end gap-2 sm:max-w-[76%] ${
          own
            ? "flex-row-reverse"
            : ""
        }`}
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-black ${
            own
              ? "bg-brand-100 text-brand-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {getInitials(
            senderName
          )}
        </div>

        <div className="min-w-0">
          <div
            className={`rounded-[22px] px-4 py-3 shadow-sm ${
              own
                ? "rounded-br-md bg-brand-600 text-white"
                : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <p
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  own
                    ? "text-brand-100"
                    : "text-slate-400"
                }`}
              >
                {senderName}
              </p>

              <button
                type="button"
                className={`invisible flex h-7 w-7 items-center justify-center rounded-lg opacity-0 transition group-hover:visible group-hover:opacity-100 ${
                  own
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                onClick={() =>
                  onReply(
                    message
                  )
                }
                aria-label="Reply to message"
                title="Reply"
              >
                <Reply
                  size={13}
                />
              </button>
            </div>

            {message.replySnapshot && (
              <div
                className={`mt-2 rounded-xl border-l-4 px-3 py-2 ${
                  own
                    ? "border-white/40 bg-white/10"
                    : "border-brand-400 bg-brand-50"
                }`}
              >
                <p
                  className={`text-[10px] font-bold ${
                    own
                      ? "text-brand-100"
                      : "text-brand-700"
                  }`}
                >
                  Reply to{" "}
                  {message
                    .replySnapshot
                    .senderName ||
                    titleCase(
                      message
                        .replySnapshot
                        .senderRole
                    )}
                </p>

                <p
                  className={`mt-1 line-clamp-2 text-[11px] leading-4 ${
                    own
                      ? "text-white/80"
                      : "text-slate-500"
                  }`}
                >
                  {message
                    .replySnapshot
                    .textPreview ||
                    "Attachment"}
                </p>
              </div>
            )}

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
              {message.displayText ||
                message.text ||
                "Message"}
            </p>

            <AttachmentList
              attachments={
                message.attachments
              }
              own={
                own
              }
            />

            <div
              className={`mt-2 flex items-center justify-end gap-1.5 text-[10px] ${
                own
                  ? "text-brand-100"
                  : "text-slate-400"
              }`}
            >
              {message.isEdited && (
                <span>
                  Edited
                </span>
              )}

              <span>
                {formatMessageTime(
                  message.sentAt
                )}
              </span>

              {own && (
                <CheckCheck
                  size={13}
                  className={
                    Array.isArray(
                      message.readBy
                    ) &&
                    message.readBy.length >
                      0
                      ? "text-cyan-200"
                      : "text-brand-200"
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| New Conversation Modal
|--------------------------------------------------------------------------
*/

const NewConversationModal = ({
  open,
  student,
  principal,
  initialValues,
  submitting,
  error,
  onClose,
  onSubmit
}) => {
  const [
    form,
    setForm
  ] = useState({
    subject:
      "",

    category:
      "general",

    priority:
      "normal",

    text:
      ""
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      subject:
        initialValues
          ?.subject ||
        "",

      category:
        PORTAL_MESSAGE_CATEGORIES.includes(
          initialValues
            ?.category
        )
          ? initialValues.category
          : "general",

      priority:
        PORTAL_MESSAGE_PRIORITIES.includes(
          initialValues
            ?.priority
        )
          ? initialValues.priority
          : "normal",

      text:
        initialValues
          ?.text ||
        ""
    });
  }, [
    open,
    initialValues
  ]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    const handleEscape =
      (
        event
      ) => {
        if (
          event.key ===
            "Escape" &&
          !submitting
        ) {
          onClose();
        }
      };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style
        .overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    open,
    submitting,
    onClose
  ]);

  if (!open) {
    return null;
  }

  const canSubmit =
    form.subject
      .trim()
      .length >=
      3 &&
    form.text
      .trim()
      .length >
      0 &&
    !submitting;

  const applyTemplate =
    (
      template
    ) => {
      setForm(
        (
          current
        ) => ({
          ...current,

          category:
            template.category,

          subject:
            template.subject,

          text:
            current.text.trim()
              ? current.text
              : template.text
        })
      );
    };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px]">
        <div className="relative overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />

          <button
            type="button"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
            disabled={
              submitting
            }
            onClick={
              onClose
            }
            aria-label="Close new conversation"
          >
            <X
              size={19}
            />
          </button>

          <div className="relative flex items-center gap-4 pr-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <MessageCircle
                size={22}
              />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-200">
                Secure Student Messaging
              </p>

              <h2 className="mt-1 text-2xl font-black">
                New Conversation
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Start a private conversation with the school principal.
              </p>
            </div>
          </div>
        </div>

        <form
          className="space-y-5 p-5 sm:p-7"
          onSubmit={(
            event
          ) => {
            event.preventDefault();

            if (
              canSubmit
            ) {
              onSubmit({
                studentId:
                  student?.id ||
                  undefined,

                ...form
              });
            }
          }}
        >
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-rose-600"
              />

              <p className="text-sm leading-6 text-rose-700">
                {error}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <UserRound
                  size={18}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900">
                  {student?.name ||
                    "Student"}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {formatClassName(
                    student
                  )}{" "}
                  ·{" "}
                  {student
                    ?.admissionNumber ||
                    "Admission number pending"}
                </p>
              </div>

              <div className="hidden text-right sm:block">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Recipient
                </p>

                <p className="mt-1 text-xs font-bold text-slate-700">
                  {principal?.name ||
                    "School Principal"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="field-label">
              Quick Templates
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_TEMPLATES.map(
                (
                  template
                ) => (
                  <button
                    key={
                      template.label
                    }
                    type="button"
                    className="rounded-full bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200"
                    onClick={() =>
                      applyTemplate(
                        template
                      )
                    }
                  >
                    {template.label}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="student-conversation-subject"
              className="field-label"
            >
              Subject
            </label>

            <input
              id="student-conversation-subject"
              type="text"
              value={
                form.subject
              }
              className="field-input mt-2"
              placeholder="Example: Attendance record for Monday"
              maxLength={
                160
              }
              autoFocus
              onChange={(
                event
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,

                    subject:
                      event.target
                        .value
                  })
                )
              }
            />

            <div className="mt-1 flex justify-between gap-3 text-[10px]">
              <span
                className={
                  form.subject
                    .trim()
                    .length >
                    0 &&
                  form.subject
                    .trim()
                    .length <
                    3
                    ? "text-rose-600"
                    : "text-slate-400"
                }
              >
                Minimum 3 characters
              </span>

              <span className="text-slate-400">
                {form.subject.length}/160
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="student-conversation-category"
                className="field-label"
              >
                Category
              </label>

              <select
                id="student-conversation-category"
                value={
                  form.category
                }
                className="field-select mt-2"
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,

                      category:
                        event.target
                          .value
                    })
                  )
                }
              >
                {PORTAL_MESSAGE_CATEGORIES.map(
                  (
                    category
                  ) => (
                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    >
                      {categoryDetails(
                        category
                      ).label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="student-conversation-priority"
                className="field-label"
              >
                Priority
              </label>

              <select
                id="student-conversation-priority"
                value={
                  form.priority
                }
                className="field-select mt-2"
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,

                      priority:
                        event.target
                          .value
                    })
                  )
                }
              >
                {PORTAL_MESSAGE_PRIORITIES.map(
                  (
                    priority
                  ) => (
                    <option
                      key={
                        priority
                      }
                      value={
                        priority
                      }
                    >
                      {priorityDetails(
                        priority
                      ).label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {form.priority ===
            "urgent" && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <Flag
                size={17}
                className="mt-0.5 shrink-0 text-rose-700"
              />

              <p className="text-xs leading-5 text-rose-700">
                Use urgent priority only for genuinely time-sensitive health, safety, transport or immediate school concerns.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="student-conversation-message"
              className="field-label"
            >
              First Message
            </label>

            <textarea
              id="student-conversation-message"
              value={
                form.text
              }
              className="field-input mt-2 min-h-[150px] resize-y py-3"
              placeholder="Explain your question or concern clearly…"
              maxLength={
                5000
              }
              onChange={(
                event
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,

                    text:
                      event.target
                        .value
                  })
                )
              }
            />

            <div className="mt-1 text-right text-[10px] text-slate-400">
              {form.text.length}/5000
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <Info
              size={17}
              className="mt-0.5 shrink-0 text-brand-600"
            />

            <p className="text-xs leading-5 text-slate-500">
              Messages are visible only to your student account and the school principal. File uploading is not enabled yet, but existing message attachments can be opened safely.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={
                submitting
              }
              onClick={
                onClose
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={
                !canSubmit
              }
            >
              {submitting ? (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Send
                  size={16}
                />
              )}

              {submitting
                ? "Sending…"
                : "Start Conversation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Student Messages Page
|--------------------------------------------------------------------------
*/

const StudentMessages =
  () => {
    const navigate =
      useNavigate();

    const location =
      useLocation();

    const [
      searchParams,
      setSearchParams
    ] = useSearchParams();

    const {
      student:
        overviewStudent,
      school:
        overviewSchool,
      online,
      refreshPortal
    } = useOutletContext();

    const listControllerRef =
      useRef(null);

    const threadControllerRef =
      useRef(null);

    const messageEndRef =
      useRef(null);

    const searchInputRef =
      useRef(null);

    const conversationsRef =
      useRef([]);

    const prefillHandledRef =
      useRef(false);

    const [
      summary,
      setSummary
    ] = useState(
      DEFAULT_SUMMARY
    );

    const [
      conversations,
      setConversations
    ] = useState([]);

    const [
      pagination,
      setPagination
    ] = useState(
      DEFAULT_PAGINATION
    );

    const [
      inboxLoading,
      setInboxLoading
    ] = useState(
      true
    );

    const [
      inboxRefreshing,
      setInboxRefreshing
    ] = useState(
      false
    );

    const [
      inboxError,
      setInboxError
    ] = useState("");

    const [
      searchInput,
      setSearchInput
    ] = useState("");

    const [
      search,
      setSearch
    ] = useState("");

    const [
      statusFilter,
      setStatusFilter
    ] = useState(
      "all"
    );

    const [
      categoryFilter,
      setCategoryFilter
    ] = useState(
      "all"
    );

    const [
      priorityFilter,
      setPriorityFilter
    ] = useState(
      "all"
    );

    const [
      archived,
      setArchived
    ] = useState(
      false
    );

    const [
      page,
      setPage
    ] = useState(
      1
    );

    const [
      selectedConversationId,
      setSelectedConversationId
    ] = useState(
      searchParams.get(
        "conversationId"
      ) ||
      ""
    );

    const [
      activeConversation,
      setActiveConversation
    ] = useState(null);

    const [
      messages,
      setMessages
    ] = useState([]);

    const [
      messagePagination,
      setMessagePagination
    ] = useState(
      DEFAULT_MESSAGE_PAGINATION
    );

    const [
      threadLoading,
      setThreadLoading
    ] = useState(
      false
    );

    const [
      loadingOlder,
      setLoadingOlder
    ] = useState(
      false
    );

    const [
      threadError,
      setThreadError
    ] = useState("");

    const [
      messageText,
      setMessageText
    ] = useState("");

    const [
      sending,
      setSending
    ] = useState(
      false
    );

    const [
      replyingTo,
      setReplyingTo
    ] = useState(null);

    const [
      actionLoading,
      setActionLoading
    ] = useState(
      false
    );

    const [
      composeOpen,
      setComposeOpen
    ] = useState(
      false
    );

    const [
      composeInitialValues,
      setComposeInitialValues
    ] = useState({
      subject:
        "",

      category:
        "general",

      priority:
        "normal",

      text:
        ""
    });

    const [
      composeSubmitting,
      setComposeSubmitting
    ] = useState(
      false
    );

    const [
      composeError,
      setComposeError
    ] = useState("");

    const [
      drafts,
      setDrafts
    ] = useState({});

    const student =
      overviewStudent ||
      activeConversation
        ?.student ||
      null;

    const school =
      overviewSchool ||
      student?.school ||
      {};

    const principal =
      activeConversation
        ?.principal ||
      null;

    const draftStorageKey =
      useMemo(
        () =>
          getDraftStorageKey(
            student
          ),
        [
          student
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Keep Conversation Ref Current
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      conversationsRef.current =
        conversations;
    }, [
      conversations
    ]);

    /*
    |--------------------------------------------------------------------------
    | Load Local Drafts
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (!student) {
        return;
      }

      setDrafts(
        readDrafts(
          draftStorageKey
        )
      );
    }, [
      student,
      draftStorageKey
    ]);

    /*
    |--------------------------------------------------------------------------
    | Debounced Search
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      const timeoutId =
        window.setTimeout(
          () => {
            setSearch(
              searchInput.trim()
            );
          },
          350
        );

      return () => {
        window.clearTimeout(
          timeoutId
        );
      };
    }, [
      searchInput
    ]);

    /*
    |--------------------------------------------------------------------------
    | Route and Page Prefill
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (
        prefillHandledRef.current
      ) {
        return;
      }

      const conversationId =
        searchParams.get(
          "conversationId"
        ) ||
        "";

      if (
        conversationId
      ) {
        setSelectedConversationId(
          conversationId
        );

        prefillHandledRef.current =
          true;

        return;
      }

      const stateCompose =
        location.state
          ?.compose ||
        null;

      const queryCategory =
        searchParams.get(
          "category"
        ) ||
        "";

      const querySubject =
        searchParams.get(
          "subject"
        ) ||
        "";

      const queryText =
        searchParams.get(
          "text"
        ) ||
        "";

      const queryPriority =
        searchParams.get(
          "priority"
        ) ||
        "";

      const shouldCompose =
        Boolean(
          stateCompose ||
          queryCategory ||
          querySubject ||
          queryText ||
          queryPriority
        );

      if (
        shouldCompose
      ) {
        const source =
          stateCompose ||
          {};

        setComposeInitialValues({
          subject:
            source.subject ||
            querySubject ||
            "",

          category:
            PORTAL_MESSAGE_CATEGORIES.includes(
              source.category ||
              queryCategory
            )
              ? source.category ||
                queryCategory
              : "general",

          priority:
            PORTAL_MESSAGE_PRIORITIES.includes(
              source.priority ||
              queryPriority
            )
              ? source.priority ||
                queryPriority
              : "normal",

          text:
            source.text ||
            queryText ||
            ""
        });

        setComposeOpen(
          true
        );
      }

      prefillHandledRef.current =
        true;

      if (
        location.state
      ) {
        navigate(
          {
            pathname:
              location.pathname,

            search:
              location.search
          },
          {
            replace:
              true,

            state:
              null
          }
        );
      }
    }, [
      location.pathname,
      location.search,
      location.state,
      navigate,
      searchParams
    ]);

    /*
    |--------------------------------------------------------------------------
    | Reset Page on Inbox Filters
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      setPage(
        1
      );
    }, [
      search,
      statusFilter,
      categoryFilter,
      priorityFilter,
      archived
    ]);

    /*
    |--------------------------------------------------------------------------
    | Load Inbox and Summary
    |--------------------------------------------------------------------------
    */

    const loadInbox =
      useCallback(
        async ({
          silent = false
        } = {}) => {
          listControllerRef
            .current
            ?.abort();

          const controller =
            new AbortController();

          listControllerRef
            .current =
            controller;

          if (
            silent
          ) {
            setInboxRefreshing(
              true
            );
          } else {
            setInboxLoading(
              true
            );
          }

          setInboxError(
            ""
          );

          try {
            const [
              summaryResponse,
              conversationResponse
            ] =
              await Promise.all([
                getPortalMessagingSummary({
                  signal:
                    controller.signal
                }),

                getPortalConversations(
                  {
                    archived,

                    page,

                    limit:
                      20,

                    search:
                      search ||
                      undefined,

                    status:
                      statusFilter ===
                      "all"
                        ? undefined
                        : statusFilter,

                    category:
                      categoryFilter ===
                      "all"
                        ? undefined
                        : categoryFilter,

                    priority:
                      priorityFilter ===
                      "all"
                        ? undefined
                        : priorityFilter
                  },
                  {
                    signal:
                      controller.signal
                  }
                )
              ]);

            setSummary(
              summaryResponse
                ?.data
                ?.data ||
                DEFAULT_SUMMARY
            );

            setConversations(
              conversationResponse
                ?.data
                ?.data
                ?.conversations ||
                []
            );

            setPagination(
              conversationResponse
                ?.data
                ?.data
                ?.pagination ||
                DEFAULT_PAGINATION
            );
          } catch (
            requestError
          ) {
            if (
              requestError?.name ===
                "CanceledError" ||
              requestError?.code ===
                "ERR_CANCELED"
            ) {
              return;
            }

            setInboxError(
              getErrorMessage(
                requestError
              )
            );
          } finally {
            if (
              !controller.signal
                .aborted
            ) {
              setInboxLoading(
                false
              );

              setInboxRefreshing(
                false
              );
            }
          }
        },
        [
          archived,
          page,
          search,
          statusFilter,
          categoryFilter,
          priorityFilter
        ]
      );

    useEffect(() => {
      loadInbox();

      return () => {
        listControllerRef
          .current
          ?.abort();
      };
    }, [
      loadInbox
    ]);

    /*
    |--------------------------------------------------------------------------
    | Load Conversation Thread
    |--------------------------------------------------------------------------
    */

    const loadThread =
      useCallback(
        async (
          conversationId,
          {
            silent = false,
            scrollToBottom =
              true
          } = {}
        ) => {
          if (
            !conversationId
          ) {
            return;
          }

          threadControllerRef
            .current
            ?.abort();

          const controller =
            new AbortController();

          threadControllerRef
            .current =
            controller;

          if (
            !silent
          ) {
            setThreadLoading(
              true
            );
          }

          setThreadError(
            ""
          );

          const unreadBefore =
            Number(
              conversationsRef
                .current
                .find(
                  (
                    conversation
                  ) =>
                    String(
                      conversation.id
                    ) ===
                    String(
                      conversationId
                    )
                )
                ?.unreadCount ||
                0
            );

          try {
            const response =
              await getPortalConversationMessages(
                conversationId,
                {
                  page:
                    1,

                  limit:
                    50,

                  markRead:
                    true
                },
                {
                  signal:
                    controller.signal
                }
              );

            const data =
              response?.data
                ?.data ||
              {};

            setActiveConversation(
              data.conversation ||
              null
            );

            setMessages(
              data.messages ||
              []
            );

            setMessagePagination(
              data.pagination ||
              DEFAULT_MESSAGE_PAGINATION
            );

            setConversations(
              (
                current
              ) =>
                current.map(
                  (
                    conversation
                  ) =>
                    String(
                      conversation.id
                    ) ===
                    String(
                      conversationId
                    )
                      ? {
                          ...conversation,

                          ...data.conversation,

                          unreadCount:
                            0
                        }
                      : conversation
                )
            );

            if (
              unreadBefore >
              0
            ) {
              setSummary(
                (
                  current
                ) => ({
                  ...current,

                  unreadMessages:
                    Math.max(
                      0,
                      Number(
                        current
                          .unreadMessages ||
                        0
                      ) -
                        unreadBefore
                    )
                })
              );
            }

            refreshPortal?.();

            if (
              scrollToBottom
            ) {
              window.setTimeout(
                () => {
                  messageEndRef
                    .current
                    ?.scrollIntoView({
                      behavior:
                        silent
                          ? "auto"
                          : "smooth"
                    });
                },
                50
              );
            }
          } catch (
            requestError
          ) {
            if (
              requestError?.name ===
                "CanceledError" ||
              requestError?.code ===
                "ERR_CANCELED"
            ) {
              return;
            }

            setThreadError(
              getErrorMessage(
                requestError
              )
            );
          } finally {
            if (
              !controller.signal
                .aborted &&
              !silent
            ) {
              setThreadLoading(
                false
              );
            }
          }
        },
        [
          refreshPortal
        ]
      );

    useEffect(() => {
      if (
        selectedConversationId
      ) {
        loadThread(
          selectedConversationId
        );

        const savedDraft =
          drafts[
            selectedConversationId
          ] ||
          "";

        setMessageText(
          savedDraft
        );
      } else {
        setActiveConversation(
          null
        );

        setMessages([]);

        setThreadError(
          ""
        );

        setMessageText(
          ""
        );
      }

      return () => {
        threadControllerRef
          .current
          ?.abort();
      };
    }, [
      selectedConversationId,
      loadThread
    ]);

    /*
    |--------------------------------------------------------------------------
    | Apply Draft after Draft Storage Loads
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (
        selectedConversationId &&
        !messageText
      ) {
        const savedDraft =
          drafts[
            selectedConversationId
          ];

        if (
          savedDraft
        ) {
          setMessageText(
            savedDraft
          );
        }
      }
    }, [
      drafts,
      selectedConversationId
    ]);

    /*
    |--------------------------------------------------------------------------
    | Automatic Refresh
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      const intervalId =
        window.setInterval(
          () => {
            if (
              !online ||
              document.visibilityState !==
                "visible"
            ) {
              return;
            }

            loadInbox({
              silent:
                true
            });

            if (
              selectedConversationId
            ) {
              loadThread(
                selectedConversationId,
                {
                  silent:
                    true,

                  scrollToBottom:
                    false
                }
              );
            }
          },
          30000
        );

      return () => {
        window.clearInterval(
          intervalId
        );
      };
    }, [
      online,
      loadInbox,
      loadThread,
      selectedConversationId
    ]);

    /*
    |--------------------------------------------------------------------------
    | Keyboard Shortcuts
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      const handleShortcut =
        (
          event
        ) => {
          const target =
            event.target;

          const isTyping =
            target instanceof
              HTMLInputElement ||
            target instanceof
              HTMLTextAreaElement ||
            target instanceof
              HTMLSelectElement;

          if (
            (
              event.ctrlKey ||
              event.metaKey
            ) &&
            event.key.toLowerCase() ===
              "k"
          ) {
            event.preventDefault();

            searchInputRef
              .current
              ?.focus();

            return;
          }

          if (
            !isTyping &&
            event.key.toLowerCase() ===
              "n"
          ) {
            event.preventDefault();

            setComposeError(
              ""
            );

            setComposeInitialValues({
              subject:
                "",

              category:
                "general",

              priority:
                "normal",

              text:
                ""
            });

            setComposeOpen(
              true
            );
          }

          if (
            event.key ===
              "Escape" &&
            selectedConversationId &&
            !composeOpen
          ) {
            setSelectedConversationId(
              ""
            );

            setSearchParams(
              {},
              {
                replace:
                  true
              }
            );
          }
        };

      document.addEventListener(
        "keydown",
        handleShortcut
      );

      return () => {
        document.removeEventListener(
          "keydown",
          handleShortcut
        );
      };
    }, [
      selectedConversationId,
      composeOpen,
      setSearchParams
    ]);

    /*
    |--------------------------------------------------------------------------
    | Select and Close Conversation
    |--------------------------------------------------------------------------
    */

    const selectConversation =
      (
        conversation
      ) => {
        const id =
          String(
            conversation.id
          );

        setSelectedConversationId(
          id
        );

        setReplyingTo(
          null
        );

        setMessageText(
          drafts[
            id
          ] ||
          ""
        );

        const nextParams =
          new URLSearchParams();

        nextParams.set(
          "conversationId",
          id
        );

        setSearchParams(
          nextParams,
          {
            replace:
              true
          }
        );
      };

    const closeThread =
      () => {
        setSelectedConversationId(
          ""
        );

        setActiveConversation(
          null
        );

        setMessages([]);

        setReplyingTo(
          null
        );

        setSearchParams(
          {},
          {
            replace:
              true
          }
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Load Older Messages
    |--------------------------------------------------------------------------
    */

    const loadOlderMessages =
      async () => {
        if (
          !selectedConversationId ||
          !messagePagination
            ?.hasMore ||
          loadingOlder
        ) {
          return;
        }

        const nextPage =
          Number(
            messagePagination
              .page ||
            1
          ) +
          1;

        setLoadingOlder(
          true
        );

        try {
          const response =
            await getPortalConversationMessages(
              selectedConversationId,
              {
                page:
                  nextPage,

                limit:
                  50,

                markRead:
                  false
              }
            );

          const data =
            response?.data
              ?.data ||
            {};

          setMessages(
            (
              current
            ) =>
              uniqueMessages([
                ...(
                  data.messages ||
                  []
                ),

                ...current
              ])
          );

          setMessagePagination(
            data.pagination ||
            {
              ...DEFAULT_MESSAGE_PAGINATION,

              page:
                nextPage,

              totalPages:
                nextPage
            }
          );
        } catch (
          requestError
        ) {
          setThreadError(
            getErrorMessage(
              requestError
            )
          );
        } finally {
          setLoadingOlder(
            false
          );
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Local Draft
    |--------------------------------------------------------------------------
    */

    const updateMessageDraft =
      (
        value
      ) => {
        setMessageText(
          value
        );

        if (
          !selectedConversationId
        ) {
          return;
        }

        setDrafts(
          (
            current
          ) => {
            const next = {
              ...current
            };

            if (
              value.trim()
            ) {
              next[
                selectedConversationId
              ] =
                value;
            } else {
              delete next[
                selectedConversationId
              ];
            }

            saveDrafts(
              draftStorageKey,
              next
            );

            return next;
          }
        );
      };

    const clearCurrentDraft =
      () => {
        if (
          !selectedConversationId
        ) {
          return;
        }

        setDrafts(
          (
            current
          ) => {
            const next = {
              ...current
            };

            delete next[
              selectedConversationId
            ];

            saveDrafts(
              draftStorageKey,
              next
            );

            return next;
          }
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Send Message
    |--------------------------------------------------------------------------
    */

    const submitMessage =
      async () => {
        const text =
          messageText.trim();

        if (
          !text ||
          !selectedConversationId ||
          sending ||
          activeConversation
            ?.status ===
            "closed" ||
          !online
        ) {
          return;
        }

        setSending(
          true
        );

        setThreadError(
          ""
        );

        try {
          const response =
            await sendPortalMessage(
              selectedConversationId,
              {
                text,

                replyToMessageId:
                  replyingTo?.id ||
                  undefined
              }
            );

          const data =
            response?.data
              ?.data ||
            {};

          if (
            data.message
          ) {
            setMessages(
              (
                current
              ) =>
                uniqueMessages([
                  ...current,
                  data.message
                ])
            );
          }

          if (
            data.conversation
          ) {
            setActiveConversation(
              data.conversation
            );

            setConversations(
              (
                current
              ) => [
                {
                  ...data.conversation,

                  unreadCount:
                    0
                },

                ...current.filter(
                  (
                    conversation
                  ) =>
                    String(
                      conversation.id
                    ) !==
                    String(
                      data.conversation.id
                    )
                )
              ]
            );
          }

          setMessageText(
            ""
          );

          clearCurrentDraft();

          setReplyingTo(
            null
          );

          loadInbox({
            silent:
              true
          });

          refreshPortal?.();

          window.setTimeout(
            () => {
              messageEndRef
                .current
                ?.scrollIntoView({
                  behavior:
                    "smooth"
                });
            },
            50
          );
        } catch (
          requestError
        ) {
          setThreadError(
            getErrorMessage(
              requestError
            )
          );
        } finally {
          setSending(
            false
          );
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Archive and Read Actions
    |--------------------------------------------------------------------------
    */

    const toggleArchive =
      async () => {
        if (
          !activeConversation ||
          actionLoading
        ) {
          return;
        }

        setActionLoading(
          true
        );

        setThreadError(
          ""
        );

        try {
          await setPortalConversationArchived(
            activeConversation.id,
            !activeConversation.isArchived
          );

          closeThread();

          await loadInbox({
            silent:
              true
          });
        } catch (
          requestError
        ) {
          setThreadError(
            getErrorMessage(
              requestError
            )
          );
        } finally {
          setActionLoading(
            false
          );
        }
      };

    const markSelectedRead =
      async () => {
        if (
          !activeConversation ||
          actionLoading
        ) {
          return;
        }

        setActionLoading(
          true
        );

        try {
          await markPortalConversationRead(
            activeConversation.id
          );

          setActiveConversation(
            (
              current
            ) =>
              current
                ? {
                    ...current,

                    unreadCount:
                      0
                  }
                : current
          );

          setConversations(
            (
              current
            ) =>
              current.map(
                (
                  conversation
                ) =>
                  String(
                    conversation.id
                  ) ===
                  String(
                    activeConversation.id
                  )
                    ? {
                        ...conversation,

                        unreadCount:
                          0
                      }
                    : conversation
              )
          );

          loadInbox({
            silent:
              true
          });

          refreshPortal?.();
        } catch (
          requestError
        ) {
          setThreadError(
            getErrorMessage(
              requestError
            )
          );
        } finally {
          setActionLoading(
            false
          );
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Compose Conversation
    |--------------------------------------------------------------------------
    */

    const openComposer =
      (
        values = {}
      ) => {
        setComposeError(
          ""
        );

        setComposeInitialValues({
          subject:
            values.subject ||
            "",

          category:
            values.category ||
            "general",

          priority:
            values.priority ||
            "normal",

          text:
            values.text ||
            ""
        });

        setComposeOpen(
          true
        );
      };

    const createConversation =
      async (
        form
      ) => {
        if (
          !online
        ) {
          setComposeError(
            "An internet connection is required to start a conversation."
          );

          return;
        }

        setComposeSubmitting(
          true
        );

        setComposeError(
          ""
        );

        try {
          const response =
            await createPortalConversation(
              form
            );

          const data =
            response?.data
              ?.data ||
            {};

          const conversation =
            data.conversation;

          if (
            conversation
          ) {
            setConversations(
              (
                current
              ) => [
                conversation,

                ...current.filter(
                  (
                    item
                  ) =>
                    String(
                      item.id
                    ) !==
                    String(
                      conversation.id
                    )
                )
              ]
            );

            setComposeOpen(
              false
            );

            setSelectedConversationId(
              String(
                conversation.id
              )
            );

            const nextParams =
              new URLSearchParams();

            nextParams.set(
              "conversationId",
              String(
                conversation.id
              )
            );

            setSearchParams(
              nextParams,
              {
                replace:
                  true
              }
            );
          }

          await loadInbox({
            silent:
              true
          });

          refreshPortal?.();
        } catch (
          requestError
        ) {
          setComposeError(
            getErrorMessage(
              requestError
            )
          );
        } finally {
          setComposeSubmitting(
            false
          );
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Download Loaded Transcript
    |--------------------------------------------------------------------------
    */

    const downloadTranscript =
      () => {
        if (
          !activeConversation ||
          messages.length ===
            0
        ) {
          return;
        }

        const lines = [
          school?.schoolName ||
            "School",

          "Student–Principal Conversation",

          `Subject: ${
            activeConversation.subject ||
            "Conversation"
          }`,

          `Student: ${
            student?.name ||
            "Student"
          }`,

          `Admission Number: ${
            student
              ?.admissionNumber ||
            "Not available"
          }`,

          `Category: ${
            categoryDetails(
              activeConversation.category
            ).label
          }`,

          `Status: ${
            statusDetails(
              activeConversation.status
            ).label
          }`,

          `Priority: ${
            priorityDetails(
              activeConversation.priority
            ).label
          }`,

          "",

          ...messages.flatMap(
            (
              message
            ) => [
              `[${formatFullDateTime(
                message.sentAt
              )}] ${
                message.isOwnMessage
                  ? "Student"
                  : message.sender
                      ?.name ||
                    "Principal"
              }:`,

              message.displayText ||
                message.text ||
                "Message",

              Array.isArray(
                message.attachments
              ) &&
              message.attachments.length >
                0
                ? `Attachments: ${message.attachments
                    .map(
                      (
                        attachment,
                        index
                      ) =>
                        getAttachmentName(
                          attachment,
                          index
                        )
                    )
                    .join(
                      ", "
                    )}`
                : "",

              ""
            ]
          ),

          "This transcript contains only the messages currently loaded in the Student Portal."
        ];

        downloadTextFile(
          `student-conversation-${
            String(
              activeConversation.subject ||
              activeConversation.id ||
              "transcript"
            )
              .toLowerCase()
              .replace(
                /[^a-z0-9]+/g,
                "-"
              )
              .replace(
                /^-|-$/g,
                ""
              )
              .slice(
                0,
                60
              ) ||
            "transcript"
          }.txt`,
          lines
            .filter(
              (
                line,
                index
              ) =>
                line !==
                  "" ||
                lines[
                  index -
                  1
                ] !==
                  ""
            )
            .join(
              "\n"
            )
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Derived Active Conversation Data
    |--------------------------------------------------------------------------
    */

    const activeCategory =
      categoryDetails(
        activeConversation
          ?.category
      );

    const activeStatus =
      statusDetails(
        activeConversation
          ?.status
      );

    const activePriority =
      priorityDetails(
        activeConversation
          ?.priority
      );

    const ActiveCategoryIcon =
      activeCategory.icon;

    const closed =
      activeConversation
        ?.status ===
      "closed";

    const visibleConversations =
      conversations;

    return (
      <div className="space-y-6">
        {/*
        |--------------------------------------------------------------------------
        | Hero
        |--------------------------------------------------------------------------
        */}

        <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-200">
                  <ShieldCheck
                    size={13}
                  />

                  Secure Student–Principal Messaging
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                    online
                      ? "bg-emerald-400/10 text-emerald-200 ring-emerald-300/20"
                      : "bg-rose-400/10 text-rose-200 ring-rose-300/20"
                  }`}
                >
                  {online ? (
                    <CheckCircle2
                      size={12}
                    />
                  ) : (
                    <WifiOff
                      size={12}
                    />
                  )}

                  {online
                    ? "Connected"
                    : "Offline"}
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                Messages with Principal
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Discuss attendance, fees, academics, health, transport, timetable and other school matters through a private student conversation.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-xl bg-white/10 px-3 py-2 text-slate-200 ring-1 ring-white/10">
                  {student?.name ||
                    "Student"}
                </span>

                <span className="rounded-xl bg-white/10 px-3 py-2 text-slate-200 ring-1 ring-white/10">
                  {formatClassName(
                    student
                  )}
                </span>

                <span className="rounded-xl bg-white/10 px-3 py-2 text-slate-200 ring-1 ring-white/10">
                  Admission:{" "}
                  {student
                    ?.admissionNumber ||
                    "Pending"}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row xl:flex-col">
              <button
                type="button"
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                disabled={
                  !online
                }
                onClick={() =>
                  openComposer()
                }
              >
                <Plus
                  size={18}
                />

                New Conversation
              </button>

              <div className="hidden items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10 sm:flex">
                <Keyboard
                  size={13}
                />

                Press N to compose · Ctrl K to search
              </div>
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Summary
        |--------------------------------------------------------------------------
        */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Conversations"
            value={
              summary
                .totalConversations ||
              0
            }
            helper="Current non-archived conversations with the school."
            icon={
              MessageCircle
            }
            tone="brand"
          />

          <SummaryCard
            title="Open"
            value={
              summary
                .openConversations ||
              0
            }
            helper="Conversations still requiring follow-up."
            icon={
              Inbox
            }
            tone="emerald"
          />

          <SummaryCard
            title="Unread Messages"
            value={
              summary
                .unreadMessages ||
              0
            }
            helper="New principal messages waiting to be read."
            icon={
              BellRing
            }
            tone="amber"
          />

          <SummaryCard
            title="Urgent"
            value={
              summary
                .urgentConversations ||
              0
            }
            helper="Conversations marked with urgent priority."
            icon={
              CircleAlert
            }
            tone="rose"
          />
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Offline Notice
        |--------------------------------------------------------------------------
        */}

        {!online && (
          <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <WifiOff
              size={19}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <div>
              <p className="text-sm font-bold text-amber-900">
                Messaging is currently read-only
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                Existing loaded messages remain visible, but sending, composing and refreshing require an internet connection.
              </p>
            </div>
          </section>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Messaging Workspace
        |--------------------------------------------------------------------------
        */}

        <section className="grid min-h-[760px] overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm lg:grid-cols-[390px_minmax(0,1fr)]">
          {/*
          |--------------------------------------------------------------------------
          | Inbox
          |--------------------------------------------------------------------------
          */}

          <div
            className={`min-w-0 flex-col border-r border-slate-200 ${
              selectedConversationId
                ? "hidden lg:flex"
                : "flex"
            }`}
          >
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">
                    Conversation Inbox
                  </p>

                  <h3 className="mt-1 text-lg font-black text-slate-900">
                    {archived
                      ? "Archived Messages"
                      : "Current Messages"}
                  </h3>
                </div>

                <button
                  type="button"
                  className="btn-ghost h-10 px-3"
                  disabled={
                    inboxRefreshing ||
                    !online
                  }
                  onClick={() =>
                    loadInbox({
                      silent:
                        true
                    })
                  }
                  aria-label="Refresh inbox"
                  title="Refresh inbox"
                >
                  <RefreshCw
                    size={16}
                    className={
                      inboxRefreshing
                        ? "animate-spin"
                        : ""
                    }
                  />
                </button>
              </div>

              <div className="relative mt-4">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  ref={
                    searchInputRef
                  }
                  type="search"
                  value={
                    searchInput
                  }
                  className="field-input h-10 pl-10"
                  placeholder="Search conversations…"
                  onChange={(
                    event
                  ) =>
                    setSearchInput(
                      event.target
                        .value
                    )
                  }
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <select
                  value={
                    statusFilter
                  }
                  className="field-select h-10 text-xs"
                  onChange={(
                    event
                  ) =>
                    setStatusFilter(
                      event.target
                        .value
                    )
                  }
                >
                  {STATUS_FILTERS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={
                    categoryFilter
                  }
                  className="field-select h-10 text-xs"
                  onChange={(
                    event
                  ) =>
                    setCategoryFilter(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="all">
                    All Categories
                  </option>

                  {PORTAL_MESSAGE_CATEGORIES.map(
                    (
                      category
                    ) => (
                      <option
                        key={
                          category
                        }
                        value={
                          category
                        }
                      >
                        {categoryDetails(
                          category
                        ).label}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={
                    priorityFilter
                  }
                  className="field-select h-10 text-xs"
                  onChange={(
                    event
                  ) =>
                    setPriorityFilter(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="all">
                    All Priorities
                  </option>

                  {PORTAL_MESSAGE_PRIORITIES.map(
                    (
                      priority
                    ) => (
                      <option
                        key={
                          priority
                        }
                        value={
                          priority
                        }
                      >
                        {priorityDetails(
                          priority
                        ).label}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  className="btn-ghost h-10 justify-center px-3 text-xs"
                  onClick={() =>
                    setArchived(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                >
                  {archived ? (
                    <ArchiveRestore
                      size={15}
                    />
                  ) : (
                    <Archive
                      size={15}
                    />
                  )}

                  {archived
                    ? "Inbox"
                    : "Archived"}
                </button>
              </div>
            </div>

            {inboxError && (
              <div className="m-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0 text-rose-600"
                  />

                  <div>
                    <p className="text-xs font-bold text-rose-800">
                      Inbox could not be loaded
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-rose-600">
                      {inboxError}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {inboxLoading ? (
                <div className="grid min-h-[400px] place-items-center text-center">
                  <div>
                    <LoaderCircle
                      size={26}
                      className="mx-auto animate-spin text-brand-600"
                    />

                    <p className="mt-3 text-xs font-bold text-slate-700">
                      Loading conversations…
                    </p>
                  </div>
                </div>
              ) : visibleConversations.length >
                0 ? (
                visibleConversations.map(
                  (
                    conversation
                  ) => (
                    <ConversationListItem
                      key={
                        conversation.id
                      }
                      conversation={
                        conversation
                      }
                      active={
                        String(
                          selectedConversationId
                        ) ===
                        String(
                          conversation.id
                        )
                      }
                      draft={
                        drafts[
                          String(
                            conversation.id
                          )
                        ] ||
                        ""
                      }
                      onSelect={
                        selectConversation
                      }
                    />
                  )
                )
              ) : (
                <div className="grid min-h-[400px] place-items-center p-7 text-center">
                  <div>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                      <Inbox
                        size={27}
                      />
                    </div>

                    <h4 className="mt-4 text-base font-black text-slate-800">
                      No conversations found
                    </h4>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Change the filters or start a new conversation with the principal.
                    </p>

                    <button
                      type="button"
                      className="btn-primary mt-5"
                      disabled={
                        !online
                      }
                      onClick={() =>
                        openComposer()
                      }
                    >
                      <Plus
                        size={16}
                      />

                      New Conversation
                    </button>
                  </div>
                </div>
              )}
            </div>

            {pagination.totalPages >
              1 && (
              <div className="flex items-center justify-between border-t border-slate-200 p-3">
                <button
                  type="button"
                  className="btn-ghost h-9 px-3"
                  disabled={
                    page <=
                    1
                  }
                  onClick={() =>
                    setPage(
                      (
                        current
                      ) =>
                        Math.max(
                          1,
                          current -
                            1
                        )
                    )
                  }
                >
                  <ChevronLeft
                    size={15}
                  />

                  Previous
                </button>

                <span className="text-[11px] font-semibold text-slate-400">
                  {pagination.page} /{" "}
                  {pagination.totalPages}
                </span>

                <button
                  type="button"
                  className="btn-ghost h-9 px-3"
                  disabled={
                    page >=
                    pagination.totalPages
                  }
                  onClick={() =>
                    setPage(
                      (
                        current
                      ) =>
                        Math.min(
                          pagination.totalPages,
                          current +
                            1
                        )
                    )
                  }
                >
                  Next

                  <ChevronRight
                    size={15}
                  />
                </button>
              </div>
            )}
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Conversation Thread
          |--------------------------------------------------------------------------
          */}

          <div
            className={`min-w-0 flex-col ${
              selectedConversationId
                ? "flex"
                : "hidden lg:flex"
            }`}
          >
            {!selectedConversationId ? (
              <div className="grid min-h-[760px] place-items-center p-8 text-center">
                <div className="max-w-md">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-brand-50 text-brand-700">
                    <MessageCircle
                      size={34}
                    />
                  </div>

                  <h3 className="mt-6 text-xl font-black text-slate-900">
                    Select a conversation
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    Choose a conversation from the inbox or start a new secure message with the principal.
                  </p>

                  <button
                    type="button"
                    className="btn-primary mt-6"
                    disabled={
                      !online
                    }
                    onClick={() =>
                      openComposer()
                    }
                  >
                    <Plus
                      size={16}
                    />

                    New Conversation
                  </button>
                </div>
              </div>
            ) : threadLoading ? (
              <div className="grid min-h-[760px] place-items-center text-center">
                <div>
                  <LoaderCircle
                    size={28}
                    className="mx-auto animate-spin text-brand-600"
                  />

                  <p className="mt-4 text-sm font-black text-slate-800">
                    Loading conversation
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Retrieving secure messages…
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/*
                |--------------------------------------------------------------------------
                | Thread Header
                |--------------------------------------------------------------------------
                */}

                <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="btn-ghost h-10 px-3 lg:hidden"
                      onClick={
                        closeThread
                      }
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft
                        size={17}
                      />
                    </button>

                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${activeCategory.iconBox}`}
                    >
                      <ActiveCategoryIcon
                        size={19}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-black text-slate-900 sm:text-lg">
                          {activeConversation
                            ?.subject ||
                            "Conversation"}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[9px] font-bold ring-1 ${activeStatus.classes}`}
                        >
                          {activeStatus.label}
                        </span>

                        {activeConversation
                          ?.priority !==
                          "normal" && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] font-bold ring-1 ${activePriority.classes}`}
                          >
                            {activePriority.label}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {activeConversation
                          ?.principal
                          ?.name
                          ? `Principal: ${activeConversation.principal.name}`
                          : "School principal conversation"}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        {activeStatus.description}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {Number(
                        activeConversation
                          ?.unreadCount ||
                          0
                      ) >
                        0 && (
                        <button
                          type="button"
                          className="btn-ghost h-10 px-3"
                          disabled={
                            actionLoading
                          }
                          onClick={
                            markSelectedRead
                          }
                          title="Mark conversation as read"
                        >
                          <Check
                            size={16}
                          />
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-ghost h-10 px-3"
                        disabled={
                          messages.length ===
                          0
                        }
                        onClick={
                          downloadTranscript
                        }
                        title="Download loaded transcript"
                      >
                        <Download
                          size={16}
                        />
                      </button>

                      <button
                        type="button"
                        className="btn-secondary h-10 px-3"
                        disabled={
                          actionLoading
                        }
                        onClick={
                          toggleArchive
                        }
                        title={
                          activeConversation
                            ?.isArchived
                            ? "Restore conversation"
                            : "Archive conversation"
                        }
                      >
                        {actionLoading ? (
                          <LoaderCircle
                            size={16}
                            className="animate-spin"
                          />
                        ) : activeConversation
                            ?.isArchived ? (
                          <ArchiveRestore
                            size={16}
                          />
                        ) : (
                          <Archive
                            size={16}
                          />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {threadError && (
                  <div className="mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 sm:mx-5">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-rose-600"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-rose-800">
                        Messaging error
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-rose-600">
                        {threadError}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="text-rose-600"
                      onClick={() =>
                        setThreadError(
                          ""
                        )
                      }
                      aria-label="Dismiss error"
                    >
                      <X
                        size={15}
                      />
                    </button>
                  </div>
                )}

                {/*
                |--------------------------------------------------------------------------
                | Messages
                |--------------------------------------------------------------------------
                */}

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-4 py-5 sm:px-6">
                  {messagePagination
                    ?.hasMore && (
                    <div className="mb-5 text-center">
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={
                          loadingOlder
                        }
                        onClick={
                          loadOlderMessages
                        }
                      >
                        {loadingOlder ? (
                          <LoaderCircle
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <ArrowDown
                            size={15}
                            className="rotate-180"
                          />
                        )}

                        Load Earlier Messages
                      </button>
                    </div>
                  )}

                  {messages.length >
                  0 ? (
                    <div className="space-y-4">
                      {messages.map(
                        (
                          message
                        ) => (
                          <MessageBubble
                            key={
                              message.id
                            }
                            message={
                              message
                            }
                            onReply={
                              setReplyingTo
                            }
                          />
                        )
                      )}

                      <div
                        ref={
                          messageEndRef
                        }
                      />
                    </div>
                  ) : (
                    <div className="grid min-h-[400px] place-items-center text-center">
                      <div>
                        <MessageCircle
                          size={32}
                          className="mx-auto text-slate-300"
                        />

                        <h4 className="mt-4 text-base font-black text-slate-800">
                          No messages available
                        </h4>

                        <p className="mt-2 text-xs text-slate-500">
                          Send the first message in this conversation.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/*
                |--------------------------------------------------------------------------
                | Composer
                |--------------------------------------------------------------------------
                */}

                <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
                  {closed ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <ShieldCheck
                        size={19}
                        className="mt-0.5 shrink-0 text-slate-500"
                      />

                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          This conversation is closed
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          The principal must reopen the conversation before another message can be sent.
                        </p>
                      </div>
                    </div>
                  ) : !online ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                      <WifiOff
                        size={19}
                        className="mt-0.5 shrink-0 text-amber-700"
                      />

                      <div>
                        <p className="text-sm font-bold text-amber-900">
                          You are offline
                        </p>

                        <p className="mt-1 text-xs leading-5 text-amber-700">
                          Your text remains saved as a private browser draft. Reconnect before sending.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {replyingTo && (
                        <div className="mb-3 flex items-start gap-3 rounded-2xl border-l-4 border-brand-500 bg-brand-50 px-4 py-3">
                          <Reply
                            size={16}
                            className="mt-0.5 shrink-0 text-brand-700"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">
                              Replying to{" "}
                              {replyingTo
                                .sender
                                ?.name ||
                                titleCase(
                                  replyingTo
                                    .sender
                                    ?.role
                                )}
                            </p>

                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                              {replyingTo
                                .displayText ||
                                replyingTo
                                  .text ||
                                "Attachment"}
                            </p>
                          </div>

                          <button
                            type="button"
                            className="text-brand-700"
                            onClick={() =>
                              setReplyingTo(
                                null
                              )
                            }
                            aria-label="Cancel reply"
                          >
                            <X
                              size={16}
                            />
                          </button>
                        </div>
                      )}

                      <div className="flex items-end gap-3">
                        <div className="min-w-0 flex-1">
                          <textarea
                            value={
                              messageText
                            }
                            className="field-input min-h-[52px] max-h-[180px] resize-y py-3"
                            placeholder="Write a message… Press Enter to send"
                            maxLength={
                              5000
                            }
                            onChange={(
                              event
                            ) =>
                              updateMessageDraft(
                                event.target
                                  .value
                              )
                            }
                            onKeyDown={(
                              event
                            ) => {
                              if (
                                event.key ===
                                  "Enter" &&
                                !event.shiftKey
                              ) {
                                event.preventDefault();

                                submitMessage();
                              }
                            }}
                          />

                          <div className="mt-1 flex items-center justify-between gap-3 px-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Paperclip
                                size={12}
                              />

                              Attachments are currently view-only
                            </div>

                            <span className="text-[10px] text-slate-400">
                              {messageText.length}/5000
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                          disabled={
                            !messageText.trim() ||
                            sending
                          }
                          onClick={
                            submitMessage
                          }
                          aria-label="Send message"
                        >
                          {sending ? (
                            <LoaderCircle
                              size={19}
                              className="animate-spin"
                            />
                          ) : (
                            <Send
                              size={19}
                            />
                          )}
                        </button>
                      </div>

                      {messageText.trim() && (
                        <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-violet-600">
                          <Sparkles
                            size={12}
                          />

                          Draft saved privately in this browser
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Information
        |--------------------------------------------------------------------------
        */}

        <section className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ShieldCheck
                  size={22}
                />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  Private School Communication
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Conversations are scoped to your student account, school and assigned principal.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Flag
                  size={22}
                />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  Use Urgent Carefully
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Reserve urgent priority for time-sensitive health, safety, transport or immediate school concerns.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <Info
                  size={22}
                />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  Emergency Matters
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  This inbox is not an emergency service. Use the school’s immediate contact method for urgent real-world safety situations.
                </p>
              </div>
            </div>
          </article>
        </section>

        <NewConversationModal
          open={
            composeOpen
          }
          student={
            student
          }
          principal={
            principal
          }
          initialValues={
            composeInitialValues
          }
          submitting={
            composeSubmitting
          }
          error={
            composeError
          }
          onClose={() => {
            if (
              !composeSubmitting
            ) {
              setComposeOpen(
                false
              );

              setComposeError(
                ""
              );
            }
          }}
          onSubmit={
            createConversation
          }
        />
      </div>
    );
  };

export default StudentMessages;
