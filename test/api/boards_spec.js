var configs = require(__dirname + '/../../config.json');
require(__dirname + '/../../util/thinky')(configs.testing.database);
var api     = require(__dirname + '/../../api');
var models  = require(__dirname + '/../../models');
require('should');
var helpers = require(__dirname + '/../helpers');

describe('Boards API', function() {
    var userOwner;
    var users;

    beforeEach(function(done) {
        users = [];

        // Cleanup and create a bunch of testusers
        helpers.clearTables()
            .then(function() { return api.users.create({ name: 'Testuser', password: 'password'}); })
            .then(function(user) {
                userOwner = user;
                return api.users.create({ name: 'OtherUser1', password: 'password'});
            })
            .then(function(user) { users.push(user); return api.users.create({ name: 'OtherUser2', password: 'password'}); })
            .then(function(user) { users.push(user); return api.users.create({ name: 'OtherUser3', password: 'password'}); })
            .then(function(user) { users.push(user); done(); })
            .error(function(err) { done(err); });
    });

    describe('Board creation', function() {
        it('should not accept board-creation without an owner', function(done) {
            api.boards.create(null, { name: 'Testboard' })
                .then(function() { done(new Error('Board created even without valid owner')); })
                .error(function(err) {
                    err.message.should.match(/Invalid user/);
                    done();
                });
        });

        it('should not accept board-creation with a non-existing user', function(done) {
            var user = new models.User({ name: 'Not saved user'});
            api.boards.create(user, { name: 'Testboard'})
                .then(function() { done(new Error('Board created with a not saved user-instance')); })
                .error(function(err) {
                    err.message.should.match(/User has not been saved to database/);
                    done();
                });
        });

        it('should not be able to add a board without a name', function(done) {
            api.boards.create(userOwner, {})
                .then(function() { done(new Error('Added board without a name')); })
                .error(function() { done(); });
        });

        it('should not be able to add a board with an empty name', function(done) {
            api.boards.create(userOwner, {})
                .then(function() { done(new Error('Added board with an empty name')); })
                .error(function() { done(); });
        });

        it('should create a board', function(done) {
            api.boards.create(userOwner, { name: 'Testboard'})
                .then(function(board) {
                    board.name.should.equal('Testboard');
                    board.private.should.equal(true);
                    board.owner.id.should.equal(userOwner.id);
                    board.owner.name.should.equal(userOwner.name);
                    done();
                }).error(function(err) { done(err); });
        });

        it('should create multiple boards with the same owner', function(done) {
            api.boards.create(userOwner, { name: 'Testboard'})
                .then(function(board) {
                    board.name.should.equal('Testboard');
                    board.private.should.equal(true);
                    board.owner.id.should.equal(userOwner.id);
                    board.owner.name.should.equal(userOwner.name);
                    return api.boards.create(userOwner, { name: 'Testboard2'});
                })
                .then(function(board) {
                    board.name.should.equal('Testboard2');
                    board.private.should.equal(true);
                    board.owner.id.should.equal(userOwner.id);
                    board.owner.name.should.equal(userOwner.name);
                    done();
                })
                .error(function(err) { done(err); });
        });

        it('should create a non-private board', function(done) {
            api.boards.create(userOwner, { name: 'Testboard', private: false})
                .then(function(board) {
                    board.name.should.equal('Testboard');
                    board.private.should.equal(false);
                    board.owner.id.should.equal(userOwner.id);
                    board.owner.name.should.equal(userOwner.name);
                    done();
                }).error(function(err) { done(err); });
        });
    });

    describe('Participants', function() {
        it('should be able to add participants to a board', function(done) {
            this.timeout(5000);
            api.boards.create(userOwner, { name: 'Testboard'}).then(function(board) {
                return api.boards.addParticipant(board, users[0]);
            }).then(function(board) {
                return api.boards.addParticipant(board, users[1]);
            }).then(function(board) {
                return api.boards.addParticipant(board, users[2]);
            }).then(function(board) {

                board.participants.should.have.length(3);
                done();

            }).error(function(err) { done(err); });
        });

        it('should not be able to add the same participant twice', function(done) {
            this.timeout(5000);
            api.boards.create(userOwner, { name: 'Testboard'}).then(function(board) {
                api.boards.addParticipant(board, users[0]).then(function(board) {
                    api.boards.addParticipant(board, users[0])
                        .then(function() { done(new Error('Added same participant twice')); })
                        .error(function(err) {
                            err.message.should.match(/The user is already participating in this board/);
                            done();
                        });
                }).error(function(err) { done(err); });
            }).error(function(err) { done(err); });
        });

        it('should not be able to add the owner as a participant', function(done) {
            this.timeout(5000);
            api.boards.create(userOwner, { name: 'Testboard'}).then(function(board) {
                api.boards.addParticipant(board, userOwner)
                    .then(function() { done(new Error('Added the owner as a participant')); })
                    .error(function(err) {
                        err.message.should.match(/Can not add the owner as a participant/);
                        done();
                    });
            }).error(function(err) { done(err); });
        });
    });
});