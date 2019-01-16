//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var CompanyHelp = new Schema({
    help: {
        trips_and_fare_away: { type: String, default: null },
        account_and_payment_options: { type: String, default: null },
        guide_to_abhr: { type: String, default: null },
        accessibility: { type: String, default: null },
    },
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
var Help = mongoose.model('company_help', CompanyHelp, 'company_help');
module.exports = Help;