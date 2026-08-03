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
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileSpreadsheet,
  Info,
  Lightbulb,
  MessageCircle,
  MinusCircle,
  Printer,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserRoundCheck,
  XCircle
} from "lucide-react";

import {
  getStudentPortalAttendance
} from "../../api/studentPortal";

/*
|--------------------------------------------------------------------------
| Attendance Constants
|--------------------------------------------------------------------------
*/

const WEEK_DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun"
];

const STATUS_CONFIG = {
  present: {
    label:
      "Present",

    shortLabel:
      "P",

    icon:
      UserCheck,

    badge:
      "bg-emerald-100 text-emerald-700 ring-emerald-200",

    calendar:
      "border-emerald-200 bg-emerald-50 text-emerald-800",

    dot:
      "bg-emerald-500",

    bar:
      "bg-emerald-500"
  },

  absent: {
    label:
      "Absent",

    shortLabel:
      "A",

    icon:
      UserMinus,

    badge:
      "bg-rose-100 text-rose-700 ring-rose-200",

    calendar:
      "border-rose-200 bg-rose-50 text-rose-800",

    dot:
      "bg-rose-500",

    bar:
      "bg-rose-500"
  },

  late: {
    label:
      "Late",

    shortLabel:
      "L",

    icon:
      Clock3,

    badge:
      "bg-amber-100 text-amber-700 ring-amber-200",

    calendar:
      "border-amber-200 bg-amber-50 text-amber-800",

    dot:
      "bg-amber-500",

    bar:
      "bg-amber-500"
  },

  leave: {
    label:
      "Leave",

    shortLabel:
      "LV",

    icon:
      MinusCircle,

    badge:
      "bg-sky-100 text-sky-700 ring-sky-200",

    calendar:
      "border-sky-200 bg-sky-50 text-sky-800",

    dot:
      "bg-sky-500",

    bar:
      "bg-sky-500"
  }
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
    "Unable to load attendance information."
  );
};

const getMonthKey = (
  value = new Date()
) => {
  const date =
    new Date(
      value
    );

  return `${date.getFullYear()}-${String(
    date.getMonth() +
      1
  ).padStart(
    2,
    "0"
  )}`;
};

const parseMonthKey = (
  value
) => {
  const match =
    String(
      value || ""
    ).match(
      /^(\d{4})-(0[1-9]|1[0-2])$/
    );

  if (!match) {
    return new Date();
  }

  return new Date(
    Number(
      match[1]
    ),
    Number(
      match[2]
    ) -
      1,
    1
  );
};

const shiftMonth = (
  monthKey,
  amount
) => {
  const date =
    parseMonthKey(
      monthKey
    );

  date.setMonth(
    date.getMonth() +
      amount
  );

  return getMonthKey(
    date
  );
};

const formatMonthLabel = (
  monthKey
) => {
  return parseMonthKey(
    monthKey
  ).toLocaleDateString(
    "en-PK",
    {
      month:
        "long",

      year:
        "numeric"
    }
  );
};

const formatDate = (
  value
) => {
  if (!value) {
    return "Not available";
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
    return "Not available";
  }

  return date.toLocaleDateString(
    "en-PK",
    {
      weekday:
        "short",

      day:
        "numeric",

      month:
        "short",

      year:
        "numeric"
    }
  );
};

