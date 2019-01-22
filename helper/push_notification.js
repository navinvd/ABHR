var FCM = require('fcm-node');
var config = require('./../config');
var serverKey = config.ANDROID_SERVER_KEY; // ask for mobile dev

var fcm = new FCM(serverKey);

var push_notification_helper = {};

push_notification_helper.sendToAndroid = async (device_token, car_booking_number) => {
    console.log('Token ARRAY =>>>>', device_token);
    try {
        var message = {
            // to: 'registration_token',  // single device
            registration_ids: device_token,// one or more device token,
            // collapse_key: 'your_collapse_key', // ask for mobile dev
            priority : 'high',
            // notification: {
            //     title: 'Welcome to ABHR 123456',
            // },
            data: {  //you can send only notification or only data(or include both)
                booking_number: car_booking_number,
                title: 'ABHR Agent',
                message : 'New car has been book assign to you for delivery process',
                body : 'New car has been book assign to you for delivery process'
            }

        };

        // fcm.send(message, async function(err, response){
        //     if (err) {
        //         return {status : 'failed', message : 'Notification has not been sent', data : err }
        //     } else {
        //         return {status : 'success', message : 'Notification has been sent successfully', data : response}
        //     }
        // });

        const promise = new Promise(((resolve) => {

            fcm.send(message, async (err, result) => {
                if (err) {
                    resolve({status : 'failed', message : 'Notification has not been sent', data : err })
                } else {
                    resolve({status : 'success', message : 'Notification has been sent successfully', data : result})
                }   
            });

        }));

        return promise;

    } catch (err) {
        return { status: 'failed', "message": "Error occured while sending push notification to android device", err }
    }
}

module.exports = push_notification_helper;