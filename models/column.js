var Promise = require('bluebird');
var thinky = require(__dirname + '/../util/thinky')();
var type   = thinky.type;
var r      = thinky.r;

var Column = thinky.createModel('Column', {
    id: type.string(),
    boardId: type.string(),
    order: type.number().integer().required(),
    title: type.string().required(),
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

Column.defineStatic('nextOrder', function(board) {
    return Board.asBoard(board)
        .then(function(board) {
            return new Promise(function(resolve, reject) {
                r.table(Column.getTableName())
                    .filter({ boardId: board.id })
                    .max('order')('order')
                    .default(null)
                    .run()
                    .then(function(max) {
                        if (max === null) { return resolve(0); }
                        resolve(max + 1);
                    })
                    .error(function(err) {
                        console.log(err);
                        reject(new Error('Could not get next order index'));
                    });
            });
        });
});

Column.defineStatic('create', function(board, columnData) {
    return Board.asBoard(board)
        .then(function(b) {
            board = b;
            return Column.nextOrder(board);
        }).then(function(order) {
            return new Promise(function(resolve, reject) {
                // Board seems to be fine, create column
                var column = new Column(columnData);
                column.board = board;
                column.order = order;
                column.saveAll({ board: true }).then(function(column) {
                    resolve(column);
                }).error(function() {
                    reject(new Error('Could not create column'));
                });
            });
        });
});