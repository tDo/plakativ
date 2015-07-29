var _                = require('lodash');
var express          = require('express');
var expressSession   = require('express-session');
var cookieParser     = require('cookie-parser');
var bodyParser       = require('body-parser');
var passport         = require('passport');
var LocalStrategy    = require('passport-local').Strategy;
var passportSocketIo = require("passport.socketio");
var routes           = require(__dirname + '/routes');
var models           = require(__dirname + '/models');
var sequelize        = models.sequelize();
var socketio         = require(__dirname + '/socketio');

function init(config) {
    // Create actual express application instance
    var app = express();

    // Register some parsers
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cookieParser());

    // Register socketio handler
    var io = socketio();

    io.on('connection', function(socket) {

        socket.on('watchBoard', function(msg) {
            if (!socket.request.user) { return; }
            if (!_.has(msg, 'boardId') || !_.isNumber(msg.boardId)) { return; }

            models.Board.findOne({ where: { id: msg.boardId }})
                .then(function(board) {
                    if (!board) { return; }
                    if (board.private && board.private === false) {
                        return socket.join('board' + msg.boardId);
                    }

                    board.hasUser(socket.request.user)
                        .then(function(isParticipating) {
                            if (!isParticipating) { return; }
                            socket.join('board' + msg.boardId);
                        })
                        .catch(function(err) {});
                })
                .catch(function(err) {});
        });

        socket.on('unwatchBoard', function(msg) {
            if (!socket.request.user) { return false; }

            try {
                console.log('Unwatch board: ' + msg.boardId);
                socket.leave('board' + msg.boardId);
            } catch(err) {
                console.log(msg);
                console.log(err);
            }
        });

    });

    // Express session-handling
    var _key = 'express.sid';
    var _secret = 'change me to awesome config';
    var _store = new expressSession.MemoryStore;    // replace this as soon as possible!
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
    app.use('/bower_components', express.static(__dirname + '/bower_components'));
    // General public
    app.use(express.static(__dirname + '/public'));

    // Bind routes
    app.use('/users',  routes.users);
    app.use('/boards', routes.boards);


    return app;
}

module.exports = init;