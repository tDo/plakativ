var express        = require('express');
var expressSession = require('express-session');
var cookieParser   = require('cookie-parser');
var bodyParser     = require('body-parser');
var passport       = require('passport');
var LocalStrategy  = require('passport-local').Strategy;
var routes         = require(__dirname + '/routes');
var models         = require(__dirname + '/models');
var sequelize      = models.sequelize();

function init(config) {
    // Testwise create our database here
    //sequelize.sync({ force: true });

    // Create actual express application instance
    var app = express();

    // Register some parsers
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());

    // Express session-handling
    app.use(expressSession({
        secret: 'change me to awesome config',
        resave: false,
        saveUninitialized: false
    }));


    // Configure authentication-provider
    // - Initialize and bind to express
    app.use(passport.initialize());
    // - Initialize passport session-handler
    app.use(passport.session());

    // - Configure local credentials validation handler
    passport.use(new LocalStrategy(
        function(username, password, done) {
            models.User.findByCredentials(username, password)
                .then(function(user) { return done(null, user); })
                .error(function(err) { return done(null, false, err.toString()); });
        }
    ));

    // - Configure session storage/retrieval
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });
    passport.deserializeUser(function(id, done) {
        models.User.get(id).run()
        .then(function(user) { done(null, user); })
        .error(function(err) { done(err); });
    });

    // Serving static files
    // Bower-components
    app.use('/bower_components', express.static(__dirname + '/bower_components'));
    // General public
    app.use(express.static(__dirname + '/public'));

    // Bind routes
    app.use('/users',  routes.users);
    app.use('/boards', routes.boards);

    app.get('/', function(req, res) {
        res.send('The server!');
    });

    return app;
}

module.exports = init;