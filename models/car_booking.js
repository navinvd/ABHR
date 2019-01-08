//Require Mongoose
var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
//Define a schema
var Schema = mongoose.Schema;
var BookingSchema = new Schema({
    booking_number: {
        type: Number
    },
    carId: {
        type: mongoose.Schema.Types.ObjectId
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId
    },
    from_time: {
        type: Date,
    },
    to_time: {
        type: Date,
    },
    days: {
        type: Number,
        required: true
    },
    pick_up_placeId: {
        type: mongoose.Schema.Types.ObjectId
    },
    pick_up_place_datetime: {
        type: Date,
    },
    from_placeId: {
        type: mongoose.Schema.Types.ObjectId
    },
    to_placeId: {
        type: mongoose.Schema.Types.ObjectId
    },
    booking_rent: {
        type: Number,
        required: true
    },
    trip_status: {
        type: String,
        enum: ["inprogress", "cancelled", "finished", "upcoming"]
    },
    delivery_address: {
        type: String,
        required : true
    },
    delivery_time: {
        type:  String,
        required : true
    },
    coupon_code: {
        type:  String,
    },
    coupon_percentage: {
        type:  Number,
    },
    total_booking_amount: {
        type:  Number,
        required : true
    },
    latitude: {
        type: Number,
    },
    longitude: {
        type: Number,
    },
    AC_status: {
        type: Boolean,
        default: false
    },
    cancelBy: {
        type: mongoose.Schema.Types.ObjectId
    },
    cancel_comment: {
        type: String
    },
    cancel_reason: {
        type: String,
        default : null
    },
    cancel_date: {
        type: Date
    },
    isRate: {
        type: Boolean,
        default: false
    },
    ratingdate: Date,
    rating: {
        type: Number,
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
autoIncrement.initialize(mongoose.connection);
BookingSchema.plugin(autoIncrement.plugin, {model: 'car_booking', field: 'booking_number', startAt: 1000, incrementBy: 1});
var Booking = mongoose.model('car_booking', BookingSchema, 'car_booking');
module.exports = Booking;