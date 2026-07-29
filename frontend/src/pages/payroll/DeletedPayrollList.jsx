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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Filter,
  Landmark,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
  X
} from "lucide-react";

import api from "../../api/axios";

import {
  getDeletedPayrolls,
  restorePayroll
} from "../../api/payroll";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Month Options
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

/*
|--------------------------------------------------------------------------
| Initial Filters
|--------------------------------------------------------------------------
*/

const createInitialFilters = () => ({
  schoolId: "",
  search: "",
  payrollMonth: "",
  payrollYear: "",
  status: "",
  department: "",
  paymentMethod: "",
  sortBy: "deletedAt",
  sortOrder: "desc",
  page: 1,
  limit: 10
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
    return `${currency || "PKR"} ${safeNumber(
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
      (part) =>
        part[0]
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
  }`.trim();
};

/*
|--------------------------------------------------------------------------
| Response Helpers
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

const extractDeletedPayrolls = (
  response
) => {
  return (
    [
      response?.payrolls,
      response?.deletedPayrolls,
      response?.records,
      response?.data
    ].find(
      Array.isArray
    ) || []
  );
};

/*
|--------------------------------------------------------------------------
| Payroll Status Badge
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
  const toneClasses = {
    default:
      "bg-brand-50 text-brand-700",

    danger:
      "bg-rose-50 text-rose-600",

    warning:
      "bg-amber-50 text-amber-700",

    success:
      "bg-emerald-50 text-emerald-700",

    slate:
      "bg-slate-100 text-slate-600"
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
            toneClasses[tone] ||
            toneClasses.default
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
| Restore Confirmation Modal
|--------------------------------------------------------------------------
*/

const RestorePayrollModal = ({
  open,
  payroll,
  restoring,
  error,
  onClose,
  onConfirm
}) => {
  if (!open) {
    return null;
  }

  const staffName =
    payroll?.staffId?.name ||
    payroll
      ?.staffNameSnapshot ||
    "this staff member";

  const payrollPeriod =
    getPeriodLabel(
      payroll
    );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
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
                Restore Payroll
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                This record will return
                to the active payroll
                list.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={restoring}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
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

          <p className="text-sm leading-6 text-slate-600">
            Restore the payroll for{" "}
            <span className="font-bold text-slate-800">
              {staffName}
            </span>{" "}
            for{" "}
            <span className="font-bold text-slate-800">
              {payrollPeriod}
            </span>
            ?
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <p className="text-xs leading-5 text-amber-700">
                Restore will fail when
                another active payroll
                already exists for the
                same staff member, month
                and year.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                : "Restore Payroll"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Deleted Payroll List Page
|--------------------------------------------------------------------------
*/

export const DeletedPayrollList =
  () => {
    const navigate =
      useNavigate();

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

    const canManage =
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
      schools,
      setSchools
    ] = useState([]);

    const [
      schoolsLoading,
      setSchoolsLoading
    ] = useState(false);

    const [
      filters,
      setFilters
    ] = useState(
      createInitialFilters
    );

    const [
      debouncedSearch,
      setDebouncedSearch
    ] = useState("");

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
      payroll: null
    });

    const [
      restoring,
      setRestoring
    ] = useState(false);

    const [
      restoreError,
      setRestoreError
    ] = useState("");

    /*
    |--------------------------------------------------------------------------
    | Permission Redirect
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (!canManage) {
        navigate(
          "/payroll",
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
              String(
                filters.search ||
                ""
              ).trim()
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
            String(
              filters.department ||
              ""
            ).trim(),

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
    | Load Deleted Payrolls
    |--------------------------------------------------------------------------
    */

    const loadDeletedPayrolls =
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
              await getDeletedPayrolls(
                queryParams
              );

            const records =
              extractDeletedPayrolls(
                response
              );

            setPayrolls(
              records
            );

            const responsePagination =
              response?.pagination ||
              {};

            setPagination({
              total:
                safeNumber(
                  responsePagination
                    .total
                ) ||
                records.length,

              page:
                safeNumber(
                  responsePagination
                    .page
                ) || 1,

              currentPage:
                safeNumber(
                  responsePagination
                    .currentPage ||
                  responsePagination
                    .page
                ) || 1,

              limit:
                safeNumber(
                  responsePagination
                    .limit
                ) ||
                filters.limit,

              totalPages:
                safeNumber(
                  responsePagination
                    .totalPages
                ) || 1,

              hasNextPage:
                Boolean(
                  responsePagination
                    .hasNextPage
                ),

              hasPreviousPage:
                Boolean(
                  responsePagination
                    .hasPreviousPage
                )
            });
          } catch (
            requestError
          ) {
            setPayrolls([]);

            setError(
              getErrorMessage(
                requestError,
                "Deleted payroll records could not be loaded."
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
      loadDeletedPayrolls(
        true
      );
    }, [
      loadDeletedPayrolls,
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
          4500
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
    | Filters
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
          createInitialFilters()
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
        filters.payrollYear ||
        filters.status ||
        filters.department ||
        filters.paymentMethod
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
    | Restore Payroll
    |--------------------------------------------------------------------------
    */

    const openRestoreModal = (
      payroll
    ) => {
      setRestoreError("");

      setRestoreModal({
        open: true,
        payroll
      });
    };

    const closeRestoreModal =
      () => {
        if (restoring) {
          return;
        }

        setRestoreError("");

        setRestoreModal({
          open: false,
          payroll: null
        });
      };

    const confirmRestore =
      async () => {
        const payrollId =
          restoreModal
            .payroll?._id;

        if (
          !payrollId ||
          restoring
        ) {
          return;
        }

        setRestoring(true);
        setRestoreError("");
        setError("");

        try {
          const response =
            await restorePayroll(
              payrollId
            );

          setSuccessMessage(
            response?.message ||
            "Payroll restored successfully."
          );

          setRestoreModal({
            open: false,
            payroll: null
          });

          if (
            payrolls.length ===
              1 &&
            filters.page > 1
          ) {
            setFilters(
              (current) => ({
                ...current,

                page:
                  Math.max(
                    1,
                    current.page - 1
                  )
              })
            );
          } else {
            setReloadKey(
              (current) =>
                current + 1
            );
          }
        } catch (
          requestError
        ) {
          setRestoreError(
            getErrorMessage(
              requestError,
              "Payroll could not be restored."
            )
          );
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
        const result = {
          draft: 0,
          generated: 0,
          rejected: 0,
          cancelled: 0,
          totalsByCurrency: {}
        };

        payrolls.forEach(
          (payroll) => {
            const status =
              String(
                payroll.status ||
                ""
              ).toLowerCase();

            if (
              Object.prototype
                .hasOwnProperty.call(
                  result,
                  status
                )
            ) {
              result[status] +=
                1;
            }

            const currency =
              payroll.currency ||
              "PKR";

            if (
              !result
                .totalsByCurrency[
                  currency
                ]
            ) {
              result
                .totalsByCurrency[
                  currency
                ] = 0;
            }

            result
              .totalsByCurrency[
                currency
              ] +=
              safeNumber(
                payroll.netSalary
              );
          }
        );

        return result;
      }, [
        payrolls
      ]);

    const currencyEntries =
      Object.entries(
        pageSummary
          .totalsByCurrency
      );

    const netSummaryValue =
      currencyEntries.length ===
      1
        ? formatMoney(
            currencyEntries[0][1],
            currencyEntries[0][0]
          )
        : currencyEntries.length >
            1
          ? `${currencyEntries.length} currencies`
          : formatMoney(
              0,
              "PKR"
            );

    const netSummarySubtitle =
      currencyEntries.length >
      1
        ? "Currencies are not combined"
        : "Net salary on current page";

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
                  "/payroll"
                )
              }
              className="mt-0.5 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Back"
            >
              <ArrowLeft
                size={18}
              />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2
                  size={21}
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                  Deleted Payroll
                </h2>

                <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                  Review and restore
                  deleted monthly payroll
                  records.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={refreshing}
              onClick={
                handleRefresh
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
                  "/payroll"
                )
              }
              className="btn-primary inline-flex items-center gap-2"
            >
              <WalletCards
                size={16}
              />

              Active Payroll
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
            <div className="flex items-start gap-2">
              <ArchiveRestore
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {successMessage}
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
            subtitle="Total deleted payroll records"
            icon={Trash2}
            tone="danger"
          />

          <SummaryCard
            title="Current Page"
            value={
              payrolls.length
            }
            subtitle={`${pageSummary.draft} draft · ${pageSummary.generated} generated`}
            icon={ReceiptText}
          />

          <SummaryCard
            title="Closed Records"
            value={
              pageSummary.rejected +
              pageSummary.cancelled
            }
            subtitle={`${pageSummary.rejected} rejected · ${pageSummary.cancelled} cancelled`}
            icon={ShieldCheck}
            tone="warning"
          />

          <SummaryCard
            title="Page Net Salary"
            value={
              netSummaryValue
            }
            subtitle={
              netSummarySubtitle
            }
            icon={
              CircleDollarSign
            }
            tone="success"
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

                      {school.schoolCode
                        ? ` (${school.schoolCode})`
                        : ""}
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
                filters.payrollYear
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
              <option value="deletedAt">
                Sort by Deleted Date
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
        | Deleted Payroll Table
        |--------------------------------------------------------------------------
        */}

        <div className="card overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Deleted Payroll
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
                    Status
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Deleted Information
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
                        <ArchiveRestore
                          size={26}
                        />
                      </div>

                      <h4 className="mt-4 text-sm font-bold text-slate-700">
                        No deleted payroll
                        records
                      </h4>

                      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                        {hasActiveFilters
                          ? "No deleted payroll records match the selected filters."
                          : "Deleted payroll records will appear here and can be restored."}
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
                              "/payroll"
                            )
                          }
                          className="btn-primary inline-flex items-center gap-2"
                        >
                          <WalletCards
                            size={16}
                          />

                          Active Payroll
                        </button>
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

                      const earnings =
                        payroll.earnings ||
                        {};

                      const deductions =
                        payroll.deductions ||
                        {};

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

                      const currency =
                        payroll.currency ||
                        "PKR";

                      const grossSalary =
                        earnings
                          .grossEarnings ??
                        payroll
                          .salaryStructureSnapshot
                          ?.grossSalary ??
                        0;

                      const totalDeductions =
                        deductions
                          .totalDeductions ??
                        0;

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
                                  {staffName}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  {employeeId}
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
                                      school.name ||
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
                            <div className="flex items-start gap-2">
                              <CalendarDays
                                size={14}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />

                              <div>
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
                              </div>
                            </div>
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
                              totalDeductions,
                              currency
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-bold text-emerald-700">
                            {formatMoney(
                              payroll.netSalary,
                              currency
                            )}
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
                                  title={
                                    payroll.rejectionReason
                                  }
                                  className="mt-1 max-w-40 truncate text-[10px] text-rose-500"
                                >
                                  {
                                    payroll.rejectionReason
                                  }
                                </p>
                              )}

                            {payroll.status ===
                              "cancelled" &&
                              payroll.cancellationReason && (
                                <p
                                  title={
                                    payroll.cancellationReason
                                  }
                                  className="mt-1 max-w-40 truncate text-[10px] text-slate-400"
                                >
                                  {
                                    payroll.cancellationReason
                                  }
                                </p>
                              )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="text-xs font-semibold text-slate-600">
                              {formatDate(
                                payroll.deletedAt
                              )}
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {formatDateTime(
                                payroll.deletedAt
                              )}
                            </p>

                            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                              <UserRound
                                size={11}
                              />

                              <span>
                                {payroll.deletedBy
                                  ?.name ||
                                  "System User"}
                              </span>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  openRestoreModal(
                                    payroll
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                              >
                                <ArchiveRestore
                                  size={15}
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
                      !pagination
                        .hasPreviousPage
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
                      !pagination
                        .hasNextPage
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

        <RestorePayrollModal
          open={
            restoreModal.open
          }
          payroll={
            restoreModal.payroll
          }
          restoring={
            restoring
          }
          error={
            restoreError
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

export default DeletedPayrollList;