import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  useNavigate,
  useOutletContext
} from "react-router-dom";

import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileBarChart,
  FileText,
  Filter,
  Flag,
  GraduationCap,
  Info,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  MessageCircle,
  NotebookPen,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  UsersRound,
  WandSparkles,
  X
} from "lucide-react";

import {
  getStudentPortalAcademics
} from "../../api/studentPortal";

/*
|--------------------------------------------------------------------------
| Academic Page Constants
|--------------------------------------------------------------------------
*/

const MODULES = [
  {
    key:
      "subjects",

    label:
      "Subjects",

    description:
      "Class subjects and official descriptions",

    icon:
      BookOpen
  },

  {
    key:
      "teachers",

    label:
      "Teachers",

    description:
      "Assigned subject teacher information",

    icon:
      UsersRound
  },

  {
    key:
      "assignments",

    label:
      "Assignments",

    description:
      "Homework, tasks, deadlines and submissions",

    icon:
      ClipboardList
  },

  {
    key:
      "examinations",

    label:
      "Examinations",

    description:
      "Exam schedules, assessments and marks",

    icon:
      GraduationCap
  },

  {
    key:
      "grades",

    label:
      "Grades",

    description:
      "Subject results and performance trends",

    icon:
      BarChart3
  },

  {
    key:
      "reportCards",

    label:
      "Report Cards",

    description:
      "Official term and annual progress reports",

    icon:
      FileBarChart
  },

  {
    key:
      "whatIfCalculator",

    label:
      "What-if Calculator",

    description:
      "Explore possible academic outcomes",

    icon:
      WandSparkles
  }
];

const GOAL_STATUSES = [
  {
    value:
      "planned",

    label:
      "Planned"
  },

  {
    value:
      "in_progress",

    label:
      "In Progress"
  },

  {
    value:
      "completed",

    label:
      "Completed"
  }
];

const GOAL_PRIORITIES = [
  {
    value:
      "low",

    label:
      "Low"
  },

  {
    value:
      "normal",

    label:
      "Normal"
  },

  {
    value:
      "high",

    label:
      "High"
  }
];

const SUBJECT_TONES = [
  {
    icon:
      "bg-brand-50 text-brand-700",

    bar:
      "from-brand-500 to-cyan-500",

    chip:
      "bg-brand-50 text-brand-700 ring-brand-200"
  },

  {
    icon:
      "bg-violet-50 text-violet-700",

    bar:
      "from-violet-500 to-fuchsia-500",

    chip:
      "bg-violet-50 text-violet-700 ring-violet-200"
  },

  {
    icon:
      "bg-emerald-50 text-emerald-700",

    bar:
      "from-emerald-500 to-teal-500",

    chip:
      "bg-emerald-50 text-emerald-700 ring-emerald-200"
  },

  {
    icon:
      "bg-amber-50 text-amber-700",

    bar:
      "from-amber-500 to-orange-500",

    chip:
      "bg-amber-50 text-amber-700 ring-amber-200"
  },

  {
    icon:
      "bg-sky-50 text-sky-700",

    bar:
      "from-sky-500 to-blue-500",

    chip:
      "bg-sky-50 text-sky-700 ring-sky-200"
  },

  {
    icon:
      "bg-rose-50 text-rose-700",

    bar:
      "from-rose-500 to-pink-500",

    chip:
      "bg-rose-50 text-rose-700 ring-rose-200"
  }
];

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const getErrorMessage = (
  error
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.response?.data
      ?.error ||
    error?.message ||
    "Unable to load academic information."
  );
};

const normalizeText = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
};

const formatClassName = (
  student
) => {
  const className =
    student?.class
      ?.className ||
    "";

  const sectionName =
    student?.sectionName ||
    "";

  if (
    className &&
    sectionName
  ) {
    return `${className} · ${sectionName}`;
  }

  return (
    className ||
    sectionName ||
    "Class not assigned"
  );
};

const formatStatus = (
  value
) => {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  if (!normalized) {
    return "Not available";
  }

  return normalized
    .split(
      "_"
    )
    .map(
      (
        part
      ) =>
        part
          .charAt(
            0
          )
          .toUpperCase() +
        part.slice(
          1
        )
    )
    .join(
      " "
    );
};

const formatDate = (
  value
) => {
  if (!value) {
    return "No target date";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "No target date";
  }

  return date.toLocaleDateString(
    "en-PK",
    {
      day:
        "numeric",

      month:
        "short",

      year:
        "numeric"
    }
  );
};

const getSubjectTone = (
  subject,
  index = 0
) => {
  const source =
    String(
      subject?.subjectCode ||
      subject?.subjectName ||
      index
    );

  const hash =
    Array.from(
      source
    ).reduce(
      (
        total,
        character
      ) =>
        total +
        character.charCodeAt(
          0
        ),
      0
    );

  return SUBJECT_TONES[
    hash %
    SUBJECT_TONES.length
  ];
};

const getAcademicStorageKey = (
  student
) => {
  return `student-academic-goals:${
    student?.id ||
    student?.admissionNumber ||
    "student"
  }`;
};

