var _ = require('lodash');

/**
 * Helper function can be used to verify if a specific object-instance
 * is of a required thinky model type.
 * @param obj which shall be checked
 * @param requiredModel Thinky Model type to check for
 * @returns {boolean}
 */
function isModelOfType(obj, requiredModel) {
    if (!_.isObject(obj)) { return false; }
    try {
        var model = obj.getModel();
        return model === requiredModel;
    } catch(err) { return false; }
}

module.exports.isModelOfType = isModelOfType;