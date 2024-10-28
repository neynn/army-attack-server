import { ActionQueue } from "./action/actionQueue.js";
import { EntityManager } from "./entity/entityManager.js";
import { MapLoader } from "./map/mapLoader.js";
import { Room } from "./room/room.js";
import { StateMachine } from "./state/stateMachine.js";

export const GameContext = function() {
    Room.call(this);

    this.controllers = new Map(); //Should be controllerManager
    this.turnManager = null;
    this.entityManager = new EntityManager();
    this.actionQueue = new ActionQueue();
    this.mapLoader = new MapLoader();
    this.states = new StateMachine(this);
}

GameContext.prototype = Object.create(Room.prototype);
GameContext.prototype.constructor = GameContext;

GameContext.prototype.loadResources = function(resources) {

}

GameContext.prototype.initializeContext = function() {

}

GameContext.prototype.initializeActionQueue = function() {

}

GameContext.prototype.initializeTilemap = function(mapID) {

}

GameContext.prototype.initializeMap = function(mapID) {

}

GameContext.prototype.initializeEntity = function(setup) {

}

GameContext.prototype.initializeController = function(setup) {

}

GameContext.prototype.saveEntity = function(entityID) {

}
