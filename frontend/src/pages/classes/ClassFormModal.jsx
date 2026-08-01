import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Building2,
  Plus,
  Trash2
} from "lucide-react";

import {
  createClass,
  updateClass
} from "../../api/classes";

import {
  useAuth
} from "../../context/AuthContext";

import {
  Modal
} from "../../components/ui/Modal";

const emptySection = () => ({
  sectionName: "",
  capacity: 40
});

export const ClassFormModal = ({
  open,
  onClose,
  onSaved,
  classData,
  schools = []
}) => {
  const {
    user
  } = useAuth();

  const isEdit =
    Boolean(
      classData
    );

  const isSuperAdmin =
    user?.role ===
    "super_admin";

  const assignedSchoolId =
    user?.schoolId?._id ||
    user?.schoolId ||
    "";

  const assignedSchoolName =
    user?.schoolId?.schoolName ||
    user?.school?.schoolName ||
    "Your assigned school";

  const firstAvailableSchoolId =
    useMemo(
      () =>
        schools?.[0]?._id ||
        "",
      [
        schools
      ]
    );

  const [
    form,
    setForm
  ] = useState({
    schoolId: "",
    className: "",
    numericOrder: 0
  });

  const [
    sections,
    setSections
  ] = useState([
    emptySection()
  ]);

  const [
    error,
    setError
  ] = useState("");

  const [
    saving,
    setSaving
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Prepare Form
  |--------------------------------------------------------------------------
  |
  | Super Admin نئی class بناتے وقت school منتخب کرے گا۔
  |
  | Principal اور دوسرے school-scoped users کے لیے school login account
  | سے پہلے ہی معلوم ہے، اس لیے dropdown دکھانے کی ضرورت نہیں۔
  |
  */

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      if (
        classData
      ) {
        setForm({
          schoolId:
            classData.schoolId?._id ||
            classData.schoolId ||
            assignedSchoolId ||
            "",

          className:
            classData.className ||
            "",

          numericOrder:
            classData.numericOrder ??
            0
        });

        setSections(
          classData.sections?.length
            ? classData.sections.map(
                (
                  section
                ) => ({
                  _id:
                    section._id,

                  sectionName:
                    section.sectionName ||
                    "",

                  capacity:
                    section.capacity ??
                    40
                })
              )
            : [
                emptySection()
              ]
        );
      } else {
        setForm({
          schoolId:
            isSuperAdmin
              ? firstAvailableSchoolId
              : assignedSchoolId,

          className:
            "",

          numericOrder:
            0
        });

        setSections([
          emptySection()
        ]);
      }

      setError("");
    },
    [
      assignedSchoolId,
      classData,
      firstAvailableSchoolId,
      isSuperAdmin,
      open
    ]
  );

  const handleChange =
    (
      field
    ) =>
    (
      event
    ) => {
      setForm(
        (
          current
        ) => ({
          ...current,

          [field]:
            event.target.value
        })
      );
    };

  const handleSectionChange =
    (
      index,
      field
    ) =>
    (
      event
    ) => {
      const value =
        field ===
        "capacity"
          ? Number(
              event.target.value
            )
          : event.target.value;

      setSections(
        (
          current
        ) =>
          current.map(
            (
              section,
              sectionIndex
            ) =>
              sectionIndex ===
              index
                ? {
                    ...section,
                    [field]:
                      value
                  }
                : section
          )
      );
    };

  const addSection =
    () => {
      setSections(
        (
          current
        ) => [
          ...current,
          emptySection()
        ]
      );
    };

  const removeSection =
    (
      index
    ) => {
      setSections(
        (
          current
        ) =>
          current.filter(
            (
              _,
              sectionIndex
            ) =>
              sectionIndex !==
              index
          )
      );
    };

  const closeModal =
    () => {
      if (
        saving
      ) {
        return;
      }

      onClose?.();
    };

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      setError("");

      const className =
        form.className.trim();

      if (
        !className
      ) {
        setError(
          "Class name is required."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | School Validation
      |--------------------------------------------------------------------------
      |
      | صرف Super Admin کو create کرتے وقت school manually منتخب کرنا ہوگا۔
      | Principal کا school backend logged-in account سے خود لے گا۔
      |
      */

      if (
        !isEdit &&
        isSuperAdmin &&
        !form.schoolId
      ) {
        setError(
          "Please select a school."
        );

        return;
      }

      const cleanedSections =
        sections
          .map(
            (
              section
            ) => ({
              ...(
                section._id
                  ? {
                      _id:
                        section._id
                    }
                  : {}
              ),

              sectionName:
                section.sectionName.trim(),

              capacity:
                Number(
                  section.capacity ||
                  0
                )
            })
          )
          .filter(
            (
              section
            ) =>
              Boolean(
                section.sectionName
              )
          );

      if (
        cleanedSections.length ===
        0
      ) {
        setError(
          "Add at least one section."
        );

        return;
      }

      const invalidCapacity =
        cleanedSections.some(
          (
            section
          ) =>
            !Number.isFinite(
              section.capacity
            ) ||
            section.capacity <
              0
        );

      if (
        invalidCapacity
      ) {
        setError(
          "Section capacity must be a valid non-negative number."
        );

        return;
      }

      const payload = {
        className,

        numericOrder:
          Number(
            form.numericOrder ||
            0
          ),

        sections:
          cleanedSections
      };

      /*
      |--------------------------------------------------------------------------
      | School Payload
      |--------------------------------------------------------------------------
      |
      | Super Admin create request میں selected schoolId بھیجے گا۔
      |
      | Principal request میں schoolId نہیں بھیجا جائے گا؛ backend req.user
      | کے assigned school کو استعمال کرے گا۔
      |
      | Edit request میں school تبدیل نہیں ہو سکتا، اس لیے schoolId omit ہے۔
      |
      */

      if (
        !isEdit &&
        isSuperAdmin
      ) {
        payload.schoolId =
          form.schoolId;
      }

      setSaving(
        true
      );

      try {
        if (
          isEdit
        ) {
          await updateClass(
            classData._id,
            payload
          );
        } else {
          await createClass(
            payload
          );
        }

        onSaved?.();
      } catch (
        requestError
      ) {
        setError(
          requestError.response
            ?.data?.message ||
            (
              isEdit
                ? "Could not update the class."
                : "Could not create the class."
            )
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  return (
    <Modal
      open={
        open
      }
      onClose={
        closeModal
      }
      title={
        isEdit
          ? "Edit Class"
          : "New Class"
      }
    >
      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-4"
        noValidate
      >
        {error && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/*
        |--------------------------------------------------------------------------
        | School Selection
        |--------------------------------------------------------------------------
        |
        | Principal کے لیے dropdown مکمل طور پر hidden ہے۔
        |
        */}

        {isSuperAdmin ? (
          <div>
            <label
              className="field-label"
              htmlFor="class-school"
            >
              School
            </label>

            <select
              id="class-school"
              className="field-select"
              value={
                form.schoolId
              }
              onChange={
                handleChange(
                  "schoolId"
                )
              }
              required={
                !isEdit
              }
              disabled={
                isEdit ||
                saving
              }
            >
              <option
                value=""
                disabled
              >
                Select a school
              </option>

              {schools.map(
                (
                  school
                ) => (
                  <option
                    key={
                      school._id
                    }
                    value={
                      school._id
                    }
                  >
                    {school.schoolName}
                  </option>
                )
              )}
            </select>
          </div>
        ) : (
          !isEdit && (
            <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                <Building2
                  size={17}
                />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-brand-500">
                  Assigned School
                </p>

                <p className="mt-0.5 text-sm font-semibold text-brand-800">
                  {assignedSchoolName}
                </p>

                <p className="mt-1 text-xs leading-5 text-brand-600">
                  This class will automatically be created for your assigned school.
                </p>
              </div>
            </div>
          )
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              className="field-label"
              htmlFor="class-name"
            >
              Class Name
            </label>

            <input
              id="class-name"
              required
              className="field-input"
              value={
                form.className
              }
              onChange={
                handleChange(
                  "className"
                )
              }
              placeholder="Class 6"
              disabled={
                saving
              }
            />
          </div>

          <div>
            <label
              className="field-label"
              htmlFor="class-order"
            >
              Order
            </label>

            <input
              id="class-order"
              type="number"
              className="field-input"
              value={
                form.numericOrder
              }
              onChange={
                handleChange(
                  "numericOrder"
                )
              }
              placeholder="1"
              disabled={
                saving
              }
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="field-label mb-0">
              Sections
            </label>

            <button
              type="button"
              onClick={
                addSection
              }
              className="btn-ghost !px-2 !py-1 text-xs"
              disabled={
                saving
              }
            >
              <Plus
                size={13}
              />

              Add Section
            </button>
          </div>

          <div className="space-y-2">
            {sections.map(
              (
                section,
                index
              ) => (
                <div
                  key={
                    section._id ||
                    index
                  }
                  className="flex items-center gap-2"
                >
                  <input
                    className="field-input min-w-0 flex-1"
                    placeholder="Section name, e.g. A"
                    value={
                      section.sectionName
                    }
                    onChange={
                      handleSectionChange(
                        index,
                        "sectionName"
                      )
                    }
                    disabled={
                      saving
                    }
                  />

                  <input
                    type="number"
                    min="0"
                    className="field-input w-24 shrink-0"
                    placeholder="Capacity"
                    value={
                      section.capacity
                    }
                    onChange={
                      handleSectionChange(
                        index,
                        "capacity"
                      )
                    }
                    disabled={
                      saving
                    }
                  />

                  {sections.length >
                    1 && (
                    <button
                      type="button"
                      onClick={
                        () =>
                          removeSection(
                            index
                          )
                      }
                      className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        saving
                      }
                      aria-label={`Remove section ${index + 1}`}
                    >
                      <Trash2
                        size={15}
                      />
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={
              closeModal
            }
            disabled={
              saving
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={
              saving
            }
          >
            {saving
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Create Class"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
