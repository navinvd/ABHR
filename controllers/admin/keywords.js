var express = require('express');
var router = express.Router();
var config = require('./../../config');
var Keyword = require('./../../models/keyword');
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');

/**
 * @api {post} /admin/keywords/list
 * @apiName Keyword List
 * @apiDescription Get Keyword Listing with Pagination
 * @apiGroup Keyword
 * @apiVersion 0.0.0
 *
 * @apiParam {String} start Starting position to read
 * @apiParam {String} length Number record needed per page
 *
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/list', function (req, res, next) {
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
        var defaultQuery = [{
                $match: {
                    isDeleted: false
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
            console.log('sort===>',sortableQuery);
            defaultQuery.splice(defaultQuery.length - 2, 0, sortableQuery); 
        }
        if (typeof req.body.search !== 'undefined' && req.body.search !== null && Object.keys(req.body.search).length >0) {
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
                defaultQuery.splice(defaultQuery.length - 2, 0, searchQuery);
                console.log("==>", JSON.stringify(searchQuery));
            }
        }
        console.log("defaultQuery:", JSON.stringify(defaultQuery))
        Keyword.aggregate(defaultQuery, function (err, result) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: result.length != 0 ? result[0] : { recordsTotal: 0, data: [] },
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


/* @api {post} /admin/keyword/save Save Keyword
 * @apiName Save Keyword
 * @apiDescription Used for Add Keyword 
 * @apiGroup Keyword
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} keyword Unique keyword 
 * @apiParam {String} english English 
 * @apiParam {String} arabic Arabic
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/save', (req, res, next) => {
    var schema = {
        'keyword': {
            notEmpty: true,
            errorMessage: "English is required"
        },
        'english': {
            notEmpty: true,
            errorMessage: "English is required"
        },
        'arabic': {
            notEmpty: true,
            errorMessage: "Arabic is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var keywordModel = new Keyword(req.body);
        keywordModel.save(function (err, keywordData) {
            console.log("data:", keywordData);
            if (err) {
                if (err.code == '11000') {
                    if (err.message.indexOf('keyword') != -1) {
                        res.status(config.BAD_REQUEST).json({
                            status: "falied",
                            message: "keyword already exist",
                            error: err
                        });
                    } else {
                        return next(err);
                    }
                } else {
                    return next(err);
                }
            } else {
                var result = {
                    status:"success",
                    message: "Keyword added successfully..",
                    data: keywordData
                };
                res.status(config.OK_STATUS).json(result);
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
 * @api {put} /admin/keyword/edit Update keyword Details
 * @apiName Update Keyword
 * @apiDescription Used to update keyword information
 * @apiGroup Keyword
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} keyword_id Keyword Id
 * @apiParam {String} english English Of Keyword 
 * @apiParam {String} arabic Arabic Of Keyword
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/edit', async function (req, res, next) {
    var schema = {
        'keyword_id': {
            notEmpty: true,
            errorMessage: "keyword_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var check = await Keyword.findOne({"_id":req.body.keyword_id, "isDeleted":false}).exec();
        if(check){
            Keyword.update({"_id": req.body.keyword_id}, {$set: req.body}, function (err, response) {
                if (err) {
                    if (err.code == '11000') {
                        if (err.message.indexOf('keyword') != -1) {
                            res.status(config.BAD_REQUEST).json({
                                status: "falied",
                                message: "keyword already exist",
                                error: err
                            });
                        } else {
                            return next(err);
                        }
                    } else {
                        return next(err);
                    }
                } else {
                    res.status(config.OK_STATUS).json({status: "success",message: "Keyword updated successfully"});
                }
            });
        }else{
            res.status(config.OK_STATUS).json({ status:"failed",message: "Record not found"});
        }      
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

/**
 * @api {put} /admin/keyword/edit Update keyword Details
 * @apiName Update Keyword
 * @apiDescription Used to update keyword information
 * @apiGroup Keyword
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} keyword_id Keyword Id
 * @apiParam {String} english English Of Keyword 
 * @apiParam {String} arabic Arabic Of Keyword
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/delete', async function (req, res, next) {
    var schema = {
        'keyword_id': {
            notEmpty: true,
            errorMessage: "keyword_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var check = await Keyword.findOne({"_id":req.body.keyword_id, "isDeleted":false}).exec();
        if(check){
            Keyword.update({"_id": req.body.keyword_id}, {$set: {"isDeleted": true}}, function (err, response) {
                if (err) {
                        return next(err);
                } else {
                    res.status(config.OK_STATUS).json({status: "success",message: "Keyword Deleted successfully"});
                }
            });
        }else{
            res.status(config.OK_STATUS).json({ status:"failed",message: "Record not found"});
        }      
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

/**
 * @api {get} /:id? Keyword Details By Id
 * @apiName Keyword Details By Id
 * @apiDescription Get Keyword details By keyword id
 * @apiGroup Keyword
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} id Keyword Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/:id', function (req, res, next) {
    Keyword.findOne({_id: {$eq: req.params.id}}, function (err, data) {
        if (err) {
            return next(err);
        } else {
            res.status(config.OK_STATUS).json({
                message: "Success",
                data: {data : data},
            });
        }
    });
});
  
module.exports = router;
