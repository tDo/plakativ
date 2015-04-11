var configs = require(__dirname + '/../../config.json');
require(__dirname + '/../../util/thinky')(configs.testing.database);
var api     = require(__dirname + '/../../api');
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
            api.users.create({ password: 'something'}).then(function() {
                done(new Error('Created a user without a name'));
            }).error(function() { done(); });
        });

        it('does not accept an empty name', function(done) {
            api.users.create({ name: '', password: 'something'}).then(function() {
                done(new Error('Created a user with an empty name'));
            }).error(function() { done(); });
        });

        it('does not accept a name which does not contain alnum characters', function(done) {
            api.users.create({ name: ' _-abcdefg_', password: 'something'}).then(function() {
                done(new Error('Created a user whose name started with a space'));
            }).error(function() { done(); });
        });

        it('does not accept a missing password', function(done) {
            api.users.create({ name: 'somename'}).then(function() {
                done(new Error('Created a user without a password'));
            }).error(function() { done(); });
        });

        it('does not accept too short password', function(done) {
            api.users.create({ name: 'somename', password: '123'}).then(function() {
                done(new Error('Created a user without a password'));
            }).error(function() { done(); });
        });

        it('can create a new user', function(done) {
            api.users.create({ name: 'testuser', password: 'testpassword'})
                .then(function(user) {
                    user.name.should.equal('testuser');
                    done();
                }).error(function(err) {
                    done(err);
                });
        });

        it('does not create a user with the same name twice', function(done) {
            api.users.create({ name: 'testuser', password: 'testpassword' }).then(function() {
                api.users.create({ name: 'testuser', password: 'testpassword'})
                    .then(function() { done(new Error('Created same user twice')); })
                    .error(function() { done(); });
            }).error(function(err) { done(err); });
        });

        it('does encrypt the password', function(done){
            var plainPassword = 'testpassword';
            api.users.create({ name: 'testuser', password: plainPassword }).then(function(user) {
                user.password.should.not.equal(plainPassword);
                done();
            }).error(function(err) { done(err); });
        });
    });

    describe('Credential validation', function() {
        beforeEach(function(done) {
            // Create the testuser before runs
            api.users.create({ name: 'testuser', 'password': 'testpassword' })
                .then(function() { done(); })
                .error(function(err) { done(err); });
        });

        it('should accept valid credentials and return the user', function(done) {
            api.users.validateCredentials({ name: 'testuser', password: 'testpassword'})
                .then(function(user) {
                    user.name.should.equal('testuser');
                    done();
                })
                .error(function(err) { done(err); });
        });

        it('should fail if the user does not exist', function(done) {
            api.users.validateCredentials({ name: 'Idonotexist', password: 'something'})
                .then(function() { done(new Error('Accepted invalid user')); })
                .error(function() { done(); });
        });

        it('should fail if the password is incorrect', function(done) {
            api.users.validateCredentials({ name: 'testuser', password: 'invalidpassword'})
                .then(function() { done(new Error('Invalid password was accepted')); })
                .error(function() { done(); });
        });
    });
});