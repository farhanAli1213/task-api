const express = require("express");
const userController = require("../Controllers/userControllers");
const authController = require("../Controllers/authControllers");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/socialLogin", authController.socialLogin);

router.post("/verify", authController.verifyEmail);

router.post("/login", authController.login);

router.post("/sendOTP", authController.sendOTP);

router.post("/refresh/:token", authController.refresh);
router.post("/testLogin", authController.testLogin);
router.get("/categories", userController.getCategories);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword", authController.resetPassword);
router.post(
  "/verifyOTPResetPassword",
  authController.verifyOtpForResetPassword
);

// Protect all routes after this middleware
router.use(authController.protect);
router.get("/mynotifications", userController.mynotifications);

router.post("/logout", authController.logout);
router.patch("/updateMyPassword", authController.updatePassword);
router.get("/me", userController.getMe, userController.getUser);
router.patch(
  "/updateMe",
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete("/deleteMe", userController.deleteMe);

// router.use(authController.restrictTo("admin"));

router.route("/").get(userController.getAllUsers);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
