process.env.NODE_ENV = 'test';
require('should');
var helpers = require(__dirname + '/../helpers');
var models  = require(__dirname + '/../../../models');

describe('Cards', function() {
    var userOwner;
    var userOther;
    var board;
    var columns;

    beforeEach(function(done) {
        columns = [];

        // Create database, testusers and a board and 2 columns
        helpers.createTestDatabase()
            .then(function() { return models.User.make({ name: 'Testuser', password: 'password'}); })
            .then(function(user) { userOwner = user; return models.User.make({ name: 'OtherUser1', password: 'password'}); })
            .then(function(user) { userOther = user; return models.Board.make(userOwner, { name: 'Testboard'}); })
            .then(function(b) { board = b; return b.addParticipant(userOther); })
            .then(function() { return models.Column.make(board, { title: 'Col A'}); })
            .then(function(col) { columns.push(col); return models.Column.make(board, { title: 'Col B'}); })
            .then(function(col) { columns.push(col); done(); })
            .catch(function(err) { done(err); });
    });

    describe('Creation', function() {
        it('should not allow card-creation without a target-column', function(done) {
            models.Card.make(null, { title: 'Some card' })
                .then(function() { done(new Error('Created card without target-column')); })
                .catch(function(err) {
                    err.message.should.match(/Invalid column/);
                    done();
                });
        });

        it('should not allow card-creation with a non-existing target-column', function(done) {
            var col = models.Column.build({ title: 'Not saved' });
            models.Card.make(col, { title: 'Some card' })
                .then(function() { done(new Error('Created card for a not persisted column')); })
                .catch(function(err) {
                    err.message.should.match(/Invalid column/);
                    done();
                });
        });

        it('should not allow card-creation without a title', function(done) {
            models.Card.make(columns[0], {})
                .then(function() { done(new Error('Created card without a title')); })
                .catch(function(err) {
                    err.message.should.match(/Card title may not be empty/);
                    done();
                });
        });

        it('should create a new card', function(done) {
            var d = new Date();
            models.Card.make(columns[0], { title: 'Some card', description: 'Some description', dueDate: d, estimate: 1.5 })
                .then(function(card) {
                    models.Card.isCard(card).should.equal(true);
                    card.ColumnId.should.equal(columns[0].id);
                    card.title.should.equal('Some card');
                    card.description.should.equal('Some description');
                    card.dueDate.should.equal(d);
                    card.estimate.should.equal(1.5);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should add a new card to the end of the column', function(done) {
            models.Card.make(columns[0], { title: 'Card A' })
                .then(function(card) {
                    card.position.should.equal(1);
                    return models.Card.make(columns[0], { title: 'Card B'});
                })
                .then(function(card) {
                    card.position.should.equal(2);
                    done();
                })
                .catch(function(err) { done(err); });
        });
    });

    describe('Repositioning', function() {
        beforeEach(function(done) {
            // Create a few posts for both columns
            // First column
            return models.Card.make(columns[0], { title: 'CardAA' })
                .then(function() { return models.Card.make(columns[0], { title: 'CardAB'}); })
                .then(function() { return models.Card.make(columns[0], { title: 'CardAC'}); })
                .then(function() { return models.Card.make(columns[0], { title: 'CardAD'}); })
            // Second column
                .then(function() { return models.Card.make(columns[1], { title: 'CardBA'}); })
                .then(function() { return models.Card.make(columns[1], { title: 'CardBB'}); })
                .then(function() { return models.Card.make(columns[1], { title: 'CardBC'}); })
                .then(function() { return models.Card.make(columns[1], { title: 'CardBD'}); })
            // And done
                .then(function() { done(); })
                .catch(function(err) { done(err); });
        });

        it('should not be possible to move to a null column', function(done) {
            return models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(card) {
                    card.moveTo(null, 1)
                        .then(function() { done(new Error('Moved a card to a null-column')); })
                        .catch(function(err) {
                            err.message.should.match(/Invalid column/);
                            done();
                        });
                })
                .catch(function(err) { done(err); });
        });

        it('should not be possible to move to a column which is not part of this board', function(done) {
            var colElsewhere;
            models.Board.make(userOwner, { name: 'Other board'})
                .then(function(b) { return models.Column.make(b, { title: 'Column elsewhere' }); })
                .then(function(c) { colElsewhere = c; return models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }}); })
                .then(function(card) {
                    card.moveTo(colElsewhere, 0)
                        .then(function() { done(new Error('Moved card to a column in a different board')); })
                        .catch(function(err) {
                            err.message.should.match(/Can not move card to column in different board/);
                            done();
                        });
                })
                .catch(function(err) { done(err); });
        });

        describe('In a single column', function() {
            it('should not accept a non-numeric offset', function(done) {
                models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                    .then(function(card) {
                        card.moveTo(columns[0], 'Not a number')
                            .then(function() { done(new Error('Accepted non-numeric offset')); })
                            .catch(function(err) {
                                err.message.should.match(/Position offset must be numeric/);
                                done();
                            });
                    })
                    .catch(function(err) { done(err); });
            });

            it('should move an entry in the middle', function(done) {
                models.Card.findOne({ where: { title: 'CardAC', ColumnId: columns[0].id }})
                    .then(function(card) { return card.moveTo(columns[0], 2); })
                    .then(function() { return columns[0].getCards({ order: 'position asc' }); })
                    .then(function(cards) {
                        cards.length.should.equal(4);

                        cards[0].title.should.equal('CardAA');
                        cards[0].position.should.equal(1);

                        cards[1].title.should.equal('CardAC');
                        cards[1].position.should.equal(2);

                        cards[2].title.should.equal('CardAB');
                        cards[2].position.should.equal(3);

                        cards[3].title.should.equal('CardAD');
                        cards[3].position.should.equal(5);

                        done();
                    })
                    .catch(function(err) { done(err); });
            });

            it('should move an entry to the beginning', function(done) {
                models.Card.findOne({ where: { title: 'CardAC', ColumnId: columns[0].id }})
                    .then(function(card) { return card.moveTo(columns[0], -1); })
                    .then(function() { return columns[0].getCards({ order: 'position asc' }); })
                    .then(function(cards) {
                        cards.length.should.equal(4);

                        cards[0].title.should.equal('CardAC');
                        cards[0].position.should.equal(1);

                        cards[1].title.should.equal('CardAA');
                        cards[1].position.should.equal(2);

                        cards[2].title.should.equal('CardAB');
                        cards[2].position.should.equal(3);

                        cards[3].title.should.equal('CardAD');
                        cards[3].position.should.equal(5);

                        done();
                    })
                    .catch(function(err) { done(err); });
            });

            it('should move an entry to the end', function(done) {
                models.Card.findOne({ where: { title: 'CardAC', ColumnId: columns[0].id }})
                    .then(function(card) { return card.moveTo(columns[0], 5); })
                    .then(function() { return columns[0].getCards({ order: 'position asc' }); })
                    .then(function(cards) {
                        cards.length.should.equal(4);

                        cards[0].title.should.equal('CardAA');
                        cards[0].position.should.equal(1);

                        cards[1].title.should.equal('CardAB');
                        cards[1].position.should.equal(2);

                        cards[2].title.should.equal('CardAD');
                        cards[2].position.should.equal(4);

                        cards[3].title.should.equal('CardAC');
                        cards[3].position.should.equal(5);

                        done();
                    })
                    .catch(function(err) { done(err); });
            });

        });

        describe('Between multiple columns', function() {
            it('should move a card from one column to another', function(done) {
                models.Card.findOne({ where: { title: 'CardAC', ColumnId: columns[0].id }})
                    .then(function(card) { return card.moveTo(columns[1], -1); })
                    .then(function() { return columns[1].getCards({ order: 'position asc'}); })
                    .then(function(cards) {
                        cards.length.should.equal(5);

                        cards[0].title.should.equal('CardAC');
                        cards[0].position.should.equal(1);

                        cards[1].title.should.equal('CardBA');
                        cards[1].position.should.equal(2);

                        cards[2].title.should.equal('CardBB');
                        cards[2].position.should.equal(3);

                        cards[3].title.should.equal('CardBC');
                        cards[3].position.should.equal(4);

                        cards[4].title.should.equal('CardBD');
                        cards[4].position.should.equal(5);

                        return columns[0].getCards({ order: 'position asc'});
                    })
                    .then(function(cards) {
                        cards.length.should.equal(3);

                        cards[0].title.should.equal('CardAA');
                        cards[0].position.should.equal(1);

                        cards[1].title.should.equal('CardAB');
                        cards[1].position.should.equal(2);

                        cards[2].title.should.equal('CardAD');
                        cards[2].position.should.equal(4);

                        done();
                    })
                    .catch(function(err) { done(err); });
            });
        });
    });

    describe('User assignment', function() {});

    describe('Label assignment', function() {});
});