import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  MessageCircle,
  ReceiptText,
  School,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards
} from "lucide-react";

import {
  useNavigate,
  useOutletContext
} from "react-router-dom";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const formatCurrency = (
  value
) => {
  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    "en-PK",
    {
      style:
        "currency",

      currency:
        "PKR",

      maximumFractionDigits:
        0
    }
  ).format(amount);
};

const formatPercentage = (
  value
) => {
  return `${Number(
    value || 0
  ).toFixed(1)}%`;
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
    return `${className} · ${sectionName}`;
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

/*
|--------------------------------------------------------------------------
| Reusable Summary Card
|--------------------------------------------------------------------------
*/

const SummaryCard = ({
  title,
  value,
  helper,
  icon: Icon,
  iconClassName
}) => {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
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
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}
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
| Quick Action
|--------------------------------------------------------------------------
*/

const QuickAction = ({
  title,
  description,
  icon: Icon,
  onClick,
  badge = ""
}) => {
  return (
    <button
      type="button"
      className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
      onClick={
        onClick
      }
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
        <Icon
          size={20}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-800">
            {title}
          </p>

          {badge && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
              {badge}
            </span>
          )}
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <ChevronRight
        size={18}
        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600"
      />
    </button>
  );
};

/*
|--------------------------------------------------------------------------
| Child Overview Card
|--------------------------------------------------------------------------
*/

