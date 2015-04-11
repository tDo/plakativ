var thinky;

function getInstance(config) {
    if (typeof config !== 'undefined' && typeof thinky === 'undefined') {
        thinky = require('thinky')(config);
    }

    if (thinky === undefined) { throw new Error('Thinky has not been configured yet'); }

    return thinky;
}

module.exports = getInstance;