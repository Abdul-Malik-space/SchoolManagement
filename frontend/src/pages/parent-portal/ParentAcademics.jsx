import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileBarChart2,
  FileText,
  GraduationCap,
  Grid3X3,
  Info,
  List,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  UsersRound
} from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getParentChildAcademics } from "../../api/parentPortal";

const SUBJECT_FILTERS = [
  { value: "all", label: "All Subjects" },
  { value: "assigned", label: "Teacher Assigned" },
  { value: "unassigned", label: "Teacher Not Assigned" },
  { value: "active", label: "Active Teachers" }
];

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to load academic information.";

const getInitials = (value) =>
  String(value || "Student")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatClass = (student) => {
  const className = student?.class?.className || "";
  const sectionName = student?.sectionName || "";

  if (className && sectionName) {
    return `${className} · Section ${sectionName}`;
  }

  return className || sectionName || "Class not assigned";
};

const formatStatus = (value) =>
  String(value || "not assigned")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const getTeacherStatusStyle = (status) => {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "active") {
    return {
      label: "Active",
      classes: "bg-emerald-50 text-emerald-700 ring-emerald-200"
    };
  }

  if (normalizedStatus) {
    return {
      label: formatStatus(normalizedStatus),
      classes: "bg-amber-50 text-amber-700 ring-amber-200"
    };
  }

  return {
    label: "Not Assigned",
    classes: "bg-slate-100 text-slate-600 ring-slate-200"
  };
};

const escapeCsvValue = (value) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

const SummaryCard = ({ title, value, helper, icon: Icon, tone = "brand" }) => {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    emerald: "bg-emerald-50 text-emerald-700",
    cyan: "bg-cyan-50 text-cyan-700",
    amber: "bg-amber-50 text-amber-700"
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>

          <p className="mt-3 truncate text-2xl font-black tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            tones[tone] || tones.brand
          }`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

const SubjectCard = ({ subject, onMessage }) => {
  const teacher = subject.teacher || null;
  const statusStyle = getTeacherStatusStyle(teacher?.status);

  return (
    <article className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <div className="relative overflow-hidden bg-slate-950 px-5 py-5 text-white">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
              <BookOpen size={21} />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-200">
                {subject.subjectCode || "Subject"}
              </p>

              <h3 className="mt-1 truncate text-base font-black">
                {subject.subjectName || "Unnamed Subject"}
              </h3>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${
              teacher
                ? "bg-emerald-400/15 text-emerald-200 ring-emerald-300/20"
                : "bg-white/10 text-slate-300 ring-white/15"
            }`}
          >
            {teacher ? "Teacher Assigned" : "Unassigned"}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="min-h-[60px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Subject Description
          </p>

          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
            {subject.description ||
              "No subject description has been added by the school."}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                teacher
                  ? "bg-brand-50 text-brand-700"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {teacher ? <UserRound size={20} /> : <UsersRound size={20} />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-black text-slate-800">
                  {teacher?.name || "Teacher not assigned"}
                </p>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusStyle.classes}`}
                >
                  {statusStyle.label}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                {teacher?.qualification || "Qualification not available"}
              </p>

              {teacher?.employeeId && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Employee ID: {teacher.employeeId}
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn-secondary mt-5 w-full"
          onClick={() => onMessage(subject)}
        >
          <MessageCircle size={16} />
          Ask About Subject
        </button>
      </div>
    </article>
  );
};

const SubjectTableRow = ({ subject, onMessage }) => {
  const teacher = subject.teacher || null;
  const statusStyle = getTeacherStatusStyle(teacher?.status);

  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
      <td className="px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <BookOpen size={17} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-800">
              {subject.subjectName || "Unnamed Subject"}
            </p>

            <p className="mt-0.5 text-[11px] text-slate-400">
              {subject.subjectCode || "No subject code"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-4 sm:px-5">
        <p className="text-sm font-bold text-slate-700">
          {teacher?.name || "Not assigned"}
        </p>

        <p className="mt-0.5 text-[11px] text-slate-400">
          {teacher?.qualification || "No qualification information"}
        </p>
      </td>

      <td className="px-4 py-4 sm:px-5">
        <span
          className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-bold ring-1 ${statusStyle.classes}`}
        >
          {statusStyle.label}
        </span>
      </td>

      <td className="px-4 py-4 text-right sm:px-5">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onMessage(subject)}
        >
          <MessageCircle size={15} />
          Message
        </button>
      </td>
    </tr>
  );
};

