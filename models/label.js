var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/sequelize')();
var helpers   = require(__dirname + '/helpers');

var Label = sequelize.define('Label', {
    title: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Label title may not be empty'},
            len: { args: [1, 255], msg: 'Label title is either too long or too short (1..255 characters)' }
        }
    },

    color: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Color must be set'},
            isHexCode: function(value) {
                if (!(/^#(?:[0-9a-f]{3}){1,2}$/i).test(value)) {
                    throw new Error('Color must be a valid hex-color code in either short or long form');
                }
            }
        }
    }
}, {
    classMethods: {
        isLabel: function(obj) {
            if (!helpers.isModelOfType(obj, Label)) { return false; }
            return !obj.isNewRecord;
        },

        make: function(board, labelData) {
            throw new Error('Not implemented');
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