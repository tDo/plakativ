process.env.NODE_ENV = 'test';
var should  = require('should');
var helpers = require(__dirname + '/../helpers');
var models  = require(__dirname + '/../../../server/models');

describe('Cards', function() {
    var userOwner;
    var userOther;
    var board;
    var columns;
    var labels;

    beforeEach(function(done) {
        columns = [];
        labels = [];

        // Create database, testusers and a board and 2 columns
        helpers.createTestDatabase()
            .then(function() { return models.User.make({ name: 'Testuser', password: 'password'}); })
            .then(function(user) { userOwner = user; return models.User.make({ name: 'OtherUser1', password: 'password'}); })
            .then(function(user) { userOther = user; return models.Board.make(userOwner, { name: 'Testboard'}); })
            .then(function(b) { board = b; return b.addUser(userOther); })
            .then(function() { return models.Column.make(board, { title: 'Col A'}); })
            .then(function(col) { columns.push(col); return models.Column.make(board, { title: 'Col B'}); })
            .then(function(col) { columns.push(col); return models.Label.make(board, { title: 'Label A', color: '#fff'}); })
            .then(function(label) { labels.push(label); return models.Label.make(board, { title: 'Label B', color: '#000'}); })
            .then(function(label) { labels.push(label); done(); })
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
                        cards[3].position.should.equal(4);

                        done();
                    })
                    .catch(function(err) { done(err); });
            });

            it('should move an entry to the beginning', function(done) {
                models.Card.findOne({ where: { title: 'CardAC', ColumnId: columns[0].id }})
                    .then(function(card) { return card.moveTo(columns[0], 1); })
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
                        cards[3].position.should.equal(4);

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
                        cards[2].position.should.equal(3);

                        cards[3].title.should.equal('CardAC');
                        cards[3].position.should.equal(4);

                        done();
                    })
                    .catch(function(err) { done(err); });
            });

        });

        describe('Between multiple columns', function() {
            it('should move a card from one column to another', function(done) {
                models.Card.findOne({ where: { title: 'CardAC', ColumnId: columns[0].id }})
                    .then(function(card) { return card.moveTo(columns[1], 1); })
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
                        cards[2].position.should.equal(3);

                        done();
                    })
                    .catch(function(err) { done(err); });
            });
        });
    });

    describe('Patching', function() {
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

        it('can patch static fields', function(done) {
            var id;
            models.Card.findOne({ where: { title: 'CardAA'}})
                .then(function(card) {
                    id = card.id;
                    return card.patch([
                        { op: 'replace', path: '/title', value: 'New title' },
                        { op: 'replace', path: '/description', value: 'New description'},
                        { op: 'replace', path: '/dueDate', value: '2015-03-21'},
                        { op: 'replace', path: '/estimate', value: 10 }
                    ]);
                })
                .then(function() { return models.Card.findOne({ where: { id: id }}); })
                .then(function(card) {
                    card.title.should.equal('New title');
                    card.description.should.equal('New description');
                    card.dueDate.getFullYear().should.equal(2015);
                    (card.dueDate.getMonth() + 1).should.equal(3);
                    card.dueDate.getDate().should.equal(21);
                    card.estimate.should.equal(10);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should apply default model validation to the fields', function(done) {
            models.Card.findOne({ where: { title: 'CardAA'}})
                .then(function(card) {
                    return card.patch([
                        { op: 'replace', path: '/title', value: ''},
                        { op: 'replace', path: '/description', value: null },
                        { op: 'replace', path: '/dueDate', value: 'not a date'},
                        { op: 'replace', path: '/estimate', value: -1 }
                    ]);
                })
                .then(function() { done(new Error('Accepted invalid field-data')); })
                .catch(function(err) {
                    should.exist(err);
                    err.message.should.match(/Validation error:/);
                    done();
                });
        });

        it('should be able to move a card using the patch-handler', function(done) {
            models.Card.findOne({ where: { title: 'CardAC', ColumnId: columns[0].id }})
                .then(function(card) {
                    return card.patch([
                        { op: 'replace', path: '/ColumnId', value: columns[1].id },
                        { op: 'replace', path: '/position', value: 1 }
                    ]);
                })
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
                    cards[2].position.should.equal(3);

                    done();
                })
                .catch(function(err) { done(err); });
        });
    });

    describe('User assignment', function() {
        beforeEach(function(done) {
            return models.Card.make(columns[0], { title: 'CardAA' })
                .then(function() { done(); })
                .catch(function(err) { done(err); });
        });

        it('should assign a user to a card', function(done) {
            var card;
            models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(c) {
                    card = c;
                    return card.assignUser(userOwner);
                })
                .then(function() { return card.assignUser(userOther); })
                .then(function() { return card.getAssignees(); })
                .then(function(users) {
                    users.length.should.equal(2);

                    users[0].id.should.equal(userOwner.id);
                    users[1].id.should.equal(userOther.id);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should assign a user only once', function(done) {
            var card;
            models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(c) {
                    card = c;
                    return card.assignUser(userOwner);
                })
                .then(function() { return card.assignUser(userOwner); })
                .then(function() { return card.getAssignees(); })
                .then(function(users) {
                    users.length.should.equal(1);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should verify that a user is assigned to a card', function(done) {
            var card;
            models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(c) {
                    card = c;
                    return card.addAssignee(userOwner);
                })
                .then(function() { return card.isAssignedUser(userOwner); })
                .then(function(isAssigned) {
                    isAssigned.should.equal(true);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should not assign a user to card if she does not participate in the board', function(done) {
            var userNotPart;

            models.User.make({ name: 'NotPart', password: 'password'})
                .then(function(user) {
                    userNotPart = user;
                    return models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }});
                })
                .then(function(card) { return card.assignUser(userNotPart); })
                .then(function() { done(new Error('Did not fail user assignment')); })
                .catch(function(err) {
                    err.message.should.match(/The user is not participating in the board/);
                    done();
                });
        });

        it('should not assign non-user objects', function(done) {
            models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(card) { return card.assignUser({ foo: 'bar'}); })
                .then(function() { done(new Error('Assigned a non-user instance')); })
                .catch(function(err) {
                    err.message.should.match(/Invalid user/);
                    done();
                });
        });

        it('should remove a user-assignment', function(done) {
            var card;
            models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(c) {
                    card = c;
                    return card.assignUser(userOther);
                })
                .then(function() { return card.removeAssignee(userOther); })
                .then(function() { return card.getAssignees(); })
                .then(function(users) {
                    users.length.should.equal(0);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should remove user-assigment from all cards in the board', function(done) {
            var card;
            models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(c) {
                    card = c;
                    return card.assignUser(userOwner);
                })
                .then(function() { return card.assignUser(userOther); })
                .then(function() { return board.removeUserFromAllCards(userOther); })
                .then(function() { return card.getAssignees(); })
                .then(function(users) {
                    users.length.should.equal(1);
                    done();
                })
                .catch(function(err) { done(err); });
        });
    });



    describe('Label assignment', function() {
        beforeEach(function(done) {
            return models.Card.make(columns[0], { title: 'CardAA' })
                .then(function() { done(); })
                .catch(function(err) { done(err); });
        });

        it('should assign a label to a card', function(done) {
            var card;
            models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(c) {
                    card = c;
                    return card.assignLabel(labels[0]);
                })
                .then(function() { return card.assignLabel(labels[1]); })
                .then(function() { return card.getLabels(); })
                .then(function(l) {
                    l.length.should.equal(2);

                    l[0].id.should.equal(labels[0].id);
                    l[1].id.should.equal(labels[1].id);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should assign a label only once', function(done) {
            var card;
            models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(c) {
                    card = c;
                    return card.assignLabel(labels[0]);
                })
                .then(function() { return card.assignLabel(labels[0]); })
                .then(function() { return card.getLabels(); })
                .then(function(l) {
                    l.length.should.equal(1);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should verify that a label is assigned to a card', function(done) {
            var card;
            models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(c) {
                    card = c;
                    return card.addLabel(labels[0]);
                })
                .then(function() { return card.isAssignedLabel(labels[0]); })
                .then(function(isAssigned) {
                    isAssigned.should.equal(true);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should not assign a label which does not belong to the same board as the card', function(done) {
            var labelNotPart;

            models.Board.make(userOwner, { name: 'Some other board'})
                .then(function(b) { return models.Label.make(b, { title: 'NotPart', color: '#f0f0f0' }); })
                .then(function(label) {
                    labelNotPart = label;
                    return models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }});
                })
                .then(function(card) { return card.assignLabel(labelNotPart); })
                .then(function() { done(new Error('Did not fail label assignment')); })
                .catch(function(err) {
                    err.message.should.match(/The label does not belong to the board/);
                    done();
                });
        });

        it('should not assign a non-label object', function(done) {
            models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(card) { return card.assignLabel({ foo: 'bar'}); })
                .then(function() { done(new Error('Assigned a non-label instance')); })
                .catch(function(err) {
                    err.message.should.match(/Invalid label/);
                    done();
                });
        });

        it('should remove a label-assignment', function(done) {
            var card;
            models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(c) {
                    card = c;
                    return card.assignLabel(labels[0]);
                })
                .then(function() { return card.removeLabel(labels[0]); })
                .then(function() { return card.getLabels(); })
                .then(function(l) {
                    l.length.should.equal(0);
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should remove a label-assignment from all cards in the board', function(done) {
            var card;
            models.Card.findOne({ where: { title: 'CardAA', ColumnId: columns[0].id }})
                .then(function(c) {
                    card = c;
                    return card.assignLabel(labels[0]);
                })
                .then(function() { return card.assignLabel(labels[1]); })
                .then(function() { return board.removeLabelFromAllCards(labels[0]); })
                .then(function() { return card.getLabels(); })
                .then(function(l) {
                    l.length.should.equal(1);
                    done();
                })
                .catch(function(err) { done(err); });
        });
    });
});