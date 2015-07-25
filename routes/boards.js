var express   = require('express');
var passport  = require('passport');
var models    = require(__dirname + '/../models');
var sequelize = models.sequelize();
var router    = express.Router();


router.param('boardIdEager', function(req, res, next, id) {
    models.Board.findEager(id)
        .then(function(board) {
            if (!board) { next(new Error('Board is unknown')); }
            req.board = board;
            next();
        }).catch(function(err) { next(err); });
});

router.param('boardId', function(req, res, next, id) {
    models.Board.findOne({ where: { id: id }})
        .then(function(board) {
            if (!board) { next(new Error('Board is unknown')); }
            req.board = board;
            next();
        }).catch(function(err) { next(err); });
});

router.param('columnId', function(req, res, next, id) {
    models.Column.findOne({ where: { id: id }})
        .then(function(column) {
            req.column = column;
            next();
        }).catch(function(err) { next(err); });
});

router.param('cardId', function(req, res, next, id) {
    models.Card.findOne({ where: { id: id }})
        .then(function(card) {
            req.card = card;
            next();
        }).catch(function(err) { next(err); });
});

router.route('/')
    .get(function(req, res) {})
    .post(function(req, res, next) {
        // Create a new board with the user as the owner
    });

router.route('/:boardIdEager')
    .all(function(req, res, next) { next(); })
    .get(function(req, res, next) {
        // TODO: Check logged in
        // TODO: Check if the user is even participating here
        res.json(req.board);
    })
    .put(function(req, res, next) {
        // TODO: Change board-specific settings (Name, etc.)
    })
    .delete(function(req, res, next) {
        // Delete the actual board
    });


router.route('/:boardId/columns')
    .post(function(req, res, next) {
        models.Column.make(req.board, req.body)
            .then(function(column) { res.json(column); })
            .catch(function(err) { next(err); });
    });

router.route('/:boardId/columns/:columnId')
    .put(function(req, res, next) {
        // TODO: Update data of a column
    })
    .delete(function(req, res, next) {
        // TODO: Remove a column and all its cards
    });

router.route('/:boardId/columns/:columnId/position')
    .put(function(req, res, next) {
        req.column.moveTo(req.body.offset)
            .then(function() { res.json(true); })
            .catch(function(err) { next(err); });
    });

router.route('/:boardId/columns/:columnId/cards')
    .post(function(req, res, next) {
        models.Card.make(req.column, req.body)
            .then(function(card) { res.json(card); })
            .catch(function(err) { next(err); });
    });

router.route('/:boardId/columns/:columnId/cards/:cardId')
    .put(function(req, res, next) {
        // TODO: Change a cards content
    })
    .delete(function(req, res, next) { next(new Error('Not implemented')); });

router.route('/:boardId/columns/:columnId/cards/:cardId/position')
    .put(function(req, res, next) {
        req.card.moveTo(req.column, req.body.offset)
            .then(function() { return res.json(true); })
            .catch(function(err) { next(err); });
    });

module.exports = router;