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
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ContactRound,
  FileCheck2,
  FileText,
  Landmark,
  Link2,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  X
} from "lucide-react";

import api from "../../api/axios";

import {
  createStaffLeave,
  getStaffLeaveById,
  updateStaffLeave
} from "../../api/staffLeaves";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const LEAVE_TYPES = [
  {
    value: "casual",
    label: "Casual Leave"
  },
  {
    value: "sick",
    label: "Sick Leave"
  },
  {
    value: "annual",
    label: "Annual Leave"
  },
  {
    value: "emergency",
    label: "Emergency Leave"
  },
  {
    value: "maternity",
    label: "Maternity Leave"
  },
  {
    value: "paternity",
    label: "Paternity Leave"
  },
  {
    value: "bereavement",
    label: "Bereavement Leave"
  },
  {
    value: "study",
    label: "Study Leave"
  },
  {
    value: "unpaid",
    label: "Unpaid Leave"
  },
  {
    value: "other",
    label: "Other Leave"
  }
];

const PAY_TYPES = [
  {
    value: "paid",
    label: "Paid Leave"
  },
  {
    value: "unpaid",
    label: "Unpaid Leave"
  },
  {
    value: "partial_paid",
    label: "Partially Paid Leave"
  }
];

const createInitialForm = () => ({
  schoolId: "",
  staffId: "",

  leaveType: "casual",
  customLeaveType: "",

  dayType: "full_day",
  halfDaySession: "",

  startDate: "",
  endDate: "",
  totalDays: 1,

  reason: "",
  handoverNotes: "",
  internalNotes: "",

  requestSource: "admin",

  payType: "paid",
  payPercentage: 100,

  emergencyContact: {
    name: "",
    phone: "",
    relationship: ""
  },

  attachments: []
});

const createEmptyAttachment =
  () => ({
    fileName: "",
    fileUrl: "",
    fileType: "",
    fileSize: 0
  });

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const safeNumber = (
  value,
  fallback = 0
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
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

  return String(value);
};

const toDateInputValue = (
  value
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

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

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  ).format(date);
};

const formatLabel = (
  value
) => {
  if (!value) {
    return "—";
  }

  return String(value)
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.message ||
    fallback
  );
};

const calculateCalendarDays = (
  startDate,
  endDate,
  dayType
) => {
  if (
    dayType ===
    "half_day"
  ) {
    return 0.5;
  }

  if (
    !startDate ||
    !endDate
  ) {
    return 0;
  }

  const start =
    new Date(
      `${startDate}T00:00:00`
    );

  const end =
    new Date(
      `${endDate}T00:00:00`
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    ) ||
    end < start
  ) {
    return 0;
  }

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return (
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) /
        millisecondsPerDay
    ) + 1
  );
};

/*
|--------------------------------------------------------------------------
| API Response Helpers
|--------------------------------------------------------------------------
*/

const extractSchools = (
  response
) => {
  const data =
    response?.data || {};

  return (
    [
      data.schools,
      data.data,
      data.records,
      data.results
    ].find(
      Array.isArray
    ) || []
  );
};

const extractStaffRecords = (
  response
) => {
  const data =
    response?.data || {};

  return (
    [
      data.staff,
      data.staffMembers,
      data.records,
      data.results,
      data.data
    ].find(
      Array.isArray
    ) || []
  );
};

/*
|--------------------------------------------------------------------------
| Section Header
|--------------------------------------------------------------------------
*/

const SectionHeader = ({
  icon: Icon,
  title,
  description
}) => {
  return (
    <div className="mb-5 flex items-start gap-3">
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
  );
};

/*
|--------------------------------------------------------------------------
| Staff Leave Form
|--------------------------------------------------------------------------
*/

export const StaffLeaveForm =
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

    /*
    |--------------------------------------------------------------------------
    | Permissions
    |--------------------------------------------------------------------------
    */

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

    const assignedSchoolId =
      getObjectId(
        user?.schoolId ||
        user?.school
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
      staffRecords,
      setStaffRecords
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
      submitting,
      setSubmitting
    ] = useState(false);

    const [
      error,
      setError
    ] = useState("");

    const [
      successMessage,
      setSuccessMessage
    ] = useState("");

    const [
      validationErrors,
      setValidationErrors
    ] = useState({});

    const [
      existingStatus,
      setExistingStatus
    ] = useState("");

    const [
      existingApplicationNumber,
      setExistingApplicationNumber
    ] = useState("");

    /*
    |--------------------------------------------------------------------------
    | Permission Redirect
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (!canManage) {
        navigate(
          "/staff-leaves",
          {
            replace: true
          }
        );
      }
    }, [
      canManage,
      navigate
    ]);

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

    useEffect(() => {
      loadSchools();
    }, [
      loadSchools
    ]);

    /*
    |--------------------------------------------------------------------------
    | Set Principal School
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (
        !isSuperAdmin &&
        assignedSchoolId &&
        !form.schoolId
      ) {
        setForm(
          (current) => ({
            ...current,
            schoolId:
              assignedSchoolId
          })
        );
      }
    }, [
      isSuperAdmin,
      assignedSchoolId,
      form.schoolId
    ]);

    /*
    |--------------------------------------------------------------------------
    | Load Staff Records
    |--------------------------------------------------------------------------
    */

    const loadStaffRecords =
      useCallback(
        async (
          schoolId
        ) => {
          if (!schoolId) {
            setStaffRecords(
              []
            );

            return;
          }

          setStaffLoading(
            true
          );

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
                    status:
                      "active"
                  }
                }
              );

            const records =
              extractStaffRecords(
                response
              );

            setStaffRecords(
              records.filter(
                (staff) =>
                  staff.isDeleted !==
                  true
              )
            );
          } catch (
            requestError
          ) {
            setStaffRecords(
              []
            );

            setError(
              getErrorMessage(
                requestError,
                "Staff records could not be loaded."
              )
            );
          } finally {
            setStaffLoading(
              false
            );
          }
        },
        [
          isSuperAdmin
        ]
      );

    useEffect(() => {
      if (
        form.schoolId
      ) {
        loadStaffRecords(
          form.schoolId
        );
      } else {
        setStaffRecords(
          []
        );
      }
    }, [
      form.schoolId,
      loadStaffRecords
    ]);

    /*
    |--------------------------------------------------------------------------
    | Load Existing Leave
    |--------------------------------------------------------------------------
    */

    const loadExistingLeave =
      useCallback(
        async () => {
          if (!isEditMode) {
            return;
          }

          setLoading(true);
          setError("");

          try {
            const response =
              await getStaffLeaveById(
                id
              );

            const staffLeave =
              response?.staffLeave ||
              response?.leave ||
              response;

            if (!staffLeave?._id) {
              throw new Error(
                "Leave request was not found."
              );
            }

            const status =
              String(
                staffLeave.status ||
                ""
              ).toLowerCase();

            setExistingStatus(
              status
            );

            setExistingApplicationNumber(
              staffLeave.applicationNumber ||
                ""
            );

            if (
              ![
                "pending",
                "rejected"
              ].includes(status)
            ) {
              setError(
                "Only pending or rejected leave requests can be edited."
              );
            }

            const schoolId =
              getObjectId(
                staffLeave.schoolId
              );

            const staffId =
              getObjectId(
                staffLeave.staffId
              );

            const payType =
              staffLeave
                .payrollImpact
                ?.payType ||
              (
                staffLeave.leaveType ===
                "unpaid"
                  ? "unpaid"
                  : "paid"
              );

            const payPercentage =
              safeNumber(
                staffLeave
                  .payrollImpact
                  ?.payPercentage,
                payType ===
                  "unpaid"
                  ? 0
                  : 100
              );

            setForm({
              schoolId,
              staffId,

              leaveType:
                staffLeave.leaveType ||
                "casual",

              customLeaveType:
                staffLeave.customLeaveType ||
                "",

              dayType:
                staffLeave.dayType ||
                "full_day",

              halfDaySession:
                staffLeave.halfDaySession ||
                "",

              startDate:
                toDateInputValue(
                  staffLeave.startDate
                ),

              endDate:
                toDateInputValue(
                  staffLeave.endDate
                ),

              totalDays:
                safeNumber(
                  staffLeave.totalDays,
                  1
                ),

              reason:
                staffLeave.reason ||
                "",

              handoverNotes:
                staffLeave.handoverNotes ||
                "",

              internalNotes:
                staffLeave.internalNotes ||
                "",

              requestSource:
                staffLeave.requestSource ||
                "admin",

              payType,

              payPercentage,

              emergencyContact: {
                name:
                  staffLeave
                    .emergencyContact
                    ?.name ||
                  "",

                phone:
                  staffLeave
                    .emergencyContact
                    ?.phone ||
                  "",

                relationship:
                  staffLeave
                    .emergencyContact
                    ?.relationship ||
                  ""
              },

              attachments:
                Array.isArray(
                  staffLeave.attachments
                )
                  ? staffLeave.attachments.map(
                      (
                        attachment
                      ) => ({
                        _id:
                          attachment._id,

                        fileName:
                          attachment.fileName ||
                          "",

                        fileUrl:
                          attachment.fileUrl ||
                          "",

                        fileType:
                          attachment.fileType ||
                          "",

                        fileSize:
                          safeNumber(
                            attachment.fileSize
                          )
                      })
                    )
                  : []
            });
          } catch (
            requestError
          ) {
            setError(
              getErrorMessage(
                requestError,
                "Leave request could not be loaded."
              )
            );
          } finally {
            setLoading(false);
          }
        },
        [
          id,
          isEditMode
        ]
      );

    useEffect(() => {
      loadExistingLeave();
    }, [
      loadExistingLeave
    ]);

    /*
    |--------------------------------------------------------------------------
    | Calculated Information
    |--------------------------------------------------------------------------
    */

    const calendarDays =
      useMemo(
        () =>
          calculateCalendarDays(
            form.startDate,
            form.endDate,
            form.dayType
          ),
        [
          form.startDate,
          form.endDate,
          form.dayType
        ]
      );

    const selectedStaff =
      useMemo(
        () =>
          staffRecords.find(
            (staff) =>
              String(staff._id) ===
              String(form.staffId)
          ) || null,
        [
          staffRecords,
          form.staffId
        ]
      );

    const selectedSchool =
      useMemo(
        () =>
          schools.find(
            (school) =>
              String(school._id) ===
              String(form.schoolId)
          ) || null,
        [
          schools,
          form.schoolId
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Auto Duration Update
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (
        form.dayType ===
        "half_day"
      ) {
        setForm(
          (current) => ({
            ...current,

            endDate:
              current.startDate,

            totalDays: 0.5,

            payPercentage:
              current.payType ===
              "partial_paid"
                ? current.payPercentage
                : current.payType ===
                    "unpaid"
                  ? 0
                  : 100
          })
        );

        return;
      }

      if (
        calendarDays > 0
      ) {
        setForm(
          (current) => ({
            ...current,
            totalDays:
              calendarDays
          })
        );
      }
    }, [
      calendarDays,
      form.dayType
    ]);

    /*
    |--------------------------------------------------------------------------
    | Form Changes
    |--------------------------------------------------------------------------
    */

    const updateField = (
      fieldName,
      value
    ) => {
      setForm(
        (current) => ({
          ...current,
          [fieldName]: value
        })
      );

      setValidationErrors(
        (current) => ({
          ...current,
          [fieldName]: ""
        })
      );
    };

    const updateEmergencyContact = (
      fieldName,
      value
    ) => {
      setForm(
        (current) => ({
          ...current,

          emergencyContact: {
            ...current
              .emergencyContact,

            [fieldName]: value
          }
        })
      );
    };

    const handleSchoolChange = (
      value
    ) => {
      setForm(
        (current) => ({
          ...current,
          schoolId: value,
          staffId: ""
        })
      );

      setValidationErrors(
        (current) => ({
          ...current,
          schoolId: "",
          staffId: ""
        })
      );
    };

    const handleLeaveTypeChange = (
      value
    ) => {
      setForm(
        (current) => ({
          ...current,

          leaveType: value,

          customLeaveType:
            value === "other"
              ? current.customLeaveType
              : "",

          payType:
            value === "unpaid"
              ? "unpaid"
              : current.payType ===
                  "unpaid"
                ? "paid"
                : current.payType,

          payPercentage:
            value === "unpaid"
              ? 0
              : current.payType ===
                  "unpaid"
                ? 100
                : current.payPercentage
        })
      );
    };

    const handleDayTypeChange = (
      value
    ) => {
      setForm(
        (current) => ({
          ...current,

          dayType: value,

          halfDaySession:
            value === "half_day"
              ? (
                  current.halfDaySession ||
                  "first_half"
                )
              : "",

          endDate:
            value === "half_day"
              ? current.startDate
              : current.endDate,

          totalDays:
            value === "half_day"
              ? 0.5
              : current.totalDays
        })
      );
    };

    const handleStartDateChange = (
      value
    ) => {
      setForm(
        (current) => ({
          ...current,

          startDate: value,

          endDate:
            current.dayType ===
            "half_day"
              ? value
              : (
                  !current.endDate ||
                  current.endDate <
                    value
                )
                ? value
                : current.endDate
        })
      );

      setValidationErrors(
        (current) => ({
          ...current,
          startDate: "",
          endDate: ""
        })
      );
    };

    const handlePayTypeChange = (
      value
    ) => {
      setForm(
        (current) => ({
          ...current,

          payType: value,

          payPercentage:
            value === "paid"
              ? 100
              : value ===
                  "unpaid"
                ? 0
                : (
                    current.payPercentage >
                      0 &&
                    current.payPercentage <
                      100
                  )
                  ? current.payPercentage
                  : 50
        })
      );
    };

    /*
    |--------------------------------------------------------------------------
    | Attachment Actions
    |--------------------------------------------------------------------------
    */

    const addAttachment =
      () => {
        setForm(
          (current) => ({
            ...current,

            attachments: [
              ...current.attachments,
              createEmptyAttachment()
            ]
          })
        );
      };

    const updateAttachment = (
      index,
      fieldName,
      value
    ) => {
      setForm(
        (current) => ({
          ...current,

          attachments:
            current.attachments.map(
              (
                attachment,
                attachmentIndex
              ) =>
                attachmentIndex ===
                index
                  ? {
                      ...attachment,

                      [fieldName]:
                        fieldName ===
                        "fileSize"
                          ? safeNumber(
                              value
                            )
                          : value
                    }
                  : attachment
            )
        })
      );
    };

    const removeAttachment = (
      index
    ) => {
      setForm(
        (current) => ({
          ...current,

          attachments:
            current.attachments.filter(
              (
                _,
                attachmentIndex
              ) =>
                attachmentIndex !==
                index
            )
        })
      );
    };

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    const validateForm =
      () => {
        const errors = {};

        if (!form.schoolId) {
          errors.schoolId =
            "School is required.";
        }

        if (!form.staffId) {
          errors.staffId =
            "Staff member is required.";
        }

        if (!form.leaveType) {
          errors.leaveType =
            "Leave type is required.";
        }

        if (
          form.leaveType ===
            "other" &&
          !String(
            form.customLeaveType ||
              ""
          ).trim()
        ) {
          errors.customLeaveType =
            "Custom leave type is required.";
        }

        if (!form.startDate) {
          errors.startDate =
            "Start date is required.";
        }

        if (!form.endDate) {
          errors.endDate =
            "End date is required.";
        }

        if (
          form.startDate &&
          form.endDate &&
          form.endDate <
            form.startDate
        ) {
          errors.endDate =
            "End date cannot be earlier than start date.";
        }

        if (
          form.dayType ===
            "half_day" &&
          !form.halfDaySession
        ) {
          errors.halfDaySession =
            "Half-day session is required.";
        }

        const totalDays =
          safeNumber(
            form.totalDays
          );

        if (
          totalDays < 0.5
        ) {
          errors.totalDays =
            "Leave duration must be at least half a day.";
        }

        if (
          (
            totalDays * 2
          ) % 1 !== 0
        ) {
          errors.totalDays =
            "Duration must be in full-day or half-day increments.";
        }

        if (
          form.dayType ===
            "full_day" &&
          calendarDays > 0 &&
          totalDays >
            calendarDays
        ) {
          errors.totalDays =
            "Payable leave days cannot exceed calendar days.";
        }

        if (
          !String(
            form.reason || ""
          ).trim()
        ) {
          errors.reason =
            "Leave reason is required.";
        } else if (
          String(
            form.reason
          ).trim().length < 3
        ) {
          errors.reason =
            "Leave reason must contain at least 3 characters.";
        }

        if (
          form.payType ===
            "partial_paid"
        ) {
          const payPercentage =
            safeNumber(
              form.payPercentage
            );

          if (
            payPercentage <= 0 ||
            payPercentage >= 100
          ) {
            errors.payPercentage =
              "Partial paid percentage must be between 1 and 99.";
          }
        }

        form.attachments.forEach(
          (
            attachment,
            index
          ) => {
            const hasAnyValue =
              String(
                attachment.fileName ||
                  ""
              ).trim() ||
              String(
                attachment.fileUrl ||
                  ""
              ).trim();

            if (
              hasAnyValue &&
              !String(
                attachment.fileUrl ||
                  ""
              ).trim()
            ) {
              errors[
                `attachment-${index}`
              ] =
                "Attachment URL is required.";
            }
          }
        );

        setValidationErrors(
          errors
        );

        return (
          Object.keys(errors)
            .length === 0
        );
      };

    /*
    |--------------------------------------------------------------------------
    | Build Payload
    |--------------------------------------------------------------------------
    */

    const buildPayload =
      () => {
        return {
          schoolId:
            form.schoolId,

          staffId:
            form.staffId,

          leaveType:
            form.leaveType,

          customLeaveType:
            form.leaveType ===
            "other"
              ? String(
                  form.customLeaveType ||
                    ""
                ).trim()
              : "",

          dayType:
            form.dayType,

          halfDaySession:
            form.dayType ===
            "half_day"
              ? form.halfDaySession
              : null,

          startDate:
            form.startDate,

          endDate:
            form.dayType ===
            "half_day"
              ? form.startDate
              : form.endDate,

          totalDays:
            form.dayType ===
            "half_day"
              ? 0.5
              : safeNumber(
                  form.totalDays
                ),

          reason:
            String(
              form.reason || ""
            ).trim(),

          handoverNotes:
            String(
              form.handoverNotes ||
                ""
            ).trim(),

          internalNotes:
            String(
              form.internalNotes ||
                ""
            ).trim(),

          requestSource:
            "admin",

          payType:
            form.leaveType ===
            "unpaid"
              ? "unpaid"
              : form.payType,

          payPercentage:
            form.leaveType ===
            "unpaid"
              ? 0
              : form.payType ===
                  "paid"
                ? 100
                : form.payType ===
                    "unpaid"
                  ? 0
                  : safeNumber(
                      form.payPercentage
                    ),

          emergencyContact: {
            name:
              String(
                form
                  .emergencyContact
                  .name || ""
              ).trim(),

            phone:
              String(
                form
                  .emergencyContact
                  .phone || ""
              ).trim(),

            relationship:
              String(
                form
                  .emergencyContact
                  .relationship ||
                  ""
              ).trim()
          },

          attachments:
            form.attachments
              .map(
                (
                  attachment
                ) => ({
                  fileName:
                    String(
                      attachment.fileName ||
                        ""
                    ).trim(),

                  fileUrl:
                    String(
                      attachment.fileUrl ||
                        ""
                    ).trim(),

                  fileType:
                    String(
                      attachment.fileType ||
                        ""
                    ).trim(),

                  fileSize:
                    safeNumber(
                      attachment.fileSize
                    )
                })
              )
              .filter(
                (attachment) =>
                  attachment.fileName ||
                  attachment.fileUrl
              )
        };
      };

    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */

    const handleSubmit =
      async (
        event
      ) => {
        event.preventDefault();

        if (
          submitting ||
          !canManage
        ) {
          return;
        }

        if (
          isEditMode &&
          ![
            "pending",
            "rejected"
          ].includes(
            existingStatus
          )
        ) {
          setError(
            "Only pending or rejected leave requests can be edited."
          );

          return;
        }

        if (!validateForm()) {
          setError(
            "Please correct the highlighted fields."
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });

          return;
        }

        setSubmitting(true);
        setError("");
        setSuccessMessage("");

        try {
          const payload =
            buildPayload();

          const response =
            isEditMode
              ? await updateStaffLeave(
                  id,
                  payload
                )
              : await createStaffLeave(
                  payload
                );

          const savedLeave =
            response?.staffLeave ||
            response?.leave;

          setSuccessMessage(
            response?.message ||
              (
                isEditMode
                  ? "Leave request updated successfully."
                  : "Leave request created successfully."
              )
          );

          window.setTimeout(
            () => {
              navigate(
                savedLeave?._id
                  ? `/staff-leaves/${savedLeave._id}`
                  : "/staff-leaves",
                {
                  replace: true
                }
              );
            },
            800
          );
        } catch (
          requestError
        ) {
          setError(
            getErrorMessage(
              requestError,
              isEditMode
                ? "Leave request could not be updated."
                : "Leave request could not be created."
            )
          );

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        } finally {
          setSubmitting(false);
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Loading Screen
    |--------------------------------------------------------------------------
    */

    if (loading) {
      return (
        <div className="card flex min-h-[450px] items-center justify-center">
          <div className="text-center">
            <RefreshCcw
              size={28}
              className="mx-auto animate-spin text-brand-600"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading leave request...
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
        | Page Header
        |--------------------------------------------------------------------------
        */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  isEditMode
                    ? `/staff-leaves/${id}`
                    : "/staff-leaves"
                )
              }
              className="mt-0.5 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Back"
            >
              <ArrowLeft
                size={18}
              />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                  {isEditMode
                    ? "Edit Leave Request"
                    : "New Leave Request"}
                </h2>

                {existingApplicationNumber && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {
                      existingApplicationNumber
                    }
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
                {isEditMode
                  ? "Update staff leave information before approval."
                  : "Create a leave request for a non-teaching staff member."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                submitting
              }
              onClick={() =>
                navigate(
                  isEditMode
                    ? `/staff-leaves/${id}`
                    : "/staff-leaves"
                )
              }
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                (
                  isEditMode &&
                  ![
                    "pending",
                    "rejected"
                  ].includes(
                    existingStatus
                  )
                )
              }
              className="btn-primary inline-flex items-center gap-2"
            >
              {submitting ? (
                <RefreshCcw
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Save size={16} />
              )}

              {submitting
                ? "Saving..."
                : isEditMode
                  ? "Update Request"
                  : "Create Request"}
            </button>
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Messages
        |--------------------------------------------------------------------------
        */}

        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span>
                {error}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="rounded-lg p-1 transition hover:bg-rose-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2
              size={17}
              className="mt-0.5 shrink-0"
            />

            <span>
              {successMessage}
            </span>
          </div>
        )}

        {isEditMode &&
          existingStatus ===
            "rejected" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={17}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <p className="text-xs leading-5 text-amber-700">
                  Updating this rejected
                  request will return its
                  status to Pending for a
                  new approval decision.
                </p>
              </div>
            </div>
          )}

        {/*
        |--------------------------------------------------------------------------
        | School and Staff
        |--------------------------------------------------------------------------
        */}

        <section className="card p-5">
          <SectionHeader
            icon={
              BriefcaseBusiness
            }
            title="School and Staff"
            description="Select the school and staff member for this leave request."
          />

          <div className="grid gap-4 md:grid-cols-2">
            {isSuperAdmin ? (
              <div>
                <label className="field-label">
                  School
                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <select
                  value={
                    form.schoolId
                  }
                  disabled={
                    schoolsLoading ||
                    submitting
                  }
                  className={`field-select ${
                    validationErrors
                      .schoolId
                      ? "border-rose-300"
                      : ""
                  }`}
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

                {validationErrors
                  .schoolId && (
                  <p className="mt-1 text-xs text-rose-600">
                    {
                      validationErrors
                        .schoolId
                    }
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="field-label">
                  School
                </label>

                <div className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Landmark
                    size={17}
                    className="shrink-0 text-slate-400"
                  />

                  <span className="text-sm font-semibold text-slate-700">
                    {user?.schoolId
                      ?.schoolName ||
                      user?.school
                        ?.schoolName ||
                      "Assigned School"}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="field-label">
                Staff Member
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <select
                value={
                  form.staffId
                }
                disabled={
                  !form.schoolId ||
                  staffLoading ||
                  submitting
                }
                className={`field-select ${
                  validationErrors
                    .staffId
                    ? "border-rose-300"
                    : ""
                }`}
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
                  {!form.schoolId
                    ? "Select school first"
                    : staffLoading
                      ? "Loading staff..."
                      : "Select staff member"}
                </option>

                {staffRecords.map(
                  (staff) => (
                    <option
                      key={
                        staff._id
                      }
                      value={
                        staff._id
                      }
                    >
                      {staff.name ||
                        "Unnamed Staff"}

                      {staff.employeeId
                        ? ` (${staff.employeeId})`
                        : ""}
                    </option>
                  )
                )}
              </select>

              {validationErrors
                .staffId && (
                <p className="mt-1 text-xs text-rose-600">
                  {
                    validationErrors
                      .staffId
                  }
                </p>
              )}
            </div>
          </div>

          {selectedStaff && (
            <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-brand-100">
                  <UserRound
                    size={20}
                  />
                </div>

                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Staff Name
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {selectedStaff.name ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Employee ID
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {selectedStaff.employeeId ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Department
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {selectedStaff.department ||
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Designation
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {selectedStaff.designation ||
                        "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isSuperAdmin &&
            selectedSchool && (
            <p className="mt-3 text-xs text-slate-400">
              Selected school:{" "}
              <span className="font-semibold text-slate-600">
                {selectedSchool.schoolName ||
                  selectedSchool.name}
              </span>
            </p>
          )}
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Leave Information
        |--------------------------------------------------------------------------
        */}

        <section className="card p-5">
          <SectionHeader
            icon={FileCheck2}
            title="Leave Information"
            description="Define the type, dates and duration of the leave."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="field-label">
                Leave Type
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <select
                value={
                  form.leaveType
                }
                disabled={
                  submitting
                }
                className="field-select"
                onChange={(
                  event
                ) =>
                  handleLeaveTypeChange(
                    event.target
                      .value
                  )
                }
              >
                {LEAVE_TYPES.map(
                  (leaveType) => (
                    <option
                      key={
                        leaveType.value
                      }
                      value={
                        leaveType.value
                      }
                    >
                      {
                        leaveType.label
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {form.leaveType ===
              "other" && (
              <div>
                <label className="field-label">
                  Custom Leave Type
                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  value={
                    form.customLeaveType
                  }
                  placeholder="Enter leave type"
                  disabled={
                    submitting
                  }
                  className={`field-input ${
                    validationErrors
                      .customLeaveType
                      ? "border-rose-300"
                      : ""
                  }`}
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "customLeaveType",
                      event.target
                        .value
                    )
                  }
                />

                {validationErrors
                  .customLeaveType && (
                  <p className="mt-1 text-xs text-rose-600">
                    {
                      validationErrors
                        .customLeaveType
                    }
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="field-label">
                Day Type
              </label>

              <select
                value={
                  form.dayType
                }
                disabled={
                  submitting
                }
                className="field-select"
                onChange={(
                  event
                ) =>
                  handleDayTypeChange(
                    event.target
                      .value
                  )
                }
              >
                <option value="full_day">
                  Full Day
                </option>

                <option value="half_day">
                  Half Day
                </option>
              </select>
            </div>

            {form.dayType ===
              "half_day" && (
              <div>
                <label className="field-label">
                  Half-Day Session
                  <span className="ml-1 text-rose-500">
                    *
                  </span>
                </label>

                <select
                  value={
                    form.halfDaySession
                  }
                  disabled={
                    submitting
                  }
                  className={`field-select ${
                    validationErrors
                      .halfDaySession
                      ? "border-rose-300"
                      : ""
                  }`}
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "halfDaySession",
                      event.target
                        .value
                    )
                  }
                >
                  <option value="">
                    Select session
                  </option>

                  <option value="first_half">
                    First Half
                  </option>

                  <option value="second_half">
                    Second Half
                  </option>
                </select>

                {validationErrors
                  .halfDaySession && (
                  <p className="mt-1 text-xs text-rose-600">
                    {
                      validationErrors
                        .halfDaySession
                    }
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="field-label">
                Start Date
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <input
                type="date"
                value={
                  form.startDate
                }
                disabled={
                  submitting
                }
                className={`field-input ${
                  validationErrors
                    .startDate
                    ? "border-rose-300"
                    : ""
                }`}
                onChange={(
                  event
                ) =>
                  handleStartDateChange(
                    event.target
                      .value
                  )
                }
              />

              {validationErrors
                .startDate && (
                <p className="mt-1 text-xs text-rose-600">
                  {
                    validationErrors
                      .startDate
                  }
                </p>
              )}
            </div>

            <div>
              <label className="field-label">
                End Date
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <input
                type="date"
                min={
                  form.startDate ||
                  undefined
                }
                value={
                  form.endDate
                }
                disabled={
                  submitting ||
                  form.dayType ===
                    "half_day"
                }
                className={`field-input ${
                  validationErrors
                    .endDate
                    ? "border-rose-300"
                    : ""
                }`}
                onChange={(
                  event
                ) =>
                  updateField(
                    "endDate",
                    event.target
                      .value
                  )
                }
              />

              {validationErrors
                .endDate && (
                <p className="mt-1 text-xs text-rose-600">
                  {
                    validationErrors
                      .endDate
                  }
                </p>
              )}
            </div>

            <div>
              <label className="field-label">
                Payable Leave Days
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <input
                type="number"
                min="0.5"
                max={
                  calendarDays ||
                  undefined
                }
                step="0.5"
                value={
                  form.totalDays
                }
                disabled={
                  submitting ||
                  form.dayType ===
                    "half_day"
                }
                className={`field-input ${
                  validationErrors
                    .totalDays
                    ? "border-rose-300"
                    : ""
                }`}
                onChange={(
                  event
                ) =>
                  updateField(
                    "totalDays",
                    event.target
                      .value
                  )
                }
              />

              <p className="mt-1 text-[11px] text-slate-400">
                Calendar duration:{" "}
                <span className="font-semibold text-slate-600">
                  {calendarDays || 0}{" "}
                  day(s)
                </span>
              </p>

              {validationErrors
                .totalDays && (
                <p className="mt-1 text-xs text-rose-600">
                  {
                    validationErrors
                      .totalDays
                  }
                </p>
              )}
            </div>
          </div>

          {form.startDate &&
            form.endDate && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Leave Period
                </p>

                <p className="mt-1 text-sm font-bold text-slate-700">
                  {formatDate(
                    form.startDate
                  )}{" "}
                  –{" "}
                  {formatDate(
                    form.endDate
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Calendar Days
                </p>

                <p className="mt-1 text-sm font-bold text-slate-700">
                  {calendarDays}{" "}
                  day(s)
                </p>
              </div>

              <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">
                  Leave Duration
                </p>

                <p className="mt-1 text-sm font-bold text-brand-700">
                  {form.dayType ===
                  "half_day"
                    ? `${formatLabel(
                        form.halfDaySession
                      )} · 0.5 Day`
                    : `${safeNumber(
                        form.totalDays
                      )} Day(s)`}
                </p>
              </div>
            </div>
          )}
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Reason and Handover
        |--------------------------------------------------------------------------
        */}

        <section className="card p-5">
          <SectionHeader
            icon={FileText}
            title="Reason and Handover"
            description="Provide the leave reason and any work handover instructions."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="field-label">
                Leave Reason
                <span className="ml-1 text-rose-500">
                  *
                </span>
              </label>

              <textarea
                rows={6}
                value={
                  form.reason
                }
                disabled={
                  submitting
                }
                placeholder="Explain the reason for this leave request..."
                className={`field-input resize-none ${
                  validationErrors
                    .reason
                    ? "border-rose-300"
                    : ""
                }`}
                onChange={(
                  event
                ) =>
                  updateField(
                    "reason",
                    event.target
                      .value
                  )
                }
              />

              <div className="mt-1 flex items-center justify-between gap-3">
                {validationErrors
                  .reason ? (
                  <p className="text-xs text-rose-600">
                    {
                      validationErrors
                        .reason
                    }
                  </p>
                ) : (
                  <span />
                )}

                <p className="text-[10px] text-slate-400">
                  {String(
                    form.reason || ""
                  ).length}
                  /2000
                </p>
              </div>
            </div>

            <div>
              <label className="field-label">
                Handover Notes
              </label>

              <textarea
                rows={6}
                value={
                  form.handoverNotes
                }
                disabled={
                  submitting
                }
                placeholder="Describe pending duties, substitute arrangements or handover details..."
                className="field-input resize-none"
                onChange={(
                  event
                ) =>
                  updateField(
                    "handoverNotes",
                    event.target
                      .value
                  )
                }
              />

              <p className="mt-1 text-right text-[10px] text-slate-400">
                {String(
                  form.handoverNotes ||
                    ""
                ).length}
                /2000
              </p>
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Payroll Treatment
        |--------------------------------------------------------------------------
        */}

        <section className="card p-5">
          <SectionHeader
            icon={
              CircleDollarSign
            }
            title="Payroll Treatment"
            description="Define whether this leave will be paid, unpaid or partially paid."
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="field-label">
                Payment Type
              </label>

              <select
                value={
                  form.leaveType ===
                  "unpaid"
                    ? "unpaid"
                    : form.payType
                }
                disabled={
                  submitting ||
                  form.leaveType ===
                    "unpaid"
                }
                className="field-select"
                onChange={(
                  event
                ) =>
                  handlePayTypeChange(
                    event.target
                      .value
                  )
                }
              >
                {PAY_TYPES.map(
                  (payType) => (
                    <option
                      key={
                        payType.value
                      }
                      value={
                        payType.value
                      }
                    >
                      {payType.label}
                    </option>
                  )
                )}
              </select>

              {form.leaveType ===
                "unpaid" && (
                <p className="mt-1 text-xs text-rose-600">
                  Unpaid Leave type is
                  automatically treated as
                  0% paid.
                </p>
              )}
            </div>

            <div>
              <label className="field-label">
                Paid Percentage
              </label>

              <div className="relative">
                <input
                  type="number"
                  min={
                    form.payType ===
                    "partial_paid"
                      ? 1
                      : 0
                  }
                  max={
                    form.payType ===
                    "partial_paid"
                      ? 99
                      : 100
                  }
                  value={
                    form.leaveType ===
                    "unpaid"
                      ? 0
                      : form.payPercentage
                  }
                  disabled={
                    submitting ||
                    form.leaveType ===
                      "unpaid" ||
                    form.payType !==
                      "partial_paid"
                  }
                  className={`field-input pr-10 ${
                    validationErrors
                      .payPercentage
                      ? "border-rose-300"
                      : ""
                  }`}
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "payPercentage",
                      event.target
                        .value
                    )
                  }
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                  %
                </span>
              </div>

              {validationErrors
                .payPercentage && (
                <p className="mt-1 text-xs text-rose-600">
                  {
                    validationErrors
                      .payPercentage
                  }
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck
                size={17}
                className="mt-0.5 shrink-0 text-blue-700"
              />

              <p className="text-xs leading-5 text-blue-700">
                Final payroll treatment
                can also be reviewed when
                the leave is approved.
                Payroll deduction will only
                be applied after the leave
                is approved and processed
                in monthly payroll.
              </p>
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Emergency Contact
        |--------------------------------------------------------------------------
        */}

        <section className="card p-5">
          <SectionHeader
            icon={ContactRound}
            title="Emergency Contact"
            description="Optional contact information during the leave period."
          />

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="field-label">
                Contact Name
              </label>

              <input
                type="text"
                value={
                  form
                    .emergencyContact
                    .name
                }
                disabled={
                  submitting
                }
                placeholder="Full name"
                className="field-input"
                onChange={(
                  event
                ) =>
                  updateEmergencyContact(
                    "name",
                    event.target
                      .value
                  )
                }
              />
            </div>

            <div>
              <label className="field-label">
                Phone Number
              </label>

              <input
                type="tel"
                value={
                  form
                    .emergencyContact
                    .phone
                }
                disabled={
                  submitting
                }
                placeholder="Phone number"
                className="field-input"
                onChange={(
                  event
                ) =>
                  updateEmergencyContact(
                    "phone",
                    event.target
                      .value
                  )
                }
              />
            </div>

            <div>
              <label className="field-label">
                Relationship
              </label>

              <input
                type="text"
                value={
                  form
                    .emergencyContact
                    .relationship
                }
                disabled={
                  submitting
                }
                placeholder="Relationship"
                className="field-input"
                onChange={(
                  event
                ) =>
                  updateEmergencyContact(
                    "relationship",
                    event.target
                      .value
                  )
                }
              />
            </div>
          </div>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Attachments
        |--------------------------------------------------------------------------
        */}

        <section className="card p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeader
              icon={Link2}
              title="Attachments"
              description="Add medical certificate or supporting document links."
            />

            <button
              type="button"
              disabled={
                submitting
              }
              onClick={
                addAttachment
              }
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              <Plus size={16} />

              Add Attachment
            </button>
          </div>

          {form.attachments
            .length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
              <Link2
                size={25}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-semibold text-slate-600">
                No attachments added
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Supporting documents are
                optional.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {form.attachments.map(
                (
                  attachment,
                  index
                ) => (
                  <div
                    key={
                      attachment._id ||
                      index
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-slate-700">
                        Attachment{" "}
                        {index + 1}
                      </p>

                      <button
                        type="button"
                        disabled={
                          submitting
                        }
                        onClick={() =>
                          removeAttachment(
                            index
                          )
                        }
                        className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50"
                        aria-label="Remove attachment"
                      >
                        <Trash2
                          size={16}
                        />
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="field-label">
                          File Name
                        </label>

                        <input
                          type="text"
                          value={
                            attachment.fileName
                          }
                          disabled={
                            submitting
                          }
                          placeholder="Medical Certificate"
                          className="field-input"
                          onChange={(
                            event
                          ) =>
                            updateAttachment(
                              index,
                              "fileName",
                              event.target
                                .value
                            )
                          }
                        />
                      </div>

                      <div>
                        <label className="field-label">
                          File URL
                          <span className="ml-1 text-rose-500">
                            *
                          </span>
                        </label>

                        <input
                          type="url"
                          value={
                            attachment.fileUrl
                          }
                          disabled={
                            submitting
                          }
                          placeholder="https://..."
                          className={`field-input ${
                            validationErrors[
                              `attachment-${index}`
                            ]
                              ? "border-rose-300"
                              : ""
                          }`}
                          onChange={(
                            event
                          ) =>
                            updateAttachment(
                              index,
                              "fileUrl",
                              event.target
                                .value
                            )
                          }
                        />

                        {validationErrors[
                          `attachment-${index}`
                        ] && (
                          <p className="mt-1 text-xs text-rose-600">
                            {
                              validationErrors[
                                `attachment-${index}`
                              ]
                            }
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="field-label">
                          File Type
                        </label>

                        <input
                          type="text"
                          value={
                            attachment.fileType
                          }
                          disabled={
                            submitting
                          }
                          placeholder="application/pdf"
                          className="field-input"
                          onChange={(
                            event
                          ) =>
                            updateAttachment(
                              index,
                              "fileType",
                              event.target
                                .value
                            )
                          }
                        />
                      </div>

                      <div>
                        <label className="field-label">
                          File Size
                          <span className="ml-1 text-slate-400">
                            (bytes)
                          </span>
                        </label>

                        <input
                          type="number"
                          min="0"
                          value={
                            attachment.fileSize
                          }
                          disabled={
                            submitting
                          }
                          className="field-input"
                          onChange={(
                            event
                          ) =>
                            updateAttachment(
                              index,
                              "fileSize",
                              event.target
                                .value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Internal Notes
        |--------------------------------------------------------------------------
        */}

        <section className="card p-5">
          <SectionHeader
            icon={FileText}
            title="Administrative Notes"
            description="Internal notes are visible to authorized management users."
          />

          <textarea
            rows={5}
            value={
              form.internalNotes
            }
            disabled={
              submitting
            }
            placeholder="Optional internal administrative notes..."
            className="field-input resize-none"
            onChange={(
              event
            ) =>
              updateField(
                "internalNotes",
                event.target
                  .value
              )
            }
          />

          <p className="mt-1 text-right text-[10px] text-slate-400">
            {String(
              form.internalNotes ||
                ""
            ).length}
            /3000
          </p>
        </section>

        {/*
        |--------------------------------------------------------------------------
        | Final Summary
        |--------------------------------------------------------------------------
        */}

        <section className="card overflow-hidden">
          <div className="bg-slate-900 p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                <CalendarDays
                  size={19}
                />
              </div>

              <div>
                <h3 className="text-sm font-bold">
                  Leave Request Summary
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Review the main details
                  before saving the
                  request.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Staff
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {selectedStaff?.name ||
                    "Not selected"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Leave Type
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {form.leaveType ===
                  "other"
                    ? form.customLeaveType ||
                      "Other Leave"
                    : LEAVE_TYPES.find(
                        (
                          leaveType
                        ) =>
                          leaveType.value ===
                          form.leaveType
                      )?.label ||
                      formatLabel(
                        form.leaveType
                      )}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Duration
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {form.dayType ===
                  "half_day"
                    ? `0.5 Day · ${formatLabel(
                        form.halfDaySession
                      )}`
                    : `${safeNumber(
                        form.totalDays
                      )} Day(s)`}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Payroll Treatment
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {form.leaveType ===
                  "unpaid"
                    ? "Unpaid · 0%"
                    : form.payType ===
                        "partial_paid"
                      ? `Partially Paid · ${safeNumber(
                          form.payPercentage
                        )}%`
                      : `${formatLabel(
                          form.payType
                        )} · ${
                          form.payType ===
                          "paid"
                            ? 100
                            : 0
                        }%`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-400">
              New requests will initially
              be saved with{" "}
              <span className="font-semibold text-amber-600">
                Pending
              </span>{" "}
              status.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={() =>
                  navigate(
                    isEditMode
                      ? `/staff-leaves/${id}`
                      : "/staff-leaves"
                  )
                }
                className="btn-secondary"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  (
                    isEditMode &&
                    ![
                      "pending",
                      "rejected"
                    ].includes(
                      existingStatus
                    )
                  )
                }
                className="btn-primary inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <RefreshCcw
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Save
                    size={16}
                  />
                )}

                {submitting
                  ? "Saving..."
                  : isEditMode
                    ? "Update Leave Request"
                    : "Create Leave Request"}
              </button>
            </div>
          </div>
        </section>
      </form>
    );
  };

export default StaffLeaveForm;