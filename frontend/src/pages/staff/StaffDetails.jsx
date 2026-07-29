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
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  Clock3,
  CreditCard,
  Edit3,
  ExternalLink,
  FileText,
  GraduationCap,
  Hash,
  Home,
  IdCard,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  Wallet
} from "lucide-react";

import {
  deleteStaff,
  getStaffById,
  updateStaffStatus
} from "../../api/staff";

import {
  useAuth
} from "../../context/AuthContext";

import {
  PageHeader
} from "../../components/ui/PageHeader";

import {
  Badge
} from "../../components/ui/Badge";

import {
  Modal
} from "../../components/ui/Modal";

import StaffFormModal from "./StaffFormModal";

/*
|--------------------------------------------------------------------------
| Staff Status Options
|--------------------------------------------------------------------------
*/

const STAFF_STATUSES = [
  {
    value: "active",
    label: "Active"
  },
  {
    value: "inactive",
    label: "Inactive"
  },
  {
    value: "on_leave",
    label: "On Leave"
  },
  {
    value: "resigned",
    label: "Resigned"
  },
  {
    value: "terminated",
    label: "Terminated"
  }
];

/*
|--------------------------------------------------------------------------
| Formatting Helpers
|--------------------------------------------------------------------------
*/

const formatLabel = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "Not available";
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

const formatCurrency = (value) => {
  return `Rs ${Number(
    value || 0
  ).toLocaleString("en-US")}`;
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
};

const getDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  return String(value).slice(
    0,
    10
  );
};