const AvailabilityCard = ({
  title,
  description,
  available,
  icon: Icon
}) => (
  <div
    className={`rounded-2xl border p-4 ${
      available
        ? "border-emerald-200 bg-emerald-50"
        : "border-slate-200 bg-slate-50"
    }`}
  >
    <div className="flex items-start gap-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          available
            ? "bg-emerald-600 text-white"
            : "bg-slate-200 text-slate-500"
        }`}
      >
        <Icon size={18} />
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`text-sm font-black ${
              available ? "text-emerald-800" : "text-slate-700"
            }`}
          >
            {title}
          </p>

          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              available
                ? "bg-white/80 text-emerald-700"
                : "bg-white text-slate-500"
            }`}
          >
            {available ? "Available" : "Coming Later"}
          </span>
        </div>

        <p
          className={`mt-1 text-xs leading-5 ${
            available ? "text-emerald-700/80" : "text-slate-500"
          }`}
        >
          {description}
        </p>
      </div>
    </div>
  </div>
);

const ParentAcademics = () => {
  const navigate = useNavigate();
  const { children, selectedChild, selectedChildId } = useOutletContext();
  const requestRef = useRef(null);

  const [academicData, setAcademicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  const studentId =
    selectedChild?.student?.id ||
    selectedChildId ||
    "";

  const academicsAllowed =
    selectedChild?.link?.permissions?.academics !== false;

  useEffect(() => {
    setAcademicData(null);
    setSearch("");
    setSubjectFilter("all");
  }, [studentId]);

  const loadAcademics = useCallback(
    async ({ silent = false } = {}) => {
      if (!studentId || !academicsAllowed) {
        setAcademicData(null);
        setLoading(false);
        return;
      }

      requestRef.current?.abort();

      const controller = new AbortController();
      requestRef.current = controller;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await getParentChildAcademics(studentId, {
          signal: controller.signal
        });

        setAcademicData(response?.data?.data || null);
      } catch (requestError) {
        if (
          requestError?.name === "CanceledError" ||
          requestError?.code === "ERR_CANCELED"
        ) {
          return;
        }

        setError(getErrorMessage(requestError));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [studentId, academicsAllowed]
  );

  useEffect(() => {
    loadAcademics();

    return () => {
      requestRef.current?.abort();
    };
  }, [loadAcademics]);

  const student =
    academicData?.child ||
    selectedChild?.student ||
    null;

  const summary = academicData?.summary || {
    subjectCount: 0,
    assignedTeacherCount: 0
  };

  const subjects = Array.isArray(academicData?.subjects)
    ? academicData.subjects
    : [];

  const results = Array.isArray(academicData?.results)
    ? academicData.results
    : [];

  const availability = academicData?.availability || {
    subjects: true,
    teachers: true,
    examinations: false,
    grades: false,
    reportCards: false
  };

  const filteredSubjects = useMemo(() => {
    const term = search.trim().toLowerCase();

    return subjects.filter((subject) => {
      const teacher = subject.teacher || null;

      const searchText = [
        subject.subjectName,
        subject.subjectCode,
        subject.description,
        teacher?.name,
        teacher?.employeeId,
        teacher?.qualification,
        teacher?.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchText.includes(term);

      const matchesFilter =
        subjectFilter === "all" ||
        (subjectFilter === "assigned" && Boolean(teacher)) ||
        (subjectFilter === "unassigned" && !teacher) ||
        (subjectFilter === "active" &&
          String(teacher?.status || "").toLowerCase() === "active");

      return matchesSearch && matchesFilter;
    });
  }, [subjects, search, subjectFilter]);

  const unassignedSubjectCount = Math.max(
    0,
    Number(summary.subjectCount || subjects.length) -
      Number(summary.assignedTeacherCount || 0)
  );

  const activeTeacherCount = subjects.filter(
    (subject) =>
      String(subject.teacher?.status || "").toLowerCase() === "active"
  ).length;

  const exportSubjects = () => {
    if (filteredSubjects.length === 0) {
      return;
    }

    const rows = [
      [
        "Subject Code",
        "Subject Name",
        "Description",
        "Teacher Name",
        "Teacher Employee ID",
        "Teacher Qualification",
        "Teacher Status"
      ],

      ...filteredSubjects.map((subject) => [
        subject.subjectCode || "",
        subject.subjectName || "",
        subject.description || "",
        subject.teacher?.name || "",
        subject.teacher?.employeeId || "",
        subject.teacher?.qualification || "",
        subject.teacher?.status || ""
      ])
    ];

    const csv = rows
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;

    anchor.download = `${student?.name || "student"}-academic-subjects.csv`
      .replace(/\s+/g, "-")
      .toLowerCase();

    document.body.appendChild(anchor);

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const openSubjectMessage = (subject) => {
    const query = new URLSearchParams({
      studentId: String(studentId),
      category: "academics",
      subject: subject.subjectName || ""
    });

    navigate(`/parent-portal/messages?${query.toString()}`);
  };

  if (children.length === 0) {
    return (
      <div className="card grid min-h-[480px] place-items-center p-8 text-center">
        <div className="max-w-lg">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-brand-50 text-brand-700">
            <UsersRound size={34} />
          </div>

          <h2 className="mt-6 text-xl font-black text-slate-900">
            No child is linked
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            Academic information becomes available after the school links and
            verifies a student with your parent account.
          </p>

          <button
            type="button"
            className="btn-secondary mt-6"
            onClick={() => navigate("/parent-portal/children")}
          >
            View Child Links
          </button>
        </div>
      </div>
    );
  }

  if (!academicsAllowed) {
    return (
      <div className="card grid min-h-[480px] place-items-center p-8 text-center">
        <div className="max-w-lg">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-amber-50 text-amber-700">
            <ShieldCheck size={34} />
          </div>

          <h2 className="mt-6 text-xl font-black text-slate-900">
            Academic access is restricted
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            The school has not enabled academic access for this parent–student
            link. Select another child or contact the school administration.
          </p>

          <button
            type="button"
            className="btn-primary mt-6"
            onClick={() =>
              navigate(
                `/parent-portal/messages?studentId=${encodeURIComponent(
                  studentId
                )}&category=academics`
              )
            }
          >
            <MessageCircle size={16} />
            Contact Principal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/10 text-lg font-black ring-1 ring-white/15">
              {student?.photo ? (
                <img
                  src={student.photo}
                  alt={student.name || "Student"}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(student?.name)
              )}
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-200">
                <GraduationCap size={13} />
                Academic Progress
              </div>

              <h2 className="mt-3 truncate text-2xl font-black sm:text-3xl">
                {student?.name || "Student"}
              </h2>

              <p className="mt-1 text-sm text-slate-300">
                {formatClass(student)}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Admission No: {student?.admissionNumber || "Not assigned"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[440px]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Subjects
              </p>

              <p className="mt-2 text-xl font-black text-white">
                {summary.subjectCount || subjects.length}
              </p>

              <p className="mt-1 text-xs text-cyan-300">
                Active class subjects
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Assigned Teachers
              </p>

              <p className="mt-2 text-xl font-black text-white">
                {summary.assignedTeacherCount || 0}
              </p>

              <p className="mt-1 text-xs text-emerald-300">
                Subject teacher assignments
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="field-input h-11 pl-10"
                placeholder="Search subject, code, teacher or qualification…"
              />
            </div>

            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="field-select h-11 sm:min-w-[190px]"
            >
              {SUBJECT_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition ${
                  viewMode === "grid"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 size={15} />
                Grid
              </button>

              <button
                type="button"
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition ${
                  viewMode === "list"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                onClick={() => setViewMode("list")}
              >
                <List size={15} />
                List
              </button>
            </div>

            <button
              type="button"
              className="btn-secondary h-11"
              disabled={filteredSubjects.length === 0}
              onClick={exportSubjects}
            >
              <Download size={16} />
              Export
            </button>

            <button
              type="button"
              className="btn-primary h-11"
              disabled={refreshing}
              onClick={() => loadAcademics({ silent: true })}
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {error && (
        <section className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0 text-rose-600"
            />

            <div>
              <p className="text-sm font-bold text-rose-800">
                Academic information could not be updated
              </p>

              <p className="mt-1 text-xs text-rose-600">{error}</p>
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => loadAcademics()}
          >
            Try Again
          </button>
        </section>
      )}

      {loading ? (
        <div className="grid min-h-[420px] place-items-center text-center">
          <div>
            <RefreshCw
              size={28}
              className="mx-auto animate-spin text-brand-600"
            />

            <p className="mt-4 text-sm font-black text-slate-800">
              Loading academic information
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Preparing subjects and teacher assignments…
            </p>
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Class Subjects"
              value={summary.subjectCount || subjects.length}
              helper="Active subjects assigned to the student’s class."
              icon={BookOpen}
              tone="brand"
            />

            <SummaryCard
              title="Assigned Teachers"
              value={summary.assignedTeacherCount || 0}
              helper="Subjects with a named teacher assignment."
              icon={UserCheck}
              tone="emerald"
            />

            <SummaryCard
              title="Active Teachers"
              value={activeTeacherCount}
              helper="Assigned teachers currently marked active."
              icon={UsersRound}
              tone="cyan"
            />

            <SummaryCard
              title="Unassigned Subjects"
              value={unassignedSubjectCount}
              helper="Subjects waiting for a teacher assignment."
              icon={AlertCircle}
              tone="amber"
            />
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Sparkles size={20} />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Academic Module Availability
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Current and upcoming academic information for the parent
                    portal.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-5 sm:p-6">
              <AvailabilityCard
                title="Subjects"
                description="Class subjects are available."
                available={availability.subjects !== false}
                icon={BookOpen}
              />

              <AvailabilityCard
                title="Teachers"
                description="Assigned teacher details are available."
                available={availability.teachers !== false}
                icon={UserRound}
              />

              <AvailabilityCard
                title="Examinations"
                description="Exam schedules and assessment details."
                available={Boolean(availability.examinations)}
                icon={ClipboardCheck}
              />

              <AvailabilityCard
                title="Grades"
                description="Marks, grades and subject performance."
                available={Boolean(availability.grades)}
                icon={Award}
              />

              <AvailabilityCard
                title="Report Cards"
                description="Downloadable academic report cards."
                available={Boolean(availability.reportCards)}
                icon={FileBarChart2}
              />
            </div>
          </section>

          {academicData?.note && (
            <section className="flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4">
              <Info
                size={19}
                className="mt-0.5 shrink-0 text-cyan-700"
              />

              <div>
                <p className="text-sm font-bold text-cyan-900">
                  Academic Information Note
                </p>

                <p className="mt-1 text-xs leading-6 text-cyan-800">
                  {academicData.note}
                </p>
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                  Subjects & Teachers
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Class Academic Subjects
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Showing {filteredSubjects.length} of {subjects.length} subject
                  {subjects.length === 1 ? "" : "s"}.
                </p>
              </div>

              {(search || subjectFilter !== "all") && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setSearch("");
                    setSubjectFilter("all");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {filteredSubjects.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredSubjects.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      onMessage={openSubjectMessage}
                    />
                  ))}
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:px-5">
                            Subject
                          </th>

                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:px-5">
                            Teacher
                          </th>

                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:px-5">
                            Status
                          </th>

                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:px-5">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredSubjects.map((subject) => (
                          <SubjectTableRow
                            key={subject.id}
                            subject={subject}
                            onMessage={openSubjectMessage}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : (
              <div className="card grid min-h-[340px] place-items-center p-8 text-center">
                <div className="max-w-md">
                  <Search size={34} className="mx-auto text-slate-300" />

                  <h3 className="mt-5 text-lg font-black text-slate-900">
                    No matching subjects found
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Change the search text or subject filter to view academic
                    subjects.
                  </p>

                  <button
                    type="button"
                    className="btn-secondary mt-5"
                    onClick={() => {
                      setSearch("");
                      setSubjectFilter("all");
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <FileText size={20} />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Examination Results
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Marks, grades and report cards for this student.
                  </p>
                </div>
              </div>
            </div>

            {results.length > 0 ? (
              <div className="p-5 sm:p-6">
                <p className="text-sm text-slate-600">
                  {results.length} academic result record
                  {results.length === 1 ? "" : "s"} available.
                </p>
              </div>
            ) : (
              <div className="grid min-h-[260px] place-items-center p-8 text-center">
                <div className="max-w-lg">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                    <FileBarChart2 size={27} />
                  </div>

                  <h3 className="mt-5 text-lg font-black text-slate-900">
                    Results will appear here
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Examination marks, grades and report cards will become
                    available after the school adds the assessment and result
                    module.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="card p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={22} />
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Official Class Information
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Subject and teacher information is read directly from the
                    school’s active academic records.
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <MessageCircle size={22} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-slate-900">
                    Academic Question?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Contact the principal regarding subject allocation, teacher
                    assignment, academic progress or examination information.
                  </p>

                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700 transition hover:text-brand-800"
                    onClick={() =>
                      navigate(
                        `/parent-portal/messages?studentId=${encodeURIComponent(
                          studentId
                        )}&category=academics`
                      )
                    }
                  >
                    Message Principal
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ParentAcademics;