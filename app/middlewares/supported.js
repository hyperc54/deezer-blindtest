/**
 * Create a middleware which set req.params["formats.supported"] to the list of supported formats
 * This function can be called with multiple arguments (e.g. app.middleware("supported")("json", ["html", "xml"], "jsonp js"))
 */

module.exports = function() {
	var formats = Array.prototype.slice.call(arguments).reduce(function(previous, current) {
		return previous.concat(current.split(" "));
	}, []);

	return function(req, res, next) {
		req.params["formats.supported"] = formats;
		next();
	};
};