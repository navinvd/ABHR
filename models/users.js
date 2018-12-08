//Require Mongoose
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var config = require('./../config');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
//Define a schema
var Schema = mongoose.Schema;
var UserSchema = new Schema({
    // username: {
    //     type: String,
    //     lowercase: true
    // },
    first_name : {
        type: String,
        required: true,
    },
    last_name : {
        type: String,
        required: true,
    },
    phone_number: String,
    email: {
        type: String,
        required: true
    },
    profile_image: String,
    password: String,
    refreshToken: String,
    place_id : mongoose.Schema.Types.ObjectId,
    type: {
        type: String,
        enum: ["user", "admin", "agent", "staff"]
    },
    deviceType: {
        type: String,
        enum: ["ios", "anroid"]
    },
    app_user_status: {
        type: String,
        enum: ["registered", "rented"]
    },
    verification_code: {
        type: String
    },
    is_verified: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deviceToken: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    modifiedAt: {type: Date, default: Date.now}
}, {versionKey: false});
//password encription
UserSchema.pre('save', function (next) {
    var user = this;
    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password'))
        return next();
    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err)
            return next(err);
        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err)
                return next(err);
            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});
// Compile model from schema
var User = mongoose.model('users', UserSchema, 'users');
module.exports = User;