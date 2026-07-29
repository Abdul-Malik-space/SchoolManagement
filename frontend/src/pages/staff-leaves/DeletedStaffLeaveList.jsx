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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Filter,
  Landmark,
  RefreshCcw,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  X
} from "lucide-react";

import api from "../../api/axios";

import {
  getDeletedStaffLeaves,
  restoreStaffLeave
} from "../../api/staffLeaves";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const LEAVE_TYPES = [
  {
    value: "casual",
    label: "Casual Leave"
  },
  {
    value: "sick",
    label: "Sick Leave"
  },
  {
    value: "annual",
    label: "Annual Leave"
  },
  {
    value: "emergency",
    label: "Emergency Leave"
  },
  {
    value: "maternity",
    label: "Maternity Leave"
  },
  {
    value: "paternity",
    label: "Paternity Leave"
  },
  {
    value: "bereavement",
    label: "Bereavement Leave"
  },
  {
    value: "study",
    label: "Study Leave"
  },
  {
    value: "unpaid",
    label: "Unpaid Leave"
  },
  {
    value: "other",
    label: "Other Leave"
  }
];

const STATUS_OPTIONS = [
  {
    value: "pending",
    label: "Pending"
  },
  {
    value: "approved",
    label: "Approved"
  },
  {
    value: "rejected",
    label: "Rejected"
  },
  {
    value: "cancelled",
    label: "Cancelled"
  }
];

const createInitialFilters =
  () => ({
    schoolId: "",
    search: "",
    leaveType: "",
    status: "",
    leaveYear: "",
    fromDate: "",
    toDate: "",
    sortBy: "deletedAt",
    sortOrder: "desc",
    page: 1,
    limit: 10
  });

const createInitialRestoreModal =
  () => ({
    open: false,
    staffLeave: null
  });

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const safeNumber = (
  value,
  fallback = 0
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
};

const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.message ||
    fallback
  );
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
  value
) => {
  return String(
    value || "Staff"
  )
    .split(" ")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0)
    )
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getLeaveTypeLabel = (
  staffLeave
) => {
  if (
    staffLeave?.leaveType ===
    "other"
  ) {
    return (
      staffLeave
        .customLeaveType ||
      "Other Leave"
    );
  }

  return (
    LEAVE_TYPES.find(
      (item) =>
        item.value ===
        staffLeave?.leaveType
    )?.label ||
    formatLabel(
      staffLeave?.leaveType
    )
  );
};

const getDurationLabel = (
  staffLeave
) => {
  if (
    staffLeave?.durationLabel
  ) {
    return staffLeave.durationLabel;
  }

  if (
    staffLeave?.dayType ===
    "half_day"
  ) {
    return staffLeave
      .halfDaySession ===
      "first_half"
      ? "Half Day · First Half"
      : "Half Day · Second Half";
  }

  const days =
    safeNumber(
      staffLeave?.totalDays
    );

  return `${days} ${
    days === 1
      ? "Day"
      : "Days"
  }`;
};

/*
|--------------------------------------------------------------------------
| API Response Helpers
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
      data.records,
      data.results,
      data.data
    ].find(
      Array.isArray
    ) || []
  );
};

const extractStaffLeaves = (
  response
) => {
  return (
    [
      response?.staffLeaves,
      response?.leaves,
      response?.records,
      response?.data
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

const StatusBadge = ({
  status
}) => {
  const normalizedStatus =
    String(
      status || ""
    ).toLowerCase();

  const styles = {
    pending:
      "bg-amber-50 text-amber-700 ring-amber-600/15",

    approved:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/15",

    rejected:
      "bg-rose-50 text-rose-700 ring-rose-600/15",

    cancelled:
      "bg-slate-100 text-slate-600 ring-slate-500/15"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
        styles[
          normalizedStatus
        ] ||
        styles.cancelled
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
  label,
  value,
  description,
  icon: Icon,
  tone = "brand"
}) => {
  const toneStyles = {
    brand:
      "bg-brand-50 text-brand-700",

    danger:
      "bg-rose-50 text-rose-700",

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
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-800">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            toneStyles[tone] ||
            toneStyles.brand
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
  }).map(
    (_, rowIndex) => (
      <tr
        key={rowIndex}
        className="border-b border-slate-100"
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
    )
  );
};

/*
|--------------------------------------------------------------------------
| Restore Confirmation Modal
|--------------------------------------------------------------------------
*/

