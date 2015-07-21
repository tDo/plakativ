var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/sequelize')();
var helpers   = require(__dirname + '/helpers');

var Label = sequelize.define('Label', {
    title: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
        validate: {
            len: { args: [0, 255], msg: 'Label title is either too long or too short (0..255 characters)' }
        }
    },

    color: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Color must be set' },
            isHexCode: function(value) {
                if (!(/^#(?:[0-9a-f]{3}){1,2}$/i).test(value)) {
                    throw new Error('Color must be a valid hex-color code in either short or long form');
                }
            }
        }
    }
}, {
    classMethods: {
        /**
         * Helper function to check if an object is a label and has been persisted to the database
         * @param obj to check
         * @returns {boolean}
         */
        isLabel: function(obj) {
            if (!helpers.isModelOfType(obj, Label)) { return false; }
            return !obj.isNewRecord;
        },

        /**
         * Create a new label-instance which is bound to a specific board.
         * @param board the label shall be bound to
         * @param labelData for the label
         * @returns {Promise}
         */
        make: function(board, labelData) {
            return new Promise(function(resolve, reject) {
                if (!sequelize.models.Board.isBoard(board)) { return reject(new Error('Invalid board')); }
                // Workaround for not null parts
                labelData.title = labelData.title || '';
                labelData.color = labelData.color || '';

                var label;
                Label.create(labelData)
                    .then(function(l) {
                        label = l;
                        return label.setBoard(board);
                    })
                    .then(function() { resolve(label); })
                    .catch(function (err) { reject(err); });
            });
        }
    }
});

module.exports = Label;

var Board = require(__dirname + '/board');
var Card  = require(__dirname + '/column');

// Relations
// A label belongs to one board
Label.belongsTo(Board);

// And can be assigned to many cards
Label.belongsToMany(Card, { as: 'Cards', through: 'CardLabels' });