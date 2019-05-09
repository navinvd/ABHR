var express = require('express');
var router = express.Router();
var config = require('./../../config');
var Languagepage = require('./../../models/language_page');
var Language = require('../../models/languages');
var path = require('path');
var async = require("async");
var ObjectId = require('mongoose').Types.ObjectId;
var bcrypt = require('bcrypt');
var auth = require('./../../middlewares/auth');
var moment = require('moment');
var SALT_WORK_FACTOR = config.SALT_WORK_FACTOR;
var _ = require('underscore');
var jwt = require('jsonwebtoken');
var mailHelper = require('./../../helper/mail');
const LanguageHelper = require('./../../helper/language');



router.post('/list', async (req, res, next) => {
    console.log('here==================>');
    var schema = {
        'start': {
            notEmpty: true,
            errorMessage: "start is required"
        },
        'length': {
            notEmpty: true,
            errorMessage: "length is required"
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var defaultQuery = [
            {
                $match: {
                    "isDeleted": false
                }
            }
            
        ];
        //console.log('filtered by=====>', req.body.filtered_by);
        // if (typeof req.body.filtered_by !== 'undefined' && req.body.filtered_by) {
        //     defaultQuery.push({
        //         $match: { "app_user_status": req.body.filtered_by }
        //     });
        //  }

      /*  defaultQuery = defaultQuery.concat([
            {
                "$project": {
                    //   data: "$$ROOT",
                    page_name: 1,
                    createdAt: 1,
                   // app_user_status: 1,
                    count: { $size: "$rental" }
                }
            }
        ]);*/
        if (req.body.search != undefined) {
            if (req.body.search.value != undefined) {
                var regex = new RegExp(req.body.search.value);
                var match = { $or: [] };
                req.body['columns'].forEach(function (obj) {
                    if (obj.name) {
                        var json = {};
                        if (obj.isNumber) {
                            json[obj.name] = parseInt(req.body.search.value)
                        } else {
                            json[obj.name] = {
                                "$regex": regex,
                                "$options": "i"
                            }
                        }
                        match['$or'].push(json)
                    }
                });
            }
            var searchQuery = {
                $match: match
            }
            defaultQuery = defaultQuery.concat(searchQuery);
        }
        if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
            var colIndex = req.body.order[0].column;
            var colname = req.body.columns[colIndex].name;
            var order = req.body.order[0].dir;
            if(req.body.columns[colIndex].isNumber){
                if(order == "asc"){
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: 1 }
                    });
                }else{
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: -1 }
                    });
                }
            }else{
                colname = '$' + colname;
                if (order == "asc") {
                    defaultQuery = defaultQuery.concat({
                        $project: {
                            "records": "$$ROOT",
                            "sort_index": { "$toLower": [colname] }
                        }
                    },
                        {
                            $sort: { "sort_index": 1 }
                        },
                        {
                            $replaceRoot: { newRoot: "$records" }
                        })
                } else {
                    defaultQuery = defaultQuery.concat({
                        $project: {
                            "records": "$$ROOT",
                            "sort_index": { "$toLower": [colname] }
                        }
                    },
                    {
                        $sort: {
                            "sort_index": -1
                        }
                    },
                    {
                        $replaceRoot: { newRoot: "$records" }
                    })
                }
            }
        }
        console.log('defaultQuery===>', JSON.stringify(defaultQuery));
        totalRecords = await Languagepage.aggregate(defaultQuery);
        if (req.body.start) {
            defaultQuery.push({
                "$skip": req.body.start
            })
        }
        if (req.body.length) {
            defaultQuery.push({
                "$limit": req.body.length
            })
        }
        Languagepage.aggregate(defaultQuery, function (err, data) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    //result: data.length != 0 ? data[0] : {recordsTotal: 0, data: []}
                    result: { recordsTotal: totalRecords.length, data: data },
                });
            }
        })
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

router.post('/addpage', async (req, res) => { 
    var schema = {
        'page_name': {
            notEmpty: true,
            errorMessage: "Please enter page name",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        //console.log('one by=====>');
            const langpageResp = await LanguageHelper.addLanguagepage({"page_name": req.body.page_name});
       // console.log('two by=====>');
            
            if (langpageResp.status === 'success') {
                res.status(config.OK_STATUS).json(langpageResp);
            } else {
                res.status(config.BAD_REQUEST).json(langpageResp);
            }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

router.post('/updatepage', async (req, res) => {
    var schema = {
        'page_id': {
            notEmpty: true,
            errorMessage: "Please enter page_id",
        }
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        const langpageResp = await LanguageHelper.updateLanguagepage(req.body);
        if (langpageResp.status === 'success') {
            res.status(config.OK_STATUS).json(langpageResp);
        } else {
            res.status(config.BAD_REQUEST).json(langpageResp);
        }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

router.get('/languagepagedetails/:id', (req, res, next) => {
    try {
        var page_id = new ObjectId(req.params.id);
       // var lan_id = req.params.lan_id;

        Language.find({ page_id: { $eq:page_id },isDeleted:{ $eq:false}}, function (err, data) {
            if (err) {
                return next(err);
            } else {
               
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    result: data
                });
            }
        });
    } catch (e) {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: e
        });
    }
});

router.post('/addlanguagemsg', async (req, res) => { 
    var schema = {
        'page_id': {
            notEmpty: true,
            errorMessage: "Please enter page id",
        },
        'msg_constant':{
            notEmpty: true,
            errorMessage: "Please enter msg constant", 
        },
        'language_message_english':{
            notEmpty: true,
            errorMessage: "Please enter language message for english", 
        },
        'language_message_arabic':{
            notEmpty: true,
            errorMessage: "Please enter language message for arabic", 
        }
        
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        //console.log('one by=====>');
            const langmsgResp = await LanguageHelper.addLanguagemsg({"page_id": req.body.page_id,"msg_constant": req.body.msg_constant,"language_message_english":req.body.language_message_english,"language_message_arabic": req.body.language_message_arabic});
       // console.log('two by=====>');
            
            if (langmsgResp.status === 'success') {
                res.status(config.OK_STATUS).json(langmsgResp);
            } else {
                res.status(config.BAD_REQUEST).json(langmsgResp);
            }
    } else {
        res.status(config.BAD_REQUEST).json({
            status: 'failed',
            message: "Validation Error",
            errors
        });
    }
});

router.post('/updatelanguagemsg', async (req, res) => {

    const updates  =req.body;
    console.log(updates);
    const bulkOps = updates.map(update => ({
       // var id = new ObjectId(updates._id);
            updateOne: {
                filter: { _id: ObjectId(update._id),page_id:update.page_id },
                update: { $set: { language_message_english: update.language_message_english ,language_message_arabic: update.language_message_arabic } },
                upsert: true
            }
        }));
    
    //console.log(bulkOps);
    Language.bulkWrite(bulkOps).then(bulkres => {
    
            res.status(config.OK_STATUS).json({
            status: "success",
            message: "Update successfully!!!"
         });
       // console.log(res.insertedCount, res.modifiedCount, res.deletedCount);
    });
});
// not using
router.post('/languagelist', async (req, res, next) => {
    console.log('here==================>');
    var schema = {
       /* 'start': {
            notEmpty: true,
            errorMessage: "start is required"
        },
        'length': {
            notEmpty: true,
            errorMessage: "length is required"
        }*/
        'page_id': new ObjectId(req.params.id),
                  'lan_id':  req.params.lan_id
    };
    req.checkBody(schema);
    var errors = req.validationErrors();
    if (!errors) {
        var defaultQuery = [
            {
                $match: {
                    "isDeleted": false,
                    "page_id": new ObjectId(req.params.id),
                    'lan_id':  req.params.lan_id
                }
            }
            
        ];
        //console.log('filtered by=====>', req.body.filtered_by);
        // if (typeof req.body.filtered_by !== 'undefined' && req.body.filtered_by) {
        //     defaultQuery.push({
        //         $match: { "app_user_status": req.body.filtered_by }
        //     });
        // }

      /*  defaultQuery = defaultQuery.concat([
            {
                "$project": {
                    //   data: "$$ROOT",
                    page_name: 1,
                    createdAt: 1,
                   // app_user_status: 1,
                    count: { $size: "$rental" }
                }
            }
        ]);*/
        if (req.body.search != undefined) {
            if (req.body.search.value != undefined) {
                var regex = new RegExp(req.body.search.value);
                var match = { $or: [] };
                req.body['columns'].forEach(function (obj) {
                    if (obj.name) {
                        var json = {};
                        if (obj.isNumber) {
                            json[obj.name] = parseInt(req.body.search.value)
                        } else {
                            json[obj.name] = {
                                "$regex": regex,
                                "$options": "i"
                            }
                        }
                        match['$or'].push(json)
                    }
                });
            }
            var searchQuery = {
                $match: match
            }
            defaultQuery = defaultQuery.concat(searchQuery);
        }
        if (typeof req.body.order !== 'undefined' && req.body.order.length > 0) {
            var colIndex = req.body.order[0].column;
            var colname = req.body.columns[colIndex].name;
            var order = req.body.order[0].dir;
            if(req.body.columns[colIndex].isNumber){
                if(order == "asc"){
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: 1 }
                    });
                }else{
                    defaultQuery = defaultQuery.concat({
                        $sort: { [colname]: -1 }
                    });
                }
            }else{
                colname = '$' + colname;
                if (order == "asc") {
                    defaultQuery = defaultQuery.concat({
                        $project: {
                            "records": "$$ROOT",
                            "sort_index": { "$toLower": [colname] }
                        }
                    },
                        {
                            $sort: { "sort_index": 1 }
                        },
                        {
                            $replaceRoot: { newRoot: "$records" }
                        })
                } else {
                    defaultQuery = defaultQuery.concat({
                        $project: {
                            "records": "$$ROOT",
                            "sort_index": { "$toLower": [colname] }
                        }
                    },
                    {
                        $sort: {
                            "sort_index": -1
                        }
                    },
                    {
                        $replaceRoot: { newRoot: "$records" }
                    })
                }
            }
        }
        console.log('defaultQuery===>', JSON.stringify(defaultQuery));
        totalRecords = await Language.aggregate(defaultQuery);
       /* if (req.body.start) {
            defaultQuery.push({
                "$skip": req.body.start
            })
        }
        if (req.body.length) {
            defaultQuery.push({
                "$limit": req.body.length
            })
        }*/
        Language.aggregate(defaultQuery, function (err, data) {
            if (err) {
                return next(err);
            } else {
                res.status(config.OK_STATUS).json({
                    message: "Success",
                    //result: data.length != 0 ? data[0] : {recordsTotal: 0, data: []}
                    result: { recordsTotal: totalRecords.length, data: data },
                });
            }
        })
    } else {
        res.status(config.BAD_REQUEST).json({
            message: "Validation Error",
            error: errors
        });
    }
});

module.exports = router;
