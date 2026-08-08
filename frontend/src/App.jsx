import {
  Navigate,
  Route,
  Routes,
  useLocation
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import {
  DashboardLayout
} from "./components/layout/DashboardLayout";

import {
  useAuth
} from "./context/AuthContext";

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

import Login from "./pages/auth/Login";

import ChangePassword from "./pages/auth/ChangePassword";

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

import Dashboard from "./pages/dashboard/Dashboard";

/*
|--------------------------------------------------------------------------
| Schools
|--------------------------------------------------------------------------
*/

import SchoolsList from "./pages/schools/SchoolsList";

import SchoolDetail from "./pages/schools/SchoolDetail";

/*
|--------------------------------------------------------------------------
| Users
|--------------------------------------------------------------------------
*/

import UsersList from "./pages/users/UsersList";

import UserDetails from "./pages/users/UserDetails";

/*
|--------------------------------------------------------------------------
| Classes and Subjects
|--------------------------------------------------------------------------
*/

import ClassesList from "./pages/classes/ClassesList";

import SubjectsList from "./pages/subjects/SubjectsList";

/*
|--------------------------------------------------------------------------
| Teachers
|--------------------------------------------------------------------------
*/

import TeachersList from "./pages/teachers/TeachersList";

import TeacherDetails from "./pages/teachers/TeacherDetails";

import DeletedTeachersList from "./pages/teachers/DeletedTeachersList";


/*
|--------------------------------------------------------------------------
| Timetable Management
|--------------------------------------------------------------------------
*/

import PeriodSettings from "./pages/timetable/PeriodSettings";

import TimetableBuilder from "./pages/timetable/TimetableBuilder";

import ClassTimetable from "./pages/timetable/ClassTimetable";

import TeacherTimetable from "./pages/timetable/TeacherTimetable";

import TimetableReport from "./pages/timetable/TimetableReport";

/*
|--------------------------------------------------------------------------
| Staff
|--------------------------------------------------------------------------
*/

import StaffList from "./pages/staff/StaffList";

import StaffDetails from "./pages/staff/StaffDetails";

import DeletedStaffList from "./pages/staff/DeletedStaffList";

/*
|--------------------------------------------------------------------------
| Students
|--------------------------------------------------------------------------
*/

import StudentsList from "./pages/students/StudentsList";

import StudentDetails from "./pages/students/StudentDetails";

import DeletedStudentsList from "./pages/students/DeletedStudentsList";

/*
|--------------------------------------------------------------------------
| Student Attendance
|--------------------------------------------------------------------------
*/

import AttendanceList from "./pages/attendance/AttendanceList";

/*
|--------------------------------------------------------------------------
| Staff Attendance
|--------------------------------------------------------------------------
*/

import StaffAttendanceList from "./pages/staff-attendance/StaffAttendanceList";

import StaffAttendanceHistory from "./pages/staff-attendance/StaffAttendanceHistory";

import StaffAttendanceReport from "./pages/staff-attendance/StaffAttendanceReport";

import DeletedStaffAttendanceList from "./pages/staff-attendance/DeletedStaffAttendanceList";

/*
|--------------------------------------------------------------------------
| Staff Leave Management
|--------------------------------------------------------------------------
*/

import StaffLeaveList from "./pages/staff-leaves/StaffLeaveList";

import StaffLeaveForm from "./pages/staff-leaves/StaffLeaveForm";

import StaffLeaveDetails from "./pages/staff-leaves/StaffLeaveDetails";

import StaffLeaveReport from "./pages/staff-leaves/StaffLeaveReport";

import DeletedStaffLeaveList from "./pages/staff-leaves/DeletedStaffLeaveList";

/*
|--------------------------------------------------------------------------
| Staff Salary Structures
|--------------------------------------------------------------------------
*/

import SalaryStructureList from "./pages/payroll/SalaryStructureList";

import SalaryStructureForm from "./pages/payroll/SalaryStructureForm";

import SalaryStructureDetails from "./pages/payroll/SalaryStructureDetails";

import DeletedSalaryStructureList from "./pages/payroll/DeletedSalaryStructureList";

/*
|--------------------------------------------------------------------------
| Staff Payroll
|--------------------------------------------------------------------------
*/

import PayrollList from "./pages/payroll/PayrollList";

import PayrollDetails from "./pages/payroll/PayrollDetails";

import Payslip from "./pages/payroll/Payslip";

import DeletedPayrollList from "./pages/payroll/DeletedPayrollList";

/*
|--------------------------------------------------------------------------
| Fee Structures
|--------------------------------------------------------------------------
*/

import FeeStructuresList from "./pages/fee-structures/FeeStructuresList";

import FeeStructureDetails from "./pages/fee-structures/FeeStructureDetails";

import DeletedFeeStructuresList from "./pages/fee-structures/DeletedFeeStructuresList";

/*
|--------------------------------------------------------------------------
| Fee Collections
|--------------------------------------------------------------------------
*/

import FeeCollectionsList from "./pages/fee-collections/FeeCollectionsList";

import FeeCollectionDetails from "./pages/fee-collections/FeeCollectionDetails";

import DeletedFeeCollectionsList from "./pages/fee-collections/DeletedFeeCollectionsList";

/*
|--------------------------------------------------------------------------
| Audit Logs
|--------------------------------------------------------------------------
*/

import AuditLogsList from "./pages/audit-logs/AuditLogsList";

import AuditLogDetails from "./pages/audit-logs/AuditLogDetails";

import DeletedAuditLogsList from "./pages/audit-logs/DeletedAuditLogsList";

/*
|--------------------------------------------------------------------------
| Exam and Result Management
|--------------------------------------------------------------------------
*/

import ExamList from "./pages/exams/ExamList";

import ExamForm from "./pages/exams/ExamForm";

import DeletedExams from "./pages/exams/DeletedExams";

/*
|--------------------------------------------------------------------------
| Principal Portal Messages
|--------------------------------------------------------------------------
*/

import PrincipalMessages from "./pages/portal/PrincipalMessages";

/*
|--------------------------------------------------------------------------
| Student Portal
|--------------------------------------------------------------------------
*/

import StudentPortalLayout from "./pages/studentPortal/StudentPortalLayout";

import StudentPortalDashboard from "./pages/studentPortal/StudentPortalDashboard";

import StudentProfile from "./pages/studentPortal/StudentProfile";

import StudentAttendance from "./pages/studentPortal/StudentAttendance";

import StudentTimetable from "./pages/studentPortal/StudentTimetable";

import StudentSubjects from "./pages/studentPortal/StudentSubjects";

import StudentAcademics from "./pages/studentPortal/StudentAcademics";

import StudentResults from "./pages/studentPortal/StudentResults";

import StudentFees from "./pages/studentPortal/StudentFees";

import StudentMessages from "./pages/studentPortal/StudentMessages";

/*
|--------------------------------------------------------------------------
| Parent Portal
|--------------------------------------------------------------------------
*/

import ParentPortalLayout from "./components/parent-portal/ParentPortalLayout";

import ParentPortalDashboard from "./pages/parent-portal/ParentPortalDashboard";

import ParentChildren from "./pages/parent-portal/ParentChildren";

import ParentChildProfile from "./pages/parent-portal/ParentChildProfile";

import ParentAttendance from "./pages/parent-portal/ParentAttendance";

import ParentFees from "./pages/parent-portal/ParentFees";

import ParentTimetable from "./pages/parent-portal/ParentTimetable";

import ParentAcademics from "./pages/parent-portal/ParentAcademics";

import ParentNotices from "./pages/parent-portal/ParentNotices";

import ParentMessages from "./pages/parent-portal/ParentMessages";

import ParentProfile from "./pages/parent-portal/ParentProfile";

/*
|--------------------------------------------------------------------------
| Role Groups
|--------------------------------------------------------------------------
*/

const ALL_DASHBOARD_ROLES = [
  "super_admin",
  "principal",
  "teacher",
  "accountant"
];

const PARENT_PORTAL_ROLES = [
  "parent"
];

const STUDENT_PORTAL_ROLES = [
  "student"
];

const ROLE_HOME_PATHS = {
  super_admin: "/dashboard/home",
  principal: "/dashboard/home",
  teacher: "/dashboard/home",
  accountant: "/dashboard/home",
  parent: "/parent-portal",
  student: "/student-portal"
};

const SUPER_ADMIN_ONLY = [
  "super_admin"
];

const USER_MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

const ACADEMIC_MANAGEMENT_ROLES = [
  "super_admin",
  "principal",
  "teacher"
];

const TEACHER_MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];


