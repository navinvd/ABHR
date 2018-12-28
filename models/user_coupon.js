//Require Mongoose
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var config = require('./../config');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
//Define a schema
var Schema = mongoose.Schema;
var UserCouponSchema = new Schema({
    couponId: {
        type: mongoose.Schema.Types.ObjectId
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId
    },
    is_coupon_applied: {
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

var UserCoupon = mongoose.model('user_coupons', UserCouponSchema, 'user_coupons');
module.exports = UserCoupon;