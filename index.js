var express = require('express');
var routes  = require(__dirname + '/routes');

function init(config) {
    // Create actual express application instance
    var app = express();

    // Bind routes
    app.use('/api', routes.api);

    return app;
}

module.exports = init;