var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

let smsHelper = {};

// send otp to given number
smsHelper.sendOTP = async (mobile_number) => {
    try {
        return { status: 'success', message: "Otp has been sent successfully", data: mobile_number  }

    } catch (err) {
        return { status: 'failed', message: "Error occured while sending otp" };
    }
};

smsHelper.verifyOTP = async (otp) => {
    try {
        return { status: 'success', message: "Mobile number has been verified successfully", data: otp }

    } catch (err) {
        return { status: 'failed', message: "Mobile number is not varified" };
    }
};



module.exports = smsHelper;