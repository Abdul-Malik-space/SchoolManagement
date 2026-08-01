import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Bus,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Flag,
  HeartPulse,
  Inbox,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle
} from "lucide-react";

import {
  useSearchParams
} from "react-router-dom";

import {
  PORTAL_MESSAGE_CATEGORIES,
  PORTAL_MESSAGE_PRIORITIES,
  getPortalConversationMessages,
  getPortalConversations,
  getPortalMessagingSummary,
  sendPortalMessage,
  setPortalConversationArchived,
  updatePortalConversationStatus
} from "../../api/portalMessages";

import {
  useAuth
} from "../../context/AuthContext";

import {
  PageHeader
} from "../../components/ui/PageHeader";

/*
|--------------------------------------------------------------------------
| Display Constants
|--------------------------------------------------------------------------
*/

const CATEGORY_DETAILS = {
  academics: {
    label: "Academics",
    icon: BookOpen,
    badge:
      "bg-brand-50 text-brand-700 ring-brand-200",
    iconBox:
      "bg-brand-50 text-brand-700"
  },

  attendance: {
    label: "Attendance",
    icon: CheckCheck,
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
    iconBox:
      "bg-emerald-50 text-emerald-700"
  },

  fees: {
    label: "Fees",
    icon: FileText,
    badge:
      "bg-amber-50 text-amber-700 ring-amber-200",
    iconBox:
      "bg-amber-50 text-amber-700"
  },

  behavior: {
    label: "Behavior",
    icon: ShieldCheck,
    badge:
      "bg-violet-50 text-violet-700 ring-violet-200",
    iconBox:
      "bg-violet-50 text-violet-700"
  },

  health: {
    label: "Health",
    icon: HeartPulse,
    badge:
      "bg-rose-50 text-rose-700 ring-rose-200",
    iconBox:
      "bg-rose-50 text-rose-700"
  },

  transport: {
    label: "Transport",
    icon: Bus,
    badge:
      "bg-cyan-50 text-cyan-700 ring-cyan-200",
    iconBox:
      "bg-cyan-50 text-cyan-700"
  },

  timetable: {
    label: "Timetable",
    icon: Clock3,
    badge:
      "bg-indigo-50 text-indigo-700 ring-indigo-200",
    iconBox:
      "bg-indigo-50 text-indigo-700"
  },

  general: {
    label: "General",
    icon: MessageCircle,
    badge:
      "bg-slate-100 text-slate-700 ring-slate-200",
    iconBox:
      "bg-slate-100 text-slate-700"
  },

  other: {
    label: "Other",
    icon: MoreHorizontal,
    badge:
      "bg-slate-100 text-slate-700 ring-slate-200",
    iconBox:
      "bg-slate-100 text-slate-700"
  }
};

const STATUS_DETAILS = {
  open: {
    label: "Open",
    classes:
      "bg-emerald-50 text-emerald-700 ring-emerald-200"
  },

  waiting_for_school: {
    label: "Waiting for School",
    classes:
      "bg-amber-50 text-amber-700 ring-amber-200"
  },

  waiting_for_family: {
    label: "Waiting for Family",
    classes:
      "bg-cyan-50 text-cyan-700 ring-cyan-200"
  },

  resolved: {
    label: "Resolved",
    classes:
      "bg-brand-50 text-brand-700 ring-brand-200"
  },

  closed: {
    label: "Closed",
    classes:
      "bg-slate-100 text-slate-600 ring-slate-200"
  }
};

const STATUS_FILTERS = [
  {
    value: "all",
    label: "All Statuses"
  },

  {
    value: "open",
    label: "Open"
  },

  {
    value: "waiting_for_school",
    label: "Waiting for School"
  },

  {
    value: "waiting_for_family",
    label: "Waiting for Family"
  },

  {
    value: "resolved",
    label: "Resolved"
  },

  {
    value: "closed",
    label: "Closed"
  }
];

const PRIORITY_DETAILS = {
  normal: {
    label: "Normal",
    classes:
      "bg-slate-100 text-slate-600 ring-slate-200"
  },

  high: {
    label: "High",
    classes:
      "bg-orange-50 text-orange-700 ring-orange-200"
  },

  urgent: {
    label: "Urgent",
    classes:
      "bg-rose-600 text-white ring-rose-600"
  }
};

const DEFAULT_SUMMARY = {
  totalConversations: 0,
  openConversations: 0,
  unreadMessages: 0,
  urgentConversations: 0
};

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  totalRecords: 0,
  totalPages: 1
};

const DEFAULT_MESSAGE_PAGINATION = {
  page: 1,
  limit: 50,
  totalRecords: 0,
  totalPages: 1,
  hasMore: false
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getErrorMessage = (
  error,
  fallback =
    "Unable to complete the messaging request."
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const titleCase = (
  value
) => {
  return String(
    value ||
    ""
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
  return (
    String(
      value ||
      "User"
    )
      .split(" ")
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
      .join("")
      .toUpperCase() ||
    "U"
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
    ] || {
      label:
        titleCase(
          status ||
          "open"
        ),

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

const getFamilyParticipant = (
  conversation
) => {
  if (
    conversation?.parent
  ) {
    return {
      ...conversation.parent,
      roleLabel:
        "Parent"
    };
  }

  if (
    conversation?.studentAccount
  ) {
    return {
      ...conversation.studentAccount,
      roleLabel:
        "Student"
    };
  }

  return {
    name:
      "Family Account",

    email:
      "",

    phone:
      "",

    roleLabel:
      "Family"
  };
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
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (
      1024 *
      1024
    )
  ).toFixed(1)} MB`;
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
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
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
    </div>
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

  const family =
    getFamilyParticipant(
      conversation
    );

  return (
    <button
      type="button"
      className={`w-full border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 ${
        active
          ? "bg-brand-50"
          : "bg-white hover:bg-slate-50"
      }`}
      onClick={
        () =>
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

          {Number(
            conversation.unreadCount ||
            0
          ) >
            0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white ring-2 ring-white">
              {Math.min(
                99,
                Number(
                  conversation.unreadCount
                )
              )}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`truncate text-sm ${
                Number(
                  conversation.unreadCount ||
                  0
                ) >
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

          <p className="mt-1 truncate text-xs font-semibold text-brand-700">
            {family.name} ·{" "}
            {conversation.student
              ?.name ||
              "General matter"}
          </p>

          <p
            className={`mt-1 line-clamp-2 text-xs leading-5 ${
              Number(
                conversation.unreadCount ||
                0
              ) >
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
  attachments
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
          const name =
            getAttachmentName(
              attachment,
              index
            );

          const url =
            getAttachmentUrl(
              attachment
            );

          const size =
            formatFileSize(
              attachment?.size ||
              attachment?.fileSize
            );

          const content = (
            <>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-slate-500 shadow-sm">
                <Paperclip
                  size={16}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">
                  {name}
                </p>

                {size && (
                  <p className="mt-0.5 text-[10px] opacity-70">
                    {size}
                  </p>
                )}
              </div>
            </>
          );

          if (
            url
          ) {
            return (
              <a
                key={`${name}-${index}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/40 p-2.5 transition hover:bg-white/70"
              >
                {content}
              </a>
            );
          }

          return (
            <div
              key={`${name}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/40 p-2.5"
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
  message
}) => {
  const own =
    Boolean(
      message.isOwnMessage
    );

  const senderName =
    message.sender?.name ||
    (
      own
        ? "Principal"
        : "Family"
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
        className={`max-w-[88%] sm:max-w-[76%] ${
          own
            ? "items-end"
            : "items-start"
        }`}
      >
        <div className="mb-1 flex items-center gap-2 px-1 text-[10px] font-semibold text-slate-400">
          {!own && (
            <span>
              {senderName}
            </span>
          )}

          <span>
            {titleCase(
              message.sender?.role ||
              ""
            )}
          </span>
        </div>

        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            own
              ? "rounded-br-md bg-brand-600 text-white"
              : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
          }`}
        >
          {message.replySnapshot && (
            <div
              className={`mb-3 rounded-xl border-l-2 px-3 py-2 text-xs ${
                own
                  ? "border-white/70 bg-white/10 text-white/80"
                  : "border-brand-400 bg-slate-50 text-slate-500"
              }`}
            >
              <p className="font-bold">
                Reply to{" "}
                {message.replySnapshot
                  .senderName ||
                  "message"}
              </p>

              <p className="mt-1 line-clamp-2">
                {message.replySnapshot
                  .textPreview ||
                  "Attachment"}
              </p>
            </div>
          )}

          <p className="whitespace-pre-wrap break-words text-sm leading-6">
            {message.displayText ||
              message.text ||
              "Message"}
          </p>

          <AttachmentList
            attachments={
              message.attachments
            }
          />

          <div
            className={`mt-2 flex items-center justify-end gap-1 text-[10px] ${
              own
                ? "text-white/65"
                : "text-slate-400"
            }`}
          >
            <span>
              {formatMessageTime(
                message.sentAt
              )}
            </span>

            {own && (
              <CheckCheck
                size={13}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Empty and Loading States
|--------------------------------------------------------------------------
*/

const InboxLoading = () => {
  return (
    <div className="space-y-3 p-4">
      {Array.from({
        length:
          6
      }).map(
        (
          _,
          index
        ) => (
          <div
            key={index}
            className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-3"
          >
            <div className="h-11 w-11 rounded-2xl bg-slate-100" />

            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-40 rounded bg-slate-100" />

              <div className="h-2.5 w-56 max-w-full rounded bg-slate-100" />

              <div className="h-2.5 w-28 rounded bg-slate-100" />
            </div>
          </div>
        )
      )}
    </div>
  );
};

const AccessDenied = () => {
  return (
    <div className="card p-8 text-center">
      <LockKeyhole
        size={36}
        className="mx-auto text-rose-400"
      />

      <h2 className="mt-4 text-lg font-black text-slate-900">
        Principal access required
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        This inbox is available only to the active Principal account assigned to the school.
      </p>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Principal Messages Page
|--------------------------------------------------------------------------
*/

const PrincipalMessages = () => {
  const {
    user
  } = useAuth();

  const [
    searchParams,
    setSearchParams
  ] = useSearchParams();

  const listControllerRef =
    useRef(null);

  const threadControllerRef =
    useRef(null);

  const messageEndRef =
    useRef(null);

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
  ] = useState(true);

  const [
    inboxRefreshing,
    setInboxRefreshing
  ] = useState(false);

  const [
    inboxError,
    setInboxError
  ] = useState("");

  const [
    search,
    setSearch
  ] = useState("");

  const [
    debouncedSearch,
    setDebouncedSearch
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter
  ] = useState("all");

  const [
    categoryFilter,
    setCategoryFilter
  ] = useState("all");

  const [
    priorityFilter,
    setPriorityFilter
  ] = useState("all");

  const [
    archived,
    setArchived
  ] = useState(false);

  const [
    page,
    setPage
  ] = useState(1);

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
  ] = useState(false);

  const [
    loadingOlder,
    setLoadingOlder
  ] = useState(false);

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
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading
  ] = useState(false);

  const [
    success,
    setSuccess
  ] = useState("");

  const isPrincipal =
    user?.role ===
    "principal";

  /*
  |--------------------------------------------------------------------------
  | Search Debounce
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            setDebouncedSearch(
              search.trim()
            );
          },
          350
        );

      return () => {
        window.clearTimeout(
          timer
        );
      };
    },
    [
      search
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Reset Inbox Page on Filters
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      setPage(1);
    },
    [
      debouncedSearch,
      statusFilter,
      categoryFilter,
      priorityFilter,
      archived
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Success Message Timeout
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      if (
        !success
      ) {
        return undefined;
      }

      const timer =
        window.setTimeout(
          () => {
            setSuccess("");
          },
          4500
        );

      return () => {
        window.clearTimeout(
          timer
        );
      };
    },
    [
      success
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Load Inbox and Summary
  |--------------------------------------------------------------------------
  */

  const loadInbox =
    useCallback(
      async ({
        silent =
          false
      } = {}) => {
        if (
          !isPrincipal
        ) {
          return;
        }

        listControllerRef.current?.abort();

        const controller =
          new AbortController();

        listControllerRef.current =
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

        setInboxError("");

        try {
          const [
            summaryResponse,
            conversationResponse
          ] = await Promise.all([
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
                  debouncedSearch ||
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
              requestError,
              "Principal inbox could not be loaded."
            )
          );
        } finally {
          if (
            !controller.signal.aborted
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
        categoryFilter,
        debouncedSearch,
        isPrincipal,
        page,
        priorityFilter,
        statusFilter
      ]
    );

  useEffect(
    () => {
      loadInbox();

      return () => {
        listControllerRef.current?.abort();
      };
    },
    [
      loadInbox
    ]
  );

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
          silent =
            false,

          scrollToBottom =
            true
        } = {}
      ) => {
        if (
          !conversationId ||
          !isPrincipal
        ) {
          return;
        }

        threadControllerRef.current?.abort();

        const controller =
          new AbortController();

        threadControllerRef.current =
          controller;

        if (
          !silent
        ) {
          setThreadLoading(
            true
          );
        }

        setThreadError("");

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
            response?.data?.data ||
            {};

          const previousUnread =
            Number(
              conversations.find(
                (
                  conversation
                ) =>
                  String(
                    conversation.id
                  ) ===
                  String(
                    conversationId
                  )
              )?.unreadCount ||
              0
            );

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
                        ...(
                          data.conversation ||
                          {}
                        ),
                        unreadCount:
                          0
                      }
                    : conversation
              )
          );

          if (
            previousUnread >
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
                      current.unreadMessages ||
                      0
                    ) -
                      previousUnread
                  )
              })
            );
          }

          if (
            scrollToBottom
          ) {
            window.setTimeout(
              () => {
                messageEndRef.current?.scrollIntoView({
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
              requestError,
              "Conversation messages could not be loaded."
            )
          );
        } finally {
          if (
            !controller.signal.aborted &&
            !silent
          ) {
            setThreadLoading(
              false
            );
          }
        }
      },
      [
        conversations,
        isPrincipal
      ]
    );

  useEffect(
    () => {
      if (
        selectedConversationId
      ) {
        loadThread(
          selectedConversationId
        );
      } else {
        setActiveConversation(
          null
        );

        setMessages([]);
        setThreadError("");
      }

      return () => {
        threadControllerRef.current?.abort();
      };
    },
    [
      selectedConversationId
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Automatic Refresh
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      if (
        !isPrincipal
      ) {
        return undefined;
      }

      const intervalId =
        window.setInterval(
          () => {
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
    },
    [
      isPrincipal,
      loadInbox,
      loadThread,
      selectedConversationId
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Selected Conversation
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

      setMessageText("");

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
      setSelectedConversationId("");
      setActiveConversation(null);
      setMessages([]);
      setMessageText("");
      setThreadError("");

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
        !messagePagination.hasMore ||
        loadingOlder
      ) {
        return;
      }

      setLoadingOlder(
        true
      );

      setThreadError("");

      try {
        const nextPage =
          Number(
            messagePagination.page ||
            1
          ) +
          1;

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
          response?.data?.data ||
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
              nextPage
          }
        );
      } catch (
        requestError
      ) {
        setThreadError(
          getErrorMessage(
            requestError,
            "Older messages could not be loaded."
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
  | Send Principal Reply
  |--------------------------------------------------------------------------
  */

  const handleSend =
    async (
      event
    ) => {
      event.preventDefault();

      const text =
        messageText.trim();

      if (
        !text ||
        !selectedConversationId ||
        sending
      ) {
        return;
      }

      if (
        activeConversation?.status ===
        "closed"
      ) {
        setThreadError(
          "Reopen the conversation before sending a reply."
        );

        return;
      }

      setSending(
        true
      );

      setThreadError("");

      try {
        const response =
          await sendPortalMessage(
            selectedConversationId,
            {
              text
            }
          );

        const data =
          response?.data?.data ||
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
            ) =>
              current.map(
                (
                  conversation
                ) =>
                  String(
                    conversation.id
                  ) ===
                  String(
                    selectedConversationId
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
        }

        setMessageText("");

        setSuccess(
          response?.data?.message ||
          "Reply sent successfully."
        );

        window.setTimeout(
          () => {
            messageEndRef.current?.scrollIntoView({
              behavior:
                "smooth"
            });
          },
          50
        );

        await loadInbox({
          silent:
            true
        });
      } catch (
        requestError
      ) {
        setThreadError(
          getErrorMessage(
            requestError,
            "Reply could not be sent."
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
  | Resolve, Close or Reopen
  |--------------------------------------------------------------------------
  */

  const handleStatusAction =
    async (
      nextStatus
    ) => {
      if (
        !selectedConversationId ||
        actionLoading
      ) {
        return;
      }

      setActionLoading(
        true
      );

      setThreadError("");

      try {
        const response =
          await updatePortalConversationStatus(
            selectedConversationId,
            nextStatus
          );

        const updatedConversation =
          response?.data?.data?.conversation ||
          null;

        if (
          updatedConversation
        ) {
          setActiveConversation(
            updatedConversation
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
                    selectedConversationId
                  )
                    ? {
                        ...conversation,
                        ...updatedConversation
                      }
                    : conversation
              )
          );
        }

        setSuccess(
          response?.data?.message ||
          `Conversation marked ${nextStatus}.`
        );

        await loadInbox({
          silent:
            true
        });
      } catch (
        requestError
      ) {
        setThreadError(
          getErrorMessage(
            requestError,
            "Conversation status could not be updated."
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
  | Archive or Restore
  |--------------------------------------------------------------------------
  */

  const handleArchive =
    async () => {
      if (
        !selectedConversationId ||
        actionLoading
      ) {
        return;
      }

      setActionLoading(
        true
      );

      setThreadError("");

      try {
        const nextArchivedState =
          !archived;

        const response =
          await setPortalConversationArchived(
            selectedConversationId,
            nextArchivedState
          );

        setSuccess(
          response?.data?.message ||
          (
            nextArchivedState
              ? "Conversation archived."
              : "Conversation restored."
          )
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
            requestError,
            "Archive state could not be updated."
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
  | Derived Thread Values
  |--------------------------------------------------------------------------
  */

  const activeCategory =
    categoryDetails(
      activeConversation?.category
    );

  const activeStatus =
    statusDetails(
      activeConversation?.status
    );

  const activePriority =
    priorityDetails(
      activeConversation?.priority
    );

  const ActiveCategoryIcon =
    activeCategory.icon;

  const activeFamily =
    getFamilyParticipant(
      activeConversation
    );

  const selectedInboxConversation =
    useMemo(
      () =>
        conversations.find(
          (
            conversation
          ) =>
            String(
              conversation.id
            ) ===
            String(
              selectedConversationId
            )
        ) ||
        null,
      [
        conversations,
        selectedConversationId
      ]
    );

  const conversationForHeader =
    activeConversation ||
    selectedInboxConversation;

  const headerFamily =
    getFamilyParticipant(
      conversationForHeader
    );

  if (
    !isPrincipal
  ) {
    return (
      <AccessDenied />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portal Messages"
        action={
          <button
            type="button"
            className="btn-secondary"
            disabled={
              inboxRefreshing
            }
            onClick={
              () =>
                loadInbox({
                  silent:
                    true
                })
            }
          >
            <RefreshCw
              size={16}
              className={
                inboxRefreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh Inbox
          </button>
        }
      />

      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <BadgeCheck
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>
            {success}
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Conversations"
          value={
            summary.totalConversations
          }
          helper="All active family conversations"
          icon={MessageCircle}
          tone="brand"
        />

        <SummaryCard
          title="Open Cases"
          value={
            summary.openConversations
          }
          helper="Open or waiting for action"
          icon={Inbox}
          tone="emerald"
        />

        <SummaryCard
          title="Unread Messages"
          value={
            summary.unreadMessages
          }
          helper="Messages awaiting your review"
          icon={Mail}
          tone="amber"
        />

        <SummaryCard
          title="Urgent Priority"
          value={
            summary.urgentConversations
          }
          helper="Conversations marked urgent"
          icon={Flag}
          tone="rose"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="grid min-h-[720px] lg:grid-cols-[360px_minmax(0,1fr)]">
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
                    School Inbox
                  </p>

                  <h3 className="mt-1 text-lg font-black text-slate-900">
                    {archived
                      ? "Archived Conversations"
                      : "Family Conversations"}
                  </h3>
                </div>

                <button
                  type="button"
                  className="btn-ghost h-10 px-3"
                  disabled={
                    inboxRefreshing
                  }
                  onClick={
                    () =>
                      loadInbox({
                        silent:
                          true
                      })
                  }
                  aria-label="Refresh conversations"
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
                  type="search"
                  value={
                    search
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setSearch(
                        event.target.value
                      )
                  }
                  className="field-input h-10 pl-10"
                  placeholder="Search subject, child or message..."
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <select
                  value={
                    statusFilter
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setStatusFilter(
                        event.target.value
                      )
                  }
                  className="field-select h-10 text-xs"
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
                  onChange={
                    (
                      event
                    ) =>
                      setCategoryFilter(
                        event.target.value
                      )
                  }
                  className="field-select h-10 text-xs"
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
                  onChange={
                    (
                      event
                    ) =>
                      setPriorityFilter(
                        event.target.value
                      )
                  }
                  className="field-select h-10 text-xs"
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
                  className="btn-ghost h-10 justify-center text-xs"
                  onClick={
                    () => {
                      setArchived(
                        (
                          current
                        ) =>
                          !current
                      );

                      closeThread();
                    }
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
                  <CircleAlert
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
                <InboxLoading />
              ) : conversations.length >
                0 ? (
                conversations.map(
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
                      onSelect={
                        selectConversation
                      }
                    />
                  )
                )
              ) : (
                <div className="grid min-h-[360px] place-items-center p-7 text-center">
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
                      {archived
                        ? "No conversations have been archived by the principal."
                        : "New parent and student conversations will appear here."}
                    </p>
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
                  onClick={
                    () =>
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
                  onClick={
                    () =>
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
              <div className="grid min-h-[720px] place-items-center p-8 text-center">
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
                    Choose a parent or student conversation from the school inbox to review and reply.
                  </p>
                </div>
              </div>
            ) : threadLoading ? (
              <div className="grid min-h-[720px] place-items-center text-center">
                <div>
                  <LoaderCircle
                    size={28}
                    className="mx-auto animate-spin text-brand-600"
                  />

                  <p className="mt-4 text-sm font-black text-slate-800">
                    Loading conversation
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Retrieving secure messages...
                  </p>
                </div>
              </div>
            ) : (
              <>
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
                          {conversationForHeader
                            ?.subject ||
                            "Conversation"}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[9px] font-bold ring-1 ${activeStatus.classes}`}
                        >
                          {activeStatus.label}
                        </span>

                        {conversationForHeader
                          ?.priority !==
                          "normal" && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] font-bold ring-1 ${activePriority.classes}`}
                          >
                            {activePriority.label}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-xs font-semibold text-brand-700">
                        {headerFamily.name} ·{" "}
                        {headerFamily.roleLabel}
                      </p>

                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        {conversationForHeader
                          ?.student
                          ?.name
                          ? `Student: ${conversationForHeader.student.name}`
                          : "General school matter"}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-ghost h-10 px-3"
                      onClick={
                        handleArchive
                      }
                      disabled={
                        actionLoading
                      }
                      title={
                        archived
                          ? "Restore conversation"
                          : "Archive conversation"
                      }
                    >
                      {archived ? (
                        <ArchiveRestore
                          size={17}
                        />
                      ) : (
                        <Archive
                          size={17}
                        />
                      )}
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {activeConversation?.status ===
                    "closed" ? (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={
                          actionLoading
                        }
                        onClick={
                          () =>
                            handleStatusAction(
                              "open"
                            )
                        }
                      >
                        <RefreshCw
                          size={15}
                        />
                        Reopen Conversation
                      </button>
                    ) : (
                      <>
                        {activeConversation?.status !==
                          "resolved" && (
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={
                              actionLoading
                            }
                            onClick={
                              () =>
                                handleStatusAction(
                                  "resolved"
                                )
                            }
                          >
                            <BadgeCheck
                              size={15}
                            />
                            Mark Resolved
                          </button>
                        )}

                        {activeConversation?.status ===
                          "resolved" && (
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={
                              actionLoading
                            }
                            onClick={
                              () =>
                                handleStatusAction(
                                  "open"
                                )
                            }
                          >
                            <RefreshCw
                              size={15}
                            />
                            Reopen
                          </button>
                        )}

                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={
                            actionLoading
                          }
                          onClick={
                            () =>
                              handleStatusAction(
                                "closed"
                              )
                          }
                        >
                          <XCircle
                            size={15}
                          />
                          Close
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
                  <div className="grid gap-3 text-xs sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <UserRound
                        size={15}
                        className="text-slate-400"
                      />

                      <div className="min-w-0">
                        <p className="text-slate-400">
                          Family Account
                        </p>

                        <p className="truncate font-semibold text-slate-700">
                          {activeFamily.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <UsersRound
                        size={15}
                        className="text-slate-400"
                      />

                      <div className="min-w-0">
                        <p className="text-slate-400">
                          Student
                        </p>

                        <p className="truncate font-semibold text-slate-700">
                          {activeConversation
                            ?.student
                            ?.name ||
                            "General matter"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Flag
                        size={15}
                        className="text-slate-400"
                      />

                      <div className="min-w-0">
                        <p className="text-slate-400">
                          Category
                        </p>

                        <p className="truncate font-semibold text-slate-700">
                          {activeCategory.label}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {threadError && (
                  <div className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-5">
                    <div className="flex items-start gap-2">
                      <CircleAlert
                        size={17}
                        className="mt-0.5 shrink-0"
                      />

                      <span>
                        {threadError}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="shrink-0 font-bold"
                      onClick={
                        () =>
                          setThreadError("")
                      }
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 px-4 py-5 sm:px-6">
                  {messagePagination.hasMore && (
                    <div className="mb-5 flex justify-center">
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
                          <Clock3
                            size={15}
                          />
                        )}

                        Load Older Messages
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
                    <div className="grid min-h-[360px] place-items-center text-center">
                      <div className="max-w-sm">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-300 shadow-sm">
                          <MessageCircle
                            size={28}
                          />
                        </div>

                        <h4 className="mt-4 text-base font-black text-slate-800">
                          No messages available
                        </h4>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          This conversation may have been created before the first message was stored. Send a reply below to continue the conversation.
                        </p>

                        <div
                          ref={
                            messageEndRef
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={
                    handleSend
                  }
                  className="border-t border-slate-200 bg-white p-4 sm:p-5"
                >
                  {activeConversation?.status ===
                  "closed" ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <LockKeyhole
                          size={17}
                        />

                        Conversation is closed
                      </div>

                      <button
                        type="button"
                        className="btn-primary"
                        disabled={
                          actionLoading
                        }
                        onClick={
                          () =>
                            handleStatusAction(
                              "open"
                            )
                        }
                      >
                        Reopen
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-end gap-3">
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor="principal-message-reply"
                          className="sr-only"
                        >
                          Reply message
                        </label>

                        <textarea
                          id="principal-message-reply"
                          value={
                            messageText
                          }
                          onChange={
                            (
                              event
                            ) =>
                              setMessageText(
                                event.target.value
                              )
                          }
                          onKeyDown={
                            (
                              event
                            ) => {
                              if (
                                event.key ===
                                  "Enter" &&
                                !event.shiftKey
                              ) {
                                event.preventDefault();

                                if (
                                  messageText.trim() &&
                                  !sending
                                ) {
                                  event.currentTarget
                                    .form
                                    ?.requestSubmit();
                                }
                              }
                            }
                          }
                          className="field-input min-h-[48px] max-h-36 resize-y py-3"
                          placeholder="Write a reply to the parent or student..."
                          maxLength={5000}
                          disabled={
                            sending
                          }
                        />

                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                          <span>
                            Enter to send · Shift + Enter for new line
                          </span>

                          <span>
                            {messageText.length}/5000
                          </span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn-primary h-12 shrink-0 px-4"
                        disabled={
                          sending ||
                          !messageText.trim()
                        }
                      >
                        {sending ? (
                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Send
                            size={17}
                          />
                        )}

                        <span className="hidden sm:inline">
                          Send Reply
                        </span>
                      </button>
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrincipalMessages;
