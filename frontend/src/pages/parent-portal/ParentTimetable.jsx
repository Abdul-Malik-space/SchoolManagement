import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  AlertCircle,
  BookOpen,
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
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Video
} from "lucide-react";

import {
  useNavigate,
  useOutletContext
} from "react-router-dom";

import {
  getParentChildTimetable
} from "../../api/parentPortal";

/*
|--------------------------------------------------------------------------
| Constants
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
    error?.message ||
    "Unable to load the class timetable."
  );
};

const getCurrentDay = () => {
  const dayIndex =
    new Date().getDay();

  const dayMap = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ];

  return (
    dayMap[
      dayIndex
    ] ||
    "monday"
  );
};

const getInitials = (
  value
) => {
  return String(
    value || "Student"
  )
    .split(" ")
    .filter(Boolean)
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
    .toUpperCase();
};

const formatClass = (
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
    return `${className} · Section ${sectionName}`;
  }

  return (
    className ||
    sectionName ||
    "Class not assigned"
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

const formatDate = (
  value
) => {
  if (!value) {
    return "Not specified";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric"
    }
  ).format(date);
};

const formatTime = (
  value
) => {
  if (!value) {
    return "";
  }

  const match =
    String(
      value
    ).match(
      /^(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return String(
      value
    );
  }

  const hour =
    Number(
      match[1]
    );

  const minute =
    match[2];

  const period =
    hour >= 12
      ? "PM"
      : "AM";

  const normalizedHour =
    hour % 12 ||
    12;

  return `${normalizedHour}:${minute} ${period}`;
};

const formatPeriodTime = (
  period
) => {
  const start =
    formatTime(
      period?.startTime
    );

  const end =
    formatTime(
      period?.endTime
    );

  if (
    start &&
    end
  ) {
    return `${start} – ${end}`;
  }

  return (
    start ||
    end ||
    "Time not set"
  );
};

const getConfigLabel = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "Not specified";
  }

  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number"
  ) {
    return String(
      value
    );
  }

  const directLabel =
    value.label ||
    value.name ||
    value.title ||
    value.code ||
    value.academicYearLabel ||
    value.academicTermName;

  if (directLabel) {
    return String(
      directLabel
    );
  }

  if (
    value.startYear &&
    value.endYear
  ) {
    return `${value.startYear}-${value.endYear}`;
  }

  return "Not specified";
};

const getEntryTitle = (
  entry
) => {
  return (
    entry?.subject
      ?.name ||
    entry?.period
      ?.name ||
    titleCase(
      entry?.entryType ||
      "Class"
    )
  );
};

const getEntrySubtitle = (
  entry
) => {
  const values = [
    entry?.subject
      ?.code,

    entry?.teacher
      ?.name,

    entry?.room
      ?.name ||
      entry?.room
        ?.code
  ].filter(Boolean);

  return (
    values.join(
      " · "
    ) ||
    "Details not assigned"
  );
};

const buildPeriodKey = (
  period
) => {
  return [
    period?.sequence ??
      "",

    period?.startTime ||
      "",

    period?.endTime ||
      "",

    period?.code ||
      "",

    period?.name ||
      ""
  ].join("|");
};

const getDayEntries = (
  timetable,
  day
) => {
  const serverEntries =
    timetable?.byDay?.[
      day
    ];

  if (
    Array.isArray(
      serverEntries
    )
  ) {
    return serverEntries;
  }

  return (
    Array.isArray(
      timetable?.entries
    )
      ? timetable.entries
      : []
  ).filter(
    (
      entry
    ) =>
      entry.day ===
      day
  );
};

const isOnlineEntry = (
  entry
) => {
  return [
    "online",
    "hybrid"
  ].includes(
    String(
      entry?.deliveryMode ||
      ""
    ).toLowerCase()
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
  tone = "brand"
}) => {
  const tones = {
    brand:
      "bg-brand-50 text-brand-700",

    emerald:
      "bg-emerald-50 text-emerald-700",

    cyan:
      "bg-cyan-50 text-cyan-700",

    amber:
      "bg-amber-50 text-amber-700"
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>

          <p className="mt-3 truncate text-2xl font-black tracking-tight text-slate-900">
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
| Timetable Entry Card
|--------------------------------------------------------------------------
*/

