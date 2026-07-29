import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  FileText,
  Filter,
  Landmark,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  Settings2,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  X
} from "lucide-react";

import api from "../../api/axios";

import {
  generatePayroll,
  getPayrolls
} from "../../api/payroll";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Date and Month Helpers
|--------------------------------------------------------------------------
*/

const MONTHS = [
  {
    value: 1,
    label: "January"
  },
  {
    value: 2,
    label: "February"
  },
  {
    value: 3,
    label: "March"
  },
  {
    value: 4,
    label: "April"
  },
  {
    value: 5,
    label: "May"
  },
  {
    value: 6,
    label: "June"
  },
  {
    value: 7,
    label: "July"
  },
  {
    value: 8,
    label: "August"
  },
  {
    value: 9,
    label: "September"
  },
  {
    value: 10,
    label: "October"
  },
  {
    value: 11,
    label: "November"
  },
  {
    value: 12,
    label: "December"
  }
];

const currentDate =
  new Date();

const currentMonth =
  currentDate.getMonth() + 1;

const currentYear =
  currentDate.getFullYear();

const getInitialFilters = () => ({
  schoolId: "",
  search: "",
  payrollMonth: "",
  payrollYear:
    String(currentYear),
  status: "",
  department: "",
  paymentMethod: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 10
});

const getInitialGenerationForm =
  () => ({
    schoolId: "",
    staffId: "",
    payrollMonth:
      currentMonth,

    payrollYear:
      currentYear,

    regenerateExisting:
      false
  });

/*
|--------------------------------------------------------------------------
| Formatting Helpers
|--------------------------------------------------------------------------
*/

const safeNumber = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

const formatMoney = (
  value,
  currency = "PKR"
) => {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",

        currency:
          currency || "PKR",

        currencyDisplay:
          "code",

        minimumFractionDigits:
          0,

        maximumFractionDigits:
          2
      }
    ).format(
      safeNumber(value)
    );
  } catch {
    return `PKR ${safeNumber(
      value
    ).toLocaleString(
      "en-US"
    )}`;
  }
};

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
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

