import { AttackComponent } from "../../../components/attack.js";
import { HealthComponent } from "../../../components/health.js";
import { MoveComponent } from "../../../components/move.js";
import { TeamComponent } from "../../../components/team.js";
import { clampValue } from "../../../source/math/math.js";
import { PositionComponent } from "../../../components/position.js";
import { SizeComponent } from "../../../components/size.js";
import { ConstructionComponent } from "../../../components/construction.js";

export const componentSetup = {
    
};

componentSetup.setupSizeComponent = function(type) {
    const sizeComponent = new SizeComponent();
    const { dimX, dimY } = type;

    sizeComponent.sizeX = dimX;
    sizeComponent.sizeY = dimY;

    return sizeComponent;
}

componentSetup.setupPositionComponent = function(setup) {
    const positionComponent = new PositionComponent();
    const { tileX, tileY } = setup;

    positionComponent.positionX = 0;
    positionComponent.positionY = 0;
    positionComponent.tileX = tileX;
    positionComponent.tileY = tileY;

    return positionComponent;
}

componentSetup.setupTeamComponent = function(setup) {
    const teamComponent = new TeamComponent();

    if(setup.team !== undefined) {
        teamComponent.teamID = setup.team;
    }
    
    if(setup.master !== undefined) {
        teamComponent.masterID = setup.master;
    }

    return teamComponent;
}

componentSetup.setupMoveComponent = function(type, stats) {
    const moveComponent = new MoveComponent();

    if(type.passability !== undefined) {
        for(const passabilityID of type.passability) {
            moveComponent.passability[passabilityID] = true;
        }
    }

    moveComponent.range = stats.moveRange;

    return moveComponent;
}

componentSetup.setupAttackComponent = function(type, stats) {
    const attackComponent = new AttackComponent();

    attackComponent.damage = stats.damage;
    attackComponent.range = stats.attackRange;

    return attackComponent;
}

componentSetup.setupHealthComponent = function(type, stats) {
    const healthComponent = new HealthComponent();

    healthComponent.health = stats.health;
    healthComponent.maxHealth = stats.health;

    healthComponent.health = clampValue(healthComponent.health, healthComponent.maxHealth, 1); //prevents spawning with 0 health
    
    return healthComponent;
}