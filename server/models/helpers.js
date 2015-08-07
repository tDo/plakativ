var _       = require('lodash');
var Promise = require('bluebird');

/**
 * Helper function can be used to verify if a specific object-instance
 * is of a required sequelize model type.
 * @param obj which shall be checked
 * @param requiredModel Model type to check for
 * @returns {boolean}
 */
function isModelOfType(obj, requiredModel) {
    if (!_.isObject(obj)) { return false; }
    try {
        return obj.Model === requiredModel;
    } catch(err) { return false; }
}

/**
 * The reorder-helper allows us to handle placement of childs items
 * of specific parents. (E.g. columns, cards, tasks, etc.). The handler can
 * be defined to only support ordering in a single parent or even move
 * an item from one to another parent. Internally it will required a transaction
 * on which the operation is executed (So we can rollback on errors). The handler
 * will ensure that the items order will not become fragemented and update the
 * positions of all items accordingly.
 * @param parent Item for which to order
 * @param item Which shall be placed at a specific offset
 * @param position The position (Starting at 1 for the first positon) where the item shall be placed
 * @param transaction The transaction to use
 * @param options which define the parent and child models in question as well as the corresponding fk between the models
 * @returns {bluebird|exports|module.exports}
 */
function reorder(parent, item, position, transaction, options) {
    if (!_.isPlainObject(options)) {
        throw new Error('Reorder Options missing');
    }

    if (!_.has(options, 'parentModel') || !_.isObject(options.parentModel)) {
        throw new Error('Parent model missing');
    }

    if (!_.has(options, 'childModel') || !_.isObject(options.childModel)) {
        throw new Error('Child model missing');
    }

    if (!_.has(options, 'fk') || !_.isString(options.fk)) {
        throw new Error('Foreign-key fore parent relationship of reordering is missing');
    }

    if (!_.has(options, 'canChangeParent') || !_.isBoolean(options.canChangeParent)) {
        options.canChangeParent = false;
    }

    function validateParent(obj) {
        if (!isModelOfType(obj, options.parentModel)) { return false; }
        return !obj.isNewRecord;
    }

    function validateChild(obj) {
        if (!isModelOfType(obj, options.childModel)) { return false; }
        return !obj.isNewRecord;
    }

    function savePosition(parent, item, position) {
        return new Promise(function(resolve, reject) {
            if (!validateParent(parent)) { return reject(new Error('Invalid parent for reordering')); }
            if (!validateChild(item)) { return reject(new Error('Invalid child for reordering')); }
            if (!_.isNumber(position) && !_.isNaN(position)) { return reject(new Error('Position must be numeric')); }
            position = position < 0 ? 0 : position;

            var attrs = {};
            attrs.position    = position;

            // Only update the id-entry if the item can actually change parents
            if (options.canChangeParent) {
                attrs[options.fk] = parent.id;
            }

            item.updateAttributes(attrs, { transaction: transaction })
                .then(function() { resolve(); })
                .catch(function(err) { reject(err); });
        });

    }

    var offset = 1;
    var index  = 0;

    function handleNext(items, resolve, reject) {
        if (index >= items.length) { return resolve(); }
        if (position === offset) {
            // If we found the offset if the current item, place it there
            savePosition(parent, item, offset)
                .then(function() {
                    offset = offset + 1;
                    return savePosition(parent, items[index], offset);
                })
                .then(function() {
                    index  = index + 1;
                    offset = offset + 1;
                    handleNext(items, resolve, reject);
                })
                .catch(function(err) { reject(err); });
        } else {
            // If we are at any other offset, just handle the position for that item
            savePosition(parent, items[index], offset)
                .then(function() {
                    index  = index + 1;
                    offset = offset + 1;
                    handleNext(items, resolve, reject);
                })
                .catch(function(err) { reject(err); });
        }
    }

    return new Promise(function(resolve, reject) {
        if (!validateParent(parent)) { return reject(new Error('Invalid parent for reordering')); }
        if (!validateChild(item)) { return reject(new Error('Invalid child for reordering')); }
        if (!_.isNumber(position) && !_.isNaN(position)) { return reject(new Error('Position must be numeric')); }
        position = position < 0 ? 0 : position;

        var findParams = {
            where: { id: { $ne: item.id } },
            order: [['position', 'ASC']],
            transaction: transaction
        };
        findParams.where[options.fk] = parent.id;

        options.childModel.findAll(findParams)
            .then(function(items) {
                if (!Array.isArray(items)) { return reject(new Error('Failed to retrieve items for reordering')); }
                var prom = new Promise(function(resolveSub, rejectSub) {
                    // Handle all items we just retrieved
                    handleNext(items, resolveSub, rejectSub);
                });

                prom.then(function() {
                    if (position >= offset) {
                        // Attach item to end
                        savePosition(parent, item, offset)
                            .then(function() { resolve(); })
                            .catch(function(err) { reject(err); });
                    } else {
                        resolve();
                    }
                }).catch(function(err) { reject(err); });
            }).catch(function(err) { reject(err); });
    });
}

module.exports.isModelOfType = isModelOfType;
module.exports.reorder = reorder;