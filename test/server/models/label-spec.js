process.env.NODE_ENV = 'test';
require('should');
var helpers = require(__dirname + '/../helpers');
var models  = require(__dirname + '/../../../server/models');

describe('Labels', function() {
    var userOwner;
    var board;

    beforeEach(function(done) {
        // Create database, testusers and a board to add columns to
        helpers.createTestDatabase()
            .then(function() { return models.User.make({ name: 'Testuser', password: 'password'}); })
            .then(function(user) { userOwner = user; return models.Board.make(userOwner, { name: 'Testboard'}); })
            .then(function(b) { board = b; done(); })
            .catch(function(err) { done(err); });
    });

    describe('Creation', function() {
        it('should not allow label-creation without a target-board', function(done) {
            models.Label.make(null, { 'title': 'Some label', color: '#fff' })
                .then(function() { done(new Error('Created label without target-board')); })
                .catch(function(err) {
                    err.message.should.match(/Invalid board/);
                    done();
                })
        });

        it('should not allow label-creation for a non-existing board', function(done) {
            var b = models.Board.build({ name: 'Some board' });
            models.Label.make(b, { title: 'Some label', color: '#fff'})
                .then(function() { done(new Error('Created label for a not-saved board')); })
                .catch(function(err) {
                    err.message.should.match(/Invalid board/);
                    done();
                });
        });

        it('should not allow label-creation without a color', function(done) {
            models.Label.make(board, { title: 'Some title' })
                .then(function() { done(new Error('Created label without a color')); })
                .catch(function(err) {
                    err.message.should.match(/Color must be set/);
                    done();
                });
        });

        it('should not allow a non hex color', function(done) {
            models.Label.make(board, { title: 'Some title', color: 'red' })
                .then(function() { done(new Error('Created label with non-hex color')); })
                .catch(function(err) {
                    err.message.should.match(/Color must be a valid hex-color code in either short or long form/);
                    done();
                });
        });

        it('should create a label with only a color', function(done) {
            models.Label.make(board, { color: '#fff' })
                .then(function(label) {
                    label.title.should.equal('');
                    label.color.should.equal('#fff');
                    done();
                })
                .catch(function(err) { console.log(err); done(err); });
        });

        it('should create a label with a title and short-hex color', function(done) {
            models.Label.make(board, { title: 'Some title', color: '#fff' })
                .then(function(label) {
                    label.title.should.equal('Some title');
                    label.color.should.equal('#fff');
                    done();
                })
                .catch(function(err) { console.log(err); done(err); });
        });

        it('should create a label with a title and long-hex color', function(done) {
            models.Label.make(board, { title: 'Some title', color: '#f0f0f0' })
                .then(function(label) {
                    label.title.should.equal('Some title');
                    label.color.should.equal('#f0f0f0');
                    done();
                })
                .catch(function(err) { done(err); });
        });
    });
});