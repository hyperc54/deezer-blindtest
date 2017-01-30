"use strict";

/**
 * Define the req.limit and req.offset to use while returning a list of resources
 * You may tweak the default limit (default number if req.query.limit is falsy) using req.query["limit.default"]
 * You may also tweak the maximum value to accept for for req.query.limit using req.query["limit.max"]
 *
 * @param {number} req.limit
 * @param {number} req.offset
 *
 * @param {number} req.query["limit.default"] The default value to use if req.query.limit is falsy
 * @param {number} req.query["limit.max"]     The maximum value to accept for req.query.limit
 */

module.exports = function(req, res, next) {
	req.query["limit.default"] = req.query["limit.default"] || 10;
	req.query["limit.max"]     = req.query["limit.max"]     || 100;

	req.limit  = parseInt(req.query.limit,  10) || req.query["limit.default"],
	req.offset = parseInt(req.query.offset, 10) || 0;

	req.limit  = req.limit  < 0                      ? req.query["limit.default"] : req.limit;
	req.limit  = req.limit  > req.query["limit.max"] ? req.query["limit.max"]     : req.limit;

	req.offset = req.offset < 0 ? 0 : req.offset;

	next();
};