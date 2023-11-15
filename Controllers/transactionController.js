const Transaction = require("../Models/transactionModel");
const factory = require("./handlersFactory");

exports.updateTransaction = factory.updateOne(Transaction);
exports.getallTransaction = factory.getAll(Transaction);
exports.getOneTransaction = factory.getOne(Transaction);
exports.deleteTransaction = factory.deleteOne(Transaction);
