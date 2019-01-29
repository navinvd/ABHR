var express = require('express');
var router = express.Router();

var config = require('./../../config');
const dashboardHelper = require('./../../helper/dashboard');
var ObjectId = require('mongoose').Types.ObjectId;

// /**
//  * @api {get} /admin/dashboard/no_of_companies counting of rental companies
//  * @apiName No of Rental Companies
//  * @apiDescription To display counting of rental companies
//  * @apiGroup Admin - Dashboard
//  * @apiVersion 0.0.0
//  * 
//  * 
//  * @apiHeader {String}  Content-Type application/json 
//  * @apiHeader {String}  x-access-token Users unique access-key   
//  * 
//  * @apiSuccess (Success 200) {String} message Success message.
//  * @apiError (Error 4xx) {String} message Validation or error message.
//  */
// router.get('/no_of_companies', async (req, res) => {
//     try{
//         const dashboardResp = await dashboardHelper.NoOfCompaines();
//         if(dashboardResp.status === 'success'){
//             res.status(config.OK_STATUS).json(dashboardResp);
//         } else{
//             res.status(config.BAD_REQUEST).json(dashboardResp);
//         }
//     } catch(e){
//         res.status(config.BAD_REQUEST).json(dashboardResp);
//     }   
// });

/**
 * @api {get} /company/dashboard/no_of_cars counting of cars
 * @apiName No of Cars
 * @apiDescription To display counting of cars
 * @apiGroup Admin - Dashboard
 * @apiVersion 0.0.0
 * 
 * @apiParam {String} company_id CompanyId
 * 
 * @apiHeader {String}  Content-Type application/json 
 * @apiHeader {String}  x-access-token Users unique access-key   
 * 
 * @apiSuccess (Success 200) {String} message Success message.
 * @apiError (Error 4xx) {String} message Validation or error message.
 */
router.post('/no_of_cars', async (req, res) => {
    var schema = {
        'email': {
            notEmpty: true,
            errorMessage: "Email is required"
        },
        'password': {
            notEmpty: true,
            errorMessage: "Password is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        try{
            const dashboardResp = await dashboardHelper.NoOfCars();
            if(dashboardResp.status === 'success'){
                res.status(config.OK_STATUS).json(dashboardResp);
            } else{
                res.status(config.BAD_REQUEST).json(dashboardResp);
            }
        } catch(e){
            res.status(config.BAD_REQUEST).json(dashboardResp);
        }  
    } else{
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }  
});

/**
 * @api {get} /admin/dashboard/no_of_rentals counting of rentals
 * @apiName No of Rentals
 * @apiDescription To display counting of rentals
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
router.get('/no_of_rentals', async (req, res) => {
    try{
        const dashboardResp = await dashboardHelper.NoOfRentals();
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