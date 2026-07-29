import {
  useEffect,
  useMemo,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users
} from "lucide-react";

import {
  getDeletedTeachers,
  restoreTeacher
} from "../../api/teachers";

import { getSchools } from "../../api/schools";
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

const getTeacherName = (teacher) =>
  teacher?.userId?.name ||
  teacher?.name ||
  "Teacher";

const getTeacherEmail = (teacher) =>
  teacher?.userId?.email ||
  teacher?.email ||
  "";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "T";

const DeletedTeachersList = () => {
  const navigate = useNavigate();

  const { user: currentUser } = useAuth();

  const isSuperAdmin =
    currentUser?.role === "super_admin";

  const [teachers, setTeachers] = useState([]);
  const [schools, setSchools] = useState([]);

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
      const { data } =
        await getDeletedTeachers(queryParams);

      setTeachers(data?.teachers || []);

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
      setTeachers([]);

      setError(
        requestError.response?.data?.message ||
          "Deleted teachers could not be loaded."
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

  const handleRestore = async () => {
    if (!restoreTarget) return;

    setRestoring(true);
    setError("");

    try {
      const { data } =
        await restoreTeacher(
          restoreTarget._id
        );

      setRestoreTarget(null);

      setSuccess(
        data?.message ||
          "Teacher restored successfully."
      );

      fetchTeachers({
        silent: true
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Teacher could not be restored."
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Deleted Teachers"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate("/teachers")
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
                fetchTeachers({
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
          <div className="grid gap-3 md:grid-cols-2">
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
                placeholder="Search deleted teachers"
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
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-56 items-center justify-center text-sm text-slate-400">
            Loading deleted teachers...
          </div>
        ) : (
          <>
            <div className="hidden p-4 lg:block lg:p-5">
              <Table
                columns={[
                  "Teacher",
                  "Employee ID",
                  "School",
                  "Deleted At",
                  "Deleted By",
                  "Action"
                ]}
              >
                {teachers.length === 0 ? (
                  <EmptyState
                    colSpan={6}
                    icon={Trash2}
                    title="No deleted teachers"
                    description="Deleted teacher records will appear here"
                  />
                ) : (
                  teachers.map((teacher) => {
                    const name =
                      getTeacherName(teacher);

                    return (
                      <tr key={teacher._id}>
                        <Td>
                          <div className="flex min-w-[220px] items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">
                              {getInitials(name)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {name}
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {getTeacherEmail(teacher)}
                              </p>
                            </div>
                          </div>
                        </Td>

                        <Td>{teacher.employeeId}</Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            <Building2
                              size={15}
                              className="text-slate-400"
                            />

                            {teacher.schoolId?.schoolName ||
                              "Not assigned"}
                          </div>
                        </Td>

                        <Td>
                          {formatDate(
                            teacher.deletedAt
                          )}
                        </Td>

                        <Td>
                          {teacher.deletedBy?.name ||
                            "Not available"}
                        </Td>

                        <Td>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            onClick={() => {
                              setError("");
                              setRestoreTarget(
                                teacher
                              );
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
              {teachers.length === 0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center">
                  <Users
                    size={28}
                    className="text-slate-300"
                  />

                  <p className="mt-2 text-sm font-semibold">
                    No deleted teachers
                  </p>
                </div>
              ) : (
                teachers.map((teacher) => {
                  const name =
                    getTeacherName(teacher);

                  return (
                    <article
                      key={teacher._id}
                      className="p-4"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <h2 className="font-semibold">
                            {name}
                          </h2>

                          <p className="text-xs text-slate-500">
                            {teacher.employeeId}
                          </p>
                        </div>

                        <Badge tone="danger">
                          Deleted
                        </Badge>
                      </div>

                      <p className="mt-3 text-xs text-slate-600">
                        {teacher.schoolId?.schoolName}
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Deleted:{" "}
                        {formatDate(
                          teacher.deletedAt
                        )}
                      </p>

                      <button
                        type="button"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3 py-2.5 text-sm font-semibold text-emerald-700"
                        onClick={() =>
                          setRestoreTarget(teacher)
                        }
                      >
                        <RotateCcw size={16} />
                        Restore Teacher
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
        title="Restore Teacher"
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
              {getTeacherName(restoreTarget)}
            </strong>{" "}
            to the Teachers list?
          </p>

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
                : "Restore Teacher"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeletedTeachersList;