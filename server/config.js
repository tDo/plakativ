var config = {
    production: {
        env: 'production',
        url: 'http://localhost:3000',
        port: 3000,
        database: {
            dialect: 'sqlite',
            storage: __dirname + '/../db.producation.sqlite'
        }
    },
    development: {
        env: 'development',
        url: 'http://localhost:3000',
        port: 3000,
        database: {
            dialect: 'sqlite',
            storage: __dirname + '/../db.development.sqlite',
            logging: false
        }
    },
    test: {
        env: 'test',
        url: 'http://localhost:3000',
        port: 3000,
        database: {
            dialect: 'sqlite',
            storage: __dirname + '/../db.test.sqlite',
            logging: false
        }
    }
};

module.exports = function(env) {
    if (env === undefined) { env = process.env.NODE_ENV; }
    env = env === undefined ? 'development' : env;

    if (!config.hasOwnProperty(env)) {
        throw new Error('Unknown configuration environment ' + env);
    }

    return config[env];
};