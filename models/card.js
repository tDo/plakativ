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

        /**
         * Create a new card-instance which is bound to a specific column.
         * It will automatically be placed at the last position in this column.
         * @param column To add the card to
         * @param cardData further data for the column
         * @returns {bluebird|exports|module.exports}
         */
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
        /**
         * Assign a user (Which must be a participant of the board) to this card.
         * @param user which shall be added
         * @returns {bluebird|exports|module.exports}
         */
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

        /**
         * Checks if a specific user is assigned to this card. It will
         * pass on an "isAssigned" boolean-parameter to the resolve-handler
         * of the returned promise. Only on real (actual) errors it will
         * reject the promise
         * @param user which shall be checked for assignment to this card
         * @returns {bluebird|exports|module.exports}
         */
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

        /**
         * Move the card to a column at a specific offset. This may either be the same
         * column to reposition the card or another column. The offset starts at 1 instead of the typical 0-based
         * offset to get a "more natural" order of cards. This handler will move the card to the actual offset
         * defined and increase the position of all following cards. Note that this might lead to fragmentation
         * of the internal position counter, which should be defragmented from time to time.
         * @param column To/In which the card shall be positioned
         * @param offset where the card shall be placed
         * @returns {bluebird|exports|module.exports}
         */
        moveTo: function(column, offset) {
            var that = this;
            return new Promise(function(resolve, reject) {
                // Expect column to be a column
                if (!sequelize.models.Column.isColumn(column)) { return reject(new Error('Invalid column')); }
                // Expect position to be a number
                if (!_.isNumber(offset) && !_.isNaN(offset)) { return reject(new Error('Position offset must be numeric')); }

                // Ensure the target-column is associated with the same board as the current column
                that.getColumn()
                    .then(function(cardColumn) {
                        if (!sequelize.models.Column.isColumn(cardColumn)) { return reject(new Error('Card is not associated with a valid column')); }
                        if (cardColumn.BoardId !== column.BoardId) { return reject(new Error('Can not move card to column in different board')); }

                        // Get one entry with the pos as an offset
                        return Card.findOne({offset: offset - 1, where: { ColumnId: column.id }, order: 'position asc'});
                    })
                    .then(function(card) {
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
                            })
                            .then(function() { resolve(); })
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
                    .catch(function(err) { reject(err); });
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