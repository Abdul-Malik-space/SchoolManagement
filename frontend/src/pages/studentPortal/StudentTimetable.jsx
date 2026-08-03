import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  useNavigate,
  useOutletContext
} from "react-router-dom";

import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  Grid3X3,
  Info,
  Laptop2,
  List,
  MapPin,
  MessageCircle,
  MonitorPlay,
  Printer,
  RefreshCw,
  RotateCcw,
  School,
  Sparkles,
  Timer,
  UserRound,
  UsersRound,
  Video,
  Wifi,
  XCircle
} from "lucide-react";

import {
  getStudentPortalTimetable
} from "../../api/studentPortal";

/*
|--------------------------------------------------------------------------
| Timetable Constants
|--------------------------------------------------------------------------
*/

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

const DAY_LABELS = {
  monday:
    "Monday",

  tuesday:
    "Tuesday",

  wednesday:
    "Wednesday",

  thursday:
    "Thursday",

  friday:
    "Friday",

  saturday:
    "Saturday",

  sunday:
    "Sunday"
};

const DAY_SHORT_LABELS = {
  monday:
    "Mon",

  tuesday:
    "Tue",

  wednesday:
    "Wed",

  thursday:
    "Thu",

  friday:
    "Fri",

  saturday:
    "Sat",

  sunday:
    "Sun"
};

const ENTRY_TYPE_LABELS = {
  class:
    "Class",

  lesson:
    "Lesson",

  break:
    "Break",

  assembly:
    "Assembly",

  activity:
    "Activity",

  lab:
    "Lab",

  examination:
    "Examination",

  other:
    "Other"
};

const DELIVERY_MODE_LABELS = {
  physical:
    "On Campus",

  online:
    "Online",

  hybrid:
    "Hybrid"
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
    "Unable to load the student timetable."
  );
};

const getTodayDayName =
  () => {
    return [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday"
    ][
      new Date().getDay()
    ];
  };

const formatDate = (
  value
) => {
  if (!value) {
    return "Not assigned";
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
    return "Not assigned";
  }

  return date.toLocaleDateString(
    "en-PK",
    {
      day:
        "numeric",

      month:
        "short",

      year:
        "numeric"
    }
  );
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

const formatTime = (
  value
) => {
  const match =
    String(
      value || ""
    ).match(
      /^([01]\d|2[0-3]):([0-5]\d)$/
    );

  if (!match) {
    return value ||
      "Time pending";
  }

  const hour =
    Number(
      match[1]
    );

  const minute =
    match[2];

  const period =
    hour >=
    12
      ? "PM"
      : "AM";

  const displayHour =
    hour % 12 ||
    12;

  return `${displayHour}:${minute} ${period}`;
};

const timeToMinutes = (
  value
) => {
  const match =
    String(
      value || ""
    ).match(
      /^([01]\d|2[0-3]):([0-5]\d)$/
    );

  if (!match) {
    return null;
  }

  return (
    Number(
      match[1]
    ) *
      60 +
    Number(
      match[2]
    )
  );
};

const minutesToDuration = (
  value
) => {
  const minutes =
    Number(
      value || 0
    );

  if (
    minutes <=
    0
  ) {
    return "Duration pending";
  }

  if (
    minutes <
    60
  ) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes /
      60
    );

  const remainder =
    minutes %
    60;

  return remainder >
    0
    ? `${hours}h ${remainder}m`
    : `${hours}h`;
};

const getEntryDuration = (
  entry
) => {
  const explicitDuration =
    Number(
      entry?.period
        ?.durationMinutes ||
      0
    );

  if (
    explicitDuration >
    0
  ) {
    return explicitDuration;
  }

  const start =
    timeToMinutes(
      entry?.period
        ?.startTime
    );

  const end =
    timeToMinutes(
      entry?.period
        ?.endTime
    );

  if (
    start ===
      null ||
    end ===
      null ||
    end <=
      start
  ) {
    return 0;
  }

  return end -
    start;
};

const formatEntryType = (
  value
) => {
  const normalized =
    String(
      value || "class"
    )
      .trim()
      .toLowerCase();

  return (
    ENTRY_TYPE_LABELS[
      normalized
    ] ||
    normalized
      .split(
        "_"
      )
      .map(
        (
          part
        ) =>
          part
            .charAt(
              0
            )
            .toUpperCase() +
          part.slice(
            1
          )
      )
      .join(
        " "
      )
  );
};

const formatDeliveryMode = (
  value
) => {
  const normalized =
    String(
      value || "physical"
    )
      .trim()
      .toLowerCase();

  return (
    DELIVERY_MODE_LABELS[
      normalized
    ] ||
    formatEntryType(
      normalized
    )
  );
};

const isValidWebUrl = (
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

const normalizeDisplayColor = (
  value
) => {
  const color =
    String(
      value || ""
    ).trim();

  if (
    /^#[0-9a-f]{6}$/i.test(
      color
    ) ||
    /^#[0-9a-f]{3}$/i.test(
      color
    )
  ) {
    return color;
  }

  return "#0f766e";
};

const getRoomLabel = (
  entry
) => {
  const roomName =
    entry?.room
      ?.name ||
    "";

  const roomCode =
    entry?.room
      ?.code ||
    "";

  if (
    roomName &&
    roomCode
  ) {
    return `${roomName} (${roomCode})`;
  }

  return (
    roomName ||
    roomCode ||
    (
      entry?.deliveryMode ===
      "online"
        ? "Online classroom"
        : "Room not assigned"
    )
  );
};

const getRoomDetail = (
  entry
) => {
  return [
    entry?.room
      ?.building,

    entry?.room
      ?.floor
  ]
    .filter(
      Boolean
    )
    .join(
      " · "
    );
};

const getEntryTitle = (
  entry
) => {
  return (
    entry?.subject
      ?.name ||
    entry?.period
      ?.name ||
    formatEntryType(
      entry?.entryType
    )
  );
};

