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
 * @apiParam {Array}  [brand] Array of brand ids 
 * @apiParam {Array} [model] Array of model ids 
 * @apiParam {Boolean} [navigation] Boolean default true 
 * @apiParam {Enum} [transmission]  ["automatic", "manual"] 
 * @apiParam {Enum} [class]  ["economy", "luxury", "suv", "family"] 
 * @apiParam {Number} [capacity_of_people] Number no. of people 
 * @apiParam {String} [milage] String forexample: "open" 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/filter', async (req, res) => {
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
                $lookup: {
                    from: 'car_booking',
                    foreignField: 'carId',
                    localField: '_id',
                    as: "carBookingDetails",
                }
            },
            {
                $unwind: {
                    "path": "$carBookingDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $project: {
                    _id: 1,
                    car_rental_company_id: 1,
                    car_company: 1,
                    car_model: 1,
                    car_color: 1,
                    rent_price: 1,
                    is_AC: 1,
                    is_luggage_carrier: 1,
                    licence_plate: 1,
                    no_of_person: 1,
                    transmission: 1,
                    is_delieverd: 1,
                    milage: 1,
                    is_navigation: 1,
                    driving_eligibility_criteria: 1,
                    class: 1,
                    avg_rating: 1,
                    is_avialable: 1,
                    car_model_id: 1,
                    car_brand_id: 1,
                    isDeleted: 1,
                    carBookingDetails: 1,
                    brandDetails: 1,
                    modelDetails: 1,
                    carBookingDetailsDate: {
                        $dateToString: {
                            date: "$carBookingDetails.from_time",
                            format: "%Y-%m-%d"
                        }
                    }
                }
            },
            // {
            // $addFields:{
            //     carBookingDetailsDate: {
            // $dateToString:{
            //     date: "$carBookingDetails.from_time",
            //     format: "%Y-%m-%d"
            // }
            //     }
            // }
            // $addFields:{
            //     test: "test"
            // }
            // }
            {
                $match: {
                    'isDeleted': false,
                    'carBookingDetailsDate': { $ne: req.body.fromDate },
                    'carBookingDetails.days': { $ne: req.body.days }
                }
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
                    "data": { "$slice": ["$data", parseInt(req.body.itemPerpage) * (parseInt(req.body.currentPage) - 1), parseInt(req.body.itemPerpage)] }
                }
            }];
        if (req.body.brand) {
            let brandOject = req.body.brand;
            var searchQuery = {
                "$match": {
                    "car_brand_id": { "$in": brandOject },
                }
            }
            defaultQuery.splice(3, 0, searchQuery);
        }
        if (req.body.model) {
            let modelOject = req.body.model;
            var searchQuery = {
                "$match": {
                    "car_model_id": { "$in": modelOject },
                }
            }
            defaultQuery.splice(3, 0, searchQuery);
        }
        if (req.body.navigation) {
            let navigationOject = req.body.navigation;
            var searchQuery = {
                "$match": {
                    "is_navigation": navigationOject,
                }
            }
            defaultQuery.splice(3, 0, searchQuery);
        } else {
            var searchQuery = {
                "$match": {
                    "is_navigation": true,
                }
            }
            defaultQuery.splice(3, 0, searchQuery);
        }
        if (req.body.transmission) {
            let transmissionObject = req.body.navigation;
            var searchQuery = {
                "$match": {
                    "transmission": transmissionObject,
                }
            }
            defaultQuery.splice(3, 0, searchQuery);
        }
        if (req.body.class) {
            let classObject = req.body.navigation;
            var searchQuery = {
                "$match": {
                    "class": classObject,
                }
            }
            defaultQuery.splice(3, 0, searchQuery);
        }
        if (req.body.capacity_of_people) {
            let copObject = req.body.capacity_of_people;
            var searchQuery = {
                "$match": {
                    "no_of_person": copObject,
                }
            }
            defaultQuery.splice(3, 0, searchQuery);
        }
        if (req.body.milage) {
            let milageObject = req.body.milage;
            var searchQuery = {
                "$match": {
                    "milage": milageObject,
                }
            }
            defaultQuery.splice(3, 0, searchQuery);
        } else {
            var searchQuery = {
                "$match": {
                    "milage": "open",
                }
            }
            defaultQuery.splice(3, 0, searchQuery);
        }
        Car.aggregate(defaultQuery, function (err, data) {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "error in fetching data",
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
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
        });
    }
});

