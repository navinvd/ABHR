var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const Coupon = require('./../models/coupon');
const UserCoupon = require('./../models/user_coupon');
const Company = require('./../models/car_company');
const Car = require('./../models/cars');
const CarBooking = require('./../models/car_booking');
let dashboardHelper = {};

// list of companies 
dashboardHelper.NoOfCompaines = async () => {
    try{
        let companies = await Company.find({"isDeleted": false}).count();
        if (companies !== null && companies !== '') {
            return { status: 'success', message: "Companies data found", data: companies}
        }
        else {
            return { status: 'success', message: "No Company Data found", data:companies};
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    } 
};

// list of cars 
dashboardHelper.NoOfCars = async () => {
    try{
        let cars = await Car.find({"isDeleted": false}).count();
        if (cars !== null && cars !== '') {
            return { status: 'success', message: "Cars data found", data: cars}
        }
        else {
            return { status: 'success', message: "No car Data found" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    } 
};

// list of rentals 
dashboardHelper.NoOfRentals = async () => {
    try{
        let rentals = await CarBooking.find({"isDeleted": false}).count();
        if (rentals !== null && rentals !== '') {
            return { status: 'success', message: "Rental data found", data: rentals}
        }
        else {
            return { status: 'success', message: "No rental data found" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    } 
};

// list of cars for company 
dashboardHelper.companyNoOfCars = async (company_id) => {
    try{
        let cars = await Car.find({"isDeleted": false, "car_rental_company_id": new ObjectId(company_id)}).count();
        if (cars !== null && cars !== '') {
            return { status: 'success', message: "Cars data found", data: cars}
        }
        else {
            return { status: 'success', message: "No Car data found" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    } 
};

// list of retnals for company 
dashboardHelper.companyNoOfRentals = async (company_id) => {
    try{
        var defaultQuery = [
            {
              "$lookup": {
                "from": "cars",
                "foreignField": "_id",
                "localField": "carId",
                "as": "carDetails"
              }
            },
            {
              "$unwind": {
                "path": "$carDetails",
                "preserveNullAndEmptyArrays": true
              }
            },
            {
                "$match" : { "carDetails.car_rental_company_id" : new ObjectId(company_id)}
            },
            {
                "$group" : {
                      _id : "$carDetails.car_rental_company_id",
                      total: { $sum: 1 }
                }
            }
          ];
        let rentals = await CarBooking.aggregate(defaultQuery);
        if (rentals !== null && rentals !== '' && rentals.length !== 0) {
            return { status: 'success', message: "Rental data found", data: rentals[0].total}
        }
        else {
            return { status: 'success', message: "No rental data found" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" , err:e};
    } 
};

module.exports = dashboardHelper;