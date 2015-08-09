var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/../libs/sequelize')();

var BoardUsers = sequelize.define('BoardUsers', {
    admin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        validate: {
            isBoolean: { msg: 'Admin flag must be a boolean' }
        }
    }
});

module.exports = BoardUsers;