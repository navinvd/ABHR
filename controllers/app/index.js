var express = require('express');
// var auth = require('./../middlewares/auth');

var path = require('path');
var async = require("async");
var User = require('./../../models/users');
var Company = require('./../../models/car_company');
var config = require('./../../config');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var moment = require('moment');
var mailHelper = require('./../../helper/mail');
var commonHelper = require('./../../helper/common');
var ObjectId = require('mongoose').Types.ObjectId;
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var router = express.Router();

var car = require('./car');
router.use('/car', car);

var user = require('./user');
router.use('/user', user);

var sms = require('./sms');
router.use('/sms', sms);

var coupon = require('./coupon');
router.use('/coupon', coupon);

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
 * @apiParam {String} user_type ["user", "agent"]
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/registration', async (req, res, next) => {
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
        'deviceType': {
            notEmpty: true,
            errorMessage: "deviceType is required"
        },
        'deviceToken': {
            notEmpty: true,
            errorMessage: "deviceToken is required"
        },
        'user_type': {
            notEmpty:true,
            errorMessage: "user_type is required"
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
            deviceType: req.body.deviceType,
            deviceToken:req.body.deviceToken,
            type: req.body.user_type,
            app_user_status: "only registered"
        };
        var usercheck  = await User.findOne({email: req.body.email, isDeleted: false});
        console.log('usercheck====>', usercheck);
        if(usercheck){
            res.status(config.OK_STATUS).json({
                status: 'failed',
                message: "Email is already exist!!"
            });
        }else{
            var companycheck = await Company.findOne({email: req.body.email});
            if(companycheck){
                res.status(config.OK_STATUS).json({
                    status: 'failed',
                    message: "Email is already exist!!"
                });
            }else{
                    var userModel = new User(Data);
                        userModel.save(function (err, userData) {
                            userData = JSON.parse(JSON.stringify(userData));
                            console.log("data:", userData);
                            if (err) {
                                res.status(config.BAD_REQUEST).json({
                                    status: 'failed',
                                    message: "could not register user please try again!!"
                                });
                            } else {
                                var token = jwt.sign({id: userData._id, type: userData.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                                    expiresIn: 60 * 60 * 24 // expires in 24 hours
                                });
                                delete userData.password;
                                delete userData.otp_email;
                                delete userData.otp;
                                delete userData.isDeleted;

                                console.log('userdata===>',userData);
                                const u = userData;

                                var option = {
                                    to: userData.email,
                                    subject: 'ABHR - Registration Notification'
                                }
                                var data = {
                                    first_name: userData.first_name,
                                    last_name: userData.last_name
                                }
                                mailHelper.send('/welcome_email', option, data, function (err, res) {
                                    if (err) {
                                        console.log('Mail Err:');
                                    } else {
                                        console.log('Mail Success:');
                                    }
                                })
                                var result = {
                                    status: 'success',
                                    message: "User registered successfully.",
                                    data: {user : userData},
                                    token: token
                                };
                                res.status(config.OK_STATUS).json(result);
                            }
                        });
            }
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
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
 * @apiParam {String} user_type ["user", "agent"]
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
        'deviceType': {
            notEmpty: true,
            errorMessage: "deviceType is required"
        },
        'deviceToken': {
            notEmpty: true,
            errorMessage: "deviceToken is required"
        },
        'user_type': {
            notEmpty: true,
            errorMessage: "user_type is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        User.findOne({email: req.body.email, type: req.body.user_type, isDeleted: false}, function (err, data) {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: 'failed',
                    message: "could not find user please try again!!"
                });
            } else {
                console.log(data);
                if (data) {
                    bcrypt.compare(req.body.password, data.password, async function (err, result) {
                        if (result) {
                                var updateArray = {
                                    "deviceType":req.body.deviceType,
                                    "deviceToken": req.body.deviceToken,
                                };
                                data.deviceToken =  req.body.deviceToken;
                                data.deviceType = req.body.deviceType;
                                var updaterecord = await User.update({"_id": data._id}, { $set: updateArray});
                                var token = jwt.sign({id: data._id, type: data.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                                    expiresIn: 60 * 60 * 24 // expires in 24 hours
                                });

                                data = JSON.parse(JSON.stringify(data));
                                delete data.password;
                                delete data.otp_email;
                                delete data.otp;
                                delete data.isDeleted;

                                const u = data;
                                res.status(config.OK_STATUS).json({
                                    status: 'success',
                                    message: "User authenticated successfully",
                                    data: {user : data},
                                    token: token
                                });
                        } else {
                            res.status(config.BAD_REQUEST).json({
                                status: "failed",
                                message: "Password is wrong",
                            });
                        }
                    });
                } else {
                    res.status(config.BAD_REQUEST).json({
                        status: 'failed',
                        message: "This email is not registered",
                    });
                }
            }
        })
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
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
            errorMessage: "socialmediaID is required"
        },
        'socialmediaType': {
            notEmpty: true,
            errorMessage: "socialMediaType is required"
        },
        'user_type': {
            notEmpty: true,
            errorMessage: "user_type is required"
        },
        'deviceType': {
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
        var user = await User.findOne({'socialmediaID': req.body.socialmediaID, 'socialmediaType': req.body.socialmediaType, isDeleted: false, type: req.body.user_type, email:req.body.email}).exec();
        console.log('user=====>',user);
        if (user) {
            var updateArray = {
                "deviceType":req.body.deviceType,
                "deviceToken": req.body.deviceToken,
            };
            user.deviceToken =  req.body.deviceToken;
            user.deviceType = req.body.deviceType;
            var updaterecord = await User.update({"_id": user._id}, { $set: updateArray});
            var token = jwt.sign({id: user._id, type: user.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                expiresIn: 60 * 60 * 24 // expires in 24 hours
            });

            user = JSON.parse(JSON.stringify(user));

            delete user.password;
            delete user.otp_email;
            delete user.otp;
            delete user.isDeleted;

            var result = {
                status: 'success',
                message: "Login Successfully",
                data: {user : user, first_time_register : false},
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
                    var result = {
                        status: 'failed',
                        message: err
                    };   
                } else {
                    var token = jwt.sign({id: data._id, type: data.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                        expiresIn: 60 * 60 * 24 // expires in 24 hours
                    });
                    var option = {
                        to: data.email,
                        subject: 'ABHR - Registration Notification'
                    }
                    var emailData = {
                        first_name: data.first_name,
                        last_name: data.last_name
                    }
                    mailHelper.send('/welcome_email', option, emailData, function (err, res) {
                        if (err) {
                            console.log('Mail Err:');
                        } else {
                            console.log('Mail Success:');
                        }
                    })
                    var result = {
                        status: 'success',
                        message: "Login Successfully",
                        data: {user : data, first_time_register : true},
                        token: token
                    };
                    res.status(config.OK_STATUS).json(result);
                }
            });
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error"
        });
    }
});


/**
 * @api {post} /app/social_login-v2 Facebook Login
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
router.post('/social_login-v2', async (req, res, next) => {
    var schema = {
        'email': {
            notEmpty: true,
            errorMessage: "Email is required"
        },
        'socialmediaID': {
            notEmpty: true,
            errorMessage: "socialmediaID is required"
        },
        'socialmediaType': {
            notEmpty: true,
            errorMessage: "socialMediaType is required"
        },
        'user_type': {
            notEmpty: true,
            errorMessage: "user_type is required"
        },
        'deviceType': {
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
        var user = await User.findOne({'socialmediaID': req.body.socialmediaID, 'socialmediaType': req.body.socialmediaType, isDeleted: false, type: req.body.user_type, email:req.body.email}).exec();
        console.log('user=====>',user);
        if (user) {
            var updateArray = {
                "deviceType":req.body.deviceType,
                "deviceToken": req.body.deviceToken,
            };
            user.deviceToken =  req.body.deviceToken;
            user.deviceType = req.body.deviceType;
            var updaterecord = await User.update({"_id": user._id}, { $set: updateArray});
            var token = jwt.sign({id: user._id, type: user.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                expiresIn: 60 * 60 * 24 // expires in 24 hours
            });

            user = JSON.parse(JSON.stringify(user));

            delete user.password;
            delete user.otp_email;
            delete user.otp;
            delete user.isDeleted;

            var result = {
                status: 'success',
                message: "Login Successfully",
                data: {user : user, first_time_register : false},
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
                    var result = {
                        status: 'failed',
                        message: err
                    };   
                } else {
                    var token = jwt.sign({id: data._id, type: data.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                        expiresIn: 60 * 60 * 24 // expires in 24 hours
                    });
                    // var option = {
                    //     to: data.email,
                    //     subject: 'ABHR - Registration Notification'
                    // }
                    // var emailData = {
                    //     first_name: data.first_name,
                    //     last_name: data.last_name
                    // }
                    // mailHelper.send('/welcome_email', option, emailData, function (err, res) {
                    //     if (err) {
                    //         console.log('Mail Err:');
                    //     } else {
                    //         console.log('Mail Success:');
                    //     }
                    // })
                    // var result = {
                    //     status: 'success',
                    //     message: "Login Successfully",
                    //     data: {user : data, first_time_register : true},
                    //     token: token
                    // };
                    res.status(config.OK_STATUS).json(result);
                }
            });
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error"
        });
    }
});

/**
 * @api {post} /app/forget_password Forgot Password
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
        var user = await User.findOne({email: req.body.email, type: req.body.user_type, isDeleted: false}).exec();
        if (user) {
            var emailData = {
                expire_time: moment().add(1, 'h').toDate().getTime(),
                app_user_id: user._id
            };
            var option = {
                to: user.email,
                subject: 'ABHR - Request for reset password'
            }
            var buffer = Buffer(JSON.stringify(emailData), 'binary').toString('base64');
            var data = {link: config.FRONT_END_URL + 'reset-password?detials=' + buffer};
            mailHelper.send('forget_password', option, data, function (err, res) {
                if (err) {
                    console.log("Mail Error:", err);
                } else {
                    console.log("Mail Success:", res);
                }
            })
            res.status(config.OK_STATUS).json({
                status: "success",
                message: "Check your mail to reset your account password",
                data:{user : user}
            });
        } else {
            res.status(config.BAD_REQUEST).json({
                status: "failed",
                message: "User is not available with this email",
            });
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: "failed",
            message: "Validation Error"
        });
    }
});


// help api
/**
 * @api {post} /app/help Help
 * @apiName help
 * @apiDescription Get help like trips & fare away, account & payment options, guide to abhr, accessibility
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} help_type [0,1,2,3]
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.post('/help', async (req, res) => {
    var schema = {
        'help_type': {
            notEmpty: true,
            errorMessage: "Enter type from one of this (0, 1, 2, 3)"
        }
    };
    
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var helpResp = await commonHelper.getHelp(req.body.help_type);
        if(helpResp.status === 'success'){
            res.status(config.OK_STATUS).json(helpResp)
        }
        else{
            res.status(config.BAD_REQUEST).json(helpResp)
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

// term & conditions, about us , privacy policy, copyright all in one api
/**
 * @api {post} /app/aboutus About us
 * @apiName About us
 * @apiDescription term & conditions, about us , privacy policy, copyright all in one api
 * @apiGroup AppUser
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} help_type [0,1,2,3]
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.post('/aboutus', async (req, res) => {
    var schema = {
        'help_type': {
            notEmpty: true,
            errorMessage: "Enter type from one of this (0, 1, 2, 3)"
        }
    };
    
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var helpResp = await commonHelper.aboutus(req.body.help_type);
        if(helpResp.status === 'success'){
            res.status(config.OK_STATUS).json(helpResp)
        }
        else{
            res.status(config.BAD_REQUEST).json(helpResp)
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