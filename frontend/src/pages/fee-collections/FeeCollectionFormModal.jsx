import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  CalendarDays,
  CreditCard,
  Loader2,
  ReceiptText,
  UserRound,
  Wallet
} from "lucide-react";

import {
  createFeeCollection
} from "../../api/feeCollections";

import {
  getStudents
} from "../../api/students";

import {
  getFeeStructures
} from "../../api/feeStructures";

import {
  Modal
} from "../../components/ui/Modal";

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

const getCurrentMonth = () => {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}`;
};

const getToday = () => {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/*
|--------------------------------------------------------------------------
| Empty Form
|--------------------------------------------------------------------------
*/

const createEmptyForm = () => ({
  schoolId: "",
  studentId: "",
  feeStructureId: "",

  feeMonth: getCurrentMonth(),
  dueDate: "",

  discount: "0",
  fine: "0",

  paidAmount: "0",
  paymentMethod: "cash",
  paymentDate: getToday(),

  referenceNumber: "",
  remarks: "",
  notes: ""
});

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
| Get Object ID
|--------------------------------------------------------------------------
*/

const getObjectId = (value) => {
  if (!value) {
    return "";
  }

  if (
    typeof value === "object" &&
    value._id
  ) {
    return value._id;
  }

  return value;
};

/*
|--------------------------------------------------------------------------
| Calculate Fee Total
|--------------------------------------------------------------------------
*/

const calculateStructureTotal = (
  feeStructure
) => {
  if (!feeStructure) {
    return 0;
  }

  return (
    Number(
      feeStructure.monthlyFee ||
        0
    ) +
    Number(
      feeStructure.admissionFee ||
        0
    ) +
    Number(
      feeStructure.examFee ||
        0
    ) +
    Number(
      feeStructure.transportFee ||
        0
    ) +
    Number(
      feeStructure.otherFee ||
        0
    )
  );
};

/*
|--------------------------------------------------------------------------
| Fee Collection Form Modal
|--------------------------------------------------------------------------
*/

export const FeeCollectionFormModal = ({
  open,
  onClose,
  onSaved,
  schools = [],
  currentUser
}) => {
  /*
  |--------------------------------------------------------------------------
  | Form State
  |--------------------------------------------------------------------------
  */

  const [
    form,
    setForm
  ] = useState(
    createEmptyForm()
  );

  /*
  |--------------------------------------------------------------------------
  | Data State
  |--------------------------------------------------------------------------
  */

  const [
    students,
    setStudents
  ] = useState([]);

  const [
    feeStructures,
    setFeeStructures
  ] = useState([]);

  /*
  |--------------------------------------------------------------------------
  | Loading State
  |--------------------------------------------------------------------------
  */

  const [
    loadingStudents,
    setLoadingStudents
  ] = useState(false);

  const [
    loadingStructures,
    setLoadingStructures
  ] = useState(false);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | User Information
  |--------------------------------------------------------------------------
  */

  const isSuperAdmin =
    currentUser?.role ===
    "super_admin";

  const currentSchoolId =
    getObjectId(
      currentUser?.schoolId
    );

  const effectiveSchoolId =
    isSuperAdmin
      ? form.schoolId
      : currentSchoolId;

  /*
  |--------------------------------------------------------------------------
  | Selected Student
  |--------------------------------------------------------------------------
  */

  const selectedStudent =
    useMemo(() => {
      return students.find(
        (student) =>
          student._id ===
          form.studentId
      );
    }, [
      students,
      form.studentId
    ]);

  /*
  |--------------------------------------------------------------------------
  | Selected Student Class
  |--------------------------------------------------------------------------
  */

  const selectedStudentClassId =
    getObjectId(
      selectedStudent?.classId
    );

  /*
  |--------------------------------------------------------------------------
  | Selected Fee Structure
  |--------------------------------------------------------------------------
  */

  const selectedFeeStructure =
    useMemo(() => {
      return feeStructures.find(
        (feeStructure) =>
          feeStructure._id ===
          form.feeStructureId
      );
    }, [
      feeStructures,
      form.feeStructureId
    ]);

  /*
  |--------------------------------------------------------------------------
  | Fee Calculations
  |--------------------------------------------------------------------------
  */

  const originalTotal =
    useMemo(() => {
      return calculateStructureTotal(
        selectedFeeStructure
      );
    }, [
      selectedFeeStructure
    ]);

  const discountAmount =
    Number(
      form.discount || 0
    );

  const fineAmount =
    Number(
      form.fine || 0
    );

  const initialPaidAmount =
    Number(
      form.paidAmount || 0
    );

  const payableAmount =
    useMemo(() => {
      const value =
        originalTotal +
        (
          Number.isFinite(
            fineAmount
          )
            ? fineAmount
            : 0
        ) -
        (
          Number.isFinite(
            discountAmount
          )
            ? discountAmount
            : 0
        );

      return Math.max(
        0,
        value
      );
    }, [
      originalTotal,
      fineAmount,
      discountAmount
    ]);

  const balanceAmount =
    useMemo(() => {
      const paid =
        Number.isFinite(
          initialPaidAmount
        )
          ? initialPaidAmount
          : 0;

      return Math.max(
        0,
        payableAmount - paid
      );
    }, [
      payableAmount,
      initialPaidAmount
    ]);

  const paymentStatus =
    useMemo(() => {
      if (
        payableAmount <= 0
      ) {
        return "Paid";
      }

      if (
        initialPaidAmount <= 0
      ) {
        return "Unpaid";
      }

      if (
        initialPaidAmount <
        payableAmount
      ) {
        return "Partial";
      }

      return "Paid";
    }, [
      payableAmount,
      initialPaidAmount
    ]);

  /*
  |--------------------------------------------------------------------------
  | Reset Form When Modal Opens
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      ...createEmptyForm(),

      schoolId:
        isSuperAdmin
          ? ""
          : currentSchoolId
    });

    setStudents([]);
    setFeeStructures([]);

    setError("");
    setSaving(false);
  }, [
    open,
    isSuperAdmin,
    currentSchoolId
  ]);

  /*
  |--------------------------------------------------------------------------
  | Load Students
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !open ||
      !effectiveSchoolId
    ) {
      setStudents([]);
      return;
    }

    let activeRequest = true;

    const loadStudents =
      async () => {
        setLoadingStudents(
          true
        );

        setError("");

        try {
          const params = {
            status: "active",
            page: 1,
            limit: 500
          };

          if (isSuperAdmin) {
            params.schoolId =
              effectiveSchoolId;
          }

          const { data } =
            await getStudents(
              params
            );

          if (
            activeRequest
          ) {
            setStudents(
              data?.students ||
                []
            );
          }
        } catch (
          requestError
        ) {
          if (
            activeRequest
          ) {
            setStudents([]);

            setError(
              requestError.response
                ?.data?.message ||
                "Students could not be loaded."
            );
          }
        } finally {
          if (
            activeRequest
          ) {
            setLoadingStudents(
              false
            );
          }
        }
      };

    loadStudents();

    return () => {
      activeRequest = false;
    };
  }, [
    open,
    effectiveSchoolId,
    isSuperAdmin
  ]);

  /*
  |--------------------------------------------------------------------------
  | Load Fee Structures for Student Class
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !open ||
      !effectiveSchoolId ||
      !selectedStudentClassId
    ) {
      setFeeStructures([]);

      setForm(
        (current) => ({
          ...current,
          feeStructureId: ""
        })
      );

      return;
    }

    let activeRequest = true;

    const loadFeeStructures =
      async () => {
        setLoadingStructures(
          true
        );

        setError("");

        try {
          const params = {
            classId:
              selectedStudentClassId,

            isActive: true,
            page: 1,
            limit: 100
          };

          if (isSuperAdmin) {
            params.schoolId =
              effectiveSchoolId;
          }

          const { data } =
            await getFeeStructures(
              params
            );

          if (
            activeRequest
          ) {
            const structures =
              data?.feeStructures ||
              [];

            setFeeStructures(
              structures
            );

            setForm(
              (current) => {
                const selectedStillExists =
                  structures.some(
                    (
                      feeStructure
                    ) =>
                      feeStructure._id ===
                      current.feeStructureId
                  );

                return {
                  ...current,

                  feeStructureId:
                    selectedStillExists
                      ? current.feeStructureId
                      : structures.length ===
                          1
                        ? structures[0]._id
                        : ""
                };
              }
            );
          }
        } catch (
          requestError
        ) {
          if (
            activeRequest
          ) {
            setFeeStructures([]);

            setForm(
              (current) => ({
                ...current,
                feeStructureId: ""
              })
            );

            setError(
              requestError.response
                ?.data?.message ||
                "Fee structures could not be loaded."
            );
          }
        } finally {
          if (
            activeRequest
          ) {
            setLoadingStructures(
              false
            );
          }
        }
      };

    loadFeeStructures();

    return () => {
      activeRequest = false;
    };
  }, [
    open,
    effectiveSchoolId,
    selectedStudentClassId,
    isSuperAdmin
  ]);

  /*
  |--------------------------------------------------------------------------
  | Update Form Field
  |--------------------------------------------------------------------------
  */

  const updateField =
    (field) => (event) => {
      const value =
        event.target.value;

      setForm(
        (current) => {
          const nextForm = {
            ...current,
            [field]: value
          };

          /*
          | Reset dependent fields when school changes
          */

          if (
            field ===
            "schoolId"
          ) {
            nextForm.studentId =
              "";

            nextForm.feeStructureId =
              "";
          }

          /*
          | Reset fee structure when student changes
          */

          if (
            field ===
            "studentId"
          ) {
            nextForm.feeStructureId =
              "";
          }

          return nextForm;
        }
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Submit Form
  |--------------------------------------------------------------------------
  */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");

      /*
      | School Validation
      */

      if (
        isSuperAdmin &&
        !form.schoolId
      ) {
        setError(
          "Please select a school."
        );

        return;
      }

      /*
      | Student Validation
      */

      if (!form.studentId) {
        setError(
          "Please select a student."
        );

        return;
      }

      /*
      | Fee Structure Validation
      */

      if (
        !form.feeStructureId
      ) {
        setError(
          "Please select a fee structure."
        );

        return;
      }

      /*
      | Fee Month Validation
      */

      if (!form.feeMonth) {
        setError(
          "Please select a fee month."
        );

        return;
      }

      /*
      | Selected Structure Validation
      */

      if (
        !selectedFeeStructure
      ) {
        setError(
          "Selected fee structure is not available."
        );

        return;
      }

      /*
      | Discount Validation
      */

      const discount =
        Number(
          form.discount || 0
        );

      if (
        Number.isNaN(
          discount
        ) ||
        discount < 0
      ) {
        setError(
          "Discount must be a valid non-negative amount."
        );

        return;
      }

      /*
      | Fine Validation
      */

      const fine =
        Number(
          form.fine || 0
        );

      if (
        Number.isNaN(fine) ||
        fine < 0
      ) {
        setError(
          "Fine must be a valid non-negative amount."
        );

        return;
      }

      /*
      | Paid Amount Validation
      */

      const paidAmount =
        Number(
          form.paidAmount || 0
        );

      if (
        Number.isNaN(
          paidAmount
        ) ||
        paidAmount < 0
      ) {
        setError(
          "Paid amount must be a valid non-negative amount."
        );

        return;
      }

      if (
        discount >
        originalTotal + fine
      ) {
        setError(
          "Discount cannot exceed the total fee and fine."
        );

        return;
      }

      if (
        paidAmount >
        payableAmount
      ) {
        setError(
          "Paid amount cannot be greater than the payable amount."
        );

        return;
      }

      /*
      | Prepare Payload
      */

      const payload = {
        studentId:
          form.studentId,

        feeStructureId:
          form.feeStructureId,

        feeMonth:
          form.feeMonth,

        sessionYear:
          selectedFeeStructure.sessionYear,

        discount,
        fine,
        paidAmount,

        dueDate:
          form.dueDate ||
          null,

        notes:
          form.notes.trim()
      };

      /*
      | Initial Payment Information
      */

      if (
        paidAmount > 0
      ) {
        payload.paymentMethod =
          form.paymentMethod;

        payload.paymentDate =
          form.paymentDate ||
          getToday();

        payload.referenceNumber =
          form.referenceNumber.trim();

        payload.remarks =
          form.remarks.trim();
      }

      setSaving(true);

      try {
        const { data } =
          await createFeeCollection(
            payload
          );

        onSaved?.(
          data?.feeCollection,

          data?.message ||
            "Fee invoice created successfully."
        );
      } catch (
        requestError
      ) {
        setError(
          requestError.response
            ?.data?.message ||
            "Fee invoice could not be created."
        );
      } finally {
        setSaving(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) {
          onClose?.();
        }
      }}
      title="Create Fee Invoice"
      width="max-w-5xl"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
      >
        {/* Error Message */}

        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Student and Invoice Information
        |--------------------------------------------------------------------------
        */}

        <section className="rounded-xl border border-slate-200 p-4">
          <div className="mb-4 flex items-center gap-2">
            <UserRound
              size={18}
              className="text-brand-700"
            />

            <h3 className="text-sm font-bold text-slate-700">
              Student and Invoice
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* School */}

            {isSuperAdmin && (
              <div className="sm:col-span-2">
                <label
                  htmlFor="collection-school"
                  className="field-label"
                >
                  School
                </label>

                <select
                  id="collection-school"
                  className="field-select"
                  value={
                    form.schoolId
                  }
                  onChange={updateField(
                    "schoolId"
                  )}
                  disabled={saving}
                >
                  <option value="">
                    Select school
                  </option>

                  {schools.map(
                    (school) => (
                      <option
                        key={
                          school._id
                        }
                        value={
                          school._id
                        }
                      >
                        {
                          school.schoolName
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {/* Student */}

            <div>
              <label
                htmlFor="collection-student"
                className="field-label"
              >
                Student
              </label>

              <select
                id="collection-student"
                className="field-select"
                value={
                  form.studentId
                }
                onChange={updateField(
                  "studentId"
                )}
                disabled={
                  !effectiveSchoolId ||
                  loadingStudents ||
                  saving
                }
              >
                <option value="">
                  {loadingStudents
                    ? "Loading students..."
                    : "Select student"}
                </option>

                {students.map(
                  (student) => (
                    <option
                      key={
                        student._id
                      }
                      value={
                        student._id
                      }
                    >
                      {student.name}
                      {" · "}
                      {student.admissionNumber ||
                        "No admission number"}
                      {" · "}
                      {student.classId
                        ?.className ||
                        "No class"}
                    </option>
                  )
                )}
              </select>

              {!loadingStudents &&
                effectiveSchoolId &&
                students.length ===
                  0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No active students
                    found for this
                    school.
                  </p>
                )}
            </div>

            {/* Fee Structure */}

            <div>
              <label
                htmlFor="collection-structure"
                className="field-label"
              >
                Fee Structure
              </label>

              <select
                id="collection-structure"
                className="field-select"
                value={
                  form.feeStructureId
                }
                onChange={updateField(
                  "feeStructureId"
                )}
                disabled={
                  !form.studentId ||
                  loadingStructures ||
                  saving
                }
              >
                <option value="">
                  {loadingStructures
                    ? "Loading fee structures..."
                    : "Select fee structure"}
                </option>

                {feeStructures.map(
                  (
                    feeStructure
                  ) => (
                    <option
                      key={
                        feeStructure._id
                      }
                      value={
                        feeStructure._id
                      }
                    >
                      {
                        feeStructure.title
                      }
                      {" · "}
                      {
                        feeStructure.sessionYear
                      }
                    </option>
                  )
                )}
              </select>

              {!loadingStructures &&
                form.studentId &&
                feeStructures.length ===
                  0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No active fee
                    structure exists
                    for this student's
                    class.
                  </p>
                )}
            </div>

            {/* Fee Month */}

            <div>
              <label
                htmlFor="collection-month"
                className="field-label"
              >
                Fee Month
              </label>

              <input
                id="collection-month"
                type="month"
                className="field-input"
                value={
                  form.feeMonth
                }
                onChange={updateField(
                  "feeMonth"
                )}
                disabled={saving}
              />
            </div>

            {/* Due Date */}

            <div>
              <label
                htmlFor="collection-due-date"
                className="field-label"
              >
                Due Date
              </label>

              <input
                id="collection-due-date"
                type="date"
                className="field-input"
                value={
                  form.dueDate
                }
                onChange={updateField(
                  "dueDate"
                )}
                disabled={saving}
              />
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Fee Breakdown
        |--------------------------------------------------------------------------
        */}

        <section className="rounded-xl border border-slate-200 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Wallet
              size={18}
              className="text-brand-700"
            />

            <h3 className="text-sm font-bold text-slate-700">
              Fee Breakdown
            </h3>
          </div>

          {selectedFeeStructure ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-xs text-slate-400">
                    Monthly
                  </span>

                  <strong className="mt-1 block text-sm text-slate-700">
                    {formatCurrency(
                      selectedFeeStructure.monthlyFee
                    )}
                  </strong>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-xs text-slate-400">
                    Admission
                  </span>

                  <strong className="mt-1 block text-sm text-slate-700">
                    {formatCurrency(
                      selectedFeeStructure.admissionFee
                    )}
                  </strong>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-xs text-slate-400">
                    Exam
                  </span>

                  <strong className="mt-1 block text-sm text-slate-700">
                    {formatCurrency(
                      selectedFeeStructure.examFee
                    )}
                  </strong>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-xs text-slate-400">
                    Transport
                  </span>

                  <strong className="mt-1 block text-sm text-slate-700">
                    {formatCurrency(
                      selectedFeeStructure.transportFee
                    )}
                  </strong>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-xs text-slate-400">
                    Other
                  </span>

                  <strong className="mt-1 block text-sm text-slate-700">
                    {formatCurrency(
                      selectedFeeStructure.otherFee
                    )}
                  </strong>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Discount */}

                <div>
                  <label
                    htmlFor="collection-discount"
                    className="field-label"
                  >
                    Discount
                  </label>

                  <input
                    id="collection-discount"
                    type="number"
                    min="0"
                    step="1"
                    className="field-input"
                    value={
                      form.discount
                    }
                    onChange={updateField(
                      "discount"
                    )}
                    disabled={saving}
                  />
                </div>

                {/* Fine */}

                <div>
                  <label
                    htmlFor="collection-fine"
                    className="field-label"
                  >
                    Fine
                  </label>

                  <input
                    id="collection-fine"
                    type="number"
                    min="0"
                    step="1"
                    className="field-input"
                    value={
                      form.fine
                    }
                    onChange={updateField(
                      "fine"
                    )}
                    disabled={saving}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-28 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
              Select a student and fee
              structure to view fee
              details.
            </div>
          )}
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Initial Payment
        |--------------------------------------------------------------------------
        */}

        <section className="rounded-xl border border-slate-200 p-4">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard
              size={18}
              className="text-brand-700"
            />

            <div>
              <h3 className="text-sm font-bold text-slate-700">
                Initial Payment
              </h3>

              <p className="mt-0.5 text-xs text-slate-400">
                Keep paid amount at zero
                to create an unpaid
                invoice.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Paid Amount */}

            <div>
              <label
                htmlFor="collection-paid"
                className="field-label"
              >
                Paid Amount
              </label>

              <input
                id="collection-paid"
                type="number"
                min="0"
                step="1"
                className="field-input"
                value={
                  form.paidAmount
                }
                onChange={updateField(
                  "paidAmount"
                )}
                disabled={saving}
              />
            </div>

            {/* Payment Method */}

            <div>
              <label
                htmlFor="collection-method"
                className="field-label"
              >
                Payment Method
              </label>

              <select
                id="collection-method"
                className="field-select"
                value={
                  form.paymentMethod
                }
                onChange={updateField(
                  "paymentMethod"
                )}
                disabled={
                  saving ||
                  initialPaidAmount <=
                    0
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

            {/* Payment Date */}

            <div>
              <label
                htmlFor="collection-payment-date"
                className="field-label"
              >
                Payment Date
              </label>

              <input
                id="collection-payment-date"
                type="date"
                className="field-input"
                value={
                  form.paymentDate
                }
                onChange={updateField(
                  "paymentDate"
                )}
                disabled={
                  saving ||
                  initialPaidAmount <=
                    0
                }
              />
            </div>

            {/* Reference Number */}

            <div>
              <label
                htmlFor="collection-reference"
                className="field-label"
              >
                Reference Number
              </label>

              <input
                id="collection-reference"
                type="text"
                className="field-input"
                value={
                  form.referenceNumber
                }
                onChange={updateField(
                  "referenceNumber"
                )}
                placeholder="Bank, online or cheque reference"
                maxLength={120}
                disabled={
                  saving ||
                  initialPaidAmount <=
                    0
                }
              />
            </div>

            {/* Payment Remarks */}

            <div className="sm:col-span-2">
              <label
                htmlFor="collection-remarks"
                className="field-label"
              >
                Payment Remarks
              </label>

              <textarea
                id="collection-remarks"
                className="field-input min-h-20 resize-y"
                value={
                  form.remarks
                }
                onChange={updateField(
                  "remarks"
                )}
                placeholder="Optional payment remarks"
                maxLength={500}
                disabled={
                  saving ||
                  initialPaidAmount <=
                    0
                }
              />
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Invoice Notes
        |--------------------------------------------------------------------------
        */}

        <section>
          <label
            htmlFor="collection-notes"
            className="field-label"
          >
            Invoice Notes
          </label>

          <textarea
            id="collection-notes"
            className="field-input min-h-20 resize-y"
            value={
              form.notes
            }
            onChange={updateField(
              "notes"
            )}
            placeholder="Optional notes for this invoice"
            maxLength={1000}
            disabled={saving}
          />
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Invoice Summary
        |--------------------------------------------------------------------------
        */}

        <section className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ReceiptText
              size={18}
              className="text-brand-700"
            />

            <h3 className="text-sm font-bold text-slate-700">
              Invoice Summary
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <span className="text-xs text-slate-400">
                Original Total
              </span>

              <strong className="mt-1 block text-sm text-slate-700">
                {formatCurrency(
                  originalTotal
                )}
              </strong>
            </div>

            <div>
              <span className="text-xs text-slate-400">
                Payable
              </span>

              <strong className="mt-1 block text-sm text-brand-700">
                {formatCurrency(
                  payableAmount
                )}
              </strong>
            </div>

            <div>
              <span className="text-xs text-slate-400">
                Initial Payment
              </span>

              <strong className="mt-1 block text-sm text-emerald-700">
                {formatCurrency(
                  initialPaidAmount
                )}
              </strong>
            </div>

            <div>
              <span className="text-xs text-slate-400">
                Balance
              </span>

              <strong className="mt-1 block text-sm text-rose-700">
                {formatCurrency(
                  balanceAmount
                )}
              </strong>
            </div>

            <div>
              <span className="text-xs text-slate-400">
                Status
              </span>

              <strong className="mt-1 block text-sm text-slate-700">
                {paymentStatus}
              </strong>
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Actions
        |--------------------------------------------------------------------------
        */}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={
              saving ||
              loadingStudents ||
              loadingStructures
            }
          >
            {saving && (
              <Loader2
                size={16}
                className="animate-spin"
              />
            )}

            {saving
              ? "Creating Invoice..."
              : "Create Fee Invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
};