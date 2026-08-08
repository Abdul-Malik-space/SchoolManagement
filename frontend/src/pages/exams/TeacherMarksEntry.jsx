import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Send,
  UsersRound,
  XCircle
} from "lucide-react";

import {
  getMarkSheet,
  getMarkWorkspaces,
  saveMarkSheet,
  submitMarkSheet
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
| Allowed Roles
|--------------------------------------------------------------------------
*/

const ALLOWED_ROLES = [
  "super_admin",
  "principal",
  "teacher"
];

/*
|--------------------------------------------------------------------------
| Attendance Options
|--------------------------------------------------------------------------
*/

const ATTENDANCE_OPTIONS = [
  {
    value:
      "present",
    label:
      "Present"
  },
  {
    value:
      "absent",
    label:
      "Absent"
  },
  {
    value:
      "medical_leave",
    label:
      "Medical Leave"
  },
  {
    value:
      "approved_leave",
    label:
      "Approved Leave"
  },
  {
    value:
      "exempted",
    label:
      "Exempted"
  },
  {
    value:
      "withheld",
    label:
      "Withheld"
  }
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
  },

  mixed: {
    label:
      "In Progress",
    tone:
      "warning"
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

  return String(value);
};

const toNumber = (
  value,
  fallback = 0
) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

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
    return "Not set";
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
    return "Not set";
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

const getSheetStatusMeta = (
  status
) => {
  return (
    SHEET_STATUS_META[
      status
    ] ||
    {
      label:
        normalizeText(
          status
        ) ||
        "Unknown",
      tone:
        "neutral"
    }
  );
};

const getResultStatusMeta = (
  status
) => {
  return (
    RESULT_STATUS_META[
      status
    ] ||
    {
      label:
        normalizeText(
          status
        ) ||
        "Pending",
      tone:
        "neutral"
    }
  );
};

const getWorkspaceKey = (
  workspace
) => {
  return [
    getRecordId(
      workspace?.examId
    ),
    getRecordId(
      workspace?.classId
    ),
    normalizeText(
      workspace?.sectionName
    ),
    getRecordId(
      workspace?.subjectId
    )
  ].join(
    ":"
  );
};

const getWorkspaceIdentity = (
  workspace
) => {
  return {
    examId:
      getRecordId(
        workspace?.examId
      ),

    classId:
      getRecordId(
        workspace?.classId
      ),

    sectionName:
      normalizeText(
        workspace?.sectionName
      ),

    subjectId:
      getRecordId(
        workspace?.subjectId
      )
  };
};

/*
|--------------------------------------------------------------------------
| Build Editor Rows
|--------------------------------------------------------------------------
*/

const buildEditorRows = (
  rows = []
) => {
  return rows.map(
    (
      row
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

      const flags =
        mark?.entryFlags ||
        {};

      const isNew =
        Boolean(
          mark?.isNew ||
          !mark?._id
        );

      return {
        student,

        studentId:
          getRecordId(
            student
          ) ||
          getRecordId(
            mark?.studentId
          ),

        markId:
          getRecordId(
            mark
          ),

        attendanceStatus:
          mark?.attendanceStatus ||
          "present",

        theoryMarks:
          !isNew &&
          flags.theoryEntered
            ? String(
                scores
                  ?.theoryMarks ??
                ""
              )
            : "",

        practicalMarks:
          !isNew &&
          flags.practicalEntered
            ? String(
                scores
                  ?.practicalMarks ??
                ""
              )
            : "",

        internalMarks:
          !isNew &&
          flags.internalEntered
            ? String(
                scores
                  ?.internalMarks ??
                ""
              )
            : "",

        graceMarks:
          !isNew
            ? String(
                scores
                  ?.graceMarks ??
                0
              )
            : "",

        deductionMarks:
          !isNew
            ? String(
                scores
                  ?.deductionMarks ??
                0
              )
            : "",

        teacherRemarks:
          mark?.teacherRemarks ||
          "",

        status:
          mark?.status ||
          "draft",

        resultStatus:
          mark?.resultStatus ||
          "pending",

        grade:
          mark?.grade ||
          {},

        savedScores:
          scores,

        isNew
      };
    }
  );
};

/*
|--------------------------------------------------------------------------
| Workspace Status Badge
|--------------------------------------------------------------------------
*/

const SheetStatusBadge = ({
  status
}) => {
  const meta =
    getSheetStatusMeta(
      status
    );

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
| Result Status Badge
|--------------------------------------------------------------------------
*/

const ResultStatusBadge = ({
  status
}) => {
  const meta =
    getResultStatusMeta(
      status
    );

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

      return () => {
        window.clearTimeout(
          timeout
        );
      };
    },
    [
      toast,
      onClose
    ]
  );

  if (!toast) {
    return null;
  }

  const error =
    toast.type ===
    "error";

  return (
    <div className="fixed right-4 top-4 z-[70] w-[calc(100%-2rem)] max-w-sm">
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl ${
          error
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}
      >
        {error ? (
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
            {error
              ? "Action failed"
              : "Success"}
          </p>

          <p className="mt-1 text-xs leading-5">
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
          onClick={
            onClose
          }
        >
          <XCircle
            size={
              16
            }
          />
        </button>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Teacher Marks Entry
|--------------------------------------------------------------------------
*/

const TeacherMarksEntry = () => {
  const {
    user
  } =
    useAuth();

  const role =
    normalizeRole(
      user?.role
    );

  const canAccess =
    ALLOWED_ROLES.includes(
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
    workspaces,
    setWorkspaces
  ] =
    useState([]);

  const [
    selectedWorkspace,
    setSelectedWorkspace
  ] =
    useState(
      null
    );

  const [
    sheet,
    setSheet
  ] =
    useState(
      null
    );

  const [
    rows,
    setRows
  ] =
    useState([]);

  const [
    workspaceLoading,
    setWorkspaceLoading
  ] =
    useState(
      true
    );

  const [
    sheetLoading,
    setSheetLoading
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
    saving,
    setSaving
  ] =
    useState(
      false
    );

  const [
    submitting,
    setSubmitting
  ] =
    useState(
      false
    );

  const [
    dirty,
    setDirty
  ] =
    useState(
      false
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
    academicYear,
    setAcademicYear
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

  const [
    submitOpen,
    setSubmitOpen
  ] =
    useState(
      false
    );

  const workspaceAbortRef =
    useRef(
      null
    );

  const sheetAbortRef =
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
  | Load Workspaces
  |--------------------------------------------------------------------------
  */

  const loadWorkspaces =
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
          setWorkspaceLoading(
            false
          );

          return;
        }

        workspaceAbortRef
          .current
          ?.abort();

        const controller =
          new AbortController();

        workspaceAbortRef.current =
          controller;

        if (silent) {
          setRefreshing(
            true
          );
        } else {
          setWorkspaceLoading(
            true
          );
        }

        setError(
          ""
        );

        try {
          const response =
            await getMarkWorkspaces(
              {
                academicYear:
                  academicYear ||
                  undefined
              },
              {
                signal:
                  controller.signal
              }
            );

          const payload =
            response?.data ??
            response;

          const list =
            Array.isArray(
              payload
                ?.workspaces
            )
              ? payload
                  .workspaces
              : [];

          setWorkspaces(
            list
          );

          setSelectedWorkspace(
            (
              current
            ) => {
              if (
                !list.length
              ) {
                return null;
              }

              if (
                !current
              ) {
                return list[0];
              }

              const currentKey =
                getWorkspaceKey(
                  current
                );

              return (
                list.find(
                  (
                    item
                  ) =>
                    getWorkspaceKey(
                      item
                    ) ===
                    currentKey
                ) ||
                list[0]
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

          setWorkspaces(
            []
          );

          setSelectedWorkspace(
            null
          );

          setSheet(
            null
          );

          setRows(
            []
          );

          setError(
            getErrorMessage(
              requestError,
              "Marks workspaces could not be loaded."
            )
          );
        } finally {
          if (
            workspaceAbortRef
              .current ===
            controller
          ) {
            setWorkspaceLoading(
              false
            );

            setRefreshing(
              false
            );
          }
        }
      },
      [
        academicYear,
        canAccess
      ]
    );

  useEffect(
    () => {
      loadWorkspaces();

      return () => {
        workspaceAbortRef
          .current
          ?.abort();
      };
    },
    [
      loadWorkspaces
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Load Mark Sheet
  |--------------------------------------------------------------------------
  */

  const loadSheet =
    useCallback(
      async (
        workspace
      ) => {
        if (
          !workspace
        ) {
          setSheet(
            null
          );

          setRows(
            []
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

        setSheetLoading(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await getMarkSheet(
              getWorkspaceIdentity(
                workspace
              ),
              {
                signal:
                  controller.signal
              }
            );

          const payload =
            response?.data ??
            response;

          setSheet(
            payload
          );

          setRows(
            buildEditorRows(
              payload?.rows ||
              []
            )
          );

          setDirty(
            false
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

          setSheet(
            null
          );

          setRows(
            []
          );

          setError(
            getErrorMessage(
              requestError,
              "Mark sheet could not be loaded."
            )
          );
        } finally {
          if (
            sheetAbortRef
              .current ===
            controller
          ) {
            setSheetLoading(
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
        !selectedWorkspace
      ) {
        setSheet(
          null
        );

        setRows(
          []
        );

        return undefined;
      }

      loadSheet(
        selectedWorkspace
      );

      return () => {
        sheetAbortRef
          .current
          ?.abort();
      };
    },
    [
      loadSheet,
      selectedWorkspace
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Derived Workspace Data
  |--------------------------------------------------------------------------
  */

  const filteredWorkspaces =
    useMemo(
      () => {
        const query =
          normalizeText(
            search
          ).toLowerCase();

        return workspaces.filter(
          (
            workspace
          ) => {
            const sheetStatus =
              workspace
                ?.summary
                ?.sheetStatus ||
              "not_started";

            if (
              statusFilter &&
              sheetStatus !==
                statusFilter
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            const searchable =
              [
                workspace
                  ?.examName,
                workspace
                  ?.examCode,
                workspace
                  ?.className,
                workspace
                  ?.sectionName,
                workspace
                  ?.subjectName,
                workspace
                  ?.subjectCode,
                workspace
                  ?.academicYear
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
        statusFilter,
        workspaces
      ]
    );

  const workspaceSummary =
    useMemo(
      () => {
        return workspaces.reduce(
          (
            summary,
            workspace
          ) => {
            summary.total +=
              1;

            const status =
              workspace
                ?.summary
                ?.sheetStatus ||
              "not_started";

            if (
              status ===
              "approved"
            ) {
              summary.approved +=
                1;
            } else if (
              status ===
              "submitted"
            ) {
              summary.submitted +=
                1;
            } else if (
              status ===
              "returned"
            ) {
              summary.returned +=
                1;
            } else if (
              status ===
              "draft" ||
              status ===
              "mixed"
            ) {
              summary.draft +=
                1;
            } else {
              summary.notStarted +=
                1;
            }

            return summary;
          },
          {
            total:
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
          }
        );
      },
      [
        workspaces
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Assessment Rule
  |--------------------------------------------------------------------------
  */

  const assessmentRule =
    sheet
      ?.assessmentRule ||
    selectedWorkspace
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

  const graceLimit =
    toNumber(
      assessmentRule
        ?.graceMarksLimit
    );

  const allowGrace =
    Boolean(
      assessmentRule
        ?.allowGraceMarks
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

  /*
  |--------------------------------------------------------------------------
  | Sheet Editability
  |--------------------------------------------------------------------------
  */

  const editable =
    Boolean(
      sheet
        ?.editable
    );

  /*
  |--------------------------------------------------------------------------
  | Row Update
  |--------------------------------------------------------------------------
  */

  const updateRow =
    (
      studentId,
      field,
      value
    ) => {
      if (
        !editable ||
        saving ||
        submitting
      ) {
        return;
      }

      setRows(
        (
          currentRows
        ) =>
          currentRows.map(
            (
              row
            ) => {
              if (
                row.studentId !==
                studentId
              ) {
                return row;
              }

              if (
                field ===
                "attendanceStatus"
              ) {
                const present =
                  value ===
                  "present";

                return {
                  ...row,

                  attendanceStatus:
                    value,

                  theoryMarks:
                    present
                      ? row
                          .theoryMarks
                      : "",

                  practicalMarks:
                    present
                      ? row
                          .practicalMarks
                      : "",

                  internalMarks:
                    present
                      ? row
                          .internalMarks
                      : "",

                  graceMarks:
                    present
                      ? row
                          .graceMarks
                      : "",

                  deductionMarks:
                    present
                      ? row
                          .deductionMarks
                      : ""
                };
              }

              return {
                ...row,
                [field]:
                  value
              };
            }
          )
      );

      setDirty(
        true
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Validation
  |--------------------------------------------------------------------------
  */

  const validateNumericValue =
    (
      value,
      maximum,
      label,
      studentName,
      {
        allowBlank =
          true
      } = {}
    ) => {
      if (
        value === ""
      ) {
        if (
          allowBlank
        ) {
          return "";
        }

        return `${label} are required for ${studentName}.`;
      }

      const number =
        Number(value);

      if (
        !Number.isFinite(
          number
        )
      ) {
        return `${label} must be a valid number for ${studentName}.`;
      }

      if (
        number <
        0
      ) {
        return `${label} cannot be negative for ${studentName}.`;
      }

      if (
        Number.isFinite(
          Number(
            maximum
          )
        ) &&
        number >
          Number(
            maximum
          )
      ) {
        return `${label} cannot exceed ${maximum} for ${studentName}.`;
      }

      return "";
    };

  const validateRows =
    (
      {
        requireComplete =
          false
      } = {}
    ) => {
      if (
        rows.length ===
        0
      ) {
        return "There are no students in this mark sheet.";
      }

      for (
        const row
        of rows
      ) {
        if (
          !row.studentId
        ) {
          return "One of the student records is missing its ID.";
        }

        const studentName =
          getStudentName(
            row.student
          );

        if (
          row.attendanceStatus !==
          "present"
        ) {
          continue;
        }

        if (
          showTheory
        ) {
          const validation =
            validateNumericValue(
              row.theoryMarks,
              theoryMax,
              "Theory marks",
              studentName,
              {
                allowBlank:
                  !requireComplete
              }
            );

          if (
            validation
          ) {
            return validation;
          }
        }

        if (
          showPractical
        ) {
          const validation =
            validateNumericValue(
              row.practicalMarks,
              practicalMax,
              "Practical marks",
              studentName,
              {
                allowBlank:
                  !requireComplete
              }
            );

          if (
            validation
          ) {
            return validation;
          }
        }

        if (
          showInternal
        ) {
          const validation =
            validateNumericValue(
              row.internalMarks,
              internalMax,
              "Internal marks",
              studentName,
              {
                allowBlank:
                  !requireComplete
              }
            );

          if (
            validation
          ) {
            return validation;
          }
        }

        if (
          allowGrace &&
          row.graceMarks !==
            ""
        ) {
          const validation =
            validateNumericValue(
              row.graceMarks,
              graceLimit,
              "Grace marks",
              studentName
            );

          if (
            validation
          ) {
            return validation;
          }
        }

        if (
          row.deductionMarks !==
          ""
        ) {
          const validation =
            validateNumericValue(
              row.deductionMarks,
              overallMax,
              "Deduction marks",
              studentName
            );

          if (
            validation
          ) {
            return validation;
          }
        }
      }

      return "";
    };

  /*
  |--------------------------------------------------------------------------
  | Completion State
  |--------------------------------------------------------------------------
  */

  const incompleteStudentCount =
    useMemo(
      () => {
        return rows.filter(
          (
            row
          ) => {
            if (
              row.attendanceStatus !==
              "present"
            ) {
              return false;
            }

            if (
              showTheory &&
              row.theoryMarks ===
                ""
            ) {
              return true;
            }

            if (
              showPractical &&
              row.practicalMarks ===
                ""
            ) {
              return true;
            }

            if (
              showInternal &&
              row.internalMarks ===
                ""
            ) {
              return true;
            }

            return false;
          }
        ).length;
      },
      [
        rows,
        showInternal,
        showPractical,
        showTheory
      ]
    );

  const sheetComplete =
    rows.length >
      0 &&
    incompleteStudentCount ===
      0;

  /*
  |--------------------------------------------------------------------------
  | Build Save Payload
  |--------------------------------------------------------------------------
  */

  const buildSavePayload =
    () => {
      return {
        ...getWorkspaceIdentity(
          selectedWorkspace
        ),

        rows:
          rows.map(
            (
              row
            ) => ({
              studentId:
                row.studentId,

              attendanceStatus:
                row.attendanceStatus,

              theoryMarks:
                row.attendanceStatus ===
                "present"
                  ? row.theoryMarks
                  : "",

              practicalMarks:
                row.attendanceStatus ===
                "present"
                  ? row
                      .practicalMarks
                  : "",

              internalMarks:
                row.attendanceStatus ===
                "present"
                  ? row
                      .internalMarks
                  : "",

              graceMarks:
                row.attendanceStatus ===
                  "present" &&
                allowGrace
                  ? row
                      .graceMarks
                  : "",

              deductionMarks:
                row.attendanceStatus ===
                "present"
                  ? row
                      .deductionMarks
                  : "",

              teacherRemarks:
                row
                  .teacherRemarks
            })
          )
      };
    };

  /*
  |--------------------------------------------------------------------------
  | Save Draft
  |--------------------------------------------------------------------------
  */

  const handleSave =
    async (
      {
        silentSuccess =
          false
      } = {}
    ) => {
      if (
        !selectedWorkspace
      ) {
        return false;
      }

      if (
        !online
      ) {
        setToast({
          type:
            "error",
          message:
            "You are offline. Reconnect before saving marks."
        });

        return false;
      }

      if (
        !editable
      ) {
        setToast({
          type:
            "error",
          message:
            "This mark sheet is currently read-only."
        });

        return false;
      }

      const validation =
        validateRows({
          requireComplete:
            false
        });

      if (
        validation
      ) {
        setToast({
          type:
            "error",
          message:
            validation
        });

        return false;
      }

      setSaving(
        true
      );

      setError(
        ""
      );

      try {
        const response =
          await saveMarkSheet(
            buildSavePayload()
          );

        setDirty(
          false
        );

        if (
          !silentSuccess
        ) {
          setToast({
            type:
              "success",
            message:
              response
                ?.message ||
              "Student marks saved successfully."
          });
        }

        await loadSheet(
          selectedWorkspace
        );

        await loadWorkspaces({
          silent:
            true
        });

        return true;
      } catch (
        requestError
      ) {
        setToast({
          type:
            "error",
          message:
            getErrorMessage(
              requestError,
              "Student marks could not be saved."
            )
        });

        return false;
      } finally {
        setSaving(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Submit Sheet
  |--------------------------------------------------------------------------
  */

  const openSubmitDialog =
    () => {
      const validation =
        validateRows({
          requireComplete:
            true
        });

      if (
        validation
      ) {
        setToast({
          type:
            "error",
          message:
            validation
        });

        return;
      }

      setSubmitOpen(
        true
      );
    };

  const handleSubmit =
    async () => {
      if (
        !selectedWorkspace ||
        !editable
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
            "You are offline. Reconnect before submitting marks."
        });

        return;
      }

      const validation =
        validateRows({
          requireComplete:
            true
        });

      if (
        validation
      ) {
        setSubmitOpen(
          false
        );

        setToast({
          type:
            "error",
          message:
            validation
        });

        return;
      }

      setSubmitting(
        true
      );

      setError(
        ""
      );

      try {
        /*
        |--------------------------------------------------------------------------
        | Save Latest Values First
        |--------------------------------------------------------------------------
        */

        await saveMarkSheet(
          buildSavePayload()
        );

        /*
        |--------------------------------------------------------------------------
        | Submit Complete Sheet
        |--------------------------------------------------------------------------
        */

        const response =
          await submitMarkSheet(
            getWorkspaceIdentity(
              selectedWorkspace
            )
          );

        setDirty(
          false
        );

        setSubmitOpen(
          false
        );

        setToast({
          type:
            "success",
          message:
            response
              ?.message ||
            "Mark sheet submitted for Principal review."
        });

        await loadSheet(
          selectedWorkspace
        );

        await loadWorkspaces({
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
              "Mark sheet could not be submitted."
            )
        });
      } finally {
        setSubmitting(
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
      if (
        dirty
      ) {
        const confirmed =
          window.confirm(
            "You have unsaved changes. Refreshing will discard them. Continue?"
          );

        if (
          !confirmed
        ) {
          return;
        }
      }

      await loadWorkspaces({
        silent:
          true
      });

      if (
        selectedWorkspace
      ) {
        await loadSheet(
          selectedWorkspace
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Workspace Selection
  |--------------------------------------------------------------------------
  */

  const selectWorkspace =
    (
      workspace
    ) => {
      const currentKey =
        getWorkspaceKey(
          selectedWorkspace
        );

      const nextKey =
        getWorkspaceKey(
          workspace
        );

      if (
        currentKey ===
        nextKey
      ) {
        return;
      }

      if (
        dirty
      ) {
        const confirmed =
          window.confirm(
            "You have unsaved marks. Changing the workspace will discard those changes. Continue?"
          );

        if (
          !confirmed
        ) {
          return;
        }
      }

      setSelectedWorkspace(
        workspace
      );

      setDirty(
        false
      );
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
          title="Teacher Marks Entry"
        />

        <div className="card flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <AlertCircle
            size={
              40
            }
            className="text-rose-500"
          />

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Access Denied
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Your account does not have permission to access administrative exam marks entry.
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
        title="Teacher Marks Entry"
        action={
          <button
            type="button"
            className="btn-secondary"
            onClick={
              handleRefresh
            }
            disabled={
              refreshing ||
              workspaceLoading ||
              saving ||
              submitting
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

            <p className="mt-0.5 text-xs leading-5">
              Existing information can remain visible, but marks cannot be saved or submitted until the connection returns.
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

          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Unable to load exam marks
            </p>

            <p className="mt-1 text-xs leading-5">
              {error}
            </p>
          </div>
        </div>
      )}

      {/*
      |--------------------------------------------------------------------------
      | Summary
      |--------------------------------------------------------------------------
      */}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={
            BookOpenCheck
          }
          label="Assigned Sheets"
          value={
            workspaceSummary.total
          }
          help="Available marks workspaces"
        />

        <SummaryCard
          icon={
            ClipboardCheck
          }
          label="In Progress"
          value={
            workspaceSummary.draft +
            workspaceSummary.returned
          }
          help={`${workspaceSummary.returned} returned for correction`}
        />

        <SummaryCard
          icon={
            Send
          }
          label="Submitted"
          value={
            workspaceSummary.submitted
          }
          help="Waiting for Principal review"
        />

        <SummaryCard
          icon={
            FileCheck2
          }
          label="Approved"
          value={
            workspaceSummary.approved
          }
          help="Eligible for result generation"
        />
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Main Layout
      |--------------------------------------------------------------------------
      */}

      <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        {/*
        |--------------------------------------------------------------------------
        | Workspace Sidebar
        |--------------------------------------------------------------------------
        */}

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">
                  Mark Sheets
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Select an assigned subject
                </p>
              </div>

              <Badge
                tone="info"
              >
                {filteredWorkspaces.length}
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
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
                  placeholder="Search exam, class or subject..."
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

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  className="field-input"
                  placeholder="2026-2027"
                  value={
                    academicYear
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setAcademicYear(
                        event.target
                          .value
                      )
                  }
                />

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

                  <option value="not_started">
                    Not Started
                  </option>

                  <option value="draft">
                    Draft
                  </option>

                  <option value="returned">
                    Returned
                  </option>

                  <option value="submitted">
                    Submitted
                  </option>

                  <option value="approved">
                    Approved
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="max-h-[680px] overflow-y-auto p-3">
            {workspaceLoading ? (
              <div className="space-y-3">
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
                      className="animate-pulse rounded-xl border border-slate-100 p-4"
                    >
                      <div className="h-4 w-2/3 rounded bg-slate-100" />
                      <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
                      <div className="mt-3 h-6 w-20 rounded-full bg-slate-100" />
                    </div>
                  )
                )}
              </div>
            ) : filteredWorkspaces.length ===
              0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
                <BookOpenCheck
                  size={
                    36
                  }
                  className="text-slate-300"
                />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No mark sheets found
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  No assigned workspace matches the current filters.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWorkspaces.map(
                  (
                    workspace
                  ) => {
                    const active =
                      getWorkspaceKey(
                        selectedWorkspace
                      ) ===
                      getWorkspaceKey(
                        workspace
                      );

                    const status =
                      workspace
                        ?.summary
                        ?.sheetStatus ||
                      "not_started";

                    return (
                      <button
                        key={
                          getWorkspaceKey(
                            workspace
                          )
                        }
                        type="button"
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          active
                            ? "border-brand-200 bg-brand-50/70 shadow-sm"
                            : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                        }`}
                        onClick={
                          () =>
                            selectWorkspace(
                              workspace
                            )
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {workspace
                                ?.subjectName ||
                                "Subject"}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {workspace
                                ?.examName ||
                                "Exam"}
                            </p>
                          </div>

                          <SheetStatusBadge
                            status={
                              status
                            }
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {workspace
                              ?.className ||
                              "Class"}
                          </span>

                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            Section{" "}
                            {workspace
                              ?.sectionName ||
                              "-"}
                          </span>

                          {workspace
                            ?.subjectCode && (
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                              {
                                workspace
                                  .subjectCode
                              }
                            </span>
                          )}
                        </div>

                        <div className="mt-3 text-[11px] text-slate-400">
                          {workspace
                            ?.academicYear ||
                            "Academic year not specified"}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Mark Sheet
        |--------------------------------------------------------------------------
        */}

        <section className="min-w-0">
          {!selectedWorkspace ? (
            <div className="card flex min-h-[480px] flex-col items-center justify-center p-8 text-center">
              <GraduationCap
                size={
                  44
                }
                className="text-slate-300"
              />

              <h2 className="mt-4 text-lg font-bold text-slate-800">
                Select a Mark Sheet
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Choose an exam, class, section and subject from the left to begin entering student marks.
              </p>
            </div>
          ) : sheetLoading ? (
            <div className="space-y-4">
              <div className="card animate-pulse p-5">
                <div className="h-5 w-52 rounded bg-slate-100" />
                <div className="mt-3 h-4 w-72 max-w-full rounded bg-slate-100" />
              </div>

              <div className="card animate-pulse p-5">
                <div className="h-80 rounded-xl bg-slate-100" />
              </div>
            </div>
          ) : !sheet ? (
            <div className="card flex min-h-[480px] flex-col items-center justify-center p-8 text-center">
              <AlertCircle
                size={
                  42
                }
                className="text-rose-400"
              />

              <h2 className="mt-4 text-lg font-bold text-slate-800">
                Mark Sheet Unavailable
              </h2>

              <button
                type="button"
                className="btn-secondary mt-5"
                onClick={
                  () =>
                    loadSheet(
                      selectedWorkspace
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
            <div className="space-y-4">
              {/*
              |--------------------------------------------------------------------------
              | Sheet Header
              |--------------------------------------------------------------------------
              */}

              <div className="card p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">
                        {sheet
                          ?.subject
                          ?.subjectName ||
                          selectedWorkspace
                            ?.subjectName ||
                          "Subject"}
                      </h2>

                      <SheetStatusBadge
                        status={
                          sheet
                            ?.summary
                            ?.sheetStatus ||
                          selectedWorkspace
                            ?.summary
                            ?.sheetStatus ||
                          "not_started"
                        }
                      />

                      {dirty && (
                        <Badge
                          tone="warning"
                        >
                          Unsaved Changes
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {sheet
                        ?.exam
                        ?.examName ||
                        selectedWorkspace
                          ?.examName}
                      {" · "}
                      {selectedWorkspace
                        ?.className ||
                        "Class"}
                      {" · Section "}
                      {sheet
                        ?.sectionName ||
                        selectedWorkspace
                          ?.sectionName}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span>
                        Maximum:{" "}
                        <strong className="text-slate-700">
                          {formatNumber(
                            overallMax
                          )}
                        </strong>
                      </span>

                      <span>
                        Passing:{" "}
                        <strong className="text-slate-700">
                          {formatNumber(
                            passingMarks
                          )}
                        </strong>
                      </span>

                      <span>
                        Students:{" "}
                        <strong className="text-slate-700">
                          {rows.length}
                        </strong>
                      </span>

                      <span>
                        Academic Year:{" "}
                        <strong className="text-slate-700">
                          {sheet
                            ?.exam
                            ?.academicYear ||
                            "-"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={
                        () =>
                          handleSave()
                      }
                      disabled={
                        !editable ||
                        !online ||
                        saving ||
                        submitting ||
                        rows.length ===
                          0
                      }
                    >
                      {saving ? (
                        <Loader2
                          size={
                            16
                          }
                          className="animate-spin"
                        />
                      ) : (
                        <Save
                          size={
                            16
                          }
                        />
                      )}

                      {saving
                        ? "Saving..."
                        : "Save Draft"}
                    </button>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={
                        openSubmitDialog
                      }
                      disabled={
                        !editable ||
                        !online ||
                        saving ||
                        submitting ||
                        !sheetComplete
                      }
                    >
                      <Send
                        size={
                          16
                        }
                      />

                      Submit Marks
                    </button>
                  </div>
                </div>

                {!editable && (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    This mark sheet is read-only in its current workflow status.
                  </div>
                )}

                {editable &&
                  incompleteStudentCount >
                    0 && (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <strong>
                        {incompleteStudentCount}
                      </strong>{" "}
                      student
                      {incompleteStudentCount ===
                      1
                        ? ""
                        : "s"}{" "}
                      still require complete marks before this sheet can be submitted.
                    </div>
                  )}

                {sheet
                  ?.exam
                  ?.marksEntryClosesAt && (
                  <div className="mt-4 text-xs text-slate-400">
                    Marks entry closes:{" "}
                    {formatDateTime(
                      sheet
                        .exam
                        .marksEntryClosesAt
                    )}
                  </div>
                )}
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Assessment Components
              |--------------------------------------------------------------------------
              */}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {showTheory && (
                  <div className="rounded-xl border border-slate-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Theory
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {formatNumber(
                        theoryMax
                      )}
                    </p>
                  </div>
                )}

                {showPractical && (
                  <div className="rounded-xl border border-slate-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Practical
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {formatNumber(
                        practicalMax
                      )}
                    </p>
                  </div>
                )}

                {showInternal && (
                  <div className="rounded-xl border border-slate-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Internal
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {formatNumber(
                        internalMax
                      )}
                    </p>
                  </div>
                )}

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
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Student Marks Table
              |--------------------------------------------------------------------------
              */}

              <div className="card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Student Marks
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Enter the configured assessment components for every present student.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <UsersRound
                      size={
                        16
                      }
                      className="text-slate-400"
                    />

                    <span className="font-semibold text-slate-600">
                      {rows.length} Students
                    </span>
                  </div>
                </div>

                {rows.length ===
                0 ? (
                  <div className="flex min-h-60 flex-col items-center justify-center p-6 text-center">
                    <UsersRound
                      size={
                        38
                      }
                      className="text-slate-300"
                    />

                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      No active students found
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      There are currently no active students in this class and section.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="sticky left-0 z-10 min-w-[230px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Student
                          </th>

                          <th className="min-w-[150px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Attendance
                          </th>

                          {showTheory && (
                            <th className="min-w-[115px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Theory
                              <span className="ml-1 normal-case text-slate-400">
                                /{formatNumber(
                                  theoryMax
                                )}
                              </span>
                            </th>
                          )}

                          {showPractical && (
                            <th className="min-w-[115px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Practical
                              <span className="ml-1 normal-case text-slate-400">
                                /{formatNumber(
                                  practicalMax
                                )}
                              </span>
                            </th>
                          )}

                          {showInternal && (
                            <th className="min-w-[115px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Internal
                              <span className="ml-1 normal-case text-slate-400">
                                /{formatNumber(
                                  internalMax
                                )}
                              </span>
                            </th>
                          )}

                          {allowGrace && (
                            <th className="min-w-[105px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Grace
                              <span className="ml-1 normal-case text-slate-400">
                                /{formatNumber(
                                  graceLimit
                                )}
                              </span>
                            </th>
                          )}

                          <th className="min-w-[110px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Deduction
                          </th>

                          <th className="min-w-[110px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Result
                          </th>

                          <th className="min-w-[220px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Remarks
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {rows.map(
                          (
                            row,
                            index
                          ) => {
                            const studentName =
                              getStudentName(
                                row.student
                              );

                            const present =
                              row.attendanceStatus ===
                              "present";

                            return (
                              <tr
                                key={
                                  row.studentId ||
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
                                      <p className="max-w-[170px] truncate font-semibold text-slate-800">
                                        {studentName}
                                      </p>

                                      <p className="mt-0.5 text-[11px] text-slate-400">
                                        Roll:{" "}
                                        {row
                                          .student
                                          ?.rollNumber ||
                                          "—"}
                                        {" · "}
                                        Adm:{" "}
                                        {row
                                          .student
                                          ?.admissionNumber ||
                                          "—"}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-3 py-3">
                                  <select
                                    className="field-select min-w-[145px]"
                                    value={
                                      row.attendanceStatus
                                    }
                                    onChange={
                                      (
                                        event
                                      ) =>
                                        updateRow(
                                          row.studentId,
                                          "attendanceStatus",
                                          event
                                            .target
                                            .value
                                        )
                                    }
                                    disabled={
                                      !editable ||
                                      saving ||
                                      submitting
                                    }
                                  >
                                    {ATTENDANCE_OPTIONS.map(
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
                                </td>

                                {showTheory && (
                                  <td className="px-3 py-3">
                                    <input
                                      type="number"
                                      min="0"
                                      max={
                                        theoryMax
                                      }
                                      step="0.01"
                                      className="field-input min-w-[95px]"
                                      value={
                                        row.theoryMarks
                                      }
                                      placeholder="0"
                                      onChange={
                                        (
                                          event
                                        ) =>
                                          updateRow(
                                            row.studentId,
                                            "theoryMarks",
                                            event
                                              .target
                                              .value
                                          )
                                      }
                                      disabled={
                                        !editable ||
                                        !present ||
                                        saving ||
                                        submitting
                                      }
                                    />
                                  </td>
                                )}

                                {showPractical && (
                                  <td className="px-3 py-3">
                                    <input
                                      type="number"
                                      min="0"
                                      max={
                                        practicalMax
                                      }
                                      step="0.01"
                                      className="field-input min-w-[95px]"
                                      value={
                                        row.practicalMarks
                                      }
                                      placeholder="0"
                                      onChange={
                                        (
                                          event
                                        ) =>
                                          updateRow(
                                            row.studentId,
                                            "practicalMarks",
                                            event
                                              .target
                                              .value
                                          )
                                      }
                                      disabled={
                                        !editable ||
                                        !present ||
                                        saving ||
                                        submitting
                                      }
                                    />
                                  </td>
                                )}

                                {showInternal && (
                                  <td className="px-3 py-3">
                                    <input
                                      type="number"
                                      min="0"
                                      max={
                                        internalMax
                                      }
                                      step="0.01"
                                      className="field-input min-w-[95px]"
                                      value={
                                        row.internalMarks
                                      }
                                      placeholder="0"
                                      onChange={
                                        (
                                          event
                                        ) =>
                                          updateRow(
                                            row.studentId,
                                            "internalMarks",
                                            event
                                              .target
                                              .value
                                          )
                                      }
                                      disabled={
                                        !editable ||
                                        !present ||
                                        saving ||
                                        submitting
                                      }
                                    />
                                  </td>
                                )}

                                {allowGrace && (
                                  <td className="px-3 py-3">
                                    <input
                                      type="number"
                                      min="0"
                                      max={
                                        graceLimit
                                      }
                                      step="0.01"
                                      className="field-input min-w-[90px]"
                                      value={
                                        row.graceMarks
                                      }
                                      placeholder="0"
                                      onChange={
                                        (
                                          event
                                        ) =>
                                          updateRow(
                                            row.studentId,
                                            "graceMarks",
                                            event
                                              .target
                                              .value
                                          )
                                      }
                                      disabled={
                                        !editable ||
                                        !present ||
                                        saving ||
                                        submitting
                                      }
                                    />
                                  </td>
                                )}

                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    max={
                                      overallMax
                                    }
                                    step="0.01"
                                    className="field-input min-w-[95px]"
                                    value={
                                      row.deductionMarks
                                    }
                                    placeholder="0"
                                    onChange={
                                      (
                                        event
                                      ) =>
                                        updateRow(
                                          row.studentId,
                                          "deductionMarks",
                                          event
                                            .target
                                            .value
                                        )
                                    }
                                    disabled={
                                      !editable ||
                                      !present ||
                                      saving ||
                                      submitting
                                    }
                                  />
                                </td>

                                <td className="px-3 py-3">
                                  <ResultStatusBadge
                                    status={
                                      row.resultStatus
                                    }
                                  />

                                  {row
                                    ?.grade
                                    ?.grade && (
                                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                      Grade{" "}
                                      {
                                        row
                                          .grade
                                          .grade
                                      }
                                    </p>
                                  )}
                                </td>

                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    className="field-input min-w-[200px]"
                                    value={
                                      row.teacherRemarks
                                    }
                                    maxLength={
                                      1000
                                    }
                                    placeholder="Optional remarks"
                                    onChange={
                                      (
                                        event
                                      ) =>
                                        updateRow(
                                          row.studentId,
                                          "teacherRemarks",
                                          event
                                            .target
                                            .value
                                        )
                                    }
                                    disabled={
                                      !editable ||
                                      saving ||
                                      submitting
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/*
                |--------------------------------------------------------------------------
                | Table Footer
                |--------------------------------------------------------------------------
                */}

                <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="text-xs text-slate-500">
                    {sheetComplete ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                        <CheckCircle2
                          size={
                            15
                          }
                        />

                        All required marks are complete.
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                        <AlertCircle
                          size={
                            15
                          }
                        />

                        {incompleteStudentCount} student
                        {incompleteStudentCount ===
                        1
                          ? ""
                          : "s"}{" "}
                        incomplete.
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={
                        () =>
                          handleSave()
                      }
                      disabled={
                        !editable ||
                        !online ||
                        saving ||
                        submitting ||
                        rows.length ===
                          0
                      }
                    >
                      {saving ? (
                        <Loader2
                          size={
                            16
                          }
                          className="animate-spin"
                        />
                      ) : (
                        <Save
                          size={
                            16
                          }
                        />
                      )}

                      Save Draft
                    </button>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={
                        openSubmitDialog
                      }
                      disabled={
                        !editable ||
                        !online ||
                        saving ||
                        submitting ||
                        !sheetComplete
                      }
                    >
                      <Send
                        size={
                          16
                        }
                      />

                      Submit for Review
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Submit Confirmation Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={
          submitOpen
        }
        onClose={
          () => {
            if (
              submitting
            ) {
              return;
            }

            setSubmitOpen(
              false
            );
          }
        }
        title="Submit Mark Sheet"
        width="max-w-xl"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <Send
              size={
                20
              }
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Submit marks for Principal review?
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                The latest marks will be saved first. After submission, this sheet becomes read-only until it is approved or returned for correction.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-400">
                  Exam
                </dt>

                <dd className="mt-1 font-semibold text-slate-800">
                  {sheet
                    ?.exam
                    ?.examName ||
                    selectedWorkspace
                      ?.examName ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-400">
                  Subject
                </dt>

                <dd className="mt-1 font-semibold text-slate-800">
                  {sheet
                    ?.subject
                    ?.subjectName ||
                    selectedWorkspace
                      ?.subjectName ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-400">
                  Class / Section
                </dt>

                <dd className="mt-1 font-semibold text-slate-800">
                  {selectedWorkspace
                    ?.className ||
                    "Class"}
                  {" / "}
                  {selectedWorkspace
                    ?.sectionName ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-slate-400">
                  Students
                </dt>

                <dd className="mt-1 font-semibold text-slate-800">
                  {rows.length}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={
                () =>
                  setSubmitOpen(
                    false
                  )
              }
              disabled={
                submitting
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={
                handleSubmit
              }
              disabled={
                submitting ||
                !online
              }
            >
              {submitting ? (
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

              {submitting
                ? "Submitting..."
                : "Confirm Submission"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeacherMarksEntry;