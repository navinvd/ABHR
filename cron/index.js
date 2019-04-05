var cron = require('node-cron');
var cronHelper = require('./../helper/cron_helper');
cron.schedule('* * 24 * *', function () {
    cronHelper.chekForBookingCompition(function (err, res) {
        
    })
});