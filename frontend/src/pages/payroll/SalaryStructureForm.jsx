import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate,
  useParams
} from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  Banknote,
  Building2,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
  X
} from "lucide-react";

import api from "../../api/axios";

import {
  createSalaryStructure,
  getSalaryStructureById,
  previewSalaryStructure,
  updateSalaryStructure
} from "../../api/staffSalaryStructures";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Date Helper
|--------------------------------------------------------------------------
*/

const getTodayDate = () => {
  const date = new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/*
|--------------------------------------------------------------------------
| Initial Form
|--------------------------------------------------------------------------
*/

const createInitialForm = () => ({
  schoolId: "",
  staffId: "",

  currency: "PKR",
  payFrequency: "monthly",
  basicSalary: "",

  allowances: {
    houseRent: "",
    medical: "",
    transport: "",
    food: "",
    communication: "",
    special: "",
    other: []
  },

  deductions: {
    providentFund: "",
    tax: "",
    insurance: "",
    loanInstallment: "",
    other: []
  },

  calculationBasis:
    "attendance_based",

  workingDaysMethod:
    "fixed_working_days",

  fixedWorkingDays: 26,

  dailyRateBasis:
    "basic_salary",

  attendanceRules: {
    absenceDeductionEnabled:
      true,

    unpaidLeaveDeductionEnabled:
      true,

    halfDayDeductionEnabled:
      true,

    paidLeaveTypes: [
      "casual",
      "sick",
      "annual"
    ]
  },

  lateRules: {
    enabled: false,
    graceMinutes: 15,
    deductionMethod: "none",
    deductionRate: ""
  },

  overtimeRules: {
    enabled: false,

    rateMethod:
      "salary_multiplier",

    multiplier: 1.5,
    fixedHourlyRate: "",
    minimumMinutes: 30,
    maximumMonthlyMinutes: ""
  },

  paymentMethod: "cash",

  bankDetails: {
    bankName: "",
    accountTitle: "",
    accountNumber: "",
    iban: "",
    branchCode: "",
    walletProvider: "",
    walletNumber: ""
  },

  effectiveFrom:
    getTodayDate(),

  effectiveTo: "",

  status: "active",
  notes: ""
});

/*
|--------------------------------------------------------------------------
| Formatting Helpers
|--------------------------------------------------------------------------
*/

const safeNumber = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

const nonNegativeNumber = (
  value
) => {
  return Math.max(
    0,
    safeNumber(value)
  );
};

const roundMoney = (
  value
) => {
  return Number(
    safeNumber(value).toFixed(
      2
    )
  );
};

const formatMoney = (
  value,
  currency = "PKR"
) => {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency:
          currency || "PKR",

        currencyDisplay:
          "code",

        minimumFractionDigits:
          0,

        maximumFractionDigits:
          2
      }
    ).format(
      safeNumber(value)
    );
  } catch {
    return `PKR ${safeNumber(
      value
    ).toLocaleString(
      "en-US"
    )}`;
  }
};

const formatLabel = (
  value
) => {
  if (!value) {
    return "—";
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

const getErrorMessage = (
  error,
  fallbackMessage
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.message ||
    fallbackMessage
  );
};

const getObjectId = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "object"
  ) {
    return (
      value._id ||
      value.id ||
      ""
    );
  }

  return value;
};

/*
|--------------------------------------------------------------------------
| API Response Normalizers
|--------------------------------------------------------------------------
*/

const extractSchools = (
  response
) => {
  const data =
    response?.data || {};

  const possibleLists = [
    data.schools,
    data.data,
    data.results,
    data.records
  ];

  return (
    possibleLists.find(
      Array.isArray
    ) || []
  );
};

const extractStaff = (
  response
) => {
  const data =
    response?.data || {};

  const possibleLists = [
    data.staff,
    data.staffMembers,
    data.employees,
    data.data,
    data.results,
    data.records
  ];

  return (
    possibleLists.find(
      Array.isArray
    ) || []
  );
};

/*
|--------------------------------------------------------------------------
| UI Components
|--------------------------------------------------------------------------
*/

const FormSection = ({
  title,
  description,
  icon: Icon,
  children
}) => {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon size={19} />
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-800">
            {title}
          </h3>

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
};

const Field = ({
  label,
  required = false,
  hint,
  children
}) => {
  return (
    <label className="block">
      <span className="field-label">
        {label}

        {required && (
          <span className="ml-1 text-rose-500">
            *
          </span>
        )}
      </span>

      <div className="mt-1.5">
        {children}
      </div>

      {hint && (
        <span className="mt-1.5 block text-[11px] leading-4 text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
};

const ToggleField = ({
  checked,
  onChange,
  title,
  description
}) => {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-brand-200">
      <div>
        <p className="text-sm font-semibold text-slate-700">
          {title}
        </p>

        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {description}
          </p>
        )}
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
    </label>
  );
};

