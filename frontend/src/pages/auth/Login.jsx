import {
  useState
} from "react";

import {
  Eye,
  EyeOff,
  LayoutGrid,
  Loader2
} from "lucide-react";

import {
  Navigate,
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Role Redirects
|--------------------------------------------------------------------------
|
| ہر authenticated role کو اس کے متعلقہ portal پر بھیجا جاتا ہے۔
| Parent کو Parent Portal ملتا ہے جبکہ management roles Dashboard کھولتے ہیں۔
|
*/

const DASHBOARD_ROLES = [
  "super_admin",
  "principal",
  "teacher",
  "accountant"
];

const ROLE_REDIRECTS = {
  super_admin:
    "/dashboard/home",

  principal:
    "/dashboard/home",

  teacher:
    "/dashboard/home",

  accountant:
    "/dashboard/home",

  parent:
    "/parent-portal"
};

/*
|--------------------------------------------------------------------------
| Redirect Helpers
|--------------------------------------------------------------------------
*/

const getRequestedPath = (
  from
) => {
  if (
    typeof from ===
    "string"
  ) {
    return from;
  }

  if (
    from &&
    typeof from.pathname ===
      "string"
  ) {
    return `${from.pathname}${from.search || ""}${from.hash || ""}`;
  }

  return "";
};

const isSafeInternalPath = (
  path
) => {
  return (
    typeof path ===
      "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    path !==
      "/login"
  );
};

const getRoleRedirect = ({
  role,
  mustChangePassword = false,
  requestedPath = ""
}) => {
  if (
    mustChangePassword
  ) {
    return "/change-password";
  }

  const normalizedRole =
    String(
      role || ""
    ).toLowerCase();

  const defaultPath =
    ROLE_REDIRECTS[
      normalizedRole
    ] ||
    "/dashboard";

  if (
    !isSafeInternalPath(
      requestedPath
    )
  ) {
    return defaultPath;
  }

  if (
    normalizedRole ===
    "parent"
  ) {
    const isParentPortalPath =
      requestedPath ===
        "/parent-portal" ||
      requestedPath.startsWith(
        "/parent-portal/"
      );

    return isParentPortalPath
      ? requestedPath
      : defaultPath;
  }

  if (
    DASHBOARD_ROLES.includes(
      normalizedRole
    )
  ) {
    const isParentPortalPath =
      requestedPath ===
        "/parent-portal" ||
      requestedPath.startsWith(
        "/parent-portal/"
      );

    return isParentPortalPath
      ? defaultPath
      : requestedPath;
  }

  return defaultPath;
};

const Login = () => {
  const {
    login,
    user
  } = useAuth();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [
    email,
    setEmail
  ] = useState("");

  const [
    password,
    setPassword
  ] = useState("");

  const [
    showPassword,
    setShowPassword
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const [
    loading,
    setLoading
  ] = useState(false);

  const requestedPath =
    getRequestedPath(
      location.state
        ?.from
    );

  /*
  |--------------------------------------------------------------------------
  | Already Authenticated User
  |--------------------------------------------------------------------------
  */

  if (user) {
    const redirectPath =
      getRoleRedirect({
        role:
          user.role,

        mustChangePassword:
          Boolean(
            user.mustChangePassword
          ),

        requestedPath
      });

    return (
      <Navigate
        to={redirectPath}
        replace
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Login Submission
  |--------------------------------------------------------------------------
  */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      setError("");
      setLoading(true);

      try {
        const normalizedEmail =
          email
            .trim()
            .toLowerCase();

        const loggedInUser =
          await login(
            normalizedEmail,
            password
          );

        const redirectPath =
          getRoleRedirect({
            role:
              loggedInUser
                ?.role,

            mustChangePassword:
              Boolean(
                loggedInUser
                  ?.mustChangePassword
              ),

            requestedPath
          });

        navigate(
          redirectPath,
          {
            replace: true
          }
        );
      } catch (err) {
        setError(
          err?.response?.data
            ?.message ||
          err?.message ||
          "Invalid email or password."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4 py-10">
      <div className="w-full max-w-sm">
        {/*
        |--------------------------------------------------------------------------
        | Login Header
        |--------------------------------------------------------------------------
        */}

        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-900/20">
            <LayoutGrid
              size={21}
            />
          </div>

          <div className="text-center">
            <h1 className="text-xl font-semibold text-white">
              School Management
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Sign in to access your assigned portal
            </p>
          </div>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Login Form
        |--------------------------------------------------------------------------
        */}

        <form
          onSubmit={
            handleSubmit
          }
          className="card p-6"
        >
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm leading-5 text-rose-700"
            >
              {error}
            </div>
          )}

          <div className="mb-4">
            <label
              className="field-label"
              htmlFor="email"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(
                event
              ) =>
                setEmail(
                  event.target.value
                )
              }
              className="field-input"
              placeholder="name@example.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck="false"
              disabled={loading}
            />
          </div>

          <div className="mb-5">
            <label
              className="field-label"
              htmlFor="password"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                required
                value={password}
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target.value
                  )
                }
                className="field-input pr-11"
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (
                      previous
                    ) =>
                      !previous
                  )
                }
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                tabIndex={-1}
                disabled={loading}
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
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !email.trim() ||
              !password
            }
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />

                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-slate-400">
            Super Admin, Principal, Teacher, Accountant and Parent accounts can
            sign in from this page.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;