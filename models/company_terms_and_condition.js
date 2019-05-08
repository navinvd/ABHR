//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var CompanyTermsAndConditionSchema = new Schema({
    CompanyId: {
        type: mongoose.Schema.Types.ObjectId
    },
    terms_and_conditions: {
        type: String,
        required: true
    },
    terms_and_conditions_arabic: {
        type: String,
        required: true
    },
    cancellation_policy_criteria: [{ hours: {type: Number}, rate: {type: Number} }],
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
var CompanyTermsAndConditionModel = mongoose.model('car_company_terms_and_condition', CompanyTermsAndConditionSchema, 'car_company_terms_and_condition');
module.exports = CompanyTermsAndConditionModel;
