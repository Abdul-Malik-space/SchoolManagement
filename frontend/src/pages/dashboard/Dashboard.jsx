import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  Layers3,
  Loader2,
  RefreshCw,
  School,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  XCircle
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  getDashboardSummary
} from "../../api/dashboard";

import {
  getSchools
} from "../../api/schools";

import {
  useAuth
} from "../../context/AuthContext";

import {
  PageHeader
} from "../../components/ui/PageHeader";

/*
|--------------------------------------------------------------------------
| Chart Colours
|--------------------------------------------------------------------------
*/

const CHART_COLOURS = {
  collected: "#059669",
  payable: "#2563eb",
  pending: "#e11d48",

  present: "#10b981",
  absent: "#f43f5e",
  leave: "#f59e0b",

  students: "#7c3aed"
};

/*
|--------------------------------------------------------------------------
| Card Styles
|--------------------------------------------------------------------------
*/

const CARD_TONES = {
  blue: {
    card:
      "border-sky-100 bg-gradient-to-br from-white to-sky-50",
    icon:
      "bg-sky-100 text-sky-700",
    value:
      "text-sky-700",
    detail:
      "text-sky-600"
  },

  violet: {
    card:
      "border-violet-100 bg-gradient-to-br from-white to-violet-50",
    icon:
      "bg-violet-100 text-violet-700",
    value:
      "text-violet-700",
    detail:
      "text-violet-600"
  },

  amber: {
    card:
      "border-amber-100 bg-gradient-to-br from-white to-amber-50",
    icon:
      "bg-amber-100 text-amber-700",
    value:
      "text-amber-700",
    detail:
      "text-amber-600"
  },

  emerald: {
    card:
      "border-emerald-100 bg-gradient-to-br from-white to-emerald-50",
    icon:
      "bg-emerald-100 text-emerald-700",
    value:
      "text-emerald-700",
    detail:
      "text-emerald-600"
  },

  rose: {
    card:
      "border-rose-100 bg-gradient-to-br from-white to-rose-50",
    icon:
      "bg-rose-100 text-rose-700",
    value:
      "text-rose-700",
    detail:
      "text-rose-600"
  },

  indigo: {
    card:
      "border-indigo-100 bg-gradient-to-br from-white to-indigo-50",
    icon:
      "bg-indigo-100 text-indigo-700",
    value:
      "text-indigo-700",
    detail:
      "text-indigo-600"
  }
};

/*
|--------------------------------------------------------------------------
| Formatting Helpers
|--------------------------------------------------------------------------
*/

const getTodayInputValue = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getCurrentMonthValue = () => {
  return getTodayInputValue().slice(
    0,
    7
  );
};

const formatNumber = (value) => {
  return Number(
    value || 0
  ).toLocaleString("en-US");
};

const formatCompactNumber = (
  value
) => {
  return new Intl.NumberFormat(
    "en-US",
    {
      notation: "compact",
      maximumFractionDigits: 1
    }
  ).format(Number(value || 0));
};

const formatCurrency = (value) => {
  return `Rs ${formatNumber(value)}`;
};

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  ).format(date);
};

const formatDateTime = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
};

const formatLabel = (value) => {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

/*
|--------------------------------------------------------------------------
| Status Styles
|--------------------------------------------------------------------------
*/

const getPaymentStatusClass = (
  status
) => {
  if (status === "paid") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "partial") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-rose-50 text-rose-700";
};

const getAuditActionClass = (
  action
) => {
  if (
    [
      "CREATE",
      "RESTORE",
      "LOGIN"
    ].includes(action)
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    [
      "DELETE",
      "LOGOUT"
    ].includes(action)
  ) {
    return "bg-rose-50 text-rose-700";
  }

  if (
    [
      "UPDATE",
      "STATUS_CHANGE",
      "PASSWORD_CHANGE",
      "PAYMENT"
    ].includes(action)
  ) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
};

/*
|--------------------------------------------------------------------------
| Chart Tooltip Style
|--------------------------------------------------------------------------
*/

