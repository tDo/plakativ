var thinky = require(__dirname + '/../util/thinky')();
var type   = thinky.type;
var r      = thinky.r;

var Column = thinky.createModel('Column', {
    id: type.string(),
    boardId: type.string(),
    order: type.number().integer(),
    title: type.string(),
    wipLimit: type.number().integer().min(1),
    createdAt: type.date().default(r.now())
});
Column.ensureIndex('order');
module.exports = Column;

// Relations
var Board = require(__dirname + '/board');
var Card  = require(__dirname + '/card');

// A Column belongs to a board
Column.belongsTo(Board, 'board', 'boardId', 'id');

// And has many cards
Column.hasMany(Card, 'cards', 'id', 'columnId');