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
    car_model: mongoose.Schema.Types.ObjectId,
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
    avg_rating:{
        type: Number,
    },
    is_automatic: {
        type: String,
        default: true,
    },
    is_open_milage: {
        type: Boolean,
        default: true
    },
    car_type: {
        type: String,
        enum: ["economy", "luxury", "suv", "family"]
    },
    driving_eligibility_criteria: {
        type: Number,
        default: 18,
    },
    is_avialable: {
        type: Boolean,
        default: true
    },
    is_delieverd: {
        type: Boolean,
        default: true
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