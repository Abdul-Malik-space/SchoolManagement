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
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  FileCheck2,
  FileClock,
  FilePlus2,
  FileText,
  Filter,
  Landmark,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  WalletCards,
  X,
  XCircle
} from "lucide-react";

import api from "../../api/axios";

import {
  approveStaffLeave,
  cancelStaffLeave,
  deleteStaffLeave,
  getStaffLeaves,
  rejectStaffLeave
} from "../../api/staffLeaves";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const CURRENT_YEAR =
  new Date().getFullYear();

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

const PAY_TYPE_OPTIONS = [
  {
    value: "paid",
    label: "Paid"
  },
  {
    value: "unpaid",
    label: "Unpaid"
  },
  {
    value: "partial_paid",
    label: "Partially Paid"
  }
];

const createInitialFilters = () => ({
  schoolId: "",
  search: "",
  leaveType: "",
  status: "",
  dayType: "",
  department: "",
  leaveYear: "",
  payType: "",
  fromDate: "",
  toDate: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 10
});

const createInitialActionModal =
  () => ({
    open: false,
    type: "",
    staffLeave: null,
    reason: "",
    approvalNotes: "",
    payType: "paid",
    payPercentage: 100
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
      (part) =>
        part[0]
    )
    .slice(0, 2)
    .join("")
    .toUpperCase();
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

const extractSchools = (
  response
) => {
  const data =
    response?.data || {};

  return (
    [
      data.schools,
      data.data,
      data.records,
      data.results
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

  const totalDays =
    safeNumber(
      staffLeave?.totalDays
    );

  return `${totalDays} ${
    totalDays === 1
      ? "Day"
      : "Days"
  }`;
};

/*
|--------------------------------------------------------------------------
| Badges
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

  const icons = {
    pending: Clock3,
    approved: CheckCircle2,
    rejected: XCircle,
    cancelled: Ban
  };

  const Icon =
    icons[normalizedStatus] ||
    FileText;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
        styles[
          normalizedStatus
        ] ||
        "bg-slate-100 text-slate-600 ring-slate-500/15"
      }`}
    >
      <Icon size={12} />

      {formatLabel(
        normalizedStatus
      )}
    </span>
  );
};

const PayTypeBadge = ({
  payType,
  percentage
}) => {
  const normalizedPayType =
    String(
      payType || "paid"
    ).toLowerCase();

  const styles = {
    paid:
      "bg-blue-50 text-blue-700 ring-blue-600/15",

    unpaid:
      "bg-rose-50 text-rose-700 ring-rose-600/15",

    partial_paid:
      "bg-violet-50 text-violet-700 ring-violet-600/15"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
        styles[
          normalizedPayType
        ] ||
        styles.paid
      }`}
    >
      {normalizedPayType ===
      "partial_paid"
        ? `${safeNumber(
            percentage
          )}% Paid`
        : formatLabel(
            normalizedPayType
          )}
    </span>
  );
};

const SyncBadge = ({
  status
}) => {
  const normalizedStatus =
    String(
      status ||
        "not_required"
    ).toLowerCase();

  const styles = {
    synced:
      "bg-emerald-50 text-emerald-700",

    pending:
      "bg-amber-50 text-amber-700",

    failed:
      "bg-rose-50 text-rose-700",

    not_required:
      "bg-slate-100 text-slate-500"
  };

  const labels = {
    synced:
      "Attendance Synced",

    pending:
      "Sync Pending",

    failed:
      "Sync Failed",

    not_required:
      "Not Required"
  };

  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${
        styles[
          normalizedStatus
        ] ||
        styles.not_required
      }`}
    >
      {labels[
        normalizedStatus
      ] ||
        formatLabel(
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

    warning:
      "bg-amber-50 text-amber-700",

    success:
      "bg-emerald-50 text-emerald-700",

    danger:
      "bg-rose-50 text-rose-700",

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
  }).map((_, rowIndex) => (
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
  ));
};

/*
|--------------------------------------------------------------------------
| Action Modal
|--------------------------------------------------------------------------
*/

const LeaveActionModal = ({
  state,
  processing,
  error,
  onChange,
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

  const modalInformation = {
    approve: {
      title:
        "Approve Leave Request",

      description:
        "Approve the leave and define its payroll treatment.",

      icon:
        CheckCircle2,

      iconClass:
        "bg-emerald-50 text-emerald-700",

      buttonClass:
        "bg-emerald-600 hover:bg-emerald-700",

      buttonLabel:
        "Approve Leave"
    },

    reject: {
      title:
        "Reject Leave Request",

      description:
        "Provide a clear reason for rejecting this request.",

      icon:
        XCircle,

      iconClass:
        "bg-rose-50 text-rose-700",

      buttonClass:
        "bg-rose-600 hover:bg-rose-700",

      buttonLabel:
        "Reject Leave"
    },

    cancel: {
      title:
        "Cancel Leave Request",

      description:
        "Cancel this request and record the cancellation reason.",

      icon:
        Ban,

      iconClass:
        "bg-amber-50 text-amber-700",

      buttonClass:
        "bg-amber-600 hover:bg-amber-700",

      buttonLabel:
        "Cancel Leave"
    },

    delete: {
      title:
        "Delete Leave Request",

      description:
        "This record will move to deleted leave records.",

      icon:
        Trash2,

      iconClass:
        "bg-rose-50 text-rose-700",

      buttonClass:
        "bg-rose-600 hover:bg-rose-700",

      buttonLabel:
        "Delete Request"
    }
  };

  const modal =
    modalInformation[
      state.type
    ] ||
    modalInformation.delete;

  const ModalIcon =
    modal.icon;

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

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${modal.iconClass}`}
            >
              <ModalIcon
                size={21}
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-800">
                {modal.title}
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {modal.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
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
            <p className="text-xs text-slate-400">
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

          {state.type ===
            "approve" && (
            <>
              <div>
                <label className="field-label">
                  Payroll Treatment
                </label>

                <select
                  value={
                    state.payType
                  }
                  className="field-select"
                  onChange={(
                    event
                  ) =>
                    onChange(
                      "payType",
                      event.target
                        .value
                    )
                  }
                >
                  {PAY_TYPE_OPTIONS.map(
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
              </div>

              {state.payType ===
                "partial_paid" && (
                <div>
                  <label className="field-label">
                    Paid Percentage
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      step="1"
                      value={
                        state.payPercentage
                      }
                      className="field-input pr-10"
                      onChange={(
                        event
                      ) =>
                        onChange(
                          "payPercentage",
                          event.target
                            .value
                        )
                      }
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                      %
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="field-label">
                  Approval Notes
                </label>

                <textarea
                  rows={4}
                  value={
                    state.approvalNotes
                  }
                  placeholder="Optional approval notes..."
                  className="field-input resize-none"
                  onChange={(
                    event
                  ) =>
                    onChange(
                      "approvalNotes",
                      event.target
                        .value
                    )
                  }
                />
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs leading-5 text-blue-700">
                  Approval will also
                  attempt to synchronize
                  this leave with Staff
                  Attendance.
                </p>
              </div>
            </>
          )}

          {[
            "reject",
            "cancel"
          ].includes(
            state.type
          ) && (
            <div>
              <label className="field-label">
                {state.type ===
                "reject"
                  ? "Rejection Reason"
                  : "Cancellation Reason"}
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <textarea
                rows={4}
                value={
                  state.reason
                }
                placeholder={
                  state.type ===
                  "reject"
                    ? "Explain why this leave request is being rejected..."
                    : "Explain why this leave request is being cancelled..."
                }
                className="field-input resize-none"
                onChange={(
                  event
                ) =>
                  onChange(
                    "reason",
                    event.target
                      .value
                  )
                }
              />
            </div>
          )}

          {state.type ===
            "delete" && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={17}
                  className="mt-0.5 shrink-0 text-rose-600"
                />

                <p className="text-xs leading-5 text-rose-700">
                  This is a soft delete.
                  The record can later be
                  restored from Deleted
                  Leaves.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={processing}
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>

            <button
              type="button"
              disabled={processing}
              onClick={onConfirm}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${modal.buttonClass}`}
            >
              {processing ? (
                <RefreshCcw
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <ModalIcon
                  size={16}
                />
              )}

              {processing
                ? "Processing..."
                : modal.buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Staff Leave List Page
|--------------------------------------------------------------------------
*/

export const StaffLeaveList =
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
      staffLeaves,
      setStaffLeaves
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
      summary,
      setSummary
    ] = useState({
      totalRequests: 0,
      totalDays: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      approvedDays: 0,
      paidDays: 0,
      unpaidDays: 0,
      partialPaidDays: 0
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
      actionModal,
      setActionModal
    ] = useState(
      createInitialActionModal
    );

    const [
      actionProcessing,
      setActionProcessing
    ] = useState(false);

    const [
      actionError,
      setActionError
    ] = useState("");

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

          dayType:
            filters.dayType,

          department:
            String(
              filters.department ||
                ""
            ).trim(),

          leaveYear:
            filters.leaveYear,

          payType:
            filters.payType,

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
          filters.dayType,
          filters.department,
          filters.leaveYear,
          filters.payType,
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
    | Load Staff Leaves
    |--------------------------------------------------------------------------
    */

    const loadStaffLeaves =
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
              await getStaffLeaves(
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
                ),

              approvedDays:
                safeNumber(
                  response?.summary
                    ?.approvedDays
                ),

              paidDays:
                safeNumber(
                  response?.summary
                    ?.paidDays
                ),

              unpaidDays:
                safeNumber(
                  response?.summary
                    ?.unpaidDays
                ),

              partialPaidDays:
                safeNumber(
                  response?.summary
                    ?.partialPaidDays
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

            const page =
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
              page,
              currentPage:
                page,
              limit,
              totalPages,

              hasNextPage:
                responsePagination
                  .hasNextPage ??
                page <
                  totalPages,

              hasPreviousPage:
                responsePagination
                  .hasPreviousPage ??
                page > 1
            });
          } catch (
            requestError
          ) {
            setStaffLeaves([]);

            setError(
              getErrorMessage(
                requestError,
                "Staff leave requests could not be loaded."
              )
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        [
          queryParams,
          filters.page,
          filters.limit
        ]
      );

    useEffect(() => {
      loadStaffLeaves(
        true
      );
    }, [
      loadStaffLeaves,
      reloadKey
    ]);

    /*
    |--------------------------------------------------------------------------
    | Auto Clear Success
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
    | Filter Actions
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
        filters.dayType ||
        filters.department ||
        filters.leaveYear ||
        filters.payType ||
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
    | Modal Actions
    |--------------------------------------------------------------------------
    */

    const openActionModal = (
      type,
      staffLeave
    ) => {
      const existingPayType =
        staffLeave
          ?.payrollImpact
          ?.payType ||
        (
          staffLeave
            ?.leaveType ===
          "unpaid"
            ? "unpaid"
            : "paid"
        );

      const existingPercentage =
        safeNumber(
          staffLeave
            ?.payrollImpact
            ?.payPercentage,
          existingPayType ===
            "unpaid"
            ? 0
            : 100
        );

      setActionError("");

      setActionModal({
        open: true,
        type,
        staffLeave,
        reason: "",
        approvalNotes: "",
        payType:
          existingPayType,
        payPercentage:
          existingPercentage
      });
    };

    const closeActionModal =
      () => {
        if (
          actionProcessing
        ) {
          return;
        }

        setActionError("");

        setActionModal(
          createInitialActionModal()
        );
      };

    const updateActionModal = (
      key,
      value
    ) => {
      setActionModal(
        (current) => ({
          ...current,
          [key]: value
        })
      );
    };

    const confirmAction =
      async () => {
        const leaveId =
          actionModal
            .staffLeave?._id;

        if (
          !leaveId ||
          actionProcessing
        ) {
          return;
        }

        if (
          [
            "reject",
            "cancel"
          ].includes(
            actionModal.type
          ) &&
          !String(
            actionModal.reason ||
              ""
          ).trim()
        ) {
          setActionError(
            `${
              actionModal.type ===
              "reject"
                ? "Rejection"
                : "Cancellation"
            } reason is required.`
          );

          return;
        }

        if (
          actionModal.type ===
            "approve" &&
          actionModal.payType ===
            "partial_paid"
        ) {
          const percentage =
            safeNumber(
              actionModal
                .payPercentage
            );

          if (
            percentage <= 0 ||
            percentage >= 100
          ) {
            setActionError(
              "Partial paid percentage must be greater than 0 and less than 100."
            );

            return;
          }
        }

        setActionProcessing(
          true
        );

        setActionError("");
        setError("");

        try {
          let response = null;

          if (
            actionModal.type ===
            "approve"
          ) {
            response =
              await approveStaffLeave(
                leaveId,
                {
                  approvalNotes:
                    String(
                      actionModal
                        .approvalNotes ||
                        ""
                    ).trim(),

                  payType:
                    actionModal
                      .payType,

                  payPercentage:
                    actionModal
                      .payType ===
                    "paid"
                      ? 100
                      : actionModal
                            .payType ===
                          "unpaid"
                        ? 0
                        : safeNumber(
                            actionModal
                              .payPercentage
                          )
                }
              );
          }

          if (
            actionModal.type ===
            "reject"
          ) {
            response =
              await rejectStaffLeave(
                leaveId,
                {
                  rejectionReason:
                    String(
                      actionModal
                        .reason
                    ).trim()
                }
              );
          }

          if (
            actionModal.type ===
            "cancel"
          ) {
            response =
              await cancelStaffLeave(
                leaveId,
                {
                  cancellationReason:
                    String(
                      actionModal
                        .reason
                    ).trim()
                }
              );
          }

          if (
            actionModal.type ===
            "delete"
          ) {
            response =
              await deleteStaffLeave(
                leaveId
              );
          }

          setSuccessMessage(
            response?.message ||
              "Leave request updated successfully."
          );

          setActionModal(
            createInitialActionModal()
          );

          if (
            actionModal.type ===
              "delete" &&
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
          setActionError(
            getErrorMessage(
              requestError,
              "Leave action could not be completed."
            )
          );
        } finally {
          setActionProcessing(
            false
          );
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

        const start =
          Math.max(
            1,
            currentPage - 2
          );

        const end =
          Math.min(
            totalPages,
            start + 4
          );

        const adjustedStart =
          Math.max(
            1,
            end - 4
          );

        return Array.from(
          {
            length:
              end -
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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <FileCheck2
                size={21}
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                Staff Leave Management
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
                Create, review and
                process staff leave
                requests.
              </p>
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
                  "/staff-leaves/report"
                )
              }
              className="btn-secondary inline-flex items-center gap-2"
            >
              <FileText
                size={16}
              />

              Leave Report
            </button>

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/staff-leaves/deleted"
                    )
                  }
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <RotateCcw
                    size={16}
                  />

                  Deleted Leaves
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/staff-leaves/new"
                    )
                  }
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus
                    size={16}
                  />

                  New Leave Request
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
              className="rounded-lg p-1 hover:bg-rose-100"
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
              className="rounded-lg p-1 hover:bg-emerald-100"
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
            label="Total Requests"
            value={
              summary.totalRequests
            }
            description={`${summary.totalDays} total leave day(s)`}
            icon={FileText}
          />

          <SummaryCard
            label="Pending Requests"
            value={
              summary.pending
            }
            description="Waiting for approval decision"
            icon={FileClock}
            tone="warning"
          />

          <SummaryCard
            label="Approved Requests"
            value={
              summary.approved
            }
            description={`${summary.approvedDays} approved day(s)`}
            icon={CheckCircle2}
            tone="success"
          />

          <SummaryCard
            label="Unpaid Leave"
            value={
              summary.unpaidDays
            }
            description={`${summary.rejected} rejected · ${summary.cancelled} cancelled`}
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
                filters.leaveType
              }
              className="field-select"
              onChange={(
                event
              ) =>
                updateFilter(
                  "leaveType",
                  event.target
                    .value
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
                  event.target
                    .value
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

            <select
              value={
                filters.dayType
              }
              className="field-select"
              onChange={(
                event
              ) =>
                updateFilter(
                  "dayType",
                  event.target
                    .value
                )
              }
            >
              <option value="">
                All day types
              </option>

              <option value="full_day">
                Full Day
              </option>

              <option value="half_day">
                Half Day
              </option>
            </select>

            <select
              value={
                filters.payType
              }
              className="field-select"
              onChange={(
                event
              ) =>
                updateFilter(
                  "payType",
                  event.target
                    .value
                )
              }
            >
              <option value="">
                All payroll types
              </option>

              {PAY_TYPE_OPTIONS.map(
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

            <input
              type="number"
              min="2000"
              max="2100"
              value={
                filters.leaveYear
              }
              placeholder={`Leave year, e.g. ${CURRENT_YEAR}`}
              className="field-input"
              onChange={(
                event
              ) =>
                updateFilter(
                  "leaveYear",
                  event.target
                    .value
                )
              }
            />

            <div>
              <label className="field-label">
                From Date
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
                    event.target
                      .value
                  )
                }
              />
            </div>

            <div>
              <label className="field-label">
                To Date
              </label>

              <input
                type="date"
                value={
                  filters.toDate
                }
                className="field-input"
                onChange={(
                  event
                ) =>
                  updateFilter(
                    "toDate",
                    event.target
                      .value
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
                  event.target
                    .value
                )
              }
            >
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

              <option value="totalDays">
                Sort by Duration
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
        | Table
        |--------------------------------------------------------------------------
        */}

        <div className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Leave Requests
              </h3>

              <p className="mt-0.5 text-xs text-slate-400">
                {pagination.total}{" "}
                request
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
                    Application
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Leave Type
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Leave Dates
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Duration
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Payroll
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Attendance
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
                        <FilePlus2
                          size={26}
                        />
                      </div>

                      <h4 className="mt-4 text-sm font-bold text-slate-700">
                        No leave requests
                        found
                      </h4>

                      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                        {hasActiveFilters
                          ? "No leave requests match the selected filters."
                          : "Staff leave requests will appear here after creation."}
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

                        {canManage && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                "/staff-leaves/new"
                              )
                            }
                            className="btn-primary inline-flex items-center gap-2"
                          >
                            <Plus
                              size={16}
                            />

                            Create Leave
                          </button>
                        )}
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

                      const designation =
                        staff.designation ||
                        staffLeave
                          .designationSnapshot ||
                        "—";

                      const payType =
                        staffLeave
                          .payrollImpact
                          ?.payType ||
                        (
                          staffLeave
                            .leaveType ===
                          "unpaid"
                            ? "unpaid"
                            : "paid"
                        );

                      const payPercentage =
                        staffLeave
                          .payrollImpact
                          ?.payPercentage;

                      const status =
                        staffLeave.status;

                      const canEdit =
                        canManage &&
                        [
                          "pending",
                          "rejected"
                        ].includes(
                          status
                        );

                      const canApprove =
                        canManage &&
                        status ===
                          "pending";

                      const canReject =
                        canManage &&
                        status ===
                          "pending";

                      const canCancel =
                        canManage &&
                        [
                          "pending",
                          "approved"
                        ].includes(
                          status
                        ) &&
                        !staffLeave
                          .payrollImpact
                          ?.isProcessed;

                      const canDelete =
                        canManage &&
                        [
                          "pending",
                          "rejected",
                          "cancelled"
                        ].includes(
                          status
                        ) &&
                        !staffLeave
                          .payrollImpact
                          ?.isProcessed;

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
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
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
                              Requested{" "}
                              {formatDate(
                                staffLeave.requestedAt ||
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

                            {staffLeave.dayType ===
                              "half_day" && (
                              <p className="mt-1 text-[10px] text-slate-400">
                                {formatLabel(
                                  staffLeave.halfDaySession
                                )}
                              </p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <PayTypeBadge
                              payType={
                                payType
                              }
                              percentage={
                                payPercentage
                              }
                            />

                            {staffLeave
                              .payrollImpact
                              ?.isProcessed && (
                              <p className="mt-1 text-[10px] font-semibold text-emerald-600">
                                Payroll Processed
                              </p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <StatusBadge
                              status={
                                status
                              }
                            />

                            {status ===
                              "rejected" &&
                              staffLeave.rejectionReason && (
                                <p
                                  title={
                                    staffLeave.rejectionReason
                                  }
                                  className="mt-1 max-w-36 truncate text-[10px] text-rose-500"
                                >
                                  {
                                    staffLeave.rejectionReason
                                  }
                                </p>
                              )}

                            {status ===
                              "cancelled" &&
                              staffLeave.cancellationReason && (
                                <p
                                  title={
                                    staffLeave.cancellationReason
                                  }
                                  className="mt-1 max-w-36 truncate text-[10px] text-slate-400"
                                >
                                  {
                                    staffLeave.cancellationReason
                                  }
                                </p>
                              )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <SyncBadge
                              status={
                                staffLeave
                                  .attendanceSync
                                  ?.status
                              }
                            />

                            {staffLeave
                              .attendanceSync
                              ?.status ===
                              "synced" && (
                              <p className="mt-1 text-[10px] text-slate-400">
                                {safeNumber(
                                  staffLeave
                                    .attendanceSync
                                    .recordsCreated
                                )}{" "}
                                created ·{" "}
                                {safeNumber(
                                  staffLeave
                                    .attendanceSync
                                    .recordsUpdated
                                )}{" "}
                                updated
                              </p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                title="View Details"
                                onClick={() =>
                                  navigate(
                                    `/staff-leaves/${staffLeave._id}`
                                  )
                                }
                                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                              >
                                <Eye
                                  size={15}
                                />
                              </button>

                              {canEdit && (
                                <button
                                  type="button"
                                  title="Edit Leave"
                                  onClick={() =>
                                    navigate(
                                      `/staff-leaves/${staffLeave._id}/edit`
                                    )
                                  }
                                  className="rounded-lg border border-blue-200 p-2 text-blue-600 transition hover:bg-blue-50"
                                >
                                  <Pencil
                                    size={15}
                                  />
                                </button>
                              )}

                              {canApprove && (
                                <button
                                  type="button"
                                  title="Approve Leave"
                                  onClick={() =>
                                    openActionModal(
                                      "approve",
                                      staffLeave
                                    )
                                  }
                                  className="rounded-lg border border-emerald-200 p-2 text-emerald-700 transition hover:bg-emerald-50"
                                >
                                  <CheckCircle2
                                    size={15}
                                  />
                                </button>
                              )}

                              {canReject && (
                                <button
                                  type="button"
                                  title="Reject Leave"
                                  onClick={() =>
                                    openActionModal(
                                      "reject",
                                      staffLeave
                                    )
                                  }
                                  className="rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                                >
                                  <XCircle
                                    size={15}
                                  />
                                </button>
                              )}

                              {canCancel && (
                                <button
                                  type="button"
                                  title="Cancel Leave"
                                  onClick={() =>
                                    openActionModal(
                                      "cancel",
                                      staffLeave
                                    )
                                  }
                                  className="rounded-lg border border-amber-200 p-2 text-amber-700 transition hover:bg-amber-50"
                                >
                                  <Ban
                                    size={15}
                                  />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  title="Delete Leave"
                                  onClick={() =>
                                    openActionModal(
                                      "delete",
                                      staffLeave
                                    )
                                  }
                                  className="rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                                >
                                  <Trash2
                                    size={15}
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
        | Action Modal
        |--------------------------------------------------------------------------
        */}

        <LeaveActionModal
          state={
            actionModal
          }
          processing={
            actionProcessing
          }
          error={
            actionError
          }
          onChange={
            updateActionModal
          }
          onClose={
            closeActionModal
          }
          onConfirm={
            confirmAction
          }
        />
      </div>
    );
  };

export default StaffLeaveList;