/*
|--------------------------------------------------------------------------
| Timetable Roles
|--------------------------------------------------------------------------
|
| Period Settings, Class Timetable, Teacher Timetable and Timetable Report:
| Super Admin، Principal اور Teacher
|
| Timetable Builder:
| صرف Super Admin اور Principal
|
*/

const TIMETABLE_VIEW_ROLES = [
  "super_admin",
  "principal",
  "teacher"
];

const TIMETABLE_MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Staff Roles
|--------------------------------------------------------------------------
|
| Super Admin:
| تمام schools کے staff records دیکھ اور manage کر سکتا ہے۔
|
| Principal:
| صرف اپنے school کے staff records دیکھ اور manage کر سکتا ہے۔
|
| Accountant:
| Staff list اور details صرف دیکھ سکتا ہے۔
|
*/

const STAFF_VIEW_ROLES = [
  "super_admin",
  "principal",
  "accountant"
];

const STAFF_MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Student Roles
|--------------------------------------------------------------------------
*/

const STUDENT_MANAGEMENT_ROLES = [
  "super_admin",
  "principal",
  "teacher",
  "accountant"
];

/*
|--------------------------------------------------------------------------
| Student Attendance Roles
|--------------------------------------------------------------------------
*/

const ATTENDANCE_MANAGEMENT_ROLES = [
  "super_admin",
  "principal",
  "teacher"
];

