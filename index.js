var express       = require('express');
var passport      = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var routes        = require(__dirname + '/routes');
var api           = require(__dirname + '/api');
var models        = require(__dirname + '/models');

function init(config) {
    // Create actual express application instance
    var app = express();

    // Configure authentication-provider
    // - Initialize and bind to express
    app.use(passport.initialize());

    // - Configure local credentials validation handler
    passport.use(new LocalStrategy(
        function(username, password, done) {
            api.users.validateCredentials({ name: username, password: password})
                .then(function(user) { return done(null, user); })
                .error(function(err) { done(err); });
        }
    ));

    // - Initialize passport session-handler
    app.use(passport.session());

    // - Configure session storage/retrieval
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });
    passport.deserializeUser(function(id, done) {
        models.Users.get(id).run()
        .then(function(user) { done(null, user); })
        .error(function(err) { done(err); });
    });



    // Bind routes
    // - API
    app.use('/api', routes.api);

    return app;
}

module.exports = init;