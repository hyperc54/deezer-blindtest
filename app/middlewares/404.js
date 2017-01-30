"use strict";

/**
 * Send a 404 HTTP status code
 * /!\ This middleware will end the response
 */

module.exports = function(req, res) {
	res.status(404).end();
};