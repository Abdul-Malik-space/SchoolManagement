import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileWarning,
  GraduationCap,
  Grid3X3,
  Loader2,
  Printer,
  RefreshCw,
  School,
  Settings2,
  ShieldAlert,
  UserRound,
  Users,
  X
} from "lucide-react";

import {
  useNavigate
} from "react-router-dom";

import api from "../../api/axios";

import {
  getTimetableConfigs
} from "../../api/timetableConfigs";

import {
  getTimetableReport
} from "../../api/timetables";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const DAYS = [
  {
    value: "monday",
    label: "Monday"
  },
  {
    value: "tuesday",
    label: "Tuesday"
  },
  {
    value: "wednesday",
    label: "Wednesday"
  },
  {
    value: "thursday",
    label: "Thursday"
  },
  {
    value: "friday",
    label: "Friday"
  },
  {
    value: "saturday",
    label: "Saturday"
  },
  {
    value: "sunday",
    label: "Sunday"
  }
];

const VIEW_ROLES = [
  "super_admin",
  "principal",
  "teacher"
];

const MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

const BREAKDOWN_TABS = [
  {
    value: "day",
    label: "By Day"
  },
  {
    value: "class",
    label: "By Class"
  },
  {
    value: "teacher",
    label: "By Teacher"
  },
  {
    value: "subject",
    label: "By Subject"
  }
];

const ISSUE_TABS = [
  {
    value: "teacher",
    label: "Unassigned Teachers"
  },
  {
    value: "subject",
    label: "Unassigned Subjects"
  },
  {
    value: "room",
    label: "Missing Rooms"
  },
  {
    value: "overload",
    label: "Teacher Overload"
  }
];

/*
|--------------------------------------------------------------------------
| Generic Helpers
|--------------------------------------------------------------------------
*/

const unwrapResponse = (
  response
) => {
  return response?.data ?? response;
};

