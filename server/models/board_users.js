var Promise   = require('bluebird');
var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/../libs/sequelize')();
var helpers   = require(__dirname + '/helpers');

var BoardUsers = sequelize.define('BoardUsers', {
    admin: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
});

module.exports = BoardUsers;