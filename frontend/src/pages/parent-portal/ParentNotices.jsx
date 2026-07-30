import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BellRing,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  FileText,
  GraduationCap,
  Info,
  Megaphone,
  MessageCircle,
  Pin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const CATEGORY_OPTIONS = [
  {
    value: "all",
    label: "All Categories"
  },
  {
    value: "general",
    label: "General"
  },
  {
    value: "academic",
    label: "Academic"
  },
  {
    value: "attendance",
    label: "Attendance"
  },
  {
    value: "fees",
    label: "Fees"
  },
  {
    value: "event",
    label: "Events"
  },
  {
    value: "holiday",
    label: "Holiday"
  },
  {
    value: "exam",
    label: "Examination"
  },
  {
    value: "emergency",
    label: "Emergency"
  },
  {
    value: "other",
    label: "Other"
  }
];

const PRIORITY_OPTIONS = [
  {
    value: "all",
    label: "All Priorities"
  },
  {
    value: "urgent",
    label: "Urgent"
  },
  {
    value: "high",
    label: "High"
  },
  {
    value: "normal",
    label: "Normal"
  },
  {
    value: "low",
    label: "Low"
  }
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getInitials = (value) =>
  String(value || "School")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const titleCase = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatDate = (value, includeTime = false) => {
  if (!value) {
    return "Date not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not provided";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit"
        }
      : {})
  }).format(date);
};

const getNoticeId = (notice, index) =>
  String(
    notice?.id ||
      notice?._id ||
      notice?.noticeId ||
      `notice-${index}`
  );

const getNoticeBody = (notice) =>
  notice?.message ||
  notice?.body ||
  notice?.content ||
  notice?.description ||
  notice?.details ||
  "";

const getNoticeCategory = (notice) =>
  String(
    notice?.category ||
      notice?.noticeType ||
      notice?.type ||
      "general"
  ).toLowerCase();

const getNoticePriority = (notice) =>
  String(notice?.priority || "normal").toLowerCase();

const getNoticeDate = (notice) =>
  notice?.publishedAt ||
  notice?.publishDate ||
  notice?.date ||
  notice?.createdAt ||
  null;

const getNoticeExpiry = (notice) =>
  notice?.expiresAt ||
  notice?.expiryDate ||
  notice?.validUntil ||
  null;

const normalizeNotice = (notice, index) => ({
  ...notice,

  normalizedId: getNoticeId(notice, index),

  normalizedTitle:
    notice?.title ||
    notice?.subject ||
    notice?.heading ||
    "School Notice",

  normalizedBody: getNoticeBody(notice),

  normalizedCategory: getNoticeCategory(notice),

  normalizedPriority: getNoticePriority(notice),

  normalizedDate: getNoticeDate(notice),

  normalizedExpiry: getNoticeExpiry(notice),

  normalizedPinned: Boolean(
    notice?.isPinned ||
      notice?.pinned ||
      notice?.featured
  ),

  normalizedAudience:
    notice?.audience ||
    notice?.targetAudience ||
    notice?.scope ||
    "all",

  normalizedStudentId: String(
    notice?.studentId ||
      notice?.targetStudentId ||
      notice?.student?.id ||
      notice?.student?._id ||
      ""
  ),

  normalizedClassId: String(
    notice?.classId ||
      notice?.targetClassId ||
      notice?.class?.id ||
      notice?.class?._id ||
      ""
  ),

  normalizedSection:
    notice?.sectionName ||
    notice?.section ||
    notice?.targetSection ||
    ""
});

const isExpired = (notice) => {
  if (!notice.normalizedExpiry) {
    return false;
  }

  const expiry = new Date(notice.normalizedExpiry);

  return (
    !Number.isNaN(expiry.getTime()) &&
    expiry.getTime() < Date.now()
  );
};

