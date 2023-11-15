const User = require("../Models/userModel");
const AppError = require("../Utils/appError");
const catchAsync = require("../Utils/catchAsync");
const { createTransactionPrint } = require("../Utils/transactionPrintCreator");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// This example sets up an endpoint using the Express framework.
// Watch this video to get started: https://youtu.be/rPR2aJ6XnAc.

exports.paymentsheet = async (req, res) => {
  let customer;
  // Use an existing Customer ID if this is a returning customer.
  const { amount } = req.body;
  const user = await User.findById(req.user._id);
  if (user.customerId) {
    customer = {
      id: user.customerId,
    };
  } else {
    customer = await stripe.customers.create();
    user.customerId = customer.id;
    await user.save({ validateBeforeSave: false });
  }
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customer.id },
    { apiVersion: "2022-08-01" }
  );
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,
    currency: "usd",
    customer: customer.id,
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return res.status(200).json({
    status: 200,
    success: true,
    paymentIntentId: paymentIntent.id,
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customer.id,
    publishableKey:
      "pk_test_51LVrpTDvaubKxP1oDwMPA0AF1twyVDXvxvgMmcAlxhqtOS6uPSHrMl2kA47XkWZLEwJ6xY2DWvt7swpxWPavQC9F00aBWuFM26",
  });
};

exports.payment = catchAsync(async (req, res, next) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(
    req.body.paymentId
  );
  if (paymentIntent && paymentIntent.status === "succeeded") {
    console.log("Payment succeeded:", req.body.paymentId);
    req.paid = true;
    req.body.paymentId = req.body.paymentId;
    next();
  } else {
    //  Payment failed
    // console.log("Payment failed", req.body.paymentId);
    return res.status(500).send({ error: "Payment failed" });
  }
});

exports.refund = catchAsync(async (req, res, next) => {
  // Refund payment if requested
  const amount = req.amount * 100;
  const id = req.payementId;
  // console.log("Payment Id:", id);
  // const order = req.order;
  const servicebooked = req.servicebooked;

  try {
    const refund = await stripe.refunds.create({
      payment_intent: id,
      amount,
    });
    console.log("Refund succeeded:", refund);
    // await order.save({ validateBeforeSave: false });
    await servicebooked.save({ validateBeforeSave: false });
    return res.status(200).send({ message: "Refund succeeded" });
  } catch (error) {
    // console.log("Refund failed:", error);
    return res.status(500).send({ error: "Refund failed" });
  }
});
