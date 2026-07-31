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
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Link2,
  Loader2,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserRound,
  UsersRound,
  WandSparkles,
  XCircle
} from "lucide-react";

import api from "../../api/axios";

import {
  getUserById,
  resetUserPassword,
  updateUserStatus
} from "../../api/users";

import {
  DEFAULT_PARENT_PORTAL_PERMISSIONS,
  PARENT_RELATIONSHIP_OPTIONS,
  createParentStudentLink,
  deleteParentStudentLink,
  getParentStudentLinksByParent,
  patchParentStudentLink
} from "../../api/parentStudentLinks";

import { useAuth } from "../../context/AuthContext";

import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  principal: "Principal",
  teacher: "Teacher",
  accountant: "Accountant",
  student: "Student",
  parent: "Parent"
};

const ROLE_TONES = {
  super_admin: "info",
  principal: "warning",
  teacher: "success",
  accountant: "neutral",
  student: "info",
  parent: "neutral"
};

const LINK_STATUS_TONES = {
  active: "success",
  inactive: "danger",
  suspended: "warning",
  revoked: "danger"
};

const VERIFICATION_TONES = {
  verified: "success",
  pending: "warning",
  rejected: "danger"
};

const PERMISSION_LABELS = {
  dashboard: "Dashboard",
  studentProfile: "Student Profile",
  attendance: "Attendance",
  timetable: "Timetable",
  academics: "Academic Progress",
  fees: "Fee Status",
  receipts: "Fee Receipts",
  notices: "Notices",
  messages: "Messages",
  documents: "Documents"
};

const createEmptyLinkForm = () => ({
  studentId: "",
  relationship: "father",
  customRelationship: "",
  isPrimary: false,
  isEmergencyContact: false,
  canCollectStudent: false,
  accessPermissions: {
    ...DEFAULT_PARENT_PORTAL_PERMISSIONS
  },
  notes: ""
});

const formatDate = (
  value,
  withTime = false
) => {
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
      ...(withTime
        ? {
            hour: "2-digit",
            minute: "2-digit"
          }
        : {})
    }
  ).format(date);
};

const getInitials = (
  name = ""
) => {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map(
        (part) =>
          part[0]
      )
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "U"
  );
};

const getRecordId = (
  record
) => {
  return (
    record?._id ||
    record?.id ||
    ""
  );
};

const getLinkStudent = (
  link
) => {
  return (
    link?.student ||
    link?.studentId ||
    null
  );
};

const getStudentName = (
  student
) => {
  return (
    student?.studentUserId?.name ||
    student?.userAccount?.name ||
    student?.name ||
    "Student"
  );
};

const getStudentClassName = (
  student
) => {
  return (
    student?.class?.className ||
    student?.classId?.className ||
    "Class not assigned"
  );
};

const getStudentSectionName = (
  student
) => {
  return (
    student?.sectionName ||
    "Section not assigned"
  );
};

const getRelationshipLabel = (
  link
) => {
  if (
    link?.relationshipLabel
  ) {
    return link.relationshipLabel;
  }

  if (
    link?.relationship ===
      "other"
  ) {
    return (
      link.customRelationship ||
      "Other"
    );
  }

  return String(
    link?.relationship ||
      "guardian"
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
};

const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const generateTemporaryPassword =
  () => {
    const uppercase =
      "ABCDEFGHJKLMNPQRSTUVWXYZ";

    const lowercase =
      "abcdefghijkmnopqrstuvwxyz";

    const numbers =
      "23456789";

    const symbols =
      "@#$%&*!";

    const allCharacters =
      `${uppercase}${lowercase}${numbers}${symbols}`;

    const randomCharacter = (
      source
    ) => {
      const randomValues =
        new Uint32Array(1);

      if (
        window.crypto?.getRandomValues
      ) {
        window.crypto.getRandomValues(
          randomValues
        );

        return source[
          randomValues[0] %
            source.length
        ];
      }

      return source[
        Math.floor(
          Math.random() *
            source.length
        )
      ];
    };

    const requiredCharacters = [
      randomCharacter(
        uppercase
      ),
      randomCharacter(
        lowercase
      ),
      randomCharacter(
        numbers
      ),
      randomCharacter(
        symbols
      )
    ];

    while (
      requiredCharacters.length <
      12
    ) {
      requiredCharacters.push(
        randomCharacter(
          allCharacters
        )
      );
    }

    return requiredCharacters
      .sort(
        () =>
          Math.random() -
          0.5
      )
      .join("");
  };

const DetailItem = ({
  icon: Icon,
  label,
  value
}) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
          <Icon size={17} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-semibold text-slate-700">
            {value ||
              "Not available"}
          </p>
        </div>
      </div>
    </div>
  );
};

const LoadingState = () => {
  return (
    <div className="space-y-5">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-100" />

      <div className="card animate-pulse p-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-slate-100" />

          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-slate-100" />
            <div className="h-3 w-64 max-w-full rounded bg-slate-100" />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({
            length: 8
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={index}
                className="h-24 rounded-xl bg-slate-100"
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

const PermissionToggle = ({
  permissionKey,
  checked,
  onChange,
  disabled = false
}) => {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition hover:border-brand-200 hover:bg-brand-50/30">
      <span className="text-sm font-medium text-slate-700">
        {PERMISSION_LABELS[
          permissionKey
        ] ||
          permissionKey}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
    </label>
  );
};

const UserDetails = () => {
  const {
    id
  } = useParams();

  const navigate =
    useNavigate();

  const {
    user: currentUser
  } = useAuth();

  const isSuperAdmin =
    currentUser?.role ===
    "super_admin";

  const canManage =
    [
      "super_admin",
      "principal"
    ].includes(
      currentUser?.role
    );

  const [
    user,
    setUser
  ] = useState(null);

  const [
    parentLinks,
    setParentLinks
  ] = useState([]);

  const [
    linkSummary,
    setLinkSummary
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
    parentLinksLoading,
    setParentLinksLoading
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading
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
    resetPasswordOpen,
    setResetPasswordOpen
  ] = useState(false);

  const [
    showPassword,
    setShowPassword
  ] = useState(false);

  const [
    resetPasswordForm,
    setResetPasswordForm
  ] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  const [
    statusModalOpen,
    setStatusModalOpen
  ] = useState(false);

  const [
    linkModalOpen,
    setLinkModalOpen
  ] = useState(false);

  const [
    editingLink,
    setEditingLink
  ] = useState(null);

  const [
    linkForm,
    setLinkForm
  ] = useState(
    createEmptyLinkForm
  );

  const [
    students,
    setStudents
  ] = useState([]);

  const [
    studentsLoading,
    setStudentsLoading
  ] = useState(false);

  const [
    studentSearch,
    setStudentSearch
  ] = useState("");

  const [
    unlinkTarget,
    setUnlinkTarget
  ] = useState(null);

  const isParent =
    user?.role ===
    "parent";

  const schoolId =
    user?.schoolId?._id ||
    user?.schoolId ||
    "";

  const activeLinks =
    useMemo(
      () =>
        parentLinks.filter(
          (link) =>
            !link?.isDeleted
        ),
      [
        parentLinks
      ]
    );

  const linkedStudentIds =
    useMemo(
      () =>
        new Set(
          activeLinks
            .map(
              (link) =>
                getRecordId(
                  getLinkStudent(
                    link
                  )
                )
            )
            .filter(
              Boolean
            )
        ),
      [
        activeLinks
      ]
    );

  const availableStudents =
    useMemo(
      () => {
        const normalizedSearch =
          studentSearch
            .trim()
            .toLowerCase();

        return students.filter(
          (student) => {
            const studentId =
              getRecordId(
                student
              );

            if (
              !editingLink &&
              linkedStudentIds.has(
                studentId
              )
            ) {
              return false;
            }

            if (
              !normalizedSearch
            ) {
              return true;
            }

            const searchableText = [
              getStudentName(
                student
              ),
              student.admissionNumber,
              student.fatherName,
              student.guardianName,
              getStudentClassName(
                student
              ),
              getStudentSectionName(
                student
              )
            ]
              .filter(
                Boolean
              )
              .join(" ")
              .toLowerCase();

            return searchableText.includes(
              normalizedSearch
            );
          }
        );
      },
      [
        editingLink,
        linkedStudentIds,
        studentSearch,
        students
      ]
    );

  const computedSummary =
    useMemo(
      () => ({
        totalLinks:
          activeLinks.length,

        activeLinks:
          activeLinks.filter(
            (link) =>
              (
                link.status ||
                "active"
              ) ===
              "active"
          ).length,

        verifiedLinks:
          activeLinks.filter(
            (link) =>
              (
                link.verificationStatus ||
                "verified"
              ) ===
              "verified"
          ).length,

        primaryLinks:
          activeLinks.filter(
            (link) =>
              link.isPrimary
          ).length
      }),
      [
        activeLinks
      ]
    );

  const summary =
    linkSummary ||
    computedSummary;

  const loadParentLinks =
    useCallback(
      async (
        parentUserId,
        {
          silent = false
        } = {}
      ) => {
        if (
          !parentUserId
        ) {
          return;
        }

        if (
          !silent
        ) {
          setParentLinksLoading(
            true
          );
        }

        try {
          const response =
            await getParentStudentLinksByParent(
              parentUserId
            );

          const payload =
            response.data?.data ||
            response.data ||
            {};

          setParentLinks(
            payload.links ||
              []
          );

          setLinkSummary(
            payload.summary ||
              null
          );
        } catch (
          requestError
        ) {
          setParentLinks([]);
          setLinkSummary(null);

          setError(
            getErrorMessage(
              requestError,
              "Linked students could not be loaded."
            )
          );
        } finally {
          setParentLinksLoading(
            false
          );
        }
      },
      []
    );

  const loadUser =
    useCallback(
      async ({
        silent = false
      } = {}) => {
        if (
          silent
        ) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError("");

        try {
          const response =
            await getUserById(
              id
            );

          const loadedUser =
            response.data?.user ||
            null;

          setUser(
            loadedUser
          );

          if (
            loadedUser?.role ===
            "parent"
          ) {
            await loadParentLinks(
              loadedUser._id ||
                loadedUser.id,
              {
                silent
              }
            );
          } else {
            setParentLinks([]);
            setLinkSummary(null);
          }
        } catch (
          requestError
        ) {
          setUser(null);
          setParentLinks([]);
          setLinkSummary(null);

          setError(
            getErrorMessage(
              requestError,
              "User details could not be loaded."
            )
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        id,
        loadParentLinks
      ]
    );

  useEffect(
    () => {
      loadUser();
    },
    [
      loadUser
    ]
  );

  useEffect(
    () => {
      if (
        !success
      ) {
        return undefined;
      }

      const timer =
        window.setTimeout(
          () => {
            setSuccess("");
          },
          4500
        );

      return () =>
        window.clearTimeout(
          timer
        );
    },
    [
      success
    ]
  );

  const loadStudents =
    async () => {
      if (
        !schoolId
      ) {
        setError(
          "Parent school information is missing."
        );

        return false;
      }

      setStudentsLoading(
        true
      );

      setError("");

      try {
        const params = {
          page: 1,
          limit: 100,
          status: "active"
        };

        if (
          isSuperAdmin
        ) {
          params.schoolId =
            schoolId;
        }

        const response =
          await api.get(
            "/students",
            {
              params
            }
          );

        setStudents(
          response.data?.students ||
            []
        );

        return true;
      } catch (
        requestError
      ) {
        setStudents([]);

        setError(
          getErrorMessage(
            requestError,
            "Students could not be loaded."
          )
        );

        return false;
      } finally {
        setStudentsLoading(
          false
        );
      }
    };

  const openCreateLinkModal =
    async () => {
      setEditingLink(null);
      setLinkForm(
        createEmptyLinkForm()
      );
      setStudentSearch("");
      setError("");
      setLinkModalOpen(true);

      await loadStudents();
    };

  const openEditLinkModal =
    async (
      link
    ) => {
      const student =
        getLinkStudent(
          link
        );

      setEditingLink(
        link
      );

      setLinkForm({
        studentId:
          getRecordId(
            student
          ),

        relationship:
          link.relationship ||
          "guardian",

        customRelationship:
          link.customRelationship ||
          "",

        isPrimary:
          Boolean(
            link.isPrimary
          ),

        isEmergencyContact:
          Boolean(
            link.isEmergencyContact
          ),

        canCollectStudent:
          Boolean(
            link.canCollectStudent
          ),

        accessPermissions: {
          ...DEFAULT_PARENT_PORTAL_PERMISSIONS,
          ...(
            link.accessPermissions ||
            {}
          )
        },

        notes:
          link.notes ||
          ""
      });

      setStudentSearch("");
      setError("");
      setLinkModalOpen(true);

      await loadStudents();
    };

  const closeLinkModal =
    () => {
      if (
        actionLoading
      ) {
        return;
      }

      setLinkModalOpen(
        false
      );

      setEditingLink(null);

      setLinkForm(
        createEmptyLinkForm()
      );

      setStudentSearch("");
    };

  const updateLinkField =
    (
      field
    ) =>
    (
      event
    ) => {
      const value =
        event.target.type ===
        "checkbox"
          ? event.target.checked
          : event.target.value;

      setLinkForm(
        (
          current
        ) => ({
          ...current,
          [field]:
            value
        })
      );
    };

  const updatePermission =
    (
      permissionKey
    ) =>
    (
      event
    ) => {
      const {
        checked
      } = event.target;

      setLinkForm(
        (
          current
        ) => ({
          ...current,

          accessPermissions: {
            ...current.accessPermissions,
            [permissionKey]:
              checked
          }
        })
      );
    };

  const handleSaveLink =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        !editingLink &&
        !linkForm.studentId
      ) {
        setError(
          "Please select a student."
        );

        return;
      }

      if (
        linkForm.relationship ===
          "other" &&
        !linkForm.customRelationship.trim()
      ) {
        setError(
          "Please enter the custom relationship."
        );

        return;
      }

      setActionLoading(
        true
      );

      setError("");

      try {
        const payload = {
          relationship:
            linkForm.relationship,

          customRelationship:
            linkForm.relationship ===
              "other"
              ? linkForm.customRelationship.trim()
              : "",

          isPrimary:
            linkForm.isPrimary,

          isEmergencyContact:
            linkForm.isEmergencyContact,

          canCollectStudent:
            linkForm.canCollectStudent,

          accessPermissions:
            linkForm.accessPermissions,

          notes:
            linkForm.notes.trim()
        };

        let message;

        if (
          editingLink
        ) {
          const linkId =
            getRecordId(
              editingLink
            );

          const response =
            await patchParentStudentLink(
              linkId,
              payload
            );

          message =
            response.data?.message ||
            "Parent–student link updated successfully.";
        } else {
          const response =
            await createParentStudentLink({
              ...payload,

              schoolId:
                isSuperAdmin
                  ? schoolId
                  : undefined,

              parentUserId:
                getRecordId(
                  user
                ),

              studentId:
                linkForm.studentId,

              verificationStatus:
                "verified",

              status:
                "active"
            });

          message =
            response.data?.message ||
            "Student linked with parent successfully.";
        }

        setSuccess(
          message
        );

        setLinkModalOpen(false);
        setEditingLink(null);
        setLinkForm(
          createEmptyLinkForm()
        );
        setStudentSearch("");

        await loadParentLinks(
          getRecordId(
            user
          ),
          {
            silent: true
          }
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            "Parent–student link could not be saved."
          )
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const handleUnlink =
    async () => {
      if (
        !unlinkTarget
      ) {
        return;
      }

      setActionLoading(
        true
      );

      setError("");

      try {
        const response =
          await deleteParentStudentLink(
            getRecordId(
              unlinkTarget
            ),
            "Removed from User Details page"
          );

        setSuccess(
          response.data?.message ||
          "Parent unlinked from student successfully."
        );

        setUnlinkTarget(
          null
        );

        await loadParentLinks(
          getRecordId(
            user
          ),
          {
            silent: true
          }
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            "Student could not be unlinked."
          )
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const openResetPasswordModal =
    () => {
      const generatedPassword =
        generateTemporaryPassword();

      setResetPasswordForm({
        newPassword:
          generatedPassword,

        confirmPassword:
          generatedPassword
      });

      setShowPassword(
        true
      );

      setError("");

      setResetPasswordOpen(
        true
      );
    };

  const closeResetPasswordModal =
    () => {
      if (
        actionLoading
      ) {
        return;
      }

      setResetPasswordOpen(
        false
      );

      setShowPassword(
        false
      );

      setResetPasswordForm({
        newPassword: "",
        confirmPassword: ""
      });
    };

  const handleResetPassword =
    async (
      event
    ) => {
      event.preventDefault();

      const newPassword =
        resetPasswordForm.newPassword;

      if (
        newPassword.length <
        8
      ) {
        setError(
          "Password must contain at least 8 characters."
        );

        return;
      }

      if (
        newPassword !==
        resetPasswordForm.confirmPassword
      ) {
        setError(
          "Password confirmation does not match."
        );

        return;
      }

      setActionLoading(
        true
      );

      setError("");

      try {
        const response =
          await resetUserPassword(
            getRecordId(
              user
            ),
            newPassword
          );

        setSuccess(
          response.data?.message ||
          "Password reset successfully."
        );

        setUser(
          (
            current
          ) =>
            current
              ? {
                  ...current,
                  mustChangePassword:
                    true
                }
              : current
        );

        setResetPasswordOpen(false);
        setShowPassword(false);
        setResetPasswordForm({
          newPassword: "",
          confirmPassword: ""
        });
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            "Password could not be reset."
          )
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const handleStatusChange =
    async () => {
      if (
        !user
      ) {
        return;
      }

      const nextStatus =
        !user.isActive;

      setActionLoading(
        true
      );

      setError("");

      try {
        const response =
          await updateUserStatus(
            getRecordId(
              user
            ),
            nextStatus
          );

        setUser(
          (
            current
          ) => ({
            ...current,
            ...(
              response.data?.user ||
              {}
            ),
            isActive:
              nextStatus
          })
        );

        setSuccess(
          response.data?.message ||
          (
            nextStatus
              ? "User activated successfully."
              : "User deactivated successfully."
          )
        );

        setStatusModalOpen(
          false
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
            "Account status could not be updated."
          )
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  if (
    loading
  ) {
    return (
      <LoadingState />
    );
  }

  if (
    !user
  ) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="btn-ghost"
          onClick={
            () =>
              navigate(
                "/users"
              )
          }
        >
          <ArrowLeft size={16} />
          Back to Users
        </button>

        <div className="card p-8 text-center">
          <XCircle
            size={34}
            className="mx-auto text-rose-400"
          />

          <h1 className="mt-3 text-lg font-semibold text-slate-800">
            User details unavailable
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error ||
              "The requested user account could not be found."}
          </p>

          <button
            type="button"
            className="btn-primary mt-5"
            onClick={
              () =>
                loadUser()
            }
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="User Details"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={
                () =>
                  navigate(
                    "/users"
                  )
              }
            >
              <ArrowLeft size={16} />
              Users
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={
                () =>
                  loadUser({
                    silent:
                      true
                  })
              }
              disabled={
                refreshing ||
                actionLoading
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

            {canManage && (
              <button
                type="button"
                className="btn-secondary"
                onClick={
                  openResetPasswordModal
                }
                disabled={
                  actionLoading
                }
              >
                <KeyRound size={16} />
                Reset Password
              </button>
            )}

            {canManage && (
              <button
                type="button"
                className={
                  user.isActive
                    ? "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    : "btn-primary"
                }
                onClick={
                  () =>
                    setStatusModalOpen(
                      true
                    )
                }
                disabled={
                  actionLoading
                }
              >
                {user.isActive ? (
                  <ShieldOff size={16} />
                ) : (
                  <ShieldCheck size={16} />
                )}

                {user.isActive
                  ? "Deactivate"
                  : "Activate"}
              </button>
            )}
          </div>
        }
      />

      {success && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>
            {success}
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>
            {error}
          </span>

          <button
            type="button"
            className="shrink-0 font-semibold hover:text-rose-900"
            onClick={
              () =>
                setError("")
            }
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-br from-brand-50/70 via-white to-slate-50 p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 text-xl font-bold text-brand-700 shadow-sm">
              {user.photo ? (
                <img
                  src={user.photo}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(
                  user.name
                )
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold text-slate-800">
                  {user.name}
                </h2>

                <Badge
                  tone={
                    ROLE_TONES[
                      user.role
                    ] ||
                    "neutral"
                  }
                >
                  {ROLE_LABELS[
                    user.role
                  ] ||
                    user.role}
                </Badge>

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

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Mail size={15} />
                  {user.email}
                </span>

                <span className="flex items-center gap-1.5">
                  <Building2 size={15} />
                  {user.schoolId
                    ?.schoolName ||
                    "System Account"}
                </span>
              </div>

              {user.mustChangePassword && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  <ShieldCheck size={15} />
                  Password change required at next login
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailItem
              icon={UserRound}
              label="Full Name"
              value={
                user.name
              }
            />

            <DetailItem
              icon={Mail}
              label="Email Address"
              value={
                user.email
              }
            />

            <DetailItem
              icon={Phone}
              label="Phone Number"
              value={
                user.phone
              }
            />

            <DetailItem
              icon={MapPin}
              label="Address"
              value={
                user.address
              }
            />

            <DetailItem
              icon={Building2}
              label="School"
              value={
                user.schoolId
                  ?.schoolName ||
                "System"
              }
            />

            <DetailItem
              icon={BadgeCheck}
              label="Account Role"
              value={
                ROLE_LABELS[
                  user.role
                ] ||
                user.role
              }
            />

            <DetailItem
              icon={Clock3}
              label="Last Login"
              value={
                formatDate(
                  user.lastLoginAt,
                  true
                )
              }
            />

            <DetailItem
              icon={CalendarDays}
              label="Account Created"
              value={
                formatDate(
                  user.createdAt
                )
              }
            />
          </div>
        </div>
      </section>

      {isParent && (
        <section className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Linked Children
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-800">
                    {summary.totalLinks ??
                      activeLinks.length}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <UsersRound size={21} />
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Active Links
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-800">
                    {summary.activeLinks ??
                      computedSummary.activeLinks}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Link2 size={21} />
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Verified Links
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-800">
                    {summary.verifiedLinks ??
                      computedSummary.verifiedLinks}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <BadgeCheck size={21} />
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Primary Guardian
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-800">
                    {summary.primaryLinks ??
                      computedSummary.primaryLinks}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ShieldCheck size={21} />
                </div>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  Parent Details and Linked Students
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Manage this parent&apos;s children, relationship and portal access.
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={
                    openCreateLinkModal
                  }
                  disabled={
                    actionLoading
                  }
                >
                  <Plus size={16} />
                  Link Student
                </button>
              )}
            </div>

            {parentLinksLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({
                  length: 3
                }).map(
                  (
                    _,
                    index
                  ) => (
                    <div
                      key={index}
                      className="h-32 animate-pulse rounded-xl bg-slate-100"
                    />
                  )
                )}
              </div>
            ) : activeLinks.length ===
              0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                <UsersRound
                  size={36}
                  className="text-slate-300"
                  strokeWidth={1.5}
                />

                <h3 className="mt-3 text-sm font-semibold text-slate-700">
                  No student linked
                </h3>

                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Link at least one student so this parent can view attendance, fees, timetable and academic progress.
                </p>

                {canManage && (
                  <button
                    type="button"
                    className="btn-primary mt-5"
                    onClick={
                      openCreateLinkModal
                    }
                  >
                    <Plus size={16} />
                    Link First Student
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
                {activeLinks.map(
                  (
                    link
                  ) => {
                    const student =
                      getLinkStudent(
                        link
                      );

                    const linkId =
                      getRecordId(
                        link
                      );

                    const studentName =
                      getStudentName(
                        student
                      );

                    const permissions =
                      {
                        ...DEFAULT_PARENT_PORTAL_PERMISSIONS,
                        ...(
                          link.accessPermissions ||
                          {}
                        )
                      };

                    const enabledPermissions =
                      Object.values(
                        permissions
                      ).filter(
                        Boolean
                      ).length;

                    return (
                      <article
                        key={
                          linkId
                        }
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 font-bold text-brand-700">
                            {student
                              ?.studentPhoto ||
                            student
                              ?.photo ? (
                              <img
                                src={
                                  student.studentPhoto ||
                                  student.photo
                                }
                                alt={
                                  studentName
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(
                                studentName
                              )
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-semibold text-slate-800">
                                {studentName}
                              </h3>

                              {link.isPrimary && (
                                <Badge tone="warning">
                                  Primary
                                </Badge>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {student
                                ?.admissionNumber ||
                                "No admission number"}
                            </p>
                          </div>

                          <ChevronRight
                            size={18}
                            className="mt-1 shrink-0 text-slate-300"
                          />
                        </div>

                        <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                          <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <span className="block text-slate-400">
                              Class
                            </span>

                            <span className="mt-0.5 block font-semibold text-slate-700">
                              {getStudentClassName(
                                student
                              )}
                            </span>
                          </div>

                          <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <span className="block text-slate-400">
                              Section
                            </span>

                            <span className="mt-0.5 block font-semibold text-slate-700">
                              {getStudentSectionName(
                                student
                              )}
                            </span>
                          </div>

                          <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <span className="block text-slate-400">
                              Relationship
                            </span>

                            <span className="mt-0.5 block font-semibold text-slate-700">
                              {getRelationshipLabel(
                                link
                              )}
                            </span>
                          </div>

                          <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <span className="block text-slate-400">
                              Portal Access
                            </span>

                            <span className="mt-0.5 block font-semibold text-slate-700">
                              {enabledPermissions} permissions
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge
                            tone={
                              LINK_STATUS_TONES[
                                link.status ||
                                  "active"
                              ] ||
                              "neutral"
                            }
                          >
                            {(link.status ||
                              "active"
                            )
                              .replaceAll(
                                "_",
                                " "
                              )
                              .replace(
                                /\b\w/g,
                                (
                                  character
                                ) =>
                                  character.toUpperCase()
                              )}
                          </Badge>

                          <Badge
                            tone={
                              VERIFICATION_TONES[
                                link.verificationStatus ||
                                  "verified"
                              ] ||
                              "neutral"
                            }
                          >
                            {(link.verificationStatus ||
                              "verified"
                            )
                              .replaceAll(
                                "_",
                                " "
                              )
                              .replace(
                                /\b\w/g,
                                (
                                  character
                                ) =>
                                  character.toUpperCase()
                              )}
                          </Badge>

                          {link.isEmergencyContact && (
                            <Badge tone="danger">
                              Emergency Contact
                            </Badge>
                          )}

                          {link.canCollectStudent && (
                            <Badge tone="info">
                              Collection Allowed
                            </Badge>
                          )}
                        </div>

                        {canManage && (
                          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={
                                () =>
                                  openEditLinkModal(
                                    link
                                  )
                              }
                              disabled={
                                actionLoading
                              }
                            >
                              <BookOpenCheck size={15} />
                              Edit Access
                            </button>

                            <button
                              type="button"
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={
                                () =>
                                  setUnlinkTarget(
                                    link
                                  )
                              }
                              disabled={
                                actionLoading
                              }
                            >
                              <Trash2 size={15} />
                              Unlink
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="card mt-5 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-slate-800">
          Account Activity
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem
            icon={UserRound}
            label="Created By"
            value={
              user.createdBy
                ?.name ||
              "Not available"
            }
          />

          <DetailItem
            icon={UserRound}
            label="Last Updated By"
            value={
              user.updatedBy
                ?.name ||
              "Not available"
            }
          />

          <DetailItem
            icon={CalendarDays}
            label="Last Updated"
            value={
              formatDate(
                user.updatedAt,
                true
              )
            }
          />

          <DetailItem
            icon={KeyRound}
            label="Password Status"
            value={
              user.mustChangePassword
                ? "Change required"
                : "Up to date"
            }
          />
        </div>
      </section>

      <Modal
        open={
          resetPasswordOpen
        }
        onClose={
          closeResetPasswordModal
        }
        title="Reset User Password"
        width="max-w-xl"
      >
        <form
          onSubmit={
            handleResetPassword
          }
          className="space-y-4"
        >
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0"
              />

              <p>
                Active sessions will be revoked and the user will be required to change this temporary password after login.
              </p>
            </div>
          </div>

          <div>
            <label
              className="field-label"
              htmlFor="reset-user-password"
            >
              New Temporary Password
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <input
                  id="reset-user-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  className="field-input pr-11"
                  value={
                    resetPasswordForm.newPassword
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setResetPasswordForm(
                        (
                          current
                        ) => ({
                          ...current,
                          newPassword:
                            event.target.value
                        })
                      )
                  }
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                />

                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  onClick={
                    () =>
                      setShowPassword(
                        (
                          current
                        ) =>
                          !current
                      )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>

              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={
                  () => {
                    const generatedPassword =
                      generateTemporaryPassword();

                    setResetPasswordForm({
                      newPassword:
                        generatedPassword,

                      confirmPassword:
                        generatedPassword
                    });

                    setShowPassword(
                      true
                    );
                  }
                }
              >
                <WandSparkles size={16} />
                Generate
              </button>
            </div>
          </div>

          <div>
            <label
              className="field-label"
              htmlFor="confirm-reset-user-password"
            >
              Confirm Password
            </label>

            <input
              id="confirm-reset-user-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              className="field-input"
              value={
                resetPasswordForm.confirmPassword
              }
              onChange={
                (
                  event
                ) =>
                  setResetPasswordForm(
                    (
                      current
                    ) => ({
                      ...current,
                      confirmPassword:
                        event.target.value
                    })
                  )
              }
              minLength={8}
              required
              autoComplete="new-password"
              placeholder="Enter password again"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={
                closeResetPasswordModal
              }
              disabled={
                actionLoading
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={
                actionLoading
              }
            >
              {actionLoading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <KeyRound size={16} />
              )}

              Reset Password
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={
          statusModalOpen
        }
        onClose={
          () => {
            if (
              !actionLoading
            ) {
              setStatusModalOpen(
                false
              );
            }
          }
        }
        title={
          user.isActive
            ? "Deactivate User Account"
            : "Activate User Account"
        }
        width="max-w-lg"
      >
        <div className="space-y-4">
          <div
            className={`rounded-xl border p-4 ${
              user.isActive
                ? "border-rose-100 bg-rose-50 text-rose-800"
                : "border-emerald-100 bg-emerald-50 text-emerald-800"
            }`}
          >
            <div className="flex items-start gap-3">
              {user.isActive ? (
                <ShieldOff
                  size={21}
                  className="mt-0.5 shrink-0"
                />
              ) : (
                <ShieldCheck
                  size={21}
                  className="mt-0.5 shrink-0"
                />
              )}

              <div>
                <h3 className="text-sm font-semibold">
                  {user.isActive
                    ? "This user will lose portal access."
                    : "This user will regain portal access."}
                </h3>

                <p className="mt-1 text-sm opacity-90">
                  {user.isActive
                    ? "Current login sessions will be revoked after deactivation."
                    : "The account can sign in again after activation."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={
                () =>
                  setStatusModalOpen(
                    false
                  )
              }
              disabled={
                actionLoading
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className={
                user.isActive
                  ? "inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  : "btn-primary"
              }
              onClick={
                handleStatusChange
              }
              disabled={
                actionLoading
              }
            >
              {actionLoading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : user.isActive ? (
                <ShieldOff size={16} />
              ) : (
                <ShieldCheck size={16} />
              )}

              {user.isActive
                ? "Deactivate Account"
                : "Activate Account"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={
          linkModalOpen
        }
        onClose={
          closeLinkModal
        }
        title={
          editingLink
            ? "Edit Parent–Student Link"
            : "Link Student with Parent"
        }
        width="max-w-3xl"
      >
        <form
          onSubmit={
            handleSaveLink
          }
          className="space-y-5"
        >
          {!editingLink && (
            <div>
              <label
                className="field-label"
                htmlFor="linked-student-search"
              >
                Select Student
              </label>

              <input
                id="linked-student-search"
                className="field-input"
                value={
                  studentSearch
                }
                onChange={
                  (
                    event
                  ) =>
                    setStudentSearch(
                      event.target.value
                    )
                }
                placeholder="Search student name, admission number or class"
              />

              <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                {studentsLoading ? (
                  <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500">
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Loading students...
                  </div>
                ) : availableStudents.length ===
                  0 ? (
                  <div className="flex min-h-32 flex-col items-center justify-center px-4 text-center">
                    <GraduationCap
                      size={27}
                      className="text-slate-300"
                    />

                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      No available student found
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      The student may already be linked with this parent.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {availableStudents.map(
                      (
                        student
                      ) => {
                        const studentId =
                          getRecordId(
                            student
                          );

                        const selected =
                          linkForm.studentId ===
                          studentId;

                        return (
                          <button
                            key={
                              studentId
                            }
                            type="button"
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                              selected
                                ? "bg-brand-50"
                                : "hover:bg-slate-50"
                            }`}
                            onClick={
                              () =>
                                setLinkForm(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    studentId
                                  })
                                )
                            }
                          >
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                              selected
                                ? "bg-brand-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {getInitials(
                                getStudentName(
                                  student
                                )
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {getStudentName(
                                  student
                                )}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {student.admissionNumber ||
                                  "No admission number"}{" "}
                                ·{" "}
                                {getStudentClassName(
                                  student
                                )}{" "}
                                ·{" "}
                                {getStudentSectionName(
                                  student
                                )}
                              </p>
                            </div>

                            {selected && (
                              <Check
                                size={18}
                                className="shrink-0 text-brand-600"
                              />
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {editingLink && (
            <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-500">
                Linked Student
              </p>

              <p className="mt-1 font-semibold text-brand-800">
                {getStudentName(
                  getLinkStudent(
                    editingLink
                  )
                )}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="field-label"
                htmlFor="parent-student-relationship"
              >
                Relationship
              </label>

              <select
                id="parent-student-relationship"
                className="field-select"
                value={
                  linkForm.relationship
                }
                onChange={
                  updateLinkField(
                    "relationship"
                  )
                }
                required
              >
                {PARENT_RELATIONSHIP_OPTIONS.map(
                  (
                    option
                  ) => (
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

            {linkForm.relationship ===
              "other" && (
              <div>
                <label
                  className="field-label"
                  htmlFor="custom-parent-relationship"
                >
                  Custom Relationship
                </label>

                <input
                  id="custom-parent-relationship"
                  className="field-input"
                  value={
                    linkForm.customRelationship
                  }
                  onChange={
                    updateLinkField(
                      "customRelationship"
                    )
                  }
                  placeholder="Enter relationship"
                  required
                />
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <span className="block text-sm font-semibold text-slate-700">
                  Primary Guardian
                </span>

                <span className="mt-0.5 block text-xs text-slate-400">
                  Main contact for student
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  linkForm.isPrimary
                }
                onChange={
                  updateLinkField(
                    "isPrimary"
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <span className="block text-sm font-semibold text-slate-700">
                  Emergency Contact
                </span>

                <span className="mt-0.5 block text-xs text-slate-400">
                  Contact in emergency
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  linkForm.isEmergencyContact
                }
                onChange={
                  updateLinkField(
                    "isEmergencyContact"
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <span className="block text-sm font-semibold text-slate-700">
                  Collection Permission
                </span>

                <span className="mt-0.5 block text-xs text-slate-400">
                  May collect student
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  linkForm.canCollectStudent
                }
                onChange={
                  updateLinkField(
                    "canCollectStudent"
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Parent Portal Permissions
                </h3>

                <p className="mt-0.5 text-xs text-slate-500">
                  Select which information this parent can view for the student.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={
                    () =>
                      setLinkForm(
                        (
                          current
                        ) => ({
                          ...current,

                          accessPermissions:
                            Object.fromEntries(
                              Object.keys(
                                DEFAULT_PARENT_PORTAL_PERMISSIONS
                              ).map(
                                (
                                  key
                                ) => [
                                  key,
                                  true
                                ]
                              )
                            )
                        })
                      )
                  }
                >
                  Select All
                </button>

                <button
                  type="button"
                  className="btn-ghost"
                  onClick={
                    () =>
                      setLinkForm(
                        (
                          current
                        ) => ({
                          ...current,

                          accessPermissions:
                            Object.fromEntries(
                              Object.keys(
                                DEFAULT_PARENT_PORTAL_PERMISSIONS
                              ).map(
                                (
                                  key
                                ) => [
                                  key,
                                  false
                                ]
                              )
                            )
                        })
                      )
                  }
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {Object.keys(
                DEFAULT_PARENT_PORTAL_PERMISSIONS
              ).map(
                (
                  permissionKey
                ) => (
                  <PermissionToggle
                    key={
                      permissionKey
                    }
                    permissionKey={
                      permissionKey
                    }
                    checked={
                      Boolean(
                        linkForm.accessPermissions[
                          permissionKey
                        ]
                      )
                    }
                    onChange={
                      updatePermission(
                        permissionKey
                      )
                    }
                    disabled={
                      actionLoading
                    }
                  />
                )
              )}
            </div>
          </div>

          <div>
            <label
              className="field-label"
              htmlFor="parent-student-link-notes"
            >
              Notes
            </label>

            <textarea
              id="parent-student-link-notes"
              className="field-input min-h-24 resize-y"
              value={
                linkForm.notes
              }
              onChange={
                updateLinkField(
                  "notes"
                )
              }
              placeholder="Optional administrative notes"
              maxLength={500}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={
                closeLinkModal
              }
              disabled={
                actionLoading
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={
                actionLoading ||
                studentsLoading ||
                (
                  !editingLink &&
                  !linkForm.studentId
                )
              }
            >
              {actionLoading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Link2 size={16} />
              )}

              {editingLink
                ? "Save Changes"
                : "Link Student"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={
          Boolean(
            unlinkTarget
          )
        }
        onClose={
          () => {
            if (
              !actionLoading
            ) {
              setUnlinkTarget(
                null
              );
            }
          }
        }
        title="Unlink Student"
        width="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-rose-800">
            <div className="flex items-start gap-3">
              <Trash2
                size={20}
                className="mt-0.5 shrink-0"
              />

              <div>
                <h3 className="text-sm font-semibold">
                  Remove parent access for{" "}
                  {getStudentName(
                    getLinkStudent(
                      unlinkTarget
                    )
                  )}
                  ?
                </h3>

                <p className="mt-1 text-sm">
                  The parent will no longer see this student in the Parent Portal. The link can be restored later from the backend records.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={
                () =>
                  setUnlinkTarget(
                    null
                  )
              }
              disabled={
                actionLoading
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={
                handleUnlink
              }
              disabled={
                actionLoading
              }
            >
              {actionLoading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Trash2 size={16} />
              )}

              Unlink Student
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserDetails;