const noticeAppliesToChild = (notice, student) => {
  if (!student) {
    return true;
  }

  const audience = String(
    notice.normalizedAudience || "all"
  ).toLowerCase();

  if (
    [
      "all",
      "school",
      "parents",
      "parent",
      "students",
      "student"
    ].includes(audience)
  ) {
    return true;
  }

  if (
    notice.normalizedStudentId &&
    notice.normalizedStudentId ===
      String(student.id || student._id || "")
  ) {
    return true;
  }

  if (
    notice.normalizedClassId &&
    notice.normalizedClassId ===
      String(
        student?.class?.id ||
          student?.class?._id ||
          ""
      )
  ) {
    if (
      !notice.normalizedSection ||
      notice.normalizedSection === student.sectionName
    ) {
      return true;
    }
  }

  return (
    !notice.normalizedStudentId &&
    !notice.normalizedClassId
  );
};

const getCategoryTheme = (category) => {
  const themes = {
    academic: {
      icon: BookOpen,
      badge:
        "bg-brand-50 text-brand-700 ring-brand-200",
      iconBox:
        "bg-brand-50 text-brand-700"
    },

    attendance: {
      icon: CheckCheck,
      badge:
        "bg-emerald-50 text-emerald-700 ring-emerald-200",
      iconBox:
        "bg-emerald-50 text-emerald-700"
    },

    fees: {
      icon: FileText,
      badge:
        "bg-amber-50 text-amber-700 ring-amber-200",
      iconBox:
        "bg-amber-50 text-amber-700"
    },

    event: {
      icon: CalendarDays,
      badge:
        "bg-cyan-50 text-cyan-700 ring-cyan-200",
      iconBox:
        "bg-cyan-50 text-cyan-700"
    },

    holiday: {
      icon: Sparkles,
      badge:
        "bg-violet-50 text-violet-700 ring-violet-200",
      iconBox:
        "bg-violet-50 text-violet-700"
    },

    exam: {
      icon: GraduationCap,
      badge:
        "bg-indigo-50 text-indigo-700 ring-indigo-200",
      iconBox:
        "bg-indigo-50 text-indigo-700"
    },

    emergency: {
      icon: CircleAlert,
      badge:
        "bg-rose-50 text-rose-700 ring-rose-200",
      iconBox:
        "bg-rose-50 text-rose-700"
    },

    other: {
      icon: Info,
      badge:
        "bg-slate-100 text-slate-700 ring-slate-200",
      iconBox:
        "bg-slate-100 text-slate-700"
    }
  };

  return (
    themes[category] || {
      icon: Megaphone,
      badge:
        "bg-slate-100 text-slate-700 ring-slate-200",
      iconBox:
        "bg-slate-100 text-slate-700"
    }
  );
};

