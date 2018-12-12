//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var CarModelSchema = new Schema({
    car_gallery: [ String],
    release_year: {
        type: Number,
        required: true
    },
    model_name: {
        type: String,
        required: true
    },
    model_number:{
        type: String,
        required: true
    },
    description: {
        type: String,
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
var CarModel = mongoose.model('car_model', CarModelSchema, 'car_model');
module.exports = CarModel;