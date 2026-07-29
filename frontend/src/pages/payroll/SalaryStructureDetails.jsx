import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate,
  useParams
} from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit3,
  FileText,
  Landmark,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
  X
} from "lucide-react";

import {
  useAuth
} from "../../context/AuthContext";

import {
  deleteSalaryStructure,
  getSalaryStructureById
} from "../../api/staffSalaryStructures";

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
    "en-US",
    {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }
  ).format(date);
};

const formatDateTime = (
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
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit"
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

const maskValue = (
  value,
  visibleCharacters = 4
) => {
  const stringValue =
    String(
      value || ""
    ).trim();

  if (!stringValue) {
    return "Not provided";
  }

  if (
    stringValue.length <=
    visibleCharacters
  ) {
    return "*".repeat(
      stringValue.length
    );
  }

  return (
    "*".repeat(
      stringValue.length -
        visibleCharacters
    ) +
    stringValue.slice(
      -visibleCharacters
    )
  );
};

/*
|--------------------------------------------------------------------------
| Status Badge
|--------------------------------------------------------------------------
*/

const StatusBadge = ({
  status
}) => {
  const normalizedStatus =
    String(
      status || ""
    ).toLowerCase();

  const styles = {
    active:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/10",

    inactive:
      "bg-slate-100 text-slate-600 ring-slate-500/10"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[
          normalizedStatus
        ] ||
        styles.inactive
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
| Yes / No Badge
|--------------------------------------------------------------------------
*/

const BooleanBadge = ({
  enabled,
  enabledLabel = "Enabled",
  disabledLabel = "Disabled"
}) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        enabled
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {enabled
        ? enabledLabel
        : disabledLabel}
    </span>
  );
};

/*
|--------------------------------------------------------------------------
| Details Section
|--------------------------------------------------------------------------
*/

const DetailsSection = ({
  title,
  description,
  icon: Icon,
  action,
  children
}) => {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon size={19} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {title}
            </h3>

            {description && (
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
};

/*
|--------------------------------------------------------------------------
| Information Row
|--------------------------------------------------------------------------
*/

const InfoRow = ({
  label,
  value,
  valueClassName = ""
}) => {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span
        className={`max-w-[65%] text-right text-xs font-semibold text-slate-700 ${valueClassName}`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Salary Summary Card
|--------------------------------------------------------------------------
*/

const SalarySummaryCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = "default"
}) => {
  const tones = {
    default: {
      box:
        "bg-brand-50 text-brand-700",

      value:
        "text-slate-800"
    },

    success: {
      box:
        "bg-emerald-50 text-emerald-700",

      value:
        "text-emerald-700"
    },

    danger: {
      box:
        "bg-rose-50 text-rose-600",

      value:
        "text-rose-600"
    }
  };

  const selectedTone =
    tones[tone] ||
    tones.default;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p
            className={`mt-2 truncate text-xl font-bold ${selectedTone.value}`}
          >
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {description}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${selectedTone.box}`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Empty Breakdown
|--------------------------------------------------------------------------
*/

const EmptyBreakdown = ({
  message
}) => {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center text-xs text-slate-400">
      {message}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Delete Confirmation Modal
|--------------------------------------------------------------------------
*/

const DeleteConfirmationModal = ({
  open,
  staffName,
  deleting,
  onClose,
  onConfirm
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 cursor-default"
        onClick={
          deleting
            ? undefined
            : onClose
        }
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle
                size={21}
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-800">
                Delete Salary Structure
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                This record will move
                to the deleted salary
                structures list.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm leading-6 text-slate-600">
            Are you sure you want to
            delete the salary structure
            for{" "}
            <span className="font-bold text-slate-800">
              {staffName}
            </span>
            ?
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={deleting}
              onClick={onConfirm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <RefreshCcw
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Trash2
                  size={16}
                />
              )}

              {deleting
                ? "Deleting..."
                : "Delete Structure"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Salary Structure Details Page
|--------------------------------------------------------------------------
*/

export const SalaryStructureDetails =
  () => {
    const navigate =
      useNavigate();

    const {
      id
    } = useParams();

    const {
      user
    } = useAuth();

    /*
    |--------------------------------------------------------------------------
    | Role Permissions
    |--------------------------------------------------------------------------
    */

    const userRole =
      String(
        user?.role || ""
      ).toLowerCase();

    const canManage =
      [
        "super_admin",
        "principal"
      ].includes(
        userRole
      );

    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */

    const [
      salaryStructure,
      setSalaryStructure
    ] = useState(null);

    const [
      calculation,
      setCalculation
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
      deleteModalOpen,
      setDeleteModalOpen
    ] = useState(false);

    const [
      deleting,
      setDeleting
    ] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Load Salary Structure
    |--------------------------------------------------------------------------
    */

    const loadSalaryStructure =
      useCallback(
        async (
          showMainLoader =
            false
        ) => {
          if (!id) {
            setError(
              "Salary structure identifier is missing."
            );

            setLoading(false);

            return;
          }

          if (showMainLoader) {
            setLoading(true);
          }

          setError("");

          try {
            const response =
              await getSalaryStructureById(
                id
              );

            setSalaryStructure(
              response
                ?.salaryStructure ||
                null
            );

            setCalculation(
              response
                ?.calculation ||
                null
            );
          } catch (
            requestError
          ) {
            setSalaryStructure(
              null
            );

            setCalculation(null);

            setError(
              getErrorMessage(
                requestError,
                "Salary structure could not be loaded."
              )
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        [
          id
        ]
      );

    useEffect(() => {
      loadSalaryStructure(
        true
      );
    }, [
      loadSalaryStructure
    ]);

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

        loadSalaryStructure(
          false
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Delete
    |--------------------------------------------------------------------------
    */

    const handleDelete =
      async () => {
        if (
          !salaryStructure?._id ||
          deleting
        ) {
          return;
        }

        setDeleting(true);
        setError("");

        try {
          await deleteSalaryStructure(
            salaryStructure._id
          );

          setDeleteModalOpen(
            false
          );

          navigate(
            "/payroll/salary-structures",
            {
              replace: true,

              state: {
                successMessage:
                  "Salary structure deleted successfully."
              }
            }
          );
        } catch (
          deleteError
        ) {
          setError(
            getErrorMessage(
              deleteError,
              "Salary structure could not be deleted."
            )
          );

          setDeleteModalOpen(
            false
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        } finally {
          setDeleting(false);
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Derived Information
    |--------------------------------------------------------------------------
    */

    const staff =
      salaryStructure
        ?.staffId || {};

    const school =
      salaryStructure
        ?.schoolId || {};

    const currency =
      salaryStructure
        ?.currency ||
      calculation?.currency ||
      "PKR";

    const staffName =
      staff.name ||
      salaryStructure
        ?.staffNameSnapshot ||
      "Unknown Staff";

    const employeeId =
      staff.employeeId ||
      salaryStructure
        ?.employeeIdSnapshot ||
      "—";

    const department =
      staff.department ||
      salaryStructure
        ?.departmentSnapshot ||
      "—";

    const designation =
      staff.designation ||
      salaryStructure
        ?.designationSnapshot ||
      "—";

    const allowanceItems =
      useMemo(() => {
        if (
          !salaryStructure
        ) {
          return [];
        }

        const allowances =
          salaryStructure
            .allowances || {};

        const items = [
          {
            label:
              "House Rent",

            amount:
              allowances
                .houseRent
          },

          {
            label: "Medical",
            amount:
              allowances.medical
          },

          {
            label: "Transport",
            amount:
              allowances
                .transport
          },

          {
            label: "Food",
            amount:
              allowances.food
          },

          {
            label:
              "Communication",

            amount:
              allowances
                .communication
          },

          {
            label: "Special",
            amount:
              allowances.special
          }
        ].filter(
          (item) =>
            safeNumber(
              item.amount
            ) > 0
        );

        const otherItems =
          Array.isArray(
            allowances.other
          )
            ? allowances.other.map(
                (item) => ({
                  label:
                    item.name ||
                    "Other Allowance",

                  amount:
                    item.amount,

                  note:
                    item.isTaxable
                      ? "Taxable"
                      : "Non-taxable"
                })
              )
            : [];

        return [
          ...items,
          ...otherItems
        ];
      }, [
        salaryStructure
      ]);

    const deductionItems =
      useMemo(() => {
        if (
          !salaryStructure
        ) {
          return [];
        }

        const deductions =
          salaryStructure
            .deductions || {};

        const items = [
          {
            label:
              "Provident Fund",

            amount:
              deductions
                .providentFund
          },

          {
            label: "Tax",
            amount:
              deductions.tax
          },

          {
            label: "Insurance",
            amount:
              deductions
                .insurance
          },

          {
            label:
              "Loan Installment",

            amount:
              deductions
                .loanInstallment
          }
        ].filter(
          (item) =>
            safeNumber(
              item.amount
            ) > 0
        );

        const otherItems =
          Array.isArray(
            deductions.other
          )
            ? deductions.other.map(
                (item) => ({
                  label:
                    item.name ||
                    "Other Deduction",

                  amount:
                    item.amount,

                  note:
                    item
                      .deductionType ===
                    "percentage"
                      ? `${item.amount}% of ${formatLabel(
                          item.percentageOf
                        )}`
                      : "Fixed amount",

                  displayAmount:
                    item
                      .deductionType ===
                    "percentage"
                      ? `${safeNumber(
                          item.amount
                        )}%`
                      : formatMoney(
                          item.amount,
                          currency
                        )
                })
              )
            : [];

        return [
          ...items,
          ...otherItems
        ];
      }, [
        salaryStructure,
        currency
      ]);

    /*
    |--------------------------------------------------------------------------
    | Loading Screen
    |--------------------------------------------------------------------------
    */

    if (loading) {
      return (
        <div className="card flex min-h-[460px] items-center justify-center">
          <div className="text-center">
            <RefreshCcw
              size={28}
              className="mx-auto animate-spin text-brand-600"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading salary structure...
            </p>
          </div>
        </div>
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Error or Missing Record
    |--------------------------------------------------------------------------
    */

    if (
      !salaryStructure
    ) {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/payroll/salary-structures"
              )
            }
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft
              size={16}
            />

            Back to Salary Structures
          </button>

          <div className="card flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <AlertTriangle
                size={26}
              />
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-800">
              Salary Structure Not Available
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {error ||
                "The requested salary structure could not be found."}
            </p>

            <button
              type="button"
              onClick={() =>
                loadSalaryStructure(
                  true
                )
              }
              className="btn-primary mt-5 inline-flex items-center gap-2"
            >
              <RefreshCcw
                size={16}
              />

              Try Again
            </button>
          </div>
        </div>
      );
    }

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
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/payroll/salary-structures"
                )
              }
              className="mt-0.5 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Back"
            >
              <ArrowLeft
                size={18}
              />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                  Salary Structure Details
                </h2>

                <StatusBadge
                  status={
                    salaryStructure
                      .status
                  }
                />
              </div>

              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Review salary,
                allowances, deductions
                and payroll rules for{" "}
                {staffName}.
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

            {staff?._id && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/staff/${staff._id}`
                  )
                }
                className="btn-secondary inline-flex items-center gap-2"
              >
                <UserRound
                  size={16}
                />

                View Staff
              </button>
            )}

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/payroll/salary-structures/${salaryStructure._id}/edit`
                    )
                  }
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Edit3
                    size={16}
                  />

                  Edit Structure
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDeleteModalOpen(
                      true
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2
                    size={16}
                  />

                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Error Message
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

        {/*
        |--------------------------------------------------------------------------
        | Staff Profile Card
        |--------------------------------------------------------------------------
        */}

        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6 text-white sm:px-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {staff.photo ? (
                  <img
                    src={staff.photo}
                    alt={staffName}
                    className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-4 ring-white/10"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold ring-1 ring-white/15">
                    {getInitials(
                      staffName
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="truncate text-xl font-bold">
                    {staffName}
                  </h3>

                  <p className="mt-1 text-sm text-slate-300">
                    {designation}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                      {employeeId}
                    </span>

                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                      {department}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/10">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Estimated Net Salary
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {formatMoney(
                    calculation
                      ?.estimatedNetSalary ??
                      salaryStructure
                        .estimatedNetSalary,
                    currency
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Monthly estimate
                  before attendance
                  adjustments
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <BriefcaseBusiness
                  size={16}
                />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Department
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {department}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <Phone size={16} />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Phone
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {staff.phone ||
                    "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <Mail size={16} />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Email
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                  {staff.email ||
                    "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <Building2
                  size={16}
                />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  School
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                  {school.schoolName ||
                    "Assigned School"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Salary Summary Cards
        |--------------------------------------------------------------------------
        */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SalarySummaryCard
            title="Basic Salary"
            value={formatMoney(
              calculation
                ?.basicSalary ??
                salaryStructure
                  .basicSalary,
              currency
            )}
            description="Monthly fixed basic salary"
            icon={Banknote}
          />

          <SalarySummaryCard
            title="Allowances"
            value={formatMoney(
              calculation
                ?.allowances
                ?.total ??
                salaryStructure
                  .fixedAllowancesTotal,
              currency
            )}
            description="Recurring monthly allowances"
            icon={
              BadgeDollarSign
            }
            tone="success"
          />

          <SalarySummaryCard
            title="Gross Salary"
            value={formatMoney(
              calculation
                ?.grossSalary ??
                salaryStructure
                  .grossSalary,
              currency
            )}
            description="Basic salary plus allowances"
            icon={WalletCards}
          />

          <SalarySummaryCard
            title="Fixed Deductions"
            value={formatMoney(
              calculation
                ?.deductions
                ?.total ??
                salaryStructure
                  .fixedDeductionsTotal,
              currency
            )}
            description="Before attendance deductions"
            icon={ShieldCheck}
            tone="danger"
          />
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Main Details Grid
        |--------------------------------------------------------------------------
        */}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {/*
            |--------------------------------------------------------------------------
            | Salary Breakdown
            |--------------------------------------------------------------------------
            */}

            <DetailsSection
              title="Salary Breakdown"
              description="Monthly earnings and fixed deduction details."
              icon={
                BadgeDollarSign
              }
            >
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Allowances
                    </h4>

                    <span className="text-xs font-bold text-emerald-700">
                      {formatMoney(
                        calculation
                          ?.allowances
                          ?.total ??
                          salaryStructure
                            .fixedAllowancesTotal,
                        currency
                      )}
                    </span>
                  </div>

                  {allowanceItems.length ===
                  0 ? (
                    <EmptyBreakdown
                      message="No monthly allowances configured."
                    />
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      {allowanceItems.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            key={`${item.label}-${index}`}
                            className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-0"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-700">
                                {
                                  item.label
                                }
                              </p>

                              {item.note && (
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                  {
                                    item.note
                                  }
                                </p>
                              )}
                            </div>

                            <span className="text-xs font-bold text-emerald-700">
                              +
                              {formatMoney(
                                item.amount,
                                currency
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Deductions
                    </h4>

                    <span className="text-xs font-bold text-rose-600">
                      {formatMoney(
                        calculation
                          ?.deductions
                          ?.total ??
                          salaryStructure
                            .fixedDeductionsTotal,
                        currency
                      )}
                    </span>
                  </div>

                  {deductionItems.length ===
                  0 ? (
                    <EmptyBreakdown
                      message="No fixed deductions configured."
                    />
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      {deductionItems.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            key={`${item.label}-${index}`}
                            className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-0"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-700">
                                {
                                  item.label
                                }
                              </p>

                              {item.note && (
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                  {
                                    item.note
                                  }
                                </p>
                              )}
                            </div>

                            <span className="text-xs font-bold text-rose-600">
                              -
                              {item.displayAmount ||
                                formatMoney(
                                  item.amount,
                                  currency
                                )}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </DetailsSection>

            {/*
            |--------------------------------------------------------------------------
            | Attendance Rules
            |--------------------------------------------------------------------------
            */}

            <DetailsSection
              title="Attendance Calculation Rules"
              description="Rules applied when monthly payroll is generated."
              icon={CalendarDays}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <InfoRow
                    label="Calculation Basis"
                    value={formatLabel(
                      salaryStructure
                        .calculationBasis
                    )}
                  />

                  <InfoRow
                    label="Working Days Method"
                    value={formatLabel(
                      salaryStructure
                        .workingDaysMethod
                    )}
                  />

                  <InfoRow
                    label="Fixed Working Days"
                    value={
                      salaryStructure
                        .fixedWorkingDays ||
                      26
                    }
                  />

                  <InfoRow
                    label="Daily Rate Basis"
                    value={formatLabel(
                      salaryStructure
                        .dailyRateBasis
                    )}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <InfoRow
                    label="Absence Deduction"
                    value={
                      <BooleanBadge
                        enabled={
                          salaryStructure
                            .attendanceRules
                            ?.absenceDeductionEnabled
                        }
                      />
                    }
                  />

                  <InfoRow
                    label="Unpaid Leave Deduction"
                    value={
                      <BooleanBadge
                        enabled={
                          salaryStructure
                            .attendanceRules
                            ?.unpaidLeaveDeductionEnabled
                        }
                      />
                    }
                  />

                  <InfoRow
                    label="Half-Day Deduction"
                    value={
                      <BooleanBadge
                        enabled={
                          salaryStructure
                            .attendanceRules
                            ?.halfDayDeductionEnabled
                        }
                      />
                    }
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Paid Leave Types
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.isArray(
                    salaryStructure
                      .attendanceRules
                      ?.paidLeaveTypes
                  ) &&
                  salaryStructure
                    .attendanceRules
                    .paidLeaveTypes
                    .length > 0 ? (
                    salaryStructure
                      .attendanceRules
                      .paidLeaveTypes.map(
                        (
                          leaveType
                        ) => (
                          <span
                            key={
                              leaveType
                            }
                            className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700"
                          >
                            {formatLabel(
                              leaveType
                            )}
                          </span>
                        )
                      )
                  ) : (
                    <span className="text-xs text-slate-400">
                      No paid leave
                      types configured.
                    </span>
                  )}
                </div>
              </div>
            </DetailsSection>

            {/*
            |--------------------------------------------------------------------------
            | Late and Overtime Rules
            |--------------------------------------------------------------------------
            */}

            <DetailsSection
              title="Late and Overtime Rules"
              description="Late arrival deductions and overtime payment settings."
              icon={Clock3}
            >
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">
                        Late Arrival
                      </h4>

                      <p className="mt-1 text-xs text-slate-400">
                        Salary deduction
                        for late attendance.
                      </p>
                    </div>

                    <BooleanBadge
                      enabled={
                        salaryStructure
                          .lateRules
                          ?.enabled
                      }
                    />
                  </div>

                  <InfoRow
                    label="Grace Minutes"
                    value={`${safeNumber(
                      salaryStructure
                        .lateRules
                        ?.graceMinutes
                    )} minutes`}
                  />

                  <InfoRow
                    label="Deduction Method"
                    value={formatLabel(
                      salaryStructure
                        .lateRules
                        ?.deductionMethod
                    )}
                  />

                  <InfoRow
                    label="Deduction Rate"
                    value={
                      salaryStructure
                        .lateRules
                        ?.deductionMethod ===
                      "half_day"
                        ? "Half of daily rate"
                        : formatMoney(
                            salaryStructure
                              .lateRules
                              ?.deductionRate,
                            currency
                          )
                    }
                  />
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">
                        Overtime Payment
                      </h4>

                      <p className="mt-1 text-xs text-slate-400">
                        Additional pay
                        for approved
                        overtime.
                      </p>
                    </div>

                    <BooleanBadge
                      enabled={
                        salaryStructure
                          .overtimeRules
                          ?.enabled
                      }
                    />
                  </div>

                  <InfoRow
                    label="Rate Method"
                    value={formatLabel(
                      salaryStructure
                        .overtimeRules
                        ?.rateMethod
                    )}
                  />

                  <InfoRow
                    label="Multiplier"
                    value={`${safeNumber(
                      salaryStructure
                        .overtimeRules
                        ?.multiplier
                    )}x`}
                  />

                  <InfoRow
                    label="Fixed Hourly Rate"
                    value={formatMoney(
                      salaryStructure
                        .overtimeRules
                        ?.fixedHourlyRate,
                      currency
                    )}
                  />

                  <InfoRow
                    label="Minimum Minutes"
                    value={`${safeNumber(
                      salaryStructure
                        .overtimeRules
                        ?.minimumMinutes
                    )} minutes`}
                  />

                  <InfoRow
                    label="Monthly Limit"
                    value={
                      safeNumber(
                        salaryStructure
                          .overtimeRules
                          ?.maximumMonthlyMinutes
                      ) > 0
                        ? `${safeNumber(
                            salaryStructure
                              .overtimeRules
                              ?.maximumMonthlyMinutes
                          )} minutes`
                        : "No limit"
                    }
                  />
                </div>
              </div>
            </DetailsSection>

            {/*
            |--------------------------------------------------------------------------
            | Payment Information
            |--------------------------------------------------------------------------
            */}

            <DetailsSection
              title="Payment Information"
              description="Preferred salary payment method and masked account details."
              icon={CreditCard}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <InfoRow
                    label="Payment Method"
                    value={formatLabel(
                      salaryStructure
                        .paymentMethod
                    )}
                  />

                  <InfoRow
                    label="Bank Name"
                    value={
                      salaryStructure
                        .bankDetails
                        ?.bankName ||
                      "Not provided"
                    }
                  />

                  <InfoRow
                    label="Account Title"
                    value={
                      salaryStructure
                        .bankDetails
                        ?.accountTitle ||
                      "Not provided"
                    }
                  />

                  <InfoRow
                    label="Branch Code"
                    value={
                      salaryStructure
                        .bankDetails
                        ?.branchCode ||
                      "Not provided"
                    }
                  />
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <InfoRow
                    label="Account Number"
                    value={maskValue(
                      salaryStructure
                        .bankDetails
                        ?.accountNumber
                    )}
                  />

                  <InfoRow
                    label="IBAN"
                    value={maskValue(
                      salaryStructure
                        .bankDetails
                        ?.iban
                    )}
                  />

                  <InfoRow
                    label="Wallet Provider"
                    value={
                      salaryStructure
                        .bankDetails
                        ?.walletProvider ||
                      "Not provided"
                    }
                  />

                  <InfoRow
                    label="Wallet Number"
                    value={maskValue(
                      salaryStructure
                        .bankDetails
                        ?.walletNumber
                    )}
                  />
                </div>
              </div>
            </DetailsSection>

            {/*
            |--------------------------------------------------------------------------
            | Notes
            |--------------------------------------------------------------------------
            */}

            <DetailsSection
              title="Administrative Notes"
              description="Internal information attached to this salary structure."
              icon={FileText}
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {salaryStructure
                    .notes ||
                    "No administrative notes were added."}
                </p>
              </div>
            </DetailsSection>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Right Sidebar
          |--------------------------------------------------------------------------
          */}

          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            {/*
            |--------------------------------------------------------------------------
            | Salary Rates
            |--------------------------------------------------------------------------
            */}

            <div className="card overflow-hidden">
              <div className="bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                    <WalletCards
                      size={21}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold">
                      Salary Rates
                    </h3>

                    <p className="mt-0.5 text-xs text-white/70">
                      Calculated monthly,
                      daily and hourly
                      rates
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <InfoRow
                  label="Basic Salary"
                  value={formatMoney(
                    calculation
                      ?.basicSalary ??
                      salaryStructure
                        .basicSalary,
                    currency
                  )}
                />

                <InfoRow
                  label="Gross Salary"
                  value={formatMoney(
                    calculation
                      ?.grossSalary ??
                      salaryStructure
                        .grossSalary,
                    currency
                  )}
                />

                <InfoRow
                  label="Estimated Net"
                  value={formatMoney(
                    calculation
                      ?.estimatedNetSalary ??
                      salaryStructure
                        .estimatedNetSalary,
                    currency
                  )}
                  valueClassName="text-emerald-700"
                />

                <InfoRow
                  label="Daily Rate"
                  value={formatMoney(
                    calculation
                      ?.rates
                      ?.dailySalaryRate ??
                      salaryStructure
                        .dailySalaryRate,
                    currency
                  )}
                />

                <InfoRow
                  label="Hourly Rate"
                  value={formatMoney(
                    calculation
                      ?.rates
                      ?.hourlySalaryRate ??
                      salaryStructure
                        .hourlySalaryRate,
                    currency
                  )}
                />

                <InfoRow
                  label="Overtime Rate"
                  value={formatMoney(
                    calculation
                      ?.rates
                      ?.overtimeHourlyRate,
                    currency
                  )}
                />
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Effective Period
            |--------------------------------------------------------------------------
            */}

            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <CalendarDays
                    size={18}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Effective Period
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Salary structure
                    validity
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <InfoRow
                  label="Effective From"
                  value={formatDate(
                    salaryStructure
                      .effectiveFrom
                  )}
                />

                <InfoRow
                  label="Effective To"
                  value={formatDate(
                    salaryStructure
                      .effectiveTo
                  )}
                />

                <InfoRow
                  label="Pay Frequency"
                  value={formatLabel(
                    salaryStructure
                      .payFrequency
                  )}
                />

                <InfoRow
                  label="Currency"
                  value={currency}
                />
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | School Information
            |--------------------------------------------------------------------------
            */}

            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                  <Landmark
                    size={18}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    School Information
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Assigned institution
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <InfoRow
                  label="School Name"
                  value={
                    school.schoolName ||
                    "—"
                  }
                />

                <InfoRow
                  label="School Code"
                  value={
                    school.schoolCode ||
                    "—"
                  }
                />

                <InfoRow
                  label="School Type"
                  value={formatLabel(
                    school.type
                  )}
                />

                <InfoRow
                  label="School Status"
                  value={
                    <BooleanBadge
                      enabled={
                        school.isActive !==
                        false
                      }
                      enabledLabel="Active"
                      disabledLabel="Inactive"
                    />
                  }
                />
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Audit Information
            |--------------------------------------------------------------------------
            */}

            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                  <ShieldCheck
                    size={18}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Record Information
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Creation and update
                    history
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <InfoRow
                  label="Created By"
                  value={
                    salaryStructure
                      .createdBy
                      ?.name ||
                    "System User"
                  }
                />

                <InfoRow
                  label="Created At"
                  value={formatDateTime(
                    salaryStructure
                      .createdAt
                  )}
                />

                <InfoRow
                  label="Updated By"
                  value={
                    salaryStructure
                      .updatedBy
                      ?.name ||
                    "—"
                  }
                />

                <InfoRow
                  label="Updated At"
                  value={formatDateTime(
                    salaryStructure
                      .updatedAt
                  )}
                />
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Payroll Notice
            |--------------------------------------------------------------------------
            */}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={17}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div>
                  <p className="text-xs font-bold text-amber-800">
                    Payroll Calculation
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    Final monthly salary
                    may change after
                    attendance deductions,
                    overtime, bonuses and
                    manual payroll
                    adjustments.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Delete Confirmation
        |--------------------------------------------------------------------------
        */}

        <DeleteConfirmationModal
          open={
            deleteModalOpen
          }
          staffName={
            staffName
          }
          deleting={
            deleting
          }
          onClose={() =>
            setDeleteModalOpen(
              false
            )
          }
          onConfirm={
            handleDelete
          }
        />
      </div>
    );
  };

export default SalaryStructureDetails;