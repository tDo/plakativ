process.env.NODE_ENV = 'test';
var models    = require(__dirname + '/../models');
var sequelize = models.sequelize();

function createTestDatabase() {
    return sequelize.sync({ force: true });
}

module.exports.createTestDatabase = createTestDatabase;