//Require Mongoose
var mongoose = require('mongoose');
//Define a schema
var Schema = mongoose.Schema;
var TrackingSchema = new Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId
    },
    location:[Number],
    place_datetime: {
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
    is_car_reported : {
        type : Boolean,
        default : false
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
var Booking = mongoose.model('tracking', TrackingSchema, 'tracking');
module.exports = Booking;