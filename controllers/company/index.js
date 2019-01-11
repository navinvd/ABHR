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
var users = require('./users');
// var agents = require('./agents');
// var staff = require('./staff');
// var company = require('./companies');

router.use('/car', cars);
router.use('/users', users);
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
        Company.findOne({ email: req.body.email, isDeleted: false }, function (err, data) {
            if (err) {
                return next(err);
            } else {
                if (data) {
                    bcrypt.compare(req.body.password, data.password, function (err, result) {
                        if (result) {
                            if (data.is_verified) {
                                var token = jwt.sign({ id: data._id, email: data.email }, config.ACCESS_TOKEN_SECRET_KEY, {
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
router.post('/forget_password', async (req, res, next) => {
    var schema = {
        'email': {
            notEmpty: true,
            errorMessage: "email is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var company = await Company.findOne({ email: req.body.email, isDeleted: false }).exec();
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
            var data = { link: config.FRONT_END_URL + '/reset-password?detials=' + buffer };
            console.log(data);
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
router.post('/reset_password', async (req, res, next) => {
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
        var company = await Company.findOne({ _id: req.body.company_id }).exec();
        if (company) {
            Company.update({ _id: { $eq: req.body.company_id } }, { $set: { password: bcrypt.hashSync(req.body.new_password, SALT_WORK_FACTOR) } }, function (err, data) {
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

/**
 * @api {post} /company/change_password change company-admin password
 * @apiName Change company-admin password
 * @apiDescription Used to change company-admin password
 * @apiGroup Company-Admin
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} company_id company id
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
router.post('/change_password', async (req, res, next) => {
    var schema = {
        'company_id': {
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
        try {
            var userData = await Company.find({ _id: new ObjectId(req.body.company_id) });
            if (userData && userData.length > 0) {
                if (bcrypt.compareSync(data.old_password, userData[0].password)) {
                    var updatedata = { "password": bcrypt.hashSync(data.new_password, SALT_WORK_FACTOR) }
                    var datta = await Company.update({ "_id": new ObjectId(req.body.company_id) }, { $set: updatedata });
                    if (datta.n > 0) {
                        res.status(config.BAD_REQUEST).json({
                            status: 'success',
                            message: 'Password has been changed successfully'
                        });
                    }
                    else {
                        res.status(config.BAD_REQUEST).json({
                            status: 'failed',
                            message: 'Password has not been changed successfully'
                        });
                    }
                }
                else {
                    res.status(config.BAD_REQUEST).json({
                        status: 'failed',
                        message: 'Invailid old password'
                    });
                }
            } else {
                res.status(config.BAD_REQUEST).json({
                    status: 'failed',
                    message: 'No user found with this user id'
                });
            }
        } catch (e) {

        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});


/**
 * @api {get} /company/details/:id? Company Details By Id
 * @apiName company Details By Id
 * @apiDescription Get Company details By company id
 * @apiGroup Admin - Companies
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} id company Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.get('/details/:id', (req, res, next) => {
    Company.findOne({ _id: { $eq: req.params.id }, "isDeleted": false }, function (err, data) {
        if (err) {
            return next(err);
        } else {
            res.status(config.OK_STATUS).json({
                status: "Success",
                data: data,
            });
        }
    });
});



/**
 * @api {put} /company/update update Company details
 * @apiName Update Company
 * @apiDescription Used to update company information
 * @apiGroup Company - Company
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} user_id User Id
 * @apiParam {String} name FirstName
 * @apiParam {String} description Description
 * @apiParam {String} phone_number User User Phone Number 
 * @apiParam {String} email User email address 
 * @apiParam {String} site url User Site url
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Admin unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/update', async (req, res, next) => {
    try {
        var schema = {
            'user_id': {
                notEmpty: true,
                errorMessage: "user_id is required"
            }
        };
        req.checkBody(schema);
        var errors = req.validationErrors();
        if (!errors) {
            var userId = await User.findOne({ "_id": req.body.user_id, "isDeleted": false, "type": "admin" });
            if (userId) {
                var userData = {
                    name: req.body.name,
                    description: req.body.description,
                    phone_number: req.body.phone_number,
                    site_url: req.body.site_url,
                    email: req.body.email
                };
                Company.update({ _id: { $eq: req.body.user_id } }, { $set: userData }, function (err, data) {
                    if (err) {
                        return next(err);
                    } else {
                        res.status(config.OK_STATUS).json({
                            message: "Success",
                            result: { data: userId }
                        });
                    }
                });
            } else {
                res.status(config.OK_STATUS).json({
                    status: "failed",
                    message: "record not found"
                });
            }
        }
    } catch (e) {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: e
        });
    }
});


module.exports = router;
