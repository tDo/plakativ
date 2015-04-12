var Promise = require('bluebird');
var _       = require('lodash');
var thinky  = require(__dirname + '/../util/thinky')();
var type    = thinky.type;
var r       = thinky.r;
var helpers = require(__dirname + '/helpers');


var Board = thinky.createModel('Board', {
    id: type.string(),
    name: type.string().required().min(4).max(100),
    ownerId: type.string().required(),
    private: type.boolean().default(true),
    createdAt: type.date().default(r.now())
});

/**
 * Check if a specific object instance is a Board-model instance
 * @param board Object instance to validate
 * @returns {Boolean}
 */
Board.defineStatic('isBoard', function(board) {
    return helpers.isModelOfType(board, Board);
});

/**
 * Retrieve an object as a Board instance. The passed param may be either of the following:
 * - Already a board (Must already be saved in the database)
 * - A board-id (string)
 * @param obj which is either a board-instance or a board-id
 * @returns {Promise}
 */
Board.defineStatic('asBoard', function(obj) {
    return new Promise(function(resolve, reject) {
        // In case it's already a board, resolve here
        if (Board.isBoard(obj)) {
            // Based on the save-status of the instance we proceed
            if (obj.isSaved()) { return resolve(obj); }
            else { return reject(new Error('Board has not been saved to database')); }
        }

        // If that's not the case we might still resolve by id
        if (!_.isString(obj) || _.isEmpty(obj)) { return reject(new Error('Invalid board')); }
        Board.get(obj).getJoin().run()
            .then(function(board) { resolve(board); })
            .error(function() { reject(new Error('Unknown id')); });
    });
});

module.exports = Board;