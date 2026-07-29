import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  ListChecks,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  Users,
  XCircle
} from "lucide-react";

import {
  deleteStudentAttendance,
  getStudentAttendance,
  markStudentAttendance,
  updateStudentAttendance
} from "../../api/attendance";

import { getClasses } from "../../api/classes";
import { getSchools } from "../../api/schools";
import { getStudents } from "../../api/students";
import { useAuth } from "../../context/AuthContext";

import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import {
  EmptyState,
  Table,
  Td
} from "../../components/ui/Table";

const getLocalDateValue = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(
    date.getTime() - offset * 60 * 1000
  );

  return localDate.toISOString().slice(0, 10);
};

const getCurrentMonth = () => {
  return getLocalDateValue().slice(0, 7);
};

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
};

const attendanceStatuses = [
  {
    value: "present",
    label: "Present",
    activeClass:
      "border-emerald-500 bg-emerald-50 text-emerald-700"
  },
  {
    value: "absent",
    label: "Absent",
    activeClass:
      "border-rose-500 bg-rose-50 text-rose-700"
  },
  {
    value: "late",
    label: "Late",
    activeClass:
      "border-amber-500 bg-amber-50 text-amber-700"
  },
  {
    value: "leave",
    label: "Leave",
    activeClass:
      "border-sky-500 bg-sky-50 text-sky-700"
  }
];

const statusTones = {
  present: "success",
  absent: "danger",
  late: "warning",
  leave: "info"
};

const getStudentName = (student) => {
  return (
    student?.studentUserId?.name ||
    student?.name ||
    "Student"
  );
};

const getInitials = (name = "") => {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "S"
  );
};

const buildSummary = (records = []) => {
  return records.reduce(
    (summary, record) => {
      summary.total += 1;

      if (
        Object.prototype.hasOwnProperty.call(
          summary,
          record.status
        )
      ) {
        summary[record.status] += 1;
      }

      return summary;
    },
    {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      leave: 0
    }
  );
};

const SummaryCard = ({
  icon: Icon,
  label,
  value
}) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          <Icon size={17} />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-0.5 text-lg font-bold text-slate-800">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

const AttendanceStatusButtons = ({
  value,
  onChange,
  disabled = false
}) => {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
      {attendanceStatuses.map((status) => {
        const active = value === status.value;

        return (
          <button
            key={status.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(status.value)}
            className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? status.activeClass
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {status.label}
          </button>
        );
      })}
    </div>
  );
};

