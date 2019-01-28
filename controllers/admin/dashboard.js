var express = require('express');
var router = express.Router();

var config = require('./../../config');
const dashboardHelper = require('./../../helper/dashboard');
var ObjectId = require('mongoose').Types.ObjectId;

/**
 * @api {get} /admin/dashboard/no_of_companies counting of rental companies
 * @apiName No of Rental Companies
 * @apiDescription To display counting of rental companies
 * @apiGroup Admin - Dashboard
 * @apiVersion 0.0.0
 * 
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.get('/no_of_companies', async (req, res) => {
    try{
        const dashboardResp = await dashboardHelper.NoOfCompaines();
        if(dashboardResp.status === 'success'){
            res.status(config.OK_STATUS).json(dashboardResp);
        } else{
            res.status(config.BAD_REQUEST).json(dashboardResp);
        }
    } catch(e){
        res.status(config.BAD_REQUEST).json(dashboardResp);
    }   
});

module.exports = router;