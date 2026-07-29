import api from "./axios";

/*
|--------------------------------------------------------------------------
| API Base Path
|--------------------------------------------------------------------------
*/

const SALARY_STRUCTURE_BASE_URL =
  "/staff-salary-structures";

/*
|--------------------------------------------------------------------------
| Query Parameter Cleaner
|--------------------------------------------------------------------------
|
| خالی، undefined اور null values request کے ساتھ نہیں بھیجی جائیں گی۔
|
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

/*
|--------------------------------------------------------------------------
| Get Active Salary Structures
|--------------------------------------------------------------------------
|
| Supported filters:
|
| schoolId
| staffId
| search
| department
| status
| calculationBasis
| paymentMethod
| currency
| sortBy
| sortOrder
| page
| limit
|
*/

export const getSalaryStructures =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        SALARY_STRUCTURE_BASE_URL,
        {
          params:
            cleanParams(
              params
            )
        }
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Get Salary Structure by ID
|--------------------------------------------------------------------------
*/

export const getSalaryStructureById =
  async (
    salaryStructureId
  ) => {
    if (
      !salaryStructureId
    ) {
      throw new Error(
        "Salary structure ID is required."
      );
    }

    const response =
      await api.get(
        `${SALARY_STRUCTURE_BASE_URL}/${salaryStructureId}`
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Get Salary Structure by Staff ID
|--------------------------------------------------------------------------
|
| Super Admin optional schoolId query بھی دے سکتا ہے۔
|
*/

export const getSalaryStructureByStaff =
  async (
    staffId,
    params = {}
  ) => {
    if (!staffId) {
      throw new Error(
        "Staff ID is required."
      );
    }

    const response =
      await api.get(
        `${SALARY_STRUCTURE_BASE_URL}/staff/${staffId}`,
        {
          params:
            cleanParams(
              params
            )
        }
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Preview Salary Calculation
|--------------------------------------------------------------------------
|
| Structure save کیے بغیر یہ values calculate کرے گا:
|
| Basic salary
| Total allowances
| Gross salary
| Total deductions
| Estimated net salary
| Daily rate
| Hourly rate
| Overtime rate
|
*/

export const previewSalaryStructure =
  async (
    salaryData
  ) => {
    if (
      !salaryData ||
      typeof salaryData !==
        "object"
    ) {
      throw new Error(
        "Salary structure data is required."
      );
    }

    const response =
      await api.post(
        `${SALARY_STRUCTURE_BASE_URL}/preview`,
        salaryData
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Create Salary Structure
|--------------------------------------------------------------------------
*/

export const createSalaryStructure =
  async (
    salaryData
  ) => {
    if (
      !salaryData ||
      typeof salaryData !==
        "object"
    ) {
      throw new Error(
        "Salary structure data is required."
      );
    }

    const response =
      await api.post(
        SALARY_STRUCTURE_BASE_URL,
        salaryData
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Update Salary Structure
|--------------------------------------------------------------------------
*/

export const updateSalaryStructure =
  async (
    salaryStructureId,
    salaryData
  ) => {
    if (
      !salaryStructureId
    ) {
      throw new Error(
        "Salary structure ID is required."
      );
    }

    if (
      !salaryData ||
      typeof salaryData !==
        "object"
    ) {
      throw new Error(
        "Salary structure data is required."
      );
    }

    const response =
      await api.put(
        `${SALARY_STRUCTURE_BASE_URL}/${salaryStructureId}`,
        salaryData
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Salary Structure
|--------------------------------------------------------------------------
*/

export const deleteSalaryStructure =
  async (
    salaryStructureId
  ) => {
    if (
      !salaryStructureId
    ) {
      throw new Error(
        "Salary structure ID is required."
      );
    }

    const response =
      await api.delete(
        `${SALARY_STRUCTURE_BASE_URL}/${salaryStructureId}`
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Salary Structures
|--------------------------------------------------------------------------
*/

export const getDeletedSalaryStructures =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        `${SALARY_STRUCTURE_BASE_URL}/deleted/list`,
        {
          params:
            cleanParams(
              params
            )
        }
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Restore Salary Structure
|--------------------------------------------------------------------------
*/

export const restoreSalaryStructure =
  async (
    salaryStructureId
  ) => {
    if (
      !salaryStructureId
    ) {
      throw new Error(
        "Salary structure ID is required."
      );
    }

    const response =
      await api.patch(
        `${SALARY_STRUCTURE_BASE_URL}/${salaryStructureId}/restore`
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Salary Structure API Object
|--------------------------------------------------------------------------
*/

const staffSalaryStructuresApi = {
  getSalaryStructures,
  getSalaryStructureById,
  getSalaryStructureByStaff,
  previewSalaryStructure,
  createSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
  getDeletedSalaryStructures,
  restoreSalaryStructure
};

export default staffSalaryStructuresApi;