'use strict'

let db

switch(process.env.DB_TYPE){
  case 'mongodb':
    db = require('./mongodb')
    break;
  case 'postgres':
    db = require('./postgres')
    break;
  case 'sqlite':
  default:
    db = require('./sqlite')
    break;
}

module.exports = db