//Require Mongoose
var mongoose = require('mongoose');
//Define a schema
var Schema = mongoose.Schema;
var NotificationSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    deviceToken :{
        type: String
    },
    deviceType:{
        type: String
    },
    notificationText: {
        type: String
    },
    notificationType: {
        type: Number,
        default : 1
    },
    booking_number: {
        type: Number
    },
    isRead: {
        type: Boolean,
        default: false
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

var Notifications = mongoose.model('notifications', NotificationSchema, 'notifications');
module.exports = Notifications;