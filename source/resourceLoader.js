import fs from 'fs/promises';
import path from 'path';

export const ResourceLoader = function() {}

ResourceLoader.getPath = function(directory, source) {
    return path.join(directory, source);
}

ResourceLoader.loadJSON = async function(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading JSON from ${filePath}`, error);
        throw error;
    }
}

ResourceLoader.loadConfigFiles = async function(directory, source) {
    const fileListPath = this.getPath(directory, source);
    const fileList = await this.loadJSON(fileListPath);

    const promises = [];
    const fileIDs = [];

    for (const key in fileList) {
        const fileConfig = fileList[key];
        const { id, directory, source } = fileConfig;  
        const configPath = this.getPath(directory, source);
        const promise = this.loadJSON(configPath);

        fileIDs.push(id);                            
        promises.push(promise);
    }
    
    const files = {};
    const results = await Promise.allSettled(promises);

    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const fileID = fileIDs[i];

        if (result.status === 'fulfilled') {
            files[fileID] = result.value;
        } else {
            console.error(`Error loading file with ID ${fileID}`, result.reason);
        }
    }

    return files;
}
