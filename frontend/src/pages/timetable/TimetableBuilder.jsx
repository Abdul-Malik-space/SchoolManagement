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
  Edit3,
  GraduationCap,
  Grid3X3,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  School,
  Search,
  Settings2,
  Trash2,
  Users,
  X,
  Zap
} from "lucide-react";

import {
  useNavigate
} from "react-router-dom";

import api from "../../api/axios";

import {
  getTimetableConfigs
} from "../../api/timetableConfigs";

import {
  createTimetableEntry,
  deleteTimetableEntry,
  getTimetableBuilderData,
  updateTimetableEntry,
  validateTimetableSlot
} from "../../api/timetables";

import {
  useAuth
} from "../../context/AuthContext";

const DAYS = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"]
];

const ENTRY_TYPES = [
  "lesson",
  "homeroom",
  "advisory",
  "activity",
  "exam",
  "study_hall",
  "library",
  "sports",
  "practical",
  "other"
];

const DELIVERY_MODES = [
  "in_person",
  "online",
  "hybrid"
];

const RESOURCE_TYPES = [
  "none",
  "classroom",
  "science_lab",
  "computer_lab",
  "language_lab",
  "library",
  "sports_ground",
  "auditorium",
  "assembly_hall",
  "prayer_hall",
  "workshop",
  "other"
];

const DEFAULT_COLOR =
  "#2563EB";

const EMPTY_FORM = {
  entryId: "",
  day: "",
  periodId: "",
  classId: "",
  sectionName: "",
  subjectId: "",
  teacherId: "",
  roomCode: "",
  roomName: "",
  roomBuilding: "",
  roomFloor: "",
  resourceType:
    "classroom",
  entryType: "lesson",
  deliveryMode:
    "in_person",
  onlineMeetingUrl: "",
  priority: "normal",
  isFixed: false,
  displayColor:
    DEFAULT_COLOR,
  notes: ""
};

const getId = (
  value
) => {
  if (!value) {
    return "";
  }

  return typeof value ===
    "object"
    ? value._id ||
        value.id ||
        ""
    : String(value);
};

const unwrap = (
  response
) => {
  return response?.data ?? response;
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
  ] = String(value).split(":");

  const hour =
    Number(hourText);

  if (
    !Number.isFinite(hour)
  ) {
    return value;
  }

  return `${hour % 12 || 12}:${minuteText} ${
    hour >= 12
      ? "PM"
      : "AM"
  }`;
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

const extractArray = (
  response,
  key
) => {
  const payload =
    unwrap(response);

  const values = [
    payload?.[key],
    payload?.data?.[key],
    payload?.data,
    payload
  ];

  return (
    values.find(
      Array.isArray
    ) || []
  );
};

const getSchoolName = (
  school
) => {
  return (
    school?.schoolName ||
    school?.name ||
    "Unnamed School"
  );
};

const getClassName = (
  classRecord
) => {
  return (
    classRecord?.className ||
    classRecord?.name ||
    "Unnamed Class"
  );
};

