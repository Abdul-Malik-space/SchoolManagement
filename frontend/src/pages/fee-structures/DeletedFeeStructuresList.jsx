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
  GraduationCap,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Wallet
} from "lucide-react";

import {
  getDeletedFeeStructures,
  restoreFeeStructure
} from "../../api/feeStructures";

import {
  getSchools
} from "../../api/schools";

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
    "en-PK",
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
| Calculate Total Fee
|--------------------------------------------------------------------------
*/

const calculateTotal = (
  feeStructure
) => {
  return (
    Number(
      feeStructure.monthlyFee ||
        0
    ) +
    Number(
      feeStructure.admissionFee ||
        0
    ) +
    Number(
      feeStructure.examFee ||
        0
    ) +
    Number(
      feeStructure.transportFee ||
        0
    ) +
    Number(
      feeStructure.otherFee ||
        0
    )
  );
};

/*
|--------------------------------------------------------------------------
| Deleted Fee Structures List
|--------------------------------------------------------------------------
*/

const DeletedFeeStructuresList =
  () => {
    const navigate =
      useNavigate();

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
      sessionYear: "",
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
          filters.sessionYear.trim()
        ) {
          params.sessionYear =
            filters.sessionYear.trim();
        }

        return params;
      }, [
        debouncedSearch,
        filters,
        isSuperAdmin
      ]);

    /*
    |--------------------------------------------------------------------------
    | Fetch Deleted Fee Structures
    |--------------------------------------------------------------------------
    */

    const fetchDeleted =
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
            await getDeletedFeeStructures(
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
              limit: 10,
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
              "Deleted fee structures could not be loaded."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Load Deleted Fee Structures
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      fetchDeleted();

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryParams]);

    /*
    |--------------------------------------------------------------------------
    | Restore Fee Structure
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
            await restoreFeeStructure(
              restoreTarget._id
            );

          setRestoreTarget(
            null
          );

          setSuccess(
            data?.message ||
              "Fee structure restored successfully."
          );

          fetchDeleted({
            silent: true
          });
        } catch (
          requestError
        ) {
          setError(
            requestError.response
              ?.data?.message ||
              "Fee structure could not be restored."
          );
        } finally {
          setRestoring(false);
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
      <div>
        <PageHeader
          title="Deleted Fee Structures"
          action={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  navigate(
                    "/fee-structures"
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
                  fetchDeleted({
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                  placeholder="Search deleted structures"
                />
              </div>

              {/* School Filter */}

              {isSuperAdmin && (
                <select
                  className="field-select"
                  value={
                    filters.schoolId
                  }
                  onChange={(
                    event
                  ) =>
                    setFilters(
                      (
                        current
                      ) => ({
                        ...current,

                        schoolId:
                          event
                            .target
                            .value,

                        page: 1
                      })
                    )
                  }
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

              {/* Session Filter */}

              <input
                type="text"
                className="field-input"
                value={
                  filters.sessionYear
                }
                onChange={(
                  event
                ) =>
                  setFilters(
                    (
                      current
                    ) => ({
                      ...current,

                      sessionYear:
                        event
                          .target
                          .value,

                      page: 1
                    })
                  )
                }
                placeholder="Session year"
              />
            </div>
          </div>

          {/* Error Message */}

          {error && (
            <div className="mx-4 mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-5">
              {error}
            </div>
          )}

          {/* Loading */}

          {loading ? (
            <div className="flex min-h-56 items-center justify-center text-sm text-slate-400">
              Loading deleted fee
              structures...
            </div>
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
                    "Fee Structure",
                    "Class",
                    "School",
                    "Total",
                    "Deleted At",
                    "Deleted By",
                    "Action"
                  ]}
                >
                  {feeStructures.length ===
                  0 ? (
                    <EmptyState
                      colSpan={7}
                      icon={Trash2}
                      title="No deleted fee structures"
                      description="Deleted fee structures will appear here"
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
                          {/* Fee Structure */}

                          <Td>
                            <div className="min-w-[190px]">
                              <p className="font-semibold text-slate-800">
                                {
                                  feeStructure.title
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  feeStructure.sessionYear
                                }
                              </p>
                            </div>
                          </Td>

                          {/* Class */}

                          <Td>
                            <div className="flex items-center gap-2">
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
                            <div className="flex min-w-[160px] items-center gap-2">
                              <Building2
                                size={
                                  15
                                }
                                className="text-slate-400"
                              />

                              {feeStructure
                                .schoolId
                                ?.schoolName ||
                                "-"}
                            </div>
                          </Td>

                          {/* Total Fee */}

                          <Td>
                            <strong className="whitespace-nowrap text-brand-700">
                              {formatCurrency(
                                calculateTotal(
                                  feeStructure
                                )
                              )}
                            </strong>
                          </Td>

                          {/* Deleted At */}

                          <Td>
                            {formatDate(
                              feeStructure.deletedAt
                            )}
                          </Td>

                          {/* Deleted By */}

                          <Td>
                            {feeStructure
                              .deletedBy
                              ?.name ||
                              "Not available"}
                          </Td>

                          {/* Restore Action */}

                          <Td>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                              onClick={() => {
                                setError(
                                  ""
                                );

                                setRestoreTarget(
                                  feeStructure
                                );
                              }}
                            >
                              <RotateCcw
                                size={
                                  15
                                }
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
                {feeStructures.length ===
                0 ? (
                  <div className="flex min-h-56 flex-col items-center justify-center">
                    <Wallet
                      size={28}
                      className="text-slate-300"
                    />

                    <p className="mt-2 text-sm font-semibold">
                      No deleted fee
                      structures
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
                        <div className="flex justify-between gap-3">
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

                          <Badge tone="danger">
                            Deleted
                          </Badge>
                        </div>

                        <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                          <div>
                            <span className="block text-slate-400">
                              Total Fee
                            </span>

                            <strong className="mt-1 block text-brand-700">
                              {formatCurrency(
                                calculateTotal(
                                  feeStructure
                                )
                              )}
                            </strong>
                          </div>

                          <div>
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

                          <div className="sm:col-span-2">
                            <span className="block text-slate-400">
                              Deleted At
                            </span>

                            <span className="mt-1 block">
                              {formatDate(
                                feeStructure.deletedAt
                              )}
                            </span>
                          </div>

                          <div className="sm:col-span-2">
                            <span className="block text-slate-400">
                              Deleted By
                            </span>

                            <span className="mt-1 block">
                              {feeStructure
                                .deletedBy
                                ?.name ||
                                "Not available"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                          onClick={() => {
                            setError(
                              ""
                            );

                            setRestoreTarget(
                              feeStructure
                            );
                          }}
                        >
                          <RotateCcw
                            size={16}
                          />

                          Restore Fee
                          Structure
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
                    (
                      current
                    ) => ({
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
          title="Restore Fee Structure"
          width="max-w-md"
        >
          <div className="space-y-5">
            {error && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <p className="text-sm leading-6 text-slate-600">
              Are you sure you want
              to restore{" "}
              <strong>
                {
                  restoreTarget?.title
                }
              </strong>
              ?
            </p>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
              The fee structure will
              return to the active fee
              structures list.
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
                  : "Restore Fee Structure"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

export default DeletedFeeStructuresList;