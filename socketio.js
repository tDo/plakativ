var io = require('socket.io');

var server
var instance;

/**
 * Create a singleton instance of the socket.io handler
 * @returns {*} socket.io instance
 */
function getInstance() {
    if (instance === undefined) {
        instance = io();
    }

    if (instance === undefined) {
        throw new Error('Socket.io has not been configured');
    }

    return instance;
}

module.exports = getInstance;