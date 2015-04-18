process.env.NODE_ENV = 'test';
require('should');
var helpers = require(__dirname + '/../helpers');
var models  = require(__dirname + '/../../models');


describe('Users', function() {
    beforeEach(function(done) {
        helpers.createTestDatabase()
            .then(function() { done(); })
            .catch(function(err) { done(err); });
    });

    describe('Creation', function() {
        it('does not accept a missing name', function(done) {
            models.User.make({ password: 'something'}).then(function() {
                done(new Error('Created a user without a name'));
            }).catch(function(err) {
                err.message.should.match(/Username may not be empty/);
                done();
            });
        });

        it('does not accept an empty name', function(done) {
            models.User.make({ name: '', password: 'something'}).then(function() {
                done(new Error('Created a user with an empty name'));
            }).catch(function(err) {
                err.message.should.match(/Username may not be empty/);
                done();
            });
        });

        it('does not accept a name which does not contain alnum characters', function(done) {
            models.User.make({ name: ' _-abcdefg_', password: 'something'}).then(function() {
                done(new Error('Created a user whose name started with a space'));
            }).catch(function(err) {
                err.message.should.match(/Username may only consist of letters and numbers/);
                done();
            });
        });

        it('does not accept a missing password', function(done) {
            models.User.make({ name: 'somename'}).then(function() {
                done(new Error('Created a user without a password'));
            }).catch(function(err) {
                err.message.should.match(/Password may not be empty/);
                done();
            });
        });

        it('does not accept too short password', function(done) {
            models.User.make({ name: 'somename', password: '123'}).then(function() {
                done(new Error('Created a user with too short password'));
            }).catch(function(err) {
                err.message.should.match(/Password must at least have.+ characters/);
                done();
            });
        });

        it('does not accept a whitespace only password', function(done) {
            models.User.make({ name: 'somename', password: '      \t\t  '}).then(function() {
                done(new Error('Created a user with a whitespace only password'));
            }).catch(function(err) {
                err.message.should.match(/The password may not consist of only whitespace characters/);
                done();
            });
        });

        it('can create a new user', function(done) {
            models.User.make({ name: 'testuser', password: 'testpassword'})
                .then(function(user) {
                    user.name.should.equal('testuser');
                    done();
                }).catch(function(err) {
                    done(err);
                });
        });

        it('does not create a user with the same name twice', function(done) {
            models.User.make({ name: 'testuser', password: 'testpassword' }).then(function() {
                models.User.create({ name: 'testuser', password: 'testpassword'})
                    .then(function() { done(new Error('Created same user twice')); })
                    .catch(function(err) {
                        err.message.should.match(/Username is already taken/);
                        done();
                    });
            }).catch(function(err) { done(err); });
        });

        it('does encrypt the password', function(done){
            var plainPassword = 'testpassword';
            models.User.make({ name: 'testuser', password: plainPassword }).then(function(user) {
                user.password.should.not.equal(plainPassword);
                done();
            }).catch(function(err) { done(err); });
        });
    });

    describe('Credential validation', function() {
        beforeEach(function(done) {
            // Create the testuser before runs
            models.User.make({ name: 'testuser', 'password': 'testpassword' })
                .then(function() { done(); })
                .catch(function(err) { done(err); });
        });

        it('should accept valid credentials and return the user', function(done) {
            models.User.findByCredentials('testuser', 'testpassword')
                .then(function(user) {
                    user.name.should.equal('testuser');
                    done();
                })
                .catch(function(err) { done(err); });
        });

        it('should fail if the user does not exist', function(done) {
            models.User.findByCredentials('Idonotexist', 'something')
                .then(function() { done(new Error('Accepted invalid user')); })
                .catch(function(err) {
                    err.message.should.match(/Could not find a user with the given name/);
                    done();
                });
        });

        it('should fail if the password is incorrect', function(done) {
            models.User.findByCredentials('testuser', 'invalidpassword')
                .then(function() { done(new Error('Invalid password was accepted')); })
                .catch(function(err) {
                    err.message.should.match(/Password is invalid/);
                    done();
                });
        });
    });
});