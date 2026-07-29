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
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet
} from "lucide-react";

import {
  getFeeStructures
} from "../../api/feeStructures";

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
  FeeStructureFormModal
} from "./FeeStructureFormModal";

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
| Calculate Total Fee
|--------------------------------------------------------------------------
*/

const calculateTotal = (
  feeStructure
) => {
  return (
    Number(
      feeStructure.monthlyFee || 0
    ) +
    Number(
      feeStructure.admissionFee || 0
    ) +
    Number(
      feeStructure.examFee || 0
    ) +
    Number(
      feeStructure.transportFee || 0
    ) +
    Number(
      feeStructure.otherFee || 0
    )
  );
};

/*
|--------------------------------------------------------------------------
| Calculate Other Fees
|--------------------------------------------------------------------------
*/

const calculateOtherFees = (
  feeStructure
) => {
  return (
    Number(
      feeStructure.admissionFee || 0
    ) +
    Number(
      feeStructure.examFee || 0
    ) +
    Number(
      feeStructure.transportFee || 0
    ) +
    Number(
      feeStructure.otherFee || 0
    )
  );
};

/*
|--------------------------------------------------------------------------
| Loading Rows
|--------------------------------------------------------------------------
*/

const LoadingRows = () => (
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
          <div className="h-3 w-44 rounded bg-slate-100" />

          <div className="h-2.5 w-60 max-w-full rounded bg-slate-100" />
        </div>

        <div className="h-6 w-16 rounded-full bg-slate-100" />
      </div>
    ))}
  </div>
);

/*
|--------------------------------------------------------------------------
| Fee Structures List
|--------------------------------------------------------------------------
*/

