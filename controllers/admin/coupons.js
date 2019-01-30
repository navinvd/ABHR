var express = require('express');
var router = express.Router();

var config = require('./../../config');
const couponHelper = require('./../../helper/coupon');
var Coupon = require('./../../models/coupon');
var ObjectId = require('mongoose').Types.ObjectId;


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
router.post('/list', (req, res, next) => {
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
        try{
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
                }
            ];
            if(typeof req.body.order !== 'undefined' && req.body.order.length>0){
                var colIndex = req.body.order[0].column;
                var colname = req.body.columns[colIndex].name;
                var order = req.body.order[0].dir;
                if(order == "asc"){
                    var sortableQuery = {
                        $sort: { [colname]: 1 }
                    }
                } else {
                    var sortableQuery = {
                        $sort: { [colname]: -1 }
                    } 
                } 
                defaultQuery.splice(defaultQuery.length - 2, 0, sortableQuery); 
            }
            if (typeof req.body.search !== 'undefined' && req.body.search !== null && Object.keys(req.body.search).length >0) {
                if (req.body.search.value) {
                    if(req.body.search.value === 'Admin' || req.body.search.value === 'admin' || req.body.search.value === 'ADMIN'){
                        var match = { 'car_rental_company_id' : {'$eq':null}};
                    }else{
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
                    defaultQuery.splice(defaultQuery.length - 2, 0, searchQuery);
                }
            }
            console.log('this is query for sahil==>',JSON.stringify(defaultQuery));
            Coupon.aggregate(defaultQuery, function (err, data) {
                if (err) {
                    console.log('err===>', err);
                    return next(err);
                } else {
                    console.log('result===>', data);
                    res.status(config.OK_STATUS).json({
                        message: "Success",
                        result: data.length != 0 ? data[0] : { recordsTotal: 0, data: [] }
                    });
                }
            })
        } catch (err){
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
        'coupon_code':{
            notEmpty: true,
            errorMessage: "Please enter coupon code",
        },
        'discount_rate':{
            notEmpty: true,
            errorMessage: "Please enter discount rate for coupon (eg. 50)",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var data = {
            coupon_code : req.body.coupon_code,
            discount_rate : parseInt(req.body.discount_rate)
        }
        if(req.body.idCompanyAdded){
            data = Object.assign(data, {"car_rental_company_id" : new ObjectId(req.body.company_id)});
        }
        const couponResp = await couponHelper.addCoupon(data);
        if(couponResp.status === 'success'){
            res.status(config.OK_STATUS).json(couponResp);
        } else{
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
 * @api {put} /admin/coupon/update Update coupon 
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
// add coupon
router.put('/update', async (req, res) => {
    var schema = {
        'coupon_id':{
            notEmpty: true,
            errorMessage: "Please enter coupon_id",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var data = {
            coupon_code : req.body.coupon_code,
            discount_rate : parseInt(req.body.discount_rate)
        }
        if(req.body.idCompanyAdded){
            isunset = false
            data = Object.assign(data, {"car_rental_company_id" : new ObjectId(req.body.company_id)});
        }else{
                isunset = true;
        }
        const couponResp = await couponHelper.updateCoupon(req.body.coupon_id, data, isunset);
        if(couponResp.status === 'success'){
            res.status(config.OK_STATUS).json(couponResp);
        } else{
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
        'coupon_id':{
            notEmpty: true,
            errorMessage: "Please enter coupon_id",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const couponResp = await couponHelper.deleteCoupon(req.body.coupon_id);
        if(couponResp.status === 'success'){
            res.status(config.OK_STATUS).json(couponResp);
        } else{
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
// add coupon
router.post('/check_coupon', async (req, res) => {
    var schema = {
        'coupon_code':{
            notEmpty: true,
            errorMessage: "Please enter coupon_code",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        try {
            var obj = { "coupon_code": req.body.coupon_code, "isDeleted": false };
            if (req.body.coupon_id) {
                var obj = { "coupon_code": req.body.coupon_code, "isDeleted": false, "_id": { "$ne": new ObjectId(req.body.coupon_id) } };
            }
            const couponResp = await couponHelper.checkCoupon(obj);
            if(couponResp.status === 'success'){
                res.status(config.OK_STATUS).json(couponResp);
            } else{
                res.status(config.OK_STATUS).json(couponResp);
            }  
            // var userId = await Company.findOne(obj);
            // if (userId !== null && userId !== '') {
            //     res.status(config.OK_STATUS).json({
            //         status: "success",
            //         message: "Record found"
            //     });
            // } else {
            //     res.status(config.OK_STATUS).json({
            //         status: "failed",
            //         message: "record not found"
            //     });
            // }
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
        'user_id':{
            notEmpty: true,
            errorMessage: "Please enter user id",
        },
        'coupon_code':{
            notEmpty: true,
            errorMessage: "Please enter coupon code",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const couponResp = await couponHelper.applyCoupon(req.body.user_id, req.body.coupon_code);
        if(couponResp.status === 'success'){
            res.status(config.OK_STATUS).json(couponResp);
        } else{
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
 * @api {get} /app/coupon/companies list of companies
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
    try{
        const couponResp = await couponHelper.companiList();
        if(couponResp.status === 'success'){
            res.status(config.OK_STATUS).json(couponResp);
        } else{
            res.status(config.BAD_REQUEST).json(couponResp);
        }
    } catch(e){
        res.status(config.BAD_REQUEST).json(couponResp);
    }   
});

module.exports = router;