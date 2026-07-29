import api from "./axios";

/*
|--------------------------------------------------------------------------
| Daily Staff Attendance Register
|--------------------------------------------------------------------------
|
| تمام active اور on-leave staff members کے ساتھ selected date کی
| attendance حاصل کرتا ہے۔
|
| Super Admin کے لیے schoolId لازمی ہوگا۔
|
| Supported params:
|
| schoolId
| attendanceDate
| search
| category
| department
|
*/

export const getDailyStaffAttendance = (
  params = {}
) => {
  return api.get(
    "/staff-attendance/daily",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Mark or Update Daily Staff Attendance
|--------------------------------------------------------------------------
|
| Payload example:
|
| {
|   schoolId: "...", // صرف Super Admin
|   attendanceDate: "2026-07-27",
|   records: [
|     {
|       staffId: "...",
|       status: "present",
|       checkInTime: "08:00",
|       checkOutTime: "16:00",
|       breakMinutes: 30,
|       overtimeMinutes: 0,
|       lateMinutes: 0,
|       leaveType: "",
|       leaveReason: "",
|       remarks: ""
|     }
|   ]
| }
|
| پہلے سے موجود attendance record update ہو جائے گا۔
|
*/

export const markDailyStaffAttendance = (
  payload
) => {
  return api.post(
    "/staff-attendance/daily",
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Get Staff Attendance Records
|--------------------------------------------------------------------------
|
| Supported params:
|
| schoolId
| staffId
| status
| attendanceDate
| fromDate
| toDate
| search
| department
| page
| limit
|
*/

export const getStaffAttendanceRecords = (
  params = {}
) => {
  return api.get(
    "/staff-attendance",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Monthly Staff Attendance Report
|--------------------------------------------------------------------------
|
| Supported params:
|
| schoolId
| year
| month
| staffId
| department
|
*/

export const getMonthlyStaffAttendanceReport = (
  params = {}
) => {
  return api.get(
    "/staff-attendance/monthly-report",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Single Attendance Record
|--------------------------------------------------------------------------
*/

export const getStaffAttendanceById = (
  id
) => {
  return api.get(
    `/staff-attendance/${id}`
  );
};

/*
|--------------------------------------------------------------------------
| Update Single Attendance Record
|--------------------------------------------------------------------------
|
| Editable fields:
|
| status
| checkInTime
| checkOutTime
| breakMinutes
| overtimeMinutes
| lateMinutes
| leaveType
| leaveReason
| remarks
|
*/

export const updateStaffAttendance = (
  id,
  payload
) => {
  return api.put(
    `/staff-attendance/${id}`,
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Soft Delete Attendance Record
|--------------------------------------------------------------------------
|
| صرف Super Admin اور Principal۔
|
*/

export const deleteStaffAttendance = (
  id
) => {
  return api.delete(
    `/staff-attendance/${id}`
  );
};

/*
|--------------------------------------------------------------------------
| Get Deleted Attendance Records
|--------------------------------------------------------------------------
|
| Supported params:
|
| schoolId
| staffId
| status
| attendanceDate
| fromDate
| toDate
| search
| department
| page
| limit
|
*/

export const getDeletedStaffAttendance = (
  params = {}
) => {
  return api.get(
    "/staff-attendance/deleted/list",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Restore Deleted Attendance Record
|--------------------------------------------------------------------------
*/

export const restoreStaffAttendance = (
  id
) => {
  return api.patch(
    `/staff-attendance/${id}/restore`
  );
};