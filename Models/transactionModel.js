const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactiontype: {
      type: String,
      enum: ["amount"],
      default: "amount",
    },
    creator: {
      type: mongoose.Schema.ObjectId,
      refPath: "creator_model_type",
    },
    creator_model_type: {
      type: String,
      enum: ["User"],
      default: "User",
    },
    isRefund: {
      type: Boolean,
      default: false,
    },
    amount: Number,
    transactionId: String,
  },
  {timestamps: true}
);

transactionSchema.pre(/^find/, async function (next) {
  this.populate({
    path: "creator",
    select: "name image",
  });
  next();
});

// transactionSchema.pre("save", async function (next) {
//   if (this.etype === "course" || this.etype === "event") {
//     // const model = mongoose.model(
//     //   this.etype.charAt(0).toUpperCase() + this.etype.slice(1)
//     // );
//     this.spenton = await referenceDefiner(this.etype);
//   }
//   if (this.userType === "learner" || this.userType === "organizer") {
//     // const model = mongoose.model(
//     //   this.userType.charAt(0).toUpperCase() + this.userType.slice(1)
//     // );
//     this.creator = await referenceDefiner(this.userType);
//   }
//   next();
// });

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
