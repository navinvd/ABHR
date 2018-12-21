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

let userHelper = {};

userHelper.getAllNotifications = async function (userId) {
    try {
        const notifications = await CarNotification.find({ "isDeleted": false, "userId": userId});
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
        const notification_settingData = await CarNotificationSetting.find({ "isDeleted": false, "userId": userId});
        if (notification_settingData && notification_settingData.length > 0) {
            return { status: 'success', message: "notificationsetting data found", data: notification_settingData }
        } else {
            return { status: 'failed', message: "user is not found" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding car", err };
    }
};


module.exports = userHelper;