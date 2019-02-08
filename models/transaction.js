//Require Mongoose
var mongoose = require('mongoose');
//Define a schema
var Schema = mongoose.Schema;
var TransactionSchema = new Schema({
    booking_number: {
        type: Number
    },
    carId: {
        type: mongoose.Schema.Types.ObjectId
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId
    },
    from_time: {
        type: Date,
    },
    to_time: {
        type: Date,
    },
    Transaction_amount: {
        type: Number,
        required: true
    },
    VAT: {
        type: Number
    },
    deposite_amount: {
        type: Number,
        required: true
    },
    defect_amount: {
        type: Number
    },
    status: {
        type: String,
        enum: ["inprogress", "cancelled", "successfull", "failed"]
    },
    coupon_code: {
        type:  String,
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
var Transaction = mongoose.model('transaction', TransactionSchema, 'transaction');
module.exports = Transaction;