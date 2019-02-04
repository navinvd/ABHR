var express = require('express');
var router = express.Router();
var config = require('./../../config');
var CarBooking = require('./../../models/car_booking');
var _ = require('underscore');

/**
 * @api {post} /admin/tracking/delivering List of car which is in delivering process
 * @apiName Car Delivering List
 * @apiDescription To display cars which is in delivering process
 * @apiGroup Admin - Car-Tracking
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
router.post('/delivering', (req, res, next) => {
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
                    "agent_assign_for_handover": true
                }
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
                    "path": "$car_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'car_handover_by_agent_id',
                    foreignField: '_id',
                    as: 'agent_for_handover'
                }
            },
            {
                $unwind: {
                    "path": "$agent_for_handover",
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
                    localField: 'car_details.car_brand_id',
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
                "$project": {
                    "_id": 1,
                    "agent_first_name": "$agent_for_handover.first_name",
                    "agent_last_name": "$agent_for_handover.last_name",
                    "booking_number": 1,
                    "from_time": 1,
                    "to_time": 1,
                    "model_name": "$car_model.model_name",
                    "brand_name": "$car_brand.brand_name",
                    "agent_assign_for_handover": 1
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
                    "data": { "$slice": ["$data", parseInt(req.body.start), parseInt(req.body.length)] }
                }
            }];
        if (typeof req.body.search !== 'undefined' && req.body.search !== null && Object.keys(req.body.search).length >0) {
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
            colname = '$' + colname;
            var order = req.body.order[0].dir;
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
        console.log('defaultQuery===>', defaultQuery);
        CarBooking.aggregate(defaultQuery, function (err, data) {
            if (err) {
                return next(err);
            } else {
                console.log(data);
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: data.length != 0 ? data[0] : { recordsTotal: 0, data: [] }
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