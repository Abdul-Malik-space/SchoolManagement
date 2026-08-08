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
  CalendarDays,
  Check,
  CheckCircle2,
  Clipboard,
  Copy,
  Eye,
  FileCheck2,
  FileText,
  GraduationCap,
  Loader2,
  Lock,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
  X,
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
| Permissions
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

const REPORT_CARD_EXAM_STATUSES = [
  "approved",
  "published",
  "locked"
];

const EXAM_STATUS_META = {
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

/*
|--------------------------------------------------------------------------
| Report Card Statuses
|--------------------------------------------------------------------------
*/

const REPORT_CARD_STATUS_META = {
  draft: {
    label: "Draft",
    tone: "neutral"
  },

  generated: {
    label: "Generated",
    tone: "warning"
  },

  issued: {
    label: "Issued",
    tone: "info"
  },

  published: {
    label: "Published",
    tone: "success"
  },

  revoked: {
    label: "Revoked",
    tone: "danger"
  },

  archived: {
    label: "Archived",
    tone: "neutral"
  }
};

/*
|--------------------------------------------------------------------------
| Overall Result Status
|--------------------------------------------------------------------------
*/

const OVERALL_RESULT_META = {
  pending: {
    label: "Pending",
    tone: "warning"
  },

  pass: {
    label: "Pass",
    tone: "success"
  },

  fail: {
    label: "Fail",
    tone: "danger"
  },

  incomplete: {
    label: "Incomplete",
    tone: "warning"
  },

  withheld: {
    label: "Withheld",
    tone: "danger"
  }
};

/*
|--------------------------------------------------------------------------
| Subject Result Status
|--------------------------------------------------------------------------
*/

const SUBJECT_RESULT_META = {
  pending: {
    label: "Pending",
    tone: "warning"
  },

  pass: {
    label: "Pass",
    tone: "success"
  },

  fail: {
    label: "Fail",
    tone: "danger"
  },

  absent: {
    label: "Absent",
    tone: "neutral"
  },

  leave: {
    label: "Leave",
    tone: "info"
  },

  exempted: {
    label: "Exempted",
    tone: "info"
  },

  withheld: {
    label: "Withheld",
    tone: "danger"
  }
};

/*
|--------------------------------------------------------------------------
| Defaults
|--------------------------------------------------------------------------
*/

const DEFAULT_SUMMARY = {
  total: 0,
  generated: 0,
  issued: 0,
  published: 0,
  revoked: 0,
  archived: 0,
  draft: 0,
  pass: 0,
  fail: 0
};

const DEFAULT_PAGINATION = {
  total: 0,
  page: 1,
  limit: 25,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false
};

const DEFAULT_GENERATE_FORM = {
  principalName: "",
  attendancePeriodStart: "",
  attendancePeriodEnd: "",
  forceNewVersion: false
};

const DEFAULT_PUBLISH_FORM = {
  allowPublicVerification: false,
  showDetailedMarksOnPublicVerification: false
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

  return String(value).trim();
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
    typeof value === "object"
  ) {
    return String(
      value._id ||
      value.id ||
      ""
    );
  }

  return String(value);
};

const requireRecordId = (
  value,
  label = "Record"
) => {
  const id =
    getRecordId(value);

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
      maximumFractionDigits: 2
    }
  ).format(
    toNumber(value)
  );
};

const formatPercentage = (
  value
) => {
  return `${formatNumber(
    value
  )}%`;
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
    "en-PK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  ).format(date);
};

const formatDateTime = (
  value
) => {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

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
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
};

const humanize = (
  value
) => {
  return normalizeText(value)
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
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
        (part) =>
          part[0]
      )
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "S"
  );
};

const getErrorMessage = (
  error,
  fallback =
    "Something went wrong."
) => {
  const message =
    error?.response?.data
      ?.message;

  if (message) {
    return message;
  }

  const details =
    error?.response?.data
      ?.details;

  if (
    Array.isArray(details) &&
    details.length
  ) {
    return details
      .map(
        (item) =>
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

const cleanParams = (
  params = {}
) => {
  return Object.fromEntries(
    Object.entries(params)
      .filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          value !== ""
      )
  );
};

/*
|--------------------------------------------------------------------------
| HTML Escape
|--------------------------------------------------------------------------
*/

const escapeHtml = (
  value
) => {
  return String(
    value ??
    ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
};

/*
|--------------------------------------------------------------------------
| Report Card API
|--------------------------------------------------------------------------
*/

const REPORT_CARD_BASE_URL =
  "/report-cards";

const getExamReportCardsApi =
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
        `${REPORT_CARD_BASE_URL}/exam/${id}`,
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

const getReportCardByIdApi =
  async (
    reportCardId,
    config = {}
  ) => {
    const id =
      requireRecordId(
        reportCardId,
        "Report card"
      );

    const response =
      await api.get(
        `${REPORT_CARD_BASE_URL}/${id}`,
        config
      );

    return response?.data;
  };

const generateReportCardsApi =
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
      await api.post(
        `${REPORT_CARD_BASE_URL}/exam/${id}/generate`,
        payload
      );

    return response?.data;
  };

const issueReportCardsApi =
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
        `${REPORT_CARD_BASE_URL}/exam/${id}/issue`,
        payload
      );

    return response?.data;
  };

const publishReportCardsApi =
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
        `${REPORT_CARD_BASE_URL}/exam/${id}/publish`,
        payload
      );

    return response?.data;
  };

/*
|--------------------------------------------------------------------------
| Badge Components
|--------------------------------------------------------------------------
*/

