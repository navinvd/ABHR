var express = require('express');
var router = express.Router();
var config = require('./../../config');
const smsHelper = require('./../../helper/sms');
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');
var User = require('./../../models/users');
var Company = require('./../../models/car_company');

/**
 * @api {post} /app/sms/sendOTP Send otp on mobile number
 * @apiName Send OTP to mobile number
 * @apiDescription Used to send otp to given mobile number
 * @apiGroup App - SMS
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id user id
 * @apiParam {Number} mobile_number mobile number
 * @apiParam {Number} country_code country code (eg. 91)

 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.post('/sendOTP', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'mobile_number': {
            notEmpty: true,
            errorMessage: "Please enter mobile number"
        },
        'country_code': {
            notEmpty: true,
            errorMessage: "Please enter country code eg.(91)"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var check_phone = await User.findOne({"_id": { $ne: new ObjectId(req.body.user_id)}, "phone_number": req.body.mobile_number, "isDeleted": false});
        if(check_phone !== null){
            var message = '';
            if(check_phone.type === 'agent'){
                message = 'Agent have already this phone number.';
            }else if(check_phone.type === 'user'){
                message = 'User have already this phone number.';
            }else if(check_phone.type === 'admin'){
                message = 'Super Admin have already this phone number.';
            }
            res.status(config.BAD_REQUEST).json({
                status: 'failed',
                message: message
            });
        }else{
            var check_phone = await Company.findOne({"phone_number": req.body.mobile_number, "isDeleted": false});
            if(check_phone !== null){
                res.status(config.BAD_REQUEST).json({
                    status: 'failed',
                    message: "Company have already this phone number."
                });
            }else{
                var data = {
                    user_id: req.body.user_id,
                    mobile_number: parseInt(req.body.mobile_number),
                    country_code: parseInt(req.body.country_code),
                }
                const sendOtpResp = await smsHelper.sendOTP(data);
        
                if(sendOtpResp.status === 'success'){
                    res.status(config.OK_STATUS).json(sendOtpResp);
                }
                else{
                    res.status(config.BAD_REQUEST).json(sendOtpResp);
                }
            }
        }
        // res.json(sendOtpResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});

/**
 * @api {post} /app/sms/verifyOTP Verify mobile number by mathching OTP
 * @apiName Verify OTP
 * @apiDescription Used to verify mobile number
 * @apiGroup App - SMS
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id user id
 * @apiParam {Number} mobile_number mobile number
 * @apiParam {Number} country_code country code (eg. 91)
 * @apiParam {Number} otp otp (eg. 859625)

 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/verifyOTP', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'mobile_number': {
            notEmpty: true,
            errorMessage: "Please enter mobile number"
        },
        'country_code': {
            notEmpty: true,
            errorMessage: "Please enter country code eg.(91)"
        },
        'otp': {
            notEmpty: true,
            errorMessage: "Please enter the otp which you have been received"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var data = {
            user_id: req.body.user_id,
            mobile_number: parseInt(req.body.mobile_number),
            country_code: parseInt(req.body.country_code),
            otp: parseInt(req.body.otp)
        }
        const verifyOtpResp = await smsHelper.verifyOTP(data);

        if(verifyOtpResp.status === 'success'){
            res.status(config.OK_STATUS).json(verifyOtpResp);
        }
        else{
            res.status(config.BAD_REQUEST).json(verifyOtpResp);
        }
        // res.json(verifyOtpResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});

module.exports = router;