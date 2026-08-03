import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  useNavigate,
  useOutletContext
} from "react-router-dom";

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleUserRound,
  Clipboard,
  ContactRound,
  Copy,
  Download,
  GraduationCap,
  Hash,
  Home,
  IdCard,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  RefreshCw,
  School,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound
} from "lucide-react";

import {
  getStudentPortalProfile
} from "../../api/studentPortal";

/*
|--------------------------------------------------------------------------
| Profile Helpers
|--------------------------------------------------------------------------
*/

const getErrorMessage = (
  error
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.response?.data
      ?.error ||
    error?.message ||
    "Unable to load the student profile."
  );
};

const formatDate = (
  value
) => {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return date.toLocaleDateString(
    "en-PK",
    {
      day:
        "numeric",

      month:
        "long",

      year:
        "numeric"
    }
  );
};

const formatClassName = (
  student
) => {
  const className =
    student?.class
      ?.className ||
    "";

  const sectionName =
    student?.sectionName ||
    "";

  if (
    className &&
    sectionName
  ) {
    return `${className} · ${sectionName}`;
  }

  return (
    className ||
    sectionName ||
    "Class not assigned"
  );
};

const formatGender = (
  value
) => {
  const gender =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  if (
    gender ===
    "male"
  ) {
    return "Male";
  }

  if (
    gender ===
    "female"
  ) {
    return "Female";
  }

  if (
    gender
  ) {
    return (
      gender
        .charAt(
          0
        )
        .toUpperCase() +
      gender.slice(
        1
      )
    );
  }

  return "Not available";
};

const formatStatus = (
  value
) => {
  const status =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  if (!status) {
    return "Unknown";
  }

  return status
    .split(
      "_"
    )
    .map(
      (
        part
      ) =>
        part
          .charAt(
            0
          )
          .toUpperCase() +
        part.slice(
          1
        )
    )
    .join(
      " "
    );
};

const getInitials = (
  value
) => {
  return String(
    value ||
    "Student"
  )
    .split(
      " "
    )
    .filter(
      Boolean
    )
    .map(
      (
        part
      ) =>
        part[0]
    )
    .slice(
      0,
      2
    )
    .join(
      ""
    )
    .toUpperCase();
};

const getStatusTone = (
  status
) => {
  const normalizedStatus =
    String(
      status || ""
    )
      .toLowerCase();

  if (
    normalizedStatus ===
    "active"
  ) {
    return {
      label:
        "Active Student",

      className:
        "bg-emerald-100 text-emerald-700 ring-emerald-200"
    };
  }

  if (
    normalizedStatus ===
    "inactive"
  ) {
    return {
      label:
        "Inactive Student",

      className:
        "bg-amber-100 text-amber-700 ring-amber-200"
    };
  }

  return {
    label:
      formatStatus(
        status
      ),

    className:
      "bg-slate-100 text-slate-700 ring-slate-200"
  };
};

const missingFieldLabels = {
  dateOfBirth:
    "Date of birth",

  contactNumber:
    "Student contact number",

  guardianContact:
    "Guardian contact number",

  address:
    "Residential address",

  photo:
    "Student photograph"
};

/*
|--------------------------------------------------------------------------
| Safe Clipboard
|--------------------------------------------------------------------------
*/

const copyText = async (
  value
) => {
  const text =
    String(
      value || ""
    );

  if (!text) {
    return false;
  }

  if (
    navigator?.clipboard &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(
      text
    );

    return true;
  }

  const textArea =
    document.createElement(
      "textarea"
    );

  textArea.value =
    text;

  textArea.style.position =
    "fixed";

  textArea.style.opacity =
    "0";

  document.body.appendChild(
    textArea
  );

  textArea.focus();
  textArea.select();

  const copied =
    document.execCommand(
      "copy"
    );

  document.body.removeChild(
    textArea
  );

  return copied;
};

/*
|--------------------------------------------------------------------------
| Student Avatar
|--------------------------------------------------------------------------
*/

