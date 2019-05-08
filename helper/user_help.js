var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const Help = require('./../models/user_help');
var async = require("async");

let user_help_Helper = {};

// list of companies 
user_help_Helper.AddArticle = async (insertData) => {
    try{
        var data = {
            topic : insertData.topic,
            description : insertData.description,
            topic_arabic : insertData.topic_arabic,
            description_arabic : insertData.description_arabic,
            userId: insertData.userId,
            userType: insertData.userType
        }
        if(insertData.userType === 'admin'){
            data = Object.assign(data, {"status" : "approved"});
        }else if(insertData.userType === 'agent'){
            data = Object.assign(data, {"status" : "requested"});
        }
        var ArticleModel = new Help(data);
        var Save = await ArticleModel.save();
        console.log('save====>', Save);
        if (Save !== null && Save !== '') {
            return { status: 'success', message: "Article Added Successfully", data: Save}
        }
        else {
            return { status: 'failed', message: "Article Not Added Successfully"};
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while adding article" };
    } 
};

// update article
user_help_Helper.UpdateArticle = async (updateData) => {
    try{
        let Articles = await Help.updateOne({"_id": new ObjectId(updateData.article_id), "isDeleted": false}, { $set: updateData });
        if (Articles !== null && Articles !== '') {
            return { status: 'success', message: "Article Update Successfully"}
        }
        else {
            return { status: 'success', message: "Article Not Update Successfully" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while updating article", e};
    } 
};

// delete article
user_help_Helper.DeleteArticle = async (updateData) => {
    try{
        let Articles = await Help.updateOne({"_id": new ObjectId(updateData.article_id)}, { $set: {"isDeleted": true} });
        if (Articles !== null && Articles !== '') {
            return { status: 'success', message: "Article Deleted Successfully"}
        }
        else {
            return { status: 'success', message: "Article Not Delete Successfully" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while deleting article", e};
    } 
};

// view article
user_help_Helper.ViewArticle = async (article_id) => {
    try{
        let Articles = await Help.findOne({"_id": new ObjectId(article_id), "isDeleted": false});
        if (Articles !== null && Articles !== '') {
            return { status: 'success', message: "Article Found Successfully", data: Articles}
        }
        else {
            return { status: 'success', message: "Article Not found Successfully" };
        }
    } catch(e){
        return { status: 'failed', message: "Error occured while fetching article", e};
    } 
};

module.exports = user_help_Helper;
