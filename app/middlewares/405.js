"use strict";

/**
 * Create a middleware sendind a 405 HTTP status code
 * It is recommended to pass a list of allowed HTTP methods
 * Example: middleware("get", "post") will create a middleware that will respond with a 405 HTTP status code and a Allow: GET, POST header
 * You can pass the methods in any way you want: middleware("get", "post"), middleware(["get", "post"]) and even middleware(["get", "post"], "put")
 * /!\ This middleware will end the response
 */

module.exports = function() {
	var allow = Array.prototype.slice.call(arguments).reduce(function(previous, current) {
		return (previous ? previous + ", " : "") + (current.join ? current.join(", ") : current).toUpperCase();
	}, "");

	return function(req, res) {
		res.setHeader("Allow", allow);
		res.status(405).end();
	};
};