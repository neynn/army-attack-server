export const ConstructionComponent = function() {
    this.stepsRequired = 0;
    this.stepsCompleted = 0;
    this.isComplete = false;
}

ConstructionComponent.prototype.save = function() {
    return [this.stepsRequired, this.stepsCompleted, this.isComplete];
}

ConstructionComponent.prototype.load = function(data) {
    const [stepsRequired, stepsCompleted, isComplete] = data;
    this.stepsRequired = stepsRequired;
    this.stepsCompleted = stepsCompleted;
    this.isComplete = isComplete;
}