var Promise   = require('bluebird');
var bcrypt    = require('bcrypt');
var validator = require('validator');
var Sequelize = require('sequelize');
var sequelize = require(__dirname + '/sequelize')();
var helpers   = require(__dirname + '/helpers');

var User = sequelize.define('User', {
    name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: { name: 'name_unique', msg: 'Username is already taken' },
        validate: {
            notEmpty: { msg: 'Username may not be empty'},
            isAlphanumeric: { msg: 'Username may only consist of letters and numbers'}
        }
    },
    password: { type: Sequelize.STRING, allowNull: false }
}, {
    classMethods: {
        /**
         * Helper function checks if the provided object is an instance
         * of the User-model and has been persisted to the database.
         * @param obj which shall be checked
         * @returns {*|boolean}
         */
        isUser: function(obj) {
            if (!helpers.isModelOfType(obj, User)) { return false; }
            return !obj.isNewRecord;
        },

        /**
         * Create a new user-instance, validate the name and password
         * and also encrypt the password, before storing it in the database.
         * @param userData
         * @returns {*|Bluebird.Promise}
         */
        make: function(userData) {
            return new Promise(function(resolve, reject) {
                // Small workaround for not-null parts
                userData.name     = userData.name     || '';
                userData.password = userData.password || '';

                // Pre-build instance and validate it
                var user = User.build(userData);
                user.validate().then(function(err) {
                    if (err) { return reject(err); }
                    user.setPassword(userData.password)
                        .then(function() { return user.save(); })
                        .then(function(user) { resolve(user); })
                        .catch(function(err) { reject(err); });

                }).catch(function() {
                    reject(new Error('Could not validate user-data'));
                });

            });
        },

        /**
         * Find a user by it's user-credentials (e.g. name and password). Will pass on the
         * found user in the resolve-handler of the promise.
         * @param username which shall be verified
         * @param password for this username
         * @returns {*|Bluebird.Promise}
         */
        findByCredentials: function(username, password) {
            return User.find({ where: { name: username }}).then(function(user) {
                return new Promise(function(resolve, reject) {
                    if (user === null) { return reject(new Error('Could not find a user with the given name')); }
                    bcrypt.compare(password, user.password, function(err, res) {
                        if (err) { return reject(new Error('Password is invalid')); }
                        if (!res) { return reject(new Error('Password is invalid')); }
                        resolve(user);
                    });
                });
            });
        }
    },

    instanceMethods: {
        /**
         * Handler which automatically encrypts the password when setting a new one.
         * (Note that this handler will NOT apply validations on password structure.
         *  Yes, this could be handled in a better way I guess)
         * @param password Which shall be stored
         * @returns {bluebird|exports|module.exports}
         */
        setPassword: function(password) {
            var that = this;

            return new Promise(function(resolve, reject) {
                // Before proceeding, validate password (We do this here, because the model must only get the encrypted version)
                if (validator.isNull(password)) { return reject(new Error('Password may not be empty')); }
                if (!validator.isLength(password, 8, 50)) { return reject(new Error('Password must at least have 8 characters')); }
                if (validator.isNull(validator.trim(password))) { return reject(new Error('The password may not consist of only whitespace characters')); }

                bcrypt.hash(password, 10, function(err, hash) {
                    if (err) { return reject(err); }
                    that.password = hash;
                    resolve();
                });
            });
        }
    }
});

module.exports = User;

var Board = require(__dirname + '/board');
var Card  = require(__dirname + '/card');

// Relations
// A user may own many boards
User.hasMany(Board, { as: 'Boards', foreignKey: 'OwnerId'});
// And can participate in many boards
User.belongsToMany(Board, { as: 'Participating', through: 'BoardParticipants' });

// A user can be assigned to many cards
User.belongsToMany(Card, { as: 'Assigneed', through: 'CardAssignees' });