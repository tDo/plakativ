var _         = require('lodash');
var Promise   = require('bluebird');
var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/../libs/sequelize')();
var jsonpatch = require('fast-json-patch');
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
        defaultValue: false,
        validate: {
            isBoolean: { msg: 'Done flag must be a boolean' }
        }
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
                sequelize.transaction(function(t) {
                    return task.validate()
                        .then(function (err) {
                            if (err) { return Promise.reject(err); }
                            return Task.max('position', { where: { CardId: card.id }, transaction: t });
                        })
                        .then(function (max) {
                            if (!_.isNumber(max) || _.isNaN(max)) { max = 0; }
                            task.position = max + 1;
                            return task.save({ transaction: t });
                        })
                        .then(function () {
                            return task.setCard(card, { transaction: t });
                        });
                })
                    .then(function() { resolve(task); })
                    .catch(function(err) { reject(err); });
            });
        }
    },

    instanceMethods: {
        /**
         * Patch handler which can be used to apply partial changes to a task
         * using the JSON-patch format as defined in RFC 6902. Beside static fields
         * this handler can also be used to trigger a position change, which internally
         * calls the move handler. The whole operation is atomic and will be rolled back
         * on faults.
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

                sequelize.transaction(function(t) {
                    // Apply direct changes
                    that.set('title', data.title);
                    that.set('done', data.done);

                    return that.save({ transaction: t })
                        .then(function() {
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
         * Moves a task to an absolute offset in the order of tasks. The passed offset itself
         * begins at 1 (Instead of 0) for a bit more "natural" order. The function uses a transaction
         * and will reorder all other task-positions accordingly without fragmentation.
         * @param offset where the task shall be placed
         * @param {object} [transaction] Optional transaction which shall be used instead of the internal one
         * @returns {bluebird|exports|module.exports}
         */
        moveTo: function(offset, transaction) {
            var that = this;
            return new Promise(function(resolve, reject) {
                // Expect position to be a number
                if (!_.isNumber(offset) && !_.isNaN(offset)) { return reject(new Error('Position offset must be numeric')); }
                if (offset < 1) { offset = 1; }

                helpers.wrapTransaction(function(t) {
                    return that.getCard({ transaction: t })
                        .then(function(card) {
                            if (!sequelize.models.Card.isCard(card)) { return Promise.reject(new Error('Task is not associated with a valid card')); }

                            // Move it
                            return helpers.reorder(card, that, offset, t, {
                                parentModel: sequelize.models.Card,
                                childModel:  sequelize.models.Task,
                                fk: 'CardId'
                            });
                        });
                }, transaction)
                    .then(function() { resolve(); })
                    .catch(function(err) { reject(err); });
            });
        }
    }
});

module.exports = Task;

var Card = require(__dirname + '/card');

// Relations
// A task belongs to one card
Task.belongsTo(Card);