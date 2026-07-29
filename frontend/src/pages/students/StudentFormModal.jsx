import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Building2,
  Loader2,
  Mail,
  Phone,
  UserRound,
  Users
} from "lucide-react";

import {
  createStudent,
  getAvailableStudentUsers
} from "../../api/students";

import {
  getClasses
} from "../../api/classes";

import {
  Modal
} from "../../components/ui/Modal";

const getToday = () => {
  return new Date()
    .toISOString()
    .split("T")[0];
};

const emptyForm = {
  schoolId: "",
  studentUserId: "",
  parentUserIds: [],
  classId: "",
  sectionId: "",
  fatherName: "",
  bForm: "",
  dateOfBirth: "",
  gender: "",
  guardianName: "",
  guardianContact: "",
  admissionDate: getToday(),
  status: "active"
};

export const StudentFormModal = ({
  open,
  onClose,
  onSaved,
  schools = [],
  currentUser
}) => {
  const [form, setForm] =
    useState(emptyForm);

  const [classes, setClasses] =
    useState([]);

  const [
    studentUsers,
    setStudentUsers
  ] = useState([]);

  const [
    parentUsers,
    setParentUsers
  ] = useState([]);

  const [loadingData, setLoadingData] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const isSuperAdmin =
    currentUser?.role ===
    "super_admin";

  const currentSchoolId =
    currentUser?.schoolId?._id ||
    currentUser?.schoolId ||
    "";

  const effectiveSchoolId =
    isSuperAdmin
      ? form.schoolId
      : currentSchoolId;

  const selectedStudentUser =
    useMemo(() => {
      return studentUsers.find(
        (user) =>
          user._id ===
          form.studentUserId
      );
    }, [
      studentUsers,
      form.studentUserId
    ]);

  const selectedClass =
    useMemo(() => {
      return classes.find(
        (classItem) =>
          classItem._id ===
          form.classId
      );
    }, [
      classes,
      form.classId
    ]);

  const sections =
    selectedClass?.sections || [];

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      ...emptyForm,

      schoolId:
        isSuperAdmin
          ? ""
          : currentSchoolId,

      admissionDate:
        getToday()
    });

    setClasses([]);
    setStudentUsers([]);
    setParentUsers([]);
    setLoadingData(false);
    setSaving(false);
    setError("");
  }, [
    open,
    isSuperAdmin,
    currentSchoolId
  ]);

  useEffect(() => {
    if (
      !open ||
      !effectiveSchoolId
    ) {
      setClasses([]);
      setStudentUsers([]);
      setParentUsers([]);
      return;
    }

    let active = true;

    const loadFormData =
      async () => {
        setLoadingData(true);
        setError("");

        try {
          const commonParams =
            isSuperAdmin
              ? {
                  schoolId:
                    effectiveSchoolId
                }
              : {};

          const [
            classesResponse,
            studentsResponse,
            parentsResponse
          ] = await Promise.all([
            getClasses({
              ...commonParams,
              isActive: true
            }),

            getAvailableStudentUsers({
              ...commonParams,
              role: "student"
            }),

            getAvailableStudentUsers({
              ...commonParams,
              role: "parent"
            })
          ]);

          if (!active) {
            return;
          }

          setClasses(
            classesResponse.data
              ?.classes || []
          );

          setStudentUsers(
            studentsResponse.data
              ?.users || []
          );

          setParentUsers(
            parentsResponse.data
              ?.users || []
          );
        } catch (requestError) {
          if (!active) {
            return;
          }

          setClasses([]);
          setStudentUsers([]);
          setParentUsers([]);

          setError(
            requestError.response?.data
              ?.message ||
              "Student form data could not be loaded."
          );
        } finally {
          if (active) {
            setLoadingData(false);
          }
        }
      };

    loadFormData();

    return () => {
      active = false;
    };
  }, [
    open,
    effectiveSchoolId,
    isSuperAdmin
  ]);

  const updateField = (
    field
  ) => {
    return (event) => {
      const value =
        event.target.value;

      setForm((current) => {
        const nextForm = {
          ...current,
          [field]: value
        };

        if (
          field === "schoolId"
        ) {
          nextForm.studentUserId = "";
          nextForm.parentUserIds = [];
          nextForm.classId = "";
          nextForm.sectionId = "";
        }

        if (
          field === "classId"
        ) {
          nextForm.sectionId = "";
        }

        return nextForm;
      });
    };
  };

  const toggleParent = (
    parentId
  ) => {
    setForm((current) => {
      const alreadySelected =
        current.parentUserIds.includes(
          parentId
        );

      return {
        ...current,

        parentUserIds:
          alreadySelected
            ? current.parentUserIds.filter(
                (id) =>
                  id !== parentId
              )
            : [
                ...current.parentUserIds,
                parentId
              ]
      };
    });
  };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");

      if (
        isSuperAdmin &&
        !form.schoolId
      ) {
        setError(
          "Please select a school."
        );

        return;
      }

      if (
        !form.studentUserId
      ) {
        setError(
          "Please select a student user account."
        );

        return;
      }

      if (!form.classId) {
        setError(
          "Please select a class."
        );

        return;
      }

      if (!form.sectionId) {
        setError(
          "Please select a section."
        );

        return;
      }

      if (
        form.fatherName
          .trim()
          .length < 2
      ) {
        setError(
          "Father name is required."
        );

        return;
      }

      if (!form.gender) {
        setError(
          "Please select gender."
        );

        return;
      }

      const payload = {
        studentUserId:
          form.studentUserId,

        parentUserIds:
          form.parentUserIds,

        classId:
          form.classId,

        sectionId:
          form.sectionId,

        fatherName:
          form.fatherName.trim(),

        bForm:
          form.bForm.trim(),

        gender:
          form.gender,

        guardianName:
          form.guardianName.trim(),

        guardianContact:
          form.guardianContact.trim(),

        admissionDate:
          form.admissionDate,

        status:
          form.status
      };

      if (
        form.dateOfBirth
      ) {
        payload.dateOfBirth =
          form.dateOfBirth;
      }

      if (isSuperAdmin) {
        payload.schoolId =
          form.schoolId;
      }

      setSaving(true);

      try {
        const { data } =
          await createStudent(
            payload
          );

        onSaved?.(
          data?.student,

          data?.message ||
            "Student profile created successfully."
        );
      } catch (requestError) {
        setError(
          requestError.response?.data
            ?.message ||
            "Student profile could not be created."
        );
      } finally {
        setSaving(false);
      }
    };

  const handleClose = () => {
    if (!saving) {
      onClose?.();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Student"
      width="max-w-4xl"
    >
      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
        noValidate
      >
        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {isSuperAdmin && (
            <div className="sm:col-span-2">
              <label
                htmlFor="student-school"
                className="field-label"
              >
                School
              </label>

              <select
                id="student-school"
                autoFocus
                required
                className="field-select"
                value={form.schoolId}
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

          <div className="sm:col-span-2">
            <label
              htmlFor="student-user"
              className="field-label"
            >
              Student User Account
            </label>

            <select
              id="student-user"
              required
              disabled={
                !effectiveSchoolId ||
                loadingData
              }
              className="field-select"
              value={
                form.studentUserId
              }
              onChange={updateField(
                "studentUserId"
              )}
            >
              <option value="">
                {loadingData
                  ? "Loading accounts..."
                  : !effectiveSchoolId
                    ? "Select school first"
                    : studentUsers.length ===
                        0
                      ? "No available student accounts"
                      : "Select student account"}
              </option>

              {studentUsers.map(
                (user) => (
                  <option
                    key={
                      user._id
                    }
                    value={
                      user._id
                    }
                  >
                    {user.name} —{" "}
                    {user.email}
                  </option>
                )
              )}
            </select>
          </div>

          {selectedStudentUser && (
            <div className="sm:col-span-2">
              <div className="grid gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 sm:col-span-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-700">
                    {selectedStudentUser.name
                      ?.split(" ")
                      .filter(Boolean)
                      .map(
                        (part) =>
                          part[0]
                      )
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>

                  <div>
                    <p className="font-bold text-slate-800">
                      {
                        selectedStudentUser.name
                      }
                    </p>

                    <p className="text-xs text-slate-500">
                      Linked Student Account
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Mail size={14} />
                  {
                    selectedStudentUser.email
                  }
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Phone size={14} />

                  {selectedStudentUser.phone ||
                    "No phone"}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Building2
                    size={14}
                  />

                  {selectedStudentUser
                    .schoolId
                    ?.schoolName ||
                    "School"}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <UserRound
                    size={14}
                  />
                  Student Account
                </div>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="student-class"
              className="field-label"
            >
              Class
            </label>

            <select
              id="student-class"
              required
              disabled={
                !effectiveSchoolId ||
                loadingData
              }
              className="field-select"
              value={form.classId}
              onChange={updateField(
                "classId"
              )}
            >
              <option value="">
                Select class
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
          </div>

          <div>
            <label
              htmlFor="student-section"
              className="field-label"
            >
              Section
            </label>

            <select
              id="student-section"
              required
              disabled={
                !form.classId
              }
              className="field-select"
              value={form.sectionId}
              onChange={updateField(
                "sectionId"
              )}
            >
              <option value="">
                {form.classId
                  ? "Select section"
                  : "Select class first"}
              </option>

              {sections.map(
                (section) => (
                  <option
                    key={
                      section._id
                    }
                    value={
                      section._id
                    }
                  >
                    {
                      section.sectionName
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="student-father-name"
              className="field-label"
            >
              Father Name
            </label>

            <input
              id="student-father-name"
              required
              className="field-input"
              value={form.fatherName}
              onChange={updateField(
                "fatherName"
              )}
              placeholder="Enter father name"
            />
          </div>

          <div>
            <label
              htmlFor="student-bform"
              className="field-label"
            >
              B-Form
            </label>

            <input
              id="student-bform"
              className="field-input"
              value={form.bForm}
              onChange={updateField(
                "bForm"
              )}
              placeholder="xxxxx-xxxxxxx-x"
            />
          </div>

          <div>
            <label
              htmlFor="student-gender"
              className="field-label"
            >
              Gender
            </label>

            <select
              id="student-gender"
              required
              className="field-select"
              value={form.gender}
              onChange={updateField(
                "gender"
              )}
            >
              <option value="">
                Select gender
              </option>

              <option value="male">
                Male
              </option>

              <option value="female">
                Female
              </option>

              <option value="other">
                Other
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="student-dob"
              className="field-label"
            >
              Date of Birth
            </label>

            <input
              id="student-dob"
              type="date"
              className="field-input"
              value={form.dateOfBirth}
              onChange={updateField(
                "dateOfBirth"
              )}
              max={getToday()}
            />
          </div>

          <div>
            <label
              htmlFor="student-admission-date"
              className="field-label"
            >
              Admission Date
            </label>

            <input
              id="student-admission-date"
              type="date"
              required
              className="field-input"
              value={form.admissionDate}
              onChange={updateField(
                "admissionDate"
              )}
            />
          </div>

          <div>
            <label
              htmlFor="student-status"
              className="field-label"
            >
              Student Status
            </label>

            <select
              id="student-status"
              className="field-select"
              value={form.status}
              onChange={updateField(
                "status"
              )}
            >
              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>

              <option value="transferred">
                Transferred
              </option>

              <option value="passed_out">
                Passed Out
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="guardian-name"
              className="field-label"
            >
              Guardian Name
            </label>

            <input
              id="guardian-name"
              className="field-input"
              value={form.guardianName}
              onChange={updateField(
                "guardianName"
              )}
              placeholder="Optional"
            />
          </div>

          <div>
            <label
              htmlFor="guardian-contact"
              className="field-label"
            >
              Guardian Contact
            </label>

            <input
              id="guardian-contact"
              className="field-input"
              value={
                form.guardianContact
              }
              onChange={updateField(
                "guardianContact"
              )}
              placeholder="Optional"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="field-label">
              Parent Accounts
            </label>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/40 p-3">
              {parentUsers.length ===
              0 ? (
                <div className="flex items-center justify-center gap-2 py-5 text-sm text-slate-400">
                  <Users size={18} />
                  No active parent accounts available
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {parentUsers.map(
                    (parent) => {
                      const checked =
                        form.parentUserIds.includes(
                          parent._id
                        );

                      return (
                        <label
                          key={
                            parent._id
                          }
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                            checked
                              ? "border-brand-300 bg-brand-50"
                              : "border-slate-100 bg-white hover:border-slate-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={
                              checked
                            }
                            onChange={() =>
                              toggleParent(
                                parent._id
                              )
                            }
                          />

                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-700">
                              {
                                parent.name
                              }
                            </span>

                            <span className="block truncate text-xs text-slate-500">
                              {parent.email}
                            </span>
                          </span>
                        </label>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary"
            disabled={saving}
            onClick={handleClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={
              saving ||
              loadingData
            }
          >
            {saving && (
              <Loader2
                size={16}
                className="animate-spin"
              />
            )}

            {saving
              ? "Creating..."
              : "Create Student"}
          </button>
        </div>
      </form>
    </Modal>
  );
};