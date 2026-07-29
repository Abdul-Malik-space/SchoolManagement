import api from "./axios";

/*
|--------------------------------------------------------------------------
| Get Audit Logs
|--------------------------------------------------------------------------
|
| Supported filters:
|
| search
| schoolId
| userId
| userRole
| action
| module
| status
| recordId
| recordModel
| requestMethod
| fromDate
| toDate
| page
| limit
|
*/

export const getAuditLogs = (
  params = {}
) => {
  return api.get(
    "/audit-logs",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Audit Log Summary
|--------------------------------------------------------------------------
|
| Returns:
|
| total
| success
| failed
| byAction
| byModule
|
*/

export const getAuditLogSummary = (
  params = {}
) => {
  return api.get(
    "/audit-logs/summary",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Deleted Audit Logs
|--------------------------------------------------------------------------
|
| Super Admin only.
|
*/

export const getDeletedAuditLogs = (
  params = {}
) => {
  return api.get(
    "/audit-logs/deleted/list",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Single Audit Log
|--------------------------------------------------------------------------
*/

export const getAuditLogById = (
  id
) => {
  return api.get(
    `/audit-logs/${id}`
  );
};

/*
|--------------------------------------------------------------------------
| Soft Delete Audit Log
|--------------------------------------------------------------------------
|
| Super Admin only.
|
*/

export const deleteAuditLog = (
  id
) => {
  return api.delete(
    `/audit-logs/${id}`
  );
};

/*
|--------------------------------------------------------------------------
| Restore Audit Log
|--------------------------------------------------------------------------
|
| Super Admin only.
|
*/

export const restoreAuditLog = (
  id
) => {
  return api.patch(
    `/audit-logs/${id}/restore`
  );
};