export const ConquerSystem = function() {}

//before conversion, check if the tile is neutral
//this has nothing to do with the conversion, so keep it out of here
ConquerSystem.convertTile = function(gameContext, tileX, tileY, teamID) {
    const { mapLoader } = gameContext;
    const activeMap = mapLoader.getActiveMap();

    if(activeMap === null) {
        return false;
    }

    const settings = gameContext.getConfig("settings");
    const tileConversions = gameContext.getConfig("tileConversions");

    for(const layerID in settings.convertableLayers) {
        const graphics = activeMap.getLayerTile(layerID, tileX, tileY);

        if(graphics === null) {
            continue;
        }

        const [setID, animationID] = graphics;
        const conversionSet = tileConversions[setID];

        if(!conversionSet) {
            continue; 
        }

        const conversionAnimation = conversionSet[animationID];

        if(!conversionAnimation) {
            continue;
        }

        const conversion = conversionAnimation[teamID];

        if(!conversion || !Array.isArray(conversion)) {
            continue;
        }

        activeMap.placeTile(conversion, layerID, tileX, tileY);
    }

    return true;
}