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
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Edit3,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound
} from "lucide-react";

import {
  deleteTeacher,
  getTeacherById,
  updateTeacher
} from "../../api/teachers";

import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
  resigned: "Resigned"
};

const statusTones = {
  active: "success",
  inactive: "danger",
  resigned: "warning"
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

const formatSalary = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0
  }).format(
    Number.isFinite(amount)
      ? amount
      : 0
  );
};

const getTeacherName = (teacher) =>
  teacher?.userId?.name ||
  teacher?.name ||
  "Teacher";

const getTeacherEmail = (teacher) =>
  teacher?.userId?.email ||
  teacher?.email ||
  "";

const getTeacherPhone = (teacher) =>
  teacher?.userId?.phone ||
  teacher?.phone ||
  "";

const getTeacherAddress = (teacher) =>
  teacher?.userId?.address ||
  teacher?.address ||
  "";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "T";

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

const TeacherDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user: currentUser } = useAuth();

  const canManage = [
    "super_admin",
    "principal"
  ].includes(currentUser?.role);

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  const [
    actionLoading,
    setActionLoading
  ] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [form, setForm] = useState({
    fatherName: "",
    cnic: "",
    gender: "",
    dateOfBirth: "",
    qualification: "",
    subjects: "",
    salary: "",
    joiningDate: "",
    status: "active"
  });

  const teacherName = useMemo(
    () => getTeacherName(teacher),
    [teacher]
  );

  const loadTeacher = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } =
        await getTeacherById(id);

      setTeacher(
        data?.teacher || null
      );
    } catch (requestError) {
      setTeacher(null);

      setError(
        requestError.response?.data?.message ||
          "Teacher details could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeacher();

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

  const openEditModal = () => {
    setForm({
      fatherName:
        teacher?.fatherName || "",

      cnic:
        teacher?.cnic || "",

      gender:
        teacher?.gender || "",

      dateOfBirth:
        toDateInputValue(
          teacher?.dateOfBirth
        ),

      qualification:
        teacher?.qualification || "",

      subjects:
        (teacher?.subjects || []).join(", "),

      salary:
        teacher?.salary ?? "",

      joiningDate:
        toDateInputValue(
          teacher?.joiningDate
        ),

      status:
        teacher?.status || "active"
    });

    setError("");
    setEditOpen(true);
  };

  const updateField = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value
    }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.gender) {
      setError("Please select gender.");
      return;
    }

    if (
      form.qualification
        .trim()
        .length < 2
    ) {
      setError("Qualification is required.");
      return;
    }

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
      fatherName:
        form.fatherName.trim(),

      cnic:
        form.cnic.trim(),

      gender:
        form.gender,

      dateOfBirth:
        form.dateOfBirth || null,

      qualification:
        form.qualification.trim(),

      subjects: [
        ...new Set(
          form.subjects
            .split(",")
            .map((subject) =>
              subject.trim()
            )
            .filter(Boolean)
        )
      ],

      salary,

      joiningDate:
        form.joiningDate,

      status:
        form.status
    };

    setActionLoading(true);

    try {
      const { data } =
        await updateTeacher(
          teacher._id,
          payload
        );

      setTeacher(
        data?.teacher || teacher
      );

      setEditOpen(false);

      setSuccess(
        data?.message ||
          "Teacher updated successfully."
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Teacher could not be updated."
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
        await deleteTeacher(
          teacher._id
        );

      navigate("/teachers", {
        replace: true,

        state: {
          success:
            data?.message ||
            "Teacher deleted successfully."
        }
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Teacher could not be deleted."
      );

      setActionLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Teacher Details"
        action={
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              navigate("/teachers")
            }
          >
            <ArrowLeft size={16} />
            Back to Teachers
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
            Loading teacher...
          </span>
        </div>
      ) : !teacher ? (
        <div className="card flex min-h-64 flex-col items-center justify-center p-6">
          <UserRound
            size={34}
            className="text-slate-300"
          />

          <p className="mt-3 font-semibold text-slate-700">
            Teacher not found
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-700">
                  {getInitials(teacherName)}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-bold text-slate-900">
                      {teacherName}
                    </h1>

                    <Badge
                      tone={
                        statusTones[teacher.status] ||
                        "neutral"
                      }
                    >
                      {statusLabels[teacher.status] ||
                        teacher.status}
                    </Badge>
                  </div>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {getTeacherEmail(teacher)}
                  </p>

                  <p className="mt-2 text-xs font-bold text-brand-700">
                    {teacher.employeeId}
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
              Contact Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                icon={Mail}
                label="Email"
                value={getTeacherEmail(teacher)}
              />

              <DetailItem
                icon={Phone}
                label="Phone"
                value={getTeacherPhone(teacher)}
              />

              <DetailItem
                icon={Building2}
                label="School"
                value={
                  teacher.schoolId?.schoolName
                }
              />

              <DetailItem
                icon={MapPin}
                label="Address"
                value={getTeacherAddress(teacher)}
              />

              <DetailItem
                icon={UserRound}
                label="Father Name"
                value={teacher.fatherName}
              />

              <DetailItem
                icon={CreditCard}
                label="CNIC"
                value={teacher.cnic}
              />
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Employment Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                icon={GraduationCap}
                label="Qualification"
                value={teacher.qualification}
              />

              <DetailItem
                icon={BookOpen}
                label="Subjects"
                value={
                  (teacher.subjects || []).join(", ")
                }
              />

              <DetailItem
                icon={CircleDollarSign}
                label="Monthly Salary"
                value={formatSalary(teacher.salary)}
              />

              <DetailItem
                icon={CalendarDays}
                label="Joining Date"
                value={formatDate(
                  teacher.joiningDate
                )}
              />

              <DetailItem
                icon={UserRound}
                label="Gender"
                value={
                  genderLabels[teacher.gender] ||
                  teacher.gender
                }
              />

              <DetailItem
                icon={CalendarDays}
                label="Date of Birth"
                value={formatDate(
                  teacher.dateOfBirth
                )}
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
                  teacher.createdAt,
                  true
                )}
              />

              <DetailItem
                icon={CalendarDays}
                label="Updated At"
                value={formatDate(
                  teacher.updatedAt,
                  true
                )}
              />

              <DetailItem
                icon={ShieldCheck}
                label="Status"
                value={
                  statusLabels[teacher.status] ||
                  teacher.status
                }
              />

              <DetailItem
                icon={UserRound}
                label="Created By"
                value={teacher.createdBy?.name}
              />

              <DetailItem
                icon={UserRound}
                label="Updated By"
                value={teacher.updatedBy?.name}
              />

              <DetailItem
                icon={ShieldCheck}
                label="Linked Account"
                value={
                  teacher.userId?.isActive
                    ? "Active"
                    : "Inactive"
                }
              />
            </div>
          </section>
        </div>
      )}

      <Modal
        open={editOpen}
        onClose={() => {
          if (!actionLoading) {
            setEditOpen(false);
            setError("");
          }
        }}
        title="Edit Teacher"
        width="max-w-3xl"
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

          <div className="grid gap-4 sm:grid-cols-2">
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
                CNIC
              </label>

              <input
                className="field-input"
                value={form.cnic}
                onChange={updateField("cnic")}
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
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
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
                Qualification
              </label>

              <input
                className="field-input"
                value={form.qualification}
                onChange={updateField("qualification")}
              />
            </div>

            <div>
              <label className="field-label">
                Subjects
              </label>

              <input
                className="field-input"
                value={form.subjects}
                onChange={updateField("subjects")}
                placeholder="Math, Physics"
              />
            </div>

            <div>
              <label className="field-label">
                Monthly Salary
              </label>

              <input
                type="number"
                min="0"
                className="field-input"
                value={form.salary}
                onChange={updateField("salary")}
              />
            </div>

            <div>
              <label className="field-label">
                Joining Date
              </label>

              <input
                type="date"
                className="field-input"
                value={form.joiningDate}
                onChange={updateField("joiningDate")}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">
                Employment Status
              </label>

              <select
                className="field-select"
                value={form.status}
                onChange={updateField("status")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="resigned">Resigned</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Name, email, phone and address are managed from the linked
            User account.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={actionLoading}
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
              disabled={actionLoading}
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
        onClose={() => {
          if (!actionLoading) {
            setDeleteOpen(false);
            setError("");
          }
        }}
        title="Delete Teacher"
        width="max-w-md"
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <p className="text-sm leading-6 text-slate-600">
            Delete <strong>{teacherName}</strong> from the Teachers
            module?
          </p>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            This is a soft delete. The teacher can be restored later.
            The linked User account will remain available.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={actionLoading}
              onClick={() => {
                setDeleteOpen(false);
                setError("");
              }}
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
                : "Delete Teacher"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeacherDetails;