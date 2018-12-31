var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var StateSchema = new Schema({
    country_id : mongoose.Schema.Types.ObjectId,
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
var State = mongoose.model('states', StateSchema, 'states');
module.exports = State;