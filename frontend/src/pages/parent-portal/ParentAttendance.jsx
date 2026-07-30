import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash2,
  Clock3,
  Download,
  Info,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound
} from "lucide-react";

import {
  useNavigate,
  useOutletContext
} from "react-router-dom";

import {
  getParentChildAttendance
} from "../../api/parentPortal";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const DAYS_OF_WEEK = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat"
];

const STATUS_OPTIONS = [
  {
    value:
      "all",

    label:
      "All Records"
  },

  {
    value:
      "present",

    label:
      "Present"
  },

  {
    value:
      "absent",

    label:
      "Absent"
  },

  {
    value:
      "leave",

    label:
      "Leave"
  }
];

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

const padNumber = (
  value
) => {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
};

const getCurrentMonthValue =
  () => {
    const today =
      new Date();

    return `${today.getFullYear()}-${padNumber(
      today.getMonth() + 1
    )}`;
  };

const monthValueToDate = (
  monthValue
) => {
  const [
    year,
    month
  ] = String(
    monthValue || ""
  )
    .split("-")
    .map(Number);

  if (
    !year ||
    !month
  ) {
    return new Date();
  }

  return new Date(
    year,
    month - 1,
    1
  );
};

const moveMonth = (
  monthValue,
  amount
) => {
  const date =
    monthValueToDate(
      monthValue
    );

  date.setMonth(
    date.getMonth() +
      amount
  );

  return `${date.getFullYear()}-${padNumber(
    date.getMonth() + 1
  )}`;
};

const formatMonthLabel = (
  monthValue
) => {
  return new Intl.DateTimeFormat(
    "en-PK",
    {
      month:
        "long",

      year:
        "numeric"
    }
  ).format(
    monthValueToDate(
      monthValue
    )
  );
};

const toLocalDateKey = (
  value
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return `${date.getFullYear()}-${padNumber(
    date.getMonth() + 1
  )}-${padNumber(
    date.getDate()
  )}`;
};

const formatRecordDate = (
  value
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      weekday:
        "short",

      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric"
    }
  ).format(date);
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
    "Unable to load attendance records."
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
      (part) =>
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

const getAttendanceTone = (
  percentage
) => {
  const value =
    Number(
      percentage || 0
    );

  if (
    value >= 90
  ) {
    return {
      label:
        "Excellent",

      text:
        "text-emerald-700",

      background:
        "bg-emerald-50",

      border:
        "border-emerald-200",

      bar:
        "bg-emerald-500"
    };
  }

  if (
    value >= 75
  ) {
    return {
      label:
        "Good",

      text:
        "text-amber-700",

      background:
        "bg-amber-50",

      border:
        "border-amber-200",

      bar:
        "bg-amber-500"
    };
  }

  return {
    label:
      "Needs Attention",

    text:
      "text-rose-700",

    background:
      "bg-rose-50",

    border:
      "border-rose-200",

    bar:
      "bg-rose-500"
  };
};

