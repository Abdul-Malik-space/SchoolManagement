import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  AlertTriangle,
  Archive,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  FilePlus2,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Trash2,
  Unlock,
  X
} from "lucide-react";

import api from "../../api/axios";

import {
  archiveTimetableConfig,
  createTimetableConfig,
  getPeriodSettings,
  getTimetableConfigs,
  publishTimetableConfig,
  returnTimetableToDraft,
  setTimetableLock,
  updatePeriodSettings
} from "../../api/timetableConfigs";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const DAYS = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"]
];

const PERIOD_TYPES = [
  ["instructional", "Instructional"],
  ["assembly", "Assembly"],
  ["homeroom", "Homeroom"],
  ["advisory", "Advisory"],
  ["break", "Break"],
  ["lunch", "Lunch"],
  ["prayer", "Prayer"],
  ["activity", "Activity"],
  ["exam", "Exam"],
  ["transition", "Transition"],
  ["other", "Other"]
];

const SCHEDULABLE_TYPES = [
  "instructional",
  "homeroom",
  "advisory",
  "activity",
  "exam"
];

const MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const makeClientId = () => {
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
};

const getId = (
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

const unwrap = (
  response
) => {
  return response?.data ?? response;
};

const extractArray = (
  value,
  keys = []
) => {
  const candidates = [
    ...keys.map(
      (
        key
      ) => value?.[key]
    ),

    ...keys.map(
      (
        key
      ) => value?.data?.[key]
    ),

    value?.data,
    value
  ];

  return (
    candidates.find(
      Array.isArray
    ) || []
  );
};

const getErrorMessage = (
  error,
  fallback
) => {
  const details =
    error?.response?.data?.details;

  if (
    Array.isArray(details) &&
    details.length
  ) {
    return details.join(" ");
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const isTime = (
  value
) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(
    String(value || "")
  );
};

const toMinutes = (
  value
) => {
  if (!isTime(value)) {
    return null;
  }

  const [
    hours,
    minutes
  ] = value
    .split(":")
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
};

const toTime = (
  totalMinutes
) => {
  const safe =
    Math.max(
      0,
      Math.min(
        1439,
        Number(totalMinutes) ||
          0
      )
    );

  const hours =
    Math.floor(
      safe / 60
    );

  const minutes =
    safe % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};

const duration = (
  startTime,
  endTime
) => {
  const start =
    toMinutes(startTime);

  const end =
    toMinutes(endTime);

  if (
    start === null ||
    end === null ||
    end <= start
  ) {
    return 0;
  }

  return end - start;
};

const formatMinutes = (
  value
) => {
  const minutes =
    Number(value) || 0;

  const hours =
    Math.floor(
      minutes / 60
    );

  const remainder =
    minutes % 60;

  if (!hours) {
    return `${remainder} min`;
  }

  return remainder
    ? `${hours} hr ${remainder} min`
    : `${hours} hr`;
};

const currentAcademicYear =
  () => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const startYear =
      now.getMonth() >= 6
        ? year
        : year - 1;

    return {
      label:
        `${startYear}-${startYear + 1}`,

      startDate:
        `${startYear}-08-01`,

      endDate:
        `${startYear + 1}-06-30`
    };
  };

const makePeriod = (
  overrides = {}
) => {
  const type =
    overrides.type ||
    "instructional";

  const schedulable =
    SCHEDULABLE_TYPES.includes(
      type
    );

  const startTime =
    overrides.startTime ||
    "08:00";

  const endTime =
    overrides.endTime ||
    "08:40";

  return {
    _clientId:
      makeClientId(),

    sequence:
      overrides.sequence || 1,

    code:
      overrides.code || "P1",

    name:
      overrides.name ||
      "Period 1",

    shortName:
      overrides.shortName ||
      overrides.name ||
      "P1",

    type,
    startTime,
    endTime,

    durationMinutes:
      duration(
        startTime,
        endTime
      ),

    isInstructional:
      schedulable,

    isSchedulable:
      schedulable,

    allowDoublePeriod:
      overrides.allowDoublePeriod ??
      schedulable,

    requiresTeacher:
      overrides.requiresTeacher ??
      schedulable,

    requiresSubject:
      overrides.requiresSubject ??
      schedulable,

    resourceType:
      overrides.resourceType ||
      (schedulable
        ? "classroom"
        : "none"),

    roomRequired:
      overrides.roomRequired ??
      false,

    notes:
      overrides.notes || "",

    isActive:
      overrides.isActive ??
      true
  };
};

const defaultPeriods = () => {
  return [
    makePeriod({
      sequence: 1,
      code: "ASSEMBLY",
      name: "Morning Assembly",
      shortName: "Assembly",
      type: "assembly",
      startTime: "08:00",
      endTime: "08:20",
      requiresTeacher: false,
      requiresSubject: false,
      allowDoublePeriod: false,
      resourceType:
        "assembly_hall"
    }),

    makePeriod({
      sequence: 2,
      code: "P1",
      name: "Period 1",
      startTime: "08:20",
      endTime: "09:00"
    }),

    makePeriod({
      sequence: 3,
      code: "P2",
      name: "Period 2",
      startTime: "09:00",
      endTime: "09:40"
    }),

    makePeriod({
      sequence: 4,
      code: "BREAK",
      name: "Morning Break",
      shortName: "Break",
      type: "break",
      startTime: "09:40",
      endTime: "10:00",
      requiresTeacher: false,
      requiresSubject: false,
      allowDoublePeriod: false,
      resourceType: "none"
    }),

    makePeriod({
      sequence: 5,
      code: "P3",
      name: "Period 3",
      startTime: "10:00",
      endTime: "10:40"
    }),

    makePeriod({
      sequence: 6,
      code: "P4",
      name: "Period 4",
      startTime: "10:40",
      endTime: "11:20"
    }),

    makePeriod({
      sequence: 7,
      code: "LUNCH",
      name: "Lunch / Prayer",
      shortName: "Lunch",
      type: "lunch",
      startTime: "11:20",
      endTime: "11:50",
      requiresTeacher: false,
      requiresSubject: false,
      allowDoublePeriod: false,
      resourceType: "none"
    }),

    makePeriod({
      sequence: 8,
      code: "P5",
      name: "Period 5",
      startTime: "11:50",
      endTime: "12:30"
    }),

    makePeriod({
      sequence: 9,
      code: "P6",
      name: "Period 6",
      startTime: "12:30",
      endTime: "13:10"
    })
  ];
};

const defaultDays = () => {
  return DAYS.map(
    (
      [
        value,
        label
      ],
      index
    ) => {
      const working =
        index < 5;

      return {
        day: value,
        label,
        isWorkingDay:
          working,
        isHalfDay:
          false,
        periods:
          working
            ? defaultPeriods()
            : [],
        notes: ""
      };
    }
  );
};

const defaultRules = () => {
  return {
    maximumTeacherPeriodsPerDay:
      8,

    maximumTeacherPeriodsPerWeek:
      40,

    maximumClassPeriodsPerDay:
      10,

    maximumConsecutiveTeacherPeriods:
      3,

    maximumConsecutiveClassPeriods:
      4,

    minimumTeacherFreePeriodsPerDay:
      1,

    minimumTeacherBreakMinutes:
      20,

    allowDoublePeriods:
      true,

    preventTeacherConflicts:
      true,

    preventClassConflicts:
      true,

    preventRoomConflicts:
      true,

    requireRoomAssignment:
      false,

    allowUnassignedTeacher:
      false,

    allowUnassignedSubject:
      false,

    allowSchedulingOnNonInstructionalPeriods:
      false,

    enforceTeacherAvailability:
      true,

    enforceTeacherWorkload:
      true
  };
};

const normalizeDays = (
  source
) => {
  const existing =
    Array.isArray(source)
      ? source
      : [];

  return DAYS.map(
    (
      [
        day,
        label
      ]
    ) => {
      const found =
        existing.find(
          (
            item
          ) =>
            item.day === day
        );

      if (!found) {
        return {
          day,
          label,
          isWorkingDay:
            false,
          isHalfDay:
            false,
          periods: [],
          notes: ""
        };
      }

      return {
        ...found,
        day,
        label:
          found.label ||
          label,

        periods:
          (found.periods || [])
            .map(
              (
                period,
                index
              ) => {
                const type =
                  period.type ||
                  "instructional";

                return {
                  ...period,

                  _clientId:
                    period._clientId ||
                    getId(period) ||
                    makeClientId(),

                  sequence:
                    Number(
                      period.sequence
                    ) ||
                    index + 1,

                  durationMinutes:
                    duration(
                      period.startTime,
                      period.endTime
                    ),

                  isInstructional:
                    SCHEDULABLE_TYPES.includes(
                      type
                    ),

                  isSchedulable:
                    SCHEDULABLE_TYPES.includes(
                      type
                    )
                };
              }
            )
            .sort(
              (
                first,
                second
              ) =>
                first.sequence -
                second.sequence
            )
      };
    }
  );
};

const sanitizeDays = (
  daySchedules
) => {
  return daySchedules.map(
    (
      daySchedule
    ) => ({
      day:
        daySchedule.day,

      label:
        daySchedule.label,

      isWorkingDay:
        Boolean(
          daySchedule.isWorkingDay
        ),

      isHalfDay:
        Boolean(
          daySchedule.isHalfDay
        ),

      notes:
        daySchedule.notes ||
        "",

      periods:
        daySchedule.isWorkingDay
          ? daySchedule.periods.map(
              (
                period,
                index
              ) => {
                const {
                  _clientId,
                  ...cleanPeriod
                } = period;

                const schedulable =
                  SCHEDULABLE_TYPES.includes(
                    cleanPeriod.type
                  );

                return {
                  ...cleanPeriod,

                  sequence:
                    index + 1,

                  code:
                    String(
                      cleanPeriod.code ||
                      `P${index + 1}`
                    )
                      .trim()
                      .toUpperCase()
                      .replace(
                        /\s+/g,
                        "-"
                      ),

                  name:
                    String(
                      cleanPeriod.name ||
                      `Period ${index + 1}`
                    ).trim(),

                  shortName:
                    String(
                      cleanPeriod.shortName ||
                      cleanPeriod.name ||
                      `P${index + 1}`
                    ).trim(),

                  durationMinutes:
                    duration(
                      cleanPeriod.startTime,
                      cleanPeriod.endTime
                    ),

                  isInstructional:
                    schedulable,

                  isSchedulable:
                    schedulable,

                  allowDoublePeriod:
                    schedulable
                      ? Boolean(
                          cleanPeriod.allowDoublePeriod
                        )
                      : false,

                  requiresTeacher:
                    schedulable
                      ? Boolean(
                          cleanPeriod.requiresTeacher
                        )
                      : false,

                  requiresSubject:
                    schedulable
                      ? Boolean(
                          cleanPeriod.requiresSubject
                        )
                      : false,

                  resourceType:
                    cleanPeriod.resourceType ||
                    (schedulable
                      ? "classroom"
                      : "none"),

                  roomRequired:
                    Boolean(
                      cleanPeriod.roomRequired
                    ),

                  isActive:
                    cleanPeriod.isActive !==
                    false
                };
              }
            )
          : []
    })
  );
};

const validateSchedules = (
  daySchedules
) => {
  const errors = [];

  const workingDays =
    daySchedules.filter(
      (
        day
      ) =>
        day.isWorkingDay
    );

  if (!workingDays.length) {
    errors.push(
      "Enable at least one working day."
    );
  }

  workingDays.forEach(
    (
      daySchedule
    ) => {
      if (
        !daySchedule.periods.length
      ) {
        errors.push(
          `${daySchedule.label} requires at least one period.`
        );

        return;
      }

      const codes =
        new Set();

      const ordered = [
        ...daySchedule.periods
      ].sort(
        (
          first,
          second
        ) =>
          (toMinutes(
            first.startTime
          ) || 0) -
          (toMinutes(
            second.startTime
          ) || 0)
      );

      ordered.forEach(
        (
          period,
          index
        ) => {
          const code =
            String(
              period.code || ""
            )
              .trim()
              .toUpperCase();

          if (!code) {
            errors.push(
              `${daySchedule.label}: period code is required.`
            );
          }

          if (
            codes.has(code)
          ) {
            errors.push(
              `${daySchedule.label}: ${code} is duplicated.`
            );
          }

          codes.add(code);

          if (
            !period.name?.trim()
          ) {
            errors.push(
              `${daySchedule.label}: period name is required.`
            );
          }

          const start =
            toMinutes(
              period.startTime
            );

          const end =
            toMinutes(
              period.endTime
            );

          if (
            start === null ||
            end === null ||
            end <= start
          ) {
            errors.push(
              `${daySchedule.label}: ${period.name || "period"} has invalid time.`
            );
          }

          if (index > 0) {
            const previousEnd =
              toMinutes(
                ordered[
                  index - 1
                ].endTime
              );

            if (
              previousEnd !==
                null &&
              start <
                previousEnd
            ) {
              errors.push(
                `${daySchedule.label}: ${period.name} overlaps with ${ordered[index - 1].name}.`
              );
            }
          }
        }
      );
    }
  );

  return errors;
};

const StatusBadge = ({
  status,
  active
}) => {
  const normalized =
    String(
      status || "draft"
    ).toLowerCase();

  const styles = {
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
          styles[normalized] ||
          styles.draft
        }`}
      >
        {normalized}
      </span>

      {active && (
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
          Active
        </span>
      )}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

const PeriodSettings =
  () => {
    const {
      user
    } = useAuth();

    const role =
      String(
        user?.role || ""
      ).toLowerCase();

    const canManage =
      MANAGEMENT_ROLES.includes(
        role
      );

    const assignedSchoolId =
      getId(
        user?.schoolId ||
        user?.school
      );

    const [
      schools,
      setSchools
    ] = useState([]);

    const [
      selectedSchoolId,
      setSelectedSchoolId
    ] = useState(
      role ===
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
      selectedConfig,
      setSelectedConfig
    ] = useState(null);

    const [
      daySchedules,
      setDaySchedules
    ] = useState(
      defaultDays
    );

    const [
      rules,
      setRules
    ] = useState(
      defaultRules
    );

    const [
      weekStartsOn,
      setWeekStartsOn
    ] = useState(
      "monday"
    );

    const [
      expandedDays,
      setExpandedDays
    ] = useState({
      monday: true
    });

    const [
      loading,
      setLoading
    ] = useState(false);

    const [
      saving,
      setSaving
    ] = useState(false);

    const [
      actionLoading,
      setActionLoading
    ] = useState("");

    const [
      createOpen,
      setCreateOpen
    ] = useState(false);

    const [
      rulesOpen,
      setRulesOpen
    ] = useState(false);

    const [
      dirty,
      setDirty
    ] = useState(false);

    const [
      notice,
      setNotice
    ] = useState(null);

    const academicYear =
      useMemo(
        currentAcademicYear,
        []
      );

    const [
      createForm,
      setCreateForm
    ] = useState({
      schoolId:
        role ===
          "super_admin"
          ? ""
          : assignedSchoolId,

      title:
        `Main Timetable ${academicYear.label}`,

      code:
        `TT-${academicYear.label}`,

      description:
        "Main academic timetable and period structure.",

      academicYearLabel:
        academicYear.label,

      academicYearStart:
        academicYear.startDate,

      academicYearEnd:
        academicYear.endDate,

      effectiveFrom:
        academicYear.startDate,

      effectiveTo:
        academicYear.endDate,

      timezone:
        "Asia/Karachi",

      locale:
        "en-US"
    });

    const notify =
      useCallback(
        (
          type,
          message
        ) => {
          setNotice({
            type,
            message
          });

          window.setTimeout(
            () =>
              setNotice(
                null
              ),
            4000
          );
        },
        []
      );

    const loadSchools =
      useCallback(
        async () => {
          if (
            role !==
            "super_admin"
          ) {
            return;
          }

          try {
            const response =
              await api.get(
                "/schools",
                {
                  params: {
                    limit: 100,
                    status: "active"
                  }
                }
              );

            setSchools(
              extractArray(
                unwrap(
                  response
                ),
                [
                  "schools"
                ]
              )
            );
          } catch (error) {
            notify(
              "error",
              getErrorMessage(
                error,
                "Schools could not be loaded."
              )
            );
          }
        },
        [
          notify,
          role
        ]
      );

    const loadConfigs =
      useCallback(
        async (
          preferredId = ""
        ) => {
          const schoolId =
            role ===
            "super_admin"
              ? selectedSchoolId
              : assignedSchoolId;

          if (!schoolId) {
            setConfigs([]);
            setSelectedConfigId("");
            setSelectedConfig(null);

            return;
          }

          setLoading(true);

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
              extractArray(
                response,
                [
                  "timetableConfigs"
                ]
              );

            setConfigs(
              items
            );

            const active =
              items.find(
                (
                  item
                ) =>
                  item.isActive
              );

            const nextId =
              preferredId ||
              getId(active) ||
              getId(items[0]);

            setSelectedConfigId(
              nextId
            );

            if (
              !items.length &&
              canManage
            ) {
              setCreateForm(
                (
                  current
                ) => ({
                  ...current,
                  schoolId
                })
              );

              setCreateOpen(
                true
              );
            }
          } catch (error) {
            notify(
              "error",
              getErrorMessage(
                error,
                "Timetable configurations could not be loaded."
              )
            );
          } finally {
            setLoading(false);
          }
        },
        [
          assignedSchoolId,
          canManage,
          notify,
          role,
          selectedSchoolId
        ]
      );

    const loadSettings =
      useCallback(
        async (
          configId
        ) => {
          if (!configId) {
            return;
          }

          setLoading(true);

          try {
            const response =
              await getPeriodSettings(
                configId
              );

            const config =
              response?.timetableConfig ||
              response?.data?.timetableConfig ||
              response?.data ||
              response;

            const settings =
              response?.periodSettings ||
              response?.data?.periodSettings ||
              config;

            setSelectedConfig(
              config
            );

            setDaySchedules(
              normalizeDays(
                settings?.daySchedules ||
                config?.daySchedules
              )
            );

            setRules({
              ...defaultRules(),
              ...(
                settings?.rules ||
                config?.rules ||
                {}
              )
            });

            setWeekStartsOn(
              settings?.weekStartsOn ||
              config?.weekStartsOn ||
              "monday"
            );

            setDirty(false);
          } catch (error) {
            notify(
              "error",
              getErrorMessage(
                error,
                "Period settings could not be loaded."
              )
            );
          } finally {
            setLoading(false);
          }
        },
        [
          notify
        ]
      );

    useEffect(() => {
      loadSchools();
    }, [
      loadSchools
    ]);

    useEffect(() => {
      if (
        role !==
        "super_admin"
      ) {
        setSelectedSchoolId(
          assignedSchoolId
        );
      }
    }, [
      assignedSchoolId,
      role
    ]);

    useEffect(() => {
      loadConfigs();
    }, [
      loadConfigs
    ]);

    useEffect(() => {
      if (
        selectedConfigId
      ) {
        loadSettings(
          selectedConfigId
        );
      }
    }, [
      loadSettings,
      selectedConfigId
    ]);

    const summary =
      useMemo(() => {
        return daySchedules.reduce(
          (
            result,
            day
          ) => {
            if (
              !day.isWorkingDay
            ) {
              return result;
            }

            result.workingDays +=
              1;

            day.periods.forEach(
              (
                period
              ) => {
                if (
                  period.isActive ===
                  false
                ) {
                  return;
                }

                result.totalSlots +=
                  1;

                if (
                  SCHEDULABLE_TYPES.includes(
                    period.type
                  )
                ) {
                  result.teachingSlots +=
                    1;

                  result.instructionMinutes +=
                    duration(
                      period.startTime,
                      period.endTime
                    );
                }
              }
            );

            return result;
          },
          {
            workingDays: 0,
            totalSlots: 0,
            teachingSlots: 0,
            instructionMinutes:
              0
          }
        );
      }, [
        daySchedules
      ]);

    const updateDay =
      (
        dayValue,
        updater
      ) => {
        setDaySchedules(
          (
            current
          ) =>
            current.map(
              (
                day
              ) =>
                day.day ===
                dayValue
                  ? typeof updater ===
                    "function"
                    ? updater(day)
                    : {
                        ...day,
                        ...updater
                      }
                  : day
            )
        );

        setDirty(true);
      };

    const updatePeriod =
      (
        dayValue,
        clientId,
        field,
        value
      ) => {
        updateDay(
          dayValue,
          (
            day
          ) => ({
            ...day,

            periods:
              day.periods.map(
                (
                  period
                ) => {
                  if (
                    period._clientId !==
                    clientId
                  ) {
                    return period;
                  }

                  const next = {
                    ...period,
                    [field]: value
                  };

                  if (
                    field ===
                    "type"
                  ) {
                    const schedulable =
                      SCHEDULABLE_TYPES.includes(
                        value
                      );

                    next.isInstructional =
                      schedulable;

                    next.isSchedulable =
                      schedulable;

                    if (
                      !schedulable
                    ) {
                      next.requiresTeacher =
                        false;

                      next.requiresSubject =
                        false;

                      next.allowDoublePeriod =
                        false;
                    }
                  }

                  next.durationMinutes =
                    duration(
                      next.startTime,
                      next.endTime
                    );

                  return next;
                }
              )
          })
        );
      };

    const addPeriod =
      (
        dayValue
      ) => {
        updateDay(
          dayValue,
          (
            day
          ) => {
            const last =
              day.periods[
                day.periods.length -
                  1
              ];

            const startTime =
              last?.endTime ||
              "08:00";

            const endTime =
              toTime(
                (toMinutes(
                  startTime
                ) || 480) +
                  40
              );

            const sequence =
              day.periods.length +
              1;

            return {
              ...day,

              periods: [
                ...day.periods,

                makePeriod({
                  sequence,
                  code:
                    `P${sequence}`,
                  name:
                    `Period ${sequence}`,
                  startTime,
                  endTime
                })
              ]
            };
          }
        );
      };

    const duplicatePeriod =
      (
        dayValue,
        period
      ) => {
        updateDay(
          dayValue,
          (
            day
          ) => {
            const index =
              day.periods.findIndex(
                (
                  item
                ) =>
                  item._clientId ===
                  period._clientId
              );

            const copied = {
              ...period,
              _id: undefined,
              _clientId:
                makeClientId(),
              code:
                `${period.code}-COPY`,
              name:
                `${period.name} Copy`,
              startTime:
                period.endTime,
              endTime:
                toTime(
                  (toMinutes(
                    period.endTime
                  ) || 0) +
                    (
                      duration(
                        period.startTime,
                        period.endTime
                      ) || 40
                    )
                )
            };

            const periods = [
              ...day.periods
            ];

            periods.splice(
              index + 1,
              0,
              copied
            );

            return {
              ...day,

              periods:
                periods.map(
                  (
                    item,
                    itemIndex
                  ) => ({
                    ...item,
                    sequence:
                      itemIndex + 1
                  })
                )
            };
          }
        );
      };

    const removePeriod =
      (
        dayValue,
        clientId
      ) => {
        if (
          !window.confirm(
            "Remove this period?"
          )
        ) {
          return;
        }

        updateDay(
          dayValue,
          (
            day
          ) => ({
            ...day,

            periods:
              day.periods
                .filter(
                  (
                    period
                  ) =>
                    period._clientId !==
                    clientId
                )
                .map(
                  (
                    period,
                    index
                  ) => ({
                    ...period,
                    sequence:
                      index + 1
                  })
                )
          })
        );
      };

    const copyDay =
      (
        sourceDay
      ) => {
        const target =
          window.prompt(
            "Enter target day: monday, tuesday, wednesday, thursday, friday, saturday or sunday"
          );

        if (
          !target ||
          target ===
          sourceDay.day
        ) {
          return;
        }

        const valid =
          DAYS.some(
            (
              [
                value
              ]
            ) =>
              value ===
              target
          );

        if (!valid) {
          notify(
            "error",
            "Invalid target day."
          );

          return;
        }

        updateDay(
          target,
          (
            targetDay
          ) => ({
            ...targetDay,
            isWorkingDay:
              true,
            isHalfDay:
              sourceDay.isHalfDay,
            periods:
              sourceDay.periods.map(
                (
                  period,
                  index
                ) => ({
                  ...period,
                  _id: undefined,
                  _clientId:
                    makeClientId(),
                  sequence:
                    index + 1
                })
              )
          })
        );

        setExpandedDays(
          (
            current
          ) => ({
            ...current,
            [target]: true
          })
        );

        notify(
          "success",
          `${sourceDay.label} schedule copied to ${target}.`
        );
      };

    const handleSave =
      async () => {
        const errors =
          validateSchedules(
            daySchedules
          );

        if (
          errors.length
        ) {
          notify(
            "error",
            errors
              .slice(0, 3)
              .join(" ")
          );

          return;
        }

        setSaving(true);

        try {
          await updatePeriodSettings(
            selectedConfigId,
            {
              daySchedules:
                sanitizeDays(
                  daySchedules
                ),
              rules,
              weekStartsOn,
              rotationCycle: {
                enabled: false,
                type: "weekly",
                cycleLengthWeeks:
                  1,
                weekLabels: [
                  "Standard Week"
                ]
              }
            }
          );

          setDirty(false);

          notify(
            "success",
            "Period settings saved successfully."
          );

          await loadSettings(
            selectedConfigId
          );
        } catch (error) {
          notify(
            "error",
            getErrorMessage(
              error,
              "Period settings could not be saved."
            )
          );
        } finally {
          setSaving(false);
        }
      };

    const createConfig =
      async (
        event
      ) => {
        event.preventDefault();

        const schoolId =
          role ===
            "super_admin"
            ? createForm.schoolId
            : assignedSchoolId;

        if (!schoolId) {
          notify(
            "error",
            "Select a school."
          );

          return;
        }

        setSaving(true);

        try {
          const response =
            await createTimetableConfig({
              schoolId,
              title:
                createForm.title,
              code:
                createForm.code,
              description:
                createForm.description,

              academicYear: {
                label:
                  createForm.academicYearLabel,
                startDate:
                  createForm.academicYearStart,
                endDate:
                  createForm.academicYearEnd
              },

              effectiveFrom:
                createForm.effectiveFrom,

              effectiveTo:
                createForm.effectiveTo,

              timezone:
                createForm.timezone,

              locale:
                createForm.locale,

              weekStartsOn:
                "monday",

              daySchedules:
                sanitizeDays(
                  defaultDays()
                ),

              rules:
                defaultRules()
            });

          const created =
            response?.timetableConfig ||
            response?.data ||
            response;

          const createdId =
            getId(created);

          setCreateOpen(
            false
          );

          notify(
            "success",
            "Timetable configuration created successfully."
          );

          await loadConfigs(
            createdId
          );
        } catch (error) {
          notify(
            "error",
            getErrorMessage(
              error,
              "Timetable configuration could not be created."
            )
          );
        } finally {
          setSaving(false);
        }
      };

    const runAction =
      async (
        name,
        callback
      ) => {
        setActionLoading(
          name
        );

        try {
          const response =
            await callback();

          notify(
            "success",
            response?.message ||
            "Timetable updated successfully."
          );

          await loadConfigs(
            selectedConfigId
          );

          await loadSettings(
            selectedConfigId
          );
        } catch (error) {
          notify(
            "error",
            getErrorMessage(
              error,
              "Timetable action failed."
            )
          );
        } finally {
          setActionLoading(
            ""
          );
        }
      };

    const locked =
      Boolean(
        selectedConfig?.isLocked
      );

    const editDisabled =
      !canManage ||
      locked ||
      saving ||
      Boolean(
        actionLoading
      );

    return (
      <div className="space-y-6 pb-10">
        {notice && (
          <div
            className={`fixed right-4 top-20 z-[100] flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${
              notice.type ===
              "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {notice.type ===
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
              {notice.message}
            </p>

            <button
              type="button"
              onClick={() =>
                setNotice(null)
              }
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Clock3 size={21} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
                Period Settings
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Configure working days, teaching periods, breaks and timetable rules.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                loadSettings(
                  selectedConfigId
                )
              }
              disabled={
                !selectedConfigId ||
                loading
              }
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            {canManage && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setCreateOpen(
                    true
                  )
                }
              >
                <FilePlus2
                  size={16}
                />
                New Configuration
              </button>
            )}

            {canManage && (
              <button
                type="button"
                className="btn-primary"
                onClick={
                  handleSave
                }
                disabled={
                  !dirty ||
                  editDisabled ||
                  !selectedConfigId
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

                Save Settings
              </button>
            )}
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end">
            <div>
              <label className="field-label">
                School
              </label>

              {role ===
              "super_admin" ? (
                <select
                  className="field-select"
                  value={
                    selectedSchoolId
                  }
                  onChange={(
                    event
                  ) => {
                    if (
                      dirty &&
                      !window.confirm(
                        "Discard unsaved changes?"
                      )
                    ) {
                      return;
                    }

                    setSelectedSchoolId(
                      event.target.value
                    );

                    setSelectedConfigId(
                      ""
                    );

                    setCreateForm(
                      (
                        current
                      ) => ({
                        ...current,
                        schoolId:
                          event.target.value
                      })
                    );
                  }}
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
                          getId(school)
                        }
                        value={
                          getId(school)
                        }
                      >
                        {school.schoolName ||
                          school.name ||
                          "Unnamed School"}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                  {user?.schoolId
                    ?.schoolName ||
                    user?.school
                      ?.schoolName ||
                    user?.schoolId
                      ?.name ||
                    user?.school
                      ?.name ||
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
                ) => {
                  if (
                    dirty &&
                    !window.confirm(
                      "Discard unsaved changes?"
                    )
                  ) {
                    return;
                  }

                  setSelectedConfigId(
                    event.target.value
                  );
                }}
                disabled={
                  loading ||
                  !selectedSchoolId
                }
              >
                <option value="">
                  Select configuration
                </option>

                {configs.map(
                  (
                    config
                  ) => (
                    <option
                      key={
                        getId(config)
                      }
                      value={
                        getId(config)
                      }
                    >
                      {config.title} ·{" "}
                      {config.academicYear
                        ?.label ||
                        "No year"}
                      {config.isActive
                        ? " · Active"
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="min-h-11 pt-2">
              {selectedConfig && (
                <StatusBadge
                  status={
                    selectedConfig.status
                  }
                  active={
                    selectedConfig.isActive
                  }
                />
              )}
            </div>
          </div>
        </div>

        {!selectedConfigId ? (
          <div className="card px-6 py-14 text-center">
            <CalendarDays
              size={38}
              className="mx-auto text-slate-300"
            />

            <h2 className="mt-4 text-lg font-bold text-slate-800">
              Select or create a timetable configuration
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Period Settings define the weekly framework used by the Timetable Builder.
            </p>
          </div>
        ) : loading ? (
          <div className="card flex min-h-72 flex-col items-center justify-center">
            <Loader2
              size={30}
              className="animate-spin text-brand-600"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading period settings...
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [
                  "Working Days",
                  summary.workingDays,
                  CalendarDays
                ],
                [
                  "Total Slots",
                  summary.totalSlots,
                  Clock3
                ],
                [
                  "Teaching Slots",
                  summary.teachingSlots,
                  Settings2
                ],
                [
                  "Weekly Instruction",
                  formatMinutes(
                    summary.instructionMinutes
                  ),
                  CheckCircle2
                ]
              ].map(
                (
                  [
                    label,
                    value,
                    Icon
                  ]
                ) => (
                  <div
                    key={label}
                    className="card p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <Icon
                          size={18}
                        />
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          {label}
                        </p>

                        <p className="mt-1 text-xl font-bold text-slate-800">
                          {value}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {canManage && (
              <div className="card p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">
                      Configuration Workflow
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Save settings before publishing or locking the timetable.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        runAction(
                          "lock",
                          () =>
                            setTimetableLock(
                              selectedConfigId,
                              !locked
                            )
                        )
                      }
                      disabled={
                        Boolean(
                          actionLoading
                        )
                      }
                    >
                      {locked ? (
                        <Unlock
                          size={15}
                        />
                      ) : (
                        <Lock
                          size={15}
                        />
                      )}

                      {locked
                        ? "Unlock"
                        : "Lock"}
                    </button>

                    {selectedConfig?.status ===
                      "published" && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          runAction(
                            "draft",
                            () =>
                              returnTimetableToDraft(
                                selectedConfigId
                              )
                          )
                        }
                      >
                        <RotateCcw
                          size={15}
                        />
                        Return to Draft
                      </button>
                    )}

                    {selectedConfig?.status !==
                      "archived" && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          runAction(
                            "archive",
                            () =>
                              archiveTimetableConfig(
                                selectedConfigId
                              )
                          )
                        }
                      >
                        <Archive
                          size={15}
                        />
                        Archive
                      </button>
                    )}

                    {selectedConfig?.status !==
                      "published" && (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={
                          dirty
                        }
                        onClick={() =>
                          runAction(
                            "publish",
                            () =>
                              publishTimetableConfig(
                                selectedConfigId,
                                {
                                  isActive:
                                    true,
                                  lockAfterPublish:
                                    true,
                                  publicationNotes:
                                    "Published from Period Settings."
                                }
                              )
                          )
                        }
                      >
                        <Send
                          size={15}
                        />
                        Publish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="card p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Weekly Schedule
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Enable working days and define their period sequence.
                  </p>
                </div>

                <div className="w-full sm:max-w-xs">
                  <label className="field-label">
                    Week Starts On
                  </label>

                  <select
                    className="field-select"
                    value={
                      weekStartsOn
                    }
                    onChange={(
                      event
                    ) => {
                      setWeekStartsOn(
                        event.target.value
                      );

                      setDirty(true);
                    }}
                    disabled={
                      editDisabled
                    }
                  >
                    {DAYS.map(
                      (
                        [
                          value,
                          label
                        ]
                      ) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {daySchedules.map(
                (
                  daySchedule
                ) => {
                  const instructionMinutes =
                    daySchedule.periods.reduce(
                      (
                        total,
                        period
                      ) =>
                        total +
                        (
                          SCHEDULABLE_TYPES.includes(
                            period.type
                          )
                            ? duration(
                                period.startTime,
                                period.endTime
                              )
                            : 0
                        ),
                      0
                    );

                  const open =
                    Boolean(
                      expandedDays[
                        daySchedule.day
                      ]
                    );

                  return (
                    <section
                      key={
                        daySchedule.day
                      }
                      className="card overflow-hidden"
                    >
                      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <button
                          type="button"
                          className="flex min-w-0 items-center gap-3 text-left"
                          onClick={() =>
                            setExpandedDays(
                              (
                                current
                              ) => ({
                                ...current,
                                [daySchedule.day]:
                                  !current[
                                    daySchedule.day
                                  ]
                              })
                            )
                          }
                        >
                          {open ? (
                            <ChevronUp
                              size={18}
                              className="text-slate-400"
                            />
                          ) : (
                            <ChevronDown
                              size={18}
                              className="text-slate-400"
                            />
                          )}

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-800">
                                {daySchedule.label}
                              </h3>

                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  daySchedule.isWorkingDay
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {daySchedule.isWorkingDay
                                  ? "Working Day"
                                  : "Closed"}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-400">
                              {daySchedule.periods.length} periods ·{" "}
                              {formatMinutes(
                                instructionMinutes
                              )} instruction
                            </p>
                          </div>
                        </button>

                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              checked={
                                daySchedule.isWorkingDay
                              }
                              onChange={(
                                event
                              ) =>
                                updateDay(
                                  daySchedule.day,
                                  (
                                    day
                                  ) => ({
                                    ...day,
                                    isWorkingDay:
                                      event.target.checked,
                                    periods:
                                      event.target.checked &&
                                      !day.periods.length
                                        ? defaultPeriods()
                                        : day.periods
                                  })
                                )
                              }
                              disabled={
                                editDisabled
                              }
                              className="h-4 w-4 rounded border-slate-300 text-brand-600"
                            />

                            Working Day
                          </label>

                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              checked={
                                daySchedule.isHalfDay
                              }
                              onChange={(
                                event
                              ) =>
                                updateDay(
                                  daySchedule.day,
                                  {
                                    isHalfDay:
                                      event.target.checked
                                  }
                                )
                              }
                              disabled={
                                editDisabled ||
                                !daySchedule.isWorkingDay
                              }
                              className="h-4 w-4 rounded border-slate-300 text-brand-600"
                            />

                            Half Day
                          </label>

                          {canManage &&
                            daySchedule.isWorkingDay && (
                            <button
                              type="button"
                              className="btn-ghost text-xs"
                              onClick={() =>
                                copyDay(
                                  daySchedule
                                )
                              }
                              disabled={
                                editDisabled
                              }
                            >
                              <Copy
                                size={14}
                              />
                              Copy Day
                            </button>
                          )}
                        </div>
                      </div>

                      {open && (
                        <div className="p-4 sm:p-5">
                          {!daySchedule.isWorkingDay ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                              Enable this day to configure its periods.
                            </div>
                          ) : (
                            <>
                              <div className="space-y-3">
                                {daySchedule.periods.map(
                                  (
                                    period,
                                    index
                                  ) => (
                                    <div
                                      key={
                                        period._clientId
                                      }
                                      className="rounded-2xl border border-slate-200 p-4"
                                    >
                                      <div className="grid gap-3 xl:grid-cols-[70px_110px_1fr_180px_140px_140px_auto] xl:items-end">
                                        <div>
                                          <label className="field-label">
                                            #
                                          </label>

                                          <div className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                                            {index + 1}
                                          </div>
                                        </div>

                                        <div>
                                          <label className="field-label">
                                            Code
                                          </label>

                                          <input
                                            className="field-input uppercase"
                                            value={
                                              period.code
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              updatePeriod(
                                                daySchedule.day,
                                                period._clientId,
                                                "code",
                                                event.target.value
                                              )
                                            }
                                            disabled={
                                              editDisabled
                                            }
                                          />
                                        </div>

                                        <div>
                                          <label className="field-label">
                                            Period Name
                                          </label>

                                          <input
                                            className="field-input"
                                            value={
                                              period.name
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              updatePeriod(
                                                daySchedule.day,
                                                period._clientId,
                                                "name",
                                                event.target.value
                                              )
                                            }
                                            disabled={
                                              editDisabled
                                            }
                                          />
                                        </div>

                                        <div>
                                          <label className="field-label">
                                            Type
                                          </label>

                                          <select
                                            className="field-select"
                                            value={
                                              period.type
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              updatePeriod(
                                                daySchedule.day,
                                                period._clientId,
                                                "type",
                                                event.target.value
                                              )
                                            }
                                            disabled={
                                              editDisabled
                                            }
                                          >
                                            {PERIOD_TYPES.map(
                                              (
                                                [
                                                  value,
                                                  label
                                                ]
                                              ) => (
                                                <option
                                                  key={value}
                                                  value={value}
                                                >
                                                  {label}
                                                </option>
                                              )
                                            )}
                                          </select>
                                        </div>

                                        <div>
                                          <label className="field-label">
                                            Start
                                          </label>

                                          <input
                                            type="time"
                                            className="field-input"
                                            value={
                                              period.startTime
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              updatePeriod(
                                                daySchedule.day,
                                                period._clientId,
                                                "startTime",
                                                event.target.value
                                              )
                                            }
                                            disabled={
                                              editDisabled
                                            }
                                          />
                                        </div>

                                        <div>
                                          <label className="field-label">
                                            End
                                          </label>

                                          <input
                                            type="time"
                                            className="field-input"
                                            value={
                                              period.endTime
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              updatePeriod(
                                                daySchedule.day,
                                                period._clientId,
                                                "endTime",
                                                event.target.value
                                              )
                                            }
                                            disabled={
                                              editDisabled
                                            }
                                          />
                                        </div>

                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            type="button"
                                            className="rounded-lg p-2 text-slate-400 hover:bg-brand-50 hover:text-brand-700"
                                            onClick={() =>
                                              duplicatePeriod(
                                                daySchedule.day,
                                                period
                                              )
                                            }
                                            disabled={
                                              editDisabled
                                            }
                                            title="Duplicate"
                                          >
                                            <Copy
                                              size={16}
                                            />
                                          </button>

                                          <button
                                            type="button"
                                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                            onClick={() =>
                                              removePeriod(
                                                daySchedule.day,
                                                period._clientId
                                              )
                                            }
                                            disabled={
                                              editDisabled
                                            }
                                            title="Remove"
                                          >
                                            <Trash2
                                              size={16}
                                            />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600">
                                        <label className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={
                                              period.isActive !==
                                              false
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              updatePeriod(
                                                daySchedule.day,
                                                period._clientId,
                                                "isActive",
                                                event.target.checked
                                              )
                                            }
                                            disabled={
                                              editDisabled
                                            }
                                            className="h-4 w-4 rounded border-slate-300 text-brand-600"
                                          />
                                          Active
                                        </label>

                                        <label className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={
                                              Boolean(
                                                period.requiresTeacher
                                              )
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              updatePeriod(
                                                daySchedule.day,
                                                period._clientId,
                                                "requiresTeacher",
                                                event.target.checked
                                              )
                                            }
                                            disabled={
                                              editDisabled ||
                                              !SCHEDULABLE_TYPES.includes(
                                                period.type
                                              )
                                            }
                                            className="h-4 w-4 rounded border-slate-300 text-brand-600"
                                          />
                                          Teacher Required
                                        </label>

                                        <label className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={
                                              Boolean(
                                                period.requiresSubject
                                              )
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              updatePeriod(
                                                daySchedule.day,
                                                period._clientId,
                                                "requiresSubject",
                                                event.target.checked
                                              )
                                            }
                                            disabled={
                                              editDisabled ||
                                              !SCHEDULABLE_TYPES.includes(
                                                period.type
                                              )
                                            }
                                            className="h-4 w-4 rounded border-slate-300 text-brand-600"
                                          />
                                          Subject Required
                                        </label>

                                        <span className="ml-auto text-slate-500">
                                          Duration:{" "}
                                          <strong className="text-slate-700">
                                            {duration(
                                              period.startTime,
                                              period.endTime
                                            )
                                              ? formatMinutes(
                                                  duration(
                                                    period.startTime,
                                                    period.endTime
                                                  )
                                                )
                                              : "Invalid"}
                                          </strong>
                                        </span>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>

                              {canManage && (
                                <button
                                  type="button"
                                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-4 py-4 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                                  onClick={() =>
                                    addPeriod(
                                      daySchedule.day
                                    )
                                  }
                                  disabled={
                                    editDisabled
                                  }
                                >
                                  <Plus
                                    size={17}
                                  />
                                  Add Period
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </section>
                  );
                }
              )}
            </div>

            <section className="card overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between p-4 text-left sm:p-5"
                onClick={() =>
                  setRulesOpen(
                    (
                      current
                    ) =>
                      !current
                  )
                }
              >
                <div>
                  <h2 className="font-bold text-slate-800">
                    Timetable Rules
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Workload and conflict controls
                  </p>
                </div>

                {rulesOpen ? (
                  <ChevronUp
                    size={18}
                  />
                ) : (
                  <ChevronDown
                    size={18}
                  />
                )}
              </button>

              {rulesOpen && (
                <div className="border-t border-slate-100 p-4 sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      [
                        "maximumTeacherPeriodsPerDay",
                        "Max Teacher Periods / Day"
                      ],
                      [
                        "maximumTeacherPeriodsPerWeek",
                        "Max Teacher Periods / Week"
                      ],
                      [
                        "maximumClassPeriodsPerDay",
                        "Max Class Periods / Day"
                      ],
                      [
                        "maximumConsecutiveTeacherPeriods",
                        "Max Consecutive Teacher Periods"
                      ]
                    ].map(
                      (
                        [
                          field,
                          label
                        ]
                      ) => (
                        <div
                          key={field}
                        >
                          <label className="field-label">
                            {label}
                          </label>

                          <input
                            type="number"
                            min="1"
                            className="field-input"
                            value={
                              rules[field]
                            }
                            onChange={(
                              event
                            ) => {
                              setRules(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  [field]:
                                    Number(
                                      event.target.value
                                    )
                                })
                              );

                              setDirty(true);
                            }}
                            disabled={
                              editDisabled
                            }
                          />
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      [
                        "preventTeacherConflicts",
                        "Prevent Teacher Conflicts"
                      ],
                      [
                        "preventClassConflicts",
                        "Prevent Class Conflicts"
                      ],
                      [
                        "preventRoomConflicts",
                        "Prevent Room Conflicts"
                      ],
                      [
                        "enforceTeacherAvailability",
                        "Enforce Teacher Availability"
                      ],
                      [
                        "enforceTeacherWorkload",
                        "Enforce Teacher Workload"
                      ],
                      [
                        "allowDoublePeriods",
                        "Allow Double Periods"
                      ]
                    ].map(
                      (
                        [
                          field,
                          label
                        ]
                      ) => (
                        <label
                          key={field}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={
                              Boolean(
                                rules[field]
                              )
                            }
                            onChange={(
                              event
                            ) => {
                              setRules(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  [field]:
                                    event.target.checked
                                })
                              );

                              setDirty(true);
                            }}
                            disabled={
                              editDisabled
                            }
                            className="h-4 w-4 rounded border-slate-300 text-brand-600"
                          />

                          {label}
                        </label>
                      )
                    )}
                  </div>
                </div>
              )}
            </section>

            {canManage && (
              <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-slate-700">
                    {dirty
                      ? "Unsaved period changes"
                      : "All period settings are saved"}
                  </p>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={
                      handleSave
                    }
                    disabled={
                      !dirty ||
                      editDisabled
                    }
                  >
                    {saving ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Save
                        size={16}
                      />
                    )}

                    Save Period Settings
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {createOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={() =>
              !saving &&
              setCreateOpen(
                false
              )
            }
          >
            <div
              className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Create Timetable Configuration
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Create the academic framework before building the timetable.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCreateOpen(
                      false
                    )
                  }
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={
                  createConfig
                }
                className="space-y-5 p-5 sm:p-6"
              >
                {role ===
                  "super_admin" && (
                  <div>
                    <label className="field-label">
                      School *
                    </label>

                    <select
                      className="field-select"
                      value={
                        createForm.schoolId
                      }
                      onChange={(
                        event
                      ) =>
                        setCreateForm(
                          (
                            current
                          ) => ({
                            ...current,
                            schoolId:
                              event.target.value
                          })
                        )
                      }
                      required
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
                              getId(school)
                            }
                            value={
                              getId(school)
                            }
                          >
                            {school.schoolName ||
                              school.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label">
                      Title *
                    </label>

                    <input
                      className="field-input"
                      value={
                        createForm.title
                      }
                      onChange={(
                        event
                      ) =>
                        setCreateForm(
                          (
                            current
                          ) => ({
                            ...current,
                            title:
                              event.target.value
                          })
                        )
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">
                      Code *
                    </label>

                    <input
                      className="field-input uppercase"
                      value={
                        createForm.code
                      }
                      onChange={(
                        event
                      ) =>
                        setCreateForm(
                          (
                            current
                          ) => ({
                            ...current,
                            code:
                              event.target.value
                          })
                        )
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    Description
                  </label>

                  <textarea
                    className="field-input min-h-24"
                    value={
                      createForm.description
                    }
                    onChange={(
                      event
                    ) =>
                      setCreateForm(
                        (
                          current
                        ) => ({
                          ...current,
                          description:
                            event.target.value
                        })
                      )
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="field-label">
                      Academic Year *
                    </label>

                    <input
                      className="field-input"
                      value={
                        createForm.academicYearLabel
                      }
                      onChange={(
                        event
                      ) =>
                        setCreateForm(
                          (
                            current
                          ) => ({
                            ...current,
                            academicYearLabel:
                              event.target.value
                          })
                        )
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">
                      Year Start *
                    </label>

                    <input
                      type="date"
                      className="field-input"
                      value={
                        createForm.academicYearStart
                      }
                      onChange={(
                        event
                      ) =>
                        setCreateForm(
                          (
                            current
                          ) => ({
                            ...current,
                            academicYearStart:
                              event.target.value
                          })
                        )
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">
                      Year End *
                    </label>

                    <input
                      type="date"
                      className="field-input"
                      value={
                        createForm.academicYearEnd
                      }
                      onChange={(
                        event
                      ) =>
                        setCreateForm(
                          (
                            current
                          ) => ({
                            ...current,
                            academicYearEnd:
                              event.target.value
                          })
                        )
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label">
                      Effective From *
                    </label>

                    <input
                      type="date"
                      className="field-input"
                      value={
                        createForm.effectiveFrom
                      }
                      onChange={(
                        event
                      ) =>
                        setCreateForm(
                          (
                            current
                          ) => ({
                            ...current,
                            effectiveFrom:
                              event.target.value
                          })
                        )
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">
                      Effective To *
                    </label>

                    <input
                      type="date"
                      className="field-input"
                      value={
                        createForm.effectiveTo
                      }
                      onChange={(
                        event
                      ) =>
                        setCreateForm(
                          (
                            current
                          ) => ({
                            ...current,
                            effectiveTo:
                              event.target.value
                          })
                        )
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label">
                      Timezone *
                    </label>

                    <input
                      className="field-input"
                      value={
                        createForm.timezone
                      }
                      onChange={(
                        event
                      ) =>
                        setCreateForm(
                          (
                            current
                          ) => ({
                            ...current,
                            timezone:
                              event.target.value
                          })
                        )
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">
                      Locale
                    </label>

                    <input
                      className="field-input"
                      value={
                        createForm.locale
                      }
                      onChange={(
                        event
                      ) =>
                        setCreateForm(
                          (
                            current
                          ) => ({
                            ...current,
                            locale:
                              event.target.value
                          })
                        )
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setCreateOpen(
                        false
                      )
                    }
                    disabled={
                      saving
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={
                      saving
                    }
                  >
                    {saving ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <FilePlus2
                        size={16}
                      />
                    )}

                    Create Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

export default PeriodSettings;
