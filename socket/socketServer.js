var io = require('socket.io')();
var socketFunction = {}
socketFunction.socketStartUp = function (server) {
    console.log('hereeeeee======');
    try{
        io.attach(server);
        io.sockets.on('connection', function (socket) {
            console.log('socket====',socket);
            console.log("New user is connected with socket:");
            socket.on('myowntest',(data)=>{
                console.log("data => ",data);
            })
        });
    } catch(e){
        console.log(e);
    } 
}
module.exports = socketFunction;