var Promise = require('bluebird');
var _       = require('lodash');
var bcrypt  = require('bcrypt');
var thinky  = require(__dirname + '/../util/thinky')();
var type    = thinky.type;
var r       = thinky.r;
var helpers = require(__dirname + '/helpers');


var User = thinky.createModel('User', {
    id: type.string(),
    name: type.string().required().alphanum(),
    password: type.string().required().min(6),
    createdAt: type.date().default(r.now())
});
User.ensureIndex('name');
module.exports = User;

// Relations
// A user may own many boards
var Board = require(__dirname + '/board');
User.hasMany(Board, 'boards', 'id', 'ownerId');

/**
 * Check if a specific object instance is a User-model instance
 * @param user Object instance to validate
 * @returns {Boolean}
 */
User.defineStatic('isUser', function(user) {
    return helpers.isModelOfType(user, User);
});

/**
 * Verify if a specific username is already taken or not. The resulting promise
 * will retrieve a boolean exists parameter in its success handler, which can be
 * used for verification. The error-handler shall really only be used for actual
 * errors.
 * @param name which shall be verified
 * @returns {Promise}
 */
User.defineStatic('nameExists', function(name) {
    return new Promise(function(resolve, reject) {
        r.table('User').getAll(name, { index: 'name'}).count().run()
            .then(function(count) {
                resolve(count > 0);
            }).error(function(err) {
                reject(err);
            });
    });
});

/**
 * Retrieve a user-model instance by name.
 * @param name Username to retrieve the model-instance for
 * @returns {Promise}
 */
User.defineStatic('byName', function(name) {
    return new Promise(function(resolve, reject) {
        User.filter({name: name}).run().then(function(result) {
            if (result.length < 1) { return reject(new Error('No user by that name was found')); }
            resolve(result[0]);
        }).error(function(err) {
            reject(err);
        });
    });
});

/**
 * Retrieve a passed object as a user-instance. The passed object may be one of the following:
 * - Already a User-object-instance (Must already be saved in the database)
 * - A user-id (string)
 * - A user-name (string)
 * @param obj which is either a user-object-instance or a user-id or name
 * @returns {Promise}
 */
User.defineStatic('asUser', function(obj) {
    return new Promise(function(resolve, reject) {
        // In case it just is a user, we resolve here
        if (User.isUser(obj)) {
            // Also ensure it has already been saved to the database
            if (obj.isSaved()) { return resolve(obj); }
            else { return reject(new Error('User has not been saved to database')); }
        }

        // If it is not a user it might be a userid or name
        // the preceondition is, that we got a string-representation
        if (!_.isString(obj) || _.isEmpty(obj)) { return reject(new Error('Invalid user')); }

        // First we try by id
        User.get(obj).getJoin().run()
            .then(function(user) { resolve(user); })
            .error(function() {
                // Does not seem to be an id, try by name
                User.byName(obj)
                    .then(function(user) { resolve(user); })
                    .error(function() { reject(new Error('Unknown username or id')); });
            });
    });
});

/**
 * Function validates user credentials passed in and passes the found user-model to the
 * promise success handler, when the credentials were valid. The credentials must be passed
 * in as an object of the form { name: string, password: string }
 * @param credentials object of the form { name: string, password: string }
 * @returns {Promise}
 */
User.defineStatic('byCredentials', function(credentials) {
    return new Promise(function(resolve, reject) {
        if (!_.isObject(credentials)) { return reject(new Error('No credentials were passed')); }
        if (!_.isString(credentials.name)) { return reject(new Error('Name is missing')); }
        if (!_.isString(credentials.password)) { return reject(new Error('Password is missing')); }

        User.byName(credentials.name).then(function(user) {
            // Check the password
            bcrypt.compare(credentials.password, user.password, function(err, res) {
                if (err) { return reject(new Error('Password is invalid')); }
                if (!res) { return reject(new Error('Password is invalid')); }
                resolve(user);
            });

        }).error(function() { reject(new Error('Could not find a user with the given name')); });
    });
});

/**
 * Create a new user-account based on the provided userdata. The function will internally
 * check if all params are present (name and password) and also verify that they match the
 * models schema (Presence, length, allowed characters, etc.). It will also verify that the
 * provided name has not already been taken. The result of this call is a promise.
 * @param userData object in the form of { name: string, password: string }
 * @returns {Promise}
 */
User.defineStatic('create', function(userData) {
    return new Promise(function(resolve, reject) {
        var user = new User(userData);
        try { user.validate(); }
        catch(err) { return reject(err); } // TODO: Better retrieval of what is missing

        User.nameExists(user.name).then(function(exists) {
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
});