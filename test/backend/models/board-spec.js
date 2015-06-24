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
        it('should not accept board-creation without an owner', function(done) {
            models.Board.make(null, { name: 'Testboard' })
                .then(function() { done(new Error('Board created even without valid owner')); })
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

        it('should create a board', function(done) {
            models.Board.make(userOwner, { name: 'Testboard'})
                .then(function(board) {
                    models.Board.isBoard(board).should.equal(true);
                    board.name.should.equal('Testboard');
                    board.private.should.equal(true);
                    return board.getOwner(userOwner);
                })
                .then(function(owner) {
                    owner.id.should.equal(userOwner.id);
                    owner.name.should.equal(userOwner.name);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should create multiple boards with the same owner', function(done) {
            models.Board.make(userOwner, { name: 'Testboard'})
                .then(function(board) {
                    board.name.should.equal('Testboard');
                    board.private.should.equal(true);
                    return board.getOwner();
                })
                .then(function(owner) {
                    owner.id.should.equal(userOwner.id);
                    owner.name.should.equal(userOwner.name);
                    return models.Board.make(userOwner, { name: 'Testboard2'});
                })
                .then(function(board) {
                    board.name.should.equal('Testboard2');
                    board.private.should.equal(true);
                    return board.getOwner();
                })
                .then(function(owner) {
                    owner.id.should.equal(userOwner.id);
                    owner.name.should.equal(userOwner.name);
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


    describe('Ownership', function() {
        it('should know that a user is the owner', function(done) {
            models.Board.make(userOwner, { name: 'Testboard' })
                .then(function(board) {
                    return board.isOwner(userOwner); })
                .then(function(isOwner) {
                    isOwner.should.equal(true);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should know that a user is not the owner', function(done) {
            models.Board.make(userOwner, { name: 'Testboard'})
                .then(function(board) {
                    return board.isOwner(users[0]); })
                .then(function(isOwner) {
                    isOwner.should.equal(false);
                    done();
                })
                .catch(function(err) { done(err); });
        });
    });


    describe('Participants', function() {
        var board;
        beforeEach(function(done) {
            models.Board.make(userOwner, { name: 'Testboard'}).then(function(b) {
                board = b;
                done();
            }).catch(function(err) { done(err); });
        });

        it('should be able to add participants to a board', function(done) {
            board.addParticipant(users[0])
                .then(function() { return board.addParticipant(users[1]); })
                .then(function() { return board.addParticipant(users[2]); })
                .then(function() { return board.getParticipants(); })
                .then(function(participants) {
                    participants.should.have.length(3);
                    participants[0].id.should.equal(users[0].id);
                    participants[1].id.should.equal(users[1].id);
                    participants[2].id.should.equal(users[2].id);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should add a participant only once', function(done) {
            board.addParticipant(users[0])
                .then(function() { return board.addParticipant(users[0]); })
                .then(function() { return board.getParticipants(); })
                .then(function(participants) {
                    participants.should.have.length(1);
                    participants[0].id.should.equal(users[0].id);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should be able to verify that a user is a participant of a board', function(done) {
            board.addParticipant(users[0])
                .then(function() { return board.isParticipating(users[0]); })
                .then(function(isParticipating) {
                    isParticipating.should.equal(true);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should be able to verify that a user is no participant of a board', function(done) {
            board.addParticipant(users[0])
                .then(function() { return board.isParticipating(users[1]); })
                .then(function(isParticipating) {
                    isParticipating.should.equal(false);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should be able to also acknowledge participation of the boards owner', function(done) {
            board.isParticipating(userOwner)
                .then(function(isParticipating) {
                    isParticipating.should.equal(true);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should remove a participant from the board', function(done) {
            board.addParticipant(users[0])
                .then(function() { return board.removeParticipant(users[0]); })
                .then(function() { return board.getParticipants(); })
                .then(function(participants) {
                    participants.should.have.length(0);
                    done();
                })
                .catch(function(err) { done(err); });
        });
    });

});