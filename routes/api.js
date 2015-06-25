var express = require('express');
var models  = require(__dirname + '/../models');
var router  = express.Router();

router.param('boardId', function(req, res, next, id) {
    next();
});

router.param('columnId', function(req, res, next, id) {
    next();
});

router.param('cardId', function(req, res, next, id) {
    next();
});

router.post('/users', function(req, res, next) {

});
router.post('/users/login', function(req, res, next) { next(new Error('Not implemented')); });
router.get('/users/logout', function(req, res, next) { next(new Error('Not implemented')); });

router.route('/boards')
    .get(function(req, res, next) { next(new Error('Not implemented')); })
    .post(function(req, res, next) {

        models.Board.make(user, req.body)
            .then(function(board) { res.json(board); })
            .catch(function(err) { res.json(err); });

    });

router.route('/boards/:boardId')
    .all(function(req, res, next) { next(); })
    .get(function(req, res, next) { next(new Error('Not implemented')); })
    .put(function(req, res, next) { next(new Error('Not implemented')); })
    .delete(function(req, res, next) { next(new Error('Not implemented')); });

router.route('/boards/:boardId/columns')
    .all(function(req, res, next) { next(); })
    .get(function(req, res, next) { next(new Error('Not implemented')); })
    .post(function(req, res, next) { next(new Error('Not implemented')); });

router.route('/boards/:boardId/columns/:columnId')
    .all(function(req, res, next) { next(); })
    .get(function(req, res, next) { next(new Error('Not implemented')); })
    .put(function(req, res, next) { next(new Error('Not implemented')); })
    .delete(function(req, res, next) { next(new Error('Not implemented')); });

router.route('/boards/:boardId/columns/:columnId/cards')
    .all(function(req, res, next) { next(); })
    .get(function(req, res, next) { next(new Error('Not implemented')); })
    .post(function(req, res, next) { next(new Error('Not implemented')); });

router.route('/boards/:boardId/columns/:columnId/cards/:cardId')
    .all(function(req, res, next) { next(); })
    .get(function(req, res, next) { next(new Error('Not implemented')); })
    .put(function(req, res, next) { next(new Error('Not implemented')); })
    .delete(function(req, res, next) { next(new Error('Not implemented')); });


module.exports = router;