import { EventEmitter } from "../events/eventEmitter.js";

export const Room = function() {
    this.id = null;
    this.config = {};
    this.settings = {};
    this.clients = new Map();
    this.leaderID = null;
    this.maxClients = 0;
    this.isStarted = false;
    this.events = new EventEmitter();
    this.events.listen(Room.EVENT_MESSAGE_SEND);
    this.events.listen(Room.EVENT_MESSAGE_BROADCAST);
}

Room.EVENT_MESSAGE_SEND = 0;
Room.EVENT_MESSAGE_BROADCAST = 1;

Room.prototype.setID = function(id) {
    this.id = id;
}

Room.prototype.isEmpty = function() {
    return this.clients.size === 0;
}

Room.prototype.isFull = function() {
    return this.clients.size >= this.maxClients;
}

Room.prototype.addClient = function(clientID, client) {
    this.clients.set(clientID, client);
}

Room.prototype.setMaxClients = function(maxClients) {
    this.maxClients = maxClients;
}

Room.prototype.getMaxClients = function() {
    return this.maxClients;
}

Room.prototype.hasClient = function(clientID) {
    return this.clients.has(clientID);
}

Room.prototype.removeClient = function(clientID) {
    this.clients.delete(clientID);
}

Room.prototype.initialize = async function() {

}

Room.prototype.processMessage = async function(messengerID, message) {

}

Room.prototype.getClients = function() {
    return this.clients;
}

Room.prototype.setLeader = function(leaderID) {
    const client = this.clients.get(leaderID);
    client.setLeader(true);
    this.leaderID = leaderID;
}

Room.prototype.getLeaderID = function() {
    return this.leaderID;
}

Room.prototype.hasLeader = function() {
    return this.clients.has(this.leaderID);
}

Room.prototype.isJoinable = function(clientID) {
    if(this.isFull()) {
        return false;
    }

    if(this.clients.has(clientID)) {
        return false;
    }

    return true;
}

Room.prototype.getNextClient = function() {
    const iterator = this.clients.keys();
    const nextClient = iterator.next().value;

    return nextClient;
}

Room.prototype.sendMessage = function(message, clientID) {
    if(!message) {
        return false;
    }

    if(clientID && this.clients.has(clientID)) {
        this.events.emit(Room.EVENT_MESSAGE_SEND, message, clientID);
    } else {
        this.events.emit(Room.EVENT_MESSAGE_BROADCAST, message);
    }

    return true;
}

Room.prototype.isLeader = function(clientID) {
    const member = this.clients.get(clientID);

    if(!member) {
        return false;
    }

    return member.getLeader();
}

Room.prototype.start = function() {
    this.isStarted = true;
}

Room.prototype.end = function() {
    this.isStarted = false;
}

Room.prototype.getStarted = function() {
    return this.isStarted;
}

Room.prototype.getConfig = function(key) {
    if(!key) {
        return this.config;
    }

    if(this.config[key] === undefined) {
        return null;
    }

    return this.config[key];
}
