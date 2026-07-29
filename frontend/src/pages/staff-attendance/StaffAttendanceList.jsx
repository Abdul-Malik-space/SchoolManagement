import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  AlarmClock,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FilterX,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  UserCheck,
  UsersRound,
  UserX,
  WandSparkles
} from "lucide-react";

import {
  getDailyStaffAttendance,
  markDailyStaffAttendance
} from "../../api/staffAttendance";

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
  EmptyState,
  Table,
  Td
} from "../../components/ui/Table";

/*
|--------------------------------------------------------------------------
| Attendance Options
|--------------------------------------------------------------------------
*/

const ATTENDANCE_STATUSES = [
  {
    value: "",
    label: "Unmarked"
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

const STAFF_CATEGORIES = [
  {
    value: "",
    label: "All categories"
  },
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

const LEAVE_TYPES = [
  {
    value: "",
    label: "Select leave type"
  },
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
    value: "unpaid",
    label: "Unpaid Leave"
  },
  {
    value: "emergency",
    label: "Emergency Leave"
  },
  {
    value: "other",
    label: "Other Leave"
  }
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getTodayInputValue = () => {
  const now = new Date();

  const localDate = new Date(
    now.getTime() -
      now.getTimezoneOffset() *
        60 *
        1000
  );

  return localDate
    .toISOString()
    .slice(0, 10);
};

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

  const date = new Date(
    `${String(value).slice(
      0,
      10
    )}T00:00:00`
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
      weekday: "long",
      day: "2-digit",
      month: "long",
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
    requestError.response?.data
      ?.message ||
    requestError.response?.data
      ?.error ||
    requestError.message ||
    fallback
  );
};

const normalizeNumber = (value) => {
  const number = Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.max(0, number);
};

const getStatusTone = (status) => {
  if (status === "present") {
    return "success";
  }

  if (
    status === "late" ||
    status === "half_day"
  ) {
    return "warning";
  }

  if (status === "absent") {
    return "danger";
  }

  if (status === "leave") {
    return "neutral";
  }

  return "neutral";
};

const getStatusSelectClass = (
  status
) => {
  const classes = {
    present:
      "border-emerald-200 bg-emerald-50 text-emerald-700",

    absent:
      "border-rose-200 bg-rose-50 text-rose-700",

    late:
      "border-amber-200 bg-amber-50 text-amber-700",

    leave:
      "border-sky-200 bg-sky-50 text-sky-700",

    half_day:
      "border-orange-200 bg-orange-50 text-orange-700",

    unmarked:
      "border-slate-200 bg-white text-slate-600"
  };

  return (
    classes[status] ||
    classes.unmarked
  );
};

/*
|--------------------------------------------------------------------------
| Build Editable Attendance Row
|--------------------------------------------------------------------------
*/

const buildAttendanceRow = (
  item
) => {
  const attendance =
    item?.attendance || null;

  return {
    staff:
      item?.staff || {},

    attendanceId:
      attendance?._id || "",

    status:
      attendance?.status || "",

    checkInTime:
      attendance?.checkInTime ||
      "",

    checkOutTime:
      attendance?.checkOutTime ||
      "",

    breakMinutes:
      String(
        attendance?.breakMinutes ??
          0
      ),

    overtimeMinutes:
      String(
        attendance
          ?.overtimeMinutes ?? 0
      ),

    lateMinutes:
      String(
        attendance?.lateMinutes ??
          0
      ),

    leaveType:
      attendance?.leaveType || "",

    leaveReason:
      attendance?.leaveReason ||
      "",

    remarks:
      attendance?.remarks || "",

    previouslyMarked:
      Boolean(attendance)
  };
};

/*
|--------------------------------------------------------------------------
| Empty Summary
|--------------------------------------------------------------------------
*/

const createEmptySummary = () => ({
  totalStaff: 0,
  marked: 0,
  unmarked: 0,
  present: 0,
  absent: 0,
  late: 0,
  leave: 0,
  halfDay: 0
});

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
      }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-4"
        >
          <div className="h-11 w-11 rounded-xl bg-slate-100" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-44 rounded bg-slate-100" />

            <div className="h-2.5 w-64 max-w-full rounded bg-slate-100" />
          </div>

          <div className="h-10 w-32 rounded-lg bg-slate-100" />

          <div className="hidden h-10 w-24 rounded-lg bg-slate-100 lg:block" />

          <div className="hidden h-10 w-24 rounded-lg bg-slate-100 xl:block" />
        </div>
      ))}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Staff Attendance List
