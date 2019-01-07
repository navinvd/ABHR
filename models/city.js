var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var CitySchema = new Schema({
    state_id : mongoose.Schema.Types.ObjectId,
    name: {
        type: String,
        required: true
    },
    latitude: {type: Number, default: null},
    longitude: {type: Number, default: null},
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
var City = mongoose.model('cities', CitySchema, 'cities');
module.exports = City;