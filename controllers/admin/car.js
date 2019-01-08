var express = require('express');
var router = express.Router();
var config = require('./../../config');
var User = require('./../../models/users');
var Company = require('./../../models/car_company');
var CarBooking = require('./../../models/car_booking');
var Car = require('./../../models/cars');
var path = require('path');
var async = require("async");
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');
var moment = require('moment');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var _ = require('underscore');
var mailHelper = require('./../../helper/mail');
const carHelper = require('./../../helper/car');
var fs = require('fs');
var path = require('path');

/**
 * @api {post} /admin/cars/report_list create report list for cars
 * @apiName Listing of cars report
 * @apiDescription This is for listing car report
 * @apiGroup Admin - Cars
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * @apiParam {String} car_id car id of perticular cars
 * 
 * @apiHeader {String}  Content-Type application/json   
 * @apiHeader {String}  x-access-token Admin unique access-key  
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/car/rental_list', (req, res, next) => {
    var schema = {
        'start': {
            notEmpty: true,
            errorMessage: "start is required"
        },
        'length': {
            notEmpty: true,
            errorMessage: "length is required"
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "car_id is required"
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
                    'userId': new ObjectId(req.body.car_id),
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

module.exports = router;