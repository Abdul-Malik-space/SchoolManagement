import {
  useMemo,
  useState
} from "react";

import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  XCircle
} from "lucide-react";

import {
  useNavigate
} from "react-router-dom";

import {
  changePasswordRequest
} from "../../api/auth";

import {
  setAccessToken
} from "../../api/axios";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Password Input
|--------------------------------------------------------------------------
*/

const PasswordField = ({
  id,
  label,
  value,
  onChange,
  showPassword,
  onToggle,
  placeholder,
  autoComplete,
  disabled
}) => {
  return (
    <div>
      <label
        htmlFor={id}
        className="field-label"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={
            showPassword
              ? "text"
              : "password"
          }
          required
          value={value}
          onChange={onChange}
          className="field-input pr-11"
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          tabIndex={-1}
          aria-label={
            showPassword
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
        >
          {showPassword ? (
            <EyeOff size={17} />
          ) : (
            <Eye size={17} />
          )}
        </button>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Password Rule
|--------------------------------------------------------------------------
*/

const PasswordRule = ({
  passed,
  children
}) => {
  return (
    <li
      className={`flex items-center gap-2 text-xs ${
        passed
          ? "text-emerald-700"
          : "text-slate-400"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          passed
            ? "bg-emerald-100"
            : "bg-slate-100"
        }`}
      >
        {passed ? (
          <Check size={11} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        )}
      </span>

      {children}
    </li>
  );
};

/*
|--------------------------------------------------------------------------
| Change Password
|--------------------------------------------------------------------------
*/

const ChangePassword = () => {
  const navigate =
    useNavigate();

  const {
    user,
    setUser
  } = useAuth();

  const [
    currentPassword,
    setCurrentPassword
  ] = useState("");

  const [
    newPassword,
    setNewPassword
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword
  ] = useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword
  ] = useState(false);

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const [
    success,
    setSuccess
  ] = useState("");

  const passwordUpdateRequired =
    Boolean(
      user?.mustChangePassword
    );

  /*
  |--------------------------------------------------------------------------
  | Password Checks
  |--------------------------------------------------------------------------
  */

  const passwordChecks =
    useMemo(
      () => ({
        minimumLength:
          newPassword.length >=
          8,

        hasLowercase:
          /[a-z]/.test(
            newPassword
          ),

        hasUppercase:
          /[A-Z]/.test(
            newPassword
          ),

        hasNumber:
          /\d/.test(
            newPassword
          ),

        isDifferent:
          Boolean(
            newPassword &&
            currentPassword &&
            newPassword !==
              currentPassword
          ),

        passwordsMatch:
          Boolean(
            confirmPassword &&
            newPassword ===
              confirmPassword
          )
      }),
      [
        confirmPassword,
        currentPassword,
        newPassword
      ]
    );

  const passwordStrength =
    useMemo(() => {
      const optionalChecks = [
        passwordChecks.minimumLength,
        passwordChecks.hasLowercase,
        passwordChecks.hasUppercase,
        passwordChecks.hasNumber
      ];

      return optionalChecks.filter(
        Boolean
      ).length;
    }, [
      passwordChecks
    ]);

  const strengthDetails =
    useMemo(() => {
      if (!newPassword) {
        return {
          label:
            "Not entered",
          width: "0%",
          className:
            "bg-slate-300"
        };
      }

      if (
        passwordStrength <=
        1
      ) {
        return {
          label: "Weak",
          width: "25%",
          className:
            "bg-rose-500"
        };
      }

      if (
        passwordStrength ===
        2
      ) {
        return {
          label: "Fair",
          width: "50%",
          className:
            "bg-amber-500"
        };
      }

      if (
        passwordStrength ===
        3
      ) {
        return {
          label: "Good",
          width: "75%",
          className:
            "bg-sky-500"
        };
      }

      return {
        label: "Strong",
        width: "100%",
        className:
          "bg-emerald-500"
      };
    }, [
      newPassword,
      passwordStrength
    ]);

  /*
  |--------------------------------------------------------------------------
  | Validation
  |--------------------------------------------------------------------------
  */

  const validateForm =
    () => {
      if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {
        return (
          "Complete all password fields."
        );
      }

      if (
        newPassword.length <
        8
      ) {
        return (
          "New password must contain at least 8 characters."
        );
      }

      if (
        newPassword ===
        currentPassword
      ) {
        return (
          "New password must be different from your current password."
        );
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        return (
          "New password and confirm password do not match."
        );
      }

      return "";
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

      setError("");
      setSuccess("");

      const validationError =
        validateForm();

      if (validationError) {
        setError(
          validationError
        );

        return;
      }

      setLoading(true);

      try {
        const response =
          await changePasswordRequest({
            oldPassword:
              currentPassword,

            newPassword
          });

        const payload =
          response?.data ||
          {};

        const newAccessToken =
          payload?.data
            ?.accessToken ||
          payload?.accessToken ||
          payload?.token;

        if (newAccessToken) {
          setAccessToken(
            newAccessToken
          );
        }

        setUser(
          (
            currentUser
          ) => ({
            ...currentUser,
            mustChangePassword:
              false
          })
        );

        setCurrentPassword(
          ""
        );

        setNewPassword(
          ""
        );

        setConfirmPassword(
          ""
        );

        setSuccess(
          payload?.message ||
          "Password changed successfully."
        );

        window.setTimeout(
          () => {
            navigate(
              "/dashboard",
              {
                replace: true
              }
            );
          },
          900
        );
      } catch (requestError) {
        setError(
          requestError
            ?.response?.data
            ?.message ||
          requestError
            ?.message ||
          "Password could not be changed."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      {/*
      |--------------------------------------------------------------------------
      | Header
      |--------------------------------------------------------------------------
      */}

      <div>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <KeyRound size={21} />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
              {passwordUpdateRequired
                ? "Password Update Required"
                : "Change Password"}
            </h1>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {passwordUpdateRequired
                ? "Your administrator issued a temporary password. Create a new private password before continuing."
                : "Update your account password and keep your school management account secure."}
            </p>
          </div>
        </div>
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Required Password Alert
      |--------------------------------------------------------------------------
      */}

      {passwordUpdateRequired && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <LockKeyhole
            size={19}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="text-sm font-bold">
              Temporary password detected
            </p>

            <p className="mt-1 text-xs leading-5">
              Change your temporary password now. Your account will return to the dashboard after the update is completed.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        {/*
        |--------------------------------------------------------------------------
        | Password Form
        |--------------------------------------------------------------------------
        */}

        <form
          onSubmit={
            handleSubmit
          }
          className="card p-5 sm:p-6"
        >
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-800">
              Account Password
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Signed in as{" "}
              <span className="font-semibold text-slate-600">
                {user?.email ||
                  "current user"}
              </span>
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700"
            >
              <XCircle
                size={17}
                className="mt-0.5 shrink-0"
              />

              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700"
            >
              <CheckCircle2
                size={17}
                className="mt-0.5 shrink-0"
              />

              {success}
            </div>
          )}

          <div className="space-y-4">
            <PasswordField
              id="current-password"
              label="Current Password"
              value={
                currentPassword
              }
              onChange={(
                event
              ) => {
                setCurrentPassword(
                  event.target.value
                );

                setError("");
              }}
              showPassword={
                showCurrentPassword
              }
              onToggle={() =>
                setShowCurrentPassword(
                  (
                    previous
                  ) =>
                    !previous
                )
              }
              placeholder="Enter your current or temporary password"
              autoComplete="current-password"
              disabled={loading}
            />

            <PasswordField
              id="new-password"
              label="New Password"
              value={
                newPassword
              }
              onChange={(
                event
              ) => {
                setNewPassword(
                  event.target.value
                );

                setError("");
              }}
              showPassword={
                showNewPassword
              }
              onToggle={() =>
                setShowNewPassword(
                  (
                    previous
                  ) =>
                    !previous
                )
              }
              placeholder="Enter a new password"
              autoComplete="new-password"
              disabled={loading}
            />

            <PasswordField
              id="confirm-password"
              label="Confirm New Password"
              value={
                confirmPassword
              }
              onChange={(
                event
              ) => {
                setConfirmPassword(
                  event.target.value
                );

                setError("");
              }}
              showPassword={
                showConfirmPassword
              }
              onToggle={() =>
                setShowConfirmPassword(
                  (
                    previous
                  ) =>
                    !previous
                )
              }
              placeholder="Enter the new password again"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Password Strength
          |--------------------------------------------------------------------------
          */}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-600">
                Password strength
              </p>

              <p className="text-xs font-bold text-slate-700">
                {strengthDetails.label}
              </p>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${strengthDetails.className}`}
                style={{
                  width:
                    strengthDetails.width
                }}
              />
            </div>

            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              <PasswordRule
                passed={
                  passwordChecks.minimumLength
                }
              >
                At least 8 characters
              </PasswordRule>

              <PasswordRule
                passed={
                  passwordChecks.isDifferent
                }
              >
                Different from current password
              </PasswordRule>

              <PasswordRule
                passed={
                  passwordChecks.hasLowercase
                }
              >
                Contains a lowercase letter
              </PasswordRule>

              <PasswordRule
                passed={
                  passwordChecks.hasUppercase
                }
              >
                Contains an uppercase letter
              </PasswordRule>

              <PasswordRule
                passed={
                  passwordChecks.hasNumber
                }
              >
                Contains a number
              </PasswordRule>

              <PasswordRule
                passed={
                  passwordChecks.passwordsMatch
                }
              >
                Both new passwords match
              </PasswordRule>
            </ul>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Actions
          |--------------------------------------------------------------------------
          */}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            {!passwordUpdateRequired && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  navigate(
                    "/dashboard"
                  )
                }
                disabled={loading}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={
                loading ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {loading ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <KeyRound
                  size={17}
                />
              )}

              {loading
                ? "Updating Password..."
                : "Update Password"}
            </button>
          </div>
        </form>

        {/*
        |--------------------------------------------------------------------------
        | Security Guidance
        |--------------------------------------------------------------------------
        */}

        <aside className="space-y-4">
          <div className="card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck
                size={19}
              />
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-800">
              Password Security
            </h2>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              A strong password protects student, staff, attendance and financial information stored in the system.
            </p>

            <ul className="mt-4 space-y-3 text-xs leading-5 text-slate-500">
              <li className="flex items-start gap-2">
                <Check
                  size={14}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                Use a password that is not used for your email or social accounts.
              </li>

              <li className="flex items-start gap-2">
                <Check
                  size={14}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                Do not share your password with colleagues, students or parents.
              </li>

              <li className="flex items-start gap-2">
                <Check
                  size={14}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                Avoid names, phone numbers and easily guessed number sequences.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
            <p className="text-sm font-bold text-brand-800">
              Session protection
            </p>

            <p className="mt-2 text-xs leading-5 text-brand-700/80">
              After your password is changed, the backend rotates the access and refresh tokens so your active session remains secure.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ChangePassword;
