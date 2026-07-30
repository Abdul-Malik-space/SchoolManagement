import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  BadgeCheck,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  CircleUserRound,
  Edit3,
  KeyRound,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  RotateCcw,
  Save,
  School,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { updateProfileRequest } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  address: "",
  photo: ""
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to update your profile.";

const getInitials = (value) =>
  String(value || "Parent")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const titleCase = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatDate = (value, includeTime = false) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit"
        }
      : {})
  }).format(date);
};

const formatClass = (child) => {
  const className = child?.student?.class?.className || "";
  const sectionName = child?.student?.sectionName || "";

  if (className && sectionName) {
    return `${className} · Section ${sectionName}`;
  }

  return className || sectionName || "Class not assigned";
};

const normalizeForm = (profile) => ({
  name: String(profile?.name || ""),
  email: String(profile?.email || ""),
  phone: String(profile?.phone || ""),
  address: String(profile?.address || ""),
  photo: String(profile?.photo || "")
});

const trimForm = (form) => ({
  name: form.name.trim(),
  email: form.email.trim().toLowerCase(),
  phone: form.phone.trim(),
  address: form.address.trim(),
  photo: form.photo.trim()
});

const formsAreEqual = (first, second) => {
  const firstForm = trimForm(first);
  const secondForm = trimForm(second);

  return Object.keys(EMPTY_FORM).every(
    (key) => firstForm[key] === secondForm[key]
  );
};

const validateForm = (form) => {
  const errors = {};
  const normalized = trimForm(form);

  if (!normalized.name) {
    errors.name = "Name is required.";
  } else if (normalized.name.length < 2) {
    errors.name = "Name must contain at least 2 characters.";
  } else if (normalized.name.length > 100) {
    errors.name = "Name cannot exceed 100 characters.";
  }

  if (!normalized.email) {
    errors.email = "Email address is required.";
  } else if (!EMAIL_PATTERN.test(normalized.email)) {
    errors.email = "Enter a valid email address.";
  } else if (normalized.email.length > 150) {
    errors.email = "Email cannot exceed 150 characters.";
  }

  if (normalized.phone.length > 30) {
    errors.phone = "Phone number cannot exceed 30 characters.";
  }

  if (normalized.address.length > 500) {
    errors.address = "Address cannot exceed 500 characters.";
  }

  if (normalized.photo.length > 2000) {
    errors.photo = "Photo URL is too long.";
  } else if (
    normalized.photo &&
    !/^https?:\/\//i.test(normalized.photo)
  ) {
    errors.photo = "Photo must use a valid http or https URL.";
  }

  return errors;
};

const FieldMessage = ({ error, helper }) => {
  if (error) {
    return (
      <p className="mt-1.5 text-xs font-semibold text-rose-600">
        {error}
      </p>
    );
  }

  return helper ? (
    <p className="mt-1.5 text-xs text-slate-400">
      {helper}
    </p>
  ) : null;
};

