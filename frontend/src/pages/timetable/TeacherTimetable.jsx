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
  ShieldAlert,
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
  getTeacherTimetable
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

const normalizeText = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    );
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

const getTeacherName = (
  teacher
) => {
  return (
    teacher?.name ||
    teacher?.fullName ||
    [
      teacher?.firstName,
      teacher?.lastName
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed Teacher"
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

const getRoomName = (
  entry
) => {
  return (
    entry?.room?.name ||
    entry?.room?.code ||
    "No room assigned"
  );
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

const normalizeTeacherResponse =
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

      teacher:
        payload.teacher ||
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

      timetableEntries:
        Array.isArray(
          payload.timetableEntries
        )
          ? payload.timetableEntries
          : [],

      grid:
        payload.grid ||
        null,

      workload:
        payload.workload || {
          daily: [],
          weeklyPeriods: 0,
          weeklyTeachingMinutes:
            0,
          maximumWeeklyPeriods:
            0,
          remainingCapacity:
            null,
          isOverloaded:
            false
        }
    };
  };

const findOwnTeacher = (
  teachers,
  user
) => {
  if (
    !Array.isArray(
      teachers
    ) ||
    !user
  ) {
    return null;
  }

  const userEmail =
    normalizeText(
      user.email
    );

  const userPhone =
    normalizeText(
      user.phone
    );

  const userName =
    normalizeText(
      user.name
    );

  return (
    teachers.find(
      (
        teacher
      ) =>
        userEmail &&
        normalizeText(
          teacher.email
        ) ===
          userEmail
    ) ||
    teachers.find(
      (
        teacher
      ) =>
        userPhone &&
        normalizeText(
          teacher.phone
        ) ===
          userPhone
    ) ||
    teachers.find(
      (
        teacher
      ) =>
        userName &&
        normalizeText(
          getTeacherName(
            teacher
          )
        ) ===
          userName
    ) ||
    null
  );
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
  alert = false
}) => {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            alert
              ? "bg-rose-50 text-rose-600"
              : "bg-brand-50 text-brand-700"
          }`}
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

/*
|--------------------------------------------------------------------------
| Teacher Timetable Page
|--------------------------------------------------------------------------
*/

const TeacherTimetable =
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
      teachers,
      setTeachers
    ] = useState([]);

    const [
      selectedTeacherId,
      setSelectedTeacherId
    ] = useState("");

    const [
      teacherSearch,
      setTeacherSearch
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
      ownTeacherId,
      setOwnTeacherId
    ] = useState("");

    const [
      loadingSchools,
      setLoadingSchools
    ] = useState(false);

    const [
      loadingConfigs,
      setLoadingConfigs
    ] = useState(false);

    const [
      loadingTeachers,
      setLoadingTeachers
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
    | Load Teachers
    |--------------------------------------------------------------------------
    */

    const loadTeachers =
      useCallback(
        async () => {
          const schoolId =
            userRole ===
            "super_admin"
              ? selectedSchoolId
              : assignedSchoolId;

          if (!schoolId) {
            setTeachers([]);
            setSelectedTeacherId(
              ""
            );
            setOwnTeacherId("");

            return;
          }

          setLoadingTeachers(
            true
          );

          try {
            const response =
              await api.get(
                "/teachers",
                {
                  params: {
                    schoolId,
                    limit: 300,
                    status:
                      "active"
                  }
                }
              );

            const items =
              extractArray(
                response,
                "teachers"
              );

            const ownTeacher =
              userRole ===
              "teacher"
                ? findOwnTeacher(
                    items,
                    user
                  )
                : null;

            const ownId =
              getRecordId(
                ownTeacher
              );

            setTeachers(items);
            setOwnTeacherId(
              ownId
            );

            setSelectedTeacherId(
              (
                current
              ) => {
                if (ownId) {
                  return ownId;
                }

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
                "Teachers could not be loaded."
              )
            );
          } finally {
            setLoadingTeachers(
              false
            );
          }
        },
        [
          assignedSchoolId,
          selectedSchoolId,
          showToast,
          user,
          userRole
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Load Teacher Timetable
    |--------------------------------------------------------------------------
    */

    const loadTimetable =
      useCallback(
        async (
          options = {}
        ) => {
          const teacherId =
            options.teacherId ||
            selectedTeacherId;

          const rotationCode =
            options.rotationCode ||
            selectedRotation;

          if (
            !teacherId ||
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
              await getTeacherTimetable(
                teacherId,
                {
                  timetableConfigId:
                    selectedConfigId,

                  schoolId:
                    userRole ===
                      "super_admin"
                      ? selectedSchoolId
                      : undefined,

                  rotationWeekCode:
                    rotationCode
                }
              );

            const normalized =
              normalizeTeacherResponse(
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
                "Teacher timetable could not be loaded."
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
          selectedConfigId,
          selectedRotation,
          selectedSchoolId,
          selectedTeacherId,
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
      loadTeachers();
    }, [
      loadConfigurations,
      loadTeachers
    ]);

    useEffect(() => {
      if (
        selectedConfigId &&
        selectedTeacherId
      ) {
        loadTimetable({
          rotationCode:
            "STANDARD"
        });
      } else {
        setTimetableData(
          null
        );
      }
    }, [
      selectedConfigId,
      selectedTeacherId
    ]);

    /*
    |--------------------------------------------------------------------------
    | Derived Data
    |--------------------------------------------------------------------------
    */

    const filteredTeachers =
      useMemo(() => {
        const query =
          teacherSearch
            .trim()
            .toLowerCase();

        return teachers.filter(
          (
            teacher
          ) => {
            if (!query) {
              return true;
            }

            return [
              getTeacherName(
                teacher
              ),
              teacher.employeeId,
              teacher.email,
              teacher.phone,
              teacher.qualification
            ]
              .filter(Boolean)
              .some(
                (
                  value
                ) =>
                  String(value)
                    .toLowerCase()
                    .includes(
                      query
                    )
              );
          }
        );
      }, [
        teacherSearch,
        teachers
      ]);

    const selectedTeacher =
      useMemo(() => {
        return (
          timetableData
            ?.teacher ||
          teachers.find(
            (
              teacher
            ) =>
              getRecordId(
                teacher
              ) ===
              selectedTeacherId
          ) ||
          null
        );
      }, [
        selectedTeacherId,
        teachers,
        timetableData
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

    const rotation =
      timetableData
        ?.rotation || {
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

    const workload =
      timetableData
        ?.workload || {
        daily: [],
        weeklyPeriods: 0,
        weeklyTeachingMinutes:
          0,
        maximumWeeklyPeriods:
          0,
        remainingCapacity:
          null,
        isOverloaded:
          false
      };

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
            String(
              entry?.entryStatus ||
              "scheduled"
            ) ===
            "scheduled"
        );
      }, [
        timetableData
      ]);

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

    const classCount =
      useMemo(() => {
        return new Set(
          timetableEntries.map(
            (
              entry
            ) =>
              getRecordId(
                entry.classId
              ) ||
              `${getClassName(
                entry
              )}:${getSectionName(
                entry
              )}`
          )
        ).size;
      }, [
        timetableEntries
      ]);

    const subjectCount =
      useMemo(() => {
        return new Set(
          timetableEntries.map(
            (
              entry
            ) =>
              getRecordId(
                entry.subjectId
              ) ||
              getSubjectName(
                entry
              )
          )
        ).size;
      }, [
        timetableEntries
      ]);

    const isOwnTimetable =
      Boolean(
        ownTeacherId &&
        ownTeacherId ===
          selectedTeacherId
      );

    const lockTeacherSelector =
      userRole ===
        "teacher" &&
      Boolean(ownTeacherId);

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

        setSelectedTeacherId(
          ""
        );

        setOwnTeacherId("");
        setConfigs([]);
        setTeachers([]);
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
    | CSV Export
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
            "Room",
            "Entry Type",
            "Delivery Mode",
            "Fixed"
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
                  entry
                ),

                getSectionName(
                  entry
                ),

                getSubjectName(
                  entry
                ),

                getSubjectCode(
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
                ),

                entry.isFixed
                  ? "Yes"
                  : "No"
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

        link.href = url;

        link.download =
          `${getTeacherName(
            selectedTeacher
          )}-Timetable.csv`
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
          description="Your account does not have permission to view teacher timetables."
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

              #teacher-timetable-print,
              #teacher-timetable-print * {
                visibility: visible !important;
              }

              #teacher-timetable-print {
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
              <UserRound
                size={21}
              />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
                Teacher Timetable
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                View teaching assignments, daily workload, rooms and class schedules.
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
                !selectedTeacherId ||
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
                Search Teacher
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
                    teacherSearch
                  }
                  onChange={(
                    event
                  ) =>
                    setTeacherSearch(
                      event.target.value
                    )
                  }
                  placeholder="Name, employee ID..."
                  disabled={
                    lockTeacherSelector
                  }
                />
              </div>
            </div>

            <div>
              <label className="field-label">
                Teacher
              </label>

              <select
                className="field-select"
                value={
                  selectedTeacherId
                }
                onChange={(
                  event
                ) =>
                  setSelectedTeacherId(
                    event.target.value
                  )
                }
                disabled={
                  loadingTeachers ||
                  !selectedSchoolId ||
                  lockTeacherSelector
                }
              >
                <option value="">
                  Select teacher
                </option>

                {filteredTeachers.map(
                  (
                    teacher
                  ) => (
                    <option
                      key={
                        getRecordId(
                          teacher
                        )
                      }
                      value={
                        getRecordId(
                          teacher
                        )
                      }
                    >
                      {getTeacherName(
                        teacher
                      )}
                      {teacher.employeeId
                        ? ` · ${teacher.employeeId}`
                        : ""}
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
                  !selectedTeacherId ||
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
          </div>

          {userRole ===
            "teacher" &&
            ownTeacherId && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-brand-700"
              />

              <p className="text-xs leading-5 text-brand-800">
                Your login profile has been matched with teacher record{" "}
                <strong>
                  {getTeacherName(
                    selectedTeacher
                  )}
                </strong>
                . This page is showing your timetable.
              </p>
            </div>
          )}

          {userRole ===
            "teacher" &&
            !ownTeacherId &&
            teachers.length >
              0 && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <p className="text-xs leading-5 text-amber-800">
                Your user profile could not be matched automatically with a teacher record. Select the correct teacher from the list.
              </p>
            </div>
          )}
        </div>

        {!selectedConfigId ||
        !selectedTeacherId ? (
          <EmptyState
            icon={UserRound}
            title="Select a Teacher Timetable"
            description="Choose a timetable configuration and teacher to view the complete weekly teaching schedule."
          />
        ) : loadingTimetable ? (
          <div className="card flex min-h-80 flex-col items-center justify-center">
            <Loader2
              size={32}
              className="animate-spin text-brand-600"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading teacher timetable...
            </p>
          </div>
        ) : (
          <div
            id="teacher-timetable-print"
            className="space-y-6"
          >
            {/*
            |--------------------------------------------------------------------------
            | Teacher Profile and Print Header
            |--------------------------------------------------------------------------
            */}

            <div className="card p-4 sm:p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 text-brand-700">
                    {selectedTeacher
                      ?.teacherPhoto ? (
                      <img
                        src={
                          selectedTeacher
                            .teacherPhoto
                        }
                        alt={getTeacherName(
                          selectedTeacher
                        )}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound
                        size={26}
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-800">
                        {getTeacherName(
                          selectedTeacher
                        )}
                      </h2>

                      {isOwnTimetable && (
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
                          My Timetable
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span>
                        Employee ID:{" "}
                        <strong className="text-slate-700">
                          {selectedTeacher
                            ?.employeeId ||
                            "—"}
                        </strong>
                      </span>

                      <span>
                        Qualification:{" "}
                        <strong className="text-slate-700">
                          {selectedTeacher
                            ?.qualification ||
                            "—"}
                        </strong>
                      </span>

                      <span>
                        Status:{" "}
                        <strong className="capitalize text-slate-700">
                          {selectedTeacher
                            ?.status ||
                            "active"}
                        </strong>
                      </span>
                    </div>
                  </div>
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
                    {rotation.label} ·{" "}
                    {config
                      ?.academicYear
                      ?.label ||
                      "No academic year"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2 xl:grid-cols-5">
                <div>
                  <p className="text-slate-400">
                    School
                  </p>

                  <p className="mt-1 font-semibold text-slate-700">
                    {getSchoolName(
                      selectedTeacher
                        ?.schoolId ||
                      user?.schoolId ||
                      user?.school
                    )}
                  </p>
                </div>

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
            | Workload Summary
            |--------------------------------------------------------------------------
            */}

            <div className="print-hidden grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={BookOpen}
                label="Weekly Periods"
                value={
                  workload.weeklyPeriods ||
                  0
                }
                description={
                  workload.maximumWeeklyPeriods >
                  0
                    ? `Maximum allowed: ${workload.maximumWeeklyPeriods}`
                    : "No weekly limit configured"
                }
                alert={
                  workload.isOverloaded
                }
              />

              <SummaryCard
                icon={Clock3}
                label="Teaching Time"
                value={formatMinutes(
                  workload.weeklyTeachingMinutes
                )}
                description="Total weekly teaching duration"
              />

              <SummaryCard
                icon={
                  GraduationCap
                }
                label="Classes"
                value={classCount}
                description="Unique class and section assignments"
              />

              <SummaryCard
                icon={Users}
                label="Subjects"
                value={
                  subjectCount
                }
                description={
                  workload.remainingCapacity ===
                  null
                    ? "Unique subjects taught"
                    : `${workload.remainingCapacity} periods remaining`
                }
              />
            </div>

            {workload.isOverloaded && (
              <div className="print-hidden flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                <AlertTriangle
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="text-sm font-bold">
                    Teacher Workload Exceeded
                  </p>

                  <p className="mt-1 text-xs leading-5">
                    This teacher has{" "}
                    {workload.weeklyPeriods}{" "}
                    weekly periods, exceeding the configured maximum of{" "}
                    {workload.maximumWeeklyPeriods}.
                  </p>
                </div>
              </div>
            )}

            {/*
            |--------------------------------------------------------------------------
            | Daily Workload
            |--------------------------------------------------------------------------
            */}

            <section className="print-hidden card p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <CalendarDays
                  size={17}
                  className="text-brand-600"
                />

                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Daily Workload
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Teaching periods and minutes scheduled for each working day.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {(workload.daily || []).map(
                  (
                    day
                  ) => (
                    <div
                      key={
                        day.day
                      }
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                    >
                      <p className="text-xs font-bold text-slate-700">
                        {formatEnum(
                          day.day
                        )}
                      </p>

                      <div className="mt-2 flex items-end justify-between gap-3">
                        <p className="text-lg font-bold text-slate-800">
                          {day.periods}
                        </p>

                        <p className="text-[10px] font-medium text-slate-400">
                          {formatMinutes(
                            day.teachingMinutes
                          )}
                        </p>
                      </div>

                      <p className="mt-1 text-[10px] text-slate-400">
                        teaching periods
                      </p>
                    </div>
                  )
                )}
              </div>
            </section>

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
                                matchingPeriod
                                  .isSchedulable ===
                                  false
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
                                      <GraduationCap
                                        size={11}
                                        className="mt-0.5 shrink-0 text-slate-400"
                                      />

                                      <p className="text-[10px] leading-4 text-slate-500">
                                        {getClassName(
                                          entry
                                        )}
                                        {getSectionName(
                                          entry
                                        )
                                          ? ` · Section ${getSectionName(
                                              entry
                                            )}`
                                          : ""}
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
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2">
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

                      <span className="text-[10px] font-semibold text-slate-400">
                        {
                          timetableEntries.filter(
                            (
                              entry
                            ) =>
                              entry.day ===
                              daySchedule.day
                          ).length
                        }{" "}
                        lessons
                      </span>
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

                              {period
                                .isSchedulable ===
                                false ? (
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
                                    {getClassName(
                                      entry
                                    )}
                                    {getSectionName(
                                      entry
                                    )
                                      ? ` · Section ${getSectionName(
                                          entry
                                        )}`
                                      : ""}
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
                description="Open Period Settings and add working days before viewing the teacher timetable."
                action={
                  canManage ? (
                    <button
                      type="button"
                      className="btn-primary mt-5 print-hidden"
                      onClick={() =>
                        navigate(
                          "/timetable/period-settings"
                        )
                      }
                    >
                      <Settings2
                        size={16}
                      />
                      Open Period Settings
                    </button>
                  ) : null
                }
              />
            )}
          </div>
        )}
      </div>
    );
  };

export default TeacherTimetable;
