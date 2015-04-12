var Promise = require('bluebird');
var _       = require('lodash');
var models  = require(__dirname + '/../models');

/**
 * Create a new board with a specific user as its owner. If the board
 * is marked as private only the owner and participants will be able to see
 * the boards content. If it's not private other (non participating users) may
 * as well see the content of the board (While they will still not be able to
 * edit it)
 * @param user which shall own this board
 * @param boardData object in the form of { name: string, private: boolean }
 */
function create(user, boardData) {
    return models.User.asUser(user)
        .then(function(user) {
            return new Promise(function(resolve, reject) {

                // The owner seems fine so far, create the board
                var board = new models.Board(boardData);
                board.owner = user;
                board.saveAll({ owner: true, participants: true }).then(function(board) {
                    resolve(board);
                }).error(function() {
                    reject(new Error('Could not create board'));
                });
            });
        });
}

/**
 * Adds a participant to the board. Participants are those users which may add, edit or move cards
 * and in case of private boards also see them at all. A participant may not be added twice and the
 * owner of a board can not be added to the participants list (e.g. is a special user for this board)
 * on the columns.
 * @param board to which we wish to add a participant
 * @param user which shall be added as a participant
 */
function addParticipant(board, user) {
    return models.Board.asBoard(board)
        .then(function(b) { board = b; return models.User.asUser(user); })
        .then(function(u) {
            user = u;

            return new Promise(function(resolve, reject) {
                // Create the relations-array if it does not yet exist
                if (!_.isArray(board.participants)) { board.participants = []; }

                // Ensure that the user is not the owner
                if (board.ownerId === user.id) {
                    return reject(new Error('Can not add the owner as a participant'));
                }

                // Ensure that the user is not already in the participants-list
                if (_.any(board.participants, function(cu) { return cu.id === user.id; })) {
                    return reject(new Error('The user is already participating in this board'));
                }

                // Seems fine, add user
                board.participants.push(user);
                board.saveAll({ owner: true, participants: true })
                    .then(function(board) { resolve(board); })
                    .error(function() { reject(new Error('Could not add participant to the board')); });
            });
        });
}

module.exports.create = create;
module.exports.addParticipant = addParticipant;