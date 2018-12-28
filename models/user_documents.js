//Require Mongoose
var mongoose = require('mongoose');
var config = require('./../config');
//Define a schema
var Schema = mongoose.Schema;
var UserDocumentsSchema = new Schema({
    // username: {
    //     type: String,
    //     lowercase: true
    // },
    driving_license : {
        image: {
            type: String,
            default: null
        },
        is_verified: {
            type: Boolean,
            default: false
        }     
    },
    last_name : {
        type: String,
        required: true,
    },
    phone_number: {
        type: String,
        default: null
    },
    phone_number_verified: {
        type: Number,
        enum: [0, 1, 2]
    },
    address : String,
    email: {
        type: String,
        required: true
    },
    email_verified: {
        type: Number,
        enum: [0, 1, 2]
    },
    driving_license: {
        type: String,
        default: null
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
        enum: ["ios", "android"]
    },
    app_user_status: {
        type: String,
        enum: ["registered", "rented"]
    },
    socialmediaID :{
        type: String,
    },
    socialmediaType :{
        type: String,
        enum: ["facebook", "google"]
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