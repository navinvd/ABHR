var express = require('express');
var router = express.Router();
var config = require('./../../config');
var User = require('./../../models/users');
var Company = require('./../../models/car_company');
var Place = require('./../../models/places');
var CarBooking = require('./../../models/car_booking');
var Car = require('./../../models/cars');
var path = require('path');
var async = require("async");
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');
var moment = require('moment');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var _ = require('underscore');
var mailHelper = require('./../../helper/mail');
var generator = require('generate-password');
const carHelper = require('./../../helper/car');
var fs = require('fs');
var path = require('path');

/**
 * @api {post} /admin/company/add create new company
 * @apiName Create Company
 * @apiDescription This is for add new company from super admin
 * @apiGroup Admin - Companies
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} name name of company
 * @apiParam {String} phone_number company Phone Number 
 * @apiParam {String} description company Phone Number 
 * @apiParam {String} email User email address 
 * @apiParam {String} site_url url of company
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
        'name': {
            notEmpty: true,
            errorMessage: "Name is required"
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
        req.body['password'] = generatepassword;
        async.waterfall([
            function (callback) {
                // Finding place and insert if not found
                if (req.body.address) {
                    Place.findOne({
                        "google_place_id": {
                            $eq: req.body.address.placeId
                        }
                    }, function (err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            if (data.length != 0) {
                                req.body['place_id'] = data.google_place_id
                                callback(null);
                            } else {
                                var addressData = req.body.address;
                                var placeModel = new Place(addressData);
                                placeModel.save(function (err, placeData) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        req.body['place_id'] = placeData._id;
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
                var companyModel = new Company(req.body);
                companyModel.save(function (err, data) {
                    console.log("user data===>", data);
                    if (err) {
                        if (err.code == '11000') {
                            if (err.message.indexOf('name') != -1) {
                                errData = {
                                    message: "Company Name already exist",
                                    error: err
                                };
                                callback(errData);
                            } else if (err.message.indexOf('email') != -1) {
                                errData = {
                                    message: "Email already exist",
                                    error: err
                                };
                                callback(errData);
                            } else {
                                callback(err);
                            }
                        } else {
                            callback(err);
                        }
                    } else {
                        var result = {
                            message: "Company added successfully..",
                            data: data
                        };
                        var option = {
                            to: req.body.email,
                            subject: 'ABHR - Car Company Account Notification'
                        }
                        var loginURL = config.FRONT_END_URL + '#/company/login';
                        var data = {
                            name: req.body.name,
                            email: req.body.email,
                            password: generatepassword,
                            link: loginURL
                        }
                        mailHelper.send('/car_company/add_company', option, data, function (err, res) {
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
        ], function (err, result) {
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
 * @api {put} /admin/company/update update Company details
 * @apiName Update Company Details
 * @apiDescription Used to update company information
 * @apiGroup Admin - Companies
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} company_id company Id
 * @apiParam {String} name CompanyName
 * @apiParam {String} phone_number Company Phone Number 
 * @apiParam {String} email Company email address 
 * @apiParam {String} site_url url of company
 * @apiParam {String} address google autocomplete address (optional)
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
        'company_id': {
            notEmpty: true,
            errorMessage: "company_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        async.waterfall([
            function (callback) {
                if (req.body.address) {
                    Place.findOne({
                        "google_place_id": {
                            $eq: req.body.address.placeId
                        }
                    }, function (err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            if (data.length != 0) {
                                req.body['place_id'] = data.google_place_id
                                callback(null, req.body);
                            } else {
                                var addressData = req.body.address;
                                var placeModel = new Place(addressData);
                                placeModel.save(function (err, placeData) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        req.body['place_id'] = placeData._id;
                                        callback(null, req.body);
                                    }
                                });
                            }
                        }
                    });
                } else {
                    callback(null, req.body);
                }
            },
            function (userData, callback) {
                Company.update({
                    _id: {
                        $eq: req.body.company_id
                    }
                }, {
                    $set: userData
                }, function (err, response) {
                    if (err) {
                        callback(err);
                    } else {
                        var result = {
                            message: "Company updated successfully..",
                            data: response
                        };
                        console.log('in updated')
                        callback(null, result);
                    }
                });
            }
        ], function (err, result) {
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
 * @api {put} /admin/company/delete delete company by Id
 * @apiName Delete Company
 * @apiDescription Used to delete Company 
 * @apiGroup Admin - Companies
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} company_id Company Id
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
        'company_id': {
            notEmpty: true,
            errorMessage: "company_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        Company.update({
            _id: {
                $eq: req.body.company_id
            }
        }, {
            $set: {
                'isDeleted': true
            }
        }, function (err, response) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Company Deleted successfully..",
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
 * @api {get} /admin/company/details/:id? Company Details By Id
 * @apiName company Details By Id
 * @apiDescription Get Company details By company id
 * @apiGroup Admin - Companies
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} id company Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.get('/details/:id', (req, res, next) => {
    Company.findOne({_id: {$eq: req.params.id},"isDeleted": false}, function (err, data) {
        if (err) {
            return next(err);
        } else {
            res.status(config.OK_STATUS).json({
                status: "Success",
                data: data,
            });
        }
    });
});

/**
 * @api {post} /admin/company/list List of all companies
 * @apiName Companies List
 * @apiDescription To display companies list with pagination
 * @apiGroup Admin - Companies
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
        var defaultQuery = [{
                $match: {
                    "isDeleted": false,
                }
            }];
            if (req.body.search != undefined) {
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
                var searchQuery = {
                    $match: match
                }
                defaultQuery = defaultQuery.concat(searchQuery);
            }
            if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
                var colIndex = req.body.order[0].column;
                var colname = req.body.columns[colIndex].name;
                var order = req.body.order[0].dir;
                if(order == "asc") {
                    if(req.body['columns'][colIndex].isBoolean){
                        defaultQuery = defaultQuery.concat({
                            $sort: {
                                [colname] : 1
                            }
                        })
                    } else{
                        colname = '$'+colname;
                        defaultQuery = defaultQuery.concat({
                            $project: {
                                "records": "$$ROOT",
                                "sort_index": { "$toLower": [colname] }
                            }
                        },
                        {
                            $sort: {
                                    "sort_index": 1
                            }
                        },
                        {
                            $replaceRoot: { newRoot: "$records" }
                        })    
                    }  
                } else {
                    if(req.body['columns'][colIndex].isBoolean){
                        defaultQuery = defaultQuery.concat({
                            $sort: {
                                [colname] : 1
                            }
                        })
                    } else{
                        colname = '$'+colname;
                        defaultQuery = defaultQuery.concat({
                            $project: {
                                "records": "$$ROOT",
                                "sort_index": { "$toLower": [colname] }
                            }
                        },
                        {
                            $sort: {
                                    "sort_index": 1
                            }
                        },
                        {
                            $replaceRoot: { newRoot: "$records" }
                        })    
                    }    
                }
            }
            defaultQuery = defaultQuery.concat([{
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
            ]);
        Company.aggregate(defaultQuery, function (err, data) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: data.length != 0 ? data[0] : {
                        recordsTotal: 0,
                        data: []
                    }
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
 * @api {post} /admin/company/rental_list List of all rental of comapines
 * @apiName company Rental List
 * @apiDescription To display company rental list with pagination
 * @apiGroup Admin - Companies
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
        var defaultQuery = [{
                $lookup: {
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
                $match: {
                    "isDeleted": false
                }
            },
            {
                $sort: {
                    'createdAt': -1
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
                    "_id": 1,
                    "recordsTotal": 1,
                    "data": {
                        "$slice": ["$data", parseInt(req.body.start), parseInt(req.body.length)]
                    }
                }
            }
        ];
        if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
            var colIndex = req.body.order[0].column;
            var colname = req.body.columns[colIndex].name;
            var order = req.body.order[0].dir;
            if (order == "asc") {
                var sortableQuery = {
                    $sort: {
                        [colname]: 1
                    }
                }
            } else {
                var sortableQuery = {
                    $sort: {
                        [colname]: -1
                    }
                }
            }
            defaultQuery.splice(defaultQuery.length - 2, 0, sortableQuery);
        }
        if (req.body.search != undefined) {
            if (req.body.search.value != undefined) {
                var regex = new RegExp(req.body.search.value);
                var match = {
                    $or: []
                };
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
        CarBooking.aggregate(defaultQuery, function (err, data) {
            if (err) {
                console.log('err===>', err);
                return next(err);
            } else {
                console.log('result===>', data);
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: data.length != 0 ? data[0] : {
                        recordsTotal: 0,
                        data: []
                    }
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
 * @api {post} /admin/company/change_status Active/Deactive status change
 * @apiName status company Rental
 * @apiDescription To change company status
 * @apiGroup Admin - Companies
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} company_id company_id 
 * @apiParam {String} status changed status for company
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/change_status', (req, res, next) => {
    var schema = {
        'company_id': {
            notEmpty: true,
            errorMessage: "company_id is required"
        },
        'status': {
            notEmpty: true,
            errorMessage: "status is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        Company.update({
            "_id": new ObjectId(req.body.company_id)
        }, {
            $set: {
                "is_Active": req.body.status
            }
        }, function (err, data) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: data
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
 * @api {post} /admin/company/car_list List of all car of perticular company
 * @apiName company car List
 * @apiDescription To display company car list with pagination
 * @apiGroup Admin - Cars
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} start pagination start page no
 * @apiParam {String} end pagination length no of page length
 * @apiParam {String} company_id 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/car_list', (req, res, next) => {
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
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var defaultQuery = [{
                $lookup: {
                    from: 'car_model',
                    foreignField: '_id',
                    localField: 'car_model_id',
                    as: "modelDetails",
                }
            },
            {
                $unwind: {
                    "path": "$modelDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_brand',
                    foreignField: '_id',
                    localField: 'car_brand_id',
                    as: "brandDetails",
                }
            },
            {
                $unwind: {
                    "path": "$brandDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $match: {
                    "isDeleted": false,
                    "car_rental_company_id": new ObjectId(req.body.company_id)
                }
            },
            {
                $sort: {
                    'createdAt': -1
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
                    "_id": 1,
                    "recordsTotal": 1,
                    "data": {
                        "$slice": ["$data", parseInt(req.body.start), parseInt(req.body.length)]
                    }
                }
            },


        ];
        if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
            var colIndex = req.body.order[0].column;
            var colname = req.body.columns[colIndex].name;
            var order = req.body.order[0].dir;
            if (order == "asc") {
                var sortableQuery = {
                    $sort: {
                        [colname]: 1
                    }
                }
            } else {
                var sortableQuery = {
                    $sort: {
                        [colname]: -1
                    }
                }
            }
            defaultQuery.splice(defaultQuery.length - 2, 0, sortableQuery);
        }
        if (req.body.search != undefined) {
            if (req.body.search.value != undefined) {
                var regex = new RegExp(req.body.search.value);
                var match = {
                    $or: []
                };
                req.body['columns'].forEach(function (obj) {
                    if (obj.name) {
                        var json = {};
                        if (obj.isNumber) {
                            json[obj.name] = parseInt(req.body.search.value)
                        } else if (obj.isBoolean) {
                            var check = req.body.search.value.toLowerCase();
                            if (check === "yes" || check === "ye" || check === "y") {
                                json[obj.name] = true;
                            } else {
                                json[obj.name] = false;
                            }
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
        Car.aggregate(defaultQuery, function (err, data) {
            if (err) {
                console.log('err===>', err);
                return next(err);
            } else {
                console.log('result===>', data);
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: data.length != 0 ? data[0] : {
                        recordsTotal: 0,
                        data: []
                    }
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
 * @api {post} /admin/company/car/details Details of car for perticular carId
 * @apiName Car Details
 * @apiDescription To display car Details 
 * @apiGroup Admin - Cars
 * @apiVersion 0.0.0
 * 
 * @apiParam {car_id} car_id id of Car
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/car/details', async (req, res) => {
    console.log('here')
    var schema = {
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const carResp = await carHelper.getcarDetailbyId(new ObjectId(req.body.car_id));
        res.json(carResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
        });
    }
});


/* @api {post} /admin/company/car/add Add car
 * @apiName add Car
 * @apiDescription Used for Add Car 
 * @apiGroup Admin - Cars
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} car_rental_company_id companyId 
 * @apiParam {Array} [car_gallery] Array of images
 * @apiParam {String} car_model_id car Brand id
 * @apiParam {String} car_brand_id car Model id
 * @apiParam {String} car_color car color
 * @apiParam {Boolean} [is_navigation] car navigation status
 * @apiParam {Number} rent_price car rent price
 * @apiParam {Boolean} [is_AC] car AC status
 * @apiParam {Boolean} [is_luggage_carrier] car luggage carrier
 * @apiParam {String} [licence_plate] licence plate number
 * @apiParam {Number} no_of_person capacity of people
 * @apiParam {Enum} transmission ["manual", "automatic"]
 * @apiParam {Enum} milage ["open","limited"]
 * @apiParam {Enum} car_class ["economy", "luxury", "suv", "family"]
 * @apiParam {Number} [driving_eligibility_criteria] age for driving criteria
 * 
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/car/add', (req, res, next) => {
    var schema = {
        'car_rental_company_id': {
            notEmpty: true,
            errorMessage: "Company Id is required"
        },
        'car_model_id': {
            notEmpty: true,
            errorMessage: "Car Model id is required"
        },
        'car_brand_id': {
            notEmpty: true,
            errorMessage: "Car Brand id is required"
        },
        'rent_price': {
            notEmpty: true,
            errorMessage: "Rent Price is required"
        },
        'no_of_person': {
            notEmpty: true,
            errorMessage: "Capacity of People is required"
        },
        'transmission': {
            notEmpty: true,
            errorMessage: "Transmission is required"
        },
        'milage': {
            notEmpty: true,
            errorMessage: "Milage is required"
        },
        'car_class': {
            notEmpty: true,
            errorMessage: "Class is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var files = [];
        var galleryArray = [];
        if (req.files) {
            console.log(req.files);
            files = req.files['car_gallery'];
            if (!Array.isArray(files)) {
                files = [files];
            }
            var dir = "./upload/car";
            async.each(files, function (file, each_callback) {
                var extention = path.extname(file.name);
                var splitName = file.name.split('.');
                var filename = splitName[0] + extention;
                var filepath = dir + '/' + filename;
                if (fs.existsSync(filepath)) {
                    filename = splitName[0] + '_copy' + extention;
                    filepath = dir + '/' + filename;
                }
                var json = {
                    name: filename,
                    type: file['mimetype']
                }
                galleryArray.push(json);
                file.mv(filepath, function (err) {
                    if (err) {
                        each_callback(each_callback)
                    } else {

                    }
                });
                each_callback()
            })
        }
        req.body.car_gallery = galleryArray;
        var CarModel = new Car(req.body);
        CarModel.save(function (err, data) {
            console.log("data:", data);
            if (err) {
                return next(err);
            } else {
                var result = {
                    message: "Car Added successfully..",
                    data: data
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


/* @api {post} /admin/company/car/edit Edit car
 * @apiName edit Car
 * @apiDescription Used for Edit Car 
 * @apiGroup Admin - Cars
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} car_id carId of car  
 * @apiParam {String} [car_model_id] car Brand id
 * @apiParam {String} [car_brand_id] car Model id
 * @apiParam {String} [car_color] car color
 * @apiParam {Boolean} [is_navigation] car navigation status
 * @apiParam {Number} [rent_price] car rent price
 * @apiParam {Boolean} [is_AC] car AC status
 * @apiParam {Boolean} [is_luggage_carrier] car luggage carrier
 * @apiParam {String} [licence_plate] licence plate number
 * @apiParam {Number} [no_of_person] capacity of people
 * @apiParam {Enum} [transmission] ["manual", "automatic"]
 * @apiParam {Enum} [milage] ["open","limited"]
 * @apiParam {Enum} [car_class] ["economy", "luxury", "suv", "family"]
 * @apiParam {Number} [driving_eligibility_criteria] age for driving criteria
 * 
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/car/edit', async (req, res, next) => {
    var schema = {
        'car_id': {
            notEmpty: true,
            errorMessage: "Car Id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var old_imageResp = await Car.find({
            "_id": new ObjectId(req.body.car_id)
        }, {
            "car_gallery._id": 1
        }).exec();
        var old_db_images = JSON.stringify(old_imageResp[0].car_gallery);
        console.log('here====>', old_db_images);
        var files = [];
        var galleryArray = [];
        var oldArray = [];
        var new_images = [];
        var old_images = [];
        var car_images = [];
        if (req.body.is_change_photo) {
            console.log('in is change photo');
            if (req.files) {
                console.log(req.files);
                files = req.files['new_images'];
                if (!Array.isArray(files)) {
                    files = [files];
                }
                var dir = "./upload/car";
                try {
                    async.each(files, function (file, each_callback) {
                        var extention = path.extname(file.name);
                        var splitName = file.name.split('.');
                        var filename = splitName[0] + extention;
                        var filepath = dir + '/' + filename;
                        if (fs.existsSync(filepath)) {
                            filename = splitName[0] + '_copy' + extention;
                            filepath = dir + '/' + filename;
                        }
                        var json = {
                            name: filename,
                            type: file['mimetype']
                        }
                        galleryArray.push(json);
                        file.mv(filepath, function (err) {
                            if (err) {
                                each_callback(each_callback)
                            } else {

                            }
                        });
                        each_callback()
                    })
                } catch (error) {
                    console.log('error => ', error);
                }
            }
        }
        new_images = galleryArray;
        try {
            old_images = JSON.parse(req.body.old_images);
            console.log('old_images ==> ', old_images);
            if (Array.isArray(old_images)) {
                old_images.forEach((image) => {
                    if (old_db_images.indexOf(image._id) == -1) {
                        var filePath = './upload/car/' + image.name;
                        fs.unlinkSync(filePath);
                    } else {
                        var json = {
                            name: image.name,
                            type: image.type
                        }
                        oldArray.push(json);
                    }
                });
            }
        } catch (error) {
            console.log('error2 => ', error);
        }
        car_images.push(...new_images);
        car_images.push(...oldArray);
        console.log(car_images);
        req.body.car_gallery = car_images;
        console.log('re.body=====>', req.body);
        Car.update({
            _id: {
                $eq: req.body.car_id
            }
        }, {
            $set: req.body
        }, function (err, response) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Car updated successfully"
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

/* @api {post} /admin/company/car/gallery_edit Edit car
 * @apiName edit Car
 * @apiDescription Used for Edit Car Images
 * @apiGroup Admin - Cars
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} car_id carId of car  
 * @apiParam {Array} [car_images] Array of images
 * 
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// router.post('/car/gallery_edit', async (req, res, next) => {
//     var schema = {
//         'car_id': {
//             notEmpty: true,
//             errorMessage: "Car Id is required"
//         }
//     };
//     req.checkBody(schema);
//     var errors = req.validationErrors();
//     if (!errors) {
//         var files = [];
//         var galleryArray = [];
//         if (req.files) {
//             files = req.files['new_images'];
//             if (!Array.isArray(files)) {
//                 files = [files];
//             }
//             var dir = "./upload/car";
//             async.each(files, function (file, each_callback) {
//                 var extention = path.extname(file.name);
//                 var splitName = file.name.split('.');
//                 var filename = splitName[0] + extention;
//                 var filepath = dir + '/' + filename;
//                 if (fs.existsSync(filepath)) {
//                     filename = splitName[0] + '_copy' + extention;
//                     filepath = dir + '/' + filename;
//                 }
//                 var json = { name: filename, type: file['mimetype'] }
//                 galleryArray.push(json);
//                 file.mv(filepath, function (err) {
//                     if (err) {
//                         each_callback(each_callback)
//                     } else {
//                     }
//                 });
//                 each_callback()
//             })
//         }
//         new_images = galleryArray;
//         var old_images = req.body.old_images;
//         let Carimages = { ...new_images, ...old_images };
//         if (req.files) {
//             files = req.files['car_images'];
//             if (!Array.isArray(files)) {
//                 files = [files];
//             }
//             var dir = "./upload/car";
//             async.each(files, function (file, each_callback) {

//                 var extention = path.extname(file.name);
//                 var splitName = file.name.split('.');
//                 var filename = splitName[0] + extention;
//                 if (carImageArray.indexOf(file.filename) == -1) {
//                     var json = { name: filename, type: file['mimetype'] }
//                     addcarArray.push(json);
//                     file.mv(filepath, function (err) {
//                         if (err) {
//                             each_callback(each_callback)
//                         } else {

//                         }
//                     });
//                     each_callback();
//                 }
//             })
//         } else {
//             res.status(config.BAD_REQUEST).json({
//                 message: "No file selected",
//             });
//         }
//         Car.update({ _id: { $eq: req.body.car_id } }, { $set: req.body }, function (err, response) {
//             if (err) {
//                 return next(err);
//             } else {
//                 res.status(config.OK_STATUS).json({ message: "Car updated successfully" });
//             }
//         });
//     } else {
//         res.status(config.BAD_REQUEST).json({
//             message: "Validation Error",
//             error: errors
//         });
//     }
// });

/**
 * @api {put} /admin/company/car/delete Delete car
 * @apiName Delete Car
 * @apiDescription Used to delete agent information
 * @apiGroup Admin - Cars
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} car_id car Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Admin unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/car/delete', (req, res, next) => {
    console.log('hetre');
    var schema = {
        'car_id': {
            notEmpty: true,
            errorMessage: "car_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        Car.update({
            _id: new ObjectId(req.body.car_id)
        }, {
            $set: {
                'isDeleted': true
            }
        }, function (err, response) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Car Deleted successfully..",
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