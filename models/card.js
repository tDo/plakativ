var Promise   = require('bluebird');
var _         = require('lodash');
var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/sequelize')();
var helpers   = require(__dirname + '/helpers');

var Card = sequelize.define('Card', {
    position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
    },

    title: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Card title may not be empty'},
            len: { args: [1, 255], msg: 'Card title is either too long or too short (1..255 characters)' }
        }
    },

    description: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: ''
    },

    dueDate: {
        type: Sequelize.DATE,
        allowNull: true
    },

    estimate: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 }
    }

    // TODO: Relation attachments
}, {
    classMethods: {
        isCard: function(obj) {
            if (!helpers.isModelOfType(obj, Card)) { return false; }
            return !obj.isNewRecord;
        },

        make: function(column, cardData) {
            return new Promise(function(resolve, reject) {
                if (!sequelize.models.Column.isColumn(column)) { return reject(new Error('Invalid column')); }
                // Workaround for not null parts
                cardData.title       = cardData.title || '';
                cardData.description = cardData.description || '';

                var card = Card.build(cardData);
                Card.max('position', { where: { ColumnId: column.id }})
                    .then(function(max) {
                        if (!_.isNumber(max) || _.isNaN(max)) { max = 0; }
                        card.position = max + 1;
                        return column.addCard(card);
                    })
                    .then(function(card) { resolve(card); })
                    .catch(function(err) { reject(err); });
            });
        }
    },

    instanceMethods: {
        assignUser: function(user) {
            var that = this;
            return new Promise(function(resolve, reject) {
                if (!sequelize.models.User.isUser(user)) { return reject(new Error('Invalid user')); }
                // Now check for the board (Is the user participating?)
                that.getColumn()
                    .then(function(column) { return column.getBoard(); })
                    .then(function(board) { return board.isParticipating(user); })
                    .then(function(isParticipating) {
                        if (!isParticipating) { return reject(new Error('The user is not participating in the board')); }
                        return that.addAssignee(user);
                    })
                    .then(function() { resolve(); })
                    .catch(function(err) { reject(err); });
            });
        },

        isAssignedUser: function(user) {
            var that = this;

            return new Promise(function(resolve, reject) {
                if (!sequelize.models.User.isUser(user)) { return reject(new Error('Invalid user')); }
                that.hasAssignee(user)
                    .then(function(isAssigned) { resolve(isAssigned); })
                    .catch(function(err) { reject(err); });
            });
        },

        assignLabel: function(label) {
            throw new Error('Not implemented');
        },

        moveTo: function(column, offset) {
            var that = this;
            return new Promise(function(resolve, reject) {
                // Expect column to be a column
                if (!sequelize.models.Column.isColumn(column)) { return reject(new Error('Invalid column')); }
                // Expect position to be a number
                if (!_.isNumber(offset) && !_.isNaN(offset)) { return reject(new Error('Position offset must be numeric')); }

                // Ensure the target-column is associated with the same board as the current column
                that.getColumn().then(function(cardColumn) {
                    if (!sequelize.models.Column.isColumn(cardColumn)) { return reject(new Error('Card is not associated with a valid column')); }
                    if (cardColumn.BoardId !== column.BoardId) { return reject(new Error('Can not move card to column in different board')); }

                    // Get one entry with the pos as an offset
                    Card.findOne({offset: offset - 1, where: { ColumnId: column.id }, order: 'position asc'})
                        .then(function (card) {
                            // Did we find some cards which would come after the offset?
                            if (card !== null) {
                                // Found some cards which would still come after
                                var newPos = card.position;
                                // Since we are executing 2 combined updates here, do this in a transaction
                                sequelize.transaction(function(t) {
                                    return Card.update({ position: sequelize.literal('position + 1') },
                                                       { where: { ColumnId: column.id, position: { gte: card.position }}},
                                                       { transaction: t })
                                        .then(function() { return that.update({ ColumnId: column.id, position: newPos }, { transaction: t }); });
                                }).then(function() { resolve(); })
                                  .catch(function(err) { reject(err); });
                            } else {
                                // There are none, thus get the highest pos and move it to the end
                                Card.max('position', { where: { ColumnId: column.id }})
                                    .then(function(max) {
                                        if (!_.isNumber(max) || _.isNaN(max)) {
                                            max = 0;
                                        }
                                        return that.update({ ColumnId: column.id, position: max + 1 });
                                    })
                                    .then(function() { resolve(); })
                                    .catch(function(err) { reject(err); });
                            }

                        })
                        .catch(function(err) {
                            reject(err);
                        });
                });
            });
        }
    }
});

module.exports = Card;

var User   = require(__dirname + '/user');
var Column = require(__dirname + '/column');
var Label  = require(__dirname + '/label');
var Task   = require(__dirname + '/task');

// Relations
// A Card belongs to one column
Card.belongsTo(Column);

// A card may have many users assigned to it
Card.belongsToMany(User, { as: 'Assignees', through: 'CardAssignees' });

// And can have many labels
Card.belongsToMany(Label, { as: 'Labels', through: 'CardLabels' });

// A card may have many tasks
Card.hasMany(Task, { as: 'Tasks' });