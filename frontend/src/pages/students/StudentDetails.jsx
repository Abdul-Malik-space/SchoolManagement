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
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Edit3,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
  Users
} from "lucide-react";

import {
  deleteStudent,
  getAvailableStudentUsers,
  getStudentById,
  updateStudent
} from "../../api/students";

import { getClasses } from "../../api/classes";
import { useAuth } from "../../context/AuthContext";

import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
  transferred: "Transferred",
  passed_out: "Passed Out"
};

const statusTones = {
  active: "success",
  inactive: "danger",
  transferred: "warning",
  passed_out: "info"
};

const genderLabels = {
  male: "Male",
  female: "Female",
  other: "Other"
};

const formatDate = (
  value,
  withTime = false
) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime
      ? {
          hour: "2-digit",
          minute: "2-digit"
        }
      : {})
  }).format(date);
};

const toDateInputValue = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date
    .toISOString()
    .split("T")[0];
};

const getStudentName = (student) =>
  student?.studentUserId?.name ||
  student?.name ||
  "Student";

const getStudentEmail = (student) =>
  student?.studentUserId?.email || "";

const getStudentPhone = (student) =>
  student?.studentUserId?.phone ||
  student?.contactNumber ||
  "";

const getStudentAddress = (student) =>
  student?.studentUserId?.address ||
  student?.address ||
  "";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "S";

const DetailItem = ({
  icon: Icon,
  label,
  value
}) => (
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
          {value || "Not available"}
        </p>
      </div>
    </div>
  </div>
);

