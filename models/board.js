var thinky = require(__dirname + '/../util/thinky')();
var type   = thinky.type;
var r      = thinky.r;


var Board = thinky.createModel('Board', {
    id: type.string(),
    name: type.string().required().min(4).max(100),
    ownerId: type.string().required(),
    private: type.boolean(),
    createdAt: type.date().default(r.now())
});

Board.define('addColumn', function(column) {
    this.columns.push(column);
    return this;
});

module.exports = Board;