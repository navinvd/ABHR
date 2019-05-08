//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var ReportCategorySchema = new Schema({
    category_name: {
        type: String,
        required: true
    },
    category_name_arabic: {
        type: String,
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    modifiedAt: {type: Date, default: Date.now}
}, {versionKey: false});

// Compile model from schema
var ReportCategory = mongoose.model('report_category', ReportCategorySchema, 'report_category');
module.exports = ReportCategory;
