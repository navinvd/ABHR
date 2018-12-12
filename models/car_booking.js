//Require Mongoose
var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
//Define a schema
var Schema = mongoose.Schema;
var BookingSchema = new Schema({
    booking_number: {
        type: Number,
        required: true
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
        type: String
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
BookingSchema.plugin(autoIncrement.plugin, {model: 'car_booking', field: 'bookingId', startAt: 1000, incrementBy: 1});
var Booking = mongoose.model('car_booking', BookingSchema, 'car_booking');
module.exports = Booking;