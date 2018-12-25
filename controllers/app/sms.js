var express = require('express');
var router = express.Router();
var config = require('./../../config');
const smsHelper = require('./../../helper/sms');
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');

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
        var data = {
            user_id: req.body.user_id,
            mobile_number: parseInt(req.body.mobile_number),
            country_code: parseInt(req.body.country_code),
        }
        const sendOtpResp = await smsHelper.sendOTP(data);
        res.json(sendOtpResp);
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
        res.json(verifyOtpResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});

module.exports = router;