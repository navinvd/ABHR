var express = require('express');
var router = express.Router();
var config = require('./../../config');
const smsHelper = require('./../../helper/sms');
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');

/**
 * @api {post} /app/sms/sendOTP Send otp on mobile number
 * @apiName Send OTP
 * @apiDescription Used to send otp to given mobile number
 * @apiGroup App - Car
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} mobile_number pass this inside body
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.post('/sendOTP', async (req, res) => {
    var schema = {
        'mobile_number': {
            notEmpty: true,
            errorMessage: "Please enter mobile number"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        console.log('Number=>',req.body.mobile_number);
        var mobile_number = parseInt(req.body.mobile_number);
        const sendOtpResp = await smsHelper.sendOTP(mobile_number);
        res.json(sendOtpResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});

// verify otp enter by user
router.post('/verifyOTP', async (req, res) => {
    var schema = {
        'otp': {
            notEmpty: true,
            errorMessage: "Please enter the otp which you have been received"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        console.log('OTP=>',req.body.otp);
        var otp = parseInt(req.body.otp);
        const verifyOtpResp = await smsHelper.verifyOTP(otp);
        res.json(verifyOtpResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});

module.exports = router;