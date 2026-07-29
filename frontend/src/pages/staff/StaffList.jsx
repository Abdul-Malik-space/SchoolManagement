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
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Eye,
  FilterX,
  IdCard,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound
} from "lucide-react";

import {
  deleteStaff,
  getStaff,
  updateStaffStatus
} from "../../api/staff";

import {
  getSchools
} from "../../api/schools";

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

import {
  EmptyState,
  Table,
  Td
} from "../../components/ui/Table";

import {
  Pagination
} from "../../components/ui/Pagination";

import StaffFormModal from "./StaffFormModal";

/*
|--------------------------------------------------------------------------
| Staff Options
|--------------------------------------------------------------------------
*/

const STAFF_CATEGORIES = [
  {
    value: "administration",
    label: "Administration"
  },
  {
    value: "accounts",
    label: "Accounts"
  },
  {
    value: "library",
    label: "Library"
  },
  {
    value: "laboratory",
    label: "Laboratory"
  },
  {
    value: "transport",
    label: "Transport"
  },
  {
    value: "security",
    label: "Security"
  },
  {
    value: "maintenance",
    label: "Maintenance"
  },
  {
    value: "medical",
    label: "Medical"
  },
  {
    value: "support",
    label: "Support Staff"
  },
  {
    value: "other",
    label: "Other"
  }
];

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

const EMPLOYMENT_TYPES = [
  {
    value: "permanent",
    label: "Permanent"
  },
  {
    value: "contract",
    label: "Contract"
  },
  {
    value: "temporary",
    label: "Temporary"
  },
  {
    value: "part_time",
    label: "Part Time"
  },
  {
    value: "intern",
    label: "Intern"
  }
];

/*
|--------------------------------------------------------------------------
| Formatting Helpers
|--------------------------------------------------------------------------
*/

