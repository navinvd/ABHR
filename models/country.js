var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var CountrySchema = new Schema({
    name: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default:true 
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
var Country = mongoose.model('countries', CountrySchema, 'countries');
module.exports = Country;