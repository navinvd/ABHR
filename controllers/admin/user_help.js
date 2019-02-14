var express = require('express');
var router = express.Router();

var config = require('./../../config');
var Help = require('./../../models/user_help');
var ObjectId = require('mongoose').Types.ObjectId;
var articleHelper = require('./../../helper/user_help');
var async = require("async");


/**
 * @api {post} /admin/help/list List of all superadmin help
 * @apiName Help List
 * @apiDescription To display help list with pagination
 * @apiGroup Admin - Help
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
        try{
        var defaultQuery = [ 
            {
                $lookup:
                {
                    from: "users",
                    localField: "_id",
                    foreignField: "userId",
                    as: "userDetails"
                }
            },
            {
                $unwind: {
                    "path": "$userDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $match: { "isDeleted": false }
            }];
        defaultQuery.push(
            {
                $project: {
                    _id: 1,
                    topic: 1,
                    name: "$userDetails.first_name",
                    description: 1,
                    isDeleted: 1,
                    status: 1,
                    createdAt:1
                }
            });
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

            var totalrecords = await Help.aggregate(defaultQuery);
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

            Help.aggregate(defaultQuery, function (err, data) {
                if (err) {
                    console.log('err===>', err);
                    return next(err);
                } else {
                    console.log('result===>', data);
                    res.status(config.OK_STATUS).json({
                        message: "Success",
                        result: { data: data, recordsTotal: totalrecords.length }
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
 * @api {post} /admin/help/add Add help article
 * @apiName Add New article 
 * @apiDescription Used to add new help article
 * @apiGroup Admin - Help
 * 
 * @apiParam {String} topic Add topic
 * @apiParam {String} description Add description here
 * @apiParam {String} userId userId
 * @apiParam {String} userType userType ["admin", "agent"]
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// add article
router.post('/add', async (req, res) => {
    var schema = {
        'topic':{
            notEmpty: true,
            errorMessage: "Please enter topic",
        },
        'description':{
            notEmpty: true,
            errorMessage: "Please enter description",
        },
        'userId': {
            notEmpty: true,
            errorMessage: "Please enter user Id",
        },
        'userType': {
            notEmpty: true,
            errorMessage: "Please enter userType",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var articleRep = await articleHelper.AddArticle(req.body);
        if(articleRep.status === 'success'){
            res.status(config.OK_STATUS).json(articleRep);
        } else{
            res.status(config.BAD_REQUEST).json(articleRep);
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
 * @api {put} /admin/help/update Update help article 
 * @apiName Update Article
 * @apiDescription Used to update article
 * @apiGroup Admin - Article
 * 
 * @apiParam {String} article_id articleId
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// add coupon
// router.put('/update', async (req, res) => {
//     var schema = {
//         'article_id':{
//             notEmpty: true,
//             errorMessage: "Please enter article_id",
//         }
//     };
//     req.checkBody(schema);
//     var errors = req.validationErrors();
//     if (!errors) {
//         var articleRep = await articleHelper.UpdateArticle(req.body);
//         if(articleRep.status === 'success'){
//             res.status(config.OK_STATUS).json(articleRep);
//         } else{
//             res.status(config.BAD_REQUEST).json(articleRep);
//         }
//     } else {
//         res.status(config.BAD_REQUEST).json({
//             status: 'failed',
//             message: "Validation Error",
//             errors
//         });
//     }
// });

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
// router.put('/delete', async (req, res) => {
//     var schema = {
//         'coupon_id':{
//             notEmpty: true,
//             errorMessage: "Please enter coupon_id",
//         }
//     };
//     req.checkBody(schema);
//     var errors = req.validationErrors();
//     if (!errors) {
//         const couponResp = await couponHelper.deleteCoupon(req.body.coupon_id);
//         if(couponResp.status === 'success'){
//             res.status(config.OK_STATUS).json(couponResp);
//         } else{
//             res.status(config.BAD_REQUEST).json(couponResp);
//         }   
//     } else {
//         res.status(config.BAD_REQUEST).json({
//             status: 'failed',
//             message: "Validation Error",
//             errors
//         });
//     }
// });

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
// router.post('/check_coupon', async (req, res) => {
//     var schema = {
//         'coupon_code':{
//             notEmpty: true,
//             errorMessage: "Please enter coupon_code",
//         }
//     };
//     req.checkBody(schema);
//     var errors = req.validationErrors();
//     if (!errors) {
//         try {
//             var obj = { "coupon_code": req.body.coupon_code, "isDeleted": false };
//             if (req.body.coupon_id) {
//                 var obj = { "coupon_code": req.body.coupon_code, "isDeleted": false, "_id": { "$ne": new ObjectId(req.body.coupon_id) } };
//             }
//             const couponResp = await couponHelper.checkCoupon(obj);
//             if(couponResp.status === 'success'){
//                 res.status(config.OK_STATUS).json(couponResp);
//             } else{
//                 res.status(config.OK_STATUS).json(couponResp);
//             }  
//             // var userId = await Company.findOne(obj);
//             // if (userId !== null && userId !== '') {
//             //     res.status(config.OK_STATUS).json({
//             //         status: "success",
//             //         message: "Record found"
//             //     });
//             // } else {
//             //     res.status(config.OK_STATUS).json({
//             //         status: "failed",
//             //         message: "record not found"
//             //     });
//             // }
//         } catch (error) {
//             res.status(config.OK_STATUS).json({
//                 status: "failed",
//                 message: "something went wrong",
//                 error: error
//             });
//         }
//     } else {
//         res.status(config.BAD_REQUEST).json({
//             status: "failed",
//             message: "Validation error"
//         });
//     }
// });

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
// router.post('/apply', async (req, res) => {
//     var schema = {
//         'user_id':{
//             notEmpty: true,
//             errorMessage: "Please enter user id",
//         },
//         'coupon_code':{
//             notEmpty: true,
//             errorMessage: "Please enter coupon code",
//         }
//     };
//     req.checkBody(schema);
//     var errors = req.validationErrors();
//     if (!errors) {
//         const couponResp = await couponHelper.applyCoupon(req.body.user_id, req.body.coupon_code);
//         if(couponResp.status === 'success'){
//             res.status(config.OK_STATUS).json(couponResp);
//         } else{
//             res.status(config.BAD_REQUEST).json(couponResp);
//         }
//     } else {
//         res.status(config.BAD_REQUEST).json({
//             status: 'failed',
//             message: "Validation Error",
//             errors
//         });
//     }
// });

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
// router.get('/companies', async (req, res) => {
//     try{
//         const couponResp = await couponHelper.companiList();
//         if(couponResp.status === 'success'){
//             res.status(config.OK_STATUS).json(couponResp);
//         } else{
//             res.status(config.BAD_REQUEST).json(couponResp);
//         }
//     } catch(e){
//         res.status(config.BAD_REQUEST).json(couponResp);
//     }   
// });

module.exports = router;