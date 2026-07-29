import api from "./axios";

/*
|--------------------------------------------------------------------------
| Get Fee Collections
|--------------------------------------------------------------------------
|
| Supported filters:
|
| search
| schoolId
| classId
| studentId
| feeStructureId
| feeMonth
| sessionYear
| paymentStatus
| page
| limit
|
*/

export const getFeeCollections = (
  params = {}
) => {
  return api.get(
    "/fee-collections",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Deleted Fee Collections
|--------------------------------------------------------------------------
*/

export const getDeletedFeeCollections = (
  params = {}
) => {
  return api.get(
    "/fee-collections/deleted/list",
    {
      params
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Single Fee Collection
|--------------------------------------------------------------------------
*/

export const getFeeCollectionById = (
  id
) => {
  return api.get(
    `/fee-collections/${id}`
  );
};

/*
|--------------------------------------------------------------------------
| Create Fee Invoice
|--------------------------------------------------------------------------
|
| یہ function invoice create کرنے کے ساتھ initial payment بھی
| collect کر سکتا ہے۔
|
*/

export const createFeeCollection = (
  payload
) => {
  return api.post(
    "/fee-collections",
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Collect Fee Alias
|--------------------------------------------------------------------------
|
| Backward compatibility کے لیے دونوں names available رہیں گے۔
|
*/

export const collectFee = (
  payload
) => {
  return api.post(
    "/fee-collections",
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Add Payment
|--------------------------------------------------------------------------
|
| Recommended backend route:
| PATCH /api/fee-collections/:id/payment
|
*/

export const addFeePayment = (
  id,
  payload
) => {
  return api.patch(
    `/fee-collections/${id}/payment`,
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Add Payment Alias
|--------------------------------------------------------------------------
*/

export const addPayment = (
  id,
  payload
) => {
  return api.patch(
    `/fee-collections/${id}/payment`,
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Update Fee Collection
|--------------------------------------------------------------------------
|
| Editable fields:
|
| dueDate
| discount
| fine
| notes
|
*/

export const updateFeeCollection = (
  id,
  payload
) => {
  return api.put(
    `/fee-collections/${id}`,
    payload
  );
};

/*
|--------------------------------------------------------------------------
| Soft Delete Fee Collection
|--------------------------------------------------------------------------
*/

export const deleteFeeCollection = (
  id
) => {
  return api.delete(
    `/fee-collections/${id}`
  );
};

/*
|--------------------------------------------------------------------------
| Restore Fee Collection
|--------------------------------------------------------------------------
*/

export const restoreFeeCollection = (
  id
) => {
  return api.patch(
    `/fee-collections/${id}/restore`
  );
};