export const Timer = function(timeStep) {
    this.timeStep = 1/timeStep;
    this.gameTime = 0;
    this.accumulatedTime = 0;
    this.lastTime = 0;
    this.realTime = 0;
    this.passedTime = 0;
    this.updateTimeMS = 1000 / timeStep;
    this.lastCallCount = 0;

    this.updateProxy = (deltaTime) => {
        this.realTime = deltaTime / 1000;
        this.passedTime = this.realTime - this.lastTime;
        this.accumulatedTime += this.passedTime;

        while(this.accumulatedTime > this.timeStep) {
            this.updateFunction(this.timeStep);
            this.gameTime += this.timeStep;
            this.accumulatedTime -= this.timeStep;
            this.lastCallCount ++;
        }
    
        this.lastCallCount = 0;
        this.lastTime = this.realTime;
        this.queue();
    }
}

Timer.prototype.updateFunction = function() {}

Timer.prototype.queue = function() {
    setTimeout(() => this.updateProxy(Date.now()), this.updateTimeMS);
}

Timer.prototype.start = function() {
    this.lastTime = Date.now() / 1000;
    this.queue();
}

Timer.prototype.getRealTime = function() {
    return this.realTime;
}

Timer.prototype.getFixedDeltaTime = function() {
    return this.timeStep;
}

Timer.prototype.getDeltaTime = function() {
    return this.passedTime;
}