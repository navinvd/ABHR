//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var PlaceSchema = new Schema({
    google_place_id:{
        type: Number,
        required: true
    },
    place_name: {
        type: String,
        required: true
    },
    street: {
        type: String,
        required: true
    },
    street_no: {
        type: Number,
        required: true
    },
    postal:{
        type: Number,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    complete_address: {
        type: String,
        required: true
    },
    latitude:{
        type: Number,
        required: true
    },
    longitude:{
        type: Number,
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
var Place = mongoose.model('places', PlaceSchema, 'places');
module.exports = Place;