import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  BriefcaseBusiness,
  Building2,
  Camera,
  FileText,
  ImagePlus,
  Landmark,
  Loader2,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  Wallet,
  X
} from "lucide-react";

import {
  createStaff,
  updateStaff
} from "../../api/staff";

import {
  getSchools
} from "../../api/schools";

import {
  getUsers
} from "../../api/users";

import {
  useAuth
} from "../../context/AuthContext";

import {
  Modal
} from "../../components/ui/Modal";

/*
|--------------------------------------------------------------------------
| Staff Options
|--------------------------------------------------------------------------
*/

const STAFF_CATEGORIES = [
  {
    value: "administration",
    label: "Administration"
  },
  {
    value: "accounts",
    label: "Accounts"
  },
  {
    value: "library",
    label: "Library"
  },
  {
    value: "laboratory",
    label: "Laboratory"
  },
  {
    value: "transport",
    label: "Transport"
  },
  {
    value: "security",
    label: "Security"
  },
  {
    value: "maintenance",
    label: "Maintenance"
  },
  {
    value: "medical",
    label: "Medical"
  },
  {
    value: "support",
    label: "Support Staff"
  },
  {
    value: "other",
    label: "Other"
  }
];

const EMPLOYMENT_TYPES = [
  {
    value: "permanent",
    label: "Permanent"
  },
  {
    value: "contract",
    label: "Contract"
  },
  {
    value: "temporary",
    label: "Temporary"
  },
  {
    value: "part_time",
    label: "Part Time"
  },
  {
    value: "intern",
    label: "Intern"
  }
];

const STAFF_STATUSES = [
  {
    value: "active",
    label: "Active"
  },
  {
    value: "inactive",
    label: "Inactive"
  },
  {
    value: "on_leave",
    label: "On Leave"
  },
  {
    value: "resigned",
    label: "Resigned"
  },
  {
    value: "terminated",
    label: "Terminated"
  }
];

const GENDER_OPTIONS = [
  {
    value: "male",
    label: "Male"
  },
  {
    value: "female",
    label: "Female"
  },
  {
    value: "other",
    label: "Other"
  }
];

const MARITAL_STATUS_OPTIONS = [
  {
    value: "single",
    label: "Single"
  },
  {
    value: "married",
    label: "Married"
  },
  {
    value: "divorced",
    label: "Divorced"
  },
  {
    value: "widowed",
    label: "Widowed"
  }
];


const MAX_STAFF_PHOTO_SIZE =
  5 * 1024 * 1024;

const STAFF_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

/*
|--------------------------------------------------------------------------
| Empty Document
|--------------------------------------------------------------------------
*/

const createEmptyDocument = () => ({
  title: "",
  documentType: "",
  fileUrl: ""
});

/*
|--------------------------------------------------------------------------
| Empty Form
|--------------------------------------------------------------------------
*/

const createEmptyForm = () => ({
  schoolId: "",
  userId: "",

  employeeId: "",
  name: "",
  fatherName: "",
  email: "",
  phone: "",
  alternatePhone: "",
  cnic: "",
  gender: "",
  dateOfBirth: "",
  maritalStatus: "single",
  address: "",
  city: "",

  category: "",
  department: "",
  designation: "",
  employmentType: "permanent",
  joiningDate: new Date()
    .toISOString()
    .slice(0, 10),
  contractEndDate: "",
  shift: "",
  qualification: "",
  experienceYears: "0",

  basicSalary: "0",
  allowances: "0",
  deductions: "0",

  bankName: "",
  accountTitle: "",
  accountNumber: "",
  iban: "",

  emergencyContact: {
    name: "",
    relationship: "",
    phone: ""
  },

  documents: [],

  status: "active",
  leavingDate: "",
  leavingReason: "",
  notes: ""
});

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getDocumentId = (value) => {
  if (!value) {
    return "";
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const getDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
};

const getErrorMessage = (
  requestError,
  fallback
) => {
  return (
    requestError.response?.data?.message ||
    requestError.response?.data?.error ||
    requestError.message ||
    fallback
  );
};

const normaliseDocuments = (
  documents
) => {
  if (!Array.isArray(documents)) {
    return [];
  }

  return documents.map(
    (document) => ({
      _id: document._id,
      title:
        document.title || "",
      documentType:
        document.documentType ||
        "",
      fileUrl:
        document.fileUrl || ""
    })
  );
};

/*
|--------------------------------------------------------------------------
| Form Section
|--------------------------------------------------------------------------
*/

const FormSection = ({
  icon: Icon,
  title,
  description,
  children
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
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

      <div className="p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
};

/*
|--------------------------------------------------------------------------
| Staff Form Modal
|--------------------------------------------------------------------------
*/

const StaffFormModal = ({
  open,
  onClose,
  staff = null,
  onSaved
}) => {
  const {
    user: currentUser
  } = useAuth();

  const isEdit = Boolean(
    staff?._id
  );

  const isSuperAdmin =
    currentUser?.role ===
    "super_admin";

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [
    form,
    setForm
  ] = useState(
    createEmptyForm
  );

  const [
    schools,
    setSchools
  ] = useState([]);

  const [
    accountUsers,
    setAccountUsers
  ] = useState([]);

  const [
    loadingSchools,
    setLoadingSchools
  ] = useState(false);

  const [
    loadingUsers,
    setLoadingUsers
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
    selectedPhoto,
    setSelectedPhoto
  ] = useState(null);

  const [
    photoPreview,
    setPhotoPreview
  ] = useState("");

  const [
    removeStaffPhoto,
    setRemoveStaffPhoto
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Populate Form
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!open) {
      return;
    }

    setError("");
    setSelectedPhoto(null);
    setRemoveStaffPhoto(false);
    setPhotoPreview(
      staff?.staffPhoto ||
      ""
    );

    if (!staff) {
      setForm(
        createEmptyForm()
      );

      return;
    }

    setForm({
      schoolId:
        getDocumentId(
          staff.schoolId
        ),

      userId:
        getDocumentId(
          staff.userId
        ),

      employeeId:
        staff.employeeId || "",

      name:
        staff.name || "",

      fatherName:
        staff.fatherName || "",

      email:
        staff.email || "",

      phone:
        staff.phone || "",

      alternatePhone:
        staff.alternatePhone ||
        "",

      cnic:
        staff.cnic || "",

      gender:
        staff.gender || "",

      dateOfBirth:
        getDateInputValue(
          staff.dateOfBirth
        ),

      maritalStatus:
        staff.maritalStatus ||
        "single",

      address:
        staff.address || "",

      city:
        staff.city || "",

      category:
        staff.category || "",

      department:
        staff.department || "",

      designation:
        staff.designation || "",

      employmentType:
        staff.employmentType ||
        "permanent",

      joiningDate:
        getDateInputValue(
          staff.joiningDate
        ) ||
        new Date()
          .toISOString()
          .slice(0, 10),

      contractEndDate:
        getDateInputValue(
          staff.contractEndDate
        ),

      shift:
        staff.shift || "",

      qualification:
        staff.qualification || "",

      experienceYears:
        String(
          staff.experienceYears ??
            0
        ),

      basicSalary:
        String(
          staff.basicSalary ?? 0
        ),

      allowances:
        String(
          staff.allowances ?? 0
        ),

      deductions:
        String(
          staff.deductions ?? 0
        ),

      bankName:
        staff.bankName || "",

      accountTitle:
        staff.accountTitle || "",

      accountNumber:
        staff.accountNumber || "",

      iban:
        staff.iban || "",

      emergencyContact: {
        name:
          staff.emergencyContact
            ?.name || "",

        relationship:
          staff.emergencyContact
            ?.relationship || "",

        phone:
          staff.emergencyContact
            ?.phone || ""
      },

      documents:
        normaliseDocuments(
          staff.documents
        ),

      status:
        staff.status || "active",

      leavingDate:
        getDateInputValue(
          staff.leavingDate
        ),

      leavingReason:
        staff.leavingReason || "",

      notes:
        staff.notes || ""
    });
  }, [
    open,
    staff
  ]);

  /*
  |--------------------------------------------------------------------------
  | Release Local Photo Preview
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      if (
        photoPreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          photoPreview
        );
      }
    };
  }, [
    photoPreview
  ]);

  /*
  |--------------------------------------------------------------------------
  | Load Schools
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !open ||
      !isSuperAdmin
    ) {
      return;
    }

    const loadSchools =
      async () => {
        setLoadingSchools(true);

        try {
          const { data } =
            await getSchools({
              isActive: true,
              limit: 200
            });

          setSchools(
            data?.schools || []
          );
        } catch (
          requestError
        ) {
          setSchools([]);

          setError(
            getErrorMessage(
              requestError,
              "Schools could not be loaded."
            )
          );
        } finally {
          setLoadingSchools(
            false
          );
        }
      };

    loadSchools();
  }, [
    open,
    isSuperAdmin
  ]);

  /*
  |--------------------------------------------------------------------------
  | Selected School
  |--------------------------------------------------------------------------
  */

  const selectedSchoolId =
    useMemo(() => {
      if (isSuperAdmin) {
        return form.schoolId;
      }

      return (
        getDocumentId(
          currentUser?.schoolId
        ) ||
        getDocumentId(
          currentUser?.school
        )
      );
    }, [
      currentUser,
      form.schoolId,
      isSuperAdmin
    ]);

  /*
  |--------------------------------------------------------------------------
  | Load Accountant Users
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      isSuperAdmin &&
      !selectedSchoolId
    ) {
      setAccountUsers([]);
      return;
    }

    const loadAccountUsers =
      async () => {
        setLoadingUsers(true);

        try {
          const params = {
            role: "accountant",
            isActive: true,
            limit: 200
          };

          if (
            isSuperAdmin &&
            selectedSchoolId
          ) {
            params.schoolId =
              selectedSchoolId;
          }

          const { data } =
            await getUsers(params);

          const users =
            data?.users || [];

          /*
          |--------------------------------------------------------------------------
          | Preserve Existing Linked User
          |--------------------------------------------------------------------------
          */

          if (
            staff?.userId?._id &&
            !users.some(
              (user) =>
                user._id ===
                staff.userId._id
            )
          ) {
            users.unshift(
              staff.userId
            );
          }

          setAccountUsers(users);
        } catch {
          setAccountUsers(
            staff?.userId?._id
              ? [staff.userId]
              : []
          );
        } finally {
          setLoadingUsers(false);
        }
      };

    loadAccountUsers();
  }, [
    open,
    selectedSchoolId,
    isSuperAdmin,
    staff
  ]);

  /*
  |--------------------------------------------------------------------------
  | Calculated Salary
  |--------------------------------------------------------------------------
  */

  const netSalary =
    useMemo(() => {
      const basicSalary =
        Number(
          form.basicSalary || 0
        );

      const allowances =
        Number(
          form.allowances || 0
        );

      const deductions =
        Number(
          form.deductions || 0
        );

      return Math.max(
        0,
        basicSalary +
          allowances -
          deductions
      );
    }, [
      form.basicSalary,
      form.allowances,
      form.deductions
    ]);

  /*
  |--------------------------------------------------------------------------
  | Field Handlers
  |--------------------------------------------------------------------------
  */

  const updateField =
    (field) => (event) => {
      const value =
        event.target.value;

      setForm(
        (current) => ({
          ...current,
          [field]: value
        })
      );

      setError("");
    };


  /*
  |--------------------------------------------------------------------------
  | Staff Photo Selection
  |--------------------------------------------------------------------------
  */

  const handlePhotoChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !STAFF_PHOTO_TYPES.includes(
        file.type
      )
    ) {
      setError(
        "Please select a JPG, PNG or WebP image."
      );

      event.target.value =
        "";

      return;
    }

    if (
      file.size >
      MAX_STAFF_PHOTO_SIZE
    ) {
      setError(
        "Staff image size cannot exceed 5 MB."
      );

      event.target.value =
        "";

      return;
    }

    setSelectedPhoto(
      file
    );

    setRemoveStaffPhoto(
      false
    );

    setPhotoPreview(
      URL.createObjectURL(
        file
      )
    );

    setError("");
  };

  const handleRemovePhoto =
    () => {
      setSelectedPhoto(
        null
      );

      setPhotoPreview(
        ""
      );

      setRemoveStaffPhoto(
        Boolean(
          staff?.staffPhoto
        )
      );

      setError("");
    };

  const handleRestoreExistingPhoto =
    () => {
      setSelectedPhoto(
        null
      );

      setPhotoPreview(
        staff?.staffPhoto ||
        ""
      );

      setRemoveStaffPhoto(
        false
      );

      setError("");
    };

  const updateEmergencyContact =
    (field) => (event) => {
      const value =
        event.target.value;

      setForm(
        (current) => ({
          ...current,

          emergencyContact: {
            ...current
              .emergencyContact,

            [field]: value
          }
        })
      );

      setError("");
    };

  const updateDocument = (
    index,
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,

        documents:
          current.documents.map(
            (
              document,
              documentIndex
            ) =>
              documentIndex ===
              index
                ? {
                    ...document,
                    [field]: value
                  }
                : document
          )
      })
    );

    setError("");
  };

  const addDocument = () => {
    setForm(
      (current) => ({
        ...current,

        documents: [
          ...current.documents,
          createEmptyDocument()
        ]
      })
    );
  };

  const removeDocument = (
    index
  ) => {
    setForm(
      (current) => ({
        ...current,

        documents:
          current.documents.filter(
            (
              _,
              documentIndex
            ) =>
              documentIndex !==
              index
          )
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | School Change
  |--------------------------------------------------------------------------
  */

  const handleSchoolChange = (
    event
  ) => {
    const schoolId =
      event.target.value;

    setForm(
      (current) => ({
        ...current,
        schoolId,
        userId: ""
      })
    );

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Employment Type Change
  |--------------------------------------------------------------------------
  */

  const handleEmploymentTypeChange =
    (event) => {
      const employmentType =
        event.target.value;

      setForm(
        (current) => ({
          ...current,
          employmentType,

          contractEndDate: [
            "contract",
            "temporary"
          ].includes(
            employmentType
          )
            ? current.contractEndDate
            : ""
        })
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Status Change
  |--------------------------------------------------------------------------
  */

  const handleStatusChange = (
    event
  ) => {
    const status =
      event.target.value;

    const isLeavingStatus = [
      "resigned",
      "terminated"
    ].includes(status);

    setForm(
      (current) => ({
        ...current,
        status,

        leavingDate:
          isLeavingStatus
            ? current.leavingDate
            : "",

        leavingReason:
          isLeavingStatus
            ? current.leavingReason
            : ""
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Validation
  |--------------------------------------------------------------------------
  */

  const validateForm = () => {
    if (
      isSuperAdmin &&
      !form.schoolId
    ) {
      return "Please select a school.";
    }

    if (!form.employeeId.trim()) {
      return "Employee ID is required.";
    }

    if (!form.name.trim()) {
      return "Staff name is required.";
    }

    if (!form.phone.trim()) {
      return "Phone number is required.";
    }

    if (!form.gender) {
      return "Please select gender.";
    }

    if (!form.category) {
      return "Please select a staff category.";
    }

    if (!form.department.trim()) {
      return "Department is required.";
    }

    if (!form.designation.trim()) {
      return "Designation is required.";
    }

    if (!form.joiningDate) {
      return "Joining date is required.";
    }

    if (
      selectedPhoto &&
      !STAFF_PHOTO_TYPES.includes(
        selectedPhoto.type
      )
    ) {
      return "Please select a JPG, PNG or WebP image.";
    }

    if (
      selectedPhoto &&
      selectedPhoto.size >
        MAX_STAFF_PHOTO_SIZE
    ) {
      return "Staff image size cannot exceed 5 MB.";
    }

    if (
      form.dateOfBirth &&
      form.joiningDate &&
      form.dateOfBirth >=
        form.joiningDate
    ) {
      return "Date of birth must be earlier than joining date.";
    }

    if (
      [
        "contract",
        "temporary"
      ].includes(
        form.employmentType
      ) &&
      form.contractEndDate &&
      form.contractEndDate <
        form.joiningDate
    ) {
      return "Contract end date cannot be earlier than joining date.";
    }

    if (
      [
        "resigned",
        "terminated"
      ].includes(
        form.status
      ) &&
      form.leavingDate &&
      form.leavingDate <
        form.joiningDate
    ) {
      return "Leaving date cannot be earlier than joining date.";
    }

    const invalidDocument =
      form.documents.find(
        (document) =>
          (
            document.title.trim() ||
            document.fileUrl.trim() ||
            document.documentType.trim()
          ) &&
          (
            !document.title.trim() ||
            !document.fileUrl.trim()
          )
      );

    if (invalidDocument) {
      return "Each document requires both a title and file URL.";
    }

    return "";
  };

  /*
  |--------------------------------------------------------------------------
  | Build Payload
  |--------------------------------------------------------------------------
  */

  const buildPayload = () => {
    const documents =
      form.documents
        .filter(
          (document) =>
            document.title.trim() &&
            document.fileUrl.trim()
        )
        .map((document) => ({
          ...(document._id
            ? {
                _id:
                  document._id
              }
            : {}),

          title:
            document.title.trim(),

          documentType:
            document.documentType.trim(),

          fileUrl:
            document.fileUrl.trim()
        }));

    const payload = {
      userId:
        form.userId || null,

      employeeId:
        form.employeeId.trim(),

      name:
        form.name.trim(),

      fatherName:
        form.fatherName.trim(),

      email:
        form.email
          .trim()
          .toLowerCase(),

      phone:
        form.phone.trim(),

      alternatePhone:
        form.alternatePhone.trim(),

      cnic:
        form.cnic.trim(),

      gender:
        form.gender,

      dateOfBirth:
        form.dateOfBirth ||
        null,

      maritalStatus:
        form.maritalStatus,

      address:
        form.address.trim(),

      city:
        form.city.trim(),

      category:
        form.category,

      department:
        form.department.trim(),

      designation:
        form.designation.trim(),

      employmentType:
        form.employmentType,

      joiningDate:
        form.joiningDate,

      contractEndDate:
        [
          "contract",
          "temporary"
        ].includes(
          form.employmentType
        )
          ? form.contractEndDate ||
            null
          : null,

      shift:
        form.shift.trim(),

      qualification:
        form.qualification.trim(),

      experienceYears:
        Number(
          form.experienceYears ||
            0
        ),

      basicSalary:
        Number(
          form.basicSalary || 0
        ),

      allowances:
        Number(
          form.allowances || 0
        ),

      deductions:
        Number(
          form.deductions || 0
        ),

      bankName:
        form.bankName.trim(),

      accountTitle:
        form.accountTitle.trim(),

      accountNumber:
        form.accountNumber.trim(),

      iban:
        form.iban
          .replace(/\s+/g, "")
          .toUpperCase(),

      emergencyContact: {
        name:
          form.emergencyContact
            .name.trim(),

        relationship:
          form.emergencyContact
            .relationship.trim(),

        phone:
          form.emergencyContact
            .phone.trim()
      },

      documents,

      status:
        form.status,

      leavingDate:
        [
          "resigned",
          "terminated"
        ].includes(form.status)
          ? form.leavingDate ||
            null
          : null,

      leavingReason:
        [
          "resigned",
          "terminated"
        ].includes(form.status)
          ? form.leavingReason.trim()
          : "",

      notes:
        form.notes.trim()
    };

    if (isSuperAdmin) {
      payload.schoolId =
        form.schoolId;
    }

    return payload;
  };

  /*
  |--------------------------------------------------------------------------
  | Build Multipart FormData
  |--------------------------------------------------------------------------
  |
  | Backend route multipart/form-data قبول کرتا ہے۔ Browser خود boundary
  | کے ساتھ Content-Type set کرے گا، اس لیے یہاں manual header نہیں لگانا۔
  |
  */

  const buildFormDataPayload =
    () => {
      const payload =
        buildPayload();

      const formData =
        new FormData();

      Object.entries(
        payload
      ).forEach(
        (
          [
            field,
            value
          ]
        ) => {
          if (
            field ===
              "emergencyContact" ||
            field ===
              "documents"
          ) {
            formData.append(
              field,
              JSON.stringify(
                value
              )
            );

            return;
          }

          formData.append(
            field,
            value === null ||
            value === undefined
              ? ""
              : String(
                  value
                )
          );
        }
      );

      if (
        selectedPhoto
      ) {
        formData.append(
          "photo",
          selectedPhoto
        );
      }

      if (
        isEdit &&
        removeStaffPhoto &&
        !selectedPhoto
      ) {
        formData.append(
          "removeStaffPhoto",
          "true"
        );
      }

      return formData;
    };

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (submitting) {
        return;
      }

      const validationError =
        validateForm();

      if (validationError) {
        setError(
          validationError
        );

        return;
      }

      setSubmitting(true);
      setError("");

      try {
        const formData =
          buildFormDataPayload();

        const { data } = isEdit
          ? await updateStaff(
              staff._id,
              formData
            )
          : await createStaff(
              formData
            );

        if (onSaved) {
          await onSaved(
            data?.staff,
            data?.message
          );
        }

        onClose();
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            isEdit
              ? "Staff member could not be updated."
              : "Staff member could not be created."
          )
        );
      } finally {
        setSubmitting(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Close
  |--------------------------------------------------------------------------
  */

  const handleClose = () => {
    if (submitting) {
      return;
    }

    setError("");
    setSelectedPhoto(null);
    setPhotoPreview("");
    setRemoveStaffPhoto(false);
    onClose();
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        isEdit
          ? "Edit Staff Member"
          : "Add Staff Member"
      }
      width="max-w-6xl"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* Error */}

        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* School and Account */}

        <FormSection
          icon={Building2}
          title="School and Login Account"
          description="Select the staff member's school and optionally link an accountant login account."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {isSuperAdmin && (
              <div>
                <label className="field-label">
                  School{" "}
                  <span className="text-rose-500">
                    *
                  </span>
                </label>

                <select
                  className="field-select"
                  value={
                    form.schoolId
                  }
                  onChange={
                    handleSchoolChange
                  }
                  disabled={
                    submitting ||
                    loadingSchools ||
                    isEdit
                  }
                >
                  <option value="">
                    {loadingSchools
                      ? "Loading schools..."
                      : "Select school"}
                  </option>

                  {schools.map(
                    (schoolItem) => (
                      <option
                        key={
                          schoolItem._id
                        }
                        value={
                          schoolItem._id
                        }
                      >
                        {
                          schoolItem.schoolName
                        }
                      </option>
                    )
                  )}
                </select>

                {isEdit && (
                  <p className="mt-1 text-xs text-slate-400">
                    A staff member cannot
                    be moved to another
                    school.
                  </p>
                )}
              </div>
            )}

            <div
              className={
                isSuperAdmin
                  ? ""
                  : "md:col-span-2"
              }
            >
              <label className="field-label">
                Linked Login Account
              </label>

              <select
                className="field-select"
                value={form.userId}
                onChange={updateField(
                  "userId"
                )}
                disabled={
                  submitting ||
                  loadingUsers ||
                  (
                    isSuperAdmin &&
                    !selectedSchoolId
                  )
                }
              >
                <option value="">
                  {loadingUsers
                    ? "Loading accounts..."
                    : "No login account"}
                </option>

                {accountUsers.map(
                  (accountUser) => (
                    <option
                      key={
                        accountUser._id
                      }
                      value={
                        accountUser._id
                      }
                    >
                      {
                        accountUser.name
                      }{" "}
                      —{" "}
                      {
                        accountUser.email
                      }
                    </option>
                  )
                )}
              </select>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Linking an account is
                optional. Currently only
                an accountant user account
                can be linked.
              </p>
            </div>
          </div>
        </FormSection>

        {/* Personal Information */}

        <FormSection
          icon={UserRound}
          title="Personal Information"
          description="Basic identity and contact information of the non-teaching staff member."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="field-label">
                Employee ID{" "}
                <span className="text-rose-500">
                  *
                </span>
              </label>

              <input
                type="text"
                className="field-input uppercase"
                value={
                  form.employeeId
                }
                onChange={updateField(
                  "employeeId"
                )}
                placeholder="STF-001"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Full Name{" "}
                <span className="text-rose-500">
                  *
                </span>
              </label>

              <input
                type="text"
                className="field-input"
                value={form.name}
                onChange={updateField(
                  "name"
                )}
                placeholder="Staff member name"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Father Name
              </label>

              <input
                type="text"
                className="field-input"
                value={
                  form.fatherName
                }
                onChange={updateField(
                  "fatherName"
                )}
                placeholder="Father name"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Gender{" "}
                <span className="text-rose-500">
                  *
                </span>
              </label>

              <select
                className="field-select"
                value={form.gender}
                onChange={updateField(
                  "gender"
                )}
                disabled={submitting}
              >
                <option value="">
                  Select gender
                </option>

                {GENDER_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="field-label">
                Date of Birth
              </label>

              <input
                type="date"
                className="field-input"
                value={
                  form.dateOfBirth
                }
                max={
                  form.joiningDate ||
                  undefined
                }
                onChange={updateField(
                  "dateOfBirth"
                )}
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Marital Status
              </label>

              <select
                className="field-select"
                value={
                  form.maritalStatus
                }
                onChange={updateField(
                  "maritalStatus"
                )}
                disabled={submitting}
              >
                {MARITAL_STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="field-label">
                CNIC
              </label>

              <input
                type="text"
                className="field-input"
                value={form.cnic}
                onChange={updateField(
                  "cnic"
                )}
                placeholder="35202-1234567-1"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Phone Number{" "}
                <span className="text-rose-500">
                  *
                </span>
              </label>

              <input
                type="tel"
                className="field-input"
                value={form.phone}
                onChange={updateField(
                  "phone"
                )}
                placeholder="0300 1234567"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Alternate Phone
              </label>

              <input
                type="tel"
                className="field-input"
                value={
                  form.alternatePhone
                }
                onChange={updateField(
                  "alternatePhone"
                )}
                placeholder="Optional number"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Email Address
              </label>

              <input
                type="email"
                className="field-input"
                value={form.email}
                onChange={updateField(
                  "email"
                )}
                placeholder="staff@example.com"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                City
              </label>

              <input
                type="text"
                className="field-input"
                value={form.city}
                onChange={updateField(
                  "city"
                )}
                placeholder="City"
                disabled={submitting}
              />
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <label className="field-label">
                Staff Photo
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-300 shadow-sm">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Staff preview"
                        className="h-full w-full object-cover"
                        onError={() => {
                          setPhotoPreview("");
                        }}
                      />
                    ) : (
                      <Camera
                        size={34}
                        strokeWidth={1.6}
                      />
                    )}

                    {photoPreview && (
                      <button
                        type="button"
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow transition hover:bg-rose-700 disabled:opacity-60"
                        onClick={
                          handleRemovePhoto
                        }
                        disabled={
                          submitting
                        }
                        aria-label="Remove staff photo"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <input
                      id="staff-photo-file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={
                        handlePhotoChange
                      }
                      disabled={
                        submitting
                      }
                    />

                    <div className="flex flex-wrap gap-2">
                      <label
                        htmlFor="staff-photo-file"
                        className={`btn-secondary cursor-pointer ${
                          submitting
                            ? "pointer-events-none opacity-60"
                            : ""
                        }`}
                      >
                        <ImagePlus size={16} />

                        {photoPreview
                          ? "Change Photo"
                          : "Choose Photo"}
                      </label>

                      {isEdit &&
                        removeStaffPhoto &&
                        staff?.staffPhoto && (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={
                              handleRestoreExistingPhoto
                            }
                            disabled={
                              submitting
                            }
                          >
                            Restore Existing
                          </button>
                        )}
                    </div>

                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Select a photo from this device. JPG, PNG and WebP files are allowed. Maximum size is 5 MB.
                    </p>

                    {selectedPhoto && (
                      <p className="mt-2 truncate text-xs font-semibold text-brand-700">
                        Selected:{" "}
                        {selectedPhoto.name}
                      </p>
                    )}

                    {isEdit &&
                      removeStaffPhoto &&
                      !selectedPhoto && (
                        <p className="mt-2 text-xs font-semibold text-rose-600">
                          The existing photo will be removed when you save the staff record.
                        </p>
                      )}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <label className="field-label">
                Address
              </label>

              <textarea
                className="field-input min-h-24 resize-y"
                value={form.address}
                onChange={updateField(
                  "address"
                )}
                placeholder="Complete residential address"
                disabled={submitting}
              />
            </div>
          </div>
        </FormSection>

        {/* Employment */}

        <FormSection
          icon={BriefcaseBusiness}
          title="Employment Information"
          description="Department, designation, employment type and service information."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="field-label">
                Staff Category{" "}
                <span className="text-rose-500">
                  *
                </span>
              </label>

              <select
                className="field-select"
                value={form.category}
                onChange={updateField(
                  "category"
                )}
                disabled={submitting}
              >
                <option value="">
                  Select category
                </option>

                {STAFF_CATEGORIES.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="field-label">
                Department{" "}
                <span className="text-rose-500">
                  *
                </span>
              </label>

              <input
                type="text"
                className="field-input"
                value={
                  form.department
                }
                onChange={updateField(
                  "department"
                )}
                placeholder="Administration"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Designation{" "}
                <span className="text-rose-500">
                  *
                </span>
              </label>

              <input
                type="text"
                className="field-input"
                value={
                  form.designation
                }
                onChange={updateField(
                  "designation"
                )}
                placeholder="Receptionist"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Employment Type
              </label>

              <select
                className="field-select"
                value={
                  form.employmentType
                }
                onChange={
                  handleEmploymentTypeChange
                }
                disabled={submitting}
              >
                {EMPLOYMENT_TYPES.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="field-label">
                Joining Date{" "}
                <span className="text-rose-500">
                  *
                </span>
              </label>

              <input
                type="date"
                className="field-input"
                value={
                  form.joiningDate
                }
                onChange={updateField(
                  "joiningDate"
                )}
                disabled={submitting}
              />
            </div>

            {[
              "contract",
              "temporary"
            ].includes(
              form.employmentType
            ) && (
              <div>
                <label className="field-label">
                  Contract End Date
                </label>

                <input
                  type="date"
                  className="field-input"
                  value={
                    form.contractEndDate
                  }
                  min={
                    form.joiningDate ||
                    undefined
                  }
                  onChange={updateField(
                    "contractEndDate"
                  )}
                  disabled={submitting}
                />
              </div>
            )}

            <div>
              <label className="field-label">
                Shift
              </label>

              <input
                type="text"
                className="field-input"
                value={form.shift}
                onChange={updateField(
                  "shift"
                )}
                placeholder="Morning"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Qualification
              </label>

              <input
                type="text"
                className="field-input"
                value={
                  form.qualification
                }
                onChange={updateField(
                  "qualification"
                )}
                placeholder="Graduation"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Experience in Years
              </label>

              <input
                type="number"
                min="0"
                step="0.5"
                className="field-input"
                value={
                  form.experienceYears
                }
                onChange={updateField(
                  "experienceYears"
                )}
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Staff Status
              </label>

              <select
                className="field-select"
                value={form.status}
                onChange={
                  handleStatusChange
                }
                disabled={submitting}
              >
                {STAFF_STATUSES.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            {[
              "resigned",
              "terminated"
            ].includes(
              form.status
            ) && (
              <>
                <div>
                  <label className="field-label">
                    Leaving Date
                  </label>

                  <input
                    type="date"
                    className="field-input"
                    value={
                      form.leavingDate
                    }
                    min={
                      form.joiningDate ||
                      undefined
                    }
                    onChange={updateField(
                      "leavingDate"
                    )}
                    disabled={submitting}
                  />
                </div>

                <div className="md:col-span-2 xl:col-span-3">
                  <label className="field-label">
                    Leaving Reason
                  </label>

                  <textarea
                    className="field-input min-h-20 resize-y"
                    value={
                      form.leavingReason
                    }
                    onChange={updateField(
                      "leavingReason"
                    )}
                    placeholder="Reason for leaving"
                    disabled={submitting}
                  />
                </div>
              </>
            )}
          </div>
        </FormSection>

        {/* Salary */}

        <FormSection
          icon={Wallet}
          title="Salary Information"
          description="Basic monthly salary, fixed allowances and fixed deductions."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="field-label">
                Basic Salary
              </label>

              <input
                type="number"
                min="0"
                step="1"
                className="field-input"
                value={
                  form.basicSalary
                }
                onChange={updateField(
                  "basicSalary"
                )}
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Allowances
              </label>

              <input
                type="number"
                min="0"
                step="1"
                className="field-input"
                value={
                  form.allowances
                }
                onChange={updateField(
                  "allowances"
                )}
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Deductions
              </label>

              <input
                type="number"
                min="0"
                step="1"
                className="field-input"
                value={
                  form.deductions
                }
                onChange={updateField(
                  "deductions"
                )}
                disabled={submitting}
              />
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Net Salary
              </p>

              <p className="mt-2 text-xl font-bold text-emerald-700">
                Rs{" "}
                {netSalary.toLocaleString(
                  "en-US"
                )}
              </p>
            </div>
          </div>
        </FormSection>

        {/* Bank */}

        <FormSection
          icon={Landmark}
          title="Bank Information"
          description="Optional salary payment and bank account information."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="field-label">
                Bank Name
              </label>

              <input
                type="text"
                className="field-input"
                value={
                  form.bankName
                }
                onChange={updateField(
                  "bankName"
                )}
                placeholder="Bank name"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Account Title
              </label>

              <input
                type="text"
                className="field-input"
                value={
                  form.accountTitle
                }
                onChange={updateField(
                  "accountTitle"
                )}
                placeholder="Account title"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Account Number
              </label>

              <input
                type="text"
                className="field-input"
                value={
                  form.accountNumber
                }
                onChange={updateField(
                  "accountNumber"
                )}
                placeholder="Account number"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                IBAN
              </label>

              <input
                type="text"
                className="field-input uppercase"
                value={form.iban}
                onChange={updateField(
                  "iban"
                )}
                placeholder="PK00BANK..."
                disabled={submitting}
              />
            </div>
          </div>
        </FormSection>

        {/* Emergency Contact */}

        <FormSection
          icon={Phone}
          title="Emergency Contact"
          description="Person to contact in case of an emergency."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="field-label">
                Contact Name
              </label>

              <input
                type="text"
                className="field-input"
                value={
                  form.emergencyContact
                    .name
                }
                onChange={updateEmergencyContact(
                  "name"
                )}
                placeholder="Contact person"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Relationship
              </label>

              <input
                type="text"
                className="field-input"
                value={
                  form.emergencyContact
                    .relationship
                }
                onChange={updateEmergencyContact(
                  "relationship"
                )}
                placeholder="Brother, spouse..."
                disabled={submitting}
              />
            </div>

            <div>
              <label className="field-label">
                Contact Phone
              </label>

              <input
                type="tel"
                className="field-input"
                value={
                  form.emergencyContact
                    .phone
                }
                onChange={updateEmergencyContact(
                  "phone"
                )}
                placeholder="Emergency number"
                disabled={submitting}
              />
            </div>
          </div>
        </FormSection>

        {/* Documents */}

        <FormSection
          icon={FileText}
          title="Staff Documents"
          description="Add document links such as CNIC copies, certificates, appointment letters or contracts."
        >
          <div className="space-y-4">
            {form.documents.length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                <FileText
                  size={28}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-2 text-sm font-semibold text-slate-600">
                  No documents added
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Documents are optional
                  and can also be added
                  later.
                </p>
              </div>
            ) : (
              form.documents.map(
                (
                  document,
                  index
                ) => (
                  <div
                    key={
                      document._id ||
                      index
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="field-label">
                          Document Title
                        </label>

                        <input
                          type="text"
                          className="field-input"
                          value={
                            document.title
                          }
                          onChange={(
                            event
                          ) =>
                            updateDocument(
                              index,
                              "title",
                              event.target
                                .value
                            )
                          }
                          placeholder="CNIC Copy"
                          disabled={
                            submitting
                          }
                        />
                      </div>

                      <div>
                        <label className="field-label">
                          Document Type
                        </label>

                        <input
                          type="text"
                          className="field-input"
                          value={
                            document.documentType
                          }
                          onChange={(
                            event
                          ) =>
                            updateDocument(
                              index,
                              "documentType",
                              event.target
                                .value
                            )
                          }
                          placeholder="Identity Document"
                          disabled={
                            submitting
                          }
                        />
                      </div>

                      <div>
                        <label className="field-label">
                          File URL
                        </label>

                        <div className="flex gap-2">
                          <input
                            type="url"
                            className="field-input"
                            value={
                              document.fileUrl
                            }
                            onChange={(
                              event
                            ) =>
                              updateDocument(
                                index,
                                "fileUrl",
                                event.target
                                  .value
                              )
                            }
                            placeholder="https://..."
                            disabled={
                              submitting
                            }
                          />

                          <button
                            type="button"
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50"
                            onClick={() =>
                              removeDocument(
                                index
                              )
                            }
                            disabled={
                              submitting
                            }
                            aria-label="Remove document"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={addDocument}
              disabled={submitting}
            >
              <Plus size={16} />
              Add Document
            </button>
          </div>
        </FormSection>

        {/* Notes */}

        <FormSection
          icon={ShieldCheck}
          title="Additional Notes"
          description="Optional internal notes related to this staff member."
        >
          <textarea
            className="field-input min-h-28 resize-y"
            value={form.notes}
            onChange={updateField(
              "notes"
            )}
            placeholder="Write any additional staff information here..."
            disabled={submitting}
          />
        </FormSection>

        {/* Actions */}

        <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 py-4 backdrop-blur sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting && (
              <Loader2
                size={16}
                className="animate-spin"
              />
            )}

            {submitting
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
                ? "Update Staff"
                : "Create Staff"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StaffFormModal;