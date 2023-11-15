const express = require("express");
const userRoutes = require("./userRoutes");
const privacyRoutes = require("./privacyPolicyRoutes");
const termsandconditionRoutes = require("./termsandconditionRoutes");
const paymentRoutes = require("./paymentRoutes");
const transactionRoutes = require("./transactionRoutes");

const setupRoutesV1 = () => {
  const router = express.Router();
  router.use("/user", userRoutes);
  router.use("/privacy", privacyRoutes);
  router.use("/termsandcondition", termsandconditionRoutes);
  router.use("/payment", paymentRoutes);
  router.use("/transaction", transactionRoutes);

  return router;
};
module.exports = setupRoutesV1;
