import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  GraduationCap,
  Loader2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  Wallet
} from "lucide-react";

import {
  getDeletedFeeCollections,
  restoreFeeCollection
} from "../../api/feeCollections";

import {
  getSchools
} from "../../api/schools";

import {
  getClasses
} from "../../api/classes";

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
| Currency Formatter
|--------------------------------------------------------------------------
*/

const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0
    }
  ).format(
    Number(value || 0)
  );
};

/*
|--------------------------------------------------------------------------
| Date Formatter
|--------------------------------------------------------------------------
*/

const formatDate = (value) => {
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

/*
|--------------------------------------------------------------------------
| Month Formatter
|--------------------------------------------------------------------------
*/

const formatMonth = (value) => {
  if (!value) {
    return "Not available";
  }

  const [year, month] =
    value.split("-");

  if (!year || !month) {
    return value;
  }

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      year: "numeric"
    }
  ).format(date);
};

/*
|--------------------------------------------------------------------------
| Status Helpers
|--------------------------------------------------------------------------
*/

const getStatusTone = (status) => {
  if (status === "paid") {
    return "success";
  }

  if (status === "partial") {
    return "warning";
  }

  return "danger";
};

const getStatusLabel = (status) => {
  if (status === "paid") {
    return "Paid";
  }

  if (status === "partial") {
    return "Partial";
  }

  return "Unpaid";
};

/*
|--------------------------------------------------------------------------
| Loading Skeleton
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
            <div className="h-3 w-52 rounded bg-slate-100" />

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
| Deleted Fee Collections
|--------------------------------------------------------------------------
*/

