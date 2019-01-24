var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const Coupon = require('./../models/coupon');
const UserCoupon = require('./../models/user_coupon');

let couponHelper = {};

// add coupon 
couponHelper.addCoupon = async (data) => {
    let coopan = await Coupon.find({ coupon_code: data.coupon_code });
    if (coopan && coopan.length > 0) {
        return { status: 'failed', message: "Please try to add coupon with other coupon code" }
    }
    else {
        let add_coupon = new Coupon(data);
        try {
            let data = await add_coupon.save();
            return { status: 'success', message: "Coupon has been added", data:data }
        } catch (err) {
            return { status: 'failed', message: "Error occured while adding new coupon" };
        }
    }
};


couponHelper.applyCoupon = async (user_id, coupon_code) => {
    try {
        // check in coupon table
        var coupon = await Coupon.find({ coupon_code: { $eq: coupon_code } });
        console.log('Coupon =>', coupon);
        if (coupon && coupon.length > 0) {
            // check appplied or not
            var user = await UserCoupon.find({
                $and: [
                    { userId: new ObjectId(user_id) },
                    { couponId: new ObjectId(coupon[0]._id) }
                ]
            });
            if (user && user.length > 0) {
                // all ready use this coupon 
                return { status: 'failed', message: "You have all ready use this coupon" };
            }
            else {
                // coupon applied successfully
                let data = {
                    "couponId": coupon[0]._id,
                    "userId": user_id
                }
                let add_user_coupon = new UserCoupon(data);
                let apply = await add_user_coupon.save();
                if (apply.is_coupon_applied) {
                    console.log('APPLY===>', apply);
                    return { status: 'success', message: "Coupon has been applied successfully", data: { discount: coupon[0].discount_rate } }
                }
                else {
                    return { status: 'failed', message: "Error occured while applying coupon" };
                }
            }
        }
        else {
            return { status: 'failed', message: "You are entering wrong coupon" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while applying coupon" };
    }
};






module.exports = couponHelper;