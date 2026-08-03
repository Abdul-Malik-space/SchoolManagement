import {
  useMemo,
  useState
} from "react";

import {
  useNavigate,
  useOutletContext
} from "react-router-dom";

import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  IdCard,
  Lightbulb,
  MapPin,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  School,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  WalletCards
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const formatMoney = (
  value
) => {
  return `Rs ${Number(
    value || 0
  ).toLocaleString(
    "en-PK",
    {
      maximumFractionDigits:
        0
    }
  )}`;
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
        "long",

      day:
        "numeric",

      month:
        "long",

      year:
        "numeric"
    }
  );
};

const formatShortDate = (
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

  return date.toLocaleDateString(
    "en-PK",
    {
      day:
        "numeric",

      month:
        "short"
    }
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
    return value || "Time pending";
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

  const twelveHour =
    hour % 12 ||
    12;

  return `${twelveHour}:${minute} ${period}`;
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

const getGreeting = () => {
  const hour =
    new Date().getHours();

  if (
    hour <
    12
  ) {
    return "Good morning";
  }

  if (
    hour <
    17
  ) {
    return "Good afternoon";
  }

  return "Good evening";
};

const getAttendanceTone = (
  percentage
) => {
  if (
    percentage >=
    90
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
    percentage >=
    75
  ) {
    return {
      label:
        "On track",

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
      "Needs attention",

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

const getAlertStyle = (
  type
) => {
  if (
    type ===
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
        "text-rose-700"
    };
  }

  if (
    type ===
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
        "text-amber-700"
    };
  }

  return {
    wrapper:
      "border-sky-200 bg-sky-50",

    icon:
      "bg-sky-100 text-sky-700",

    title:
      "text-sky-900",

    text:
      "text-sky-700"
  };
};

const getPeriodLocation = (
  entry
) => {
  return (
    entry?.room?.name ||
    entry?.room?.code ||
    (
      entry?.deliveryMode ===
      "online"
        ? "Online class"
        : "Room pending"
    )
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          className="inline-flex items-center gap-2 self-start rounded-xl px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-50 sm:self-auto"
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
  tone =
    "brand",
  onClick
}) => {
  const tones = {
    brand: {
      icon:
        "bg-brand-50 text-brand-700",

      accent:
        "from-brand-500 to-cyan-500"
    },

    emerald: {
      icon:
        "bg-emerald-50 text-emerald-700",

      accent:
        "from-emerald-500 to-teal-500"
    },

    amber: {
      icon:
        "bg-amber-50 text-amber-700",

      accent:
        "from-amber-500 to-orange-500"
    },

    violet: {
      icon:
        "bg-violet-50 text-violet-700",

      accent:
        "from-violet-500 to-fuchsia-500"
    }
  };

  const selectedTone =
    tones[tone] ||
    tones.brand;

  const Wrapper =
    onClick
      ? "button"
      : "div";

  return (
    <Wrapper
      type={
        onClick
          ? "button"
          : undefined
      }
      onClick={
        onClick
      }
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm ${
        onClick
          ? "transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
          : ""
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${selectedTone.accent}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${selectedTone.icon}`}
        >
          <Icon
            size={20}
          />
        </div>

        {onClick && (
          <ArrowRight
            size={16}
            className="mt-1 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600"
          />
        )}
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
    </Wrapper>
  );
};

const EmptyState = ({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction
}) => {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <Icon
          size={22}
        />
      </div>

      <p className="mt-4 text-sm font-bold text-slate-800">
        {title}
      </p>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
        {message}
      </p>

      {actionLabel &&
      onAction && (
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-brand-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-brand-50"
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

/*
|--------------------------------------------------------------------------
| Student Portal Dashboard
|--------------------------------------------------------------------------
*/

const StudentPortalDashboard =
  () => {
    const navigate =
      useNavigate();

    const {
      overview,
      student,
      school,
      summary,
      alerts,
      today,
      refreshing,
      online,
      refreshPortal
    } = useOutletContext();

    const [
      dismissedAlertIds,
      setDismissedAlertIds
    ] = useState(
      []
    );

    const attendance =
      summary?.attendance ||
      {};

    const feeSummary =
      summary?.fees ||
      {};

    const messageSummary =
      summary?.messages ||
      {};

    const profileCompletion =
      summary?.profileCompletion ||
      {};

    const todayClasses =
      Array.isArray(
        today?.classes
      )
        ? today.classes
        : [];

    const nextClass =
      today?.nextClass ||
      null;

    const visibleAlerts =
      useMemo(
        () => {
          return (
            Array.isArray(
              alerts
            )
              ? alerts
              : []
          ).filter(
            (
              alert,
              index
            ) => {
              const alertId =
                alert.id ||
                `alert-${index}`;

              return !dismissedAlertIds.includes(
                alertId
              );
            }
          );
        },
        [
          alerts,
          dismissedAlertIds
        ]
      );

    const attendancePercentage =
      Number(
        attendance
          ?.attendancePercentage ||
        0
      );

    const attendanceTone =
      getAttendanceTone(
        attendancePercentage
      );

    const profilePercentage =
      Number(
        profileCompletion
          ?.percentage ||
        0
      );

    const totalBalance =
      Number(
        feeSummary
          ?.totalBalance ||
        0
      );

    const greeting =
      getGreeting();

    const currentDate =
      overview?.currentDate ||
      new Date();

    const quickActions = [
      {
        label:
          "Digital ID",

        description:
          "Open your official student card",

        icon:
          IdCard,

        path:
          "/student-portal/profile",

        tone:
          "bg-brand-50 text-brand-700"
      },

      {
        label:
          "Attendance",

        description:
          "Review daily records and trends",

        icon:
          CalendarCheck2,

        path:
          "/student-portal/attendance",

        tone:
          "bg-emerald-50 text-emerald-700"
      },

      {
        label:
          "Timetable",

        description:
          "See your complete class schedule",

        icon:
          Clock3,

        path:
          "/student-portal/timetable",

        tone:
          "bg-violet-50 text-violet-700"
      },

      {
        label:
          "Message Principal",

        description:
          "Start a secure conversation",

        icon:
          MessageCircle,

        path:
          "/student-portal/messages",

        tone:
          "bg-sky-50 text-sky-700"
      }
    ];

    return (
      <div className="space-y-6">
        {/*
        |--------------------------------------------------------------------------
        | Welcome Hero
        |--------------------------------------------------------------------------
        */}

        <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative grid gap-6 xl:grid-cols-[1fr_320px] xl:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-emerald-200 ring-1 ring-white/10">
                  <Sparkles
                    size={13}
                  />

                  Personalised Student Workspace
                </span>

                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 ${
                    online
                      ? "bg-emerald-400/10 text-emerald-200 ring-emerald-300/15"
                      : "bg-amber-400/10 text-amber-200 ring-amber-300/15"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      online
                        ? "bg-emerald-300"
                        : "bg-amber-300"
                    }`}
                  />

                  {online
                    ? "Live data connected"
                    : "Offline view"}
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-300">
                {greeting},
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                {student?.name ||
                  "Student"}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Stay organised with your class schedule, attendance, fee information and important school updates.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs">
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

                <span className="rounded-xl bg-white/10 px-3 py-2 text-slate-200 ring-1 ring-white/10">
                  {formatDate(
                    currentDate
                  )}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Next Class
                  </p>

                  <p className="mt-1 text-sm font-bold text-white">
                    {nextClass
                      ?.subject
                      ?.name ||
                      nextClass
                        ?.period
                        ?.name ||
                      "No upcoming class"}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-400/15 text-brand-200 ring-1 ring-brand-300/20">
                  <Clock3
                    size={19}
                  />
                </div>
              </div>

              {nextClass ? (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white/[0.06] px-3 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                        Time
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-100">
                        {formatTime(
                          nextClass
                            ?.period
                            ?.startTime
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.06] px-3 py-3">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                        Location
                      </p>

                      <p className="mt-1 truncate text-xs font-bold text-slate-100">
                        {getPeriodLocation(
                          nextClass
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-brand-50"
                    onClick={() =>
                      navigate(
                        "/student-portal/timetable"
                      )
                    }
                  >
                    Open Timetable

                    <ArrowRight
                      size={14}
                    />
                  </button>
                </>
              ) : (
                <p className="mt-4 text-xs leading-5 text-slate-400">
                  Your next class will appear here when today’s timetable is available.
                </p>
              )}
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Summary Cards
        |--------------------------------------------------------------------------
        */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={
              CalendarCheck2
            }
            label="Attendance"
            value={`${attendancePercentage}%`}
            helper={`${Number(
              attendance?.present ||
              0
            )} present · ${Number(
              attendance?.absent ||
              0
            )} absent this month`}
            tone="emerald"
            onClick={() =>
              navigate(
                "/student-portal/attendance"
              )
            }
          />

          <StatCard
            icon={
              Clock3
            }
            label="Today's Classes"
            value={
              Number(
                today?.classCount ||
                todayClasses.length ||
                0
              )
            }
            helper={
              nextClass
                ? `${nextClass?.subject?.name || "Next class"} at ${formatTime(
                    nextClass?.period?.startTime
                  )}`
                : "No upcoming class available"
            }
            tone="brand"
            onClick={() =>
              navigate(
                "/student-portal/timetable"
              )
            }
          />

          <StatCard
            icon={
              WalletCards
            }
            label="Fee Balance"
            value={
              formatMoney(
                totalBalance
              )
            }
            helper={
              totalBalance >
              0
                ? `${Number(
                    feeSummary?.unpaidInvoices ||
                    0
                  )} unpaid invoice(s)`
                : "Your fee account is clear"
            }
            tone="amber"
            onClick={() =>
              navigate(
                "/student-portal/fees"
              )
            }
          />

          <StatCard
            icon={
              BookOpen
            }
            label="Subjects"
            value={
              Number(
                summary?.subjects ||
                0
              )
            }
            helper="Subjects currently assigned to your class"
            tone="violet"
            onClick={() =>
              navigate(
                "/student-portal/subjects"
              )
            }
          />
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Main Dashboard Grid
        |--------------------------------------------------------------------------
        */}

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="space-y-6">
            {/*
            |--------------------------------------------------------------------------
            | Today's Schedule
            |--------------------------------------------------------------------------
            */}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={
                  CalendarDays
                }
                title="Today's Schedule"
                subtitle={`${today?.day || "Today"} · ${todayClasses.length} scheduled class${
                  todayClasses.length ===
                  1
                    ? ""
                    : "es"
                }`}
                actionLabel="Full timetable"
                onAction={() =>
                  navigate(
                    "/student-portal/timetable"
                  )
                }
              />

              <div className="mt-5">
                {todayClasses.length >
                0 ? (
                  <div className="space-y-3">
                    {todayClasses
                      .slice(
                        0,
                        6
                      )
                      .map(
                        (
                          entry,
                          index
                        ) => {
                          const isNext =
                            String(
                              entry?.id ||
                              ""
                            ) ===
                            String(
                              nextClass?.id ||
                              ""
                            );

                          return (
                            <article
                              key={
                                entry?.id ||
                                `${entry?.day}-${entry?.period?.sequence}-${index}`
                              }
                              className={`relative overflow-hidden rounded-2xl border p-4 transition ${
                                isNext
                                  ? "border-brand-200 bg-brand-50/50 shadow-sm"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              {isNext && (
                                <div className="absolute inset-y-0 left-0 w-1 bg-brand-500" />
                              )}

                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="flex min-w-[105px] items-center gap-3">
                                  <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                                      isNext
                                        ? "bg-brand-100 text-brand-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    <Clock3
                                      size={18}
                                    />
                                  </div>

                                  <div>
                                    <p className="text-xs font-black text-slate-800">
                                      {formatTime(
                                        entry
                                          ?.period
                                          ?.startTime
                                      )}
                                    </p>

                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                      to{" "}
                                      {formatTime(
                                        entry
                                          ?.period
                                          ?.endTime
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-bold text-slate-900">
                                      {entry
                                        ?.subject
                                        ?.name ||
                                        entry
                                          ?.period
                                          ?.name ||
                                        "Scheduled Activity"}
                                    </p>

                                    {isNext && (
                                      <span className="rounded-full bg-brand-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-brand-700">
                                        Next
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                                    <span className="inline-flex items-center gap-1.5">
                                      <UserRound
                                        size={12}
                                      />

                                      {entry
                                        ?.teacher
                                        ?.name ||
                                        "Teacher not assigned"}
                                    </span>

                                    <span className="inline-flex items-center gap-1.5">
                                      <MapPin
                                        size={12}
                                      />

                                      {getPeriodLocation(
                                        entry
                                      )}
                                    </span>
                                  </div>
                                </div>

                                <div className="self-start rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:self-center">
                                  {entry
                                    ?.period
                                    ?.name ||
                                    `Period ${entry?.period?.sequence || index + 1}`}
                                </div>
                              </div>
                            </article>
                          );
                        }
                      )}
                  </div>
                ) : (
                  <EmptyState
                    icon={
                      Clock3
                    }
                    title="No classes scheduled today"
                    message="Your published classes will appear here automatically."
                    actionLabel="View weekly timetable"
                    onAction={() =>
                      navigate(
                        "/student-portal/timetable"
                      )
                    }
                  />
                )}
              </div>
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Attendance Intelligence
            |--------------------------------------------------------------------------
            */}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={
                  TrendingUp
                }
                title="Attendance Intelligence"
                subtitle="A live view of your attendance health for the current month."
                actionLabel="View history"
                onAction={() =>
                  navigate(
                    "/student-portal/attendance"
                  )
                }
              />

              <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
                <div
                  className={`rounded-2xl border p-5 text-center ${attendanceTone.background} ${attendanceTone.border}`}
                >
                  <div
                    className="mx-auto grid h-28 w-28 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(rgb(16 185 129) ${Math.min(
                        Math.max(
                          attendancePercentage,
                          0
                        ),
                        100
                      )}%, rgb(226 232 240) 0)`
                    }}
                  >
                    <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white">
                      <div>
                        <p className="text-2xl font-black text-slate-900">
                          {attendancePercentage}%
                        </p>

                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          Attendance
                        </p>
                      </div>
                    </div>
                  </div>

                  <p
                    className={`mt-4 text-sm font-bold ${attendanceTone.text}`}
                  >
                    {attendance
                      ?.risk
                      ?.label ||
                      attendanceTone.label}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {attendance
                      ?.risk
                      ?.message ||
                      "Attendance analysis updates when records are marked."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label:
                        "Present",

                      value:
                        attendance?.present,

                      tone:
                        "bg-emerald-50 text-emerald-700"
                    },

                    {
                      label:
                        "Absent",

                      value:
                        attendance?.absent,

                      tone:
                        "bg-rose-50 text-rose-700"
                    },

                    {
                      label:
                        "Late",

                      value:
                        attendance?.late,

                      tone:
                        "bg-amber-50 text-amber-700"
                    },

                    {
                      label:
                        "Leave",

                      value:
                        attendance?.leave,

                      tone:
                        "bg-sky-50 text-sky-700"
                    }
                  ].map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item.label
                        }
                        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                      >
                        <div
                          className={`inline-flex rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${item.tone}`}
                        >
                          {item.label}
                        </div>

                        <p className="mt-4 text-2xl font-black text-slate-900">
                          {Number(
                            item.value ||
                            0
                          )}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          Current month
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            {/*
            |--------------------------------------------------------------------------
            | Smart Alerts
            |--------------------------------------------------------------------------
            */}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeader
                icon={
                  Bell
                }
                title="Smart Alerts"
                subtitle="Important actions based on your latest school data."
              />

              <div className="mt-5 space-y-3">
                {visibleAlerts.length >
                0 ? (
                  visibleAlerts
                    .slice(
                      0,
                      4
                    )
                    .map(
                      (
                        alert,
                        index
                      ) => {
                        const alertId =
                          alert.id ||
                          `alert-${index}`;

                        const style =
                          getAlertStyle(
                            alert.type
                          );

                        return (
                          <article
                            key={
                              alertId
                            }
                            className={`rounded-2xl border p-4 ${style.wrapper}`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
                              >
                                <Lightbulb
                                  size={16}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-xs font-bold ${style.title}`}
                                >
                                  {alert.title ||
                                    "Student alert"}
                                </p>

                                <p
                                  className={`mt-1 text-[11px] leading-5 ${style.text}`}
                                >
                                  {alert.message ||
                                    "Open this item for more information."}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {alert.actionPath && (
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50"
                                      onClick={() =>
                                        navigate(
                                          alert.actionPath
                                        )
                                      }
                                    >
                                      Review

                                      <ArrowRight
                                        size={11}
                                      />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-500 transition hover:bg-white/70"
                                    onClick={() =>
                                      setDismissedAlertIds(
                                        (
                                          current
                                        ) => [
                                          ...current,
                                          alertId
                                        ]
                                      )
                                    }
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      }
                    )
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                    <CheckCircle2
                      size={26}
                      className="mx-auto text-emerald-600"
                    />

                    <p className="mt-3 text-sm font-bold text-emerald-900">
                      Everything looks good
                    </p>

                    <p className="mt-1 text-xs leading-5 text-emerald-700">
                      There are no urgent student alerts at the moment.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Profile Completion
            |--------------------------------------------------------------------------
            */}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Profile Readiness
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Complete profile information helps the school maintain accurate records.
                  </p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <IdCard
                    size={18}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-black text-slate-900">
                    {profilePercentage}%
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    {Number(
                      profileCompletion
                        ?.completedFields ||
                        0
                    )} of{" "}
                    {Number(
                      profileCompletion
                        ?.totalFields ||
                        0
                    )} key fields complete
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    profilePercentage >=
                    90
                      ? "bg-emerald-100 text-emerald-700"
                      : profilePercentage >=
                          70
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {profileCompletion
                    ?.status ||
                    "Review"}
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      Math.max(
                        profilePercentage,
                        0
                      ),
                      100
                    )}%`
                  }}
                />
              </div>

              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
                onClick={() =>
                  navigate(
                    "/student-portal/profile"
                  )
                }
              >
                Open Profile & Digital ID

                <ArrowRight
                  size={14}
                />
              </button>
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Principal Contact
            |--------------------------------------------------------------------------
            */}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-brand-600 to-cyan-600 p-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-100">
                      School Support
                    </p>

                    <p className="mt-1 text-base font-bold">
                      {overview
                        ?.principal
                        ?.name ||
                        "Principal Office"}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                    <School
                      size={20}
                    />
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-brand-50">
                  Ask questions about attendance, academics, timetable or general school matters.
                </p>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Unread Messages
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-900">
                      {Number(
                        messageSummary
                          ?.unreadMessages ||
                        0
                      )}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <MessageCircle
                      size={18}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  onClick={() =>
                    navigate(
                      "/student-portal/messages"
                    )
                  }
                >
                  Open Messages

                  <ArrowRight
                    size={14}
                  />
                </button>
              </div>
            </section>
          </aside>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Quick Actions
        |--------------------------------------------------------------------------
        */}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeader
            icon={
              Sparkles
            }
            title="Quick Actions"
            subtitle="Jump directly to your most-used student tools."
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map(
              (
                action
              ) => {
                const Icon =
                  action.icon;

                return (
                  <button
                    key={
                      action.path
                    }
                    type="button"
                    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white hover:shadow-md"
                    onClick={() =>
                      navigate(
                        action.path
                      )
                    }
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${action.tone}`}
                    >
                      <Icon
                        size={19}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {action.label}
                      </p>

                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">
                        {action.description}
                      </p>
                    </div>

                    <ArrowRight
                      size={15}
                      className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600"
                    />
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | School Identity and Refresh
        |--------------------------------------------------------------------------
        */}

        <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <School
                size={21}
              />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">
                {school
                  ?.schoolName ||
                  "Your School"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {school
                  ?.sessionYear
                  ? `Academic session ${school.sessionYear}`
                  : "Official student data is managed by your school administration."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={
              refreshPortal
            }
            disabled={
              refreshing ||
              !online
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

            {refreshing
              ? "Refreshing..."
              : "Refresh Dashboard"}
          </button>
        </section>
      </div>
    );
  };

export default StudentPortalDashboard;
