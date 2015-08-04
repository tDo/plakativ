var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/../libs/sequelize')();

var BoardUsers = sequelize.define('BoardUsers', {
    admin: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
});

module.exports = BoardUsers;