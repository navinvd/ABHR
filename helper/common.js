const Car = require('./../models/cars');
const CarBooking = require('./../models/car_booking');
const CarBrand = require('./../models/car_brand');
const CarCompany = require('./../models/car_company');
const CarModel = require('./../models/car_model');
const Help = require('./../models/help');
const Help2 = require('./../models/user_help');
const Term_Condition = require('./../models/terms_conditions')
const CarNotification = require('./../models/car_notification');
const CarNotificationSetting = require('./../models/car_notification_settings');
const Keywords = require('./../models/keyword');
const place = require('./../models/places');
const Users = require('./../models/users');
const pushNotificationHelper = require('./../helper/push_notification');
var ObjectId = require('mongoose').Types.ObjectId;

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

commonHelper.getDatabyId = async function (model, id) {
    try {
        const carDetail = await model.find({ _id: id });

        if (carDetail && carDetail.length > 0) {
            return { status: 'success', message: "Car data found", data: carDetail }
        } else {
            return { status: 'failed', message: "No car available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car list" };
    }
};

// help
commonHelper.getHelp = async function (help_type) {
    try {
        // Help
        var setKey = '';
        if(help_type === 0){
            setKey = 'trips_and_fare_away'
        }
        else if(help_type === 1){
            setKey = 'account_and_payment_options'
        }   
        else if(help_type === 2){
            setKey = 'guide_to_abhr'
        }   
        else if(help_type === 3){
            setKey = 'accessibility'
        }
        else{
            setKey = 'trips_and_fare_away'
        }   
        
        let obj = {};
        // obj[`help.${setKey}`] = 1;
        obj[`${setKey}`] = 1;
        obj[`_id`] = 0;

        const helpDetail = await Help.findOne({},obj);
        
        if (helpDetail) {
            return { status: 'success', message: "Help has been found", data: { help : helpDetail } }
        } else {
            return { status: 'failed', message: "Sorry, currently there is no help" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while get help" };
    }
};

// help-v2
commonHelper.getHelp_v2 = async function () {
    try {
        // Help
        const helpDetail = await Help2.find({isDeleted : false}).lean().exec();
        
        if (helpDetail) {
            return { status: 'success', message: "Help has been found", data: { help : helpDetail } }
        } else {
            return { status: 'failed', message: "Sorry, currently there is no help" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while get help" };
    }
};



commonHelper.aboutus = async function (help_type) {
    try {
        // Help
        var setKey = '';
        if(help_type === 0){
            setKey = 'about_us'
        }
        else if(help_type === 1){
            setKey = 'copyright'
        }   
        else if(help_type === 2){
            setKey = 'term_condition'
        }   
        else if(help_type === 3){
            setKey = 'privacy_policy'
        }
        else{
            setKey = 'about_us'
        }   
        
        let obj = {};
        // obj[`help.${setKey}`] = 1;
        obj[`${setKey}`] = 1;
        obj[`_id`] = 0;

        const data = await Term_Condition.findOne({},obj);
        
        if (data) {
            return { status: 'success', message: "Help has been found", data: { data : data } }
        } else {
            return { status: 'failed', message: "Sorry, currently there is no help" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while get terms and conditions" };
    }
};



// send notification to user when car assign-v2 by agent for delivery or retun process
commonHelper.sendNoti = async function (userId,booking_number,msg){
    // when car assign by agent for delivery or return send notification to user
    /** push notification process to user app start */
    var userDeviceToken = await Users.find({ '_id': new ObjectId(userId) }, { _id: 0, deviceToken: 1, phone_number: 1, country_code: 1, deviceType: 1, email: 1, first_name: 1 }).lean().exec();

    var deviceToken = '';
    console.log('User token =>', userDeviceToken);
    if (userDeviceToken[0].deviceToken !== undefined && userDeviceToken[0].deviceToken !== null) {
        if (userDeviceToken[0].deviceToken.length > 10) { // temp condition
            deviceToken = userDeviceToken[0].deviceToken;
        }
    }
//"Your car is getting ready we will notify you once our agent is on their way to deliver you car"
    var notificationType = 1; // means notification for booking 
    console.log('Dev Token=>', deviceToken);
    if (userDeviceToken[0].deviceType === 'ios') {
        var sendNotification = await pushNotificationHelper.sendToIOS(deviceToken, booking_number, notificationType, msg);
        return sendNotification;
    } else if (userDeviceToken[0].deviceType === 'android') {
        var sendNotification = await pushNotificationHelper.sendToAndroidUser(deviceToken, booking_number, msg);
        return sendNotification;
    }
}



module.exports = commonHelper;