|--------------------------------------------------------------------------
*/

const StaffAttendanceList = () => {
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
  | Attendance State
  |--------------------------------------------------------------------------
  */

  const [
    attendanceDate,
    setAttendanceDate
  ] = useState(
    getTodayInputValue
  );

  const [
    sourceRows,
    setSourceRows
  ] = useState([]);

  const [
    rows,
    setRows
  ] = useState([]);

  const [
    serverSummary,
    setServerSummary
  ] = useState(
    createEmptySummary
  );

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
    category,
    setCategory
  ] = useState("");

  const [
    department,
    setDepartment
  ] = useState("");

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
    saving,
    setSaving
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
        setLoadingSchools(true);

        try {
          const { data } =
            await getSchools({
              isActive: true,
              limit: 200
            });

          const schoolRecords =
            data?.schools || [];

          setSchools(
            schoolRecords
          );

          setSelectedSchoolId(
            (current) =>
              current ||
              schoolRecords[0]?._id ||
              ""
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
  | Query Parameters
  |--------------------------------------------------------------------------
  */

  const queryParams =
    useMemo(() => {
      const params = {
        attendanceDate
      };

      if (
        isSuperAdmin &&
        selectedSchoolId
      ) {
        params.schoolId =
          selectedSchoolId;
      }

      if (debouncedSearch) {
        params.search =
          debouncedSearch;
      }

      if (category) {
        params.category =
          category;
      }

      if (
        department.trim()
      ) {
        params.department =
          department.trim();
      }

      return params;
    }, [
      attendanceDate,
      category,
      debouncedSearch,
      department,
      isSuperAdmin,
      selectedSchoolId
    ]);

  /*
  |--------------------------------------------------------------------------
  | Load Daily Attendance
  |--------------------------------------------------------------------------
  */

  const fetchAttendance =
    useCallback(
      async ({
        silent = false
      } = {}) => {
        if (
          isSuperAdmin &&
          !selectedSchoolId
        ) {
          setSourceRows([]);
          setRows([]);

          setServerSummary(
            createEmptySummary()
          );

          setLoading(false);
          setRefreshing(false);

          return;
        }

        if (!attendanceDate) {
          setSourceRows([]);
          setRows([]);
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
          const { data } =
            await getDailyStaffAttendance(
              queryParams
            );

          const rawRows =
            data?.staff || [];

          const editableRows =
            rawRows.map(
              buildAttendanceRow
            );

          setSourceRows(rawRows);

          setRows(
            editableRows
          );

          setServerSummary(
            data?.summary ||
              createEmptySummary()
          );
        } catch (
          requestError
        ) {
          setSourceRows([]);
          setRows([]);

          setServerSummary(
            createEmptySummary()
          );

          setError(
            getErrorMessage(
              requestError,
              "Staff attendance could not be loaded."
            )
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        attendanceDate,
        isSuperAdmin,
        queryParams,
        selectedSchoolId
      ]
    );

  useEffect(() => {
    fetchAttendance();
  }, [
    fetchAttendance
  ]);

  /*
  |--------------------------------------------------------------------------
  | Draft Summary
  |--------------------------------------------------------------------------
  */

  const draftSummary =
    useMemo(() => {
      const summary = {
        totalStaff: rows.length,
        marked: 0,
        unmarked: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        halfDay: 0
      };

      rows.forEach((row) => {
        if (!row.status) {
          summary.unmarked += 1;
          return;
        }

        summary.marked += 1;

        if (
          row.status ===
          "present"
        ) {
          summary.present += 1;
        }

        if (
          row.status ===
          "absent"
        ) {
          summary.absent += 1;
        }

        if (
          row.status === "late"
        ) {
          summary.late += 1;
        }

        if (
          row.status === "leave"
        ) {
          summary.leave += 1;
        }

        if (
          row.status ===
          "half_day"
        ) {
          summary.halfDay += 1;
        }
      });

      return summary;
    }, [
      rows
    ]);

  /*
  |--------------------------------------------------------------------------
  | Selected School Information
  |--------------------------------------------------------------------------
  */

  const selectedSchoolName =
    useMemo(() => {
      if (!isSuperAdmin) {
        return (
          currentUser?.schoolId
            ?.schoolName ||
          currentUser?.school
            ?.schoolName ||
          "Assigned School"
        );
      }

      return (
        schools.find(
          (school) =>
            school._id ===
            selectedSchoolId
        )?.schoolName ||
        "Select School"
      );
    }, [
      currentUser,
      isSuperAdmin,
      schools,
      selectedSchoolId
    ]);

  /*
  |--------------------------------------------------------------------------
  | Update Attendance Row
  |--------------------------------------------------------------------------
  */

  const updateRow = (
    staffId,
    field,
    value
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (
          String(
            row.staff?._id
          ) !== String(staffId)
        ) {
          return row;
        }

        const updatedRow = {
          ...row,
          [field]: value
        };

        /*
        |--------------------------------------------------------------------------
        | Status-Specific Cleanup
        |--------------------------------------------------------------------------
        */

        if (field === "status") {
          if (
            value === "absent" ||
            value === "leave"
          ) {
            updatedRow.checkInTime =
              "";

            updatedRow.checkOutTime =
              "";

            updatedRow.breakMinutes =
              "0";

            updatedRow.overtimeMinutes =
              "0";

            updatedRow.lateMinutes =
              "0";
          }

          if (
            value !== "leave"
          ) {
            updatedRow.leaveType =
              "";

            updatedRow.leaveReason =
              "";
          }

          if (
            value !== "late"
          ) {
            updatedRow.lateMinutes =
              "0";
          }

          if (!value) {
            updatedRow.checkInTime =
              "";

            updatedRow.checkOutTime =
              "";

            updatedRow.breakMinutes =
              "0";

            updatedRow.overtimeMinutes =
              "0";

            updatedRow.lateMinutes =
              "0";

            updatedRow.leaveType =
              "";

            updatedRow.leaveReason =
              "";

            updatedRow.remarks =
              "";
          }
        }

        return updatedRow;
      })
    );

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Mark All Unmarked Staff Present
  |--------------------------------------------------------------------------
  */

  const markUnmarkedPresent =
    () => {
      setRows((currentRows) =>
        currentRows.map((row) => {
          if (row.status) {
            return row;
          }

          return {
            ...row,
            status: "present",
            leaveType: "",
            leaveReason: "",
            lateMinutes: "0"
          };
        })
      );

      setError("");
    };

  /*
  |--------------------------------------------------------------------------
  | Reset Local Draft
  |--------------------------------------------------------------------------
  */

  const resetDraft = () => {
    setRows(
      sourceRows.map(
        buildAttendanceRow
      )
    );

    setError("");
    setSuccess("");
  };

  /*
  |--------------------------------------------------------------------------
  | Clear Filters
  |--------------------------------------------------------------------------
  */

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategory("");
    setDepartment("");
  };

  const hasFilters = Boolean(
    search ||
      category ||
      department
  );

  /*
  |--------------------------------------------------------------------------
  | Validate Attendance
  |--------------------------------------------------------------------------
  */

  const validateAttendance =
    () => {
      if (
        isSuperAdmin &&
        !selectedSchoolId
      ) {
        return "Please select a school.";
      }

      if (!attendanceDate) {
        return "Please select an attendance date.";
      }

      const markedRows =
        rows.filter(
          (row) => row.status
        );

      if (
        markedRows.length === 0
      ) {
        return "Mark attendance for at least one staff member.";
      }

      for (
        const row of markedRows
      ) {
        const staffName =
          row.staff?.name ||
          "Staff member";

        if (
          row.status === "late" &&
          normalizeNumber(
            row.lateMinutes
          ) <= 0
        ) {
          return `${staffName}: Late minutes must be greater than zero.`;
        }

        if (
          row.status === "leave" &&
          !row.leaveType
        ) {
          return `${staffName}: Please select a leave type.`;
        }

        if (
          row.checkInTime &&
          row.checkOutTime &&
          row.checkOutTime <
            row.checkInTime
        ) {
          return `${staffName}: Check-out time cannot be earlier than check-in time.`;
        }

        if (
          normalizeNumber(
            row.breakMinutes
          ) < 0 ||
          normalizeNumber(
            row.overtimeMinutes
          ) < 0 ||
          normalizeNumber(
            row.lateMinutes
          ) < 0
        ) {
          return `${staffName}: Attendance minutes cannot be negative.`;
        }
      }

      return "";
    };

  /*
  |--------------------------------------------------------------------------
  | Build Save Payload
  |--------------------------------------------------------------------------
  */

  const buildSavePayload = () => {
    const records = rows
      .filter(
        (row) => row.status
      )
      .map((row) => {
        const isAbsentOrLeave = [
          "absent",
          "leave"
        ].includes(row.status);

        return {
          staffId:
            row.staff._id,

          status:
            row.status,

          checkInTime:
            isAbsentOrLeave
              ? ""
              : row.checkInTime,

          checkOutTime:
            isAbsentOrLeave
              ? ""
              : row.checkOutTime,

          breakMinutes:
            isAbsentOrLeave
              ? 0
              : normalizeNumber(
                  row.breakMinutes
                ),

          overtimeMinutes:
            isAbsentOrLeave
              ? 0
              : normalizeNumber(
                  row.overtimeMinutes
                ),

          lateMinutes:
            row.status === "late"
              ? normalizeNumber(
                  row.lateMinutes
                )
              : 0,

          leaveType:
            row.status === "leave"
              ? row.leaveType
              : "",

          leaveReason:
            row.status === "leave"
              ? row.leaveReason.trim()
              : "",

          remarks:
            row.remarks.trim()
        };
      });

    const payload = {
      attendanceDate,
      records
    };

    if (isSuperAdmin) {
      payload.schoolId =
        selectedSchoolId;
    }

    return payload;
  };

  /*
  |--------------------------------------------------------------------------
  | Save Attendance
  |--------------------------------------------------------------------------
  */

  const handleSave =
    async () => {
      if (saving) {
        return;
      }

      const validationError =
        validateAttendance();

      if (validationError) {
        setError(
          validationError
        );

        return;
      }

      setSaving(true);
      setError("");
      setSuccess("");

      try {
        const payload =
          buildSavePayload();

        const { data } =
          await markDailyStaffAttendance(
            payload
          );

        setSuccess(
          data?.message ||
            "Staff attendance saved successfully."
        );

        await fetchAttendance({
          silent: true
        });
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            "Staff attendance could not be saved."
          )
        );
      } finally {
        setSaving(false);
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
        title="Staff Attendance"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={
                loading ||
                refreshing ||
                saving
              }
              onClick={
                resetDraft
              }
            >
              <RotateCcw size={16} />
              Reset Draft
            </button>

            <button
              type="button"
              className="btn-secondary"
              disabled={
                refreshing ||
                saving
              }
              onClick={() =>
                fetchAttendance({
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

            <button
              type="button"
              className="btn-primary"
              disabled={
                saving ||
                loading ||
                rows.length === 0
              }
              onClick={handleSave}
            >
              {saving ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Save size={16} />
              )}

              {saving
                ? "Saving..."
                : "Save Attendance"}
            </button>
          </div>
        }
      />

      {/*
      |--------------------------------------------------------------------------
      | Success Message
      |--------------------------------------------------------------------------
      */}

      {success && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={17} />

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
          <span>{error}</span>

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
      | Attendance Context
      |--------------------------------------------------------------------------
      */}

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Building2 size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Attendance School
              </p>

              {isSuperAdmin ? (
                <select
                  className="field-select mt-2"
                  value={
                    selectedSchoolId
                  }
                  onChange={(
                    event
                  ) => {
                    setSelectedSchoolId(
                      event.target.value
                    );

                    setError("");
                    setSuccess("");
                  }}
                  disabled={
                    loadingSchools ||
                    saving
                  }
                >
                  <option value="">
                    {loadingSchools
                      ? "Loading schools..."
                      : "Select school"}
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
              ) : (
                <p className="mt-2 text-base font-bold text-slate-800">
                  {selectedSchoolName}
                </p>
              )}

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Attendance will only be
                recorded for non-teaching
                staff members of this
                school.
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <CalendarDays size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Attendance Date
              </label>

              <input
                type="date"
                className="field-input mt-2"
                value={
                  attendanceDate
                }
                max={
                  getTodayInputValue()
                }
                onChange={(
                  event
                ) => {
                  setAttendanceDate(
                    event.target.value
                  );

                  setError("");
                  setSuccess("");
                }}
                disabled={saving}
              />

              <p className="mt-2 text-xs font-medium text-slate-500">
                {formatDate(
                  attendanceDate
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Summary Cards
      |--------------------------------------------------------------------------
      */}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <SummaryCard
          icon={UsersRound}
          label="Total Staff"
          value={
            draftSummary.totalStaff
          }
          description="Available staff"
          iconClassName="bg-indigo-50 text-indigo-700"
        />

        <SummaryCard
          icon={CalendarCheck}
          label="Marked"
          value={
            draftSummary.marked
          }
          description={`${draftSummary.unmarked} unmarked`}
          iconClassName="bg-brand-50 text-brand-700"
        />

        <SummaryCard
          icon={UserCheck}
          label="Present"
          value={
            draftSummary.present
          }
          description="Full-day present"
          iconClassName="bg-emerald-50 text-emerald-700"
        />

        <SummaryCard
          icon={UserX}
          label="Absent"
          value={
            draftSummary.absent
          }
          description="Absent employees"
          iconClassName="bg-rose-50 text-rose-700"
        />

        <SummaryCard
          icon={AlarmClock}
          label="Late"
          value={
            draftSummary.late
          }
          description="Late arrivals"
          iconClassName="bg-amber-50 text-amber-700"
        />

        <SummaryCard
          icon={Clock3}
          label="Leave / Half Day"
          value={
            draftSummary.leave +
            draftSummary.halfDay
          }
          description={`${draftSummary.leave} leave, ${draftSummary.halfDay} half day`}
          iconClassName="bg-sky-50 text-sky-700"
        />
      </div>

      <div className="card overflow-hidden">
        {/*
        |--------------------------------------------------------------------------
        | Filters and Bulk Actions
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
                placeholder="Search staff name, employee ID, phone or designation"
              />
            </div>

            <select
              className="field-select"
              value={category}
              onChange={(
                event
              ) =>
                setCategory(
                  event.target.value
                )
              }
            >
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
              placeholder="Department"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  rows.length === 0 ||
                  saving
                }
                onClick={
                  markUnmarkedPresent
                }
              >
                <WandSparkles
                  size={16}
                />

                Mark Unmarked Present
              </button>

              {hasFilters && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={
                    clearFilters
                  }
                >
                  <FilterX size={16} />
                  Clear Filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CircleDashed
                size={15}
              />

              Previously saved:{" "}
              <span className="font-semibold text-slate-700">
                {serverSummary.marked ||
                  0}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/*
            |--------------------------------------------------------------------------
            | Super Admin School Requirement
            |--------------------------------------------------------------------------
            */}

            {isSuperAdmin &&
            !selectedSchoolId ? (
              <div className="flex min-h-80 flex-col items-center justify-center p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                  <Building2
                    size={30}
                  />
                </div>

                <h2 className="mt-4 text-lg font-bold text-slate-800">
                  Select a school
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Choose a school before
                  marking staff attendance.
                </p>
              </div>
            ) : (
              <>
                {/*
                |--------------------------------------------------------------------------
                | Desktop Attendance Table
                |--------------------------------------------------------------------------
                */}

                <div className="hidden overflow-x-auto p-4 lg:block lg:p-5">
                  <Table
                    columns={[
                      "Staff Member",
                      "Department",
                      "Status",
                      "Check In",
                      "Check Out",
                      "Late",
                      "Break",
                      "Overtime",
                      "Leave",
                      "Remarks"
                    ]}
                  >
                    {rows.length === 0 ? (
                      <EmptyState
                        colSpan={10}
                        icon={
                          UsersRound
                        }
                        title="No staff members found"
                        description={
                          hasFilters
                            ? "Try changing the selected filters"
                            : "Add active staff members before marking attendance"
                        }
                      />
                    ) : (
                      rows.map((row) => {
                        const staff =
                          row.staff;

                        const disableTimeFields =
                          [
                            "",
                            "absent",
                            "leave"
                          ].includes(
                            row.status
                          );

                        return (
                          <tr
                            key={
                              staff._id
                            }
                            className="align-top transition hover:bg-slate-50/60"
                          >
                            <Td>
                              <div className="flex min-w-[210px] items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
                                  {staff.staffPhoto ? (
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
                                      staff.name
                                    )
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="max-w-[170px] truncate text-sm font-bold text-slate-800">
                                    {
                                      staff.name
                                    }
                                  </p>

                                  <p className="mt-1 font-mono text-xs font-semibold text-slate-500">
                                    {
                                      staff.employeeId
                                    }
                                  </p>

                                  {row.previouslyMarked && (
                                    <div className="mt-1">
                                      <Badge tone="success">
                                        Saved
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Td>

                            <Td>
                              <div className="min-w-[145px]">
                                <p className="text-sm font-semibold text-slate-700">
                                  {staff.department ||
                                    "Not assigned"}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {staff.designation ||
                                    "No designation"}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {staff.shift ||
                                    "No shift"}
                                </p>
                              </div>
                            </Td>

                            <Td>
                              <select
                                className={`h-10 min-w-[125px] rounded-lg border px-3 text-xs font-semibold outline-none transition focus:ring-4 focus:ring-brand-50 ${getStatusSelectClass(
                                  row.status
                                )}`}
                                value={
                                  row.status
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateRow(
                                    staff._id,
                                    "status",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                disabled={
                                  saving
                                }
                              >
                                {ATTENDANCE_STATUSES.map(
                                  (
                                    option
                                  ) => (
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
                            </Td>

                            <Td>
                              <input
                                type="time"
                                className="field-input min-w-[110px]"
                                value={
                                  row.checkInTime
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateRow(
                                    staff._id,
                                    "checkInTime",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                disabled={
                                  saving ||
                                  disableTimeFields
                                }
                              />
                            </Td>

                            <Td>
                              <input
                                type="time"
                                className="field-input min-w-[110px]"
                                value={
                                  row.checkOutTime
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateRow(
                                    staff._id,
                                    "checkOutTime",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                disabled={
                                  saving ||
                                  disableTimeFields
                                }
                              />
                            </Td>

                            <Td>
                              <div className="relative min-w-[95px]">
                                <input
                                  type="number"
                                  min="0"
                                  className="field-input pr-8"
                                  value={
                                    row.lateMinutes
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      staff._id,
                                      "lateMinutes",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  disabled={
                                    saving ||
                                    row.status !==
                                      "late"
                                  }
                                />

                                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                                  min
                                </span>
                              </div>
                            </Td>

                            <Td>
                              <div className="relative min-w-[95px]">
                                <input
                                  type="number"
                                  min="0"
                                  className="field-input pr-8"
                                  value={
                                    row.breakMinutes
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      staff._id,
                                      "breakMinutes",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  disabled={
                                    saving ||
                                    disableTimeFields
                                  }
                                />

                                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                                  min
                                </span>
                              </div>
                            </Td>

                            <Td>
                              <div className="relative min-w-[95px]">
                                <input
                                  type="number"
                                  min="0"
                                  className="field-input pr-8"
                                  value={
                                    row.overtimeMinutes
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      staff._id,
                                      "overtimeMinutes",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  disabled={
                                    saving ||
                                    disableTimeFields
                                  }
                                />

                                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                                  min
                                </span>
                              </div>
                            </Td>

                            <Td>
                              <div className="min-w-[150px] space-y-2">
                                <select
                                  className="field-select"
                                  value={
                                    row.leaveType
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      staff._id,
                                      "leaveType",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  disabled={
                                    saving ||
                                    row.status !==
                                      "leave"
                                  }
                                >
                                  {LEAVE_TYPES.map(
                                    (
                                      option
                                    ) => (
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

                                {row.status ===
                                  "leave" && (
                                  <input
                                    type="text"
                                    className="field-input"
                                    value={
                                      row.leaveReason
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateRow(
                                        staff._id,
                                        "leaveReason",
                                        event
                                          .target
                                          .value
                                      )
                                    }
                                    placeholder="Leave reason"
                                    disabled={
                                      saving
                                    }
                                  />
                                )}
                              </div>
                            </Td>

                            <Td>
                              <input
                                type="text"
                                className="field-input min-w-[180px]"
                                value={
                                  row.remarks
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateRow(
                                    staff._id,
                                    "remarks",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                placeholder="Optional remarks"
                                disabled={
                                  saving ||
                                  !row.status
                                }
                              />
                            </Td>
                          </tr>
                        );
                      })
                    )}
                  </Table>
                </div>

                {/*
                |--------------------------------------------------------------------------
                | Mobile Attendance Cards
                |--------------------------------------------------------------------------
                */}

                <div className="divide-y divide-slate-100 lg:hidden">
                  {rows.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
                      <UsersRound
                        size={34}
                        className="text-slate-300"
                      />

                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No staff members
                        found
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Add active staff or
                        change the selected
                        filters.
                      </p>
                    </div>
                  ) : (
                    rows.map((row) => {
                      const staff =
                        row.staff;

                      const disableTimeFields =
                        [
                          "",
                          "absent",
                          "leave"
                        ].includes(
                          row.status
                        );

                      return (
                        <article
                          key={
                            staff._id
                          }
                          className="p-4 sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
                                {staff.staffPhoto ? (
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
                                    staff.name
                                  )
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-800">
                                  {
                                    staff.name
                                  }
                                </p>

                                <p className="mt-1 font-mono text-xs font-semibold text-slate-500">
                                  {
                                    staff.employeeId
                                  }
                                </p>

                                <p className="mt-1 truncate text-xs text-slate-400">
                                  {staff.designation ||
                                    "No designation"}
                                </p>
                              </div>
                            </div>

                            {row.previouslyMarked && (
                              <Badge tone="success">
                                Saved
                              </Badge>
                            )}
                          </div>

                          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <p className="text-xs text-slate-400">
                              Department
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {staff.department ||
                                "Not assigned"}
                            </p>
                          </div>

                          <div className="mt-4">
                            <label className="field-label">
                              Attendance
                              Status
                            </label>

                            <select
                              className={`h-10 w-full rounded-lg border px-3 text-sm font-semibold outline-none transition focus:ring-4 focus:ring-brand-50 ${getStatusSelectClass(
                                row.status
                              )}`}
                              value={
                                row.status
                              }
                              onChange={(
                                event
                              ) =>
                                updateRow(
                                  staff._id,
                                  "status",
                                  event
                                    .target
                                    .value
                                )
                              }
                              disabled={
                                saving
                              }
                            >
                              {ATTENDANCE_STATUSES.map(
                                (
                                  option
                                ) => (
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
                          </div>

                          {!disableTimeFields && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <div>
                                <label className="field-label">
                                  Check In
                                </label>

                                <input
                                  type="time"
                                  className="field-input"
                                  value={
                                    row.checkInTime
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      staff._id,
                                      "checkInTime",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                />
                              </div>

                              <div>
                                <label className="field-label">
                                  Check Out
                                </label>

                                <input
                                  type="time"
                                  className="field-input"
                                  value={
                                    row.checkOutTime
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      staff._id,
                                      "checkOutTime",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                />
                              </div>

                              <div>
                                <label className="field-label">
                                  Break Minutes
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  className="field-input"
                                  value={
                                    row.breakMinutes
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      staff._id,
                                      "breakMinutes",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                />
                              </div>

                              <div>
                                <label className="field-label">
                                  Overtime Minutes
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  className="field-input"
                                  value={
                                    row.overtimeMinutes
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      staff._id,
                                      "overtimeMinutes",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                />
                              </div>
                            </div>
                          )}

                          {row.status ===
                            "late" && (
                            <div className="mt-4">
                              <label className="field-label">
                                Late Minutes
                              </label>

                              <input
                                type="number"
                                min="1"
                                className="field-input"
                                value={
                                  row.lateMinutes
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateRow(
                                    staff._id,
                                    "lateMinutes",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                disabled={
                                  saving
                                }
                              />
                            </div>
                          )}

                          {row.status ===
                            "leave" && (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="field-label">
                                  Leave Type
                                </label>

                                <select
                                  className="field-select"
                                  value={
                                    row.leaveType
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      staff._id,
                                      "leaveType",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                >
                                  {LEAVE_TYPES.map(
                                    (
                                      option
                                    ) => (
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
                              </div>

                              <div>
                                <label className="field-label">
                                  Leave Reason
                                </label>

                                <input
                                  type="text"
                                  className="field-input"
                                  value={
                                    row.leaveReason
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateRow(
                                      staff._id,
                                      "leaveReason",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  placeholder="Optional reason"
                                  disabled={
                                    saving
                                  }
                                />
                              </div>
                            </div>
                          )}

                          <div className="mt-4">
                            <label className="field-label">
                              Remarks
                            </label>

                            <input
                              type="text"
                              className="field-input"
                              value={
                                row.remarks
                              }
                              onChange={(
                                event
                              ) =>
                                updateRow(
                                  staff._id,
                                  "remarks",
                                  event
                                    .target
                                    .value
                                )
                              }
                              placeholder="Optional remarks"
                              disabled={
                                saving ||
                                !row.status
                              }
                            />
                          </div>

                          {row.status && (
                            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                              <span className="text-xs font-medium text-slate-500">
                                Current Status
                              </span>

                              <Badge
                                tone={getStatusTone(
                                  row.status
                                )}
                              >
                                {formatLabel(
                                  row.status
                                )}
                              </Badge>
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Bottom Save Bar
        |--------------------------------------------------------------------------
        */}

        {!loading &&
          rows.length > 0 && (
            <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {
                    draftSummary.marked
                  }{" "}
                  of{" "}
                  {
                    draftSummary.totalStaff
                  }{" "}
                  staff members marked
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Unmarked employees will
                  not be included in this
                  save request.
                </p>
              </div>

              <button
                type="button"
                className="btn-primary"
                disabled={
                  saving ||
                  draftSummary.marked ===
                    0
                }
                onClick={
                  handleSave
                }
              >
                {saving ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={16} />
                )}

                {saving
                  ? "Saving Attendance..."
                  : "Save Attendance"}
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default StaffAttendanceList;