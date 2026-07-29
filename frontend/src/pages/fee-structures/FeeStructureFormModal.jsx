import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Calculator,
  Loader2
} from "lucide-react";

import {
  createFeeStructure,
  updateFeeStructure
} from "../../api/feeStructures";

import {
  getClasses
} from "../../api/classes";

import {
  Modal
} from "../../components/ui/Modal";

/*
|--------------------------------------------------------------------------
| Default Session Year
|--------------------------------------------------------------------------
*/

const getDefaultSessionYear = () => {
  const currentYear =
    new Date().getFullYear();

  return `${currentYear}-${currentYear + 1}`;
};

/*
|--------------------------------------------------------------------------
| Empty Form
|--------------------------------------------------------------------------
*/

const createEmptyForm = () => ({
  schoolId: "",
  classId: "",
  title: "",
  sessionYear:
    getDefaultSessionYear(),

  monthlyFee: "0",
  admissionFee: "0",
  examFee: "0",
  transportFee: "0",
  otherFee: "0",

  isActive: true
});

/*
|--------------------------------------------------------------------------
| Fee Fields
|--------------------------------------------------------------------------
*/

const feeFields = [
  {
    key: "monthlyFee",
    label: "Monthly Fee"
  },
  {
    key: "admissionFee",
    label: "Admission Fee"
  },
  {
    key: "examFee",
    label: "Exam Fee"
  },
  {
    key: "transportFee",
    label: "Transport Fee"
  },
  {
    key: "otherFee",
    label: "Other Fee"
  }
];

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
| Fee Structure Form Modal
|--------------------------------------------------------------------------
*/

export const FeeStructureFormModal = ({
  open,
  onClose,
  onSaved,
  schools = [],
  currentUser,
  initialData = null
}) => {
  const [form, setForm] =
    useState(
      createEmptyForm()
    );

  const [classes, setClasses] =
    useState([]);

  const [
    loadingClasses,
    setLoadingClasses
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | User and Editing State
  |--------------------------------------------------------------------------
  */

  const isEditing =
    Boolean(initialData?._id);

  const isSuperAdmin =
    currentUser?.role ===
    "super_admin";

  const currentSchoolId =
    currentUser?.schoolId?._id ||
    currentUser?.schoolId ||
    "";

  /*
  |--------------------------------------------------------------------------
  | Effective School ID
  |--------------------------------------------------------------------------
  */

  const effectiveSchoolId =
    isEditing
      ? initialData?.schoolId?._id ||
        initialData?.schoolId ||
        ""
      : isSuperAdmin
        ? form.schoolId
        : currentSchoolId;

  /*
  |--------------------------------------------------------------------------
  | Total Fee
  |--------------------------------------------------------------------------
  */

  const totalFee = useMemo(() => {
    return feeFields.reduce(
      (total, field) => {
        return (
          total +
          Number(
            form[field.key] || 0
          )
        );
      },
      0
    );
  }, [form]);

  /*
  |--------------------------------------------------------------------------
  | Prepare Form When Modal Opens
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialData) {
      setForm({
        schoolId:
          initialData.schoolId?._id ||
          initialData.schoolId ||
          "",

        classId:
          initialData.classId?._id ||
          initialData.classId ||
          "",

        title:
          initialData.title || "",

        sessionYear:
          initialData.sessionYear ||
          getDefaultSessionYear(),

        monthlyFee:
          String(
            initialData.monthlyFee ??
              0
          ),

        admissionFee:
          String(
            initialData.admissionFee ??
              0
          ),

        examFee:
          String(
            initialData.examFee ??
              0
          ),

        transportFee:
          String(
            initialData.transportFee ??
              0
          ),

        otherFee:
          String(
            initialData.otherFee ??
              0
          ),

        isActive:
          initialData.isActive !==
          false
      });
    } else {
      setForm({
        ...createEmptyForm(),

        schoolId: isSuperAdmin
          ? ""
          : currentSchoolId
      });
    }

    setClasses([]);
    setError("");
    setSaving(false);
  }, [
    open,
    initialData,
    isSuperAdmin,
    currentSchoolId
  ]);

  /*
  |--------------------------------------------------------------------------
  | Load Classes
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !open ||
      !effectiveSchoolId
    ) {
      setClasses([]);
      return;
    }

    let isActive = true;

    const loadClasses = async () => {
      setLoadingClasses(true);
      setError("");

      try {
        const params =
          isSuperAdmin
            ? {
                schoolId:
                  effectiveSchoolId,
                isActive: true
              }
            : {
                isActive: true
              };

        const { data } =
          await getClasses(
            params
          );

        if (isActive) {
          setClasses(
            data?.classes || []
          );
        }
      } catch (requestError) {
        if (isActive) {
          setClasses([]);

          setError(
            requestError.response
              ?.data?.message ||
              "Classes could not be loaded."
          );
        }
      } finally {
        if (isActive) {
          setLoadingClasses(
            false
          );
        }
      }
    };

    loadClasses();

    return () => {
      isActive = false;
    };
  }, [
    open,
    effectiveSchoolId,
    isSuperAdmin
  ]);

  /*
  |--------------------------------------------------------------------------
  | Update Field
  |--------------------------------------------------------------------------
  */

  const updateField =
    (field) => (event) => {
      const value =
        event.target.type ===
        "checkbox"
          ? event.target.checked
          : event.target.value;

      setForm((current) => {
        const nextForm = {
          ...current,
          [field]: value
        };

        /*
        | Reset class when school changes
        */

        if (
          field === "schoolId"
        ) {
          nextForm.classId = "";
        }

        return nextForm;
      });
    };

  /*
  |--------------------------------------------------------------------------
  | Submit Form
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    /*
    | School Validation
    */

    if (
      isSuperAdmin &&
      !isEditing &&
      !form.schoolId
    ) {
      setError(
        "Please select a school."
      );

      return;
    }

    /*
    | Class Validation
    */

    if (!form.classId) {
      setError(
        "Please select a class."
      );

      return;
    }

    /*
    | Title Validation
    */

    if (
      form.title.trim().length <
      2
    ) {
      setError(
        "Fee title must contain at least 2 characters."
      );

      return;
    }

    /*
    | Session Validation
    */

    if (
      !form.sessionYear.trim()
    ) {
      setError(
        "Session year is required."
      );

      return;
    }

    /*
    | Prepare Payload
    */

    const payload = {
      classId: form.classId,

      title:
        form.title.trim(),

      sessionYear:
        form.sessionYear.trim(),

      isActive:
        form.isActive
    };

    /*
    | Fee Amount Validation
    */

    for (
      const field of feeFields
    ) {
      const value = Number(
        form[field.key] || 0
      );

      if (
        Number.isNaN(value) ||
        value < 0
      ) {
        setError(
          `${field.label} must be a valid non-negative number.`
        );

        return;
      }

      payload[field.key] =
        value;
    }

    /*
    | Add School for Super Admin
    */

    if (
      isSuperAdmin &&
      !isEditing
    ) {
      payload.schoolId =
        form.schoolId;
    }

    setSaving(true);

    try {
      const { data } =
        isEditing
          ? await updateFeeStructure(
              initialData._id,
              payload
            )
          : await createFeeStructure(
              payload
            );

      onSaved?.(
        data?.feeStructure,

        data?.message ||
          `Fee structure ${
            isEditing
              ? "updated"
              : "created"
          } successfully.`
      );
    } catch (requestError) {
      setError(
        requestError.response
          ?.data?.message ||
          `Fee structure could not be ${
            isEditing
              ? "updated"
              : "created"
          }.`
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
      title={
        isEditing
          ? "Edit Fee Structure"
          : "Add Fee Structure"
      }
      width="max-w-3xl"
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

        <div className="grid gap-4 sm:grid-cols-2">
          {/* School */}

          {isSuperAdmin &&
            !isEditing && (
              <div className="sm:col-span-2">
                <label
                  htmlFor="fee-school"
                  className="field-label"
                >
                  School
                </label>

                <select
                  id="fee-school"
                  className="field-select"
                  value={
                    form.schoolId
                  }
                  onChange={updateField(
                    "schoolId"
                  )}
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

          {/* Class */}

          <div>
            <label
              htmlFor="fee-class"
              className="field-label"
            >
              Class
            </label>

            <select
              id="fee-class"
              className="field-select"
              value={form.classId}
              onChange={updateField(
                "classId"
              )}
              disabled={
                !effectiveSchoolId ||
                loadingClasses
              }
            >
              <option value="">
                {loadingClasses
                  ? "Loading classes..."
                  : "Select class"}
              </option>

              {classes.map(
                (classItem) => (
                  <option
                    key={
                      classItem._id
                    }
                    value={
                      classItem._id
                    }
                  >
                    {
                      classItem.className
                    }
                  </option>
                )
              )}
            </select>

            {!loadingClasses &&
              effectiveSchoolId &&
              classes.length ===
                0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No active classes
                  found for this
                  school.
                </p>
              )}
          </div>

          {/* Session Year */}

          <div>
            <label
              htmlFor="fee-session"
              className="field-label"
            >
              Session Year
            </label>

            <input
              id="fee-session"
              type="text"
              className="field-input"
              value={
                form.sessionYear
              }
              onChange={updateField(
                "sessionYear"
              )}
              placeholder="2026-2027"
              maxLength={30}
            />
          </div>

          {/* Title */}

          <div className="sm:col-span-2">
            <label
              htmlFor="fee-title"
              className="field-label"
            >
              Fee Title
            </label>

            <input
              id="fee-title"
              type="text"
              className="field-input"
              value={form.title}
              onChange={updateField(
                "title"
              )}
              placeholder="e.g. Class 6 Fee Structure"
              maxLength={120}
            />
          </div>

          {/* Fee Amounts */}

          {feeFields.map(
            (field) => (
              <div key={field.key}>
                <label
                  htmlFor={`fee-${field.key}`}
                  className="field-label"
                >
                  {field.label}
                </label>

                <input
                  id={`fee-${field.key}`}
                  type="number"
                  min="0"
                  step="1"
                  className="field-input"
                  value={
                    form[field.key]
                  }
                  onChange={updateField(
                    field.key
                  )}
                />
              </div>
            )
          )}

          {/* Status */}

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
            <span>
              <span className="block text-sm font-semibold text-slate-700">
                Active Fee
                Structure
              </span>

              <span className="mt-1 block text-xs text-slate-500">
                Inactive structures
                remain saved but are
                not treated as current.
              </span>
            </span>

            <input
              type="checkbox"
              checked={
                form.isActive
              }
              onChange={updateField(
                "isActive"
              )}
              className="h-4 w-4"
            />
          </label>
        </div>

        {/* Total Fee */}

        <div className="flex flex-col gap-2 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Calculator
              size={17}
              className="text-brand-700"
            />

            Total Listed Fee
          </div>

          <strong className="text-base text-brand-700">
            {formatCurrency(
              totalFee
            )}
          </strong>
        </div>

        {/* Actions */}

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
              loadingClasses
            }
          >
            {saving && (
              <Loader2
                size={16}
                className="animate-spin"
              />
            )}

            {saving
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create Fee Structure"}
          </button>
        </div>
      </form>
    </Modal>
  );
};