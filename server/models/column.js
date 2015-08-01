var Promise   = require('bluebird');
var _         = require('lodash');
var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/../libs/sequelize')();
var helpers   = require(__dirname + '/helpers');

/**
 * Internal handler which can update columns positioning for a board.
 * @param board for which the columns shall be reordered.
 * @param column which shall be placed at a specific position
 * @param position where the columns shall be placed
 * @param transaction which shall be used
 * @returns {bluebird|exports|module.exports}
 */
function saveColumnPositions(board, column, position, transaction) {
    var offset = 1;
    var index  = 0;

    function handleNext(columns, resolve, reject) {
        if (index >= columns.length) { return resolve(); }
        if (position === offset) {
            // If we found the offset for the current column, place it there
            saveColumnPosition(column, position, transaction)
                .then(function() {
                    offset = offset + 1;
                    return saveColumnPosition(columns[index], offset, transaction);
                })
                .then(function() {
                    index = index + 1;
                    offset = offset + 1;
                    handleNext(columns, resolve, reject);
                })
                .catch(function(err) { reject(err); });
        } else {
            // If we are at any other offset, just handle the position for that column
            saveColumnPosition(columns[index], offset, transaction)
                .then(function() {
                    index = index + 1;
                    offset = offset + 1;
                    handleNext(columns, resolve, reject);
                })
                .catch(function(err) { reject(err); });
        }
    }

    return new Promise(function(resolve, reject) {
        if (!sequelize.models.Board.isBoard(board)) { return reject(new Error('Invalid board')); }
        if (!sequelize.models.Column.isColumn(column)) { return reject(new Error('Invalid column')); }
        if (!_.isNumber(position) && !_.isNaN(position)) { return reject(new Error('Position must be numeric')); }
        position = position < 0 ? 0 : position;

        sequelize.models.Column.findAll({
            where: {
                BoardId: board.id,
                id: { $ne: column.id }
            },
            order: [['position', 'ASC']],
            transaction: transaction
        }).then(function(columns) {
            if (!Array.isArray(columns)) { return reject(new Error('Failed to retrieve columns for reordering')); }
            var prom = new Promise(function(resolveSub, rejectSub) {
                // Handle all columns we just retrieved
                handleNext(columns, resolveSub, rejectSub);
            });

            prom.then(function() {
                if (position >= offset) {
                    // Attach column to end
                    saveColumnPosition(column, offset, transaction)
                        .then(function() { resolve(); })
                        .catch(function(err) { reject(err); });
                } else {
                    resolve();
                }
            }).catch(function(err) { reject(err); });
        }).catch(function(err) { reject(err); });
    });
}

/**
 * Update the position for a single column
 * @param column which shall be placed
 * @param position which shall be applied
 * @param transaction which shall be used
 * @returns {bluebird|exports|module.exports}
 */
function saveColumnPosition(column, position, transaction) {
    return new Promise(function(resolve, reject) {
        if (!sequelize.models.Column.isColumn(column)) { return reject(new Error('Invalid column')); }
        if (!_.isNumber(position) && !_.isNaN(position)) { return reject(new Error('Position must be numeric')); }
        position = position < 0 ? 0 : position;

        column.updateAttributes({
            position: position
        }, { transaction: transaction })
            .then(function() { resolve(); })
            .catch(function(err) { reject(err); });
    });
}

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
         * Moves a column to a an absolute offset in the order of columns (e.g. internally stored position
         * does not matter for reordering, just the actual sequence/order of columns is relevant). The passed
         * offset itsself begins at 1 (Instead of 0 based, thus it reflects a more natural count than the typical
         * index based 0-offset). The function is transaction-protected and will also ensure that order does not
         * become fragmented.
         * @param offset where the column shall be placed in overall order
         * @returns {*|Bluebird.Promise}
         */
        moveTo: function(offset) {
            var that = this;
            return new Promise(function(resolve, reject) {
                // Expect position to be a number
                if (!_.isNumber(offset) && !_.isNaN(offset)) { return reject(new Error('Position offset must be numeric')); }
                if (offset < 1) { offset = 1; }

                that.getBoard()
                    .then(function(board) {
                        if (!sequelize.models.Board.isBoard(board)) { return reject(new Error('Card is not associated with a valid board')); }

                        // Move it
                        sequelize.transaction(function(t) {
                            return saveColumnPositions(board, that, offset, t);
                        })
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