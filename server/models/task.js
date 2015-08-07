var _         = require('lodash');
var Promise   = require('bluebird');
var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/../libs/sequelize')();
var reorder   = require(__dirname + '/../libs/reorder');
var helpers   = require(__dirname + '/helpers');

var Task = sequelize.define('Task', {
    position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
    },

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
        /**
         * Helper method to check if an object is a task and has been persisted to the database
         * @param obj to check
         * @returns {boolean}
         */
        isTask: function(obj) {
            if (!helpers.isModelOfType(obj, Task)) { return false; }
            return !obj.isNewRecord;
        },

        /**
         * Create a new task instance bound to a specific card. It will automatically
         * be placed at the last task position
         * @param card the task shall be attached to
         * @param taskData further data for the task
         * @returns {bluebird|exports|module.exports}
         */
        make: function(card, taskData) {
            return new Promise(function(resolve, reject) {
                if(!sequelize.models.Card.isCard(card)) { return reject(new Error('Invalid card')); }
                taskData.title = taskData.title || '';

                var task = Task.build(taskData);
                task.validate()
                    .then(function(err) {
                        if (err) { return reject(err); }
                        return Task.max('position', { where: { CardId: card.id }});
                    })
                    .then(function(max) {
                        if (!_.isNumber(max) || _.isNaN(max)) { max = 0; }
                        task.position = max + 1;
                        return task.save();
                    })
                    .then(function() { task.setCard(card); })
                    .then(function() { resolve(task); })
                    .catch(function(err) { reject(err); });
            });
        }
    },

    instanceMethods: {
        /**
         * Moves a task to an absolute offset in the order of tasks. The passed offset itself
         * begins at 1 (Instead of 0) for a bit more "natural" order. The function uses a transaction
         * and will reorder all other task-positions accordingly without fragmentation.
         * @param offset where the task shall be placed
         * @returns {bluebird|exports|module.exports}
         */
        moveTo: function(offset) {
            var that = this;
            return new Promise(function(resolve, reject) {
                // Expect position to be a number
                if (!_.isNumber(offset) && !_.isNaN(offset)) { return reject(new Error('Position offset must be numeric')); }
                if (offset < 1) { offset = 1; }

                that.getCard()
                    .then(function(card) {
                        if (!sequelize.models.Card.isCard(card)) { return reject(new Error('Task is not associated with a valid card')); }

                        // Move it
                        sequelize.transaction(function(t) {
                            return reorder(card, that, offset, t, {
                                parentModel: sequelize.models.Card,
                                childModel:  sequelize.models.Task,
                                fk: 'CardId'
                            });
                        })
                            .then(function() { resolve(); })
                            .catch(function(err) { reject(err); });
                    }).catch(function(err) { reject(err); });
            });
        }
    }
});

module.exports = Task;

var Card = require(__dirname + '/card');

// Relations
// A task belongs to one card
Task.belongsTo(Card);