const RestoreModal = ({
  state,
  processing,
  error,
  onClose,
  onConfirm
}) => {
  if (!state.open) {
    return null;
  }

  const staffLeave =
    state.staffLeave || {};

  const staff =
    staffLeave.staffId || {};

  const staffName =
    staff.name ||
    staffLeave
      .staffNameSnapshot ||
    "Staff Member";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 cursor-default"
        onClick={
          processing
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
                Restore Leave Request
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Return this leave request
                to the active leave
                records.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {error}
              </span>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Staff Member
            </p>

            <p className="mt-1 text-sm font-bold text-slate-800">
              {staffName}
            </p>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>
                {staffLeave.applicationNumber ||
                  "—"}
              </span>

              <span>
                {getLeaveTypeLabel(
                  staffLeave
                )}
              </span>

              <span>
                {getDurationLabel(
                  staffLeave
                )}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <p className="text-xs leading-5 text-amber-700">
                Restore may fail when
                another active leave uses
                the same application
                number or overlaps with
                this leave period.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={processing}
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={processing}
              onClick={onConfirm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? (
                <RefreshCcw
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <ArchiveRestore
                  size={16}
                />
              )}

              {processing
                ? "Restoring..."
                : "Restore Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Deleted Staff Leave List
|--------------------------------------------------------------------------
*/

export const DeletedStaffLeaveList =
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

    const canRecover =
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
      staffLeaves,
      setStaffLeaves
    ] = useState([]);

    const [
      schools,
      setSchools
    ] = useState([]);

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
      summary,
      setSummary
    ] = useState({
      totalRequests: 0,
      totalDays: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0
    });

    const [
      pagination,
      setPagination
    ] = useState({
      total: 0,
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
      schoolsLoading,
      setSchoolsLoading
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
    ] = useState(
      createInitialRestoreModal
    );

    const [
      restoreProcessing,
      setRestoreProcessing
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
      if (!canRecover) {
        navigate(
          "/staff-leaves",
          {
            replace: true
          }
        );
      }
    }, [
      canRecover,
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
                    limit: 100
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

          leaveType:
            filters.leaveType,

          status:
            filters.status,

          leaveYear:
            filters.leaveYear,

          fromDate:
            filters.fromDate,

          toDate:
            filters.toDate,

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
          filters.leaveType,
          filters.status,
          filters.leaveYear,
          filters.fromDate,
          filters.toDate,
          filters.sortBy,
          filters.sortOrder,
          filters.page,
          filters.limit
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Load Deleted Leave Records
    |--------------------------------------------------------------------------
    */

    const loadDeletedLeaves =
      useCallback(
        async (
          showMainLoader =
            false
        ) => {
          if (!canRecover) {
            return;
          }

          if (showMainLoader) {
            setLoading(true);
          }

          setError("");

          try {
            const response =
              await getDeletedStaffLeaves(
                queryParams
              );

            const records =
              extractStaffLeaves(
                response
              );

            setStaffLeaves(
              records
            );

            setSummary({
              totalRequests:
                safeNumber(
                  response?.summary
                    ?.totalRequests
                ),

              totalDays:
                safeNumber(
                  response?.summary
                    ?.totalDays
                ),

              pending:
                safeNumber(
                  response?.summary
                    ?.pending
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

              cancelled:
                safeNumber(
                  response?.summary
                    ?.cancelled
                )
            });

            const responsePagination =
              response?.pagination ||
              {};

            const total =
              safeNumber(
                responsePagination
                  .total,
                records.length
              );

            const currentPage =
              safeNumber(
                responsePagination
                  .currentPage ||
                  responsePagination
                    .page,
                filters.page
              );

            const limit =
              safeNumber(
                responsePagination
                  .limit,
                filters.limit
              );

            const totalPages =
              Math.max(
                1,
                safeNumber(
                  responsePagination
                    .totalPages,
                  Math.ceil(
                    total /
                      Math.max(
                        1,
                        limit
                      )
                  )
                )
              );

            setPagination({
              total,
              currentPage,
              limit,
              totalPages,

              hasNextPage:
                responsePagination
                  .hasNextPage ??
                currentPage <
                  totalPages,

              hasPreviousPage:
                responsePagination
                  .hasPreviousPage ??
                currentPage > 1
            });
          } catch (
            requestError
          ) {
            setStaffLeaves([]);

            setError(
              getErrorMessage(
                requestError,
                "Deleted leave records could not be loaded."
              )
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        [
          canRecover,
          queryParams,
          filters.page,
          filters.limit
        ]
      );

    useEffect(() => {
      loadDeletedLeaves(
        true
      );
    }, [
      loadDeletedLeaves,
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
        filters.leaveType ||
        filters.status ||
        filters.leaveYear ||
        filters.fromDate ||
        filters.toDate
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
    | Restore Modal
    |--------------------------------------------------------------------------
    */

    const openRestoreModal = (
      staffLeave
    ) => {
      setRestoreError("");

      setRestoreModal({
        open: true,
        staffLeave
      });
    };

    const closeRestoreModal =
      () => {
        if (
          restoreProcessing
        ) {
          return;
        }

        setRestoreError("");

        setRestoreModal(
          createInitialRestoreModal()
        );
      };

    const confirmRestore =
      async () => {
        const leaveId =
          restoreModal
            .staffLeave?._id;

        if (
          !leaveId ||
          restoreProcessing
        ) {
          return;
        }

        setRestoreProcessing(
          true
        );

        setRestoreError("");
        setError("");

        try {
          const response =
            await restoreStaffLeave(
              leaveId
            );

          setSuccessMessage(
            response?.message ||
              "Leave request restored successfully."
          );

          setRestoreModal(
            createInitialRestoreModal()
          );

          if (
            staffLeaves.length ===
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
              "Leave request could not be restored."
            )
          );
        } finally {
          setRestoreProcessing(
            false
          );
        }
      };

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
            pagination.totalPages
          );

        const currentPage =
          Math.min(
            Math.max(
              1,
              pagination.currentPage
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

    const tableColumnCount =
      showSchoolColumn
        ? 9
        : 8;

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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/staff-leaves"
                )
              }
              className="mt-0.5 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Back"
            >
              <ArrowLeft
                size={18}
              />
            </button>

            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2
                  size={21}
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                  Deleted Staff Leaves
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
                  Review and restore
                  deleted staff leave
                  requests.
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
                  "/staff-leaves"
                )
              }
              className="btn-primary inline-flex items-center gap-2"
            >
              <ArrowLeft
                size={16}
              />

              Active Leaves
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
              <CheckCircle2
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
            label="Deleted Requests"
            value={
              summary.totalRequests
            }
            description={`${summary.totalDays} deleted leave day(s)`}
            icon={Trash2}
            tone="danger"
          />

          <SummaryCard
            label="Pending"
            value={
              summary.pending
            }
            description="Deleted before approval"
            icon={Clock3}
            tone="warning"
          />

          <SummaryCard
            label="Rejected"
            value={
              summary.rejected
            }
            description="Rejected leave records"
            icon={FileText}
            tone="danger"
          />

          <SummaryCard
            label="Cancelled"
            value={
              summary.cancelled
            }
            description={`${summary.approved} approved record(s)`}
            icon={RotateCcw}
            tone="slate"
          />
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */}

        <section className="card p-4 sm:p-5">
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
                className="text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={
                  filters.search
                }
                placeholder="Search application, staff, employee ID or reason..."
                className="field-input pl-9"
                onChange={(
                  event
                ) =>
                  updateFilter(
                    "search",
                    event.target.value
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
                    event.target.value
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
                filters.leaveType
              }
              className="field-select"
              onChange={(
                event
              ) =>
                updateFilter(
                  "leaveType",
                  event.target.value
                )
              }
            >
              <option value="">
                All leave types
              </option>

              {LEAVE_TYPES.map(
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {item.label}
                  </option>
                )
              )}
            </select>

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
                  event.target.value
                )
              }
            >
              <option value="">
                All statuses
              </option>

              {STATUS_OPTIONS.map(
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {item.label}
                  </option>
                )
              )}
            </select>

            <input
              type="number"
              min="2000"
              max="2100"
              value={
                filters.leaveYear
              }
              placeholder="Leave year"
              className="field-input"
              onChange={(
                event
              ) =>
                updateFilter(
                  "leaveYear",
                  event.target.value
                )
              }
            />

            <div>
              <label className="field-label">
                Leave From
              </label>

              <input
                type="date"
                value={
                  filters.fromDate
                }
                className="field-input"
                onChange={(
                  event
                ) =>
                  updateFilter(
                    "fromDate",
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <label className="field-label">
                Leave To
              </label>

              <input
                type="date"
                min={
                  filters.fromDate ||
                  undefined
                }
                value={
                  filters.toDate
                }
                className="field-input"
                onChange={(
                  event
                ) =>
                  updateFilter(
                    "toDate",
                    event.target.value
                  )
                }
              />
            </div>

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
                  event.target.value
                )
              }
            >
              <option value="deletedAt">
                Sort by Deleted Date
              </option>

              <option value="createdAt">
                Sort by Created Date
              </option>

              <option value="startDate">
                Sort by Start Date
              </option>

              <option value="endDate">
                Sort by End Date
              </option>

              <option value="applicationNumber">
                Sort by Application
              </option>

              <option value="staffNameSnapshot">
                Sort by Staff Name
              </option>

              <option value="leaveType">
                Sort by Leave Type
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
                  event.target.value
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
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Deleted Leave Table
        |--------------------------------------------------------------------------
        */}

        <section className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Deleted Leave Records
              </h3>

              <p className="mt-0.5 text-xs text-slate-400">
                {pagination.total}{" "}
                deleted record
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
                    event.target.value
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
                    Application
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Leave Type
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Leave Period
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Duration
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Deleted Information
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
                ) : staffLeaves.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        tableColumnCount
                      }
                      className="px-6 py-16 text-center"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <Trash2
                          size={26}
                        />
                      </div>

                      <h4 className="mt-4 text-sm font-bold text-slate-700">
                        No deleted leaves
                      </h4>

                      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                        {hasActiveFilters
                          ? "No deleted leave records match the selected filters."
                          : "Deleted staff leave records will appear here."}
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
                              "/staff-leaves"
                            )
                          }
                          className="btn-primary inline-flex items-center gap-2"
                        >
                          <ArrowLeft
                            size={16}
                          />

                          Active Leaves
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  staffLeaves.map(
                    (
                      staffLeave
                    ) => {
                      const staff =
                        staffLeave.staffId ||
                        {};

                      const school =
                        staffLeave.schoolId ||
                        {};

                      const deletedBy =
                        staffLeave.deletedBy ||
                        {};

                      const staffName =
                        staff.name ||
                        staffLeave
                          .staffNameSnapshot ||
                        "Unknown Staff";

                      const employeeId =
                        staff.employeeId ||
                        staffLeave
                          .employeeIdSnapshot ||
                        "—";

                      const department =
                        staff.department ||
                        staffLeave
                          .departmentSnapshot ||
                        "—";

                      return (
                        <tr
                          key={
                            staffLeave._id
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
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
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
                                      school.code ||
                                      ""}
                                  </p>
                                </div>
                              </div>
                            </td>
                          )}

                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="text-xs font-bold text-slate-700">
                              {staffLeave.applicationNumber ||
                                "—"}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              Created{" "}
                              {formatDate(
                                staffLeave.createdAt
                              )}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="text-xs font-semibold text-slate-700">
                              {getLeaveTypeLabel(
                                staffLeave
                              )}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              {formatLabel(
                                staffLeave.dayType
                              )}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex items-start gap-2">
                              <CalendarDays
                                size={14}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />

                              <div>
                                <p className="text-xs font-semibold text-slate-700">
                                  {formatDate(
                                    staffLeave.startDate
                                  )}
                                </p>

                                <p className="mt-0.5 text-[10px] text-slate-400">
                                  to{" "}
                                  {formatDate(
                                    staffLeave.endDate
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="text-xs font-bold text-slate-700">
                              {getDurationLabel(
                                staffLeave
                              )}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              {safeNumber(
                                staffLeave.calendarDays
                              )}{" "}
                              calendar day(s)
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <StatusBadge
                              status={
                                staffLeave.status
                              }
                            />
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex items-start gap-2">
                              <Clock3
                                size={14}
                                className="mt-0.5 shrink-0 text-rose-400"
                              />

                              <div>
                                <p className="text-xs font-semibold text-slate-700">
                                  {formatDateTime(
                                    staffLeave.deletedAt
                                  )}
                                </p>

                                <p className="mt-0.5 max-w-36 truncate text-[10px] text-slate-400">
                                  By{" "}
                                  {deletedBy.name ||
                                    deletedBy.email ||
                                    "System User"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                title="View Staff"
                                disabled={
                                  !staff._id
                                }
                                onClick={() =>
                                  staff._id &&
                                  navigate(
                                    `/staff/${staff._id}`
                                  )
                                }
                                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Eye
                                  size={15}
                                />
                              </button>

                              <button
                                type="button"
                                title="Restore Leave"
                                onClick={() =>
                                  openRestoreModal(
                                    staffLeave
                                  )
                                }
                                className="rounded-lg border border-emerald-200 p-2 text-emerald-700 transition hover:bg-emerald-50"
                              >
                                <ArchiveRestore
                                  size={15}
                                />
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
                          filters.page - 1
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
                          filters.page + 1
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
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Restore Modal
        |--------------------------------------------------------------------------
        */}

        <RestoreModal
          state={
            restoreModal
          }
          processing={
            restoreProcessing
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

export default DeletedStaffLeaveList;