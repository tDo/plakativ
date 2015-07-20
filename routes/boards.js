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

router.route('/foo')
    .get(function(req, res) {

        function makeLabels(amount) {
            amount = amount || 0;
            amount = amount > 4 ? 4 : amount;
            var colors = ['#ffb53c', '#8b3a39', '#5b8b28', '#47788b'];
            var labels = [];
            for (var i = 0; i < amount; i++) {
                labels.push({
                    title: 'Label ' + i,
                    color: colors[i]
                });
            }

            return labels;
        }

        function makeMeSomeTasks(amount) {
            var tasks = [];
            for (var i = 0; i < amount; i++) {
                tasks.push({ title: 'Task ' + i, position: i + 1, done: Math.random() >= 0.5 });
            }

            return tasks;
        }

        function makeAssignees(amount) {
            amount = amount || 1;
            var users = [];
            for (var i = 0; i < amount; i++) {
                users.push({
                    name: 'Test User',
                    avatar: '//lh5.googleusercontent.com/-4VqI3c4aUUE/AAAAAAAAAAI/AAAAAAAAAAA/jowy69DyLS8/s32-c/photo.jpg'
                });
            }
            return users;
        }

        res.json({
            name: "Test-layout board",
            Columns: [
                { title: 'Backlog',
                    Cards: [
                        { title: 'Card AA', description: 'Love is magic the foo!', Labels: makeLabels(1), estimate: 5.0, Tasks: makeMeSomeTasks(8) },
                        { title: 'Card AB', description: 'Love is magic 2', Labels: makeLabels(1), estimate: 2.0, Tasks: makeMeSomeTasks(5) },
                        { title: 'Card AC', description: 'Love is magic 3', Labels: makeLabels(3), estimate: 1.5 },
                        { title: 'Card AD', description: 'Love is magic 2', Labels: makeLabels(1), estimate: 2.0, dueDate: new Date() },
                        { title: 'Card AE', description: 'Love is magic 2', Labels: makeLabels(2), estimate: 3.0 },
                        { title: 'Card AF', description: 'Love is magic 2', Labels: makeLabels(1), estimate: 4.0, Tasks: makeMeSomeTasks(3) },
                        { title: 'Card AG', description: 'Love is magic 2', Labels: makeLabels(4), estimate: 1.0 },
                        { title: 'Card AH', description: 'Love is magic 2', Labels: makeLabels(1), estimate: 2.0 },
                        { title: 'Card AI', description: 'Love is magic 2', Labels: makeLabels(2), estimate: 3.0 },
                        { title: 'Card AJ', description: 'Love is magic 2', Labels: makeLabels(1), estimate: 4.0 },
                        { title: 'Card AK', description: 'Love is magic 2', Labels: makeLabels(3), estimate: 5.0, Tasks: makeMeSomeTasks(16) }
                    ]},

                { title: 'Doing',
                    Cards: [
                        { title: 'Card BA', description: 'Love is magic', Labels: makeLabels(4), Assignees: makeAssignees(2), estimate: 7.0, dueDate: new Date(), Tasks: makeMeSomeTasks(3) },
                        { title: 'Card BB', description: 'Love is magic 2', Labels: makeLabels(1), Assignees: makeAssignees() },
                        { title: 'Card BC', description: 'Love is magic 3', Assignees: makeAssignees(), estimate: 3.0, Tasks: makeMeSomeTasks(1) }
                    ]},
                { title: 'Testing/Acceptance',
                    Cards: [
                        { title: 'Card CA', description: 'Love is magic', Labels: makeLabels(1), Assignees: makeAssignees(5), estimate: 6.0, dueDate: new Date() },
                        { title: 'Card CB', description: 'Love is magic 2', Assignees: makeAssignees(), estimate: 1.0, Tasks: makeMeSomeTasks(4) },
                        { title: 'Card CC', description: 'Love is magic 3', Labels: makeLabels(2), Assignees: makeAssignees(), estimate: 0.5 }
                    ]},
                { title: 'Done',
                    Cards: [
                        { title: 'Card DA', description: 'Love is magic', Assignees: makeAssignees() },
                        { title: 'Card DB', description: 'Love is magic 2', Labels: makeLabels(2), Assignees: makeAssignees(3), estimate: 4.0, dueDate: new Date() },
                        { title: 'Card DC', description: 'Love is magic 3', Labels: makeLabels(1), Assignees: makeAssignees(), estimate: 10.5 }
                    ]}
            ]
        });
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