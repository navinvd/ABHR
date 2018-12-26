var express = require('express');
var router = express.Router();

var config = require('./../../config');
const userHelper = require('./../../helper/user');
const mail_helper = require('./../../helper/mail');

var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');


/**
 * @api {get} /app/user/notifications/:userId List of notifications for perticular user
 * @apiName Car Notificationlist
 * @apiDescription To Display notification list
 * @apiGroup AppUser
 *
 * @apiParam {Array}  userId userId
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/notifications/:userId', async (req, res) => {
    var userId = req.params.userId;
    if (userId && (typeof userId != undefined && userId !=null)) {
        const notificationResp = await userHelper.getAllNotifications(new ObjectId(req.params.userId));
        res.json(notificationResp);
    } else{
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "userId required",
        });
    }
});

/**
 * @api {get} /app/user/notification_setting/:userId get notification setting data for perticular user
 * @apiName User Notificationsetting Data
 * @apiDescription To get Notificationsetting Data for perticular user
 * @apiGroup AppUser
 *
 * @apiParam {Array}  userId userId
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/notification_setting/:userId', async (req, res) => {
    var userId = req.params.userId;
    if (userId && (typeof userId != undefined && userId !=null)) {
        const notificationResp = await userHelper.getUsernotificationSettingData(new ObjectId(req.params.userId));
        res.json(notificationResp);
    } else{
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "userId required",
        });
    }
});

/**
 * @api {post} /app/user/changeProfile change user profile
 * @apiName Change user profile
 * @apiDescription Used to change first name and last name of user
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id user id
 * @apiParam {String} first_name first name
 * @apiParam {String} last_name last name
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// change first name and last name of user
router.post('/changeProfile', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'first_name': {
            notEmpty: true,
            errorMessage: "Please enter first name"
        },
        'last_name': {
            notEmpty: true,
            errorMessage: "Please enter last name"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var data = {}
        if(req.body.first_name){
            data.first_name = req.body.first_name
        }
        if(req.body.last_name){
            data.last_name = req.body.last_name
        }

        const profileResp = await userHelper.changeProfile(req.body.user_id, data);
        res.json(profileResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});


/**
 * @api {post} /app/user/sendEmail send email on user register email 
 * @apiName Send Otp to user by email
 * @apiDescription Used to send otp on user register email address
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id user id
 * @apiParam {String} email user register email 
 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

// Send otp on email id
router.post('/sendEmail', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'email': {
            notEmpty: true,
            errorMessage: "Please enter email address"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user_id = req.body.user_id;
        var options = {
            to: req.body.email,
            subject: 'ABHR - User email verification'
        }
        var data = {
            otp: Math.floor(100000 + Math.random() * 900000)
        }
        let mail_resp = await mail_helper.sendEmail("email_verification", options, data, user_id);
        if(mail_resp.status === 'success'){
            res.json({ status: 'success', message: "Otp has been sent to your email address", data : data.otp})
        }
        else{
            res.json({ status: 'failed', message: "Error accures while sending email to you"})
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});


/**
 * @api {post} /app/user/verifyOTP Verify user email address
 * @apiName Verify user email
 * @apiDescription Used to verify user email by matching OTP send by user
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id user id
 * @apiParam {Number} otp otp received by email
 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

// verify otp received by email
router.post('/verifyOTP', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'otp': {
            notEmpty: true,
            errorMessage: "Please enter the otp which you have been received by email"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var data = {
            user_id: req.body.user_id,
            otp: parseInt(req.body.otp)
        }
        const verifyOtpResp = await userHelper.verifyOTP(data);
        res.json(verifyOtpResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});


/**
 * @api {post} /app/user/changePassword change user password
 * @apiName Change user password
 * @apiDescription Used to change user password
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id user id
 * @apiParam {String} old_password Old Password
 * @apiParam {String} new_password New Password
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// change app user password
router.post('/changePassword', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'old_password': {
            notEmpty: true,
            errorMessage: "Please enter your old password"
        },
        'new_password': {
            notEmpty: true,
            errorMessage: "Please enter your new password"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var data = {
            "user_id" : req.body.user_id,
            "old_password" : req.body.old_password,
            "new_password" : req.body.new_password
        }
    
        const changePasswordResp = await userHelper.changePassword(data);
        res.json(changePasswordResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});






module.exports = router;