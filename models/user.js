var Promise = require('bluebird');
var _       = require('lodash');
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

/**
 * Check if a specific object instance is a User-model instance
 * @param user Object instance to validate
 * @returns {Boolean}
 */
User.defineStatic('isUser', function(user) {
    return helpers.isModelOfType(user, User);
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

module.exports = User;