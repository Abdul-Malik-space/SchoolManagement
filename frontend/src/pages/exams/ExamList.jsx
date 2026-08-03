import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock3,
  Copy,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  School,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UsersRound,
  X
} from "lucide-react";

import {
  cancelExam,
  cloneExam,
  deleteExam,
  getExamById,
  getExamDependencies,
  getExams,
  getExamSummary,
  lockExam,
  transitionExamStatus
} from "../../api/exams";
import { getSchools } from "../../api/schools";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";

/*
|--------------------------------------------------------------------------
| Exam List Configuration
|--------------------------------------------------------------------------
*/

const EXAM_TYPE_OPTIONS = [
  {
    value: "",
    label: "All exam types"
  },
  {
    value: "monthly_test",
    label: "Monthly Test"
  },
  {
    value: "class_test",
    label: "Class Test"
  },
  {
    value: "mid_term",
    label: "Mid Term"
  },
  {
    value: "final_term",
    label: "Final Term"
  },
  {
    value: "annual_exam",
    label: "Annual Exam"
  },
  {
    value: "practical_exam",
    label: "Practical Exam"
  },
  {
    value: "quiz",
    label: "Quiz"
  },
  {
    value: "assignment",
    label: "Assignment"
  },
  {
    value: "other",
    label: "Other"
  }
];

const STATUS_OPTIONS = [
  {
    value: "",
    label: "All workflow statuses"
  },
  {
    value: "draft",
    label: "Draft"
  },
  {
    value: "scheduled",
    label: "Scheduled"
  },
  {
    value: "in_progress",
    label: "In Progress"
  },
  {
    value: "marks_entry",
    label: "Marks Entry"
  },
  {
    value: "under_review",
    label: "Under Review"
  },
  {
    value: "approved",
    label: "Approved"
  },
  {
    value: "published",
    label: "Published"
  },
  {
    value: "locked",
    label: "Locked"
  },
  {
    value: "archived",
    label: "Archived"
  },
  {
    value: "cancelled",
    label: "Cancelled"
  }
];

const STATUS_META = {
  draft: {
    label: "Draft",
    tone: "neutral",
    dotClass: "bg-slate-400"
  },
  scheduled: {
    label: "Scheduled",
    tone: "info",
    dotClass: "bg-blue-500"
  },
  in_progress: {
    label: "In Progress",
    tone: "warning",
    dotClass: "bg-amber-500"
  },
  marks_entry: {
    label: "Marks Entry",
    tone: "warning",
    dotClass: "bg-orange-500"
  },
  under_review: {
    label: "Under Review",
    tone: "info",
    dotClass: "bg-violet-500"
  },
  approved: {
    label: "Approved",
    tone: "success",
    dotClass: "bg-emerald-500"
  },
  published: {
    label: "Published",
    tone: "success",
    dotClass: "bg-green-500"
  },
  locked: {
    label: "Locked",
    tone: "neutral",
    dotClass: "bg-slate-700"
  },
  archived: {
    label: "Archived",
    tone: "neutral",
    dotClass: "bg-slate-500"
  },
  cancelled: {
    label: "Cancelled",
    tone: "danger",
    dotClass: "bg-rose-500"
  }
};

const WORKFLOW_LABELS = {
  draft: "Move to Draft",
  scheduled: "Schedule Exam",
  in_progress: "Start Exam",
  marks_entry: "Open Marks Entry",
  under_review: "Submit for Review",
  approved: "Approve Exam",
  published: "Publish Results",
  locked: "Lock Exam",
  archived: "Archive Exam",
  cancelled: "Cancel Exam"
};

const DELETE_ALLOWED_STATUSES = [
  "draft",
  "cancelled",
  "archived"
];

const DEFAULT_FILTERS = {
  schoolId: "",
  academicYear: "",
  status: "",
  examType: "",
  isActive: "",
  dateFrom: "",
  dateTo: "",
  sortBy: "startDate",
  sortOrder: "desc",
  limit: "20"
};

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const getRecordId = (
  value
) => {
  if (!value) {
    return "";
  }

  return String(
    value?._id ||
    value?.id ||
    value
  );
};

const normalizeRole = (
  value
) => {
  return String(
    value ||
    ""
  ).toLowerCase();
};

const titleCase = (
  value
) => {
  return String(
    value ||
    ""
  )
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character.toUpperCase()
    );
};

const formatDate = (
  value,
  fallback = "Not set"
) => {
  if (!value) {
    return fallback;
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
    return fallback;
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  ).format(
    date
  );
};