const getInitials = (name) => {
  return String(name || "S")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getErrorMessage = (
  requestError,
  fallback
) => {
  return (
    requestError.response?.data?.message ||
    requestError.response?.data?.error ||
    requestError.message ||
    fallback
  );
};

/*
|--------------------------------------------------------------------------
| Status Helpers
|--------------------------------------------------------------------------
*/

const getStatusTone = (status) => {
  if (status === "active") {
    return "success";
  }

  if (status === "on_leave") {
    return "warning";
  }

  if (
    status === "resigned" ||
    status === "terminated"
  ) {
    return "danger";
  }

  return "neutral";
};

const getCategoryClass = (
  category
) => {
  const styles = {
    administration:
      "bg-indigo-50 text-indigo-700 ring-indigo-100",

    accounts:
      "bg-emerald-50 text-emerald-700 ring-emerald-100",

    library:
      "bg-violet-50 text-violet-700 ring-violet-100",

    laboratory:
      "bg-cyan-50 text-cyan-700 ring-cyan-100",

    transport:
      "bg-amber-50 text-amber-700 ring-amber-100",

    security:
      "bg-rose-50 text-rose-700 ring-rose-100",

    maintenance:
      "bg-orange-50 text-orange-700 ring-orange-100",

    medical:
      "bg-teal-50 text-teal-700 ring-teal-100",

    support:
      "bg-sky-50 text-sky-700 ring-sky-100",

    other:
      "bg-slate-100 text-slate-700 ring-slate-200"
  };

  return (
    styles[category] ||
    styles.other
  );
};

/*
|--------------------------------------------------------------------------
| Section Card
|--------------------------------------------------------------------------
*/

const SectionCard = ({
  icon: Icon,
  title,
  description,
  children,
  className = ""
}) => {
  return (
    <section
      className={`card overflow-hidden ${className}`}
    >
      <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon size={19} />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
};

/*
|--------------------------------------------------------------------------
| Detail Item
|--------------------------------------------------------------------------
*/

const DetailItem = ({
  icon: Icon,
  label,
  value,
  children,
  className = ""
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 ${className}`}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm">
            <Icon size={16} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          {children || (
            <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-700">
              {value ||
                "Not available"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Salary Item
|--------------------------------------------------------------------------
*/

const SalaryItem = ({
  label,
  value,
  valueClassName = "text-slate-800"
}) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${valueClassName}`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Loading State
|--------------------------------------------------------------------------
*/

const LoadingState = () => {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-52 animate-pulse rounded bg-slate-200" />

          <div className="h-3 w-72 max-w-full animate-pulse rounded bg-slate-100" />
        </div>

        <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="card h-96 animate-pulse bg-slate-100" />

        <div className="space-y-5">
          <div className="card h-64 animate-pulse bg-slate-100" />

          <div className="card h-64 animate-pulse bg-slate-100" />
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Staff Details
|--------------------------------------------------------------------------
*/

const StaffDetails = () => {
  const {
    id
  } = useParams();

  const navigate = useNavigate();

  const {
    user: currentUser
  } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | Permissions
  |--------------------------------------------------------------------------
  */

  const canManage = [
    "super_admin",
    "principal"
  ].includes(
    currentUser?.role
  );

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [
    staff,
    setStaff
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
    pageError,
    setPageError
  ] = useState("");

  const [
    success,
    setSuccess
  ] = useState("");

  const [
    imageError,
    setImageError
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Edit Modal
  |--------------------------------------------------------------------------
  */

  const [
    editOpen,
    setEditOpen
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Status Modal
  |--------------------------------------------------------------------------
  */

  const [
    statusOpen,
    setStatusOpen
  ] = useState(false);

  const [
    statusForm,
    setStatusForm
  ] = useState({
    status: "active",
    leavingDate: "",
    leavingReason: ""
  });

  const [
    updatingStatus,
    setUpdatingStatus
  ] = useState(false);

  const [
    statusError,
    setStatusError
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Delete Modal
  |--------------------------------------------------------------------------
  */

  const [
    deleteOpen,
    setDeleteOpen
  ] = useState(false);

  const [
    deleting,
    setDeleting
  ] = useState(false);

  const [
    deleteError,
    setDeleteError
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Load Staff Member
  |--------------------------------------------------------------------------
  */

  const fetchStaff =
    useCallback(
      async ({
        silent = false
      } = {}) => {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setPageError("");

        try {
          const { data } =
            await getStaffById(id);

          setStaff(
            data?.staff || null
          );

          setImageError(false);
        } catch (
          requestError
        ) {
          setStaff(null);

          setPageError(
            getErrorMessage(
              requestError,
              "Staff member could not be loaded."
            )
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [id]
    );

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  /*
  |--------------------------------------------------------------------------
  | Auto Hide Success
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () => {
          setSuccess("");
        },
        4000
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [success]);

  /*
  |--------------------------------------------------------------------------
  | Calculated Values
  |--------------------------------------------------------------------------
  */

  const netSalary =
    useMemo(() => {
      if (!staff) {
        return 0;
      }

      if (
        staff.netSalary !==
        undefined
      ) {
        return Number(
          staff.netSalary || 0
        );
      }

      return Math.max(
        0,
        Number(
          staff.basicSalary || 0
        ) +
          Number(
            staff.allowances || 0
          ) -
          Number(
            staff.deductions || 0
          )
      );
    }, [staff]);

  const hasBankInformation =
    Boolean(
      staff?.bankName ||
        staff?.accountTitle ||
        staff?.accountNumber ||
        staff?.iban
    );

  const hasEmergencyContact =
    Boolean(
      staff?.emergencyContact
        ?.name ||
        staff?.emergencyContact
          ?.relationship ||
        staff?.emergencyContact
          ?.phone
    );

  const hasLeavingInformation =
    Boolean(
      staff?.leavingDate ||
        staff?.leavingReason
    );

  /*
  |--------------------------------------------------------------------------
  | Open Status Modal
  |--------------------------------------------------------------------------
  */

  const openStatusModal = () => {
    if (!staff) {
      return;
    }

    setStatusForm({
      status:
        staff.status ||
        "active",

      leavingDate:
        getDateInputValue(
          staff.leavingDate
        ),

      leavingReason:
        staff.leavingReason ||
        ""
    });

    setStatusError("");
    setStatusOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Status Change
  |--------------------------------------------------------------------------
  */

  const handleStatusChange = (
    event
  ) => {
    const status =
      event.target.value;

    const isLeavingStatus = [
      "resigned",
      "terminated"
    ].includes(status);

    setStatusForm(
      (current) => ({
        ...current,
        status,

        leavingDate:
          isLeavingStatus
            ? current.leavingDate
            : "",

        leavingReason:
          isLeavingStatus
            ? current.leavingReason
            : ""
      })
    );

    setStatusError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Update Status
  |--------------------------------------------------------------------------
  */

  const handleStatusUpdate =
    async () => {
      if (
        !staff ||
        updatingStatus
      ) {
        return;
      }

      const isLeavingStatus = [
        "resigned",
        "terminated"
      ].includes(
        statusForm.status
      );

      if (
        isLeavingStatus &&
        statusForm.leavingDate &&
        staff.joiningDate &&
        statusForm.leavingDate <
          getDateInputValue(
            staff.joiningDate
          )
      ) {
        setStatusError(
          "Leaving date cannot be earlier than joining date."
        );

        return;
      }

      setUpdatingStatus(true);
      setStatusError("");

      try {
        const payload = {
          status:
            statusForm.status
        };

        if (isLeavingStatus) {
          payload.leavingDate =
            statusForm.leavingDate ||
            null;

          payload.leavingReason =
            statusForm.leavingReason.trim();
        }

        const { data } =
          await updateStaffStatus(
            staff._id,
            payload
          );

        setStaff(
          data?.staff || staff
        );

        setStatusOpen(false);

        setSuccess(
          data?.message ||
            "Staff status updated successfully."
        );
      } catch (
        requestError
      ) {
        setStatusError(
          getErrorMessage(
            requestError,
            "Staff status could not be updated."
          )
        );
      } finally {
        setUpdatingStatus(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Staff Updated
  |--------------------------------------------------------------------------
  */

  const handleStaffSaved = (
    savedStaff,
    message
  ) => {
    if (savedStaff) {
      setStaff(savedStaff);
    } else {
      fetchStaff({
        silent: true
      });
    }

    setSuccess(
      message ||
        "Staff member updated successfully."
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Delete Staff
  |--------------------------------------------------------------------------
  */

  const handleDelete =
    async () => {
      if (
        !staff ||
        deleting
      ) {
        return;
      }

      setDeleting(true);
      setDeleteError("");

      try {
        const { data } =
          await deleteStaff(
            staff._id
          );

        navigate(
          "/staff",
          {
            replace: true,

            state: {
              success:
                data?.message ||
                "Staff member deleted successfully."
            }
          }
        );
      } catch (
        requestError
      ) {
        setDeleteError(
          getErrorMessage(
            requestError,
            "Staff member could not be deleted."
          )
        );
      } finally {
        setDeleting(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return <LoadingState />;
  }

  /*
  |--------------------------------------------------------------------------
  | Error / Not Found
  |--------------------------------------------------------------------------
  */

  if (
    pageError ||
    !staff
  ) {
    return (
      <div>
        <PageHeader
          title="Staff Details"
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate("/staff")
              }
            >
              <ArrowLeft size={16} />
              Back to Staff
            </button>
          }
        />

        <div className="card flex min-h-[420px] flex-col items-center justify-center p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle size={30} />
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-800">
            Staff member not available
          </h1>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            {pageError ||
              "The requested staff record does not exist or you do not have permission to view it."}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate("/staff")
              }
            >
              <ArrowLeft size={16} />
              Staff List
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                fetchStaff()
              }
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
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
    <div>
      <PageHeader
        title="Staff Details"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate("/staff")
              }
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <button
              type="button"
              className="btn-secondary"
              disabled={refreshing}
              onClick={() =>
                fetchStaff({
                  silent: true
                })
              }
            >
              <RefreshCw
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
                  className="btn-secondary"
                  onClick={
                    openStatusModal
                  }
                >
                  <ShieldCheck size={16} />
                  Change Status
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    setEditOpen(true)
                  }
                >
                  <Edit3 size={16} />
                  Edit Staff
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Success */}

      {success && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/*
        |--------------------------------------------------------------------------
        | Profile Sidebar
        |--------------------------------------------------------------------------
        */}

        <aside className="space-y-5">
          <div className="card overflow-hidden">
            <div className="h-24 bg-gradient-to-br from-brand-600 to-brand-800" />

            <div className="-mt-12 px-5 pb-5">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-brand-50 text-2xl font-bold text-brand-700 shadow-sm">
                {staff.staffPhoto &&
                !imageError ? (
                  <img
                    src={
                      staff.staffPhoto
                    }
                    alt={staff.name}
                    className="h-full w-full object-cover"
                    onError={() =>
                      setImageError(
                        true
                      )
                    }
                  />
                ) : (
                  getInitials(
                    staff.name
                  )
                )}
              </div>

              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-800">
                    {staff.name}
                  </h1>

                  {staff.userId && (
                    <BadgeCheck
                      size={18}
                      className="text-sky-600"
                      title="Linked login account"
                    />
                  )}
                </div>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  {staff.designation ||
                    "No designation"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    tone={getStatusTone(
                      staff.status
                    )}
                  >
                    {formatLabel(
                      staff.status
                    )}
                  </Badge>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getCategoryClass(
                      staff.category
                    )}`}
                  >
                    {formatLabel(
                      staff.category
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                <div className="flex items-start gap-3 text-sm">
                  <IdCard
                    size={16}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div>
                    <p className="text-xs text-slate-400">
                      Employee ID
                    </p>

                    <p className="mt-0.5 font-mono font-semibold text-slate-700">
                      {staff.employeeId}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Building2
                    size={16}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div>
                    <p className="text-xs text-slate-400">
                      School
                    </p>

                    <p className="mt-0.5 font-semibold text-slate-700">
                      {staff.schoolId
                        ?.schoolName ||
                        "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <BriefcaseBusiness
                    size={16}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div>
                    <p className="text-xs text-slate-400">
                      Department
                    </p>

                    <p className="mt-0.5 font-semibold text-slate-700">
                      {staff.department ||
                        "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Phone
                    size={16}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">
                      Phone
                    </p>

                    {staff.phone ? (
                      <a
                        href={`tel:${staff.phone}`}
                        className="mt-0.5 block break-all font-semibold text-slate-700 hover:text-brand-700"
                      >
                        {staff.phone}
                      </a>
                    ) : (
                      <p className="mt-0.5 font-semibold text-slate-700">
                        Not available
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Mail
                    size={16}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">
                      Email
                    </p>

                    {staff.email ? (
                      <a
                        href={`mailto:${staff.email}`}
                        className="mt-0.5 block break-all font-semibold text-slate-700 hover:text-brand-700"
                      >
                        {staff.email}
                      </a>
                    ) : (
                      <p className="mt-0.5 font-semibold text-slate-700">
                        Not available
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setEditOpen(
                        true
                      )
                    }
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    onClick={() => {
                      setDeleteError("");
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Login Account */}

          <SectionCard
            icon={CircleUserRound}
            title="Login Account"
            description="System access linked with this employee."
          >
            {staff.userId ? (
              <div className="space-y-3">
                <DetailItem
                  icon={UserRound}
                  label="Account Name"
                  value={
                    staff.userId.name
                  }
                />

                <DetailItem
                  icon={Mail}
                  label="Account Email"
                >
                  {staff.userId.email ? (
                    <a
                      href={`mailto:${staff.userId.email}`}
                      className="mt-1 block break-all text-sm font-semibold text-brand-700 hover:underline"
                    >
                      {
                        staff.userId
                          .email
                      }
                    </a>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      Not available
                    </p>
                  )}
                </DetailItem>

                <DetailItem
                  icon={ShieldCheck}
                  label="Account Role"
                  value={formatLabel(
                    staff.userId.role
                  )}
                />

                <div
                  className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                    staff.userId
                      .isActive
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  Account is{" "}
                  {staff.userId.isActive
                    ? "active"
                    : "inactive"}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center">
                <CircleUserRound
                  size={28}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-semibold text-slate-600">
                  No login account
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  This employee has a
                  staff record but cannot
                  sign in to the system.
                </p>
              </div>
            )}
          </SectionCard>
        </aside>

        {/*
        |--------------------------------------------------------------------------
        | Main Details
        |--------------------------------------------------------------------------
        */}

        <main className="space-y-5">
          {/* Personal Information */}

          <SectionCard
            icon={UserRound}
            title="Personal Information"
            description="Identity, contact and residential details."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                icon={UserRound}
                label="Full Name"
                value={staff.name}
              />

              <DetailItem
                icon={UsersRound}
                label="Father Name"
                value={
                  staff.fatherName
                }
              />

              <DetailItem
                icon={IdCard}
                label="CNIC"
                value={staff.cnic}
              />

              <DetailItem
                icon={CircleUserRound}
                label="Gender"
                value={formatLabel(
                  staff.gender
                )}
              />

              <DetailItem
                icon={CalendarDays}
                label="Date of Birth"
                value={formatDate(
                  staff.dateOfBirth
                )}
              />

              <DetailItem
                icon={BadgeCheck}
                label="Marital Status"
                value={formatLabel(
                  staff.maritalStatus
                )}
              />

              <DetailItem
                icon={Phone}
                label="Primary Phone"
              >
                {staff.phone ? (
                  <a
                    href={`tel:${staff.phone}`}
                    className="mt-1 block text-sm font-semibold text-brand-700 hover:underline"
                  >
                    {staff.phone}
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Not available
                  </p>
                )}
              </DetailItem>

              <DetailItem
                icon={Phone}
                label="Alternate Phone"
              >
                {staff.alternatePhone ? (
                  <a
                    href={`tel:${staff.alternatePhone}`}
                    className="mt-1 block text-sm font-semibold text-brand-700 hover:underline"
                  >
                    {
                      staff.alternatePhone
                    }
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Not available
                  </p>
                )}
              </DetailItem>

              <DetailItem
                icon={Mail}
                label="Email Address"
              >
                {staff.email ? (
                  <a
                    href={`mailto:${staff.email}`}
                    className="mt-1 block break-all text-sm font-semibold text-brand-700 hover:underline"
                  >
                    {staff.email}
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Not available
                  </p>
                )}
              </DetailItem>

              <DetailItem
                icon={MapPin}
                label="City"
                value={staff.city}
              />

              <DetailItem
                icon={Home}
                label="Residential Address"
                value={staff.address}
                className="sm:col-span-2"
              />
            </div>
          </SectionCard>

          {/* Employment Information */}

          <SectionCard
            icon={BriefcaseBusiness}
            title="Employment Information"
            description="Job category, service dates and professional details."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                icon={Hash}
                label="Employee ID"
                value={
                  staff.employeeId
                }
              />

              <DetailItem
                icon={Building2}
                label="Department"
                value={
                  staff.department
                }
              />

              <DetailItem
                icon={BriefcaseBusiness}
                label="Designation"
                value={
                  staff.designation
                }
              />

              <DetailItem
                icon={BadgeCheck}
                label="Staff Category"
                value={formatLabel(
                  staff.category
                )}
              />

              <DetailItem
                icon={CreditCard}
                label="Employment Type"
                value={formatLabel(
                  staff.employmentType
                )}
              />

              <DetailItem
                icon={ShieldCheck}
                label="Current Status"
              >
                <div className="mt-2">
                  <Badge
                    tone={getStatusTone(
                      staff.status
                    )}
                  >
                    {formatLabel(
                      staff.status
                    )}
                  </Badge>
                </div>
              </DetailItem>

              <DetailItem
                icon={CalendarDays}
                label="Joining Date"
                value={formatDate(
                  staff.joiningDate
                )}
              />

              <DetailItem
                icon={CalendarDays}
                label="Contract End Date"
                value={formatDate(
                  staff.contractEndDate
                )}
              />

              <DetailItem
                icon={Clock3}
                label="Work Shift"
                value={staff.shift}
              />

              <DetailItem
                icon={GraduationCap}
                label="Qualification"
                value={
                  staff.qualification
                }
              />

              <DetailItem
                icon={BriefcaseBusiness}
                label="Experience"
                value={`${Number(
                  staff.experienceYears ||
                    0
                )} year(s)`}
              />

              <DetailItem
                icon={Building2}
                label="School"
                value={
                  staff.schoolId
                    ?.schoolName
                }
              />
            </div>

            {hasLeavingInformation && (
              <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/70 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={19}
                    className="mt-0.5 shrink-0 text-rose-600"
                  />

                  <div>
                    <p className="text-sm font-bold text-rose-700">
                      Leaving Information
                    </p>

                    <p className="mt-2 text-sm leading-6 text-rose-700">
                      <span className="font-semibold">
                        Leaving date:
                      </span>{" "}
                      {formatDate(
                        staff.leavingDate
                      )}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-rose-700">
                      <span className="font-semibold">
                        Reason:
                      </span>{" "}
                      {staff.leavingReason ||
                        "Not provided"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Salary */}

          <SectionCard
            icon={Wallet}
            title="Salary Information"
            description="Fixed monthly salary components for this employee."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SalaryItem
                label="Basic Salary"
                value={
                  staff.basicSalary
                }
              />

              <SalaryItem
                label="Allowances"
                value={
                  staff.allowances
                }
                valueClassName="text-emerald-700"
              />

              <SalaryItem
                label="Deductions"
                value={
                  staff.deductions
                }
                valueClassName="text-rose-700"
              />

              <SalaryItem
                label="Net Salary"
                value={netSalary}
                valueClassName="text-brand-700"
              />
            </div>

            <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
              Net salary is calculated as
              basic salary plus allowances
              minus deductions. Actual
              monthly payroll records will
              be maintained separately in
              the Payroll module.
            </div>
          </SectionCard>

          {/* Bank Information */}

          <SectionCard
            icon={Landmark}
            title="Bank Information"
            description="Account details used for salary payments."
          >
            {hasBankInformation ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  icon={Landmark}
                  label="Bank Name"
                  value={
                    staff.bankName
                  }
                />

                <DetailItem
                  icon={UserRound}
                  label="Account Title"
                  value={
                    staff.accountTitle
                  }
                />

                <DetailItem
                  icon={CreditCard}
                  label="Account Number"
                  value={
                    staff.accountNumber
                  }
                />

                <DetailItem
                  icon={Banknote}
                  label="IBAN"
                  value={staff.iban}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                <Landmark
                  size={28}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-semibold text-slate-600">
                  No bank information
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Bank account details
                  have not been added for
                  this staff member.
                </p>
              </div>
            )}
          </SectionCard>

          {/* Emergency Contact */}

          <SectionCard
            icon={Phone}
            title="Emergency Contact"
            description="Person to contact during an emergency."
          >
            {hasEmergencyContact ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <DetailItem
                  icon={UserRound}
                  label="Contact Name"
                  value={
                    staff
                      .emergencyContact
                      ?.name
                  }
                />

                <DetailItem
                  icon={UsersRound}
                  label="Relationship"
                  value={
                    staff
                      .emergencyContact
                      ?.relationship
                  }
                />

                <DetailItem
                  icon={Phone}
                  label="Phone Number"
                >
                  {staff
                    .emergencyContact
                    ?.phone ? (
                    <a
                      href={`tel:${staff.emergencyContact.phone}`}
                      className="mt-1 block text-sm font-semibold text-brand-700 hover:underline"
                    >
                      {
                        staff
                          .emergencyContact
                          .phone
                      }
                    </a>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      Not available
                    </p>
                  )}
                </DetailItem>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                <Phone
                  size={28}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-semibold text-slate-600">
                  No emergency contact
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Emergency contact
                  information has not been
                  provided.
                </p>
              </div>
            )}
          </SectionCard>

          {/* Documents */}

          <SectionCard
            icon={FileText}
            title="Staff Documents"
            description="Identity documents, certificates, contracts and appointment letters."
          >
            {Array.isArray(
              staff.documents
            ) &&
            staff.documents.length >
              0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {staff.documents.map(
                  (
                    document,
                    index
                  ) => (
                    <article
                      key={
                        document._id ||
                        index
                      }
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
                        <FileText
                          size={18}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-700">
                          {document.title}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-400">
                          {document.documentType ||
                            "General Document"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Added{" "}
                          {formatDate(
                            document.uploadedAt
                          )}
                        </p>
                      </div>

                      {document.fileUrl && (
                        <a
                          href={
                            document.fileUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                          title="Open document"
                          aria-label={`Open ${document.title}`}
                        >
                          <ExternalLink
                            size={16}
                          />
                        </a>
                      )}
                    </article>
                  )
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                <FileText
                  size={30}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-semibold text-slate-600">
                  No documents available
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  No staff documents have
                  been attached to this
                  profile.
                </p>
              </div>
            )}
          </SectionCard>

          {/* Notes */}

          <SectionCard
            icon={FileText}
            title="Additional Notes"
            description="Internal information related to this employee."
          >
            <div className="min-h-20 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">
              {staff.notes ||
                "No additional notes have been added."}
            </div>
          </SectionCard>

          {/* Record Tracking */}

          <SectionCard
            icon={Clock3}
            title="Record Tracking"
            description="Information about the creation and latest update of this record."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem
                icon={CalendarDays}
                label="Created At"
                value={formatDateTime(
                  staff.createdAt
                )}
              />

              <DetailItem
                icon={UserRound}
                label="Created By"
                value={
                  staff.createdBy
                    ?.name
                }
              />

              <DetailItem
                icon={CalendarDays}
                label="Last Updated"
                value={formatDateTime(
                  staff.updatedAt
                )}
              />

              <DetailItem
                icon={UserRound}
                label="Updated By"
                value={
                  staff.updatedBy
                    ?.name
                }
              />
            </div>
          </SectionCard>
        </main>
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Edit Modal
      |--------------------------------------------------------------------------
      */}

      <StaffFormModal
        open={editOpen}
        staff={staff}
        onClose={() =>
          setEditOpen(false)
        }
        onSaved={
          handleStaffSaved
        }
      />

      {/*
      |--------------------------------------------------------------------------
      | Status Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={statusOpen}
        onClose={() => {
          if (
            !updatingStatus
          ) {
            setStatusOpen(false);
            setStatusError("");
          }
        }}
        title="Update Staff Status"
        width="max-w-lg"
      >
        <div className="space-y-5">
          {statusError && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {statusError}
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-800">
              {staff.name}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {staff.employeeId} ·{" "}
              {staff.designation}
            </p>
          </div>

          <div>
            <label className="field-label">
              Staff Status
            </label>

            <select
              className="field-select"
              value={
                statusForm.status
              }
              onChange={
                handleStatusChange
              }
              disabled={
                updatingStatus
              }
            >
              {STAFF_STATUSES.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </div>

          {[
            "resigned",
            "terminated"
          ].includes(
            statusForm.status
          ) && (
            <>
              <div>
                <label className="field-label">
                  Leaving Date
                </label>

                <input
                  type="date"
                  className="field-input"
                  value={
                    statusForm.leavingDate
                  }
                  min={getDateInputValue(
                    staff.joiningDate
                  )}
                  onChange={(
                    event
                  ) => {
                    setStatusForm(
                      (current) => ({
                        ...current,

                        leavingDate:
                          event.target
                            .value
                      })
                    );

                    setStatusError("");
                  }}
                  disabled={
                    updatingStatus
                  }
                />
              </div>

              <div>
                <label className="field-label">
                  Leaving Reason
                </label>

                <textarea
                  className="field-input min-h-24 resize-y"
                  value={
                    statusForm.leavingReason
                  }
                  onChange={(
                    event
                  ) => {
                    setStatusForm(
                      (current) => ({
                        ...current,

                        leavingReason:
                          event.target
                            .value
                      })
                    );

                    setStatusError("");
                  }}
                  placeholder="Enter the reason for leaving"
                  disabled={
                    updatingStatus
                  }
                />
              </div>
            </>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={
                updatingStatus
              }
              onClick={() => {
                setStatusOpen(false);
                setStatusError("");
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              disabled={
                updatingStatus
              }
              onClick={
                handleStatusUpdate
              }
            >
              {updatingStatus && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {updatingStatus
                ? "Updating..."
                : "Update Status"}
            </button>
          </div>
        </div>
      </Modal>

      {/*
      |--------------------------------------------------------------------------
      | Delete Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setDeleteError("");
          }
        }}
        title="Delete Staff Member"
        width="max-w-md"
      >
        <div className="space-y-5">
          {deleteError && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {deleteError}
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Trash2 size={20} />
            </div>

            <div>
              <p className="text-sm leading-6 text-slate-600">
                Are you sure you want to
                delete this staff member?
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800">
                {staff.name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {staff.employeeId} ·{" "}
                {staff.designation}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
            This is a soft delete. The
            staff member can later be
            restored from the Deleted
            Staff page.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={deleting}
              onClick={() => {
                setDeleteOpen(false);
                setDeleteError("");
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {deleting
                ? "Deleting..."
                : "Delete Staff"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffDetails;