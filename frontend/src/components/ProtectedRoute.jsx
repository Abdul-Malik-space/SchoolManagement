import {
  Navigate,
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  ArrowLeft,
  Home,
  Loader2,
  LockKeyhole,
  ShieldAlert
} from "lucide-react";

import {
  useAuth
} from "../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Role Formatter
|--------------------------------------------------------------------------
*/

const formatRole = (role) => {
  if (!role) {
    return "User";
  }

  return String(role)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

/*
|--------------------------------------------------------------------------
| Authentication Loading Screen
|--------------------------------------------------------------------------
*/

const AuthenticationLoader = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Loader2
            size={26}
            className="animate-spin"
          />
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-700">
          Checking your access
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Please wait a moment.
        </p>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Access Denied Screen
|--------------------------------------------------------------------------
*/

const AccessDenied = ({
  userRole,
  allowedRoles = []
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[calc(100vh-116px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/*
        |--------------------------------------------------------------------------
        | Header
        |--------------------------------------------------------------------------
        */}

        <div className="bg-gradient-to-br from-rose-500 to-rose-700 px-6 py-8 text-center text-white sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <ShieldAlert size={31} />
          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            Error 403
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            Access Denied
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/80">
            Your account does not have permission to access this page.
          </p>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Permission Information
        |--------------------------------------------------------------------------
        */}

        <div className="p-6 sm:p-8">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                <LockKeyhole size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Your current role
                </p>

                <p className="mt-1 text-sm font-bold text-slate-700">
                  {formatRole(userRole)}
                </p>

                {allowedRoles.length > 0 && (
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    This page is available to:{" "}
                    <span className="font-semibold text-slate-600">
                      {allowedRoles
                        .map(formatRole)
                        .join(", ")}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-sm leading-6 text-slate-500">
            Contact the system administrator or your school principal if you
            believe you should have access.
          </p>

          {/*
          |--------------------------------------------------------------------------
          | Actions
          |--------------------------------------------------------------------------
          */}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={16} />
              Go Back
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                navigate("/dashboard", {
                  replace: true
                })
              }
            >
              <Home size={16} />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Protected Route
|--------------------------------------------------------------------------
|
| Usage:
|
| <ProtectedRoute roles={["super_admin", "principal"]}>
|   <UsersList />
| </ProtectedRoute>
|
| جب roles نہ دیے جائیں تو ہر authenticated user کو access ملے گا۔
|
*/

export const ProtectedRoute = ({
  children,
  roles = []
}) => {
  const location = useLocation();

  const auth = useAuth();

  const user = auth?.user;

  /*
  |--------------------------------------------------------------------------
  | Compatible Loading State
  |--------------------------------------------------------------------------
  |
  | مختلف AuthContext naming conventions support کی گئی ہیں۔
  |
  */

  const authLoading = Boolean(
    auth?.loading ??
      auth?.authLoading ??
      auth?.isLoading ??
      auth?.initializing ??
      false
  );

  /*
  |--------------------------------------------------------------------------
  | Wait Until Authentication Check Completes
  |--------------------------------------------------------------------------
  */

  if (authLoading) {
    return <AuthenticationLoader />;
  }

  /*
  |--------------------------------------------------------------------------
  | Unauthenticated User
  |--------------------------------------------------------------------------
  |
  | Login کے بعد previous page کی location available رہے گی۔
  |
  */

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname
        }}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Role Authorization
  |--------------------------------------------------------------------------
  */

  const normalizedUserRole = String(
    user.role || ""
  ).toLowerCase();

  const normalizedAllowedRoles = roles.map((role) =>
    String(role).toLowerCase()
  );

  const requiresSpecificRole =
    normalizedAllowedRoles.length > 0;

  const hasPermission =
    !requiresSpecificRole ||
    normalizedAllowedRoles.includes(normalizedUserRole);

  if (!hasPermission) {
    return (
      <AccessDenied
        userRole={normalizedUserRole}
        allowedRoles={normalizedAllowedRoles}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Authorized User
  |--------------------------------------------------------------------------
  */

  return children;
};

export default ProtectedRoute;