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
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Power,
  ShieldCheck,
  UserRound,
  WandSparkles
} from "lucide-react";

import {
  getUserById,
  resetUserPassword,
  updateUser,
  updateUserStatus
} from "../../api/users";

import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";

const roleLabels = {
  super_admin: "Super Admin",
  principal: "Principal",
  teacher: "Teacher",
  accountant: "Accountant",
  student: "Student",
  parent: "Parent"
};

const roleTones = {
  super_admin: "info",
  principal: "warning",
  teacher: "success",
  accountant: "neutral",
  student: "info",
  parent: "neutral"
};

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

const getInitials = (name = "") => {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
};

const randomCharacter = (characters) => {
  const random = new Uint32Array(1);

  window.crypto.getRandomValues(
    random
  );

  return characters[
    random[0] %
      characters.length
  ];
};

const generateTemporaryPassword = () => {
  const upper =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const lower =
    "abcdefghijkmnopqrstuvwxyz";

  const numbers = "23456789";
  const symbols = "@#$!";

  const pool = `${upper}${lower}${numbers}${symbols}`;

  const characters = [
    randomCharacter(upper),
    randomCharacter(lower),
    randomCharacter(numbers),
    randomCharacter(symbols)
  ];

  while (characters.length < 12) {
    characters.push(
      randomCharacter(pool)
    );
  }

  return characters
    .map((character) => {
      const random =
        new Uint32Array(1);

      window.crypto.getRandomValues(
        random
      );

      return {
        character,
        sort: random[0]
      };
    })
    .sort((a, b) => {
      return a.sort - b.sort;
    })
    .map((item) => {
      return item.character;
    })
    .join("");
};

const DetailItem = ({
  icon: Icon,
  label,
  value
}) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
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

const UserDetailsLoading = () => {
  return (
    <div className="space-y-5">
      <div className="card animate-pulse p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-100" />

          <div className="space-y-2">
            <div className="h-4 w-48 rounded bg-slate-100" />
            <div className="h-3 w-64 max-w-full rounded bg-slate-100" />
          </div>
        </div>
      </div>

      <div className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({
          length: 6
        }).map((_, index) => (
          <div
            key={index}
            className="h-24 rounded-xl bg-slate-100"
          />
        ))}
      </div>
    </div>
  );
};

const UserDetails = () => {
  const {
    id
  } = useParams();

  const navigate = useNavigate();

  const {
    user: currentUser
  } = useAuth();

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    actionLoading,
    setActionLoading
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [editOpen, setEditOpen] =
    useState(false);

  const [
    passwordOpen,
    setPasswordOpen
  ] = useState(false);

  const [
    statusOpen,
    setStatusOpen
  ] = useState(false);

  const [editForm, setEditForm] =
    useState({
      name: "",
      email: "",
      phone: "",
      address: "",
      photo: ""
    });

  const [
    newPassword,
    setNewPassword
  ] = useState("");

  const [
    showPassword,
    setShowPassword
  ] = useState(false);

  const isOwnAccount = useMemo(() => {
    const currentUserId =
      currentUser?._id ||
      currentUser?.id;

    return (
      String(currentUserId || "") ===
      String(user?._id || "")
    );
  }, [
    currentUser,
    user
  ]);

  const loadUser = async ({
    silent = false
  } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const {
        data
      } = await getUserById(id);

      setUser(
        data?.user || null
      );
    } catch (requestError) {
      setUser(null);

      setError(
        requestError.response?.data
          ?.message ||
          "User details could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        setSuccess("");
      }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [success]);

  const openEditModal = () => {
    setEditForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
      photo: user?.photo || ""
    });

    setError("");
    setEditOpen(true);
  };

  const updateEditField = (
    field
  ) => {
    return (event) => {
      setEditForm((current) => ({
        ...current,
        [field]:
          event.target.value
      }));
    };
  };

  const handleUpdateUser = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    const payload = {
      name:
        editForm.name.trim(),

      email:
        editForm.email
          .trim()
          .toLowerCase(),

      phone:
        editForm.phone.trim(),

      address:
        editForm.address.trim(),

      photo:
        editForm.photo.trim()
    };

    if (payload.name.length < 2) {
      setError(
        "Name must contain at least 2 characters."
      );

      return;
    }

    if (!payload.email) {
      setError(
        "Email is required."
      );

      return;
    }

    setActionLoading(true);

    try {
      const {
        data
      } = await updateUser(
        user._id,
        payload
      );

      setUser((current) => ({
        ...current,
        ...(
          data?.user ||
          payload
        )
      }));

      setEditOpen(false);

      setSuccess(
        data?.message ||
          "User updated successfully."
      );
    } catch (requestError) {
      setError(
        requestError.response?.data
          ?.message ||
          "User could not be updated."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange =
    async () => {
      if (
        !user ||
        isOwnAccount
      ) {
        return;
      }

      setActionLoading(true);
      setError("");

      try {
        const nextStatus =
          !user.isActive;

        const {
          data
        } =
          await updateUserStatus(
            user._id,
            nextStatus
          );

        setUser((current) => ({
          ...current,

          isActive:
            data?.user?.isActive ??
            nextStatus
        }));

        setStatusOpen(false);

        setSuccess(
          data?.message ||
            (
              nextStatus
                ? "User activated successfully."
                : "User deactivated successfully."
            )
        );
      } catch (requestError) {
        setError(
          requestError.response
            ?.data?.message ||
            "User status could not be changed."
        );
      } finally {
        setActionLoading(false);
      }
    };

  const openPasswordModal = () => {
    setNewPassword("");
    setShowPassword(false);
    setError("");
    setPasswordOpen(true);
  };

  const handlePasswordReset =
    async (event) => {
      event.preventDefault();

      setError("");

      if (
        newPassword.length < 8
      ) {
        setError(
          "New password must contain at least 8 characters."
        );

        return;
      }

      setActionLoading(true);

      try {
        const {
          data
        } =
          await resetUserPassword(
            user._id,
            newPassword
          );

        setUser((current) => ({
          ...current,
          mustChangePassword: true
        }));

        setPasswordOpen(false);
        setNewPassword("");

        setSuccess(
          data?.message ||
            "Password reset successfully."
        );
      } catch (requestError) {
        setError(
          requestError.response
            ?.data?.message ||
            "Password could not be reset."
        );
      } finally {
        setActionLoading(false);
      }
    };

  const closeEditModal = () => {
    if (actionLoading) {
      return;
    }

    setEditOpen(false);
    setError("");
  };

  const closePasswordModal = () => {
    if (actionLoading) {
      return;
    }

    setPasswordOpen(false);
    setError("");
  };

  const closeStatusModal = () => {
    if (actionLoading) {
      return;
    }

    setStatusOpen(false);
    setError("");
  };

  return (
    <div>
      <PageHeader
        title="User Details"
        action={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              navigate("/users");
            }}
          >
            <ArrowLeft size={16} />
            Back to Users
          </button>
        }
      />

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {error &&
        !editOpen &&
        !passwordOpen &&
        !statusOpen && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{error}</span>

            <button
              type="button"
              className="font-semibold"
              onClick={() => {
                loadUser();
              }}
            >
              Retry
            </button>
          </div>
        )}

      {loading ? (
        <UserDetailsLoading />
      ) : !user ? (
        <div className="card flex min-h-64 flex-col items-center justify-center p-6 text-center">
          <UserRound
            size={34}
            className="text-slate-300"
            strokeWidth={1.5}
          />

          <h2 className="mt-3 font-semibold text-slate-700">
            User not found
          </h2>

          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={() => {
              navigate("/users");
            }}
          >
            Back to Users
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-700">
                  {getInitials(
                    user.name
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-bold text-slate-900">
                      {user.name}
                    </h1>

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

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {user.email}
                  </p>

                  <div className="mt-2">
                    <Badge
                      tone={
                        roleTones[
                          user.role
                        ] || "neutral"
                      }
                    >
                      {roleLabels[
                        user.role
                      ] || user.role}
                    </Badge>
                  </div>
                </div>
              </div>

              {user.role !==
                "super_admin" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={
                      openEditModal
                    }
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>

                  {!isOwnAccount && (
                    <>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={
                          openPasswordModal
                        }
                      >
                        <KeyRound
                          size={16}
                        />
                        Reset Password
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setStatusOpen(
                            true
                          );
                        }}
                        className={
                          user.isActive
                            ? "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                            : "btn-primary"
                        }
                      >
                        <Power
                          size={16}
                        />

                        {user.isActive
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              Account Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                icon={Mail}
                label="Email Address"
                value={user.email}
              />

              <DetailItem
                icon={Phone}
                label="Phone"
                value={user.phone}
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
                icon={ShieldCheck}
                label="Role"
                value={
                  roleLabels[
                    user.role
                  ] || user.role
                }
              />

              <DetailItem
                icon={MapPin}
                label="Address"
                value={user.address}
              />

              <DetailItem
                icon={KeyRound}
                label="Password Status"
                value={
                  user.mustChangePassword
                    ? "Password change required"
                    : "Password verified"
                }
              />
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
              System Activity
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailItem
                icon={CalendarDays}
                label="Last Login"
                value={formatDate(
                  user.lastLoginAt ||
                    user.lastLogin
                )}
              />

              <DetailItem
                icon={CalendarDays}
                label="Created At"
                value={formatDate(
                  user.createdAt
                )}
              />

              <DetailItem
                icon={CalendarDays}
                label="Updated At"
                value={formatDate(
                  user.updatedAt
                )}
              />

              <DetailItem
                icon={UserRound}
                label="Created By"
                value={
                  user.createdBy?.name
                }
              />

              <DetailItem
                icon={UserRound}
                label="Updated By"
                value={
                  user.updatedBy?.name
                }
              />

              <DetailItem
                icon={ShieldCheck}
                label="Account Status"
                value={
                  user.isActive
                    ? "Active"
                    : "Inactive"
                }
              />
            </div>
          </section>
        </div>
      )}

      <Modal
        open={editOpen}
        onClose={closeEditModal}
        title="Edit User"
        width="max-w-2xl"
      >
        <form
          onSubmit={
            handleUpdateUser
          }
          className="space-y-5"
          noValidate
        >
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-user-name"
                className="field-label"
              >
                Full Name
              </label>

              <input
                id="edit-user-name"
                autoFocus
                required
                className="field-input"
                value={
                  editForm.name
                }
                onChange={updateEditField(
                  "name"
                )}
                maxLength={100}
              />
            </div>

            <div>
              <label
                htmlFor="edit-user-email"
                className="field-label"
              >
                Email Address
              </label>

              <input
                id="edit-user-email"
                type="email"
                required
                className="field-input"
                value={
                  editForm.email
                }
                onChange={updateEditField(
                  "email"
                )}
                maxLength={150}
              />
            </div>

            <div>
              <label
                htmlFor="edit-user-phone"
                className="field-label"
              >
                Phone
              </label>

              <input
                id="edit-user-phone"
                type="tel"
                className="field-input"
                value={
                  editForm.phone
                }
                onChange={updateEditField(
                  "phone"
                )}
                maxLength={30}
              />
            </div>

            <div>
              <label
                htmlFor="edit-user-photo"
                className="field-label"
              >
                Photo URL
              </label>

              <input
                id="edit-user-photo"
                type="url"
                className="field-input"
                value={
                  editForm.photo
                }
                onChange={updateEditField(
                  "photo"
                )}
                placeholder="https://..."
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="edit-user-address"
                className="field-label"
              >
                Address
              </label>

              <textarea
                id="edit-user-address"
                className="field-input min-h-24 resize-y"
                value={
                  editForm.address
                }
                onChange={updateEditField(
                  "address"
                )}
                maxLength={500}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={
                actionLoading
              }
              onClick={
                closeEditModal
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
              {actionLoading && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {actionLoading
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={passwordOpen}
        onClose={
          closePasswordModal
        }
        title="Reset Password"
        width="max-w-lg"
      >
        <form
          onSubmit={
            handlePasswordReset
          }
          className="space-y-5"
          noValidate
        >
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="new-user-password"
              className="field-label"
            >
              New Temporary Password
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <input
                  id="new-user-password"
                  autoFocus
                  required
                  minLength={8}
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  className="field-input pr-11"
                  value={
                    newPassword
                  }
                  onChange={(event) => {
                    setNewPassword(
                      event.target.value
                    );
                  }}
                />

                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                  onClick={() => {
                    setShowPassword(
                      (current) =>
                        !current
                    );
                  }}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff
                      size={17}
                    />
                  ) : (
                    <Eye
                      size={17}
                    />
                  )}
                </button>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setNewPassword(
                    generateTemporaryPassword()
                  );

                  setShowPassword(
                    true
                  );
                }}
              >
                <WandSparkles
                  size={16}
                />
                Generate
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            All active login sessions will be revoked. The user must
            change this password after the next login.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={
                actionLoading
              }
              onClick={
                closePasswordModal
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
              {actionLoading && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {actionLoading
                ? "Resetting..."
                : "Reset Password"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={statusOpen}
        onClose={
          closeStatusModal
        }
        title={
          user?.isActive
            ? "Deactivate User"
            : "Activate User"
        }
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
            to{" "}
            <strong>
              {user?.isActive
                ? "deactivate"
                : "activate"}
            </strong>{" "}
            <strong>
              {user?.name}
            </strong>
            ?
          </p>

          {user?.isActive && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Deactivation will revoke the user&apos;s active login
              session.
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              disabled={
                actionLoading
              }
              onClick={
                closeStatusModal
              }
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                actionLoading
              }
              onClick={
                handleStatusChange
              }
              className={
                user?.isActive
                  ? "inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  : "btn-primary"
              }
            >
              {actionLoading && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {actionLoading
                ? "Please wait..."
                : user?.isActive
                  ? "Deactivate User"
                  : "Activate User"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserDetails;