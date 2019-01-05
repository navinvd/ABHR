var express = require('express');
var router = express.Router();

var config = require('./../../config');

const Car = require('./../../models/cars');
const CarBooking = require('./../../models/car_booking');
const CarBrand = require('./../../models/car_brand');
const CarModel = require('./../../models/car_model');

var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');
const moment = require('moment');

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
router.post('/car-filter', async (req, res) => {
    var schema = {
        'id': {
            notEmpty: true,
            errorMessage: "Please specify from when you need car"
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
                //     $and: [
                //         {
                //             $or: [
                //                 { car_book_from_date: { $gt: toDate } },
                //                 { car_book_to_date: { $lt: fromDate } },
                //                 { car_book_from_date: { $eq: null } }
                //             ]
                //         },
                //         { isDeleted: false }
                //     ]
                // }
                $match: { isDeleted: false }
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

// Rental list
router.post('/car-list', async (req, res) => {

    var defaultQuery = [
        {
            $lookup: {
                from: 'cars',
                foreignField: '_id',
                localField: 'carId',
                as: "carDetails",
            }
        },
        {
            $unwind: {
                "path": "$carDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: 'car_model',
                foreignField: '_id',
                localField: 'carDetails.car_model_id',
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
                localField: 'carDetails.car_brand_id',
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
            $project: {
                _id: 1,
                booking_number: 1,
                userId: 1,
                carId: 1,
                // from_time: 1,
                // to_time: 1,
                car_book_from_date: {
                    $dateToString: {
                        date: "$from_time",
                        format: "%Y-%m-%d"
                    }
                },
                car_book_to_date: {
                    $dateToString: {
                        date: "$to_time",
                        format: "%Y-%m-%d"
                    }
                },
                days: 1,
                booking_rent: 1,
                trip_status: 1,
                delivery_address: 1,
                delivery_time: 1,
                total_booking_amount: 1,
                lat: 1,
                long: 1,
                coupon_code: 1,
                isDeleted: 1,
                image_name: "$carDetails.car_gallery",
                is_navigation: "$carDetails.is_navigation",
                is_AC: "$carDetails.is_AC",
                is_luggage_carrier: "$carDetails.is_luggage_carrier",
                driving_eligibility_criteria: "$carDetails.driving_eligibility_criteria",
                is_avialable: "$carDetails.is_avialable",
                is_delieverd: "$carDetails.is_delieverd",
                car_rental_company_id: "$carDetails.car_rental_company_id",
                no_of_person: "$carDetails.no_of_person",
                transmission: "$carDetails.transmission",
                milage: "$carDetails.milage",
                car_class: "$carDetails.car_class",
                licence_plate: "$carDetails.licence_plate",
                car_color: "$carDetails.car_color",
                car_brand: "$brandDetails.brand_name",
                car_model: "$modelDetails.model_name",
                car_model_number: "$modelDetails.model_number",
                car_model_release_year: "$modelDetails.release_year",

            }
        }
    ];

    var match_object = [];
    var apply_filter = 0; // not applying now

    if (req.body.deliverd_rental) { // for upcomming car default filter
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.deliverd_rental })
    }
    else {
        apply_filter = 1
        match_object.push({ 'trip_status': 'upcoming' })
    }

    if (req.body.cancellation) { // for cancelled car
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.cancellation })
    }

    if (req.body.today) {
        var searchQuery = {
            "$match": {
                car_book_from_date: req.body.today
            }
        }
        defaultQuery.splice(7, 0, searchQuery);
    }

    if (apply_filter === 1) {
        var searchQuery = {
            "$match": {
                $or: match_object
            }
        }
        defaultQuery.splice(7, 0, searchQuery);
    }

    console.log('Match Condition ====>', match_object);
    console.log('Default Query========>', JSON.stringify(defaultQuery));

    CarBooking.aggregate(defaultQuery, function (err, data) {
        if (err) {
            res.status(config.BAD_REQUEST).json({
                status: "failed",
                message: "error in fetching data",
                err
            });
        } else {
            if (data && data.length > 0) {
                var data = data.map((c) => {
                    if (c['image_name'] === undefined) {
                        c['image_name'] = null
                    }
                    return c;
                })

                res.status(config.OK_STATUS).json({
                    status: "success",
                    message: "car data found",
                    data: { cars: data },
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

});


// Booking details of any one car
router.post('/booking-details', async (req, res) => {
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

        var defaultQuery = [
            {
                $match : {
                    "booking_number" : { $eq : req.body.booking_number}
                }
            },
            {
                $lookup: {
                    from: 'cars',
                    foreignField: '_id',
                    localField: 'carId',
                    as: "carDetails",
                }
            },
            {
                $unwind: {
                    "path": "$carDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'car_model',
                    foreignField: '_id',
                    localField: 'carDetails.car_model_id',
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
                    localField: 'carDetails.car_brand_id',
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
                    from: 'users',
                    foreignField: '_id',
                    localField: 'userId',
                    as: "userDetails",
                }
            },
            {
                $unwind: {
                    "path": "$userDetails",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $project: {
                    _id: 1,
                    total_avg_rating : 1,
                    booking_number: 1,
                    userId: 1,
                    carId: 1,
                    car_book_from_date: {
                        $dateToString: {
                            date: "$from_time",
                            format: "%Y-%m-%d"
                        }
                    },
                    car_book_to_date: {
                        $dateToString: {
                            date: "$to_time",
                            format: "%Y-%m-%d"
                        }
                    },
                    days: 1,
                    booking_rent: 1,
                    trip_status: 1,
                    delivery_address: 1,
                    delivery_time: 1,
                    total_booking_amount: 1,
                    lat: 1,
                    long: 1,
                    coupon_code: 1,
                    isDeleted: 1,
                    image_name: "$carDetails.car_gallery",
                    is_navigation: "$carDetails.is_navigation",
                    is_AC: "$carDetails.is_AC",
                    is_luggage_carrier: "$carDetails.is_luggage_carrier",
                    driving_eligibility_criteria: "$carDetails.driving_eligibility_criteria",
                    is_avialable: "$carDetails.is_avialable",
                    is_delieverd: "$carDetails.is_delieverd",
                    car_rental_company_id: "$carDetails.car_rental_company_id",
                    no_of_person: "$carDetails.no_of_person",
                    transmission: "$carDetails.transmission",
                    milage: "$carDetails.milage",
                    car_class: "$carDetails.car_class",
                    licence_plate: "$carDetails.licence_plate",
                    car_color: "$carDetails.car_color",
                    car_brand: "$brandDetails.brand_name",
                    car_model: "$modelDetails.model_name",
                    car_model_number: "$modelDetails.model_number",
                    car_model_release_year: "$modelDetails.release_year",
                    first_name: "$userDetails.first_name",
                    last_name: "$userDetails.last_name",
                    phone_number: "$userDetails.phone_number",
                    country_code: "$userDetails.country_code",
                    email: "$userDetails.email"
                }
            },
            {
                $lookup: {
                    from: 'car_reviews',
                    localField: 'carId', // from projection
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
            },
            
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
                    var data = data.map((c) => {
                        if (c.car['image_name'] === undefined) {
                            c.car['image_name'] = null
                        }
                        c.car['total_avg_rating'] = c.total_avg_rating;
                        delete c.car.reviews;
                        return c.car;
                    })
              
                    res.status(config.OK_STATUS).json({
                        status: "success",
                        message: "Car booking details has been found",
                        data: { cars: data },
                    });
                }
                else {
                    res.status(config.OK_STATUS).json({
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




module.exports = router;