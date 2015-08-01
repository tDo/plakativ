var _         = require('lodash');
var models    = require(__dirname + '/../../models');
var sequelize = models.sequelize();

/**
 * This internal private helper verifies that the user and board
 * request-parameters have been acquired and are of the correct
 * model-types.
 * @param req
 * @param res
 * @param next
 * @returns {boolean}
 */
function generalCheck(req, res, next) {
    // User-object passed?
    if (!req.user) {
        res.status(401).json({ error: { message: 'You must be logged in to access this board' }});
        return false;
    }

    // Board present?
    if (!models.Board.isBoard(req.board)) {
        res.status(400).json({ error: { message: 'No valid board has been found but was required' }});
        return false;
    }

    return true;
}

/**
 * Middleware checks if the board and user request parameters have been added
 * and if the user is allowed to read the current board (Either if it's public or
 * the user is participating)
 * @param req
 * @param res
 * @param next
 */
function canRead(req, res, next) {
    if (!generalCheck(req, res, next)) { return; }

    // Private or public?
    if(req.board.private && req.board.private === false) {
        // For public boards we may end here
        next();
    }

    // If it's private, check if the user is a participant
    req.board.hasUser(req.user)
        .then(function(isParticipating) {
            if (!isParticipating) {
                return res.status(403).json({ error: { message: 'You are not allowed to access this board' }});
            }

            // Seems like the user may access this board
            next();
        }).catch(function(err) { next(err); });
}

/**
 * Middleware checks if the user is a participant of a board and may execute
 * user-access-level actions
 * @param req
 * @param res
 * @param next
 */
function canExecuteUserAction(req, res, next) {
    if (!generalCheck(req, res, next)) { return; }

    req.board.hasUser(req.user)
        .then(function(isParticipating) {
            if (!isParticipating) {
                return res.status(403).json({ error: { message: 'You are not allowed to edit content in this board' }});
            }
            // Seems like the user may access this board
            next();
        }).catch(function(err) { next(err); });
}

/**
 * Middleware checks if the user is an admin of the provided board and may
 * thus execute admin access-level actions
 * @param req
 * @param res
 * @param next
 */
function canExecuteAdminAction(req, res, next) {
    if (!generalCheck(req, res, next)) { return; }
    req.board.hasUser(req.user)
        .then(function(isParticipating) {
            if (!isParticipating) {
                return res.status(403).json({ error: { message: 'You are not allowed to edit content in this board' }});
            }

            // Is participating, check if it's also an admin
            return req.board.isAdmin(req.user);
        })
        .then(function(isAdmin) {
            if (!isAdmin) {
                return res.status(403).json({ error: { message: 'Only an administrator of this board may execute this action' }});
            }

            // Seems like the user is a board admin
            next();
        })
        .catch(function(err) { next(err); });
}

module.exports = {
    canRead: canRead,
    canExecuteUserAction: canExecuteUserAction,
    canExecuteAdminAction: canExecuteAdminAction
};