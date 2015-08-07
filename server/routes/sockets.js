var _       = require('lodash');
var Promise = require('bluebird');
var models  = require(__dirname + '/../models');

function canReadBoard(socket, msg) {
    return new Promise(function(resolve, reject) {
        if (!socket.request.user) { return reject(new Error('Not authenticated')); }
        if (!models.User.isUser(socket.request.user)) { return reject(new Error('Not authenticated')); }

        if (typeof msg !== 'object' ||
            !msg.hasOwnProperty('boardId') ||
            !_.isNumber(msg.boardId)) { return reject('Invalid board'); }

        models.Board.findOne({ where: { id: msg.boardId }})
            .then(function(board) {
                if (!board) { return reject(new Error('Invalid board')); }
                if (board.private === false) {
                    return resolve(board);
                }

                board.hasUser(socket.request.user)
                    .then(function(isParticipating) {
                        if (!isParticipating) { return reject(new Error('Access denied')); }
                        return resolve(board);
                    }).catch(function(err) { reject(err); });
            }).catch(function(err) { reject(err); });
    });
}

module.exports = function(socket) {

    socket.on('watchBoard', function(msg) {
        canReadBoard(socket, msg)
            .then(function(board) {
                socket.join('board' + board.id);
            }).catch(function() {});
    });

    socket.on('unwatchBoard', function(msg) {
        canReadBoard(socket, msg)
            .then(function(board) {
                socket.leave('board' + board.id);
            }).catch(function() {});
    });
};