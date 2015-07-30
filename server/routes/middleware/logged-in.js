/**
 * This middleware verifies that the user object attached to a request
 * has been filled by passport.js That way we can ensure routes can
 * only be accessed by authenticated users.
 * @param req To verify
 * @param res response-object of express
 * @param next Next-route handler
 */
function isLoggedIn(req, res, next) {
    if (req.user) { next(); }
    else {
        res.status(401).json({ error: { message: 'You must be logged in to call this route' }});
    }
}

module.exports = isLoggedIn;