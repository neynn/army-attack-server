import { EventEmitter } from "../events/eventEmitter.js";
import { response } from "../response.js";
import { Client } from "./client.js";

export const ClientManager = function() {
    this.clients = new Map();
    this.events = new EventEmitter();
    this.events.listen(ClientManager.EVENT_CLIENT_CREATE);
    this.events.listen(ClientManager.EVENT_CLIENT_DELETE);
    this.events.listen(ClientManager.EVENT_USERID_ADDED);
}

ClientManager.EVENT_CLIENT_CREATE = 0;
ClientManager.EVENT_CLIENT_DELETE = 1;
ClientManager.EVENT_USERID_ADDED = 2;

ClientManager.prototype.onStart = function() {
    
}

ClientManager.prototype.onEnd = function() {
    this.clients.clear();
}

ClientManager.prototype.removeClient = function(clientID) {
    if(!this.clients.has(clientID)) {
        return false;
    }

    this.clients.delete(clientID);
    this.events.emit(ClientManager.EVENT_CLIENT_DELETE, clientID);

    return true;
}

ClientManager.prototype.getClient = function(clientID) {
    const client = this.clients.get(clientID);

    if(!client) {
        return null;
    }

    return client;
}

ClientManager.prototype.createClient = function(socket) {
    const clientID = socket.id;
    const client = new Client();

    client.setSocket(socket);

    this.clients.set(clientID, client);
    this.events.emit(ClientManager.EVENT_CLIENT_CREATE, clientID);

    return clientID;
}

ClientManager.prototype.addUserID = function(clientID, userID) {
    const client = this.clients.get(clientID);

    if(!client) {
        return response(false, "Client does not exist!", "ClientManager.prototype.addUserID", null, {clientID, userID});
    }

    client.setUserID(userID);

    this.events.emit(ClientManager.EVENT_USERID_ADDED, clientID, userID);

    return response(true, "UserID has been set!", "ClientManager.prototype.addUserID", null, {clientID, userID});
}