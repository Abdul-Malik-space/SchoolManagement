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
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users
} from "lucide-react";

import { getTeachers } from "../../api/teachers";
import { getSchools } from "../../api/schools";
import { useAuth } from "../../context/AuthContext";

import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";

import {
  EmptyState,
  Table,
  Td
} from "../../components/ui/Table";

import { Pagination } from "../../components/ui/Pagination";
import { TeacherFormModal } from "./TeacherFormModal";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "resigned", label: "Resigned" }
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

const getTeacherName = (teacher) =>
  teacher?.userId?.name || teacher?.name || "Teacher";

const getTeacherEmail = (teacher) =>
  teacher?.userId?.email || teacher?.email || "";

const getTeacherPhone = (teacher) =>
  teacher?.userId?.phone || teacher?.phone || "";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "T";

const TeachersLoading = () => (
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

const TeachersList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user: currentUser } = useAuth();

  const isSuperAdmin =
    currentUser?.role === "super_admin";

  const [teachers, setTeachers] = useState([]);
  const [schools, setSchools] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createOpen, setCreateOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [filters, setFilters] = useState({
    schoolId: "",
    status: "",
    gender: "",
    subject: "",
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

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setSchools([]);
      return;
    }

    const fetchSchools = async () => {
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

    fetchSchools();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!success) return undefined;

    const timer = window.setTimeout(() => {
      setSuccess("");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [success]);

  const queryParams = useMemo(() => {
    const params = {
      page: filters.page,
      limit: filters.limit
    };

    if (debouncedSearch) {
      params.search = debouncedSearch;
    }

    if (filters.status) {
      params.status = filters.status;
    }

    if (filters.gender) {
      params.gender = filters.gender;
    }

    if (filters.subject.trim()) {
      params.subject = filters.subject.trim();
    }

    if (
      isSuperAdmin &&
      filters.schoolId
    ) {
      params.schoolId = filters.schoolId;
    }

    return params;
  }, [
    debouncedSearch,
    filters,
    isSuperAdmin
  ]);

  const fetchTeachers = async ({
    silent = false
  } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const { data } = await getTeachers(queryParams);

      setTeachers(data?.teachers || []);

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
      setTeachers([]);

      setError(
        requestError.response?.data?.message ||
          "Teachers could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeachers();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  const updateFilter = (key) => (event) => {
    setFilters((current) => ({
      ...current,
      [key]: event.target.value,
      page: 1
    }));
  };

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");

    setFilters({
      schoolId: "",
      status: "",
      gender: "",
      subject: "",
      page: 1,
      limit: 10
    });
  };

  const handleTeacherCreated = (
    teacher,
    message
  ) => {
    setCreateOpen(false);

    setSuccess(
      message ||
        `${getTeacherName(teacher)} created successfully.`
    );

    if (filters.page === 1) {
      fetchTeachers({
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
      filters.status ||
      filters.gender ||
      filters.subject ||
      (
        isSuperAdmin &&
        filters.schoolId
      )
  );

  return (
    <div>
      <PageHeader
        title="Teachers"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/teachers/deleted")}
            >
              <Trash2 size={16} />
              Deleted
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                fetchTeachers({
                  silent: true
                })
              }
              disabled={refreshing}
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
              Add Teacher
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
                ? "xl:grid-cols-[minmax(230px,1.4fr)_repeat(4,minmax(145px,0.7fr))_auto]"
                : "xl:grid-cols-[minmax(250px,1.5fr)_repeat(3,minmax(160px,0.7fr))_auto]"
            }`}
          >
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className="field-input pl-9"
                placeholder="Search teachers"
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

            <input
              type="text"
              className="field-input"
              value={filters.subject}
              onChange={updateFilter("subject")}
              placeholder="Subject"
            />

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
              onClick={() => fetchTeachers()}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <TeachersLoading />
        ) : (
          <>
            <div className="hidden p-4 lg:block lg:p-5">
              <Table
                columns={[
                  "Teacher",
                  "Employee ID",
                  "School",
                  "Qualification",
                  "Subjects",
                  "Status",
                  "Action"
                ]}
              >
                {teachers.length === 0 ? (
                  <EmptyState
                    colSpan={7}
                    icon={Users}
                    title="No teachers found"
                    description={
                      hasFilters
                        ? "Try changing the selected filters"
                        : "No teacher records are available"
                    }
                  />
                ) : (
                  teachers.map((teacher) => {
                    const name =
                      getTeacherName(teacher);

                    return (
                      <tr
                        key={teacher._id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <Td>
                          <div className="flex min-w-[220px] items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                              {getInitials(name)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">
                                {name}
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {getTeacherEmail(teacher) ||
                                  getTeacherPhone(teacher)}
                              </p>
                            </div>
                          </div>
                        </Td>

                        <Td>
                          <span className="whitespace-nowrap font-semibold text-slate-600">
                            {teacher.employeeId}
                          </span>
                        </Td>

                        <Td>
                          <div className="flex min-w-[170px] items-center gap-2">
                            <Building2
                              size={15}
                              className="text-slate-400"
                            />

                            <span className="truncate">
                              {teacher.schoolId?.schoolName ||
                                "Not assigned"}
                            </span>
                          </div>
                        </Td>

                        <Td>
                          <div className="flex min-w-[150px] items-center gap-2">
                            <GraduationCap
                              size={15}
                              className="text-slate-400"
                            />

                            <span className="truncate">
                              {teacher.qualification || "-"}
                            </span>
                          </div>
                        </Td>

                        <Td>
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {teacher.subjects?.length ? (
                              teacher.subjects
                                .slice(0, 2)
                                .map((subject) => (
                                  <Badge
                                    key={subject}
                                    tone="neutral"
                                  >
                                    {subject}
                                  </Badge>
                                ))
                            ) : (
                              <span className="text-slate-400">
                                -
                              </span>
                            )}

                            {teacher.subjects?.length > 2 && (
                              <Badge tone="info">
                                +{teacher.subjects.length - 2}
                              </Badge>
                            )}
                          </div>
                        </Td>

                        <Td>
                          <Badge
                            tone={
                              statusTones[teacher.status] ||
                              "neutral"
                            }
                          >
                            {statusLabels[teacher.status] ||
                              teacher.status}
                          </Badge>
                        </Td>

                        <Td>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                            onClick={() =>
                              navigate(`/teachers/${teacher._id}`)
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
              {teachers.length === 0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-4 text-center">
                  <Users
                    size={28}
                    className="text-slate-300"
                  />

                  <p className="text-sm font-semibold text-slate-600">
                    No teachers found
                  </p>
                </div>
              ) : (
                teachers.map((teacher) => {
                  const name =
                    getTeacherName(teacher);

                  return (
                    <article
                      key={teacher._id}
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                            {getInitials(name)}
                          </div>

                          <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-slate-800">
                              {name}
                            </h2>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {teacher.employeeId}
                            </p>
                          </div>
                        </div>

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

                      <div className="mt-4 grid gap-2.5 text-xs text-slate-600 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Building2
                            size={14}
                            className="text-slate-400"
                          />

                          <span className="truncate">
                            {teacher.schoolId?.schoolName ||
                              "Not assigned"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <UserRound
                            size={14}
                            className="text-slate-400"
                          />

                          <span>
                            {genderLabels[teacher.gender] ||
                              teacher.gender}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Phone
                            size={14}
                            className="text-slate-400"
                          />

                          <span>
                            {getTeacherPhone(teacher) ||
                              "No phone"}
                          </span>
                        </div>

                        <div className="flex min-w-0 items-center gap-2">
                          <Mail
                            size={14}
                            className="text-slate-400"
                          />

                          <span className="truncate">
                            {getTeacherEmail(teacher) ||
                              "No email"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                        onClick={() =>
                          navigate(`/teachers/${teacher._id}`)
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

      <TeacherFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={handleTeacherCreated}
        schools={schools}
        currentUser={currentUser}
      />
    </div>
  );
};

export default TeachersList;