const getEntryCode = (
  entry
) => {
  return (
    entry?.subject
      ?.code ||
    entry?.period
      ?.code ||
    ""
  );
};

const getCurrentMinute =
  () => {
    const now =
      new Date();

    return (
      now.getHours() *
        60 +
      now.getMinutes()
    );
  };

const getEntryLiveState = (
  entry,
  day,
  clockMinute
) => {
  if (
    day !==
    getTodayDayName()
  ) {
    return "scheduled";
  }

  const start =
    timeToMinutes(
      entry?.period
        ?.startTime
    );

  const end =
    timeToMinutes(
      entry?.period
        ?.endTime
    );

  if (
    start ===
      null ||
    end ===
      null
  ) {
    return "scheduled";
  }

  if (
    clockMinute >=
      start &&
    clockMinute <
      end
  ) {
    return "live";
  }

  if (
    clockMinute <
    start
  ) {
    return "upcoming";
  }

  return "completed";
};

const getLiveStateLabel = (
  value
) => {
  if (
    value ===
    "live"
  ) {
    return "In Progress";
  }

  if (
    value ===
    "upcoming"
  ) {
    return "Upcoming";
  }

  if (
    value ===
    "completed"
  ) {
    return "Completed";
  }

  return "Scheduled";
};

const getLiveStateStyle = (
  value
) => {
  if (
    value ===
    "live"
  ) {
    return {
      badge:
        "bg-rose-100 text-rose-700 ring-rose-200",

      dot:
        "bg-rose-500 animate-pulse",

      card:
        "border-rose-200 bg-rose-50/60"
    };
  }

  if (
    value ===
    "upcoming"
  ) {
    return {
      badge:
        "bg-brand-100 text-brand-700 ring-brand-200",

      dot:
        "bg-brand-500",

      card:
        "border-brand-200 bg-brand-50/40"
    };
  }

  if (
    value ===
    "completed"
  ) {
    return {
      badge:
        "bg-slate-100 text-slate-600 ring-slate-200",

      dot:
        "bg-slate-400",

      card:
        "border-slate-200 bg-slate-50/60"
    };
  }

  return {
    badge:
      "bg-sky-100 text-sky-700 ring-sky-200",

    dot:
      "bg-sky-500",

    card:
      "border-slate-200 bg-white"
  };
};

const getDeliveryIcon = (
  deliveryMode
) => {
  if (
    deliveryMode ===
    "online"
  ) {
    return Video;
  }

  if (
    deliveryMode ===
    "hybrid"
  ) {
    return MonitorPlay;
  }

  return Building2;
};

const getMondayDate = (
  referenceDate =
    new Date()
) => {
  const date =
    new Date(
      referenceDate
    );

  date.setHours(
    0,
    0,
    0,
    0
  );

  const day =
    date.getDay();

  const difference =
    day ===
    0
      ? -6
      : 1 -
        day;

  date.setDate(
    date.getDate() +
      difference
  );

  return date;
};

const addDays = (
  date,
  days
) => {
  const next =
    new Date(
      date
    );

  next.setDate(
    next.getDate() +
      days
  );

  return next;
};

const getWeekDateForDay = (
  day
) => {
  const index =
    DAY_ORDER.indexOf(
      day
    );

  return addDays(
    getMondayDate(),
    Math.max(
      index,
      0
    )
  );
};

const formatDayDate = (
  day
) => {
  return getWeekDateForDay(
    day
  ).toLocaleDateString(
    "en-PK",
    {
      day:
        "numeric",

      month:
        "short"
    }
  );
};

const formatIcsDateTime = (
  date,
  time
) => {
  const match =
    String(
      time || ""
    ).match(
      /^([01]\d|2[0-3]):([0-5]\d)$/
    );

  if (!match) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}${month}${day}T${match[1]}${match[2]}00`;
};

const formatIcsUntil = (
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

  const year =
    date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}${month}${day}T235959Z`;
};

const escapeIcsText = (
  value
) => {
  return String(
    value || ""
  )
    .replaceAll(
      "\\",
      "\\\\"
    )
    .replaceAll(
      ";",
      "\\;"
    )
    .replaceAll(
      ",",
      "\\,"
    )
    .replaceAll(
      "\n",
      "\\n"
    );
};

/*
|--------------------------------------------------------------------------
| Reusable Components
|--------------------------------------------------------------------------
*/

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction
}) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon
            size={19}
          />
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-900">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actionLabel &&
      onAction && (
        <button
          type="button"
          className="inline-flex items-center gap-2 self-start rounded-xl px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-50"
          onClick={
            onAction
          }
        >
          {actionLabel}

          <ArrowRight
            size={14}
          />
        </button>
      )}
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  helper,
  tone
}) => {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${tone.bar}`}
      />

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.icon}`}
      >
        <Icon
          size={20}
        />
      </div>

      <p className="mt-4 text-2xl font-black tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {helper}
      </p>
    </article>
  );
};

const EmptyTimetable = ({
  message,
  onRefresh,
  refreshing
}) => {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <CalendarClock
          size={25}
        />
      </div>

      <p className="mt-4 text-base font-bold text-slate-800">
        Timetable is not available
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {message ||
          "Your school has not published an active timetable for this class and section yet."}
      </p>

      <button
        type="button"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={
          onRefresh
        }
        disabled={
          refreshing
        }
      >
        <RefreshCw
          size={15}
          className={
            refreshing
              ? "animate-spin"
              : ""
          }
        />

        Check Again
      </button>
    </div>
  );
};

const TimetableLoadingState =
  () => {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 rounded-3xl bg-slate-200" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({
            length:
              4
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={
                  index
                }
                className="h-40 rounded-2xl bg-slate-200"
              />
            )
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="h-[620px] rounded-3xl bg-slate-200" />
          <div className="h-[620px] rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  };

/*
|--------------------------------------------------------------------------
| Timetable Entry Card
|--------------------------------------------------------------------------
*/

