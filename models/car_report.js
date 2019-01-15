//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var CarReportSChema = new Schema({
    user_id : mongoose.Schema.Types.ObjectId,
    car_id : mongoose.Schema.Types.ObjectId,
    car_rental_company_id :  mongoose.Schema.Types.ObjectId,
    booking_number : { type : Number, required : true},
    report_type : { type : Boolean, required : true}, // 0 - Lost/Stolen (false)   &  1 - Problem in car (true)
    report_message: {
        type: String,
        required : true,
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
var CarReport= mongoose.model('car_report', CarReportSChema, 'car_report');
module.exports = CarReport;