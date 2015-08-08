var Promise   = require('bluebird');
var _         = require('lodash');
var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/../libs/sequelize')();
var jsonpatch = require('fast-json-patch');
var helpers   = require(__dirname + '/helpers');

var Column = sequelize.define('Column', {
    position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
    },

    title: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Column title may not be empty'},
            len: { args: [1, 255], msg: 'Column title is either too long or too short (1..255 characters)' }
        }
    },

    wipLimit: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: { min: 1 }
    }
}, {
    classMethods: {
        /**
         * Helper function to check if an object is a column and has been persisted to the database.
         * @param obj to check
         * @returns {boolean}
         */
        isColumn: function(obj) {
            if (!helpers.isModelOfType(obj, Column)) { return false; }
            return !obj.isNewRecord;
        },

        /**
         * Create a new column-instance which is bound to a specific board.
         * It will automatically be placed at the last column-position
         * @param board the column shall be attached to
         * @param columnData further data for the column
         * @returns {*|Bluebird.Promise}
         */
        make: function(board, columnData) {
            return new Promise(function(resolve, reject) {
                if (!sequelize.models.Board.isBoard(board)) { return reject(new Error('Invalid board')); }
                // Workaround for not null parts
                columnData.title = columnData.title || '';

                var column = Column.build(columnData);
                column.validate()
                    .then(function(err) {
                        if (err) { return reject(err); }
                        return Column.max('position', { where: { BoardId: board.id }});
                    })
                    .then(function(max) {
                        if (!_.isNumber(max) || _.isNaN(max)) { max = 0; }
                        column.position = max + 1;
                        return column.save();
                    })
                    .then(function() { return column.setBoard(board); })
                    .then(function() { resolve(column); })
                    .catch(function(err) { reject(err); });
            });
        }
    },

    instanceMethods: {
        /**
         * Patch handler which can be used to apply partial changes to a column
         * using the JSON-patch format defined in RFC 6902. Beside the static fields
         * this handler can also be used to trigger a position change, which internally
         * calls the move-handler. The whole operation is atomic, thus if one of the actions
         * fails, all will be rolled back.
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

                // And make it atomic (As request by the RFC)
                sequelize.transaction(function(t) {
                    // Apply values that can directly change
                    that.set('title', data.title);
                    that.set('wipLimit', data.wipLimit);

                    return that.save({ transaction: t })
                        .then(function() {
                            // And update the position if required
                            if (data.position !== that.position) {
                                return that.moveTo(data.position, t);
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
         * Moves a column to a an absolute offset in the order of columns (e.g. internally stored position
         * does not matter for reordering, just the actual sequence/order of columns is relevant). The passed
         * offset itsself begins at 1 (Instead of 0 based, thus it reflects a more natural count than the typical
         * index based 0-offset). The function is transaction-protected and will also ensure that order does not
         * become fragmented.
         * @param offset where the column shall be placed in overall order
         * @param {object} [transaction] Optional transaction which shall be used instead of the internal one
         * @returns {*|Promise}
         */
        moveTo: function(offset, transaction) {
            var that = this;
            return new Promise(function(resolve, reject) {
                // Expect position to be a number
                if (!_.isNumber(offset) && !_.isNaN(offset)) { return reject(new Error('Position offset must be numeric')); }
                if (offset < 1) { offset = 1; }

                that.getBoard()
                    .then(function(board) {
                        if (!sequelize.models.Board.isBoard(board)) { return reject(new Error('Card is not associated with a valid board')); }

                        return helpers.wrapTransaction(function(t) {
                            return helpers.reorder(board, that, offset, t, {
                                parentModel: sequelize.models.Board,
                                childModel:  sequelize.models.Column,
                                fk: 'BoardId'
                            });
                        }, transaction)
                            .then(function() { resolve(); })
                            .catch(function(err) { reject(err); });

                    }).catch(function(err) { reject(err); });
            });
        }
    }
});

module.exports = Column;

var Board = require(__dirname + '/board');
var Card = require(__dirname + '/card');

// Relations
// A Column belongs to one board
Column.belongsTo(Board);

// And has many cards
Column.hasMany(Card, { as: 'Cards' });