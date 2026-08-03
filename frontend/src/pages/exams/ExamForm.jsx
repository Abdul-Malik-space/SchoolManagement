import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  GraduationCap,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  School,
  Settings2,
  ShieldCheck,
  Trash2,
  UsersRound,
  X
} from "lucide-react";

import {
  createExam,
  getExamById,
  getExamSetupOptions,
  updateExam
} from "../../api/exams";
import { getSchools } from "../../api/schools";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PageHeader } from "../../components/ui/PageHeader";

const STEPS = [
  { id: "basic", label: "Basic", icon: CalendarDays },
  { id: "classes", label: "Classes", icon: UsersRound },
  { id: "subjects", label: "Subjects", icon: BookOpenCheck },
  { id: "results", label: "Results", icon: Settings2 },
  { id: "review", label: "Review", icon: FileCheck2 }
];

const DEFAULT_TYPES = [
  "monthly_test",
  "class_test",
  "mid_term",
  "final_term",
  "annual_exam",
  "practical_exam",
  "quiz",
  "assignment",
  "other"
];

const EMPTY_FORM = {
  schoolId: "",
  examCode: "",
  examName: "",
  examType: "monthly_test",
  academicYear: "",
  academicTerm: "",
  description: "",
  instructions: "",
  startDate: "",
  endDate: "",
  marksEntryOpensAt: "",
  marksEntryClosesAt: "",
  resultPublicationDate: "",
  applicableClasses: [],
  subjectRules: [],
  resultSettings: {
    gradeSchemeId: "",
    visibility: "private",
    rankingEnabled: false,
    showClassPosition: false,
    showSectionPosition: false,
    showSubjectPosition: false,
    showGrade: true,
    showGPA: false,
    includeAttendance: true,
    includeTeacherRemarks: true,
    includePrincipalRemarks: true,
    failIfAnyRequiredSubjectFailed: true,
    minimumOverallPercentage: 0,
    percentagePrecision: 2,
    publishReportCards: true,
    allowStudentDownload: true,
    allowParentDownload: true
  },
  isActive: true
};

const freshForm = () => ({
  ...EMPTY_FORM,
  applicableClasses: [],
  subjectRules: [],
  resultSettings: { ...EMPTY_FORM.resultSettings }
});

const idOf = (value) =>
  String(value?._id || value?.id || value || "");

const cleanText = (value) =>
  String(value ?? "").trim();

const codeText = (value) =>
  cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

const titleCase = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const numberOf = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatInputDate = (value, withTime = false) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return local.toISOString().slice(0, withTime ? 16 : 10);
};

const formatDate = (value, fallback = "Not set") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
};

const errorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const cancelled = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.message === "canceled";

const classNameOf = (item) =>
  item?.className || item?.name || "Class";

const subjectNameOf = (item) =>
  item?.subjectName || item?.name || "Subject";

const componentTotal = (rule) =>
  numberOf(rule.theoryMarks) +
  numberOf(rule.practicalMarks) +
  numberOf(rule.internalMarks);

const mapExam = (exam) => {
  const settings = exam?.resultSettings || {};
  return {
    schoolId: idOf(exam?.schoolId),
    examCode: exam?.examCode || "",
    examName: exam?.examName || "",
    examType: exam?.examType || "monthly_test",
    academicYear: exam?.academicYear || "",
    academicTerm: exam?.academicTerm || "",
    description: exam?.description || "",
    instructions: exam?.instructions || "",
    startDate: formatInputDate(exam?.startDate),
    endDate: formatInputDate(exam?.endDate),
    marksEntryOpensAt: formatInputDate(exam?.marksEntryOpensAt, true),
    marksEntryClosesAt: formatInputDate(exam?.marksEntryClosesAt, true),
    resultPublicationDate: formatInputDate(
      exam?.resultPublicationDate,
      true
    ),
    applicableClasses: (exam?.applicableClasses || []).map(
      (item, index) => ({
        classId: idOf(item.classId),
        allSections: item.allSections !== false,
        sections: [...(item.sections || [])],
        displayOrder: item.displayOrder ?? index
      })
    ),
    subjectRules: (exam?.subjectRules || []).map((rule, index) => ({
      classId: idOf(rule.classId),
      subjectId: idOf(rule.subjectId),
      assignedTeacherIds: (
        rule.assignedTeacherIds ||
        rule.assignedTeachers ||
        []
      )
        .map(idOf)
        .filter(Boolean),
      maxMarks: rule.maxMarks ?? 100,
      passingMarks: rule.passingMarks ?? 40,
      theoryMarks: rule.theoryMarks ?? 100,
      practicalMarks: rule.practicalMarks ?? 0,
      internalMarks: rule.internalMarks ?? 0,
      weightagePercentage: rule.weightagePercentage ?? 100,
      isOptional: Boolean(rule.isOptional),
      requiresPractical: Boolean(rule.requiresPractical),
      allowGraceMarks: Boolean(rule.allowGraceMarks),
      graceMarksLimit: rule.graceMarksLimit ?? 0,
      displayOrder: rule.displayOrder ?? index,
      instructions: rule.instructions || ""
    })),
    resultSettings: {
      gradeSchemeId: idOf(settings.gradeSchemeId),
      visibility: settings.visibility || "private",
      rankingEnabled: Boolean(settings.rankingEnabled),
      showClassPosition: Boolean(settings.showClassPosition),
      showSectionPosition: Boolean(settings.showSectionPosition),
      showSubjectPosition: Boolean(settings.showSubjectPosition),
      showGrade: settings.showGrade !== false,
      showGPA: Boolean(settings.showGPA),
      includeAttendance: settings.includeAttendance !== false,
      includeTeacherRemarks: settings.includeTeacherRemarks !== false,
      includePrincipalRemarks: settings.includePrincipalRemarks !== false,
      failIfAnyRequiredSubjectFailed:
        settings.failIfAnyRequiredSubjectFailed !== false,
      minimumOverallPercentage:
        settings.minimumOverallPercentage ?? 0,
      percentagePrecision: settings.percentagePrecision ?? 2,
      publishReportCards: settings.publishReportCards !== false,
      allowStudentDownload: settings.allowStudentDownload !== false,
      allowParentDownload: settings.allowParentDownload !== false
    },
    isActive: exam?.isActive !== false
  };
};

const createRule = (classId, subject, index) => {
  const teacherId = idOf(subject?.teacherId);
  return {
    classId,
    subjectId: idOf(subject),
    assignedTeacherIds: teacherId ? [teacherId] : [],
    maxMarks: 100,
    passingMarks: 40,
    theoryMarks: 100,
    practicalMarks: 0,
    internalMarks: 0,
    weightagePercentage: 100,
    isOptional: false,
    requiresPractical: false,
    allowGraceMarks: false,
    graceMarksLimit: 0,
    displayOrder: index,
    instructions: ""
  };
};

