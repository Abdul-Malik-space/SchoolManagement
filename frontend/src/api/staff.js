import api from "./axios";

/*
|--------------------------------------------------------------------------
| Get Active Staff
|--------------------------------------------------------------------------
|
| Supported filters:
|
| schoolId
| search
| status
| category
| department
| employmentType
| gender
| userId
| hasUserAccount
| page
| limit
|
*/

export const getStaff = (
  params = {}
) => {
  return api.get(
    "/staff",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Staff Summary
|--------------------------------------------------------------------------
|
| Returns:
|
| totalStaff
| activeStaff
| inactiveStaff
| onLeaveStaff
| resignedStaff
| monthlyPayroll
|
*/

export const getStaffSummary = (
  params = {}
) => {
  return api.get(
    "/staff/summary",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Deleted Staff
|--------------------------------------------------------------------------
*/

export const getDeletedStaff = (
  params = {}
) => {
  return api.get(
    "/staff/deleted/list",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Single Staff Member
|--------------------------------------------------------------------------
*/

export const getStaffById = (
  id
) => {
  return api.get(
    `/staff/${id}`
  );
};

/*
|--------------------------------------------------------------------------
| Create Staff Member
|--------------------------------------------------------------------------
|
| Super Admin:
| schoolId request body میں دے گا۔
|
| Principal:
| Backend خود principal کا school استعمال کرے گا۔
|
*/

export const createStaff = (
  payload
) => {
  return api.post(
    "/staff",
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Update Staff Member
|--------------------------------------------------------------------------
*/

export const updateStaff = (
  id,
  payload
) => {
  return api.put(
    `/staff/${id}`,
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Update Staff Status
|--------------------------------------------------------------------------
|
| Payload example:
|
| {
|   status: "resigned",
|   leavingDate: "2026-07-27",
|   leavingReason: "Personal reasons"
| }
|
*/

export const updateStaffStatus = (
  id,
  payload
) => {
  return api.patch(
    `/staff/${id}/status`,
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Soft Delete Staff Member
|--------------------------------------------------------------------------
*/

export const deleteStaff = (
  id
) => {
  return api.delete(
    `/staff/${id}`
  );
};

/*
|--------------------------------------------------------------------------
| Restore Staff Member
|--------------------------------------------------------------------------
*/

export const restoreStaff = (
  id
) => {
  return api.patch(
    `/staff/${id}/restore`
  );
};