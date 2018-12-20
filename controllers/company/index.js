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
var cars = require('./cars');
// var keywords = require('./keywords');
// var agents = require('./agents');
// var staff = require('./staff');
// var company = require('./companies');

router.use('/car', cars);
// router.use('/keyword', keywords);
// router.use('/agents', agents);
// router.use('/staff', staff);
// router.use('/company', company);

//models
var Company = require('./../../models/car_company');

/**
 * @api {post} /company/login Login
 * @apiName Login
 * @apiDescription Used for RentalCar Company
 * @apiGroup Company-Admin
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
        Company.findOne({email: req.body.email, isDeleted: false}, function (err, data) {
            if (err) {
                return next(err);
            } else {
                if (data) {
                    bcrypt.compare(req.body.password, data.password, function (err, result) {
                        if (result) {
                            if (data.is_verified) {
                                var token = jwt.sign({id: data._id, email: data.email}, config.ACCESS_TOKEN_SECRET_KEY, {
                                    expiresIn: 60 * 60 * 24 // expires in 24 hours
                                });

                                res.status(config.OK_STATUS).json({
                                    message: "Company authenticated successfully",
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
 * @api {post} /company/forget_password Forgot Password
 * @apiDescription Used to send email for forgot password
 * @apiName Forgot Password
 * @apiGroup Company-Admin
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} email Company email adrress 
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
        var company = await Company.findOne({email: req.body.email, isDeleted: false}).exec();
        if (company) {
            var emailData = {
                expire_time: moment().add(1, 'h').toDate().getTime(),
                company_id: company._id
            };
            var option = {
                to: company.email,
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
                message: "Check your mail to reset your account password",
            });
        } else {
            res.status(config.BAD_REQUEST).json({
                message: "Company is not available with this email",
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
 * @api {post} /company/reset_password Reset Password
 * @apiDescription Used to reset password of company
 * @apiName Reset Password
 * @apiGroup Company-Admin
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} company_id Company id
 * @apiParam {String} new_password New Password for Company   
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/reset_password', async(req, res, next) => {
    var schema = {
        'company_id': {
            notEmpty: true,
            errorMessage: "company id is required"
        },
        'new_password': {
            notEmpty: true,
            errorMessage: "New password is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var company = await Company.findOne({_id: req.body.company_id}).exec();
        if (company) {
            Company.update({_id: {$eq: req.body.company_id}}, {$set: {password: bcrypt.hashSync(req.body.new_password, SALT_WORK_FACTOR)}}, function (err, data) {
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
                message: "Company is not exist"
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
