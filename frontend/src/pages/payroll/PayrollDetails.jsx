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
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  Landmark,
  PencilLine,
  Plus,
  ReceiptText,
  RefreshCcw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
  X,
  XCircle
} from "lucide-react";

import {
  useAuth
} from "../../context/AuthContext";

import {
  approvePayroll,
  cancelPayroll,
  deletePayroll,
  getPayrollById,
  markPayrollPaid,
  recalculatePayroll,
  rejectPayroll,
  submitPayroll,
  updatePayrollAdjustments
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

const nonNegativeNumber = (
  value
) => {
  return Math.max(
    0,
    safeNumber(value)
  );
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
      (part) => part[0]
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
      "bg-slate-100 text-slate-600 ring-slate-500/10",

    generated:
      "bg-blue-50 text-blue-700 ring-blue-600/10",

    pending_approval:
      "bg-amber-50 text-amber-700 ring-amber-600/10",

    approved:
      "bg-violet-50 text-violet-700 ring-violet-600/10",

    rejected:
      "bg-rose-50 text-rose-700 ring-rose-600/10",

    paid:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/10",

    cancelled:
      "bg-slate-100 text-slate-500 ring-slate-500/10"
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
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
| Reusable UI Components
|--------------------------------------------------------------------------
*/

const DetailsSection = ({
  title,
  description,
  icon: Icon,
  children,
  action
}) => {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon size={19} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {title}
            </h3>

            {description && (
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
};

const InfoRow = ({
  label,
  value,
  valueClassName = ""
}) => {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span
        className={`max-w-[65%] text-right text-xs font-semibold text-slate-700 ${valueClassName}`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
};

const SummaryCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "default"
}) => {
  const tones = {
    default:
      "bg-brand-50 text-brand-700",

    success:
      "bg-emerald-50 text-emerald-700",

    danger:
      "bg-rose-50 text-rose-600",

    warning:
      "bg-amber-50 text-amber-700",

    violet:
      "bg-violet-50 text-violet-700"
  };

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p className="mt-2 truncate text-xl font-bold text-slate-800 sm:text-2xl">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            tones[tone] ||
            tones.default
          }`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

const BreakdownRow = ({
  label,
  amount,
  currency,
  note,
  positive = false
}) => {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-0">
      <div>
        <p className="text-xs font-semibold text-slate-700">
          {label}
        </p>

        {note && (
          <p className="mt-0.5 text-[10px] text-slate-400">
            {note}
          </p>
        )}
      </div>

      <span
        className={`text-xs font-bold ${
          positive
            ? "text-emerald-700"
            : "text-rose-600"
        }`}
      >
        {positive ? "+" : "-"}
        {formatMoney(
          amount,
          currency
        )}
      </span>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Modal Shell
|--------------------------------------------------------------------------
*/

const ModalShell = ({
  open,
  title,
  description,
  icon: Icon,
  children,
  onClose,
  disabled = false,
  maxWidth = "max-w-lg"
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 cursor-default"
        onClick={
          disabled
            ? undefined
            : onClose
        }
      />

      <div
        className={`relative z-10 max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon size={21} />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-800">
                {title}
              </h2>

              {description && (
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Confirmation Modal
|--------------------------------------------------------------------------
*/

const ConfirmationModal = ({
  open,
  title,
  description,
  warning,
  actionLabel,
  icon,
  processing,
  destructive = false,
  onClose,
  onConfirm
}) => {
  return (
    <ModalShell
      open={open}
      title={title}
      description={description}
      icon={icon}
      disabled={processing}
      onClose={onClose}
    >
      <div className="p-5">
        {warning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <p className="text-xs leading-5 text-amber-700">
                {warning}
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={processing}
            onClick={onConfirm}
            className={
              destructive
                ? "inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                : "btn-primary inline-flex items-center justify-center gap-2"
            }
          >
            {processing && (
              <RefreshCcw
                size={16}
                className="animate-spin"
              />
            )}

            {processing
              ? "Processing..."
              : actionLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

/*
|--------------------------------------------------------------------------
| Reason Modal
|--------------------------------------------------------------------------
*/

const ReasonModal = ({
  open,
  type,
  reason,
  processing,
  error,
  onReasonChange,
  onClose,
  onSubmit
}) => {
  const isReject =
    type === "reject";

  return (
    <ModalShell
      open={open}
      title={
        isReject
          ? "Reject Payroll"
          : "Cancel Payroll"
      }
      description={
        isReject
          ? "Provide a clear reason so the payroll can be corrected."
          : "Provide the reason for cancelling this payroll record."
      }
      icon={
        isReject
          ? XCircle
          : AlertTriangle
      }
      disabled={processing}
      onClose={onClose}
    >
      <form
        onSubmit={onSubmit}
        className="p-5"
      >
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <label className="block">
          <span className="field-label">
            {isReject
              ? "Rejection Reason"
              : "Cancellation Reason"}

            <span className="ml-1 text-rose-500">
              *
            </span>
          </span>

          <textarea
            rows={5}
            value={reason}
            disabled={processing}
            placeholder={
              isReject
                ? "Explain what needs to be corrected..."
                : "Explain why this payroll is being cancelled..."
            }
            className="field-input mt-1.5 min-h-32 resize-y"
            onChange={(
              event
            ) =>
              onReasonChange(
                event.target.value
              )
            }
          />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={processing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {processing ? (
              <RefreshCcw
                size={16}
                className="animate-spin"
              />
            ) : (
              <XCircle
                size={16}
              />
            )}

            {processing
              ? "Processing..."
              : isReject
                ? "Reject Payroll"
                : "Cancel Payroll"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/*
|--------------------------------------------------------------------------
| Initial Adjustment Form
|--------------------------------------------------------------------------
*/

const createAdjustmentForm = (
  payroll
) => ({
  bonus:
    payroll?.earnings
      ?.bonus ?? "",

  arrears:
    payroll?.earnings
      ?.arrears ?? "",

  reimbursements:
    payroll?.earnings
      ?.reimbursements ?? "",

  incentives:
    payroll?.earnings
      ?.incentives ?? "",

  salaryAdvance:
    payroll?.deductions
      ?.salaryAdvance ?? "",

  roundingAdjustment:
    payroll?.roundingAdjustment ??
    "",

  payrollNotes:
    payroll?.payrollNotes ||
    "",

  adjustmentNotes:
    payroll?.adjustmentNotes ||
    "",

  otherEarnings:
    Array.isArray(
      payroll?.earnings?.other
    )
      ? payroll.earnings.other.map(
          (item) => ({
            name:
              item.name || "",

            category:
              item.category ||
              "other",

            amount:
              item.amount ?? "",

            isTaxable:
              Boolean(
                item.isTaxable
              ),

            notes:
              item.notes || ""
          })
        )
      : [],

  otherDeductions:
    Array.isArray(
      payroll?.deductions?.other
    )
      ? payroll.deductions.other.map(
          (item) => ({
            name:
              item.name || "",

            category:
              item.category ||
              "other",

            amount:
              item.amount ?? "",

            notes:
              item.notes || ""
          })
        )
      : []
});

/*
|--------------------------------------------------------------------------
| Adjustment Modal
|--------------------------------------------------------------------------
*/

const AdjustmentModal = ({
  open,
  currency,
  form,
  processing,
  error,
  onChange,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onClose,
  onSubmit
}) => {
  return (
    <ModalShell
      open={open}
      title="Payroll Adjustments"
      description="Add bonuses, arrears, reimbursements, advances and manual adjustments."
      icon={PencilLine}
      disabled={processing}
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <form
        onSubmit={onSubmit}
        className="p-5"
      >
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [
              "bonus",
              "Bonus"
            ],
            [
              "arrears",
              "Arrears"
            ],
            [
              "reimbursements",
              "Reimbursements"
            ],
            [
              "incentives",
              "Incentives"
            ],
            [
              "salaryAdvance",
              "Salary Advance Deduction"
            ],
            [
              "roundingAdjustment",
              "Rounding Adjustment"
            ]
          ].map(
            ([
              key,
              label
            ]) => (
              <label
                key={key}
                className="block"
              >
                <span className="field-label">
                  {label}
                </span>

                <input
                  type="number"
                  step="0.01"
                  min={
                    key ===
                    "roundingAdjustment"
                      ? undefined
                      : "0"
                  }
                  value={form[key]}
                  disabled={processing}
                  placeholder={`${currency} 0`}
                  className="field-input mt-1.5"
                  onChange={(
                    event
                  ) =>
                    onChange(
                      key,
                      event.target
                        .value
                    )
                  }
                />
              </label>
            )
          )}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-700">
                Other Earnings
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Add custom bonuses,
                reimbursements or
                earning adjustments.
              </p>
            </div>

            <button
              type="button"
              disabled={processing}
              onClick={() =>
                onAddItem(
                  "otherEarnings"
                )
              }
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Plus size={15} />
              Add Earning
            </button>
          </div>

          {form.otherEarnings
            .length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
              No custom earnings added.
            </div>
          ) : (
            <div className="space-y-3">
              {form.otherEarnings.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-xl border border-slate-200 p-3 lg:grid-cols-[minmax(0,1fr)_170px_150px_130px_44px]"
                  >
                    <input
                      type="text"
                      value={item.name}
                      placeholder="Earning name"
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        onUpdateItem(
                          "otherEarnings",
                          index,
                          "name",
                          event.target
                            .value
                        )
                      }
                    />

                    <select
                      value={
                        item.category
                      }
                      className="field-select"
                      onChange={(
                        event
                      ) =>
                        onUpdateItem(
                          "otherEarnings",
                          index,
                          "category",
                          event.target
                            .value
                        )
                      }
                    >
                      <option value="bonus">
                        Bonus
                      </option>

                      <option value="arrears">
                        Arrears
                      </option>

                      <option value="reimbursement">
                        Reimbursement
                      </option>

                      <option value="incentive">
                        Incentive
                      </option>

                      <option value="adjustment">
                        Adjustment
                      </option>

                      <option value="other">
                        Other
                      </option>
                    </select>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount}
                      placeholder="Amount"
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        onUpdateItem(
                          "otherEarnings",
                          index,
                          "amount",
                          event.target
                            .value
                        )
                      }
                    />

                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={
                          item.isTaxable
                        }
                        onChange={(
                          event
                        ) =>
                          onUpdateItem(
                            "otherEarnings",
                            index,
                            "isTaxable",
                            event.target
                              .checked
                          )
                        }
                      />

                      Taxable
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        onRemoveItem(
                          "otherEarnings",
                          index
                        )
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                    >
                      <Trash2
                        size={16}
                      />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-700">
                Other Deductions
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Add penalties, loans,
                advances or other
                deduction items.
              </p>
            </div>

            <button
              type="button"
              disabled={processing}
              onClick={() =>
                onAddItem(
                  "otherDeductions"
                )
              }
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Plus size={15} />
              Add Deduction
            </button>
          </div>

          {form.otherDeductions
            .length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
              No custom deductions added.
            </div>
          ) : (
            <div className="space-y-3">
              {form.otherDeductions.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-xl border border-slate-200 p-3 lg:grid-cols-[minmax(0,1fr)_170px_150px_44px]"
                  >
                    <input
                      type="text"
                      value={item.name}
                      placeholder="Deduction name"
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        onUpdateItem(
                          "otherDeductions",
                          index,
                          "name",
                          event.target
                            .value
                        )
                      }
                    />

                    <select
                      value={
                        item.category
                      }
                      className="field-select"
                      onChange={(
                        event
                      ) =>
                        onUpdateItem(
                          "otherDeductions",
                          index,
                          "category",
                          event.target
                            .value
                        )
                      }
                    >
                      <option value="penalty">
                        Penalty
                      </option>

                      <option value="loan">
                        Loan
                      </option>

                      <option value="advance">
                        Advance
                      </option>

                      <option value="tax">
                        Tax
                      </option>

                      <option value="adjustment">
                        Adjustment
                      </option>

                      <option value="other">
                        Other
                      </option>
                    </select>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount}
                      placeholder="Amount"
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        onUpdateItem(
                          "otherDeductions",
                          index,
                          "amount",
                          event.target
                            .value
                        )
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        onRemoveItem(
                          "otherDeductions",
                          index
                        )
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                    >
                      <Trash2
                        size={16}
                      />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="field-label">
              Payroll Notes
            </span>

            <textarea
              rows={4}
              value={
                form.payrollNotes
              }
              className="field-input mt-1.5 min-h-28 resize-y"
              placeholder="General payroll notes..."
              onChange={(
                event
              ) =>
                onChange(
                  "payrollNotes",
                  event.target.value
                )
              }
            />
          </label>

          <label className="block">
            <span className="field-label">
              Adjustment Notes
            </span>

            <textarea
              rows={4}
              value={
                form.adjustmentNotes
              }
              className="field-input mt-1.5 min-h-28 resize-y"
              placeholder="Reason for these adjustments..."
              onChange={(
                event
              ) =>
                onChange(
                  "adjustmentNotes",
                  event.target.value
                )
              }
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={processing}
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            {processing ? (
              <RefreshCcw
                size={16}
                className="animate-spin"
              />
            ) : (
              <Save size={16} />
            )}

            {processing
              ? "Saving..."
              : "Save Adjustments"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/*
|--------------------------------------------------------------------------
| Payment Form
|--------------------------------------------------------------------------
*/

const createPaymentForm = (
  payroll
) => ({
  paymentMethod:
    payroll?.paymentDetails
      ?.paymentMethod ||
    "cash",

  paymentDate:
    new Date()
      .toISOString()
      .slice(0, 10),

  transactionReference:
    "",

  bankName:
    payroll?.paymentDetails
      ?.bankName || "",

  accountTitle:
    payroll?.paymentDetails
      ?.accountTitle || "",

  maskedAccountNumber:
    payroll?.paymentDetails
      ?.maskedAccountNumber ||
    "",

  chequeNumber: "",

  walletProvider:
    payroll?.paymentDetails
      ?.walletProvider || "",

  maskedWalletNumber:
    payroll?.paymentDetails
      ?.maskedWalletNumber ||
    "",

  paymentNotes: ""
});

/*
|--------------------------------------------------------------------------
| Payment Modal
|--------------------------------------------------------------------------
*/

const PaymentModal = ({
  open,
  form,
  currency,
  netSalary,
  processing,
  error,
  onChange,
  onClose,
  onSubmit
}) => {
  return (
    <ModalShell
      open={open}
      title="Record Salary Payment"
      description="Record the payment information for this approved payroll."
      icon={CreditCard}
      disabled={processing}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <form
        onSubmit={onSubmit}
        className="p-5"
      >
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mb-5 rounded-xl bg-slate-900 px-4 py-4 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Amount to Pay
          </p>

          <p className="mt-2 text-2xl font-bold">
            {formatMoney(
              netSalary,
              currency
            )}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="field-label">
              Payment Method
            </span>

            <select
              value={
                form.paymentMethod
              }
              className="field-select mt-1.5"
              onChange={(
                event
              ) =>
                onChange(
                  "paymentMethod",
                  event.target.value
                )
              }
            >
              <option value="cash">
                Cash
              </option>

              <option value="bank_transfer">
                Bank Transfer
              </option>

              <option value="cheque">
                Cheque
              </option>

              <option value="mobile_wallet">
                Mobile Wallet
              </option>
            </select>
          </label>

          <label className="block">
            <span className="field-label">
              Payment Date

              <span className="ml-1 text-rose-500">
                *
              </span>
            </span>

            <input
              type="date"
              value={
                form.paymentDate
              }
              className="field-input mt-1.5"
              onChange={(
                event
              ) =>
                onChange(
                  "paymentDate",
                  event.target.value
                )
              }
            />
          </label>

          {form.paymentMethod ===
            "bank_transfer" && (
            <>
              <label className="block">
                <span className="field-label">
                  Bank Name
                </span>

                <input
                  type="text"
                  value={form.bankName}
                  className="field-input mt-1.5"
                  onChange={(
                    event
                  ) =>
                    onChange(
                      "bankName",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="block">
                <span className="field-label">
                  Account Title
                </span>

                <input
                  type="text"
                  value={
                    form.accountTitle
                  }
                  className="field-input mt-1.5"
                  onChange={(
                    event
                  ) =>
                    onChange(
                      "accountTitle",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="block md:col-span-2">
                <span className="field-label">
                  Transaction Reference

                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </span>

                <input
                  type="text"
                  value={
                    form.transactionReference
                  }
                  placeholder="Bank transaction ID"
                  className="field-input mt-1.5"
                  onChange={(
                    event
                  ) =>
                    onChange(
                      "transactionReference",
                      event.target.value
                    )
                  }
                />
              </label>
            </>
          )}

          {form.paymentMethod ===
            "cheque" && (
            <>
              <label className="block">
                <span className="field-label">
                  Bank Name
                </span>

                <input
                  type="text"
                  value={form.bankName}
                  className="field-input mt-1.5"
                  onChange={(
                    event
                  ) =>
                    onChange(
                      "bankName",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="block">
                <span className="field-label">
                  Cheque Number

                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </span>

                <input
                  type="text"
                  value={
                    form.chequeNumber
                  }
                  className="field-input mt-1.5"
                  onChange={(
                    event
                  ) =>
                    onChange(
                      "chequeNumber",
                      event.target.value
                    )
                  }
                />
              </label>
            </>
          )}

          {form.paymentMethod ===
            "mobile_wallet" && (
            <>
              <label className="block">
                <span className="field-label">
                  Wallet Provider
                </span>

                <input
                  type="text"
                  value={
                    form.walletProvider
                  }
                  placeholder="JazzCash, Easypaisa..."
                  className="field-input mt-1.5"
                  onChange={(
                    event
                  ) =>
                    onChange(
                      "walletProvider",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="block">
                <span className="field-label">
                  Transaction Reference

                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </span>

                <input
                  type="text"
                  value={
                    form.transactionReference
                  }
                  className="field-input mt-1.5"
                  onChange={(
                    event
                  ) =>
                    onChange(
                      "transactionReference",
                      event.target.value
                    )
                  }
                />
              </label>
            </>
          )}

          <label className="block md:col-span-2">
            <span className="field-label">
              Payment Notes
            </span>

            <textarea
              rows={4}
              value={
                form.paymentNotes
              }
              placeholder="Optional payment notes..."
              className="field-input mt-1.5 min-h-28 resize-y"
              onChange={(
                event
              ) =>
                onChange(
                  "paymentNotes",
                  event.target.value
                )
              }
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={processing}
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            {processing ? (
              <RefreshCcw
                size={16}
                className="animate-spin"
              />
            ) : (
              <CreditCard
                size={16}
              />
            )}

            {processing
              ? "Recording..."
              : "Record Payment"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/*
|--------------------------------------------------------------------------
| Payroll Details Page
|--------------------------------------------------------------------------
*/

export const PayrollDetails =
  () => {
    const navigate =
      useNavigate();

    const {
      id
    } = useParams();

    const {
      user
    } = useAuth();

    /*
    |--------------------------------------------------------------------------
    | Permissions
    |--------------------------------------------------------------------------
    */

    const userRole =
      String(
        user?.role || ""
      ).toLowerCase();

    const canProcess =
      [
        "super_admin",
        "principal",
        "accountant"
      ].includes(
        userRole
      );

    const canApprove =
      [
        "super_admin",
        "principal"
      ].includes(
        userRole
      );

    const canManage =
      [
        "super_admin",
        "principal"
      ].includes(
        userRole
      );

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
      successMessage,
      setSuccessMessage
    ] = useState("");

    const [
      processingAction,
      setProcessingAction
    ] = useState("");

    const [
      confirmationAction,
      setConfirmationAction
    ] = useState("");

    const [
      reasonModalType,
      setReasonModalType
    ] = useState("");

    const [
      reason,
      setReason
    ] = useState("");

    const [
      modalError,
      setModalError
    ] = useState("");

    const [
      adjustmentModalOpen,
      setAdjustmentModalOpen
    ] = useState(false);

    const [
      adjustmentForm,
      setAdjustmentForm
    ] = useState(
      createAdjustmentForm(
        null
      )
    );

    const [
      paymentModalOpen,
      setPaymentModalOpen
    ] = useState(false);

    const [
      paymentForm,
      setPaymentForm
    ] = useState(
      createPaymentForm(
        null
      )
    );

    /*
    |--------------------------------------------------------------------------
    | Load Payroll
    |--------------------------------------------------------------------------
    */

    const loadPayroll =
      useCallback(
        async (
          mainLoader = false
        ) => {
          if (!id) {
            setError(
              "Payroll identifier is missing."
            );

            setLoading(false);

            return;
          }

          if (mainLoader) {
            setLoading(true);
          }

          setError("");

          try {
            const response =
              await getPayrollById(
                id
              );

            setPayroll(
              response?.payroll ||
              null
            );
          } catch (
            requestError
          ) {
            setPayroll(null);

            setError(
              getErrorMessage(
                requestError,
                "Payroll record could not be loaded."
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
      loadPayroll(true);
    }, [
      loadPayroll
    ]);

    /*
    |--------------------------------------------------------------------------
    | Auto Clear Success
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (
        !successMessage
      ) {
        return undefined;
      }

      const timeoutId =
        window.setTimeout(
          () => {
            setSuccessMessage(
              ""
            );
          },
          4500
        );

      return () => {
        window.clearTimeout(
          timeoutId
        );
      };
    }, [
      successMessage
    ]);

    /*
    |--------------------------------------------------------------------------
    | Derived Data
    |--------------------------------------------------------------------------
    */

    const staff =
      payroll?.staffId || {};

    const school =
      payroll?.schoolId || {};

    const salaryStructure =
      payroll
        ?.salaryStructureSnapshot ||
      {};

    const attendance =
      payroll
        ?.attendanceSummary ||
      {};

    const salaryRates =
      payroll?.salaryRates ||
      {};

    const earnings =
      payroll?.earnings || {};

    const deductions =
      payroll?.deductions || {};

    const payment =
      payroll?.paymentDetails ||
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

    const grossSalary =
      safeNumber(
        earnings.grossEarnings ??
        salaryStructure.grossSalary
      );

    const totalDeductions =
      safeNumber(
        deductions.totalDeductions
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
              ) * 100
            )
          )
        : 0;

    const unmarkedDays =
      safeNumber(
        attendance.unmarkedDays
      );

    /*
    |--------------------------------------------------------------------------
    | Earnings Breakdown
    |--------------------------------------------------------------------------
    */

    const earningItems =
      useMemo(() => {
        if (!payroll) {
          return [];
        }

        const allowanceData =
          earnings.allowances ||
          {};

        const items = [
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
              allowanceData
                .houseRent
          },

          {
            label:
              "Medical Allowance",

            amount:
              allowanceData
                .medical
          },

          {
            label:
              "Transport Allowance",

            amount:
              allowanceData
                .transport
          },

          {
            label:
              "Food Allowance",

            amount:
              allowanceData.food
          },

          {
            label:
              "Communication Allowance",

            amount:
              allowanceData
                .communication
          },

          {
            label:
              "Special Allowance",

            amount:
              allowanceData.special
          },

          {
            label:
              "Overtime Pay",

            amount:
              earnings.overtimePay
          },

          {
            label: "Bonus",
            amount:
              earnings.bonus
          },

          {
            label: "Arrears",
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
            label: "Incentives",
            amount:
              earnings.incentives
          }
        ].filter(
          (item) =>
            safeNumber(
              item.amount
            ) > 0
        );

        const otherAllowances =
          Array.isArray(
            allowanceData.other
          )
            ? allowanceData.other.map(
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
            : [];

        const otherEarnings =
          Array.isArray(
            earnings.other
          )
            ? earnings.other.map(
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
            : [];

        return [
          ...items,
          ...otherAllowances,
          ...otherEarnings
        ];
      }, [
        payroll,
        earnings
      ]);

    /*
    |--------------------------------------------------------------------------
    | Deduction Breakdown
    |--------------------------------------------------------------------------
    */

    const deductionItems =
      useMemo(() => {
        if (!payroll) {
          return [];
        }

        const items = [
          {
            label:
              "Absence Deduction",

            amount:
              deductions
                .absenceDeduction
          },

          {
            label:
              "Unpaid Leave Deduction",

            amount:
              deductions
                .unpaidLeaveDeduction
          },

          {
            label:
              "Half-Day Deduction",

            amount:
              deductions
                .halfDayDeduction
          },

          {
            label:
              "Late Arrival Deduction",

            amount:
              deductions
                .lateDeduction
          },

          {
            label:
              "Provident Fund",

            amount:
              deductions
                .providentFund
          },

          {
            label: "Tax",
            amount:
              deductions.tax
          },

          {
            label: "Insurance",
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
            ) > 0
        );

        const otherItems =
          Array.isArray(
            deductions.other
          )
            ? deductions.other.map(
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
            : [];

        return [
          ...items,
          ...otherItems
        ];
      }, [
        payroll,
        deductions
      ]);

    /*
    |--------------------------------------------------------------------------
    | Action Availability
    |--------------------------------------------------------------------------
    */

    const canRecalculate =
      canProcess &&
      [
        "draft",
        "generated",
        "rejected"
      ].includes(
        payroll?.status
      );

    const canEditAdjustments =
      canProcess &&
      [
        "draft",
        "generated",
        "rejected"
      ].includes(
        payroll?.status
      );

    const canSubmit =
      canProcess &&
      [
        "draft",
        "generated",
        "rejected"
      ].includes(
        payroll?.status
      );

    const canApprovePayroll =
      canApprove &&
      payroll?.status ===
        "pending_approval";

    const canRejectPayroll =
      canApprove &&
      payroll?.status ===
        "pending_approval";

    const canPay =
      canProcess &&
      payroll?.status ===
        "approved";

    const canCancel =
      canManage &&
      payroll?.status &&
      ![
        "paid",
        "cancelled"
      ].includes(
        payroll.status
      );

    const canDelete =
      canManage &&
      [
        "draft",
        "generated",
        "rejected",
        "cancelled"
      ].includes(
        payroll?.status
      );

    /*
    |--------------------------------------------------------------------------
    | Refresh
    |--------------------------------------------------------------------------
    */

    const handleRefresh =
      () => {
        if (refreshing) {
          return;
        }

        setRefreshing(true);
        loadPayroll(false);
      };

    /*
    |--------------------------------------------------------------------------
    | General Action Runner
    |--------------------------------------------------------------------------
    */

    const runAction =
      async ({
        action,
        operation,
        success,
        closeModals = true
      }) => {
        setProcessingAction(
          action
        );

        setError("");
        setModalError("");

        try {
          const response =
            await operation();

          setSuccessMessage(
            response?.message ||
            success
          );

          if (closeModals) {
            setConfirmationAction(
              ""
            );

            setReasonModalType(
              ""
            );

            setAdjustmentModalOpen(
              false
            );

            setPaymentModalOpen(
              false
            );
          }

          await loadPayroll(
            false
          );

          return response;
        } catch (
          actionError
        ) {
          const message =
            getErrorMessage(
              actionError,
              "Payroll operation could not be completed."
            );

          if (
            confirmationAction ||
            reasonModalType ||
            adjustmentModalOpen ||
            paymentModalOpen
          ) {
            setModalError(
              message
            );
          } else {
            setError(message);
          }

          return null;
        } finally {
          setProcessingAction(
            ""
          );
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Confirmation Action
    |--------------------------------------------------------------------------
    */

    const handleConfirmation =
      async () => {
        if (
          confirmationAction ===
          "recalculate"
        ) {
          await runAction({
            action:
              "recalculate",

            operation: () =>
              recalculatePayroll(
                id
              ),

            success:
              "Payroll recalculated successfully."
          });

          return;
        }

        if (
          confirmationAction ===
          "submit"
        ) {
          await runAction({
            action: "submit",

            operation: () =>
              submitPayroll(
                id,
                {
                  confirmIncompleteAttendance:
                    unmarkedDays >
                    0
                }
              ),

            success:
              "Payroll submitted for approval successfully."
          });

          return;
        }

        if (
          confirmationAction ===
          "approve"
        ) {
          await runAction({
            action: "approve",

            operation: () =>
              approvePayroll(
                id
              ),

            success:
              "Payroll approved successfully."
          });

          return;
        }

        if (
          confirmationAction ===
          "delete"
        ) {
          setProcessingAction(
            "delete"
          );

          setModalError("");

          try {
            const response =
              await deletePayroll(
                id
              );

            navigate(
              "/payroll",
              {
                replace: true,

                state: {
                  successMessage:
                    response?.message ||
                    "Payroll deleted successfully."
                }
              }
            );
          } catch (
            deleteError
          ) {
            setModalError(
              getErrorMessage(
                deleteError,
                "Payroll could not be deleted."
              )
            );
          } finally {
            setProcessingAction(
              ""
            );
          }
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Reject / Cancel
    |--------------------------------------------------------------------------
    */

    const openReasonModal = (
      type
    ) => {
      setReasonModalType(
        type
      );

      setReason("");
      setModalError("");
    };

    const handleReasonSubmit =
      async (event) => {
        event.preventDefault();

        const cleanReason =
          String(reason)
            .trim();

        if (!cleanReason) {
          setModalError(
            reasonModalType ===
              "reject"
              ? "Rejection reason is required."
              : "Cancellation reason is required."
          );

          return;
        }

        if (
          reasonModalType ===
          "reject"
        ) {
          await runAction({
            action: "reject",

            operation: () =>
              rejectPayroll(
                id,
                cleanReason
              ),

            success:
              "Payroll rejected successfully."
          });

          return;
        }

        await runAction({
          action: "cancel",

          operation: () =>
            cancelPayroll(
              id,
              cleanReason
            ),

          success:
            "Payroll cancelled successfully."
        });
      };

    /*
    |--------------------------------------------------------------------------
    | Adjustment Modal
    |--------------------------------------------------------------------------
    */

    const openAdjustmentModal =
      () => {
        setAdjustmentForm(
          createAdjustmentForm(
            payroll
          )
        );

        setModalError("");

        setAdjustmentModalOpen(
          true
        );
      };

    const updateAdjustmentField = (
      key,
      value
    ) => {
      setAdjustmentForm(
        (current) => ({
          ...current,
          [key]: value
        })
      );
    };

    const addAdjustmentItem = (
      section
    ) => {
      setAdjustmentForm(
        (current) => ({
          ...current,

          [section]: [
            ...current[section],

            section ===
            "otherEarnings"
              ? {
                  name: "",
                  category:
                    "other",
                  amount: "",
                  isTaxable:
                    false,
                  notes: ""
                }
              : {
                  name: "",
                  category:
                    "other",
                  amount: "",
                  notes: ""
                }
          ]
        })
      );
    };

    const updateAdjustmentItem = (
      section,
      index,
      key,
      value
    ) => {
      setAdjustmentForm(
        (current) => {
          const nextItems = [
            ...current[section]
          ];

          nextItems[index] = {
            ...nextItems[index],
            [key]: value
          };

          return {
            ...current,
            [section]:
              nextItems
          };
        }
      );
    };

    const removeAdjustmentItem = (
      section,
      index
    ) => {
      setAdjustmentForm(
        (current) => ({
          ...current,

          [section]:
            current[
              section
            ].filter(
              (
                _,
                itemIndex
              ) =>
                itemIndex !==
                index
            )
        })
      );
    };

    const handleAdjustmentSubmit =
      async (event) => {
        event.preventDefault();

        const payload = {
          bonus:
            nonNegativeNumber(
              adjustmentForm
                .bonus
            ),

          arrears:
            nonNegativeNumber(
              adjustmentForm
                .arrears
            ),

          reimbursements:
            nonNegativeNumber(
              adjustmentForm
                .reimbursements
            ),

          incentives:
            nonNegativeNumber(
              adjustmentForm
                .incentives
            ),

          salaryAdvance:
            nonNegativeNumber(
              adjustmentForm
                .salaryAdvance
            ),

          roundingAdjustment:
            safeNumber(
              adjustmentForm
                .roundingAdjustment
            ),

          payrollNotes:
            String(
              adjustmentForm
                .payrollNotes ||
              ""
            ).trim(),

          adjustmentNotes:
            String(
              adjustmentForm
                .adjustmentNotes ||
              ""
            ).trim(),

          otherEarnings:
            adjustmentForm
              .otherEarnings
              .map(
                (item) => ({
                  name:
                    String(
                      item.name ||
                      ""
                    ).trim(),

                  category:
                    item.category,

                  amount:
                    nonNegativeNumber(
                      item.amount
                    ),

                  isTaxable:
                    Boolean(
                      item.isTaxable
                    ),

                  notes:
                    String(
                      item.notes ||
                      ""
                    ).trim()
                })
              )
              .filter(
                (item) =>
                  item.name
              ),

          otherDeductions:
            adjustmentForm
              .otherDeductions
              .map(
                (item) => ({
                  name:
                    String(
                      item.name ||
                      ""
                    ).trim(),

                  category:
                    item.category,

                  amount:
                    nonNegativeNumber(
                      item.amount
                    ),

                  notes:
                    String(
                      item.notes ||
                      ""
                    ).trim()
                })
              )
              .filter(
                (item) =>
                  item.name
              )
        };

        await runAction({
          action:
            "adjustments",

          operation: () =>
            updatePayrollAdjustments(
              id,
              payload
            ),

          success:
            "Payroll adjustments updated successfully."
        });
      };

    /*
    |--------------------------------------------------------------------------
    | Payment Modal
    |--------------------------------------------------------------------------
    */

    const openPaymentModal =
      () => {
        setPaymentForm(
          createPaymentForm(
            payroll
          )
        );

        setModalError("");

        setPaymentModalOpen(
          true
        );
      };

    const updatePaymentField = (
      key,
      value
    ) => {
      setPaymentForm(
        (current) => ({
          ...current,
          [key]: value
        })
      );
    };

    const handlePaymentSubmit =
      async (event) => {
        event.preventDefault();

        if (
          !paymentForm
            .paymentDate
        ) {
          setModalError(
            "Payment date is required."
          );

          return;
        }

        if (
          paymentForm
            .paymentMethod ===
            "bank_transfer" &&
          !String(
            paymentForm
              .transactionReference ||
              ""
          ).trim()
        ) {
          setModalError(
            "Transaction reference is required for bank transfer."
          );

          return;
        }

        if (
          paymentForm
            .paymentMethod ===
            "cheque" &&
          !String(
            paymentForm
              .chequeNumber ||
              ""
          ).trim()
        ) {
          setModalError(
            "Cheque number is required."
          );

          return;
        }

        if (
          paymentForm
            .paymentMethod ===
            "mobile_wallet" &&
          !String(
            paymentForm
              .transactionReference ||
              ""
          ).trim()
        ) {
          setModalError(
            "Transaction reference is required for mobile wallet payment."
          );

          return;
        }

        await runAction({
          action: "payment",

          operation: () =>
            markPayrollPaid(
              id,
              {
                ...paymentForm,

                paymentDate:
                  paymentForm
                    .paymentDate
              }
            ),

          success:
            "Payroll payment recorded successfully."
        });
      };

    /*
    |--------------------------------------------------------------------------
    | Confirmation Content
    |--------------------------------------------------------------------------
    */

    const confirmationContent =
      useMemo(() => {
        if (
          confirmationAction ===
          "recalculate"
        ) {
          return {
            title:
              "Recalculate Payroll",

            description:
              "Recalculate this payroll using the latest attendance and salary structure data.",

            warning:
              "Existing attendance deductions and overtime calculations will be replaced.",

            actionLabel:
              "Recalculate",

            icon: RotateCcw,
            destructive: false
          };
        }

        if (
          confirmationAction ===
          "submit"
        ) {
          return {
            title:
              "Submit for Approval",

            description:
              "Submit this payroll for principal or administrator approval.",

            warning:
              unmarkedDays > 0
                ? `${unmarkedDays} working day(s) have no attendance record. By continuing, you confirm that the payroll may be submitted with incomplete attendance.`
                : "After submission, salary adjustments cannot be changed unless the payroll is rejected.",

            actionLabel:
              "Submit Payroll",

            icon: Send,
            destructive: false
          };
        }

        if (
          confirmationAction ===
          "approve"
        ) {
          return {
            title:
              "Approve Payroll",

            description:
              "Approve this payroll and make it ready for payment.",

            warning:
              "Review earnings, deductions and attendance carefully before approval.",

            actionLabel:
              "Approve Payroll",

            icon:
              CheckCircle2,

            destructive: false
          };
        }

        return {
          title:
            "Delete Payroll",

          description:
            "Move this payroll to the deleted payroll records list.",

          warning:
            "The payroll can be restored later if another active payroll does not exist for the same staff member and period.",

          actionLabel:
            "Delete Payroll",

          icon: Trash2,
          destructive: true
        };
      }, [
        confirmationAction,
        unmarkedDays
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
              Loading payroll details...
            </p>
          </div>
        </div>
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Missing Payroll
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
              Payroll Not Available
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              {error ||
                "The requested payroll record could not be found."}
            </p>

            <button
              type="button"
              onClick={() =>
                loadPayroll(true)
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
        | Header
        |--------------------------------------------------------------------------
        */}

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/payroll"
                )
              }
              className="mt-0.5 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <ArrowLeft
                size={18}
              />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                  Payroll Details
                </h2>

                <PayrollStatusBadge
                  status={
                    payroll.status
                  }
                />
              </div>

              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                {payroll.payrollNumber}{" "}
                ·{" "}
                {payroll.periodLabel ||
                  `${formatDate(
                    payroll.periodStart
                  )} – ${formatDate(
                    payroll.periodEnd
                  )}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                  `/payroll/${payroll._id}/payslip`
                )
              }
              className="btn-secondary inline-flex items-center gap-2"
            >
              <FileText
                size={16}
              />

              Payslip
            </button>

            {canRecalculate && (
              <button
                type="button"
                onClick={() => {
                  setModalError(
                    ""
                  );

                  setConfirmationAction(
                    "recalculate"
                  );
                }}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <RotateCcw
                  size={16}
                />

                Recalculate
              </button>
            )}

            {canEditAdjustments && (
              <button
                type="button"
                onClick={
                  openAdjustmentModal
                }
                className="btn-secondary inline-flex items-center gap-2"
              >
                <PencilLine
                  size={16}
                />

                Adjustments
              </button>
            )}

            {canSubmit && (
              <button
                type="button"
                onClick={() => {
                  setModalError(
                    ""
                  );

                  setConfirmationAction(
                    "submit"
                  );
                }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Send size={16} />

                Submit
              </button>
            )}

            {canApprovePayroll && (
              <button
                type="button"
                onClick={() => {
                  setModalError(
                    ""
                  );

                  setConfirmationAction(
                    "approve"
                  );
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <CheckCircle2
                  size={16}
                />

                Approve
              </button>
            )}

            {canRejectPayroll && (
              <button
                type="button"
                onClick={() =>
                  openReasonModal(
                    "reject"
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <XCircle
                  size={16}
                />

                Reject
              </button>
            )}

            {canPay && (
              <button
                type="button"
                onClick={
                  openPaymentModal
                }
                className="btn-primary inline-flex items-center gap-2"
              >
                <CreditCard
                  size={16}
                />

                Record Payment
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={() =>
                  openReasonModal(
                    "cancel"
                  )
                }
                className="btn-secondary inline-flex items-center gap-2"
              >
                <AlertTriangle
                  size={16}
                />

                Cancel
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  setModalError(
                    ""
                  );

                  setConfirmationAction(
                    "delete"
                  );
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <Trash2
                  size={16}
                />

                Delete
              </button>
            )}
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Messages
        |--------------------------------------------------------------------------
        */}

        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
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

        {successMessage && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="flex items-start gap-2">
              <CheckCircle2
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {successMessage}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage(
                  ""
                )
              }
              className="rounded-lg p-1 transition hover:bg-emerald-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {payroll.status ===
          "rejected" &&
          payroll.rejectionReason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-3">
                <XCircle
                  size={19}
                  className="mt-0.5 shrink-0 text-rose-600"
                />

                <div>
                  <p className="text-sm font-bold text-rose-800">
                    Payroll Rejected
                  </p>

                  <p className="mt-1 text-sm leading-6 text-rose-700">
                    {
                      payroll.rejectionReason
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

        {payroll.status ===
          "cancelled" &&
          payroll.cancellationReason && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={19}
                  className="mt-0.5 shrink-0 text-slate-500"
                />

                <div>
                  <p className="text-sm font-bold text-slate-700">
                    Payroll Cancelled
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {
                      payroll.cancellationReason
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

        {/*
        |--------------------------------------------------------------------------
        | Staff Profile
        |--------------------------------------------------------------------------
        */}

        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6 text-white sm:px-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {staff.photo ? (
                  <img
                    src={staff.photo}
                    alt={staffName}
                    className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-4 ring-white/10"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold ring-1 ring-white/15">
                    {getInitials(
                      staffName
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="truncate text-xl font-bold">
                    {staffName}
                  </h3>

                  <p className="mt-1 text-sm text-slate-300">
                    {designation}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                      {employeeId}
                    </span>

                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                      {department}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/10">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Net Salary
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {formatMoney(
                    netSalary,
                    currency
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Final salary for this
                  payroll period
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <Landmark
                  size={16}
                />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  School
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {school.schoolName ||
                    "—"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <CalendarDays
                  size={16}
                />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Payroll Period
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {payroll.periodLabel ||
                    `${formatDate(
                      payroll.periodStart
                    )} – ${formatDate(
                      payroll.periodEnd
                    )}`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <ReceiptText
                  size={16}
                />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Payroll Number
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {payroll.payrollNumber ||
                    "—"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <FileText
                  size={16}
                />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Payslip Number
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {payroll.payslipNumber ||
                    "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Summary Cards
        |--------------------------------------------------------------------------
        */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Gross Earnings"
            value={formatMoney(
              grossSalary,
              currency
            )}
            subtitle="Basic salary, allowances and adjustments"
            icon={
              BadgeDollarSign
            }
            tone="success"
          />

          <SummaryCard
            title="Total Deductions"
            value={formatMoney(
              totalDeductions,
              currency
            )}
            subtitle="Attendance and fixed deductions"
            icon={ShieldCheck}
            tone="danger"
          />

          <SummaryCard
            title="Net Salary"
            value={formatMoney(
              netSalary,
              currency
            )}
            subtitle="Final payable salary"
            icon={Banknote}
          />

          <SummaryCard
            title="Attendance"
            value={`${attendancePercentage.toFixed(
              0
            )}%`}
            subtitle={`${payableDays} payable of ${standardWorkingDays} working days`}
            icon={CalendarDays}
            tone={
              attendancePercentage >=
              90
                ? "success"
                : "warning"
            }
          />
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Main Grid
        |--------------------------------------------------------------------------
        */}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {/*
            |--------------------------------------------------------------------------
            | Earnings
            |--------------------------------------------------------------------------
            */}

            <DetailsSection
              title="Earnings Breakdown"
              description="Basic salary, allowances, overtime and payroll additions."
              icon={
                BadgeDollarSign
              }
              action={
                canEditAdjustments ? (
                  <button
                    type="button"
                    onClick={
                      openAdjustmentModal
                    }
                    className="btn-secondary inline-flex items-center gap-2"
                  >
                    <PencilLine
                      size={15}
                    />

                    Adjust
                  </button>
                ) : null
              }
            >
              {earningItems.length ===
              0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
                  No earning items are
                  available.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  {earningItems.map(
                    (
                      item,
                      index
                    ) => (
                      <BreakdownRow
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
                        positive
                      />
                    )
                  )}

                  <div className="flex items-center justify-between gap-4 bg-emerald-50 px-4 py-4">
                    <span className="text-sm font-bold text-emerald-800">
                      Gross Earnings
                    </span>

                    <span className="text-base font-bold text-emerald-800">
                      {formatMoney(
                        grossSalary,
                        currency
                      )}
                    </span>
                  </div>
                </div>
              )}
            </DetailsSection>

            {/*
            |--------------------------------------------------------------------------
            | Deductions
            |--------------------------------------------------------------------------
            */}

            <DetailsSection
              title="Deduction Breakdown"
              description="Attendance deductions, tax, loans and other deductions."
              icon={ShieldCheck}
            >
              {deductionItems.length ===
              0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
                  No deductions were
                  applied.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  {deductionItems.map(
                    (
                      item,
                      index
                    ) => (
                      <BreakdownRow
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
                  )}

                  <div className="flex items-center justify-between gap-4 bg-rose-50 px-4 py-4">
                    <span className="text-sm font-bold text-rose-700">
                      Total Deductions
                    </span>

                    <span className="text-base font-bold text-rose-700">
                      {formatMoney(
                        totalDeductions,
                        currency
                      )}
                    </span>
                  </div>
                </div>
              )}

              {safeNumber(
                payroll.roundingAdjustment
              ) !== 0 && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                  <span className="text-xs font-semibold text-slate-600">
                    Rounding Adjustment
                  </span>

                  <span className="text-xs font-bold text-slate-700">
                    {formatMoney(
                      payroll.roundingAdjustment,
                      currency
                    )}
                  </span>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-4 text-white">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Final Net Salary
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Gross earnings minus
                    deductions
                  </p>
                </div>

                <span className="text-xl font-bold">
                  {formatMoney(
                    netSalary,
                    currency
                  )}
                </span>
              </div>
            </DetailsSection>

            {/*
            |--------------------------------------------------------------------------
            | Attendance Summary
            |--------------------------------------------------------------------------
            */}

            <DetailsSection
              title="Attendance Summary"
              description="Attendance data used for salary calculation."
              icon={CalendarDays}
            >
              {unmarkedDays > 0 && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      size={17}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <p className="text-xs leading-5 text-amber-700">
                      {unmarkedDays}{" "}
                      working day(s) have
                      no attendance
                      record.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    "Standard Days",
                    standardWorkingDays
                  ],
                  [
                    "Recorded Days",
                    attendance
                      .recordedAttendanceDays
                  ],
                  [
                    "Present",
                    attendance.presentDays
                  ],
                  [
                    "Payable Days",
                    payableDays
                  ],
                  [
                    "Absent",
                    attendance.absentDays
                  ],
                  [
                    "Late",
                    attendance.lateDays
                  ],
                  [
                    "Paid Leave",
                    attendance
                      .paidLeaveDays
                  ],
                  [
                    "Unpaid Leave",
                    attendance
                      .unpaidLeaveDays
                  ],
                  [
                    "Half Days",
                    attendance.halfDays
                  ],
                  [
                    "Unmarked Days",
                    attendance.unmarkedDays
                  ],
                  [
                    "Late Minutes",
                    attendance
                      .totalLateMinutes
                  ],
                  [
                    "Overtime Minutes",
                    attendance
                      .totalOvertimeMinutes
                  ]
                ].map(
                  ([
                    label,
                    value
                  ]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {label}
                      </p>

                      <p className="mt-2 text-xl font-bold text-slate-800">
                        {safeNumber(
                          value
                        )}
                      </p>
                    </div>
                  )
                )}
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">
                    Attendance Percentage
                  </span>

                  <span className="font-bold text-slate-700">
                    {attendancePercentage.toFixed(
                      1
                    )}
                    %
                  </span>
                </div>

                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all"
                    style={{
                      width: `${attendancePercentage}%`
                    }}
                  />
                </div>
              </div>
            </DetailsSection>

            {/*
            |--------------------------------------------------------------------------
            | Notes
            |--------------------------------------------------------------------------
            */}

            <DetailsSection
              title="Payroll Notes"
              description="Administrative and adjustment notes."
              icon={FileText}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    General Notes
                  </p>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {payroll.payrollNotes ||
                      "No general payroll notes were added."}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Adjustment Notes
                  </p>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {payroll.adjustmentNotes ||
                      "No adjustment notes were added."}
                  </p>
                </div>
              </div>
            </DetailsSection>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Sidebar
          |--------------------------------------------------------------------------
          */}

          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            {/*
            |--------------------------------------------------------------------------
            | Salary Rates
            |--------------------------------------------------------------------------
            */}

            <div className="card overflow-hidden">
              <div className="bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                    <Calculator
                      size={21}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold">
                      Salary Rates
                    </h3>

                    <p className="mt-0.5 text-xs text-white/70">
                      Rates used for this
                      payroll
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <InfoRow
                  label="Basic Salary"
                  value={formatMoney(
                    earnings.basicSalary,
                    currency
                  )}
                />

                <InfoRow
                  label="Daily Rate"
                  value={formatMoney(
                    salaryRates.dailyRate,
                    currency
                  )}
                />

                <InfoRow
                  label="Hourly Rate"
                  value={formatMoney(
                    salaryRates.hourlyRate,
                    currency
                  )}
                />

                <InfoRow
                  label="Overtime Rate"
                  value={formatMoney(
                    salaryRates
                      .overtimeHourlyRate,
                    currency
                  )}
                />

                <InfoRow
                  label="Daily Rate Basis"
                  value={formatLabel(
                    salaryRates
                      .dailyRateBasis
                  )}
                />

                <InfoRow
                  label="Calculation Basis"
                  value={formatLabel(
                    salaryStructure
                      .calculationBasis
                  )}
                />
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Payment Information
            |--------------------------------------------------------------------------
            */}

            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <CreditCard
                    size={18}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Payment Information
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Salary payment
                    record
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <InfoRow
                  label="Payment Status"
                  value={
                    payroll.status ===
                    "paid" ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Paid
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                        Not Paid
                      </span>
                    )
                  }
                />

                <InfoRow
                  label="Payment Method"
                  value={formatLabel(
                    payment.paymentMethod
                  )}
                />

                <InfoRow
                  label="Payment Date"
                  value={formatDate(
                    payment.paymentDate ||
                    payroll.paidAt
                  )}
                />

                <InfoRow
                  label="Bank Name"
                  value={
                    payment.bankName ||
                    "—"
                  }
                />

                <InfoRow
                  label="Account Title"
                  value={
                    payment.accountTitle ||
                    "—"
                  }
                />

                <InfoRow
                  label="Account"
                  value={
                    payment.maskedAccountNumber ||
                    "—"
                  }
                />

                <InfoRow
                  label="Transaction Reference"
                  value={
                    payment.transactionReference ||
                    "—"
                  }
                />

                <InfoRow
                  label="Cheque Number"
                  value={
                    payment.chequeNumber ||
                    "—"
                  }
                />

                <InfoRow
                  label="Wallet Provider"
                  value={
                    payment.walletProvider ||
                    "—"
                  }
                />
              </div>

              {canPay && (
                <button
                  type="button"
                  onClick={
                    openPaymentModal
                  }
                  className="btn-primary mt-4 flex w-full items-center justify-center gap-2"
                >
                  <CreditCard
                    size={16}
                  />

                  Record Payment
                </button>
              )}
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Workflow
            |--------------------------------------------------------------------------
            */}

            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <ShieldCheck
                    size={18}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Approval Workflow
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Payroll processing
                    history
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <InfoRow
                  label="Generated By"
                  value={
                    payroll.generatedBy
                      ?.name ||
                    "System User"
                  }
                />

                <InfoRow
                  label="Generated At"
                  value={formatDateTime(
                    payroll.generatedAt
                  )}
                />

                <InfoRow
                  label="Submitted By"
                  value={
                    payroll.submittedBy
                      ?.name ||
                    "—"
                  }
                />

                <InfoRow
                  label="Submitted At"
                  value={formatDateTime(
                    payroll.submittedAt
                  )}
                />

                <InfoRow
                  label="Approved By"
                  value={
                    payroll.approvedBy
                      ?.name ||
                    "—"
                  }
                />

                <InfoRow
                  label="Approved At"
                  value={formatDateTime(
                    payroll.approvedAt
                  )}
                />

                <InfoRow
                  label="Rejected By"
                  value={
                    payroll.rejectedBy
                      ?.name ||
                    "—"
                  }
                />

                <InfoRow
                  label="Paid By"
                  value={
                    payroll.paidBy
                      ?.name ||
                    "—"
                  }
                />

                <InfoRow
                  label="Paid At"
                  value={formatDateTime(
                    payroll.paidAt
                  )}
                />
              </div>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Salary Structure
            |--------------------------------------------------------------------------
            */}

            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <WalletCards
                    size={18}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Salary Structure
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Payroll calculation
                    snapshot
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <InfoRow
                  label="Gross Salary"
                  value={formatMoney(
                    salaryStructure
                      .grossSalary,
                    currency
                  )}
                />

                <InfoRow
                  label="Fixed Allowances"
                  value={formatMoney(
                    salaryStructure
                      .fixedAllowancesTotal,
                    currency
                  )}
                />

                <InfoRow
                  label="Fixed Deductions"
                  value={formatMoney(
                    salaryStructure
                      .fixedDeductionsTotal,
                    currency
                  )}
                />

                <InfoRow
                  label="Working Days"
                  value={
                    salaryStructure
                      .fixedWorkingDays ||
                    26
                  }
                />

                <InfoRow
                  label="Working Days Method"
                  value={formatLabel(
                    salaryStructure
                      .workingDaysMethod
                  )}
                />
              </div>

              {payroll
                .salaryStructureId
                ?._id && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/payroll/salary-structures/${payroll.salaryStructureId._id}`
                    )
                  }
                  className="btn-secondary mt-4 flex w-full items-center justify-center gap-2"
                >
                  <WalletCards
                    size={16}
                  />

                  View Salary Structure
                </button>
              )}
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Record Information
            |--------------------------------------------------------------------------
            */}

            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                  <BriefcaseBusiness
                    size={18}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Record Information
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Creation and update
                    information
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <InfoRow
                  label="Created By"
                  value={
                    payroll.createdBy
                      ?.name ||
                    "System User"
                  }
                />

                <InfoRow
                  label="Created At"
                  value={formatDateTime(
                    payroll.createdAt
                  )}
                />

                <InfoRow
                  label="Updated By"
                  value={
                    payroll.updatedBy
                      ?.name ||
                    "—"
                  }
                />

                <InfoRow
                  label="Updated At"
                  value={formatDateTime(
                    payroll.updatedAt
                  )}
                />
              </div>

              {staff?._id && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/staff/${staff._id}`
                    )
                  }
                  className="btn-secondary mt-4 flex w-full items-center justify-center gap-2"
                >
                  <UserRound
                    size={16}
                  />

                  View Staff Record
                </button>
              )}
            </div>
          </aside>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Confirmation Modal
        |--------------------------------------------------------------------------
        */}

        <ConfirmationModal
          open={Boolean(
            confirmationAction
          )}
          title={
            confirmationContent.title
          }
          description={
            confirmationContent
              .description
          }
          warning={
            modalError ||
            confirmationContent
              .warning
          }
          actionLabel={
            confirmationContent
              .actionLabel
          }
          icon={
            confirmationContent.icon
          }
          destructive={
            confirmationContent
              .destructive
          }
          processing={
            processingAction ===
            confirmationAction
          }
          onClose={() => {
            if (
              processingAction
            ) {
              return;
            }

            setConfirmationAction(
              ""
            );

            setModalError("");
          }}
          onConfirm={
            handleConfirmation
          }
        />

        {/*
        |--------------------------------------------------------------------------
        | Reason Modal
        |--------------------------------------------------------------------------
        */}

        <ReasonModal
          open={Boolean(
            reasonModalType
          )}
          type={
            reasonModalType
          }
          reason={reason}
          processing={
            [
              "reject",
              "cancel"
            ].includes(
              processingAction
            )
          }
          error={modalError}
          onReasonChange={
            setReason
          }
          onClose={() => {
            if (
              processingAction
            ) {
              return;
            }

            setReasonModalType(
              ""
            );

            setReason("");
            setModalError("");
          }}
          onSubmit={
            handleReasonSubmit
          }
        />

        {/*
        |--------------------------------------------------------------------------
        | Adjustment Modal
        |--------------------------------------------------------------------------
        */}

        <AdjustmentModal
          open={
            adjustmentModalOpen
          }
          currency={currency}
          form={
            adjustmentForm
          }
          processing={
            processingAction ===
            "adjustments"
          }
          error={modalError}
          onChange={
            updateAdjustmentField
          }
          onAddItem={
            addAdjustmentItem
          }
          onUpdateItem={
            updateAdjustmentItem
          }
          onRemoveItem={
            removeAdjustmentItem
          }
          onClose={() => {
            if (
              processingAction
            ) {
              return;
            }

            setAdjustmentModalOpen(
              false
            );

            setModalError("");
          }}
          onSubmit={
            handleAdjustmentSubmit
          }
        />

        {/*
        |--------------------------------------------------------------------------
        | Payment Modal
        |--------------------------------------------------------------------------
        */}

        <PaymentModal
          open={
            paymentModalOpen
          }
          form={paymentForm}
          currency={currency}
          netSalary={
            netSalary
          }
          processing={
            processingAction ===
            "payment"
          }
          error={modalError}
          onChange={
            updatePaymentField
          }
          onClose={() => {
            if (
              processingAction
            ) {
              return;
            }

            setPaymentModalOpen(
              false
            );

            setModalError("");
          }}
          onSubmit={
            handlePaymentSubmit
          }
        />
      </div>
    );
  };

export default PayrollDetails;