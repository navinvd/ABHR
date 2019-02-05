var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const CompanyTemrsAndCondition = require('./../models/company_terms_and_condition');
const TemrsAndCondition = require('./../models/terms_conditions');


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
            return { status: 'success', message: "Legal data updated successfully", data: admin }
        } else {
            return { status: 'failed', message: "No Legal data not updated" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while updating data", err };
    }
};

// get company legal setting data
termsandconditionHelper.getCompanyData = async function (companyId) {
    console.log(companyId);
    try {
        let companyadmin = await CompanyTemrsAndCondition.findOne({"CompanyId": new ObjectId(companyId), "isDeleted":false});
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
termsandconditionHelper.updateCompanyData = async function (companyId, updateData) {
    console.log('companyId======.',companyId, 'updateData=======>',updateData);
    try {
        let companyadmin = await CompanyTemrsAndCondition.update({"CompanyId": new ObjectId(companyId), "isDeleted":false},{ $set: updateData});
        console.log(companyadmin);
        if (typeof companyadmin !== 'undefined' && companyadmin !== null) {
            return { status: 'success', message: "Record updated successfully", data: companyadmin }
        } else {
            return { status: 'failed', message: "No Record found" }
        }
    } catch (err) {
        return { status: 'failed', message: "Error occured while finding data", err };
    }
};

module.exports = termsandconditionHelper;