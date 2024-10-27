import { State } from "../../source/state/state.js";

export const UnitIdleState = function() {
    State.call(this);
}

UnitIdleState.prototype = Object.create(State.prototype);
UnitIdleState.prototype.constructor = UnitIdleState;

UnitIdleState.prototype.enter = function(stateMachine) {
    const entity = stateMachine.getContext();
}

UnitIdleState.prototype.onEventEnter = function(stateMachine, gameContext, eventCode) {}