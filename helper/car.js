var mongoose = require('mongoose');
var CarReview = require('./../models/car_review');
var ObjectId = mongoose.Types.ObjectId;
const Car = require('./../models/cars');
const CarBooking = require('./../models/car_booking');
const CarBrand = require('./../models/car_brand');
const CarCompany = require('./../models/car_company');
const CarModel = require('./../models/car_model');

let carHelper = {};

carHelper.getAvailableCar = async function (fromDate, days, start = 0, length = 10) {
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
                car_brand:"$brandDetails",
                car_model:"$modelDetails",
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
                carBookingDetailsDate: {
                    $dateToString: {
                        date: "$carBookingDetails.from_time",
                        format: "%Y-%m-%d"
                    }
                }
            }
        },
        {
            $match: {
                'isDeleted': false,
                'carBookingDetailsDate': { $ne: fromDate },
                'carBookingDetails.days': { $ne: days }
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
                "preserveNullAndEmptyArrays":true
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
        console.log("Default Query => ",JSON.stringify(defaultQuery));
        let cars = await Car.aggregate(defaultQuery);
        if (cars && cars.length > 0) {

            cars = cars.map((c) => {
                c.car["total_avg_rating"] = c.total_avg_rating;
                delete c.car.reviews;
                return c.car;
            })

            return { status: 'success', message: "Car data found", data: {cars: cars} }
        } else {
            return { status: 'success', message: "Car data found", data: {cars: cars} }
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
            $project: {
                _id: 1,
                car_rental_company_id: 1,
                car_brand:"$brandDetails.brand_name",
                car_model:"$modelDetails.model_name",
                car_model_number: "$modelDetails.model_number",
                car_model_release_year:"$modelDetails.release_year",
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
                image_name: { $arrayElemAt: [ "$car_gallery.name", 0 ] },
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
                "preserveNullAndEmptyArrays":true
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
                delete c.car.reviews;
                return c.car;
            })
            return { status: 'success', message: "Car data found", data: {carDetail : cars[0]} }
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
        let data = await car_review.save();
        return { status: 'success', message: "Car review has been added", data: data }
    } catch (err) {
        return { status: 'failed', message: "Error occured while adding car review" };
    }
};

// get car reviews
carHelper.getCarReviews = async (car_id) => {
    try {
        let data = await CarReview.find({ car_id: new ObjectId(car_id) }).lean().exec();

        if (data && data.length > 0) {
            return { status: 'success', message: "Car review has been found", data: data }
        }
        else {
            return { status: 'failed', message: "No car reviews yet", data: data }
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
                $match: {
                    'isDeleted': false,
                    'userId': new ObjectId(user_id),
                    'from_time': {
                        $lt: new Date(),
                    }
                }
            }
        ]);
        if (data && data.length > 0) {
            return { status: 'success', message: "Car booking past history", data: data }
        }
        else {
            return { status: 'failed', message: "No car book yet", data: data }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car booking past history"};
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
                $match: {
                    'isDeleted': false,
                    'userId': new ObjectId(user_id),
                    'from_time': {
                        $gte: new Date(),
                    }
                }
            }
           
        ]);
        if (data && data.length > 0) {
            return { status: 'success', message: "Car booking upcomming history", data: data }
        }
        else {
            return { status: 'failed', message: "No car book yet", data: data }
        }

    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car booking upcomming history"};
    }
};


carHelper.getBrandList = async () => {
    try {
        const carbrand = await CarBrand.find({ "isDeleted": false }, { _id: 1, brand_name: 1 });
        if (carbrand && carbrand.length > 0) {
            return { status: 'success', message: "Carbrand data found", data: carbrand }
        } else {
            return { status: 'failed', message: "No carbrand available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding data", err };
    }
}

//Get modellist by brand id
carHelper.getModelList = async (brandArray) => {
    try {
        const carmodels = await CarModel.find({ "isDeleted": false, "car_brand_id": { $in: brandArray } });
        if (carmodels && carmodels.length > 0) {
            return { status: 'success', message: "Car Models records found", data: carmodels }
        } else {
            return { status: 'failed', message: "No carmodel records not available" };
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
            return { status: 'success', message: "Car Notification records found", data: {carnotifications: carnotifications} }
        } else {
            return { status: 'failed', message: "Car Notification records not available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Oops! Something went wrong.., We canot find data", err };
    }
}

module.exports = carHelper;