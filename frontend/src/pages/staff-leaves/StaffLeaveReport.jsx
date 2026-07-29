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
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  FileBarChart,
  FileText,
  Filter,
  Landmark,
  Printer,
  RefreshCcw,
  RotateCcw,
  Search,
  Users,
  WalletCards,
  X,
  XCircle
} from "lucide-react";

import api from "../../api/axios";

import {
  getStaffLeaveReport
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

const createInitialFilters =
  () => ({
    schoolId: "",
    staffId: "",
    leaveYear:
      String(CURRENT_YEAR),
    fromDate: "",
    toDate: "",
    leaveType: "",
    status: "",
    department: "",
    payType: ""
  });

const createEmptyReport =
  () => ({
    totalRequests: 0,
    totalDays: 0,

    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    cancelledRequests: 0,

    approvedDays: 0,
    paidDays: 0,
    unpaidDays: 0,
    partialPaidDays: 0,

    byStatus: {},
    byLeaveType: {},
    byDepartment: {},
    byPayType: {},
    monthlyTrend: []
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

const formatNumber = (
  value
) => {
  return safeNumber(
    value
  ).toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 2
    }
  );
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

const formatMonth = (
  value
) => {
  if (!value) {
    return "—";
  }

  const [
    year,
    month
  ] = String(value).split(
    "-"
  );

  const date =
    new Date(
      Number(year),
      Number(month) - 1,
      1
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      year: "numeric"
    }
  ).format(date);
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

const getObjectId = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "object"
  ) {
    return (
      value._id ||
      value.id ||
      ""
    );
  }

  return String(value);
};

