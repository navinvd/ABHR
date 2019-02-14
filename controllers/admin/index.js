var express = require('express');
var bcrypt = require('bcrypt');
var moment = require('moment');
var jwt = require('jsonwebtoken');
var path = require('path');

var config = require('./../../config');
var mailHelper = require('./../../helper/mail');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var auth = require('./../../middlewares/auth');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var router = express.Router();

//Routes
var users = require('./users');
var keywords = require('./keywords');
var agents = require('./agents');
var staff = require('./staff');
var company = require('./companies');
var car = require('./car');
var terms_and_conditions = require('./terms_and_conditions');
var coupon = require('./coupons');
var dashboard = require('./dashboard');
var transaction = require('./transaction');
var tracking = require('./car_tracking');
var help = require('./user_help');

router.use('/user', users);
router.use('/keyword', keywords);
router.use('/agents', agents);
router.use('/staff', staff);
router.use('/company', company);
router.use('/cars', car);
router.use('/legal_settings', terms_and_conditions);
router.use('/coupon', coupon);
router.use('/dashboard', dashboard);
router.use('/transaction', transaction);
router.use('/tracking', tracking);
router.use('/help', help);

//models
var User = require('./../../models/users');
var Company = require('./../../models/car_company');
var Car_VAT = require('./../../models/car_vat');

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
        User.findOne({ email: req.body.email, type: 'admin' }, function (err, data) {
            if (err) {
                return next(err);
            } else {
                if (data) {
                    bcrypt.compare(req.body.password, data.password, function (err, result) {
                        if (result) {
                            var token = jwt.sign({ id: data._id, type: data.type }, config.ACCESS_TOKEN_SECRET_KEY, {
                                expiresIn: 60 * 60 * 24 // expires in 24 hours
                            });

                            res.status(config.OK_STATUS).json({
                                message: "User authenticated successfully",
                                result: data,
                                token: token
                            });
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
        var user = await User.findOne({ email: req.body.email, type: 'admin' }).exec();
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
            var data = { link: config.FRONT_END_URL + '/reset-password?detials=' + buffer };
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
 * @api {post} /admin/change_password change admin password
 * @apiName Change admin password
 * @apiDescription Used to change admin password
 * @apiGroup Admin
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
router.post('/change_password', async (req, res, next) => {
    console.log('here');
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
        try {
            var userData = await User.findOne({ "_id": new ObjectId(req.body.user_id), "isDeleted": false });
            console.log(userData);
            if (userData && userData.length > 0) {
                console.log(userData);
                if (bcrypt.compareSync(data.old_password, userData[0].password)) {
                    var updatedata = { "password": bcrypt.hashSync(data.new_password, SALT_WORK_FACTOR) }
                    var datta = await User.update({ "_id": new ObjectId(req.body.user_id) }, { $set: updatedata });
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
        } catch (error) {
            res.status(config.BAD_REQUEST).json({
                status: 'failed',
                message: 'error',
                err: error
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
* @api {get} /admin/details/:id Details of perticular user
 * @apiName User Details 
 * @apiDescription To display Details of users
 * @apiGroup Admin - Admin
 * @apiVersion 0.0.0
 * 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/details/:id', (req, res, next) => {
    try {
        var userId = new ObjectId(req.params.id);
        var defaultQuery = [
            {
                $match: {
                    "isDeleted": false,
                    "_id": userId,
                    "type": "admin"
                }
            },

        ];
        User.aggregate(defaultQuery, function (err, data) {
            console.log(data);
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    status: "success",
                    message: "Data found",
                    result: { data : data[0]}
                });
            }
        });
    } catch (e) {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: e
        });
    }
});


/**
 * @api {put} /admin/update update Admin details
 * @apiName Update Admin
 * @apiDescription Used to update admin information
 * @apiGroup Admin - Admin
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} user_id User Id
 * @apiParam {String} first_name FirstName
 * @apiParam {String} last_name LastName
 * @apiParam {String} phone_number User User Phone Number 
 * @apiParam {String} email User email address 
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
            var userId = await User.findOne({"_id" : new ObjectId(req.body.user_id), "isDeleted" : false, "type": "admin"});
            if(userId){ 
                var userData = {
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    phone_number: req.body.phone_number,
                    email: req.body.email
                };
                User.update({ "_id": new ObjectId(req.body.user_id), "type": "admin" }, { $set: userData }, async function (err, data) {
                    var userId = await User.findOne({ "_id": new ObjectId(req.body.user_id), "isDeleted": false, "type":"admin" }).exec();
                    if (err) {
                        return next(err);
                    } else {
                        res.status(config.OK_STATUS).json({
                            status: "success",
                            message: "Profile updated successfully..",
                            result: {data : userId}
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


/**
 * @api {post} /admin/checkemail userList for email already exist check
 * @apiName User List 
 * @apiDescription Used to get user list
 * @apiGroup Admin - Admin
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} [user_id] User Id
 * @apiParam {String} email Email
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Admin unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/checkemail', async (req, res, next) => {
    var schema = {
        'email': {
            notEmpty: true,
            errorMessage: "email is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        try{
            var obj = { "email" : req.body.email, "isDeleted" : false};
            if(req.body.user_id){
                var obj = { "email" : req.body.email,"isDeleted" : false, "_id": { "$ne": new ObjectId(req.body.user_id) }};
            }
            var userId = await User.findOne(obj); 
            if(userId !== null && userId !== ''){
                res.status(config.OK_STATUS).json({
                    status: "success",
                    message: "Record found"
                });
            }else{
                var CompanyCheck = await Company.findOne(obj);
                if (CompanyCheck !== null && CompanyCheck !== '') {
                    res.status(config.OK_STATUS).json({
                        status: "success",
                        message: "Record found"
                    });
                } else {
                    res.status(config.OK_STATUS).json({
                        status: "failed",
                        message: "record not found"
                    });
                }
            }
        } catch (error) {
            res.status(config.BAD_REQUEST).json({
                status: "failed",
                message: "something went wrong",
                error: error
            });
        }   
    } else{
        res.status(config.BAD_REQUEST).json({
            status: "failed",
            message:"Validation error",
            error: e
        });
    }
});


/**
 * @api {get} /admin/vat get VAT TAX
 * @apiName GET AdminVAT
 * @apiDescription Used to get VAT rate
 * @apiGroup Admin - Admin
 * @apiVersion 0.0.0
 * 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Admin unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/vat', async (req, res, next) => {
    var VAT = await Car_VAT.findOne({});
    if(VAT && VAT!==null){
        res.status(config.OK_STATUS).json({
            status: "success",
            result: VAT
        });
    }else{
        res.status(config.BAD_REQUEST).json({
            status: "failed"
        }); 
    }
});


/**
 * @api {put} /admin/vat/update update VAT TAX
 * @apiName Update AdminVAT
 * @apiDescription Used to update VAT rate
 * @apiGroup Admin - Admin
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} rate VAT value
 * @apiParam {String} first_name FirstName
 * @apiParam {String} last_name LastName
 * @apiParam {String} phone_number User User Phone Number 
 * @apiParam {String} email User email address 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Admin unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/vat/update', async (req, res, next) => {
    console.log('here');
    var schema = {
        'rate': {
            notEmpty: true,
            errorMessage: "rate is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var carVAT = await Car_VAT.update({}, { $set: { 'rate': req.body.rate}});
        if(carVAT){
            res.status(config.OK_STATUS).json({
                status: "success",
                message: "VAT updated Successfully"
            });
        }else{
            res.status(config.BAD_REQUEST).json({
                status: "failed",
                message: "VAT not updated Successfully"
            });
        }
    }else{
            res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            status: 'failed'
        });
    }
});



module.exports = router;
