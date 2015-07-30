process.env.NODE_ENV = 'test';
require('should');
var helpers = require(__dirname + '/../helpers');
var models  = require(__dirname + '/../../../server/models');

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
            .then(function(b) { board = b; return b.addUser(userOther); })
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
                    err.message.should.match(/Invalid board/);
                    done();
                });
        });

        it('should not allow column-creation without a title', function(done) {
            models.Column.make(board, {})
                .then(function() { done(new Error('Created column without a title')); })
                .catch(function(err) {
                    err.message.should.match(/Column title may not be empty/);
                    done();
                });
        });

        it('should create a new column', function(done) {
            models.Column.make(board, { title: 'First column', wipLimit: 10 })
                .then(function(col) {
                    models.Column.isColumn(col).should.equal(true);
                    col.BoardId.should.equal(board.id);
                    col.title.should.equal('First column');
                    col.position.should.equal(1);
                    col.wipLimit.should.equal(10);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should add new columns to the last position', function(done) {
            models.Column.make(board, { title: 'First column' })
                .then(function(col1) {
                    col1.position.should.equal(1);
                    return models.Column.make(board, { title: 'Second column' });
                }).then(function(col2) {
                    col2.position.should.equal(2);
                    done();
                })
                .catch(function(err) { done(err); });
        });
    });

    describe('Repositioning', function() {
        beforeEach(function(done) {
            // Create a hand full of columns
            return models.Column.create({ title: 'Col A', position: 1, BoardId: board.id })
                .then(function() { return models.Column.create({ title: 'Col B', position: 2, BoardId: board.id }); })
                .then(function() { return models.Column.create({ title: 'Col C', position: 3, BoardId: board.id }); })
                .then(function() { return models.Column.create({ title: 'Col D', position: 4, BoardId: board.id }); })
                .then(function() { done(); })
                .catch(function(err) { done(err); });
        });

        it('should not accept a non-numeric offset', function(done) {
            models.Column.findOne({ where: { title: 'Col C', boardId: board.id }})
                .then(function(colC) {
                    colC.moveTo('Not a number')
                        .then(function() { done(new Error('Accepted non-numeric offset')); })
                        .catch(function(err) {
                            err.message.should.match(/Position offset must be numeric/);
                            done();
                        });
                })
                .catch(function(err) { done(err); });
        });

        it('should move an entry in the middle', function(done) {
            models.Column.findOne({ where: { title: 'Col C', BoardId: board.id }})
                .then(function(colC) { return colC.moveTo(2); })
                .then(function() { return board.getColumns({ order: 'position asc'}); })
                .then(function(columns) {
                    columns.should.have.length(4);
                    columns[0].title.should.equal('Col A');
                    columns[0].position.should.equal(1);

                    columns[1].title.should.equal('Col C');
                    columns[1].position.should.equal(2);

                    columns[2].title.should.equal('Col B');
                    columns[2].position.should.equal(3);

                    columns[3].title.should.equal('Col D');
                    columns[3].position.should.equal(4);

                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should move an entry to the beginning', function(done) {
            models.Column.findOne({ where: { title: 'Col C', BoardId: board.id }})
                .then(function(colC) { return colC.moveTo(1); })
                .then(function() { return board.getColumns({ order: 'position asc'}); })
                .then(function(columns) {
                    columns.should.have.length(4);
                    columns[0].title.should.equal('Col C');
                    columns[0].position.should.equal(1);

                    columns[1].title.should.equal('Col A');
                    columns[1].position.should.equal(2);

                    columns[2].title.should.equal('Col B');
                    columns[2].position.should.equal(3);

                    columns[3].title.should.equal('Col D');
                    columns[3].position.should.equal(4);

                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should move an entry to the end', function(done) {
            models.Column.findOne({ where: { title: 'Col C', BoardId: board.id }})
                .then(function(colC) { return colC.moveTo(5); })
                .then(function() { return board.getColumns({ order: 'position asc'}); })
                .then(function(columns) {
                    columns.should.have.length(4);
                    columns[0].title.should.equal('Col A');
                    columns[0].position.should.equal(1);

                    columns[1].title.should.equal('Col B');
                    columns[1].position.should.equal(2);

                    columns[2].title.should.equal('Col D');
                    columns[2].position.should.equal(3);

                    columns[3].title.should.equal('Col C');
                    columns[3].position.should.equal(4);

                    done();
                })
                .catch(function(err) { done(err); });
        });
    });

});