const TimetableEntryCard = ({
  entry,
  compact = false
}) => {
  const online =
    isOnlineEntry(
      entry
    );

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
        compact
          ? "p-3"
          : "p-4"
      }`}
      style={{
        borderLeftWidth:
          "4px",

        borderLeftColor:
          entry?.displayColor ||
          "#64748b"
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`truncate font-black text-slate-900 ${
              compact
                ? "text-xs"
                : "text-sm"
            }`}
          >
            {getEntryTitle(
              entry
            )}
          </p>

          <p
            className={`mt-1 truncate text-slate-500 ${
              compact
                ? "text-[10px]"
                : "text-xs"
            }`}
          >
            {entry?.subject
              ?.code ||
              titleCase(
                entry?.entryType ||
                "lesson"
              )}
          </p>
        </div>

        {online && (
          <div
            className={`flex shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ${
              compact
                ? "h-7 w-7"
                : "h-8 w-8"
            }`}
            title={
              titleCase(
                entry
                  ?.deliveryMode
              )
            }
          >
            <Laptop2
              size={
                compact
                  ? 13
                  : 15
              }
            />
          </div>
        )}
      </div>

      {!compact && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <UserRound
              size={14}
              className="shrink-0 text-slate-400"
            />

            <span className="truncate">
              {entry?.teacher
                ?.name ||
                "Teacher not assigned"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin
              size={14}
              className="shrink-0 text-slate-400"
            />

            <span className="truncate">
              {entry?.room
                ?.name ||
                entry?.room
                  ?.code ||
                "Room not assigned"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock3
              size={14}
              className="shrink-0 text-slate-400"
            />

            <span>
              {formatPeriodTime(
                entry?.period
              )}
            </span>
          </div>
        </div>
      )}

      {compact && (
        <p className="mt-2 truncate text-[10px] text-slate-400">
          {getEntrySubtitle(
            entry
          )}
        </p>
      )}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Daily Agenda Entry
|--------------------------------------------------------------------------
*/

const DailyAgendaEntry = ({
  entry,
  index
}) => {
  const online =
    isOnlineEntry(
      entry
    );

  return (
    <article className="relative rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex shrink-0 items-center gap-3 lg:w-[190px]">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
            {entry?.period
              ?.sequence ||
              index + 1}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {entry?.period
                ?.shortName ||
                entry?.period
                  ?.name ||
                `Period ${index + 1}`}
            </p>

            <p className="mt-1 text-sm font-black text-slate-800">
              {formatPeriodTime(
                entry?.period
              )}
            </p>
          </div>
        </div>

        <div
          className="hidden h-16 w-1 shrink-0 rounded-full lg:block"
          style={{
            backgroundColor:
              entry?.displayColor ||
              "#64748b"
          }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-black text-slate-900">
                  {getEntryTitle(
                    entry
                  )}
                </h3>

                <span className="rounded-full bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-200">
                  {titleCase(
                    entry?.entryType ||
                    "lesson"
                  )}
                </span>

                {online && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-200">
                    <MonitorPlay
                      size={12}
                    />

                    {titleCase(
                      entry
                        ?.deliveryMode
                    )}
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                {entry?.subject
                  ?.code ||
                  "Subject code not assigned"}
              </p>
            </div>

            {entry
              ?.onlineMeetingUrl && (
              <a
                href={
                  entry
                    .onlineMeetingUrl
                }
                target="_blank"
                rel="noreferrer"
                className="btn-secondary shrink-0"
              >
                <Video
                  size={15}
                />

                Join Class

                <ExternalLink
                  size={13}
                />
              </a>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-slate-200">
                <UserRound
                  size={15}
                />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Teacher
                </p>

                <p className="mt-1 truncate text-xs font-bold text-slate-700">
                  {entry?.teacher
                    ?.name ||
                    "Not assigned"}
                </p>

                {entry?.teacher
                  ?.employeeId && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    ID:{" "}
                    {entry
                      .teacher
                      .employeeId}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 ring-1 ring-slate-200">
                <MapPin
                  size={15}
                />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Room
                </p>

                <p className="mt-1 truncate text-xs font-bold text-slate-700">
                  {entry?.room
                    ?.name ||
                    entry?.room
                      ?.code ||
                    "Not assigned"}
                </p>

                {(entry?.room
                  ?.building ||
                  entry?.room
                    ?.floor) && (
                  <p className="mt-0.5 truncate text-[10px] text-slate-400">
                    {[
                      entry?.room
                        ?.building,

                      entry?.room
                        ?.floor
                        ? `Floor ${entry.room.floor}`
                        : ""
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

            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 ring-1 ring-slate-200">
                <Clock3
                  size={15}
                />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Duration
                </p>

                <p className="mt-1 text-xs font-bold text-slate-700">
                  {entry?.period
                    ?.durationMinutes
                    ? `${entry.period.durationMinutes} minutes`
                    : "Not specified"}
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  {formatPeriodTime(
                    entry?.period
                  )}
                </p>
              </div>
            </div>
          </div>

          {entry?.notes && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Class Note
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-800">
                {entry.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Weekly Timetable Grid
|--------------------------------------------------------------------------
*/

const WeeklyTimetableGrid = ({
  periods,
  entriesByDay,
  currentDay
}) => {
  const entryMap =
    useMemo(
      () => {
        const map =
          new Map();

        DAY_ORDER.forEach(
          (
            day
          ) => {
            (
              entriesByDay[
                day
              ] ||
              []
            ).forEach(
              (
                entry
              ) => {
                map.set(
                  `${day}:${buildPeriodKey(
                    entry.period
                  )}`,
                  entry
                );
              }
            );
          }
        );

        return map;
      },
      [
        entriesByDay
      ]
    );

  return (
    <div className="overflow-x-auto rounded-[28px] border border-slate-200 bg-white">
      <table className="min-w-[1180px] w-full border-collapse">
        <thead>
          <tr className="bg-slate-950 text-white">
            <th className="sticky left-0 z-20 w-[170px] border-r border-white/10 bg-slate-950 px-4 py-4 text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Period
              </p>

              <p className="mt-1 text-sm font-black">
                Time
              </p>
            </th>

            {DAY_ORDER.map(
              (
                day
              ) => (
                <th
                  key={
                    day
                  }
                  className={`min-w-[145px] border-r border-white/10 px-3 py-4 text-left last:border-r-0 ${
                    currentDay ===
                    day
                      ? "bg-brand-700"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black">
                      {DAY_LABELS[
                        day
                      ]}
                    </span>

                    {currentDay ===
                      day && (
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Today
                      </span>
                    )}
                  </div>
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {periods.map(
            (
              period,
              periodIndex
            ) => {
              const periodKey =
                buildPeriodKey(
                  period
                );

              return (
                <tr
                  key={
                    periodKey ||
                    periodIndex
                  }
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-4 py-4 align-top">
                    <p className="text-xs font-black text-slate-800">
                      {period.shortName ||
                        period.name ||
                        `Period ${periodIndex + 1}`}
                    </p>

                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      {formatPeriodTime(
                        period
                      )}
                    </p>

                    {period.durationMinutes && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        {period.durationMinutes} min
                      </p>
                    )}
                  </td>

                  {DAY_ORDER.map(
                    (
                      day
                    ) => {
                      const entry =
                        entryMap.get(
                          `${day}:${periodKey}`
                        );

                      return (
                        <td
                          key={
                            `${day}:${periodKey}`
                          }
                          className={`border-r border-slate-100 p-2 align-top last:border-r-0 ${
                            currentDay ===
                            day
                              ? "bg-brand-50/30"
                              : "bg-white"
                          }`}
                        >
                          {entry ? (
                            <TimetableEntryCard
                              entry={
                                entry
                              }
                              compact
                            />
                          ) : (
                            <div className="flex min-h-[82px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                                No class
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    }
                  )}
                </tr>
              );
            }
          )}
        </tbody>
      </table>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Parent Timetable Page
|--------------------------------------------------------------------------
*/

const ParentTimetable =
  () => {
    const navigate =
      useNavigate();

    const {
      children,
      selectedChild,
      selectedChildId
    } = useOutletContext();

    const requestRef =
      useRef(null);

    const [
      timetable,
      setTimetable
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
      viewMode,
      setViewMode
    ] = useState(
      "weekly"
    );

    const [
      selectedDay,
      setSelectedDay
    ] = useState(
      getCurrentDay()
    );

    const [
      rotationCode,
      setRotationCode
    ] = useState("");

    const [
      rotationInput,
      setRotationInput
    ] = useState("");

    const studentId =
      selectedChild
        ?.student
        ?.id ||
      selectedChildId ||
      "";

    const timetableAllowed =
      selectedChild
        ?.link
        ?.permissions
        ?.timetable !==
      false;

    /*
    |--------------------------------------------------------------------------
    | Reset Timetable State when Child Changes
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      setTimetable(
        null
      );

      setRotationCode("");
      setRotationInput("");

      setSelectedDay(
        getCurrentDay()
      );
    }, [
      studentId
    ]);

    /*
    |--------------------------------------------------------------------------
    | Load Timetable
    |--------------------------------------------------------------------------
    */

    const loadTimetable =
      useCallback(
        async ({
          silent = false
        } = {}) => {
          if (
            !studentId ||
            !timetableAllowed
          ) {
            setTimetable(
              null
            );

            setLoading(
              false
            );

            return;
          }

          requestRef.current
            ?.abort();

          const controller =
            new AbortController();

          requestRef.current =
            controller;

          if (silent) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError("");

          try {
            const response =
              await getParentChildTimetable(
                studentId,
                {
                  rotationWeekCode:
                    rotationCode ||
                    undefined
                },
                {
                  signal:
                    controller.signal
                }
              );

            setTimetable(
              response?.data
                ?.data ||
              null
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
        [
          studentId,
          timetableAllowed,
          rotationCode
        ]
      );

    useEffect(() => {
      loadTimetable();

      return () => {
        requestRef.current
          ?.abort();
      };
    }, [
      loadTimetable
    ]);

    /*
    |--------------------------------------------------------------------------
    | Derived Timetable Information
    |--------------------------------------------------------------------------
    */

    const student =
      timetable?.child ||
      selectedChild
        ?.student ||
      null;

    const entries =
      Array.isArray(
        timetable?.entries
      )
        ? timetable.entries
        : [];

    const entriesByDay =
      useMemo(
        () => {
          return DAY_ORDER.reduce(
            (
              result,
              day
            ) => {
              result[
                day
              ] =
                getDayEntries(
                  timetable,
                  day
                );

              return result;
            },
            {}
          );
        },
        [
          timetable
        ]
      );

    const periods =
      useMemo(
        () => {
          const periodMap =
            new Map();

          entries.forEach(
            (
              entry
            ) => {
              const key =
                buildPeriodKey(
                  entry.period
                );

              if (
                key &&
                !periodMap.has(
                  key
                )
              ) {
                periodMap.set(
                  key,
                  entry.period
                );
              }
            }
          );

          return Array.from(
            periodMap.values()
          ).sort(
            (
              first,
              second
            ) => {
              const sequenceDifference =
                Number(
                  first?.sequence ||
                  999
                ) -
                Number(
                  second?.sequence ||
                  999
                );

              if (
                sequenceDifference !==
                0
              ) {
                return sequenceDifference;
              }

              return String(
                first?.startTime ||
                ""
              ).localeCompare(
                String(
                  second?.startTime ||
                  ""
                )
              );
            }
          );
        },
        [
          entries
        ]
      );

    const timetableSummary =
      useMemo(
        () => {
          const subjects =
            new Set();

          const teachers =
            new Set();

          let totalMinutes =
            0;

          entries.forEach(
            (
              entry
            ) => {
              const subjectKey =
                entry?.subject
                  ?.id ||
                entry?.subject
                  ?.code ||
                entry?.subject
                  ?.name;

              const teacherKey =
                entry?.teacher
                  ?.id ||
                entry?.teacher
                  ?.employeeId ||
                entry?.teacher
                  ?.name;

              if (subjectKey) {
                subjects.add(
                  String(
                    subjectKey
                  )
                );
              }

              if (teacherKey) {
                teachers.add(
                  String(
                    teacherKey
                  )
                );
              }

              totalMinutes +=
                Number(
                  entry?.period
                    ?.durationMinutes ||
                  0
                );
            }
          );

          return {
            lessons:
              entries.length,

            subjects:
              subjects.size,

            teachers:
              teachers.size,

            totalMinutes
          };
        },
        [
          entries
        ]
      );

    const currentDay =
      getCurrentDay();

    const todayEntries =
      entriesByDay[
        currentDay
      ] ||
      [];

    const selectedDayEntries =
      entriesByDay[
        selectedDay
      ] ||
      [];

    const config =
      timetable
        ?.timetableConfig ||
      null;

    const activeRotationCode =
      timetable
        ?.rotationWeekCode ||
      "STANDARD";

    /*
    |--------------------------------------------------------------------------
    | Rotation Filter
    |--------------------------------------------------------------------------
    */

    const applyRotationCode =
      () => {
        const normalizedCode =
          rotationInput
            .trim()
            .toUpperCase();

        setRotationCode(
          normalizedCode
        );
      };

    const clearRotationCode =
      () => {
        setRotationInput("");
        setRotationCode("");
      };

    /*
    |--------------------------------------------------------------------------
    | Export Timetable
    |--------------------------------------------------------------------------
    */

    const exportCsv =
      () => {
        if (
          entries.length ===
          0
        ) {
          return;
        }

        const rows = [
          [
            "Day",
            "Period",
            "Start Time",
            "End Time",
            "Subject",
            "Subject Code",
            "Teacher",
            "Room",
            "Delivery Mode",
            "Entry Type",
            "Notes"
          ],

          ...entries.map(
            (
              entry
            ) => [
              DAY_LABELS[
                entry.day
              ] ||
                titleCase(
                  entry.day
                ),

              entry?.period
                ?.name ||
                entry?.period
                  ?.shortName ||
                "",

              entry?.period
                ?.startTime ||
                "",

              entry?.period
                ?.endTime ||
                "",

              entry?.subject
                ?.name ||
                "",

              entry?.subject
                ?.code ||
                "",

              entry?.teacher
                ?.name ||
                "",

              entry?.room
                ?.name ||
                entry?.room
                  ?.code ||
                "",

              entry?.deliveryMode ||
                "",

              entry?.entryType ||
                "",

              entry?.notes ||
                ""
            ]
          )
        ];

        const csv =
          rows
            .map(
              (
                row
              ) =>
                row
                  .map(
                    (
                      value
                    ) =>
                      `"${String(
                        value ?? ""
                      ).replaceAll(
                        '"',
                        '""'
                      )}"`
                  )
                  .join(",")
            )
            .join("\n");

        const blob =
          new Blob(
            [
              csv
            ],
            {
              type:
                "text/csv;charset=utf-8;"
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
          `${student?.name || "student"}-${activeRotationCode}-timetable.csv`
            .replace(
              /\s+/g,
              "-"
            )
            .toLowerCase();

        document.body.appendChild(
          anchor
        );

        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(
          url
        );
      };

    /*
    |--------------------------------------------------------------------------
    | No Child State
    |--------------------------------------------------------------------------
    */

    if (
      children.length ===
      0
    ) {
      return (
        <div className="card grid min-h-[480px] place-items-center p-8 text-center">
          <div className="max-w-lg">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-brand-50 text-brand-700">
              <UsersRound
                size={34}
              />
            </div>

            <h2 className="mt-6 text-xl font-black text-slate-900">
              No child is linked
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              A class timetable becomes available after the school links and verifies a student with your parent account.
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

    /*
    |--------------------------------------------------------------------------
    | Permission Restricted State
    |--------------------------------------------------------------------------
    */

    if (
      !timetableAllowed
    ) {
      return (
        <div className="card grid min-h-[480px] place-items-center p-8 text-center">
          <div className="max-w-lg">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-amber-50 text-amber-700">
              <ShieldCheck
                size={34}
              />
            </div>

            <h2 className="mt-6 text-xl font-black text-slate-900">
              Timetable access is restricted
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              The school has not enabled timetable access for this parent–student link. Select another child or contact the school administration.
            </p>

            <button
              type="button"
              className="btn-primary mt-6"
              onClick={() =>
                navigate(
                  `/parent-portal/messages?studentId=${encodeURIComponent(
                    studentId
                  )}&category=timetable`
                )
              }
            >
              <MessageCircle
                size={16}
              />

              Contact Principal
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-4">
        <style>
          {`
            @media print {
              body * {
                visibility: hidden !important;
              }

              #parent-timetable-print,
              #parent-timetable-print * {
                visibility: visible !important;
              }

              #parent-timetable-print {
                position: absolute;
                inset: 0;
                width: 100%;
                padding: 12px;
                background: white;
              }

              .parent-timetable-print-hidden {
                display: none !important;
              }

              #parent-timetable-print table {
                font-size: 9px !important;
              }

              @page {
                size: landscape;
                margin: 8mm;
              }
            }
          `}
        </style>

        {/*
        |--------------------------------------------------------------------------
        | Hero
        |--------------------------------------------------------------------------
        */}

        <section className="parent-timetable-print-hidden relative overflow-hidden rounded-[32px] bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/10 text-lg font-black ring-1 ring-white/15">
                {student?.photo ? (
                  <img
                    src={
                      student.photo
                    }
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
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-200">
                  <CalendarDays
                    size={13}
                  />

                  Published Class Timetable
                </div>

                <h2 className="mt-3 truncate text-2xl font-black sm:text-3xl">
                  {student?.name ||
                    "Student"}
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  {formatClass(
                    student
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Admission No:{" "}
                  {student
                    ?.admissionNumber ||
                    "Not assigned"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[450px]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Timetable
                </p>

                <p className="mt-2 truncate text-base font-black text-white">
                  {config?.title ||
                    "Published Schedule"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Code:{" "}
                  {config?.code ||
                    "Not assigned"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Rotation Week
                </p>

                <p className="mt-2 text-base font-black text-white">
                  {activeRotationCode}
                </p>

                <p className="mt-1 text-xs text-cyan-300">
                  {entries.length} scheduled class
                  {entries.length ===
                  1
                    ? ""
                    : "es"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Controls
        |--------------------------------------------------------------------------
        */}

        <section className="parent-timetable-print-hidden card p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                  viewMode ===
                  "weekly"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                onClick={() =>
                  setViewMode(
                    "weekly"
                  )
                }
              >
                <Grid3X3
                  size={16}
                />

                Weekly Grid
              </button>

              <button
                type="button"
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                  viewMode ===
                  "daily"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                onClick={() =>
                  setViewMode(
                    "daily"
                  )
                }
              >
                <List
                  size={16}
                />

                Daily Agenda
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={
                    rotationInput
                  }
                  onChange={(
                    event
                  ) =>
                    setRotationInput(
                      event.target
                        .value
                        .toUpperCase()
                    )
                  }
                  className="field-input h-11 min-w-[170px]"
                  placeholder="Rotation code"
                  maxLength={
                    30
                  }
                />

                <button
                  type="button"
                  className="btn-secondary h-11"
                  onClick={
                    applyRotationCode
                  }
                  disabled={
                    rotationInput
                      .trim()
                      .toUpperCase() ===
                    rotationCode
                  }
                >
                  Apply
                </button>

                {(rotationCode ||
                  rotationInput) && (
                  <button
                    type="button"
                    className="btn-ghost h-11 px-3"
                    onClick={
                      clearRotationCode
                    }
                    title="Use automatic rotation"
                  >
                    <RotateCcw
                      size={16}
                    />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary h-11"
                  disabled={
                    entries.length ===
                    0
                  }
                  onClick={
                    exportCsv
                  }
                >
                  <Download
                    size={16}
                  />

                  Export
                </button>

                <button
                  type="button"
                  className="btn-secondary h-11"
                  disabled={
                    entries.length ===
                    0
                  }
                  onClick={() =>
                    window.print()
                  }
                >
                  <Printer
                    size={16}
                  />

                  Print
                </button>

                <button
                  type="button"
                  className="btn-primary h-11"
                  disabled={
                    refreshing
                  }
                  onClick={() =>
                    loadTimetable({
                      silent: true
                    })
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

                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <Info
              size={17}
              className="mt-0.5 shrink-0 text-brand-600"
            />

            <p className="text-xs leading-5 text-slate-500">
              The school normally uses the automatic rotation code. Enter a code only when the school has provided a specific alternate-week code.
            </p>
          </div>
        </section>

        {error && (
          <section className="parent-timetable-print-hidden flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0 text-rose-600"
              />

              <div>
                <p className="text-sm font-bold text-rose-800">
                  Timetable could not be updated
                </p>

                <p className="mt-1 text-xs text-rose-600">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                loadTimetable()
              }
            >
              Try Again
            </button>
          </section>
        )}

        {loading ? (
          <div className="grid min-h-[420px] place-items-center text-center">
            <div>
              <RefreshCw
                size={28}
                className="mx-auto animate-spin text-brand-600"
              />

              <p className="mt-4 text-sm font-black text-slate-800">
                Loading class timetable
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Preparing the published weekly schedule…
              </p>
            </div>
          </div>
        ) : !timetable?.available ? (
          <section className="card grid min-h-[440px] place-items-center p-8 text-center">
            <div className="max-w-xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-cyan-50 text-cyan-700">
                <CalendarDays
                  size={34}
                />
              </div>

              <h2 className="mt-6 text-xl font-black text-slate-900">
                No published timetable available
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                {timetable?.message ||
                  "The school has not published a timetable for this class and section yet."}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    loadTimetable()
                  }
                >
                  <RefreshCw
                    size={16}
                  />

                  Check Again
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    navigate(
                      `/parent-portal/messages?studentId=${encodeURIComponent(
                        studentId
                      )}&category=timetable`
                    )
                  }
                >
                  <MessageCircle
                    size={16}
                  />

                  Ask Principal
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div
            id="parent-timetable-print"
            className="space-y-6"
          >
            {/*
            |--------------------------------------------------------------------------
            | Printable Header
            |--------------------------------------------------------------------------
            */}

            <section className="hidden border-b-2 border-slate-900 pb-4 print:block">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900">
                    {student?.school
                      ?.schoolName ||
                      "School / Madrasa"}
                  </h1>

                  <p className="mt-1 text-sm text-slate-600">
                    Class Timetable ·{" "}
                    {student?.name ||
                      "Student"}{" "}
                    ·{" "}
                    {formatClass(
                      student
                    )}
                  </p>
                </div>

                <div className="text-right text-xs text-slate-600">
                  <p>
                    {config?.title ||
                      "Published Timetable"}
                  </p>

                  <p className="mt-1">
                    Rotation:{" "}
                    {activeRotationCode}
                  </p>
                </div>
              </div>
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Timetable Summary
            |--------------------------------------------------------------------------
            */}

            <section className="parent-timetable-print-hidden grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Weekly Classes"
                value={
                  timetableSummary
                    .lessons
                }
                helper="Total scheduled entries in the active rotation."
                icon={
                  CalendarDays
                }
                tone="brand"
              />

              <SummaryCard
                title="Subjects"
                value={
                  timetableSummary
                    .subjects
                }
                helper="Distinct subjects included in this timetable."
                icon={
                  BookOpen
                }
                tone="emerald"
              />

              <SummaryCard
                title="Teachers"
                value={
                  timetableSummary
                    .teachers
                }
                helper="Teachers assigned across the weekly schedule."
                icon={
                  UserRound
                }
                tone="cyan"
              />

              <SummaryCard
                title="Learning Time"
                value={
                  timetableSummary
                    .totalMinutes
                    ? `${Math.floor(
                        timetableSummary.totalMinutes /
                          60
                      )}h ${
                        timetableSummary.totalMinutes %
                        60
                      }m`
                    : "Not set"
                }
                helper="Combined duration of scheduled classes."
                icon={
                  Clock3
                }
                tone="amber"
              />
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Timetable Metadata
            |--------------------------------------------------------------------------
            */}

            <section className="parent-timetable-print-hidden card p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Academic Year
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-800">
                    {getConfigLabel(
                      config
                        ?.academicYear
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Academic Term
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-800">
                    {getConfigLabel(
                      config
                        ?.academicTerm
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Effective From
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-800">
                    {formatDate(
                      config
                        ?.effectiveStartDate
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Effective Until
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-800">
                    {formatDate(
                      config
                        ?.effectiveEndDate
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Today Snapshot
            |--------------------------------------------------------------------------
            */}

            <section className="parent-timetable-print-hidden relative overflow-hidden rounded-[28px] border border-cyan-200 bg-cyan-50 p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-cyan-200/40 blur-3xl" />

              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-cyan-700">
                    <Sparkles
                      size={17}
                    />

                    <p className="text-xs font-bold uppercase tracking-[0.14em]">
                      Today’s Schedule
                    </p>
                  </div>

                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    {DAY_LABELS[
                      currentDay
                    ]}
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    {todayEntries.length >
                    0
                      ? `${todayEntries.length} class${
                          todayEntries.length ===
                          1
                            ? ""
                            : "es"
                        } scheduled today.`
                      : "No classes are scheduled today."}
                  </p>
                </div>

                {todayEntries.length >
                  0 && (
                  <div className="flex max-w-full gap-3 overflow-x-auto pb-1 lg:max-w-[65%]">
                    {todayEntries
                      .slice(
                        0,
                        4
                      )
                      .map(
                        (
                          entry
                        ) => (
                          <div
                            key={
                              entry.id
                            }
                            className="min-w-[210px]"
                          >
                            <TimetableEntryCard
                              entry={
                                entry
                              }
                              compact
                            />
                          </div>
                        )
                      )}
                  </div>
                )}
              </div>
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Weekly or Daily View
            |--------------------------------------------------------------------------
            */}

            {viewMode ===
            "weekly" ? (
              <section>
                <div className="parent-timetable-print-hidden mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                    Weekly Schedule
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-900">
                    Complete Timetable Grid
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Scroll horizontally on smaller screens to view every day.
                  </p>
                </div>

                {periods.length >
                0 ? (
                  <WeeklyTimetableGrid
                    periods={
                      periods
                    }
                    entriesByDay={
                      entriesByDay
                    }
                    currentDay={
                      currentDay
                    }
                  />
                ) : (
                  <div className="card grid min-h-[300px] place-items-center p-8 text-center">
                    <div>
                      <Grid3X3
                        size={32}
                        className="mx-auto text-slate-300"
                      />

                      <h3 className="mt-4 text-base font-black text-slate-800">
                        No timetable entries found
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        The selected rotation does not contain scheduled classes.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section>
                <div className="parent-timetable-print-hidden mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                      Daily Agenda
                    </p>

                    <h2 className="mt-1 text-xl font-black text-slate-900">
                      {DAY_LABELS[
                        selectedDay
                      ]}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Detailed period-by-period schedule for the selected day.
                    </p>
                  </div>

                  <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                    {DAY_ORDER.map(
                      (
                        day
                      ) => (
                        <button
                          key={
                            day
                          }
                          type="button"
                          className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                            selectedDay ===
                            day
                              ? "bg-slate-950 text-white shadow-sm"
                              : currentDay ===
                                day
                                ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                          onClick={() =>
                            setSelectedDay(
                              day
                            )
                          }
                        >
                          {DAY_LABELS[
                            day
                          ]}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {selectedDayEntries.length >
                0 ? (
                  <div className="space-y-4">
                    {selectedDayEntries.map(
                      (
                        entry,
                        index
                      ) => (
                        <DailyAgendaEntry
                          key={
                            entry.id
                          }
                          entry={
                            entry
                          }
                          index={
                            index
                          }
                        />
                      )
                    )}
                  </div>
                ) : (
                  <div className="card grid min-h-[320px] place-items-center p-8 text-center">
                    <div className="max-w-md">
                      <CalendarDays
                        size={34}
                        className="mx-auto text-slate-300"
                      />

                      <h3 className="mt-5 text-lg font-black text-slate-900">
                        No classes on{" "}
                        {DAY_LABELS[
                          selectedDay
                        ]}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        No scheduled timetable entries are available for this day and rotation week.
                      </p>

                      <div className="mt-5 flex justify-center gap-2">
                        <button
                          type="button"
                          className="btn-secondary px-3"
                          onClick={() => {
                            const currentIndex =
                              DAY_ORDER.indexOf(
                                selectedDay
                              );

                            setSelectedDay(
                              DAY_ORDER[
                                (
                                  currentIndex -
                                  1 +
                                  DAY_ORDER.length
                                ) %
                                  DAY_ORDER.length
                              ]
                            );
                          }}
                        >
                          <ChevronLeft
                            size={16}
                          />

                          Previous Day
                        </button>

                        <button
                          type="button"
                          className="btn-secondary px-3"
                          onClick={() => {
                            const currentIndex =
                              DAY_ORDER.indexOf(
                                selectedDay
                              );

                            setSelectedDay(
                              DAY_ORDER[
                                (
                                  currentIndex +
                                  1
                                ) %
                                  DAY_ORDER.length
                              ]
                            );
                          }}
                        >
                          Next Day

                          <ChevronRight
                            size={16}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/*
            |--------------------------------------------------------------------------
            | Support Cards
            |--------------------------------------------------------------------------
            */}

            <section className="parent-timetable-print-hidden grid gap-5 lg:grid-cols-2">
              <div className="card p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <CheckCircle2
                      size={22}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Official Published Schedule
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      This timetable is read directly from the school’s active published timetable configuration.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <MessageCircle
                      size={22}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-slate-900">
                      Timetable Question?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Contact the principal regarding a missing class, incorrect teacher, room change or rotation-week concern.
                    </p>

                    <button
                      type="button"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 transition hover:text-brand-800"
                      onClick={() =>
                        navigate(
                          `/parent-portal/messages?studentId=${encodeURIComponent(
                            studentId
                          )}&category=timetable`
                        )
                      }
                    >
                      Message Principal

                      <ChevronRight
                        size={15}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    );
  };

export default ParentTimetable;