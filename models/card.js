var Promise   = require('bluebird');
var _         = require('lodash');
var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/sequelize')();
var helpers   = require(__dirname + '/helpers');


/**
 * Internal handler which can update (E.g. rearrange positions and place a new card in order
 * or remove it from a column at all).
 * @param column which shall be updated
 * @param card which shall be handled
 * @param position of the card
 * @param transaction which shall be used
 * @returns {bluebird|exports|module.exports}
 */
function saveCardPositions(column, card, position, transaction) {
    var offset = 1;
    var index  = 0;

    function handleNext(cards, resolve, reject) {
        if (index >= cards.length) { return resolve(); }
        if (position === offset) {
            // If we found the offset for the current card, place it there
            saveCardPosition(column, card, offset, transaction)
                .then(function() {
                    offset = offset + 1;
                    return saveCardPosition(column, cards[index], offset, transaction);
                })
                .then(function() {
                    index  = index + 1;
                    offset = offset + 1;
                    handleNext(cards, resolve, reject);
                })
                .catch(function(err) { reject(err); });
        } else {
            // If we are at any other offset, just handle the position for that card
            saveCardPosition(column, cards[index], offset, transaction)
                .then(function() {
                    index  = index + 1;
                    offset = offset + 1;
                    handleNext(cards, resolve, reject);
                })
                .catch(function(err) { reject(err); });
        }

    }

    return new Promise(function(resolve, reject) {
        if (!sequelize.models.Column.isColumn(column)) { return reject(new Error('Invalid column')); }
        if (!sequelize.models.Card.isCard(card)) { return reject(new Error('Invalid card')); }
        if (!_.isNumber(position) && !_.isNaN(position)) { return reject(new Error('Position must be numeric')); }
        position = position < 0 ? 0 : position;


        sequelize.models.Card.findAll({
            where: {
                ColumnId: column.id,
                id: { $ne: card.id }
            },
            order: [['position', 'ASC']],
            transaction: transaction
        }).then(function(cards) {
            if (!Array.isArray(cards)) { return reject(new Error('Failed to retrieve cards for reordering')); }
            var prom = new Promise(function(resolveSub, rejectSub) {
                // Handle all cards we just retrieved
                handleNext(cards, resolveSub, rejectSub);
            });

            prom.then(function() {
                if (position >= offset) {

                    // Attach card to end
                    saveCardPosition(column, card, offset, transaction)
                        .then(function() { resolve(); })
                        .catch(function(err) { reject(err); });
                } else {
                    resolve();
                }
            })
            .catch(function(err) { reject(err); });

        }).catch(function(err) { reject(err); });
    });
}

/**
 * Update the position and column for a single card
 * @param column where the card shall be placed
 * @param card which shall be handled
 * @param position where it shall be located
 * @param transaction which shall be used
 * @returns {bluebird|exports|module.exports}
 */
function saveCardPosition(column, card, position, transaction) {
    return new Promise(function(resolve, reject) {
        if (!sequelize.models.Column.isColumn(column)) { return reject(new Error('Invalid column')); }
        if (!sequelize.models.Card.isCard(card)) { return reject(new Error('Invalid card')); }
        if (!_.isNumber(position) && !_.isNaN(position)) { return reject(new Error('Position must be numeric')); }
        position = position < 0 ? 0 : position;

        card.updateAttributes({
            position: position,
            ColumnId: column.id
        }, { transaction: transaction })
            .then(function() { resolve(); })
            .catch(function(err) { reject(err); });
    });
}

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
                card.validate()
                     .then(function(err) {
                        if (err) { return reject(err); }
                        return Card.max('position', { where: { ColumnId: column.id }});
                    })
                    .then(function(max) {
                        if (!_.isNumber(max) || _.isNaN(max)) { max = 0; }
                        card.position = max + 1;
                        return card.save();
                    })
                    .then(function() { return card.setColumn(column); })
                    .then(function() { resolve(card); })
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
                    .then(function(board) { return board.hasUser(user); })
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

        /**
         * Assign a label (Which must belong to the same board as the card) to the card
         * @param label which shall be assigned
         * @returns {bluebird|exports|module.exports}
         */
        assignLabel: function(label) {
            var that = this;
            return new Promise(function(resolve, reject) {
                if (!sequelize.models.Label.isLabel(label)) { return reject(new Error('Invalid label')); }
                // Now check for the board (Is the label part of this board?)
                that.getColumn()
                    .then(function(column) { return column.getBoard(); })
                    .then(function(board) { return board.hasLabel(label); })
                    .then(function(isPart) {
                        if (!isPart) { return reject(new Error('The label does not belong to the board')); }
                        return that.addLabel(label);
                    })
                    .then(function() { resolve(); })
                    .catch(function(err) { reject(err); });
            });
        },

        /**
         * Check if a specific label is assigned to this card. It will pass on
         * an "isAssigned" boolean-parameter to the resolve-handler of the returned
         * promise instead of just failing. The reject part will only be called on
         * actual real errors.
         * @param label to check for assignment
         * @returns {bluebird|exports|module.exports}
         */
        isAssignedLabel: function(label) {
            var that = this;

            return new Promise(function(resolve, reject) {
                if (!sequelize.models.Label.isLabel(label)) { return reject(new Error('Invalid label')); }
                that.hasLabel(label)
                    .then(function(isAssigned) { resolve(isAssigned); })
                    .catch(function(err) { reject(err); });
            });
        },

        /**
         * Move the card to a column at a specific offset. This may either be the same
         * column to reposition the card or another column. The offset starts at 1 instead of the typical 0-based
         * offset to get a "more natural" order of cards. This handler will move the card to the actual offset
         * defined in the target-column and ensure that the remaining cards in (both if we move from one column to another)
         * are reordered accordingly to counter fragmentation of the columns. All update-actions are handled in a single
         * transaction so we can ensure that you will not end up with messed up structure at the end if something fails.
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
                if (offset < 1) { offset = 1; }

                that.getColumn()
                    .then(function(cardColumn) {
                        if (!sequelize.models.Column.isColumn(cardColumn)) { return reject(new Error('Card is not associated with a valid column')); }
                        if (cardColumn.BoardId !== column.BoardId) { return reject(new Error('Can not move card to column in different board')); }

                        // Move in same column or to another column?
                        if (cardColumn.id === column.id) {
                            // Move in same column
                            sequelize.transaction(function(t) {
                                return saveCardPositions(column, that, offset, t)
                            })
                              .then(function() { resolve(); })
                              .catch(function(err) { reject(err); });

                        } else {
                            // Move to other columns
                            sequelize.transaction(function(t) {
                                return saveCardPositions(cardColumn, that, 0, t).then(function() {
                                    return saveCardPositions(column, that, offset, t);
                                })
                            })
                                .then(function() { resolve(); })
                                .catch(function(err) { reject(err); });
                        }


                    }).catch(function(err) { reject(err); });
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