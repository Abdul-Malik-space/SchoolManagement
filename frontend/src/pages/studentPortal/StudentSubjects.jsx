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
  BarChart3,
  BookOpen,
  BookOpenCheck,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  Download,
  Filter,
  GraduationCap,
  Grid3X3,
  Info,
  LayoutList,
  Lightbulb,
  Mail,
  MessageCircle,
  MoreHorizontal,
  NotebookPen,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  X
} from "lucide-react";

import {
  getStudentPortalSubjects
} from "../../api/studentPortal";

/*
|--------------------------------------------------------------------------
| Subject Page Constants
|--------------------------------------------------------------------------
*/

const SUBJECT_TONES = [
  {
    gradient:
      "from-brand-500 to-cyan-500",

    icon:
      "bg-brand-50 text-brand-700",

    soft:
      "bg-brand-50/70",

    border:
      "border-brand-200"
  },

  {
    gradient:
      "from-violet-500 to-fuchsia-500",

    icon:
      "bg-violet-50 text-violet-700",

    soft:
      "bg-violet-50/70",

    border:
      "border-violet-200"
  },

  {
    gradient:
      "from-emerald-500 to-teal-500",

    icon:
      "bg-emerald-50 text-emerald-700",

    soft:
      "bg-emerald-50/70",

    border:
      "border-emerald-200"
  },

  {
    gradient:
      "from-amber-500 to-orange-500",

    icon:
      "bg-amber-50 text-amber-700",

    soft:
      "bg-amber-50/70",

    border:
      "border-amber-200"
  },

  {
    gradient:
      "from-sky-500 to-blue-500",

    icon:
      "bg-sky-50 text-sky-700",

    soft:
      "bg-sky-50/70",

    border:
      "border-sky-200"
  },

  {
    gradient:
      "from-rose-500 to-pink-500",

    icon:
      "bg-rose-50 text-rose-700",

    soft:
      "bg-rose-50/70",

    border:
      "border-rose-200"
  }
];

const FILTER_OPTIONS = [
  {
    value:
      "all",

    label:
      "All Subjects"
  },

  {
    value:
      "assigned",

    label:
      "Teacher Assigned"
  },

  {
    value:
      "unassigned",

    label:
      "Teacher Pending"
  },

  {
    value:
      "bookmarked",

    label:
      "Bookmarked"
  }
];

const FUTURE_MODULES = [
  {
    key:
      "assignments",

    label:
      "Assignments",

    description:
      "Homework, deadlines and submissions",

    icon:
      ClipboardList
  },

  {
    key:
      "examinations",

    label:
      "Examinations",

    description:
      "Exam schedules and assessment records",

    icon:
      GraduationCap
  },

  {
    key:
      "grades",

    label:
      "Grades",

    description:
      "Marks, subject performance and analytics",

    icon:
      BarChart3
  },

  {
    key:
      "reportCards",

    label:
      "Report Cards",

    description:
      "Official term and annual reports",

    icon:
      BookOpenCheck
  }
];

/*
|--------------------------------------------------------------------------
| General Helpers
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
    "Unable to load student subjects."
  );
};

const normalizeText = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
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

const formatStatus = (
  value
) => {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  if (!normalized) {
    return "Not available";
  }

  return normalized
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
    "Teacher"
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

const getSubjectTone = (
  subject,
  index = 0
) => {
  const source =
    String(
      subject?.subjectCode ||
      subject?.subjectName ||
      index
    );

  const hash =
    Array.from(
      source
    ).reduce(
      (
        total,
        character
      ) =>
        total +
        character.charCodeAt(
          0
        ),
      0
    );

  return SUBJECT_TONES[
    hash %
    SUBJECT_TONES.length
  ];
};

const escapeCsv = (
  value
) => {
  const text =
    String(
      value ?? ""
    );

  return `"${text.replaceAll(
    '"',
    '""'
  )}"`;
};

const getBookmarkStorageKey = (
  student
) => {
  return `student-subject-bookmarks:${
    student?.id ||
    student?.admissionNumber ||
    "student"
  }`;
};

const getNoteStorageKey = (
  student
) => {
  return `student-subject-notes:${
    student?.id ||
    student?.admissionNumber ||
    "student"
  }`;
};

const readLocalJson = (
  key,
  fallback
) => {
  try {
    const raw =
      window.localStorage.getItem(
        key
      );

    if (!raw) {
      return fallback;
    }

    return JSON.parse(
      raw
    );
  } catch {
    return fallback;
  }
};

const writeLocalJson = (
  key,
  value
) => {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(
        value
      )
    );

    return true;
  } catch {
    return false;
  }
};

/*
|--------------------------------------------------------------------------
| Reusable Components
|--------------------------------------------------------------------------
*/

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction
}) => {
  return (
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

      {actionLabel &&
      onAction && (
        <button
          type="button"
          className="inline-flex items-center gap-2 self-start rounded-xl px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-50"
          onClick={
            onAction
          }
        >
          {actionLabel}

          <ArrowRight
            size={14}
          />
        </button>
      )}
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  helper,
  tone
}) => {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${tone.bar}`}
      />

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.icon}`}
      >
        <Icon
          size={20}
        />
      </div>

      <p className="mt-4 text-2xl font-black tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {helper}
      </p>
    </article>
  );
};

const TeacherAvatar = ({
  name
}) => {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-xs font-black text-white shadow-sm">
      {getInitials(
        name
      )}
    </div>
  );
};

