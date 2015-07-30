var express  = require('express');
var passport = require('passport');
var models   = require(__dirname + '/../models');
var loggedIn = require(__dirname + '/middleware/logged-in');
var router   = express.Router();

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

router.get('/logout', loggedIn, function(req, res) {
    req.logout();
    res.json(true);
});

module.exports = router;