const TimetableEntryCard = ({
  entry,
  selectedDay,
  clockMinute,
  compact = false,
  onOpenOnlineClass
}) => {
  const liveState =
    getEntryLiveState(
      entry,
      selectedDay,
      clockMinute
    );

  const liveStyle =
    getLiveStateStyle(
      liveState
    );

  const DeliveryIcon =
    getDeliveryIcon(
      entry?.deliveryMode
    );

  const displayColor =
    normalizeDisplayColor(
      entry?.displayColor
    );

  const onlineAvailable =
    isValidWebUrl(
      entry?.onlineMeetingUrl
    );

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${liveStyle.card}`}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{
          backgroundColor:
            displayColor
        }}
      />

      <div className="flex flex-col gap-4 pl-1 sm:flex-row sm:items-start">
        <div className="flex min-w-[116px] items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{
              backgroundColor:
                displayColor
            }}
          >
            <Clock3
              size={18}
            />
          </div>

          <div>
            <p className="text-xs font-black text-slate-900">
              {formatTime(
                entry?.period
                  ?.startTime
              )}
            </p>

            <p className="mt-0.5 text-[10px] text-slate-400">
              {formatTime(
                entry?.period
                  ?.endTime
              )}
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-slate-900">
              {getEntryTitle(
                entry
              )}
            </p>

            {getEntryCode(
              entry
            ) && (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                {getEntryCode(
                  entry
                )}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ring-1 ${liveStyle.badge}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${liveStyle.dot}`}
              />

              {getLiveStateLabel(
                liveState
              )}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <UserRound
                size={12}
              />

              {entry?.teacher
                ?.name ||
                "Teacher not assigned"}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <MapPin
                size={12}
              />

              {getRoomLabel(
                entry
              )}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Timer
                size={12}
              />

              {minutesToDuration(
                getEntryDuration(
                  entry
                )
              )}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <DeliveryIcon
                size={12}
              />

              {formatDeliveryMode(
                entry?.deliveryMode
              )}
            </span>
          </div>

          {!compact &&
          getRoomDetail(
            entry
          ) && (
            <p className="mt-2 text-[10px] text-slate-400">
              Location detail:{" "}
              {getRoomDetail(
                entry
              )}
            </p>
          )}

          {!compact &&
          entry?.notes && (
            <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[11px] leading-5 text-slate-500 ring-1 ring-slate-200/70">
              {entry.notes}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <span className="rounded-xl bg-white px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 shadow-sm ring-1 ring-slate-200">
            {formatEntryType(
              entry?.entryType
            )}
          </span>

          {onlineAvailable && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-slate-800"
              onClick={() =>
                onOpenOnlineClass(
                  entry
                )
              }
            >
              <ExternalLink
                size={11}
              />

              Join
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Weekly Grid
|--------------------------------------------------------------------------
*/

const WeeklyGrid = ({
  byDay,
  clockMinute,
  onOpenOnlineClass
}) => {
  const maximumEntries =
    Math.max(
      1,
      ...DAY_ORDER.map(
        (
          day
        ) =>
          Array.isArray(
            byDay?.[
              day
            ]
          )
            ? byDay[
                day
              ].length
            : 0
      )
    );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[1180px]">
        <div className="grid grid-cols-7 gap-3">
          {DAY_ORDER.map(
            (
              day
            ) => {
              const entries =
                Array.isArray(
                  byDay?.[
                    day
                  ]
                )
                  ? byDay[
                      day
                    ]
                  : [];

              const isToday =
                day ===
                getTodayDayName();

              return (
                <div
                  key={
                    day
                  }
                  className={`rounded-2xl border p-3 ${
                    isToday
                      ? "border-brand-200 bg-brand-50/40"
                      : "border-slate-200 bg-slate-50/50"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p
                        className={`text-xs font-black ${
                          isToday
                            ? "text-brand-800"
                            : "text-slate-800"
                        }`}
                      >
                        {DAY_LABELS[
                          day
                        ]}
                      </p>

                      <p className="mt-0.5 text-[9px] text-slate-400">
                        {formatDayDate(
                          day
                        )}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                        isToday
                          ? "bg-brand-100 text-brand-700"
                          : "bg-white text-slate-500 ring-1 ring-slate-200"
                      }`}
                    >
                      {entries.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Array.from({
                      length:
                        maximumEntries
                    }).map(
                      (
                        _,
                        index
                      ) => {
                        const entry =
                          entries[
                            index
                          ];

                        if (!entry) {
                          return (
                            <div
                              key={`${day}-empty-${index}`}
                              className="min-h-[118px] rounded-xl border border-dashed border-slate-200 bg-white/40"
                            />
                          );
                        }

                        const displayColor =
                          normalizeDisplayColor(
                            entry.displayColor
                          );

                        const liveState =
                          getEntryLiveState(
                            entry,
                            day,
                            clockMinute
                          );

                        const liveStyle =
                          getLiveStateStyle(
                            liveState
                          );

                        return (
                          <article
                            key={
                              entry.id ||
                              `${day}-${index}`
                            }
                            className={`relative min-h-[118px] overflow-hidden rounded-xl border p-3 shadow-sm ${liveStyle.card}`}
                          >
                            <div
                              className="absolute inset-x-0 top-0 h-1"
                              style={{
                                backgroundColor:
                                  displayColor
                              }}
                            />

                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[10px] font-black text-slate-800">
                                {formatTime(
                                  entry
                                    ?.period
                                    ?.startTime
                                )}
                              </p>

                              {liveState ===
                                "live" && (
                                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                              )}
                            </div>

                            <p className="mt-2 line-clamp-2 text-xs font-black leading-4 text-slate-900">
                              {getEntryTitle(
                                entry
                              )}
                            </p>

                            <p className="mt-2 truncate text-[9px] text-slate-500">
                              {entry
                                ?.teacher
                                ?.name ||
                                "Teacher pending"}
                            </p>

                            <p className="mt-1 truncate text-[9px] text-slate-400">
                              {getRoomLabel(
                                entry
                              )}
                            </p>

                            {isValidWebUrl(
                              entry
                                ?.onlineMeetingUrl
                            ) && (
                              <button
                                type="button"
                                className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-brand-700"
                                onClick={() =>
                                  onOpenOnlineClass(
                                    entry
                                  )
                                }
                              >
                                <Video
                                  size={10}
                                />

                                Join online
                              </button>
                            )}
                          </article>
                        );
                      }
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Student Timetable Page
|--------------------------------------------------------------------------
*/

const StudentTimetable =
  () => {
    const navigate =
      useNavigate();

    const {
      student:
        overviewStudent,
      online,
      refreshPortal
    } = useOutletContext();

    const requestControllerRef =
      useRef(null);

    const [
      timetableData,
      setTimetableData
    ] = useState(null);

    const [
      loading,
      setLoading
    ] = useState(true);

    const [
      refreshing,
      setRefreshing
    ] = useState(false);

    const [
      error,
      setError
    ] = useState("");

    const [
      selectedDay,
      setSelectedDay
    ] = useState(
      getTodayDayName()
    );

    const [
      viewMode,
      setViewMode
    ] = useState(
      "schedule"
    );

    const [
      clockMinute,
      setClockMinute
    ] = useState(
      getCurrentMinute()
    );

    /*
    |--------------------------------------------------------------------------
    | Load Timetable
    |--------------------------------------------------------------------------
    */

    const loadTimetable =
      useCallback(
        async ({
          silent = false,
          rotationWeekCode =
            undefined
        } = {}) => {
          requestControllerRef
            .current
            ?.abort();

          const controller =
            new AbortController();

          requestControllerRef
            .current =
            controller;

          if (
            silent
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError(
            ""
          );

          try {
            const response =
              await getStudentPortalTimetable(
                {
                  rotationWeekCode
                },
                {
                  signal:
                    controller.signal
                }
              );

            const data =
              response?.data
                ?.data ||
              null;

            setTimetableData(
              data
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

            setError(
              getErrorMessage(
                requestError
              )
            );
          } finally {
            if (
              !controller.signal
                .aborted
            ) {
              setLoading(
                false
              );

              setRefreshing(
                false
              );
            }
          }
        },
        []
      );

    useEffect(() => {
      loadTimetable();

      return () => {
        requestControllerRef
          .current
          ?.abort();
      };
    }, [
      loadTimetable
    ]);

    /*
    |--------------------------------------------------------------------------
    | Live Clock
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      const intervalId =
        window.setInterval(
          () => {
            setClockMinute(
              getCurrentMinute()
            );
          },
          30000
        );

      return () => {
        window.clearInterval(
          intervalId
        );
      };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Derived Data
    |--------------------------------------------------------------------------
    */

    const student =
      timetableData
        ?.student ||
      overviewStudent ||
      null;

    const available =
      timetableData
        ?.available ===
      true;

    const timetableConfig =
      timetableData
        ?.timetableConfig ||
      null;

    const rotationWeekCode =
      timetableData
        ?.rotationWeekCode ||
      "STANDARD";

    const entries =
      Array.isArray(
        timetableData
          ?.entries
      )
        ? timetableData.entries
        : [];

    const byDay =
      timetableData
        ?.byDay &&
      typeof timetableData
        .byDay ===
        "object"
        ? timetableData.byDay
        : {};

    const selectedDayEntries =
      Array.isArray(
        byDay?.[
          selectedDay
        ]
      )
        ? byDay[
            selectedDay
          ]
        : [];

    const todayDay =
      getTodayDayName();

    const todayEntries =
      Array.isArray(
        byDay?.[
          todayDay
        ]
      )
        ? byDay[
            todayDay
          ]
        : [];

    const currentClass =
      todayEntries.find(
        (
          entry
        ) =>
          getEntryLiveState(
            entry,
            todayDay,
            clockMinute
          ) ===
          "live"
      ) ||
      null;

    const nextClass =
      currentClass ||
      todayEntries.find(
        (
          entry
        ) =>
          getEntryLiveState(
            entry,
            todayDay,
            clockMinute
          ) ===
          "upcoming"
      ) ||
      null;

    const totalWeeklyMinutes =
      entries.reduce(
        (
          total,
          entry
        ) =>
          total +
          getEntryDuration(
            entry
          ),
        0
      );

    const activeDays =
      DAY_ORDER.filter(
        (
          day
        ) =>
          Array.isArray(
            byDay?.[
              day
            ]
          ) &&
          byDay[
            day
          ].length >
            0
      ).length;

    const uniqueSubjects =
      useMemo(
        () => {
          const subjectMap =
            new Map();

          entries.forEach(
            (
              entry
            ) => {
              const key =
                String(
                  entry?.subject
                    ?.id ||
                  entry?.subject
                    ?.name ||
                  ""
                );

              if (
                key &&
                !subjectMap.has(
                  key
                )
              ) {
                subjectMap.set(
                  key,
                  entry.subject
                );
              }
            }
          );

          return Array.from(
            subjectMap.values()
          );
        },
        [
          entries
        ]
      );

    const uniqueTeachers =
      useMemo(
        () => {
          const teacherMap =
            new Map();

          entries.forEach(
            (
              entry
            ) => {
              const key =
                String(
                  entry?.teacher
                    ?.id ||
                  entry?.teacher
                    ?.name ||
                  ""
                );

              if (
                key &&
                !teacherMap.has(
                  key
                )
              ) {
                teacherMap.set(
                  key,
                  entry.teacher
                );
              }
            }
          );

          return Array.from(
            teacherMap.values()
          );
        },
        [
          entries
        ]
      );

    const currentClassProgress =
      useMemo(
        () => {
          if (
            !currentClass
          ) {
            return 0;
          }

          const start =
            timeToMinutes(
              currentClass
                ?.period
                ?.startTime
            );

          const end =
            timeToMinutes(
              currentClass
                ?.period
                ?.endTime
            );

          if (
            start ===
              null ||
            end ===
              null ||
            end <=
              start
          ) {
            return 0;
          }

          return Math.min(
            100,
            Math.max(
              0,
              Math.round(
                (
                  (
                    clockMinute -
                    start
                  ) /
                  (
                    end -
                    start
                  )
                ) *
                  100
              )
            )
          );
        },
        [
          currentClass,
          clockMinute
        ]
      );

    const summaryCards = [
      {
        key:
          "classes",

        icon:
          CalendarClock,

        label:
          "Weekly Classes",

        value:
          entries.length,

        helper:
          `${activeDays} active timetable day${
            activeDays ===
            1
              ? ""
              : "s"
          }`,

        tone: {
          icon:
            "bg-brand-50 text-brand-700",

          bar:
            "bg-gradient-to-r from-brand-500 to-cyan-500"
        }
      },

      {
        key:
          "subjects",

        icon:
          BookOpen,

        label:
          "Subjects",

        value:
          uniqueSubjects.length,

        helper:
          "Unique subjects in the published timetable",

        tone: {
          icon:
            "bg-violet-50 text-violet-700",

          bar:
            "bg-violet-500"
        }
      },

      {
        key:
          "teachers",

        icon:
          UsersRound,

        label:
          "Teachers",

        value:
          uniqueTeachers.length,

        helper:
          "Assigned teachers across weekly classes",

        tone: {
          icon:
            "bg-emerald-50 text-emerald-700",

          bar:
            "bg-emerald-500"
        }
      },

      {
        key:
          "learning-time",

        icon:
          Timer,

        label:
          "Weekly Learning Time",

        value:
          minutesToDuration(
            totalWeeklyMinutes
          ),

        helper:
          "Based on scheduled period duration",

        tone: {
          icon:
            "bg-amber-50 text-amber-700",

          bar:
            "bg-amber-500"
        }
      }
    ];

    /*
    |--------------------------------------------------------------------------
    | Actions
    |--------------------------------------------------------------------------
    */

    const handleRefresh =
      async () => {
        await Promise.all([
          loadTimetable({
            silent:
              true,
            rotationWeekCode
          }),

          refreshPortal?.()
        ]);
      };

    const handleOpenOnlineClass =
      (
        entry
      ) => {
        if (
          !isValidWebUrl(
            entry
              ?.onlineMeetingUrl
          )
        ) {
          return;
        }

        window.open(
          entry.onlineMeetingUrl,
          "_blank",
          "noopener,noreferrer"
        );
      };

    const handleContactSchool =
      (
        entry = null
      ) => {
        const entryText =
          entry
            ? `${DAY_LABELS[entry.day] || entry.day}, ${formatTime(
                entry?.period?.startTime
              )}, ${getEntryTitle(
                entry
              )}.`
            : `${DAY_LABELS[selectedDay]} timetable.`;

        navigate(
          "/student-portal/messages",
          {
            state: {
              compose: {
                subject:
                  "Timetable information request",

                category:
                  "general",

                priority:
                  "normal",

                text:
                  `I would like clarification about my class timetable: ${entryText}`
              }
            }
          }
        );
      };

    const handlePrint =
      () => {
        window.print();
      };

    const handleDownloadCalendar =
      () => {
        if (
          entries.length ===
          0
        ) {
          return;
        }

        const timezone =
          timetableConfig
            ?.timezone ||
          "Asia/Karachi";

        const until =
          formatIcsUntil(
            timetableConfig
              ?.effectiveEndDate
          );

        const events =
          entries
            .map(
              (
                entry,
                index
              ) => {
                const date =
                  getWeekDateForDay(
                    entry.day
                  );

                const start =
                  formatIcsDateTime(
                    date,
                    entry?.period
                      ?.startTime
                  );

                const end =
                  formatIcsDateTime(
                    date,
                    entry?.period
                      ?.endTime
                  );

                if (
                  !start ||
                  !end
                ) {
                  return "";
                }

                const location =
                  getRoomLabel(
                    entry
                  );

                const description = [
                  entry?.teacher
                    ?.name
                    ? `Teacher: ${entry.teacher.name}`
                    : "",

                  formatDeliveryMode(
                    entry?.deliveryMode
                  ),

                  entry?.notes ||
                    "",

                  isValidWebUrl(
                    entry?.onlineMeetingUrl
                  )
                    ? entry.onlineMeetingUrl
                    : ""
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    "\\n"
                  );

                const recurrence =
                  `RRULE:FREQ=WEEKLY${
                    until
                      ? `;UNTIL=${until}`
                      : ""
                  }`;

                return [
                  "BEGIN:VEVENT",
                  `UID:${escapeIcsText(
                    entry.id ||
                    `${entry.day}-${index}`
                  )}@student-portal`,
                  `DTSTAMP:${new Date()
                    .toISOString()
                    .replaceAll(
                      "-",
                      ""
                    )
                    .replaceAll(
                      ":",
                      ""
                    )
                    .replace(
                      /\.\d{3}Z$/,
                      "Z"
                    )}`,
                  `DTSTART;TZID=${timezone}:${start}`,
                  `DTEND;TZID=${timezone}:${end}`,
                  recurrence,
                  `SUMMARY:${escapeIcsText(
                    getEntryTitle(
                      entry
                    )
                  )}`,
                  `LOCATION:${escapeIcsText(
                    location
                  )}`,
                  `DESCRIPTION:${escapeIcsText(
                    description
                  )}`,
                  "END:VEVENT"
                ].join(
                  "\r\n"
                );
              }
            )
            .filter(
              Boolean
            )
            .join(
              "\r\n"
            );

        const calendarContent = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Student Portal//Class Timetable//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          `X-WR-CALNAME:${escapeIcsText(
            timetableConfig
              ?.title ||
            "Student Timetable"
          )}`,
          `X-WR-TIMEZONE:${timezone}`,
          events,
          "END:VCALENDAR"
        ].join(
          "\r\n"
        );

        const blob =
          new Blob(
            [
              calendarContent
            ],
            {
              type:
                "text/calendar;charset=utf-8"
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
          `student-timetable-${rotationWeekCode.toLowerCase()}.ics`;

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
    | Loading and Failure
    |--------------------------------------------------------------------------
    */

    if (
      loading &&
      !timetableData
    ) {
      return (
        <TimetableLoadingState />
      );
    }

    if (
      !timetableData &&
      error
    ) {
      return (
        <div className="grid min-h-[65vh] place-items-center">
          <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle
                size={24}
              />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Timetable could not be loaded
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {error}
            </p>

            <button
              type="button"
              className="btn-primary mt-5"
              onClick={() =>
                loadTimetable()
              }
            >
              <RefreshCw
                size={16}
              />

              Try Again
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <style>
          {`
            @media print {
              body * {
                visibility: hidden !important;
              }

              #student-timetable-report,
              #student-timetable-report * {
                visibility: visible !important;
              }

              #student-timetable-report {
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                background: white !important;
                padding: 20px !important;
              }

              .timetable-print-hidden {
                display: none !important;
              }

              .timetable-print-break {
                break-inside: avoid !important;
              }

              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}
        </style>

        <div
          id="student-timetable-report"
          className="space-y-6"
        >
          {/*
          |--------------------------------------------------------------------------
          | Error Banner
          |--------------------------------------------------------------------------
          */}

          {error && (
            <div className="timetable-print-hidden flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-rose-800">
                  Timetable could not refresh
                </p>

                <p className="mt-1 text-xs text-rose-600">
                  {error}
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-100"
                onClick={() =>
                  loadTimetable({
                    silent:
                      true,
                    rotationWeekCode
                  })
                }
              >
                <RefreshCw
                  size={14}
                />

                Try Again
              </button>
            </div>
          )}

          {/*
          |--------------------------------------------------------------------------
          | Timetable Hero
          |--------------------------------------------------------------------------
          */}

          <section className="timetable-print-break relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-7">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative grid gap-6 xl:grid-cols-[1fr_370px] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-white/10">
                    <CalendarClock
                      size={13}
                    />

                    Published Class Timetable
                  </span>

                  <span className="rounded-full bg-brand-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-200 ring-1 ring-brand-300/20">
                    Rotation {rotationWeekCode}
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
                  {timetableConfig
                    ?.title ||
                    "Student Timetable"}
                </h2>

                <p className="mt-2 text-sm font-semibold text-slate-300">
                  {student?.name ||
                    "Student"}{" "}
                  ·{" "}
                  {formatClassName(
                    student
                  )}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-xl bg-white/10 px-3 py-2 text-slate-200 ring-1 ring-white/10">
                    Code:{" "}
                    {timetableConfig
                      ?.code ||
                      "Not assigned"}
                  </span>

                  <span className="rounded-xl bg-white/10 px-3 py-2 text-slate-200 ring-1 ring-white/10">
                    Academic year:{" "}
                    {timetableConfig
                      ?.academicYear ||
                      "Not assigned"}
                  </span>

                  <span className="rounded-xl bg-white/10 px-3 py-2 text-slate-200 ring-1 ring-white/10">
                    Term:{" "}
                    {timetableConfig
                      ?.academicTerm ||
                      "Not assigned"}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      {currentClass
                        ? "Class In Progress"
                        : "Next Class Today"}
                    </p>

                    <p className="mt-1 text-base font-black text-white">
                      {nextClass
                        ? getEntryTitle(
                            nextClass
                          )
                        : "No remaining class"}
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${
                      currentClass
                        ? "bg-rose-400/15 text-rose-200 ring-rose-300/20"
                        : "bg-brand-400/15 text-brand-200 ring-brand-300/20"
                    }`}
                  >
                    {currentClass ? (
                      <MonitorPlay
                        size={20}
                      />
                    ) : (
                      <Clock3
                        size={20}
                      />
                    )}
                  </div>
                </div>

                {nextClass ? (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-white/[0.06] px-3 py-3">
                        <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">
                          Time
                        </p>

                        <p className="mt-1 text-xs font-bold text-white">
                          {formatTime(
                            nextClass
                              ?.period
                              ?.startTime
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/[0.06] px-3 py-3">
                        <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">
                          Room
                        </p>

                        <p className="mt-1 truncate text-xs font-bold text-white">
                          {getRoomLabel(
                            nextClass
                          )}
                        </p>
                      </div>
                    </div>

                    {currentClass && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          <span>
                            Class progress
                          </span>

                          <span>
                            {currentClassProgress}%
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-rose-400 transition-all duration-500"
                            style={{
                              width:
                                `${currentClassProgress}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {isValidWebUrl(
                      nextClass
                        ?.onlineMeetingUrl
                    ) && (
                      <button
                        type="button"
                        className="timetable-print-hidden mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-brand-50"
                        onClick={() =>
                          handleOpenOnlineClass(
                            nextClass
                          )
                        }
                      >
                        <Video
                          size={14}
                        />

                        Join Online Class

                        <ExternalLink
                          size={13}
                        />
                      </button>
                    )}
                  </>
                ) : (
                  <p className="mt-4 text-xs leading-5 text-slate-400">
                    Today’s scheduled classes have finished or no classes are published for today.
                  </p>
                )}
              </div>
            </div>
          </section>

          {!available ? (
            <EmptyTimetable
              message={
                timetableData
                  ?.message
              }
              onRefresh={
                handleRefresh
              }
              refreshing={
                refreshing
              }
            />
          ) : (
            <>
              {/*
              |--------------------------------------------------------------------------
              | Summary Cards
              |--------------------------------------------------------------------------
              */}

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map(
                  (
                    card
                  ) => (
                    <StatCard
                      key={
                        card.key
                      }
                      {...card}
                    />
                  )
                )}
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Controls
              |--------------------------------------------------------------------------
              */}

              <section className="timetable-print-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {DAY_ORDER.map(
                      (
                        day
                      ) => {
                        const count =
                          Array.isArray(
                            byDay?.[
                              day
                            ]
                          )
                            ? byDay[
                                day
                              ].length
                            : 0;

                        const active =
                          selectedDay ===
                          day;

                        const isToday =
                          day ===
                          todayDay;

                        return (
                          <button
                            key={
                              day
                            }
                            type="button"
                            className={`relative rounded-xl px-3 py-2 text-xs font-bold transition ${
                              active
                                ? "bg-slate-950 text-white shadow-sm"
                                : "bg-slate-50 text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                            }`}
                            onClick={() =>
                              setSelectedDay(
                                day
                              )
                            }
                          >
                            {DAY_SHORT_LABELS[
                              day
                            ]}

                            <span
                              className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] ${
                                active
                                  ? "bg-white/15 text-white"
                                  : "bg-white text-slate-400 ring-1 ring-slate-200"
                              }`}
                            >
                              {count}
                            </span>

                            {isToday && (
                              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                            )}
                          </button>
                        );
                      }
                    )}

                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-100"
                      onClick={() =>
                        setSelectedDay(
                          todayDay
                        )
                      }
                    >
                      <RotateCcw
                        size={13}
                      />

                      Today
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-xl bg-slate-100 p-1">
                      <button
                        type="button"
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                          viewMode ===
                          "schedule"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        onClick={() =>
                          setViewMode(
                            "schedule"
                          )
                        }
                      >
                        <List
                          size={14}
                        />

                        Day View
                      </button>

                      <button
                        type="button"
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                          viewMode ===
                          "week"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        onClick={() =>
                          setViewMode(
                            "week"
                          )
                        }
                      >
                        <Grid3X3
                          size={14}
                        />

                        Week Grid
                      </button>
                    </div>

                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={
                        handleDownloadCalendar
                      }
                      disabled={
                        entries.length ===
                        0
                      }
                    >
                      <Download
                        size={14}
                      />

                      Add to Calendar
                    </button>

                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                      onClick={
                        handlePrint
                      }
                    >
                      <Printer
                        size={14}
                      />

                      Print
                    </button>

                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={
                        handleRefresh
                      }
                      disabled={
                        refreshing ||
                        !online
                      }
                    >
                      <RefreshCw
                        size={14}
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
              | Timetable Content
              |--------------------------------------------------------------------------
              */}

              {viewMode ===
              "schedule" ? (
                <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
                  <section className="timetable-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <SectionHeader
                      icon={
                        CalendarDays
                      }
                      title={`${DAY_LABELS[selectedDay]} Schedule`}
                      subtitle={`${formatDayDate(
                        selectedDay
                      )} · ${selectedDayEntries.length} scheduled item${
                        selectedDayEntries.length ===
                        1
                          ? ""
                          : "s"
                      }`}
                    />

                    <div className="mt-5">
                      {selectedDayEntries.length >
                      0 ? (
                        <div className="space-y-3">
                          {selectedDayEntries.map(
                            (
                              entry
                            ) => (
                              <TimetableEntryCard
                                key={
                                  entry.id
                                }
                                entry={
                                  entry
                                }
                                selectedDay={
                                  selectedDay
                                }
                                clockMinute={
                                  clockMinute
                                }
                                onOpenOnlineClass={
                                  handleOpenOnlineClass
                                }
                              />
                            )
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                          <CalendarClock
                            size={28}
                            className="mx-auto text-slate-300"
                          />

                          <p className="mt-4 text-sm font-bold text-slate-700">
                            No classes scheduled
                          </p>

                          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                            No timetable entries are published for {DAY_LABELS[selectedDay]}.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  <aside className="space-y-6">
                    {/*
                    |--------------------------------------------------------------------------
                    | Day Summary
                    |--------------------------------------------------------------------------
                    */}

                    <section className="timetable-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SectionHeader
                        icon={
                          Timer
                        }
                        title={`${DAY_LABELS[selectedDay]} Summary`}
                        subtitle="A quick overview of the selected day."
                      />

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            Classes
                          </p>

                          <p className="mt-2 text-2xl font-black text-slate-900">
                            {selectedDayEntries.length}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            Learning Time
                          </p>

                          <p className="mt-2 text-xl font-black text-slate-900">
                            {minutesToDuration(
                              selectedDayEntries.reduce(
                                (
                                  total,
                                  entry
                                ) =>
                                  total +
                                  getEntryDuration(
                                    entry
                                  ),
                                0
                              )
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            First Class
                          </p>

                          <p className="mt-2 text-sm font-black text-slate-900">
                            {selectedDayEntries[0]
                              ? formatTime(
                                  selectedDayEntries[0]
                                    ?.period
                                    ?.startTime
                                )
                              : "—"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            Last Class
                          </p>

                          <p className="mt-2 text-sm font-black text-slate-900">
                            {selectedDayEntries.length >
                            0
                              ? formatTime(
                                  selectedDayEntries[
                                    selectedDayEntries.length -
                                    1
                                  ]?.period
                                    ?.endTime
                                )
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </section>

                    {/*
                    |--------------------------------------------------------------------------
                    | Online Classes
                    |--------------------------------------------------------------------------
                    */}

                    <section className="timetable-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SectionHeader
                        icon={
                          Laptop2
                        }
                        title="Online Access"
                        subtitle="Secure links published for the selected day."
                      />

                      <div className="mt-5 space-y-3">
                        {selectedDayEntries.filter(
                          (
                            entry
                          ) =>
                            isValidWebUrl(
                              entry
                                ?.onlineMeetingUrl
                            )
                        ).length >
                        0 ? (
                          selectedDayEntries
                            .filter(
                              (
                                entry
                              ) =>
                                isValidWebUrl(
                                  entry
                                    ?.onlineMeetingUrl
                                )
                            )
                            .map(
                              (
                                entry
                              ) => (
                                <button
                                  key={`online-${entry.id}`}
                                  type="button"
                                  className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-left transition hover:border-brand-200 hover:bg-brand-50"
                                  onClick={() =>
                                    handleOpenOnlineClass(
                                      entry
                                    )
                                  }
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                                    <Video
                                      size={17}
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-slate-800">
                                      {getEntryTitle(
                                        entry
                                      )}
                                    </p>

                                    <p className="mt-1 text-[10px] text-slate-400">
                                      {formatTime(
                                        entry
                                          ?.period
                                          ?.startTime
                                      )}{" "}
                                      ·{" "}
                                      {formatDeliveryMode(
                                        entry
                                          ?.deliveryMode
                                      )}
                                    </p>
                                  </div>

                                  <ExternalLink
                                    size={14}
                                    className="text-slate-300 transition group-hover:text-brand-600"
                                  />
                                </button>
                              )
                            )
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                            <Wifi
                              size={22}
                              className="mx-auto text-slate-300"
                            />

                            <p className="mt-3 text-xs font-bold text-slate-700">
                              No online class links
                            </p>

                            <p className="mt-1 text-[11px] leading-5 text-slate-400">
                              No secure meeting URL is published for this day.
                            </p>
                          </div>
                        )}
                      </div>
                    </section>

                    {/*
                    |--------------------------------------------------------------------------
                    | Timetable Help
                    |--------------------------------------------------------------------------
                    */}

                    <section className="timetable-print-hidden rounded-3xl border border-sky-200 bg-sky-50 p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                          <MessageCircle
                            size={18}
                          />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-sky-900">
                            Need timetable clarification?
                          </p>

                          <p className="mt-2 text-xs leading-6 text-sky-700">
                            Contact the principal office when a class time, teacher, room or online link needs clarification.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-sky-800 shadow-sm ring-1 ring-sky-200 transition hover:bg-sky-100"
                        onClick={() =>
                          handleContactSchool()
                        }
                      >
                        Contact School

                        <ArrowRight
                          size={14}
                        />
                      </button>
                    </section>
                  </aside>
                </div>
              ) : (
                <section className="timetable-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionHeader
                    icon={
                      Grid3X3
                    }
                    title="Complete Week Grid"
                    subtitle="A complete visual overview of all published timetable days."
                  />

                  <div className="mt-5">
                    <WeeklyGrid
                      byDay={
                        byDay
                      }
                      clockMinute={
                        clockMinute
                      }
                      onOpenOnlineClass={
                        handleOpenOnlineClass
                      }
                    />
                  </div>
                </section>
              )}

              {/*
              |--------------------------------------------------------------------------
              | Subjects and Teachers
              |--------------------------------------------------------------------------
              */}

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="timetable-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionHeader
                    icon={
                      BookOpen
                    }
                    title="Subjects in This Timetable"
                    subtitle={`${uniqueSubjects.length} unique subject${
                      uniqueSubjects.length ===
                      1
                        ? ""
                        : "s"
                    } found.`}
                    actionLabel="Open Subjects"
                    onAction={() =>
                      navigate(
                        "/student-portal/subjects"
                      )
                    }
                  />

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {uniqueSubjects.length >
                    0 ? (
                      uniqueSubjects.map(
                        (
                          subject
                        ) => (
                          <div
                            key={
                              subject.id ||
                              subject.name
                            }
                            className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                                <BookOpen
                                  size={17}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-800">
                                  {subject.name ||
                                    "Subject"}
                                </p>

                                <p className="mt-1 truncate text-[10px] text-slate-400">
                                  {subject.code ||
                                    "No subject code"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )
                    ) : (
                      <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
                        No subjects are assigned in this timetable.
                      </div>
                    )}
                  </div>
                </section>

                <section className="timetable-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionHeader
                    icon={
                      UsersRound
                    }
                    title="Assigned Teachers"
                    subtitle={`${uniqueTeachers.length} teacher${
                      uniqueTeachers.length ===
                      1
                        ? ""
                        : "s"
                    } found across the week.`}
                  />

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {uniqueTeachers.length >
                    0 ? (
                      uniqueTeachers.map(
                        (
                          teacher
                        ) => (
                          <div
                            key={
                              teacher.id ||
                              teacher.name
                            }
                            className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                <UserRound
                                  size={17}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-800">
                                  {teacher.name ||
                                    "Teacher"}
                                </p>

                                <p className="mt-1 truncate text-[10px] text-slate-400">
                                  {teacher.employeeId
                                    ? `Employee ID: ${teacher.employeeId}`
                                    : "Employee ID not available"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )
                    ) : (
                      <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
                        No teachers are assigned in this timetable.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Configuration Information
              |--------------------------------------------------------------------------
              */}

              <section className="timetable-print-break rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Info
                        size={18}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Published timetable information
                      </p>

                      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                        This schedule is read-only and is loaded from the school’s published timetable configuration.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 text-[10px] sm:grid-cols-2 lg:min-w-[440px]">
                    <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
                      <p className="font-bold uppercase tracking-wide text-slate-400">
                        Effective From
                      </p>

                      <p className="mt-1 font-bold text-slate-700">
                        {formatDate(
                          timetableConfig
                            ?.effectiveStartDate
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
                      <p className="font-bold uppercase tracking-wide text-slate-400">
                        Effective Until
                      </p>

                      <p className="mt-1 font-bold text-slate-700">
                        {formatDate(
                          timetableConfig
                            ?.effectiveEndDate
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
                      <p className="font-bold uppercase tracking-wide text-slate-400">
                        Timezone
                      </p>

                      <p className="mt-1 font-bold text-slate-700">
                        {timetableConfig
                          ?.timezone ||
                          "Asia/Karachi"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
                      <p className="font-bold uppercase tracking-wide text-slate-400">
                        Publication Status
                      </p>

                      <p className="mt-1 font-bold capitalize text-emerald-700">
                        {timetableConfig
                          ?.status ||
                          "Published"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </>
    );
  };

export default StudentTimetable;
