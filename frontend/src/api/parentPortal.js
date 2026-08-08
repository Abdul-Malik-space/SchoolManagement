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
    typeof studentId ===
    "object"
      ? String(
          studentId?._id ||
          studentId?.id ||
          ""
        ).trim()
      : String(
          studentId ||
          ""
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

const requireRecordId = (
  value,
  label = "Record"
) => {
  const normalizedId =
    typeof value ===
    "object"
      ? String(
          value?._id ||
          value?.id ||
          ""
        ).trim()
      : String(
          value ||
          ""
        ).trim();

  if (!normalizedId) {
    throw new Error(
      `${label} ID is required.`
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
        config.params ||
        {}
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
| Returns:
|
| - Active linked children
| - Parent-child relationship
| - Portal permissions
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
| Returns lightweight child dashboard information.
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
| GET /api/parent-portal/children/:studentId/attendance
|
| Supported params:
|
| month=YYYY-MM
|
| OR:
|
| from=YYYY-MM-DD
| to=YYYY-MM-DD
|
| Pagination:
|
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
| GET /api/parent-portal/children/:studentId/fees
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
| GET /api/parent-portal/children/:studentId/timetable
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
| Returns:
|
| - Current class subjects
| - Assigned teachers
| - Academic summary
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

/*
|--------------------------------------------------------------------------
| Child Examination Results
|--------------------------------------------------------------------------
|
| GET /api/parent-portal/children/:studentId/results
|
| Parent can see only the selected linked child's published results.
|
| Backend performs:
|
| - Parent authentication
| - Parent role validation
| - Parent school validation
| - Active parent-student link validation
| - Verified parent-student link validation
| - Academic permission validation
| - Student ownership validation
|
| Supported params:
|
| academicYear=2026-2027
| academicTerm=Term 1
| overallResultStatus=pass|fail
| page=1
| limit=20
|
| Returns:
|
| - Child information
| - Parent-child link
| - Published results
| - Marks
| - Percentage
| - Grade
| - GPA when enabled
| - Class position when enabled
| - Section position when enabled
| - Report card availability
| - Result summary
| - Pagination
|
*/

export const getParentChildResults = (
  studentId,
  params = {},
  config = {}
) => {
  const safeStudentId =
    requireStudentId(
      studentId
    );

  return api.get(
    `${PARENT_PORTAL_BASE}/children/${safeStudentId}/results`,
    buildRequestConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Child Examination Result Detail
|--------------------------------------------------------------------------
|
| GET
| /api/parent-portal/children/:studentId/results/:resultId
|
| resultId only selects the result record.
|
| Backend still verifies that:
|
| - Child belongs to authenticated parent
| - Result belongs to the same child
| - Result belongs to the same school
| - Result is published / locked
|
*/

export const getParentChildResultById = (
  studentId,
  resultId,
  config = {}
) => {
  const safeStudentId =
    requireStudentId(
      studentId
    );

  const safeResultId =
    requireRecordId(
      resultId,
      "Result"
    );

  return api.get(
    `${PARENT_PORTAL_BASE}/children/${safeStudentId}/results/${safeResultId}`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Child Published Report Card
|--------------------------------------------------------------------------
|
| GET
| /api/parent-portal/children/:studentId/report-cards/:reportCardId
|
| Backend returns only:
|
| - Authenticated parent's linked child
| - Published report card
| - Parent-visible report card
| - Published / locked source ExamResult
|
| Direct document URL is returned only if:
|
| accessPolicy.allowParentDownload === true
|
*/

export const getParentChildReportCardById = (
  studentId,
  reportCardId,
  config = {}
) => {
  const safeStudentId =
    requireStudentId(
      studentId
    );

  const safeReportCardId =
    requireRecordId(
      reportCardId,
      "Report card"
    );

  return api.get(
    `${PARENT_PORTAL_BASE}/children/${safeStudentId}/report-cards/${safeReportCardId}`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Parent Child Initial Load
|--------------------------------------------------------------------------
|
| Optional convenience helper.
|
| Child profile اور dashboard snapshot کو parallel load کرتا ہے۔
|
*/

export const loadParentChildInitialData =
  async (
    studentId,
    config = {}
  ) => {
    const [
      profileResponse,
      snapshotResponse
    ] =
      await Promise.all([
        getParentChildProfile(
          studentId,
          config
        ),

        getParentChildSnapshot(
          studentId,
          config
        )
      ]);

    return {
      profile:
        profileResponse.data,

      snapshot:
        snapshotResponse.data
    };
  };

/*
|--------------------------------------------------------------------------
| Default Export
|--------------------------------------------------------------------------
*/

export default {
  getParentPortalOverview,
  getParentChildren,

  getParentChildProfile,
  getParentChildProfileAlias,
  getParentChildSnapshot,

  getParentChildAttendance,
  getParentChildFees,
  getParentChildTimetable,
  getParentChildAcademics,

  getParentChildResults,
  getParentChildResultById,
  getParentChildReportCardById,

  loadParentChildInitialData
};