var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/sequelize')();

var Card = sequelize.define('Card', {
    // TODO: Relation column
    position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
    },

    title: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: { len: [1, 255]}
    },

    description: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: { len: [1, 255]}
    },

    // TODO: Relation assigned users

    dueDate: {
        type: Sequelize.DATE,
        allowNull: true
    },

    estimate: {
        type: Sequelize.FLOAT,
        allowNull: true,
        validate: { min: 0 }
    }

    // TODO: Relations task(s/lists)
    // TODO: Relation attachments
    // TODO: Relation labels
});

module.exports = Card;

// Relations
// A Card belongs to one column
var Column = require(__dirname + '/column');
Card.belongsTo(Column, { foreignKey: 'columnId' });

/*
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

// Relations
var Column = require(__dirname + '/column');

// A card belongs to a column
Card.belongsTo(Column, 'column', 'columnId', 'id');
*/