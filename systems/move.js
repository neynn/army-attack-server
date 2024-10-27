import { MoveComponent } from "../components/move.js";
import { PositionComponent } from "../components/position.js";

export const MoveSystem = function() {}

MoveSystem.beginMove = function(gameContext, entity, path) {
    const moveComponent = entity.getComponent(MoveComponent);

    moveComponent.path = path;
}

MoveSystem.endMove = function(gameContext, entity, targetX, targetY) {
    const positionComponent = entity.getComponent(PositionComponent);
    const moveComponent = entity.getComponent(MoveComponent);

    positionComponent.tileX = targetX;
    positionComponent.tileY = targetY;

    moveComponent.distance = 0;
    moveComponent.path = [];
}