const MessageBox = ({
  type,
  message,
  onClose
}) => {
  if (!message) {
    return null;
  }

  const isSuccess =
    type === "success";

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {isSuccess ? (
          <CheckCircle2
            size={17}
            className="mt-0.5 shrink-0"
          />
        ) : (
          <AlertTriangle
            size={17}
            className="mt-0.5 shrink-0"
          />
        )}

        <span>{message}</span>
      </div>

      <button
        type="button"
        onClick={onClose}
        className={`rounded-lg p-1 transition ${
          isSuccess
            ? "hover:bg-emerald-100"
            : "hover:bg-rose-100"
        }`}
      >
        <X size={16} />
      </button>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Salary Structure Form
|--------------------------------------------------------------------------
*/

export const SalaryStructureForm =
  () => {
    const navigate =
      useNavigate();

    const {
      id
    } = useParams();

    const {
      user
    } = useAuth();

    const isEditMode =
      Boolean(id);

    const userRole =
      String(
        user?.role || ""
      ).toLowerCase();

    const isSuperAdmin =
      userRole ===
      "super_admin";

    const canManage =
      [
        "super_admin",
        "principal"
      ].includes(
        userRole
      );

    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */

    const [
      form,
      setForm
    ] = useState(
      createInitialForm
    );

    const [
      schools,
      setSchools
    ] = useState([]);

    const [
      staffMembers,
      setStaffMembers
    ] = useState([]);

    const [
      loading,
      setLoading
    ] = useState(
      isEditMode
    );

    const [
      schoolsLoading,
      setSchoolsLoading
    ] = useState(false);

    const [
      staffLoading,
      setStaffLoading
    ] = useState(false);

    const [
      saving,
      setSaving
    ] = useState(false);

    const [
      previewing,
      setPreviewing
    ] = useState(false);

    const [
      verifiedCalculation,
      setVerifiedCalculation
    ] = useState(null);

    const [
      error,
      setError
    ] = useState("");

    const [
      successMessage,
      setSuccessMessage
    ] = useState("");

    /*
    |--------------------------------------------------------------------------
    | Reset Verified Preview after Change
    |--------------------------------------------------------------------------
    */

    const clearVerifiedPreview =
      () => {
        setVerifiedCalculation(
          null
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Form Update Helpers
    |--------------------------------------------------------------------------
    */

    const updateField = (
      key,
      value
    ) => {
      clearVerifiedPreview();

      setForm(
        (current) => ({
          ...current,
          [key]: value
        })
      );
    };

    const updateNestedField = (
      section,
      key,
      value
    ) => {
      clearVerifiedPreview();

      setForm(
        (current) => ({
          ...current,

          [section]: {
            ...current[section],
            [key]: value
          }
        })
      );
    };

    const updateOtherItem = (
      section,
      index,
      key,
      value
    ) => {
      clearVerifiedPreview();

      setForm(
        (current) => {
          const nextItems = [
            ...(
              current[section]
                .other || []
            )
          ];

          nextItems[index] = {
            ...nextItems[index],
            [key]: value
          };

          return {
            ...current,

            [section]: {
              ...current[section],
              other: nextItems
            }
          };
        }
      );
    };

    const addOtherAllowance =
      () => {
        clearVerifiedPreview();

        setForm(
          (current) => ({
            ...current,

            allowances: {
              ...current.allowances,

              other: [
                ...current
                  .allowances.other,

                {
                  name: "",
                  amount: "",
                  isTaxable: false
                }
              ]
            }
          })
        );
      };

    const addOtherDeduction =
      () => {
        clearVerifiedPreview();

        setForm(
          (current) => ({
            ...current,

            deductions: {
              ...current.deductions,

              other: [
                ...current
                  .deductions.other,

                {
                  name: "",
                  amount: "",
                  deductionType:
                    "fixed",

                  percentageOf:
                    "basic_salary"
                }
              ]
            }
          })
        );
      };

    const removeOtherItem = (
      section,
      index
    ) => {
      clearVerifiedPreview();

      setForm(
        (current) => ({
          ...current,

          [section]: {
            ...current[section],

            other:
              current[
                section
              ].other.filter(
                (
                  _,
                  itemIndex
                ) =>
                  itemIndex !==
                  index
              )
          }
        })
      );
    };

    /*
    |--------------------------------------------------------------------------
    | Load Schools
    |--------------------------------------------------------------------------
    */

    const loadSchools =
      useCallback(
        async () => {
          if (!isSuperAdmin) {
            return;
          }

          setSchoolsLoading(
            true
          );

          try {
            const response =
              await api.get(
                "/schools",
                {
                  params: {
                    limit: 100,
                    status:
                      "active"
                  }
                }
              );

            setSchools(
              extractSchools(
                response
              )
            );
          } catch (
            requestError
          ) {
            setError(
              getErrorMessage(
                requestError,
                "Schools could not be loaded."
              )
            );
          } finally {
            setSchoolsLoading(
              false
            );
          }
        },
        [
          isSuperAdmin
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Load Staff
    |--------------------------------------------------------------------------
    */

    const loadStaff =
      useCallback(
        async (
          schoolId = ""
        ) => {
          if (
            isSuperAdmin &&
            !schoolId
          ) {
            setStaffMembers(
              []
            );

            return;
          }

          setStaffLoading(true);

          try {
            const response =
              await api.get(
                "/staff",
                {
                  params: {
                    schoolId:
                      isSuperAdmin
                        ? schoolId
                        : undefined,

                    limit: 100,
                    sortBy: "name",
                    sortOrder: "asc"
                  }
                }
              );

            const records =
              extractStaff(
                response
              ).filter(
                (staff) =>
                  !staff.isDeleted &&
                  [
                    "active",
                    "on_leave"
                  ].includes(
                    String(
                      staff.status ||
                        "active"
                    ).toLowerCase()
                  )
              );

            setStaffMembers(
              records
            );
          } catch (
            requestError
          ) {
            setStaffMembers(
              []
            );

            setError(
              getErrorMessage(
                requestError,
                "Staff members could not be loaded."
              )
            );
          } finally {
            setStaffLoading(false);
          }
        },
        [
          isSuperAdmin
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Load Existing Salary Structure
    |--------------------------------------------------------------------------
    */

    const loadSalaryStructure =
      useCallback(
        async () => {
          if (!isEditMode) {
            return;
          }

          setLoading(true);
          setError("");

          try {
            const response =
              await getSalaryStructureById(
                id
              );

            const structure =
              response
                ?.salaryStructure;

            if (!structure) {
              throw new Error(
                "Salary structure record was not found."
              );
            }

            const schoolId =
              getObjectId(
                structure.schoolId
              );

            const staffId =
              getObjectId(
                structure.staffId
              );

            setForm({
              schoolId,
              staffId,

              currency:
                structure.currency ||
                "PKR",

              payFrequency:
                structure.payFrequency ||
                "monthly",

              basicSalary:
                structure.basicSalary ??
                "",

              allowances: {
                houseRent:
                  structure.allowances
                    ?.houseRent ??
                  "",

                medical:
                  structure.allowances
                    ?.medical ??
                  "",

                transport:
                  structure.allowances
                    ?.transport ??
                  "",

                food:
                  structure.allowances
                    ?.food ??
                  "",

                communication:
                  structure.allowances
                    ?.communication ??
                  "",

                special:
                  structure.allowances
                    ?.special ??
                  "",

                other:
                  Array.isArray(
                    structure
                      .allowances
                      ?.other
                  )
                    ? structure
                        .allowances
                        .other.map(
                          (item) => ({
                            name:
                              item.name ||
                              "",

                            amount:
                              item.amount ??
                              "",

                            isTaxable:
                              Boolean(
                                item.isTaxable
                              )
                          })
                        )
                    : []
              },

              deductions: {
                providentFund:
                  structure.deductions
                    ?.providentFund ??
                  "",

                tax:
                  structure.deductions
                    ?.tax ??
                  "",

                insurance:
                  structure.deductions
                    ?.insurance ??
                  "",

                loanInstallment:
                  structure.deductions
                    ?.loanInstallment ??
                  "",

                other:
                  Array.isArray(
                    structure
                      .deductions
                      ?.other
                  )
                    ? structure
                        .deductions
                        .other.map(
                          (item) => ({
                            name:
                              item.name ||
                              "",

                            amount:
                              item.amount ??
                              "",

                            deductionType:
                              item.deductionType ||
                              "fixed",

                            percentageOf:
                              item.percentageOf ||
                              "basic_salary"
                          })
                        )
                    : []
              },

              calculationBasis:
                structure
                  .calculationBasis ||
                "attendance_based",

              workingDaysMethod:
                structure
                  .workingDaysMethod ||
                "fixed_working_days",

              fixedWorkingDays:
                structure
                  .fixedWorkingDays ??
                26,

              dailyRateBasis:
                structure
                  .dailyRateBasis ||
                "basic_salary",

              attendanceRules: {
                absenceDeductionEnabled:
                  structure
                    .attendanceRules
                    ?.absenceDeductionEnabled !==
                  false,

                unpaidLeaveDeductionEnabled:
                  structure
                    .attendanceRules
                    ?.unpaidLeaveDeductionEnabled !==
                  false,

                halfDayDeductionEnabled:
                  structure
                    .attendanceRules
                    ?.halfDayDeductionEnabled !==
                  false,

                paidLeaveTypes:
                  Array.isArray(
                    structure
                      .attendanceRules
                      ?.paidLeaveTypes
                  )
                    ? structure
                        .attendanceRules
                        .paidLeaveTypes
                    : []
              },

              lateRules: {
                enabled:
                  Boolean(
                    structure
                      .lateRules
                      ?.enabled
                  ),

                graceMinutes:
                  structure
                    .lateRules
                    ?.graceMinutes ??
                  15,

                deductionMethod:
                  structure
                    .lateRules
                    ?.deductionMethod ||
                  "none",

                deductionRate:
                  structure
                    .lateRules
                    ?.deductionRate ??
                  ""
              },

              overtimeRules: {
                enabled:
                  Boolean(
                    structure
                      .overtimeRules
                      ?.enabled
                  ),

                rateMethod:
                  structure
                    .overtimeRules
                    ?.rateMethod ||
                  "salary_multiplier",

                multiplier:
                  structure
                    .overtimeRules
                    ?.multiplier ??
                  1.5,

                fixedHourlyRate:
                  structure
                    .overtimeRules
                    ?.fixedHourlyRate ??
                  "",

                minimumMinutes:
                  structure
                    .overtimeRules
                    ?.minimumMinutes ??
                  30,

                maximumMonthlyMinutes:
                  structure
                    .overtimeRules
                    ?.maximumMonthlyMinutes ??
                  ""
              },

              paymentMethod:
                structure
                  .paymentMethod ||
                "cash",

              bankDetails: {
                bankName:
                  structure.bankDetails
                    ?.bankName ||
                  "",

                accountTitle:
                  structure.bankDetails
                    ?.accountTitle ||
                  "",

                accountNumber:
                  structure.bankDetails
                    ?.accountNumber ||
                  "",

                iban:
                  structure.bankDetails
                    ?.iban ||
                  "",

                branchCode:
                  structure.bankDetails
                    ?.branchCode ||
                  "",

                walletProvider:
                  structure.bankDetails
                    ?.walletProvider ||
                  "",

                walletNumber:
                  structure.bankDetails
                    ?.walletNumber ||
                  ""
              },

              effectiveFrom:
                structure
                  .effectiveFrom
                  ? String(
                      structure
                        .effectiveFrom
                    ).slice(0, 10)
                  : getTodayDate(),

              effectiveTo:
                structure
                  .effectiveTo
                  ? String(
                      structure
                        .effectiveTo
                    ).slice(0, 10)
                  : "",

              status:
                structure.status ||
                "active",

              notes:
                structure.notes ||
                ""
            });

            setVerifiedCalculation(
              response
                ?.calculation ||
                null
            );

            await loadStaff(
              schoolId
            );
          } catch (
            requestError
          ) {
            setError(
              getErrorMessage(
                requestError,
                "Salary structure could not be loaded."
              )
            );
          } finally {
            setLoading(false);
          }
        },
        [
          id,
          isEditMode,
          loadStaff
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Initial Loading
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (!canManage) {
        navigate(
          "/payroll/salary-structures",
          {
            replace: true
          }
        );

        return;
      }

      loadSchools();

      if (isEditMode) {
        loadSalaryStructure();
      } else if (
        !isSuperAdmin
      ) {
        loadStaff();
      }
    }, [
      canManage,
      isEditMode,
      isSuperAdmin,
      loadSalaryStructure,
      loadSchools,
      loadStaff,
      navigate
    ]);

    /*
    |--------------------------------------------------------------------------
    | School Change
    |--------------------------------------------------------------------------
    */

    const handleSchoolChange =
      async (schoolId) => {
        updateField(
          "schoolId",
          schoolId
        );

        setForm(
          (current) => ({
            ...current,
            schoolId,
            staffId: ""
          })
        );

        await loadStaff(
          schoolId
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Paid Leave Toggle
    |--------------------------------------------------------------------------
    */

    const togglePaidLeaveType = (
      leaveType
    ) => {
      clearVerifiedPreview();

      setForm(
        (current) => {
          const currentTypes =
            current
              .attendanceRules
              .paidLeaveTypes;

          const exists =
            currentTypes.includes(
              leaveType
            );

          return {
            ...current,

            attendanceRules: {
              ...current
                .attendanceRules,

              paidLeaveTypes:
                exists
                  ? currentTypes.filter(
                      (item) =>
                        item !==
                        leaveType
                    )
                  : [
                      ...currentTypes,
                      leaveType
                    ]
            }
          };
        }
      );
    };

    /*
    |--------------------------------------------------------------------------
    | Local Salary Calculation
    |--------------------------------------------------------------------------
    */

    const localCalculation =
      useMemo(() => {
        const basicSalary =
          nonNegativeNumber(
            form.basicSalary
          );

        const allowances =
          form.allowances;

        const otherAllowances =
          allowances.other.reduce(
            (
              total,
              item
            ) =>
              total +
              nonNegativeNumber(
                item.amount
              ),
            0
          );

        const totalAllowances =
          nonNegativeNumber(
            allowances.houseRent
          ) +
          nonNegativeNumber(
            allowances.medical
          ) +
          nonNegativeNumber(
            allowances.transport
          ) +
          nonNegativeNumber(
            allowances.food
          ) +
          nonNegativeNumber(
            allowances.communication
          ) +
          nonNegativeNumber(
            allowances.special
          ) +
          otherAllowances;

        const grossSalary =
          basicSalary +
          totalAllowances;

        const otherDeductions =
          form.deductions
            .other.reduce(
              (
                total,
                item
              ) => {
                const amount =
                  nonNegativeNumber(
                    item.amount
                  );

                if (
                  item.deductionType ===
                  "percentage"
                ) {
                  const baseAmount =
                    item.percentageOf ===
                    "gross_salary"
                      ? grossSalary
                      : basicSalary;

                  return (
                    total +
                    (
                      baseAmount *
                      amount
                    ) /
                      100
                  );
                }

                return (
                  total + amount
                );
              },
              0
            );

        const totalDeductions =
          nonNegativeNumber(
            form.deductions
              .providentFund
          ) +
          nonNegativeNumber(
            form.deductions.tax
          ) +
          nonNegativeNumber(
            form.deductions
              .insurance
          ) +
          nonNegativeNumber(
            form.deductions
              .loanInstallment
          ) +
          otherDeductions;

        const netSalary =
          Math.max(
            0,
            grossSalary -
              totalDeductions
          );

        const workingDays =
          Math.max(
            1,
            safeNumber(
              form.fixedWorkingDays ||
                26
            )
          );

        const dailyBase =
          form.dailyRateBasis ===
          "gross_salary"
            ? grossSalary
            : basicSalary;

        const dailyRate =
          dailyBase /
          workingDays;

        const hourlyRate =
          dailyRate / 8;

        let overtimeRate = 0;

        if (
          form.overtimeRules
            .enabled
        ) {
          if (
            form.overtimeRules
              .rateMethod ===
            "fixed_per_hour"
          ) {
            overtimeRate =
              nonNegativeNumber(
                form
                  .overtimeRules
                  .fixedHourlyRate
              );
          } else if (
            form.overtimeRules
              .rateMethod ===
            "hourly_rate"
          ) {
            overtimeRate =
              hourlyRate;
          } else {
            overtimeRate =
              hourlyRate *
              nonNegativeNumber(
                form
                  .overtimeRules
                  .multiplier ||
                  1.5
              );
          }
        }

        return {
          basicSalary:
            roundMoney(
              basicSalary
            ),

          allowances: {
            total:
              roundMoney(
                totalAllowances
              )
          },

          grossSalary:
            roundMoney(
              grossSalary
            ),

          deductions: {
            total:
              roundMoney(
                totalDeductions
              )
          },

          estimatedNetSalary:
            roundMoney(
              netSalary
            ),

          rates: {
            fixedWorkingDays:
              workingDays,

            dailySalaryRate:
              roundMoney(
                dailyRate
              ),

            hourlySalaryRate:
              roundMoney(
                hourlyRate
              ),

            overtimeHourlyRate:
              roundMoney(
                overtimeRate
              )
          }
        };
      }, [
        form
      ]);

    const displayedCalculation =
      verifiedCalculation ||
      localCalculation;

    /*
    |--------------------------------------------------------------------------
    | Build API Payload
    |--------------------------------------------------------------------------
    */

    const buildPayload = () => {
      return {
        schoolId:
          form.schoolId ||
          undefined,

        staffId:
          form.staffId,

        currency:
          String(
            form.currency ||
              "PKR"
          ).toUpperCase(),

        payFrequency:
          "monthly",

        basicSalary:
          nonNegativeNumber(
            form.basicSalary
          ),

        allowances: {
          houseRent:
            nonNegativeNumber(
              form.allowances
                .houseRent
            ),

          medical:
            nonNegativeNumber(
              form.allowances
                .medical
            ),

          transport:
            nonNegativeNumber(
              form.allowances
                .transport
            ),

          food:
            nonNegativeNumber(
              form.allowances
                .food
            ),

          communication:
            nonNegativeNumber(
              form.allowances
                .communication
            ),

          special:
            nonNegativeNumber(
              form.allowances
                .special
            ),

          other:
            form.allowances
              .other
              .map(
                (item) => ({
                  name:
                    String(
                      item.name ||
                        ""
                    ).trim(),

                  amount:
                    nonNegativeNumber(
                      item.amount
                    ),

                  isTaxable:
                    Boolean(
                      item.isTaxable
                    )
                })
              )
              .filter(
                (item) =>
                  item.name
              )
        },

        deductions: {
          providentFund:
            nonNegativeNumber(
              form.deductions
                .providentFund
            ),

          tax:
            nonNegativeNumber(
              form.deductions
                .tax
            ),

          insurance:
            nonNegativeNumber(
              form.deductions
                .insurance
            ),

          loanInstallment:
            nonNegativeNumber(
              form.deductions
                .loanInstallment
            ),

          other:
            form.deductions
              .other
              .map(
                (item) => ({
                  name:
                    String(
                      item.name ||
                        ""
                    ).trim(),

                  amount:
                    nonNegativeNumber(
                      item.amount
                    ),

                  deductionType:
                    item.deductionType,

                  percentageOf:
                    item.percentageOf
                })
              )
              .filter(
                (item) =>
                  item.name
              )
        },

        calculationBasis:
          form.calculationBasis,

        workingDaysMethod:
          form.workingDaysMethod,

        fixedWorkingDays:
          Math.max(
            1,
            safeNumber(
              form.fixedWorkingDays
            )
          ),

        dailyRateBasis:
          form.dailyRateBasis,

        attendanceRules: {
          ...form.attendanceRules
        },

        lateRules: {
          enabled:
            Boolean(
              form.lateRules
                .enabled
            ),

          graceMinutes:
            nonNegativeNumber(
              form.lateRules
                .graceMinutes
            ),

          deductionMethod:
            form.lateRules
              .enabled
              ? form.lateRules
                  .deductionMethod
              : "none",

          deductionRate:
            form.lateRules
              .enabled
              ? nonNegativeNumber(
                  form.lateRules
                    .deductionRate
                )
              : 0
        },

        overtimeRules: {
          enabled:
            Boolean(
              form.overtimeRules
                .enabled
            ),

          rateMethod:
            form.overtimeRules
              .rateMethod,

          multiplier:
            nonNegativeNumber(
              form.overtimeRules
                .multiplier
            ),

          fixedHourlyRate:
            nonNegativeNumber(
              form.overtimeRules
                .fixedHourlyRate
            ),

          minimumMinutes:
            nonNegativeNumber(
              form.overtimeRules
                .minimumMinutes
            ),

          maximumMonthlyMinutes:
            nonNegativeNumber(
              form.overtimeRules
                .maximumMonthlyMinutes
            )
        },

        paymentMethod:
          form.paymentMethod,

        bankDetails: {
          bankName:
            String(
              form.bankDetails
                .bankName || ""
            ).trim(),

          accountTitle:
            String(
              form.bankDetails
                .accountTitle ||
                ""
            ).trim(),

          accountNumber:
            String(
              form.bankDetails
                .accountNumber ||
                ""
            ).trim(),

          iban:
            String(
              form.bankDetails
                .iban || ""
            )
              .trim()
              .toUpperCase(),

          branchCode:
            String(
              form.bankDetails
                .branchCode ||
                ""
            ).trim(),

          walletProvider:
            String(
              form.bankDetails
                .walletProvider ||
                ""
            ).trim(),

          walletNumber:
            String(
              form.bankDetails
                .walletNumber ||
                ""
            ).trim()
        },

        effectiveFrom:
          form.effectiveFrom,

        effectiveTo:
          form.effectiveTo ||
          null,

        status:
          form.status,

        notes:
          String(
            form.notes || ""
          ).trim()
      };
    };

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    const validateForm =
      () => {
        if (
          isSuperAdmin &&
          !form.schoolId
        ) {
          return (
            "Please select a school."
          );
        }

        if (!form.staffId) {
          return (
            "Please select a staff member."
          );
        }

        if (
          form.basicSalary ===
            "" ||
          safeNumber(
            form.basicSalary
          ) < 0
        ) {
          return (
            "Please enter a valid basic salary."
          );
        }

        if (
          !form.effectiveFrom
        ) {
          return (
            "Effective start date is required."
          );
        }

        if (
          form.effectiveTo &&
          new Date(
            form.effectiveTo
          ) <
            new Date(
              form.effectiveFrom
            )
        ) {
          return (
            "Effective end date cannot be earlier than the start date."
          );
        }

        if (
          form.workingDaysMethod ===
            "fixed_working_days" &&
          (
            safeNumber(
              form.fixedWorkingDays
            ) < 1 ||
            safeNumber(
              form.fixedWorkingDays
            ) > 31
          )
        ) {
          return (
            "Fixed working days must be between 1 and 31."
          );
        }

        if (
          form.paymentMethod ===
            "bank_transfer" &&
          !String(
            form.bankDetails
              .accountNumber ||
              ""
          ).trim() &&
          !String(
            form.bankDetails
              .iban || ""
          ).trim()
        ) {
          return (
            "Account number or IBAN is required for bank transfer."
          );
        }

        if (
          form.paymentMethod ===
            "mobile_wallet" &&
          !String(
            form.bankDetails
              .walletNumber ||
              ""
          ).trim()
        ) {
          return (
            "Wallet number is required for mobile wallet payment."
          );
        }

        if (
          form.lateRules
            .enabled &&
          form.lateRules
            .deductionMethod ===
            "fixed_amount" &&
          safeNumber(
            form.lateRules
              .deductionRate
          ) <= 0
        ) {
          return (
            "Late deduction amount must be greater than zero."
          );
        }

        if (
          form.overtimeRules
            .enabled &&
          form.overtimeRules
            .rateMethod ===
            "fixed_per_hour" &&
          safeNumber(
            form.overtimeRules
              .fixedHourlyRate
          ) <= 0
        ) {
          return (
            "Fixed overtime hourly rate must be greater than zero."
          );
        }

        return "";
      };

    /*
    |--------------------------------------------------------------------------
    | Preview
    |--------------------------------------------------------------------------
    */

    const handlePreview =
      async () => {
        const validationError =
          validateForm();

        if (
          validationError
        ) {
          setError(
            validationError
          );

          return;
        }

        setPreviewing(true);
        setError("");
        setSuccessMessage("");

        try {
          const response =
            await previewSalaryStructure(
              buildPayload()
            );

          setVerifiedCalculation(
            response
              ?.calculation ||
              null
          );

          setSuccessMessage(
            "Salary calculation has been verified successfully."
          );
        } catch (
          previewError
        ) {
          setError(
            getErrorMessage(
              previewError,
              "Salary calculation could not be verified."
            )
          );
        } finally {
          setPreviewing(false);
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */

    const handleSubmit =
      async (event) => {
        event.preventDefault();

        const validationError =
          validateForm();

        if (
          validationError
        ) {
          setError(
            validationError
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });

          return;
        }

        setSaving(true);
        setError("");
        setSuccessMessage("");

        try {
          const payload =
            buildPayload();

          const response =
            isEditMode
              ? await updateSalaryStructure(
                  id,
                  payload
                )
              : await createSalaryStructure(
                  payload
                );

          setSuccessMessage(
            response?.message ||
              (
                isEditMode
                  ? "Salary structure updated successfully."
                  : "Salary structure created successfully."
              )
          );

          const structureId =
            response
              ?.salaryStructure
              ?._id ||
            id;

          window.setTimeout(
            () => {
              navigate(
                structureId
                  ? `/payroll/salary-structures/${structureId}`
                  : "/payroll/salary-structures"
              );
            },
            700
          );
        } catch (
          saveError
        ) {
          setError(
            getErrorMessage(
              saveError,
              isEditMode
                ? "Salary structure could not be updated."
                : "Salary structure could not be created."
            )
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        } finally {
          setSaving(false);
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Selected Staff
    |--------------------------------------------------------------------------
    */

    const selectedStaff =
      useMemo(() => {
        return staffMembers.find(
          (staff) =>
            String(staff._id) ===
            String(
              form.staffId
            )
        );
      }, [
        form.staffId,
        staffMembers
      ]);

    /*
    |--------------------------------------------------------------------------
    | Loading Screen
    |--------------------------------------------------------------------------
    */

    if (loading) {
      return (
        <div className="card flex min-h-[420px] items-center justify-center">
          <div className="text-center">
            <RefreshCcw
              size={28}
              className="mx-auto animate-spin text-brand-600"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading salary
              structure...
            </p>
          </div>
        </div>
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >
        {/*
        |--------------------------------------------------------------------------
        | Header
        |--------------------------------------------------------------------------
        */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/payroll/salary-structures"
                )
              }
              className="mt-0.5 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <ArrowLeft
                size={18}
              />
            </button>

            <div>
              <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                {isEditMode
                  ? "Edit Salary Structure"
                  : "Create Salary Structure"}
              </h2>

              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Configure monthly
                salary, deductions,
                attendance and
                overtime rules.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                previewing ||
                saving
              }
              onClick={
                handlePreview
              }
              className="btn-secondary inline-flex items-center gap-2"
            >
              {previewing ? (
                <RefreshCcw
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Calculator
                  size={16}
                />
              )}

              {previewing
                ? "Verifying..."
                : "Verify Calculation"}
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                previewing
              }
              className="btn-primary inline-flex items-center gap-2"
            >
              {saving ? (
                <RefreshCcw
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Save size={16} />
              )}

              {saving
                ? "Saving..."
                : isEditMode
                  ? "Update Structure"
                  : "Save Structure"}
            </button>
          </div>
        </div>

        <MessageBox
          type="error"
          message={error}
          onClose={() =>
            setError("")
          }
        />

        <MessageBox
          type="success"
          message={
            successMessage
          }
          onClose={() =>
            setSuccessMessage(
              ""
            )
          }
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            {/*
            |--------------------------------------------------------------------------
            | Staff Information
            |--------------------------------------------------------------------------
            */}

            <FormSection
              title="Staff Information"
              description="Select the staff member and salary effective period."
              icon={UserRound}
            >
              <div className="grid gap-4 md:grid-cols-2">
                {isSuperAdmin && (
                  <Field
                    label="School"
                    required
                  >
                    <select
                      value={
                        form.schoolId
                      }
                      disabled={
                        schoolsLoading ||
                        isEditMode
                      }
                      className="field-select"
                      onChange={(
                        event
                      ) =>
                        handleSchoolChange(
                          event.target
                            .value
                        )
                      }
                    >
                      <option value="">
                        {schoolsLoading
                          ? "Loading schools..."
                          : "Select school"}
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
                            {school.schoolName ||
                              school.name}
                            {school.schoolCode
                              ? ` (${school.schoolCode})`
                              : ""}
                          </option>
                        )
                      )}
                    </select>
                  </Field>
                )}

                <Field
                  label="Staff Member"
                  required
                  hint={
                    isEditMode
                      ? "Staff assignment cannot be changed after creation."
                      : ""
                  }
                >
                  <select
                    value={
                      form.staffId
                    }
                    disabled={
                      staffLoading ||
                      isEditMode ||
                      (
                        isSuperAdmin &&
                        !form.schoolId
                      )
                    }
                    className="field-select"
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "staffId",
                        event.target
                          .value
                      )
                    }
                  >
                    <option value="">
                      {staffLoading
                        ? "Loading staff..."
                        : "Select staff member"}
                    </option>

                    {staffMembers.map(
                      (staff) => (
                        <option
                          key={
                            staff._id
                          }
                          value={
                            staff._id
                          }
                        >
                          {staff.name}
                          {staff.employeeId
                            ? ` — ${staff.employeeId}`
                            : ""}
                          {staff.designation
                            ? ` — ${staff.designation}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field
                  label="Effective From"
                  required
                >
                  <input
                    type="date"
                    value={
                      form.effectiveFrom
                    }
                    className="field-input"
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "effectiveFrom",
                        event.target
                          .value
                      )
                    }
                  />
                </Field>

                <Field
                  label="Effective To"
                  hint="Leave empty when the salary structure has no end date."
                >
                  <input
                    type="date"
                    value={
                      form.effectiveTo
                    }
                    min={
                      form.effectiveFrom ||
                      undefined
                    }
                    className="field-input"
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "effectiveTo",
                        event.target
                          .value
                      )
                    }
                  />
                </Field>

                <Field
                  label="Structure Status"
                >
                  <select
                    value={
                      form.status
                    }
                    className="field-select"
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "status",
                        event.target
                          .value
                      )
                    }
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </Field>

                <Field
                  label="Currency"
                >
                  <select
                    value={
                      form.currency
                    }
                    className="field-select"
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "currency",
                        event.target
                          .value
                      )
                    }
                  >
                    <option value="PKR">
                      PKR
                    </option>

                    <option value="USD">
                      USD
                    </option>

                    <option value="GBP">
                      GBP
                    </option>

                    <option value="EUR">
                      EUR
                    </option>

                    <option value="AED">
                      AED
                    </option>

                    <option value="SAR">
                      SAR
                    </option>
                  </select>
                </Field>
              </div>

              {selectedStaff && (
                <div className="mt-4 grid gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Employee ID
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {selectedStaff.employeeId ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Department
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {selectedStaff.department ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Designation
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {selectedStaff.designation ||
                        "—"}
                    </p>
                  </div>
                </div>
              )}
            </FormSection>

            {/*
            |--------------------------------------------------------------------------
            | Basic Salary
            |--------------------------------------------------------------------------
            */}

            <FormSection
              title="Basic Salary"
              description="Set the monthly basic salary and payroll calculation method."
              icon={Banknote}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Monthly Basic Salary"
                  required
                >
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.basicSalary
                    }
                    placeholder="0"
                    className="field-input"
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "basicSalary",
                        event.target
                          .value
                      )
                    }
                  />
                </Field>

                <Field
                  label="Calculation Basis"
                >
                  <select
                    value={
                      form.calculationBasis
                    }
                    className="field-select"
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "calculationBasis",
                        event.target
                          .value
                      )
                    }
                  >
                    <option value="attendance_based">
                      Attendance Based
                    </option>

                    <option value="fixed_monthly">
                      Fixed Monthly
                    </option>
                  </select>
                </Field>

                <Field
                  label="Working Days Method"
                >
                  <select
                    value={
                      form.workingDaysMethod
                    }
                    className="field-select"
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "workingDaysMethod",
                        event.target
                          .value
                      )
                    }
                  >
                    <option value="fixed_working_days">
                      Fixed Working Days
                    </option>

                    <option value="calendar_working_days">
                      Calendar Working Days
                    </option>

                    <option value="recorded_attendance_days">
                      Recorded Attendance
                      Days
                    </option>
                  </select>
                </Field>

                <Field
                  label="Fixed Working Days"
                  hint="Used for daily and hourly salary rate calculations."
                >
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={
                      form.fixedWorkingDays
                    }
                    disabled={
                      form.workingDaysMethod !==
                      "fixed_working_days"
                    }
                    className="field-input disabled:bg-slate-50 disabled:text-slate-400"
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "fixedWorkingDays",
                        event.target
                          .value
                      )
                    }
                  />
                </Field>

                <Field
                  label="Daily Rate Basis"
                >
                  <select
                    value={
                      form.dailyRateBasis
                    }
                    className="field-select"
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "dailyRateBasis",
                        event.target
                          .value
                      )
                    }
                  >
                    <option value="basic_salary">
                      Basic Salary
                    </option>

                    <option value="gross_salary">
                      Gross Salary
                    </option>
                  </select>
                </Field>
              </div>
            </FormSection>

            {/*
            |--------------------------------------------------------------------------
            | Allowances
            |--------------------------------------------------------------------------
            */}

            <FormSection
              title="Monthly Allowances"
              description="Add recurring allowances included in the employee's gross salary."
              icon={
                BadgeDollarSign
              }
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  [
                    "houseRent",
                    "House Rent"
                  ],
                  [
                    "medical",
                    "Medical"
                  ],
                  [
                    "transport",
                    "Transport"
                  ],
                  [
                    "food",
                    "Food"
                  ],
                  [
                    "communication",
                    "Communication"
                  ],
                  [
                    "special",
                    "Special"
                  ]
                ].map(
                  ([
                    key,
                    label
                  ]) => (
                    <Field
                      key={key}
                      label={label}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.allowances[
                            key
                          ]
                        }
                        placeholder="0"
                        className="field-input"
                        onChange={(
                          event
                        ) =>
                          updateNestedField(
                            "allowances",
                            key,
                            event.target
                              .value
                          )
                        }
                      />
                    </Field>
                  )
                )}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">
                      Other Allowances
                    </h4>

                    <p className="mt-1 text-xs text-slate-400">
                      Add custom monthly
                      allowance items.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      addOtherAllowance
                    }
                    className="btn-secondary inline-flex items-center gap-2"
                  >
                    <Plus size={15} />
                    Add Allowance
                  </button>
                </div>

                {form.allowances
                  .other.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center text-xs text-slate-400">
                    No additional
                    allowances added.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.allowances.other.map(
                      (
                        allowance,
                        index
                      ) => (
                        <div
                          key={index}
                          className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_180px_150px_44px]"
                        >
                          <input
                            type="text"
                            value={
                              allowance.name
                            }
                            placeholder="Allowance name"
                            className="field-input"
                            onChange={(
                              event
                            ) =>
                              updateOtherItem(
                                "allowances",
                                index,
                                "name",
                                event
                                  .target
                                  .value
                              )
                            }
                          />

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              allowance.amount
                            }
                            placeholder="Amount"
                            className="field-input"
                            onChange={(
                              event
                            ) =>
                              updateOtherItem(
                                "allowances",
                                index,
                                "amount",
                                event
                                  .target
                                  .value
                              )
                            }
                          />

                          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              checked={
                                allowance.isTaxable
                              }
                              onChange={(
                                event
                              ) =>
                                updateOtherItem(
                                  "allowances",
                                  index,
                                  "isTaxable",
                                  event
                                    .target
                                    .checked
                                )
                              }
                            />

                            Taxable
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              removeOtherItem(
                                "allowances",
                                index
                              )
                            }
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </FormSection>

            {/*
            |--------------------------------------------------------------------------
            | Deductions
            |--------------------------------------------------------------------------
            */}

            <FormSection
              title="Monthly Deductions"
              description="Configure provident fund, tax, insurance and other recurring deductions."
              icon={ShieldCheck}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    "providentFund",
                    "Provident Fund"
                  ],
                  [
                    "tax",
                    "Tax"
                  ],
                  [
                    "insurance",
                    "Insurance"
                  ],
                  [
                    "loanInstallment",
                    "Loan Installment"
                  ]
                ].map(
                  ([
                    key,
                    label
                  ]) => (
                    <Field
                      key={key}
                      label={label}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.deductions[
                            key
                          ]
                        }
                        placeholder="0"
                        className="field-input"
                        onChange={(
                          event
                        ) =>
                          updateNestedField(
                            "deductions",
                            key,
                            event.target
                              .value
                          )
                        }
                      />
                    </Field>
                  )
                )}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">
                      Other Deductions
                    </h4>

                    <p className="mt-1 text-xs text-slate-400">
                      Add fixed or
                      percentage-based
                      deductions.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      addOtherDeduction
                    }
                    className="btn-secondary inline-flex items-center gap-2"
                  >
                    <Plus size={15} />
                    Add Deduction
                  </button>
                </div>

                {form.deductions
                  .other.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center text-xs text-slate-400">
                    No additional
                    deductions added.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.deductions.other.map(
                      (
                        deduction,
                        index
                      ) => (
                        <div
                          key={index}
                          className="grid gap-3 rounded-xl border border-slate-200 p-3 lg:grid-cols-[minmax(0,1fr)_150px_160px_180px_44px]"
                        >
                          <input
                            type="text"
                            value={
                              deduction.name
                            }
                            placeholder="Deduction name"
                            className="field-input"
                            onChange={(
                              event
                            ) =>
                              updateOtherItem(
                                "deductions",
                                index,
                                "name",
                                event
                                  .target
                                  .value
                              )
                            }
                          />

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              deduction.amount
                            }
                            placeholder={
                              deduction.deductionType ===
                              "percentage"
                                ? "Percentage"
                                : "Amount"
                            }
                            className="field-input"
                            onChange={(
                              event
                            ) =>
                              updateOtherItem(
                                "deductions",
                                index,
                                "amount",
                                event
                                  .target
                                  .value
                              )
                            }
                          />

                          <select
                            value={
                              deduction.deductionType
                            }
                            className="field-select"
                            onChange={(
                              event
                            ) =>
                              updateOtherItem(
                                "deductions",
                                index,
                                "deductionType",
                                event
                                  .target
                                  .value
                              )
                            }
                          >
                            <option value="fixed">
                              Fixed Amount
                            </option>

                            <option value="percentage">
                              Percentage
                            </option>
                          </select>

                          <select
                            value={
                              deduction.percentageOf
                            }
                            disabled={
                              deduction.deductionType !==
                              "percentage"
                            }
                            className="field-select disabled:bg-slate-50"
                            onChange={(
                              event
                            ) =>
                              updateOtherItem(
                                "deductions",
                                index,
                                "percentageOf",
                                event
                                  .target
                                  .value
                              )
                            }
                          >
                            <option value="basic_salary">
                              Basic Salary
                            </option>

                            <option value="gross_salary">
                              Gross Salary
                            </option>
                          </select>

                          <button
                            type="button"
                            onClick={() =>
                              removeOtherItem(
                                "deductions",
                                index
                              )
                            }
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </FormSection>

            {/*
            |--------------------------------------------------------------------------
            | Attendance Rules
            |--------------------------------------------------------------------------
            */}

            <FormSection
              title="Attendance Rules"
              description="Control absence, unpaid leave and half-day salary deductions."
              icon={CalendarDays}
            >
              <div className="grid gap-3 md:grid-cols-3">
                <ToggleField
                  checked={
                    form
                      .attendanceRules
                      .absenceDeductionEnabled
                  }
                  onChange={(
                    value
                  ) =>
                    updateNestedField(
                      "attendanceRules",
                      "absenceDeductionEnabled",
                      value
                    )
                  }
                  title="Absence Deduction"
                  description="Deduct one daily rate for each absent day."
                />

                <ToggleField
                  checked={
                    form
                      .attendanceRules
                      .unpaidLeaveDeductionEnabled
                  }
                  onChange={(
                    value
                  ) =>
                    updateNestedField(
                      "attendanceRules",
                      "unpaidLeaveDeductionEnabled",
                      value
                    )
                  }
                  title="Unpaid Leave Deduction"
                  description="Deduct salary for unpaid leave days."
                />

                <ToggleField
                  checked={
                    form
                      .attendanceRules
                      .halfDayDeductionEnabled
                  }
                  onChange={(
                    value
                  ) =>
                    updateNestedField(
                      "attendanceRules",
                      "halfDayDeductionEnabled",
                      value
                    )
                  }
                  title="Half-Day Deduction"
                  description="Deduct half of the applicable daily rate."
                />
              </div>

              <div className="mt-5">
                <p className="field-label">
                  Paid Leave Types
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    "casual",
                    "sick",
                    "annual",
                    "emergency",
                    "other"
                  ].map(
                    (
                      leaveType
                    ) => {
                      const selected =
                        form
                          .attendanceRules
                          .paidLeaveTypes
                          .includes(
                            leaveType
                          );

                      return (
                        <button
                          key={
                            leaveType
                          }
                          type="button"
                          onClick={() =>
                            togglePaidLeaveType(
                              leaveType
                            )
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            selected
                              ? "border-brand-200 bg-brand-50 text-brand-700"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {formatLabel(
                            leaveType
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </FormSection>

            {/*
            |--------------------------------------------------------------------------
            | Late Rules
            |--------------------------------------------------------------------------
            */}

            <FormSection
              title="Late Arrival Rules"
              description="Configure grace time and salary deduction for late attendance."
              icon={Clock3}
            >
              <ToggleField
                checked={
                  form.lateRules
                    .enabled
                }
                onChange={(
                  value
                ) =>
                  updateNestedField(
                    "lateRules",
                    "enabled",
                    value
                  )
                }
                title="Enable Late Deduction"
                description="Apply salary deduction when late minutes exceed the grace period."
              />

              {form.lateRules
                .enabled && (
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Field
                    label="Grace Minutes"
                  >
                    <input
                      type="number"
                      min="0"
                      max="240"
                      value={
                        form.lateRules
                          .graceMinutes
                      }
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "lateRules",
                          "graceMinutes",
                          event.target
                            .value
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Deduction Method"
                  >
                    <select
                      value={
                        form.lateRules
                          .deductionMethod
                      }
                      className="field-select"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "lateRules",
                          "deductionMethod",
                          event.target
                            .value
                        )
                      }
                    >
                      <option value="none">
                        No Deduction
                      </option>

                      <option value="per_minute">
                        Per Minute
                      </option>

                      <option value="per_hour">
                        Per Hour
                      </option>

                      <option value="fixed_amount">
                        Fixed Amount
                      </option>

                      <option value="half_day">
                        Half-Day Rate
                      </option>
                    </select>
                  </Field>

                  <Field
                    label="Deduction Rate"
                    hint={
                      form.lateRules
                        .deductionMethod ===
                      "half_day"
                        ? "The system will use half of the daily salary rate."
                        : ""
                    }
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.lateRules
                          .deductionRate
                      }
                      disabled={
                        [
                          "none",
                          "half_day"
                        ].includes(
                          form
                            .lateRules
                            .deductionMethod
                        )
                      }
                      placeholder="0"
                      className="field-input disabled:bg-slate-50"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "lateRules",
                          "deductionRate",
                          event.target
                            .value
                        )
                      }
                    />
                  </Field>
                </div>
              )}
            </FormSection>

            {/*
            |--------------------------------------------------------------------------
            | Overtime Rules
            |--------------------------------------------------------------------------
            */}

            <FormSection
              title="Overtime Rules"
              description="Configure overtime eligibility and hourly payment rate."
              icon={WalletCards}
            >
              <ToggleField
                checked={
                  form
                    .overtimeRules
                    .enabled
                }
                onChange={(
                  value
                ) =>
                  updateNestedField(
                    "overtimeRules",
                    "enabled",
                    value
                  )
                }
                title="Enable Overtime Payment"
                description="Calculate overtime pay from recorded attendance overtime minutes."
              />

              {form
                .overtimeRules
                .enabled && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    label="Rate Method"
                  >
                    <select
                      value={
                        form
                          .overtimeRules
                          .rateMethod
                      }
                      className="field-select"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "overtimeRules",
                          "rateMethod",
                          event.target
                            .value
                        )
                      }
                    >
                      <option value="salary_multiplier">
                        Salary Multiplier
                      </option>

                      <option value="hourly_rate">
                        Standard Hourly Rate
                      </option>

                      <option value="fixed_per_hour">
                        Fixed Per Hour
                      </option>
                    </select>
                  </Field>

                  <Field
                    label="Salary Multiplier"
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={
                        form
                          .overtimeRules
                          .multiplier
                      }
                      disabled={
                        form
                          .overtimeRules
                          .rateMethod !==
                        "salary_multiplier"
                      }
                      className="field-input disabled:bg-slate-50"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "overtimeRules",
                          "multiplier",
                          event.target
                            .value
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Fixed Hourly Rate"
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form
                          .overtimeRules
                          .fixedHourlyRate
                      }
                      disabled={
                        form
                          .overtimeRules
                          .rateMethod !==
                        "fixed_per_hour"
                      }
                      placeholder="0"
                      className="field-input disabled:bg-slate-50"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "overtimeRules",
                          "fixedHourlyRate",
                          event.target
                            .value
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Minimum Overtime Minutes"
                  >
                    <input
                      type="number"
                      min="0"
                      value={
                        form
                          .overtimeRules
                          .minimumMinutes
                      }
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "overtimeRules",
                          "minimumMinutes",
                          event.target
                            .value
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Maximum Monthly Minutes"
                    hint="Enter 0 for no monthly limit."
                  >
                    <input
                      type="number"
                      min="0"
                      value={
                        form
                          .overtimeRules
                          .maximumMonthlyMinutes
                      }
                      placeholder="0"
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "overtimeRules",
                          "maximumMonthlyMinutes",
                          event.target
                            .value
                        )
                      }
                    />
                  </Field>
                </div>
              )}
            </FormSection>

            {/*
            |--------------------------------------------------------------------------
            | Payment Details
            |--------------------------------------------------------------------------
            */}

            <FormSection
              title="Payment Information"
              description="Select the preferred payment method and account details."
              icon={Building2}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Payment Method"
                >
                  <select
                    value={
                      form.paymentMethod
                    }
                    className="field-select"
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "paymentMethod",
                        event.target
                          .value
                      )
                    }
                  >
                    <option value="cash">
                      Cash
                    </option>

                    <option value="bank_transfer">
                      Bank Transfer
                    </option>

                    <option value="cheque">
                      Cheque
                    </option>

                    <option value="mobile_wallet">
                      Mobile Wallet
                    </option>
                  </select>
                </Field>
              </div>

              {form.paymentMethod ===
                "bank_transfer" && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Bank Name">
                    <input
                      type="text"
                      value={
                        form.bankDetails
                          .bankName
                      }
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "bankDetails",
                          "bankName",
                          event.target
                            .value
                        )
                      }
                    />
                  </Field>

                  <Field label="Account Title">
                    <input
                      type="text"
                      value={
                        form.bankDetails
                          .accountTitle
                      }
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "bankDetails",
                          "accountTitle",
                          event.target
                            .value
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Account Number"
                    hint="Account number or IBAN is required."
                  >
                    <input
                      type="text"
                      value={
                        form.bankDetails
                          .accountNumber
                      }
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "bankDetails",
                          "accountNumber",
                          event.target
                            .value
                        )
                      }
                    />
                  </Field>

                  <Field label="IBAN">
                    <input
                      type="text"
                      value={
                        form.bankDetails
                          .iban
                      }
                      className="field-input uppercase"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "bankDetails",
                          "iban",
                          event.target
                            .value
                            .toUpperCase()
                        )
                      }
                    />
                  </Field>

                  <Field label="Branch Code">
                    <input
                      type="text"
                      value={
                        form.bankDetails
                          .branchCode
                      }
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "bankDetails",
                          "branchCode",
                          event.target
                            .value
                        )
                      }
                    />
                  </Field>
                </div>
              )}

              {form.paymentMethod ===
                "mobile_wallet" && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Wallet Provider">
                    <input
                      type="text"
                      value={
                        form.bankDetails
                          .walletProvider
                      }
                      placeholder="JazzCash, Easypaisa..."
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "bankDetails",
                          "walletProvider",
                          event.target
                            .value
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Wallet Number"
                    required
                  >
                    <input
                      type="text"
                      value={
                        form.bankDetails
                          .walletNumber
                      }
                      className="field-input"
                      onChange={(
                        event
                      ) =>
                        updateNestedField(
                          "bankDetails",
                          "walletNumber",
                          event.target
                            .value
                        )
                      }
                    />
                  </Field>
                </div>
              )}

              <div className="mt-4">
                <Field
                  label="Internal Notes"
                  hint="These notes are for payroll administration."
                >
                  <textarea
                    rows={4}
                    value={form.notes}
                    placeholder="Add salary structure notes..."
                    className="field-input min-h-28 resize-y"
                    onChange={(
                      event
                    ) =>
                      updateField(
                        "notes",
                        event.target
                          .value
                      )
                    }
                  />
                </Field>
              </div>
            </FormSection>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Calculation Sidebar
          |--------------------------------------------------------------------------
          */}

          <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                    <Calculator
                      size={21}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold">
                      Salary Summary
                    </h3>

                    <p className="mt-0.5 text-xs text-white/70">
                      Monthly estimated
                      calculation
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {verifiedCalculation && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    <CheckCircle2
                      size={15}
                    />

                    Backend calculation
                    verified
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      Basic Salary
                    </span>

                    <span className="text-sm font-bold text-slate-700">
                      {formatMoney(
                        displayedCalculation
                          .basicSalary,
                        form.currency
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      Allowances
                    </span>

                    <span className="text-sm font-semibold text-emerald-700">
                      +
                      {formatMoney(
                        displayedCalculation
                          .allowances
                          ?.total,
                        form.currency
                      )}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-600">
                        Gross Salary
                      </span>

                      <span className="text-base font-bold text-slate-800">
                        {formatMoney(
                          displayedCalculation
                            .grossSalary,
                          form.currency
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      Fixed Deductions
                    </span>

                    <span className="text-sm font-semibold text-rose-600">
                      -
                      {formatMoney(
                        displayedCalculation
                          .deductions
                          ?.total,
                        form.currency
                      )}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-900 px-4 py-4 text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Estimated Net
                      Salary
                    </p>

                    <p className="mt-2 text-xl font-bold">
                      {formatMoney(
                        displayedCalculation
                          .estimatedNetSalary,
                        form.currency
                      )}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Salary Rates
                  </h4>

                  <div className="mt-3 space-y-2.5">
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-slate-500">
                        Working Days
                      </span>

                      <span className="font-semibold text-slate-700">
                        {displayedCalculation
                          .rates
                          ?.fixedWorkingDays ||
                          form.fixedWorkingDays}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-slate-500">
                        Daily Rate
                      </span>

                      <span className="font-semibold text-slate-700">
                        {formatMoney(
                          displayedCalculation
                            .rates
                            ?.dailySalaryRate,
                          form.currency
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-slate-500">
                        Hourly Rate
                      </span>

                      <span className="font-semibold text-slate-700">
                        {formatMoney(
                          displayedCalculation
                            .rates
                            ?.hourlySalaryRate,
                          form.currency
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-slate-500">
                        Overtime Rate
                      </span>

                      <span className="font-semibold text-slate-700">
                        {formatMoney(
                          displayedCalculation
                            .rates
                            ?.overtimeHourlyRate,
                          form.currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    previewing ||
                    saving
                  }
                  onClick={
                    handlePreview
                  }
                  className="btn-secondary flex w-full items-center justify-center gap-2"
                >
                  {previewing ? (
                    <RefreshCcw
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Calculator
                      size={16}
                    />
                  )}

                  Verify Calculation
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={17}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div>
                  <p className="text-xs font-bold text-amber-800">
                    Payroll Notice
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    Attendance deductions
                    and overtime payments
                    will be applied when
                    monthly payroll is
                    generated.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Bottom Actions
        |--------------------------------------------------------------------------
        */}

        <div className="card flex flex-col-reverse gap-3 p-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              navigate(
                "/payroll/salary-structures"
              )
            }
            className="btn-secondary"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              saving ||
              previewing
            }
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <RefreshCcw
                size={16}
                className="animate-spin"
              />
            ) : (
              <Save size={16} />
            )}

            {saving
              ? "Saving..."
              : isEditMode
                ? "Update Salary Structure"
                : "Create Salary Structure"}
          </button>
        </div>
      </form>
    );
  };

export default SalaryStructureForm;