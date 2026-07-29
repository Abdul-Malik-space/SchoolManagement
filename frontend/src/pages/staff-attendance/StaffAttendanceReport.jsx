import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  AlarmClock,
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FilterX,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  Timer,
  UserCheck,
  UsersRound,
  UserX
} from "lucide-react";

import {
  getMonthlyStaffAttendanceReport
} from "../../api/staffAttendance";

import {
  getSchools
} from "../../api/schools";

import {
  getStaff
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
  EmptyState,
  Table,
  Td
} from "../../components/ui/Table";

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
| Year Options
|--------------------------------------------------------------------------
*/

const currentDate = new Date();

const CURRENT_YEAR =
  currentDate.getFullYear();

const CURRENT_MONTH =
  currentDate.getMonth() + 1;

const YEAR_OPTIONS =
  Array.from(
    {
      length: 11
    },
    (_, index) =>
      CURRENT_YEAR - 5 + index
  );

/*
|--------------------------------------------------------------------------
| General Helpers
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

  if (
    hours === 0
  ) {
    return `${minutes}m`;
  }

  if (
    minutes === 0
  ) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
};

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

const getPercentageClass = (
  percentage
) => {
  const value =
    Number(
      percentage || 0
    );

  if (value >= 90) {
    return (
      "bg-emerald-50 text-emerald-700"
    );
  }

  if (value >= 75) {
    return (
      "bg-sky-50 text-sky-700"
    );
  }

  if (value >= 60) {
    return (
      "bg-amber-50 text-amber-700"
    );
  }

  return (
    "bg-rose-50 text-rose-700"
  );
};

/*
|--------------------------------------------------------------------------
| Empty Report
|--------------------------------------------------------------------------
*/

const createEmptyReport = () => ({
  period: {
    year: CURRENT_YEAR,
    month: CURRENT_MONTH,
    startDate: null,
    endDate: null
  },

  recordedDays: 0,
  totalStaff: 0,

  overallSummary: {
    totalRecords: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    halfDay: 0,
    totalLateMinutes: 0,
    totalOvertimeMinutes: 0,
    totalWorkingMinutes: 0,
    workingHours: {
      formatted: "0h 0m"
    },
    overtimeHours: {
      formatted: "0h 0m"
    }
  },

  report: []
});

/*
|--------------------------------------------------------------------------
| CSV Helpers
|--------------------------------------------------------------------------
*/

const escapeCsvValue = (
  value
) => {
  const stringValue =
    value === undefined ||
    value === null
      ? ""
      : String(value);

  return `"${stringValue.replaceAll(
    '"',
    '""'
  )}"`;
};

