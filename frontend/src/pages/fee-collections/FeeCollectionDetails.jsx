import {
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
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit3,
  FileText,
  GraduationCap,
  Hash,
  Loader2,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Trash2,
  UserRound,
  Wallet
} from "lucide-react";

import {
  addFeePayment,
  deleteFeeCollection,
  getFeeCollectionById,
  updateFeeCollection
} from "../../api/feeCollections";

import {
  useAuth
} from "../../context/AuthContext";

import {
  PageHeader
} from "../../components/ui/PageHeader";

import {
  Badge
} from "../../components/ui/Badge";

import {
  Modal
} from "../../components/ui/Modal";

import {
  EmptyState,
  Table,
  Td
} from "../../components/ui/Table";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0
    }
  ).format(
    Number(value || 0)
  );
};

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
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

const formatDateTime = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
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

const formatMonth = (value) => {
  if (!value) {
    return "Not available";
  }

  const [year, month] =
    value.split("-");

  if (!year || !month) {
    return value;
  }

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      year: "numeric"
    }
  ).format(date);
};

const formatDateInput = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getToday = () => {
  return formatDateInput(
    new Date()
  );
};

const getStatusTone = (status) => {
  if (status === "paid") {
    return "success";
  }

  if (status === "partial") {
    return "warning";
  }

  return "danger";
};

const getStatusLabel = (status) => {
  if (status === "paid") {
    return "Paid";
  }

  if (status === "partial") {
    return "Partial";
  }

  return "Unpaid";
};

const getPaymentMethodLabel = (
  method
) => {
  const labels = {
    cash: "Cash",
    bank: "Bank Transfer",
    online: "Online",
    cheque: "Cheque"
  };

  return labels[method] || method;
};

/*
|--------------------------------------------------------------------------
| Information Item
|--------------------------------------------------------------------------
*/

const InfoItem = ({
  icon: Icon,
  label,
  value
}) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
          <Icon size={17} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-semibold text-slate-700">
            {value ||
              "Not available"}
          </p>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Amount Card
|--------------------------------------------------------------------------
*/

