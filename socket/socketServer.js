var io = require('socket.io')();
var _ = require("underscore");
var socketFunction = {}
var Groups = new Map();
var UsersSockets = new Map();
var AgentsSockets = new Map();
var AdminSockets = new Map();
var allSockets = new Map();
var async = require("async");
var ObjectId = require('mongoose').Types.ObjectId;
var CarBooking = require('./../models/car_booking');

socketFunction.socketStartUp = function (server) {
    try {
        io.attach(server);
        io.on('connection', function (client) {

            client.emit('myowntest',{"name":"riddhi"}, function (responseData) {
                console.log('data', responseData);
            });

            client.on('message', (msg)=>{
                console.log('msg==>',msg);
            });
        /**
		 * @api {socket on} JoinGroup  To Join Group
		 * @apiName Get Group Channels
		 * @apiGroup  Sokets
		 * @apiParam {JSON} data Data of user
		 */
        client.on('JoinGroup', function (data) {
            var BookingId = data.booking_id;
            var user_id = data.user_id;
            var type = data.type;
            
            var allsocketobj = {
                "user_id": user_id,
                "type": type
            }
            allSockets.set(client.id, allsocketobj);
            var Booking = Groups.get(BookingId);
            console.log(Booking);
            if (Booking) {
                if (type === 'agent') {
                    if (typeof Booking['agentId'] === 'undefined' || Booking['agentId'] === null) { 
                        let obj = { ...Booking, agentId: user_id }
                        Groups.set(BookingId, obj);
                    }
                    var Agentsocket = AgentsSockets.get(user_id);
                    if(typeof Agentsocket === 'undefined'){
                        let obj = {
                            socketIds: [client.id]
                        }
                        AgentsSockets.set(user_id, obj);
                    }else{
                        Agentsocket.socketIds.push(client.id);
                    }
                } else if( type === 'user'){
                    if (typeof Booking['userId'] === 'undefined' || Booking['userId'] === null) { 
                        let obj = { ...Booking, userId: user_id }
                        Groups.set(BookingId, obj);
                    }
                    var Usersocket = UsersSockets.get(user_id);
                    if(typeof Usersocket === 'undefined'){
                        let obj = {
                            socketIds: [client.id]
                        }
                        UsersSockets.set(user_id, obj);
                    }else{
                        Usersocket.socketIds.push(client.id);
                    }
                } else if( type === 'admin'){
                    if (typeof Booking['adminId'] === 'undefined' || Booking['adminId'] === null) { 
                        let obj = { ...Booking, adminId: user_id }
                        Groups.set(BookingId, obj);
                    }
                    var Adminsocket = AdminSockets.get(user_id);
                    if(typeof Adminsocket === 'undefined'){
                        let obj = {
                            socketIds: [client.id]
                        }
                        AdminSockets.set(user_id, obj);
                    }else{
                        Adminsocket.socketIds.push(client.id);
                    }
                }
            } else {
                if (type === 'agent') {
                    let obj = { agentId: user_id }
                    Groups.set(BookingId, obj);
                    var Agentsocket = AgentsSockets.get(user_id);
                    console.log('Agentsocket => ', Agentsocket);
                    if(typeof Agentsocket === 'undefined'){
                        let obj = {
                            socketIds: [client.id]
                        }
                        AgentsSockets.set(user_id, obj);
                    }else{
                        Agentsocket.socketIds.push(client.id);
                    }
                } else if (type === 'user') {
                    let obj = { userId: user_id }
                    Groups.set(BookingId, obj);
                    var Usersocket = UsersSockets.get(user_id);
                    if(typeof Usersocket === 'undefined'){
                        let obj = {
                            socketIds: [client.id]
                        }
                        UsersSockets.set(user_id, obj);
                    }else{
                        Usersocket.socketIds.push(client.id);
                    }
                } else if (type === 'admin') {
                    let obj = { adminId: user_id }
                    Groups.set(BookingId, obj);
                    var Adminsocket = AdminSockets.get(user_id);
                    if(typeof Adminsocket === 'undefined'){
                        let obj = {
                            socketIds: [client.id]
                        }
                        AdminSockets.set(user_id, obj);
                    }else{
                        Adminsocket.socketIds.push(client.id);
                    }
                }
            }
        });

        client.on('sendTrakingObject', async function (data) {
            try { 
                var location = [ data.Longitude, data.Latitude ];
                var BookingId = data.booking_id;
                var agent_id = data.agent_id;
                var update = CarBooking.update({ "_id": new ObjectId(BookingId)}, { $set : { "last_location": location}});
                var checkBooking = Groups.get(BookingId);
                if(checkBooking){
                    var checkadmin = AdminSockets.get(checkBooking['adminId']);
                    if(checkadmin){
                        var checkadmins = checkadmin && checkadmin.socketIds && checkadmin.socketIds.length > 0 ? checkadmin.socketIds : [];
                        if(checkadmins.length >0){
                            checkadmins.forEach((value)=>{
                                client.to(value).emit("recieveTrackingObjest", data);
                            });
                        }
                    }
                    var checkuser = UsersSockets.get(checkBooking['userId']);
                    if(checkuser){
                        var checkusers = checkuser && checkuser.socketIds && checkuser.socketIds.length > 0 ? checkuser.socketIds : [];
                        if(checkusers.length >0){
                            checkusers.forEach((value)=>{
                                client.to(value).emit("recieveTrackingObjest", data);
                            });
                        }
                    }
                }
            } catch(e){
                console.log('err==>', e);
            }
        });

        client.on('LeftGroup', function () {
            var socketId = this.id;
            var user = allSockets.get(socketId);
            if(user){
                if(user.type === 'admin'){
                    var checkadmin = AdminSockets.get(user.user_id);
                    if(checkadmin.socketIds.length !== 0){
                        checkadmin = checkadmin.filter(item => item !== socketId);
                        if(checkadmin.length === 0){
                            AdminSockets.delete(user.user_id);
                        }
                    }
                } else if(user.type === 'agent'){
                    var checkagent = AgentsSockets.get(user.user_id);
                    if(checkagent.socketIds.length !== 0){
                        checkagent = checkagent.filter(item => item !== socketId);
                        if(checkagent.length === 0){
                            AgentsSockets.delete(user.user_id);
                        }
                    }
                } else if(user.type === 'user'){
                    var checkuser = UsersSockets.get(user.user_id);
                    if(checkuser.socketIds.length !== 0){
                        checkuser = checkuser.filter(item => item !== socketId);
                        if(checkuser.length === 0){
                            UsersSockets.delete(user.user_id);
                        }
                    }
                }
                allSockets.delete(socketId);
            }
        });

        client.on('recieveTrackingObjest', (data)=> {
            console.log('in recieve===>', data);
        });

            client.on('myowntest', function (data) {
                // console.log('socket_id===>',socket);
                console.log("data => myowntest ", data);
            });

            

            client.on('JoinSocket', function (data) {
                console.log('JoinSocket group==>', data);
            });
        });

    } catch (e) {
        console.log(e);
    }
}
module.exports = socketFunction;