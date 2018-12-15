//Require Mongoose
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var config = require('./../config');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
//Define a schema
var Schema = mongoose.Schema;
var CarCompanySchema = new Schema({
    name: {
        type: String,
        unique: true,
    },
    description: {
        type: String,
    },
    phone_number: String,
    site_url: String,
    email: {
        type: String,
        required: true,
        unique: true,
    },
    profile_image: String,
    password: String,
    refreshToken: String,
    place_id : mongoose.Schema.Types.ObjectId,
    agent_ids : [mongoose.Schema.Types.ObjectId],
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
//password encription
CarCompanySchema.pre('save', function (next) {
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
var CarCompany = mongoose.model('car_company', CarCompanySchema, 'car_company');
module.exports = CarCompany;