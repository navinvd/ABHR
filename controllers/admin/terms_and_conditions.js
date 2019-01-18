var express = require('express');
var router = express.Router();
var config = require('./../../config');
var User = require('./../../models/users');
var Company = require('./../../models/car_company');
var path = require('path');
var async = require("async");
var ObjectId = require('mongoose').Types.ObjectId;
var auth = require('./../../middlewares/auth');
var moment = require('moment');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var _ = require('underscore');
const TermsAndConditionHelper = require('./../../helper/terms_and_condition');

/**
 * @api {get} /admin/terms_and_conditions/:id Details of admin terms and conditions
 * @apiName Terms And Condition Details
 * @apiDescription To display Terms And Condition Details 
 * @apiGroup Admin - Terms And Condition
 * 
 * @apiParam {user_id} user_id id of User
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/terms_and_conditions/:id', async (req, res) => {
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user id"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const termsAndconditionResp = await TermsAndConditionHelper.getDataByuserId(new ObjectId(req.body.user_id));
        res.json(termsAndconditionResp);
        // if (carResp.status === 'success') {
        //     res.status(config.OK_STATUS).json(carResp);
        // }
        // else {
        //     res.status(config.BAD_REQUEST).json(carResp);
        // }
        // res.json(carResp);
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
        });
    }
});