const getStatusStyle = (
  status
) => {
  switch (
    String(
      status || ""
    ).toLowerCase()
  ) {
    case "present":
      return {
        label:
          "Present",

        icon:
          CheckCircle2,

        badge:
          "bg-emerald-50 text-emerald-700 ring-emerald-200",

        dot:
          "bg-emerald-500",

        calendar:
          "border-emerald-200 bg-emerald-50 text-emerald-800"
      };

    case "absent":
      return {
        label:
          "Absent",

        icon:
          CircleSlash2,

        badge:
          "bg-rose-50 text-rose-700 ring-rose-200",

        dot:
          "bg-rose-500",

        calendar:
          "border-rose-200 bg-rose-50 text-rose-800"
      };

    case "leave":
      return {
        label:
          "Leave",

        icon:
          Clock3,

        badge:
          "bg-amber-50 text-amber-700 ring-amber-200",

        dot:
          "bg-amber-500",

        calendar:
          "border-amber-200 bg-amber-50 text-amber-800"
      };

    default:
      return {
        label:
          "No Record",

        icon:
          Info,

        badge:
          "bg-slate-100 text-slate-600 ring-slate-200",

        dot:
          "bg-slate-300",

        calendar:
          "border-slate-200 bg-white text-slate-500"
      };
  }
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
  tone
}) => {
  const tones = {
    brand:
      "bg-brand-50 text-brand-700",

    emerald:
      "bg-emerald-50 text-emerald-700",

    rose:
      "bg-rose-50 text-rose-700",

    amber:
      "bg-amber-50 text-amber-700"
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
| Month Calendar
|--------------------------------------------------------------------------
*/

const AttendanceCalendar = ({
  monthValue,
  records
}) => {
  const calendarDays =
    useMemo(
      () => {
        const monthDate =
          monthValueToDate(
            monthValue
          );

        const year =
          monthDate.getFullYear();

        const month =
          monthDate.getMonth();

        const firstDay =
          new Date(
            year,
            month,
            1
          ).getDay();

        const daysInMonth =
          new Date(
            year,
            month + 1,
            0
          ).getDate();

        const recordMap =
          new Map(
            records.map(
              (
                record
              ) => [
                toLocalDateKey(
                  record
                    .attendanceDate
                ),
                record
              ]
            )
          );

        const cells = [];

        for (
          let index = 0;
          index < firstDay;
          index += 1
        ) {
          cells.push({
            key:
              `empty-start-${index}`,

            empty:
              true
          });
        }

        for (
          let day = 1;
          day <= daysInMonth;
          day += 1
        ) {
          const key =
            `${year}-${padNumber(
              month + 1
            )}-${padNumber(
              day
            )}`;

          cells.push({
            key,
            day,
            record:
              recordMap.get(
                key
              ) ||
              null
          });
        }

        while (
          cells.length %
            7 !==
          0
        ) {
          cells.push({
            key:
              `empty-end-${cells.length}`,

            empty:
              true
          });
        }

        return cells;
      },
      [
        monthValue,
        records
      ]
    );

  const todayKey =
    toLocalDateKey(
      new Date()
    );

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {DAYS_OF_WEEK.map(
          (
            day
          ) => (
            <div
              key={
                day
              }
              className="px-1 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-xs"
            >
              {day}
            </div>
          )
        )}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map(
          (
            item
          ) => {
            if (
              item.empty
            ) {
              return (
                <div
                  key={
                    item.key
                  }
                  className="min-h-[76px] border-b border-r border-slate-100 bg-slate-50/40 sm:min-h-[100px]"
                />
              );
            }

            const statusStyle =
              getStatusStyle(
                item.record
                  ?.status
              );

            const isToday =
              item.key ===
              todayKey;

            return (
              <div
                key={
                  item.key
                }
                className={`min-h-[76px] border-b border-r border-slate-100 p-1.5 sm:min-h-[100px] sm:p-2 ${
                  item.record
                    ? statusStyle
                        .calendar
                    : "bg-white"
                }`}
                title={
                  item.record
                    ? `${statusStyle.label}${
                        item.record
                          .remarks
                          ? `: ${item.record.remarks}`
                          : ""
                      }`
                    : "No attendance record"
                }
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold sm:h-7 sm:w-7 sm:text-xs ${
                      isToday
                        ? "bg-slate-950 text-white"
                        : "text-slate-700"
                    }`}
                  >
                    {item.day}
                  </span>

                  {item.record && (
                    <span
                      className={`mt-1 h-2 w-2 rounded-full ${statusStyle.dot}`}
                    />
                  )}
                </div>

                {item.record && (
                  <div className="mt-2 hidden sm:block">
                    <p className="text-[10px] font-bold uppercase tracking-wide">
                      {statusStyle.label}
                    </p>

                    {item.record
                      .remarks && (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-4 opacity-80">
                        {item.record
                          .remarks}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Attendance Record Row
|--------------------------------------------------------------------------
*/

const AttendanceRecordRow = ({
  record
}) => {
  const statusStyle =
    getStatusStyle(
      record.status
    );

  const StatusIcon =
    statusStyle.icon;

  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
      <td className="px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <CalendarDays
              size={17}
            />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800">
              {formatRecordDate(
                record
                  .attendanceDate
              )}
            </p>

            <p className="mt-0.5 text-[11px] text-slate-400">
              {record.class
                ?.className ||
                "Class"}{" "}
              {record
                .sectionName
                ? `· Section ${record.sectionName}`
                : ""}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-4 sm:px-5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 ${statusStyle.badge}`}
        >
          <StatusIcon
            size={13}
          />

          {statusStyle.label}
        </span>
      </td>

      <td className="px-4 py-4 text-sm text-slate-500 sm:px-5">
        {record.remarks ||
          "No remarks"}
      </td>
    </tr>
  );
};

/*
|--------------------------------------------------------------------------
| Parent Attendance Page
|--------------------------------------------------------------------------
*/

const ParentAttendance =
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
      month,
      setMonth
    ] = useState(
      getCurrentMonthValue()
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

    const [
      statusFilter,
      setStatusFilter
    ] = useState(
      "all"
    );

    const [
      search,
      setSearch
    ] = useState("");

    const studentId =
      selectedChild
        ?.student
        ?.id ||
      selectedChildId ||
      "";

    const attendanceAllowed =
      selectedChild
        ?.link
        ?.permissions
        ?.attendance !==
      false;

    /*
    |--------------------------------------------------------------------------
    | Load Attendance
    |--------------------------------------------------------------------------
    */

    const loadAttendance =
      useCallback(
        async ({
          silent = false
        } = {}) => {
          if (
            !studentId ||
            !attendanceAllowed
          ) {
            setAttendanceData(
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
              await getParentChildAttendance(
                studentId,
                {
                  month,
                  page:
                    1,
                  limit:
                    100
                },
                {
                  signal:
                    controller.signal
                }
              );

            setAttendanceData(
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
          month,
          attendanceAllowed
        ]
      );

    useEffect(() => {
      loadAttendance();

      return () => {
        requestRef.current
          ?.abort();
      };
    }, [
      loadAttendance
    ]);

    /*
    |--------------------------------------------------------------------------
    | Derived Data
    |--------------------------------------------------------------------------
    */

    const student =
      attendanceData
        ?.child ||
      selectedChild
        ?.student ||
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
        leave:
          0,
        attendancePercentage:
          0
      };

    const records =
      Array.isArray(
        attendanceData
          ?.records
      )
        ? attendanceData
            .records
        : [];

    const filteredRecords =
      useMemo(
        () => {
          const normalizedSearch =
            search
              .trim()
              .toLowerCase();

          return records.filter(
            (
              record
            ) => {
              const matchesStatus =
                statusFilter ===
                  "all" ||
                record.status ===
                  statusFilter;

              const searchText = [
                record.status,
                record.remarks,
                record.sectionName,
                record.class
                  ?.className,
                formatRecordDate(
                  record
                    .attendanceDate
                )
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              const matchesSearch =
                !normalizedSearch ||
                searchText.includes(
                  normalizedSearch
                );

              return (
                matchesStatus &&
                matchesSearch
              );
            }
          );
        },
        [
          records,
          statusFilter,
          search
        ]
      );

    const attendanceTone =
      getAttendanceTone(
        summary
          .attendancePercentage
      );

    const canMoveForward =
      month <
      getCurrentMonthValue();

    /*
    |--------------------------------------------------------------------------
    | CSV Export
    |--------------------------------------------------------------------------
    */

    const handleExport =
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
            "Class",
            "Section",
            "Remarks"
          ],

          ...records.map(
            (
              record
            ) => [
              toLocalDateKey(
                record
                  .attendanceDate
              ),
              record.status,
              record.class
                ?.className ||
                "",
              record.sectionName ||
                "",
              record.remarks ||
                ""
            ]
          )
        ];

        const csvContent =
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
                        value
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
              csvContent
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

        const link =
          document.createElement(
            "a"
          );

        link.href =
          url;

        link.download =
          `${student?.name || "student"}-${month}-attendance.csv`
            .replace(
              /\s+/g,
              "-"
            )
            .toLowerCase();

        document.body.appendChild(
          link
        );

        link.click();
        link.remove();

        URL.revokeObjectURL(
          url
        );
      };

    /*
    |--------------------------------------------------------------------------
    | No Linked Children
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
              Attendance records become available after the school links and verifies a student with your parent account.
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
    | Permission Denied
    |--------------------------------------------------------------------------
    */

    if (
      !attendanceAllowed
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
              Attendance access is restricted
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              The school has not enabled attendance access for this parent–student link. Select another child or contact the school administration.
            </p>

            <button
              type="button"
              className="btn-primary mt-6"
              onClick={() =>
                navigate(
                  `/parent-portal/messages?studentId=${encodeURIComponent(
                    studentId
                  )}`
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
      <div className="space-y-6">
        {/*
        |--------------------------------------------------------------------------
        | Hero
        |--------------------------------------------------------------------------
        */}

        <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/10 text-lg font-black ring-1 ring-white/15">
                {student
                  ?.photo ? (
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
                    student
                      ?.name
                  )
                )}
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-200">
                  <CalendarCheck2
                    size={13}
                  />

                  Attendance Monitor
                </div>

                <h2 className="mt-3 truncate text-2xl font-black sm:text-3xl">
                  {student
                    ?.name ||
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

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Selected Month
                </p>

                <p className="mt-2 text-lg font-black text-white">
                  {formatMonthLabel(
                    month
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {summary.total ||
                    0} marked school days
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Attendance Rate
                </p>

                <p className="mt-2 text-lg font-black text-white">
                  {Number(
                    summary
                      .attendancePercentage ||
                    0
                  ).toFixed(1)}
                  %
                </p>

                <p className="mt-1 text-xs text-emerald-300">
                  {attendanceTone
                    .label}
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

        <section className="card p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-secondary h-11 px-3"
                onClick={() =>
                  setMonth(
                    (
                      current
                    ) =>
                      moveMonth(
                        current,
                        -1
                      )
                  )
                }
                aria-label="Previous month"
              >
                <ChevronLeft
                  size={17}
                />
              </button>

              <input
                type="month"
                value={
                  month
                }
                max={
                  getCurrentMonthValue()
                }
                onChange={(
                  event
                ) =>
                  setMonth(
                    event.target
                      .value ||
                    getCurrentMonthValue()
                  )
                }
                className="field-input h-11 w-auto min-w-[175px]"
              />

              <button
                type="button"
                className="btn-secondary h-11 px-3"
                disabled={
                  !canMoveForward
                }
                onClick={() =>
                  setMonth(
                    (
                      current
                    ) =>
                      moveMonth(
                        current,
                        1
                      )
                  )
                }
                aria-label="Next month"
              >
                <ChevronRight
                  size={17}
                />
              </button>

              <button
                type="button"
                className="btn-ghost h-11"
                onClick={() =>
                  setMonth(
                    getCurrentMonthValue()
                  )
                }
              >
                Current Month
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  records.length ===
                  0
                }
                onClick={
                  handleExport
                }
              >
                <Download
                  size={16}
                />

                Export CSV
              </button>

              <button
                type="button"
                className="btn-primary"
                disabled={
                  refreshing
                }
                onClick={() =>
                  loadAttendance({
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
        </section>

        {error && (
          <section className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0 text-rose-600"
              />

              <div>
                <p className="text-sm font-bold text-rose-800">
                  Attendance could not be updated
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
                loadAttendance()
              }
            >
              Try Again
            </button>
          </section>
        )}

        {loading ? (
          <div className="grid min-h-[420px] place-items-center">
            <div className="text-center">
              <RefreshCw
                size={28}
                className="mx-auto animate-spin text-brand-600"
              />

              <p className="mt-4 text-sm font-black text-slate-800">
                Loading attendance records
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Preparing the monthly attendance summary…
              </p>
            </div>
          </div>
        ) : (
          <>
            {/*
            |--------------------------------------------------------------------------
            | Summary
            |--------------------------------------------------------------------------
            */}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Marked Days"
                value={
                  summary.total ||
                  0
                }
                helper="Total school days with an attendance record."
                icon={
                  CalendarDays
                }
                tone="brand"
              />

              <SummaryCard
                title="Present"
                value={
                  summary.present ||
                  0
                }
                helper="Days your child was marked present."
                icon={
                  CheckCircle2
                }
                tone="emerald"
              />

              <SummaryCard
                title="Absent"
                value={
                  summary.absent ||
                  0
                }
                helper="Days your child was marked absent."
                icon={
                  CircleSlash2
                }
                tone="rose"
              />

              <SummaryCard
                title="Leave"
                value={
                  summary.leave ||
                  0
                }
                helper="Approved or recorded leave days."
                icon={
                  Clock3
                }
                tone="amber"
              />
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Attendance Progress
            |--------------------------------------------------------------------------
            */}

            <section
              className={`rounded-3xl border p-5 sm:p-6 ${attendanceTone.background} ${attendanceTone.border}`}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p
                    className={`text-xs font-bold uppercase tracking-[0.14em] ${attendanceTone.text}`}
                  >
                    Monthly Attendance Performance
                  </p>

                  <div className="mt-2 flex items-end gap-3">
                    <p className="text-4xl font-black tracking-tight text-slate-900">
                      {Number(
                        summary
                          .attendancePercentage ||
                        0
                      ).toFixed(1)}
                      %
                    </p>

                    <span
                      className={`mb-1 rounded-full bg-white/70 px-3 py-1 text-xs font-bold ${attendanceTone.text}`}
                    >
                      {attendanceTone
                        .label}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    Based on{" "}
                    {summary.present ||
                      0}{" "}
                    present day
                    {Number(
                      summary.present ||
                      0
                    ) ===
                    1
                      ? ""
                      : "s"}{" "}
                    out of{" "}
                    {summary.total ||
                      0}{" "}
                    marked school days.
                  </p>
                </div>

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/70 text-slate-800 shadow-sm ring-1 ring-white">
                  <CalendarCheck2
                    size={28}
                  />
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/80">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${attendanceTone.bar}`}
                  style={{
                    width:
                      `${Math.min(
                        100,
                        Number(
                          summary
                            .attendancePercentage ||
                          0
                        )
                      )}%`
                  }}
                />
              </div>
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Calendar
            |--------------------------------------------------------------------------
            */}

            <section>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                    Monthly Calendar
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-900">
                    {formatMonthLabel(
                      month
                    )}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Green indicates present, red indicates absent and amber indicates leave.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px] font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                    Present
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />

                    Absent
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />

                    Leave
                  </span>
                </div>
              </div>

              <AttendanceCalendar
                monthValue={
                  month
                }
                records={
                  records
                }
              />
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Records List
            |--------------------------------------------------------------------------
            */}

            <section className="card overflow-hidden">
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                      Attendance History
                    </p>

                    <h2 className="mt-1 text-lg font-black text-slate-900">
                      Daily Records
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {filteredRecords.length} of{" "}
                      {records.length} record
                      {records.length ===
                      1
                        ? ""
                        : "s"} displayed.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="search"
                        value={
                          search
                        }
                        onChange={(
                          event
                        ) =>
                          setSearch(
                            event.target
                              .value
                          )
                        }
                        className="field-input h-10 min-w-[230px] pl-10"
                        placeholder="Search records…"
                      />
                    </div>

                    <select
                      value={
                        statusFilter
                      }
                      onChange={(
                        event
                      ) =>
                        setStatusFilter(
                          event.target
                            .value
                        )
                      }
                      className="field-select h-10 min-w-[150px]"
                    >
                      {STATUS_OPTIONS.map(
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
                  </div>
                </div>
              </div>

              {filteredRecords.length >
              0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:px-5">
                          Date
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:px-5">
                          Status
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:px-5">
                          Remarks
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRecords.map(
                        (
                          record
                        ) => (
                          <AttendanceRecordRow
                            key={
                              `${record.id}-${toLocalDateKey(
                                record
                                  .attendanceDate
                              )}`
                            }
                            record={
                              record
                            }
                          />
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid min-h-[280px] place-items-center p-8 text-center">
                  <div className="max-w-md">
                    <CalendarDays
                      size={32}
                      className="mx-auto text-slate-300"
                    />

                    <h3 className="mt-4 text-base font-black text-slate-800">
                      No attendance records found
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      No records match the selected month, status or search text.
                    </p>

                    {(search ||
                      statusFilter !==
                        "all") && (
                      <button
                        type="button"
                        className="btn-secondary mt-5"
                        onClick={() => {
                          setSearch("");
                          setStatusFilter(
                            "all"
                          );
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Support
            |--------------------------------------------------------------------------
            */}

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="card p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <ShieldCheck
                      size={22}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Verified School Record
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Attendance shown here is read directly from the school’s official daily attendance register.
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
                      Attendance Concern?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Start a secure conversation with the principal about an absence, leave record or attendance discrepancy.
                    </p>

                    <button
                      type="button"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 transition hover:text-brand-800"
                      onClick={() =>
                        navigate(
                          `/parent-portal/messages?studentId=${encodeURIComponent(
                            studentId
                          )}&category=attendance`
                        )
                      }
                    >
                      Message Principal

                      <ArrowRight
                        size={15}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    );
  };

export default ParentAttendance;