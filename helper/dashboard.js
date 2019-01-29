var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const Coupon = require('./../models/coupon');
const UserCoupon = require('./../models/user_coupon');
const Company = require('./../models/car_company');
const Car = require('./../models/cars');
let dashboardHelper = {};

// list of companies 
dashboardHelper.NoOfCompaines = async () => {
    try{
        let companies = await Company.find({"isDeleted": false}).count();
        if (companies !== null && companies !== '') {
            return { status: 'success', message: "Companies data found", data: companies}
        }
        else {
            return { status: 'failed', message: "Error occured while fetching coupon" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    } 
};

// list of companies 
dashboardHelper.NoOfCars = async () => {
    try{
        let cars = await Car.find({"isDeleted": false}).count();
        if (cars !== null && cars !== '') {
            return { status: 'success', message: "Cars data found", data: cars}
        }
        else {
            return { status: 'failed', message: "Error occured while fetching coupon" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    } 
};

module.exports = dashboardHelper;