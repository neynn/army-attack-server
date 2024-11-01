import { ActionQueue } from "../../source/action/actionQueue.js";
import { ACTION_TYPES, GAME_EVENTS } from "../../enums.js";
import { ROOM_EVENTS } from "../../source/networkEvents.js";
import { MoveAction } from "../../actions/moveAction.js";
import { ResourceLoader } from "../../source/resourceLoader.js";
import { response } from "../../source/response.js";
import { HealthComponent } from "../../components/health.js";
import { AttackComponent } from "../../components/attack.js";
import { ConstructionComponent } from "../../components/construction.js";
import { MoveComponent } from "../../components/move.js";
import { SubTypeComponent } from "../../components/subType.js";
import { GameContext } from "../../source/gameContext.js";
import { PlaceSystem } from "../../systems/place.js";
import { Entity } from "../../source/entity/entity.js";
import { PositionComponent } from "../../components/position.js";
import { TeamComponent } from "../../components/team.js";
import { ArmyTile } from "./init/armyTile.js";
import { entityFactory } from "./init/entityFactory.js";
import { componentSetup } from "./init/components.js";

export const VersusRoom = function() {
    GameContext.call(this);

    this.teamDecider = 0;
    this.mapID = null;
    this.entityBatch = [];
}

VersusRoom.prototype = Object.create(GameContext.prototype);
VersusRoom.prototype.constructor = VersusRoom;

VersusRoom.STATE_LOBBY = 0;
VersusRoom.STATE_GAME = 1;

VersusRoom.prototype.initialize = async function() {
    const files = await ResourceLoader.loadConfigFiles("rooms/versus", "versusFiles.json");

    this.loadResources(files);
    this.initializeActionQueue();
    this.initializeContext();
}

VersusRoom.prototype.loadResources = function(resources) {
    this.entityManager.loadEntityTypes(resources.entities);
    this.entityManager.loadTraitTypes(resources.traits);
    this.mapLoader.loadMapTypes(resources.maps);
    this.mapLoader.loadConfig(resources.settings.mapLoader);
    this.config = resources.config;
    this.settings = resources.settings;
}

VersusRoom.prototype.initializeActionQueue = function() {
    this.actionQueue.setMaxSize(10);

    this.actionQueue.registerAction(ACTION_TYPES.MOVE, new MoveAction());

    this.actionQueue.events.subscribe(ActionQueue.EVENT_ACTION_INVALID, "VERSUS_ROOM", (request, messengerID) => console.log("INVALID_REQUEST!", request, messengerID));

    this.actionQueue.events.subscribe(ActionQueue.EVENT_ACTION_VALID, "VERSUS_ROOM", (request, messengerID) => console.log("VALID_REQUEST", request, messengerID));

    this.actionQueue.events.subscribe(ActionQueue.EVENT_ACTION_PROCESS, "VERSUS_ROOM", (request) => {
        this.sendMessage({
            "type": GAME_EVENTS.ENTITY_ACTION,
            "payload": request
        });
    });
}

VersusRoom.prototype.initializeContext = function() {
    this.setMaxClients(2);

    this.entityManager.setLoadableComponents({
        "Health": HealthComponent,
        "Attack": AttackComponent,
        "Construction": ConstructionComponent,
        "Move": MoveComponent,
        "SubType": SubTypeComponent
    });
    
    this.entityManager.setSaveableComponents({
        "Health": HealthComponent,
        "Construction": ConstructionComponent
    });
}

