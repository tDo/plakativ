var configs = require(__dirname + '/../../config.json');
require(__dirname + '/../../util/thinky')(configs.testing.database);
var models  = require(__dirname + '/../../models');
require('should');
var helpers = require(__dirname + '/../helpers');

describe('Boards', function() {
    var userOwner;
    var users;

    before(function(done) {
        users = [];

        // Cleanup and create a bunch of testusers
        helpers.clearTables()
            .then(function() { return models.User.create({ name: 'Testuser', password: 'password'}); })
            .then(function(user) {
                userOwner = user;
                return models.User.create({ name: 'OtherUser1', password: 'password'});
            })
            .then(function(user) { users.push(user); return models.User.create({ name: 'OtherUser2', password: 'password'}); })
            .then(function(user) { users.push(user); return models.User.create({ name: 'OtherUser3', password: 'password'}); })
            .then(function(user) { users.push(user); done(); })
            .error(function(err) { done(err); });
    });

    beforeEach(function(done) {
        helpers.clearTable('Board').then(function() {
            return helpers.clearTable('Board_User');
        }).then(function() { done(); });
    });

    describe('Creation', function() {
        it('should not accept board-creation without an owner', function(done) {
            models.Board.create(null, { name: 'Testboard' })
                .then(function() { done(new Error('Board created even without valid owner')); })
                .error(function(err) {
                    err.message.should.match(/Invalid user/);
                    done();
                });
        });

        it('should not accept board-creation with a non-existing user', function(done) {
            var user = new models.User({ name: 'Not saved user'});
            models.Board.create(user, { name: 'Testboard'})
                .then(function() { done(new Error('Board created with a not saved user-instance')); })
                .error(function(err) {
                    err.message.should.match(/User has not been saved to database/);
                    done();
                });
        });

        it('should not be able to add a board without a name', function(done) {
            models.Board.create(userOwner, {})
                .then(function() { done(new Error('Added board without a name')); })
                .error(function() { done(); });
        });

        it('should not be able to add a board with an empty name', function(done) {
            models.Board.create(userOwner, {})
                .then(function() { done(new Error('Added board with an empty name')); })
                .error(function() { done(); });
        });

        it('should create a board', function(done) {
            models.Board.create(userOwner, { name: 'Testboard'})
                .then(function(board) {
                    board.name.should.equal('Testboard');
                    board.private.should.equal(true);
                    board.owner.id.should.equal(userOwner.id);
                    board.owner.name.should.equal(userOwner.name);
                    done();
                }).error(function(err) { done(err); });
        });

        it('should create multiple boards with the same owner', function(done) {
            models.Board.create(userOwner, { name: 'Testboard'})
                .then(function(board) {
                    board.name.should.equal('Testboard');
                    board.private.should.equal(true);
                    board.owner.id.should.equal(userOwner.id);
                    board.owner.name.should.equal(userOwner.name);
                    return models.Board.create(userOwner, { name: 'Testboard2'});
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
            models.Board.create(userOwner, { name: 'Testboard', private: false})
                .then(function(board) {
                    board.name.should.equal('Testboard');
                    board.private.should.equal(false);
                    board.owner.id.should.equal(userOwner.id);
                    board.owner.name.should.equal(userOwner.name);
                    done();
                }).error(function(err) { done(err); });
        });
    });

    describe('Ownership', function() {
        it('should know that a user is the owner', function(done) {
            models.Board.create(userOwner, { name: 'Testboard'}).then(function(board) {
                board.isOwner(userOwner)
                    .then(function(isOwner) {
                        isOwner.should.equal(true);
                        done();
                    })
                    .error(function(err) { done(err); });
            });
        });

        it('should know that a user is not the owner', function(done) {
            models.Board.create(userOwner, { name: 'Testboard'}).then(function(board) {
                board.isOwner(users[0])
                    .then(function(isOwner) {
                        isOwner.should.equal(false);
                        done();
                    })
                    .error(function(err) { done(err); });
            });
        });
    });

    describe('Participants', function() {
        it('should be able to add participants to a board', function(done) {
            this.timeout(5000);
            models.Board.create(userOwner, { name: 'Testboard'}).then(function(board) {
                return board.addParticipant(users[0]);
            }).then(function(board) {
                return board.addParticipant(users[1]);
            }).then(function(board) {
                return board.addParticipant(users[2]);
            }).then(function(board) {

                board.owner.id.should.equal(userOwner.id);
                board.participants.should.have.length(3);
                done();

            }).error(function(err) { done(err); });
        });

        it('should not be able to add the same participant twice', function(done) {
            this.timeout(5000);
            models.Board.create(userOwner, { name: 'Testboard'}).then(function(board) {
                board.addParticipant(users[0]).then(function(board) {
                    board.addParticipant(users[0])
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
            models.Board.create(userOwner, { name: 'Testboard'}).then(function(board) {
                board.addParticipant(userOwner)
                    .then(function() { done(new Error('Added the owner as a participant')); })
                    .error(function(err) {
                        err.message.should.match(/Can not add the owner as a participant/);
                        done();
                    });
            }).error(function(err) { done(err); });
        });

        it('should be able to verify that a user is a participant of a board', function(done) {
            this.timeout(5000);
            models.Board.create(userOwner, { name: 'Testboard'}).then(function(board) {
                return board.addParticipant(users[0]);
            }).then(function(board) {
                return board.isParticipant(users[0]);
            }).then(function(isParticipating) {
                isParticipating.should.equal(true);
                done();

            }).error(function(err) { done(err); });
        });

        it('should be able to verify that a user is no participant of a board', function(done) {
            this.timeout(5000);
            models.Board.create(userOwner, { name: 'Testboard'}).then(function(board) {
                return board.addParticipant(users[0]);
            }).then(function(board) {
                return board.isParticipant(users[1]);
            }).then(function(isParticipating) {
                isParticipating.should.equal(false);
                done();

            }).error(function(err) { done(err); });
        });

        it('should be able to also acknowledge participation of the boards owner', function(done) {
            this.timeout(5000);
            models.Board.create(userOwner, { name: 'Testboard'}).then(function(board) {
                return board.isParticipant(userOwner);
            }).then(function(isParticipating) {
                isParticipating.should.equal(true);
                done();

            }).error(function(err) { done(err); });
        });
    });
});