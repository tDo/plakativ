var Promise = require('bluebird');
var models = require(__dirname + '/../models');

/**
 * Get all boards a user owns or participates in
 * @param userId of the user to get boards for
 * @returns {*}
 */
function get(userId) {
    return new Promise(function(resolve, reject) {
        models.User.get(userId).getJoin().run().then(function(user) {
            // TODO: Better value parsing
            resolve(user.boards);
        }).error(function(err) {
            console.log(err);
            // TODO: Real error-handling
            reject(err);
        });
    });
}

function create(userId, boardData) {
    return new Promise(function(resolve, reject) {
        // First get the user
        models.User.get(userId).run().then(function(user) {
            // TODO: Check how the creation can explode and handle that
            var board = new models.Board(boardData);
            board.owner = user;
            board.save().then(function(result) {
                // TODO: Real save-handling
                resolve(result);
            }).error(function(err) {
                // TODO: Real error-handling
                reject(err);
            });
        }).error(function(err) {
            // TODO: Real error handling
            reject(err);
        });
    });
}

module.exports.get = get;
module.exports.create = create;