VersusRoom.prototype.initializeTilemap = function(mapID) {
    const gameMap = this.mapLoader.getLoadedMap(mapID);

    if(!gameMap) {
        return false;
    }

    const settings = this.getConfig("settings");
    const tileTypes = this.getConfig("tileTypes");
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

VersusRoom.prototype.initializeMap = function(mapID) {
    const gameMap = this.mapLoader.getLoadedMap(mapID);
    const activeMapID = this.mapLoader.getActiveMapID();

    if(!gameMap) {
        return response(false, "Map could not be loaded!", "GameContext.prototype.loadMap", null, {mapID});
    }

    if(activeMapID) {
        if(activeMapID === mapID) {
            return response(false, "Map is already loaded!", "GameContext.prototype.loadMap", null, {mapID});
        }
        
        this.mapLoader.unloadMap(activeMapID);
    }

    this.mapLoader.setActiveMap(mapID);
    this.actionQueue.workStart();
    
    if(!this.mapLoader.mapCache[mapID]) {
        this.mapLoader.mapCache[mapID] = 1;
    }
    
    return response(true, "Map is loaded!", "GameContext.prototype.loadMap", null, {mapID});
}

VersusRoom.prototype.initializeEntity = function(setup) {
    const { type } = setup;
    const typeConfig = this.entityManager.getEntityType(type);

    if(!typeConfig) {
        console.warn(`EntityType ${type} does not exist! Returning null...`);
        return null;
    }

    const entity = entityFactory.buildEntity(this, typeConfig, setup);

    if(!entity) {
        console.warn(`Entity creation failed! Returning null...`);
        return null;
    }

    PlaceSystem.placeEntity(this, entity);

    this.entityManager.enableEntity(entity.id); 

    return entity;
}

VersusRoom.prototype.initializeController = function(setup) {
    const controller = new Entity("CONTROLLER");
    const teamComponent = componentSetup.setupTeamComponent(setup);

    controller.addComponent(teamComponent);
    controller.isMapLoaded = false;

    return controller;
}

VersusRoom.prototype.saveEntity = function(entityID) {
    const entity = this.entityManager.getEntity(entityID);

    if(!entity) {
        return null;
    }

    const positionComponent = entity.getComponent(PositionComponent);
    const teamComponent = entity.getComponent(TeamComponent);
    const savedComponents = this.entityManager.saveComponents(entity);

    return {
        "type": entity.config.id,
        "tileX": positionComponent.tileX,
        "tileY": positionComponent.tileY,
        "team": teamComponent.teamID,
        "master": teamComponent.masterID,
        "components": savedComponents
    }
}

VersusRoom.prototype.processMessage = async function(messengerID, message) {
    const { type, payload } = message;

    switch(type) {
        case ROOM_EVENTS.START_INSTANCE: {
            if(!this.isFull() || this.isStarted || !this.isLeader(messengerID)) {
                return;
            }

            this.start();
            this.handleStartInstance(messengerID, message);
            break;
        }
        case GAME_EVENTS.ENTITY_ACTION: {
            this.handleEntityAction(messengerID, message);
            break;
        }
        case GAME_EVENTS.INSTANCE_MAP: {
            this.handleMapInstanceAttempt(messengerID, message);
            break;
        }
        default: {
            console.error("Message type is unknown!", type);
        }
    }
}

VersusRoom.prototype.handleStartInstance = async function(messengerID, message) {
    const { type, payload } = message;
    const { mapID } = payload;

    this.sendMessage({
        "type": ROOM_EVENTS.START_INSTANCE,
        "payload": {}
    });

    for(const [memberID, member] of this.clients) {
        const teamID = this.teamDecider % 2 === 0 ? "1" : "0";
        const controller = this.initializeController({
            "team": teamID,
            "master": memberID
        });

        this.controllers.set(memberID, controller);

        this.sendMessage({
            "type": GAME_EVENTS.INSTANCE_CONTROLLER,
            "payload": {
                "team": teamID,
                "master": memberID
            }
        }, memberID);

        this.teamDecider ++;
    }

    const mapData = await this.mapLoader.loadMapData(mapID);

    if(!mapData) {
        return null;
    }

    const clients = Array.from(this.clients.keys());
    const setups = [
        { "id": null, "type": "blue_battletank", "tileX": 0, "tileY": 0, "team": "1", "master": clients[0] },
        { "id": null, "type": "red_battletank", "tileX": 2, "tileY": 0, "team": "0", "master": clients[1] }
    ];

    this.mapID = mapID;
    this.entityBatch = setups;
    this.mapLoader.createMapFromData(mapID, mapData);
    this.initializeMap(mapID);
    this.initializeTilemap(mapID);

    for(const setup of setups) {
        const entity = this.initializeEntity(setup);
        setup.id = entity.id;
    }

    this.sendMessage({
        "type": GAME_EVENTS.INSTANCE_MAP,
        "payload": {
            "id": mapID
        }
    });
}

VersusRoom.prototype.handleMapInstanceAttempt = function(messengerID, message) {
    const { payload } = message;
    const { success, error } = payload;

    if(!success) {
        console.error(error);
        console.error("RESENDING FULL MAP DATA");

        this.mapLoader.loadMapData(this.mapID).then(mapData => {
            this.sendMessage({
                "type": GAME_EVENTS.INSTANCE_MAP_FROM_DATA,
                "payload": {
                    "id": this.mapID,
                    "data": mapData
                }
            }, messengerID);
        });

        return false;
    }

    const nextController = this.controllers.get(messengerID);

    if(!nextController) {
        return false;
    }

    this.sendMessage({
        "type": GAME_EVENTS.INSTANCE_ENTITY_BATCH,
        "payload": {
            "batch": this.entityBatch
        }
    }, messengerID);

    nextController.isMapLoaded = true;

    for(const [controllerID, controller] of this.controllers) {
        if(!controller.isMapLoaded) {
            return false;
        }
    }

    delete this.teamDecider;
    delete this.mapID;
    delete this.entityBatch;
    //start the game properly with the turn manager, ect.
}

VersusRoom.prototype.handleEntityAction = function(messengerID, message) {
    const { type, payload } = message;

    if(typeof payload !== "object") {
        return null;
    }

    const isValid = this.actionQueue.processRequest(messengerID, payload, this);

    if(isValid) {
        this.actionQueue.queueAction(payload);
        this.actionQueue.update(this);
    }
}