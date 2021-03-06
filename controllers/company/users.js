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
 * @api {post} /company/users/report_list create report list for cars
 * @apiName Listing of users report
 * @apiDescription This is for listing user report
 * @apiGroup Admin - Users
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * @apiParam {String} company_id companyId 
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
            },
            {
                $match: {
                    "car_details.car_rental_company_id" : new ObjectId(req.body.company_id)
                }
            }];
            defaultQuery.push(
                {
                    $project: {
                        _id: 1,
                        no_of_rented: 1,
                        company_name: "$car_compnay.name",
                        from_time: 1,
                        to_time: { $subtract: [ "$to_time", 1*24*60*60000 ] },
                        booking_rent: 1,
                        isDeleted: 1,
                        trip_status:1,
                        car_modal: "$car_model.model_name",
                        car_brand: "$car_brand.brand_name",
                        first_name: "$user_details.first_name",
                        last_name:"$user_details.last_name",
                        createdAt:1
                    }
                });
            if (req.body.selectFromDate && req.body.selectToDate) {
                var From_date = moment(req.body.selectFromDate).utc();
                var To_date = moment(req.body.selectToDate).utc();
                defaultQuery.push({
                    $match: {
                        $and:[
                            { "from_time": { $gte: new Date(req.body.selectFromDate) } },
                            { "to_time": { $lte: new Date(req.body.selectToDate) } },
                        ]
                    },
                })
            }
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
        console.log('defaultQuery===>', JSON.stringify(defaultQuery));
        CarBooking.aggregate(defaultQuery, function (err, data) {
            console.log('data===>', data);
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
 * @api {post} /company/users/export_report_list create report list for cars
 * @apiName Listing of users export report list
 * @apiDescription This is for listing user export report
 * @apiGroup Admin - Users
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * @apiParam {String} company_id companyId 
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
            },
            {
                $match: {
                    "car_details.car_rental_company_id" : new ObjectId(req.body.company_id)
                }
            }];
            defaultQuery.push(
                {
                    $project: {
                        _id: 1,
                        no_of_rented: 1,
                        company_name: "$car_compnay.name",
                        from_time: 1,
                        to_time: { $subtract: [ "$to_time", 1*24*60*60000 ] },
                        booking_rent: 1,
                        isDeleted: 1,
                        trip_status:1,
                        first_name: "$user_details.first_name",
                        last_name:"$user_details.last_name"
                    }
                });
            if (req.body.selectFromDate && req.body.selectToDate) {
                var From_date = moment(req.body.selectFromDate).utc();
                var To_date = moment(req.body.selectToDate).utc();
                defaultQuery.push({
                    $match: {
                        $and:[
                            { "from_time": { $gte: new Date(req.body.selectFromDate) } },
                            { "to_time": { $lte: new Date(req.body.selectToDate) } },
                        ]
                    },
                })
            }
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
        console.log('defaultQuery===>', JSON.stringify(defaultQuery));
        CarBooking.aggregate(defaultQuery, function (err, data) {
            console.log('data===>', data);
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

module.exports = router;