const DeletedFeeCollectionsList = () => {
  const navigate = useNavigate();

  const {
    user: currentUser
  } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | User Information
  |--------------------------------------------------------------------------
  */

  const isSuperAdmin =
    currentUser?.role ===
    "super_admin";

  const currentSchoolId =
    currentUser?.schoolId?._id ||
    currentUser?.schoolId ||
    "";

  /*
  |--------------------------------------------------------------------------
  | Data State
  |--------------------------------------------------------------------------
  */

  const [
    feeCollections,
    setFeeCollections
  ] = useState([]);

  const [
    schools,
    setSchools
  ] = useState([]);

  const [
    classes,
    setClasses
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
    classId: "",
    feeMonth: "",
    sessionYear: "",
    paymentStatus: "",
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
  | Effective School
  |--------------------------------------------------------------------------
  */

  const effectiveSchoolId =
    isSuperAdmin
      ? filters.schoolId
      : currentSchoolId;

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
      window.clearTimeout(timer);
    };
  }, [search]);

  /*
  |--------------------------------------------------------------------------
  | Load Schools
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!isSuperAdmin) {
      setSchools([]);
      return;
    }

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
  }, [isSuperAdmin]);

  /*
  |--------------------------------------------------------------------------
  | Load Classes
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!effectiveSchoolId) {
      setClasses([]);
      return;
    }

    let activeRequest = true;

    const loadClasses =
      async () => {
        try {
          const params =
            isSuperAdmin
              ? {
                  schoolId:
                    effectiveSchoolId
                }
              : {};

          const { data } =
            await getClasses(
              params
            );

          if (activeRequest) {
            setClasses(
              data?.classes || []
            );
          }
        } catch {
          if (activeRequest) {
            setClasses([]);
          }
        }
      };

    loadClasses();

    return () => {
      activeRequest = false;
    };
  }, [
    effectiveSchoolId,
    isSuperAdmin
  ]);

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
      window.clearTimeout(timer);
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

      if (
        isSuperAdmin &&
        filters.schoolId
      ) {
        params.schoolId =
          filters.schoolId;
      }

      if (filters.classId) {
        params.classId =
          filters.classId;
      }

      if (filters.feeMonth) {
        params.feeMonth =
          filters.feeMonth;
      }

      if (
        filters.sessionYear.trim()
      ) {
        params.sessionYear =
          filters.sessionYear.trim();
      }

      if (
        filters.paymentStatus
      ) {
        params.paymentStatus =
          filters.paymentStatus;
      }

      return params;
    }, [
      debouncedSearch,
      filters,
      isSuperAdmin
    ]);

  /*
  |--------------------------------------------------------------------------
  | Fetch Deleted Fee Collections
  |--------------------------------------------------------------------------
  */

  const fetchDeletedFeeCollections =
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
          await getDeletedFeeCollections(
            queryParams
          );

        setFeeCollections(
          data?.feeCollections ||
            []
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
        setFeeCollections([]);

        setError(
          requestError.response
            ?.data?.message ||
            "Deleted fee collections could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Load Data
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchDeletedFeeCollections();

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
        (current) => {
          const nextFilters = {
            ...current,
            [field]: value,
            page: 1
          };

          if (
            field ===
            "schoolId"
          ) {
            nextFilters.classId =
              "";
          }

          return nextFilters;
        }
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
      classId: "",
      feeMonth: "",
      sessionYear: "",
      paymentStatus: "",
      page: 1,
      limit: 10
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Restore Fee Collection
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
          await restoreFeeCollection(
            restoreTarget._id
          );

        setRestoreTarget(null);

        setSuccess(
          data?.message ||
            "Fee collection restored successfully."
        );

        if (
          feeCollections.length ===
            1 &&
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
          fetchDeletedFeeCollections({
            silent: true
          });
        }
      } catch (
        requestError
      ) {
        setError(
          requestError.response
            ?.data?.message ||
            "Fee collection could not be restored."
        );
      } finally {
        setRestoring(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Filters Check
  |--------------------------------------------------------------------------
  */

  const hasFilters =
    Boolean(
      search ||
        filters.schoolId ||
        filters.classId ||
        filters.feeMonth ||
        filters.sessionYear ||
        filters.paymentStatus
    );

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div>
      <PageHeader
        title="Deleted Fee Collections"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate(
                  "/fee-collections"
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
                fetchDeletedFeeCollections({
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
          <div
            className={`grid gap-3 md:grid-cols-2 ${
              isSuperAdmin
                ? "xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(140px,0.7fr))_auto]"
                : "xl:grid-cols-[minmax(240px,1.5fr)_repeat(4,minmax(150px,0.7fr))_auto]"
            }`}
          >
            {/* Search */}

            <div className="relative">
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
                placeholder="Invoice, student or admission no."
              />
            </div>

            {/* School */}

            {isSuperAdmin && (
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
            )}

            {/* Class */}

            <select
              className="field-select"
              value={
                filters.classId
              }
              onChange={updateFilter(
                "classId"
              )}
              disabled={
                !effectiveSchoolId
              }
            >
              <option value="">
                All classes
              </option>

              {classes.map(
                (classItem) => (
                  <option
                    key={
                      classItem._id
                    }
                    value={
                      classItem._id
                    }
                  >
                    {
                      classItem.className
                    }
                  </option>
                )
              )}
            </select>

            {/* Fee Month */}

            <input
              type="month"
              className="field-input"
              value={
                filters.feeMonth
              }
              onChange={updateFilter(
                "feeMonth"
              )}
            />

            {/* Session */}

            <input
              type="text"
              className="field-input"
              value={
                filters.sessionYear
              }
              onChange={updateFilter(
                "sessionYear"
              )}
              placeholder="Session year"
            />

            {/* Status */}

            <select
              className="field-select"
              value={
                filters.paymentStatus
              }
              onChange={updateFilter(
                "paymentStatus"
              )}
            >
              <option value="">
                All statuses
              </option>

              <option value="unpaid">
                Unpaid
              </option>

              <option value="partial">
                Partial
              </option>

              <option value="paid">
                Paid
              </option>
            </select>

            {/* Clear */}

            {hasFilters && (
              <button
                type="button"
                className="btn-ghost"
                onClick={
                  resetFilters
                }
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Error */}

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
                  fetchDeletedFeeCollections()
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
                  "Invoice",
                  "Student",
                  "Class",
                  "Month",
                  "Payable",
                  "Paid",
                  "Balance",
                  "Status",
                  "Deleted At",
                  "Action"
                ]}
              >
                {feeCollections.length ===
                0 ? (
                  <EmptyState
                    colSpan={10}
                    icon={Trash2}
                    title="No deleted fee collections"
                    description={
                      hasFilters
                        ? "Try changing the selected filters"
                        : "Deleted fee invoices will appear here"
                    }
                  />
                ) : (
                  feeCollections.map(
                    (
                      feeCollection
                    ) => (
                      <tr
                        key={
                          feeCollection._id
                        }
                        className="transition hover:bg-slate-50/70"
                      >
                        {/* Invoice */}

                        <Td>
                          <div className="min-w-[170px]">
                            <p className="font-semibold text-slate-800">
                              {
                                feeCollection.invoiceNumber
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Session{" "}
                              {
                                feeCollection.sessionYear
                              }
                            </p>
                          </div>
                        </Td>

                        {/* Student */}

                        <Td>
                          <div className="flex min-w-[190px] items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                              <UserRound
                                size={16}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-700">
                                {feeCollection
                                  .studentId
                                  ?.name ||
                                  "-"}
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                {feeCollection
                                  .studentId
                                  ?.admissionNumber ||
                                  "No admission number"}
                              </p>
                            </div>
                          </div>
                        </Td>

                        {/* Class */}

                        <Td>
                          <div className="flex min-w-[110px] items-center gap-2">
                            <GraduationCap
                              size={15}
                              className="text-slate-400"
                            />

                            {feeCollection
                              .classId
                              ?.className ||
                              "-"}
                          </div>
                        </Td>

                        {/* Month */}

                        <Td>
                          <div className="flex min-w-[110px] items-center gap-2">
                            <CalendarDays
                              size={15}
                              className="text-slate-400"
                            />

                            {formatMonth(
                              feeCollection.feeMonth
                            )}
                          </div>
                        </Td>

                        {/* Payable */}

                        <Td>
                          <span className="whitespace-nowrap font-semibold text-slate-700">
                            {formatCurrency(
                              feeCollection.payableAmount
                            )}
                          </span>
                        </Td>

                        {/* Paid */}

                        <Td>
                          <span className="whitespace-nowrap font-semibold text-emerald-700">
                            {formatCurrency(
                              feeCollection.paidAmount
                            )}
                          </span>
                        </Td>

                        {/* Balance */}

                        <Td>
                          <span className="whitespace-nowrap font-semibold text-rose-700">
                            {formatCurrency(
                              feeCollection.balanceAmount
                            )}
                          </span>
                        </Td>

                        {/* Status */}

                        <Td>
                          <Badge
                            tone={getStatusTone(
                              feeCollection.paymentStatus
                            )}
                          >
                            {getStatusLabel(
                              feeCollection.paymentStatus
                            )}
                          </Badge>
                        </Td>

                        {/* Deleted At */}

                        <Td>
                          <div className="min-w-[150px]">
                            <p className="text-sm text-slate-600">
                              {formatDate(
                                feeCollection.deletedAt
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              By{" "}
                              {feeCollection
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
                                feeCollection
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
              {feeCollections.length ===
              0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center p-5 text-center">
                  <ReceiptText
                    size={30}
                    className="text-slate-300"
                  />

                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    No deleted fee
                    collections
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Deleted invoices
                    will appear here.
                  </p>
                </div>
              ) : (
                feeCollections.map(
                  (
                    feeCollection
                  ) => (
                    <article
                      key={
                        feeCollection._id
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate font-semibold text-slate-800">
                            {
                              feeCollection.invoiceNumber
                            }
                          </h2>

                          <p className="mt-1 truncate text-sm font-medium text-slate-600">
                            {feeCollection
                              .studentId
                              ?.name ||
                              "-"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {feeCollection
                              .classId
                              ?.className ||
                              "-"}{" "}
                            ·{" "}
                            {formatMonth(
                              feeCollection.feeMonth
                            )}
                          </p>
                        </div>

                        <Badge
                          tone={getStatusTone(
                            feeCollection.paymentStatus
                          )}
                        >
                          {getStatusLabel(
                            feeCollection.paymentStatus
                          )}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <span className="block text-xs text-slate-400">
                            Payable
                          </span>

                          <strong className="mt-1 block text-xs text-slate-700 sm:text-sm">
                            {formatCurrency(
                              feeCollection.payableAmount
                            )}
                          </strong>
                        </div>

                        <div className="rounded-xl bg-emerald-50 p-3">
                          <span className="block text-xs text-emerald-500">
                            Paid
                          </span>

                          <strong className="mt-1 block text-xs text-emerald-700 sm:text-sm">
                            {formatCurrency(
                              feeCollection.paidAmount
                            )}
                          </strong>
                        </div>

                        <div className="rounded-xl bg-rose-50 p-3">
                          <span className="block text-xs text-rose-500">
                            Balance
                          </span>

                          <strong className="mt-1 block text-xs text-rose-700 sm:text-sm">
                            {formatCurrency(
                              feeCollection.balanceAmount
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <Building2
                            size={14}
                          />

                          <span className="truncate">
                            {feeCollection
                              .schoolId
                              ?.schoolName ||
                              "-"}
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          <Trash2
                            size={14}
                            className="mt-0.5 shrink-0"
                          />

                          <span>
                            Deleted{" "}
                            {formatDate(
                              feeCollection.deletedAt
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <UserRound
                            size={14}
                          />

                          <span>
                            {feeCollection
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
                            feeCollection
                          );
                        }}
                      >
                        <RotateCcw
                          size={16}
                        />

                        Restore Invoice
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
        title="Restore Fee Collection"
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
                Are you sure you
                want to restore
                invoice{" "}
                <strong>
                  {
                    restoreTarget?.invoiceNumber
                  }
                </strong>
                ?
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Student:{" "}
                {restoreTarget
                  ?.studentId
                  ?.name ||
                  "Not available"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
            The invoice and its
            complete payment history
            will return to the active
            fee collections list.
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">
                Payable Amount
              </span>

              <strong className="text-sm text-slate-700">
                {formatCurrency(
                  restoreTarget?.payableAmount
                )}
              </strong>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">
                Paid Amount
              </span>

              <strong className="text-sm text-emerald-700">
                {formatCurrency(
                  restoreTarget?.paidAmount
                )}
              </strong>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">
                Balance
              </span>

              <strong className="text-sm text-rose-700">
                {formatCurrency(
                  restoreTarget?.balanceAmount
                )}
              </strong>
            </div>
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
                : "Restore Invoice"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeletedFeeCollectionsList;