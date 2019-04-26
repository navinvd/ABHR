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
var bcrypt = require('bcrypt');
var config = require('../config');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var _ = require('underscore');


let userHelper = {};

userHelper.getAllNotifications = async function (userId) {
    try {
        const notifications = await CarNotification.find({ "isDeleted": false, "userId": userId });
        if (notifications && notifications.length > 0) {
            return { status: 'success', message: "notification data found", data: { notifications: notifications } }
        } else {
            return { status: 'failed', message: "No notification available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding notifications", err };
    }
};

userHelper.getUsernotificationSettingData = async function (userId) {

    try {
        const notification_settingData = await CarNotificationSetting.find({"isDeleted": false, "userId" : new ObjectId(userId)});
        if (notification_settingData && notification_settingData.length > 0) {
            return { status: 'success', message: "notificationsetting data found", data: { notificationData: notification_settingData[0] } }
        } else {
            return { status: 'failed', message: "user is not found" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding car", err };
    }
};


userHelper.change_notification_setting = async function (user_id,new_setting) {
    try {
        const notification_settingData = await CarNotificationSetting.update({ "isDeleted": false, "userId": user_id },{$set : new_setting });
        if (notification_settingData && notification_settingData.n > 0) {
            return { status: 'success', message: "notification setting has been changed", data: { notificationData: new_setting } }
        } else {
            return { status: 'failed', message: "notification setting has not been changed" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while changing notification setting", err };
    }
};


userHelper.removeNotification = async function (notification_id) {
    try {
        var data = await CarNotification.update({ _id: new ObjectId(notification_id) }, { $set: { isDeleted: true } })
        if (data && data.n > 0) {
            return { status: 'success', message: "notification has been removed" }
        } else {
            return { status: 'failed', message: "no notification found to remove" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while removing notification", err };
    }
};


// change first & last name of user
userHelper.changeProfile = async (user_id, data) => {
    try {
        var userData = await User.find({ _id: new ObjectId(user_id) });
        if (userData && userData.length > 0) {
            var user_id = { _id: new ObjectId(user_id) }
            var new_data = { $set: data };
            var datta = await User.update(user_id, new_data);
            if (datta.n > 0) {
                return { status: 'success', message: "profile name has been change successfully" }
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


// verify otp send in email
userHelper.verifyOTP = async (data) => {
    try {
        var userData = await User.find({ _id: new ObjectId(data.user_id) });
        if (userData && userData.length > 0) {

            if (userData[0].email_verified === 2) {
                return { status: 'success', message: "This email is all ready verified" }
            }
            if (userData[0].otp_email === data.otp) {
                var user_id = { _id: new ObjectId(data.user_id) }
                var new_data = { $set: { email_verified: 2 } };
                var datta = await User.update(user_id, new_data);
                if (datta.n > 0) {
                    return { status: 'success', message: "Email address has been verified successfully" }
                }
                else {
                    return { status: 'failed', message: "Error occured while verifying otp" }
                }
            }
            else {
                return { status: 'failed', message: "please enter the OTP which you have been received by email" }
            }
        }
        else {
            return { status: 'failed', message: "No user found with this user id" }
        }
    } catch (err) {
        return { status: 'failed', message: "Email address is not varified" };
    }
};

// change user password 
userHelper.changePassword = async (data) => {
    try {
        var userData = await User.find({ _id: new ObjectId(data.user_id) });
        if (userData && userData.length > 0) {
            if (bcrypt.compareSync(data.old_password, userData[0].password)) {
                var user_id = { _id: new ObjectId(data.user_id) }
                var data = { "password": bcrypt.hashSync(data.new_password, SALT_WORK_FACTOR) }
                var new_data = { $set: data };
                var datta = await User.update(user_id, new_data);
                if (datta.n > 0) {
                    return { status: 'success', message: "Password has been changed successfully" }
                }
                else {
                    return { status: 'failed', message: "Password has not been changed successfully" }
                }
            }
            else {
                return { status: 'failed', message: "Invalid old password" }
            }
        }
        else {
            return { status: 'failed', message: "No user found with this user id" }
        }
    }
    catch (err) {
        return { status: 'failed', message: "Error accured while change password" };
    }
};


// Add Address
userHelper.addAddress = async function (user_id, address_data) {
    try {
        var data = await User.update({ _id: new ObjectId(user_id) }, { $push: { address: address_data } });

            var user = await User.find({ _id: new ObjectId(user_id)}).lean().exec();

            var last_inserted_address = user[0].address.pop();

        // return { status: 'success', message: "Address has been added", data: { address: address_data } }
        return { status: 'success', message: "Address has been added", data: { address: last_inserted_address } }
    } catch (err) {
        return { status: 'failed', message: "Error occured while adding address" };
    }
};


// delete single or multiple Addresses of user
userHelper.deleteAddress = async function (user_id, address_ids) {
    try {
        var add_id = address_ids.map((b) => { return new ObjectId(b) });
        var data = await User.update({ _id: new ObjectId(user_id) }, { $pull: { "address" :  { _id : { $in : add_id } } } });
        if(data && data.n > 0){
            return { status: 'success', message: "Address has been deleted" }
        }
        else{
            return { status: 'failed', message: "Address Not deleted" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while deleting address" };
    }
};


// update user address V1
// userHelper.updateAddress = async function (user_id, address_id, new_address) {
//     try {
        
//         console.log('New Address : ',new_address);
//         var user = await User.findOne({_id : new ObjectId(user_id), "address._id" : address_id}).lean().exec();

//         if(user !== null){
//             var default_address = _.find(user.address, function(o){ return o._id == address_id })
//             console.log('Old ADDRESS=>',default_address);

//             if(new_address.hasOwnProperty("country")){
//                 default_address.country = new_address.country
//             }
//             if(new_address.hasOwnProperty("state")){
//                 default_address.state = new_address.state
//             }
//             if(new_address.hasOwnProperty("city")){
//                 default_address.city = new_address.city
//             }
//             if(new_address.hasOwnProperty("street")){
//                 default_address.street = new_address.street
//             }
//             if(new_address.hasOwnProperty("building")){
//                 default_address.building = new_address.building
//             }
//             if(new_address.hasOwnProperty("landmark")){
//                 default_address.landmark = new_address.landmark
//             }
//             if(new_address.hasOwnProperty("latitude")){
//                 default_address.latitude = new_address.latitude
//             }
//             if(new_address.hasOwnProperty("longitude")){
//                 default_address.longitude = new_address.longitude
//             }
            
//             console.log('New ADDRESS=>',default_address);
//         }

//         var data = await User.update({ _id: new ObjectId(user_id), "address._id" : address_id}, { $set : { "address.$" : default_address } } );
        
//         if(data && data.n > 0){
//             return { status: 'success', message: "Address has been updated", data : {address : default_address} }
//         }
//         else{
//             return { status: 'failed', message: "Address Not updated" }
//         }
//     } catch (err) {
//         return { status: 'failed', message: "Error occured while updated address" };
//     }
// };


// update user address V2
userHelper.updateAddress = async function (user_id, address_id, new_address) {
    try {
        
        console.log('New Address : ',new_address);
        var user = await User.findOne({_id : new ObjectId(user_id), "address._id" : address_id}).lean().exec();

        if(user !== null){
            var default_address = _.find(user.address, function(o){ return o._id == address_id })
        }

        new_address._id = default_address._id;

        // var data = await User.update({ _id: new ObjectId(user_id), "address._id" : address_id}, { $set : { "address.$" : default_address } } );
        var data = await User.update({ _id: new ObjectId(user_id), "address._id" : address_id}, { $set : { "address.$" : new_address } } );

        // other tech
            if( ! new_address.hasOwnProperty("country")){
                 new_address.country = null
            }
            if( ! new_address.hasOwnProperty("state")){
                new_address.state = null
            }
            if( ! new_address.hasOwnProperty("city")){
                new_address.city = null
            }
            if( ! new_address.hasOwnProperty("street")){
                new_address.street = null
            }
            if( ! new_address.hasOwnProperty("building")){
                new_address.building = null
            }
            if( ! new_address.hasOwnProperty("landmark")){
                new_address.landmark = null
            }
            if( ! new_address.hasOwnProperty("latitude")){
                new_address.latitude = null
            }
            if( ! new_address.hasOwnProperty("longitude")){
                new_address.longitude = null
            }
  
        if(data && data.n > 0){
            // return { status: 'success', message: "Address has been updated", data : {address : default_address} }
            return { status: 'success', message: "Address has been updated", data : {address : new_address} }
        }
        else{
            return { status: 'failed', message: "Address Not updated" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while updated address" };
    }
};


// Logout user
userHelper.logOut = async function (user_id, deviceToken) {
    try {
        var data = await User.updateOne({ _id : new ObjectId(user_id), "deviceToken" : deviceToken }, { $set : { "deviceToken" : null } }  );
        if(data && data.n > 0){
            return { status: 'success', message: "You have been logout successfully" }
        }
        else{
            return { status: 'success', message: "You have been logout successfully" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while logout user", err };
    }
};

// newPassword
userHelper.newPassword = async function (user_id, password) {
    try {
        var data = await User.updateOne({ _id : new ObjectId(user_id)}, { $set : { password : bcrypt.hashSync(password, SALT_WORK_FACTOR)  } } );

        if(data && data.n > 0){
            return { status: 'success', message: "Password has been change successfully" }
        }
        else{
            return { status: 'failed', message: "Password has not been change" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while change password", err };
    }
};

userHelper.getAllBookings = async function (user) {
    try {
        const bookings = await CarBooking.find({
                'isDeleted': false,
                'userId': new ObjectId(user)
                // add later
                // 'from_time': {
                //     $eq: moment().utcOffset(0).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toISOString()
                // },
                /*'from_time': {
                    $lte: new Date(),
                },
                'trip_status': { $nin: ['delivering', 'upcoming', 'returning'] }*/
            });
        if (bookings && bookings.length > 0) {
            return { status: 'success', message: "notification data found", data: { bookings: bookings } }
        } else {
            return { status: 'failed', message: "No notification available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding notifications", err };
    }
};


module.exports = userHelper;