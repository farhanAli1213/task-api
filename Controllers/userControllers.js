const multer = require("multer");
const sharp = require("sharp");
const User = require("../Models/userModel");
const catchAsync = require("./../Utils/catchAsync");
const AppError = require("./../Utils/appError");
const factory = require("./handlersFactory");
const Notification = require("../Models/Notification");
const paginationQueryExtracter = require("../Utils/paginationQueryExtractor");
const paginateArray = require("../Utils/paginationHelper");


const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single("photo");

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, "email");
  if (req.file) filteredBody.photo = req.file.filename;
  // 3) Update user document..
  const updatedUser = await User.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
  });

  res.status(200).json({
    status: 200,
    success: true,
    message: "Profile Updated Successfully",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 204,
    success: true,
    data: null,
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  let user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError("No User Found With Given Id ", 404));
  }

  return res.status(200).json({
    status: 200,
    success: true,
    user,
  });
});
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

/////////// Notifications
exports.mynotifications = catchAsync(async (req, res, next) => {
  const notifictations = await Notification.find({
    $and: [{ notifyType: { $ne: "sendMessage" } }, { receiver: req.user.id }],
  }).sort("-createdAt");

  const notifictationsmulti = await Notification.find({
    $and: [
      { notifyType: { $ne: "sendMessage" } },
      { multireceiver: { $in: [req.user.id] } },
    ],
  }).sort("-createdAt");

  await Notification.updateMany(
    {
      $and: [
        { isSeen: { $not: { $elemMatch: { $eq: req.user.id } } } },
        { multireceiver: { $elemMatch: { $eq: req.user.id } } },
      ],
    },
    { $addToSet: { isSeen: req.user.id } }
  );

  //////////////////
  let records;
  records = JSON.parse(JSON.stringify(notifictationsmulti));
  console.log("RECORDS: ", records.length);
  for (let i = 0; i < records.length; i++) {
    if (records[i].isSeen && records[i].isSeen.length > 0) {
      if (records[i].isSeen.includes(JSON.parse(JSON.stringify(req.user.id)))) {
        records[i].actionTaken = true;
      } else {
        records[i].actionTaken = false;
      }
    } else {
      records[i].actionTaken = false;
    }
    console.log("A");
  }

  // records.push(JSON.parse(JSON.stringify(notifictations)));
  const mergedNotifications = records.concat(notifictations);
  // console.log(records);
  mergedNotifications.sort((a, b) => b.createdAt - a.createdAt);
  //////

  const filteredDocs = notifictations.filter((doc) => !doc.actionTaken);

  const ids = filteredDocs.map((doc) => doc._id);

  const update = {
    $set: {
      actionTaken: true,
    },
  };

  const filter = {
    _id: {
      $in: ids,
    },
  };

  await Notification.updateMany(filter, update);

  const data = paginateArray(
    mergedNotifications,
    req.query.page,
    req.query.limit
  );

  res.status(200).json({
    success: true,
    status: 200,
    size: mergedNotifications.length,
    data,
  });
});


exports.getCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find({})
  let countries = await Country.find({}).select('countryName');

  // let categoryList = []
  // let countryList = []
  // for (const category of categories) {
  //   categoryList.push(category.name)
  // }
  // for (const country of countries) {
  //   countryList.push(country.countryName)
  // }
  // console.log('countryList',countryList);

  res.status(200).json({
    status: 200,
    success: true,
    message: 'Data fetched successfully',
    // data: { categoryList, countryList },
    data: { countries, categories },
  });
});
