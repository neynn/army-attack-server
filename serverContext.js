import { RoomManager } from "./source/room/roomManager.js";
import { ClientManager } from "./source/client/clientManager.js";
import { EventEmitter } from "./source/events/eventEmitter.js";
import { response } from "./source/response.js";
import { NETWORK_EVENTS } from "./source/networkEvents.js";
import { ROOM_EVENTS } from "./source/networkEvents.js";
import { ROOM_TYPES } from "./enums.js";
import { VersusRoom } from "./rooms/versus/versusRoom.js";

export const ServerContext = function(io) {
    this.io = io;
    this.config = {};
    this.events = new EventEmitter();
    this.clientManager = new ClientManager();
    this.roomManager = new RoomManager();

    this.events.listen(ServerContext.EVENT_CONNECT);
    this.events.listen(ServerContext.EVENT_DISCONNECT);

    this.initializeEvents();
    this.roomManager.registerRoomType(ROOM_TYPES.VERSUS, VersusRoom);
    this.io.on('connection', (socket) => this.handleConnect(socket));
}

ServerContext.EVENT_CONNECT = 0;
ServerContext.EVENT_DISCONNECT = 1;

ServerContext.prototype.initializeEvents = function() {
    this.events.subscribe(ServerContext.EVENT_CONNECT, "SERVER_CONTEXT", (socket) => {
        console.log(`${socket.id} has connected to the server!`);
    });

    this.events.subscribe(ServerContext.EVENT_DISCONNECT, "SERVER_CONTEXT", (clientID) => {
        console.log(`${clientID} has disconnected from the server!`);
    });

    this.roomManager.events.subscribe(RoomManager.EVENT_CLIENT_JOINED, "SERVER_CONTEXT", (clientID, roomID) => {
        const information = this.roomManager.getRoomInformationMessage(roomID);
        const message = { "type": ROOM_EVENTS.ROOM_UPDATE, "payload": information };
        this.io.in(roomID).emit(NETWORK_EVENTS.MESSAGE, message);
        console.log(`${clientID} joined room ${roomID}`);
    });

    this.roomManager.events.subscribe(RoomManager.EVENT_CLIENT_LEFT, "SERVER_CONTEXT", (clientID, roomID) => {
        const information = this.roomManager.getRoomInformationMessage(roomID);
        const message = { "type": ROOM_EVENTS.ROOM_UPDATE, "payload": information };
        this.io.in(roomID).emit(NETWORK_EVENTS.MESSAGE, message);
        console.log(`${clientID} left room ${roomID}`);
    });

    this.roomManager.events.subscribe(RoomManager.EVENT_ROOM_LEADER_APPOINTED, "SERVER_CONTEXT", (clientID, roomID) => {
        const information = this.roomManager.getRoomInformationMessage(roomID);
        const message = { "type": ROOM_EVENTS.ROOM_UPDATE, "payload": information };
        this.io.in(roomID).emit(NETWORK_EVENTS.MESSAGE, message);
        console.log(`${clientID} is now the leader of room ${roomID}`);
    });

    this.roomManager.events.subscribe(RoomManager.EVENT_ROOM_OPENED, "SERVER_CONTEXT", (roomID) => console.log(`Room ${roomID} has been opened!`));

    this.roomManager.events.subscribe(RoomManager.EVENT_ROOM_CLOSED, "SERVER_CONTEXT", (roomID) => console.log(`Room ${roomID} has been closed!`));

    this.roomManager.events.subscribe(RoomManager.EVENT_MESSAGE_RECEIVED, "SERVER_CONTEXT", (roomID, messengerID, message) => console.log(`Message received! ${roomID, messengerID}`));

    this.roomManager.events.subscribe(RoomManager.EVENT_MESSAGE_LOST, "SERVER_CONTEXT", (roomID, messengerID, message) => `Message lost! ${roomID, messengerID}`);

    this.roomManager.events.subscribe(RoomManager.EVENT_MESSAGE_SEND, "SERVER_CONTEXT", (roomID, message, clientID) => this.io.to(clientID).emit(NETWORK_EVENTS.MESSAGE, message));

    this.roomManager.events.subscribe(RoomManager.EVENT_MESSAGE_BROADCAST, "SERVER_CONTEXT", (roomID, message) => this.io.in(roomID).emit(NETWORK_EVENTS.MESSAGE, message));

    this.clientManager.events.subscribe(ClientManager.EVENT_CLIENT_CREATE, "SERVER_CONTEXT", (clientID) => console.log(`${clientID} has been created!`));

    this.clientManager.events.subscribe(ClientManager.EVENT_CLIENT_DELETE, "SERVER_CONTEXT", (clientID) => console.log(`${clientID} has been removed!`));
    
    this.clientManager.events.subscribe(ClientManager.EVENT_USERID_ADDED, "SERVER_CONTEXT", (clientID, userID) => console.log(`${clientID} is now named ${userID}!`));
}

ServerContext.prototype.handleConnect = function(socket) {
    this.registerNetworkEvents(socket);
    this.clientManager.createClient(socket);
    this.events.emit(ServerContext.EVENT_CONNECT, socket);
}

