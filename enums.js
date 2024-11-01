export const GAME_EVENTS = Object.freeze({
    "INSTANCE_ENTITY": "INSTANCE_ENTITY",
    "INSTANCE_ENTITY_BATCH": "INSTANCE_ENTITY_BATCH",
    "INSTANCE_MAP": "INSTANCE_MAP",
    "INSTANCE_MAP_FROM_DATA": "INSTANCE_MAP_FROM_DATA",
    "INSTANCE_CONTROLLER": "INSTANCE_CONTROLLER",
    "ENTITY_ACTION": "ENTITY_ACTION",
    "ENTITY_DEATH": "ENTITY_DEATH",
    "DROP_ITEM": "DROP_ITEM"
});

export const ROOM_TYPES = Object.freeze({
    "VERSUS": "VERSUS"
});

export const ACTION_TYPES = Object.freeze({
    "MOVE": "MOVE"
});

export const ENTITY_STATES = Object.freeze({
    "IDLE": "IDLE",
    "FIRE": "FIRE",
    "HIT": "HIT",
    "MOVE": "MOVE",
    "DOWN": "DOWN",
    "CONSTRUCTION": "CONSTRUCTION"
});

export const ENTITY_EVENTS = Object.freeze({
    "POSITION_UPDATE": Symbol("POSITION_UPDATE"),
    "DIRECTION_UPDATE": Symbol("DIRECTION_UPDATE"),
    "SPRITE_UPDATE": Symbol("SPRITE_UPDATE"),
    "STAT_UPDATE": Symbol("STAT_UPDATE")
});

export const CONTROLLER_EVENTS = Object.freeze({
    "CLICK": Symbol("CLICK"),
    "SELECT": Symbol("SELECT"),
    "POSITION_UPDATE": Symbol("POSITION_UPDATE")
});