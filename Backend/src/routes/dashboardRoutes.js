const express = require("express");

const {
  getDashboardSummary
} = require("../controllers/dashboardController");

const {
  protect,
  authorize
} = require("../middlewares/authMiddleware");

const schoolScope = require(
  "../middlewares/schoolScopeMiddleware"
);

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Dashboard Routes
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Get Dashboard Summary
|--------------------------------------------------------------------------
|
| Access:
|
| super_admin:
| - تمام schools کی combined summary دیکھ سکتا ہے۔
| - schoolId query کے ذریعے ایک school منتخب کر سکتا ہے۔
|
| principal:
| - صرف اپنے assigned school کا dashboard دیکھ سکتا ہے۔
|
| accountant:
| - اپنے school کی fee اور general dashboard information دیکھ سکتا ہے۔
|
| teacher:
| - اپنے school کی general dashboard اور attendance information دیکھ سکتا ہے۔
|
| Query parameters:
|
| schoolId = MongoDB school ID
| month    = YYYY-MM
| date     = YYYY-MM-DD
|
| Example:
|
| /api/dashboard/summary
| /api/dashboard/summary?schoolId=123
| /api/dashboard/summary?month=2026-07
| /api/dashboard/summary?date=2026-07-26
|
*/

router.get(
  "/summary",
  protect,
  authorize(
    "super_admin",
    "principal",
    "accountant",
    "teacher"
  ),
  schoolScope,
  getDashboardSummary
);

module.exports = router;