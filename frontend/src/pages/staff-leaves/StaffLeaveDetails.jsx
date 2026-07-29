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
  Ban,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ContactRound,
  ExternalLink,
  FileCheck2,
  FileText,
  History,
  Landmark,
  Link2,
  Pencil,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
  X,
  XCircle
} from "lucide-react";

import {
  approveStaffLeave,
  cancelStaffLeave,
  deleteStaffLeave,
  getStaffLeaveById,
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

const LEAVE_TYPE_LABELS = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  annual: "Annual Leave",
  emergency: "Emergency Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  bereavement: "Bereavement Leave",
  study: "Study Leave",
  unpaid: "Unpaid Leave",
  other: "Other Leave"
};

const createInitialActionModal =
  () => ({
    open: false,
    type: "",
    reason: "",
    approvalNotes: "",
    payType: "paid",
    payPercentage: 100
  });

/*
|--------------------------------------------------------------------------
| Formatting Helpers
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
    LEAVE_TYPE_LABELS[
      staffLeave?.leaveType
    ] ||
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
        styles[
          normalizedStatus
        ] ||
        styles.cancelled
      }`}
    >
      <Icon size={13} />

      {formatLabel(
        normalizedStatus
      )}
    </span>
  );
};

/*
|--------------------------------------------------------------------------
| Payroll Badge
|--------------------------------------------------------------------------
*/

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

  const label =
    normalizedPayType ===
    "partial_paid"
      ? `${safeNumber(
          percentage
        )}% Paid`
      : formatLabel(
          normalizedPayType
        );

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
        styles[
          normalizedPayType
        ] ||
        styles.paid
      }`}
    >
      {label}
    </span>
  );
};

/*
|--------------------------------------------------------------------------
| Attendance Sync Badge
|--------------------------------------------------------------------------
*/

const AttendanceSyncBadge = ({
  status
}) => {
  const normalizedStatus =
    String(
      status ||
        "not_required"
    ).toLowerCase();

  const styles = {
    synced:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/15",

    pending:
      "bg-amber-50 text-amber-700 ring-amber-600/15",

    failed:
      "bg-rose-50 text-rose-700 ring-rose-600/15",

    not_required:
      "bg-slate-100 text-slate-600 ring-slate-500/15"
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
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
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
| Section Header
|--------------------------------------------------------------------------
*/

const SectionHeader = ({
  icon: Icon,
  title,
  description,
  action
}) => {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
  );
};

/*
|--------------------------------------------------------------------------
| Information Row
|--------------------------------------------------------------------------
*/

const InformationRow = ({
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
  const styles = {
    brand:
      "bg-brand-50 text-brand-700",

    success:
      "bg-emerald-50 text-emerald-700",

    warning:
      "bg-amber-50 text-amber-700",

    danger:
      "bg-rose-50 text-rose-700",

    slate:
      "bg-slate-100 text-slate-600"
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-lg font-bold text-slate-800">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {description}
            </p>
          )}
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            styles[tone] ||
            styles.brand
          }`}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Workflow Item
|--------------------------------------------------------------------------
*/

