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
        User.update({ _id: { $eq: req.body.user_id } }, { $set: req.body }, function (err, response) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({ message: "Profile updated successfully" });
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
 * @api {post} /admin/user/list List of all users
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
    if (!errors) {
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
        console.log('filtered by=====>', req.body.filtered_by);
        if (typeof req.body.filtered_by !== 'undefined' && req.body.filtered_by) {
            defaultQuery.push({
                $match: { "app_user_status": req.body.filtered_by }
            });
        }

        defaultQuery = defaultQuery.concat([
            {
                "$project": {
                    //   data: "$$ROOT",
                    first_name: 1,
                    last_name: 1,
                    email: 1,
                    createdAt: 1,
                    app_user_status: 1,
                    count: { $size: "$rental" }
                }
            }
        ]);
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
            var order = req.body.order[0].dir;
            if(req.body.columns[colIndex].isNumber){
                if(order == "asc"){
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: 1 }
                    });
                }else{
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: -1 }
                    });
                }
            }else{
                colname = '$' + colname;
                if (order == "asc") {
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
        }
        console.log('defaultQuery===>', JSON.stringify(defaultQuery));
        totalRecords = await User.aggregate(defaultQuery);
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
                    result: { recordsTotal: totalRecords.length, data: data },
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

/**
 * @api {post} /admin/user/rented_list List of all rented users
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
router.post('/rented_list', async (req, res, next) => {
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
    if (!errors) {
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
                    'userId': new ObjectId(req.body.user_id),
                    'to_time': {
                        $lt: new Date(),
                    }
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "userId": 1,
                    "booking_number": 1,
                    "from_time": 1,
                    "to_time": 1,
                    "model_name": "$car_model.model_name",
                    "brand_name": "$car_brand.brand_name"
                }
            }];
            if (typeof req.body.search !== "undefined" && req.body.search !== null && Object.keys(req.body.search).length > 0 && req.body.search.value !== '') {
                if (req.body.search.value != undefined && req.body.search.value !== '') {
                    var regex = new RegExp(req.body.search.value);
                    var match = { $or: [] };
                    req.body['columns'].forEach(function (obj) {
                        if (obj.name) {
                            var json = {};
                            if (obj.isNumber) {
                                console.log(typeof parseInt(req.body.search.value));
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
                defaultQuery.push(searchQuery);
                console.log("==>", JSON.stringify(defaultQuery));
            }
        if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
            var colIndex = req.body.order[0].column;
            var colname = req.body.columns[colIndex].name;
            var order = req.body.order[0].dir;
            if(req.body.columns[colIndex].isNumber){
                if(order == "asc"){
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: 1 }
                    });
                }else{
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: -1 }
                    });
                }
            }else{
                colname = '$' + colname;
                if (order == "asc") {
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
        }
        var totalrecords = await CarBooking.aggregate(defaultQuery);
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
        console.log('defaultQuery===>', defaultQuery);
        CarBooking.aggregate(defaultQuery, function (err, data) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: { recordsTotal: totalrecords.length, data: data }
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

/**
 * @api {get} /admin/user/details/:id Details of perticular user
 * @apiName User Details 
 * @apiDescription To display Details of users
 * @apiGroup Admin - Users
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
                    count: { $size: "$rental" }
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
    } catch (e) {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: e
        });
    }
});

/**
 * @api {post} /admin/user/report_list create report list for cars
 * @apiName Listing of users report
 * @apiDescription This is for listing user report
 * @apiGroup Admin - Users
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * 
 * @apiHeader {String}  Content-Type application/json   
 * @apiHeader {String}  x-access-token Admin unique access-key  
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/report_list', async (req, res, next) => {
    console.log('here');
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
    if (!errors) {
        var defaultQuery = [
            // {
            //     $match: {
            //         "isDeleted": false
            //     },
            // },
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
                    "path": "$car_details"
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user_details'
                }
            },
            {
                $unwind: {
                    "path": "$user_details"
                }
            },
            {
                $lookup: {
                    from: 'car_company',
                    localField: 'car_details.car_rental_company_id',
                    foreignField: '_id',
                    as: 'car_compnay'
                }
            },
            {
                $unwind: '$car_compnay'
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
                $unwind: '$car_model'
            },
            {
                $lookup: {
                    from: 'car_brand',
                    localField: 'car_details.car_brand_id',
                    foreignField: '_id',
                    as: 'car_brand'
                }
            },
            {
                $unwind: '$car_brand'
            }];
        if (req.body.selectFromDate && req.body.selectToDate) {
            var From_date = moment(req.body.selectFromDate).utc().startOf('day');
            var To_date = moment(req.body.selectToDate).utc().startOf('day');
            defaultQuery.push({
                $match: {
                      $and: [
                                { "from_time": { $gte: new Date(From_date) } },
                                { "to_time": { $lte: new Date(To_date) } },
                            ]
                        }
            })
        }
        defaultQuery.push(
            {
                $project: {
                    _id: 1,
                    no_of_rented: 1,
                    company_name: "$car_compnay.name",
                    from_time: 1,
                    to_time: 1,
                    booking_rent: 1,
                    isDeleted: 1,
                    trip_status: 1,
                    first_name: "$user_details.first_name",
                    last_name: "$user_details.last_name",
                    createdAt:1,
                    booking_number:1,
                    total_booking_amount:1
                }
            });
        if (typeof req.body.search !== 'undefined' && req.body.search !== null && Object.keys(req.body.search).length > 0 && req.body.search.value !== '') {
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
            defaultQuery.push(searchQuery);
        }
        if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
            var colIndex = req.body.order[0].column;
            var colname = req.body.columns[colIndex].name;
            var order = req.body.order[0].dir;
            if(req.body.columns[colIndex].isNumber){
                if(order == "asc"){
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: 1 }
                    });
                }else{
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: -1 }
                    });
                }
            }else{
                colname = '$' + colname;
                if (order == "asc") {
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
        }
        var totalrecords = await CarBooking.aggregate(defaultQuery);
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
        // console.log('defaultQuery===>', JSON.stringify(defaultQuery));
        CarBooking.aggregate(defaultQuery, function (err, data) {
            // console.log('data===>', data);
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: { recordsTotal: totalrecords.length, data: data }
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

/**
 * @api {post} /admin/user/export_report_list create report list for cars
 * @apiName Listing of export users list
 * @apiDescription This is for listing user report
 * @apiGroup Admin - Users
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * 
 * @apiHeader {String}  Content-Type application/json   
 * @apiHeader {String}  x-access-token Admin unique access-key  
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/export_report_list', async (req, res, next) => {
        var defaultQuery = [
            {
                $match: {
                    "isDeleted": false
                },
            },
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
                    "path": "$car_details"
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user_details'
                }
            },
            {
                $unwind: {
                    "path": "$user_details"
                }
            },
            {
                $lookup: {
                    from: 'car_company',
                    localField: 'car_details.car_rental_company_id',
                    foreignField: '_id',
                    as: 'car_compnay'
                }
            },
            {
                $unwind: '$car_compnay'
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
                $unwind: '$car_model'
            },
            {
                $lookup: {
                    from: 'car_brand',
                    localField: 'car_details.car_brand_id',
                    foreignField: '_id',
                    as: 'car_brand'
                }
            },
            {
                $unwind: '$car_brand'
            }];
        if (req.body.selectFromDate && req.body.selectToDate) {
            var From_date = moment(req.body.selectFromDate).utc().startOf('day');
            var To_date = moment(req.body.selectToDate).utc().startOf('day');
            defaultQuery.push({
                $match: {
                      $and: [
                                { "from_time": { $gte: new Date(From_date) } },
                                { "to_time": { $lte: new Date(To_date) } },
                            ]
                        }
            })
        }
        defaultQuery.push(
            {
                $project: {
                    _id: 1,
                    no_of_rented: 1,
                    company_name: "$car_compnay.name",
                    from_time: 1,
                    to_time: 1,
                    booking_rent: 1,
                    isDeleted: 1,
                    trip_status: 1,
                    first_name: "$user_details.first_name",
                    last_name: "$user_details.last_name"
                }
            });
        if (typeof req.body.search !== 'undefined' && req.body.search !== null && Object.keys(req.body.search).length > 0 && req.body.search.value !== '') {
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
            defaultQuery.push(searchQuery);
        }
        if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
            var colIndex = req.body.order[0].column;
            var colname = req.body.columns[colIndex].name;
            var order = req.body.order[0].dir;
            if(req.body.columns[colIndex].isNumber){
                if(order == "asc"){
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: 1 }
                    });
                }else{
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: -1 }
                    });
                }
            }else{
                colname = '$' + colname;
                if (order == "asc") {
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
        }
        var totalrecords = await CarBooking.aggregate(defaultQuery);
        // console.log('defaultQuery===>', JSON.stringify(defaultQuery));
        CarBooking.aggregate(defaultQuery, function (err, data) {
            // console.log('data===>', data);
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: { recordsTotal: totalrecords.length, data: data }
                });
            }
        })
});



/**
 * @api {post} /admin/user/verify verify user license or id proof
 * @apiName verify User License or Id proof
 * @apiDescription This is for verify User License or Id proof
 * @apiGroup Admin - Users
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} user_id userId
 * @apiParam {String} driving_license_verification the driving_license_verification which you want to verify
 * @apiParam {String} id_card_verification the id_card_verification which you want to verify
 * 
 * 
 * @apiHeader {String}  Content-Type application/json   
 * @apiHeader {String}  x-access-token Admin unique access-key  
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/verify', async (req, res, next) => {
    console.log('here');
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "start is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var updateData = {};
        if (req.body.driving_license_verification) {
            updateData = Object.assign({}, { "driving_license_verification": 2 });
        }
        if (req.body.id_card_verification) {
            updateData = Object.assign(updateData, { "id_card_verification": 2 });
        }
        User.update({ _id: { $eq: req.body.user_id } }, { $set: updateData }, function (err, response) {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "Something went wrong",
                    error: err
                });
            } else {
                res.status(config.OK_STATUS).json({
                    status: "success",
                    message: "Document Verified successfully!!!"
                });
            }
        });
    } else {
        res.status(config.BAD_REQUEST).json({
            status: "failed",
            message: "Validation Error",
            error: errors
        });
    }
});
module.exports = router;
