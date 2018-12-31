var express = require('express');
var router = express.Router();

var config = require('./../../config');
const carHelper = require('./../../helper/car');
const Car = require('./../../models/cars');
const CarBrand = require('./../../models/car_brand');
const CarModel = require('./../../models/car_model');
const CarNotification = require('./../../models/car_notification');
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');
const moment = require('moment');

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
            errors
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
 * @apiParam {Date} fromDate Available from date
 * @apiParam {Number} days Number of days car needed
 * @apiParam {Array}  [brand] Array of brand ids 
 * @apiParam {Array} [model] Array of model ids 
 * @apiParam {Boolean} [navigation] Boolean default true 
 * @apiParam {Enum} [transmission]  ["automatic", "manual"] 
 * @apiParam {Enum} [car_class]  ["economy", "luxury", "suv", "family"] 
 * @apiParam {Number} [capacity_of_people] Number no. of people 
 * @apiParam {String} [milage] String forexample: "open" 
 * @apiParam {Number} [sort_by] (eg 0 = by popularity , 1 = rent wise desc, 2 = rent wise asc)
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
        var fromDate = req.body.fromDate
        var toDate = moment(req.body.fromDate).add(req.body.days, 'days').format("YYYY-MM-DD");
        console.log(toDate);
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
                    car_brand: "$brandDetails.brand_name",
                    car_model: "$modelDetails.model_name",
                    car_model_number: "$modelDetails.model_number",
                    car_model_release_year: "$modelDetails.release_year",
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
                    car_class: 1,
                    is_avialable: 1,
                    car_model_id: 1,
                    car_brand_id: 1,
                    isDeleted: 1,
                    image_name: "$car_gallery.name" ? { $arrayElemAt: ["$car_gallery.name", 0] } : null,
                    car_book_from_date: {
                        $dateToString: {
                            date: "$carBookingDetails.from_time",
                            format: "%Y-%m-%d"
                        }
                    },
                    car_book_to_date: {
                        $dateToString: {
                            date: "$carBookingDetails.to_time",
                            format: "%Y-%m-%d"
                        }
                    }
                }
            },
            {
                // $match: {
                //     'isDeleted': false,
                //     'carBookingDetailsDate': { $ne: req.body.fromDate },
                //     'carBookingDetails.days': { $ne: req.body.days }
                // }
                $match: {
                    $and: [
                        {
                            $or: [
                                { car_book_from_date: { $gt: toDate } },
                                { car_book_to_date: { $lt: fromDate } },
                                { car_book_from_date: { $eq: null } }
                            ]
                        },
                        { isDeleted: false }
                    ]
                }

            },
            {
                $lookup: {
                    from: 'car_reviews',
                    localField: '_id',
                    foreignField: 'car_id',
                    as: 'reviews'
                }
            },
            {
                $unwind: {
                    "path": "$reviews",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $group: {
                    _id: "$_id",
                    total_avg_rating: { $avg: "$reviews.stars" },
                    car: { "$first": "$$ROOT" }
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
            if (brandOject.length > 0) {
                brandOject = brandOject.map((b) => { return ObjectId(b) });
                var searchQuery = {
                    "$match": {
                        "car_brand_id": { "$in": brandOject }
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);
            }

        }
        if (req.body.model) {
            let modelOject = req.body.model;
            if (modelOject.length > 0) {
                modelOject = modelOject.map((b) => { return ObjectId(b) });
                var searchQuery = {
                    "$match": {
                        "car_model_id": { "$in": modelOject },
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);
            }
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
            let transmissionObject = req.body.transmission;
            var searchQuery = {
                "$match": {
                    "transmission": { "$in": transmissionObject },
                }
            }
            defaultQuery.splice(3, 0, searchQuery);
        }
        if (req.body.car_class) {
            let classObject = req.body.car_class;
            var searchQuery = {
                "$match": {
                    "car_class": { "$in": classObject },
                }
            }
            defaultQuery.splice(3, 0, searchQuery);
        }
        if (req.body.capacity_of_people) {
            let copObject = req.body.capacity_of_people;
            var searchQuery = {
                "$match": {
                    "no_of_person": { "$in": copObject },
                }
            }
            defaultQuery.splice(3, 0, searchQuery);
        }
        if (req.body.milage) {
            let milageObject = req.body.milage;
            var searchQuery = {
                "$match": {
                    "milage": { "$in": milageObject },
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
        // sorting
        if (typeof req.body.sort_by !== 'undefined') {
            let sort_by = parseInt(req.body.sort_by);
            if(sort_by === 0){
                var searchQuery = {
                    $sort: {
                        'total_avg_rating': -1
                    }
                }
            }
            if(sort_by === 1){
                var searchQuery = {
                    $sort: {
                        'car.rent_price': -1
                    }
                }
            }
            if(sort_by === 2){
                var searchQuery = {
                    $sort: {
                        'car.rent_price': 1
                    }
                }
            }
            defaultQuery.push(searchQuery);
        }

        console.log('Default Query========>', JSON.stringify(defaultQuery));

        Car.aggregate(defaultQuery, function (err, data) {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "error in fetching data",
                    err
                });
            } else {
                // console.log(data);
                // var data = data.length != 0 ? data[0] : {total: 0, data: []}

                if (data && data.length > 0) {
                    cars = data.map((c) => {
                        c.car["total_avg_rating"] = c.total_avg_rating;
                        delete c.car.reviews;
                        return c.car;
                    })

                    res.status(config.OK_STATUS).json({
                        status: "success",
                        message: "car data found",
                        data: { cars: cars },
                    });
                }
                else {
                    res.status(config.OK_STATUS).json({
                        status: "failed",
                        message: "No car data found"
                    });
                }
            }
        });
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
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
    const Resp = await carHelper.getBrandList();
    res.json(Resp);
});

/**
 * @api {post} /app/car/modelList List of car Models by car brand id
 * @apiName Car ModelList
 * @apiDescription To Display car model list 
 * @apiGroup App - Car
 *
 * @apiParam {Array}  brand_ids car brand Id Array
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/modelList', async (req, res) => {
    var schema = {
        'brand_ids': {
            notEmpty: true,
            errorMessage: "Brand Id is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var brandArray = [];
        req.body.brand_ids.map(function (obj) {
            var myObjectId = ObjectId(obj);
            brandArray.push(myObjectId);
        });
        const Resp = await carHelper.getModelList(brandArray);
        res.json(Resp);
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


/**
 * @api {post} /app/car/review/:car_id Add car Review
 * @apiName add car Review
 * @apiDescription Used to add car review 
 * @apiGroup App - Car
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id user Id
 * @apiParam {Number} stars review stars
 * @apiParam {String} username reviwer name
 * @apiParam {String} [review_text] review comment
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
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

/**
 * @api {post} /app/car/review/:car_id Get car reviews
 * @apiName Car Reviews
 * @apiDescription To display specific car reviews
 * @apiGroup App - Car
 * 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/review/:car_id', async (req, res) => {
    const carReviewResp = await carHelper.getCarReviews(new ObjectId(req.params.car_id));
    res.json(carReviewResp);
});


/**
 * @api {post} /app/car/sort Sorting the cars
 * @apiName Car sorting
 * @apiDescription Used to sort car by popularity & its rental price
 * @apiGroup App - Car
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} sort_by pass this inside body eg. (0,1,2)
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.post('/sort', async (req, res) => {
    var schema = {
        'sort_by': {
            notEmpty: true,
            errorMessage: "Please enter sorting paramater"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var sort_by = parseInt(req.body.sort_by);
        const carSortingResp = await carHelper.carSorting(sort_by);
        res.json(carSortingResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            // message: "Validation Error",
            message: errors
        });
    }
});

/**
 * @api {post} /app/car/booking/past-history Past car booking history
 * @apiName past car booking history
 * @apiDescription Used to get past car booking history
 * @apiGroup App - Car
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id user Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/booking/past-history', async (req, res) => {
    // login user id will be pass here for now i am passing it from body
    const carHistoryResp = await carHelper.carBooking_past_history(req.body.user_id);
    res.json(carHistoryResp);
});

/**
 * @api {post} /app/car/booking/upcoming-history upcoming car booking history
 * @apiName upcoming car booking history
 * @apiDescription Used to get upcoming car booking history
 * @apiGroup App - Car
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id user Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/booking/upcoming-history', async (req, res) => {
    const carHistoryResp = await carHelper.carBooking_upcomming_history(req.body.user_id);
    res.json(carHistoryResp);
});

/**
 * @api {post} /app/car/checkCarAvailability Checking is car available on specific date?
 * @apiName Check availability car
 * @apiDescription Check whether car is available or not on some specific date
 * @apiGroup App - Car
 * 
 * @apiParam {Number} car_id Id of car
 * @apiParam {Date} fromDate Available from date
 * @apiParam {Number} days Number of days car needed

 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/checkCarAvailability', async (req, res) => {
    var schema = {
        'car_id': {
            notEmpty: true,
            errorMessage: "Please speficy car id for which you are cheking avaibility",
        },
        'fromDate': {
            notEmpty: true,
            errorMessage: "Please specify date from when you need car",
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
        let car_id = req.body.car_id;
        let fromDate = req.body.fromDate;
        let days = req.body.days;
        const carResp = await carHelper.checkCarAvaibility(car_id, fromDate, days);
        res.json(carResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});



// Car booking

router.post('/book', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter login user id",
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id which you are going to book",
        },
        'fromDate': {
            notEmpty: true,
            errorMessage: "Please specify date from when you need car",
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
        },
        'rent_per_day': {
            notEmpty: true,
            errorMessage: "Please enter car rent",
        },
        'delivery_address': {
            notEmpty: true,
            errorMessage: "Please enter delivery address",
        },
        'delivery_time':{
            notEmpty: true,
            errorMessage: "Please enter delivery time",
        },
        'total_booking_amount':{
            notEmpty: true,
            errorMessage: "Please enter total booking amount",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var toDate = moment(req.body.fromDate).add(req.body.days, 'days').format("YYYY-MM-DD");
        console.log(toDate);
        var data = {
            "userId" : req.body.user_id,
            "carId" : req.body.car_id,
            "from_time": req.body.fromDate,
            "to_time": toDate, // auto calculation
            "days": req.body.days,
            "booking_rent": req.body.rent_per_day,
            "delivery_address": req.body.delivery_address, // add field in db as well,
            "delivery_time": req.body.delivery_time, // add field in db as well',
            "coupon_code": req.body.coupon_code ? req.body.coupon_code : null,   
            "total_booking_amount": req.body.total_booking_amount, // add this field to db
            "trip_status": "upcoming"
        }

        // contniue from here pending make entry in db ok

        const bookingResp = await carHelper.carBook(data);
        
        res.json(bookingResp);
        // res.json({data : data});
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


module.exports = router;