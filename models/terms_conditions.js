//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var TNCShema = new Schema({
    about_us: { type: String, default: null },
    copyright: { type: String, default: null },
    term_condition: { type: String, default: null },
    privacy_policy: { type: String, default: null },
    about_us_arabic: { type: String, default: null },
    copyright_arabic: { type: String, default: null },
    term_condition_arabic: { type: String, default: null },
    privacy_policy_arabic: { type: String, default: null },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    modifiedAt: { type: Date, default: Date.now }
}, { versionKey: false });

// Compile model from schema
var Term_Condition = mongoose.model('terms_conditions', TNCShema, 'terms_conditions');
module.exports = Term_Condition;
