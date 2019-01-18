var express = require('express');
var router = express.Router();
var config = require('./../../config');
var path = require('path');
var async = require("async");
var auth = require('./../../middlewares/auth');
var moment = require('moment');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var _ = require('underscore');
const TermsAndConditionHelper = require('./../../helper/terms_and_condition');

/**
 * @api {get} /admin/legal_settings/ Details of admin terms and conditions
 * @apiName Terms And Condition Details
 * @apiDescription To display Terms And Condition Details 
 * @apiGroup Admin - Terms And Condition
 * 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/', async (req, res) => {
        const termsAndconditionResp = await TermsAndConditionHelper.getDataByuserId();
        if (termsAndconditionResp.status === 'success') {
            res.status(config.OK_STATUS).json(termsAndconditionResp);
        }
        else {
            res.status(config.BAD_REQUEST).json(termsAndconditionResp);
        }
});

module.exports = router;