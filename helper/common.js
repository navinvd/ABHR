const Car = require('./../models/cars');
const CarBooking = require('./../models/car_booking');
const CarBrand = require('./../models/car_brand');
const CarCompany = require('./../models/car_company');
const CarModel = require('./../models/car_model');
const CarNotification = require('./../models/car_notification');
const CarNotificationSetting = require('./../models/car_notification_settings');
const Keywords = require('./../models/keyword');
const place = require('./../models/places');
const User = require('./../models/users');

let commonHelper = {};

commonHelper.getall = async function (model, conditions = {}, lookup=[],start = 0, length = 10) {
    var defaultQuery = [];
    if(typeof lookup != "undefined" && lookup != null && lookup.length != null && lookup.length > 0){
        lookup.forEach((ele)=>{
            let jsonObject = {
                $lookup: {
                    from: ele.tablename,
                    foreignField: ele.foreignField,
                    localField: ele.localFeild,
                    as: ele.alias,
                }
            }
            defaultQuery.push(jsonObject);
            let unwindObject = {
                $unwind: {
                    // "path": `${lookup.alias}`,
                    "path": "$" + lookup.alias ,
                    
                    
                    "preserveNullAndEmptyArrays": true
                }
            }
            defaultQuery.push(unwindObject);
        })  
    }
    try {
        const cars = await Car.aggregate(defaultQuery);
        if (cars && cars.length > 0) {
            return { status: 'success', message: "Car data found", data: cars }
        } else {
            return { status: 'failed', message: "No car available" };
        }
    } catch (err) {
        console.log("Err : ", err);
        return { status: 'failed', message: "Error occured while finding car", err };
    }

};

commonHelper.getcarDetailbyId = async function (car_id) {
    try {
        const carDetail = await Car.find({ _id: car_id });

        if (carDetail && carDetail.length > 0) {
            return { status: 'success', message: "Car data found", data: carDetail }
        } else {
            return { status: 'failed', message: "No car available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car list" };
    }
};

module.exports = carHelper;