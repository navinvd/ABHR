var express = require('express');
var router = express.Router();
var config = require('./../../config');
var User = require('./../../models/users');
var Place = require('./../../models/places');
var CarBooking = require('./../../models/car_booking');
var path = require('path');
var async = require("async");
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');
var moment = require('moment');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var _ = require('underscore');
var mailHelper = require('./../../helper/mail');
var generator = require('generate-password');



/**
 * @api {post} /admin/agents/add create new agent
 * @apiName Create Agent
 * @apiDescription This is for add new agent from super admin
 * @apiGroup Admin - Agents
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} first_name FirstName
 * @apiParam {String} last_name LastName
 * @apiParam {String} phone_number User User Phone Number 
 * @apiParam {String} email User email address 
 * @apiParam {String} deviceType device_type of application type ["ios", "anroid"]
 * @apiParam {String} address google autocomplete address (optional)
 * 
 * @apiHeader {String}  Content-Type application/json   
 * @apiHeader {String}  x-access-token Admin unique access-key  
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/add', (req, res, next) => {
    var schema = {
        'first_name': {
            notEmpty: true,
            errorMessage: "FirstName is required"
        },
        'last_name': {
            notEmpty: true,
            errorMessage: "LastName is required"
        },
        'email': {
            notEmpty: true,
            errorMessage: "Email is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var generatepassword = generator.generate({
            length: 10,
            numbers: true
        });

        var userData = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            phone_number: req.body.phone_number,
            email: req.body.email,
            type: "agent",
            deviceType: 'android',
            password: generatepassword
        };
        async.waterfall([
            function (callback) {
                // Finding place and insert if not found
                if (req.body.address) {
                    Place.findOne({ "google_place_id": { $eq: req.body.address.placeId } }, function (err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            if (data.length != 0) {
                                userData.place_id = data.google_place_id
                                callback(null);
                            }
                            else {
                                var addressData = req.body.address;
                                var placeModel = new Place(addressData);
                                placeModel.save(function (err, placeData) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        userData.place_id = placeData._id;
                                        callback(null);
                                    }
                                });
                            }
                        }
                    });
                } else {
                    callback(null);
                }
            },
            function (callback) {
                var email = 0;
                User.find({ "email": req.body.email }, function (err, data) {
                    if (data && data.length > 0) {
                        email = 1;
                        callback({message:"Email is already exist", email :email});
                    }
                    else {
                        // callback(null);
                        callback(null,{"email":email});
                    }
                    if (err) {
                        console.log('Error====>', err);
                        callback(err);
                    }
                });
            },
            function (err, callback) {
                if (err.email === 0) {
                    var userModel = new User(userData);
                    userModel.save(function (err, data) {
                        console.log("user data===>", data);
                        if (err) {
                            callback(err);
                        } else {
                            var result = {
                                message: "Agent added successfully..",
                                data: userData
                            };
                            var option = {
                                to: userData.email,
                                subject: 'ABHR - Agent Account Notification'
                            }
                            var loginURL = config.FRONT_END_URL + '#/admin/login';
                            var data = {
                                first_name: userData.first_name,
                                last_name: userData.last_name,
                                email: userData.email,
                                password: generatepassword,
                                link: loginURL
                            }
                            mailHelper.send('/agents/add_agent', option, data, function (err, res) {
                                if (err) {
                                    console.log("Mail Error:", err);
                                    callback(err);
                                } else {
                                    // callback(null, null);
                                    callback(null, result);
                                    console.log("Mail Success:", res);
                                }
                            })
                        }
                    });
                }
                else{
                    callback(err.message);
                    }


            }], function (err, result) {
                console.log("err",err)
                if (err) {
                    console.log("Here");
                    return next(err.message);
                } else {
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
 * @api {put} /admin/agents/update update Agent details
 * @apiName Update Agent
 * @apiDescription Used to update agent information
 * @apiGroup Admin - Agents
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} user_id User Id
 * @apiParam {String} first_name FirstName
 * @apiParam {String} last_name LastName
 * @apiParam {String} username Unique Username
 * @apiParam {String} phone_number User User Phone Number 
 * @apiParam {String} email User email address 
 * @apiParam {String} address google autocomplete address (optional)
 * @apiParam {String} deviceType device_type of application type ["ios", "anroid"]
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Admin unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/update', (req, res, next) => {
    console.log('here');
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "user_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var userData = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            phone_number: req.body.phone_number,
            email: req.body.email,
            deviceType: req.body.deviceType
        };
        async.waterfall([
            function (callback) {
                if (req.body.address) {
                    Place.findOne({ "google_place_id": { $eq: req.body.address.placeId } }, function (err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            if (data.length != 0) {
                                userData.place_id = data.google_place_id
                                callback(null, userData);
                            }
                            else {
                                var addressData = req.body.address;
                                var placeModel = new Place(addressData);
                                placeModel.save(function (err, placeData) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        userData.place_id = placeData._id;
                                        callback(null, userData);
                                    }
                                });
                            }
                        }
                    });
                } else {
                    callback(null, userData);
                }
            },
            function (userData, callback) {
                User.update({ _id: { $eq: req.body.user_id } }, { $set: userData }, function (err, response) {
                    if (err) {
                        callback(err);
                    } else {
                        var result = {
                            message: "Agent updated successfully..",
                            data: response
                        };
                        console.log('in updated')
                        callback(null, result);
                    }
                });
            }], function (err, result) {
                if (err) {
                    console.log("Here");
                    return next(err);
                } else {
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
 * @api {put} /admin/agents/delete delete Agent by Id
 * @apiName Delete Agent
 * @apiDescription Used to delete agent information
 * @apiGroup Admin - Agents
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} user_id User Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Admin unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/delete', (req, res, next) => {
    console.log('here');
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "user_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        User.update({ _id: { $eq: req.body.user_id } }, { $set: { 'isDeleted': true } }, function (err, response) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Agent Deleted successfully..",
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

/**
 * @api {get} /admin/agents/details/:id? Agent Details By Id
 * @apiName Agent Details By Id
 * @apiDescription Get Agent details By user id
 * @apiGroup Admin - Agents
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} id User Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.get('/details/:id', (req, res, next) => {

    User.findOne({ _id: { $eq: req.params.id }, "isDeleted": false }, function (err, data) {
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

/**
 * @api {post} /admin/agents/list List of all agents
 * @apiName Agents List
 * @apiDescription To display agents list with pagination
 * @apiGroup Admin - Agents
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
        var defaultQuery = [
            {
                $match: {
                    "isDeleted": false,
                    "type": "agent"
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
        if(req.body.order != undefined){
            var colIndex = req.body.order[0].column;
            var colname = req.body.columns[colIndex].name;
            var order = req.body.order[0].dir;
            if(order == "asc"){
                var sortableQuery = {
                    $sort: { colname: 1 }
                }
            } else {
                var sortableQuery = {
                    $sort: { colname: -1 }
                } 
            } 
            defaultQuery.splice(defaultQuery.length - 2, 0, searchQuery); 
        }
        console.log('search data==>', req.body.search);
        console.log('type of==>',typeof req.body.search);
        if (req.body.search != undefined && req.body.search) {
            if (req.body.search.value != undefined) {
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
            console.log('re.body.search==>', req.body.search.value);

            var searchQuery = {
                $match: match
            }
            defaultQuery.splice(defaultQuery.length - 2, 0, searchQuery);
            console.log("==>", JSON.stringify(defaultQuery));
        }
        console.log('this is query for sahil==>',JSON.stringify(defaultQuery));
        User.aggregate(defaultQuery, function (err, data) {
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
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

/**
 * @api {post} /admin/agents/rental_list List of all rental of agents
 * @apiName Agent Rental List
 * @apiDescription To display agent rental list with pagination
 * @apiGroup Admin - Agents
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
router.post('/rental_list', (req, res, next) => {
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
                $lookup:
                {
                    from: "users",
                    localField: "agentId",
                    foreignField: "_id",
                    as: "agentId"
                }
            },
            {
                $unwind: {
                    "path": "$agentId",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup:
                {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userId"
                }
            },
            {
                $unwind: {
                    "path": "$userId",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $match: { "isDeleted": false }
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
                    "_id": 1,
                    "recordsTotal": 1,
                    "data": { "$slice": ["$data", parseInt(req.body.start), parseInt(req.body.length)] }
                }
            }
        ];
        CarBooking.aggregate(defaultQuery, function (err, data) {
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

    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});
module.exports = router;
