import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate,
  useParams
} from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Landmark,
  Printer,
  RefreshCcw,
  ShieldCheck,
  UserRound,
  WalletCards,
  X
} from "lucide-react";

import {
  getPayslip
} from "../../api/payroll";

/*
|--------------------------------------------------------------------------
| Formatting Helpers
|--------------------------------------------------------------------------
*/

const safeNumber = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

const formatMoney = (
  value,
  currency = "PKR"
) => {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",

        currency:
          currency || "PKR",

        currencyDisplay:
          "code",

        minimumFractionDigits:
          0,

        maximumFractionDigits:
          2
      }
    ).format(
      safeNumber(value)
    );
  } catch {
    return `${currency || "PKR"} ${safeNumber(
      value
    ).toLocaleString(
      "en-US"
    )}`;
  }
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
    "en-US",
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
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
};

const formatLabel = (
  value
) => {
  if (!value) {
    return "—";
  }

  return String(value)
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

const getInitials = (
  name
) => {
  return String(
    name || "Staff"
  )
    .split(" ")
    .filter(Boolean)
    .map(
      (part) =>
        part[0]
    )
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getErrorMessage = (
  error,
  fallbackMessage
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.message ||
    fallbackMessage
  );
};

const getPeriodLabel = (
  payroll
) => {
  if (
    payroll?.periodLabel
  ) {
    return payroll.periodLabel;
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  const monthIndex =
    safeNumber(
      payroll?.payrollMonth
    ) - 1;

  const month =
    monthNames[
      monthIndex
    ] || "Month";

  return `${month} ${
    payroll?.payrollYear ||
    ""
  }`.trim();
};

/*
|--------------------------------------------------------------------------
| Payroll Status Badge
|--------------------------------------------------------------------------
*/

const PayrollStatusBadge = ({
  status
}) => {
  const normalizedStatus =
    String(
      status || ""
    ).toLowerCase();

  const styles = {
    draft:
      "bg-slate-100 text-slate-600 border-slate-200",

    generated:
      "bg-blue-50 text-blue-700 border-blue-200",

    pending_approval:
      "bg-amber-50 text-amber-700 border-amber-200",

    approved:
      "bg-violet-50 text-violet-700 border-violet-200",

    rejected:
      "bg-rose-50 text-rose-700 border-rose-200",

    paid:
      "bg-emerald-50 text-emerald-700 border-emerald-200",

    cancelled:
      "bg-slate-100 text-slate-500 border-slate-200"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[
          normalizedStatus
        ] ||
        styles.draft
      }`}
    >
      {formatLabel(
        normalizedStatus
      )}
    </span>
  );
};

/*
|--------------------------------------------------------------------------
| Payslip Information Row
|--------------------------------------------------------------------------
*/

const InformationRow = ({
  label,
  value
}) => {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span className="max-w-[65%] text-right text-xs font-semibold text-slate-700">
        {value ?? "—"}
      </span>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Salary Table Row
|--------------------------------------------------------------------------
*/

const SalaryTableRow = ({
  label,
  amount,
  currency,
  note
}) => {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3">
        <p className="text-xs font-semibold text-slate-700">
          {label}
        </p>

        {note && (
          <p className="mt-0.5 text-[10px] text-slate-400">
            {note}
          </p>
        )}
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-slate-700">
        {formatMoney(
          amount,
          currency
        )}
      </td>
    </tr>
  );
};

/*
|--------------------------------------------------------------------------
| Attendance Card
|--------------------------------------------------------------------------
*/

const AttendanceCard = ({
  label,
  value,
  suffix = ""
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 text-lg font-bold text-slate-800">
        {safeNumber(value)}
        {suffix}
      </p>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Payslip Page
|--------------------------------------------------------------------------
*/

export const Payslip =
  () => {
    const navigate =
      useNavigate();

    const {
      id
    } = useParams();

    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */

    const [
      payroll,
      setPayroll
    ] = useState(null);

    const [
      isOfficial,
      setIsOfficial
    ] = useState(false);

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

    /*
    |--------------------------------------------------------------------------
    | Load Payslip
    |--------------------------------------------------------------------------
    */

    const loadPayslip =
      useCallback(
        async (
          showMainLoader =
            false
        ) => {
          if (!id) {
            setError(
              "Payroll identifier is missing."
            );

            setLoading(false);

            return;
          }

          if (showMainLoader) {
            setLoading(true);
          }

          setError("");

          try {
            const response =
              await getPayslip(
                id
              );

            const payslip =
              response?.payslip ||
              response?.payroll ||
              null;

            setPayroll(
              payslip
            );

            setIsOfficial(
              response?.isOfficial ??
                [
                  "approved",
                  "paid"
                ].includes(
                  payslip?.status
                )
            );
          } catch (
            requestError
          ) {
            setPayroll(null);

            setIsOfficial(
              false
            );

            setError(
              getErrorMessage(
                requestError,
                "Payslip could not be loaded."
              )
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        [
          id
        ]
      );

    useEffect(() => {
      loadPayslip(true);
    }, [
      loadPayslip
    ]);

    /*
    |--------------------------------------------------------------------------
    | Refresh and Print
    |--------------------------------------------------------------------------
    */

    const handleRefresh =
      () => {
        if (refreshing) {
          return;
        }

        setRefreshing(true);

        loadPayslip(false);
      };

    const handlePrint =
      () => {
        window.print();
      };

    /*
    |--------------------------------------------------------------------------
    | Derived Information
    |--------------------------------------------------------------------------
    */

    const staff =
      payroll?.staffId ||
      {};

    const school =
      payroll?.schoolId ||
      {};

    const earnings =
      payroll?.earnings ||
      {};

    const deductions =
      payroll?.deductions ||
      {};

    const attendance =
      payroll
        ?.attendanceSummary ||
      {};

    const payment =
      payroll
        ?.paymentDetails ||
      {};

    const salaryStructure =
      payroll
        ?.salaryStructureSnapshot ||
      {};

    const salaryRates =
      payroll?.salaryRates ||
      {};

    const currency =
      payroll?.currency ||
      "PKR";

    const staffName =
      staff.name ||
      payroll
        ?.staffNameSnapshot ||
      "Unknown Staff";

    const employeeId =
      staff.employeeId ||
      payroll
        ?.employeeIdSnapshot ||
      "—";

    const department =
      staff.department ||
      payroll
        ?.departmentSnapshot ||
      "—";

    const designation =
      staff.designation ||
      payroll
        ?.designationSnapshot ||
      "—";

    const category =
      staff.category ||
      payroll
        ?.categorySnapshot ||
      "—";

    const schoolName =
      school.schoolName ||
      school.name ||
      "School / Madrasa";

    const schoolCode =
      school.schoolCode ||
      school.code ||
      "";

    const schoolLogo =
      school.logo ||
      school.schoolLogo ||
      school.image ||
      "";

    const schoolAddress =
      typeof school.address ===
      "string"
        ? school.address
        : [
            school.address?.street,
            school.address?.city,
            school.address?.state,
            school.address?.country
          ]
            .filter(Boolean)
            .join(", ");

    const grossEarnings =
      safeNumber(
        earnings.grossEarnings ??
          salaryStructure
            .grossSalary
      );

    const totalDeductions =
      safeNumber(
        deductions
          .totalDeductions
      );

    const netSalary =
      safeNumber(
        payroll?.netSalary
      );

    const standardWorkingDays =
      safeNumber(
        attendance
          .standardWorkingDays
      );

    const payableDays =
      safeNumber(
        attendance.payableDays
      );

    const attendancePercentage =
      standardWorkingDays > 0
        ? Math.min(
            100,
            Math.max(
              0,
              (
                payableDays /
                standardWorkingDays
              ) *
                100
            )
          )
        : 0;

    /*
    |--------------------------------------------------------------------------
    | Earnings Rows
    |--------------------------------------------------------------------------
    */

    const earningItems =
      useMemo(() => {
        if (!payroll) {
          return [];
        }

        const allowances =
          earnings.allowances ||
          {};

        const fixedItems = [
          {
            label:
              "Basic Salary",

            amount:
              earnings.basicSalary,

            note:
              "Monthly basic salary"
          },

          {
            label:
              "House Rent Allowance",

            amount:
              allowances
                .houseRent
          },

          {
            label:
              "Medical Allowance",

            amount:
              allowances.medical
          },

          {
            label:
              "Transport Allowance",

            amount:
              allowances
                .transport
          },

          {
            label:
              "Food Allowance",

            amount:
              allowances.food
          },

          {
            label:
              "Communication Allowance",

            amount:
              allowances
                .communication
          },

          {
            label:
              "Special Allowance",

            amount:
              allowances.special
          },

          {
            label:
              "Overtime Pay",

            amount:
              earnings.overtimePay,

            note:
              safeNumber(
                attendance
                  .totalOvertimeMinutes
              ) > 0
                ? `${safeNumber(
                    attendance
                      .totalOvertimeMinutes
                  )} overtime minutes`
                : ""
          },

          {
            label:
              "Bonus",

            amount:
              earnings.bonus
          },

          {
            label:
              "Arrears",

            amount:
              earnings.arrears
          },

          {
            label:
              "Reimbursements",

            amount:
              earnings
                .reimbursements
          },

          {
            label:
              "Incentives",

            amount:
              earnings.incentives
          }
        ].filter(
          (item) =>
            safeNumber(
              item.amount
            ) !== 0
        );

        const otherAllowances =
          Array.isArray(
            allowances.other
          )
            ? allowances.other
                .map(
                  (item) => ({
                    label:
                      item.name ||
                      "Other Allowance",

                    amount:
                      item.amount,

                    note:
                      item.isTaxable
                        ? "Taxable allowance"
                        : "Non-taxable allowance"
                  })
                )
                .filter(
                  (item) =>
                    safeNumber(
                      item.amount
                    ) !== 0
                )
            : [];

        const otherEarnings =
          Array.isArray(
            earnings.other
          )
            ? earnings.other
                .map(
                  (item) => ({
                    label:
                      item.name ||
                      "Other Earning",

                    amount:
                      item.amount,

                    note:
                      formatLabel(
                        item.category
                      )
                  })
                )
                .filter(
                  (item) =>
                    safeNumber(
                      item.amount
                    ) !== 0
                )
            : [];

        return [
          ...fixedItems,
          ...otherAllowances,
          ...otherEarnings
        ];
      }, [
        payroll,
        earnings,
        attendance
      ]);

    /*
    |--------------------------------------------------------------------------
    | Deduction Rows
    |--------------------------------------------------------------------------
    */

    const deductionItems =
      useMemo(() => {
        if (!payroll) {
          return [];
        }

        const fixedItems = [
          {
            label:
              "Absence Deduction",

            amount:
              deductions
                .absenceDeduction,

            note:
              safeNumber(
                attendance.absentDays
              ) > 0
                ? `${safeNumber(
                    attendance
                      .absentDays
                  )} absent day(s)`
                : ""
          },

          {
            label:
              "Unpaid Leave Deduction",

            amount:
              deductions
                .unpaidLeaveDeduction,

            note:
              safeNumber(
                attendance
                  .unpaidLeaveDays
              ) > 0
                ? `${safeNumber(
                    attendance
                      .unpaidLeaveDays
                  )} unpaid leave day(s)`
                : ""
          },

          {
            label:
              "Half-Day Deduction",

            amount:
              deductions
                .halfDayDeduction,

            note:
              safeNumber(
                attendance.halfDays
              ) > 0
                ? `${safeNumber(
                    attendance
                      .halfDays
                  )} half day(s)`
                : ""
          },

          {
            label:
              "Late Arrival Deduction",

            amount:
              deductions
                .lateDeduction,

            note:
              safeNumber(
                attendance
                  .totalLateMinutes
              ) > 0
                ? `${safeNumber(
                    attendance
                      .totalLateMinutes
                  )} late minutes`
                : ""
          },

          {
            label:
              "Provident Fund",

            amount:
              deductions
                .providentFund
          },

          {
            label:
              "Tax",

            amount:
              deductions.tax
          },

          {
            label:
              "Insurance",

            amount:
              deductions
                .insurance
          },

          {
            label:
              "Loan Installment",

            amount:
              deductions
                .loanInstallment
          },

          {
            label:
              "Salary Advance",

            amount:
              deductions
                .salaryAdvance
          }
        ].filter(
          (item) =>
            safeNumber(
              item.amount
            ) !== 0
        );

        const otherDeductions =
          Array.isArray(
            deductions.other
          )
            ? deductions.other
                .map(
                  (item) => ({
                    label:
                      item.name ||
                      "Other Deduction",

                    amount:
                      item.amount,

                    note:
                      formatLabel(
                        item.category
                      )
                  })
                )
                .filter(
                  (item) =>
                    safeNumber(
                      item.amount
                    ) !== 0
                )
            : [];

        return [
          ...fixedItems,
          ...otherDeductions
        ];
      }, [
        payroll,
        deductions,
        attendance
      ]);

    /*
    |--------------------------------------------------------------------------
    | Loading Screen
    |--------------------------------------------------------------------------
    */

    if (loading) {
      return (
        <div className="card flex min-h-[460px] items-center justify-center">
          <div className="text-center">
            <RefreshCcw
              size={28}
              className="mx-auto animate-spin text-brand-600"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading payslip...
            </p>
          </div>
        </div>
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Missing Payslip
    |--------------------------------------------------------------------------
    */

    if (!payroll) {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/payroll"
              )
            }
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft
              size={16}
            />

            Back to Payroll
          </button>

          <div className="card flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <AlertTriangle
                size={26}
              />
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-800">
              Payslip Not Available
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {error ||
                "The requested payslip could not be found."}
            </p>

            <button
              type="button"
              onClick={() =>
                loadPayslip(
                  true
                )
              }
              className="btn-primary mt-5 inline-flex items-center gap-2"
            >
              <RefreshCcw
                size={16}
              />

              Try Again
            </button>
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
      <div className="space-y-5">
        {/*
        |--------------------------------------------------------------------------
        | Print Styles
        |--------------------------------------------------------------------------
        */}

        <style>
          {`
            @page {
              size: A4;
              margin: 10mm;
            }

            @media print {
              html,
              body {
                background: #ffffff !important;
              }

              body * {
                visibility: hidden;
              }

              .payslip-print-area,
              .payslip-print-area * {
                visibility: visible;
              }

              .payslip-print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0 !important;
                padding: 0 !important;
              }

              .payslip-sheet {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                border: 0 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
              }

              .no-print {
                display: none !important;
              }

              .print-break-inside-avoid {
                break-inside: avoid;
                page-break-inside: avoid;
              }

              .print-background {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}
        </style>

        {/*
        |--------------------------------------------------------------------------
        | Page Actions
        |--------------------------------------------------------------------------
        */}

        <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/payroll/${payroll._id}`
                )
              }
              className="mt-0.5 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Back"
            >
              <ArrowLeft
                size={18}
              />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                  Staff Payslip
                </h2>

                <PayrollStatusBadge
                  status={
                    payroll.status
                  }
                />
              </div>

              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                {payroll.payslipNumber ||
                  "Payslip Preview"}{" "}
                ·{" "}
                {getPeriodLabel(
                  payroll
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={refreshing}
              onClick={
                handleRefresh
              }
              className="btn-secondary inline-flex items-center gap-2"
            >
              <RefreshCcw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/payroll/${payroll._id}`
                )
              }
              className="btn-secondary inline-flex items-center gap-2"
            >
              <WalletCards
                size={16}
              />

              Payroll Details
            </button>

            <button
              type="button"
              onClick={
                handlePrint
              }
              className="btn-primary inline-flex items-center gap-2"
            >
              <Printer
                size={16}
              />

              Print Payslip
            </button>
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Error Message
        |--------------------------------------------------------------------------
        */}

        {error && (
          <div className="no-print flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {error}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="rounded-lg p-1 transition hover:bg-rose-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Preview Warning
        |--------------------------------------------------------------------------
        */}

        {!isOfficial && (
          <div className="no-print rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <p className="text-sm font-bold text-amber-800">
                  Preview Payslip
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  This payroll has not
                  completed the approval
                  process. The payslip is
                  currently a preview and
                  is not an official
                  payment document.
                </p>
              </div>
            </div>
          </div>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Printable Payslip
        |--------------------------------------------------------------------------
        */}

        <div className="payslip-print-area">
          <article className="payslip-sheet relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/*
            |--------------------------------------------------------------------------
            | Preview Watermark
            |--------------------------------------------------------------------------
            */}

            {!isOfficial && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
                <span className="-rotate-45 select-none text-7xl font-black uppercase tracking-[0.25em] text-slate-100/70 sm:text-9xl">
                  Preview
                </span>
              </div>
            )}

            <div className="relative z-30">
              {/*
              |--------------------------------------------------------------------------
              | Payslip Header
              |--------------------------------------------------------------------------
              */}

              <header className="print-background bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6 text-white sm:px-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    {schoolLogo ? (
                      <img
                        src={
                          schoolLogo
                        }
                        alt={
                          schoolName
                        }
                        className="h-16 w-16 shrink-0 rounded-2xl bg-white object-contain p-1.5 ring-1 ring-white/20"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
                        <Landmark
                          size={28}
                        />
                      </div>
                    )}

                    <div>
                      <h1 className="text-xl font-bold sm:text-2xl">
                        {schoolName}
                      </h1>

                      {schoolCode && (
                        <p className="mt-1 text-xs font-semibold text-slate-300">
                          School Code:{" "}
                          {schoolCode}
                        </p>
                      )}

                      {schoolAddress && (
                        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">
                          {
                            schoolAddress
                          }
                        </p>
                      )}

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        {school.phone && (
                          <span>
                            Phone:{" "}
                            {
                              school.phone
                            }
                          </span>
                        )}

                        {school.email && (
                          <span>
                            Email:{" "}
                            {
                              school.email
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Staff Payslip
                    </p>

                    <p className="mt-2 text-xl font-bold">
                      {getPeriodLabel(
                        payroll
                      )}
                    </p>

                    <div className="mt-3 flex sm:justify-end">
                      {isOfficial ? (
                        <span className="print-background inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                          <CheckCircle2
                            size={14}
                          />

                          Official Payslip
                        </span>
                      ) : (
                        <span className="print-background inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/20">
                          <AlertTriangle
                            size={14}
                          />

                          Preview
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </header>

              {/*
              |--------------------------------------------------------------------------
              | Payslip References
              |--------------------------------------------------------------------------
              */}

              <div className="print-background grid gap-px bg-slate-200 sm:grid-cols-4">
                <div className="bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Payslip Number
                  </p>

                  <p className="mt-1 text-xs font-bold text-slate-700">
                    {payroll.payslipNumber ||
                      "—"}
                  </p>
                </div>

                <div className="bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Payroll Number
                  </p>

                  <p className="mt-1 text-xs font-bold text-slate-700">
                    {payroll.payrollNumber ||
                      "—"}
                  </p>
                </div>

                <div className="bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Period
                  </p>

                  <p className="mt-1 text-xs font-bold text-slate-700">
                    {formatDate(
                      payroll.periodStart
                    )}{" "}
                    –{" "}
                    {formatDate(
                      payroll.periodEnd
                    )}
                  </p>
                </div>

                <div className="bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </p>

                  <div className="mt-1">
                    <PayrollStatusBadge
                      status={
                        payroll.status
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-5 sm:p-8">
                {/*
                |--------------------------------------------------------------------------
                | Employee Information
                |--------------------------------------------------------------------------
                */}

                <section className="print-break-inside-avoid">
                  <div className="mb-3 flex items-center gap-2">
                    <UserRound
                      size={17}
                      className="text-brand-700"
                    />

                    <h2 className="text-sm font-bold text-slate-800">
                      Employee Information
                    </h2>
                  </div>

                  <div className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                    <div>
                      {staff.photo ? (
                        <img
                          src={
                            staff.photo
                          }
                          alt={
                            staffName
                          }
                          className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="print-background flex h-16 w-16 items-center justify-center rounded-xl bg-brand-50 text-lg font-bold text-brand-700 ring-1 ring-brand-100">
                          {getInitials(
                            staffName
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Employee Name
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {staffName}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Employee ID
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {employeeId}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Department
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {department}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Designation
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {designation}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Category
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatLabel(
                            category
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Joining Date
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatDate(
                            staff.joiningDate
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Pay Frequency
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatLabel(
                            salaryStructure
                              .payFrequency ||
                              "monthly"
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Currency
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {currency}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Salary Summary
                |--------------------------------------------------------------------------
                */}

                <section className="print-break-inside-avoid">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="print-background rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <div className="flex items-center gap-2">
                        <Banknote
                          size={16}
                          className="text-blue-700"
                        />

                        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                          Basic Salary
                        </p>
                      </div>

                      <p className="mt-2 text-lg font-bold text-blue-800">
                        {formatMoney(
                          earnings.basicSalary,
                          currency
                        )}
                      </p>
                    </div>

                    <div className="print-background rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <div className="flex items-center gap-2">
                        <WalletCards
                          size={16}
                          className="text-emerald-700"
                        />

                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                          Gross Earnings
                        </p>
                      </div>

                      <p className="mt-2 text-lg font-bold text-emerald-800">
                        {formatMoney(
                          grossEarnings,
                          currency
                        )}
                      </p>
                    </div>

                    <div className="print-background rounded-xl border border-rose-100 bg-rose-50 p-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck
                          size={16}
                          className="text-rose-600"
                        />

                        <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                          Total Deductions
                        </p>
                      </div>

                      <p className="mt-2 text-lg font-bold text-rose-700">
                        {formatMoney(
                          totalDeductions,
                          currency
                        )}
                      </p>
                    </div>

                    <div className="print-background rounded-xl border border-slate-800 bg-slate-900 p-4 text-white">
                      <div className="flex items-center gap-2">
                        <CreditCard
                          size={16}
                          className="text-slate-300"
                        />

                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Net Salary
                        </p>
                      </div>

                      <p className="mt-2 text-lg font-bold">
                        {formatMoney(
                          netSalary,
                          currency
                        )}
                      </p>
                    </div>
                  </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Earnings and Deductions
                |--------------------------------------------------------------------------
                */}

                <section className="grid gap-5 lg:grid-cols-2">
                  <div className="print-break-inside-avoid overflow-hidden rounded-xl border border-slate-200">
                    <div className="print-background flex items-center justify-between bg-emerald-50 px-4 py-3">
                      <div>
                        <h2 className="text-sm font-bold text-emerald-800">
                          Earnings
                        </h2>

                        <p className="mt-0.5 text-[10px] text-emerald-600">
                          Salary and additional earnings
                        </p>
                      </div>

                      <span className="text-sm font-bold text-emerald-800">
                        {formatMoney(
                          grossEarnings,
                          currency
                        )}
                      </span>
                    </div>

                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Description
                          </th>

                          <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {earningItems.length >
                        0 ? (
                          earningItems.map(
                            (
                              item,
                              index
                            ) => (
                              <SalaryTableRow
                                key={`${item.label}-${index}`}
                                label={
                                  item.label
                                }
                                amount={
                                  item.amount
                                }
                                currency={
                                  currency
                                }
                                note={
                                  item.note
                                }
                              />
                            )
                          )
                        ) : (
                          <tr>
                            <td
                              colSpan={2}
                              className="px-4 py-8 text-center text-xs text-slate-400"
                            >
                              No earning
                              items available.
                            </td>
                          </tr>
                        )}
                      </tbody>

                      <tfoot>
                        <tr className="print-background bg-emerald-50">
                          <td className="px-4 py-3 text-xs font-bold text-emerald-800">
                            Gross Earnings
                          </td>

                          <td className="px-4 py-3 text-right text-sm font-bold text-emerald-800">
                            {formatMoney(
                              grossEarnings,
                              currency
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="print-break-inside-avoid overflow-hidden rounded-xl border border-slate-200">
                    <div className="print-background flex items-center justify-between bg-rose-50 px-4 py-3">
                      <div>
                        <h2 className="text-sm font-bold text-rose-700">
                          Deductions
                        </h2>

                        <p className="mt-0.5 text-[10px] text-rose-500">
                          Attendance and fixed deductions
                        </p>
                      </div>

                      <span className="text-sm font-bold text-rose-700">
                        {formatMoney(
                          totalDeductions,
                          currency
                        )}
                      </span>
                    </div>

                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Description
                          </th>

                          <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {deductionItems.length >
                        0 ? (
                          deductionItems.map(
                            (
                              item,
                              index
                            ) => (
                              <SalaryTableRow
                                key={`${item.label}-${index}`}
                                label={
                                  item.label
                                }
                                amount={
                                  item.amount
                                }
                                currency={
                                  currency
                                }
                                note={
                                  item.note
                                }
                              />
                            )
                          )
                        ) : (
                          <tr>
                            <td
                              colSpan={2}
                              className="px-4 py-8 text-center text-xs text-slate-400"
                            >
                              No deductions
                              were applied.
                            </td>
                          </tr>
                        )}
                      </tbody>

                      <tfoot>
                        <tr className="print-background bg-rose-50">
                          <td className="px-4 py-3 text-xs font-bold text-rose-700">
                            Total Deductions
                          </td>

                          <td className="px-4 py-3 text-right text-sm font-bold text-rose-700">
                            {formatMoney(
                              totalDeductions,
                              currency
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Final Net Salary
                |--------------------------------------------------------------------------
                */}

                <section className="print-break-inside-avoid">
                  <div className="print-background flex flex-col gap-4 rounded-xl bg-slate-900 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                        Final Net Salary
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Gross earnings minus
                        deductions and including
                        rounding adjustment
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-2xl font-bold sm:text-3xl">
                        {formatMoney(
                          netSalary,
                          currency
                        )}
                      </p>

                      {safeNumber(
                        payroll
                          .roundingAdjustment
                      ) !== 0 && (
                        <p className="mt-1 text-xs text-slate-400">
                          Rounding Adjustment:{" "}
                          {formatMoney(
                            payroll
                              .roundingAdjustment,
                            currency
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Attendance Summary
                |--------------------------------------------------------------------------
                */}

                <section className="print-break-inside-avoid">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays
                        size={17}
                        className="text-brand-700"
                      />

                      <h2 className="text-sm font-bold text-slate-800">
                        Attendance Summary
                      </h2>
                    </div>

                    <span className="text-xs font-bold text-slate-700">
                      {attendancePercentage.toFixed(
                        1
                      )}
                      %
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    <AttendanceCard
                      label="Working Days"
                      value={
                        attendance
                          .standardWorkingDays
                      }
                    />

                    <AttendanceCard
                      label="Recorded Days"
                      value={
                        attendance
                          .recordedAttendanceDays
                      }
                    />

                    <AttendanceCard
                      label="Present"
                      value={
                        attendance
                          .presentDays
                      }
                    />

                    <AttendanceCard
                      label="Absent"
                      value={
                        attendance
                          .absentDays
                      }
                    />

                    <AttendanceCard
                      label="Late"
                      value={
                        attendance
                          .lateDays
                      }
                    />

                    <AttendanceCard
                      label="Payable Days"
                      value={
                        attendance
                          .payableDays
                      }
                    />

                    <AttendanceCard
                      label="Paid Leave"
                      value={
                        attendance
                          .paidLeaveDays
                      }
                    />

                    <AttendanceCard
                      label="Unpaid Leave"
                      value={
                        attendance
                          .unpaidLeaveDays
                      }
                    />

                    <AttendanceCard
                      label="Half Days"
                      value={
                        attendance
                          .halfDays
                      }
                    />

                    <AttendanceCard
                      label="Late Minutes"
                      value={
                        attendance
                          .totalLateMinutes
                      }
                    />

                    <AttendanceCard
                      label="Overtime"
                      value={
                        attendance
                          .totalOvertimeMinutes
                      }
                      suffix="m"
                    />

                    <AttendanceCard
                      label="Unmarked"
                      value={
                        attendance
                          .unmarkedDays
                      }
                    />
                  </div>

                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="print-background h-full rounded-full bg-brand-600"
                        style={{
                          width: `${attendancePercentage}%`
                        }}
                      />
                    </div>
                  </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Salary Rates and Payment
                |--------------------------------------------------------------------------
                */}

                <section className="grid gap-5 lg:grid-cols-2">
                  <div className="print-break-inside-avoid rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Clock3
                        size={16}
                        className="text-brand-700"
                      />

                      <h2 className="text-sm font-bold text-slate-800">
                        Salary Rates
                      </h2>
                    </div>

                    <InformationRow
                      label="Daily Rate"
                      value={formatMoney(
                        salaryRates
                          .dailyRate,
                        currency
                      )}
                    />

                    <InformationRow
                      label="Hourly Rate"
                      value={formatMoney(
                        salaryRates
                          .hourlyRate,
                        currency
                      )}
                    />

                    <InformationRow
                      label="Overtime Rate"
                      value={formatMoney(
                        salaryRates
                          .overtimeHourlyRate,
                        currency
                      )}
                    />

                    <InformationRow
                      label="Daily Rate Basis"
                      value={formatLabel(
                        salaryRates
                          .dailyRateBasis ||
                          salaryStructure
                            .dailyRateBasis
                      )}
                    />

                    <InformationRow
                      label="Calculation Basis"
                      value={formatLabel(
                        salaryStructure
                          .calculationBasis
                      )}
                    />
                  </div>

                  <div className="print-break-inside-avoid rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CreditCard
                        size={16}
                        className="text-emerald-700"
                      />

                      <h2 className="text-sm font-bold text-slate-800">
                        Payment Information
                      </h2>
                    </div>

                    <InformationRow
                      label="Payment Status"
                      value={
                        payroll.status ===
                        "paid"
                          ? "Paid"
                          : "Not Paid"
                      }
                    />

                    <InformationRow
                      label="Payment Method"
                      value={formatLabel(
                        payment
                          .paymentMethod
                      )}
                    />

                    <InformationRow
                      label="Payment Date"
                      value={formatDate(
                        payment
                          .paymentDate ||
                          payroll.paidAt
                      )}
                    />

                    <InformationRow
                      label="Bank Name"
                      value={
                        payment.bankName ||
                        "—"
                      }
                    />

                    <InformationRow
                      label="Account"
                      value={
                        payment
                          .maskedAccountNumber ||
                        payment
                          .maskedWalletNumber ||
                        "—"
                      }
                    />

                    <InformationRow
                      label="Transaction Reference"
                      value={
                        payment
                          .transactionReference ||
                        "—"
                      }
                    />

                    <InformationRow
                      label="Cheque Number"
                      value={
                        payment
                          .chequeNumber ||
                        "—"
                      }
                    />
                  </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Notes
                |--------------------------------------------------------------------------
                */}

                {(
                  payroll.payrollNotes ||
                  payroll.adjustmentNotes ||
                  payment.paymentNotes
                ) && (
                  <section className="print-break-inside-avoid rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <FileText
                        size={16}
                        className="text-slate-500"
                      />

                      <h2 className="text-sm font-bold text-slate-800">
                        Notes
                      </h2>
                    </div>

                    {payroll.payrollNotes && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Payroll Notes
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                          {
                            payroll.payrollNotes
                          }
                        </p>
                      </div>
                    )}

                    {payroll.adjustmentNotes && (
                      <div className="mt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Adjustment Notes
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                          {
                            payroll.adjustmentNotes
                          }
                        </p>
                      </div>
                    )}

                    {payment.paymentNotes && (
                      <div className="mt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Payment Notes
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                          {
                            payment.paymentNotes
                          }
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {/*
                |--------------------------------------------------------------------------
                | Approval Information
                |--------------------------------------------------------------------------
                */}

                <section className="print-break-inside-avoid rounded-xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <ShieldCheck
                      size={16}
                      className="text-violet-700"
                    />

                    <h2 className="text-sm font-bold text-slate-800">
                      Approval and Payment Record
                    </h2>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Generated By
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {payroll
                          .generatedBy
                          ?.name ||
                          "System User"}
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {formatDateTime(
                          payroll
                            .generatedAt
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Submitted By
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {payroll
                          .submittedBy
                          ?.name ||
                          "—"}
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {formatDateTime(
                          payroll
                            .submittedAt
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Approved By
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {payroll
                          .approvedBy
                          ?.name ||
                          "—"}
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {formatDateTime(
                          payroll
                            .approvedAt
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Paid By
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        {payroll
                          .paidBy
                          ?.name ||
                          "—"}
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {formatDateTime(
                          payroll.paidAt
                        )}
                      </p>
                    </div>
                  </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Signatures
                |--------------------------------------------------------------------------
                */}

                <section className="print-break-inside-avoid pt-8">
                  <div className="grid gap-10 sm:grid-cols-3">
                    <div className="text-center">
                      <div className="mx-auto w-44 border-t border-slate-400" />

                      <p className="mt-2 text-xs font-semibold text-slate-700">
                        Prepared By
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Payroll / Accounts
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="mx-auto w-44 border-t border-slate-400" />

                      <p className="mt-2 text-xs font-semibold text-slate-700">
                        Approved By
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Principal / Administrator
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="mx-auto w-44 border-t border-slate-400" />

                      <p className="mt-2 text-xs font-semibold text-slate-700">
                        Employee Signature
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Salary Received
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Footer
              |--------------------------------------------------------------------------
              */}

              <footer className="print-background border-t border-slate-200 bg-slate-50 px-5 py-4 text-center sm:px-8">
                <p className="text-[10px] leading-5 text-slate-400">
                  This payslip was generated
                  electronically by the School
                  / Madrasa Management System.
                  Final payment remains subject
                  to the institution’s payroll
                  and financial policies.
                </p>

                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  Generated on{" "}
                  {formatDateTime(
                    new Date()
                  )}
                </p>
              </footer>
            </div>
          </article>
        </div>
      </div>
    );
  };

export default Payslip;