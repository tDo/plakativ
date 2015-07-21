process.env.NODE_ENV = 'test';
require('should');
var helpers = require(__dirname + '/../helpers');
var models  = require(__dirname + '/../../../models');

describe('Boards', function() {
    var userOwner;
    var users;

    beforeEach(function(done) {
        users = [];

        // Cleanup and create a bunch of testusers
        helpers.createTestDatabase()
            .then(function() { return models.User.make({ name: 'Testuser', password: 'password'}); })
            .then(function(user) {
                userOwner = user;
                return models.User.make({ name: 'OtherUser1', password: 'password'});
            })
            .then(function(user) { users.push(user); return models.User.make({ name: 'OtherUser2', password: 'password'}); })
            .then(function(user) { users.push(user); return models.User.make({ name: 'OtherUser3', password: 'password'}); })
            .then(function(user) { users.push(user); done(); })
            .catch(function(err) { done(err); });
    });

    describe('Creation', function() {
        it('should not accept board-creation without a user', function(done) {
            models.Board.make(null, { name: 'Testboard' })
                .then(function() { done(new Error('Board created even without valid user')); })
                .catch(function(err) {
                    err.message.should.match(/Invalid user/);
                    done();
                });
        });

        it('should not accept board-creation with a non-existing user', function(done) {
            var user = models.User.build({ name: 'Not saved user' });
            models.Board.make(user, { name: 'Testboard'})
                .then(function() { done(new Error('Board created with a not saved user-instance')); })
                .catch(function(err) {
                    err.message.should.match(/Invalid user/);
                    done();
                });
        });

        it('should not be able to add a board without a name', function(done) {
            models.Board.make(userOwner, {})
                .then(function() { done(new Error('Added board without a name')); })
                .catch(function() { done(); });
        });

        it('should not be able to add a board with an empty name', function(done) {
            models.Board.make(userOwner, {})
                .then(function() { done(new Error('Added board with an empty name')); })
                .catch(function() { done(); });
        });

        it('should create a board and make the user an admin', function(done) {
            models.Board.make(userOwner, { name: 'Testboard'})
                .then(function(board) {
                    models.Board.isBoard(board).should.equal(true);
                    board.name.should.equal('Testboard');
                    board.private.should.equal(true);
                    return board.getUsers();
                })
                .then(function(u) {
                    var user = u[0];
                    user.id.should.equal(userOwner.id);
                    user.name.should.equal(userOwner.name);
                    user.BoardUsers.admin.should.equal(true);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should create a non-private board', function(done) {
            models.Board.make(userOwner, { name: 'Testboard', private: false})
                .then(function(board) {
                    board.name.should.equal('Testboard');
                    board.private.should.equal(false);
                    done();
                }).catch(function(err) { done(err); });
        });
    });

    describe('Users', function() {
        var board;
        beforeEach(function(done) {
            models.Board.make(userOwner, { name: 'Testboard'}).then(function(b) {
                board = b;
                done();
            }).catch(function(err) { done(err); });
        });

        it('should be able to add users to a board', function(done) {
            board.addUser(users[0])
                .then(function() { return board.addUser(users[1], { admin: false }); })
                .then(function() { return board.addUser(users[2], { admin: true }); })
                .then(function() { return board.getUsers(); })
                .then(function(u) {
                    u.length.should.equal(4);
                    u[0].id.should.equal(userOwner.id);
                    u[0].BoardUsers.admin.should.equal(true);
                    u[1].id.should.equal(users[0].id);
                    u[1].BoardUsers.admin.should.equal(false);
                    u[2].id.should.equal(users[1].id);
                    u[2].BoardUsers.admin.should.equal(false);
                    u[3].id.should.equal(users[2].id);
                    u[3].BoardUsers.admin.should.equal(true);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should add a user only once', function(done) {
            board.addUser(users[0])
                .then(function() { return board.addUser(users[0]); })
                .then(function() { return board.getUsers(); })
                .then(function(u) {
                    u.length.should.equal(2);
                    u[1].id.should.equal(users[0].id);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should be able to verify that a user is participating in a board', function(done) {
            board.addUser(users[0])
                .then(function() { return board.hasUser(users[0]); })
                .then(function(isParticipating) {
                    isParticipating.should.equal(true);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should be able to verify that a user is no participant of a board', function(done) {
            board.addUser(users[0])
                .then(function() { return board.hasUser(users[1]); })
                .then(function(isParticipating) {
                    isParticipating.should.equal(false);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should remove a user from a board', function(done) {
            board.addUser(users[0])
                .then(function() { return board.removeUser(users[0]); })
                .then(function() { return board.hasUser(users[0]); })
                .then(function(isParticipating) {
                    isParticipating.should.equal(false);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should promote a user to admin', function(done) {
            board.addUser(users[0], { admin: false })
                .then(function() { return board.getUsers() })
                .then(function(u) {
                    u[1].BoardUsers.admin.should.equal(false);
                    u[1].BoardUsers.admin = true;
                    return u[1].BoardUsers.save();
                })
                .then(function() { return board.getUsers(); })
                .then(function(u) {
                    u[1].BoardUsers.admin.should.equal(true);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should degrade an admin to user', function(done) {
            board.addUser(users[0], { admin: true })
                .then(function() { return board.getUsers() })
                .then(function(u) {
                    u[1].BoardUsers.admin.should.equal(true);
                    u[1].BoardUsers.admin = false;
                    return u[1].BoardUsers.save();
                })
                .then(function() { return board.getUsers(); })
                .then(function(u) {
                    u[1].BoardUsers.admin.should.equal(false);
                    done();
                })
                .catch(function(err) { done(err); });
        });
    });
});