import { PositionComponent } from "../components/position.js";
import { TeamComponent } from "../components/team.js";
import { PlaceSystem } from "../systems/place.js";
import { ArmyTile } from "./versus/init/armyTile.js";
import { entityFactory } from "./versus/init/entityFactory.js";

export const saveEntity = function(gameContext, entityID) {
    const { entityManager } = gameContext;
    const entity = entityManager.getEntity(entityID);

    if(!entity) {
        return null;
    }

    const positionComponent = entity.getComponent(PositionComponent);
    const teamComponent = entity.getComponent(TeamComponent);
    const savedComponents = entityManager.saveComponents(entity);

    return {
        "type": entity.config.id,
        "tileX": positionComponent.tileX,
        "tileY": positionComponent.tileY,
        "team": teamComponent.teamID,
        "master": teamComponent.masterID,
        "components": savedComponents
    }
}

export const initializeTilemap = function(gameContext, mapID) {
    const { mapLoader } = gameContext;
    const gameMap = mapLoader.getLoadedMap(mapID);

    if(!gameMap) {
        return false;
    }

    const settings = gameContext.getConfig("settings");
    const tileTypes = gameContext.getConfig("tileTypes");
    const { teamLayerID, typeLayerID } = settings;

    gameMap.loadTiles((map, tileX, tileY, index) => {
        const tile = new ArmyTile();
        const team = map.getLayerTile(teamLayerID, tileX, tileY);
        const type = map.getLayerTile(typeLayerID, tileX, tileY);
        const tileType = tileTypes[type];
        
        if(tileType) {
            const { passability, autoCapture, hasBorder } = tileType;

            tile.hasAutoCapture = autoCapture;
            tile.hasBorder = hasBorder;
            tile.passability = passability;
        } else {
            console.error(`TileType ${type} at [${tileX},${tileY}] does not exist!`);
        }

        tile.team = team;

        return tile;
    });

    return true;
}

export const initializeEntity = function(gameContext, entitySetup) {
    const { entityManager } = gameContext;
    const { type } = entitySetup;
    const typeConfig = entityManager.getEntityType(type);

    if(!typeConfig) {
        console.warn(`EntityType ${type} does not exist! Returning null...`);
        return null;
    }

    const { archetype } = typeConfig;

    if(!entityFactory.isBuildable(archetype)) {
        console.warn(`Archetype ${archetype} does not exist! Returning null...`);
        return null;
    }

    const entity = entityManager.createEntity(type);

    entityFactory.buildEntity(gameContext, entity, typeConfig, entitySetup);
    entityManager.enableEntity(entity.id); 
    PlaceSystem.placeEntity(gameContext, entity);

    return entity;
}