const buildPayload = (form) => ({
  schoolId: form.schoolId || undefined,
  examCode: codeText(form.examCode),
  examName: cleanText(form.examName),
  examType: form.examType,
  academicYear: cleanText(form.academicYear),
  academicTerm: cleanText(form.academicTerm),
  description: cleanText(form.description),
  instructions: cleanText(form.instructions),
  startDate: form.startDate,
  endDate: form.endDate,
  marksEntryOpensAt: form.marksEntryOpensAt || null,
  marksEntryClosesAt: form.marksEntryClosesAt || null,
  resultPublicationDate: form.resultPublicationDate || null,
  applicableClasses: form.applicableClasses.map((item, index) => ({
    classId: item.classId,
    allSections: item.allSections !== false,
    sections: item.allSections ? [] : item.sections,
    displayOrder: index
  })),
  subjectRules: form.subjectRules.map((rule, index) => ({
    classId: rule.classId,
    subjectId: rule.subjectId,
    assignedTeacherIds: rule.assignedTeacherIds,
    maxMarks: numberOf(rule.maxMarks),
    passingMarks: numberOf(rule.passingMarks),
    theoryMarks: numberOf(rule.theoryMarks),
    practicalMarks: numberOf(rule.practicalMarks),
    internalMarks: numberOf(rule.internalMarks),
    weightagePercentage: numberOf(rule.weightagePercentage, 100),
    isOptional: Boolean(rule.isOptional),
    requiresPractical: Boolean(rule.requiresPractical),
    allowGraceMarks: Boolean(rule.allowGraceMarks),
    graceMarksLimit: rule.allowGraceMarks
      ? numberOf(rule.graceMarksLimit)
      : 0,
    displayOrder: index,
    instructions: cleanText(rule.instructions)
  })),
  resultSettings: {
    ...form.resultSettings,
    gradeSchemeId: form.resultSettings.gradeSchemeId || null,
    minimumOverallPercentage: numberOf(
      form.resultSettings.minimumOverallPercentage
    ),
    percentagePrecision: numberOf(
      form.resultSettings.percentagePrecision,
      2
    ),
    showClassPosition:
      form.resultSettings.rankingEnabled &&
      form.resultSettings.showClassPosition,
    showSectionPosition:
      form.resultSettings.rankingEnabled &&
      form.resultSettings.showSectionPosition,
    showSubjectPosition:
      form.resultSettings.rankingEnabled &&
      form.resultSettings.showSubjectPosition
  },
  isActive: Boolean(form.isActive)
});

const buildScheduledPayload = (form) => {
  const payload = buildPayload(form);

  return {
    examName: payload.examName,
    description: payload.description,
    instructions: payload.instructions,
    marksEntryOpensAt: payload.marksEntryOpensAt,
    marksEntryClosesAt: payload.marksEntryClosesAt,
    resultPublicationDate: payload.resultPublicationDate,
    resultSettings: payload.resultSettings
  };
};

const Field = ({
  label,
  required,
  error,
  hint,
  children,
  className = ""
}) => (
  <div className={className}>
    <label className="field-label">
      {label}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </label>
    {children}
    {error ? (
      <p className="mt-1.5 text-xs font-medium text-rose-600">
        {error}
      </p>
    ) : hint ? (
      <p className="mt-1.5 text-xs leading-5 text-slate-400">
        {hint}
      </p>
    ) : null}
  </div>
);

