var Promise = require('bluebird');
var thinky  = require(__dirname + '/../util/thinky')();
var type    = thinky.type;
var r       = thinky.r;

var User = thinky.createModel('User', {
    id: type.string(),
    name: type.string().required().alphanum(),
    password: type.string().required().min(6),
    createdAt: type.date().default(r.now())
});

User.ensureIndex('name');

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

module.exports = User;