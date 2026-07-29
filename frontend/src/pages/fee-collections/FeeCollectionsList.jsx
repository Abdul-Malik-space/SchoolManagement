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
  CalendarDays,
  Eye,
  GraduationCap,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Wallet
} from "lucide-react";

import {
  getFeeCollections
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
  EmptyState,
  Table,
  Td
} from "../../components/ui/Table";

import {
  Pagination
} from "../../components/ui/Pagination";

import {
  FeeCollectionFormModal
} from "./FeeCollectionFormModal";

/*
|--------------------------------------------------------------------------
| Currency Formatter
|--------------------------------------------------------------------------
*/

const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    "en-PK",
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
| Month Formatter
|--------------------------------------------------------------------------
*/

const formatMonth = (value) => {
  if (!value) {
    return "Not available";
  }

  const [
    year,
    month
  ] = value.split("-");

  if (!year || !month) {
    return value;
  }

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      month: "short",
      year: "numeric"
    }
  ).format(date);
};

/*
|--------------------------------------------------------------------------
| Payment Status Badge
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
| Loading Rows
|--------------------------------------------------------------------------
*/

const LoadingRows = () => {
  return (
    <div className="space-y-3 p-4 sm:p-5">
      {Array.from({
        length: 6
      }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-3"
        >
          <div className="h-10 w-10 rounded-xl bg-slate-100" />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-48 rounded bg-slate-100" />

            <div className="h-2.5 w-64 max-w-full rounded bg-slate-100" />
          </div>

          <div className="h-6 w-20 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  description
}) => {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon size={19} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 truncate text-lg font-bold text-slate-800">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Fee Collections List
|--------------------------------------------------------------------------
*/

const FeeCollectionsList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user: currentUser
  } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | Permissions
  |--------------------------------------------------------------------------
  */

  const isSuperAdmin =
    currentUser?.role ===
    "super_admin";

  const canDelete = [
    "super_admin",
    "principal"
  ].includes(
    currentUser?.role
  );

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
    error,
    setError
  ] = useState("");

  const [
    success,
    setSuccess
  ] = useState("");

  const [
    createOpen,
    setCreateOpen
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Search
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
  | Effective School ID
  |--------------------------------------------------------------------------
  */

  const effectiveSchoolId =
    isSuperAdmin
      ? filters.schoolId
      : currentSchoolId;

  /*
  |--------------------------------------------------------------------------
  | Receive Success Message
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !location.state?.success
    ) {
      return;
    }

    setSuccess(
      location.state.success
    );

    navigate(
      location.pathname,
      {
        replace: true,
        state: null
      }
    );
  }, [
    location.pathname,
    location.state,
    navigate
  ]);

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
            (
              data?.schools ||
              []
            ).filter(
              (school) =>
                school.isActive
            )
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
    if (
      !effectiveSchoolId
    ) {
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
                    effectiveSchoolId,

                  isActive:
                    true
                }
              : {
                  isActive:
                    true
                };

          const { data } =
            await getClasses(
              params
            );

          if (activeRequest) {
            setClasses(
              data?.classes ||
                []
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

      if (
        debouncedSearch
      ) {
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

      if (
        filters.classId
      ) {
        params.classId =
          filters.classId;
      }

      if (
        filters.feeMonth
      ) {
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
  | Page Summary
  |--------------------------------------------------------------------------
  */

  const pageSummary =
    useMemo(() => {
      return feeCollections.reduce(
        (
          summary,
          feeCollection
        ) => {
          summary.payable +=
            Number(
              feeCollection.payableAmount ||
                0
            );

          summary.paid +=
            Number(
              feeCollection.paidAmount ||
                0
            );

          summary.balance +=
            Number(
              feeCollection.balanceAmount ||
                0
            );

          if (
            feeCollection.paymentStatus ===
            "paid"
          ) {
            summary.paidCount += 1;
          }

          if (
            feeCollection.paymentStatus ===
            "partial"
          ) {
            summary.partialCount += 1;
          }

          if (
            feeCollection.paymentStatus ===
            "unpaid"
          ) {
            summary.unpaidCount += 1;
          }

          return summary;
        },
        {
          payable: 0,
          paid: 0,
          balance: 0,
          paidCount: 0,
          partialCount: 0,
          unpaidCount: 0
        }
      );
    }, [feeCollections]);

  /*
  |--------------------------------------------------------------------------
  | Fetch Fee Collections
  |--------------------------------------------------------------------------
  */

  const fetchFeeCollections =
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
          await getFeeCollections(
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
            "Fee collections could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Load Fee Collections
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchFeeCollections();

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
  | Handle Created Invoice
  |--------------------------------------------------------------------------
  */

  const handleCreated = (
    feeCollection,
    message
  ) => {
    setCreateOpen(false);

    setSuccess(
      message ||
        `Invoice ${
          feeCollection?.invoiceNumber ||
          ""
        } created successfully.`
    );

    if (
      filters.page === 1
    ) {
      fetchFeeCollections({
        silent: true
      });
    } else {
      setFilters(
        (current) => ({
          ...current,
          page: 1
        })
      );
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
        title="Fee Collections"
        action={
          <div className="flex flex-wrap gap-2">
            {canDelete && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  navigate(
                    "/fee-collections/deleted"
                  )
                }
              >
                <Trash2
                  size={16}
                />

                Deleted
              </button>
            )}

            <button
              type="button"
              className="btn-secondary"
              disabled={
                refreshing
              }
              onClick={() =>
                fetchFeeCollections({
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
              onClick={() =>
                setCreateOpen(
                  true
                )
              }
            >
              <Plus size={16} />

              Create Invoice
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

      {/* Summary Cards */}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Receipt}
          label="Invoices"
          value={
            feeCollections.length
          }
          description="Shown on current page"
        />

        <SummaryCard
          icon={Wallet}
          label="Payable"
          value={formatCurrency(
            pageSummary.payable
          )}
          description="Current page total"
        />

        <SummaryCard
          icon={Wallet}
          label="Collected"
          value={formatCurrency(
            pageSummary.paid
          )}
          description={`${pageSummary.paidCount} fully paid`}
        />

        <SummaryCard
          icon={Wallet}
          label="Balance"
          value={formatCurrency(
            pageSummary.balance
          )}
          description={`${pageSummary.partialCount} partial, ${pageSummary.unpaidCount} unpaid`}
        />
      </div>

      <div className="card overflow-hidden">
        {/* Filters */}

        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div
            className={`grid gap-3 md:grid-cols-2 ${
              isSuperAdmin
                ? "xl:grid-cols-[minmax(210px,1.4fr)_repeat(5,minmax(140px,0.7fr))_auto]"
                : "xl:grid-cols-[minmax(230px,1.5fr)_repeat(4,minmax(150px,0.7fr))_auto]"
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
                    event.target
                      .value
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

            {/* Session Year */}

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

            {/* Payment Status */}

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

        {error && (
          <div className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-5">
            <span>
              {error}
            </span>

            <button
              type="button"
              className="font-semibold"
              onClick={() =>
                fetchFeeCollections()
              }
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading or Data */}

        {loading ? (
          <LoadingRows />
        ) : (
          <>
            {/* Desktop Table */}

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
                  "Action"
                ]}
              >
                {feeCollections.length ===
                0 ? (
                  <EmptyState
                    colSpan={9}
                    icon={Receipt}
                    title="No fee collections found"
                    description={
                      hasFilters
                        ? "Try changing the selected filters"
                        : "Create the first fee invoice"
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
                          <div className="min-w-[180px]">
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
                                size={
                                  16
                                }
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
                          <div className="flex min-w-[120px] items-center gap-2">
                            <GraduationCap
                              size={
                                15
                              }
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
                              size={
                                15
                              }
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

                        {/* Action */}

                        <Td>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                            onClick={() =>
                              navigate(
                                `/fee-collections/${feeCollection._id}`
                              )
                            }
                          >
                            <Eye
                              size={
                                15
                              }
                            />

                            View
                          </button>
                        </Td>
                      </tr>
                    )
                  )
                )}
              </Table>
            </div>

            {/* Mobile Cards */}

            <div className="divide-y divide-slate-100 lg:hidden">
              {feeCollections.length ===
              0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center">
                  <Receipt
                    size={30}
                    className="text-slate-300"
                  />

                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    No fee collections
                    found
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

                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
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

                      <button
                        type="button"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        onClick={() =>
                          navigate(
                            `/fee-collections/${feeCollection._id}`
                          )
                        }
                      >
                        <Eye
                          size={16}
                        />

                        View Invoice
                      </button>
                    </article>
                  )
                )
              )}
            </div>

            {/* Pagination */}

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
                refreshing
              }
            />
          </>
        )}
      </div>

      {/* Create Invoice Modal */}

      <FeeCollectionFormModal
        open={createOpen}
        onClose={() =>
          setCreateOpen(false)
        }
        onSaved={
          handleCreated
        }
        schools={schools}
        currentUser={
          currentUser
        }
      />
    </div>
  );
};

export default FeeCollectionsList;