const AmountCard = ({
  label,
  value,
  description,
  textClassName = "text-slate-800"
}) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${textClassName}`}
      >
        {formatCurrency(value)}
      </p>

      {description && (
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Fee Collection Details
|--------------------------------------------------------------------------
*/

const FeeCollectionDetails = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const {
    user: currentUser
  } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | Permissions
  |--------------------------------------------------------------------------
  */

  const canDelete = [
    "super_admin",
    "principal"
  ].includes(
    currentUser?.role
  );

  /*
  |--------------------------------------------------------------------------
  | Main State
  |--------------------------------------------------------------------------
  */

  const [
    feeCollection,
    setFeeCollection
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
    actionLoading,
    setActionLoading
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const [
    success,
    setSuccess
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Modal State
  |--------------------------------------------------------------------------
  */

  const [
    paymentOpen,
    setPaymentOpen
  ] = useState(false);

  const [
    editOpen,
    setEditOpen
  ] = useState(false);

  const [
    deleteOpen,
    setDeleteOpen
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Payment Form
  |--------------------------------------------------------------------------
  */

  const [
    paymentForm,
    setPaymentForm
  ] = useState({
    amount: "",
    paymentMethod: "cash",
    paymentDate: getToday(),
    referenceNumber: "",
    remarks: ""
  });

  /*
  |--------------------------------------------------------------------------
  | Edit Form
  |--------------------------------------------------------------------------
  */

  const [
    editForm,
    setEditForm
  ] = useState({
    dueDate: "",
    discount: "0",
    fine: "0",
    notes: ""
  });

  /*
  |--------------------------------------------------------------------------
  | Calculated Information
  |--------------------------------------------------------------------------
  */

  const originalFeeTotal =
    useMemo(() => {
      if (!feeCollection) {
        return 0;
      }

      return (
        Number(
          feeCollection.monthlyFee ||
            0
        ) +
        Number(
          feeCollection.admissionFee ||
            0
        ) +
        Number(
          feeCollection.examFee ||
            0
        ) +
        Number(
          feeCollection.transportFee ||
            0
        ) +
        Number(
          feeCollection.otherFee ||
            0
        )
      );
    }, [feeCollection]);

  const isFullyPaid =
    feeCollection?.paymentStatus ===
      "paid" ||
    Number(
      feeCollection?.balanceAmount ||
        0
    ) <= 0;

  const isOverdue =
    useMemo(() => {
      if (
        !feeCollection?.dueDate ||
        isFullyPaid
      ) {
        return false;
      }

      const dueDate = new Date(
        feeCollection.dueDate
      );

      dueDate.setHours(
        23,
        59,
        59,
        999
      );

      return (
        dueDate.getTime() <
        Date.now()
      );
    }, [
      feeCollection,
      isFullyPaid
    ]);

  /*
  |--------------------------------------------------------------------------
  | Fetch Fee Collection
  |--------------------------------------------------------------------------
  */

  const fetchFeeCollection =
    async ({
      silent = false
    } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const { data } =
          await getFeeCollectionById(
            id
          );

        setFeeCollection(
          data?.feeCollection ||
            null
        );
      } catch (
        requestError
      ) {
        setFeeCollection(null);

        setError(
          requestError.response
            ?.data?.message ||
            "Fee collection details could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  useEffect(() => {
    fetchFeeCollection();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /*
  |--------------------------------------------------------------------------
  | Auto Hide Success
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () => {
          setSuccess("");
        },
        4000
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [success]);

  /*
  |--------------------------------------------------------------------------
  | Open Payment Modal
  |--------------------------------------------------------------------------
  */

  const openPaymentModal = () => {
    setError("");

    setPaymentForm({
      amount: "",
      paymentMethod: "cash",
      paymentDate: getToday(),
      referenceNumber: "",
      remarks: ""
    });

    setPaymentOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Open Edit Modal
  |--------------------------------------------------------------------------
  */

  const openEditModal = () => {
    setError("");

    setEditForm({
      dueDate:
        formatDateInput(
          feeCollection?.dueDate
        ),

      discount: String(
        feeCollection?.discount ||
          0
      ),

      fine: String(
        feeCollection?.fine || 0
      ),

      notes:
        feeCollection?.notes ||
        ""
    });

    setEditOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Update Payment Form
  |--------------------------------------------------------------------------
  */

  const updatePaymentField =
    (field) => (event) => {
      setPaymentForm(
        (current) => ({
          ...current,
          [field]:
            event.target.value
        })
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Update Edit Form
  |--------------------------------------------------------------------------
  */

  const updateEditField =
    (field) => (event) => {
      setEditForm(
        (current) => ({
          ...current,
          [field]:
            event.target.value
        })
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Add Payment
  |--------------------------------------------------------------------------
  */

  const handleAddPayment =
    async (event) => {
      event.preventDefault();

      setError("");

      const amount = Number(
        paymentForm.amount
      );

      if (
        Number.isNaN(amount) ||
        amount <= 0
      ) {
        setError(
          "Payment amount must be greater than zero."
        );

        return;
      }

      if (
        amount >
        Number(
          feeCollection.balanceAmount ||
            0
        )
      ) {
        setError(
          "Payment amount cannot be greater than the remaining balance."
        );

        return;
      }

      setActionLoading(true);

      try {
        const { data } =
          await addFeePayment(
            feeCollection._id,
            {
              amount,

              paymentMethod:
                paymentForm.paymentMethod,

              paymentDate:
                paymentForm.paymentDate ||
                getToday(),

              referenceNumber:
                paymentForm.referenceNumber.trim(),

              remarks:
                paymentForm.remarks.trim()
            }
          );

        setFeeCollection(
          data?.feeCollection ||
            feeCollection
        );

        setPaymentOpen(false);

        setSuccess(
          data?.message ||
            "Payment added successfully."
        );

        setPaymentForm({
          amount: "",
          paymentMethod:
            "cash",
          paymentDate:
            getToday(),
          referenceNumber: "",
          remarks: ""
        });
      } catch (
        requestError
      ) {
        setError(
          requestError.response
            ?.data?.message ||
            "Payment could not be added."
        );
      } finally {
        setActionLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Update Invoice
  |--------------------------------------------------------------------------
  */

  const handleUpdateInvoice =
    async (event) => {
      event.preventDefault();

      setError("");

      const discount = Number(
        editForm.discount || 0
      );

      const fine = Number(
        editForm.fine || 0
      );

      if (
        Number.isNaN(discount) ||
        discount < 0
      ) {
        setError(
          "Discount must be a valid non-negative amount."
        );

        return;
      }

      if (
        Number.isNaN(fine) ||
        fine < 0
      ) {
        setError(
          "Fine must be a valid non-negative amount."
        );

        return;
      }

      const updatedPayable =
        originalFeeTotal +
        fine -
        discount;

      if (updatedPayable < 0) {
        setError(
          "Discount cannot exceed the total fee and fine."
        );

        return;
      }

      if (
        updatedPayable <
        Number(
          feeCollection.paidAmount ||
            0
        )
      ) {
        setError(
          "Updated payable amount cannot be less than the amount already paid."
        );

        return;
      }

      setActionLoading(true);

      try {
        const { data } =
          await updateFeeCollection(
            feeCollection._id,
            {
              dueDate:
                editForm.dueDate ||
                null,

              discount,
              fine,

              notes:
                editForm.notes.trim()
            }
          );

        setFeeCollection(
          data?.feeCollection ||
            feeCollection
        );

        setEditOpen(false);

        setSuccess(
          data?.message ||
            "Fee collection updated successfully."
        );
      } catch (
        requestError
      ) {
        setError(
          requestError.response
            ?.data?.message ||
            "Fee collection could not be updated."
        );
      } finally {
        setActionLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Delete Invoice
  |--------------------------------------------------------------------------
  */

  const handleDelete =
    async () => {
      if (!feeCollection) {
        return;
      }

      setError("");
      setActionLoading(true);

      try {
        const { data } =
          await deleteFeeCollection(
            feeCollection._id
          );

        navigate(
          "/fee-collections",
          {
            replace: true,

            state: {
              success:
                data?.message ||
                "Fee collection deleted successfully."
            }
          }
        );
      } catch (
        requestError
      ) {
        setError(
          requestError.response
            ?.data?.message ||
            "Fee collection could not be deleted."
        );

        setActionLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Print Invoice
  |--------------------------------------------------------------------------
  */

  const handlePrint = () => {
    window.print();
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Fee Collection Details"
          action={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  navigate(
                    "/fee-collections"
                  )
                }
              >
                <ArrowLeft
                  size={16}
                />

                Back
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={
                  refreshing
                }
                onClick={() =>
                  fetchFeeCollection({
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

              {feeCollection && (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={
                      handlePrint
                    }
                  >
                    <Printer
                      size={16}
                    />

                    Print
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={
                      openEditModal
                    }
                  >
                    <Edit3
                      size={16}
                    />

                    Edit
                  </button>

                  {!isFullyPaid && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={
                        openPaymentModal
                      }
                    >
                      <Plus
                        size={16}
                      />

                      Add Payment
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                      onClick={() => {
                        setError("");
                        setDeleteOpen(
                          true
                        );
                      }}
                    >
                      <Trash2
                        size={16}
                      />

                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          }
        />
      </div>

      {/* Success */}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 print:hidden">
          <CheckCircle2
            size={17}
          />

          {success}
        </div>
      )}

      {/* Error */}

      {error &&
        !paymentOpen &&
        !editOpen &&
        !deleteOpen && (
          <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 print:hidden">
            {error}
          </div>
        )}

      {/* Loading */}

      {loading ? (
        <div className="card flex min-h-64 items-center justify-center text-sm text-slate-400">
          Loading fee collection...
        </div>
      ) : !feeCollection ? (
        <div className="card flex min-h-64 flex-col items-center justify-center">
          <ReceiptText
            size={34}
            className="text-slate-300"
          />

          <p className="mt-3 font-semibold text-slate-700">
            Fee collection not found
          </p>

          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={() =>
              navigate(
                "/fee-collections"
              )
            }
          >
            <ArrowLeft
              size={16}
            />

            Back
          </button>
        </div>
      ) : (
        <div
          id="fee-invoice-print-area"
          className="space-y-5 print:space-y-3"
        >
          {/*
          |--------------------------------------------------------------------------
          | Invoice Header
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 print:border print:border-slate-200 print:shadow-none sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <ReceiptText
                    size={28}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Fee Invoice
                  </p>

                  <h1 className="mt-1 break-all text-xl font-bold text-slate-900 sm:text-2xl">
                    {
                      feeCollection.invoiceNumber
                    }
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    {formatMonth(
                      feeCollection.feeMonth
                    )}{" "}
                    · Session{" "}
                    {
                      feeCollection.sessionYear
                    }
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 md:items-end">
                <Badge
                  tone={getStatusTone(
                    feeCollection.paymentStatus
                  )}
                >
                  {getStatusLabel(
                    feeCollection.paymentStatus
                  )}
                </Badge>

                {isOverdue && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    <AlertTriangle
                      size={14}
                    />

                    Overdue
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Created{" "}
                  {formatDate(
                    feeCollection.createdAt
                  )}
                </p>
              </div>
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Student Information
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 print:border print:border-slate-200 print:shadow-none sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Student Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoItem
                icon={UserRound}
                label="Student"
                value={
                  feeCollection
                    .studentId?.name
                }
              />

              <InfoItem
                icon={Hash}
                label="Admission Number"
                value={
                  feeCollection
                    .studentId
                    ?.admissionNumber
                }
              />

              <InfoItem
                icon={GraduationCap}
                label="Class"
                value={
                  feeCollection
                    .classId
                    ?.className
                }
              />

              <InfoItem
                icon={Building2}
                label="School"
                value={
                  feeCollection
                    .schoolId
                    ?.schoolName
                }
              />

              <InfoItem
                icon={UserRound}
                label="Father Name"
                value={
                  feeCollection
                    .studentId
                    ?.fatherName
                }
              />

              <InfoItem
                icon={FileText}
                label="Fee Structure"
                value={
                  feeCollection
                    .feeStructureId
                    ?.title
                }
              />

              <InfoItem
                icon={CalendarDays}
                label="Fee Month"
                value={formatMonth(
                  feeCollection.feeMonth
                )}
              />

              <InfoItem
                icon={Clock3}
                label="Due Date"
                value={formatDate(
                  feeCollection.dueDate
                )}
              />
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Amount Summary
          |--------------------------------------------------------------------------
          */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AmountCard
              label="Original Fee"
              value={
                feeCollection.totalAmount ??
                originalFeeTotal
              }
              description="Before discount and fine"
            />

            <AmountCard
              label="Payable Amount"
              value={
                feeCollection.payableAmount
              }
              description="Final invoice amount"
              textClassName="text-brand-700"
            />

            <AmountCard
              label="Paid Amount"
              value={
                feeCollection.paidAmount
              }
              description="Total received"
              textClassName="text-emerald-700"
            />

            <AmountCard
              label="Balance Amount"
              value={
                feeCollection.balanceAmount
              }
              description={
                isFullyPaid
                  ? "Invoice fully paid"
                  : "Remaining payment"
              }
              textClassName={
                isFullyPaid
                  ? "text-emerald-700"
                  : "text-rose-700"
              }
            />
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Fee Breakdown
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 print:border print:border-slate-200 print:shadow-none sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Fee Breakdown
            </h2>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Monthly Fee
                </p>

                <p className="mt-1 font-bold text-slate-700">
                  {formatCurrency(
                    feeCollection.monthlyFee
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Admission Fee
                </p>

                <p className="mt-1 font-bold text-slate-700">
                  {formatCurrency(
                    feeCollection.admissionFee
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Exam Fee
                </p>

                <p className="mt-1 font-bold text-slate-700">
                  {formatCurrency(
                    feeCollection.examFee
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Transport Fee
                </p>

                <p className="mt-1 font-bold text-slate-700">
                  {formatCurrency(
                    feeCollection.transportFee
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">
                  Other Fee
                </p>

                <p className="mt-1 font-bold text-slate-700">
                  {formatCurrency(
                    feeCollection.otherFee
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <span className="text-sm font-semibold text-emerald-700">
                  Discount
                </span>

                <strong className="text-emerald-700">
                  -{" "}
                  {formatCurrency(
                    feeCollection.discount
                  )}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                <span className="text-sm font-semibold text-rose-700">
                  Fine
                </span>

                <strong className="text-rose-700">
                  +{" "}
                  {formatCurrency(
                    feeCollection.fine
                  )}
                </strong>
              </div>
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Payment History
          |--------------------------------------------------------------------------
          */}

          <section className="card overflow-hidden print:border print:border-slate-200 print:shadow-none">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Payment History
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {
                    feeCollection.payments
                      ?.length || 0
                  }{" "}
                  payment record(s)
                </p>
              </div>

              {!isFullyPaid && (
                <button
                  type="button"
                  className="btn-primary print:hidden"
                  onClick={
                    openPaymentModal
                  }
                >
                  <Plus size={16} />

                  Add Payment
                </button>
              )}
            </div>

            {/* Desktop Table */}

            <div className="hidden p-5 md:block">
              <Table
                columns={[
                  "Receipt",
                  "Date",
                  "Amount",
                  "Method",
                  "Reference",
                  "Received By",
                  "Remarks"
                ]}
              >
                {!feeCollection
                  .payments?.length ? (
                  <EmptyState
                    colSpan={7}
                    icon={CreditCard}
                    title="No payments recorded"
                    description="This invoice has not received any payment"
                  />
                ) : (
                  feeCollection.payments.map(
                    (
                      payment,
                      index
                    ) => (
                      <tr
                        key={
                          payment._id ||
                          index
                        }
                        className="transition hover:bg-slate-50/70"
                      >
                        <Td>
                          <span className="whitespace-nowrap font-semibold text-slate-700">
                            {payment.receiptNumber ||
                              `Payment ${
                                index + 1
                              }`}
                          </span>
                        </Td>

                        <Td>
                          <span className="whitespace-nowrap">
                            {formatDateTime(
                              payment.paymentDate
                            )}
                          </span>
                        </Td>

                        <Td>
                          <strong className="whitespace-nowrap text-emerald-700">
                            {formatCurrency(
                              payment.amount
                            )}
                          </strong>
                        </Td>

                        <Td>
                          <Badge tone="neutral">
                            {getPaymentMethodLabel(
                              payment.paymentMethod
                            )}
                          </Badge>
                        </Td>

                        <Td>
                          {payment.referenceNumber ||
                            "-"}
                        </Td>

                        <Td>
                          {payment.receivedBy
                            ?.name ||
                            "-"}
                        </Td>

                        <Td>
                          <div className="max-w-[220px] whitespace-normal">
                            {payment.remarks ||
                              "-"}
                          </div>
                        </Td>
                      </tr>
                    )
                  )
                )}
              </Table>
            </div>

            {/* Mobile Payments */}

            <div className="divide-y divide-slate-100 md:hidden">
              {!feeCollection
                .payments?.length ? (
                <div className="flex min-h-44 flex-col items-center justify-center p-5 text-center">
                  <CreditCard
                    size={28}
                    className="text-slate-300"
                  />

                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    No payments recorded
                  </p>
                </div>
              ) : (
                feeCollection.payments.map(
                  (
                    payment,
                    index
                  ) => (
                    <article
                      key={
                        payment._id ||
                        index
                      }
                      className="p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-700">
                            {payment.receiptNumber ||
                              `Payment ${
                                index + 1
                              }`}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(
                              payment.paymentDate
                            )}
                          </p>
                        </div>

                        <strong className="text-emerald-700">
                          {formatCurrency(
                            payment.amount
                          )}
                        </strong>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-slate-500">
                        <p>
                          Method:{" "}
                          <span className="font-semibold text-slate-700">
                            {getPaymentMethodLabel(
                              payment.paymentMethod
                            )}
                          </span>
                        </p>

                        <p>
                          Reference:{" "}
                          <span className="font-semibold text-slate-700">
                            {payment.referenceNumber ||
                              "-"}
                          </span>
                        </p>

                        <p>
                          Received by:{" "}
                          <span className="font-semibold text-slate-700">
                            {payment.receivedBy
                              ?.name ||
                              "-"}
                          </span>
                        </p>

                        {payment.remarks && (
                          <p>
                            Remarks:{" "}
                            <span className="font-semibold text-slate-700">
                              {
                                payment.remarks
                              }
                            </span>
                          </p>
                        )}
                      </div>
                    </article>
                  )
                )
              )}
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Notes and Activity
          |--------------------------------------------------------------------------
          */}

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="card p-5 print:border print:border-slate-200 print:shadow-none sm:p-6">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                Invoice Notes
              </h2>

              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {feeCollection.notes ||
                  "No notes added for this invoice."}
              </p>
            </section>

            <section className="card p-5 print:border print:border-slate-200 print:shadow-none sm:p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
                System Activity
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoItem
                  icon={
                    CalendarDays
                  }
                  label="Created At"
                  value={formatDateTime(
                    feeCollection.createdAt
                  )}
                />

                <InfoItem
                  icon={
                    CalendarDays
                  }
                  label="Updated At"
                  value={formatDateTime(
                    feeCollection.updatedAt
                  )}
                />

                <InfoItem
                  icon={UserRound}
                  label="Created By"
                  value={
                    feeCollection
                      .createdBy?.name
                  }
                />

                <InfoItem
                  icon={UserRound}
                  label="Updated By"
                  value={
                    feeCollection
                      .updatedBy?.name
                  }
                />
              </div>
            </section>
          </div>
        </div>
      )}

      {/*
      |--------------------------------------------------------------------------
      | Add Payment Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={paymentOpen}
        onClose={() => {
          if (!actionLoading) {
            setPaymentOpen(
              false
            );

            setError("");
          }
        }}
        title="Add Payment"
        width="max-w-xl"
      >
        <form
          onSubmit={
            handleAddPayment
          }
          className="space-y-5"
          noValidate
        >
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Remaining Balance
            </p>

            <p className="mt-1 text-xl font-bold text-brand-700">
              {formatCurrency(
                feeCollection?.balanceAmount
              )}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="payment-amount"
                className="field-label"
              >
                Payment Amount
              </label>

              <input
                id="payment-amount"
                type="number"
                min="1"
                step="1"
                className="field-input"
                value={
                  paymentForm.amount
                }
                onChange={updatePaymentField(
                  "amount"
                )}
                placeholder="Enter amount"
                disabled={
                  actionLoading
                }
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="payment-method"
                className="field-label"
              >
                Payment Method
              </label>

              <select
                id="payment-method"
                className="field-select"
                value={
                  paymentForm.paymentMethod
                }
                onChange={updatePaymentField(
                  "paymentMethod"
                )}
                disabled={
                  actionLoading
                }
              >
                <option value="cash">
                  Cash
                </option>

                <option value="bank">
                  Bank Transfer
                </option>

                <option value="online">
                  Online
                </option>

                <option value="cheque">
                  Cheque
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="payment-date"
                className="field-label"
              >
                Payment Date
              </label>

              <input
                id="payment-date"
                type="date"
                className="field-input"
                value={
                  paymentForm.paymentDate
                }
                onChange={updatePaymentField(
                  "paymentDate"
                )}
                disabled={
                  actionLoading
                }
              />
            </div>

            <div>
              <label
                htmlFor="payment-reference"
                className="field-label"
              >
                Reference Number
              </label>

              <input
                id="payment-reference"
                type="text"
                className="field-input"
                value={
                  paymentForm.referenceNumber
                }
                onChange={updatePaymentField(
                  "referenceNumber"
                )}
                placeholder="Optional reference"
                maxLength={120}
                disabled={
                  actionLoading
                }
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="payment-remarks"
                className="field-label"
              >
                Remarks
              </label>

              <textarea
                id="payment-remarks"
                className="field-input min-h-24 resize-y"
                value={
                  paymentForm.remarks
                }
                onChange={updatePaymentField(
                  "remarks"
                )}
                placeholder="Optional payment remarks"
                maxLength={500}
                disabled={
                  actionLoading
                }
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={
                actionLoading
              }
              onClick={() => {
                setPaymentOpen(
                  false
                );

                setError("");
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={
                actionLoading
              }
            >
              {actionLoading && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {actionLoading
                ? "Adding Payment..."
                : "Add Payment"}
            </button>
          </div>
        </form>
      </Modal>

      {/*
      |--------------------------------------------------------------------------
      | Edit Invoice Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={editOpen}
        onClose={() => {
          if (!actionLoading) {
            setEditOpen(false);
            setError("");
          }
        }}
        title="Edit Fee Invoice"
        width="max-w-xl"
      >
        <form
          onSubmit={
            handleUpdateInvoice
          }
          className="space-y-5"
          noValidate
        >
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
            Student, class, fee month
            and fee structure cannot be
            changed after creating the
            invoice.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="edit-due-date"
                className="field-label"
              >
                Due Date
              </label>

              <input
                id="edit-due-date"
                type="date"
                className="field-input"
                value={
                  editForm.dueDate
                }
                onChange={updateEditField(
                  "dueDate"
                )}
                disabled={
                  actionLoading
                }
              />
            </div>

            <div>
              <label
                htmlFor="edit-discount"
                className="field-label"
              >
                Discount
              </label>

              <input
                id="edit-discount"
                type="number"
                min="0"
                step="1"
                className="field-input"
                value={
                  editForm.discount
                }
                onChange={updateEditField(
                  "discount"
                )}
                disabled={
                  actionLoading
                }
              />
            </div>

            <div>
              <label
                htmlFor="edit-fine"
                className="field-label"
              >
                Fine
              </label>

              <input
                id="edit-fine"
                type="number"
                min="0"
                step="1"
                className="field-input"
                value={
                  editForm.fine
                }
                onChange={updateEditField(
                  "fine"
                )}
                disabled={
                  actionLoading
                }
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="edit-notes"
                className="field-label"
              >
                Notes
              </label>

              <textarea
                id="edit-notes"
                className="field-input min-h-28 resize-y"
                value={
                  editForm.notes
                }
                onChange={updateEditField(
                  "notes"
                )}
                placeholder="Optional invoice notes"
                maxLength={1000}
                disabled={
                  actionLoading
                }
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={
                actionLoading
              }
              onClick={() => {
                setEditOpen(false);
                setError("");
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={
                actionLoading
              }
            >
              {actionLoading && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {actionLoading
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/*
      |--------------------------------------------------------------------------
      | Delete Confirmation Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!actionLoading) {
            setDeleteOpen(
              false
            );

            setError("");
          }
        }}
        title="Delete Fee Collection"
        width="max-w-md"
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <p className="text-sm leading-6 text-slate-600">
            Are you sure you want to
            delete invoice{" "}
            <strong>
              {
                feeCollection?.invoiceNumber
              }
            </strong>
            ?
          </p>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
            This financial record will
            be soft deleted. It can be
            restored later from the
            deleted fee collections
            page.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={
                actionLoading
              }
              onClick={() => {
                setDeleteOpen(
                  false
                );

                setError("");
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                actionLoading
              }
              onClick={
                handleDelete
              }
            >
              {actionLoading && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {actionLoading
                ? "Deleting..."
                : "Delete Invoice"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FeeCollectionDetails;