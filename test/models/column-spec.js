var configs = require(__dirname + '/../../config.json');
require(__dirname + '/../../util/thinky')(configs.testing.database);
var models  = require(__dirname + '/../../models');
require('should');
var helpers = require(__dirname + '/../helpers');

describe('Columns', function() {
    var userOwner;
    var userOther;
    var board;

    before(function(done) {
        this.timeout(5000);
        helpers.clearTables()
            .then(function() { return models.User.create({ name: 'Testuser', password: 'password'}); })
            .then(function(user) {
                userOwner = user;
                return models.User.create({ name: 'OtherUser1', password: 'password'});
            }).then(function(user) {
                userOther = user;
                return models.Board.create(userOwner, { name: 'Testboard'}); })
            .then(function(b) {
                return b.addParticipant(userOther);
            }).then(function(b) {
                board = b;
                done();
            })
            .error(function(err) { done(err); });
    });

    beforeEach(function(done) {
        helpers.clearTable('Column')
            .then(function() { done(); })
            .error(function(err) { done(err); });
    });

    describe('Creation', function() {
        it('should not allow column-creation without a target-board', function(done) {
            models.Column.create(null, { title: 'Column' })
                .then(function() { done(new Error('Created column without parent board')); })
                .error(function(err) {
                    err.message.should.match(/Invalid board/);
                    done();
                });
        });

        it('should not allow column-creation with a non-existing board', function(done) {
            var b = new models.Board({ name: 'Some board'});
            models.Column.create(b, { title: 'Column'})
                .then(function() { done(new Error('Created column for a not-saved board')); })
                .error(function(err) {
                    err.message.match.should.match(/Board has not been saved to database/);
                    done();
                });
        });

        it('should not allow column-creation without a title', function(done) {
            models.Column.create(board, {})
                .then(function() { done(new Error('Created column without a title')); })
                .error(function() { done(); });
        });

        it('should add new columns to the last order-position', function(done) {
            models.Column.create(board, { title: 'First column'})
                .then(function(col1) {
                    col1.order.should.equal(0);
                    return models.Column.create(board, { title: 'Second column' });
                }).then(function(col2) {
                    col2.order.should.equal(1);
                    done();
                })
                .error(function(err) { done(err); });
        });
    });

    describe('Reordering', function() {

    });
});