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
    phone_number: {
        type: String,
        default:null
    },
    country_code: {
        type: Number,
        default:null
    },
    is_phone_verified: {
        type: Boolean,
        default:false
    },
    otp: {
        type: Number,
        default:null
    },
    otp_email: {
        type: Number,
        default:null
    },
    is_email_verified: {
        type: Boolean,
        default:false
    },
    phone_number_verified: {
        type: Number,
        enum: [0, 1, 2],
        default: 0
    },
    address : [{ 
        lat: {type: Number, default: null},
        long: {type: Number, default: null},
        complete_address: {type: String, default: null}
    }],
    email: {
        type: String,
        required: true,
    },
    email_verified: {
        type: Number,
        enum: [0, 1, 2],
        default: 1
    },
    driving_license: {
        number: { type: String , default: null },
        front_image: {type: String, default: null},
        back_image: {type: String, default: null},
        country: {type: String, default: null}, 
        issue_date: {type: Date, default: null}, 
        expiry_date: {type: Date, default: null}
    },
    driving_license_verification: {
        type: Number,
        enum: [0, 1, 2],
        default: 0
    },
    id_card: {
        front_image: {type: String, default: null},
        back_image: {type: String, default: null},
        type: {type: String, default: null},  
    },
    id_card_verification: {
        type: Number,
        enum: [0, 1, 2],
        default: 0
    },
    profile_image: {type: String, default: null},
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