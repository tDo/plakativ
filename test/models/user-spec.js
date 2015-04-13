var configs = require(__dirname + '/../../config.json');
require(__dirname + '/../../util/thinky')(configs.testing.database);
var models  = require(__dirname + '/../../models');
require('should');
var helpers = require(__dirname + '/../helpers');

describe('Users API', function() {
    beforeEach(function(done) {
        helpers.clearTables()
            .then(function() { done(); })
            .error(function(err) { done(err); });
    });

    describe('User creation', function() {
        it('does not accept a missing name', function(done) {
            models.User.create({ password: 'something'}).then(function() {
                done(new Error('Created a user without a name'));
            }).error(function() { done(); });
        });

        it('does not accept an empty name', function(done) {
            models.User.create({ name: '', password: 'something'}).then(function() {
                done(new Error('Created a user with an empty name'));
            }).error(function() { done(); });
        });

        it('does not accept a name which does not contain alnum characters', function(done) {
            models.User.create({ name: ' _-abcdefg_', password: 'something'}).then(function() {
                done(new Error('Created a user whose name started with a space'));
            }).error(function() { done(); });
        });

        it('does not accept a missing password', function(done) {
            models.User.create({ name: 'somename'}).then(function() {
                done(new Error('Created a user without a password'));
            }).error(function() { done(); });
        });

        it('does not accept too short password', function(done) {
            models.User.create({ name: 'somename', password: '123'}).then(function() {
                done(new Error('Created a user without a password'));
            }).error(function() { done(); });
        });

        it('can create a new user', function(done) {
            models.User.create({ name: 'testuser', password: 'testpassword'})
                .then(function(user) {
                    user.name.should.equal('testuser');
                    done();
                }).error(function(err) {
                    done(err);
                });
        });

        it('does not create a user with the same name twice', function(done) {
            models.User.create({ name: 'testuser', password: 'testpassword' }).then(function() {
                models.User.create({ name: 'testuser', password: 'testpassword'})
                    .then(function() { done(new Error('Created same user twice')); })
                    .error(function(err) {
                        err.message.should.match(/The name testuser is already taken/);
                        done();
                    });
            }).error(function(err) { done(err); });
        });

        it('does encrypt the password', function(done){
            var plainPassword = 'testpassword';
            models.User.create({ name: 'testuser', password: plainPassword }).then(function(user) {
                user.password.should.not.equal(plainPassword);
                done();
            }).error(function(err) { done(err); });
        });
    });

    describe('Credential validation', function() {
        beforeEach(function(done) {
            // Create the testuser before runs
            models.User.create({ name: 'testuser', 'password': 'testpassword' })
                .then(function() { done(); })
                .error(function(err) { done(err); });
        });

        it('should accept valid credentials and return the user', function(done) {
            models.User.byCredentials({ name: 'testuser', password: 'testpassword'})
                .then(function(user) {
                    user.name.should.equal('testuser');
                    done();
                })
                .error(function(err) { done(err); });
        });

        it('should fail if the user does not exist', function(done) {
            models.User.byCredentials({ name: 'Idonotexist', password: 'something'})
                .then(function() { done(new Error('Accepted invalid user')); })
                .error(function(err) {
                    err.message.should.match(/Could not find a user with the given name/);
                    done();
                });
        });

        it('should fail if the password is incorrect', function(done) {
            models.User.byCredentials({ name: 'testuser', password: 'invalidpassword'})
                .then(function() { done(new Error('Invalid password was accepted')); })
                .error(function(err) {
                    err.message.should.match(/Password is invalid/);
                    done();
                });
        });
    });
});