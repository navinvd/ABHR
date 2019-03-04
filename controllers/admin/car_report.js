var express = require('express');
var router = express.Router();

var config = require('./../../config');
const ReportHelper = require('./../../helper/report');
var Categoy = require('./../../models/report_category');
var Report = require('./../../models/car_report');
var ObjectId = require('mongoose').Types.ObjectId;
var path = require('path');
var fs = require('fs');

/**
 * @api {post} /admin/reports/category_list List of all superadmin category
 * @apiName Category List
 * @apiDescription To display category list with pagination
 * @apiGroup Admin - Feedback
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} length pagination length no of page length
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/category_list', async (req, res, next) => {
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
        try {
            var defaultQuery = [
                {
                    $match: {
                        "isDeleted": false
                    }
                },
                {
                    $sort: { 'createdAt': -1 }
                }
            ];
            if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
                var colIndex = req.body.order[0].column;
                var colname = req.body.columns[colIndex].name;
                var order = req.body.order[0].dir;
                if (req.body.columns[colIndex].isNumber) {
                    if (order == "asc") {
                        defaultQuery = defaultQuery.concat({
                            $sort: { [colname]: 1 }
                        });
                    } else {
                        defaultQuery = defaultQuery.concat({
                            $sort: { [colname]: -1 }
                        });
                    }
                } else {
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
            if (typeof req.body.search !== 'undefined' && req.body.search !== null && Object.keys(req.body.search).length > 0) {
                if (req.body.search.value) {
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
                    var searchQuery = {
                        $match: match
                    }
                    defaultQuery.push(searchQuery);
                }
            }
            var totalRecords = await Categoy.aggregate(defaultQuery);

            if (req.body.start !== null) {
                console.log('in skip===>')
                defaultQuery.push({
                    "$skip": req.body.start
                });
            }
            if (req.body.length) {
                defaultQuery.push({
                    "$limit": req.body.length
                });
            }

            defaultQuery = defaultQuery.concat({
                $group: {
                    "_id": "",
                    "data": {
                        "$push": "$$ROOT"
                    }
                }
            },
                {
                    $project: {
                        "data": "$data"
                    }
                });

            console.log('this is query for sahil==>', JSON.stringify(defaultQuery));
            Categoy.aggregate(defaultQuery, function (err, data) {
                if (err) {
                    console.log('err===>', err);
                    return next(err);
                } else {
                    console.log('result===>', data);
                    res.status(config.OK_STATUS).json({
                        message: "Success",
                        result: { recordsTotal: totalRecords.length, data: data.length > 0 ? data[0].data : [] }
                    });
                }
            })
        } catch (err) {
            res.status(config.BAD_REQUEST).json({
                status: "failed",
                error: err
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
 * @api {post} /admin/reports/add/category Add category 
 * @apiName Add New Category
 * @apiDescription Used to add category
 * @apiGroup Admin - Feedback
 * 
 * @apiParam {String} category_name Add category_name 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// add category
router.post('/add/category', async (req, res) => {
    var schema = {
        'category_name': {
            notEmpty: true,
            errorMessage: "Please enter coupon code",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
            const categoryResp = await ReportHelper.addCategory({"category_name": req.body.category_name});
            if (categoryResp.status === 'success') {
                res.status(config.OK_STATUS).json(categoryResp);
            } else {
                res.status(config.BAD_REQUEST).json(categoryResp);
            }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

/**
 * @api {post} /admin/reports/update/category Update category 
 * @apiName Update Category
 * @apiDescription Used to update category
 * @apiGroup Admin - Feedback
 * 
 * @apiParam {String} [category_name] Update coupon code
 * @apiParam {String} category_id unique id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// update category
router.post('/update/category', async (req, res) => {
    var schema = {
        'category_id': {
            notEmpty: true,
            errorMessage: "Please enter category_id",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const categoryResp = await ReportHelper.updateCategory(req.body);
        if (categoryResp.status === 'success') {
            res.status(config.OK_STATUS).json(categoryResp);
        } else {
            res.status(config.BAD_REQUEST).json(categoryResp);
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

/**
 * @api {put} /admin/reports/delete/category Delete category 
 * @apiName Delete Category
 * @apiDescription Used to Delete category
 * @apiGroup Admin - Feedback
 * 
 * @apiParam {String} category_id category_id 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// delete category
router.put('/delete/category', async (req, res) => {
    var schema = {
        'category_id': {
            notEmpty: true,
            errorMessage: "Please enter category_id",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const categoryResp = await ReportHelper.deleteCategory(req.body.category_id);
        if (categoryResp.status === 'success') {
            res.status(config.OK_STATUS).json(categoryResp);
        } else {
            res.status(config.BAD_REQUEST).json(categoryResp);
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

/**
 * @api {post} /admin/reports/list create reported car list
 * @apiName Listing of reported
 * @apiDescription This is for listing reported car
 * @apiGroup Admin - Feedback
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
router.post('/list', async (req, res, next) => {

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
                "$sort":{
                    "createdAt": -1
                }
            },
            {
              "$match": {
                "isDeleted": false,
              }
            },
            {
              "$lookup": {
                "from": "report_category",
                "localField": "report_type",
                "foreignField": "_id",
                "as": "categoryDetails",
              }
            },
            {
              "$unwind": {
                "path": "$categoryDetails",
                "preserveNullAndEmptyArrays": true
              }
            },
            {
              "$lookup": {
                "from": "users",
                "localField": "car_handover_by_agent_id",
                "foreignField": "_id",
                "as": "agent_for_handover",
              }
            },
            {
              "$unwind": {
                  "path": "$aget_for_handover",
                  "preserveNullAndEmptyArrays": true
              }
            },
            {
              "$lookup": {
                "from": "users",
                "localField": "car_receive_by_agent_id",
                "foreignField": "_id",
                "as": "agent_for_receive",
              }
            },
            {
              "$unwind": {
                  "path": "$agent_for_receive",
                  "preserveNullAndEmptyArrays": true
              }
            },
            {
                "$lookup": {
                  "from": "coupons",
                  "localField": "coupon_code",
                  "foreignField": "coupon_code",
                  "as": "coupon_details",
                }
              },
              {
                "$unwind": {
                    "path": "$coupon_details",
                    "preserveNullAndEmptyArrays": true
                }
              },
            {
              "$lookup": {
                "from": "car_company",
                "localField": "car_details.car_rental_company_id",
                "foreignField": "_id",
                "as": "car_compnay"
              }
            },
            {
              "$unwind": "$car_compnay"
            },
            {
              "$lookup": {
                "from": "car_model",
                "localField": "car_details.car_model_id",
                "foreignField": "_id",
                "as": "car_model",
              }
            },
            {
              "$unwind": "$car_model"
            },
            {
              "$lookup": {
                "from": "car_brand",
                "localField": "car_details.car_brand_id",
                "foreignField": "_id",
                "as": "car_brand",
              }
            },
            {
              "$unwind": "$car_brand"
            },
            {
              "$lookup": {
                "from": "users",
                "localField": "userId",
                "foreignField": "_id",
                "as": "user_details",
              }
            },
            {
              "$unwind": {
                "path":  "$user_details",
                "preserveNullAndEmptyArrays": true,
              }
            },
            {
              "$project": {
                "_id": 1,
                "company_name": "$car_compnay.name",
                // "car_model": "$car_model.model_name",
                // "car_brand": "$car_brand.brand_name",
                "isDeleted": 1,
                // "firts_name": "$user_details.first_name",
                // "last_name": "$user_details.last_name",
                "from_time": 1,
                "to_time": 1,
                "total_booking_amount": 1,
                "defect_amount":1,
                "transaction_status":1,
                "total_amount":{$multiply : ["$booking_rent", "$days"]},
                "vat": {
                    "$cond": {
                      "if": {"$eq":["$coupon_code",null]},
                      "then": {$divide :[
                                    {$multiply : [
                                        {$multiply : ["$booking_rent", "$days"]}, 
                                        "$vat"
                                    ]},
                                    100
                                ]},
                      "else":{
                          $divide :[
                                    {$multiply : [
                                        {$subtract: [ 
                                            {$multiply : ["$booking_rent", "$days"]},
                                            {$divide :[
                                                {$multiply : [
                                                    {$multiply : ["$booking_rent", "$days"]}, 
                                                    "$coupon_percentage"
                                                ]},
                                                100
                                            ]}
                                       ]}, 
                                        "$vat"
                                    ]},
                                    100
                                ]}
                            }
                },
                "booking_number": 1,
                "deposite_amount": 1,
                "coupon_percentage": {
                    "$cond": {
                      "if": {"$eq":["$coupon_code",null]},
                      "then": 0,
                      "else":{
                        $divide :[
                            {$multiply : [
                                {$multiply : ["$booking_rent", "$days"]}, 
                                "$coupon_percentage"
                            ]},
                            100
                        ]}
                    }
                },
                "coupon_code": 1,
                "createdAt":1
              }
            }
          ];
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
        // console.log('defaultQuery', JSON.stringify(defaultQuery));

        if (typeof req.body.search !== "undefined" && req.body.search !== null && Object.keys(req.body.search).length > 0 && req.body.search.value !== '') {
            if (req.body.search.value != undefined && req.body.search.value !== '') {
                var regex = new RegExp(req.body.search.value);
                var match = { $or: [] };
                req.body['columns'].forEach(function (obj) {
                    if (obj.name) {
                        var json = {};
                        if (obj.isNumber) {
                            // console.log(typeof parseInt(req.body.search.value));
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
            // console.log('re.body.search==>', req.body.search.value);
            var searchQuery = {
                $match: match
            }
            defaultQuery.push(searchQuery);
            // console.log("==>", JSON.stringify(defaultQuery));
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
                    result: { data: data, recordsTotal: totalrecords.length }
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