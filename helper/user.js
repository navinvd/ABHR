var mongoose = require('mongoose');
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
var ObjectId = mongoose.Types.ObjectId;


let userHelper = {};

userHelper.getAllNotifications = async function (userId) {
    try {
        const notifications = await CarNotification.find({ "isDeleted": false, "userId": userId });
        if (notifications && notifications.length > 0) {
            return { status: 'success', message: "notification data found", data: notifications }
        } else {
            return { status: 'failed', message: "No notification available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding car", err };
    }
};

userHelper.getUsernotificationSettingData = async function (userId) {
    try {
        const notification_settingData = await CarNotificationSetting.find({ "isDeleted": false, "userId": userId });
        if (notification_settingData && notification_settingData.length > 0) {
            return { status: 'success', message: "notificationsetting data found", data: notification_settingData }
        } else {
            return { status: 'failed', message: "user is not found" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding car", err };
    }
};

userHelper.changeProfile = async (user_id, data) => {
    try {
        var userData = await User.find({ _id: new ObjectId(user_id) });

        console.log('isuyetety=>',userData);
        if (userData && userData.length > 0) {

            console.log('DATA=>>>>', data);
            var user_id = { _id: new ObjectId(user_id) }
            var new_data = { $set: data };
            var datta = await User.update(user_id, new_data);
            if (datta.n > 0) {
                return { status: 'success', message: "profile has been change successfully" }
            }
            else {
                return { status: 'failed', message: "Error occured while change profile" }
            }
        }
        else {
            return { status: 'failed', message: "No user found with this user id" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error accured while change profile" };
    }
};



module.exports = userHelper;