const getLeaveTypeLabel = (
  value
) => {
  return (
    LEAVE_TYPES.find(
      (item) =>
        item.value === value
    )?.label ||
    formatLabel(value)
  );
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

const extractStaffRecords = (
  response
) => {
  const data =
    response?.data || {};

  return (
    [
      data.staff,
      data.staffMembers,
      data.records,
      data.results,
      data.data
    ].find(
      Array.isArray
    ) || []
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
  const toneClasses = {
    brand:
      "bg-brand-50 text-brand-700",

    success:
      "bg-emerald-50 text-emerald-700",

    warning:
      "bg-amber-50 text-amber-700",

    danger:
      "bg-rose-50 text-rose-700",

    violet:
      "bg-violet-50 text-violet-700",

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

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {description}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            toneClasses[tone] ||
            toneClasses.brand
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
| Section Header
|--------------------------------------------------------------------------
*/

const SectionHeader = ({
  title,
  description,
  icon: Icon
}) => {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon size={18} />
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
  );
};

/*
|--------------------------------------------------------------------------
| Horizontal Bar
|--------------------------------------------------------------------------
*/

const HorizontalBar = ({
  label,
  value,
  secondaryValue,
  maximum,
  suffix = "",
  tone = "brand"
}) => {
  const percentage =
    maximum > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (
              safeNumber(value) /
              maximum
            ) * 100
          )
        )
      : 0;

  const toneClasses = {
    brand:
      "bg-brand-600",

    success:
      "bg-emerald-600",

    warning:
      "bg-amber-500",

    danger:
      "bg-rose-600",

    violet:
      "bg-violet-600",

    slate:
      "bg-slate-500"
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-700">
            {label}
          </p>

          {secondaryValue !==
            undefined && (
            <p className="mt-0.5 text-[10px] text-slate-400">
              {formatNumber(
                secondaryValue
              )} request(s)
            </p>
          )}
        </div>

        <p className="shrink-0 text-xs font-bold text-slate-700">
          {formatNumber(value)}
          {suffix}
        </p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${
            toneClasses[tone] ||
            toneClasses.brand
          }`}
          style={{
            width: `${percentage}%`
          }}
        />
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Empty Report
|--------------------------------------------------------------------------
*/

const EmptyReport = () => {
  return (
    <div className="card flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <FileBarChart
          size={26}
        />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-700">
        No Leave Report Data
      </h3>

      <p className="mt-2 max-w-md text-xs leading-5 text-slate-400">
        No staff leave records matched
        the selected report filters.
      </p>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Staff Leave Report Page
|--------------------------------------------------------------------------
*/

export const StaffLeaveReport =
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

    const canView =
      [
        "super_admin",
        "principal",
        "accountant"
      ].includes(
        userRole
      );

    const assignedSchoolId =
      getObjectId(
        user?.schoolId ||
        user?.school
      );

    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */

    const [
      filters,
      setFilters
    ] = useState(
      createInitialFilters
    );

    const [
      appliedFilters,
      setAppliedFilters
    ] = useState(
      createInitialFilters
    );

    const [
      report,
      setReport
    ] = useState(
      createEmptyReport
    );

    const [
      schools,
      setSchools
    ] = useState([]);

    const [
      staffRecords,
      setStaffRecords
    ] = useState([]);

    const [
      schoolsLoading,
      setSchoolsLoading
    ] = useState(false);

    const [
      staffLoading,
      setStaffLoading
    ] = useState(false);

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
    | Permission Redirect
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (!canView) {
        navigate(
          "/dashboard",
          {
            replace: true
          }
        );
      }
    }, [
      canView,
      navigate
    ]);

    /*
    |--------------------------------------------------------------------------
    | Principal School
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (
        !isSuperAdmin &&
        assignedSchoolId
      ) {
        setFilters(
          (current) => ({
            ...current,

            schoolId:
              assignedSchoolId
          })
        );

        setAppliedFilters(
          (current) => ({
            ...current,

            schoolId:
              assignedSchoolId
          })
        );
      }
    }, [
      isSuperAdmin,
      assignedSchoolId
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
    | Load Staff
    |--------------------------------------------------------------------------
    */

    const loadStaffRecords =
      useCallback(
        async (
          schoolId
        ) => {
          if (
            isSuperAdmin &&
            !schoolId
          ) {
            setStaffRecords(
              []
            );

            return;
          }

          setStaffLoading(
            true
          );

          try {
            const response =
              await api.get(
                "/staff",
                {
                  params: {
                    schoolId:
                      isSuperAdmin
                        ? schoolId
                        : undefined,

                    status:
                      "active",

                    limit: 100
                  }
                }
              );

            setStaffRecords(
              extractStaffRecords(
                response
              ).filter(
                (staff) =>
                  staff.isDeleted !==
                  true
              )
            );
          } catch (
            requestError
          ) {
            setStaffRecords(
              []
            );

            setError(
              getErrorMessage(
                requestError,
                "Staff records could not be loaded."
              )
            );
          } finally {
            setStaffLoading(
              false
            );
          }
        },
        [
          isSuperAdmin
        ]
      );

    useEffect(() => {
      const schoolId =
        isSuperAdmin
          ? filters.schoolId
          : assignedSchoolId;

      if (
        schoolId ||
        !isSuperAdmin
      ) {
        loadStaffRecords(
          schoolId
        );
      } else {
        setStaffRecords(
          []
        );
      }
    }, [
      filters.schoolId,
      isSuperAdmin,
      assignedSchoolId,
      loadStaffRecords
    ]);

    /*
    |--------------------------------------------------------------------------
    | Report Query
    |--------------------------------------------------------------------------
    */

    const reportQuery =
      useMemo(
        () => ({
          schoolId:
            isSuperAdmin
              ? appliedFilters
                  .schoolId
              : undefined,

          staffId:
            appliedFilters
              .staffId,

          leaveYear:
            appliedFilters
              .leaveYear,

          fromDate:
            appliedFilters
              .fromDate,

          toDate:
            appliedFilters
              .toDate,

          leaveType:
            appliedFilters
              .leaveType,

          status:
            appliedFilters
              .status,

          department:
            String(
              appliedFilters
                .department ||
                ""
            ).trim(),

          payType:
            appliedFilters
              .payType
        }),
        [
          isSuperAdmin,
          appliedFilters
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Load Report
    |--------------------------------------------------------------------------
    */

    const loadReport =
      useCallback(
        async (
          showMainLoader =
            false
        ) => {
          if (!canView) {
            return;
          }

          if (showMainLoader) {
            setLoading(true);
          }

          setError("");

          try {
            const response =
              await getStaffLeaveReport(
                reportQuery
              );

            const reportData =
              response?.report ||
              response?.data
                ?.report ||
              createEmptyReport();

            setReport({
              totalRequests:
                safeNumber(
                  reportData
                    .totalRequests
                ),

              totalDays:
                safeNumber(
                  reportData
                    .totalDays
                ),

              pendingRequests:
                safeNumber(
                  reportData
                    .pendingRequests
                ),

              approvedRequests:
                safeNumber(
                  reportData
                    .approvedRequests
                ),

              rejectedRequests:
                safeNumber(
                  reportData
                    .rejectedRequests
                ),

              cancelledRequests:
                safeNumber(
                  reportData
                    .cancelledRequests
                ),

              approvedDays:
                safeNumber(
                  reportData
                    .approvedDays
                ),

              paidDays:
                safeNumber(
                  reportData
                    .paidDays
                ),

              unpaidDays:
                safeNumber(
                  reportData
                    .unpaidDays
                ),

              partialPaidDays:
                safeNumber(
                  reportData
                    .partialPaidDays
                ),

              byStatus:
                reportData
                  .byStatus ||
                {},

              byLeaveType:
                reportData
                  .byLeaveType ||
                {},

              byDepartment:
                reportData
                  .byDepartment ||
                {},

              byPayType:
                reportData
                  .byPayType ||
                {},

              monthlyTrend:
                Array.isArray(
                  reportData
                    .monthlyTrend
                )
                  ? reportData.monthlyTrend
                  : []
            });
          } catch (
            requestError
          ) {
            setReport(
              createEmptyReport()
            );

            setError(
              getErrorMessage(
                requestError,
                "Staff leave report could not be loaded."
              )
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        [
          canView,
          reportQuery
        ]
      );

    useEffect(() => {
      loadReport(true);
    }, [
      loadReport
    ]);

    /*
    |--------------------------------------------------------------------------
    | Filter Changes
    |--------------------------------------------------------------------------
    */

    const updateFilter = (
      fieldName,
      value
    ) => {
      setFilters(
        (current) => ({
          ...current,

          [fieldName]: value
        })
      );
    };

    const handleSchoolChange = (
      value
    ) => {
      setFilters(
        (current) => ({
          ...current,

          schoolId: value,
          staffId: ""
        })
      );
    };

    const handleApplyFilters =
      () => {
        if (
          filters.fromDate &&
          filters.toDate &&
          filters.toDate <
            filters.fromDate
        ) {
          setError(
            "To date cannot be earlier than from date."
          );

          return;
        }

        setError("");

        setAppliedFilters({
          ...filters,

          schoolId:
            isSuperAdmin
              ? filters.schoolId
              : assignedSchoolId
        });
      };

    const handleResetFilters =
      () => {
        const initialFilters =
          createInitialFilters();

        const resetFilters = {
          ...initialFilters,

          schoolId:
            isSuperAdmin
              ? ""
              : assignedSchoolId
        };

        setFilters(
          resetFilters
        );

        setAppliedFilters(
          resetFilters
        );

        setError("");
      };

    const handleRefresh =
      () => {
        if (refreshing) {
          return;
        }

        setRefreshing(true);

        loadReport(false);
      };

    /*
    |--------------------------------------------------------------------------
    | Derived Report Data
    |--------------------------------------------------------------------------
    */

    const leaveTypeRows =
      useMemo(() => {
        return Object.entries(
          report.byLeaveType ||
            {}
        )
          .map(
            ([
              leaveType,
              values
            ]) => ({
              leaveType,

              label:
                getLeaveTypeLabel(
                  leaveType
                ),

              requests:
                safeNumber(
                  values?.requests
                ),

              days:
                safeNumber(
                  values?.days
                )
            })
          )
          .sort(
            (
              first,
              second
            ) =>
              second.days -
              first.days
          );
      }, [
        report.byLeaveType
      ]);

    const departmentRows =
      useMemo(() => {
        return Object.entries(
          report.byDepartment ||
            {}
        )
          .map(
            ([
              department,
              values
            ]) => ({
              department,

              requests:
                safeNumber(
                  values?.requests
                ),

              days:
                safeNumber(
                  values?.days
                )
            })
          )
          .sort(
            (
              first,
              second
            ) =>
              second.days -
              first.days
          );
      }, [
        report.byDepartment
      ]);

    const payTypeRows =
      useMemo(() => {
        return Object.entries(
          report.byPayType ||
            {}
        )
          .map(
            ([
              payType,
              values
            ]) => ({
              payType,

              label:
                formatLabel(
                  payType
                ),

              requests:
                safeNumber(
                  values?.requests
                ),

              days:
                safeNumber(
                  values?.days
                )
            })
          )
          .sort(
            (
              first,
              second
            ) =>
              second.days -
              first.days
          );
      }, [
        report.byPayType
      ]);

    const monthlyTrend =
      useMemo(() => {
        return [
          ...(
            report.monthlyTrend ||
            []
          )
        ].sort(
          (
            first,
            second
          ) =>
            String(
              first.month
            ).localeCompare(
              String(
                second.month
              )
            )
        );
      }, [
        report.monthlyTrend
      ]);

    const maximumLeaveTypeDays =
      Math.max(
        1,
        ...leaveTypeRows.map(
          (item) =>
            item.days
        )
      );

    const maximumDepartmentDays =
      Math.max(
        1,
        ...departmentRows.map(
          (item) =>
            item.days
        )
      );

    const maximumPayTypeDays =
      Math.max(
        1,
        ...payTypeRows.map(
          (item) =>
            item.days
        )
      );

    const maximumMonthlyDays =
      Math.max(
        1,
        ...monthlyTrend.map(
          (item) =>
            safeNumber(
              item.days
            )
        )
      );

    const hasReportData =
      report.totalRequests > 0;

    /*
    |--------------------------------------------------------------------------
    | Selected Labels
    |--------------------------------------------------------------------------
    */

    const selectedSchool =
      schools.find(
        (school) =>
          String(
            school._id
          ) ===
          String(
            appliedFilters
              .schoolId
          )
      );

    const selectedStaff =
      staffRecords.find(
        (staff) =>
          String(
            staff._id
          ) ===
          String(
            appliedFilters
              .staffId
          )
      );

    const reportPeriodLabel =
      appliedFilters.fromDate ||
      appliedFilters.toDate
        ? `${formatDate(
            appliedFilters.fromDate
          )} – ${formatDate(
            appliedFilters.toDate
          )}`
        : appliedFilters.leaveYear
          ? `Year ${appliedFilters.leaveYear}`
          : "All Periods";

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
    | CSV Export
    |--------------------------------------------------------------------------
    */

    const escapeCsvValue = (
      value
    ) => {
      const stringValue =
        String(
          value ?? ""
        );

      if (
        stringValue.includes(
          ","
        ) ||
        stringValue.includes(
          "\""
        ) ||
        stringValue.includes(
          "\n"
        )
      ) {
        return `"${stringValue.replaceAll(
          "\"",
          "\"\""
        )}"`;
      }

      return stringValue;
    };

    const handleDownloadCsv =
      () => {
        const rows = [
          [
            "Staff Leave Report"
          ],

          [
            "Report Period",
            reportPeriodLabel
          ],

          [
            "School",
            selectedSchool
              ?.schoolName ||
              selectedSchool
                ?.name ||
              (
                isSuperAdmin
                  ? "All Schools"
                  : user?.schoolId
                      ?.schoolName ||
                    user?.school
                      ?.schoolName ||
                    "Assigned School"
              )
          ],

          [
            "Staff",
            selectedStaff?.name ||
              "All Staff"
          ],

          [],

          [
            "Summary",
            "Value"
          ],

          [
            "Total Requests",
            report.totalRequests
          ],

          [
            "Total Leave Days",
            report.totalDays
          ],

          [
            "Pending Requests",
            report.pendingRequests
          ],

          [
            "Approved Requests",
            report.approvedRequests
          ],

          [
            "Rejected Requests",
            report.rejectedRequests
          ],

          [
            "Cancelled Requests",
            report.cancelledRequests
          ],

          [
            "Approved Days",
            report.approvedDays
          ],

          [
            "Paid Days",
            report.paidDays
          ],

          [
            "Unpaid Days",
            report.unpaidDays
          ],

          [
            "Partially Paid Days",
            report.partialPaidDays
          ],

          [],

          [
            "Leave Type",
            "Requests",
            "Days"
          ],

          ...leaveTypeRows.map(
            (item) => [
              item.label,
              item.requests,
              item.days
            ]
          ),

          [],

          [
            "Department",
            "Requests",
            "Days"
          ],

          ...departmentRows.map(
            (item) => [
              item.department,
              item.requests,
              item.days
            ]
          ),

          [],

          [
            "Payroll Type",
            "Requests",
            "Days"
          ],

          ...payTypeRows.map(
            (item) => [
              item.label,
              item.requests,
              item.days
            ]
          ),

          [],

          [
            "Month",
            "Requests",
            "Days",
            "Approved",
            "Pending",
            "Rejected",
            "Cancelled"
          ],

          ...monthlyTrend.map(
            (item) => [
              formatMonth(
                item.month
              ),

              safeNumber(
                item.requests
              ),

              safeNumber(
                item.days
              ),

              safeNumber(
                item.approved
              ),

              safeNumber(
                item.pending
              ),

              safeNumber(
                item.rejected
              ),

              safeNumber(
                item.cancelled
              )
            ]
          )
        ];

        const csvContent =
          rows
            .map(
              (row) =>
                row
                  .map(
                    escapeCsvValue
                  )
                  .join(",")
            )
            .join("\n");

        const blob =
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

        const url =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href = url;

        link.download =
          `staff-leave-report-${
            appliedFilters
              .leaveYear ||
            "all"
          }.csv`;

        document.body.appendChild(
          link
        );

        link.click();
        link.remove();

        URL.revokeObjectURL(
          url
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Loading
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
              Generating staff leave
              report...
            </p>
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
        <style>
          {`
            @page {
              size: A4 landscape;
              margin: 10mm;
            }

            @media print {
              body {
                background: #ffffff !important;
              }

              body * {
                visibility: hidden;
              }

              .leave-report-print,
              .leave-report-print * {
                visibility: visible;
              }

              .leave-report-print {
                position: absolute;
                inset: 0;
                width: 100%;
              }

              .no-print {
                display: none !important;
              }

              .card {
                box-shadow: none !important;
              }

              .print-break-inside-avoid {
                break-inside: avoid;
                page-break-inside: avoid;
              }

              .print-colors {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}
        </style>

        {/*
        |--------------------------------------------------------------------------
        | Header
        |--------------------------------------------------------------------------
        */}

        <div className="no-print flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <FileBarChart
                  size={21}
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                  Staff Leave Report
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
                  Analyze staff leave
                  requests, duration,
                  departments and payroll
                  impact.
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
              disabled={
                !hasReportData
              }
              onClick={
                handleDownloadCsv
              }
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Download
                size={16}
              />

              Export CSV
            </button>

            <button
              type="button"
              disabled={
                !hasReportData
              }
              onClick={
                handlePrint
              }
              className="btn-primary inline-flex items-center gap-2"
            >
              <Printer
                size={16}
              />

              Print Report
            </button>
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Error
        |--------------------------------------------------------------------------
        */}

        {error && (
          <div className="no-print flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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

        {/*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */}

        <section className="no-print card p-5">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Filter size={18} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Report Filters
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Select a school, staff
                member, year or custom date
                range.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {isSuperAdmin ? (
              <div>
                <label className="field-label">
                  School
                </label>

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
                    handleSchoolChange(
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
              </div>
            ) : (
              <div>
                <label className="field-label">
                  School
                </label>

                <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Landmark
                    size={16}
                    className="text-slate-400"
                  />

                  <span className="truncate text-sm font-semibold text-slate-700">
                    {user?.schoolId
                      ?.schoolName ||
                      user?.school
                        ?.schoolName ||
                      "Assigned School"}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="field-label">
                Staff Member
              </label>

              <select
                value={
                  filters.staffId
                }
                disabled={
                  staffLoading ||
                  (
                    isSuperAdmin &&
                    !filters.schoolId
                  )
                }
                className="field-select"
                onChange={(
                  event
                ) =>
                  updateFilter(
                    "staffId",
                    event.target
                      .value
                  )
                }
              >
                <option value="">
                  {isSuperAdmin &&
                  !filters.schoolId
                    ? "Select school first"
                    : staffLoading
                      ? "Loading staff..."
                      : "All staff members"}
                </option>

                {staffRecords.map(
                  (staff) => (
                    <option
                      key={
                        staff._id
                      }
                      value={
                        staff._id
                      }
                    >
                      {staff.name ||
                        "Unnamed Staff"}

                      {staff.employeeId
                        ? ` (${staff.employeeId})`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="field-label">
                Leave Year
              </label>

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
                    event.target
                      .value
                  )
                }
              />
            </div>

            <div>
              <label className="field-label">
                Leave Type
              </label>

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
            </div>

            <div>
              <label className="field-label">
                Status
              </label>

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
            </div>

            <div>
              <label className="field-label">
                Payroll Type
              </label>

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
            </div>

            <div>
              <label className="field-label">
                Department
              </label>

              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={
                    filters.department
                  }
                  placeholder="Department"
                  className="field-input pl-9"
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
              </div>
            </div>

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
                    event.target
                      .value
                  )
                }
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={
                handleResetFilters
              }
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              <RotateCcw
                size={16}
              />

              Reset Filters
            </button>

            <button
              type="button"
              onClick={
                handleApplyFilters
              }
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <Filter size={16} />

              Generate Report
            </button>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Printable Report
        |--------------------------------------------------------------------------
        */}

        <div className="leave-report-print space-y-5">
          {/*
          |--------------------------------------------------------------------------
          | Report Heading
          |--------------------------------------------------------------------------
          */}

          <section className="print-colors overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="bg-slate-900 px-5 py-5 text-white sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Staff Leave Analysis
                  </p>

                  <h2 className="mt-2 text-xl font-bold">
                    Staff Leave Report
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    {selectedSchool
                      ?.schoolName ||
                      selectedSchool
                        ?.name ||
                      (
                        isSuperAdmin
                          ? "All Schools"
                          : user?.schoolId
                              ?.schoolName ||
                            user?.school
                              ?.schoolName ||
                            "Assigned School"
                      )}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-sm font-bold">
                    {reportPeriodLabel}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {selectedStaff?.name ||
                      "All Staff Members"}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-500">
                    Generated{" "}
                    {formatDate(
                      new Date()
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Leave Type
                </p>

                <p className="mt-1 text-xs font-bold text-slate-700">
                  {appliedFilters
                    .leaveType
                    ? getLeaveTypeLabel(
                        appliedFilters
                          .leaveType
                      )
                    : "All Leave Types"}
                </p>
              </div>

              <div className="bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </p>

                <p className="mt-1 text-xs font-bold text-slate-700">
                  {appliedFilters.status
                    ? formatLabel(
                        appliedFilters.status
                      )
                    : "All Statuses"}
                </p>
              </div>

              <div className="bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Payroll Type
                </p>

                <p className="mt-1 text-xs font-bold text-slate-700">
                  {appliedFilters.payType
                    ? formatLabel(
                        appliedFilters.payType
                      )
                    : "All Payroll Types"}
                </p>
              </div>

              <div className="bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Department
                </p>

                <p className="mt-1 text-xs font-bold text-slate-700">
                  {appliedFilters.department ||
                    "All Departments"}
                </p>
              </div>
            </div>
          </section>

          {!hasReportData ? (
            <EmptyReport />
          ) : (
            <>
              {/*
              |--------------------------------------------------------------------------
              | Summary Cards
              |--------------------------------------------------------------------------
              */}

              <div className="print-break-inside-avoid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label="Total Requests"
                  value={
                    formatNumber(
                      report.totalRequests
                    )
                  }
                  description={`${formatNumber(
                    report.totalDays
                  )} total leave day(s)`}
                  icon={FileText}
                />

                <SummaryCard
                  label="Approved Requests"
                  value={
                    formatNumber(
                      report.approvedRequests
                    )
                  }
                  description={`${formatNumber(
                    report.approvedDays
                  )} approved leave day(s)`}
                  icon={
                    CheckCircle2
                  }
                  tone="success"
                />

                <SummaryCard
                  label="Pending Requests"
                  value={
                    formatNumber(
                      report.pendingRequests
                    )
                  }
                  description="Waiting for approval"
                  icon={Clock3}
                  tone="warning"
                />

                <SummaryCard
                  label="Unpaid Days"
                  value={
                    formatNumber(
                      report.unpaidDays
                    )
                  }
                  description={`${formatNumber(
                    report.partialPaidDays
                  )} partially paid day(s)`}
                  icon={
                    CircleDollarSign
                  }
                  tone="danger"
                />
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Status and Payroll Summary
              |--------------------------------------------------------------------------
              */}

              <section className="print-break-inside-avoid grid gap-5 lg:grid-cols-2">
                <div className="card p-5">
                  <SectionHeader
                    icon={FileBarChart}
                    title="Request Status Overview"
                    description="Distribution of leave requests by workflow status."
                  />

                  <div className="space-y-5">
                    <HorizontalBar
                      label="Approved"
                      value={
                        report.approvedRequests
                      }
                      maximum={
                        report.totalRequests
                      }
                      tone="success"
                    />

                    <HorizontalBar
                      label="Pending"
                      value={
                        report.pendingRequests
                      }
                      maximum={
                        report.totalRequests
                      }
                      tone="warning"
                    />

                    <HorizontalBar
                      label="Rejected"
                      value={
                        report.rejectedRequests
                      }
                      maximum={
                        report.totalRequests
                      }
                      tone="danger"
                    />

                    <HorizontalBar
                      label="Cancelled"
                      value={
                        report.cancelledRequests
                      }
                      maximum={
                        report.totalRequests
                      }
                      tone="slate"
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500">
                        Rejected
                      </p>

                      <p className="mt-1 text-xl font-bold text-rose-700">
                        {formatNumber(
                          report.rejectedRequests
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Cancelled
                      </p>

                      <p className="mt-1 text-xl font-bold text-slate-700">
                        {formatNumber(
                          report.cancelledRequests
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card p-5">
                  <SectionHeader
                    icon={
                      CircleDollarSign
                    }
                    title="Payroll Impact"
                    description="Approved leave days grouped by payment treatment."
                  />

                  <div className="space-y-5">
                    <HorizontalBar
                      label="Paid Leave Days"
                      value={
                        report.paidDays
                      }
                      maximum={
                        Math.max(
                          1,
                          report.approvedDays
                        )
                      }
                      tone="success"
                      suffix=" days"
                    />

                    <HorizontalBar
                      label="Unpaid Leave Days"
                      value={
                        report.unpaidDays
                      }
                      maximum={
                        Math.max(
                          1,
                          report.approvedDays
                        )
                      }
                      tone="danger"
                      suffix=" days"
                    />

                    <HorizontalBar
                      label="Partially Paid Days"
                      value={
                        report.partialPaidDays
                      }
                      maximum={
                        Math.max(
                          1,
                          report.approvedDays
                        )
                      }
                      tone="violet"
                      suffix=" days"
                    />
                  </div>

                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Approved Leave Days
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-800">
                          {formatNumber(
                            report.approvedDays
                          )}
                        </p>
                      </div>

                      <WalletCards
                        size={26}
                        className="text-slate-300"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Leave Type Breakdown
              |--------------------------------------------------------------------------
              */}

              <section className="print-break-inside-avoid card p-5">
                <SectionHeader
                  icon={CalendarDays}
                  title="Leave Type Breakdown"
                  description="Requests and total leave days for each leave category."
                />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <div className="space-y-5">
                    {leaveTypeRows.map(
                      (item) => (
                        <HorizontalBar
                          key={
                            item.leaveType
                          }
                          label={
                            item.label
                          }
                          value={
                            item.days
                          }
                          secondaryValue={
                            item.requests
                          }
                          maximum={
                            maximumLeaveTypeDays
                          }
                          suffix=" days"
                        />
                      )
                    )}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Leave Type
                          </th>

                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Requests
                          </th>

                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Days
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {leaveTypeRows.map(
                          (item) => (
                            <tr
                              key={
                                item.leaveType
                              }
                              className="border-t border-slate-100"
                            >
                              <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                                {
                                  item.label
                                }
                              </td>

                              <td className="px-4 py-3 text-right text-xs text-slate-600">
                                {formatNumber(
                                  item.requests
                                )}
                              </td>

                              <td className="px-4 py-3 text-right text-xs font-bold text-slate-700">
                                {formatNumber(
                                  item.days
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Department Breakdown
              |--------------------------------------------------------------------------
              */}

              <section className="print-break-inside-avoid card p-5">
                <SectionHeader
                  icon={Building2}
                  title="Department Breakdown"
                  description="Leave utilization by staff department."
                />

                {departmentRows.length >
                0 ? (
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div className="space-y-5">
                      {departmentRows.map(
                        (item) => (
                          <HorizontalBar
                            key={
                              item.department
                            }
                            label={
                              item.department
                            }
                            value={
                              item.days
                            }
                            secondaryValue={
                              item.requests
                            }
                            maximum={
                              maximumDepartmentDays
                            }
                            suffix=" days"
                            tone="violet"
                          />
                        )
                      )}
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Department
                            </th>

                            <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Requests
                            </th>

                            <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Days
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {departmentRows.map(
                            (item) => (
                              <tr
                                key={
                                  item.department
                                }
                                className="border-t border-slate-100"
                              >
                                <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                                  {
                                    item.department
                                  }
                                </td>

                                <td className="px-4 py-3 text-right text-xs text-slate-600">
                                  {formatNumber(
                                    item.requests
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right text-xs font-bold text-slate-700">
                                  {formatNumber(
                                    item.days
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-400">
                    No department breakdown
                    is available.
                  </p>
                )}
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Payroll Type Breakdown
              |--------------------------------------------------------------------------
              */}

              <section className="print-break-inside-avoid card p-5">
                <SectionHeader
                  icon={
                    CircleDollarSign
                  }
                  title="Payroll Treatment Breakdown"
                  description="Leave requests and days grouped by payroll treatment."
                />

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-5">
                    {payTypeRows.map(
                      (item) => (
                        <HorizontalBar
                          key={
                            item.payType
                          }
                          label={
                            item.label
                          }
                          value={
                            item.days
                          }
                          secondaryValue={
                            item.requests
                          }
                          maximum={
                            maximumPayTypeDays
                          }
                          suffix=" days"
                          tone={
                            item.payType ===
                            "unpaid"
                              ? "danger"
                              : item.payType ===
                                  "partial_paid"
                                ? "violet"
                                : "success"
                          }
                        />
                      )
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                        Paid Days
                      </p>

                      <p className="mt-2 text-2xl font-bold text-emerald-800">
                        {formatNumber(
                          report.paidDays
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                        Unpaid Days
                      </p>

                      <p className="mt-2 text-2xl font-bold text-rose-700">
                        {formatNumber(
                          report.unpaidDays
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">
                        Partial Days
                      </p>

                      <p className="mt-2 text-2xl font-bold text-violet-700">
                        {formatNumber(
                          report.partialPaidDays
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Monthly Trend
              |--------------------------------------------------------------------------
              */}

              <section className="card p-5">
                <SectionHeader
                  icon={BarChart3}
                  title="Monthly Leave Trend"
                  description="Monthly request volume, leave days and workflow results."
                />

                {monthlyTrend.length >
                0 ? (
                  <>
                    <div className="print-break-inside-avoid mb-6 space-y-5">
                      {monthlyTrend.map(
                        (item) => (
                          <HorizontalBar
                            key={
                              item.month
                            }
                            label={
                              formatMonth(
                                item.month
                              )
                            }
                            value={
                              safeNumber(
                                item.days
                              )
                            }
                            secondaryValue={
                              safeNumber(
                                item.requests
                              )
                            }
                            maximum={
                              maximumMonthlyDays
                            }
                            suffix=" days"
                            tone="brand"
                          />
                        )
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Month
                            </th>

                            <th className="whitespace-nowrap px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Requests
                            </th>

                            <th className="whitespace-nowrap px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Days
                            </th>

                            <th className="whitespace-nowrap px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Approved
                            </th>

                            <th className="whitespace-nowrap px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Pending
                            </th>

                            <th className="whitespace-nowrap px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Rejected
                            </th>

                            <th className="whitespace-nowrap px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Cancelled
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {monthlyTrend.map(
                            (item) => (
                              <tr
                                key={
                                  item.month
                                }
                                className="border-t border-slate-100"
                              >
                                <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-700">
                                  {formatMonth(
                                    item.month
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right text-xs text-slate-600">
                                  {formatNumber(
                                    item.requests
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right text-xs font-bold text-slate-700">
                                  {formatNumber(
                                    item.days
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right text-xs font-semibold text-emerald-700">
                                  {formatNumber(
                                    item.approved
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right text-xs font-semibold text-amber-700">
                                  {formatNumber(
                                    item.pending
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right text-xs font-semibold text-rose-700">
                                  {formatNumber(
                                    item.rejected
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                                  {formatNumber(
                                    item.cancelled
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-400">
                    No monthly trend is
                    available for the
                    selected filters.
                  </p>
                )}
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Report Footer
              |--------------------------------------------------------------------------
              */}

              <section className="print-break-inside-avoid rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-center">
                <p className="text-[10px] leading-5 text-slate-400">
                  This report was generated
                  electronically by the
                  School / Madrasa
                  Management System.
                  Figures reflect the
                  selected filters and
                  current staff leave
                  records.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    );
  };

export default StaffLeaveReport;