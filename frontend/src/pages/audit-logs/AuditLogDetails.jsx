import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate,
  useParams
} from "react-router-dom";

import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Code2,
  Copy,
  FileKey2,
  FileText,
  Globe2,
  Hash,
  Info,
  Loader2,
  Mail,
  MonitorSmartphone,
  RefreshCw,
  Route,
  ShieldCheck,
  Trash2,
  UserRound,
  XCircle
} from "lucide-react";

import {
  deleteAuditLog,
  getAuditLogById
} from "../../api/auditLogs";

import {
  useAuth
} from "../../context/AuthContext";

import {
  PageHeader
} from "../../components/ui/PageHeader";

import {
  Badge
} from "../../components/ui/Badge";

import {
  Modal
} from "../../components/ui/Modal";

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
      minute: "2-digit",
      second: "2-digit"
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

const formatJson = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  try {
    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return String(value);
  }
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
| Information Item
|--------------------------------------------------------------------------
*/

const InfoItem = ({
  icon: Icon,
  label,
  value,
  mono = false
}) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
          <Icon size={17} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p
            className={`mt-1 break-words text-sm font-semibold text-slate-700 ${
              mono
                ? "font-mono text-xs"
                : ""
            }`}
          >
            {value ||
              "Not available"}
          </p>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| JSON Data Card
|--------------------------------------------------------------------------
*/

const JsonDataCard = ({
  title,
  description,
  data,
  emptyMessage,
  onCopy,
  copied
}) => {
  const formattedData =
    useMemo(
      () => formatJson(data),
      [data]
    );

  const hasData =
    data !== null &&
    data !== undefined &&
    !(
      typeof data === "object" &&
      Object.keys(data).length ===
        0
    );

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-xs text-slate-400">
              {description}
            </p>
          )}
        </div>

        {hasData && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              onCopy(
                formattedData,
                title
              )
            }
          >
            {copied ? (
              <CheckCircle2
                size={16}
              />
            ) : (
              <Copy size={16} />
            )}

            {copied
              ? "Copied"
              : "Copy JSON"}
          </button>
        )}
      </div>

      {hasData ? (
        <div className="max-h-[520px] overflow-auto bg-slate-950 p-4 sm:p-5">
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-200">
            {formattedData}
          </pre>
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center p-5 text-center">
          <Code2
            size={28}
            className="text-slate-300"
          />

          <p className="mt-2 text-sm font-semibold text-slate-700">
            {emptyMessage}
          </p>
        </div>
      )}
    </section>
  );
};

/*
|--------------------------------------------------------------------------
| Audit Log Details
|--------------------------------------------------------------------------
*/

