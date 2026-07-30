import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  CreditCard,
  Download,
  FileText,
  Landmark,
  MessageCircle,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
  WalletCards
} from "lucide-react";

import {
  useNavigate,
  useOutletContext
} from "react-router-dom";

import {
  getParentChildFees
} from "../../api/parentPortal";

const MONTHS = [
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

const STATUS_OPTIONS = [
  [
    "all",
    "All Statuses"
  ],

  [
    "paid",
    "Paid"
  ],

  [
    "partial",
    "Partially Paid"
  ],

  [
    "unpaid",
    "Unpaid"
  ]
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const errorMessage = (
  error
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.message ||
    "Unable to load fee records."
  );
};

const money = (
  value
) => {
  return new Intl.NumberFormat(
    "en-PK",
    {
      style:
        "currency",

      currency:
        "PKR",

      maximumFractionDigits:
        0
    }
  ).format(
    Number(
      value || 0
    )
  );
};

const dateText = (
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
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric"
    }
  ).format(date);
};

const initials = (
  value
) => {
  return String(
    value || "Student"
  )
    .split(" ")
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
    .toUpperCase();
};

const classText = (
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
    return `${className} · Section ${sectionName}`;
  }

  return (
    className ||
    sectionName ||
    "Class not assigned"
  );
};

const titleCase = (
  value
) => {
  return String(
    value || ""
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

const statusTheme = (
  status
) => {
  if (
    status ===
    "paid"
  ) {
    return {
      label:
        "Paid",

      icon:
        CheckCircle2,

      badge:
        "bg-emerald-50 text-emerald-700 ring-emerald-200",

      iconBox:
        "bg-emerald-50 text-emerald-700"
    };
  }

  if (
    status ===
    "partial"
  ) {
    return {
      label:
        "Partially Paid",

      icon:
        WalletCards,

      badge:
        "bg-amber-50 text-amber-700 ring-amber-200",

      iconBox:
        "bg-amber-50 text-amber-700"
    };
  }

  return {
    label:
      "Unpaid",

    icon:
      AlertCircle,

    badge:
      "bg-rose-50 text-rose-700 ring-rose-200",

    iconBox:
      "bg-rose-50 text-rose-700"
  };
};

const paymentIcon = (
  method
) => {
  if (
    method ===
    "bank"
  ) {
    return Landmark;
  }

  if (
    method ===
    "online"
  ) {
    return CreditCard;
  }

  if (
    method ===
    "cheque"
  ) {
    return FileText;
  }

  return Banknote;
};

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

const SummaryCard = ({
  title,
  value,
  helper,
  icon: Icon,
  tone
}) => {
  const tones = {
    brand:
      "bg-brand-50 text-brand-700",

    emerald:
      "bg-emerald-50 text-emerald-700",

    amber:
      "bg-amber-50 text-amber-700",

    rose:
      "bg-rose-50 text-rose-700"
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>

          <p className="mt-3 truncate text-2xl font-black text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {helper}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            tones[
              tone
            ] ||
            tones.brand
          }`}
        >
          <Icon
            size={20}
          />
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Amount Item
|--------------------------------------------------------------------------
*/

const AmountItem = ({
  label,
  value,
  discount = false,
  currency = true
}) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-100">
      <span className="text-xs font-medium text-slate-500">
        {label}
      </span>

      <span
        className={`text-xs font-black ${
          discount
            ? "text-emerald-700"
            : "text-slate-800"
        }`}
      >
        {currency
          ? `${discount &&
            Number(
              value || 0
            ) >
              0
              ? "-"
              : ""}${money(
              value
            )}`
          : Number(
              value || 0
            )}
      </span>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Payment Item
|--------------------------------------------------------------------------
*/

const PaymentItem = ({
  payment,
  record,
  receiptsAllowed,
  onPrint
}) => {
  const MethodIcon =
    paymentIcon(
      payment.paymentMethod
    );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <MethodIcon
              size={18}
            />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-black text-slate-800">
              {money(
                payment.amount
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {titleCase(
                payment.paymentMethod ||
                  "cash"
              )}{" "}
              ·{" "}
              {dateText(
                payment.paymentDate
              )}
            </p>

            {payment.remarks && (
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {payment.remarks}
              </p>
            )}

            {payment
              .receivedBy
              ?.name && (
              <p className="mt-1 text-[11px] text-slate-400">
                Received by{" "}
                {payment
                  .receivedBy
                  .name}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          className="btn-secondary shrink-0"
          disabled={
            !receiptsAllowed
          }
          onClick={() =>
            onPrint(
              payment,
              record
            )
          }
        >
          <Printer
            size={15}
          />

          Print Receipt
        </button>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Invoice Card
|--------------------------------------------------------------------------
*/

const InvoiceCard = ({
  record,
  expanded,
  receiptsAllowed,
  onToggle,
  onPrint
}) => {
  const theme =
    statusTheme(
      record.paymentStatus
    );

  const StatusIcon =
    theme.icon;

  const payments =
    Array.isArray(
      record.payments
    )
      ? record.payments
      : [];

  const components = [
    [
      "Monthly Fee",
      record.monthlyFee
    ],

    [
      "Admission Fee",
      record.admissionFee
    ],

    [
      "Exam Fee",
      record.examFee
    ],

    [
      "Transport Fee",
      record.transportFee
    ],

    [
      "Other Fee",
      record.otherFee
    ]
  ].filter(
    ([
      ,
      value
    ]) =>
      Number(
        value || 0
      ) >
      0
  );

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${theme.iconBox}`}
            >
              <StatusIcon
                size={21}
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-black text-slate-900">
                  {record
                    .feeStructureId
                    ?.title ||
                    `${record.feeMonth || "Fee"} Invoice`}
                </h3>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${theme.badge}`}
                >
                  <StatusIcon
                    size={12}
                  />

                  {theme.label}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                <span>
                  Invoice:{" "}
                  <strong className="text-slate-700">
                    {record.invoiceNumber ||
                      "Not assigned"}
                  </strong>
                </span>

                <span>
                  Month:{" "}
                  <strong className="text-slate-700">
                    {record.feeMonth ||
                      "Not specified"}
                  </strong>
                </span>

                <span>
                  Session:{" "}
                  <strong className="text-slate-700">
                    {record.sessionYear ||
                      "Not specified"}
                  </strong>
                </span>
              </div>

              <p className="mt-2 text-[11px] text-slate-400">
                Created{" "}
                {dateText(
                  record.createdAt
                )}{" "}
                ·{" "}
                {record.classId
                  ?.className ||
                  "Class not available"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            <div className="rounded-2xl bg-slate-50 p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Payable
              </p>

              <p className="mt-2 truncate text-sm font-black text-slate-900">
                {money(
                  record.payableAmount
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-emerald-600">
                Paid
              </p>

              <p className="mt-2 truncate text-sm font-black text-emerald-800">
                {money(
                  record.paidAmount
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-rose-50 p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-rose-600">
                Balance
              </p>

              <p className="mt-2 truncate text-sm font-black text-rose-800">
                {money(
                  record.balanceAmount
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <AmountItem
              label="Original Total"
              value={
                record.totalAmount
              }
            />

            <AmountItem
              label="Fine"
              value={
                record.fine
              }
            />

            <AmountItem
              label="Discount"
              value={
                record.discount
              }
              discount
            />

            <AmountItem
              label="Payments"
              value={
                payments.length
              }
              currency={
                false
              }
            />
          </div>

          <button
            type="button"
            className="btn-secondary min-w-[160px]"
            onClick={
              onToggle
            }
          >
            {expanded ? (
              <ChevronUp
                size={16}
              />
            ) : (
              <ChevronDown
                size={16}
              />
            )}

            {expanded
              ? "Hide Details"
              : "View Details"}
          </button>
        </div>

        {expanded && (
          <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                Fee Breakdown
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {components.map(
                  ([
                    label,
                    value
                  ]) => (
                    <AmountItem
                      key={
                        label
                      }
                      label={
                        label
                      }
                      value={
                        value
                      }
                    />
                  )
                )}

                {Number(
                  record.fine ||
                    0
                ) >
                  0 && (
                  <AmountItem
                    label="Fine"
                    value={
                      record.fine
                    }
                  />
                )}

                {Number(
                  record.discount ||
                    0
                ) >
                  0 && (
                  <AmountItem
                    label="Discount"
                    value={
                      record.discount
                    }
                    discount
                  />
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                    Payment History
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {payments.length} payment
                    {payments.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    recorded for this invoice.
                  </p>
                </div>

                {!receiptsAllowed && (
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                    Receipt access restricted
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-3">
                {payments.length >
                0 ? (
                  payments.map(
                    (
                      payment,
                      index
                    ) => (
                      <PaymentItem
                        key={
                          payment._id ||
                          `${record._id}-${index}`
                        }
                        payment={
                          payment
                        }
                        record={
                          record
                        }
                        receiptsAllowed={
                          receiptsAllowed
                        }
                        onPrint={
                          onPrint
                        }
                      />
                    )
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    <ReceiptText
                      size={25}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm font-bold text-slate-700">
                      No payment received yet
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Payment details will appear after the school records a payment.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Parent Fees Page
|--------------------------------------------------------------------------
*/

const ParentFees =
  () => {
    const navigate =
      useNavigate();

    const {
      children,
      selectedChild,
      selectedChildId
    } = useOutletContext();

    const requestRef =
      useRef(null);

    const [
      feeData,
      setFeeData
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
      page,
      setPage
    ] = useState(1);

    const [
      paymentStatus,
      setPaymentStatus
    ] = useState(
      "all"
    );

    const [
      feeMonth,
      setFeeMonth
    ] = useState("");

    const [
      sessionYear,
      setSessionYear
    ] = useState(
      "current"
    );

    const [
      search,
      setSearch
    ] = useState("");

    const [
      expandedRecordId,
      setExpandedRecordId
    ] = useState("");

    const limit =
      10;

    const studentId =
      selectedChild
        ?.student
        ?.id ||
      selectedChildId ||
      "";

    const feesAllowed =
      selectedChild
        ?.link
        ?.permissions
        ?.fees !==
      false;

    const receiptsAllowed =
      selectedChild
        ?.link
        ?.permissions
        ?.receipts !==
      false;

    const currentSession =
      selectedChild
        ?.student
        ?.school
        ?.sessionYear ||
      "";

    /*
    |--------------------------------------------------------------------------
    | Reset Page
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      setPage(
        1
      );

      setExpandedRecordId(
        ""
      );
    }, [
      studentId,
      paymentStatus,
      feeMonth,
      sessionYear
    ]);

    /*
    |--------------------------------------------------------------------------
    | Load Fees
    |--------------------------------------------------------------------------
    */

    const loadFees =
      useCallback(
        async ({
          silent = false
        } = {}) => {
          if (
            !studentId ||
            !feesAllowed
          ) {
            setFeeData(
              null
            );

            setLoading(
              false
            );

            return;
          }

          requestRef.current
            ?.abort();

          const controller =
            new AbortController();

          requestRef.current =
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
            const response =
              await getParentChildFees(
                studentId,
                {
                  page,
                  limit,

                  paymentStatus:
                    paymentStatus ===
                    "all"
                      ? undefined
                      : paymentStatus,

                  feeMonth:
                    feeMonth ||
                    undefined,

                  sessionYear:
                    sessionYear !==
                      "current" &&
                    sessionYear !==
                      "all"
                      ? sessionYear
                      : undefined,

                  useCurrentSession:
                    sessionYear ===
                      "current" &&
                    currentSession
                      ? true
                      : undefined
                },
                {
                  signal:
                    controller.signal
                }
              );

            setFeeData(
              response?.data
                ?.data ||
              null
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
              errorMessage(
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
        [
          studentId,
          feesAllowed,
          page,
          paymentStatus,
          feeMonth,
          sessionYear,
          currentSession
        ]
      );

    useEffect(() => {
      loadFees();

      return () => {
        requestRef.current
          ?.abort();
      };
    }, [
      loadFees
    ]);

    /*
    |--------------------------------------------------------------------------
    | Derived Data
    |--------------------------------------------------------------------------
    */

    const student =
      feeData?.child ||
      selectedChild
        ?.student ||
      null;

    const school =
      student?.school ||
      {};

    const summary =
      feeData?.summary ||
      {
        invoiceCount:
          0,

        paidInvoices:
          0,

        partialInvoices:
          0,

        unpaidInvoices:
          0,

        paymentCount:
          0,

        totalPayable:
          0,

        totalPaid:
          0,

        totalBalance:
          0
      };

    const pagination =
      feeData?.pagination ||
      {
        page:
          1,

        totalRecords:
          0,

        totalPages:
          1
      };

    const records =
      Array.isArray(
        feeData?.feeRecords
      )
        ? feeData.feeRecords
        : [];

    const filteredRecords =
      useMemo(
        () => {
          const term =
            search
              .trim()
              .toLowerCase();

          if (!term) {
            return records;
          }

          return records.filter(
            (
              record
            ) => {
              return [
                record.invoiceNumber,
                record.feeMonth,
                record.sessionYear,
                record.paymentStatus,
                record.classId
                  ?.className,
                record.feeStructureId
                  ?.title
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(
                  term
                );
            }
          );
        },
        [
          records,
          search
        ]
      );

    const sessionOptions =
      useMemo(
        () => {
          const options =
            new Set();

          records.forEach(
            (
              record
            ) => {
              if (
                record.sessionYear
              ) {
                options.add(
                  record.sessionYear
                );
              }
            }
          );

          const match =
            String(
              currentSession
            ).match(
              /^(\d{4})-(\d{4})$/
            );

          if (match) {
            const startYear =
              Number(
                match[1]
              );

            for (
              let offset = 1;
              offset <= 4;
              offset += 1
            ) {
              options.add(
                `${startYear - offset}-${startYear - offset + 1}`
              );
            }
          }

          options.delete(
            currentSession
          );

          return Array.from(
            options
          ).sort(
            (
              first,
              second
            ) =>
              second.localeCompare(
                first
              )
          );
        },
        [
          records,
          currentSession
        ]
      );

    const progress =
      Number(
        summary.totalPayable ||
          0
      ) >
      0
        ? Math.min(
            100,
            (
              Number(
                summary.totalPaid ||
                  0
              ) /
              Number(
                summary.totalPayable ||
                  1
              )
            ) *
              100
          )
        : 0;

    /*
    |--------------------------------------------------------------------------
    | CSV Export
    |--------------------------------------------------------------------------
    */

    const exportCsv =
      () => {
        if (
          !filteredRecords.length
        ) {
          return;
        }

        const rows = [
          [
            "Invoice Number",
            "Fee Month",
            "Session",
            "Status",
            "Payable",
            "Paid",
            "Balance",
            "Payments"
          ],

          ...filteredRecords.map(
            (
              record
            ) => [
              record.invoiceNumber ||
                "",

              record.feeMonth ||
                "",

              record.sessionYear ||
                "",

              record.paymentStatus ||
                "",

              Number(
                record.payableAmount ||
                  0
              ),

              Number(
                record.paidAmount ||
                  0
              ),

              Number(
                record.balanceAmount ||
                  0
              ),

              Array.isArray(
                record.payments
              )
                ? record.payments
                    .length
                : 0
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
                    (
                      value
                    ) =>
                      `"${String(
                        value
                      ).replaceAll(
                        '"',
                        '""'
                      )}"`
                  )
                  .join(",")
            )
            .join("\n");

        const blob =
          new Blob(
            [
              csv
            ],
            {
              type:
                "text/csv;charset=utf-8;"
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
          `${student?.name || "student"}-fee-records.csv`
            .replace(
              /\s+/g,
              "-"
            )
            .toLowerCase();

        document.body.appendChild(
          anchor
        );

        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(
          url
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Print Receipt
    |--------------------------------------------------------------------------
    */

    const printReceipt =
      (
        payment,
        record
      ) => {
        if (
          !receiptsAllowed
        ) {
          return;
        }

        const popup =
          window.open(
            "",
            "_blank",
            "width=850,height=900"
          );

        if (!popup) {
          return;
        }

        popup.document.write(`
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8" />

              <title>
                Fee Receipt - ${escapeHtml(
                  record.invoiceNumber
                )}
              </title>

              <style>
                * {
                  box-sizing: border-box;
                }

                body {
                  margin: 0;
                  padding: 32px;
                  background: #f8fafc;
                  color: #0f172a;
                  font-family: Arial, sans-serif;
                }

                .receipt {
                  max-width: 760px;
                  margin: auto;
                  overflow: hidden;
                  border: 1px solid #cbd5e1;
                  border-radius: 18px;
                  background: white;
                }

                .header {
                  padding: 28px;
                  background: #0f172a;
                  color: white;
                }

                .header h1 {
                  margin: 0;
                  font-size: 24px;
                }

                .header p {
                  margin: 8px 0 0;
                  color: #cbd5e1;
                  font-size: 13px;
                }

                .content {
                  padding: 28px;
                }

                .row {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 16px;
                  margin-bottom: 16px;
                }

                .item {
                  padding: 14px;
                  border: 1px solid #e2e8f0;
                  border-radius: 12px;
                  background: #f8fafc;
                }

                .label {
                  color: #64748b;
                  font-size: 11px;
                  font-weight: bold;
                  letter-spacing: .08em;
                  text-transform: uppercase;
                }

                .value {
                  margin-top: 6px;
                  font-size: 14px;
                  font-weight: bold;
                }

                .amount {
                  margin: 22px 0;
                  padding: 22px;
                  border-radius: 14px;
                  background: #ecfdf5;
                  color: #065f46;
                  text-align: center;
                }

                .amount .value {
                  font-size: 30px;
                }

                .footer {
                  padding: 18px 28px;
                  border-top: 1px solid #e2e8f0;
                  color: #64748b;
                  font-size: 12px;
                  text-align: center;
                }

                @media print {
                  body {
                    padding: 0;
                    background: white;
                  }

                  .receipt {
                    border: none;
                    border-radius: 0;
                  }
                }
              </style>
            </head>

            <body>
              <div class="receipt">
                <div class="header">
                  <h1>
                    ${escapeHtml(
                      school.schoolName ||
                        "School / Madrasa"
                    )}
                  </h1>

                  <p>
                    ${escapeHtml(
                      school.address ||
                        ""
                    )}
                  </p>

                  <p>
                    Official Fee Payment Receipt
                  </p>
                </div>

                <div class="content">
                  <div class="row">
                    <div class="item">
                      <div class="label">
                        Invoice Number
                      </div>

                      <div class="value">
                        ${escapeHtml(
                          record.invoiceNumber
                        )}
                      </div>
                    </div>

                    <div class="item">
                      <div class="label">
                        Payment Date
                      </div>

                      <div class="value">
                        ${escapeHtml(
                          dateText(
                            payment.paymentDate
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div class="row">
                    <div class="item">
                      <div class="label">
                        Student
                      </div>

                      <div class="value">
                        ${escapeHtml(
                          student?.name
                        )}
                      </div>
                    </div>

                    <div class="item">
                      <div class="label">
                        Admission Number
                      </div>

                      <div class="value">
                        ${escapeHtml(
                          student?.admissionNumber
                        )}
                      </div>
                    </div>
                  </div>

                  <div class="row">
                    <div class="item">
                      <div class="label">
                        Fee Month
                      </div>

                      <div class="value">
                        ${escapeHtml(
                          record.feeMonth
                        )}
                      </div>
                    </div>

                    <div class="item">
                      <div class="label">
                        Session
                      </div>

                      <div class="value">
                        ${escapeHtml(
                          record.sessionYear
                        )}
                      </div>
                    </div>
                  </div>

                  <div class="amount">
                    <div class="label">
                      Amount Received
                    </div>

                    <div class="value">
                      ${escapeHtml(
                        money(
                          payment.amount
                        )
                      )}
                    </div>
                  </div>

                  <div class="row">
                    <div class="item">
                      <div class="label">
                        Payment Method
                      </div>

                      <div class="value">
                        ${escapeHtml(
                          titleCase(
                            payment.paymentMethod ||
                              "cash"
                          )
                        )}
                      </div>
                    </div>

                    <div class="item">
                      <div class="label">
                        Remaining Balance
                      </div>

                      <div class="value">
                        ${escapeHtml(
                          money(
                            record.balanceAmount
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div class="item">
                    <div class="label">
                      Received By
                    </div>

                    <div class="value">
                      ${escapeHtml(
                        payment.receivedBy
                          ?.name ||
                          "School Accounts Office"
                      )}
                    </div>
                  </div>
                </div>

                <div class="footer">
                  Generated from the secure parent portal.
                </div>
              </div>

              <script>
                window.onload = function () {
                  window.print();
                };
              </script>
            </body>
          </html>
        `);

        popup.document.close();
      };

    /*
    |--------------------------------------------------------------------------
    | Empty and Restricted States
    |--------------------------------------------------------------------------
    */

    if (
      !children.length
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
              No child is linked
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              Fee records become available after the school links and verifies a student with your parent account.
            </p>

            <button
              type="button"
              className="btn-secondary mt-6"
              onClick={() =>
                navigate(
                  "/parent-portal/children"
                )
              }
            >
              View Child Links
            </button>
          </div>
        </div>
      );
    }

    if (
      !feesAllowed
    ) {
      return (
        <div className="card grid min-h-[480px] place-items-center p-8 text-center">
          <div className="max-w-lg">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-amber-50 text-amber-700">
              <ShieldCheck
                size={34}
              />
            </div>

            <h2 className="mt-6 text-xl font-black text-slate-900">
              Fee access is restricted
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              The school has not enabled fee access for this parent–student link.
            </p>

            <button
              type="button"
              className="btn-primary mt-6"
              onClick={() =>
                navigate(
                  `/parent-portal/messages?studentId=${encodeURIComponent(
                    studentId
                  )}&category=fees`
                )
              }
            >
              <MessageCircle
                size={16}
              />

              Contact Principal
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/*
        |--------------------------------------------------------------------------
        | Hero
        |--------------------------------------------------------------------------
        */}

        <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/10 text-lg font-black ring-1 ring-white/15">
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
                  initials(
                    student?.name
                  )
                )}
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-200">
                  <ReceiptText
                    size={13}
                  />

                  Fee Status & Receipts
                </div>

                <h2 className="mt-3 truncate text-2xl font-black sm:text-3xl">
                  {student?.name ||
                    "Student"}
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  {classText(
                    student
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Admission No:{" "}
                  {student
                    ?.admissionNumber ||
                    "Not assigned"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[440px]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Outstanding Balance
                </p>

                <p className="mt-2 truncate text-xl font-black">
                  {money(
                    summary.totalBalance
                  )}
                </p>

                <p className="mt-1 text-xs text-rose-300">
                  {summary.unpaidInvoices ||
                    0} unpaid invoice(s)
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Amount Paid
                </p>

                <p className="mt-2 truncate text-xl font-black">
                  {money(
                    summary.totalPaid
                  )}
                </p>

                <p className="mt-1 text-xs text-emerald-300">
                  {summary.paymentCount ||
                    0} recorded payment(s)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */}

        <section className="card p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.75fr_0.75fr_0.8fr_auto]">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                className="field-input h-11 pl-10"
                placeholder="Search invoice, month, session or class…"
              />
            </div>

            <select
              value={
                paymentStatus
              }
              onChange={(
                event
              ) =>
                setPaymentStatus(
                  event.target
                    .value
                )
              }
              className="field-select h-11"
            >
              {STATUS_OPTIONS.map(
                ([
                  value,
                  label
                ]) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            <select
              value={
                feeMonth
              }
              onChange={(
                event
              ) =>
                setFeeMonth(
                  event.target
                    .value
                )
              }
              className="field-select h-11"
            >
              <option value="">
                All Months
              </option>

              {MONTHS.map(
                (
                  month
                ) => (
                  <option
                    key={
                      month
                    }
                    value={
                      month
                    }
                  >
                    {month}
                  </option>
                )
              )}
            </select>

            <select
              value={
                sessionYear
              }
              onChange={(
                event
              ) =>
                setSessionYear(
                  event.target
                    .value
                )
              }
              className="field-select h-11"
            >
              <option value="current">
                Current Session
                {currentSession
                  ? ` (${currentSession})`
                  : ""}
              </option>

              <option value="all">
                All Sessions
              </option>

              {sessionOptions.map(
                (
                  session
                ) => (
                  <option
                    key={
                      session
                    }
                    value={
                      session
                    }
                  >
                    {session}
                  </option>
                )
              )}
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary h-11 flex-1 xl:flex-none"
                disabled={
                  !filteredRecords.length
                }
                onClick={
                  exportCsv
                }
              >
                <Download
                  size={16}
                />

                Export
              </button>

              <button
                type="button"
                className="btn-primary h-11 flex-1 xl:flex-none"
                disabled={
                  refreshing
                }
                onClick={() =>
                  loadFees({
                    silent: true
                  })
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
          </div>
        </section>

        {error && (
          <section className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0 text-rose-600"
              />

              <div>
                <p className="text-sm font-bold text-rose-800">
                  Fee records could not be updated
                </p>

                <p className="mt-1 text-xs text-rose-600">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                loadFees()
              }
            >
              Try Again
            </button>
          </section>
        )}

        {loading ? (
          <div className="grid min-h-[420px] place-items-center text-center">
            <div>
              <RefreshCw
                size={28}
                className="mx-auto animate-spin text-brand-600"
              />

              <p className="mt-4 text-sm font-black text-slate-800">
                Loading fee records
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Preparing invoices, balances and payment receipts…
              </p>
            </div>
          </div>
        ) : (
          <>
            {/*
            |--------------------------------------------------------------------------
            | Summary Cards
            |--------------------------------------------------------------------------
            */}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Total Payable"
                value={
                  money(
                    summary.totalPayable
                  )
                }
                helper={`${summary.invoiceCount || 0} invoice record(s).`}
                icon={
                  CircleDollarSign
                }
                tone="brand"
              />

              <SummaryCard
                title="Total Paid"
                value={
                  money(
                    summary.totalPaid
                  )
                }
                helper={`${summary.paymentCount || 0} payment(s) recorded.`}
                icon={
                  CheckCircle2
                }
                tone="emerald"
              />

              <SummaryCard
                title="Outstanding"
                value={
                  money(
                    summary.totalBalance
                  )
                }
                helper={`${summary.unpaidInvoices || 0} unpaid and ${summary.partialInvoices || 0} partial.`}
                icon={
                  WalletCards
                }
                tone="rose"
              />

              <SummaryCard
                title="Paid Invoices"
                value={
                  summary.paidInvoices ||
                  0
                }
                helper="Invoices paid in full."
                icon={
                  ReceiptText
                }
                tone="amber"
              />
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Payment Progress
            |--------------------------------------------------------------------------
            */}

            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                    Overall Payment Progress
                  </p>

                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    <p className="text-4xl font-black text-slate-900">
                      {progress.toFixed(
                        1
                      )}
                      %
                    </p>

                    <span className="mb-1 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-emerald-700">
                      {money(
                        summary.totalPaid
                      )}{" "}
                      paid
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {money(
                      summary.totalBalance
                    )}{" "}
                    remains from{" "}
                    {money(
                      summary.totalPayable
                    )}
                    .
                  </p>
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/80 text-emerald-700">
                  <WalletCards
                    size={28}
                  />
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/90">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width:
                      `${progress}%`
                  }}
                />
              </div>
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Invoices
            |--------------------------------------------------------------------------
            */}

            <section>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                    Fee History
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-900">
                    Invoices & Payments
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Showing{" "}
                    {filteredRecords.length} record(s) on this page.
                  </p>
                </div>

                {!receiptsAllowed && (
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                    <ShieldCheck
                      size={15}
                    />

                    Receipt printing is restricted
                  </div>
                )}
              </div>

              {filteredRecords.length ? (
                <div className="space-y-4">
                  {filteredRecords.map(
                    (
                      record
                    ) => (
                      <InvoiceCard
                        key={
                          record._id
                        }
                        record={
                          record
                        }
                        receiptsAllowed={
                          receiptsAllowed
                        }
                        expanded={
                          String(
                            expandedRecordId
                          ) ===
                          String(
                            record._id
                          )
                        }
                        onToggle={() =>
                          setExpandedRecordId(
                            (
                              current
                            ) =>
                              String(
                                current
                              ) ===
                              String(
                                record._id
                              )
                                ? ""
                                : record._id
                          )
                        }
                        onPrint={
                          printReceipt
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="card grid min-h-[340px] place-items-center p-8 text-center">
                  <div className="max-w-md">
                    <ReceiptText
                      size={34}
                      className="mx-auto text-slate-300"
                    />

                    <h3 className="mt-5 text-lg font-black text-slate-900">
                      No fee records found
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      No invoices match the selected filters.
                    </p>

                    <button
                      type="button"
                      className="btn-secondary mt-5"
                      onClick={() => {
                        setSearch("");
                        setPaymentStatus(
                          "all"
                        );
                        setFeeMonth("");
                        setSessionYear(
                          "current"
                        );
                        setPage(
                          1
                        );
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/*
            |--------------------------------------------------------------------------
            | Pagination
            |--------------------------------------------------------------------------
            */}

            {pagination.totalPages >
              1 && (
              <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Page{" "}
                  <strong>
                    {pagination.page}
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {pagination.totalPages}
                  </strong>{" "}
                  ·{" "}
                  {pagination.totalRecords} records
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={
                      page <=
                      1
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.max(
                            1,
                            current -
                              1
                          )
                      )
                    }
                  >
                    <ChevronLeft
                      size={16}
                    />

                    Previous
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={
                      page >=
                      pagination.totalPages
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.min(
                            pagination.totalPages,
                            current +
                              1
                          )
                      )
                    }
                  >
                    Next

                    <ChevronRight
                      size={16}
                    />
                  </button>
                </div>
              </section>
            )}

            {/*
            |--------------------------------------------------------------------------
            | Support
            |--------------------------------------------------------------------------
            */}

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="card p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                    <Building2
                      size={22}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Official Accounts Record
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Information is read directly from the school’s fee collection records.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <MessageCircle
                      size={22}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Fee Question or Discrepancy?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Contact the principal about a payment, balance, discount, fine or invoice.
                    </p>

                    <button
                      type="button"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700"
                      onClick={() =>
                        navigate(
                          `/parent-portal/messages?studentId=${encodeURIComponent(
                            studentId
                          )}&category=fees`
                        )
                      }
                    >
                      Message Principal

                      <ChevronRight
                        size={15}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    );
  };

export default ParentFees;