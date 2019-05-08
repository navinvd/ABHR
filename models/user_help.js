//Require Mongoose
var mongoose = require('mongoose');
//Define a schema
var Schema = mongoose.Schema;
var helpSchema = new Schema({
    topic: {
        type: String
    },
    description: {
        type: String
    },
    topic_arabic: {
        type: String
    },
    description_arabic: {
        type: String
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId
    },
    userType: {
        type: String
    },
    status: {
        type: String,
        enum: ["requested", "approved"]
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
var Help = mongoose.model('user_help', helpSchema, 'user_help');
module.exports = Help;
