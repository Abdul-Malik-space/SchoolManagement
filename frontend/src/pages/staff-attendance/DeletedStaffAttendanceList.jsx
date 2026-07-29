import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FilterX,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  X
} from "lucide-react";

import {
  getDeletedStaffAttendance,
  restoreStaffAttendance
} from "../../api/staffAttendance";

import {
  getSchools
} from "../../api/schools";

import {
  useAuth
} from "../../context/AuthContext";

import {
  useNavigate
} from "react-router-dom";

import {
  PageHeader
} from "../../components/ui/PageHeader";

import {
  Badge
} from "../../components/ui/Badge";

import {
  EmptyState,
  Table,
  Td
} from "../../components/ui/Table";

/*
|--------------------------------------------------------------------------
| Attendance Status Options
|--------------------------------------------------------------------------
*/

const ATTENDANCE_STATUSES = [
  {
    value: "",
    label: "All Statuses"
  },
  {
    value: "present",
    label: "Present"
  },
  {
    value: "absent",
    label: "Absent"
  },
  {
    value: "late",
    label: "Late"
  },
  {
    value: "leave",
    label: "Leave"
  },
  {
    value: "half_day",
    label: "Half Day"
  }
];

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

const getTodayInputValue = () => {
  const currentDate =
    new Date();

  const localDate =
    new Date(
      currentDate.getTime() -
        currentDate.getTimezoneOffset() *
          60 *
          1000
    );

  return localDate
    .toISOString()
    .slice(0, 10);
};

const getFirstDayOfMonth = () => {
  const currentDate =
    new Date();

  const firstDay =
    new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );

  const localDate =
    new Date(
      firstDay.getTime() -
        firstDay.getTimezoneOffset() *
          60 *
          1000
    );

  return localDate
    .toISOString()
    .slice(0, 10);
};

const formatDate = (
  value
) => {
  if (!value) {
    return "Not available";
  }

  const dateValue =
    String(value).slice(
      0,
      10
    );

  const date =
    new Date(
      `${dateValue}T00:00:00`
    );

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
      weekday: "short",
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
    return "Not available";
  }

  const date =
    new Date(value);

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

/*
|--------------------------------------------------------------------------
| General Formatting Helpers
|--------------------------------------------------------------------------
*/

const formatLabel = (
  value
) => {
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

const getInitials = (
  name
) => {
  return String(
    name || "S"
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

const formatMinutes = (
  value
) => {
  const totalMinutes =
    Math.max(
      0,
      Number(value || 0)
    );

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
};

const getErrorMessage = (
  error,
  fallbackMessage
) => {
  return (
    error.response?.data
      ?.message ||
    error.response?.data
      ?.error ||
    error.message ||
    fallbackMessage
  );
};

/*
|--------------------------------------------------------------------------
| Attendance Status Badge
|--------------------------------------------------------------------------
*/

const getStatusTone = (
  status
) => {
  if (
    status === "present"
  ) {
    return "success";
  }

  if (
    status === "absent"
  ) {
    return "danger";
  }

  if (
    status === "late" ||
    status === "half_day"
  ) {
    return "warning";
  }

  return "neutral";
};

/*
|--------------------------------------------------------------------------
| Pagination Normalizer
|--------------------------------------------------------------------------
*/

const normalizePagination = ({
  rawPagination,
  fallbackPage,
  fallbackLimit,
  fallbackCount
}) => {
  const total =
    Number(
      rawPagination?.total ??
        rawPagination?.totalItems ??
        rawPagination?.totalRecords ??
        fallbackCount ??
        0
    );

  const currentPage =
    Number(
      rawPagination?.page ??
        rawPagination?.currentPage ??
        fallbackPage ??
        1
    );

  const totalPages =
    Number(
      rawPagination?.totalPages ??
        rawPagination?.pages ??
        Math.max(
          1,
          Math.ceil(
            total /
              fallbackLimit
          )
        )
    );

  return {
    total,
    currentPage,
    totalPages:
      Math.max(
        1,
        totalPages
      )
  };
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
  iconClassName
}) => {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-800">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
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
      }).map(
        (_, index) => (
          <div
            key={index}
            className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-4"
          >
            <div className="h-11 w-11 rounded-xl bg-slate-100" />

            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-44 rounded bg-slate-100" />

              <div className="h-2.5 w-64 max-w-full rounded bg-slate-100" />
            </div>

            <div className="hidden h-8 w-24 rounded-lg bg-slate-100 md:block" />

            <div className="hidden h-8 w-24 rounded-lg bg-slate-100 lg:block" />
          </div>
        )
      )}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Deleted Staff Attendance List
