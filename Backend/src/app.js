require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");

/*
|--------------------------------------------------------------------------
| Route Imports
|--------------------------------------------------------------------------
*/

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const schoolRoutes = require("./routes/schoolRoutes");
const classRoutes = require("./routes/classRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const teacherRoutes = require("./routes/teacherRoutes");

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

const staffRoutes = require("./routes/staffRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

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

const payrollRoutes = require("./routes/payrollRoutes");

const feeStructureRoutes = require(
  "./routes/feeStructureRoutes"
);

const feeCollectionRoutes = require(
  "./routes/feeCollectionRoutes"
);

const dashboardRoutes = require(
  "./routes/dashboardRoutes"
);

const portalRoutes = require("./routes/portalRoutes");

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
  errorHandler,
} = require("./middlewares/errorMiddleware");

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
  "http://127.0.0.1:5174",
].filter(Boolean);

/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: (origin, callback) => {
      /*
      |--------------------------------------------------------------------------
      | Allow Thunder Client, Postman and Server Requests
      |--------------------------------------------------------------------------
      */

      if (!origin) {
        return callback(null, true);
      }

      /*
      |--------------------------------------------------------------------------
      | Allow Trusted Frontend Origins
      |--------------------------------------------------------------------------
      */

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
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
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

/*
|--------------------------------------------------------------------------
| Request Parsers
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| Health Route
|--------------------------------------------------------------------------
|
| یہ route MongoDB connection کے بغیر بھی backend status چیک کرے گا۔
|
*/

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "School / Madrasa Management API is running",
    environment:
      process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| MongoDB Connection Middleware
|--------------------------------------------------------------------------
|
| Vercel پر server.js ہمیشہ execute نہیں ہوتی، اس لیے ہر API request سے
| پہلے MongoDB connection کو یہاں await کرنا ضروری ہے۔
|
*/

app.use("/api", async (req, res, next) => {
  try {
    await connectDB();

    return next();
  } catch (error) {
    console.error(
      "Database Connection Middleware Error:",
      error.message
    );

    return res.status(503).json({
      success: false,
      message: "Database connection failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

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

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

/*
|--------------------------------------------------------------------------
| School Academic Management
|--------------------------------------------------------------------------
*/

app.use("/api/schools", schoolRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/teachers", teacherRoutes);

/*
|--------------------------------------------------------------------------
| Timetable Management
|--------------------------------------------------------------------------
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

app.use("/api/staff", staffRoutes);

/*
|--------------------------------------------------------------------------
| Students and Student Attendance
|--------------------------------------------------------------------------
*/

app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);

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
*/

app.use(
  "/api/staff-leaves",
  staffLeaveRoutes
);

/*
|--------------------------------------------------------------------------
| Staff Salary Structures
|--------------------------------------------------------------------------
*/

app.use(
  "/api/staff-salary-structures",
  staffSalaryStructureRoutes
);

/*
|--------------------------------------------------------------------------
| Staff Payroll
|--------------------------------------------------------------------------
*/

app.use("/api/payroll", payrollRoutes);

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

app.use("/api/portal", portalRoutes);

app.use(
  "/api/audit-logs",
  auditLogRoutes
);

/*
|--------------------------------------------------------------------------
| Error Handlers
|--------------------------------------------------------------------------
|
| یہ دونوں middleware تمام routes کے بعد ہونے چاہییں۔
|
*/

app.use(notFound);
app.use(errorHandler);

module.exports = app;