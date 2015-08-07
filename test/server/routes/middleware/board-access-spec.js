process.env.NODE_ENV = 'test';

var should      = require('should');
var helpers     = require('../../helpers.js');
var boardAccess = require('../../../../server/routes/middleware/board-access.js');
var models      = require('../../../../server/models');

describe('middlware board-access', function() {
    var user, adminBoard, userBoard, publicBoard, notUserBoard;

    function makeResMock(cb) {
        return {
            status: function(status) {
                return { json: function(value) { cb(status, value); } };
            }
        };
    }

    before(function(done) {
        var otherUser;

        helpers.createTestDatabase()
            .then(function() { return models.User.make({ name: 'testuser', password: 'testpassword' }); })
            .then(function(u) { user = u; return models.User.make({ name: 'otheruser', password: 'testpassword' }); })
            .then(function(u) { otherUser = u; return models.Board.make(user, { name: 'AdminBoard' }); })
            .then(function(b) { adminBoard = b; return  models.Board.make(otherUser, { name: 'UserBoard' }); })
            .then(function(b) { userBoard = b; return b.addUser(user, { admin: false }); })
            .then(function() { return models.Board.make(otherUser, { name: 'PublicBoard', private: false }); })
            .then(function(b) { publicBoard = b; return models.Board.make(otherUser, { name: 'NotUserBoard' }); })
            .then(function(b) {
                notUserBoard = b;
                done();
            })
            .catch(function(err) { done(err); });
    });

    describe('Can read', function() {
        it('should allow access if the user is an admin of the board', function(done) {
            var req = { user: user, board: adminBoard };
            boardAccess.canRead(req,
                makeResMock(function() { done(new Error('Called result handler')); }),
                function(err) { done(err); });
        });

        it('should allow access if the user is participating in the board', function(done) {
            var req = { user: user, board: userBoard };
            boardAccess.canRead(req,
                makeResMock(function() { done(new Error('Called result handler')); }),
                function(err) { done(err); });
        });

        it('should allow access if the user is not participating but the board is public', function(done) {
            var req = { user: user, board: publicBoard };
            boardAccess.canRead(req,
                makeResMock(function() { done(new Error('Called result handler')); }),
                function(err) { done(err); });
        });

        it('should deny access if the board is private and the user is no participant', function(done) {
            var req = { user: user, board: notUserBoard };
            boardAccess.canRead(req,
                makeResMock(function(status, value) {
                    status.should.equal(403);
                    should.exist(value);
                    value.should.be.an.Object();
                    value.should.have.property('error').which.is.an.Object();
                    value.error.should.have.property('message').which.is.a.String();
                    value.error.message.should.match(/You are not allowed to access this board/);
                    done();
                }),
                function() { done(new Error('Called next handler')); });
        });

        it('should deny access if no user was passed', function(done) {
            var req = { board: notUserBoard };
            boardAccess.canRead(req,
                makeResMock(function(status, value) {
                    status.should.equal(401);
                    should.exist(value);
                    value.should.be.an.Object();
                    value.should.have.property('error').which.is.an.Object();
                    value.error.should.have.property('message').which.is.a.String();
                    value.error.message.should.match(/You must be logged in to access this board/);
                    done();
                }),
                function() { done(new Error('Called next handler')); });
        });

        it('should deny access if no board was passed', function(done) {
            var req = { user: user };
            boardAccess.canRead(req,
                makeResMock(function(status, value) {
                    status.should.equal(400);
                    should.exist(value);
                    value.should.be.an.Object();
                    value.should.have.property('error').which.is.an.Object();
                    value.error.should.have.property('message').which.is.a.String();
                    value.error.message.should.match(/No valid board has been found but was required/);
                    done();
                }),
                function() { done(new Error('Called next handler')); });
        });
    });

    describe('Can execute user action', function() {
        it('should allow access if the user is an admin of the board', function(done) {
            var req = { user: user, board: adminBoard };
            boardAccess.canExecuteUserAction(req,
                makeResMock(function() { done(new Error('Called result handler')); }),
                function(err) { done(err); });
        });

        it('should allow access if the user is participating in the board', function(done) {
            var req = { user: user, board: userBoard };
            boardAccess.canExecuteUserAction(req,
                makeResMock(function() { done(new Error('Called result handler')); }),
                function(err) { done(err); });
        });

        it('should deny access if the user is no member of the board', function(done) {
            var req = { user: user, board: publicBoard };
            boardAccess.canExecuteUserAction(req,
                makeResMock(function(status, value) {
                    status.should.equal(403);
                    should.exist(value);
                    value.should.be.an.Object();
                    value.should.have.property('error').which.is.an.Object();
                    value.error.should.have.property('message').which.is.a.String();
                    value.error.message.should.match(/You are not allowed to edit content in this board/);
                    done();
                }),
                function() { done(new Error('Called next handler')); });
        });

        it('should deny access if no user was passed', function(done) {
            var req = { board: notUserBoard };
            boardAccess.canExecuteUserAction(req,
                makeResMock(function(status, value) {
                    status.should.equal(401);
                    should.exist(value);
                    value.should.be.an.Object();
                    value.should.have.property('error').which.is.an.Object();
                    value.error.should.have.property('message').which.is.a.String();
                    value.error.message.should.match(/You must be logged in to access this board/);
                    done();
                }),
                function() { done(new Error('Called next handler')); });
        });

        it('should deny access if no board was passed', function(done) {
            var req = { user: user };
            boardAccess.canExecuteUserAction(req,
                makeResMock(function(status, value) {
                    status.should.equal(400);
                    should.exist(value);
                    value.should.be.an.Object();
                    value.should.have.property('error').which.is.an.Object();
                    value.error.should.have.property('message').which.is.a.String();
                    value.error.message.should.match(/No valid board has been found but was required/);
                    done();
                }),
                function() { done(new Error('Called next handler')); });
        });
    });

    describe('Can execute admin action', function() {
        it('should allow access if the user is an admin of the board', function(done) {
            var req = { user: user, board: adminBoard };
            boardAccess.canExecuteAdminAction(req,
                makeResMock(function() { done(new Error('Called result handler')); }),
                function(err) { done(err); });
        });

        it('should deny access if the user is no admin of the board', function(done) {
            var req = { user: user, board: userBoard };
            boardAccess.canExecuteAdminAction(req,
                makeResMock(function(status, value) {
                    status.should.equal(403);
                    should.exist(value);
                    value.should.be.an.Object();
                    value.should.have.property('error').which.is.an.Object();
                    value.error.should.have.property('message').which.is.a.String();
                    value.error.message.should.match(/Only an administrator of this board may execute this action/);
                    done();
                }),
                function() { done(new Error('Called next handler')); });
        });

        it('should deny access if the user is no member of the board', function(done) {
            var req = { user: user, board: notUserBoard };
            boardAccess.canExecuteAdminAction(req,
                makeResMock(function(status, value) {
                    status.should.equal(403);
                    should.exist(value);
                    value.should.be.an.Object();
                    value.should.have.property('error').which.is.an.Object();
                    value.error.should.have.property('message').which.is.a.String();
                    value.error.message.should.match(/You are not allowed to edit content in this board/);
                    done();
                }),
                function() { done(new Error('Called next handler')); });
        });

        it('should deny access if no user was passed', function(done) {
            var req = { board: notUserBoard };
            boardAccess.canExecuteAdminAction(req,
                makeResMock(function(status, value) {
                    status.should.equal(401);
                    should.exist(value);
                    value.should.be.an.Object();
                    value.should.have.property('error').which.is.an.Object();
                    value.error.should.have.property('message').which.is.a.String();
                    value.error.message.should.match(/You must be logged in to access this board/);
                    done();
                }),
                function() { done(new Error('Called next handler')); });
        });

        it('should deny access if no board was passed', function(done) {
            var req = { user: user };
            boardAccess.canExecuteAdminAction(req,
                makeResMock(function(status, value) {
                    status.should.equal(400);
                    should.exist(value);
                    value.should.be.an.Object();
                    value.should.have.property('error').which.is.an.Object();
                    value.error.should.have.property('message').which.is.a.String();
                    value.error.message.should.match(/No valid board has been found but was required/);
                    done();
                }),
                function() { done(new Error('Called next handler')); });
        });
    });
});