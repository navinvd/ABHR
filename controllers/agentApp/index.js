var express = require('express');
var config = require('./../../config');

var router = express.Router();
var ObjectId = require('mongoose').Types.ObjectId;
var async = require("async");

var c = require('./car');
router.use('/car', c);

var User = require('./../../models/users');


router.post('/check_status', async (req, res, next)=>{
    var schema = {
        'user_id': {
            notEmpty: true,
            errorMessage: "Please enter user_id",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
            var check = await User.findOne({"_id": new ObjectId(req.body.user_id), "type":"agent"});
            if(check !== null && check !== ''){
                if(check.isDeleted === true){
                    res.status(config.OK_STATUS).json({
                        "status": "success",
                        "message": "Notification has been found",
                        "data": {
                            "is_deleted": "yes"
                        }
                    });
                }else{
                    res.status(config.OK_STATUS).json({
                        "status": "success",
                        "message": "Notification has not been found",
                        "data": {
                            "is_deleted": "no"
                        }
                    }); 
                }
            }else{
                res.status(config.BAD_REQUEST).json({
                    status: "failed",
                    message: "User not found"
                });
            }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: "failed",
            message: "Validation error"
        });
    }
});


module.exports = router;