const InformationCard = ({
  title,
  value,
  helper,
  icon: Icon,
  tone = "brand"
}) => {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    emerald: "bg-emerald-50 text-emerald-700",
    cyan: "bg-cyan-50 text-cyan-700",
    amber: "bg-amber-50 text-amber-700"
  };

  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            tones[tone] || tones.brand
          }`}
        >
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>

          <p className="mt-2 truncate text-base font-black text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {helper}
          </p>
        </div>
      </div>
    </div>
  );
};

const ChildLinkCard = ({ child }) => {
  const student = child?.student || {};
  const link = child?.link || {};

  const verified =
    link.verificationStatus === "verified" ||
    link.source === "legacy_student_parent_link";

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 text-sm font-black text-brand-700">
          {student.photo ? (
            <img
              src={student.photo}
              alt={student.name || "Student"}
              className="h-full w-full object-cover"
            />
          ) : (
            getInitials(student.name || "Student")
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-black text-slate-900">
              {student.name || "Student"}
            </h4>

            {link.isPrimary && (
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-200">
                Primary
              </span>
            )}

            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                <BadgeCheck size={11} />
                Verified
              </span>
            )}
          </div>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {formatClass(child)}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Admission No: {student.admissionNumber || "Not assigned"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Relationship
          </p>

          <p className="mt-1 truncate text-xs font-bold text-slate-700">
            {link.relationshipLabel ||
              titleCase(link.relationship || "Guardian")}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Collection
          </p>

          <p className="mt-1 text-xs font-bold text-slate-700">
            {link.canCollectStudent ? "Authorized" : "Not authorized"}
          </p>
        </div>
      </div>
    </article>
  );
};

const ParentProfile = () => {
  const navigate = useNavigate();

  const {
    user,
    setUser
  } = useAuth();

  const {
    overview,
    children,
    refreshing,
    refreshOverview
  } = useOutletContext();

  const profile = useMemo(
    () => ({
      ...user,
      ...(overview?.parent || {}),

      address:
        user?.address ||
        overview?.parent?.address ||
        "",

      createdAt:
        user?.createdAt ||
        overview?.parent?.createdAt ||
        null,

      updatedAt:
        user?.updatedAt ||
        overview?.parent?.updatedAt ||
        null,

      lastLoginAt:
        user?.lastLoginAt ||
        overview?.parent?.lastLoginAt ||
        null,

      isActive:
        user?.isActive !== undefined
          ? user.isActive
          : true,

      role:
        user?.role ||
        "parent"
    }),
    [
      user,
      overview
    ]
  );

  const [
    form,
    setForm
  ] = useState(
    normalizeForm(profile)
  );

  const [
    initialForm,
    setInitialForm
  ] = useState(
    normalizeForm(profile)
  );

  const [
    errors,
    setErrors
  ] = useState({});

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    success,
    setSuccess
  ] = useState("");

  const [
    submitError,
    setSubmitError
  ] = useState("");

  const [
    photoFailed,
    setPhotoFailed
  ] = useState(false);

  useEffect(() => {
    const nextForm =
      normalizeForm(profile);

    setForm(nextForm);
    setInitialForm(nextForm);
    setErrors({});
    setPhotoFailed(false);
  }, [
    profile.id,
    profile._id,
    profile.name,
    profile.email,
    profile.phone,
    profile.address,
    profile.photo
  ]);

  const hasChanges =
    !formsAreEqual(
      form,
      initialForm
    );

  const completeFields = [
    form.name.trim(),
    form.email.trim(),
    form.phone.trim(),
    form.address.trim(),
    form.photo.trim()
  ].filter(Boolean).length;

  const completeness =
    Math.round(
      (completeFields / 5) *
        100
    );

  const primaryChildren =
    children.filter(
      (child) =>
        child?.link?.isPrimary
    ).length;

  const emergencyChildren =
    children.filter(
      (child) =>
        child?.link?.isEmergencyContact
    ).length;

  const schoolName =
    overview?.school?.schoolName ||
    user?.schoolId?.schoolName ||
    "School not available";

  const schoolType =
    overview?.school?.type ||
    user?.schoolId?.type ||
    "";

  const imageSource =
    form.photo.trim() ||
    profile.photo ||
    "";

  const updateField = (
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value
      })
    );

    setErrors(
      (current) => {
        if (!current[field]) {
          return current;
        }

        const nextErrors = {
          ...current
        };

        delete nextErrors[field];

        return nextErrors;
      }
    );

    setSuccess("");
    setSubmitError("");

    if (field === "photo") {
      setPhotoFailed(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setErrors({});
    setSuccess("");
    setSubmitError("");
    setPhotoFailed(false);
  };

  const saveProfile =
    async (event) => {
      event.preventDefault();

      if (
        saving ||
        !hasChanges
      ) {
        return;
      }

      const validationErrors =
        validateForm(form);

      setErrors(
        validationErrors
      );

      if (
        Object.keys(
          validationErrors
        ).length > 0
      ) {
        setSubmitError(
          "Please correct the highlighted profile fields."
        );

        return;
      }

      setSaving(true);
      setSubmitError("");
      setSuccess("");

      try {
        const payload =
          trimForm(form);

        const response =
          await updateProfileRequest(
            payload
          );

        const updatedUser =
          response?.data?.user ||
          response?.data?.data?.user ||
          null;

        const nextUser =
          updatedUser
            ? {
                ...user,
                ...updatedUser,

                schoolId:
                  typeof user?.schoolId ===
                    "object" &&
                  typeof updatedUser?.schoolId !==
                    "object"
                    ? user.schoolId
                    : updatedUser.schoolId ||
                      user?.schoolId
              }
            : {
                ...user,
                ...payload
              };

        setUser(nextUser);

        const nextForm =
          normalizeForm(
            nextUser
          );

        setForm(nextForm);
        setInitialForm(nextForm);

        setSuccess(
          response?.data?.message ||
          "Profile updated successfully."
        );

        await refreshOverview();
      } catch (requestError) {
        setSubmitError(
          getErrorMessage(
            requestError
          )
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[26px] bg-white/10 text-xl font-black ring-1 ring-white/15">
              {imageSource &&
              !photoFailed ? (
                <img
                  src={imageSource}
                  alt={
                    form.name ||
                    "Parent"
                  }
                  className="h-full w-full object-cover"
                  onError={() =>
                    setPhotoFailed(
                      true
                    )
                  }
                />
              ) : (
                getInitials(
                  form.name ||
                  profile.name
                )
              )}
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-200">
                <CircleUserRound size={13} />

                Parent Account
              </div>

              <h2 className="mt-3 truncate text-2xl font-black sm:text-3xl">
                {form.name ||
                  "Parent Profile"}
              </h2>

              <p className="mt-1 truncate text-sm text-slate-300">
                {form.email ||
                  "Email not available"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-300/20">
                  <BadgeCheck size={12} />

                  {profile.isActive
                    ? "Active Account"
                    : "Inactive Account"}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-200 ring-1 ring-white/15">
                  {titleCase(
                    profile.role
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[450px]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Profile Completion
              </p>

              <p className="mt-2 text-2xl font-black">
                {completeness}%
              </p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{
                    width:
                      `${completeness}%`
                  }}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Linked Children
              </p>

              <p className="mt-2 text-2xl font-black">
                {children.length}
              </p>

              <p className="mt-2 text-xs text-cyan-300">
                {primaryChildren} primary relationship
                {primaryChildren === 1
                  ? ""
                  : "s"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {success && (
        <section className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0 text-emerald-700"
          />

          <div>
            <p className="text-sm font-bold text-emerald-900">
              Profile saved
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-700">
              {success}
            </p>
          </div>
        </section>
      )}

      {submitError && (
        <section className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0 text-rose-600"
          />

          <div>
            <p className="text-sm font-bold text-rose-900">
              Profile could not be saved
            </p>

            <p className="mt-1 text-xs leading-5 text-rose-700">
              {submitError}
            </p>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InformationCard
          title="School"
          value={schoolName}
          helper={
            schoolType
              ? titleCase(
                  schoolType
                )
              : "Linked school account"
          }
          icon={School}
          tone="brand"
        />

        <InformationCard
          title="Phone"
          value={
            profile.phone ||
            "Not provided"
          }
          helper="Primary contact number"
          icon={Phone}
          tone="emerald"
        />

        <InformationCard
          title="Member Since"
          value={formatDate(
            profile.createdAt
          )}
          helper="Parent account creation date"
          icon={CalendarDays}
          tone="cyan"
        />

        <InformationCard
          title="Last Login"
          value={formatDate(
            profile.lastLoginAt,
            true
          )}
          helper="Most recent account access"
          icon={ShieldCheck}
          tone="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <form
          className="card overflow-hidden"
          onSubmit={saveProfile}
        >
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Edit3 size={20} />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  Personal Information
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Update the contact details used by the school.
                </p>
              </div>
            </div>

            {hasChanges && (
              <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200 sm:self-auto">
                <Sparkles size={12} />

                Unsaved changes
              </span>
            )}
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="parent-profile-name"
                  className="field-label"
                >
                  Full Name
                </label>

                <div className="relative mt-2">
                  <UserRound
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="parent-profile-name"
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateField(
                        "name",
                        event.target.value
                      )
                    }
                    className={`field-input pl-10 ${
                      errors.name
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                        : ""
                    }`}
                    placeholder="Enter your full name"
                    maxLength={100}
                  />
                </div>

                <FieldMessage
                  error={errors.name}
                  helper={`${form.name.length}/100 characters`}
                />
              </div>

              <div>
                <label
                  htmlFor="parent-profile-email"
                  className="field-label"
                >
                  Email Address
                </label>

                <div className="relative mt-2">
                  <Mail
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="parent-profile-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField(
                        "email",
                        event.target.value
                      )
                    }
                    className={`field-input pl-10 ${
                      errors.email
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                        : ""
                    }`}
                    placeholder="parent@example.com"
                    maxLength={150}
                    autoComplete="email"
                  />
                </div>

                <FieldMessage
                  error={errors.email}
                  helper="This email is used for login and school communication."
                />
              </div>

              <div>
                <label
                  htmlFor="parent-profile-phone"
                  className="field-label"
                >
                  Phone Number
                </label>

                <div className="relative mt-2">
                  <Phone
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="parent-profile-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value
                      )
                    }
                    className={`field-input pl-10 ${
                      errors.phone
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                        : ""
                    }`}
                    placeholder="+92 300 1234567"
                    maxLength={30}
                    autoComplete="tel"
                  />
                </div>

                <FieldMessage
                  error={errors.phone}
                  helper={`${form.phone.length}/30 characters`}
                />
              </div>

              <div>
                <label
                  htmlFor="parent-profile-photo"
                  className="field-label"
                >
                  Profile Photo URL
                </label>

                <div className="relative mt-2">
                  <Camera
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="parent-profile-photo"
                    type="url"
                    value={form.photo}
                    onChange={(event) =>
                      updateField(
                        "photo",
                        event.target.value
                      )
                    }
                    className={`field-input pl-10 ${
                      errors.photo
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                        : ""
                    }`}
                    placeholder="https://example.com/photo.jpg"
                    maxLength={2000}
                  />
                </div>

                <FieldMessage
                  error={errors.photo}
                  helper="Use a public HTTP or HTTPS image URL."
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="parent-profile-address"
                className="field-label"
              >
                Residential Address
              </label>

              <div className="relative mt-2">
                <MapPin
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-4 text-slate-400"
                />

                <textarea
                  id="parent-profile-address"
                  value={form.address}
                  onChange={(event) =>
                    updateField(
                      "address",
                      event.target.value
                    )
                  }
                  className={`field-input min-h-[120px] resize-y py-3 pl-10 ${
                    errors.address
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                      : ""
                  }`}
                  placeholder="Enter your complete residential address"
                  maxLength={500}
                />
              </div>

              <FieldMessage
                error={errors.address}
                helper={`${form.address.length}/500 characters`}
              />
            </div>

            {imageSource && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-sm font-black text-brand-700 ring-1 ring-slate-200">
                    {!photoFailed ? (
                      <img
                        src={imageSource}
                        alt="Profile preview"
                        className="h-full w-full object-cover"
                        onError={() =>
                          setPhotoFailed(
                            true
                          )
                        }
                      />
                    ) : (
                      getInitials(
                        form.name
                      )
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-800">
                      Photo Preview
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {photoFailed
                        ? "The image URL could not be loaded. Check that it is public and correct."
                        : "This is how your profile photo will appear in the parent portal."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-400">
                Changing your email will also change the email used to sign in.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={
                    saving ||
                    !hasChanges
                  }
                  onClick={resetForm}
                >
                  <RotateCcw size={16} />

                  Reset
                </button>

                <button
                  type="submit"
                  className="btn-primary min-w-[130px]"
                  disabled={
                    saving ||
                    !hasChanges
                  }
                >
                  {saving ? (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={16} />
                  )}

                  {saving
                    ? "Saving…"
                    : "Save Profile"}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="space-y-6">
          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Account Security
                  </h3>

                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Login and password settings
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Account Status
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {profile.isActive
                      ? "Active"
                      : "Inactive"}
                  </p>
                </div>

                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    profile.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {profile.isActive ? (
                    <Check size={17} />
                  ) : (
                    <AlertCircle size={17} />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Password Status
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {profile.mustChangePassword
                      ? "Change required"
                      : "Up to date"}
                  </p>
                </div>

                <KeyRound
                  size={18}
                  className={
                    profile.mustChangePassword
                      ? "text-amber-600"
                      : "text-brand-600"
                  }
                />
              </div>

              <button
                type="button"
                className="btn-primary w-full"
                onClick={() =>
                  navigate(
                    "/change-password"
                  )
                }
              >
                <KeyRound size={16} />

                Change Password
              </button>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Building2 size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    School Connection
                  </h3>

                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Institution linked to your family
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-2xl bg-slate-950 p-4 text-white">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                    <School size={20} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">
                      {schoolName}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {schoolType
                        ? titleCase(
                            schoolType
                          )
                        : "School / Madrasa"}
                    </p>

                    {overview?.school?.sessionYear && (
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                        Session{" "}
                        {overview.school.sessionYear}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    Children
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-800">
                    {children.length}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 px-3 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    Emergency Links
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-800">
                    {emergencyChildren}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-cyan-200 bg-cyan-50 p-5">
            <div className="flex items-start gap-3">
              <AtSign
                size={19}
                className="mt-0.5 shrink-0 text-cyan-700"
              />

              <div>
                <h3 className="text-sm font-black text-cyan-900">
                  Keep contact details current
                </h3>

                <p className="mt-2 text-xs leading-6 text-cyan-800">
                  The school may use your email, phone number and address for
                  important notices, attendance alerts and emergency contact.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
              Family Connections
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              Linked Children
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Relationship and verification information for your linked
              student accounts.
            </p>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              navigate(
                "/parent-portal/children"
              )
            }
          >
            View All Children

            <ArrowRight size={16} />
          </button>
        </div>

        {children.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {children.map((child) => (
              <ChildLinkCard
                key={
                  child?.student?.id
                }
                child={child}
              />
            ))}
          </div>
        ) : (
          <div className="card grid min-h-[280px] place-items-center p-8 text-center">
            <div>
              <UsersRound
                size={32}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 text-base font-black text-slate-800">
                No linked children
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Contact the school to link your child with this parent account.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <BadgeCheck size={22} />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Secure Parent Identity
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your account controls access to child profiles, attendance,
                fees, timetable, academics, notices and private messages.
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <RefreshCw
                size={22}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-slate-900">
                Refresh School Information
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Reload linked children, school details and current parent
                portal information.
              </p>

              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 transition hover:text-brand-800 disabled:opacity-50"
                disabled={refreshing}
                onClick={refreshOverview}
              >
                {refreshing
                  ? "Refreshing…"
                  : "Refresh Portal Data"}

                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ParentProfile;