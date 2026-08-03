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
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  FileDown,
  FileText,
  Filter,
  HandCoins,
  Hash,
  Info,
  Landmark,
  MessageCircle,
  MoreHorizontal,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X
} from "lucide-react";

import {
  getStudentPortalFees
} from "../../api/studentPortal";

/*
|--------------------------------------------------------------------------
| Fee Page Constants
|--------------------------------------------------------------------------
*/

const PAYMENT_STATUS_OPTIONS = [
  {
    value:
      "",

    label:
      "All Statuses"
  },

  {
    value:
      "unpaid",

    label:
      "Unpaid"
  },

  {
    value:
      "partial",

    label:
      "Partially Paid"
  },

  {
    value:
      "paid",

    label:
      "Paid"
  }
];

const PAGE_LIMIT =
  10;

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
    "Unable to load fee information."
  );
};

const formatMoney = (
  value
) => {
  return `Rs ${Number(
    value || 0
  ).toLocaleString(
    "en-PK",
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        2
    }
  )}`;
};

const formatDate = (
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

  return date.toLocaleString(
    "en-PK",
    {
      day:
        "numeric",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit"
    }
  );
};

const formatFeeMonth = (
  value
) => {
  const match =
    String(
      value || ""
    ).match(
      /^(\d{4})-(0[1-9]|1[0-2])$/
    );

  if (!match) {
    return value ||
      "Fee month not assigned";
  }

  return new Date(
    Number(
      match[1]
    ),
    Number(
      match[2]
    ) -
      1,
    1
  ).toLocaleDateString(
    "en-PK",
    {
      month:
        "long",

      year:
        "numeric"
    }
  );
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

  if (
    normalized ===
    "partial"
  ) {
    return "Partially Paid";
  }

  if (
    normalized ===
    "balance_due"
  ) {
    return "Balance Due";
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

const formatPaymentMethod = (
  value
) => {
  const normalized =
    String(
      value || "cash"
    )
      .trim()
      .toLowerCase();

  const labels = {
    cash:
      "Cash",

    bank:
      "Bank Transfer",

    bank_transfer:
      "Bank Transfer",

    card:
      "Card",

    cheque:
      "Cheque",

    easypaisa:
      "Easypaisa",

    jazzcash:
      "JazzCash",

    online:
      "Online Payment",

    other:
      "Other"
  };

  return (
    labels[
      normalized
    ] ||
    formatStatus(
      normalized
    )
  );
};

const getPaymentDate = (
  payment,
  invoice
) => {
  return (
    payment?.paymentDate ||
    payment?.paidAt ||
    payment?.createdAt ||
    payment?.date ||
    invoice?.updatedAt ||
    invoice?.createdAt ||
    null
  );
};

const getStatusStyle = (
  status
) => {
  const normalized =
    String(
      status || ""
    ).toLowerCase();

  if (
    normalized ===
    "paid"
  ) {
    return {
      badge:
        "bg-emerald-100 text-emerald-700 ring-emerald-200",

      icon:
        "bg-emerald-100 text-emerald-700",

      border:
        "border-emerald-200",

      soft:
        "bg-emerald-50",

      bar:
        "bg-emerald-500"
    };
  }

  if (
    normalized ===
    "partial"
  ) {
    return {
      badge:
        "bg-amber-100 text-amber-700 ring-amber-200",

      icon:
        "bg-amber-100 text-amber-700",

      border:
        "border-amber-200",

      soft:
        "bg-amber-50",

      bar:
        "bg-amber-500"
    };
  }

  return {
    badge:
      "bg-rose-100 text-rose-700 ring-rose-200",

    icon:
      "bg-rose-100 text-rose-700",

    border:
      "border-rose-200",

    soft:
      "bg-rose-50",

    bar:
      "bg-rose-500"
  };
};

const getPaymentMethodIcon = (
  method
) => {
  const normalized =
    String(
      method || ""
    ).toLowerCase();

  if (
    normalized.includes(
      "bank"
    )
  ) {
    return Landmark;
  }

  if (
    normalized.includes(
      "card"
    ) ||
    normalized.includes(
      "online"
    )
  ) {
    return CreditCard;
  }

  return Banknote;
};

const getInvoiceBreakdown = (
  invoice
) => {
  return [
    {
      key:
        "monthlyFee",

      label:
        "Monthly Fee",

      value:
        Number(
          invoice?.monthlyFee ||
          0
        )
    },

    {
      key:
        "admissionFee",

      label:
        "Admission Fee",

      value:
        Number(
          invoice?.admissionFee ||
          0
        )
    },

    {
      key:
        "examFee",

      label:
        "Examination Fee",

      value:
        Number(
          invoice?.examFee ||
          0
        )
    },

    {
      key:
        "transportFee",

      label:
        "Transport Fee",

      value:
        Number(
          invoice?.transportFee ||
          0
        )
    },

    {
      key:
        "otherFee",

      label:
        "Other Fee",

      value:
        Number(
          invoice?.otherFee ||
          0
        )
    },

    {
      key:
        "fine",

      label:
        "Fine",

      value:
        Number(
          invoice?.fine ||
          0
        )
    },

    {
      key:
        "discount",

      label:
        "Discount",

      value:
        -Number(
          invoice?.discount ||
          0
        )
    }
  ].filter(
    (
      item
    ) =>
      item.value !==
      0
  );
};

const getInvoiceBaseTotal = (
  invoice
) => {
  return (
    Number(
      invoice?.monthlyFee ||
      0
    ) +
    Number(
      invoice?.admissionFee ||
      0
    ) +
    Number(
      invoice?.examFee ||
      0
    ) +
    Number(
      invoice?.transportFee ||
      0
    ) +
    Number(
      invoice?.otherFee ||
      0
    )
  );
};

const normalizeSearch = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
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

const StatusBadge = ({
  status
}) => {
  const style =
    getStatusStyle(
      status
    );

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${style.badge}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.bar}`}
      />

      {formatStatus(
        status
      )}
    </span>
  );
};

const FeeLoadingState =
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

        <div className="h-24 rounded-3xl bg-slate-200" />

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="h-[620px] rounded-3xl bg-slate-200" />
          <div className="h-[620px] rounded-3xl bg-slate-200" />
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
  invoice,
  onOpen,
  onPrintStatement
}) => {
  const statusStyle =
    getStatusStyle(
      invoice?.paymentStatus
    );

  const paidAmount =
    Number(
      invoice?.paidAmount ||
      0
    );

  const payableAmount =
    Number(
      invoice?.payableAmount ||
      0
    );

  const progress =
    payableAmount >
    0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (
                paidAmount /
                payableAmount
              ) *
                100
            )
          )
        )
      : 0;

  return (
    <article
      className={`relative overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${statusStyle.border}`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 ${statusStyle.bar}`}
      />

      <div className="p-5 pl-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-slate-900">
                {invoice?.invoiceNumber ||
                  "Invoice number pending"}
              </p>

              <StatusBadge
                status={
                  invoice?.paymentStatus
                }
              />
            </div>

            <p className="mt-2 text-xs font-semibold text-slate-500">
              {formatFeeMonth(
                invoice?.feeMonth
              )}{" "}
              · Session{" "}
              {invoice?.sessionYear ||
                "not assigned"}
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              Created{" "}
              {formatDate(
                invoice?.createdAt
              )}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Payable Amount
            </p>

            <p className="mt-1 text-xl font-black text-slate-900">
              {formatMoney(
                payableAmount
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
              Paid
            </p>

            <p className="mt-1 text-xs font-black text-emerald-700">
              {formatMoney(
                paidAmount
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
              Balance
            </p>

            <p className="mt-1 text-xs font-black text-rose-700">
              {formatMoney(
                invoice?.balanceAmount
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
              Payments
            </p>

            <p className="mt-1 text-xs font-black text-slate-800">
              {Array.isArray(
                invoice?.payments
              )
                ? invoice.payments.length
                : 0}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-[9px] font-bold uppercase tracking-wide text-slate-400">
            <span>
              Payment Progress
            </span>

            <span>
              {progress}%
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusStyle.bar}`}
              style={{
                width:
                  `${progress}%`
              }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
            onClick={() =>
              onOpen(
                invoice
              )
            }
          >
            <ReceiptText
              size={14}
            />

            View Invoice
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            onClick={() =>
              onPrintStatement(
                invoice
              )
            }
            title="Print invoice statement"
          >
            <Printer
              size={14}
            />

            Print
          </button>
        </div>
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Payment Row
|--------------------------------------------------------------------------
*/

const PaymentRow = ({
  payment,
  invoice,
  index,
  onPrintReceipt
}) => {
  const MethodIcon =
    getPaymentMethodIcon(
      payment
        ?.paymentMethod
    );

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <MethodIcon
              size={17}
            />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800">
              Payment #{index +
                1} ·{" "}
              {formatPaymentMethod(
                payment
                  ?.paymentMethod
              )}
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              {formatDateTime(
                getPaymentDate(
                  payment,
                  invoice
                )
              )}
            </p>

            {payment?.remarks && (
              <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">
                {payment.remarks}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="text-left sm:text-right">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Received Amount
            </p>

            <p className="mt-1 text-sm font-black text-emerald-700">
              {formatMoney(
                payment?.amount
              )}
            </p>

            <p className="mt-0.5 text-[9px] text-slate-400">
              By{" "}
              {payment?.receivedBy
                ?.name ||
                "School office"}
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            onClick={() =>
              onPrintReceipt(
                invoice,
                payment,
                index
              )
            }
            title="Print payment receipt"
          >
            <Printer
              size={15}
            />
          </button>
        </div>
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Invoice Detail Drawer
|--------------------------------------------------------------------------
*/

const InvoiceDetailDrawer = ({
  invoice,
  onClose,
  onPrintStatement,
  onPrintReceipt,
  onContactSchool
}) => {
  useEffect(() => {
    if (!invoice) {
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
    invoice,
    onClose
  ]);

  if (!invoice) {
    return null;
  }

  const breakdown =
    getInvoiceBreakdown(
      invoice
    );

  const payments =
    Array.isArray(
      invoice?.payments
    )
      ? invoice.payments
      : [];

  const statusStyle =
    getStatusStyle(
      invoice.paymentStatus
    );

  return (
    <div className="fixed inset-0 z-[130]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={
          onClose
        }
        aria-label="Close invoice details"
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div
          className={`h-1.5 shrink-0 ${statusStyle.bar}`}
        />

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-black text-slate-900">
              Fee Invoice Details
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              {invoice.invoiceNumber ||
                "Invoice"}
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
              size={19}
            />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div
            className={`rounded-3xl border p-5 ${statusStyle.border} ${statusStyle.soft}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <StatusBadge
                  status={
                    invoice.paymentStatus
                  }
                />

                <p className="mt-4 text-xl font-black text-slate-900">
                  {formatFeeMonth(
                    invoice.feeMonth
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Session{" "}
                  {invoice.sessionYear ||
                    "not assigned"}{" "}
                  ·{" "}
                  {invoice.classId
                    ?.className ||
                    "Class"}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Outstanding Balance
                </p>

                <p className="mt-1 text-2xl font-black text-slate-900">
                  {formatMoney(
                    invoice.balanceAmount
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-black/5">
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                  Base Total
                </p>

                <p className="mt-1 text-xs font-black text-slate-800">
                  {formatMoney(
                    getInvoiceBaseTotal(
                      invoice
                    )
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-black/5">
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                  Payable
                </p>

                <p className="mt-1 text-xs font-black text-slate-800">
                  {formatMoney(
                    invoice.payableAmount
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-black/5">
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                  Paid
                </p>

                <p className="mt-1 text-xs font-black text-emerald-700">
                  {formatMoney(
                    invoice.paidAmount
                  )}
                </p>
              </div>
            </div>
          </div>

          <section className="mt-6">
            <SectionHeader
              icon={
                FileText
              }
              title="Fee Breakdown"
              subtitle="Amounts recorded against this monthly invoice."
            />

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <div className="divide-y divide-slate-100 bg-white">
                {breakdown.length >
                0 ? (
                  breakdown.map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item.key
                        }
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <p className="text-xs font-semibold text-slate-600">
                          {item.label}
                        </p>

                        <p
                          className={`text-xs font-black ${
                            item.value <
                            0
                              ? "text-emerald-700"
                              : item.key ===
                                  "fine"
                                ? "text-rose-700"
                                : "text-slate-800"
                          }`}
                        >
                          {item.value <
                          0
                            ? `− ${formatMoney(
                                Math.abs(
                                  item.value
                                )
                              )}`
                            : formatMoney(
                                item.value
                              )}
                        </p>
                      </div>
                    )
                  )
                ) : (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">
                    No detailed fee components are available.
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-black text-slate-800">
                    Final Payable Amount
                  </p>

                  <p className="text-sm font-black text-slate-900">
                    {formatMoney(
                      invoice.payableAmount
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <SectionHeader
              icon={
                HandCoins
              }
              title="Payment History"
              subtitle={`${payments.length} payment transaction${
                payments.length ===
                1
                  ? ""
                  : "s"
              } recorded for this invoice.`}
            />

            <div className="mt-4 space-y-3">
              {payments.length >
              0 ? (
                payments.map(
                  (
                    payment,
                    index
                  ) => (
                    <PaymentRow
                      key={
                        payment._id ||
                        `${invoice._id}-payment-${index}`
                      }
                      payment={
                        payment
                      }
                      invoice={
                        invoice
                      }
                      index={
                        index
                      }
                      onPrintReceipt={
                        onPrintReceipt
                      }
                    />
                  )
                )
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
                  <HandCoins
                    size={24}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-bold text-slate-700">
                    No payment recorded
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Payment transactions will appear here after collection by the school.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-sky-200 bg-sky-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <ShieldCheck
                  size={18}
                />
              </div>

              <div>
                <p className="text-sm font-bold text-sky-900">
                  Official read-only fee record
                </p>

                <p className="mt-2 text-xs leading-6 text-sky-700">
                  The invoice and payment amounts come directly from the school fee register. Contact the school when an amount or payment entry requires review.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
              onClick={() =>
                onContactSchool(
                  invoice
                )
              }
            >
              <MessageCircle
                size={14}
              />

              Ask School
            </button>

            <button
              type="button"
              className="col-span-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 sm:col-span-2"
              onClick={() =>
                onPrintStatement(
                  invoice
                )
              }
            >
              <Printer
                size={14}
              />

              Print / Save Invoice
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Printable Receipt
|--------------------------------------------------------------------------
*/

const PrintableFeeReceipt = ({
  printData,
  student,
  school
}) => {
  const invoice =
    printData?.invoice ||
    null;

  const payment =
    printData?.payment ||
    null;

  const paymentIndex =
    Number(
      printData?.paymentIndex ||
      0
    );

  if (!invoice) {
    return (
      <div
        id="student-fee-receipt"
        className="hidden"
      />
    );
  }

  const breakdown =
    getInvoiceBreakdown(
      invoice
    );

  return (
    <div
      id="student-fee-receipt"
      className="hidden bg-white p-8 text-slate-900"
    >
      <div className="mx-auto max-w-3xl border border-slate-300 p-8">
        <div className="flex items-start justify-between gap-6 border-b border-slate-300 pb-6">
          <div>
            <p className="text-2xl font-black">
              {school?.schoolName ||
                "School Fee Office"}
            </p>

            <p className="mt-2 text-sm text-slate-600">
              {school?.address ||
                ""}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {[school?.phone, school?.email]
                .filter(
                  Boolean
                )
                .join(
                  " · "
                )}
            </p>
          </div>

          <div className="text-right">
            <p className="text-lg font-black uppercase tracking-wide">
              {payment
                ? "Payment Receipt"
                : "Fee Invoice Statement"}
            </p>

            <p className="mt-2 text-sm font-bold">
              {invoice.invoiceNumber ||
                "Invoice"}
            </p>

            {payment && (
              <p className="mt-1 text-xs text-slate-500">
                Payment #{paymentIndex +
                  1}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 border-b border-slate-300 py-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Student
            </p>

            <p className="mt-2 text-base font-black">
              {student?.name ||
                "Student"}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Admission:{" "}
              {student?.admissionNumber ||
                "Not available"}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {formatClassName(
                student
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Invoice Period
            </p>

            <p className="mt-2 text-base font-black">
              {formatFeeMonth(
                invoice.feeMonth
              )}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Session{" "}
              {invoice.sessionYear ||
                "Not available"}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Created{" "}
              {formatDate(
                invoice.createdAt
              )}
            </p>
          </div>
        </div>

        {payment ? (
          <div className="py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-300 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Amount Received
                </p>

                <p className="mt-2 text-2xl font-black">
                  {formatMoney(
                    payment.amount
                  )}
                </p>
              </div>

              <div className="border border-slate-300 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Payment Method
                </p>

                <p className="mt-2 text-lg font-black">
                  {formatPaymentMethod(
                    payment.paymentMethod
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-bold">
                  Payment Date
                </p>

                <p className="mt-1 text-slate-600">
                  {formatDateTime(
                    getPaymentDate(
                      payment,
                      invoice
                    )
                  )}
                </p>
              </div>

              <div>
                <p className="font-bold">
                  Received By
                </p>

                <p className="mt-1 text-slate-600">
                  {payment?.receivedBy
                    ?.name ||
                    "School office"}
                </p>
              </div>
            </div>

            {payment.remarks && (
              <div className="mt-5 border border-slate-300 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Remarks
                </p>

                <p className="mt-2 text-sm text-slate-700">
                  {payment.remarks}
                </p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-300 pt-5 text-sm">
              <div>
                <p className="text-slate-500">
                  Invoice Payable
                </p>

                <p className="mt-1 font-black">
                  {formatMoney(
                    invoice.payableAmount
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-500">
                  Total Paid
                </p>

                <p className="mt-1 font-black">
                  {formatMoney(
                    invoice.paidAmount
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-500">
                  Remaining Balance
                </p>

                <p className="mt-1 font-black">
                  {formatMoney(
                    invoice.balanceAmount
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="py-3">
                    Fee Component
                  </th>

                  <th className="py-3 text-right">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {breakdown.map(
                  (
                    item
                  ) => (
                    <tr
                      key={
                        item.key
                      }
                      className="border-b border-slate-200"
                    >
                      <td className="py-3">
                        {item.label}
                      </td>

                      <td className="py-3 text-right font-bold">
                        {item.value <
                        0
                          ? `− ${formatMoney(
                              Math.abs(
                                item.value
                              )
                            )}`
                          : formatMoney(
                              item.value
                            )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-300 pt-5 text-sm">
              <div>
                <p className="text-slate-500">
                  Payable
                </p>

                <p className="mt-1 text-lg font-black">
                  {formatMoney(
                    invoice.payableAmount
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-500">
                  Paid
                </p>

                <p className="mt-1 text-lg font-black">
                  {formatMoney(
                    invoice.paidAmount
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-500">
                  Balance
                </p>

                <p className="mt-1 text-lg font-black">
                  {formatMoney(
                    invoice.balanceAmount
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-end justify-between gap-8 border-t border-slate-300 pt-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Record Status
            </p>

            <p className="mt-2 text-sm font-black">
              {formatStatus(
                invoice.paymentStatus
              )}
            </p>
          </div>

          <div className="w-52 border-t border-slate-500 pt-2 text-center text-xs text-slate-500">
            Authorised School Signature
          </div>
        </div>

        <p className="mt-8 text-center text-xs leading-5 text-slate-500">
          This document was generated from the Student Portal using the school fee register data.
        </p>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Student Fees Page
|--------------------------------------------------------------------------
*/

const StudentFees =
  () => {
    const navigate =
      useNavigate();

    const {
      student:
        overviewStudent,
      school:
        overviewSchool,
      online,
      refreshPortal
    } = useOutletContext();

    const requestControllerRef =
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
    ] = useState(
      1
    );

    const [
      feeMonth,
      setFeeMonth
    ] = useState("");

    const [
      paymentStatus,
      setPaymentStatus
    ] = useState("");

    const [
      useCurrentSession,
      setUseCurrentSession
    ] = useState(true);

    const [
      customSessionYear,
      setCustomSessionYear
    ] = useState("");

    const [
      localSearch,
      setLocalSearch
    ] = useState("");

    const [
      selectedInvoice,
      setSelectedInvoice
    ] = useState(null);

    const [
      printData,
      setPrintData
    ] = useState(null);

    /*
    |--------------------------------------------------------------------------
    | Load Fee Records
    |--------------------------------------------------------------------------
    */

    const loadFees =
      useCallback(
        async ({
          silent = false,
          requestedPage =
            page
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
              await getStudentPortalFees(
                {
                  page:
                    requestedPage,

                  limit:
                    PAGE_LIMIT,

                  feeMonth:
                    feeMonth ||
                    undefined,

                  paymentStatus:
                    paymentStatus ||
                    undefined,

                  useCurrentSession:
                    useCurrentSession
                      ? "true"
                      : undefined,

                  sessionYear:
                    !useCurrentSession &&
                    customSessionYear
                      ? customSessionYear
                      : undefined
                },
                {
                  signal:
                    controller.signal
                }
              );

            const data =
              response?.data
                ?.data ||
              null;

            setFeeData(
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
        [
          page,
          feeMonth,
          paymentStatus,
          useCurrentSession,
          customSessionYear
        ]
      );

    useEffect(() => {
      loadFees({
        requestedPage:
          page
      });

      return () => {
        requestControllerRef
          .current
          ?.abort();
      };
    }, [
      page,
      feeMonth,
      paymentStatus,
      useCurrentSession,
      customSessionYear,
      loadFees
    ]);

    /*
    |--------------------------------------------------------------------------
    | Print Cleanup
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      const cleanup =
        () => {
          document.body.classList.remove(
            "student-fee-report-print",
            "student-fee-receipt-print"
          );
        };

      window.addEventListener(
        "afterprint",
        cleanup
      );

      return () => {
        window.removeEventListener(
          "afterprint",
          cleanup
        );

        cleanup();
      };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Derived Data
    |--------------------------------------------------------------------------
    */

    const student =
      feeData?.student ||
      overviewStudent ||
      null;

    const school =
      student?.school ||
      overviewSchool ||
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
          0,

        accountStatus:
          "clear"
      };

    const pagination =
      feeData?.pagination ||
      {
        page:
          1,

        limit:
          PAGE_LIMIT,

        totalRecords:
          0,

        totalPages:
          1
      };

    const feeRecords =
      Array.isArray(
        feeData?.feeRecords
      )
        ? feeData.feeRecords
        : [];

    const filteredRecords =
      useMemo(
        () => {
          const query =
            normalizeSearch(
              localSearch
            );

          if (!query) {
            return feeRecords;
          }

          return feeRecords.filter(
            (
              invoice
            ) => {
              const searchable =
                [
                  invoice
                    ?.invoiceNumber,

                  invoice
                    ?.feeMonth,

                  invoice
                    ?.sessionYear,

                  invoice
                    ?.paymentStatus,

                  invoice
                    ?.classId
                    ?.className,

                  invoice
                    ?.feeStructureId
                    ?.title
                ]
                  .map(
                    normalizeSearch
                  )
                  .join(
                    " "
                  );

              return searchable.includes(
                query
              );
            }
          );
        },
        [
          feeRecords,
          localSearch
        ]
      );

    const visiblePayments =
      useMemo(
        () => {
          return feeRecords
            .flatMap(
              (
                invoice
              ) => {
                const payments =
                  Array.isArray(
                    invoice?.payments
                  )
                    ? invoice.payments
                    : [];

                return payments.map(
                  (
                    payment,
                    index
                  ) => ({
                    invoice,
                    payment,
                    index,
                    date:
                      getPaymentDate(
                        payment,
                        invoice
                      )
                  })
                );
              }
            )
            .sort(
              (
                first,
                second
              ) =>
                new Date(
                  second.date ||
                  0
                ) -
                new Date(
                  first.date ||
                  0
                )
            );
        },
        [
          feeRecords
        ]
      );

    const totalPayable =
      Number(
        summary
          ?.totalPayable ||
        0
      );

    const totalPaid =
      Number(
        summary
          ?.totalPaid ||
        0
      );

    const totalBalance =
      Number(
        summary
          ?.totalBalance ||
        0
      );

    const accountProgress =
      totalPayable >
      0
        ? Math.min(
            100,
            Math.max(
              0,
              Math.round(
                (
                  totalPaid /
                  totalPayable
                ) *
                  100
              )
            )
          )
        : 100;

    const accountClear =
      summary
        ?.accountStatus ===
        "clear" ||
      totalBalance <=
        0;

    const selectedSessionLabel =
      useCurrentSession
        ? student?.school
            ?.sessionYear ||
          "Current session"
        : customSessionYear ||
          "All sessions";

    const pageNumbers =
      useMemo(
        () => {
          const totalPages =
            Number(
              pagination
                ?.totalPages ||
              1
            );

          const currentPage =
            Number(
              pagination
                ?.page ||
              page
            );

          const start =
            Math.max(
              1,
              currentPage -
                2
            );

          const end =
            Math.min(
              totalPages,
              start +
                4
            );

          return Array.from(
            {
              length:
                Math.max(
                  0,
                  end -
                    start +
                    1
                )
            },
            (
              _,
              index
            ) =>
              start +
              index
          );
        },
        [
          pagination,
          page
        ]
      );

    const summaryCards = [
      {
        key:
          "payable",

        icon:
          ReceiptText,

        label:
          "Total Payable",

        value:
          formatMoney(
            totalPayable
          ),

        helper:
          `${Number(
            summary
              ?.invoiceCount ||
            0
          )} invoice record${
            Number(
              summary
                ?.invoiceCount ||
              0
            ) ===
            1
              ? ""
              : "s"
          } in the selected scope`,

        tone: {
          icon:
            "bg-brand-50 text-brand-700",

          bar:
            "bg-gradient-to-r from-brand-500 to-cyan-500"
        }
      },

      {
        key:
          "paid",

        icon:
          HandCoins,

        label:
          "Total Paid",

        value:
          formatMoney(
            totalPaid
          ),

        helper:
          `${Number(
            summary
              ?.paymentCount ||
            0
          )} payment transaction${
            Number(
              summary
                ?.paymentCount ||
              0
            ) ===
            1
              ? ""
              : "s"
          } recorded`,

        tone: {
          icon:
            "bg-emerald-50 text-emerald-700",

          bar:
            "bg-emerald-500"
        }
      },

      {
        key:
          "balance",

        icon:
          WalletCards,

        label:
          "Outstanding Balance",

        value:
          formatMoney(
            totalBalance
          ),

        helper:
          accountClear
            ? "The selected fee account is clear"
            : `${Number(
                summary
                  ?.unpaidInvoices ||
                0
              )} unpaid and ${Number(
                summary
                  ?.partialInvoices ||
                0
              )} partial invoice(s)`,

        tone: {
          icon:
            accountClear
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700",

          bar:
            accountClear
              ? "bg-emerald-500"
              : "bg-rose-500"
        }
      },

      {
        key:
          "paid-invoices",

        icon:
          BadgeCheck,

        label:
          "Paid Invoices",

        value:
          Number(
            summary
              ?.paidInvoices ||
            0
          ),

        helper:
          `${accountProgress}% of selected payable amount received`,

        tone: {
          icon:
            "bg-violet-50 text-violet-700",

          bar:
            "bg-violet-500"
        }
      }
    ];

    /*
    |--------------------------------------------------------------------------
    | Actions
    |--------------------------------------------------------------------------
    */

    const resetPage =
      () => {
        setPage(
          1
        );
      };

    const handleMonthChange =
      (
        event
      ) => {
        resetPage();

        setFeeMonth(
          event.target.value
        );
      };

    const handleStatusChange =
      (
        event
      ) => {
        resetPage();

        setPaymentStatus(
          event.target.value
        );
      };

    const handleSessionModeChange =
      (
        event
      ) => {
        const current =
          event.target.value ===
          "current";

        resetPage();

        setUseCurrentSession(
          current
        );

        if (
          current
        ) {
          setCustomSessionYear(
            ""
          );
        }
      };

    const handleCustomSessionChange =
      (
        event
      ) => {
        resetPage();

        setCustomSessionYear(
          event.target.value
        );
      };

    const handleClearFilters =
      () => {
        setPage(
          1
        );

        setFeeMonth(
          ""
        );

        setPaymentStatus(
          ""
        );

        setUseCurrentSession(
          true
        );

        setCustomSessionYear(
          ""
        );

        setLocalSearch(
          ""
        );
      };

    const handleRefresh =
      async () => {
        await Promise.all([
          loadFees({
            silent:
              true,
            requestedPage:
              page
          }),

          refreshPortal?.()
        ]);
      };

    const handleContactSchool =
      (
        invoice = null
      ) => {
        const invoiceText =
          invoice
            ? `${invoice.invoiceNumber || "fee invoice"} for ${formatFeeMonth(
                invoice.feeMonth
              )}`
            : `my fee account for ${selectedSessionLabel}`;

        navigate(
          "/student-portal/messages",
          {
            state: {
              compose: {
                subject:
                  "Fee record information request",

                category:
                  "fees",

                priority:
                  "normal",

                text:
                  `I would like clarification about ${invoiceText}.`
              }
            }
          }
        );
      };

    const startPrint =
      (
        mode,
        data = null
      ) => {
        document.body.classList.remove(
          "student-fee-report-print",
          "student-fee-receipt-print"
        );

        if (
          mode ===
          "receipt"
        ) {
          setPrintData(
            data
          );

          window.setTimeout(
            () => {
              document.body.classList.add(
                "student-fee-receipt-print"
              );

              window.print();
            },
            100
          );

          return;
        }

        document.body.classList.add(
          "student-fee-report-print"
        );

        window.print();
      };

    const handlePrintStatement =
      (
        invoice
      ) => {
        startPrint(
          "receipt",
          {
            invoice,
            payment:
              null,
            paymentIndex:
              0
          }
        );
      };

    const handlePrintReceipt =
      (
        invoice,
        payment,
        index
      ) => {
        startPrint(
          "receipt",
          {
            invoice,
            payment,
            paymentIndex:
              index
          }
        );
      };

    const handleExportCsv =
      () => {
        if (
          feeRecords.length ===
          0
        ) {
          return;
        }

        const rows = [
          [
            "Invoice Number",
            "Fee Month",
            "Session Year",
            "Class",
            "Fee Structure",
            "Monthly Fee",
            "Admission Fee",
            "Exam Fee",
            "Transport Fee",
            "Other Fee",
            "Fine",
            "Discount",
            "Payable Amount",
            "Paid Amount",
            "Balance Amount",
            "Payment Status",
            "Payment Count",
            "Created Date"
          ],

          ...feeRecords.map(
            (
              invoice
            ) => [
              invoice.invoiceNumber ||
                "",

              invoice.feeMonth ||
                "",

              invoice.sessionYear ||
                "",

              invoice.classId
                ?.className ||
                "",

              invoice.feeStructureId
                ?.title ||
                "",

              invoice.monthlyFee ||
                0,

              invoice.admissionFee ||
                0,

              invoice.examFee ||
                0,

              invoice.transportFee ||
                0,

              invoice.otherFee ||
                0,

              invoice.fine ||
                0,

              invoice.discount ||
                0,

              invoice.payableAmount ||
                0,

              invoice.paidAmount ||
                0,

              invoice.balanceAmount ||
                0,

              invoice.paymentStatus ||
                "",

              Array.isArray(
                invoice.payments
              )
                ? invoice.payments.length
                : 0,

              formatDate(
                invoice.createdAt
              )
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
          `student-fees-${
            student
              ?.admissionNumber ||
            "student"
          }-page-${page}.csv`;

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

    /*
    |--------------------------------------------------------------------------
    | Loading and Failure
    |--------------------------------------------------------------------------
    */

    if (
      loading &&
      !feeData
    ) {
      return (
        <FeeLoadingState />
      );
    }

    if (
      !feeData &&
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
              Fee records could not be loaded
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {error}
            </p>

            <button
              type="button"
              className="btn-primary mt-5"
              onClick={() =>
                loadFees()
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
              body.student-fee-report-print * {
                visibility: hidden !important;
              }

              body.student-fee-report-print #student-fees-report,
              body.student-fee-report-print #student-fees-report * {
                visibility: visible !important;
              }

              body.student-fee-report-print #student-fees-report {
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                background: white !important;
                padding: 20px !important;
              }

              body.student-fee-receipt-print * {
                visibility: hidden !important;
              }

              body.student-fee-receipt-print #student-fee-receipt,
              body.student-fee-receipt-print #student-fee-receipt * {
                visibility: visible !important;
              }

              body.student-fee-receipt-print #student-fee-receipt {
                display: block !important;
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                background: white !important;
              }

              .fees-print-hidden {
                display: none !important;
              }

              .fees-print-break {
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
          id="student-fees-report"
          className="space-y-6"
        >
          {/*
          |--------------------------------------------------------------------------
          | Refresh Error
          |--------------------------------------------------------------------------
          */}

          {error && (
            <div className="fees-print-hidden flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-rose-800">
                  Fee records could not refresh
                </p>

                <p className="mt-1 text-xs text-rose-600">
                  {error}
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-100"
                onClick={() =>
                  loadFees({
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
          | Fees Hero
          |--------------------------------------------------------------------------
          */}

          <section className="fees-print-break relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-7">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative grid gap-6 xl:grid-cols-[1fr_370px] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-white/10">
                    <WalletCards
                      size={13}
                    />

                    Secure Fee Account
                  </span>

                  <span
                    className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                      accountClear
                        ? "bg-emerald-400/10 text-emerald-200 ring-emerald-300/20"
                        : "bg-amber-400/10 text-amber-200 ring-amber-300/20"
                    }`}
                  >
                    {accountClear
                      ? "Account Clear"
                      : "Balance Due"}
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
                  Fees & Receipts
                </h2>

                <p className="mt-2 text-sm font-semibold text-slate-300">
                  {student?.name ||
                    "Student"}{" "}
                  ·{" "}
                  {formatClassName(
                    student
                  )}
                </p>

                <p className="mt-3 max-w-2xl text-xs leading-6 text-slate-400">
                  Review monthly invoices, fee components, payment transactions and printable receipts from the official school fee register.
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-xl bg-white/10 px-3 py-2 text-slate-200 ring-1 ring-white/10">
                    Admission:{" "}
                    {student
                      ?.admissionNumber ||
                      "Pending"}
                  </span>

                  <span className="rounded-xl bg-white/10 px-3 py-2 text-slate-200 ring-1 ring-white/10">
                    Session scope:{" "}
                    {selectedSessionLabel}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Outstanding Balance
                    </p>

                    <p className="mt-1 text-3xl font-black text-white">
                      {formatMoney(
                        totalBalance
                      )}
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${
                      accountClear
                        ? "bg-emerald-400/15 text-emerald-200 ring-emerald-300/20"
                        : "bg-amber-400/15 text-amber-200 ring-amber-300/20"
                    }`}
                  >
                    {accountClear ? (
                      <CheckCircle2
                        size={20}
                      />
                    ) : (
                      <CircleDollarSign
                        size={20}
                      />
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    <span>
                      Payment Progress
                    </span>

                    <span>
                      {accountProgress}%
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        accountClear
                          ? "bg-emerald-400"
                          : "bg-amber-400"
                      }`}
                      style={{
                        width:
                          `${accountProgress}%`
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/[0.06] p-3">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">
                      Paid
                    </p>

                    <p className="mt-1 text-xs font-black text-emerald-200">
                      {formatMoney(
                        totalPaid
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/[0.06] p-3">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">
                      Payable
                    </p>

                    <p className="mt-1 text-xs font-black text-white">
                      {formatMoney(
                        totalPayable
                      )}
                    </p>
                  </div>
                </div>

                {!accountClear && (
                  <button
                    type="button"
                    className="fees-print-hidden mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-brand-50"
                    onClick={() =>
                      handleContactSchool()
                    }
                  >
                    <MessageCircle
                      size={14}
                    />

                    Ask School About Balance
                  </button>
                )}
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
          | Filters
          |--------------------------------------------------------------------------
          */}

          <section className="fees-print-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[1fr_170px_180px_190px_auto] xl:items-center">
              <label className="relative block">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={
                    localSearch
                  }
                  className="field-input h-11 pl-10"
                  placeholder="Search visible invoices…"
                  onChange={(
                    event
                  ) =>
                    setLocalSearch(
                      event.target
                        .value
                    )
                  }
                />
              </label>

              <label className="relative block">
                <CalendarDays
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="month"
                  value={
                    feeMonth
                  }
                  className="field-input h-11 pl-9"
                  onChange={
                    handleMonthChange
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
                    paymentStatus
                  }
                  className="field-select h-11 pl-9"
                  onChange={
                    handleStatusChange
                  }
                >
                  {PAYMENT_STATUS_OPTIONS.map(
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
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <select
                  value={
                    useCurrentSession
                      ? "current"
                      : "custom"
                  }
                  className="field-select h-11"
                  onChange={
                    handleSessionModeChange
                  }
                >
                  <option value="current">
                    Current Session
                  </option>

                  <option value="custom">
                    Custom / All Sessions
                  </option>
                </select>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={
                    handleExportCsv
                  }
                  disabled={
                    feeRecords.length ===
                    0
                  }
                  title="Export current page"
                >
                  <Download
                    size={16}
                  />
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  onClick={() =>
                    startPrint(
                      "report"
                    )
                  }
                  title="Print fee report"
                >
                  <Printer
                    size={16}
                  />
                </button>

                <button
                  type="button"
                  className="rounded-xl bg-slate-950 p-2.5 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={
                    handleRefresh
                  }
                  disabled={
                    refreshing ||
                    !online
                  }
                  title="Refresh fee records"
                >
                  <RefreshCw
                    size={16}
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />
                </button>
              </div>
            </div>

            {!useCurrentSession && (
              <div className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr] sm:items-center">
                <label>
                  <span className="sr-only">
                    Custom session year
                  </span>

                  <input
                    type="text"
                    value={
                      customSessionYear
                    }
                    className="field-input h-11"
                    placeholder="Example: 2026-2027"
                    onChange={
                      handleCustomSessionChange
                    }
                  />
                </label>

                <p className="text-[10px] leading-5 text-slate-400">
                  Leave custom session blank to load all session years available for this student.
                </p>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
              <span>
                Showing{" "}
                {filteredRecords.length}{" "}
                visible invoice{filteredRecords.length ===
                1
                  ? ""
                  : "s"} on page{" "}
                {pagination.page}
              </span>

              {(feeMonth ||
                paymentStatus ||
                !useCurrentSession ||
                localSearch) && (
                <button
                  type="button"
                  className="font-bold text-brand-700"
                  onClick={
                    handleClearFilters
                  }
                >
                  Clear all filters
                </button>
              )}
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Invoice and Payment Grid
          |--------------------------------------------------------------------------
          */}

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <section className="fees-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={
                  ReceiptText
                }
                title="Fee Invoice History"
                subtitle={`${pagination.totalRecords} invoice record${
                  pagination.totalRecords ===
                  1
                    ? ""
                    : "s"
                } match the selected server filters.`}
              />

              <div className="mt-5">
                {filteredRecords.length >
                0 ? (
                  <div className="space-y-4">
                    {filteredRecords.map(
                      (
                        invoice
                      ) => (
                        <InvoiceCard
                          key={
                            invoice._id ||
                            invoice.id ||
                            invoice.invoiceNumber
                          }
                          invoice={
                            invoice
                          }
                          onOpen={
                            setSelectedInvoice
                          }
                          onPrintStatement={
                            handlePrintStatement
                          }
                        />
                      )
                    )}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                      <ReceiptText
                        size={25}
                      />
                    </div>

                    <p className="mt-4 text-base font-bold text-slate-800">
                      No matching fee invoices
                    </p>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                      No fee record matches the selected month, session, status or visible-page search.
                    </p>

                    <button
                      type="button"
                      className="fees-print-hidden mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-brand-50"
                      onClick={
                        handleClearFilters
                      }
                    >
                      Reset Fee Filters
                    </button>
                  </div>
                )}
              </div>

              {pagination.totalPages >
                1 && (
                <div className="fees-print-hidden mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Page{" "}
                    {pagination.page}{" "}
                    of{" "}
                    {pagination.totalPages}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
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
                      disabled={
                        pagination.page <=
                        1
                      }
                    >
                      <ChevronLeft
                        size={16}
                      />
                    </button>

                    {pageNumbers.map(
                      (
                        pageNumber
                      ) => (
                        <button
                          key={
                            pageNumber
                          }
                          type="button"
                          className={`min-w-9 rounded-xl px-3 py-2 text-xs font-bold transition ${
                            pageNumber ===
                            pagination.page
                              ? "bg-slate-950 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                          }`}
                          onClick={() =>
                            setPage(
                              pageNumber
                            )
                          }
                        >
                          {pageNumber}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
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
                      disabled={
                        pagination.page >=
                        pagination.totalPages
                      }
                    >
                      <ChevronRight
                        size={16}
                      />
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-6">
              {/*
              |--------------------------------------------------------------------------
              | Account Health
              |--------------------------------------------------------------------------
              */}

              <section
                className={`fees-print-break rounded-3xl border p-5 shadow-sm ${
                  accountClear
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-sm font-bold ${
                        accountClear
                          ? "text-emerald-900"
                          : "text-amber-900"
                      }`}
                    >
                      Fee Account Health
                    </p>

                    <p
                      className={`mt-1 text-xs leading-5 ${
                        accountClear
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {accountClear
                        ? "No outstanding balance exists in the selected fee scope."
                        : "A balance remains in one or more selected invoices."}
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      accountClear
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {accountClear ? (
                      <CheckCircle2
                        size={20}
                      />
                    ) : (
                      <WalletCards
                        size={20}
                      />
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white/80 p-3 text-center ring-1 ring-black/5">
                    <p className="text-xl font-black text-emerald-700">
                      {Number(
                        summary
                          ?.paidInvoices ||
                        0
                      )}
                    </p>

                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      Paid
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/80 p-3 text-center ring-1 ring-black/5">
                    <p className="text-xl font-black text-amber-700">
                      {Number(
                        summary
                          ?.partialInvoices ||
                        0
                      )}
                    </p>

                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      Partial
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/80 p-3 text-center ring-1 ring-black/5">
                    <p className="text-xl font-black text-rose-700">
                      {Number(
                        summary
                          ?.unpaidInvoices ||
                        0
                      )}
                    </p>

                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      Unpaid
                    </p>
                  </div>
                </div>

                {!accountClear && (
                  <button
                    type="button"
                    className="fees-print-hidden mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-amber-800 shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-100"
                    onClick={() =>
                      handleContactSchool()
                    }
                  >
                    <MessageCircle
                      size={14}
                    />

                    Request Fee Clarification
                  </button>
                )}
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Recent Payments
              |--------------------------------------------------------------------------
              */}

              <section className="fees-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader
                  icon={
                    HandCoins
                  }
                  title="Recent Payments"
                  subtitle="Transactions from the currently loaded invoice page."
                />

                <div className="mt-5 space-y-3">
                  {visiblePayments.length >
                  0 ? (
                    visiblePayments
                      .slice(
                        0,
                        6
                      )
                      .map(
                        (
                          item
                        ) => (
                          <button
                            key={`${item.invoice._id || item.invoice.invoiceNumber}-${item.index}`}
                            type="button"
                            className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-left transition hover:border-brand-200 hover:bg-brand-50"
                            onClick={() =>
                              handlePrintReceipt(
                                item.invoice,
                                item.payment,
                                item.index
                              )
                            }
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                              <Banknote
                                size={17}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-slate-800">
                                {item.invoice.invoiceNumber ||
                                  "Invoice"}{" "}
                                · Payment{" "}
                                {item.index +
                                  1}
                              </p>

                              <p className="mt-1 truncate text-[10px] text-slate-400">
                                {formatPaymentMethod(
                                  item.payment.paymentMethod
                                )}{" "}
                                ·{" "}
                                {formatDate(
                                  item.date
                                )}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs font-black text-emerald-700">
                                {formatMoney(
                                  item.payment.amount
                                )}
                              </p>

                              <p className="mt-1 text-[9px] font-bold text-brand-600 opacity-0 transition group-hover:opacity-100">
                                Print
                              </p>
                            </div>
                          </button>
                        )
                      )
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
                      <HandCoins
                        size={24}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 text-sm font-bold text-slate-700">
                        No payment transaction
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Payments from loaded invoices will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Fee Documents
              |--------------------------------------------------------------------------
              */}

              <section className="fees-print-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader
                  icon={
                    FileDown
                  }
                  title="Fee Documents"
                  subtitle="Export or print the currently loaded fee information."
                />

                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-left transition hover:border-brand-200 hover:bg-brand-50"
                    onClick={
                      handleExportCsv
                    }
                    disabled={
                      feeRecords.length ===
                      0
                    }
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <Download
                        size={17}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800">
                        Export Current Page
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        Download visible server records as CSV
                      </p>
                    </div>

                    <ArrowRight
                      size={14}
                      className="text-slate-300"
                    />
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-left transition hover:border-brand-200 hover:bg-brand-50"
                    onClick={() =>
                      startPrint(
                        "report"
                      )
                    }
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                      <Printer
                        size={17}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800">
                        Print Fee Report
                      </p>

                      <p className="mt-1 text-[10px] text-slate-400">
                        Print or save the loaded fee page as PDF
                      </p>
                    </div>

                    <ArrowRight
                      size={14}
                      className="text-slate-300"
                    />
                  </button>
                </div>
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Fee Policy
              |--------------------------------------------------------------------------
              */}

              <section className="fees-print-break rounded-3xl border border-sky-200 bg-sky-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <ShieldCheck
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-sky-900">
                      Protected financial record
                    </p>

                    <p className="mt-2 text-xs leading-6 text-sky-700">
                      Students can review invoices and receipts but cannot change payable amounts, discounts, fines or payment entries.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="fees-print-hidden mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-sky-800 shadow-sm ring-1 ring-sky-200 transition hover:bg-sky-100"
                  onClick={() =>
                    handleContactSchool()
                  }
                >
                  <MessageCircle
                    size={14}
                  />

                  Contact Fee Office
                </button>
              </section>
            </aside>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Footer Information
          |--------------------------------------------------------------------------
          */}

          <section className="fees-print-break flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Info
                  size={18}
                />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900">
                  Official fee register information
                </p>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                  This page displays fee invoices and payment transactions issued by the school. A missing payment or incorrect amount should be reported through the secure messaging module.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="fees-print-hidden inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              onClick={() =>
                handleContactSchool()
              }
            >
              <MessageCircle
                size={14}
              />

              Contact School
            </button>
          </section>
        </div>

        <PrintableFeeReceipt
          printData={
            printData
          }
          student={
            student
          }
          school={
            school
          }
        />

        <InvoiceDetailDrawer
          invoice={
            selectedInvoice
          }
          onClose={() =>
            setSelectedInvoice(
              null
            )
          }
          onPrintStatement={
            handlePrintStatement
          }
          onPrintReceipt={
            handlePrintReceipt
          }
          onContactSchool={
            handleContactSchool
          }
        />
      </>
    );
  };

export default StudentFees;
