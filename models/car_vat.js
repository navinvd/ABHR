var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;
var VATSchema = new Schema({
    rate: {
        type: Number
    },
    modifiedAt: {type: Date, default: Date.now}
}, {versionKey: false});

// Compile model from schema
var CarVAT = mongoose.model('car_vat', VATSchema, 'car_vat');
module.exports = CarVAT;