const StudentAvatar = ({
  src,
  name,
  size =
    "h-24 w-24",
  className =
    ""
}) => {
  const [
    failed,
    setFailed
  ] = useState(false);

  useEffect(() => {
    setFailed(
      false
    );
  }, [
    src
  ]);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-cyan-600 text-xl font-black text-white shadow-lg ${size} ${className}`}
    >
      {src &&
      !failed ? (
        <img
          src={src}
          alt={name || "Student"}
          className="h-full w-full object-cover"
          onError={() =>
            setFailed(
              true
            )
          }
        />
      ) : (
        getInitials(
          name
        )
      )}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Detail Item
|--------------------------------------------------------------------------
*/

const DetailItem = ({
  icon: Icon,
  label,
  value,
  helper,
  copyValue
}) => {
  const [
    copied,
    setCopied
  ] = useState(false);

  const handleCopy =
    async () => {
      try {
        const success =
          await copyText(
            copyValue ??
            value
          );

        if (
          success
        ) {
          setCopied(
            true
          );

          window.setTimeout(
            () => {
              setCopied(
                false
              );
            },
            1600
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Profile copy error:",
          error
        );
      }
    };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
          <Icon
            size={18}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-bold text-slate-800">
            {value ||
              "Not available"}
          </p>

          {helper && (
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              {helper}
            </p>
          )}
        </div>

        {copyValue !==
          undefined &&
        value && (
          <button
            type="button"
            className={`rounded-xl p-2 transition ${
              copied
                ? "bg-emerald-100 text-emerald-700"
                : "text-slate-400 hover:bg-white hover:text-brand-700 hover:shadow-sm"
            }`}
            onClick={
              handleCopy
            }
            aria-label={`Copy ${label}`}
            title={`Copy ${label}`}
          >
            {copied ? (
              <Check
                size={15}
              />
            ) : (
              <Copy
                size={15}
              />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Section Card
|--------------------------------------------------------------------------
*/

const SectionCard = ({
  icon: Icon,
  title,
  subtitle,
  children,
  action
}) => {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Icon
              size={19}
            />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
};

/*
|--------------------------------------------------------------------------
| Profile Completion
|--------------------------------------------------------------------------
*/

const ProfileCompletionCard = ({
  completion,
  onCorrectionRequest
}) => {
  const percentage =
    Number(
      completion
        ?.percentage ||
      0
    );

  const missingFields =
    Array.isArray(
      completion
        ?.missingFields
    )
      ? completion.missingFields
      : [];

  const statusTone =
    percentage >= 90
      ? {
          badge:
            "bg-emerald-100 text-emerald-700",

          ring:
            "rgb(16 185 129)"
        }
      : percentage >= 70
        ? {
            badge:
              "bg-amber-100 text-amber-700",

            ring:
              "rgb(245 158 11)"
          }
        : {
            badge:
              "bg-rose-100 text-rose-700",

            ring:
              "rgb(244 63 94)"
          };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">
            Profile Completion
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            A complete profile helps the school maintain accurate records.
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <Sparkles
            size={18}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <div
          className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${statusTone.ring} ${Math.min(
              Math.max(
                percentage,
                0
              ),
              100
            )}%, rgb(226 232 240) 0)`
          }}
        >
          <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white">
            <div className="text-center">
              <p className="text-2xl font-black text-slate-900">
                {percentage}%
              </p>

              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Complete
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone.badge}`}
          >
            {completion
              ?.status ||
              "Review"}
          </span>

          <p className="mt-3 text-xs font-semibold text-slate-600">
            {Number(
              completion
                ?.completedFields ||
                0
            )} of{" "}
            {Number(
              completion
                ?.totalFields ||
                0
            )} key fields are complete.
          </p>
        </div>
      </div>

      {missingFields.length >
      0 ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold text-amber-900">
            Information requiring review
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {missingFields.map(
              (
                field
              ) => (
                <span
                  key={
                    field
                  }
                  className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200"
                >
                  {missingFieldLabels[
                    field
                  ] ||
                    formatStatus(
                      field
                    )}
                </span>
              )
            )}
          </div>

          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-amber-800 shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-100"
            onClick={
              onCorrectionRequest
            }
          >
            <MessageCircle
              size={14}
            />

            Request a Correction
          </button>
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2
            size={19}
            className="shrink-0 text-emerald-600"
          />

          <div>
            <p className="text-xs font-bold text-emerald-900">
              Profile information is complete
            </p>

            <p className="mt-1 text-[11px] text-emerald-700">
              No missing key fields were detected.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

/*
|--------------------------------------------------------------------------
| Digital Student ID
|--------------------------------------------------------------------------
*/

const DigitalStudentId = ({
  digitalId,
  school,
  onPrint,
  onCopyAdmissionNumber
}) => {
  const statusTone =
    getStatusTone(
      digitalId?.status
    );

  const [
    imageFailed,
    setImageFailed
  ] = useState(false);

  useEffect(() => {
    setImageFailed(
      false
    );
  }, [
    digitalId?.photo
  ]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">
            Digital Student ID
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Your secure, school-issued identity card.
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <IdCard
            size={18}
          />
        </div>
      </div>

      <div
        id="student-digital-id"
        className="relative mt-5 overflow-hidden rounded-[28px] bg-slate-950 p-5 text-white shadow-xl"
      >
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <School
                  size={21}
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black">
                  {digitalId
                    ?.schoolName ||
                    school?.schoolName ||
                    "School Name"}
                </p>

                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                  Official Student Identity
                </p>
              </div>
            </div>

            <BadgeCheck
              size={21}
              className="shrink-0 text-emerald-300"
            />
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/10 text-xl font-black ring-1 ring-white/20">
              {digitalId
                ?.photo &&
              !imageFailed ? (
                <img
                  src={
                    digitalId.photo
                  }
                  alt={
                    digitalId
                      ?.studentName ||
                    "Student"
                  }
                  className="h-full w-full object-cover"
                  onError={() =>
                    setImageFailed(
                      true
                    )
                  }
                />
              ) : (
                getInitials(
                  digitalId
                    ?.studentName
                )
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Student Name
              </p>

              <p className="mt-1 truncate text-xl font-black">
                {digitalId
                  ?.studentName ||
                  "Student"}
              </p>

              <p className="mt-2 text-xs font-semibold text-slate-300">
                {digitalId
                  ?.className ||
                  "Class"}{" "}
                {digitalId
                  ?.sectionName
                  ? `· ${digitalId.sectionName}`
                  : ""}
              </p>

              <span
                className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ring-1 ${statusTone.className}`}
              >
                {statusTone.label}
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.07] px-3 py-3 ring-1 ring-white/10">
              <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Admission Number
              </p>

              <p className="mt-1 truncate text-xs font-black text-white">
                {digitalId
                  ?.admissionNumber ||
                  "Pending"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/[0.07] px-3 py-3 ring-1 ring-white/10">
              <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Session
              </p>

              <p className="mt-1 truncate text-xs font-black text-white">
                {digitalId
                  ?.sessionYear ||
                  "Not assigned"}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 text-[9px] font-semibold text-slate-400">
              <ShieldCheck
                size={13}
                className="text-emerald-300"
              />

              Verified school record
            </div>

            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-200">
              Student Portal
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          onClick={
            onCopyAdmissionNumber
          }
        >
          <Copy
            size={14}
          />

          Copy ID
        </button>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
          onClick={
            onPrint
          }
        >
          <Printer
            size={14}
          />

          Print ID
        </button>
      </div>
    </section>
  );
};

