var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const CarReport = require('./../models/car_report');
const ReportCategory = require('./../models/report_category');
let ReportHelper = {};

// add category 
ReportHelper.addCategory = async (data) => {
        let add_category = new ReportCategory(data);
        try {
            let data = await add_category.save();
            return { status: 'success', message: "Category has been added", data:data }
        } catch (err) {
            return { status: 'failed', message: "Error occured while adding new category" };
        }
};

// update category 
ReportHelper.updateCategory = async (data) => {
    let category = await ReportCategory.update({ "_id": data.category_id , isDeleted: false}, { $set: { "category_name": data.category_name}});
    if (category) {
        return { status: 'failed', message: "Category updated successfully" }
    }
    else {
        return { status: 'failed', message: "Error occured while updating category" }
    }
};

// delete category 
ReportHelper.deleteCategory = async (category_id) => {
    let category = await ReportCategory.findOne({ isDeleted: false, "_id": new ObjectId(category_id)});
    if (category) {
        try {
            let delete_category = await ReportCategory.update({ "_id": new ObjectId(category_id)}, { $set: {"isDeleted": true}});
            return { status: 'success', message: "Category has been deleted"}
        } catch (err) {
            return { status: 'failed', message: "Error occured while updating category" };
        }
    }
    else {
        return { status: 'failed', message: "no record found with this data" }
    }
};

// get by id report 
ReportHelper.getByIdReport = async (coupon_id) => {
    let coopan = await Coupon.findOne({ "_id": new ObjectId(coupon_id), isDeleted: false});
    if (coopan) {
        return { status: 'success', message: "Coupon data found", data: coopan }
    }
    else {
        return { status: 'failed', message: "Error occured while fetching coupon" };
    }
};


module.exports = ReportHelper;