const ExamStatusBadge = ({
  status
}) => {
  const meta =
    EXAM_STATUS_META[
      status
    ] || {
      label:
        humanize(status),
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

const ReportCardStatusBadge = ({
  status
}) => {
  const meta =
    REPORT_CARD_STATUS_META[
      status
    ] || {
      label:
        humanize(status),
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

const OverallResultBadge = ({
  status
}) => {
  const meta =
    OVERALL_RESULT_META[
      status
    ] || {
      label:
        humanize(status),
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

const SubjectResultBadge = ({
  status
}) => {
  const meta =
    SUBJECT_RESULT_META[
      status
    ] || {
      label:
        humanize(status),
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
            size={19}
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
    <div className="fixed right-4 top-4 z-[90] w-[calc(100%-2rem)] max-w-sm">
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl ${
          isError
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}
      >
        {isError ? (
          <XCircle
            size={19}
            className="mt-0.5 shrink-0"
          />
        ) : (
          <CheckCircle2
            size={19}
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
          onClick={onClose}
          className="rounded-lg p-1 opacity-70 hover:bg-black/5 hover:opacity-100"
        >
          <X
            size={15}
          />
        </button>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Printable Report Card
|--------------------------------------------------------------------------
*/

const buildPrintableReportCardHtml = (
  card
) => {
  const snapshot =
    card?.snapshot ||
    {};

  const school =
    snapshot.school ||
    {};

  const student =
    snapshot.student ||
    {};

  const exam =
    snapshot.exam ||
    {};

  const totals =
    snapshot.totals ||
    {};

  const grade =
    snapshot.overallGrade ||
    {};

  const positions =
    snapshot.positions ||
    {};

  const attendance =
    snapshot.attendance ||
    {};

  const subjectRows =
    (
      snapshot.subjectResults ||
      []
    )
      .map(
        (subject, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <strong>${escapeHtml(
                subject.subjectName
              )}</strong>
              ${
                subject.subjectCode
                  ? `<div class="muted">${escapeHtml(
                      subject.subjectCode
                    )}</div>`
                  : ""
              }
            </td>
            <td>${formatNumber(
              subject.maxMarks
            )}</td>
            <td>${formatNumber(
              subject.passingMarks
            )}</td>
            <td>${formatNumber(
              subject.obtainedMarks
            )}</td>
            <td>${formatPercentage(
              subject.percentage
            )}</td>
            <td>${escapeHtml(
              subject?.grade
                ?.grade ||
              "—"
            )}</td>
            <td>${escapeHtml(
              humanize(
                subject.resultStatus
              )
            )}</td>
          </tr>
        `
      )
      .join("");

  const signatures =
    (
      snapshot.signatures ||
      []
    )
      .sort(
        (a, b) =>
          toNumber(
            a.displayOrder
          ) -
          toNumber(
            b.displayOrder
          )
      )
      .map(
        (signature) => `
          <div class="signature">
            ${
              signature.signatureUrl
                ? `<img src="${escapeHtml(
                    signature.signatureUrl
                  )}" alt="Signature" />`
                : `<div class="signature-space"></div>`
            }

            <strong>
              ${escapeHtml(
                signature.name
              )}
            </strong>

            <span>
              ${escapeHtml(
                signature.designation ||
                humanize(
                  signature.role
                )
              )}
            </span>
          </div>
        `
      )
      .join("");

  const schoolLogo =
    school.logoUrl
      ? `
        <img
          class="school-logo"
          src="${escapeHtml(
            school.logoUrl
          )}"
          alt="School Logo"
        />
      `
      : `
        <div class="school-logo-placeholder">
          SCHOOL
        </div>
      `;

  const studentPhoto =
    student.photoUrl
      ? `
        <img
          class="student-photo"
          src="${escapeHtml(
            student.photoUrl
          )}"
          alt="Student"
        />
      `
      : `
        <div class="student-photo-placeholder">
          ${escapeHtml(
            getInitials(
              student.studentName
            )
          )}
        </div>
      `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />

  <title>
    ${escapeHtml(
      card.reportCardNumber ||
      "Report Card"
    )}
  </title>

  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #ffffff;
      color: #172033;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
    }

    .page {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      border: 1.5px solid #172033;
      padding: 8mm;
    }

    .header {
      display: grid;
      grid-template-columns: 78px 1fr 78px;
      gap: 12px;
      align-items: center;
      border-bottom: 2px solid #172033;
      padding-bottom: 12px;
    }

    .school-logo,
    .school-logo-placeholder {
      width: 70px;
      height: 70px;
      object-fit: contain;
      border-radius: 8px;
    }

    .school-logo-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #cbd5e1;
      font-size: 10px;
      color: #64748b;
    }

    .school-center {
      text-align: center;
    }

    .school-center h1 {
      margin: 0;
      font-size: 23px;
      line-height: 1.2;
    }

    .school-center p {
      margin: 4px 0 0;
      color: #475569;
    }

    .student-photo,
    .student-photo-placeholder {
      width: 72px;
      height: 82px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      object-fit: cover;
    }

    .student-photo-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f1f5f9;
      font-size: 20px;
      font-weight: bold;
    }

    .title {
      text-align: center;
      margin: 16px 0 12px;
    }

    .title h2 {
      margin: 0;
      font-size: 18px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }

    .title p {
      margin: 5px 0 0;
      color: #64748b;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      border: 1px solid #cbd5e1;
      margin-bottom: 14px;
    }

    .info-item {
      padding: 7px 9px;
      border-bottom: 1px solid #e2e8f0;
    }

    .info-item:nth-child(odd) {
      border-right: 1px solid #e2e8f0;
    }

    .label {
      color: #64748b;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    .value {
      margin-top: 3px;
      font-weight: bold;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    th,
    td {
      border: 1px solid #cbd5e1;
      padding: 7px 6px;
      text-align: center;
      vertical-align: middle;
    }

    th {
      background: #f1f5f9;
      font-size: 10px;
      text-transform: uppercase;
    }

    td:nth-child(2),
    th:nth-child(2) {
      text-align: left;
    }

    .muted {
      color: #64748b;
      font-size: 9px;
      margin-top: 2px;
    }

    .result-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 14px;
    }

    .result-box {
      border: 1px solid #cbd5e1;
      padding: 9px;
      text-align: center;
      border-radius: 6px;
    }

    .result-box strong {
      display: block;
      margin-top: 4px;
      font-size: 16px;
    }

    .attendance {
      margin-top: 14px;
      border: 1px solid #cbd5e1;
      padding: 10px;
    }

    .attendance-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }

    .remarks {
      margin-top: 14px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .remark-box {
      min-height: 65px;
      border: 1px solid #cbd5e1;
      padding: 9px;
    }

    .signatures {
      margin-top: 30px;
      display: flex;
      justify-content: space-around;
      gap: 20px;
    }

    .signature {
      min-width: 130px;
      text-align: center;
    }

    .signature img {
      width: 100px;
      height: 42px;
      object-fit: contain;
      display: block;
      margin: 0 auto 4px;
    }

    .signature-space {
      height: 46px;
      border-bottom: 1px solid #64748b;
      margin-bottom: 5px;
    }

    .signature strong {
      display: block;
    }

    .signature span {
      color: #64748b;
      font-size: 10px;
    }

    .verification {
      margin-top: 24px;
      padding-top: 9px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 9px;
      color: #64748b;
    }

    .result-pass {
      color: #15803d;
    }

    .result-fail {
      color: #be123c;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .page {
        border: 1.5px solid #172033;
      }
    }
  </style>
</head>

<body>
  <div class="page">
    <div class="header">
      <div>
        ${schoolLogo}
      </div>

      <div class="school-center">
        <h1>
          ${escapeHtml(
            school.schoolName ||
            "School"
          )}
        </h1>

        ${
          school.address
            ? `<p>${escapeHtml(
                school.address
              )}</p>`
            : ""
        }

        <p>
          ${
            school.phone
              ? `Phone: ${escapeHtml(
                  school.phone
                )}`
              : ""
          }

          ${
            school.email
              ? ` &nbsp; ${escapeHtml(
                  school.email
                )}`
              : ""
          }
        </p>
      </div>

      <div>
        ${studentPhoto}
      </div>
    </div>

    <div class="title">
      <h2>
        Report Card
      </h2>

      <p>
        ${escapeHtml(
          exam.examName ||
          ""
        )}
        ${
          exam.academicYear
            ? ` · ${escapeHtml(
                exam.academicYear
              )}`
            : ""
        }
      </p>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <div class="label">
          Student Name
        </div>

        <div class="value">
          ${escapeHtml(
            student.studentName
          )}
        </div>
      </div>

      <div class="info-item">
        <div class="label">
          Father / Guardian
        </div>

        <div class="value">
          ${escapeHtml(
            student.fatherName ||
            student.guardianName ||
            "—"
          )}
        </div>
      </div>

      <div class="info-item">
        <div class="label">
          Admission Number
        </div>

        <div class="value">
          ${escapeHtml(
            student.admissionNumber ||
            "—"
          )}
        </div>
      </div>

      <div class="info-item">
        <div class="label">
          Roll Number
        </div>

        <div class="value">
          ${escapeHtml(
            student.rollNumber ||
            "—"
          )}
        </div>
      </div>

      <div class="info-item">
        <div class="label">
          Class
        </div>

        <div class="value">
          ${escapeHtml(
            student.className ||
            "—"
          )}
        </div>
      </div>

      <div class="info-item">
        <div class="label">
          Section
        </div>

        <div class="value">
          ${escapeHtml(
            student.sectionName ||
            "—"
          )}
        </div>
      </div>

      <div class="info-item">
        <div class="label">
          Exam
        </div>

        <div class="value">
          ${escapeHtml(
            exam.examName ||
            "—"
          )}
        </div>
      </div>

      <div class="info-item">
        <div class="label">
          Report Card No.
        </div>

        <div class="value">
          ${escapeHtml(
            card.reportCardNumber ||
            "—"
          )}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Subject</th>
          <th>Max</th>
          <th>Pass</th>
          <th>Obtained</th>
          <th>%</th>
          <th>Grade</th>
          <th>Result</th>
        </tr>
      </thead>

      <tbody>
        ${subjectRows}
      </tbody>
    </table>

    <div class="result-grid">
      <div class="result-box">
        <span class="label">
          Marks
        </span>

        <strong>
          ${formatNumber(
            totals.totalObtainedMarks
          )}
          /
          ${formatNumber(
            totals.totalMaxMarks
          )}
        </strong>
      </div>

      <div class="result-box">
        <span class="label">
          Percentage
        </span>

        <strong>
          ${formatPercentage(
            totals.percentage
          )}
        </strong>
      </div>

      <div class="result-box">
        <span class="label">
          Grade
        </span>

        <strong>
          ${escapeHtml(
            grade.grade ||
            "—"
          )}
        </strong>
      </div>

      <div class="result-box">
        <span class="label">
          Result
        </span>

        <strong class="${
          snapshot.overallResultStatus ===
          "pass"
            ? "result-pass"
            : snapshot.overallResultStatus ===
              "fail"
              ? "result-fail"
              : ""
        }">
          ${escapeHtml(
            humanize(
              snapshot.overallResultStatus
            )
          )}
        </strong>
      </div>
    </div>

    ${
      positions.classPosition ||
      positions.sectionPosition
        ? `
          <div class="attendance">
            <strong>
              Positions
            </strong>

            <div class="attendance-row" style="margin-top:7px;">
              <span>
                Class Position:
                <strong>
                  ${escapeHtml(
                    positions.classPosition ||
                    "—"
                  )}
                </strong>
              </span>

              <span>
                Section Position:
                <strong>
                  ${escapeHtml(
                    positions.sectionPosition ||
                    "—"
                  )}
                </strong>
              </span>
            </div>
          </div>
        `
        : ""
    }

    ${
      attendance.workingDays >
      0
        ? `
          <div class="attendance">
            <strong>
              Attendance
            </strong>

            <div class="attendance-row" style="margin-top:7px;">
              <span>
                Working:
                <strong>
                  ${formatNumber(
                    attendance.workingDays
                  )}
                </strong>
              </span>

              <span>
                Present:
                <strong>
                  ${formatNumber(
                    attendance.presentDays
                  )}
                </strong>
              </span>

              <span>
                Absent:
                <strong>
                  ${formatNumber(
                    attendance.absentDays
                  )}
                </strong>
              </span>

              <span>
                Leave:
                <strong>
                  ${formatNumber(
                    attendance.leaveDays
                  )}
                </strong>
              </span>

              <span>
                Attendance:
                <strong>
                  ${formatPercentage(
                    attendance.attendancePercentage
                  )}
                </strong>
              </span>
            </div>
          </div>
        `
        : ""
    }

    ${
      snapshot.classTeacherRemarks ||
      snapshot.principalRemarks
        ? `
          <div class="remarks">
            <div class="remark-box">
              <div class="label">
                Class Teacher Remarks
              </div>

              <div style="margin-top:6px;">
                ${escapeHtml(
                  snapshot.classTeacherRemarks ||
                  "—"
                )}
              </div>
            </div>

            <div class="remark-box">
              <div class="label">
                Principal Remarks
              </div>

              <div style="margin-top:6px;">
                ${escapeHtml(
                  snapshot.principalRemarks ||
                  "—"
                )}
              </div>
            </div>
          </div>
        `
        : ""
    }

    ${
      signatures
        ? `
          <div class="signatures">
            ${signatures}
          </div>
        `
        : ""
    }

    <div class="verification">
      <span>
        Report Card:
        ${escapeHtml(
          card.reportCardNumber ||
          "—"
        )}
        · Version
        ${escapeHtml(
          card.versionNumber ||
          1
        )}
      </span>

      <span>
        Verification Code:
        <strong>
          ${escapeHtml(
            card.verification
              ?.verificationCode ||
            "—"
          )}
        </strong>
      </span>
    </div>
  </div>

  <script>
    window.onload = function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>
  `;
};

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

const ReportCard = () => {
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
  | Online State
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

  /*
  |--------------------------------------------------------------------------
  | Exam State
  |--------------------------------------------------------------------------
  */

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
    currentExamData,
    setCurrentExamData
  ] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | Report Cards
  |--------------------------------------------------------------------------
  */

  const [
    reportCards,
    setReportCards
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

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  const [
    loadingExams,
    setLoadingExams
  ] =
    useState(true);

  const [
    loadingCards,
    setLoadingCards
  ] =
    useState(false);

  const [
    refreshing,
    setRefreshing
  ] =
    useState(false);

  const [
    actionLoading,
    setActionLoading
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Messages
  |--------------------------------------------------------------------------
  */

  const [
    error,
    setError
  ] =
    useState("");

  const [
    toast,
    setToast
  ] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

  const [
    search,
    setSearch
  ] =
    useState("");

  const [
    debouncedSearch,
    setDebouncedSearch
  ] =
    useState("");

  const [
    filters,
    setFilters
  ] =
    useState({
      sectionName: "",
      status: "",
      overallResultStatus: "",
      page: 1,
      limit: 25
    });

  /*
  |--------------------------------------------------------------------------
  | Selection
  |--------------------------------------------------------------------------
  */

  const [
    selectedIds,
    setSelectedIds
  ] =
    useState([]);

  /*
  |--------------------------------------------------------------------------
  | Detail
  |--------------------------------------------------------------------------
  */

  const [
    detailOpen,
    setDetailOpen
  ] =
    useState(false);

  const [
    detailLoading,
    setDetailLoading
  ] =
    useState(false);

  const [
    selectedCard,
    setSelectedCard
  ] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | Generate Modal
  |--------------------------------------------------------------------------
  */

  const [
    generateOpen,
    setGenerateOpen
  ] =
    useState(false);

  const [
    generateForm,
    setGenerateForm
  ] =
    useState(
      DEFAULT_GENERATE_FORM
    );

  /*
  |--------------------------------------------------------------------------
  | Issue Modal
  |--------------------------------------------------------------------------
  */

  const [
    issueOpen,
    setIssueOpen
  ] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Publish Modal
  |--------------------------------------------------------------------------
  */

  const [
    publishOpen,
    setPublishOpen
  ] =
    useState(false);

  const [
    publishForm,
    setPublishForm
  ] =
    useState(
      DEFAULT_PUBLISH_FORM
    );

  /*
  |--------------------------------------------------------------------------
  | Abort Controllers
  |--------------------------------------------------------------------------
  */

  const examsAbortRef =
    useRef(null);

  const cardsAbortRef =
    useRef(null);

  const detailAbortRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Online Events
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      const handleOnline =
        () =>
          setOnline(true);

      const handleOffline =
        () =>
          setOnline(false);

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
              (current) => ({
                ...current,
                page: 1
              })
            );

            setSelectedIds(
              []
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
      async ({
        silent = false
      } = {}) => {
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

        if (!silent) {
          setLoadingExams(
            true
          );
        }

        try {
          const response =
            await getExams(
              {
                isActive: true,
                limit: 100,
                sortBy: "startDate",
                sortOrder: "desc"
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
              (exam) =>
                REPORT_CARD_EXAM_STATUSES.includes(
                  exam?.status
                )
            );

          setExams(
            list
          );

          setSelectedExamId(
            (current) => {
              if (current) {
                return current;
              }

              const preferred =
                list.find(
                  (exam) =>
                    exam.status ===
                    "published"
                ) ||
                list.find(
                  (exam) =>
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

          setExams([]);

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
  | Load Report Cards
  |--------------------------------------------------------------------------
  */

  const loadReportCards =
    useCallback(
      async ({
        silent = false
      } = {}) => {
        if (
          !selectedExamId
        ) {
          setCurrentExamData(
            null
          );

          setReportCards([]);

          setSummary(
            DEFAULT_SUMMARY
          );

          setPagination(
            DEFAULT_PAGINATION
          );

          return;
        }

        cardsAbortRef
          .current
          ?.abort();

        const controller =
          new AbortController();

        cardsAbortRef.current =
          controller;

        if (silent) {
          setRefreshing(
            true
          );
        } else {
          setLoadingCards(
            true
          );
        }

        setError("");

        try {
          const payload =
            await getExamReportCardsApi(
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

          setCurrentExamData(
            payload?.exam ||
            null
          );

          setReportCards(
            Array.isArray(
              payload?.reportCards
            )
              ? payload.reportCards
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

          setReportCards([]);

          setSummary(
            DEFAULT_SUMMARY
          );

          setPagination(
            DEFAULT_PAGINATION
          );

          setError(
            getErrorMessage(
              requestError,
              "Report cards could not be loaded."
            )
          );
        } finally {
          if (
            cardsAbortRef
              .current ===
            controller
          ) {
            setLoadingCards(
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
      loadReportCards();

      return () => {
        cardsAbortRef
          .current
          ?.abort();
      };
    },
    [
      loadReportCards
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
          currentExamData ||
          exams.find(
            (exam) =>
              getRecordId(
                exam
              ) ===
              selectedExamId
          ) ||
          null
        );
      },
      [
        currentExamData,
        exams,
        selectedExamId
      ]
    );

  const currentExamStatus =
    currentExam?.status ||
    "";

  /*
  |--------------------------------------------------------------------------
  | Eligible Cards
  |--------------------------------------------------------------------------
  */

  const selectableCards =
    useMemo(
      () => {
        return reportCards.filter(
          (card) =>
            [
              "generated",
              "issued",
              "published"
            ].includes(
              card.status
            )
        );
      },
      [
        reportCards
      ]
    );

  const selectedCards =
    useMemo(
      () => {
        const selectedSet =
          new Set(
            selectedIds
          );

        return reportCards.filter(
          (card) =>
            selectedSet.has(
              getRecordId(
                card
              )
            )
        );
      },
      [
        reportCards,
        selectedIds
      ]
    );

  const selectedGeneratedCount =
    selectedCards.filter(
      (card) =>
        card.status ===
        "generated"
    ).length;

  const selectedIssueEligible =
    selectedCards.filter(
      (card) =>
        [
          "generated",
          "issued",
          "published"
        ].includes(
          card.status
        )
    );

  const selectedPublishEligible =
    selectedCards.filter(
      (card) =>
        [
          "generated",
          "issued",
          "published"
        ].includes(
          card.status
        )
    );

  /*
  |--------------------------------------------------------------------------
  | Permissions
  |--------------------------------------------------------------------------
  */

  const canGenerate =
    Boolean(
      online &&
      [
        "approved",
        "published",
        "locked"
      ].includes(
        currentExamStatus
      )
    );

  const canIssue =
    Boolean(
      online &&
      [
        "published",
        "locked"
      ].includes(
        currentExamStatus
      ) &&
      selectedIssueEligible.length >
        0
    );

  const canPublish =
    Boolean(
      online &&
      [
        "published",
        "locked"
      ].includes(
        currentExamStatus
      ) &&
      selectedPublishEligible.length >
        0
    );

  const allSelectableSelected =
    Boolean(
      selectableCards.length >
        0 &&
      selectableCards.every(
        (card) =>
          selectedIds.includes(
            getRecordId(
              card
            )
          )
      )
    );

  /*
  |--------------------------------------------------------------------------
  | Exam Change
  |--------------------------------------------------------------------------
  */

  const handleExamChange =
    (
      event
    ) => {
      setSelectedExamId(
        event.target.value
      );

      setSearch("");

      setFilters({
        sectionName: "",
        status: "",
        overallResultStatus: "",
        page: 1,
        limit: 25
      });

      setSelectedIds([]);

      setSelectedCard(null);

      setDetailOpen(false);
    };

  /*
  |--------------------------------------------------------------------------
  | Selection
  |--------------------------------------------------------------------------
  */

  const toggleCardSelection =
    (
      card
    ) => {
      const id =
        getRecordId(
          card
        );

      if (!id) {
        return;
      }

      if (
        ![
          "generated",
          "issued",
          "published"
        ].includes(
          card.status
        )
      ) {
        return;
      }

      setSelectedIds(
        (current) =>
          current.includes(id)
            ? current.filter(
                (value) =>
                  value !== id
              )
            : [
                ...current,
                id
              ]
      );
    };

  const toggleSelectAll =
    () => {
      if (
        allSelectableSelected
      ) {
        const selectableIds =
          new Set(
            selectableCards.map(
              getRecordId
            )
          );

        setSelectedIds(
          (current) =>
            current.filter(
              (id) =>
                !selectableIds.has(
                  id
                )
            )
        );

        return;
      }

      setSelectedIds(
        Array.from(
          new Set([
            ...selectedIds,
            ...selectableCards.map(
              getRecordId
            )
          ])
        )
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Refresh
  |--------------------------------------------------------------------------
  */

  const handleRefresh =
    async () => {
      setSelectedIds([]);

      await Promise.all([
        loadExams({
          silent: true
        }),

        loadReportCards({
          silent: true
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

      setActionLoading(
        "generate"
      );

      try {
        const payload = {
          forceNewVersion:
            Boolean(
              generateForm
                .forceNewVersion
            )
        };

        if (
          normalizeText(
            generateForm
              .principalName
          )
        ) {
          payload.principalName =
            normalizeText(
              generateForm
                .principalName
            );
        }

        if (
          generateForm
            .attendancePeriodStart
        ) {
          payload.attendancePeriodStart =
            generateForm
              .attendancePeriodStart;
        }

        if (
          generateForm
            .attendancePeriodEnd
        ) {
          payload.attendancePeriodEnd =
            generateForm
              .attendancePeriodEnd;
        }

        const response =
          await generateReportCardsApi(
            selectedExamId,
            payload
          );

        setGenerateOpen(
          false
        );

        setGenerateForm(
          DEFAULT_GENERATE_FORM
        );

        setSelectedIds([]);

        setToast({
          type: "success",

          message:
            response?.message ||
            "Report cards generated successfully."
        });

        await loadReportCards({
          silent: true
        });
      } catch (
        requestError
      ) {
        setToast({
          type: "error",

          message:
            getErrorMessage(
              requestError,
              "Report cards could not be generated."
            )
        });
      } finally {
        setActionLoading("");
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Issue
  |--------------------------------------------------------------------------
  */

  const handleIssue =
    async () => {
      if (!canIssue) {
        return;
      }

      setActionLoading(
        "issue"
      );

      try {
        const response =
          await issueReportCardsApi(
            selectedExamId,
            {
              reportCardIds:
                selectedIssueEligible.map(
                  getRecordId
                )
            }
          );

        setIssueOpen(
          false
        );

        setSelectedIds([]);

        setToast({
          type: "success",

          message:
            response?.message ||
            "Selected report cards issued successfully."
        });

        await loadReportCards({
          silent: true
        });
      } catch (
        requestError
      ) {
        setToast({
          type: "error",

          message:
            getErrorMessage(
              requestError,
              "Report cards could not be issued."
            )
        });
      } finally {
        setActionLoading("");
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
          await publishReportCardsApi(
            selectedExamId,
            {
              reportCardIds:
                selectedPublishEligible.map(
                  getRecordId
                ),

              allowPublicVerification:
                Boolean(
                  publishForm
                    .allowPublicVerification
                ),

              showDetailedMarksOnPublicVerification:
                Boolean(
                  publishForm
                    .allowPublicVerification &&
                  publishForm
                    .showDetailedMarksOnPublicVerification
                )
            }
          );

        setPublishOpen(
          false
        );

        setPublishForm(
          DEFAULT_PUBLISH_FORM
        );

        setSelectedIds([]);

        setToast({
          type: "success",

          message:
            response?.message ||
            "Selected report cards published successfully."
        });

        await loadReportCards({
          silent: true
        });
      } catch (
        requestError
      ) {
        setToast({
          type: "error",

          message:
            getErrorMessage(
              requestError,
              "Report cards could not be published."
            )
        });
      } finally {
        setActionLoading("");
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Open Detail
  |--------------------------------------------------------------------------
  */

  const openDetail =
    async (
      card
    ) => {
      if (!card) {
        return;
      }

      detailAbortRef
        .current
        ?.abort();

      const controller =
        new AbortController();

      detailAbortRef.current =
        controller;

      setSelectedCard(
        card
      );

      setDetailOpen(
        true
      );

      setDetailLoading(
        true
      );

      try {
        const response =
          await getReportCardByIdApi(
            card,
            {
              signal:
                controller.signal
            }
          );

        setSelectedCard(
          response?.reportCard ||
          card
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
          type: "error",

          message:
            getErrorMessage(
              requestError,
              "Report card details could not be loaded."
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
  | Copy Verification Code
  |--------------------------------------------------------------------------
  */

  const copyVerificationCode =
    async (
      card
    ) => {
      const code =
        normalizeText(
          card?.verification
            ?.verificationCode
        );

      if (!code) {
        setToast({
          type: "error",
          message:
            "Verification code is not available."
        });

        return;
      }

      try {
        await navigator.clipboard
          .writeText(code);

        setToast({
          type: "success",
          message:
            "Verification code copied."
        });
      } catch {
        setToast({
          type: "error",
          message:
            "Verification code could not be copied."
        });
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Print / Save PDF
  |--------------------------------------------------------------------------
  */

  const printReportCard =
    (
      card
    ) => {
      if (!card) {
        return;
      }

      const printWindow =
        window.open(
          "",
          "_blank",
          "width=1000,height=900"
        );

      if (!printWindow) {
        setToast({
          type: "error",

          message:
            "The print window was blocked by your browser. Allow pop-ups and try again."
        });

        return;
      }

      printWindow.document.open();

      printWindow.document.write(
        buildPrintableReportCardHtml(
          card
        )
      );

      printWindow.document.close();
    };

  /*
  |--------------------------------------------------------------------------
  | Filter Helpers
  |--------------------------------------------------------------------------
  */

  const updateFilter =
    (
      field,
      value
    ) => {
      setFilters(
        (current) => ({
          ...current,
          [field]: value,
          page: 1
        })
      );

      setSelectedIds([]);
    };

  const handlePageChange =
    (
      page
    ) => {
      setSelectedIds([]);

      setFilters(
        (current) => ({
          ...current,
          page
        })
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Access Denied
  |--------------------------------------------------------------------------
  */

  if (!canAccess) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Report Cards"
        />

        <div className="card flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <ShieldCheck
            size={44}
            className="text-rose-400"
          />

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Access Denied
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Only Principal and Super Admin accounts can manage official report cards.
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
    <div className="space-y-5 pb-8">
      <Toast
        toast={toast}
        onClose={
          () =>
            setToast(null)
        }
      />

      <PageHeader
        title="Report Cards"
        action={
          <button
            type="button"
            className="btn-secondary"
            onClick={
              handleRefresh
            }
            disabled={
              refreshing ||
              loadingCards ||
              loadingExams ||
              Boolean(
                actionLoading
              )
            }
          >
            {refreshing ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <RefreshCw
                size={16}
              />
            )}

            Refresh
          </button>
        }
      />

      {/*
      |--------------------------------------------------------------------------
      | Offline Alert
      |--------------------------------------------------------------------------
      */}

      {!online && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              You are offline
            </p>

            <p className="mt-1 text-xs leading-5">
              Existing report cards can still be viewed, but generation, issue and publication actions are disabled.
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
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              Unable to load report cards
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
                (exam) => (
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
          <FileText
            size={46}
            className="text-slate-300"
          />

          <h2 className="mt-4 text-lg font-bold text-slate-800">
            Select an Examination
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Select an approved or published examination to generate and manage official report cards.
          </p>
        </div>
      ) : (
        <>
          {/*
          |--------------------------------------------------------------------------
          | Header Actions
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {currentExam
                      ?.examName ||
                      "Report Cards"}
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
                    () => {
                      setGenerateForm(
                        DEFAULT_GENERATE_FORM
                      );

                      setGenerateOpen(
                        true
                      );
                    }
                  }
                  disabled={
                    !canGenerate ||
                    Boolean(
                      actionLoading
                    )
                  }
                >
                  <Sparkles
                    size={16}
                  />

                  Generate / Refresh
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={
                    () =>
                      setIssueOpen(
                        true
                      )
                  }
                  disabled={
                    !canIssue ||
                    Boolean(
                      actionLoading
                    )
                  }
                >
                  <FileCheck2
                    size={16}
                  />

                  Issue Selected
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={
                    () => {
                      setPublishForm(
                        DEFAULT_PUBLISH_FORM
                      );

                      setPublishOpen(
                        true
                      );
                    }
                  }
                  disabled={
                    !canPublish ||
                    Boolean(
                      actionLoading
                    )
                  }
                >
                  <Send
                    size={16}
                  />

                  Publish Selected
                </button>
              </div>
            </div>

            {currentExamStatus ===
              "approved" && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <Lock
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="font-semibold">
                    Exam results are approved but not published
                  </p>

                  <p className="mt-1 text-xs leading-5">
                    Report cards can be generated now, but they cannot be issued or published until the examination results are published.
                  </p>
                </div>
              </div>
            )}

            {selectedIds.length >
              0 && (
              <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-brand-800">
                  <CheckCircle2
                    size={17}
                  />

                  <strong>
                    {selectedIds.length}
                  </strong>

                  report card
                  {selectedIds.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  selected
                </div>

                <button
                  type="button"
                  className="text-xs font-semibold text-brand-700 hover:underline"
                  onClick={
                    () =>
                      setSelectedIds(
                        []
                      )
                  }
                >
                  Clear selection
                </button>
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
              label="Total Cards"
              value={
                summary.total ||
                0
              }
              help="All report-card versions"
            />

            <SummaryCard
              icon={
                Sparkles
              }
              label="Generated"
              value={
                summary.generated ||
                0
              }
              help="Ready for issue"
            />

            <SummaryCard
              icon={
                FileCheck2
              }
              label="Issued"
              value={
                summary.issued ||
                0
              }
              help="Official issued cards"
            />

            <SummaryCard
              icon={
                Send
              }
              label="Published"
              value={
                summary.published ||
                0
              }
              help="Available to portals"
            />

            <SummaryCard
              icon={
                Award
              }
              label="Pass / Fail"
              value={`${summary.pass || 0} / ${summary.fail || 0}`}
              help="Snapshot result status"
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
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  className="field-input pl-9"
                  placeholder="Search student, roll, card no..."
                  value={search}
                  onChange={
                    (event) =>
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
                  (event) =>
                    updateFilter(
                      "sectionName",
                      event.target
                        .value
                    )
                }
              />

              <select
                className="field-select"
                value={
                  filters.status
                }
                onChange={
                  (event) =>
                    updateFilter(
                      "status",
                      event.target
                        .value
                    )
                }
              >
                <option value="">
                  All Card Statuses
                </option>

                <option value="draft">
                  Draft
                </option>

                <option value="generated">
                  Generated
                </option>

                <option value="issued">
                  Issued
                </option>

                <option value="published">
                  Published
                </option>

                <option value="revoked">
                  Revoked
                </option>

                <option value="archived">
                  Archived
                </option>
              </select>

              <select
                className="field-select"
                value={
                  filters
                    .overallResultStatus
                }
                onChange={
                  (event) =>
                    updateFilter(
                      "overallResultStatus",
                      event.target
                        .value
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
          | Table
          |--------------------------------------------------------------------------
          */}

          <section className="card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Official Report Cards
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Student result snapshots, versions and publication status.
                </p>
              </div>

              <Badge
                tone="info"
              >
                {pagination.total ||
                  0}{" "}
                Cards
              </Badge>
            </div>

            {loadingCards ? (
              <div className="p-5">
                <div className="animate-pulse space-y-3">
                  {Array.from({
                    length: 7
                  }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className="h-14 rounded-xl bg-slate-100"
                      />
                    )
                  )}
                </div>
              </div>
            ) : reportCards.length ===
              0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
                <FileText
                  size={42}
                  className="text-slate-300"
                />

                <h3 className="mt-4 font-bold text-slate-800">
                  No Report Cards Found
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {summary.total === 0
                    ? "No official report-card snapshots have been generated for this examination yet."
                    : "No report cards match the selected filters."}
                </p>

                {summary.total ===
                  0 &&
                  canGenerate && (
                    <button
                      type="button"
                      className="btn-primary mt-5"
                      onClick={
                        () =>
                          setGenerateOpen(
                            true
                          )
                      }
                    >
                      <Sparkles
                        size={16}
                      />

                      Generate Report Cards
                    </button>
                  )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1320px] text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="w-12 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={
                              allSelectableSelected
                            }
                            onChange={
                              toggleSelectAll
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        </th>

                        <th className="min-w-[230px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Student
                        </th>

                        <th className="min-w-[210px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Report Card
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Class
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Marks
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          %
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Grade
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Result
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>

                        <th className="min-w-[170px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Verification
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {reportCards.map(
                        (card) => {
                          const snapshot =
                            card.snapshot ||
                            {};

                          const student =
                            snapshot.student ||
                            {};

                          const totals =
                            snapshot.totals ||
                            {};

                          const overallGrade =
                            snapshot.overallGrade ||
                            {};

                          const cardId =
                            getRecordId(
                              card
                            );

                          const selectable =
                            [
                              "generated",
                              "issued",
                              "published"
                            ].includes(
                              card.status
                            );

                          return (
                            <tr
                              key={cardId}
                              className="bg-white hover:bg-slate-50/70"
                            >
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedIds.includes(
                                      cardId
                                    )
                                  }
                                  disabled={
                                    !selectable
                                  }
                                  onChange={
                                    () =>
                                      toggleCardSelection(
                                        card
                                      )
                                  }
                                  className="h-4 w-4 rounded border-slate-300 disabled:opacity-40"
                                />
                              </td>

                              <td className="px-3 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-xs font-bold text-brand-700">
                                    {student.photoUrl ? (
                                      <img
                                        src={
                                          student.photoUrl
                                        }
                                        alt={
                                          student.studentName ||
                                          "Student"
                                        }
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      getInitials(
                                        student.studentName
                                      )
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="max-w-[170px] truncate font-semibold text-slate-800">
                                      {student.studentName ||
                                        "Student"}
                                    </p>

                                    <p className="mt-1 text-[11px] text-slate-400">
                                      Roll:{" "}
                                      {student.rollNumber ||
                                        "—"}
                                      {" · "}
                                      Adm:{" "}
                                      {student.admissionNumber ||
                                        "—"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-3 py-4">
                                <p className="max-w-[200px] truncate font-semibold text-slate-700">
                                  {card.reportCardNumber ||
                                    "—"}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  Version{" "}
                                  {card.versionNumber ||
                                    1}
                                </p>
                              </td>

                              <td className="px-3 py-4">
                                <p className="font-semibold text-slate-700">
                                  {student.className ||
                                    card
                                      ?.classId
                                      ?.className ||
                                    "—"}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  Section{" "}
                                  {student.sectionName ||
                                    card.sectionName ||
                                    "—"}
                                </p>
                              </td>

                              <td className="px-3 py-4">
                                <span className="font-bold text-slate-800">
                                  {formatNumber(
                                    totals.totalObtainedMarks
                                  )}
                                </span>

                                <span className="text-xs text-slate-400">
                                  {" "}
                                  /{" "}
                                  {formatNumber(
                                    totals.totalMaxMarks
                                  )}
                                </span>
                              </td>

                              <td className="px-3 py-4 font-bold text-slate-800">
                                {formatPercentage(
                                  totals.percentage
                                )}
                              </td>

                              <td className="px-3 py-4">
                                <span className="font-bold text-slate-800">
                                  {overallGrade.grade ||
                                    "—"}
                                </span>
                              </td>

                              <td className="px-3 py-4">
                                <OverallResultBadge
                                  status={
                                    snapshot.overallResultStatus
                                  }
                                />
                              </td>

                              <td className="px-3 py-4">
                                <ReportCardStatusBadge
                                  status={
                                    card.status
                                  }
                                />
                              </td>

                              <td className="px-3 py-4">
                                <div className="flex items-center gap-2">
                                  <code className="max-w-[120px] truncate rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                    {card.verification
                                      ?.verificationCode ||
                                      "—"}
                                  </code>

                                  {card.verification
                                    ?.verificationCode && (
                                    <button
                                      type="button"
                                      title="Copy verification code"
                                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                      onClick={
                                        () =>
                                          copyVerificationCode(
                                            card
                                          )
                                      }
                                    >
                                      <Copy
                                        size={14}
                                      />
                                    </button>
                                  )}
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={
                                      () =>
                                        openDetail(
                                          card
                                        )
                                    }
                                  >
                                    <Eye
                                      size={15}
                                    />

                                    View
                                  </button>

                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={
                                      () =>
                                        printReportCard(
                                          card
                                        )
                                    }
                                  >
                                    <Printer
                                      size={15}
                                    />

                                    Print
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  pagination={
                    pagination
                  }
                  onPageChange={
                    handlePageChange
                  }
                  disabled={
                    loadingCards ||
                    refreshing ||
                    Boolean(
                      actionLoading
                    )
                  }
                />
              </>
            )}
          </section>
        </>
      )}

      {/*
      |--------------------------------------------------------------------------
      | Generate Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={
          generateOpen
        }
        onClose={
          () => {
            if (
              actionLoading ===
              "generate"
            ) {
              return;
            }

            setGenerateOpen(
              false
            );
          }
        }
        title="Generate Report Cards"
        width="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <Sparkles
              size={20}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Generate official report-card snapshots
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Existing editable generated cards will be refreshed. Issued or published cards remain protected, and a new version is created only when required.
              </p>
            </div>
          </div>

          <div>
            <label className="field-label">
              Principal Name
            </label>

            <input
              type="text"
              className="field-input"
              placeholder="Optional principal name for snapshot"
              value={
                generateForm
                  .principalName
              }
              onChange={
                (event) =>
                  setGenerateForm(
                    (current) => ({
                      ...current,

                      principalName:
                        event.target
                          .value
                    })
                  )
              }
              disabled={
                actionLoading ===
                "generate"
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">
                Attendance From
              </label>

              <input
                type="date"
                className="field-input"
                value={
                  generateForm
                    .attendancePeriodStart
                }
                onChange={
                  (event) =>
                    setGenerateForm(
                      (current) => ({
                        ...current,

                        attendancePeriodStart:
                          event.target
                            .value
                      })
                    )
                }
                disabled={
                  actionLoading ===
                  "generate"
                }
              />
            </div>

            <div>
              <label className="field-label">
                Attendance To
              </label>

              <input
                type="date"
                className="field-input"
                value={
                  generateForm
                    .attendancePeriodEnd
                }
                onChange={
                  (event) =>
                    setGenerateForm(
                      (current) => ({
                        ...current,

                        attendancePeriodEnd:
                          event.target
                            .value
                      })
                    )
                }
                disabled={
                  actionLoading ===
                  "generate"
                }
              />
            </div>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Leave attendance dates empty to use the examination start and end dates automatically.
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300"
              checked={
                generateForm
                  .forceNewVersion
              }
              onChange={
                (event) =>
                  setGenerateForm(
                    (current) => ({
                      ...current,

                      forceNewVersion:
                        event.target
                          .checked
                    })
                  )
              }
              disabled={
                actionLoading ===
                "generate"
              }
            />

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Force a new version
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Use this only when you intentionally need a new version of an already official report card even when the snapshot has not changed.
              </p>
            </div>
          </label>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={
                () =>
                  setGenerateOpen(
                    false
                  )
              }
              disabled={
                actionLoading ===
                "generate"
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={
                handleGenerate
              }
              disabled={
                !canGenerate ||
                actionLoading ===
                  "generate"
              }
            >
              {actionLoading ===
              "generate" ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Sparkles
                  size={16}
                />
              )}

              {actionLoading ===
              "generate"
                ? "Generating..."
                : "Generate Report Cards"}
            </button>
          </div>
        </div>
      </Modal>

      {/*
      |--------------------------------------------------------------------------
      | Issue Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={
          issueOpen
        }
        onClose={
          () => {
            if (
              actionLoading !==
              "issue"
            ) {
              setIssueOpen(
                false
              );
            }
          }
        }
        title="Issue Report Cards"
        width="max-w-xl"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <FileCheck2
              size={20}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Issue selected official report cards?
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Issued report cards become official immutable snapshots. Their result snapshot cannot be silently changed afterward.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Selected cards
              </span>

              <strong className="text-lg text-slate-900">
                {
                  selectedIssueEligible.length
                }
              </strong>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm text-slate-500">
                Newly generated
              </span>

              <strong className="text-slate-800">
                {
                  selectedGeneratedCount
                }
              </strong>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={
                () =>
                  setIssueOpen(
                    false
                  )
              }
              disabled={
                actionLoading ===
                "issue"
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={
                handleIssue
              }
              disabled={
                !canIssue ||
                actionLoading ===
                  "issue"
              }
            >
              {actionLoading ===
              "issue" ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2
                  size={16}
                />
              )}

              {actionLoading ===
              "issue"
                ? "Issuing..."
                : "Issue Selected"}
            </button>
          </div>
        </div>
      </Modal>

      {/*
      |--------------------------------------------------------------------------
      | Publish Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={
          publishOpen
        }
        onClose={
          () => {
            if (
              actionLoading !==
              "publish"
            ) {
              setPublishOpen(
                false
              );
            }
          }
        }
        title="Publish Report Cards"
        width="max-w-xl"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <Send
              size={20}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Publish selected report cards?
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-700">
                Generated cards will first be issued automatically and then published. Published cards become available for Student and Parent portal access according to their policy.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Selected cards
              </span>

              <strong className="text-lg text-slate-900">
                {
                  selectedPublishEligible.length
                }
              </strong>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300"
              checked={
                publishForm
                  .allowPublicVerification
              }
              onChange={
                (event) =>
                  setPublishForm(
                    (current) => ({
                      ...current,

                      allowPublicVerification:
                        event.target
                          .checked,

                      showDetailedMarksOnPublicVerification:
                        event.target
                          .checked
                          ? current
                              .showDetailedMarksOnPublicVerification
                          : false
                    })
                  )
              }
            />

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Allow public verification
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Anyone with the verification code can confirm that the report card is authentic.
              </p>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              publishForm
                .allowPublicVerification
                ? "cursor-pointer border-slate-200"
                : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
            }`}
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300"
              checked={
                publishForm
                  .showDetailedMarksOnPublicVerification
              }
              disabled={
                !publishForm
                  .allowPublicVerification
              }
              onChange={
                (event) =>
                  setPublishForm(
                    (current) => ({
                      ...current,

                      showDetailedMarksOnPublicVerification:
                        event.target
                          .checked
                    })
                  )
              }
            />

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Show detailed marks publicly
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Enable this only if subject-by-subject marks should also appear on the public verification result.
              </p>
            </div>
          </label>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
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
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Send
                  size={16}
                />
              )}

              {actionLoading ===
              "publish"
                ? "Publishing..."
                : "Publish Selected"}
            </button>
          </div>
        </div>
      </Modal>

      {/*
      |--------------------------------------------------------------------------
      | Detail Modal
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
        title="Report Card Preview"
        width="max-w-6xl"
      >
        {detailLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2
              size={30}
              className="animate-spin text-brand-600"
            />
          </div>
        ) : !selectedCard ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Report-card details are unavailable.
          </div>
        ) : (
          <div className="space-y-5">
            {/*
            |--------------------------------------------------------------------------
            | Preview Actions
            |--------------------------------------------------------------------------
            */}

            <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-800">
                  {selectedCard.reportCardNumber}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Version{" "}
                  {selectedCard.versionNumber ||
                    1}
                  {" · "}
                  Snapshot captured{" "}
                  {formatDateTime(
                    selectedCard
                      ?.snapshot
                      ?.capturedAt
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ReportCardStatusBadge
                  status={
                    selectedCard.status
                  }
                />

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={
                    () =>
                      printReportCard(
                        selectedCard
                      )
                  }
                >
                  <Printer
                    size={16}
                  />

                  Print / Save PDF
                </button>
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Printable-style Preview
            |--------------------------------------------------------------------------
            */}

            <div className="overflow-hidden rounded-2xl border-2 border-slate-800 bg-white">
              <div className="grid grid-cols-[72px_1fr_72px] items-center gap-4 border-b-2 border-slate-800 p-5 sm:grid-cols-[90px_1fr_90px]">
                <div className="flex items-center justify-center">
                  {selectedCard
                    ?.snapshot
                    ?.school
                    ?.logoUrl ? (
                    <img
                      src={
                        selectedCard
                          .snapshot
                          .school
                          .logoUrl
                      }
                      alt="School"
                      className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 text-[10px] font-bold text-slate-400 sm:h-20 sm:w-20">
                      SCHOOL
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <h2 className="text-lg font-extrabold text-slate-900 sm:text-2xl">
                    {selectedCard
                      ?.snapshot
                      ?.school
                      ?.schoolName ||
                      "School"}
                  </h2>

                  {selectedCard
                    ?.snapshot
                    ?.school
                    ?.address && (
                    <p className="mt-1 text-xs text-slate-500">
                      {
                        selectedCard
                          .snapshot
                          .school
                          .address
                      }
                    </p>
                  )}

                  <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-700">
                    Report Card
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedCard
                      ?.snapshot
                      ?.exam
                      ?.examName ||
                      "Examination"}
                    {" · "}
                    {selectedCard
                      ?.snapshot
                      ?.exam
                      ?.academicYear ||
                      ""}
                  </p>
                </div>

                <div className="flex justify-end">
                  {selectedCard
                    ?.snapshot
                    ?.student
                    ?.photoUrl ? (
                    <img
                      src={
                        selectedCard
                          .snapshot
                          .student
                          .photoUrl
                      }
                      alt="Student"
                      className="h-20 w-16 rounded-lg border border-slate-200 object-cover sm:h-24 sm:w-20"
                    />
                  ) : (
                    <div className="flex h-20 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500 sm:h-24 sm:w-20">
                      {getInitials(
                        selectedCard
                          ?.snapshot
                          ?.student
                          ?.studentName
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Student Information
              |--------------------------------------------------------------------------
              */}

              <div className="grid border-b border-slate-200 sm:grid-cols-2">
                {[
                  [
                    "Student Name",
                    selectedCard
                      ?.snapshot
                      ?.student
                      ?.studentName
                  ],

                  [
                    "Father / Guardian",
                    selectedCard
                      ?.snapshot
                      ?.student
                      ?.fatherName ||
                    selectedCard
                      ?.snapshot
                      ?.student
                      ?.guardianName
                  ],

                  [
                    "Admission Number",
                    selectedCard
                      ?.snapshot
                      ?.student
                      ?.admissionNumber
                  ],

                  [
                    "Roll Number",
                    selectedCard
                      ?.snapshot
                      ?.student
                      ?.rollNumber
                  ],

                  [
                    "Class",
                    selectedCard
                      ?.snapshot
                      ?.student
                      ?.className
                  ],

                  [
                    "Section",
                    selectedCard
                      ?.snapshot
                      ?.student
                      ?.sectionName
                  ]
                ].map(
                  ([label, value]) => (
                    <div
                      key={label}
                      className="border-b border-slate-100 px-4 py-3 sm:border-r"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {label}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {value ||
                          "—"}
                      </p>
                    </div>
                  )
                )}
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Subject Table
              |--------------------------------------------------------------------------
              */}

              <div className="overflow-x-auto p-4 sm:p-5">
                <table className="w-full min-w-[850px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-600">
                        Subject
                      </th>

                      <th className="border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-600">
                        Max
                      </th>

                      <th className="border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-600">
                        Pass
                      </th>

                      <th className="border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-600">
                        Obtained
                      </th>

                      <th className="border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-600">
                        %
                      </th>

                      <th className="border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-600">
                        Grade
                      </th>

                      <th className="border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-600">
                        Result
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {(
                      selectedCard
                        ?.snapshot
                        ?.subjectResults ||
                      []
                    )
                      .slice()
                      .sort(
                        (a, b) =>
                          toNumber(
                            a.displayOrder
                          ) -
                          toNumber(
                            b.displayOrder
                          )
                      )
                      .map(
                        (
                          subject,
                          index
                        ) => (
                          <tr
                            key={
                              getRecordId(
                                subject.subjectId
                              ) ||
                              `${subject.subjectName}-${index}`
                            }
                          >
                            <td className="border border-slate-300 px-3 py-2">
                              <p className="font-semibold text-slate-800">
                                {subject.subjectName ||
                                  "Subject"}
                              </p>

                              <div className="mt-1 flex flex-wrap gap-1">
                                {subject.subjectCode && (
                                  <span className="text-[10px] text-slate-400">
                                    {
                                      subject.subjectCode
                                    }
                                  </span>
                                )}

                                {subject.isOptional && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                                    Optional
                                  </span>
                                )}

                                {subject.countsInTotal ===
                                  false && (
                                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">
                                    Not in total
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="border border-slate-300 px-3 py-2 text-center">
                              {formatNumber(
                                subject.maxMarks
                              )}
                            </td>

                            <td className="border border-slate-300 px-3 py-2 text-center">
                              {formatNumber(
                                subject.passingMarks
                              )}
                            </td>

                            <td className="border border-slate-300 px-3 py-2 text-center font-bold">
                              {formatNumber(
                                subject.obtainedMarks
                              )}
                            </td>

                            <td className="border border-slate-300 px-3 py-2 text-center">
                              {formatPercentage(
                                subject.percentage
                              )}
                            </td>

                            <td className="border border-slate-300 px-3 py-2 text-center font-bold">
                              {subject
                                ?.grade
                                ?.grade ||
                                "—"}
                            </td>

                            <td className="border border-slate-300 px-3 py-2 text-center">
                              <SubjectResultBadge
                                status={
                                  subject.resultStatus
                                }
                              />
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Totals
              |--------------------------------------------------------------------------
              */}

              <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
                <div className="rounded-xl border border-slate-200 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Total Marks
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {formatNumber(
                      selectedCard
                        ?.snapshot
                        ?.totals
                        ?.totalObtainedMarks
                    )}

                    <span className="text-sm font-normal text-slate-400">
                      {" "}
                      /{" "}
                      {formatNumber(
                        selectedCard
                          ?.snapshot
                          ?.totals
                          ?.totalMaxMarks
                      )}
                    </span>
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Percentage
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {formatPercentage(
                      selectedCard
                        ?.snapshot
                        ?.totals
                        ?.percentage
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Grade
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {selectedCard
                      ?.snapshot
                      ?.overallGrade
                      ?.grade ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Result
                  </p>

                  <div className="mt-2">
                    <OverallResultBadge
                      status={
                        selectedCard
                          ?.snapshot
                          ?.overallResultStatus
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Positions + Attendance
            |--------------------------------------------------------------------------
            */}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card border border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <Trophy
                    size={18}
                    className="text-amber-500"
                  />

                  <h4 className="font-bold text-slate-800">
                    Positions
                  </h4>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Class Position
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {selectedCard
                        ?.snapshot
                        ?.positions
                        ?.classPosition ||
                        "—"}

                      {selectedCard
                        ?.snapshot
                        ?.positions
                        ?.classCandidateCount >
                        0 && (
                        <span className="text-xs font-normal text-slate-400">
                          {" "}
                          /{" "}
                          {
                            selectedCard
                              .snapshot
                              .positions
                              .classCandidateCount
                          }
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Section Position
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {selectedCard
                        ?.snapshot
                        ?.positions
                        ?.sectionPosition ||
                        "—"}

                      {selectedCard
                        ?.snapshot
                        ?.positions
                        ?.sectionCandidateCount >
                        0 && (
                        <span className="text-xs font-normal text-slate-400">
                          {" "}
                          /{" "}
                          {
                            selectedCard
                              .snapshot
                              .positions
                              .sectionCandidateCount
                          }
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card border border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <CalendarDays
                    size={18}
                    className="text-blue-500"
                  />

                  <h4 className="font-bold text-slate-800">
                    Attendance
                  </h4>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {[
                    [
                      "Working",
                      selectedCard
                        ?.snapshot
                        ?.attendance
                        ?.workingDays
                    ],

                    [
                      "Present",
                      selectedCard
                        ?.snapshot
                        ?.attendance
                        ?.presentDays
                    ],

                    [
                      "Absent",
                      selectedCard
                        ?.snapshot
                        ?.attendance
                        ?.absentDays
                    ],

                    [
                      "Late",
                      selectedCard
                        ?.snapshot
                        ?.attendance
                        ?.lateDays
                    ],

                    [
                      "Leave",
                      selectedCard
                        ?.snapshot
                        ?.attendance
                        ?.leaveDays
                    ],

                    [
                      "%",
                      formatPercentage(
                        selectedCard
                          ?.snapshot
                          ?.attendance
                          ?.attendancePercentage
                      )
                    ]
                  ].map(
                    ([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl bg-slate-50 p-2 text-center"
                      >
                        <p className="text-[10px] text-slate-400">
                          {label}
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {value ?? 0}
                        </p>
                      </div>
                    )
                  )}
                </div>

                <p className="mt-3 text-[11px] text-slate-400">
                  {formatDate(
                    selectedCard
                      ?.snapshot
                      ?.attendance
                      ?.periodStart
                  )}
                  {" — "}
                  {formatDate(
                    selectedCard
                      ?.snapshot
                      ?.attendance
                      ?.periodEnd
                  )}
                </p>
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Remarks
            |--------------------------------------------------------------------------
            */}

            {(
              selectedCard
                ?.snapshot
                ?.classTeacherRemarks ||
              selectedCard
                ?.snapshot
                ?.principalRemarks
            ) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Class Teacher Remarks
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {selectedCard
                      ?.snapshot
                      ?.classTeacherRemarks ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Principal Remarks
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {selectedCard
                      ?.snapshot
                      ?.principalRemarks ||
                      "—"}
                  </p>
                </div>
              </div>
            )}

            {/*
            |--------------------------------------------------------------------------
            | Signatures
            |--------------------------------------------------------------------------
            */}

            {selectedCard
              ?.snapshot
              ?.signatures
              ?.length >
              0 && (
              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Signatures
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedCard
                    .snapshot
                    .signatures
                    .slice()
                    .sort(
                      (a, b) =>
                        toNumber(
                          a.displayOrder
                        ) -
                        toNumber(
                          b.displayOrder
                        )
                    )
                    .map(
                      (
                        signature,
                        index
                      ) => (
                        <div
                          key={`${signature.role}-${index}`}
                          className="rounded-xl bg-slate-50 p-4 text-center"
                        >
                          {signature.signatureUrl ? (
                            <img
                              src={
                                signature.signatureUrl
                              }
                              alt="Signature"
                              className="mx-auto h-12 max-w-32 object-contain"
                            />
                          ) : (
                            <div className="mx-auto h-12 max-w-32 border-b border-slate-300" />
                          )}

                          <p className="mt-2 font-semibold text-slate-800">
                            {signature.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {signature.designation ||
                              humanize(
                                signature.role
                              )}
                          </p>
                        </div>
                      )
                    )}
                </div>
              </div>
            )}

            {/*
            |--------------------------------------------------------------------------
            | Verification
            |--------------------------------------------------------------------------
            */}

            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      size={18}
                      className="text-emerald-600"
                    />

                    <p className="font-semibold text-slate-800">
                      Verification
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Code:
                    {" "}
                    <code className="font-bold text-slate-700">
                      {selectedCard
                        ?.verification
                        ?.verificationCode ||
                        "—"}
                    </code>
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Verified{" "}
                    {selectedCard
                      ?.verification
                      ?.verificationCount ||
                      0}{" "}
                    time(s)
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedCard
                    ?.verification
                    ?.verificationCode && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={
                        () =>
                          copyVerificationCode(
                            selectedCard
                          )
                      }
                    >
                      <Clipboard
                        size={15}
                      />

                      Copy Code
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={
                      () =>
                        printReportCard(
                          selectedCard
                        )
                    }
                  >
                    <Printer
                      size={15}
                    />

                    Print / PDF
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[10px] uppercase text-slate-400">
                    Visibility
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {humanize(
                      selectedCard
                        ?.accessPolicy
                        ?.visibility ||
                      "private"
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-slate-400">
                    Issued At
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {formatDateTime(
                      selectedCard
                        ?.issue
                        ?.issuedAt
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-slate-400">
                    Published At
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {formatDateTime(
                      selectedCard
                        ?.publication
                        ?.publishedAt
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-slate-400">
                    Public Verification
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {selectedCard
                      ?.accessPolicy
                      ?.allowPublicVerification
                      ? "Allowed"
                      : "Private"}
                  </p>
                </div>
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Version History
            |--------------------------------------------------------------------------
            */}

            {selectedCard
              ?.revisions
              ?.length >
              0 && (
              <div className="rounded-xl border border-slate-100 p-4">
                <h4 className="font-bold text-slate-800">
                  Previous Versions
                </h4>

                <div className="mt-3 space-y-2">
                  {selectedCard
                    .revisions
                    .slice()
                    .reverse()
                    .map(
                      (
                        revision,
                        index
                      ) => (
                        <div
                          key={`${revision.reportCardNumber}-${index}`}
                          className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              {revision.reportCardNumber}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Version{" "}
                              {revision.versionNumber}
                              {" · "}
                              {humanize(
                                revision.previousStatus
                              )}
                            </p>
                          </div>

                          <div className="sm:text-right">
                            <p className="text-xs text-slate-500">
                              {revision.reason}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              {formatDateTime(
                                revision.changedAt
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReportCard;