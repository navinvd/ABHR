var express = require('express');
var router = express.Router();
var config = require('./../../config');
var User = require('./../../models/users');
var CarBooking = require('./../../models/car_booking');
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

/* @api {post} /registration Registration
 * @apiName Registration
 * @apiDescription Used for RentalCar Company & Super Admin Registration
 * @apiGroup Admin - Users
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
 * @apiGroup Admin - Users
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


/* @api {post} /admin/user/list List of all users
 * @apiName Users List
 * @apiDescription To display users list with pagination
 * @apiGroup Admin - Users
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/list', async (req, res, next) => {
    console.log('here==================>');
    var schema = {
        'start': {
            notEmpty: true,
            errorMessage: "start is required"
        },
        'length': {
            notEmpty: true,
            errorMessage: "length is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if(!errors){
         var defaultQuery = [
            {
                $match: {
                    "isDeleted": false,
                    "type": "user"
                }
            },
            {
                $lookup: {
                    from: 'car_booking',
                    foreignField: 'userId',
                    localField: '_id',
                    as: "rental",
                }
            }
        ];
        console.log('filtered by=====>',req.body.filtered_by);
        if(typeof req.body.filtered_by !== 'undefined' && req.body.filtered_by){
            defaultQuery.push({
                $match: {"app_user_status": req.body.filtered_by}
            });
        }
        
        defaultQuery = defaultQuery.concat([
            {
                "$project": {
                //   data: "$$ROOT",
                  first_name : 1,
                  last_name: 1, 
                  email: 1,
                  createdAt: 1,
                  app_user_status:1,
                  count:{ $size: "$rental"}
                }
            }
        ]);
        totalRecords = await User.aggregate(defaultQuery);
        if (req.body.search != undefined) {
            if (req.body.search.value != undefined) {
                var regex = new RegExp(req.body.search.value);
                var match = { $or: [] };
                req.body['columns'].forEach(function (obj) {
                    if (obj.name) {
                        var json = {};
                        if (obj.isNumber) {
                            json[obj.name] = parseInt(req.body.search.value)
                        } else {
                            json[obj.name] = {
                                "$regex": regex,
                                "$options": "i"
                            }
                        }
                        match['$or'].push(json)
                    }
                });
            }
            var searchQuery = {
                $match: match
            }
            defaultQuery = defaultQuery.concat(searchQuery);
        }
        if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
            var colIndex = req.body.order[0].column;
            var colname = req.body.columns[colIndex].name;
            colname = '$'+colname;
            var order = req.body.order[0].dir;
            if(order == "asc") {
                defaultQuery = defaultQuery.concat({
                    $project: {
                        "records": "$$ROOT",
                        "sort_index": { "$toLower": [colname] }
                    }
                },
                {
                    $sort: {
                            "sort_index": 1
                    }
                },
                {
                    $replaceRoot: { newRoot: "$records" }
                },
                
                )      
            } else {
                defaultQuery = defaultQuery.concat({
                    $project: {
                        "records": "$$ROOT",
                        "sort_index": { "$toLower": [colname] }
                    }
                },
                {
                    $sort: {
                        "sort_index": -1
                    }
                },
                {
                    $replaceRoot: { newRoot: "$records" }
                })    
            }
        }
        if (req.body.start) {
            defaultQuery.push({
                "$skip": req.body.start
            })
        }
        if (req.body.length) {
            defaultQuery.push({
                "$limit": req.body.length
            })
        }
        User.aggregate(defaultQuery, function (err, data) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    //result: data.length != 0 ? data[0] : {recordsTotal: 0, data: []}
                    result: {recordsTotal: totalRecords.length, data: data} ,
                });
            }
        })
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

/* @api {post} /admin/user/rented_list List of all rented users
 * @apiName Rented Users List
 * @apiDescription To display Rented users list with pagination
 * @apiGroup Admin - Users
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/rented_list', (req, res, next) => {
    var schema = {
        'start': {
            notEmpty: true,
            errorMessage: "start is required"
        },
        'length': {
            notEmpty: true,
            errorMessage: "length is required"
        },
        'user_id': {
            notEmpty: true,
            errorMessage: "user_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if(!errors){
        var defaultQuery = [
            {
                $lookup: {
                    from: 'cars',
                    localField: 'carId',
                    foreignField: '_id',
                    as: 'car_details'
                }
            },
            {
                $unwind: {
                    "path": "$car_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_model',
                    localField: 'car_details.car_model_id',
                    foreignField: '_id',
                    as: 'car_model'
                }
            },
            {
                $unwind: {
                    "path": "$car_model",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_brand',
                    localField: 'car_details.car_model_id',
                    foreignField: '_id',
                    as: 'car_brand'
                }
            },
            {
                $unwind: {
                    "path": "$car_brand",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $match: {
                    'isDeleted': false,
                    'userId': new ObjectId(req.body.user_id),
                    'to_time': {
                        $lt: new Date(),
                    }
                }
            },
            {
                "$project":{
                    "_id":1,
                    "userId":1,
                    "booking_number":1,
                    "from_time":1,
                    "to_time":1,
                    "model_name":"$car_model.model_name",
                    "brand_name":"$car_brand.brand_name"
                }
            },
            {
                $group: {
                    "_id": "",
                    "recordsTotal": {
                        "$sum": 1
                    },
                    "data": {
                        "$push": "$$ROOT"
                    }
                }
            },
            {
                $project: {
                    "recordsTotal": 1,
                    "data": {"$slice": ["$data", parseInt(req.body.start), parseInt(req.body.length)]}
                }
            }];
            if (req.body.search != undefined) {
                if(req.body.search.value != undefined){
                    var regex = new RegExp(req.body.search.value);
                    var match = {$or: []};
                    req.body['columns'].forEach(function (obj) {
                        if (obj.name) {
                            var json = {};
                            if (obj.isNumber) {
                                json[obj.name] = parseInt(req.body.search.value)
                            } else {
                                json[obj.name] = {
                                    "$regex": regex,
                                    "$options": "i"
                                }
                            }
                            match['$or'].push(json)
                        }
                    });
                }
                console.log('re.body.search==>', req.body.search.value);
                var searchQuery = {
                    $match: match
                }
                defaultQuery.splice(defaultQuery.length - 2, 0, searchQuery);
                console.log("==>", JSON.stringify(defaultQuery));
            }
            if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
                var colIndex = req.body.order[0].column;
                var colname = req.body.columns[colIndex].name;
                colname = '$'+colname;
                var order = req.body.order[0].dir;
                if(order == "asc") {
                    defaultQuery = defaultQuery.concat({
                        $project: {
                            "records": "$$ROOT",
                            "sort_index": { "$toLower": [colname] }
                        }
                    },
                    { 
                        $sort: { "sort_index": 1 }
                    },
                    {
                        $replaceRoot: { newRoot: "$records" }
                    })      
                } else {
                    defaultQuery = defaultQuery.concat({
                        $project: {
                            "records": "$$ROOT",
                            "sort_index": { "$toLower": [colname] }
                        }
                    },
                    {
                        $sort: {
                            "sort_index": -1
                        }
                    },
                    {
                        $replaceRoot: { newRoot: "$records" }
                    })    
                }
            }
            console.log('defaultQuery===>',defaultQuery);
        CarBooking.aggregate(defaultQuery, function (err, data) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: data.length != 0 ? data[0] : {recordsTotal: 0, data: []}
                });
            }
        })
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

router.get('/details/:id', (req, res, next) => {
    try{
        var userId = new ObjectId(req.params.id);
        var defaultQuery = [
            {
                $match: {
                    "isDeleted": false,
                    "_id": userId
                }
            },
            {
                $lookup: {
                    from: 'car_booking',
                    foreignField: 'userId',
                    localField: '_id',
                    as: "rental",
                }
            },
            {
                $project: {
                  data: "$$ROOT",
                  count:{ $size: "$rental"}
                }
            }
        ];
        User.aggregate(defaultQuery, function (err, data) {
            if (err) {
                return next(err);
            } else {
                var count = data[0].count;
                data[0].data.count = count;
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: data[0].data
                });
            }
        });
    } catch(e){
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: e
        });
    }
});
  
module.exports = router;