const ChildOverviewCard = ({
  child,
  active,
  onSelect,
  onOpenProfile
}) => {
  const student =
    child?.student ||
    {};

  const summary =
    child?.summary ||
    {};

  const attendance =
    summary.attendance ||
    {};

  const fees =
    summary.fees ||
    {};

  const attendanceTone =
    getAttendanceTone(
      attendance
        .attendancePercentage
    );

  return (
    <div
      className={`rounded-3xl border bg-white p-5 shadow-sm transition ${
        active
          ? "border-brand-300 ring-4 ring-brand-50"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
            active
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
          onClick={
            onSelect
          }
          aria-label={`Select ${student.name || "student"}`}
        >
          {getInitials(
            student.name
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-slate-900">
              {student.name ||
                "Student"}
            </h3>

            {active && (
              <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                Active
              </span>
            )}
          </div>

          <p className="mt-1 text-xs font-medium text-slate-500">
            {formatClass(
              student
            )}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Admission No:{" "}
            {student.admissionNumber ||
              "Not assigned"}
          </p>
        </div>

        <button
          type="button"
          className="btn-ghost h-9 px-3 text-xs"
          onClick={
            onOpenProfile
          }
        >
          Profile
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div
          className={`rounded-2xl border p-3 ${attendanceTone.background} ${attendanceTone.border}`}
        >
          <div className="flex items-center gap-2">
            <CalendarCheck2
              size={15}
              className={
                attendanceTone.text
              }
            />

            <p
              className={`text-[11px] font-bold uppercase tracking-wide ${attendanceTone.text}`}
            >
              Attendance
            </p>
          </div>

          <p className="mt-2 text-lg font-black text-slate-900">
            {formatPercentage(
              attendance
                .attendancePercentage
            )}
          </p>

          <p
            className={`mt-0.5 text-[10px] font-semibold ${attendanceTone.text}`}
          >
            {attendanceTone.label}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2">
            <WalletCards
              size={15}
              className="text-amber-700"
            />

            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
              Balance
            </p>
          </div>

          <p className="mt-2 truncate text-lg font-black text-slate-900">
            {formatCurrency(
              fees.totalBalance
            )}
          </p>

          <p className="mt-0.5 text-[10px] font-semibold text-amber-700">
            Outstanding fee
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50 px-2 py-3">
        <div className="px-2 text-center">
          <p className="text-sm font-black text-slate-800">
            {attendance.present ||
              0}
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-slate-400">
            Present
          </p>
        </div>

        <div className="px-2 text-center">
          <p className="text-sm font-black text-slate-800">
            {summary.todayClasses ||
              0}
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-slate-400">
            Today
          </p>
        </div>

        <div className="px-2 text-center">
          <p className="text-sm font-black text-slate-800">
            {summary.unreadMessages ||
              0}
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-slate-400">
            Messages
          </p>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Empty State
|--------------------------------------------------------------------------
*/

const NoChildrenState =
  () => {
    return (
      <div className="card grid min-h-[420px] place-items-center p-8 text-center">
        <div className="max-w-lg">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-brand-50 text-brand-700">
            <UsersRound
              size={34}
            />
          </div>

          <h2 className="mt-6 text-xl font-black text-slate-900">
            No child is linked yet
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            Your verified parent account is active, but no student profile is currently connected to it. Please contact the school administration and ask them to link your child with this account.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <ShieldCheck
              size={18}
            />

            Your account remains secure
          </div>
        </div>
      </div>
    );
  };

/*
|--------------------------------------------------------------------------
| Parent Portal Dashboard
|--------------------------------------------------------------------------
*/

const ParentPortalDashboard =
  () => {
    const navigate =
      useNavigate();

    const {
      overview,
      children,
      selectedChild,
      selectedChildId,
      setSelectedChildId
    } = useOutletContext();

    const summary =
      overview?.summary ||
      {};

    const parent =
      overview?.parent ||
      {};

    const principal =
      overview?.principal ||
      null;

    const school =
      overview?.school ||
      selectedChild
        ?.student
        ?.school ||
      {};

    const selectedStudent =
      selectedChild
        ?.student ||
      null;

    const selectedSummary =
      selectedChild
        ?.summary ||
      {};

    const selectedAttendance =
      selectedSummary
        .attendance ||
      {};

    const selectedFees =
      selectedSummary.fees ||
      {};

    const attendanceTone =
      getAttendanceTone(
        selectedAttendance
          .attendancePercentage
      );

    if (
      children.length ===
      0
    ) {
      return (
        <NoChildrenState />
      );
    }

    return (
      <div className="space-y-6">
        {/*
        |--------------------------------------------------------------------------
        | Welcome Hero
        |--------------------------------------------------------------------------
        */}

        <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                <Sparkles
                  size={14}
                />

                Family Learning Dashboard
              </div>

              <h2 className="mt-5 max-w-3xl text-2xl font-black leading-tight sm:text-3xl">
                Welcome back,{" "}
                {parent.name ||
                  "Parent"}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                Monitor attendance, fees, timetable, academic activity and school communication for all your children from one secure place.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
                  onClick={() =>
                    navigate(
                      "/parent-portal/messages"
                    )
                  }
                >
                  <MessageCircle
                    size={17}
                  />

                  Message Principal

                  <ArrowRight
                    size={15}
                  />
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/[0.12]"
                  onClick={() =>
                    navigate(
                      "/parent-portal/children"
                    )
                  }
                >
                  <UsersRound
                    size={17}
                  />

                  View Children
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/20">
                  <School
                    size={23}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    School
                  </p>

                  <p className="mt-1 truncate text-sm font-bold text-white">
                    {school.schoolName ||
                      "School Portal"}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Session{" "}
                    {school.sessionYear ||
                      "Not specified"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[0.06] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Children
                  </p>

                  <p className="mt-2 text-xl font-black text-white">
                    {summary.totalChildren ||
                      children.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.06] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Messages
                  </p>

                  <p className="mt-2 text-xl font-black text-white">
                    {summary.unreadMessages ||
                      0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Summary Cards
        |--------------------------------------------------------------------------
        */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Linked Children"
            value={
              summary.totalChildren ||
              children.length
            }
            helper="Student profiles connected to your account."
            icon={
              UsersRound
            }
            iconClassName="bg-brand-50 text-brand-700"
          />

          <SummaryCard
            title="Monthly Attendance"
            value={
              formatPercentage(
                summary.currentMonthAttendancePercentage
              )
            }
            helper="Combined current-month attendance."
            icon={
              CalendarCheck2
            }
            iconClassName="bg-emerald-50 text-emerald-700"
          />

          <SummaryCard
            title="Outstanding Fees"
            value={
              formatCurrency(
                summary.totalOutstandingBalance
              )
            }
            helper="Total unpaid balance across all children."
            icon={
              CircleDollarSign
            }
            iconClassName="bg-amber-50 text-amber-700"
          />

          <SummaryCard
            title="Today’s Classes"
            value={
              summary.todayClasses ||
              0
            }
            helper="Scheduled classes for all linked children."
            icon={
              Clock3
            }
            iconClassName="bg-cyan-50 text-cyan-700"
          />
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Selected Child and Quick Actions
        |--------------------------------------------------------------------------
        */}

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                    Active Child
                  </p>

                  <h2 className="mt-1 text-lg font-black text-slate-900">
                    {selectedStudent
                      ?.name ||
                      "Student"}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatClass(
                      selectedStudent
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    navigate(
                      `/parent-portal/children/${selectedStudent?.id}`
                    )
                  }
                >
                  <UserRound
                    size={16}
                  />

                  Full Profile
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
              <div
                className={`rounded-3xl border p-5 ${attendanceTone.background} ${attendanceTone.border}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p
                      className={`text-xs font-bold uppercase tracking-[0.14em] ${attendanceTone.text}`}
                    >
                      Current Month Attendance
                    </p>

                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {formatPercentage(
                        selectedAttendance
                          .attendancePercentage
                      )}
                    </p>
                  </div>

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 ${attendanceTone.text}`}
                  >
                    <CalendarCheck2
                      size={22}
                    />
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/80">
                  <div
                    className={`h-full rounded-full ${attendanceTone.bar}`}
                    style={{
                      width:
                        `${Math.min(
                          100,
                          Number(
                            selectedAttendance
                              .attendancePercentage ||
                            0
                          )
                        )}%`
                    }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white/70 p-3 text-center">
                    <p className="text-base font-black text-slate-800">
                      {selectedAttendance.present ||
                        0}
                    </p>

                    <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                      Present
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/70 p-3 text-center">
                    <p className="text-base font-black text-slate-800">
                      {selectedAttendance.absent ||
                        0}
                    </p>

                    <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                      Absent
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/70 p-3 text-center">
                    <p className="text-base font-black text-slate-800">
                      {selectedAttendance.leave ||
                        0}
                    </p>

                    <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                      Leave
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-slate-700 transition hover:text-brand-700"
                  onClick={() =>
                    navigate(
                      "/parent-portal/attendance"
                    )
                  }
                >
                  View attendance details

                  <ArrowRight
                    size={14}
                  />
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
                      Fee Summary
                    </p>

                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {formatCurrency(
                        selectedFees.totalBalance
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Outstanding balance
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <ReceiptText
                      size={22}
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <span className="text-xs font-medium text-slate-500">
                      Total Payable
                    </span>

                    <span className="text-sm font-black text-slate-800">
                      {formatCurrency(
                        selectedFees.totalPayable
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <span className="text-xs font-medium text-slate-500">
                      Total Paid
                    </span>

                    <span className="text-sm font-black text-emerald-700">
                      {formatCurrency(
                        selectedFees.totalPaid
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <span className="text-xs font-medium text-slate-500">
                      Unpaid Invoices
                    </span>

                    <span className="text-sm font-black text-rose-700">
                      {selectedFees.unpaidInvoices ||
                        0}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-slate-700 transition hover:text-brand-700"
                  onClick={() =>
                    navigate(
                      "/parent-portal/fees"
                    )
                  }
                >
                  View fee details

                  <ArrowRight
                    size={14}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <TrendingUp
                  size={20}
                />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-900">
                  Quick Actions
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Open important parent services.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <QuickAction
                title="View Attendance"
                description="Check daily status and monthly attendance percentage."
                icon={
                  CalendarCheck2
                }
                onClick={() =>
                  navigate(
                    "/parent-portal/attendance"
                  )
                }
              />

              <QuickAction
                title="Check Fee Status"
                description="Review balances, payments and receipt history."
                icon={
                  WalletCards
                }
                onClick={() =>
                  navigate(
                    "/parent-portal/fees"
                  )
                }
              />

              <QuickAction
                title="Class Timetable"
                description="See today’s classes and the complete weekly schedule."
                icon={
                  CalendarDays
                }
                onClick={() =>
                  navigate(
                    "/parent-portal/timetable"
                  )
                }
              />

              <QuickAction
                title="Message Principal"
                description="Discuss attendance, fees, academics or any concern."
                icon={
                  MessageCircle
                }
                badge={
                  Number(
                    summary.unreadMessages ||
                    0
                  ) > 0
                    ? `${summary.unreadMessages} new`
                    : ""
                }
                onClick={() =>
                  navigate(
                    "/parent-portal/messages"
                  )
                }
              />
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Children Grid
        |--------------------------------------------------------------------------
        */}

        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                Family Profiles
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                My Children
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select a child to update all dashboard information.
              </p>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate(
                  "/parent-portal/children"
                )
              }
            >
              View All Children

              <ArrowRight
                size={16}
              />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {children.map(
              (child) => {
                const studentId =
                  child?.student
                    ?.id;

                return (
                  <ChildOverviewCard
                    key={
                      studentId
                    }
                    child={
                      child
                    }
                    active={
                      String(
                        studentId
                      ) ===
                      String(
                        selectedChildId
                      )
                    }
                    onSelect={() =>
                      setSelectedChildId(
                        studentId
                      )
                    }
                    onOpenProfile={() =>
                      navigate(
                        `/parent-portal/children/${studentId}`
                      )
                    }
                  />
                );
              }
            )}
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Principal and School Support
        |--------------------------------------------------------------------------
        */}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <UserRound
                  size={24}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                  School Leadership
                </p>

                <h2 className="mt-1 truncate text-lg font-black text-slate-900">
                  {principal
                    ?.name ||
                    "Principal"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Principal ·{" "}
                  {school.schoolName ||
                    "School"}
                </p>
              </div>

              <BadgeCheck
                size={22}
                className="shrink-0 text-emerald-600"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-6 text-slate-600">
                Start a secure conversation regarding attendance, fee concerns, academic progress, behaviour, health, transport or timetable matters.
              </p>
            </div>

            <button
              type="button"
              className="btn-primary mt-5 w-full"
              onClick={() =>
                navigate(
                  "/parent-portal/messages"
                )
              }
            >
              <MessageCircle
                size={17}
              />

              Start Conversation
            </button>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ShieldCheck
                  size={24}
                />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                  Parent Account
                </p>

                <h2 className="mt-1 text-lg font-black text-slate-900">
                  Verified & Protected
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your portal access is scoped only to linked children.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <BookOpen
                  size={19}
                  className="text-brand-600"
                />

                <p className="mt-3 text-sm font-bold text-slate-800">
                  Academic Access
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  View subjects, teachers and academic information.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <Bell
                  size={19}
                  className="text-amber-600"
                />

                <p className="mt-3 text-sm font-bold text-slate-800">
                  School Updates
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Receive messages and important school announcements.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-secondary mt-5 w-full"
              onClick={() =>
                navigate(
                  "/parent-portal/academics"
                )
              }
            >
              <GraduationCap
                size={17}
              />

              View Academic Progress
            </button>
          </div>
        </section>
      </div>
    );
  };

export default ParentPortalDashboard;