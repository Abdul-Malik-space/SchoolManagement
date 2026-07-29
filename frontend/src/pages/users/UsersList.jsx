import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Building2,
  Eye,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users
} from "lucide-react";

import { getUsers } from "../../api/users";
import { getSchools } from "../../api/schools";
import { useAuth } from "../../context/AuthContext";

import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import {
  Table,
  Td,
  EmptyState
} from "../../components/ui/Table";

import { Pagination } from "../../components/ui/Pagination";
import { UserFormModal } from "./UserFormModal";

const roleOptions = [
  {
    value: "",
    label: "All roles"
  },
  {
    value: "principal",
    label: "Principal"
  },
  {
    value: "teacher",
    label: "Teacher"
  },
  {
    value: "accountant",
    label: "Accountant"
  },
  {
    value: "student",
    label: "Student"
  },
  {
    value: "parent",
    label: "Parent"
  }
];

const roleLabels = {
  super_admin: "Super Admin",
  principal: "Principal",
  teacher: "Teacher",
  accountant: "Accountant",
  student: "Student",
  parent: "Parent"
};

const roleTones = {
  super_admin: "info",
  principal: "warning",
  teacher: "success",
  accountant: "neutral",
  student: "info",
  parent: "neutral"
};

const getInitials = (name = "") => {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
};

