import api from "./axios";

/*
|--------------------------------------------------------------------------
| Student Portal API Helpers
|--------------------------------------------------------------------------
*/

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
      ]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );
};

const buildGetConfig = (
  params = {},
  config = {}
) => {
  return {
    ...config,

    params: cleanParams({
      ...(
        config.params ||
        {}
      ),

      ...params
    })
  };
};

/*
|--------------------------------------------------------------------------
| Record ID Helper
|--------------------------------------------------------------------------
*/

const requireRecordId = (
  value,
  label = "Record"
) => {
  const id =
    typeof value ===
    "object"
      ? value?._id ||
        value?.id
      : value;

  const normalizedId =
    String(
      id || ""
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

/*
|--------------------------------------------------------------------------
| Student Portal Overview
|--------------------------------------------------------------------------
|
| Endpoint:
|
| GET /api/student-portal/overview
|
| Optional params:
|
| rotationWeekCode
|
*/

export const getStudentPortalOverview = (
  params = {},
  config = {}
) => {
  return api.get(
    "/student-portal/overview",
    buildGetConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Student Portal Snapshot
|--------------------------------------------------------------------------
|
| Lightweight endpoint for:
|
| - Topbar counters
| - Dashboard cards
| - Unread message badges
| - Attendance status
| - Outstanding fee balance
| - Today's next class
|
| Optional params:
|
| rotationWeekCode
|
*/

export const getStudentPortalSnapshot = (
  params = {},
  config = {}
) => {
  return api.get(
    "/student-portal/snapshot",
    buildGetConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Student Profile and Digital ID
|--------------------------------------------------------------------------
|
| Endpoint:
|
| GET /api/student-portal/profile
|
*/

export const getStudentPortalProfile = (
  config = {}
) => {
  return api.get(
    "/student-portal/profile",
    config
  );
};

/*
|--------------------------------------------------------------------------
| Student Attendance
|--------------------------------------------------------------------------
|
| Endpoint:
|
| GET /api/student-portal/attendance
|
| Supported params:
|
| month=2026-08
|
| OR:
|
| from=2026-08-01
| to=2026-08-31
|
| Pagination:
|
| page
| limit
|
*/

export const getStudentPortalAttendance = (
  params = {},
  config = {}
) => {
  return api.get(
    "/student-portal/attendance",
    buildGetConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Student Fees and Receipts
|--------------------------------------------------------------------------
|
| Endpoint:
|
| GET /api/student-portal/fees
|
| Supported params:
|
| feeMonth
| sessionYear
| useCurrentSession
| paymentStatus
| page
| limit
|
*/

export const getStudentPortalFees = (
  params = {},
  config = {}
) => {
  return api.get(
    "/student-portal/fees",
    buildGetConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Student Timetable
|--------------------------------------------------------------------------
|
| Endpoint:
|
| GET /api/student-portal/timetable
|
| Supported params:
|
| rotationWeekCode
| day
|
*/

export const getStudentPortalTimetable = (
  params = {},
  config = {}
) => {
  return api.get(
    "/student-portal/timetable",
    buildGetConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Academic Summary
|--------------------------------------------------------------------------
|
| Endpoint:
|
| GET /api/student-portal/academics
|
| Returns:
|
| - Subjects
| - Assigned teachers
| - Academic module availability
| - Performance / results availability
|
*/

export const getStudentPortalAcademics = (
  params = {},
  config = {}
) => {
  return api.get(
    "/student-portal/academics",
    buildGetConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Subjects Alias
|--------------------------------------------------------------------------
|
| Endpoint:
|
| GET /api/student-portal/subjects
|
| This currently returns the same response as the academic summary endpoint.
|
*/

export const getStudentPortalSubjects = (
  params = {},
  config = {}
) => {
  return api.get(
    "/student-portal/subjects",
    buildGetConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Student Examination Results
|--------------------------------------------------------------------------
|
| Endpoint:
|
| GET /api/student-portal/results
|
| The backend automatically resolves the authenticated Student.
| No studentId is supplied from the frontend.
|
| Supported params:
|
| academicYear
| academicTerm
| overallResultStatus=pass|fail
| page
| limit
|
| Returns:
|
| - Student identity
| - Published / locked results
| - Marks and percentage
| - Grade and GPA when enabled
| - Class / section position when enabled
| - Published report-card availability
| - Result summary
| - Pagination
|
*/

export const getStudentPortalResults = (
  params = {},
  config = {}
) => {
  return api.get(
    "/student-portal/results",
    buildGetConfig(
      params,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Student Examination Result Detail
|--------------------------------------------------------------------------
|
| Endpoint:
|
| GET /api/student-portal/results/:resultId
|
| resultId selects the result record only.
|
| Backend ownership checks still enforce:
|
| authenticated schoolId
| authenticated student's Student ID
|
| Therefore a student cannot access another student's result.
|
*/

export const getStudentPortalResultById = (
  resultId,
  config = {}
) => {
  const id =
    requireRecordId(
      resultId,
      "Result"
    );

  return api.get(
    `/student-portal/results/${id}`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Student Published Report Card
|--------------------------------------------------------------------------
|
| Endpoint:
|
| GET /api/student-portal/report-cards/:reportCardId
|
| Backend returns only:
|
| - authenticated student's own report card
| - published report card
| - student-visible report card
| - source result that is still published / locked
|
| Document URL is returned only if allowStudentDownload = true.
|
*/

export const getStudentPortalReportCardById = (
  reportCardId,
  config = {}
) => {
  const id =
    requireRecordId(
      reportCardId,
      "Report card"
    );

  return api.get(
    `/student-portal/report-cards/${id}`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Combined Initial Portal Load
|--------------------------------------------------------------------------
|
| Dashboard layout بعض اوقات overview اور snapshot ایک ساتھ load کرنا چاہے
| تو یہ helper دونوں requests parallel چلاتا ہے۔
|
*/

export const loadStudentPortalInitialData =
  async (
    params = {},
    config = {}
  ) => {
    const [
      overviewResponse,
      snapshotResponse
    ] =
      await Promise.all([
        getStudentPortalOverview(
          params,
          config
        ),

        getStudentPortalSnapshot(
          params,
          config
        )
      ]);

    return {
      overview:
        overviewResponse.data,

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
  getStudentPortalOverview,
  getStudentPortalSnapshot,
  getStudentPortalProfile,
  getStudentPortalAttendance,
  getStudentPortalFees,
  getStudentPortalTimetable,
  getStudentPortalAcademics,
  getStudentPortalSubjects,

  getStudentPortalResults,
  getStudentPortalResultById,
  getStudentPortalReportCardById,

  loadStudentPortalInitialData
};