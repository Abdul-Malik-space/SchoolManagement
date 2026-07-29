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
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FilterX,
  IdCard,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  UsersRound
} from "lucide-react";

import {
  getDeletedStaff,
  restoreStaff
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

/*
|--------------------------------------------------------------------------
| Filter Options
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
| Badge Helpers
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

          <div className="h-9 w-24 rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Deleted Staff List
|--------------------------------------------------------------------------
*/

const DeletedStaffList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user: currentUser
  } = useAuth();

  const isSuperAdmin =
    currentUser?.role ===
    "super_admin";

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

  /*
  |--------------------------------------------------------------------------
  | Search
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
  | Restore State
  |--------------------------------------------------------------------------
  */

  const [
    restoreTarget,
    setRestoreTarget
  ] = useState(null);

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
  | API Query
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

      return params;
    }, [
      debouncedSearch,
      filters,
      isSuperAdmin
    ]);

  /*
  |--------------------------------------------------------------------------
  | Fetch Deleted Staff
  |--------------------------------------------------------------------------
  */

  const fetchDeletedStaff =
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
            await getDeletedStaff(
              queryParams
            );

          setStaff(
            data?.staff || []
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

          setError(
            getErrorMessage(
              requestError,
              "Deleted staff records could not be loaded."
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

  useEffect(() => {
    fetchDeletedStaff();
  }, [fetchDeletedStaff]);

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
  | Clear Filters
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
      filters.department
  );

  /*
  |--------------------------------------------------------------------------
  | Open Restore Modal
  |--------------------------------------------------------------------------
  */

  const openRestoreModal = (
    staffMember
  ) => {
    setRestoreTarget(
      staffMember
    );

    setRestoreError("");
    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Restore Staff Member
  |--------------------------------------------------------------------------
  */

  const handleRestore =
    async () => {
      if (
        !restoreTarget ||
        restoring
      ) {
        return;
      }

      setRestoring(true);
      setRestoreError("");

      try {
        const { data } =
          await restoreStaff(
            restoreTarget._id
          );

        setRestoreTarget(null);

        setSuccess(
          data?.message ||
            "Staff member restored successfully."
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
          await fetchDeletedStaff({
            silent: true
          });
        }
      } catch (
        requestError
      ) {
        setRestoreError(
          getErrorMessage(
            requestError,
            "Staff member could not be restored."
          )
        );
      } finally {
        setRestoring(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div>
      <PageHeader
        title="Deleted Staff"
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
              Back to Staff
            </button>

            <button
              type="button"
              className="btn-secondary"
              disabled={
                refreshing
              }
              onClick={() =>
                fetchDeletedStaff({
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
          </div>
        }
      />

      {/*
      |--------------------------------------------------------------------------
      | Information Banner
      |--------------------------------------------------------------------------
      */}

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-amber-800">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70">
          <Trash2 size={18} />
        </div>

        <div>
          <p className="text-sm font-bold">
            Staff Recycle Bin
          </p>

          <p className="mt-1 text-xs leading-5 text-amber-700">
            These records are soft deleted and still remain in the database.
            Restoring a record will return it to the active staff list.
          </p>
        </div>
      </div>

      {/* Success */}

      {success && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={17} />

          {success}
        </div>
      )}

      <div className="card overflow-hidden">
        {/*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */}

        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                    event.target.value
                  )
                }
                placeholder="Search name, employee ID, phone, CNIC or designation"
              />
            </div>

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

        {/* Error */}

        {error && (
          <div className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-5">
            <span>{error}</span>

            <button
              type="button"
              className="font-semibold"
              onClick={() =>
                fetchDeletedStaff()
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
                  "Status",
                  "School",
                  "Deleted Information",
                  "Action"
                ]}
              >
                {staff.length === 0 ? (
                  <EmptyState
                    colSpan={9}
                    icon={Trash2}
                    title="No deleted staff records"
                    description={
                      hasFilters
                        ? "No deleted staff member matches the selected filters"
                        : "Deleted staff records will appear here"
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
                        {/* Staff Member */}

                        <Td>
                          <div className="flex min-w-[220px] items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                              {getInitials(
                                staffMember.name
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[190px] truncate text-sm font-semibold text-slate-800">
                                {
                                  staffMember.name
                                }
                              </p>

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

                        {/* Deleted Information */}

                        <Td>
                          <div className="min-w-[180px]">
                            <p className="text-xs font-semibold text-slate-600">
                              {formatDateTime(
                                staffMember.deletedAt
                              )}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-400">
                              By{" "}
                              {staffMember
                                .deletedBy
                                ?.name ||
                                "Unknown user"}
                            </p>
                          </div>
                        </Td>

                        {/* Restore */}

                        <Td>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                            onClick={() =>
                              openRestoreModal(
                                staffMember
                              )
                            }
                          >
                            <RotateCcw
                              size={15}
                            />

                            Restore
                          </button>
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
                <div className="flex min-h-60 flex-col items-center justify-center p-5 text-center">
                  <Trash2
                    size={34}
                    className="text-slate-300"
                  />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No deleted staff records
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Deleted staff members
                    will appear on this
                    page.
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
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
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

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-400">
                            Employee ID
                          </p>

                          <p className="mt-1 font-mono text-xs font-semibold text-slate-700">
                            {
                              staffMember.employeeId
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-400">
                            Deleted At
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-700">
                            {formatDate(
                              staffMember.deletedAt
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
                            Deleted by{" "}
                            {staffMember
                              .deletedBy
                              ?.name ||
                              "Unknown user"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                        onClick={() =>
                          openRestoreModal(
                            staffMember
                          )
                        }
                      >
                        <RotateCcw
                          size={16}
                        />

                        Restore Staff
                      </button>
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
                restoring
              }
            />
          </>
        )}
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Restore Confirmation Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={Boolean(
          restoreTarget
        )}
        onClose={() => {
          if (!restoring) {
            setRestoreTarget(
              null
            );

            setRestoreError("");
          }
        }}
        title="Restore Staff Member"
        width="max-w-md"
      >
        <div className="space-y-5">
          {restoreError && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {restoreError}
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <RotateCcw size={21} />
            </div>

            <div>
              <p className="text-sm leading-6 text-slate-600">
                Restore this staff member
                to the active staff list?
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800">
                {restoreTarget?.name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {
                  restoreTarget?.employeeId
                }{" "}
                ·{" "}
                {
                  restoreTarget?.designation
                }
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
            The employee’s previous
            information, status, salary and
            linked account will remain
            unchanged after restoration.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={restoring}
              onClick={() => {
                setRestoreTarget(
                  null
                );

                setRestoreError("");
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={restoring}
              onClick={
                handleRestore
              }
            >
              {restoring ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <RotateCcw
                  size={16}
                />
              )}

              {restoring
                ? "Restoring..."
                : "Restore Staff"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeletedStaffList;