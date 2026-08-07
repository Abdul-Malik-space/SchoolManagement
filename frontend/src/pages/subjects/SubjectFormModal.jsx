import {
  useEffect,
  useMemo,
  useState
} from "react";
import {
  Building2
} from "lucide-react";

import {
  Modal
} from "../../components/ui/Modal";
import {
  createSubject,
  updateSubject
} from "../../api/subjects";
import {
  getClasses
} from "../../api/classes";
import {
  getTeachers
} from "../../api/teachers";
import {
  useAuth
} from "../../context/AuthContext";

const emptyForm = {
  schoolId: "",
  classId: "",
  teacherId: "",
  subjectCode: "",
  subjectName: "",
  description: ""
};

const getRecordId = (
  value
) => {
  if (!value) {
    return "";
  }

  return String(
    value?._id ||
    value?.id ||
    value
  );
};

export const SubjectFormModal = ({
  open,
  onClose,
  onSaved,
  subject,
  schools
}) => {
  const {
    user
  } = useAuth();

  const [
    form,
    setForm
  ] = useState(
    emptyForm
  );

  const [
    classes,
    setClasses
  ] = useState([]);

  const [
    teachers,
    setTeachers
  ] = useState([]);

  const [
    error,
    setError
  ] = useState("");

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    loadingDependents,
    setLoadingDependents
  ] = useState(false);

  const isEdit =
    Boolean(
      subject
    );

  const role =
    String(
      user?.role ||
      ""
    ).toLowerCase();

  const isSuperAdmin =
    role ===
    "super_admin";

  const assignedSchoolId =
    getRecordId(
      user?.schoolId
    );

  const firstAvailableSchoolId =
    getRecordId(
      schools?.[0]
    );

  const assignedSchoolName =
    useMemo(
      () => {
        if (
          user?.schoolId
            ?.schoolName
        ) {
          return user
            .schoolId
            .schoolName;
        }

        const matchedSchool =
          (
            schools ||
            []
          ).find(
            (
              school
            ) =>
              getRecordId(
                school
              ) ===
              assignedSchoolId
          );

        return (
          matchedSchool
            ?.schoolName ||
          "Assigned school"
        );
      },
      [
        assignedSchoolId,
        schools,
        user?.schoolId
      ]
    );

  const effectiveSchoolId =
    isSuperAdmin
      ? form.schoolId
      : assignedSchoolId ||
        form.schoolId;

  /*
  |--------------------------------------------------------------------------
  | Initialize Form
  |--------------------------------------------------------------------------
  |
  | Super Admin:
  | - School can be selected manually while creating.
  |
  | Principal:
  | - Assigned school is used automatically.
  | - School selector is never shown.
  |
  | Edit:
  | - Existing subject school remains fixed.
  |
  */

  useEffect(
    () => {
      if (!open) {
        return;
      }

      if (
        subject
      ) {
        setForm({
          schoolId:
            getRecordId(
              subject.schoolId
            ) ||
            assignedSchoolId,

          classId:
            getRecordId(
              subject.classId
            ),

          teacherId:
            getRecordId(
              subject.teacherId
            ),

          subjectCode:
            subject.subjectCode ||
            "",

          subjectName:
            subject.subjectName ||
            "",

          description:
            subject.description ||
            ""
        });
      } else {
        setForm({
          ...emptyForm,

          schoolId:
            isSuperAdmin
              ? firstAvailableSchoolId
              : assignedSchoolId
        });
      }

      setError("");
    },
    [
      assignedSchoolId,
      firstAvailableSchoolId,
      isSuperAdmin,
      open,
      subject
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Load Classes and Teachers
  |--------------------------------------------------------------------------
  |
  | Principal requests do not send a client-controlled schoolId.
  | Backend school-scope middleware/controller decides the Principal's school.
  |
  | Super Admin sends the manually selected schoolId.
  |
  */

  useEffect(
    () => {
      if (
        !open ||
        !effectiveSchoolId
      ) {
        setClasses([]);
        setTeachers([]);
        return undefined;
      }

      let active =
        true;

      const fetchDependents =
        async () => {
          setLoadingDependents(
            true
          );

          try {
            const params =
              isSuperAdmin
                ? {
                    schoolId:
                      effectiveSchoolId
                  }
                : {};

            const [
              classRes,
              teacherRes
            ] =
              await Promise.all([
                getClasses(
                  params
                ),

                getTeachers(
                  params
                )
              ]);

            if (!active) {
              return;
            }

            setClasses(
              classRes
                .data
                ?.classes ||
              []
            );

            setTeachers(
              teacherRes
                .data
                ?.teachers ||
              []
            );
          } catch (
            requestError
          ) {
            if (!active) {
              return;
            }

            setClasses([]);
            setTeachers([]);

            setError(
              requestError
                .response
                ?.data
                ?.message ||
              "Could not load classes and teachers for this school."
            );
          } finally {
            if (
              active
            ) {
              setLoadingDependents(
                false
              );
            }
          }
        };

      fetchDependents();

      return () => {
        active =
          false;
      };
    },
    [
      effectiveSchoolId,
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
            event
              .target
              .value
        })
      );
    };

  const handleSchoolChange =
    (
      event
    ) => {
      setForm(
        (
          current
        ) => ({
          ...current,

          schoolId:
            event
              .target
              .value,

          classId:
            "",

          teacherId:
            ""
        })
      );

      setError("");
    };

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      setError("");

      /*
      |--------------------------------------------------------------------------
      | School Validation
      |--------------------------------------------------------------------------
      |
      | Only Super Admin selects a school manually.
      | Principal must have an assigned school on the authenticated account.
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

      if (
        !isSuperAdmin &&
        !assignedSchoolId
      ) {
        setError(
          "A school is not assigned to this Principal account."
        );

        return;
      }

      if (
        !form.classId
      ) {
        setError(
          "Please select a class."
        );

        return;
      }

      if (
        !form.subjectCode
          .trim() ||
        !form.subjectName
          .trim()
      ) {
        setError(
          "Subject code and subject name are required."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Payload
      |--------------------------------------------------------------------------
      |
      | Security rule:
      | - Principal does NOT send schoolId.
      | - Backend resolves school from the authenticated Principal.
      | - Super Admin sends selected schoolId only for subject creation.
      | - School cannot be changed while editing.
      |
      */

      const payload = {
        classId:
          form.classId,

        teacherId:
          form.teacherId ||
          null,

        subjectCode:
          form.subjectCode
            .trim(),

        subjectName:
          form.subjectName
            .trim(),

        description:
          form.description
            .trim()
      };

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
          await updateSubject(
            subject._id,
            payload
          );
        } else {
          await createSubject(
            payload
          );
        }

        onSaved?.();
      } catch (
        requestError
      ) {
        setError(
          requestError
            .response
            ?.data
            ?.message ||
          "Could not save the subject."
        );
      } finally {
        setSaving(
          false
        );
      }
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

  const classPlaceholder =
    loadingDependents
      ? "Loading classes..."
      : effectiveSchoolId
        ? "Select a class"
        : isSuperAdmin
          ? "Select a school first"
          : "Assigned school unavailable";

  return (
    <Modal
      open={open}
      onClose={
        closeModal
      }
      title={
        isEdit
          ? "Edit Subject"
          : "New Subject"
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
        | School
        |--------------------------------------------------------------------------
        |
        | Super Admin gets the school dropdown.
        | Principal sees only the assigned-school confirmation card.
        |
        */}

        {isSuperAdmin ? (
          <div>
            <label
              className="field-label"
              htmlFor="subject-school"
            >
              School
            </label>

            <select
              id="subject-school"
              className="field-select"
              value={
                form.schoolId
              }
              onChange={
                handleSchoolChange
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

              {schools?.map(
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
                  This subject will automatically be created for your assigned school.
                </p>
              </div>
            </div>
          )
        )}

        <div>
          <label
            className="field-label"
            htmlFor="subject-class"
          >
            Class
          </label>

          <select
            id="subject-class"
            className="field-select"
            value={
              form.classId
            }
            onChange={
              handleChange(
                "classId"
              )
            }
            required
            disabled={
              isEdit ||
              !effectiveSchoolId ||
              loadingDependents ||
              saving
            }
          >
            <option
              value=""
              disabled
            >
              {classPlaceholder}
            </option>

            {classes.map(
              (
                classItem
              ) => (
                <option
                  key={
                    classItem._id
                  }
                  value={
                    classItem._id
                  }
                >
                  {classItem.className}
                </option>
              )
            )}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              className="field-label"
              htmlFor="subject-code"
            >
              Subject Code
            </label>

            <input
              id="subject-code"
              required
              className="field-input"
              value={
                form.subjectCode
              }
              onChange={
                handleChange(
                  "subjectCode"
                )
              }
              placeholder="MATH6"
              disabled={
                saving
              }
            />
          </div>

          <div>
            <label
              className="field-label"
              htmlFor="subject-name"
            >
              Subject Name
            </label>

            <input
              id="subject-name"
              required
              className="field-input"
              value={
                form.subjectName
              }
              onChange={
                handleChange(
                  "subjectName"
                )
              }
              placeholder="Mathematics"
              disabled={
                saving
              }
            />
          </div>
        </div>

        <div>
          <label
            className="field-label"
            htmlFor="subject-teacher"
          >
            Teacher (optional)
          </label>

          <select
            id="subject-teacher"
            className="field-select"
            value={
              form.teacherId
            }
            onChange={
              handleChange(
                "teacherId"
              )
            }
            disabled={
              !effectiveSchoolId ||
              loadingDependents ||
              saving
            }
          >
            <option value="">
              {loadingDependents
                ? "Loading teachers..."
                : "Not assigned yet"}
            </option>

            {teachers.map(
              (
                teacher
              ) => (
                <option
                  key={
                    teacher._id
                  }
                  value={
                    teacher._id
                  }
                >
                  {teacher.name}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label
            className="field-label"
            htmlFor="subject-description"
          >
            Description (optional)
          </label>

          <textarea
            id="subject-description"
            className="field-input"
            rows={3}
            value={
              form.description
            }
            onChange={
              handleChange(
                "description"
              )
            }
            placeholder="Short note about this subject"
            disabled={
              saving
            }
          />
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
              saving ||
              loadingDependents ||
              (
                !isSuperAdmin &&
                !assignedSchoolId
              )
            }
          >
            {saving
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Create Subject"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
