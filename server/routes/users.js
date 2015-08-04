var _         = require('lodash');
var express   = require('express');
var passport  = require('passport');
var models    = require(__dirname + '/../models');
var loggedIn  = require(__dirname + '/middleware/logged-in');
var router    = express.Router();

var queryOptions = {
    maxNameLength: 50,
    minLimit: 1,
    maxLimit: 50
};

function toWhereClause(req) {
    // Username filtering
    if (_.has(req.query, 'name') && _.isString(req.query.name)) {
        var name = req.query.name.trim();
        if (!_.isEmpty(name)) {
            name = (name.length > queryOptions.maxNameLength)
                ? name.substr(0, queryOptions.maxNameLength)
                : name;

            // Seems like a valid search option
            return { name: { $like: '%' + name + '%' }};
        }
    }

    return null;
}

function toLimit(req) {
    // Limit filtering
    var limit = queryOptions.maxLimit;
    if (_.has(req.query, 'limit')) {
        limit = parseInt(req.query.limit);
    }
    if (!_.isFinite(limit)) { limit = queryOptions.maxLimit; }
    if (limit > queryOptions.maxLimit) { limit = queryOptions.maxLimit; }
    if (limit < queryOptions.minLimit) { limit = queryOptions.minLimit; }
    return limit;
}

function toOrder(req) {
    // Ordering
    var order = 'ASC';
    if (_.has(req.query, 'order') && _.isString(req.query.order)) {
        var tmp = req.query.order.toUpperCase();
        order = (tmp === 'ASC' || tmp === 'DESC') ? tmp : order;
    }
    return ['name', order];
}

function toOffset(req) {
    var offset = 0;
    if (_.has(req.query, 'offset') && _.isString(req.query.offset)) {
        offset = parseInt(req.query.offset);
    }
    if (!_.isFinite(offset)) { offset = 0; }
    if (offset < 0) { offset = 0; }
    return offset;
}

router.get('/', loggedIn, function(req, res, next) {
    var opts = {
        order: [toOrder(req)],
        limit: toLimit(req),
        offset: toOffset(req)
    };

    var where = toWhereClause(req);
    if (where) { opts.where = where; }

    models.User.findAll(opts)
        .then(function(users) { return res.json(users); })
        .catch(function(err) { next(err); });
});

router.get('/count', loggedIn, function(req, res, next) {
    var opts = {};
    var where = toWhereClause(req);
    if (where) { opts.where = where; }

    models.User.count(opts)
        .then(function(c) { res.json(c); })
        .catch(function(err) { next(err); });
});

router.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user) {
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