process.env.NODE_ENV = 'test';
require('should');
var helpers = require(__dirname + '/../helpers');
var models  = require(__dirname + '/../../models');

describe('Columns', function() {
    var userOwner;
    var userOther;
    var board;

    beforeEach(function(done) {
        // Create database, testusers and a board to add columns to
        helpers.createTestDatabase()
            .then(function() { return models.User.make({ name: 'Testuser', password: 'password'}); })
            .then(function(user) { userOwner = user; return models.User.make({ name: 'OtherUser1', password: 'password'}); })
            .then(function(user) { userOther = user; return models.Board.make(userOwner, { name: 'Testboard'}); })
            .then(function(b) { board = b; return b.addParticipant(userOther); })
            .then(function() { done(); })
            .catch(function(err) { done(err); });
    });

    describe('Creation', function() {
        it('should not allow column-creation without a target-board', function(done) {
            models.Column.make(null, { title: 'Column' })
                .then(function() { done(new Error('Created column without parent board')); })
                .catch(function(err) {
                    err.message.should.match(/Invalid board/);
                    done();
                });
        });

        it('should not allow column-creation with a non-existing board', function(done) {
            var b = models.Board.build({ name: 'Some board' });
            models.Column.make(b, { title: 'Column'})
                .then(function() { done(new Error('Created column for a not-saved board')); })
                .catch(function(err) {
                    err.message.match.should.match(/Board has not been saved to database/);
                    done();
                });
        });

        it('should not allow column-creation without a title', function(done) {
            models.Column.make(board, {})
                .then(function() { done(new Error('Created column without a title')); })
                .catch(function() { done(); });
        });

        it('should add new columns to the last position', function(done) {
            models.Column.make(board, { title: 'First column' })
                .then(function(col1) {
                    col1.position.should.equal(0);
                    return models.Column.make(board, { title: 'Second column' });
                }).then(function(col2) {
                    col2.position.should.equal(1);
                    done();
                })
                .catch(function(err) { done(err); });
        });
    });

    describe('Repositioning', function() {

    });
});