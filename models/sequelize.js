var config    = require(__dirname + '/../config')();
var Sequelize = require('sequelize');

var instance;
/**
 * Create a singleton instance of the database-connection.
 * An alternative configuration besides the default entries
 * from the configuration-files can be passed in for first time
 * config. Note that the instance will only be created once (Thus
 * the singleton) so we can use it throughout the application. (One
 * might consider this an antipattern, but well in this case it's what
 * we want)
 * @param altConfig Alternative config if the default one shall not be used
 * @returns {*} Sequelize instance
 */
function getInstance(altConfig) {
    var cfg = altConfig === undefined ? config.database : altConfig;
    if (cfg !== undefined && instance === undefined) {
        instance = new Sequelize(cfg.database, cfg.username, cfg.password, cfg);
    }

    if (instance === undefined) {
        throw new Error('Database has not been configured');
    }

    return instance;
}

module.exports = getInstance;