import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarDays,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound
} from "lucide-react";

import {
  getDeletedAuditLogs,
  restoreAuditLog
} from "../../api/auditLogs";

import {
  getSchools
} from "../../api/schools";

import {
  PageHeader
} from "../../components/ui/PageHeader";

import {
  Badge
} from "../../components/ui/Badge";

import {
  Modal
} from "../../components/ui/Modal";

import {
  EmptyState,
  Table,
  Td
} from "../../components/ui/Table";

import {
  Pagination
} from "../../components/ui/Pagination";

/*
|--------------------------------------------------------------------------
| Available Audit Actions
|--------------------------------------------------------------------------
*/

const AUDIT_ACTIONS = [
  "CREATE",
  "READ",
  "UPDATE",
  "DELETE",
  "RESTORE",
  "LOGIN",
  "LOGOUT",
  "PASSWORD_CHANGE",
  "STATUS_CHANGE",
  "PAYMENT",
  "ATTENDANCE",
  "EXPORT",
  "OTHER"
];

/*
|--------------------------------------------------------------------------
| Common Audit Modules
|--------------------------------------------------------------------------
*/

const AUDIT_MODULES = [
  "AUTH",
  "USER",
  "SCHOOL",
  "CLASS",
  "SUBJECT",
  "TEACHER",
  "STUDENT",
  "ATTENDANCE",
  "FEE_STRUCTURE",
  "FEE_COLLECTION",
  "AUDIT_LOG"
];

/*
|--------------------------------------------------------------------------
| Formatting Helpers
|--------------------------------------------------------------------------
*/

const formatDateTime = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
};

const formatLabel = (value) => {
  if (!value) {
    return "Not available";
  }

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

/*
|--------------------------------------------------------------------------
| Badge Helpers
|--------------------------------------------------------------------------
*/

const getStatusTone = (status) => {
  return status === "success"
    ? "success"
    : "danger";
};

const getActionTone = (action) => {
  if (
    [
      "CREATE",
      "RESTORE",
      "LOGIN"
    ].includes(action)
  ) {
    return "success";
  }

  if (
    [
      "DELETE",
      "LOGOUT"
    ].includes(action)
  ) {
    return "danger";
  }

  if (
    [
      "UPDATE",
      "STATUS_CHANGE",
      "PASSWORD_CHANGE"
    ].includes(action)
  ) {
    return "warning";
  }

  return "neutral";
};

/*
|--------------------------------------------------------------------------
| Loading State
|--------------------------------------------------------------------------
*/

const LoadingState = () => {
  return (
    <div className="space-y-3 p-4 sm:p-5">
      {Array.from({
        length: 6
      }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-4"
        >
          <div className="h-10 w-10 rounded-xl bg-slate-100" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-48 rounded bg-slate-100" />

            <div className="h-2.5 w-72 max-w-full rounded bg-slate-100" />
          </div>

          <div className="h-8 w-24 rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Deleted Audit Logs List
|--------------------------------------------------------------------------
*/

const DeletedAuditLogsList = () => {
  const navigate = useNavigate();

  /*
  |--------------------------------------------------------------------------
  | Data State
  |--------------------------------------------------------------------------
  */

  const [
    auditLogs,
    setAuditLogs
  ] = useState([]);

  const [
    schools,
    setSchools
  ] = useState([]);

  /*
  |--------------------------------------------------------------------------
  | UI State
  |--------------------------------------------------------------------------
  */

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    restoring,
    setRestoring
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const [
    success,
    setSuccess
  ] = useState("");

  const [
    restoreTarget,
    setRestoreTarget
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Search State
  |--------------------------------------------------------------------------
  */

  const [
    search,
    setSearch
  ] = useState("");

  const [
    debouncedSearch,
    setDebouncedSearch
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

  const [
    filters,
    setFilters
  ] = useState({
    schoolId: "",
    userRole: "",
    action: "",
    module: "",
    status: "",
    fromDate: "",
    toDate: "",
    page: 1,
    limit: 10
  });

  /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

  const [
    pagination,
    setPagination
  ] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });

  /*
  |--------------------------------------------------------------------------
  | Search Debounce
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setDebouncedSearch(
            search.trim()
          );

          setFilters(
            (current) => ({
              ...current,
              page: 1
            })
          );
        },
        350
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [search]);

  /*
  |--------------------------------------------------------------------------
  | Load Schools
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadSchools =
      async () => {
        try {
          const { data } =
            await getSchools();

          setSchools(
            data?.schools || []
          );
        } catch {
          setSchools([]);
        }
      };

    loadSchools();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Auto Hide Success Message
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () => {
          setSuccess("");
        },
        4000
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [success]);

  /*
  |--------------------------------------------------------------------------
  | Query Parameters
  |--------------------------------------------------------------------------
  */

  const queryParams =
    useMemo(() => {
      const params = {
        page: filters.page,
        limit: filters.limit
      };

      if (debouncedSearch) {
        params.search =
          debouncedSearch;
      }

      if (filters.schoolId) {
        params.schoolId =
          filters.schoolId;
      }

      if (filters.userRole) {
        params.userRole =
          filters.userRole;
      }

      if (filters.action) {
        params.action =
          filters.action;
      }

      if (filters.module) {
        params.module =
          filters.module;
      }

      if (filters.status) {
        params.status =
          filters.status;
      }

      if (filters.fromDate) {
        params.fromDate =
          filters.fromDate;
      }

      if (filters.toDate) {
        params.toDate =
          filters.toDate;
      }

      return params;
    }, [
      debouncedSearch,
      filters
    ]);

  /*
  |--------------------------------------------------------------------------
  | Fetch Deleted Audit Logs
  |--------------------------------------------------------------------------
  */

  const fetchDeletedAuditLogs =
    async ({
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
          await getDeletedAuditLogs(
            queryParams
          );

        setAuditLogs(
          data?.auditLogs || []
        );

        setPagination(
          data?.pagination || {
            total: 0,
            page: 1,
            limit:
              filters.limit,
            totalPages: 1,
            hasNextPage:
              false,
            hasPrevPage:
              false
          }
        );
      } catch (
        requestError
      ) {
        setAuditLogs([]);

        setError(
          requestError.response
            ?.data?.message ||
            "Deleted audit logs could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Load Deleted Logs
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchDeletedAuditLogs();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  /*
  |--------------------------------------------------------------------------
  | Update Filter
  |--------------------------------------------------------------------------
  */

  const updateFilter =
    (field) => (event) => {
      const value =
        event.target.value;

      setFilters(
        (current) => ({
          ...current,
          [field]: value,
          page: 1
        })
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Reset Filters
  |--------------------------------------------------------------------------
  */

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");

    setFilters({
      schoolId: "",
      userRole: "",
      action: "",
      module: "",
      status: "",
      fromDate: "",
      toDate: "",
      page: 1,
      limit: 10
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Restore Audit Log
  |--------------------------------------------------------------------------
  */

  const handleRestore =
    async () => {
      if (!restoreTarget) {
        return;
      }

      setRestoring(true);
      setError("");

      try {
        const { data } =
          await restoreAuditLog(
            restoreTarget._id
          );

        setRestoreTarget(null);

        setSuccess(
          data?.message ||
            "Audit log restored successfully."
        );

        if (
          auditLogs.length === 1 &&
          filters.page > 1
        ) {
          setFilters(
            (current) => ({
              ...current,
              page:
                current.page - 1
            })
          );
        } else {
          fetchDeletedAuditLogs({
            silent: true
          });
        }
      } catch (
        requestError
      ) {
        setError(
          requestError.response
            ?.data?.message ||
            "Audit log could not be restored."
        );
      } finally {
        setRestoring(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Active Filters Check
  |--------------------------------------------------------------------------
  */

  const hasFilters =
    Boolean(
      search ||
        filters.schoolId ||
        filters.userRole ||
        filters.action ||
        filters.module ||
        filters.status ||
        filters.fromDate ||
        filters.toDate
    );

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div>
      <PageHeader
        title="Deleted Audit Logs"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate(
                  "/audit-logs"
                )
              }
            >
              <ArrowLeft
                size={16}
              />

              Back
            </button>

            <button
              type="button"
              className="btn-secondary"
              disabled={
                refreshing
              }
              onClick={() =>
                fetchDeletedAuditLogs({
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

      {/* Success Message */}

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      <div className="card overflow-hidden">
        {/*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */}

        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {/* Search */}

            <div className="relative xl:col-span-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                className="field-input pl-9"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search user, action, module or description"
              />
            </div>

            {/* School */}

            <select
              className="field-select"
              value={
                filters.schoolId
              }
              onChange={updateFilter(
                "schoolId"
              )}
            >
              <option value="">
                All schools
              </option>

              <option value="global">
                Global system logs
              </option>

              {schools.map(
                (school) => (
                  <option
                    key={
                      school._id
                    }
                    value={
                      school._id
                    }
                  >
                    {
                      school.schoolName
                    }
                  </option>
                )
              )}
            </select>

            {/* User Role */}

            <select
              className="field-select"
              value={
                filters.userRole
              }
              onChange={updateFilter(
                "userRole"
              )}
            >
              <option value="">
                All roles
              </option>

              <option value="super_admin">
                Super Admin
              </option>

              <option value="principal">
                Principal
              </option>

              <option value="teacher">
                Teacher
              </option>

              <option value="accountant">
                Accountant
              </option>
            </select>

            {/* Action */}

            <select
              className="field-select"
              value={
                filters.action
              }
              onChange={updateFilter(
                "action"
              )}
            >
              <option value="">
                All actions
              </option>

              {AUDIT_ACTIONS.map(
                (action) => (
                  <option
                    key={action}
                    value={action}
                  >
                    {formatLabel(
                      action
                    )}
                  </option>
                )
              )}
            </select>

            {/* Module */}

            <select
              className="field-select"
              value={
                filters.module
              }
              onChange={updateFilter(
                "module"
              )}
            >
              <option value="">
                All modules
              </option>

              {AUDIT_MODULES.map(
                (module) => (
                  <option
                    key={module}
                    value={module}
                  >
                    {formatLabel(
                      module
                    )}
                  </option>
                )
              )}
            </select>

            {/* Status */}

            <select
              className="field-select"
              value={
                filters.status
              }
              onChange={updateFilter(
                "status"
              )}
            >
              <option value="">
                All statuses
              </option>

              <option value="success">
                Success
              </option>

              <option value="failed">
                Failed
              </option>
            </select>

            {/* From Date */}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                From date
              </label>

              <input
                type="date"
                className="field-input"
                value={
                  filters.fromDate
                }
                onChange={updateFilter(
                  "fromDate"
                )}
              />
            </div>

            {/* To Date */}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                To date
              </label>

              <input
                type="date"
                className="field-input"
                value={
                  filters.toDate
                }
                min={
                  filters.fromDate ||
                  undefined
                }
                onChange={updateFilter(
                  "toDate"
                )}
              />
            </div>

            {/* Clear Filters */}

            {hasFilters && (
              <div className="flex items-end">
                <button
                  type="button"
                  className="btn-ghost w-full"
                  onClick={
                    resetFilters
                  }
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}

        {error &&
          !restoreTarget && (
            <div className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-5">
              <span>
                {error}
              </span>

              <button
                type="button"
                className="font-semibold"
                onClick={() =>
                  fetchDeletedAuditLogs()
                }
              >
                Retry
              </button>
            </div>
          )}

        {/* Loading */}

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/*
            |--------------------------------------------------------------------------
            | Desktop Table
            |--------------------------------------------------------------------------
            */}

            <div className="hidden p-4 lg:block lg:p-5">
              <Table
                columns={[
                  "Original Date",
                  "User",
                  "Action",
                  "Module",
                  "Description",
                  "School",
                  "Status",
                  "Deleted At",
                  "Action"
                ]}
              >
                {auditLogs.length ===
                0 ? (
                  <EmptyState
                    colSpan={9}
                    icon={Trash2}
                    title="No deleted audit logs"
                    description={
                      hasFilters
                        ? "Try changing the selected filters"
                        : "Deleted audit logs will appear here"
                    }
                  />
                ) : (
                  auditLogs.map(
                    (auditLog) => (
                      <tr
                        key={
                          auditLog._id
                        }
                        className="transition hover:bg-slate-50/70"
                      >
                        {/* Original Date */}

                        <Td>
                          <div className="flex min-w-[170px] items-center gap-2">
                            <CalendarDays
                              size={15}
                              className="shrink-0 text-slate-400"
                            />

                            <span className="text-sm text-slate-600">
                              {formatDateTime(
                                auditLog.createdAt
                              )}
                            </span>
                          </div>
                        </Td>

                        {/* User */}

                        <Td>
                          <div className="flex min-w-[190px] items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                              <UserRound
                                size={16}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-700">
                                {auditLog.userName ||
                                  auditLog
                                    .userId
                                    ?.name ||
                                  "Unknown user"}
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                {formatLabel(
                                  auditLog.userRole ||
                                    auditLog
                                      .userId
                                      ?.role
                                )}
                              </p>
                            </div>
                          </div>
                        </Td>

                        {/* Action */}

                        <Td>
                          <Badge
                            tone={getActionTone(
                              auditLog.action
                            )}
                          >
                            {formatLabel(
                              auditLog.action
                            )}
                          </Badge>
                        </Td>

                        {/* Module */}

                        <Td>
                          <span className="whitespace-nowrap text-sm font-semibold text-slate-600">
                            {formatLabel(
                              auditLog.module
                            )}
                          </span>
                        </Td>

                        {/* Description */}

                        <Td>
                          <p className="max-w-[300px] line-clamp-2 text-sm leading-5 text-slate-600">
                            {auditLog.description ||
                              "No description"}
                          </p>
                        </Td>

                        {/* School */}

                        <Td>
                          <div className="flex min-w-[150px] items-center gap-2">
                            <Building2
                              size={15}
                              className="shrink-0 text-slate-400"
                            />

                            <span className="truncate">
                              {auditLog
                                .schoolId
                                ?.schoolName ||
                                "Global"}
                            </span>
                          </div>
                        </Td>

                        {/* Status */}

                        <Td>
                          <Badge
                            tone={getStatusTone(
                              auditLog.status
                            )}
                          >
                            {formatLabel(
                              auditLog.status
                            )}
                          </Badge>
                        </Td>

                        {/* Deleted Information */}

                        <Td>
                          <div className="min-w-[170px]">
                            <p className="text-sm text-slate-600">
                              {formatDateTime(
                                auditLog.deletedAt
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              By{" "}
                              {auditLog
                                .deletedBy
                                ?.name ||
                                "Unknown user"}
                            </p>
                          </div>
                        </Td>

                        {/* Restore */}

                        <Td>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                            onClick={() => {
                              setError("");

                              setRestoreTarget(
                                auditLog
                              );
                            }}
                          >
                            <RotateCcw
                              size={15}
                            />

                            Restore
                          </button>
                        </Td>
                      </tr>
                    )
                  )
                )}
              </Table>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Mobile Cards
            |--------------------------------------------------------------------------
            */}

            <div className="divide-y divide-slate-100 lg:hidden">
              {auditLogs.length ===
              0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center p-5 text-center">
                  <ShieldCheck
                    size={30}
                    className="text-slate-300"
                  />

                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    No deleted audit
                    logs
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Deleted logs will
                    appear here.
                  </p>
                </div>
              ) : (
                auditLogs.map(
                  (auditLog) => (
                    <article
                      key={
                        auditLog._id
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate font-semibold text-slate-800">
                            {auditLog.userName ||
                              auditLog
                                .userId
                                ?.name ||
                              "Unknown user"}
                          </h2>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(
                              auditLog.createdAt
                            )}
                          </p>
                        </div>

                        <Badge
                          tone={getStatusTone(
                            auditLog.status
                          )}
                        >
                          {formatLabel(
                            auditLog.status
                          )}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge
                          tone={getActionTone(
                            auditLog.action
                          )}
                        >
                          {formatLabel(
                            auditLog.action
                          )}
                        </Badge>

                        <Badge tone="neutral">
                          {formatLabel(
                            auditLog.module
                          )}
                        </Badge>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {auditLog.description ||
                          "No description"}
                      </p>

                      <div className="mt-4 space-y-2 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <Building2
                            size={14}
                          />

                          <span>
                            {auditLog
                              .schoolId
                              ?.schoolName ||
                              "Global"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Trash2
                            size={14}
                          />

                          <span>
                            Deleted{" "}
                            {formatDateTime(
                              auditLog.deletedAt
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <UserRound
                            size={14}
                          />

                          <span>
                            Deleted by{" "}
                            {auditLog
                              .deletedBy
                              ?.name ||
                              "Unknown user"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                        onClick={() => {
                          setError("");

                          setRestoreTarget(
                            auditLog
                          );
                        }}
                      >
                        <RotateCcw
                          size={16}
                        />

                        Restore Audit Log
                      </button>
                    </article>
                  )
                )
              )}
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Pagination
            |--------------------------------------------------------------------------
            */}

            <Pagination
              pagination={
                pagination
              }
              onPageChange={(
                page
              ) =>
                setFilters(
                  (current) => ({
                    ...current,
                    page
                  })
                )
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

      {/*
      |--------------------------------------------------------------------------
      | Restore Confirmation Modal
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={Boolean(
          restoreTarget
        )}
        onClose={() => {
          if (!restoring) {
            setRestoreTarget(
              null
            );

            setError("");
          }
        }}
        title="Restore Audit Log"
        width="max-w-md"
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <RotateCcw
                size={20}
              />
            </div>

            <div>
              <p className="text-sm leading-6 text-slate-600">
                Are you sure you want
                to restore this audit
                log?
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatLabel(
                  restoreTarget?.action
                )}{" "}
                ·{" "}
                {formatLabel(
                  restoreTarget?.module
                )}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <Activity
                size={17}
                className="mt-0.5 shrink-0 text-slate-400"
              />

              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {restoreTarget?.userName ||
                    restoreTarget
                      ?.userId
                      ?.name ||
                    "Unknown user"}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {restoreTarget?.description ||
                    "No description"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
            The audit log will return
            to the active audit logs
            list with its original data
            preserved.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={
                restoring
              }
              onClick={() => {
                setRestoreTarget(
                  null
                );

                setError("");
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-primary"
              disabled={
                restoring
              }
              onClick={
                handleRestore
              }
            >
              {restoring && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {restoring
                ? "Restoring..."
                : "Restore Audit Log"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeletedAuditLogsList;