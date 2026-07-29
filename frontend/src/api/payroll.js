import api from "./axios";

/*
|--------------------------------------------------------------------------
| API Base Path
|--------------------------------------------------------------------------
*/

const PAYROLL_BASE_URL =
  "/payroll";

/*
|--------------------------------------------------------------------------
| Query Parameter Cleaner
|--------------------------------------------------------------------------
|
| undefined، null اور empty string values request کے ساتھ نہیں بھیجی جائیں گی۔
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
| Payload Validation Helper
|--------------------------------------------------------------------------
*/

const ensureObjectPayload = (
  payload,
  message
) => {
  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(payload)
  ) {
    throw new Error(
      message
    );
  }
};

/*
|--------------------------------------------------------------------------
| Payroll ID Validation Helper
|--------------------------------------------------------------------------
*/

const ensurePayrollId = (
  payrollId
) => {
  if (!payrollId) {
    throw new Error(
      "Payroll ID is required."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Get Payroll Records
|--------------------------------------------------------------------------
|
| Supported filters:
|
| schoolId
| staffId
| payrollMonth
| payrollYear
| status
| department
| paymentMethod
| search
| sortBy
| sortOrder
| page
| limit
|
*/

export const getPayrolls =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        PAYROLL_BASE_URL,
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
| Generate Monthly Payroll
|--------------------------------------------------------------------------
|
| Required:
|
| payrollMonth
| payrollYear
|
| Super Admin کے لیے schoolId required ہوگا۔
|
| Optional:
|
| staffId
| regenerateExisting
|
| staffId نہ دینے پر تمام eligible staff کی payroll generate ہوگی۔
|
*/

export const generatePayroll =
  async (
    payrollData
  ) => {
    ensureObjectPayload(
      payrollData,
      "Payroll generation data is required."
    );

    const response =
      await api.post(
        `${PAYROLL_BASE_URL}/generate`,
        payrollData
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Get Payroll by ID
|--------------------------------------------------------------------------
*/

export const getPayrollById =
  async (
    payrollId
  ) => {
    ensurePayrollId(
      payrollId
    );

    const response =
      await api.get(
        `${PAYROLL_BASE_URL}/${payrollId}`
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Get Payslip
|--------------------------------------------------------------------------
|
| Approved یا paid payroll کی payslip official ہوگی۔
|
*/

export const getPayslip =
  async (
    payrollId
  ) => {
    ensurePayrollId(
      payrollId
    );

    const response =
      await api.get(
        `${PAYROLL_BASE_URL}/${payrollId}/payslip`
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Recalculate Payroll
|--------------------------------------------------------------------------
|
| موجودہ Salary Structure اور Staff Attendance سے payroll دوبارہ
| calculate ہوگی۔
|
*/

export const recalculatePayroll =
  async (
    payrollId
  ) => {
    ensurePayrollId(
      payrollId
    );

    const response =
      await api.post(
        `${PAYROLL_BASE_URL}/${payrollId}/recalculate`,
        {}
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Update Payroll Adjustments
|--------------------------------------------------------------------------
|
| Supported fields:
|
| bonus
| arrears
| reimbursements
| incentives
| otherEarnings
| salaryAdvance
| otherDeductions
| roundingAdjustment
| payrollNotes
| adjustmentNotes
|
*/

export const updatePayrollAdjustments =
  async (
    payrollId,
    adjustmentData
  ) => {
    ensurePayrollId(
      payrollId
    );

    ensureObjectPayload(
      adjustmentData,
      "Payroll adjustment data is required."
    );

    const response =
      await api.put(
        `${PAYROLL_BASE_URL}/${payrollId}/adjustments`,
        adjustmentData
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Submit Payroll for Approval
|--------------------------------------------------------------------------
|
| attendance نامکمل ہونے پر:
|
| {
|   confirmIncompleteAttendance: true
| }
|
*/

export const submitPayroll =
  async (
    payrollId,
    submitData = {}
  ) => {
    ensurePayrollId(
      payrollId
    );

    const payload =
      submitData &&
      typeof submitData ===
        "object" &&
      !Array.isArray(
        submitData
      )
        ? submitData
        : {};

    const response =
      await api.patch(
        `${PAYROLL_BASE_URL}/${payrollId}/submit`,
        payload
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Approve Payroll
|--------------------------------------------------------------------------
*/

export const approvePayroll =
  async (
    payrollId
  ) => {
    ensurePayrollId(
      payrollId
    );

    const response =
      await api.patch(
        `${PAYROLL_BASE_URL}/${payrollId}/approve`,
        {}
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Reject Payroll
|--------------------------------------------------------------------------
*/

export const rejectPayroll =
  async (
    payrollId,
    rejectionData
  ) => {
    ensurePayrollId(
      payrollId
    );

    const payload =
      typeof rejectionData ===
        "string"
        ? {
            rejectionReason:
              rejectionData.trim()
          }
        : rejectionData;

    ensureObjectPayload(
      payload,
      "Payroll rejection data is required."
    );

    if (
      !String(
        payload.rejectionReason ||
          ""
      ).trim()
    ) {
      throw new Error(
        "Rejection reason is required."
      );
    }

    const response =
      await api.patch(
        `${PAYROLL_BASE_URL}/${payrollId}/reject`,
        {
          ...payload,

          rejectionReason:
            String(
              payload
                .rejectionReason
            ).trim()
        }
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Mark Payroll as Paid
|--------------------------------------------------------------------------
|
| Supported payment methods:
|
| bank_transfer
| cash
| cheque
| mobile_wallet
|
*/

export const markPayrollPaid =
  async (
    payrollId,
    paymentData
  ) => {
    ensurePayrollId(
      payrollId
    );

    ensureObjectPayload(
      paymentData,
      "Payroll payment data is required."
    );

    const response =
      await api.patch(
        `${PAYROLL_BASE_URL}/${payrollId}/pay`,
        paymentData
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Cancel Payroll
|--------------------------------------------------------------------------
*/

export const cancelPayroll =
  async (
    payrollId,
    cancellationData
  ) => {
    ensurePayrollId(
      payrollId
    );

    const payload =
      typeof cancellationData ===
        "string"
        ? {
            cancellationReason:
              cancellationData.trim()
          }
        : cancellationData;

    ensureObjectPayload(
      payload,
      "Payroll cancellation data is required."
    );

    if (
      !String(
        payload
          .cancellationReason ||
          ""
      ).trim()
    ) {
      throw new Error(
        "Cancellation reason is required."
      );
    }

    const response =
      await api.patch(
        `${PAYROLL_BASE_URL}/${payrollId}/cancel`,
        {
          ...payload,

          cancellationReason:
            String(
              payload
                .cancellationReason
            ).trim()
        }
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Soft Delete Payroll
|--------------------------------------------------------------------------
*/

export const deletePayroll =
  async (
    payrollId
  ) => {
    ensurePayrollId(
      payrollId
    );

    const response =
      await api.delete(
        `${PAYROLL_BASE_URL}/${payrollId}`
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Get Deleted Payroll Records
|--------------------------------------------------------------------------
*/

export const getDeletedPayrolls =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        `${PAYROLL_BASE_URL}/deleted/list`,
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
| Restore Deleted Payroll
|--------------------------------------------------------------------------
*/

export const restorePayroll =
  async (
    payrollId
  ) => {
    ensurePayrollId(
      payrollId
    );

    const response =
      await api.patch(
        `${PAYROLL_BASE_URL}/${payrollId}/restore`,
        {}
      );

    return response.data;
  };

/*
|--------------------------------------------------------------------------
| Payroll API Object
|--------------------------------------------------------------------------
*/

const payrollApi = {
  getPayrolls,
  generatePayroll,
  getPayrollById,
  getPayslip,
  recalculatePayroll,
  updatePayrollAdjustments,
  submitPayroll,
  approvePayroll,
  rejectPayroll,
  markPayrollPaid,
  cancelPayroll,
  deletePayroll,
  getDeletedPayrolls,
  restorePayroll
};

export default payrollApi;