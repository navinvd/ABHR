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
 * @apiGroup App - Car
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
 * @apiGroup App - User
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

module.exports = router;