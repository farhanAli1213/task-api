const express = require("express");
const globalErrorHandler = require("./Controllers/errorControllers");
const { unhandledRoutes } = require("./Utils/unSpecifedRouteHandler");
const setupRoutesV1 = require("./Routes/routes");
const indexRoutes = require("./Routes/indexRoutes");

const app = express();
//Guards
app.use(require("./Utils/requestGuards"));


// Routes
app.use("/api/v1", setupRoutesV1());
app.use("/api/v1", indexRoutes);
// app.use("/", (_, res) => res.json({ success: true }));
// // Handling unhandled routes:
app.all("*", unhandledRoutes());
// Error handler middlware
app.use(globalErrorHandler);
module.exports = app;
