var Notifications = require('../models/notifications');
var FCM = require('fcm-node');
var apn = require('apn'); // for ios

var config = require('./../config');
var user_serverKey = config.USER_ANDROID_SERVER_KEY; // ask for mobile dev Android

var agent_serverKey = config.AGENT_ANDROID_SERVER_KEY; // ask for mobile dev Android

var ioskey = 'AuthKey_Y4T4B4SFZB.p8'

var fcm_user = new FCM(user_serverKey);

var fcm_agent = new FCM(agent_serverKey);

var push_notification_helper = {};

var options = {
    token: {
        key: ioskey,
        keyId: "Y4T4B4SFZB",
        teamId: "H7KK72LLTC"
    },
    production: false
};

var apnProvider = new apn.Provider(options); // IOS


// send notification to all agent when new car has been booked or return request from user app
push_notification_helper.sendToAndroid = async (device_token, car_booking_number, notificationFor, message_text, flag) => {
    console.log('Token ARRAY =>>>>', device_token);
    console.log('Notification For =>>>>', notificationFor);
    console.log('Flag =>>>>', flag);
    try {
        if (notificationFor === 'new-booking') {
            var message = {
                // to: 'registration_token',  // single device
                registration_ids: device_token,// one or more device token,
                priority: 'high',
                data: {  //you can send only notification or only data(or include both)
                    booking_number: car_booking_number,
                    title: 'ABHR Agent',
                    message: message_text,
                    body: message_text,
                    flag : flag
                }
            };
        }
        else {
            var message = {
                // to: 'registration_token',  // single device
                registration_ids: device_token,// one or more device token,
                priority: 'high',
                data: {  //you can send only notification or only data(or include both)
                    booking_number: car_booking_number,
                    title: 'ABHR Agent',
                    message: message_text,
                    body: message_text,
                    flag : flag
                }
            };
        }

        // fcm.send(message, async function(err, response){
        //     if (err) {
        //         return {status : 'failed', message : 'Notification has not been sent', data : err }
        //     } else {
        //         return {status : 'success', message : 'Notification has been sent successfully', data : response}
        //     }
        // });

        const promise = new Promise(((resolve) => {

            fcm_agent.send(message, async (err, result) => {
                if (err) {
                    console.log('Notification for all agent =>', err);
                    resolve({ status: 'failed', message: 'Notification has not been sent', data: err })
                } else {
                    console.log('Notification for all agent =>', result);
                    resolve({ status: 'success', message: 'Notification has been sent successfully', data: result })
                }
            });

        }));

        return promise;

    } catch (err) {
        return { status: 'failed', "message": "Error occured while sending push notification to android device", err }
    }
}

// send notification to user when new car has been booked 
push_notification_helper.sendToAndroidUser = (device_token, car_booking_number, message_text, status = '') => {
    console.log('Token ARRAY =>>>>', device_token);

    try {
        var message = {
            to: device_token,  // single device
            // registration_ids: device_token,// one or more device token,
            priority: 'high',
            data: {  //you can send only notification or only data(or include both)
                booking_number: car_booking_number,
                status: status,
                title: 'ABHR',
                message: message_text,
                body: message_text
            }
        };

        const promise = new Promise(((resolve) => {
            fcm_user.send(message, function (err, response) {
                // console.log('res===>',err, 'response==>',response);
                if (err) {
                    console.log('Send notification to android user =>', err);
                    resolve({ status: 'failed', message: 'Notification has not been sent', data: err });
                } else {
                    console.log('Send notification to android user =>', response);
                    resolve({ status: 'success', message: 'Notification has been sent successfully', data: response });
                }
            });
        }));

        return promise;

    } catch (err) {
        return { status: 'failed', "message": "Error occured while sending push notification to android device", err }
    }
}

// send notification to agent when new car booking has been cancelled
push_notification_helper.sendToAndroidAgent = (device_token, car_booking_number, message_text, flag) => {
    console.log('Agent Token ARRAY =>>>>', device_token);

    try {
        console.log('in try=====>');
        var message = {
            to: device_token,  // single device
            // registration_ids: device_token,// one or more device token,
            priority: 'high',
            data: {  //you can send only notification or only data(or include both)
                booking_number: car_booking_number,
                title: 'ABHR',
                message: message_text,
                body: message_text,
                flag : flag
            }
        };

        const promise = new Promise(((resolve) => {
            fcm_agent.send(message, function (err, response) {
                // console.log('res===>',err, 'response==>',response);
                if (err) {
                    console.log('Send notification to android agent =>', err);
                    resolve({ status: 'failed', message: 'Notification has not been sent', data: err });
                } else {
                    console.log('Send notification to android agent =>', response);
                    resolve({ status: 'success', message: 'Notification has been sent successfully', data: response });
                }
            });
        }));

        return promise;

    } catch (err) {
        return { status: 'failed', "message": "Error occured while sending push notification to android device", err }
    }
}


// Send push notification to user IOS APP when new car book
push_notification_helper.sendToIOS = async (device_token, car_booking_number, notificationType, message = '', status = '') => {
    try {
        var note = new apn.Notification();

        note.alert = message;
        note.payload = { "booking_number": car_booking_number, "status": status, "notification_type": notificationType };
        note.topic = "com.Abhr";
        let result = await apnProvider.send(note, device_token);

        console.log('Send notification to IOS user =>', JSON.stringify(result));

        return { status: 'success', message: 'Notification has been sent successfully', data: result }
    } catch (err) {
        return { status: 'failed', "message": "Error occured while sending push notification to IOS device", err }
    }
}


// save single notification to db
push_notification_helper.save_notification_to_db = async (data) => {
    // console.log('DATA=>',data);
    try {
        let save_noti_data = new Notifications(data);

        let dataa = await save_noti_data.save();
        console.log("Sucess => Save single notification to db")

        return { status: "success", message: "Notification has been store successfully" };
    }
    catch (err) {
        console.log("Failure => Save single notification to db")
        return { status: 'failed', message: "Error accured while save notification in collection", err }
    }
}

// save multiple notification to db
push_notification_helper.save_multiple_notification_to_db = async (data) => {
    // console.log('Multi DATA=>',data);
    try {
        // let save_noti_data = new Notifications(data);
        // let dataa = await save_noti_data.save();
        let dataa = await Notifications.insertMany(data);
        console.log("Sucess => Save multiple notification to db")

        return { status: "success", message: "Notification has been store successfully" };
    }
    catch (err) {
        console.log("Failure => Save multiple notification to db")
        return { status: 'failed', message: "Error accured while save notification in collection", err }
    }
}

module.exports = push_notification_helper;
