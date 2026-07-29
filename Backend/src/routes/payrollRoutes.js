const express = require(
  "express"
);

const {
  generatePayroll,
  getPayrolls,
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
} = require(
  "../controllers/payrollController"
);

const {
  protect,
  authorize
} = require(
  "../middlewares/authMiddleware"
);

const schoolScope = require(
  "../middlewares/schoolScopeMiddleware"
);

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Payroll Role Groups
|--------------------------------------------------------------------------
|
| Super Admin:
| تمام schools کی payroll دیکھ، generate، approve اور manage کر سکتا ہے۔
|
| Principal:
| صرف اپنے school کی payroll دیکھ، generate، approve اور manage کر سکتا ہے۔
|
| Accountant:
| Payroll generate، recalculate، adjustments، submit اور payment record
| کر سکتا ہے، لیکن approve، reject، cancel، delete یا restore نہیں کر سکتا۔
|
| Teacher:
| Payroll module تک access نہیں ہوگا۔
|
*/

/*
|--------------------------------------------------------------------------
| View Roles
|--------------------------------------------------------------------------
*/

const PAYROLL_VIEW_ROLES = [
  "super_admin",
  "principal",
  "accountant"
];

/*
|--------------------------------------------------------------------------
| Processing Roles
|--------------------------------------------------------------------------
|
| Payroll preparation اور payment processing کے لیے۔
|
*/

const PAYROLL_PROCESSING_ROLES = [
  "super_admin",
  "principal",
  "accountant"
];

/*
|--------------------------------------------------------------------------
| Approval Roles
|--------------------------------------------------------------------------
|
| Accountant اپنی تیار کردہ payroll خود approve نہیں کرے گا۔
|
*/

const PAYROLL_APPROVAL_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Management and Recovery Roles
|--------------------------------------------------------------------------
*/

const PAYROLL_MANAGEMENT_ROLES = [
  "super_admin",
  "principal"
];

/*
|--------------------------------------------------------------------------
| Authentication and School Scope
|--------------------------------------------------------------------------
*/

router.use(protect);
router.use(schoolScope);

/*
|--------------------------------------------------------------------------
| Generate Monthly Payroll
|--------------------------------------------------------------------------
|
| POST /api/payroll/generate
|
| Request body:
|
| {
|   schoolId,
|   payrollMonth,
|   payrollYear,
|   staffId,
|   regenerateExisting
| }
|
| staffId optional ہے۔
| staffId نہ دینے پر تمام eligible staff کی payroll generate ہوگی۔
|
*/

router.post(
  "/generate",
  authorize(
    ...PAYROLL_PROCESSING_ROLES
  ),
  generatePayroll
);

/*
|--------------------------------------------------------------------------
| Deleted Payroll List
|--------------------------------------------------------------------------
|
| GET /api/payroll/deleted/list
|
| اس route کو /:id سے پہلے رکھنا ضروری ہے۔
|
*/

router.get(
  "/deleted/list",
  authorize(
    ...PAYROLL_MANAGEMENT_ROLES
  ),
  getDeletedPayrolls
);

/*
|--------------------------------------------------------------------------
| Payroll Collection Routes
|--------------------------------------------------------------------------
|
| GET /api/payroll
|
| Supported query parameters:
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

router.get(
  "/",
  authorize(
    ...PAYROLL_VIEW_ROLES
  ),
  getPayrolls
);

/*
|--------------------------------------------------------------------------
| Payslip
|--------------------------------------------------------------------------
|
| GET /api/payroll/:id/payslip
|
| Approved اور paid payroll کی payslip official ہوگی۔
| Draft یا generated payroll preview payslip کے طور پر واپس آئے گی۔
|
*/

router.get(
  "/:id/payslip",
  authorize(
    ...PAYROLL_VIEW_ROLES
  ),
  getPayslip
);

/*
|--------------------------------------------------------------------------
| Recalculate Payroll
|--------------------------------------------------------------------------
|
| POST /api/payroll/:id/recalculate
|
| موجودہ salary structure اور staff attendance سے payroll دوبارہ
| calculate کرے گا۔
|
| صرف ان statuses پر کام کرے گا:
|
| draft
| generated
| rejected
|
*/

router.post(
  "/:id/recalculate",
  authorize(
    ...PAYROLL_PROCESSING_ROLES
  ),
  recalculatePayroll
);

/*
|--------------------------------------------------------------------------
| Update Payroll Adjustments
|--------------------------------------------------------------------------
|
| PUT /api/payroll/:id/adjustments
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

router.put(
  "/:id/adjustments",
  authorize(
    ...PAYROLL_PROCESSING_ROLES
  ),
  updatePayrollAdjustments
);

/*
|--------------------------------------------------------------------------
| Submit Payroll for Approval
|--------------------------------------------------------------------------
|
| PATCH /api/payroll/:id/submit
|
| اگر attendance نامکمل ہو تو body میں یہ confirmation دینی ہوگی:
|
| {
|   "confirmIncompleteAttendance": true
| }
|
*/

router.patch(
  "/:id/submit",
  authorize(
    ...PAYROLL_PROCESSING_ROLES
  ),
  submitPayroll
);

/*
|--------------------------------------------------------------------------
| Approve Payroll
|--------------------------------------------------------------------------
|
| PATCH /api/payroll/:id/approve
|
| صرف pending_approval payroll approve ہوگی۔
|
*/

router.patch(
  "/:id/approve",
  authorize(
    ...PAYROLL_APPROVAL_ROLES
  ),
  approvePayroll
);

/*
|--------------------------------------------------------------------------
| Reject Payroll
|--------------------------------------------------------------------------
|
| PATCH /api/payroll/:id/reject
|
| Request body:
|
| {
|   "rejectionReason": "Attendance needs correction."
| }
|
*/

router.patch(
  "/:id/reject",
  authorize(
    ...PAYROLL_APPROVAL_ROLES
  ),
  rejectPayroll
);

/*
|--------------------------------------------------------------------------
| Record Payroll Payment
|--------------------------------------------------------------------------
|
| PATCH /api/payroll/:id/pay
|
| صرف approved payroll کو paid کیا جا سکے گا۔
|
| Supported payment methods:
|
| bank_transfer
| cash
| cheque
| mobile_wallet
|
*/

router.patch(
  "/:id/pay",
  authorize(
    ...PAYROLL_PROCESSING_ROLES
  ),
  markPayrollPaid
);

/*
|--------------------------------------------------------------------------
| Cancel Payroll
|--------------------------------------------------------------------------
|
| PATCH /api/payroll/:id/cancel
|
| Request body:
|
| {
|   "cancellationReason": "Payroll generated for wrong month."
| }
|
| Paid payroll cancel نہیں کی جا سکے گی۔
|
*/

router.patch(
  "/:id/cancel",
  authorize(
    ...PAYROLL_MANAGEMENT_ROLES
  ),
  cancelPayroll
);

/*
|--------------------------------------------------------------------------
| Restore Deleted Payroll
|--------------------------------------------------------------------------
|
| PATCH /api/payroll/:id/restore
|
| اسی staff اور month کی active payroll پہلے سے موجود ہو تو restore
| نہیں ہوگی۔
|
*/

router.patch(
  "/:id/restore",
  authorize(
    ...PAYROLL_MANAGEMENT_ROLES
  ),
  restorePayroll
);

/*
|--------------------------------------------------------------------------
| Single Payroll Routes
|--------------------------------------------------------------------------
|
| GET /api/payroll/:id
| Payroll details حاصل کرے گا۔
|
| DELETE /api/payroll/:id
| Payroll کو soft delete کرے گا۔
|
| Pending approval، approved اور paid payroll delete نہیں ہوگی۔
|
*/

router
  .route("/:id")
  .get(
    authorize(
      ...PAYROLL_VIEW_ROLES
    ),
    getPayrollById
  )
  .delete(
    authorize(
      ...PAYROLL_MANAGEMENT_ROLES
    ),
    deletePayroll
  );

/*
|--------------------------------------------------------------------------
| Export Router
|--------------------------------------------------------------------------
*/

module.exports = router;