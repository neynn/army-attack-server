import { Room } from "../source/room/room.js";
import { ActionQueue } from "../source/action/actionQueue.js";
import { EntityManager } from "../source/entity/entityManager.js";
import { MapLoader } from "../source/map/mapLoader.js";
import { ACTION_TYPES, GAME_EVENTS } from "../enums.js";
import { ROOM_EVENTS } from "../source/networkEvents.js";
import { MoveAction } from "../actions/moveAction.js";
import { ResourceLoader } from "../source/resourceLoader.js";
import { initializeEntity, initializeTilemap } from "./versusInitializers.js";
import { response } from "../source/response.js";
import { HealthComponent } from "../components/health.js";
import { AttackComponent } from "../components/attack.js";
import { ConstructionComponent } from "../components/construction.js";
import { MoveComponent } from "../components/move.js";
import { SubTypeComponent } from "../components/subType.js";

export const VersusRoom = function() {
    Room.call(this);
    this.turnManager = null; //Handles the turns and decides which client starts.
    this.entityManager = new EntityManager();
    this.actionQueue = new ActionQueue();
    this.mapLoader = new MapLoader();
    this.state = VersusRoom.STATE_LOBBY;
}

VersusRoom.prototype = Object.create(Room.prototype);
VersusRoom.prototype.constructor = VersusRoom;

VersusRoom.STATE_LOBBY = 0;
VersusRoom.STATE_GAME = 1;

VersusRoom.prototype.initialize = async function() {
    const files = await ResourceLoader.loadConfigFiles("rooms", "versus/versusFiles.json");

    this.setMaxClients(2); //TODO: Change depending on room config! or just keep it here idk.

    this.entityManager.loadEntityTypes(files.entities);
    this.entityManager.loadTraitTypes(files.traits);
    this.mapLoader.loadMapTypes(files.maps);
    this.mapLoader.loadConfig(files.settings.mapLoader);
    this.config = files.config;
    this.settings = files.settings;

    this.actionQueue.setMaxSize(10);

    this.actionQueue.events.subscribe(ActionQueue.EVENT_ACTION_INVALID, "VERSUS_ROOM", (request, messengerID) => console.log("INVALID_REQUEST!", request, messengerID));
    this.actionQueue.events.subscribe(ActionQueue.EVENT_ACTION_VALID, "VERSUS_ROOM", (request, messengerID) => console.log("VALID_REQUEST", request, messengerID));
    this.actionQueue.events.subscribe(ActionQueue.EVENT_ACTION_PROCESS, "VERSUS_ROOM", (request) => {
        this.sendMessage({
            "type": GAME_EVENTS.ENTITY_ACTION,
            "payload": request
        });
    });

    this.actionQueue.registerAction(ACTION_TYPES.MOVE, new MoveAction());

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

VersusRoom.prototype.processMessage = async function(messengerID, message) {
    const { type, payload } = message;

    switch(type) {
        case ROOM_EVENTS.START_INSTANCE: return this.handleStartInstance(messengerID, message);
        case GAME_EVENTS.ENTITY_ACTION: return this.handleEntityAction(messengerID, message);
        default: return null;
    }
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

VersusRoom.prototype.handleStartInstance = async function(messengerID, message) {
    const { type, payload } = message;
    const { mapID } = payload;

    if(!this.isFull() || this.isStarted || !this.isLeader(messengerID)) {
        return null;
    }
    
    this.start();

    this.sendMessage({
        "type": ROOM_EVENTS.START_INSTANCE,
        "payload": {
            
        }
    });

    for(const [memberID, member] of this.clients) {
        this.sendMessage({
            "type": GAME_EVENTS.INSTANCE_CONTROLLER,
            "payload": {
                "team": "1", //What the clienst wished before.
                "master": memberID
            }
        }, memberID);
    }

    const mapData = await this.mapLoader.loadMapData(mapID);

    if(!mapData) {
        return null;
    }

    this.sendMessage({
        "type": GAME_EVENTS.INSTANCE_MAP,
        "payload": {
            "id": mapID,
            "data": mapData
        }
    });

    this.mapLoader.createMapFromData(mapID, mapData);
    this.initMap(mapID);
    initializeTilemap(this, mapID);
    
    //TEST - only the first client gets control of the entities
    const client = this.getNextClient();
    const setup = { "type": "blue_battletank", "tileX": 0, "tileY": 0, "team": 1, "master": client };
    const entity = initializeEntity(this, setup);

    this.sendMessage({
        "type": GAME_EVENTS.INSTANCE_ENTITY,
        "payload": {
            "id": entity.id,
            "setup": setup
        }
    });
}

VersusRoom.prototype.initMap = function(mapID) {
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