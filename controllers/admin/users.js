var express = require('express');
var router = express.Router();
var config = require('./../../config');
var User = require('./../../models/users');
var path = require('path');
var async = require("async");
var ObjectId = require('mongoose').Types.ObjectId;
var bcrypt = require('bcrypt');
var auth = require('./../../middlewares/auth');
var moment = require('moment');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var _ = require('underscore');
var jwt = require('jsonwebtoken');
var mailHelper = require('./../../helper/mail');

/**
 * @api {post} /registration Registration
 * @apiName Registration
 * @apiDescription Used for RentalCar Company & Super Admin Registration
 * @apiGroup User
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} name User Name
 * @apiParam {String} username Unique Username
 * @apiParam {String} phone_number User User Phone Number 
 * @apiParam {String} email User email address 
 * @apiParam {String} password User Password 
 * @apiParam {String} type Type of User ["ios", "anroid", "companyUser", "admin", "agent", "staff"]
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/add', (req, res, next) => {
    var schema = {
        'username': {
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
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var userModel = new User(req.body);
        userModel.save(function (err, userData) {
            console.log("data:", userData);
            if (err) {
                if (err.code == '11000') {
                    if (err.message.indexOf('username') != -1) {
                        res.status(config.BAD_REQUEST).json({
                            message: "Username already exist",
                            error: err
                        });
                    } else {
                        return next(err);
                    }
                } else {
                    return next(err);
                }
            } else {
                var token = jwt.sign({id: userData._id, type: userData.type}, config.ACCESS_TOKEN_SECRET_KEY, {
                    expiresIn: 60 * 60 * 24 // expires in 24 hours
                });
                var result = {
                    message: "User added successfully..",
                    data: userData,
                    token: token
                };
                var option = {
                    to: req.body.email,
                    subject: 'ABHR - User Account Notification'
                }
                var data = {
                    name : req.body.name,
                    username : req.body.username,
                    email : req.body.email,
                    password : req.body.password
                }
                mailHelper.send('verification_email', option, data, function (err, res) {
                    if (err) {
                        console.log("Mail Error:", err);
                    } else {
                        console.log("Mail Success:", res);
                    }
                })
                res.status(config.OK_STATUS).json(result);
            }
        });
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
  });

/**
 * @api {put} /user Update User Details
 * @apiName Update User
 * @apiDescription Used to update user information
 * @apiGroup User
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} user_id User Id
 * @apiParam {String} type Type Of User ["ios", "anroid", "companyUser", "admin", "agent", "staff"]
 * @apiParam {String} name Name Of User (Optional)
 * @apiParam {String} phone Phone Number of User (Optional)
 * @apiParam {String} username Username Of User (Optional)
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/', auth, function (req, res, next) {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "user_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        User.update({_id: {$eq: req.body.user_id}}, {$set: req.body}, function (err, response) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({message: "Profile updated successfully"});
            }
        });
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

/**
 * @api {get} /user/:id?type='admin' User Details By Id
 * @apiName User Details By Id
 * @apiDescription Get User details By user id
 * @apiGroup User
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
router.get('/:id', function (req, res, next) {
    User.findOne({_id: {$eq: req.params.id}}, function (err, data) {
        if (err) {
            return next(err);
        } else {
            res.status(config.OK_STATUS).json({
                message: "Success",
                user: data,
            });
        }
    });
});
  
module.exports = router;
