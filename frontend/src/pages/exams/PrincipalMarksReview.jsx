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
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileCheck2,
  GraduationCap,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle
} from "lucide-react";

import {
  getExams
} from "../../api/exams";

import {
  approveMarkSheet,
  getExamMarksReview,
  getMarkSheet,
  returnMarkSheet
} from "../../api/examMarks";

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

/*
|--------------------------------------------------------------------------
| Access Roles
|--------------------------------------------------------------------------
*/

const REVIEW_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Exam Statuses Visible in Marks Review
|--------------------------------------------------------------------------
*/

const REVIEW_EXAM_STATUSES = [
  "marks_entry",
  "under_review",
  "approved",
  "published",
  "locked"
];

const ACTIONABLE_EXAM_STATUSES = [
  "marks_entry",
  "under_review"
];

/*
|--------------------------------------------------------------------------
| Sheet Status Meta
|--------------------------------------------------------------------------
*/

const SHEET_STATUS_META = {
  not_started: {
    label:
      "Not Started",
    tone:
      "neutral"
  },

  draft: {
    label:
      "Draft",
    tone:
      "warning"
  },

  mixed: {
    label:
      "In Progress",
    tone:
      "warning"
  },

  submitted: {
    label:
      "Submitted",
    tone:
      "info"
  },

  returned: {
    label:
      "Returned",
    tone:
      "danger"
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
| Exam Status Meta
|--------------------------------------------------------------------------
*/

const EXAM_STATUS_META = {
  marks_entry: {
    label:
      "Marks Entry",
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
  }
};

/*
|--------------------------------------------------------------------------
| Result Status Meta
|--------------------------------------------------------------------------
*/

const RESULT_STATUS_META = {
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
| General Helpers
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
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "0";
  }

  return new Intl.NumberFormat(
    "en-PK",
    {
      maximumFractionDigits:
        2
    }
  ).format(
    number
  );
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
    return details.join(
      " "
    );
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

/*
|--------------------------------------------------------------------------
| Entity Helpers
|--------------------------------------------------------------------------
*/

const getClassName = (
  sheet
) => {
  return (
    sheet?.classId
      ?.className ||
    sheet?.classId
      ?.name ||
    "Class"
  );
};

const getSubjectName = (
  sheet
) => {
  return (
    sheet?.subjectId
      ?.subjectName ||
    sheet?.subjectId
      ?.name ||
    "Subject"
  );
};

const getSubjectCode = (
  sheet
) => {
  return (
    sheet?.subjectId
      ?.subjectCode ||
    ""
  );
};

const getStudentName = (
  student
) => {
  return (
    student?.studentUserId
      ?.name ||
    student?.name ||
    "Student"
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

/*
|--------------------------------------------------------------------------
| Sheet Helpers
|--------------------------------------------------------------------------
*/

const getSheetKey = (
  sheet
) => {
  if (!sheet) {
    return "";
  }

  return [
    getRecordId(
      sheet.classId
    ),
    normalizeText(
      sheet.sectionName
    ),
    getRecordId(
      sheet.subjectId
    )
  ].join(
    ":"
  );
};

const getSheetIdentity = (
  sheet,
  examId
) => {
  return {
    examId:
      getRecordId(
        examId
      ),

    classId:
      getRecordId(
        sheet?.classId
      ),

    sectionName:
      normalizeText(
        sheet?.sectionName
      ),

    subjectId:
      getRecordId(
        sheet?.subjectId
      )
  };
};

const getSheetStatus = (
  sheet
) => {
  return (
    sheet?.summary
      ?.sheetStatus ||
    "not_started"
  );
};

/*
|--------------------------------------------------------------------------
| Badge Components
|--------------------------------------------------------------------------
*/

const SheetStatusBadge = ({
  status
}) => {
  const meta =
    SHEET_STATUS_META[
      status
    ] ||
    {
      label:
        status ||
        "Unknown",
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

const ExamStatusBadge = ({
  status
}) => {
  const meta =
    EXAM_STATUS_META[
      status
    ] ||
    {
      label:
        status ||
        "Unknown",
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
        status ||
        "Pending",
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

      const timeout =
        window.setTimeout(
          onClose,
          4200
        );

      return () =>
        window.clearTimeout(
          timeout
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
    <div className="fixed right-4 top-4 z-[70] w-[calc(100%-2rem)] max-w-sm">
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
              ? "Action failed"
              : "Success"}
          </p>

          <p className="mt-1 text-xs leading-5">
            {toast.message}
          </p>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Principal Marks Review
|--------------------------------------------------------------------------
*/

const PrincipalMarksReview = () => {
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

  const initialExamId =
    routeExamId ||
    queryExamId ||
    "";

  const role =
    normalizeRole(
      user?.role
    );

  const canAccess =
    REVIEW_ROLES.includes(
      role
    );

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
      initialExamId
    );

  const [
    review,
    setReview
  ] =
    useState(
      null
    );

  const [
    selectedSheet,
    setSelectedSheet
  ] =
    useState(
      null
    );

  const [
    markSheet,
    setMarkSheet
  ] =
    useState(
      null
    );

  const [
    loadingExams,
    setLoadingExams
  ] =
    useState(
      true
    );

  const [
    loadingReview,
    setLoadingReview
  ] =
    useState(
      false
    );

  const [
    loadingSheet,
    setLoadingSheet
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
      false
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

  const [
    search,
    setSearch
  ] =
    useState(
      ""
    );

  const [
    statusFilter,
    setStatusFilter
  ] =
    useState(
      ""
    );

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

  const [
    returnOpen,
    setReturnOpen
  ] =
    useState(
      false
    );

  const [
    returnReason,
    setReturnReason
  ] =
    useState(
      ""
    );

  const examsAbortRef =
    useRef(
      null
    );

  const reviewAbortRef =
    useRef(
      null
    );

  const sheetAbortRef =
    useRef(
      null
    );

  /*
  |--------------------------------------------------------------------------
  | Online / Offline State
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
          const {
            data
          } =
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

          const examList =
            (
              data?.exams ||
              data?.data
                ?.exams ||
              []
            ).filter(
              (
                exam
              ) =>
                REVIEW_EXAM_STATUSES.includes(
                  exam?.status
                )
            );

          setExams(
            examList
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
                examList.find(
                  (
                    exam
                  ) =>
                    exam.status ===
                    "under_review"
                ) ||
                examList.find(
                  (
                    exam
                  ) =>
                    exam.status ===
                    "marks_entry"
                ) ||
                examList[0];

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
              "Exams could not be loaded."
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
  | Load Review Dashboard
  |--------------------------------------------------------------------------
  */

  const loadReview =
    useCallback(
      async (
        examId,
        {
          silent =
            false
        } = {}
      ) => {
        if (
          !examId
        ) {
          setReview(
            null
          );

          setSelectedSheet(
            null
          );

          setMarkSheet(
            null
          );

          return;
        }

        reviewAbortRef
          .current
          ?.abort();

        const controller =
          new AbortController();

        reviewAbortRef.current =
          controller;

        if (
          !silent
        ) {
          setLoadingReview(
            true
          );
        }

        setError(
          ""
        );

        try {
          const response =
            await getExamMarksReview(
              examId,
              {
                signal:
                  controller.signal
              }
            );

          const payload =
            response?.data &&
            response?.exam ===
              undefined
              ? response.data
              : response;

          setReview(
            payload
          );

          const sheets =
            Array.isArray(
              payload?.sheets
            )
              ? payload.sheets
              : [];

          setSelectedSheet(
            (
              current
            ) => {
              if (
                !sheets.length
              ) {
                return null;
              }

              if (
                current
              ) {
                const currentKey =
                  getSheetKey(
                    current
                  );

                const matched =
                  sheets.find(
                    (
                      sheet
                    ) =>
                      getSheetKey(
                        sheet
                      ) ===
                      currentKey
                  );

                if (
                  matched
                ) {
                  return matched;
                }
              }

              return (
                sheets.find(
                  (
                    sheet
                  ) =>
                    getSheetStatus(
                      sheet
                    ) ===
                    "submitted"
                ) ||
                sheets.find(
                  (
                    sheet
                  ) =>
                    getSheetStatus(
                      sheet
                    ) ===
                    "returned"
                ) ||
                sheets[0]
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

          setReview(
            null
          );

          setSelectedSheet(
            null
          );

          setMarkSheet(
            null
          );

          setError(
            getErrorMessage(
              requestError,
              "Exam marks review could not be loaded."
            )
          );
        } finally {
          if (
            reviewAbortRef
              .current ===
            controller
          ) {
            setLoadingReview(
              false
            );
          }
        }
      },
      []
    );

  useEffect(
    () => {
      if (
        selectedExamId
      ) {
        loadReview(
          selectedExamId
        );
      } else {
        setReview(
          null
        );

        setSelectedSheet(
          null
        );

        setMarkSheet(
          null
        );
      }

      return () => {
        reviewAbortRef
          .current
          ?.abort();
      };
    },
    [
      loadReview,
      selectedExamId
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Load Individual Sheet
  |--------------------------------------------------------------------------
  */

  const loadSheet =
    useCallback(
      async (
        sheet
      ) => {
        if (
          !sheet ||
          !selectedExamId
        ) {
          setMarkSheet(
            null
          );

          return;
        }

        sheetAbortRef
          .current
          ?.abort();

        const controller =
          new AbortController();

        sheetAbortRef.current =
          controller;

        setLoadingSheet(
          true
        );

        try {
          const response =
            await getMarkSheet(
              getSheetIdentity(
                sheet,
                selectedExamId
              ),
              {
                signal:
                  controller.signal
              }
            );

          const payload =
            response?.data &&
            response?.exam ===
              undefined
              ? response.data
              : response;

          setMarkSheet(
            payload
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

          setMarkSheet(
            null
          );

          setToast({
            type:
              "error",

            message:
              getErrorMessage(
                requestError,
                "Mark sheet details could not be loaded."
              )
          });
        } finally {
          if (
            sheetAbortRef
              .current ===
            controller
          ) {
            setLoadingSheet(
              false
            );
          }
        }
      },
      [
        selectedExamId
      ]
    );

  useEffect(
    () => {
      if (
        selectedSheet
      ) {
        loadSheet(
          selectedSheet
        );
      } else {
        setMarkSheet(
          null
        );
      }

      return () => {
        sheetAbortRef
          .current
          ?.abort();
      };
    },
    [
      loadSheet,
      selectedSheet
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
          review?.exam ||
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
        review?.exam,
        selectedExamId
      ]
    );

  const currentExamStatus =
    currentExam?.status ||
    "";

  const examAllowsActions =
    ACTIONABLE_EXAM_STATUSES.includes(
      currentExamStatus
    );

  /*
  |--------------------------------------------------------------------------
  | Review Summary
  |--------------------------------------------------------------------------
  */

  const overall =
    review?.overall ||
    {
      sheetCount:
        0,

      notStarted:
        0,

      draft:
        0,

      submitted:
        0,

      returned:
        0,

      approved:
        0
    };

  const sheets =
    Array.isArray(
      review?.sheets
    )
      ? review.sheets
      : [];

  const totalStudentMarks =
    useMemo(
      () => {
        return sheets.reduce(
          (
            total,
            sheet
          ) =>
            total +
            toNumber(
              sheet?.summary
                ?.total
            ),
          0
        );
      },
      [
        sheets
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Filter Sheets
  |--------------------------------------------------------------------------
  */

  const filteredSheets =
    useMemo(
      () => {
        const query =
          normalizeText(
            search
          ).toLowerCase();

        return sheets.filter(
          (
            sheet
          ) => {
            const status =
              getSheetStatus(
                sheet
              );

            if (
              statusFilter &&
              status !==
                statusFilter
            ) {
              return false;
            }

            if (
              !query
            ) {
              return true;
            }

            const searchable =
              [
                getClassName(
                  sheet
                ),
                sheet
                  ?.sectionName,
                getSubjectName(
                  sheet
                ),
                getSubjectCode(
                  sheet
                )
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                )
                .toLowerCase();

            return searchable.includes(
              query
            );
          }
        );
      },
      [
        search,
        sheets,
        statusFilter
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Mark Sheet Derived Data
  |--------------------------------------------------------------------------
  */

  const assessmentRule =
    markSheet
      ?.assessmentRule ||
    {};

  const theoryMax =
    toNumber(
      assessmentRule
        ?.theoryMaxMarks
    );

  const practicalMax =
    toNumber(
      assessmentRule
        ?.practicalMaxMarks
    );

  const internalMax =
    toNumber(
      assessmentRule
        ?.internalMaxMarks
    );

  const overallMax =
    toNumber(
      assessmentRule
        ?.maxMarks
    );

  const passingMarks =
    toNumber(
      assessmentRule
        ?.passingMarks
    );

  const showTheory =
    theoryMax >
    0;

  const showPractical =
    practicalMax >
    0;

  const showInternal =
    internalMax >
    0;

  const markRows =
    Array.isArray(
      markSheet?.rows
    )
      ? markSheet.rows
      : [];

  /*
  |--------------------------------------------------------------------------
  | Current Sheet Action Rules
  |--------------------------------------------------------------------------
  */

  const selectedSheetStatus =
    getSheetStatus(
      selectedSheet
    );

  const canApprove =
    Boolean(
      selectedSheet &&
      selectedSheetStatus ===
        "submitted" &&
      examAllowsActions
    );

  const canReturn =
    Boolean(
      selectedSheet &&
      [
        "submitted",
        "approved"
      ].includes(
        selectedSheetStatus
      ) &&
      examAllowsActions
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

      setSelectedSheet(
        null
      );

      setMarkSheet(
        null
      );

      setSearch(
        ""
      );

      setStatusFilter(
        ""
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Select Sheet
  |--------------------------------------------------------------------------
  */

  const selectSheet =
    (
      sheet
    ) => {
      setSelectedSheet(
        sheet
      );

      setReviewRemarks(
        ""
      );

      setReturnReason(
        ""
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Approve Sheet
  |--------------------------------------------------------------------------
  */

  const handleApprove =
    async () => {
      if (
        !canApprove ||
        !selectedSheet ||
        !selectedExamId
      ) {
        return;
      }

      if (
        !online
      ) {
        setToast({
          type:
            "error",

          message:
            "You are offline. Reconnect before approving marks."
        });

        return;
      }

      setActionLoading(
        true
      );

      try {
        const response =
          await approveMarkSheet({
            ...getSheetIdentity(
              selectedSheet,
              selectedExamId
            ),

            reviewRemarks:
              normalizeText(
                reviewRemarks
              )
          });

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
            "Mark sheet approved successfully."
        });

        await Promise.all([
          loadReview(
            selectedExamId,
            {
              silent:
                true
            }
          ),

          loadExams({
            silent:
              true
          })
        ]);

        await loadSheet(
          selectedSheet
        );
      } catch (
        requestError
      ) {
        setToast({
          type:
            "error",

          message:
            getErrorMessage(
              requestError,
              "Mark sheet could not be approved."
            )
        });
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Return Sheet
  |--------------------------------------------------------------------------
  */

  const handleReturn =
    async () => {
      if (
        !canReturn ||
        !selectedSheet ||
        !selectedExamId
      ) {
        return;
      }

      const reason =
        normalizeText(
          returnReason
        );

      if (
        !reason
      ) {
        setToast({
          type:
            "error",

          message:
            "Please enter a reason before returning the mark sheet."
        });

        return;
      }

      if (
        !online
      ) {
        setToast({
          type:
            "error",

          message:
            "You are offline. Reconnect before returning marks."
        });

        return;
      }

      setActionLoading(
        true
      );

      try {
        const response =
          await returnMarkSheet({
            ...getSheetIdentity(
              selectedSheet,
              selectedExamId
            ),

            returnReason:
              reason
          });

        setReturnOpen(
          false
        );

        setReturnReason(
          ""
        );

        setToast({
          type:
            "success",

          message:
            response?.message ||
            "Mark sheet returned for correction."
        });

        await Promise.all([
          loadReview(
            selectedExamId,
            {
              silent:
                true
            }
          ),

          loadExams({
            silent:
              true
          })
        ]);

        await loadSheet(
          selectedSheet
        );
      } catch (
        requestError
      ) {
        setToast({
          type:
            "error",

          message:
            getErrorMessage(
              requestError,
              "Mark sheet could not be returned."
            )
        });
      } finally {
        setActionLoading(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Refresh
  |--------------------------------------------------------------------------
  */

  const handleRefresh =
    async () => {
      setRefreshing(
        true
      );

      try {
        await loadExams({
          silent:
            true
        });

        if (
          selectedExamId
        ) {
          await loadReview(
            selectedExamId,
            {
              silent:
                true
            }
          );
        }

        if (
          selectedSheet
        ) {
          await loadSheet(
            selectedSheet
          );
        }
      } finally {
        setRefreshing(
          false
        );
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
          title="Principal Marks Review"
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
            Only Principal and Super Admin accounts can review, approve or return submitted exam marks.
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
        title="Principal Marks Review"
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
              loadingReview ||
              actionLoading
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
      | Offline Warning
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
              Marks can still be reviewed from already loaded data, but approval and return actions are disabled until the connection returns.
            </p>
          </div>
        </div>
      )}

      {/*
      |--------------------------------------------------------------------------
      | General Error
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
              Unable to load marks review
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
                actionLoading
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
                  currentExam.status
                }
              />

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

              {currentExam
                ?.academicTerm && (
                <Badge
                  tone="neutral"
                >
                  {
                    currentExam
                      .academicTerm
                  }
                </Badge>
              )}
            </div>
          )}
        </div>

        {currentExam && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-slate-900">
                {currentExam
                  ?.examName}
              </h2>

              <p className="text-sm text-slate-500">
                {currentExam
                  ?.examCode ||
                  "No exam code"}
                {" · "}
                {currentExam
                  ?.academicYear ||
                  "Academic year not specified"}
              </p>
            </div>
          </div>
        )}
      </section>

      {/*
      |--------------------------------------------------------------------------
      | No Exam Selected
      |--------------------------------------------------------------------------
      */}

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
            Select an examination above to view all submitted, returned and approved subject mark sheets.
          </p>
        </div>
      ) : loadingReview ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({
              length:
                5
            }).map(
              (
                _,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className="card animate-pulse p-5"
                >
                  <div className="h-3 w-24 rounded bg-slate-100" />
                  <div className="mt-3 h-8 w-14 rounded bg-slate-100" />
                  <div className="mt-3 h-3 w-32 rounded bg-slate-100" />
                </div>
              )
            )}
          </div>

          <div className="card animate-pulse p-5">
            <div className="h-80 rounded-xl bg-slate-100" />
          </div>
        </div>
      ) : !review ? (
        <div className="card flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
          <AlertCircle
            size={
              42
            }
            className="text-rose-400"
          />

          <h2 className="mt-4 text-lg font-bold text-slate-800">
            Review Data Unavailable
          </h2>

          <button
            type="button"
            className="btn-secondary mt-5"
            onClick={
              () =>
                loadReview(
                  selectedExamId
                )
            }
          >
            <RefreshCw
              size={
                16
              }
            />

            Try Again
          </button>
        </div>
      ) : (
        <>
          {/*
          |--------------------------------------------------------------------------
          | Summary Cards
          |--------------------------------------------------------------------------
          */}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <SummaryCard
              icon={
                BookOpenCheck
              }
              label="Saved Sheets"
              value={
                overall.sheetCount ||
                0
              }
              help={`${totalStudentMarks} saved student marks`}
            />

            <SummaryCard
              icon={
                ClipboardCheck
              }
              label="Draft"
              value={
                overall.draft ||
                0
              }
              help="Still being prepared"
            />

            <SummaryCard
              icon={
                Send
              }
              label="Submitted"
              value={
                overall.submitted ||
                0
              }
              help="Waiting for review"
            />

            <SummaryCard
              icon={
                RotateCcw
              }
              label="Returned"
              value={
                overall.returned ||
                0
              }
              help="Sent back for correction"
            />

            <SummaryCard
              icon={
                FileCheck2
              }
              label="Approved"
              value={
                overall.approved ||
                0
              }
              help="Ready for result generation"
            />
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Workflow Notice
          |--------------------------------------------------------------------------
          */}

          {!examAllowsActions &&
            currentExam && (
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <ShieldCheck
                  size={
                    18
                  }
                  className="mt-0.5 shrink-0 text-slate-500"
                />

                <div>
                  <p className="font-semibold">
                    Review-only mode
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    This examination is currently in{" "}
                    <strong>
                      {
                        EXAM_STATUS_META[
                          currentExamStatus
                        ]?.label ||
                        currentExamStatus
                      }
                    </strong>{" "}
                    status. Marks can be viewed, but sheet approval and return actions are no longer available at this stage.
                  </p>
                </div>
              </div>
            )}

          {/*
          |--------------------------------------------------------------------------
          | Sheets List
          |--------------------------------------------------------------------------
          */}

          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Subject Mark Sheets
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Review class, section and subject submissions for the selected examination.
                  </p>
                </div>

                <div className="grid w-full gap-2 sm:grid-cols-[minmax(220px,1fr)_180px] lg:w-auto">
                  <div className="relative">
                    <Search
                      size={
                        16
                      }
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="search"
                      className="field-input min-w-[240px] pl-9"
                      placeholder="Search class or subject..."
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

                  <select
                    className="field-select"
                    value={
                      statusFilter
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setStatusFilter(
                          event.target
                            .value
                        )
                    }
                  >
                    <option value="">
                      All Statuses
                    </option>

                    <option value="draft">
                      Draft
                    </option>

                    <option value="mixed">
                      In Progress
                    </option>

                    <option value="submitted">
                      Submitted
                    </option>

                    <option value="returned">
                      Returned
                    </option>

                    <option value="approved">
                      Approved
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {filteredSheets.length ===
            0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <BookOpenCheck
                  size={
                    40
                  }
                  className="text-slate-300"
                />

                <h3 className="mt-3 text-sm font-semibold text-slate-700">
                  No saved mark sheets found
                </h3>

                <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                  This review endpoint displays mark sheets after StudentMark records have been saved. There are currently no matching saved sheets for this examination.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Class / Section
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Subject
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Students
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Completed
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Submitted
                      </th>

                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredSheets.map(
                      (
                        sheet
                      ) => {
                        const status =
                          getSheetStatus(
                            sheet
                          );

                        const active =
                          getSheetKey(
                            selectedSheet
                          ) ===
                          getSheetKey(
                            sheet
                          );

                        return (
                          <tr
                            key={
                              getSheetKey(
                                sheet
                              )
                            }
                            className={
                              active
                                ? "bg-brand-50/40"
                                : "bg-white hover:bg-slate-50/70"
                            }
                          >
                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-800">
                                {getClassName(
                                  sheet
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Section{" "}
                                {sheet.sectionName ||
                                  "—"}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p className="font-semibold text-slate-800">
                                {getSubjectName(
                                  sheet
                                )}
                              </p>

                              {getSubjectCode(
                                sheet
                              ) && (
                                <p className="mt-1 text-xs text-slate-400">
                                  {getSubjectCode(
                                    sheet
                                  )}
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-4 text-slate-600">
                              {sheet
                                ?.summary
                                ?.total ||
                                0}
                            </td>

                            <td className="px-4 py-4">
                              <span className="font-semibold text-emerald-700">
                                {sheet
                                  ?.summary
                                  ?.completed ||
                                  0}
                              </span>

                              {sheet
                                ?.summary
                                ?.pending >
                                0 && (
                                <span className="ml-2 text-xs text-amber-600">
                                  {
                                    sheet
                                      .summary
                                      .pending
                                  }{" "}
                                  pending
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-xs text-slate-500">
                              {sheet.submittedAt
                                ? formatDateTime(
                                    sheet.submittedAt
                                  )
                                : "Not submitted"}
                            </td>

                            <td className="px-4 py-4">
                              <SheetStatusBadge
                                status={
                                  status
                                }
                              />

                              {sheet.returnReason && (
                                <p
                                  className="mt-1 max-w-[180px] truncate text-[11px] text-rose-500"
                                  title={
                                    sheet.returnReason
                                  }
                                >
                                  {
                                    sheet.returnReason
                                  }
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={
                                  () =>
                                    selectSheet(
                                      sheet
                                    )
                                }
                              >
                                <Eye
                                  size={
                                    15
                                  }
                                />

                                Review
                              </button>
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
          | Selected Mark Sheet Detail
          |--------------------------------------------------------------------------
          */}

          {selectedSheet && (
            <section className="space-y-4">
              <div className="card p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">
                        {getSubjectName(
                          selectedSheet
                        )}
                      </h2>

                      <SheetStatusBadge
                        status={
                          selectedSheetStatus
                        }
                      />
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {getClassName(
                        selectedSheet
                      )}
                      {" · Section "}
                      {selectedSheet.sectionName ||
                        "—"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span>
                        Student Marks:{" "}
                        <strong className="text-slate-700">
                          {selectedSheet
                            ?.summary
                            ?.total ||
                            0}
                        </strong>
                      </span>

                      <span>
                        Completed:{" "}
                        <strong className="text-slate-700">
                          {selectedSheet
                            ?.summary
                            ?.completed ||
                            0}
                        </strong>
                      </span>

                      <span>
                        Pending:{" "}
                        <strong className="text-slate-700">
                          {selectedSheet
                            ?.summary
                            ?.pending ||
                            0}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={
                        () => {
                          setReturnReason(
                            ""
                          );

                          setReturnOpen(
                            true
                          );
                        }
                      }
                      disabled={
                        !canReturn ||
                        !online ||
                        actionLoading
                      }
                    >
                      <RotateCcw
                        size={
                          16
                        }
                      />

                      Return
                    </button>

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
                        !online ||
                        actionLoading
                      }
                    >
                      <CheckCircle2
                        size={
                          16
                        }
                      />

                      Approve
                    </button>
                  </div>
                </div>

                {selectedSheet.returnReason && (
                  <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                      Previous Return Reason
                    </p>

                    <p className="mt-2 text-sm leading-6 text-rose-800">
                      {selectedSheet.returnReason}
                    </p>
                  </div>
                )}

                {selectedSheetStatus ===
                  "draft" ||
                selectedSheetStatus ===
                  "mixed" ? (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    This sheet cannot be approved yet. All student mark records must first be submitted by the teacher.
                  </div>
                ) : null}

                {selectedSheetStatus ===
                  "approved" && (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    This subject mark sheet has already been approved and is eligible for result generation.
                  </div>
                )}
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Loading Sheet
              |--------------------------------------------------------------------------
              */}

              {loadingSheet ? (
                <div className="card animate-pulse p-5">
                  <div className="h-96 rounded-xl bg-slate-100" />
                </div>
              ) : !markSheet ? (
                <div className="card flex min-h-64 flex-col items-center justify-center p-6 text-center">
                  <AlertCircle
                    size={
                      36
                    }
                    className="text-rose-400"
                  />

                  <p className="mt-3 font-semibold text-slate-700">
                    Mark sheet details could not be loaded.
                  </p>

                  <button
                    type="button"
                    className="btn-secondary mt-4"
                    onClick={
                      () =>
                        loadSheet(
                          selectedSheet
                        )
                    }
                  >
                    <RefreshCw
                      size={
                        15
                      }
                    />

                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {/*
                  |--------------------------------------------------------------------------
                  | Assessment Summary
                  |--------------------------------------------------------------------------
                  */}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Maximum Marks
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-800">
                        {formatNumber(
                          overallMax
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Passing Marks
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-800">
                        {formatNumber(
                          passingMarks
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Saved Marks
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-800">
                        {markSheet
                          ?.summary
                          ?.savedMarkCount ||
                          0}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Active Students
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-800">
                        {markSheet
                          ?.summary
                          ?.activeStudentCount ||
                          markRows.length}
                      </p>
                    </div>
                  </div>

                  {/*
                  |--------------------------------------------------------------------------
                  | Students Table
                  |--------------------------------------------------------------------------
                  */}

                  <div className="card overflow-hidden">
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Student Mark Details
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Read-only marks submitted for management review.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <UsersRound
                          size={
                            16
                          }
                        />

                        {markRows.length} Students
                      </div>
                    </div>

                    {markRows.length ===
                    0 ? (
                      <div className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
                        <UsersRound
                          size={
                            36
                          }
                          className="text-slate-300"
                        />

                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          No student marks available
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-left text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="sticky left-0 z-10 min-w-[220px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Student
                              </th>

                              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Attendance
                              </th>

                              {showTheory && (
                                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Theory
                                  <span className="ml-1 normal-case text-slate-400">
                                    /{formatNumber(
                                      theoryMax
                                    )}
                                  </span>
                                </th>
                              )}

                              {showPractical && (
                                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Practical
                                  <span className="ml-1 normal-case text-slate-400">
                                    /{formatNumber(
                                      practicalMax
                                    )}
                                  </span>
                                </th>
                              )}

                              {showInternal && (
                                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Internal
                                  <span className="ml-1 normal-case text-slate-400">
                                    /{formatNumber(
                                      internalMax
                                    )}
                                  </span>
                                </th>
                              )}

                              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Grace
                              </th>

                              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Deduction
                              </th>

                              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Final
                              </th>

                              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Percentage
                              </th>

                              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Result
                              </th>

                              <th className="min-w-[200px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Teacher Remarks
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {markRows.map(
                              (
                                row,
                                index
                              ) => {
                                const student =
                                  row?.student ||
                                  {};

                                const mark =
                                  row?.mark ||
                                  {};

                                const scores =
                                  mark?.scores ||
                                  {};

                                const studentName =
                                  getStudentName(
                                    student
                                  );

                                return (
                                  <tr
                                    key={
                                      getRecordId(
                                        student
                                      ) ||
                                      index
                                    }
                                    className="bg-white align-top hover:bg-slate-50/60"
                                  >
                                    <td className="sticky left-0 z-[5] bg-inherit px-4 py-3">
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">
                                          {getInitials(
                                            studentName
                                          )}
                                        </div>

                                        <div className="min-w-0">
                                          <p className="max-w-[165px] truncate font-semibold text-slate-800">
                                            {studentName}
                                          </p>

                                          <p className="mt-0.5 text-[11px] text-slate-400">
                                            Roll:{" "}
                                            {student.rollNumber ||
                                              mark.studentRollNumber ||
                                              "—"}
                                            {" · "}
                                            Adm:{" "}
                                            {student.admissionNumber ||
                                              mark.studentAdmissionNumber ||
                                              "—"}
                                          </p>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="px-3 py-3 capitalize text-slate-600">
                                      {normalizeText(
                                        mark.attendanceStatus ||
                                          "present"
                                      ).replaceAll(
                                        "_",
                                        " "
                                      )}
                                    </td>

                                    {showTheory && (
                                      <td className="px-3 py-3 font-semibold text-slate-700">
                                        {formatNumber(
                                          scores.theoryMarks
                                        )}
                                      </td>
                                    )}

                                    {showPractical && (
                                      <td className="px-3 py-3 font-semibold text-slate-700">
                                        {formatNumber(
                                          scores.practicalMarks
                                        )}
                                      </td>
                                    )}

                                    {showInternal && (
                                      <td className="px-3 py-3 font-semibold text-slate-700">
                                        {formatNumber(
                                          scores.internalMarks
                                        )}
                                      </td>
                                    )}

                                    <td className="px-3 py-3 text-slate-600">
                                      {formatNumber(
                                        scores.graceMarks
                                      )}
                                    </td>

                                    <td className="px-3 py-3 text-slate-600">
                                      {formatNumber(
                                        scores.deductionMarks
                                      )}
                                    </td>

                                    <td className="px-3 py-3">
                                      <span className="font-bold text-slate-900">
                                        {formatNumber(
                                          scores.finalObtainedMarks
                                        )}
                                      </span>

                                      <span className="ml-1 text-xs text-slate-400">
                                        /{formatNumber(
                                          overallMax
                                        )}
                                      </span>
                                    </td>

                                    <td className="px-3 py-3 font-semibold text-slate-700">
                                      {formatNumber(
                                        scores.percentage
                                      )}
                                      %
                                    </td>

                                    <td className="px-3 py-3">
                                      <ResultStatusBadge
                                        status={
                                          mark.resultStatus ||
                                          "pending"
                                        }
                                      />

                                      {mark
                                        ?.grade
                                        ?.grade && (
                                        <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                          Grade{" "}
                                          {
                                            mark
                                              .grade
                                              .grade
                                          }
                                        </p>
                                      )}
                                    </td>

                                    <td className="px-3 py-3">
                                      <p className="max-w-[240px] whitespace-pre-wrap text-xs leading-5 text-slate-600">
                                        {mark.teacherRemarks ||
                                          "—"}
                                      </p>
                                    </td>
                                  </tr>
                                );
                              }
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div>
                        Grade Scheme:{" "}
                        <strong className="text-slate-700">
                          {markSheet
                            ?.gradeScheme
                            ?.schemeName ||
                            "Not assigned"}
                        </strong>
                      </div>

                      <div>
                        Sheet Status:{" "}
                        <strong className="text-slate-700">
                          {
                            SHEET_STATUS_META[
                              markSheet
                                ?.summary
                                ?.sheetStatus
                            ]?.label ||
                            markSheet
                              ?.summary
                              ?.sheetStatus ||
                            "Unknown"
                          }
                        </strong>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}

      {/*
      |--------------------------------------------------------------------------
      | Approve Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={
          approveOpen
        }
        onClose={
          () => {
            if (
              actionLoading
            ) {
              return;
            }

            setApproveOpen(
              false
            );
          }
        }
        title="Approve Mark Sheet"
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
                Approve this subject mark sheet?
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-700">
                Approved marks become eligible for the next result-generation stage.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <p className="font-semibold text-slate-800">
              {getSubjectName(
                selectedSheet
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {getClassName(
                selectedSheet
              )}
              {" · Section "}
              {selectedSheet
                ?.sectionName ||
                "—"}
            </p>
          </div>

          <div>
            <label className="field-label">
              Review Remarks
            </label>

            <textarea
              className="field-input min-h-28 resize-y"
              placeholder="Optional remarks about this mark sheet..."
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
                actionLoading
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
                actionLoading
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
                actionLoading ||
                !online ||
                !canApprove
              }
            >
              {actionLoading ? (
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

              {actionLoading
                ? "Approving..."
                : "Approve Mark Sheet"}
            </button>
          </div>
        </div>
      </Modal>

      {/*
      |--------------------------------------------------------------------------
      | Return Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={
          returnOpen
        }
        onClose={
          () => {
            if (
              actionLoading
            ) {
              return;
            }

            setReturnOpen(
              false
            );
          }
        }
        title="Return Mark Sheet for Correction"
        width="max-w-xl"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <RotateCcw
              size={
                20
              }
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <p className="text-sm font-semibold text-amber-900">
                Return this mark sheet to the teacher?
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                The teacher will be able to correct the marks and submit the complete sheet again.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <p className="font-semibold text-slate-800">
              {getSubjectName(
                selectedSheet
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {getClassName(
                selectedSheet
              )}
              {" · Section "}
              {selectedSheet
                ?.sectionName ||
                "—"}
            </p>
          </div>

          <div>
            <label className="field-label">
              Return Reason
              <span className="ml-1 text-rose-500">
                *
              </span>
            </label>

            <textarea
              className="field-input min-h-32 resize-y"
              placeholder="Explain clearly what the teacher needs to correct..."
              maxLength={
                1000
              }
              value={
                returnReason
              }
              onChange={
                (
                  event
                ) =>
                  setReturnReason(
                    event.target
                      .value
                  )
              }
              disabled={
                actionLoading
              }
            />

            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                A return reason is required.
              </p>

              <p className="text-xs text-slate-400">
                {returnReason.length}
                /1000
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={
                () =>
                  setReturnOpen(
                    false
                  )
              }
              disabled={
                actionLoading
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={
                handleReturn
              }
              disabled={
                actionLoading ||
                !online ||
                !canReturn ||
                !normalizeText(
                  returnReason
                )
              }
            >
              {actionLoading ? (
                <Loader2
                  size={
                    16
                  }
                  className="animate-spin"
                />
              ) : (
                <RotateCcw
                  size={
                    16
                  }
                />
              )}

              {actionLoading
                ? "Returning..."
                : "Return for Correction"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PrincipalMarksReview;