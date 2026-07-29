import api from "./axios";

/*
|--------------------------------------------------------------------------
| Get Dashboard Summary
|--------------------------------------------------------------------------
|
| Supported query parameters:
|
| schoolId = MongoDB school ID
| month    = YYYY-MM
| date     = YYYY-MM-DD
|
| Examples:
|
| getDashboardSummary()
|
| getDashboardSummary({
|   schoolId: "school-id"
| })
|
| getDashboardSummary({
|   month: "2026-07",
|   date: "2026-07-26"
| })
|
*/

export const getDashboardSummary = (
  params = {}
) => {
  return api.get(
    "/dashboard/summary",
    {
      params
    }
  );
};