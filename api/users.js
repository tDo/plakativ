var Promise = require('bluebird');
var _       = require('lodash');
var models = require(__dirname + '/../models');
var bcrypt = require('bcrypt');

/**
 * Create a new user-account based on the provided userdata. The function will internally
 * check if all params are present (name and password) and also verify that they match the
 * models schema (Presence, length, allowed characters, etc.). It will also verify that the
 * provided name has not already been taken. The result of this call is a promise.
 * @param userData object in the form of { name: string, password: string }
 * @returns {Promise}
 */
function create(userData) {
    return new Promise(function(resolve, reject) {
        var user = new models.User(userData);
        try { user.validate(); }
        catch(err) { return reject(err); } // TODO: Better retrieval of what is missing

        models.User.nameExists(user.name).then(function(exists) {
            if (exists) {
                return reject(new Error('The name ' + userData.name + ' is already taken'));
            }

            // Now also bcrypt the password
            bcrypt.hash(user.password, 8, function(err, hash) {
                if (err) { return reject(err); }
                user.password = hash;

                user.save().then(function(user) {
                    resolve(user);
                }).error(function() {
                    reject(new Error('Could not store user in database'));
                });
            });

        }).error(function() {
            reject(new Error('Could not check if the username already exists'));
        });

    });
}

/**
 * Function validates user credentials passed in and passes the found user-model to the
 * promise success handler, when the credentials were valid. The credentials must be passed
 * in as an object of the form { name: string, password: string }
 * @param credentials object of the form { name: string, password: string }
 * @returns {Promise}
 */
function validateCredentials(credentials) {
    return new Promise(function(resolve, reject) {
        if (!_.isObject(credentials)) { return reject(new Error('No credentials were passed')); }
        if (!_.isString(credentials.name)) { return reject(new Error('Name is missing')); }
        if (!_.isString(credentials.password)) { return reject(new Error('Password is missing')); }

        models.User.byName(credentials.name).then(function(user) {
            // Check the password
            bcrypt.compare(credentials.password, user.password, function(err, res) {
                if (err) { return reject(new Error('Password is invalid')); }
                if (!res) { return reject(new Error('Password is invalid')); }
                resolve(user);
            });

        }).error(function() { reject(new Error('Could not find a user with the given name')); });
    });
}

module.exports.create = create;
module.exports.validateCredentials = validateCredentials;