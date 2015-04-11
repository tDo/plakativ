var thinky = require(__dirname + '/../util/thinky')();
var type   = thinky.type;
var r      = thinky.r;


var Card = thinky.createModel('Card', {
    id: type.string(),
    columnId: type.string(),
    order: type.number().integer(),
    title: type.string(),
    description: type.string(),
    dueDate: type.date().default(null),
    tasks: [{
        done: type.boolean().default(false),
        description: type.string()
    }],
    createdAt: type.date().default(r.now())
});

Card.ensureIndex('order');

module.exports = Card;