const downloadCsvFile = (
  filename,
  rows
) => {
  const csvContent =
    rows
      .map((row) =>
        row
          .map(
            escapeCsvValue
          )
          .join(",")
      )
      .join("\n");

  const csvBlob =
    new Blob(
      [
        "\uFEFF",
        csvContent
      ],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const downloadUrl =
    URL.createObjectURL(
      csvBlob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    downloadUrl;

  link.download =
    filename;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(
    downloadUrl
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

            <div className="hidden h-8 w-16 rounded-lg bg-slate-100 md:block" />

            <div className="hidden h-8 w-24 rounded-lg bg-slate-100 lg:block" />

            <div className="hidden h-8 w-20 rounded-lg bg-slate-100 xl:block" />
          </div>
        )
      )}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Staff Attendance Report
|--------------------------------------------------------------------------
*/

const StaffAttendanceReport =
  () => {
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
    | Filters
    |--------------------------------------------------------------------------
    */

    const [
      selectedYear,
      setSelectedYear
    ] = useState(
      CURRENT_YEAR
    );

    const [
      selectedMonth,
      setSelectedMonth
    ] = useState(
      CURRENT_MONTH
    );

    const [
      selectedSchoolId,
      setSelectedSchoolId
    ] = useState("");

    const [
      selectedStaffId,
      setSelectedStaffId
    ] = useState("");

    const [
      department,
      setDepartment
    ] = useState("");

    const [
      search,
      setSearch
    ] = useState("");

    /*
    |--------------------------------------------------------------------------
    | School and Staff Options
    |--------------------------------------------------------------------------
    */

    const [
      schools,
      setSchools
    ] = useState([]);

    const [
      staffOptions,
      setStaffOptions
    ] = useState([]);

    const [
      loadingSchools,
      setLoadingSchools
    ] = useState(false);

    const [
      loadingStaff,
      setLoadingStaff
    ] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Report State
    |--------------------------------------------------------------------------
    */

    const [
      reportData,
      setReportData
    ] = useState(
      createEmptyReport
    );

    const [
      expandedStaffId,
      setExpandedStaffId
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
      error,
      setError
    ] = useState("");

    /*
    |--------------------------------------------------------------------------
    | Load Schools
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

            const schoolRecords =
              data?.schools ||
              [];

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
    | Load Staff Options
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (
        isSuperAdmin &&
        !selectedSchoolId
      ) {
        setStaffOptions([]);
        setSelectedStaffId("");

        return;
      }

      const loadStaffOptions =
        async () => {
          setLoadingStaff(true);

          try {
            const params = {
              limit: 200
            };

            if (
              isSuperAdmin &&
              selectedSchoolId
            ) {
              params.schoolId =
                selectedSchoolId;
            }

            const {
              data
            } =
              await getStaff(
                params
              );

            const staffRecords =
              data?.staff ||
              data?.staffMembers ||
              data?.records ||
              [];

            const availableStaff =
              staffRecords.filter(
                (staffMember) =>
                  !staffMember
                    .isDeleted &&
                  [
                    "active",
                    "on_leave"
                  ].includes(
                    staffMember.status
                  )
              );

            setStaffOptions(
              availableStaff
            );

            setSelectedStaffId(
              (current) => {
                const stillExists =
                  availableStaff.some(
                    (staffMember) =>
                      String(
                        staffMember._id
                      ) ===
                      String(current)
                  );

                return stillExists
                  ? current
                  : "";
              }
            );
          } catch (
            requestError
          ) {
            setStaffOptions([]);
            setSelectedStaffId("");

            setError(
              getErrorMessage(
                requestError,
                "Staff list could not be loaded."
              )
            );
          } finally {
            setLoadingStaff(false);
          }
        };

      loadStaffOptions();
    }, [
      isSuperAdmin,
      selectedSchoolId
    ]);

    /*
    |--------------------------------------------------------------------------
    | Query Parameters
    |--------------------------------------------------------------------------
    */

    const queryParams =
      useMemo(() => {
        const params = {
          year:
            Number(
              selectedYear
            ),

          month:
            Number(
              selectedMonth
            )
        };

        if (
          isSuperAdmin &&
          selectedSchoolId
        ) {
          params.schoolId =
            selectedSchoolId;
        }

        if (
          selectedStaffId
        ) {
          params.staffId =
            selectedStaffId;
        }

        if (
          department.trim()
        ) {
          params.department =
            department.trim();
        }

        return params;
      }, [
        department,
        isSuperAdmin,
        selectedMonth,
        selectedSchoolId,
        selectedStaffId,
        selectedYear
      ]);

    /*
    |--------------------------------------------------------------------------
    | Fetch Monthly Report
    |--------------------------------------------------------------------------
    */

    const fetchMonthlyReport =
      useCallback(
        async ({
          silent = false
        } = {}) => {
          if (
            isSuperAdmin &&
            !selectedSchoolId
          ) {
            setReportData(
              createEmptyReport()
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
              await getMonthlyStaffAttendanceReport(
                queryParams
              );

            setReportData({
              period:
                data?.period || {
                  year:
                    selectedYear,
                  month:
                    selectedMonth,
                  startDate:
                    null,
                  endDate:
                    null
                },

              recordedDays:
                Number(
                  data?.recordedDays ||
                    0
                ),

              totalStaff:
                Number(
                  data?.totalStaff ||
                    0
                ),

              overallSummary: {
                ...createEmptyReport()
                  .overallSummary,

                ...(
                  data?.overallSummary ||
                  {}
                )
              },

              report:
                Array.isArray(
                  data?.report
                )
                  ? data.report
                  : []
            });
          } catch (
            requestError
          ) {
            setReportData(
              createEmptyReport()
            );

            setError(
              getErrorMessage(
                requestError,
                "Monthly staff attendance report could not be loaded."
              )
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        [
          isSuperAdmin,
          queryParams,
          selectedMonth,
          selectedSchoolId,
          selectedYear
        ]
      );

    useEffect(() => {
      fetchMonthlyReport();
    }, [
      fetchMonthlyReport
    ]);

    /*
    |--------------------------------------------------------------------------
    | Search Visible Report
    |--------------------------------------------------------------------------
    */

    const visibleReport =
      useMemo(() => {
        const normalizedSearch =
          search
            .trim()
            .toLowerCase();

        if (!normalizedSearch) {
          return (
            reportData.report
          );
        }

        return reportData.report.filter(
          (reportRow) => {
            const staff =
              reportRow.staff || {};

            const searchableText = [
              staff.name,
              staff.employeeId,
              staff.phone,
              staff.department,
              staff.designation,
              staff.category,
              staff.shift
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return searchableText.includes(
              normalizedSearch
            );
          }
        );
      }, [
        reportData.report,
        search
      ]);

    /*
    |--------------------------------------------------------------------------
    | Selected School Name
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
              String(
                school._id
              ) ===
              String(
                selectedSchoolId
              )
          )?.schoolName ||
          "Selected School"
        );
      }, [
        currentUser,
        isSuperAdmin,
        schools,
        selectedSchoolId
      ]);

    /*
    |--------------------------------------------------------------------------
    | Report Period Name
    |--------------------------------------------------------------------------
    */

    const reportPeriodName =
      useMemo(() => {
        const monthName =
          MONTHS.find(
            (monthOption) =>
              Number(
                monthOption.value
              ) ===
              Number(
                selectedMonth
              )
          )?.label ||
          "Month";

        return `${monthName} ${selectedYear}`;
      }, [
        selectedMonth,
        selectedYear
      ]);

    /*
    |--------------------------------------------------------------------------
    | Clear Filters
    |--------------------------------------------------------------------------
    */

    const hasFilters =
      Boolean(
        selectedStaffId ||
          department ||
          search
      );

    const clearFilters =
      () => {
        setSelectedStaffId("");
        setDepartment("");
        setSearch("");
        setExpandedStaffId("");
        setError("");
      };

    /*
    |--------------------------------------------------------------------------
    | Expand Staff Records
    |--------------------------------------------------------------------------
    */

    const toggleExpandedStaff = (
      staffId
    ) => {
      setExpandedStaffId(
        (current) =>
          String(current) ===
          String(staffId)
            ? ""
            : staffId
      );
    };

    /*
    |--------------------------------------------------------------------------
    | Export CSV
    |--------------------------------------------------------------------------
    */

    const handleExportCsv =
      () => {
        if (
          visibleReport.length ===
          0
        ) {
          setError(
            "There are no report records to export."
          );

          return;
        }

        const csvRows = [
          [
            "School",
            "Report Period",
            "Employee ID",
            "Staff Name",
            "Department",
            "Designation",
            "Marked Days",
            "Present",
            "Absent",
            "Late",
            "Leave",
            "Half Day",
            "Attendance Percentage",
            "Late Minutes",
            "Overtime Minutes",
            "Working Minutes"
          ]
        ];

        visibleReport.forEach(
          (reportRow) => {
            const staff =
              reportRow.staff || {};

            const summary =
              reportRow.summary ||
              {};

            csvRows.push([
              selectedSchoolName,
              reportPeriodName,
              staff.employeeId ||
                "",
              staff.name || "",
              staff.department ||
                "",
              staff.designation ||
                "",
              summary.totalMarked ||
                0,
              summary.present || 0,
              summary.absent || 0,
              summary.late || 0,
              summary.leave || 0,
              summary.halfDay ||
                0,
              `${Number(
                summary
                  .attendancePercentage ||
                  0
              ).toFixed(2)}%`,
              summary
                .totalLateMinutes ||
                0,
              summary
                .totalOvertimeMinutes ||
                0,
              summary
                .totalWorkingMinutes ||
                0
            ]);
          }
        );

        const filename =
          `staff-attendance-${selectedSchoolName
            .toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              "-"
            )
            .replace(
              /^-|-$/g,
              ""
            )}-${selectedYear}-${String(
            selectedMonth
          ).padStart(
            2,
            "0"
          )}.csv`;

        downloadCsvFile(
          filename,
          csvRows
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Print Report
    |--------------------------------------------------------------------------
    */

    const handlePrint =
      () => {
        window.print();
      };

    /*
    |--------------------------------------------------------------------------
    | Overall Summary
    |--------------------------------------------------------------------------
    */

    const overallSummary =
      reportData.overallSummary ||
      createEmptyReport()
        .overallSummary;

    const workingHours =
      overallSummary
        .workingHours
        ?.formatted ||
      formatMinutes(
        overallSummary
          .totalWorkingMinutes
      );

    const overtimeHours =
      overallSummary
        .overtimeHours
        ?.formatted ||
      formatMinutes(
        overallSummary
          .totalOvertimeMinutes
      );

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
      <div>
        <div className="print:hidden">
          <PageHeader
            title="Staff Attendance Report"
            action={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={
                    loading ||
                    refreshing
                  }
                  onClick={() =>
                    fetchMonthlyReport({
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
                  className="btn-secondary"
                  disabled={
                    loading ||
                    visibleReport.length ===
                      0
                  }
                  onClick={
                    handleExportCsv
                  }
                >
                  <Download
                    size={16}
                  />

                  Export CSV
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  disabled={
                    loading ||
                    visibleReport.length ===
                      0
                  }
                  onClick={
                    handlePrint
                  }
                >
                  <Printer
                    size={16}
                  />

                  Print Report
                </button>
              </div>
            }
          />
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Print Header
        |--------------------------------------------------------------------------
        */}

        <div className="mb-6 hidden border-b-2 border-slate-800 pb-5 print:block">
          <h1 className="text-2xl font-bold text-slate-900">
            Staff Attendance Report
          </h1>

          <p className="mt-2 text-sm text-slate-700">
            School:{" "}
            <strong>
              {selectedSchoolName}
            </strong>
          </p>

          <p className="mt-1 text-sm text-slate-700">
            Report Period:{" "}
            <strong>
              {reportPeriodName}
            </strong>
          </p>

          <p className="mt-1 text-sm text-slate-700">
            Generated:{" "}
            <strong>
              {new Intl.DateTimeFormat(
                "en-US",
                {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute:
                    "2-digit"
                }
              ).format(
                new Date()
              )}
            </strong>
          </p>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Error Message
        |--------------------------------------------------------------------------
        */}

        {error && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 print:hidden">
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
        | Report Context
        |--------------------------------------------------------------------------
        */}

        <div className="card mb-5 p-4 sm:p-5 print:border print:border-slate-300 print:shadow-none">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 print:hidden">
                <BarChart3
                  size={22}
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Monthly Report
                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-800">
                  {reportPeriodName}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedSchoolName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
                {
                  reportData.recordedDays
                }{" "}
                recorded days
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
                {
                  reportData.totalStaff
                }{" "}
                staff members
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
                {
                  overallSummary.totalRecords ||
                  0
                }{" "}
                attendance records
              </span>
            </div>
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */}

        <div className="card mb-5 p-4 sm:p-5 print:hidden">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {isSuperAdmin && (
              <div>
                <label className="field-label">
                  School
                </label>

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
                    ) => {
                      setSelectedSchoolId(
                        event.target.value
                      );

                      setSelectedStaffId(
                        ""
                      );

                      setExpandedStaffId(
                        ""
                      );
                    }}
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
                </div>
              </div>
            )}

            <div>
              <label className="field-label">
                Month
              </label>

              <select
                className="field-select"
                value={
                  selectedMonth
                }
                onChange={(
                  event
                ) => {
                  setSelectedMonth(
                    Number(
                      event.target.value
                    )
                  );

                  setExpandedStaffId(
                    ""
                  );
                }}
              >
                {MONTHS.map(
                  (monthOption) => (
                    <option
                      key={
                        monthOption.value
                      }
                      value={
                        monthOption.value
                      }
                    >
                      {
                        monthOption.label
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="field-label">
                Year
              </label>

              <select
                className="field-select"
                value={
                  selectedYear
                }
                onChange={(
                  event
                ) => {
                  setSelectedYear(
                    Number(
                      event.target.value
                    )
                  );

                  setExpandedStaffId(
                    ""
                  );
                }}
              >
                {YEAR_OPTIONS.map(
                  (yearOption) => (
                    <option
                      key={
                        yearOption
                      }
                      value={
                        yearOption
                      }
                    >
                      {yearOption}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="field-label">
                Staff Member
              </label>

              <select
                className="field-select"
                value={
                  selectedStaffId
                }
                disabled={
                  loadingStaff ||
                  (
                    isSuperAdmin &&
                    !selectedSchoolId
                  )
                }
                onChange={(
                  event
                ) => {
                  setSelectedStaffId(
                    event.target.value
                  );

                  setExpandedStaffId(
                    ""
                  );
                }}
              >
                <option value="">
                  {loadingStaff
                    ? "Loading staff..."
                    : "All staff members"}
                </option>

                {staffOptions.map(
                  (staffMember) => (
                    <option
                      key={
                        staffMember._id
                      }
                      value={
                        staffMember._id
                      }
                    >
                      {
                        staffMember.employeeId
                      }{" "}
                      -{" "}
                      {
                        staffMember.name
                      }
                    </option>
                  )
                )}
              </select>
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
                ) => {
                  setDepartment(
                    event.target.value
                  );

                  setExpandedStaffId(
                    ""
                  );
                }}
                placeholder="Enter department"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-lg">
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
                placeholder="Search visible report by name, employee ID or designation"
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                className="btn-ghost shrink-0"
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
        | Summary Cards
        |--------------------------------------------------------------------------
        */}

        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8 print:grid-cols-4">
          <SummaryCard
            icon={UsersRound}
            label="Total Staff"
            value={
              reportData.totalStaff
            }
            description="Included in report"
            iconClassName="bg-indigo-50 text-indigo-700"
          />

          <SummaryCard
            icon={CalendarCheck}
            label="Records"
            value={
              overallSummary.totalRecords ||
              0
            }
            description={`${reportData.recordedDays} recorded days`}
            iconClassName="bg-brand-50 text-brand-700"
          />

          <SummaryCard
            icon={UserCheck}
            label="Present"
            value={
              overallSummary.present ||
              0
            }
            description="Full-day attendance"
            iconClassName="bg-emerald-50 text-emerald-700"
          />

          <SummaryCard
            icon={UserX}
            label="Absent"
            value={
              overallSummary.absent ||
              0
            }
            description="Absent records"
            iconClassName="bg-rose-50 text-rose-700"
          />

          <SummaryCard
            icon={AlarmClock}
            label="Late"
            value={
              overallSummary.late ||
              0
            }
            description={`${formatMinutes(
              overallSummary
                .totalLateMinutes
            )} total late`}
            iconClassName="bg-amber-50 text-amber-700"
          />

          <SummaryCard
            icon={CalendarDays}
            label="Leave"
            value={
              overallSummary.leave ||
              0
            }
            description={`${overallSummary.halfDay || 0} half day`}
            iconClassName="bg-sky-50 text-sky-700"
          />

          <SummaryCard
            icon={Clock3}
            label="Working Time"
            value={
              workingHours
            }
            description="Total recorded time"
            iconClassName="bg-violet-50 text-violet-700"
          />

          <SummaryCard
            icon={Timer}
            label="Overtime"
            value={
              overtimeHours
            }
            description="Total overtime"
            iconClassName="bg-orange-50 text-orange-700"
          />
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Super Admin School Requirement
        |--------------------------------------------------------------------------
        */}

        {isSuperAdmin &&
        !selectedSchoolId ? (
          <div className="card flex min-h-80 flex-col items-center justify-center p-6 text-center print:hidden">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <Building2
                size={30}
              />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-800">
              Select a school
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Select a school to generate
              its monthly staff attendance
              report.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden print:border print:border-slate-300 print:shadow-none">
            {loading ? (
              <LoadingState />
            ) : (
              <>
                {/*
                |--------------------------------------------------------------------------
                | Desktop Report Table
                |--------------------------------------------------------------------------
                */}

                <div className="hidden overflow-x-auto p-4 lg:block lg:p-5 print:block print:p-0">
                  <Table
                    columns={[
                      "Staff Member",
                      "Department",
                      "Marked",
                      "Present",
                      "Absent",
                      "Late",
                      "Leave",
                      "Half Day",
                      "Attendance",
                      "Working Time",
                      "Overtime",
                      ""
                    ]}
                  >
                    {visibleReport.length ===
                    0 ? (
                      <EmptyState
                        colSpan={12}
                        icon={
                          BarChart3
                        }
                        title="No attendance report found"
                        description="No staff attendance data matches the selected month and filters"
                      />
                    ) : (
                      visibleReport.map(
                        (
                          reportRow
                        ) => {
                          const staff =
                            reportRow.staff ||
                            {};

                          const summary =
                            reportRow.summary ||
                            {};

                          const records =
                            reportRow.records ||
                            [];

                          const isExpanded =
                            String(
                              expandedStaffId
                            ) ===
                            String(
                              staff._id
                            );

                          return (
                            <>
                              <tr
                                key={
                                  staff._id
                                }
                                className="align-top transition hover:bg-slate-50/60"
                              >
                                <Td>
                                  <div className="flex min-w-[210px] items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-sm font-bold text-brand-700 print:hidden">
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
                                        {staff.name ||
                                          "Unknown Staff"}
                                      </p>

                                      <p className="mt-1 font-mono text-xs font-semibold text-slate-500">
                                        {staff.employeeId ||
                                          "No ID"}
                                      </p>

                                      <p className="mt-1 truncate text-xs text-slate-400">
                                        {staff.designation ||
                                          "No designation"}
                                      </p>
                                    </div>
                                  </div>
                                </Td>

                                <Td>
                                  <div className="min-w-[130px]">
                                    <p className="text-sm font-semibold text-slate-700">
                                      {staff.department ||
                                        "Not assigned"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                      {staff.shift ||
                                        "No shift"}
                                    </p>
                                  </div>
                                </Td>

                                <Td>
                                  <span className="text-sm font-bold text-slate-700">
                                    {summary.totalMarked ||
                                      0}
                                  </span>
                                </Td>

                                <Td>
                                  <span className="font-semibold text-emerald-700">
                                    {summary.present ||
                                      0}
                                  </span>
                                </Td>

                                <Td>
                                  <span className="font-semibold text-rose-700">
                                    {summary.absent ||
                                      0}
                                  </span>
                                </Td>

                                <Td>
                                  <div>
                                    <span className="font-semibold text-amber-700">
                                      {summary.late ||
                                        0}
                                    </span>

                                    <p className="mt-1 text-[10px] text-slate-400">
                                      {formatMinutes(
                                        summary
                                          .totalLateMinutes
                                      )}
                                    </p>
                                  </div>
                                </Td>

                                <Td>
                                  <span className="font-semibold text-sky-700">
                                    {summary.leave ||
                                      0}
                                  </span>
                                </Td>

                                <Td>
                                  <span className="font-semibold text-orange-700">
                                    {summary.halfDay ||
                                      0}
                                  </span>
                                </Td>

                                <Td>
                                  <span
                                    className={`inline-flex min-w-[72px] justify-center rounded-full px-2.5 py-1 text-xs font-bold ${getPercentageClass(
                                      summary
                                        .attendancePercentage
                                    )}`}
                                  >
                                    {Number(
                                      summary
                                        .attendancePercentage ||
                                        0
                                    ).toFixed(
                                      2
                                    )}
                                    %
                                  </span>
                                </Td>

                                <Td>
                                  <div className="min-w-[100px]">
                                    <p className="text-sm font-bold text-slate-700">
                                      {summary
                                        .workingHours
                                        ?.formatted ||
                                        formatMinutes(
                                          summary
                                            .totalWorkingMinutes
                                        )}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                      Recorded time
                                    </p>
                                  </div>
                                </Td>

                                <Td>
                                  <div className="min-w-[90px]">
                                    <p className="text-sm font-bold text-indigo-700">
                                      {summary
                                        .overtimeHours
                                        ?.formatted ||
                                        formatMinutes(
                                          summary
                                            .totalOvertimeMinutes
                                        )}
                                    </p>
                                  </div>
                                </Td>

                                <Td>
                                  <button
                                    type="button"
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 print:hidden"
                                    onClick={() =>
                                      toggleExpandedStaff(
                                        staff._id
                                      )
                                    }
                                    aria-label={
                                      isExpanded
                                        ? "Hide daily records"
                                        : "Show daily records"
                                    }
                                  >
                                    {isExpanded ? (
                                      <ChevronUp
                                        size={18}
                                      />
                                    ) : (
                                      <ChevronDown
                                        size={18}
                                      />
                                    )}
                                  </button>
                                </Td>
                              </tr>

                              {isExpanded && (
                                <tr
                                  key={`${staff._id}-details`}
                                  className="bg-slate-50/70 print:hidden"
                                >
                                  <td
                                    colSpan={12}
                                    className="px-5 py-4"
                                  >
                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                      <div className="mb-3 flex items-center justify-between">
                                        <div>
                                          <p className="text-sm font-bold text-slate-800">
                                            Daily Attendance Records
                                          </p>

                                          <p className="mt-1 text-xs text-slate-400">
                                            {
                                              records.length
                                            }{" "}
                                            marked records for{" "}
                                            {
                                              reportPeriodName
                                            }
                                          </p>
                                        </div>
                                      </div>

                                      {records.length ===
                                      0 ? (
                                        <p className="py-5 text-center text-sm text-slate-400">
                                          No daily records
                                          available.
                                        </p>
                                      ) : (
                                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                          {records.map(
                                            (
                                              record
                                            ) => (
                                              <div
                                                key={
                                                  record._id
                                                }
                                                className="rounded-xl border border-slate-100 p-3"
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div>
                                                    <p className="text-sm font-bold text-slate-700">
                                                      {formatDate(
                                                        record.attendanceDate
                                                      )}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                      {record.checkInTime ||
                                                        "—"}
                                                      {" — "}
                                                      {record.checkOutTime ||
                                                        "—"}
                                                    </p>
                                                  </div>

                                                  <Badge
                                                    tone={getStatusTone(
                                                      record.status
                                                    )}
                                                  >
                                                    {formatLabel(
                                                      record.status
                                                    )}
                                                  </Badge>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                  <div className="rounded-lg bg-slate-50 p-2">
                                                    <p className="text-slate-400">
                                                      Working
                                                    </p>

                                                    <p className="mt-1 font-semibold text-slate-700">
                                                      {record
                                                        .workingHours
                                                        ?.formatted ||
                                                        formatMinutes(
                                                          record
                                                            .workingMinutes
                                                        )}
                                                    </p>
                                                  </div>

                                                  <div className="rounded-lg bg-slate-50 p-2">
                                                    <p className="text-slate-400">
                                                      Overtime
                                                    </p>

                                                    <p className="mt-1 font-semibold text-indigo-700">
                                                      {formatMinutes(
                                                        record
                                                          .overtimeMinutes
                                                      )}
                                                    </p>
                                                  </div>
                                                </div>

                                                {record.status ===
                                                  "leave" &&
                                                  record.leaveType && (
                                                    <p className="mt-3 text-xs font-medium text-sky-700">
                                                      {formatLabel(
                                                        record.leaveType
                                                      )}
                                                      {record.leaveReason
                                                        ? ` — ${record.leaveReason}`
                                                        : ""}
                                                    </p>
                                                  )}

                                                {record.remarks && (
                                                  <p className="mt-3 text-xs leading-5 text-slate-500">
                                                    {
                                                      record.remarks
                                                    }
                                                  </p>
                                                )}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        }
                      )
                    )}
                  </Table>
                </div>

                {/*
                |--------------------------------------------------------------------------
                | Mobile Report Cards
                |--------------------------------------------------------------------------
                */}

                <div className="divide-y divide-slate-100 lg:hidden print:hidden">
                  {visibleReport.length ===
                  0 ? (
                    <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <BarChart3
                          size={30}
                        />
                      </div>

                      <h2 className="mt-4 text-base font-bold text-slate-800">
                        No report records
                      </h2>

                      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                        No attendance data
                        matches the selected
                        month and filters.
                      </p>
                    </div>
                  ) : (
                    visibleReport.map(
                      (
                        reportRow
                      ) => {
                        const staff =
                          reportRow.staff ||
                          {};

                        const summary =
                          reportRow.summary ||
                          {};

                        const records =
                          reportRow.records ||
                          [];

                        const isExpanded =
                          String(
                            expandedStaffId
                          ) ===
                          String(
                            staff._id
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
                                    {staff.name ||
                                      "Unknown Staff"}
                                  </p>

                                  <p className="mt-1 font-mono text-xs font-semibold text-slate-500">
                                    {staff.employeeId ||
                                      "No ID"}
                                  </p>

                                  <p className="mt-1 truncate text-xs text-slate-400">
                                    {staff.designation ||
                                      "No designation"}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${getPercentageClass(
                                  summary
                                    .attendancePercentage
                                )}`}
                              >
                                {Number(
                                  summary
                                    .attendancePercentage ||
                                    0
                                ).toFixed(
                                  2
                                )}
                                %
                              </span>
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

                            <div className="mt-4 grid grid-cols-3 gap-2">
                              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                                <p className="text-lg font-bold text-emerald-700">
                                  {summary.present ||
                                    0}
                                </p>

                                <p className="mt-1 text-[10px] font-semibold uppercase text-emerald-600">
                                  Present
                                </p>
                              </div>

                              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center">
                                <p className="text-lg font-bold text-rose-700">
                                  {summary.absent ||
                                    0}
                                </p>

                                <p className="mt-1 text-[10px] font-semibold uppercase text-rose-600">
                                  Absent
                                </p>
                              </div>

                              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
                                <p className="text-lg font-bold text-amber-700">
                                  {summary.late ||
                                    0}
                                </p>

                                <p className="mt-1 text-[10px] font-semibold uppercase text-amber-600">
                                  Late
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div className="rounded-xl border border-slate-100 p-3">
                                <p className="text-xs text-slate-400">
                                  Marked Days
                                </p>

                                <p className="mt-1 text-sm font-bold text-slate-700">
                                  {summary.totalMarked ||
                                    0}
                                </p>
                              </div>

                              <div className="rounded-xl border border-slate-100 p-3">
                                <p className="text-xs text-slate-400">
                                  Leave / Half Day
                                </p>

                                <p className="mt-1 text-sm font-bold text-slate-700">
                                  {summary.leave ||
                                    0}
                                  {" / "}
                                  {summary.halfDay ||
                                    0}
                                </p>
                              </div>

                              <div className="rounded-xl border border-slate-100 p-3">
                                <p className="text-xs text-slate-400">
                                  Working Time
                                </p>

                                <p className="mt-1 text-sm font-bold text-slate-700">
                                  {summary
                                    .workingHours
                                    ?.formatted ||
                                    formatMinutes(
                                      summary
                                        .totalWorkingMinutes
                                    )}
                                </p>
                              </div>

                              <div className="rounded-xl border border-slate-100 p-3">
                                <p className="text-xs text-slate-400">
                                  Overtime
                                </p>

                                <p className="mt-1 text-sm font-bold text-indigo-700">
                                  {summary
                                    .overtimeHours
                                    ?.formatted ||
                                    formatMinutes(
                                      summary
                                        .totalOvertimeMinutes
                                    )}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                              onClick={() =>
                                toggleExpandedStaff(
                                  staff._id
                                )
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp
                                  size={16}
                                />
                              ) : (
                                <ChevronDown
                                  size={16}
                                />
                              )}

                              {isExpanded
                                ? "Hide Daily Records"
                                : `View ${records.length} Daily Records`}
                            </button>

                            {isExpanded && (
                              <div className="mt-4 space-y-3">
                                {records.length ===
                                0 ? (
                                  <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-400">
                                    No daily records
                                    available.
                                  </p>
                                ) : (
                                  records.map(
                                    (
                                      record
                                    ) => (
                                      <div
                                        key={
                                          record._id
                                        }
                                        className="rounded-xl border border-slate-100 p-3"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <p className="text-sm font-bold text-slate-700">
                                              {formatDate(
                                                record.attendanceDate
                                              )}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                              {record.checkInTime ||
                                                "—"}
                                              {" — "}
                                              {record.checkOutTime ||
                                                "—"}
                                            </p>
                                          </div>

                                          <Badge
                                            tone={getStatusTone(
                                              record.status
                                            )}
                                          >
                                            {formatLabel(
                                              record.status
                                            )}
                                          </Badge>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between text-xs">
                                          <span className="text-slate-500">
                                            Working:{" "}
                                            <strong className="text-slate-700">
                                              {record
                                                .workingHours
                                                ?.formatted ||
                                                formatMinutes(
                                                  record
                                                    .workingMinutes
                                                )}
                                            </strong>
                                          </span>

                                          <span className="text-slate-500">
                                            Overtime:{" "}
                                            <strong className="text-indigo-700">
                                              {formatMinutes(
                                                record
                                                  .overtimeMinutes
                                              )}
                                            </strong>
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  )
                                )}
                              </div>
                            )}
                          </article>
                        );
                      }
                    )
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

export default StaffAttendanceReport;