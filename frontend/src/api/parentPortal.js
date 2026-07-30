import api from "./axios";

/*
|--------------------------------------------------------------------------
| Parent Portal API Base
|--------------------------------------------------------------------------
*/

const PARENT_PORTAL_BASE =
  "/parent-portal";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const requireStudentId = (
  studentId
) => {
  const normalizedId =
    String(
      studentId || ""
    ).trim();

  if (!normalizedId) {
    throw new Error(
      "Student ID is required."
    );
  }

  return encodeURIComponent(
    normalizedId
  );
};

const cleanParams = (
  params = {}
) => {
  return Object.fromEntries(
    Object.entries(
      params
    ).filter(
      ([
        ,
        value
      ]) => {
        return (
          value !== undefined &&
          value !== null &&
          value !== ""
        );
      }
    )
  );
};

const buildRequestConfig = (
  params = {},
  config = {}
) => {
  return {
    ...config,

    params: {
      ...cleanParams(
        config.params || {}
      ),

      ...cleanParams(
        params
      )
    }
  };
};

/*
|--------------------------------------------------------------------------
| Parent Portal Overview
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/overview
|
*/

export const getParentPortalOverview = (
  config = {}
) => {
  return api.get(
    `${PARENT_PORTAL_BASE}/overview`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Linked Children
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children
|
*/

export const getParentChildren = (
  config = {}
) => {
  return api.get(
    `${PARENT_PORTAL_BASE}/children`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Child Profile
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId
|
*/

export const getParentChildProfile = (
  studentId,
  config = {}
) => {
  const safeStudentId =
    requireStudentId(
      studentId
    );

  return api.get(
    `${PARENT_PORTAL_BASE}/children/${safeStudentId}`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Child Profile Alias
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/profile
|
*/

export const getParentChildProfileAlias = (
  studentId,
  config = {}
) => {
  const safeStudentId =
    requireStudentId(
      studentId
    );

  return api.get(
    `${PARENT_PORTAL_BASE}/children/${safeStudentId}/profile`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Child Dashboard Snapshot
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/snapshot
|
*/

export const getParentChildSnapshot = (
  studentId,
  config = {}
) => {
  const safeStudentId =
    requireStudentId(
      studentId
    );

  return api.get(
    `${PARENT_PORTAL_BASE}/children/${safeStudentId}/snapshot`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Child Attendance
|--------------------------------------------------------------------------
|
| Supported params:
|
| month=YYYY-MM
| from=YYYY-MM-DD
| to=YYYY-MM-DD
| page=1
| limit=20
|
*/

export const getParentChildAttendance = (
  studentId,
  params = {},
  config = {}
) => {
  const safeStudentId =
    requireStudentId(
      studentId
    );

  return api.get(
    `${PARENT_PORTAL_BASE}/children/${safeStudentId}/attendance`,
    buildRequestConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Child Fee Records
|--------------------------------------------------------------------------
|
| Supported params:
|
| feeMonth=July
| sessionYear=2026-2027
| useCurrentSession=true
| paymentStatus=paid|partial|unpaid
| page=1
| limit=20
|
*/

export const getParentChildFees = (
  studentId,
  params = {},
  config = {}
) => {
  const safeStudentId =
    requireStudentId(
      studentId
    );

  return api.get(
    `${PARENT_PORTAL_BASE}/children/${safeStudentId}/fees`,
    buildRequestConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Child Timetable
|--------------------------------------------------------------------------
|
| Supported params:
|
| rotationWeekCode=STANDARD
| day=monday
|
*/

export const getParentChildTimetable = (
  studentId,
  params = {},
  config = {}
) => {
  const safeStudentId =
    requireStudentId(
      studentId
    );

  return api.get(
    `${PARENT_PORTAL_BASE}/children/${safeStudentId}/timetable`,
    buildRequestConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Child Academic Summary
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/academics
|
*/

export const getParentChildAcademics = (
  studentId,
  config = {}
) => {
  const safeStudentId =
    requireStudentId(
      studentId
    );

  return api.get(
    `${PARENT_PORTAL_BASE}/children/${safeStudentId}/academics`,
    config
  );
};