/*
|--------------------------------------------------------------------------
| Staff Attendance Roles
|--------------------------------------------------------------------------
|
| Super Admin:
| تمام schools کی staff attendance دیکھ، mark اور update کر سکتا ہے۔
|
| Principal:
| اپنے school کی staff attendance دیکھ، mark، update، delete اور restore
| کر سکتا ہے۔
|
| Accountant:
| اپنے school کی staff attendance دیکھ، mark اور update کر سکتا ہے۔
| Deleted records اور restore page تک access نہیں ہوگا۔
|
| Teacher:
| Staff Attendance module تک access نہیں ہوگا۔
|
*/

const STAFF_ATTENDANCE_ROLES = [
  "super_admin",
  "principal",
  "accountant"
];

const STAFF_ATTENDANCE_RECOVERY_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Staff Leave Roles
|--------------------------------------------------------------------------
|
| Super Admin:
| تمام schools کی leave requests دیکھ، create، edit، approve، reject،
| cancel، delete اور restore کر سکتا ہے۔
|
| Principal:
| اپنے school کی leave requests دیکھ اور manage کر سکتا ہے۔
|
| Accountant:
| اپنے school کی leave list، details اور reports صرف دیکھ سکتا ہے۔
|
| Teacher:
| Staff Leave module تک access نہیں ہوگا۔
|
*/

const STAFF_LEAVE_VIEW_ROLES = [
  "super_admin",
  "principal",
  "accountant"
];

const STAFF_LEAVE_MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

const STAFF_LEAVE_RECOVERY_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Salary Structure Roles
|--------------------------------------------------------------------------
|
| Super Admin:
| تمام schools کی salary structures دیکھ، create، edit، delete اور restore
| کر سکتا ہے۔
|
| Principal:
| اپنے school کی salary structures دیکھ اور manage کر سکتا ہے۔
|
| Accountant:
| Salary structures کی list اور details صرف دیکھ سکتا ہے۔
|
*/

const SALARY_STRUCTURE_VIEW_ROLES = [
  "super_admin",
  "principal",
  "accountant"
];

