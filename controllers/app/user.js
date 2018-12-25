var express = require('express');
var router = express.Router();

var config = require('./../../config');
const userHelper = require('./../../helper/user');

var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');


/**
 * @api {get} /app/user/notifications/:userId List of notifications for perticular user
 * @apiName Car Notificationlist
 * @apiDescription To Display notification list
 * @apiGroup AppUser
 *
 * @apiParam {Array}  userId userId
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/notifications/:userId', async (req, res) => {
    var userId = req.params.userId;
    if (userId && (typeof userId != undefined && userId !=null)) {
        const notificationResp = await userHelper.getAllNotifications(new ObjectId(req.params.userId));
        res.json(notificationResp);
    } else{
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "userId required",
        });
    }
});

/**
 * @api {get} /app/user/notification_setting/:userId get notification setting data for perticular user
 * @apiName User Notificationsetting Data
 * @apiDescription To get Notificationsetting Data for perticular user
 * @apiGroup AppUser
 *
 * @apiParam {Array}  userId userId
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/notification_setting/:userId', async (req, res) => {
    var userId = req.params.userId;
    if (userId && (typeof userId != undefined && userId !=null)) {
        const notificationResp = await userHelper.getUsernotificationSettingData(new ObjectId(req.params.userId));
        res.json(notificationResp);
    } else{
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "userId required",
        });
    }
});

/**
 * @api {post} /app/sms/verifyOTP Verify mobile number by mathching OTP
 * @apiName Verify OTP
 * @apiDescription Used to verify mobile number
 * @apiGroup App - SMS
 * @apiVersion 0.0.0
 * 
 * @apiParam {Number} user_id user id
 * @apiParam {Number} mobile_number mobile number
 * @apiParam {Number} country_code country code (eg. 91)
 * @apiParam {Number} otp otp (eg. 859625)

 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// change first name and last name of user
router.post('/changeProfile', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        },
        'first_name': {
            notEmpty: true,
            errorMessage: "Please enter first name"
        },
        'last_name': {
            notEmpty: true,
            errorMessage: "Please enter last name"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {

        var data = {}
        if(req.body.first_name){
            data.first_name = req.body.first_name
        }
        if(req.body.last_name){
            data.last_name = req.body.last_name
        }

        const profileResp = await userHelper.changeProfile(req.body.user_id, data);
        res.json(profileResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: errors
        });
    }
});





module.exports = router;