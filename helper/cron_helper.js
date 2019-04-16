const CarBooking = require('./../models/car_booking');
var moment = require('moment');
var async = require("async");

let cronHelper = {};
cronHelper.chekForBookingCompition = async function (fn_callback) {
    const currentDate = moment().utc();
    const yesterdayDate = moment().utc().subtract(1, 'day');
    const chekctime = moment(yesterdayDate).format("YYYY-MM-DD");
    console.log('utc time=====>', chekctime);

    try {
        var defaultQuery = [
            {
                $match: {
                    "isDeleted": false,
                    "agent_assign_for_handover": false,
                    "trip_status": "upcoming",
                    "createdAt": { $lte: new Date(chekctime) }
                }
            },
            {
                $project: {
                    "createdAt": 1,
                    "isDeleted": 1,
                    "trip_status": 1,
                    "createdAt": 1,
                }
            }
        ];
        console.log('defaultQuery==============>', JSON.stringify(defaultQuery));
        const bookingData = await CarBooking.aggregate(defaultQuery);
        if (bookingData && bookingData.length > 0) {
            bookingData.forEach(async booking => {
                var updateData = {
                    "cancel_date": currentDate,
                    "cancel_reason": 'Auto Cancelled',
                    "trip_status": "cancelled",
                    "transaction_status": "cancelled",
                    "cancellation_rate": null,
                    "cancellation_charge": 0,
                    "amount_return_to_user": 0
                }
                const updateBooking = await CarBooking.findByIdAndUpdate(booking._id, updateData);
                console.log('updateBooking => ', updateBooking);
            });
        }
        fn_callback(null, { status: 'success', message: 'Booking Cancelled' });
        console.log('bookingData*********** => ', bookingData);
    } catch (err) {
        fn_callback(err);
    }
}
module.exports = cronHelper;