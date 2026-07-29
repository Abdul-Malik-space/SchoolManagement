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
  ArchiveRestore,
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Filter,
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
  getDeletedSalaryStructures,
  restoreSalaryStructure
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
  page: 1,
  limit: 10
};

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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
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

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
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
| Restore Confirmation Modal
|--------------------------------------------------------------------------
*/

const RestoreConfirmationModal = ({
  open,
  structure,
  restoring,
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
          restoring
            ? undefined
            : onClose
        }
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ArchiveRestore
                size={21}
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-800">
                Restore Salary
                Structure
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                The structure will
                return to the active
                salary structures list.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={restoring}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm leading-6 text-slate-600">
            Restore the salary
            structure for{" "}
            <span className="font-bold text-slate-800">
              {staffName}
            </span>
            ?
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <p className="text-xs leading-5 text-amber-700">
                Restore will fail if
                this staff member
                already has another
                active salary
                structure.
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={restoring}
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={restoring}
              onClick={onConfirm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {restoring ? (
                <RefreshCcw
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <ArchiveRestore
                  size={16}
                />
              )}

              {restoring
                ? "Restoring..."
                : "Restore Structure"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Deleted Salary Structure List
|--------------------------------------------------------------------------
*/

export const DeletedSalaryStructureList =
  () => {
    const navigate =
      useNavigate();

    const {
      user
    } = useAuth();

    /*
    |--------------------------------------------------------------------------
    | Role Permission
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
      restoreModal,
      setRestoreModal
    ] = useState({
      open: false,
      structure: null
    });

    const [
      restoring,
      setRestoring
    ] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Role Redirect
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (!canManage) {
        navigate(
          "/payroll/salary-structures",
          {
            replace: true
          }
        );
      }
    }, [
      canManage,
      navigate
    ]);

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
          filters.page,
          filters.limit
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Load Deleted Salary Structures
    |--------------------------------------------------------------------------
    */

    const loadDeletedStructures =
      useCallback(
        async (
          showMainLoader =
            false
        ) => {
          if (!canManage) {
            return;
          }

          if (showMainLoader) {
            setLoading(true);
          }

          setError("");

          try {
            const response =
              await getDeletedSalaryStructures(
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

            setPagination({
              total:
                Number(
                  response
                    ?.pagination
                    ?.total || 0
                ),

              page:
                Number(
                  response
                    ?.pagination
                    ?.page || 1
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
                "Deleted salary structures could not be loaded."
              )
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        [
          canManage,
          queryParams,
          filters.limit
        ]
      );

    useEffect(() => {
      loadDeletedStructures(
        true
      );
    }, [
      loadDeletedStructures,
      reloadKey
    ]);

    /*
    |--------------------------------------------------------------------------
    | Auto Clear Success Message
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
    | Restore
    |--------------------------------------------------------------------------
    */

    const openRestoreModal = (
      structure
    ) => {
      setRestoreModal({
        open: true,
        structure
      });
    };

    const closeRestoreModal =
      () => {
        if (restoring) {
          return;
        }

        setRestoreModal({
          open: false,
          structure: null
        });
      };

    const confirmRestore =
      async () => {
        const structureId =
          restoreModal
            .structure?._id;

        if (
          !structureId ||
          restoring
        ) {
          return;
        }

        setRestoring(true);
        setError("");

        try {
          const response =
            await restoreSalaryStructure(
              structureId
            );

          setSuccessMessage(
            response?.message ||
              "Salary structure restored successfully."
          );

          setRestoreModal({
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
          restoreError
        ) {
          setError(
            getErrorMessage(
              restoreError,
              "Salary structure could not be restored."
            )
          );

          setRestoreModal({
            open: false,
            structure: null
          });
        } finally {
          setRestoring(false);
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Current Page Summary
    |--------------------------------------------------------------------------
    */

    const pageSummary =
      useMemo(() => {
        return salaryStructures.reduce(
          (
            result,
            structure
          ) => {
            const calculation =
              structure.calculation ||
              {};

            result.basicSalary +=
              safeNumber(
                calculation
                  .basicSalary ??
                  structure
                    .basicSalary
              );

            result.grossSalary +=
              safeNumber(
                calculation
                  .grossSalary ??
                  structure
                    .grossSalary
              );

            result.netSalary +=
              safeNumber(
                calculation
                  .estimatedNetSalary ??
                  structure
                    .estimatedNetSalary
              );

            return result;
          },
          {
            basicSalary: 0,
            grossSalary: 0,
            netSalary: 0
          }
        );
      }, [
        salaryStructures
      ]);

    /*
    |--------------------------------------------------------------------------
    | Pagination Numbers
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
    | Table Columns
    |--------------------------------------------------------------------------
    */

    const tableColumnCount =
      showSchoolColumn
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
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Trash2
                    size={20}
                  />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                    Deleted Salary
                    Structures
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                    Review and restore
                    deleted staff salary
                    structures.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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
              className="btn-primary inline-flex items-center gap-2"
            >
              <WalletCards
                size={16}
              />

              Active Structures
            </button>
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
              <ArchiveRestore
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Deleted Records"
            value={
              pagination.total
            }
            subtitle="Total deleted salary structures"
            icon={Trash2}
          />

          <SummaryCard
            title="Page Basic Salary"
            value={formatMoney(
              pageSummary
                .basicSalary,
              "PKR"
            )}
            subtitle="Basic salary on current page"
            icon={Banknote}
          />

          <SummaryCard
            title="Page Gross Salary"
            value={formatMoney(
              pageSummary
                .grossSalary,
              "PKR"
            )}
            subtitle="Gross salary on current page"
            icon={
              BriefcaseBusiness
            }
          />

          <SummaryCard
            title="Page Estimated Net"
            value={formatMoney(
              pageSummary
                .netSalary,
              "PKR"
            )}
            subtitle="Estimated net on current page"
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
                All payment methods
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
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Table
        |--------------------------------------------------------------------------
        */}

        <div className="card overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Deleted Records
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
                    Estimated Net
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Calculation
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Deleted At
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Previous Status
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Action
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
                        <ArchiveRestore
                          size={26}
                        />
                      </div>

                      <h4 className="mt-4 text-sm font-bold text-slate-700">
                        No deleted salary
                        structures
                      </h4>

                      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                        {hasActiveFilters
                          ? "No deleted records match the selected search and filters."
                          : "Deleted salary structures will appear here and can be restored."}
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
                          className="btn-primary"
                        >
                          Active Structures
                        </button>
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
                                  className="h-10 w-10 shrink-0 rounded-xl object-cover opacity-80 ring-1 ring-slate-200"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
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
                              calculation
                                .basicSalary ??
                                structure
                                  .basicSalary,
                              currency
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold text-slate-700">
                            {formatMoney(
                              calculation
                                .grossSalary ??
                                structure
                                  .grossSalary,
                              currency
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-bold text-emerald-700">
                            {formatMoney(
                              calculation
                                .estimatedNetSalary ??
                                structure
                                  .estimatedNetSalary,
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
                              working days
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="text-xs font-semibold text-slate-600">
                              {formatDate(
                                structure
                                  .deletedAt
                              )}
                            </p>

                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {formatDateTime(
                                structure
                                  .deletedAt
                              )}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <StatusBadge
                              status={
                                structure.status
                              }
                            />
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  openRestoreModal(
                                    structure
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                              >
                                <ArchiveRestore
                                  size={
                                    15
                                  }
                                />

                                Restore
                              </button>
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
        | Restore Modal
        |--------------------------------------------------------------------------
        */}

        <RestoreConfirmationModal
          open={
            restoreModal.open
          }
          structure={
            restoreModal.structure
          }
          restoring={
            restoring
          }
          onClose={
            closeRestoreModal
          }
          onConfirm={
            confirmRestore
          }
        />
      </div>
    );
  };

export default DeletedSalaryStructureList;