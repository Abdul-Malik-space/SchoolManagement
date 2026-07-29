import {
  useEffect,
  useState
} from "react";

import {
  useNavigate,
  useParams
} from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  GraduationCap,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Trash2,
  UserRound,
  Wallet
} from "lucide-react";

import {
  deleteFeeStructure,
  getFeeStructureById
} from "../../api/feeStructures";

import {
  getSchools
} from "../../api/schools";

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
  FeeStructureFormModal
} from "./FeeStructureFormModal";

/*
|--------------------------------------------------------------------------
| Currency Formatter
|--------------------------------------------------------------------------
*/

const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    "en-PK",
    {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0
    }
  ).format(
    Number(value || 0)
  );
};

/*
|--------------------------------------------------------------------------
| Date Formatter
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Calculate Total Fee
|--------------------------------------------------------------------------
*/

const calculateTotal = (
  feeStructure
) => {
  return (
    Number(
      feeStructure?.monthlyFee ||
        0
    ) +
    Number(
      feeStructure?.admissionFee ||
        0
    ) +
    Number(
      feeStructure?.examFee ||
        0
    ) +
    Number(
      feeStructure?.transportFee ||
        0
    ) +
    Number(
      feeStructure?.otherFee ||
        0
    )
  );
};

/*
|--------------------------------------------------------------------------
| Detail Item Component
|--------------------------------------------------------------------------
*/

