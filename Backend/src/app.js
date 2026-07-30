const express = require(
  "express"
);

const cors = require(
  "cors"
);

const cookieParser = require(
  "cookie-parser"
);

/*
|--------------------------------------------------------------------------
| Route Imports
|--------------------------------------------------------------------------
*/

const authRoutes = require(
  "./routes/authRoutes"
);

const userRoutes = require(
  "./routes/userRoutes"
);

const schoolRoutes = require(
  "./routes/schoolRoutes"
);

const classRoutes = require(
  "./routes/classRoutes"
);

const subjectRoutes = require(
  "./routes/subjectRoutes"
);

const teacherRoutes = require(
  "./routes/teacherRoutes"
);

/*
|--------------------------------------------------------------------------
| Timetable Management
|--------------------------------------------------------------------------
*/

const timetableConfigRoutes = require(
  "./routes/timetableConfigRoutes"
);

const timetableRoutes = require(
  "./routes/timetableRoutes"
);

const staffRoutes = require(
  "./routes/staffRoutes"
);

const studentRoutes = require(
  "./routes/studentRoutes"
);

const attendanceRoutes = require(
  "./routes/attendanceRoutes"
);

const staffAttendanceRoutes = require(
  "./routes/staffAttendanceRoutes"
);

/*
|--------------------------------------------------------------------------
| Staff Leave Management
|--------------------------------------------------------------------------
*/

const staffLeaveRoutes = require(
  "./routes/staffLeaveRoutes"
);

/*
|--------------------------------------------------------------------------
| Staff Salary and Payroll
|--------------------------------------------------------------------------
*/

const staffSalaryStructureRoutes = require(
  "./routes/staffSalaryStructureRoutes"
);

const payrollRoutes = require(
  "./routes/payrollRoutes"
);

const feeStructureRoutes = require(
  "./routes/feeStructureRoutes"
);

const feeCollectionRoutes = require(
  "./routes/feeCollectionRoutes"
);

const dashboardRoutes = require(
  "./routes/dashboardRoutes"
);

const portalRoutes = require(
  "./routes/portalRoutes"
);

/*
|--------------------------------------------------------------------------
| Parent Portal
|--------------------------------------------------------------------------
*/

const parentPortalRoutes = require(
  "./routes/parentPortalRoutes"
);

/*
|--------------------------------------------------------------------------
| Portal Messaging
|--------------------------------------------------------------------------
*/

const portalMessageRoutes = require(
  "./routes/portalMessageRoutes"
);

const auditLogRoutes = require(
  "./routes/auditLogRoutes"
);

/*
|--------------------------------------------------------------------------
| Error Middleware
|--------------------------------------------------------------------------
*/

const {
  notFound,
  errorHandler
} = require(
  "./middlewares/errorMiddleware"
);

const app = express();

/*
|--------------------------------------------------------------------------
| Allowed Frontend Origins
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174"
].filter(Boolean);

/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: (
      origin,
      callback
    ) => {
      /*
      |--------------------------------------------------------------------------
      | Allow API Tools and Server Requests
      |--------------------------------------------------------------------------
      |
      | Postman، Thunder Client، mobile apps اور server-to-server requests
      | میں origin موجود نہیں ہو سکتا۔
      |
      */

      if (!origin) {
        return callback(
          null,
          true
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Allow Trusted Frontend Origins
      |--------------------------------------------------------------------------
      */

      if (
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Reject Unknown Origins
      |--------------------------------------------------------------------------
      */

      const error = new Error(
        `CORS policy does not allow requests from origin: ${origin}`
      );

      error.statusCode = 403;

      return callback(error);
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]
  })
);

/*
|--------------------------------------------------------------------------
| Request Parsers
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

app.use(
  cookieParser()
);

/*
|--------------------------------------------------------------------------
| Health Route
|--------------------------------------------------------------------------
*/

app.get(
  "/",
  (req, res) => {
    return res
      .status(200)
      .json({
        success: true,

        message:
          "School / Madrasa Management API is running",

        timestamp:
          new Date()
            .toISOString()
      });
  }
);

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Authentication and Users
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

/*
|--------------------------------------------------------------------------
| School Academic Management
|--------------------------------------------------------------------------
*/

app.use(
  "/api/schools",
  schoolRoutes
);

app.use(
  "/api/classes",
  classRoutes
);

app.use(
  "/api/subjects",
  subjectRoutes
);

app.use(
  "/api/teachers",
  teacherRoutes
);

/*
|--------------------------------------------------------------------------
| Timetable Management
|--------------------------------------------------------------------------
|
| Period settings، timetable configurations، timetable builder، class-wise
| timetable، teacher-wise timetable، conflict validation، publishing،
| reports، soft deletion اور restoration manage کرے گا۔
|
*/

app.use(
  "/api/timetable-configs",
  timetableConfigRoutes
);

app.use(
  "/api/timetables",
  timetableRoutes
);

/*
|--------------------------------------------------------------------------
| Non-Teaching Staff Management
|--------------------------------------------------------------------------
*/

app.use(
  "/api/staff",
  staffRoutes
);

/*
|--------------------------------------------------------------------------
| Students and Student Attendance
|--------------------------------------------------------------------------
*/

app.use(
  "/api/students",
  studentRoutes
);

app.use(
  "/api/attendance",
  attendanceRoutes
);

/*
|--------------------------------------------------------------------------
| Staff Attendance
|--------------------------------------------------------------------------
*/

app.use(
  "/api/staff-attendance",
  staffAttendanceRoutes
);

/*
|--------------------------------------------------------------------------
| Staff Leave Management
|--------------------------------------------------------------------------
|
| Staff leave request، approval، rejection، cancellation، attendance sync،
| payroll impact، reports، soft deletion اور restoration manage کرے گا۔
|
*/

app.use(
  "/api/staff-leaves",
  staffLeaveRoutes
);

/*
|--------------------------------------------------------------------------
| Staff Salary Structures
|--------------------------------------------------------------------------
|
| Staff کی basic salary، allowances، deductions، attendance rules،
| overtime rules اور payment settings manage کرے گا۔
|
*/

app.use(
  "/api/staff-salary-structures",
  staffSalaryStructureRoutes
);

/*
|--------------------------------------------------------------------------
| Staff Payroll
|--------------------------------------------------------------------------
|
| Monthly payroll generation، approval، payment، payslip، deletion اور
| restoration manage کرے گا۔
|
*/

app.use(
  "/api/payroll",
  payrollRoutes
);

/*
|--------------------------------------------------------------------------
| Fees
|--------------------------------------------------------------------------
*/

app.use(
  "/api/fee-structures",
  feeStructureRoutes
);

app.use(
  "/api/fee-collections",
  feeCollectionRoutes
);

/*
|--------------------------------------------------------------------------
| Dashboard, Portal and Audit Logs
|--------------------------------------------------------------------------
*/

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/portal",
  portalRoutes
);

/*
|--------------------------------------------------------------------------
| Parent Portal
|--------------------------------------------------------------------------
|
| Parent dashboard، linked children، child profile، attendance، fees،
| timetable، academics اور parent-specific portal summaries serve کرے گا۔
|
*/

app.use(
  "/api/parent-portal",
  parentPortalRoutes
);

/*
|--------------------------------------------------------------------------
| Parent, Student and Principal Messaging
|--------------------------------------------------------------------------
|
| Parent اور Student نئی conversation شروع کر سکتے ہیں۔ Principal school-level
| inbox سے reply، resolve، close اور reopen actions perform کر سکتا ہے۔
|
*/

app.use(
  "/api/portal-messages",
  portalMessageRoutes
);

app.use(
  "/api/audit-logs",
  auditLogRoutes
);

/*
|--------------------------------------------------------------------------
| Error Handlers
|--------------------------------------------------------------------------
|
| یہ middleware تمام API routes کے بعد ہونے چاہییں۔
|
*/

app.use(
  notFound
);

app.use(
  errorHandler
);

module.exports = app;