const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user: currentUser } = useAuth();

  const isSuperAdmin =
    currentUser?.role === "super_admin";

  const canManage = [
    "super_admin",
    "principal"
  ].includes(currentUser?.role);

  const [student, setStudent] = useState(null);
  const [classes, setClasses] = useState([]);
  const [parentUsers, setParentUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingFormData, setLoadingFormData] =
    useState(false);
  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [form, setForm] = useState({
    classId: "",
    sectionId: "",
    parentUserIds: [],
    fatherName: "",
    bForm: "",
    dateOfBirth: "",
    gender: "",
    guardianName: "",
    guardianContact: "",
    admissionDate: "",
    status: "active"
  });

  const studentName = useMemo(
    () => getStudentName(student),
    [student]
  );

  const selectedClass = useMemo(
    () =>
      classes.find(
        (classItem) =>
          classItem._id === form.classId
      ),
    [classes, form.classId]
  );

  const sections =
    selectedClass?.sections || [];

  const loadStudent = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } =
        await getStudentById(id);

      setStudent(data?.student || null);
    } catch (requestError) {
      setStudent(null);

      setError(
        requestError.response?.data?.message ||
          "Student details could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudent();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!success) return undefined;

    const timer = window.setTimeout(() => {
      setSuccess("");
    }, 4000);

    return () =>
      window.clearTimeout(timer);
  }, [success]);

  const loadEditFormData = async () => {
    const schoolId =
      student?.schoolId?._id ||
      student?.schoolId;

    if (!schoolId) {
      setError(
        "Student school information is missing."
      );
      return false;
    }

    setLoadingFormData(true);
    setError("");

    try {
      const commonParams = isSuperAdmin
        ? {
            schoolId
          }
        : {};

      const [
        classesResponse,
        parentsResponse
      ] = await Promise.all([
        getClasses({
          ...commonParams,
          isActive: true
        }),

        getAvailableStudentUsers({
          ...commonParams,
          role: "parent"
        })
      ]);

      setClasses(
        classesResponse.data?.classes || []
      );

      setParentUsers(
        parentsResponse.data?.users || []
      );

      return true;
    } catch (requestError) {
      setClasses([]);
      setParentUsers([]);

      setError(
        requestError.response?.data?.message ||
          "Student form data could not be loaded."
      );

      return false;
    } finally {
      setLoadingFormData(false);
    }
  };

  const openEditModal = async () => {
    setForm({
      classId:
        student?.classId?._id ||
        student?.classId ||
        "",

      sectionId:
        student?.sectionId || "",

      parentUserIds:
        (student?.parentUserIds || []).map(
          (parent) =>
            parent?._id || parent
        ),

      fatherName:
        student?.fatherName || "",

      bForm:
        student?.bForm || "",

      dateOfBirth:
        toDateInputValue(
          student?.dateOfBirth
        ),

      gender:
        student?.gender || "",

      guardianName:
        student?.guardianName || "",

      guardianContact:
        student?.guardianContact || "",

      admissionDate:
        toDateInputValue(
          student?.admissionDate
        ),

      status:
        student?.status || "active"
    });

    setError("");
    setEditOpen(true);

    await loadEditFormData();
  };

  const updateField = (field) => (event) => {
    const value = event.target.value;

    setForm((current) => {
      const nextForm = {
        ...current,
        [field]: value
      };

      if (field === "classId") {
        nextForm.sectionId = "";
      }

      return nextForm;
    });
  };

  const toggleParent = (parentId) => {
    setForm((current) => {
      const isSelected =
        current.parentUserIds.includes(
          parentId
        );

      return {
        ...current,

        parentUserIds: isSelected
          ? current.parentUserIds.filter(
              (idValue) =>
                idValue !== parentId
            )
          : [
              ...current.parentUserIds,
              parentId
            ]
      };
    });
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.classId) {
      setError("Please select a class.");
      return;
    }

    if (!form.sectionId) {
      setError("Please select a section.");
      return;
    }

    if (
      form.fatherName.trim().length < 2
    ) {
      setError("Father name is required.");
      return;
    }

    if (!form.gender) {
      setError("Please select gender.");
      return;
    }

    const payload = {
      classId: form.classId,
      sectionId: form.sectionId,
      parentUserIds: form.parentUserIds,

      fatherName:
        form.fatherName.trim(),

      bForm:
        form.bForm.trim(),

      dateOfBirth:
        form.dateOfBirth || null,

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

    setActionLoading(true);

    try {
      const { data } =
        await updateStudent(
          student._id,
          payload
        );

      setStudent(
        data?.student || student
      );

      setEditOpen(false);

      setSuccess(
        data?.message ||
          "Student updated successfully."
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Student could not be updated."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    setError("");

    try {
      const { data } =
        await deleteStudent(student._id);

      navigate("/students", {
        replace: true,

        state: {
          success:
            data?.message ||
            "Student deleted successfully."
        }
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Student could not be deleted."
      );

      setActionLoading(false);
    }
  };

  const closeEditModal = () => {
    if (actionLoading) return;

    setEditOpen(false);
    setError("");
  };

  const closeDeleteModal = () => {
    if (actionLoading) return;

    setDeleteOpen(false);
    setError("");
  };

  return (
    <div>
      <PageHeader
        title="Student Details"
        action={
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              navigate("/students")
            }
          >
            <ArrowLeft size={16} />
            Back to Students
          </button>
        }
      />

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {error &&
        !editOpen &&
        !deleteOpen && (
          <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

      {loading ? (
        <div className="card flex min-h-64 items-center justify-center">
          <span className="text-sm text-slate-400">
            Loading student...
          </span>
        </div>
      ) : !student ? (
        <div className="card flex min-h-64 flex-col items-center justify-center p-6">
          <GraduationCap
            size={34}
            className="text-slate-300"
          />

          <p className="mt-3 font-semibold text-slate-700">
            Student not found
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-700">
                  {getInitials(studentName)}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-bold text-slate-900">
                      {studentName}
                    </h1>

                    <Badge
                      tone={
                        statusTones[student.status] ||
                        "neutral"
                      }
                    >
                      {statusLabels[student.status] ||
                        student.status}
                    </Badge>
                  </div>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {getStudentEmail(student)}
                  </p>

                  <p className="mt-2 text-xs font-bold text-brand-700">
                    {student.admissionNumber}
                  </p>
                </div>
              </div>

              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={openEditModal}
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    onClick={() => {
                      setError("");
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Student Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                icon={Mail}
                label="Email"
                value={getStudentEmail(student)}
              />

              <DetailItem
                icon={Phone}
                label="Contact Number"
                value={getStudentPhone(student)}
              />

              <DetailItem
                icon={MapPin}
                label="Address"
                value={getStudentAddress(student)}
              />

              <DetailItem
                icon={UserRound}
                label="Father Name"
                value={student.fatherName}
              />

              <DetailItem
                icon={CreditCard}
                label="B-Form"
                value={student.bForm}
              />

              <DetailItem
                icon={UserRound}
                label="Gender"
                value={
                  genderLabels[student.gender] ||
                  student.gender
                }
              />

              <DetailItem
                icon={CalendarDays}
                label="Date of Birth"
                value={formatDate(
                  student.dateOfBirth
                )}
              />

              <DetailItem
                icon={CalendarDays}
                label="Admission Date"
                value={formatDate(
                  student.admissionDate
                )}
              />

              <DetailItem
                icon={ShieldCheck}
                label="Linked Account"
                value={
                  student.studentUserId?.isActive
                    ? "Active"
                    : "Inactive"
                }
              />
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Academic Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                icon={Building2}
                label="School"
                value={
                  student.schoolId?.schoolName
                }
              />

              <DetailItem
                icon={GraduationCap}
                label="Class"
                value={
                  student.classId?.className
                }
              />

              <DetailItem
                icon={GraduationCap}
                label="Section"
                value={student.sectionName}
              />

              <DetailItem
                icon={CreditCard}
                label="Admission Number"
                value={
                  student.admissionNumber
                }
              />

              <DetailItem
                icon={ShieldCheck}
                label="Student Status"
                value={
                  statusLabels[student.status] ||
                  student.status
                }
              />
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Guardian and Parent Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                icon={UserRound}
                label="Guardian Name"
                value={student.guardianName}
              />

              <DetailItem
                icon={Phone}
                label="Guardian Contact"
                value={student.guardianContact}
              />

              <DetailItem
                icon={Users}
                label="Linked Parents"
                value={
                  student.parentUserIds?.length
                    ? student.parentUserIds
                        .map((parent) => parent.name)
                        .join(", ")
                    : "No linked parent account"
                }
              />
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              System Activity
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                icon={CalendarDays}
                label="Created At"
                value={formatDate(
                  student.createdAt,
                  true
                )}
              />

              <DetailItem
                icon={CalendarDays}
                label="Updated At"
                value={formatDate(
                  student.updatedAt,
                  true
                )}
              />

              <DetailItem
                icon={UserRound}
                label="Created By"
                value={student.createdBy?.name}
              />

              <DetailItem
                icon={UserRound}
                label="Updated By"
                value={student.updatedBy?.name}
              />
            </div>
          </section>
        </div>
      )}

      <Modal
        open={editOpen}
        onClose={closeEditModal}
        title="Edit Student"
        width="max-w-4xl"
      >
        <form
          onSubmit={handleUpdate}
          className="space-y-5"
          noValidate
        >
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loadingFormData ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Loading form data...
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">
                    Class
                  </label>

                  <select
                    className="field-select"
                    value={form.classId}
                    onChange={updateField("classId")}
                  >
                    <option value="">
                      Select class
                    </option>

                    {classes.map((classItem) => (
                      <option
                        key={classItem._id}
                        value={classItem._id}
                      >
                        {classItem.className}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">
                    Section
                  </label>

                  <select
                    className="field-select"
                    value={form.sectionId}
                    disabled={!form.classId}
                    onChange={updateField("sectionId")}
                  >
                    <option value="">
                      Select section
                    </option>

                    {sections.map((section) => (
                      <option
                        key={section._id}
                        value={section._id}
                      >
                        {section.sectionName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">
                    Father Name
                  </label>

                  <input
                    className="field-input"
                    value={form.fatherName}
                    onChange={updateField("fatherName")}
                  />
                </div>

                <div>
                  <label className="field-label">
                    B-Form
                  </label>

                  <input
                    className="field-input"
                    value={form.bForm}
                    onChange={updateField("bForm")}
                  />
                </div>

                <div>
                  <label className="field-label">
                    Gender
                  </label>

                  <select
                    className="field-select"
                    value={form.gender}
                    onChange={updateField("gender")}
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
                  <label className="field-label">
                    Date of Birth
                  </label>

                  <input
                    type="date"
                    className="field-input"
                    value={form.dateOfBirth}
                    onChange={updateField("dateOfBirth")}
                  />
                </div>

                <div>
                  <label className="field-label">
                    Admission Date
                  </label>

                  <input
                    type="date"
                    className="field-input"
                    value={form.admissionDate}
                    onChange={updateField("admissionDate")}
                  />
                </div>

                <div>
                  <label className="field-label">
                    Student Status
                  </label>

                  <select
                    className="field-select"
                    value={form.status}
                    onChange={updateField("status")}
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
                  <label className="field-label">
                    Guardian Name
                  </label>

                  <input
                    className="field-input"
                    value={form.guardianName}
                    onChange={updateField("guardianName")}
                  />
                </div>

                <div>
                  <label className="field-label">
                    Guardian Contact
                  </label>

                  <input
                    className="field-input"
                    value={form.guardianContact}
                    onChange={updateField("guardianContact")}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="field-label">
                    Parent Accounts
                  </label>

                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                    {parentUsers.length === 0 ? (
                      <p className="py-5 text-center text-sm text-slate-400">
                        No active parent accounts available
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {parentUsers.map((parent) => {
                          const checked =
                            form.parentUserIds.includes(
                              parent._id
                            );

                          return (
                            <label
                              key={parent._id}
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                                checked
                                  ? "border-brand-300 bg-brand-50"
                                  : "border-slate-100 bg-white hover:border-slate-200"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                onChange={() =>
                                  toggleParent(parent._id)
                                }
                              />

                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-slate-700">
                                  {parent.name}
                                </span>

                                <span className="block truncate text-xs text-slate-500">
                                  {parent.email}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Name, email, phone, address and photo are managed from
                the linked User account.
              </div>
            </>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={actionLoading}
              onClick={closeEditModal}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={
                actionLoading ||
                loadingFormData
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

      <Modal
        open={deleteOpen}
        onClose={closeDeleteModal}
        title="Delete Student"
        width="max-w-md"
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <p className="text-sm leading-6 text-slate-600">
            Delete <strong>{studentName}</strong> from the Students
            module?
          </p>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            This is a soft delete. The student can be restored later.
            Linked User and Parent accounts will remain available.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={actionLoading}
              onClick={closeDeleteModal}
            >
              Cancel
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={actionLoading}
              onClick={handleDelete}
            >
              {actionLoading && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {actionLoading
                ? "Deleting..."
                : "Delete Student"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentDetails;
