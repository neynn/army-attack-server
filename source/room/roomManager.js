import { EventEmitter } from "../events/eventEmitter.js";
import { IDGenerator } from "../idGenerator.js";
import { response } from "../response.js";
import { Room } from "./room.js";
import { RoomMember } from "./roomMember.js";

export const RoomManager = function() {
    this.id = "ROOM_MANAGER";
    this.rooms = new Map();
    this.activeRooms = new Set();
    this.events = new EventEmitter();
    this.idGenerator = new IDGenerator();
    this.roomTypes = {};

    this.events.listen(RoomManager.EVENT_ROOM_OPENED);
    this.events.listen(RoomManager.EVENT_ROOM_CLOSED);
    this.events.listen(RoomManager.EVENT_CLIENT_JOINED);
    this.events.listen(RoomManager.EVENT_CLIENT_LEFT);
    this.events.listen(RoomManager.EVENT_MESSAGE_RECEIVED);
    this.events.listen(RoomManager.EVENT_MESSAGE_LOST);
    this.events.listen(RoomManager.EVENT_MESSAGE_SEND);
    this.events.listen(RoomManager.EVENT_MESSAGE_BROADCAST);
    this.events.listen(RoomManager.EVENT_ROOM_LEADER_APPOINTED);
}

RoomManager.EVENT_ROOM_OPENED = 0;
RoomManager.EVENT_ROOM_CLOSED = 1;
RoomManager.EVENT_CLIENT_JOINED = 2;
RoomManager.EVENT_CLIENT_LEFT = 3;
RoomManager.EVENT_MESSAGE_RECEIVED = 4;
RoomManager.EVENT_MESSAGE_LOST = 5;
RoomManager.EVENT_MESSAGE_SEND = 6;
RoomManager.EVENT_MESSAGE_BROADCAST = 7;
RoomManager.EVENT_ROOM_LEADER_APPOINTED = 8;

RoomManager.prototype.onStart = function() {
    this.idGenerator.startGenerator();
}

RoomManager.prototype.onEnd = function() {
    this.activeRooms.clear();
    this.rooms.clear();
    this.idGenerator.stop();
}

RoomManager.prototype.getRoom = function(roomID) {
    const room = this.rooms.get(roomID);

    if(!room) {
        return null;
    }

    return room;
}

RoomManager.prototype.registerRoomType = function(typeID, object) {
    if(this.roomTypes[typeID] !== undefined) {
        return false;
    }

    this.roomTypes[typeID] = object;

    return true;
}

RoomManager.prototype.processMessage = function(roomID, messengerID, message) {
    if(!message || !message.type || !message.payload) {
        this.events.emit(RoomManager.EVENT_MESSAGE_LOST, roomID, messengerID, message);

        return false;
    }

    const room = this.rooms.get(roomID);

    if(!room) {
        this.events.emit(RoomManager.EVENT_MESSAGE_LOST, roomID, messengerID, message);

        return false;
    }

    room.processMessage(messengerID, message);

    this.events.emit(RoomManager.EVENT_MESSAGE_RECEIVED, roomID, messengerID, message);

    return true;
}

RoomManager.prototype.createRoom = async function(typeID) {
    const RoomType = this.roomTypes[typeID];

    if(!RoomType) {
        return null;
    }

    const room = new RoomType();
    const roomID = this.idGenerator.getID();

    await room.initialize();
    
    room.setID(roomID);
    room.events.subscribe(Room.EVENT_MESSAGE_SEND, this.id, (message, clientID) => this.events.emit(RoomManager.EVENT_MESSAGE_SEND, roomID, message, clientID));
    room.events.subscribe(Room.EVENT_MESSAGE_BROADCAST, this.id, (message) => this.events.emit(RoomManager.EVENT_MESSAGE_BROADCAST, roomID, message));

    this.rooms.set(roomID, room);
    this.events.emit(RoomManager.EVENT_ROOM_OPENED, roomID);
    
    return roomID;
}

RoomManager.prototype.appointLeader = function(clientID, roomID) {
    const room = this.rooms.get(roomID);

    if(!room) {
        return response(false, "Room does not exist!", "RoomManager.prototype.appointLeader", null, {clientID, roomID});
    }

    if(!room.hasClient(clientID)) {
        return response(false, "Client is not in room!", "RoomManager.prototype.appointLeader", null, {clientID, roomID});
    }

    room.setLeader(clientID);

    this.events.emit(RoomManager.EVENT_ROOM_LEADER_APPOINTED, clientID, roomID);

    return response(true, "Client is now leader!", "RoomManager.prototype.appointLeader", null, {clientID, roomID});
}

RoomManager.prototype.isRoomJoinable = function(clientID, roomID) {
    const room = this.rooms.get(roomID);

    if(!room) {
        return false;
    }

    return room.isJoinable(clientID);
}

RoomManager.prototype.getRoomInformationMessage = function(roomID) {
    const room = this.rooms.get(roomID);

    if(!room) {
        return null;
    }

    const members = [];
    const maxClients = room.getMaxClients();
    const clients = room.getClients();

    for(const [clientID, client] of clients) {
        members.push(client.getName());
    }

    return { "id": roomID, "members": members, "maxMembers": maxClients };
}

RoomManager.prototype.addClientToRoom = function(clientID, clientName, roomID) {
    if(!this.isRoomJoinable(clientID, roomID)) {
        return response(false, "Room is not joinable!", "RoomManager.prototype.addClientToRoom", null, {clientID, roomID});
    }

    const room = this.rooms.get(roomID);
    const member = new RoomMember(clientID, clientName);

    room.addClient(clientID, member);

    this.events.emit(RoomManager.EVENT_CLIENT_JOINED, clientID, roomID);

    return response(true, "Client has been added to room!", "RoomManager.prototype.addClientToRoom", null, {clientID, roomID});
}

RoomManager.prototype.removeClientFromRoom = function(clientID, roomID) {
    const room = this.rooms.get(roomID);

    if(!room) {
        return response(false, "Room does not exist!", "RoomManager.prototype.removeClientFromRoom", null, {clientID, roomID});
    }

    if(!room.hasClient(clientID)) {
        return response(false, "Client is not in room!", "RoomManager.prototype.removeClientFromRoom", null, {clientID, roomID});
    }

    room.removeClient(clientID);

    this.events.emit(RoomManager.EVENT_CLIENT_LEFT, clientID, roomID);

    if(room.isEmpty()) {
        this.removeRoom(roomID);
    } else {
        if(!room.hasLeader()) {
            const nextLeader = room.getNextClient();
            this.appointLeader(nextLeader, roomID);
        }
    }

    return response(true, "Client has been removed from room!", "RoomManager.prototype.removeClientFromRoom", null, {clientID, roomID});
}

RoomManager.prototype.removeRoom = function(roomID) {
    if(!this.rooms.has(roomID)) {
        return response(false, "Room does not exist!", "RoomManager.prototype.removeRoom", null, {roomID});
    }

    this.rooms.delete(roomID);
    
    this.events.emit(RoomManager.EVENT_ROOM_CLOSED, roomID);

    if(this.rooms.size === 0) {
        this.idGenerator.reset();
    }

    return response(true, "Room has been deleted!", "RoomManager.prototype.removeRoom", null, {roomID});
}