const getSubjectName = (
  subject
) => {
  return (
    subject?.subjectName ||
    subject?.name ||
    "Unnamed Subject"
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

const getSections = (
  classRecord
) => {
  return (
    classRecord
      ?.sections || []
  )
    .map(
      (
        section
      ) =>
        typeof section ===
        "string"
          ? section
          : section
              ?.sectionName ||
            section?.name ||
            ""
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

const getEntryPeriodId = (
  entry
) => {
  return getId(
    entry?.periodId
  );
};

const getEntryClassId = (
  entry
) => {
  return getId(
    entry?.classId
  );
};

const getEntrySubjectId = (
  entry
) => {
  return getId(
    entry?.subjectId
  );
};

const getEntryTeacherId = (
  entry
) => {
  return getId(
    entry?.teacherId
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

const getIssueText = (
  issue
) => {
  if (
    typeof issue ===
    "string"
  ) {
    return issue;
  }

  return (
    issue?.message ||
    issue?.description ||
    issue?.reason ||
    JSON.stringify(issue)
  );
};

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  description
}) => {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon size={18} />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-xl font-bold text-slate-800">
            {value}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

const TimetableBuilder =
  () => {
    const navigate =
      useNavigate();

    const {
      user
    } = useAuth();

    const userRole =
      String(
        user?.role || ""
      ).toLowerCase();

    const canManage = [
      "super_admin",
      "principal"
    ].includes(
      userRole
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
      builder,
      setBuilder
    ] = useState(null);

    const [
      selectedRotation,
      setSelectedRotation
    ] = useState(
      "STANDARD"
    );

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
      loading,
      setLoading
    ] = useState(false);

    const [
      loadingConfigs,
      setLoadingConfigs
    ] = useState(false);

    const [
      modalOpen,
      setModalOpen
    ] = useState(false);

    const [
      form,
      setForm
    ] = useState(
      EMPTY_FORM
    );

    const [
      modalMode,
      setModalMode
    ] = useState(
      "create"
    );

    const [
      validation,
      setValidation
    ] = useState(null);

    const [
      saving,
      setSaving
    ] = useState(false);

    const [
      validating,
      setValidating
    ] = useState(false);

    const [
      deleting,
      setDeleting
    ] = useState(false);

    const [
      toast,
      setToast
    ] = useState(null);

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
            () =>
              setToast(null),
            4000
          );
        },
        []
      );

    const loadSchools =
      useCallback(
        async () => {
          if (
            userRole !==
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
          }
        },
        [
          showToast,
          userRole
        ]
      );

    const loadConfigs =
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
              extractArray(
                response,
                "timetableConfigs"
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
                      getId(
                        item
                      ) ===
                      current
                  )
                ) {
                  return current;
                }

                return getId(
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

    const loadBuilder =
      useCallback(
        async (
          rotationCode =
            selectedRotation
        ) => {
          if (
            !selectedConfigId
          ) {
            setBuilder(null);
            return;
          }

          setLoading(true);

          try {
            const response =
              await getTimetableBuilderData({
                timetableConfigId:
                  selectedConfigId,

                schoolId:
                  userRole ===
                    "super_admin"
                    ? selectedSchoolId
                    : undefined,

                rotationWeekCode:
                  rotationCode
              });

            const payload =
              response?.data &&
              !Array.isArray(
                response.data
              )
                ? {
                    ...response,
                    ...response.data
                  }
                : response;

            setBuilder(payload);

            setSelectedRotation(
              payload?.rotation
                ?.code ||
                "STANDARD"
            );

            setSelectedClassId(
              (
                current
              ) => {
                const items =
                  payload?.classes ||
                  [];

                return items.some(
                  (
                    item
                  ) =>
                    getId(
                      item
                    ) ===
                    current
                )
                  ? current
                  : getId(
                      items[0]
                    );
              }
            );
          } catch (error) {
            showToast(
              "error",
              getErrorMessage(
                error,
                "Timetable Builder could not be loaded."
              )
            );
          } finally {
            setLoading(false);
          }
        },
        [
          selectedConfigId,
          selectedRotation,
          selectedSchoolId,
          showToast,
          userRole
        ]
      );

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
      loadConfigs();
    }, [
      loadConfigs
    ]);

    useEffect(() => {
      if (
        selectedConfigId
      ) {
        setSelectedRotation(
          "STANDARD"
        );

        loadBuilder(
          "STANDARD"
        );
      } else {
        setBuilder(null);
      }
    }, [
      selectedConfigId
    ]);

    const config =
      builder
        ?.timetableConfig;

    const classes =
      builder?.classes ||
      [];

    const subjects =
      builder?.subjects ||
      [];

    const teachers =
      builder?.teachers ||
      [];

    const entries =
      builder
        ?.timetableEntries ||
      [];

    const rotation =
      builder?.rotation || {
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

    const selectedClass =
      useMemo(() => {
        return classes.find(
          (
            item
          ) =>
            getId(
              item
            ) ===
            selectedClassId
        );
      }, [
        classes,
        selectedClassId
      ]);

    const sections =
      useMemo(
        () =>
          getSections(
            selectedClass
          ),
        [
          selectedClass
        ]
      );

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

    const filteredClasses =
      useMemo(() => {
        const query =
          classSearch
            .trim()
            .toLowerCase();

        return classes.filter(
          (
            item
          ) =>
            !query ||
            getClassName(
              item
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

    const workingDays =
      useMemo(() => {
        return [
          ...(
            config
              ?.daySchedules ||
            []
          )
        ]
          .filter(
            (
              day
            ) =>
              day
                .isWorkingDay
          )
          .sort(
            (
              first,
              second
            ) =>
              DAYS.findIndex(
                (
                  day
                ) =>
                  day[0] ===
                  first.day
              ) -
              DAYS.findIndex(
                (
                  day
                ) =>
                  day[0] ===
                  second.day
              )
          );
      }, [
        config
      ]);

    const classEntries =
      useMemo(() => {
        return entries.filter(
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
        entries,
        selectedClassId,
        selectedSection
      ]);

    const entryMap =
      useMemo(() => {
        return new Map(
          classEntries.map(
            (
              entry
            ) => [
              `${entry.day}:${getEntryPeriodId(
                entry
              )}`,
              entry
            ]
          )
        );
      }, [
        classEntries
      ]);

    const totalSlots =
      useMemo(() => {
        return workingDays.reduce(
          (
            total,
            day
          ) =>
            total +
            (
              day.periods || []
            ).filter(
              (
                period
              ) =>
                period
                  .isActive !==
                  false &&
                period
                  .isSchedulable !==
                  false
            ).length,
          0
        );
      }, [
        workingDays
      ]);

    const uniqueTeachers =
      new Set(
        classEntries
          .map(
            getEntryTeacherId
          )
          .filter(Boolean)
      ).size;

    const formClass =
      classes.find(
        (
          item
        ) =>
          getId(item) ===
          form.classId
      );

    const formSections =
      getSections(
        formClass
      );

    const formSubjects =
      subjects.filter(
        (
          subject
        ) =>
          getId(
            subject.classId
          ) ===
          form.classId
      );

    const formDay =
      workingDays.find(
        (
          day
        ) =>
          day.day ===
          form.day
      );

    const formPeriods =
      (
        formDay?.periods ||
        []
      ).filter(
        (
          period
        ) =>
          period.isActive !==
            false &&
          period.isSchedulable !==
            false
      );

    const updateForm = (
      field,
      value
    ) => {
      setForm(
        (
          current
        ) => ({
          ...current,
          [field]:
            value
        })
      );

      setValidation(null);
    };

    const openCreate = (
      day,
      period
    ) => {
      if (
        config?.isLocked
      ) {
        return;
      }

      setModalMode(
        "create"
      );

      setForm({
        ...EMPTY_FORM,
        day,
        periodId:
          getId(period),
        classId:
          selectedClassId,
        sectionName:
          selectedSection,
        resourceType:
          period
            ?.resourceType ||
          "classroom"
      });

      setValidation(null);
      setModalOpen(true);
    };

    const openEdit = (
      entry
    ) => {
      const room =
        entry.room || {};

      setModalMode("edit");

      setForm({
        entryId:
          getId(entry),
        day:
          entry.day || "",
        periodId:
          getEntryPeriodId(
            entry
          ),
        classId:
          getEntryClassId(
            entry
          ),
        sectionName:
          entry.sectionName ||
          "",
        subjectId:
          getEntrySubjectId(
            entry
          ),
        teacherId:
          getEntryTeacherId(
            entry
          ),
        roomCode:
          room.code || "",
        roomName:
          room.name || "",
        roomBuilding:
          room.building || "",
        roomFloor:
          room.floor || "",
        resourceType:
          room.resourceType ||
          "classroom",
        entryType:
          entry.entryType ||
          "lesson",
        deliveryMode:
          entry.deliveryMode ||
          "in_person",
        onlineMeetingUrl:
          entry
            .onlineMeetingUrl ||
          "",
        priority:
          entry.priority ||
          "normal",
        isFixed:
          Boolean(
            entry.isFixed
          ),
        displayColor:
          entry.displayColor ||
          DEFAULT_COLOR,
        notes:
          entry.notes || ""
      });

      setValidation(null);
      setModalOpen(true);
    };

    const closeModal = () => {
      if (
        saving ||
        deleting
      ) {
        return;
      }

      setModalOpen(false);
      setValidation(null);
      setForm(EMPTY_FORM);
    };

    const handleSubjectChange = (
      subjectId
    ) => {
      const subject =
        subjects.find(
          (
            item
          ) =>
            getId(item) ===
            subjectId
        );

      setForm(
        (
          current
        ) => ({
          ...current,
          subjectId,
          teacherId:
            getId(
              subject
                ?.teacherId
            ) ||
            current.teacherId
        })
      );

      setValidation(null);
    };

    const buildPayload = () => {
      return {
        timetableConfigId:
          selectedConfigId,
        rotationWeekCode:
          selectedRotation,
        rotationWeekLabel:
          rotation.label,
        day:
          form.day,
        periodId:
          form.periodId,
        classId:
          form.classId,
        sectionName:
          form.sectionName,
        subjectId:
          form.subjectId ||
          null,
        teacherId:
          form.teacherId ||
          null,
        room: {
          code:
            form.roomCode ||
            null,
          name:
            form.roomName ||
            null,
          building:
            form
              .roomBuilding ||
            null,
          floor:
            form.roomFloor ||
            null,
          resourceType:
            form.resourceType
        },
        entryType:
          form.entryType,
        deliveryMode:
          form.deliveryMode,
        onlineMeetingUrl:
          form.deliveryMode ===
            "in_person"
            ? null
            : form
                .onlineMeetingUrl,
        priority:
          form.priority,
        isFixed:
          form.isFixed,
        displayColor:
          form.displayColor,
        assignmentSource:
          "manual",
        notes:
          form.notes
      };
    };

    const checkForm = () => {
      if (
        !form.day ||
        !form.periodId ||
        !form.classId
      ) {
        return (
          "Day, period and class are required."
        );
      }

      if (
        (
          form.deliveryMode ===
            "online" ||
          form.deliveryMode ===
            "hybrid"
        ) &&
        !form
          .onlineMeetingUrl
          .trim()
      ) {
        return (
          "Online and hybrid lessons require a meeting URL."
        );
      }

      return "";
    };

    const runValidation =
      async () => {
        const error =
          checkForm();

        if (error) {
          showToast(
            "error",
            error
          );
          return null;
        }

        setValidating(true);

        try {
          const response =
            await validateTimetableSlot({
              ...buildPayload(),
              entryId:
                form.entryId ||
                undefined
            });

          setValidation(
            response
          );

          return response;
        } catch (errorObject) {
          showToast(
            "error",
            getErrorMessage(
              errorObject,
              "Slot validation failed."
            )
          );

          return null;
        } finally {
          setValidating(false);
        }
      };

    const handleSubmit =
      async (
        event
      ) => {
        event.preventDefault();

        const error =
          checkForm();

        if (error) {
          showToast(
            "error",
            error
          );
          return;
        }

        setSaving(true);

        try {
          const payload =
            buildPayload();

          const result =
            await validateTimetableSlot({
              ...payload,
              entryId:
                form.entryId ||
                undefined
            });

          setValidation(result);

          if (
            result?.isValid ===
            false
          ) {
            showToast(
              "error",
              "Resolve conflicts before saving."
            );
            return;
          }

          const response =
            modalMode ===
            "edit"
              ? await updateTimetableEntry(
                  form.entryId,
                  payload
                )
              : await createTimetableEntry(
                  payload
                );

          showToast(
            "success",
            response?.message ||
            "Timetable assignment saved."
          );

          closeModal();
          await loadBuilder();
        } catch (errorObject) {
          const details =
            errorObject
              ?.response?.data
              ?.details;

          if (
            details &&
            typeof details ===
              "object"
          ) {
            setValidation({
              isValid: false,
              conflicts:
                details.conflicts ||
                [],
              workloadErrors:
                details
                  .workloadErrors ||
                [],
              warnings:
                details.warnings ||
                []
            });
          }

          showToast(
            "error",
            getErrorMessage(
              errorObject,
              "Assignment could not be saved."
            )
          );
        } finally {
          setSaving(false);
        }
      };

    const handleDelete =
      async () => {
        if (
          !form.entryId ||
          !window.confirm(
            "Delete this timetable assignment?"
          )
        ) {
          return;
        }

        setDeleting(true);

        try {
          const response =
            await deleteTimetableEntry(
              form.entryId
            );

          showToast(
            "success",
            response?.message ||
            "Assignment deleted."
          );

          closeModal();
          await loadBuilder();
        } catch (error) {
          showToast(
            "error",
            getErrorMessage(
              error,
              "Assignment could not be deleted."
            )
          );
        } finally {
          setDeleting(false);
        }
      };

    const validationItems = [
      ...(
        validation
          ?.conflicts ||
        []
      ),
      ...(
        validation
          ?.workloadErrors ||
        []
      ),
      ...(
        validation
          ?.warnings ||
        []
      )
    ].map(
      getIssueText
    );

    if (!canManage) {
      return (
        <div className="card p-10 text-center">
          <AlertTriangle
            size={36}
            className="mx-auto text-amber-500"
          />

          <h2 className="mt-4 text-lg font-bold text-slate-800">
            Management Access Required
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Only Super Admin and Principal accounts can use the Timetable Builder.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-10">
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
              />
            ) : (
              <AlertTriangle
                size={18}
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
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Grid3X3
                size={21}
              />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
                Timetable Builder
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Assign classes, subjects, teachers and rooms with conflict validation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate(
                  "/timetable/period-settings"
                )
              }
            >
              <Settings2
                size={16}
              />
              Period Settings
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                loadBuilder()
              }
              disabled={
                loading ||
                !selectedConfigId
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
          </div>
        </div>

        <div className="card p-4 sm:p-5">
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
                  ) => {
                    setSelectedSchoolId(
                      event.target.value
                    );
                    setSelectedConfigId(
                      ""
                    );
                    setBuilder(null);
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
                          getId(
                            school
                          )
                        }
                        value={
                          getId(
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
                        getId(item)
                      }
                      value={
                        getId(item)
                      }
                    >
                      {item.title} ·{" "}
                      {item
                        .academicYear
                        ?.label ||
                        "No year"}
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
                onChange={async (
                  event
                ) => {
                  const code =
                    event.target.value;

                  setSelectedRotation(
                    code
                  );

                  await loadBuilder(
                    code
                  );
                }}
                disabled={
                  !selectedConfigId
                }
              >
                {(
                  rotation
                    .availableWeeks ||
                  []
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

            <div className="flex items-end">
              <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                {config?.isLocked ? (
                  <>
                    <Lock
                      size={14}
                      className="text-rose-500"
                    />
                    Locked
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={14}
                      className="text-emerald-500"
                    />
                    Editable
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {!selectedConfigId ? (
          <div className="card p-12 text-center">
            <Grid3X3
              size={38}
              className="mx-auto text-slate-300"
            />

            <h2 className="mt-4 text-lg font-bold text-slate-800">
              Select a Timetable Configuration
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Create or select period settings before building the timetable.
            </p>
          </div>
        ) : loading ? (
          <div className="card flex min-h-80 flex-col items-center justify-center">
            <Loader2
              size={32}
              className="animate-spin text-brand-600"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading Timetable Builder...
            </p>
          </div>
        ) : (
          <>
            <div className="card p-4 sm:p-5">
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
                <div>
                  <label className="field-label">
                    Search Class
                  </label>

                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
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
                      placeholder="Search classes..."
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
                  >
                    <option value="">
                      Select class
                    </option>

                    {filteredClasses.map(
                      (
                        item
                      ) => (
                        <option
                          key={
                            getId(item)
                          }
                          value={
                            getId(item)
                          }
                        >
                          {getClassName(
                            item
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
            </div>

            {selectedClassId && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    icon={BookOpen}
                    label="Assigned Lessons"
                    value={
                      classEntries.length
                    }
                    description="Scheduled lessons for this class"
                  />

                  <SummaryCard
                    icon={Clock3}
                    label="Free Slots"
                    value={Math.max(
                      totalSlots -
                        classEntries.length,
                      0
                    )}
                    description={`${totalSlots} weekly teaching slots`}
                  />

                  <SummaryCard
                    icon={Users}
                    label="Teachers"
                    value={
                      uniqueTeachers
                    }
                    description="Unique assigned teachers"
                  />

                  <SummaryCard
                    icon={
                      classEntries.some(
                        (
                          entry
                        ) =>
                          !getEntrySubjectId(
                            entry
                          ) ||
                          !getEntryTeacherId(
                            entry
                          )
                      )
                        ? AlertTriangle
                        : CheckCircle2
                    }
                    label="Schedule Quality"
                    value={
                      classEntries.some(
                        (
                          entry
                        ) =>
                          !getEntrySubjectId(
                            entry
                          ) ||
                          !getEntryTeacherId(
                            entry
                          )
                      )
                        ? "Review"
                        : "Complete"
                    }
                    description="Subject and teacher assignment check"
                  />
                </div>

                <section className="card overflow-hidden">
                  <div className="border-b border-slate-100 p-4 sm:p-5">
                    <h2 className="text-base font-bold text-slate-800">
                      Weekly Timetable
                    </h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Click an empty slot to assign a lesson. Click an existing lesson to edit it.
                    </p>
                  </div>

                  <div className="space-y-5 p-4 sm:p-5">
                    {workingDays.map(
                      (
                        day
                      ) => {
                        const periods = [
                          ...(
                            day.periods ||
                            []
                          )
                        ].sort(
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

                        return (
                          <div
                            key={
                              day.day
                            }
                            className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3"
                          >
                            <div className="mb-3 flex items-center gap-2">
                              <CalendarDays
                                size={16}
                                className="text-brand-600"
                              />

                              <h3 className="text-sm font-bold text-slate-700">
                                {day.label ||
                                  formatEnum(
                                    day.day
                                  )}
                              </h3>
                            </div>

                            <div className="overflow-x-auto">
                              <div className="flex min-w-max gap-3 pb-1">
                                {periods.map(
                                  (
                                    period
                                  ) => {
                                    const periodId =
                                      getId(
                                        period
                                      );

                                    const entry =
                                      entryMap.get(
                                        `${day.day}:${periodId}`
                                      );

                                    const schedulable =
                                      period
                                        .isActive !==
                                        false &&
                                      period
                                        .isSchedulable !==
                                        false;

                                    if (
                                      !schedulable
                                    ) {
                                      return (
                                        <div
                                          key={
                                            periodId
                                          }
                                          className="flex w-44 shrink-0 flex-col justify-center rounded-xl border border-dashed border-slate-200 bg-white p-3 text-center"
                                        >
                                          <p className="text-xs font-bold text-slate-500">
                                            {period.name}
                                          </p>

                                          <p className="mt-1 text-[10px] text-slate-400">
                                            {formatEnum(
                                              period.type
                                            )}
                                          </p>

                                          <p className="mt-3 text-[10px] text-slate-400">
                                            {formatTime(
                                              period.startTime
                                            )}{" "}
                                            –{" "}
                                            {formatTime(
                                              period.endTime
                                            )}
                                          </p>
                                        </div>
                                      );
                                    }

                                    if (
                                      entry
                                    ) {
                                      return (
                                        <button
                                          key={
                                            periodId
                                          }
                                          type="button"
                                          className="w-48 shrink-0 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
                                          style={{
                                            borderLeftWidth:
                                              "4px",
                                            borderLeftColor:
                                              entry.displayColor ||
                                              DEFAULT_COLOR
                                          }}
                                          onClick={() =>
                                            openEdit(
                                              entry
                                            )
                                          }
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <p className="truncate text-xs font-bold text-slate-800">
                                              {entry
                                                .subjectSnapshot
                                                ?.name ||
                                                formatEnum(
                                                  entry.entryType
                                                )}
                                            </p>

                                            <Edit3
                                              size={13}
                                              className="text-slate-300"
                                            />
                                          </div>

                                          <p className="mt-1 truncate text-[11px] text-slate-500">
                                            {entry
                                              .teacherSnapshot
                                              ?.name ||
                                              "Unassigned Teacher"}
                                          </p>

                                          <p className="mt-3 text-[10px] text-slate-400">
                                            {period.name} ·{" "}
                                            {formatTime(
                                              period.startTime
                                            )}
                                          </p>

                                          <p className="mt-1 truncate text-[10px] text-slate-400">
                                            {entry.room
                                              ?.name ||
                                              entry.room
                                                ?.code ||
                                              "No room"}
                                          </p>
                                        </button>
                                      );
                                    }

                                    return (
                                      <button
                                        key={
                                          periodId
                                        }
                                        type="button"
                                        className="flex w-44 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center transition hover:border-brand-300 hover:bg-brand-50/50 disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={() =>
                                          openCreate(
                                            day.day,
                                            period
                                          )
                                        }
                                        disabled={
                                          config
                                            ?.isLocked
                                        }
                                      >
                                        <Plus
                                          size={18}
                                          className="text-slate-300"
                                        />

                                        <p className="mt-2 text-xs font-semibold text-slate-600">
                                          {period.name}
                                        </p>

                                        <p className="mt-1 text-[10px] text-slate-400">
                                          {formatTime(
                                            period.startTime
                                          )}{" "}
                                          –{" "}
                                          {formatTime(
                                            period.endTime
                                          )}
                                        </p>
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {modalOpen && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={
              closeModal
            }
          >
            <div
              className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {modalMode ===
                    "edit"
                      ? "Edit Timetable Assignment"
                      : "Add Timetable Assignment"}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    {rotation.label}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-6 p-5 sm:p-6"
              >
                <section>
                  <h3 className="mb-3 text-sm font-bold text-slate-700">
                    Schedule
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="field-label">
                        Day *
                      </label>

                      <select
                        className="field-select"
                        value={
                          form.day
                        }
                        onChange={(
                          event
                        ) => {
                          const dayValue =
                            event.target.value;

                          const nextDay =
                            workingDays.find(
                              (
                                item
                              ) =>
                                item.day ===
                                dayValue
                            );

                          const nextPeriod =
                            (
                              nextDay
                                ?.periods ||
                              []
                            ).find(
                              (
                                period
                              ) =>
                                period
                                  .isActive !==
                                  false &&
                                period
                                  .isSchedulable !==
                                  false
                            );

                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              day:
                                dayValue,
                              periodId:
                                getId(
                                  nextPeriod
                                )
                            })
                          );
                        }}
                      >
                        <option value="">
                          Select day
                        </option>

                        {workingDays.map(
                          (
                            day
                          ) => (
                            <option
                              key={
                                day.day
                              }
                              value={
                                day.day
                              }
                            >
                              {day.label ||
                                formatEnum(
                                  day.day
                                )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="field-label">
                        Period *
                      </label>

                      <select
                        className="field-select"
                        value={
                          form.periodId
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "periodId",
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          Select period
                        </option>

                        {formPeriods.map(
                          (
                            period
                          ) => (
                            <option
                              key={
                                getId(
                                  period
                                )
                              }
                              value={
                                getId(
                                  period
                                )
                              }
                            >
                              {period.name} ·{" "}
                              {formatTime(
                                period.startTime
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="field-label">
                        Class *
                      </label>

                      <select
                        className="field-select"
                        value={
                          form.classId
                        }
                        onChange={(
                          event
                        ) => {
                          const classId =
                            event.target.value;

                          const nextClass =
                            classes.find(
                              (
                                item
                              ) =>
                                getId(
                                  item
                                ) ===
                                classId
                            );

                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              classId,
                              sectionName:
                                getSections(
                                  nextClass
                                )[0] ||
                                "",
                              subjectId:
                                "",
                              teacherId:
                                ""
                            })
                          );
                        }}
                      >
                        <option value="">
                          Select class
                        </option>

                        {classes.map(
                          (
                            item
                          ) => (
                            <option
                              key={
                                getId(item)
                              }
                              value={
                                getId(item)
                              }
                            >
                              {getClassName(
                                item
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
                          form.sectionName
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "sectionName",
                            event.target.value
                          )
                        }
                      >
                        {formSections.length ===
                        0 ? (
                          <option value="">
                            Whole Class
                          </option>
                        ) : (
                          formSections.map(
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
                </section>

                <section className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-sm font-bold text-slate-700">
                    Academic Assignment
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="xl:col-span-2">
                      <label className="field-label">
                        Subject
                      </label>

                      <select
                        className="field-select"
                        value={
                          form.subjectId
                        }
                        onChange={(
                          event
                        ) =>
                          handleSubjectChange(
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          Select subject
                        </option>

                        {formSubjects.map(
                          (
                            subject
                          ) => (
                            <option
                              key={
                                getId(
                                  subject
                                )
                              }
                              value={
                                getId(
                                  subject
                                )
                              }
                            >
                              {getSubjectName(
                                subject
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="xl:col-span-2">
                      <label className="field-label">
                        Teacher
                      </label>

                      <select
                        className="field-select"
                        value={
                          form.teacherId
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "teacherId",
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          Select teacher
                        </option>

                        {teachers.map(
                          (
                            teacher
                          ) => (
                            <option
                              key={
                                getId(
                                  teacher
                                )
                              }
                              value={
                                getId(
                                  teacher
                                )
                              }
                            >
                              {getTeacherName(
                                teacher
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="field-label">
                        Entry Type
                      </label>

                      <select
                        className="field-select"
                        value={
                          form.entryType
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "entryType",
                            event.target.value
                          )
                        }
                      >
                        {ENTRY_TYPES.map(
                          (
                            type
                          ) => (
                            <option
                              key={
                                type
                              }
                              value={
                                type
                              }
                            >
                              {formatEnum(
                                type
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="field-label">
                        Delivery Mode
                      </label>

                      <select
                        className="field-select"
                        value={
                          form.deliveryMode
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "deliveryMode",
                            event.target.value
                          )
                        }
                      >
                        {DELIVERY_MODES.map(
                          (
                            mode
                          ) => (
                            <option
                              key={
                                mode
                              }
                              value={
                                mode
                              }
                            >
                              {formatEnum(
                                mode
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="field-label">
                        Priority
                      </label>

                      <select
                        className="field-select"
                        value={
                          form.priority
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "priority",
                            event.target.value
                          )
                        }
                      >
                        <option value="normal">
                          Normal
                        </option>
                        <option value="preferred">
                          Preferred
                        </option>
                        <option value="fixed">
                          Fixed
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="field-label">
                        Display Color
                      </label>

                      <input
                        type="color"
                        className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                        value={
                          form.displayColor
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "displayColor",
                            event.target.value.toUpperCase()
                          )
                        }
                      />
                    </div>
                  </div>

                  {form.deliveryMode !==
                    "in_person" && (
                    <div className="mt-4">
                      <label className="field-label">
                        Online Meeting URL *
                      </label>

                      <input
                        type="url"
                        className="field-input"
                        value={
                          form.onlineMeetingUrl
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "onlineMeetingUrl",
                            event.target.value
                          )
                        }
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </section>

                <section className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-sm font-bold text-slate-700">
                    Room and Resource
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <input
                      className="field-input"
                      value={
                        form.roomCode
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "roomCode",
                          event.target.value
                        )
                      }
                      placeholder="Room Code"
                    />

                    <input
                      className="field-input"
                      value={
                        form.roomName
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "roomName",
                          event.target.value
                        )
                      }
                      placeholder="Room Name"
                    />

                    <input
                      className="field-input"
                      value={
                        form.roomBuilding
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "roomBuilding",
                          event.target.value
                        )
                      }
                      placeholder="Building"
                    />

                    <input
                      className="field-input"
                      value={
                        form.roomFloor
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "roomFloor",
                          event.target.value
                        )
                      }
                      placeholder="Floor"
                    />

                    <select
                      className="field-select"
                      value={
                        form.resourceType
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "resourceType",
                          event.target.value
                        )
                      }
                    >
                      {RESOURCE_TYPES.map(
                        (
                          type
                        ) => (
                          <option
                            key={
                              type
                            }
                            value={
                              type
                            }
                          >
                            {formatEnum(
                              type
                            )}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <textarea
                    className="field-input mt-4 min-h-24 resize-y"
                    value={
                      form.notes
                    }
                    onChange={(
                      event
                    ) =>
                      updateForm(
                        "notes",
                        event.target.value
                      )
                    }
                    placeholder="Internal notes..."
                  />

                  <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                    <input
                      type="checkbox"
                      checked={
                        form.isFixed
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "isFixed",
                          event.target.checked
                        )
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                    />

                    <span>
                      <span className="block text-sm font-semibold text-slate-700">
                        Fixed Assignment
                      </span>

                      <span className="block text-xs text-slate-400">
                        Prevent automatic scheduling from moving this lesson.
                      </span>
                    </span>
                  </label>
                </section>

                {validation && (
                  <div
                    className={`rounded-2xl border p-4 ${
                      validation
                        .isValid
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {validation
                        .isValid ? (
                        <CheckCircle2
                          size={18}
                          className="text-emerald-600"
                        />
                      ) : (
                        <AlertTriangle
                          size={18}
                          className="text-rose-600"
                        />
                      )}

                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {validation
                            .isValid
                            ? "Slot is available."
                            : "Validation issues found."}
                        </p>

                        {validationItems.length >
                          0 && (
                          <ul className="mt-2 space-y-1 text-xs text-slate-600">
                            {validationItems.map(
                              (
                                item,
                                index
                              ) => (
                                <li
                                  key={
                                    index
                                  }
                                >
                                  • {item}
                                </li>
                              )
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                  <div>
                    {modalMode ===
                      "edit" && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                        onClick={
                          handleDelete
                        }
                        disabled={
                          deleting ||
                          config
                            ?.isLocked
                        }
                      >
                        {deleting ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2
                            size={16}
                          />
                        )}
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={
                        closeModal
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={
                        runValidation
                      }
                      disabled={
                        validating
                      }
                    >
                      {validating ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Zap
                          size={16}
                        />
                      )}
                      Check Conflicts
                    </button>

                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={
                        saving ||
                        config
                          ?.isLocked
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
                      {saving
                        ? "Saving..."
                        : "Save Assignment"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

export default TimetableBuilder;
