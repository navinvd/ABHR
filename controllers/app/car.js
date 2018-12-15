var express = require('express');
var router = express.Router();

var config = require('./../../config');
const carHelper = require('./../../helper/car');
const Car = require('./../../models/cars');
const CarBrand = require('./../../models/car_brand');
const CarModel = require('./../../models/car_model');

var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');

/**
 * @api {post} /app/car/list List of available car
 * @apiName Car List
 * @apiDescription To display agents list with pagination
 * @apiGroup App - Car
 * 
 * @apiParam {Date} fromDate Available from date
 * @apiParam {Number} days Number of days car needed
 * @apiParam {String} [start] pagination start page no
 * @apiParam {String} [end] pagination length no of page length
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/list', async (req, res) => {
    var schema = {
        'fromDate': {
            notEmpty: true,
            errorMessage: "Please specify from when you need car",
            isISO8601: {
                value: true,
                errorMessage: "Please enter valid data. Format should be yyyy-mm-dd"
            }
        },
        'days': {
            notEmpty: true,
            errorMessage: "Specify how many days you needed car",
            isInt: {
                value: true,
                errorMessage: "Please enter days in number only"
            }
        }
    };

    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const carResp = await carHelper.getAvailableCar(req.body.fromDate, req.body.days);
        res.json(carResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
        });
    }
});

/**
 * @api {post} /app/car/details Details of car for perticular carId
 * @apiName Car Details
 * @apiDescription To display car Details 
 * @apiGroup App - Car
 * 
 * @apiParam {car_id} car_id id of Car
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
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

/**
 * @api {post} /app/car/filter List of car by filter applied
 * @apiName Filtered car List
 * @apiDescription To Display filter car list 
 * @apiGroup App - Car
 * 
 * @apiParam {brand_id} brand_id id of brand
 * @apiParam {model_id} brand_id id of brand
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/filter', async (req, res) => {
    // req.checkBody(schema);
    // var errors = req.validationErrors();
    // if (!errors) {
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
                $match: {'isDeleted': false}
            }
        ];
        var paginationArray = [
            {
                $group: {
                    "_id": "",
                    "total": {
                        "$sum": 1
                    },
                    "data": {
                        "$push": "$$ROOT"
                    }
                }
            },
            {
                $project: {
                    "_id": "",
                    "total": 1,
                    "data": {"$slice": ["$data", parseInt(req.body.itemPerpage) * (parseInt(req.body.currentPage) - 1), parseInt(req.body.itemPerpage)]}
                }
            }];
        Car.aggregate(defaultQuery, function (err, data) {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message : "error in fetching data",
                    err
                });
            } else {
                // var data = data.length != 0 ? data[0] : {total: 0, data: []}
                res.status(config.OK_STATUS).json({
                    status: "Success",
                    message: "car data found",
                    data: data,
                });
            }
        });
    // } else {
        // res.status(config.BAD_REQUEST).json({
        //     status: 'failed',
        //     message: "Validation Error",
        //     errors
        // });
    // }
});

router.get('/addbrands', async (req, res) => {
    var ModelArray = ['BMW', 'Ducati', 'Ford', 'Lincoln', 'Jaguar', 'Land Rover', 'Maserati', 'Honda', 'Tovota'];
    ModelArray.forEach((element)=>{
        console.log(element);
        insert_data = {
            "brand_name" :element
        };
        var CarBrandmodel = new CarBrand(insert_data);
        CarBrandmodel.save((err, userData) => {
            if(err){res.json({"err":err})}
            else{
                console.log('==========inserted Data : ',userData);
            }
        });
    });
    res.json({"data":"yup"});
});

router.get('/addbrandmodels', async (req, res) => {
    var ModelArray = [
        {
            "car_brand_id" : "5c1480ea875bb82a006ba163",
            "release_year" : 1975,
            "model_number" : "F01",
            "model_name" : "BMW 7 Series",
        },
        {
            "car_brand_id" : "5c1480ea875bb82a006ba163",
            "release_year" : 2014,
            "model_number" : "F01",
            "model_name" : "BMW 7 Series",
        },
        {
            "car_brand_id" : "5c1480ea875bb82a006ba16a",
            "release_year" : 2014,
            "model_number" : "F01",
            "model_name" : "Honda City 6 generation",
        },
        {
            "car_brand_id" : "5c1480ea875bb82a006ba165",
            "release_year" : 2015,
            "model_number" : "F01",
            "model_name" : "Ford Figo",
        }];
    ModelArray.forEach((element) => {
        console.log(element);
        insert_data = {
            "car_brand_id" : new ObjectId(element.car_brand_id),
            "release_year" : element.release_year,
            "model_number" : element.model_number,
            "model_name" : element.model_name
        };
        var CarModelm = new CarModel(insert_data);
        CarModelm.save((err, userData) => {
            if(err){res.json({"err":err})}
            else{
                console.log('==========inserted Data : ',userData);
            }
        });
    });
    res.json({"data":"yup"});
});

module.exports = router;