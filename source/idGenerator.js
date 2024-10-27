export const IDGenerator = function() {
  this.currentID = 0;
  this.generator = this.startGenerator();
}

IDGenerator.prototype.startGenerator = function*() {
  while (true) {
    this.currentID ++;
    const timestamp = Date.now();
    yield `${this.currentID}`;
  }
}

IDGenerator.prototype.getID = function() {
  return this.generator.next().value;
}

IDGenerator.prototype.reset = function() {
  this.currentID = 0;
}

IDGenerator.prototype.stop = function() {
	this.generator.return();
}