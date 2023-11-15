const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const cron = require("node-cron");
const app = require("./app");
const socketapi = require("./Utils/sockets");
require("./Utils/database");
const server = app.listen(process.env.PORT || 4500, () => {
  console.log(`App is running on port "${process.env.PORT}"`);
});
socketapi.io.attach(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