const TOOLTIP_STYLE = {
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  boxShadow:
    "0 10px 30px rgba(15, 23, 42, 0.08)",
  fontSize: "12px"
};

/*
|--------------------------------------------------------------------------
| Dashboard Stat Card
|--------------------------------------------------------------------------
*/

const DashboardStatCard = ({
  label,
  value,
  icon: Icon,
  tone,
  detail,
  onClick
}) => {
  const styles =
    CARD_TONES[tone] ||
    CARD_TONES.blue;

  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition duration-200 sm:p-5 ${
        styles.card
      } ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
          : "cursor-default"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
        >
          <Icon size={21} />
        </div>

        {onClick && (
          <ArrowUpRight
            size={17}
            className="text-slate-300 transition group-hover:text-slate-500"
          />
        )}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold ${styles.value}`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-xs ${styles.detail}`}
      >
        {detail}
      </p>
    </button>
  );
};

/*
|--------------------------------------------------------------------------
| Section Header
|--------------------------------------------------------------------------
*/

const SectionHeader = ({
  title,
  description,
  icon: Icon
}) => {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-bold text-slate-800">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        )}
      </div>

      {Icon && (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
          <Icon size={17} />
        </div>
      )}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Empty Chart
|--------------------------------------------------------------------------
*/

const EmptyChart = ({
  message
}) => {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center text-center">
      <TrendingUp
        size={30}
        className="text-slate-200"
      />

      <p className="mt-3 text-sm font-semibold text-slate-500">
        No chart data available
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {message}
      </p>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Loading Dashboard
|--------------------------------------------------------------------------
*/

const DashboardLoading = () => {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({
          length: 5
        }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />

        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Dashboard Component
|--------------------------------------------------------------------------
*/

const Dashboard = () => {
  const navigate = useNavigate();

  const {
    user: currentUser
  } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | Permissions
  |--------------------------------------------------------------------------
  */

  const isSuperAdmin =
    currentUser?.role ===
    "super_admin";

  const canViewFees = [
    "super_admin",
    "principal",
    "accountant"
  ].includes(currentUser?.role);

  const canViewAuditLogs = [
    "super_admin",
    "principal"
  ].includes(currentUser?.role);

  /*
  |--------------------------------------------------------------------------
  | Data State
  |--------------------------------------------------------------------------
  */

  const [
    summary,
    setSummary
  ] = useState(null);

  const [
    schools,
    setSchools
  ] = useState([]);

  /*
  |--------------------------------------------------------------------------
  | UI State
  |--------------------------------------------------------------------------
  */

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
  | Filters
  |--------------------------------------------------------------------------
  */

  const [
    filters,
    setFilters
  ] = useState({
    schoolId: "",
    month:
      getCurrentMonthValue(),
    date:
      getTodayInputValue()
  });

  /*
  |--------------------------------------------------------------------------
  | Load Schools for Super Admin
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!isSuperAdmin) {
      setSchools([]);
      return;
    }

    const loadSchools =
      async () => {
        try {
          const { data } =
            await getSchools();

          setSchools(
            data?.schools || []
          );
        } catch {
          setSchools([]);
        }
      };

    loadSchools();
  }, [isSuperAdmin]);

  /*
  |--------------------------------------------------------------------------
  | API Parameters
  |--------------------------------------------------------------------------
  */

  const requestParams =
    useMemo(() => {
      const params = {
        month: filters.month,
        date: filters.date
      };

      if (
        isSuperAdmin &&
        filters.schoolId
      ) {
        params.schoolId =
          filters.schoolId;
      }

      return params;
    }, [
      filters,
      isSuperAdmin
    ]);

  /*
  |--------------------------------------------------------------------------
  | Fetch Summary
  |--------------------------------------------------------------------------
  */

  const fetchSummary =
    useCallback(
      async ({
        silent = false
      } = {}) => {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const { data } =
            await getDashboardSummary(
              requestParams
            );

          setSummary(
            data?.summary ||
              null
          );
        } catch (
          requestError
        ) {
          setSummary(null);

          setError(
            requestError.response
              ?.data?.message ||
              requestError.response
                ?.data?.error ||
              "Dashboard data could not be loaded."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [requestParams]
    );

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  /*
  |--------------------------------------------------------------------------
  | Update Filter
  |--------------------------------------------------------------------------
  */

  const updateFilter =
    (field) => (event) => {
      setFilters(
        (current) => ({
          ...current,
          [field]:
            event.target.value
        })
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Dashboard Data
  |--------------------------------------------------------------------------
  */

  const attendance =
    summary?.todayAttendance || {
      present: 0,
      absent: 0,
      leave: 0,
      total: 0,
      attendanceRate: 0
    };

  const attendanceTrend =
    summary?.charts
      ?.attendanceTrend || [];

  const feeCollectionTrend =
    summary?.charts
      ?.feeCollectionTrend || [];

  const classDistribution =
    summary?.charts
      ?.studentDistributionByClass ||
    [];

  const recentAdmissions =
    summary?.recentAdmissions ||
    [];

  const recentFeeCollections =
    summary?.recentFeeCollections ||
    [];

  const recentActivities =
    summary?.recentActivities ||
    [];

  const attendancePieData = [
    {
      name: "Present",
      value:
        attendance.present || 0,
      colour:
        CHART_COLOURS.present
    },
    {
      name: "Absent",
      value:
        attendance.absent || 0,
      colour:
        CHART_COLOURS.absent
    },
    {
      name: "Leave",
      value:
        attendance.leave || 0,
      colour:
        CHART_COLOURS.leave
    }
  ];

  const hasAttendancePieData =
    attendancePieData.some(
      (item) => item.value > 0
    );

  const hasAttendanceTrend =
    attendanceTrend.some(
      (item) => item.total > 0
    );

  const hasFeeTrend =
    feeCollectionTrend.some(
      (item) =>
        item.payable > 0 ||
        item.collected > 0 ||
        item.pending > 0
    );

  const hasClassDistribution =
    classDistribution.some(
      (item) =>
        item.students > 0
    );

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div>
      <PageHeader
        title="Dashboard"
        action={
          <button
            type="button"
            className="btn-secondary"
            disabled={refreshing}
            onClick={() =>
              fetchSummary({
                silent: true
              })
            }
          >
            {refreshing ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <RefreshCw
                size={16}
              />
            )}

            Refresh
          </button>
        }
      />

      {/*
      |--------------------------------------------------------------------------
      | Dashboard Filters
      |--------------------------------------------------------------------------
      */}

      <div className="card mb-5 p-4">
        <div
          className={`grid gap-3 ${
            isSuperAdmin
              ? "md:grid-cols-3"
              : "md:grid-cols-2"
          }`}
        >
          {isSuperAdmin && (
            <div>
              <label className="field-label">
                School
              </label>

              <select
                className="field-select"
                value={
                  filters.schoolId
                }
                onChange={updateFilter(
                  "schoolId"
                )}
              >
                <option value="">
                  All schools
                </option>

                {schools.map(
                  (schoolItem) => (
                    <option
                      key={
                        schoolItem._id
                      }
                      value={
                        schoolItem._id
                      }
                    >
                      {
                        schoolItem.schoolName
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          <div>
            <label className="field-label">
              Fee month
            </label>

            <input
              type="month"
              className="field-input"
              value={
                filters.month
              }
              onChange={updateFilter(
                "month"
              )}
            />
          </div>

          <div>
            <label className="field-label">
              Attendance date
            </label>

            <input
              type="date"
              className="field-input"
              value={
                filters.date
              }
              onChange={updateFilter(
                "date"
              )}
            />
          </div>
        </div>
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Error
      |--------------------------------------------------------------------------
      */}

      {error && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>
            {error}
          </span>

          <button
            type="button"
            className="font-semibold"
            onClick={() =>
              fetchSummary()
            }
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <DashboardLoading />
      ) : (
        <>
          {/*
          |--------------------------------------------------------------------------
          | Main Statistics
          |--------------------------------------------------------------------------
          */}

          <div
            className={
              isSuperAdmin
                ? "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6"
                : "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5"
            }
          >
            {isSuperAdmin && (
              <DashboardStatCard
                label="Schools"
                value={
                  summary
                    ?.totalSchools ??
                  0
                }
                icon={Building2}
                tone="indigo"
                detail="Active schools"
                onClick={() =>
                  navigate(
                    "/schools"
                  )
                }
              />
            )}

            <DashboardStatCard
              label="Students"
              value={
                summary
                  ?.totalStudents ??
                0
              }
              icon={
                GraduationCap
              }
              tone="blue"
              detail="Active students"
              onClick={() =>
                navigate(
                  "/students"
                )
              }
            />

            <DashboardStatCard
              label="Teachers"
              value={
                summary
                  ?.totalTeachers ??
                0
              }
              icon={Users}
              tone="violet"
              detail="Active teachers"
              onClick={() =>
                navigate(
                  "/teachers"
                )
              }
            />

            <DashboardStatCard
              label="Classes"
              value={
                summary
                  ?.totalClasses ??
                0
              }
              icon={School}
              tone="amber"
              detail="Active classes"
              onClick={() =>
                navigate(
                  "/classes"
                )
              }
            />

            <DashboardStatCard
              label="Attendance"
              value={`${attendance.attendanceRate || 0}%`}
              icon={
                CheckCircle2
              }
              tone="emerald"
              detail={`${attendance.present || 0} present today`}
              onClick={() =>
                navigate(
                  "/attendance"
                )
              }
            />

            <DashboardStatCard
              label="Subjects"
              value={
                summary
                  ?.totalSubjects ??
                0
              }
              icon={BookOpen}
              tone="rose"
              detail="Active subjects"
              onClick={() =>
                navigate(
                  "/subjects"
                )
              }
            />
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Fee Overview Cards
          |--------------------------------------------------------------------------
          */}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Wallet
                    size={19}
                  />
                </div>

                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Collected
                </span>
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Monthly Revenue
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {formatCurrency(
                  summary
                    ?.monthlyRevenue
                )}
              </p>

              <p className="mt-1 text-xs text-emerald-600">
                {
                  summary
                    ?.collectionRate ??
                  0
                }
                % collection rate
              </p>
            </div>

            <div className="card border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <CircleDollarSign
                    size={19}
                  />
                </div>

                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  Payable
                </span>
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Monthly Payable
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-700">
                {formatCurrency(
                  summary
                    ?.monthlyPayable
                )}
              </p>

              <p className="mt-1 text-xs text-blue-600">
                {
                  summary
                    ?.totalFeeInvoices ??
                  0
                }{" "}
                invoice(s)
              </p>
            </div>

            <div className="card border-rose-100 bg-gradient-to-br from-white to-rose-50 p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                  <Clock3
                    size={19}
                  />
                </div>

                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                  Balance
                </span>
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Pending Fees
              </p>

              <p className="mt-1 text-2xl font-bold text-rose-700">
                {formatCurrency(
                  summary
                    ?.pendingFees
                )}
              </p>

              <p className="mt-1 text-xs text-rose-600">
                {
                  summary
                    ?.feeStatus
                    ?.unpaid ??
                  0
                }{" "}
                unpaid invoice(s)
              </p>
            </div>

            <div className="card border-amber-100 bg-gradient-to-br from-white to-amber-50 p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Layers3
                    size={19}
                  />
                </div>

                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  Status
                </span>
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Fee Invoices
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Paid{" "}
                  {
                    summary
                      ?.feeStatus
                      ?.paid ??
                    0
                  }
                </span>

                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  Partial{" "}
                  {
                    summary
                      ?.feeStatus
                      ?.partial ??
                    0
                  }
                </span>

                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                  Unpaid{" "}
                  {
                    summary
                      ?.feeStatus
                      ?.unpaid ??
                    0
                  }
                </span>
              </div>
            </div>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Fee and Attendance Charts
          |--------------------------------------------------------------------------
          */}

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {/* Fee Collection Chart */}

            <section className="card overflow-hidden">
              <SectionHeader
                title="Fee Collection Trend"
                description="Collected, payable and pending fees for the last six months"
                icon={Wallet}
              />

              <div className="h-[360px] p-4 sm:p-5">
                {hasFeeTrend ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <AreaChart
                      data={
                        feeCollectionTrend
                      }
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 0
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="collectedGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={
                              CHART_COLOURS.collected
                            }
                            stopOpacity={
                              0.32
                            }
                          />

                          <stop
                            offset="95%"
                            stopColor={
                              CHART_COLOURS.collected
                            }
                            stopOpacity={
                              0.02
                            }
                          />
                        </linearGradient>

                        <linearGradient
                          id="pendingGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={
                              CHART_COLOURS.pending
                            }
                            stopOpacity={
                              0.24
                            }
                          />

                          <stop
                            offset="95%"
                            stopColor={
                              CHART_COLOURS.pending
                            }
                            stopOpacity={
                              0.02
                            }
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#e2e8f0"
                      />

                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill:
                            "#64748b",
                          fontSize: 11
                        }}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={
                          formatCompactNumber
                        }
                        tick={{
                          fill:
                            "#64748b",
                          fontSize: 11
                        }}
                        width={55}
                      />

                      <Tooltip
                        contentStyle={
                          TOOLTIP_STYLE
                        }
                        formatter={(
                          value,
                          name
                        ) => [
                          formatCurrency(
                            value
                          ),
                          formatLabel(
                            name
                          )
                        ]}
                      />

                      <Legend
                        iconType="circle"
                        wrapperStyle={{
                          fontSize:
                            "12px"
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="collected"
                        name="Collected"
                        stroke={
                          CHART_COLOURS.collected
                        }
                        strokeWidth={2.5}
                        fill="url(#collectedGradient)"
                      />

                      <Area
                        type="monotone"
                        dataKey="pending"
                        name="Pending"
                        stroke={
                          CHART_COLOURS.pending
                        }
                        strokeWidth={2.5}
                        fill="url(#pendingGradient)"
                      />

                      <Line
                        type="monotone"
                        dataKey="payable"
                        name="Payable"
                        stroke={
                          CHART_COLOURS.payable
                        }
                        strokeWidth={2}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Fee invoices and payments will appear here." />
                )}
              </div>
            </section>

            {/* Attendance Trend */}

            <section className="card overflow-hidden">
              <SectionHeader
                title="Attendance Trend"
                description="Student attendance record for the last seven days"
                icon={Activity}
              />

              <div className="h-[360px] p-4 sm:p-5">
                {hasAttendanceTrend ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={
                        attendanceTrend
                      }
                      margin={{
                        top: 10,
                        right: 10,
                        left: -15,
                        bottom: 0
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="#e2e8f0"
                      />

                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill:
                            "#64748b",
                          fontSize: 11
                        }}
                      />

                      <YAxis
                        allowDecimals={
                          false
                        }
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill:
                            "#64748b",
                          fontSize: 11
                        }}
                      />

                      <Tooltip
                        contentStyle={
                          TOOLTIP_STYLE
                        }
                        formatter={(
                          value,
                          name
                        ) => [
                          formatNumber(
                            value
                          ),
                          formatLabel(
                            name
                          )
                        ]}
                      />

                      <Legend
                        iconType="circle"
                        wrapperStyle={{
                          fontSize:
                            "12px"
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="present"
                        name="Present"
                        stroke={
                          CHART_COLOURS.present
                        }
                        strokeWidth={3}
                        dot={{
                          r: 3
                        }}
                        activeDot={{
                          r: 5
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="absent"
                        name="Absent"
                        stroke={
                          CHART_COLOURS.absent
                        }
                        strokeWidth={2.5}
                        dot={{
                          r: 3
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="leave"
                        name="Leave"
                        stroke={
                          CHART_COLOURS.leave
                        }
                        strokeWidth={2.5}
                        dot={{
                          r: 3
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Attendance records for the selected period will appear here." />
                )}
              </div>
            </section>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Attendance Donut and Class Distribution
          |--------------------------------------------------------------------------
          */}

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            {/* Attendance Donut */}

            <section className="card overflow-hidden">
              <SectionHeader
                title="Daily Attendance"
                description={formatDate(
                  summary
                    ?.attendanceDate
                )}
                icon={
                  CheckCircle2
                }
              />

              <div className="p-5">
                {hasAttendancePieData ? (
                  <>
                    <div className="relative h-[240px]">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <PieChart>
                          <Pie
                            data={
                              attendancePieData
                            }
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={66}
                            outerRadius={92}
                            paddingAngle={4}
                          >
                            {attendancePieData.map(
                              (
                                item
                              ) => (
                                <Cell
                                  key={
                                    item.name
                                  }
                                  fill={
                                    item.colour
                                  }
                                />
                              )
                            )}
                          </Pie>

                          <Tooltip
                            contentStyle={
                              TOOLTIP_STYLE
                            }
                            formatter={(
                              value,
                              name
                            ) => [
                              formatNumber(
                                value
                              ),
                              name
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-3xl font-bold text-slate-800">
                          {
                            attendance.attendanceRate
                          }
                          %
                        </p>

                        <p className="text-xs text-slate-400">
                          Attendance
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-emerald-50 p-3 text-center">
                        <p className="text-lg font-bold text-emerald-700">
                          {
                            attendance.present
                          }
                        </p>

                        <p className="text-xs text-emerald-600">
                          Present
                        </p>
                      </div>

                      <div className="rounded-xl bg-rose-50 p-3 text-center">
                        <p className="text-lg font-bold text-rose-700">
                          {
                            attendance.absent
                          }
                        </p>

                        <p className="text-xs text-rose-600">
                          Absent
                        </p>
                      </div>

                      <div className="rounded-xl bg-amber-50 p-3 text-center">
                        <p className="text-lg font-bold text-amber-700">
                          {
                            attendance.leave
                          }
                        </p>

                        <p className="text-xs text-amber-600">
                          Leave
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyChart message="No attendance was marked on the selected date." />
                )}
              </div>
            </section>

            {/* Class Distribution */}

            <section className="card overflow-hidden xl:col-span-2">
              <SectionHeader
                title="Students by Class"
                description="Distribution of active students across classes"
                icon={
                  GraduationCap
                }
              />

              <div className="h-[365px] p-4 sm:p-5">
                {hasClassDistribution ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={
                        classDistribution
                      }
                      layout="vertical"
                      margin={{
                        top: 5,
                        right: 25,
                        left: 15,
                        bottom: 5
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        horizontal={
                          false
                        }
                        stroke="#e2e8f0"
                      />

                      <XAxis
                        type="number"
                        allowDecimals={
                          false
                        }
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill:
                            "#64748b",
                          fontSize: 11
                        }}
                      />

                      <YAxis
                        type="category"
                        dataKey="className"
                        width={95}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill:
                            "#475569",
                          fontSize: 11
                        }}
                      />

                      <Tooltip
                        contentStyle={
                          TOOLTIP_STYLE
                        }
                        formatter={(
                          value
                        ) => [
                          formatNumber(
                            value
                          ),
                          "Students"
                        ]}
                      />

                      <Bar
                        dataKey="students"
                        name="Students"
                        fill={
                          CHART_COLOURS.students
                        }
                        radius={[
                          0,
                          7,
                          7,
                          0
                        ]}
                        maxBarSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Assign students to classes to display this chart." />
                )}
              </div>
            </section>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Recent Admissions and Fee Collections
          |--------------------------------------------------------------------------
          */}

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {/* Recent Admissions */}

            <section className="card overflow-hidden">
              <SectionHeader
                title="Recent Admissions"
                description="Recently registered students"
                icon={
                  GraduationCap
                }
              />

              {recentAdmissions.length ===
              0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center p-5 text-center">
                  <GraduationCap
                    size={30}
                    className="text-slate-200"
                  />

                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    No recent admissions
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentAdmissions.map(
                    (
                      student
                    ) => (
                      <button
                        key={
                          student._id
                        }
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                        onClick={() =>
                          navigate(
                            `/students/${student._id}`
                          )
                        }
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                            <UserRound
                              size={18}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {
                                student.name
                              }
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-400">
                              {
                                student
                                  .classId
                                  ?.className ||
                                "No class"
                              }

                              {student.sectionName
                                ? ` · ${student.sectionName}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {
                              student.admissionNumber
                            }
                          </span>

                          <p className="mt-2 text-[11px] text-slate-400">
                            {formatDate(
                              student.createdAt
                            )}
                          </p>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </section>

            {/* Recent Fee Collections */}

            <section className="card overflow-hidden">
              <SectionHeader
                title="Recent Fee Collections"
                description="Latest fee invoices and payment updates"
                icon={Wallet}
              />

              {recentFeeCollections.length ===
              0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center p-5 text-center">
                  <Wallet
                    size={30}
                    className="text-slate-200"
                  />

                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    No fee collections
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentFeeCollections.map(
                    (
                      feeCollection
                    ) => (
                      <button
                        key={
                          feeCollection._id
                        }
                        type="button"
                        disabled={
                          !canViewFees
                        }
                        className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition ${
                          canViewFees
                            ? "hover:bg-slate-50"
                            : "cursor-default"
                        }`}
                        onClick={() => {
                          if (
                            canViewFees
                          ) {
                            navigate(
                              `/fee-collections/${feeCollection._id}`
                            );
                          }
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <CircleDollarSign
                              size={18}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {feeCollection
                                .studentId
                                ?.name ||
                                "Unknown student"}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-400">
                              {
                                feeCollection.invoiceNumber
                              }{" "}
                              ·{" "}
                              {
                                feeCollection.feeMonth
                              }
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-slate-800">
                            {formatCurrency(
                              feeCollection.paidAmount
                            )}
                          </p>

                          <span
                            className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPaymentStatusClass(
                              feeCollection.paymentStatus
                            )}`}
                          >
                            {formatLabel(
                              feeCollection.paymentStatus
                            )}
                          </span>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </section>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Recent Activities
          |--------------------------------------------------------------------------
          */}

          <section className="card mt-5 overflow-hidden">
            <SectionHeader
              title="Recent Activities"
              description="Latest system activity and audit records"
              icon={Activity}
            />

            {recentActivities.length ===
            0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center p-5 text-center">
                <Activity
                  size={30}
                  className="text-slate-200"
                />

                <p className="mt-3 text-sm font-semibold text-slate-500">
                  No recent activities
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivities.map(
                  (
                    activity
                  ) => (
                    <button
                      key={
                        activity._id
                      }
                      type="button"
                      disabled={
                        !canViewAuditLogs
                      }
                      className={`flex w-full flex-col gap-3 px-5 py-4 text-left transition sm:flex-row sm:items-center sm:justify-between ${
                        canViewAuditLogs
                          ? "hover:bg-slate-50"
                          : "cursor-default"
                      }`}
                      onClick={() => {
                        if (
                          canViewAuditLogs
                        ) {
                          navigate(
                            `/audit-logs/${activity._id}`
                          );
                        }
                      }}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <Activity
                            size={17}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800">
                              {activity.userName ||
                                activity
                                  .userId
                                  ?.name ||
                                "System user"}
                            </p>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getAuditActionClass(
                                activity.action
                              )}`}
                            >
                              {formatLabel(
                                activity.action
                              )}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {formatLabel(
                                activity.module
                              )}
                            </span>
                          </div>

                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                            {activity.description ||
                              "System activity recorded"}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                        <CalendarDays
                          size={14}
                        />

                        {formatDateTime(
                          activity.createdAt
                        )}
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;