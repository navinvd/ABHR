//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var CarSchema = new Schema({
    car_rental_company_id: mongoose.Schema.Types.ObjectId,
    car_gallery: [ String],
    car_company: {
        type: String,
        required: true
    },
    car_model: {
        type: String,
        required: true
    },
    car_color: {
        type: String,
        required: true
    },
    rent_price:{
        type: Number,
        required: true
    },
    is_AC: {
        type: Boolean,
        default: false
    },
    is_luggage_carrier: {
        type: Boolean,
        default: false
    },
    licence_plate: {
        type: String,
        default: false
    },
    no_of_person: {
        type: Number,
        default: 0
    },
    is_avialable: {
        type: String,
        default: false
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
var Car = mongoose.model('cars', CarSchema, 'cars');
module.exports = Car;