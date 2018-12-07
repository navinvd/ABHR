var express = require('express');
var auth = require('./../middlewares/auth');
var router = express.Router();
var admin = require('./admin');
router.use('/admin', admin);
var path = require('path');
var async = require("async");
var User = require('./../models/users');
var config = require('./../config');

/**
 * @api {put} /user/profile_image Update Profile Image
 * @apiName Update Profile Image By User Id and type
 * @apiDescription Use to update profile image based on user id. You must need to send form data
 * @apiGroup User
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} user_id  User Id
 * @apiParam {String} user_type  User Type ["staff", "company", "user", "agent"]
 * @apiParam {String} files Profile image
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/user/profile_image', (req, res, next) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "user_id is required"
        },
        'user_type': {
            notEmpty: true,
            errorMessage: "user_type is required"
        },
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        if (req.files) {
            var file = req.files.files;
            var dir = "./upload/others";
            if(req.body.user_type != '' && req.body.user_type != 'undefined') {
                if(req.body.user_type === 'staff'){ var dir = "./upload/staff"; }
                if(req.body.user_type === 'user'){ var dir = "./upload/user"; } 
                if(req.body.user_type === 'company'){ var dir = "./upload/company"; } 
                if(req.body.user_type === 'agent'){ var dir = "./upload/agent"; }
            } 
            var mimetype = ['image/png', 'image/jpeg', 'image/jpeg', 'image/jpg'];
            if (mimetype.indexOf(file.mimetype) != -1) {
                extention = path.extname(file.name);
                filename = "profile_" + req.body.user_id + extention;
                async.waterfall([
                    function (callback) {
                        file.mv(dir + '/' + filename, function (err) {
                            if (err) {
                                callback(err)
                            } else {
                                callback(null, filename)
                            }
                        });
                    },
                    function (filename, callback) {
                        User.update({_id: {$eq: req.body.user_id}}, {$set: {profile_image: filename}}, function (err, response) {
                            if (err) {
                                return next(err);
                            } else {
                                callback(null, {message: "profile image uploaded successfully", data: filename})
                            }
                        });
                    },
                ], function (err, result) {
                    if (err) {
                        return next(err);
                    } else {
                        res.status(config.OK_STATUS).json(result);
                    }
                });
            } else {
                res.status(config.BAD_REQUEST).json({
                    message: "File format is wrong",
                });
            }
        } else {
            res.status(config.BAD_REQUEST).json({
                message: "No file selected",
            });
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

module.exports = router;