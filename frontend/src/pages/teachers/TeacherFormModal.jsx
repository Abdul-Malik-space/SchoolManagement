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
  UserRound
} from "lucide-react";

import {
  createTeacher,
  getAvailableTeacherUsers
} from "../../api/teachers";

import { Modal } from "../../components/ui/Modal";

const today = () => {
  return new Date()
    .toISOString()
    .split("T")[0];
};

const emptyForm = {
  schoolId: "",
  userId: "",
  fatherName: "",
  cnic: "",
  gender: "",
  dateOfBirth: "",
  qualification: "",
  subjects: "",
  salary: "",
  joiningDate: today(),
  status: "active"
};

export const TeacherFormModal = ({
  open,
  onClose,
  onSaved,
  schools = [],
  currentUser
}) => {
  const [form, setForm] =
    useState(emptyForm);

  const [
    availableUsers,
    setAvailableUsers
  ] = useState([]);

  const [
    loadingUsers,
    setLoadingUsers
  ] = useState(false);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const isSuperAdmin =
    currentUser?.role ===
    "super_admin";

  const currentUserSchoolId =
    currentUser?.schoolId?._id ||
    currentUser?.schoolId ||
    "";

  const effectiveSchoolId =
    isSuperAdmin
      ? form.schoolId
      : currentUserSchoolId;

  const selectedUser =
    useMemo(() => {
      return availableUsers.find(
        (user) =>
          user._id ===
          form.userId
      );
    }, [
      availableUsers,
      form.userId
    ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      ...emptyForm,

      schoolId:
        isSuperAdmin
          ? ""
          : currentUserSchoolId,

      joiningDate:
        today()
    });

    setAvailableUsers([]);
    setSaving(false);
    setLoadingUsers(false);
    setError("");
  }, [
    open,
    isSuperAdmin,
    currentUserSchoolId
  ]);

  useEffect(() => {
    if (
      !open ||
      !effectiveSchoolId
    ) {
      setAvailableUsers([]);
      return;
    }

    let active = true;

    const fetchUsers =
      async () => {
        setLoadingUsers(true);
        setError("");

        try {
          const params =
            isSuperAdmin
              ? {
                  schoolId:
                    effectiveSchoolId
                }
              : {};

          const {
            data
          } =
            await getAvailableTeacherUsers(
              params
            );

          if (active) {
            setAvailableUsers(
              data?.users || []
            );
          }
        } catch (
          requestError
        ) {
          if (active) {
            setAvailableUsers([]);

            setError(
              requestError.response
                ?.data?.message ||
                "Teacher user accounts could not be loaded."
            );
          }
        } finally {
          if (active) {
            setLoadingUsers(
              false
            );
          }
        }
      };

    fetchUsers();

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
          nextForm.userId = "";
        }

        return nextForm;
      });
    };
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

      if (!form.userId) {
        setError(
          "Please select a teacher user account."
        );

        return;
      }

      if (
        !selectedUser?.phone
      ) {
        setError(
          "The selected user account has no phone number. Update the user account first."
        );

        return;
      }

      if (!form.gender) {
        setError(
          "Please select gender."
        );

        return;
      }

      if (
        form.qualification
          .trim().length < 2
      ) {
        setError(
          "Qualification is required."
        );

        return;
      }

      const subjects = [
        ...new Set(
          form.subjects
            .split(",")
            .map((subject) =>
              subject.trim()
            )
            .filter(Boolean)
        )
      ];

      const salary =
        form.salary === ""
          ? 0
          : Number(form.salary);

      if (
        Number.isNaN(salary) ||
        salary < 0
      ) {
        setError(
          "Salary must be a valid non-negative number."
        );

        return;
      }

      const payload = {
        userId:
          form.userId,

        fatherName:
          form.fatherName.trim(),

        cnic:
          form.cnic.trim(),

        gender:
          form.gender,

        qualification:
          form.qualification.trim(),

        subjects,
        salary,

        joiningDate:
          form.joiningDate,

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
        const {
          data
        } = await createTeacher(
          payload
        );

        onSaved?.(
          data?.teacher,
          data?.message ||
            "Teacher profile created successfully."
        );
      } catch (
        requestError
      ) {
        setError(
          requestError.response
            ?.data?.message ||
            "Teacher profile could not be created."
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
      title="Add Teacher"
      width="max-w-3xl"
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
                htmlFor="teacher-school"
                className="field-label"
              >
                School
              </label>

              <select
                id="teacher-school"
                autoFocus
                required
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

          <div className="sm:col-span-2">
            <label
              htmlFor="teacher-user"
              className="field-label"
            >
              Teacher User Account
            </label>

            <select
              id="teacher-user"
              required
              disabled={
                !effectiveSchoolId ||
                loadingUsers
              }
              className="field-select"
              value={
                form.userId
              }
              onChange={updateField(
                "userId"
              )}
            >
              <option value="">
                {loadingUsers
                  ? "Loading teacher accounts..."
                  : !effectiveSchoolId
                    ? "Select school first"
                    : availableUsers.length ===
                        0
                      ? "No available teacher accounts"
                      : "Select teacher account"}
              </option>

              {availableUsers.map(
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

          {selectedUser && (
            <div className="sm:col-span-2">
              <div className="grid gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 sm:col-span-2">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-700 shadow-sm">
                    {selectedUser.name
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

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {
                        selectedUser.name
                      }
                    </p>

                    <p className="truncate text-xs text-slate-500">
                      Linked User Account
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                  <Mail
                    size={14}
                    className="shrink-0 text-slate-400"
                  />

                  <span className="truncate">
                    {
                      selectedUser.email
                    }
                  </span>
                </div>

                <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                  <Phone
                    size={14}
                    className="shrink-0 text-slate-400"
                  />

                  <span className="truncate">
                    {selectedUser.phone ||
                      "No phone"}
                  </span>
                </div>

                <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                  <Building2
                    size={14}
                    className="shrink-0 text-slate-400"
                  />

                  <span className="truncate">
                    {selectedUser
                      .schoolId
                      ?.schoolName ||
                      "School"}
                  </span>
                </div>

                <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                  <UserRound
                    size={14}
                    className="shrink-0 text-slate-400"
                  />

                  <span className="truncate">
                    Teacher Account
                  </span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="teacher-father-name"
              className="field-label"
            >
              Father Name
            </label>

            <input
              id="teacher-father-name"
              className="field-input"
              value={
                form.fatherName
              }
              onChange={updateField(
                "fatherName"
              )}
              placeholder="Enter father name"
              maxLength={100}
            />
          </div>

          <div>
            <label
              htmlFor="teacher-cnic"
              className="field-label"
            >
              CNIC
            </label>

            <input
              id="teacher-cnic"
              className="field-input"
              value={form.cnic}
              onChange={updateField(
                "cnic"
              )}
              placeholder="xxxxx-xxxxxxx-x"
              maxLength={30}
            />
          </div>

          <div>
            <label
              htmlFor="teacher-gender"
              className="field-label"
            >
              Gender
            </label>

            <select
              id="teacher-gender"
              required
              className="field-select"
              value={
                form.gender
              }
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
              htmlFor="teacher-dob"
              className="field-label"
            >
              Date of Birth
            </label>

            <input
              id="teacher-dob"
              type="date"
              className="field-input"
              value={
                form.dateOfBirth
              }
              onChange={updateField(
                "dateOfBirth"
              )}
              max={today()}
            />
          </div>

          <div>
            <label
              htmlFor="teacher-qualification"
              className="field-label"
            >
              Qualification
            </label>

            <input
              id="teacher-qualification"
              required
              className="field-input"
              value={
                form.qualification
              }
              onChange={updateField(
                "qualification"
              )}
              placeholder="e.g. M.Sc Mathematics"
              maxLength={150}
            />
          </div>

          <div>
            <label
              htmlFor="teacher-subjects"
              className="field-label"
            >
              Subjects
            </label>

            <input
              id="teacher-subjects"
              className="field-input"
              value={
                form.subjects
              }
              onChange={updateField(
                "subjects"
              )}
              placeholder="Math, Physics, Chemistry"
            />
          </div>

          <div>
            <label
              htmlFor="teacher-salary"
              className="field-label"
            >
              Monthly Salary
            </label>

            <input
              id="teacher-salary"
              type="number"
              min="0"
              step="1"
              className="field-input"
              value={
                form.salary
              }
              onChange={updateField(
                "salary"
              )}
              placeholder="0"
            />
          </div>

          <div>
            <label
              htmlFor="teacher-joining-date"
              className="field-label"
            >
              Joining Date
            </label>

            <input
              id="teacher-joining-date"
              type="date"
              required
              className="field-input"
              value={
                form.joiningDate
              }
              onChange={updateField(
                "joiningDate"
              )}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="teacher-status"
              className="field-label"
            >
              Employment Status
            </label>

            <select
              id="teacher-status"
              className="field-select"
              value={
                form.status
              }
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

              <option value="resigned">
                Resigned
              </option>
            </select>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary"
            disabled={saving}
            onClick={
              handleClose
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={
              saving ||
              loadingUsers
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
              : "Create Teacher"}
          </button>
        </div>
      </form>
    </Modal>
  );
};