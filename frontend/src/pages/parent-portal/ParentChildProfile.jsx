import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Cake,
  CalendarCheck2,
  CalendarDays,
  Check,
  CircleUserRound,
  Clock3,
  GraduationCap,
  HeartHandshake,
  Home,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  School,
  ShieldCheck,
  UserCheck,
  UserRound,
  UsersRound,
  WalletCards,
  X
} from "lucide-react";

import {
  useNavigate,
  useOutletContext,
  useParams
} from "react-router-dom";

import {
  getParentChildProfile
} from "../../api/parentPortal";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getErrorMessage = (
  error
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.message ||
    "Unable to load the student profile."
  );
};

const getInitials = (
  value
) => {
  return String(
    value || "Student"
  )
    .split(" ")
    .filter(Boolean)
    .map(
      (part) =>
        part[0]
    )
    .slice(
      0,
      2
    )
    .join("")
    .toUpperCase();
};

const formatDate = (
  value
) => {
  if (!value) {
    return "Not provided";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric"
    }
  ).format(date);
};

const formatClass = (
  child
) => {
  const className =
    child?.class
      ?.className ||
    "";

  const sectionName =
    child?.sectionName ||
    "";

  if (
    className &&
    sectionName
  ) {
    return `${className} · Section ${sectionName}`;
  }

  return (
    className ||
    sectionName ||
    "Class not assigned"
  );
};

const formatStatus = (
  value
) => {
  return String(
    value || "active"
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        character
      ) =>
        character.toUpperCase()
    );
};

/*
|--------------------------------------------------------------------------
| Information Item
|--------------------------------------------------------------------------
*/

const InformationItem = ({
  icon: Icon,
  label,
  value,
  fullWidth = false
}) => {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${
        fullWidth
          ? "sm:col-span-2"
          : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
          <Icon
            size={16}
          />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-700">
            {value ||
              "Not provided"}
          </p>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Permission Item
|--------------------------------------------------------------------------
*/

const PermissionItem = ({
  label,
  description,
  allowed
}) => {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 ${
        allowed
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          allowed
            ? "bg-emerald-600 text-white"
            : "bg-slate-200 text-slate-500"
        }`}
      >
        {allowed ? (
          <Check
            size={15}
          />
        ) : (
          <X
            size={15}
          />
        )}
      </div>

      <div>
        <p
          className={`text-sm font-bold ${
            allowed
              ? "text-emerald-800"
              : "text-slate-600"
          }`}
        >
          {label}
        </p>

        <p
          className={`mt-1 text-xs leading-5 ${
            allowed
              ? "text-emerald-700/80"
              : "text-slate-400"
          }`}
        >
          {description}
        </p>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Portal Action
|--------------------------------------------------------------------------
*/

const PortalAction = ({
  icon: Icon,
  title,
  description,
  disabled,
  onClick,
  tone = "brand"
}) => {
  const tones = {
    brand:
      "bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white",

    emerald:
      "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white",

    amber:
      "bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-white",

    cyan:
      "bg-cyan-50 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white"
  };

  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:shadow-sm"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${
          tones[
            tone
          ] ||
          tones.brand
        }`}
      >
        <Icon
          size={20}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-800">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {disabled
            ? "This access is not enabled for your parent account."
            : description}
        </p>
      </div>
    </button>
  );
};

/*
|--------------------------------------------------------------------------
| Loading State
|--------------------------------------------------------------------------
*/

const ProfileLoading =
  () => {
    return (
      <div className="grid min-h-[500px] place-items-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
            <RefreshCw
              size={24}
              className="animate-spin text-brand-600"
            />
          </div>

          <p className="mt-4 text-sm font-black text-slate-800">
            Loading student profile
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Verifying your secure parent access…
          </p>
        </div>
      </div>
    );
  };

/*
|--------------------------------------------------------------------------
| Parent Child Profile
|--------------------------------------------------------------------------
*/

