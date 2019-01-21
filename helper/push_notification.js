var FCM = require('fcm-node');
var config = require('./../config');
var serverKey = config.ANDROID_SERVER_KEY; // ask for mobile dev

var fcm = new FCM(serverKey);

var push_notification_helper = {};

push_notification_helper.sendToAndroid = async (device_token) => {
    try {
        var message = { 
            // to: 'registration_token',  // single device
            registration_ids : device_token,// one or more device token,
            // collapse_key: 'your_collapse_key', // ask for mobile dev
            
            notification: {
                title: 'Welcome to ABHR',
            },
            data: {  //you can send only notification or only data(or include both)
                carID: '123',
                body : "This is test notification"
            }
        };

        fcm.send(message, function(err, response){
            if (err) {
                return {status : 'failed', message : 'Notification has not been sent', data : err }
            } else {
                return {status : 'success', message : 'Notification has been sent successfully', data : response}
            }
        });

        console.log('Issue here');
    } catch (err) {
        return { status: 'failed', "message": "Error occured while sending push notification to android device", err }
    }
}

module.exports = push_notification_helper;