const getRecordId = (
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

const extractArray = (
  response,
  key
) => {
  const payload =
    unwrapResponse(
      response
    );

  const candidates = [
    payload?.[key],
    payload?.data?.[key],
    payload?.data,
    payload
  ];

  return (
    candidates.find(
      Array.isArray
    ) || []
  );
};

const extractConfigs = (
  response
) => {
  const candidates = [
    response?.timetableConfigs,
    response?.data
      ?.timetableConfigs,
    response?.data,
    response
  ];

  return (
    candidates.find(
      Array.isArray
    ) || []
  );
};

const normalizeRole = (
  role
) => {
  return String(
    role || ""
  ).toLowerCase();
};

const formatEnum = (
  value
) => {
  return String(
    value || ""
  )
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
};

const formatNumber = (
  value
) => {
  return new Intl.NumberFormat(
    "en-US"
  ).format(
    Number(value) || 0
  );
};

const formatMinutes = (
  value
) => {
  const totalMinutes =
    Number(value) || 0;

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
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

const getErrorMessage = (
  error,
  fallback
) => {
  const details =
    error?.response?.data
      ?.details;

  if (
    Array.isArray(details) &&
    details.length > 0
  ) {
    return details.join(" ");
  }

  return (
    error?.response?.data
      ?.message ||
    error?.message ||
    fallback
  );
};

/*
|--------------------------------------------------------------------------
| Entity Helpers
|--------------------------------------------------------------------------
*/

const getSchoolName = (
  school
) => {
  return (
    school?.schoolName ||
    school?.name ||
    school?.title ||
    "Unnamed School"
  );
};

const getClassName = (
  entry
) => {
  return (
    entry?.classSnapshot
      ?.name ||
    entry?.classId
      ?.className ||
    entry?.classId
      ?.name ||
    "Unnamed Class"
  );
};

const getSectionName = (
  entry
) => {
  return (
    entry?.sectionName ||
    entry?.classSnapshot
      ?.sectionName ||
    ""
  );
};

const getSubjectName = (
  entry
) => {
  return (
    entry?.subjectSnapshot
      ?.name ||
    entry?.subjectId
      ?.subjectName ||
    entry?.subjectId
      ?.name ||
    "Unassigned Subject"
  );
};

const getTeacherName = (
  entry
) => {
  return (
    entry?.teacherSnapshot
      ?.name ||
    entry?.teacherId
      ?.name ||
    entry?.teacherId
      ?.fullName ||
    [
      entry?.teacherId
        ?.firstName,
      entry?.teacherId
        ?.lastName
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unassigned Teacher"
  );
};

const getRoomName = (
  entry
) => {
  return (
    entry?.room?.name ||
    entry?.room?.code ||
    "No room assigned"
  );
};

const getPeriodLabel = (
  entry
) => {
  const periodName =
    entry?.periodSnapshot
      ?.name ||
    "Period";

  const startTime =
    entry?.periodSnapshot
      ?.startTime;

  const endTime =
    entry?.periodSnapshot
      ?.endTime;

  if (
    startTime &&
    endTime
  ) {
    return `${periodName} · ${startTime}–${endTime}`;
  }

  return periodName;
};

/*
|--------------------------------------------------------------------------
| Report Helpers
|--------------------------------------------------------------------------
*/

const normalizeReportResponse =
  (
    response
  ) => {
    const payload =
      response?.data &&
      !Array.isArray(
        response.data
      )
        ? {
            ...response,
            ...response.data
          }
        : response || {};

    return {
      timetableConfig:
        payload.timetableConfig ||
        null,

      rotation:
        payload.rotation || {
          code:
            "STANDARD",
          label:
            "Standard Week",
          availableWeeks: [
            {
              code:
                "STANDARD",
              label:
                "Standard Week"
            }
          ]
        },

      summary: {
        totalEntries: 0,
        scheduledEntries: 0,
        cancelledEntries: 0,
        classCount: 0,
        activeTeacherCount: 0,
        activeSubjectCount: 0,
        assignedTeacherCount: 0,
        assignedSubjectCount: 0,
        scheduledTeachingMinutes:
          0,
        totalSchedulableSlots:
          0,
        estimatedCapacity: 0,
        completionPercentage:
          0,
        unassignedTeacherCount:
          0,
        unassignedSubjectCount:
          0,
        missingRoomCount: 0,
        overloadedTeacherCount:
          0,
        ...(payload.summary ||
          {})
      },

      breakdowns: {
        byDay:
          payload.breakdowns
            ?.byDay || [],
        byTeacher:
          payload.breakdowns
            ?.byTeacher || [],
        byClass:
          payload.breakdowns
            ?.byClass || [],
        bySubject:
          payload.breakdowns
            ?.bySubject || []
      },

      teacherWorkload:
        Array.isArray(
          payload.teacherWorkload
        )
          ? payload.teacherWorkload
          : [],

      issues: {
        unassignedTeacherEntries:
          payload.issues
            ?.unassignedTeacherEntries ||
          [],

        unassignedSubjectEntries:
          payload.issues
            ?.unassignedSubjectEntries ||
          [],

        missingRoomEntries:
          payload.issues
            ?.missingRoomEntries ||
          [],

        overloadedTeachers:
          payload.issues
            ?.overloadedTeachers ||
          []
      }
    };
  };

const getBreakdownItems = (
  report,
  tab
) => {
  if (!report) {
    return [];
  }

  const map = {
    day:
      report.breakdowns
        .byDay,

    class:
      report.breakdowns
        .byClass,

    teacher:
      report.breakdowns
        .byTeacher,

    subject:
      report.breakdowns
        .bySubject
  };

  return map[tab] || [];
};

const getIssueItems = (
  report,
  tab
) => {
  if (!report) {
    return [];
  }

  const map = {
    teacher:
      report.issues
        .unassignedTeacherEntries,

    subject:
      report.issues
        .unassignedSubjectEntries,

    room:
      report.issues
        .missingRoomEntries,

    overload:
      report.issues
        .overloadedTeachers
  };

  return map[tab] || [];
};

/*
|--------------------------------------------------------------------------
| Reusable UI
|--------------------------------------------------------------------------
*/

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  description,
  alert = false,
  success = false
}) => {
  const iconClass =
    alert
      ? "bg-rose-50 text-rose-600"
      : success
        ? "bg-emerald-50 text-emerald-600"
        : "bg-brand-50 text-brand-700";

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p
            className={`mt-1 text-xl font-bold ${
              alert
                ? "text-rose-700"
                : success
                  ? "text-emerald-700"
                  : "text-slate-800"
            }`}
          >
            {value}
          </p>

          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({
  status,
  isActive
}) => {
  const normalized =
    String(
      status || "draft"
    ).toLowerCase();

  const classes = {
    draft:
      "bg-amber-50 text-amber-700 ring-amber-200",

    published:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",

    archived:
      "bg-slate-100 text-slate-600 ring-slate-200"
  };

  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${
          classes[
            normalized
          ] ||
          classes.draft
        }`}
      >
        {normalized}
      </span>

      {isActive && (
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
          Active
        </span>
      )}
    </div>
  );
};

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action
}) => {
  return (
    <div className="card px-6 py-14 text-center">
      <Icon
        size={40}
        className="mx-auto text-slate-300"
      />

      <h2 className="mt-4 text-lg font-bold text-slate-800">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {description}
      </p>

      {action}
    </div>
  );
};

const ProgressBar = ({
  value,
  maximum
}) => {
  const safeMaximum =
    Math.max(
      Number(maximum) ||
        0,
      1
    );

  const percentage =
    Math.min(
      100,
      Math.max(
        0,
        (
          Number(value) /
          safeMaximum
        ) *
          100
      )
    );

  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-brand-600 transition-all"
        style={{
          width:
            `${percentage}%`
        }}
      />
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Timetable Report
|--------------------------------------------------------------------------
*/

const TimetableReport =
  () => {
    const navigate =
      useNavigate();

    const {
      user
    } = useAuth();

    const userRole =
      normalizeRole(
        user?.role
      );

    const canView =
      VIEW_ROLES.includes(
        userRole
      );

    const canManage =
      MANAGEMENT_ROLES.includes(
        userRole
      );

    const assignedSchoolId =
      getRecordId(
        user?.schoolId ||
        user?.school
      );

    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */

    const [
      schools,
      setSchools
    ] = useState([]);

    const [
      selectedSchoolId,
      setSelectedSchoolId
    ] = useState(
      userRole ===
        "super_admin"
        ? ""
        : assignedSchoolId
    );

    const [
      configs,
      setConfigs
    ] = useState([]);

    const [
      selectedConfigId,
      setSelectedConfigId
    ] = useState("");

    const [
      selectedRotation,
      setSelectedRotation
    ] = useState(
      "STANDARD"
    );

    const [
      entryStatus,
      setEntryStatus
    ] = useState("");

    const [
      report,
      setReport
    ] = useState(null);

    const [
      breakdownTab,
      setBreakdownTab
    ] = useState(
      "day"
    );

    const [
      issueTab,
      setIssueTab
    ] = useState(
      "teacher"
    );

    const [
      loadingSchools,
      setLoadingSchools
    ] = useState(false);

    const [
      loadingConfigs,
      setLoadingConfigs
    ] = useState(false);

    const [
      loadingReport,
      setLoadingReport
    ] = useState(false);

    const [
      toast,
      setToast
    ] = useState(null);

    /*
    |--------------------------------------------------------------------------
    | Toast
    |--------------------------------------------------------------------------
    */

    const showToast =
      useCallback(
        (
          type,
          message
        ) => {
          setToast({
            type,
            message
          });

          window.setTimeout(
            () => {
              setToast(null);
            },
            4000
          );
        },
        []
      );

    /*
    |--------------------------------------------------------------------------
    | Load Schools
    |--------------------------------------------------------------------------
    */

    const loadSchools =
      useCallback(
        async () => {
          if (
            userRole !==
            "super_admin"
          ) {
            return;
          }

          setLoadingSchools(
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
              extractArray(
                response,
                "schools"
              )
            );
          } catch (error) {
            showToast(
              "error",
              getErrorMessage(
                error,
                "Schools could not be loaded."
              )
            );
          } finally {
            setLoadingSchools(
              false
            );
          }
        },
        [
          showToast,
          userRole
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Load Timetable Configurations
    |--------------------------------------------------------------------------
    */

    const loadConfigurations =
      useCallback(
        async () => {
          const schoolId =
            userRole ===
            "super_admin"
              ? selectedSchoolId
              : assignedSchoolId;

          if (!schoolId) {
            setConfigs([]);
            setSelectedConfigId(
              ""
            );

            return;
          }

          setLoadingConfigs(
            true
          );

          try {
            const response =
              await getTimetableConfigs({
                schoolId,
                limit: 100,
                sortBy:
                  "createdAt",
                sortOrder:
                  "desc"
              });

            const items =
              extractConfigs(
                response
              );

            setConfigs(items);

            setSelectedConfigId(
              (
                current
              ) => {
                if (
                  items.some(
                    (
                      item
                    ) =>
                      getRecordId(
                        item
                      ) ===
                      current
                  )
                ) {
                  return current;
                }

                return getRecordId(
                  items.find(
                    (
                      item
                    ) =>
                      item
                        .isActive
                  ) ||
                  items[0]
                );
              }
            );
          } catch (error) {
            showToast(
              "error",
              getErrorMessage(
                error,
                "Timetable configurations could not be loaded."
              )
            );
          } finally {
            setLoadingConfigs(
              false
            );
          }
        },
        [
          assignedSchoolId,
          selectedSchoolId,
          showToast,
          userRole
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
          options = {}
        ) => {
          const rotationCode =
            options.rotationCode ||
            selectedRotation;

          const status =
            options.entryStatus !==
            undefined
              ? options.entryStatus
              : entryStatus;

          if (
            !selectedConfigId
          ) {
            setReport(null);
            return;
          }

          setLoadingReport(
            true
          );

          try {
            const response =
              await getTimetableReport({
                timetableConfigId:
                  selectedConfigId,

                schoolId:
                  userRole ===
                    "super_admin"
                    ? selectedSchoolId
                    : undefined,

                rotationWeekCode:
                  rotationCode,

                entryStatus:
                  status ||
                  undefined
              });

            const normalized =
              normalizeReportResponse(
                response
              );

            setReport(
              normalized
            );

            setSelectedRotation(
              normalized.rotation
                ?.code ||
                rotationCode ||
                "STANDARD"
            );
          } catch (error) {
            showToast(
              "error",
              getErrorMessage(
                error,
                "Timetable report could not be generated."
              )
            );

            setReport(null);
          } finally {
            setLoadingReport(
              false
            );
          }
        },
        [
          entryStatus,
          selectedConfigId,
          selectedRotation,
          selectedSchoolId,
          showToast,
          userRole
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Effects
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      loadSchools();
    }, [
      loadSchools
    ]);

    useEffect(() => {
      if (
        userRole !==
          "super_admin" &&
        assignedSchoolId
      ) {
        setSelectedSchoolId(
          assignedSchoolId
        );
      }
    }, [
      assignedSchoolId,
      userRole
    ]);

    useEffect(() => {
      loadConfigurations();
    }, [
      loadConfigurations
    ]);

    useEffect(() => {
      if (
        selectedConfigId
      ) {
        setSelectedRotation(
          "STANDARD"
        );

        loadReport({
          rotationCode:
            "STANDARD"
        });
      } else {
        setReport(null);
      }
    }, [
      selectedConfigId
    ]);

    /*
    |--------------------------------------------------------------------------
    | Derived Data
    |--------------------------------------------------------------------------
    */

    const config =
      report
        ?.timetableConfig ||
      configs.find(
        (
          item
        ) =>
          getRecordId(
            item
          ) ===
          selectedConfigId
      ) ||
      null;

    const rotation =
      report?.rotation || {
        code:
          "STANDARD",
        label:
          "Standard Week",
        availableWeeks: [
          {
            code:
              "STANDARD",
            label:
              "Standard Week"
          }
        ]
      };

    const summary =
      report?.summary || {
        totalEntries: 0,
        scheduledEntries: 0,
        cancelledEntries: 0,
        classCount: 0,
        activeTeacherCount: 0,
        activeSubjectCount: 0,
        assignedTeacherCount: 0,
        assignedSubjectCount: 0,
        scheduledTeachingMinutes:
          0,
        totalSchedulableSlots:
          0,
        estimatedCapacity: 0,
        completionPercentage:
          0,
        unassignedTeacherCount:
          0,
        unassignedSubjectCount:
          0,
        missingRoomCount: 0,
        overloadedTeacherCount:
          0
      };

    const issueCount =
      Number(
        summary.unassignedTeacherCount
      ) +
      Number(
        summary.unassignedSubjectCount
      ) +
      Number(
        summary.missingRoomCount
      ) +
      Number(
        summary.overloadedTeacherCount
      );

    const breakdownItems =
      useMemo(() => {
        return getBreakdownItems(
          report,
          breakdownTab
        );
      }, [
        breakdownTab,
        report
      ]);

    const maximumBreakdownCount =
      useMemo(() => {
        return Math.max(
          1,
          ...breakdownItems.map(
            (
              item
            ) =>
              Number(
                item.count
              ) || 0
          )
        );
      }, [
        breakdownItems
      ]);

    const issueItems =
      useMemo(() => {
        return getIssueItems(
          report,
          issueTab
        );
      }, [
        issueTab,
        report
      ]);

    const teacherWorkload =
      report
        ?.teacherWorkload ||
      [];

    const selectedSchool =
      schools.find(
        (
          school
        ) =>
          getRecordId(
            school
          ) ===
          selectedSchoolId
      );

    /*
    |--------------------------------------------------------------------------
    | Selection Actions
    |--------------------------------------------------------------------------
    */

    const handleSchoolChange =
      (
        schoolId
      ) => {
        setSelectedSchoolId(
          schoolId
        );

        setSelectedConfigId(
          ""
        );

        setConfigs([]);
        setReport(null);
      };

    const handleRotationChange =
      async (
        rotationCode
      ) => {
        setSelectedRotation(
          rotationCode
        );

        await loadReport({
          rotationCode
        });
      };

    const handleStatusChange =
      async (
        status
      ) => {
        setEntryStatus(status);

        await loadReport({
          entryStatus:
            status
        });
      };

    /*
    |--------------------------------------------------------------------------
    | CSV Export
    |--------------------------------------------------------------------------
    */

    const exportCsv =
      () => {
        if (!report) {
          showToast(
            "error",
            "Generate the timetable report before exporting."
          );

          return;
        }

        const rows = [
          [
            "TIMETABLE REPORT"
          ],
          [
            "School",
            getSchoolName(
              selectedSchool ||
              config?.schoolId ||
              user?.schoolId ||
              user?.school
            )
          ],
          [
            "Timetable",
            config?.title ||
              ""
          ],
          [
            "Academic Year",
            config
              ?.academicYear
              ?.label ||
              ""
          ],
          [
            "Rotation",
            rotation.label ||
              ""
          ],
          [],
          [
            "SUMMARY"
          ],
          [
            "Metric",
            "Value"
          ],
          [
            "Total Entries",
            summary.totalEntries
          ],
          [
            "Scheduled Entries",
            summary.scheduledEntries
          ],
          [
            "Cancelled Entries",
            summary.cancelledEntries
          ],
          [
            "Classes",
            summary.classCount
          ],
          [
            "Active Teachers",
            summary.activeTeacherCount
          ],
          [
            "Active Subjects",
            summary.activeSubjectCount
          ],
          [
            "Assigned Teachers",
            summary.assignedTeacherCount
          ],
          [
            "Assigned Subjects",
            summary.assignedSubjectCount
          ],
          [
            "Teaching Minutes",
            summary.scheduledTeachingMinutes
          ],
          [
            "Completion Percentage",
            summary.completionPercentage
          ],
          [
            "Unassigned Teacher Entries",
            summary.unassignedTeacherCount
          ],
          [
            "Unassigned Subject Entries",
            summary.unassignedSubjectCount
          ],
          [
            "Missing Room Entries",
            summary.missingRoomCount
          ],
          [
            "Overloaded Teachers",
            summary.overloadedTeacherCount
          ],
          [],
          [
            "DAY BREAKDOWN"
          ],
          [
            "Day",
            "Entries",
            "Teaching Minutes"
          ]
        ];

        report.breakdowns.byDay.forEach(
          (
            item
          ) => {
            rows.push([
              item.label,
              item.count,
              item.teachingMinutes
            ]);
          }
        );

        rows.push(
          [],
          [
            "TEACHER WORKLOAD"
          ],
          [
            "Teacher",
            "Employee ID",
            "Weekly Periods",
            "Teaching Minutes",
            "Weekly Overloaded",
            "Daily Overload Count"
          ]
        );

        teacherWorkload.forEach(
          (
            teacher
          ) => {
            rows.push([
              teacher.teacherName,
              teacher.employeeId,
              teacher.weeklyPeriods,
              teacher.weeklyTeachingMinutes,
              teacher.isWeeklyOverloaded
                ? "Yes"
                : "No",
              teacher.dailyOverloads
                ?.length ||
                0
            ]);
          }
        );

        rows.push(
          [],
          [
            "CLASS BREAKDOWN"
          ],
          [
            "Class",
            "Entries",
            "Teaching Minutes"
          ]
        );

        report.breakdowns.byClass.forEach(
          (
            item
          ) => {
            rows.push([
              item.label,
              item.count,
              item.teachingMinutes
            ]);
          }
        );

        rows.push(
          [],
          [
            "SUBJECT BREAKDOWN"
          ],
          [
            "Subject",
            "Code",
            "Entries",
            "Teaching Minutes"
          ]
        );

        report.breakdowns.bySubject.forEach(
          (
            item
          ) => {
            rows.push([
              item.label,
              item.code,
              item.count,
              item.teachingMinutes
            ]);
          }
        );

        rows.push(
          [],
          [
            "ISSUES"
          ],
          [
            "Type",
            "Day",
            "Period",
            "Class",
            "Section",
            "Subject",
            "Teacher",
            "Room"
          ]
        );

        const addIssueRows = (
          label,
          entries
        ) => {
          entries.forEach(
            (
              entry
            ) => {
              rows.push([
                label,
                formatEnum(
                  entry.day
                ),
                getPeriodLabel(
                  entry
                ),
                getClassName(
                  entry
                ),
                getSectionName(
                  entry
                ),
                getSubjectName(
                  entry
                ),
                getTeacherName(
                  entry
                ),
                getRoomName(
                  entry
                )
              ]);
            }
          );
        };

        addIssueRows(
          "Unassigned Teacher",
          report.issues
            .unassignedTeacherEntries
        );

        addIssueRows(
          "Unassigned Subject",
          report.issues
            .unassignedSubjectEntries
        );

        addIssueRows(
          "Missing Room",
          report.issues
            .missingRoomEntries
        );

        const csv =
          rows
            .map(
              (
                row
              ) =>
                row
                  .map(
                    (
                      value
                    ) =>
                      `"${String(
                        value ?? ""
                      ).replaceAll(
                        '"',
                        '""'
                      )}"`
                  )
                  .join(",")
            )
            .join("\n");

        const blob =
          new Blob(
            [csv],
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
          `${config?.title || "Timetable"}-Report.csv`
            .replace(
              /\s+/g,
              "-"
            );

        document.body.appendChild(
          link
        );

        link.click();

        document.body.removeChild(
          link
        );

        URL.revokeObjectURL(
          url
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Access Check
    |--------------------------------------------------------------------------
    */

    if (!canView) {
      return (
        <EmptyState
          icon={ShieldAlert}
          title="Access Restricted"
          description="Your account does not have permission to view timetable reports."
        />
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
      <div className="space-y-6 pb-10">
        <style>
          {`
            @media print {
              body * {
                visibility: hidden !important;
              }

              #timetable-report-print,
              #timetable-report-print * {
                visibility: visible !important;
              }

              #timetable-report-print {
                position: absolute;
                inset: 0;
                width: 100%;
                padding: 16px;
                background: white;
              }

              .print-hidden {
                display: none !important;
              }

              .print-break {
                break-before: page;
              }

              @page {
                size: landscape;
                margin: 10mm;
              }
            }
          `}
        </style>

        {/*
        |--------------------------------------------------------------------------
        | Toast
        |--------------------------------------------------------------------------
        */}

        {toast && (
          <div
            className={`fixed right-4 top-20 z-[150] flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${
              toast.type ===
              "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {toast.type ===
            "success" ? (
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
              />
            ) : (
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0"
              />
            )}

            <p className="text-sm font-medium">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() =>
                setToast(null)
              }
              aria-label="Close notification"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Header
        |--------------------------------------------------------------------------
        */}

        <div className="print-hidden flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <BarChart3
                size={21}
              />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
                Timetable Report
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Review completion, workload, allocation quality and unresolved timetable issues.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canManage && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  navigate(
                    "/timetable/builder"
                  )
                }
              >
                <Grid3X3
                  size={16}
                />
                Timetable Builder
              </button>
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                loadReport()
              }
              disabled={
                loadingReport ||
                !selectedConfigId
              }
            >
              <RefreshCw
                size={16}
                className={
                  loadingReport
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={
                exportCsv
              }
              disabled={!report}
            >
              <Download
                size={16}
              />
              Export CSV
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                window.print()
              }
              disabled={!report}
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
        | Filters
        |--------------------------------------------------------------------------
        */}

        <div className="print-hidden card p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="field-label">
                School
              </label>

              {userRole ===
              "super_admin" ? (
                <select
                  className="field-select"
                  value={
                    selectedSchoolId
                  }
                  onChange={(
                    event
                  ) =>
                    handleSchoolChange(
                      event.target.value
                    )
                  }
                  disabled={
                    loadingSchools
                  }
                >
                  <option value="">
                    Select school
                  </option>

                  {schools.map(
                    (
                      school
                    ) => (
                      <option
                        key={
                          getRecordId(
                            school
                          )
                        }
                        value={
                          getRecordId(
                            school
                          )
                        }
                      >
                        {getSchoolName(
                          school
                        )}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                  <School
                    size={16}
                    className="text-slate-400"
                  />

                  {user?.schoolId
                    ?.schoolName ||
                    user?.school
                      ?.schoolName ||
                    "Assigned School"}
                </div>
              )}
            </div>

            <div>
              <label className="field-label">
                Timetable Configuration
              </label>

              <select
                className="field-select"
                value={
                  selectedConfigId
                }
                onChange={(
                  event
                ) =>
                  setSelectedConfigId(
                    event.target.value
                  )
                }
                disabled={
                  loadingConfigs ||
                  !selectedSchoolId
                }
              >
                <option value="">
                  Select configuration
                </option>

                {configs.map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        getRecordId(
                          item
                        )
                      }
                      value={
                        getRecordId(
                          item
                        )
                      }
                    >
                      {item.title} ·{" "}
                      {item
                        .academicYear
                        ?.label ||
                        "No academic year"}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="field-label">
                Rotation Week
              </label>

              <select
                className="field-select"
                value={
                  selectedRotation
                }
                onChange={(
                  event
                ) =>
                  handleRotationChange(
                    event.target.value
                  )
                }
                disabled={
                  !selectedConfigId
                }
              >
                {(
                  rotation
                    .availableWeeks ||
                  [
                    {
                      code:
                        "STANDARD",
                      label:
                        "Standard Week"
                    }
                  ]
                ).map(
                  (
                    week
                  ) => (
                    <option
                      key={
                        week.code
                      }
                      value={
                        week.code
                      }
                    >
                      {week.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="field-label">
                Entry Status
              </label>

              <select
                className="field-select"
                value={
                  entryStatus
                }
                onChange={(
                  event
                ) =>
                  handleStatusChange(
                    event.target.value
                  )
                }
                disabled={
                  !selectedConfigId
                }
              >
                <option value="">
                  All Entries
                </option>

                <option value="scheduled">
                  Scheduled Only
                </option>

                <option value="cancelled">
                  Cancelled Only
                </option>
              </select>
            </div>
          </div>
        </div>

        {!selectedConfigId ? (
          <EmptyState
            icon={BarChart3}
            title="Select a Timetable Configuration"
            description="Choose a timetable configuration to generate allocation, workload and quality reports."
          />
        ) : loadingReport ? (
          <div className="card flex min-h-80 flex-col items-center justify-center">
            <Loader2
              size={32}
              className="animate-spin text-brand-600"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Generating timetable report...
            </p>
          </div>
        ) : !report ? (
          <EmptyState
            icon={FileWarning}
            title="Report Could Not Be Generated"
            description="Refresh the page or verify that the selected configuration belongs to your school."
          />
        ) : (
          <div
            id="timetable-report-print"
            className="space-y-6"
          >
            {/*
            |--------------------------------------------------------------------------
            | Report Header
            |--------------------------------------------------------------------------
            */}

            <div className="card p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                    {getSchoolName(
                      selectedSchool ||
                      config?.schoolId ||
                      user?.schoolId ||
                      user?.school
                    )}
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-800">
                    {config?.title ||
                      "Timetable Report"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {rotation.label} ·{" "}
                    {entryStatus
                      ? `${formatEnum(
                          entryStatus
                        )} Entries`
                      : "All Timetable Entries"}
                  </p>
                </div>

                <div className="space-y-2 lg:text-right">
                  <StatusBadge
                    status={
                      config?.status
                    }
                    isActive={
                      config?.isActive
                    }
                  />

                  <p className="text-xs text-slate-400">
                    Generated{" "}
                    {formatDate(
                      new Date()
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2 xl:grid-cols-5">
                <div>
                  <p className="text-slate-400">
                    Code
                  </p>

                  <p className="mt-1 font-semibold text-slate-700">
                    {config?.code ||
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">
                    Academic Year
                  </p>

                  <p className="mt-1 font-semibold text-slate-700">
                    {config
                      ?.academicYear
                      ?.label ||
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">
                    Effective From
                  </p>

                  <p className="mt-1 font-semibold text-slate-700">
                    {formatDate(
                      config
                        ?.effectiveFrom
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">
                    Effective To
                  </p>

                  <p className="mt-1 font-semibold text-slate-700">
                    {formatDate(
                      config
                        ?.effectiveTo
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">
                    Completion
                  </p>

                  <p className="mt-1 font-semibold text-slate-700">
                    {Number(
                      summary.completionPercentage
                    ).toFixed(
                      1
                    )}
                    %
                  </p>
                </div>
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Completion Overview
            |--------------------------------------------------------------------------
            */}

            <section className="card p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Timetable Completion
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Scheduled class-period assignments compared with estimated timetable capacity.
                  </p>
                </div>

                <p className="text-3xl font-bold text-brand-700">
                  {Number(
                    summary.completionPercentage
                  ).toFixed(
                    1
                  )}
                  %
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{
                    width:
                      `${Math.min(
                        100,
                        Math.max(
                          0,
                          Number(
                            summary.completionPercentage
                          ) || 0
                        )
                      )}%`
                  }}
                />
              </div>

              <div className="mt-3 flex flex-wrap justify-between gap-3 text-xs text-slate-500">
                <span>
                  Scheduled:{" "}
                  <strong className="text-slate-700">
                    {formatNumber(
                      summary.scheduledEntries
                    )}
                  </strong>
                </span>

                <span>
                  Estimated Capacity:{" "}
                  <strong className="text-slate-700">
                    {formatNumber(
                      summary.estimatedCapacity
                    )}
                  </strong>
                </span>

                <span>
                  Weekly Slot Types:{" "}
                  <strong className="text-slate-700">
                    {formatNumber(
                      summary.totalSchedulableSlots
                    )}
                  </strong>
                </span>
              </div>
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Summary Cards
            |--------------------------------------------------------------------------
            */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={BookOpen}
                label="Scheduled Entries"
                value={formatNumber(
                  summary.scheduledEntries
                )}
                description={`${formatNumber(
                  summary.cancelledEntries
                )} cancelled entries`}
                success={
                  summary.scheduledEntries >
                  0
                }
              />

              <SummaryCard
                icon={
                  GraduationCap
                }
                label="Classes"
                value={formatNumber(
                  summary.classCount
                )}
                description={`${formatNumber(
                  summary.activeSubjectCount
                )} active subjects`}
              />

              <SummaryCard
                icon={Users}
                label="Teachers"
                value={formatNumber(
                  summary.assignedTeacherCount
                )}
                description={`${formatNumber(
                  summary.activeTeacherCount
                )} active teacher records`}
              />

              <SummaryCard
                icon={Clock3}
                label="Teaching Time"
                value={formatMinutes(
                  summary.scheduledTeachingMinutes
                )}
                description="Total scheduled teaching duration"
              />

              <SummaryCard
                icon={UserRound}
                label="Missing Teachers"
                value={formatNumber(
                  summary.unassignedTeacherCount
                )}
                description="Lessons requiring teacher assignment"
                alert={
                  summary.unassignedTeacherCount >
                  0
                }
              />

              <SummaryCard
                icon={BookOpen}
                label="Missing Subjects"
                value={formatNumber(
                  summary.unassignedSubjectCount
                )}
                description="Lessons requiring subject assignment"
                alert={
                  summary.unassignedSubjectCount >
                  0
                }
              />

              <SummaryCard
                icon={Building2}
                label="Missing Rooms"
                value={formatNumber(
                  summary.missingRoomCount
                )}
                description="Lessons requiring room assignment"
                alert={
                  summary.missingRoomCount >
                  0
                }
              />

              <SummaryCard
                icon={AlertTriangle}
                label="Overloaded Teachers"
                value={formatNumber(
                  summary.overloadedTeacherCount
                )}
                description={`${formatNumber(
                  issueCount
                )} total report issues`}
                alert={
                  summary.overloadedTeacherCount >
                  0
                }
                success={
                  issueCount === 0
                }
              />
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Breakdown
            |--------------------------------------------------------------------------
            */}

            <section className="card overflow-hidden">
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Allocation Breakdown
                    </h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Compare lesson volume and teaching time across timetable dimensions.
                    </p>
                  </div>

                  <div className="print-hidden flex flex-wrap gap-2">
                    {BREAKDOWN_TABS.map(
                      (
                        tab
                      ) => (
                        <button
                          key={
                            tab.value
                          }
                          type="button"
                          onClick={() =>
                            setBreakdownTab(
                              tab.value
                            )
                          }
                          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            breakdownTab ===
                            tab.value
                              ? "bg-brand-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {tab.label}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {breakdownItems.length ===
              0 ? (
                <div className="px-5 py-12 text-center">
                  <BarChart3
                    size={34}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    No breakdown data available
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Add scheduled timetable entries to populate this report.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                  {breakdownItems.map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-700">
                              {item.label}
                            </p>

                            {(item.code ||
                              item.employeeId) && (
                              <p className="mt-1 text-[11px] font-medium text-slate-400">
                                {item.code ||
                                  item.employeeId}
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-800">
                              {formatNumber(
                                item.count
                              )}
                            </p>

                            <p className="text-[10px] text-slate-400">
                              entries
                            </p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <ProgressBar
                            value={
                              item.count
                            }
                            maximum={
                              maximumBreakdownCount
                            }
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            Teaching time
                          </span>

                          <span className="font-semibold text-slate-600">
                            {formatMinutes(
                              item.teachingMinutes
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Teacher Workload
            |--------------------------------------------------------------------------
            */}

            <section className="print-break card overflow-hidden">
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Users size={18} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Teacher Workload
                    </h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Weekly periods, teaching minutes and daily overload checks.
                    </p>
                  </div>
                </div>
              </div>

              {teacherWorkload.length ===
              0 ? (
                <div className="px-5 py-12 text-center">
                  <Users
                    size={34}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    No teacher workload data
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Teacher
                        </th>

                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Weekly
                        </th>

                        {DAYS.slice(
                          0,
                          6
                        ).map(
                          (
                            day
                          ) => (
                            <th
                              key={
                                day.value
                              }
                              className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                            >
                              {day.label.slice(
                                0,
                                3
                              )}
                            </th>
                          )
                        )}

                        <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {teacherWorkload.map(
                        (
                          teacher
                        ) => {
                          const overloaded =
                            teacher.isWeeklyOverloaded ||
                            teacher
                              .dailyOverloads
                              ?.length >
                              0;

                          return (
                            <tr
                              key={
                                teacher.teacherId
                              }
                              className="hover:bg-slate-50/70"
                            >
                              <td className="px-4 py-3">
                                <p className="text-sm font-semibold text-slate-700">
                                  {teacher.teacherName}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  {teacher.employeeId ||
                                    "No employee ID"}
                                </p>
                              </td>

                              <td className="whitespace-nowrap px-4 py-3">
                                <p className="text-sm font-bold text-slate-700">
                                  {teacher.weeklyPeriods}{" "}
                                  periods
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  {formatMinutes(
                                    teacher.weeklyTeachingMinutes
                                  )}
                                </p>
                              </td>

                              {DAYS.slice(
                                0,
                                6
                              ).map(
                                (
                                  day
                                ) => {
                                  const daily =
                                    teacher.daily
                                      ?.find(
                                        (
                                          item
                                        ) =>
                                          item.day ===
                                          day.value
                                      );

                                  const dailyOverloaded =
                                    teacher
                                      .dailyOverloads
                                      ?.some(
                                        (
                                          item
                                        ) =>
                                          item.day ===
                                          day.value
                                      );

                                  return (
                                    <td
                                      key={`${teacher.teacherId}-${day.value}`}
                                      className="px-3 py-3 text-center"
                                    >
                                      <span
                                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold ${
                                          dailyOverloaded
                                            ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {daily?.periods ||
                                          0}
                                      </span>
                                    </td>
                                  );
                                }
                              )}

                              <td className="px-4 py-3 text-center">
                                {overloaded ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                                    <AlertTriangle
                                      size={11}
                                    />
                                    Overloaded
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                    <CheckCircle2
                                      size={11}
                                    />
                                    Balanced
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Issues
            |--------------------------------------------------------------------------
            */}

            <section className="print-break card overflow-hidden">
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Timetable Quality Issues
                    </h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Entries that require assignment, correction or workload review.
                    </p>
                  </div>

                  <div className="print-hidden flex flex-wrap gap-2">
                    {ISSUE_TABS.map(
                      (
                        tab
                      ) => {
                        const counts = {
                          teacher:
                            summary.unassignedTeacherCount,

                          subject:
                            summary.unassignedSubjectCount,

                          room:
                            summary.missingRoomCount,

                          overload:
                            summary.overloadedTeacherCount
                        };

                        return (
                          <button
                            key={
                              tab.value
                            }
                            type="button"
                            onClick={() =>
                              setIssueTab(
                                tab.value
                              )
                            }
                            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                              issueTab ===
                              tab.value
                                ? "bg-brand-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {tab.label}{" "}
                            <span className="ml-1 opacity-80">
                              {
                                counts[
                                  tab.value
                                ]
                              }
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>

              {issueItems.length ===
              0 ? (
                <div className="px-5 py-12 text-center">
                  <CheckCircle2
                    size={36}
                    className="mx-auto text-emerald-400"
                  />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No issues in this category
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    The selected timetable category has passed this quality check.
                  </p>
                </div>
              ) : issueTab ===
                "overload" ? (
                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                  {issueItems.map(
                    (
                      teacher
                    ) => (
                      <div
                        key={
                          teacher.teacherId
                        }
                        className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                            <UserRound
                              size={17}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800">
                              {teacher.teacherName}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {teacher.employeeId ||
                                "No employee ID"}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                                {teacher.weeklyPeriods}{" "}
                                weekly periods
                              </span>

                              <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                                {formatMinutes(
                                  teacher.weeklyTeachingMinutes
                                )}
                              </span>
                            </div>

                            {teacher
                              .dailyOverloads
                              ?.length >
                              0 && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-rose-700">
                                  Daily overloads
                                </p>

                                <div className="mt-2 flex flex-wrap gap-2">
                                  {teacher.dailyOverloads.map(
                                    (
                                      overload
                                    ) => (
                                      <span
                                        key={
                                          overload.day
                                        }
                                        className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-semibold text-rose-700"
                                      >
                                        {formatEnum(
                                          overload.day
                                        )}
                                        :{" "}
                                        {overload.periods}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Day / Period
                        </th>

                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Class
                        </th>

                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Subject
                        </th>

                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Teacher
                        </th>

                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Room
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {issueItems.map(
                        (
                          entry,
                          index
                        ) => (
                          <tr
                            key={
                              getRecordId(
                                entry
                              ) ||
                              `${issueTab}-${index}`
                            }
                            className="hover:bg-slate-50/70"
                          >
                            <td className="whitespace-nowrap px-4 py-3">
                              <p className="text-sm font-semibold text-slate-700">
                                {formatEnum(
                                  entry.day
                                )}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {getPeriodLabel(
                                  entry
                                )}
                              </p>
                            </td>

                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-slate-700">
                                {getClassName(
                                  entry
                                )}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {getSectionName(
                                  entry
                                )
                                  ? `Section ${getSectionName(
                                      entry
                                    )}`
                                  : "Whole Class"}
                              </p>
                            </td>

                            <td className="px-4 py-3 text-sm text-slate-600">
                              {getSubjectName(
                                entry
                              )}
                            </td>

                            <td className="px-4 py-3 text-sm text-slate-600">
                              {getTeacherName(
                                entry
                              )}
                            </td>

                            <td className="px-4 py-3 text-sm text-slate-600">
                              {getRoomName(
                                entry
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    );
  };

export default TimetableReport;
