var express          = require('express');
var expressSession   = require('express-session');
var cookieParser     = require('cookie-parser');
var bodyParser       = require('body-parser');
var passport         = require('passport');
var LocalStrategy    = require('passport-local').Strategy;
var passportSocketIo = require('passport.socketio');
var routes           = require(__dirname + '/routes');
var models           = require(__dirname + '/models');
var sequelize        = models.sequelize();
var socketio         = require(__dirname + '/libs/socketio');
var SequelizeStore   = require('connect-session-sequelize')(expressSession.Store);

function init(config) {
    // Create actual express application instance
    var app = express();

    // Create the socketio instance
    var io = socketio();

    // Register some parsers
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());

    // Express session-handling
    var _key     = 'express.sid';
    var _secret  = 'change me to awesome config';
    var _store   = new SequelizeStore({ db: sequelize });
    var _session = expressSession({
        key: _key,
        store: _store,
        secret: _secret,
        resave: false,
        saveUninitialized: false
    });

    app.use(_session);

    // Socketio session handling and passport binding
    io.use(passportSocketIo.authorize({
        cookieParser: cookieParser,
        key: _key,
        secret: _secret,
        store: _store,
        passport: passport
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
        models.User.findOne({ where: { id: id }})
        .then(function(user) { done(null, user); })
        .error(function(err) { done(err); });
    });

    // Serving static files
    // Bower-components
    app.use('/bower_components', express.static(__dirname + '/../bower_components'));
    app.use(express.static(__dirname + '/../client/'));

    // Bind routes
    app.use('/users',  routes.users);
    app.use('/boards', routes.boards);

    // Bind socket-routes
    io.on('connection', function(socket) {
        routes.sockets(socket);
    });


    return app;
}

module.exports = init;