const SubjectLoadingState =
  () => {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 rounded-3xl bg-slate-200" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({
            length:
              4
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={
                  index
                }
                className="h-40 rounded-2xl bg-slate-200"
              />
            )
          )}
        </div>

        <div className="h-20 rounded-3xl bg-slate-200" />

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length:
              6
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={
                  index
                }
                className="h-80 rounded-3xl bg-slate-200"
              />
            )
          )}
        </div>
      </div>
    );
  };

/*
|--------------------------------------------------------------------------
| Subject Card
|--------------------------------------------------------------------------
*/

const SubjectCard = ({
  subject,
  index,
  bookmarked,
  note,
  onToggleBookmark,
  onOpenDetails,
  onOpenNote,
  onMessageSchool
}) => {
  const tone =
    getSubjectTone(
      subject,
      index
    );

  const teacher =
    subject?.teacher ||
    null;

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
      <div
        className={`h-1.5 bg-gradient-to-r ${tone.gradient}`}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}
          >
            <BookOpen
              size={21}
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`rounded-xl p-2 transition ${
                bookmarked
                  ? "bg-amber-100 text-amber-700"
                  : "text-slate-400 hover:bg-amber-50 hover:text-amber-700"
              }`}
              onClick={() =>
                onToggleBookmark(
                  subject
                )
              }
              aria-label={
                bookmarked
                  ? "Remove subject bookmark"
                  : "Bookmark subject"
              }
              title={
                bookmarked
                  ? "Remove bookmark"
                  : "Bookmark subject"
              }
            >
              {bookmarked ? (
                <BookmarkCheck
                  size={17}
                />
              ) : (
                <Bookmark
                  size={17}
                />
              )}
            </button>

            <button
              type="button"
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={() =>
                onOpenDetails(
                  subject
                )
              }
              aria-label="Open subject details"
              title="Open details"
            >
              <MoreHorizontal
                size={18}
              />
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate text-lg font-black text-slate-900">
              {subject
                ?.subjectName ||
                "Untitled Subject"}
            </h3>

            {subject
              ?.subjectCode && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                {subject.subjectCode}
              </span>
            )}
          </div>

          <p className="mt-3 line-clamp-3 min-h-[60px] text-xs leading-5 text-slate-500">
            {subject
              ?.description ||
              "No subject description has been added by the school yet."}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          {teacher ? (
            <div className="flex items-center gap-3">
              <TeacherAvatar
                name={
                  teacher.name
                }
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-xs font-bold text-slate-800">
                    {teacher.name ||
                      "Assigned Teacher"}
                  </p>

                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${
                      teacher.status &&
                      String(
                        teacher.status
                      ).toLowerCase() !==
                        "active"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {teacher.status
                      ? formatStatus(
                          teacher.status
                        )
                      : "Assigned"}
                  </span>
                </div>

                <p className="mt-1 truncate text-[10px] text-slate-400">
                  {teacher.qualification ||
                    (
                      teacher.employeeId
                        ? `Employee ID: ${teacher.employeeId}`
                        : "Teacher profile details pending"
                    )}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <UserRound
                  size={18}
                />
              </div>

              <div>
                <p className="text-xs font-bold text-amber-900">
                  Teacher not assigned
                </p>

                <p className="mt-1 text-[10px] text-amber-700">
                  The school has not linked a teacher to this subject.
                </p>
              </div>
            </div>
          )}
        </div>

        {note && (
          <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 p-3">
            <div className="flex items-start gap-2">
              <NotebookPen
                size={14}
                className="mt-0.5 shrink-0 text-violet-700"
              />

              <p className="line-clamp-2 text-[11px] leading-5 text-violet-700">
                {note}
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            onClick={() =>
              onOpenNote(
                subject
              )
            }
          >
            <NotebookPen
              size={14}
            />

            {note
              ? "Edit Note"
              : "Private Note"}
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
            onClick={() =>
              onOpenDetails(
                subject
              )
            }
          >
            View Subject

            <ArrowRight
              size={14}
            />
          </button>
        </div>

        {!teacher && (
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
            onClick={() =>
              onMessageSchool(
                subject
              )
            }
          >
            <MessageCircle
              size={14}
            />

            Ask School About Teacher
          </button>
        )}
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Subject List Row
|--------------------------------------------------------------------------
*/

const SubjectListRow = ({
  subject,
  index,
  bookmarked,
  note,
  onToggleBookmark,
  onOpenDetails,
  onOpenNote
}) => {
  const tone =
    getSubjectTone(
      subject,
      index
    );

  const teacher =
    subject?.teacher ||
    null;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-center">
        <div
          className={`h-1.5 bg-gradient-to-r lg:h-auto lg:w-1.5 lg:self-stretch ${tone.gradient}`}
        />

        <div className="flex flex-1 flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}
          >
            <BookOpen
              size={21}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-black text-slate-900">
                {subject
                  ?.subjectName ||
                  "Untitled Subject"}
              </p>

              {subject
                ?.subjectCode && (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  {subject.subjectCode}
                </span>
              )}

              {bookmarked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                  <BookmarkCheck
                    size={10}
                  />

                  Saved
                </span>
              )}
            </div>

            <p className="mt-1 line-clamp-1 text-xs text-slate-500">
              {subject
                ?.description ||
                "No subject description has been added."}
            </p>

            {note && (
              <p className="mt-1 line-clamp-1 text-[10px] font-medium text-violet-600">
                Private note:{" "}
                {note}
              </p>
            )}
          </div>

          <div className="min-w-0 sm:w-60">
            {teacher ? (
              <div className="flex items-center gap-3">
                <TeacherAvatar
                  name={
                    teacher.name
                  }
                />

                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800">
                    {teacher.name ||
                      "Assigned Teacher"}
                  </p>

                  <p className="mt-1 truncate text-[10px] text-slate-400">
                    {teacher.qualification ||
                      teacher.employeeId ||
                      "Teacher details pending"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                <UserRound
                  size={14}
                />

                Teacher pending
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className={`rounded-xl p-2.5 transition ${
                bookmarked
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-700"
              }`}
              onClick={() =>
                onToggleBookmark(
                  subject
                )
              }
              title={
                bookmarked
                  ? "Remove bookmark"
                  : "Bookmark subject"
              }
            >
              {bookmarked ? (
                <BookmarkCheck
                  size={16}
                />
              ) : (
                <Bookmark
                  size={16}
                />
              )}
            </button>

            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              onClick={() =>
                onOpenNote(
                  subject
                )
              }
            >
              Note
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
              onClick={() =>
                onOpenDetails(
                  subject
                )
              }
            >
              Details

              <ArrowRight
                size={13}
              />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Subject Detail Drawer
|--------------------------------------------------------------------------
*/

const SubjectDetailDrawer = ({
  subject,
  bookmarked,
  note,
  onClose,
  onToggleBookmark,
  onOpenNote,
  onOpenTimetable,
  onMessageSchool
}) => {
  useEffect(() => {
    if (!subject) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style
      .overflow =
      "hidden";

    const handleEscape =
      (
        event
      ) => {
        if (
          event.key ===
          "Escape"
        ) {
          onClose();
        }
      };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style
        .overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    subject,
    onClose
  ]);

  if (!subject) {
    return null;
  }

  const teacher =
    subject.teacher ||
    null;

  const tone =
    getSubjectTone(
      subject
    );

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={
          onClose
        }
        aria-label="Close subject details"
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div
          className={`h-1.5 shrink-0 bg-gradient-to-r ${tone.gradient}`}
        />

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-black text-slate-900">
              Subject Details
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Official school subject information
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
            onClick={
              onClose
            }
            aria-label="Close"
          >
            <X
              size={19}
            />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}
            >
              <BookOpen
                size={24}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">
                  {subject.subjectName ||
                    "Untitled Subject"}
                </h2>

                {subject.subjectCode && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {subject.subjectCode}
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {subject.description ||
                  "No detailed subject description has been provided by the school."}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Assigned Teacher
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Faculty member currently linked to this subject.
                </p>
              </div>

              <CircleUserRound
                size={21}
                className="text-brand-600"
              />
            </div>

            {teacher ? (
              <div className="mt-5 flex items-start gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <TeacherAvatar
                  name={
                    teacher.name
                  }
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-slate-900">
                      {teacher.name ||
                        "Assigned Teacher"}
                    </p>

                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${
                        teacher.status &&
                        String(
                          teacher.status
                        ).toLowerCase() !==
                          "active"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {teacher.status
                        ? formatStatus(
                            teacher.status
                          )
                        : "Assigned"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Employee ID
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-700">
                        {teacher.employeeId ||
                          "Not available"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Qualification
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-700">
                        {teacher.qualification ||
                          "Not available"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <UserRound
                      size={17}
                    />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      Teacher assignment pending
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-amber-700">
                      A teacher has not yet been linked with this subject.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <NotebookPen
                  size={18}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-violet-900">
                  Private Study Note
                </p>

                <p className="mt-1 text-xs leading-5 text-violet-700">
                  This note is stored only in this browser and is not part of the official school record.
                </p>

                <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs leading-5 text-violet-800 ring-1 ring-violet-200">
                  {note ||
                    "No private note has been saved for this subject."}
                </div>

                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-violet-800 shadow-sm ring-1 ring-violet-200 transition hover:bg-violet-100"
                  onClick={() =>
                    onOpenNote(
                      subject
                    )
                  }
                >
                  <NotebookPen
                    size={14}
                  />

                  {note
                    ? "Edit Private Note"
                    : "Add Private Note"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-sky-200 bg-sky-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <Info
                  size={18}
                />
              </div>

              <div>
                <p className="text-sm font-bold text-sky-900">
                  Official information policy
                </p>

                <p className="mt-2 text-xs leading-6 text-sky-700">
                  Subject title, code, description and teacher assignment are controlled by the school. Use Messages when any information requires clarification.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                bookmarked
                  ? "bg-amber-100 text-amber-800"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800"
              }`}
              onClick={() =>
                onToggleBookmark(
                  subject
                )
              }
            >
              {bookmarked ? (
                <BookmarkCheck
                  size={14}
                />
              ) : (
                <Bookmark
                  size={14}
                />
              )}

              {bookmarked
                ? "Saved"
                : "Save"}
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
              onClick={
                onOpenTimetable
              }
            >
              <BookOpenCheck
                size={14}
              />

              Timetable
            </button>

            <button
              type="button"
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
              onClick={() =>
                onMessageSchool(
                  subject
                )
              }
            >
              <MessageCircle
                size={14}
              />

              Ask School About Subject
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Private Note Modal
|--------------------------------------------------------------------------
*/

const SubjectNoteModal = ({
  subject,
  initialValue,
  onClose,
  onSave
}) => {
  const [
    value,
    setValue
  ] = useState(
    initialValue ||
    ""
  );

  useEffect(() => {
    setValue(
      initialValue ||
      ""
    );
  }, [
    subject,
    initialValue
  ]);

  useEffect(() => {
    if (!subject) {
      return undefined;
    }

    const handleEscape =
      (
        event
      ) => {
        if (
          event.key ===
          "Escape"
        ) {
          onClose();
        }
      };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    subject,
    onClose
  ]);

  if (!subject) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[140] grid place-items-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
        onClick={
          onClose
        }
        aria-label="Close note editor"
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-black text-slate-900">
              Private Subject Note
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              {subject.subjectName ||
                "Subject"}
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
            onClick={
              onClose
            }
          >
            <X
              size={18}
            />
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-violet-700"
              />

              <p className="text-xs leading-5 text-violet-700">
                This private note stays in the current browser. It is not uploaded to the school and is not visible to teachers, parents or administrators.
              </p>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="field-label">
              Study note
            </span>

            <textarea
              value={
                value
              }
              maxLength={
                600
              }
              rows={
                7
              }
              className="field-input mt-2 min-h-40 resize-y"
              placeholder="Write a revision reminder, important topic or personal study goal…"
              onChange={(
                event
              ) =>
                setValue(
                  event.target
                    .value
                )
              }
            />
          </label>

          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              Stored locally on this device
            </span>

            <span>
              {value.length}/600
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            className="btn-ghost"
            onClick={
              onClose
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              onSave(
                subject,
                value.trim()
              )
            }
          >
            <NotebookPen
              size={15}
            />

            Save Private Note
          </button>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Student Subjects Page
|--------------------------------------------------------------------------
*/

const StudentSubjects =
  () => {
    const navigate =
      useNavigate();

    const {
      student:
        overviewStudent,
      online,
      refreshPortal
    } = useOutletContext();

    const requestControllerRef =
      useRef(null);

    const [
      subjectData,
      setSubjectData
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
      search,
      setSearch
    ] = useState("");

    const [
      filter,
      setFilter
    ] = useState(
      "all"
    );

    const [
      viewMode,
      setViewMode
    ] = useState(
      "grid"
    );

    const [
      sortMode,
      setSortMode
    ] = useState(
      "name-asc"
    );

    const [
      selectedSubject,
      setSelectedSubject
    ] = useState(null);

    const [
      noteSubject,
      setNoteSubject
    ] = useState(null);

    const [
      bookmarks,
      setBookmarks
    ] = useState([]);

    const [
      notes,
      setNotes
    ] = useState({});

    /*
    |--------------------------------------------------------------------------
    | Load Subjects
    |--------------------------------------------------------------------------
    */

    const loadSubjects =
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
              await getStudentPortalSubjects(
                {},
                {
                  signal:
                    controller.signal
                }
              );

            const data =
              response?.data
                ?.data ||
              null;

            setSubjectData(
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
      loadSubjects();

      return () => {
        requestControllerRef
          .current
          ?.abort();
      };
    }, [
      loadSubjects
    ]);

    /*
    |--------------------------------------------------------------------------
    | Derived Data
    |--------------------------------------------------------------------------
    */

    const student =
      subjectData
        ?.student ||
      overviewStudent ||
      null;

    const summary =
      subjectData
        ?.summary ||
      {
        subjectCount:
          0,

        assignedTeacherCount:
          0
      };

    const subjects =
      Array.isArray(
        subjectData
          ?.subjects
      )
        ? subjectData.subjects
        : [];

    const availability =
      subjectData
        ?.availability ||
      {};

    const bookmarkStorageKey =
      getBookmarkStorageKey(
        student
      );

    const noteStorageKey =
      getNoteStorageKey(
        student
      );

    useEffect(() => {
      if (!student) {
        return;
      }

      const savedBookmarks =
        readLocalJson(
          bookmarkStorageKey,
          []
        );

      const savedNotes =
        readLocalJson(
          noteStorageKey,
          {}
        );

      setBookmarks(
        Array.isArray(
          savedBookmarks
        )
          ? savedBookmarks
              .map(
                String
              )
          : []
      );

      setNotes(
        savedNotes &&
        typeof savedNotes ===
          "object" &&
        !Array.isArray(
          savedNotes
        )
          ? savedNotes
          : {}
      );
    }, [
      student,
      bookmarkStorageKey,
      noteStorageKey
    ]);

    const assignedTeacherCount =
      Number(
        summary
          ?.assignedTeacherCount ||
        subjects.filter(
          (
            subject
          ) =>
            subject?.teacher
              ?.id
        ).length
      );

    const subjectCount =
      Number(
        summary
          ?.subjectCount ||
        subjects.length
      );

    const unassignedTeacherCount =
      Math.max(
        0,
        subjectCount -
          assignedTeacherCount
      );

    const teacherCoverage =
      subjectCount >
      0
        ? Math.round(
            (
              assignedTeacherCount /
              subjectCount
            ) *
              100
          )
        : 0;

    const uniqueTeachers =
      useMemo(
        () => {
          const map =
            new Map();

          subjects.forEach(
            (
              subject
            ) => {
              const teacher =
                subject?.teacher;

              if (!teacher) {
                return;
              }

              const key =
                String(
                  teacher.id ||
                  teacher.name ||
                  ""
                );

              if (
                key &&
                !map.has(
                  key
                )
              ) {
                map.set(
                  key,
                  teacher
                );
              }
            }
          );

          return Array.from(
            map.values()
          );
        },
        [
          subjects
        ]
      );

    const filteredSubjects =
      useMemo(
        () => {
          const query =
            normalizeText(
              search
            );

          const next =
            subjects.filter(
              (
                subject
              ) => {
                const searchable =
                  [
                    subject
                      ?.subjectName,

                    subject
                      ?.subjectCode,

                    subject
                      ?.description,

                    subject
                      ?.teacher
                      ?.name,

                    subject
                      ?.teacher
                      ?.qualification,

                    subject
                      ?.teacher
                      ?.employeeId
                  ]
                    .map(
                      normalizeText
                    )
                    .join(
                      " "
                    );

                const matchesSearch =
                  !query ||
                  searchable.includes(
                    query
                  );

                const subjectId =
                  String(
                    subject.id
                  );

                const matchesFilter =
                  filter ===
                  "all"
                    ? true
                    : filter ===
                        "assigned"
                      ? Boolean(
                          subject
                            ?.teacher
                            ?.id
                        )
                      : filter ===
                          "unassigned"
                        ? !subject
                            ?.teacher
                            ?.id
                        : filter ===
                            "bookmarked"
                          ? bookmarks.includes(
                              subjectId
                            )
                          : true;

                return (
                  matchesSearch &&
                  matchesFilter
                );
              }
            );

          return [
            ...next
          ].sort(
            (
              first,
              second
            ) => {
              if (
                sortMode ===
                "name-desc"
              ) {
                return String(
                  second
                    ?.subjectName ||
                  ""
                ).localeCompare(
                  String(
                    first
                      ?.subjectName ||
                    ""
                  )
                );
              }

              if (
                sortMode ===
                "teacher"
              ) {
                return String(
                  first
                    ?.teacher
                    ?.name ||
                  "zzzz"
                ).localeCompare(
                  String(
                    second
                      ?.teacher
                      ?.name ||
                    "zzzz"
                  )
                );
              }

              if (
                sortMode ===
                "bookmarked"
              ) {
                const firstBookmarked =
                  bookmarks.includes(
                    String(
                      first.id
                    )
                  )
                    ? 1
                    : 0;

                const secondBookmarked =
                  bookmarks.includes(
                    String(
                      second.id
                    )
                  )
                    ? 1
                    : 0;

                if (
                  firstBookmarked !==
                  secondBookmarked
                ) {
                  return (
                    secondBookmarked -
                    firstBookmarked
                  );
                }
              }

              return String(
                first
                  ?.subjectName ||
                ""
              ).localeCompare(
                String(
                  second
                    ?.subjectName ||
                  ""
                )
              );
            }
          );
        },
        [
          subjects,
          search,
          filter,
          sortMode,
          bookmarks
        ]
      );

    const selectedSubjectId =
      selectedSubject
        ? String(
            selectedSubject.id
          )
        : "";

    const selectedSubjectNote =
      selectedSubjectId
        ? notes[
            selectedSubjectId
          ] ||
          ""
        : "";

    const noteSubjectId =
      noteSubject
        ? String(
            noteSubject.id
          )
        : "";

    const noteInitialValue =
      noteSubjectId
        ? notes[
            noteSubjectId
          ] ||
          ""
        : "";

    const summaryCards = [
      {
        key:
          "subjects",

        icon:
          BookOpen,

        label:
          "Total Subjects",

        value:
          subjectCount,

        helper:
          `Subjects assigned to ${formatClassName(
            student
          )}`,

        tone: {
          icon:
            "bg-brand-50 text-brand-700",

          bar:
            "bg-gradient-to-r from-brand-500 to-cyan-500"
        }
      },

      {
        key:
          "teachers",

        icon:
          UsersRound,

        label:
          "Assigned Teachers",

        value:
          assignedTeacherCount,

        helper:
          `${uniqueTeachers.length} unique teacher profile${
            uniqueTeachers.length ===
            1
              ? ""
              : "s"
          }`,

        tone: {
          icon:
            "bg-emerald-50 text-emerald-700",

          bar:
            "bg-emerald-500"
        }
      },

      {
        key:
          "coverage",

        icon:
          BadgeCheck,

        label:
          "Teacher Coverage",

        value:
          `${teacherCoverage}%`,

        helper:
          unassignedTeacherCount >
          0
            ? `${unassignedTeacherCount} subject teacher assignment pending`
            : "Every subject has an assigned teacher",

        tone: {
          icon:
            "bg-violet-50 text-violet-700",

          bar:
            "bg-violet-500"
        }
      },

      {
        key:
          "bookmarks",

        icon:
          BookmarkCheck,

        label:
          "Bookmarked",

        value:
          bookmarks.length,

        helper:
          "Private subject shortcuts saved on this device",

        tone: {
          icon:
            "bg-amber-50 text-amber-700",

          bar:
            "bg-amber-500"
        }
      }
    ];

    /*
    |--------------------------------------------------------------------------
    | Actions
    |--------------------------------------------------------------------------
    */

    const handleRefresh =
      async () => {
        await Promise.all([
          loadSubjects({
            silent:
              true
          }),

          refreshPortal?.()
        ]);
      };

    const handleToggleBookmark =
      (
        subject
      ) => {
        const subjectId =
          String(
            subject.id
          );

        setBookmarks(
          (
            current
          ) => {
            const next =
              current.includes(
                subjectId
              )
                ? current.filter(
                    (
                      id
                    ) =>
                      id !==
                      subjectId
                  )
                : [
                    ...current,
                    subjectId
                  ];

            writeLocalJson(
              bookmarkStorageKey,
              next
            );

            return next;
          }
        );
      };

    const handleSaveNote =
      (
        subject,
        value
      ) => {
        const subjectId =
          String(
            subject.id
          );

        setNotes(
          (
            current
          ) => {
            const next = {
              ...current
            };

            if (
              value
            ) {
              next[
                subjectId
              ] =
                value;
            } else {
              delete next[
                subjectId
              ];
            }

            writeLocalJson(
              noteStorageKey,
              next
            );

            return next;
          }
        );

        setNoteSubject(
          null
        );
      };

    const handleMessageSchool =
      (
        subject = null
      ) => {
        const subjectText =
          subject
            ? `${subject.subjectName}${
                subject.subjectCode
                  ? ` (${subject.subjectCode})`
                  : ""
              }`
            : "my class subjects";

        navigate(
          "/student-portal/messages",
          {
            state: {
              compose: {
                subject:
                  "Subject information request",

                category:
                  "academics",

                priority:
                  "normal",

                text:
                  `I would like clarification about ${subjectText}.`
              }
            }
          }
        );
      };

    const handleExportCsv =
      () => {
        if (
          subjects.length ===
          0
        ) {
          return;
        }

        const rows = [
          [
            "Subject Code",
            "Subject Name",
            "Description",
            "Teacher",
            "Employee ID",
            "Qualification",
            "Teacher Status",
            "Bookmarked",
            "Private Note"
          ],

          ...subjects.map(
            (
              subject
            ) => [
              subject.subjectCode ||
                "",

              subject.subjectName ||
                "",

              subject.description ||
                "",

              subject.teacher
                ?.name ||
                "",

              subject.teacher
                ?.employeeId ||
                "",

              subject.teacher
                ?.qualification ||
                "",

              subject.teacher
                ?.status ||
                "",

              bookmarks.includes(
                String(
                  subject.id
                )
              )
                ? "Yes"
                : "No",

              notes[
                String(
                  subject.id
                )
              ] ||
                ""
            ]
          )
        ];

        const csv =
          rows
            .map(
              (
                row
              ) =>
                row
                  .map(
                    escapeCsv
                  )
                  .join(
                    ","
                  )
            )
            .join(
              "\n"
            );

        const blob =
          new Blob(
            [
              "\uFEFF",
              csv
            ],
            {
              type:
                "text/csv;charset=utf-8"
            }
          );

        const url =
          URL.createObjectURL(
            blob
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href =
          url;

        anchor.download =
          `student-subjects-${
            student
              ?.admissionNumber ||
            "student"
          }.csv`;

        document.body.appendChild(
          anchor
        );

        anchor.click();

        document.body.removeChild(
          anchor
        );

        URL.revokeObjectURL(
          url
        );
      };

    const handlePrint =
      () => {
        window.print();
      };

    /*
    |--------------------------------------------------------------------------
    | Loading and Failure
    |--------------------------------------------------------------------------
    */

    if (
      loading &&
      !subjectData
    ) {
      return (
        <SubjectLoadingState />
      );
    }

    if (
      !subjectData &&
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
              Subjects could not be loaded
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {error}
            </p>

            <button
              type="button"
              className="btn-primary mt-5"
              onClick={() =>
                loadSubjects()
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

              #student-subjects-report,
              #student-subjects-report * {
                visibility: visible !important;
              }

              #student-subjects-report {
                position: absolute !important;
                inset: 0 !important;
                width: 100% !important;
                background: white !important;
                padding: 20px !important;
              }

              .subjects-print-hidden {
                display: none !important;
              }

              .subjects-print-break {
                break-inside: avoid !important;
              }

              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}
        </style>

        <div
          id="student-subjects-report"
          className="space-y-6"
        >
          {/*
          |--------------------------------------------------------------------------
          | Refresh Error
          |--------------------------------------------------------------------------
          */}

          {error && (
            <div className="subjects-print-hidden flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-rose-800">
                  Subjects could not refresh
                </p>

                <p className="mt-1 text-xs text-rose-600">
                  {error}
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-100"
                onClick={() =>
                  loadSubjects({
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
          | Subject Hero
          |--------------------------------------------------------------------------
          */}

          <section className="subjects-print-break relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-7">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" />

            <div className="relative grid gap-6 xl:grid-cols-[1fr_330px] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-white/10">
                    <BookOpenCheck
                      size={13}
                    />

                    Subject Learning Workspace
                  </span>

                  <span className="rounded-full bg-brand-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-200 ring-1 ring-brand-300/20">
                    {formatClassName(
                      student
                    )}
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
                  My Subjects
                </h2>

                <p className="mt-2 text-sm font-semibold text-slate-300">
                  {student?.name ||
                    "Student"}{" "}
                  ·{" "}
                  {student
                    ?.admissionNumber ||
                    "Admission number pending"}
                </p>

                <p className="mt-3 max-w-2xl text-xs leading-6 text-slate-400">
                  Explore class subjects, assigned teachers and private study notes. Official subject information is managed by the school.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Teacher Assignment Health
                    </p>

                    <p className="mt-1 text-3xl font-black text-white">
                      {teacherCoverage}%
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${
                      teacherCoverage ===
                      100
                        ? "bg-emerald-400/15 text-emerald-200 ring-emerald-300/20"
                        : "bg-amber-400/15 text-amber-200 ring-amber-300/20"
                    }`}
                  >
                    {teacherCoverage ===
                    100 ? (
                      <CheckCircle2
                        size={20}
                      />
                    ) : (
                      <UserRound
                        size={20}
                      />
                    )}
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      teacherCoverage ===
                      100
                        ? "bg-emerald-400"
                        : "bg-amber-400"
                    }`}
                    style={{
                      width:
                        `${teacherCoverage}%`
                    }}
                  />
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-300">
                  {unassignedTeacherCount >
                  0
                    ? `${unassignedTeacherCount} subject${
                        unassignedTeacherCount ===
                        1
                          ? ""
                          : "s"
                      } currently need a teacher assignment.`
                    : "Every listed subject has an assigned teacher."}
                </p>

                {unassignedTeacherCount >
                  0 && (
                  <button
                    type="button"
                    className="subjects-print-hidden mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-brand-50"
                    onClick={() =>
                      setFilter(
                        "unassigned"
                      )
                    }
                  >
                    Review Pending Subjects

                    <ArrowRight
                      size={14}
                    />
                  </button>
                )}
              </div>
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Summary Cards
          |--------------------------------------------------------------------------
          */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map(
              (
                card
              ) => (
                <StatCard
                  key={
                    card.key
                  }
                  {...card}
                />
              )
            )}
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Search, Filter and View Controls
          |--------------------------------------------------------------------------
          */}

          <section className="subjects-print-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
              <label className="relative block">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={
                    search
                  }
                  className="field-input h-11 pl-10"
                  placeholder="Search subject, code, teacher or qualification…"
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                />
              </label>

              <label className="relative block">
                <Filter
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={
                    filter
                  }
                  className="field-select h-11 min-w-[180px] pl-9"
                  onChange={(
                    event
                  ) =>
                    setFilter(
                      event.target
                        .value
                    )
                  }
                >
                  {FILTER_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="relative block">
                <select
                  value={
                    sortMode
                  }
                  className="field-select h-11 min-w-[170px]"
                  onChange={(
                    event
                  ) =>
                    setSortMode(
                      event.target
                        .value
                    )
                  }
                >
                  <option value="name-asc">
                    Name A–Z
                  </option>

                  <option value="name-desc">
                    Name Z–A
                  </option>

                  <option value="teacher">
                    Teacher Name
                  </option>

                  <option value="bookmarked">
                    Bookmarked First
                  </option>
                </select>
              </label>

              <div className="flex items-center justify-between gap-2 xl:justify-end">
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    className={`rounded-lg p-2 transition ${
                      viewMode ===
                      "grid"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() =>
                      setViewMode(
                        "grid"
                      )
                    }
                    title="Grid view"
                  >
                    <Grid3X3
                      size={16}
                    />
                  </button>

                  <button
                    type="button"
                    className={`rounded-lg p-2 transition ${
                      viewMode ===
                      "list"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    onClick={() =>
                      setViewMode(
                        "list"
                      )
                    }
                    title="List view"
                  >
                    <LayoutList
                      size={16}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={
                    handleExportCsv
                  }
                  disabled={
                    subjects.length ===
                    0
                  }
                  title="Export subjects"
                >
                  <Download
                    size={16}
                  />
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  onClick={
                    handlePrint
                  }
                  title="Print subject list"
                >
                  <Printer
                    size={16}
                  />
                </button>

                <button
                  type="button"
                  className="rounded-xl bg-slate-950 p-2.5 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={
                    handleRefresh
                  }
                  disabled={
                    refreshing ||
                    !online
                  }
                  title="Refresh subjects"
                >
                  <RefreshCw
                    size={16}
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
              <span>
                Showing{" "}
                {filteredSubjects.length}{" "}
                of{" "}
                {subjects.length}{" "}
                subjects
              </span>

              {(search ||
                filter !==
                  "all") && (
                <button
                  type="button"
                  className="font-bold text-brand-700"
                  onClick={() => {
                    setSearch(
                      ""
                    );

                    setFilter(
                      "all"
                    );
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Subject Collection
          |--------------------------------------------------------------------------
          */}

          <section className="subjects-print-break">
            <SectionHeader
              icon={
                BookOpen
              }
              title="Subject Collection"
              subtitle="Official subjects and teacher assignments for the current class."
              actionLabel="Open Timetable"
              onAction={() =>
                navigate(
                  "/student-portal/timetable"
                )
              }
            />

            <div className="mt-5">
              {filteredSubjects.length >
              0 ? (
                viewMode ===
                "grid" ? (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredSubjects.map(
                      (
                        subject,
                        index
                      ) => (
                        <SubjectCard
                          key={
                            subject.id ||
                            index
                          }
                          subject={
                            subject
                          }
                          index={
                            index
                          }
                          bookmarked={
                            bookmarks.includes(
                              String(
                                subject.id
                              )
                            )
                          }
                          note={
                            notes[
                              String(
                                subject.id
                              )
                            ] ||
                            ""
                          }
                          onToggleBookmark={
                            handleToggleBookmark
                          }
                          onOpenDetails={
                            setSelectedSubject
                          }
                          onOpenNote={
                            setNoteSubject
                          }
                          onMessageSchool={
                            handleMessageSchool
                          }
                        />
                      )
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSubjects.map(
                      (
                        subject,
                        index
                      ) => (
                        <SubjectListRow
                          key={
                            subject.id ||
                            index
                          }
                          subject={
                            subject
                          }
                          index={
                            index
                          }
                          bookmarked={
                            bookmarks.includes(
                              String(
                                subject.id
                              )
                            )
                          }
                          note={
                            notes[
                              String(
                                subject.id
                              )
                            ] ||
                            ""
                          }
                          onToggleBookmark={
                            handleToggleBookmark
                          }
                          onOpenDetails={
                            setSelectedSubject
                          }
                          onOpenNote={
                            setNoteSubject
                          }
                        />
                      )
                    )}
                  </div>
                )
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                    <Search
                      size={24}
                    />
                  </div>

                  <p className="mt-4 text-base font-bold text-slate-800">
                    No matching subjects found
                  </p>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Change the search text or selected filter to view other class subjects.
                  </p>

                  <button
                    type="button"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-brand-50"
                    onClick={() => {
                      setSearch(
                        ""
                      );

                      setFilter(
                        "all"
                      );
                    }}
                  >
                    Reset Subject Filters
                  </button>
                </div>
              )}
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Teacher Directory
          |--------------------------------------------------------------------------
          */}

          <section className="subjects-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={
                UsersRound
              }
              title="Subject Teacher Directory"
              subtitle={`${uniqueTeachers.length} unique teacher profile${
                uniqueTeachers.length ===
                1
                  ? ""
                  : "s"
              } linked with the current subject list.`}
            />

            <div className="mt-5">
              {uniqueTeachers.length >
              0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {uniqueTeachers.map(
                    (
                      teacher
                    ) => {
                      const teacherSubjects =
                        subjects.filter(
                          (
                            subject
                          ) =>
                            String(
                              subject
                                ?.teacher
                                ?.id ||
                              subject
                                ?.teacher
                                ?.name
                            ) ===
                            String(
                              teacher.id ||
                              teacher.name
                            )
                        );

                      return (
                        <article
                          key={
                            teacher.id ||
                            teacher.name
                          }
                          className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <TeacherAvatar
                              name={
                                teacher.name
                              }
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-bold text-slate-800">
                                  {teacher.name ||
                                    "Teacher"}
                                </p>

                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                                  {teacher.status
                                    ? formatStatus(
                                        teacher.status
                                      )
                                    : "Assigned"}
                                </span>
                              </div>

                              <p className="mt-1 truncate text-[10px] text-slate-400">
                                {teacher.qualification ||
                                  (
                                    teacher.employeeId
                                      ? `Employee ID: ${teacher.employeeId}`
                                      : "Teacher details pending"
                                  )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {teacherSubjects.map(
                              (
                                subject
                              ) => (
                                <button
                                  key={
                                    subject.id
                                  }
                                  type="button"
                                  className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-brand-50 hover:text-brand-700"
                                  onClick={() =>
                                    setSelectedSubject(
                                      subject
                                    )
                                  }
                                >
                                  {subject.subjectName}
                                </button>
                              )
                            )}
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <UserRound
                    size={26}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-bold text-slate-700">
                    No teacher profiles are linked
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Teacher assignments will appear here after the school updates the subject records.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Academic Module Readiness
          |--------------------------------------------------------------------------
          */}

          <section className="subjects-print-break rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={
                Sparkles
              }
              title="Academic Workspace Readiness"
              subtitle="Related academic modules that will connect with every subject."
              actionLabel="Open Academic Progress"
              onAction={() =>
                navigate(
                  "/student-portal/academics"
                )
              }
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {FUTURE_MODULES.map(
                (
                  module
                ) => {
                  const Icon =
                    module.icon;

                  const moduleAvailable =
                    Boolean(
                      availability[
                        module.key
                      ]
                    );

                  return (
                    <article
                      key={
                        module.key
                      }
                      className={`rounded-2xl border p-4 ${
                        moduleAvailable
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-slate-50/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                            moduleAvailable
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-white text-slate-400 ring-1 ring-slate-200"
                          }`}
                        >
                          <Icon
                            size={18}
                          />
                        </div>

                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${
                            moduleAvailable
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {moduleAvailable
                            ? "Available"
                            : "Coming Soon"}
                        </span>
                      </div>

                      <p className="mt-4 text-sm font-bold text-slate-800">
                        {module.label}
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        {module.description}
                      </p>
                    </article>
                  );
                }
              )}
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Policy and Contact
          |--------------------------------------------------------------------------
          */}

          <section className="subjects-print-break flex flex-col gap-4 rounded-3xl border border-sky-200 bg-sky-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <Info
                  size={18}
                />
              </div>

              <div>
                <p className="text-sm font-bold text-sky-900">
                  Official subject information
                </p>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-sky-700">
                  Subject names, codes, descriptions and teacher assignments are read-only. Private bookmarks and notes remain only in this browser.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="subjects-print-hidden inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-sky-800 shadow-sm ring-1 ring-sky-200 transition hover:bg-sky-100"
              onClick={() =>
                handleMessageSchool()
              }
            >
              <MessageCircle
                size={14}
              />

              Contact School
            </button>
          </section>
        </div>

        <SubjectDetailDrawer
          subject={
            selectedSubject
          }
          bookmarked={
            selectedSubject
              ? bookmarks.includes(
                  String(
                    selectedSubject.id
                  )
                )
              : false
          }
          note={
            selectedSubjectNote
          }
          onClose={() =>
            setSelectedSubject(
              null
            )
          }
          onToggleBookmark={
            handleToggleBookmark
          }
          onOpenNote={
            setNoteSubject
          }
          onOpenTimetable={() =>
            navigate(
              "/student-portal/timetable"
            )
          }
          onMessageSchool={
            handleMessageSchool
          }
        />

        <SubjectNoteModal
          subject={
            noteSubject
          }
          initialValue={
            noteInitialValue
          }
          onClose={() =>
            setNoteSubject(
              null
            )
          }
          onSave={
            handleSaveNote
          }
        />
      </>
    );
  };

export default StudentSubjects;