const ParentChildProfile =
  () => {
    const {
      studentId
    } = useParams();

    const navigate =
      useNavigate();

    const {
      children,
      selectedChildId,
      setSelectedChildId
    } = useOutletContext();

    const requestRef =
      useRef(null);

    const [
      profile,
      setProfile
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

    /*
    |--------------------------------------------------------------------------
    | Existing Overview Fallback
    |--------------------------------------------------------------------------
    */

    const overviewChild =
      useMemo(
        () => {
          return (
            children.find(
              (
                item
              ) =>
                String(
                  item?.student
                    ?.id ||
                  ""
                ) ===
                String(
                  studentId ||
                  ""
                )
            ) ||
            null
          );
        },
        [
          children,
          studentId
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Load Profile
    |--------------------------------------------------------------------------
    */

    const loadProfile =
      async ({
        silent = false
      } = {}) => {
        if (
          !studentId
        ) {
          setError(
            "Student ID is missing."
          );

          setLoading(
            false
          );

          return;
        }

        requestRef.current
          ?.abort();

        const controller =
          new AbortController();

        requestRef.current =
          controller;

        if (silent) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError("");

        try {
          const response =
            await getParentChildProfile(
              studentId,
              {
                signal:
                  controller.signal
              }
            );

          const data =
            response?.data
              ?.data ||
            null;

          setProfile(
            data
          );

          setSelectedChildId(
            studentId
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
      };

    useEffect(() => {
      loadProfile();

      return () => {
        requestRef.current
          ?.abort();
      };
    }, [
      studentId
    ]);

    /*
    |--------------------------------------------------------------------------
    | Derived Data
    |--------------------------------------------------------------------------
    */

    const child =
      profile?.child ||
      overviewChild?.student ||
      null;

    const link =
      profile?.link ||
      overviewChild?.link ||
      {};

    const permissions =
      link.permissions ||
      {};

    const school =
      child?.school ||
      {};

    const relationship =
      link.relationshipLabel ||
      "Guardian";

    const activeProfile =
      String(
        selectedChildId ||
        ""
      ) ===
      String(
        child?.id ||
        studentId ||
        ""
      );

    const permissionItems = [
      {
        key:
          "studentProfile",

        label:
          "Student Profile",

        description:
          "View personal and admission information."
      },

      {
        key:
          "attendance",

        label:
          "Attendance",

        description:
          "View daily and monthly attendance records."
      },

      {
        key:
          "fees",

        label:
          "Fee Status",

        description:
          "Review invoices and outstanding balances."
      },

      {
        key:
          "receipts",

        label:
          "Payment Receipts",

        description:
          "View payment history and fee receipts."
      },

      {
        key:
          "timetable",

        label:
          "Class Timetable",

        description:
          "View the published weekly class schedule."
      },

      {
        key:
          "academics",

        label:
          "Academic Information",

        description:
          "View subjects, teachers and academic updates."
      },

      {
        key:
          "messages",

        label:
          "Principal Messaging",

        description:
          "Start child-specific conversations with the school."
      },

      {
        key:
          "notices",

        label:
          "School Notices",

        description:
          "Receive relevant announcements and notices."
      }
    ];

    const openSection =
      (
        path,
        permission
      ) => {
        if (
          permissions[
            permission
          ] === false
        ) {
          return;
        }

        setSelectedChildId(
          child?.id ||
          studentId
        );

        navigate(
          path
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Loading and Error States
    |--------------------------------------------------------------------------
    */

    if (
      loading &&
      !child
    ) {
      return (
        <ProfileLoading />
      );
    }

    if (
      error &&
      !child
    ) {
      return (
        <div className="card grid min-h-[500px] place-items-center p-8 text-center">
          <div className="max-w-lg">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-rose-50 text-rose-600">
              <CircleUserRound
                size={34}
              />
            </div>

            <h2 className="mt-6 text-xl font-black text-slate-900">
              Student profile unavailable
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  navigate(
                    "/parent-portal/children"
                  )
                }
              >
                <ArrowLeft
                  size={16}
                />

                Back to Children
              </button>

              <button
                type="button"
                className="btn-primary"
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
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/*
        |--------------------------------------------------------------------------
        | Page Controls
        |--------------------------------------------------------------------------
        */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="btn-secondary self-start"
            onClick={() =>
              navigate(
                "/parent-portal/children"
              )
            }
          >
            <ArrowLeft
              size={16}
            />

            Back to Children
          </button>

          <button
            type="button"
            className="btn-ghost self-start"
            disabled={
              refreshing
            }
            onClick={() =>
              loadProfile({
                silent: true
              })
            }
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh Profile
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-bold text-amber-800">
              The latest profile update could not be loaded.
            </p>

            <p className="mt-1 text-xs text-amber-700">
              {error}
            </p>
          </div>
        )}

        {/*
        |--------------------------------------------------------------------------
        | Student Identity Hero
        |--------------------------------------------------------------------------
        */}

        <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] bg-white/10 text-2xl font-black text-white ring-1 ring-white/15">
                {child?.photo ? (
                  <img
                    src={
                      child.photo
                    }
                    alt={
                      child.name ||
                      "Student"
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(
                    child?.name
                  )
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-400/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100 ring-1 ring-brand-300/20">
                    Student Profile
                  </span>

                  <span
                    className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                      child?.status ===
                      "active"
                        ? "bg-emerald-400/15 text-emerald-200 ring-emerald-300/20"
                        : "bg-white/10 text-slate-200 ring-white/15"
                    }`}
                  >
                    {formatStatus(
                      child?.status
                    )}
                  </span>
                </div>

                <h1 className="mt-4 truncate text-2xl font-black sm:text-3xl">
                  {child?.name ||
                    "Student"}
                </h1>

                <p className="mt-2 text-sm font-semibold text-slate-300">
                  {formatClass(
                    child
                  )}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                  <span>
                    Admission No:{" "}
                    <strong className="text-slate-200">
                      {child?.admissionNumber ||
                        "Not assigned"}
                    </strong>
                  </span>

                  <span>
                    Relationship:{" "}
                    <strong className="text-slate-200">
                      {relationship}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[450px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <UserCheck
                  size={18}
                  className="text-emerald-300"
                />

                <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Link Status
                </p>

                <p className="mt-1 text-sm font-black text-white">
                  {formatStatus(
                    link.status ||
                    "active"
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <BadgeCheck
                  size={18}
                  className="text-cyan-300"
                />

                <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Verification
                </p>

                <p className="mt-1 text-sm font-black text-white">
                  {formatStatus(
                    link.verificationStatus ||
                    "verified"
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <ShieldCheck
                  size={18}
                  className="text-amber-300"
                />

                <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Access
                </p>

                <p className="mt-1 text-sm font-black text-white">
                  {activeProfile
                    ? "Active Child"
                    : "Linked Child"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Student and Guardian Information
        |--------------------------------------------------------------------------
        */}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <CircleUserRound
                    size={21}
                  />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Student Information
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Personal and admission details recorded by the school.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              <InformationItem
                icon={
                  UserRound
                }
                label="Full Name"
                value={
                  child?.name
                }
              />

              <InformationItem
                icon={
                  KeyRound
                }
                label="Admission Number"
                value={
                  child?.admissionNumber
                }
              />

              <InformationItem
                icon={
                  GraduationCap
                }
                label="Class and Section"
                value={
                  formatClass(
                    child
                  )
                }
              />

              <InformationItem
                icon={
                  UsersRound
                }
                label="Gender"
                value={
                  formatStatus(
                    child?.gender ||
                    "Not provided"
                  )
                }
              />

              <InformationItem
                icon={
                  Cake
                }
                label="Date of Birth"
                value={
                  formatDate(
                    child?.dateOfBirth
                  )
                }
              />

              <InformationItem
                icon={
                  CalendarDays
                }
                label="Admission Date"
                value={
                  formatDate(
                    child?.admissionDate
                  )
                }
              />

              <InformationItem
                icon={
                  Phone
                }
                label="Student Contact"
                value={
                  child?.contactNumber
                }
              />

              <InformationItem
                icon={
                  ShieldCheck
                }
                label="Student Status"
                value={
                  formatStatus(
                    child?.status
                  )
                }
              />

              <InformationItem
                icon={
                  MapPin
                }
                label="Residential Address"
                value={
                  child?.address
                }
                fullWidth
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="card overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <HeartHandshake
                      size={21}
                    />
                  </div>

                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Guardian Information
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Parent and emergency relationship details.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <InformationItem
                  icon={
                    UserRound
                  }
                  label="Father Name"
                  value={
                    child?.fatherName
                  }
                />

                <InformationItem
                  icon={
                    UsersRound
                  }
                  label="Guardian Name"
                  value={
                    child?.guardianName ||
                    child?.fatherName
                  }
                />

                <InformationItem
                  icon={
                    Phone
                  }
                  label="Guardian Contact"
                  value={
                    child?.guardianContact
                  }
                />

                <InformationItem
                  icon={
                    HeartHandshake
                  }
                  label="Your Relationship"
                  value={
                    relationship
                  }
                />
              </div>
            </div>

            <div className="card p-5">
              <div className="flex flex-wrap gap-2">
                {link.isPrimary && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-200">
                    <BadgeCheck
                      size={13}
                    />

                    Primary Guardian
                  </span>
                )}

                {link.isEmergencyContact && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 ring-1 ring-rose-200">
                    <Phone
                      size={13}
                    />

                    Emergency Contact
                  </span>
                )}

                {link.canCollectStudent && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                    <UserCheck
                      size={13}
                    />

                    Collection Authorized
                  </span>
                )}
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Link Source
                </p>

                <p className="mt-2 text-sm font-bold text-slate-800">
                  {formatStatus(
                    link.source ||
                    "school verified"
                  )}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  This profile is visible because the school has approved your parent–student relationship.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | School Information
        |--------------------------------------------------------------------------
        */}

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <School
                  size={21}
                />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-900">
                  School Information
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Current school and academic session information.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
            <InformationItem
              icon={
                School
              }
              label="School Name"
              value={
                school.schoolName
              }
            />

            <InformationItem
              icon={
                BookOpen
              }
              label="Institution Type"
              value={
                formatStatus(
                  school.type ||
                  "Not provided"
                )
              }
            />

            <InformationItem
              icon={
                CalendarDays
              }
              label="Academic Session"
              value={
                school.sessionYear
              }
            />

            <InformationItem
              icon={
                Phone
              }
              label="School Phone"
              value={
                school.phone
              }
            />

            <InformationItem
              icon={
                Mail
              }
              label="School Email"
              value={
                school.email
              }
            />

            <InformationItem
              icon={
                MapPin
              }
              label="School Address"
              value={
                school.address
              }
            />
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Portal Actions
        |--------------------------------------------------------------------------
        */}

        <section>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
              Parent Services
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              Open Student Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              These actions automatically use this student as the active child.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <PortalAction
              icon={
                CalendarCheck2
              }
              title="Attendance Record"
              description="View daily status and monthly attendance summaries."
              disabled={
                permissions.attendance ===
                false
              }
              tone="emerald"
              onClick={() =>
                openSection(
                  "/parent-portal/attendance",
                  "attendance"
                )
              }
            />

            <PortalAction
              icon={
                WalletCards
              }
              title="Fee Status & Receipts"
              description="Review invoices, payments and outstanding balances."
              disabled={
                permissions.fees ===
                false
              }
              tone="amber"
              onClick={() =>
                openSection(
                  "/parent-portal/fees",
                  "fees"
                )
              }
            />

            <PortalAction
              icon={
                Clock3
              }
              title="Class Timetable"
              description="View the published daily and weekly class schedule."
              disabled={
                permissions.timetable ===
                false
              }
              tone="cyan"
              onClick={() =>
                openSection(
                  "/parent-portal/timetable",
                  "timetable"
                )
              }
            />

            <PortalAction
              icon={
                GraduationCap
              }
              title="Academic Information"
              description="View subjects, teachers and academic updates."
              disabled={
                permissions.academics ===
                false
              }
              onClick={() =>
                openSection(
                  "/parent-portal/academics",
                  "academics"
                )
              }
            />

            <PortalAction
              icon={
                MessageCircle
              }
              title="Message Principal"
              description="Start a secure child-specific school conversation."
              disabled={
                permissions.messages ===
                false
              }
              onClick={() =>
                openSection(
                  `/parent-portal/messages?studentId=${encodeURIComponent(
                    child?.id ||
                    studentId
                  )}`,
                  "messages"
                )
              }
            />

            <PortalAction
              icon={
                Home
              }
              title="Parent Dashboard"
              description="Return to the combined family overview."
              onClick={() =>
                navigate(
                  "/parent-portal"
                )
              }
            />
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Access Permissions
        |--------------------------------------------------------------------------
        */}

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ShieldCheck
                  size={21}
                />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-900">
                  Parent Access Permissions
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Access configured by the school for this student link.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4 sm:p-6">
            {permissionItems.map(
              (
                item
              ) => (
                <PermissionItem
                  key={
                    item.key
                  }
                  label={
                    item.label
                  }
                  description={
                    item.description
                  }
                  allowed={
                    permissions[
                      item.key
                    ] !==
                    false
                  }
                />
              )
            )}
          </div>
        </section>
      </div>
    );
  };

export default ParentChildProfile;