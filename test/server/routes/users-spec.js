process.env.NODE_ENV = 'test';

var should  = require('should');
var request = require('supertest');
var config  = require(__dirname + '/../../../server/config')();
var app     = require(__dirname + '/../../../server/index')(config);
var helpers = require(__dirname + '/../helpers');
var models  = require(__dirname + '/../../../server/models');

describe('/users', function() {
    beforeEach(function(done) {
        helpers.createTestDatabase()
            .then(function() { return models.User.make({ name: 'testuser', password: 'testpassword'}); })
            .then(function() { done(); })
            .catch(function(err) { done(err); });
    });

    describe('POST /api/users/login', function() {
        it('responds with a json error-message if the credentials are missing', function(done) {
            request(app)
                .post('/users/login')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) { return done(err); }

                    res.body.should.have.property('error');
                    res.body.error.should.have.property('message');
                    res.body.error.message.should.match(/Username or password were incorrect/);
                    should.not.exist(res.body.value);
                    done();
                });
        });

        it('responds with a json error-message if the credentials are invalid', function(done) {
            request(app)
                .post('/users/login')
                .send({ username: 'Invalid', password: 'Also invalid'})
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) { return done(err); }

                    res.body.should.have.property('error');
                    res.body.error.should.have.property('message');
                    res.body.error.message.should.match(/Username or password were incorrect/);
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

                    res.body.should.not.have.property('error');
                    res.body.should.have.property('name');
                    res.body.should.have.property('id');
                    res.body.name.should.equal('testuser');
                    res.body.id.should.be.above(0);
                    done();
                });
        });
    });

    describe('GET /api/users/logout', function() {
        it('should deny access if the user is not logged in', function(done) {
            request(app)
                .get('/users/logout')
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function(err, res) {
                    if (err) { return done(err); }

                    res.body.should.have.property('error');
                    res.body.error.should.have.property('message');
                    res.body.error.message.should.match(/You must be logged in to call this route/);
                    done();
                });
        });

        it('should log out a logged in user', function(done) {
            var agent = request.agent(app);

            agent.post('/users/login')
                .set('Accept', 'application/json')
                .send({ username: 'testuser', password: 'testpassword'})
                .end(function(err, res) {
                    should.not.exist(err);
                    res.status.should.equal(200);
                    should.exist(res.headers['set-cookie']);

                    agent.get('/users/logout')
                        .set('Accept', 'application/json')
                        .end(function(err, res) {
                            should.not.exist(err);
                            res.status.should.equal(200);
                            done();
                        });
                });
        });
    });
});