/*
|--------------------------------------------------------------------------
| Linked Parent Card
|--------------------------------------------------------------------------
*/

const LinkedParentCard = ({
  parent
}) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm ring-1 ring-slate-200">
          {parent?.photo ? (
            <img
              src={
                parent.photo
              }
              alt={
                parent.name ||
                "Parent"
              }
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            <UsersRound
              size={19}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-slate-800">
              {parent?.name ||
                "Linked Parent"}
            </p>

            <span
              className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${
                parent?.isActive ===
                false
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {parent?.isActive ===
              false
                ? "Inactive"
                : "Active"}
            </span>
          </div>

          <div className="mt-2 space-y-1.5 text-[11px] text-slate-500">
            <p className="flex items-center gap-2">
              <Mail
                size={12}
              />

              <span className="truncate">
                {parent?.email ||
                  "Email not available"}
              </span>
            </p>

            <p className="flex items-center gap-2">
              <Phone
                size={12}
              />

              <span className="truncate">
                {parent?.phone ||
                  "Phone not available"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Loading Skeleton
|--------------------------------------------------------------------------
*/

const ProfileLoadingState =
  () => {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-52 rounded-3xl bg-slate-200" />

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-6">
            <div className="h-96 rounded-3xl bg-slate-200" />
            <div className="h-80 rounded-3xl bg-slate-200" />
          </div>

          <div className="space-y-6">
            <div className="h-[520px] rounded-3xl bg-slate-200" />
            <div className="h-72 rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  };

/*
|--------------------------------------------------------------------------
| Student Profile Page
|--------------------------------------------------------------------------
*/

const StudentProfile =
  () => {
    const navigate =
      useNavigate();

    const {
      student:
        overviewStudent,
      school:
        overviewSchool,
      online,
      refreshPortal
    } = useOutletContext();

    const requestControllerRef =
      useRef(null);

    const [
      profileData,
      setProfileData
    ] = useState(null);

    const [
      loading,
      setLoading
    ] = useState(true);

    const [
      refreshing,
      setRefreshing
    ] = useState(false);

    const [
      error,
      setError
    ] = useState("");

    const [
      copiedAdmissionNumber,
      setCopiedAdmissionNumber
    ] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Load Profile
    |--------------------------------------------------------------------------
    */

    const loadProfile =
      useCallback(
        async ({
          silent = false
        } = {}) => {
          requestControllerRef
            .current
            ?.abort();

          const controller =
            new AbortController();

          requestControllerRef
            .current =
            controller;

          if (
            silent
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError(
            ""
          );

          try {
            const response =
              await getStudentPortalProfile({
                signal:
                  controller.signal
              });

            const data =
              response?.data
                ?.data ||
              null;

            setProfileData(
              data
            );
          } catch (
            requestError
          ) {
            if (
              requestError?.name ===
                "CanceledError" ||
              requestError?.code ===
                "ERR_CANCELED"
            ) {
              return;
            }

            setError(
              getErrorMessage(
                requestError
              )
            );
          } finally {
            if (
              !controller.signal
                .aborted
            ) {
              setLoading(
                false
              );

              setRefreshing(
                false
              );
            }
          }
        },
        []
      );

    useEffect(() => {
      loadProfile();

      return () => {
        requestControllerRef
          .current
          ?.abort();
      };
    }, [
      loadProfile
    ]);

    /*
    |--------------------------------------------------------------------------
    | Derived Data
    |--------------------------------------------------------------------------
    */

    const student =
      profileData
        ?.student ||
      overviewStudent ||
      null;

    const school =
      student?.school ||
      overviewSchool ||
      {};

    const digitalId =
      profileData
        ?.digitalId ||
      {
        admissionNumber:
          student
            ?.admissionNumber ||
          "",

        studentName:
          student?.name ||
          "",

        schoolName:
          school?.schoolName ||
          "",

        className:
          student?.class
            ?.className ||
          "",

        sectionName:
          student?.sectionName ||
          "",

        photo:
          student?.photo ||
          "",

        status:
          student?.status ||
          "",

        sessionYear:
          school?.sessionYear ||
          ""
      };

    const profileCompletion =
      profileData
        ?.profileCompletion ||
      {
        percentage:
          0,

        completedFields:
          0,

        totalFields:
          0,

        missingFields:
          [],

        status:
          "review"
      };

    const correctionPolicy =
      profileData
        ?.correctionPolicy ||
      {
        directEditingAllowed:
          false,

        message:
          "Official student information cannot be edited directly from the portal. Contact the school to request a correction."
      };

    const linkedParents =
      Array.isArray(
        student
          ?.linkedParents
      )
        ? student.linkedParents
        : [];

    const statusTone =
      getStatusTone(
        student?.status
      );

    const personalDetails =
      useMemo(
        () => [
          {
            icon:
              UserRound,

            label:
              "Student Name",

            value:
              student?.name
          },

          {
            icon:
              ContactRound,

            label:
              "Father Name",

            value:
              student
                ?.fatherName
          },

          {
            icon:
              Hash,

            label:
              "B-Form / Identity Number",

            value:
              student?.bForm,

            copyValue:
              student?.bForm
          },

          {
            icon:
              CircleUserRound,

            label:
              "Gender",

            value:
              formatGender(
                student?.gender
              )
          },

          {
            icon:
              CalendarDays,

            label:
              "Date of Birth",

            value:
              formatDate(
                student
                  ?.dateOfBirth
              )
          },

          {
            icon:
              Home,

            label:
              "Residential Address",

            value:
              student?.address
          }
        ],
        [
          student
        ]
      );

    const academicDetails =
      useMemo(
        () => [
          {
            icon:
              Clipboard,

            label:
              "Admission Number",

            value:
              student
                ?.admissionNumber,

            copyValue:
              student
                ?.admissionNumber
          },

          {
            icon:
              GraduationCap,

            label:
              "Class",

            value:
              student?.class
                ?.className
          },

          {
            icon:
              BookOpen,

            label:
              "Section",

            value:
              student
                ?.sectionName
          },

          {
            icon:
              CalendarDays,

            label:
              "Admission Date",

            value:
              formatDate(
                student
                  ?.admissionDate
              )
          },

          {
            icon:
              BadgeCheck,

            label:
              "Student Status",

            value:
              formatStatus(
                student?.status
              )
          },

          {
            icon:
              School,

            label:
              "Academic Session",

            value:
              school
                ?.sessionYear
          }
        ],
        [
          student,
          school
        ]
      );

    const contactDetails =
      useMemo(
        () => [
          {
            icon:
              Phone,

            label:
              "Student Contact",

            value:
              student
                ?.contactNumber,

            copyValue:
              student
                ?.contactNumber
          },

          {
            icon:
              UsersRound,

            label:
              "Guardian Name",

            value:
              student
                ?.guardianName
          },

          {
            icon:
              Phone,

            label:
              "Guardian Contact",

            value:
              student
                ?.guardianContact,

            copyValue:
              student
                ?.guardianContact
          },

          {
            icon:
              Mail,

            label:
              "Login Email",

            value:
              student
                ?.loginAccount
                ?.email,

            copyValue:
              student
                ?.loginAccount
                ?.email
          }
        ],
        [
          student
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Actions
    |--------------------------------------------------------------------------
    */

    const handleRefresh =
      async () => {
        await Promise.all([
          loadProfile({
            silent:
              true
          }),

          refreshPortal?.()
        ]);
      };

    const handleCopyAdmissionNumber =
      async () => {
        try {
          const copied =
            await copyText(
              digitalId
                ?.admissionNumber
            );

          if (
            copied
          ) {
            setCopiedAdmissionNumber(
              true
            );

            window.setTimeout(
              () => {
                setCopiedAdmissionNumber(
                  false
                );
              },
              1800
            );
          }
        } catch (
          copyError
        ) {
          console.error(
            "Admission number copy error:",
            copyError
          );
        }
      };

    const handlePrintId =
      () => {
        window.print();
      };

    const handleCorrectionRequest =
      () => {
        navigate(
          "/student-portal/messages",
          {
            state: {
              compose: {
                subject:
                  "Student profile correction request",

                category:
                  "general",

                priority:
                  "normal",

                text:
                  `I would like to request a correction to my student profile. Admission number: ${
                    student
                      ?.admissionNumber ||
                    "not available"
                  }.`
              }
            }
          }
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Loading and Failure
    |--------------------------------------------------------------------------
    */

    if (
      loading &&
      !student
    ) {
      return (
        <ProfileLoadingState />
      );
    }

    if (
      !student &&
      error
    ) {
      return (
        <div className="grid min-h-[65vh] place-items-center">
          <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle
                size={24}
              />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Profile could not be loaded
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {error}
            </p>

            <button
              type="button"
              className="btn-primary mt-5"
              onClick={() =>
                loadProfile()
              }
            >
              <RefreshCw
                size={16}
              />

              Try Again
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <style>
          {`
            @media print {
              body * {
                visibility: hidden !important;
              }

              #student-digital-id,
              #student-digital-id * {
                visibility: visible !important;
              }

              #student-digital-id {
                position: absolute !important;
                left: 50% !important;
                top: 40px !important;
                width: 420px !important;
                transform: translateX(-50%) !important;
                box-shadow: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}
        </style>

        <div className="space-y-6">
          {/*
          |--------------------------------------------------------------------------
          | Error Banner
          |--------------------------------------------------------------------------
          */}

          {error && (
            <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-rose-800">
                  Profile could not refresh
                </p>

                <p className="mt-1 text-xs text-rose-600">
                  {error}
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-100"
                onClick={() =>
                  loadProfile({
                    silent:
                      true
                  })
                }
              >
                <RefreshCw
                  size={14}
                />

                Try Again
              </button>
            </div>
          )}

          {/*
          |--------------------------------------------------------------------------
          | Profile Hero
          |--------------------------------------------------------------------------
          */}

          <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-7">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <StudentAvatar
                  src={
                    student?.photo
                  }
                  name={
                    student?.name
                  }
                  size="h-28 w-28"
                  className="ring-4 ring-white/10"
                />

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusTone.className}`}
                    >
                      {statusTone.label}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-cyan-200 ring-1 ring-white/10">
                      <LockKeyhole
                        size={11}
                      />

                      Read-only official record
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
                    {student?.name ||
                      "Student"}
                  </h2>

                  <p className="mt-2 text-sm font-semibold text-slate-300">
                    {formatClassName(
                      student
                    )}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-xl bg-white/10 px-3 py-2 text-slate-200 ring-1 ring-white/10">
                      Admission:{" "}
                      {student
                        ?.admissionNumber ||
                        "Pending"}
                    </span>

                    <span className="rounded-xl bg-white/10 px-3 py-2 text-slate-200 ring-1 ring-white/10">
                      Session:{" "}
                      {school
                        ?.sessionYear ||
                        "Not assigned"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/15 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={
                    handleRefresh
                  }
                  disabled={
                    refreshing ||
                    !online
                  }
                >
                  <RefreshCw
                    size={15}
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />

                  {refreshing
                    ? "Refreshing..."
                    : "Refresh Profile"}
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-brand-50"
                  onClick={
                    handleCorrectionRequest
                  }
                >
                  <MessageCircle
                    size={15}
                  />

                  Request Correction
                </button>
              </div>
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Main Grid
          |--------------------------------------------------------------------------
          */}

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <div className="space-y-6">
              {/*
              |--------------------------------------------------------------------------
              | Personal Information
              |--------------------------------------------------------------------------
              */}

              <SectionCard
                icon={
                  CircleUserRound
                }
                title="Personal Information"
                subtitle="Core identity information recorded by the school."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {personalDetails.map(
                    (
                      item
                    ) => (
                      <DetailItem
                        key={
                          item.label
                        }
                        {...item}
                      />
                    )
                  )}
                </div>
              </SectionCard>

              {/*
              |--------------------------------------------------------------------------
              | Academic and Admission Information
              |--------------------------------------------------------------------------
              */}

              <SectionCard
                icon={
                  GraduationCap
                }
                title="Academic & Admission Information"
                subtitle="Your current academic placement and admission details."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {academicDetails.map(
                    (
                      item
                    ) => (
                      <DetailItem
                        key={
                          item.label
                        }
                        {...item}
                      />
                    )
                  )}
                </div>
              </SectionCard>

              {/*
              |--------------------------------------------------------------------------
              | Contact Information
              |--------------------------------------------------------------------------
              */}

              <SectionCard
                icon={
                  ContactRound
                }
                title="Contact & Guardian Information"
                subtitle="Contact details used for student and guardian communication."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {contactDetails.map(
                    (
                      item
                    ) => (
                      <DetailItem
                        key={
                          item.label
                        }
                        {...item}
                      />
                    )
                  )}
                </div>
              </SectionCard>

              {/*
              |--------------------------------------------------------------------------
              | School Information
              |--------------------------------------------------------------------------
              */}

              <SectionCard
                icon={
                  Building2
                }
                title="School Information"
                subtitle="The school currently assigned to your student account."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem
                    icon={
                      School
                    }
                    label="School Name"
                    value={
                      school
                        ?.schoolName
                    }
                  />

                  <DetailItem
                    icon={
                      Building2
                    }
                    label="School Type"
                    value={
                      school?.type
                        ? formatStatus(
                            school.type
                          )
                        : ""
                    }
                  />

                  <DetailItem
                    icon={
                      MapPin
                    }
                    label="School Address"
                    value={
                      school?.address
                    }
                  />

                  <DetailItem
                    icon={
                      Phone
                    }
                    label="School Phone"
                    value={
                      school?.phone
                    }
                    copyValue={
                      school?.phone
                    }
                  />

                  <DetailItem
                    icon={
                      Mail
                    }
                    label="School Email"
                    value={
                      school?.email
                    }
                    copyValue={
                      school?.email
                    }
                  />

                  <DetailItem
                    icon={
                      CalendarDays
                    }
                    label="Academic Session"
                    value={
                      school
                        ?.sessionYear
                    }
                  />
                </div>
              </SectionCard>

              {/*
              |--------------------------------------------------------------------------
              | Linked Parents
              |--------------------------------------------------------------------------
              */}

              <SectionCard
                icon={
                  UsersRound
                }
                title="Linked Parent Accounts"
                subtitle="Verified parent accounts connected with your student record."
              >
                {linkedParents.length >
                0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {linkedParents.map(
                      (
                        parent,
                        index
                      ) => (
                        <LinkedParentCard
                          key={
                            parent?.id ||
                            index
                          }
                          parent={
                            parent
                          }
                        />
                      )
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <UsersRound
                      size={24}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm font-bold text-slate-700">
                      No linked parent account found
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Contact the school administration when a parent account needs to be linked.
                    </p>
                  </div>
                )}
              </SectionCard>
            </div>

            <aside className="space-y-6">
              {/*
              |--------------------------------------------------------------------------
              | Digital ID
              |--------------------------------------------------------------------------
              */}

              <DigitalStudentId
                digitalId={
                  digitalId
                }
                school={
                  school
                }
                onPrint={
                  handlePrintId
                }
                onCopyAdmissionNumber={
                  handleCopyAdmissionNumber
                }
              />

              {copiedAdmissionNumber && (
                <div className="-mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                  <Check
                    size={14}
                  />

                  Admission number copied
                </div>
              )}

              {/*
              |--------------------------------------------------------------------------
              | Completion
              |--------------------------------------------------------------------------
              */}

              <ProfileCompletionCard
                completion={
                  profileCompletion
                }
                onCorrectionRequest={
                  handleCorrectionRequest
                }
              />

              {/*
              |--------------------------------------------------------------------------
              | Login Account
              |--------------------------------------------------------------------------
              */}

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Student Login Account
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Security details for your portal access.
                    </p>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <ShieldCheck
                      size={18}
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <DetailItem
                    icon={
                      Mail
                    }
                    label="Login Email"
                    value={
                      student
                        ?.loginAccount
                        ?.email
                    }
                    copyValue={
                      student
                        ?.loginAccount
                        ?.email
                    }
                  />

                  <DetailItem
                    icon={
                      Phone
                    }
                    label="Account Phone"
                    value={
                      student
                        ?.loginAccount
                        ?.phone
                    }
                    copyValue={
                      student
                        ?.loginAccount
                        ?.phone
                    }
                  />

                  <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <BadgeCheck
                          size={16}
                        />
                      </div>

                      <div>
                        <p className="text-xs font-bold text-emerald-900">
                          Account Status
                        </p>

                        <p className="mt-1 text-[11px] text-emerald-700">
                          {student
                            ?.loginAccount
                            ?.isActive ===
                          false
                            ? "Inactive account"
                            : "Active and protected"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                    onClick={() =>
                      navigate(
                        "/change-password"
                      )
                    }
                  >
                    <KeyRound
                      size={14}
                    />

                    Change Password
                  </button>
                </div>
              </section>

              {/*
              |--------------------------------------------------------------------------
              | Read-only Policy
              |--------------------------------------------------------------------------
              */}

              <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <LockKeyhole
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-sky-900">
                      Protected Official Record
                    </p>

                    <p className="mt-2 text-xs leading-6 text-sky-700">
                      {correctionPolicy
                        ?.message}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-sky-800 shadow-sm ring-1 ring-sky-200 transition hover:bg-sky-100"
                  onClick={
                    handleCorrectionRequest
                  }
                >
                  <MessageCircle
                    size={14}
                  />

                  Contact Principal Office

                  <ArrowRight
                    size={14}
                  />
                </button>
              </section>
            </aside>
          </div>
        </div>
      </>
    );
  };

export default StudentProfile;