/**
 * @api {get} /app/car/brandlist List of car brands
 * @apiName Car BrandList
 * @apiDescription To Display car brand list 
 * @apiGroup App - Car
 *
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/brandlist', async (req, res) => {
    CarBrand.find({ "isDeleted": false }, { _id: 1, brand_name: 1 }, (err, data) => {
        if (err) {
            res.status(config.BAD_REQUEST).json({
                status: "failed",
                message: "carbrand data not found",
                err
            });
        } else {
            res.status(config.OK_STATUS).json({
                status: "Success",
                message: "car data found",
                data: data,
            });
        }
    });
});

/**
 * @api {post} /app/car/modelList List of car Models by car brand id
 * @apiName Car ModelList
 * @apiDescription To Display car model list 
 * @apiGroup App - Car
 *
 * @apiParam {string}  brand_id car brand Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/modelList', async (req, res) => {
    var schema = {
        'brand_id': {
            notEmpty: true,
            errorMessage: "Brand Id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        CarModel.find({ "isDeleted": false, "car_brand_id": new ObjectId(req.body.brand_id) }, (err, data) => {
            console.log('data==>', err, data);
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "carbrand data not found",
                    err
                });
            } else {
                res.status(config.OK_STATUS).json({
                    status: "Success",
                    message: "car data found",
                    data: data,
                });
            }
        });
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
        });
    }
});

router.get('/addbrands', async (req, res) => {
    var ModelArray = ['BMW', 'Ducati', 'Ford', 'Lincoln', 'Jaguar', 'Land Rover', 'Maserati', 'Honda', 'Tovota'];
    ModelArray.forEach((element) => {
        console.log(element);
        insert_data = {
            "brand_name": element
        };
        var CarBrandmodel = new CarBrand(insert_data);
        CarBrandmodel.save((err, userData) => {
            if (err) { res.json({ "err": err }) }
            else {
                console.log('==========inserted Data : ', userData);
            }
        });
    });
    res.json({ "data": "yup" });
});

router.get('/addbrandmodels', async (req, res) => {
    var ModelArray = [
        {
            "car_brand_id": "5c1480ea875bb82a006ba163",
            "release_year": 1975,
            "model_number": "F01",
            "model_name": "BMW 7 Series",
        },
        {
            "car_brand_id": "5c1480ea875bb82a006ba163",
            "release_year": 2014,
            "model_number": "F01",
            "model_name": "BMW 7 Series",
        },
        {
            "car_brand_id": "5c1480ea875bb82a006ba16a",
            "release_year": 2014,
            "model_number": "F01",
            "model_name": "Honda City 6 generation",
        },
        {
            "car_brand_id": "5c1480ea875bb82a006ba165",
            "release_year": 2015,
            "model_number": "F01",
            "model_name": "Ford Figo",
        }];
    ModelArray.forEach((element) => {
        console.log(element);
        insert_data = {
            "car_brand_id": new ObjectId(element.car_brand_id),
            "release_year": element.release_year,
            "model_number": element.model_number,
            "model_name": element.model_name
        };
        var CarModelm = new CarModel(insert_data);
        CarModelm.save((err, userData) => {
            if (err) { res.json({ "err": err }) }
            else {
                console.log('==========inserted Data : ', userData);
            }
        });
    });
    res.json({ "data": "yup" });
});


// /**
//  * @api {post} /review/:car_id Add car Review
//  * @apiName add car Review
//  * @apiDescription Used to add car review 
//  * @apiGroup App Car
//  * @apiVersion 0.0.0
//  * 
//  * @apiParam {Number} user_id user Id
//  * @apiParam {Number} stars review stars
//  * @apiParam {String} username reviwer name
//  * @apiParam {String} [review_text] review comment
//  * 
//  * @apiHeader {String}  Content-Type application/json 
//  * @apiHeader {String}  x-access-token Users unique access-key   
//  * 
//  * @apiSuccess (Success 200) {String} message Success message.
//  * @apiError (Error 4xx) {String} message Validation or error message.
//  */
router.post('/review/:car_id', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'stars': {
            notEmpty: true,
            errorMessage: "Please give stars"
        },
        'username': {
            notEmpty: true,
            errorMessage: "Please enter username"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var review_data = {
            'car_id': new ObjectId(req.params.car_id),
            'user_id': new ObjectId(req.body.user_id),
            'stars': req.body.stars,
            'username': req.body.username,
            'review_text': req.body.review_text ? req.body.review_text : ''
        }
        const carReviewResp = await carHelper.addReview(review_data);
        res.json(carReviewResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
        });
    }
});




// Get reviews of car
router.get('/review/:car_id', async (req, res) => {
    const carReviewResp = await carHelper.getCarReviews(new ObjectId(req.params.car_id));
    res.json(carReviewResp);
});

module.exports = router;