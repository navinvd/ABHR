var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const CarBooking = require('./../models/car_booking');
const CarBrand = require('./../models/car_brand');
const CarCompany = require('./../models/car_company');
const CarModel = require('./../models/car_model');
const Country = require('./../models/country');
const State = require('./../models/state');
const City = require('./../models/city');
const CarHandOver = require('./../models/car_hand_over');
const CarReceive = require('./../models/car_receive');
const CarReport = require('./../models/car_report');
const CompanyTemrsAndCondition = require('./../models/company_terms_and_condition');
const TemrsAndCondition = require('./../models/terms_and_conditions');
const moment = require('moment');
const _ = require('underscore');
var config = require('./../config');
var fs = require('fs');
var paths = require('path');
var async = require("async");

let termsandconditionHelper = {};


termsandconditionHelper.getDataByuserId = async function (userId) {
    try {
        console.log("Default Query => ", JSON.stringify(defaultQuery));
        let admin = await TemrsAndCondition.findOne({"_id": ObjectId(userId), "type": "admin"});
        return admin;
        // if (admin && admin.length > 0) {

        //     cars = cars.map((c) => {
        //         c.car["total_avg_rating"] = c.total_avg_rating;
        //         delete c.car.reviews;
        //         return c.car;
        //     })

        //     return { status: 'success', message: "Car data found", data: { cars: cars } }
        // } else {
        //     return { status: 'failed', message: "No car data found" }
        // }
    } catch (err) {
        console.log("Err : ", err);
        return { status: 'failed', message: "Error occured while finding car", err };
    }
};
module.exports = termsandconditionHelper;