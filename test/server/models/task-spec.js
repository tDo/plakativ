process.env.NODE_ENV = 'test';
require('should');
var helpers = require(__dirname + '/../helpers');
var models  = require(__dirname + '/../../../server/models');

describe('Tasks', function() {

    var card;

    beforeEach(function(done) {
        helpers.createTestDatabase()
            .then(function() { return models.User.make({ name: 'Testuser', password: 'testpassword'}); })
            .then(function(user) { return models.Board.make(user, { name: 'Testboard'}); })
            .then(function(board) { return models.Column.make(board, { title: 'Testcolumn'}); })
            .then(function(column) { return models.Card.make(column, { title: 'Testcard'}); })
            .then(function(c) {
                card = c;
                done();
            })
            .catch(function(err) { done(err); });
    });

    describe('Creation', function() {
        it('should not allow task creation without a target card', function(done) {
            models.Task.make(null, { title: 'Some task'})
                .then(function() { done(new Error('Created task without target card')); })
                .catch(function(err) {
                    err.message.should.match(/Invalid card/);
                    done();
                });
        });

        it('should not allow task creation for non-existing cards', function(done) {
            var c = models.Card.build({ title: 'Not saved'});
            models.Task.make(c, { title: 'A task'})
                .then(function() { done(new Error('Create task with not persisted card')); })
                .catch(function(err) {
                    err.message.should.match(/Invalid card/);
                    done();
                });
        });

        it('should not allow task creation without a title', function(done) {
            models.Task.make(card, {})
                .then(function() { done(new Error('Created task without a title')); })
                .catch(function(err) {
                    err.message.should.match(/Task title may not be empty/);
                    done();
                });
        });

        it('should not allow task creation with an empty title', function(done) {
            models.Task.make(card, { title: ''})
                .then(function() { done(new Error('Created task without a title')); })
                .catch(function(err) {
                    err.message.should.match(/Task title may not be empty/);
                    done();
                });
        });

        it('should create a task with a title at the end of a task-list', function(done) {
            models.Task.make(card, { title: 'Task 1'})
                .then(function(task) {
                    task.position.should.equal(1);
                    return models.Task.make(card, { title: 'Task 2'});
                })
                .then(function(task) {
                    task.position.should.equal(2);
                    done();
                })
                .catch(function(err) { return done(err); });
        });
    });

    describe('Done marking', function() {
        it('should mark a task as done', function(done) {
            models.Task.make(card, { title: 'Task 1', done: false})
                .then(function(task) {
                    task.done.should.equal(false);
                    return task.updateAttributes({ done: true });
                })
                .then(function() { return models.Task.findOne({ where: { title: 'Task 1', CardId: card.id }}); })
                .then(function(task) {
                    task.done.should.equal(true);
                    done();
                })
                .catch(function(err) { return done(err); });
        });

        it('should unmark a done task', function(done) {
            models.Task.make(card, { title: 'Task 1', done: true })
                .then(function(task) {
                    task.done.should.equal(true);
                    return task.updateAttributes({ done: false });
                })
                .then(function() { return models.Task.findOne({ where: { title: 'Task 1', CardId: card.id }}); })
                .then(function(task) {
                    task.done.should.equal(false);
                    done();
                })
                .catch(function(err) { return done(err); });
        });
    });

    describe('Repositioning', function() {
        beforeEach(function(done) {
            models.Task.make(card, { title: 'Task 1'})
                .then(function() { return models.Task.make(card, { title: 'Task 2'}); })
                .then(function() { return models.Task.make(card, { title: 'Task 3'}); })
                .then(function() { return models.Task.make(card, { title: 'Task 4'}); })
                .then(function() { return models.Task.make(card, { title: 'Task 5'}); })
                .then(function() { done(); })
                .catch(function(err) { done(err); });
        });

        it('should not accept a non-numeric offset', function(done) {
            models.Task.findOne({ where: { title: 'Task 3', CardId: card.id }})
                .then(function(task) {
                    task.moveTo('NaN')
                        .then(function() { done(new Error('Accepted non numeric offset')); })
                        .catch(function(err) {
                            err.message.should.match(/Position offset must be numeric/);
                            done();
                        });
                });
        });

        it('should move a task to the beginning', function(done) {
            models.Task.findOne({ where: { title: 'Task 3', CardId: card.id }})
                .then(function(task) { return task.moveTo(1); })
                .then(function() { return card.getTasks({ order: 'position asc'}); })
                .then(function(tasks) {
                    tasks.should.have.length(5);

                    tasks[0].title.should.equal('Task 3');
                    tasks[0].position.should.equal(1);

                    tasks[1].title.should.equal('Task 1');
                    tasks[1].position.should.equal(2);

                    tasks[2].title.should.equal('Task 2');
                    tasks[2].position.should.equal(3);

                    tasks[3].title.should.equal('Task 4');
                    tasks[3].position.should.equal(4);

                    tasks[4].title.should.equal('Task 5');
                    tasks[4].position.should.equal(5);

                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should move a task in the middle', function(done) {
            models.Task.findOne({ where: { title: 'Task 3', CardId: card.id }})
                .then(function(task) { return task.moveTo(4); })
                .then(function() { return card.getTasks({ order: 'position asc'}); })
                .then(function(tasks) {
                    tasks.should.have.length(5);

                    tasks[0].title.should.equal('Task 1');
                    tasks[0].position.should.equal(1);

                    tasks[1].title.should.equal('Task 2');
                    tasks[1].position.should.equal(2);

                    tasks[2].title.should.equal('Task 4');
                    tasks[2].position.should.equal(3);

                    tasks[3].title.should.equal('Task 3');
                    tasks[3].position.should.equal(4);

                    tasks[4].title.should.equal('Task 5');
                    tasks[4].position.should.equal(5);

                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should move a task to the end', function(done) {
            models.Task.findOne({ where: { title: 'Task 3', CardId: card.id }})
                .then(function(task) { return task.moveTo(6); })
                .then(function() { return card.getTasks({ order: 'position asc'}); })
                .then(function(tasks) {
                    tasks.should.have.length(5);

                    tasks[0].title.should.equal('Task 1');
                    tasks[0].position.should.equal(1);

                    tasks[1].title.should.equal('Task 2');
                    tasks[1].position.should.equal(2);

                    tasks[2].title.should.equal('Task 4');
                    tasks[2].position.should.equal(3);

                    tasks[3].title.should.equal('Task 5');
                    tasks[3].position.should.equal(4);

                    tasks[4].title.should.equal('Task 3');
                    tasks[4].position.should.equal(5);

                    done();
                })
                .catch(function(err) { done(err); });
        });
    });
});