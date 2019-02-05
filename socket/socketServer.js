var io = require('socket.io')();
var socketFunction = {}
socketFunction.socketStartUp = function (server) {
    console.log('hereeeeee======');
    try{
        io.attach(server);
        io.on('connection', function (client) {
            console.log('New user is connected with socket:');
            client.on('myowntest', function (data) {
                console.log("data => myowntest ",data.name + " " + data.long);
            });
        
            client.on('sendTrakingObject', function (data) {
                console.log("data => sendTrakingObject ",data.UserId + " " + data.BookingNumber + " " + data.Latitude + " " + data.Longitude + " " + data.AgentId);
            });
        });

    } catch(e){
        console.log(e);
    }
    // try{
    //     io.attach(server);
    //     io.on('connection', function (socket) {
    //         console.log('socket====',socket);
    //         console.log("New user is connected with socket:");
    //         socket.on('myowntest',(data)=>{
    //             console.log("data => ",data);
    //         })
    //     });
    // } catch(e){
    //     console.log(e);
    // } 
}
module.exports = socketFunction;