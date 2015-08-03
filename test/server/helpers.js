process.env.NODE_ENV = 'test';
var models    = require(__dirname + '/../../server/models');
var sequelize = models.sequelize();
var should    = require('should');
var request   = require('supertest');

function createTestDatabase() {
    return sequelize.sync({ force: true });
}

function doLogin(app, username, password, cb) {
    var agent = request.agent(app);

    agent.post('/users/login')
        .set('Accept', 'application/json')
        .send({ username: username, password: password })
        .end(function(err, res) {
            should.not.exist(err);
            res.status.should.equal(200);
            should.exist(res.headers['set-cookie']);
            cb(agent);
        });
}

module.exports.createTestDatabase = createTestDatabase;
module.exports.doLogin = doLogin;