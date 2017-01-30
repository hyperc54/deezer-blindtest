/**
 * Create a middleware to check if the requested method is allowed
 *
 * Example:
 *   router.use(app.middleware('allowed')('get', 'post'));
 *
 * In this example, only GET and POST methods are allowed
 * /!\ This middleware may end the response
 */

module.exports = function() {
	var allowed = Array.prototype.slice.call(arguments).map(value => value.toUpperCase());

	// Always allow these methods
	['HEAD', 'OPTIONS'].forEach(method => allowed.indexOf(method) === -1 && allowed.push(method));

	return function(req, res, next) {
		if (allowed.indexOf(req.method) > -1) { return next(); }
		res.status(405).set('Allow', allowed.join(',')).end();
	};
};