var express = require('express');
var router = express.Router();
var config = require('./../../config');
var Keyword = require('./../../models/keyword');
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');

/**
 * @api {post} /list
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
        console.log("req.body['columns']", req.body['columns'])
        if (req.body['search']['value']) {
            var regex = new RegExp(req.body['search']['value'])
            var match = {$or: []};
            req.body['columns'].forEach(function (obj) {
                if (obj.name) {
                    var json = {};
                    json[obj.name] = {
                        "$regex": regex,
                        "$options": "i"
                    }
                    match['$or'].push(json)
                }
            })

            var searchQuery = {
                $match: match
            }
            defaultQuery.splice(0, 0, searchQuery);
        }
        console.log("defaultQuery:", JSON.stringify(defaultQuery))
        Keyword.aggregate(defaultQuery, function (err, result) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: result ? result[0] : [],
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


/* @api {post} /save Save Keyword
 * @apiName Save Keyword
 * @apiDescription Used for Add Keyword 
 * @apiGroup Keyword
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} english Unique English 
 * @apiParam {String} arabic Arabic
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/save', (req, res, next) => {
    var schema = {
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
                    if (err.message.indexOf('english') != -1) {
                        res.status(config.BAD_REQUEST).json({
                            message: "English Keyqword already exist",
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
 * @api {put} /keyword Update keyword Details
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
router.put('/', auth, function (req, res, next) {
    var schema = {
        'keyword_id': {
            notEmpty: true,
            errorMessage: "keyword_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        Keyword.update({_id: {$eq: req.body.keyword_id}}, {$set: req.body}, function (err, response) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({message: "Keyword updated successfully"});
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
                user: data,
            });
        }
    });
});
  
module.exports = router;
