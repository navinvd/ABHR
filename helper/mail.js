const nodemailer = require('nodemailer');
const config = require('../config');
const smtpTransport = require('nodemailer-smtp-transport');
var EmailTemplate = require('email-templates').EmailTemplate;

var mongoose = require('mongoose');
var User = require('../models/users');
var ObjectId = mongoose.Types.ObjectId;

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
        from: "ABHR <noreply@gmail.com>"
    });
    template_sender({
        to: options.to,
        subject: options.subject,
    }, data).then(function (info) {
        callback(null, { "status": 1, "message": info });
    }).catch(function (err) {
        callback({ "status": 0, "error": err });
    });
};



// sendEmail for email verification
mail_helper.sendEmail = async (template_name, options, data, user_id) => {

    var template_sender = transporter.templateSender(new EmailTemplate('emails/' + template_name), {
        from: "ABHR <noreply@gmail.com>"
    });

    // return template_sender({
    //     to : options.to,
    //     subject: options.subject,
    // },data).then(function(info){

    //     // update query here

    //     console.log('DATATA=>',info);
    //     return {"status":1,"message":info};
    // }).catch(function(err){
    //     console.log('Error=>',err);
    //     // return { status: 'failed', message: "Error occured while sending otp" }
    //     return {"status":0,"error":err};
    // });


    try {
        var email_data = await template_sender({ to: options.to, subject: options.subject }, data);
        var id = { _id: new ObjectId(user_id) }
        // var new_data = { $set: { otp_email: data.otp, is_email_verified: false } };
        var new_data = { $set: { otp_email: data.otp, email_verified: 1 } };
        var datta = await User.update(id, new_data);

        if (datta.n > 0) {
            return { status: 'success', message: "Otp has been sent to your email address", data: data.otp }
        }
        else {
            return { status: 'failed', message: "Error occured while sending otp to your email address" }
        }
    }
    catch (err) {
        return { status: 'failed', message: "Error occured while sending otp to your email address" }
    }
};


// Send email when car will book to customer
mail_helper.sendEmail_carBook = async (template_name, options, data) => {

    var template_sender = transporter.templateSender(new EmailTemplate('emails/' + template_name), {
        from: "ABHR <noreply@gmail.com>"
    });
    
    try {
        // console.log("Mail DAta :",data);
        data = JSON.parse(JSON.stringify(data));
        var email_data = await template_sender({ to: options.to, subject: options.subject }, data);
        return { status: 'success', message: "Email has been sent"}      
    }
    catch (err) {
        return { status: 'failed', message: "Error occured while sending email to your email address", error : err }
    }
};


// Resend invoice to customer
mail_helper.Resend_Invoice = async (template_name, options, data) => {

    var template_sender = transporter.templateSender(new EmailTemplate('emails/' + template_name), {
        from: "ABHR <noreply@gmail.com>"
    });
    try {
        // console.log("Mail DAta :",data);
        // data = JSON.parse(JSON.stringify(data));

        console.log("DATATATATATAT=======> ",data);

        var email_data = await template_sender({ to: options.to, subject: options.subject }, data);
        return { status: 'success', message: "Email has been sent"}      
    }
    catch (err) {
        return { status: 'failed', message: "Error occured while sending email to your email address", error : err }
    }
};

// sendEmail for contactform added by hemanth
mail_helper.sendEmailContactform = async (template_name, options, data) => {

    var template_sender = transporter.templateSender(new EmailTemplate('emails/' + template_name), {
        from: "ABHR <noreply@gmail.com>"
    });

    // return template_sender({
    //     to : options.to,
    //     subject: options.subject,
    // },data).then(function(info){

    //     // update query here

    //     console.log('DATATA=>',info);
    //     return {"status":1,"message":info};
    // }).catch(function(err){
    //     console.log('Error=>',err);
    //     // return { status: 'failed', message: "Error occured while sending otp" }
    //     return {"status":0,"error":err};
    // });


    try {
        var email_data = await template_sender({ to: options.to, subject: options.subject }, data);
        /*var id = { _id: new ObjectId(user_id) }
        // var new_data = { $set: { otp_email: data.otp, is_email_verified: false } };
        var new_data = { $set: { otp_email: data.otp, email_verified: 1 } };
        var datta = await User.update(id, new_data);*/

        return { status: 'success', message: "Email has been sent"}  
    }
    catch (err) {
        return { status: 'failed', message: "Error occured while sending otp to your email address" }
    }
};

module.exports = mail_helper
