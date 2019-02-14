var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const Help = require('./../models/user_help');
var async = require("async");

let user_help_Helper = {};

// list of companies 
user_help_Helper.AddArticle = async (insertData) => {
    try{
        var data = {
            topic : insertData.topic,
            description : insertData.description,
            userId: insertData.userId,
            userType: insertData.userType
        }
        if(insertData.userType === 'admin'){
            data = Object.assign(data, {"status" : "approved"});
        }else if(insertData.userType === 'agent'){
            data = Object.assign(data, {"status" : "requested"});
        }
        var ArticleModel = new Help(data);
        var Save = await ArticleModel.save();
        console.log('save====>', Save);
        if (Save !== null && Save !== '') {
            return { status: 'success', message: "Article Added Successfully", data: Save}
        }
        else {
            return { status: 'failed', message: "Article Not Added Successfully"};
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while adding article" };
    } 
};

// list of cars 
user_help_Helper.UpdateArticle = async (updateData) => {
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
user_help_Helper.NoOfRentals = async () => {
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
user_help_Helper.companyNoOfCars = async (company_id) => {
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
user_help_Helper.companyNoOfRentals = async (company_id) => {
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

module.exports = user_help_Helper;