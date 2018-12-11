var express = require('express');
// var auth = require('./../middlewares/auth');

var path = require('path');
var async = require("async");
var User = require('./../../models/users');
var config = require('./../../config');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var moment = require('moment');
var mailHelper = require('./../../helper/mail');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var router = express.Router();

/**
 * @api {post} /app/registration Registration
 * @apiName Registration
 * @apiDescription Used for user registration
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} first_name FirstName
 * @apiParam {String} last_name LastName
 * @apiParam {String} email User email address 
 * @apiParam {String} password User Password 
 * @apiParam {String} deviceType Type of device ["ios", "anroid"]
 * @apiParam {String} deviceToken unique devicetoken
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/registration', (req, res, next) => {
    console.log('here0');
    var schema = {
        'first_name': {
            notEmpty: true,
            errorMessage: "Name is required"
        },
        'last_name': {
            notEmpty: true,
            errorMessage: "Username is required"
        },
        'email': {
            notEmpty: true,
            errorMessage: "Email is required"
        },
        'password': {
            notEmpty: true,
            errorMessage: "Password is required"
        },
        'devicType': {
            notEmpty: true,
            errorMessage: "deviceType is required"
        },
        'deviceToken': {
            notEmpty: true,
            errorMessage: "deviceToken is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var Data = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            password: req.body.password,
            email: req.body.email,
            deviceType: req.body.device_type,
            deviceToken:req.body.deviceToken,
            type:"user"
        };
        var userModel = new User(Data);
        userModel.save(function (err, userData) {
            console.log("data:", userData);
            if (err) {
                return next(err);
            } else {
                var token = jwt.sign({id: userData._id, type: userData.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                    expiresIn: 60 * 60 * 24 // expires in 24 hours
                });
                var result = {
                    message: "User registered successfully.",
                    data: userData,
                    token: token
                };
                // var option = {
                //     to: req.body.email,
                //     subject: 'ABHR Shore - Account verification'
                // }
                // var email_details = {
                //     expire_time: moment().add(1, 'h').toDate().getTime(),
                //     user_id: userData._id
                // };
                // var buffer = Buffer(JSON.stringify(email_details), 'binary').toString('base64');
                // var data = {link: config.FRONT_END_URL + 'mail_verification?detials=' + buffer}
                // mailHelper.send('verification_email', option, data, function (err, res) {
                //     if (err) {
                //         console.log("Mail Error:", err);
                //     } else {
                //         console.log("Mail Success:", res);
                //     }
                // })
                res.status(config.OK_STATUS).json(result);
            }
        });
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
})

/**
 * @api {post} /app/login Login
 * @apiName Login
 * @apiDescription Used for App user login
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} email User Email ID
 * @apiParam {String} password User Password 
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.post('/login', (req, res, next) => {
    var schema = {
        'email': {
            notEmpty: true,
            errorMessage: "Email is required"
        },
        'password': {
            notEmpty: true,
            errorMessage: "Password is required"
        },
        'devicType': {
            notEmpty: true,
            errorMessage: "deviceType is required"
        },
        'deviceToken': {
            notEmpty: true,
            errorMessage: "deviceToken is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        User.findOne({email: req.body.email, type: 'user'}, function (err, data) {
            if (err) {
                return next(err);
            } else {
                if (data) {
                    bcrypt.compare(req.body.password, data.password, function (err, result) {
                        if (result) {
                            if (data.is_verified) {
                                var token = jwt.sign({id: data._id, type: data.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                                    expiresIn: 60 * 60 * 24 // expires in 24 hours
                                });

                                res.status(config.OK_STATUS).json({
                                    message: "User authenticated successfully",
                                    result: data,
                                    token: token
                                });
                            } else {
                                res.status(config.BAD_REQUEST).json({
                                    message: "Please verify your email for successfull login",
                                    type: 'NOT_VERIFIED',
                                    result: {
                                        '_id': data._id,
                                        'email': data.email
                                    }
                                });
                            }
                        } else {
                            res.status(config.BAD_REQUEST).json({
                                message: "Password is wrong",
                            });
                        }
                    });
                } else {
                    res.status(config.BAD_REQUEST).json({
                        message: "Email is wrong",
                    });
                }
            }
        })
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
})

/**
 * @api {post} /app/social_login Facebook Login
 * @apiName Facebook Login
 * @apiDescription Used for user facebook login
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} email User email address
 * @apiParam {String} socialmediaID User socialmediaID
 * @apiParam {String} socialmediaType User socialmediaType ["facebook","google"]
 * @apiParam {String} user_type Type of User ["user", "agent"] 
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/social_login', async (req, res, next) => {
    var schema = {
        'email': {
            notEmpty: true,
            errorMessage: "Email is required"
        },
        'socialmediaID': {
            notEmpty: true,
            errorMessage: "fb_id is required"
        },
        'socialmediaType': {
            notEmpty: true,
            errorMessage: "socialMediaType is required"
        },
        'user_type': {
            notEmpty: true,
            errorMessage: "userType is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user = await User.findOne({'socialmediaID': req.body.socialmediaID, 'socialmediaType': req.body.socialmediaType}).exec();
        console.log("user:", user);
        if (user) {
            var token = jwt.sign({id: user._id, type: user.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                expiresIn: 60 * 60 * 24 // expires in 24 hours
            });
            var result = {
                message: "Login Successfull",
                result: user,
                token: token
            };
            res.status(config.OK_STATUS).json(result);
        } else {
            var Data = {
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                socialmediaID: req.body.socialmediaID,
                socialmediaType: req.body.socialmediaType,
                email: req.body.email,
                deviceType: req.body.device_type,
                deviceToken:req.body.deviceToken,
                type: req.body.user_type
            };
            var userModel = new User(Data);
            userModel.save(function (err, data) {
                if (err) {
                    return next(err);
                } else {
                    var token = jwt.sign({id: data._id, type: data.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                        expiresIn: 60 * 60 * 24 // expires in 24 hours
                    });
                    var result = {
                        message: "Login Successfull",
                        result: data,
                        token: token
                    };
                    res.status(config.OK_STATUS).json(result);
                }
            });
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

/**
 * @api {post} /app/google_login Google Login
 * @apiDescription Used for user google login
 * @apiName Google Login
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} email User email address
 * @apiParam {String} google_id User Google ID
 * @apiParam {String} user_type Type of User ["user", "agent"] 
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// router.post('/google_login', async (req, res, next) => {

//     var schema = {
//         'email': {
//             notEmpty: true,
//             errorMessage: "Email is required"
//         },
//         'socialmediaID': {
//             notEmpty: true,
//             errorMessage: "google_id is required"
//         },
//         'socialmediaType': {
//             notEmpty: true,
//             errorMessage: "socialMediaType is required"
//         },
//         'user_type': {
//             notEmpty: true,
//             errorMessage: "userType is required"
//         }
//     };
//     req.checkBody(schema);
//     var errors = req.validationErrors();
//     if (!errors) {
//         var user = await User.findOne({'socialmediaID': req.body.socialmediaID, 'socialmediaType': req.body.socialmediaType}).exec();
//         if (user) {
//             var token = jwt.sign({id: user._id, type: user.type}, config.ACCESS_TOKEN_SECRET_KEY, {
//                 expiresIn: 60 * 60 * 24 // expires in 24 hours
//             });
//             var result = {
//                 message: "Login Successfull",
//                 result: user,
//                 token: token
//             };
//             res.status(config.OK_STATUS).json(result);
//         } else {
//             var Data = {
//                 first_name: req.body.first_name,
//                 last_name: req.body.last_name,
//                 socialmediaID: req.body.socialmediaID,
//                 socialmediaType: req.body.socialmediaType,
//                 email: req.body.email,
//                 deviceType: req.body.device_type,
//                 deviceToken:req.body.deviceToken,
//                 type: req.body.user_type
//             };
//             var userModel = new User(Data);
//             userModel.save(function (err, data) {
//                 if (err) {
//                     return next(err);
//                 } else {
//                     var token = jwt.sign({id: data._id, type: data.type}, config.ACCESS_TOKEN_SECRET_KEY, {
//                         expiresIn: 60 * 60 * 24 // expires in 24 hours
//                     });
//                     var result = {
//                         message: "Login Successfull",
//                         result: data,
//                         token: token
//                     };
//                     res.status(config.OK_STATUS).json(result);
//                 }
//             });
//         }
//     } else {
//         res.status(config.BAD_REQUEST).json({
//             message: "Validation Error",
//             error: errors
//         });
//     }
// });

/**
 * @api {post} /forget_password Forgot Password
 * @apiDescription Used to send email for forgot password
 * @apiName Forget Password
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} email User email adrress   
 * @apiParam {String} user_type User Type ["agent", "user"]  
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/forget_password', async(req, res, next) => {
    var schema = {
        'email': {
            notEmpty: true,
            errorMessage: "email is required"
        },
        'user_type': {
            notEmpty: true,
            errorMessage: "user_typ is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user = await User.findOne({email: req.body.email, type: req.body.user_type}).exec();
        if (user) {
            var emailData = {
                expire_time: moment().add(1, 'h').toDate().getTime(),
                user_id: user._id
            };
            var option = {
                to: user.email,
                subject: 'ABHR - Request for reset password'
            }
            var buffer = Buffer(JSON.stringify(emailData), 'binary').toString('base64');
            var data = {link: config.FRONT_END_URL + 'reset_password?detials=' + buffer};
            mailHelper.send('forget_password', option, data, function (err, res) {
                if (err) {
                    console.log("Mail Error:", err);
                } else {
                    console.log("Mail Success:", res);
                }
            })
            res.status(config.OK_STATUS).json({
                message: "Check your mail to reset your account password",
            });
        } else {
            res.status(config.BAD_REQUEST).json({
                message: "User is not available with this email",
            });
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
})

module.exports = router;