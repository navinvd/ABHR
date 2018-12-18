//Require Mongoose
var mongoose = require('mongoose');
//Define a schema
var Schema = mongoose.Schema;
var CarNotificationSettingSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    account_updates_status: {
        type: Boolean,
        required: true
    },
    accoundiscount_new_status: {
        type: Boolean,
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

var CarNotificationSetting = mongoose.model('car_notification_setting', CarNotificationSettingSchema, 'car_notification_setting');
module.exports = CarNotificationSetting;