const readLocalGoals = (
  key
) => {
  try {
    const raw =
      window.localStorage.getItem(
        key
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(
        raw
      );

    return Array.isArray(
      parsed
    )
      ? parsed
      : [];
  } catch {
    return [];
  }
};

const saveLocalGoals = (
  key,
  goals
) => {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(
        goals
      )
    );

    return true;
  } catch {
    return false;
  }
};

const createGoalId =
  () => {
    if (
      typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"
    ) {
      return crypto.randomUUID();
    }

    return `goal-${Date.now()}-${Math.random()
      .toString(
        16
      )
      .slice(
        2
      )}`;
  };

const escapeCsv = (
  value
) => {
  const text =
    String(
      value ?? ""
    );

  return `"${text.replaceAll(
    '"',
    '""'
  )}"`;
};

const getGoalStatusStyle = (
  status
) => {
  if (
    status ===
    "completed"
  ) {
    return {
      badge:
        "bg-emerald-100 text-emerald-700",

      icon:
        "bg-emerald-100 text-emerald-700",

      border:
        "border-emerald-200"
    };
  }

  if (
    status ===
    "in_progress"
  ) {
    return {
      badge:
        "bg-brand-100 text-brand-700",

      icon:
        "bg-brand-100 text-brand-700",

      border:
        "border-brand-200"
    };
  }

  return {
    badge:
      "bg-slate-100 text-slate-600",

    icon:
      "bg-slate-100 text-slate-600",

    border:
      "border-slate-200"
  };
};

const getPriorityStyle = (
  priority
) => {
  if (
    priority ===
    "high"
  ) {
    return "bg-rose-100 text-rose-700";
  }

  if (
    priority ===
    "low"
  ) {
    return "bg-sky-100 text-sky-700";
  }

  return "bg-amber-100 text-amber-700";
};

/*
|--------------------------------------------------------------------------
| Reusable Components
|--------------------------------------------------------------------------
*/

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction
}) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon
            size={19}
          />
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-900">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actionLabel &&
      onAction && (
        <button
          type="button"
          className="inline-flex items-center gap-2 self-start rounded-xl px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-50"
          onClick={
            onAction
          }
        >
          {actionLabel}

          <ArrowRight
            size={14}
          />
        </button>
      )}
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  helper,
  tone
}) => {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${tone.bar}`}
      />

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.icon}`}
      >
        <Icon
          size={20}
        />
      </div>

      <p className="mt-4 text-2xl font-black tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {helper}
      </p>
    </article>
  );
};

const AcademicLoadingState =
  () => {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-52 rounded-3xl bg-slate-200" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({
            length:
              4
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={
                  index
                }
                className="h-40 rounded-2xl bg-slate-200"
              />
            )
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="h-[620px] rounded-3xl bg-slate-200" />
          <div className="h-[620px] rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  };

/*
|--------------------------------------------------------------------------
| Subject Coverage Card
|--------------------------------------------------------------------------
*/

const SubjectCoverageCard = ({
  subject,
  index,
  onMessageSchool
}) => {
  const tone =
    getSubjectTone(
      subject,
      index
    );

  const teacher =
    subject?.teacher ||
    null;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.bar}`}
      />

      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}
        >
          <BookOpen
            size={19}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-slate-900">
              {subject?.subjectName ||
                "Untitled Subject"}
            </p>

            {subject
              ?.subjectCode && (
              <span
                className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ring-1 ${tone.chip}`}
              >
                {subject.subjectCode}
              </span>
            )}
          </div>

          <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">
            {subject?.description ||
              "No subject description has been added by the school."}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <UserRound
              size={13}
              className={
                teacher
                  ? "text-emerald-600"
                  : "text-amber-600"
              }
            />

            <p
              className={`truncate text-[11px] font-semibold ${
                teacher
                  ? "text-slate-600"
                  : "text-amber-700"
              }`}
            >
              {teacher?.name ||
                "Teacher assignment pending"}
            </p>
          </div>
        </div>
      </div>

      {!teacher && (
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
          onClick={() =>
            onMessageSchool(
              subject
            )
          }
        >
          <MessageCircle
            size={13}
          />

          Ask School
        </button>
      )}
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Goal Form Modal
|--------------------------------------------------------------------------
*/

