process.env.NODE_ENV = 'test';

var should  = require('should');
var loggedIn = require('../../../../routes/middleware/logged-in.js');

describe('middleware logged-in', function() {
    var lastStatus, lastJson, nextCalled, resMock, nextMock;
    beforeEach(function() {
        lastStatus = 0;
        lastJson   = {};
        nextCalled = false;
        resMock = {
            status: function(status) {
                lastStatus = status;
                return { json: function(value) { lastJson = value; } }
            }
        };

        nextMock = function() { nextCalled = true; }
    });

    it('should deny access if no user was passed in via the request', function() {
        loggedIn({}, resMock, nextMock);

        nextCalled.should.equal(false);
        lastStatus.should.equal(401);
        lastJson.should.have.property('error');
        lastJson.error.should.have.property('message');
        lastJson.error.message.should.match(/You must be logged in to call this route/);
    });

    it('should allow access and call next when a user has been passed in via the req', function() {
        loggedIn({ user: {}}, resMock, nextMock);
        nextCalled.should.equal(true);
    });
});