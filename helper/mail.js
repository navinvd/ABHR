const nodemailer = require('nodemailer');
const config = require('../config');
const smtpTransport = require('nodemailer-smtp-transport');
var EmailTemplate = require('email-templates').EmailTemplate;

var mail_helper = {}
var transporter = nodemailer.createTransport(smtpTransport({
    service: config.SMTP_SERVICE, // hostname
    tls: {rejectUnauthorized: false},
    auth: {
        user: config.SMTP_MAIL,
        pass: config.SMTP_PASSWORD
    }
}));
mail_helper.send = (template_name, options, data, callback) => {
    var template_sender = transporter.templateSender(new EmailTemplate('emails/' + template_name), {
        from: "Car Booking <noreply@gmail.com>"
    });
    template_sender({
        to: options.to,
        subject: options.subject,
    }, data).then(function (info) {
        callback(null, {"status": 1, "message": info});
    }).catch(function (err) {
        callback({"status": 0, "error": err});
    });
};

module.exports = mail_helper