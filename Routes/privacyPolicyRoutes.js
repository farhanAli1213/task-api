const express = require("express");
const userController = require("../Controllers/userControllers");
const authController = require("../Controllers/authControllers");
const PrivacyController = require("../Controllers/privacyPolicyController");
const router = express.Router();

router.post(
  "/create",
  authController.protect,
  authController.restrictTo("admin"),
  PrivacyController.setCreator,
  PrivacyController.createPrivacy
);

router.get("/", PrivacyController.getallPrivacy);
router
  .route("/:id")
  .get(PrivacyController.getOnePrivacy)
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    PrivacyController.updatePrivacy
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    PrivacyController.deletePrivacy
  );

module.exports = router;
