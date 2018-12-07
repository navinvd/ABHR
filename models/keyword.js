//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var KeywordSchema = new Schema({
    keyword:{
        type: String,
        unique: true,
        required: true
    },
    english:{
        type: String,
        unique: true,
        required: true
    },
    arabic: {
        type: String,
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
var Keyword = mongoose.model('keywords', KeywordSchema, 'keywords');
module.exports = Keyword;