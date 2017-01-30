"use strict";

/**
 * Parse incoming body
 * Support only JSON data for routes allowing incoming data
 * The default options should be fine: https://github.com/expressjs/body-parser#options
 */

module.exports = require("body-parser").json();