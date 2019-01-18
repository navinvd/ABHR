var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const CarBooking = require('./../models/car_booking');
const CarBrand = require('./../models/car_brand');
const CarCompany = require('./../models/car_company');
const CarModel = require('./../models/car_model');
const Country = require('./../models/country');
const State = require('./../models/state');
const City = require('./../models/city');
const CarHandOver = require('./../models/car_hand_over');
const CarReceive = require('./../models/car_receive');
const CarReport = require('./../models/car_report');
const CompanyTemrsAndCondition = require('./../models/company_terms_and_condition');
const TemrsAndCondition = require('./../models/terms_conditions');
const moment = require('moment');
const _ = require('underscore');
var config = require('./../config');
var fs = require('fs');
var paths = require('path');
var async = require("async");

let termsandconditionHelper = {};

// get admin legal setting data
termsandconditionHelper.getAdminData = async function () {
    try {
        let admin = await TemrsAndCondition.findOne({});
        if (typeof admin !== 'undefined' && admin !== null) {
            return { status: 'success', message: "Legal data found", data: admin }
        } else {
            return { status: 'failed', message: "No Legal data found" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding data", err };
    }
};

// update admin legal setting data
termsandconditionHelper.UpdateAdminData = async function (updateData) {
    try {
        let admin = await TemrsAndCondition.update({}, { $set: updateData});
        if (typeof admin !== 'undefined' && admin !== null) {
            return { status: 'success', message: "Legal data updated", data: admin }
        } else {
            return { status: 'failed', message: "No Legal data not updated" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while updating data", err };
    }
};

// get company legal setting data
termsandconditionHelper.getCompanyData = async function (companyId) {
    try {
        let companyadmin = await CompanyTemrsAndCondition.find({"companyId": new ObjectId(companyId), "isDeleted":false});
        console.log(companyadmin);
        if (typeof companyadmin !== 'undefined' && companyadmin !== null) {
            return { status: 'success', message: "Terms & Comdition data found", data: companyadmin }
        } else {
            return { status: 'failed', message: "No Terms & Comdition data found" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding data", err };
    }
};

// update company terms and condition data
termsandconditionHelper.updateCompanyData = async function (companyId) {
    try {
        let companyadmin = await CompanyTemrsAndCondition.find({"companyId": new ObjectId(companyId), "isDeleted":false});
        console.log(companyadmin);
        if (typeof companyadmin !== 'undefined' && companyadmin !== null) {
            return { status: 'success', message: "Terms & Condition data found", data: companyadmin }
        } else {
            return { status: 'failed', message: "No Terms & Condition data found" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding data", err };
    }
};

module.exports = termsandconditionHelper;