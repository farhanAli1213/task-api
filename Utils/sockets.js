const Message = require("../Models/Message");
const Chat = require("../Models/chatModel");
const moment = require("moment");
const redis = require("redis");
const Notification = require("../Models/Notification");
const RefreshToken = require("../Models/refreshTokenModel");
const User = require("../Models/userModel");
const {
  SendNotification,
  SendNotificationMultiCast,
} = require("../Utils/notification");

const { sendNotification } = require("../Utils/notification");

const OnlineUser = require("../Models/OnlineUser");
const { json } = require("body-parser");
const { JsonWebTokenError } = require("jsonwebtoken");
const io = require("socket.io")();

// const client = redis.createClient()
const client = {
  set: async (user) =>
    await OnlineUser.updateOne({ user }, {}, { upsert: true }),
  del: async (user) => await OnlineUser.deleteOne({ user }),
  flushDb: async () => await OnlineUser.deleteOne({}),
  KEYS: async () => {
    const keys = await OnlineUser.find({});
    const newKeys = [];
    for (const key of keys) newKeys.push(`${key.user}`);
    return newKeys;
  },
  connect: async () => null,
};

///////// User Promises
const userData = {};
const userSocketID = {};

setInterval(async () => {
  try {
    const promises = [];

    for (const userId in userData)
      if (userData[userId]) promises.push(userData[userId]());
    await Promise.all(promises);
  } catch (e) {
    console.log(e);
  }
}, 5 * 1000);
///////////////////////////

