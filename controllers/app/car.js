var express = require('express');
var router = express.Router();

var config = require('./../../config');
const carHelper = require('./../../helper/car');
const pushNotificationHelper = require('./../../helper/push_notification');
const Car = require('./../../models/cars');
const CarBooking = require('./../../models/car_booking');
const CarBrand = require('./../../models/car_brand');
const CarModel = require('./../../models/car_model');
const Users = require('./../../models/users');
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


        var carData = await CarBooking.find(
            {


                // $match : {
                $and: [
                    { "carId": new ObjectId(req.body.car_id) },
                    { "from_time": { $lte: toDate } },
                    { "to_time": { $gte: fromDate } },
                    { "trip_status": { $ne: 'cancelled' } },
                    // {"trip_status" : { $eq : 'finished'}} // no need
                    // {
                    //     $and : [
                    //         {"trip_status" : { $eq : 'cancelled'}},
                    //         {"trip_status" : { $eq : 'finished'}}
                    //     ]
                    // }
                    // {
                    //     $or: [
                    //             {
                    //                 $and: [
                    //                     {from_time : { $gte : fromDate} },
                    //                     {to_time : { $lte : toDate} }
                    //                 ]
                    //             },
                    //             {
                    //                 $and: [
                    //                     {from_time : { $gte : fromDate} },
                    //                     {to_time : { $gte : toDate} },
                    //                     {from_time : {$not: { $gte : toDate} } }
                    //                 ]
                    //             },
                    //             {
                    //                 $and: [
                    //                     {to_time : { $lte : fromDate} },
                    //                     {to_time : { $gt : toDate} },
                    //                     {from_time : { $gt : fromDate} } 
                    //                 ]
                    //             },
                    //             {
                    //                 $and: [
                    //                     {from_time : { $lte : fromDate} },
                    //                     {to_time : { $gte : toDate} }
                    //                 ]
                    //             },
                    //             {
                    //                 $and: [
                    //                     {from_time : { $eq : fromDate} },
                    //                     {to_time : { $eq : toDate} }
                    //                 ]
                    //             }
                    //     ]
                    // }
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
                "trip_status": "upcoming"
            }
            const bookingResp = await carHelper.carBook(data);

            if (bookingResp.status === 'success') {

                console.log('Booking Id =>', bookingResp.data.booking_data['booking_number']);
                var car_booking_number = bookingResp.data.booking_data['booking_number'];

                // after booking change car avaibility status to false // no need now
                // var car_avaibility = await Car.updateOne({_id : new ObjectId(req.body.car_id)}, { $set : { 'is_available' : false } } );              

                // after car booking need to send push notification to all agent
                /** push notification process to all agent start */

                var agentList = await Users.find({ 'type': 'agent' }, { _id: 0, deviceToken: 1, phone_number: 1 }).lean().exec();

                var agentDeviceTokenArray = [];
                agentList.map((agent, index) => {
                    if (agent.deviceToken !== undefined) {
                        if (agent.deviceToken !== null) {
                            if (agent.deviceToken.length > 10) { // temp condition
                                agentDeviceTokenArray.push(agent.deviceToken);
                            }
                        }
                    }
                });

                var notificationFor = "new-booking";
                var sendNotification = await pushNotificationHelper.sendToAndroid(agentDeviceTokenArray, car_booking_number, notificationFor);


                if (sendNotification.status === 'success') {
                    console.log('Notification send Success==>')
                    // res.status(config.OK_STATUS).json(sendNotification);
                    res.status(config.OK_STATUS).json(bookingResp);
                }
                else {
                    console.log('Notification not send failure', sendNotification)
                    // res.status(config.BAD_REQUEST).json(sendNotification);
                    res.status(config.OK_STATUS).json(bookingResp);
                }

                /**  ------------Over push notification--------- */
                // res.status(config.OK_STATUS).json(bookingResp);
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
        let radiusResp = await carHelper.checkRadius(data);

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
 * @apiParam {Boolean} report_type (eg. 0 - Lost/Stolen  &  1 - Problem in car)
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
            errorMessage: "Please enter car report type",
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

        const carReportResp = await carHelper.car_report(data);
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


// test notification route

router.post('/test-not', async (req, res) => {
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
                console.log("DATATA===>", data);

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
router.post('/return-request',async(req,res)=>{
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
        
        const updateStatusResp = await CarBooking.updateOne({'booking_number':booking_number},{$set:{'trip_status':'return'}});
        if (updateStatusResp && updateStatusResp.n > 0) {
            // send notification to all agent


            var agentList = await Users.find({ 'type': 'agent' }, { _id: 0, deviceToken: 1, phone_number: 1 }).lean().exec();


                var agentDeviceTokenArray = [];
                agentList.map((agent, index) => {
                    if (agent.deviceToken !== undefined) {
                        if (agent.deviceToken !== null) {
                            if (agent.deviceToken.length > 10) { // temp condition
                                agentDeviceTokenArray.push(agent.deviceToken);
                            }
                        }
                    }
                });

                var notificationFor = "return-process";
                var sendNotification = await pushNotificationHelper.sendToAndroid(agentDeviceTokenArray, booking_number, notificationFor);

                if (sendNotification.status === 'success') {
                    console.log('Notification send Success==>')
                    // res.status(config.OK_STATUS).json(sendNotification);
                    res.status(config.OK_STATUS).json('ok');
                }
                else {
                    console.log('Notification not send failure', sendNotification)
                    // res.status(config.BAD_REQUEST).json(sendNotification);
                    res.status(config.OK_STATUS).json('error');
                }








            // res.json('ok')
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


module.exports = router;