var express = require('express');
var bcrypt = require('bcrypt');
var moment = require('moment');
var jwt = require('jsonwebtoken');
var path = require('path');

var config = require('./../../config');
var mailHelper = require('./../../helper/mail');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var auth = require('./../../middlewares/auth');
var router = express.Router();

//Routes
var users = require('./users');
var keywords = require('./keywords');
var agents = require('./agents');
var staff = require('./staff');
var company = require('./companies');

router.use('/user', users);
router.use('/keyword', keywords);
router.use('/agents', agents);
router.use('/staff', staff);
router.use('/company', company);

//models
var User = require('./../../models/users');

/**
 * @api {post} /admin/login Login
 * @apiName Login
 * @apiDescription Used for RentalCar Company & Super Admin login
 * @apiGroup Admin
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
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        User.findOne({email: req.body.email, type: 'admin'}, function (err, data) {
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
 * @api {post} /admin/forget_password Forgot Password
 * @apiDescription Used to send email for forgot password
 * @apiName Forgot Password
 * @apiGroup Admin
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} email User email adrress    
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
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user = await User.findOne({email: req.body.email, type: 'admin'}).exec();
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
});


/**
 * @api {post} /admin/reset_password Reset Password
 * @apiDescription Used to reset password of user
 * @apiName Reset Password
 * @apiGroup Admin
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} user_id User id
 * @apiParam {String} new_password New Password for User   
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/reset_password', async(req, res, next) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "User id is required"
        },
        'new_password': {
            notEmpty: true,
            errorMessage: "New password is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user = await User.findOne({_id: req.body.user_id}).exec();
        if (user) {
            User.update({_id: {$eq: req.body.user_id}}, {$set: {password: bcrypt.hashSync(req.body.new_password, SALT_WORK_FACTOR)}}, function (err, data) {
                if (err) {
                    return next(err);
                } else {
                    res.status(config.OK_STATUS).json({
                        message: "Your password is change successfully."
                    });
                }
            });
        } else {
            res.status(config.BAD_REQUEST).json({
                message: "User is not exist"
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