const SALARY_STRUCTURE_MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Payroll Roles
|--------------------------------------------------------------------------
|
| Super Admin:
| تمام schools کی payroll دیکھ، generate، process، approve، pay، delete
| اور restore کر سکتا ہے۔
|
| Principal:
| اپنے school کی payroll دیکھ، generate، approve، reject، pay، delete
| اور restore کر سکتا ہے۔
|
| Accountant:
| اپنے school کی payroll دیکھ، generate، adjust، submit اور payment
| record کر سکتا ہے۔ Deleted recovery page تک access نہیں ہوگا۔
|
*/

const PAYROLL_PROCESSING_ROLES = [
  "super_admin",
  "principal",
  "accountant"
];

const PAYROLL_RECOVERY_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Fee Roles
|--------------------------------------------------------------------------
*/

const FEE_MANAGEMENT_ROLES = [
  "super_admin",
  "principal",
  "accountant"
];

/*
|--------------------------------------------------------------------------
| Audit Log Roles
|--------------------------------------------------------------------------
*/

const AUDIT_LOG_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Exam Management Roles
|--------------------------------------------------------------------------
|
| Exam list and details:
| Super Admin، Principal اور Teacher
|
| Create، edit، deleted records، restore اور workflow management:
| صرف Super Admin اور Principal
|
*/

const EXAM_VIEW_ROLES = [
  "super_admin",
  "principal",
  "teacher"
];

const EXAM_MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Principal Messaging Roles
|--------------------------------------------------------------------------
*/

const PRINCIPAL_MESSAGE_ROLES = [
  "principal"
];


/*
|--------------------------------------------------------------------------
| Role-Aware Home Redirect
|--------------------------------------------------------------------------
|
| ہر authenticated user کو اس کے متعلقہ portal پر بھیجتا ہے۔
| Parent کو Parent Portal، Student کو Student Portal اور staff کو Dashboard Home ملتا ہے۔
|
*/

