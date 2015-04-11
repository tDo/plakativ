var User   = require(__dirname + '/user');
var Board  = require(__dirname + '/board');
var Column = require(__dirname + '/column');
var Card   = require(__dirname + '/card');

// Setup relations
// A board has one owner
User.hasMany(Board, 'boards', 'id', 'ownerId');
Board.belongsTo(User, 'owner', 'ownerId', 'id');

// A board has many columns
Board.hasMany(Column, 'columns', 'id', 'boardId');
Column.belongsTo(Board, 'board', 'boardId', 'id');

// A column has many cards
Column.hasMany(Card, 'cards', 'id', 'columnId');
Card.belongsTo(Column, 'column', 'columnId', 'id');

module.exports = {
    User:   User,
    Board:  Board,
    Column: Column,
    Card:   Card
};