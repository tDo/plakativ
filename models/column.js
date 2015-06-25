var Promise   = require('bluebird');
var _         = require('lodash');
var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/sequelize')();
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
         * Moves a column to a an absolute offset in the order of columns (e.g. internally stored position
         * does not matter for reordering, just the actual sequence/order of columns is relevant). The passed
         * offset itsself begins at 1 (Instead of 0 based, thus it reflects a more natural count than the typical
         * index based 0-offset). Internally it will reposition all elements after the new position and place
         * the card at that given new offset-position. Note that this handling will lead to fragmentation of the
         * column-positions over time and the position-fields should be defragmented from time to time.
         * @param offset where the column shall be placed in overall order
         * @returns {*|Bluebird.Promise}
         */
        moveTo: function(offset) {
            var that = this;
            return new Promise(function(resolve, reject) {
                // Expect position to be a number
                if (!_.isNumber(offset) && !_.isNaN(offset)) { return reject(new Error('Position offset must be numeric')); }

                // Get one entry with the pos as an offset
                Column.findOne({ offset: offset - 1, where: { BoardId: that.BoardId }, order: 'position asc' })
                    .then(function(column) {
                        // Did we find some columns which would come after the offset?
                        if (column !== null) {
                            // Found some columns which would still come after
                            var newPos = column.position;
                            // Since we are executing 2 combined updates here, do this in a transaction
                            sequelize.transaction(function(t) {
                                return Column.update({ position: sequelize.literal('position + 1') },
                                                     { where: { BoardId: that.BoardId, position: { gte: column.position }}},
                                                     { transaction: t })
                                    .then(function() { return that.update({ position: newPos}, { transaction: t }); });
                            }).then(function() { resolve(); })
                              .catch(function(err) { reject(err); });
                        } else {
                            // There are none, thus get the highest pos and move it to the end
                            Column.max('position', { where: { BoardId: that.BoardId }})
                                .then(function(max) {
                                    if (!_.isNumber(max) || _.isNaN(max)) { max = 0; }
                                    return that.update({ position: max + 1 });
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

module.exports = Column;

var Board = require(__dirname + '/board');
var Card = require(__dirname + '/card');

// Relations
// A Column belongs to one board
Column.belongsTo(Board);

// And has many cards
Column.hasMany(Card, { as: 'Cards' });