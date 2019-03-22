var express = require('express');
var router = express.Router();

var config = require('./../../config');
const carHelper = require('./../../helper/car');
const pushNotificationHelper = require('./../../helper/push_notification');
const Car = require('./../../models/cars');
const CarBooking = require('./../../models/car_booking');
const Transaction = require('./../../models/transaction');
const CarBrand = require('./../../models/car_brand');
const CarModel = require('./../../models/car_model');
const Users = require('./../../models/users');
const CarCompany = require('./../../models/car_company');
const Coupon = require('./../../models/coupon');
const UserCoupon = require('./../../models/user_coupon');
const ReportCategory = require('./../../models/report_category');
const CarReport = require('./../../models/car_report');
const CarNotification = require('./../../models/car_notification');
const Notifications = require('./../../models/notifications');
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');
var mail_helper = require('./../../helper/mail');
const moment = require('moment');
const Nexmo = require('nexmo');

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

        if (carResp.status === 'success') {
            res.status(config.OK_STATUS).json(carResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(carResp);
        }
        // res.json(carResp);
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
        if (carResp.status === 'success') {
            res.status(config.OK_STATUS).json(carResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(carResp);
        }
        // res.json(carResp);
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
                    is_available: 1,
                    car_model_id: 1,
                    car_brand_id: 1,
                    isDeleted: 1,
                    resident_criteria: 1,
                    image_name: "$car_gallery.name" ? { $arrayElemAt: ["$car_gallery.name", 0] } : null,
                    // trip_status: "$carBookingDetails.trip_status", now
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
        if (typeof req.body.navigation !== 'undefined') {
            if (req.body.navigation === false) {
                let navigationOject = req.body.navigation;
                console.log('NAVIGATION 1======>', navigationOject);
                var searchQuery = {
                    "$match": {
                        "is_navigation": navigationOject,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);
            } else {
                console.log('NAVIGATION 2======>', req.body.navigation);
                var searchQuery = {
                    "$match": {
                        "is_navigation": true,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);
            }
        }
        else {
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
            if (sort_by === 0) {
                var searchQuery = {
                    $sort: {
                        'total_avg_rating': -1
                    }
                }
            }
            if (sort_by === 1) {
                var searchQuery = {
                    $sort: {
                        'car.rent_price': -1
                    }
                }
            }
            if (sort_by === 2) {
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
                    message: "No Cars Available.",
                    err
                });
            } else {
                // console.log(data);
                // var data = data.length != 0 ? data[0] : {total: 0, data: []}

                if (data && data.length > 0) {
                    console.log('DATAAT==>', data);
                    cars = data.map((c) => {
                        c.car["total_avg_rating"] = c.total_avg_rating;
                        if (c.car['image_name'] === undefined) {
                            c.car['image_name'] = null
                        }
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
                    res.status(config.BAD_REQUEST).json({
                        status: "failed",
                        message: "No Cars Available"
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
    if (Resp.status === 'success') {
        res.status(config.OK_STATUS).json(Resp);
    }
    else {
        res.status(config.BAD_REQUEST).json(Resp);
    }
    // res.json(Resp);
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
        if (Resp.status === 'success') {
            res.status(config.OK_STATUS).json(Resp);
        }
        else {
            res.status(config.BAD_REQUEST).json(Resp);
        }
        // res.json(Resp);
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
 * @api {post} /app/car/add-review
 * @apiName add car Review
 * @apiDescription Used to add car review 
 * @apiGroup App - Car
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} car_id car Id
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

router.post('/add-review', async (req, res) => {
    var schema = {
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id"
        },
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
            'car_id': req.body.car_id,
            'user_id': req.body.user_id,
            'stars': req.body.stars,
            'username': req.body.username,
            'review_text': req.body.review_text ? req.body.review_text : ''
        }
        const carReviewResp = await carHelper.addReview(review_data);
        if (carReviewResp.status === 'success') {
            res.status(config.OK_STATUS).json(carReviewResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(carReviewResp);
        }
        // res.json(carReviewResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
        });
    }
});

/**
 * @api {post} /app/car/review Get car reviews
 * @apiName Car Reviews
 * @apiDescription To display specific car reviews
 * @apiGroup App - Car
 * 
 * @apiParam {Number} car_id car Id
 * @apiParam {Number} [user_id] user Id
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

// router.get('/review/:car_id', async (req, res) => {
//     const carReviewResp = await carHelper.getCarReviews(new ObjectId(req.params.car_id));
//     res.json(carReviewResp);
// });

router.post('/review', async (req, res) => {
    var data = {};
    data.car_id = req.body.car_id;
    if (req.body.user_id !== undefined) {
        data.user_id = req.body.user_id;
    }
    const carReviewResp = await carHelper.getCarReviews(data);
    if (carReviewResp.status === 'success') {
        res.status(config.OK_STATUS).json(carReviewResp);
    }
    else {
        res.status(config.BAD_REQUEST).json(carReviewResp);
    }

    // res.json(carReviewResp);
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
        if (carSortingResp.status === 'success') {
            res.status(config.OK_STATUS).json(carSortingResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(carSortingResp);
        }

        // res.json(carSortingResp);
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
    if (carHistoryResp.status === 'success') {
        res.status(config.OK_STATUS).json(carHistoryResp);
    }
    else {
        res.status(config.BAD_REQUEST).json(carHistoryResp);
    }
    // res.json(carHistoryResp);
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
    if (carHistoryResp.status === 'success') {
        res.status(config.OK_STATUS).json(carHistoryResp);
    }
    else {
        res.status(config.BAD_REQUEST).json(carHistoryResp);
    }
    // res.json(carHistoryResp);
});



/**
 * @api {post} /app/car/booking/history Car History
 * @apiName car booking history
 * @apiDescription Used to get car booking history
 * @apiGroup App - Car
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id user Id
 * @apiParam {String} history_type one of this (all,active,cancelled)
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

// Car History
router.post('/booking/history', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'history_type': {
            notEmpty: true,
            errorMessage: "Please enter history type"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var user_id = req.body.user_id;
        var history_type = req.body.history_type;

        const carHistoryResp = await carHelper.history(user_id, history_type);

        if (carHistoryResp.status === 'success') {
            res.status(config.OK_STATUS).json(carHistoryResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(carHistoryResp);
        }
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        })
    }
    // res.json(carHistoryResp);
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
router.post('/checkCarAvailability-v2', async (req, res) => {
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
        // const carResp = await carHelper.checkCarAvaibility(car_id, fromDate, days);
        const carResp = await carHelper.checkCarAvaibility_v2(car_id, fromDate, days);
        if (carResp.status === 'success') {
            res.status(config.OK_STATUS).json(carResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(carResp);
        }
        // res.json(carResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

/**
 * @api {post} /app/car/checkCarAvailability-v3 Checking is car available on specific date?
 * @apiName Check availability car varsion 3
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
router.post('/checkCarAvailability-v3', async (req, res) => {
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
        // const carResp = await carHelper.checkCarAvaibility(car_id, fromDate, days);
        const carResp = await carHelper.checkCarAvaibility_v3(car_id, fromDate, days);
        if (carResp.status === 'success') {
            res.status(config.OK_STATUS).json(carResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(carResp);
        }
        // res.json(carResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


// test avaibilility v4


router.post('/check-extend-availability', async (req, res) => {
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
        // const carResp = await carHelper.checkCarAvaibility(car_id, fromDate, days);
        const carResp = await carHelper.check_extend_availability(car_id, fromDate, days);
        if (carResp.status === 'success') {
            res.status(config.OK_STATUS).json(carResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(carResp);
        }
        // res.json(carResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});







/**
 * @api {post} /app/car/book Book Car
 * @apiName Car Booking
 * @apiDescription Booking the car
 * @apiGroup App - Car
 * 
 * @apiParam {String} user_id User ID
 * @apiParam {String} car_id Car ID
 * @apiParam {Date} fromDate Car booking from date
 * @apiParam {Number} days Number of days car needed
 * @apiParam {Number} rent_per_day Rent when car book per day
 * @apiParam {String} delivery_address Car Delivery Address (eg. 320, regent square surat india)
 * @apiParam {String} delivery_time Car Delivery Time (eg. 7am - 9am)
 * @apiParam {Number} [coupon_code] coupon code (eg. ABCD)
 * @apiParam {Number} [coupon_percentage] coupon percentage (eg. 10)
 * @apiParam {Number} total_booking_amount Total car booking amount
 * @apiParam {String} carCompanyId Car rental company id
 * @apiParam {Number} vat vat rate
 * @apiParam {Number} deposite_amount car deposite amount
 * @apiParam {Number} latitude latitude
 * @apiParam {Number} longitude longitude
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */


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
        'carCompanyId': {
            notEmpty: true,
            errorMessage: "Please enter car rental company id",
        },
        'vat': {
            notEmpty: true,
            errorMessage: "Please enter car vat rate",
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
        'delivery_time': {
            notEmpty: true,
            errorMessage: "Please enter delivery time",
        },
        'latitude': {
            notEmpty: true,
            errorMessage: "Please enter lattitude",
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Please enter longitude",
        },
        'total_booking_amount': {
            notEmpty: true,
            errorMessage: "Please enter total booking amount",
        },
        'deposite_amount': {
            notEmpty: true,
            errorMessage: "Please enter car deposite amount",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var toDate = moment(req.body.fromDate).add(req.body.days, 'days').format("YYYY-MM-DD");

        var fromDate = req.body.fromDate;
        console.log('From date =>', fromDate);
        console.log('To date =>', toDate);

        // check for already book or not first 

        // var carData = await Car.find({_id : ObjectId(req.body.car_id)},{is_available : 1}).lean().exec();

        var updateUserStatus = await Users.updateOne({ "_id": new ObjectId(req.body.user_id) }, { $set: { "app_user_status": "rented" } });

        var carData = await CarBooking.find(
            {

                // $match : {
                $and: [
                    { "carId": new ObjectId(req.body.car_id) },
                    { "from_time": { $lte: toDate } },
                    { "to_time": { $gte: fromDate } },
                    // { "trip_status": { $ne: 'cancelled' } },
                    { "trip_status": { $nin: ['cancelled', 'finished'] } },
                ]
            }
            // }

        )

        console.log('CAR DATA ->', carData);
        console.log('CAR DATA Len->', carData.length);

        if (carData && carData.length > 0) {
            // already book
            res.status(config.OK_STATUS).json({ status: "failed", message: "Opps this car has been already booked" });
        } else {

            var data = {
                "userId": req.body.user_id,
                "carId": req.body.car_id,
                "carCompanyId": req.body.carCompanyId, // add later on
                "vat": req.body.vat, // add later on
                "from_time": req.body.fromDate,
                "to_time": toDate, // auto calculation
                "days": req.body.days,
                "booking_rent": req.body.rent_per_day,
                "delivery_address": req.body.delivery_address, // add field in db as well,
                "delivery_time": req.body.delivery_time, // add field in db as well',
                "coupon_code": req.body.coupon_code ? req.body.coupon_code : null,
                "coupon_percentage": req.body.coupon_percentage ? req.body.coupon_percentage : null,
                "total_booking_amount": req.body.total_booking_amount, // add this field to db
                "latitude": req.body.latitude ? req.body.latitude : null, // add this field to db
                "longitude": req.body.longitude ? req.body.longitude : null, // add this field to db
                "trip_status": "upcoming",
                "transaction_status": "inprogress",
                "deposite_amount": req.body.deposite_amount
            }


            const bookingResp = await carHelper.carBook(data);

            if (bookingResp.status === 'success') {

                const deposit = await Car.findOne({ "_id": new ObjectId(req.body.car_id) });
                var car_booking_number = bookingResp.data.booking_data['booking_number'];


                const transactionData = {
                    "userId": req.body.user_id,
                    "carId": req.body.car_id,
                    "from_time": req.body.fromDate,
                    "to_time": toDate,
                    "Transaction_amount": req.body.total_booking_amount, //
                    "deposite_amount": deposit.deposit,
                    "coupon_code": req.body.coupon_code ? req.body.coupon_code : null,
                    "VAT": req.body.vat ? req.body.vat : null,
                    "status": "inprogress",
                    "booking_number": car_booking_number
                }

                let transaction = new Transaction(transactionData);
                await transaction.save();

                console.log('DATTA==>', data);

                console.log('Booking Id =>', bookingResp.data.booking_data['booking_number']);


                /*store coupon entry in user_coupon collection*/

                if (bookingResp.data.booking_data.coupon_code !== null || bookingResp.data.booking_data.coupon_code !== undefined) {
                    // make entry
                    var findCoupon = await Coupon.find({ 'coupon_code': bookingResp.data.booking_data.coupon_code });
                    if (findCoupon && findCoupon.length > 0) {
                        let data = {
                            "couponId": findCoupon[0]._id,
                            "userId": bookingResp.data.booking_data.userId
                        }
                        let add_user_coupon = new UserCoupon(data);
                        let apply = await add_user_coupon.save();
                    }
                }

                /* coupon over */

                res.status(config.OK_STATUS).json(bookingResp)


                // after car booking need to send push notification ther user on IOS APP & Android app 
                /** push notification process to user app start */

                var userDeviceToken = await Users.find({ '_id': new ObjectId(data.userId) }, { _id: 1, deviceToken: 1, phone_number: 1, country_code: 1, deviceType: 1, email: 1, first_name: 1 }).lean().exec();
                var companyData = await CarCompany.find({ '_id': new ObjectId(req.body.carCompanyId) }).lean().exec();
                var superAdminData = await Users.find({ 'type': 'admin', isDeleted: false }).lean().exec();

                // console.log('USER DEVICE TOKEN DATA==>', userDeviceToken);

                var deviceToken = null;
                console.log('User token =>', userDeviceToken);
                if (userDeviceToken[0].deviceToken !== undefined && userDeviceToken[0].deviceToken !== null) {
                    if (userDeviceToken[0].deviceToken.length > 10) { // temp condition
                        // agentDeviceTokenArray.push(agent.deviceToken);
                        deviceToken = userDeviceToken[0].deviceToken;
                    }
                }

                var notificationType = 1; // means notification for booking 
                console.log('Dev Token=>', deviceToken);
                var msg = "Your car has been booked successfully";
                if (userDeviceToken[0].deviceType === 'ios') {
                    var sendNotification = await pushNotificationHelper.sendToIOS(deviceToken, car_booking_number, notificationType, msg);
                    /* save notification to db start */
                    if (deviceToken !== null) {
                        var data = {
                            "userId": userDeviceToken[0]._id,
                            "deviceToken": deviceToken,
                            "deviceType": 'ios',
                            "notificationText": msg,
                            "notificationType": 1,
                            "booking_number": car_booking_number
                        }
                        var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                    }
                    /* save notification to db over */

                } else if (userDeviceToken[0].deviceType === 'android') {
                    var sendNotification = await pushNotificationHelper.sendToAndroidUser(deviceToken, car_booking_number, msg);
                    /* save notification to db start */
                    if (deviceToken !== null) {
                        var data = {
                            "userId": userDeviceToken[0]._id,
                            "deviceToken": deviceToken,
                            "deviceType": 'android',
                            "notificationText": msg,
                            "notificationType": 1,
                            "booking_number": car_booking_number
                        }
                        var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                    }
                    /* save notification to db over */
                }


                /** Push notofication for user app over */

                // after car booking need to send push notification to all agent
                /* push notification process to all agent start */

                var agentList = await Users.find({ 'type': 'agent' }, { _id: 1, deviceToken: 1, phone_number: 1 }).lean().exec();

                var agentDeviceTokenArray = [];

                var agent_data_array = [];
                var msg = "New car has been book assign to you to deliver it";
                agentList.map((agent, index) => {
                    if (agent.deviceToken !== undefined) {
                        if (agent.deviceToken !== null) {
                            if (agent.deviceToken.length > 10) { // temp condition
                                agentDeviceTokenArray.push(agent.deviceToken);

                                agent_data_array.push({
                                    "userId": agent._id,
                                    "deviceToken": agent.deviceToken,
                                    "deviceType": 'android',
                                    "notificationText": msg,
                                    "notificationType": 1,
                                    "booking_number": car_booking_number
                                })
                            }
                        }
                    }
                });

                var notificationFor = "new-booking";
                var sendNotification = await pushNotificationHelper.sendToAndroid(agentDeviceTokenArray, car_booking_number, notificationFor, msg);

                // save multile notification for (agent)
                var saveNotiResp = await pushNotificationHelper.save_multiple_notification_to_db(agent_data_array);

                /** Notification over for agent */


                /* send email to user after car has been booked start*/
                // user
                var options_user = {
                    to: userDeviceToken[0].email,
                    subject: 'ABHR - New car has been booked'
                }
                // company admin
                var options_company_admin = {
                    to: companyData[0].email,
                    subject: 'ABHR - New car has been booked'
                }
                // super admin
                if (superAdminData && superAdminData.length > 0) {
                    var options_super_admin = {
                        to: superAdminData[0].email,
                        subject: 'ABHR - New car has been booked'
                    }
                }

                // var data1 = bookingResp.data.booking_data;
                const carResp = await carHelper.getcarDetailbyId(new ObjectId(req.body.car_id)); // resuable api

                // console.log("CAR RESPO =>",carResp);

                var data1 = JSON.parse(JSON.stringify(bookingResp.data.booking_data));

                data1.rent_price = carResp.data.carDetail.rent_price;

                data1.no_of_person = carResp.data.carDetail.no_of_person;
                data1.transmission = carResp.data.carDetail.transmission === 'manual' ? 'M' : 'A';

                data1.milage = carResp.data.carDetail.milage;
                data1.car_class = carResp.data.carDetail.car_class;

                data1.driving_eligibility_criteria = carResp.data.carDetail.driving_eligibility_criteria;

                data1.car_brand = carResp.data.carDetail.car_brand;
                data1.car_model = carResp.data.carDetail.car_model;
                data1.car_model_number = carResp.data.carDetail.car_model_number;
                data1.car_model_release_year = carResp.data.carDetail.car_model_release_year;
                data1.image_name = carResp.data.carDetail.image_name;
                data1.user_name = userDeviceToken[0].first_name;
                // data1.user_name = 'dipesh';
                data1.fromDate = moment(data1.from_time).format("MMM-DD-YYYY");
                data1.toDate = moment(data1.to_time).format("MMM-DD-YYYY");



                // console.log('Booking Response Final DATA=>',data1);

                // let mail_resp = await mail_helper.sendEmail_carBook("car_booking", options, data1);
                let mail_resp1 = await mail_helper.sendEmail_carBook("car_booking", options_user, data1);
                console.log("Mail sending response 1", mail_resp1);

                var data2 = data1;
                data2.user_name = companyData[0].name;
                let mail_resp2 = await mail_helper.sendEmail_carBook("car_booking", options_company_admin, data2);
                console.log("Mail sending response 2", mail_resp2);

                if (superAdminData && superAdminData.length > 0) {
                    var data3 = data1;
                    data3.user_name = superAdminData[0].first_name;
                    let mail_resp3 = await mail_helper.sendEmail_carBook("car_booking", options_super_admin, data3);
                    console.log("Mail sending response 3", mail_resp3);
                }



                /** Sending email is over */


                /** Send SMS after car has been booked Start*/
                const nexmo = new Nexmo({
                    apiKey: config.NEXMO_API_KEY,
                    apiSecret: config.NEXMO_API_SECRET
                })

                // const send_to = '919712825007'; // userDeviceToken[0].country_code
                const send_to = userDeviceToken[0].country_code + '' + userDeviceToken[0].phone_number;
                const from = 'ABHR';
                const to = send_to;
                const sms_text = 'Your car has been booked successfully with booking number ' + car_booking_number;

                const resp = await nexmo.message.sendSms(from, to, sms_text);
                console.log("SMS Response =>", resp)

                /** Send sms over */











                // res.status(config.OK_STATUS).json(bookingResp) // set this line after coupon entry
            }
            else {
                res.status(config.BAD_REQUEST).json(bookingResp);
            }
        }


    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});





// Change Car Booking  Details
/**
 * @api {post} /app/car/change-booking Change Car booking details
 * @apiName Change Car Booking Details
 * @apiDescription change car booking details like delivery address & delivery time
 * @apiGroup App - Car
 * 
 * @apiParam {Number} booking_number Car booking id
 * @apiParam {String} delivery_address Car Delivery Address (eg. 320, regent square surat india)
 * @apiParam {String} delivery_time Car Delivery Time (eg. 7am - 9am)
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.post('/change-booking', async (req, res) => {
    var schema = {
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter your car booking number",
        },
        'delivery_address': {
            notEmpty: true,
            errorMessage: "Please enter your car delivery address",
        },
        'delivery_time': {
            notEmpty: true,
            errorMessage: "Please enter your car delivery time",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var booking_number = req.body.booking_number;
        var data = {
            "delivery_address": req.body.delivery_address,
            "delivery_time": req.body.delivery_time
        }
        const bookingResp = await carHelper.change_carBook(booking_number, data);

        if (bookingResp.status === 'success') {
            res.status(config.OK_STATUS).json(bookingResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(bookingResp);
        }
        // res.json(bookingResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

// Change Car Booking  Details v2
/**
 * @api {post} /app/car/change-booking-v2 Change Car booking details
 * @apiName Change Car Booking Details
 * @apiDescription change car booking details like delivery address & delivery time
 * @apiGroup App - Car
 * 
 * @apiParam {Number} booking_number Car booking id
 * @apiParam {String} delivery_address Car Delivery Address (eg. 320, regent square surat india)
 * @apiParam {String} delivery_time Car Delivery Time (eg. 7am - 9am)
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

router.post('/change-booking-v2', async (req, res) => {
    var schema = {
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter your car booking number",
        },
        'delivery_address': {
            notEmpty: true,
            errorMessage: "Please enter your car delivery address",
        },
        'delivery_time': {
            notEmpty: true,
            errorMessage: "Please enter your car delivery time",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var booking_number = req.body.booking_number;
        var data = {
            "delivery_address": req.body.delivery_address,
            "delivery_time": req.body.delivery_time
        }
        const bookingResp = await carHelper.change_carBook(booking_number, data);

        if (bookingResp.status === 'success') {

            res.status(config.OK_STATUS).json(bookingResp);

            var user_id = await CarBooking.findOne({ 'booking_number': req.body.booking_number }, { _id: 0, userId: 1, carCompanyId: 1, car_handover_by_agent_id: 1 }).lean().exec();
            // console.log("USER IDDDD ===>>", user_id);
            var companyData = await CarCompany.find({ '_id': new ObjectId(user_id.carCompanyId) }).lean().exec();
            var superAdminData = await Users.find({ 'type': 'admin', isDeleted: false }).lean().exec();

            var userDeviceToken = await Users.find({ '_id': new ObjectId(user_id.userId) }, { _id: 1, deviceToken: 1, phone_number: 1, deviceType: 1, email: 1, country_code: 1, first_name: 1 }).lean().exec();
            var deviceToken = null;
            console.log('User token =>', userDeviceToken);
            if (userDeviceToken[0].deviceToken !== undefined && userDeviceToken[0].deviceToken !== null) {
                if (userDeviceToken[0].deviceToken.length > 10) { // temp condition
                    // agentDeviceTokenArray.push(agent.deviceToken);
                    deviceToken = userDeviceToken[0].deviceToken;
                }
            }

            var notificationType = 1; // means notification for booking 
            console.log('Dev Token=>', deviceToken);
            // var msg = "Your booking is changed successfully";
            var msg = "Your booking has been updated successfully";
            if (userDeviceToken[0].deviceType === 'ios') {
                var sendNotification = await pushNotificationHelper.sendToIOS(deviceToken, req.body.booking_number, notificationType, msg);

                /* save notification to db start */
                if (deviceToken !== null) {
                    var data = {
                        "userId": userDeviceToken[0]._id,
                        "deviceToken": deviceToken,
                        "deviceType": 'ios',
                        "notificationText": msg,
                        "notificationType": 1,
                        "booking_number": req.body.booking_number
                    }
                    var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                }
                /* save notification to db over */

            } else if (userDeviceToken[0].deviceType === 'android') {
                var sendNotification = await pushNotificationHelper.sendToAndroidUser(deviceToken, req.body.booking_number, msg);
                /* save notification to db start */
                if (deviceToken !== null) {
                    var data = {
                        "userId": userDeviceToken[0]._id,
                        "deviceToken": deviceToken,
                        "deviceType": 'android',
                        "notificationText": msg,
                        "notificationType": 1,
                        "booking_number": req.body.booking_number
                    }
                    var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                }
                /* save notification to db over */
            }

            // send notification to agent for change booking

            if (user_id.car_handover_by_agent_id && user_id.car_handover_by_agent_id != null) {
                var agentData = await Users.find({ '_id': new ObjectId(user_id.car_handover_by_agent_id) }, { _id: 1, deviceToken: 1, phone_number: 1, deviceType: 1, email: 1, phone_number: 1 }).lean().exec();
                var deviceToken = null;
                // var msg = "Car booking has been changed"
                var msg = userDeviceToken[0].first_name+"'\s"+" booking has been updated";
                // Push notification //
                if (agentData[0].deviceToken !== undefined && agentData[0].deviceToken !== null) {
                    if (agentData[0].deviceToken.length > 10) { // temp condition
                        // agentDeviceTokenArray.push(agent.deviceToken);
                        deviceToken = agentData[0].deviceToken;
                        var notificationType = 1; // means notification for booking 
                        var sendNotification = await pushNotificationHelper.sendToAndroidAgent(deviceToken, req.body.booking_number, msg);

                        /* save notification to db start */
                        if (deviceToken !== null) {
                            var data = {
                                "userId": agentData[0]._id,
                                "deviceToken": deviceToken,
                                "deviceType": 'android',
                                "notificationText": msg,
                                "notificationType": 1,
                                "booking_number": req.body.booking_number
                            }
                            var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                        }
                        /* save notification to db over */
                    }
                }
            }

            /** -------- over ------ */



            // new changes start
            var bookData = await CarBooking.findOne({ "booking_number": req.body.booking_number }).lean().exec();
            const carResp = await carHelper.getcarDetailbyId(new ObjectId(bookData.carId)); // re-usable api
            var data1 = bookData;

            data1.rent_price = carResp.data.carDetail.rent_price;
            data1.no_of_person = carResp.data.carDetail.no_of_person;
            data1.transmission = carResp.data.carDetail.transmission === 'manual' ? 'M' : 'A';

            data1.milage = carResp.data.carDetail.milage;
            data1.car_class = carResp.data.carDetail.car_class;

            data1.driving_eligibility_criteria = carResp.data.carDetail.driving_eligibility_criteria;

            data1.car_brand = carResp.data.carDetail.car_brand;
            data1.car_model = carResp.data.carDetail.car_model;
            data1.car_model_number = carResp.data.carDetail.car_model_number;
            data1.car_model_release_year = carResp.data.carDetail.car_model_release_year;
            data1.image_name = carResp.data.carDetail.image_name;
            data1.user_name = userDeviceToken[0].first_name;
            // data1.user_name = 'dipesh';
            data1.fromDate = moment(data1.from_time).format("MMM-DD-YYYY");
            data1.toDate = moment(data1.to_time).format("MMM-DD-YYYY");

            // changes over

            /* send email to user after car booking has been cancelled start*/
            // user
            var options_user = {
                to: userDeviceToken[0].email,
                subject: 'ABHR - Car booking has been changed'
            }
            // company admin
            var options_company_admin = {
                to: companyData[0].email,
                subject: 'ABHR - Car booking has been changed'
            }
            // super admin
            if (superAdminData && superAdminData.length > 0) {
                var options_super_admin = {
                    to: superAdminData[0].email,
                    subject: 'ABHR - Car booking has been changed'
                }
            }

            // var data1 = { booking_number: req.body.booking_number }

            // console.log('Booking Response DATA=>', data1);

            let mail_resp1 = await mail_helper.sendEmail_carBook("car_booking_change", options_user, data1);
            console.log('Mail sending response 1=>', mail_resp1);

            var data2 = data1;
            data2.user_name = companyData[0].name;
            let mail_resp2 = await mail_helper.sendEmail_carBook("car_booking_change", options_company_admin, data2);
            console.log('Mail sending response 2=>', mail_resp2);

            if (superAdminData && superAdminData.length > 0) {
                var data3 = data1;
                data3.user_name = superAdminData[0].first_name;
                let mail_resp3 = await mail_helper.sendEmail_carBook("car_booking_change", options_super_admin, data3);
                console.log('Mail sending response 3=>', mail_resp3);
            }


            /** Sending email is over */

            /** Send SMS after car has been booked Start*/
            const nexmo = new Nexmo({
                apiKey: config.NEXMO_API_KEY,
                apiSecret: config.NEXMO_API_SECRET
            })

            // const send_to = '919099543424'; // userDeviceToken[0].country_code
            const send_to = userDeviceToken[0].country_code + '' + userDeviceToken[0].phone_number;
            const from = 'ABHR';
            const to = send_to;
            const sms_text = 'Your car booking for booking number ' + req.body.booking_number + ' has been changed successfully';

            const resp = await nexmo.message.sendSms(from, to, sms_text);
            console.log("SMS Response =>", resp)

            /** Send sms over */



        }
        else {
            res.status(config.BAD_REQUEST).json(bookingResp);
        }
        // res.json(bookingResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});



/**
 * @api {post} /app/car/cancel-booking-v2 Cancel Car Booking
 * @apiName Cancel Car Booking
 * @apiDescription Cancel Car Booking
 * @apiGroup App - Car
 * 
 * @apiParam {String} user_id User ID
 * @apiParam {String} car_id Car ID
 * @apiParam {Date} cancel_date Car booking cancel date
 * @apiParam {String} [cancel_reason] Reason for cancelling car booking
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

//Cancel Car booking 
router.post('/cancel-booking-v2', async (req, res) => {
    var schema = {
        // 'user_id': {
        //     notEmpty: true,
        //     errorMessage: "Please enter login user id",
        // },
        // 'car_id': {
        //     notEmpty: true,
        //     errorMessage: "Please enter car id which you are going to book",
        // },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number",
        },
        'cancel_date': {
            notEmpty: true,
            errorMessage: "Please specify date from when you need car",
            isISO8601: {
                value: true,
                errorMessage: "Please enter valid data. Format should be yyyy-mm-dd"
            }
        }
        // 'cancel_reason': { // will uncomment this in future
        //     notEmpty: true,
        //     errorMessage: "Please give reason for cancelling car booking",
        // }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var data = {
            // "userId": req.body.user_id,
            // "carId": req.body.car_id,
            "booking_number": req.body.booking_number,
            "cancel_date": req.body.cancel_date,
            "cancel_reason": req.body.cancel_reason ? req.body.cancel_reason : null,
            "trip_status": "cancelled"
        }

        const cancelBookingResp = await carHelper.cancelBooking(data);

        if (cancelBookingResp.status === 'success') {

            var user_id = await CarBooking.findOne({ 'booking_number': req.body.booking_number }, { _id: 0, userId: 1, carCompanyId: 1, car_handover_by_agent_id: 1 }).lean().exec();

            var companyData = await CarCompany.find({ '_id': new ObjectId(user_id.carCompanyId) }).lean().exec();
            var superAdminData = await Users.find({ 'type': 'admin', isDeleted: false }).lean().exec();


            var userDeviceToken = await Users.find({ '_id': new ObjectId(user_id.userId) }, { _id: 1, deviceToken: 1, phone_number: 1, deviceType: 1, email: 1, country_code: 1, first_name: 1 }).lean().exec();
            var deviceToken = null;
            // console.log('USER IDDD ==>', user_id);
            console.log('User token =>', userDeviceToken);
            if (userDeviceToken[0].deviceToken !== undefined && userDeviceToken[0].deviceToken !== null) {
                if (userDeviceToken[0].deviceToken.length > 10) { // temp condition
                    // agentDeviceTokenArray.push(agent.deviceToken);
                    deviceToken = userDeviceToken[0].deviceToken;
                }
            }

            var notificationType = 1; // means notification for booking 
            var msg = "Your booking has been cancelled";
            console.log('Dev Token=>', deviceToken);
            if (userDeviceToken[0].deviceType === 'ios') {
                var sendNotification = await pushNotificationHelper.sendToIOS(deviceToken, req.body.booking_number, notificationType, msg);

                /* save notification to db start */
                if (deviceToken !== null) {
                    var data = {
                        "userId": userDeviceToken[0]._id,
                        "deviceToken": deviceToken,
                        "deviceType": 'ios',
                        "notificationText": msg,
                        "notificationType": 1,
                        "booking_number": req.body.booking_number
                    }
                    var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                }
                /* save notification to db over */

            } else if (userDeviceToken[0].deviceType === 'android') {
                var sendNotification = await pushNotificationHelper.sendToAndroidUser(deviceToken, req.body.booking_number, msg);
                /* save notification to db start */
                if (deviceToken !== null) {
                    var data = {
                        "userId": userDeviceToken[0]._id,
                        "deviceToken": deviceToken,
                        "deviceType": 'android',
                        "notificationText": msg,
                        "notificationType": 1,
                        "booking_number": req.body.booking_number
                    }
                    var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                }
                /* save notification to db over */
            }

            if (user_id.car_handover_by_agent_id && user_id.car_handover_by_agent_id != null) {
                var agentData = await Users.find({ '_id': new ObjectId(user_id.car_handover_by_agent_id) }, { _id: 1, deviceToken: 1, phone_number: 1, deviceType: 1, email: 1, phone_number: 1 }).lean().exec();
                var deviceToken = null;
                var msg = "Oopss!! " + userDeviceToken[0].first_name + "'\s" + " booking has been cancelled";
                // Push notification //
                if (agentData[0].deviceToken !== undefined && agentData[0].deviceToken !== null) {
                    if (agentData[0].deviceToken.length > 10) { // temp condition
                        // agentDeviceTokenArray.push(agent.deviceToken);
                        deviceToken = agentData[0].deviceToken;
                        var notificationType = 1; // means notification for booking 
                        var sendNotification = await pushNotificationHelper.sendToAndroidAgent(deviceToken, req.body.booking_number, msg);

                        /* save notification to db start */
                        if (deviceToken !== null) {
                            var data = {
                                "userId": agentData[0]._id,
                                "deviceToken": deviceToken,
                                "deviceType": 'android',
                                "notificationText": msg,
                                "notificationType": 1,
                                "booking_number": req.body.booking_number
                            }
                            var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                        }
                        /* save notification to db over */
                    }
                }
            }

            // var car_avaibility = await Car.updateOne({_id : new ObjectId(req.body.car_id)}, { $set : { 'is_available' : true } } );              


            /* send email to user after car booking has been cancelled start*/
            // user
            var options_user = {
                to: userDeviceToken[0].email,
                subject: 'ABHR - Car booking has been cancelled'
            }
            // company admin
            var options_company_admin = {
                to: companyData[0].email,
                subject: 'ABHR -  Car booking has been cancelled'
            }
            // super admin
            if (superAdminData && superAdminData.length > 0) {
                var options_super_admin = {
                    to: superAdminData[0].email,
                    subject: 'ABHR -  Car booking has been cancelled'
                }
            }


            var data1 = { booking_number: req.body.booking_number, user_name: userDeviceToken[0].first_name }
            var data2 = { booking_number: req.body.booking_number, user_name: companyData[0].name }


            console.log('Booking Response DATA=>', data1);

            let mail_resp1 = await mail_helper.sendEmail_carBook("car_booking_cancel", options_user, data1);
            console.log('Mail sending response 1 =>', mail_resp1);
            let mail_resp2 = await mail_helper.sendEmail_carBook("car_booking_cancel", options_company_admin, data2);
            console.log('Mail sending response 2 =>', mail_resp2);
            if (superAdminData && superAdminData.length > 0) {
                var data3 = { booking_number: req.body.booking_number, user_name: superAdminData[0].first_name }
                let mail_resp3 = await mail_helper.sendEmail_carBook("car_booking_cancel", options_super_admin, data3);
                console.log('Mail sending response 3 =>', mail_resp3);
            }


            /** Sending email is over */

            /** Send SMS after car has been booked Start*/
            const nexmo = new Nexmo({
                apiKey: config.NEXMO_API_KEY,
                apiSecret: config.NEXMO_API_SECRET
            })

            // const send_to = '919099543424'; // userDeviceToken[0].country_code
            const send_to = userDeviceToken[0].country_code + '' + userDeviceToken[0].phone_number;
            const from = 'ABHR';
            const to = send_to;
            const sms_text = 'Your car booking number ' + req.body.booking_number + ' has been cancelled successfully';

            const resp = await nexmo.message.sendSms(from, to, sms_text);
            console.log("SMS Response =>", resp)

            /** Send sms over */

            res.status(config.OK_STATUS).json(cancelBookingResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(cancelBookingResp);
        }
        // res.json(cancelBookingResp);

    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


/**
 * @api {post} /app/car/cancel-booking Cancel Car Booking
 * @apiName Cancel Car Booking
 * @apiDescription Cancel Car Booking
 * @apiGroup App - Car
 * 
 * @apiParam {String} user_id User ID
 * @apiParam {String} car_id Car ID
 * @apiParam {Date} cancel_date Car booking cancel date
 * @apiParam {String} [cancel_reason] Reason for cancelling car booking
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

//Cancel Car booking 
router.post('/cancel-booking', async (req, res) => {
    var schema = {
        // 'user_id': {
        //     notEmpty: true,
        //     errorMessage: "Please enter login user id",
        // },
        // 'car_id': {
        //     notEmpty: true,
        //     errorMessage: "Please enter car id which you are going to book",
        // },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number",
        },
        'cancel_date': {
            notEmpty: true,
            errorMessage: "Please specify date from when you need car",
            isISO8601: {
                value: true,
                errorMessage: "Please enter valid data. Format should be yyyy-mm-dd"
            }
        }
        // 'cancel_reason': { // will uncomment this in future
        //     notEmpty: true,
        //     errorMessage: "Please give reason for cancelling car booking",
        // }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var data = {
            // "userId": req.body.user_id,
            // "carId": req.body.car_id,
            "booking_number": req.body.booking_number,
            "cancel_date": req.body.cancel_date,
            "cancel_reason": req.body.cancel_reason ? req.body.cancel_reason : null,
            "trip_status": "cancelled"
        }

        const cancelBookingResp = await carHelper.cancelBooking(data);

        if (cancelBookingResp.status === 'success') {
            // var car_avaibility = await Car.updateOne({_id : new ObjectId(req.body.car_id)}, { $set : { 'is_available' : true } } );              

            res.status(config.OK_STATUS).json(cancelBookingResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(cancelBookingResp);
        }
        // res.json(cancelBookingResp);

    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});



//Check Car Service Availability
router.post('/service-availability', async (req, res) => {
    if (req.body.type !== undefined) {
        if (req.body.type === 'country') {
            var schema = {
                'type': {
                    notEmpty: true,
                    errorMessage: "Please enter type",
                }
            };
            req.checkBody(schema);
            var errors = req.validationErrors();
        }
        else if (req.body.type === 'state') {
            var schema = {
                'id': {
                    notEmpty: true,
                    errorMessage: "Please enter country id",
                },
                'type': {
                    notEmpty: true,
                    errorMessage: "Please enter type",
                }
            };
            req.checkBody(schema);
            var errors = req.validationErrors();
        } else if (req.body.type === 'city') {
            var schema = {
                'id': {
                    notEmpty: true,
                    errorMessage: "Please enter state id",
                },
                'type': {
                    notEmpty: true,
                    errorMessage: "Please enter type",
                }
            };
            req.checkBody(schema);
            var errors = req.validationErrors();
        }

        if (!errors) {
            // here id may be country or state id base on condition
            if (req.body.type === 'state' || req.body.type === 'city') {
                var data = {
                    id: req.body.id,
                    type: req.body.type
                }
            }
            else {
                var data = {
                    type: req.body.type
                }
            }

            const serviceResp = await carHelper.Check_Service_Availibility(data);

            if (serviceResp.status === 'success') {
                res.status(config.OK_STATUS).json(serviceResp);
            }
            else {
                res.status(config.BAD_REQUEST).json(serviceResp);
            }

            // res.json(serviceResp);
            // res.json('ok');

        } else {
            res.status(config.BAD_REQUEST).json({
                status: 'failed',
                message: "Validation Error",
                errors
            });
        }
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Please Pass type in body",
        });
    }
});


/**
 * @api {post} /app/car/check-delivery-radius Check car delivery radius
 * @apiName Check car delivery radius
 * @apiDescription Check car will be deliver or not on given location by user when book particular car
 * @apiGroup App - Car
 * 
 * @apiParam {Number} car_rental_company_id company id whose car is booking
 * @apiParam {Number} latitude latitude
 * @apiParam {Number} longitude longitude
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

//Check Delivery Radius car will book if it lies in companies radius
router.post('/check-delivery-radius', async (req, res) => {

    var schema = {
        'car_rental_company_id': {
            notEmpty: true,
            errorMessage: "Please enter car company id",
        },
        'latitude': {
            notEmpty: true,
            errorMessage: "Please enter latitude",
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Please enter longitude",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();

    if (!errors) {
        let data = {
            company_id: req.body.car_rental_company_id,
            latitude: req.body.latitude,
            longitude: req.body.longitude
        }
        let radiusResp = await carHelper.checkRadius(data); // location wise
        if (radiusResp.status === 'success') {
            res.status(config.OK_STATUS).json(radiusResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(radiusResp);
        }
        // res.json(radiusResp);
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


/**
 * @api {post} /app/car/check-delivery-radius-v2 Check car delivery radius
 * @apiName Check car delivery radius
 * @apiDescription Check car will be deliver or not on given location by user when book particular car
 * @apiGroup App - Car
 * 
 * @apiParam {Number} car_rental_company_id company id whose car is booking
 * @apiParam {Number} latitude latitude
 * @apiParam {Number} longitude longitude
 * @apiParam {String} city city name (full name)
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */


//Check Delivery Radius v2 car will book if it lies in companies radius
router.post('/check-delivery-radius-v2', async (req, res) => {

    var schema = {
        'car_rental_company_id': {
            notEmpty: true,
            errorMessage: "Please enter car company id",
        },
        'latitude': {
            notEmpty: true,
            errorMessage: "Please enter latitude",
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Please enter longitude",
        },
        'city': {
            notEmpty: true,
            errorMessage: "Please enter city",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();

    if (!errors) {
        let data = {
            company_id: req.body.car_rental_company_id,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            city: (req.body.city).toLowerCase()
        }
        // let radiusResp = await carHelper.checkRadius(data); // location wise
        let radiusResp = await carHelper.checkRadius_v2(data); // city wise

        if (radiusResp.status === 'success') {
            res.status(config.OK_STATUS).json(radiusResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(radiusResp);
        }
        // res.json(radiusResp);
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});






// Test v2 of car filter

router.post('/location-filter', async (req, res) => {
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
                $lookup: {
                    from: 'car_company',
                    foreignField: '_id',
                    localField: 'car_rental_company_id',
                    as: "companyDetails",
                }
            },
            {
                $unwind: {
                    "path": "$companyDetails",
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
                    is_available: 1,
                    car_model_id: 1,
                    car_brand_id: 1,
                    isDeleted: 1,
                    image_name: "$car_gallery.name" ? { $arrayElemAt: ["$car_gallery.name", 0] } : null,
                    // trip_status: "$carBookingDetails.trip_status", now
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
                    },
                    service_location: "$companyDetails.service_location" //companyDetails
                }
            },
            {
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
        if (typeof req.body.navigation !== 'undefined') {
            if (req.body.navigation === false) {
                let navigationOject = req.body.navigation;
                console.log('NAVIGATION 1======>', navigationOject);
                var searchQuery = {
                    "$match": {
                        "is_navigation": navigationOject,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);
            } else {
                console.log('NAVIGATION 2======>', req.body.navigation);
                var searchQuery = {
                    "$match": {
                        "is_navigation": true,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);
            }
        }
        else {
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

        // filter using lat - long

        if (req.body.location) { // pass like location : [long,lat]
            console.log('DATATATAT==>', req.body.location)
            var location = req.body.location;
            console.log('DATATATAT TYPE ==>', typeof req.body.location)
            var searchQuery = {
                $match: {
                    "companyDetails.service_location":  // 124.274 -> 200 km // 0.621371 -> 1 km
                        // { $geoWithin: { $centerSphere: [[72.831062, 21.17024], 124.274 / 3963.2] } }  
                        { $geoWithin: { $centerSphere: [location, 124.274 / 3963.2] } }
                }
            }
            defaultQuery.splice(9, 0, searchQuery);
        }

        // sorting
        if (typeof req.body.sort_by !== 'undefined') {
            let sort_by = parseInt(req.body.sort_by);
            if (sort_by === 0) {
                var searchQuery = {
                    $sort: {
                        'total_avg_rating': -1
                    }
                }
            }
            if (sort_by === 1) {
                var searchQuery = {
                    $sort: {
                        'car.rent_price': -1
                    }
                }
            }
            if (sort_by === 2) {
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
                    message: "No Cars Available",
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
                    res.status(config.BAD_REQUEST).json({
                        status: "failed",
                        message: "No Cars Available"
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


// Car filter v3 lat & long is required
router.post('/filter123', async (req, res) => {
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
        },
        'latitude': {
            notEmpty: true,
            errorMessage: "Specify your latitude"
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Specify your longitude"
        },
        'resident_type': {
            notEmpty: true,
            errorMessage: "Are you resident ..? (eg 0 or 1)"
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
                $lookup: {
                    from: 'car_company',
                    foreignField: '_id',
                    localField: 'car_rental_company_id',
                    as: "companyDetails",
                }
            },
            {
                $unwind: {
                    "path": "$companyDetails",
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
                    is_available: 1,
                    car_model_id: 1,
                    car_brand_id: 1,
                    isDeleted: 1,
                    resident_criteria: 1,
                    image_name: "$car_gallery.name" ? { $arrayElemAt: ["$car_gallery.name", 0] } : null,
                    // trip_status: "$carBookingDetails.trip_status", //now
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
                    },
                    service_location: "$companyDetails.service_location" //companyDetails
                }
            },
            // {
            //     $match: {
            // $and: [
            //     {
            //         $or: [
            //             { car_book_from_date: { $gt: toDate } },
            //             { car_book_to_date: { $lt: fromDate } },
            //             { car_book_from_date: { $eq: null } }
            //         ]
            //     },
            //     { isDeleted: false }
            // ]
            //     }
            // },
            {
                $match: {
                    $and: [

                        {
                            $or: [
                                { car_book_from_date: { $gt: toDate } },
                                { car_book_to_date: { $lt: fromDate } },
                                { car_book_from_date: { $eq: null } },
                                // { 'trip_status': { $ne: 'cancelled' } }, // add later                                
                                // { 'carBookingDetails.trip_status': { $eq: 'upcoming' } }, // add later                                
                            ]
                        },

                        {
                            // "service_location": { $geoWithin: { $centerSphere: [req.body.location, 124.274 / 3963.2] } }
                            //62.1371 = 100km
                            "service_location": { $geoWithin: { $centerSphere: [[req.body.longitude, req.body.latitude], 62.1371 / 3963.2] } }
                        },
                        {
                            $or: [
                                { "resident_criteria": { $eq: req.body.resident_type } },
                                { "resident_criteria": { $eq: 2 } }
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

        if (typeof req.body.navigation !== 'undefined') {

            if (req.body.navigation === false) {
                let navigationOject = req.body.navigation;
                console.log('NAVIGATION 1======>', navigationOject);
                var searchQuery = {
                    "$match": {
                        "is_navigation": navigationOject,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);
            } else {
                console.log('NAVIGATION 2======>', req.body.navigation);
                var searchQuery = {
                    "$match": {
                        "is_navigation": true,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);
            }
        }
        // else {
        //     var searchQuery = {
        //         "$match": {
        //             "is_navigation": true,
        //         }
        //     }
        //     defaultQuery.splice(3, 0, searchQuery);
        // }

        if (req.body.transmission) {

            let transmissionObject = req.body.transmission;
            console.log('Transmission => ', transmissionObject)
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
        }
        // else {
        //     var searchQuery = {
        //         "$match": {
        //             "milage": "open",
        //         }
        //     }
        //     defaultQuery.splice(3, 0, searchQuery);
        // }

        // filter using lat - long


        /*
        if (req.body.location !== undefined) { // pass location like : [long,lat] & distance must be in (miles / 3963.2)
            console.log('DATATATAT==>', req.body.location)
            var location = req.body.location;
            var searchQuery = {
                $match: {
                    "car.service_location":  // 124.274 -> 200 km // 0.621371 -> 1 km
                // { $geoWithin: { $centerSphere: [[72.831062, 21.17024], 124.274 / 3963.2] } }  
                    { $geoWithin: { $centerSphere: [location, 124.274 / 3963.2] } }
                }
            }
            defaultQuery.splice(9, 0, searchQuery);
        }
        if(req.body.resident_type !== undefined){
            console.log('RESident ->', req.body.resident_type);
            var searchQuery = {
                $match: {
                  $or : [
                      {"resident_criteria" : { $eq : req.body.resident_type } },
                      {"resident_criteria" : { $eq : 2 } }
                  ]
                }
            }
            defaultQuery.splice(9, 0, searchQuery);
        }
        */


        // sorting
        if (typeof req.body.sort_by !== 'undefined') {
            let sort_by = parseInt(req.body.sort_by);
            if (sort_by === 0) {
                var searchQuery = {
                    $sort: {
                        'total_avg_rating': -1
                    }
                }
            }
            if (sort_by === 1) {
                var searchQuery = {
                    $sort: {
                        'car.rent_price': -1
                    }
                }
            }
            if (sort_by === 2) {
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
                    message: "No Cars Available",
                    err
                });
            } else {
                // console.log(data);
                // var data = data.length != 0 ? data[0] : {total: 0, data: []}

                if (data && data.length > 0) {
                    cars = data.map((c) => {
                        c.car["total_avg_rating"] = c.total_avg_rating;
                        if (c.car["service_location"] === undefined) {
                            c.car["service_location"] = null
                        }
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
                    res.status(config.BAD_REQUEST).json({
                        status: "failed",
                        message: "No Cars Available"
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


// car report list

/**
 * @api {post} /app/car/report-list Car report list
 * @apiName Car report list
 * @apiDescription Used to get Car report list
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
router.post('/report-list', async (req, res) => {

    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const carReportResp = await carHelper.car_report_list(req.body.user_id);
        if (carReportResp.status === 'success') {
            res.status(config.OK_STATUS).json(carReportResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(carReportResp);
        }
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
    // res.json(carHistoryResp);
});




// Report a car
/**
 * @api {post} /app/car/report Report a car
 * @apiName Report a car
 * @apiDescription Used to Report a car
 * @apiGroup App - Car
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} user_id user Id
 * @apiParam {String} car_id car Id
 * @apiParam {String} car_rental_company_id company Id
 * @apiParam {Number} booking_number car booking number
 * @apiParam {Boolean} report_type (car report category id)
 * @apiParam {String} report_message Car reporting message
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/report', async (req, res) => {

    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id",
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id",
        },
        'car_rental_company_id': {
            notEmpty: true,
            errorMessage: "Please enter company id",
        },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number",
        },
        'report_type': {
            notEmpty: true,
            errorMessage: "Please enter car report category id",
        },
        'report_message': {
            notEmpty: true,
            errorMessage: "Please enter car report message",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var data = {
            user_id: req.body.user_id,
            car_id: req.body.car_id,
            car_rental_company_id: req.body.car_rental_company_id,
            booking_number: req.body.booking_number,
            report_type: req.body.report_type,
            report_message: req.body.report_message
        }

        var carReportResp = await carHelper.car_report(data);
        if (carReportResp.status === 'success') {
            // res.status(config.OK_STATUS).json(carReportResp);

            res.status(config.OK_STATUS).json(carReportResp);

            // send email to user & super admin

            var carData = await carHelper.getcarDetailbyId(ObjectId(req.body.car_id));
            var bookingData = await CarBooking.findOne({ "booking_number": req.body.booking_number });
            console.log("Car DATA=>", carData);
            var userData = await Users.findOne({ "_id": ObjectId(req.body.user_id) });
            var superAdminData = await Users.findOne({ "type": "admin", isDeleted: false });


            // user
            var options_user = {
                to: userData.email,
                // to: "dm@narola.email",
                subject: 'ABHR - Car Report Notification'
            }

            var data_user = {
                name: userData.first_name,
                // message: `You report for ${carData.data.carDetail.car_brand} ${carData.data.carDetail.car_modal} has been submitted successfully.`,
                message: 'You report for ' + '\"' + carData.data.carDetail.car_brand + ' ' + carData.data.carDetail.car_model + ', ' + carData.data.carDetail.car_model_release_year + '\"' + ' has been submitted successfully.',
                report_message: req.body.report_message
            };

            /** send email to user **/
            await mail_helper.send('car_report', options_user, data_user, function (err, res) {
                if (err) {
                    console.log("Error when send to user:", err);
                } else {
                    console.log(`Sent mail to user (${userData.email}) 1:`, res);
                }
            })

            if (superAdminData && superAdminData !== null) {

                // super admin
                var options_super_admin = {
                    to: superAdminData.email,
                    // to: "dm@narola.email",
                    subject: 'ABHR - Car Report Notification'
                }


                var data1 = JSON.parse(JSON.stringify(bookingData));
                // console.log('DATAT 1=>',data1);
                // console.log('DATAT 2=>',bookingData);

                // console.log("TEST=======================>",carData.data.carDetail.rent_price);

                data1.rent_price = carData.data.carDetail.rent_price;

                data1.no_of_person = carData.data.carDetail.no_of_person;
                data1.transmission = carData.data.carDetail.transmission === 'manual' ? 'M' : 'A';

                data1.milage = carData.data.carDetail.milage;
                data1.car_class = carData.data.carDetail.car_class;

                data1.driving_eligibility_criteria = carData.data.carDetail.driving_eligibility_criteria;

                data1.car_brand = carData.data.carDetail.car_brand;
                data1.car_model = carData.data.carDetail.car_model;
                data1.car_model_number = carData.data.carDetail.car_model_number;
                data1.car_model_release_year = carData.data.carDetail.car_model_release_year;
                data1.age_of_car = carData.data.carDetail.age_of_car;
                data1.image_name = carData.data.carDetail.image_name;
                data1.user_name = userData.first_name;
                data1.super_admin_name = superAdminData.first_name;
                data1.user_phone_number = '+' + userData.country_code + ' ' + userData.phone_number
                data1.user_email = userData.email
                data1.daily_rate = bookingData.booking_rent
                data1.total = bookingData.booking_rent * bookingData.days
                data1.vat = bookingData.vat
                data1.final_total = ((bookingData.booking_rent * bookingData.days) + ((bookingData.booking_rent * bookingData.days * bookingData.vat) / 100))

                data1.fromDate = moment(data1.from_time).format("MMM-DD-YYYY");
                data1.toDate = moment(data1.to_time).format("MMM-DD-YYYY");


                let mail_resp1 = await mail_helper.sendEmail_carBook("car_report_super_admin", options_super_admin, data1);
                console.log("Mail sending response 2", mail_resp1);

            }

            // var data_superAdmin = {
            //     name: superAdminData.first_name,
            //     message: `You got report for ${carData.data.carDetail.car_brand} ${carData.data.carDetail.car_modal}.`,
            //     report_message: req.body.report_message
            // };



            /** send email to super admin **/
            // await mail_helper.send('car_report', options_superAdmin, data_superAdmin, function (err, res) {
            //     if (err) {
            //         console.log("Error when send to super admin:", err);
            //     } else {
            //         console.log(`Sent mail to super admin (${superAdminData.email}):`, res);;
            //     }
            // })


            // over email

        }
        else {
            res.status(config.BAD_REQUEST).json(carReportResp);
        }
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
    // res.json(carHistoryResp);
});



// report status
router.post('/report-status', async (req, res) => {

    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id",
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id",
        },
        'report_type': { // report category id
            notEmpty: true,
            errorMessage: "Please enter car report category id",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const condition = {
            user_id: req.body.user_id,
            car_id: req.body.car_id,
            report_type: req.body.report_type
        }

        var report = await CarReport.find(condition).lean().exec();

        if (report && report.length > 0) {
            if(report[0].status === 'pending'){
                res.status(config.BAD_REQUEST).json({ status: "failed", message: "You already reported this issues, we will get back to you soon!"});
            }
            else if(report[0].status === 'resolved'){
                res.status(config.BAD_REQUEST).json({ status: "failed", message: "Reported issues resolved, please check your email"});
            }
        }
        else{
            res.status(config.OK_STATUS).json({status : "success" , "message" : "You have not reported any car." } )
        }
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});










// car report category list
/**
 * @api {get} /app/car/report-category-list Car report category list
 * @apiName Car report category list
 * @apiDescription Used to get car report category list
 * @apiGroup App - Car
 * @apiVersion 0.0.0
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/report-category-list', async (req, res) => {
    try {
        const categoryData = await ReportCategory.find({ isDeleted: false }).lean().exec();
        if (categoryData && categoryData.length > 0) {
            res.status(config.OK_STATUS).json({ status: "success", message: "Report category list has been found", data: { category: categoryData } });
        }
        else {
            res.status(config.BAD_REQUEST).json({ status: "failed", message: "Report category list has not been found" });
        }
    } catch (err) {
        res.status(config.BAD_REQUEST).json({ status: "failed", message: "Error accured while fetching report category list", err });
    }
});



// Re - send invoice via email to customer
/**
 * @api {post} /app/car/resend-invoice Sending invoice to customer via email
 * @apiName Send Invoice
 * @apiDescription Used to send invoice to customer via email
 * @apiGroup App - Car
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} booking_number car booking number
 * @apiParam {String} email user / customer Email
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/resend-invoice', async (req, res) => {
    var schema = {
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number",
        },
        'email': {
            notEmpty: true,
            errorMessage: "Please enter email",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var booking_number = req.body.booking_number;
        var email = req.body.email;

        const resendInvoiceResp = await carHelper.resend_invoice(booking_number, email);
        if (resendInvoiceResp.status === 'success') {
            res.status(config.OK_STATUS).json(resendInvoiceResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(resendInvoiceResp);
        }
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }


});


// test notification route for android

router.post('/test-not-android', async (req, res) => {
    var schema = {
        'device_token': {
            notEmpty: true,
            errorMessage: "Please enter device token",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        console.log('D T=>', req.body.device_token);
        var sendNotification = await pushNotificationHelper.sendToAndroid(req.body.device_token);
        console.log('jdkjksjsdjsj=>', sendNotification);
        // res.send('ok')
        if (sendNotification.status === 'success') {
            console.log('Success==>', sendNotification)
            res.status(config.OK_STATUS).json(sendNotification);
        }
        else {
            console.log('failure', sendNotification)
            res.status(config.BAD_REQUEST).json(sendNotification);
        }
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

// test notification route for android

router.post('/test-not-androidsingle', async (req, res) => {
    var schema = {
        'device_token': {
            notEmpty: true,
            errorMessage: "Please enter device token",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        console.log('D T=>', req.body.device_token);
        var sendNotification = await pushNotificationHelper.sendToAndroidUser(req.body.device_token, 1234, 'Your car has been booked');
        console.log('jdkjksjsdjsj=>', sendNotification);
        // res.send('ok')
        if (sendNotification.status === 'success') {
            console.log('Success==>', sendNotification)
            res.status(config.OK_STATUS).json(sendNotification);
        }
        else {
            console.log('failure', sendNotification)
            res.status(config.BAD_REQUEST).json(sendNotification);
        }
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

// test notification route for IOS
router.post('/test-not-ios', async (req, res) => {
    var schema = {
        'device_token': {
            notEmpty: true,
            errorMessage: "Please enter device token",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        console.log('D T=>', req.body.device_token);
        var sendNotification = await pushNotificationHelper.sendToIOS(req.body.device_token, 10, 1);
        console.log('Response =>', sendNotification);
        // res.send('ok')
        if (sendNotification.status === 'success') {
            console.log('Success==>', sendNotification)
            res.status(config.OK_STATUS).json(sendNotification);
        }
        else {
            console.log('failure', sendNotification)
            res.status(config.BAD_REQUEST).json(sendNotification);
        }
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


// car filter v4
router.post('/filter-v4', async (req, res) => {
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
        },
        'latitude': {
            notEmpty: true,
            errorMessage: "Specify your latitude"
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Specify your longitude"
        },
        'resident_type': {
            notEmpty: true,
            errorMessage: "Are you resident ..? (eg 0 or 1)"
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
                "$lookup": {
                    "from": "car_model",
                    "foreignField": "_id",
                    "localField": "car_model_id",
                    "as": "modelDetails"
                }
            },
            {
                "$unwind": {
                    "path": "$modelDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$lookup": {
                    "from": "car_brand",
                    "foreignField": "_id",
                    "localField": "car_brand_id",
                    "as": "brandDetails"
                }
            },
            {
                "$unwind": {
                    "path": "$brandDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$lookup": {
                    "from": "car_company",
                    "foreignField": "_id",
                    "localField": "car_rental_company_id",
                    "as": "companyDetails"
                }
            },
            {
                "$unwind": {
                    "path": "$companyDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$lookup": {
                    "from": "car_reviews",
                    "localField": "_id",
                    "foreignField": "car_id",
                    "as": "reviews"
                }
            },
            {
                "$lookup": {
                    "from": "car_booking",
                    "foreignField": "carId",
                    "localField": "_id",
                    "as": "carBookingDetails"
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "is_available": 1,
                    "car_rental_company_id": 1,
                    "car_brand": "$brandDetails.brand_name",
                    "car_model": "$modelDetails.model_name",
                    "car_model_number": "$modelDetails.model_number",
                    "car_model_release_year": "$modelDetails.release_year",
                    "car_color": 1,
                    "rent_price": 1,
                    "is_AC": 1,
                    "is_luggage_carrier": 1,
                    "licence_plate": 1,
                    "no_of_person": 1,
                    "transmission": 1,
                    "is_delieverd": 1,
                    "milage": 1,
                    "is_navigation": 1,
                    "driving_eligibility_criteria": 1,
                    "car_class": 1,
                    "is_avialable": 1,
                    "car_model_id": 1,
                    "car_brand_id": 1,
                    "isDeleted": 1,
                    "resident_criteria": 1,
                    "image_name": {
                        "$arrayElemAt": [
                            "$car_gallery.name",
                            0
                        ]
                    },
                    "totalBooking": { $size: "$carBookingDetails" },
                    "booking": "$carBookingDetails",
                    "service_location": "$companyDetails.service_location",
                    "reviews": 1
                }
            },
            {
                "$unwind": {
                    "path": "$booking",
                    "preserveNullAndEmptyArrays": true
                }
            },

            {
                "$match": {
                    $and: [
                        {
                            $or: [
                                {
                                    "booking.from_time": {
                                        $gt: new Date(toDate)

                                    }
                                },
                                {
                                    "booking.to_time": {
                                        $lt: new Date(fromDate)
                                    }
                                },
                                { "booking.trip_status": "cancelled" }, // add now
                                { "booking.trip_status": "finished" }, // add now
                                { "booking": null },
                            ]
                        },
                        {
                            "isDeleted": false
                        }
                    ]
                }
            },

            {
                "$group": {
                    "_id": "$_id",
                    "data": { $first: "$$ROOT" },
                    "availableBooking": { $push: "$booking.booking_number" }
                }
            },
            {
                "$match": {
                    "$and": [
                        {
                            "data.service_location": {
                                "$geoWithin": {
                                    "$centerSphere": [[req.body.longitude, req.body.latitude], 62.1371 / 3963.2]
                                }
                            }
                        },
                        {
                            "$or": [
                                {
                                    "data.resident_criteria": {
                                        "$eq": req.body.resident_type
                                    }
                                },
                                {
                                    "data.resident_criteria": {
                                        "$eq": 2
                                    }
                                }
                            ]
                        },
                        {
                            "data.isDeleted": false
                        }
                    ]
                }
            },
            {
                "$unwind": {
                    "path": "$data.reviews",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$group": {
                    "_id": "$_id",
                    "total_avg_rating": {
                        "$avg": "$data.reviews.stars"
                    },
                    "car": {
                        "$first": "$data"
                    },
                    "availableBooking": { "$first": "$availableBooking" }
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

        if (typeof req.body.navigation !== 'undefined') {

            if (req.body.navigation === false) {
                let navigationOject = req.body.navigation;
                console.log('NAVIGATION 1======>', navigationOject);
                var searchQuery = {
                    "$match": {
                        "is_navigation": navigationOject,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);

            } else {
                console.log('NAVIGATION 2======>', req.body.navigation);
                var searchQuery = {
                    "$match": {
                        "is_navigation": true,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);

            }
        }
        // else {
        //     var searchQuery = {
        //         "$match": {
        //             "is_navigation": true,
        //         }
        //     }
        //     defaultQuery.splice(3, 0, searchQuery);
        // }

        if (req.body.transmission) {

            let transmissionObject = req.body.transmission;
            console.log('Transmission => ', transmissionObject)
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

        }
        // else {
        //     var searchQuery = {
        //         "$match": {
        //             "milage": "open",
        //         }
        //     }
        //     defaultQuery.splice(3, 0, searchQuery);
        // }

        // filter using lat - long


        /*
        if (req.body.location !== undefined) { // pass location like : [long,lat] & distance must be in (miles / 3963.2)
            console.log('DATATATAT==>', req.body.location)
            var location = req.body.location;
            var searchQuery = {
                $match: {
                    "car.service_location":  // 124.274 -> 200 km // 0.621371 -> 1 km
                // { $geoWithin: { $centerSphere: [[72.831062, 21.17024], 124.274 / 3963.2] } }  
                    { $geoWithin: { $centerSphere: [location, 124.274 / 3963.2] } }
                }
            }
            defaultQuery.splice(9, 0, searchQuery);
        }
        if(req.body.resident_type !== undefined){
            console.log('RESident ->', req.body.resident_type);
            var searchQuery = {
                $match: {
                  $or : [
                      {"resident_criteria" : { $eq : req.body.resident_type } },
                      {"resident_criteria" : { $eq : 2 } }
                  ]
                }
            }
            defaultQuery.splice(9, 0, searchQuery);
        }
        */


        // sorting
        if (typeof req.body.sort_by !== 'undefined') {
            let sort_by = parseInt(req.body.sort_by);
            if (sort_by === 0) {
                var searchQuery = {
                    $sort: {
                        'total_avg_rating': -1
                    }
                }
            }
            if (sort_by === 1) {
                var searchQuery = {
                    $sort: {
                        'car.rent_price': -1
                    }
                }
            }
            if (sort_by === 2) {
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
                    message: "No Cars Available",
                    err
                });
            } else {
                // console.log("DATATA===>", data);

                // res.json('ok');

                if (data && data.length > 0) {
                    var finalDaata = data.filter((c) => {
                        if (c.car['totalBooking'] === c['availableBooking'].length) {

                            if (c.car["service_location"] === undefined) {
                                c.car["service_location"] = null
                            }

                            c.car['total_avg_rating'] = c['total_avg_rating'];
                            c.car['availableBooking'] = c['availableBooking'];

                            delete c.car['reviews'];
                            delete c.car['booking'];

                            return true;
                        }
                    });

                    finalDaata = finalDaata.map((d) => { return d.car })

                    console.log("DM Data =>", finalDaata);

                    res.status(config.OK_STATUS).json({
                        status: "success",
                        message: "car data found",
                        data: { cars: finalDaata }
                    });
                }
                else {
                    res.status(config.BAD_REQUEST).json({
                        status: "failed",
                        message: "No Cars Available"
                    });
                }









                /*

                if (data && data.length > 0) {
                    cars = data.map((c) => {
                        c.car["total_avg_rating"] = c.total_avg_rating;
                        if (c.car["service_location"] === undefined) {
                            c.car["service_location"] = null
                        }
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
                    res.status(config.BAD_REQUEST).json({
                        status: "failed",
                        message: "No Cars Available"
                    });
                }

                */
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


// Send Notification form user to agent app when user click in return button in user app
router.post('/return-request', async (req, res) => {
    var schema = {
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var booking_number = req.body.booking_number;

        const updateStatusResp = await CarBooking.updateOne({ 'booking_number': booking_number }, { $set: { 'trip_status': 'return' } });
        if (updateStatusResp && updateStatusResp.n > 0) {
            // send notification to all agent
            res.status(config.OK_STATUS).json({ status: 'success', message: "Your request for return car has been placed successfully" });


            var bookData = await CarBooking.findOne({"booking_number" : req.body.booking_number}).lean().exec()
            var userDeviceToken = await Users.find({ '_id': new ObjectId(bookData.userId) }, { _id: 1, deviceToken: 1, phone_number: 1, country_code: 1, deviceType: 1, email: 1, first_name: 1 }).lean().exec();

            var agentList = await Users.find({ 'type': 'agent', 'isDeleted': false }, { _id: 1, deviceToken: 1, phone_number: 1 }).lean().exec();

            var agentDeviceTokenArray = [];
            var agent_data_array = [];
            var notificationFor = "return-process";
            // var msg = "Assign car to you for return process";
            var msg = userDeviceToken[0].first_name + " has issued a return request";

            agentList.map((agent, index) => {
                if (agent.deviceToken !== undefined) {
                    if (agent.deviceToken !== null) {
                        if (agent.deviceToken.length > 10) { // temp condition
                            agentDeviceTokenArray.push(agent.deviceToken);

                            agent_data_array.push({
                                "userId": agent._id,
                                "deviceToken": agent.deviceToken,
                                "deviceType": 'android',
                                "notificationText": msg,
                                "notificationType": 1,
                                "booking_number": booking_number
                            })

                        }
                    }
                }
            });

            var sendNotification = await pushNotificationHelper.sendToAndroid(agentDeviceTokenArray, booking_number, notificationFor, msg);

            var saveNotiResp = await pushNotificationHelper.save_multiple_notification_to_db(agent_data_array);

            // console.log('Not Status =>', sendNotification);

            /*
            if (sendNotification.status === 'success') {
                console.log('Notification send Success==>')
                // res.status(config.OK_STATUS).json(sendNotification);
                res.status(config.OK_STATUS).json({ status: 'success', message: "Your request for return car has been placed successfully" });
            }
            else {
                console.log('Notification not send failure', sendNotification)
                // res.status(config.BAD_REQUEST).json(sendNotification);
                // res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Your request for return car has not been placed" });
                res.status(config.OK_STATUS).json({ status: 'success', message: "Your request for return car has been placed successfully" });
            }
            */
        }
        else {
            res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Your request for return car has not been placed" })
        }
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }

});



// Get car booking details form booking number

router.post('/booking-details-ios', async (req, res) => {
    var schema = {
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking id to view details"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        // req.body.booking_number

        var phone_no = await Users.findOne({ type: 'admin', isDeleted: false }, { _id: 0, support_phone_number: 1 }).lean().exec();
        var support_phone_number = phone_no != null ? phone_no.support_phone_number : '9876543210';

        var defaultQuery = [
            {
                $match: {
                    "booking_number": { $eq: req.body.booking_number }
                }
            },
            {
                $lookup: {
                    from: 'cars',
                    localField: 'carId',
                    foreignField: '_id',
                    as: 'car_details'
                }
            },
            {
                $unwind: {
                    "path": "$car_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_model',
                    foreignField: '_id',
                    localField: 'car_details.car_model_id',
                    as: 'model_details'
                }
            },
            {
                $unwind: {
                    "path": "$model_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_brand',
                    foreignField: '_id',
                    localField: 'car_details.car_brand_id',
                    as: 'brand_details'
                }
            },
            {
                $unwind: {
                    "path": "$brand_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_company',
                    localField: 'car_details.car_rental_company_id',
                    foreignField: '_id',
                    as: 'companyDetails'
                }
            },
            {
                $unwind: {
                    "path": "$companyDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_company_terms_and_condition',
                    localField: 'car_details.car_rental_company_id',
                    foreignField: 'CompanyId',
                    as: 'car_company_terms_and_condition_Details'
                }
            },
            {
                $unwind: {
                    "path": "$car_company_terms_and_condition_Details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $addFields: {
                    "car_details.car_brand": "$brand_details.brand_name",
                    "car_details.car_model": "$model_details.model_name",
                    "car_details.car_model_number": "$model_details.model_number",
                    "car_details.car_model_release_year": "$model_details.release_year",
                    "car_details.terms_and_conditions": "$car_company_terms_and_condition_Details.terms_and_conditions",
                    "car_details.cancellation_policy": "$car_company_terms_and_condition_Details.cancellation_policy_criteria",
                    // "phone_number": "$companyDetails.phone_number"
                    "phone_number": support_phone_number
                }
            }
        ];
        console.log('Default Query========>', JSON.stringify(defaultQuery));

        CarBooking.aggregate(defaultQuery, function (err, data) {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "error in accured while fetching booking car details by booking number",
                    err
                });
            } else {
                if (data && data.length > 0) {

                    var currentDate = moment().toDate().toISOString(Date.now());

                    if (moment(currentDate) >= moment(data[0].from_time)) {
                        data[0].call_or_not = 'yes' // place manual call
                    }
                    else {
                        data[0].call_or_not = 'no' // not call 
                    }

                    if (data[0].vat === undefined) {
                        data[0].vat = null
                    }

                    res.status(config.OK_STATUS).json({
                        status: "success",
                        message: "Car booking details has been found",
                        data: { booking_details: data },
                    });
                }
                else {
                    res.status(config.BAD_REQUEST).json({
                        status: "failed",
                        message: "No car booking details found"
                    });
                }
            }
        });
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }

});



// calculate cancellation charge
router.post('/calculate-cancellation-charge', async (req, res) => {
    var schema = {
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking id to view details"
        },
        'cancel_date': {
            notEmpty: true,
            errorMessage: "Please enter cancel date",
            isISO8601: {
                value: true,
                errorMessage: "Please enter valid data. Format should be yyyy-mm-dd"
            }
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var default_query = [
            {
                $match: { "booking_number": { $eq: req.body.booking_number } }
            },
            {
                $lookup: {
                    from: 'cars',
                    foreignField: '_id',
                    localField: 'carId',
                    as: 'car_details'
                }
            },
            {
                $unwind: {
                    "path": "$car_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_company_terms_and_condition',
                    foreignField: 'CompanyId',
                    localField: 'car_details.car_rental_company_id',
                    as: 'car_company_terms_and_condition_details'
                }
            },
            {
                $unwind: {
                    "path": "$car_company_terms_and_condition_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $project: {
                    "total_booking_amount": 1,
                    "carId": 1,
                    "userId": 1,
                    "from_time": {
                        $dateToString: {
                            date: "$from_time",
                            format: "%Y-%m-%d"
                        }
                    },
                    "to_time": {
                        $dateToString: {
                            date: "$to_time",
                            format: "%Y-%m-%d"
                        }
                    },
                    "booking_rent": 1,
                    "days": 1,
                    "booking_number": 1,
                    "companyId": "$car_company_terms_and_condition_details.CompanyId",
                    "cancellation_policy_criteria": "$car_company_terms_and_condition_details.cancellation_policy_criteria"
                }
            }
        ];

        var cancelletion_rates = await CarBooking.aggregate(default_query);

        console.log('DATA==>', cancelletion_rates);

        var total_booking_amount = cancelletion_rates[0].total_booking_amount;
        var booking_rate = cancelletion_rates[0].booking_rent;
        var no_of_days = cancelletion_rates[0].days;

        var cancel_date = new Date(req.body.cancel_date);
        var cnl_date = cancel_date.toISOString();

        // hours diff

        var Db_from_date = moment(cancelletion_rates[0].from_time); // db date 
        var Cancel_date1 = moment(cnl_date); // user paasing date


        console.log('Db_from_date =>', Db_from_date)
        console.log('Cancel_date1 =>', Cancel_date1)

        var diff_hours = Db_from_date.diff(Cancel_date1, 'hours');
        // var diff_hours = 12;
        var cancel_charge;
        var amount_return_to_user;

        console.log('Hours Diffrence : ', diff_hours);

        var cancellation_rates_list = cancelletion_rates[0].cancellation_policy_criteria;

        console.log('Cancel rate list=>', cancellation_rates_list);

        var final_rate_percentage = null;
        var flagGot = false;
        if (cancellation_rates_list.length > 0) {
            cancellation_rates_list.forEach(rate => {
                if (rate.hours >= diff_hours && !flagGot) {
                    flagGot = true;
                    final_rate_percentage = rate.rate;
                }
            });
        }

        console.log("final_rate_percentage", final_rate_percentage);

        if (final_rate_percentage !== null) {

            cancel_charge = (total_booking_amount * final_rate_percentage) / 100;
            amount_return_to_user = total_booking_amount - cancel_charge;

            console.log('CANCAL CHARGE : ', cancel_charge);
            console.log('Amount return to user  : ', amount_return_to_user);
        }
        else {
            final_rate_percentage = null;
            cancel_charge = 0;
            amount_return_to_user = booking_rate * no_of_days;
            console.log('CANCAL CHARGE : ', cancel_charge);
            console.log('Amount return to user  : ', amount_return_to_user);
        }

        var final_data = {
            total_booking_amount: cancelletion_rates[0].total_booking_amount,
            cancel_date: req.body.cancel_date,
            cancellation_rate: final_rate_percentage,
            cancellation_charge: cancel_charge,
            amount_return_to_user: amount_return_to_user,
            need_to_pay_charges: final_rate_percentage === null ? 'no' : 'yes'
        }

        cancelletion_rates[0].charge_calculation = final_data;

        res.status(config.OK_STATUS).json({ "status": "success", "message": "Cancellation Charge has been calculated", data: cancelletion_rates[0] })
    }
    else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

// car filter v5 under development with calender
router.post('/filter-v5', async (req, res) => {
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
        },
        'latitude': {
            notEmpty: true,
            errorMessage: "Specify your latitude"
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Specify your longitude"
        },
        'resident_type': {
            notEmpty: true,
            errorMessage: "Are you resident ..? (eg 0 or 1)"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var fromDate = moment(req.body.fromDate).startOf('days');
        var toDate = moment(req.body.fromDate).add(req.body.days, 'days').startOf('days');


        var fromDateMonth = new Date(fromDate).getMonth() + 1;
        var toDateMonth = new Date(toDate).getMonth() + 1;

        // var fromDateMonth = fmonth > 9 ? fmonth : ("0" + fmonth);
        // var toDateMonth = tmonth > 9 ? tmonth : ("0" + tmonth);

        console.log("FromDate =>", fromDate);
        console.log("ToDate =>", toDate);
        console.log("FromDate Month =>", fromDateMonth);
        console.log("ToDate Month =>", toDateMonth);

        // console.log(fromDateMonth,toDateMonth);

        var defaultQuery = [
            {
                "$lookup": {
                    "from": "car_model",
                    "foreignField": "_id",
                    "localField": "car_model_id",
                    "as": "modelDetails"
                }
            },
            {
                "$unwind": {
                    "path": "$modelDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$lookup": {
                    "from": "car_brand",
                    "foreignField": "_id",
                    "localField": "car_brand_id",
                    "as": "brandDetails"
                }
            },
            {
                "$unwind": {
                    "path": "$brandDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$lookup": {
                    "from": "car_company",
                    "foreignField": "_id",
                    "localField": "car_rental_company_id",
                    "as": "companyDetails"
                }
            },
            {
                "$unwind": {
                    "path": "$companyDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$lookup": {
                    "from": "car_reviews",
                    "localField": "_id",
                    "foreignField": "car_id",
                    "as": "reviews"
                }
            },
            {
                "$lookup": {
                    "from": "car_booking",
                    "foreignField": "carId",
                    "localField": "_id",
                    "as": "carBookingDetails"
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "is_available": 1,
                    "car_rental_company_id": 1,
                    "car_brand": "$brandDetails.brand_name",
                    "car_model": "$modelDetails.model_name",
                    "car_model_number": "$modelDetails.model_number",
                    "car_model_release_year": "$modelDetails.release_year",
                    "car_color": 1,
                    "rent_price": 1,
                    "is_AC": 1,
                    "is_luggage_carrier": 1,
                    "licence_plate": 1,
                    "no_of_person": 1,
                    "transmission": 1,
                    "is_delieverd": 1,
                    "milage": 1,
                    "is_navigation": 1,
                    "driving_eligibility_criteria": 1,
                    "car_class": 1,
                    "is_avialable": 1,
                    "car_model_id": 1,
                    "car_brand_id": 1,
                    "isDeleted": 1,
                    "resident_criteria": 1,
                    "age_of_car": 1,
                    "image_name": {
                        "$arrayElemAt": [
                            "$car_gallery.name",
                            0
                        ]
                    },
                    "totalBooking": { $size: "$carBookingDetails" },
                    "booking": "$carBookingDetails",
                    "service_location": "$companyDetails.service_location",
                    "reviews": 1
                }
            },
            {
                "$unwind": {
                    "path": "$booking",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$match": {
                    $and: [
                        {
                            $or: [
                                {
                                    "booking.from_time": {
                                        $gt: new Date(toDate)

                                    }
                                },
                                {
                                    "booking.to_time": {
                                        $lt: new Date(fromDate)
                                    }
                                },
                                { "booking.trip_status": "cancelled" }, // add now
                                { "booking.trip_status": "finished" }, // add now
                                { "booking": null }
                            ]
                        },
                        {
                            "isDeleted": false,
                            // "is_available": { $ne: true } // & this remove now
                        }
                    ]
                }
            },
            {
                "$group": {
                    "_id": "$_id",
                    "data": { $first: "$$ROOT" },
                    "availableBooking": { $push: "$booking.booking_number" }
                }
            },
            {
                "$match": {
                    "$and": [
                        {
                            "data.service_location": {
                                "$geoWithin": {
                                    "$centerSphere": [[req.body.longitude, req.body.latitude], 62.1371 / 3963.2]
                                }
                            }
                        },
                        {
                            "$or": [
                                {
                                    "data.resident_criteria": {
                                        "$eq": req.body.resident_type
                                    }
                                },
                                {
                                    "data.resident_criteria": {
                                        "$eq": 2
                                    }
                                }
                            ]
                        },
                        {
                            "data.isDeleted": false
                        }
                    ]
                }
            },
            {
                "$unwind": {
                    "path": "$data.reviews",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$group": {
                    "_id": "$_id",
                    "total_avg_rating": {
                        "$avg": "$data.reviews.stars"
                    },
                    "car": {
                        "$first": "$data"
                    },
                    "availableBooking": { "$first": "$availableBooking" }
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

        if (typeof req.body.navigation !== 'undefined') {

            if (req.body.navigation === false) {
                let navigationOject = req.body.navigation;
                console.log('NAVIGATION 1======>', navigationOject);
                var searchQuery = {
                    "$match": {
                        "is_navigation": navigationOject,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);

            } else {
                console.log('NAVIGATION 2======>', req.body.navigation);
                var searchQuery = {
                    "$match": {
                        "is_navigation": true,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);

            }
        }

        if (req.body.transmission) {

            let transmissionObject = req.body.transmission;
            console.log('Transmission => ', transmissionObject)
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

        }

        // sorting
        if (typeof req.body.sort_by !== 'undefined') {
            let sort_by = parseInt(req.body.sort_by);
            if (sort_by === 0) {
                var searchQuery = {
                    $sort: {
                        'total_avg_rating': -1
                    }
                }
            }
            if (sort_by === 1) {
                var searchQuery = {
                    $sort: {
                        'car.rent_price': -1
                    }
                }
            }
            if (sort_by === 2) {
                var searchQuery = {
                    $sort: {
                        'car.rent_price': 1
                    }
                }
            }
            defaultQuery.push(searchQuery);
        }

        // console.log('Default Query========>', JSON.stringify(defaultQuery));

        Car.aggregate(defaultQuery, function (err, data) {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "No Cars Available",
                    err
                });
            } else {
                // console.log("DATATA===>", JSON.stringify(data));

                // res.json('ok');

                if (data && data.length > 0) {

                    var finalDaata = data.filter((c) => {
                        if (c.car['totalBooking'] === c['availableBooking'].length) {

                            if (c.car["service_location"] === undefined) {
                                c.car["service_location"] = null
                            }

                            c.car['total_avg_rating'] = c['total_avg_rating'];
                            c.car['availableBooking'] = c['availableBooking'];

                            delete c.car['reviews'];
                            delete c.car['booking'];

                            return true;
                        }
                    });

                    finalDaata = finalDaata.map((d) => { return d.car })
                    // console.log('cars list==>', finalDaata);

                    availableArray = [];
                    var okData = finalDaata.map((available, index) => {
                        if (available.is_available && available.is_available !== true) {
                            available.is_available.map((data, index) => {
                                var cnt = 0;
                                console.log('datamoth', data.month, 'frommonth==>', fromDateMonth, 'to month===.', toDateMonth);
                                if (data.month === fromDateMonth || data.month === toDateMonth) {
                                    data.availability.map((av, i) => {
                                        let date = moment(av).utc().startOf('days');
                                        if (moment(date).isBetween(fromDate, toDate, null, '[)')) {
                                            cnt++
                                        }
                                        // u can push match data in one array & return it
                                    });
                                    // console.log('cnt======>,', cnt, req.body.days);
                                    if (cnt >= req.body.days) {
                                        availableArray.push(available);
                                    }
                                }
                            });
                        }
                    })



                    if (availableArray.length > 0) {
                        res.status(config.OK_STATUS).json({
                            status: "success",
                            message: "car data found",
                            data: { cars: availableArray }
                            // data: { cars: finalDaata }
                        });
                    }
                    else {
                        res.status(config.BAD_REQUEST).json({
                            status: "failed",
                            message: "No Cars Available"
                        });
                    }
                }
                else {
                    res.status(config.BAD_REQUEST).json({
                        status: "failed",
                        message: "No Cars Available"
                    });
                }

                /*

                if (data && data.length > 0) {
                    cars = data.map((c) => {
                        c.car["total_avg_rating"] = c.total_avg_rating;
                        if (c.car["service_location"] === undefined) {
                            c.car["service_location"] = null
                        }
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
                    res.status(config.BAD_REQUEST).json({
                        status: "failed",
                        message: "No Cars Available"
                    });
                }

                */
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

//////////////////////////////////////


router.post('/book-v2', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter login user id",
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id which you are going to book",
        },
        'carCompanyId': {
            notEmpty: true,
            errorMessage: "Please enter car rental company id",
        },
        'vat': {
            notEmpty: true,
            errorMessage: "Please enter car vat rate",
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
        'delivery_time': {
            notEmpty: true,
            errorMessage: "Please enter delivery time",
        },
        'latitude': {
            notEmpty: true,
            errorMessage: "Please enter lattitude",
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Please enter longitude",
        },
        'total_booking_amount': {
            notEmpty: true,
            errorMessage: "Please enter total booking amount",
        },
        'deposite_amount': {
            notEmpty: true,
            errorMessage: "Please enter car deposite amount",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var toDate = moment(req.body.fromDate).add(req.body.days, 'days').format("YYYY-MM-DD");

        var fromDate = req.body.fromDate;
        console.log('From date =>', fromDate);
        console.log('To date =>', toDate);

        // check for already book or not first 

        // var carData = await Car.find({_id : ObjectId(req.body.car_id)},{is_available : 1}).lean().exec();

        var updateUserStatus = await Users.updateOne({ "_id": new ObjectId(req.body.user_id) }, { $set: { "app_user_status": "rented" } });

        var carData = await CarBooking.find(
            {

                // $match : {
                $and: [
                    { "carId": new ObjectId(req.body.car_id) },
                    { "from_time": { $lte: toDate } },
                    { "to_time": { $gte: fromDate } },
                    // { "trip_status": { $ne: 'cancelled' } },
                    { "trip_status": { $nin: ['cancelled', 'finished'] } },
                ]
            }
            // }

        )

        console.log('CAR DATA ->', carData);
        console.log('CAR DATA Len->', carData.length);

        if (carData && carData.length > 0) {
            // already book
            res.status(config.OK_STATUS).json({ status: "failed", message: "Opps this car has been already booked" });
        } else {

            var data = {
                "userId": req.body.user_id,
                "carId": req.body.car_id,
                "carCompanyId": req.body.carCompanyId, // add later on
                "vat": req.body.vat, // add later on
                "from_time": req.body.fromDate,
                "to_time": toDate, // auto calculation
                "days": req.body.days,
                "booking_rent": req.body.rent_per_day,
                "delivery_address": req.body.delivery_address, // add field in db as well,
                "delivery_time": req.body.delivery_time, // add field in db as well',
                "coupon_code": req.body.coupon_code ? req.body.coupon_code : null,
                "coupon_percentage": req.body.coupon_percentage ? req.body.coupon_percentage : null,
                "total_booking_amount": req.body.total_booking_amount, // add this field to db
                "latitude": req.body.latitude ? req.body.latitude : null, // add this field to db
                "longitude": req.body.longitude ? req.body.longitude : null, // add this field to db
                "trip_status": "upcoming",
                "transaction_status": "inprogress",
                "deposite_amount": req.body.deposite_amount
            }


            const bookingResp = await carHelper.carBook(data);

            if (bookingResp.status === 'success') {

                const deposit = await Car.findOne({ "_id": new ObjectId(req.body.car_id) });
                var car_booking_number = bookingResp.data.booking_data['booking_number'];

                console.log('Booking Id =>', bookingResp.data.booking_data['booking_number']);

                //start
                const carResp = await carHelper.getcarDetailbyId(new ObjectId(data.carId)); // resuable api
                console.log('Car Details 2 ==>', carResp);

                // console.log('Car Details 3 ==>', carResp.data.carDetail.no_of_person);

                var data1 = JSON.parse(JSON.stringify(bookingResp.data.booking_data));

                data1.rent_price = carResp.data.carDetail.rent_price;

                data1.no_of_person = carResp.data.carDetail.no_of_person;
                data1.transmission = carResp.data.carDetail.transmission === 'manual' ? 'M' : 'A';

                data1.milage = carResp.data.carDetail.milage;
                data1.car_class = carResp.data.carDetail.car_class;

                data1.driving_eligibility_criteria = carResp.data.carDetail.driving_eligibility_criteria;

                data1.car_brand = carResp.data.carDetail.car_brand;
                data1.car_model = carResp.data.carDetail.car_model;
                data1.car_model_number = carResp.data.carDetail.car_model_number;
                data1.car_model_release_year = carResp.data.carDetail.car_model_release_year;
                data1.image_name = carResp.data.carDetail.image_name;
                data1.user_name = 'dipesh';
                data1.fromDate = moment(data1.from_time).format("MMM-DD-YYYY");
                data1.toDate = moment(data1.to_time).format("MMM-DD-YYYY");
                // data1.user_name = userDeviceToken[0].first_name ;;

                console.log('Final data send =>', data1);


                /*store coupon entry in user_coupon collection*/


                /* coupon over */

                res.status(config.OK_STATUS).json(bookingResp)





                /* send email to user after car has been booked start*/



                var options = {
                    // to: userDeviceToken[0].email,
                    to: 'cofomitazi@webmail24.top',
                    subject: 'ABHR - New car has been booked'
                }

                // var data1 = bookingResp.data.booking_data;

                console.log('Booking Response DATA=>', data1);

                let mail_resp = await mail_helper.sendEmail_carBook("car_booking", options, data1);
                console.log('Mail sending response =>', mail_resp);


                /** Sending email is over */




                // res.status(config.OK_STATUS).json(bookingResp) // set this line after coupon entry
            }
            else {
                res.status(config.BAD_REQUEST).json(bookingResp);
            }
        }


    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


////////////////////////////////////////



// filter v6 test version (add banner in response) current active api
router.post('/filter-v6', async (req, res) => {
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
        },
        'latitude': {
            notEmpty: true,
            errorMessage: "Specify your latitude"
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Specify your longitude"
        },
        'resident_type': {
            notEmpty: true,
            errorMessage: "Are you resident ..? (eg 0 or 1)"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var fromDate = moment(req.body.fromDate).startOf('days');
        var toDate = moment(req.body.fromDate).add(req.body.days, 'days').startOf('days');


        var fromDateMonth = new Date(fromDate).getMonth() + 1;
        var toDateMonth = new Date(toDate).getMonth() + 1;

        // var fromDateMonth = fmonth > 9 ? fmonth : ("0" + fmonth);
        // var toDateMonth = tmonth > 9 ? tmonth : ("0" + tmonth);

        console.log("FromDate =>", fromDate);
        console.log("ToDate =>", toDate);
        console.log("FromDate Month =>", fromDateMonth);
        console.log("ToDate Month =>", toDateMonth);

        // console.log(fromDateMonth,toDateMonth);

        var defaultQuery = [
            {
                "$lookup": {
                    "from": "car_model",
                    "foreignField": "_id",
                    "localField": "car_model_id",
                    "as": "modelDetails"
                }
            },
            {
                "$unwind": {
                    "path": "$modelDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$lookup": {
                    "from": "car_brand",
                    "foreignField": "_id",
                    "localField": "car_brand_id",
                    "as": "brandDetails"
                }
            },
            {
                "$unwind": {
                    "path": "$brandDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$lookup": {
                    "from": "car_company",
                    "foreignField": "_id",
                    "localField": "car_rental_company_id",
                    "as": "companyDetails"
                }
            },
            {
                "$unwind": {
                    "path": "$companyDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$lookup": {
                    "from": "car_reviews",
                    "localField": "_id",
                    "foreignField": "car_id",
                    "as": "reviews"
                }
            },
            {
                "$lookup": {
                    "from": "car_booking",
                    "foreignField": "carId",
                    "localField": "_id",
                    "as": "carBookingDetails"
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "is_available": 1,
                    "car_rental_company_id": 1,
                    "car_brand": "$brandDetails.brand_name",
                    "car_model": "$modelDetails.model_name",
                    "car_model_number": "$modelDetails.model_number",
                    "car_model_release_year": "$modelDetails.release_year",
                    "car_color": 1,
                    "rent_price": 1,
                    "is_AC": 1,
                    "is_luggage_carrier": 1,
                    "licence_plate": 1,
                    "no_of_person": 1,
                    "transmission": 1,
                    "is_delieverd": 1,
                    "milage": 1,
                    "is_navigation": 1,
                    "driving_eligibility_criteria": 1,
                    "car_class": 1,
                    "is_avialable": 1,
                    "car_model_id": 1,
                    "car_brand_id": 1,
                    "isDeleted": 1,
                    "resident_criteria": 1,
                    "age_of_car": 1,
                    "image_name": {
                        "$arrayElemAt": [
                            "$car_gallery.name",
                            0
                        ]
                    },
                    "totalBooking": { $size: "$carBookingDetails" },
                    "booking": "$carBookingDetails",
                    "service_location": "$companyDetails.service_location",
                    "reviews": 1
                }
            },
            {
                "$unwind": {
                    "path": "$booking",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$match": {
                    $and: [
                        {
                            $or: [
                                {
                                    "booking.from_time": {
                                        $gt: new Date(toDate)

                                    }
                                },
                                {
                                    "booking.to_time": {
                                        $lt: new Date(fromDate)
                                    }
                                },
                                { "booking.trip_status": "cancelled" }, // add now
                                { "booking.trip_status": "finished" }, // add now
                                { "booking": null }
                            ]
                        },
                        {
                            "isDeleted": false,
                            // "is_available": { $ne: true } // & this remove now
                        }
                    ]
                }
            },
            {
                "$group": {
                    "_id": "$_id",
                    "data": { $first: "$$ROOT" },
                    "availableBooking": { $push: "$booking.booking_number" }
                }
            },
            {
                "$match": {
                    "$and": [
                        {
                            "data.service_location": {
                                "$geoWithin": {
                                    "$centerSphere": [[req.body.longitude, req.body.latitude], 62.1371 / 3963.2]
                                }
                            }
                        },
                        {
                            "$or": [
                                {
                                    "data.resident_criteria": {
                                        "$eq": req.body.resident_type
                                    }
                                },
                                {
                                    "data.resident_criteria": {
                                        "$eq": 2
                                    }
                                }
                            ]
                        },
                        {
                            "data.isDeleted": false
                        }
                    ]
                }
            },
            {
                "$unwind": {
                    "path": "$data.reviews",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$group": {
                    "_id": "$_id",
                    "total_avg_rating": {
                        "$avg": "$data.reviews.stars"
                    },
                    "car": {
                        "$first": "$data"
                    },
                    "availableBooking": { "$first": "$availableBooking" }
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

        if (typeof req.body.navigation !== 'undefined') {

            if (req.body.navigation === false) {
                let navigationOject = req.body.navigation;
                console.log('NAVIGATION 1======>', navigationOject);
                var searchQuery = {
                    "$match": {
                        "is_navigation": navigationOject,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);

            } else {
                console.log('NAVIGATION 2======>', req.body.navigation);
                var searchQuery = {
                    "$match": {
                        "is_navigation": true,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);

            }
        }

        if (req.body.transmission) {

            let transmissionObject = req.body.transmission;
            console.log('Transmission => ', transmissionObject)
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

        }

        // sorting
        if (typeof req.body.sort_by !== 'undefined') {
            let sort_by = parseInt(req.body.sort_by);
            if (sort_by === 0) {
                var searchQuery = {
                    $sort: {
                        'total_avg_rating': -1
                    }
                }
            }
            if (sort_by === 1) {
                var searchQuery = {
                    $sort: {
                        'car.rent_price': -1
                    }
                }
            }
            if (sort_by === 2) {
                var searchQuery = {
                    $sort: {
                        'car.rent_price': 1
                    }
                }
            }
            defaultQuery.push(searchQuery);
        }

        // console.log('Default Query========>', JSON.stringify(defaultQuery));

        // var cpn = await Coupon.find({"isDeleted" : false }).limit(5).skip( Math.floor((Math.random()*10)));
        var cpn = await Coupon.find({ "isDeleted": false, "banner": { $ne: null } }).limit(5);

        Car.aggregate(defaultQuery, function (err, data) {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "No Cars Available",
                    err
                });
            } else {
                // console.log("DATATA===>", JSON.stringify(data));

                // res.json('ok');

                if (data && data.length > 0) {

                    var finalDaata = data.filter((c) => {
                        if (c.car['totalBooking'] === c['availableBooking'].length) {

                            if (c.car["service_location"] === undefined) {
                                c.car["service_location"] = null
                            }

                            c.car['total_avg_rating'] = c['total_avg_rating'];
                            c.car['availableBooking'] = c['availableBooking'];

                            delete c.car['reviews'];
                            delete c.car['booking'];

                            return true;
                        }
                    });

                    finalDaata = finalDaata.map((d) => { return d.car })
                    // console.log('cars list==>', finalDaata);

                    availableArray = [];
                    var okData = finalDaata.map((available, index) => {
                        if (available.is_available && available.is_available !== true) {
                            available.is_available.map((data, index) => {
                                var cnt = 0;
                                console.log('datamoth', data.month, 'frommonth==>', fromDateMonth, 'to month===.', toDateMonth);
                                if (data.month === fromDateMonth || data.month === toDateMonth) {
                                    data.availability.map((av, i) => {
                                        let date = moment(av).utc().startOf('days');
                                        if (moment(date).isBetween(fromDate, toDate, null, '[)')) {
                                            cnt++
                                        }
                                        // u can push match data in one array & return it
                                    });
                                    // console.log('cnt======>,', cnt, req.body.days);
                                    if (cnt >= req.body.days) {
                                        availableArray.push(available);
                                    }
                                }
                            });
                        }
                    })

                    if (availableArray.length > 0) {

                        res.status(config.OK_STATUS).json({
                            status: "success",
                            message: "car data found",
                            // data: { cars: availableArray },
                            data: { cars: availableArray, banner: cpn && cpn.length > 0 ? cpn : [] }
                            // data: { cars: finalDaata }
                        });
                    }
                    else {
                        res.status(config.BAD_REQUEST).json({
                            status: "failed",
                            message: "No Cars Available"
                        });
                    }
                }
                else {
                    res.status(config.BAD_REQUEST).json({
                        status: "failed",
                        message: "No Cars Available"
                    });
                }

                /*

                if (data && data.length > 0) {
                    cars = data.map((c) => {
                        c.car["total_avg_rating"] = c.total_avg_rating;
                        if (c.car["service_location"] === undefined) {
                            c.car["service_location"] = null
                        }
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
                    res.status(config.BAD_REQUEST).json({
                        status: "failed",
                        message: "No Cars Available"
                    });
                }

                */
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


// remove location & add city wise search in filter-v6 new filter-v7
router.post('/filter-v7', async (req, res) => {
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
        },
        'latitude': {
            notEmpty: true,
            errorMessage: "Specify your latitude"
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Specify your longitude"
        },
        'city': {
            notEmpty: true,
            errorMessage: "Enter city name"
        },
        'resident_type': {
            notEmpty: true,
            errorMessage: "Are you resident ..? (eg 0 or 1)"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var fromDate = moment(req.body.fromDate).startOf('days');
        var toDate = moment(req.body.fromDate).add(req.body.days, 'days').startOf('days');

        var city = (req.body.city).toLowerCase();


        var fromDateMonth = new Date(fromDate).getMonth() + 1;
        var toDateMonth = new Date(toDate).getMonth() + 1;

        // var fromDateMonth = fmonth > 9 ? fmonth : ("0" + fmonth);
        // var toDateMonth = tmonth > 9 ? tmonth : ("0" + tmonth);

        console.log("FromDate =>", fromDate);
        console.log("ToDate =>", toDate);
        console.log("FromDate Month =>", fromDateMonth);
        console.log("ToDate Month =>", toDateMonth);

        // console.log(fromDateMonth,toDateMonth);

        var defaultQuery = [
            {
                "$lookup": {
                    "from": "car_model",
                    "foreignField": "_id",
                    "localField": "car_model_id",
                    "as": "modelDetails"
                }
            },
            {
                "$unwind": {
                    "path": "$modelDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$lookup": {
                    "from": "car_brand",
                    "foreignField": "_id",
                    "localField": "car_brand_id",
                    "as": "brandDetails"
                }
            },
            {
                "$unwind": {
                    "path": "$brandDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$lookup": {
                    "from": "car_company",
                    "foreignField": "_id",
                    "localField": "car_rental_company_id",
                    "as": "companyDetails"
                }
            },
            {
                "$unwind": {
                    "path": "$companyDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$lookup": {
                    "from": "car_reviews",
                    "localField": "_id",
                    "foreignField": "car_id",
                    "as": "reviews"
                }
            },
            {
                "$lookup": {
                    "from": "car_booking",
                    "foreignField": "carId",
                    "localField": "_id",
                    "as": "carBookingDetails"
                }
            },
            {
                $match: {
                    "companyDetails.isDeleted": false
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "is_available": 1,
                    "car_rental_company_id": 1,
                    "car_brand": "$brandDetails.brand_name",
                    "car_model": "$modelDetails.model_name",
                    "car_model_number": "$modelDetails.model_number",
                    "car_model_release_year": "$modelDetails.release_year",
                    "car_color": 1,
                    "rent_price": 1,
                    "is_AC": 1,
                    "is_luggage_carrier": 1,
                    "licence_plate": 1,
                    "no_of_person": 1,
                    "transmission": 1,
                    "is_delieverd": 1,
                    "milage": 1,
                    "is_navigation": 1,
                    "driving_eligibility_criteria": 1,
                    "car_class": 1,
                    "is_avialable": 1,
                    "car_model_id": 1,
                    "car_brand_id": 1,
                    "isDeleted": 1,
                    "resident_criteria": 1,
                    "age_of_car": 1,
                    "image_name": {
                        "$arrayElemAt": [
                            "$car_gallery.name",
                            0
                        ]
                    },
                    "totalBooking": { $size: "$carBookingDetails" },
                    "booking": "$carBookingDetails",
                    "service_location": "$companyDetails.service_location",
                    "company_city": { $toLower: "$companyDetails.company_address.city" },
                    "reviews": 1
                }
            },
            {
                "$unwind": {
                    "path": "$booking",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$match": {
                    $and: [
                        {
                            $or: [
                                {
                                    "booking.from_time": {
                                        $gt: new Date(toDate)

                                    }
                                },
                                {
                                    "booking.to_time": {
                                        $lt: new Date(fromDate)
                                    }
                                },
                                { "booking.trip_status": "cancelled" }, // add now
                                { "booking.trip_status": "finished" }, // add now
                                { "booking": null }
                            ]
                        },
                        {
                            "isDeleted": false,
                            // "car_rental_company_id" : false // now
                            // "is_available": { $ne: true } // & this remove now
                        }
                    ]
                }
            },
            {
                "$group": {
                    "_id": "$_id",
                    "data": { $first: "$$ROOT" },
                    "availableBooking": { $push: "$booking.booking_number" }
                }
            },
            {
                "$match": {
                    "$and": [
                        // {
                        //     "data.service_location": {
                        //         "$geoWithin": {
                        //             "$centerSphere": [[req.body.longitude, req.body.latitude], 62.1371 / 3963.2]
                        //         }
                        //     }
                        // },
                        {
                            // "data.company_city" : /^oYsteR Bay$/i 
                            "data.company_city": { $eq: city }
                        },
                        {
                            "$or": [
                                {
                                    "data.resident_criteria": {
                                        "$eq": req.body.resident_type
                                    }
                                },
                                {
                                    "data.resident_criteria": {
                                        "$eq": 2
                                    }
                                }
                            ]
                        },
                        {
                            "data.isDeleted": false
                        }
                    ]
                }
            },
            {
                "$unwind": {
                    "path": "$data.reviews",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                "$group": {
                    "_id": "$_id",
                    "total_avg_rating": {
                        "$avg": "$data.reviews.stars"
                    },
                    "car": {
                        "$first": "$data"
                    },
                    "availableBooking": { "$first": "$availableBooking" }
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

        if (typeof req.body.navigation !== 'undefined') {

            if (req.body.navigation === false) {
                let navigationOject = req.body.navigation;
                console.log('NAVIGATION 1======>', navigationOject);
                var searchQuery = {
                    "$match": {
                        "is_navigation": navigationOject,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);

            } else {
                console.log('NAVIGATION 2======>', req.body.navigation);
                var searchQuery = {
                    "$match": {
                        "is_navigation": true,
                    }
                }
                defaultQuery.splice(3, 0, searchQuery);

            }
        }

        if (req.body.transmission) {

            let transmissionObject = req.body.transmission;
            console.log('Transmission => ', transmissionObject)
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

        }

        // sorting
        if (typeof req.body.sort_by !== 'undefined') {
            let sort_by = parseInt(req.body.sort_by);
            if (sort_by === 0) {
                var searchQuery = {
                    $sort: {
                        'total_avg_rating': -1
                    }
                }
            }
            if (sort_by === 1) {
                var searchQuery = {
                    $sort: {
                        'car.rent_price': -1
                    }
                }
            }
            if (sort_by === 2) {
                var searchQuery = {
                    $sort: {
                        'car.rent_price': 1
                    }
                }
            }
            defaultQuery.push(searchQuery);
        }

        console.log('Default Query========>', JSON.stringify(defaultQuery));

        // var cpn = await Coupon.find({"isDeleted" : false }).limit(5).skip( Math.floor((Math.random()*10)));
        var cpn = await Coupon.find({ "isDeleted": false, "banner": { $ne: null }, "isDisplay": true }).limit(5);

        Car.aggregate(defaultQuery, function (err, data) {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "No Cars Available",
                    err
                });
            } else {
                // console.log("DATATA===>", JSON.stringify(data));

                // res.json('ok');

                if (data && data.length > 0) {

                    var finalDaata = data.filter((c) => {
                        if (c.car['totalBooking'] === c['availableBooking'].length) {

                            if (c.car["service_location"] === undefined) {
                                c.car["service_location"] = null
                            }

                            c.car['total_avg_rating'] = c['total_avg_rating'];
                            c.car['availableBooking'] = c['availableBooking'];

                            delete c.car['reviews'];
                            delete c.car['booking'];

                            return true;
                        }
                    });

                    finalDaata = finalDaata.map((d) => { return d.car })
                    // console.log('cars list==>', finalDaata);

                    availableArray = [];
                    var okData = finalDaata.map((available, index) => {
                        if (available.is_available && available.is_available !== true) {
                            available.is_available.map((data, index) => {
                                var cnt = 0;
                                console.log('datamoth', data.month, 'frommonth==>', fromDateMonth, 'to month===.', toDateMonth);
                                if (data.month === fromDateMonth || data.month === toDateMonth) {
                                    data.availability.map((av, i) => {
                                        let date = moment(av).utc().startOf('days');
                                        if (moment(date).isBetween(fromDate, toDate, null, '[)')) {
                                            cnt++
                                        }
                                        // u can push match data in one array & return it
                                    });
                                    // console.log('cnt======>,', cnt, req.body.days);
                                    if (cnt >= req.body.days) {
                                        availableArray.push(available);
                                    }
                                }
                            });
                        }
                    })

                    if (availableArray.length > 0) {

                        res.status(config.OK_STATUS).json({
                            status: "success",
                            message: "car data found",
                            // data: { cars: availableArray },
                            data: { cars: availableArray, banner: cpn && cpn.length > 0 ? cpn : [] }
                            // data: { cars: finalDaata }
                        });
                    }
                    else {
                        res.status(config.BAD_REQUEST).json({
                            status: "failed",
                            message: "No Cars Available"
                        });
                    }
                }
                else {
                    res.status(config.BAD_REQUEST).json({
                        status: "failed",
                        message: "No Cars Available"
                    });
                }

                /*

                if (data && data.length > 0) {
                    cars = data.map((c) => {
                        c.car["total_avg_rating"] = c.total_avg_rating;
                        if (c.car["service_location"] === undefined) {
                            c.car["service_location"] = null
                        }
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
                    res.status(config.BAD_REQUEST).json({
                        status: "failed",
                        message: "No Cars Available"
                    });
                }

                */
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
 * @api {post} /app/car/extend-booking Extend Car Booking
 * @apiName Extend Car Booking
 * @apiDescription Extend Car Booking
 * @apiGroup App - Car
 * 
 * @apiParam {String} car_id Car id
 * @apiParam {Date} fromDate Car booking from date
 * @apiParam {Number} days Number of days car needed
 * @apiParam {Number} booking_number Number of days car needed
 * @apiParam {Number} total_booking_amount Total car booking amount
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */

// Extend car booking new API
router.post('/extend-booking', async (req, res) => {
    var schema = {
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id",
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
            errorMessage: "Specify how many days you need car",
            isInt: {
                value: true,
                errorMessage: "Please enter days in number only"
            }
        },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number",
        },
        'total_booking_amount': {
            notEmpty: true,
            errorMessage: "Please enter total booking amount",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var toDate = moment(req.body.fromDate).add(req.body.days, 'days').format("YYYY-MM-DD");
        // var fromDate = req.body.fromDate;
        var fromDate = moment(req.body.fromDate).add(1, 'days').format("YYYY-MM-DD");


        console.log('From date =>', fromDate);
        console.log('To date =>', toDate);

        // check for already book or not first 

        var carData = await CarBooking.find(
            {
                $and: [
                    { "carId": new ObjectId(req.body.car_id) },
                    { "from_time": { $lte: toDate } },
                    { "to_time": { $gte: fromDate } },
                    { "trip_status": { $nin: ['cancelled', 'finished'] } },
                ]
            }
        )

        console.log('CAR DATA ->', carData);
        console.log('CAR DATA Len->', carData.length);

        if (carData && carData.length > 0) {
            // already book
            res.status(config.BAD_REQUEST).json({ status: "failed", message: "Opps this car has been already booked" });
        }
        else {

            var bookingDetails = await CarBooking.find({ "booking_number": req.body.booking_number });
            var total_extend_days = req.body.days;
            if (bookingDetails && bookingDetails.length > 0) {
                console.log('bookingDetails=>', bookingDetails);
                if (bookingDetails[0].extended_days) {
                    console.log('bookingDetails DAYS =>', bookingDetails[0].extended_days);
                    total_extend_days = bookingDetails[0].extended_days + req.body.days;
                }
                else {
                    total_extend_days = req.body.days;
                }
            }

            var condition = {
                "booking_number": req.body.booking_number,
                "trip_status": "inprogress"
            }
            var setData = {
                "extended_days": total_extend_days, //req.body.days,
                "total_booking_amount": req.body.total_booking_amount,
                "to_time": toDate
            }

            var extendBookingResp = await CarBooking.updateOne(condition, { $set: setData });

            if (extendBookingResp && extendBookingResp.n > 0) {
                res.status(config.OK_STATUS).json({ status: "success", message: "Your booking has been extended" });

                var carBookingData = await CarBooking.findOne({ "booking_number": req.body.booking_number });

                var data1 = JSON.parse(JSON.stringify(carBookingData));

                var userData = await Users.findOne({ _id: new ObjectId(carBookingData.userId) });
                const carResp = await carHelper.getcarDetailbyId(new ObjectId(req.body.car_id)); // resuable api


                data1.rent_price = carResp.data.carDetail.rent_price;

                data1.no_of_person = carResp.data.carDetail.no_of_person;
                data1.transmission = carResp.data.carDetail.transmission === 'manual' ? 'M' : 'A';

                data1.milage = carResp.data.carDetail.milage;
                data1.car_class = carResp.data.carDetail.car_class;

                data1.driving_eligibility_criteria = carResp.data.carDetail.driving_eligibility_criteria;

                data1.car_brand = carResp.data.carDetail.car_brand;
                data1.car_model = carResp.data.carDetail.car_model;
                data1.car_model_number = carResp.data.carDetail.car_model_number;
                data1.car_model_release_year = carResp.data.carDetail.car_model_release_year;
                data1.image_name = carResp.data.carDetail.image_name;

                data1.user_name = userData.first_name;

                data1.fromDate = moment(data1.from_time).format("MMM-DD-YYYY");
                data1.toDate = moment(data1.to_time).format("MMM-DD-YYYY");


                /* send email to user after car has been booked start*/

                var options = {
                    to: userData.email,
                    // to: 'dm@narola.email',
                    subject: 'ABHR - Booking has been extended'
                }

                let mail_resp = await mail_helper.sendEmail_carBook("car_booking_extend", options, data1);
                console.log('Mail sending response =>', mail_resp);

                /** Sending email is over */

                /* Send notification Start*/

                var user_id = await CarBooking.findOne({ 'booking_number': req.body.booking_number }, { _id: 0, userId: 1, carCompanyId: 1, car_handover_by_agent_id: 1 }).lean().exec();
                
                var userDeviceToken = await Users.find({ '_id': new ObjectId(user_id.userId) }, { _id: 1, deviceToken: 1, phone_number: 1, deviceType: 1, email: 1, country_code: 1, first_name: 1 }).lean().exec();
                var deviceToken = null;
                console.log('User token =>', userDeviceToken);
                if (userDeviceToken[0].deviceToken !== undefined && userDeviceToken[0].deviceToken !== null) {
                    if (userDeviceToken[0].deviceToken.length > 10) { // temp condition
                        // agentDeviceTokenArray.push(agent.deviceToken);
                        deviceToken = userDeviceToken[0].deviceToken;
                    }
                }

                var notificationType = 1; // means notification for booking 
                console.log('Dev Token=>', deviceToken);
                var msg = "Your booking has been extended successfully";
                if (userDeviceToken[0].deviceType === 'ios') {
                    var sendNotification = await pushNotificationHelper.sendToIOS(deviceToken, req.body.booking_number, notificationType, msg);

                    /* save notification to db start */
                    if (deviceToken !== null) {
                        var data = {
                            "userId": userDeviceToken[0]._id,
                            "deviceToken": deviceToken,
                            "deviceType": 'ios',
                            "notificationText": msg,
                            "notificationType": 1,
                            "booking_number": req.body.booking_number
                        }
                        var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                    }
                    /* save notification to db over */

                } else if (userDeviceToken[0].deviceType === 'android') {
                    var sendNotification = await pushNotificationHelper.sendToAndroidUser(deviceToken, req.body.booking_number, msg);
                    /* save notification to db start */
                    if (deviceToken !== null) {
                        var data = {
                            "userId": userDeviceToken[0]._id,
                            "deviceToken": deviceToken,
                            "deviceType": 'android',
                            "notificationText": msg,
                            "notificationType": 1,
                            "booking_number": req.body.booking_number
                        }
                        var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                    }
                    /* save notification to db over */
                }

                // send notification to agent for change booking

                if (user_id.car_handover_by_agent_id && user_id.car_handover_by_agent_id != null) {
                    var agentData = await Users.find({ '_id': new ObjectId(user_id.car_handover_by_agent_id) }, { _id: 1, deviceToken: 1, phone_number: 1, deviceType: 1, email: 1, phone_number: 1 }).lean().exec();
                    var deviceToken = null;
                    var msg = userDeviceToken[0].first_name+"'\s" + " booking has been extended"
                    // Push notification //
                    if (agentData[0].deviceToken !== undefined && agentData[0].deviceToken !== null) {
                        if (agentData[0].deviceToken.length > 10) { // temp condition
                            // agentDeviceTokenArray.push(agent.deviceToken);
                            deviceToken = agentData[0].deviceToken;
                            var notificationType = 1; // means notification for booking 
                            var sendNotification = await pushNotificationHelper.sendToAndroidAgent(deviceToken, req.body.booking_number, msg);

                            /* save notification to db start */
                            if (deviceToken !== null) {
                                var data = {
                                    "userId": agentData[0]._id,
                                    "deviceToken": deviceToken,
                                    "deviceType": 'android',
                                    "notificationText": msg,
                                    "notificationType": 1,
                                    "booking_number": req.body.booking_number
                                }
                                var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                            }
                            /* save notification to db over */
                        }
                    }
                }

                 /* Send notification Over */






            }
            else {
                res.status(config.BAD_REQUEST).json({ status: "failed", message: "Your booking has not been extended" });
            }
        }

    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});



module.exports = router;