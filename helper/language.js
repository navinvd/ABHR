var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
const Languagepage = require('./../models/language_page');
const Language = require('../models/languages');
let LanguageHelper = {};

// add language page 
LanguageHelper.addLanguagepage = async (data) => {
        let add_language = new Languagepage(data);
        //console.log('helper by=====>'.data);
        try {
            let data = await add_language.save();
            return { status: 'success', message: "Language page has been added", data:data }
        } catch (err) {
            return { status: 'failed', message: "Error occured while adding new Language page" };
        }
};

// update language page 
LanguageHelper.updateLanguagepage = async (data) => {
    let langpage = await Languagepage.update({ "_id": data.page_id , isDeleted: false}, { $set: { "page_name": data.page_name}});
    if (langpage) {
        return { status: 'success', message: "Language page updated successfully" }
    }
    else {
        return { status: 'failed', message: "Error occured while updating Language page" }
    }
};

// add language msg 
LanguageHelper.addLanguagemsg = async (data) => {
    let add_languagemsg = new Language(data);
    //console.log('helper by=====>'.data);
    try {
        let data = await add_languagemsg.save();
        return { status: 'success', message: "Language msg has been added", data:data }
    } catch (err) {
        return { status: 'failed', message: "Error occured while adding new Language msg" };
    }
};

// update language msg 
LanguageHelper.updateLanguagemsg = async (data) => {
    console.log('helper by=====>'.data);
    
let langmsg = await Language.updateMany({ "_id": data._id ,"page_id": data.page_id,"msg_constant": data.msg_constant, isDeleted: false}, { $set: { "language_message_english": data.language_message_english, "language_message_arabic": data.language_message_arabic}});
if (langmsg) {
    return { status: 'success', message: "Language msg updated successfully" }
}
else {
    return { status: 'failed', message: "Error occured while updating Language msg" }
}
};
module.exports = LanguageHelper;