import api from "./axios";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const requireId = (
  value,
  label = "Record ID"
) => {
  const normalizedValue =
    String(
      value || ""
    ).trim();

  if (!normalizedValue) {
    throw new Error(
      `${label} is required.`
    );
  }

  return encodeURIComponent(
    normalizedValue
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
      ]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );
};

const isFormDataPayload = (
  payload
) => {
  return (
    typeof FormData !==
      "undefined" &&
    payload instanceof FormData
  );
};

/*
|--------------------------------------------------------------------------
| Mutation Request Configuration
|--------------------------------------------------------------------------
|
| FormData کے ساتھ Content-Type manually set نہیں کیا جاتا۔ Browser خود
| multipart boundary بناتا ہے۔ اگر Axios instance میں application/json
| default موجود ہو تو undefined اسے request level پر remove کر دیتا ہے۔
|
*/

const buildMutationConfig = (
  payload,
  config = {}
) => {
  if (
    !isFormDataPayload(
      payload
    )
  ) {
    return config;
  }

  return {
    ...config,

    headers: {
      ...(
        config.headers ||
        {}
      ),

      "Content-Type":
        undefined
    }
  };
};

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
  params = {},
  config = {}
) => {
  return api.get(
    "/staff",
    {
      ...config,

      params: cleanParams({
        ...(
          config.params ||
          {}
        ),

        ...params
      })
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
  params = {},
  config = {}
) => {
  return api.get(
    "/staff/summary",
    {
      ...config,

      params: cleanParams({
        ...(
          config.params ||
          {}
        ),

        ...params
      })
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Deleted Staff
|--------------------------------------------------------------------------
*/

export const getDeletedStaff = (
  params = {},
  config = {}
) => {
  return api.get(
    "/staff/deleted/list",
    {
      ...config,

      params: cleanParams({
        ...(
          config.params ||
          {}
        ),

        ...params
      })
    }
  );
};

/*
|--------------------------------------------------------------------------
| Get Single Staff Member
|--------------------------------------------------------------------------
*/

export const getStaffById = (
  id,
  config = {}
) => {
  const safeId =
    requireId(
      id,
      "Staff ID"
    );

  return api.get(
    `/staff/${safeId}`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Create Staff Member
|--------------------------------------------------------------------------
|
| JSON payload اور FormData دونوں supported ہیں۔
|
| Photo upload کے لیے:
|
| const formData = new FormData();
| formData.append("photo", selectedFile);
|
| Super Admin:
| formData میں schoolId شامل کرے گا۔
|
| Principal:
| Backend logged-in Principal کا assigned school استعمال کرے گا۔
|
*/

export const createStaff = (
  payload,
  config = {}
) => {
  return api.post(
    "/staff",
    payload,
    buildMutationConfig(
      payload,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Update Staff Member
|--------------------------------------------------------------------------
|
| FormData photo fields:
|
| photo
| removeStaffPhoto
|
*/

export const updateStaff = (
  id,
  payload,
  config = {}
) => {
  const safeId =
    requireId(
      id,
      "Staff ID"
    );

  return api.put(
    `/staff/${safeId}`,
    payload,
    buildMutationConfig(
      payload,
      config
    )
  );
};

/*
|--------------------------------------------------------------------------
| Partial Staff Update
|--------------------------------------------------------------------------
|
| PUT اور PATCH دونوں backend routes image upload کو support کرتے ہیں۔
|
*/

export const patchStaff = (
  id,
  payload,
  config = {}
) => {
  const safeId =
    requireId(
      id,
      "Staff ID"
    );

  return api.patch(
    `/staff/${safeId}`,
    payload,
    buildMutationConfig(
      payload,
      config
    )
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
  payload,
  config = {}
) => {
  const safeId =
    requireId(
      id,
      "Staff ID"
    );

  return api.patch(
    `/staff/${safeId}/status`,
    payload,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Soft Delete Staff Member
|--------------------------------------------------------------------------
*/

export const deleteStaff = (
  id,
  config = {}
) => {
  const safeId =
    requireId(
      id,
      "Staff ID"
    );

  return api.delete(
    `/staff/${safeId}`,
    config
  );
};

/*
|--------------------------------------------------------------------------
| Restore Staff Member
|--------------------------------------------------------------------------
*/

export const restoreStaff = (
  id,
  config = {}
) => {
  const safeId =
    requireId(
      id,
      "Staff ID"
    );

  return api.patch(
    `/staff/${safeId}/restore`,
    {},
    config
  );
};
