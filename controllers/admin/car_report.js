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
// add coupon
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
 * @api {post} /admin/coupon/check_coupon Check coupon code
 * @apiName Check Coupon
 * @apiDescription Used to check coupon
 * @apiGroup Admin - Coupon
 * 
 * @apiParam {String} coupon_code Update coupon code
 * @apiParam {String} coupon_id couponId 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// check coupon
router.post('/check_coupon', async (req, res) => {
    var schema = {
        'coupon_code': {
            notEmpty: true,
            errorMessage: "Please enter coupon_code",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        try {
            var obj = {
                "coupon_code": { "$regex": req.body.coupon_code, "$options": "i" },
                "isDeleted": false
            }
            // var obj = { "coupon_code": req.body.coupon_code, "isDeleted": false };
            if (req.body.coupon_id) {
                obj = Object.assign(obj, { "_id": { "$ne": new ObjectId(req.body.coupon_id) } });
                // var obj = { "coupon_code": req.body.coupon_code, "isDeleted": false, "_id": { "$ne": new ObjectId(req.body.coupon_id) } };
            }
            const couponResp = await couponHelper.checkCoupon(obj);
            if (couponResp.status === 'success') {
                res.status(config.OK_STATUS).json({ status: "success", message: "Coupon Code Already Exist" });
            } else {
                res.status(config.OK_STATUS).json({ status: "failed" });
            }
        } catch (error) {
            res.status(config.OK_STATUS).json({
                status: "failed",
                message: "something went wrong",
                error: error
            });
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: "failed",
            message: "Validation error"
        });
    }
});

/**
 * @api {post} /app/coupon/apply Apply coupon code when book car
 * @apiName Apply coupon code
 * @apiDescription Used to use coupon code when book the car
 * @apiGroup App - Coupon
 * 
 * @apiParam {String} user_id id of user
 * @apiParam {String} coupon_code coupon code (eg "ABCD")

 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// apply coupon code
router.post('/apply', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id",
        },
        'coupon_code': {
            notEmpty: true,
            errorMessage: "Please enter coupon code",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const couponResp = await couponHelper.applyCoupon(req.body.user_id, req.body.coupon_code);
        if (couponResp.status === 'success') {
            res.status(config.OK_STATUS).json(couponResp);
        } else {
            res.status(config.BAD_REQUEST).json(couponResp);
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
 * @api {get} /admin/coupon/companies list of companies
 * @apiName List of company 
 * @apiDescription Used to list of company
 * @apiGroup Admin - Coupon
 * 
 * @apiParam {String} user_id id of user
 * @apiParam {String} coupon_code coupon code (eg "ABCD")
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// list of companies coupon code
router.get('/companies', async (req, res) => {
    try {
        const couponResp = await couponHelper.companiList();
        if (couponResp.status === 'success') {
            res.status(config.OK_STATUS).json(couponResp);
        } else {
            res.status(config.BAD_REQUEST).json(couponResp);
        }
    } catch (e) {
        res.status(config.BAD_REQUEST).json(couponResp);
    }
});

module.exports = router;