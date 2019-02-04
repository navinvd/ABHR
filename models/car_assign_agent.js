//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var Car_Assign_Schema = new Schema({
    agent_id: mongoose.Schema.Types.ObjectId,
    car_rental_company_id: mongoose.Schema.Types.ObjectId,
    car_id: mongoose.Schema.Types.ObjectId,
    user_id: mongoose.Schema.Types.ObjectId,
    booking_number:{
        type: Number,
        required: true
    },
    assign_for: {
        type: String,
        enum : ['handover','receive'],
        required: true
    },
    trip_status: {
        type: String,
        enum: ["inprogress", "cancelled", "finished", "return", "upcoming", "delivering", "returning"]
    },
    assign_for_handover: {
        type: Boolean
    },
    assign_for_receive: {
        type: Boolean
    },
    status : {
        type : String,
        enum : ['assign','handover','receive'],
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
var CarAssign = mongoose.model('car_assign_agent', Car_Assign_Schema, 'car_assign_agent');
module.exports = CarAssign;