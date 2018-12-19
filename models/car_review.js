//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
// car_id,user_id,stars,username,review_text(optional)
var Schema = mongoose.Schema;
var CarReviewSchema = new Schema({
    car_id : {type : mongoose.Schema.Types.ObjectId, ref: 'cars'},
    user_id : {type : mongoose.Schema.Types.ObjectId, ref: 'users'},
    stars:{
        type: Number,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    review_text: {
        type: String
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
var CarReview = mongoose.model('car_reviews', CarReviewSchema, 'car_reviews');
module.exports = CarReview;