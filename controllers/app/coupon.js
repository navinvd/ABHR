var express = require('express');
var router = express.Router();

var config = require('./../../config');
const couponHelper = require('./../../helper/coupon');

/**
 * @api {post} /app/coupon/add Add coupon 
 * @apiName Add New Coupon
 * @apiDescription Used to add coupon
 * @apiGroup App - Coupon
 * 
 * @apiParam {String} coupon_code Add coupon code here
 * @apiParam {Number} discount_rate rate (eg. 50)

 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// add coupon
router.post('/add', async (req, res) => {
    var schema = {
        'coupon_code':{
            notEmpty: true,
            errorMessage: "Please enter coupon code",
        },
        'discount_rate':{
            notEmpty: true,
            errorMessage: "Please enter discount rate for coupon (eg. 50)",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var data = {
            coupon_code : req.body.coupon_code,
            discount_rate : parseInt(req.body.discount_rate)
        }
        const couponResp = await couponHelper.addCoupon(data);

        if(couponResp.status === 'success'){
            res.status(config.OK_STATUS).json(couponResp);
        } else{
            res.status(config.BAD_REQUEST).json(couponResp);
        }
        
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


/**
 * @api {post} /app/coupon/apply Apply coupon code when book car
 * @apiName Apply coupon code
 * @apiDescription Used to use coupon code when book the car
 * @apiGroup App - Coupon
 * 
 * @apiParam {String} user_id id of user
 * @apiParam {String} coupon_code coupon code (eg "ABCD")

 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
// apply coupon code
router.post('/apply', async (req, res) => {
    var schema = {
        'user_id':{
            notEmpty: true,
            errorMessage: "Please enter user id",
        },
        'coupon_code':{
            notEmpty: true,
            errorMessage: "Please enter coupon code",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const couponResp = await couponHelper.applyCoupon(req.body.user_id, req.body.coupon_code);
        if(couponResp.status === 'success'){
            res.status(config.OK_STATUS).json(couponResp);
        } else{
            res.status(config.BAD_REQUEST).json(couponResp);
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});


module.exports = router;