const DetailItem = ({
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
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
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
| Fee Structure Details Page
|--------------------------------------------------------------------------
*/

const FeeStructureDetails = () => {
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
  | State
  |--------------------------------------------------------------------------
  */

  const [
    feeStructure,
    setFeeStructure
  ] = useState(null);

  const [
    schools,
    setSchools
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

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
  | Load Fee Structure
  |--------------------------------------------------------------------------
  */

  const loadFeeStructure =
    async () => {
      setLoading(true);
      setError("");

      try {
        const { data } =
          await getFeeStructureById(
            id
          );

        setFeeStructure(
          data?.feeStructure ||
            null
        );
      } catch (
        requestError
      ) {
        setFeeStructure(null);

        setError(
          requestError.response
            ?.data?.message ||
            "Fee structure details could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadFeeStructure();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /*
  |--------------------------------------------------------------------------
  | Load Schools for Super Admin
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      currentUser?.role !==
      "super_admin"
    ) {
      setSchools([]);
      return;
    }

    const loadSchools =
      async () => {
        try {
          const { data } =
            await getSchools();

          setSchools(
            data?.schools ||
              []
          );
        } catch {
          setSchools([]);
        }
      };

    loadSchools();
  }, [currentUser?.role]);

  /*
  |--------------------------------------------------------------------------
  | Auto Hide Success Message
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
  | Handle Updated Fee Structure
  |--------------------------------------------------------------------------
  */

  const handleUpdated = (
    updatedFeeStructure,
    message
  ) => {
    setFeeStructure(
      updatedFeeStructure
    );

    setEditOpen(false);

    setSuccess(
      message ||
        "Fee structure updated successfully."
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Delete Fee Structure
  |--------------------------------------------------------------------------
  */

  const handleDelete =
    async () => {
      if (!feeStructure) {
        return;
      }

      setActionLoading(true);
      setError("");

      try {
        const { data } =
          await deleteFeeStructure(
            feeStructure._id
          );

        navigate(
          "/fee-structures",
          {
            replace: true,

            state: {
              success:
                data?.message ||
                "Fee structure deleted successfully."
            }
          }
        );
      } catch (
        requestError
      ) {
        setError(
          requestError.response
            ?.data?.message ||
            "Fee structure could not be deleted."
        );

        setActionLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div>
      <PageHeader
        title="Fee Structure Details"
        action={
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              navigate(
                "/fee-structures"
              )
            }
          >
            <ArrowLeft
              size={16}
            />

            Back to Fee Structures
          </button>
        }
      />

      {/* Success Message */}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2
            size={17}
          />

          {success}
        </div>
      )}

      {/* Error Message */}

      {error &&
        !editOpen &&
        !deleteOpen && (
          <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

      {/* Loading */}

      {loading ? (
        <div className="card flex min-h-64 items-center justify-center text-sm text-slate-400">
          Loading fee structure...
        </div>
      ) : !feeStructure ? (
        /*
        |--------------------------------------------------------------------------
        | Not Found
        |--------------------------------------------------------------------------
        */

        <div className="card flex min-h-64 flex-col items-center justify-center">
          <Wallet
            size={34}
            className="text-slate-300"
          />

          <p className="mt-3 font-semibold text-slate-700">
            Fee structure not found
          </p>

          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={() =>
              navigate(
                "/fee-structures"
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
        <div className="space-y-5">
          {/*
          |--------------------------------------------------------------------------
          | Main Header Card
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <ReceiptText
                    size={28}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-bold text-slate-900">
                      {
                        feeStructure.title
                      }
                    </h1>

                    <Badge
                      tone={
                        feeStructure.isActive
                          ? "success"
                          : "danger"
                      }
                    >
                      {feeStructure.isActive
                        ? "Active"
                        : "Inactive"}
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {feeStructure
                      .classId
                      ?.className ||
                      "-"}{" "}
                    · Session{" "}
                    {
                      feeStructure.sessionYear
                    }
                  </p>

                  <p className="mt-2 text-lg font-bold text-brand-700">
                    {formatCurrency(
                      calculateTotal(
                        feeStructure
                      )
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setError("");

                    setEditOpen(
                      true
                    );
                  }}
                >
                  <Edit3
                    size={16}
                  />

                  Edit
                </button>

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
              </div>
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Structure Information
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Structure Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                icon={Building2}
                label="School"
                value={
                  feeStructure
                    .schoolId
                    ?.schoolName
                }
              />

              <DetailItem
                icon={
                  GraduationCap
                }
                label="Class"
                value={
                  feeStructure
                    .classId
                    ?.className
                }
              />

              <DetailItem
                icon={
                  CalendarDays
                }
                label="Session Year"
                value={
                  feeStructure.sessionYear
                }
              />

              <DetailItem
                icon={ShieldCheck}
                label="Status"
                value={
                  feeStructure.isActive
                    ? "Active"
                    : "Inactive"
                }
              />

              <DetailItem
                icon={
                  CircleDollarSign
                }
                label="Monthly Fee"
                value={formatCurrency(
                  feeStructure.monthlyFee
                )}
              />

              <DetailItem
                icon={Wallet}
                label="Total Listed Fee"
                value={formatCurrency(
                  calculateTotal(
                    feeStructure
                  )
                )}
              />
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Fee Breakdown
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Fee Breakdown
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <DetailItem
                icon={
                  CircleDollarSign
                }
                label="Monthly Fee"
                value={formatCurrency(
                  feeStructure.monthlyFee
                )}
              />

              <DetailItem
                icon={
                  CircleDollarSign
                }
                label="Admission Fee"
                value={formatCurrency(
                  feeStructure.admissionFee
                )}
              />

              <DetailItem
                icon={
                  CircleDollarSign
                }
                label="Exam Fee"
                value={formatCurrency(
                  feeStructure.examFee
                )}
              />

              <DetailItem
                icon={
                  CircleDollarSign
                }
                label="Transport Fee"
                value={formatCurrency(
                  feeStructure.transportFee
                )}
              />

              <DetailItem
                icon={
                  CircleDollarSign
                }
                label="Other Fee"
                value={formatCurrency(
                  feeStructure.otherFee
                )}
              />
            </div>

            <div className="mt-5 flex flex-col gap-2 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold text-slate-700">
                Total Listed Fee
              </span>

              <strong className="text-lg text-brand-700">
                {formatCurrency(
                  calculateTotal(
                    feeStructure
                  )
                )}
              </strong>
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | System Activity
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              System Activity
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <DetailItem
                icon={
                  CalendarDays
                }
                label="Created At"
                value={formatDate(
                  feeStructure.createdAt
                )}
              />

              <DetailItem
                icon={
                  CalendarDays
                }
                label="Updated At"
                value={formatDate(
                  feeStructure.updatedAt
                )}
              />

              <DetailItem
                icon={UserRound}
                label="Created By"
                value={
                  feeStructure
                    .createdBy?.name
                }
              />

              <DetailItem
                icon={UserRound}
                label="Updated By"
                value={
                  feeStructure
                    .updatedBy?.name
                }
              />
            </div>
          </section>
        </div>
      )}

      {/*
      |--------------------------------------------------------------------------
      | Edit Modal
      |--------------------------------------------------------------------------
      */}

      <FeeStructureFormModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setError("");
        }}
        onSaved={
          handleUpdated
        }
        schools={schools}
        currentUser={
          currentUser
        }
        initialData={
          feeStructure
        }
      />

      {/*
      |--------------------------------------------------------------------------
      | Delete Confirmation Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (
            !actionLoading
          ) {
            setDeleteOpen(
              false
            );

            setError("");
          }
        }}
        title="Delete Fee Structure"
        width="max-w-md"
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <p className="text-sm leading-6 text-slate-600">
            Are you sure you want
            to delete{" "}
            <strong>
              {
                feeStructure?.title
              }
            </strong>
            ?
          </p>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
            This is a soft delete.
            The fee structure can
            be restored later, and
            existing fee records
            will remain safe.
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
                : "Delete Fee Structure"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FeeStructureDetails;