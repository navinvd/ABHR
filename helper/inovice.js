var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var async = require("async");
const User = require('./../models/users');
const CarBooking = require('./../models/car_booking');
let invoiceHelper = {};

// list of companies 
invoiceHelper.Userinvoice = async (booking_id) => {
    try{
        var defaultQuery = [
            {
              "$match": {
                "isDeleted": false,
                "_id": new ObjectId(booking_id)
              }
            },
            {
              "$lookup": {
                "from": "cars",
                "localField": "carId",
                "foreignField": "_id",
                "as": "car_details",
              }
            },
            {
              "$unwind": {
                "path": "$car_details",
                "preserveNullAndEmptyArrays": true
              }
            },
            {
              "$lookup": {
                "from": "car_company",
                "localField": "car_details.car_rental_company_id",
                "foreignField": "_id",
                "as": "car_compnay"
              }
            },
            {
              "$unwind": "$car_compnay"
            },
            {
              "$lookup": {
                "from": "car_model",
                "localField": "car_details.car_model_id",
                "foreignField": "_id",
                "as": "car_model",
              }
            },
            {
              "$unwind": "$car_model"
            },
            {
              "$lookup": {
                "from": "car_brand",
                "localField": "car_details.car_brand_id",
                "foreignField": "_id",
                "as": "car_brand",
              }
            },
            {
              "$unwind": "$car_brand"
            },
            {
              "$lookup": {
                "from": "users",
                "localField": "userId",
                "foreignField": "_id",
                "as": "user_details",
              }
            },
            {
              "$unwind": {
                "path":  "$user_details",
                "preserveNullAndEmptyArrays": true,
              }
            },
            {
                "$lookup": {
                  "from": "car_company",
                  "localField": "car_details.car_rental_company_id",
                  "foreignField": "_id",
                  "as": "company_details",
                }
            },
            {
                "$unwind": {
                  "path":  "$company_details",
                  "preserveNullAndEmptyArrays": true,
                }
            },
            {
              "$project": {
                "_id": 1,
                "from_address": "$car_compnay.company_address.address",
                "car_model": "$car_model.model_name",
                "car_brand": "$car_brand.brand_name",
                "user_name": { $concat: [ "$user_details.first_name", " ", "$user_details.last_name" ]},
                "user_phone_number": "$user_details.phone_number",
                "to_address": "$user_details.phone_number",
                "delivery_address": 1,
                "vat": 1,
                "deposite_amount":1,
                "vat_amount": {
                    "$cond": {
                      "if": {"$eq":["$coupon_code", null]},
                      "then": {$divide :[
                                    {$multiply : [
                                        {$multiply : ["$booking_rent", "$days"]}, 
                                        "$vat"
                                    ]},
                                    100
                                ]},
                      "else":{
                          $divide :[
                                    {$multiply : [
                                        {$subtract: [ 
                                            {$multiply : ["$booking_rent", "$days"]},
                                            {$divide :[
                                                {$multiply : [
                                                    {$multiply : ["$booking_rent", "$days"]}, 
                                                    "$coupon_percentage"
                                                ]},
                                                100
                                            ]}
                                       ]}, 
                                        "$vat"
                                    ]},
                                    100
                                ]}
                            }
                },
                "car_class": 1,
                "milage": 1,
                "booking_number": 1,
                "total_booking_amount": 1,
                "release_year":"$car_model.release_year"
                }   
            }
        ];
        let invoiceData = await CarBooking.aggregate(defaultQuery);
        let admin = await User.findOne({"type": "admin", "isDeleted": false}, { _id :0, support_email:1, support_phone_number:1});
        // console.log('invoice Data=====<', invoiceData);
        if (invoiceData !== null && invoiceData !== '') {
            if(admin !==null && admin !== ''){
                invoiceData[0].email = admin.support_email;
                invoiceData[0].phone_number = admin.support_phone_number;
            }
            return { status: 'success', message: "Invoice data found", data: invoiceData[0]}
        }
        else {
            return { status: 'success', message: "No Company Data found", data: invoiceData[0]};
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    } 
};

module.exports = invoiceHelper;