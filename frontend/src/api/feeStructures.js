import api from "./axios";

/*
|--------------------------------------------------------------------------
| Get Active Fee Structures
|--------------------------------------------------------------------------
|
| Supported parameters:
|
| search
| schoolId
| classId
| sessionYear
| isActive
| page
| limit
|
*/

export const getFeeStructures = (
  params = {}
) => {
  return api.get(
    "/fee-structures",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Deleted Fee Structures
|--------------------------------------------------------------------------
*/

export const getDeletedFeeStructures = (
  params = {}
) => {
  return api.get(
    "/fee-structures/deleted/list",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Fee Structure by ID
|--------------------------------------------------------------------------
*/

export const getFeeStructureById = (
  id
) => {
  return api.get(
    `/fee-structures/${id}`
  );
};

/*
|--------------------------------------------------------------------------
| Create Fee Structure
|--------------------------------------------------------------------------
*/

export const createFeeStructure = (
  payload
) => {
  return api.post(
    "/fee-structures",
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Update Fee Structure
|--------------------------------------------------------------------------
*/

export const updateFeeStructure = (
  id,
  payload
) => {
  return api.put(
    `/fee-structures/${id}`,
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Soft Delete Fee Structure
|--------------------------------------------------------------------------
*/

export const deleteFeeStructure = (
  id
) => {
  return api.delete(
    `/fee-structures/${id}`
  );
};

/*
|--------------------------------------------------------------------------
| Restore Fee Structure
|--------------------------------------------------------------------------
*/

export const restoreFeeStructure = (
  id
) => {
  return api.patch(
    `/fee-structures/${id}/restore`
  );
};