const formatLabel = (
  value
) => {
  if (!value) {
    return "—";
  }

  return String(value)
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

const getInitials = (
  name
) => {
  return String(
    name || "Staff"
  )
    .split(" ")
    .filter(Boolean)
    .map(
      (part) => part[0]
    )
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getErrorMessage = (
  error,
  fallbackMessage
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.message ||
    fallbackMessage
  );
};

const getPeriodLabel = (
  payroll
) => {
  if (
    payroll?.periodLabel
  ) {
    return payroll.periodLabel;
  }

  const month =
    MONTHS.find(
      (item) =>
        Number(item.value) ===
        Number(
          payroll
            ?.payrollMonth
        )
    );

  return `${month?.label || "Month"} ${
    payroll?.payrollYear || ""
  }`;
};

/*
|--------------------------------------------------------------------------
| Response Normalizers
|--------------------------------------------------------------------------
*/

const extractSchools = (
  response
) => {
  const data =
    response?.data || {};

  return (
    [
      data.schools,
      data.data,
      data.results,
      data.records
    ].find(
      Array.isArray
    ) || []
  );
};

const extractStaff = (
  response
) => {
  const data =
    response?.data || {};

  return (
    [
      data.staff,
      data.staffMembers,
      data.employees,
      data.data,
      data.results,
      data.records
    ].find(
      Array.isArray
    ) || []
  );
};

/*
|--------------------------------------------------------------------------
| Status Badge
|--------------------------------------------------------------------------
*/

const PayrollStatusBadge = ({
  status
}) => {
  const normalizedStatus =
    String(
      status || ""
    ).toLowerCase();

  const styles = {
    draft:
      "bg-slate-100 text-slate-600 ring-slate-500/10",

    generated:
      "bg-blue-50 text-blue-700 ring-blue-600/10",

    pending_approval:
      "bg-amber-50 text-amber-700 ring-amber-600/10",

    approved:
      "bg-violet-50 text-violet-700 ring-violet-600/10",

    rejected:
      "bg-rose-50 text-rose-700 ring-rose-600/10",

    paid:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/10",

    cancelled:
      "bg-slate-100 text-slate-500 ring-slate-500/10"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
        styles[
          normalizedStatus
        ] ||
        styles.draft
      }`}
    >
      {formatLabel(
        normalizedStatus
      )}
    </span>
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
  subtitle,
  icon: Icon,
  tone = "default"
}) => {
  const tones = {
    default:
      "bg-brand-50 text-brand-700",

    warning:
      "bg-amber-50 text-amber-700",

    success:
      "bg-emerald-50 text-emerald-700",

    danger:
      "bg-rose-50 text-rose-600",

    violet:
      "bg-violet-50 text-violet-700"
  };

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p className="mt-2 truncate text-xl font-bold text-slate-800 sm:text-2xl">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            tones[tone] ||
            tones.default
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
| Loading Rows
|--------------------------------------------------------------------------
*/

const LoadingRows = ({
  columns
}) => {
  return Array.from({
    length: 6
  }).map((_, rowIndex) => (
    <tr
      key={rowIndex}
      className="border-b border-slate-100 last:border-0"
    >
      {Array.from({
        length: columns
      }).map(
        (
          __,
          columnIndex
        ) => (
          <td
            key={
              columnIndex
            }
            className="px-4 py-4"
          >
            <div className="h-4 animate-pulse rounded bg-slate-100" />
          </td>
        )
      )}
    </tr>
  ));
};

/*
|--------------------------------------------------------------------------
| Generation Result
|--------------------------------------------------------------------------
*/

const GenerationResult = ({
  result
}) => {
  if (!result) {
    return null;
  }

  const generated =
    Array.isArray(
      result.generated
    )
      ? result.generated
      : [];

  const regenerated =
    Array.isArray(
      result.regenerated
    )
      ? result.regenerated
      : [];

  const skipped =
    Array.isArray(
      result.skipped
    )
      ? result.skipped
      : [];

  const failed =
    Array.isArray(
      result.failed
    )
      ? result.failed
      : [];

  const hasFailures =
    failed.length > 0;

  return (
    <div
      className={`mt-5 rounded-xl border p-4 ${
        hasFailures
          ? "border-amber-200 bg-amber-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {hasFailures ? (
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0 text-amber-600"
          />
        ) : (
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0 text-emerald-700"
          />
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-bold ${
              hasFailures
                ? "text-amber-800"
                : "text-emerald-800"
            }`}
          >
            Payroll Generation
            Completed
          </p>

          <p
            className={`mt-1 text-xs leading-5 ${
              hasFailures
                ? "text-amber-700"
                : "text-emerald-700"
            }`}
          >
            {result.message ||
              "Payroll generation request has been processed."}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-white/70 px-3 py-2 text-center">
              <p className="text-lg font-bold text-emerald-700">
                {
                  generated.length
                }
              </p>

              <p className="text-[10px] font-semibold uppercase text-slate-500">
                Generated
              </p>
            </div>

            <div className="rounded-lg bg-white/70 px-3 py-2 text-center">
              <p className="text-lg font-bold text-blue-700">
                {
                  regenerated.length
                }
              </p>

              <p className="text-[10px] font-semibold uppercase text-slate-500">
                Regenerated
              </p>
            </div>

            <div className="rounded-lg bg-white/70 px-3 py-2 text-center">
              <p className="text-lg font-bold text-amber-700">
                {skipped.length}
              </p>

              <p className="text-[10px] font-semibold uppercase text-slate-500">
                Skipped
              </p>
            </div>

            <div className="rounded-lg bg-white/70 px-3 py-2 text-center">
              <p className="text-lg font-bold text-rose-700">
                {failed.length}
              </p>

              <p className="text-[10px] font-semibold uppercase text-slate-500">
                Failed
              </p>
            </div>
          </div>

          {skipped.length >
            0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-amber-800">
                Skipped Records
              </p>

              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                {skipped.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${item.staffId}-${index}`}
                      className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600"
                    >
                      <span className="font-semibold text-slate-700">
                        {item.staffName ||
                          item.employeeId ||
                          "Staff"}
                      </span>

                      {" — "}

                      {item.reason ||
                        "Payroll was skipped."}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {failed.length >
            0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-rose-700">
                Failed Records
              </p>

              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                {failed.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${item.staffId}-${index}`}
                      className="rounded-lg bg-white/70 px-3 py-2 text-xs text-rose-700"
                    >
                      <span className="font-semibold">
                        {item.staffName ||
                          item.employeeId ||
                          "Staff"}
                      </span>

                      {" — "}

                      {item.reason ||
                        "Payroll generation failed."}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Payroll Generation Modal
|--------------------------------------------------------------------------
*/

const GeneratePayrollModal = ({
  open,
  isSuperAdmin,
  schools,
  staffMembers,
  form,
  schoolsLoading,
  staffLoading,
  generating,
  generationResult,
  error,
  onClose,
  onChange,
  onSchoolChange,
  onSubmit
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 cursor-default"
        onClick={
          generating
            ? undefined
            : onClose
        }
      />

      <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <CircleDollarSign
                size={22}
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-800">
                Generate Monthly
                Payroll
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Generate payroll
                using salary
                structures and staff
                attendance records.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={generating}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="p-5"
        >
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {error}
              </span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {isSuperAdmin && (
              <label className="block md:col-span-2">
                <span className="field-label">
                  School

                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </span>

                <select
                  value={
                    form.schoolId
                  }
                  disabled={
                    schoolsLoading ||
                    generating
                  }
                  className="field-select mt-1.5"
                  onChange={(
                    event
                  ) =>
                    onSchoolChange(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="">
                    {schoolsLoading
                      ? "Loading schools..."
                      : "Select school"}
                  </option>

                  {schools.map(
                    (school) => (
                      <option
                        key={
                          school._id
                        }
                        value={
                          school._id
                        }
                      >
                        {school.schoolName ||
                          school.name}

                        {school.schoolCode
                          ? ` (${school.schoolCode})`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </label>
            )}

            <label className="block">
              <span className="field-label">
                Payroll Month

                <span className="ml-1 text-rose-500">
                  *
                </span>
              </span>

              <select
                value={
                  form.payrollMonth
                }
                disabled={
                  generating
                }
                className="field-select mt-1.5"
                onChange={(
                  event
                ) =>
                  onChange(
                    "payrollMonth",
                    Number(
                      event.target
                        .value
                    )
                  )
                }
              >
                {MONTHS.map(
                  (month) => (
                    <option
                      key={
                        month.value
                      }
                      value={
                        month.value
                      }
                    >
                      {month.label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="block">
              <span className="field-label">
                Payroll Year

                <span className="ml-1 text-rose-500">
                  *
                </span>
              </span>

              <input
                type="number"
                min="2000"
                max="2100"
                value={
                  form.payrollYear
                }
                disabled={
                  generating
                }
                className="field-input mt-1.5"
                onChange={(
                  event
                ) =>
                  onChange(
                    "payrollYear",
                    event.target
                      .value
                  )
                }
              />
            </label>

            <label className="block md:col-span-2">
              <span className="field-label">
                Staff Member
              </span>

              <select
                value={
                  form.staffId
                }
                disabled={
                  generating ||
                  staffLoading ||
                  (
                    isSuperAdmin &&
                    !form.schoolId
                  )
                }
                className="field-select mt-1.5"
                onChange={(
                  event
                ) =>
                  onChange(
                    "staffId",
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  {staffLoading
                    ? "Loading staff..."
                    : "All eligible staff members"}
                </option>

                {staffMembers.map(
                  (staff) => (
                    <option
                      key={
                        staff._id
                      }
                      value={
                        staff._id
                      }
                    >
                      {staff.name}

                      {staff.employeeId
                        ? ` — ${staff.employeeId}`
                        : ""}

                      {staff.designation
                        ? ` — ${staff.designation}`
                        : ""}
                    </option>
                  )
                )}
              </select>

              <span className="mt-1.5 block text-[11px] leading-4 text-slate-400">
                Leave this empty to
                generate payroll for
                all staff with active
                salary structures.
              </span>
            </label>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <input
              type="checkbox"
              checked={
                form.regenerateExisting
              }
              disabled={
                generating
              }
              onChange={(
                event
              ) =>
                onChange(
                  "regenerateExisting",
                  event.target
                    .checked
                )
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />

            <div>
              <p className="text-sm font-semibold text-slate-700">
                Regenerate existing
                payroll
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Draft, generated and
                rejected payroll
                records will be
                recalculated. Approved
                and paid records remain
                locked.
              </p>
            </div>
          </label>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <p className="text-xs leading-5 text-amber-700">
                Staff without an
                active salary
                structure will not be
                included. Incomplete
                attendance will appear
                as a payroll warning.
              </p>
            </div>
          </div>

          <GenerationResult
            result={
              generationResult
            }
          />

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={
                generating
              }
              onClick={onClose}
              className="btn-secondary"
            >
              {generationResult
                ? "Done"
                : "Cancel"}
            </button>

            <button
              type="submit"
              disabled={
                generating
              }
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              {generating ? (
                <RefreshCcw
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <CircleDollarSign
                  size={17}
                />
              )}

              {generating
                ? "Generating..."
                : generationResult
                  ? "Generate Again"
                  : "Generate Payroll"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Payroll List Page
|--------------------------------------------------------------------------
*/

export const PayrollList =
  () => {
    const navigate =
      useNavigate();

    const location =
      useLocation();

    const {
      user
    } = useAuth();

    /*
    |--------------------------------------------------------------------------
    | Permissions
    |--------------------------------------------------------------------------
    */

    const userRole =
      String(
        user?.role || ""
      ).toLowerCase();

    const isSuperAdmin =
      userRole ===
      "super_admin";

    const canProcessPayroll =
      [
        "super_admin",
        "principal",
        "accountant"
      ].includes(
        userRole
      );

    const canRecoverPayroll =
      [
        "super_admin",
        "principal"
      ].includes(
        userRole
      );

    const showSchoolColumn =
      isSuperAdmin;

    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */

    const [
      payrolls,
      setPayrolls
    ] = useState([]);

    const [
      summary,
      setSummary
    ] = useState({
      totalPayrolls: 0,
      draft: 0,
      generated: 0,
      pendingApproval: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
      cancelled: 0,
      grossPayroll: 0,
      totalDeductions: 0,
      netPayroll: 0,
      paidAmount: 0,
      outstandingAmount: 0
    });

    const [
      pagination,
      setPagination
    ] = useState({
      total: 0,
      page: 1,
      currentPage: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage:
        false
    });

    const [
      filters,
      setFilters
    ] = useState(
      getInitialFilters
    );

    const [
      debouncedSearch,
      setDebouncedSearch
    ] = useState("");

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
      successMessage,
      setSuccessMessage
    ] = useState("");

    const [
      reloadKey,
      setReloadKey
    ] = useState(0);

    /*
    |--------------------------------------------------------------------------
    | Payroll Generation State
    |--------------------------------------------------------------------------
    */

    const [
      generationModalOpen,
      setGenerationModalOpen
    ] = useState(false);

    const [
      generationForm,
      setGenerationForm
    ] = useState(
      getInitialGenerationForm
    );

    const [
      generationError,
      setGenerationError
    ] = useState("");

    const [
      generationResult,
      setGenerationResult
    ] = useState(null);

    const [
      generating,
      setGenerating
    ] = useState(false);

    const [
      schools,
      setSchools
    ] = useState([]);

    const [
      schoolsLoading,
      setSchoolsLoading
    ] = useState(false);

    const [
      staffMembers,
      setStaffMembers
    ] = useState([]);

    const [
      staffLoading,
      setStaffLoading
    ] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Navigation Success Message
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      const navigationMessage =
        location.state
          ?.successMessage;

      if (
        navigationMessage
      ) {
        setSuccessMessage(
          navigationMessage
        );

        navigate(
          location.pathname,
          {
            replace: true,
            state: null
          }
        );
      }
    }, [
      location.pathname,
      location.state,
      navigate
    ]);

    /*
    |--------------------------------------------------------------------------
    | Search Debounce
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      const timeoutId =
        window.setTimeout(
          () => {
            setDebouncedSearch(
              filters.search
                .trim()
            );
          },
          400
        );

      return () => {
        window.clearTimeout(
          timeoutId
        );
      };
    }, [
      filters.search
    ]);

    /*
    |--------------------------------------------------------------------------
    | Query Parameters
    |--------------------------------------------------------------------------
    */

    const queryParams =
      useMemo(
        () => ({
          schoolId:
            isSuperAdmin
              ? filters.schoolId
              : undefined,

          search:
            debouncedSearch,

          payrollMonth:
            filters
              .payrollMonth,

          payrollYear:
            filters
              .payrollYear,

          status:
            filters.status,

          department:
            filters.department
              .trim(),

          paymentMethod:
            filters
              .paymentMethod,

          sortBy:
            filters.sortBy,

          sortOrder:
            filters.sortOrder,

          page:
            filters.page,

          limit:
            filters.limit
        }),
        [
          isSuperAdmin,
          filters.schoolId,
          debouncedSearch,
          filters.payrollMonth,
          filters.payrollYear,
          filters.status,
          filters.department,
          filters.paymentMethod,
          filters.sortBy,
          filters.sortOrder,
          filters.page,
          filters.limit
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Load Payrolls
    |--------------------------------------------------------------------------
    */

    const loadPayrolls =
      useCallback(
        async (
          showMainLoader =
            false
        ) => {
          if (showMainLoader) {
            setLoading(true);
          }

          setError("");

          try {
            const response =
              await getPayrolls(
                queryParams
              );

            setPayrolls(
              Array.isArray(
                response?.payrolls
              )
                ? response.payrolls
                : []
            );

            setSummary({
              totalPayrolls:
                safeNumber(
                  response?.summary
                    ?.totalPayrolls
                ),

              draft:
                safeNumber(
                  response?.summary
                    ?.draft
                ),

              generated:
                safeNumber(
                  response?.summary
                    ?.generated
                ),

              pendingApproval:
                safeNumber(
                  response?.summary
                    ?.pendingApproval
                ),

              approved:
                safeNumber(
                  response?.summary
                    ?.approved
                ),

              rejected:
                safeNumber(
                  response?.summary
                    ?.rejected
                ),

              paid:
                safeNumber(
                  response?.summary
                    ?.paid
                ),

              cancelled:
                safeNumber(
                  response?.summary
                    ?.cancelled
                ),

              grossPayroll:
                safeNumber(
                  response?.summary
                    ?.grossPayroll
                ),

              totalDeductions:
                safeNumber(
                  response?.summary
                    ?.totalDeductions
                ),

              netPayroll:
                safeNumber(
                  response?.summary
                    ?.netPayroll
                ),

              paidAmount:
                safeNumber(
                  response?.summary
                    ?.paidAmount
                ),

              outstandingAmount:
                safeNumber(
                  response?.summary
                    ?.outstandingAmount
                )
            });

            setPagination({
              total:
                safeNumber(
                  response
                    ?.pagination
                    ?.total
                ),

              page:
                safeNumber(
                  response
                    ?.pagination
                    ?.page
                ) || 1,

              currentPage:
                safeNumber(
                  response
                    ?.pagination
                    ?.currentPage ||
                    response
                      ?.pagination
                      ?.page
                ) || 1,

              limit:
                safeNumber(
                  response
                    ?.pagination
                    ?.limit
                ) ||
                filters.limit,

              totalPages:
                safeNumber(
                  response
                    ?.pagination
                    ?.totalPages
                ) || 1,

              hasNextPage:
                Boolean(
                  response
                    ?.pagination
                    ?.hasNextPage
                ),

              hasPreviousPage:
                Boolean(
                  response
                    ?.pagination
                    ?.hasPreviousPage
                )
            });
          } catch (
            requestError
          ) {
            setPayrolls([]);

            setError(
              getErrorMessage(
                requestError,
                "Payroll records could not be loaded."
              )
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        [
          queryParams,
          filters.limit
        ]
      );

    useEffect(() => {
      loadPayrolls(true);
    }, [
      loadPayrolls,
      reloadKey
    ]);

    /*
    |--------------------------------------------------------------------------
    | Load Schools
    |--------------------------------------------------------------------------
    */

    const loadSchools =
      useCallback(
        async () => {
          if (!isSuperAdmin) {
            return;
          }

          setSchoolsLoading(
            true
          );

          try {
            const response =
              await api.get(
                "/schools",
                {
                  params: {
                    limit: 100,
                    status:
                      "active"
                  }
                }
              );

            setSchools(
              extractSchools(
                response
              )
            );
          } catch (
            requestError
          ) {
            setError(
              getErrorMessage(
                requestError,
                "Schools could not be loaded."
              )
            );
          } finally {
            setSchoolsLoading(
              false
            );
          }
        },
        [
          isSuperAdmin
        ]
      );

    useEffect(() => {
      loadSchools();
    }, [
      loadSchools
    ]);

    /*
    |--------------------------------------------------------------------------
    | Load Staff
    |--------------------------------------------------------------------------
    */

    const loadStaff =
      useCallback(
        async (
          schoolId = ""
        ) => {
          if (
            isSuperAdmin &&
            !schoolId
          ) {
            setStaffMembers(
              []
            );

            return;
          }

          setStaffLoading(true);

          try {
            const response =
              await api.get(
                "/staff",
                {
                  params: {
                    schoolId:
                      isSuperAdmin
                        ? schoolId
                        : undefined,

                    limit: 100,
                    sortBy: "name",
                    sortOrder: "asc"
                  }
                }
              );

            const records =
              extractStaff(
                response
              ).filter(
                (staff) =>
                  !staff.isDeleted &&
                  [
                    "active",
                    "on_leave"
                  ].includes(
                    String(
                      staff.status ||
                        "active"
                    ).toLowerCase()
                  )
              );

            setStaffMembers(
              records
            );
          } catch (
            requestError
          ) {
            setStaffMembers(
              []
            );

            setGenerationError(
              getErrorMessage(
                requestError,
                "Staff members could not be loaded."
              )
            );
          } finally {
            setStaffLoading(false);
          }
        },
        [
          isSuperAdmin
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Message Auto Clear
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (
        !successMessage
      ) {
        return undefined;
      }

      const timeoutId =
        window.setTimeout(
          () => {
            setSuccessMessage(
              ""
            );
          },
          4000
        );

      return () => {
        window.clearTimeout(
          timeoutId
        );
      };
    }, [
      successMessage
    ]);

    /*
    |--------------------------------------------------------------------------
    | Filter Handlers
    |--------------------------------------------------------------------------
    */

    const updateFilter = (
      key,
      value
    ) => {
      setFilters(
        (current) => ({
          ...current,

          [key]: value,

          page:
            key === "page"
              ? value
              : 1
        })
      );
    };

    const clearFilters =
      () => {
        setFilters(
          getInitialFilters()
        );

        setDebouncedSearch(
          ""
        );
      };

    const hasActiveFilters =
      Boolean(
        filters.schoolId ||
          filters.search ||
          filters.payrollMonth ||
          filters.status ||
          filters.department ||
          filters.paymentMethod ||
          String(
            filters.payrollYear
          ) !==
            String(currentYear)
      );

    /*
    |--------------------------------------------------------------------------
    | Refresh
    |--------------------------------------------------------------------------
    */

    const handleRefresh =
      () => {
        if (refreshing) {
          return;
        }

        setRefreshing(true);

        setReloadKey(
          (current) =>
            current + 1
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Open Generation Modal
    |--------------------------------------------------------------------------
    */

    const openGenerationModal =
      async () => {
        setGenerationForm(
          getInitialGenerationForm()
        );

        setGenerationError("");
        setGenerationResult(null);
        setStaffMembers([]);
        setGenerationModalOpen(
          true
        );

        if (!isSuperAdmin) {
          await loadStaff();
        }
      };

    const closeGenerationModal =
      () => {
        if (generating) {
          return;
        }

        setGenerationModalOpen(
          false
        );

        setGenerationError("");
        setGenerationResult(null);
      };

    const updateGenerationField = (
      key,
      value
    ) => {
      setGenerationResult(null);

      setGenerationForm(
        (current) => ({
          ...current,
          [key]: value
        })
      );
    };

    const handleGenerationSchoolChange =
      async (schoolId) => {
        setGenerationResult(null);

        setGenerationForm(
          (current) => ({
            ...current,
            schoolId,
            staffId: ""
          })
        );

        setGenerationError("");

        await loadStaff(
          schoolId
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Generate Payroll
    |--------------------------------------------------------------------------
    */

    const handleGeneratePayroll =
      async (event) => {
        event.preventDefault();

        if (
          isSuperAdmin &&
          !generationForm
            .schoolId
        ) {
          setGenerationError(
            "Please select a school."
          );

          return;
        }

        const payrollMonth =
          Number(
            generationForm
              .payrollMonth
          );

        const payrollYear =
          Number(
            generationForm
              .payrollYear
          );

        if (
          payrollMonth < 1 ||
          payrollMonth > 12
        ) {
          setGenerationError(
            "Please select a valid payroll month."
          );

          return;
        }

        if (
          payrollYear < 2000 ||
          payrollYear > 2100
        ) {
          setGenerationError(
            "Please enter a valid payroll year."
          );

          return;
        }

        setGenerating(true);
        setGenerationError("");
        setGenerationResult(null);

        try {
          const payload = {
            schoolId:
              isSuperAdmin
                ? generationForm
                    .schoolId
                : undefined,

            staffId:
              generationForm
                .staffId ||
              undefined,

            payrollMonth,
            payrollYear,

            regenerateExisting:
              Boolean(
                generationForm
                  .regenerateExisting
              )
          };

          const response =
            await generatePayroll(
              payload
            );

          setGenerationResult(
            response
          );

          const generatedCount =
            Array.isArray(
              response?.generated
            )
              ? response
                  .generated
                  .length
              : 0;

          const regeneratedCount =
            Array.isArray(
              response?.regenerated
            )
              ? response
                  .regenerated
                  .length
              : 0;

          if (
            generatedCount > 0 ||
            regeneratedCount > 0
          ) {
            setSuccessMessage(
              response?.message ||
                "Payroll generated successfully."
            );

            setFilters(
              (current) => ({
                ...current,

                schoolId:
                  isSuperAdmin
                    ? generationForm
                        .schoolId
                    : current.schoolId,

                payrollMonth:
                  String(
                    payrollMonth
                  ),

                payrollYear:
                  String(
                    payrollYear
                  ),

                page: 1
              })
            );

            setReloadKey(
              (current) =>
                current + 1
            );
          }
        } catch (
          requestError
        ) {
          setGenerationError(
            getErrorMessage(
              requestError,
              "Monthly payroll could not be generated."
            )
          );
        } finally {
          setGenerating(false);
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Page Numbers
    |--------------------------------------------------------------------------
    */

    const pageNumbers =
      useMemo(() => {
        const totalPages =
          Math.max(
            1,
            pagination
              .totalPages
          );

        const currentPageValue =
          Math.min(
            Math.max(
              1,
              pagination
                .currentPage
            ),
            totalPages
          );

        const startPage =
          Math.max(
            1,
            currentPageValue -
              2
          );

        const endPage =
          Math.min(
            totalPages,
            startPage + 4
          );

        const adjustedStart =
          Math.max(
            1,
            endPage - 4
          );

        return Array.from(
          {
            length:
              endPage -
              adjustedStart +
              1
          },
          (_, index) =>
            adjustedStart +
            index
        );
      }, [
        pagination.currentPage,
        pagination.totalPages
      ]);

    /*
    |--------------------------------------------------------------------------
    | Table Columns
    |--------------------------------------------------------------------------
    */

    const tableColumnCount =
      showSchoolColumn
        ? 11
        : 10;

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
      <div className="space-y-5">
        {/*
        |--------------------------------------------------------------------------
        | Header
        |--------------------------------------------------------------------------
        */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <WalletCards
                size={21}
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                Staff Payroll
              </h2>

              <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                Generate, review and
                process monthly staff
                payroll.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={
                handleRefresh
              }
              disabled={
                refreshing
              }
              className="btn-secondary inline-flex items-center gap-2"
            >
              <RefreshCcw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/payroll/salary-structures"
                )
              }
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Settings2
                size={16}
              />

              Salary Structures
            </button>

            {canRecoverPayroll && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/payroll/deleted"
                  )
                }
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Trash2
                  size={16}
                />

                Deleted
              </button>
            )}

            {canProcessPayroll && (
              <button
                type="button"
                onClick={
                  openGenerationModal
                }
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus size={16} />

                Generate Payroll
              </button>
            )}
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Messages
        |--------------------------------------------------------------------------
        */}

        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="rounded-lg p-1 transition hover:bg-rose-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="flex items-start gap-2">
              <CheckCircle2
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {
                  successMessage
                }
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage(
                  ""
                )
              }
              className="rounded-lg p-1 transition hover:bg-emerald-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Summary Cards
        |--------------------------------------------------------------------------
        */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Total Payrolls"
            value={
              summary.totalPayrolls
            }
            subtitle={`${summary.generated} generated · ${summary.rejected} rejected`}
            icon={Users}
          />

          <SummaryCard
            title="Pending Approval"
            value={
              summary
                .pendingApproval
            }
            subtitle="Waiting for principal approval"
            icon={CalendarDays}
            tone="warning"
          />

          <SummaryCard
            title="Approved"
            value={
              summary.approved
            }
            subtitle="Ready for salary payment"
            icon={ReceiptText}
            tone="violet"
          />

          <SummaryCard
            title="Paid Amount"
            value={formatMoney(
              summary.paidAmount,
              "PKR"
            )}
            subtitle={`${summary.paid} payroll records paid`}
            icon={Banknote}
            tone="success"
          />

          <SummaryCard
            title="Outstanding"
            value={formatMoney(
              summary
                .outstandingAmount,
              "PKR"
            )}
            subtitle="Unpaid payroll value"
            icon={
              CircleDollarSign
            }
            tone="danger"
          />
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */}

        <div className="card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter
                size={17}
                className="text-slate-400"
              />

              <h3 className="text-sm font-bold text-slate-700">
                Search and Filters
              </h3>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="text-xs font-semibold text-brand-700 transition hover:text-brand-800"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative xl:col-span-2">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={
                  filters.search
                }
                placeholder="Search payroll number, staff or employee ID..."
                className="field-input pl-9"
                onChange={(
                  event
                ) =>
                  updateFilter(
                    "search",
                    event.target
                      .value
                  )
                }
              />
            </div>

            {isSuperAdmin && (
              <select
                value={
                  filters.schoolId
                }
                disabled={
                  schoolsLoading
                }
                className="field-select"
                onChange={(
                  event
                ) =>
                  updateFilter(
                    "schoolId",
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  All schools
                </option>

                {schools.map(
                  (school) => (
                    <option
                      key={
                        school._id
                      }
                      value={
                        school._id
                      }
                    >
                      {school.schoolName ||
                        school.name}
                    </option>
                  )
                )}
              </select>
            )}

            <select
              value={
                filters
                  .payrollMonth
              }
              className="field-select"
              onChange={(
                event
              ) =>
                updateFilter(
                  "payrollMonth",
                  event.target
                    .value
                )
              }
            >
              <option value="">
                All months
              </option>

              {MONTHS.map(
                (month) => (
                  <option
                    key={
                      month.value
                    }
                    value={
                      month.value
                    }
                  >
                    {month.label}
                  </option>
                )
              )}
            </select>

            <input
              type="number"
              min="2000"
              max="2100"
              value={
                filters
                  .payrollYear
              }
              placeholder="Payroll year"
              className="field-input"
              onChange={(
                event
              ) =>
                updateFilter(
                  "payrollYear",
                  event.target
                    .value
                )
              }
            />

            <select
              value={
                filters.status
              }
              className="field-select"
              onChange={(
                event
              ) =>
                updateFilter(
                  "status",
                  event.target
                    .value
                )
              }
            >
              <option value="">
                All statuses
              </option>

              <option value="draft">
                Draft
              </option>

              <option value="generated">
                Generated
              </option>

              <option value="pending_approval">
                Pending Approval
              </option>

              <option value="approved">
                Approved
              </option>

              <option value="rejected">
                Rejected
              </option>

              <option value="paid">
                Paid
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>

            <input
              type="text"
              value={
                filters.department
              }
              placeholder="Department"
              className="field-input"
              onChange={(
                event
              ) =>
                updateFilter(
                  "department",
                  event.target
                    .value
                )
              }
            />

            <select
              value={
                filters
                  .paymentMethod
              }
              className="field-select"
              onChange={(
                event
              ) =>
                updateFilter(
                  "paymentMethod",
                  event.target
                    .value
                )
              }
            >
              <option value="">
                All payment methods
              </option>

              <option value="cash">
                Cash
              </option>

              <option value="bank_transfer">
                Bank Transfer
              </option>

              <option value="cheque">
                Cheque
              </option>

              <option value="mobile_wallet">
                Mobile Wallet
              </option>
            </select>

            <select
              value={
                filters.sortBy
              }
              className="field-select"
              onChange={(
                event
              ) =>
                updateFilter(
                  "sortBy",
                  event.target
                    .value
                )
              }
            >
              <option value="createdAt">
                Sort by Created Date
              </option>

              <option value="payrollYear">
                Sort by Payroll Year
              </option>

              <option value="payrollMonth">
                Sort by Payroll Month
              </option>

              <option value="staffNameSnapshot">
                Sort by Staff Name
              </option>

              <option value="netSalary">
                Sort by Net Salary
              </option>

              <option value="status">
                Sort by Status
              </option>
            </select>

            <select
              value={
                filters.sortOrder
              }
              className="field-select"
              onChange={(
                event
              ) =>
                updateFilter(
                  "sortOrder",
                  event.target
                    .value
                )
              }
            >
              <option value="desc">
                Descending
              </option>

              <option value="asc">
                Ascending
              </option>
            </select>
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Payroll Table
        |--------------------------------------------------------------------------
        */}

        <div className="card overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Monthly Payroll
                Records
              </h3>

              <p className="mt-0.5 text-xs text-slate-400">
                {pagination.total}{" "}
                record
                {pagination.total ===
                1
                  ? ""
                  : "s"}{" "}
                found
              </p>
            </div>

            <select
              value={
                filters.limit
              }
              className="field-select w-full sm:w-32"
              onChange={(
                event
              ) =>
                updateFilter(
                  "limit",
                  Number(
                    event.target
                      .value
                  )
                )
              }
            >
              <option value={10}>
                10 per page
              </option>

              <option value={15}>
                15 per page
              </option>

              <option value={25}>
                25 per page
              </option>

              <option value={50}>
                50 per page
              </option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Staff Member
                  </th>

                  {showSchoolColumn && (
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      School
                    </th>
                  )}

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Payroll Period
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Payroll Number
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Gross Salary
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Deductions
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Net Salary
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Attendance
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Payment
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <LoadingRows
                    columns={
                      tableColumnCount
                    }
                  />
                ) : payrolls.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        tableColumnCount
                      }
                      className="px-6 py-16 text-center"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <ReceiptText
                          size={26}
                        />
                      </div>

                      <h4 className="mt-4 text-sm font-bold text-slate-700">
                        No payroll records
                        found
                      </h4>

                      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                        {hasActiveFilters
                          ? "No payroll records match the selected filters."
                          : "Create staff salary structures and generate the first monthly payroll."}
                      </p>

                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={
                              clearFilters
                            }
                            className="btn-secondary"
                          >
                            Clear Filters
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              "/payroll/salary-structures"
                            )
                          }
                          className="btn-secondary inline-flex items-center gap-2"
                        >
                          <Settings2
                            size={16}
                          />

                          Salary Structures
                        </button>

                        {canProcessPayroll && (
                          <button
                            type="button"
                            onClick={
                              openGenerationModal
                            }
                            className="btn-primary inline-flex items-center gap-2"
                          >
                            <Plus
                              size={16}
                            />

                            Generate Payroll
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  payrolls.map(
                    (payroll) => {
                      const staff =
                        payroll.staffId ||
                        {};

                      const school =
                        payroll.schoolId ||
                        {};

                      const attendance =
                        payroll
                          .attendanceSummary ||
                        {};

                      const payment =
                        payroll
                          .paymentDetails ||
                        {};

                      const currency =
                        payroll.currency ||
                        "PKR";

                      const staffName =
                        staff.name ||
                        payroll
                          .staffNameSnapshot ||
                        "Unknown Staff";

                      const employeeId =
                        staff.employeeId ||
                        payroll
                          .employeeIdSnapshot ||
                        "—";

                      const department =
                        staff.department ||
                        payroll
                          .departmentSnapshot ||
                        "—";

                      const designation =
                        staff.designation ||
                        payroll
                          .designationSnapshot ||
                        "—";

                      const grossSalary =
                        payroll.earnings
                          ?.grossEarnings ??
                        payroll
                          .salaryStructureSnapshot
                          ?.grossSalary ??
                        0;

                      const deductions =
                        payroll.deductions
                          ?.totalDeductions ??
                        0;

                      const standardDays =
                        safeNumber(
                          attendance
                            .standardWorkingDays
                        );

                      const payableDays =
                        safeNumber(
                          attendance
                            .payableDays
                        );

                      const attendancePercentage =
                        standardDays > 0
                          ? Math.min(
                              100,
                              Math.max(
                                0,
                                (
                                  payableDays /
                                  standardDays
                                ) * 100
                              )
                            )
                          : 0;

                      return (
                        <tr
                          key={
                            payroll._id
                          }
                          className="border-b border-slate-100 transition hover:bg-slate-50/70 last:border-0"
                        >
                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex items-center gap-3">
                              {staff.photo ? (
                                <img
                                  src={
                                    staff.photo
                                  }
                                  alt={
                                    staffName
                                  }
                                  className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
                                  {getInitials(
                                    staffName
                                  )}
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="max-w-44 truncate text-sm font-bold text-slate-700">
                                  {
                                    staffName
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  {
                                    employeeId
                                  }
                                </p>

                                <p className="mt-0.5 max-w-44 truncate text-[10px] text-slate-400">
                                  {department}
                                  {designation !==
                                  "—"
                                    ? ` · ${designation}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                          </td>

                          {showSchoolColumn && (
                            <td className="whitespace-nowrap px-4 py-4">
                              <div className="flex items-start gap-2">
                                <Landmark
                                  size={14}
                                  className="mt-0.5 shrink-0 text-slate-400"
                                />

                                <div>
                                  <p className="max-w-40 truncate text-xs font-semibold text-slate-600">
                                    {school.schoolName ||
                                      "—"}
                                  </p>

                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    {school.schoolCode ||
                                      ""}
                                  </p>
                                </div>
                              </div>
                            </td>
                          )}

                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="text-xs font-bold text-slate-700">
                              {getPeriodLabel(
                                payroll
                              )}
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {formatDate(
                                payroll
                                  .periodStart
                              )}{" "}
                              –{" "}
                              {formatDate(
                                payroll
                                  .periodEnd
                              )}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="text-xs font-semibold text-slate-700">
                              {payroll.payrollNumber ||
                                "—"}
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {payroll.payslipNumber ||
                                ""}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-semibold text-slate-700">
                            {formatMoney(
                              grossSalary,
                              currency
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-semibold text-rose-600">
                            {formatMoney(
                              deductions,
                              currency
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-right">
                            <p className="text-sm font-bold text-emerald-700">
                              {formatMoney(
                                payroll.netSalary,
                                currency
                              )}
                            </p>

                            {safeNumber(
                              payroll
                                .roundingAdjustment
                            ) !== 0 && (
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                Adjustment:{" "}
                                {formatMoney(
                                  payroll
                                    .roundingAdjustment,
                                  currency
                                )}
                              </p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="min-w-28">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-slate-500">
                                  {payableDays}/
                                  {standardDays}
                                </span>

                                <span className="font-bold text-slate-600">
                                  {attendancePercentage.toFixed(
                                    0
                                  )}
                                  %
                                </span>
                              </div>

                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-brand-600"
                                  style={{
                                    width: `${attendancePercentage}%`
                                  }}
                                />
                              </div>

                              <p className="mt-1.5 text-[10px] text-slate-400">
                                {safeNumber(
                                  attendance
                                    .absentDays
                                )}{" "}
                                absent ·{" "}
                                {safeNumber(
                                  attendance
                                    .lateDays
                                )}{" "}
                                late
                              </p>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <PayrollStatusBadge
                              status={
                                payroll.status
                              }
                            />

                            {payroll.status ===
                              "rejected" &&
                              payroll.rejectionReason && (
                                <p
                                  className="mt-1 max-w-36 truncate text-[10px] text-rose-500"
                                  title={
                                    payroll.rejectionReason
                                  }
                                >
                                  {
                                    payroll.rejectionReason
                                  }
                                </p>
                              )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="text-xs font-semibold text-slate-600">
                              {formatLabel(
                                payment.paymentMethod
                              )}
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {payroll.status ===
                              "paid"
                                ? formatDate(
                                    payment.paymentDate ||
                                      payroll.paidAt
                                  )
                                : "Not paid"}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/payroll/${payroll._id}`
                                  )
                                }
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-700"
                                title="View payroll details"
                              >
                                <Eye
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/payroll/${payroll._id}/payslip`
                                  )
                                }
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                                title="View payslip"
                              >
                                <FileText
                                  size={16}
                                />
                              </button>

                              {staff?._id && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/staff/${staff._id}`
                                    )
                                  }
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                  title="View staff"
                                >
                                  <UserRound
                                    size={16}
                                  />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Pagination
          |--------------------------------------------------------------------------
          */}

          {!loading &&
            pagination.total >
              0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  Page{" "}
                  <span className="font-semibold text-slate-600">
                    {
                      pagination.currentPage
                    }
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-600">
                    {
                      pagination.totalPages
                    }
                  </span>
                </p>

                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    disabled={
                      !pagination.hasPreviousPage
                    }
                    onClick={() =>
                      updateFilter(
                        "page",
                        Math.max(
                          1,
                          filters.page -
                            1
                        )
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft
                      size={16}
                    />
                  </button>

                  {pageNumbers.map(
                    (
                      pageNumber
                    ) => (
                      <button
                        key={
                          pageNumber
                        }
                        type="button"
                        onClick={() =>
                          updateFilter(
                            "page",
                            pageNumber
                          )
                        }
                        className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
                          pageNumber ===
                          pagination.currentPage
                            ? "bg-brand-600 text-white"
                            : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {
                          pageNumber
                        }
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    disabled={
                      !pagination.hasNextPage
                    }
                    onClick={() =>
                      updateFilter(
                        "page",
                        Math.min(
                          pagination.totalPages,
                          filters.page +
                            1
                        )
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight
                      size={16}
                    />
                  </button>
                </div>
              </div>
            )}
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Generation Modal
        |--------------------------------------------------------------------------
        */}

        <GeneratePayrollModal
          open={
            generationModalOpen
          }
          isSuperAdmin={
            isSuperAdmin
          }
          schools={schools}
          staffMembers={
            staffMembers
          }
          form={
            generationForm
          }
          schoolsLoading={
            schoolsLoading
          }
          staffLoading={
            staffLoading
          }
          generating={
            generating
          }
          generationResult={
            generationResult
          }
          error={
            generationError
          }
          onClose={
            closeGenerationModal
          }
          onChange={
            updateGenerationField
          }
          onSchoolChange={
            handleGenerationSchoolChange
          }
          onSubmit={
            handleGeneratePayroll
          }
        />
      </div>
    );
  };

export default PayrollList;