const FeeStructuresList = () => {
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
    feeStructures,
    setFeeStructures
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
  | Search and Filters
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

  const [
    filters,
    setFilters
  ] = useState({
    schoolId: "",
    classId: "",
    sessionYear: "",
    isActive: "",
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
  | Receive Success Message from Details Page
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
      window.setTimeout(() => {
        setDebouncedSearch(
          search.trim()
        );

        setFilters(
          (current) => ({
            ...current,
            page: 1
          })
        );
      }, 350);

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

          setClasses(
            data?.classes ||
              []
          );
        } catch {
          setClasses([]);
        }
      };

    loadClasses();
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
        filters.sessionYear.trim()
      ) {
        params.sessionYear =
          filters.sessionYear.trim();
      }

      if (
        filters.isActive !==
        ""
      ) {
        params.isActive =
          filters.isActive;
      }

      return params;
    }, [
      debouncedSearch,
      filters,
      isSuperAdmin
    ]);

  /*
  |--------------------------------------------------------------------------
  | Fetch Fee Structures
  |--------------------------------------------------------------------------
  */

  const fetchFeeStructures =
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
          await getFeeStructures(
            queryParams
          );

        setFeeStructures(
          data?.feeStructures ||
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
        setFeeStructures([]);

        setError(
          requestError.response
            ?.data?.message ||
            "Fee structures could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Load Fee Structures
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchFeeStructures();

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
      sessionYear: "",
      isActive: "",
      page: 1,
      limit: 10
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Handle Created Fee Structure
  |--------------------------------------------------------------------------
  */

  const handleCreated = (
    feeStructure,
    message
  ) => {
    setCreateOpen(false);

    setSuccess(
      message ||
        `${
          feeStructure?.title ||
          "Fee structure"
        } created successfully.`
    );

    if (
      filters.page === 1
    ) {
      fetchFeeStructures({
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
  | Check Filters
  |--------------------------------------------------------------------------
  */

  const hasFilters =
    Boolean(
      search ||
        filters.schoolId ||
        filters.classId ||
        filters.sessionYear ||
        filters.isActive !==
          ""
    );

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div>
      <PageHeader
        title="Fee Structures"
        action={
          <div className="flex flex-wrap gap-2">
            {canDelete && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  navigate(
                    "/fee-structures/deleted"
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
                fetchFeeStructures(
                  {
                    silent: true
                  }
                )
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

              Add Fee Structure
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
        {/* Filters */}

        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div
            className={`grid gap-3 md:grid-cols-2 ${
              isSuperAdmin
                ? "xl:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(145px,0.7fr))_auto]"
                : "xl:grid-cols-[minmax(240px,1.5fr)_repeat(3,minmax(165px,0.7fr))_auto]"
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
                placeholder="Search title or session"
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
                filters.isActive
              }
              onChange={updateFilter(
                "isActive"
              )}
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

            {/* Clear Filters */}

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
                fetchFeeStructures()
              }
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}

        {loading ? (
          <LoadingRows />
        ) : (
          <>
            {/* Desktop Table */}

            <div className="hidden p-4 lg:block lg:p-5">
              <Table
                columns={[
                  "Fee Structure",
                  "Class",
                  "School",
                  "Monthly Fee",
                  "Other Fees",
                  "Total",
                  "Status",
                  "Action"
                ]}
              >
                {feeStructures.length ===
                0 ? (
                  <EmptyState
                    colSpan={8}
                    icon={Wallet}
                    title="No fee structures found"
                    description={
                      hasFilters
                        ? "Try changing the selected filters"
                        : "No fee structures are available"
                    }
                  />
                ) : (
                  feeStructures.map(
                    (
                      feeStructure
                    ) => (
                      <tr
                        key={
                          feeStructure._id
                        }
                        className="transition hover:bg-slate-50/70"
                      >
                        {/* Structure */}

                        <Td>
                          <div className="min-w-[210px]">
                            <p className="font-semibold text-slate-800">
                              {
                                feeStructure.title
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Session{" "}
                              {
                                feeStructure.sessionYear
                              }
                            </p>
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

                            {feeStructure
                              .classId
                              ?.className ||
                              "-"}
                          </div>
                        </Td>

                        {/* School */}

                        <Td>
                          <div className="flex min-w-[170px] items-center gap-2">
                            <Building2
                              size={
                                15
                              }
                              className="text-slate-400"
                            />

                            <span className="truncate">
                              {feeStructure
                                .schoolId
                                ?.schoolName ||
                                "-"}
                            </span>
                          </div>
                        </Td>

                        {/* Monthly Fee */}

                        <Td>
                          <span className="whitespace-nowrap font-semibold text-slate-700">
                            {formatCurrency(
                              feeStructure.monthlyFee
                            )}
                          </span>
                        </Td>

                        {/* Other Fees */}

                        <Td>
                          <span className="whitespace-nowrap text-slate-600">
                            {formatCurrency(
                              calculateOtherFees(
                                feeStructure
                              )
                            )}
                          </span>
                        </Td>

                        {/* Total */}

                        <Td>
                          <span className="whitespace-nowrap font-bold text-brand-700">
                            {formatCurrency(
                              calculateTotal(
                                feeStructure
                              )
                            )}
                          </span>
                        </Td>

                        {/* Status */}

                        <Td>
                          <Badge
                            tone={
                              feeStructure.isActive
                                ? "success"
                                : "danger"
                            }
                          >
                            {feeStructure.isActive
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </Td>

                        {/* Action */}

                        <Td>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                            onClick={() =>
                              navigate(
                                `/fee-structures/${feeStructure._id}`
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
              {feeStructures.length ===
              0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center">
                  <Wallet
                    size={28}
                    className="text-slate-300"
                  />

                  <p className="mt-2 text-sm font-semibold">
                    No fee
                    structures found
                  </p>
                </div>
              ) : (
                feeStructures.map(
                  (
                    feeStructure
                  ) => (
                    <article
                      key={
                        feeStructure._id
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate font-semibold text-slate-800">
                            {
                              feeStructure.title
                            }
                          </h2>

                          <p className="mt-1 text-xs text-slate-500">
                            {feeStructure
                              .classId
                              ?.className ||
                              "-"}{" "}
                            ·{" "}
                            {
                              feeStructure.sessionYear
                            }
                          </p>
                        </div>

                        <Badge
                          tone={
                            feeStructure.isActive
                              ? "success"
                              : "danger"
                          }
                        >
                          {feeStructure.isActive
                            ? "Active"
                            : "Inactive"}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                        <div>
                          <span className="block text-slate-400">
                            Monthly Fee
                          </span>

                          <strong className="mt-1 block text-slate-700">
                            {formatCurrency(
                              feeStructure.monthlyFee
                            )}
                          </strong>
                        </div>

                        <div>
                          <span className="block text-slate-400">
                            Total Listed
                            Fee
                          </span>

                          <strong className="mt-1 block text-brand-700">
                            {formatCurrency(
                              calculateTotal(
                                feeStructure
                              )
                            )}
                          </strong>
                        </div>

                        <div className="sm:col-span-2">
                          <span className="block text-slate-400">
                            School
                          </span>

                          <span className="mt-1 block">
                            {feeStructure
                              .schoolId
                              ?.schoolName ||
                              "-"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600"
                        onClick={() =>
                          navigate(
                            `/fee-structures/${feeStructure._id}`
                          )
                        }
                      >
                        <Eye
                          size={16}
                        />

                        View Details
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

      {/* Create Modal */}

      <FeeStructureFormModal
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

export default FeeStructuresList;