const AuditLogDetails = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const {
    user: currentUser
  } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | Permission
  |--------------------------------------------------------------------------
  */

  const canDelete =
    currentUser?.role ===
    "super_admin";

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [
    auditLog,
    setAuditLog
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
    deleting,
    setDeleting
  ] = useState(false);

  const [
    deleteOpen,
    setDeleteOpen
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
    copiedSection,
    setCopiedSection
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Load Audit Log
  |--------------------------------------------------------------------------
  */

  const fetchAuditLog =
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
          await getAuditLogById(
            id
          );

        setAuditLog(
          data?.auditLog ||
            null
        );
      } catch (
        requestError
      ) {
        setAuditLog(null);

        setError(
          requestError.response
            ?.data?.message ||
            "Audit log details could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  useEffect(() => {
    fetchAuditLog();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /*
  |--------------------------------------------------------------------------
  | Auto Hide Success
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
  | Auto Reset Copy State
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!copiedSection) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () => {
          setCopiedSection("");
        },
        2000
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [copiedSection]);

  /*
  |--------------------------------------------------------------------------
  | Copy JSON
  |--------------------------------------------------------------------------
  */

  const handleCopy =
    async (
      content,
      section
    ) => {
      try {
        await navigator.clipboard.writeText(
          content
        );

        setCopiedSection(
          section
        );
      } catch {
        setError(
          "Data could not be copied to the clipboard."
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Delete Audit Log
  |--------------------------------------------------------------------------
  */

  const handleDelete =
    async () => {
      if (!auditLog) {
        return;
      }

      setDeleting(true);
      setError("");

      try {
        const { data } =
          await deleteAuditLog(
            auditLog._id
          );

        navigate(
          "/audit-logs",
          {
            replace: true,

            state: {
              success:
                data?.message ||
                "Audit log deleted successfully."
            }
          }
        );
      } catch (
        requestError
      ) {
        setError(
          requestError.response
            ?.data?.message ||
            "Audit log could not be deleted."
        );

        setDeleting(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | User Snapshot Values
  |--------------------------------------------------------------------------
  */

  const userName =
    auditLog?.userName ||
    auditLog?.userId?.name ||
    "Unknown user";

  const userEmail =
    auditLog?.userEmail ||
    auditLog?.userId?.email ||
    "Not available";

  const userRole =
    auditLog?.userRole ||
    auditLog?.userId?.role ||
    "";

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div>
      <PageHeader
        title="Audit Log Details"
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
                fetchAuditLog({
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

            {canDelete &&
              auditLog && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  onClick={() => {
                    setError("");
                    setDeleteOpen(
                      true
                    );
                  }}
                >
                  <Trash2
                    size={16}
                  />

                  Delete
                </button>
              )}
          </div>
        }
      />

      {/* Success Message */}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2
            size={17}
          />

          {success}
        </div>
      )}

      {/* Page Error */}

      {error &&
        !deleteOpen && (
          <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

      {/* Loading */}

      {loading ? (
        <div className="card flex min-h-64 items-center justify-center text-sm text-slate-400">
          Loading audit log...
        </div>
      ) : !auditLog ? (
        <div className="card flex min-h-64 flex-col items-center justify-center p-5 text-center">
          <ShieldCheck
            size={34}
            className="text-slate-300"
          />

          <p className="mt-3 font-semibold text-slate-700">
            Audit log not found
          </p>

          <button
            type="button"
            className="btn-secondary mt-4"
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
        </div>
      ) : (
        <div className="space-y-5">
          {/*
          |--------------------------------------------------------------------------
          | Activity Header
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Activity
                    size={28}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={getActionTone(
                        auditLog.action
                      )}
                    >
                      {formatLabel(
                        auditLog.action
                      )}
                    </Badge>

                    <Badge
                      tone={getStatusTone(
                        auditLog.status
                      )}
                    >
                      {auditLog.status ===
                      "success"
                        ? "Success"
                        : "Failed"}
                    </Badge>

                    <Badge tone="neutral">
                      {formatLabel(
                        auditLog.module
                      )}
                    </Badge>
                  </div>

                  <h1 className="mt-3 text-xl font-bold text-slate-900">
                    {auditLog.description ||
                      "System activity"}
                  </h1>

                  <p className="mt-2 text-sm text-slate-500">
                    Performed by{" "}
                    <strong className="text-slate-700">
                      {userName}
                    </strong>{" "}
                    on{" "}
                    {formatDateTime(
                      auditLog.createdAt
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Audit Log ID
                </p>

                <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-700">
                  {auditLog._id}
                </p>
              </div>
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | User and Activity Information
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Activity Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoItem
                icon={UserRound}
                label="User"
                value={userName}
              />

              <InfoItem
                icon={Mail}
                label="User Email"
                value={userEmail}
              />

              <InfoItem
                icon={ShieldCheck}
                label="User Role"
                value={formatLabel(
                  userRole
                )}
              />

              <InfoItem
                icon={Building2}
                label="School"
                value={
                  auditLog.schoolId
                    ?.schoolName ||
                  "Global system"
                }
              />

              <InfoItem
                icon={Activity}
                label="Action"
                value={formatLabel(
                  auditLog.action
                )}
              />

              <InfoItem
                icon={FileText}
                label="Module"
                value={formatLabel(
                  auditLog.module
                )}
              />

              <InfoItem
                icon={
                  auditLog.status ===
                  "success"
                    ? CheckCircle2
                    : XCircle
                }
                label="Status"
                value={formatLabel(
                  auditLog.status
                )}
              />

              <InfoItem
                icon={CalendarDays}
                label="Date and Time"
                value={formatDateTime(
                  auditLog.createdAt
                )}
              />
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Related Record
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Related Record
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoItem
                icon={FileKey2}
                label="Record Model"
                value={
                  auditLog.recordModel ||
                  "Not linked"
                }
              />

              <InfoItem
                icon={Hash}
                label="Record ID"
                value={
                  auditLog.recordId ||
                  "Not linked"
                }
                mono
              />

              <InfoItem
                icon={CalendarDays}
                label="Created At"
                value={formatDateTime(
                  auditLog.createdAt
                )}
              />

              <InfoItem
                icon={Clock3}
                label="Updated At"
                value={formatDateTime(
                  auditLog.updatedAt
                )}
              />
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Request Information
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Request Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoItem
                icon={Globe2}
                label="IP Address"
                value={
                  auditLog.ipAddress ||
                  "Not recorded"
                }
                mono
              />

              <InfoItem
                icon={Route}
                label="HTTP Method"
                value={
                  auditLog.requestMethod ||
                  "Not recorded"
                }
              />

              <InfoItem
                icon={Route}
                label="Request Path"
                value={
                  auditLog.requestPath ||
                  "Not recorded"
                }
                mono
              />

              <InfoItem
                icon={
                  MonitorSmartphone
                }
                label="User Agent"
                value={
                  auditLog.userAgent ||
                  "Not recorded"
                }
              />
            </div>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Description
          |--------------------------------------------------------------------------
          */}

          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Info
                size={18}
                className="text-brand-700"
              />

              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Description
              </h2>
            </div>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {auditLog.description ||
                "No activity description was recorded."}
            </p>
          </section>

          {/*
          |--------------------------------------------------------------------------
          | Old and New Data
          |--------------------------------------------------------------------------
          */}

          <div className="grid gap-5 xl:grid-cols-2">
            <JsonDataCard
              title="Old Data"
              description="Record state before the activity"
              data={
                auditLog.oldData
              }
              emptyMessage="No previous data was recorded"
              onCopy={
                handleCopy
              }
              copied={
                copiedSection ===
                "Old Data"
              }
            />

            <JsonDataCard
              title="New Data"
              description="Record state after the activity"
              data={
                auditLog.newData
              }
              emptyMessage="No new data was recorded"
              onCopy={
                handleCopy
              }
              copied={
                copiedSection ===
                "New Data"
              }
            />
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Metadata
          |--------------------------------------------------------------------------
          */}

          <JsonDataCard
            title="Metadata"
            description="Additional technical and contextual information"
            data={auditLog.metadata}
            emptyMessage="No metadata was recorded"
            onCopy={handleCopy}
            copied={
              copiedSection ===
              "Metadata"
            }
          />
        </div>
      )}

      {/*
      |--------------------------------------------------------------------------
      | Delete Confirmation
      |--------------------------------------------------------------------------
      */}

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(
              false
            );

            setError("");
          }
        }}
        title="Delete Audit Log"
        width="max-w-md"
      >
        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Trash2
                size={20}
              />
            </div>

            <div>
              <p className="text-sm leading-6 text-slate-600">
                Are you sure you want
                to delete this audit
                log?
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatLabel(
                  auditLog?.action
                )}{" "}
                ·{" "}
                {formatLabel(
                  auditLog?.module
                )}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
            This log will be soft
            deleted. It can later be
            restored from the deleted
            audit logs page.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={deleting}
              onClick={() => {
                setDeleteOpen(
                  false
                );

                setError("");
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {deleting
                ? "Deleting..."
                : "Delete Audit Log"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AuditLogDetails;