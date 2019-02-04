var FCM = require('fcm-node');
var config = require('./../config');
var serverKey = config.ANDROID_SERVER_KEY; // ask for mobile dev

var fcm = new FCM(serverKey);

var push_notification_helper = {};

// send notification to all agent when new car has been booked or return request from user app
push_notification_helper.sendToAndroid = async (device_token, car_booking_number, notificationFor) => {
    console.log('Token ARRAY =>>>>', device_token);
    console.log('Notification For =>>>>', notificationFor);
    try {
        if (notificationFor === 'new-booking') {
            var message = {
                // to: 'registration_token',  // single device
                registration_ids: device_token,// one or more device token,
                priority: 'high',
                data: {  //you can send only notification or only data(or include both)
                    booking_number: car_booking_number,
                    title: 'ABHR Agent',
                    message: 'New car has been book assign to you for delivery process',
                    body: 'New car has been book assign to you for delivery process'
                }
            };
        }
        else{
            var message = {
                // to: 'registration_token',  // single device
                registration_ids: device_token,// one or more device token,
                priority: 'high',
                data: {  //you can send only notification or only data(or include both)
                    booking_number: car_booking_number,
                    title: 'ABHR Agent',
                    message: 'Assign car return request to you for return process',
                    body: 'Assign car return request to you for return process'
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

            fcm.send(message, async (err, result) => {
                if (err) {
                    console.log('Not Send =>', err);
                    resolve({ status: 'failed', message: 'Notification has not been sent', data: err })
                } else {
                    console.log('Send =>', result);
                    resolve({ status: 'success', message: 'Notification has been sent successfully', data: result })
                }
            });

        }));

        return promise;

    } catch (err) {
        return { status: 'failed', "message": "Error occured while sending push notification to android device", err }
    }
}


module.exports = push_notification_helper;