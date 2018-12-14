var Car = require('./../models/cars');

let carHelper = {};

carHelper.getAvailableCar = async function (fromDate, days, start = 0, length = 10) {
    try {
        const cars = await Car.aggregate([
            {
                "$match": {
                    is_avialable: true,
                    isDeleted: false
                }
            }, {
                "$skip": start
            }, {
                $limit: length
            }
        ]);

        if (cars && cars.length > 0) {
            return { status: 'success', message: "Car data found", data: cars }
        } else {
            return { status: 'failed', message: "No car available" };
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while fetching car list" };
    }
};

carHelper.getcarDetailbyId = async function (car_id) {
    try {
        const carDetail = await Car.find({ _id: car_id});

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