var express = require('express');
var router = express.Router();

var config = require('./../../config');
const couponHelper = require('./../../helper/coupon');
var Coupon = require('./../../models/coupon');
var ObjectId = require('mongoose').Types.ObjectId;
var path = require('path');
var fs = require('fs');

var Jimp = require('jimp');

/**
 * @api {post} /admin/coupon/list List of all superadmin coupon
 * @apiName Coupon List
 * @apiDescription To display coupons list with pagination
 * @apiGroup Admin - Coupon
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
        try {
            var defaultQuery = [
                {
                    $lookup: {
                        from: 'car_company',
                        foreignField: '_id',
                        localField: 'car_rental_company_id',
                        as: "companyDetails",
                    }
                },
                {
                    $unwind: {
                        "path": "$companyDetails",
                        "preserveNullAndEmptyArrays": true
                    }
                },
                {
                    $match: {
                        "isDeleted": false
                    }
                },
                {
                    $sort: { 'createdAt': -1 }
                }
                // {
                //     $group: {
                //         "_id": "",
                //         "recordsTotal": {
                //             "$sum": 1
                //         },
                //         "data": {
                //             "$push": "$$ROOT"
                //         }
                //     }
                // },
                // {
                //     $project: {
                //         "recordsTotal": 1,
                //         "data": "$data"
                //     }
                // }
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
                    var string = "admin";
                    if (string.includes(req.body.search.value.toLowerCase())) {
                        var match = { 'car_rental_company_id': { '$eq': null } };
                    } else {
                        console.log('in seacrch valie');
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
            }
            var totalRecords = await Coupon.aggregate(defaultQuery);

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
            Coupon.aggregate(defaultQuery, function (err, data) {
                if (err) {
                    console.log('err===>', err);
                    return next(err);
                } else {
                    // console.log('result===>', data);
                    res.status(config.OK_STATUS).json({
                        message: "Success",
                        result: { recordsTotal: totalRecords.length, data: data[0].data }
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
 * @api {post} /admin/coupon/add Add coupon 
 * @apiName Add New Coupon
 * @apiDescription Used to add coupon
 * @apiGroup Admin - Coupon
 * 
 * @apiParam {String} coupon_code Add coupon code here
 * @apiParam {Number} discount_rate rate (eg. 50)
 * @apiParam {Boolean} idCompanyAdded rate (eg. 50)
 * @apiParam {String} company_id rate (eg. 50)
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// add coupon
router.post('/add', async (req, res) => {
    var schema = {
        'coupon_code': {
            notEmpty: true,
            errorMessage: "Please enter coupon code",
        },
        'discount_rate': {
            notEmpty: true,
            errorMessage: "Please enter discount rate for coupon (eg. 50)",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        console.log('here');
        var obj = {
            "coupon_code": { "$regex": req.body.coupon_code, "$options": "i" },
            "isDeleted": false
        }
        const couponResp = await Coupon.findOne(obj);
        if (couponResp !== null && couponResp !== '' && typeof couponResp !== 'undefined') {
            res.status(config.BAD_REQUEST).json({
                status: 'failed',
                message: "Coupon Code Already Exist"
            });
        } else {
            var mimetype = config.mimetypes;
            var data = {
                coupon_code: req.body.coupon_code,
                discount_rate: req.body.discount_rate,
                description: req.body.description ? req.body.description : '',
                banner: null
            }
            if (req.files !== null && (mimetype.indexOf(req.files['banner_image'].mimetype) != -1)) {
                if (req.files['banner_image']) {
                    var file = req.files.banner_image;
                    var dir = "./upload/banner";
                    extention = path.extname(file.name);
                    filename = req.body.coupon_code + extention;
                    var filepath = dir + '/' + filename;
                    data.banner = filename;
                    file.mv(dir + '/' + filename, function (err) {
                        if (err) {
                            return (err);
                        } else {
                            Jimp.read(filepath, async (err, lenna) => {
                                if (!err) {
                                    lenna
                                    .quality(30) // set JPEG quality
                                    .write(filepath); // save
                                    }
                            });
                            data.banner = filename;
                        }
                    });
                }
            }
            if (typeof req.body.idCompanyAdded !== 'undefined' && req.body.idCompanyAdded == 'true') {
                data = Object.assign(data, { "car_rental_company_id": new ObjectId(req.body.company_id) });
            }
            const couponResp = await couponHelper.addCoupon(data);
            if (couponResp.status === 'success') {
                res.status(config.OK_STATUS).json(couponResp);
            } else {
                res.status(config.BAD_REQUEST).json(couponResp);
            }
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
 * @api {post} /admin/coupon/update Update coupon 
 * @apiName Update Coupon
 * @apiDescription Used to update coupon
 * @apiGroup Admin - Coupon
 * 
 * @apiParam {String} coupon_code Update coupon code
 * @apiParam {Number} discount_rate rate (eg. 50)
 * @apiParam {String} coupon_id couponId 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// update coupon
router.post('/update', async (req, res) => {
    var schema = {
        'coupon_id': {
            notEmpty: true,
            errorMessage: "Please enter coupon_id",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var data = {
            coupon_code: req.body.coupon_code,
            discount_rate: req.body.discount_rate,
            description: req.body.description ? req.body.description : '',
            banner: null
        }
        var mimetype = config.mimetypes;
        if (req.files !== null && typeof req.files['banner_image'] !== 'undefined' && (mimetype.indexOf(req.files['banner_image'].mimetype) != -1)) {
            if (req.files['banner_image']) {
                var file = req.files.banner_image;
                var dir = "./upload/banner";
                extention = path.extname(file.name);
                filename = req.body.coupon_code + extention;
                var filepath = dir + '/' + filename;
                if(req.body.old_banner_image !== 'null'){
                    fs.unlinkSync(dir + '/' + req.body.old_banner_image);
                }
                file.mv(dir + '/' + filename, function (err) {
                    if (err) {
                        return (err);
                    } else {
                        Jimp.read(filepath, async (err, lenna) => {
                            if (!err) {
                                lenna
                                .quality(30) // set JPEG quality
                                .write(filepath); // save
                                }
                        });
                        data.banner = filename;
                    }
                });
            }
        } else {
            data.banner = (req.body.old_banner_image !== 'null')? req.body.old_banner_image: null;
        }
        if (typeof req.body.idCompanyAdded !== 'undefined' && req.body.idCompanyAdded == 'true') {
            isunset = false
            data = Object.assign(data, { "car_rental_company_id": new ObjectId(req.body.company_id) });
        } else {
            isunset = true;
        }
        const couponResp = await couponHelper.updateCoupon(req.body.coupon_id, data, isunset);
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
 * @api {put} /admin/coupon/delete Delete coupon 
 * @apiName Delete Coupon
 * @apiDescription Used to Delete coupon
 * @apiGroup Admin - Coupon
 * 
 * @apiParam {String} coupon_id couponId 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// add coupon
router.put('/delete', async (req, res) => {
    var schema = {
        'coupon_id': {
            notEmpty: true,
            errorMessage: "Please enter coupon_id",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        if(req.body.banner && req.banner !== null && req.body.banner !== ""){
            var filepath = "./upload/banner/" + req.body.banner;
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
        }
        const couponResp = await couponHelper.deleteCoupon(req.body.coupon_id);
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