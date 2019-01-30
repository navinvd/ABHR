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
 * @api {get} /company/terms_and_condition/:id Details of company terms and conditions by company id
 * @apiName Terms And Condition Details for company id
 * @apiDescription To display Terms And Condition Details by company Id
 * @apiGroup Company - Terms And Condition
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/:id', async (req, res) => {
    var companyId = req.params.id;
    const termsAndconditionResp = await TermsAndConditionHelper.getCompanyData(companyId);
    if (termsAndconditionResp.status === 'success') {
        res.status(config.OK_STATUS).json(termsAndconditionResp);
    }
    else {
        res.status(config.BAD_REQUEST).json(termsAndconditionResp);
    }
});

/**
 * @api {put} /company/terms_and_condition/update update Details of company terms and conditions
 * @apiName Terms And Condition update details
 * @apiDescription To update Terms And Condition Details 
 * @apiGroup Company - Terms And Condition
 * 
 * @apiParam {String} about_us about_us
 * @apiParam {String} copyright copyright 
 * @apiParam {String} term_condition term_condition 
 * @apiParam {String} privacy_policy privacy_policy 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.put('/update', async (req, res) => {
    var companyId = req.body.company_id;
    delete req.body.company_id;
    let updateData = req.body
    console.log('after deleting companyid=====>',updateData);
    const termsAndconditionResp = await TermsAndConditionHelper.updateCompanyData(companyId, updateData);
    if (termsAndconditionResp.status === 'success') {
        res.status(config.OK_STATUS).json(termsAndconditionResp);
    }
    else {
        res.status(config.BAD_REQUEST).json(termsAndconditionResp);
    }
});

module.exports = router;