import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  Building2,
  Eye,
  GraduationCap,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound
} from "lucide-react";

import { getStudents } from "../../api/students";
import { getSchools } from "../../api/schools";
import { getClasses } from "../../api/classes";
import { useAuth } from "../../context/AuthContext";

import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";

import {
  EmptyState,
  Table,
  Td
} from "../../components/ui/Table";

import { Pagination } from "../../components/ui/Pagination";
import { StudentFormModal } from "./StudentFormModal";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "transferred", label: "Transferred" },
  { value: "passed_out", label: "Passed Out" }
];

const genderOptions = [
  { value: "", label: "All genders" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" }
];

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

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "S";

const StudentsLoading = () => (
  <div className="space-y-3 p-4 sm:p-5">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-3"
      >
        <div className="h-10 w-10 rounded-full bg-slate-100" />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-40 rounded bg-slate-100" />
          <div className="h-2.5 w-56 max-w-full rounded bg-slate-100" />
        </div>

        <div className="h-6 w-16 rounded-full bg-slate-100" />
      </div>
    ))}
  </div>
);

const StudentsList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user: currentUser } = useAuth();

  const isSuperAdmin =
    currentUser?.role === "super_admin";

  const currentSchoolId =
    currentUser?.schoolId?._id ||
    currentUser?.schoolId ||
    "";

  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createOpen, setCreateOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState("");

  const [filters, setFilters] = useState({
    schoolId: "",
    classId: "",
    sectionId: "",
    status: "",
    gender: "",
    page: 1,
    limit: 10
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });

  const effectiveSchoolId =
    isSuperAdmin
      ? filters.schoolId
      : currentSchoolId;

  const selectedClass = useMemo(
    () =>
      classes.find(
        (classItem) =>
          classItem._id === filters.classId
      ),
    [classes, filters.classId]
  );

  const sections =
    selectedClass?.sections || [];

  useEffect(() => {
    if (!location.state?.success) return;

    setSuccess(location.state.success);

    navigate(location.pathname, {
      replace: true,
      state: null
    });
  }, [
    location.pathname,
    location.state,
    navigate
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());

      setFilters((current) => ({
        ...current,
        page: 1
      }));
    }, 350);

    return () =>
      window.clearTimeout(timer);
  }, [search]);

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
    if (!effectiveSchoolId) {
      setClasses([]);
      return;
    }

    const loadClasses = async () => {
      try {
        const params = isSuperAdmin
          ? {
              schoolId: effectiveSchoolId,
              isActive: true
            }
          : {
              isActive: true
            };

        const { data } = await getClasses(params);

        setClasses(data?.classes || []);
      } catch {
        setClasses([]);
      }
    };

    loadClasses();
  }, [
    effectiveSchoolId,
    isSuperAdmin
  ]);

  useEffect(() => {
    if (!success) return undefined;

    const timer = window.setTimeout(() => {
      setSuccess("");
    }, 4000);

    return () =>
      window.clearTimeout(timer);
  }, [success]);

  const queryParams = useMemo(() => {
    const params = {
      page: filters.page,
      limit: filters.limit
    };

    if (debouncedSearch) {
      params.search = debouncedSearch;
    }

    if (
      isSuperAdmin &&
      filters.schoolId
    ) {
      params.schoolId = filters.schoolId;
    }

    if (filters.classId) {
      params.classId = filters.classId;
    }

    if (filters.sectionId) {
      params.sectionId = filters.sectionId;
    }

    if (filters.status) {
      params.status = filters.status;
    }

    if (filters.gender) {
      params.gender = filters.gender;
    }

    return params;
  }, [
    debouncedSearch,
    filters,
    isSuperAdmin
  ]);

  const fetchStudents = async ({
    silent = false
  } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const { data } =
        await getStudents(queryParams);

      setStudents(data?.students || []);

      setPagination(
        data?.pagination || {
          total: 0,
          page: 1,
          limit: filters.limit,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      );
    } catch (requestError) {
      setStudents([]);

      setError(
        requestError.response?.data?.message ||
          "Students could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  const updateFilter = (key) => (event) => {
    const value = event.target.value;

    setFilters((current) => {
      const nextFilters = {
        ...current,
        [key]: value,
        page: 1
      };

      if (key === "schoolId") {
        nextFilters.classId = "";
        nextFilters.sectionId = "";
      }

      if (key === "classId") {
        nextFilters.sectionId = "";
      }

      return nextFilters;
    });
  };

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");

    setFilters({
      schoolId: "",
      classId: "",
      sectionId: "",
      status: "",
      gender: "",
      page: 1,
      limit: 10
    });
  };

  const handleStudentCreated = (
    student,
    message
  ) => {
    setCreateOpen(false);

    setSuccess(
      message ||
        `${getStudentName(
          student
        )} created successfully.`
    );

    if (filters.page === 1) {
      fetchStudents({
        silent: true
      });
    } else {
      setFilters((current) => ({
        ...current,
        page: 1
      }));
    }
  };

  const hasFilters = Boolean(
    search ||
      filters.schoolId ||
      filters.classId ||
      filters.sectionId ||
      filters.status ||
      filters.gender
  );

  return (
    <div>
      <PageHeader
        title="Students"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate("/students/deleted")
              }
            >
              <Trash2 size={16} />
              Deleted
            </button>

            <button
              type="button"
              className="btn-secondary"
              disabled={refreshing}
              onClick={() =>
                fetchStudents({
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
              Refresh
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={16} />
              Add Student
            </button>
          </div>
        }
      />

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div
            className={`grid gap-3 md:grid-cols-2 ${
              isSuperAdmin
                ? "xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(135px,0.7fr))_auto]"
                : "xl:grid-cols-[minmax(230px,1.4fr)_repeat(4,minmax(145px,0.7fr))_auto]"
            }`}
          >
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                className="field-input pl-9"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search students"
              />
            </div>

            {isSuperAdmin && (
              <select
                className="field-select"
                value={filters.schoolId}
                onChange={updateFilter("schoolId")}
              >
                <option value="">All schools</option>

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
              value={filters.classId}
              disabled={!effectiveSchoolId}
              onChange={updateFilter("classId")}
            >
              <option value="">All classes</option>

              {classes.map((classItem) => (
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
              value={filters.sectionId}
              disabled={!filters.classId}
              onChange={updateFilter("sectionId")}
            >
              <option value="">All sections</option>

              {sections.map((section) => (
                <option
                  key={section._id}
                  value={section._id}
                >
                  {section.sectionName}
                </option>
              ))}
            </select>

            <select
              className="field-select"
              value={filters.status}
              onChange={updateFilter("status")}
            >
              {statusOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className="field-select"
              value={filters.gender}
              onChange={updateFilter("gender")}
            >
              {genderOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                type="button"
                className="btn-ghost"
                onClick={resetFilters}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-5">
            <span>{error}</span>

            <button
              type="button"
              className="font-semibold"
              onClick={() => fetchStudents()}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <StudentsLoading />
        ) : (
          <>
            <div className="hidden p-4 lg:block lg:p-5">
              <Table
                columns={[
                  "Student",
                  "Admission No.",
                  "Class / Section",
                  "School",
                  "Guardian",
                  "Status",
                  "Action"
                ]}
              >
                {students.length === 0 ? (
                  <EmptyState
                    colSpan={7}
                    icon={GraduationCap}
                    title="No students found"
                    description={
                      hasFilters
                        ? "Try changing the selected filters"
                        : "No student records are available"
                    }
                  />
                ) : (
                  students.map((student) => {
                    const name =
                      getStudentName(student);

                    return (
                      <tr
                        key={student._id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <Td>
                          <div className="flex min-w-[210px] items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                              {getInitials(name)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">
                                {name}
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {getStudentEmail(student) ||
                                  getStudentPhone(student)}
                              </p>
                            </div>
                          </div>
                        </Td>

                        <Td>
                          <span className="font-semibold text-slate-600">
                            {student.admissionNumber}
                          </span>
                        </Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            <GraduationCap
                              size={15}
                              className="text-slate-400"
                            />

                            <span>
                              {student.classId?.className ||
                                "-"}{" "}
                              / {student.sectionName || "-"}
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
                              {student.schoolId?.schoolName ||
                                "-"}
                            </span>
                          </div>
                        </Td>

                        <Td>
                          <div>
                            <p className="font-medium text-slate-700">
                              {student.guardianName ||
                                student.fatherName ||
                                "-"}
                            </p>

                            <p className="text-xs text-slate-500">
                              {student.guardianContact ||
                                "-"}
                            </p>
                          </div>
                        </Td>

                        <Td>
                          <Badge
                            tone={
                              statusTones[student.status] ||
                              "neutral"
                            }
                          >
                            {statusLabels[student.status] ||
                              student.status}
                          </Badge>
                        </Td>

                        <Td>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                            onClick={() =>
                              navigate(`/students/${student._id}`)
                            }
                          >
                            <Eye size={15} />
                            View
                          </button>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </Table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {students.length === 0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center">
                  <GraduationCap
                    size={28}
                    className="text-slate-300"
                  />

                  <p className="mt-2 text-sm font-semibold">
                    No students found
                  </p>
                </div>
              ) : (
                students.map((student) => {
                  const name =
                    getStudentName(student);

                  return (
                    <article
                      key={student._id}
                      className="p-4"
                    >
                      <div className="flex justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                            {getInitials(name)}
                          </div>

                          <div className="min-w-0">
                            <h2 className="truncate font-semibold">
                              {name}
                            </h2>

                            <p className="text-xs text-slate-500">
                              {student.admissionNumber}
                            </p>
                          </div>
                        </div>

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

                      <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <GraduationCap size={14} />

                          {student.classId?.className ||
                            "-"}{" "}
                          / {student.sectionName || "-"}
                        </div>

                        <div className="flex items-center gap-2">
                          <Building2 size={14} />

                          {student.schoolId?.schoolName ||
                            "-"}
                        </div>

                        <div className="flex items-center gap-2">
                          <UserRound size={14} />

                          {genderLabels[student.gender] ||
                            student.gender}
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone size={14} />

                          {getStudentPhone(student) ||
                            "No phone"}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                        onClick={() =>
                          navigate(`/students/${student._id}`)
                        }
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                    </article>
                  );
                })
              )}
            </div>

            <Pagination
              pagination={pagination}
              onPageChange={(page) =>
                setFilters((current) => ({
                  ...current,
                  page
                }))
              }
              disabled={
                loading ||
                refreshing
              }
            />
          </>
        )}
      </div>

      <StudentFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={handleStudentCreated}
        schools={schools}
        currentUser={currentUser}
      />
    </div>
  );
};

export default StudentsList;
