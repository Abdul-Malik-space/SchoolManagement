import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, WandSparkles } from "lucide-react";
import { createUser } from "../../api/users";
import { Modal } from "../../components/ui/Modal";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  password: "",
  role: "teacher",
  schoolId: "",
  isActive: true
};

const allRoleOptions = [
  { value: "principal", label: "Principal" },
  { value: "teacher", label: "Teacher" },
  { value: "accountant", label: "Accountant" },
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" }
];

const principalRoleOptions = allRoleOptions.filter(
  (option) => option.value !== "principal"
);

const generateTemporaryPassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "@#$!";
  const pool = `${upper}${lower}${numbers}${symbols}`;
  const required = [upper, lower, numbers, symbols].map((characters) => {
    const random = new Uint32Array(1);
    window.crypto.getRandomValues(random);
    return characters[random[0] % characters.length];
  });

  const remaining = Array.from({ length: 8 }, () => {
    const random = new Uint32Array(1);
    window.crypto.getRandomValues(random);
    return pool[random[0] % pool.length];
  });

  return [...required, ...remaining]
    .sort(() => Math.random() - 0.5)
    .join("");
};

export const UserFormModal = ({
  open,
  onClose,
  onSaved,
  schools = [],
  currentUser
}) => {
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isSuperAdmin = currentUser?.role === "super_admin";

  const roleOptions = useMemo(
    () => (isSuperAdmin ? allRoleOptions : principalRoleOptions),
    [isSuperAdmin]
  );

  useEffect(() => {
    if (!open) return;

    setForm({
      ...emptyForm,
      role: isSuperAdmin ? "principal" : "teacher",
      schoolId: isSuperAdmin ? "" : currentUser?.schoolId?._id || currentUser?.schoolId || ""
    });
    setShowPassword(false);
    setSaving(false);
    setError("");
  }, [open, isSuperAdmin, currentUser]);

  const updateField = (field) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      password: form.password,
      role: form.role,
      isActive: form.isActive
    };

    if (isSuperAdmin) {
      payload.schoolId = form.schoolId;
    }

    if (payload.name.length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    if (!payload.email) {
      setError("Email is required.");
      return;
    }

    if (payload.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (isSuperAdmin && !payload.schoolId) {
      setError("Please select a school.");
      return;
    }

    setSaving(true);

    try {
      const { data } = await createUser(payload);
      onSaved?.(data?.user, data?.message || "User created successfully.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "User account could not be created."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create User"
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="user-name">
              Full Name
            </label>
            <input
              id="user-name"
              autoFocus
              required
              className="field-input"
              value={form.name}
              onChange={updateField("name")}
              placeholder="Enter full name"
              maxLength={100}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="user-email">
              Email Address
            </label>
            <input
              id="user-email"
              required
              type="email"
              autoComplete="off"
              className="field-input"
              value={form.email}
              onChange={updateField("email")}
              placeholder="name@example.com"
              maxLength={150}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="user-phone">
              Phone
            </label>
            <input
              id="user-phone"
              type="tel"
              className="field-input"
              value={form.phone}
              onChange={updateField("phone")}
              placeholder="03xx-xxxxxxx"
              maxLength={30}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="user-role">
              Role
            </label>
            <select
              id="user-role"
              required
              className="field-select"
              value={form.role}
              onChange={updateField("role")}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {isSuperAdmin && (
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="user-school">
                School
              </label>
              <select
                id="user-school"
                required
                className="field-select"
                value={form.schoolId}
                onChange={updateField("schoolId")}
              >
                <option value="">Select school</option>
                {schools.map((school) => (
                  <option key={school._id} value={school._id}>
                    {school.schoolName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="user-address">
              Address
            </label>
            <textarea
              id="user-address"
              className="field-input min-h-24 resize-y"
              value={form.address}
              onChange={updateField("address")}
              placeholder="Enter address"
              maxLength={500}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="user-password">
              Temporary Password
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <input
                  id="user-password"
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="field-input pr-11"
                  value={form.password}
                  onChange={updateField("password")}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={() => {
                  setForm((current) => ({
                    ...current,
                    password: generateTemporaryPassword()
                  }));
                  setShowPassword(true);
                }}
              >
                <WandSparkles size={16} />
                Generate
              </button>
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
          <div>
            <span className="block text-sm font-semibold text-slate-700">
              Active Account
            </span>
          </div>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={updateField("isActive")}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
        </label>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
