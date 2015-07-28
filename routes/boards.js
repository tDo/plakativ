var express   = require('express');
var loggedIn  = require(__dirname + '/middleware/logged-in');
var access    = require(__dirname + '/middleware/board-access');
var models    = require(__dirname + '/../models');
var sequelize = models.sequelize();
var router    = express.Router();

// Authentication-handler
router.all('*', loggedIn);

function findOne(model, paramName, id, req, res, next) {
    model.findOne({ where: { id: id }})
        .then(function(item) {
            if (!item) {
                return res.status(404).json({ error: { message: paramName + ' is unknown' }});
            }
            req[paramName] = item;
            next();
        }).catch(function(err) { next(err); });
}

router.param('boardIdEager', function(req, res, next, id) {
    models.Board.findEager(id)
        .then(function(board) {
            if (!board) {
                return res.status(404).json({ error: { message: 'Board is unknown' }});
            }

            req.board = board;
            next();
        }).catch(function(err) { next(err); });
});

router.param('boardId', function(req, res, next, id) {
    findOne(models.Board, 'board', id, req, res, next);
});

router.param('columnId', function(req, res, next, id) {
    findOne(models.Column, 'column', id, req, res, next);
});

router.param('cardId', function(req, res, next, id) {
    findOne(models.Card, 'card', id, req, res, next);
});

router.route('/')
    .get(function(req, res) {})
    .post(function(req, res, next) {
        // Create a new board with the user as the owner
    });

router.route('/:boardIdEager')
    .get(access.canRead, function(req, res, next) {
        res.json(req.board);
    })
    .put(access.canExecuteAdminAction, function(req, res, next) {
        // TODO: Change board-specific settings (Name, etc.)
    })
    .delete(access.canExecuteAdminAction, function(req, res, next) {
        // Delete the actual board
    });


router.route('/:boardId/columns')
    .all(access.canExecuteAdminAction)
    .post(function(req, res, next) {
        models.Column.make(req.board, req.body)
            .then(function(column) { res.json(column); })
            .catch(function(err) { next(err); });
    });

router.route('/:boardId/columns/:columnId')
    .all(access.canExecuteAdminAction)
    .put(function(req, res, next) {
        // TODO: Update data of a column
    })
    .delete(function(req, res, next) {
        // TODO: Remove a column and all its cards
    });

router.route('/:boardId/columns/:columnId/position')
    .all(access.canExecuteAdminAction)
    .put(function(req, res, next) {
        req.column.moveTo(req.body.offset)
            .then(function() { res.json(true); })
            .catch(function(err) { next(err); });
    });

router.route('/:boardId/columns/:columnId/cards')
    .all(access.canExecuteUserAction)
    .post(function(req, res, next) {
        models.Card.make(req.column, req.body)
            .then(function(card) { res.json(card); })
            .catch(function(err) { next(err); });
    });

router.route('/:boardId/columns/:columnId/cards/:cardId')
    .all(access.canExecuteUserAction)
    .put(function(req, res, next) {
        // TODO: Change a cards content
    })
    .delete(function(req, res, next) { next(new Error('Not implemented')); });

router.route('/:boardId/columns/:columnId/cards/:cardId/position')
    .all(access.canExecuteUserAction)
    .put(function(req, res, next) {
        req.card.moveTo(req.column, req.body.offset)
            .then(function() { return res.json(true); })
            .catch(function(err) { next(err); });
    });

module.exports = router;