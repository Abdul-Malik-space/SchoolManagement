import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  useParams,
  useSearchParams
} from "react-router-dom";

import {
  AlertCircle,
  Award,
  BarChart3,
  Calculator,
  CheckCircle2,
  Eye,
  FileCheck2,
  GraduationCap,
  Loader2,
  Medal,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
  XCircle
} from "lucide-react";

import api from "../../api/axios";

import {
  getExams
} from "../../api/exams";

import {
  useAuth
} from "../../context/AuthContext";

import {
  Badge
} from "../../components/ui/Badge";

import {
  Modal
} from "../../components/ui/Modal";

import {
  PageHeader
} from "../../components/ui/PageHeader";

import {
  Pagination
} from "../../components/ui/Pagination";

/*
|--------------------------------------------------------------------------
| Access Roles
|--------------------------------------------------------------------------
*/

const MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Exam Statuses
|--------------------------------------------------------------------------
*/

const RESULT_EXAM_STATUSES = [
  "under_review",
  "approved",
  "published",
  "locked"
];

const EXAM_STATUS_META = {
  under_review: {
    label:
      "Under Review",
    tone:
      "info"
  },

  approved: {
    label:
      "Approved",
    tone:
      "success"
  },

  published: {
    label:
      "Published",
    tone:
      "success"
  },

  locked: {
    label:
      "Locked",
    tone:
      "neutral"
  }
};

/*
|--------------------------------------------------------------------------
| Result Workflow Status
|--------------------------------------------------------------------------
*/

const RESULT_STATUS_META = {
  draft: {
    label:
      "Draft",
    tone:
      "neutral"
  },

  generated: {
    label:
      "Generated",
    tone:
      "warning"
  },

  under_review: {
    label:
      "Under Review",
    tone:
      "info"
  },

  approved: {
    label:
      "Approved",
    tone:
      "success"
  },

  published: {
    label:
      "Published",
    tone:
      "success"
  },

  locked: {
    label:
      "Locked",
    tone:
      "neutral"
  },

  archived: {
    label:
      "Archived",
    tone:
      "neutral"
  }
};

/*
|--------------------------------------------------------------------------
| Overall Result Status
|--------------------------------------------------------------------------
*/

const OVERALL_STATUS_META = {
  pending: {
    label:
      "Pending",
    tone:
      "warning"
  },

  pass: {
    label:
      "Pass",
    tone:
      "success"
  },

  fail: {
    label:
      "Fail",
    tone:
      "danger"
  },

  incomplete: {
    label:
      "Incomplete",
    tone:
      "warning"
  },

  withheld: {
    label:
      "Withheld",
    tone:
      "danger"
  }
};

/*
|--------------------------------------------------------------------------
| Subject Result Status
|--------------------------------------------------------------------------
*/

const SUBJECT_STATUS_META = {
  pending: {
    label:
      "Pending",
    tone:
      "warning"
  },

  pass: {
    label:
      "Pass",
    tone:
      "success"
  },

  fail: {
    label:
      "Fail",
    tone:
      "danger"
  },

  absent: {
    label:
      "Absent",
    tone:
      "neutral"
  },

  leave: {
    label:
      "Leave",
    tone:
      "info"
  },

  exempted: {
    label:
      "Exempted",
    tone:
      "info"
  },

  withheld: {
    label:
      "Withheld",
    tone:
      "danger"
  }
};

/*
|--------------------------------------------------------------------------
| Default Data
|--------------------------------------------------------------------------
*/

const DEFAULT_SUMMARY = {
  total:
    0,

  byStatus:
    {},

  byOverallStatus:
    {},

  passCount:
    0,

  failCount:
    0,

  incompleteCount:
    0,

  withheldCount:
    0,

  averagePercentage:
    0
};

const DEFAULT_PAGINATION = {
  total:
    0,

  page:
    1,

  limit:
    25,

  totalPages:
    1,

  hasNextPage:
    false,

  hasPrevPage:
    false
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

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

const normalizeRole = (
  value
) => {
  return normalizeText(
    value
  ).toLowerCase();
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
    return String(
      value._id ||
      value.id ||
      ""
    );
  }

  return String(
    value
  );
};

const requireRecordId = (
  value,
  label =
    "Record"
) => {
  const id =
    getRecordId(
      value
    );

  if (!id) {
    throw new Error(
      `${label} ID is required.`
    );
  }

  return encodeURIComponent(
    id
  );
};

const toNumber = (
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
  return new Intl.NumberFormat(
    "en-PK",
    {
      maximumFractionDigits:
        2
    }
  ).format(
    toNumber(
      value
    )
  );
};

const formatPercentage = (
  value
) => {
  return `${formatNumber(
    value
  )}%`;
};

const formatDateTime = (
  value
) => {
  if (!value) {
    return "Not available";
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
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit"
    }
  ).format(
    date
  );
};

const getErrorMessage = (
  error,
  fallback =
    "Something went wrong."
) => {
  const details =
    error?.response?.data
      ?.details;

  if (
    Array.isArray(
      details
    ) &&
    details.length
  ) {
    return details
      .map(
        (
          item
        ) =>
          typeof item ===
          "string"
            ? item
            : item?.message ||
              JSON.stringify(
                item
              )
      )
      .join(" ");
  }

  return (
    error?.response?.data
      ?.message ||
    error?.message ||
    fallback
  );
};

const isCancelledRequest = (
  error
) => {
  return (
    error?.name ===
      "CanceledError" ||
    error?.name ===
      "AbortError" ||
    error?.code ===
      "ERR_CANCELED"
  );
};

const getInitials = (
  value
) => {
  return (
    normalizeText(
      value ||
      "Student"
    )
      .split(/\s+/)
      .filter(Boolean)
      .map(
        (
          part
        ) =>
          part[0]
      )
      .slice(
        0,
        2
      )
      .join("")
      .toUpperCase() ||
    "S"
  );
};

