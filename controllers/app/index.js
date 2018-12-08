var express = require('express');
// var auth = require('./../middlewares/auth');
var router = express.Router();
var path = require('path');
var async = require("async");
var User = require('./../../models/users');
var config = require('./../../config');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');

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
 * @api {post} /fb_login Facebook Login
 * @apiName Facebook Login
 * @apiDescription Used for customer facebook login
 * @apiGroup Root
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} email User email address
 * @apiParam {String} fb_id User Facebook ID
 * @apiParam {String} type Type of User ["user", "agent"] 
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/user/fb_login', async (req, res, next) => {
    var schema = {
        'email': {
            notEmpty: true,
            errorMessage: "Email is required"
        },
        'fb_id': {
            notEmpty: true,
            errorMessage: "fb_id is required"
        },
        'type': {
            notEmpty: true,
            errorMessage: "Type is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user = await User.findOne({'fb_id': req.body.fb_id}).exec();
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
            var userData = req.body;
            userData.name = userData.username;
            userData.username = "facebook_" + userData.username.replace(/\s+/g, '-').toLowerCase();
            userData['is_email_verified'] = true;
            var userModel = new User(userData);
            userModel.save(function (err, data) {
                if (err) {
                    if (err.code == '11000') {
                        if (err.message.indexOf('username') != -1) {
                            res.status(config.BAD_REQUEST).json({
                                message: "Username alrady exist",
                                error: errors
                            });
                        } else if (err.message.indexOf('email') != -1) {
                            res.status(config.BAD_REQUEST).json({
                                message: "Email alrady exist",
                                error: errors
                            });
                        } else {
                            return next(err);
                        }
                    } else {
                        return next(err);
                    }
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

module.exports = router;