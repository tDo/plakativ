var express   = require('express');
var passport  = require('passport');
var models    = require(__dirname + '/../models');
var sequelize = models.sequelize();
var router    = express.Router();

function handleId(req, res, next, id, model, modelName) {
    model.findOne(id)
        .then(function(item) {
            req[paramName] = item;
            next();
        }).catch(function(err) { next(err); });
}

router.param('boardId', function(req, res, next, id) {
    handleId(req, res, next, id, models.Board, 'board');
});

router.param('columnId', function(req, res, next, id) {
    handleId(req, res, next, id, models.Column, 'column');
});

router.param('cardId', function(req, res, next, id) {
    handleId(req, res, next, id, models.Card, 'card');
});

router.route('/')
    .get(function(req, res) {
        // TODO: Check logged in

        var owned;
        models.Board.getOwned(req.user)
            .then(function(boards) {
                owned = boards;
                return models.Board.getParticipating(req.user); })

            .then(function(boards) {
                res.json({ value: { owned: owned, participating: boards }});

            }).catch(function() {
                res.status(500).json({ value: null, error_message: 'Failed to load boardlist' });

            });
    })

    .post(function(req, res, next) {
        // Create a new board with the user as the owner
    });

router.route('/:boardId')
    .all(function(req, res, next) { next(); })
    .get(function(req, res, next) {
        // TODO: Check logged in
        // TODO: Check if the user is even participating here

        res.json({ value: req.board });
    })
    .put(function(req, res, next) {
        // TODO: Change board-specific settings (Name, etc.)
    })
    .delete(function(req, res, next) {
        // Delete the actual board
    });


router.route('/:boardId/columns')
    .post(function(req, res, next) {
        // TODO: Add a new column to the board
    });

router.route('/:boardId/columns/:columnId')
    .put(function(req, res, next) {
        // TODO: Update data of a column
    })
    .delete(function(req, res, next) {
        // TODO: Remove a column and all its cards
    });

router.route('/:boardId/columns/:columnId/move')
    .put(function(req, res, next) {
        // TODO: Move a column to a new position
    });

router.route('/:boardId/columns/:columnId/cards')
    .post(function(req, res, next) {
        // TODO: Add a card to a column
    });

router.route('/:boardId/columns/:columnId/cards/:cardId')
    .put(function(req, res, next) {
        // TODO: Change a cards content
    })
    .delete(function(req, res, next) { next(new Error('Not implemented')); });

router.route('/:boardId/columns/:columnId/cards/:cardId/move')
    .put(function(req, res, next) {
        // TODO: Move a card to a new position/column
    });

module.exports = router;