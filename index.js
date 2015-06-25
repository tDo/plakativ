process.env.NODE_ENV = 'test';

var express       = require('express');
var bodyParser    = require('body-parser');
var passport      = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var routes        = require(__dirname + '/routes');
var models        = require(__dirname + '/models');
var sequelize     = models.sequelize();

function init() {
    // Testwise create our database here
    sequelize.sync({ force: true });

    // Create actual express application instance
    var app = express();

    // Register some body-parsers
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Configure authentication-provider
    // - Initialize and bind to express
    app.use(passport.initialize());

    // - Configure local credentials validation handler
    passport.use(new LocalStrategy(
        function(username, password, done) {
            models.User.byCredentials({ name: username, password: password})
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
        models.User.get(id).run()
        .then(function(user) { done(null, user); })
        .error(function(err) { done(err); });
    });


    // Bind routes
    // - API
    app.use('/api', routes.api);

    return app;
}

module.exports = init;