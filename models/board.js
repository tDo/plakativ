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
module.exports = Board;

// Relations
var User   = require(__dirname + '/user');
var Column = require(__dirname + '/column');

// A board belongs to a single owner
Board.belongsTo(User, 'owner', 'ownerId', 'id');
// And has many participants
Board.hasAndBelongsToMany(User, 'participants', 'id', 'id');
// And many columns
Board.hasMany(Column, 'columns', 'id', 'boardId');


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

/**
 * Create a new board with a specific user as its owner. If the board
 * is marked as private only the owner and participants will be able to see
 * the boards content. If it's not private other (non participating users) may
 * as well see the content of the board (While they will still not be able to
 * edit it)
 * @param owner of this board
 * @param boardData object in the form of { name: string, private: boolean }
 * @returns {Promise}
 */
Board.defineStatic('create', function(owner, boardData) {
    return User.asUser(owner)
        .then(function(user) {
            return new Promise(function(resolve, reject) {

                // The owner seems fine so far, create the board
                var board = new Board(boardData);
                board.owner = user;
                board.saveAll({ owner: true, participants: false }).then(function(board) {
                    resolve(board);
                }).error(function() {
                    reject(new Error('Could not create board'));
                });
            });
        });
});

/**
 * Verify if a specific user is the owner of this board.
 * @param user whose ownership of the board shall be checked
 * @returns {Promise} which is passed a single bool parameter isOwner to the resolve handler
 */
Board.define('isOwner', function(user) {
    var that = this;
    return User.asUser(user).then(function(user) {
        return new Promise(function(resolve) {
            resolve(that.ownerId === user.id);
        });
    });
});

/**
 * Adds a participant to the board. Participants are those users which may add, edit or move cards
 * and in case of private boards also see them at all. A participant may not be added twice and the
 * owner of a board can not be added to the participants list (e.g. is a special user for this board)
 * on the columns.
 * @param user which shall be added as a participant
 * @returns {Promise}
 */
Board.define('addParticipant', function(user) {
    var that = this;
    return User.asUser(user).then(function(user) {
        return new Promise(function(resolve, reject) {
            // Create the relations-array if it does not yet exist
            if (!_.isArray(that.participants)) { that.participants = []; }

            // Ensure that the user is not the owner
            if (that.ownerId === user.id) {
                return reject(new Error('Can not add the owner as a participant'));
            }

            // Ensure that the user is not already in the participants-list
            if (_.any(that.participants, function(cu) { return cu.id === user.id; })) {
                return reject(new Error('The user is already participating in this board'));
            }

            // Seems fine, add user
            that.participants.push(user);
            that.saveAll({ owner: false, participants: true })
                .then(function(board) { resolve(board); })
                .error(function() { reject(new Error('Could not add participant to the board')); });
        });
    });
});

/**
 * Checks if a user is participating in this board (This also includes the owner!)
 * @param user whose participation-status shall be checked
 * @returns {Promise} which retrieves a single bool-parameter to its success handler (isParticipating)
 */
Board.define('isParticipant', function(user) {
    var that = this;
    return User.asUser(user).then(function(user) {
        return new Promise(function(resolve, reject) {
            // Is it the boards owner?
            that.isOwner(user).then(function(isOwner) {
                if (isOwner) { return resolve(true); }

                // Does not seem so, is it part of the participants list?
                if (!_.isArray(that.participants)) { return resolve(false); }
                resolve(_.findIndex(that.participants, function(u) { return u.id === user.id; }) > -1);

            }).error(function(err) { reject(err); });
        });
    });
});

