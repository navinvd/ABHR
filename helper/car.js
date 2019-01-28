var mongoose = require('mongoose');
var CarReview = require('./../models/car_review');
var ObjectId = mongoose.Types.ObjectId;
const Car = require('./../models/cars');
const CarBooking = require('./../models/car_booking');
const CarAssign = require('./../models/car_assign_agent');
const CarBrand = require('./../models/car_brand');
const CarCompany = require('./../models/car_company');
const CarModel = require('./../models/car_model');
const Country = require('./../models/country');
const State = require('./../models/state');
const City = require('./../models/city');
const CarHandOver = require('./../models/car_hand_over');
const CarReceive = require('./../models/car_receive');
const CarReport = require('./../models/car_report');
const moment = require('moment');
const _ = require('underscore');
var config = require('./../config');
var fs = require('fs');
var paths = require('path');
var async = require("async");

let carHelper = {};
let mail_helper = require('./mail');


carHelper.getAvailableCar = async function (fromDate, days, start = 0, length = 10) {

    var toDate = moment(fromDate).add(days, 'days').format("YYYY-MM-DD");
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
                vat_rate: 1,
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
            $skip: start
        },
        {
            $limit: length
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
    try {
        console.log("Default Query => ", JSON.stringify(defaultQuery));
        let cars = await Car.aggregate(defaultQuery);
        if (cars && cars.length > 0) {

            cars = cars.map((c) => {
                c.car["total_avg_rating"] = c.total_avg_rating;
                delete c.car.reviews;
                return c.car;
            })

            return { status: 'success', message: "Car data found", data: { cars: cars } }
        } else {
            return { status: 'failed', message: "No car data found" }
        }
    } catch (err) {
        console.log("Err : ", err);
        return { status: 'failed', message: "Error occured while finding car", err };
    }
};