const AttendanceList = () => {
  const { user: currentUser } = useAuth();

  const isSuperAdmin =
    currentUser?.role === "super_admin";

  const canDelete = [
    "super_admin",
    "principal"
  ].includes(currentUser?.role);

  const currentSchoolId =
    currentUser?.schoolId?._id ||
    currentUser?.schoolId ||
    "";

  const [activeTab, setActiveTab] =
    useState("mark");

  const [schools, setSchools] = useState([]);

  const [markClasses, setMarkClasses] =
    useState([]);

  const [historyClasses, setHistoryClasses] =
    useState([]);

  const [markFilters, setMarkFilters] = useState({
    schoolId: "",
    classId: "",
    sectionName: "",
    attendanceDate: getLocalDateValue()
  });

  const [historyFilters, setHistoryFilters] =
    useState({
      schoolId: "",
      classId: "",
      sectionName: "",
      month: getCurrentMonth(),
      page: 1,
      limit: 10
    });

  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});

  const [
    currentAttendance,
    setCurrentAttendance
  ] = useState(null);

  const [loadedSelection, setLoadedSelection] =
    useState(null);

  const [loadingRoster, setLoadingRoster] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [historyRefreshing, setHistoryRefreshing] =
    useState(false);

  const [historyPagination, setHistoryPagination] =
    useState({
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    });

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const effectiveMarkSchoolId = isSuperAdmin
    ? markFilters.schoolId
    : currentSchoolId;

  const effectiveHistorySchoolId = isSuperAdmin
    ? historyFilters.schoolId
    : currentSchoolId;

  const selectedMarkClass = useMemo(() => {
    return markClasses.find(
      (classItem) =>
        classItem._id === markFilters.classId
    );
  }, [markClasses, markFilters.classId]);

  const markSections =
    selectedMarkClass?.sections || [];

  const selectedHistoryClass = useMemo(() => {
    return historyClasses.find(
      (classItem) =>
        classItem._id === historyFilters.classId
    );
  }, [historyClasses, historyFilters.classId]);

  const historySections =
    selectedHistoryClass?.sections || [];

  const recordList = useMemo(() => {
    return students.map((student) => ({
      studentId: student._id,
      status:
        records[student._id]?.status || "present",
      remarks:
        records[student._id]?.remarks || ""
    }));
  }, [records, students]);

  const currentSummary = useMemo(() => {
    return buildSummary(recordList);
  }, [recordList]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setSchools([]);
      return;
    }

    const loadSchools = async () => {
      try {
        const { data } = await getSchools();

        setSchools(
          (data?.schools || []).filter(
            (school) => school.isActive
          )
        );
      } catch {
        setSchools([]);
      }
    };

    loadSchools();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSuccess("");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!effectiveMarkSchoolId) {
      setMarkClasses([]);
      return;
    }

    let active = true;

    const loadClasses = async () => {
      try {
        const params = isSuperAdmin
          ? {
              schoolId: effectiveMarkSchoolId,
              isActive: true
            }
          : {
              isActive: true
            };

        const { data } = await getClasses(params);

        if (active) {
          setMarkClasses(data?.classes || []);
        }
      } catch {
        if (active) {
          setMarkClasses([]);
        }
      }
    };

    loadClasses();

    return () => {
      active = false;
    };
  }, [effectiveMarkSchoolId, isSuperAdmin]);

  useEffect(() => {
    if (!effectiveHistorySchoolId) {
      setHistoryClasses([]);
      return;
    }

    let active = true;

    const loadClasses = async () => {
      try {
        const params = isSuperAdmin
          ? {
              schoolId: effectiveHistorySchoolId,
              isActive: true
            }
          : {
              isActive: true
            };

        const { data } = await getClasses(params);

        if (active) {
          setHistoryClasses(data?.classes || []);
        }
      } catch {
        if (active) {
          setHistoryClasses([]);
        }
      }
    };

    loadClasses();

    return () => {
      active = false;
    };
  }, [effectiveHistorySchoolId, isSuperAdmin]);

  const clearRoster = () => {
    setStudents([]);
    setRecords({});
    setCurrentAttendance(null);
    setLoadedSelection(null);
  };

  const updateMarkFilter = (key) => {
    return (event) => {
      const value = event.target.value;

      setMarkFilters((current) => {
        const next = {
          ...current,
          [key]: value
        };

        if (key === "schoolId") {
          next.classId = "";
          next.sectionName = "";
        }

        if (key === "classId") {
          next.sectionName = "";
        }

        return next;
      });

      clearRoster();
      setError("");
    };
  };

  const updateHistoryFilter = (key) => {
    return (event) => {
      const value = event.target.value;

      setHistoryFilters((current) => {
        const next = {
          ...current,
          [key]: value,
          page: 1
        };

        if (key === "schoolId") {
          next.classId = "";
          next.sectionName = "";
        }

        if (key === "classId") {
          next.sectionName = "";
        }

        return next;
      });
    };
  };

  const fetchAllStudents = async ({
    schoolId,
    classId,
    sectionName
  }) => {
    const allStudents = [];
    let page = 1;
    let totalPages = 1;

    do {
      const params = {
        classId,
        sectionName,
        status: "active",
        page,
        limit: 100
      };

      if (isSuperAdmin) {
        params.schoolId = schoolId;
      }

      const { data } = await getStudents(params);

      allStudents.push(...(data?.students || []));

      totalPages =
        data?.pagination?.totalPages || 1;

      page += 1;
    } while (page <= totalPages);

    return allStudents;
  };

  const loadRoster = async (
    selection = markFilters
  ) => {
    const schoolId = isSuperAdmin
      ? selection.schoolId
      : currentSchoolId;

    if (!schoolId) {
      setError("Please select a school.");
      return;
    }

    if (!selection.classId) {
      setError("Please select a class.");
      return;
    }

    if (!selection.sectionName) {
      setError("Please select a section.");
      return;
    }

    if (!selection.attendanceDate) {
      setError("Please select an attendance date.");
      return;
    }

    setLoadingRoster(true);
    setError("");
    setSuccess("");

    try {
      const [roster, attendanceResponse] =
        await Promise.all([
          fetchAllStudents({
            schoolId,
            classId: selection.classId,
            sectionName: selection.sectionName
          }),

          getStudentAttendance({
            ...(isSuperAdmin
              ? {
                  schoolId
                }
              : {}),

            classId: selection.classId,
            sectionName: selection.sectionName,
            date: selection.attendanceDate,
            page: 1,
            limit: 10
          })
        ]);

      const existingAttendance =
        attendanceResponse.data?.attendance?.[0] ||
        null;

      const existingRecords = new Map(
        (existingAttendance?.records || []).map(
          (record) => [
            record.studentId?._id ||
              record.studentId,
            {
              status: record.status,
              remarks: record.remarks || ""
            }
          ]
        )
      );

      const nextRecords = {};

      roster.forEach((student) => {
        nextRecords[student._id] =
          existingRecords.get(student._id) || {
            status: "present",
            remarks: ""
          };
      });

      setStudents(roster);
      setRecords(nextRecords);
      setCurrentAttendance(existingAttendance);

      setLoadedSelection({
        schoolId,
        classId: selection.classId,
        sectionName: selection.sectionName,
        attendanceDate: selection.attendanceDate
      });

      if (roster.length === 0) {
        setError(
          "No active students were found in this class and section."
        );
      }
    } catch (requestError) {
      clearRoster();

      setError(
        requestError.response?.data?.message ||
          "Attendance roster could not be loaded."
      );
    } finally {
      setLoadingRoster(false);
    }
  };

  const updateStudentRecord = (
    studentId,
    field,
    value
  ) => {
    setRecords((current) => ({
      ...current,

      [studentId]: {
        status:
          current[studentId]?.status || "present",

        remarks:
          current[studentId]?.remarks || "",

        [field]: value
      }
    }));
  };

  const markAll = (status) => {
    setRecords((current) => {
      const next = {
        ...current
      };

      students.forEach((student) => {
        next[student._id] = {
          status,
          remarks:
            current[student._id]?.remarks || ""
        };
      });

      return next;
    });
  };

  const handleSaveAttendance = async () => {
    if (!loadedSelection) {
      setError("Load the student roster first.");
      return;
    }

    if (recordList.length === 0) {
      setError("No students are available to mark.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      classId: loadedSelection.classId,
      sectionName: loadedSelection.sectionName,
      attendanceDate:
        loadedSelection.attendanceDate,
      records: recordList
    };

    if (isSuperAdmin) {
      payload.schoolId = loadedSelection.schoolId;
    }

    try {
      const { data } = currentAttendance?._id
        ? await updateStudentAttendance(
            currentAttendance._id,
            {
              records: recordList
            }
          )
        : await markStudentAttendance(payload);

      setCurrentAttendance(
        data?.attendance || currentAttendance
      );

      setSuccess(
        data?.message ||
          "Attendance saved successfully."
      );

      if (activeTab === "history") {
        fetchHistory({
          silent: true
        });
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Attendance could not be saved."
      );
    } finally {
      setSaving(false);
    }
  };

  const historyParams = useMemo(() => {
    const params = {
      page: historyFilters.page,
      limit: historyFilters.limit
    };

    if (
      isSuperAdmin &&
      historyFilters.schoolId
    ) {
      params.schoolId =
        historyFilters.schoolId;
    }

    if (historyFilters.classId) {
      params.classId =
        historyFilters.classId;
    }

    if (historyFilters.sectionName) {
      params.sectionName =
        historyFilters.sectionName;
    }

    if (historyFilters.month) {
      params.month = historyFilters.month;
    }

    return params;
  }, [
    historyFilters,
    isSuperAdmin
  ]);

  const fetchHistory = async ({
    silent = false
  } = {}) => {
    if (silent) {
      setHistoryRefreshing(true);
    } else {
      setHistoryLoading(true);
    }

    setError("");

    try {
      const { data } =
        await getStudentAttendance(historyParams);

      setHistory(data?.attendance || []);

      setHistoryPagination(
        data?.pagination || {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      );
    } catch (requestError) {
      setHistory([]);

      setError(
        requestError.response?.data?.message ||
          "Attendance history could not be loaded."
      );
    } finally {
      setHistoryLoading(false);
      setHistoryRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "history") {
      return;
    }

    fetchHistory();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, historyParams]);

  const openAttendance = async (attendance) => {
    const schoolId =
      attendance.schoolId?._id ||
      attendance.schoolId;

    const classId =
      attendance.classId?._id ||
      attendance.classId;

    const attendanceDate = getLocalDateValue(
      new Date(attendance.attendanceDate)
    );

    const selection = {
      schoolId,
      classId,
      sectionName: attendance.sectionName,
      attendanceDate
    };

    setMarkFilters(selection);
    setActiveTab("mark");

    await loadRoster(selection);
  };

  const handleDeleteAttendance = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const { data } =
        await deleteStudentAttendance(
          deleteTarget._id
        );

      setDeleteTarget(null);

      setSuccess(
        data?.message ||
          "Attendance deleted successfully."
      );

      if (
        currentAttendance?._id ===
        deleteTarget._id
      ) {
        clearRoster();
      }

      fetchHistory({
        silent: true
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Attendance could not be deleted."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Attendance"
        action={
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveTab("mark")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === "mark"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Mark Attendance
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === "history"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              History
            </button>
          </div>
        }
      />

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {activeTab === "mark" ? (
        <div className="space-y-5">
          <section className="card p-4 sm:p-5">
            <div
              className={`grid gap-3 md:grid-cols-2 ${
                isSuperAdmin
                  ? "xl:grid-cols-[repeat(4,minmax(170px,1fr))_auto]"
                  : "xl:grid-cols-[repeat(3,minmax(190px,1fr))_auto]"
              }`}
            >
              {isSuperAdmin && (
                <select
                  className="field-select"
                  value={markFilters.schoolId}
                  onChange={updateMarkFilter(
                    "schoolId"
                  )}
                >
                  <option value="">
                    Select school
                  </option>

                  {schools.map((school) => (
                    <option
                      key={school._id}
                      value={school._id}
                    >
                      {school.schoolName}
                    </option>
                  ))}
                </select>
              )}

              <select
                className="field-select"
                disabled={!effectiveMarkSchoolId}
                value={markFilters.classId}
                onChange={updateMarkFilter(
                  "classId"
                )}
              >
                <option value="">
                  Select class
                </option>

                {markClasses.map((classItem) => (
                  <option
                    key={classItem._id}
                    value={classItem._id}
                  >
                    {classItem.className}
                  </option>
                ))}
              </select>

              <select
                className="field-select"
                disabled={!markFilters.classId}
                value={markFilters.sectionName}
                onChange={updateMarkFilter(
                  "sectionName"
                )}
              >
                <option value="">
                  Select section
                </option>

                {markSections.map((section) => (
                  <option
                    key={section._id}
                    value={section.sectionName}
                  >
                    {section.sectionName}
                  </option>
                ))}
              </select>

              <input
                type="date"
                className="field-input"
                value={
                  markFilters.attendanceDate
                }
                onChange={updateMarkFilter(
                  "attendanceDate"
                )}
                max={getLocalDateValue()}
              />

              <button
                type="button"
                className="btn-primary"
                disabled={loadingRoster}
                onClick={() => loadRoster()}
              >
                {loadingRoster ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <ListChecks size={16} />
                )}

                {loadingRoster
                  ? "Loading..."
                  : "Load Students"}
              </button>
            </div>
          </section>

          {loadedSelection && (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                  icon={Users}
                  label="Total"
                  value={currentSummary.total}
                />

                <SummaryCard
                  icon={CheckCircle2}
                  label="Present"
                  value={currentSummary.present}
                />

                <SummaryCard
                  icon={XCircle}
                  label="Absent"
                  value={currentSummary.absent}
                />

                <SummaryCard
                  icon={Clock3}
                  label="Late"
                  value={currentSummary.late}
                />

                <SummaryCard
                  icon={CalendarDays}
                  label="Leave"
                  value={currentSummary.leave}
                />
              </section>

              <section className="card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-slate-800">
                        Student Attendance
                      </h2>

                      <Badge
                        tone={
                          currentAttendance
                            ? "warning"
                            : "info"
                        }
                      >
                        {currentAttendance
                          ? "Existing Record"
                          : "New Record"}
                      </Badge>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {
                        selectedMarkClass?.className
                      }{" "}
                      /{" "}
                      {loadedSelection.sectionName} ·{" "}
                      {loadedSelection.attendanceDate}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        markAll("present")
                      }
                    >
                      Mark All Present
                    </button>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        markAll("absent")
                      }
                    >
                      Mark All Absent
                    </button>
                  </div>
                </div>

                <div className="hidden p-4 lg:block lg:p-5">
                  <Table
                    columns={[
                      "Student",
                      "Admission No.",
                      "Status",
                      "Remarks"
                    ]}
                  >
                    {students.length === 0 ? (
                      <EmptyState
                        colSpan={4}
                        icon={Users}
                        title="No active students"
                        description="No students are available in this class and section"
                      />
                    ) : (
                      students.map((student) => (
                        <tr
                          key={student._id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <Td>
                            <div className="flex min-w-[220px] items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                                {getInitials(
                                  getStudentName(
                                    student
                                  )
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-800">
                                  {getStudentName(
                                    student
                                  )}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                  {student.fatherName ||
                                    "No father name"}
                                </p>
                              </div>
                            </div>
                          </Td>

                          <Td>
                            <span className="font-semibold text-slate-600">
                              {
                                student.admissionNumber
                              }
                            </span>
                          </Td>

                          <Td>
                            <AttendanceStatusButtons
                              value={
                                records[student._id]
                                  ?.status ||
                                "present"
                              }
                              onChange={(status) =>
                                updateStudentRecord(
                                  student._id,
                                  "status",
                                  status
                                )
                              }
                            />
                          </Td>

                          <Td>
                            <input
                              className="field-input min-w-[220px]"
                              maxLength={300}
                              value={
                                records[student._id]
                                  ?.remarks || ""
                              }
                              onChange={(event) =>
                                updateStudentRecord(
                                  student._id,
                                  "remarks",
                                  event.target.value
                                )
                              }
                              placeholder="Optional remarks"
                            />
                          </Td>
                        </tr>
                      ))
                    )}
                  </Table>
                </div>

                <div className="divide-y divide-slate-100 lg:hidden">
                  {students.map((student) => (
                    <article
                      key={student._id}
                      className="p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                          {getInitials(
                            getStudentName(student)
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-slate-800">
                            {getStudentName(student)}
                          </h3>

                          <p className="text-xs text-slate-500">
                            {
                              student.admissionNumber
                            }
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <AttendanceStatusButtons
                          value={
                            records[student._id]
                              ?.status || "present"
                          }
                          onChange={(status) =>
                            updateStudentRecord(
                              student._id,
                              "status",
                              status
                            )
                          }
                        />
                      </div>

                      <input
                        className="field-input mt-3"
                        maxLength={300}
                        value={
                          records[student._id]
                            ?.remarks || ""
                        }
                        onChange={(event) =>
                          updateStudentRecord(
                            student._id,
                            "remarks",
                            event.target.value
                          )
                        }
                        placeholder="Optional remarks"
                      />
                    </article>
                  ))}
                </div>

                <div className="flex justify-end border-t border-slate-100 p-4 sm:p-5">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={
                      saving ||
                      students.length === 0
                    }
                    onClick={handleSaveAttendance}
                  >
                    {saving ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={16} />
                    )}

                    {saving
                      ? "Saving..."
                      : currentAttendance
                        ? "Update Attendance"
                        : "Save Attendance"}
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      ) : (
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div
              className={`grid gap-3 md:grid-cols-2 ${
                isSuperAdmin
                  ? "xl:grid-cols-[repeat(4,minmax(160px,1fr))_auto]"
                  : "xl:grid-cols-[repeat(3,minmax(180px,1fr))_auto]"
              }`}
            >
              {isSuperAdmin && (
                <select
                  className="field-select"
                  value={
                    historyFilters.schoolId
                  }
                  onChange={updateHistoryFilter(
                    "schoolId"
                  )}
                >
                  <option value="">
                    All schools
                  </option>

                  {schools.map((school) => (
                    <option
                      key={school._id}
                      value={school._id}
                    >
                      {school.schoolName}
                    </option>
                  ))}
                </select>
              )}

              <select
                className="field-select"
                value={historyFilters.classId}
                disabled={
                  isSuperAdmin &&
                  !effectiveHistorySchoolId
                }
                onChange={updateHistoryFilter(
                  "classId"
                )}
              >
                <option value="">
                  All classes
                </option>

                {historyClasses.map(
                  (classItem) => (
                    <option
                      key={classItem._id}
                      value={classItem._id}
                    >
                      {classItem.className}
                    </option>
                  )
                )}
              </select>

              <select
                className="field-select"
                value={
                  historyFilters.sectionName
                }
                disabled={
                  !historyFilters.classId
                }
                onChange={updateHistoryFilter(
                  "sectionName"
                )}
              >
                <option value="">
                  All sections
                </option>

                {historySections.map(
                  (section) => (
                    <option
                      key={section._id}
                      value={section.sectionName}
                    >
                      {section.sectionName}
                    </option>
                  )
                )}
              </select>

              <input
                type="month"
                className="field-input"
                value={historyFilters.month}
                onChange={updateHistoryFilter(
                  "month"
                )}
              />

              <button
                type="button"
                className="btn-secondary"
                disabled={historyRefreshing}
                onClick={() =>
                  fetchHistory({
                    silent: true
                  })
                }
              >
                <RefreshCw
                  size={16}
                  className={
                    historyRefreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh
              </button>
            </div>
          </div>

          {historyLoading ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-slate-400">
              <Loader2
                size={20}
                className="mr-2 animate-spin"
              />
              Loading attendance history...
            </div>
          ) : (
            <>
              <div className="hidden p-4 lg:block lg:p-5">
                <Table
                  columns={[
                    "Date",
                    "Class / Section",
                    "School",
                    "Total",
                    "Present",
                    "Absent",
                    "Late",
                    "Leave",
                    "Action"
                  ]}
                >
                  {history.length === 0 ? (
                    <EmptyState
                      colSpan={9}
                      icon={CalendarCheck}
                      title="No attendance records"
                      description="Attendance history will appear here"
                    />
                  ) : (
                    history.map((attendance) => {
                      const summary = buildSummary(
                        attendance.records || []
                      );

                      return (
                        <tr key={attendance._id}>
                          <Td>
                            <div className="flex items-center gap-2">
                              <CalendarDays
                                size={15}
                                className="text-slate-400"
                              />

                              <span className="font-semibold text-slate-700">
                                {formatDate(
                                  attendance.attendanceDate
                                )}
                              </span>
                            </div>
                          </Td>

                          <Td>
                            <div className="flex items-center gap-2">
                              <GraduationCap
                                size={15}
                                className="text-slate-400"
                              />

                              <span>
                                {attendance.classId
                                  ?.className ||
                                  "-"}{" "}
                                /{" "}
                                {
                                  attendance.sectionName
                                }
                              </span>
                            </div>
                          </Td>

                          <Td>
                            <div className="flex min-w-[150px] items-center gap-2">
                              <Building2
                                size={15}
                                className="text-slate-400"
                              />

                              <span className="truncate">
                                {attendance.schoolId
                                  ?.schoolName ||
                                  "-"}
                              </span>
                            </div>
                          </Td>

                          <Td>{summary.total}</Td>
                          <Td>
                            <Badge tone="success">
                              {summary.present}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge tone="danger">
                              {summary.absent}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge tone="warning">
                              {summary.late}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge tone="info">
                              {summary.leave}
                            </Badge>
                          </Td>

                          <Td>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                onClick={() =>
                                  openAttendance(
                                    attendance
                                  )
                                }
                              >
                                <Pencil size={14} />
                                Open
                              </button>

                              {canDelete && (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                  onClick={() =>
                                    setDeleteTarget(
                                      attendance
                                    )
                                  }
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              )}
                            </div>
                          </Td>
                        </tr>
                      );
                    })
                  )}
                </Table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                {history.length === 0 ? (
                  <div className="flex min-h-56 flex-col items-center justify-center">
                    <CalendarCheck
                      size={28}
                      className="text-slate-300"
                    />

                    <p className="mt-2 text-sm font-semibold">
                      No attendance records
                    </p>
                  </div>
                ) : (
                  history.map((attendance) => {
                    const summary = buildSummary(
                      attendance.records || []
                    );

                    return (
                      <article
                        key={attendance._id}
                        className="p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-800">
                              {attendance.classId
                                ?.className ||
                                "-"}{" "}
                              /{" "}
                              {
                                attendance.sectionName
                              }
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatDate(
                                attendance.attendanceDate
                              )}
                            </p>
                          </div>

                          <Badge tone="neutral">
                            {summary.total} Students
                          </Badge>
                        </div>

                        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                          <div className="rounded-lg bg-emerald-50 p-2">
                            <p className="text-xs text-emerald-600">
                              Present
                            </p>
                            <p className="font-bold text-emerald-700">
                              {summary.present}
                            </p>
                          </div>

                          <div className="rounded-lg bg-rose-50 p-2">
                            <p className="text-xs text-rose-600">
                              Absent
                            </p>
                            <p className="font-bold text-rose-700">
                              {summary.absent}
                            </p>
                          </div>

                          <div className="rounded-lg bg-amber-50 p-2">
                            <p className="text-xs text-amber-600">
                              Late
                            </p>
                            <p className="font-bold text-amber-700">
                              {summary.late}
                            </p>
                          </div>

                          <div className="rounded-lg bg-sky-50 p-2">
                            <p className="text-xs text-sky-600">
                              Leave
                            </p>
                            <p className="font-bold text-sky-700">
                              {summary.leave}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            className="btn-secondary flex-1"
                            onClick={() =>
                              openAttendance(attendance)
                            }
                          >
                            <Pencil size={15} />
                            Open
                          </button>

                          {canDelete && (
                            <button
                              type="button"
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600"
                              onClick={() =>
                                setDeleteTarget(
                                  attendance
                                )
                              }
                            >
                              <Trash2 size={15} />
                              Delete
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              <Pagination
                pagination={historyPagination}
                onPageChange={(page) =>
                  setHistoryFilters((current) => ({
                    ...current,
                    page
                  }))
                }
                disabled={
                  historyLoading ||
                  historyRefreshing ||
                  deleting
                }
              />
            </>
          )}
        </section>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setError("");
          }
        }}
        title="Delete Attendance"
        width="max-w-md"
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <p className="text-sm leading-6 text-slate-600">
            Delete attendance for{" "}
            <strong>
              {deleteTarget?.classId?.className} /{" "}
              {deleteTarget?.sectionName}
            </strong>{" "}
            on{" "}
            <strong>
              {formatDate(
                deleteTarget?.attendanceDate
              )}
            </strong>
            ?
          </p>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            This action removes the attendance record. The audit log
            will keep the change history.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={deleting}
              onClick={() => {
                setDeleteTarget(null);
                setError("");
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteAttendance}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {deleting && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {deleting
                ? "Deleting..."
                : "Delete Attendance"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AttendanceList;
