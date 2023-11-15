const admin = require("firebase-admin");
let serviceAccount = require("../Utils/my-project-80bbb-firebase-adminsdk-njslv-1479ab5664.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = {
  sendNotification: ({ token, title, body, data }) =>
    new Promise(async (resolve, reject) => {
      try {
        console.log("dataaaa", data);
        console.log("FCM TOKEN: ", token);
        admin
          .messaging()
          .send({
            token: token,
            notification: {
              title,
              body,
            },
            data: { notification: JSON.stringify(data) },
          })
          .then((response) => {
            console.log("Message was sent successfully", response);
            resolve(response);
          })
          .catch((err) => {
            console.log("Error in sending message internally: ", err);
            resolve();
          });
      } catch (error) {
        console.log("ERROR", error);
        resolve();
      }
    }),

  sendNotificationMultiCast: ({ tokens, title, body, data }) =>
    new Promise(async (resolve, reject) => {
      try {
        console.log("dataaaa", data);
        console.log("FCM TOKENS: ", tokens);

        const message = {
          notification: {
            title,
            body,
          },
          data: { notification: JSON.stringify(data) },
          tokens: tokens,
        };

        admin
          .messaging()
          .sendMulticast(message)
          .then((response) => {
            console.log("Messages were sent successfully", response);
            resolve(response);
          })
          .catch((err) => {
            console.log("Error in sending messages: ", err);
            reject({
              message:
                err.message || "Something went wrong in sending notifications!",
            });
          });
      } catch (error) {
        console.log("ERROR", error);
        reject(error);
      }
    }),
};
