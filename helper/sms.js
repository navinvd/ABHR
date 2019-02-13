var mongoose = require('mongoose');
var config = require('../config');
var User = require('../models/users');
var ObjectId = mongoose.Types.ObjectId;

let smsHelper = {};
const Nexmo = require('nexmo');

// send otp to given number
smsHelper.sendOTP = async (data) => {
    try {
        const nexmo = new Nexmo({
            apiKey: config.NEXMO_API_KEY,
            apiSecret: config.NEXMO_API_SECRET
        })

        const send_to = data.country_code + '' + data.mobile_number;
        const from = 'ABHR';
        const to = send_to;
        const otp = Math.floor(100000 + Math.random() * 900000);

        const resp = await nexmo.message.sendSms(from, to, otp);

        var user_id = { _id: new ObjectId(data.user_id) }
        // var new_data = { $set: { otp: otp, is_phone_verified: false } };
        var new_data = { $set: { otp: otp, phone_number_verified: 1, phone_number : data.mobile_number , country_code : data.country_code } };
        var datta = await User.update(user_id, new_data);

        if (datta.n > 0) {
            return { status: 'success', message: "Otp has been sent successfully", data : otp}
        }
        else {
            return { status: 'failed', message: "Error occured while sending otp" }
        }
    } catch (err) {
        console.log('Naxmo sms sending error', err);
        return { status: 'failed', message: "Error occured while sending otp" };
    }
};

smsHelper.verifyOTP = async (data) => {
    try {
        var userData = await User.find({ _id: new ObjectId(data.user_id) });
        if (userData && userData.length > 0) {

            // if(userData[0].is_phone_verified === true){
            if(userData[0].phone_number_verified === 2){
                return { status: 'success', message: "This number is all ready verified"}
            }
            if (userData[0].otp === data.otp) {
                var user_id = { _id: new ObjectId(data.user_id) }
                var new_data = { $set: { phone_number: data.mobile_number, country_code: data.country_code, phone_number_verified: 2 } };
                var datta = await User.update(user_id, new_data);
                if (datta.n > 0) {
                    return { status: 'success', message: "Mobile number has been verified successfully"}
                }
                else {
                    return { status: 'failed', message: "Error occured while verifying otp" }
                }
            }
            else{
                return { status: 'failed', message: "please enter the OTP which you have been received"}
            }
        }
        else {
            return { status: 'failed', message: "No user found with this user id" }
        }
    } catch (err) {
        return { status: 'failed', message: "Mobile number is not varified" };
    }
};



module.exports = smsHelper;