const AcademicGoalModal = ({
  open,
  subjects,
  editingGoal,
  onClose,
  onSave
}) => {
  const [
    form,
    setForm
  ] = useState({
    title:
      "",

    subjectId:
      "",

    targetDate:
      "",

    priority:
      "normal",

    status:
      "planned",

    notes:
      ""
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      title:
        editingGoal
          ?.title ||
        "",

      subjectId:
        editingGoal
          ?.subjectId ||
        "",

      targetDate:
        editingGoal
          ?.targetDate ||
        "",

      priority:
        editingGoal
          ?.priority ||
        "normal",

      status:
        editingGoal
          ?.status ||
        "planned",

      notes:
        editingGoal
          ?.notes ||
        ""
    });
  }, [
    open,
    editingGoal
  ]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    const handleEscape =
      (
        event
      ) => {
        if (
          event.key ===
          "Escape"
        ) {
          onClose();
        }
      };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style
        .overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    open,
    onClose
  ]);

  if (!open) {
    return null;
  }

  const canSave =
    form.title
      .trim()
      .length >=
    3;

  const updateField =
    (
      key
    ) => {
      return (
        event
      ) => {
        setForm(
          (
            current
          ) => ({
            ...current,

            [
              key
            ]:
              event.target
                .value
          })
        );
      };
    };

  return (
    <div className="fixed inset-0 z-[150] grid place-items-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
        onClick={
          onClose
        }
        aria-label="Close academic goal editor"
      />

      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-black text-slate-900">
              {editingGoal
                ? "Edit Academic Goal"
                : "Create Academic Goal"}
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Private planning information stored on this device
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
            onClick={
              onClose
            }
          >
            <X
              size={18}
            />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <div className="flex items-start gap-3">
              <LockKeyhole
                size={18}
                className="mt-0.5 shrink-0 text-violet-700"
              />

              <p className="text-xs leading-5 text-violet-700">
                Goals are private browser data. They are not official grades, are not uploaded to the school, and are not visible to teachers, parents or administrators.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label>
              <span className="field-label">
                Goal title
              </span>

              <input
                type="text"
                value={
                  form.title
                }
                maxLength={
                  120
                }
                className="field-input mt-2"
                placeholder="Example: Complete algebra revision"
                onChange={
                  updateField(
                    "title"
                  )
                }
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="field-label">
                  Subject
                </span>

                <select
                  value={
                    form.subjectId
                  }
                  className="field-select mt-2"
                  onChange={
                    updateField(
                      "subjectId"
                    )
                  }
                >
                  <option value="">
                    General academic goal
                  </option>

                  {subjects.map(
                    (
                      subject
                    ) => (
                      <option
                        key={
                          subject.id
                        }
                        value={
                          subject.id
                        }
                      >
                        {subject.subjectName}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="field-label">
                  Target date
                </span>

                <input
                  type="date"
                  value={
                    form.targetDate
                  }
                  className="field-input mt-2"
                  onChange={
                    updateField(
                      "targetDate"
                    )
                  }
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="field-label">
                  Priority
                </span>

                <select
                  value={
                    form.priority
                  }
                  className="field-select mt-2"
                  onChange={
                    updateField(
                      "priority"
                    )
                  }
                >
                  {GOAL_PRIORITIES.map(
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
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="field-label">
                  Status
                </span>

                <select
                  value={
                    form.status
                  }
                  className="field-select mt-2"
                  onChange={
                    updateField(
                      "status"
                    )
                  }
                >
                  {GOAL_STATUSES.map(
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
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <label>
              <span className="field-label">
                Private notes
              </span>

              <textarea
                value={
                  form.notes
                }
                rows={
                  5
                }
                maxLength={
                  500
                }
                className="field-input mt-2 min-h-32 resize-y"
                placeholder="Add steps, revision topics or a personal reminder…"
                onChange={
                  updateField(
                    "notes"
                  )
                }
              />
            </label>

            <div className="flex justify-end text-[10px] text-slate-400">
              {form.notes.length}/500
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            className="btn-ghost"
            onClick={
              onClose
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn-primary"
            disabled={
              !canSave
            }
            onClick={() =>
              onSave({
                ...form,

                title:
                  form.title.trim(),

                notes:
                  form.notes.trim()
              })
            }
          >
            <Target
              size={15}
            />

            {editingGoal
              ? "Update Goal"
              : "Save Goal"}
          </button>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Academic Goal Card
|--------------------------------------------------------------------------
*/

const AcademicGoalCard = ({
  goal,
  subject,
  onEdit,
  onDelete,
  onAdvanceStatus
}) => {
  const statusStyle =
    getGoalStatusStyle(
      goal.status
    );

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ${statusStyle.border}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${statusStyle.icon}`}
        >
          {goal.status ===
          "completed" ? (
            <CheckCircle2
              size={18}
            />
          ) : (
            <Target
              size={18}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-900">
              {goal.title}
            </p>

            <span
              className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${statusStyle.badge}`}
            >
              {formatStatus(
                goal.status
              )}
            </span>

            <span
              className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${getPriorityStyle(
                goal.priority
              )}`}
            >
              {formatStatus(
                goal.priority
              )}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
            <span>
              {subject?.subjectName ||
                "General academic goal"}
            </span>

            <span>
              Target:{" "}
              {formatDate(
                goal.targetDate
              )}
            </span>
          </div>

          {goal.notes && (
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {goal.notes}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {goal.status !==
              "completed" && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-[10px] font-bold text-brand-700 transition hover:bg-brand-100"
                onClick={() =>
                  onAdvanceStatus(
                    goal
                  )
                }
              >
                <Check
                  size={11}
                />

                {goal.status ===
                "planned"
                  ? "Start Goal"
                  : "Mark Complete"}
              </button>
            )}

            <button
              type="button"
              className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              onClick={() =>
                onEdit(
                  goal
                )
              }
            >
              Edit
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50"
              onClick={() =>
                onDelete(
                  goal
                )
              }
            >
              <Trash2
                size={11}
              />

              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Student Academics Page
|--------------------------------------------------------------------------
*/

const StudentAcademics =
  () => {
    const navigate =
      useNavigate();

    const {
      student:
        overviewStudent,
      online,
      refreshPortal
    } = useOutletContext();

    const requestControllerRef =
      useRef(null);

    const [
      academicData,
      setAcademicData
    ] = useState(null);

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
      search,
      setSearch
    ] = useState("");

    const [
      teacherFilter,
      setTeacherFilter
    ] = useState(
      "all"
    );

    const [
      goals,
      setGoals
    ] = useState([]);

    const [
      goalModalOpen,
      setGoalModalOpen
    ] = useState(false);

    const [
      editingGoal,
      setEditingGoal
    ] = useState(null);

    /*
    |--------------------------------------------------------------------------
    | Load Academic Data
    |--------------------------------------------------------------------------
    */

    const loadAcademics =
      useCallback(
        async ({
          silent = false
        } = {}) => {
          requestControllerRef
            .current
            ?.abort();

          const controller =
            new AbortController();

          requestControllerRef
            .current =
            controller;

          if (
            silent
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError(
            ""
          );

          try {
            const response =
              await getStudentPortalAcademics(
                {},
                {
                  signal:
                    controller.signal
                }
              );

            const data =
              response?.data
                ?.data ||
              null;

            setAcademicData(
              data
            );
          } catch (
            requestError
          ) {
            if (
              requestError?.name ===
                "CanceledError" ||
              requestError?.code ===
                "ERR_CANCELED"
            ) {
              return;
            }

            setError(
              getErrorMessage(
                requestError
              )
            );
          } finally {
            if (
              !controller.signal
                .aborted
            ) {
              setLoading(
                false
              );

              setRefreshing(
                false
              );
            }
          }
        },
        []
      );

    useEffect(() => {
      loadAcademics();

      return () => {
        requestControllerRef
          .current
          ?.abort();
      };
    }, [
      loadAcademics
    ]);

    /*
    |--------------------------------------------------------------------------
    | Derived Academic Data
    |--------------------------------------------------------------------------
    */

    const student =
      academicData
        ?.student ||
      overviewStudent ||
      null;

    const summary =
      academicData
        ?.summary ||
      {
        subjectCount:
          0,

        assignedTeacherCount:
          0
      };

    const subjects =
      Array.isArray(
        academicData
          ?.subjects
      )
        ? academicData.subjects
        : [];

    const results =
      Array.isArray(
        academicData
          ?.results
      )
        ? academicData.results
        : [];

    const insights =
      academicData
        ?.insights ||
      {
        available:
          false,

        strengths:
          [],

        improvementAreas:
          [],

        projectedPerformance:
          null
      };

    const availability =
      academicData
        ?.availability ||
      {};

    const note =
      academicData
        ?.note ||
      "";

    const storageKey =
      getAcademicStorageKey(
        student
      );

    useEffect(() => {
      if (!student) {
        return;
      }

      setGoals(
        readLocalGoals(
          storageKey
        )
      );
    }, [
      student,
      storageKey
    ]);

    const subjectCount =
      Number(
        summary
          ?.subjectCount ||
        subjects.length
      );

    const assignedTeacherCount =
      Number(
        summary
          ?.assignedTeacherCount ||
        subjects.filter(
          (
            subject
          ) =>
            subject?.teacher
              ?.id
        ).length
      );

    const unassignedTeacherCount =
      Math.max(
        0,
        subjectCount -
          assignedTeacherCount
      );

    const teacherCoverage =
      subjectCount >
      0
        ? Math.round(
            (
              assignedTeacherCount /
              subjectCount
            ) *
              100
          )
        : 0;

    const availableModuleCount =
      MODULES.filter(
        (
          module
        ) =>
          Boolean(
            availability[
              module.key
            ]
          )
      ).length;

    const platformReadiness =
      Math.round(
        (
          availableModuleCount /
          MODULES.length
        ) *
          100
      );

    const completedGoals =
      goals.filter(
        (
          goal
        ) =>
          goal.status ===
          "completed"
      ).length;

    const activeGoals =
      goals.filter(
        (
          goal
        ) =>
          goal.status !==
          "completed"
      ).length;

    const filteredSubjects =
      useMemo(
        () => {
          const query =
            normalizeText(
              search
            );

          return subjects.filter(
            (
              subject
            ) => {
              const matchesSearch =
                !query ||
                [
                  subject
                    ?.subjectName,

                  subject
                    ?.subjectCode,

                  subject
                    ?.description,

                  subject
                    ?.teacher
                    ?.name,

                  subject
                    ?.teacher
                    ?.qualification
                ]
                  .map(
                    normalizeText
                  )
                  .join(
                    " "
                  )
                  .includes(
                    query
                  );

              const matchesTeacher =
                teacherFilter ===
                "all"
                  ? true
                  : teacherFilter ===
                      "assigned"
                    ? Boolean(
                        subject
                          ?.teacher
                          ?.id
                      )
                    : !subject
                        ?.teacher
                        ?.id;

              return (
                matchesSearch &&
                matchesTeacher
              );
            }
          );
        },
        [
          subjects,
          search,
          teacherFilter
        ]
      );

    const subjectMap =
      useMemo(
        () => {
          return new Map(
            subjects.map(
              (
                subject
              ) => [
                String(
                  subject.id
                ),
                subject
              ]
            )
          );
        },
        [
          subjects
        ]
      );

    const summaryCards = [
      {
        key:
          "subjects",

        icon:
          BookOpen,

        label:
          "Subjects",

        value:
          subjectCount,

        helper:
          `Official subjects for ${formatClassName(
            student
          )}`,

        tone: {
          icon:
            "bg-brand-50 text-brand-700",

          bar:
            "bg-gradient-to-r from-brand-500 to-cyan-500"
        }
      },

      {
        key:
          "teachers",

        icon:
          UsersRound,

        label:
          "Teacher Coverage",

        value:
          `${teacherCoverage}%`,

        helper:
          unassignedTeacherCount >
          0
            ? `${unassignedTeacherCount} subject assignment pending`
            : "Every subject has an assigned teacher",

        tone: {
          icon:
            "bg-emerald-50 text-emerald-700",

          bar:
            "bg-emerald-500"
        }
      },

      {
        key:
          "modules",

        icon:
          Sparkles,

        label:
          "Platform Readiness",

        value:
          `${platformReadiness}%`,

        helper:
          `${availableModuleCount} of ${MODULES.length} academic data modules available`,

        tone: {
          icon:
            "bg-violet-50 text-violet-700",

          bar:
            "bg-violet-500"
        }
      },

      {
        key:
          "goals",

        icon:
          Target,

        label:
          "Private Goals",

        value:
          activeGoals,

        helper:
          `${completedGoals} completed on this device`,

        tone: {
          icon:
            "bg-amber-50 text-amber-700",

          bar:
            "bg-amber-500"
        }
      }
    ];

    /*
    |--------------------------------------------------------------------------
    | Actions
    |--------------------------------------------------------------------------
    */

    const handleRefresh =
      async () => {
        await Promise.all([
          loadAcademics({
            silent:
              true
          }),

          refreshPortal?.()
        ]);
      };

    const handleMessageSchool =
      (
        subject = null
      ) => {
        const subjectText =
          subject
            ? `${subject.subjectName}${
                subject.subjectCode
                  ? ` (${subject.subjectCode})`
                  : ""
              }`
            : "my academic record";

        navigate(
          "/student-portal/messages",
          {
            state: {
              compose: {
                subject:
                  "Academic information request",

                category:
                  "academics",

                priority:
                  "normal",

                text:
                  `I would like clarification about ${subjectText}.`
              }
            }
          }
        );
      };

    const handleOpenCreateGoal =
      () => {
        setEditingGoal(
          null
        );

        setGoalModalOpen(
          true
        );
      };

    const handleEditGoal =
      (
        goal
      ) => {
        setEditingGoal(
          goal
        );

        setGoalModalOpen(
          true
        );
      };

    const handleSaveGoal =
      (
        form
      ) => {
        setGoals(
          (
            current
          ) => {
            let next;

            if (
              editingGoal
            ) {
              next =
                current.map(
                  (
                    goal
                  ) =>
                    goal.id ===
                    editingGoal.id
                      ? {
                          ...goal,

                          ...form,

                          updatedAt:
                            new Date().toISOString()
                        }
                      : goal
                );
            } else {
              next = [
                {
                  id:
                    createGoalId(),

                  ...form,

                  createdAt:
                    new Date().toISOString(),

                  updatedAt:
                    new Date().toISOString()
                },

                ...current
              ];
            }

            saveLocalGoals(
              storageKey,
              next
            );

            return next;
          }
        );

        setGoalModalOpen(
          false
        );

        setEditingGoal(
          null
        );
      };

    const handleDeleteGoal =
      (
        goal
      ) => {
        const confirmed =
          window.confirm(
            `Delete the private goal "${goal.title}"?`
          );

        if (!confirmed) {
          return;
        }

        setGoals(
          (
            current
          ) => {
            const next =
              current.filter(
                (
                  item
                ) =>
                  item.id !==
                  goal.id
              );

            saveLocalGoals(
              storageKey,
              next
            );

            return next;
          }
        );
      };

    const handleAdvanceGoalStatus =
      (
        goal
      ) => {
        const nextStatus =
          goal.status ===
          "planned"
            ? "in_progress"
            : "completed";

        setGoals(
          (
            current
          ) => {
            const next =
              current.map(
                (
                  item
                ) =>
                  item.id ===
                  goal.id
                    ? {
                        ...item,

                        status:
                          nextStatus,

                        updatedAt:
                          new Date().toISOString()
                      }
                    : item
              );

            saveLocalGoals(
              storageKey,
              next
            );

            return next;
          }
        );
      };

    const handleExportCsv =
      () => {
        const rows = [
          [
            "Record Type",
            "Subject Code",
            "Subject Name",
            "Description / Goal",
            "Teacher / Status",
            "Qualification / Priority",
            "Target Date"
          ],

          ...subjects.map(
            (
              subject
            ) => [
              "Subject",

              subject.subjectCode ||
                "",

              subject.subjectName ||
                "",

              subject.description ||
                "",

              subject.teacher
                ?.name ||
                "Teacher pending",

              subject.teacher
                ?.qualification ||
                "",

              ""
            ]
          ),

          ...goals.map(
            (
              goal
            ) => [
              "Private Goal",

              "",

              subjectMap.get(
                String(
                  goal.subjectId
                )
              )?.subjectName ||
                "General",

              goal.title,

              formatStatus(
                goal.status
              ),

              formatStatus(
                goal.priority
              ),

              goal.targetDate ||
                ""
            ]
          )
        ];

        const csv =
          rows
            .map(
              (
                row
              ) =>
                row
                  .map(
                    escapeCsv
                  )
                  .join(
                    ","
                  )
            )
            .join(
              "\n"
            );

        const blob =
          new Blob(
            [
              "\uFEFF",
              csv
            ],
            {
              type:
                "text/csv;charset=utf-8"
            }
          );

        const url =
          URL.createObjectURL(
            blob
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href =
          url;

        anchor.download =
          `student-academic-summary-${
            student
              ?.admissionNumber ||
            "student"
          }.csv`;

        document.body.appendChild(
          anchor
        );

        anchor.click();

        document.body.removeChild(
          anchor
        );

        URL.revokeObjectURL(
          url
        );
      };

    const handlePrint =
      () => {
        window.print();
      };

    /*
    |--------------------------------------------------------------------------
    | Loading and Failure
    |--------------------------------------------------------------------------
    */

    if (
      loading &&
      !academicData
    ) {
      return (
        <AcademicLoadingState />
      );
    }

    if (
      !academicData &&
      error
    ) {
      return (
        <div className="grid min-h-[65vh] place-items-center">
          <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle
                size={24}
              />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Academic information could not be loaded
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {error}
            </p>

            <button
              type="button"
              className="btn-primary mt-5"
              onClick={() =>
                loadAcademics()
              }
            >
              <RefreshCw
                size={16}
              />

              Try Again
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <style>
          {`
            @media print {
              body * {
                visibility: hidden !important;
              }

              #student-academic-report,
              #student-academic-report * {
                visibility: visible !important;
              }

              #student-academic-report {
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                background: white !important;
                padding: 20px !important;
              }

              .academics-print-hidden {
                display: none !important;
              }

              .academics-print-break {
                break-inside: avoid !important;
              }

              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}
        </style>

        <div
          id="student-academic-report"
          className="space-y-6"
        >
          {/*
          |--------------------------------------------------------------------------
          | Refresh Error
          |--------------------------------------------------------------------------
          */}

          {error && (
            <div className="academics-print-hidden flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-rose-800">
                  Academic data could not refresh
                </p>

                <p className="mt-1 text-xs text-rose-600">
                  {error}
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-100"
                onClick={() =>
                  loadAcademics({
                    silent:
                      true
                  })
                }
              >
                <RefreshCw
                  size={14}
                />

                Try Again
              </button>
            </div>
          )}

          {/*
          |--------------------------------------------------------------------------
          | Academic Hero
          |--------------------------------------------------------------------------
          */}

          <section className="academics-print-break relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-7">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative grid gap-6 xl:grid-cols-[1fr_350px] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-white/10">
                    <TrendingUp
                      size={13}
                    />

                    Academic Progress Centre
                  </span>

                  <span className="rounded-full bg-violet-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-200 ring-1 ring-violet-300/20">
                    {formatClassName(
                      student
                    )}
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
                  Academic Progress
                </h2>

                <p className="mt-2 text-sm font-semibold text-slate-300">
                  {student?.name ||
                    "Student"}{" "}
                  ·{" "}
                  {student
                    ?.admissionNumber ||
                    "Admission number pending"}
                </p>

                <p className="mt-3 max-w-2xl text-xs leading-6 text-slate-400">
                  Review official academic information, subject coverage and platform readiness without displaying estimated or fabricated grades.
                </p>

                <div className="academics-print-hidden mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-brand-50"
                    onClick={
                      handleOpenCreateGoal
                    }
                  >
                    <Plus
                      size={14}
                    />

                    Create Private Goal
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/15 transition hover:bg-white/15"
                    onClick={() =>
                      navigate(
                        "/student-portal/subjects"
                      )
                    }
                  >
                    <BookOpen
                      size={14}
                    />

                    Open Subjects
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Official Academic Data
                    </p>

                    <p className="mt-1 text-3xl font-black text-white">
                      {availableModuleCount}/{MODULES.length}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-200 ring-1 ring-violet-300/20">
                    <FileBarChart
                      size={20}
                    />
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 transition-all duration-500"
                    style={{
                      width:
                        `${platformReadiness}%`
                    }}
                  />
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-300">
                  {results.length >
                  0
                    ? `${results.length} official result records are available.`
                    : "Official result and grade modules have not been added yet."}
                </p>

                <div className="mt-4 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
                  <div className="flex items-start gap-2">
                    <ShieldCheck
                      size={15}
                      className="mt-0.5 shrink-0 text-emerald-300"
                    />

                    <p className="text-[10px] leading-5 text-slate-300">
                      No performance score is estimated when official marks are unavailable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Summary Cards
          |--------------------------------------------------------------------------
          */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map(
              (
                card
              ) => (
                <StatCard
                  key={
                    card.key
                  }
                  {...card}
                />
              )
            )}
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Data Integrity Notice
          |--------------------------------------------------------------------------
          */}

          {!insights.available &&
          results.length ===
            0 && (
            <section className="academics-print-break rounded-3xl border border-sky-200 bg-sky-50 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <ShieldCheck
                      size={19}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-sky-900">
                      Accurate-data mode is active
                    </p>

                    <p className="mt-1 max-w-3xl text-xs leading-6 text-sky-700">
                      {note ||
                        "Subjects and teachers are available. Results and performance analytics will appear only after the school adds their official modules."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="academics-print-hidden inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-sky-800 shadow-sm ring-1 ring-sky-200 transition hover:bg-sky-100"
                  onClick={() =>
                    handleMessageSchool()
                  }
                >
                  <MessageCircle
                    size={14}
                  />

                  Ask School
                </button>
              </div>
            </section>
          )}

          {/*
          |--------------------------------------------------------------------------
          | Main Academic Grid
          |--------------------------------------------------------------------------
          */}

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <div className="space-y-6">
              {/*
              |--------------------------------------------------------------------------
              | Official Performance Centre
              |--------------------------------------------------------------------------
              */}

              <section className="academics-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionHeader
                  icon={
                    Award
                  }
                  title="Official Performance Centre"
                  subtitle="Grades and insights are displayed only when official school records are available."
                />

                <div className="mt-5">
                  {results.length >
                  0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <div className="flex items-start gap-3">
                        <CheckCircle2
                          size={20}
                          className="mt-0.5 shrink-0 text-emerald-700"
                        />

                        <div>
                          <p className="text-sm font-bold text-emerald-900">
                            Official results are available
                          </p>

                          <p className="mt-1 text-xs leading-5 text-emerald-700">
                            {results.length} result record{results.length ===
                            1
                              ? ""
                              : "s"} received from the academic API.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                        <FileBarChart
                          size={25}
                        />
                      </div>

                      <p className="mt-4 text-base font-bold text-slate-800">
                        No official grade records yet
                      </p>

                      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                        This page will automatically show marks, percentages, subject trends, strengths and improvement areas after the examinations and grades modules are connected.
                      </p>

                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                          No estimated grade
                        </span>

                        <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                          No artificial ranking
                        </span>

                        <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                          Official data only
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Subject Coverage
              |--------------------------------------------------------------------------
              */}

              <section className="academics-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4">
                  <SectionHeader
                    icon={
                      BookOpenCheck
                    }
                    title="Subject Coverage"
                    subtitle="Official subjects and teacher assignment status for the current class."
                    actionLabel="Full Subject Workspace"
                    onAction={() =>
                      navigate(
                        "/student-portal/subjects"
                      )
                    }
                  />

                  <div className="academics-print-hidden grid gap-3 lg:grid-cols-[1fr_190px]">
                    <label className="relative block">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="search"
                        value={
                          search
                        }
                        className="field-input h-11 pl-10"
                        placeholder="Search subject, code or teacher…"
                        onChange={(
                          event
                        ) =>
                          setSearch(
                            event.target
                              .value
                          )
                        }
                      />
                    </label>

                    <label className="relative block">
                      <Filter
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <select
                        value={
                          teacherFilter
                        }
                        className="field-select h-11 pl-9"
                        onChange={(
                          event
                        ) =>
                          setTeacherFilter(
                            event.target
                              .value
                          )
                        }
                      >
                        <option value="all">
                          All Subjects
                        </option>

                        <option value="assigned">
                          Teacher Assigned
                        </option>

                        <option value="unassigned">
                          Teacher Pending
                        </option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="mt-5">
                  {filteredSubjects.length >
                  0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredSubjects.map(
                        (
                          subject,
                          index
                        ) => (
                          <SubjectCoverageCard
                            key={
                              subject.id ||
                              index
                            }
                            subject={
                              subject
                            }
                            index={
                              index
                            }
                            onMessageSchool={
                              handleMessageSchool
                            }
                          />
                        )
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                      <Search
                        size={25}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 text-sm font-bold text-slate-700">
                        No matching subjects
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Change the search text or teacher filter.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Private Academic Goals
              |--------------------------------------------------------------------------
              */}

              <section className="academics-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionHeader
                  icon={
                    Target
                  }
                  title="Private Academic Goals"
                  subtitle="Personal planning goals stored only in this browser."
                  actionLabel="Create Goal"
                  onAction={
                    handleOpenCreateGoal
                  }
                />

                <div className="mt-5">
                  {goals.length >
                  0 ? (
                    <div className="space-y-3">
                      {goals.map(
                        (
                          goal
                        ) => (
                          <AcademicGoalCard
                            key={
                              goal.id
                            }
                            goal={
                              goal
                            }
                            subject={
                              subjectMap.get(
                                String(
                                  goal.subjectId
                                )
                              )
                            }
                            onEdit={
                              handleEditGoal
                            }
                            onDelete={
                              handleDeleteGoal
                            }
                            onAdvanceStatus={
                              handleAdvanceGoalStatus
                            }
                          />
                        )
                      )}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50/60 px-6 py-10 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-200">
                        <Target
                          size={24}
                        />
                      </div>

                      <p className="mt-4 text-base font-bold text-violet-900">
                        No private academic goals
                      </p>

                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-violet-700">
                        Create personal revision or study goals without changing the official school record.
                      </p>

                      <button
                        type="button"
                        className="academics-print-hidden mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-violet-800 shadow-sm ring-1 ring-violet-200 transition hover:bg-violet-100"
                        onClick={
                          handleOpenCreateGoal
                        }
                      >
                        <Plus
                          size={14}
                        />

                        Create First Goal
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              {/*
              |--------------------------------------------------------------------------
              | Platform Readiness
              |--------------------------------------------------------------------------
              */}

              <section className="academics-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader
                  icon={
                    Sparkles
                  }
                  title="Academic Module Readiness"
                  subtitle="Current availability of connected academic data."
                />

                <div className="mt-5 space-y-3">
                  {MODULES.map(
                    (
                      module
                    ) => {
                      const Icon =
                        module.icon;

                      const available =
                        Boolean(
                          availability[
                            module.key
                          ]
                        );

                      return (
                        <article
                          key={
                            module.key
                          }
                          className={`rounded-2xl border p-4 ${
                            available
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-slate-200 bg-slate-50/70"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                                available
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-white text-slate-400 ring-1 ring-slate-200"
                              }`}
                            >
                              <Icon
                                size={17}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-slate-800">
                                  {module.label}
                                </p>

                                <span
                                  className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${
                                    available
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-200 text-slate-500"
                                  }`}
                                >
                                  {available
                                    ? "Available"
                                    : "Coming Soon"}
                                </span>
                              </div>

                              <p className="mt-1 text-[10px] leading-5 text-slate-500">
                                {module.description}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Insight Status
              |--------------------------------------------------------------------------
              */}

              <section className="academics-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader
                  icon={
                    Lightbulb
                  }
                  title="Performance Insights"
                  subtitle="Strengths, risks and projections from official data."
                />

                {insights.available ? (
                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-bold text-emerald-900">
                        Strengths
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-emerald-700">
                        {Array.isArray(
                          insights.strengths
                        ) &&
                        insights.strengths.length >
                          0
                          ? insights.strengths.join(
                              ", "
                            )
                          : "No strengths have been identified yet."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-bold text-amber-900">
                        Improvement Areas
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-amber-700">
                        {Array.isArray(
                          insights.improvementAreas
                        ) &&
                        insights.improvementAreas.length >
                          0
                          ? insights.improvementAreas.join(
                              ", "
                            )
                          : "No improvement areas have been identified yet."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <CircleDashed
                      size={25}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm font-bold text-slate-700">
                      Insights are waiting for results
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Strengths, improvement areas and projected performance will remain blank until official assessment data exists.
                    </p>
                  </div>
                )}
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Goal Summary
              |--------------------------------------------------------------------------
              */}

              <section className="academics-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader
                  icon={
                    ListChecks
                  }
                  title="Goal Summary"
                  subtitle="Private planning activity on this device."
                />

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-200">
                    <p className="text-xl font-black text-slate-900">
                      {goals.filter(
                        (
                          goal
                        ) =>
                          goal.status ===
                          "planned"
                      ).length}
                    </p>

                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      Planned
                    </p>
                  </div>

                  <div className="rounded-2xl bg-brand-50 p-3 text-center ring-1 ring-brand-200">
                    <p className="text-xl font-black text-brand-800">
                      {goals.filter(
                        (
                          goal
                        ) =>
                          goal.status ===
                          "in_progress"
                      ).length}
                    </p>

                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-brand-500">
                      Active
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200">
                    <p className="text-xl font-black text-emerald-800">
                      {completedGoals}
                    </p>

                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-emerald-600">
                      Complete
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="academics-print-hidden mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
                  onClick={
                    handleOpenCreateGoal
                  }
                >
                  <Plus
                    size={14}
                  />

                  Add Academic Goal
                </button>
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Academic Help
              |--------------------------------------------------------------------------
              */}

              <section className="academics-print-hidden rounded-3xl border border-sky-200 bg-sky-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <MessageCircle
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-sky-900">
                      Need academic clarification?
                    </p>

                    <p className="mt-2 text-xs leading-6 text-sky-700">
                      Contact the school about subject assignments, missing results, report cards or official academic records.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-sky-800 shadow-sm ring-1 ring-sky-200 transition hover:bg-sky-100"
                  onClick={() =>
                    handleMessageSchool()
                  }
                >
                  Contact School

                  <ArrowRight
                    size={14}
                  />
                </button>
              </section>
            </aside>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Report Controls and Data Policy
          |--------------------------------------------------------------------------
          */}

          <section className="academics-print-break flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Info
                  size={18}
                />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900">
                  Official academic data policy
                </p>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                  Subjects and teacher assignments come from the school. Private goals remain on this device and are never treated as official performance records.
                </p>
              </div>
            </div>

            <div className="academics-print-hidden flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                onClick={
                  handleExportCsv
                }
              >
                <Download
                  size={14}
                />

                Export Summary
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                onClick={
                  handlePrint
                }
              >
                <Printer
                  size={14}
                />

                Print
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={
                  handleRefresh
                }
                disabled={
                  refreshing ||
                  !online
                }
              >
                <RefreshCw
                  size={14}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            </div>
          </section>
        </div>

        <AcademicGoalModal
          open={
            goalModalOpen
          }
          subjects={
            subjects
          }
          editingGoal={
            editingGoal
          }
          onClose={() => {
            setGoalModalOpen(
              false
            );

            setEditingGoal(
              null
            );
          }}
          onSave={
            handleSaveGoal
          }
        />
      </>
    );
  };

export default StudentAcademics;
