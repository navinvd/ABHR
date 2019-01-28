var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const Coupon = require('./../models/coupon');
const UserCoupon = require('./../models/user_coupon');
const Company = require('./../models/car_company');
let dashboardHelper = {};

// list of companies 
dashboardHelper.NoOfCompaines = async () => {
    try{
        let companies = await Company.find({"isDeleted": false}, {"name": 1});
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

module.exports = dashboardHelper;