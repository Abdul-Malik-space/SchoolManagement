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
  AlertTriangle,
  Banknote,
  BriefcaseBusiness,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Eye,
  FilePenLine,
  Filter,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Users,
  WalletCards,
  X
} from "lucide-react";

import {
  useAuth
} from "../../context/AuthContext";

import {
  deleteSalaryStructure,
  getSalaryStructures
} from "../../api/staffSalaryStructures";

/*
|--------------------------------------------------------------------------
| Initial Filters
|--------------------------------------------------------------------------
*/

const initialFilters = {
  search: "",
  department: "",
  status: "",
  calculationBasis: "",
  paymentMethod: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 10
};

/*
|--------------------------------------------------------------------------
| Formatting Helpers
|--------------------------------------------------------------------------
*/

const formatMoney = (
  value,
  currency = "PKR"
) => {
  const amount =
    Number(value);

  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency:
          currency || "PKR",
        currencyDisplay:
          "code",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    ).format(
      Number.isFinite(amount)
        ? amount
        : 0
    );
  } catch {
    return `PKR ${Number.isFinite(amount)
      ? amount.toLocaleString(
          "en-US"
        )
      : "0"}`;
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
    .replaceAll("_", " ")
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

  const classes = {
    active:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/10",

    inactive:
      "bg-slate-100 text-slate-600 ring-slate-500/10"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
        classes[
          normalizedStatus
        ] ||
        "bg-slate-100 text-slate-600 ring-slate-500/10"
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
  icon: Icon
}) => {
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
            <p className="mt-1 text-xs text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Loading Skeleton
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
| Delete Confirmation Modal
|--------------------------------------------------------------------------
*/

const DeleteConfirmationModal = ({
  open,
  structure,
  deleting,
  onClose,
  onConfirm
}) => {
  if (!open) {
    return null;
  }

  const staffName =
    structure?.staffId?.name ||
    structure
      ?.staffNameSnapshot ||
    "this staff member";

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
                Delete Salary
                Structure
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                This record will
                move to deleted
                salary structures.
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
            Are you sure you
            want to delete the
            salary structure for{" "}
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
                : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Salary Structure List Page
|--------------------------------------------------------------------------
*/

export const SalaryStructureList =
  () => {
    const navigate =
      useNavigate();

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

    const showSchoolColumn =
      userRole ===
      "super_admin";

    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */

    const [
      salaryStructures,
      setSalaryStructures
    ] = useState([]);

    const [
      summary,
      setSummary
    ] = useState({
      totalStructures: 0,
      active: 0,
      inactive: 0,
      totalBasicSalary: 0,
      totalGrossSalary: 0,
      totalEstimatedNetSalary:
        0
    });

    const [
      pagination,
      setPagination
    ] = useState({
      total: 0,
      currentPage: 1,
      page: 1,
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
      initialFilters
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

    const [
      deleteModal,
      setDeleteModal
    ] = useState({
      open: false,
      structure: null
    });

    const [
      deleting,
      setDeleting
    ] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Debounced Search
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
          search:
            debouncedSearch,

          department:
            filters.department
              .trim(),

          status:
            filters.status,

          calculationBasis:
            filters
              .calculationBasis,

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
          debouncedSearch,
          filters.department,
          filters.status,
          filters
            .calculationBasis,
          filters
            .paymentMethod,
          filters.sortBy,
          filters.sortOrder,
          filters.page,
          filters.limit
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Load Salary Structures
    |--------------------------------------------------------------------------
    */

    const loadSalaryStructures =
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
              await getSalaryStructures(
                queryParams
              );

            const records =
              Array.isArray(
                response
                  ?.salaryStructures
              )
                ? response
                    .salaryStructures
                : [];

            setSalaryStructures(
              records
            );

            setSummary({
              totalStructures:
                Number(
                  response?.summary
                    ?.totalStructures ||
                    0
                ),

              active:
                Number(
                  response?.summary
                    ?.active || 0
                ),

              inactive:
                Number(
                  response?.summary
                    ?.inactive || 0
                ),

              totalBasicSalary:
                Number(
                  response?.summary
                    ?.totalBasicSalary ||
                    0
                ),

              totalGrossSalary:
                Number(
                  response?.summary
                    ?.totalGrossSalary ||
                    0
                ),

              totalEstimatedNetSalary:
                Number(
                  response?.summary
                    ?.totalEstimatedNetSalary ||
                    0
                )
            });

            setPagination({
              total:
                Number(
                  response
                    ?.pagination
                    ?.total || 0
                ),

              currentPage:
                Number(
                  response
                    ?.pagination
                    ?.currentPage ||
                    response
                      ?.pagination
                      ?.page ||
                    1
                ),

              page:
                Number(
                  response
                    ?.pagination
                    ?.page || 1
                ),

              limit:
                Number(
                  response
                    ?.pagination
                    ?.limit ||
                    filters.limit
                ),

              totalPages:
                Number(
                  response
                    ?.pagination
                    ?.totalPages ||
                    1
                ),

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
            setSalaryStructures(
              []
            );

            setError(
              getErrorMessage(
                requestError,
                "Salary structures could not be loaded."
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
      loadSalaryStructures(
        true
      );
    }, [
      loadSalaryStructures,
      reloadKey
    ]);

    /*
    |--------------------------------------------------------------------------
    | Automatic Message Clearing
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
          initialFilters
        );

        setDebouncedSearch(
          ""
        );
      };

    const hasActiveFilters =
      Boolean(
        filters.search ||
          filters.department ||
          filters.status ||
          filters
            .calculationBasis ||
          filters
            .paymentMethod
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
    | Delete Salary Structure
    |--------------------------------------------------------------------------
    */

    const openDeleteModal = (
      structure
    ) => {
      setDeleteModal({
        open: true,
        structure
      });
    };

    const closeDeleteModal =
      () => {
        if (deleting) {
          return;
        }

        setDeleteModal({
          open: false,
          structure: null
        });
      };

    const confirmDelete =
      async () => {
        const structureId =
          deleteModal
            .structure?._id;

        if (
          !structureId ||
          deleting
        ) {
          return;
        }

        setDeleting(true);
        setError("");

        try {
          const response =
            await deleteSalaryStructure(
              structureId
            );

          setSuccessMessage(
            response?.message ||
              "Salary structure deleted successfully."
          );

          setDeleteModal({
            open: false,
            structure: null
          });

          if (
            salaryStructures.length ===
              1 &&
            filters.page > 1
          ) {
            setFilters(
              (current) => ({
                ...current,
                page:
                  current.page -
                  1
              })
            );
          } else {
            setReloadKey(
              (current) =>
                current + 1
            );
          }
        } catch (
          deleteError
        ) {
          setError(
            getErrorMessage(
              deleteError,
              "Salary structure could not be deleted."
            )
          );
        } finally {
          setDeleting(false);
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

        const currentPage =
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
            currentPage - 2
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
    | Table Column Count
    |--------------------------------------------------------------------------
    */

    const tableColumnCount =
      showSchoolColumn
        ? canManage
          ? 11
          : 10
        : canManage
          ? 10
          : 9;

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
      <div className="space-y-5">
        {/*
        |--------------------------------------------------------------------------
        | Page Header
        |--------------------------------------------------------------------------
        */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <WalletCards
                  size={20}
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                  Staff Salary
                  Structures
                </h2>

                <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                  Manage basic
                  salary,
                  allowances,
                  deductions and
                  payroll rules.
                </p>
              </div>
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

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/payroll/salary-structures/deleted"
                    )
                  }
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <Trash2
                    size={16}
                  />

                  Deleted
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/payroll/salary-structures/new"
                    )
                  }
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus
                    size={16}
                  />

                  Add Salary
                  Structure
                </button>
              </>
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

              <span>
                {error}
              </span>
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
            <span>
              {
                successMessage
              }
            </span>

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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Structures"
            value={
              summary
                .totalStructures
            }
            subtitle={`${summary.active} active · ${summary.inactive} inactive`}
            icon={Users}
          />

          <SummaryCard
            title="Total Basic Salary"
            value={formatMoney(
              summary
                .totalBasicSalary,
              "PKR"
            )}
            subtitle="Combined monthly basic salary"
            icon={Banknote}
          />

          <SummaryCard
            title="Gross Payroll"
            value={formatMoney(
              summary
                .totalGrossSalary,
              "PKR"
            )}
            subtitle="Basic salary and allowances"
            icon={
              BriefcaseBusiness
            }
          />

          <SummaryCard
            title="Estimated Net"
            value={formatMoney(
              summary
                .totalEstimatedNetSalary,
              "PKR"
            )}
            subtitle="After fixed deductions"
            icon={Calculator}
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
                Search and
                Filters
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
                placeholder="Search staff, employee ID, department..."
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

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>

            <select
              value={
                filters
                  .calculationBasis
              }
              className="field-select"
              onChange={(
                event
              ) =>
                updateFilter(
                  "calculationBasis",
                  event.target
                    .value
                )
              }
            >
              <option value="">
                All calculation
                methods
              </option>

              <option value="attendance_based">
                Attendance Based
              </option>

              <option value="fixed_monthly">
                Fixed Monthly
              </option>
            </select>

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
                All payment
                methods
              </option>

              <option value="bank_transfer">
                Bank Transfer
              </option>

              <option value="cash">
                Cash
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
                Sort by Created
                Date
              </option>

              <option value="staffNameSnapshot">
                Sort by Staff
                Name
              </option>

              <option value="basicSalary">
                Sort by Basic
                Salary
              </option>

              <option value="effectiveFrom">
                Sort by Effective
                Date
              </option>

              <option value="updatedAt">
                Sort by Updated
                Date
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
        | Salary Structure Table
        |--------------------------------------------------------------------------
        */}

        <div className="card overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Salary Structure
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
                    Department
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Basic Salary
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Gross Salary
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Deductions
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Estimated Net
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Calculation
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Effective From
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  {canManage && (
                    <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  )}

                  {!canManage && (
                    <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      View
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <LoadingRows
                    columns={
                      tableColumnCount
                    }
                  />
                ) : salaryStructures.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        tableColumnCount
                      }
                      className="px-6 py-16 text-center"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <WalletCards
                          size={26}
                        />
                      </div>

                      <h4 className="mt-4 text-sm font-bold text-slate-700">
                        No salary
                        structures found
                      </h4>

                      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                        {hasActiveFilters
                          ? "No records match the selected search and filters."
                          : "Create a salary structure before generating monthly payroll."}
                      </p>

                      <div className="mt-5 flex justify-center gap-2">
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={
                              clearFilters
                            }
                            className="btn-secondary"
                          >
                            Clear
                            Filters
                          </button>
                        )}

                        {canManage &&
                          !hasActiveFilters && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  "/payroll/salary-structures/new"
                                )
                              }
                              className="btn-primary inline-flex items-center gap-2"
                            >
                              <Plus
                                size={
                                  16
                                }
                              />

                              Add Salary
                              Structure
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  salaryStructures.map(
                    (
                      structure
                    ) => {
                      const staff =
                        structure.staffId ||
                        {};

                      const school =
                        structure.schoolId ||
                        {};

                      const calculation =
                        structure.calculation ||
                        {};

                      const staffName =
                        staff.name ||
                        structure
                          .staffNameSnapshot ||
                        "Unknown Staff";

                      const employeeId =
                        staff.employeeId ||
                        structure
                          .employeeIdSnapshot ||
                        "—";

                      const department =
                        staff.department ||
                        structure
                          .departmentSnapshot ||
                        "—";

                      const designation =
                        staff.designation ||
                        structure
                          .designationSnapshot ||
                        "—";

                      const currency =
                        structure.currency ||
                        calculation.currency ||
                        "PKR";

                      const basicSalary =
                        calculation
                          .basicSalary ??
                        structure
                          .basicSalary ??
                        0;

                      const grossSalary =
                        calculation
                          .grossSalary ??
                        structure
                          .grossSalary ??
                        0;

                      const deductions =
                        calculation
                          .deductions
                          ?.total ??
                        structure
                          .fixedDeductionsTotal ??
                        0;

                      const estimatedNet =
                        calculation
                          .estimatedNetSalary ??
                        structure
                          .estimatedNetSalary ??
                        0;

                      return (
                        <tr
                          key={
                            structure._id
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
                              </div>
                            </div>
                          </td>

                          {showSchoolColumn && (
                            <td className="whitespace-nowrap px-4 py-4">
                              <p className="max-w-40 truncate text-xs font-semibold text-slate-600">
                                {school.schoolName ||
                                  "—"}
                              </p>

                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {school.schoolCode ||
                                  ""}
                              </p>
                            </td>
                          )}

                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="max-w-40 truncate text-xs font-semibold text-slate-600">
                              {
                                department
                              }
                            </p>

                            <p className="mt-0.5 max-w-40 truncate text-[11px] text-slate-400">
                              {
                                designation
                              }
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-semibold text-slate-600">
                            {formatMoney(
                              basicSalary,
                              currency
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold text-slate-700">
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

                          <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold text-emerald-700">
                            {formatMoney(
                              estimatedNet,
                              currency
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="text-xs font-semibold text-slate-600">
                              {formatLabel(
                                structure
                                  .calculationBasis
                              )}
                            </p>

                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {structure
                                .fixedWorkingDays ||
                                26}{" "}
                              working
                              days
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                            {formatDate(
                              structure
                                .effectiveFrom
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <StatusBadge
                              status={
                                structure.status
                              }
                            />
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/payroll/salary-structures/${structure._id}`
                                  )
                                }
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-700"
                                title="View details"
                              >
                                <Eye
                                  size={
                                    16
                                  }
                                />
                              </button>

                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/payroll/salary-structures/${structure._id}/edit`
                                      )
                                    }
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"
                                    title="Edit salary structure"
                                  >
                                    <FilePenLine
                                      size={
                                        16
                                      }
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openDeleteModal(
                                        structure
                                      )
                                    }
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                    title="Delete salary structure"
                                  >
                                    <Trash2
                                      size={
                                        16
                                      }
                                    />
                                  </button>
                                </>
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

        <DeleteConfirmationModal
          open={
            deleteModal.open
          }
          structure={
            deleteModal.structure
          }
          deleting={
            deleting
          }
          onClose={
            closeDeleteModal
          }
          onConfirm={
            confirmDelete
          }
        />
      </div>
    );
  };

export default SalaryStructureList;