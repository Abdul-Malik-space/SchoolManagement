import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  GraduationCap,
  Grid3X3,
  Loader2,
  Printer,
  RefreshCw,
  School,
  Search,
  Settings2,
  UserRound,
  Users
} from "lucide-react";

import {
  useNavigate
} from "react-router-dom";

import api from "../../api/axios";

import {
  getTimetableConfigs
} from "../../api/timetableConfigs";

import {
  getClassTimetable
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

/*
|--------------------------------------------------------------------------
| Response and Record Helpers
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

const normalizeClassTimetableResponse =
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
        payload.config ||
        null,

      classRecord:
        payload.classRecord ||
        payload.class ||
        null,

      sectionName:
        payload.sectionName ||
        payload.section ||
        "",

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

      timetableEntries:
        Array.isArray(
          payload.timetableEntries
        )
          ? payload.timetableEntries
          : Array.isArray(
                payload.entries
              )
            ? payload.entries
            : [],

      summary:
        payload.summary ||
        {},

      school:
        payload.school ||
        payload.schoolRecord ||
        null
    };
  };

/*
|--------------------------------------------------------------------------
| Formatting Helpers
|--------------------------------------------------------------------------
*/

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

const formatTime = (
  value
) => {
  if (!value) {
    return "—";
  }

  const [
    hourText,
    minuteText
  ] = String(value)
    .split(":");

  const hour =
    Number(hourText);

  const minute =
    Number(minuteText);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return value;
  }

  return `${hour % 12 || 12}:${String(
    minute
  ).padStart(
    2,
    "0"
  )} ${
    hour >= 12
      ? "PM"
      : "AM"
  }`;
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
| Entity Display Helpers
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
  classRecord
) => {
  return (
    classRecord?.className ||
    classRecord?.name ||
    classRecord?.title ||
    "Unnamed Class"
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
    formatEnum(
      entry?.entryType
    ) ||
    "Unassigned Subject"
  );
};

