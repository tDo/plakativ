var express  = require('express');
var passport = require('passport');
var models   = require(__dirname + '/../models');
var router   = express.Router();

router.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) { next(err); }
        if (!user) { return res.status(400).json({ value: null, error_message: 'Login failed' }); }

        req.logIn(user, function(err) {
            if (err) { return next(err); }
            return res.json({ value: req.user });
        });

    })(req, res, next);
});

router.get('/logout', function(req, res, next) { next(new Error('Not implemented')); });

module.exports = router;