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
 * @api {Post} /app/user/notifications List of notifications for perticular user
 * @apiName Car Notificationlist
 * @apiDescription To Display notification list
 * @apiGroup AppUser
 *
 * @apiParam {String}  user_id user id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/notifications', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const notificationResp = await userHelper.getAllNotifications(new ObjectId(req.body.user_id));
        if (notificationResp.status === 'success') {
            res.status(config.OK_STATUS).json(notificationResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(notificationResp);
        }

    } else {
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
    if (userId && (typeof userId != undefined && userId != null)) {
        const notificationResp = await userHelper.getUsernotificationSettingData(new ObjectId(req.params.userId));
        res.json(notificationResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "userId required",
        });
    }
});

/**
 * @api {post} /app/user/remove-notification Remove Notification
 * @apiName Remove Notification
 * @apiDescription To Remove Notification
 * @apiGroup AppUser
 *
 * @apiParam {Number}  notification_id notification id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

// remove notification
router.post('/remove-notification', async (req, res) => {
    var schema = {
        'notification_id': {
            notEmpty: true,
            errorMessage: "Please enter notification id"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const notificationResp = await userHelper.removeNotification(req.body.notification_id);

        if (notificationResp.status === 'success') {
            res.status(config.OK_STATUS).json(notificationResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(notificationResp);
        }
        // res.json(notificationResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});


/**
 * @api {post} /app/user/change_notification_setting change notification setting for perticular user
 * @apiName Change Notificationsetting Data
 * @apiDescription To change Notificationsetting Data for perticular user
 * @apiGroup AppUser
 *
 * @apiParam {String}  user_id userId
 * @apiParam {Boolean}  account_updates_status account_updates_status (eg 0 - false , 1 - true )
 * @apiParam {Boolean}  accoundiscount_new_status accoundiscount_new_status (eg 0 - false , 1 - true )
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/change_notification_setting', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'account_updates_status': {
            notEmpty: true,
            errorMessage: "Please enter account_updates_status"
        },
        'accoundiscount_new_status': {
            notEmpty: true,
            errorMessage: "Please enter accoundiscount_new_status"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var  user_id =  req.body.user_id;
        var new_setting = {
            account_updates_status : req.body.account_updates_status,
            accoundiscount_new_status : req.body.accoundiscount_new_status
        }
        const notificationResp = await userHelper.change_notification_setting(user_id,new_setting);

        if(notificationResp.status === 'success'){
            res.status(config.OK_STATUS).json(notificationResp);
        }
        else{
            res.status(config.BAD_REQUEST).json(notificationResp);
        }

    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
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
        if (req.body.first_name) {
            data.first_name = req.body.first_name
        }
        if (req.body.last_name) {
            data.last_name = req.body.last_name
        }

        const profileResp = await userHelper.changeProfile(req.body.user_id, data);

        if (profileResp.status === 'success') {
            res.status(config.OK_STATUS).json(profileResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(profileResp);
        }

        // res.json(profileResp);
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
        if (mail_resp.status === 'success') {
            res.status(config.OK_STATUS).json({ status: 'success', message: "Otp has been sent to your email address", data: data.otp })
        }
        else {
            res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accures while sending email to you" })
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
        
        
        if (verifyOtpResp.status === 'success') {
            res.status(config.OK_STATUS).json(verifyOtpResp);
        }
        else {
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
            "user_id": req.body.user_id,
            "old_password": req.body.old_password,
            "new_password": req.body.new_password
        }
        const changePasswordResp = await userHelper.changePassword(data);
        if (changePasswordResp.status === 'success') {
            res.status(config.OK_STATUS).json(changePasswordResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(changePasswordResp);
        }
        // res.json(changePasswordResp);
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

router.post('/idDataUpdate', (req, res, next) => {
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
            if ((mimetype.indexOf(req.files['front_image'].mimetype) != -1) && (mimetype.indexOf(req.files['back_image'].mimetype) != -1)) {
                async.waterfall([
                    function (callback) {
                        if (req.files['front_image']) {
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
                        } else {
                            callback(null);
                        }
                    },
                    function (frontfilename, callback) {
                        if (req.files['back_image']) {
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
                        } else {
                            callback(null);
                        }
                    },
                    function (frontfilename, callback) {
                        User.update({ _id: { $eq: new ObjectId(req.body.user_id) } }, { $set: { id_card: updateData, id_card_verification: 1 } }, function (err, response) {
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
                            data: result
                        });
                    }
                });
            }
            else {
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
router.post('/licenceDataUpdate', (req, res, next) => {
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
            if ((mimetype.indexOf(req.files['front_image'].mimetype) != -1) && (mimetype.indexOf(req.files['back_image'].mimetype) != -1)) {
                async.waterfall([
                    function (callback) {
                        if (req.files['front_image']) {
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
                        } else {
                            callback(null);
                        }
                    },
                    function (frontfilename, callback) {
                        if (req.files['back_image']) {
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
                        } else {
                            callback(null);
                        }
                    },
                    function (frontfilename, callback) {
                        User.update({ _id: { $eq: new ObjectId(req.body.user_id) } }, { $set: { driving_license: updateData, driving_license_verification: 1 } }, function (err, response) {
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
                            data: result,
                            files: req.files
                        });
                    }
                });
            }
            else {
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
 * @api {get} /app/verification_details/:id  User Details By Id
 * @apiName User verification Details By Id
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
    User.findOne({ "_id": new ObjectId(req.params.id), "isDeleted": false, "type": "user" }, function (err, data) {
        if (err) {
            return next(err);
        } else {
            res.status(config.OK_STATUS).json({
                status: "success",
                message: "user Details data Found",
                data: { user: data },
            });
        }
    });
});

/**
 * @api {post} /app/user/add-address Add user addresses
 * @apiName Add Address
 * @apiDescription Used to add users multiple address
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id User Id
 * @apiParam {String} country country
 * @apiParam {String} state state
 * @apiParam {String} city city
 * @apiParam {String} [street] street
 * @apiParam {String} [building] building
 * @apiParam {String} [landmark] landmark
 * @apiParam {Number} [latitude] latitude
 * @apiParam {Number} [longitude] longitude
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

// Add Address api
router.post('/add-address', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'country': {
            notEmpty: true,
            errorMessage: "Please enter country"
        },
        'state': {
            notEmpty: true,
            errorMessage: "Please enter state"
        },
        'city': {
            notEmpty: true,
            errorMessage: "Please enter city"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user_id = req.body.user_id;
        var address_data = {
            'country': req.body.country,
            'state': req.body.state,
            'city': req.body.city,
            'street': req.body.street ? req.body.street : null,
            'building': req.body.building ? req.body.building : null,
            'landmark': req.body.landmark ? req.body.landmark : null,
            'latitude': req.body.latitude ? req.body.latitude : null,
            'longitude': req.body.longitude ? req.body.longitude : null,
        }
        const addressResp = await userHelper.addAddress(user_id, address_data);
        if (addressResp.status === 'success') {
            res.status(config.OK_STATUS).json(addressResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(addressResp);
        }

        // res.json(addressResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});



/**
 * @api {post} /app/user/addresses Get user addresses
 * @apiName Get User Addresses
 * @apiDescription Get user adddresses
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id User Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

// Get All address of user
router.post('/addresses', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user_id = req.body.user_id;
        var data = await User.find({ _id: ObjectId(user_id) });
        if (data && data.length > 0 && data[0].address.length > 0) {
            return res.status(config.OK_STATUS).json({ status: 'success', message: "Address has been found", data: { addresses: data[0].address } });
        }
        else {
            return res.status(config.BAD_REQUEST).json({ status: 'failed', message: "No Address for this user" });
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

/**
 * @api {post} /app/user/addresses/delete Delete user addresses
 * @apiName Delete user addresses
 * @apiDescription Used to delete user signle or multiple addresses at a time
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id User Id
 * @apiParam {Array} address_id array of address ids (eg. ["5c31cc44ee8cb81ef4d66b87","5c3469462d159a027718aea9"])
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// Delete address of users multiple
router.post('/addresses/delete', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'address_id': {
            notEmpty: true,
            errorMessage: "Please enter address ids"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var user_id = req.body.user_id;
        var address_ids = req.body.address_id;
        const addressResp = await userHelper.deleteAddress(user_id, address_ids);

        if (addressResp.status === 'success') {
            res.status(config.OK_STATUS).json(addressResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(addressResp);
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

/**
 * @api {post} /app/user/addresses/delete-v2 Delete user addresses
 * @apiName Delete user addresses for version 2
 * @apiDescription Used to delete user signle or multiple addresses at a time
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id User Id
 * @apiParam {Array} addresses_id array of address ids (eg. ["5c31cc44ee8cb81ef4d66b87","5c3469462d159a027718aea9"])
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// Delete address of users multiple
router.post('/addresses/delete-v2', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'addresses_id': {
            notEmpty: true,
            errorMessage: "Please enter addresses ids"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var user_id = req.body.user_id;
        var address_ids = req.body.addresses_id;
        const addressResp = await userHelper.deleteAddress(user_id, addresses_id);

        if (addressResp.status === 'success') {
            res.status(config.OK_STATUS).json(addressResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(addressResp);
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

/**
 * @api {post} /app/user/addresses/update Update user address 
 * @apiName  Update user address
 * @apiDescription Used to Update user address one at a time
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id User Id
 * @apiParam {Number} address_id address id of user
 * @apiParam {String} [country] country
 * @apiParam {String} [state] state
 * @apiParam {String} [city] city
 * @apiParam {String} [street] street
 * @apiParam {String} [building] building
 * @apiParam {String} [landmark] landmark
 * @apiParam {Number} [latitude] latitude
 * @apiParam {Number} [longitude] longitude
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

// update user Address one at time
router.post('/addresses/update', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'address_id': {
            notEmpty: true,
            errorMessage: "Please enter address id"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user_id = req.body.user_id;
        var address_id = req.body.address_id;
        var address_data = {};

        if (req.body.country) {
            address_data.country = req.body.country;
        }
        if (req.body.state) {
            address_data.state = req.body.state;
        }
        if (req.body.city) {
            address_data.city = req.body.city;
        }
        if (req.body.street) {
            address_data.street = req.body.street;
        }
        if (req.body.building) {
            address_data.building = req.body.building;
        }
        if (req.body.landmark) {
            address_data.landmark = req.body.landmark;
        }
        if (req.body.latitude) {
            address_data.latitude = req.body.latitude;
        }
        if (req.body.longitude) {
            address_data.longitude = req.body.longitude;
        }

        const addressResp = await userHelper.updateAddress(user_id, address_id, address_data);

        if (addressResp.status === 'success') {
            res.status(config.OK_STATUS).json(addressResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(addressResp);
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});



/**
 * @api {post} /app/user/logout Logout user 
 * @apiName Logout user
 * @apiDescription Used to Logout user from login device
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id User Id
 * @apiParam {Number} deviceToken deviceToken
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

// logout user
router.post('/logout', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'deviceToken': {
            notEmpty: true,
            errorMessage: "Please enter your device token"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user_id = req.body.user_id;
        var deviceToken = req.body.deviceToken;

        const logoutResp = await userHelper.logOut(user_id, deviceToken);

        if (logoutResp.status === 'success') {
            res.status(config.OK_STATUS).json(logoutResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(logoutResp);
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


/**
 * @api {post} /app/user/new-password set new password
 * @apiName new password
 * @apiDescription Used to set new password in user account
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id User Id
 * @apiParam {Number} password new password
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

// New password only for agent app we have change password api for user app
router.post('/new-password', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'password': {
            notEmpty: true,
            errorMessage: "Please enter your new password"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user_id = req.body.user_id;
        var password = req.body.password;
        
        const passwordResp = await userHelper.newPassword(user_id, password);

        if (passwordResp.status === 'success') {
            res.status(config.OK_STATUS).json(passwordResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(passwordResp);
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});




module.exports = router;