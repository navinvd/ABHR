var express = require('express');
var router = express.Router();
var config = require('./../../config');
var Transaction = require('./../../models/transaction');
var ObjectId = require('mongoose').Types.ObjectId;
var moment = require('moment');
var _ = require('underscore');

/**
 * @api {post} /company/transaction/report_list create transaction list for booking
 * @apiName Listing of transaction booking
 * @apiDescription This is for listing booking transaction
 * @apiGroup CompanyAdmin - Transaction
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * @apiParam {String} company_id CompanyId
 * 
 * @apiHeader {String}  Content-Type application/json   
 * @apiHeader {String}  x-access-token Admin unique access-key  
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/report_list', async (req, res, next) => {

    var schema = {
        'start': {
            notEmpty: true,
            errorMessage: "start is required"
        },
        'length': {
            notEmpty: true,
            errorMessage: "length is required"
        },
        'company_id': {
            notEmpty: true,
            errorMessage: "company_id is required"
        },
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var defaultQuery = [
            {
              "$match": {
                "isDeleted": false,
              }
            },
            {
              "$lookup": {
                "from": "cars",
                "localField": "carId",
                "foreignField": "_id",
                "as": "car_details",
              }
            },
            {
              "$unwind": {
                "path": "$car_details",
                "preserveNullAndEmptyArrays": true
              }
            },
            {
              "$lookup": {
                "from": "car_booking",
                "localField": "booking_number",
                "foreignField": "booking_number",
                "as": "car_booking_details",
              }
            },
            {
              "$unwind": {
                  "path": "$car_booking_details",
                  "preserveNullAndEmptyArrays": true
              }
            }, 
            {
              "$lookup": {
                "from": "users",
                "localField": "car_booking_details.car_handover_by_agent_id",
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
                "localField": "car_booking_details.car_receive_by_agent_id",
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
                "$match": {
                  "car_details.car_rental_company_id": new ObjectId(req.body.company_id),
                }
              },
            {
              "$project": {
                "_id": 1,
                "company_name": "$car_compnay.name",
                "car_model": "$car_model.model_name",
                "car_brand": "$car_brand.brand_name",
                "isDeleted": 1,
                "firts_name": "$user_details.first_name",
                "last_name": "$user_details.last_name",
                "from_time": 1,
                "to_time": 1,
                "Transaction_amount": 1,
                "VAT": 1,
                "car_handover_first_name": { $arrayElemAt: [ "$agent_for_handover.first_name", 0 ] },
                "car_handover_last_name": { $arrayElemAt: [ "$agent_for_handover.last_name", 0 ] },
                "car_receive_first_name": "$agent_for_receive.first_name",
                "car_receive_last_name": "$agent_for_receive.last_name",
                "booking_number": 1,
                "deposite_amount": 1,
                "coupon_code": 1,
                "status": 1,
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
        console.log('defaultQuery', JSON.stringify(defaultQuery));

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
        var totalrecords = await Transaction.aggregate(defaultQuery);
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
        Transaction.aggregate(defaultQuery, function (err, data) {
            console.log('data===>', data);
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

/**
 * @api {post} /company/transaction/export_report_list create transaction list for booking
 * @apiName Listing of transaction export booking
 * @apiDescription This is for listing export booking transaction
 * @apiGroup CompanyAdmin - Transaction
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * @apiParam {String} company_id CompanyId
 *  
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/export_report_list', async (req, res, next) => {

        var defaultQuery = [
            {
              "$match": {
                "isDeleted": false,
              }
            },
            {
              "$lookup": {
                "from": "cars",
                "localField": "carId",
                "foreignField": "_id",
                "as": "car_details",
              }
            },
            {
              "$unwind": {
                "path": "$car_details",
                "preserveNullAndEmptyArrays": true
              }
            },
            {
              "$lookup": {
                "from": "car_booking",
                "localField": "booking_number",
                "foreignField": "booking_number",
                "as": "car_booking_details",
              }
            },
            {
              "$unwind": {
                  "path": "$car_booking_details",
                  "preserveNullAndEmptyArrays": true
              }
            }, 
            {
              "$lookup": {
                "from": "users",
                "localField": "car_booking_details.car_handover_by_agent_id",
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
                "localField": "car_booking_details.car_receive_by_agent_id",
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
                "$match": {
                  "car_details.car_rental_company_id": new ObjectId(req.body.company_id),
                }
              },
            {
              "$project": {
                "_id": 1,
                "company_name": "$car_compnay.name",
                "car_model": "$car_model.model_name",
                "car_brand": "$car_brand.brand_name",
                "isDeleted": 1,
                "firts_name": "$user_details.first_name",
                "last_name": "$user_details.last_name",
                "from_time": 1,
                "to_time": 1,
                "Transaction_amount": 1,
                "VAT": 1,
                "car_handover_first_name": { $arrayElemAt: [ "$agent_for_handover.first_name", 0 ] },
                "car_handover_last_name": { $arrayElemAt: [ "$agent_for_handover.last_name", 0 ] },
                "car_receive_first_name": "$agent_for_receive.first_name",
                "car_receive_last_name": "$agent_for_receive.last_name",
                "booking_number": 1,
                "deposite_amount": 1,
                "coupon_code": 1,
                "status": 1,
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
        console.log('defaultQuery', JSON.stringify(defaultQuery));

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
        var totalrecords = await Transaction.aggregate(defaultQuery);
        console.log('defaultQuery===>', JSON.stringify(defaultQuery));
        Transaction.aggregate(defaultQuery, function (err, data) {
            console.log('data===>', data);
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: { data: data, recordsTotal: totalrecords.length }
                });
            }
        })
});


/**
 * @api {post} /company/transaction/list create transaction list for booking
 * @apiName Listing of booking transaction
 * @apiDescription This is for listing booking transaction
 * @apiGroup CompanyAdmin - Transaction
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * @apiParam {String} company_id CompanyId
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
        },
        'company_id': {
            notEmpty: true,
            errorMessage: "company_id is required"
        },
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var defaultQuery = [
            {
              "$match": {
                "isDeleted": false,
              }
            },
            {
              "$lookup": {
                "from": "cars",
                "localField": "carId",
                "foreignField": "_id",
                "as": "car_details",
              }
            },
            {
              "$unwind": {
                "path": "$car_details",
                "preserveNullAndEmptyArrays": true
              }
            },
            {
              "$lookup": {
                "from": "car_booking",
                "localField": "booking_number",
                "foreignField": "booking_number",
                "as": "car_booking_details",
              }
            },
            {
              "$unwind": {
                  "path": "$car_booking_details",
                  "preserveNullAndEmptyArrays": true
              }
            }, 
            {
              "$lookup": {
                "from": "users",
                "localField": "car_booking_details.car_handover_by_agent_id",
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
                "localField": "car_booking_details.car_receive_by_agent_id",
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
                "$match": {
                  "car_details.car_rental_company_id": new ObjectId(req.body.company_id),
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
                "Transaction_amount": 1,
                "VAT": 1,
                // "car_handover_first_name": { $arrayElemAt: [ "$agent_for_handover.first_name", 0 ] },
                // "car_handover_last_name": { $arrayElemAt: [ "$agent_for_handover.last_name", 0 ] },
                // "car_receive_first_name": "$agent_for_receive.first_name",
                // "car_receive_last_name": "$agent_for_receive.last_name",
                "booking_number": 1,
                "deposite_amount": 1,
                "coupon_rate": "$coupon_details.discount_rate",
                "coupon_code": 1,
                "status": 1,
                "createdAt":1
              }
            }
          ];
        if (req.body.selectFromDate && req.body.selectToDate) {
            var From_date = moment(req.body.date).utc();
            var To_date = moment(req.body.date).utc();
            defaultQuery.push({
                $match: {
                    $and:[
                        { "from_time": { $lte: To_date } },
                        { "to_time": { $gte: From_date } },
                    ]
                },
            })
        }
        console.log('defaultQuery', JSON.stringify(defaultQuery));
        var totalrecords = await Transaction.aggregate(defaultQuery);

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
        Transaction.aggregate(defaultQuery, function (err, data) {
            console.log('data===>', data);
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


/**
 * @api {post} /company/transaction/details transaction detail page
 * @apiName Details of transaction 
 * @apiDescription This is for display details of transaction
 * @apiGroup CompanyAdmin - Transaction
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} transaction_id TransactionId
 * 
 * @apiHeader {String}  Content-Type application/json   
 * @apiHeader {String}  x-access-token Admin unique access-key  
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/details', async (req, res, next) => {

    var schema = {
        'transaction_id': {
            notEmpty: true,
            errorMessage: "transaction_id is required"
        },
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var defaultQuery = [
            {
              "$match": {
                "isDeleted": false,
                "_id": new ObjectId(req.body.transaction_id)
              }
            },
            {
              "$lookup": {
                "from": "cars",
                "localField": "carId",
                "foreignField": "_id",
                "as": "car_details",
              }
            },
            {
              "$unwind": {
                "path": "$car_details",
                "preserveNullAndEmptyArrays": true
              }
            },
            {
              "$lookup": {
                "from": "car_booking",
                "localField": "booking_number",
                "foreignField": "booking_number",
                "as": "car_booking_details",
              }
            },
            {
              "$unwind": {
                  "path": "$car_booking_details",
                  "preserveNullAndEmptyArrays": true
              }
            }, 
            {
              "$lookup": {
                "from": "users",
                "localField": "car_booking_details.car_handover_by_agent_id",
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
                "localField": "car_booking_details.car_receive_by_agent_id",
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
            // {
            //   "$project": {
            //     "_id": 1,
            //     "company_name": "$car_compnay.name",
            //     "car_model": "$car_model.model_name",
            //     "car_brand": "$car_brand.brand_name",
            //     "isDeleted": 1,
            //     "firts_name": "$user_details.first_name",
            //     "last_name": "$user_details.last_name",
            //     "from_time": 1,
            //     "to_time": 1,
            //     "Transaction_amount": 1,
            //     "VAT": 1,
            //     "car_handover_first_name": { $arrayElemAt: [ "$agent_for_handover.first_name", 0 ] },
            //     "car_handover_last_name": { $arrayElemAt: [ "$agent_for_handover.last_name", 0 ] },
            //     "car_receive_first_name": "$agent_for_receive.first_name",
            //     "car_receive_last_name": "$agent_for_receive.last_name",
            //     "booking_number": 1,
            //     "deposite_amount": 1,
            //     "coupon_rate": "$coupon_details.discount_rate",
            //     "coupon_code": 1,
            //     "status": 1,
            //  }
            // }
          ];
        Transaction.aggregate(defaultQuery, function (err, data) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: { data: data[0]}
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
 * @api {put} /admin/transaction/edit
 * @apiName Edit Transaction
 * @apiDescription Used to edit transaction
 * @apiGroup CompanyAdmin - Transaction
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} transaction_id Transaction Id
 * @apiParam {String} status Status ["inprogress", "cancelled", "Successfull", "failed"]
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Admin unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/edit', (req, res, next) => {
    var schema = {
        'transaction_id': {
            notEmpty: true,
            errorMessage: "transaction_id is required"
        },
        'status':{
            notEmpty: true,
            errorMessage: "status is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        Transaction.update({
            _id: new ObjectId(req.body.transaction_id)
        }, {
                $set: {
                    'status': req.body.status
                }
            }, function (err, response) {
                if (err) {
                    return next(err);
                } else {
                    res.status(config.OK_STATUS).json({
                        message: "Status Changed successfully..",
                    });
                }
            });
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

module.exports = router;