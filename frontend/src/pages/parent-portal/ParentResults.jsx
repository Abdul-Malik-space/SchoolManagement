import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  useOutletContext
} from "react-router-dom";

import {
  AlertCircle,
  Award,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileCheck2,
  FileText,
  GraduationCap,
  Loader2,
  Medal,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
  XCircle
} from "lucide-react";

import {
  getParentChildResults,
  getParentChildResultById,
  getParentChildReportCardById
} from "../../api/parentPortal";

import {
  Badge
} from "../../components/ui/Badge";

import {
  Modal
} from "../../components/ui/Modal";

import {
  Pagination
} from "../../components/ui/Pagination";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const PAGE_LIMIT =
  10;

const DEFAULT_FILTERS = {
  academicYear: "",
  academicTerm: "",
  overallResultStatus: ""
};

const DEFAULT_SUMMARY = {
  totalResults: 0,
  passCount: 0,
  failCount: 0,
  averagePercentage: 0,
  highestPercentage: 0,
  lowestPercentage: 0,
  publishedReportCardCount: 0
};

const DEFAULT_PAGINATION = {
  page: 1,
  limit: PAGE_LIMIT,
  totalRecords: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false
};

/*
|--------------------------------------------------------------------------
| Result Meta
|--------------------------------------------------------------------------
*/