carHelper.getcarDetailbyId = async (car_id) => {
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
                from: 'car_company_terms_and_condition',
                foreignField: 'companyId',
                localField: 'car_rental_company_id',
                as: "termandconditionDetails",
            }
        },
        {
            $unwind: {
                "path": "$termandconditionDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $lookup: {
                from: 'car_company',
                foreignField: '_id',
                localField: 'car_rental_company_id',
                as: "carCompanyDetails",
            }
        },
        {
            $unwind: {
                "path": "$carCompanyDetails",
                "preserveNullAndEmptyArrays": true
            }
        },

        {
            $project: {
                _id: 1,
                car_rental_company_id: 1,
                car_rental_company_name: "$carCompanyDetails.name",
                car_rental_company_country: "$carCompanyDetails.company_address.country",
                terms_and_conditions: "$termandconditionDetails.terms_and_conditions",
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
                car_gallery: 1,
                resident_criteria: 1,
                deposit: 1,
                image_name: { $arrayElemAt: ["$car_gallery.name", 0] },
            }
        },
        {
            $match: {
                'isDeleted': false,
                '_id': car_id
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
    try {
        let carDetail = await Car.aggregate(defaultQuery);
        if (carDetail && carDetail.length > 0) {
            var cars = carDetail.map((c) => {
                c.car["total_avg_rating"] = c.total_avg_rating;
                // c.car["car_rental_company_name"] = c.car_rental_company_name;
                if (c.car['image_name'] === undefined) {
                    c.car['image_name'] = null
                }
                if (c.car['car_gallery'] === undefined) {
                    c.car['car_gallery'] = []
                }
                if (c.car['terms_and_conditions'] === undefined) {
                    c.car['terms_and_conditions'] = null
                }
                if (c.car['car_rental_company_country'] === undefined) {
                    c.car['car_rental_company_country'] = null
                }
                delete c.car.reviews;
                return c.car;
            })
            return { status: 'success', message: "Car data found", data: { carDetail: cars[0] } }
        } else {
            return { status: 'failed', message: "No car available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car list" };
    }
};

// Add car review
carHelper.addReview = async function (review_data) {
    let car_review = new CarReview(review_data);
    try {
        let dt = await CarReview.find({
            $and: [
                { car_id: new ObjectId(review_data.car_id) },
                { user_id: new ObjectId(review_data.user_id) }
            ]
        });

        if (dt && dt.length > 0) {
            return { status: 'failed', message: "You have all ready given review to this car" }
        }
        else {
            let data = await car_review.save();
            return { status: 'success', message: "Car review has been added", data: data }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while adding car review" };
    }
};

// get car reviews
carHelper.getCarReviews = async (datta) => {
    try {
        let is_reviewed; // true / false
        let data = await CarReview.find({ car_id: new ObjectId(datta.car_id) }).lean().exec();

        if (datta.user_id !== undefined) {
            // re-arrang data
            var reviewObj = _.find(data, function (o) { return o.user_id == datta.user_id });

            if (reviewObj != undefined) { // if user review find
                var i = _.findIndex(data, function (o) { return o == reviewObj })
                data.splice(i, 1); // array
                data.unshift(reviewObj);
                is_reviewed = true
            }
            else {
                is_reviewed = false
            }
        }
        if (data && data.length > 0) {
            if (datta.user_id !== undefined) {
                return { status: 'success', message: "Car review has been found", data: { reviews: data, is_reviewed: is_reviewed } }
            }
            else {
                return { status: 'success', message: "Car review has been found", data: { reviews: data } }
            }
        }
        else {
            return { status: 'failed', message: "No car reviews yet" }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car reviews" };
    }
};

// car sorting
carHelper.carSorting = async (sort_by) => {
    let data;
    let message;
    try {
        if (sort_by === 0) {
            data = await Car.aggregate([
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
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        total_avg_rating: { $avg: "$reviews.stars" },
                        car: { "$first": "$$ROOT" }
                    }
                },
                {
                    $sort: {
                        'total_avg_rating': -1
                    }
                }
            ]);
            message = "Sorted cars by their popularity";
        }
        else if (sort_by === 1) {
            data = await Car.find({}).sort({ 'rent_price': 1 }).lean().exec();
            message = "Sorted cars by their rent price from low to high";
        }
        else if (sort_by === 2) {
            data = await Car.find({}).sort({ 'rent_price': -1 }).lean().exec();
            message = "Sorted cars by their rent price from high to low";
        }

        if (data && data.length > 0) {
            return { status: 'success', message: message, data: data }
        }
        else {
            return { status: 'failed', message: "No cars available", data: data }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while sorting cars" };
    }
};

// Car Booking past history 
carHelper.carBooking_past_history = async (user_id) => {
    try {
        let data = await CarBooking.aggregate([
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
                $addFields: {
                    "car_details.car_brand": "$brand_details.brand_name",
                    "car_details.car_model": "$model_details.model_name",
                    "car_details.car_model_number": "$model_details.model_number",
                    "car_details.car_model_release_year": "$model_details.release_year"
                }
            },
            {
                // $match: {
                //     'isDeleted': false,
                //     'userId': new ObjectId('5c2461eea3e4c014baafb01f'),
                //     'from_time': {
                //         $lt: new Date(),
                //     }
                // }
                $match: {
                    'isDeleted': false,
                    'userId': new ObjectId(user_id),
                    'trip_status': "finished"
                }
            }
        ]);
        if (data && data.length > 0) {

            // console.log('DATA=>',data);

            // var dataa = data.map((d)=>{
            //     return delete d['model_details'];
            // })
            return { status: 'success', message: "Car booking past history", data: { past_history: data } }
        }
        else {
            return { status: 'failed', message: "No car book yet" }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car booking past history" };
    }
};

// Car Booking upcoming history 
carHelper.carBooking_upcomming_history = async (user_id) => {
    try {
        let data = await CarBooking.aggregate([
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
                $addFields: {
                    "car_details.car_brand": "$brand_details.brand_name",
                    "car_details.car_model": "$model_details.model_name",
                    "car_details.car_model_number": "$model_details.model_number",
                    "car_details.car_model_release_year": "$model_details.release_year",
                    "phone_number": "$companyDetails.phone_number"
                }
            },
            {
                // $match: {
                //     'isDeleted': false,
                //     'userId': new ObjectId(user_id),
                //     'from_time': {
                //         $gte: new Date(),
                //     }
                // }
                $match: {
                    'isDeleted': false,
                    'userId': new ObjectId(user_id),
                    'trip_status': "upcoming"
                }
            }

        ]);
        if (data && data.length > 0) {

            console.log('DATA===>',data);
            // var currentDate = moment(Date.now()).format('YYYY-MM-DD');
            var currentDate = moment().toDate().toISOString(Date.now());
            console.log('C Date=>',currentDate);
            console.log('C Date IOS=>', moment().toDate().toISOString( Date.now() ))

           console.log('MOment Db Date = >',moment("2019-01-28T05:19:50.975Z"))
           console.log('MOment Current Date = >',moment());
            
            var data1 = data.map((c) => {
                // if(moment().diff(moment(c['from_time'])) > 0)
                if(moment(currentDate) >= moment(c['from_time']))
                {
                    c['call_or_not'] = 'yes' // place manual call
                }
                else{
                    c['call_or_not'] = 'no' // not call 
                }
                if(c['phone_number'] === undefined){
                    c['phone_number'] = ""
                }

                // delete c.model_details;
                // delete c.brand_details;
                // delete c.companyDetails;

                return c;
            })

            return { status: 'success', message: "Car booking upcomming history", data: { upcoming_history: data1 } }
            
        }
        else {
            return { status: 'failed', message: "No car book yet" }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car booking upcomming history" };
    }
};


// Car Booking all history 
carHelper.history = async (user_id, history_type) => {

    var defaultQuery = [
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
            $addFields: {
                "car_details.car_brand": "$brand_details.brand_name",
                "car_details.car_model": "$model_details.model_name",
                "car_details.car_model_number": "$model_details.model_number",
                "car_details.car_model_release_year": "$model_details.release_year",
                "phone_number": "$companyDetails.phone_number"
            }
        }
        // {
        //     $match: {
        //         'isDeleted': false,
        //         'userId': new ObjectId(user_id),
        //         'trip_status': "upcoming"
        //     }
        // }
    ]


    if (history_type === 'all') {
        var searchQuery = {
            $match: {
                'isDeleted': false,
                'userId': new ObjectId(user_id)
            }
        }
    }
    else if (history_type === 'active') {
        var searchQuery = {
            $match: {
                'isDeleted': false,
                'userId': new ObjectId(user_id),
                'trip_status' : 'delivering'
            }
        } 
    }
    else if (history_type === 'cancelled') {
        var searchQuery = {
            $match: {
                'isDeleted': false,
                'userId': new ObjectId(user_id),
                'trip_status' : 'cancelled'
            }
        }
    }


    defaultQuery.push(searchQuery);

    console.log('Default Query :-', JSON.stringify(defaultQuery));

    try {
        let data = await CarBooking.aggregate(defaultQuery);

        if (data && data.length > 0) {

            var currentDate = moment().toDate().toISOString(Date.now());            
            var data1 = data.map((c) => {
                // if(moment().diff(moment(c['from_time'])) > 0)
                if(moment(currentDate) >= moment(c['from_time']))
                {
                    c['call_or_not'] = 'yes' // place manual call
                }
                else{
                    c['call_or_not'] = 'no' // not call 
                }
                if(c['phone_number'] === undefined){
                    c['phone_number'] = ""
                }

                // delete c.model_details;
                // delete c.brand_details;
                // delete c.companyDetails;

                return c;
            })

            return { status: 'success', message: "History has been found", data: { history: data1 } }
        }
        else {
            return { status: 'failed', message: "History has not been found" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car booking history" };
    }
};


carHelper.getBrandList = async () => {
    try {
        const carbrand = await CarBrand.find({ "isDeleted": false }, { _id: 1, brand_name: 1 });
        if (carbrand && carbrand.length > 0) {
            return { status: 'success', message: "Car brand has been found", data: { brand: carbrand } }
        } else {
            return { status: 'failed', message: "No car brand available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding car brand", err };
    }
}

//Get modellist by brand id
carHelper.getModelList = async (brandArray) => {
    try {
        const carmodels = await CarModel.find({ "isDeleted": false, "car_brand_id": { $in: brandArray } });
        if (carmodels && carmodels.length > 0) {
            return { status: 'success', message: "Car Models has been found", data: { model: carmodels } }
        } else {
            return { status: 'failed', message: "No car model available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Oops! Something went wrong.., We canot find data", err };
    }
}

//Get notification by user id
carHelper.getNotificationByUserId = async (userId) => {
    try {
        CarNotification.find({ "isDeleted": false, "userId": new ObjectId(req.body.userId) }, (err, data) => {
            if (err) {
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "notification data not found",
                    err
                });
            } else {
                res.status(config.OK_STATUS).json({
                    status: "Success",
                    message: "notification data found",
                    data: data,
                });
            }
        });
        const carnotifications = await CarNotification.find({ "isDeleted": false, "userId": new ObjectId(userId) });
        if (carnotifications && carnotifications.length > 0) {
            return { status: 'success', message: "Car Notification records found", data: { carnotifications: carnotifications } }
        } else {
            return { status: 'failed', message: "Car Notification records not available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Oops! Something went wrong.., We canot find data", err };
    }
}


// check for car availbility on specific date

carHelper.checkCarAvaibility = async function (car_id, fromDate, days) {
    var toDate = moment(fromDate).add(days, 'days').format("YYYY-MM-DD");
    console.log(toDate);

    var defaultQuery = [
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
                isDeleted: 1,
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
            $match: {
                $and: [
                    {
                        $or: [
                            { car_book_from_date: { $gt: toDate } },
                            { car_book_to_date: { $lt: fromDate } },
                            { car_book_from_date: { $eq: null } }
                        ]
                    },
                    { isDeleted: false },
                    { _id: ObjectId(car_id) },
                ]
            }
        }
    ];
    try {
        let cars = await Car.aggregate(defaultQuery);
        if (cars && cars.length > 0) {
            // return { status: 'success', message: "Car data found", data: { cars: cars } }
            return { status: 'success', message: "Car is available on this date" }
        } else {
            return { status: 'failed', message: "Car is not available on this date" }
        }
    } catch (err) {
        console.log("Err : ", err);
        return { status: 'failed', message: "Error occured while finding car", err };
    }
};

//carBook
carHelper.carBook = async function (booking_data) {
    let car_booking = new CarBooking(booking_data);
    try {
        let data = await car_booking.save();
        return { status: 'success', message: "Car has been book successfully", data: { booking_data: data } }
    } catch (err) {
        return { status: 'failed', message: "Error occured while booking car", err };
    }
};

// cancel car booking
carHelper.cancelBooking = async function (data) {
    try {
        var condition = {
            $and: [
                { userId: new ObjectId(data.userId) },
                { carId: new ObjectId(data.carId) }
            ]
        }

        var update_data = { $set: { cancel_date: data.cancel_date, cancel_reason: data.cancel_reason, trip_status: data.trip_status } };

        var datta = await CarBooking.update(condition, update_data);
        if (datta.n > 0) {
            return { status: 'success', message: "Your car booking has been cancelled successfully" }
        }
        else {
            return { status: 'failed', message: "Error occured while cancelling your car booking" }
        }
    }
    catch (err) {
        return { status: 'failed', message: "Error occured while cancelling your car booking" }
    }
}


// Check_Service_Availibility
carHelper.Check_Service_Availibility = async function (data) {
    try {
        if (data.type === 'country') {
            var data = await Country.find({}).lean().exec();

            if (data && data.length > 0) {
                return { status: 'success', message: "Available country list", data: { country: data } }
            }
            else {
                return { status: 'failed', message: "No country available" }
            }
        }
        else if (data.type === 'state') {
            var data = await State.find({ country_id: ObjectId(data.id) }).lean().exec();

            if (data && data.length > 0) {
                return { status: 'success', message: "Available state list", data: { state: data } }
            }
            else {
                return { status: 'failed', message: "No state available for this country" }
            }
        }
        else if (data.type === 'city') {
            var data = await City.find({ state_id: ObjectId(data.id) }).lean().exec();

            if (data && data.length > 0) {
                return { status: 'success', message: "Available city list", data: { city: data } }
            }
            else {
                return { status: 'failed', message: "No city available for this state" }
            }
        }
    }
    catch (err) {
        return { status: 'failed', message: "Error occured while fetching country -> State -> City data" }
    }
}


// check radius
carHelper.checkRadius = async function (data) {
    try {
        // for 100 meter radius
        let radius = await CarCompany.aggregate([{
            $match: {
                $and: [
                    { _id: new ObjectId(data.company_id) }, //0.621371 1 km  // 62.1371 = 100km
                    { service_location: { $geoWithin: { $centerSphere: [[data.longitude, data.latitude], 62.1371 / 3963.2] } } }
                ]
            }
        }]
        );
        if (radius && radius.length > 0) {
            return { status: 'success', message: "Service is available to your location", data: { rental_company: radius } }
        }
        else {
            return { status: 'failed', message: "Service is not available to your location " }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while mapping radius", err }
    }
}


// car_handover for agent app
carHelper.car_handover = async (req, car_handover_data) => {
    try {

        let car_hand_over_data = {
            'user_id': car_handover_data.user_id,
            'car_id': car_handover_data.car_id,
            'car_rental_company_id': car_handover_data.car_rental_company_id,//
            'agent_id': car_handover_data.agent_id,
            'defected_points': car_handover_data.defected_points,
            'milage': car_handover_data.milage,
            'petrol_tank': car_handover_data.petrol_tank,
            'notes': car_handover_data.notes ? car_handover_data.notes : null,
            'booking_number': car_handover_data.booking_number
        }
        // console.log('HElper =>', req.files)

        if (req.files) {
            if (req.files.car_defects_gallery) {
                // console.log('Gallary=>',req.files)
                var gallary = [];
                var gallaryArray = [];
                var gallary = req.files.car_defects_gallery;
                if (!Array.isArray(gallary)) {
                    gallary = [gallary];
                    console.log('DATATAT=>', gallary);
                }
                console.log('DATATAT=>', gallary);
                var dir = "./upload/car_defect";
                async.each(gallary, function (gal) {
                    var extention = paths.extname(gal.name);
                    var filename = "car_defect" + Date.now() + extention;
                    var filepath = dir + '/' + filename;

                    if (fs.existsSync(filepath)) {
                        filename = "car_defect" + Date.now() + 1 + extention;
                        filepath = dir + '/' + filename;
                    }
                    var json_gal = { name: filename, type: gal['mimetype'] }
                    gallaryArray.push(json_gal);

                    gal.mv(filepath, function (err) {
                        if (err) {
                            return { status: "failed", message: "Error accured while uplaod car defected images" };
                        }
                    });

                })

            }


            /** Save data ith signature */
            if (req.files.signature) {
                var mimetype = config.mimetypes;
                if (mimetype.indexOf(req.files.signature.mimetype) != -1) {
                    // upload now
                    console.log('Comming');
                    var file = req.files.signature; // store entire file object
                    var dir = "./upload/signature";
                    extention = paths.extname(file.name);
                    savefilename = "signature_" + Date.now() + extention;
                    var makeEntry = 1;
                    await file.mv(dir + '/' + savefilename, async function (err) {
                        if (err) {
                            makeEntry = 0;
                            return { status: "failed", message: "Error accured while uplaod signature" };
                        }
                        else {
                            console.log('HHHHHHHHHHHHH');
                        }
                    });

                    if (makeEntry == 1) {
                        car_hand_over_data.signature = savefilename;
                        car_hand_over_data.car_defects_gallery = gallaryArray;

                        let car_hand_over = new CarHandOver(car_hand_over_data);
                        let data = await car_hand_over.save();

                        // after car handnover we need to change car booking status to -> in-progress
                        let booking_number = { booking_number: car_hand_over_data.booking_number };
                        let trip_status = { $set: { trip_status: 'inprogress' } };

                        await CarBooking.updateOne(booking_number, trip_status);

                        return { status: "success", message: "Car hand over successfully" };
                    }
                    else {
                        return { status: "failed", message: "Error accured while uplaod signature" };
                    }
                }
                else {
                    return { status: 'failed', message: "Enter valid signature formate" };
                }
            }
            else {
                return { status: 'failed', message: "Please enter your signature" };
            }
            // Signature save
        }
        else {
            return { status: 'failed', message: "Please enter signature" };
        }

    }
    catch (err) {
        return { status: 'failed', message: "Error accured while hand over car", err }
    }
};


// car_receive for agent app
carHelper.car_receive = async (req, car_handover_data) => {
    try {

        let car_hand_over_data = {
            'user_id': car_handover_data.user_id,
            'car_id': car_handover_data.car_id,
            'car_rental_company_id': car_handover_data.car_rental_company_id,//
            'agent_id': car_handover_data.agent_id,
            'defected_points': car_handover_data.defected_points,
            'milage': car_handover_data.milage,
            'petrol_tank': car_handover_data.petrol_tank,
            'notes': car_handover_data.notes ? car_handover_data.notes : null,
            'booking_number': car_handover_data.booking_number
        }
        // console.log('HElper =>', req.files)

        if (req.files) {
            if (req.files.car_defects_gallery) {
                // console.log('Gallary=>',req.files)
                var gallary = [];
                var gallaryArray = [];
                var gallary = req.files.car_defects_gallery;
                if (!Array.isArray(gallary)) {
                    gallary = [gallary];
                    console.log('DATATAT=>', gallary);
                }
                console.log('DATATAT=>', gallary);
                var dir = "./upload/car_defect";
                async.each(gallary, function (gal) {
                    var extention = paths.extname(gal.name);
                    var filename = "car_defect" + Date.now() + extention;
                    var filepath = dir + '/' + filename;

                    if (fs.existsSync(filepath)) {
                        filename = "car_defect" + Date.now() + 1 + extention;
                        filepath = dir + '/' + filename;
                    }
                    var json_gal = { name: filename, type: gal['mimetype'] }
                    gallaryArray.push(json_gal);

                    gal.mv(filepath, function (err) {
                        if (err) {
                            return { status: "failed", message: "Error accured while uplaod car defected images" };
                        }
                    });

                })

                console.log('Should come after==>');

                car_hand_over_data.car_defects_gallery = gallaryArray;
            }
        }


        // car_hand_over_data.car_defects_gallery = gallaryArray;

        let car_receive_data = new CarReceive(car_hand_over_data);
        let data = await car_receive_data.save();

        // after car receive we need to change car booking status to -> finished
        let booking_number = { booking_number: car_hand_over_data.booking_number };
        let trip_status = { $set: { trip_status: 'finished' } };

        await CarBooking.updateOne(booking_number, trip_status);

        return { status: "success", message: "Car has been receive successfully" };
    }
    catch (err) {
        return { status: 'failed', message: "Error accured while receive car", err }
    }
};



// Car report list user wise
carHelper.car_report_list = async (user_id) => {
    try {
        let data = await CarBooking.aggregate([
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
                $addFields: {
                    "car_details.car_brand": "$brand_details.brand_name",
                    "car_details.car_model": "$model_details.model_name",
                    "car_details.car_model_number": "$model_details.model_number",
                    "car_details.car_model_release_year": "$model_details.release_year"
                }
            },
            {
                // $match: {
                //     'isDeleted': false,
                //     'userId': new ObjectId(user_id),
                //     'from_time': {
                //         $gte: new Date(),
                //     }
                // }
                $match: {
                    'isDeleted': false,
                    'userId': new ObjectId(user_id),
                    'trip_status': { $in: ["inprogress", "finished", "upcoming"] }
                }
            }

        ]);
        if (data && data.length > 0) {
            return { status: 'success', message: "Car Reported list", data: { car_report_list: data } }
        }
        else {
            return { status: 'failed', message: "No car reported yet", data: data }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car report list" };
    }
};


// Report a car save into car_report collection
carHelper.car_report = async (report_data) => {
    try {
        let car_report_data = new CarReport(report_data);

        let data = await car_report_data.save();
        var car_report_status = await CarBooking.updateOne({ "booking_number": report_data.booking_number }, { $set: { "is_car_reported": true } })

        return { status: "success", message: "Car has been reported" };
    }
    catch (err) {
        return { status: 'failed', message: "Error accured while reporting car", err }
    }
};


// Resend invoice to customer via email
carHelper.resend_invoice = async (booking_number, email) => {
    try {
        let data = await CarBooking.aggregate([
            {
                $match: {
                    'isDeleted': false,
                    'booking_number': booking_number
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
                    from: "car_company",
                    foreignField: "_id",
                    localField: "car_details.car_rental_company_id",
                    as: 'carCompany_details'
                }
            },
            {
                $unwind: {
                    "path": "$carCompany_details",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $addFields: {
                    "car_details.car_brand": "$brand_details.brand_name",
                    "car_details.car_model": "$model_details.model_name",
                    "car_details.car_model_number": "$model_details.model_number",
                    "car_details.car_model_release_year": "$model_details.release_year",
                    "car_details.car_company_name": "$carCompany_details.name"
                }
            }
        ]);
        if (data && data.length > 0) {

            console.log('DATA==>', data);


            // send email to customer's email
            var options = {
                to: email,
                subject: 'ABHR - Resend Invoice'
            }
            let mail_resp = await mail_helper.sendEmail_carBook("car_booking", options, data);

            console.log('Mail Response ===>', mail_resp);

            if (mail_resp.status === 'success') {
                return { status: 'success', message: "Email has been sent to your email address", data: { emailData: mail_resp.data } }
            }
            else {
                return { status: 'failed', message: "Error accures while sending email to you" }
            }
        }
        else {
            return { status: 'failed', message: "No car book yet" }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car booking history", err };
    }
};


// change car booking details
carHelper.change_carBook = async (booking_number, data) => {
    try {
        var data = await CarBooking.updateOne({ "booking_number": booking_number }, { $set: data });
        if (data && data.n > 0) {
            return { status: 'success', message: "Car booking details has been changed" }
        }
        else {
            return { status: 'failed', message: "Car booking details has not been changed" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while change car booking details" };
    }
};


// Assign car to agent for delivery
carHelper.assign_car_to_agent = async (data) => {
    let car_assign = new CarAssign(data);
    try {
        var save_data = await car_assign.save()
        return { status: 'success', message: "Car has been assign to you" }
    } catch (err) {
        return { status: 'failed', message: "Error occured while assign car to agent" };
    }
};


module.exports = carHelper;