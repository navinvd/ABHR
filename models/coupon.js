//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var CouponSchema = new Schema({
    coupon_code: {
        type: String,
        required: true
    },
    car_rental_company_id: mongoose.Schema.Types.ObjectId,
    discount_rate: {
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
var Coupon = mongoose.model('coupons', CouponSchema, 'coupons');
module.exports = Coupon;