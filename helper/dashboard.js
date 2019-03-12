var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const Coupon = require('./../models/coupon');
const UserCoupon = require('./../models/user_coupon');
const Company = require('./../models/car_company');
const Car = require('./../models/cars');
const CarBooking = require('./../models/car_booking');
var moment = require('moment');
let dashboardHelper = {};

// list of companies 
dashboardHelper.NoOfCompaines = async () => {
    try{
        let companies = await Company.find({"isDeleted": false}).count();
        if (companies !== null && companies !== '') {
            return { status: 'success', message: "Companies data found", data: companies}
        }
        else {
            return { status: 'success', message: "No Company Data found", data:companies};
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    } 
};

// list of cars 
dashboardHelper.NoOfCars = async () => {
    try{
        let cars = await Car.find({"isDeleted": false}).count();
        if (cars !== null && cars !== '') {
            return { status: 'success', message: "Cars data found", data: cars}
        }
        else {
            return { status: 'success', message: "No car Data found" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    } 
};

// list of rentals 
dashboardHelper.NoOfRentals = async () => {
    try{
        let rentals = await CarBooking.find({"isDeleted": false}).count();
        if (rentals !== null && rentals !== '') {
            return { status: 'success', message: "Rental data found", data: rentals}
        }
        else {
            return { status: 'success', message: "No rental data found" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    } 
};

// list of cars for company 
dashboardHelper.companyNoOfCars = async (company_id) => {
    try{
        let cars = await Car.find({"isDeleted": false, "car_rental_company_id": new ObjectId(company_id)}).count();
        if (cars !== null && cars !== '') {
            return { status: 'success', message: "Cars data found", data: cars}
        }
        else {
            return { status: 'success', message: "No Car data found" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching coupon" };
    } 
};

// Graph for company 
dashboardHelper.AdminGraph = async () => {
    try{
        var startOfMonth = moment().utc().startOf('month').format('YYYY-MM-DD');
        var endOfMonth   = moment().utc().endOf('month').format('YYYY-MM-DD'); 
        console.log('startOfMonth===>', startOfMonth, 'endOfMonth===>', endOfMonth);
        var defaultQuery = [
            {
                $project : {
                      _id : 1,
                      booking_number: 1,
                      transaction_status: 1,
                      total_transaction: {$subtract: [ "$total_booking_amount", "$deposite_amount"]},
                      from_time:{
                        $dateToString: {
                            date: "$from_time",
                            format: "%Y-%m-%d"
                        }
                    },
                      to_time: {
                        $dateToString: {
                            date: "$to_time",
                            format: "%Y-%m-%d"
                        }
                    }
                }
            },
            {
                "$match":{
                    $or: [
                        {
                           $and : [
                               { from_time: { $lte :startOfMonth }},
                               { to_time: { $lte :endOfMonth }},
                               { to_time: { $gte :startOfMonth }},
                           ] 
                        },
                        {
                            $and : [
                                { from_time: { $gte :startOfMonth }},
                                { to_time: { $gte :endOfMonth }},
                                { from_time: { $lte :endOfMonth }},
                            ] 
                        },
                        {
                            $and : [
                                { from_time: { $gte :startOfMonth }},
                                { to_time: { $lte :endOfMonth }},
                            ] 
                        },
                        {
                            $and : [
                                { from_time: { $lte :startOfMonth }},
                                { to_time: { $gte :endOfMonth }},
                            ] 
                        }
                    ]
                }
            }
          ];
        let rentals = await CarBooking.aggregate(defaultQuery);
        if (rentals !== null && rentals !== '' && rentals.length !== 0) {
            
            var final = [];
            while(! (moment(startOfMonth).isSame(endOfMonth))){
            var rental_cnt = 0;
            var transaction_cnt = 0;
            rentals.forEach((element) => {
                var from_time = moment(element.from_time).utc().startOf('days').format('YYYY-MM-DD');
                var to_time = moment(element.to_time).utc().startOf('days').format('YYYY-MM-DD');
                if (moment(startOfMonth).isBetween(from_time, to_time, null, '[]')) {
                    rental_cnt = rental_cnt+1;
                }
                if(element.transaction_status === "successfull"){
                    var transaction_date = moment(element.transaction_date).utc().startOf('days').format('YYYY-MM-DD');
                    if(moment(transaction_date).isSame(startOfMonth)){
                        transaction_cnt = transaction_cnt + element.total_transaction;
                    }
                }
            });
                var obj = {
                    "Date" : startOfMonth,
                    "rental_cnt": rental_cnt,
                    "transaction_cnt": transaction_cnt
                };
                final.push(obj);
                startOfMonth = moment(startOfMonth).add(1, 'days').format('YYYY-MM-DD'); 
            }
            return { status: 'success', message: "Rental data found", data: final}
        }
        else {
            return { status: 'success', message: "No rental data found" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching dashboard" , err:e};
    } 
};

// Graph for company 
dashboardHelper.CompanyGraph = async (companyId) => {
    try{
        var startOfMonth = moment().utc().startOf('month').format('YYYY-MM-DD');
        var endOfMonth   = moment().utc().endOf('month').format('YYYY-MM-DD'); 
        console.log('startOfMonth===>', startOfMonth, 'endOfMonth===>', endOfMonth);
        var defaultQuery = [
            {
                $project : {
                      _id : 1,
                      booking_number: 1,
                      transaction_status: 1,
                      total_transaction: {$subtract: [ "$total_booking_amount", "$deposite_amount"]},
                      from_time:{
                        $dateToString: {
                            date: "$from_time",
                            format: "%Y-%m-%d"
                        }
                    },
                      to_time: {
                        $dateToString: {
                            date: "$to_time",
                            format: "%Y-%m-%d"
                        }
                    }
                }
            },
            {
                "$match":{
                    $or: [
                        {
                           $and : [
                               { from_time: { $lte :startOfMonth }},
                               { to_time: { $lte :endOfMonth }},
                               { to_time: { $gte :startOfMonth }},
                           ] 
                        },
                        {
                            $and : [
                                { from_time: { $gte :startOfMonth }},
                                { to_time: { $gte :endOfMonth }},
                                { from_time: { $lte :endOfMonth }},
                            ] 
                        },
                        {
                            $and : [
                                { from_time: { $gte :startOfMonth }},
                                { to_time: { $lte :endOfMonth }},
                            ] 
                        },
                        {
                            $and : [
                                { from_time: { $lte :startOfMonth }},
                                { to_time: { $gte :endOfMonth }},
                            ] 
                        }
                    ]
                }
            }
          ];
        let rentals = await CarBooking.aggregate(defaultQuery);
        if (rentals !== null && rentals !== '' && rentals.length !== 0) {
            
            var final = [];
            while(! (moment(startOfMonth).isSame(endOfMonth))){
            var rental_cnt = 0;
            var transaction_cnt = 0;
            rentals.forEach((element) => {
                var from_time = moment(element.from_time).utc().startOf('days').format('YYYY-MM-DD');
                var to_time = moment(element.to_time).utc().startOf('days').format('YYYY-MM-DD');
                if (moment(startOfMonth).isBetween(from_time, to_time, null, '[]')) {
                    rental_cnt = rental_cnt+1;
                }
                if(element.transaction_status === "successfull"){
                    var transaction_date = moment(element.transaction_date).utc().startOf('days').format('YYYY-MM-DD');
                    if(moment(transaction_date).isSame(startOfMonth)){
                        transaction_cnt = transaction_cnt + element.total_transaction;
                    }
                }
            });
                var obj = {
                    "Date" : startOfMonth,
                    "rental_cnt": rental_cnt,
                    "transaction_cnt": transaction_cnt
                };
                final.push(obj);
                startOfMonth = moment(startOfMonth).add(1, 'days').format('YYYY-MM-DD'); 
            }
            return { status: 'success', message: "Rental data found", data: final}
        }
        else {
            return { status: 'success', message: "No rental data found" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching dashboard" , err:e};
    } 
};

module.exports = dashboardHelper;