const humanize = (
  value
) => {
  return normalizeText(
    value
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
};

/*
|--------------------------------------------------------------------------
| API Helpers
|--------------------------------------------------------------------------
*/

const RESULT_BASE_URL =
  "/exam-results";

const cleanParams = (
  params = {}
) => {
  return Object.fromEntries(
    Object.entries(
      params
    ).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );
};

const getExamResultsApi =
  async (
    examId,
    params = {},
    config = {}
  ) => {
    const id =
      requireRecordId(
        examId,
        "Exam"
      );

    const response =
      await api.get(
        `${RESULT_BASE_URL}/${id}`,
        {
          ...config,

          params:
            cleanParams({
              ...(
                config.params ||
                {}
              ),

              ...params
            })
        }
      );

    return response?.data;
  };

const getExamResultByIdApi =
  async (
    examId,
    resultId,
    config = {}
  ) => {
    const exam =
      requireRecordId(
        examId,
        "Exam"
      );

    const result =
      requireRecordId(
        resultId,
        "Result"
      );

    const response =
      await api.get(
        `${RESULT_BASE_URL}/${exam}/result/${result}`,
        config
      );

    return response?.data;
  };

const generateExamResultsApi =
  async (
    examId
  ) => {
    const id =
      requireRecordId(
        examId,
        "Exam"
      );

    const response =
      await api.post(
        `${RESULT_BASE_URL}/${id}/generate`
      );

    return response?.data;
  };

const recalculateExamResultsApi =
  async (
    examId
  ) => {
    const id =
      requireRecordId(
        examId,
        "Exam"
      );

    const response =
      await api.patch(
        `${RESULT_BASE_URL}/${id}/recalculate`
      );

    return response?.data;
  };

const calculateRankingsApi =
  async (
    examId
  ) => {
    const id =
      requireRecordId(
        examId,
        "Exam"
      );

    const response =
      await api.patch(
        `${RESULT_BASE_URL}/${id}/rankings`
      );

    return response?.data;
  };

const approveExamResultsApi =
  async (
    examId,
    payload = {}
  ) => {
    const id =
      requireRecordId(
        examId,
        "Exam"
      );

    const response =
      await api.patch(
        `${RESULT_BASE_URL}/${id}/approve`,
        payload
      );

    return response?.data;
  };

const publishExamResultsApi =
  async (
    examId
  ) => {
    const id =
      requireRecordId(
        examId,
        "Exam"
      );

    const response =
      await api.patch(
        `${RESULT_BASE_URL}/${id}/publish`
      );

    return response?.data;
  };

/*
|--------------------------------------------------------------------------
| Badges
|--------------------------------------------------------------------------
*/

const ExamStatusBadge = ({
  status
}) => {
  const meta =
    EXAM_STATUS_META[
      status
    ] ||
    {
      label:
        humanize(
          status
        ),
      tone:
        "neutral"
    };

  return (
    <Badge
      tone={
        meta.tone
      }
    >
      {meta.label}
    </Badge>
  );
};

const ResultStatusBadge = ({
  status
}) => {
  const meta =
    RESULT_STATUS_META[
      status
    ] ||
    {
      label:
        humanize(
          status
        ),
      tone:
        "neutral"
    };

  return (
    <Badge
      tone={
        meta.tone
      }
    >
      {meta.label}
    </Badge>
  );
};

const OverallStatusBadge = ({
  status
}) => {
  const meta =
    OVERALL_STATUS_META[
      status
    ] ||
    {
      label:
        humanize(
          status
        ),
      tone:
        "neutral"
    };

  return (
    <Badge
      tone={
        meta.tone
      }
    >
      {meta.label}
    </Badge>
  );
};

const SubjectStatusBadge = ({
  status
}) => {
  const meta =
    SUBJECT_STATUS_META[
      status
    ] ||
    {
      label:
        humanize(
          status
        ),
      tone:
        "neutral"
    };

  return (
    <Badge
      tone={
        meta.tone
      }
    >
      {meta.label}
    </Badge>
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
  help
}) => {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

          {help && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {help}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon
            size={
              19
            }
          />
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Toast
|--------------------------------------------------------------------------
*/

const Toast = ({
  toast,
  onClose
}) => {
  useEffect(
    () => {
      if (!toast) {
        return undefined;
      }

      const timer =
        window.setTimeout(
          onClose,
          4500
        );

      return () =>
        window.clearTimeout(
          timer
        );
    },
    [
      toast,
      onClose
    ]
  );

  if (!toast) {
    return null;
  }

  const isError =
    toast.type ===
    "error";

  return (
    <div className="fixed right-4 top-4 z-[80] w-[calc(100%-2rem)] max-w-sm">
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl ${
          isError
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}
      >
        {isError ? (
          <XCircle
            size={
              19
            }
            className="mt-0.5 shrink-0"
          />
        ) : (
          <CheckCircle2
            size={
              19
            }
            className="mt-0.5 shrink-0"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {isError
              ? "Action Failed"
              : "Success"}
          </p>

          <p className="mt-1 text-xs leading-5">
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={
            onClose
          }
          className="rounded-lg p-1 opacity-70 hover:bg-black/5 hover:opacity-100"
        >
          <XCircle
            size={
              15
            }
          />
        </button>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Exam Results Page
|--------------------------------------------------------------------------
*/

const ExamResults = () => {
  const {
    user
  } =
    useAuth();

  const {
    examId:
      routeExamId
  } =
    useParams();

  const [
    searchParams
  ] =
    useSearchParams();

  const queryExamId =
    searchParams.get(
      "examId"
    );

  const role =
    normalizeRole(
      user?.role
    );

  const canAccess =
    MANAGEMENT_ROLES.includes(
      role
    );

  /*
  |--------------------------------------------------------------------------
  | General State
  |--------------------------------------------------------------------------
  */

  const [
    online,
    setOnline
  ] =
    useState(
      typeof navigator ===
        "undefined"
        ? true
        : navigator.onLine
    );

  const [
    exams,
    setExams
  ] =
    useState([]);

  const [
    selectedExamId,
    setSelectedExamId
  ] =
    useState(
      routeExamId ||
      queryExamId ||
      ""
    );

  const [
    resultExam,
    setResultExam
  ] =
    useState(
      null
    );

  const [
    results,
    setResults
  ] =
    useState([]);

  const [
    summary,
    setSummary
  ] =
    useState(
      DEFAULT_SUMMARY
    );

  const [
    pagination,
    setPagination
  ] =
    useState(
      DEFAULT_PAGINATION
    );

  const [
    loadingExams,
    setLoadingExams
  ] =
    useState(
      true
    );

  const [
    loadingResults,
    setLoadingResults
  ] =
    useState(
      false
    );

  const [
    refreshing,
    setRefreshing
  ] =
    useState(
      false
    );

  const [
    actionLoading,
    setActionLoading
  ] =
    useState(
      ""
    );

  const [
    error,
    setError
  ] =
    useState(
      ""
    );

  const [
    toast,
    setToast
  ] =
    useState(
      null
    );

  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

  const [
    search,
    setSearch
  ] =
    useState(
      ""
    );

  const [
    debouncedSearch,
    setDebouncedSearch
  ] =
    useState(
      ""
    );

  const [
    filters,
    setFilters
  ] =
    useState({
      sectionName:
        "",
      status:
        "",
      overallResultStatus:
        "",
      page:
        1,
      limit:
        25
    });

  /*
  |--------------------------------------------------------------------------
  | Result Detail
  |--------------------------------------------------------------------------
  */

  const [
    detailOpen,
    setDetailOpen
  ] =
    useState(
      false
    );

  const [
    detailLoading,
    setDetailLoading
  ] =
    useState(
      false
    );

  const [
    selectedResult,
    setSelectedResult
  ] =
    useState(
      null
    );

  /*
  |--------------------------------------------------------------------------
  | Approval
  |--------------------------------------------------------------------------
  */

  const [
    approveOpen,
    setApproveOpen
  ] =
    useState(
      false
    );

  const [
    reviewRemarks,
    setReviewRemarks
  ] =
    useState(
      ""
    );

  /*
  |--------------------------------------------------------------------------
  | Publication
  |--------------------------------------------------------------------------
  */

  const [
    publishOpen,
    setPublishOpen
  ] =
    useState(
      false
    );

  /*
  |--------------------------------------------------------------------------
  | Abort Controllers
  |--------------------------------------------------------------------------
  */

  const examsAbortRef =
    useRef(
      null
    );

  const resultsAbortRef =
    useRef(
      null
    );

  const detailAbortRef =
    useRef(
      null
    );

  /*
  |--------------------------------------------------------------------------
  | Online State
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      const handleOnline =
        () =>
          setOnline(
            true
          );

      const handleOffline =
        () =>
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
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | Search Debounce
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            setDebouncedSearch(
              normalizeText(
                search
              )
            );

            setFilters(
              (
                current
              ) => ({
                ...current,
                page:
                  1
              })
            );
          },
          350
        );

      return () =>
        window.clearTimeout(
          timer
        );
    },
    [
      search
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
          silent =
            false
        } = {}
      ) => {
        if (
          !canAccess
        ) {
          setLoadingExams(
            false
          );

          return;
        }

        examsAbortRef
          .current
          ?.abort();

        const controller =
          new AbortController();

        examsAbortRef.current =
          controller;

        if (
          !silent
        ) {
          setLoadingExams(
            true
          );
        }

        try {
          const response =
            await getExams(
              {
                isActive:
                  true,

                limit:
                  100,

                sortBy:
                  "startDate",

                sortOrder:
                  "desc"
              },
              {
                signal:
                  controller.signal
              }
            );

          const payload =
            response?.data ||
            {};

          const list =
            (
              payload.exams ||
              payload?.data
                ?.exams ||
              []
            ).filter(
              (
                exam
              ) =>
                RESULT_EXAM_STATUSES.includes(
                  exam?.status
                )
            );

          setExams(
            list
          );

          setSelectedExamId(
            (
              current
            ) => {
              if (
                current
              ) {
                return current;
              }

              const preferred =
                list.find(
                  (
                    exam
                  ) =>
                    exam.status ===
                    "under_review"
                ) ||
                list.find(
                  (
                    exam
                  ) =>
                    exam.status ===
                    "approved"
                ) ||
                list[0];

              return (
                getRecordId(
                  preferred
                ) ||
                ""
              );
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

          setExams(
            []
          );

          setError(
            getErrorMessage(
              requestError,
              "Examinations could not be loaded."
            )
          );
        } finally {
          if (
            examsAbortRef
              .current ===
            controller
          ) {
            setLoadingExams(
              false
            );
          }
        }
      },
      [
        canAccess
      ]
    );

  useEffect(
    () => {
      loadExams();

      return () => {
        examsAbortRef
          .current
          ?.abort();
      };
    },
    [
      loadExams
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Load Results
  |--------------------------------------------------------------------------
  */

  const loadResults =
    useCallback(
      async (
        {
          silent =
            false
        } = {}
      ) => {
        if (
          !selectedExamId
        ) {
          setResultExam(
            null
          );

          setResults(
            []
          );

          setSummary(
            DEFAULT_SUMMARY
          );

          setPagination(
            DEFAULT_PAGINATION
          );

          return;
        }

        resultsAbortRef
          .current
          ?.abort();

        const controller =
          new AbortController();

        resultsAbortRef.current =
          controller;

        if (
          silent
        ) {
          setRefreshing(
            true
          );
        } else {
          setLoadingResults(
            true
          );
        }

        setError(
          ""
        );

        try {
          const payload =
            await getExamResultsApi(
              selectedExamId,
              {
                search:
                  debouncedSearch ||
                  undefined,

                sectionName:
                  filters.sectionName ||
                  undefined,

                status:
                  filters.status ||
                  undefined,

                overallResultStatus:
                  filters
                    .overallResultStatus ||
                  undefined,

                page:
                  filters.page,

                limit:
                  filters.limit
              },
              {
                signal:
                  controller.signal
              }
            );

          setResultExam(
            payload?.exam ||
            null
          );

          setResults(
            Array.isArray(
              payload?.results
            )
              ? payload.results
              : []
          );

          setSummary({
            ...DEFAULT_SUMMARY,
            ...(
              payload?.summary ||
              {}
            )
          });

          setPagination({
            ...DEFAULT_PAGINATION,
            ...(
              payload?.pagination ||
              {}
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

          setResults(
            []
          );

          setSummary(
            DEFAULT_SUMMARY
          );

          setPagination(
            DEFAULT_PAGINATION
          );

          setError(
            getErrorMessage(
              requestError,
              "Exam results could not be loaded."
            )
          );
        } finally {
          if (
            resultsAbortRef
              .current ===
            controller
          ) {
            setLoadingResults(
              false
            );

            setRefreshing(
              false
            );
          }
        }
      },
      [
        debouncedSearch,
        filters.limit,
        filters.overallResultStatus,
        filters.page,
        filters.sectionName,
        filters.status,
        selectedExamId
      ]
    );

  useEffect(
    () => {
      loadResults();

      return () => {
        resultsAbortRef
          .current
          ?.abort();
      };
    },
    [
      loadResults
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Current Exam
  |--------------------------------------------------------------------------
  */

  const currentExam =
    useMemo(
      () => {
        return (
          resultExam ||
          exams.find(
            (
              exam
            ) =>
              getRecordId(
                exam
              ) ===
              selectedExamId
          ) ||
          null
        );
      },
      [
        exams,
        resultExam,
        selectedExamId
      ]
    );

  const currentExamStatus =
    currentExam?.status ||
    "";

  const rankingEnabled =
    Boolean(
      currentExam
        ?.resultSettings
        ?.rankingEnabled
    );

  const showClassPosition =
    Boolean(
      rankingEnabled &&
      currentExam
        ?.resultSettings
        ?.showClassPosition
    );

  const showSectionPosition =
    Boolean(
      rankingEnabled &&
      currentExam
        ?.resultSettings
        ?.showSectionPosition
    );

  /*
  |--------------------------------------------------------------------------
  | Workflow Counts
  |--------------------------------------------------------------------------
  */

  const approvedResultCount =
    toNumber(
      summary?.byStatus
        ?.approved
    );

  const publishedResultCount =
    toNumber(
      summary?.byStatus
        ?.published
    );

  const lockedResultCount =
    toNumber(
      summary?.byStatus
        ?.locked
    );

  const protectedResultCount =
    approvedResultCount +
    publishedResultCount +
    lockedResultCount;

  const resultTotal =
    toNumber(
      summary.total
    );

  const incompleteTotal =
    toNumber(
      summary.incompleteCount
    );

  const withheldTotal =
    toNumber(
      summary.withheldCount
    );

  /*
  |--------------------------------------------------------------------------
  | Action Permissions
  |--------------------------------------------------------------------------
  */

  const canGenerate =
    Boolean(
      online &&
      [
        "under_review",
        "approved"
      ].includes(
        currentExamStatus
      ) &&
      protectedResultCount ===
        0
    );

  const canRecalculate =
    Boolean(
      online &&
      resultTotal >
        0 &&
      [
        "under_review",
        "approved"
      ].includes(
        currentExamStatus
      ) &&
      protectedResultCount ===
        0
    );

  const canRank =
    Boolean(
      online &&
      rankingEnabled &&
      resultTotal >
        0 &&
      [
        "under_review",
        "approved"
      ].includes(
        currentExamStatus
      )
    );

  const canApprove =
    Boolean(
      online &&
      currentExamStatus ===
        "under_review" &&
      resultTotal >
        0 &&
      incompleteTotal ===
        0 &&
      withheldTotal ===
        0
    );

  const canPublish =
    Boolean(
      online &&
      currentExamStatus ===
        "approved" &&
      resultTotal >
        0 &&
      incompleteTotal ===
        0 &&
      withheldTotal ===
        0
    );

  /*
  |--------------------------------------------------------------------------
  | Exam Selection
  |--------------------------------------------------------------------------
  */

  const handleExamChange =
    (
      event
    ) => {
      setSelectedExamId(
        event.target.value
      );

      setSearch(
        ""
      );

      setFilters({
        sectionName:
          "",
        status:
          "",
        overallResultStatus:
          "",
        page:
          1,
        limit:
          25
      });

      setSelectedResult(
        null
      );

      setDetailOpen(
        false
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Refresh
  |--------------------------------------------------------------------------
  */

  const handleRefresh =
    async () => {
      await Promise.all([
        loadExams({
          silent:
            true
        }),

        loadResults({
          silent:
            true
        })
      ]);
    };

  /*
  |--------------------------------------------------------------------------
  | Generate
  |--------------------------------------------------------------------------
  */

  const handleGenerate =
    async () => {
      if (
        !canGenerate
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          resultTotal >
            0
            ? "This will regenerate the current editable results from approved marks. Continue?"
            : "Generate consolidated student results from all approved marks?"
        );

      if (
        !confirmed
      ) {
        return;
      }

      setActionLoading(
        "generate"
      );

      try {
        const response =
          await generateExamResultsApi(
            selectedExamId
          );

        setToast({
          type:
            "success",

          message:
            response?.message ||
            "Exam results generated successfully."
        });

        await Promise.all([
          loadResults({
            silent:
              true
          }),

          loadExams({
            silent:
              true
          })
        ]);
      } catch (
        requestError
      ) {
        setToast({
          type:
            "error",

          message:
            getErrorMessage(
              requestError,
              "Exam results could not be generated."
            )
        });
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Recalculate
  |--------------------------------------------------------------------------
  */

  const handleRecalculate =
    async () => {
      if (
        !canRecalculate
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Recalculate totals and grades from the latest approved marks?"
        );

      if (
        !confirmed
      ) {
        return;
      }

      setActionLoading(
        "recalculate"
      );

      try {
        const response =
          await recalculateExamResultsApi(
            selectedExamId
          );

        setToast({
          type:
            "success",

          message:
            response?.message ||
            "Results recalculated successfully."
        });

        await loadResults({
          silent:
            true
        });
      } catch (
        requestError
      ) {
        setToast({
          type:
            "error",

          message:
            getErrorMessage(
              requestError,
              "Results could not be recalculated."
            )
        });
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Rankings
  |--------------------------------------------------------------------------
  */

  const handleRankings =
    async () => {
      if (
        !canRank
      ) {
        return;
      }

      setActionLoading(
        "rankings"
      );

      try {
        const response =
          await calculateRankingsApi(
            selectedExamId
          );

        setToast({
          type:
            "success",

          message:
            response?.message ||
            "Class and section rankings recalculated."
        });

        await loadResults({
          silent:
            true
        });
      } catch (
        requestError
      ) {
        setToast({
          type:
            "error",

          message:
            getErrorMessage(
              requestError,
              "Rankings could not be recalculated."
            )
        });
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Approve
  |--------------------------------------------------------------------------
  */

  const handleApprove =
    async () => {
      if (
        !canApprove
      ) {
        return;
      }

      setActionLoading(
        "approve"
      );

      try {
        const response =
          await approveExamResultsApi(
            selectedExamId,
            {
              reviewRemarks:
                normalizeText(
                  reviewRemarks
                )
            }
          );

        setApproveOpen(
          false
        );

        setReviewRemarks(
          ""
        );

        setToast({
          type:
            "success",

          message:
            response?.message ||
            "Exam results approved successfully."
        });

        await Promise.all([
          loadResults({
            silent:
              true
          }),

          loadExams({
            silent:
              true
          })
        ]);
      } catch (
        requestError
      ) {
        setToast({
          type:
            "error",

          message:
            getErrorMessage(
              requestError,
              "Exam results could not be approved."
            )
        });
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Publish
  |--------------------------------------------------------------------------
  */

  const handlePublish =
    async () => {
      if (
        !canPublish
      ) {
        return;
      }

      setActionLoading(
        "publish"
      );

      try {
        const response =
          await publishExamResultsApi(
            selectedExamId
          );

        setPublishOpen(
          false
        );

        setToast({
          type:
            "success",

          message:
            response?.message ||
            "Exam results published successfully."
        });

        await Promise.all([
          loadResults({
            silent:
              true
          }),

          loadExams({
            silent:
              true
          })
        ]);
      } catch (
        requestError
      ) {
        setToast({
          type:
            "error",

          message:
            getErrorMessage(
              requestError,
              "Exam results could not be published."
            )
        });
      } finally {
        setActionLoading(
          ""
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | View One Result
  |--------------------------------------------------------------------------
  */

  const openResultDetail =
    async (
      result
    ) => {
      if (
        !selectedExamId ||
        !result
      ) {
        return;
      }

      detailAbortRef
        .current
        ?.abort();

      const controller =
        new AbortController();

      detailAbortRef.current =
        controller;

      setSelectedResult(
        result
      );

      setDetailOpen(
        true
      );

      setDetailLoading(
        true
      );

      try {
        const response =
          await getExamResultByIdApi(
            selectedExamId,
            result,
            {
              signal:
                controller.signal
            }
          );

        setSelectedResult(
          response?.result ||
          result
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

        setToast({
          type:
            "error",

          message:
            getErrorMessage(
              requestError,
              "Student result details could not be loaded."
            )
        });
      } finally {
        if (
          detailAbortRef
            .current ===
          controller
        ) {
          setDetailLoading(
            false
          );
        }
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Access Denied
  |--------------------------------------------------------------------------
  */

  if (
    !canAccess
  ) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Exam Results"
        />

        <div className="card flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <ShieldCheck
            size={
              42
            }
            className="text-rose-400"
          />

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Access Denied
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Only Principal and Super Admin accounts can manage consolidated exam results.
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
    <div className="space-y-5 pb-6">
      <Toast
        toast={
          toast
        }
        onClose={
          () =>
            setToast(
              null
            )
        }
      />

      <PageHeader
        title="Exam Results"
        action={
          <button
            type="button"
            className="btn-secondary"
            onClick={
              handleRefresh
            }
            disabled={
              refreshing ||
              loadingExams ||
              loadingResults ||
              Boolean(
                actionLoading
              )
            }
          >
            {refreshing ? (
              <Loader2
                size={
                  16
                }
                className="animate-spin"
              />
            ) : (
              <RefreshCw
                size={
                  16
                }
              />
            )}

            Refresh
          </button>
        }
      />

      {/*
      |--------------------------------------------------------------------------
      | Offline
      |--------------------------------------------------------------------------
      */}

      {!online && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle
            size={
              18
            }
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              You are offline
            </p>

            <p className="mt-1 text-xs leading-5">
              Loaded results can still be viewed, but generation, recalculation, approval and publication are disabled.
            </p>
          </div>
        </div>
      )}

      {/*
      |--------------------------------------------------------------------------
      | Error
      |--------------------------------------------------------------------------
      */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertCircle
            size={
              18
            }
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              Unable to load results
            </p>

            <p className="mt-1 text-xs leading-5">
              {error}
            </p>
          </div>
        </div>
      )}

      {/*
      |--------------------------------------------------------------------------
      | Exam Selector
      |--------------------------------------------------------------------------
      */}

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="w-full max-w-xl">
            <label className="field-label">
              Examination
            </label>

            <select
              className="field-select"
              value={
                selectedExamId
              }
              onChange={
                handleExamChange
              }
              disabled={
                loadingExams ||
                Boolean(
                  actionLoading
                )
              }
            >
              <option value="">
                Select examination
              </option>

              {exams.map(
                (
                  exam
                ) => (
                  <option
                    key={
                      getRecordId(
                        exam
                      )
                    }
                    value={
                      getRecordId(
                        exam
                      )
                    }
                  >
                    {exam.examName}
                    {exam.examCode
                      ? ` (${exam.examCode})`
                      : ""}
                    {exam.academicYear
                      ? ` · ${exam.academicYear}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </div>

          {currentExam && (
            <div className="flex flex-wrap items-center gap-2">
              <ExamStatusBadge
                status={
                  currentExamStatus
                }
              />

              {rankingEnabled && (
                <Badge
                  tone="info"
                >
                  Ranking Enabled
                </Badge>
              )}

              {currentExam
                ?.academicYear && (
                <Badge
                  tone="neutral"
                >
                  {
                    currentExam
                      .academicYear
                  }
                </Badge>
              )}
            </div>
          )}
        </div>
      </section>

      {!selectedExamId ? (
        <div className="card flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
          <GraduationCap
            size={
              46
            }
            className="text-slate-300"
          />

          <h2 className="mt-4 text-lg font-bold text-slate-800">
            Select an Examination
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Select an examination to generate, review, approve or publish consolidated student results.
          </p>
        </div>
      ) : (
        <>
          {/*
          |--------------------------------------------------------------------------
          | Exam Header + Actions
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {currentExam
                      ?.examName ||
                      "Exam Results"}
                  </h2>

                  {currentExamStatus && (
                    <ExamStatusBadge
                      status={
                        currentExamStatus
                      }
                    />
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {currentExam
                    ?.examCode ||
                    "No exam code"}
                  {" · "}
                  {currentExam
                    ?.academicYear ||
                    "Academic year not specified"}
                  {currentExam
                    ?.academicTerm
                    ? ` · ${currentExam.academicTerm}`
                    : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={
                    handleGenerate
                  }
                  disabled={
                    !canGenerate ||
                    Boolean(
                      actionLoading
                    )
                  }
                >
                  {actionLoading ===
                  "generate" ? (
                    <Loader2
                      size={
                        16
                      }
                      className="animate-spin"
                    />
                  ) : (
                    <Calculator
                      size={
                        16
                      }
                    />
                  )}

                  {resultTotal >
                  0
                    ? "Regenerate"
                    : "Generate Results"}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={
                    handleRecalculate
                  }
                  disabled={
                    !canRecalculate ||
                    Boolean(
                      actionLoading
                    )
                  }
                >
                  {actionLoading ===
                  "recalculate" ? (
                    <Loader2
                      size={
                        16
                      }
                      className="animate-spin"
                    />
                  ) : (
                    <RotateCw
                      size={
                        16
                      }
                    />
                  )}

                  Recalculate
                </button>

                {rankingEnabled && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={
                      handleRankings
                    }
                    disabled={
                      !canRank ||
                      Boolean(
                        actionLoading
                      )
                    }
                  >
                    {actionLoading ===
                    "rankings" ? (
                      <Loader2
                        size={
                          16
                        }
                        className="animate-spin"
                      />
                    ) : (
                      <Trophy
                        size={
                          16
                        }
                      />
                    )}

                    Rankings
                  </button>
                )}

                {currentExamStatus ===
                  "under_review" && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={
                      () => {
                        setReviewRemarks(
                          ""
                        );

                        setApproveOpen(
                          true
                        );
                      }
                    }
                    disabled={
                      !canApprove ||
                      Boolean(
                        actionLoading
                      )
                    }
                  >
                    <CheckCircle2
                      size={
                        16
                      }
                    />

                    Approve Results
                  </button>
                )}

                {currentExamStatus ===
                  "approved" && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={
                      () =>
                        setPublishOpen(
                          true
                        )
                    }
                    disabled={
                      !canPublish ||
                      Boolean(
                        actionLoading
                      )
                    }
                  >
                    <Send
                      size={
                        16
                      }
                    />

                    Publish Results
                  </button>
                )}
              </div>
            </div>

            {currentExamStatus ===
              "published" && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <FileCheck2
                  size={
                    18
                  }
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="font-semibold">
                    Results Published
                  </p>

                  <p className="mt-1 text-xs leading-5">
                    These results are published and can now be used by the upcoming report-card and student/parent portal modules.
                  </p>
                </div>
              </div>
            )}

            {incompleteTotal >
              0 && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <strong>
                  {incompleteTotal}
                </strong>{" "}
                result
                {incompleteTotal ===
                1
                  ? ""
                  : "s"}{" "}
                are incomplete. Results cannot be approved or published until all incomplete records are resolved.
              </div>
            )}

            {withheldTotal >
              0 && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <strong>
                  {withheldTotal}
                </strong>{" "}
                result
                {withheldTotal ===
                1
                  ? ""
                  : "s"}{" "}
                are withheld and cannot be approved or published.
              </div>
            )}
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Summary
          |--------------------------------------------------------------------------
          */}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <SummaryCard
              icon={
                UsersRound
              }
              label="Students"
              value={
                summary.total ||
                0
              }
              help="Generated consolidated results"
            />

            <SummaryCard
              icon={
                CheckCircle2
              }
              label="Passed"
              value={
                summary.passCount ||
                0
              }
              help="Overall pass results"
            />

            <SummaryCard
              icon={
                XCircle
              }
              label="Failed"
              value={
                summary.failCount ||
                0
              }
              help="Overall fail results"
            />

            <SummaryCard
              icon={
                BarChart3
              }
              label="Average"
              value={
                formatPercentage(
                  summary
                    .averagePercentage
                )
              }
              help="Average result percentage"
            />

            <SummaryCard
              icon={
                Award
              }
              label="Approved"
              value={
                approvedResultCount +
                publishedResultCount +
                lockedResultCount
              }
              help="Approved or later workflow stage"
            />
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Filters
          |--------------------------------------------------------------------------
          */}

          <section className="card p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <Search
                  size={
                    16
                  }
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  className="field-input pl-9"
                  placeholder="Search student, roll or admission no..."
                  value={
                    search
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setSearch(
                        event.target
                          .value
                      )
                  }
                />
              </div>

              <input
                type="text"
                className="field-input"
                placeholder="Section e.g. A"
                value={
                  filters.sectionName
                }
                onChange={
                  (
                    event
                  ) =>
                    setFilters(
                      (
                        current
                      ) => ({
                        ...current,

                        sectionName:
                          event
                            .target
                            .value,

                        page:
                          1
                      })
                    )
                }
              />

              <select
                className="field-select"
                value={
                  filters.status
                }
                onChange={
                  (
                    event
                  ) =>
                    setFilters(
                      (
                        current
                      ) => ({
                        ...current,

                        status:
                          event
                            .target
                            .value,

                        page:
                          1
                      })
                    )
                }
              >
                <option value="">
                  All Workflow Statuses
                </option>

                <option value="generated">
                  Generated
                </option>

                <option value="under_review">
                  Under Review
                </option>

                <option value="approved">
                  Approved
                </option>

                <option value="published">
                  Published
                </option>

                <option value="locked">
                  Locked
                </option>
              </select>

              <select
                className="field-select"
                value={
                  filters
                    .overallResultStatus
                }
                onChange={
                  (
                    event
                  ) =>
                    setFilters(
                      (
                        current
                      ) => ({
                        ...current,

                        overallResultStatus:
                          event
                            .target
                            .value,

                        page:
                          1
                      })
                    )
                }
              >
                <option value="">
                  All Results
                </option>

                <option value="pass">
                  Pass
                </option>

                <option value="fail">
                  Fail
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="incomplete">
                  Incomplete
                </option>

                <option value="withheld">
                  Withheld
                </option>
              </select>
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Results Table
          |--------------------------------------------------------------------------
          */}

          <section className="card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Student Results
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Consolidated result records generated from approved subject marks.
                </p>
              </div>

              <Badge
                tone="info"
              >
                {pagination.total ||
                  0}{" "}
                Results
              </Badge>
            </div>

            {loadingResults ? (
              <div className="p-5">
                <div className="animate-pulse space-y-3">
                  {Array.from({
                    length:
                      7
                  }).map(
                    (
                      _,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                        className="h-14 rounded-xl bg-slate-100"
                      />
                    )
                  )}
                </div>
              </div>
            ) : results.length ===
              0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
                <GraduationCap
                  size={
                    42
                  }
                  className="text-slate-300"
                />

                <h3 className="mt-4 font-bold text-slate-800">
                  No Results Found
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {summary.total ===
                  0
                    ? "No consolidated results have been generated for this examination yet."
                    : "No results match the selected filters."}
                </p>

                {summary.total ===
                  0 &&
                  canGenerate && (
                    <button
                      type="button"
                      className="btn-primary mt-5"
                      onClick={
                        handleGenerate
                      }
                      disabled={
                        Boolean(
                          actionLoading
                        )
                      }
                    >
                      <Calculator
                        size={
                          16
                        }
                      />

                      Generate Results
                    </button>
                  )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="sticky left-0 z-10 min-w-[240px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Student
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Class
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Marks
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Percentage
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Grade
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Result
                        </th>

                        {showClassPosition && (
                          <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Class Pos.
                          </th>
                        )}

                        {showSectionPosition && (
                          <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Section Pos.
                          </th>
                        )}

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {results.map(
                        (
                          result
                        ) => {
                          const studentName =
                            result.studentName ||
                            result
                              ?.studentId
                              ?.studentUserId
                              ?.name ||
                            result
                              ?.studentId
                              ?.name ||
                            "Student";

                          return (
                            <tr
                              key={
                                getRecordId(
                                  result
                                )
                              }
                              className="bg-white hover:bg-slate-50/70"
                            >
                              <td className="sticky left-0 z-[5] bg-inherit px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">
                                    {getInitials(
                                      studentName
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="max-w-[175px] truncate font-semibold text-slate-800">
                                      {
                                        studentName
                                      }
                                    </p>

                                    <p className="mt-1 text-[11px] text-slate-400">
                                      Roll:{" "}
                                      {result.rollNumber ||
                                        "—"}
                                      {" · "}
                                      Adm:{" "}
                                      {result.admissionNumber ||
                                        "—"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-3 py-4">
                                <p className="font-semibold text-slate-700">
                                  {result.className ||
                                    result
                                      ?.classId
                                      ?.className ||
                                    "—"}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  Section{" "}
                                  {result.sectionName ||
                                    "—"}
                                </p>
                              </td>

                              <td className="px-3 py-4">
                                <span className="font-bold text-slate-900">
                                  {formatNumber(
                                    result
                                      ?.totals
                                      ?.totalObtainedMarks
                                  )}
                                </span>

                                <span className="text-xs text-slate-400">
                                  {" "}
                                  /{" "}
                                  {formatNumber(
                                    result
                                      ?.totals
                                      ?.totalMaxMarks
                                  )}
                                </span>
                              </td>

                              <td className="px-3 py-4">
                                <span className="font-bold text-slate-800">
                                  {formatPercentage(
                                    result
                                      ?.totals
                                      ?.percentage
                                  )}
                                </span>
                              </td>

                              <td className="px-3 py-4">
                                {result
                                  ?.overallGrade
                                  ?.grade ? (
                                  <div>
                                    <span className="text-base font-bold text-slate-900">
                                      {
                                        result
                                          .overallGrade
                                          .grade
                                      }
                                    </span>

                                    {result
                                      ?.overallGrade
                                      ?.label && (
                                      <p className="mt-1 text-[11px] text-slate-400">
                                        {
                                          result
                                            .overallGrade
                                            .label
                                        }
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">
                                    —
                                  </span>
                                )}
                              </td>

                              <td className="px-3 py-4">
                                <OverallStatusBadge
                                  status={
                                    result.overallResultStatus
                                  }
                                />
                              </td>

                              {showClassPosition && (
                                <td className="px-3 py-4">
                                  {result
                                    ?.positions
                                    ?.classPosition ? (
                                    <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                                      <Medal
                                        size={
                                          15
                                        }
                                        className="text-amber-500"
                                      />

                                      {
                                        result
                                          .positions
                                          .classPosition
                                      }

                                      <span className="text-xs font-normal text-slate-400">
                                        /{" "}
                                        {
                                          result
                                            .positions
                                            .classCandidateCount
                                        }
                                      </span>
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              )}

                              {showSectionPosition && (
                                <td className="px-3 py-4">
                                  {result
                                    ?.positions
                                    ?.sectionPosition ? (
                                    <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                                      <Trophy
                                        size={
                                          15
                                        }
                                        className="text-amber-500"
                                      />

                                      {
                                        result
                                          .positions
                                          .sectionPosition
                                      }

                                      <span className="text-xs font-normal text-slate-400">
                                        /{" "}
                                        {
                                          result
                                            .positions
                                            .sectionCandidateCount
                                        }
                                      </span>
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              )}

                              <td className="px-3 py-4">
                                <ResultStatusBadge
                                  status={
                                    result.status
                                  }
                                />
                              </td>

                              <td className="px-4 py-4 text-right">
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={
                                    () =>
                                      openResultDetail(
                                        result
                                      )
                                  }
                                >
                                  <Eye
                                    size={
                                      15
                                    }
                                  />

                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
                  <Pagination
                    pagination={
                      pagination
                    }
                    onPageChange={
                      (
                        page
                      ) =>
                        setFilters(
                          (
                            current
                          ) => ({
                            ...current,
                            page
                          })
                        )
                    }
                    disabled={
                      loadingResults ||
                      refreshing ||
                      Boolean(
                        actionLoading
                      )
                    }
                  />
                </div>
              </>
            )}
          </section>
        </>
      )}

      {/*
      |--------------------------------------------------------------------------
      | Student Result Detail Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={
          detailOpen
        }
        onClose={
          () => {
            detailAbortRef
              .current
              ?.abort();

            setDetailOpen(
              false
            );
          }
        }
        title="Student Exam Result"
        width="max-w-6xl"
      >
        {detailLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2
              size={
                30
              }
              className="animate-spin text-brand-600"
            />
          </div>
        ) : !selectedResult ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Result details are unavailable.
          </div>
        ) : (
          <div className="space-y-5">
            {/*
            |--------------------------------------------------------------------------
            | Student Header
            |--------------------------------------------------------------------------
            */}

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 font-bold text-brand-700">
                    {getInitials(
                      selectedResult.studentName
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {selectedResult.studentName ||
                        "Student"}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Roll:{" "}
                      {selectedResult.rollNumber ||
                        "—"}
                      {" · "}
                      Admission:{" "}
                      {selectedResult.admissionNumber ||
                        "—"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {selectedResult.className ||
                        "Class"}
                      {" · Section "}
                      {selectedResult.sectionName ||
                        "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <OverallStatusBadge
                    status={
                      selectedResult
                        .overallResultStatus
                    }
                  />

                  <ResultStatusBadge
                    status={
                      selectedResult.status
                    }
                  />
                </div>
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Result Summary
            |--------------------------------------------------------------------------
            */}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Obtained Marks
                </p>

                <p className="mt-2 text-xl font-bold text-slate-900">
                  {formatNumber(
                    selectedResult
                      ?.totals
                      ?.totalObtainedMarks
                  )}
                  <span className="text-sm font-normal text-slate-400">
                    {" "}
                    /{" "}
                    {formatNumber(
                      selectedResult
                        ?.totals
                        ?.totalMaxMarks
                    )}
                  </span>
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Percentage
                </p>

                <p className="mt-2 text-xl font-bold text-slate-900">
                  {formatPercentage(
                    selectedResult
                      ?.totals
                      ?.percentage
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Overall Grade
                </p>

                <p className="mt-2 text-xl font-bold text-slate-900">
                  {selectedResult
                    ?.overallGrade
                    ?.grade ||
                    "—"}
                </p>

                {selectedResult
                  ?.overallGrade
                  ?.label && (
                  <p className="mt-1 text-xs text-slate-400">
                    {
                      selectedResult
                        .overallGrade
                        .label
                    }
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Subjects
                </p>

                <p className="mt-2 text-xl font-bold text-slate-900">
                  {selectedResult
                    ?.totals
                    ?.subjectCount ||
                    selectedResult
                      ?.subjectResults
                      ?.length ||
                    0}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Passed{" "}
                  {selectedResult
                    ?.totals
                    ?.passedSubjectCount ||
                    0}
                  {" · "}
                  Failed{" "}
                  {selectedResult
                    ?.totals
                    ?.failedSubjectCount ||
                    0}
                </p>
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Ranking
            |--------------------------------------------------------------------------
            */}

            {selectedResult
              ?.resultRules
              ?.rankingEnabled && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                  <div className="flex items-center gap-2">
                    <Medal
                      size={
                        18
                      }
                      className="text-amber-600"
                    />

                    <p className="text-sm font-semibold text-amber-900">
                      Class Position
                    </p>
                  </div>

                  <p className="mt-2 text-2xl font-bold text-amber-900">
                    {selectedResult
                      ?.positions
                      ?.classPosition ||
                      "—"}

                    {selectedResult
                      ?.positions
                      ?.classCandidateCount >
                      0 && (
                      <span className="text-sm font-normal text-amber-600">
                        {" "}
                        /{" "}
                        {
                          selectedResult
                            .positions
                            .classCandidateCount
                        }
                      </span>
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-center gap-2">
                    <Trophy
                      size={
                        18
                      }
                      className="text-blue-600"
                    />

                    <p className="text-sm font-semibold text-blue-900">
                      Section Position
                    </p>
                  </div>

                  <p className="mt-2 text-2xl font-bold text-blue-900">
                    {selectedResult
                      ?.positions
                      ?.sectionPosition ||
                      "—"}

                    {selectedResult
                      ?.positions
                      ?.sectionCandidateCount >
                      0 && (
                      <span className="text-sm font-normal text-blue-600">
                        {" "}
                        /{" "}
                        {
                          selectedResult
                            .positions
                            .sectionCandidateCount
                        }
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/*
            |--------------------------------------------------------------------------
            | Subject Results
            |--------------------------------------------------------------------------
            */}

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <h4 className="font-bold text-slate-900">
                  Subject Results
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-50/60 text-left">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Subject
                      </th>

                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Marks
                      </th>

                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Percentage
                      </th>

                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Grade
                      </th>

                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Result
                      </th>

                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Remarks
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {(
                      selectedResult
                        .subjectResults ||
                      []
                    ).map(
                      (
                        subject,
                        index
                      ) => (
                        <tr
                          key={
                            getRecordId(
                              subject.subjectId
                            ) ||
                            index
                          }
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">
                              {subject.subjectName ||
                                subject
                                  ?.subjectId
                                  ?.subjectName ||
                                "Subject"}
                            </p>

                            {subject.subjectCode && (
                              <p className="mt-1 text-xs text-slate-400">
                                {
                                  subject.subjectCode
                                }
                              </p>
                            )}
                          </td>

                          <td className="px-3 py-3">
                            <span className="font-bold text-slate-800">
                              {formatNumber(
                                subject.obtainedMarks
                              )}
                            </span>

                            <span className="text-xs text-slate-400">
                              {" "}
                              /{" "}
                              {formatNumber(
                                subject.maxMarks
                              )}
                            </span>
                          </td>

                          <td className="px-3 py-3 font-semibold text-slate-700">
                            {formatPercentage(
                              subject.percentage
                            )}
                          </td>

                          <td className="px-3 py-3">
                            {subject
                              ?.grade
                              ?.grade ||
                              "—"}
                          </td>

                          <td className="px-3 py-3">
                            <SubjectStatusBadge
                              status={
                                subject.resultStatus
                              }
                            />
                          </td>

                          <td className="px-3 py-3 text-xs text-slate-500">
                            {subject.teacherRemarks ||
                              "—"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Workflow Metadata
            |--------------------------------------------------------------------------
            */}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Generated
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {formatDateTime(
                    selectedResult
                      ?.generation
                      ?.generatedAt
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Source marks:{" "}
                  {selectedResult
                    ?.generation
                    ?.sourceMarkCount ||
                    0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Approval / Publication
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Approved:{" "}
                  <strong className="text-slate-700">
                    {formatDateTime(
                      selectedResult
                        ?.approval
                        ?.approvedAt
                    )}
                  </strong>
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Published:{" "}
                  <strong className="text-slate-700">
                    {formatDateTime(
                      selectedResult
                        ?.publication
                        ?.publishedAt
                    )}
                  </strong>
                </p>
              </div>
            </div>

            {selectedResult
              ?.approval
              ?.reviewRemarks && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                  Review Remarks
                </p>

                <p className="mt-2 text-sm leading-6 text-blue-900">
                  {
                    selectedResult
                      .approval
                      .reviewRemarks
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/*
      |--------------------------------------------------------------------------
      | Approve Results Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={
          approveOpen
        }
        onClose={
          () => {
            if (
              actionLoading ===
              "approve"
            ) {
              return;
            }

            setApproveOpen(
              false
            );
          }
        }
        title="Approve Exam Results"
        width="max-w-xl"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2
              size={
                20
              }
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Approve all consolidated results?
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-700">
                All complete student results will move to approved status and the examination will also move to approved.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-100 p-4 text-center">
            <div>
              <p className="text-xl font-bold text-slate-900">
                {summary.total}
              </p>

              <p className="text-xs text-slate-400">
                Students
              </p>
            </div>

            <div>
              <p className="text-xl font-bold text-emerald-600">
                {summary.passCount}
              </p>

              <p className="text-xs text-slate-400">
                Pass
              </p>
            </div>

            <div>
              <p className="text-xl font-bold text-rose-600">
                {summary.failCount}
              </p>

              <p className="text-xs text-slate-400">
                Fail
              </p>
            </div>
          </div>

          <div>
            <label className="field-label">
              Review Remarks
            </label>

            <textarea
              className="field-input min-h-28 resize-y"
              placeholder="Optional management remarks..."
              maxLength={
                1000
              }
              value={
                reviewRemarks
              }
              onChange={
                (
                  event
                ) =>
                  setReviewRemarks(
                    event.target
                      .value
                  )
              }
              disabled={
                actionLoading ===
                "approve"
              }
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={
                () =>
                  setApproveOpen(
                    false
                  )
              }
              disabled={
                actionLoading ===
                "approve"
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={
                handleApprove
              }
              disabled={
                !canApprove ||
                actionLoading ===
                  "approve"
              }
            >
              {actionLoading ===
              "approve" ? (
                <Loader2
                  size={
                    16
                  }
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2
                  size={
                    16
                  }
                />
              )}

              {actionLoading ===
              "approve"
                ? "Approving..."
                : "Approve Results"}
            </button>
          </div>
        </div>
      </Modal>

      {/*
      |--------------------------------------------------------------------------
      | Publish Results Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={
          publishOpen
        }
        onClose={
          () => {
            if (
              actionLoading ===
              "publish"
            ) {
              return;
            }

            setPublishOpen(
              false
            );
          }
        }
        title="Publish Exam Results"
        width="max-w-xl"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <Send
              size={
                20
              }
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Publish approved examination results?
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Publishing moves consolidated results, approved student marks and the examination itself to the published workflow stage.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <GraduationCap
                size={
                  22
                }
                className="text-brand-600"
              />

              <div>
                <p className="font-semibold text-slate-900">
                  {currentExam
                    ?.examName ||
                    "Examination"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {summary.total} consolidated student results
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs leading-5 text-amber-800">
              After publication these results will become the official source for the upcoming Report Card, Student Portal Result and Parent Portal Result modules.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={
                () =>
                  setPublishOpen(
                    false
                  )
              }
              disabled={
                actionLoading ===
                "publish"
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={
                handlePublish
              }
              disabled={
                !canPublish ||
                actionLoading ===
                  "publish"
              }
            >
              {actionLoading ===
              "publish" ? (
                <Loader2
                  size={
                    16
                  }
                  className="animate-spin"
                />
              ) : (
                <Send
                  size={
                    16
                  }
                />
              )}

              {actionLoading ===
              "publish"
                ? "Publishing..."
                : "Publish Results"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExamResults;