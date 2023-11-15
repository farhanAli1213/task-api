var mongoose = require("mongoose");
const { String } = require("mongoose/lib/schema/index");
var Schema = mongoose.Schema;

var MessageSchema = new Schema(
  {
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", index: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", index: true },
    message: { type: String, required: true },
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

module.exports = mongoose.model("Message", MessageSchema);