const RESULT_STATUS_META = {
  pass: {
    label: "Pass",
    tone: "success"
  },

  fail: {
    label: "Fail",
    tone: "danger"
  },

  pending: {
    label: "Pending",
    tone: "warning"
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

const SUBJECT_STATUS_META = {
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
  },

  pending: {
    label: "Pending",
    tone: "warning"
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
    Number(
      value
    );

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

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
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
    return "—";
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
        character
      ) =>
        character.toUpperCase()
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

const getErrorMessage = (
  error,
  fallback =
    "Unable to complete the request."
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.response?.data
      ?.error ||
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

const escapeHtml = (
  value
) => {
  return String(
    value ?? ""
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
| Status Badges
|--------------------------------------------------------------------------
*/

const ResultStatusBadge = ({
  status
}) => {
  const meta =
    RESULT_STATUS_META[
      status
    ] || {
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
    ] || {
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
  description
}) => {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
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
    <div className="fixed right-4 top-20 z-[120] w-[calc(100%-2rem)] max-w-sm">
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
          <p className="text-sm font-bold">
            {isError
              ? "Action Failed"
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
| Printable Report Card
|--------------------------------------------------------------------------
*/

const buildPrintableReportCardHtml = (
  reportCard
) => {
  const snapshot =
    reportCard?.snapshot ||
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

  const overallGrade =
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
      .slice()
      .sort(
        (
          first,
          second
        ) =>
          toNumber(
            first.displayOrder
          ) -
          toNumber(
            second.displayOrder
          )
      )
      .map(
        (
          subject,
          index
        ) => `
          <tr>
            <td>
              ${index + 1}
            </td>

            <td class="subject">
              <strong>
                ${escapeHtml(
                  subject.subjectName ||
                    "Subject"
                )}
              </strong>

              ${
                subject.subjectCode
                  ? `
                    <div class="muted">
                      ${escapeHtml(
                        subject.subjectCode
                      )}
                    </div>
                  `
                  : ""
              }
            </td>

            <td>
              ${formatNumber(
                subject.maxMarks
              )}
            </td>

            <td>
              ${formatNumber(
                subject.passingMarks
              )}
            </td>

            <td>
              <strong>
                ${formatNumber(
                  subject.obtainedMarks
                )}
              </strong>
            </td>

            <td>
              ${formatPercentage(
                subject.percentage
              )}
            </td>

            <td>
              ${escapeHtml(
                subject
                  ?.grade
                  ?.grade ||
                  "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                humanize(
                  subject.resultStatus
                )
              )}
            </td>
          </tr>
        `
      )
      .join("");

  const signatures =
    (
      snapshot.signatures ||
      []
    )
      .slice()
      .sort(
        (
          first,
          second
        ) =>
          toNumber(
            first.displayOrder
          ) -
          toNumber(
            second.displayOrder
          )
      )
      .map(
        (
          signature
        ) => `
          <div class="signature">
            ${
              signature.signatureUrl
                ? `
                  <img
                    src="${escapeHtml(
                      signature.signatureUrl
                    )}"
                    alt="Signature"
                  />
                `
                : `
                  <div class="signature-line"></div>
                `
            }

            <strong>
              ${escapeHtml(
                signature.name ||
                  ""
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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />

  <title>
    ${escapeHtml(
      reportCard.reportCardNumber ||
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
      grid-template-columns: 80px 1fr 80px;
      gap: 12px;
      align-items: center;
      border-bottom: 2px solid #172033;
      padding-bottom: 12px;
    }

    .school-logo {
      width: 70px;
      height: 70px;
      object-fit: contain;
    }

    .school-placeholder {
      width: 70px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #64748b;
      font-size: 10px;
      font-weight: bold;
    }

    .school {
      text-align: center;
    }

    .school h1 {
      margin: 0;
      font-size: 22px;
    }

    .school p {
      margin: 4px 0 0;
      color: #64748b;
    }

    .student-photo {
      width: 72px;
      height: 84px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      object-fit: cover;
    }

    .student-placeholder {
      width: 72px;
      height: 84px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      font-size: 18px;
      font-weight: bold;
    }

    .heading {
      padding: 14px 0;
      text-align: center;
    }

    .heading h2 {
      margin: 0;
      font-size: 18px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }

    .heading p {
      margin: 5px 0 0;
      color: #64748b;
    }

    .info {
      display: grid;
      grid-template-columns: 1fr 1fr;
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
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .5px;
      color: #64748b;
    }

    .value {
      margin-top: 3px;
      font-weight: bold;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      border: 1px solid #cbd5e1;
      padding: 7px 5px;
      text-align: center;
    }

    th {
      background: #f1f5f9;
      font-size: 9px;
      text-transform: uppercase;
    }

    td.subject,
    th.subject {
      text-align: left;
    }

    .muted {
      margin-top: 2px;
      color: #64748b;
      font-size: 9px;
    }

    .totals {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 14px;
    }

    .total-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 9px;
      text-align: center;
    }

    .total-box strong {
      display: block;
      margin-top: 4px;
      font-size: 16px;
    }

    .section {
      margin-top: 14px;
      border: 1px solid #cbd5e1;
      padding: 10px;
    }

    .section-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 7px;
    }

    .remarks {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 14px;
    }

    .remark {
      min-height: 60px;
      border: 1px solid #cbd5e1;
      padding: 9px;
    }

    .signatures {
      display: flex;
      justify-content: space-around;
      gap: 20px;
      margin-top: 28px;
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
      margin: 0 auto 5px;
    }

    .signature-line {
      height: 45px;
      margin-bottom: 5px;
      border-bottom: 1px solid #64748b;
    }

    .signature strong {
      display: block;
    }

    .signature span {
      display: block;
      margin-top: 2px;
      color: #64748b;
      font-size: 9px;
    }

    .verification {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-top: 22px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      color: #64748b;
      font-size: 9px;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>

<body>
  <div class="page">
    <div class="header">
      <div>
        ${
          school.logoUrl
            ? `
              <img
                src="${escapeHtml(
                  school.logoUrl
                )}"
                class="school-logo"
                alt="School"
              />
            `
            : `
              <div class="school-placeholder">
                SCHOOL
              </div>
            `
        }
      </div>

      <div class="school">
        <h1>
          ${escapeHtml(
            school.schoolName ||
              "School"
          )}
        </h1>

        ${
          school.address
            ? `
              <p>
                ${escapeHtml(
                  school.address
                )}
              </p>
            `
            : ""
        }

        <p>
          ${escapeHtml(
            school.phone ||
              ""
          )}

          ${
            school.email
              ? ` · ${escapeHtml(
                  school.email
                )}`
              : ""
          }
        </p>
      </div>

      <div>
        ${
          student.photoUrl
            ? `
              <img
                src="${escapeHtml(
                  student.photoUrl
                )}"
                class="student-photo"
                alt="Student"
              />
            `
            : `
              <div class="student-placeholder">
                ${escapeHtml(
                  getInitials(
                    student.studentName
                  )
                )}
              </div>
            `
        }
      </div>
    </div>

    <div class="heading">
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

    <div class="info">
      <div class="info-item">
        <div class="label">
          Student Name
        </div>

        <div class="value">
          ${escapeHtml(
            student.studentName ||
              "—"
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
          Report Card Number
        </div>

        <div class="value">
          ${escapeHtml(
            reportCard.reportCardNumber ||
              "—"
          )}
        </div>
      </div>

      <div class="info-item">
        <div class="label">
          Version
        </div>

        <div class="value">
          ${escapeHtml(
            reportCard.versionNumber ||
              1
          )}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th class="subject">
            Subject
          </th>
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

    <div class="totals">
      <div class="total-box">
        <div class="label">
          Marks
        </div>

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

      <div class="total-box">
        <div class="label">
          Percentage
        </div>

        <strong>
          ${formatPercentage(
            totals.percentage
          )}
        </strong>
      </div>

      <div class="total-box">
        <div class="label">
          Grade
        </div>

        <strong>
          ${escapeHtml(
            overallGrade.grade ||
              "—"
          )}
        </strong>
      </div>

      <div class="total-box">
        <div class="label">
          Result
        </div>

        <strong>
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
          <div class="section">
            <strong>
              Positions
            </strong>

            <div class="section-row">
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
          <div class="section">
            <strong>
              Attendance
            </strong>

            <div class="section-row">
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
            <div class="remark">
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

            <div class="remark">
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
          reportCard.reportCardNumber ||
            "—"
        )}
      </span>

      <span>
        Verification Code:
        <strong>
          ${escapeHtml(
            reportCard.verification
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
| Parent Results Page
|--------------------------------------------------------------------------
*/

const ParentResults = () => {
  const {
    overview,
    children,
    selectedChild,
    selectedChildId,
    setSelectedChildId,
    refreshOverview
  } =
    useOutletContext();

  /*
  |--------------------------------------------------------------------------
  | Student
  |--------------------------------------------------------------------------
  */

  const studentId =
    selectedChild
      ?.student
      ?.id ||
    selectedChildId ||
    "";

  const resultsAllowed =
    selectedChild
      ?.link
      ?.permissions
      ?.academics !==
    false;

  /*
  |--------------------------------------------------------------------------
  | Request References
  |--------------------------------------------------------------------------
  */

  const resultsAbortRef =
    useRef(null);

  const detailAbortRef =
    useRef(null);

  const reportCardAbortRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Results State
  |--------------------------------------------------------------------------
  */

  const [
    resultData,
    setResultData
  ] =
    useState(null);

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
    page,
    setPage
  ] =
    useState(1);

  const [
    filterForm,
    setFilterForm
  ] =
    useState(
      DEFAULT_FILTERS
    );

  const [
    appliedFilters,
    setAppliedFilters
  ] =
    useState(
      DEFAULT_FILTERS
    );

  /*
  |--------------------------------------------------------------------------
  | Result Detail Modal
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
    detailData,
    setDetailData
  ] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | Report Card Modal
  |--------------------------------------------------------------------------
  */

  const [
    reportCardOpen,
    setReportCardOpen
  ] =
    useState(false);

  const [
    reportCardLoading,
    setReportCardLoading
  ] =
    useState(false);

  const [
    reportCardData,
    setReportCardData
  ] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | Reset When Child Changes
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      resultsAbortRef
        .current
        ?.abort();

      detailAbortRef
        .current
        ?.abort();

      reportCardAbortRef
        .current
        ?.abort();

      setResultData(
        null
      );

      setPage(
        1
      );

      setFilterForm(
        DEFAULT_FILTERS
      );

      setAppliedFilters(
        DEFAULT_FILTERS
      );

      setError(
        ""
      );

      setDetailOpen(
        false
      );

      setDetailData(
        null
      );

      setReportCardOpen(
        false
      );

      setReportCardData(
        null
      );
    },
    [
      studentId
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Load Results
  |--------------------------------------------------------------------------
  */

  const loadResults =
    useCallback(
      async ({
        silent = false
      } = {}) => {
        if (
          !studentId ||
          !resultsAllowed
        ) {
          setResultData(
            null
          );

          setLoading(
            false
          );

          setRefreshing(
            false
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

        if (silent) {
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
            await getParentChildResults(
              studentId,
              {
                page,
                limit:
                  PAGE_LIMIT,

                academicYear:
                  appliedFilters
                    .academicYear ||
                  undefined,

                academicTerm:
                  appliedFilters
                    .academicTerm ||
                  undefined,

                overallResultStatus:
                  appliedFilters
                    .overallResultStatus ||
                  undefined
              },
              {
                signal:
                  controller.signal
              }
            );

          setResultData(
            response?.data
              ?.data ||
              null
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

          setResultData(
            null
          );

          setError(
            getErrorMessage(
              requestError,
              "The selected child's examination results could not be loaded."
            )
          );
        } finally {
          if (
            resultsAbortRef
              .current ===
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
        studentId,
        resultsAllowed,
        page,
        appliedFilters
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
  | Derived Data
  |--------------------------------------------------------------------------
  */

  const student =
    resultData
      ?.student ||
    selectedChild
      ?.student ||
    null;

  const link =
    resultData
      ?.link ||
    selectedChild
      ?.link ||
    null;

  const summary = {
    ...DEFAULT_SUMMARY,
    ...(
      resultData
        ?.summary ||
      {}
    )
  };

  const results =
    Array.isArray(
      resultData
        ?.results
    )
      ? resultData.results
      : [];

  const pagination = {
    ...DEFAULT_PAGINATION,
    ...(
      resultData
        ?.pagination ||
      {}
    )
  };

  const paginationForComponent =
    useMemo(
      () => ({
        page:
          pagination.page ||
          1,

        limit:
          pagination.limit ||
          PAGE_LIMIT,

        total:
          pagination.totalRecords ||
          0,

        totalPages:
          pagination.totalPages ||
          1
      }),
      [
        pagination
      ]
    );

  const school =
    overview?.school ||
    student?.school ||
    {};

  /*
  |--------------------------------------------------------------------------
  | Child Change
  |--------------------------------------------------------------------------
  */

  const handleChildChange =
    (
      event
    ) => {
      const nextChildId =
        event.target.value;

      if (
        typeof setSelectedChildId ===
        "function"
      ) {
        setSelectedChildId(
          nextChildId
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

  const handleApplyFilters =
    () => {
      setPage(
        1
      );

      setAppliedFilters({
        academicYear:
          normalizeText(
            filterForm
              .academicYear
          ),

        academicTerm:
          normalizeText(
            filterForm
              .academicTerm
          ),

        overallResultStatus:
          normalizeText(
            filterForm
              .overallResultStatus
          )
      });
    };

  const handleClearFilters =
    () => {
      setFilterForm(
        DEFAULT_FILTERS
      );

      setAppliedFilters(
        DEFAULT_FILTERS
      );

      setPage(
        1
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Refresh
  |--------------------------------------------------------------------------
  */

  const handleRefresh =
    async () => {
      const tasks = [
        loadResults({
          silent: true
        })
      ];

      if (
        typeof refreshOverview ===
        "function"
      ) {
        tasks.push(
          refreshOverview()
        );
      }

      await Promise.allSettled(
        tasks
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Open Result Detail
  |--------------------------------------------------------------------------
  */

  const openResultDetail =
    async (
      result
    ) => {
      const resultId =
        getRecordId(
          result
        );

      if (
        !studentId ||
        !resultId
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

      setDetailOpen(
        true
      );

      setDetailLoading(
        true
      );

      setDetailData(
        null
      );

      try {
        const response =
          await getParentChildResultById(
            studentId,
            resultId,
            {
              signal:
                controller.signal
            }
          );

        setDetailData(
          response?.data
            ?.data ||
            null
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

        setDetailOpen(
          false
        );

        setToast({
          type: "error",

          message:
            getErrorMessage(
              requestError,
              "The child's result details could not be loaded."
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
  | Open Report Card
  |--------------------------------------------------------------------------
  */

  const openReportCard =
    async (
      reportCard
    ) => {
      const reportCardId =
        getRecordId(
          reportCard
        );

      if (
        !studentId ||
        !reportCardId
      ) {
        setToast({
          type: "error",

          message:
            "A published report card is not available for this result yet."
        });

        return;
      }

      reportCardAbortRef
        .current
        ?.abort();

      const controller =
        new AbortController();

      reportCardAbortRef.current =
        controller;

      setReportCardOpen(
        true
      );

      setReportCardLoading(
        true
      );

      setReportCardData(
        null
      );

      try {
        const response =
          await getParentChildReportCardById(
            studentId,
            reportCardId,
            {
              signal:
                controller.signal
            }
          );

        setReportCardData(
          response?.data
            ?.data ||
            null
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

        setReportCardOpen(
          false
        );

        setToast({
          type: "error",

          message:
            getErrorMessage(
              requestError,
              "The child's report card could not be loaded."
            )
        });
      } finally {
        if (
          reportCardAbortRef
            .current ===
          controller
        ) {
          setReportCardLoading(
            false
          );
        }
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Print Report Card
  |--------------------------------------------------------------------------
  */

  const printReportCard =
    (
      reportCard
    ) => {
      if (!reportCard) {
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
            "The browser blocked the print window. Allow pop-ups and try again."
        });

        return;
      }

      printWindow.document.open();

      printWindow.document.write(
        buildPrintableReportCardHtml(
          reportCard
        )
      );

      printWindow.document.close();
    };

  /*
  |--------------------------------------------------------------------------
  | Download Report Card
  |--------------------------------------------------------------------------
  */

  const downloadReportCard =
    (
      reportCard
    ) => {
      const documentUrl =
        reportCard
          ?.document
          ?.url;

      if (
        reportCard
          ?.canDownload &&
        reportCard
          ?.document
          ?.available &&
        documentUrl
      ) {
        window.open(
          documentUrl,
          "_blank"
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Browser PDF Fallback
      |--------------------------------------------------------------------------
      */

      printReportCard(
        reportCard
      );
    };

  /*
  |--------------------------------------------------------------------------
  | No Linked Children
  |--------------------------------------------------------------------------
  */

  if (
    !children ||
    children.length ===
      0
  ) {
    return (
      <div className="card grid min-h-[480px] place-items-center p-8 text-center">
        <div className="max-w-lg">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-brand-50 text-brand-700">
            <UsersRound
              size={34}
            />
          </div>

          <h2 className="mt-6 text-xl font-black text-slate-900">
            No Child Is Linked
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            No verified student profile is currently connected with this parent account. Please contact the school administration to link your child.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <ShieldCheck
              size={18}
            />

            Parent account is secure
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Permission Denied
  |--------------------------------------------------------------------------
  */

  if (
    !resultsAllowed
  ) {
    return (
      <div className="space-y-5">
        <section className="card p-5 sm:p-6">
          <label className="field-label">
            Select Child
          </label>

          <div className="relative mt-1 max-w-xl">
            <select
              className="field-select appearance-none pr-10"
              value={
                studentId
              }
              onChange={
                handleChildChange
              }
            >
              {children.map(
                (
                  child
                ) => (
                  <option
                    key={
                      child
                        ?.student
                        ?.id
                    }
                    value={
                      child
                        ?.student
                        ?.id ||
                      ""
                    }
                  >
                    {child
                      ?.student
                      ?.name ||
                      "Student"}
                    {child
                      ?.student
                      ?.class
                      ?.className
                      ? ` · ${child.student.class.className}`
                      : ""}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </section>

        <div className="card grid min-h-[420px] place-items-center p-8 text-center">
          <div className="max-w-lg">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-amber-50 text-amber-700">
              <ShieldCheck
                size={34}
              />
            </div>

            <h2 className="mt-6 text-xl font-black text-slate-900">
              Academic Results Access Is Restricted
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              Your parent account is linked with this child, but academic-result access has not been enabled for this parent–student relationship.
            </p>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              Contact the school administration if you believe this permission should be enabled.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Initial Loading
  |--------------------------------------------------------------------------
  */

  if (
    loading &&
    !resultData
  ) {
    return (
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-3xl bg-slate-200/70" />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({
            length: 5
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl bg-slate-200/70"
              />
            )
          )}
        </div>

        <div className="card space-y-3 p-5">
          {Array.from({
            length: 5
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl bg-slate-100"
              />
            )
          )}
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
            setToast(
              null
            )
        }
      />

      {/*
      |--------------------------------------------------------------------------
      | Child Selector
      |--------------------------------------------------------------------------
      */}

      <section className="card p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-xl">
            <label className="field-label">
              Select Child
            </label>

            <div className="relative mt-1">
              <select
                className="field-select appearance-none pr-10"
                value={
                  studentId
                }
                onChange={
                  handleChildChange
                }
                disabled={
                  loading ||
                  refreshing
                }
              >
                {children.map(
                  (
                    child
                  ) => {
                    const childStudent =
                      child
                        ?.student ||
                      {};

                    return (
                      <option
                        key={
                          childStudent.id
                        }
                        value={
                          childStudent.id ||
                          ""
                        }
                      >
                        {childStudent.name ||
                          "Student"}

                        {childStudent
                          ?.class
                          ?.className
                          ? ` · ${childStudent.class.className}`
                          : ""}

                        {childStudent
                          ?.sectionName
                          ? ` · Section ${childStudent.sectionName}`
                          : ""}
                      </option>
                    );
                  }
                )}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={
              handleRefresh
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
      </section>

      {/*
      |--------------------------------------------------------------------------
      | Child Hero
      |--------------------------------------------------------------------------
      */}

      <section className="relative overflow-hidden rounded-[30px] bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-base font-black ring-1 ring-white/10">
              {student?.photo ? (
                <img
                  src={
                    student.photo
                  }
                  alt={
                    student.name ||
                    "Student"
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(
                  student?.name
                )
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-black sm:text-2xl">
                  {student?.name ||
                    "Student Results"}
                </h2>

                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                  <ShieldCheck
                    size={12}
                  />

                  Linked Child
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                {student
                  ?.class
                  ?.className ||
                  "Class"}

                {student
                  ?.sectionName
                  ? ` · Section ${student.sectionName}`
                  : ""}

                {student
                  ?.rollNumber
                  ? ` · Roll ${student.rollNumber}`
                  : ""}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {link
                  ?.relationshipLabel
                  ? `${link.relationshipLabel} access · `
                  : ""}

                Published academic records only
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Admission
              </p>

              <p className="mt-1 text-sm font-black text-white">
                {student
                  ?.admissionNumber ||
                  "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Results
              </p>

              <p className="mt-1 text-sm font-black text-white">
                {summary.totalResults}
              </p>
            </div>

            <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center sm:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                School
              </p>

              <p className="mt-1 max-w-32 truncate text-sm font-black text-white">
                {school
                  ?.schoolName ||
                  "School"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/*
      |--------------------------------------------------------------------------
      | Error
      |--------------------------------------------------------------------------
      */}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-rose-600"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-rose-900">
                Results Could Not Be Loaded
              </p>

              <p className="mt-1 text-xs leading-5 text-rose-700">
                {error}
              </p>
            </div>

            <button
              type="button"
              className="text-xs font-bold text-rose-700 hover:underline"
              onClick={
                handleRefresh
              }
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/*
      |--------------------------------------------------------------------------
      | Summary Cards
      |--------------------------------------------------------------------------
      */}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={
            GraduationCap
          }
          label="Published Exams"
          value={
            summary.totalResults
          }
          description="Official result records"
        />

        <SummaryCard
          icon={
            CheckCircle2
          }
          label="Passed"
          value={
            summary.passCount
          }
          description="Overall pass results"
        />

        <SummaryCard
          icon={
            Award
          }
          label="Average"
          value={
            formatPercentage(
              summary.averagePercentage
            )
          }
          description="Average percentage"
        />

        <SummaryCard
          icon={
            Trophy
          }
          label="Highest"
          value={
            formatPercentage(
              summary.highestPercentage
            )
          }
          description="Highest percentage"
        />

        <SummaryCard
          icon={
            FileCheck2
          }
          label="Report Cards"
          value={
            summary.publishedReportCardCount
          }
          description="Available on this page"
        />
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Filters
      |--------------------------------------------------------------------------
      */}

      <section className="card p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Search
            size={17}
            className="text-brand-700"
          />

          <h3 className="font-black text-slate-900">
            Filter Results
          </h3>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="field-label">
              Academic Year
            </label>

            <input
              type="text"
              className="field-input"
              placeholder="e.g. 2026-2027"
              value={
                filterForm
                  .academicYear
              }
              onChange={
                (
                  event
                ) =>
                  setFilterForm(
                    (
                      current
                    ) => ({
                      ...current,

                      academicYear:
                        event.target
                          .value
                    })
                  )
              }
            />
          </div>

          <div>
            <label className="field-label">
              Academic Term
            </label>

            <input
              type="text"
              className="field-input"
              placeholder="e.g. Term 1"
              value={
                filterForm
                  .academicTerm
              }
              onChange={
                (
                  event
                ) =>
                  setFilterForm(
                    (
                      current
                    ) => ({
                      ...current,

                      academicTerm:
                        event.target
                          .value
                    })
                  )
              }
            />
          </div>

          <div>
            <label className="field-label">
              Result Status
            </label>

            <select
              className="field-select"
              value={
                filterForm
                  .overallResultStatus
              }
              onChange={
                (
                  event
                ) =>
                  setFilterForm(
                    (
                      current
                    ) => ({
                      ...current,

                      overallResultStatus:
                        event.target
                          .value
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
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={
                handleApplyFilters
              }
              disabled={
                loading
              }
            >
              <Search
                size={15}
              />

              Apply
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={
                handleClearFilters
              }
              disabled={
                loading
              }
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      {/*
      |--------------------------------------------------------------------------
      | Results List
      |--------------------------------------------------------------------------
      */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 className="font-black text-slate-900">
              Examination Results
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Published examination records for the selected child.
            </p>
          </div>

          <Badge
            tone="info"
          >
            {pagination.totalRecords} Results
          </Badge>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({
              length: 5
            }).map(
              (
                _,
                index
              ) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-2xl bg-slate-100"
                />
              )
            )}
          </div>
        ) : results.length ===
          0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <GraduationCap
                size={30}
                className="text-slate-400"
              />
            </div>

            <h3 className="mt-4 text-lg font-black text-slate-800">
              No Published Results
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              No examination results match the selected filters. Results appear here after the school officially publishes them.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 p-4 sm:p-5">
              {results.map(
                (
                  result
                ) => {
                  const reportCard =
                    result.reportCard;

                  const hasReportCard =
                    Boolean(
                      reportCard
                        ?.id
                    );

                  return (
                    <article
                      key={
                        getRecordId(
                          result
                        )
                      }
                      className="overflow-hidden rounded-2xl border border-slate-200 transition hover:border-brand-200 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                            <BookOpenCheck
                              size={22}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="truncate text-base font-black text-slate-900">
                                {result
                                  ?.exam
                                  ?.examName ||
                                  "Examination"}
                              </h4>

                              <ResultStatusBadge
                                status={
                                  result.overallResultStatus
                                }
                              />
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {result
                                ?.exam
                                ?.examCode ||
                                "No exam code"}

                              {result
                                ?.exam
                                ?.academicYear
                                ? ` · ${result.exam.academicYear}`
                                : ""}

                              {result
                                ?.exam
                                ?.academicTerm
                                ? ` · ${result.exam.academicTerm}`
                                : ""}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
                              {result
                                ?.class
                                ?.className ||
                                student
                                  ?.class
                                  ?.className ||
                                "Class"}

                              {result
                                ?.sectionName
                                ? ` · Section ${result.sectionName}`
                                : ""}

                              {result
                                ?.exam
                                ?.publishedAt
                                ? ` · Published ${formatDate(
                                    result.exam.publishedAt
                                  )}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[470px]">
                          <div className="rounded-xl bg-slate-50 p-3 text-center">
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              Marks
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-900">
                              {formatNumber(
                                result
                                  ?.totals
                                  ?.totalObtainedMarks
                              )}

                              <span className="text-xs font-medium text-slate-400">
                                {" "}
                                /{" "}
                                {formatNumber(
                                  result
                                    ?.totals
                                    ?.totalMaxMarks
                                )}
                              </span>
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3 text-center">
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              Percentage
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-900">
                              {formatPercentage(
                                result
                                  ?.totals
                                  ?.percentage
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3 text-center">
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              Grade
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-900">
                              {result
                                ?.overallGrade
                                ?.grade ||
                                "—"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3 text-center">
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              Position
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-900">
                              {result
                                ?.positions
                                ?.classPosition ||
                                result
                                  ?.positions
                                  ?.sectionPosition ||
                                "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">
                          <span>
                            Subjects:{" "}
                            <strong className="text-slate-700">
                              {result
                                ?.totals
                                ?.subjectCount ||
                                0}
                            </strong>
                          </span>

                          <span>
                            Passed:{" "}
                            <strong className="text-emerald-700">
                              {result
                                ?.totals
                                ?.passedSubjectCount ||
                                0}
                            </strong>
                          </span>

                          <span>
                            Failed:{" "}
                            <strong className="text-rose-700">
                              {result
                                ?.totals
                                ?.failedSubjectCount ||
                                0}
                            </strong>
                          </span>

                          {result
                            ?.totals
                            ?.gradePointAverage !==
                            null &&
                            result
                              ?.totals
                              ?.gradePointAverage !==
                              undefined && (
                              <span>
                                GPA:{" "}
                                <strong className="text-slate-700">
                                  {formatNumber(
                                    result
                                      .totals
                                      .gradePointAverage
                                  )}
                                </strong>
                              </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
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
                              size={15}
                            />

                            View Result
                          </button>

                          {hasReportCard ? (
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={
                                () =>
                                  openReportCard(
                                    reportCard
                                  )
                              }
                            >
                              <FileText
                                size={15}
                              />

                              Report Card
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400">
                              <FileText
                                size={14}
                              />

                              Report Card Pending
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>

            <Pagination
              pagination={
                paginationForComponent
              }
              onPageChange={
                (
                  nextPage
                ) => {
                  setPage(
                    nextPage
                  );

                  window.scrollTo({
                    top: 0,
                    behavior:
                      "smooth"
                  });
                }
              }
              disabled={
                loading ||
                refreshing
              }
            />
          </>
        )}
      </section>

      {/*
      |--------------------------------------------------------------------------
      | Security Information
      |--------------------------------------------------------------------------
      */}

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-emerald-700"
          />

          <div>
            <p className="text-sm font-bold text-emerald-900">
              Secure Parent Access
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-700">
              Results are shown only after the parent–student relationship is verified by the school. Selecting or changing a student ID in the browser does not grant access to another student's academic record.
            </p>
          </div>
        </div>
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Result Detail Modal
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
        title="Examination Result"
        width="max-w-6xl"
      >
        {detailLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2
              size={30}
              className="animate-spin text-brand-700"
            />
          </div>
        ) : !detailData
          ?.result ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Result details are unavailable.
          </div>
        ) : (
          <div className="space-y-5">
            {/*
            |--------------------------------------------------------------------------
            | Detail Header
            |--------------------------------------------------------------------------
            */}

            <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black">
                      {detailData
                        .result
                        ?.exam
                        ?.examName ||
                        "Examination"}
                    </h3>

                    <ResultStatusBadge
                      status={
                        detailData
                          .result
                          .overallResultStatus
                      }
                    />
                  </div>

                  <p className="mt-1 text-xs text-slate-300">
                    {detailData
                      .student
                      ?.name ||
                      student
                        ?.name ||
                      "Student"}

                    {" · "}

                    {detailData
                      .result
                      ?.exam
                      ?.examCode ||
                      "No code"}

                    {detailData
                      .result
                      ?.exam
                      ?.academicYear
                      ? ` · ${detailData.result.exam.academicYear}`
                      : ""}

                    {detailData
                      .result
                      ?.exam
                      ?.academicTerm
                      ? ` · ${detailData.result.exam.academicTerm}`
                      : ""}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400">
                    {detailData
                      .result
                      ?.class
                      ?.className ||
                      "Class"}

                    {detailData
                      .result
                      ?.sectionName
                      ? ` · Section ${detailData.result.sectionName}`
                      : ""}
                  </p>
                </div>

                {detailData
                  .reportCard
                  ?.id && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                    onClick={
                      () =>
                        openReportCard(
                          detailData
                            .reportCard
                        )
                    }
                  >
                    <FileText
                      size={16}
                    />

                    Open Report Card
                  </button>
                )}
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Result Totals
            |--------------------------------------------------------------------------
            */}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard
                icon={
                  Award
                }
                label="Obtained"
                value={`${formatNumber(
                  detailData
                    .result
                    ?.totals
                    ?.totalObtainedMarks
                )} / ${formatNumber(
                  detailData
                    .result
                    ?.totals
                    ?.totalMaxMarks
                )}`}
              />

              <SummaryCard
                icon={
                  Sparkles
                }
                label="Percentage"
                value={
                  formatPercentage(
                    detailData
                      .result
                      ?.totals
                      ?.percentage
                  )
                }
              />

              <SummaryCard
                icon={
                  GraduationCap
                }
                label="Grade"
                value={
                  detailData
                    .result
                    ?.overallGrade
                    ?.grade ||
                  "—"
                }
              />

              <SummaryCard
                icon={
                  Medal
                }
                label="Class Position"
                value={
                  detailData
                    .result
                    ?.positions
                    ?.classPosition ||
                  "—"
                }
              />

              <SummaryCard
                icon={
                  Trophy
                }
                label="Section Position"
                value={
                  detailData
                    .result
                    ?.positions
                    ?.sectionPosition ||
                  "—"
                }
              />
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Subject Results
            |--------------------------------------------------------------------------
            */}

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <BookOpenCheck
                    size={17}
                    className="text-brand-700"
                  />

                  <h4 className="font-black text-slate-900">
                    Subject Results
                  </h4>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="bg-slate-50/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                        Subject
                      </th>

                      <th className="px-3 py-3 text-center text-xs font-bold uppercase text-slate-500">
                        Max
                      </th>

                      <th className="px-3 py-3 text-center text-xs font-bold uppercase text-slate-500">
                        Pass
                      </th>

                      <th className="px-3 py-3 text-center text-xs font-bold uppercase text-slate-500">
                        Obtained
                      </th>

                      <th className="px-3 py-3 text-center text-xs font-bold uppercase text-slate-500">
                        %
                      </th>

                      <th className="px-3 py-3 text-center text-xs font-bold uppercase text-slate-500">
                        Grade
                      </th>

                      <th className="px-3 py-3 text-center text-xs font-bold uppercase text-slate-500">
                        Result
                      </th>

                      <th className="px-3 py-3 text-left text-xs font-bold uppercase text-slate-500">
                        Remarks
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {(
                      detailData
                        .result
                        ?.subjectResults ||
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
                            `${subject.subjectName}-${index}`
                          }
                        >
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800">
                              {subject.subjectName ||
                                "Subject"}
                            </p>

                            <div className="mt-1 flex flex-wrap gap-1">
                              {subject.subjectCode && (
                                <span className="text-[10px] text-slate-400">
                                  {subject.subjectCode}
                                </span>
                              )}

                              {subject.isOptional && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                                  Optional
                                </span>
                              )}

                              {subject.countsInTotal ===
                                false && (
                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                                  Not in total
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3 text-center">
                            {formatNumber(
                              subject.maxMarks
                            )}
                          </td>

                          <td className="px-3 py-3 text-center">
                            {formatNumber(
                              subject.passingMarks
                            )}
                          </td>

                          <td className="px-3 py-3 text-center font-black text-slate-800">
                            {formatNumber(
                              subject.obtainedMarks
                            )}
                          </td>

                          <td className="px-3 py-3 text-center">
                            {formatPercentage(
                              subject.percentage
                            )}
                          </td>

                          <td className="px-3 py-3 text-center font-black">
                            {subject
                              ?.grade
                              ?.grade ||
                              "—"}
                          </td>

                          <td className="px-3 py-3 text-center">
                            <SubjectStatusBadge
                              status={
                                subject.resultStatus
                              }
                            />
                          </td>

                          <td className="px-3 py-3 text-xs text-slate-500">
                            {subject.teacherRemarks ||
                              subject.principalRemarks ||
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
            | Academic Summary + Exam Information
            |--------------------------------------------------------------------------
            */}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <GraduationCap
                    size={17}
                    className="text-brand-700"
                  />

                  <h4 className="font-black text-slate-900">
                    Academic Summary
                  </h4>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Subjects
                    </p>

                    <p className="mt-1 text-lg font-black">
                      {detailData
                        .result
                        ?.totals
                        ?.subjectCount ||
                        0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Passed
                    </p>

                    <p className="mt-1 text-lg font-black text-emerald-700">
                      {detailData
                        .result
                        ?.totals
                        ?.passedSubjectCount ||
                        0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Failed
                    </p>

                    <p className="mt-1 text-lg font-black text-rose-700">
                      {detailData
                        .result
                        ?.totals
                        ?.failedSubjectCount ||
                        0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      GPA
                    </p>

                    <p className="mt-1 text-lg font-black">
                      {detailData
                        .result
                        ?.totals
                        ?.gradePointAverage !==
                        null &&
                      detailData
                        .result
                        ?.totals
                        ?.gradePointAverage !==
                        undefined
                        ? formatNumber(
                            detailData
                              .result
                              .totals
                              .gradePointAverage
                          )
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <CalendarDays
                    size={17}
                    className="text-blue-700"
                  />

                  <h4 className="font-black text-slate-900">
                    Examination Information
                  </h4>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Start Date
                    </span>

                    <strong className="text-slate-800">
                      {formatDate(
                        detailData
                          .result
                          ?.exam
                          ?.startDate
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      End Date
                    </span>

                    <strong className="text-slate-800">
                      {formatDate(
                        detailData
                          .result
                          ?.exam
                          ?.endDate
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Published
                    </span>

                    <strong className="text-right text-slate-800">
                      {formatDateTime(
                        detailData
                          .result
                          ?.publishedAt
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Attendance Summary
            |--------------------------------------------------------------------------
            */}

            {detailData
              .result
              ?.attendanceSummary && (
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <CalendarDays
                    size={17}
                    className="text-emerald-700"
                  />

                  <h4 className="font-black text-slate-900">
                    Attendance Summary
                  </h4>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Working
                    </p>

                    <p className="mt-1 text-lg font-black">
                      {detailData
                        .result
                        .attendanceSummary
                        ?.workingDays ||
                        0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Present
                    </p>

                    <p className="mt-1 text-lg font-black text-emerald-700">
                      {detailData
                        .result
                        .attendanceSummary
                        ?.presentDays ||
                        0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Absent
                    </p>

                    <p className="mt-1 text-lg font-black text-rose-700">
                      {detailData
                        .result
                        .attendanceSummary
                        ?.absentDays ||
                        0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Attendance
                    </p>

                    <p className="mt-1 text-lg font-black">
                      {formatPercentage(
                        detailData
                          .result
                          .attendanceSummary
                          ?.attendancePercentage
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/*
            |--------------------------------------------------------------------------
            | Remarks
            |--------------------------------------------------------------------------
            */}

            {(
              detailData
                .result
                ?.classTeacherRemarks ||
              detailData
                .result
                ?.principalRemarks
            ) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Class Teacher Remarks
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {detailData
                      .result
                      ?.classTeacherRemarks ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Principal Remarks
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {detailData
                      .result
                      ?.principalRemarks ||
                      "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/*
      |--------------------------------------------------------------------------
      | Report Card Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={
          reportCardOpen
        }
        onClose={
          () => {
            reportCardAbortRef
              .current
              ?.abort();

            setReportCardOpen(
              false
            );
          }
        }
        title="Official Report Card"
        width="max-w-6xl"
      >
        {reportCardLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2
              size={30}
              className="animate-spin text-brand-700"
            />
          </div>
        ) : !reportCardData
          ?.reportCard ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Report card is unavailable.
          </div>
        ) : (
          <div className="space-y-5">
            {/*
            |--------------------------------------------------------------------------
            | Report Card Actions
            |--------------------------------------------------------------------------
            */}

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-slate-900">
                    {reportCardData
                      .reportCard
                      .reportCardNumber}
                  </p>

                  <Badge
                    tone="success"
                  >
                    Published
                  </Badge>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {reportCardData
                    ?.student
                    ?.name ||
                    student
                      ?.name ||
                    "Student"}

                  {" · Version "}

                  {reportCardData
                    .reportCard
                    .versionNumber ||
                    1}

                  {" · Published "}

                  {formatDateTime(
                    reportCardData
                      .reportCard
                      ?.publication
                      ?.publishedAt
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={
                    () =>
                      printReportCard(
                        reportCardData
                          .reportCard
                      )
                  }
                >
                  <Printer
                    size={15}
                  />

                  Print / PDF
                </button>

                {reportCardData
                  .reportCard
                  .canDownload && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={
                      () =>
                        downloadReportCard(
                          reportCardData
                            .reportCard
                        )
                    }
                  >
                    <Download
                      size={15}
                    />

                    Download
                  </button>
                )}
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Official Preview
            |--------------------------------------------------------------------------
            */}

            <div className="overflow-hidden rounded-2xl border-2 border-slate-800 bg-white">
              <div className="grid grid-cols-[70px_1fr_70px] items-center gap-3 border-b-2 border-slate-800 p-4 sm:grid-cols-[90px_1fr_90px] sm:p-5">
                <div className="flex justify-center">
                  {reportCardData
                    .reportCard
                    ?.snapshot
                    ?.school
                    ?.logoUrl ? (
                    <img
                      src={
                        reportCardData
                          .reportCard
                          .snapshot
                          .school
                          .logoUrl
                      }
                      alt="School"
                      className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 text-[9px] font-black text-slate-400 sm:h-20 sm:w-20">
                      SCHOOL
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <h2 className="text-base font-black text-slate-900 sm:text-2xl">
                    {reportCardData
                      .reportCard
                      ?.snapshot
                      ?.school
                      ?.schoolName ||
                      school
                        ?.schoolName ||
                      "School"}
                  </h2>

                  {reportCardData
                    .reportCard
                    ?.snapshot
                    ?.school
                    ?.address && (
                    <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                      {
                        reportCardData
                          .reportCard
                          .snapshot
                          .school
                          .address
                      }
                    </p>
                  )}

                  <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-slate-700 sm:text-sm">
                    Report Card
                  </p>

                  <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                    {reportCardData
                      .reportCard
                      ?.snapshot
                      ?.exam
                      ?.examName ||
                      "Examination"}

                    {" · "}

                    {reportCardData
                      .reportCard
                      ?.snapshot
                      ?.exam
                      ?.academicYear ||
                      ""}
                  </p>
                </div>

                <div className="flex justify-end">
                  {reportCardData
                    .reportCard
                    ?.snapshot
                    ?.student
                    ?.photoUrl ? (
                    <img
                      src={
                        reportCardData
                          .reportCard
                          .snapshot
                          .student
                          .photoUrl
                      }
                      alt="Student"
                      className="h-20 w-16 rounded-lg border border-slate-200 object-cover sm:h-24 sm:w-20"
                    />
                  ) : (
                    <div className="flex h-20 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-black text-slate-500 sm:h-24 sm:w-20">
                      {getInitials(
                        reportCardData
                          .reportCard
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
              | Student Identity
              |--------------------------------------------------------------------------
              */}

              <div className="grid border-b border-slate-200 sm:grid-cols-2">
                {[
                  [
                    "Student Name",
                    reportCardData
                      .reportCard
                      ?.snapshot
                      ?.student
                      ?.studentName
                  ],

                  [
                    "Father / Guardian",
                    reportCardData
                      .reportCard
                      ?.snapshot
                      ?.student
                      ?.fatherName ||
                    reportCardData
                      .reportCard
                      ?.snapshot
                      ?.student
                      ?.guardianName
                  ],

                  [
                    "Admission Number",
                    reportCardData
                      .reportCard
                      ?.snapshot
                      ?.student
                      ?.admissionNumber
                  ],

                  [
                    "Roll Number",
                    reportCardData
                      .reportCard
                      ?.snapshot
                      ?.student
                      ?.rollNumber
                  ],

                  [
                    "Class",
                    reportCardData
                      .reportCard
                      ?.snapshot
                      ?.student
                      ?.className
                  ],

                  [
                    "Section",
                    reportCardData
                      .reportCard
                      ?.snapshot
                      ?.student
                      ?.sectionName
                  ]
                ].map(
                  (
                    [
                      label,
                      value
                    ]
                  ) => (
                    <div
                      key={
                        label
                      }
                      className="border-b border-slate-100 px-4 py-3 sm:border-r"
                    >
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        {label}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {value ||
                          "—"}
                      </p>
                    </div>
                  )
                )}
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Subjects Table
              |--------------------------------------------------------------------------
              */}

              <div className="overflow-x-auto p-4 sm:p-5">
                <table className="w-full min-w-[820px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 px-3 py-2 text-left text-xs font-bold text-slate-600">
                        Subject
                      </th>

                      <th className="border border-slate-300 px-3 py-2 text-center text-xs font-bold text-slate-600">
                        Max
                      </th>

                      <th className="border border-slate-300 px-3 py-2 text-center text-xs font-bold text-slate-600">
                        Pass
                      </th>

                      <th className="border border-slate-300 px-3 py-2 text-center text-xs font-bold text-slate-600">
                        Obtained
                      </th>

                      <th className="border border-slate-300 px-3 py-2 text-center text-xs font-bold text-slate-600">
                        %
                      </th>

                      <th className="border border-slate-300 px-3 py-2 text-center text-xs font-bold text-slate-600">
                        Grade
                      </th>

                      <th className="border border-slate-300 px-3 py-2 text-center text-xs font-bold text-slate-600">
                        Result
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {(
                      reportCardData
                        .reportCard
                        ?.snapshot
                        ?.subjectResults ||
                      []
                    )
                      .slice()
                      .sort(
                        (
                          first,
                          second
                        ) =>
                          toNumber(
                            first.displayOrder
                          ) -
                          toNumber(
                            second.displayOrder
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
                              <p className="font-bold text-slate-800">
                                {subject.subjectName ||
                                  "Subject"}
                              </p>

                              {subject.subjectCode && (
                                <p className="mt-1 text-[10px] text-slate-400">
                                  {subject.subjectCode}
                                </p>
                              )}
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

                            <td className="border border-slate-300 px-3 py-2 text-center font-black">
                              {formatNumber(
                                subject.obtainedMarks
                              )}
                            </td>

                            <td className="border border-slate-300 px-3 py-2 text-center">
                              {formatPercentage(
                                subject.percentage
                              )}
                            </td>

                            <td className="border border-slate-300 px-3 py-2 text-center font-black">
                              {subject
                                ?.grade
                                ?.grade ||
                                "—"}
                            </td>

                            <td className="border border-slate-300 px-3 py-2 text-center">
                              <SubjectStatusBadge
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
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Total Marks
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-900">
                    {formatNumber(
                      reportCardData
                        .reportCard
                        ?.snapshot
                        ?.totals
                        ?.totalObtainedMarks
                    )}

                    <span className="text-sm font-medium text-slate-400">
                      {" "}
                      /{" "}
                      {formatNumber(
                        reportCardData
                          .reportCard
                          ?.snapshot
                          ?.totals
                          ?.totalMaxMarks
                      )}
                    </span>
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Percentage
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-900">
                    {formatPercentage(
                      reportCardData
                        .reportCard
                        ?.snapshot
                        ?.totals
                        ?.percentage
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Grade
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-900">
                    {reportCardData
                      .reportCard
                      ?.snapshot
                      ?.overallGrade
                      ?.grade ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Result
                  </p>

                  <div className="mt-2">
                    <ResultStatusBadge
                      status={
                        reportCardData
                          .reportCard
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
            | Position + Attendance
            |--------------------------------------------------------------------------
            */}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <Trophy
                    size={17}
                    className="text-amber-500"
                  />

                  <h4 className="font-black text-slate-900">
                    Positions
                  </h4>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-xs text-slate-400">
                      Class Position
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-900">
                      {reportCardData
                        .reportCard
                        ?.snapshot
                        ?.positions
                        ?.classPosition ||
                        "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-xs text-slate-400">
                      Section Position
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-900">
                      {reportCardData
                        .reportCard
                        ?.snapshot
                        ?.positions
                        ?.sectionPosition ||
                        "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <CalendarDays
                    size={17}
                    className="text-blue-700"
                  />

                  <h4 className="font-black text-slate-900">
                    Attendance
                  </h4>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {[
                    [
                      "Working",
                      reportCardData
                        .reportCard
                        ?.snapshot
                        ?.attendance
                        ?.workingDays
                    ],

                    [
                      "Present",
                      reportCardData
                        .reportCard
                        ?.snapshot
                        ?.attendance
                        ?.presentDays
                    ],

                    [
                      "Absent",
                      reportCardData
                        .reportCard
                        ?.snapshot
                        ?.attendance
                        ?.absentDays
                    ],

                    [
                      "Late",
                      reportCardData
                        .reportCard
                        ?.snapshot
                        ?.attendance
                        ?.lateDays
                    ],

                    [
                      "Leave",
                      reportCardData
                        .reportCard
                        ?.snapshot
                        ?.attendance
                        ?.leaveDays
                    ],

                    [
                      "%",
                      formatPercentage(
                        reportCardData
                          .reportCard
                          ?.snapshot
                          ?.attendance
                          ?.attendancePercentage
                      )
                    ]
                  ].map(
                    (
                      [
                        label,
                        value
                      ]
                    ) => (
                      <div
                        key={label}
                        className="rounded-xl bg-slate-50 p-2 text-center"
                      >
                        <p className="text-[9px] font-bold uppercase text-slate-400">
                          {label}
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-800">
                          {value ??
                            0}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Report Card Remarks
            |--------------------------------------------------------------------------
            */}

            {(
              reportCardData
                .reportCard
                ?.snapshot
                ?.classTeacherRemarks ||
              reportCardData
                .reportCard
                ?.snapshot
                ?.principalRemarks
            ) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Class Teacher Remarks
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {reportCardData
                      .reportCard
                      ?.snapshot
                      ?.classTeacherRemarks ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Principal Remarks
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {reportCardData
                      .reportCard
                      ?.snapshot
                      ?.principalRemarks ||
                      "—"}
                  </p>
                </div>
              </div>
            )}

            {/*
            |--------------------------------------------------------------------------
            | Verification
            |--------------------------------------------------------------------------
            */}

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-700"
                />

                <div className="min-w-0 flex-1">
                  <p className="font-black text-emerald-900">
                    Official Verification
                  </p>

                  <p className="mt-1 text-xs text-emerald-700">
                    Verification Code
                  </p>

                  <code className="mt-2 inline-block rounded-lg bg-white px-3 py-2 text-sm font-black tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                    {reportCardData
                      .reportCard
                      ?.verification
                      ?.verificationCode ||
                      "—"}
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ParentResults;