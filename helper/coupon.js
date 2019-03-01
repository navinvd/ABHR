var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const Coupon = require('./../models/coupon');
const UserCoupon = require('./../models/user_coupon');
const Company = require('./../models/car_company');
let couponHelper = {};

// add coupon 
couponHelper.addCoupon = async (data) => {
    let coopan = await Coupon.find({ coupon_code: data.coupon_code, isDeleted: false });
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

// update coupon 
couponHelper.updateCoupon = async (coupon_id, data, isunset) => {
    let coopan = await Coupon.findOne({ coupon_code: data.coupon_code, isDeleted: false, "_id": {$ne: new ObjectId(coupon_id)}});
    if (coopan) {
        return { status: 'failed', message: "Please try to add coupon with other coupon code" }
    }
    else {
        try {
            let check = await Coupon.findOne({ isDeleted: false, "_id": {$eq: new ObjectId(coupon_id)}});
            if(check){
                if(isunset){
                    if(check.hasOwnProperty('car_rental_company_id')){
                        let update_coupon = await Coupon.update({ "_id": new ObjectId(coupon_id)}, { $unset: {car_rental_company_id:1}, $set: data });
                    }else{
                        let update_coupon = await Coupon.update({ "_id": new ObjectId(coupon_id)}, { $set: data});
                    }
                } else{
                    let update_coupon = await Coupon.update({ "_id": new ObjectId(coupon_id)}, { $set: data});
                } 
            }
            if(isunset){
                let update_coupon = await Coupon.update({ "_id": new ObjectId(coupon_id)}, { $unset: {car_rental_company_id:1}, $set: data });
            } else{
                let update_coupon = await Coupon.update({ "_id": new ObjectId(coupon_id)}, { $set: data});
            }
            return { status: 'success', message: "Coupon has been updated"}
        } catch (err) {
            return { status: 'failed', message: "Error occured while updating coupon" };
        }
    }
};

// delete coupon 
couponHelper.deleteCoupon = async (coupon_id) => {
    let coopan = await Coupon.findOne({ isDeleted: false, "_id": new ObjectId(coupon_id)});
    if (coopan) {
        try {
            let update_coupon = await Coupon.update({ "_id": new ObjectId(coupon_id)}, { $set: {"isDeleted": true}});
            return { status: 'success', message: "Coupon has been deleted"}
        } catch (err) {
            return { status: 'failed', message: "Error occured while updating coupon" };
        }
    }
    else {
        return { status: 'failed', message: "no record found with this data" }
    }
};

// get by id coupon 
couponHelper.getByIdCoupon = async (coupon_id) => {
    let coopan = await Coupon.findOne({ "_id": new ObjectId(coupon_id), isDeleted: false});
    if (coopan) {
        return { status: 'success', message: "Coupon data found", data: coopan }
    }
    else {
        return { status: 'failed', message: "Error occured while fetching coupon" };
    }
};

// check coupon 
couponHelper.checkCoupon = async (data) => {
    try{
        let coopan = await Coupon.findOne(data);
        if (coopan !== null && coopan !== '') {
            return { status: 'success', message: "Coupon data found"}
        }
        else {
            return { status: 'failed', message: "Error occured while fetching coupon" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    }
    
};

couponHelper.applyCoupon = async (user_id, coupon_code) => {
    try {
        // check in coupon table
        // var coupon = await Coupon.find({ coupon_code: { $eq: coupon_code } });
        var coupon = await Coupon.find({ coupon_code: { $eq: coupon_code }, isDeleted : false });
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
                // let data = {
                //     "couponId": coupon[0]._id,
                //     "userId": user_id
                // }
                // let add_user_coupon = new UserCoupon(data);
                // let apply = await add_user_coupon.save();
                // if (apply.is_coupon_applied) {
                //     console.log('APPLY===>', apply);
                //     return { status: 'success', message: "Coupon has been applied successfully", data: { discount: coupon[0].discount_rate } }
                // }
                // else {
                //     return { status: 'failed', message: "Error occured while applying coupon" };
                // }

                return { status: 'success', message: "Coupon has been applied successfully", data: { discount: coupon[0].discount_rate } }
            }
        }
        else {
            return { status: 'failed', message: "You are entering wrong coupon" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while applying coupon" };
    }
};

// list of companies 
couponHelper.companiList = async () => {
    try{
        let companies = await Company.find({"isDeleted": false}, {"name": 1}).collation({locale: "en" }).sort({"name": 1});
        if (companies !== null && companies !== '') {
            return { status: 'success', message: "Coupon data found", data: companies}
        }
        else {
            return { status: 'failed', message: "Error occured while fetching coupon" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    }
    
};



// coupon list
couponHelper.getCouponList = async (car_rental_company_id) => {
    try{
        // let coopan = await Coupon.find({isDeleted : false, car_rental_company_id: new ObjectId('5c454b325dfbfa318feb38a1')});
        let coopan = await Coupon.find({
            $and : [
                        {
                            $or : [
                                    {"car_rental_company_id": { $exists : false }},
                                    {"car_rental_company_id": { $eq : new ObjectId(car_rental_company_id)}}
                                 ]
                        },
                        {
                           "isDeleted" : false
                        }
                   ]
            
        });

        if (coopan && coopan.length > 0) {
            return { status: 'success', message: "Coupons has been found", data : { coupons : coopan}}
        }
        else {
            return { status: 'failed', message: "No coupons has been found" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    }
    
};



module.exports = couponHelper;