const formatDateKey = (
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

  return date
    .toISOString()
    .slice(
      0,
      10
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

const roundNumber = (
  value,
  precision = 1
) => {
  const multiplier =
    10 ** precision;

  return (
    Math.round(
      Number(
        value || 0
      ) *
        multiplier
    ) /
    multiplier
  );
};

const getRiskStyle = (
  level
) => {
  if (
    level ===
    "critical"
  ) {
    return {
      wrapper:
        "border-rose-200 bg-rose-50",

      icon:
        "bg-rose-100 text-rose-700",

      title:
        "text-rose-900",

      text:
        "text-rose-700",

      badge:
        "bg-rose-100 text-rose-700 ring-rose-200",

      progress:
        "bg-rose-500"
    };
  }

  if (
    level ===
    "warning"
  ) {
    return {
      wrapper:
        "border-amber-200 bg-amber-50",

      icon:
        "bg-amber-100 text-amber-700",

      title:
        "text-amber-900",

      text:
        "text-amber-700",

      badge:
        "bg-amber-100 text-amber-700 ring-amber-200",

      progress:
        "bg-amber-500"
    };
  }

  if (
    level ===
    "good"
  ) {
    return {
      wrapper:
        "border-emerald-200 bg-emerald-50",

      icon:
        "bg-emerald-100 text-emerald-700",

      title:
        "text-emerald-900",

      text:
        "text-emerald-700",

      badge:
        "bg-emerald-100 text-emerald-700 ring-emerald-200",

      progress:
        "bg-emerald-500"
    };
  }

  return {
    wrapper:
      "border-slate-200 bg-slate-50",

    icon:
      "bg-slate-100 text-slate-600",

    title:
      "text-slate-900",

    text:
      "text-slate-600",

    badge:
      "bg-slate-100 text-slate-700 ring-slate-200",

    progress:
      "bg-slate-400"
  };
};

const escapeCsv = (
  value
) => {
  const text =
    String(
      value ?? ""
    );

  return `"${text.replaceAll(
    '"',
    '""'
  )}"`;
};

/*
|--------------------------------------------------------------------------
| Attendance Analytics
|--------------------------------------------------------------------------
*/

const calculateStreaks = (
  records
) => {
  const ordered =
    [
      ...records
    ].sort(
      (
        first,
        second
      ) =>
        new Date(
          first.attendanceDate
        ) -
        new Date(
          second.attendanceDate
        )
    );

  let currentStreak =
    0;

  let longestStreak =
    0;

  let runningStreak =
    0;

  ordered.forEach(
    (
      record
    ) => {
      const attended =
        [
          "present",
          "late"
        ].includes(
          record.status
        );

      if (
        attended
      ) {
        runningStreak +=
          1;

        longestStreak =
          Math.max(
            longestStreak,
            runningStreak
          );
      } else {
        runningStreak =
          0;
      }
    }
  );

  for (
    let index =
      ordered.length -
      1;
    index >=
    0;
    index -=
      1
  ) {
    if (
      [
        "present",
        "late"
      ].includes(
        ordered[
          index
        ].status
      )
    ) {
      currentStreak +=
        1;
    } else {
      break;
    }
  }

  return {
    currentStreak,
    longestStreak
  };
};

const buildWeeklyBreakdown = (
  records
) => {
  const weeks = [
    {
      label:
        "Week 1",

      start:
        1,

      end:
        7
    },

    {
      label:
        "Week 2",

      start:
        8,

      end:
        14
    },

    {
      label:
        "Week 3",

      start:
        15,

      end:
        21
    },

    {
      label:
        "Week 4",

      start:
        22,

      end:
        28
    },

    {
      label:
        "Week 5",

      start:
        29,

      end:
        31
    }
  ];

  return weeks.map(
    (
      week
    ) => {
      const weekRecords =
        records.filter(
          (
            record
          ) => {
            const day =
              new Date(
                record.attendanceDate
              ).getUTCDate();

            return (
              day >=
                week.start &&
              day <=
                week.end
            );
          }
        );

      const attended =
        weekRecords.filter(
          (
            record
          ) =>
            [
              "present",
              "late"
            ].includes(
              record.status
            )
        ).length;

      const percentage =
        weekRecords.length >
        0
          ? roundNumber(
              (
                attended /
                weekRecords.length
              ) *
                100,
              0
            )
          : 0;

      return {
        ...week,
        total:
          weekRecords.length,
        attended,
        percentage
      };
    }
  );
};

const buildCalendarCells = (
  monthKey,
  records
) => {
  const monthDate =
    parseMonthKey(
      monthKey
    );

  const year =
    monthDate.getFullYear();

  const month =
    monthDate.getMonth();

  const totalDays =
    new Date(
      year,
      month +
        1,
      0
    ).getDate();

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const mondayFirstOffset =
    (
      firstDay +
      6
    ) %
    7;

  const recordMap =
    new Map(
      records.map(
        (
          record
        ) => [
          formatDateKey(
            record.attendanceDate
          ),
          record
        ]
      )
    );

  const cells = [];

  for (
    let index =
      0;
    index <
    mondayFirstOffset;
    index +=
      1
  ) {
    cells.push(
      {
        type:
          "empty",

        key:
          `leading-${index}`
      }
    );
  }

  for (
    let day =
      1;
    day <=
    totalDays;
    day +=
      1
  ) {
    const dateKey =
      `${year}-${String(
        month +
          1
      ).padStart(
        2,
        "0"
      )}-${String(
        day
      ).padStart(
        2,
        "0"
      )}`;

    const date =
      new Date(
        year,
        month,
        day
      );

    const record =
      recordMap.get(
        dateKey
      ) ||
      null;

    cells.push({
      type:
        "day",

      key:
        dateKey,

      dateKey,
      day,
      date,
      record,

      isToday:
        dateKey ===
        getMonthKey(
          new Date()
        ) +
          `-${String(
            new Date().getDate()
          ).padStart(
            2,
            "0"
          )}`,

      isWeekend:
        [
          0,
          6
        ].includes(
          date.getDay()
        )
    });
  }

  while (
    cells.length %
      7 !==
    0
  ) {
    cells.push({
      type:
        "empty",

      key:
        `trailing-${cells.length}`
    });
  }

  return cells;
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

const SummaryCard = ({
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

      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.icon}`}
        >
          <Icon
            size={20}
          />
        </div>

        <span
          className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ring-1 ${tone.badge}`}
        >
          {label}
        </span>
      </div>

      <p className="mt-4 text-2xl font-black tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {helper}
      </p>
    </article>
  );
};

const StatusBadge = ({
  status
}) => {
  const config =
    STATUS_CONFIG[
      status
    ] ||
    {
      label:
        status ||
        "Unknown",

      icon:
        Info,

      badge:
        "bg-slate-100 text-slate-700 ring-slate-200"
    };

  const Icon =
    config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${config.badge}`}
    >
      <Icon
        size={12}
      />

      {config.label}
    </span>
  );
};

const AttendanceLoadingState =
  () => {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-36 rounded-3xl bg-slate-200" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({
            length:
              5
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

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="h-[540px] rounded-3xl bg-slate-200" />
          <div className="h-[540px] rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  };

/*
|--------------------------------------------------------------------------
| Attendance Calendar
|--------------------------------------------------------------------------
*/

const AttendanceCalendar = ({
  monthKey,
  records
}) => {
  const calendarCells =
    useMemo(
      () =>
        buildCalendarCells(
          monthKey,
          records
        ),
      [
        monthKey,
        records
      ]
    );

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_DAYS.map(
          (
            day
          ) => (
            <div
              key={
                day
              }
              className="py-2 text-center text-[9px] font-bold uppercase tracking-wide text-slate-400"
            >
              {day}
            </div>
          )
        )}

        {calendarCells.map(
          (
            cell
          ) => {
            if (
              cell.type ===
              "empty"
            ) {
              return (
                <div
                  key={
                    cell.key
                  }
                  className="aspect-square rounded-xl bg-slate-50/40"
                />
              );
            }

            const status =
              cell.record
                ?.status;

            const config =
              STATUS_CONFIG[
                status
              ];

            return (
              <div
                key={
                  cell.key
                }
                title={
                  cell.record
                    ? `${formatDate(
                        cell.record
                          .attendanceDate
                      )}: ${
                        config?.label ||
                        status
                      }${
                        cell.record
                          .remarks
                          ? ` — ${cell.record.remarks}`
                          : ""
                      }`
                    : cell.isWeekend
                      ? "Weekend / no attendance record"
                      : "No attendance record"
                }
                className={`relative aspect-square rounded-xl border p-1.5 transition sm:p-2 ${
                  config
                    ? config.calendar
                    : cell.isWeekend
                      ? "border-slate-100 bg-slate-100/70 text-slate-400"
                      : "border-slate-100 bg-white text-slate-500"
                } ${
                  cell.isToday
                    ? "ring-2 ring-brand-400 ring-offset-1"
                    : ""
                }`}
              >
                <span className="text-[10px] font-bold sm:text-xs">
                  {cell.day}
                </span>

                {config && (
                  <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-center sm:inset-x-2 sm:bottom-2">
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[8px] font-black text-white ${config.dot}`}
                    >
                      {config.shortLabel}
                    </span>
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {Object.entries(
          STATUS_CONFIG
        ).map(
          ([
            status,
            config
          ]) => (
            <div
              key={
                status
              }
              className="flex items-center gap-2 text-[10px] font-semibold text-slate-500"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${config.dot}`}
              />

              {config.label}
            </div>
          )
        )}

        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />

          No record
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Student Attendance Page
|--------------------------------------------------------------------------
*/

const StudentAttendance =
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
      selectedMonth,
      setSelectedMonth
    ] = useState(
      getMonthKey()
    );

    const [
      attendanceData,
      setAttendanceData
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

    /*
    |--------------------------------------------------------------------------
    | Load Attendance
    |--------------------------------------------------------------------------
    */

    const loadAttendance =
      useCallback(
        async ({
          silent = false,
          month =
            selectedMonth
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
              await getStudentPortalAttendance(
                {
                  month,
                  page:
                    1,
                  limit:
                    40
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

            setAttendanceData(
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
        [
          selectedMonth
        ]
      );

    useEffect(() => {
      loadAttendance({
        month:
          selectedMonth
      });

      return () => {
        requestControllerRef
          .current
          ?.abort();
      };
    }, [
      selectedMonth,
      loadAttendance
    ]);

    /*
    |--------------------------------------------------------------------------
    | Derived Data
    |--------------------------------------------------------------------------
    */

    const student =
      attendanceData
        ?.student ||
      overviewStudent ||
      null;

    const summary =
      attendanceData
        ?.summary ||
      {
        total:
          0,

        present:
          0,

        absent:
          0,

        late:
          0,

        leave:
          0,

        attendancePercentage:
          0,

        presentPercentage:
          0,

        risk: {
          level:
            "unknown",

          label:
            "No attendance data",

          message:
            "Attendance will be analysed after records are marked."
        }
      };

    const records =
      Array.isArray(
        attendanceData
          ?.records
      )
        ? attendanceData.records
        : [];

    const sortedRecords =
      useMemo(
        () =>
          [
            ...records
          ].sort(
            (
              first,
              second
            ) =>
              new Date(
                second
                  .attendanceDate
              ) -
              new Date(
                first
                  .attendanceDate
              )
          ),
        [
          records
        ]
      );

    const streaks =
      useMemo(
        () =>
          calculateStreaks(
            records
          ),
        [
          records
        ]
      );

    const weeklyBreakdown =
      useMemo(
        () =>
          buildWeeklyBreakdown(
            records
          ),
        [
          records
        ]
      );

    const riskStyle =
      getRiskStyle(
        summary?.risk
          ?.level
      );

    const attendancePercentage =
      Number(
        summary
          ?.attendancePercentage ||
        0
      );

    const presentPercentage =
      Number(
        summary
          ?.presentPercentage ||
        0
      );

    const attendedCount =
      Number(
        attendanceData
          ?.trend
          ?.attendedCount ??
        Number(
          summary?.present ||
          0
        ) +
          Number(
            summary?.late ||
            0
          )
      );

    const missedCount =
      Number(
        attendanceData
          ?.trend
          ?.missedCount ??
        Number(
          summary?.absent ||
          0
        ) +
          Number(
            summary?.leave ||
            0
          )
      );

    const total =
      Number(
        summary?.total ||
        0
      );

    const latestRecord =
      sortedRecords[0] ||
      null;

    const latestAbsence =
      sortedRecords.find(
        (
          record
        ) =>
          record.status ===
          "absent"
      ) ||
      null;

    const latestLeave =
      sortedRecords.find(
        (
          record
        ) =>
          record.status ===
          "leave"
      ) ||
      null;

    const isCurrentMonth =
      selectedMonth ===
      getMonthKey();

    const summaryCards = [
      {
        key:
          "total",

        icon:
          CalendarDays,

        label:
          "Marked Days",

        value:
          total,

        helper:
          `Attendance records in ${formatMonthLabel(
            selectedMonth
          )}`,

        tone: {
          icon:
            "bg-brand-50 text-brand-700",

          badge:
            "bg-brand-50 text-brand-700 ring-brand-200",

          bar:
            "bg-gradient-to-r from-brand-500 to-cyan-500"
        }
      },

      {
        key:
          "present",

        icon:
          UserCheck,

        label:
          "Present",

        value:
          Number(
            summary?.present ||
            0
          ),

        helper:
          `${roundNumber(
            presentPercentage
          )}% marked strictly present`,

        tone: {
          icon:
            "bg-emerald-50 text-emerald-700",

          badge:
            "bg-emerald-50 text-emerald-700 ring-emerald-200",

          bar:
            "bg-emerald-500"
        }
      },

      {
        key:
          "absent",

        icon:
          UserMinus,

        label:
          "Absent",

        value:
          Number(
            summary?.absent ||
            0
          ),

        helper:
          latestAbsence
            ? `Latest: ${formatDate(
                latestAbsence
                  .attendanceDate
              )}`
            : "No absence recorded",

        tone: {
          icon:
            "bg-rose-50 text-rose-700",

          badge:
            "bg-rose-50 text-rose-700 ring-rose-200",

          bar:
            "bg-rose-500"
        }
      },

      {
        key:
          "late",

        icon:
          Clock3,

        label:
          "Late",

        value:
          Number(
            summary?.late ||
            0
          ),

        helper:
          "Late records count as attended",

        tone: {
          icon:
            "bg-amber-50 text-amber-700",

          badge:
            "bg-amber-50 text-amber-700 ring-amber-200",

          bar:
            "bg-amber-500"
        }
      },

      {
        key:
          "leave",

        icon:
          MinusCircle,

        label:
          "Leave",

        value:
          Number(
            summary?.leave ||
            0
          ),

        helper:
          latestLeave
            ? `Latest: ${formatDate(
                latestLeave
                  .attendanceDate
              )}`
            : "No leave recorded",

        tone: {
          icon:
            "bg-sky-50 text-sky-700",

          badge:
            "bg-sky-50 text-sky-700 ring-sky-200",

          bar:
            "bg-sky-500"
        }
      }
    ];

    /*
    |--------------------------------------------------------------------------
    | Actions
    |--------------------------------------------------------------------------
    */

    const handlePreviousMonth =
      () => {
        setSelectedMonth(
          (
            current
          ) =>
            shiftMonth(
              current,
              -1
            )
        );
      };

    const handleNextMonth =
      () => {
        if (
          isCurrentMonth
        ) {
          return;
        }

        setSelectedMonth(
          (
            current
          ) =>
            shiftMonth(
              current,
              1
            )
        );
      };

    const handleCurrentMonth =
      () => {
        setSelectedMonth(
          getMonthKey()
        );
      };

    const handleRefresh =
      async () => {
        await Promise.all([
          loadAttendance({
            silent:
              true
          }),

          refreshPortal?.()
        ]);
      };

    const handleCorrectionRequest =
      (
        record = null
      ) => {
        const recordText =
          record
            ? `Attendance date: ${formatDate(
                record.attendanceDate
              )}. Current status: ${
                STATUS_CONFIG[
                  record.status
                ]?.label ||
                record.status
              }.`
            : `Attendance month: ${formatMonthLabel(
                selectedMonth
              )}.`;

        navigate(
          "/student-portal/messages",
          {
            state: {
              compose: {
                subject:
                  "Attendance record review request",

                category:
                  "attendance",

                priority:
                  "normal",

                text:
                  `I would like the school to review my attendance record. ${recordText}`
              }
            }
          }
        );
      };

    const handleExportCsv =
      () => {
        if (
          records.length ===
          0
        ) {
          return;
        }

        const rows = [
          [
            "Date",
            "Status",
            "Remarks",
            "Class",
            "Section"
          ],

          ...sortedRecords.map(
            (
              record
            ) => [
              formatDate(
                record.attendanceDate
              ),

              STATUS_CONFIG[
                record.status
              ]?.label ||
                record.status,

              record.remarks ||
                "",

              record.class
                ?.className ||
                "",

              record.sectionName ||
                student
                  ?.sectionName ||
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
                    escapeCsv
                  )
                  .join(
                    ","
                  )
            )
            .join(
              "\n"
            );

        const blob =
          new Blob(
            [
              "\uFEFF",
              csv
            ],
            {
              type:
                "text/csv;charset=utf-8"
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
          `attendance-${student?.admissionNumber || "student"}-${selectedMonth}.csv`;

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

    const handlePrint =
      () => {
        window.print();
      };

    /*
    |--------------------------------------------------------------------------
    | Loading and Failure
    |--------------------------------------------------------------------------
    */

    if (
      loading &&
      !attendanceData
    ) {
      return (
        <AttendanceLoadingState />
      );
    }

    if (
      !attendanceData &&
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
              Attendance could not be loaded
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {error}
            </p>

            <button
              type="button"
              className="btn-primary mt-5"
              onClick={() =>
                loadAttendance()
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

              #student-attendance-report,
              #student-attendance-report * {
                visibility: visible !important;
              }

              #student-attendance-report {
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                background: white !important;
                padding: 24px !important;
              }

              .attendance-print-hidden {
                display: none !important;
              }

              .attendance-print-break {
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
          id="student-attendance-report"
          className="space-y-6"
        >
          {/*
          |--------------------------------------------------------------------------
          | Error Banner
          |--------------------------------------------------------------------------
          */}

          {error && (
            <div className="attendance-print-hidden flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-rose-800">
                  Attendance could not refresh
                </p>

                <p className="mt-1 text-xs text-rose-600">
                  {error}
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-100"
                onClick={() =>
                  loadAttendance({
                    silent:
                      true
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
          | Header and Month Controls
          |--------------------------------------------------------------------------
          */}

          <section className="attendance-print-break relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-7">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-white/10">
                    <CalendarCheck2
                      size={13}
                    />

                    Attendance Intelligence
                  </span>

                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${riskStyle.badge}`}
                  >
                    {summary
                      ?.risk
                      ?.label ||
                      "No attendance data"}
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
                  {student?.name ||
                    "Student"}
                </h2>

                <p className="mt-2 text-sm font-semibold text-slate-300">
                  {formatClassName(
                    student
                  )}{" "}
                  ·{" "}
                  {student
                    ?.admissionNumber ||
                    "Admission number pending"}
                </p>

                <p className="mt-3 max-w-2xl text-xs leading-6 text-slate-400">
                  Review your attendance record, monthly patterns and risk status. Official corrections must be requested from the school.
                </p>
              </div>

              <div className="attendance-print-hidden flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur sm:min-w-[390px]">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="rounded-xl bg-white/10 p-2.5 text-white ring-1 ring-white/10 transition hover:bg-white/15"
                    onClick={
                      handlePreviousMonth
                    }
                    aria-label="Previous month"
                    title="Previous month"
                  >
                    <ChevronLeft
                      size={18}
                    />
                  </button>

                  <div className="min-w-0 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Viewing Month
                    </p>

                    <p className="mt-1 truncate text-sm font-black text-white">
                      {formatMonthLabel(
                        selectedMonth
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="rounded-xl bg-white/10 p-2.5 text-white ring-1 ring-white/10 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
                    onClick={
                      handleNextMonth
                    }
                    disabled={
                      isCurrentMonth
                    }
                    aria-label="Next month"
                    title="Next month"
                  >
                    <ChevronRight
                      size={18}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    type="month"
                    value={
                      selectedMonth
                    }
                    max={
                      getMonthKey()
                    }
                    onChange={(
                      event
                    ) =>
                      setSelectedMonth(
                        event.target
                          .value ||
                          getMonthKey()
                      )
                    }
                    className="h-11 min-w-0 rounded-xl border border-white/10 bg-white/10 px-3 text-xs font-bold text-white outline-none [color-scheme:dark] focus:border-brand-300 focus:ring-4 focus:ring-brand-400/10"
                  />

                  <button
                    type="button"
                    className="rounded-xl bg-white px-3 text-xs font-bold text-slate-950 transition hover:bg-brand-50"
                    onClick={
                      handleCurrentMonth
                    }
                  >
                    Current
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Summary Cards
          |--------------------------------------------------------------------------
          */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map(
              (
                card
              ) => (
                <SummaryCard
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
          | Attendance Health
          |--------------------------------------------------------------------------
          */}

          <section
            className={`attendance-print-break rounded-3xl border p-5 shadow-sm sm:p-6 ${riskStyle.wrapper}`}
          >
            <div className="grid gap-6 lg:grid-cols-[190px_1fr] lg:items-center">
              <div className="text-center">
                <div
                  className="mx-auto grid h-36 w-36 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(${
                      summary?.risk?.level ===
                      "critical"
                        ? "rgb(244 63 94)"
                        : summary?.risk?.level ===
                            "warning"
                          ? "rgb(245 158 11)"
                          : summary?.risk?.level ===
                              "good"
                            ? "rgb(16 185 129)"
                            : "rgb(148 163 184)"
                    } ${Math.min(
                      Math.max(
                        attendancePercentage,
                        0
                      ),
                      100
                    )}%, rgb(226 232 240) 0)`
                  }}
                >
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-white">
                    <div>
                      <p className="text-3xl font-black text-slate-900">
                        {roundNumber(
                          attendancePercentage
                        )}%
                      </p>

                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Attended
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${riskStyle.icon}`}
                  >
                    {summary
                      ?.risk
                      ?.level ===
                    "good" ? (
                      <CheckCircle2
                        size={20}
                      />
                    ) : (
                      <ShieldAlert
                        size={20}
                      />
                    )}
                  </div>

                  <div>
                    <h3
                      className={`text-lg font-black ${riskStyle.title}`}
                    >
                      {summary
                        ?.risk
                        ?.label ||
                        "Attendance status"}
                    </h3>

                    <p
                      className={`mt-1 text-xs leading-5 ${riskStyle.text}`}
                    >
                      {summary
                        ?.risk
                        ?.message ||
                        "Attendance analysis will appear after records are marked."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-black/5">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      Attended Days
                    </p>

                    <p className="mt-2 text-xl font-black text-slate-900">
                      {attendedCount}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-500">
                      Present + late
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-black/5">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      Missed Days
                    </p>

                    <p className="mt-2 text-xl font-black text-slate-900">
                      {missedCount}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-500">
                      Absent + leave
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-black/5">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      Current Streak
                    </p>

                    <p className="mt-2 text-xl font-black text-slate-900">
                      {streaks.currentStreak}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-500">
                      Consecutive attended records
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <span>
                      Monthly attendance health
                    </span>

                    <span>
                      {roundNumber(
                        attendancePercentage
                      )}%
                    </span>
                  </div>

                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${riskStyle.progress}`}
                      style={{
                        width: `${Math.min(
                          Math.max(
                            attendancePercentage,
                            0
                          ),
                          100
                        )}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Calendar and Insights
          |--------------------------------------------------------------------------
          */}

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <section className="attendance-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={
                  CalendarDays
                }
                title={`${formatMonthLabel(
                  selectedMonth
                )} Calendar`}
                subtitle="Each marked school day is shown by its attendance status."
              />

              <div className="mt-5">
                <AttendanceCalendar
                  monthKey={
                    selectedMonth
                  }
                  records={
                    records
                  }
                />
              </div>
            </section>

            <aside className="space-y-6">
              {/*
              |--------------------------------------------------------------------------
              | Weekly Pattern
              |--------------------------------------------------------------------------
              */}

              <section className="attendance-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader
                  icon={
                    BarChart3
                  }
                  title="Weekly Pattern"
                  subtitle="Attendance rate across the visible month."
                />

                <div className="mt-5 space-y-4">
                  {weeklyBreakdown.map(
                    (
                      week
                    ) => (
                      <div
                        key={
                          week.label
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-700">
                              {week.label}
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {week.total >
                              0
                                ? `${week.attended} of ${week.total} attended`
                                : "No marked records"}
                            </p>
                          </div>

                          <span className="text-xs font-black text-slate-800">
                            {week.total >
                            0
                              ? `${week.percentage}%`
                              : "—"}
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${
                              week.percentage >=
                              85
                                ? "bg-emerald-500"
                                : week.percentage >=
                                    75
                                  ? "bg-amber-500"
                                  : week.total >
                                      0
                                    ? "bg-rose-500"
                                    : "bg-slate-200"
                            }`}
                            style={{
                              width: `${week.percentage}%`
                            }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Attendance Insights
              |--------------------------------------------------------------------------
              */}

              <section className="attendance-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader
                  icon={
                    Sparkles
                  }
                  title="Attendance Insights"
                  subtitle="Simple insights calculated from the loaded monthly records."
                />

                <div className="mt-5 space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <TrendingUp
                        size={16}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Longest attendance streak
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        {streaks.longestStreak} consecutive attended record{streaks.longestStreak ===
                        1
                          ? ""
                          : "s"} this month.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <UserRoundCheck
                        size={16}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Latest marked status
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        {latestRecord
                          ? `${STATUS_CONFIG[latestRecord.status]?.label || latestRecord.status} on ${formatDate(
                              latestRecord.attendanceDate
                            )}.`
                          : "No attendance has been marked for this month."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                      <Lightbulb
                        size={16}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Attendance calculation
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        Present and late records count as attended. Leave and absence count as missed in the portal percentage.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Review Request
              |--------------------------------------------------------------------------
              */}

              <section className="attendance-print-hidden rounded-3xl border border-sky-200 bg-sky-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <MessageCircle
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-sky-900">
                      Found an incorrect record?
                    </p>

                    <p className="mt-2 text-xs leading-6 text-sky-700">
                      Attendance is an official school record. Send a review request with the relevant date instead of editing it directly.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-sky-800 shadow-sm ring-1 ring-sky-200 transition hover:bg-sky-100"
                  onClick={() =>
                    handleCorrectionRequest()
                  }
                >
                  Request Attendance Review

                  <ArrowRight
                    size={14}
                  />
                </button>
              </section>
            </aside>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Detailed Attendance History
          |--------------------------------------------------------------------------
          */}

          <section className="attendance-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <SectionHeader
                icon={
                  FileSpreadsheet
                }
                title="Detailed Attendance History"
                subtitle={`${records.length} attendance record${
                  records.length ===
                  1
                    ? ""
                    : "s"
                } loaded for ${formatMonthLabel(
                  selectedMonth
                )}.`}
              />

              <div className="attendance-print-hidden flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={
                    handleExportCsv
                  }
                  disabled={
                    records.length ===
                    0
                  }
                >
                  <Download
                    size={14}
                  />

                  Export CSV
                </button>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                  onClick={
                    handlePrint
                  }
                >
                  <Printer
                    size={14}
                  />

                  Print Report
                </button>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
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

            <div className="mt-5">
              {sortedRecords.length >
              0 ? (
                <>
                  {/*
                  |--------------------------------------------------------------------------
                  | Desktop Table
                  |--------------------------------------------------------------------------
                  */}

                  <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Date
                            </th>

                            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Status
                            </th>

                            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Class
                            </th>

                            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Remarks
                            </th>

                            <th className="attendance-print-hidden px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                          {sortedRecords.map(
                            (
                              record
                            ) => (
                              <tr
                                key={`${record.id}-${formatDateKey(
                                  record.attendanceDate
                                )}`}
                                className="transition hover:bg-slate-50"
                              >
                                <td className="whitespace-nowrap px-4 py-3.5">
                                  <p className="text-xs font-bold text-slate-800">
                                    {formatDate(
                                      record.attendanceDate
                                    )}
                                  </p>
                                </td>

                                <td className="whitespace-nowrap px-4 py-3.5">
                                  <StatusBadge
                                    status={
                                      record.status
                                    }
                                  />
                                </td>

                                <td className="whitespace-nowrap px-4 py-3.5">
                                  <p className="text-xs font-semibold text-slate-700">
                                    {record.class
                                      ?.className ||
                                      student?.class
                                        ?.className ||
                                      "Class"}
                                  </p>

                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    Section{" "}
                                    {record.sectionName ||
                                      student?.sectionName ||
                                      "—"}
                                  </p>
                                </td>

                                <td className="max-w-sm px-4 py-3.5">
                                  <p className="text-xs leading-5 text-slate-500">
                                    {record.remarks ||
                                      "No remarks"}
                                  </p>
                                </td>

                                <td className="attendance-print-hidden whitespace-nowrap px-4 py-3.5 text-right">
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-brand-700 transition hover:bg-brand-50"
                                    onClick={() =>
                                      handleCorrectionRequest(
                                        record
                                      )
                                    }
                                  >
                                    Review

                                    <ArrowRight
                                      size={11}
                                    />
                                  </button>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/*
                  |--------------------------------------------------------------------------
                  | Mobile Cards
                  |--------------------------------------------------------------------------
                  */}

                  <div className="space-y-3 md:hidden">
                    {sortedRecords.map(
                      (
                        record
                      ) => (
                        <article
                          key={`${record.id}-${formatDateKey(
                            record.attendanceDate
                          )}-mobile`}
                          className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {formatDate(
                                  record.attendanceDate
                                )}
                              </p>

                              <p className="mt-1 text-[11px] text-slate-400">
                                {record.class
                                  ?.className ||
                                  student?.class
                                    ?.className ||
                                  "Class"}{" "}
                                · Section{" "}
                                {record.sectionName ||
                                  student?.sectionName ||
                                  "—"}
                              </p>
                            </div>

                            <StatusBadge
                              status={
                                record.status
                              }
                            />
                          </div>

                          {record.remarks && (
                            <div className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-slate-500 ring-1 ring-slate-200">
                              {record.remarks}
                            </div>
                          )}

                          <button
                            type="button"
                            className="attendance-print-hidden mt-3 inline-flex items-center gap-2 text-xs font-bold text-brand-700"
                            onClick={() =>
                              handleCorrectionRequest(
                                record
                              )
                            }
                          >
                            Request Review

                            <ArrowRight
                              size={13}
                            />
                          </button>
                        </article>
                      )
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                  <CalendarCheck2
                    size={28}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-4 text-sm font-bold text-slate-700">
                    No attendance records found
                  </p>

                  <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                    The school has not marked attendance for this student in {formatMonthLabel(
                      selectedMonth
                    )}.
                  </p>

                  {!isCurrentMonth && (
                    <button
                      type="button"
                      className="attendance-print-hidden mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-brand-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-brand-50"
                      onClick={
                        handleCurrentMonth
                      }
                    >
                      <ArrowLeft
                        size={14}
                      />

                      Return to Current Month
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Footer Note
          |--------------------------------------------------------------------------
          */}

          <section className="attendance-print-break flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Info
                  size={17}
                />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900">
                  Official attendance information
                </p>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                  Attendance shown here is read-only and comes directly from the school’s attendance register. Contact the school through Messages when a record requires review.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="attendance-print-hidden inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              onClick={() =>
                handleCorrectionRequest()
              }
            >
              <MessageCircle
                size={14}
              />

              Contact School
            </button>
          </section>
        </div>
      </>
    );
  };

export default StudentAttendance;
