var Promise   = require('bluebird');
var _         = require('lodash');
var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/../libs/sequelize')();
var jsonpatch = require('fast-json-patch');
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
        allowNull: true,
        validate: {
            isDate: { msg: 'Must be a valid date-string' }
        }
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
                sequelize.transaction(function(t) {
                    return card.validate()
                        .then(function (err) {
                            if (err) { return Promise.reject(err); }
                            return Card.max('position', { where: { ColumnId: column.id }, transaction: t });
                        })
                        .then(function (max) {
                            if (!_.isNumber(max) || _.isNaN(max)) { max = 0; }
                            card.position = max + 1;
                            return card.save({ transaction: t });
                        })
                        .then(function () {
                            return card.setColumn(column, { transaction: t });
                        });
                })
                    .then(function() { resolve(card); })
                    .catch(function(err) { reject(err); });
            });
        }
    },

    instanceMethods: {
        /**
         * Patch handler which can be used to apply partial changes to a card using
         * the JSON-patch format defined in RFC 6902. Besides the static fields this
         * handler can also be used to trigger a position change (Either in a single
         * column or between columns). The whole operation is atomic and rolled back
         * if one of the actions fails.
         * @param patches in RFC 6902 patch format
         * @returns {bluebird|exports|module.exports}
         */
        patch: function(patches) {
            var that = this;
            return new Promise(function(resolve, reject) {
                var data = that.get();

                // Test if the patches can be applied
                var error = jsonpatch.validate(patches, data);
                if (!_.isUndefined(error)) {
                    return reject(new Error('Patches can not be applied'));
                }

                // Seems applicable, thus apply the patches
                jsonpatch.apply(data, patches);

                // And make the update atomic as requested by the rfc
                sequelize.transaction(function(t) {
                    // Apply values that can directly change
                    that.set('title', data.title);
                    that.set('description', data.description);
                    that.set('dueDate', data.dueDate);
                    that.set('estimate', data.estimate);

                    return that.save({ transaction: t })
                        .then(function() {
                            // And update the position if required
                            if (data.position !== that.position ||
                                data.ColumnId !== that.ColumnId) {
                                return sequelize.models.Column.findOne({
                                        where: { id: data.ColumnId },
                                        transaction: t
                                    })
                                    .then(function(col) {
                                        return that.moveTo(col, data.position, t);
                                    });
                            } else {
                                return Promise.resolve();
                            }
                        });
                })
                    .then(function() { resolve(); })
                    .catch(function(err) { reject(err); });
            });
        },

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
                sequelize.transaction(function(t) {
                    return that.getColumn({ transaction: t })
                        .then(function(column) { return column.getBoard({ transaction: t }); })
                        .then(function(board) { return board.hasUser(user, { transaction: t }); })
                        .then(function(isParticipating) {
                            if (!isParticipating) { return Promise.reject(new Error('The user is not participating in the board')); }
                            return that.addAssignee(user, { transaction: t });
                        });
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
                sequelize.transaction(function(t) {
                    return that.getColumn({ transaction: t })
                        .then(function(column) { return column.getBoard({ transaction: t }); })
                        .then(function(board) { return board.hasLabel(label, { transaction: t }); })
                        .then(function(isPart) {
                            if (!isPart) { return Promise.reject(new Error('The label does not belong to the board')); }
                            return that.addLabel(label, { transaction: t });
                        });
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
         * @param {object} [transaction] Optional transaction which shall be used instead of the internal one
         * @returns {bluebird|exports|module.exports}
         */
        moveTo: function(column, offset, transaction) {
            var that = this;
            return new Promise(function(resolve, reject) {
                // Expect column to be a column
                if (!sequelize.models.Column.isColumn(column)) { return reject(new Error('Invalid column')); }
                // Expect position to be a number
                if (!_.isNumber(offset) && !_.isNaN(offset)) { return reject(new Error('Position offset must be numeric')); }
                if (offset < 1) { offset = 1; }

                helpers.wrapTransaction(function(t) {
                    return that.getColumn({ transaction: t })
                        .then(function(cardColumn) {
                            if (!sequelize.models.Column.isColumn(cardColumn)) { return Promise.reject(new Error('Card is not associated with a valid column')); }
                            if (cardColumn.BoardId !== column.BoardId) { return Promise.reject(new Error('Can not move card to column in different board')); }

                            // Options for reordering, which apply to all modes
                            var orderOpts = {
                                parentModel: sequelize.models.Column,
                                childModel:  sequelize.models.Card,
                                fk: 'ColumnId',
                                canChangeParent: true
                            };

                            // Move in same column or to another column?
                            if (cardColumn.id === column.id) {
                                // Move in same column
                                return helpers.reorder(column, that, offset, t, orderOpts);

                            } else {
                                // Move to other columns
                                return helpers.reorder(cardColumn, that, 0, t, orderOpts).then(function() {
                                    return helpers.reorder(column, that, offset, t, orderOpts);
                                });
                            }
                        });
                }, transaction)
                    .then(function() { resolve(); })
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