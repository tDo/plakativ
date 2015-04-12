var configs = require(__dirname + '/../config.json');
var thinky  = require(__dirname + '/../util/thinky')(configs.testing.database);
var r = thinky.r;

function clearTable(name) {
    return r.table(name).delete().run();
}
function clearTables() {
    return clearTable('User').then(function() {
        return clearTable('Board');
    }).then(function() {
        return clearTable('Board_User');
    }).then(function() {
        return clearTable('Column');
    }).then(function() {
        return clearTable('Card');
    });
}

module.exports.clearTables = clearTables;