const formatLabel = (value) => {
  if (!value) {
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
| Status Badge
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

/*
|--------------------------------------------------------------------------
| Category Style
|--------------------------------------------------------------------------
*/

const getCategoryClass = (
  category
) => {
  const styles = {
    administration:
      "bg-indigo-50 text-indigo-700",

    accounts:
      "bg-emerald-50 text-emerald-700",

    library:
      "bg-violet-50 text-violet-700",

    laboratory:
      "bg-cyan-50 text-cyan-700",

    transport:
      "bg-amber-50 text-amber-700",

    security:
      "bg-rose-50 text-rose-700",

    maintenance:
      "bg-orange-50 text-orange-700",

    medical:
      "bg-teal-50 text-teal-700",

    support:
      "bg-sky-50 text-sky-700",

    other:
      "bg-slate-100 text-slate-600"
  };

  return (
    styles[category] ||
    styles.other
  );
};

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  description,
  className = "",
  iconClassName = ""
}) => {
  return (
    <div
      className={`card p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 truncate text-2xl font-bold text-slate-800">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
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
    <div className="space-y-3 p-4 sm:p-5">
      {Array.from({
        length: 6
      }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-4"
        >
          <div className="h-11 w-11 rounded-xl bg-slate-100" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-44 rounded bg-slate-100" />

            <div className="h-2.5 w-72 max-w-full rounded bg-slate-100" />
          </div>

          <div className="h-8 w-24 rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Staff List
|--------------------------------------------------------------------------
*/

const StaffList = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  const canManage = [
    "super_admin",
    "principal"
  ].includes(currentUser?.role);

  /*
  |--------------------------------------------------------------------------
  | Data State
  |--------------------------------------------------------------------------
  */

  const [
    staff,
    setStaff
  ] = useState([]);

  const [
    schools,
    setSchools
  ] = useState([]);

  const [
    summary,
    setSummary
  ] = useState({
    totalStaff: 0,
    activeStaff: 0,
    inactiveStaff: 0,
    onLeaveStaff: 0,
    resignedStaff: 0,
    monthlyPayroll: 0
  });

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

  const [
    success,
    setSuccess
  ] = useState("");

  const [
    formOpen,
    setFormOpen
  ] = useState(false);

  const [
    selectedStaff,
    setSelectedStaff
  ] = useState(null);

  const [
    actionMenuId,
    setActionMenuId
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Delete State
  |--------------------------------------------------------------------------
  */

  const [
    deleteTarget,
    setDeleteTarget
  ] = useState(null);

  const [
    deleting,
    setDeleting
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Status State
  |--------------------------------------------------------------------------
  */

  const [
    statusTarget,
    setStatusTarget
  ] = useState(null);

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

  /*
  |--------------------------------------------------------------------------
  | Search State
  |--------------------------------------------------------------------------
  */

  const [
    search,
    setSearch
  ] = useState("");

  const [
    debouncedSearch,
    setDebouncedSearch
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
    status: "",
    category: "",
    employmentType: "",
    department: "",
    hasUserAccount: "",
    page: 1,
    limit: 10
  });

  /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

  const [
    pagination,
    setPagination
  ] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });

  /*
  |--------------------------------------------------------------------------
  | Navigation Success Message
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !location.state?.success
    ) {
      return;
    }

    setSuccess(
      location.state.success
    );

    navigate(
      location.pathname,
      {
        replace: true,
        state: null
      }
    );
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
    const timer =
      window.setTimeout(
        () => {
          setDebouncedSearch(
            search.trim()
          );

          setFilters(
            (current) => ({
              ...current,
              page: 1
            })
          );
        },
        350
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [search]);

  /*
  |--------------------------------------------------------------------------
  | Load Schools
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
            await getSchools({
              isActive: true,
              limit: 200
            });

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
  | Auto Hide Success Message
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
  | Close Action Menu
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!actionMenuId) {
      return undefined;
    }

    const closeMenu = () => {
      setActionMenuId("");
    };

    window.addEventListener(
      "click",
      closeMenu
    );

    return () => {
      window.removeEventListener(
        "click",
        closeMenu
      );
    };
  }, [actionMenuId]);

  /*
  |--------------------------------------------------------------------------
  | API Query Parameters
  |--------------------------------------------------------------------------
  */

  const queryParams =
    useMemo(() => {
      const params = {
        page: filters.page,
        limit: filters.limit
      };

      if (debouncedSearch) {
        params.search =
          debouncedSearch;
      }

      if (
        isSuperAdmin &&
        filters.schoolId
      ) {
        params.schoolId =
          filters.schoolId;
      }

      if (filters.status) {
        params.status =
          filters.status;
      }

      if (filters.category) {
        params.category =
          filters.category;
      }

      if (
        filters.employmentType
      ) {
        params.employmentType =
          filters.employmentType;
      }

      if (
        filters.department.trim()
      ) {
        params.department =
          filters.department.trim();
      }

      if (
        filters.hasUserAccount
      ) {
        params.hasUserAccount =
          filters.hasUserAccount;
      }

      return params;
    }, [
      debouncedSearch,
      filters,
      isSuperAdmin
    ]);

  /*
  |--------------------------------------------------------------------------
  | Fetch Staff
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

        setError("");

        try {
          const { data } =
            await getStaff(
              queryParams
            );

          setStaff(
            data?.staff || []
          );

          setSummary(
            data?.summary || {
              totalStaff: 0,
              activeStaff: 0,
              inactiveStaff: 0,
              onLeaveStaff: 0,
              resignedStaff: 0,
              monthlyPayroll: 0
            }
          );

          setPagination(
            data?.pagination || {
              total: 0,
              page: 1,
              limit:
                filters.limit,
              totalPages: 1,
              hasNextPage:
                false,
              hasPrevPage:
                false
            }
          );
        } catch (
          requestError
        ) {
          setStaff([]);

          setSummary({
            totalStaff: 0,
            activeStaff: 0,
            inactiveStaff: 0,
            onLeaveStaff: 0,
            resignedStaff: 0,
            monthlyPayroll: 0
          });

          setError(
            getErrorMessage(
              requestError,
              "Staff members could not be loaded."
            )
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        filters.limit,
        queryParams
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Load Data
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  /*
  |--------------------------------------------------------------------------
  | Update Filter
  |--------------------------------------------------------------------------
  */

  const updateFilter =
    (field) => (event) => {
      const value =
        event.target.value;

      setFilters(
        (current) => ({
          ...current,
          [field]: value,
          page: 1
        })
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Reset Filters
  |--------------------------------------------------------------------------
  */

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");

    setFilters({
      schoolId: "",
      status: "",
      category: "",
      employmentType: "",
      department: "",
      hasUserAccount: "",
      page: 1,
      limit: 10
    });
  };

  const hasFilters = Boolean(
    search ||
      filters.schoolId ||
      filters.status ||
      filters.category ||
      filters.employmentType ||
      filters.department ||
      filters.hasUserAccount
  );

  /*
  |--------------------------------------------------------------------------
  | Open Create Modal
  |--------------------------------------------------------------------------
  */

  const openCreateModal = () => {
    setSelectedStaff(null);
    setFormOpen(true);
    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Open Edit Modal
  |--------------------------------------------------------------------------
  */

  const openEditModal = (
    staffMember
  ) => {
    setSelectedStaff(
      staffMember
    );

    setFormOpen(true);
    setActionMenuId("");
    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Staff Saved
  |--------------------------------------------------------------------------
  */

  const handleStaffSaved =
    async (
      savedStaff,
      message
    ) => {
      setSelectedStaff(null);

      setSuccess(
        message ||
          "Staff member saved successfully."
      );

      await fetchStaff({
        silent: true
      });
    };

  /*
  |--------------------------------------------------------------------------
  | Open Status Modal
  |--------------------------------------------------------------------------
  */

  const openStatusModal = (
    staffMember
  ) => {
    setStatusTarget(
      staffMember
    );

    setStatusForm({
      status:
        staffMember.status ||
        "active",

      leavingDate:
        staffMember.leavingDate
          ? String(
              staffMember.leavingDate
            ).slice(0, 10)
          : "",

      leavingReason:
        staffMember.leavingReason ||
        ""
    });

    setActionMenuId("");
    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Update Staff Status
  |--------------------------------------------------------------------------
  */

  const handleStatusUpdate =
    async () => {
      if (!statusTarget) {
        return;
      }

      setUpdatingStatus(true);
      setError("");

      try {
        const payload = {
          status:
            statusForm.status
        };

        if (
          [
            "resigned",
            "terminated"
          ].includes(
            statusForm.status
          )
        ) {
          payload.leavingDate =
            statusForm.leavingDate ||
            null;

          payload.leavingReason =
            statusForm.leavingReason.trim();
        }

        const { data } =
          await updateStaffStatus(
            statusTarget._id,
            payload
          );

        setStatusTarget(null);

        setSuccess(
          data?.message ||
            "Staff status updated successfully."
        );

        await fetchStaff({
          silent: true
        });
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            "Staff status could not be updated."
          )
        );
      } finally {
        setUpdatingStatus(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Delete Staff
  |--------------------------------------------------------------------------
  */

  const handleDelete =
    async () => {
      if (!deleteTarget) {
        return;
      }

      setDeleting(true);
      setError("");

      try {
        const { data } =
          await deleteStaff(
            deleteTarget._id
          );

        setDeleteTarget(null);

        setSuccess(
          data?.message ||
            "Staff member deleted successfully."
        );

        if (
          staff.length === 1 &&
          filters.page > 1
        ) {
          setFilters(
            (current) => ({
              ...current,
              page:
                current.page - 1
            })
          );
        } else {
          await fetchStaff({
            silent: true
          });
        }
      } catch (
        requestError
      ) {
        setError(
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
  | Net Salary
  |--------------------------------------------------------------------------
  */

  const getNetSalary = (
    staffMember
  ) => {
    if (
      staffMember.netSalary !==
      undefined
    ) {
      return staffMember.netSalary;
    }

    return Math.max(
      0,
      Number(
        staffMember.basicSalary ||
          0
      ) +
        Number(
          staffMember.allowances ||
            0
        ) -
        Number(
          staffMember.deductions ||
            0
        )
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div>
      <PageHeader
        title="Staff Management"
        action={
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  navigate(
                    "/staff/deleted"
                  )
                }
              >
                <Trash2 size={16} />
                Deleted Staff
              </button>
            )}

            <button
              type="button"
              className="btn-secondary"
              disabled={
                refreshing
              }
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
              <button
                type="button"
                className="btn-primary"
                onClick={
                  openCreateModal
                }
              >
                <Plus size={16} />
                Add Staff
              </button>
            )}
          </div>
        }
      />

      {/* Success Message */}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2
            size={17}
          />

          {success}
        </div>
      )}

      {/* Summary Cards */}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={UsersRound}
          label="Total Staff"
          value={
            summary.totalStaff || 0
          }
          description={`${summary.inactiveStaff || 0} inactive staff member(s)`}
          className="border-indigo-100 bg-gradient-to-br from-white to-indigo-50"
          iconClassName="bg-indigo-100 text-indigo-700"
        />

        <SummaryCard
          icon={CheckCircle2}
          label="Active Staff"
          value={
            summary.activeStaff || 0
          }
          description="Currently active employees"
          className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50"
          iconClassName="bg-emerald-100 text-emerald-700"
        />

        <SummaryCard
          icon={BriefcaseBusiness}
          label="On Leave"
          value={
            summary.onLeaveStaff ||
            0
          }
          description={`${summary.resignedStaff || 0} resigned staff member(s)`}
          className="border-amber-100 bg-gradient-to-br from-white to-amber-50"
          iconClassName="bg-amber-100 text-amber-700"
        />

        <SummaryCard
          icon={
            CircleDollarSign
          }
          label="Monthly Payroll"
          value={formatCurrency(
            summary.monthlyPayroll
          )}
          description="Estimated staff net salaries"
          className="border-sky-100 bg-gradient-to-br from-white to-sky-50"
          iconClassName="bg-sky-100 text-sky-700"
        />
      </div>

      <div className="card overflow-hidden">
        {/*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */}

        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {/* Search */}

            <div className="relative xl:col-span-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                className="field-input pl-9"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search name, employee ID, phone, CNIC or designation"
              />
            </div>

            {/* School */}

            {isSuperAdmin && (
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
            )}

            {/* Status */}

            <select
              className="field-select"
              value={
                filters.status
              }
              onChange={updateFilter(
                "status"
              )}
            >
              <option value="">
                All statuses
              </option>

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

            {/* Category */}

            <select
              className="field-select"
              value={
                filters.category
              }
              onChange={updateFilter(
                "category"
              )}
            >
              <option value="">
                All categories
              </option>

              {STAFF_CATEGORIES.map(
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

            {/* Employment Type */}

            <select
              className="field-select"
              value={
                filters.employmentType
              }
              onChange={updateFilter(
                "employmentType"
              )}
            >
              <option value="">
                All employment types
              </option>

              {EMPLOYMENT_TYPES.map(
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

            {/* Department */}

            <input
              type="text"
              className="field-input"
              value={
                filters.department
              }
              onChange={updateFilter(
                "department"
              )}
              placeholder="Department"
            />

            {/* Login Account */}

            <select
              className="field-select"
              value={
                filters.hasUserAccount
              }
              onChange={updateFilter(
                "hasUserAccount"
              )}
            >
              <option value="">
                All account types
              </option>

              <option value="true">
                Has login account
              </option>

              <option value="false">
                No login account
              </option>
            </select>

            {/* Clear Filters */}

            {hasFilters && (
              <button
                type="button"
                className="btn-ghost"
                onClick={
                  resetFilters
                }
              >
                <FilterX size={16} />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Page Error */}

        {error &&
          !deleteTarget &&
          !statusTarget && (
            <div className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-5">
              <span>{error}</span>

              <button
                type="button"
                className="font-semibold"
                onClick={() =>
                  fetchStaff()
                }
              >
                Retry
              </button>
            </div>
          )}

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/*
            |--------------------------------------------------------------------------
            | Desktop Table
            |--------------------------------------------------------------------------
            */}

            <div className="hidden p-4 lg:block lg:p-5">
              <Table
                columns={[
                  "Staff Member",
                  "Employee ID",
                  "Department",
                  "Category",
                  "Employment",
                  "Net Salary",
                  "Status",
                  "School",
                  "Actions"
                ]}
              >
                {staff.length === 0 ? (
                  <EmptyState
                    colSpan={9}
                    icon={UsersRound}
                    title="No staff members found"
                    description={
                      hasFilters
                        ? "Try changing the selected filters"
                        : "Add non-teaching staff members to begin"
                    }
                  />
                ) : (
                  staff.map(
                    (staffMember) => (
                      <tr
                        key={
                          staffMember._id
                        }
                        className="transition hover:bg-slate-50/70"
                      >
                        {/* Staff */}

                        <Td>
                          <div className="flex min-w-[220px] items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
                              {getInitials(
                                staffMember.name
                              )}
                            </div>

                            <div className="min-w-0">
                              <button
                                type="button"
                                className="block max-w-[190px] truncate text-left text-sm font-semibold text-slate-800 hover:text-brand-700"
                                onClick={() =>
                                  navigate(
                                    `/staff/${staffMember._id}`
                                  )
                                }
                              >
                                {
                                  staffMember.name
                                }
                              </button>

                              <p className="mt-1 max-w-[190px] truncate text-xs text-slate-400">
                                {staffMember.designation ||
                                  "No designation"}
                              </p>

                              <p className="mt-1 max-w-[190px] truncate text-xs text-slate-400">
                                {staffMember.phone ||
                                  "No phone"}
                              </p>
                            </div>
                          </div>
                        </Td>

                        {/* Employee ID */}

                        <Td>
                          <div className="flex min-w-[120px] items-center gap-2">
                            <IdCard
                              size={15}
                              className="shrink-0 text-slate-400"
                            />

                            <span className="font-mono text-xs font-semibold text-slate-600">
                              {
                                staffMember.employeeId
                              }
                            </span>
                          </div>
                        </Td>

                        {/* Department */}

                        <Td>
                          <div className="min-w-[150px]">
                            <p className="text-sm font-semibold text-slate-700">
                              {staffMember.department ||
                                "Not assigned"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {staffMember.shift ||
                                "No shift"}
                            </p>
                          </div>
                        </Td>

                        {/* Category */}

                        <Td>
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${getCategoryClass(
                              staffMember.category
                            )}`}
                          >
                            {formatLabel(
                              staffMember.category
                            )}
                          </span>
                        </Td>

                        {/* Employment */}

                        <Td>
                          <div className="min-w-[130px]">
                            <p className="text-sm font-semibold text-slate-600">
                              {formatLabel(
                                staffMember.employmentType
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Joined{" "}
                              {formatDate(
                                staffMember.joiningDate
                              )}
                            </p>
                          </div>
                        </Td>

                        {/* Salary */}

                        <Td>
                          <div className="min-w-[130px]">
                            <p className="text-sm font-bold text-emerald-700">
                              {formatCurrency(
                                getNetSalary(
                                  staffMember
                                )
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Basic{" "}
                              {formatCurrency(
                                staffMember.basicSalary
                              )}
                            </p>
                          </div>
                        </Td>

                        {/* Status */}

                        <Td>
                          <Badge
                            tone={getStatusTone(
                              staffMember.status
                            )}
                          >
                            {formatLabel(
                              staffMember.status
                            )}
                          </Badge>
                        </Td>

                        {/* School */}

                        <Td>
                          <div className="flex min-w-[160px] items-center gap-2">
                            <Building2
                              size={15}
                              className="shrink-0 text-slate-400"
                            />

                            <span className="truncate text-sm text-slate-600">
                              {staffMember
                                .schoolId
                                ?.schoolName ||
                                "Not available"}
                            </span>
                          </div>
                        </Td>

                        {/* Actions */}

                        <Td>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                              onClick={() =>
                                navigate(
                                  `/staff/${staffMember._id}`
                                )
                              }
                              aria-label="View staff member"
                              title="View"
                            >
                              <Eye
                                size={16}
                              />
                            </button>

                            {canManage && (
                              <div className="relative">
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                  onClick={(
                                    event
                                  ) => {
                                    event.stopPropagation();

                                    setActionMenuId(
                                      (
                                        current
                                      ) =>
                                        current ===
                                        staffMember._id
                                          ? ""
                                          : staffMember._id
                                    );
                                  }}
                                  aria-label="Staff actions"
                                >
                                  <MoreHorizontal
                                    size={17}
                                  />
                                </button>

                                {actionMenuId ===
                                  staffMember._id && (
                                  <div
                                    className="absolute right-0 top-11 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                                    onClick={(
                                      event
                                    ) =>
                                      event.stopPropagation()
                                    }
                                  >
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                      onClick={() =>
                                        openEditModal(
                                          staffMember
                                        )
                                      }
                                    >
                                      <Edit3
                                        size={15}
                                      />

                                      Edit Staff
                                    </button>

                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                      onClick={() =>
                                        openStatusModal(
                                          staffMember
                                        )
                                      }
                                    >
                                      <ShieldCheck
                                        size={15}
                                      />

                                      Change Status
                                    </button>

                                    <button
                                      type="button"
                                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                                      onClick={() => {
                                        setDeleteTarget(
                                          staffMember
                                        );

                                        setActionMenuId(
                                          ""
                                        );

                                        setError(
                                          ""
                                        );
                                      }}
                                    >
                                      <Trash2
                                        size={15}
                                      />

                                      Delete Staff
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </Td>
                      </tr>
                    )
                  )
                )}
              </Table>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Mobile Cards
            |--------------------------------------------------------------------------
            */}

            <div className="divide-y divide-slate-100 lg:hidden">
              {staff.length === 0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center p-5 text-center">
                  <UsersRound
                    size={32}
                    className="text-slate-300"
                  />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No staff members found
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Add staff records or
                    change the filters.
                  </p>
                </div>
              ) : (
                staff.map(
                  (staffMember) => (
                    <article
                      key={
                        staffMember._id
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
                            {getInitials(
                              staffMember.name
                            )}
                          </div>

                          <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-slate-800">
                              {
                                staffMember.name
                              }
                            </h2>

                            <p className="mt-1 truncate text-xs text-slate-400">
                              {staffMember.designation ||
                                "No designation"}
                            </p>
                          </div>
                        </div>

                        <Badge
                          tone={getStatusTone(
                            staffMember.status
                          )}
                        >
                          {formatLabel(
                            staffMember.status
                          )}
                        </Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCategoryClass(
                            staffMember.category
                          )}`}
                        >
                          {formatLabel(
                            staffMember.category
                          )}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {formatLabel(
                            staffMember.employmentType
                          )}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-slate-400">
                            Employee ID
                          </p>

                          <p className="mt-1 font-mono font-semibold text-slate-700">
                            {
                              staffMember.employeeId
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-slate-400">
                            Net Salary
                          </p>

                          <p className="mt-1 font-semibold text-emerald-700">
                            {formatCurrency(
                              getNetSalary(
                                staffMember
                              )
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <BriefcaseBusiness
                            size={14}
                          />

                          <span>
                            {staffMember.department ||
                              "No department"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Building2
                            size={14}
                          />

                          <span>
                            {staffMember
                              .schoolId
                              ?.schoolName ||
                              "Not available"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <UserRound
                            size={14}
                          />

                          <span>
                            {staffMember.phone ||
                              "No phone"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() =>
                            navigate(
                              `/staff/${staffMember._id}`
                            )
                          }
                        >
                          <Eye size={16} />
                          View
                        </button>

                        {canManage ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() =>
                              openEditModal(
                                staffMember
                              )
                            }
                          >
                            <Edit3
                              size={16}
                            />
                            Edit
                          </button>
                        ) : (
                          <div />
                        )}
                      </div>

                      {canManage && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() =>
                              openStatusModal(
                                staffMember
                              )
                            }
                          >
                            <ShieldCheck
                              size={16}
                            />
                            Status
                          </button>

                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                            onClick={() => {
                              setDeleteTarget(
                                staffMember
                              );

                              setError("");
                            }}
                          >
                            <Trash2
                              size={16}
                            />
                            Delete
                          </button>
                        </div>
                      )}
                    </article>
                  )
                )
              )}
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Pagination
            |--------------------------------------------------------------------------
            */}

            <Pagination
              pagination={
                pagination
              }
              onPageChange={(
                page
              ) =>
                setFilters(
                  (current) => ({
                    ...current,
                    page
                  })
                )
              }
              disabled={
                loading ||
                refreshing ||
                deleting ||
                updatingStatus
              }
            />
          </>
        )}
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Staff Create/Edit Modal
      |--------------------------------------------------------------------------
      */}

      <StaffFormModal
        open={formOpen}
        staff={selectedStaff}
        onClose={() => {
          setFormOpen(false);
          setSelectedStaff(null);
        }}
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
        open={Boolean(
          statusTarget
        )}
        onClose={() => {
          if (
            !updatingStatus
          ) {
            setStatusTarget(
              null
            );

            setError("");
          }
        }}
        title="Update Staff Status"
        width="max-w-lg"
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">
              {statusTarget?.name}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {statusTarget?.employeeId}{" "}
              ·{" "}
              {statusTarget?.designation}
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
              onChange={(
                event
              ) => {
                const status =
                  event.target.value;

                setStatusForm(
                  (current) => ({
                    ...current,
                    status,

                    leavingDate: [
                      "resigned",
                      "terminated"
                    ].includes(
                      status
                    )
                      ? current.leavingDate
                      : "",

                    leavingReason: [
                      "resigned",
                      "terminated"
                    ].includes(
                      status
                    )
                      ? current.leavingReason
                      : ""
                  })
                );

                setError("");
              }}
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
                  min={
                    statusTarget
                      ?.joiningDate
                      ? String(
                          statusTarget.joiningDate
                        ).slice(
                          0,
                          10
                        )
                      : undefined
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusForm(
                      (current) => ({
                        ...current,

                        leavingDate:
                          event
                            .target
                            .value
                      })
                    )
                  }
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
                  ) =>
                    setStatusForm(
                      (current) => ({
                        ...current,

                        leavingReason:
                          event
                            .target
                            .value
                      })
                    )
                  }
                  placeholder="Reason for leaving"
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
                setStatusTarget(
                  null
                );

                setError("");
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
        open={Boolean(
          deleteTarget
        )}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(
              null
            );

            setError("");
          }
        }}
        title="Delete Staff Member"
        width="max-w-md"
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
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

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {deleteTarget?.name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {deleteTarget?.employeeId}{" "}
                ·{" "}
                {deleteTarget?.designation}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
            The staff record will be soft
            deleted and can later be
            restored from the deleted
            staff page.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={deleting}
              onClick={() => {
                setDeleteTarget(
                  null
                );

                setError("");
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={deleting}
              onClick={
                handleDelete
              }
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

export default StaffList;