const WorkflowItem = ({
  title,
  user,
  date,
  description,
  icon: Icon,
  completed = false,
  danger = false,
  last = false
}) => {
  const iconStyle =
    danger
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : completed
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : "bg-slate-100 text-slate-500 ring-slate-200";

  return (
    <div className="relative flex gap-4">
      {!last && (
        <div className="absolute left-[19px] top-10 h-[calc(100%-16px)] w-px bg-slate-200" />
      )}

      <div
        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${iconStyle}`}
      >
        <Icon size={16} />
      </div>

      <div className="min-w-0 flex-1 pb-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-700">
              {title}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {user || "—"}
            </p>
          </div>

          <p className="text-[11px] text-slate-400">
            {formatDateTime(
              date
            )}
          </p>
        </div>

        {description && (
          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Leave Action Modal
|--------------------------------------------------------------------------
*/

const LeaveActionModal = ({
  state,
  staffLeave,
  processing,
  error,
  onChange,
  onClose,
  onConfirm
}) => {
  if (!state.open) {
    return null;
  }

  const staff =
    staffLeave?.staffId || {};

  const staffName =
    staff.name ||
    staffLeave
      ?.staffNameSnapshot ||
    "Staff Member";

  const modalConfig = {
    approve: {
      title:
        "Approve Leave Request",

      description:
        "Confirm approval and define how this leave will affect payroll.",

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
        "Provide a clear reason for rejecting this leave request.",

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
        "Cancel this leave request and record the reason.",

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
        "Move this leave request to deleted records.",

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
    modalConfig[
      state.type
    ] ||
    modalConfig.delete;

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
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Staff Member
            </p>

            <p className="mt-1 text-sm font-bold text-slate-800">
              {staffName}
            </p>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>
                {staffLeave?.applicationNumber ||
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
                  disabled={
                    staffLeave
                      ?.leaveType ===
                    "unpaid"
                  }
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
                  <option value="paid">
                    Paid Leave
                  </option>

                  <option value="unpaid">
                    Unpaid Leave
                  </option>

                  <option value="partial_paid">
                    Partially Paid
                  </option>
                </select>

                {staffLeave
                  ?.leaveType ===
                  "unpaid" && (
                  <p className="mt-1 text-xs text-rose-600">
                    Unpaid Leave is
                    automatically treated
                    as 0% paid.
                  </p>
                )}
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
                  Approval will attempt
                  to create or update
                  Staff Attendance records
                  for the approved leave
                  dates.
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
                    ? "Enter the rejection reason..."
                    : "Enter the cancellation reason..."
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
                  The leave request can
                  later be restored from
                  Deleted Leaves.
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
| Staff Leave Details Page
|--------------------------------------------------------------------------
*/

export const StaffLeaveDetails =
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
    | Permissions
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
      staffLeave,
      setStaffLeave
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
      successMessage,
      setSuccessMessage
    ] = useState("");

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
    | Load Leave Details
    |--------------------------------------------------------------------------
    */

    const loadStaffLeave =
      useCallback(
        async (
          showMainLoader =
            false
        ) => {
          if (!id) {
            setError(
              "Leave identifier is missing."
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
              await getStaffLeaveById(
                id
              );

            const record =
              response?.staffLeave ||
              response?.leave ||
              response;

            if (!record?._id) {
              throw new Error(
                "Leave request was not found."
              );
            }

            setStaffLeave(
              record
            );
          } catch (
            requestError
          ) {
            setStaffLeave(null);

            setError(
              getErrorMessage(
                requestError,
                "Leave request could not be loaded."
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
      loadStaffLeave(true);
    }, [
      loadStaffLeave
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
    | Derived Information
    |--------------------------------------------------------------------------
    */

    const staff =
      staffLeave?.staffId ||
      {};

    const school =
      staffLeave?.schoolId ||
      {};

    const payrollImpact =
      staffLeave
        ?.payrollImpact ||
      {};

    const attendanceSync =
      staffLeave
        ?.attendanceSync ||
      {};

    const balanceSnapshot =
      staffLeave
        ?.balanceSnapshot ||
      {};

    const staffName =
      staff.name ||
      staffLeave
        ?.staffNameSnapshot ||
      "Unknown Staff";

    const employeeId =
      staff.employeeId ||
      staffLeave
        ?.employeeIdSnapshot ||
      "—";

    const department =
      staff.department ||
      staffLeave
        ?.departmentSnapshot ||
      "—";

    const designation =
      staff.designation ||
      staffLeave
        ?.designationSnapshot ||
      "—";

    const schoolName =
      school.schoolName ||
      school.name ||
      "Assigned School";

    const status =
      String(
        staffLeave?.status ||
        ""
      ).toLowerCase();

    const canEdit =
      canManage &&
      [
        "pending",
        "rejected"
      ].includes(status);

    const canApprove =
      canManage &&
      status === "pending";

    const canReject =
      canManage &&
      status === "pending";

    const canCancel =
      canManage &&
      [
        "pending",
        "approved"
      ].includes(status) &&
      !payrollImpact
        .isProcessed;

    const canDelete =
      canManage &&
      [
        "pending",
        "rejected",
        "cancelled"
      ].includes(status) &&
      !payrollImpact
        .isProcessed;

    /*
    |--------------------------------------------------------------------------
    | Workflow Items
    |--------------------------------------------------------------------------
    */

    const workflowItems =
      useMemo(() => {
        if (!staffLeave) {
          return [];
        }

        const items = [
          {
            title:
              "Leave Request Created",

            user:
              staffLeave
                .requestedBy
                ?.name ||
              staffLeave
                .createdBy
                ?.name ||
              "System User",

            date:
              staffLeave
                .requestedAt ||
              staffLeave
                .createdAt,

            description:
              `Application ${staffLeave.applicationNumber || ""} was submitted.`,

            icon:
              FileCheck2,

            completed: true,
            danger: false
          }
        ];

        if (
          staffLeave.status ===
            "approved" ||
          staffLeave.approvedAt
        ) {
          items.push({
            title:
              "Leave Approved",

            user:
              staffLeave
                .approvedBy
                ?.name ||
              "Approving User",

            date:
              staffLeave
                .approvedAt,

            description:
              staffLeave
                .approvalNotes ||
              "Leave request was approved.",

            icon:
              CheckCircle2,

            completed: true,
            danger: false
          });
        }

        if (
          staffLeave.status ===
            "rejected" ||
          staffLeave.rejectedAt
        ) {
          items.push({
            title:
              "Leave Rejected",

            user:
              staffLeave
                .rejectedBy
                ?.name ||
              "Approving User",

            date:
              staffLeave
                .rejectedAt,

            description:
              staffLeave
                .rejectionReason ||
              "Leave request was rejected.",

            icon:
              XCircle,

            completed: true,
            danger: true
          });
        }

        if (
          staffLeave.status ===
            "cancelled" ||
          staffLeave.cancelledAt
        ) {
          items.push({
            title:
              "Leave Cancelled",

            user:
              staffLeave
                .cancelledBy
                ?.name ||
              "Management User",

            date:
              staffLeave
                .cancelledAt,

            description:
              staffLeave
                .cancellationReason ||
              "Leave request was cancelled.",

            icon:
              Ban,

            completed: true,
            danger: true
          });
        }

        if (
          attendanceSync.status ===
          "synced"
        ) {
          items.push({
            title:
              "Attendance Synchronized",

            user:
              attendanceSync
                .syncedBy
                ?.name ||
              "System User",

            date:
              attendanceSync
                .syncedAt,

            description:
              `${safeNumber(
                attendanceSync.recordsCreated
              )} attendance record(s) created and ${safeNumber(
                attendanceSync.recordsUpdated
              )} updated.`,

            icon:
              CalendarDays,

            completed: true,
            danger: false
          });
        }

        if (
          attendanceSync.status ===
          "failed"
        ) {
          items.push({
            title:
              "Attendance Sync Failed",

            user:
              attendanceSync
                .syncedBy
                ?.name ||
              "System User",

            date:
              attendanceSync
                .syncedAt,

            description:
              attendanceSync
                .errorMessage ||
              "Attendance synchronization requires review.",

            icon:
              AlertTriangle,

            completed: true,
            danger: true
          });
        }

        if (
          payrollImpact
            .isProcessed
        ) {
          items.push({
            title:
              "Processed in Payroll",

            user:
              payrollImpact
                .processedBy
                ?.name ||
              "Payroll User",

            date:
              payrollImpact
                .processedAt,

            description:
              payrollImpact
                .payrollId
                ?.payrollNumber
                ? `Processed in payroll ${payrollImpact.payrollId.payrollNumber}.`
                : "Leave impact was processed in payroll.",

            icon:
              WalletCards,

            completed: true,
            danger: false
          });
        }

        return items;
      }, [
        staffLeave,
        attendanceSync,
        payrollImpact
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

        loadStaffLeave(false);
      };

    /*
    |--------------------------------------------------------------------------
    | Action Modal
    |--------------------------------------------------------------------------
    */

    const openActionModal = (
      type
    ) => {
      const currentPayType =
        staffLeave
          ?.leaveType ===
        "unpaid"
          ? "unpaid"
          : (
              payrollImpact
                .payType ||
              "paid"
            );

      const currentPercentage =
        currentPayType ===
        "unpaid"
          ? 0
          : safeNumber(
              payrollImpact
                .payPercentage,
              currentPayType ===
                "paid"
                ? 100
                : 50
            );

      setActionError("");

      setActionModal({
        open: true,
        type,
        reason: "",
        approvalNotes:
          staffLeave
            ?.approvalNotes ||
          "",
        payType:
          currentPayType,
        payPercentage:
          currentPercentage
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
      fieldName,
      value
    ) => {
      setActionModal(
        (current) => {
          if (
            fieldName ===
            "payType"
          ) {
            return {
              ...current,

              payType: value,

              payPercentage:
                value === "paid"
                  ? 100
                  : value ===
                      "unpaid"
                    ? 0
                    : (
                        safeNumber(
                          current.payPercentage
                        ) > 0 &&
                        safeNumber(
                          current.payPercentage
                        ) < 100
                      )
                      ? current.payPercentage
                      : 50
            };
          }

          return {
            ...current,
            [fieldName]: value
          };
        }
      );
    };

    /*
    |--------------------------------------------------------------------------
    | Confirm Action
    |--------------------------------------------------------------------------
    */

    const confirmAction =
      async () => {
        if (
          !staffLeave?._id ||
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
            actionModal.type ===
            "reject"
              ? "Rejection reason is required."
              : "Cancellation reason is required."
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
            const finalPayType =
              staffLeave
                .leaveType ===
              "unpaid"
                ? "unpaid"
                : actionModal
                    .payType;

            response =
              await approveStaffLeave(
                staffLeave._id,
                {
                  approvalNotes:
                    String(
                      actionModal
                        .approvalNotes ||
                        ""
                    ).trim(),

                  payType:
                    finalPayType,

                  payPercentage:
                    finalPayType ===
                    "paid"
                      ? 100
                      : finalPayType ===
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
                staffLeave._id,
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
                staffLeave._id,
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
                staffLeave._id
              );
          }

          if (
            actionModal.type ===
            "delete"
          ) {
            navigate(
              "/staff-leaves",
              {
                replace: true,

                state: {
                  message:
                    response?.message ||
                    "Leave request deleted successfully."
                }
              }
            );

            return;
          }

          setSuccessMessage(
            response?.message ||
              "Leave request updated successfully."
          );

          setActionModal(
            createInitialActionModal()
          );

          await loadStaffLeave(
            false
          );
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
              Loading leave details...
            </p>
          </div>
        </div>
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Missing Leave
    |--------------------------------------------------------------------------
    */

    if (!staffLeave) {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/staff-leaves"
              )
            }
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft
              size={16}
            />

            Back to Leaves
          </button>

          <div className="card flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle
                size={26}
              />
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-800">
              Leave Request Not Available
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {error ||
                "The requested leave record could not be found."}
            </p>

            <button
              type="button"
              onClick={() =>
                loadStaffLeave(
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

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                  Leave Request Details
                </h2>

                <StatusBadge
                  status={
                    staffLeave.status
                  }
                />
              </div>

              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                {staffLeave.applicationNumber ||
                  "Leave Application"}{" "}
                ·{" "}
                {getLeaveTypeLabel(
                  staffLeave
                )}
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

            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/staff-leaves/${staffLeave._id}/edit`
                  )
                }
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Pencil
                  size={16}
                />

                Edit Request
              </button>
            )}

            {canApprove && (
              <button
                type="button"
                onClick={() =>
                  openActionModal(
                    "approve"
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <CheckCircle2
                  size={16}
                />

                Approve
              </button>
            )}

            {canReject && (
              <button
                type="button"
                onClick={() =>
                  openActionModal(
                    "reject"
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <XCircle
                  size={16}
                />

                Reject
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={() =>
                  openActionModal(
                    "cancel"
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
              >
                <Ban size={16} />

                Cancel Leave
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() =>
                  openActionModal(
                    "delete"
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <Trash2
                  size={16}
                />

                Delete
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

        {attendanceSync.status ===
          "failed" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <p className="text-sm font-bold text-amber-800">
                  Attendance Synchronization Requires Review
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  {attendanceSync.errorMessage ||
                    "The leave was processed, but attendance synchronization was not completed."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Main Summary
        |--------------------------------------------------------------------------
        */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Leave Type"
            value={
              getLeaveTypeLabel(
                staffLeave
              )
            }
            description={
              formatLabel(
                staffLeave.dayType
              )
            }
            icon={FileCheck2}
          />

          <SummaryCard
            label="Leave Duration"
            value={
              getDurationLabel(
                staffLeave
              )
            }
            description={`${safeNumber(
              staffLeave.calendarDays
            )} calendar day(s)`}
            icon={CalendarDays}
            tone="warning"
          />

          <SummaryCard
            label="Payroll Treatment"
            value={
              payrollImpact
                .payType ===
              "partial_paid"
                ? `${safeNumber(
                    payrollImpact.payPercentage
                  )}% Paid`
                : formatLabel(
                    payrollImpact.payType ||
                      "paid"
                  )
            }
            description={
              payrollImpact.isProcessed
                ? "Processed in payroll"
                : "Not yet processed"
            }
            icon={
              CircleDollarSign
            }
            tone={
              payrollImpact.payType ===
              "unpaid"
                ? "danger"
                : "success"
            }
          />

          <SummaryCard
            label="Attendance Sync"
            value={
              formatLabel(
                attendanceSync.status ||
                  "not_required"
              )
            }
            description={`${safeNumber(
              attendanceSync.recordsCreated
            )} created · ${safeNumber(
              attendanceSync.recordsUpdated
            )} updated`}
            icon={CalendarDays}
            tone={
              attendanceSync.status ===
              "failed"
                ? "danger"
                : attendanceSync.status ===
                    "synced"
                  ? "success"
                  : "slate"
            }
          />
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Staff and School
        |--------------------------------------------------------------------------
        */}

        <section className="card p-5">
          <SectionHeader
            icon={
              BriefcaseBusiness
            }
            title="Staff and School Information"
            description="Employee and institution information captured with this request."
          />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {staff.photo ? (
                  <img
                    src={staff.photo}
                    alt={staffName}
                    className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-xl font-bold text-brand-700 ring-1 ring-brand-100">
                    {getInitials(
                      staffName
                    )}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-slate-800">
                    {staffName}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {designation}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Employee ID
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {employeeId}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Department
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {department}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Category
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {formatLabel(
                          staff.category
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Staff Status
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {formatLabel(
                          staff.status
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Landmark
                  size={16}
                  className="text-brand-700"
                />

                <h3 className="text-sm font-bold text-slate-800">
                  School Information
                </h3>
              </div>

              <InformationRow
                label="School Name"
                value={
                  schoolName
                }
              />

              <InformationRow
                label="School Code"
                value={
                  school.schoolCode ||
                  school.code ||
                  "—"
                }
              />

              <InformationRow
                label="Phone"
                value={
                  school.phone ||
                  "—"
                }
              />

              <InformationRow
                label="Email"
                value={
                  school.email ||
                  "—"
                }
              />
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Leave Information
        |--------------------------------------------------------------------------
        */}

        <section className="card p-5">
          <SectionHeader
            icon={CalendarDays}
            title="Leave Period and Information"
            description="Complete dates, type and duration of this leave request."
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <InformationRow
                label="Application Number"
                value={
                  staffLeave.applicationNumber ||
                  "—"
                }
              />

              <InformationRow
                label="Leave Type"
                value={
                  getLeaveTypeLabel(
                    staffLeave
                  )
                }
              />

              <InformationRow
                label="Day Type"
                value={
                  formatLabel(
                    staffLeave.dayType
                  )
                }
              />

              <InformationRow
                label="Half-Day Session"
                value={
                  staffLeave.dayType ===
                  "half_day"
                    ? formatLabel(
                        staffLeave.halfDaySession
                      )
                    : "Not Applicable"
                }
              />

              <InformationRow
                label="Leave Year"
                value={
                  staffLeave.leaveYear ||
                  "—"
                }
              />
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <InformationRow
                label="Start Date"
                value={
                  formatDate(
                    staffLeave.startDate
                  )
                }
              />

              <InformationRow
                label="End Date"
                value={
                  formatDate(
                    staffLeave.endDate
                  )
                }
              />

              <InformationRow
                label="Calendar Days"
                value={`${safeNumber(
                  staffLeave.calendarDays
                )} day(s)`}
              />

              <InformationRow
                label="Payable Leave Days"
                value={`${safeNumber(
                  staffLeave.totalDays
                )} day(s)`}
              />

              <InformationRow
                label="Request Source"
                value={
                  formatLabel(
                    staffLeave.requestSource
                  )
                }
              />
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Reason and Notes
        |--------------------------------------------------------------------------
        */}

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="card p-5">
            <SectionHeader
              icon={FileText}
              title="Leave Reason"
              description="Reason supplied for this leave request."
            />

            <div className="min-h-32 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {staffLeave.reason ||
                  "No leave reason was provided."}
              </p>
            </div>
          </div>

          <div className="card p-5">
            <SectionHeader
              icon={
                BriefcaseBusiness
              }
              title="Handover Notes"
              description="Work handover or substitute arrangements."
            />

            <div className="min-h-32 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {staffLeave.handoverNotes ||
                  "No handover notes were provided."}
              </p>
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Payroll and Balance
        |--------------------------------------------------------------------------
        */}

        <section className="card p-5">
          <SectionHeader
            icon={
              CircleDollarSign
            }
            title="Payroll Impact and Leave Balance"
            description="Payroll treatment and leave balance snapshot saved with this application."
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-slate-800">
                  Payroll Treatment
                </h4>

                <PayTypeBadge
                  payType={
                    payrollImpact.payType
                  }
                  percentage={
                    payrollImpact.payPercentage
                  }
                />
              </div>

              <InformationRow
                label="Payment Type"
                value={
                  formatLabel(
                    payrollImpact.payType ||
                      "paid"
                  )
                }
              />

              <InformationRow
                label="Paid Percentage"
                value={`${safeNumber(
                  payrollImpact.payPercentage,
                  payrollImpact.payType ===
                    "unpaid"
                    ? 0
                    : 100
                )}%`}
              />

              <InformationRow
                label="Payroll Processed"
                value={
                  payrollImpact.isProcessed
                    ? "Yes"
                    : "No"
                }
              />

              <InformationRow
                label="Deduction Amount"
                value={safeNumber(
                  payrollImpact.deductionAmount
                ).toLocaleString(
                  "en-US"
                )}
              />

              <InformationRow
                label="Processed Date"
                value={
                  formatDateTime(
                    payrollImpact.processedAt
                  )
                }
              />

              <InformationRow
                label="Payroll Number"
                value={
                  payrollImpact
                    .payrollId
                    ?.payrollNumber ||
                  "—"
                }
              />
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="mb-4 text-sm font-bold text-slate-800">
                Leave Balance Snapshot
              </h4>

              <InformationRow
                label="Opening Balance"
                value={`${safeNumber(
                  balanceSnapshot.openingBalance
                )} day(s)`}
              />

              <InformationRow
                label="Used Before"
                value={`${safeNumber(
                  balanceSnapshot.usedBefore
                )} day(s)`}
              />

              <InformationRow
                label="Available Before"
                value={`${safeNumber(
                  balanceSnapshot.availableBefore
                )} day(s)`}
              />

              <InformationRow
                label="Current Leave"
                value={`${safeNumber(
                  balanceSnapshot.currentLeaveDays ||
                    staffLeave.totalDays
                )} day(s)`}
              />

              <InformationRow
                label="Remaining After"
                value={`${safeNumber(
                  balanceSnapshot.remainingAfter
                )} day(s)`}
              />
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Attendance Synchronization
        |--------------------------------------------------------------------------
        */}

        <section className="card p-5">
          <SectionHeader
            icon={CalendarDays}
            title="Attendance Synchronization"
            description="Status of synchronization between approved leave and Staff Attendance."
            action={
              <AttendanceSyncBadge
                status={
                  attendanceSync.status
                }
              />
            }
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Sync Status"
              value={
                formatLabel(
                  attendanceSync.status ||
                    "not_required"
                )
              }
              description={
                attendanceSync.status ===
                "synced"
                  ? "Attendance records updated"
                  : "Current synchronization state"
              }
              icon={ShieldCheck}
              tone={
                attendanceSync.status ===
                "synced"
                  ? "success"
                  : attendanceSync.status ===
                      "failed"
                    ? "danger"
                    : "slate"
              }
            />

            <SummaryCard
              label="Records Created"
              value={
                safeNumber(
                  attendanceSync.recordsCreated
                )
              }
              description="New attendance records"
              icon={FileCheck2}
              tone="success"
            />

            <SummaryCard
              label="Records Updated"
              value={
                safeNumber(
                  attendanceSync.recordsUpdated
                )
              }
              description="Existing records updated"
              icon={RefreshCcw}
              tone="warning"
            />

            <SummaryCard
              label="Synchronized At"
              value={
                attendanceSync.syncedAt
                  ? formatDate(
                      attendanceSync.syncedAt
                    )
                  : "—"
              }
              description={
                attendanceSync.syncedBy
                  ?.name ||
                "No synchronization user"
              }
              icon={Clock3}
              tone="brand"
            />
          </div>

          {attendanceSync.errorMessage && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={17}
                  className="mt-0.5 shrink-0 text-rose-600"
                />

                <div>
                  <p className="text-xs font-bold text-rose-700">
                    Synchronization Error
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-rose-600">
                    {attendanceSync.errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Emergency Contact and Attachments
        |--------------------------------------------------------------------------
        */}

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="card p-5">
            <SectionHeader
              icon={ContactRound}
              title="Emergency Contact"
              description="Optional contact information during the leave period."
            />

            <InformationRow
              label="Contact Name"
              value={
                staffLeave
                  .emergencyContact
                  ?.name ||
                "—"
              }
            />

            <InformationRow
              label="Phone Number"
              value={
                staffLeave
                  .emergencyContact
                  ?.phone ||
                "—"
              }
            />

            <InformationRow
              label="Relationship"
              value={
                staffLeave
                  .emergencyContact
                  ?.relationship ||
                "—"
              }
            />
          </div>

          <div className="card p-5">
            <SectionHeader
              icon={Link2}
              title="Supporting Attachments"
              description="Medical certificates and other supporting documents."
            />

            {Array.isArray(
              staffLeave.attachments
            ) &&
            staffLeave.attachments
              .length > 0 ? (
              <div className="space-y-3">
                {staffLeave.attachments.map(
                  (
                    attachment,
                    index
                  ) => (
                    <div
                      key={
                        attachment._id ||
                        index
                      }
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-slate-200">
                          <FileText
                            size={18}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-700">
                            {attachment.fileName ||
                              `Attachment ${index + 1}`}
                          </p>

                          <p className="mt-0.5 truncate text-[10px] text-slate-400">
                            {attachment.fileType ||
                              "Document"}

                            {safeNumber(
                              attachment.fileSize
                            ) > 0
                              ? ` · ${safeNumber(
                                  attachment.fileSize
                                ).toLocaleString(
                                  "en-US"
                                )} bytes`
                              : ""}
                          </p>
                        </div>
                      </div>

                      {attachment.fileUrl && (
                        <a
                          href={
                            attachment.fileUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-brand-700"
                          title="Open attachment"
                        >
                          <ExternalLink
                            size={15}
                          />
                        </a>
                      )}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
                <Link2
                  size={24}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-semibold text-slate-600">
                  No attachments
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  No supporting documents
                  were added to this
                  request.
                </p>
              </div>
            )}
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Workflow
        |--------------------------------------------------------------------------
        */}

        <section className="card p-5">
          <SectionHeader
            icon={History}
            title="Approval Workflow"
            description="History of request creation, approval, attendance sync and payroll processing."
          />

          <div className="max-w-3xl">
            {workflowItems.map(
              (
                item,
                index
              ) => (
                <WorkflowItem
                  key={`${item.title}-${index}`}
                  {...item}
                  last={
                    index ===
                    workflowItems.length -
                      1
                  }
                />
              )
            )}
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Administrative Notes and Audit
        |--------------------------------------------------------------------------
        */}

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="card p-5">
            <SectionHeader
              icon={FileText}
              title="Administrative Notes"
              description="Internal notes for authorized management users."
            />

            <div className="min-h-32 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {staffLeave.internalNotes ||
                  "No internal notes were added."}
              </p>
            </div>
          </div>

          <div className="card p-5">
            <SectionHeader
              icon={ShieldCheck}
              title="Record Information"
              description="Creation and latest update information."
            />

            <InformationRow
              label="Created By"
              value={
                staffLeave.createdBy
                  ?.name ||
                "System User"
              }
            />

            <InformationRow
              label="Created At"
              value={
                formatDateTime(
                  staffLeave.createdAt
                )
              }
            />

            <InformationRow
              label="Updated By"
              value={
                staffLeave.updatedBy
                  ?.name ||
                "—"
              }
            />

            <InformationRow
              label="Updated At"
              value={
                formatDateTime(
                  staffLeave.updatedAt
                )
              }
            />

            <InformationRow
              label="Requested By"
              value={
                staffLeave.requestedBy
                  ?.name ||
                "—"
              }
            />

            <InformationRow
              label="Request Source"
              value={
                formatLabel(
                  staffLeave.requestSource
                )
              }
            />
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Bottom Actions
        |--------------------------------------------------------------------------
        */}

        <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800">
              Leave Request Actions
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Available actions depend
              on the current status and
              payroll processing state.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/staff-leaves"
                )
              }
              className="btn-secondary inline-flex items-center gap-2"
            >
              <ArrowLeft
                size={16}
              />

              Leave List
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/staff-leaves/${staffLeave._id}/edit`
                  )
                }
                className="btn-primary inline-flex items-center gap-2"
              >
                <Pencil
                  size={16}
                />

                Edit Request
              </button>
            )}
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Action Modal
        |--------------------------------------------------------------------------
        */}

        <LeaveActionModal
          state={
            actionModal
          }
          staffLeave={
            staffLeave
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

export default StaffLeaveDetails;