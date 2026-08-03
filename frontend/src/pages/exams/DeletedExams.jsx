import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  GraduationCap,
  Loader2,
  RefreshCw,
  RotateCcw,
  School,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  UsersRound,
  X
} from "lucide-react";

import {
  getDeletedExams,
  restoreExam
} from "../../api/exams";
import { getSchools } from "../../api/schools";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";

/*
|--------------------------------------------------------------------------
| Deleted Exam Page Configuration
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
    label: "All previous statuses"
  },
  {
    value: "draft",
    label: "Draft"
  },
  {
    value: "cancelled",
    label: "Cancelled"
  },
  {
    value: "archived",
    label: "Archived"
  }
];

const STATUS_META = {
  draft: {
    label: "Draft",
    tone: "neutral"
  },
  cancelled: {
    label: "Cancelled",
    tone: "danger"
  },
  archived: {
    label: "Archived",
    tone: "neutral"
  },
  scheduled: {
    label: "Scheduled",
    tone: "info"
  },
  in_progress: {
    label: "In Progress",
    tone: "warning"
  },
  marks_entry: {
    label: "Marks Entry",
    tone: "warning"
  },
  under_review: {
    label: "Under Review",
    tone: "info"
  },
  approved: {
    label: "Approved",
    tone: "success"
  },
  published: {
    label: "Published",
    tone: "success"
  },
  locked: {
    label: "Locked",
    tone: "neutral"
  }
};

const DEFAULT_FILTERS = {
  schoolId: "",
  academicYear: "",
  status: "",
  examType: "",
  dateFrom: "",
  dateTo: "",
  limit: "20"
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const normalizeRole = (
  value
) => {
  return String(
    value ||
    ""
  ).toLowerCase();
};

const normalizeText = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(
    value
  ).trim();
};

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
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.message === "canceled"
  );
};

const formatDate = (
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
  item
) => {
  return (
    item?.classId?.className ||
    item?.className ||
    "Class"
  );
};

const getClassSummary = (
  exam
) => {
  const classes =
    exam?.applicableClasses ||
    [];

  if (
    classes.length === 0
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
    classes.length > 2
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
        "neutral"
    }
  );
};

const getPaginationNumber = (
  pagination,
  key,
  fallback
) => {
  const number =
    Number(
      pagination?.[
        key
      ]
    );

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
};

/*
|--------------------------------------------------------------------------
| Small Components
|--------------------------------------------------------------------------
*/

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
        4500
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
    toast.type === "error";

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

