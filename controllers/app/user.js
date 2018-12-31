var express = require('express');
var router = express.Router();

var config = require('./../../config');
const userHelper = require('./../../helper/user');
const mail_helper = require('./../../helper/mail');

var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');
var path = require('path');
var User = require('./../../models/users');
var async = require("async");

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

/**
 * @api {post} /app/user/idVerification Id card Verification
 * @apiDescription Used to add or update id card data
 * @apiName Id Card Details Update
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} front_image User's Id card front_image   
 * @apiParam {String} back_image User's Id card back_image
 * @apiParam {String} user_id UserId   
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.post('/idDataUpdate',(req, res, next) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        console.log('here');
        if (req.files) {
            console.log('here');
            const updateData = {
                    front_image: '',
                    back_image: '',
                    type: '0',
                }
            var mimetype = config.mimetypes;
            if((mimetype.indexOf(req.files['front_image'].mimetype) != -1) && (mimetype.indexOf(req.files['back_image'].mimetype) != -1)){
                async.waterfall([
                    function (callback) {
                        if(req.files['front_image']){
                            var file = req.files.front_image;
                            var dir = "./upload/user/id_images";
                            extention = path.extname(file.name);
                            frontfilename = "front_" + req.body.user_id + extention;
                            file.mv(dir + '/' + frontfilename, function (err) {
                                if (err) {
                                    callback(err);
                                } else {
                                    console.log('here in upload')
                                    updateData.front_image = frontfilename;
                                    callback(null, frontfilename);
                                }
                            });
                        }else{
                            callback(null);
                        }
                    },
                    function (frontfilename, callback) {
                        if(req.files['back_image']){
                            var file = req.files.back_image;
                            var dir = "./upload/user/id_images";
                            extention = path.extname(file.name);
                            backfilename = "back_" + req.body.user_id + extention;
                            file.mv(dir + '/' + backfilename, function (err) {
                                if (err) {
                                    return err;
                                } else {
                                    updateData.back_image = backfilename;
                                    callback(null, backfilename);
                                }
                            });
                        }else{
                            callback(null);
                        }
                    },
                    function (frontfilename, callback) {
                        User.update({_id: {$eq: new ObjectId(req.body.user_id)}}, {$set: { id_card: updateData, id_card_verification: 1}}, function (err, response) {
                            if (err) {
                                return next(err);
                            } else {
                                callback(null, updateData);
                            }
                        });
                    }
                ], function (err, result) {
                    console.log(result);
                    if (err) {
                        return next(err);
                    } else {
                        res.status(config.OK_STATUS).json({
                            status: 'success',
                            message: "Image uploaded successfully",
                            data : result
                        });
                    }
                });
            } 
            else{
                res.status(config.BAD_REQUEST).json({
                    status: 'failed',
                    message: "Please select appropriate file format",
                });
            }
        } else {
            res.status(config.BAD_REQUEST).json({
                status: 'failed',
                message: "No file selected",
                files: req.files
            });
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});

/**
 * @api {post} /app/user/licenceDataUpdate  Licence Details Verification
 * @apiDescription Used to add or update licence data
 * @apiName Licence Details Update
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} [front_image] User's Id card front_image   
 * @apiParam {String} [back_image] User's Id card back_image
 * @apiParam {String} user_id UserId
 * @apiParam {String} licence_no user's licence number
 * @apiParam {String} country user's country
 * @apiParam {String} issue_date licence issueDate
 * @apiParam {String} expiry_date licence expiryDate   
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/licenceDataUpdate',(req, res, next) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
       
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        console.log('here');
        if (req.files) {
            console.log('here');
            const updateData = {
                    front_image: '',
                    back_image: '',
                    number: req.body.licence_no,
                    country: req.body.country,
                    issue_date: req.body.issue_date,
                    expiry_date: req.body.expiry_date
                }
                var mimetype = config.mimetypes;
            if((mimetype.indexOf(req.files['front_image'].mimetype) != -1) && (mimetype.indexOf(req.files['back_image'].mimetype) != -1)){
                async.waterfall([
                    function (callback) {
                        if(req.files['front_image']){
                            var file = req.files.front_image;
                            var dir = "./upload/user/licence";
                            extention = path.extname(file.name);
                            frontfilename = "front_" + req.body.user_id + extention;
                            file.mv(dir + '/' + frontfilename, function (err) {
                                if (err) {
                                    callback(err);
                                } else {
                                    console.log('here in upload')
                                    updateData.front_image = frontfilename;
                                    callback(null, frontfilename);
                                }
                            });
                        }else{
                            callback(null);
                        }
                    },
                    function (frontfilename, callback) {
                        if(req.files['back_image']){
                            var file = req.files.back_image;
                            var dir = "./upload/user/licence";
                            extention = path.extname(file.name);
                            backfilename = "back_" + req.body.user_id + extention;
                            file.mv(dir + '/' + backfilename, function (err) {
                                if (err) {
                                    return err;
                                } else {
                                    updateData.back_image = backfilename;
                                    callback(null, backfilename);
                                }
                            });
                        }else{
                            callback(null);
                        }
                    },
                    function (frontfilename, callback) {
                        User.update({_id: {$eq: new ObjectId(req.body.user_id)}}, {$set: { driving_license: updateData, driving_license_verification: 1}}, function (err, response) {
                            if (err) {
                                return next(err);
                            } else {
                                callback(null, updateData);
                            }
                        });
                    }
                ], function (err, result) {
                    console.log(result);
                    if (err) {
                        return next(err);
                    } else {
                        res.status(config.OK_STATUS).json({
                            status: 'success',
                            message: "Image uploaded successfully",
                            data : result
                        });
                    }
                });
            } 
            else{
                res.status(config.BAD_REQUEST).json({
                    status: 'failed',
                    message: "Please select appropriate file format",
                    files: req.files
                });
            }
        } else {
            res.status(config.BAD_REQUEST).json({
                status: 'failed',
                message: "No file selected",
            });
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});

/**
 * @api {get} /app/user/:id? User Details By Id
 * @apiName User Details By Id
 * @apiDescription Get User details By user id
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} id User Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/verification_details/:id', function (req, res, next) {
    User.findOne({_id: new ObjectId(req.params.id), "isDeleted" : false, "type": "user"},{"phone_number_verified":1 , "email_verified": 1, "driving_license_verification": 1, "id_card_verification": 1, "id_card":1, "driving_license":1}, function (err, data) {
        if (err) {
            return next(err);
        } else {
            res.status(config.OK_STATUS).json({
                status: "success",
                message: "user Details data Found",
                data: {user: data},
            });
        }
    });
});

module.exports = router;