const Panel = ({
  icon: Icon,
  title,
  description,
  action,
  children
}) => (
  <section className="card overflow-hidden">
    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

const Toggle = ({
  checked,
  onChange,
  label,
  description,
  disabled = false
}) => (
  <label
    className={`flex items-start gap-3 rounded-xl border p-3 ${
      disabled
        ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
        : checked
          ? "cursor-pointer border-brand-200 bg-brand-50/60"
          : "cursor-pointer border-slate-200 bg-white hover:border-slate-300"
    }`}
  >
    <input
      type="checkbox"
      className="sr-only"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
    <span
      className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 ${
        checked
          ? "justify-end bg-brand-600"
          : "justify-start bg-slate-300"
      }`}
    >
      <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
    </span>
    <span>
      <span className="block text-sm font-semibold text-slate-800">
        {label}
      </span>
      {description && (
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      )}
    </span>
  </label>
);

const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const failed = toast.type === "error";
  return (
    <div className="fixed right-4 top-4 z-[80] w-[calc(100%-2rem)] max-w-sm">
      <div
        className={`rounded-xl border p-4 shadow-pop ${
          failed
            ? "border-rose-100 bg-rose-50 text-rose-800"
            : "border-emerald-100 bg-emerald-50 text-emerald-800"
        }`}
      >
        <div className="flex items-start gap-3">
          {failed ? (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          )}
          <p className="min-w-0 flex-1 text-sm leading-5">
            {toast.message}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 opacity-70 hover:bg-white/60"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const TeacherSelect = ({
  teachers,
  value,
  onChange,
  disabled
}) => {
  const [open, setOpen] = useState(false);
  const selected = teachers.filter((teacher) =>
    value.includes(idOf(teacher))
  );

  const toggle = (teacherId) => {
    onChange(
      value.includes(teacherId)
        ? value.filter((id) => id !== teacherId)
        : [...value, teacherId]
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="field-select flex min-h-10 items-center justify-between text-left"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
      >
        <span className="truncate">
          {selected.length
            ? selected.map((teacher) => teacher.name).join(", ")
            : "Not assigned"}
        </span>
        <ChevronDown
          size={15}
          className={open ? "rotate-180" : ""}
        />
      </button>

      {open && !disabled && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close teacher selector"
          />
          <div className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-pop">
            {teachers.length ? (
              teachers.map((teacher) => {
                const teacherId = idOf(teacher);
                const checked = value.includes(teacherId);
                return (
                  <button
                    key={teacherId}
                    type="button"
                    onClick={() => toggle(teacherId)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                      checked
                        ? "bg-brand-50 text-brand-800"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        checked
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 text-transparent"
                      }`}
                    >
                      <Check size={12} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {teacher.name}
                      </span>
                      <span className="block truncate text-xs opacity-70">
                        {teacher.employeeId ||
                          teacher.qualification ||
                          "Teacher"}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                No active teachers available.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const BasicStep = ({
  form,
  setForm,
  errors,
  schools,
  isSuperAdmin,
  schoolsLoading,
  types,
  locked,
  scheduled,
  readOnly,
  schoolLocked,
  onSchoolChange
}) => {
  const change = (field) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="space-y-5">
      {locked && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <p>
              Structural fields are protected after the exam leaves
              draft status.
            </p>
          </div>
        </div>
      )}

      {scheduled && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          Scheduled exams allow descriptive, marks-window,
          publication and result-setting changes only.
        </div>
      )}

      <Panel
        icon={School}
        title="Exam Identity"
        description="School, exam name, code and academic session."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isSuperAdmin && (
            <Field
              label="School"
              required
              error={errors.schoolId}
              className="md:col-span-2"
            >
              <select
                className="field-select"
                value={form.schoolId}
                onChange={onSchoolChange}
                disabled={schoolsLoading || schoolLocked || readOnly}
              >
                <option value="">
                  {schoolsLoading
                    ? "Loading schools..."
                    : "Select a school"}
                </option>
                {schools.map((school) => (
                  <option key={school._id} value={school._id}>
                    {school.schoolName}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field
            label="Exam code"
            required
            error={errors.examCode}
          >
            <input
              className="field-input uppercase"
              value={form.examCode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  examCode: codeText(event.target.value)
                }))
              }
              placeholder="MID-TERM-2026"
              maxLength={50}
              disabled={locked}
            />
          </Field>

          <Field
            label="Exam type"
            required
            error={errors.examType}
          >
            <select
              className="field-select"
              value={form.examType}
              onChange={change("examType")}
              disabled={locked}
            >
              {types.map((type) => (
                <option key={type} value={type}>
                  {titleCase(type)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Exam name"
            required
            error={errors.examName}
            className="md:col-span-2"
          >
            <input
              className="field-input"
              value={form.examName}
              onChange={change("examName")}
              placeholder="Mid Term Examination 2026"
              maxLength={160}
              disabled={readOnly}
            />
          </Field>

          <Field
            label="Academic year"
            required
            error={errors.academicYear}
          >
            <input
              className="field-input"
              value={form.academicYear}
              onChange={change("academicYear")}
              placeholder="2026-2027"
              maxLength={30}
              disabled={locked}
            />
          </Field>

          <Field label="Academic term">
            <input
              className="field-input"
              value={form.academicTerm}
              onChange={change("academicTerm")}
              placeholder="First Term"
              maxLength={80}
              disabled={locked}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        icon={CalendarDays}
        title="Timeline"
        description="Exam dates, marks-entry window and publication date."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field
            label="Start date"
            required
            error={errors.startDate}
          >
            <input
              type="date"
              className="field-input"
              value={form.startDate}
              onChange={change("startDate")}
              disabled={locked}
            />
          </Field>

          <Field
            label="End date"
            required
            error={errors.endDate}
          >
            <input
              type="date"
              className="field-input"
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={change("endDate")}
              disabled={locked}
            />
          </Field>

          <Field
            label="Result publication"
            error={errors.resultPublicationDate}
          >
            <input
              type="datetime-local"
              className="field-input"
              min={
                form.endDate
                  ? `${form.endDate}T00:00`
                  : undefined
              }
              value={form.resultPublicationDate}
              onChange={change("resultPublicationDate")}
              disabled={readOnly}
            />
          </Field>

          <Field
            label="Marks entry opens"
            error={errors.marksEntryOpensAt}
          >
            <input
              type="datetime-local"
              className="field-input"
              value={form.marksEntryOpensAt}
              onChange={change("marksEntryOpensAt")}
              disabled={readOnly}
            />
          </Field>

          <Field
            label="Marks entry closes"
            error={errors.marksEntryClosesAt}
          >
            <input
              type="datetime-local"
              className="field-input"
              min={form.marksEntryOpensAt || undefined}
              value={form.marksEntryClosesAt}
              onChange={change("marksEntryClosesAt")}
              disabled={readOnly}
            />
          </Field>

          <Toggle
            checked={form.isActive}
            onChange={change("isActive")}
            label="Active exam record"
            description="Keep this record visible in standard exam lists."
            disabled={locked || readOnly}
          />
        </div>
      </Panel>

      <Panel
        icon={FileCheck2}
        title="Description and Instructions"
        description="Administrative context and examination guidance."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Field
            label="Description"
            hint={`${form.description.length}/3000 characters`}
          >
            <textarea
              className="field-input min-h-32 resize-y"
              value={form.description}
              onChange={change("description")}
              maxLength={3000}
              placeholder="Short administrative summary."
              disabled={readOnly}
            />
          </Field>

          <Field
            label="Instructions"
            hint={`${form.instructions.length}/5000 characters`}
          >
            <textarea
              className="field-input min-h-32 resize-y"
              value={form.instructions}
              onChange={change("instructions")}
              maxLength={5000}
              placeholder="General examination and marks-entry instructions."
              disabled={readOnly}
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
};

const ClassesStep = ({
  form,
  setForm,
  classes,
  errors,
  disabled
}) => {
  const selected = new Set(
    form.applicableClasses.map((item) => item.classId)
  );

  const toggleClass = (record) => {
    if (disabled) return;
    const classId = idOf(record);
    setForm((current) => {
      const exists = current.applicableClasses.some(
        (item) => item.classId === classId
      );
      if (exists) {
        return {
          ...current,
          applicableClasses: current.applicableClasses.filter(
            (item) => item.classId !== classId
          ),
          subjectRules: current.subjectRules.filter(
            (rule) => rule.classId !== classId
          )
        };
      }
      return {
        ...current,
        applicableClasses: [
          ...current.applicableClasses,
          {
            classId,
            allSections: true,
            sections: [],
            displayOrder: current.applicableClasses.length
          }
        ]
      };
    });
  };

  const updateItem = (classId, patch) =>
    setForm((current) => ({
      ...current,
      applicableClasses: current.applicableClasses.map((item) =>
        item.classId === classId ? { ...item, ...patch } : item
      )
    }));

  return (
    <div className="space-y-5">
      {disabled && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Class and section scope is read-only outside draft status.
        </div>
      )}

      <Panel
        icon={UsersRound}
        title="Applicable Classes"
        description="Select participating classes and section scope."
        action={
          !disabled && (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost px-3 py-2"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    applicableClasses: classes.map((record, index) => ({
                      classId: idOf(record),
                      allSections: true,
                      sections: [],
                      displayOrder: index
                    }))
                  }))
                }
              >
                <Check size={15} />
                Select All
              </button>
              <button
                type="button"
                className="btn-ghost px-3 py-2"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    applicableClasses: [],
                    subjectRules: []
                  }))
                }
              >
                <RotateCcw size={15} />
                Clear
              </button>
            </div>
          )
        }
      >
        {errors._root && (
          <div className="mb-4 rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {errors._root}
          </div>
        )}

        {classes.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {classes.map((record) => {
              const classId = idOf(record);
              const item = form.applicableClasses.find(
                (entry) => entry.classId === classId
              );
              const checked = selected.has(classId);
              return (
                <article
                  key={classId}
                  className={`rounded-xl border ${
                    checked
                      ? "border-brand-200 bg-brand-50/30"
                      : "border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 p-4 text-left"
                    onClick={() => toggleClass(record)}
                    disabled={disabled}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                        checked
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-300 text-transparent"
                      }`}
                    >
                      <Check size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-900">
                        {classNameOf(record)}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {record.sections?.length || 0} sections
                      </span>
                    </span>
                    <Badge tone={checked ? "success" : "neutral"}>
                      {checked ? "Selected" : "Not selected"}
                    </Badge>
                  </button>

                  {checked && (
                    <div className="border-t border-brand-100 bg-white p-4">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-brand-600"
                          checked={item.allSections}
                          onChange={(event) =>
                            updateItem(classId, {
                              allSections: event.target.checked,
                              sections: event.target.checked
                                ? []
                                : item.sections
                            })
                          }
                          disabled={disabled}
                        />
                        Include all sections
                      </label>

                      {!item.allSections && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(record.sections || []).map((section) => {
                            const name = section.sectionName;
                            const sectionChecked =
                              item.sections.includes(name);
                            return (
                              <label
                                key={section._id || name}
                                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                                  sectionChecked
                                    ? "border-brand-200 bg-brand-50 text-brand-700"
                                    : "border-slate-200 text-slate-600"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={sectionChecked}
                                  onChange={() =>
                                    updateItem(classId, {
                                      sections: sectionChecked
                                        ? item.sections.filter(
                                            (value) => value !== name
                                          )
                                        : [...item.sections, name]
                                    })
                                  }
                                  disabled={disabled}
                                />
                                {name}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {errors[classId] && (
                        <p className="mt-3 text-xs font-medium text-rose-600">
                          {errors[classId]}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <UsersRound size={30} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No active classes are available
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
};

const RuleCard = ({
  rule,
  classRecord,
  subject,
  teachers,
  error,
  disabled,
  onChange,
  onRemove
}) => {
  const total = componentTotal(rule);
  const matches = total === numberOf(rule.maxMarks);

  return (
    <article
      className={`rounded-xl border ${
        error ? "border-rose-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <p className="font-semibold text-slate-900">
            {subjectNameOf(subject)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {classNameOf(classRecord)}
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Maximum marks" required>
            <input
              type="number"
              min="1"
              step="0.01"
              className="field-input"
              value={rule.maxMarks}
              onChange={(event) =>
                onChange({ maxMarks: event.target.value })
              }
              disabled={disabled}
            />
          </Field>

          <Field label="Passing marks" required>
            <input
              type="number"
              min="0"
              max={rule.maxMarks || undefined}
              step="0.01"
              className="field-input"
              value={rule.passingMarks}
              onChange={(event) =>
                onChange({ passingMarks: event.target.value })
              }
              disabled={disabled}
            />
          </Field>

          <Field label="Weightage">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="field-input"
              value={rule.weightagePercentage}
              onChange={(event) =>
                onChange({
                  weightagePercentage: event.target.value
                })
              }
              disabled={disabled}
            />
          </Field>

          <Field label="Assigned teachers">
            <TeacherSelect
              teachers={teachers}
              value={rule.assignedTeacherIds}
              onChange={(assignedTeacherIds) =>
                onChange({ assignedTeacherIds })
              }
              disabled={disabled}
            />
          </Field>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-slate-800">
            Assessment components
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["theoryMarks", "Theory"],
              ["practicalMarks", "Practical"],
              ["internalMarks", "Internal"]
            ].map(([field, label]) => (
              <Field key={field} label={label}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="field-input"
                  value={rule[field]}
                  onChange={(event) =>
                    onChange({ [field]: event.target.value })
                  }
                  disabled={disabled}
                />
              </Field>
            ))}
          </div>
          <div
            className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
              matches
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            <span>Component total</span>
            <span className="font-bold">
              {total} / {numberOf(rule.maxMarks)}
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Toggle
            checked={rule.isOptional}
            onChange={(event) =>
              onChange({ isOptional: event.target.checked })
            }
            label="Optional subject"
            disabled={disabled}
          />
          <Toggle
            checked={rule.requiresPractical}
            onChange={(event) =>
              onChange({ requiresPractical: event.target.checked })
            }
            label="Practical required"
            disabled={disabled}
          />
          <Toggle
            checked={rule.allowGraceMarks}
            onChange={(event) =>
              onChange({
                allowGraceMarks: event.target.checked,
                graceMarksLimit: event.target.checked
                  ? rule.graceMarksLimit
                  : 0
              })
            }
            label="Allow grace marks"
            disabled={disabled}
          />
        </div>

        {rule.allowGraceMarks && (
          <Field
            label="Grace marks limit"
            className="max-w-sm"
          >
            <input
              type="number"
              min="0"
              max={rule.passingMarks || undefined}
              step="0.01"
              className="field-input"
              value={rule.graceMarksLimit}
              onChange={(event) =>
                onChange({ graceMarksLimit: event.target.value })
              }
              disabled={disabled}
            />
          </Field>
        )}

        <Field
          label="Subject instructions"
          hint={`${rule.instructions.length}/1000 characters`}
        >
          <textarea
            className="field-input min-h-20 resize-y"
            value={rule.instructions}
            maxLength={1000}
            onChange={(event) =>
              onChange({ instructions: event.target.value })
            }
            disabled={disabled}
          />
        </Field>

        {error && (
          <div className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>
    </article>
  );
};

const SubjectsStep = ({
  form,
  setForm,
  classes,
  subjects,
  teachers,
  errors,
  disabled
}) => {
  const selectedClasses = form.applicableClasses
    .map((item) =>
      classes.find((record) => idOf(record) === item.classId)
    )
    .filter(Boolean);

  const [classId, setClassId] = useState("");

  useEffect(() => {
    if (!selectedClasses.length) {
      setClassId("");
      return;
    }
    if (!selectedClasses.some((record) => idOf(record) === classId)) {
      setClassId(idOf(selectedClasses[0]));
    }
  }, [selectedClasses, classId]);

  const classRecord = selectedClasses.find(
    (record) => idOf(record) === classId
  );
  const available = subjects.filter(
    (subject) => idOf(subject.classId) === classId
  );
  const rules = form.subjectRules.filter(
    (rule) => rule.classId === classId
  );
  const selectedSubjectIds = new Set(
    rules.map((rule) => rule.subjectId)
  );

  const add = (subject) => {
    if (disabled || selectedSubjectIds.has(idOf(subject))) return;
    setForm((current) => ({
      ...current,
      subjectRules: [
        ...current.subjectRules,
        createRule(classId, subject, current.subjectRules.length)
      ]
    }));
  };

  const updateRule = (subjectId, patch) =>
    setForm((current) => ({
      ...current,
      subjectRules: current.subjectRules.map((rule) =>
        rule.classId === classId && rule.subjectId === subjectId
          ? { ...rule, ...patch }
          : rule
      )
    }));

  const removeRule = (subjectId) =>
    setForm((current) => ({
      ...current,
      subjectRules: current.subjectRules.filter(
        (rule) =>
          !(
            rule.classId === classId &&
            rule.subjectId === subjectId
          )
      )
    }));

  return (
    <div className="space-y-5">
      {disabled && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Subject rules are read-only outside draft status.
        </div>
      )}

      {errors._root && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          {errors._root}
        </div>
      )}

      {!selectedClasses.length ? (
        <Panel
          icon={Layers3}
          title="Subject Rules"
          description="Select classes before assigning subjects."
        >
          <div className="py-12 text-center text-sm text-slate-500">
            No classes have been selected.
          </div>
        </Panel>
      ) : (
        <>
          <Panel
            icon={Layers3}
            title="Class"
            description="Choose the class whose subject rules you want to configure."
          >
            <div className="flex gap-2 overflow-x-auto">
              {selectedClasses.map((record) => {
                const value = idOf(record);
                const count = form.subjectRules.filter(
                  (rule) => rule.classId === value
                ).length;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setClassId(value)}
                    className={`shrink-0 rounded-xl border px-4 py-3 text-left ${
                      value === classId
                        ? "border-brand-200 bg-brand-50 text-brand-800"
                        : "border-slate-200 text-slate-700"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      {classNameOf(record)}
                    </p>
                    <p className="mt-0.5 text-xs opacity-70">
                      {count} rules
                    </p>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel
            icon={Plus}
            title={`Add Subjects — ${classNameOf(classRecord)}`}
            description="Add active subjects registered for this class."
            action={
              !disabled && (
                <button
                  type="button"
                  className="btn-secondary px-3 py-2"
                  onClick={() =>
                    available
                      .filter(
                        (subject) =>
                          !selectedSubjectIds.has(idOf(subject))
                      )
                      .forEach(add)
                  }
                >
                  <Check size={15} />
                  Add All
                </button>
              )
            }
          >
            {available.length ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {available.map((subject) => {
                  const subjectId = idOf(subject);
                  const selected = selectedSubjectIds.has(subjectId);
                  return (
                    <button
                      key={subjectId}
                      type="button"
                      onClick={() => add(subject)}
                      disabled={disabled || selected}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left ${
                        selected
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 text-slate-700 hover:border-brand-200"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          selected
                            ? "bg-emerald-100"
                            : "bg-slate-100"
                        }`}
                      >
                        {selected ? <Check size={16} /> : <Plus size={16} />}
                      </span>
                      <span className="truncate text-sm font-semibold">
                        {subjectNameOf(subject)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                No active subjects found for this class.
              </p>
            )}
          </Panel>

          <Panel
            icon={BookOpenCheck}
            title={`Assessment Rules — ${classNameOf(classRecord)}`}
            description="Configure marks, components, teachers and subject controls."
          >
            {rules.length ? (
              <div className="space-y-4">
                {rules.map((rule) => {
                  const subject = subjects.find(
                    (item) => idOf(item) === rule.subjectId
                  );
                  const key = `${rule.classId}:${rule.subjectId}`;
                  return (
                    <RuleCard
                      key={key}
                      rule={rule}
                      classRecord={classRecord}
                      subject={subject}
                      teachers={teachers}
                      error={errors[key]}
                      disabled={disabled}
                      onChange={(patch) =>
                        updateRule(rule.subjectId, patch)
                      }
                      onRemove={() => removeRule(rule.subjectId)}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                Add at least one subject rule for this class.
              </p>
            )}
          </Panel>
        </>
      )}
    </div>
  );
};

const ResultsStep = ({
  form,
  setForm,
  gradeSchemes,
  errors,
  disabled
}) => {
  const settings = form.resultSettings;

  const change = (field) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setForm((current) => ({
      ...current,
      resultSettings: {
        ...current.resultSettings,
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-5">
      <Panel
        icon={GraduationCap}
        title="Grade and Passing Rules"
        description="Overall passing policy and grade scheme."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field
            label="Grade scheme"
            error={errors.gradeSchemeId}
            className="md:col-span-2"
            hint="An active grade scheme is required before scheduling."
          >
            <select
              className="field-select"
              value={settings.gradeSchemeId}
              onChange={change("gradeSchemeId")}
              disabled={disabled}
            >
              <option value="">Select later</option>
              {gradeSchemes.map((scheme) => (
                <option key={scheme._id} value={scheme._id}>
                  {scheme.schemeName}
                  {scheme.isDefault ? " — Default" : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Minimum overall percentage"
            error={errors.minimumOverallPercentage}
          >
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="field-input"
              value={settings.minimumOverallPercentage}
              onChange={change("minimumOverallPercentage")}
              disabled={disabled}
            />
          </Field>

          <Field label="Percentage precision">
            <select
              className="field-select"
              value={settings.percentagePrecision}
              onChange={change("percentagePrecision")}
              disabled={disabled}
            >
              <option value="0">Whole number</option>
              <option value="1">1 decimal</option>
              <option value="2">2 decimals</option>
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Toggle
            checked={settings.failIfAnyRequiredSubjectFailed}
            onChange={change("failIfAnyRequiredSubjectFailed")}
            label="Fail if any required subject is failed"
            description="A failed or absent required subject makes the overall result fail."
            disabled={disabled}
          />
        </div>
      </Panel>

      <Panel
        icon={ShieldCheck}
        title="Visibility and Ranking"
        description="Control result access and student positions."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Result visibility">
            <select
              className="field-select"
              value={settings.visibility}
              onChange={change("visibility")}
              disabled={disabled}
            >
              <option value="private">Private</option>
              <option value="staff_only">Staff Only</option>
              <option value="published">Published</option>
            </select>
          </Field>

          <div className="md:col-span-2">
            <Toggle
              checked={settings.rankingEnabled}
              onChange={(event) => {
                const checked = event.target.checked;
                setForm((current) => ({
                  ...current,
                  resultSettings: {
                    ...current.resultSettings,
                    rankingEnabled: checked,
                    showClassPosition: checked
                      ? current.resultSettings.showClassPosition
                      : false,
                    showSectionPosition: checked
                      ? current.resultSettings.showSectionPosition
                      : false,
                    showSubjectPosition: checked
                      ? current.resultSettings.showSubjectPosition
                      : false
                  }
                }));
              }}
              label="Enable ranking"
              description="Allow class, section and subject position calculations."
              disabled={disabled}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ["showClassPosition", "Class position"],
            ["showSectionPosition", "Section position"],
            ["showSubjectPosition", "Subject position"]
          ].map(([field, label]) => (
            <Toggle
              key={field}
              checked={settings[field]}
              onChange={change(field)}
              label={label}
              disabled={disabled || !settings.rankingEnabled}
            />
          ))}
        </div>
      </Panel>

      <Panel
        icon={FileCheck2}
        title="Report Card Content"
        description="Choose visible report-card information and downloads."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["showGrade", "Show grade"],
            ["showGPA", "Show GPA"],
            ["includeAttendance", "Include attendance"],
            ["includeTeacherRemarks", "Teacher remarks"],
            ["includePrincipalRemarks", "Principal remarks"],
            ["publishReportCards", "Generate report cards"],
            ["allowStudentDownload", "Student download"],
            ["allowParentDownload", "Parent download"]
          ].map(([field, label]) => (
            <Toggle
              key={field}
              checked={settings[field]}
              onChange={change(field)}
              label={label}
              disabled={
                disabled ||
                (
                  ["allowStudentDownload", "allowParentDownload"].includes(
                    field
                  ) &&
                  !settings.publishReportCards
                )
              }
            />
          ))}
        </div>
      </Panel>
    </div>
  );
};

const ReviewStep = ({
  form,
  schools,
  classes,
  subjects,
  gradeSchemes,
  validation,
  goTo
}) => {
  const school = schools.find(
    (item) => idOf(item) === form.schoolId
  );
  const gradeScheme = gradeSchemes.find(
    (item) => idOf(item) === form.resultSettings.gradeSchemeId
  );

  return (
    <div className="space-y-5">
      {validation.length > 0 && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-rose-600"
            />
            <div>
              <p className="text-sm font-semibold text-rose-900">
                Complete these items before saving
              </p>
              <div className="mt-2 space-y-1 text-xs text-rose-700">
                {validation.slice(0, 10).map((item) => (
                  <button
                    key={`${item.step}-${item.message}`}
                    type="button"
                    className="block text-left hover:underline"
                    onClick={() => goTo(item.step)}
                  >
                    • {item.message}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-600 via-brand-500 to-blue-600 p-5 text-white shadow-card sm:p-6">
        <Badge tone="info">Draft Configuration</Badge>
        <h2 className="mt-4 text-2xl font-bold">
          {form.examName || "Untitled Examination"}
        </h2>
        <p className="mt-1 text-sm text-brand-100">
          {form.examCode || "No code"} · {titleCase(form.examType)} ·{" "}
          {form.academicYear || "No academic year"}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          icon={School}
          title="Identity"
          description="School and examination dates."
        >
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                School
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {school?.schoolName ||
                  school?.name ||
                  "Assigned school"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Dates
              </dt>
              <dd className="mt-1 font-medium text-slate-700">
                {formatDate(form.startDate)} – {formatDate(form.endDate)}
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel
          icon={UsersRound}
          title="Academic Scope"
          description="Classes and subject rules."
        >
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Classes</dt>
              <dd className="font-bold text-slate-900">
                {form.applicableClasses.length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Subject rules</dt>
              <dd className="font-bold text-slate-900">
                {form.subjectRules.length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Maximum marks</dt>
              <dd className="font-bold text-slate-900">
                {form.subjectRules.reduce(
                  (total, rule) => total + numberOf(rule.maxMarks),
                  0
                )}
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel
          icon={GraduationCap}
          title="Result Policy"
          description="Grade and report-card settings."
        >
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Grade scheme
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {gradeScheme?.schemeName || "Not assigned"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Ranking</dt>
              <dd className="font-medium text-slate-800">
                {form.resultSettings.rankingEnabled
                  ? "Enabled"
                  : "Disabled"}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      <Panel
        icon={UsersRound}
        title="Classes and Sections"
        description="Final scope included in the examination."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {form.applicableClasses.map((entry) => {
            const record = classes.find(
              (item) => idOf(item) === entry.classId
            );
            const ruleCount = form.subjectRules.filter(
              (rule) => rule.classId === entry.classId
            ).length;
            return (
              <div
                key={entry.classId}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex justify-between gap-3">
                  <p className="font-semibold text-slate-800">
                    {classNameOf(record)}
                  </p>
                  <Badge tone="info">{ruleCount} subjects</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {entry.allSections
                    ? "All sections"
                    : entry.sections.join(", ") || "No sections"}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        icon={BookOpenCheck}
        title="Subject Summary"
        description="Marks and component configuration."
      >
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Class",
                  "Subject",
                  "Maximum",
                  "Passing",
                  "Components"
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {form.subjectRules.map((rule) => {
                const classRecord = classes.find(
                  (item) => idOf(item) === rule.classId
                );
                const subject = subjects.find(
                  (item) => idOf(item) === rule.subjectId
                );
                return (
                  <tr key={`${rule.classId}:${rule.subjectId}`}>
                    <td className="px-4 py-3 text-slate-700">
                      {classNameOf(classRecord)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {subjectNameOf(subject)}
                    </td>
                    <td className="px-4 py-3">{rule.maxMarks}</td>
                    <td className="px-4 py-3">{rule.passingMarks}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      T {rule.theoryMarks} · P {rule.practicalMarks} · I{" "}
                      {rule.internalMarks}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

const ExamForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();

  const role = String(user?.role || "").toLowerCase();
  const isSuperAdmin = role === "super_admin";
  const isEdit = Boolean(id);

  const [form, setForm] = useState(freshForm);
  const [original, setOriginal] = useState(freshForm);
  const [exam, setExam] = useState(null);
  const [step, setStep] = useState(0);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [gradeSchemes, setGradeSchemes] = useState([]);
  const [constants, setConstants] = useState({});
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({
    fields: {},
    classes: {},
    subjects: {},
    form: ""
  });
  const [toast, setToast] = useState(null);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const examAbort = useRef(null);
  const setupAbort = useRef(null);
  const initialized = useRef(false);

  const closeToast = useCallback(() => setToast(null), []);
  const examStatus = exam?.status || "draft";
  const structuralLocked = isEdit && examStatus !== "draft";
  const editable =
    !isEdit || ["draft", "scheduled"].includes(examStatus);
  const dirty =
    JSON.stringify(form) !== JSON.stringify(original);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (!dirty || saving) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saving]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setSchools(user?.schoolId ? [user.schoolId] : []);
      return undefined;
    }

    let active = true;
    setSchoolsLoading(true);
    getSchools({ limit: 100, isActive: true })
      .then(({ data }) => {
        if (active) {
          setSchools(data?.schools || data?.data?.schools || []);
        }
      })
      .catch((error) => {
        if (active) {
          setToast({
            type: "error",
            message: errorMessage(error, "Schools could not be loaded.")
          });
        }
      })
      .finally(() => {
        if (active) setSchoolsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isSuperAdmin, user?.schoolId]);

  useEffect(() => {
    if (!isEdit) {
      const initial = freshForm();
      initial.schoolId =
        cleanText(location.state?.schoolId) || idOf(user?.schoolId);
      initial.academicYear = user?.schoolId?.sessionYear || "";
      setForm(initial);
      setOriginal(initial);
      initialized.current = true;
      setLoading(false);
      return undefined;
    }

    examAbort.current?.abort();
    const controller = new AbortController();
    examAbort.current = controller;
    setLoading(true);

    getExamById(id, { signal: controller.signal })
      .then(({ data }) => {
        const record = data?.exam || data?.data?.exam;
        if (!record) throw new Error("Exam data was not returned.");
        const mapped = mapExam(record);
        setExam(record);
        setForm(mapped);
        setOriginal(mapped);
        initialized.current = true;
      })
      .catch((error) => {
        if (!cancelled(error)) {
          setErrors((current) => ({
            ...current,
            form: errorMessage(error, "Exam could not be loaded.")
          }));
        }
      })
      .finally(() => {
        if (examAbort.current === controller) setLoading(false);
      });

    return () => controller.abort();
  }, [id, isEdit, location.state?.schoolId, user?.schoolId]);

  const loadSetup = useCallback(
    async (schoolId, academicYear) => {
      if (!schoolId) {
        setClasses([]);
        setSubjects([]);
        setTeachers([]);
        setGradeSchemes([]);
        return;
      }

      setupAbort.current?.abort();
      const controller = new AbortController();
      setupAbort.current = controller;
      setSetupLoading(true);

      try {
        const { data } = await getExamSetupOptions(
          {
            schoolId: isSuperAdmin ? schoolId : undefined,
            academicYear: academicYear || undefined
          },
          { signal: controller.signal }
        );

        setClasses(data?.classes || data?.data?.classes || []);
        setSubjects(data?.subjects || data?.data?.subjects || []);
        setTeachers(data?.teachers || data?.data?.teachers || []);
        setGradeSchemes(
          data?.gradeSchemes || data?.data?.gradeSchemes || []
        );
        setConstants(data?.constants || data?.data?.constants || {});

        const defaultYear =
          data?.academicYear || data?.data?.academicYear;
        if (!isEdit && !form.academicYear && defaultYear) {
          setForm((current) => ({
            ...current,
            academicYear: defaultYear
          }));
        }
      } catch (error) {
        if (!cancelled(error)) {
          setToast({
            type: "error",
            message: errorMessage(
              error,
              "Exam setup options could not be loaded."
            )
          });
        }
      } finally {
        if (setupAbort.current === controller) setSetupLoading(false);
      }
    },
    [isSuperAdmin, isEdit, form.academicYear]
  );

  useEffect(() => {
    if (!initialized.current || !form.schoolId) return undefined;
    const timer = window.setTimeout(
      () => loadSetup(form.schoolId, form.academicYear),
      250
    );
    return () => window.clearTimeout(timer);
  }, [form.schoolId, form.academicYear, loadSetup]);

  const examTypes =
    constants?.examTypes?.length
      ? constants.examTypes
      : DEFAULT_TYPES;

  const validation = useMemo(() => {
    const result = [];
    const fields = {};
    const classErrors = {};
    const subjectErrors = {};

    if (isSuperAdmin && !form.schoolId) {
      fields.schoolId = "Select a school.";
      result.push({ step: 0, message: fields.schoolId });
    }
    if (codeText(form.examCode).length < 2) {
      fields.examCode = "Exam code must contain at least 2 characters.";
      result.push({ step: 0, message: fields.examCode });
    }
    if (cleanText(form.examName).length < 3) {
      fields.examName = "Exam name must contain at least 3 characters.";
      result.push({ step: 0, message: fields.examName });
    }
    if (!examTypes.includes(form.examType)) {
      fields.examType = "Select a valid exam type.";
      result.push({ step: 0, message: fields.examType });
    }
    if (!cleanText(form.academicYear)) {
      fields.academicYear = "Academic year is required.";
      result.push({ step: 0, message: fields.academicYear });
    }
    if (!form.startDate) {
      fields.startDate = "Start date is required.";
      result.push({ step: 0, message: fields.startDate });
    }
    if (!form.endDate) {
      fields.endDate = "End date is required.";
      result.push({ step: 0, message: fields.endDate });
    }
    if (
      form.startDate &&
      form.endDate &&
      new Date(form.endDate) < new Date(form.startDate)
    ) {
      fields.endDate = "End date cannot be before the start date.";
      result.push({ step: 0, message: fields.endDate });
    }
    if (
      form.marksEntryOpensAt &&
      form.marksEntryClosesAt &&
      new Date(form.marksEntryClosesAt) <
        new Date(form.marksEntryOpensAt)
    ) {
      fields.marksEntryClosesAt =
        "Marks entry closing time cannot be before opening time.";
      result.push({ step: 0, message: fields.marksEntryClosesAt });
    }
    if (
      form.resultPublicationDate &&
      form.endDate &&
      new Date(form.resultPublicationDate) <
        new Date(`${form.endDate}T00:00`)
    ) {
      fields.resultPublicationDate =
        "Publication cannot be before the exam end date.";
      result.push({ step: 0, message: fields.resultPublicationDate });
    }

    if (!form.applicableClasses.length) {
      classErrors._root = "Select at least one class.";
      result.push({ step: 1, message: classErrors._root });
    }
    form.applicableClasses.forEach((entry) => {
      if (!entry.allSections && !entry.sections.length) {
        classErrors[entry.classId] =
          "Select at least one section or include all sections.";
        result.push({ step: 1, message: classErrors[entry.classId] });
      }
    });

    if (!form.subjectRules.length) {
      subjectErrors._root = "Add at least one subject rule.";
      result.push({ step: 2, message: subjectErrors._root });
    }

    form.applicableClasses.forEach((entry) => {
      const count = form.subjectRules.filter(
        (rule) => rule.classId === entry.classId
      ).length;
      if (!count) {
        const record = classes.find(
          (item) => idOf(item) === entry.classId
        );
        const message = `${classNameOf(
          record
        )} requires at least one subject rule.`;
        subjectErrors[`class:${entry.classId}`] = message;
        result.push({ step: 2, message });
      }
    });

    form.subjectRules.forEach((rule) => {
      const issues = [];
      const maximum = numberOf(rule.maxMarks);
      const passing = numberOf(rule.passingMarks);
      const total = componentTotal(rule);

      if (maximum < 1) issues.push("Maximum marks must be at least 1.");
      if (passing < 0 || passing > maximum) {
        issues.push("Passing marks are invalid.");
      }
      if (total > 0 && total !== maximum) {
        issues.push(`Component total ${total} must equal ${maximum}.`);
      }
      if (
        rule.requiresPractical &&
        numberOf(rule.practicalMarks) <= 0
      ) {
        issues.push("Practical marks are required.");
      }
      if (
        numberOf(rule.weightagePercentage) < 0 ||
        numberOf(rule.weightagePercentage) > 100
      ) {
        issues.push("Weightage must be between 0 and 100.");
      }
      if (
        rule.allowGraceMarks &&
        numberOf(rule.graceMarksLimit) > passing
      ) {
        issues.push("Grace marks cannot exceed passing marks.");
      }

      if (issues.length) {
        const key = `${rule.classId}:${rule.subjectId}`;
        subjectErrors[key] = issues.join(" ");
        result.push({ step: 2, message: subjectErrors[key] });
      }
    });

    if (
      numberOf(form.resultSettings.minimumOverallPercentage) < 0 ||
      numberOf(form.resultSettings.minimumOverallPercentage) > 100
    ) {
      fields.minimumOverallPercentage =
        "Minimum percentage must be between 0 and 100.";
      result.push({
        step: 3,
        message: fields.minimumOverallPercentage
      });
    }

    return {
      list: result,
      fields,
      classes: classErrors,
      subjects: subjectErrors
    };
  }, [
    form,
    isSuperAdmin,
    examTypes,
    classes
  ]);

  const saveExam = async () => {
    if (!online) {
      setToast({
        type: "error",
        message: "Reconnect before saving the exam."
      });
      return;
    }
    if (!editable) {
      setToast({
        type: "error",
        message: "This exam is read-only in its current status."
      });
      return;
    }

    setErrors({
      fields: validation.fields,
      classes: validation.classes,
      subjects: validation.subjects,
      form: ""
    });

    if (validation.list.length) {
      setStep(validation.list[0].step);
      setToast({
        type: "error",
        message: "Fix the highlighted validation items before saving."
      });
      return;
    }

    setSaving(true);
    try {
      const payload =
        isEdit &&
        examStatus === "scheduled"
          ? buildScheduledPayload(form)
          : buildPayload(form);

      const request = isEdit
        ? updateExam(id, payload)
        : createExam(payload);
      const { data } = await request;
      const saved = data?.exam || data?.data?.exam;
      if (saved) {
        const mapped = mapExam(saved);
        setForm(mapped);
        setOriginal(mapped);
      } else {
        setOriginal(form);
      }
      setToast({
        type: "success",
        message: isEdit
          ? "Exam updated successfully."
          : "Exam created successfully."
      });
      window.setTimeout(
        () =>
          navigate("/exams", {
            replace: true,
            state: {
              savedExamId: saved?._id || id
            }
          }),
        500
      );
    } catch (error) {
      const message = errorMessage(
        error,
        isEdit
          ? "Exam could not be updated."
          : "Exam could not be created."
      );
      setErrors((current) => ({ ...current, form: message }));
      setToast({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const schoolChange = (event) => {
    const schoolId = event.target.value;
    const school = schools.find((item) => idOf(item) === schoolId);
    setForm((current) => ({
      ...current,
      schoolId,
      academicYear: school?.sessionYear || current.academicYear,
      applicableClasses: [],
      subjectRules: [],
      resultSettings: {
        ...current.resultSettings,
        gradeSchemeId: ""
      }
    }));
  };

  const resetChanges = () => {
    setForm(original);
    setErrors({
      fields: {},
      classes: {},
      subjects: {},
      form: ""
    });
    setStep(0);
    setResetOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (isEdit && !exam && errors.form) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Exam"
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/exams")}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          }
        />
        <div className="card p-8 text-center">
          <AlertCircle size={34} className="mx-auto text-rose-500" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Exam could not be loaded
          </h2>
          <p className="mt-2 text-sm text-slate-500">{errors.form}</p>
          <button
            type="button"
            className="btn-primary mt-5"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const CurrentIcon = STEPS[step].icon;

  return (
    <div className="space-y-5 pb-4">
      <Toast toast={toast} onClose={closeToast} />

      <PageHeader
        title={isEdit ? "Edit Examination" : "Create Examination"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                dirty ? setLeaveOpen(true) : navigate("/exams")
              }
              disabled={saving}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            {dirty && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setResetOpen(true)}
                disabled={saving}
              >
                <RotateCcw size={15} />
                Reset
              </button>
            )}

            <button
              type="button"
              className="btn-primary"
              onClick={saveExam}
              disabled={saving || !online || !editable}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Exam
                </>
              )}
            </button>
          </div>
        }
      />

      {!online && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          You are offline. Saving is disabled until the connection returns.
        </div>
      )}

      {!editable && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
          This exam is read-only after the examination workflow starts.
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-600 via-brand-500 to-blue-600 p-5 text-white shadow-card sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-brand-100">
              <CurrentIcon size={18} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Exam Setup
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-bold">
              {form.examName || "Configure a complete examination"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-50/90">
              Define academic scope, subject assessment rules and result
              publication settings.
            </p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 p-3 sm:min-w-52">
            <p className="text-xs text-brand-100">Form state</p>
            <p className="mt-1 text-sm font-semibold">
              {dirty ? "Unsaved changes" : "Up to date"}
            </p>
          </div>
        </div>
      </section>

      <section className="card p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-5">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            const active = index === step;
            const completed = index < step;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(index)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left ${
                  active
                    ? "border-brand-200 bg-brand-50 text-brand-800"
                    : completed
                      ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                      : "border-transparent bg-slate-50 text-slate-600"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    active
                      ? "bg-brand-600 text-white"
                      : completed
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-slate-400"
                  }`}
                >
                  {completed ? <Check size={16} /> : <Icon size={16} />}
                </span>
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {errors.form && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          {errors.form}
        </div>
      )}

      {setupLoading && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <div className="flex items-center gap-3">
            <Loader2 size={17} className="animate-spin" />
            Loading classes, subjects, teachers and grade schemes...
          </div>
        </div>
      )}

      {step === 0 && (
        <BasicStep
          form={form}
          setForm={setForm}
          errors={errors.fields}
          schools={schools}
          isSuperAdmin={isSuperAdmin}
          schoolsLoading={schoolsLoading}
          types={examTypes}
          locked={structuralLocked}
          scheduled={isEdit && examStatus === "scheduled"}
          readOnly={!editable}
          schoolLocked={isEdit}
          onSchoolChange={schoolChange}
        />
      )}

      {step === 1 && (
        <ClassesStep
          form={form}
          setForm={setForm}
          classes={classes}
          errors={errors.classes}
          disabled={structuralLocked || !editable}
        />
      )}

      {step === 2 && (
        <SubjectsStep
          form={form}
          setForm={setForm}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          errors={errors.subjects}
          disabled={structuralLocked || !editable}
        />
      )}

      {step === 3 && (
        <ResultsStep
          form={form}
          setForm={setForm}
          gradeSchemes={gradeSchemes}
          errors={errors.fields}
          disabled={!editable}
        />
      )}

      {step === 4 && (
        <ReviewStep
          form={form}
          schools={schools}
          classes={classes}
          subjects={subjects}
          gradeSchemes={gradeSchemes}
          validation={validation.list}
          goTo={setStep}
        />
      )}

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-7xl justify-between gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0 || saving}
          >
            <ArrowLeft size={16} />
            Previous
          </button>

          {step === STEPS.length - 1 ? (
            <button
              type="button"
              className="btn-primary"
              onClick={saveExam}
              disabled={saving || !online || !editable}
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save Exam
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                setStep((current) =>
                  Math.min(STEPS.length - 1, current + 1)
                )
              }
              disabled={saving}
            >
              Continue
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => navigate("/exams")}
        title="Leave Exam Form"
        description="You have unsaved changes. Leaving now will discard them."
        confirmLabel="Discard and Leave"
        tone="danger"
      />

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={resetChanges}
        title="Reset Changes"
        description="Restore the form to its last saved state?"
        confirmLabel="Reset Changes"
        tone="warning"
      />
    </div>
  );
};

export default ExamForm;