ServerContext.prototype.handleDisconnect = function(clientID) {
    this.handleRoomLeave(clientID);
    this.clientManager.removeClient(clientID);
    this.events.emit(ServerContext.EVENT_DISCONNECT, clientID);
}

ServerContext.prototype.handleRoomLeave = function(clientID) {
    const client = this.clientManager.getClient(clientID);

    if(!client) {
        return response(false, "Client does not exist!", "NETWORK_EVENTS.LEAVE_ROOM_REQUEST", null, {clientID});
    }

    if(!client.isInRoom()) {
        const clientRoomID = client.getRoomID();
        return response(false, "Client is not in a room!", "NETWORK_EVENTS.LEAVE_ROOM_REQUEST", null, {clientID, clientRoomID});
    }

    const roomID = client.getRoomID();

    client.leaveRoom();

    this.roomManager.removeClientFromRoom(clientID, roomID);

    return response(true, "Client has left the room!", "NETWORK_EVENTS.LEAVE_ROOM_REQUEST", null, {clientID, roomID});
}

ServerContext.prototype.handleRegister = function(clientID, data) {
    this.clientManager.addUserID(clientID, data["user-id"]);
}

ServerContext.prototype.handleRoomCreate = async function(clientID, roomType) {
    const client = this.clientManager.getClient(clientID);

    if(!client) {
        return response(false, "Client does not exist!", "NETWORK_EVENTS.CREATE_ROOM_REQUEST", null, {});
    }

    if(client.isInRoom()) {
        const clientRoomID = client.getRoomID();
        return response(false, "Client is already in room!", "NETWORK_EVENTS.CREATE_ROOM_REQUEST", null, {clientRoomID});
    }

    const roomID = await this.roomManager.createRoom(roomType);

    if(!roomID) {
        return response(false, "RoomType does not exist!", "NETWORK_EVENTS.CREATE_ROOM_REQUEST", null, {});
    }

    if(!this.roomManager.isRoomJoinable(clientID, roomID)) {
        return response(false, "Room is not joinable!", "NETWORK_EVENTS.CREATE_ROOM_REQUEST", null, {});
    }

    const id = client.getID();
    const name = client.getUserID();

    client.joinRoom(roomID);

    this.roomManager.addClientToRoom(id, name, roomID);
    this.roomManager.appointLeader(clientID, roomID);

    return response(true, "Room has been created!", "NETWORK_EVENTS.CREATE_ROOM_REQUEST", null, {roomID});
}

ServerContext.prototype.handleRoomJoin = function(clientID, roomID) {
    const client = this.clientManager.getClient(clientID);

    if(!client) {
        return response(false, "Client does not exist!", "NETWORK_EVENTS.JOIN_ROOM_REQUEST", null, {roomID});
    }

    if(client.isInRoom()) {
        const clientRoomID = client.getRoomID();
        return response(false, "Client is already in room!", "NETWORK_EVENTS.JOIN_ROOM_REQUEST", null, {roomID, clientRoomID});
    }

    if(!this.roomManager.isRoomJoinable(clientID, roomID)) {
        return response(false, "Room is not joinable!", "NETWORK_EVENTS.JOIN_ROOM_REQUEST", null, {roomID});
    }

    const id = client.getID();
    const name = client.getUserID();

    client.joinRoom(roomID);

    this.roomManager.addClientToRoom(id, name, roomID);

    return response(true, "Client joined room!", "NETWORK_EVENTS.JOIN_ROOM_REQUEST", null, {roomID});
}

ServerContext.prototype.handleRoomMessage = function(clientID, message) {
    const client = this.clientManager.getClient(clientID);

    if(!client) {
        return response(false, "Client does not exist!", "NETWORK_EVENTS.MESSAGE_ROOM_REQUEST", null, {});
    }

    if(!client.isInRoom()) {
        return response(false, "Client is not in a room!", "NETWORK_EVENTS.MESSAGE_ROOM_REQUEST", null, {});
    }

    const roomID = client.getRoomID();
    
    this.roomManager.processMessage(roomID, clientID, message);

    return response(true, "Message has been delivered!", "NETWORK_EVENTS.MESSAGE_ROOM_REQUEST", null, {});
}

ServerContext.prototype.registerNetworkEvents = function(socket) {
    socket.on(NETWORK_EVENTS.DISCONNECT, () => this.handleDisconnect(socket.id));
	socket.on(NETWORK_EVENTS.REGISTER_CLIENT_REQUEST, (data) => this.handleRegister(socket.id, data));
    socket.on(NETWORK_EVENTS.CREATE_ROOM_REQUEST, (request) => request(this.handleRoomCreate(socket.id, ROOM_TYPES.VERSUS)));
    socket.on(NETWORK_EVENTS.JOIN_ROOM_REQUEST, (roomID, request) => request(this.handleRoomJoin(socket.id, roomID)));
    socket.on(NETWORK_EVENTS.LEAVE_ROOM_REQUEST, (request) => request(this.handleRoomLeave(socket.id)));
    socket.on(NETWORK_EVENTS.MESSAGE_ROOM_REQUEST, (message, request) => request(this.handleRoomMessage(socket.id, message)));
}

ServerContext.prototype.start = function() {
    this.roomManager.onStart();
    this.clientManager.onStart();
}