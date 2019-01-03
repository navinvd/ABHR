var express = require('express');
var router = express.Router();
var config = require('./../../config');
var Car = require('./../../models/cars');
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');
var fs = require('fs');
var path = require('path');
var async = require("async");
const carHelper = require('./../../helper/car');

/* @api {post} /company/car/add Add car
 * @apiName add Car
 * @apiDescription Used for Add Car 
 * @apiGroup CompanyAdmin - Car
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
router.post('/add', (req, res, next) => {
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
        console.log('request here======>',req.files);
        if (req.files) {
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
                var json = {name: filename, type: file['mimetype']}
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


/* @api {post} /company/car/list List of all car of perticular company
 * @apiName company car List
 * @apiDescription To display company car list with pagination
 * @apiGroup CompanyAdmin -Car
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
router.post('/list',(req, res, next) => {
    var schema = {
        'start': {
            notEmpty: true,
            errorMessage: "start is required"
        },
        'length': {
            notEmpty: true,
            errorMessage: "length is required"
        },
        'company_id' : {
            notEmpty: true,
            errorMessage: "company_id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if(!errors){
        var defaultQuery = [
            {
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
                $match: {"isDeleted": false,}
            },
            {
                $group: {
                    "_id": "",
                    "recordsTotal": {
                        "$sum": 1
                    },
                    "data": {
                        "$push": "$$ROOT",
                    }
                }
            },
            {
                $project: {
                    "_id": 1,
                    "recordsTotal": 1,
                    "modelDetails": 1,
                    "brandDetails":1,
                    "data": {"$slice": ["$data", parseInt(req.body.start), parseInt(req.body.length)]}
                }
            }
        ];
        if (req.body.search != undefined) {
            if(req.body.search.value != undefined){
                var regex = new RegExp(req.body.search.value);
                var match = {$or: []};
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

    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

/* @api {post} /company/car/details Add car
 * @apiName add Car
 * @apiDescription Used for Display details Car 
 * @apiGroup CompanyAdmin - Car
 * @apiVersion 0.0.0
 * 
 * @apiParam {car_id} car_id id of Car
 * 
 * 
 * @apiHeader {String}  Content-Type application/json    
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/details', async (req, res) => {
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


  
module.exports = router;
