export const RoomMember = function(id, name) {
    this.id = id;
    this.name = name;
    this.isLeader = false;
}

RoomMember.prototype.setLeader = function(isLeader) {
    this.isLeader = isLeader;
}

RoomMember.prototype.getName = function() {
    return this.name;
}

RoomMember.prototype.getLeader = function() {
    return this.isLeader;
}