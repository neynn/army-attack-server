import { EventEmitter } from "../events/eventEmitter.js";
import { response } from "../response.js";

export const ActionQueue = function() {
    this.actionTypes = {};
    this.queuedActions = [];
    this.currentAction = null;
    this.isSkipping = false;
    this.maxSize = 0;
    this.state = null;

    this.events = new EventEmitter();
    this.events.listen(ActionQueue.EVENT_ACTION_VALID);
    this.events.listen(ActionQueue.EVENT_ACTION_INVALID);
    this.events.listen(ActionQueue.EVENT_ACTION_PROCESS);
}

ActionQueue.IDLE = 0;
ActionQueue.PROCESSING = 1;
ActionQueue.EVENT_ACTION_VALID = 0;
ActionQueue.EVENT_ACTION_INVALID = 1;
ActionQueue.EVENT_ACTION_PROCESS = 2;

ActionQueue.prototype.registerAction = function(actionID, action) {
    if(this.actionTypes[actionID] !== undefined || !action) {
        return response(false, "ActionType is already registered!", "ActionQueue.prototype.registerAction", null, {actionID});
    }

    this.actionTypes[actionID] = action;

    return response(true, "ActionType has been registered!", "ActionQueue.prototype.registerAction", null, {actionID});
}

ActionQueue.prototype.workStart = function() {
    this.state = ActionQueue.IDLE;
}

ActionQueue.prototype.workEnd = function() {
    this.state = null;
    this.queuedActions.length = 0;
    this.currentAction = null;
}

ActionQueue.prototype.processRequest = function(messengerID, request, gameContext) {
    const { type } = request;
    const actionType = this.actionTypes[type];

    if(!actionType) {
        return false;
    }

    const isValid = actionType.validate(gameContext, request, messengerID);

    if(!isValid) {
        this.events.emit(ActionQueue.EVENT_ACTION_INVALID, request, messengerID);
        return false;
    }

    this.events.emit(ActionQueue.EVENT_ACTION_VALID, request, messengerID);
    return true;
}

ActionQueue.prototype.update = function(gameContext) {
    if(this.state !== ActionQueue.IDLE || this.isEmpty()) {
        return false;
    }

    this.state = ActionQueue.PROCESSING;

    const request = this.next();

    if(request) {
        const { type } = request;
        const actionType = this.actionTypes[type];

        this.events.emit(ActionQueue.EVENT_ACTION_PROCESS, request);
        this.currentAction = null;

        actionType.onStart(gameContext, request);
        actionType.onEnd(gameContext, request);
    }

    this.state = ActionQueue.IDLE;

    if(!this.isEmpty()) {
        this.update(gameContext);
    }

    return true;
}

ActionQueue.prototype.queueAction = function(request) {
    if(this.queuedActions.length > this.maxSize) {
        return false;
    }

    if(!request) {
        return false;
    }

    this.queuedActions.push(request);

    return true;
}

ActionQueue.prototype.queuePriorityAction = function(request) {
    if(this.queuedActions.length > this.maxSize) {
        return false;
    }

    if(!request) {
        return false;
    }

    this.queuedActions.unshift(request);

    return true;
}

ActionQueue.prototype.getCurrentAction = function() {
    return this.currentAction;
}

ActionQueue.prototype.isEmpty = function() {
    return this.queuedActions.length === 0;
}

ActionQueue.prototype.isRunning = function() {
    return this.queuedActions.length !== 0 || this.currentAction !== null;
}

ActionQueue.prototype.setMaxSize = function(maxSize) {
    if(maxSize === undefined) {
        return false;
    }

    this.maxSize = maxSize;

    return true;
}

ActionQueue.prototype.next = function() {
    if(this.queuedActions.length === 0) {
        this.currentAction = null;
    } else {
        this.currentAction = this.queuedActions.shift();
    }

    return this.currentAction;
}

ActionQueue.prototype.skipAction = function() { //NOT IMPLEMENTED
    if(this.isRunning()) {
        this.state = ActionQueue.IDLE;
        this.isSkipping = true;
    }
}