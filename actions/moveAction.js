import { Action } from "../source/action/action.js";
import { MoveSystem } from "../systems/move.js";
import { PathfinderSystem } from "../systems/pathfinder.js";
import { ACTION_TYPES } from "../enums.js";
import { PlaceSystem } from "../systems/place.js";
import { TeamSystem } from "../systems/team.js";

export const MoveAction = function() {
    Action.call(this);
    this.id = ACTION_TYPES.MOVE;
}

MoveAction.prototype = Object.create(Action.prototype);
MoveAction.prototype.constructor = MoveAction;

MoveAction.prototype.onStart = function(gameContext, request) {
    const { entityID, path } = request;
    const { entityManager } = gameContext;
    const entity = entityManager.getEntity(entityID);

    MoveSystem.beginMove(gameContext, entity, path);
    PlaceSystem.removeEntity(gameContext, entity);
}

MoveAction.prototype.onEnd = function(gameContext, request) {
    const { targetX, targetY, entityID } = request;
    const { entityManager } = gameContext;
    const entity = entityManager.getEntity(entityID);

    MoveSystem.endMove(gameContext, entity, targetX, targetY);
    PlaceSystem.placeEntity(gameContext, entity);
}

MoveAction.prototype.validate = function(gameContext, request, messengerID) {
    const { entityID, targetX, targetY } = request;
    const { entityManager } = gameContext; 
    const targetEntity = entityManager.getEntity(entityID);

    if(!targetEntity) {
        return false;
    }

    const isControlled = TeamSystem.isControlled(targetEntity, messengerID);

    if(!isControlled) {
        return false;
    }

    const validTarget = PathfinderSystem.isEmpty(gameContext, targetX, targetY);

    if(!validTarget) {
        return false;
    }
    
    const nodeList = PathfinderSystem.generateNodeList(gameContext, targetEntity);
    const path = PathfinderSystem.getPath(nodeList, targetX, targetY);

    if(!path) {
        return false;
    }

    request.path = path;

    return true;
}

export const createMoveRequest = function(entityID, targetX, targetY) {
    return {
        "entityID": entityID,
        "type": ACTION_TYPES.MOVE,
        "targetX": targetX,
        "targetY": targetY,
        "path": []
    }
}