const RoleHomeRedirect = () => {
  const {
    user,
    initializing
  } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (user.mustChangePassword) {
    return (
      <Navigate
        to="/change-password"
        replace
      />
    );
  }

  const role =
    String(
      user.role || ""
    ).toLowerCase();

  const destination =
    ROLE_HOME_PATHS[role];

  if (destination) {
    return (
      <Navigate
        to={destination}
        replace
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="card w-full max-w-lg p-8 text-center">
        <h1 className="text-xl font-bold text-slate-800">
          Portal Not Configured
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          No application portal is currently registered for the
          <span className="mx-1 font-semibold text-slate-700">
            {role || "unknown"}
          </span>
          role.
        </p>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Mandatory Password Change Guard
|--------------------------------------------------------------------------
|
| Admin reset کے بعد user.mustChangePassword true ہو تو user dashboard یا
| کسی دوسرے module میں داخل نہیں ہو سکے گا۔ اسے پہلے /change-password route
| مکمل کرنا ہوگا۔
|
*/

const PasswordChangeGuard = ({
  children
}) => {
  const {
    user
  } = useAuth();

  const location =
    useLocation();

  const passwordUpdateRequired =
    Boolean(
      user?.mustChangePassword
    );

  const isChangePasswordPage =
    location.pathname ===
    "/change-password";

  if (
    passwordUpdateRequired &&
    !isChangePasswordPage
  ) {
    return (
      <Navigate
        to="/change-password"
        replace
        state={{
          from:
            location.pathname
        }}
      />
    );
  }

  return children;
};

/*
|--------------------------------------------------------------------------
| Protected Element Helper
|--------------------------------------------------------------------------
*/

const protectElement = (
  roles,
  element
) => {
  return (
    <ProtectedRoute roles={roles}>
      {element}
    </ProtectedRoute>
  );
};

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
*/

function App() {
  return (
    <Routes>
      {/*
      |--------------------------------------------------------------------------
      | Public Route
      |--------------------------------------------------------------------------
      */}

      <Route
        path="/login"
        element={<Login />}
      />

      {/*
      |--------------------------------------------------------------------------
      | Shared Change Password Route
      |--------------------------------------------------------------------------
      |
      | یہ route Parent سمیت تمام authenticated users کے لیے available ہے۔
      | Password change کے بعد /dashboard role-aware redirect درست portal کھولے گا۔
      |
      */}

      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
              <ChangePassword />
            </div>
          </ProtectedRoute>
        }
      />

      {/*
      |--------------------------------------------------------------------------
      | Role-Aware Dashboard Entry
      |--------------------------------------------------------------------------
      */}

      <Route
        path="/dashboard"
        element={<RoleHomeRedirect />}
      />

      {/*
      |--------------------------------------------------------------------------
      | Protected Dashboard Layout
      |--------------------------------------------------------------------------
      */}

      <Route
        element={
          <ProtectedRoute roles={ALL_DASHBOARD_ROLES}>
            <PasswordChangeGuard>
              <DashboardLayout />
            </PasswordChangeGuard>
          </ProtectedRoute>
        }
      >
        {/*
        |--------------------------------------------------------------------------
        | Dashboard
        |--------------------------------------------------------------------------
        */}

        <Route
          path="/dashboard/home"
          element={protectElement(
            ALL_DASHBOARD_ROLES,
            <Dashboard />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Schools
        |--------------------------------------------------------------------------
        */}

        <Route
          path="/schools"
          element={protectElement(
            SUPER_ADMIN_ONLY,
            <SchoolsList />
          )}
        />

        <Route
          path="/schools/:id"
          element={protectElement(
            SUPER_ADMIN_ONLY,
            <SchoolDetail />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Users
        |--------------------------------------------------------------------------
        */}

        <Route
          path="/users"
          element={protectElement(
            USER_MANAGEMENT_ROLES,
            <UsersList />
          )}
        />

        <Route
          path="/users/:id"
          element={protectElement(
            USER_MANAGEMENT_ROLES,
            <UserDetails />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Classes
        |--------------------------------------------------------------------------
        */}

        <Route
          path="/classes"
          element={protectElement(
            ACADEMIC_MANAGEMENT_ROLES,
            <ClassesList />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Subjects
        |--------------------------------------------------------------------------
        */}

        <Route
          path="/subjects"
          element={protectElement(
            ACADEMIC_MANAGEMENT_ROLES,
            <SubjectsList />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Teachers
        |--------------------------------------------------------------------------
        */}

        <Route
          path="/teachers"
          element={protectElement(
            TEACHER_MANAGEMENT_ROLES,
            <TeachersList />
          )}
        />

        <Route
          path="/teachers/deleted"
          element={protectElement(
            TEACHER_MANAGEMENT_ROLES,
            <DeletedTeachersList />
          )}
        />

        <Route
          path="/teachers/:id"
          element={protectElement(
            TEACHER_MANAGEMENT_ROLES,
            <TeacherDetails />
          )}
        />


        {/*
        |--------------------------------------------------------------------------
        | Timetable Management
        |--------------------------------------------------------------------------
        |
        | Period Settings:
        | Super Admin اور Principal manage کر سکتے ہیں، Teacher read-only view
        | استعمال کر سکتا ہے۔
        |
        | Timetable Builder:
        | صرف Super Admin اور Principal
        |
        | Class Timetable، Teacher Timetable اور Report:
        | Super Admin، Principal اور Teacher
        |
        */}

        <Route
          path="/timetable"
          element={protectElement(
            TIMETABLE_VIEW_ROLES,
            <Navigate
              to="/timetable/class"
              replace
            />
          )}
        />

        <Route
          path="/timetable/period-settings"
          element={protectElement(
            TIMETABLE_VIEW_ROLES,
            <PeriodSettings />
          )}
        />

        <Route
          path="/timetable/builder"
          element={protectElement(
            TIMETABLE_MANAGEMENT_ROLES,
            <TimetableBuilder />
          )}
        />

        <Route
          path="/timetable/class"
          element={protectElement(
            TIMETABLE_VIEW_ROLES,
            <ClassTimetable />
          )}
        />

        <Route
          path="/timetable/teacher"
          element={protectElement(
            TIMETABLE_VIEW_ROLES,
            <TeacherTimetable />
          )}
        />

        <Route
          path="/timetable/report"
          element={protectElement(
            TIMETABLE_VIEW_ROLES,
            <TimetableReport />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Non-Teaching Staff
        |--------------------------------------------------------------------------
        |
        | Static deleted route کو dynamic :id route سے پہلے رکھا گیا ہے۔
        |
        */}

        <Route
          path="/staff"
          element={protectElement(
            STAFF_VIEW_ROLES,
            <StaffList />
          )}
        />

        <Route
          path="/staff/deleted"
          element={protectElement(
            STAFF_MANAGEMENT_ROLES,
            <DeletedStaffList />
          )}
        />

        <Route
          path="/staff/:id"
          element={protectElement(
            STAFF_VIEW_ROLES,
            <StaffDetails />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Students
        |--------------------------------------------------------------------------
        */}

        <Route
          path="/students"
          element={protectElement(
            STUDENT_MANAGEMENT_ROLES,
            <StudentsList />
          )}
        />

        <Route
          path="/students/deleted"
          element={protectElement(
            [
              "super_admin",
              "principal"
            ],
            <DeletedStudentsList />
          )}
        />

        <Route
          path="/students/:id"
          element={protectElement(
            STUDENT_MANAGEMENT_ROLES,
            <StudentDetails />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Student Attendance
        |--------------------------------------------------------------------------
        */}

        <Route
          path="/attendance"
          element={protectElement(
            ATTENDANCE_MANAGEMENT_ROLES,
            <AttendanceList />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Staff Attendance
        |--------------------------------------------------------------------------
        |
        | Daily attendance:
        | Super Admin، Principal اور Accountant
        |
        | History:
        | Super Admin، Principal اور Accountant
        |
        | Monthly report:
        | Super Admin، Principal اور Accountant
        |
        | Deleted attendance:
        | صرف Super Admin اور Principal
        |
        */}

        <Route
          path="/staff-attendance"
          element={protectElement(
            STAFF_ATTENDANCE_ROLES,
            <StaffAttendanceList />
          )}
        />

        <Route
          path="/staff-attendance/history"
          element={protectElement(
            STAFF_ATTENDANCE_ROLES,
            <StaffAttendanceHistory />
          )}
        />

        <Route
          path="/staff-attendance/report"
          element={protectElement(
            STAFF_ATTENDANCE_ROLES,
            <StaffAttendanceReport />
          )}
        />

        <Route
          path="/staff-attendance/deleted"
          element={protectElement(
            STAFF_ATTENDANCE_RECOVERY_ROLES,
            <DeletedStaffAttendanceList />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Staff Leave Management
        |--------------------------------------------------------------------------
        |
        | List, details and report:
        | Super Admin، Principal اور Accountant
        |
        | Create, edit, approval actions, deleted records and restore:
        | صرف Super Admin اور Principal
        |
        | Static routes کو dynamic :id route سے پہلے رکھا گیا ہے۔
        |
        */}

        <Route
          path="/staff-leaves"
          element={protectElement(
            STAFF_LEAVE_VIEW_ROLES,
            <StaffLeaveList />
          )}
        />

        <Route
          path="/staff-leaves/new"
          element={protectElement(
            STAFF_LEAVE_MANAGEMENT_ROLES,
            <StaffLeaveForm />
          )}
        />

        <Route
          path="/staff-leaves/report"
          element={protectElement(
            STAFF_LEAVE_VIEW_ROLES,
            <StaffLeaveReport />
          )}
        />

        <Route
          path="/staff-leaves/deleted"
          element={protectElement(
            STAFF_LEAVE_RECOVERY_ROLES,
            <DeletedStaffLeaveList />
          )}
        />

        <Route
          path="/staff-leaves/:id/edit"
          element={protectElement(
            STAFF_LEAVE_MANAGEMENT_ROLES,
            <StaffLeaveForm />
          )}
        />

        <Route
          path="/staff-leaves/:id"
          element={protectElement(
            STAFF_LEAVE_VIEW_ROLES,
            <StaffLeaveDetails />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Staff Salary Structures
        |--------------------------------------------------------------------------
        |
        | Static routes کو dynamic :id routes سے پہلے رکھا گیا ہے۔
        |
        | List and details:
        | Super Admin، Principal اور Accountant
        |
        | Create, edit, deleted and restore:
        | صرف Super Admin اور Principal
        |
        */}

        <Route
          path="/payroll/salary-structures"
          element={protectElement(
            SALARY_STRUCTURE_VIEW_ROLES,
            <SalaryStructureList />
          )}
        />

        <Route
          path="/payroll/salary-structures/new"
          element={protectElement(
            SALARY_STRUCTURE_MANAGEMENT_ROLES,
            <SalaryStructureForm />
          )}
        />

        <Route
          path="/payroll/salary-structures/deleted"
          element={protectElement(
            SALARY_STRUCTURE_MANAGEMENT_ROLES,
            <DeletedSalaryStructureList />
          )}
        />

        <Route
          path="/payroll/salary-structures/:id/edit"
          element={protectElement(
            SALARY_STRUCTURE_MANAGEMENT_ROLES,
            <SalaryStructureForm />
          )}
        />

        <Route
          path="/payroll/salary-structures/:id"
          element={protectElement(
            SALARY_STRUCTURE_VIEW_ROLES,
            <SalaryStructureDetails />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Staff Payroll
        |--------------------------------------------------------------------------
        |
        | Payroll list, details and payslip:
        | Super Admin، Principal اور Accountant
        |
        | Deleted payroll recovery:
        | صرف Super Admin اور Principal
        |
        | Static /deleted route کو dynamic /:id route سے پہلے رکھا گیا ہے۔
        |
        */}

        <Route
          path="/payroll"
          element={protectElement(
            PAYROLL_PROCESSING_ROLES,
            <PayrollList />
          )}
        />

        <Route
          path="/payroll/deleted"
          element={protectElement(
            PAYROLL_RECOVERY_ROLES,
            <DeletedPayrollList />
          )}
        />

        <Route
          path="/payroll/:id/payslip"
          element={protectElement(
            PAYROLL_PROCESSING_ROLES,
            <Payslip />
          )}
        />

        <Route
          path="/payroll/:id"
          element={protectElement(
            PAYROLL_PROCESSING_ROLES,
            <PayrollDetails />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Fee Structures
        |--------------------------------------------------------------------------
        */}

        <Route
          path="/fee-structures"
          element={protectElement(
            FEE_MANAGEMENT_ROLES,
            <FeeStructuresList />
          )}
        />

        <Route
          path="/fee-structures/deleted"
          element={protectElement(
            FEE_MANAGEMENT_ROLES,
            <DeletedFeeStructuresList />
          )}
        />

        <Route
          path="/fee-structures/:id"
          element={protectElement(
            FEE_MANAGEMENT_ROLES,
            <FeeStructureDetails />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Fee Collections
        |--------------------------------------------------------------------------
        */}

        <Route
          path="/fee-collections"
          element={protectElement(
            FEE_MANAGEMENT_ROLES,
            <FeeCollectionsList />
          )}
        />

        <Route
          path="/fee-collections/deleted"
          element={protectElement(
            FEE_MANAGEMENT_ROLES,
            <DeletedFeeCollectionsList />
          )}
        />

        <Route
          path="/fee-collections/:id"
          element={protectElement(
            FEE_MANAGEMENT_ROLES,
            <FeeCollectionDetails />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Exam and Result Management
        |--------------------------------------------------------------------------
        |
        | Exam list:
        | Super Admin، Principal اور Teacher
        |
        | Create، edit اور deleted recovery:
        | صرف Super Admin اور Principal
        |
        | Static /new اور /deleted routes کو dynamic /:id/edit route سے پہلے
        | رکھا گیا ہے۔
        |
        */}

        <Route
          path="/exams"
          element={protectElement(
            EXAM_VIEW_ROLES,
            <ExamList />
          )}
        />

        <Route
          path="/exams/new"
          element={protectElement(
            EXAM_MANAGEMENT_ROLES,
            <ExamForm />
          )}
        />

        <Route
          path="/exams/deleted"
          element={protectElement(
            EXAM_MANAGEMENT_ROLES,
            <DeletedExams />
          )}
        />

        <Route
          path="/exams/:id/edit"
          element={protectElement(
            EXAM_MANAGEMENT_ROLES,
            <ExamForm />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Principal Portal Messages
        |--------------------------------------------------------------------------
        |
        | Parent اور Student conversations صرف متعلقہ Principal دیکھ اور
        | reply کر سکتا ہے۔
        |
        */}

        <Route
          path="/portal-messages"
          element={protectElement(
            PRINCIPAL_MESSAGE_ROLES,
            <PrincipalMessages />
          )}
        />

        {/*
        |--------------------------------------------------------------------------
        | Audit Logs
        |--------------------------------------------------------------------------
        */}

        <Route
          path="/audit-logs"
          element={protectElement(
            AUDIT_LOG_ROLES,
            <AuditLogsList />
          )}
        />

        <Route
          path="/audit-logs/deleted"
          element={protectElement(
            SUPER_ADMIN_ONLY,
            <DeletedAuditLogsList />
          )}
        />

        <Route
          path="/audit-logs/:id"
          element={protectElement(
            AUDIT_LOG_ROLES,
            <AuditLogDetails />
          )}
        />
      </Route>


      {/*
      |--------------------------------------------------------------------------
      | Student Portal
      |--------------------------------------------------------------------------
      |
      | Student Portal staff DashboardLayout اور Parent Portal سے الگ رکھا گیا
      | ہے۔ Student صرف اپنا profile، attendance، timetable، subjects، academic
      | progress، fees اور principal messages دیکھ سکتا ہے۔
      |
      */}

      <Route
        path="/student-portal"
        element={
          <ProtectedRoute roles={STUDENT_PORTAL_ROLES}>
            <PasswordChangeGuard>
              <StudentPortalLayout />
            </PasswordChangeGuard>
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<StudentPortalDashboard />}
        />

        <Route
          path="profile"
          element={<StudentProfile />}
        />

        <Route
          path="attendance"
          element={<StudentAttendance />}
        />

        <Route
          path="timetable"
          element={<StudentTimetable />}
        />

        <Route
          path="subjects"
          element={<StudentSubjects />}
        />

        <Route
          path="academics"
          element={<StudentAcademics />}
        />

        <Route
          path="results"
          element={<StudentResults />}
        />

        <Route
          path="fees"
          element={<StudentFees />}
        />

        <Route
          path="messages"
          element={<StudentMessages />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/student-portal"
              replace
            />
          }
        />
      </Route>


      {/*
      |--------------------------------------------------------------------------
      | Parent Portal
      |--------------------------------------------------------------------------
      |
      | Parent Portal DashboardLayout سے الگ رکھا گیا ہے تاکہ parent کو staff
      | sidebar، payroll، users یا management modules تک access نہ ملے۔
      |
      */}

      <Route
        path="/parent-portal"
        element={
          <ProtectedRoute roles={PARENT_PORTAL_ROLES}>
            <PasswordChangeGuard>
              <ParentPortalLayout />
            </PasswordChangeGuard>
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<ParentPortalDashboard />}
        />

        <Route
          path="children"
          element={<ParentChildren />}
        />

        <Route
          path="children/:studentId"
          element={<ParentChildProfile />}
        />

        <Route
          path="attendance"
          element={<ParentAttendance />}
        />

        <Route
          path="fees"
          element={<ParentFees />}
        />

        <Route
          path="timetable"
          element={<ParentTimetable />}
        />

        <Route
          path="academics"
          element={<ParentAcademics />}
        />

        <Route
          path="notices"
          element={<ParentNotices />}
        />

        <Route
          path="messages"
          element={<ParentMessages />}
        />

        <Route
          path="profile"
          element={<ParentProfile />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/parent-portal"
              replace
            />
          }
        />
      </Route>

      {/*
      |--------------------------------------------------------------------------
      | Default Route
      |--------------------------------------------------------------------------
      */}

      <Route
        path="/"
        element={<RoleHomeRedirect />}
      />

      {/*
      |--------------------------------------------------------------------------
      | Unknown Route
      |--------------------------------------------------------------------------
      */}

      <Route
        path="*"
        element={<RoleHomeRedirect />}
      />
    </Routes>
  );
}

export default App;