const getPriorityTheme = (priority) => {
  if (priority === "urgent") {
    return {
      label: "Urgent",
      badge:
        "bg-rose-600 text-white ring-rose-600",
      border:
        "border-rose-300"
    };
  }

  if (priority === "high") {
    return {
      label: "High Priority",
      badge:
        "bg-orange-50 text-orange-700 ring-orange-200",
      border:
        "border-orange-200"
    };
  }

  if (priority === "low") {
    return {
      label: "Low Priority",
      badge:
        "bg-slate-100 text-slate-600 ring-slate-200",
      border:
        "border-slate-200"
    };
  }

  return {
    label: "Normal",
    badge:
      "bg-cyan-50 text-cyan-700 ring-cyan-200",
    border:
      "border-slate-200"
  };
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
  tone = "brand"
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
            tones[tone] ||
            tones.brand
          }`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Notice Card
|--------------------------------------------------------------------------
*/

const NoticeCard = ({
  notice,
  read,
  onOpen,
  onToggleRead
}) => {
  const categoryTheme =
    getCategoryTheme(
      notice.normalizedCategory
    );

  const priorityTheme =
    getPriorityTheme(
      notice.normalizedPriority
    );

  const CategoryIcon =
    categoryTheme.icon;

  const expired =
    isExpired(notice);

  return (
    <article
      className={`group relative overflow-hidden rounded-[28px] border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        read
          ? "border-slate-200"
          : "border-brand-300 ring-4 ring-brand-50"
      } ${priorityTheme.border}`}
    >
      {notice.normalizedPinned && (
        <div className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <Pin size={16} />
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4 pr-10">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${categoryTheme.iconBox}`}
          >
            <CategoryIcon size={21} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${categoryTheme.badge}`}
              >
                {titleCase(
                  notice.normalizedCategory
                )}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${priorityTheme.badge}`}
              >
                {priorityTheme.label}
              </span>

              {!read && (
                <span className="rounded-full bg-brand-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  New
                </span>
              )}

              {expired && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                  Expired
                </span>
              )}
            </div>

            <h3 className="mt-4 text-lg font-black leading-7 text-slate-900">
              {notice.normalizedTitle}
            </h3>

            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
              {notice.normalizedBody ||
                "No additional details were included in this notice."}
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} />

                {formatDate(
                  notice.normalizedDate
                )}
              </span>

              <span className="inline-flex items-center gap-1.5">
                <UsersRound size={13} />

                {titleCase(
                  notice.normalizedAudience
                )}
              </span>

              {notice.normalizedExpiry && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={13} />

                  Valid until{" "}
                  {formatDate(
                    notice.normalizedExpiry
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="btn-ghost self-start"
            onClick={() =>
              onToggleRead(
                notice.normalizedId
              )
            }
          >
            {read ? (
              <BellRing size={15} />
            ) : (
              <Check size={15} />
            )}

            {read
              ? "Mark Unread"
              : "Mark Read"}
          </button>

          <button
            type="button"
            className="btn-secondary self-start"
            onClick={() =>
              onOpen(notice)
            }
          >
            <Eye size={15} />

            Read Notice

            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Notice Details Modal
|--------------------------------------------------------------------------
*/

const NoticeModal = ({
  notice,
  read,
  onClose,
  onToggleRead
}) => {
  if (!notice) {
    return null;
  }

  const categoryTheme =
    getCategoryTheme(
      notice.normalizedCategory
    );

  const priorityTheme =
    getPriorityTheme(
      notice.normalizedPriority
    );

  const CategoryIcon =
    categoryTheme.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px]">
        <div className="relative overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />

          <button
            type="button"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            onClick={onClose}
            aria-label="Close notice"
          >
            <X size={19} />
          </button>

          <div className="relative flex items-start gap-4 pr-12">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <CategoryIcon size={22} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/15">
                  {titleCase(
                    notice.normalizedCategory
                  )}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${priorityTheme.badge}`}
                >
                  {priorityTheme.label}
                </span>

                {notice.normalizedPinned && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200 ring-1 ring-amber-300/20">
                    <Pin size={11} />
                    Pinned
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-2xl font-black leading-8">
                {notice.normalizedTitle}
              </h2>

              <p className="mt-2 text-xs text-slate-400">
                Published{" "}
                {formatDate(
                  notice.normalizedDate,
                  true
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {notice.normalizedBody ||
              "No additional information was included in this notice."}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Audience
              </p>

              <p className="mt-2 text-sm font-black text-slate-800">
                {titleCase(
                  notice.normalizedAudience
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Published
              </p>

              <p className="mt-2 text-sm font-black text-slate-800">
                {formatDate(
                  notice.normalizedDate
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Valid Until
              </p>

              <p className="mt-2 text-sm font-black text-slate-800">
                {notice.normalizedExpiry
                  ? formatDate(
                      notice.normalizedExpiry
                    )
                  : "No expiry"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                onToggleRead(
                  notice.normalizedId
                )
              }
            >
              {read ? (
                <BellRing size={16} />
              ) : (
                <Check size={16} />
              )}

              {read
                ? "Mark Unread"
                : "Mark as Read"}
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
            >
              Close Notice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Parent Notices Page
|--------------------------------------------------------------------------
*/

const ParentNotices = () => {
  const navigate =
    useNavigate();

  const {
    overview,
    children,
    selectedChild,
    selectedChildId,
    refreshing,
    refreshOverview
  } = useOutletContext();

  const [
    search,
    setSearch
  ] = useState("");

  const [
    category,
    setCategory
  ] = useState("all");

  const [
    priority,
    setPriority
  ] = useState("all");

  const [
    readFilter,
    setReadFilter
  ] = useState("all");

  const [
    selectedNotice,
    setSelectedNotice
  ] = useState(null);

  const [
    readNoticeIds,
    setReadNoticeIds
  ] = useState([]);

  const student =
    selectedChild?.student ||
    null;

  const noticesAllowed =
    selectedChild?.link
      ?.permissions
      ?.notices !== false;

  const parentId =
    overview?.parent?.id ||
    overview?.parent?._id ||
    "parent";

  const storageKey =
    `parentPortal:readNotices:${parentId}:${selectedChildId || "all"}`;

  /*
  |--------------------------------------------------------------------------
  | Load Local Read State
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(
          storageKey
        );

      const parsed =
        saved
          ? JSON.parse(saved)
          : [];

      setReadNoticeIds(
        Array.isArray(parsed)
          ? parsed.map(String)
          : []
      );
    } catch {
      setReadNoticeIds([]);
    }
  }, [storageKey]);

  const saveReadIds = (ids) => {
    const uniqueIds =
      Array.from(
        new Set(
          ids.map(String)
        )
      );

    setReadNoticeIds(
      uniqueIds
    );

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(
        uniqueIds
      )
    );
  };

  const toggleRead = (noticeId) => {
    const normalizedId =
      String(noticeId);

    if (
      readNoticeIds.includes(
        normalizedId
      )
    ) {
      saveReadIds(
        readNoticeIds.filter(
          (id) =>
            id !== normalizedId
        )
      );
    } else {
      saveReadIds([
        ...readNoticeIds,
        normalizedId
      ]);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Normalize Notice Sources
  |--------------------------------------------------------------------------
  */

  const allNotices =
    useMemo(() => {
      const possibleSources = [
        overview?.notices,
        overview?.announcements,
        overview?.schoolNotices,
        selectedChild?.notices,
        selectedChild?.announcements,
        selectedChild?.summary
          ?.notices
      ];

      const rawNotices =
        possibleSources.flatMap(
          (source) =>
            Array.isArray(source)
              ? source
              : []
        );

      const uniqueNotices =
        new Map();

      rawNotices.forEach(
        (notice, index) => {
          const normalized =
            normalizeNotice(
              notice,
              index
            );

          if (
            !uniqueNotices.has(
              normalized.normalizedId
            ) &&
            noticeAppliesToChild(
              normalized,
              student
            )
          ) {
            uniqueNotices.set(
              normalized.normalizedId,
              normalized
            );
          }
        }
      );

      return Array.from(
        uniqueNotices.values()
      ).sort(
        (first, second) => {
          if (
            first.normalizedPinned !==
            second.normalizedPinned
          ) {
            return first.normalizedPinned
              ? -1
              : 1;
          }

          const firstDate =
            new Date(
              first.normalizedDate || 0
            ).getTime();

          const secondDate =
            new Date(
              second.normalizedDate || 0
            ).getTime();

          return (
            secondDate -
            firstDate
          );
        }
      );
    }, [
      overview,
      selectedChild,
      student
    ]);

  const isNoticeRead = (notice) =>
    Boolean(
      notice?.isRead ||
        notice?.readAt ||
        notice?.read ||
        readNoticeIds.includes(
          notice.normalizedId
        )
    );

  const filteredNotices =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      return allNotices.filter(
        (notice) => {
          const read =
            isNoticeRead(notice);

          const searchText = [
            notice.normalizedTitle,
            notice.normalizedBody,
            notice.normalizedCategory,
            notice.normalizedPriority,
            notice.normalizedAudience
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !term ||
            searchText.includes(
              term
            );

          const matchesCategory =
            category === "all" ||
            notice.normalizedCategory ===
              category;

          const matchesPriority =
            priority === "all" ||
            notice.normalizedPriority ===
              priority;

          const matchesRead =
            readFilter === "all" ||
            (
              readFilter === "read" &&
              read
            ) ||
            (
              readFilter === "unread" &&
              !read
            );

          return (
            matchesSearch &&
            matchesCategory &&
            matchesPriority &&
            matchesRead
          );
        }
      );
    }, [
      allNotices,
      search,
      category,
      priority,
      readFilter,
      readNoticeIds
    ]);

  const summary =
    useMemo(() => {
      return allNotices.reduce(
        (result, notice) => {
          if (
            !isNoticeRead(notice)
          ) {
            result.unread += 1;
          }

          if (
            notice.normalizedPinned
          ) {
            result.pinned += 1;
          }

          if (
            [
              "urgent",
              "high"
            ].includes(
              notice.normalizedPriority
            )
          ) {
            result.important += 1;
          }

          return result;
        },
        {
          total:
            allNotices.length,

          unread:
            0,

          pinned:
            0,

          important:
            0
        }
      );
    }, [
      allNotices,
      readNoticeIds
    ]);

  const markAllRead = () => {
    saveReadIds(
      allNotices.map(
        (notice) =>
          notice.normalizedId
      )
    );
  };

  const openNotice = (notice) => {
    setSelectedNotice(notice);

    if (
      !isNoticeRead(notice)
    ) {
      saveReadIds([
        ...readNoticeIds,
        notice.normalizedId
      ]);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Empty / Restricted States
  |--------------------------------------------------------------------------
  */

  if (
    children.length === 0
  ) {
    return (
      <div className="card grid min-h-[480px] place-items-center p-8 text-center">
        <div className="max-w-lg">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-brand-50 text-brand-700">
            <UsersRound size={34} />
          </div>

          <h2 className="mt-6 text-xl font-black text-slate-900">
            No child is linked
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            School notices become available after a student is linked and
            verified with your parent account.
          </p>

          <button
            type="button"
            className="btn-secondary mt-6"
            onClick={() =>
              navigate(
                "/parent-portal/children"
              )
            }
          >
            View Child Links
          </button>
        </div>
      </div>
    );
  }

  if (!noticesAllowed) {
    return (
      <div className="card grid min-h-[480px] place-items-center p-8 text-center">
        <div className="max-w-lg">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-amber-50 text-amber-700">
            <ShieldCheck size={34} />
          </div>

          <h2 className="mt-6 text-xl font-black text-slate-900">
            Notice access is restricted
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            The school has not enabled notices for this parent–student link.
            Select another child or contact the school administration.
          </p>

          <button
            type="button"
            className="btn-primary mt-6"
            onClick={() =>
              navigate(
                `/parent-portal/messages?studentId=${encodeURIComponent(
                  selectedChildId
                )}&category=general`
              )
            }
          >
            <MessageCircle size={16} />

            Contact Principal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/*
      |--------------------------------------------------------------------------
      | Hero
      |--------------------------------------------------------------------------
      */}

      <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/10 text-lg font-black ring-1 ring-white/15">
              {student?.photo ? (
                <img
                  src={student.photo}
                  alt={
                    student.name ||
                    "Student"
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(
                  student?.name
                )
              )}
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-200">
                <Megaphone size={13} />

                Notices & Announcements
              </div>

              <h2 className="mt-3 truncate text-2xl font-black sm:text-3xl">
                {student?.name ||
                  "Family Notices"}
              </h2>

              <p className="mt-1 text-sm text-slate-300">
                {student
                  ? `${student?.class?.className || "Class"}${
                      student?.sectionName
                        ? ` · Section ${student.sectionName}`
                        : ""
                    }`
                  : "School-wide parent announcements"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Important school updates, events, holidays and academic notices
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[440px]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Unread Notices
              </p>

              <p className="mt-2 text-xl font-black text-white">
                {summary.unread}
              </p>

              <p className="mt-1 text-xs text-amber-300">
                Require your attention
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Important Updates
              </p>

              <p className="mt-2 text-xl font-black text-white">
                {summary.important}
              </p>

              <p className="mt-1 text-xs text-rose-300">
                High or urgent priority
              </p>
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
          title="Total Notices"
          value={summary.total}
          helper="All announcements visible for the selected child."
          icon={Bell}
          tone="brand"
        />

        <SummaryCard
          title="Unread"
          value={summary.unread}
          helper="Notices that have not yet been opened."
          icon={BellRing}
          tone="amber"
        />

        <SummaryCard
          title="Important"
          value={summary.important}
          helper="Urgent and high-priority school updates."
          icon={AlertCircle}
          tone="rose"
        />

        <SummaryCard
          title="Pinned"
          value={summary.pinned}
          helper="Announcements highlighted by the school."
          icon={Pin}
          tone="emerald"
        />
      </section>

      {/*
      |--------------------------------------------------------------------------
      | Filters
      |--------------------------------------------------------------------------
      */}

      <section className="card p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_0.75fr_0.75fr_0.7fr_auto]">
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              className="field-input h-11 pl-10"
              placeholder="Search notices and announcements…"
            />
          </div>

          <select
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value
              )
            }
            className="field-select h-11"
          >
            {CATEGORY_OPTIONS.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>

          <select
            value={priority}
            onChange={(event) =>
              setPriority(
                event.target.value
              )
            }
            className="field-select h-11"
          >
            {PRIORITY_OPTIONS.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>

          <select
            value={readFilter}
            onChange={(event) =>
              setReadFilter(
                event.target.value
              )
            }
            className="field-select h-11"
          >
            <option value="all">
              All Notices
            </option>

            <option value="unread">
              Unread Only
            </option>

            <option value="read">
              Read Only
            </option>
          </select>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary h-11 flex-1 xl:flex-none"
              disabled={
                summary.unread === 0
              }
              onClick={markAllRead}
            >
              <CheckCheck size={16} />

              Mark All Read
            </button>

            <button
              type="button"
              className="btn-primary h-11 flex-1 xl:flex-none"
              disabled={refreshing}
              onClick={refreshOverview}
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>
          </div>
        </div>
      </section>

      {/*
      |--------------------------------------------------------------------------
      | Notice List
      |--------------------------------------------------------------------------
      */}

      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
              School Updates
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              Published Notices
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Showing{" "}
              {filteredNotices.length}{" "}
              of{" "}
              {allNotices.length}{" "}
              notice
              {allNotices.length === 1
                ? ""
                : "s"}
              .
            </p>
          </div>

          {(search ||
            category !== "all" ||
            priority !== "all" ||
            readFilter !== "all") && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setPriority("all");
                setReadFilter("all");
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {filteredNotices.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredNotices.map(
              (notice) => (
                <NoticeCard
                  key={
                    notice.normalizedId
                  }
                  notice={notice}
                  read={
                    isNoticeRead(
                      notice
                    )
                  }
                  onOpen={openNotice}
                  onToggleRead={
                    toggleRead
                  }
                />
              )
            )}
          </div>
        ) : allNotices.length > 0 ? (
          <div className="card grid min-h-[340px] place-items-center p-8 text-center">
            <div className="max-w-md">
              <Search
                size={34}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-5 text-lg font-black text-slate-900">
                No matching notices found
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Change the search text, category, priority or read-status
                filter.
              </p>

              <button
                type="button"
                className="btn-secondary mt-5"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setPriority("all");
                  setReadFilter("all");
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="card grid min-h-[420px] place-items-center p-8 text-center">
            <div className="max-w-xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-brand-50 text-brand-700">
                <Megaphone size={34} />
              </div>

              <h3 className="mt-6 text-xl font-black text-slate-900">
                No notices have been published
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                School announcements, holidays, events and urgent updates will
                appear here after they are published by the administration.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={
                    refreshOverview
                  }
                >
                  <RefreshCw
                    size={16}
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />

                  Check Again
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    navigate(
                      `/parent-portal/messages?studentId=${encodeURIComponent(
                        selectedChildId
                      )}&category=general`
                    )
                  }
                >
                  <MessageCircle size={16} />

                  Contact Principal
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/*
      |--------------------------------------------------------------------------
      | Information Cards
      |--------------------------------------------------------------------------
      */}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck size={22} />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Official School Announcements
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Notices shown in this section are intended for your family,
                selected child, class or the complete school community.
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <MessageCircle size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-slate-900">
                Need Clarification?
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Contact the principal about an announcement, event, holiday,
                examination or urgent school instruction.
              </p>

              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 transition hover:text-brand-800"
                onClick={() =>
                  navigate(
                    `/parent-portal/messages?studentId=${encodeURIComponent(
                      selectedChildId
                    )}&category=general`
                  )
                }
              >
                Message Principal

                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <NoticeModal
        notice={selectedNotice}
        read={
          selectedNotice
            ? isNoticeRead(
                selectedNotice
              )
            : false
        }
        onClose={() =>
          setSelectedNotice(null)
        }
        onToggleRead={toggleRead}
      />
    </div>
  );
};

export default ParentNotices;