const UsersLoading = () => {
  return (
    <div className="space-y-3 p-4">
      {Array.from({
        length: 6
      }).map((_, index) => (
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
};

const UsersList = () => {
  const navigate = useNavigate();

  const {
    user: currentUser
  } = useAuth();

  const isSuperAdmin =
    currentUser?.role === "super_admin";

  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createOpen, setCreateOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState("");

  const [filters, setFilters] = useState({
    role: "",
    isActive: "",
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

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    if (!isSuperAdmin) {
      setSchools([]);
      return;
    }

    const fetchSchools = async () => {
      try {
        const {
          data
        } = await getSchools();

        const activeSchools = (
          data?.schools || []
        ).filter((school) => school.isActive);

        setSchools(activeSchools);
      } catch {
        setSchools([]);
      }
    };

    fetchSchools();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSuccess("");
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [success]);

  const queryParams = useMemo(() => {
    const params = {
      page: filters.page,
      limit: filters.limit
    };

    if (debouncedSearch) {
      params.search = debouncedSearch;
    }

    if (filters.role) {
      params.role = filters.role;
    }

    if (filters.isActive !== "") {
      params.isActive = filters.isActive;
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

  const fetchUsers = async ({
    silent = false
  } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const {
        data
      } = await getUsers(queryParams);

      setUsers(data?.users || []);

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
      setUsers([]);

      setError(
        requestError.response?.data?.message ||
          "Users could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // queryParams intentionally controls data fetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  const updateFilter = (key) => {
    return (event) => {
      setFilters((current) => ({
        ...current,
        [key]: event.target.value,
        page: 1
      }));
    };
  };

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");

    setFilters({
      role: "",
      isActive: "",
      schoolId: "",
      page: 1,
      limit: 10
    });
  };

  const handleUserCreated = (
    createdUser,
    message
  ) => {
    setCreateOpen(false);

    setSuccess(
      message ||
        `${createdUser?.name || "User"} created successfully.`
    );

    if (filters.page === 1) {
      fetchUsers({
        silent: true
      });
    } else {
      setFilters((current) => ({
        ...current,
        page: 1
      }));
    }
  };

  const openUserDetails = (userId) => {
    navigate(`/users/${userId}`);
  };

  const hasFilters = Boolean(
    search ||
      filters.role ||
      filters.isActive !== "" ||
      (
        isSuperAdmin &&
        filters.schoolId
      )
  );

  return (
    <div>
      <PageHeader
        title="Users"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                fetchUsers({
                  silent: true
                });
              }}
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
              onClick={() => {
                setCreateOpen(true);
              }}
            >
              <Plus size={16} />
              Add User
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
                ? "xl:grid-cols-[minmax(240px,1.4fr)_repeat(3,minmax(150px,0.7fr))_auto]"
                : "xl:grid-cols-[minmax(260px,1.5fr)_repeat(2,minmax(170px,0.7fr))_auto]"
            }`}
          >
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                className="field-input pl-9"
                placeholder="Search name, email or phone"
                aria-label="Search users"
              />
            </div>

            <select
              className="field-select"
              value={filters.role}
              onChange={updateFilter("role")}
              aria-label="Filter by role"
            >
              {roleOptions
                .filter((option) => {
                  return (
                    isSuperAdmin ||
                    option.value !== "principal"
                  );
                })
                .map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
            </select>

            {isSuperAdmin && (
              <select
                className="field-select"
                value={filters.schoolId}
                onChange={updateFilter(
                  "schoolId"
                )}
                aria-label="Filter by school"
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
              value={filters.isActive}
              onChange={updateFilter(
                "isActive"
              )}
              aria-label="Filter by status"
            >
              <option value="">
                All statuses
              </option>

              <option value="true">
                Active
              </option>

              <option value="false">
                Inactive
              </option>
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
              className="shrink-0 font-semibold hover:text-rose-900"
              onClick={() => {
                fetchUsers();
              }}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <UsersLoading />
        ) : (
          <>
            <div className="hidden p-4 lg:block lg:p-5">
              <Table
                columns={[
                  "User",
                  "Role",
                  "School",
                  "Phone",
                  "Status",
                  "Actions"
                ]}
              >
                {users.length === 0 ? (
                  <EmptyState
                    colSpan={6}
                    icon={Users}
                    title="No users found"
                    description={
                      hasFilters
                        ? "Try changing the selected filters"
                        : "No user accounts are available"
                    }
                  />
                ) : (
                  users.map((user) => (
                    <tr
                      key={user._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <Td>
                        <div className="flex min-w-[220px] items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                            {getInitials(
                              user.name
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800">
                              {user.name}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </Td>

                      <Td>
                        <Badge
                          tone={
                            roleTones[
                              user.role
                            ] || "neutral"
                          }
                        >
                          {roleLabels[
                            user.role
                          ] || user.role}
                        </Badge>
                      </Td>

                      <Td>
                        <div className="flex min-w-[170px] items-center gap-2 text-sm text-slate-600">
                          <Building2
                            size={15}
                            className="shrink-0 text-slate-400"
                          />

                          <span className="truncate">
                            {user.schoolId
                              ?.schoolName ||
                              "System"}
                          </span>
                        </div>
                      </Td>

                      <Td>
                        {user.phone || "-"}
                      </Td>

                      <Td>
                        <Badge
                          tone={
                            user.isActive
                              ? "success"
                              : "danger"
                          }
                        >
                          {user.isActive
                            ? "Active"
                            : "Inactive"}
                        </Badge>
                      </Td>

                      <Td>
                        <button
                          type="button"
                          onClick={() => {
                            openUserDetails(
                              user._id
                            );
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </Table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {users.length === 0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-4 text-center">
                  <Users
                    size={28}
                    className="text-slate-300"
                    strokeWidth={1.5}
                  />

                  <p className="text-sm font-semibold text-slate-600">
                    No users found
                  </p>
                </div>
              ) : (
                users.map((user) => (
                  <article
                    key={user._id}
                    className="p-4 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                          {getInitials(
                            user.name
                          )}
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate text-sm font-semibold text-slate-800">
                            {user.name}
                          </h2>

                          <div className="mt-1">
                            <Badge
                              tone={
                                roleTones[
                                  user.role
                                ] || "neutral"
                              }
                            >
                              {roleLabels[
                                user.role
                              ] || user.role}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Badge
                        tone={
                          user.isActive
                            ? "success"
                            : "danger"
                        }
                      >
                        {user.isActive
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-2.5 text-xs text-slate-600 sm:grid-cols-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Mail
                          size={14}
                          className="shrink-0 text-slate-400"
                        />

                        <span className="truncate">
                          {user.email}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center gap-2">
                        <Phone
                          size={14}
                          className="shrink-0 text-slate-400"
                        />

                        <span className="truncate">
                          {user.phone ||
                            "No phone"}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center gap-2">
                        <Building2
                          size={14}
                          className="shrink-0 text-slate-400"
                        />

                        <span className="truncate">
                          {user.schoolId
                            ?.schoolName ||
                            "System"}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center gap-2">
                        {user.mustChangePassword ? (
                          <ShieldCheck
                            size={14}
                            className="shrink-0 text-amber-500"
                          />
                        ) : (
                          <UserRound
                            size={14}
                            className="shrink-0 text-slate-400"
                          />
                        )}

                        <span>
                          {user.mustChangePassword
                            ? "Password change required"
                            : "Account verified"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          openUserDetails(
                            user._id
                          );
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <Pagination
              pagination={pagination}
              onPageChange={(page) => {
                setFilters((current) => ({
                  ...current,
                  page
                }));
              }}
              disabled={
                loading ||
                refreshing
              }
            />
          </>
        )}
      </div>

      <UserFormModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
        }}
        onSaved={handleUserCreated}
        schools={schools}
        currentUser={currentUser}
      />
    </div>
  );
};

export default UsersList;