var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/sequelize')();
var helpers   = require(__dirname + '/helpers');

var Task = sequelize.define('Task', {
    done: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },

    title: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Task title may not be empty'},
            len: { args: [1, 255], msg: 'Task title is either too long or too short (1..255 characters)' }
        }
    }
}, {
    classMethods: {
        isTask: function(obj) {
            if (!helpers.isModelOfType(obj, Task)) { return false; }
            return !obj.isNewRecord;
        },

        make: function(card, taskData) {
            throw new Error('Not implemented');
        }
    }
});

module.exports = Task;

var Card = require(__dirname + '/column');

// Relations
// A task belongs to one card
Task.belongsTo(Card);