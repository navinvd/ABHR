//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var TermsAndConditionSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId
    },
    terms_and_conditions: {
        type: String,
        required: true
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
var TermsAndConditionModel = mongoose.model('terms_and_condition', TermsAndConditionSchema, 'terms_and_condition');
module.exports = TermsAndConditionModel;