import {
  useEffect,
  useMemo,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  GraduationCap,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users
} from "lucide-react";

import {
  getDeletedStudents,
  restoreStudent
} from "../../api/students";

import { getSchools } from "../../api/schools";
import { getClasses } from "../../api/classes";
import { useAuth } from "../../context/AuthContext";

import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";

import {
  EmptyState,
  Table,
  Td
} from "../../components/ui/Table";

import { Pagination } from "../../components/ui/Pagination";

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

const getStudentName = (student) =>
  student?.studentUserId?.name ||
  student?.name ||
  "Student";

const getStudentEmail = (student) =>
  student?.studentUserId?.email || "";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "S";

const DeletedStudentsList = () => {
  const navigate = useNavigate();

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
  const [restoring, setRestoring] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [
    restoreTarget,
    setRestoreTarget
  ] = useState(null);

  const [search, setSearch] = useState("");
  const [
    debouncedSearch,
    setDebouncedSearch
  ] = useState("");

  const [filters, setFilters] = useState({
    schoolId: "",
    classId: "",
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
    if (!isSuperAdmin) return;

    const loadSchools = async () => {
      try {
        const { data } = await getSchools();
        setSchools(data?.schools || []);
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
              schoolId: effectiveSchoolId
            }
          : {};

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
        await getDeletedStudents(
          queryParams
        );

      setStudents(data?.students || []);

      setPagination(
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
      setStudents([]);

      setError(
        requestError.response?.data?.message ||
          "Deleted students could not be loaded."
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

  const handleRestore = async () => {
    if (!restoreTarget) return;

    setRestoring(true);
    setError("");

    try {
      const { data } =
        await restoreStudent(
          restoreTarget._id
        );

      setRestoreTarget(null);

      setSuccess(
        data?.message ||
          "Student restored successfully."
      );

      fetchStudents({
        silent: true
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Student could not be restored."
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Deleted Students"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate("/students")
              }
            >
              <ArrowLeft size={16} />
              Back
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
            className={`grid gap-3 ${
              isSuperAdmin
                ? "md:grid-cols-3"
                : "md:grid-cols-2"
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
                placeholder="Search deleted students"
              />
            </div>

            {isSuperAdmin && (
              <select
                className="field-select"
                value={filters.schoolId}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    schoolId:
                      event.target.value,
                    classId: "",
                    page: 1
                  }))
                }
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
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  classId:
                    event.target.value,
                  page: 1
                }))
              }
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
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-5">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-56 items-center justify-center text-sm text-slate-400">
            Loading deleted students...
          </div>
        ) : (
          <>
            <div className="hidden p-4 lg:block lg:p-5">
              <Table
                columns={[
                  "Student",
                  "Admission No.",
                  "Class / Section",
                  "School",
                  "Deleted At",
                  "Deleted By",
                  "Action"
                ]}
              >
                {students.length === 0 ? (
                  <EmptyState
                    colSpan={7}
                    icon={Trash2}
                    title="No deleted students"
                    description="Deleted student records will appear here"
                  />
                ) : (
                  students.map((student) => {
                    const name =
                      getStudentName(student);

                    return (
                      <tr key={student._id}>
                        <Td>
                          <div className="flex min-w-[210px] items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">
                              {getInitials(name)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {name}
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {getStudentEmail(student)}
                              </p>
                            </div>
                          </div>
                        </Td>

                        <Td>
                          {student.admissionNumber}
                        </Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            <GraduationCap
                              size={15}
                              className="text-slate-400"
                            />

                            {student.classId?.className ||
                              "-"}{" "}
                            / {student.sectionName || "-"}
                          </div>
                        </Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            <Building2
                              size={15}
                              className="text-slate-400"
                            />

                            {student.schoolId?.schoolName ||
                              "Not assigned"}
                          </div>
                        </Td>

                        <Td>
                          {formatDate(student.deletedAt)}
                        </Td>

                        <Td>
                          {student.deletedBy?.name ||
                            "Not available"}
                        </Td>

                        <Td>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                            onClick={() => {
                              setError("");
                              setRestoreTarget(student);
                            }}
                          >
                            <RotateCcw size={15} />
                            Restore
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
                  <Users
                    size={28}
                    className="text-slate-300"
                  />

                  <p className="mt-2 text-sm font-semibold">
                    No deleted students
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
                        <div>
                          <h2 className="font-semibold">
                            {name}
                          </h2>

                          <p className="text-xs text-slate-500">
                            {student.admissionNumber}
                          </p>
                        </div>

                        <Badge tone="danger">
                          Deleted
                        </Badge>
                      </div>

                      <p className="mt-3 text-xs text-slate-600">
                        {student.classId?.className ||
                          "-"}{" "}
                        / {student.sectionName || "-"}
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        {student.schoolId?.schoolName ||
                          "-"}
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Deleted:{" "}
                        {formatDate(
                          student.deletedAt
                        )}
                      </p>

                      <button
                        type="button"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3 py-2.5 text-sm font-semibold text-emerald-700"
                        onClick={() =>
                          setRestoreTarget(student)
                        }
                      >
                        <RotateCcw size={16} />
                        Restore Student
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
                refreshing ||
                restoring
              }
            />
          </>
        )}
      </div>

      <Modal
        open={Boolean(restoreTarget)}
        onClose={() => {
          if (!restoring) {
            setRestoreTarget(null);
            setError("");
          }
        }}
        title="Restore Student"
        width="max-w-md"
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <p className="text-sm text-slate-600">
            Restore{" "}
            <strong>
              {getStudentName(restoreTarget)}
            </strong>{" "}
            to the Students list?
          </p>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            The linked Student and Parent accounts will remain unchanged.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={restoring}
              onClick={() =>
                setRestoreTarget(null)
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              disabled={restoring}
              onClick={handleRestore}
            >
              {restoring && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {restoring
                ? "Restoring..."
                : "Restore Student"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeletedStudentsList;
