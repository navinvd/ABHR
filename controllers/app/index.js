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

var car = require('./car');
router.use('/car', car);

var user = require('./user');
router.use('/user', user);

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
            deviceType: req.body.device_type,
            deviceToken:req.body.deviceToken,
            type: req.body.user_type
        };
        User.findOne({email: req.body.email, type: req.body.user_type, isDeleted: false}, function (err, data) {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: 'failed',
                    message: "could not register user please try again!!"
                });
            } else {
                if (data) {
                    res.status(config.OK_STATUS).json({
                        status: 'failed',
                        message: "Email is already exist!!"
                    });
                } else {
                    var userModel = new User(Data);
                    userModel.save(function (err, userData) {
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

                            const u = {
                                _id:userData._id,
                                first_name:userData.first_name,
                                last_name:userData.last_name,
                                email:userData.email
                            }
                            var result = {
                                status: 'success',
                                message: "User registered successfully.",
                                data: {user : u},
                                token: token
                            };
                            res.status(config.OK_STATUS).json(result);
                        }
                    });
                }
            }
        })
        var userModel = new User(Data);
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
        'devicType': {
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
                if (data) {
                    bcrypt.compare(req.body.password, data.password, function (err, result) {
                        if (result) {
                            if (data.is_verified) {
                                var token = jwt.sign({id: data._id, type: data.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                                    expiresIn: 60 * 60 * 24 // expires in 24 hours
                                });

                                const u = {
                                    _id:data._id,
                                    first_name:data.first_name,
                                    last_name:data.last_name,
                                    email:data.email
                                }

                                res.status(config.OK_STATUS).json({
                                    status: 'success',
                                    message: "User authenticated successfully",
                                    data: {user : u},
                                    token: token
                                });
                            } else {
                                res.status(config.BAD_REQUEST).json({
                                    status: 'success',
                                    message: "Please verify your email for successfull login",
                                    data: { user :{
                                        '_id': data._id,
                                        'email': data.email
                                        }
                                    }
                                });
                            }
                        } else {
                            res.status(config.OK_STATUS).json({
                                status: "failed",
                                message: "Password is wrong",
                            });
                        }
                    });
                } else {
                    res.status(config.BAD_REQUEST).json({
                        status: 'failed',
                        message: "Email is wrong",
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
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user = await User.findOne({'socialmediaID': req.body.socialmediaID, 'socialmediaType': req.body.socialmediaType, isDeleted: false, user_type: req.body.user_type}).exec();
        if (user) {
            var token = jwt.sign({id: user._id, type: user.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                expiresIn: 60 * 60 * 24 // expires in 24 hours
            });
            var result = {
                status: 'success',
                message: "Login Successfully",
                data: {user : user},
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
                    var result = {
                        status: 'success',
                        message: "Login Successfully",
                        data: {user : data},
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
//         res.status(config.OK_STATUS).json({
//             message: "Validation Error",
//             error: errors
//         });
//     }
// });

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
})


module.exports = router;