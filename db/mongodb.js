"use strict";

const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    num: { type: Number, required: true }
  },
  { collection: 'tb_count', versionKey: false }
);

// the default mongodb url (local server)
const mongodbURL = process.env.DB_URL || "mongodb://127.0.0.1:27017";
mongoose.connect(mongodbURL);

const Count = mongoose.connection.model("Count", schema);

const allowSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
  },
  { collection: 'tb_allow', versionKey: false }
);
const Allow = mongoose.connection.model("Allow", allowSchema);

function getNum(name) {
  return Count.findOne({ name }, "-_id -__v").exec();
}

function getAll() {
  return Count.find({}, "-_id -__v").exec();
}

function setNum(name, num) {
  return Count.findOneAndUpdate(
    { name },
    { name, num },
    { upsert: true }
  ).exec();
}

function setNumMulti(counters) {
  const bulkOps = counters.map((obj) => {
    const { name, num } = obj;
    return {
      updateOne: {
        filter: { name },
        update: { name, num },
        upsert: true,
      },
    };
  });

  return Count.bulkWrite(bulkOps, { ordered: false });
}

// ---- tb_allow (counter name whitelist) ----
function allowGetAll() {
  return Allow.find({}, "-_id -__v").exec().then((rows) => rows.map((r) => r.name));
}

function allowAdd(name) {
  return Allow.findOneAndUpdate(
    { name },
    { name },
    { upsert: true, setDefaultsOnInsert: true }
  ).exec();
}

function allowRemove(name) {
  return Allow.deleteOne({ name }).exec();
}

module.exports = {
  getNum,
  getAll,
  setNum,
  setNumMulti,
  allowGetAll,
  allowAdd,
  allowRemove,
};
