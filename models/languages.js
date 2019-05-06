//Require Mongoose
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var config = require('../config');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
//Define a schema
var Schema = mongoose.Schema;
var LanguageSchema = new Schema({

    page_id : {type : mongoose.Schema.Types.ObjectId, ref: 'language_page'},
    msg_constant : {
        type: String,
        required: true,
    },
    language_message_english: {
        type: String,
        default:null
    },
    language_message_arabic: {
        type: String,
        default:null
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    modifiedAt: {type: Date, default: Date.now}
}, {versionKey: false});

// Compile model from schema
var Language = mongoose.model('languages', LanguageSchema, 'languages');
module.exports = Language;