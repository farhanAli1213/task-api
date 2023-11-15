var mongoose = require("mongoose");
const { String } = require("mongoose/lib/schema/index");
var Schema = mongoose.Schema;

var ChatSchema = new Schema(
  {
    users: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
    lastMsgSender: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    LastMessage: { type: String, required: true },
    messageTime: String,
    seen: { type: Boolean, default: false },
    type: {
      type: String,
      required: true,
      enum: ["text", "audio", "photo", "video", "alert"],
    },
  },
  { timestamps: true }
);

ChatSchema.pre(/^find/, function (next) {
  this.populate({
    path: "users",
    select: "name image",
  });
  next();
});

module.exports = mongoose.model("Chat", ChatSchema);
