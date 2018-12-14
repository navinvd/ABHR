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
            return { status: 200, message: "Car data found", cars }
        } else {
            return { status: 400, message: "No car available" };
        }
    } catch (err) {
        return { status: 500, message: "Error occured while fetching car list", err };
    }
};

module.exports = carHelper;