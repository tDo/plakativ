var _         = require('lodash');
var express   = require('express');
var passport  = require('passport');
var models    = require(__dirname + '/../models');
var loggedIn  = require(__dirname + '/middleware/logged-in');
var router    = express.Router();

var queryOptions = {
    maxUsernameLength: 50,
    minLimit: 1,
    maxLimit: 10
};

router.get('/', loggedIn, function(req, res, next) {
    if (!_.has(req.query, 'username')) {
        return res.status(422).json({ error: { message: 'Missing username query' }});
    }

    if (!_.isString(req.query.username)) {
        return res.status(422).json({ error: { message: 'Username must be a string' }});
    }

    var username = req.query.username.trim();
    if (_.isEmpty(username)) {
        return res.status(422).json({ error: { message: 'Username may not be empty' }});
    }

    if (username.length > queryOptions.maxUsernameLength) {
        username = username.substr(0, queryOptions.maxUsernameLength);
    }

    var limit = queryOptions.maxLimit;
    if (_.has(req.query, 'limit')) {
        limit = parseInt(req.query.limit);
    }

    if (!_.isFinite(limit)) { limit = queryOptions.maxLimit; }
    if (limit > queryOptions.maxLimit) { limit = queryOptions.maxLimit; }
    if (limit < queryOptions.minLimit) { limit = queryOptions.minLimit; }

    models.User.findAll({
        where: { name: { $like: '%' + req.query.username + '%' } },
        limit: limit
    }).then(function(users) {
        return res.json(users);
    }).catch(function(err) { next(err); });
});

router.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) { next(err); }
        if (!user) {
            return res.status(400).json({ error: { message: 'Username or password were incorrect' }});
        }

        req.logIn(user, function(err) {
            if (err) { return next(err); }
            return res.json(req.user);
        });

    })(req, res, next);
});

router.get('/me', loggedIn, function(req, res) {
    return res.json(req.user);
});

router.get('/logout', loggedIn, function(req, res) {
    req.logout();
    res.json(true);
});

module.exports = router;