const getSubjectCode = (
  entry
) => {
  return (
    entry?.subjectSnapshot
      ?.code ||
    entry?.subjectId
      ?.subjectCode ||
    entry?.subjectId
      ?.code ||
    ""
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

const getSections = (
  classRecord
) => {
  if (
    !Array.isArray(
      classRecord?.sections
    )
  ) {
    return [];
  }

  return classRecord.sections
    .map(
      (
        section
      ) => {
        if (
          typeof section ===
          "string"
        ) {
          return section;
        }

        return (
          section?.sectionName ||
          section?.name ||
          section?.title ||
          ""
        );
      }
    )
    .map(
      (
        section
      ) =>
        String(
          section
        ).trim()
    )
    .filter(Boolean);
};

/*
|--------------------------------------------------------------------------
| Timetable Helpers
|--------------------------------------------------------------------------
*/

const getEntryPeriodId = (
  entry
) => {
  return (
    getRecordId(
      entry?.periodId
    ) ||
    getRecordId(
      entry?.periodSnapshot
        ?._id
    )
  );
};

const getEntryClassId = (
  entry
) => {
  return getRecordId(
    entry?.classId
  );
};

const sameSection = (
  entry,
  sectionName
) => {
  return String(
    entry?.sectionName ||
    entry?.classSnapshot
      ?.sectionName ||
    ""
  )
    .trim()
    .toLowerCase() ===
    String(
      sectionName || ""
    )
      .trim()
      .toLowerCase();
};

const sortDays = (
  daySchedules
) => {
  return [
    ...(daySchedules || [])
  ].sort(
    (
      first,
      second
    ) =>
      DAYS.findIndex(
        (
          day
        ) =>
          day.value ===
          first.day
      ) -
      DAYS.findIndex(
        (
          day
        ) =>
          day.value ===
          second.day
      )
  );
};

const sortPeriods = (
  periods
) => {
  return [
    ...(periods || [])
  ].sort(
    (
      first,
      second
    ) =>
      Number(
        first?.sequence ||
        0
      ) -
      Number(
        second?.sequence ||
        0
      )
  );
};

const isSchedulablePeriod = (
  period
) => {
  return Boolean(
    period?.isActive !==
      false &&
    period?.isSchedulable !==
      false
  );
};

const getEntryColor = (
  entry
) => {
  const color =
    String(
      entry?.displayColor ||
      "#2563EB"
    ).trim();

  return /^#[0-9A-F]{6}$/i.test(
    color
  )
    ? color
    : "#2563EB";
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
  description
}) => {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-xl font-bold text-slate-800">
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
  description
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
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Class Timetable Page
|--------------------------------------------------------------------------
*/

const ClassTimetable =
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
      classes,
      setClasses
    ] = useState([]);

    const [
      selectedClassId,
      setSelectedClassId
    ] = useState("");

    const [
      selectedSection,
      setSelectedSection
    ] = useState("");

    const [
      classSearch,
      setClassSearch
    ] = useState("");

    const [
      selectedRotation,
      setSelectedRotation
    ] = useState(
      "STANDARD"
    );

    const [
      timetableData,
      setTimetableData
    ] = useState(null);

    const [
      loadingSchools,
      setLoadingSchools
    ] = useState(false);

    const [
      loadingConfigs,
      setLoadingConfigs
    ] = useState(false);

    const [
      loadingClasses,
      setLoadingClasses
    ] = useState(false);

    const [
      loadingTimetable,
      setLoadingTimetable
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
    | Load Configurations
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
    | Load Classes
    |--------------------------------------------------------------------------
    */

    const loadClasses =
      useCallback(
        async () => {
          const schoolId =
            userRole ===
            "super_admin"
              ? selectedSchoolId
              : assignedSchoolId;

          if (!schoolId) {
            setClasses([]);
            setSelectedClassId(
              ""
            );

            return;
          }

          setLoadingClasses(
            true
          );

          try {
            const response =
              await api.get(
                "/classes",
                {
                  params: {
                    schoolId,
                    limit: 200,
                    status:
                      "active"
                  }
                }
              );

            const items =
              extractArray(
                response,
                "classes"
              );

            setClasses(items);

            setSelectedClassId(
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
                  items[0]
                );
              }
            );
          } catch (error) {
            showToast(
              "error",
              getErrorMessage(
                error,
                "Classes could not be loaded."
              )
            );
          } finally {
            setLoadingClasses(
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
    | Load Class Timetable
    |--------------------------------------------------------------------------
    */

    const loadTimetable =
      useCallback(
        async (
          options = {}
        ) => {
          const classId =
            options.classId ||
            selectedClassId;

          const rotationCode =
            options.rotationCode ||
            selectedRotation;

          if (
            !classId ||
            !selectedConfigId
          ) {
            setTimetableData(
              null
            );

            return;
          }

          setLoadingTimetable(
            true
          );

          try {
            const response =
              await getClassTimetable(
                classId,
                {
                  timetableConfigId:
                    selectedConfigId,

                  schoolId:
                    userRole ===
                      "super_admin"
                      ? selectedSchoolId
                      : undefined,

                  rotationWeekCode:
                    rotationCode,

                  sectionName:
                    selectedSection ||
                    undefined
                }
              );

            const normalized =
              normalizeClassTimetableResponse(
                response
              );

            setTimetableData(
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
                "Class timetable could not be loaded."
              )
            );

            setTimetableData(
              null
            );
          } finally {
            setLoadingTimetable(
              false
            );
          }
        },
        [
          selectedClassId,
          selectedConfigId,
          selectedRotation,
          selectedSchoolId,
          selectedSection,
          showToast,
          userRole
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Initial Effects
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
      loadClasses();
    }, [
      loadClasses,
      loadConfigurations
    ]);

    /*
    |--------------------------------------------------------------------------
    | Selected Class and Section
    |--------------------------------------------------------------------------
    */

    const selectedClass =
      useMemo(() => {
        return classes.find(
          (
            classRecord
          ) =>
            getRecordId(
              classRecord
            ) ===
            selectedClassId
        );
      }, [
        classes,
        selectedClassId
      ]);

    const sections =
      useMemo(() => {
        return getSections(
          selectedClass
        );
      }, [
        selectedClass
      ]);

    useEffect(() => {
      setSelectedSection(
        (
          current
        ) =>
          sections.includes(
            current
          )
            ? current
            : sections[0] ||
              ""
      );
    }, [
      sections
    ]);

    useEffect(() => {
      if (
        selectedConfigId &&
        selectedClassId
      ) {
        loadTimetable();
      } else {
        setTimetableData(
          null
        );
      }
    }, [
      selectedClassId,
      selectedConfigId,
      selectedSection
    ]);

    /*
    |--------------------------------------------------------------------------
    | Derived Data
    |--------------------------------------------------------------------------
    */

    const filteredClasses =
      useMemo(() => {
        const query =
          classSearch
            .trim()
            .toLowerCase();

        return classes.filter(
          (
            classRecord
          ) =>
            !query ||
            getClassName(
              classRecord
            )
              .toLowerCase()
              .includes(
                query
              )
        );
      }, [
        classSearch,
        classes
      ]);

    const config =
      timetableData
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

    const workingDays =
      useMemo(() => {
        return sortDays(
          config
            ?.daySchedules ||
            []
        ).filter(
          (
            daySchedule
          ) =>
            daySchedule
              .isWorkingDay
        );
      }, [
        config
      ]);

    const allPeriods =
      useMemo(() => {
        const periodMap =
          new Map();

        workingDays.forEach(
          (
            daySchedule
          ) => {
            sortPeriods(
              daySchedule.periods
            ).forEach(
              (
                period
              ) => {
                const key =
                  `${period.sequence}-${period.code}-${period.startTime}`;

                if (
                  !periodMap.has(
                    key
                  )
                ) {
                  periodMap.set(
                    key,
                    period
                  );
                }
              }
            );
          }
        );

        return Array.from(
          periodMap.values()
        ).sort(
          (
            first,
            second
          ) =>
            Number(
              first.sequence ||
              0
            ) -
            Number(
              second.sequence ||
              0
            )
        );
      }, [
        workingDays
      ]);

    const timetableEntries =
      useMemo(() => {
        return (
          timetableData
            ?.timetableEntries ||
          []
        ).filter(
          (
            entry
          ) =>
            getEntryClassId(
              entry
            ) ===
              selectedClassId &&
            sameSection(
              entry,
              selectedSection
            ) &&
            String(
              entry?.entryStatus ||
              "scheduled"
            ) ===
              "scheduled"
        );
      }, [
        selectedClassId,
        selectedSection,
        timetableData
      ]);

    const entryMap =
      useMemo(() => {
        const map =
          new Map();

        timetableEntries.forEach(
          (
            entry
          ) => {
            map.set(
              `${entry.day}:${getEntryPeriodId(
                entry
              )}`,
              entry
            );
          }
        );

        return map;
      }, [
        timetableEntries
      ]);

    const summary =
      useMemo(() => {
        const subjectIds =
          new Set();

        const teacherIds =
          new Set();

        timetableEntries.forEach(
          (
            entry
          ) => {
            const subjectId =
              getRecordId(
                entry.subjectId
              ) ||
              entry
                .subjectSnapshot
                ?.code ||
              getSubjectName(
                entry
              );

            const teacherId =
              getRecordId(
                entry.teacherId
              ) ||
              entry
                .teacherSnapshot
                ?.employeeId ||
              getTeacherName(
                entry
              );

            if (subjectId) {
              subjectIds.add(
                subjectId
              );
            }

            if (
              teacherId &&
              getTeacherName(
                entry
              ) !==
                "Unassigned Teacher"
            ) {
              teacherIds.add(
                teacherId
              );
            }
          }
        );

        const availableSlots =
          workingDays.reduce(
            (
              total,
              daySchedule
            ) =>
              total +
              sortPeriods(
                daySchedule.periods
              ).filter(
                isSchedulablePeriod
              ).length,
            0
          );

        return {
          lessons:
            timetableEntries.length,

          subjects:
            subjectIds.size,

          teachers:
            teacherIds.size,

          freeSlots:
            Math.max(
              availableSlots -
                timetableEntries.length,
              0
            )
        };
      }, [
        timetableEntries,
        workingDays
      ]);

    /*
    |--------------------------------------------------------------------------
    | Selector Actions
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

        setSelectedClassId(
          ""
        );

        setSelectedSection(
          ""
        );

        setConfigs([]);
        setClasses([]);
        setTimetableData(
          null
        );
      };

    const handleRotationChange =
      async (
        rotationCode
      ) => {
        setSelectedRotation(
          rotationCode
        );

        await loadTimetable({
          rotationCode
        });
      };

    /*
    |--------------------------------------------------------------------------
    | Export CSV
    |--------------------------------------------------------------------------
    */

    const exportCsv =
      () => {
        if (
          timetableEntries.length ===
          0
        ) {
          showToast(
            "error",
            "There are no timetable entries to export."
          );

          return;
        }

        const rows = [
          [
            "Day",
            "Period",
            "Start Time",
            "End Time",
            "Class",
            "Section",
            "Subject",
            "Subject Code",
            "Teacher",
            "Room",
            "Entry Type",
            "Delivery Mode"
          ]
        ];

        timetableEntries
          .slice()
          .sort(
            (
              first,
              second
            ) => {
              const dayDifference =
                DAYS.findIndex(
                  (
                    day
                  ) =>
                    day.value ===
                    first.day
                ) -
                DAYS.findIndex(
                  (
                    day
                  ) =>
                    day.value ===
                    second.day
                );

              if (
                dayDifference !==
                0
              ) {
                return dayDifference;
              }

              return (
                Number(
                  first
                    .periodSnapshot
                    ?.sequence ||
                    0
                ) -
                Number(
                  second
                    .periodSnapshot
                    ?.sequence ||
                    0
                )
              );
            }
          )
          .forEach(
            (
              entry
            ) => {
              rows.push([
                formatEnum(
                  entry.day
                ),

                entry
                  .periodSnapshot
                  ?.name ||
                  "Period",

                entry
                  .periodSnapshot
                  ?.startTime ||
                  "",

                entry
                  .periodSnapshot
                  ?.endTime ||
                  "",

                getClassName(
                  selectedClass
                ),

                selectedSection ||
                  "",

                getSubjectName(
                  entry
                ),

                getSubjectCode(
                  entry
                ),

                getTeacherName(
                  entry
                ),

                getRoomName(
                  entry
                ),

                formatEnum(
                  entry.entryType
                ),

                formatEnum(
                  entry.deliveryMode
                )
              ]);
            }
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

        const fileName =
          `${getClassName(
            selectedClass
          )}${
            selectedSection
              ? `-Section-${selectedSection}`
              : ""
          }-Timetable.csv`
            .replace(
              /\s+/g,
              "-"
            );

        link.href = url;
        link.download =
          fileName;

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
    | Access
    |--------------------------------------------------------------------------
    */

    if (!canView) {
      return (
        <EmptyState
          icon={AlertTriangle}
          title="Access Restricted"
          description="Your account does not have permission to view class timetables."
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

              #class-timetable-print,
              #class-timetable-print * {
                visibility: visible !important;
              }

              #class-timetable-print {
                position: absolute;
                inset: 0;
                width: 100%;
                padding: 16px;
                background: white;
              }

              .print-hidden {
                display: none !important;
              }

              .print-table {
                font-size: 10px !important;
              }

              @page {
                size: landscape;
                margin: 10mm;
              }
            }
          `}
        </style>

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
              <GraduationCap
                size={21}
              />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
                Class Timetable
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                View, print and export a complete weekly schedule for any class and section.
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
                loadTimetable()
              }
              disabled={
                loadingTimetable ||
                !selectedClassId ||
                !selectedConfigId
              }
            >
              <RefreshCw
                size={16}
                className={
                  loadingTimetable
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
              disabled={
                timetableEntries.length ===
                0
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
              onClick={() =>
                window.print()
              }
              disabled={
                timetableEntries.length ===
                0
              }
            >
              <Printer
                size={16}
              />
              Print
            </button>
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */}

        <div className="print-hidden card p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
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
                Configuration
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
                Search Class
              </label>

              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  className="field-input pl-9"
                  value={
                    classSearch
                  }
                  onChange={(
                    event
                  ) =>
                    setClassSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search class..."
                />
              </div>
            </div>

            <div>
              <label className="field-label">
                Class
              </label>

              <select
                className="field-select"
                value={
                  selectedClassId
                }
                onChange={(
                  event
                ) =>
                  setSelectedClassId(
                    event.target.value
                  )
                }
                disabled={
                  loadingClasses ||
                  !selectedSchoolId
                }
              >
                <option value="">
                  Select class
                </option>

                {filteredClasses.map(
                  (
                    classRecord
                  ) => (
                    <option
                      key={
                        getRecordId(
                          classRecord
                        )
                      }
                      value={
                        getRecordId(
                          classRecord
                        )
                      }
                    >
                      {getClassName(
                        classRecord
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="field-label">
                Section
              </label>

              <select
                className="field-select"
                value={
                  selectedSection
                }
                onChange={(
                  event
                ) =>
                  setSelectedSection(
                    event.target.value
                  )
                }
                disabled={
                  !selectedClassId
                }
              >
                {sections.length ===
                0 ? (
                  <option value="">
                    Whole Class
                  </option>
                ) : (
                  sections.map(
                    (
                      section
                    ) => (
                      <option
                        key={
                          section
                        }
                        value={
                          section
                        }
                      >
                        Section{" "}
                        {section}
                      </option>
                    )
                  )
                )}
              </select>
            </div>
          </div>

          <div className="mt-4 max-w-sm">
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
                !selectedClassId ||
                !selectedConfigId
              }
            >
              {(
                timetableData
                  ?.rotation
                  ?.availableWeeks ||
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
        </div>

        {!selectedConfigId ||
        !selectedClassId ? (
          <EmptyState
            icon={GraduationCap}
            title="Select a Class Timetable"
            description="Choose a timetable configuration, class and section to view the complete weekly schedule."
          />
        ) : loadingTimetable ? (
          <div className="card flex min-h-80 flex-col items-center justify-center">
            <Loader2
              size={32}
              className="animate-spin text-brand-600"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading class timetable...
            </p>
          </div>
        ) : (
          <div
            id="class-timetable-print"
            className="space-y-6"
          >
            {/*
            |--------------------------------------------------------------------------
            | Print Header and Configuration Information
            |--------------------------------------------------------------------------
            */}

            <div className="card p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                    {getSchoolName(
                      timetableData
                        ?.school ||
                      selectedClass
                        ?.schoolId ||
                      user?.schoolId ||
                      user?.school
                    )}
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-800">
                    {getClassName(
                      selectedClass
                    )}
                    {selectedSection
                      ? ` · Section ${selectedSection}`
                      : ""}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {timetableData
                      ?.rotation
                      ?.label ||
                      "Standard Week"}{" "}
                    · Weekly Class Timetable
                  </p>
                </div>

                <div className="space-y-2 text-right">
                  <StatusBadge
                    status={
                      config?.status
                    }
                    isActive={
                      config?.isActive
                    }
                  />

                  <p className="text-xs text-slate-400">
                    Academic Year:{" "}
                    <span className="font-semibold text-slate-600">
                      {config
                        ?.academicYear
                        ?.label ||
                        "—"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2 xl:grid-cols-5">
                <div>
                  <p className="text-slate-400">
                    Timetable
                  </p>

                  <p className="mt-1 font-semibold text-slate-700">
                    {config?.title ||
                      "—"}
                  </p>
                </div>

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
                    Generated
                  </p>

                  <p className="mt-1 font-semibold text-slate-700">
                    {formatDate(
                      new Date()
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Summary
            |--------------------------------------------------------------------------
            */}

            <div className="print-hidden grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={BookOpen}
                label="Weekly Lessons"
                value={
                  summary.lessons
                }
                description="Total assigned teaching entries"
              />

              <SummaryCard
                icon={
                  GraduationCap
                }
                label="Subjects"
                value={
                  summary.subjects
                }
                description="Unique subjects in the timetable"
              />

              <SummaryCard
                icon={Users}
                label="Teachers"
                value={
                  summary.teachers
                }
                description="Unique teachers assigned"
              />

              <SummaryCard
                icon={Clock3}
                label="Free Slots"
                value={
                  summary.freeSlots
                }
                description="Available teaching periods"
              />
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Desktop Timetable
            |--------------------------------------------------------------------------
            */}

            <section className="card hidden overflow-hidden lg:block">
              <div className="overflow-x-auto">
                <table className="print-table min-w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="sticky left-0 z-10 min-w-32 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Day
                      </th>

                      {allPeriods.map(
                        (
                          period
                        ) => (
                          <th
                            key={`${period.sequence}-${period.code}-${period.startTime}`}
                            className="min-w-44 border-b border-r border-slate-200 px-3 py-3 text-left last:border-r-0"
                          >
                            <p className="text-xs font-bold text-slate-700">
                              {period.name}
                            </p>

                            <p className="mt-1 text-[10px] font-medium text-slate-400">
                              {formatTime(
                                period.startTime
                              )}{" "}
                              –{" "}
                              {formatTime(
                                period.endTime
                              )}
                            </p>
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {workingDays.map(
                      (
                        daySchedule
                      ) => (
                        <tr
                          key={
                            daySchedule.day
                          }
                          className="align-top"
                        >
                          <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-4 py-4 text-left">
                            <div className="flex items-center gap-2">
                              <CalendarDays
                                size={15}
                                className="text-brand-600"
                              />

                              <span className="text-sm font-bold text-slate-700">
                                {daySchedule.label ||
                                  formatEnum(
                                    daySchedule.day
                                  )}
                              </span>
                            </div>
                          </th>

                          {allPeriods.map(
                            (
                              period
                            ) => {
                              const matchingPeriod =
                                sortPeriods(
                                  daySchedule.periods
                                ).find(
                                  (
                                    item
                                  ) =>
                                    Number(
                                      item.sequence
                                    ) ===
                                      Number(
                                        period.sequence
                                      ) &&
                                    item.code ===
                                      period.code
                                );

                              if (
                                !matchingPeriod
                              ) {
                                return (
                                  <td
                                    key={`${daySchedule.day}-${period.sequence}`}
                                    className="border-b border-r border-slate-200 bg-slate-50/60 p-3 last:border-r-0"
                                  >
                                    <span className="text-[10px] text-slate-300">
                                      Not available
                                    </span>
                                  </td>
                                );
                              }

                              const entry =
                                entryMap.get(
                                  `${daySchedule.day}:${getRecordId(
                                    matchingPeriod
                                  )}`
                                );

                              if (
                                !isSchedulablePeriod(
                                  matchingPeriod
                                )
                              ) {
                                return (
                                  <td
                                    key={`${daySchedule.day}-${getRecordId(
                                      matchingPeriod
                                    )}`}
                                    className="border-b border-r border-slate-200 bg-slate-50 p-3 text-center last:border-r-0"
                                  >
                                    <p className="text-xs font-bold text-slate-500">
                                      {matchingPeriod.name}
                                    </p>

                                    <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                                      {formatEnum(
                                        matchingPeriod.type
                                      )}
                                    </p>
                                  </td>
                                );
                              }

                              if (!entry) {
                                return (
                                  <td
                                    key={`${daySchedule.day}-${getRecordId(
                                      matchingPeriod
                                    )}`}
                                    className="border-b border-r border-slate-200 p-3 last:border-r-0"
                                  >
                                    <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                                      <span className="text-[10px] font-medium text-slate-400">
                                        Free Period
                                      </span>
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td
                                  key={`${daySchedule.day}-${getRecordId(
                                    matchingPeriod
                                  )}`}
                                  className="border-b border-r border-slate-200 p-3 last:border-r-0"
                                >
                                  <div
                                    className="min-h-24 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                                    style={{
                                      borderLeftWidth:
                                        "4px",
                                      borderLeftColor:
                                        getEntryColor(
                                          entry
                                        )
                                    }}
                                  >
                                    <p className="text-xs font-bold text-slate-800">
                                      {getSubjectName(
                                        entry
                                      )}
                                    </p>

                                    {getSubjectCode(
                                      entry
                                    ) && (
                                      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                                        {getSubjectCode(
                                          entry
                                        )}
                                      </p>
                                    )}

                                    <div className="mt-2 flex items-start gap-1.5">
                                      <UserRound
                                        size={11}
                                        className="mt-0.5 shrink-0 text-slate-400"
                                      />

                                      <p className="text-[10px] leading-4 text-slate-500">
                                        {getTeacherName(
                                          entry
                                        )}
                                      </p>
                                    </div>

                                    <div className="mt-1.5 flex items-start gap-1.5">
                                      <School
                                        size={11}
                                        className="mt-0.5 shrink-0 text-slate-400"
                                      />

                                      <p className="text-[10px] leading-4 text-slate-500">
                                        {getRoomName(
                                          entry
                                        )}
                                      </p>
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-1">
                                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                                        {formatEnum(
                                          entry.entryType
                                        )}
                                      </span>

                                      {entry.isFixed && (
                                        <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-600">
                                          Fixed
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              );
                            }
                          )}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Mobile Timetable
            |--------------------------------------------------------------------------
            */}

            <section className="space-y-4 lg:hidden">
              {workingDays.map(
                (
                  daySchedule
                ) => (
                  <div
                    key={
                      daySchedule.day
                    }
                    className="card overflow-hidden"
                  >
                    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <CalendarDays
                        size={16}
                        className="text-brand-600"
                      />

                      <h3 className="text-sm font-bold text-slate-700">
                        {daySchedule.label ||
                          formatEnum(
                            daySchedule.day
                          )}
                      </h3>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {sortPeriods(
                        daySchedule.periods
                      ).map(
                        (
                          period
                        ) => {
                          const entry =
                            entryMap.get(
                              `${daySchedule.day}:${getRecordId(
                                period
                              )}`
                            );

                          return (
                            <div
                              key={
                                getRecordId(
                                  period
                                )
                              }
                              className="grid grid-cols-[96px_1fr] gap-3 p-4"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-700">
                                  {period.name}
                                </p>

                                <p className="mt-1 text-[10px] leading-4 text-slate-400">
                                  {formatTime(
                                    period.startTime
                                  )}
                                  <br />
                                  {formatTime(
                                    period.endTime
                                  )}
                                </p>
                              </div>

                              {!isSchedulablePeriod(
                                period
                              ) ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center">
                                  <p className="text-xs font-semibold text-slate-500">
                                    {formatEnum(
                                      period.type
                                    )}
                                  </p>
                                </div>
                              ) : !entry ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center">
                                  <p className="text-xs font-medium text-slate-400">
                                    Free Period
                                  </p>
                                </div>
                              ) : (
                                <div
                                  className="rounded-xl border border-slate-200 bg-white p-3"
                                  style={{
                                    borderLeftWidth:
                                      "4px",
                                    borderLeftColor:
                                      getEntryColor(
                                        entry
                                      )
                                  }}
                                >
                                  <p className="text-sm font-bold text-slate-800">
                                    {getSubjectName(
                                      entry
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {getTeacherName(
                                      entry
                                    )}
                                  </p>

                                  <p className="mt-1 text-[11px] text-slate-400">
                                    {getRoomName(
                                      entry
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )
              )}
            </section>

            {workingDays.length ===
            0 && (
              <EmptyState
                icon={Settings2}
                title="No Working Days Configured"
                description="Open Period Settings and add working days before viewing the class timetable."
              />
            )}
          </div>
        )}
      </div>
    );
  };

export default ClassTimetable;
