var express = require('express');
var router = express.Router();

var config = require('./../../config');

const Car = require('./../../models/cars');
const CarBooking = require('./../../models/car_booking');
const Users = require('./../../models/users');
const CarAssign = require('./../../models/car_assign_agent');
const CarModel = require('./../../models/car_model');
const CarHandOver = require('./../../models/car_hand_over');
const CarHelper = require('./../../helper/car');
const smsHelper = require('./../../helper/sms');
const pushNotificationHelper = require('./../../helper/push_notification');
const commonHelper = require('./../../helper/common');
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

// [ 7. Rental list]
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
                latitude: 1,
                longitude: 1,
                coupon_code: 1,
                agent_assign_for_handover: 1,
                agent_assign_for_receive: 1,
                isDeleted: 1,
                image_name: "$carDetails.car_gallery",
                is_navigation: "$carDetails.is_navigation",
                is_AC: "$carDetails.is_AC",
                is_luggage_carrier: "$carDetails.is_luggage_carrier",
                driving_eligibility_criteria: "$carDetails.driving_eligibility_criteria",
                is_available: "$carDetails.is_available",
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

    if (req.body.confirm_rental) { // for upcomming car default filter
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.confirm_rental })
    }
    // else {
    //     apply_filter = 1
    //     match_object.push({ 'trip_status': 'upcoming' })
    // }

    if (req.body.cancellation) { // for cancelled car
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.cancellation })
    }

    if (req.body.deliverd_rental) { // car which is deliver to customer now come in in-progress status in db
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.deliverd_rental })
    }

    if (req.body.return) { // when customer apply for return car 
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.return })
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
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "No car data found"
                });
            }
        }
    });

});


// Booking details of any one car [ 8. Details of rental]
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
                $match: {
                    "booking_number": { $eq: req.body.booking_number }
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
                    total_avg_rating: 1,
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
                    latitude: 1,
                    longitude: 1,
                    coupon_code: 1,
                    coupon_percentage: 1,
                    isDeleted: 1,
                    vat: 1,
                    extended_days: 1,
                    agent_assign_for_handover: 1,
                    agent_assign_for_receive: 1,
                    car_handover_by_agent_id: 1,
                    car_receive_by_agent_id: 1,
                    image_name: "$carDetails.car_gallery",
                    deposite: "$carDetails.deposit",
                    is_navigation: "$carDetails.is_navigation",
                    is_AC: "$carDetails.is_AC",
                    is_luggage_carrier: "$carDetails.is_luggage_carrier",
                    driving_eligibility_criteria: "$carDetails.driving_eligibility_criteria",
                    is_available: "$carDetails.is_available",
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
                    age_of_car: "$carDetails.age_of_car",
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
                        if (c.car['car_handover_by_agent_id'] === undefined) {
                            c.car['car_handover_by_agent_id'] = null;
                        }
                        if (c.car['car_receive_by_agent_id'] === undefined) {
                            c.car['car_receive_by_agent_id'] = null;
                        }
                        /** below condition is temporary due to lack of data */
                        if (c.car['coupon_code'] === undefined) {
                            c.car['coupon_code'] = null;
                        }
                        if (c.car['first_name'] === undefined) {
                            c.car['first_name'] = 'test';
                        }
                        if (c.car['last_name'] === undefined) {
                            c.car['last_name'] = 'test';
                        }
                        if (c.car['phone_number'] === undefined) {
                            c.car['phone_number'] = '8956235610';
                        }
                        if (c.car['country_code'] === undefined) {
                            c.car['country_code'] = 'Dubai';
                        }
                        if (c.car['email'] === undefined) {
                            c.car['email'] = 'test@email.com';
                        }
                        /** ----------------------------------------------- */
                        c.car['total_avg_rating'] = c.total_avg_rating;

                        if (c.car['vat'] === undefined) {
                            c.car['vat'] = null
                        }
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

// car handover
/*
router.post('/handover', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id"
        },
        'agent_id': {
            notEmpty: true,
            errorMessage: "Please enter agent id"
        },
        'car_rental_company_id': {
            notEmpty: true,
            errorMessage: "Please enter rental company id"
        },
        'defected_points': {
            notEmpty: true,
            errorMessage: "Please enter car defecets points"
        },
        'milage': {
            notEmpty: true,
            errorMessage: "Please enter car milage"
        },
        'petrol_tank': {
            notEmpty: true,
            errorMessage: "Please enter car petrol tank fuel"
        },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number"
        }
    };
    req.checkBody(schema);
    // car_defects_gallery
    // notes
    var errors = req.validationErrors();
    if (!errors) {

        var hand_over_data = {
            'user_id': req.body.user_id,
            'car_id': req.body.car_id,
            'agent_id': req.body.agent_id,
            'car_rental_company_id': req.body.car_rental_company_id,
            'defected_points': req.body.defected_points,
            'milage': req.body.milage,
            'petrol_tank': req.body.petrol_tank,
            'notes': req.body.notes ? req.body.notes : null,
            'booking_number': req.body.booking_number
            // 'signature' : req.body.signature ?  req.body.signature : null,
            // 'car_defects_gallery' : req.body.car_defects_gallery ? req.body.car_defects_gallery : null,
        }

        const carHandOverResp = await CarHelper.car_handover(req, hand_over_data);
        console.log('RESP=>', carHandOverResp);


        if (carHandOverResp.status === 'success') {
            res.status(config.OK_STATUS).json(carHandOverResp)
        }
        else {
            res.status(config.BAD_REQUEST).json(carHandOverResp)
        }
        // res.json(carHandOverResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});
*/


// car receive 
router.post('/receive', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id"
        },
        'agent_id': {
            notEmpty: true,
            errorMessage: "Please enter agent id"
        },
        'car_rental_company_id': {
            notEmpty: true,
            errorMessage: "Please enter rental company id"
        },
        'defected_points': {
            notEmpty: true,
            errorMessage: "Please enter car defecets points"
        },
        'milage': {
            notEmpty: true,
            errorMessage: "Please enter car milage"
        },
        'petrol_tank': {
            notEmpty: true,
            errorMessage: "Please enter car petrol tank fuel"
        },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number"
        }
    };
    req.checkBody(schema);
    // car_defects_gallery
    // notes
    var errors = req.validationErrors();
    if (!errors) {

        var hand_over_data = {
            'user_id': req.body.user_id,
            'car_id': req.body.car_id,
            'agent_id': req.body.agent_id,
            'car_rental_company_id': req.body.car_rental_company_id,
            'defected_points': req.body.defected_points ? req.body.defected_points : [],
            'milage': req.body.milage,
            'petrol_tank': req.body.petrol_tank,
            'notes': req.body.notes ? req.body.notes : null,
            'booking_number': req.body.booking_number
            // 'signature' : req.body.signature ?  req.body.signature : null,
            // 'car_defects_gallery' : req.body.car_defects_gallery ? req.body.car_defects_gallery : null,
        }

        const carReceiveResp = await CarHelper.car_receive(req, hand_over_data);
        console.log('RESP=>', carReceiveResp);


        if (carReceiveResp.status === 'success') {
            // var car_avaibility = await Car.updateOne({_id : new ObjectId(req.body.car_id)}, { $set : { 'is_available' : true } } );              
            res.status(config.OK_STATUS).json(carReceiveResp)

            // send notification to user that your car is deliverd or handover to u
            const booking_number = req.body.booking_number;
            const userId = req.body.user_id;
            var msg = "Your car has been return successfully"; 
            commonHelper.sendNoti(userId, parseInt(booking_number), msg);

        }
        else {
            res.status(config.BAD_REQUEST).json(carReceiveResp)
        }
        // res.json(carReceiveResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


// check car assign or not to agent for delivery procuder

router.post('/assign_or_not', async (req, res) => {
    var schema = {
        'check_agent_for': {
            notEmpty: true,
            errorMessage: "Value should be one of this (delivery-process or return-process)"
        },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking id to assign for you"
        },
        'agent_id': {
            notEmpty: true,
            errorMessage: "Please enter agent id"
        },
        'car_rental_company_id': {
            notEmpty: true,
            errorMessage: "Please enter car company id"
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id"
        },
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        // req.body.booking_number
        try {

            var booking_details = await CarBooking.find({ booking_number: req.body.booking_number });

            if (booking_details && booking_details.length > 0) {

                var chk_agent_for = req.body.check_agent_for;

                if (chk_agent_for === 'delivery-process') {
                    if (booking_details[0].agent_assign_for_handover === false) {

                        var agent_data = {
                            'agent_id': req.body.agent_id,
                            'car_rental_company_id': req.body.car_rental_company_id,
                            'car_id': req.body.car_id,
                            'user_id': req.body.user_id,
                            'booking_number': req.body.booking_number,
                            'assign_for': 'handover',
                            'status': 'assign',
                            'trip_status': 'upcoming'
                        }

                        var carAssignResp = await CarHelper.assign_car_to_agent(agent_data);

                        if (carAssignResp.status === 'success') {
                            // update car_booking table

                            var newdata = {
                                'car_handover_by_agent_id': new ObjectId(req.body.agent_id),
                                'agent_assign_for_handover': true
                            }

                            // boking update
                            var bookingUpdate = await CarBooking.updateOne({ 'booking_number': req.body.booking_number }, { $set: newdata })

                            if (bookingUpdate && bookingUpdate.n > 0) {
                                // after booking update
                                // update car_assign_agent table
                                // var update_car_assign_agent = CarAssign.updateOne({'agent_id' : new ObjectId(req.body.agent_id) },{ $set : { 'trip_status' : 'upcoming' } });

                                // if(update_car_assign_agent && update_car_assign_agent.n > 0){
                                //     res.status(config.OK_STATUS).json(carAssignResp)
                                // }
                                // else{
                                //     res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while update car_assign_agent collection" })
                                // }
                                res.status(config.OK_STATUS).json(carAssignResp)
                            }
                            else {
                                // not update
                                res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while update car booking collection" })
                            }

                        }
                        else {
                            res.status(config.BAD_REQUEST).json(carAssignResp)
                        }

                    }
                    else {
                        var searchData = {
                            "agent_id": req.body.agent_id,
                            "booking_number": req.body.booking_number,
                            "assign_for": "handover" // now
                        }
                        var data = await CarAssign.find(searchData);

                        if (data && data.length > 0) {
                            // allow agent to move ahead 
                            res.status(config.OK_STATUS).json({ status: 'success', message: "Car has been assigned to you" })
                        }
                        else {
                            // car assign already
                            res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Car has been al-ready assigned to other agent" })
                        }
                    }
                }
                else if (chk_agent_for === 'return-process') {

                    if (booking_details[0].agent_assign_for_receive === false) {

                        var agent_data = {
                            'agent_id': req.body.agent_id,
                            'car_rental_company_id': req.body.car_rental_company_id,
                            'car_id': req.body.car_id,
                            'user_id': req.body.user_id,
                            'booking_number': req.body.booking_number,
                            'assign_for': 'receive',
                            'status': 'assign',
                            'trip_status': 'return'
                        }

                        var carAssignResp = await CarHelper.assign_car_to_agent(agent_data);

                        if (carAssignResp.status === 'success') {
                            // update car_booking table

                            var newdata = {
                                'car_receive_by_agent_id': new ObjectId(req.body.agent_id),
                                'agent_assign_for_receive': true
                            }

                            var bookingUpdate = await CarBooking.updateOne({ 'booking_number': req.body.booking_number }, { $set: newdata })

                            if (bookingUpdate && bookingUpdate.n > 0) {
                                // after booking update
                                // update car_assign_agent table
                                // var update_car_assign_agent = CarAssign.updateOne({'agent_id' : new ObjectId(req.body.agent_id) },{ $set : { 'trip_status' : 'return' } });

                                // if(update_car_assign_agent && update_car_assign_agent.n > 0){
                                //     res.status(config.OK_STATUS).json(carAssignResp)
                                // }
                                // else{
                                //     res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while update car_assign_agent collection" })
                                // }

                                res.status(config.OK_STATUS).json(carAssignResp)
                            }
                            else {
                                // not update
                                res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while update car booking collection" })
                            }

                        }
                        else {
                            res.status(config.BAD_REQUEST).json(carAssignResp)
                        }

                    }
                    else {
                        var searchData = {
                            "agent_id": req.body.agent_id,
                            "booking_number": req.body.booking_number,
                            "assign_for": "receive" // now
                        }
                        var data = await CarAssign.find(searchData);

                        if (data && data.length > 0) {
                            // allow agent to move ahead 
                            res.status(config.OK_STATUS).json({ status: 'success', message: "Car has been assigned to you" })
                        }
                        else {
                            // car assign already
                            res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Car has been al-ready assigned to other agent" })
                        }
                    }

                }
                else {
                    res.status(config.BAD_REQUEST).json({ status: 'failed', message: "check agent for Value should be one of this (delivery-process or return-process)" });
                }

            }
            else {
                res.status(config.BAD_REQUEST).json({ status: 'failed', message: "No booking is available for this booking number" })
            }

        }
        catch (err) {
            res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while cheking car has been assign or not to agent", err })
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


// check car assign or not to agent for delivery procuder - v2
router.post('/assign_or_not-v2', async (req, res) => {
    var schema = {
        'check_agent_for': {
            notEmpty: true,
            errorMessage: "Value should be one of this (delivery-process or return-process)"
        },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking id to assign for you"
        },
        'agent_id': {
            notEmpty: true,
            errorMessage: "Please enter agent id"
        },
        'car_rental_company_id': {
            notEmpty: true,
            errorMessage: "Please enter car company id"
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id"
        },
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'agent_phone_number': {
            notEmpty: true,
            errorMessage: "Please enter agent phone number"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        // req.body.booking_number
        try {

            var booking_details = await CarBooking.find({ booking_number: req.body.booking_number });

            if (booking_details && booking_details.length > 0) {

                var chk_agent_for = req.body.check_agent_for;

                if (chk_agent_for === 'delivery-process') {
                    if (booking_details[0].agent_assign_for_handover === false) {

                        var agent_data = {
                            'agent_id': req.body.agent_id,
                            'car_rental_company_id': req.body.car_rental_company_id,
                            'car_id': req.body.car_id,
                            'user_id': req.body.user_id,
                            'booking_number': req.body.booking_number,
                            'assign_for': 'handover',
                            'status': 'assign',
                            'trip_status': 'upcoming',
                            'assign_for_handover': true,
                            'assign_for_receive': false
                        }

                        var carAssignResp = await CarHelper.assign_car_to_agent(agent_data);

                        if (carAssignResp.status === 'success') {

                            // add this later on
                            var msg = "Your car is getting ready we will notify you once our agent is on their way to deliver you car";
                            commonHelper.sendNoti(req.body.user_id, req.body.booking_number, msg);

                            // update car_booking table

                            var newdata = {
                                'car_handover_by_agent_id': new ObjectId(req.body.agent_id),
                                'agent_assign_for_handover': true,
                                'agent_phone_number': req.body.agent_phone_number // add new
                            }

                            // boking update
                            var bookingUpdate = await CarBooking.updateOne({ 'booking_number': req.body.booking_number }, { $set: newdata })

                            if (bookingUpdate && bookingUpdate.n > 0) {
                                // after booking update
                                // update car_assign_agent table
                                // var update_car_assign_agent = CarAssign.updateOne({'agent_id' : new ObjectId(req.body.agent_id) },{ $set : { 'trip_status' : 'upcoming' } });

                                // if(update_car_assign_agent && update_car_assign_agent.n > 0){
                                //     res.status(config.OK_STATUS).json(carAssignResp)
                                // }
                                // else{
                                //     res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while update car_assign_agent collection" })
                                // }
                                res.status(config.OK_STATUS).json(carAssignResp)
                            }
                            else {
                                // not update
                                res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while update car booking collection" })
                            }

                        }
                        else {
                            res.status(config.BAD_REQUEST).json(carAssignResp)
                        }
                    }
                    else {
                        var searchData = {
                            "agent_id": req.body.agent_id,
                            "booking_number": req.body.booking_number,
                            // "assign_for": "handover" // now
                            "assign_for_handover": true // change now
                        }
                        var data = await CarAssign.find(searchData);

                        if (data && data.length > 0) {
                            // allow agent to move ahead 
                            res.status(config.OK_STATUS).json({ status: 'success', message: "Car has been assigned to you" })
                        }
                        else {
                            // car assign already
                            res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Car has been al-ready assigned to other agent" })
                        }
                    }
                }
                else if (chk_agent_for === 'return-process') {

                    if (booking_details[0].agent_assign_for_receive === false) {

                        // before entry in db check if same user allocated for handover & receive then just update record

                        var chk_agent = {
                            "agent_id": req.body.agent_id,
                            "booking_number": req.body.booking_number,
                            "assign_for": "handover"
                        }


                        /// check same agent is requesting or not to assign car for return

                        var get_agent = await CarAssign.find(chk_agent);

                        if (get_agent && get_agent.length > 0) {

                            //add this later
                            var msg = "Your car is getting ready we will notify you once our agent is on their way to returning car from you";
                            commonHelper.sendNoti(req.body.user_id, req.body.booking_number, msg);

                            // alredy assign for handover so just update his entry
                            var data = await CarAssign.updateOne(chk_agent, { $set: { 'trip_status': 'return', 'assign_for_receive': true } });

                            if (data && data.n > 0) {

                                var newdata = {
                                    'car_receive_by_agent_id': new ObjectId(req.body.agent_id),
                                    'agent_assign_for_receive': true,
                                    'agent_phone_number': req.body.agent_phone_number // add new
                                }

                                var bookingUpdate = await CarBooking.updateOne({ 'booking_number': req.body.booking_number }, { $set: newdata })

                                if (bookingUpdate && bookingUpdate.n > 0) {

                                    res.status(config.OK_STATUS).json({ status: 'success', message: "Car has been assign to you" })
                                }
                                else {
                                    // not update
                                    res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while update car booking collection" })
                                }

                            }
                            else {
                                res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while update car agent assign collection" })
                            }

                        }
                        else {
                            // make new entry

                            var agent_data = {
                                'agent_id': req.body.agent_id,
                                'car_rental_company_id': req.body.car_rental_company_id,
                                'car_id': req.body.car_id,
                                'user_id': req.body.user_id,
                                'booking_number': req.body.booking_number,
                                'assign_for': 'receive',
                                'status': 'assign',
                                'trip_status': 'return',
                                'assign_for_handover': false, //chk this later on remind me
                                'assign_for_receive': true
                            }


                            var carAssignResp = await CarHelper.assign_car_to_agent(agent_data);

                            if (carAssignResp.status === 'success') {

                                //add this later
                                var msg = "Your car is getting ready we will notify you once our agent is on their way to returning car from you";
                                commonHelper.sendNoti(req.body.user_id, req.body.booking_number, msg);

                                // update car_booking table
                                var newdata = {
                                    'car_receive_by_agent_id': new ObjectId(req.body.agent_id),
                                    'agent_assign_for_receive': true,
                                    'agent_phone_number': req.body.agent_phone_number // add new
                                }

                                var bookingUpdate = await CarBooking.updateOne({ 'booking_number': req.body.booking_number }, { $set: newdata })

                                if (bookingUpdate && bookingUpdate.n > 0) {

                                    res.status(config.OK_STATUS).json(carAssignResp)
                                }
                                else {
                                    // not update
                                    res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while update car booking collection" })
                                }

                            }
                            else {
                                res.status(config.BAD_REQUEST).json(carAssignResp)
                            }

                        }

                        ////
                    }
                    else {
                        var searchData = {
                            "agent_id": req.body.agent_id,
                            "booking_number": req.body.booking_number,
                            //   "assign_for": "receive" // now
                            "assign_for_receive": true // now change
                        }
                        var data = await CarAssign.find(searchData);

                        if (data && data.length > 0) {
                            // allow agent to move ahead 
                            res.status(config.OK_STATUS).json({ status: 'success', message: "Car has been assigned to you" })
                        }
                        else {
                            // car assign already
                            res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Car has been al-ready assigned to other agent" })
                        }
                    }

                }
                else {
                    res.status(config.BAD_REQUEST).json({ status: 'failed', message: "check agent for Value should be one of this (delivery-process or return-process)" });
                }

            }
            else {
                res.status(config.BAD_REQUEST).json({ status: 'failed', message: "No booking is available for this booking number" })
            }

        }
        catch (err) {
            res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while cheking car has been assign or not to agent", err })
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







// Track Location 
// car returning process only chang trip status to returning
router.post('/returning', async (req, res) => {
    var schema = {
        'booking_number': {
            notEmpty: true,
            errorMessage: "Enter booking number"
        },
        // 'type': {
        //     notEmpty: true,
        //     errorMessage: "Enter type eg( delivering or returning)"
        // }
        // 'lattitude' : {
        //     notEmpty: true,
        //     errorMessage: "Enter current latitude"
        // },
        // 'longitude': {
        //     notEmpty: true,
        //     errorMessage: "Enter current longitude"
        // }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        // pending  (socket event receive from ANDROID and emit to IOS )
        try {
            // var booking_details = await CarBooking.updateOne({ 'booking_number': req.body.booking_number }, { $set: { 'trip_status': 'delivering' } });
            var booking_details = await CarBooking.updateOne({ 'booking_number': req.body.booking_number }, { $set: { 'trip_status': 'returning' } });

            if (booking_details && booking_details.n > 0) {
                var cond = { 'booking_number': req.body.booking_number, 'assign_for_receive': true }
                var CarAssignData = await CarAssign.updateOne(cond, { $set: { 'trip_status': 'returning' } });

                if (CarAssignData && CarAssignData.n > 0) {

                    res.status(config.OK_STATUS).json({ status: 'success', message: "Car returning process has been started" })
                }
                else {
                    res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Car returning process has not been started" })
                }

            }
            else {
                res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Car returning process has not been started" })
            }
        }
        catch (err) {
            res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while start returning process", err })
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


// car returning version 2 process only chang trip status to returning
router.post('/returning_v2', async (req, res) => {
    var schema = {
        'booking_number': {
            notEmpty: true,
            errorMessage: "Enter booking number"
        },
        // 'type': {
        //     notEmpty: true,
        //     errorMessage: "Enter type eg( delivering or returning)"
        // }
        'lattitude': {
            notEmpty: true,
            errorMessage: "Enter current latitude"
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Enter current longitude"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        // pending  (socket event receive from ANDROID and emit to IOS )
        try {
            var obj = {
                'trip_status': 'returning',
                'return_source_location': [req.body.longitude, req.body.lattitude],
                'last_location': [req.body.longitude, req.body.lattitude]
            }
            // var booking_details = await CarBooking.updateOne({ 'booking_number': req.body.booking_number }, { $set: { 'trip_status': 'delivering' } });
            var booking_details = await CarBooking.updateOne({ 'booking_number': req.body.booking_number }, { $set: obj });

            if (booking_details && booking_details.n > 0) {
                var cond = { 'booking_number': req.body.booking_number, 'assign_for_receive': true }
                var CarAssignData = await CarAssign.updateOne(cond, { $set: { 'trip_status': 'returning' } });

                if (CarAssignData && CarAssignData.n > 0) {

                    res.status(config.OK_STATUS).json({ status: 'success', message: "Car returning process has been started" })
                }
                else {
                    res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Car returning process has not been started" })
                }

            }
            else {
                res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Car returning process has not been started" })
            }
        }
        catch (err) {
            res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while start returning process", err })
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


// car returning version 3 process only chang trip status to returning
router.post('/returning_v3', async (req, res) => {
    var schema = {
        'booking_number': {
            notEmpty: true,
            errorMessage: "Enter booking number"
        },
        // 'type': {
        //     notEmpty: true,
        //     errorMessage: "Enter type eg( delivering or returning)"
        // }
        'lattitude': {
            notEmpty: true,
            errorMessage: "Enter current latitude"
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Enter current longitude"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        // pending  (socket event receive from ANDROID and emit to IOS )
        try {
            var obj1 = {
                'trip_status': 'returning',
                'return_source_location': [req.body.longitude, req.body.lattitude],
                'last_location': [req.body.longitude, req.body.lattitude]
            }
            // var booking_details = await CarBooking.updateOne({ 'booking_number': req.body.booking_number }, { $set: { 'trip_status': 'delivering' } });
            var booking_details = await CarBooking.updateOne({ 'booking_number': req.body.booking_number }, { $set: obj1 });

            if (booking_details && booking_details.n > 0) {
                var cond = { 'booking_number': req.body.booking_number, 'assign_for_receive': true }
                var CarAssignData = await CarAssign.updateOne(cond, { $set: { 'trip_status': 'returning' } });

                var user_id = await CarBooking.findOne({ 'booking_number': req.body.booking_number }, { _id: 0, userId: 1 }).lean().exec();
                var userDeviceToken = await Users.find({ '_id': new ObjectId(user_id.userId) }, { _id: 1, deviceToken: 1, phone_number: 1, deviceType: 1 }).lean().exec();
                var deviceToken = null;
                console.log('User token =>', userDeviceToken);
                if (userDeviceToken[0].deviceToken !== undefined && userDeviceToken[0].deviceToken !== null) {
                    if (userDeviceToken[0].deviceToken.length > 10) { // temp condition
                        // agentDeviceTokenArray.push(agent.deviceToken);
                        deviceToken = userDeviceToken[0].deviceToken;
                    }
                }

                var notificationType = 1; // means notification for booking 
                var msg = "Your agent is on returning track";
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

                if (CarAssignData && CarAssignData.n > 0) {

                    res.status(config.OK_STATUS).json({ status: 'success', message: "Car returning process has been started" })
                }
                else {
                    res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Car returning process has not been started" })
                }

            }
            else {
                res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Car returning process has not been started" })
            }
        }
        catch (err) {
            res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while start returning process", err })
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




// Booking Details v2 [IOS] 
// not use yet but may be usefull in car detail page while cancel booking screen
router.post('/booking-details123', async (req, res) => {
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
                $match: {
                    "booking_number": { $eq: req.body.booking_number }
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
                    from: 'car_company_terms_and_condition',
                    foreignField: 'CompanyId',
                    localField: 'carDetails.car_rental_company_id',
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
                    localField: 'carDetails.car_rental_company_id',
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
                    // car_book_from_date: {
                    //     $dateToString: {
                    //         date: "$from_time",
                    //         format: "%Y-%m-%d"
                    //     }
                    // },
                    // car_book_to_date: {
                    //     $dateToString: {
                    //         date: "$to_time",
                    //         format: "%Y-%m-%d"
                    //     }
                    // },
                    car_book_from_date: "$from_time",
                    car_book_to_date: "$to_time",
                    days: 1,
                    booking_rent: 1,
                    trip_status: 1,
                    delivery_address: 1,
                    delivery_time: 1,
                    total_booking_amount: 1,
                    latitude: 1,
                    longitude: 1,
                    coupon_code: 1,
                    coupon_percentage: 1,
                    isDeleted: 1,
                    agent_assign_for_handover: 1,
                    agent_assign_for_receive: 1,
                    car_handover_by_agent_id: 1,
                    car_receive_by_agent_id: 1,
                    is_navigation: "$carDetails.is_navigation",
                    is_AC: "$carDetails.is_AC",
                    is_luggage_carrier: "$carDetails.is_luggage_carrier",
                    driving_eligibility_criteria: "$carDetails.driving_eligibility_criteria",
                    is_available: "$carDetails.is_available",
                    is_delieverd: "$carDetails.is_delieverd",
                    car_model_id: "$carDetails.car_model_id",
                    car_brand_id: "$carDetails.car_brand_id",
                    car_rental_company_id: "$carDetails.car_rental_company_id",
                    car_rental_company_country: "$companyDetails.company_address.country",
                    car_rental_company_name: "$companyDetails.name",
                    phone_number: "$companyDetails.phone_number",
                    terms_and_conditions: "$termandconditionDetails.terms_and_conditions",
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
                    car_gallery: "$carDetails.car_gallery",
                    // image_name: { $arrayElemAt: ["$car_gallery.name", 0] },
                }
            }
        ]

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

                    console.log('DATE NOW :-', moment(Date.now()).format('YYYY-MM-DD'))
                    // var currentDate = moment(Date.now()).format('YYYY-MM-DD');
                    var currentDate = moment().toDate().toISOString(Date.now());
                    // console.log('DATA=>',data);
                    var data = data.map((c) => {
                        // if (c['image_name'] === undefined) {
                        //     c['image_name'] = null
                        // }
                        if (c['car_gallery'] === undefined) {
                            c['car_gallery'] = []
                        }
                        if (c['terms_and_conditions'] === undefined) {
                            c['terms_and_conditions'] = null
                        }
                        if (c['car_rental_company_country'] === undefined) {
                            c['car_rental_company_country'] = null
                        }
                        // if(currentDate >= c['car_book_from_date'] && currentDate <= c['car_book_to_date'] )
                        if (moment(currentDate) >= moment(c['car_book_from_date'])) {
                            c['call_or_not'] = 'yes' // place manual call
                        }
                        else {
                            c['call_or_not'] = 'no' // not call 
                        }

                        if (c['phone_number'] === undefined) {
                            c['phone_number'] = ''
                        }

                        return c;
                    })

                    res.status(config.OK_STATUS).json({
                        status: "success",
                        message: "Car booking details has been found",
                        data: { cars: data },
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




// car list V2
router.post('/car-list-v2', async (req, res) => {

    var defaultQuery = [
        {
            $match: { 'agent_id': new ObjectId(req.body.agent_id) }
        },
        {
            $lookup: {
                from: 'cars',
                foreignField: '_id',
                localField: 'car_id',
                as: "carDetails"
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
                as: "modelDetails"
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
                as: "brandDetails"
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
                foreignField: 'booking_number',
                localField: 'booking_number',
                as: "bookingDetails"
            }
        },
        {
            $unwind: {
                "path": "$bookingDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $project: {
                _id: 1,
                booking_number: 1,
                userId: "$bookingDetails.userId",
                carId: "$bookingDetails.carId",
                // user_id : 1,
                // car_id : 1,
                car_rental_company_id: 1,
                isDeleted: 1,
                trip_status: 1,

                car_book_from_date: {
                    $dateToString: {
                        date: "$bookingDetails.from_time",
                        format: "%Y-%m-%d"
                    }
                },
                car_book_to_date: {
                    $dateToString: {
                        date: "$bookingDetails.to_time",
                        format: "%Y-%m-%d"
                    }
                },

                days: "$bookingDetails.days",
                booking_rent: "$bookingDetails.booking_rent",

                delivery_address: "$bookingDetails.delivery_address",
                delivery_time: "$bookingDetails.delivery_time",
                total_booking_amount: "$bookingDetails.total_booking_amount",
                latitude: "$bookingDetails.latitude",
                longitude: "$bookingDetails.latitude",
                coupon_code: "$bookingDetails.coupon_code",
                agent_assign_for_handover: "$bookingDetails.agent_assign_for_handover",
                agent_assign_for_receive: "$bookingDetails.agent_assign_for_receive",

                image_name: "$carDetails.car_gallery",
                is_navigation: "$carDetails.is_navigation",
                is_AC: "$carDetails.is_AC",
                is_luggage_carrier: "$carDetails.is_luggage_carrier",
                driving_eligibility_criteria: "$carDetails.driving_eligibility_criteria",
                is_available: "$carDetails.is_available",
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

    if (req.body.confirm_rental) { // for upcomming car 
        apply_filter = 1
        // match_object.push({ 'trip_status': req.body.confirm_rental })
        match_object.push({ 'trip_status': { $in: [req.body.confirm_rental, 'delivering'] } })
    }

    if (req.body.cancellation) { // for cancelled car
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.cancellation })
    }

    if (req.body.deliverd_rental) { // car which is deliver to customer now come in in-progress status in db
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.deliverd_rental })
    }

    if (req.body.return) { // when customer apply for return car 
        apply_filter = 1
        match_object.push({ 'trip_status': { $in: [req.body.return, 'returning'] } })
    }

    if (req.body.today) {
        var searchQuery = {
            "$match": {
                car_book_from_date: req.body.today
            }
        }
        defaultQuery.splice(10, 0, searchQuery); //7
    }

    if (apply_filter === 1) {
        var searchQuery = {
            "$match": {
                $or: match_object
            }
        }
        defaultQuery.splice(10, 0, searchQuery); //7
    }

    var sortData = {
        $sort: { 'booking_number': -1 }
    }

    defaultQuery.push(sortData);

    console.log('Match Condition ====>', match_object);
    console.log('Default Query========>', JSON.stringify(defaultQuery));

    CarAssign.aggregate(defaultQuery, function (err, data) {
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
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "No car data found"
                });
            }
        }
    });

});



/// new Api car list 123 testing car which has not been assign yet list [Test]
router.post('/car-list-123', async (req, res) => {

    var defaultQuery = [
        {
            $match: {
                $or: [
                    {
                        $and: [
                            { "trip_status": "upcoming" },
                            { "agent_assign_for_handover": false }
                        ]
                    },
                    {
                        $and: [
                            { "trip_status": "return" },
                            { "agent_assign_for_receive": false }
                        ]
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'cars',
                foreignField: '_id',
                localField: 'carId',
                as: "carDetails"
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
                as: "modelDetails"
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
                as: "brandDetails"
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
                car_rental_company_id: "$carDetails.car_rental_company_id",
                isDeleted: 1,
                trip_status: 1,

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

                delivery_address: 1,
                delivery_time: 1,
                total_booking_amount: 1,
                latitude: 1,
                longitude: 1,
                coupon_code: 1,
                agent_assign_for_handover: 1,
                agent_assign_for_receive: 1,

                image_name: "$carDetails.car_gallery",
                is_navigation: "$carDetails.is_navigation",
                is_AC: "$carDetails.is_AC",
                is_luggage_carrier: "$carDetails.is_luggage_carrier",
                driving_eligibility_criteria: "$carDetails.driving_eligibility_criteria",
                is_available: "$carDetails.is_available",
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

    var sortData = {
        $sort: { 'booking_number': -1 }
    }

    defaultQuery.push(sortData);

    // console.log('Match Condition ====>', match_object);
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
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "No car data found"
                });
            }
        }
    });

});


// Modify car list v3 [Final]
router.post('/car-list-v3', async (req, res) => {

    var defaultQuery = [
        {
            $match: { 'agent_id': new ObjectId(req.body.agent_id) }
        },
        {
            $lookup: {
                from: 'cars',
                foreignField: '_id',
                localField: 'car_id',
                as: "carDetails"
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
                as: "modelDetails"
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
                as: "brandDetails"
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
                foreignField: 'booking_number',
                localField: 'booking_number',
                as: "bookingDetails"
            }
        },
        {
            $unwind: {
                "path": "$bookingDetails",
                "preserveNullAndEmptyArrays": true
            }
        },
        {
            $project: {
                _id: 1,
                booking_number: 1,
                userId: "$bookingDetails.userId",
                carId: "$bookingDetails.carId",
                // user_id : 1,
                // car_id : 1,
                car_rental_company_id: 1,
                isDeleted: 1,
                trip_status: 1,
                vat: "$bookingDetails.vat",

                car_book_from_date: {
                    $dateToString: {
                        date: "$bookingDetails.from_time",
                        format: "%Y-%m-%d"
                    }
                },
                car_book_to_date: {
                    $dateToString: {
                        date: "$bookingDetails.to_time",
                        format: "%Y-%m-%d"
                    }
                },

                days: "$bookingDetails.days",
                extended_days: "$bookingDetails.extended_days",
                booking_rent: "$bookingDetails.booking_rent",

                delivery_address: "$bookingDetails.delivery_address",
                delivery_time: "$bookingDetails.delivery_time",
                total_booking_amount: "$bookingDetails.total_booking_amount",
                latitude: "$bookingDetails.latitude",
                longitude: "$bookingDetails.latitude",
                coupon_code: "$bookingDetails.coupon_code",
                agent_assign_for_handover: "$bookingDetails.agent_assign_for_handover",
                agent_assign_for_receive: "$bookingDetails.agent_assign_for_receive",

                image_name: "$carDetails.car_gallery",
                is_navigation: "$carDetails.is_navigation",
                is_AC: "$carDetails.is_AC",
                is_luggage_carrier: "$carDetails.is_luggage_carrier",
                driving_eligibility_criteria: "$carDetails.driving_eligibility_criteria",
                is_available: "$carDetails.is_available",
                is_delieverd: "$carDetails.is_delieverd",
                car_rental_company_id: "$carDetails.car_rental_company_id",
                no_of_person: "$carDetails.no_of_person",
                transmission: "$carDetails.transmission",
                milage: "$carDetails.milage",
                car_class: "$carDetails.car_class",
                licence_plate: "$carDetails.licence_plate",
                car_color: "$carDetails.car_color",
                age_of_car: "$carDetails.age_of_car",
                car_brand: "$brandDetails.brand_name",
                car_model: "$modelDetails.model_name",
                car_model_number: "$modelDetails.model_number",
                car_model_release_year: "$modelDetails.release_year",

            }
        }

    ];

    var match_object = [];
    var apply_filter = 0; // not applying now

    if (req.body.confirm_rental) { // for upcomming car default filter
        apply_filter = 1
        // match_object.push({ 'trip_status': req.body.confirm_rental })
        match_object.push({ 'trip_status': { $in: [req.body.confirm_rental, 'delivering'] } })
    }

    if (req.body.cancellation) { // for cancelled car
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.cancellation })
    }

    if (req.body.deliverd_rental) { // car which is deliver to customer now come in in-progress status in db
        apply_filter = 1
        match_object.push({ 'trip_status': req.body.deliverd_rental })
    }

    if (req.body.return) { // when customer apply for return car 
        apply_filter = 1
        // match_object.push({ 'trip_status': req.body.return })
        match_object.push({ 'trip_status': { $in: [req.body.return, 'returning', 'finished'] } })
    }

    if (req.body.today) {
        var searchQuery = {
            "$match": {
                car_book_from_date: req.body.today
            }
        }
        defaultQuery.splice(10, 0, searchQuery); //7
    }

    if (apply_filter === 1) {
        var searchQuery = {
            "$match": {
                $or: match_object
            }
        }
        defaultQuery.splice(10, 0, searchQuery); //7
    }

    var sortData = {
        $sort: { 'booking_number': -1 }
    }

    defaultQuery.push(sortData);

    console.log('Match Condition ====>', match_object);
    console.log('Default Query========>', JSON.stringify(defaultQuery));


    var queryResult1 = await CarAssign.aggregate(defaultQuery);
    // console.log('QUERY RESULT 1 =>', queryResult1);



    // Query 2

    var defaultQuery2 = [
        {
            $match: {
                $or: [
                    {
                        $and: [
                            { "trip_status": "upcoming" },
                            { "agent_assign_for_handover": false }
                        ]
                    },
                    {
                        $and: [
                            { "trip_status": "return" },
                            { "agent_assign_for_receive": false }
                        ]
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'cars',
                foreignField: '_id',
                localField: 'carId',
                as: "carDetails"
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
                as: "modelDetails"
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
                as: "brandDetails"
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
                car_rental_company_id: "$carDetails.car_rental_company_id",
                isDeleted: 1,
                trip_status: 1,
                vat: 1,

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
                extended_days: 1,
                booking_rent: 1,

                delivery_address: 1,
                delivery_time: 1,
                total_booking_amount: 1,
                latitude: 1,
                longitude: 1,
                coupon_code: 1,
                agent_assign_for_handover: 1,
                agent_assign_for_receive: 1,

                image_name: "$carDetails.car_gallery",
                is_navigation: "$carDetails.is_navigation",
                is_AC: "$carDetails.is_AC",
                is_luggage_carrier: "$carDetails.is_luggage_carrier",
                driving_eligibility_criteria: "$carDetails.driving_eligibility_criteria",
                is_available: "$carDetails.is_available",
                is_delieverd: "$carDetails.is_delieverd",
                car_rental_company_id: "$carDetails.car_rental_company_id",
                no_of_person: "$carDetails.no_of_person",
                transmission: "$carDetails.transmission",
                milage: "$carDetails.milage",
                car_class: "$carDetails.car_class",
                licence_plate: "$carDetails.licence_plate",
                car_color: "$carDetails.car_color",
                age_of_car: "$carDetails.age_of_car",
                car_brand: "$brandDetails.brand_name",
                car_model: "$modelDetails.model_name",
                car_model_number: "$modelDetails.model_number",
                car_model_release_year: "$modelDetails.release_year",

            }
        }

    ];


    var match_object2 = [];
    var apply_filter2 = 0; // not applying now

    if (req.body.confirm_rental) { // for upcomming car 
        apply_filter2 = 1
        match_object2.push({ 'trip_status': req.body.confirm_rental })

    }

    if (req.body.cancellation) { // for cancelled car
        apply_filter2 = 1
        match_object2.push({ 'trip_status': req.body.cancellation })
    }

    if (req.body.deliverd_rental) { // car which is deliver to customer now come in in-progress status in db
        apply_filter2 = 1
        match_object2.push({ 'trip_status': req.body.deliverd_rental })
    }

    if (req.body.return) { // when customer apply for return car 
        apply_filter2 = 1
        match_object2.push({ 'trip_status': req.body.return })
    }

    if (req.body.today) {
        var searchQuery2 = {
            "$match": {
                car_book_from_date: req.body.today
            }
        }
        defaultQuery2.splice(8, 0, searchQuery2); //7
    }

    if (apply_filter2 === 1) {
        var searchQuery2 = {
            "$match": {
                $or: match_object
            }
        }
        defaultQuery2.splice(8, 0, searchQuery2); //7
    }



    var sortData2 = {
        $sort: { 'booking_number': -1 }
    }

    defaultQuery2.push(sortData2);

    // console.log('Match Condition ====>', match_object);
    console.log('Default Query 2========>', JSON.stringify(defaultQuery2));

    var queryResult2 = await CarBooking.aggregate(defaultQuery2)

    // console.log('QUERY RESULT 2 =>', queryResult2);

    // res.json('ok');

    var finalData = queryResult1.concat(queryResult2);

    if (finalData.length > 0) {

        var finalData = finalData.map((c) => {
            if (c['image_name'] === undefined) {
                c['image_name'] = null
            }
            if (c['vat'] === undefined) {
                c['vat'] = null
            }
            return c;
        })

        finalData.sort(function (a, b) { // Desc sort
            return parseFloat(b.booking_number) - parseFloat(a.booking_number);
        });


        res.status(config.OK_STATUS).json({ status: "success", message: "Car has been found", data: { cars: finalData } });
    }
    else {
        res.status(config.BAD_REQUEST).json({ status: "failed", message: "Car has not been found" });
    }

});


// car Delivering process (change trip_status to delivering & make entry in car handover collection)
router.post('/delivering', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id"
        },
        'agent_id': {
            notEmpty: true,
            errorMessage: "Please enter agent id"
        },
        'car_rental_company_id': {
            notEmpty: true,
            errorMessage: "Please enter rental company id"
        },
        'defected_points': {
            notEmpty: true,
            errorMessage: "Please enter car defecets points"
        },
        'milage': {
            notEmpty: true,
            errorMessage: "Please enter car milage"
        },
        'petrol_tank': {
            notEmpty: true,
            errorMessage: "Please enter car petrol tank fuel"
        },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number"
        }

    };
    req.checkBody(schema);
    // car_defects_gallery
    // notes
    var errors = req.validationErrors();
    if (!errors) {

        var hand_over_data = {
            'user_id': req.body.user_id,
            'car_id': req.body.car_id,
            'agent_id': req.body.agent_id,
            'car_rental_company_id': req.body.car_rental_company_id,
            'defected_points': req.body.defected_points,
            'milage': req.body.milage,
            'petrol_tank': req.body.petrol_tank,
            'notes': req.body.notes ? req.body.notes : null,
            'booking_number': req.body.booking_number
            // 'signature' : req.body.signature ?  req.body.signature : null,
            // 'car_defects_gallery' : req.body.car_defects_gallery ? req.body.car_defects_gallery : null,
        }

        const carHandOverResp = await CarHelper.car_delivering(req, hand_over_data);
        console.log('RESP=>', carHandOverResp);


        if (carHandOverResp.status === 'success') {
            res.status(config.OK_STATUS).json(carHandOverResp)
        }
        else {
            res.status(config.BAD_REQUEST).json(carHandOverResp)
        }
        // res.json(carHandOverResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

// car Delivering process (change trip_status to delivering & make entry in car handover collection)
router.post('/delivering_v2', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id"
        },
        'agent_id': {
            notEmpty: true,
            errorMessage: "Please enter agent id"
        },
        'car_rental_company_id': {
            notEmpty: true,
            errorMessage: "Please enter rental company id"
        },
        'defected_points': {
            notEmpty: true,
            errorMessage: "Please enter car defecets points"
        },
        'milage': {
            notEmpty: true,
            errorMessage: "Please enter car milage"
        },
        'petrol_tank': {
            notEmpty: true,
            errorMessage: "Please enter car petrol tank fuel"
        },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number"
        },
        'lattitude': {
            notEmpty: true,
            errorMessage: "Enter current latitude"
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Enter current longitude"
        }

    };
    req.checkBody(schema);
    // car_defects_gallery
    // notes
    var errors = req.validationErrors();
    if (!errors) {

        var hand_over_data = {
            'user_id': req.body.user_id,
            'car_id': req.body.car_id,
            'agent_id': req.body.agent_id,
            'car_rental_company_id': req.body.car_rental_company_id,
            'defected_points': req.body.defected_points,
            'milage': req.body.milage,
            'petrol_tank': req.body.petrol_tank,
            'notes': req.body.notes ? req.body.notes : null,
            'booking_number': req.body.booking_number
            // 'signature' : req.body.signature ?  req.body.signature : null,
            // 'car_defects_gallery' : req.body.car_defects_gallery ? req.body.car_defects_gallery : null,
        }
        var locationData = {
            'trip_status': 'delivering',
            'deliever_source_location': [req.body.longitude, req.body.lattitude],
            'last_location': [req.body.longitude, req.body.lattitude]
        }

        const carHandOverResp = await CarHelper.car_delivering_v2(req, hand_over_data, locationData);
        console.log('RESP=>', carHandOverResp);


        if (carHandOverResp.status === 'success') {
            res.status(config.OK_STATUS).json(carHandOverResp)
        }
        else {
            res.status(config.BAD_REQUEST).json(carHandOverResp)
        }
        // res.json(carHandOverResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

// car Delivering process (change trip_status to delivering & make entry in car handover collection)
router.post('/delivering_v3', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'car_id': {
            notEmpty: true,
            errorMessage: "Please enter car id"
        },
        'agent_id': {
            notEmpty: true,
            errorMessage: "Please enter agent id"
        },
        'car_rental_company_id': {
            notEmpty: true,
            errorMessage: "Please enter rental company id"
        },
        'defected_points': {
            notEmpty: true,
            errorMessage: "Please enter car defecets points"
        },
        'milage': {
            notEmpty: true,
            errorMessage: "Please enter car milage"
        },
        'petrol_tank': {
            notEmpty: true,
            errorMessage: "Please enter car petrol tank fuel"
        },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number"
        },
        'lattitude': {
            notEmpty: true,
            errorMessage: "Enter current latitude"
        },
        'longitude': {
            notEmpty: true,
            errorMessage: "Enter current longitude"
        }

    };
    req.checkBody(schema);
    // car_defects_gallery
    // notes
    var errors = req.validationErrors();
    if (!errors) {

        var hand_over_data = {
            'user_id': req.body.user_id,
            'car_id': req.body.car_id,
            'agent_id': req.body.agent_id,
            'car_rental_company_id': req.body.car_rental_company_id,
            'defected_points': req.body.defected_points ? req.body.defected_points : [],
            'milage': req.body.milage,
            'petrol_tank': req.body.petrol_tank,
            'notes': req.body.notes ? req.body.notes : null,
            'booking_number': req.body.booking_number
            // 'signature' : req.body.signature ?  req.body.signature : null,
            // 'car_defects_gallery' : req.body.car_defects_gallery ? req.body.car_defects_gallery : null,
        }
        var locationData = {
            'trip_status': 'delivering',
            'deliever_source_location': [req.body.longitude, req.body.lattitude],
            'last_location': [req.body.longitude, req.body.lattitude]
        }

        const carHandOverResp = await CarHelper.car_delivering_v2(req, hand_over_data, locationData);
        console.log('RESP=>', carHandOverResp);


        if (carHandOverResp.status === 'success') {

            var userData = await Users.find({ '_id': new ObjectId(req.body.user_id) }, { _id: 1, deviceToken: 1, phone_number: 1, deviceType: 1, email: 1, phone_number: 1 }).lean().exec();
            var deviceToken = null;

            // Push notification //
            console.log('User token =>', userData);
            if (userData[0].deviceToken !== undefined && userData[0].deviceToken !== null) {
                if (userData[0].deviceToken.length > 10) { // temp condition
                    // agentDeviceTokenArray.push(agent.deviceToken);
                    deviceToken = userData[0].deviceToken;
                    var notificationType = 1; // means notification for booking 
                    var msg = "Your agent is on delivering track";
                    if (userData[0].deviceType === 'ios') {
                        var sendNotification = await pushNotificationHelper.sendToIOS(deviceToken, parseInt(req.body.booking_number), notificationType, msg);

                        /* save notification to db start */
                        if (deviceToken !== null) {
                            var data = {
                                "userId": userData[0]._id,
                                "deviceToken": deviceToken,
                                "deviceType": 'ios',
                                "notificationText": msg,
                                "notificationType": 1,
                                "booking_number": parseInt(req.body.booking_number)
                            }
                            var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                        }
                        /* save notification to db over */


                    } else if (userData[0].deviceType === 'android') {
                        var sendNotification = await pushNotificationHelper.sendToAndroidUser(deviceToken, parseInt(req.body.booking_number), msg);

                        /* save notification to db start */
                        if (deviceToken !== null) {
                            var data = {
                                "userId": userData[0]._id,
                                "deviceToken": deviceToken,
                                "deviceType": 'android',
                                "notificationText": msg,
                                "notificationType": 1,
                                "booking_number": parseInt(req.body.booking_number)
                            }
                            var saveNotiResp = await pushNotificationHelper.save_notification_to_db(data);
                        }
                        /* save notification to db over */

                    }
                }
            }

            // SMS Notification //

            res.status(config.OK_STATUS).json(carHandOverResp)
        }
        else {
            res.status(config.BAD_REQUEST).json(carHandOverResp)
        }
        // res.json(carHandOverResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


// Get Point from booking number for next handover process
router.post('/handover-screen', async (req, res) => {
    var schema = {
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number"
        }
    };
    req.checkBody(schema);

    var errors = req.validationErrors();
    if (!errors) {
        try {
            const carHandOverResp = await CarHandOver.find({ 'booking_number': req.body.booking_number }).lean();
            if (carHandOverResp && carHandOverResp.length > 0) {


                delete carHandOverResp[0].createdAt;
                delete carHandOverResp[0].modifiedAt;

                console.log('Datat======>', carHandOverResp);

                res.status(config.OK_STATUS).json({ status: 'success', message: "Got data for handover process", data: { handoverData: carHandOverResp } })
            }
            else {
                res.status(config.BAD_REQUEST).json({ status: 'failed', message: "No Data available for hand over screen" })
            }
        }
        catch (err) {
            res.status(config.BAD_REQUEST).json({ status: 'failed', message: "Error accured while geting car hand over screen data", err })
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


// car handover v2
router.post('/handover-v2', async (req, res) => {
    var schema = {
        // 'defected_points': {
        //     notEmpty: true,
        //     errorMessage: "Please enter car defecets points"
        // },
        // 'milage': {
        //     notEmpty: true,
        //     errorMessage: "Please enter car milage"
        // },
        // 'petrol_tank': {
        //     notEmpty: true,
        //     errorMessage: "Please enter car petrol tank fuel"
        // },
        'booking_number': {
            notEmpty: true,
            errorMessage: "Please enter car booking number"
        }
    };
    req.checkBody(schema);
    // car_defects_gallery
    // notes
    var errors = req.validationErrors();
    if (!errors) {

        // var hand_over_data = {
        //     'defected_points': req.body.defected_points,
        //     'milage': req.body.milage,
        //     'petrol_tank': req.body.petrol_tank,
        //     'notes': req.body.notes ? req.body.notes : null,
        //     'booking_number': req.body.booking_number
        //     // 'signature' : req.body.signature ?  req.body.signature : null,
        //     // 'car_defects_gallery' : req.body.car_defects_gallery ? req.body.car_defects_gallery : null,
        // }

        var hand_over_data = {};

        if (req.body.defected_points) {
            hand_over_data.defected_points = req.body.defected_points
        }
        if (req.body.milage) {
            hand_over_data.milage = req.body.milage
        }
        if (req.body.petrol_tank) {
            hand_over_data.petrol_tank = req.body.petrol_tank
        }
        if (req.body.notes) {
            hand_over_data.notes = req.body.notes
        }


        const carHandOverResp = await CarHelper.car_handover_v2(req, req.body.booking_number, hand_over_data);
        console.log('RESP=>', carHandOverResp);


        if (carHandOverResp.status === 'success') {
            res.status(config.OK_STATUS).json(carHandOverResp)

            // send notification to user that your car is deliverd or handover to u
            const booking_number = req.body.booking_number;
            const carBookingData = await CarBooking.findOne({ 'booking_number': booking_number }).lean().exec();
            const userId = carBookingData.userId;
            var msg = "Your car has been deliverd to you"
            commonHelper.sendNoti(userId, parseInt(booking_number), msg);
        }
        else {
            res.status(config.BAD_REQUEST).json(carHandOverResp)
        }
        // res.json(carHandOverResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


module.exports = router;