client.connect().then(async (_) => {
  await client.flushDb();

  const getOnlineUsers = async () => {
    const userIds = await client.KEYS();
    const users = await User.find({ _id: { $in: userIds } }).select("id");
    io.emit("online-users", {
      message: "Online Users Retrieved Successfully",
      success: true,
      data: { users },
    });
  };

  io.sockets.on("connect", async (socket) => {
    console.log(`Connected to ${socket.id}`);
    /// authenticate user
    const authenticated = (cb) => async (data) => {
      const user = await User.findOne({ _id: data.userId });
      //   console.log("****************" + data.userId);
      //   console.log(user);

      if (!user) {
        socket.emit({ message: "Unauthenticated", success: false, data: {} });
        return socket.disconnect();
      }
      await cb({ user: JSON.parse(JSON.stringify(user)), ...data });
    };
    //// user enter
    socket.on(
      "user-enter",
      authenticated(async ({ user }) => {
        console.log(`User enter Connected to ${socket.id}`);
        //////////// user info SUBSCRIBE
        const f = async () => {
          try {
            ///////// notifications
            const notifictations = await Notification.find({
              $or: [
                {
                  $and: [
                    { notifyType: { $ne: "sendMessage" } },
                    { receiver: user._id },
                    { actionTaken: false },
                  ],
                },
                {
                  $and: [
                    { notifyType: { $ne: "sendMessage" } },
                    { multireceiver: { $in: [user._id] } },
                    { isSeen: { $not: { $elemMatch: { $eq: user._id } } } },
                  ],
                },
              ],
            });
            // console.log(notifictations.length, notifictations.length, user);

            const sizenotif = notifictations.length;
            let action;
            sizenotif > 0 ? (action = false) : (action = true);
            ///////////////////////////////////
            ///////// Chat Count
            let messagescount = 0;
            let ChatRooms;
            ChatRooms = await Chat.find({ users: { $in: [user._id] } }).sort(
              "-updatedAt"
            );

            ChatRooms = JSON.parse(JSON.stringify(ChatRooms));

            for (let i = 0; i < ChatRooms.length; i++) {
              const dbMessages = await Message.find({
                $and: [
                  { chatId: ChatRooms[i]._id },
                  { seen: false },
                  { receiver: { $eq: user._id } },
                ],
              });

              ChatRooms[i].newMessages = dbMessages.length;
              messagescount = messagescount + dbMessages.length;
            }
            ////////////////////////////////////////
            // socket.emit('info', {...sendingData})
            socket.join(user._id);
            io.to(user._id).emit("notification", {
              success: true,
              message: "Notification Retrieved Successfully",
              data: { action: action, messages: messagescount },
            });
          } catch (e) {
            console.log(e);
          }
        };
        await f();
        userData[`${user._id}`] = f;
        userSocketID[`${socket.id}`] = user._id;

        //////////// user info SUBSCRIBE-end
        console.log(user, user._id);
        socket.join(user._id);
        await client.set(user._id);
        await getOnlineUsers();
      })
    );
    //// user leave
    socket.on(
      "user-leave",
      authenticated(async ({ user }) => {
        // user info sub leave
        delete userData[`${user._id}`];
        /// user info sub leave
        await client.del(user._id);
        await getOnlineUsers();
        socket.leave(user._id);
        io.to(user._id).emit("leaving", {
          success: true,
          message: "Socket left",
        });
      })
    );
    // get online users
    socket.on(
      "get-online-users",
      authenticated(async () => {
        await getOnlineUsers();
      })
    );

    socket.on(
      "get-inboxes",
      authenticated(async ({ user }) => {
        /////////////////// Chat Room Find
        console.log(`Get Inboxes Connected to ${socket.id}`);
        let ChatRooms;
        ChatRooms = await Chat.find({ users: { $in: [user._id] } }).sort(
          "-updatedAt"
        );

        ChatRooms = JSON.parse(JSON.stringify(ChatRooms));

        for (let i = 0; i < ChatRooms.length; i++) {
          const dbMessages = await Message.find({
            $and: [
              { chatId: ChatRooms[i]._id },
              { seen: false },
              { receiver: { $eq: user._id } },
            ],
          });

          ChatRooms[i].newMessages = dbMessages.length;
        }

        console.log("Rooms ==>", ChatRooms);

        if (ChatRooms.length < 1) {
          ChatRooms = null;
          io.to(user._id).emit("inboxes", {
            success: true,
            message: "Inbox Retrieved Succcessfully",
            // data: { inboxes: [...inboxes], },
            inboxes: [],
          });
        } else {
          // socket.join(user._id);
          io.to(user._id).emit("inboxes", {
            success: true,
            message: "Inbox Retrieved Succcessfully",
            // data: { inboxes: [...inboxes], },
            inboxes: [...ChatRooms],
          });
        }
      })
    );

    socket.on(
      "join-room",
      authenticated(async ({ user, inbox }) => {
        console.log("SELFID--->> ", user._id, "NEXTUSERID---->", inbox);
        let ChatRoom;
        ///////////// Receiver
        const receiveruser = await User.findById(inbox);
        //////////////
        //////////// Chat Room Find
        ChatRoom = await Chat.findOne({
          $and: [{ users: user._id }, { users: inbox }],
        });
        ////////////////////////
        const updatedMessages = await Message.updateMany(
          { sender: inbox, receiver: user._id },
          { seen: true }
        );
        console.log("updated msgs", updatedMessages);
        let messages;
        messages = await Message.find({
          $and: [
            {
              $or: [{ sender: user._id }, { receiver: user._id }],
            },
            {
              $or: [{ sender: inbox }, { receiver: inbox }],
            },
          ],
        })
          .populate("sender")
          .populate("receiver")
          .sort({ createdAt: -1 });

        //////////// MSGS Filtering
        messages = JSON.parse(JSON.stringify(messages));
        for (let i = 0; i < messages.length; i++) {
          if (messages[i].seen === false) {
            console.log("Test 1");
            if (messages[i].sender._id === user._id) {
              console.log("Test 2");
              messages[i].seen = true;
            }
          }
        }
        // .populate("receiver")
        // .populate("sender");
        const chatId = ChatRoom._id.toString();
        // socket.join(user._id);
        console.log("Room id:", chatId);
        socket.join(chatId);
        io.to(user._id).emit("messages", {
          success: true,
          message: "Messages Retrieved Successfully",
          receiver: receiveruser,
          messages: [...messages],
        });
      })
    );
    socket.on(
      "leave-room",
      authenticated(async ({ user, inbox }) => {
        console.log("SELFID--->> ", user._id, "NEXTUSERID---->", inbox);
        let ChatRoom;
        //////////// Chat Room Find
        ChatRoom = await Chat.findOne({
          $and: [{ users: user._id }, { users: inbox }],
        });
        ////////////////////////

        const chatId = ChatRoom._id.toString();
        console.log("Room id:", chatId);
        socket.leave(chatId);
        io.to(user._id).emit("leaving", {
          success: true,
          message: "Room left",
        });
      })
    );
    socket.on(
      "send-message",
      authenticated(async ({ user, to, message, messageType }) => {
        try {
          ///////////time
          // Get current date in UTC
          // Get current local time
          const currentLocalTime = moment();

          ///////////// Receiver
          const receiveruser = await User.findById(to);
          //////////////

          // Convert local time to UTC
          // const currentUtcTime = currentLocalTime.utc().utcOffset(1);

          // Convert UTC time to Unix timestamp
          const currentUnixTime = currentLocalTime.unix();

          console.log("Current Local Time:", currentLocalTime);
          // console.log("Current UTC Time:", currentUtcTime);
          console.log("Current Unix Timestamp:", currentUnixTime);
          ///////// time

          console.log("innnnn send msg start Startttttttttt");
          const receiver = await User.findOne({ _id: to });

          ///////////////// Room update
          let chat;

          chat = await Chat.findOne({
            $and: [{ users: user._id }, { users: to }],
          });
          const userr1 = to;
          const user2 = user._id;
          if (!chat) {
            const users = [userr1, user2];
            console.log(users);
            chat = await Chat.create({
              users: users,
              lastMsgSender: user2,
              LastMessage: message,
              messageTime: currentUnixTime,
              type: messageType,
            });
          } else {
            await Chat.findByIdAndUpdate(chat.id, {
              lastMsgSender: user2,
              LastMessage: message,
              messageTime: currentUnixTime,
              type: messageType,
            });
          }
          ///////////////// Room Login
          const chatId = chat._id.toString();
          console.log("Room id in send:", chatId);
          // socket.join(chatId);
          const joinedPeople = io.sockets.adapter.rooms.get(chatId);
          console.log("Room People:", joinedPeople);
          const joinedPeopleCount = joinedPeople ? joinedPeople.size : 0;

          //////////////////////

          ///////// create msg logic
          const dbMessage = await Message.create({
            chatId: chat._id,
            sender: user._id,
            receiver: to,
            message,
            messageTime: currentUnixTime,
            seen: joinedPeopleCount > 1 ? true : false,
            type: messageType,
          });

          const messages = await Message.find({
            $and: [
              {
                $or: [{ sender: user._id }, { receiver: user._id }],
              },
              {
                $or: [{ sender: to }, { receiver: to }],
              },
            ],
          })
            .populate("sender")
            .populate("receiver")
            .sort({ createdAt: -1 });

          //////////// Notify

          ///////////////////
          // await sendNotification({
          //   type: "sendMessage",
          //   sender: user,
          //   receiver,
          //   title: "sent message",
          //   deviceToken: receiver.deviceToken,
          //   body: `${user.name} sent you a message`,
          // });

          io.to(chatId).emit("messages", {
            success: true,
            message: "Messages Retrieved Successfully",
            receiver: receiveruser,
            messages: [...messages],
          });

          if (joinedPeopleCount < 2) {
            const tokens = [];
            const notificationData = [];
            const user1 = await User.findById(to);

            const userTokens = JSON.parse(
              JSON.stringify(await RefreshToken.find({ user: user1?.id }))
            ).map(({ deviceToken }) => deviceToken);

            if (user1.isNotification && userTokens.length > 0) {
              tokens.push(...userTokens);
              // notificationData.push({ ...user1 });
              if (tokens.length > 0) {
                console.log(tokens, user._id, user.name);
                await SendNotificationMultiCast({
                  tokens: tokens,
                  sender: user._id,
                  type: "sendMessage",
                  title: "New Message",
                  body: `${user.name} sent you a message`,
                  data: {
                    value: JSON.stringify(user),
                  },
                });
              }
            }
          }
          ////////////// Receiver Logic

          let ChatRooms;
          ChatRooms = await Chat.find({ users: { $in: [to] } }).sort(
            "-updatedAt"
          );

          ChatRooms = JSON.parse(JSON.stringify(ChatRooms));

          for (let i = 0; i < ChatRooms.length; i++) {
            const dbMessages = await Message.find({
              $and: [
                { chatId: ChatRooms[i]._id },
                { seen: false },
                { receiver: { $eq: to } },
              ],
            });

            ChatRooms[i].newMessages = dbMessages.length;
          }
          console.log("Rooms ==>", ChatRooms);

          if (ChatRooms.length < 1) {
            ChatRooms = null;
          }
          // socket.join(user._id);
          io.to(to).emit("inboxes", {
            success: true,
            message: "Inbox Retrieved Succcessfully",
            // data: { inboxes: [...inboxes], },
            inboxes: [...ChatRooms],
          });

          // io.emit("new-message", {
          //   success: true,
          //   message: "Messages Found Successfully",
          //   data: { message: dbMessage },
          // });
        } catch (error) {
          console.log(error);
        }
      })
    );

    socket.on("disconnect", async () => {
      console.log("User disconnected: ", socket.id);
      if (userSocketID[socket.id]) {
        await client.del(userSocketID[socket.id]);
        delete userSocketID[`${socket.id}`];
        if (userData[`${userSocketID[socket.id]}`]) {
          delete userData[`${userSocketID[socket.id]}`];
        }
      }
    });
  });
});

module.exports = { io };
