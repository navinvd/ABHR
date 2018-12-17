var Car = require('./../models/cars');

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
        }
    ];

    try {
        const cars = await Car.aggregate(defaultQuery);
        if (cars && cars.length > 0) {
            return { status: 'success', message: "Car data found", data: cars }
        } else {
            return { status: 'failed', message: "No car available" };
        }
    } catch (err) {
        console.log("Err : ", err);
        return { status: 'failed', message: "Error occured while finding car", err };
    }

};

carHelper.getcarDetailbyId = async function (car_id) {
    try {
        const carDetail = await Car.find({ _id: car_id });

        if (carDetail && carDetail.length > 0) {
            return { status: 'success', message: "Car data found", data: carDetail }
        } else {
            return { status: 'failed', message: "No car available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car list" };
    }
};

module.exports = carHelper;