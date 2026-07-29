const express = require("express");

const {
  login,
  refreshAccessToken,
  logout,
  getMe,
  updateProfile,
  changePassword
} = require("../controllers/authController");

const {
  protect
} = require("../middlewares/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Public authentication routes
|--------------------------------------------------------------------------
*/

router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);

/*
|--------------------------------------------------------------------------
| Protected authentication routes
|--------------------------------------------------------------------------
*/

router.get("/me", protect, getMe);
router.put("/update-profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;