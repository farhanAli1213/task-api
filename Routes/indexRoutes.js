const express = require("express");

;
const authController = require("../Controllers/authControllers");







const { query, getQueryDoc, getPostman } = require("../txQuery");


const _3 = require("../Utils/matchers");
const _4 = require("../Utils/postprocessors");

const router = express.Router();

// router.post("/query", authController.attemptProtect, async (req, res) => {
//   try {
//     const data = await lambdaQuery(req.body.queries, req.user);
//     // const results = []
//     // for(const q of req.body.queries) results.push(await query(q, req.user._id))
//     // const data = results
//     return res.json({ status: 200, status: true, message: "", data });
//   } catch (e) {
//     console.log(e);
//     return res.status(500).send({
//       status: 500,
//       success: false,
//       message: e,
//       data: {},
//     });
//   }
// });

// router.post("/localQuery", authController.attemptProtect, async (req, res) => {
//   try {
//     const results = [];
//     for (const q of req.body.queries)
//       results.push(await query(q, req.user._id));
//     const data = results;
//     return res.json({ status: 200, status: true, message: "", data });
//   } catch (e) {
//     console.log(e);
//     return res.status(500).send({
//       status: 500,
//       success: false,
//       message: e,
//       data: {},
//     });
//   }
// });

router.get("/postman/:name", async (req, res) => {
  try {
    const baseURL = req.protocol + "://" + req.get("host");
    console.log("BASE URL", baseURL);
    const fileData = await getPostman(
      baseURL,
      req.params.name,
      req.query.token
    );
    return res.send(fileData);
  } catch (e) {
    console.log(e);
    return res.status(500).send({
      status: 500,
      success: false,
      message: e,
      data: {},
    });
  }
});

router.get("/doc", async (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(await getQueryDoc());
});

// Protect all routes after this middleware
router.use(authController.protect);




module.exports = router