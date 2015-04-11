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

Column.define('addCard', function(card) {
    this.cards.push(card);
    return this;
});

module.exports = Column;