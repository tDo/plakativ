process.env.NODE_ENV = 'test';

var should  = require('should');
var request = require('supertest');
var config  = require(__dirname + '/../../../config')();
var app     = require(__dirname + '/../../../index')(config);
var helpers = require(__dirname + '/../helpers');
var models  = require(__dirname + '/../../../models');

describe('/users', function() {
    beforeEach(function(done) {
        helpers.createTestDatabase()
            .then(function() { return models.User.make({ name: 'testuser', password: 'testpassword'}); })
            .then(function() { done(); })
            .catch(function(err) { done(err); });
    });

    describe('POST /api/users/login', function() {
        it('responds with a json error-message and a value of null if the credentials are missing', function(done) {
            request(app)
                .post('/users/login')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) { return done(err); }

                    res.body.should.have.property('error_message');
                    res.body.error_message.should.match(/Login failed/);
                    res.body.should.have.property('value');
                    should.not.exist(res.body.value);
                    done();
                });
        });

        it('responds with a json error-message and a value of null if the credentials are invalid', function(done) {
            request(app)
                .post('/users/login')
                .send({ username: 'Invalid', password: 'Also invalid'})
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) { return done(err); }

                    res.body.should.have.property('error_message');
                    res.body.error_message.should.match(/Login failed/);
                    res.body.should.have.property('value');
                    should.not.exist(res.body.value);
                    done();
                });
        });

        it('responds with a json value of the logged-in user if the credentials are valid and should not have an error-message', function(done) {
            request(app)
                .post('/users/login')
                .send({ username: 'testuser', password: 'testpassword'})
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) { return done(err); }

                    res.body.should.not.have.property('error_message');
                    res.body.should.have.property('value');
                    res.body.value.should.have.property('name');
                    res.body.value.should.have.property('id');
                    res.body.value.name.should.equal('testuser');
                    res.body.value.id.should.be.above(0);
                    done();
                });
        });
    });
});