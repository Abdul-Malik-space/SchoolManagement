import {
  useMemo,
  useState
} from "react";

import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  CalendarDays,
  Cake,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  MapPin,
  MessageCircle,
  Phone,
  ReceiptText,
  Search,
  ShieldCheck,
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
  ).format(
    Number(
      value || 0
    )
  );
};

const formatDate = (
  value
) => {
  if (!value) {
    return "Not provided";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not provided";
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

const getPermissions = (
  child
) => {
  return (
    child?.link
      ?.permissions ||
    {}
  );
};

const hasPermission = (
  child,
  feature
) => {
  const permissions =
    getPermissions(
      child
    );

  return (
    permissions[
      feature
    ] !== false
  );
};

const getRelationshipLabel = (
  child
) => {
  return (
    child?.link
      ?.relationshipLabel ||
    "Guardian"
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
        "border-emerald-200"
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
        "border-amber-200"
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
      "border-rose-200"
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
  iconClassName
}) => {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
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
| Student Information Row
|--------------------------------------------------------------------------
*/

const InformationRow = ({
  icon: Icon,
  label,
  value
}) => {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50 px-3 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200">
        <Icon
          size={15}
        />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 truncate text-xs font-semibold text-slate-700">
          {value ||
            "Not provided"}
        </p>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Student Card
|--------------------------------------------------------------------------
*/

const StudentCard = ({
  child,
  active,
  onSelect,
  onOpenProfile,
  onOpenAttendance,
  onOpenFees,
  onOpenMessages
}) => {
  const student =
    child?.student ||
    {};

  const link =
    child?.link ||
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

  const profileAllowed =
    hasPermission(
      child,
      "studentProfile"
    );

  const attendanceAllowed =
    hasPermission(
      child,
      "attendance"
    );

  const feesAllowed =
    hasPermission(
      child,
      "fees"
    );

  const messagesAllowed =
    hasPermission(
      child,
      "messages"
    );

  return (
    <article
      className={`overflow-hidden rounded-[28px] border bg-white shadow-sm transition ${
        active
          ? "border-brand-300 ring-4 ring-brand-50"
          : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <div className="relative overflow-hidden bg-slate-950 px-5 py-5 text-white">
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-brand-500/20 blur-2xl" />

        <div className="relative flex items-start gap-4">
          <button
            type="button"
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-black ring-1 ${
              active
                ? "bg-brand-500 text-white ring-brand-300/40"
                : "bg-white/10 text-white ring-white/15"
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
              <h2 className="truncate text-base font-black">
                {student.name ||
                  "Student"}
              </h2>

              {active && (
                <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-300/20">
                  Active
                </span>
              )}
            </div>

            <p className="mt-1 text-xs font-medium text-slate-300">
              {formatClass(
                student
              )}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              Admission No:{" "}
              {student
                .admissionNumber ||
                "Not assigned"}
            </p>
          </div>

          {link.isPrimary && (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/20"
              title="Primary guardian link"
            >
              <BadgeCheck
                size={18}
              />
            </div>
          )}
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-slate-200 ring-1 ring-white/10">
            {getRelationshipLabel(
              child
            )}
          </span>

          <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-200 ring-1 ring-emerald-300/15">
            {link.verificationStatus ===
            "verified"
              ? "Verified Link"
              : "Active Link"}
          </span>

          {link.isEmergencyContact && (
            <span className="rounded-full bg-rose-400/10 px-3 py-1.5 text-[10px] font-bold text-rose-200 ring-1 ring-rose-300/15">
              Emergency Contact
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-3">
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
                className={`text-[10px] font-bold uppercase tracking-wide ${attendanceTone.text}`}
              >
                Attendance
              </p>
            </div>

            <p className="mt-2 text-xl font-black text-slate-900">
              {Number(
                attendance
                  .attendancePercentage ||
                0
              ).toFixed(1)}
              %
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

              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Fee Balance
              </p>
            </div>

            <p className="mt-2 truncate text-xl font-black text-slate-900">
              {formatCurrency(
                fees.totalBalance
              )}
            </p>

            <p className="mt-0.5 text-[10px] font-semibold text-amber-700">
              Outstanding
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InformationRow
            icon={
              UserRound
            }
            label="Guardian"
            value={
              student.guardianName ||
              student.fatherName
            }
          />

          <InformationRow
            icon={
              Phone
            }
            label="Contact"
            value={
              student.guardianContact ||
              student.contactNumber
            }
          />

          <InformationRow
            icon={
              Cake
            }
            label="Date of Birth"
            value={
              formatDate(
                student.dateOfBirth
              )
            }
          />

          <InformationRow
            icon={
              MapPin
            }
            label="Address"
            value={
              student.address
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50 py-3">
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
              Classes
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

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={
              !profileAllowed
            }
            onClick={
              onOpenProfile
            }
          >
            <UserRound
              size={16}
            />

            Profile
          </button>

          <button
            type="button"
            className="btn-secondary"
            disabled={
              !attendanceAllowed
            }
            onClick={
              onOpenAttendance
            }
          >
            <CalendarCheck2
              size={16}
            />

            Attendance
          </button>

          <button
            type="button"
            className="btn-secondary"
            disabled={
              !feesAllowed
            }
            onClick={
              onOpenFees
            }
          >
            <ReceiptText
              size={16}
            />

            Fees
          </button>

          <button
            type="button"
            className="btn-secondary"
            disabled={
              !messagesAllowed
            }
            onClick={
              onOpenMessages
            }
          >
            <MessageCircle
              size={16}
            />

            Message
          </button>
        </div>
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Parent Children Page
|--------------------------------------------------------------------------
*/

const ParentChildren =
  () => {
    const navigate =
      useNavigate();

    const {
      children,
      selectedChildId,
      setSelectedChildId,
      overview
    } = useOutletContext();

    const [
      search,
      setSearch
    ] = useState("");

    const [
      filter,
      setFilter
    ] = useState(
      "all"
    );

    const filteredChildren =
      useMemo(
        () => {
          const normalizedSearch =
            search
              .trim()
              .toLowerCase();

          return children.filter(
            (child) => {
              const student =
                child?.student ||
                {};

              const link =
                child?.link ||
                {};

              const searchText = [
                student.name,
                student.admissionNumber,
                student.class
                  ?.className,
                student.sectionName,
                student.guardianName,
                student.fatherName,
                link.relationshipLabel
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              const matchesSearch =
                !normalizedSearch ||
                searchText.includes(
                  normalizedSearch
                );

              const matchesFilter =
                filter ===
                  "all" ||
                (
                  filter ===
                    "primary" &&
                  Boolean(
                    link.isPrimary
                  )
                ) ||
                (
                  filter ===
                    "outstanding" &&
                  Number(
                    child?.summary
                      ?.fees
                      ?.totalBalance ||
                    0
                  ) >
                    0
                ) ||
                (
                  filter ===
                    "attendance" &&
                  Number(
                    child?.summary
                      ?.attendance
                      ?.attendancePercentage ||
                    0
                  ) <
                    75
                );

              return (
                matchesSearch &&
                matchesFilter
              );
            }
          );
        },
        [
          children,
          search,
          filter
        ]
      );

    const pageSummary =
      useMemo(
        () => {
          return children.reduce(
            (
              result,
              child
            ) => {
              if (
                child?.link
                  ?.isPrimary
              ) {
                result.primaryLinks +=
                  1;
              }

              if (
                child?.link
                  ?.verificationStatus ===
                "verified"
              ) {
                result.verifiedLinks +=
                  1;
              }

              result.totalOutstanding +=
                Number(
                  child?.summary
                    ?.fees
                    ?.totalBalance ||
                  0
                );

              return result;
            },
            {
              primaryLinks: 0,
              verifiedLinks: 0,
              totalOutstanding: 0
            }
          );
        },
        [
          children
        ]
      );

    if (
      children.length ===
      0
    ) {
      return (
        <div className="card grid min-h-[500px] place-items-center p-8 text-center">
          <div className="max-w-xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-brand-50 text-brand-700">
              <UsersRound
                size={34}
              />
            </div>

            <h2 className="mt-6 text-xl font-black text-slate-900">
              No linked children found
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              Your parent account is active, but no student profile is currently connected. Ask the school administrator to create an active and verified parent–student link.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <ShieldCheck
                size={18}
              />

              Only verified links are displayed
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/*
        |--------------------------------------------------------------------------
        | Page Introduction
        |--------------------------------------------------------------------------
        */}

        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-600 px-5 py-6 text-white shadow-xl sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-white">
                <UsersRound
                  size={14}
                />

                Family Profiles
              </div>

              <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                My Children
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
                View every student linked to your account, switch the active child and open attendance, fees, academics or principal messaging.
              </p>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur sm:min-w-[280px]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                  <ShieldCheck
                    size={21}
                  />
                </div>

                <div>
                  <p className="text-sm font-black">
                    Secure Parent Access
                  </p>

                  <p className="mt-0.5 text-xs text-white/70">
                    {overview?.parent
                      ?.name ||
                      "Verified parent account"}
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
              children.length
            }
            helper="All students connected to this parent account."
            icon={
              UsersRound
            }
            iconClassName="bg-brand-50 text-brand-700"
          />

          <SummaryCard
            title="Verified Links"
            value={
              pageSummary.verifiedLinks ||
              children.length
            }
            helper="Parent–student links approved by the school."
            icon={
              CheckCircle2
            }
            iconClassName="bg-emerald-50 text-emerald-700"
          />

          <SummaryCard
            title="Primary Links"
            value={
              pageSummary.primaryLinks
            }
            helper="Students for whom you are the primary guardian."
            icon={
              BadgeCheck
            }
            iconClassName="bg-cyan-50 text-cyan-700"
          />

          <SummaryCard
            title="Outstanding Fees"
            value={
              formatCurrency(
                pageSummary.totalOutstanding
              )
            }
            helper="Combined unpaid balance for all linked children."
            icon={
              CircleDollarSign
            }
            iconClassName="bg-amber-50 text-amber-700"
          />
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Search and Filters
        |--------------------------------------------------------------------------
        */}

        <section className="card p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search
                size={18}
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
                className="field-input h-11 pl-11"
                placeholder="Search by student name, admission number, class or guardian…"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                {
                  value:
                    "all",
                  label:
                    "All Children"
                },

                {
                  value:
                    "primary",
                  label:
                    "Primary Guardian"
                },

                {
                  value:
                    "outstanding",
                  label:
                    "Fee Outstanding"
                },

                {
                  value:
                    "attendance",
                  label:
                    "Low Attendance"
                }
              ].map(
                (item) => (
                  <button
                    key={
                      item.value
                    }
                    type="button"
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                      filter ===
                      item.value
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                    onClick={() =>
                      setFilter(
                        item.value
                      )
                    }
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Student Cards
        |--------------------------------------------------------------------------
        */}

        {filteredChildren.length >
        0 ? (
          <section className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredChildren.map(
              (child) => {
                const studentId =
                  child?.student
                    ?.id;

                const active =
                  String(
                    studentId
                  ) ===
                  String(
                    selectedChildId
                  );

                const selectAndNavigate =
                  (
                    path
                  ) => {
                    setSelectedChildId(
                      studentId
                    );

                    navigate(
                      path
                    );
                  };

                return (
                  <StudentCard
                    key={
                      studentId
                    }
                    child={
                      child
                    }
                    active={
                      active
                    }
                    onSelect={() =>
                      setSelectedChildId(
                        studentId
                      )
                    }
                    onOpenProfile={() =>
                      selectAndNavigate(
                        `/parent-portal/children/${studentId}`
                      )
                    }
                    onOpenAttendance={() =>
                      selectAndNavigate(
                        "/parent-portal/attendance"
                      )
                    }
                    onOpenFees={() =>
                      selectAndNavigate(
                        "/parent-portal/fees"
                      )
                    }
                    onOpenMessages={() =>
                      selectAndNavigate(
                        `/parent-portal/messages?studentId=${encodeURIComponent(
                          studentId
                        )}`
                      )
                    }
                  />
                );
              }
            )}
          </section>
        ) : (
          <section className="card grid min-h-[360px] place-items-center p-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                <Search
                  size={27}
                />
              </div>

              <h3 className="mt-5 text-lg font-black text-slate-900">
                No matching child found
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Change the search text or select a different filter to view linked students.
              </p>

              <button
                type="button"
                className="btn-secondary mt-5"
                onClick={() => {
                  setSearch("");
                  setFilter(
                    "all"
                  );
                }}
              >
                Clear Search
              </button>
            </div>
          </section>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Parent Access Information
        |--------------------------------------------------------------------------
        */}

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="card p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <GraduationCap
                size={20}
              />
            </div>

            <h3 className="mt-4 text-sm font-black text-slate-900">
              Academic Information
            </h3>

            <p className="mt-2 text-xs leading-6 text-slate-500">
              Review class placement, subjects, assigned teachers and future examination results for each child.
            </p>

            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand-700"
              onClick={() =>
                navigate(
                  "/parent-portal/academics"
                )
              }
            >
              Open academics

              <ArrowRight
                size={14}
              />
            </button>
          </div>

          <div className="card p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CalendarDays
                size={20}
              />
            </div>

            <h3 className="mt-4 text-sm font-black text-slate-900">
              Daily Monitoring
            </h3>

            <p className="mt-2 text-xs leading-6 text-slate-500">
              Track attendance and view the published class timetable without contacting the school office.
            </p>

            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-700"
              onClick={() =>
                navigate(
                  "/parent-portal/timetable"
                )
              }
            >
              Open timetable

              <ArrowRight
                size={14}
              />
            </button>
          </div>

          <div className="card p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <MessageCircle
                size={20}
              />
            </div>

            <h3 className="mt-4 text-sm font-black text-slate-900">
              Principal Communication
            </h3>

            <p className="mt-2 text-xs leading-6 text-slate-500">
              Start a secure child-specific conversation about academics, attendance, fees, health or other concerns.
            </p>

            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-amber-700"
              onClick={() =>
                navigate(
                  "/parent-portal/messages"
                )
              }
            >
              Open messages

              <ArrowRight
                size={14}
              />
            </button>
          </div>
        </section>
      </div>
    );
  };

export default ParentChildren;