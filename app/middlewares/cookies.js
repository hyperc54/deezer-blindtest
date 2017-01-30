"use strict";

/**
 * Parse incoming cookies to retrieve the session and/or to send them to the ad-server
 *
 * @param {object} req.cookies
 */

module.exports = require("cookie-parser")();