|--------------------------------------------------------------------------
*/

const DeletedStaffAttendanceList =
  () => {
    const navigate =
      useNavigate();

    const {
      user: currentUser
    } = useAuth();

    /*
    |--------------------------------------------------------------------------
    | Role Information
    |--------------------------------------------------------------------------
    */

    const userRole =
      currentUser?.role;

    const isSuperAdmin =
      userRole ===
      "super_admin";

    const canRestore =
      [
        "super_admin",
        "principal"
      ].includes(
        userRole
      );

    /*
    |--------------------------------------------------------------------------
    | School State
    |--------------------------------------------------------------------------
    */

    const [
      schools,
      setSchools
    ] = useState([]);

    const [
      selectedSchoolId,
      setSelectedSchoolId
    ] = useState("");

    const [
      loadingSchools,
      setLoadingSchools
    ] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Filters
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

    const [
      status,
      setStatus
    ] = useState("");

    const [
      fromDate,
      setFromDate
    ] = useState(
      getFirstDayOfMonth
    );

    const [
      toDate,
      setToDate
    ] = useState(
      getTodayInputValue
    );

    const [
      department,
      setDepartment
    ] = useState("");

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const [
      page,
      setPage
    ] = useState(1);

    const [
      limit,
      setLimit
    ] = useState(15);

    const [
      pagination,
      setPagination
    ] = useState({
      total: 0,
      currentPage: 1,
      totalPages: 1
    });

    /*
    |--------------------------------------------------------------------------
    | Deleted Attendance Records
    |--------------------------------------------------------------------------
    */

    const [
      attendanceRecords,
      setAttendanceRecords
    ] = useState([]);

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

    /*
    |--------------------------------------------------------------------------
    | Restore Modal State
    |--------------------------------------------------------------------------
    */

    const [
      restoreRecord,
      setRestoreRecord
    ] = useState(null);

    const [
      restoring,
      setRestoring
    ] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Load Schools for Super Admin
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (!isSuperAdmin) {
        setSchools([]);
        setSelectedSchoolId("");

        return;
      }

      const loadSchools =
        async () => {
          setLoadingSchools(
            true
          );

          try {
            const {
              data
            } =
              await getSchools({
                isActive: true,
                limit: 200
              });

            setSchools(
              data?.schools ||
                []
            );
          } catch (
            requestError
          ) {
            setSchools([]);

            setError(
              getErrorMessage(
                requestError,
                "Schools could not be loaded."
              )
            );
          } finally {
            setLoadingSchools(
              false
            );
          }
        };

      loadSchools();
    }, [
      isSuperAdmin
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
          },
          350
        );

      return () => {
        window.clearTimeout(
          timer
        );
      };
    }, [
      search
    ]);

    /*
    |--------------------------------------------------------------------------
    | Reset Page after Filter Change
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      setPage(1);
    }, [
      debouncedSearch,
      selectedSchoolId,
      status,
      fromDate,
      toDate,
      department,
      limit
    ]);

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
    }, [
      success
    ]);

    /*
    |--------------------------------------------------------------------------
    | API Query Parameters
    |--------------------------------------------------------------------------
    */

    const queryParams =
      useMemo(() => {
        const params = {
          page,
          limit
        };

        if (
          isSuperAdmin &&
          selectedSchoolId
        ) {
          params.schoolId =
            selectedSchoolId;
        }

        if (
          debouncedSearch
        ) {
          params.search =
            debouncedSearch;
        }

        if (status) {
          params.status =
            status;
        }

        if (fromDate) {
          params.fromDate =
            fromDate;
        }

        if (toDate) {
          params.toDate =
            toDate;
        }

        if (
          department.trim()
        ) {
          params.department =
            department.trim();
        }

        return params;
      }, [
        page,
        limit,
        isSuperAdmin,
        selectedSchoolId,
        debouncedSearch,
        status,
        fromDate,
        toDate,
        department
      ]);

    /*
    |--------------------------------------------------------------------------
    | Fetch Deleted Attendance
    |--------------------------------------------------------------------------
    */

    const fetchDeletedAttendance =
      useCallback(
        async ({
          silent = false
        } = {}) => {
          if (
            fromDate &&
            toDate &&
            fromDate > toDate
          ) {
            setAttendanceRecords(
              []
            );

            setPagination({
              total: 0,
              currentPage: 1,
              totalPages: 1
            });

            setError(
              "From date cannot be later than to date."
            );

            setLoading(false);
            setRefreshing(false);

            return;
          }

          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          try {
            const {
              data
            } =
              await getDeletedStaffAttendance(
                queryParams
              );

            const records =
              data?.attendance ||
              [];

            setAttendanceRecords(
              records
            );

            setPagination(
              normalizePagination({
                rawPagination:
                  data?.pagination,

                fallbackPage:
                  page,

                fallbackLimit:
                  limit,

                fallbackCount:
                  records.length
              })
            );
          } catch (
            requestError
          ) {
            setAttendanceRecords(
              []
            );

            setPagination({
              total: 0,
              currentPage: page,
              totalPages: 1
            });

            setError(
              getErrorMessage(
                requestError,
                "Deleted staff attendance records could not be loaded."
              )
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        [
          fromDate,
          toDate,
          queryParams,
          page,
          limit
        ]
      );

    useEffect(() => {
      fetchDeletedAttendance();
    }, [
      fetchDeletedAttendance
    ]);

    /*
    |--------------------------------------------------------------------------
    | Visible Summary
    |--------------------------------------------------------------------------
    */

    const visibleSummary =
      useMemo(() => {
        const summary = {
          total:
            attendanceRecords.length,

          present: 0,
          absent: 0,
          late: 0,
          leaveOrHalfDay: 0
        };

        attendanceRecords.forEach(
          (record) => {
            if (
              record.status ===
              "present"
            ) {
              summary.present +=
                1;
            }

            if (
              record.status ===
              "absent"
            ) {
              summary.absent +=
                1;
            }

            if (
              record.status ===
              "late"
            ) {
              summary.late +=
                1;
            }

            if (
              record.status ===
                "leave" ||
              record.status ===
                "half_day"
            ) {
              summary
                .leaveOrHalfDay +=
                1;
            }
          }
        );

        return summary;
      }, [
        attendanceRecords
      ]);

    /*
    |--------------------------------------------------------------------------
    | Filters
    |--------------------------------------------------------------------------
    */

    const hasFilters =
      Boolean(
        search ||
          status ||
          department ||
          (
            isSuperAdmin &&
            selectedSchoolId
          ) ||
          fromDate !==
            getFirstDayOfMonth() ||
          toDate !==
            getTodayInputValue()
      );

    const clearFilters =
      () => {
        setSearch("");
        setDebouncedSearch("");
        setStatus("");
        setDepartment("");
        setSelectedSchoolId("");
        setFromDate(
          getFirstDayOfMonth()
        );
        setToDate(
          getTodayInputValue()
        );
        setPage(1);
        setError("");
      };

    /*
    |--------------------------------------------------------------------------
    | Restore Modal
    |--------------------------------------------------------------------------
    */

    const openRestoreModal = (
      attendance
    ) => {
      setRestoreRecord(
        attendance
      );

      setError("");
      setSuccess("");
    };

    const closeRestoreModal =
      () => {
        if (restoring) {
          return;
        }

        setRestoreRecord(null);
      };

    /*
    |--------------------------------------------------------------------------
    | Restore Attendance Record
    |--------------------------------------------------------------------------
    */

    const handleRestoreAttendance =
      async () => {
        if (
          !restoreRecord ||
          restoring
        ) {
          return;
        }

        setRestoring(true);
        setError("");
        setSuccess("");

        try {
          const {
            data
          } =
            await restoreStaffAttendance(
              restoreRecord._id
            );

          setSuccess(
            data?.message ||
              "Staff attendance restored successfully."
          );

          setRestoreRecord(null);

          if (
            attendanceRecords.length ===
              1 &&
            page > 1
          ) {
            setPage(
              (currentPage) =>
                currentPage - 1
            );
          } else {
            await fetchDeletedAttendance({
              silent: true
            });
          }
        } catch (
          requestError
        ) {
          setError(
            getErrorMessage(
              requestError,
              "Attendance record could not be restored."
            )
          );
        } finally {
          setRestoring(false);
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Pagination Actions
    |--------------------------------------------------------------------------
    */

    const goToPreviousPage =
      () => {
        if (page <= 1) {
          return;
        }

        setPage(
          page - 1
        );
      };

    const goToNextPage =
      () => {
        if (
          page >=
          pagination.totalPages
        ) {
          return;
        }

        setPage(
          page + 1
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
          title="Deleted Staff Attendance"
          action={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  navigate(
                    "/staff-attendance/history"
                  )
                }
              >
                <ArrowLeft
                  size={16}
                />

                Attendance History
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={
                  loading ||
                  refreshing
                }
                onClick={() =>
                  fetchDeletedAttendance({
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
        | Access Information
        |--------------------------------------------------------------------------
        */}

        {!canRestore && (
          <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            You do not have permission to
            restore deleted attendance
            records.
          </div>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Success Message
        |--------------------------------------------------------------------------
        */}

        {success && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2
              size={17}
            />

            {success}
          </div>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Error Message
        |--------------------------------------------------------------------------
        */}

        {error && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>
              {error}
            </span>

            <button
              type="button"
              className="shrink-0 font-semibold"
              onClick={() =>
                setError("")
              }
            >
              Dismiss
            </button>
          </div>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Summary Cards
        |--------------------------------------------------------------------------
        */}

        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            icon={Trash2}
            label="Deleted Records"
            value={
              visibleSummary.total
            }
            description={`${pagination.total} total matching`}
            iconClassName="bg-rose-50 text-rose-700"
          />

          <SummaryCard
            icon={UserRound}
            label="Present"
            value={
              visibleSummary.present
            }
            description="Visible records"
            iconClassName="bg-emerald-50 text-emerald-700"
          />

          <SummaryCard
            icon={History}
            label="Absent"
            value={
              visibleSummary.absent
            }
            description="Visible records"
            iconClassName="bg-rose-50 text-rose-700"
          />

          <SummaryCard
            icon={Clock3}
            label="Late"
            value={
              visibleSummary.late
            }
            description="Visible records"
            iconClassName="bg-amber-50 text-amber-700"
          />

          <SummaryCard
            icon={CalendarDays}
            label="Leave / Half Day"
            value={
              visibleSummary
                .leaveOrHalfDay
            }
            description="Visible records"
            iconClassName="bg-sky-50 text-sky-700"
          />
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */}

        <div className="card mb-5 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                placeholder="Search staff name, employee ID, department or remarks"
              />
            </div>

            {isSuperAdmin && (
              <div className="relative">
                <Building2
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  className="field-select pl-9"
                  value={
                    selectedSchoolId
                  }
                  disabled={
                    loadingSchools
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedSchoolId(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    {loadingSchools
                      ? "Loading schools..."
                      : "All Schools"}
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
                        {
                          school.schoolName
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            <select
              className="field-select"
              value={status}
              onChange={(
                event
              ) =>
                setStatus(
                  event.target.value
                )
              }
            >
              {ATTENDANCE_STATUSES.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>

            <div>
              <label className="field-label">
                From Date
              </label>

              <input
                type="date"
                className="field-input"
                value={fromDate}
                max={
                  toDate ||
                  undefined
                }
                onChange={(
                  event
                ) =>
                  setFromDate(
                    event.target.value
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
                className="field-input"
                value={toDate}
                min={
                  fromDate ||
                  undefined
                }
                max={
                  getTodayInputValue()
                }
                onChange={(
                  event
                ) =>
                  setToDate(
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <label className="field-label">
                Department
              </label>

              <input
                type="text"
                className="field-input"
                value={department}
                onChange={(
                  event
                ) =>
                  setDepartment(
                    event.target.value
                  )
                }
                placeholder="Enter department"
              />
            </div>

            <div>
              <label className="field-label">
                Records Per Page
              </label>

              <select
                className="field-select"
                value={limit}
                onChange={(
                  event
                ) =>
                  setLimit(
                    Number(
                      event.target.value
                    )
                  )
                }
              >
                <option value={10}>
                  10 records
                </option>

                <option value={15}>
                  15 records
                </option>

                <option value={25}>
                  25 records
                </option>

                <option value={50}>
                  50 records
                </option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Trash2
                size={15}
              />

              Deleted attendance records can
              be restored to attendance
              history.
            </div>

            {hasFilters && (
              <button
                type="button"
                className="btn-ghost"
                onClick={
                  clearFilters
                }
              >
                <FilterX
                  size={16}
                />

                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Deleted Attendance Records
        |--------------------------------------------------------------------------
        */}

        <div className="card overflow-hidden">
          {loading ? (
            <LoadingState />
          ) : (
            <>
              {/*
              |--------------------------------------------------------------------------
              | Desktop Table
              |--------------------------------------------------------------------------
              */}

              <div className="hidden overflow-x-auto p-4 lg:block lg:p-5">
                <Table
                  columns={[
                    "Attendance Date",
                    "Staff Member",
                    "School",
                    "Department",
                    "Status",
                    "Check In / Out",
                    "Working Time",
                    "Deleted By",
                    "Deleted At",
                    "Action"
                  ]}
                >
                  {attendanceRecords.length ===
                  0 ? (
                    <EmptyState
                      colSpan={10}
                      icon={
                        Trash2
                      }
                      title="No deleted attendance records"
                      description="Deleted staff attendance records will appear here"
                    />
                  ) : (
                    attendanceRecords.map(
                      (
                        attendance
                      ) => {
                        const staff =
                          attendance
                            .staffId;

                        const school =
                          attendance
                            .schoolId;

                        return (
                          <tr
                            key={
                              attendance._id
                            }
                            className="align-top transition hover:bg-slate-50/60"
                          >
                            <Td>
                              <div className="min-w-[135px]">
                                <p className="text-sm font-bold text-slate-800">
                                  {formatDate(
                                    attendance
                                      .attendanceDate
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  Attendance date
                                </p>
                              </div>
                            </Td>

                            <Td>
                              <div className="flex min-w-[210px] items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-rose-50 text-sm font-bold text-rose-700">
                                  {staff?.staffPhoto ? (
                                    <img
                                      src={
                                        staff.staffPhoto
                                      }
                                      alt={
                                        staff.name
                                      }
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    getInitials(
                                      staff?.name ||
                                        attendance
                                          .staffNameSnapshot
                                    )
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="max-w-[170px] truncate text-sm font-bold text-slate-800">
                                    {staff?.name ||
                                      attendance
                                        .staffNameSnapshot ||
                                      "Unknown Staff"}
                                  </p>

                                  <p className="mt-1 font-mono text-xs font-semibold text-slate-500">
                                    {staff?.employeeId ||
                                      attendance
                                        .employeeIdSnapshot ||
                                      "No ID"}
                                  </p>

                                  <p className="mt-1 truncate text-xs text-slate-400">
                                    {staff?.designation ||
                                      attendance
                                        .designationSnapshot ||
                                      "No designation"}
                                  </p>
                                </div>
                              </div>
                            </Td>

                            <Td>
                              <div className="min-w-[145px]">
                                <p className="text-sm font-semibold text-slate-700">
                                  {school?.schoolName ||
                                    "Assigned School"}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {school?.type ||
                                    "School"}
                                </p>
                              </div>
                            </Td>

                            <Td>
                              <div className="min-w-[130px]">
                                <p className="text-sm font-semibold text-slate-700">
                                  {staff?.department ||
                                    attendance
                                      .departmentSnapshot ||
                                    "Not assigned"}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {staff?.shift ||
                                    "No shift"}
                                </p>
                              </div>
                            </Td>

                            <Td>
                              <Badge
                                tone={getStatusTone(
                                  attendance.status
                                )}
                              >
                                {formatLabel(
                                  attendance.status
                                )}
                              </Badge>

                              {attendance.status ===
                                "leave" &&
                                attendance.leaveType && (
                                  <p className="mt-2 text-xs font-medium text-slate-500">
                                    {formatLabel(
                                      attendance.leaveType
                                    )}
                                  </p>
                                )}
                            </Td>

                            <Td>
                              <div className="min-w-[125px] text-xs">
                                <p className="font-semibold text-slate-700">
                                  In:{" "}
                                  {attendance.checkInTime ||
                                    "—"}
                                </p>

                                <p className="mt-1 font-semibold text-slate-700">
                                  Out:{" "}
                                  {attendance.checkOutTime ||
                                    "—"}
                                </p>

                                <p className="mt-1 text-slate-400">
                                  Break:{" "}
                                  {formatMinutes(
                                    attendance
                                      .breakMinutes
                                  )}
                                </p>
                              </div>
                            </Td>

                            <Td>
                              <div className="min-w-[105px]">
                                <p className="text-sm font-bold text-slate-700">
                                  {attendance
                                    .workingHours
                                    ?.formatted ||
                                    formatMinutes(
                                      attendance
                                        .workingMinutes
                                    )}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  Overtime:{" "}
                                  {formatMinutes(
                                    attendance
                                      .overtimeMinutes
                                  )}
                                </p>
                              </div>
                            </Td>

                            <Td>
                              <div className="min-w-[130px]">
                                <p className="text-sm font-semibold text-slate-700">
                                  {attendance
                                    .deletedBy
                                    ?.name ||
                                    "System User"}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {formatLabel(
                                    attendance
                                      .deletedBy
                                      ?.role
                                  )}
                                </p>
                              </div>
                            </Td>

                            <Td>
                              <div className="min-w-[145px]">
                                <p className="text-sm font-semibold text-slate-700">
                                  {formatDateTime(
                                    attendance
                                      .deletedAt
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  Deletion time
                                </p>
                              </div>
                            </Td>

                            <Td>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() =>
                                  openRestoreModal(
                                    attendance
                                  )
                                }
                                disabled={
                                  !canRestore ||
                                  restoring
                                }
                              >
                                <ArchiveRestore
                                  size={15}
                                />

                                Restore
                              </button>
                            </Td>
                          </tr>
                        );
                      }
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
                {attendanceRecords.length ===
                0 ? (
                  <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                      <Trash2
                        size={30}
                      />
                    </div>

                    <h2 className="mt-4 text-base font-bold text-slate-800">
                      No deleted records
                    </h2>

                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      Deleted staff attendance
                      records will appear here.
                    </p>
                  </div>
                ) : (
                  attendanceRecords.map(
                    (
                      attendance
                    ) => {
                      const staff =
                        attendance
                          .staffId;

                      const school =
                        attendance
                          .schoolId;

                      return (
                        <article
                          key={
                            attendance._id
                          }
                          className="p-4 sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-rose-50 text-sm font-bold text-rose-700">
                                {staff?.staffPhoto ? (
                                  <img
                                    src={
                                      staff.staffPhoto
                                    }
                                    alt={
                                      staff.name
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  getInitials(
                                    staff?.name ||
                                      attendance
                                        .staffNameSnapshot
                                  )
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-800">
                                  {staff?.name ||
                                    attendance
                                      .staffNameSnapshot ||
                                    "Unknown Staff"}
                                </p>

                                <p className="mt-1 font-mono text-xs font-semibold text-slate-500">
                                  {staff?.employeeId ||
                                    attendance
                                      .employeeIdSnapshot ||
                                    "No ID"}
                                </p>

                                <p className="mt-1 truncate text-xs text-slate-400">
                                  {staff?.designation ||
                                    attendance
                                      .designationSnapshot ||
                                    "No designation"}
                                </p>
                              </div>
                            </div>

                            <Badge
                              tone={getStatusTone(
                                attendance.status
                              )}
                            >
                              {formatLabel(
                                attendance.status
                              )}
                            </Badge>
                          </div>

                          <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">
                              Deleted Record
                            </p>

                            <p className="mt-1 text-sm font-bold text-rose-700">
                              {formatDateTime(
                                attendance
                                  .deletedAt
                              )}
                            </p>

                            <p className="mt-1 text-xs text-rose-500">
                              Deleted by{" "}
                              {attendance
                                .deletedBy
                                ?.name ||
                                "System User"}
                            </p>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-slate-100 p-3">
                              <p className="text-xs text-slate-400">
                                Attendance Date
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {formatDate(
                                  attendance
                                    .attendanceDate
                                )}
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-100 p-3">
                              <p className="text-xs text-slate-400">
                                School
                              </p>

                              <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                                {school?.schoolName ||
                                  "Assigned School"}
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-100 p-3">
                              <p className="text-xs text-slate-400">
                                Department
                              </p>

                              <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                                {staff?.department ||
                                  attendance
                                    .departmentSnapshot ||
                                  "Not assigned"}
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-100 p-3">
                              <p className="text-xs text-slate-400">
                                Working Time
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {attendance
                                  .workingHours
                                  ?.formatted ||
                                  formatMinutes(
                                    attendance
                                      .workingMinutes
                                  )}
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-100 p-3">
                              <p className="text-xs text-slate-400">
                                Check In
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {attendance.checkInTime ||
                                  "—"}
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-100 p-3">
                              <p className="text-xs text-slate-400">
                                Check Out
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {attendance.checkOutTime ||
                                  "—"}
                              </p>
                            </div>
                          </div>

                          {attendance.remarks && (
                            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                              <p className="text-xs text-slate-400">
                                Remarks
                              </p>

                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {
                                  attendance.remarks
                                }
                              </p>
                            </div>
                          )}

                          <button
                            type="button"
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() =>
                              openRestoreModal(
                                attendance
                              )
                            }
                            disabled={
                              !canRestore ||
                              restoring
                            }
                          >
                            <ArchiveRestore
                              size={16}
                            />

                            Restore Attendance
                          </button>
                        </article>
                      );
                    }
                  )
                )}
              </div>
            </>
          )}

          {/*
          |--------------------------------------------------------------------------
          | Pagination
          |--------------------------------------------------------------------------
          */}

          {!loading &&
            pagination.total >
              0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="text-xs text-slate-500">
                  Showing page{" "}
                  <span className="font-semibold text-slate-700">
                    {
                      pagination.currentPage
                    }
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {
                      pagination.totalPages
                    }
                  </span>
                  {" · "}
                  <span className="font-semibold text-slate-700">
                    {
                      pagination.total
                    }
                  </span>{" "}
                  deleted records
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={
                      page <= 1 ||
                      refreshing
                    }
                    onClick={
                      goToPreviousPage
                    }
                  >
                    <ArrowLeft
                      size={15}
                    />

                    Previous
                  </button>

                  <div className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">
                    {page}
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={
                      page >=
                        pagination.totalPages ||
                      refreshing
                    }
                    onClick={
                      goToNextPage
                    }
                  >
                    Next

                    <ArrowRight
                      size={15}
                    />
                  </button>
                </div>
              </div>
            )}
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Restore Confirmation Modal
        |--------------------------------------------------------------------------
        */}

        {restoreRecord && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={
              closeRestoreModal
            }
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Restore Attendance
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Return this record to
                    attendance history
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  onClick={
                    closeRestoreModal
                  }
                  disabled={
                    restoring
                  }
                  aria-label="Close modal"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <ArchiveRestore
                    size={22}
                  />
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-800">
                  Restore this attendance
                  record?
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Attendance for{" "}
                  <span className="font-semibold text-slate-700">
                    {restoreRecord
                      .staffId
                      ?.name ||
                      restoreRecord
                        .staffNameSnapshot ||
                      "this staff member"}
                  </span>{" "}
                  on{" "}
                  <span className="font-semibold text-slate-700">
                    {formatDate(
                      restoreRecord
                        .attendanceDate
                    )}
                  </span>{" "}
                  will return to the active
                  attendance history.
                </p>

                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-500">
                      Attendance Status
                    </span>

                    <Badge
                      tone={getStatusTone(
                        restoreRecord.status
                      )}
                    >
                      {formatLabel(
                        restoreRecord.status
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={
                    closeRestoreModal
                  }
                  disabled={
                    restoring
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={
                    handleRestoreAttendance
                  }
                  disabled={
                    restoring
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
                    : "Restore Attendance"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

export default DeletedStaffAttendanceList;