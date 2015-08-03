process.env.NODE_ENV = 'test';

var should  = require('should');
var request = require('supertest');
var config  = require(__dirname + '/../../../server/config')();
var app     = require(__dirname + '/../../../server/index')(config);
var helpers = require(__dirname + '/../helpers');
var models  = require(__dirname + '/../../../server/models');

describe('/users', function() {
    before(function(done) {
        helpers.createTestDatabase()
            .then(function() { return models.User.make({ name: 'testuser', password: 'testpassword'}); })
            .then(function() { done(); })
            .catch(function(err) { done(err); });
    });

    describe('GET /users', function() {
        before(function(done) {
            models.User.make({ name: 'user1', password: 'testpassword'})
                .then(function() { return models.User.make({ name: 'user2', password: 'testpassword'}); })
                .then(function() { return models.User.make({ name: 'user3', password: 'testpassword'}); })
                .then(function() { return models.User.make({ name: 'user4', password: 'testpassword'}); })
                .then(function() { return models.User.make({ name: 'user5', password: 'testpassword'}); })
                .then(function() { return models.User.make({ name: 'user6', password: 'testpassword'}); })
                .then(function() { return models.User.make({ name: 'user7', password: 'testpassword'}); })
                .then(function() { return models.User.make({ name: 'user8', password: 'testpassword'}); })
                .then(function() { return models.User.make({ name: 'user9', password: 'testpassword'}); })
                .then(function() { return models.User.make({ name: 'user10', password: 'testpassword'}); })
                .then(function() { return models.User.make({ name: 'user11', password: 'testpassword'}); })
                .then(function() { return models.User.make({ name: 'linus', password: 'testpassword'}); })
                .then(function() { done(); })
                .catch(function(err) { done(err); });
        });

        it('should return an error if no user-session exists', function(done) {
            request(app)
                .get('/users/')
                .query('username', 'user')
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

        it('should not accept a missing username', function(done) {
            helpers.doLogin(app, 'testuser', 'testpassword', function(agent) {
                agent.get('/users/')
                    .query({ limit: 5 })
                    .set('Accept', 'application/json')
                    .end(function(err, res) {
                        res.status.should.equal(422);

                        done();
                    });
            });
        });

        it('should not accept an empty username', function(done) {
            helpers.doLogin(app, 'testuser', 'testpassword', function(agent) {
                agent.get('/users/')
                    .query({ username: '' })
                    .set('Accept', 'application/json')
                    .end(function(err, res) {
                        res.status.should.equal(422);

                        done();
                    });
            });
        });

        it('should not accept a whitespace only username', function(done) {
            helpers.doLogin(app, 'testuser', 'testpassword', function(agent) {
                agent.get('/users/')
                    .query({ username: '   \t   ' })
                    .set('Accept', 'application/json')
                    .end(function(err, res) {
                        res.status.should.equal(422);

                        done();
                    });
            });
        });

        it('should return a list of matching users and limit the amount to the passed limit', function(done) {
            helpers.doLogin(app, 'testuser', 'testpassword', function(agent) {
                agent.get('/users/')
                    .query({ username: 'user', limit: 5 })
                    .set('Accept', 'application/json')
                    .end(function(err, res) {
                        should.not.exist(err);
                        res.status.should.equal(200);
                        res.body.length.should.equal(5);

                        res.body.forEach(function(val, idx) {
                            should.exist(val);
                            val.should.have.property('id');
                            val.should.have.property('name');
                            val.name.should.match(/user/);
                        });

                        done();
                    });
            });
        });

        it('should reduce the maximum result limit to 10 if a higher limit was passed', function(done) {
            helpers.doLogin(app, 'testuser', 'testpassword', function(agent) {
                agent.get('/users/')
                    .query({ username: 'user', limit: 12 })
                    .set('Accept', 'application/json')
                    .end(function(err, res) {
                        should.not.exist(err);
                        res.status.should.equal(200);
                        res.body.length.should.equal(10);

                        done();
                    });
            });
        });

        it('should increase the limit to 1 if a smaller limit was passed', function(done) {
            helpers.doLogin(app, 'testuser', 'testpassword', function(agent) {
                agent.get('/users/')
                    .query({ username: 'user', limit: -1 })
                    .set('Accept', 'application/json')
                    .end(function(err, res) {
                        should.not.exist(err);
                        res.status.should.equal(200);
                        res.body.length.should.equal(1);

                        done();
                    });
            });
        });

        it('should use the default maximum limit if none was passed', function(done) {
            helpers.doLogin(app, 'testuser', 'testpassword', function(agent) {
                agent.get('/users/')
                    .query({ username: 'user' })
                    .set('Accept', 'application/json')
                    .end(function(err, res) {
                        should.not.exist(err);
                        res.status.should.equal(200);
                        res.body.length.should.equal(10);

                        done();
                    });
            });
        });

        it('should use the default maximum limit if the limit was not passed as a number', function(done) {
            helpers.doLogin(app, 'testuser', 'testpassword', function(agent) {
                agent.get('/users/')
                    .query({ username: 'user', limit: 'fnord' })
                    .set('Accept', 'application/json')
                    .end(function(err, res) {
                        should.not.exist(err);
                        res.status.should.equal(200);
                        res.body.length.should.equal(10);

                        done();
                    });
            });
        });

        it('should accept float limits but round them down', function(done) {
            helpers.doLogin(app, 'testuser', 'testpassword', function(agent) {
                agent.get('/users/')
                    .query({ username: 'user', limit: 5.9 })
                    .set('Accept', 'application/json')
                    .end(function(err, res) {
                        should.not.exist(err);
                        res.status.should.equal(200);
                        res.body.length.should.equal(5);

                        done();
                    });
            });
        });
    });

    describe('POST /users/login', function() {
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

    describe('GET /users/me', function() {
        it('should return an error if called without a user session', function(done) {
            request(app)
                .get('/users/me')
                .expect('Content-Type', /json/)
                .expect(401)
                .end(function(err, res) {
                    if(err) { return done(err); }

                    res.body.should.have.property('error');
                    res.body.error.should.have.property('message');
                    res.body.error.message.should.match(/You must be logged in to call this route/);
                    done();
                });
        });

        it('should return the userdata of a logged-in user', function(done) {
            helpers.doLogin(app, 'testuser', 'testpassword', function(agent) {
                agent.get('/users/me')
                    .set('Accept', 'application/json')
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.status.should.equal(200);

                        res.body.should.not.have.property('error');
                        res.body.should.have.property('name');
                        res.body.should.have.property('id');
                        res.body.name.should.equal('testuser');
                        res.body.id.should.be.above(0);
                        done();
                    });
            });
        });
    });

    describe('GET /users/logout', function() {
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
            helpers.doLogin(app, 'testuser', 'testpassword', function(agent) {
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