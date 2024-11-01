import { ENTITY_STATES } from "../../../enums.js";
import { UnitDownState } from "../../../states/unit/unitDown.js";
import { UnitIdleState } from "../../../states/unit/unitIdle.js";
import { componentSetup } from "./components.js";

const MODE_STAT_TYPE_ID = "story";

const createUnit = function(gameContext, entity, entitySetup, typeConfig) {
    const attackComponent = componentSetup.setupAttackComponent(typeConfig, typeConfig.stats[MODE_STAT_TYPE_ID]);
    const moveComponent = componentSetup.setupMoveComponent(typeConfig, typeConfig.stats[MODE_STAT_TYPE_ID]);

    //entity.states.addState(ENTITY_STATES.IDLE, new UnitIdleState());
    //entity.states.addState(ENTITY_STATES.DOWN, new UnitDownState());

    entity.addComponent(attackComponent);
    entity.addComponent(moveComponent);

    return entity;
}

const createDefense = function(gameContext, entity, entitySetup, typeConfig) {
    const attackComponent = componentSetup.setupAttackComponent(typeConfig, typeConfig.stats[MODE_STAT_TYPE_ID]);

    entity.addComponent(attackComponent);

    return entity;
}

const createDeco = function(gameContext, entity, entitySetup, typeConfig) {
    return entity;
}

const createBuilding = function(gameContext, entity, entitySetup, typeConfig) {
    return entity;
}

const createHFE = function(gameContext, entity, entitySetup, typeConfig) {
    return entity;
}

const createTown = function(gameContext, entity, entitySetup, typeConfig) {
    return entity;
}

const createConstruction = function(gameContext, entity, entitySetup, typeConfig) {
    return entity;
}

export const entityFactory = {
    "Unit": createUnit,
    "Defense": createDefense,
    "Deco": createDeco,
    "Building": createBuilding,
    "Construction": createConstruction,
    "HFE": createHFE,
    "Town": createTown
};

entityFactory.buildEntity = function(gameContext, type, setup) {
    const { entityManager } = gameContext;
    const { stats, archetype } = type;
    const builder = entityFactory[archetype];

    if(!builder) {
        return null;
    }

    const entity = entityManager.createEntity(setup.type);
    const positionComponent = componentSetup.setupPositionComponent(setup);
    const sizeComponent = componentSetup.setupSizeComponent(type);
    const healthComponent = componentSetup.setupHealthComponent(type, stats[MODE_STAT_TYPE_ID]);
    const teamComponent = componentSetup.setupTeamComponent(setup);

    entity.addComponent(positionComponent);
    entity.addComponent(sizeComponent);
    entity.addComponent(healthComponent);
    entity.addComponent(teamComponent);

    builder(gameContext, entity, setup, type);
    entityManager.loadTraits(entity, stats[MODE_STAT_TYPE_ID].traits);
    entityManager.loadComponents(entity, setup.components);

    //entity.states.setNextState(ENTITY_STATES.IDLE);

    return entity;
}