const formatDateTime = (
  value,
  fallback = "Not recorded"
) => {
  if (!value) {
    return fallback;
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
    return fallback;
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(
    date
  );
};

const formatDateRange = (
  startDate,
  endDate
) => {
  if (
    !startDate &&
    !endDate
  ) {
    return "Dates not configured";
  }

  if (
    startDate &&
    endDate
  ) {
    return `${formatDate(
      startDate
    )} – ${formatDate(
      endDate
    )}`;
  }

  return formatDate(
    startDate ||
    endDate
  );
};

const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const isCancelledRequest = (
  error
) => {
  return (
    error?.code ===
      "ERR_CANCELED" ||
    error?.name ===
      "CanceledError" ||
    error?.message ===
      "canceled"
  );
};

const getSchoolName = (
  exam
) => {
  return (
    exam?.schoolId?.schoolName ||
    exam?.school?.schoolName ||
    "School"
  );
};

const getClassName = (
  classItem
) => {
  return (
    classItem?.classId?.className ||
    classItem?.className ||
    "Class"
  );
};

const getClassesLabel = (
  exam
) => {
  const classes =
    exam?.applicableClasses ||
    [];

  if (
    classes.length ===
    0
  ) {
    return "No classes";
  }

  const names =
    classes
      .slice(
        0,
        2
      )
      .map(
        getClassName
      );

  if (
    classes.length >
    2
  ) {
    names.push(
      `+${classes.length - 2}`
    );
  }

  return names.join(
    ", "
  );
};

const getStatusMeta = (
  status
) => {
  return (
    STATUS_META[
      status
    ] || {
      label:
        titleCase(
          status
        ),
      tone:
        "neutral",
      dotClass:
        "bg-slate-400"
    }
  );
};

const getExamTimingState = (
  exam
) => {
  const now =
    new Date();

  const start =
    exam?.startDate
      ? new Date(
          exam.startDate
        )
      : null;

  const end =
    exam?.endDate
      ? new Date(
          exam.endDate
        )
      : null;

  if (
    start &&
    !Number.isNaN(
      start.getTime()
    ) &&
    start >
      now
  ) {
    return {
      label:
        "Upcoming",
      className:
        "bg-blue-50 text-blue-700"
    };
  }

  if (
    start &&
    end &&
    !Number.isNaN(
      start.getTime()
    ) &&
    !Number.isNaN(
      end.getTime()
    ) &&
    start <=
      now &&
    end >=
      now
  ) {
    return {
      label:
        "Ongoing",
      className:
        "bg-amber-50 text-amber-700"
    };
  }

  if (
    end &&
    !Number.isNaN(
      end.getTime()
    ) &&
    end <
      now
  ) {
    return {
      label:
        "Completed Window",
      className:
        "bg-slate-100 text-slate-600"
    };
  }

  return {
    label:
      "Unscheduled",
    className:
      "bg-slate-100 text-slate-500"
  };
};

const getPaginationValue = (
  pagination,
  key,
  fallback
) => {
  const value =
    Number(
      pagination?.[
        key
      ]
    );

  return Number.isFinite(
    value
  )
    ? value
    : fallback;
};

/*
|--------------------------------------------------------------------------
| Small UI Components
|--------------------------------------------------------------------------
*/

const StatusBadge = ({
  status
}) => {
  const meta =
    getStatusMeta(
      status
    );

  return (
    <Badge tone={meta.tone}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`}
      />
      {meta.label}
    </Badge>
  );
};

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  help,
  loading
}) => {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          {loading ? (
            <div className="mt-3 h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {value}
            </p>
          )}

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {help}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
};

const FilterField = ({
  label,
  children,
  className = ""
}) => {
  return (
    <div className={className}>
      <label className="field-label">
        {label}
      </label>
      {children}
    </div>
  );
};

const LoadingRows = () => {
  return Array.from({
    length: 5
  }).map(
    (
      _,
      index
    ) => (
      <tr
        key={index}
        className="border-b border-slate-100 last:border-b-0"
      >
        {Array.from({
          length: 6
        }).map(
          (
            __,
            cellIndex
          ) => (
            <td
              key={cellIndex}
              className="px-4 py-4"
            >
              <div className="h-4 animate-pulse rounded bg-slate-100" />
            </td>
          )
        )}
      </tr>
    )
  );
};

const Toast = ({
  toast,
  onClose
}) => {
  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout =
      window.setTimeout(
        onClose,
        4200
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [
    toast,
    onClose
  ]);

  if (!toast) {
    return null;
  }

  const isError =
    toast.type ===
    "error";

  return (
    <div className="fixed right-4 top-4 z-[80] w-[calc(100%-2rem)] max-w-sm">
      <div
        className={`rounded-xl border p-4 shadow-pop ${
          isError
            ? "border-rose-100 bg-rose-50 text-rose-800"
            : "border-emerald-100 bg-emerald-50 text-emerald-800"
        }`}
      >
        <div className="flex items-start gap-3">
          {isError ? (
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {isError
                ? "Action could not be completed"
                : "Success"}
            </p>
            <p className="mt-1 text-sm leading-5">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 opacity-70 transition hover:bg-white/60 hover:opacity-100"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Exam Card
|--------------------------------------------------------------------------
*/

const ExamCard = ({
  exam,
  canManage,
  online,
  onView,
  onEdit,
  onClone,
  onStatus,
  onDelete
}) => {
  const timing =
    getExamTimingState(
      exam
    );

  const editable =
    exam?.status ===
      "draft" ||
    exam?.status ===
      "scheduled";

  const deletable =
    DELETE_ALLOWED_STATUSES.includes(
      exam?.status
    );

  return (
    <article className="card overflow-hidden">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={exam.status}
              />

              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${timing.className}`}
              >
                {timing.label}
              </span>
            </div>

            <h3 className="mt-3 truncate text-base font-semibold text-slate-900">
              {exam.examName}
            </h3>

            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {exam.examCode} ·{" "}
              {titleCase(
                exam.examType
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onView(
                exam
              )
            }
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            aria-label={`View ${exam.examName}`}
          >
            <Eye size={17} />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-4 text-sm">
        <div className="flex items-start gap-3">
          <CalendarDays
            size={16}
            className="mt-0.5 shrink-0 text-slate-400"
          />
          <div>
            <p className="font-medium text-slate-700">
              {formatDateRange(
                exam.startDate,
                exam.endDate
              )}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {exam.academicYear}
              {exam.academicTerm
                ? ` · ${exam.academicTerm}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <UsersRound
            size={16}
            className="mt-0.5 shrink-0 text-slate-400"
          />
          <div>
            <p className="font-medium text-slate-700">
              {getClassesLabel(
                exam
              )}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {exam.classCount ??
                exam.applicableClasses?.length ??
                0}{" "}
              classes ·{" "}
              {exam.subjectRuleCount ??
                exam.subjectRules?.length ??
                0}{" "}
              subject rules
            </p>
          </div>
        </div>

        {exam.schoolId?.schoolName && (
          <div className="flex items-start gap-3">
            <School
              size={16}
              className="mt-0.5 shrink-0 text-slate-400"
            />
            <p className="font-medium text-slate-700">
              {getSchoolName(
                exam
              )}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <button
          type="button"
          className="btn-secondary px-3 py-2"
          onClick={() =>
            onView(
              exam
            )
          }
        >
          <Eye size={15} />
          Details
        </button>

        {canManage && (
          <>
            {editable && (
              <button
                type="button"
                className="btn-ghost px-3 py-2"
                onClick={() =>
                  onEdit(
                    exam
                  )
                }
              >
                <Pencil size={15} />
                Edit
              </button>
            )}

            <button
              type="button"
              className="btn-ghost px-3 py-2"
              onClick={() =>
                onClone(
                  exam
                )
              }
              disabled={!online}
            >
              <Copy size={15} />
              Clone
            </button>

            <button
              type="button"
              className="btn-ghost px-3 py-2"
              onClick={() =>
                onStatus(
                  exam
                )
              }
              disabled={!online}
            >
              <ArrowRight size={15} />
              Workflow
            </button>

            {deletable && (
              <button
                type="button"
                className="ml-auto rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                onClick={() =>
                  onDelete(
                    exam
                  )
                }
                disabled={!online}
                aria-label={`Delete ${exam.examName}`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Exam Detail Modal
|--------------------------------------------------------------------------
*/

const ExamDetailModal = ({
  open,
  onClose,
  exam,
  dependencies,
  workflowState,
  allowedTransitions,
  loading,
  error,
  canManage,
  online,
  onRetry,
  onEdit,
  onClone,
  onStatus,
  onDelete
}) => {
  const resultSettings =
    exam?.resultSettings ||
    {};

  const classes =
    exam?.applicableClasses ||
    [];

  const subjectRules =
    exam?.subjectRules ||
    [];

  const dependencyItems = [
    {
      label: "Schedules",
      value:
        dependencies?.schedules ??
        workflowState?.schedules?.total ??
        0,
      icon: CalendarDays
    },
    {
      label: "Marks",
      value:
        dependencies?.marks ??
        workflowState?.marks?.total ??
        0,
      icon: ClipboardList
    },
    {
      label: "Results",
      value:
        dependencies?.results ??
        workflowState?.results?.total ??
        0,
      icon: GraduationCap
    },
    {
      label: "Report Cards",
      value:
        dependencies?.reportCards ??
        workflowState?.reportCards?.total ??
        0,
      icon: FileText
    }
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        exam?.examName ||
        "Exam Details"
      }
      width="max-w-5xl"
    >
      {loading ? (
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({
              length: 3
            }).map(
              (
                _,
                index
              ) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-xl bg-slate-100"
                />
              )
            )}
          </div>
          <div className="h-52 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-5 text-center">
          <AlertCircle
            size={28}
            className="mx-auto text-rose-500"
          />
          <p className="mt-3 text-sm font-semibold text-rose-800">
            Exam details could not be loaded
          </p>
          <p className="mt-1 text-sm text-rose-600">
            {error}
          </p>
          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={onRetry}
          >
            <RefreshCw size={15} />
            Try Again
          </button>
        </div>
      ) : exam ? (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-blue-50 p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={exam.status}
                  />

                  <span className="badge bg-white text-slate-600 shadow-sm">
                    {titleCase(
                      exam.examType
                    )}
                  </span>

                  {exam.lock?.isLocked && (
                    <span className="badge bg-slate-900 text-white">
                      <LockKeyhole size={12} />
                      Locked
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-900">
                  {exam.examName}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {exam.examCode} ·{" "}
                  {exam.academicYear}
                  {exam.academicTerm
                    ? ` · ${exam.academicTerm}`
                    : ""}
                </p>

                {exam.description && (
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    {exam.description}
                  </p>
                )}
              </div>

              {canManage && (
                <div className="flex flex-wrap gap-2">
                  {(
                    exam.status ===
                      "draft" ||
                    exam.status ===
                      "scheduled"
                  ) && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        onEdit(
                          exam
                        )
                      }
                    >
                      <Pencil size={15} />
                      Edit
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      onClone(
                        exam
                      )
                    }
                    disabled={!online}
                  >
                    <Copy size={15} />
                    Clone
                  </button>

                  {allowedTransitions.length >
                    0 && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() =>
                        onStatus(
                          exam,
                          allowedTransitions
                        )
                      }
                      disabled={!online}
                    >
                      <ArrowRight size={15} />
                      Change Status
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <CalendarDays
                size={18}
                className="text-brand-600"
              />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Exam Window
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDateRange(
                  exam.startDate,
                  exam.endDate
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <Clock3
                size={18}
                className="text-brand-600"
              />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Marks Window
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {exam.marksEntryOpensAt
                  ? formatDate(
                      exam.marksEntryOpensAt
                    )
                  : "Not configured"}
              </p>
              {exam.marksEntryClosesAt && (
                <p className="mt-0.5 text-xs text-slate-400">
                  Closes{" "}
                  {formatDate(
                    exam.marksEntryClosesAt
                  )}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <UsersRound
                size={18}
                className="text-brand-600"
              />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Academic Scope
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {classes.length} classes
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {subjectRules.length} subject rules
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <ShieldCheck
                size={18}
                className="text-brand-600"
              />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Result Publication
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(
                  exam.resultPublicationDate,
                  "Not scheduled"
                )}
              </p>
              <p className="mt-0.5 text-xs capitalize text-slate-400">
                {titleCase(
                  resultSettings.visibility ||
                  "private"
                )}
              </p>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Classes and Sections
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Academic groups included in this examination.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {classes.map(
                (
                  classItem,
                  index
                ) => (
                  <div
                    key={
                      getRecordId(
                        classItem.classId
                      ) ||
                      index
                    }
                    className="rounded-xl border border-slate-100 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {getClassName(
                            classItem
                          )}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {classItem.allSections
                            ? "All sections"
                            : (
                                classItem.sections ||
                                []
                              ).join(
                                ", "
                              ) ||
                              "No sections selected"}
                        </p>
                      </div>

                      <span className="badge bg-slate-100 text-slate-600">
                        {classItem.allSections
                          ? "Whole class"
                          : `${
                              classItem.sections
                                ?.length ||
                              0
                            } sections`}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Subject Assessment Rules
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Marks, passing criteria and assigned teaching staff.
              </p>
            </div>

            {subjectRules.length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                <BookOpenCheck
                  size={26}
                  className="mx-auto text-slate-300"
                />
                <p className="mt-2 text-sm font-medium text-slate-600">
                  No subject rules configured
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Subject
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Class
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Maximum
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Passing
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Components
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Teachers
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjectRules.map(
                      (
                        rule,
                        index
                      ) => (
                        <tr
                          key={`${getRecordId(
                            rule.subjectId
                          )}-${index}`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">
                              {rule.subjectId
                                ?.subjectName ||
                                "Subject"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {rule.subjectId
                                ?.subjectCode ||
                                "No code"}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {rule.classId
                              ?.className ||
                              "Class"}
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {rule.maxMarks}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {rule.passingMarks}
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-500">
                            <div className="flex flex-wrap gap-1">
                              {Number(
                                rule.theoryMarks ||
                                0
                              ) >
                                0 && (
                                <span className="badge bg-blue-50 text-blue-700">
                                  Theory{" "}
                                  {rule.theoryMarks}
                                </span>
                              )}

                              {Number(
                                rule.practicalMarks ||
                                0
                              ) >
                                0 && (
                                <span className="badge bg-violet-50 text-violet-700">
                                  Practical{" "}
                                  {rule.practicalMarks}
                                </span>
                              )}

                              {Number(
                                rule.internalMarks ||
                                0
                              ) >
                                0 && (
                                <span className="badge bg-amber-50 text-amber-700">
                                  Internal{" "}
                                  {rule.internalMarks}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {(
                              rule.assignedTeachers ||
                              []
                            ).length >
                            0
                              ? rule.assignedTeachers
                                  .map(
                                    (
                                      teacher
                                    ) =>
                                      teacher.name
                                  )
                                  .join(
                                    ", "
                                  )
                              : "Not assigned"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Linked Records
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Operational records connected with this exam.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {dependencyItems.map(
                (
                  item
                ) => {
                  const Icon =
                    item.icon;

                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border border-slate-100 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Icon
                          size={17}
                          className="text-slate-400"
                        />
                        <p className="text-xl font-bold text-slate-900">
                          {item.value}
                        </p>
                      </div>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {item.label}
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Result Settings
              </h3>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">
                    Grade scheme
                  </dt>
                  <dd className="text-right font-medium text-slate-800">
                    {resultSettings
                      .gradeSchemeId
                      ?.schemeName ||
                      "Not assigned"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">
                    Ranking
                  </dt>
                  <dd className="font-medium text-slate-800">
                    {resultSettings
                      .rankingEnabled
                      ? "Enabled"
                      : "Disabled"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">
                    Show grade
                  </dt>
                  <dd className="font-medium text-slate-800">
                    {resultSettings
                      .showGrade !==
                    false
                      ? "Yes"
                      : "No"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">
                    Report cards
                  </dt>
                  <dd className="font-medium text-slate-800">
                    {resultSettings
                      .publishReportCards !==
                    false
                      ? "Enabled"
                      : "Disabled"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Audit Information
              </h3>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">
                    Created by
                  </dt>
                  <dd className="text-right font-medium text-slate-800">
                    {exam.createdBy
                      ?.name ||
                      "System"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">
                    Created
                  </dt>
                  <dd className="text-right font-medium text-slate-800">
                    {formatDateTime(
                      exam.createdAt
                    )}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">
                    Last updated
                  </dt>
                  <dd className="text-right font-medium text-slate-800">
                    {formatDateTime(
                      exam.updatedAt
                    )}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">
                    Version
                  </dt>
                  <dd className="font-medium text-slate-800">
                    {exam.versionNumber ||
                      1}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {exam.instructions && (
            <section className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-600"
                />
                <div>
                  <h3 className="text-sm font-semibold text-amber-900">
                    Examination Instructions
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-amber-800">
                    {exam.instructions}
                  </p>
                </div>
              </div>
            </section>
          )}

          {canManage &&
            DELETE_ALLOWED_STATUSES.includes(
              exam.status
            ) && (
            <div className="flex justify-end border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() =>
                  onDelete(
                    exam
                  )
                }
                disabled={!online}
                className="btn-danger"
              >
                <Trash2 size={15} />
                Delete Exam
              </button>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
};

/*
|--------------------------------------------------------------------------
| Status Change Modal
|--------------------------------------------------------------------------
*/

const StatusChangeModal = ({
  open,
  onClose,
  exam,
  allowedTransitions,
  submitting,
  online,
  onSubmit
}) => {
  const [status, setStatus] =
    useState("");

  const [reason, setReason] =
    useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setStatus(
      allowedTransitions?.[0] ||
      ""
    );

    setReason("");
  }, [
    open,
    allowedTransitions
  ]);

  const requiresReason =
    status ===
      "cancelled" ||
    status ===
      "locked";

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    onSubmit({
      status,
      reason
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change Exam Workflow Status"
      width="max-w-lg"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Current Exam
          </p>
          <p className="mt-1 font-semibold text-slate-800">
            {exam?.examName}
          </p>
          <div className="mt-2">
            <StatusBadge
              status={exam?.status}
            />
          </div>
        </div>

        <FilterField label="Next status">
          <select
            className="field-select"
            value={status}
            onChange={
              (
                event
              ) => {
                setStatus(
                  event.target.value
                );
                setReason("");
              }
            }
            required
            disabled={
              submitting ||
              !online
            }
          >
            {allowedTransitions.map(
              (
                transition
              ) => (
                <option
                  key={transition}
                  value={transition}
                >
                  {WORKFLOW_LABELS[
                    transition
                  ] ||
                    titleCase(
                      transition
                    )}
                </option>
              )
            )}
          </select>
        </FilterField>

        {requiresReason && (
          <FilterField
            label={
              status ===
              "cancelled"
                ? "Cancellation reason"
                : "Lock reason"
            }
          >
            <textarea
              className="field-input min-h-28 resize-y"
              value={reason}
              onChange={
                (
                  event
                ) =>
                  setReason(
                    event.target.value
                  )
              }
              placeholder={
                status ===
                "cancelled"
                  ? "Explain why this exam is being cancelled."
                  : "Record why the exam and results are being locked."
              }
              required={
                status ===
                "cancelled"
              }
              disabled={
                submitting ||
                !online
              }
            />
          </FilterField>
        )}

        {!online && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Workflow changes are disabled while offline.
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={
              submitting ||
              !online ||
              !status ||
              (
                status ===
                  "cancelled" &&
                !reason.trim()
              )
            }
          >
            {submitting ? (
              <>
                <Loader2
                  size={15}
                  className="animate-spin"
                />
                Updating
              </>
            ) : (
              <>
                <ArrowRight size={15} />
                Confirm Change
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/*
|--------------------------------------------------------------------------
| Clone Exam Modal
|--------------------------------------------------------------------------
*/

const CloneExamModal = ({
  open,
  onClose,
  exam,
  submitting,
  online,
  onSubmit
}) => {
  const [form, setForm] =
    useState({
      examCode: "",
      examName: "",
      academicYear: "",
      academicTerm: "",
      startDate: "",
      endDate: ""
    });

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      examCode:
        exam?.examCode
          ? `${exam.examCode}-COPY`
          : "",

      examName:
        exam?.examName
          ? `${exam.examName} Copy`
          : "",

      academicYear:
        "",

      academicTerm:
        exam?.academicTerm ||
        "",

      startDate:
        "",

      endDate:
        ""
    });
  }, [
    open,
    exam
  ]);

  const updateField =
    (
      field
    ) =>
    (
      event
    ) => {
      setForm(
        (
          current
        ) => ({
          ...current,
          [field]:
            event.target.value
        })
      );
    };

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    onSubmit(
      form
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Clone Exam"
      width="max-w-2xl"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Copy
              size={18}
              className="mt-0.5 shrink-0 text-blue-600"
            />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Create a fresh draft
              </p>
              <p className="mt-1 text-sm leading-5 text-blue-700">
                Classes and subject rules will be copied. Schedules,
                marks, approvals and publication history will not be copied.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FilterField label="New exam code">
            <input
              className="field-input"
              value={form.examCode}
              onChange={updateField(
                "examCode"
              )}
              placeholder="ANNUAL-2027"
              required
              disabled={
                submitting ||
                !online
              }
            />
          </FilterField>

          <FilterField label="Academic year">
            <input
              className="field-input"
              value={
                form.academicYear
              }
              onChange={updateField(
                "academicYear"
              )}
              placeholder="2027-2028"
              required
              disabled={
                submitting ||
                !online
              }
            />
          </FilterField>

          <FilterField
            label="Exam name"
            className="sm:col-span-2"
          >
            <input
              className="field-input"
              value={form.examName}
              onChange={updateField(
                "examName"
              )}
              placeholder="Annual Examination 2027"
              required
              disabled={
                submitting ||
                !online
              }
            />
          </FilterField>

          <FilterField label="Academic term">
            <input
              className="field-input"
              value={
                form.academicTerm
              }
              onChange={updateField(
                "academicTerm"
              )}
              placeholder="Final Term"
              disabled={
                submitting ||
                !online
              }
            />
          </FilterField>

          <div />

          <FilterField label="Start date">
            <input
              type="date"
              className="field-input"
              value={form.startDate}
              onChange={updateField(
                "startDate"
              )}
              required
              disabled={
                submitting ||
                !online
              }
            />
          </FilterField>

          <FilterField label="End date">
            <input
              type="date"
              className="field-input"
              min={form.startDate}
              value={form.endDate}
              onChange={updateField(
                "endDate"
              )}
              required
              disabled={
                submitting ||
                !online
              }
            />
          </FilterField>
        </div>

        {!online && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Exam cloning is disabled while offline.
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={
              submitting ||
              !online ||
              !form.examCode.trim() ||
              !form.examName.trim() ||
              !form.academicYear.trim() ||
              !form.startDate ||
              !form.endDate
            }
          >
            {submitting ? (
              <>
                <Loader2
                  size={15}
                  className="animate-spin"
                />
                Cloning
              </>
            ) : (
              <>
                <Copy size={15} />
                Create Draft Copy
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/*
|--------------------------------------------------------------------------
| Exam List Page
|--------------------------------------------------------------------------
*/

const ExamList = () => {
  const navigate =
    useNavigate();

  const {
    user
  } = useAuth();

  const role =
    normalizeRole(
      user?.role
    );

  const isSuperAdmin =
    role ===
    "super_admin";

  const canManage =
    [
      "super_admin",
      "principal"
    ].includes(
      role
    );

  const [online, setOnline] =
    useState(
      typeof navigator ===
        "undefined"
        ? true
        : navigator.onLine
    );

  const [exams, setExams] =
    useState([]);

  const [
    pagination,
    setPagination
  ] =
    useState({
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    });

  const [summary, setSummary] =
    useState({
      total: 0,
      upcoming: 0,
      ongoing: 0,
      published: 0,
      byStatus: {}
    });

  const [filters, setFilters] =
    useState(
      DEFAULT_FILTERS
    );

  const [
    searchInput,
    setSearchInput
  ] =
    useState("");

  const [
    debouncedSearch,
    setDebouncedSearch
  ] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing
  ] =
    useState(false);

  const [
    summaryLoading,
    setSummaryLoading
  ] =
    useState(true);

  const [error, setError] =
    useState("");

  const [schools, setSchools] =
    useState([]);

  const [
    schoolsLoading,
    setSchoolsLoading
  ] =
    useState(false);

  const [
    filtersOpen,
    setFiltersOpen
  ] =
    useState(false);

  const [toast, setToast] =
    useState(null);

  const closeToast =
    useCallback(
      () => {
        setToast(
          null
        );
      },
      []
    );

  const [
    selectedExamId,
    setSelectedExamId
  ] =
    useState("");

  const [
    detailOpen,
    setDetailOpen
  ] =
    useState(false);

  const [
    detailExam,
    setDetailExam
  ] =
    useState(null);

  const [
    detailDependencies,
    setDetailDependencies
  ] =
    useState(null);

  const [
    detailWorkflow,
    setDetailWorkflow
  ] =
    useState(null);

  const [
    detailTransitions,
    setDetailTransitions
  ] =
    useState([]);

  const [
    detailLoading,
    setDetailLoading
  ] =
    useState(false);

  const [
    detailError,
    setDetailError
  ] =
    useState("");

  const [
    statusModalOpen,
    setStatusModalOpen
  ] =
    useState(false);

  const [
    statusExam,
    setStatusExam
  ] =
    useState(null);

  const [
    statusTransitions,
    setStatusTransitions
  ] =
    useState([]);

  const [
    statusSubmitting,
    setStatusSubmitting
  ] =
    useState(false);

  const [
    cloneModalOpen,
    setCloneModalOpen
  ] =
    useState(false);

  const [
    cloneTarget,
    setCloneTarget
  ] =
    useState(null);

  const [
    cloneSubmitting,
    setCloneSubmitting
  ] =
    useState(false);

  const [
    deleteTarget,
    setDeleteTarget
  ] =
    useState(null);

  const [
    deleteDialogOpen,
    setDeleteDialogOpen
  ] =
    useState(false);

  const [
    deleteChecking,
    setDeleteChecking
  ] =
    useState(false);

  const [
    deleteSubmitting,
    setDeleteSubmitting
  ] =
    useState(false);

  const listAbortRef =
    useRef(null);

  const summaryAbortRef =
    useRef(null);

  const detailAbortRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Connectivity
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleOnline = () =>
      setOnline(
        true
      );

    const handleOffline = () =>
      setOnline(
        false
      );

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Search Debounce
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          setDebouncedSearch(
            searchInput.trim()
          );

          setPage(
            1
          );
        },
        400
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [
    searchInput
  ]);

  /*
  |--------------------------------------------------------------------------
  | Schools
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!isSuperAdmin) {
      setSchools([]);
      return undefined;
    }

    let active =
      true;

    const loadSchools =
      async () => {
        setSchoolsLoading(
          true
        );

        try {
          const {
            data
          } =
            await getSchools({
              limit: 100,
              isActive: true
            });

          if (!active) {
            return;
          }

          setSchools(
            data?.schools ||
            data?.data?.schools ||
            []
          );
        } catch (
          requestError
        ) {
          if (!active) {
            return;
          }

          setSchools([]);

          setToast({
            type: "error",
            message:
              getErrorMessage(
                requestError,
                "Schools could not be loaded."
              )
          });
        } finally {
          if (active) {
            setSchoolsLoading(
              false
            );
          }
        }
      };

    loadSchools();

    return () => {
      active =
        false;
    };
  }, [
    isSuperAdmin
  ]);

  /*
  |--------------------------------------------------------------------------
  | Query Parameters
  |--------------------------------------------------------------------------
  */

  const listParams =
    useMemo(
      () => ({
        schoolId:
          filters.schoolId,

        academicYear:
          filters.academicYear,

        status:
          filters.status,

        examType:
          filters.examType,

        isActive:
          filters.isActive,

        search:
          debouncedSearch,

        dateFrom:
          filters.dateFrom,

        dateTo:
          filters.dateTo,

        page,

        limit:
          filters.limit,

        sortBy:
          filters.sortBy,

        sortOrder:
          filters.sortOrder
      }),
      [
        filters.schoolId,
        filters.academicYear,
        filters.status,
        filters.examType,
        filters.isActive,
        filters.dateFrom,
        filters.dateTo,
        filters.limit,
        filters.sortBy,
        filters.sortOrder,
        debouncedSearch,
        page
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Load Exams
  |--------------------------------------------------------------------------
  */

  const loadExams =
    useCallback(
      async (
        {
          silent = false
        } = {}
      ) => {
        listAbortRef.current?.abort();

        const controller =
          new AbortController();

        listAbortRef.current =
          controller;

        if (silent) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError("");

        try {
          const {
            data
          } =
            await getExams(
              listParams,
              {
                signal:
                  controller.signal
              }
            );

          setExams(
            data?.exams ||
            data?.data?.exams ||
            []
          );

          setPagination({
            total:
              getPaginationValue(
                data?.pagination,
                "total",
                data?.count ||
                0
              ),

            page:
              getPaginationValue(
                data?.pagination,
                "page",
                page
              ),

            limit:
              getPaginationValue(
                data?.pagination,
                "limit",
                Number(
                  filters.limit
                ) ||
                20
              ),

            totalPages:
              getPaginationValue(
                data?.pagination,
                "totalPages",
                1
              ),

            hasNextPage:
              Boolean(
                data?.pagination
                  ?.hasNextPage
              ),

            hasPrevPage:
              Boolean(
                data?.pagination
                  ?.hasPrevPage
              )
          });
        } catch (
          requestError
        ) {
          if (
            isCancelledRequest(
              requestError
            )
          ) {
            return;
          }

          setExams([]);

          setError(
            getErrorMessage(
              requestError,
              "Exams could not be loaded."
            )
          );
        } finally {
          if (
            listAbortRef.current ===
            controller
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
      [
        listParams,
        page,
        filters.limit
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Load Summary
  |--------------------------------------------------------------------------
  */

  const loadSummary =
    useCallback(
      async () => {
        summaryAbortRef.current?.abort();

        const controller =
          new AbortController();

        summaryAbortRef.current =
          controller;

        setSummaryLoading(
          true
        );

        try {
          const {
            data
          } =
            await getExamSummary(
              {
                schoolId:
                  filters.schoolId,

                academicYear:
                  filters.academicYear
              },
              {
                signal:
                  controller.signal
              }
            );

          setSummary(
            data?.summary ||
            data?.data?.summary ||
            {
              total: 0,
              upcoming: 0,
              ongoing: 0,
              published: 0,
              byStatus: {}
            }
          );
        } catch (
          requestError
        ) {
          if (
            isCancelledRequest(
              requestError
            )
          ) {
            return;
          }

          setSummary({
            total: 0,
            upcoming: 0,
            ongoing: 0,
            published: 0,
            byStatus: {}
          });
        } finally {
          if (
            summaryAbortRef.current ===
            controller
          ) {
            setSummaryLoading(
              false
            );
          }
        }
      },
      [
        filters.schoolId,
        filters.academicYear
      ]
    );

  useEffect(() => {
    loadExams();

    return () => {
      listAbortRef.current?.abort();
    };
  }, [
    loadExams
  ]);

  useEffect(() => {
    loadSummary();

    return () => {
      summaryAbortRef.current?.abort();
    };
  }, [
    loadSummary
  ]);

  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

  const updateFilter =
    (
      field
    ) =>
    (
      event
    ) => {
      setFilters(
        (
          current
        ) => ({
          ...current,
          [field]:
            event.target.value
        })
      );

      setPage(
        1
      );
    };

  const resetFilters = () => {
    setFilters(
      DEFAULT_FILTERS
    );

    setSearchInput(
      ""
    );

    setDebouncedSearch(
      ""
    );

    setPage(
      1
    );
  };

  const activeFilterCount =
    useMemo(
      () => {
        return [
          filters.schoolId,
          filters.academicYear,
          filters.status,
          filters.examType,
          filters.isActive,
          filters.dateFrom,
          filters.dateTo,
          debouncedSearch
        ].filter(
          Boolean
        ).length;
      },
      [
        filters.schoolId,
        filters.academicYear,
        filters.status,
        filters.examType,
        filters.isActive,
        filters.dateFrom,
        filters.dateTo,
        debouncedSearch
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Refresh
  |--------------------------------------------------------------------------
  */

  const refreshAll =
    useCallback(
      async () => {
        await Promise.allSettled([
          loadExams({
            silent: true
          }),
          loadSummary()
        ]);
      },
      [
        loadExams,
        loadSummary
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Exam Details
  |--------------------------------------------------------------------------
  */

  const loadExamDetail =
    useCallback(
      async (
        examId
      ) => {
        const id =
          getRecordId(
            examId
          );

        if (!id) {
          return;
        }

        detailAbortRef.current?.abort();

        const controller =
          new AbortController();

        detailAbortRef.current =
          controller;

        setSelectedExamId(
          id
        );

        setDetailLoading(
          true
        );

        setDetailError("");

        try {
          const {
            data
          } =
            await getExamById(
              id,
              {
                signal:
                  controller.signal
              }
            );

          setDetailExam(
            data?.exam ||
            data?.data?.exam ||
            null
          );

          setDetailDependencies(
            data?.dependencies ||
            data?.data?.dependencies ||
            null
          );

          setDetailWorkflow(
            data?.workflowState ||
            data?.data?.workflowState ||
            null
          );

          setDetailTransitions(
            data?.allowedStatusTransitions ||
            data?.data
              ?.allowedStatusTransitions ||
            []
          );
        } catch (
          requestError
        ) {
          if (
            isCancelledRequest(
              requestError
            )
          ) {
            return;
          }

          setDetailExam(
            null
          );

          setDetailDependencies(
            null
          );

          setDetailWorkflow(
            null
          );

          setDetailTransitions(
            []
          );

          setDetailError(
            getErrorMessage(
              requestError,
              "Exam details could not be loaded."
            )
          );
        } finally {
          if (
            detailAbortRef.current ===
            controller
          ) {
            setDetailLoading(
              false
            );
          }
        }
      },
      []
    );

  const openExamDetails = (
    exam
  ) => {
    const examId =
      getRecordId(
        exam
      );

    setDetailOpen(
      true
    );

    setDetailExam(
      exam
    );

    setSelectedExamId(
      examId
    );

    loadExamDetail(
      examId
    );
  };

  const closeExamDetails = () => {
    detailAbortRef.current?.abort();

    setDetailOpen(
      false
    );

    setSelectedExamId(
      ""
    );

    setDetailExam(
      null
    );

    setDetailDependencies(
      null
    );

    setDetailWorkflow(
      null
    );

    setDetailTransitions(
      []
    );

    setDetailError(
      ""
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Navigation
  |--------------------------------------------------------------------------
  */

  const openCreateExam = () => {
    navigate(
      "/exams/new",
      {
        state: {
          schoolId:
            filters.schoolId ||
            undefined
        }
      }
    );
  };

  const openEditExam = (
    exam
  ) => {
    navigate(
      `/exams/${getRecordId(
        exam
      )}/edit`
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Status Workflow
  |--------------------------------------------------------------------------
  */

  const openStatusModal = (
    exam,
    explicitTransitions
  ) => {
    const transitions =
      explicitTransitions ||
      (
        getRecordId(
          exam
        ) ===
        selectedExamId
          ? detailTransitions
          : []
      );

    if (
      transitions.length ===
      0
    ) {
      openExamDetails(
        exam
      );

      setToast({
        type: "error",
        message:
          "Open exam details to load the latest allowed workflow actions."
      });

      return;
    }

    setStatusExam(
      exam
    );

    setStatusTransitions(
      transitions
    );

    setStatusModalOpen(
      true
    );
  };

  const handleStatusSubmit =
    async ({
      status,
      reason
    }) => {
      if (
        !statusExam ||
        !status
      ) {
        return;
      }

      if (!online) {
        setToast({
          type: "error",
          message:
            "You are offline. Reconnect before changing exam status."
        });

        return;
      }

      setStatusSubmitting(
        true
      );

      try {
        if (
          status ===
          "cancelled"
        ) {
          await cancelExam(
            statusExam,
            reason
          );
        } else if (
          status ===
          "locked"
        ) {
          await lockExam(
            statusExam,
            reason
          );
        } else {
          await transitionExamStatus(
            statusExam,
            status
          );
        }

        setStatusModalOpen(
          false
        );

        setStatusExam(
          null
        );

        setStatusTransitions(
          []
        );

        setToast({
          type: "success",
          message:
            `Exam status changed to ${
              getStatusMeta(
                status
              ).label
            }.`
        });

        await refreshAll();

        if (
          detailOpen &&
          selectedExamId
        ) {
          await loadExamDetail(
            selectedExamId
          );
        }
      } catch (
        requestError
      ) {
        setToast({
          type: "error",
          message:
            getErrorMessage(
              requestError,
              "Exam status could not be updated."
            )
        });
      } finally {
        setStatusSubmitting(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Clone
  |--------------------------------------------------------------------------
  */

  const openCloneModal = (
    exam
  ) => {
    setCloneTarget(
      exam
    );

    setCloneModalOpen(
      true
    );
  };

  const handleCloneSubmit =
    async (
      payload
    ) => {
      if (
        !cloneTarget
      ) {
        return;
      }

      if (!online) {
        setToast({
          type: "error",
          message:
            "You are offline. Reconnect before cloning an exam."
        });

        return;
      }

      setCloneSubmitting(
        true
      );

      try {
        const {
          data
        } =
          await cloneExam(
            cloneTarget,
            payload
          );

        const clonedExam =
          data?.exam ||
          data?.data?.exam;

        setCloneModalOpen(
          false
        );

        setCloneTarget(
          null
        );

        setToast({
          type: "success",
          message:
            "A new draft exam was created successfully."
        });

        await refreshAll();

        if (
          clonedExam?._id
        ) {
          openExamDetails(
            clonedExam
          );
        }
      } catch (
        requestError
      ) {
        setToast({
          type: "error",
          message:
            getErrorMessage(
              requestError,
              "Exam could not be cloned."
            )
        });
      } finally {
        setCloneSubmitting(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Delete
  |--------------------------------------------------------------------------
  */

  const requestDeleteExam =
    async (
      exam
    ) => {
      if (!online) {
        setToast({
          type: "error",
          message:
            "You are offline. Reconnect before deleting an exam."
        });

        return;
      }

      if (
        !DELETE_ALLOWED_STATUSES.includes(
          exam.status
        )
      ) {
        setToast({
          type: "error",
          message:
            "Only draft, cancelled or archived exams can be deleted."
        });

        return;
      }

      setDeleteChecking(
        true
      );

      try {
        const {
          data
        } =
          await getExamDependencies(
            exam
          );

        const dependencies =
          data?.dependencies ||
          data?.data?.dependencies ||
          {};

        const canDelete =
          data?.canDelete ??
          data?.data?.canDelete ??
          (
            Number(
              dependencies.total ||
              0
            ) ===
            0
          );

        if (!canDelete) {
          setToast({
            type: "error",
            message:
              "This exam has linked schedules, marks, results or report cards and cannot be deleted."
          });

          if (
            getRecordId(
              exam
            ) ===
            selectedExamId
          ) {
            setDetailDependencies(
              dependencies
            );
          }

          return;
        }

        setDeleteTarget(
          exam
        );

        setDeleteDialogOpen(
          true
        );
      } catch (
        requestError
      ) {
        setToast({
          type: "error",
          message:
            getErrorMessage(
              requestError,
              "Exam dependencies could not be checked."
            )
        });
      } finally {
        setDeleteChecking(
          false
        );
      }
    };

  const confirmDeleteExam =
    async () => {
      if (
        !deleteTarget
      ) {
        return;
      }

      setDeleteSubmitting(
        true
      );

      try {
        await deleteExam(
          deleteTarget
        );

        setDeleteDialogOpen(
          false
        );

        setDeleteTarget(
          null
        );

        if (
          getRecordId(
            deleteTarget
          ) ===
          selectedExamId
        ) {
          closeExamDetails();
        }

        setToast({
          type: "success",
          message:
            "Exam moved to deleted records."
        });

        await refreshAll();
      } catch (
        requestError
      ) {
        setToast({
          type: "error",
          message:
            getErrorMessage(
              requestError,
              "Exam could not be deleted."
            )
        });
      } finally {
        setDeleteSubmitting(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

  const totalPages =
    Math.max(
      1,
      getPaginationValue(
        pagination,
        "totalPages",
        1
      )
    );

  const currentPage =
    Math.min(
      totalPages,
      Math.max(
        1,
        getPaginationValue(
          pagination,
          "page",
          page
        )
      )
    );

  const totalRecords =
    getPaginationValue(
      pagination,
      "total",
      exams.length
    );

  const startRecord =
    totalRecords ===
      0
      ? 0
      : (
          currentPage -
          1
        ) *
          getPaginationValue(
            pagination,
            "limit",
            Number(
              filters.limit
            ) ||
              20
          ) +
        1;

  const endRecord =
    Math.min(
      totalRecords,
      startRecord +
        exams.length -
        1
    );

  const goToPage = (
    nextPage
  ) => {
    setPage(
      Math.min(
        totalPages,
        Math.max(
          1,
          nextPage
        )
      )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="space-y-5">
      <Toast
        toast={toast}
        onClose={closeToast}
      />

      <PageHeader
        title="Examinations"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  navigate(
                    "/exams/deleted"
                  )
                }
              >
                <Archive size={16} />
                Deleted
              </button>
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                refreshAll()
              }
              disabled={
                refreshing ||
                loading
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

            {canManage && (
              <button
                type="button"
                className="btn-primary"
                onClick={
                  openCreateExam
                }
                disabled={!online}
              >
                <Plus size={16} />
                New Exam
              </button>
            )}
          </div>
        }
      />

      {!online && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                You are offline
              </p>
              <p className="mt-0.5 text-sm text-amber-700">
                Existing exam data may remain visible, but create, clone,
                workflow and delete actions are disabled.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-600 via-brand-500 to-blue-600 p-5 text-white shadow-card sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-brand-100">
              <GraduationCap size={18} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Exam and Result Management
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-bold">
              Plan, monitor and publish examinations
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-50/90">
              Manage academic scope, examination windows, marks workflow,
              result approvals and report-card readiness from one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs font-medium text-brand-100">
                Current scope
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {isSuperAdmin
                  ? schools.find(
                      (
                        schoolItem
                      ) =>
                        getRecordId(
                          schoolItem
                        ) ===
                        filters.schoolId
                    )?.schoolName ||
                    "All schools"
                  : user?.schoolId
                      ?.schoolName ||
                    "Assigned school"}
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs font-medium text-brand-100">
                Academic year
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {filters.academicYear ||
                  "All years"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={ClipboardList}
          label="Total Exams"
          value={
            summary.total ||
            0
          }
          help="All exams in the selected scope"
          loading={summaryLoading}
        />

        <SummaryCard
          icon={CalendarDays}
          label="Upcoming"
          value={
            summary.upcoming ||
            0
          }
          help="Exams starting after today"
          loading={summaryLoading}
        />

        <SummaryCard
          icon={Activity}
          label="Ongoing"
          value={
            summary.ongoing ||
            0
          }
          help="Current examination windows"
          loading={summaryLoading}
        />

        <SummaryCard
          icon={ShieldCheck}
          label="Published"
          value={
            summary.published ||
            0
          }
          help="Published or locked results"
          loading={summaryLoading}
        />

        <SummaryCard
          icon={CircleDot}
          label="Under Review"
          value={
            summary.byStatus
              ?.under_review ||
            0
          }
          help="Awaiting academic approval"
          loading={summaryLoading}
        />
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                className="field-input pl-10"
                value={searchInput}
                onChange={
                  (
                    event
                  ) =>
                    setSearchInput(
                      event.target.value
                    )
                }
                placeholder="Search by exam name, code, year or term"
              />

              {searchInput && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchInput(
                      ""
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={
                  filtersOpen
                    ? "btn-primary"
                    : "btn-secondary"
                }
                onClick={() =>
                  setFiltersOpen(
                    (
                      current
                    ) =>
                      !current
                  )
                }
              >
                <Filter size={16} />
                Filters
                {activeFilterCount >
                  0 && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {activeFilterCount >
                0 && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={
                    resetFilters
                  }
                >
                  <RotateCcw size={15} />
                  Reset
                </button>
              )}
            </div>
          </div>

          {filtersOpen && (
            <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              {isSuperAdmin && (
                <FilterField label="School">
                  <select
                    className="field-select"
                    value={
                      filters.schoolId
                    }
                    onChange={updateFilter(
                      "schoolId"
                    )}
                    disabled={
                      schoolsLoading
                    }
                  >
                    <option value="">
                      {schoolsLoading
                        ? "Loading schools..."
                        : "All schools"}
                    </option>

                    {schools.map(
                      (
                        schoolItem
                      ) => (
                        <option
                          key={
                            schoolItem._id
                          }
                          value={
                            schoolItem._id
                          }
                        >
                          {
                            schoolItem.schoolName
                          }
                        </option>
                      )
                    )}
                  </select>
                </FilterField>
              )}

              <FilterField label="Academic year">
                <input
                  className="field-input"
                  value={
                    filters.academicYear
                  }
                  onChange={updateFilter(
                    "academicYear"
                  )}
                  placeholder="2026-2027"
                />
              </FilterField>

              <FilterField label="Workflow status">
                <select
                  className="field-select"
                  value={
                    filters.status
                  }
                  onChange={updateFilter(
                    "status"
                  )}
                >
                  {STATUS_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value ||
                          "all"
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
              </FilterField>

              <FilterField label="Exam type">
                <select
                  className="field-select"
                  value={
                    filters.examType
                  }
                  onChange={updateFilter(
                    "examType"
                  )}
                >
                  {EXAM_TYPE_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value ||
                          "all"
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
              </FilterField>

              <FilterField label="Record state">
                <select
                  className="field-select"
                  value={
                    filters.isActive
                  }
                  onChange={updateFilter(
                    "isActive"
                  )}
                >
                  <option value="">
                    Active and inactive
                  </option>
                  <option value="true">
                    Active only
                  </option>
                  <option value="false">
                    Inactive only
                  </option>
                </select>
              </FilterField>

              <FilterField label="Start date from">
                <input
                  type="date"
                  className="field-input"
                  value={
                    filters.dateFrom
                  }
                  onChange={updateFilter(
                    "dateFrom"
                  )}
                />
              </FilterField>

              <FilterField label="Start date to">
                <input
                  type="date"
                  className="field-input"
                  min={
                    filters.dateFrom ||
                    undefined
                  }
                  value={
                    filters.dateTo
                  }
                  onChange={updateFilter(
                    "dateTo"
                  )}
                />
              </FilterField>

              <FilterField label="Sort results">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <select
                    className="field-select"
                    value={
                      filters.sortBy
                    }
                    onChange={updateFilter(
                      "sortBy"
                    )}
                  >
                    <option value="startDate">
                      Start date
                    </option>
                    <option value="endDate">
                      End date
                    </option>
                    <option value="createdAt">
                      Created date
                    </option>
                    <option value="examName">
                      Exam name
                    </option>
                    <option value="academicYear">
                      Academic year
                    </option>
                    <option value="status">
                      Status
                    </option>
                  </select>

                  <select
                    className="field-select w-28"
                    value={
                      filters.sortOrder
                    }
                    onChange={updateFilter(
                      "sortOrder"
                    )}
                  >
                    <option value="desc">
                      Desc
                    </option>
                    <option value="asc">
                      Asc
                    </option>
                  </select>
                </div>
              </FilterField>
            </div>
          )}
        </div>

        {error && (
          <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 sm:px-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-rose-600"
                />
                <div>
                  <p className="text-sm font-semibold text-rose-800">
                    Exam list could not be loaded
                  </p>
                  <p className="mt-0.5 text-sm text-rose-600">
                    {error}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={() =>
                  loadExams()
                }
              >
                <RefreshCw size={15} />
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Exam
                </th>
                {isSuperAdmin && (
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    School
                  </th>
                )}
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Examination Window
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Academic Scope
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Workflow
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <LoadingRows />
              ) : exams.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={
                      isSuperAdmin
                        ? 6
                        : 5
                    }
                    className="px-4 py-16 text-center"
                  >
                    <GraduationCap
                      size={34}
                      className="mx-auto text-slate-300"
                      strokeWidth={1.5}
                    />
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      No exams found
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {activeFilterCount >
                      0
                        ? "Adjust the filters or reset the search."
                        : canManage
                          ? "Create the first exam to begin academic planning."
                          : "No examinations are available in your assigned scope."}
                    </p>

                    {canManage &&
                      activeFilterCount ===
                        0 && (
                      <button
                        type="button"
                        className="btn-primary mt-5"
                        onClick={
                          openCreateExam
                        }
                        disabled={
                          !online
                        }
                      >
                        <Plus size={15} />
                        New Exam
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                exams.map(
                  (
                    exam
                  ) => {
                    const timing =
                      getExamTimingState(
                        exam
                      );

                    const editable =
                      exam.status ===
                        "draft" ||
                      exam.status ===
                        "scheduled";

                    const deletable =
                      DELETE_ALLOWED_STATUSES.includes(
                        exam.status
                      );

                    return (
                      <tr
                        key={
                          exam._id
                        }
                        className="transition hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              openExamDetails(
                                exam
                              )
                            }
                            className="text-left"
                          >
                            <p className="font-semibold text-slate-900 transition hover:text-brand-700">
                              {exam.examName}
                            </p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                              {exam.examCode} ·{" "}
                              {titleCase(
                                exam.examType
                              )}
                            </p>
                          </button>
                        </td>

                        {isSuperAdmin && (
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <School size={15} />
                              </div>
                              <p className="max-w-40 truncate font-medium text-slate-700">
                                {getSchoolName(
                                  exam
                                )}
                              </p>
                            </div>
                          </td>
                        )}

                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-700">
                            {formatDateRange(
                              exam.startDate,
                              exam.endDate
                            )}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${timing.className}`}
                            >
                              {timing.label}
                            </span>
                            <span className="text-xs text-slate-400">
                              {exam.academicYear}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-700">
                            {getClassesLabel(
                              exam
                            )}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {exam.classCount ??
                              exam.applicableClasses
                                ?.length ??
                              0}{" "}
                            classes ·{" "}
                            {exam.subjectRuleCount ??
                              exam.subjectRules
                                ?.length ??
                              0}{" "}
                            subjects
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge
                            status={
                              exam.status
                            }
                          />
                          {!exam.isActive && (
                            <p className="mt-1 text-xs font-medium text-rose-500">
                              Inactive record
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                openExamDetails(
                                  exam
                                )
                              }
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label={`View ${exam.examName}`}
                            >
                              <Eye size={16} />
                            </button>

                            {canManage && (
                              <>
                                {editable && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditExam(
                                        exam
                                      )
                                    }
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                    aria-label={`Edit ${exam.examName}`}
                                  >
                                    <Pencil size={16} />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    openCloneModal(
                                      exam
                                    )
                                  }
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                                  disabled={!online}
                                  aria-label={`Clone ${exam.examName}`}
                                >
                                  <Copy size={16} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openExamDetails(
                                      exam
                                    )
                                  }
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                                  disabled={!online}
                                  aria-label={`Manage workflow for ${exam.examName}`}
                                >
                                  <Settings2 size={16} />
                                </button>

                                {deletable && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      requestDeleteExam(
                                        exam
                                      )
                                    }
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                                    disabled={
                                      !online ||
                                      deleteChecking
                                    }
                                    aria-label={`Delete ${exam.examName}`}
                                  >
                                    {deleteChecking &&
                                    getRecordId(
                                      deleteTarget
                                    ) ===
                                      exam._id ? (
                                      <Loader2
                                        size={16}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Trash2 size={16} />
                                    )}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 lg:hidden">
          {loading ? (
            Array.from({
              length: 4
            }).map(
              (
                _,
                index
              ) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-xl bg-slate-100"
                />
              )
            )
          ) : exams.length ===
            0 ? (
            <div className="py-12 text-center">
              <GraduationCap
                size={34}
                className="mx-auto text-slate-300"
                strokeWidth={1.5}
              />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No exams found
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Adjust the filters or create a new examination.
              </p>
            </div>
          ) : (
            exams.map(
              (
                exam
              ) => (
                <ExamCard
                  key={exam._id}
                  exam={exam}
                  canManage={
                    canManage
                  }
                  online={online}
                  onView={
                    openExamDetails
                  }
                  onEdit={
                    openEditExam
                  }
                  onClone={
                    openCloneModal
                  }
                  onStatus={
                    openStatusModal
                  }
                  onDelete={
                    requestDeleteExam
                  }
                />
              )
            )
          )}
        </div>

        {!loading &&
          totalRecords >
            0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {startRecord}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-700">
                  {endRecord}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {totalRecords}
                </span>
              </p>

              <select
                className="field-select w-28 py-2"
                value={
                  filters.limit
                }
                onChange={updateFilter(
                  "limit"
                )}
              >
                <option value="10">
                  10 / page
                </option>
                <option value="20">
                  20 / page
                </option>
                <option value="50">
                  50 / page
                </option>
                <option value="100">
                  100 / page
                </option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button
                type="button"
                className="btn-secondary px-3 py-2"
                onClick={() =>
                  goToPage(
                    currentPage -
                    1
                  )
                }
                disabled={
                  currentPage <=
                    1 ||
                  loading
                }
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span className="min-w-24 text-center text-sm font-medium text-slate-600">
                Page {currentPage} of{" "}
                {totalPages}
              </span>

              <button
                type="button"
                className="btn-secondary px-3 py-2"
                onClick={() =>
                  goToPage(
                    currentPage +
                    1
                  )
                }
                disabled={
                  currentPage >=
                    totalPages ||
                  loading
                }
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      <ExamDetailModal
        open={detailOpen}
        onClose={
          closeExamDetails
        }
        exam={detailExam}
        dependencies={
          detailDependencies
        }
        workflowState={
          detailWorkflow
        }
        allowedTransitions={
          detailTransitions
        }
        loading={
          detailLoading
        }
        error={detailError}
        canManage={canManage}
        online={online}
        onRetry={() =>
          loadExamDetail(
            selectedExamId
          )
        }
        onEdit={
          openEditExam
        }
        onClone={
          openCloneModal
        }
        onStatus={
          openStatusModal
        }
        onDelete={
          requestDeleteExam
        }
      />

      <StatusChangeModal
        open={
          statusModalOpen
        }
        onClose={() => {
          if (
            statusSubmitting
          ) {
            return;
          }

          setStatusModalOpen(
            false
          );

          setStatusExam(
            null
          );

          setStatusTransitions(
            []
          );
        }}
        exam={statusExam}
        allowedTransitions={
          statusTransitions
        }
        submitting={
          statusSubmitting
        }
        online={online}
        onSubmit={
          handleStatusSubmit
        }
      />

      <CloneExamModal
        open={
          cloneModalOpen
        }
        onClose={() => {
          if (
            cloneSubmitting
          ) {
            return;
          }

          setCloneModalOpen(
            false
          );

          setCloneTarget(
            null
          );
        }}
        exam={cloneTarget}
        submitting={
          cloneSubmitting
        }
        online={online}
        onSubmit={
          handleCloneSubmit
        }
      />

      <ConfirmDialog
        open={
          deleteDialogOpen
        }
        onClose={() => {
          if (
            deleteSubmitting
          ) {
            return;
          }

          setDeleteDialogOpen(
            false
          );

          setDeleteTarget(
            null
          );
        }}
        onConfirm={
          confirmDeleteExam
        }
        title="Delete Exam"
        description={`${
          deleteTarget
            ?.examName ||
          "This exam"
        } will move to deleted records. It can be restored later if no conflicting exam exists.`}
        confirmLabel="Delete Exam"
        tone="danger"
        loading={
          deleteSubmitting
        }
      />
    </div>
  );
};

export default ExamList;