const StatCard = ({
  icon: Icon,
  label,
  value,
  help,
  loading
}) => {
  return (
    <div className="card p-4">
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

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};

const FilterField = ({
  label,
  children
}) => {
  return (
    <div>
      <label className="field-label">
        {label}
      </label>

      {children}
    </div>
  );
};

const DeletedStatusBadge = ({
  status
}) => {
  const meta =
    getStatusMeta(
      status
    );

  return (
    <Badge tone={meta.tone}>
      {meta.label}
    </Badge>
  );
};

/*
|--------------------------------------------------------------------------
| Deleted Exam Detail Modal
|--------------------------------------------------------------------------
*/

const DeletedExamDetailModal = ({
  open,
  onClose,
  exam,
  online,
  restoring,
  onRestore
}) => {
  if (!exam) {
    return null;
  }

  const classes =
    exam.applicableClasses ||
    [];

  const subjectRules =
    exam.subjectRules ||
    [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Deleted Exam Details"
      width="max-w-4xl"
    >
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-5 text-white">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DeletedStatusBadge
                  status={exam.status}
                />

                <span className="badge bg-white/10 text-white">
                  Deleted Record
                </span>
              </div>

              <h2 className="mt-4 text-xl font-bold">
                {exam.examName}
              </h2>

              <p className="mt-1 text-sm text-slate-300">
                {exam.examCode} ·{" "}
                {titleCase(
                  exam.examType
                )}{" "}
                · {exam.academicYear}
              </p>
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
              onClick={() =>
                onRestore(
                  exam
                )
              }
              disabled={
                !online ||
                restoring
              }
            >
              {restoring ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Undo2 size={16} />
              )}
              Restore Exam
            </button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <CalendarDays
              size={18}
              className="text-slate-500"
            />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Start Date
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatDate(
                exam.startDate
              )}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <Clock3
              size={18}
              className="text-slate-500"
            />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              End Date
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatDate(
                exam.endDate
              )}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <UsersRound
              size={18}
              className="text-slate-500"
            />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Classes
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {classes.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <GraduationCap
              size={18}
              className="text-slate-500"
            />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Subject Rules
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {subjectRules.length}
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-100 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Academic Scope
            </h3>

            {classes.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No classes were stored with this exam.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {classes.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={
                        getRecordId(
                          item.classId
                        ) ||
                        index
                      }
                      className="rounded-lg bg-slate-50 px-3 py-2.5"
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        {getClassName(
                          item
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.allSections
                          ? "All sections"
                          : (
                              item.sections ||
                              []
                            ).join(
                              ", "
                            ) ||
                            "No sections stored"}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Deletion Information
            </h3>

            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">
                  Deleted at
                </dt>
                <dd className="text-right font-medium text-slate-800">
                  {formatDateTime(
                    exam.deletedAt
                  )}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">
                  Deleted by
                </dt>
                <dd className="text-right font-medium text-slate-800">
                  {exam.deletedBy
                    ?.name ||
                    "System user"}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">
                  School
                </dt>
                <dd className="text-right font-medium text-slate-800">
                  {getSchoolName(
                    exam
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

        {exam.description && (
          <section className="rounded-xl border border-slate-100 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Description
            </h3>

            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
              {exam.description}
            </p>
          </section>
        )}

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Restore protection
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-700">
                Restoration will fail when another active exam already uses
                the same exam code and academic year. The deleted record
                remains available when a conflict occurs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

/*
|--------------------------------------------------------------------------
| Mobile Deleted Exam Card
|--------------------------------------------------------------------------
*/

const DeletedExamCard = ({
  exam,
  selected,
  online,
  restoring,
  onSelect,
  onView,
  onRestore
}) => {
  return (
    <article className="card overflow-hidden">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              onSelect(
                exam
              )
            }
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
              selected
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-300 bg-white text-transparent"
            }`}
            aria-label={
              selected
                ? `Unselect ${exam.examName}`
                : `Select ${exam.examName}`
            }
          >
            <Check size={14} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <DeletedStatusBadge
                status={exam.status}
              />

              <span className="badge bg-rose-50 text-rose-700">
                Deleted
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
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
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
              {formatDate(
                exam.startDate
              )}{" "}
              –{" "}
              {formatDate(
                exam.endDate
              )}
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              {exam.academicYear}
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
              {getClassSummary(
                exam
              )}
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              {exam.subjectRules
                ?.length ||
                0}{" "}
              subject rules
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Trash2
            size={16}
            className="mt-0.5 shrink-0 text-slate-400"
          />

          <div>
            <p className="font-medium text-slate-700">
              {formatDateTime(
                exam.deletedAt
              )}
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Deleted by{" "}
              {exam.deletedBy
                ?.name ||
                "system user"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
        <button
          type="button"
          className="btn-secondary flex-1"
          onClick={() =>
            onView(
              exam
            )
          }
        >
          <Eye size={15} />
          Details
        </button>

        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() =>
            onRestore(
              exam
            )
          }
          disabled={
            !online ||
            restoring
          }
        >
          {restoring ? (
            <Loader2
              size={15}
              className="animate-spin"
            />
          ) : (
            <Undo2 size={15} />
          )}
          Restore
        </button>
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Deleted Exams Page
|--------------------------------------------------------------------------
*/

const DeletedExams = () => {
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
    role === "super_admin";

  const canManage =
    [
      "super_admin",
      "principal"
    ].includes(
      role
    );

  const [
    online,
    setOnline
  ] =
    useState(
      typeof navigator === "undefined"
        ? true
        : navigator.onLine
    );

  const [
    exams,
    setExams
  ] =
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

  const [
    filters,
    setFilters
  ] =
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

  const [
    page,
    setPage
  ] =
    useState(1);

  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing
  ] =
    useState(false);

  const [
    error,
    setError
  ] =
    useState("");

  const [
    schools,
    setSchools
  ] =
    useState([]);

  const [
    schoolsLoading,
    setSchoolsLoading
  ] =
    useState(false);

  const [
    selectedIds,
    setSelectedIds
  ] =
    useState([]);

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
    restoreTargets,
    setRestoreTargets
  ] =
    useState([]);

  const [
    restoreDialogOpen,
    setRestoreDialogOpen
  ] =
    useState(false);

  const [
    restoring,
    setRestoring
  ] =
    useState(false);

  const [
    restoringIds,
    setRestoringIds
  ] =
    useState([]);

  const [
    toast,
    setToast
  ] =
    useState(null);

  const abortRef =
    useRef(null);

  const closeToast =
    useCallback(
      () => {
        setToast(
          null
        );
      },
      []
    );

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
  | Debounced Search
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
  | Load Schools
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
  | Server Query
  |--------------------------------------------------------------------------
  */

  const queryParams =
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

        search:
          debouncedSearch,

        dateFrom:
          filters.dateFrom,

        dateTo:
          filters.dateTo,

        page,

        limit:
          filters.limit
      }),
      [
        filters.schoolId,
        filters.academicYear,
        filters.status,
        filters.examType,
        filters.dateFrom,
        filters.dateTo,
        filters.limit,
        debouncedSearch,
        page
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Load Deleted Exams
  |--------------------------------------------------------------------------
  */

  const loadDeletedExams =
    useCallback(
      async (
        {
          silent = false
        } = {}
      ) => {
        abortRef.current?.abort();

        const controller =
          new AbortController();

        abortRef.current =
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
            await getDeletedExams(
              queryParams,
              {
                signal:
                  controller.signal
              }
            );

          const records =
            data?.exams ||
            data?.data?.exams ||
            [];

          setExams(
            records
          );

          setPagination({
            total:
              getPaginationNumber(
                data?.pagination,
                "total",
                data?.count ||
                records.length
              ),

            page:
              getPaginationNumber(
                data?.pagination,
                "page",
                page
              ),

            limit:
              getPaginationNumber(
                data?.pagination,
                "limit",
                Number(
                  filters.limit
                ) ||
                20
              ),

            totalPages:
              getPaginationNumber(
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

          const visibleIds =
            new Set(
              records.map(
                (
                  exam
                ) =>
                  getRecordId(
                    exam
                  )
              )
            );

          setSelectedIds(
            (
              current
            ) =>
              current.filter(
                (
                  examId
                ) =>
                  visibleIds.has(
                    examId
                  )
              )
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

          setExams([]);

          setError(
            getErrorMessage(
              requestError,
              "Deleted exams could not be loaded."
            )
          );
        } finally {
          if (
            abortRef.current ===
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
        queryParams,
        page,
        filters.limit
      ]
    );

  useEffect(() => {
    loadDeletedExams();

    return () => {
      abortRef.current?.abort();
    };
  }, [
    loadDeletedExams
  ]);

  /*
  |--------------------------------------------------------------------------
  | Filter Handling
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

      setSelectedIds([]);
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

    setSelectedIds([]);
  };

  const activeFilterCount =
    useMemo(
      () =>
        [
          filters.schoolId,
          filters.academicYear,
          filters.status,
          filters.examType,
          filters.dateFrom,
          filters.dateTo,
          debouncedSearch
        ].filter(
          Boolean
        ).length,
      [
        filters.schoolId,
        filters.academicYear,
        filters.status,
        filters.examType,
        filters.dateFrom,
        filters.dateTo,
        debouncedSearch
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Selection
  |--------------------------------------------------------------------------
  */

  const allVisibleSelected =
    exams.length > 0 &&
    exams.every(
      (
        exam
      ) =>
        selectedIds.includes(
          getRecordId(
            exam
          )
        )
    );

  const toggleExamSelection = (
    exam
  ) => {
    const examId =
      getRecordId(
        exam
      );

    setSelectedIds(
      (
        current
      ) =>
        current.includes(
          examId
        )
          ? current.filter(
              (
                id
              ) =>
                id !==
                examId
            )
          : [
              ...current,
              examId
            ]
    );
  };

  const toggleSelectAllVisible = () => {
    if (
      allVisibleSelected
    ) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(
      exams.map(
        (
          exam
        ) =>
          getRecordId(
            exam
          )
      )
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Detail Modal
  |--------------------------------------------------------------------------
  */

  const openDetails = (
    exam
  ) => {
    setDetailExam(
      exam
    );

    setDetailOpen(
      true
    );
  };

  const closeDetails = () => {
    if (restoring) {
      return;
    }

    setDetailOpen(
      false
    );

    setDetailExam(
      null
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Restore Flow
  |--------------------------------------------------------------------------
  */

  const requestRestore = (
    target
  ) => {
    if (!online) {
      setToast({
        type: "error",
        message:
          "You are offline. Reconnect before restoring an exam."
      });

      return;
    }

    const targets =
      Array.isArray(
        target
      )
        ? target
        : [
            target
          ];

    const validTargets =
      targets.filter(
        Boolean
      );

    if (
      validTargets.length === 0
    ) {
      return;
    }

    setRestoreTargets(
      validTargets
    );

    setRestoreDialogOpen(
      true
    );
  };

  const requestBulkRestore = () => {
    const targets =
      exams.filter(
        (
          exam
        ) =>
          selectedIds.includes(
            getRecordId(
              exam
            )
          )
      );

    requestRestore(
      targets
    );
  };

  const confirmRestore =
    async () => {
      if (
        restoreTargets.length === 0
      ) {
        return;
      }

      setRestoring(
        true
      );

      setRestoringIds(
        restoreTargets.map(
          (
            exam
          ) =>
            getRecordId(
              exam
            )
        )
      );

      const successes =
        [];

      const failures =
        [];

      for (
        const exam
        of restoreTargets
      ) {
        try {
          const {
            data
          } =
            await restoreExam(
              exam
            );

          successes.push({
            exam,
            restoredExam:
              data?.exam ||
              data?.data?.exam ||
              null
          });
        } catch (
          requestError
        ) {
          failures.push({
            exam,
            message:
              getErrorMessage(
                requestError,
                "Restore failed."
              )
          });
        }
      }

      setRestoreDialogOpen(
        false
      );

      setRestoreTargets([]);

      setRestoringIds([]);

      setRestoring(
        false
      );

      setSelectedIds([]);

      if (
        detailExam &&
        successes.some(
          (
            item
          ) =>
            getRecordId(
              item.exam
            ) ===
            getRecordId(
              detailExam
            )
        )
      ) {
        setDetailOpen(
          false
        );

        setDetailExam(
          null
        );
      }

      if (
        failures.length === 0
      ) {
        setToast({
          type: "success",
          message:
            successes.length === 1
              ? "Exam restored successfully."
              : `${successes.length} exams restored successfully.`
        });
      } else if (
        successes.length > 0
      ) {
        setToast({
          type: "error",
          message:
            `${successes.length} restored and ${failures.length} failed. ${failures[0].exam.examName}: ${failures[0].message}`
        });
      } else {
        setToast({
          type: "error",
          message:
            failures.length === 1
              ? failures[0].message
              : `No exams were restored. ${failures[0]?.message || ""}`
        });
      }

      await loadDeletedExams({
        silent: true
      });
    };

  /*
  |--------------------------------------------------------------------------
  | Summary and Pagination
  |--------------------------------------------------------------------------
  */

  const pageStatusCounts =
    useMemo(
      () => ({
        draft:
          exams.filter(
            (
              exam
            ) =>
              exam.status ===
              "draft"
          ).length,

        cancelled:
          exams.filter(
            (
              exam
            ) =>
              exam.status ===
              "cancelled"
          ).length,

        archived:
          exams.filter(
            (
              exam
            ) =>
              exam.status ===
              "archived"
          ).length
      }),
      [
        exams
      ]
    );

  const totalRecords =
    getPaginationNumber(
      pagination,
      "total",
      exams.length
    );

  const totalPages =
    Math.max(
      1,
      getPaginationNumber(
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
        getPaginationNumber(
          pagination,
          "page",
          page
        )
      )
    );

  const pageLimit =
    getPaginationNumber(
      pagination,
      "limit",
      Number(
        filters.limit
      ) ||
      20
    );

  const firstRecord =
    totalRecords === 0
      ? 0
      : (
          currentPage -
          1
        ) *
          pageLimit +
        1;

  const lastRecord =
    totalRecords === 0
      ? 0
      : Math.min(
          totalRecords,
          firstRecord +
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

    setSelectedIds([]);

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
        title="Deleted Examinations"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate(
                  "/exams"
                )
              }
            >
              <ArrowLeft size={16} />
              Back to Exams
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                loadDeletedExams({
                  silent: true
                })
              }
              disabled={
                loading ||
                refreshing
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
          </div>
        }
      />

      {!canManage && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-rose-600"
            />

            <p className="text-sm leading-6 text-rose-800">
              Deleted exam management is available only to Super Admin and
              Principal roles.
            </p>
          </div>
        </div>
      )}

      {!online && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <p className="text-sm font-semibold text-amber-900">
                You are offline
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                Deleted records may remain visible, but restore actions are
                disabled until the connection returns.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-5 text-white shadow-card sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-slate-300">
              <Archive size={18} />

              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Exam Recovery Centre
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-bold">
              Review and restore deleted examinations
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Deleted exams remain recoverable. Restoration keeps their
              original classes, subject rules, settings and audit history.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur sm:min-w-[320px]">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-emerald-300"
              />

              <div>
                <p className="text-sm font-semibold">
                  No permanent deletion here
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-300">
                  This page only restores records. Permanent removal is not
                  exposed by the current Exam API.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Trash2}
          label="Deleted Records"
          value={totalRecords}
          help="Total records matching current filters"
          loading={loading}
        />

        <StatCard
          icon={GraduationCap}
          label="Draft on Page"
          value={
            pageStatusCounts.draft
          }
          help="Draft records on the loaded page"
          loading={loading}
        />

        <StatCard
          icon={AlertCircle}
          label="Cancelled on Page"
          value={
            pageStatusCounts.cancelled
          }
          help="Cancelled records on the loaded page"
          loading={loading}
        />

        <StatCard
          icon={Archive}
          label="Archived on Page"
          value={
            pageStatusCounts.archived
          }
          help="Archived records on the loaded page"
          loading={loading}
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
                placeholder="Search deleted exams by name, code, year or term"
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
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={
                    requestBulkRestore
                  }
                  disabled={
                    !online ||
                    restoring
                  }
                >
                  <Undo2 size={16} />
                  Restore Selected
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    {selectedIds.length}
                  </span>
                </button>
              )}

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={
                    resetFilters
                  }
                >
                  <RotateCcw size={15} />
                  Reset Filters
                </button>
              )}
            </div>
          </div>

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
                      school
                    ) => (
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

            <FilterField label="Previous status">
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

            <FilterField label="Exam start from">
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

            <FilterField label="Exam start to">
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

            <FilterField label="Rows per page">
              <select
                className="field-select"
                value={
                  filters.limit
                }
                onChange={updateFilter(
                  "limit"
                )}
              >
                <option value="10">
                  10 records
                </option>
                <option value="20">
                  20 records
                </option>
                <option value="50">
                  50 records
                </option>
                <option value="100">
                  100 records
                </option>
              </select>
            </FilterField>
          </div>
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
                    Deleted exams could not be loaded
                  </p>

                  <p className="mt-0.5 text-sm text-rose-600">
                    {error}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  loadDeletedExams()
                }
              >
                <RefreshCw size={15} />
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="w-12 px-4 py-3">
                  <button
                    type="button"
                    onClick={
                      toggleSelectAllVisible
                    }
                    disabled={
                      loading ||
                      exams.length === 0
                    }
                    className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                      allVisibleSelected
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-slate-300 bg-white text-transparent"
                    }`}
                    aria-label={
                      allVisibleSelected
                        ? "Unselect all visible exams"
                        : "Select all visible exams"
                    }
                  >
                    <Check size={14} />
                  </button>
                </th>

                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Exam
                </th>

                {isSuperAdmin && (
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    School
                  </th>
                )}

                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Academic Scope
                </th>

                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Previous Status
                </th>

                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Deleted
                </th>

                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({
                  length: 5
                }).map(
                  (
                    _,
                    index
                  ) => (
                    <tr key={index}>
                      {Array.from({
                        length:
                          isSuperAdmin
                            ? 7
                            : 6
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
                )
              ) : exams.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      isSuperAdmin
                        ? 7
                        : 6
                    }
                    className="px-4 py-16 text-center"
                  >
                    <Archive
                      size={36}
                      className="mx-auto text-slate-300"
                      strokeWidth={1.5}
                    />

                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      No deleted exams found
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {activeFilterCount > 0
                        ? "Adjust or reset the filters to search other deleted records."
                        : "Deleted exam records will appear here when available."}
                    </p>

                    <button
                      type="button"
                      className="btn-secondary mt-5"
                      onClick={() =>
                        navigate(
                          "/exams"
                        )
                      }
                    >
                      <ArrowLeft size={15} />
                      Return to Exams
                    </button>
                  </td>
                </tr>
              ) : (
                exams.map(
                  (
                    exam
                  ) => {
                    const examId =
                      getRecordId(
                        exam
                      );

                    const selected =
                      selectedIds.includes(
                        examId
                      );

                    const itemRestoring =
                      restoringIds.includes(
                        examId
                      );

                    return (
                      <tr
                        key={examId}
                        className={`transition ${
                          selected
                            ? "bg-brand-50/40"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              toggleExamSelection(
                                exam
                              )
                            }
                            className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                              selected
                                ? "border-brand-600 bg-brand-600 text-white"
                                : "border-slate-300 bg-white text-transparent"
                            }`}
                            aria-label={
                              selected
                                ? `Unselect ${exam.examName}`
                                : `Select ${exam.examName}`
                            }
                          >
                            <Check size={14} />
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              openDetails(
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
                              )}{" "}
                              · {exam.academicYear}
                            </p>
                          </button>
                        </td>

                        {isSuperAdmin && (
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <School size={15} />
                              </div>

                              <p className="max-w-44 truncate font-medium text-slate-700">
                                {getSchoolName(
                                  exam
                                )}
                              </p>
                            </div>
                          </td>
                        )}

                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-700">
                            {getClassSummary(
                              exam
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {exam.applicableClasses
                              ?.length ||
                              0}{" "}
                            classes ·{" "}
                            {exam.subjectRules
                              ?.length ||
                              0}{" "}
                            subject rules
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <DeletedStatusBadge
                            status={
                              exam.status
                            }
                          />
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-700">
                            {formatDateTime(
                              exam.deletedAt
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {exam.deletedBy
                              ?.name ||
                              "System user"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                openDetails(
                                  exam
                                )
                              }
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label={`View ${exam.examName}`}
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                requestRestore(
                                  exam
                                )
                              }
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                              disabled={
                                !online ||
                                restoring
                              }
                              aria-label={`Restore ${exam.examName}`}
                            >
                              {itemRestoring ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Undo2 size={16} />
                              )}
                            </button>
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
          ) : exams.length === 0 ? (
            <div className="py-12 text-center">
              <Archive
                size={34}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                No deleted exams found
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Deleted examination records will appear here.
              </p>
            </div>
          ) : (
            exams.map(
              (
                exam
              ) => {
                const examId =
                  getRecordId(
                    exam
                  );

                return (
                  <DeletedExamCard
                    key={examId}
                    exam={exam}
                    selected={
                      selectedIds.includes(
                        examId
                      )
                    }
                    online={online}
                    restoring={
                      restoringIds.includes(
                        examId
                      )
                    }
                    onSelect={
                      toggleExamSelection
                    }
                    onView={
                      openDetails
                    }
                    onRestore={
                      requestRestore
                    }
                  />
                );
              }
            )
          )}
        </div>

        {!loading &&
          totalRecords > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {firstRecord}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-700">
                {lastRecord}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {totalRecords}
              </span>
            </p>

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
                  currentPage <= 1 ||
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

      <DeletedExamDetailModal
        open={detailOpen}
        onClose={
          closeDetails
        }
        exam={detailExam}
        online={online}
        restoring={
          restoringIds.includes(
            getRecordId(
              detailExam
            )
          )
        }
        onRestore={
          requestRestore
        }
      />

      <ConfirmDialog
        open={
          restoreDialogOpen
        }
        onClose={() => {
          if (restoring) {
            return;
          }

          setRestoreDialogOpen(
            false
          );

          setRestoreTargets([]);
        }}
        onConfirm={
          confirmRestore
        }
        title={
          restoreTargets.length > 1
            ? "Restore Selected Exams"
            : "Restore Exam"
        }
        description={
          restoreTargets.length > 1
            ? `${restoreTargets.length} deleted exams will be restored. Any exam with a conflicting active code and academic year will remain deleted.`
            : `${restoreTargets[0]?.examName || "This exam"} will return to the active exam records with its previous workflow status and settings.`
        }
        confirmLabel={
          restoreTargets.length > 1
            ? "Restore Exams"
            : "Restore Exam"
        }
        tone="warning"
        loading={restoring}
      />
    </div>
  );
};

export default DeletedExams;
