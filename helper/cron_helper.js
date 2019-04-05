var mongoose = require('mongoose');
const CarBooking = require('./../models/car_booking');
var moment = require('moment');
var ObjectId = mongoose.Types.ObjectId;
const _ = require('underscore');
var config = require('./../config');
var fs = require('fs');
var paths = require('path');
var async = require("async");

let cronHelper = {};
let mail_helper = require('./mail');
cronHelper.chekForBookingCompition = async function (fn_callback) {
    var bookings;
    try {
        bookings = await Booking.aggregate([{
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "customer"
                }
            }, {
                $match: {
                    "status": 'pending for customer review',
                    "onHold": false
                }
            }, {
                $unwind: "$customer"
            }, {
                $lookup:
                        {
                            from: "services",
                            localField: "serviceId",
                            foreignField: "_id",
                            as: "service"
                        }
            }, {
                $unwind: "$service"
            }, {
                $lookup:
                        {
                            from: "users",
                            localField: "service.userId",
                            foreignField: "_id",
                            as: "spiri"
                        }
            }, {
                $unwind: "$spiri"
            }]);
    } catch (e) {
        console.log("e:", e);
    }
    async.everySeries(bookings, function (obj, every_callback) {
        var diff = moment().diff(moment(obj['reviewDate']), 'd');
        console.log("diff:", diff);
        if (diff >= 1) {
            var spiriEscrowWallet = parseFloat(obj['spiri']['escrowWallet']);
            spiriEscrowWallet = Math.round(spiriEscrowWallet * 100) / 100;

            var spiriWallet = parseFloat(obj['spiri']['wallet']);
            spiriWallet = Math.round(spiriWallet * 100) / 100;

            var escrowAmount = parseFloat(obj['escrow_amount']);
            escrowAmount = Math.round(escrowAmount * 100) / 100;

            var totalSpiriEscrowWallet = spiriEscrowWallet - escrowAmount;
            totalSpiriEscrowWallet = Math.round(totalSpiriEscrowWallet * 100) / 100;

            var totalSpiriWallet = spiriWallet + escrowAmount;
            totalSpiriWallet = Math.round(totalSpiriWallet * 100) / 100;

            async.waterfall([
                function (waterfall_callback) {
                    Booking.update({_id: {$eq: obj['_id']}}, {$set: {status: 'completed', completedDate: new Date()}}, function (err, response) {
                        if (err) {
                            waterfall_callback(err)
                        } else {
                            waterfall_callback(null);
                        }
                    });
                },
                function (waterfall_callback) {
                    var transactionJSON = {
                        comment: 'Your Booking was completed successfully',
                        transactionType: 'PaymentFromEscrow',
                        entryType: 'dr',
                        transaction_amount: escrowAmount,
                        wallet_total_balance: spiriWallet,
                        escrow_total_balance: totalSpiriEscrowWallet,
                        bookingId: obj['_id'],
                        userId: obj['spiri']['_id']
                    }
                    transactionHelper.addTransaction(transactionJSON, function (err, data) {
                        if (err) {
                            waterfall_callback(err);
                        } else {
                            waterfall_callback(null);
                        }
                    });
                },
                function (waterfall_callback) {
                    User.update({_id: {$eq: obj['spiri']['_id']}}, {$set: {escrowWallet: totalSpiriEscrowWallet}}, function (err, res) {
                        if (err) {
                            waterfall_callback(err);
                        } else {
                            waterfall_callback(null);
                        }
                    });
                },
                function (waterfall_callback) {
                    var transactionJSON = {
                        comment: 'You got a payment for ' + obj['service']['name'] + '\'s service from the ' + obj['customer']['name'],
                        transactionType: 'PaymentFromEscrow',
                        entryType: 'cr',
                        transaction_amount: escrowAmount,
                        wallet_total_balance: totalSpiriWallet,
                        escrow_total_balance: totalSpiriEscrowWallet,
                        bookingId: obj['_id'],
                        userId: obj['spiri']['_id']
                    }
                    transactionHelper.addTransaction(transactionJSON, function (err, data) {
                        if (err) {
                            waterfall_callback(err);
                        } else {
                            waterfall_callback(null);
                        }
                    });
                },
                function (waterfall_callback) {
                    User.update({_id: {$eq: obj['spiri']['_id']}}, {$set: {wallet: totalSpiriWallet}}, function (err, res) {
                        if (err) {
                            waterfall_callback(err);
                        } else {
                            waterfall_callback(null);
                        }
                    });
                }
            ], function (err, result) {
                if (err) {
                    every_callback(err);
                } else {
                    every_callback(null);
                }
            });
        } else {
            every_callback(null);
        }
    }, function (err, result) {
        if (err) {
            fn_callback(err);
        } else {
            fn_callback(null, result);
        }
    });
}
module.exports = cronHelper;