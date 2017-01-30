"use strict";

/**
 * Retrieve a specific session based on the "session" query parameter or retrieve the current session
 * /!\ Use the "cookies" middleware before this one
 *
 * @param {object} req.session
 */

var
	session      = require("express-session"),
	SessionStore = app.helper("SessionStore")(session);

module.exports = function(req, res, next) {
	var config = app.config.session;

	// Store the sessions in redis, it will be useful for pub/sub
	config.store = config.store || new SessionStore({
		prefix: config.prefix,
		ttl:    config.ttl
	});

	// Call the "express-session" middleware to retrieve or prepare the session
	session(config)(req, res, next);
};