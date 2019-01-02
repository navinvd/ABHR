var express = require('express');
var router = express.Router();
var config = require('./../../config');
var User = require('./../../models/users');
var Place = require('./../../models/places');
var path = require('path');
var async = require("async");
var ObjectId = require('mongoose').Types.ObjectId;
var moment = require('moment');
var _ = require('underscore');
var mailHelper = require('./../../helper/mail');
var generator = require('generate-password');



/**
 * @api {post} /admin/staff/add create new staff member
 * @apiName Create Staff Member
 * @apiDescription This is for add new staff member from super admin
 * @apiGroup Admin - Staff
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} first_name FirstName
 * @apiParam {String} last_name LastName
 * @apiParam {String} phone_number User User Phone Number 
 * @apiParam {String} email User email address 
 * @apiParam {String} type device_type of application type ["ios", "anroid"]
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
        console.log('req param==>',req.body);
        var userData = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            phone_number: req.body.phone_number,
            email: req.body.email,
            type: "staff",
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
                var userModel = new User(userData);
                userModel.save(function (err, data) {
                    console.log("user data===>", data);
                    if (err) {
                        callback(err);
                    } else {
                        var result = {
                            message: "Staff added successfully..",
                            data: userData
                        };
                        var option = {
                            to: userData.email,
                            subject: 'ABHR - Staff Account Notification'
                        }
                        var loginURL = config.FRONT_END_URL + '#/admin/login';
                        var data = {
                            first_name: userData.first_name,
                            last_name: userData.last_name,
                            email: userData.email,
                            password: generatepassword,
                            link: loginURL
                        }
                        mailHelper.send('/staff/add_staff', option, data, function (err, res) {
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
 * @api {put} /admin/staff/update update Staff member details
 * @apiName Update Staff
 * @apiDescription Used to update staff member information
 * @apiGroup Admin - Staff
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} user_id User Id
 * @apiParam {String} first_name FirstName
 * @apiParam {String} last_name LastName
 * @apiParam {String} username Unique Username
 * @apiParam {String} phone_number User User Phone Number 
 * @apiParam {String} email User email address 
 * @apiParam {String} address google autocomplete address (optional)
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Admin unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/update', (req, res, next) =>{
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
            email: req.body.email
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
                            message: "Staff updated successfully..",
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
 * @api {get} /admin/staff/details/:id? Staff Details By Id
 * @apiName Staff member Details By Id
 * @apiDescription Get Staff details By user id
 * @apiGroup Admin - Staff
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

router.get('/details/:id', (req, res, next) =>{

    User.findOne({ _id: { $eq: req.params.id } }, function (err, data) {
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
 * @api {post} /admin/staff/list List of all staff
 * @apiName Staff List
 * @apiDescription To display staff list with pagination
 * @apiGroup Admin - Staff
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
    if(!errors){
        var defaultQuery = [
            {
                $match: {
                    "isDeleted": false,
                    "type": "staff"
                }
            },
            {
                $sort: {'createdAt': -1}
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
            defaultQuery.splice(defaultQuery.length - 2, 0, sortableQuery); 
        }
        if (req.body.search != undefined) {
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
            var searchQuery = {
                $match: match
            }
            defaultQuery.splice(defaultQuery.length - 2, 0, searchQuery);
        }
        User.aggregate(defaultQuery, function (err, data) {
            if (err) {
                console.log('err===>',err);
                return next(err);
            } else {
                console.log('result===>',data);
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: data.length != 0 ? data[0] : {recordsTotal: 0, data: []}
                });
            }
        })

    }else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

/**
 * @api {put} /admin/staff/delete delete Staff by Id
 * @apiName Delete Staff
 * @apiDescription Used to delete staff information
 * @apiGroup Admin - Staff
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
router.put('/delete', (req, res, next) =>{
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
        User.update({ _id: { $eq: req.body.user_id } }, { $set: {'isDeleted' : true} }, function (err, response) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Staff Member Deleted successfully..",
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
